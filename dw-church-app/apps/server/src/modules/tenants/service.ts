import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/error-handler.js';
import {
  createTenantSchema as createTenantSchemaFn,
  deleteTenantSchema,
} from '../../utils/schema-manager.js';
import { deleteFilesByPrefix } from '../../config/r2.js';
import { ensureSupportUser } from './support-user.js';
import type { CreateTenantInput, UpdateTenantInput } from './schema.js';

const BCRYPT_ROUNDS = 12;

const SLUG_FORMAT = /^[a-z0-9][a-z0-9_-]{1,62}$/;
const RESERVED_SLUGS = new Set(['admin', 'api', 'www', 'app', 'support', 'mail', 'billing']);

export type SlugCheckResult =
  | { available: true }
  | { available: false; reason: 'empty' | 'invalid_format' | 'reserved' | 'taken' };

/**
 * Validate a slug against format, reserved words, and uniqueness. Pure DB
 * lookup + string checks, safe for unauthenticated callers (surface just
 * yes/no + reason).
 */
export async function checkSlugAvailability(raw: string): Promise<SlugCheckResult> {
  const slug = (raw ?? '').trim().toLowerCase();
  if (!slug) return { available: false, reason: 'empty' };
  if (!SLUG_FORMAT.test(slug)) return { available: false, reason: 'invalid_format' };
  if (RESERVED_SLUGS.has(slug)) return { available: false, reason: 'reserved' };
  const existing = await prisma.tenant.findFirst({ where: { slug }, select: { id: true } });
  if (existing) return { available: false, reason: 'taken' };
  return { available: true };
}

export async function listTenants(page: number, perPage: number) {
  const skip = (page - 1) * perPage;

  const [tenants, total] = await Promise.all([
    prisma.tenant.findMany({
      skip,
      take: perPage,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.tenant.count(),
  ]);

  // Fetch stats for each tenant
  const tenantsWithStats = await Promise.all(
    tenants.map(async (tenant: (typeof tenants)[number]) => {
      const schema = `tenant_${tenant.slug}`;
      let sermonCount = 0;
      let userCount = 0;
      let storageUsed = 0;

      try {
        const sermonResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
          `SELECT COUNT(*)::bigint as count FROM "${schema}".sermons`,
        );
        sermonCount = Number(sermonResult[0]?.count ?? 0);

        const storageResult = await prisma.$queryRawUnsafe<
          [{ total: bigint }]
        >(
          `SELECT COALESCE(SUM(size_bytes), 0)::bigint as total FROM "${schema}".files`,
        );
        storageUsed = Number(storageResult[0]?.total ?? 0);
      } catch {
        // Schema might not exist yet
      }

      try {
        userCount = await prisma.user.count({
          where: { tenantId: tenant.id },
        });
      } catch {
        // Ignore errors
      }

      return {
        ...tenant,
        stats: { sermonCount, userCount, storageUsed },
      };
    }),
  );

  return {
    data: tenantsWithStats,
    meta: {
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    },
  };
}

export async function createTenant(input: CreateTenantInput) {
  const { name, slug, ownerEmail, ownerName, plan } = input;

  // Check slug uniqueness
  const existing = await prisma.tenant.findFirst({ where: { slug } });
  if (existing) {
    throw new AppError('SLUG_TAKEN', 409, `Slug '${slug}' is already in use`);
  }

  // Check email uniqueness
  const existingUser = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (existingUser) {
    throw new AppError('AUTH_CREATE_FAILED', 409, 'Owner email is already in use');
  }

  // Insert tenant
  const tenant = await prisma.tenant.create({
    data: {
      name,
      slug,
      plan,
      isActive: true,
    },
  });

  // Create owner user with a temporary random password
  const tempPassword = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);

  await prisma.user.create({
    data: {
      email: ownerEmail,
      passwordHash,
      name: ownerName,
      role: 'owner',
      tenantId: tenant.id,
      tenantSlug: slug,
    },
  });

  // Provision schema
  await createTenantSchemaFn(slug);

  // Per-tenant support user for super admin maintenance access (disabled until
  // a password is rotated by the super admin from the detail modal).
  await ensureSupportUser(tenant.id, slug);

  return tenant;
}

export async function updateTenant(id: string, input: UpdateTenantInput) {
  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) {
    throw new AppError('NOT_FOUND', 404, 'Tenant not found');
  }

  const updated = await prisma.tenant.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.plan !== undefined && { plan: input.plan }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });

  return updated;
}

export async function deleteTenant(id: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) {
    throw new AppError('NOT_FOUND', 404, 'Tenant not found');
  }

  // 1. Delete all uploaded files from R2 storage
  try {
    const filesDeleted = await deleteFilesByPrefix(`tenant_${tenant.slug}/`);
    if (filesDeleted > 0) {
      console.log(`Deleted ${filesDeleted} files from R2 for tenant ${tenant.slug}`);
    }
  } catch (err) {
    // Don't block deletion if R2 cleanup fails (might not be configured)
    console.warn(`R2 cleanup failed for tenant ${tenant.slug}:`, err);
  }

  // 2. Drop the tenant schema (all DB data)
  await deleteTenantSchema(tenant.slug);

  // 3. Delete associated users
  await prisma.user.deleteMany({ where: { tenantId: id } });

  // 4. Delete the tenant record
  await prisma.tenant.delete({ where: { id } });

  return { message: `Tenant '${tenant.slug}' permanently deleted` };
}

