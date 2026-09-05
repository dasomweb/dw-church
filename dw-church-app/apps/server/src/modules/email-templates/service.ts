import { prisma } from '../../config/database.js';
import { wrapEmail, emailButton, emailHeading } from '../../config/email-layout.js';
import type { UpdateTemplateInput } from './schema.js';

const TABLE = 'public.email_templates';

export interface TemplateDef {
  key: string;
  name: string;
  subject: string;
  body: string; // inner HTML with {{vars}} + optional {{button}}
  vars: string; // comma-separated hint for the UI
}

// Default templates — seeded into the DB once; the super admin edits them after.
export const DEFAULT_TEMPLATES: TemplateDef[] = [
  {
    key: 'welcome',
    name: '회원/교회 등록 환영',
    subject: '{{churchName}} 등록을 환영합니다 — TRUE LIGHT',
    body: `${emailHeading('환영합니다!')}<p>{{churchName}}이(가) TRUE LIGHT에 등록되었습니다. 관리자 페이지에서 콘텐츠를 입력하고 사이트를 시작하세요.</p>{{button}}`,
    vars: 'churchName, button',
  },
  {
    key: 'application_received',
    name: '신청 접수 확인',
    subject: '홈페이지 개발 신청이 접수되었습니다 — TRUE LIGHT',
    body: `${emailHeading('신청해 주셔서 감사합니다')}<p>{{churchName}}의 홈페이지 개발 신청({{plan}})이 접수되었습니다. 검토 후 결제 안내를 이메일로 보내드리겠습니다.</p>`,
    vars: 'churchName, plan',
  },
  {
    key: 'payment',
    name: '결제 안내',
    subject: '{{churchName}} 결제 안내 — TRUE LIGHT',
    body: `${emailHeading('결제 안내')}<p>{{churchName}}의 신청을 검토했습니다. 아래 버튼으로 결제를 완료해 주시면 곧바로 제작을 시작하겠습니다.</p>{{button}}<p style="font-size:13px;color:#9ca3af">결제가 확인되면 디자인 셋업과 기본 구성을 진행합니다.</p>`,
    vars: 'churchName, button',
  },
  {
    key: 'support_reply',
    name: '고객지원 답변',
    subject: '[TRUE LIGHT 고객지원] {{subject}}',
    body: `${emailHeading('고객지원 답변')}<p>{{reply}}</p>`,
    vars: 'subject, reply',
  },
  {
    // 잠재 교회에게 보내는 truelight.app 홍보/소개 메일. 이메일 발송(broadcast)
    // 탭에서 대상을 골라 보내거나, 여기서 내용을 다듬고 테스트 발송할 수 있음.
    // 실제 제공 기능/요금제만 담음 (마케팅 포지셔닝: 전문가 제작 + 교회 직접 관리).
    key: 'promo',
    name: 'TRUE LIGHT 홍보/소개',
    subject: '교회 홈페이지, 전문가가 만들고 교회가 직접 관리하세요 — TRUE LIGHT',
    body: `${emailHeading('교회 홈페이지, 이제 이렇게 하세요')}` +
      `<p>안녕하세요. 미주 한인교회를 위한 홈페이지 서비스 <strong>TRUE LIGHT</strong>입니다.</p>` +
      `<p>처음 디자인과 제작은 저희 전문가가 교회에 맞춰 진행하고, 오픈 이후에는 교회가 관리자 화면에서 콘텐츠를 직접 운영합니다. 매번 업체에 맡기거나 어려운 기술을 배우지 않으셔도 됩니다.</p>` +
      `<ul>` +
      `<li><strong>설교·주보·앨범·행사·교역자·게시판</strong>을 직접 등록 — 올리면 홈페이지에 바로 반영됩니다.</li>` +
      `<li><strong>휴대폰</strong>에서도 잘 보이는 6가지 디자인.</li>` +
      `<li>처음 <strong>디자인·셋업은 전문가</strong>가, 이후 <strong>콘텐츠 관리는 교회</strong>가.</li>` +
      `<li>교회 규모에 맞춘 <strong>라이트·기본·플러스·프로</strong> 요금제.</li>` +
      `</ul>` +
      `<p>실제 관리자 화면을 데모로 미리 둘러보실 수 있습니다. 아래에서 시작해 보세요.</p>` +
      `{{button}}` +
      `<p style="font-size:13px;color:#9ca3af">문의는 이 메일에 회신해 주시면 됩니다.</p>`,
    vars: 'button',
  },
];

const DEFAULT_BY_KEY = new Map(DEFAULT_TEMPLATES.map((t) => [t.key, t]));

export async function listTemplates() {
  return prisma.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM ${TABLE} ORDER BY key ASC`);
}

export async function getTemplate(key: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM ${TABLE} WHERE key = $1`,
    key,
  );
  return rows[0] ?? null;
}

