import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/error-handler.js';
import * as cf from '../../config/cloudflare.js';

/**
 * Tenant custom-domain service — Cloudflare for SaaS edition.
 * Ported from b2bsmart 2026-06-03. See docs/multitenant-domains/.
 *
 * Flow:
 *   1. addDomain → register the hostname via Cloudflare Custom Hostnames
 *      API. Cloudflare returns TXT ownership-verification + tracks SSL
 *      provisioning. We persist cf_hostname_id and surface TXT +
 *      CNAME-to-fallback-origin instructions to the operator.
 *   2. verifyDomain → poll Cloudflare for live status. When BOTH the
 *      routing status AND ssl.status report 'active', we wire the
 *      domain into public.tenants.custom_domain so the tenant resolver
 *      middleware routes incoming requests to the right tenant schema.
 *   3. removeDomain → DELETE the Cloudflare hostname so we don't leak
 *      SaaS hostname slots, drop the local row, clear
 *      public.tenants.custom_domain if pointing here.
 *
 * Policy: SUBDOMAIN routing only (e.g. www.korean-church.com). Apex/root
 * routing requires Cloudflare Apex Proxying (Enterprise add-on). For apex
 * the operator sets a Domain Forwarding redirect at their registrar.
 */

export interface CustomDomain {
  id: string;
  domain: string;
  /** Mirrors Cloudflare's hostname status verbatim — forward compat with
   *  future Cloudflare state additions. Known: 'pending', 'active',
   *  'pending_validation', 'pending_issuance', 'pending_deployment',
   *  'pending_deletion', 'blocked', 'moved'. */
  status: string;
  /** Legacy column. Kept for rollback safety during Cloudflare migration;
   *  no longer written. Drop in a later cleanup migration. */
  verification_token: string | null;
  /** Legacy Railway domain id. Kept for same rollback reason. */
  railway_domain_id: string | null;
  /** Cloudflare custom_hostname id — authoritative pointer now. */
  cf_hostname_id: string | null;
  verified_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface DnsInstruction {
  purpose: 'ownership' | 'routing';
  type: 'TXT' | 'CNAME' | 'A';
  /** What the user types in DNS "Name/Host" field. */
  name: string;
  /** What they put in "Value/Target" field. */
  value: string;
  ttl?: number;
}

function validateDomain(domain: string): string {
  const d = domain.trim().toLowerCase();
  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(d)) {
    throw new AppError('INVALID_DOMAIN', 400, 'Invalid domain format');
  }
  if (d === 'truelight.app' || d.endsWith('.truelight.app')) {
    throw new AppError('RESERVED_DOMAIN', 400, 'truelight.app은 등록할 수 없습니다');
  }
  return d;
}

/** ≤2 labels means apex (example.com). Detect early to give a clearer
 *  error before spending a Cloudflare API call on something that fails. */
function isApexDomain(domain: string): boolean {
  return domain.split('.').length <= 2;
}

/**
 * Translate a Cloudflare custom_hostname response into the two DNS
 * records we ask the operator to add at their own registrar:
 *   - TXT  _cf-custom-hostname.<domain>  =  <token>
 *     (Cloudflare's ownership_verification record — verbatim from CF)
 *   - CNAME <domain>  →  CF_FALLBACK_ORIGIN  (routing record)
 */
export function buildDnsInstructionsFromCf(
  domain: string,
  hostname: cf.CloudflareCustomHostname,
): DnsInstruction[] {
  const records: DnsInstruction[] = [];
  const verify = hostname.ownership_verification;
  if (verify && verify.type === 'txt') {
    records.push({
      purpose: 'ownership',
      type: 'TXT',
      name: verify.name,
      value: verify.value,
      ttl: 300,
    });
  }
  records.push({
    purpose: 'routing',
    type: 'CNAME',
    name: domain,
    value: env.CF_FALLBACK_ORIGIN,
    ttl: 300,
  });
  return records;
}

