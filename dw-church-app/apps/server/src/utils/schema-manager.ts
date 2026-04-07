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

  // 4. Default pages — standard Korean church website structure
  const heroBanner = (title: string, subtitle: string) => ({
    block_type: 'hero_banner', props: { title, subtitle, height: 'md', textAlign: 'center', layout: 'full' },
  });

  const defaultPages = [
    // ─── Home ───
    { title: '홈', slug: 'home', is_home: true, sort_order: 0, sections: [
      { block_type: 'banner_slider', props: { category: 'main' } },
      { block_type: 'recent_sermons', props: { title: '최근 설교', limit: 4, variant: 'grid-4' } },
      { block_type: 'event_grid', props: { title: '교회 행사', limit: 4, variant: 'cards-4' } },
    ]},
    // ─── 교회안내 ───
    { title: '환영인사말', slug: 'welcome', is_home: false, sort_order: 1, sections: [
      heroBanner('환영인사말', '사랑과 은혜가 넘치는 교회'),
      { block_type: 'pastor_message', props: { title: '담임목사 인사' } },
    ]},
    { title: '교회비전', slug: 'vision', is_home: false, sort_order: 2, sections: [
      heroBanner('교회비전', '하나님의 뜻을 이루어가는 교회'),
      { block_type: 'mission_vision', props: { title: '비전과 사명' } },
    ]},
    { title: '교회연혁', slug: 'history', is_home: false, sort_order: 3, sections: [
      heroBanner('교회연혁', '하나님과 함께 걸어온 길'),
      { block_type: 'history_timeline', props: { title: '연혁' } },
    ]},
    { title: '섬기는사람들', slug: 'staff', is_home: false, sort_order: 4, sections: [
      heroBanner('섬기는사람들', '함께 섬기는 사역자들'),
      { block_type: 'staff_grid', props: { title: '교역자', limit: 20, variant: 'grid-4' } },
    ]},
    { title: '오시는 길', slug: 'directions', is_home: false, sort_order: 5, sections: [
      heroBanner('오시는 길', '교회 위치 안내'),
      { block_type: 'location_map', props: { title: '약도' } },
      { block_type: 'contact_info', props: { title: '연락처' } },
    ]},
    // ─── 예배 및 모임 ───
    { title: '예배안내', slug: 'worship', is_home: false, sort_order: 6, sections: [
      heroBanner('예배 및 모임안내', '하나님께 드리는 예배'),
      { block_type: 'worship_times', props: { title: '주일예배 / 주일성경공부 및 모임', services: [] } },
      { block_type: 'worship_times', props: { title: '주중예배 및 모임', services: [] } },
    ]},
    // ─── 설교 | 칼럼 ───
    { title: '설교', slug: 'sermons', is_home: false, sort_order: 7, sections: [
      heroBanner('설교', '말씀을 통해 은혜를 나눕니다'),
      { block_type: 'recent_sermons', props: { limit: 12, variant: 'grid-4' } },
    ]},
    { title: '목회칼럼', slug: 'columns', is_home: false, sort_order: 8, sections: [
      heroBanner('목회칼럼', '목사님의 글을 통해 은혜를 나눕니다'),
      { block_type: 'text_only', props: { title: '칼럼' } },
    ]},
    // ─── 교육 ───
    { title: '교육부', slug: 'education', is_home: false, sort_order: 9, sections: [
      heroBanner('교육부', '다음 세대를 세우는 교육'),
      { block_type: 'text_image', props: { title: '교육부 소개' } },
    ]},
    // ─── 선교 ───
    { title: '선교', slug: 'mission', is_home: false, sort_order: 10, sections: [
      heroBanner('선교', '세계를 품는 선교'),
      { block_type: 'text_only', props: { title: '선교 사역' } },
    ]},
    // ─── 교회소식 ───
    { title: '교회소식', slug: 'news', is_home: false, sort_order: 11, sections: [
      heroBanner('교회소식', '교회의 다양한 소식'),
      { block_type: 'recent_bulletins', props: { title: '주보', limit: 12, variant: 'grid-4' } },
    ]},
    { title: '포토갤러리', slug: 'albums', is_home: false, sort_order: 12, sections: [
      heroBanner('포토갤러리', '교회의 아름다운 순간들'),
      { block_type: 'album_gallery', props: { limit: 12, variant: 'grid-4' } },
    ]},
    { title: '행사', slug: 'events', is_home: false, sort_order: 13, sections: [
      heroBanner('행사', '함께하는 교회 행사'),
      { block_type: 'event_grid', props: { limit: 12, variant: 'cards-4' } },
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
        const sec = page.sections[i]!;
        await prisma.$executeRawUnsafe(
          `INSERT INTO "${schema}".page_sections (page_id, block_type, props, sort_order, is_visible)
           VALUES ($1::uuid, $2, $3::jsonb, $4, true)
           ON CONFLICT DO NOTHING`,
          pageId, sec.block_type, JSON.stringify(sec.props), i,
        );
      }
    }
  }

  // 6. Default menu items — standard Korean church navigation (3 levels)
  // Helper to get page_id by slug
  const getPageId = async (pageSlug: string): Promise<string | null> => {
    const rows = await prisma.$queryRawUnsafe<[{ id: string }]>(
      `SELECT id FROM "${schema}".pages WHERE slug = $1 LIMIT 1`, pageSlug,
    );
    return rows[0]?.id ?? null;
  };

  const insertMenu = async (label: string, pageSlug: string | null, parentId: string | null, sortOrder: number): Promise<string> => {
    const pageId = pageSlug ? await getPageId(pageSlug) : null;
    const rows = await prisma.$queryRawUnsafe<[{ id: string }]>(
      `INSERT INTO "${schema}".menus (label, page_id, parent_id, sort_order, is_visible)
       VALUES ($1, $2::uuid, $3::uuid, $4, true)
       RETURNING id`,
      label, pageId, parentId, sortOrder,
    );
    return rows[0]!.id;
  };

  // 1단계: 메인 메뉴
  const menuChurchInfo = await insertMenu('교회안내', null, null, 0);
  await insertMenu('예배 및 모임', 'worship', null, 1);
  const menuSermonCol = await insertMenu('설교 | 칼럼', null, null, 2);
  await insertMenu('교육', 'education', null, 3);
  await insertMenu('선교', 'mission', null, 4);
  const menuNews = await insertMenu('교회소식', null, null, 5);

  // 2단계: 교회안내 하위
  await insertMenu('환영인사말', 'welcome', menuChurchInfo, 0);
  await insertMenu('교회비전', 'vision', menuChurchInfo, 1);
  await insertMenu('교회연혁', 'history', menuChurchInfo, 2);
  await insertMenu('섬기는사람들', 'staff', menuChurchInfo, 3);
  await insertMenu('오시는 길', 'directions', menuChurchInfo, 4);

  // 2단계: 설교 | 칼럼 하위
  await insertMenu('설교', 'sermons', menuSermonCol, 0);
  await insertMenu('목회칼럼', 'columns', menuSermonCol, 1);

  // 2단계: 교회소식 하위
  await insertMenu('교회소식', 'news', menuNews, 0);
  await insertMenu('포토갤러리', 'albums', menuNews, 1);
  await insertMenu('행사', 'events', menuNews, 2);

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
