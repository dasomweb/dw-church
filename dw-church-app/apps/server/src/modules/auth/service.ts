import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database.js';
import { signAccessToken, signRefreshToken, verifyToken } from '../../config/jwt.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/error-handler.js';
import { createTenantSchema } from '../../utils/schema-manager.js';
import { sendEmail } from '../../config/email.js';
import { welcomeEmail, passwordResetEmail, inviteEmail } from '../../config/email-templates.js';
import type { RegisterInput, LoginInput, InviteInput } from './schema.js';

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_LIFETIME_MS = 3600000; // 1 hour

/**
 * Check super admin: role from DB, with env var fallback for bootstrap.
 */
function checkIsSuperAdmin(role: string | undefined, email: string): boolean {
  if (role === 'super_admin') return true;
  if (email && env.SUPER_ADMIN_EMAILS.includes(email)) return true;
  return false;
}

function buildTokenResponse(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string | null;
  tenantSlug: string | null;
}) {
  const payload = {
    userId: user.id,
    email: user.email,
    tenantId: user.tenantId ?? '',
    tenantSlug: user.tenantSlug ?? '',
    role: user.role,
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

  // Provision tenant schema
  await createTenantSchema(slug);

  const tokens = buildTokenResponse({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: tenant.id,
    tenantSlug: slug,
  });

  // Fire-and-forget welcome email
  const welcome = welcomeEmail(churchName);
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

  const resetUrl = `https://admin.truelight.app/reset-password?token=${resetToken}`;
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

export async function inviteUser(
  input: InviteInput,
  inviterRole: string,
  tenantId: string,
  tenantSlug: string,
) {
  if (inviterRole !== 'owner' && inviterRole !== 'admin') {
    throw new AppError('FORBIDDEN', 403, 'Only owners and admins can invite users');
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

  // Look up tenant name for the email template
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  const churchName = tenant?.name ?? tenantSlug;
  const inviteUrl = `https://admin.truelight.app/reset-password?token=${inviteToken}`;
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
    },
  };
}
