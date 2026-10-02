import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database.js';
import { signAccessToken, signRefreshToken, verifyToken } from '../../config/jwt.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/error-handler.js';
import { createTenantSchema } from '../../utils/schema-manager.js';
import { sendEmail } from '../../config/email.js';
import { welcomeEmail, passwordResetEmail, inviteEmail } from '../../config/email-templates.js';
import { planLimits, normalizePlan } from '../../config/plan-limits.js';
import type { RegisterInput, LoginInput, InviteInput } from './schema.js';
import { sanitizePermissions } from './capabilities.js';

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_LIFETIME_MS = 3600000; // 1 hour

/**
 * Check super admin: role from DB, with env var fallback for bootstrap.
 */
export function checkIsSuperAdmin(role: string | undefined, email: string): boolean {
  if (role === 'super_admin') return true;
  if (email && env.SUPER_ADMIN_EMAILS.includes(email)) return true;
  return false;
}

/**
 * 메일 링크(비밀번호 재설정·초대·환영)가 가리킬 origin.
 * 교회는 자기 도메인에서 관리자를 쓰므로(Cloudflare Worker 가 테넌트 도메인의
 * /login·/reset-password 등을 관리자 SPA 로 프록시) 메일도 자기 도메인으로 보낸다.
 * 커스텀 도메인 > <slug>.truelight.app > 중앙 콘솔(테넌트 없음) 순.
 */
// 테넌트가 없는 계정(슈퍼어드민 등)의 폴백 — 플랫폼 자기 도메인.
// truelight.app/reset-password 는 Worker 가 관리자 서비스로 프록시하고
// /admin/reset-password?token=… 로 302 되며 토큰이 보존된다(검증 완료).
// admin.truelight.app 도 계속 동작하지만, 주소에 admin 이 중복되지 않는 쪽을 쓴다.
const CENTRAL_ADMIN_ORIGIN = 'https://truelight.app';

function originFor(t: { slug?: string | null; customDomain?: string | null } | null | undefined): string {
  if (t?.customDomain) return `https://${t.customDomain}`;
  if (t?.slug) return `https://${t.slug}.truelight.app`;
  return CENTRAL_ADMIN_ORIGIN;
}

/** tenantId 로 그 교회의 관리자 origin 을 구한다. 조회 실패해도 메일은 나가야 하므로 폴백. */
export async function tenantAppOrigin(tenantId: string | null | undefined): Promise<string> {
  if (!tenantId) return CENTRAL_ADMIN_ORIGIN;
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true, customDomain: true, isActive: true },
    });
    if (!tenant || !tenant.isActive) return CENTRAL_ADMIN_ORIGIN;
    return originFor(tenant);
  } catch {
    return CENTRAL_ADMIN_ORIGIN;
  }
}

function buildTokenResponse(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string | null;
  tenantSlug: string | null;
  permissions?: unknown;
  memberId?: string | null;
}) {
  const payload = {
    userId: user.id,
    email: user.email,
    tenantId: user.tenantId ?? '',
    tenantSlug: user.tenantSlug ?? '',
    role: user.role,
    // Scoped-staff RBAC: capability list travels in the JWT so requireAuth can
    // enforce without a DB hit. Empty for non-staff. memberId scopes 목자 access.
    permissions: sanitizePermissions(user.permissions),
    memberId: user.memberId ?? null,
  };

  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken({ userId: user.id }),
    expiresAt: Date.now() + ACCESS_TOKEN_LIFETIME_MS,
  };
}

