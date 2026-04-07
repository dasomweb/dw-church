import { prisma } from '../config/database.js';
import { validateSlug, validateSchemaName } from './validate-schema.js';

/**
 * Clone the template schema and provision default data for a new tenant.
 */
export async function createTenantSchema(slug: string, churchName?: string): Promise<void> {
  validateSlug(slug);
  const schema = validateSchemaName(`tenant_${slug}`);

  // Clone from the template schema
  await prisma.$executeRawUnsafe(
    `SELECT clone_schema('tenant_template', '${schema}')`,
  );

  await seedDefaultData(slug, churchName);
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
export async function seedDefaultData(slug: string, churchName?: string): Promise<void> {
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

  let order = 0;
  const defaultPages = [
    // ─── Home ───
    { title: '홈', slug: 'home', is_home: true, sort_order: order++, sections: [
      { block_type: 'banner_slider', props: { category: 'main' } },
      { block_type: 'recent_sermons', props: { title: '최근 설교', limit: 4, variant: 'grid-4' } },
      { block_type: 'recent_bulletins', props: { title: '최근 주보', limit: 4, variant: 'grid-4' } },
      { block_type: 'event_grid', props: { title: '교회 행사', limit: 4, variant: 'cards-4' } },
      { block_type: 'album_gallery', props: { title: '포토갤러리', limit: 4, variant: 'grid-4' } },
    ]},

    // ─── 교회안내 ───
    { title: '환영인사말', slug: 'welcome', is_home: false, sort_order: order++, sections: [
      heroBanner('환영인사말', '사랑과 은혜가 넘치는 교회'),
      { block_type: 'pastor_message', props: { title: '담임목사 인사' } },
    ]},
    { title: '교회비전', slug: 'vision', is_home: false, sort_order: order++, sections: [
      heroBanner('교회비전', '하나님의 뜻을 이루어가는 교회'),
      { block_type: 'mission_vision', props: { title: '비전과 사명' } },
    ]},
    { title: '교회연혁', slug: 'history', is_home: false, sort_order: order++, sections: [
      heroBanner('교회연혁', '하나님과 함께 걸어온 길'),
      { block_type: 'history_timeline', props: { title: '연혁' } },
    ]},
    { title: '섬기는사람들', slug: 'staff', is_home: false, sort_order: order++, sections: [
      heroBanner('섬기는사람들', '함께 섬기는 사역자들'),
      { block_type: 'staff_grid', props: { title: '교역자', limit: 20, variant: 'grid-4' } },
    ]},
    { title: '오시는 길', slug: 'directions', is_home: false, sort_order: order++, sections: [
      heroBanner('오시는 길', '교회 위치 안내'),
      { block_type: 'location_map', props: { title: '약도' } },
      { block_type: 'contact_info', props: { title: '연락처' } },
    ]},

    // ─── 예배 및 모임 ───
    { title: '예배안내', slug: 'worship', is_home: false, sort_order: order++, sections: [
      heroBanner('예배 및 모임안내', '하나님께 드리는 예배'),
      { block_type: 'worship_times', props: { title: '주일예배 / 주일성경공부 및 모임', services: [] } },
      { block_type: 'worship_times', props: { title: '주중예배 및 모임', services: [] } },
    ]},

    // ─── 설교 | 칼럼 ───
    { title: '설교', slug: 'sermons', is_home: false, sort_order: order++, sections: [
      heroBanner('설교', '말씀을 통해 은혜를 나눕니다'),
      { block_type: 'recent_sermons', props: { limit: 12, variant: 'grid-4' } },
    ]},
    { title: '목회칼럼', slug: 'columns', is_home: false, sort_order: order++, sections: [
      heroBanner('목회칼럼', '목사님의 글을 통해 은혜를 나눕니다'),
      { block_type: 'text_only', props: { title: '칼럼' } },
    ]},

    // ─── 교육 (부서별 하위 페이지) ───
    // 각 부서: 소개 + 담당교역자 + 갤러리 + 게시판
    { title: '영유아부', slug: 'edu-infant', is_home: false, sort_order: order++, sections: [
      heroBanner('영유아부', '사랑으로 키우는 믿음의 씨앗'),
      { block_type: 'text_image', props: { title: '영유아부 소개' } },
      { block_type: 'staff_grid', props: { title: '섬기는 분들', department: 'edu-infant', limit: 10, variant: 'grid-4' } },
      { block_type: 'album_gallery', props: { title: '활동 사진', limit: 8, variant: 'grid-4' } },
      { block_type: 'board', props: { title: '영유아부 게시판', boardSlug: 'edu-infant' } },
    ]},
    { title: '유초등부', slug: 'edu-children', is_home: false, sort_order: order++, sections: [
      heroBanner('유초등부', '하나님의 자녀로 자라나는 아이들'),
      { block_type: 'text_image', props: { title: '유초등부 소개' } },
      { block_type: 'staff_grid', props: { title: '섬기는 분들', department: 'edu-children', limit: 10, variant: 'grid-4' } },
      { block_type: 'album_gallery', props: { title: '활동 사진', limit: 8, variant: 'grid-4' } },
      { block_type: 'board', props: { title: '유초등부 게시판', boardSlug: 'edu-children' } },
    ]},
    { title: '중고등부', slug: 'edu-youth', is_home: false, sort_order: order++, sections: [
      heroBanner('중고등부', '믿음 위에 세워가는 청소년'),
      { block_type: 'text_image', props: { title: '중고등부 소개' } },
      { block_type: 'staff_grid', props: { title: '섬기는 분들', department: 'edu-youth', limit: 10, variant: 'grid-4' } },
      { block_type: 'album_gallery', props: { title: '활동 사진', limit: 8, variant: 'grid-4' } },
      { block_type: 'board', props: { title: '중고등부 게시판', boardSlug: 'edu-youth' } },
    ]},
    { title: '대학부', slug: 'edu-college', is_home: false, sort_order: order++, sections: [
      heroBanner('대학부', '캠퍼스에서 빛나는 믿음'),
      { block_type: 'text_image', props: { title: '대학부 소개' } },
      { block_type: 'staff_grid', props: { title: '섬기는 분들', department: 'edu-college', limit: 10, variant: 'grid-4' } },
      { block_type: 'album_gallery', props: { title: '활동 사진', limit: 8, variant: 'grid-4' } },
      { block_type: 'board', props: { title: '대학부 게시판', boardSlug: 'edu-college' } },
    ]},
    { title: '청년부', slug: 'edu-youngadult', is_home: false, sort_order: order++, sections: [
      heroBanner('청년부', '세상 속에서 하나님과 동행하는 청년'),
      { block_type: 'text_image', props: { title: '청년부 소개' } },
      { block_type: 'staff_grid', props: { title: '섬기는 분들', department: 'edu-youngadult', limit: 10, variant: 'grid-4' } },
      { block_type: 'album_gallery', props: { title: '활동 사진', limit: 8, variant: 'grid-4' } },
      { block_type: 'board', props: { title: '청년부 게시판', boardSlug: 'edu-youngadult' } },
    ]},
    { title: 'English Ministry', slug: 'edu-english', is_home: false, sort_order: order++, sections: [
      heroBanner('English Ministry', 'Worship and fellowship in English'),
      { block_type: 'text_image', props: { title: 'English Ministry' } },
      { block_type: 'staff_grid', props: { title: 'Ministry Team', department: 'edu-english', limit: 10, variant: 'grid-4' } },
      { block_type: 'album_gallery', props: { title: 'Photo Gallery', limit: 8, variant: 'grid-4' } },
      { block_type: 'board', props: { title: 'English Ministry Board', boardSlug: 'edu-english' } },
    ]},
    { title: '시니어', slug: 'edu-senior', is_home: false, sort_order: order++, sections: [
      heroBanner('시니어', '은혜로운 동행의 세월'),
      { block_type: 'text_image', props: { title: '시니어 소개' } },
      { block_type: 'staff_grid', props: { title: '섬기는 분들', department: 'edu-senior', limit: 10, variant: 'grid-4' } },
      { block_type: 'album_gallery', props: { title: '활동 사진', limit: 8, variant: 'grid-4' } },
      { block_type: 'board', props: { title: '시니어 게시판', boardSlug: 'edu-senior' } },
    ]},

    // ─── 선교 ───
    { title: '선교사역', slug: 'mission-work', is_home: false, sort_order: order++, sections: [
      heroBanner('선교사역', '세계를 품는 선교'),
      { block_type: 'text_image', props: { title: '선교 사역 소개' } },
      { block_type: 'staff_grid', props: { title: '선교사', department: 'mission', limit: 20, variant: 'grid-4' } },
      { block_type: 'album_gallery', props: { title: '선교 갤러리', limit: 8, variant: 'grid-4' } },
    ]},
    { title: '선교편지', slug: 'mission-letters', is_home: false, sort_order: order++, sections: [
      heroBanner('선교편지', '선교지에서 보내는 소식'),
      { block_type: 'board', props: { title: '선교편지', boardSlug: 'mission-letters' } },
    ]},

    // ─── 새가족 ───
    { title: '새가족 안내', slug: 'newcomer-info', is_home: false, sort_order: order++, sections: [
      heroBanner('새가족 안내', '새가족을 환영합니다'),
      { block_type: 'newcomer_info', props: { title: '새가족 안내' } },
      { block_type: 'worship_times', props: { title: '예배 시간 안내', services: [] } },
      { block_type: 'location_map', props: { title: '오시는 길' } },
      { block_type: 'contact_info', props: { title: '연락처' } },
    ]},
    { title: '새가족 등록신청', slug: 'newcomer-register', is_home: false, sort_order: order++, sections: [
      heroBanner('새가족 등록신청', '등록을 통해 교회 가족이 되세요'),
      { block_type: 'contact_form', props: { title: '새가족 등록신청' } },
    ]},

    // ─── 목장 ───
    { title: '목장교회 소개', slug: 'smallgroup-intro', is_home: false, sort_order: order++, sections: [
      heroBanner('목장교회', '함께 나누고 성장하는 소그룹'),
      { block_type: 'text_image', props: { title: '목장교회 소개' } },
      { block_type: 'album_gallery', props: { title: '목장 활동 사진', limit: 8, variant: 'grid-4' } },
    ]},
    { title: '목자/목녀', slug: 'smallgroup-leaders', is_home: false, sort_order: order++, sections: [
      heroBanner('목자/목녀', '목장을 섬기는 리더들'),
      { block_type: 'staff_grid', props: { title: '목자/목녀', limit: 30, variant: 'grid-4', department: 'smallgroup' } },
    ]},
    { title: '목장 게시판', slug: 'smallgroup-board', is_home: false, sort_order: order++, sections: [
      heroBanner('목장 게시판', '목장 소식과 나눔'),
      { block_type: 'board', props: { title: '목장 게시판', boardSlug: 'smallgroup' } },
    ]},

    // ─── 교회소식 ───
    { title: '교회주보', slug: 'bulletins', is_home: false, sort_order: order++, sections: [
      heroBanner('교회주보', '한 주간의 교회 소식'),
      { block_type: 'recent_bulletins', props: { title: '교회주보', limit: 12, variant: 'grid-4' } },
    ]},
    { title: '교회소식', slug: 'news', is_home: false, sort_order: order++, sections: [
      heroBanner('교회소식', '교회의 다양한 소식'),
      { block_type: 'event_grid', props: { title: '교회소식', limit: 12, variant: 'cards-4' } },
    ]},
    { title: '포토갤러리', slug: 'albums', is_home: false, sort_order: order++, sections: [
      heroBanner('포토갤러리', '교회의 아름다운 순간들'),
      { block_type: 'album_gallery', props: { limit: 12, variant: 'grid-4' } },
    ]},
    { title: '행사', slug: 'events', is_home: false, sort_order: order++, sections: [
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
  const menuEducation = await insertMenu('교육', null, null, 3);
  const menuMission = await insertMenu('선교', null, null, 4);
  const menuNewcomer = await insertMenu('새가족', null, null, 5);
  const menuSmallGroup = await insertMenu('목장', null, null, 6);
  const menuNews = await insertMenu('교회소식', null, null, 7);

  // 2단계: 교회안내 하위
  await insertMenu('환영인사말', 'welcome', menuChurchInfo, 0);
  await insertMenu('교회비전', 'vision', menuChurchInfo, 1);
  await insertMenu('교회연혁', 'history', menuChurchInfo, 2);
  await insertMenu('섬기는사람들', 'staff', menuChurchInfo, 3);
  await insertMenu('오시는 길', 'directions', menuChurchInfo, 4);

  // 2단계: 설교 | 칼럼 하위
  await insertMenu('설교', 'sermons', menuSermonCol, 0);
  await insertMenu('목회칼럼', 'columns', menuSermonCol, 1);

  // 2단계: 교육 하위
  await insertMenu('영유아부', 'edu-infant', menuEducation, 0);
  await insertMenu('유초등부', 'edu-children', menuEducation, 1);
  await insertMenu('중고등부', 'edu-youth', menuEducation, 2);
  await insertMenu('대학부', 'edu-college', menuEducation, 3);
  await insertMenu('청년부', 'edu-youngadult', menuEducation, 4);
  await insertMenu('English Ministry', 'edu-english', menuEducation, 5);
  await insertMenu('시니어', 'edu-senior', menuEducation, 6);

  // 2단계: 선교 하위
  await insertMenu('선교사역', 'mission-work', menuMission, 0);
  await insertMenu('선교편지', 'mission-letters', menuMission, 1);

  // 2단계: 새가족 하위
  await insertMenu('새가족 안내', 'newcomer-info', menuNewcomer, 0);
  await insertMenu('새가족 등록신청', 'newcomer-register', menuNewcomer, 1);

  // 2단계: 목장 하위
  await insertMenu('목장교회 소개', 'smallgroup-intro', menuSmallGroup, 0);
  await insertMenu('목자/목녀', 'smallgroup-leaders', menuSmallGroup, 1);
  await insertMenu('목장 게시판', 'smallgroup-board', menuSmallGroup, 2);

  // 2단계: 교회소식 하위
  await insertMenu('교회주보', 'bulletins', menuNews, 0);
  await insertMenu('교회소식', 'news', menuNews, 1);
  await insertMenu('포토갤러리', 'albums', menuNews, 2);
  await insertMenu('행사', 'events', menuNews, 3);

  // 7. Default settings
  const settings = [
    { key: 'church_name', value: churchName || '' },
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
