import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/error-handler.js';
import { DEMO_SLUG } from './service.js';

const BCRYPT_ROUNDS = 12;
const TTL_MS = 24 * 60 * 60 * 1000;
// Demo testers get an admin-level account ON THE DEMO TENANT so they can explore
// features. The tenant resets nightly and the credential expires in 24h, so the
// blast radius is nil.
const DEMO_ROLE = 'admin';

/** Human-copyable 14-char password from an unambiguous alphabet (no 0/O/1/l/I). */
function generatePassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(14);
  let out = '';
  for (let i = 0; i < 14; i++) out += alphabet[bytes[i]! % alphabet.length];
  return out;
}

/**
 * Issue (or re-issue) a 24-hour demo login for an applicant on the demo tenant.
 * ID = the applicant's own email; password = a fresh random value returned once.
 *
 * Real accounts are protected: if the email already belongs to anything other
 * than a demo tester on the demo tenant (a real owner, another tenant's user,
 * a super admin), we refuse rather than clobber their credentials.
 */
export async function issueDemoLogin(
  email: string,
  name?: string,
): Promise<{ email: string; password: string; expiresAt: Date }> {
  const tenant = await prisma.tenant.findFirst({ where: { slug: DEMO_SLUG }, select: { id: true } });
  if (!tenant) {
    throw new AppError('DEMO_TENANT_MISSING', 500, `데모 테넌트(${DEMO_SLUG})를 찾을 수 없습니다.`);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  const isReissuableDemoUser = existing && existing.tenantSlug === DEMO_SLUG && existing.role !== 'owner';
  if (existing && !isReissuableDemoUser) {
    throw new AppError('EMAIL_IN_USE', 400, '이 이메일은 이미 사용 중인 계정입니다. 수동으로 안내해 주세요.');
  }

  const password = generatePassword();
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const expiresAt = new Date(Date.now() + TTL_MS);

  if (existing) {
    await prisma.user.update({
      where: { email },
      data: { passwordHash, passwordExpiresAt: expiresAt, isActive: true, role: DEMO_ROLE, tenantId: tenant.id, tenantSlug: DEMO_SLUG, name: name || existing.name },
    });
  } else {
    await prisma.user.create({
      data: { email, passwordHash, name: name || '데모 체험', role: DEMO_ROLE, tenantId: tenant.id, tenantSlug: DEMO_SLUG, passwordExpiresAt: expiresAt, isActive: true },
    });
  }

  return { email, password, expiresAt };
}

/**
 * Delete demo testers whose 24h credential has expired — so the message's
 * "24시간 후 계정이 삭제됩니다" is literally true. Only ever removes time-boxed
 * demo accounts on the demo tenant: real users have passwordExpiresAt = NULL
 * (never matches `< NOW()`) and the owner is role='owner' (excluded), so this
 * can never delete a real account.
 */
export async function cleanupExpiredDemoLogins(): Promise<number> {
  const res = await prisma.user.deleteMany({
    where: {
      tenantSlug: DEMO_SLUG,
      role: DEMO_ROLE,
      passwordExpiresAt: { not: null, lt: new Date() },
    },
  });
  return res.count;
}