export async function register(input: RegisterInput) {
  const { churchName, slug, email, password, ownerName } = input;

  // Check slug uniqueness
  const existing = await prisma.tenant.findFirst({ where: { slug } });
  if (existing) {
    throw new AppError('SLUG_TAKEN', 409, `Slug '${slug}' is already in use`);
  }

  // Check email uniqueness
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError('AUTH_CREATE_FAILED', 409, 'Email is already in use');
  }

  // Insert tenant into public.tenants
  const tenant = await prisma.tenant.create({
    data: {
      name: churchName,
      slug,
      plan: 'free',
      isActive: true,
    },
  });

  // Hash password and create user
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: ownerName,
      role: 'owner',
      tenantId: tenant.id,
      tenantSlug: slug,
    },
  });

  // Provision tenant schema with church name for default settings
  await createTenantSchema(slug, churchName);

  const tokens = buildTokenResponse({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: tenant.id,
    tenantSlug: slug,
  });

  // Fire-and-forget welcome email — 새 교회의 자기 도메인으로 안내(커스텀 도메인은 아직 없음).
  const welcome = welcomeEmail(churchName, `https://${slug}.truelight.app`);
  sendEmail({ to: email, ...welcome }).catch((err) =>
    console.error('[email] Failed to send welcome email:', err),
  );

  return {
    ...tokens,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: 'owner',
      tenantId: tenant.id,
      tenantSlug: slug,
      isSuperAdmin: false,
    },
    tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
  };
}

export async function login(input: LoginInput) {
  const { email, password } = input;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    throw new AppError('LOGIN_FAILED', 401, 'Invalid email or password');
  }

  // Time-boxed credentials (e.g. tenant support users). A null value means
  // "never expires" (all normal users). Non-null + past = reject.
  if (user.passwordExpiresAt && user.passwordExpiresAt.getTime() < Date.now()) {
    throw new AppError('LOGIN_FAILED', 401, 'Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError('LOGIN_FAILED', 401, 'Invalid email or password');
  }

  const tokens = buildTokenResponse({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId,
    tenantSlug: user.tenantSlug,
    permissions: user.permissions,
    memberId: user.memberId,
  });

  return {
    ...tokens,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId ?? '',
      tenantSlug: user.tenantSlug ?? '',
      isSuperAdmin: checkIsSuperAdmin(user.role, user.email),
      permissions: sanitizePermissions(user.permissions),
      memberId: user.memberId ?? null,
    },
  };
}

export async function refreshSession(refreshToken: string) {
  let payload;
  try {
    payload = verifyToken(refreshToken);
  } catch {
    throw new AppError('REFRESH_FAILED', 401, 'Invalid or expired refresh token');
  }

  const userId = payload.userId;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) {
    throw new AppError('REFRESH_FAILED', 401, 'Invalid or expired refresh token');
  }

  const tokens = buildTokenResponse({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId,
    tenantSlug: user.tenantSlug,
    permissions: user.permissions,
    memberId: user.memberId,
  });

  return {
    ...tokens,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId ?? '',
      tenantSlug: user.tenantSlug ?? '',
      isSuperAdmin: checkIsSuperAdmin(user.role, user.email),
      permissions: sanitizePermissions(user.permissions),
      memberId: user.memberId ?? null,
    },
  };
}

export async function logout(_accessToken: string) {
  // With JWT auth, logout is handled client-side by deleting the token.
  // No server-side session to invalidate.
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('USER_NOT_FOUND', 404, 'User not found');
  }

  let tenant = null;
  if (user.tenantId) {
    tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { id: true, slug: true, name: true, plan: true, isActive: true },
    });
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId ?? '',
      tenantSlug: user.tenantSlug ?? '',
      isSuperAdmin: checkIsSuperAdmin(user.role, user.email),
    },
    tenant,
  };
}

export async function forgotPassword(email: string) {
  // Always return success to avoid leaking whether an email exists.
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return;

  // Generate a password-reset JWT (1hr expiry)
  const resetToken = jwt.sign(
    { userId: user.id, purpose: 'password-reset' },
    env.JWT_SECRET,
    { expiresIn: '1h' },
  );

  // 교회 자기 도메인으로 보낸다(없으면 중앙 콘솔 폴백).
  const resetUrl = `${await tenantAppOrigin(user.tenantId)}/reset-password?token=${resetToken}`;
  const tpl = passwordResetEmail(resetUrl);

  // Fire-and-forget
  sendEmail({ to: email, ...tpl }).catch((err) =>
    console.error('[email] Failed to send password reset email:', err),
  );
}

