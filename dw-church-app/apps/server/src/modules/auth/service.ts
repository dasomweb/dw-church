import { prisma } from '../../config/database.js';
import { supabaseAdmin } from '../../config/supabase.js';
import { AppError } from '../../middleware/error-handler.js';
import { createTenantSchema } from '../../utils/schema-manager.js';
import type { RegisterInput, LoginInput, InviteInput } from './schema.js';

export async function register(input: RegisterInput) {
  const { churchName, slug, email, password, ownerName } = input;

  // Check slug uniqueness
  const existing = await prisma.tenant.findFirst({ where: { slug } });
  if (existing) {
    throw new AppError('SLUG_TAKEN', 409, `Slug '${slug}' is already in use`);
  }

  // Create user in Supabase Auth
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { tenant_slug: slug, role: 'owner', name: ownerName },
    });

  if (authError || !authData.user) {
    throw new AppError(
      'AUTH_CREATE_FAILED',
      500,
      authError?.message ?? 'Failed to create auth user',
    );
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

  // Update user metadata with tenant_id
  await supabaseAdmin.auth.admin.updateUserById(authData.user.id, {
    user_metadata: {
      tenant_id: tenant.id,
      tenant_slug: slug,
      role: 'owner',
      name: ownerName,
    },
  });

  // Provision tenant schema
  await createTenantSchema(slug);

  // Sign in to get session
  const { data: session, error: sessionError } =
    await supabaseAdmin.auth.signInWithPassword({ email, password });

  if (sessionError) {
    throw new AppError(
      'SESSION_CREATE_FAILED',
      500,
      'Account created but failed to create session',
    );
  }

  const rs = session.session!;
  return {
    accessToken: rs.access_token,
    refreshToken: rs.refresh_token,
    expiresAt: (rs.expires_at ?? 0) * 1000,
    user: {
      id: session.user!.id,
      email: session.user!.email ?? '',
      name: ownerName,
      role: 'owner',
      tenantId: tenant.id,
      tenantSlug: slug,
    },
    tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
  };
}

export async function login(input: LoginInput) {
  const { email, password } = input;

  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new AppError('LOGIN_FAILED', 401, 'Invalid email or password');
  }

  const s = data.session!;
  return {
    accessToken: s.access_token,
    refreshToken: s.refresh_token,
    expiresAt: (s.expires_at ?? 0) * 1000,
    user: {
      id: data.user!.id,
      email: data.user!.email ?? '',
      name: data.user!.user_metadata?.name ?? '',
      role: data.user!.user_metadata?.role ?? 'member',
      tenantId: data.user!.user_metadata?.tenant_id ?? '',
      tenantSlug: data.user!.user_metadata?.tenant_slug ?? '',
    },
  };
}

export async function refreshSession(refreshToken: string) {
  const { data, error } = await supabaseAdmin.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.session) {
    throw new AppError('REFRESH_FAILED', 401, 'Invalid or expired refresh token');
  }

  const s = data.session;
  return {
    accessToken: s.access_token,
    refreshToken: s.refresh_token,
    expiresAt: (s.expires_at ?? 0) * 1000,
    user: {
      id: data.user!.id,
      email: data.user!.email ?? '',
      name: data.user!.user_metadata?.name ?? '',
      role: data.user!.user_metadata?.role ?? 'member',
      tenantId: data.user!.user_metadata?.tenant_id ?? '',
      tenantSlug: data.user!.user_metadata?.tenant_slug ?? '',
    },
  };
}

export async function logout(accessToken: string) {
  const { error } = await supabaseAdmin.auth.admin.signOut(accessToken);
  if (error) {
    throw new AppError('LOGOUT_FAILED', 500, 'Failed to invalidate session');
  }
}

export async function getMe(userId: string) {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);

  if (error || !data.user) {
    throw new AppError('USER_NOT_FOUND', 404, 'User not found');
  }

  const tenantId = data.user.user_metadata?.tenant_id as string | undefined;
  let tenant = null;

  if (tenantId) {
    tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, slug: true, name: true, plan: true, isActive: true },
    });
  }

  return { user: data.user, tenant };
}

export async function forgotPassword(email: string) {
  const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email);
  if (error) {
    throw new AppError(
      'RESET_EMAIL_FAILED',
      500,
      'Failed to send password reset email',
    );
  }
}

export async function resetPassword(accessToken: string, newPassword: string) {
  const { data: userData, error: userError } =
    await supabaseAdmin.auth.getUser(accessToken);

  if (userError || !userData.user) {
    throw new AppError('UNAUTHORIZED', 401, 'Invalid or expired token');
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(
    userData.user.id,
    { password: newPassword },
  );

  if (error) {
    throw new AppError('RESET_FAILED', 500, 'Failed to reset password');
  }
}

export async function updateProfile(
  userId: string,
  data: { name?: string; email?: string },
) {
  const updatePayload: Record<string, unknown> = {};

  if (data.email) {
    updatePayload.email = data.email;
  }

  if (data.name) {
    // Get current metadata first to merge
    const { data: current, error: fetchError } =
      await supabaseAdmin.auth.admin.getUserById(userId);
    if (fetchError || !current.user) {
      throw new AppError('USER_NOT_FOUND', 404, 'User not found');
    }
    updatePayload.user_metadata = {
      ...current.user.user_metadata,
      name: data.name,
    };
  }

  const { data: updated, error } =
    await supabaseAdmin.auth.admin.updateUserById(userId, updatePayload);

  if (error || !updated.user) {
    throw new AppError(
      'PROFILE_UPDATE_FAILED',
      500,
      error?.message ?? 'Failed to update profile',
    );
  }

  return {
    id: updated.user.id,
    email: updated.user.email ?? '',
    name: updated.user.user_metadata?.name ?? '',
    role: updated.user.user_metadata?.role ?? 'member',
    tenantId: updated.user.user_metadata?.tenant_id ?? '',
    tenantSlug: updated.user.user_metadata?.tenant_slug ?? '',
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

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: input.email,
    user_metadata: {
      tenant_id: tenantId,
      tenant_slug: tenantSlug,
      role: input.role,
      name: input.name,
    },
    email_confirm: false, // Supabase sends invite email
  });

  if (error) {
    throw new AppError(
      'INVITE_FAILED',
      500,
      error.message ?? 'Failed to invite user',
    );
  }

  // Send invite email
  await supabaseAdmin.auth.admin.inviteUserByEmail(input.email);

  return { user: data.user };
}
