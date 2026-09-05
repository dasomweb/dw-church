import { prisma } from '../../config/database.js';

/**
 * 교인 명부 엑셀(CSV) 가져오기 (MB-05) — 초기 이관 전용.
 * 엑셀은 CSV 로 내보내 붙여넣거나 업로드한다. 헤더를 자동 인식(한/영)하고,
 * 없으면 1열=이름·2열=전화·3열=생년월일·4열=직분 순으로 읽는다.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ParsedMemberRow {
  name: string;
  nameHanja?: string;
  nameEn?: string;
  gender?: string;
  birthDate?: string | null;
  phone?: string;
  email?: string;
  address?: string;
  position?: string;
  faithLevel?: string;
  regStatus?: string;
  occupation?: string;
  household?: string;
  region?: string;
}

const ALIASES: Record<keyof ParsedMemberRow, string[]> = {
  name: ['이름', '성명', 'name', 'fullname', '교인명'],
  nameHanja: ['한자', 'hanja', '한자명'],
  nameEn: ['영문', '영문명', 'english', 'englishname', 'nameen'],
  gender: ['성별', 'gender', 'sex'],
  birthDate: ['생년월일', '생일', '생년', 'birth', 'birthdate', 'birthday', 'dob'],
  phone: ['전화', '연락처', '휴대폰', '핸드폰', 'phone', 'mobile', 'tel', 'cell'],
  email: ['이메일', 'email', 'e-mail', 'mail'],
  address: ['주소', 'address', 'addr'],
  position: ['직분', '직책', 'position', 'role', 'title'],
  faithLevel: ['신급', 'faith', 'faithlevel', '신앙'],
  regStatus: ['등록상태', '상태', 'status'],
  occupation: ['직업', 'occupation', 'job'],
  household: ['세대', '세대명', 'household', 'family', '가정', '가족'],
  region: ['구역', 'region', 'group', '목장', '순', '교구'],
};

const GENDER_MAP: Record<string, string> = { 남: 'M', 남자: 'M', m: 'M', male: 'M', 여: 'F', 여자: 'F', f: 'F', female: 'F' };
const STATUS_MAP: Record<string, string> = {
  정착: 'active', active: 'active', 재적: 'active',
  새가족: 'newcomer', 신규: 'newcomer', newcomer: 'newcomer',
  장기결석: 'inactive', 결석: 'inactive', inactive: 'inactive',
  전출: 'transferred', 이명: 'transferred', transferred: 'transferred',
  별세: 'deceased', 사망: 'deceased', deceased: 'deceased',
};

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let k = 0; k < line.length; k++) {
    const ch = line[k];
    if (inQ) {
      if (ch === '"' && line[k + 1] === '"') { cur += '"'; k++; }
      else if (ch === '"') inQ = false;
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',' || ch === '\t') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/** 'YYYY-MM-DD' | 'YYYY.MM.DD' | 'YYYY/MM/DD' | 'YYYYMMDD' → 'YYYY-MM-DD' or null. */
export function normalizeDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/);
  if (!m) m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!m) return null;
  const y = m[1]!;
  const mo = String(m[2]).padStart(2, '0');
  const d = String(m[3]).padStart(2, '0');
  if (Number(mo) < 1 || Number(mo) > 12 || Number(d) < 1 || Number(d) > 31) return null;
  return `${y}-${mo}-${d}`;
}

