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
    body: `${emailHeading('결제 안내')}<p>{{churchName}}의 신청을 검토했습니다. 아래 버튼으로 결제를 완료해 주시면 곧바로 제작을 시작하겠습니다.</p>{{button}}<p style="font-size:13px;color:#9ca3af">결제가 확인되면 디자인 셋업과 콘텐츠 이전을 진행합니다.</p>`,
    vars: 'churchName, button',
  },
  {
    key: 'support_reply',
    name: '고객지원 답변',
    subject: '[TRUE LIGHT 고객지원] {{subject}}',
    body: `${emailHeading('고객지원 답변')}<p>{{reply}}</p>`,
    vars: 'subject, reply',
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
