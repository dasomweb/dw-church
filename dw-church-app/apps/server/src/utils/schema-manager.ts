import { prisma } from '../config/database.js';

/**
 * Clone the template schema and provision default data for a new tenant.
 */
export async function createTenantSchema(slug: string): Promise<void> {
  const schema = `tenant_${slug}`;

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
  const schema = `tenant_${slug}`;
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
}

/**
 * Insert default rows a new tenant needs to function.
 */
export async function seedDefaultData(slug: string): Promise<void> {
  const schema = `tenant_${slug}`;

  // 1. Sermon categories
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
    `INSERT INTO "${schema}".preachers (name, title, is_default)
     VALUES ('담임목사', '담임목사', true)
     ON CONFLICT DO NOTHING`,
  );

  // 3. Default theme
  await prisma.$executeRawUnsafe(
    `INSERT INTO "${schema}".themes (name, is_active, settings)
     VALUES ('default', true, '{}')
     ON CONFLICT DO NOTHING`,
  );

  // 4. Default home page with sections
  await prisma.$executeRawUnsafe(
    `INSERT INTO "${schema}".pages (title, slug, is_home, is_published, sections)
     VALUES ('홈', 'home', true, true, $1::jsonb)
     ON CONFLICT DO NOTHING`,
    JSON.stringify([
      { type: 'hero', title: '환영합니다', sort_order: 1 },
      { type: 'sermons', title: '최근 설교', count: 4, sort_order: 2 },
      { type: 'bulletins', title: '주보', count: 1, sort_order: 3 },
      { type: 'events', title: '교회 소식', count: 3, sort_order: 4 },
    ]),
  );

  // 5. Default menu items
  const menus = [
    { label: '설교', path: '/sermons', sort_order: 1 },
    { label: '주보', path: '/bulletins', sort_order: 2 },
    { label: '교회 소식', path: '/events', sort_order: 3 },
    { label: '갤러리', path: '/albums', sort_order: 4 },
  ];

  for (const menu of menus) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "${schema}".menus (label, path, sort_order, is_visible)
       VALUES ($1, $2, $3, true)
       ON CONFLICT DO NOTHING`,
      menu.label,
      menu.path,
      menu.sort_order,
    );
  }
}