/** Pure parser — CSV/pasted text → normalized rows + invalid count (no DB). */
export function parseMemberCsv(csv: string): { rows: ParsedMemberRow[]; invalid: number; invalidSamples: string[] } {
  const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { rows: [], invalid: 0, invalidSamples: [] };

  const first = splitCsvLine(lines[0]!).map((c) => c.toLowerCase().replace(/\s+/g, ''));
  const looksHeader = first.some((c) => ALIASES.name.includes(c) || ALIASES.phone.includes(c) || ALIASES.birthDate.includes(c));
  const idx: Partial<Record<keyof ParsedMemberRow, number>> = {};
  let start = 0;
  if (looksHeader) {
    start = 1;
    for (const key of Object.keys(ALIASES) as (keyof ParsedMemberRow)[]) {
      const found = first.findIndex((c) => ALIASES[key].includes(c));
      if (found >= 0) idx[key] = found;
    }
  } else {
    idx.name = 0; idx.phone = 1; idx.birthDate = 2; idx.position = 3;
  }

  const rows: ParsedMemberRow[] = [];
  let invalid = 0;
  const invalidSamples: string[] = [];
  for (let li = start; li < lines.length; li++) {
    const cols = splitCsvLine(lines[li]!);
    const get = (k: keyof ParsedMemberRow) => (idx[k] !== undefined ? (cols[idx[k]!] ?? '').trim() : '');
    const name = get('name');
    if (!name) { invalid++; if (invalidSamples.length < 5) invalidSamples.push(lines[li]!.slice(0, 40)); continue; }
    const genderRaw = get('gender').toLowerCase();
    const statusRaw = get('regStatus').toLowerCase();
    const email = get('email');
    rows.push({
      name,
      nameHanja: get('nameHanja') || undefined,
      nameEn: get('nameEn') || undefined,
      gender: GENDER_MAP[genderRaw] ?? undefined,
      birthDate: normalizeDate(get('birthDate')),
      phone: get('phone') || undefined,
      email: email && EMAIL_RE.test(email) ? email : undefined,
      address: get('address') || undefined,
      position: get('position') || undefined,
      faithLevel: get('faithLevel') || undefined,
      regStatus: STATUS_MAP[statusRaw] ?? undefined,
      occupation: get('occupation') || undefined,
      household: get('household') || undefined,
      region: get('region') || undefined,
    });
  }
  return { rows, invalid, invalidSamples };
}

/**
 * Insert parsed rows into a tenant. When createHouseholds, rows sharing a
 * household name (or, if absent, address) are grouped into one household and
 * linked; region flows onto that household.
 */
export async function importMembers(
  schema: string,
  input: { csv?: string; rows?: ParsedMemberRow[]; createHouseholds?: boolean },
): Promise<{ received: number; imported: number; invalid: number; invalidSamples: string[]; householdsCreated: number }> {
  let parsed: ParsedMemberRow[] = [];
  let invalid = 0;
  let invalidSamples: string[] = [];
  if (input.csv) { const r = parseMemberCsv(input.csv); parsed = r.rows; invalid = r.invalid; invalidSamples = r.invalidSamples; }
  if (input.rows) parsed = parsed.concat(input.rows.filter((r) => r.name && r.name.trim()));

  const hhCache = new Map<string, string>(); // household key → id
  let householdsCreated = 0;
  let imported = 0;

  for (const r of parsed) {
    let householdId: string | null = null;
    if (input.createHouseholds) {
      const key = (r.household || r.address || '').trim();
      if (key) {
        if (hhCache.has(key)) householdId = hhCache.get(key)!;
        else {
          const hhName = r.household || `${r.name} 세대`;
          const hhRows = await prisma.$queryRawUnsafe<{ id: string }[]>(
            `INSERT INTO "${schema}".households (name, region, address) VALUES ($1, $2, $3) RETURNING id`,
            hhName, r.region || '', r.address || '',
          );
          householdId = hhRows[0]!.id;
          hhCache.set(key, householdId);
          householdsCreated++;
        }
      }
    }
    await prisma.$executeRawUnsafe(
      `INSERT INTO "${schema}".members
         (name, name_hanja, name_en, gender, birth_date, phone, email, address, position, faith_level, reg_status, occupation, household_id)
       VALUES ($1,$2,$3,$4,$5::date,$6,$7,$8,$9,$10,$11,$12,$13::uuid)`,
      r.name, r.nameHanja || '', r.nameEn || '', r.gender || '',
      r.birthDate || null, r.phone || '', r.email || '', r.address || '',
      r.position || '', r.faithLevel || '', r.regStatus || 'active', r.occupation || '', householdId,
    );
    imported++;
  }
  return { received: parsed.length + invalid, imported, invalid, invalidSamples, householdsCreated };
}
