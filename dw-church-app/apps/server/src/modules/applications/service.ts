import { prisma } from '../../config/database.js';
import type { CreateApplicationInput, UpdateApplicationInput } from './schema.js';
import { computeQuote } from './quote.js';

// Platform table lives in the public schema (prospects, not tenants).
const TABLE = 'public.service_applications';

// camelCase input → snake_case column.
const COLUMN_MAP: Record<string, string> = {
  churchName: 'church_name',
  contactName: 'contact_name',
  email: 'email',
  phone: 'phone',
  churchAddress: 'church_address',
  denomination: 'denomination',
  faithAffirmed: 'faith_affirmed',
  termsAccepted: 'terms_accepted',
  plan: 'plan',
  billingPeriod: 'billing_period',
  existingUrl: 'existing_url',
  desiredDomain: 'desired_domain',
  message: 'message',
  plantingType: 'planting_type',
  memberProfile: 'member_profile',
  localContext: 'local_context',
  couponCode: 'coupon_code',
  designChoice: 'design_choice',
  status: 'status',
  stage: 'stage',
  adminNote: 'admin_note',
  paymentLink: 'payment_link',
  denominationVerified: 'denomination_verified',
  // 도입 파이프라인 ①
  buildScope: 'build_scope',
  subsidyRequested: 'subsidy_requested',
  sponsorChurch: 'sponsor_church',
  signedName: 'signed_name',
  // jsonb (아래 JSONB_COLS 로 별도 캐스팅)
  addons: 'addons',
  quote: 'quote',
  devIntake: 'dev_intake',
};
// Columns that must be JSON.stringify + ::jsonb cast.
const JSONB_COLS = new Set(['addons', 'quote', 'dev_intake']);

export async function listApplications(status?: string) {
  const params: unknown[] = [];
  let where = '';
  if (status) {
    where = 'WHERE status = $1';
    params.push(status);
  }
  return prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM ${TABLE} ${where} ORDER BY created_at DESC`,
    ...params,
  );
}

export async function getApplication(id: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM ${TABLE} WHERE id = $1::uuid`,
    id,
  );
  return rows[0] ?? null;
}

/** Build (cols, placeholders, values) from a camelCase map, casting jsonb cols. */
function buildWrite(fields: Record<string, unknown>): { cols: string[]; placeholders: string[]; values: unknown[] } {
  const cols: string[] = [];
  const placeholders: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const [key, col] of Object.entries(COLUMN_MAP)) {
    const v = fields[key];
    if (v === undefined) continue;
    if (JSONB_COLS.has(col)) {
      cols.push(`"${col}"`);
      placeholders.push(`$${i++}::jsonb`);
      values.push(JSON.stringify(v ?? null));
    } else {
      cols.push(`"${col}"`);
      placeholders.push(`$${i++}`);
      values.push(v);
    }
  }
  return { cols, placeholders, values };
}

export async function createApplication(input: CreateApplicationInput) {
  // 제출 시점 자동 견적 스냅샷 + 파이프라인 단계.
  const quote = await computeQuote({
    buildScope: input.buildScope ?? null,
    addons: input.addons ?? null,
    subsidyRequested: input.subsidyRequested ?? false,
  });
  const signed = !!(input.signedName && input.signedName.trim());
  const fields: Record<string, unknown> = {
    ...input,
    addons: input.addons ?? [],
    quote,
    stage: signed ? 'signed' : 'submitted',
  };
  // Drop empty-string scalars so DB defaults/NULLs apply (jsonb handled separately).
  for (const [k, col] of Object.entries(COLUMN_MAP)) {
    if (!JSONB_COLS.has(col) && (fields[k] === null || fields[k] === '')) delete fields[k];
  }
  const { cols, placeholders, values } = buildWrite(fields);
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO ${TABLE} (${cols.join(', ')})
     VALUES (${placeholders.join(', ')})
     RETURNING *`,
    ...values,
  );
  // 간이 e-sign: 서명자 이름이 있으면 서명 시각 스탬프.
  if (signed && rows[0]) {
    await prisma.$executeRawUnsafe(`UPDATE ${TABLE} SET signed_at = NOW() WHERE id = $1::uuid`, rows[0].id);
    (rows[0] as Record<string, unknown>).signed_at = new Date().toISOString();
  }
  return rows[0];
}

export async function updateApplication(id: string, input: UpdateApplicationInput) {
  const setClauses: string[] = [];
  const setValues: unknown[] = [];
  let i = 1;
  for (const [key, col] of Object.entries(COLUMN_MAP)) {
    const v = (input as Record<string, unknown>)[key];
    if (v === undefined) continue;
    if (JSONB_COLS.has(col)) { setClauses.push(`"${col}" = $${i++}::jsonb`); setValues.push(JSON.stringify(v ?? null)); }
    else { setClauses.push(`"${col}" = $${i++}`); setValues.push(v); }
  }
  if (setClauses.length === 0) return getApplication(id);
  setClauses.push('updated_at = NOW()');
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE ${TABLE} SET ${setClauses.join(', ')} WHERE id = $${i}::uuid RETURNING *`,
    ...setValues,
    id,
  );
  return rows[0] ?? null;
}

export async function deleteApplication(id: string) {
  await prisma.$queryRawUnsafe(`DELETE FROM ${TABLE} WHERE id = $1::uuid`, id);
}
