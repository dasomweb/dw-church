/**
 * Predefined page templates for the page builder.
 *
 * Each template defines a list of sections (blockType + default props)
 * that can be stamped out to quickly create a full page.
 */

export interface TemplateSection {
  blockType: string;
  props: Record<string, unknown>;
}

export interface PageTemplate {
  label: string;
  description: string;
  sections: TemplateSection[];
}

export const PAGE_TEMPLATES: Record<string, PageTemplate> = {
  home: {
    label: '홈페이지',
    description: '메인 홈페이지 (배너 + 최근 설교 + 주보 + 행사)',
    sections: [
      { blockType: 'hero_banner', props: { title: '환영합니다', subtitle: '사랑과 은혜가 넘치는 교회' } },
      { blockType: 'recent_sermons', props: { limit: 4 } },
      { blockType: 'recent_bulletins', props: { limit: 3 } },
      { blockType: 'event_grid', props: { limit: 3 } },
      { blockType: 'contact_info', props: {} },
    ],
  },

  about: {
    label: '교회소개',
    description: '교회 소개 페이지 (인사말 + 비전 + 예배안내)',
    sections: [
      { blockType: 'text_image', props: { title: '담임목사 인사말', content: '<p>...</p>', layout: 'right' } },
      { blockType: 'text_only', props: { title: '교회 비전', content: '<p>...</p>' } },
      {
        blockType: 'worship_schedule',
        props: {
          services: [
            { name: '주일예배', time: '오전 11:00', location: '본당' },
            { name: '수요예배', time: '오후 7:30', location: '본당' },
            { name: '금요기도회', time: '오후 8:00', location: '기도실' },
            { name: '새벽기도회', time: '오전 6:00', location: '본당' },
          ],
        },
      },
      { blockType: 'location_map', props: { address: '교회 주소를 입력하세요' } },
    ],
  },

  welcome: {
    label: '새가족 안내',
    description: '새가족 환영 페이지',
    sections: [
      { blockType: 'hero_banner', props: { title: '새가족을 환영합니다', subtitle: '함께 예배하고 함께 성장하는 공동체' } },
      {
        blockType: 'newcomer_info',
        props: {
          title: '처음 오신 분들을 환영합니다',
          content:
            '<p>저희 교회를 처음 방문해 주셔서 감사합니다. 편안한 마음으로 예배에 참여해 주세요.</p>' +
            '<h3>예배 시간</h3><p>주일예배: 오전 11시</p>' +
            '<h3>주차 안내</h3><p>교회 건물 뒤편 주차장을 이용해 주세요.</p>' +
            '<h3>어린이 프로그램</h3><p>주일학교가 주일예배 시간에 함께 진행됩니다.</p>',
        },
      },
      { blockType: 'staff_grid', props: { limit: 4 } },
      { blockType: 'contact_info', props: {} },
    ],
  },

  sermons: {
    label: '설교 페이지',
    description: '설교 전용 페이지',
    sections: [
      { blockType: 'recent_sermons', props: { limit: 12 } },
    ],
  },

  gallery: {
    label: '갤러리',
    description: '사진/앨범 갤러리 페이지',
    sections: [
      { blockType: 'album_gallery', props: { limit: 12 } },
    ],
  },

  ministries: {
    label: '사역 소개',
    description: '교회 사역/부서 소개',
    sections: [
      { blockType: 'text_only', props: { title: '교회 사역', content: '<p>우리 교회는 다양한 사역을 통해 하나님의 나라를 세워갑니다.</p>' } },
      { blockType: 'text_image', props: { title: '예배부', content: '<p>주일예배, 수요예배, 새벽기도회를 준비하고 섬기는 사역입니다.</p>', layout: 'left' } },
      { blockType: 'text_image', props: { title: '교육부', content: '<p>유아부, 유치부, 초등부, 중고등부, 청년부의 교육을 담당합니다.</p>', layout: 'right' } },
      { blockType: 'text_image', props: { title: '선교부', content: '<p>국내외 선교 사역을 기획하고 실행합니다.</p>', layout: 'left' } },
      { blockType: 'staff_grid', props: { limit: 8 } },
    ],
  },

  contact: {
    label: '오시는 길',
    description: '연락처 + 지도 페이지',
    sections: [
      { blockType: 'location_map', props: { address: '교회 주소를 입력하세요' } },
      { blockType: 'contact_info', props: {} },
    ],
  },

  history_page: {
    label: '교회 연혁',
    description: '교회 역사 타임라인',
    sections: [
      { blockType: 'text_only', props: { title: '교회 연혁', content: '<p>하나님의 인도하심 가운데 걸어온 우리 교회의 발자취입니다.</p>' } },
      { blockType: 'history_timeline', props: {} },
    ],
  },
};

/** Return all templates as { key, label, description, sectionCount } */
export function getAllTemplates() {
  return Object.entries(PAGE_TEMPLATES).map(([key, t]) => ({
    key,
    label: t.label,
    description: t.description,
    sectionCount: t.sections.length,
  }));
}

/** Return a single template by key, or undefined if not found */
export function getTemplate(name: string): PageTemplate | undefined {
  return PAGE_TEMPLATES[name];
}
