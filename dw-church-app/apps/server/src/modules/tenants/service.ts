import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/error-handler.js';
import {
  createTenantSchema as createTenantSchemaFn,
  deleteTenantSchema,
} from '../../utils/schema-manager.js';
import type { CreateTenantInput, UpdateTenantInput } from './schema.js';

const BCRYPT_ROUNDS = 12;

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
          `SELECT COALESCE(SUM(file_size), 0)::bigint as total FROM "${schema}".files`,
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

  // Drop the tenant schema
  await deleteTenantSchema(tenant.slug);

  // Delete associated users
  await prisma.user.deleteMany({ where: { tenantId: id } });

  // Delete the tenant record
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
        `SELECT COALESCE(SUM(file_size), 0)::bigint as total FROM "${schema}".files`,
      );
      totalStorage += Number(storageResult[0]?.total ?? 0);
    } catch {
      // Schema might not exist
    }
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
  };
}