export function buildAdditionalSteps(domain: string): string[] {
  const parts = domain.split('.');
  const apex = parts.slice(-2).join('.');
  return [
    `루트 도메인(${apex})으로 접속하는 경우도 동작시키려면, ${apex} 의 DNS에서 아래 둘 중 하나를 설정하세요.`,
    `① 도메인이 Cloudflare / Route53 등 CNAME flattening(ALIAS·ANAME)을 지원하면: ${apex} 에 CNAME → ${env.CF_FALLBACK_ORIGIN} (Proxied) 를 추가하세요. 그러면 자동으로 https://${domain} 로 연결됩니다(추가 설정 불필요).`,
    `② 일반 등록업체(GoDaddy·Namecheap·가비아 등)면: Domain Forwarding(또는 URL Redirect)으로 ${apex} → https://${domain} 리다이렉트를 설정하세요(대부분 무료).`,
    `DNS 표준상 ${apex} 같은 루트 도메인에는 CNAME 레코드를 직접 둘 수 없어, www 서브도메인이 정식 진입점이고 루트는 위 방법으로 연결합니다.`,
  ];
}

export async function getDomains(schema: string): Promise<CustomDomain[]> {
  return prisma.$queryRawUnsafe<CustomDomain[]>(
    `SELECT id, domain, status, verification_token, railway_domain_id,
            cf_hostname_id, verified_at, created_at, updated_at
     FROM "${schema}".custom_domains
     ORDER BY created_at DESC`,
  );
}

