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

  // 4. Default home page
  await prisma.$executeRawUnsafe(
    `INSERT INTO "${schema}".pages (title, slug, is_home, status, sort_order)
     VALUES ('홈', 'home', true, 'published', 0)
     ON CONFLICT DO NOTHING`,
  );

  // Get the home page ID for sections
  const pages = await prisma.$queryRawUnsafe<[{ id: string }]>(
    `SELECT id FROM "${schema}".pages WHERE slug = 'home' LIMIT 1`,
  );
  const homePageId = pages[0]?.id;

  if (homePageId) {
    // 5. Default home page sections
    const sections = [
      { block_type: 'hero_banner', props: { message: '환영합니다' }, sort_order: 0 },
      { block_type: 'recent_sermons', props: { limit: 6 }, sort_order: 1 },
      { block_type: 'recent_bulletins', props: { limit: 3 }, sort_order: 2 },
      { block_type: 'event_grid', props: { limit: 4 }, sort_order: 3 },
      { block_type: 'staff_grid', props: { limit: 8 }, sort_order: 4 },
    ];

    for (const sec of sections) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "${schema}".page_sections (page_id, block_type, props, sort_order, is_visible)
         VALUES ($1, $2, $3::jsonb, $4, true)
         ON CONFLICT DO NOTHING`,
        homePageId,
        sec.block_type,
        JSON.stringify(sec.props),
        sec.sort_order,
      );
    }
  }

  // 6. Default menu items
  const menus = [
    { label: '교회소개', url: '/about', sort_order: 0 },
    { label: '설교', url: '/sermons', sort_order: 1 },
    { label: '주보', url: '/bulletins', sort_order: 2 },
    { label: '갤러리', url: '/albums', sort_order: 3 },
    { label: '교회소식', url: '/events', sort_order: 4 },
    { label: '섬기는 사람들', url: '/staff', sort_order: 5 },
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