export async function resetPassword(token: string, newPassword: string) {
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new AppError('UNAUTHORIZED', 401, 'Invalid or expired token');
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await prisma.user.update({
    where: { id: payload.userId },
    data: { passwordHash },
  });
}

export async function updateProfile(
  userId: string,
  data: { name?: string; email?: string },
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('USER_NOT_FOUND', 404, 'User not found');
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email }),
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    name: updated.name,
    role: updated.role,
    tenantId: updated.tenantId ?? '',
    tenantSlug: updated.tenantSlug ?? '',
  };
}

/**
 * Admin-account quota for a tenant — plan tier, the cap (owner included), and
 * how many accounts are currently used. Powers the invite UI's "X / Y" display.
 */
export async function getAccountQuota(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { plan: true } });
  const { maxAdmins } = planLimits(tenant?.plan);
  const used = await prisma.user.count({ where: { tenantId } });
  return { plan: normalizePlan(tenant?.plan), maxAdmins, used };
}

export async function inviteUser(
  input: InviteInput,
  inviterRole: string,
  tenantId: string,
  tenantSlug: string,
) {
  if (inviterRole !== 'owner' && inviterRole !== 'admin') {
    throw new AppError('FORBIDDEN', 403, 'Only owners and admins can invite users');
  }

  // Enforce the tenant's admin-account quota (light 2 / basic 3 / plus 5 / pro 10).
  // The owner counts toward the limit, so we compare the current head-count of
  // every login account on this tenant against the plan's maxAdmins.
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true, name: true, customDomain: true },
  });
  const { maxAdmins } = planLimits(tenant?.plan);
  const currentAccounts = await prisma.user.count({ where: { tenantId } });
  if (currentAccounts >= maxAdmins) {
    throw new AppError(
      'PLAN_LIMIT_REACHED',
      403,
      `현재 플랜의 관리자 계정 한도(${maxAdmins}개)에 도달했습니다. 계정을 더 추가하려면 플랜을 업그레이드하세요.`,
    );
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingUser) {
    throw new AppError('INVITE_FAILED', 409, 'User with this email already exists');
  }

  // Create user with a temporary random password (they'll need to reset it)
  const tempPassword = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      name: input.name,
      role: input.role,
      tenantId,
      tenantSlug,
    },
  });

  // Generate invite token (password-reset style, 72hr expiry for invites)
  const inviteToken = jwt.sign(
    { userId: user.id, purpose: 'invite' },
    env.JWT_SECRET,
    { expiresIn: '72h' },
  );

  // Tenant name for the email template (looked up above with the plan).
  const churchName = tenant?.name ?? tenantSlug;
  // 초대 링크도 그 교회 자기 도메인으로(초대받은 사람이 교회 주소에서 바로 설정).
  const inviteUrl = `${originFor({ slug: tenantSlug, customDomain: tenant?.customDomain })}/reset-password?token=${inviteToken}`;
  const tpl = inviteEmail(churchName, inviteUrl);

  // Fire-and-forget
  sendEmail({ to: input.email, ...tpl }).catch((err) =>
    console.error('[email] Failed to send invite email:', err),
  );

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId ?? '',
      tenantSlug: user.tenantSlug ?? '',
    },
  };
}

export async function changePassword(
  userId: string,
  _email: string,
  currentPassword: string,
  newPassword: string,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('USER_NOT_FOUND', 404, 'User not found');
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    throw new AppError('INVALID_PASSWORD', 400, '현재 비밀번호가 올바르지 않습니다.');
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}

export async function switchTenant(userId: string, tenantId: string, tenantSlug: string) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { tenantId, tenantSlug },
  });

  // Issue new tokens with updated tenant context
  const tokens = buildTokenResponse({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId,
    tenantSlug: user.tenantSlug,
    permissions: user.permissions,
    memberId: user.memberId,
  });

  return {
    ...tokens,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId ?? '',
      tenantSlug: user.tenantSlug ?? '',
      isSuperAdmin: checkIsSuperAdmin(user.role, user.email),
      permissions: sanitizePermissions(user.permissions),
      memberId: user.memberId ?? null,
    },
  };
}