export async function addDomain(
  schema: string,
  tenantId: string,
  rawDomain: string,
): Promise<{ domain: CustomDomain; instructions: DnsInstruction[]; additionalSteps: string[] }> {
  const domain = validateDomain(rawDomain);

  if (isApexDomain(domain)) {
    throw new AppError(
      'APEX_NOT_SUPPORTED',
      400,
      `루트 도메인(${domain})은 직접 연결을 지원하지 않습니다. www.${domain} 형식으로 입력하시고, 루트는 본인 도메인 관리자에서 www.${domain} 으로 redirect 설정해주세요.`,
    );
  }

  if (!cf.cloudflareConfigured()) {
    throw new AppError(
      'CF_NOT_CONFIGURED',
      503,
      'Cloudflare for SaaS 가 설정되지 않았습니다. 슈퍼어드민에게 문의하세요.',
    );
  }

  const existing = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM public.tenants WHERE custom_domain = $1 AND id != $2::uuid`,
    domain,
    tenantId,
  );
  if (existing.length > 0) {
    throw new AppError('DOMAIN_IN_USE', 409, 'This domain is already connected to another tenant');
  }

  let hostname: cf.CloudflareCustomHostname;
  try {
    const created = await cf.createCustomHostname(domain);
    if (!created) {
      throw new AppError('CF_NOT_CONFIGURED', 503, 'Cloudflare 설정이 없습니다');
    }
    hostname = created;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Cloudflare 1406 = the hostname is already registered on the zone (commonly
    // an orphan from a prior attempt that didn't persist locally). Reuse the
    // existing custom hostname instead of surfacing a raw 502.
    if (/\b1406\b|duplicate custom hostname/i.test(msg)) {
      const existingHost = await cf.getCustomHostnameByName(domain).catch(() => null);
      if (!existingHost) {
        throw new AppError(
          'DOMAIN_IN_USE',
          409,
          `${domain} 은 이미 등록되어 있으나 정보를 불러오지 못했습니다. 잠시 후 다시 시도하거나 슈퍼어드민에게 문의하세요.`,
        );
      }
      hostname = existingHost;
    } else {
      throw new AppError('CF_API_ERROR', 502, `Cloudflare 호출 실패: ${msg}`);
    }
  }

  // Delete-then-insert instead of ON CONFLICT (domain): older tenant schemas
  // were provisioned without the UNIQUE(domain) constraint, so ON CONFLICT
  // failed with 42P10. This CTE is idempotent (re-adding replaces the row) and
  // works regardless of whether the unique index exists.
  const rows = await prisma.$queryRawUnsafe<CustomDomain[]>(
    `WITH deleted AS (
       DELETE FROM "${schema}".custom_domains WHERE domain = $1
     )
     INSERT INTO "${schema}".custom_domains (domain, status, cf_hostname_id)
     VALUES ($1, $2, $3)
     RETURNING id, domain, status, verification_token, railway_domain_id,
               cf_hostname_id, verified_at, created_at, updated_at`,
    domain, hostname.status, hostname.id,
  );

  // Also register the apex (root) as a custom hostname so a tenant can point
  // their apex at us with a single flattened CNAME (apex → CF_FALLBACK_ORIGIN);
  // our middleware then 308-redirects apex → www. Best-effort — a failure here
  // never fails the www connection (apex is optional).
  const apex = domain.replace(/^www\./, '');
  if (apex !== domain) {
    try {
      await cf.createCustomHostname(apex);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/\b1406\b|duplicate custom hostname/i.test(msg)) {
        console.warn(`[domains] apex 호스트네임 등록 실패(${apex}):`, msg);
      }
    }
  }

  return {
    domain: rows[0]!,
    instructions: buildDnsInstructionsFromCf(domain, hostname),
    additionalSteps: buildAdditionalSteps(domain),
  };
}

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
    `SELECT id, domain, status, verification_token, railway_domain_id,
            cf_hostname_id, verified_at, created_at, updated_at
     FROM "${schema}".custom_domains WHERE id = $1::uuid`,
    domainId,
  );
  if (rows.length === 0) {
    throw new AppError('NOT_FOUND', 404, 'Domain not found');
  }
  const current = rows[0]!;

  if (!current.cf_hostname_id) {
    throw new AppError(
      'NO_CF_HOSTNAME',
      400,
      '이 도메인은 Cloudflare for SaaS 마이그레이션 이전 데이터입니다. 삭제 후 다시 추가해주세요.',
    );
  }

  let hostname: cf.CloudflareCustomHostname | null;
  try {
    hostname = await cf.getCustomHostname(current.cf_hostname_id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new AppError('CF_API_ERROR', 502, `Cloudflare 조회 실패: ${msg}`);
  }
  if (!hostname) {
    throw new AppError('CF_NOT_CONFIGURED', 503, 'Cloudflare 설정이 없습니다');
  }

  // Both routing AND SSL must be active before HTTPS works.
  const routingActive = hostname.status === 'active';
  const sslActive = hostname.ssl?.status === 'active';
  const isActive = routingActive && sslActive;
  const txtFound = routingActive || !hostname.ownership_verification;
  const cnameOk = routingActive;

  const verifiedAtSql = isActive ? 'NOW()' : 'verified_at';

  const updated = await prisma.$queryRawUnsafe<CustomDomain[]>(
    `UPDATE "${schema}".custom_domains
     SET status = $1, verified_at = ${verifiedAtSql}, updated_at = NOW()
     WHERE id = $2::uuid
     RETURNING id, domain, status, verification_token, railway_domain_id,
               cf_hostname_id, verified_at, created_at, updated_at`,
    hostname.status, domainId,
  );

  if (isActive) {
    await prisma.$queryRawUnsafe(
      `UPDATE public.tenants SET custom_domain = $1 WHERE id = $2::uuid`,
      current.domain, tenantId,
    );
  }

  const errorCode = isActive ? undefined : (hostname.ssl?.status ?? hostname.status ?? 'PENDING');
  let errorMessage: string | undefined;
  if (isActive) {
    errorMessage = undefined;
  } else if (hostname.verification_errors && hostname.verification_errors.length > 0) {
    errorMessage = hostname.verification_errors.join('; ');
  } else if (!routingActive) {
    errorMessage = 'Cloudflare 가 DNS 레코드를 아직 확인하지 못했습니다. 전파에 최대 수 분 걸릴 수 있습니다.';
  } else {
    const s = hostname.ssl?.status;
    errorMessage =
      s === 'pending_validation' ? 'SSL 인증서 발급을 위한 도메인 검증 진행 중입니다. 1~5분 후 다시 확인해주세요.'
      : s === 'pending_issuance' ? 'SSL 인증서 발급이 진행 중입니다. 1~5분 후 다시 확인해주세요.'
      : s === 'pending_deployment' ? 'SSL 인증서가 발급되어 Cloudflare 엣지에 배포 중입니다. 5~30분 후 다시 확인해주세요.'
      : 'SSL 인증서 발급이 아직 완료되지 않았습니다. 잠시 후 다시 확인해주세요.';
  }

  return {
    domain: updated[0]!,
    txtFound,
    cnameOk,
    errorCode,
    errorMessage,
  };
}

export async function removeDomain(
  schema: string,
  tenantId: string,
  domainId: string,
): Promise<void> {
  const rows = await prisma.$queryRawUnsafe<{
    domain: string;
    cf_hostname_id: string | null;
  }[]>(
    `DELETE FROM "${schema}".custom_domains WHERE id = $1::uuid
     RETURNING domain, cf_hostname_id`,
    domainId,
  );
  if (rows.length === 0) {
    throw new AppError('NOT_FOUND', 404, 'Domain not found');
  }
  await prisma.$queryRawUnsafe(
    `UPDATE public.tenants SET custom_domain = NULL WHERE id = $1::uuid AND custom_domain = $2`,
    tenantId, rows[0]!.domain,
  );
  if (rows[0]!.cf_hostname_id) {
    try {
      await cf.deleteCustomHostname(rows[0]!.cf_hostname_id);
    } catch (err) {
      console.warn(`Cloudflare deleteCustomHostname failed for ${rows[0]!.cf_hostname_id}:`, err);
    }
  }
  // Clean up the auto-registered apex hostname too (best-effort).
  const apex = rows[0]!.domain.replace(/^www\./, '');
  if (apex !== rows[0]!.domain) {
    try {
      const apexHost = await cf.getCustomHostnameByName(apex);
      if (apexHost?.id) await cf.deleteCustomHostname(apexHost.id);
    } catch (err) {
      console.warn(`Cloudflare apex cleanup failed for ${apex}:`, err);
    }
  }
}

export interface DomainDiagnostics {
  ok: boolean;
  config: {
    hasApiToken: boolean;
    hasZoneId: boolean;
    configured: boolean;
    fallbackOrigin: string;
  };
  ping: { ok: boolean; error?: string; zoneName?: string };
  summary: string;
}

export async function getDiagnostics(): Promise<DomainDiagnostics> {
  const config = cf.cloudflareConfigStatus();
  const ping = config.configured
    ? await cf.pingCloudflare()
    : { ok: false, error: 'Cloudflare 환경변수 미설정 — 테넌트 도메인 연결이 동작하지 않습니다.' };

  const ok = config.configured && ping.ok;
  let summary: string;
  if (ok) {
    summary = `정상 — Cloudflare for SaaS 연동 활성 (zone: ${ping.zoneName ?? '확인됨'}). 테넌트 서브도메인 검증 시 SSL 자동 발급됩니다.`;
  } else if (!config.configured) {
    const missing = [
      !config.hasApiToken && 'CF_API_TOKEN',
      !config.hasZoneId && 'CF_ZONE_ID',
    ].filter(Boolean).join(', ');
    summary = `Cloudflare 환경변수 누락: ${missing}. 슈퍼어드민이 Railway api-server Variables 에 등록해야 합니다 (docs/multitenant-domains/ 참고).`;
  } else {
    summary = `Cloudflare API 호출 실패: ${ping.error ?? '알 수 없는 오류'}. 토큰 만료/권한 또는 Zone ID 오류일 수 있습니다.`;
  }
  return { ok, config, ping, summary };
}

export async function getInstructions(
  schema: string,
  domainId: string,
): Promise<{ domain: CustomDomain; instructions: DnsInstruction[]; additionalSteps: string[] }> {
  const rows = await prisma.$queryRawUnsafe<CustomDomain[]>(
    `SELECT id, domain, status, verification_token, railway_domain_id,
            cf_hostname_id, verified_at, created_at, updated_at
     FROM "${schema}".custom_domains WHERE id = $1::uuid`,
    domainId,
  );
  if (rows.length === 0) {
    throw new AppError('NOT_FOUND', 404, 'Domain not found');
  }
  const row = rows[0]!;
  if (!row.cf_hostname_id) {
    throw new AppError(
      'NO_CF_HOSTNAME',
      400,
      '이 도메인은 Cloudflare for SaaS 마이그레이션 이전 데이터입니다. 삭제 후 다시 추가해주세요.',
    );
  }

  const hostname = await cf.getCustomHostname(row.cf_hostname_id);
  if (!hostname) {
    throw new AppError('CF_NOT_CONFIGURED', 503, 'Cloudflare 설정이 없습니다');
  }

  return {
    domain: row,
    instructions: buildDnsInstructionsFromCf(row.domain, hostname),
    additionalSteps: buildAdditionalSteps(row.domain),
  };
}
