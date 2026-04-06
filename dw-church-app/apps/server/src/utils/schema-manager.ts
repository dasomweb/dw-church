import { prisma } from '../config/database.js';
import { validateSlug, validateSchemaName } from './validate-schema.js';

/**
 * Clone the template schema and provision default data for a new tenant.
 */
export async function createTenantSchema(slug: string): Promise<void> {
  validateSlug(slug);
  const schema = validateSchemaName(`tenant_${slug}`);

  // Clone from the template schema
  await prisma.$executeRawUnsafe(
    `SELECT clone_schema('tenant_template', '${schema}')`,
  );

  await seedDefaultData(slug);
}

/**
 * Permanently remove a tenant schema and all its data.
 */
export async function deleteTenantSchema(slug: string): Promise<void> {
  validateSlug(slug);
  const schema = validateSchemaName(`tenant_${slug}`);
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
}

/**
 * Insert default rows a new tenant needs to function.
 */
export async function seedDefaultData(slug: string): Promise<void> {
  validateSlug(slug);
  const schema = validateSchemaName(`tenant_${slug}`);

  // 1. Default sermon categories
  const categories = [
    { name: '주일설교', slug: 'sunday', sort_order: 1 },
    { name: '수요설교', slug: 'wednesday', sort_order: 2 },
    { name: '새벽설교', slug: 'dawn', sort_order: 3 },
    { name: '금요설교', slug: 'friday', sort_order: 4 },
  ];

  for (const cat of categories) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "${schema}".categories (name, slug, type, sort_order)
       VALUES ($1, $2, 'sermon', $3)
       ON CONFLICT DO NOTHING`,
      cat.name,
      cat.slug,
      cat.sort_order,
    );
  }

  // 2. Default preacher
  await prisma.$executeRawUnsafe(
    `INSERT INTO "${schema}".preachers (name, is_default)
     VALUES ('담임목사', true)
     ON CONFLICT DO NOTHING`,
  );

  // 3. Default theme
  await prisma.$executeRawUnsafe(
    `INSERT INTO "${schema}".themes (name, is_active, settings)
     VALUES ('modern', true, $1::jsonb)
     ON CONFLICT DO NOTHING`,
    JSON.stringify({
      templateName: 'modern',
      colors: { primary: '#2563eb', secondary: '#64748b', accent: '#f59e0b', background: '#ffffff', surface: '#f8fafc', text: '#0f172a' },
      fonts: { heading: 'Pretendard', body: 'Pretendard' },
      customCss: '',
    }),
  );

  // 4. Default pages — each menu item has a corresponding page
  const defaultPages = [
    { title: '홈', slug: 'home', is_home: true, sort_order: 0, sections: [
      { block_type: 'banner_slider', props: { category: 'main' } },
      { block_type: 'recent_sermons', props: { title: '최근 설교', limit: 6 } },
      { block_type: 'recent_bulletins', props: { title: '최근 주보', limit: 3 } },
      { block_type: 'event_grid', props: { title: '교회 행사', limit: 4 } },
      { block_type: 'staff_grid', props: { title: '교역자', limit: 8 } },
    ]},
    { title: '설교', slug: 'sermons', is_home: false, sort_order: 1, sections: [
      { block_type: 'hero_banner', props: { title: '설교', subtitle: '말씀을 통해 은혜를 나눕니다' } },
      { block_type: 'recent_sermons', props: { limit: 12 } },
    ]},
    { title: '주보', slug: 'bulletins', is_home: false, sort_order: 2, sections: [
      { block_type: 'hero_banner', props: { title: '주보', subtitle: '매주 교회 소식을 전합니다' } },
      { block_type: 'recent_bulletins', props: { limit: 12 } },
    ]},
    { title: '앨범', slug: 'albums', is_home: false, sort_order: 3, sections: [
      { block_type: 'hero_banner', props: { title: '앨범', subtitle: '교회의 아름다운 순간들' } },
      { block_type: 'album_gallery', props: { limit: 12 } },
    ]},
    { title: '행사', slug: 'events', is_home: false, sort_order: 4, sections: [
      { block_type: 'hero_banner', props: { title: '행사', subtitle: '함께하는 교회 행사' } },
      { block_type: 'event_grid', props: { limit: 12 } },
    ]},
    { title: '교역자', slug: 'staff', is_home: false, sort_order: 5, sections: [
      { block_type: 'hero_banner', props: { title: '교역자', subtitle: '섬기는 사람들' } },
      { block_type: 'staff_grid', props: { limit: 12 } },
    ]},
    { title: '칼럼', slug: 'columns', is_home: false, sort_order: 6, sections: [
      { block_type: 'hero_banner', props: { title: '칼럼', subtitle: '목회자의 글' } },
      { block_type: 'text_only', props: { title: '칼럼' } },
    ]},
    { title: '연혁', slug: 'history', is_home: false, sort_order: 7, sections: [
      { block_type: 'hero_banner', props: { title: '교회 연혁', subtitle: '하나님과 함께 걸어온 길' } },
      { block_type: 'history_timeline', props: {} },
    ]},
  ];

  for (const page of defaultPages) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "${schema}".pages (title, slug, is_home, status, sort_order)
       VALUES ($1, $2, $3, 'published', $4)
       ON CONFLICT DO NOTHING`,
      page.title, page.slug, page.is_home, page.sort_order,
    );

    const pageRows = await prisma.$queryRawUnsafe<[{ id: string }]>(
      `SELECT id FROM "${schema}".pages WHERE slug = $1 LIMIT 1`, page.slug,
    );
    const pageId = pageRows[0]?.id;
    if (pageId) {
      for (let i = 0; i < page.sections.length; i++) {
        const sec = page.sections[i];
        await prisma.$executeRawUnsafe(
          `INSERT INTO "${schema}".page_sections (page_id, block_type, props, sort_order, is_visible)
           VALUES ($1::uuid, $2, $3::jsonb, $4, true)
           ON CONFLICT DO NOTHING`,
          pageId, sec.block_type, JSON.stringify(sec.props), i,
        );
      }
    }
  }

  // 6. Default menu items (matches dynamic content pages)
  const menus = [
    { label: '홈', url: '/', sort_order: 0 },
    { label: '설교', url: '/sermons', sort_order: 1 },
    { label: '주보', url: '/bulletins', sort_order: 2 },
    { label: '앨범', url: '/albums', sort_order: 3 },
    { label: '행사', url: '/events', sort_order: 4 },
    { label: '교역자', url: '/staff', sort_order: 5 },
    { label: '칼럼', url: '/columns', sort_order: 6 },
    { label: '연혁', url: '/history', sort_order: 7 },
  ];

  for (const menu of menus) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "${schema}".menus (label, external_url, sort_order, is_visible)
       VALUES ($1, $2, $3, true)
       ON CONFLICT DO NOTHING`,
      menu.label,
      menu.url,
      menu.sort_order,
    );
  }

  // 7. Default settings
  const settings = [
    { key: 'church_name', value: '' },
    { key: 'church_address', value: '' },
    { key: 'church_phone', value: '' },
    { key: 'church_email', value: '' },
  ];

  for (const s of settings) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "${schema}".settings (key, value)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      s.key,
      s.value,
    );
  }
}
