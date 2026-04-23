import dns from 'node:dns';
import crypto from 'node:crypto';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/error-handler.js';
import * as railway from '../../config/railway.js';

export interface CustomDomain {
  id: string;
  domain: string;
  status: 'pending' | 'verified' | 'pending_ssl' | 'active' | 'failed' | string;
  verification_token: string | null;
  railway_domain_id: string | null;
  verified_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface DnsInstruction {
  /** Human-readable description — what each record is for. */
  purpose: 'ownership' | 'routing';
  type: 'TXT' | 'CNAME' | 'A';
  name: string;    // what the user types in the DNS "Name/Host" field
  value: string;   // what they put in the "Value/Target" field
  ttl?: number;
}

const VERIFY_PREFIX = '_truelight-verify';

/** DNS instructions a tenant needs to add at their registrar. */
export function buildDnsInstructions(domain: string, token: string): DnsInstruction[] {
  return [
    {
      purpose: 'ownership',
      type: 'TXT',
      name: `${VERIFY_PREFIX}.${domain}`,
      value: `truelight-verify=${token}`,
      ttl: 300,
    },
    {
      purpose: 'routing',
      type: 'CNAME',
      name: domain,
      value: env.WEB_CNAME_TARGET,
      ttl: 300,
    },
  ];
}

/** Basic domain shape check (not a full RFC 1035 validation). */
function validateDomain(domain: string): string {
  const d = domain.trim().toLowerCase();
  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(d)) {
    throw new AppError('INVALID_DOMAIN', 400, 'Invalid domain format');
  }
  // Block our own domain to prevent hijack of *.truelight.app
  if (d === 'truelight.app' || d.endsWith('.truelight.app')) {
    throw new AppError('RESERVED_DOMAIN', 400, 'truelight.app은 등록할 수 없습니다');
  }
  return d;
}

/** List every domain registered to this tenant. */
export async function getDomains(schema: string): Promise<CustomDomain[]> {
  return prisma.$queryRawUnsafe<CustomDomain[]>(
    `SELECT id, domain, status, verification_token, railway_domain_id, verified_at, created_at, updated_at
     FROM "${schema}".custom_domains
     ORDER BY created_at DESC`,
  );
}

/**
 * Register a new domain for verification. Generates a random token, inserts
 * row with status='pending'. Does NOT yet write to public.tenants.custom_domain
 * — that happens only after successful TXT verification.
 */
