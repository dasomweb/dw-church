import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/error-handler.js';
import { sanitizePermissions, type Capability } from '../auth/capabilities.js';

/**
 * 교적 멤버 → Staff 지정. 멤버(교적, 테넌트 스키마)에 로그인 계정(public.users,
 * role='staff')을 만들거나 연결하고 권한(capability) 목록을 부여한다.
 * memberId 링크로 '목자는 자기 목장만' 스코프가 자동 성립한다.
 */

function genTempPassword(): string {
  // 관리자가 공유하기 쉬운 임시 비번: dw- + 8자리 영숫자.
  const s = randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
  return `dw-${s || Math.random().toString(36).slice(2, 10)}`;
}

async function memberContact(schema: string, memberId: string): Promise<{ name: string; email: string } | null> {
  const rows = await prisma.$queryRawUnsafe<{ name: string; email: string }[]>(
    `SELECT name, COALESCE(email, '') AS email FROM "${schema}".members WHERE id = $1::uuid`,
    memberId,
  );
  return rows[0] ?? null;
}

/** 이 멤버에 연결된 Staff 계정 정보(없으면 null). */
export async function getMemberStaffAccess(memberId: string, tenantSlug: string) {
  const rows = await prisma.$queryRawUnsafe<{ id: string; email: string; role: string; permissions: unknown; is_active: boolean }[]>(
    `SELECT id, email, role, permissions, is_active FROM public.users WHERE member_id = $1::uuid AND tenant_slug = $2 LIMIT 1`,
    memberId, tenantSlug,
  );
  const u = rows[0];
  if (!u) return null;
  return { userId: u.id, email: u.email, role: u.role, isActive: u.is_active, permissions: sanitizePermissions(u.permissions) };
}

export async function setMemberStaffAccess(params: {
  schema: string;
  memberId: string;
  tenantId: string;
  tenantSlug: string;
  permissions: unknown;
  email?: string;
}) {
  const member = await memberContact(params.schema, params.memberId);
  if (!member) throw new AppError('NOT_FOUND', 404, '교인을 찾을 수 없습니다');

  const email = (params.email || member.email || '').trim().toLowerCase();
  if (!email) throw new AppError('EMAIL_REQUIRED', 400, '이 교인에게 이메일이 없습니다. 이메일을 입력해 주세요.');

  const permissions = sanitizePermissions(params.permissions);
  if (permissions.length === 0) throw new AppError('NO_PERMISSIONS', 400, '권한을 하나 이상 선택해 주세요.');

  const existing = await prisma.user.findUnique({ where: { email } });

  // 다른 테넌트 계정이거나 관리자/오너 계정이면 강등/탈취 금지.
  if (existing) {
    const isSameTenantStaffOrMember =
      existing.tenantSlug === params.tenantSlug &&
      (existing.role === 'staff' || existing.role === 'member' || existing.memberId === params.memberId);
    if (!isSameTenantStaffOrMember) {
      throw new AppError('EMAIL_IN_USE', 409, '이미 다른 권한(관리자 등)이나 다른 교회의 계정으로 사용 중인 이메일입니다.');
    }
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: 'staff',
        permissions,
        memberId: params.memberId,
        tenantId: params.tenantId,
        tenantSlug: params.tenantSlug,
        isActive: true,
      },
    });
    return { userId: existing.id, email, created: false, permissions };
  }

  const tempPassword = genTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);
  const created = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: member.name || '',
      role: 'staff',
      tenantId: params.tenantId,
      tenantSlug: params.tenantSlug,
      permissions,
      memberId: params.memberId,
    },
  });
  return { userId: created.id, email, created: true, tempPassword, permissions };
}

/** Staff 권한 해제 — 연결된 staff 계정을 비활성화(로그인 차단). 오너/관리자 계정은 건드리지 않음. */
export async function revokeMemberStaffAccess(memberId: string, tenantSlug: string) {
  await prisma.$executeRawUnsafe(
    `UPDATE public.users SET is_active = false, permissions = '[]'::jsonb WHERE member_id = $1::uuid AND tenant_slug = $2 AND role = 'staff'`,
    memberId, tenantSlug,
  );
}

export type { Capability };