export async function getGlobalStats() {
  const totalTenants = await prisma.tenant.count();
  const activeTenants = await prisma.tenant.count({
    where: { isActive: true },
  });

  let totalSermons = 0;
  let totalStorage = 0;
  let totalBulletins = 0;
  let totalAlbums = 0;
  let totalEvents = 0;

  // Aggregate across all active tenant schemas
  const tenants = await prisma.tenant.findMany({
    where: { isActive: true },
    select: { slug: true, plan: true },
  });

  for (const tenant of tenants) {
    const schema = `tenant_${tenant.slug}`;
    try {
      const sermonResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
        `SELECT COUNT(*)::bigint as count FROM "${schema}".sermons`,
      );
      totalSermons += Number(sermonResult[0]?.count ?? 0);

      const storageResult = await prisma.$queryRawUnsafe<[{ total: bigint }]>(
        `SELECT COALESCE(SUM(size_bytes), 0)::bigint as total FROM "${schema}".files`,
      );
      totalStorage += Number(storageResult[0]?.total ?? 0);

      const bulletinResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
        `SELECT COUNT(*)::bigint as count FROM "${schema}".bulletins`,
      );
      totalBulletins += Number(bulletinResult[0]?.count ?? 0);

      const albumResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
        `SELECT COUNT(*)::bigint as count FROM "${schema}".albums`,
      );
      totalAlbums += Number(albumResult[0]?.count ?? 0);

      const eventResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
        `SELECT COUNT(*)::bigint as count FROM "${schema}".events`,
      );
      totalEvents += Number(eventResult[0]?.count ?? 0);
    } catch {
      // Schema might not exist
    }
  }

  const totalUsers = await prisma.user.count();

  // Total database size
  let dbSizeBytes = 0;
  try {
    const dbSizeResult = await prisma.$queryRawUnsafe<[{ size: bigint }]>(
      `SELECT pg_database_size(current_database())::bigint as size`,
    );
    dbSizeBytes = Number(dbSizeResult[0]?.size ?? 0);
  } catch {
    // Ignore if permission denied
  }

  const planBreakdown = await prisma.tenant.groupBy({
    by: ['plan'],
    _count: true,
    where: { isActive: true },
  });

  return {
    totalTenants,
    activeTenants,
    totalSermons,
    totalStorage,
    planBreakdown: planBreakdown.map((p) => ({
      plan: p.plan,
      count: p._count,
    })),
    totalUsers,
    totalBulletins,
    totalAlbums,
    totalEvents,
    dbSizeBytes,
  };
}

export async function getTenantDetailedStats(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      domains: {
        select: { id: true, domain: true, verified: true, createdAt: true },
      },
    },
  });
  if (!tenant) {
    throw new AppError('NOT_FOUND', 404, 'Tenant not found');
  }

  const schema = `tenant_${tenant.slug}`;

  // Helper to safely count rows in a tenant table
  async function countTable(table: string): Promise<number> {
    try {
      const result = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
        `SELECT COUNT(*)::bigint as count FROM "${schema}"."${table}"`,
      );
      return Number(result[0]?.count ?? 0);
    } catch {
      return 0;
    }
  }

  const [
    sermonCount,
    bulletinCount,
    albumCount,
    eventCount,
    staffCount,
    columnCount,
    historyYearCount,
    pageCount,
    fileCount,
  ] = await Promise.all([
    countTable('sermons'),
    countTable('bulletins'),
    countTable('albums'),
    countTable('events'),
    countTable('staff'),
    countTable('columns_pastoral'),
    countTable('history'),
    countTable('pages'),
    countTable('files'),
  ]);

  // Storage used
  let storageUsedBytes = 0;
  try {
    const storageResult = await prisma.$queryRawUnsafe<[{ total: bigint }]>(
      `SELECT COALESCE(SUM(size_bytes), 0)::bigint as total FROM "${schema}".files`,
    );
    storageUsedBytes = Number(storageResult[0]?.total ?? 0);
  } catch {
    // Ignore
  }

  // DB size for this schema
  let dbSizeBytes = 0;
  try {
    const sizeResult = await prisma.$queryRawUnsafe<[{ size: bigint }]>(
      `SELECT COALESCE(SUM(pg_total_relation_size(quote_ident(schemaname) || '.' || quote_ident(tablename))), 0)::bigint as size FROM pg_tables WHERE schemaname = '${schema}'`,
    );
    dbSizeBytes = Number(sizeResult[0]?.size ?? 0);
  } catch {
    // Ignore
  }

  // User count for this tenant
  const userCount = await prisma.user.count({
    where: { tenantId: tenant.id },
  });

  // Last activity across key tables
  let lastActivity: string | null = null;
  try {
    const activityResult = await prisma.$queryRawUnsafe<[{ last_activity: Date | null }]>(
      `SELECT GREATEST(
        (SELECT MAX(updated_at) FROM "${schema}".sermons),
        (SELECT MAX(updated_at) FROM "${schema}".bulletins),
        (SELECT MAX(updated_at) FROM "${schema}".albums)
      ) as last_activity`,
    );
    const ts = activityResult[0]?.last_activity;
    lastActivity = ts ? new Date(ts).toISOString() : null;
  } catch {
    // Ignore
  }

  // Users belonging to this tenant
  const users = await prisma.user.findMany({
    where: { tenantId: tenant.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return {
    tenant: {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      plan: tenant.plan,
      isActive: tenant.isActive,
      createdAt: tenant.createdAt.toISOString(),
    },
    stats: {
      sermonCount,
      bulletinCount,
      albumCount,
      eventCount,
      staffCount,
      columnCount,
      historyYearCount,
      pageCount,
      fileCount,
      storageUsedBytes,
      dbSizeBytes,
      userCount,
      lastActivity,
    },
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt.toISOString(),
    })),
    domains: tenant.domains.map((d) => ({
      id: d.id,
      domain: d.domain,
      isVerified: d.verified,
      createdAt: d.createdAt.toISOString(),
    })),
  };
}