export async function updateTemplate(key: string, input: UpdateTemplateInput) {
  const set: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (input.subject !== undefined) { set.push(`subject = $${i++}`); values.push(input.subject); }
  if (input.body !== undefined) { set.push(`body = $${i++}`); values.push(input.body); }
  if (set.length === 0) return getTemplate(key);
  set.push('updated_at = NOW()');
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE ${TABLE} SET ${set.join(', ')} WHERE key = $${i} RETURNING *`,
    ...values, key,
  );
  return rows[0] ?? null;
}

function substitute(text: string, vars: Record<string, string>): string {
  let out = text;
  // {{button}} → styled action button when a buttonUrl is provided.
  if (vars.buttonUrl) {
    out = out.replace(/\{\{button\}\}/g, emailButton(vars.buttonText || '바로가기', vars.buttonUrl));
  }
  out = out.replace(/\{\{button\}\}/g, '');
  // Remaining {{var}} → value (multiline values become <br>). Unknown → ''.
  out = out.replace(/\{\{(\w+)\}\}/g, (_m, k: string) => {
    const v = vars[k];
    return v == null ? '' : String(v).replace(/\n/g, '<br>');
  });
  return out;
}

/**
 * Render a template by key into a ready-to-send { subject, html }. Loads the
 * DB row (falls back to the built-in default if the table/row is missing),
 * substitutes variables, and wraps the body in the clean email shell.
 */
export async function renderTemplate(
  key: string,
  vars: Record<string, string> = {},
): Promise<{ subject: string; html: string }> {
  let subjectTpl: string | undefined;
  let bodyTpl: string | undefined;
  try {
    const row = await getTemplate(key);
    if (row) { subjectTpl = row.subject as string; bodyTpl = row.body as string; }
  } catch { /* table may not exist yet */ }
  const def = DEFAULT_BY_KEY.get(key);
  subjectTpl = subjectTpl ?? def?.subject ?? '';
  bodyTpl = bodyTpl ?? def?.body ?? '';
  return {
    subject: substitute(subjectTpl, vars),
    html: wrapEmail(substitute(bodyTpl, vars)),
  };
}

/**
 * Render a (possibly unsaved) draft subject/body into a ready-to-view
 * { subject, html } using the same substitution + shell as a real send.
 * Used by the admin live-preview panel so the editor shows the final design.
 */
export function renderRaw(
  subject: string,
  body: string,
  vars: Record<string, string> = {},
): { subject: string; html: string } {
  return {
    subject: substitute(subject, vars),
    html: wrapEmail(substitute(body, vars)),
  };
}

/** Render arbitrary broadcast body (admin-authored inner HTML) into the shell. */
export function renderBroadcast(subject: string, body: string): { subject: string; html: string } {
  return { subject, html: wrapEmail(body, { footerNote: '본 메일은 TRUE LIGHT 공지입니다.' }) };
}

/** Recipient emails for a broadcast — distinct tenant-admin user emails. */
export async function broadcastRecipients(): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<{ email: string }[]>(
    `SELECT DISTINCT email FROM public.users WHERE email IS NOT NULL AND email <> '' AND role <> 'super_admin'`,
  );
  return rows.map((r) => r.email).filter(Boolean);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function emailsFromTable(table: string): Promise<string[]> {
  try {
    const rows = await prisma.$queryRawUnsafe<{ email: string }[]>(
      `SELECT DISTINCT email FROM ${table} WHERE email IS NOT NULL AND email <> ''`,
    );
    return rows.map((r) => r.email).filter(Boolean);
  } catch {
    return []; // table may not exist yet
  }
}

/** Parse a pasted blob of addresses (comma / newline / semicolon separated). */
export function parseCustomEmails(blob?: string): string[] {
  if (!blob) return [];
  return blob
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter((s) => EMAIL_RE.test(s));
}

/** Per-audience recipient counts for the compose UI. */
export async function audienceCounts(): Promise<{ admins: number; demo: number; applications: number; contacts: number }> {
  const { subscribedEmails } = await import('../marketing-contacts/service.js');
  const [admins, demo, applications, contacts] = await Promise.all([
    broadcastRecipients(),
    emailsFromTable('public.demo_requests'),
    emailsFromTable('public.service_applications'),
    subscribedEmails(),
  ]);
  return { admins: admins.length, demo: demo.length, applications: applications.length, contacts: contacts.length };
}

/**
 * Resolve the full, de-duplicated recipient list for a marketing/announcement
 * blast from the selected audiences + a pasted custom list.
 */
export async function marketingRecipients(
  audiences: readonly string[] | undefined,
  customEmails?: string,
  contactTags?: string[],
): Promise<string[]> {
  const picked = audiences && audiences.length ? audiences : ['admins'];
  const lists: string[][] = [];
  if (picked.includes('admins')) lists.push(await broadcastRecipients());
  if (picked.includes('demo')) lists.push(await emailsFromTable('public.demo_requests'));
  if (picked.includes('applications')) lists.push(await emailsFromTable('public.service_applications'));
  if (picked.includes('contacts')) {
    const { subscribedEmails } = await import('../marketing-contacts/service.js');
    lists.push(await subscribedEmails(contactTags));
  }
  lists.push(parseCustomEmails(customEmails));
  // De-dupe case-insensitively, keep the first-seen casing.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const email of lists.flat()) {
    const key = email.toLowerCase();
    if (!seen.has(key) && EMAIL_RE.test(email)) {
      seen.add(key);
      out.push(email);
    }
  }
  return out;
}