export async function addDomain(
  schema: string,
  tenantId: string,
  rawDomain: string,
): Promise<{ domain: CustomDomain; instructions: DnsInstruction[] }> {
  const domain = validateDomain(rawDomain);

  // Global uniqueness: a domain can only be claimed by one tenant
  const existing = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM public.tenants WHERE custom_domain = $1 AND id != $2`,
    domain,
    tenantId,
  );
  if (existing.length > 0) {
    throw new AppError('DOMAIN_IN_USE', 409, 'This domain is already connected to another tenant');
  }

  const token = crypto.randomBytes(24).toString('hex');

  const rows = await prisma.$queryRawUnsafe<CustomDomain[]>(
    `INSERT INTO "${schema}".custom_domains (domain, status, verification_token)
     VALUES ($1, 'pending', $2)
     ON CONFLICT (domain) DO UPDATE
       SET verification_token = EXCLUDED.verification_token,
           status = CASE
             WHEN "${schema}".custom_domains.status IN ('verified', 'pending_ssl', 'active') THEN "${schema}".custom_domains.status
             ELSE 'pending'
           END,
           updated_at = NOW()
     RETURNING id, domain, status, verification_token, railway_domain_id, verified_at, created_at, updated_at`,
    domain, token,
  );

  return {
    domain: rows[0]!,
    instructions: buildDnsInstructions(domain, rows[0]!.verification_token ?? token),
  };
}

/**
 * Check the TXT record at `_truelight-verify.{domain}` and see if our token
 * is present. If so, mark the row verified and hook it up to
 * public.tenants.custom_domain so incoming requests route to this tenant.
 *
 * Returns the (possibly updated) row + a structured status so the frontend
 * can render specific error messages.
 */
export async function verifyDomain(
  schema: string,
  tenantId: string,
  domainId: string,
): Promise<{
  domain: CustomDomain;
  txtFound: boolean;
  cnameOk: boolean;
  errorCode?: string;
  errorMessage?: string;
}> {
  const rows = await prisma.$queryRawUnsafe<CustomDomain[]>(
    `SELECT id, domain, status, verification_token, railway_domain_id, verified_at, created_at, updated_at
     FROM "${schema}".custom_domains WHERE id = $1::uuid`,
    domainId,
  );
  if (rows.length === 0) {
    throw new AppError('NOT_FOUND', 404, 'Domain not found');
  }
  const current = rows[0]!;
  const expected = `truelight-verify=${current.verification_token ?? ''}`;

  let txtFound = false;
  let txtErrorCode: string | undefined;
  try {
    const records = await dns.promises.resolveTxt(`${VERIFY_PREFIX}.${current.domain}`);
    // resolveTxt returns string[][] — each record may be split into chunks
    txtFound = records.some((chunks) => chunks.join('') === expected);
  } catch (err) {
    txtErrorCode = (err as NodeJS.ErrnoException).code;
  }

  let cnameOk = false;
  try {
    const cnames = await dns.promises.resolveCname(current.domain);
    cnameOk = cnames.some((c) => c.replace(/\.$/, '') === env.WEB_CNAME_TARGET);
  } catch {
    // CNAME probe is best-effort; apex domains can't have CNAME so this often
    // legitimately fails. Only TXT is required to confirm ownership.
  }

  // After TXT verification, register the domain on Railway so the edge starts
  // routing it + Let's Encrypt issues SSL. If Railway env vars aren't set,
  // we leave status='verified' and surface a hint that manual setup is needed.
  let railwayId: string | null = current.railway_domain_id;
  let railwayError: string | undefined;
  let nextStatus: string = txtFound ? 'verified' : 'pending';

  if (txtFound) {
    try {
      const result = await railway.addCustomDomain(current.domain);
      if (result) {
        railwayId = result.id || railwayId;
        nextStatus = result.status === 'active' ? 'active' : 'pending_ssl';
      }
      // result === null means Railway env vars not configured — keep 'verified'
    } catch (err) {
      railwayError = err instanceof Error ? err.message : String(err);
    }
  }

  const verifiedAtSql = txtFound ? 'NOW()' : 'verified_at';

  const updated = await prisma.$queryRawUnsafe<CustomDomain[]>(
    `UPDATE "${schema}".custom_domains
     SET status = $1, verified_at = ${verifiedAtSql}, railway_domain_id = $2, updated_at = NOW()
     WHERE id = $3::uuid
     RETURNING id, domain, status, verification_token, railway_domain_id, verified_at, created_at, updated_at`,
    nextStatus, railwayId, domainId,
  );

  if (txtFound) {
    // Only after successful verification do we wire the domain into the
    // tenant-resolution map (public.tenants.custom_domain).
    await prisma.$queryRawUnsafe(
      `UPDATE public.tenants SET custom_domain = $1 WHERE id = $2`,
      current.domain, tenantId,
    );
  }

  return {
    domain: updated[0]!,
    txtFound,
    cnameOk,
    errorCode: txtFound ? undefined : (txtErrorCode ?? 'TXT_MISMATCH'),
    errorMessage: txtFound
      ? (railwayError ? `Railway 등록 실패: ${railwayError}. 슈퍼어드민이 수동 등록해야 합니다.` : undefined)
      : (txtErrorCode === 'ENOTFOUND'
        ? 'TXT 레코드를 찾을 수 없습니다. DNS 전파에 최대 수 분이 걸릴 수 있습니다.'
        : 'TXT 레코드 값이 일치하지 않습니다. 아래 표시된 값을 다시 확인해주세요.'),
  };
}

/**
 * Remove a custom domain. Also clears public.tenants.custom_domain if it
 * was pointing to this domain (otherwise the tenant-resolution middleware
 * would keep resolving requests to this now-orphaned tenant).
 */
export async function removeDomain(
  schema: string,
  tenantId: string,
  domainId: string,
): Promise<void> {
  const rows = await prisma.$queryRawUnsafe<{ domain: string; railway_domain_id: string | null }[]>(
    `DELETE FROM "${schema}".custom_domains WHERE id = $1::uuid
     RETURNING domain, railway_domain_id`,
    domainId,
  );
  if (rows.length === 0) {
    throw new AppError('NOT_FOUND', 404, 'Domain not found');
  }
  await prisma.$queryRawUnsafe(
    `UPDATE public.tenants SET custom_domain = NULL WHERE id = $1 AND custom_domain = $2`,
    tenantId, rows[0]!.domain,
  );
  // Best-effort: also remove from Railway so the slot frees up.
  if (rows[0]!.railway_domain_id) {
    await railway.removeCustomDomain(rows[0]!.railway_domain_id);
  }
}

/** Return the DNS instructions for a pending domain (for the wizard UI). */
export async function getInstructions(
  schema: string,
  domainId: string,
): Promise<{ domain: CustomDomain; instructions: DnsInstruction[] }> {
  const rows = await prisma.$queryRawUnsafe<CustomDomain[]>(
    `SELECT id, domain, status, verification_token, railway_domain_id, verified_at, created_at, updated_at
     FROM "${schema}".custom_domains WHERE id = $1::uuid`,
    domainId,
  );
  if (rows.length === 0) {
    throw new AppError('NOT_FOUND', 404, 'Domain not found');
  }
  const row = rows[0]!;
  if (!row.verification_token) {
    throw new AppError('NO_TOKEN', 400, 'Verification token missing — re-add the domain');
  }
  return {
    domain: row,
    instructions: buildDnsInstructions(row.domain, row.verification_token),
  };
}
