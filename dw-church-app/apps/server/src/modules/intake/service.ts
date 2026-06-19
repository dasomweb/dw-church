import { prisma } from '../../config/database.js';
import { validateSchemaName } from '../../utils/validate-schema.js';
import { AppError } from '../../middleware/error-handler.js';
import { upsertSettings } from '../settings/service.js';
import { createStaffMember } from '../staff/service.js';
import { createHistory } from '../history/service.js';
import { createCell } from '../cells/service.js';
import * as pageService from '../pages/service.js';

const TABLE = 'public.site_intake';

export async function getIntake(tenantSlug: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM ${TABLE} WHERE tenant_slug = $1`,
    tenantSlug,
  );
  return rows[0] ?? null;
}

/** Upsert the draft data for a tenant (does not change a 'submitted'/'built' status). */
export async function saveIntake(tenantSlug: string, plan: string, data: unknown) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO ${TABLE} (tenant_slug, plan, data, status)
     VALUES ($1, $2, $3::jsonb, 'draft')
     ON CONFLICT (tenant_slug) DO UPDATE
       SET data = EXCLUDED.data, plan = EXCLUDED.plan, updated_at = NOW()
     RETURNING *`,
    tenantSlug,
    plan,
    JSON.stringify(data ?? {}),
  );
  return rows[0];
}

export async function submitIntake(tenantSlug: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE ${TABLE} SET status = 'submitted', updated_at = NOW() WHERE tenant_slug = $1 RETURNING *`,
    tenantSlug,
  );
  return rows[0] ?? null;
}

/** Super-admin marks the intake as built (after running the AI builder with it). */
export async function setBuilt(tenantSlug: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE ${TABLE} SET status = 'built', updated_at = NOW() WHERE tenant_slug = $1 RETURNING *`,
    tenantSlug,
  );
  return rows[0] ?? null;
}

// 교회(테넌트)에 보여줄 개발 진행 단계. 1단계(input)는 교회의 초기셋업 입력으로
// 자동, 2~4단계(developing/review/live)는 슈퍼어드민이 수동 전환.
export const BUILD_STAGES = ['input', 'developing', 'review', 'live'] as const;
export type BuildStage = (typeof BUILD_STAGES)[number];

/** Super-admin sets the build pipeline stage (creates the row if absent). */
export async function updateBuildStage(tenantSlug: string, stage: BuildStage) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO ${TABLE} (tenant_slug, plan, data, status, build_stage)
     VALUES ($1, '', '{}'::jsonb, 'draft', $2)
     ON CONFLICT (tenant_slug) DO UPDATE
       SET build_stage = EXCLUDED.build_stage, updated_at = NOW()
     RETURNING *`,
    tenantSlug,
    stage,
  );
  return rows[0];
}

export async function listSubmitted() {
  return prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT tenant_slug, plan, status, updated_at FROM ${TABLE} ORDER BY updated_at DESC`,
  );
}

/**
 * Apply the intake content VERBATIM into the tenant: church basics → settings,
 * staff/history/cells → content modules, and (best-effort) the home page's
 * hero / pastor-message / text-image blocks. Deterministic — uses the church's
 * own words/photos, no AI. The AI builder handles structure/design; this fills
 * the real content. Each step is isolated so one failure doesn't abort the rest.
 */
export async function applyIntake(slug: string) {
  const schema = validateSchemaName(`tenant_${slug}`);
  const intake = await getIntake(slug);
  if (!intake) throw new AppError('NOT_FOUND', 404, '입력 내용이 없습니다');
  const data = (intake.data as Record<string, Record<string, unknown> | Record<string, unknown>[]>) || {};
  const summary = { settings: 0, staff: 0, history: 0, cells: 0, blocks: 0 };

  // basics → church settings
  const b = (data.basics as Record<string, string>) || {};
  const settingsMap: Record<string, string | null> = {};
  if (b.name) settingsMap['church_name'] = b.name;
  if (b.phone) settingsMap['church_phone'] = b.phone;
  if (b.email) settingsMap['church_email'] = b.email;
  if (b.address) settingsMap['church_address'] = b.address;
  if (b.logo) settingsMap['logo_url'] = b.logo;
  if (Object.keys(settingsMap).length) {
    try { await upsertSettings(schema, settingsMap); summary.settings = Object.keys(settingsMap).length; } catch { /* skip */ }
  }

  // staff[] → staff table
  if (Array.isArray(data.staff)) {
    const list = data.staff as Record<string, string>[];
    for (let i = 0; i < list.length; i++) {
      const s = list[i]!;
      if (!s.name) continue;
      try {
        await createStaffMember(schema, {
          name: s.name, role: s.role ?? null, bio: s.bio ?? null, photoUrl: s.photo ?? null,
          department: null, email: null, phone: null, order: i, isActive: true,
        });
        summary.staff++;
      } catch { /* skip */ }
    }
  }

  // history[] → history table (one row per {year, content})
  if (Array.isArray(data.history)) {
    for (const h of data.history as Record<string, string>[]) {
      if (!h.content) continue;
      const year = parseInt(String(h.year), 10);
      try {
        await createHistory(schema, { year: Number.isFinite(year) ? year : 2000, items: [{ content: h.content }] });
        summary.history++;
      } catch { /* skip */ }
    }
  }

  // cells[] → cells table
  if (Array.isArray(data.cells)) {
    const list = data.cells as Record<string, string>[];
    for (let i = 0; i < list.length; i++) {
      const c = list[i]!;
      if (!c.name) continue;
      try {
        await createCell(schema, { name: c.name, leaderName: c.leader ?? null, location: c.meeting ?? null, sortOrder: i, isVisible: true });
        summary.cells++;
      } catch { /* skip */ }
    }
  }

  // Best-effort: fill the home page's static blocks with the verbatim content.
  try {
    const pages = await pageService.listPages(schema);
    const home = pages.find((p) => p.is_home) ?? pages[0];
    if (home) {
      const sections = await pageService.listSections(schema, home.id);
      let aboutApplied = false;
      const hero = data.hero as Record<string, string> | undefined;
      const greeting = data.greeting as Record<string, string> | undefined;
      const about = data.about as Record<string, string> | undefined;
      for (const sec of sections) {
        const props = (sec.props as Record<string, unknown>) || {};
        try {
          if (sec.block_type === 'hero_banner' && hero) {
            await pageService.updateSection(schema, home.id, sec.id, {
              props: { ...props, title: hero.title || props.title, subtitle: hero.subtitle || props.subtitle, backgroundImageUrl: hero.image || props.backgroundImageUrl },
            });
            summary.blocks++;
          } else if (sec.block_type === 'pastor_message' && greeting) {
            await pageService.updateSection(schema, home.id, sec.id, {
              props: { ...props, pastorName: greeting.pastorName || props.pastorName, message: greeting.message || props.message, imageUrl: greeting.photo || props.imageUrl },
            });
            summary.blocks++;
          } else if (sec.block_type === 'text_image' && about && !aboutApplied) {
            await pageService.updateSection(schema, home.id, sec.id, {
              props: { ...props, title: props.title || '교회 소개', content: about.intro || props.content, imageUrl: about.photo || props.imageUrl },
            });
            aboutApplied = true;
            summary.blocks++;
          }
        } catch { /* skip this block */ }
      }
    }
  } catch { /* skip block step */ }

  await setBuilt(slug);
  return summary;
}
