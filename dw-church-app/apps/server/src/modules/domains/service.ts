import dns from 'node:dns';
import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/error-handler.js';

interface CustomDomain {
  id: string;
  domain: string;
  status: string;
  verified_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export async function getDomains(schema: string): Promise<CustomDomain[]> {
  return prisma.$queryRawUnsafe<CustomDomain[]>(
    `SELECT id, domain, status, verified_at, created_at, updated_at
     FROM "${schema}".custom_domains
     ORDER BY created_at DESC`,
  );
}

export async function addDomain(
  schema: string,
  tenantId: string,
  domain: string,
): Promise<CustomDomain> {
  // Check if domain is already in use by another tenant
  const existing = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM public.tenants WHERE custom_domain = $1 AND id != $2`,
    domain,
    tenantId,
  );
  if (existing.length > 0) {
    throw new AppError('DOMAIN_IN_USE', 409, 'This domain is already in use by another tenant');
  }

  // Insert into custom_domains
  const rows = await prisma.$queryRawUnsafe<CustomDomain[]>(
    `INSERT INTO "${schema}".custom_domains (domain, status)
     VALUES ($1, 'pending')
     ON CONFLICT (domain) DO UPDATE SET updated_at = NOW()
     RETURNING id, domain, status, verified_at, created_at, updated_at`,
    domain,
  );

  // Update tenants.custom_domain
  await prisma.$queryRawUnsafe(
    `UPDATE public.tenants SET custom_domain = $1 WHERE id = $2`,
    domain,
    tenantId,
  );

  return rows[0]!;
}

export async function removeDomain(
  schema: string,
  tenantId: string,
  domainId: string,
): Promise<void> {
  // Get the domain value before deleting
  const rows = await prisma.$queryRawUnsafe<{ domain: string }[]>(
    `DELETE FROM "${schema}".custom_domains WHERE id = $1::uuid RETURNING domain`,
    domainId,
  );

  if (rows.length === 0) {
    throw new AppError('NOT_FOUND', 404, 'Domain not found');
  }

  // Clear custom_domain from tenants if it matches
  await prisma.$queryRawUnsafe(
    `UPDATE public.tenants SET custom_domain = NULL WHERE id = $1 AND custom_domain = $2`,
    tenantId,
    rows[0]!.domain,
  );
}

export async function verifyDomain(
  schema: string,
  domainId: string,
): Promise<CustomDomain> {
  // Get the domain
  const rows = await prisma.$queryRawUnsafe<CustomDomain[]>(
    `SELECT id, domain, status, verified_at, created_at, updated_at
     FROM "${schema}".custom_domains WHERE id = $1::uuid`,
    domainId,
  );

  if (rows.length === 0) {
    throw new AppError('NOT_FOUND', 404, 'Domain not found');
  }

  const domain = rows[0]!.domain;
  let verified = false;

  try {
    const records = await dns.promises.resolveCname(domain);
    verified = records.some(
      (record) =>
        record === 'cname.vercel-dns.com' ||
        record === 'cname.vercel-dns.com.',
    );
  } catch {
    // DNS resolution failed — domain not configured
    verified = false;
  }

  const newStatus = verified ? 'active' : 'failed';
  const verifiedAt = verified ? 'NOW()' : 'NULL';

  const updated = await prisma.$queryRawUnsafe<CustomDomain[]>(
    `UPDATE "${schema}".custom_domains
     SET status = $1, verified_at = ${verifiedAt}, updated_at = NOW()
     WHERE id = $2::uuid
     RETURNING id, domain, status, verified_at, created_at, updated_at`,
    newStatus,
    domainId,
  );

  return updated[0]!;
}
