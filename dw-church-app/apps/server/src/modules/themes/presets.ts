/**
 * Template presets: color + font + layout combinations for each template.
 * When a template is selected, these values are applied as defaults.
 */

export interface TemplatePreset {
  name: string;
  label: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  layout: {
    headerStyle: 'default' | 'centered' | 'transparent' | 'dark';
    heroStyle: 'full' | 'split' | 'minimal' | 'overlay' | 'none';
    contentWidth: 'narrow' | 'default' | 'wide' | 'full';
    cardStyle: 'shadow' | 'border' | 'flat' | 'elevated';
    footerStyle: 'default' | 'minimal' | 'centered' | 'dark';
    borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl';
    sermonGrid: 2 | 3 | 4;
  };
}

export const templatePresets: Record<string, TemplatePreset> = {
  modern: {
    name: 'modern',
    label: '모던',
    description: '깔끔하고 현대적인 디자인. 파란 계열 액센트와 넉넉한 여백.',
    colors: {
      primary: '#2563eb',
      secondary: '#64748b',
      accent: '#f59e0b',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#0f172a',
    },
    fonts: {
      heading: 'Pretendard',
      body: 'Pretendard',
    },
    layout: {
      headerStyle: 'default',
      heroStyle: 'full',
      contentWidth: 'default',
      cardStyle: 'shadow',
      footerStyle: 'default',
      borderRadius: 'lg',
      sermonGrid: 4,
    },
  },

  classic: {
    name: 'classic',
    label: '클래식',
    description: '격식 있고 전통적인 느낌. 네이비와 골드 조합.',
    colors: {
      primary: '#1e3a5f',
      secondary: '#6b7280',
      accent: '#b8860b',
      background: '#fefefe',
      surface: '#f5f3ef',
      text: '#1a1a1a',
    },
    fonts: {
      heading: 'Noto Serif KR',
      body: 'Noto Sans KR',
    },
    layout: {
      headerStyle: 'default',
      heroStyle: 'split',
      contentWidth: 'default',
      cardStyle: 'border',
      footerStyle: 'dark',
      borderRadius: 'sm',
      sermonGrid: 3,
    },
  },

  minimal: {
    name: 'minimal',
    label: '미니멀',
    description: '극도로 심플한 흑백 디자인. 콘텐츠에 집중.',
    colors: {
      primary: '#111111',
      secondary: '#737373',
      accent: '#111111',
      background: '#ffffff',
      surface: '#fafafa',
      text: '#171717',
    },
    fonts: {
      heading: 'Pretendard',
      body: 'Pretendard',
    },
    layout: {
      headerStyle: 'centered',
      heroStyle: 'minimal',
      contentWidth: 'narrow',
      cardStyle: 'flat',
      footerStyle: 'minimal',
      borderRadius: 'none',
      sermonGrid: 3,
    },
  },

  warm: {
    name: 'warm',
    label: '따뜻한',
    description: '따뜻한 톤의 편안한 디자인. 브라운과 오렌지 계열.',
    colors: {
      primary: '#b45309',
      secondary: '#78716c',
      accent: '#ea580c',
      background: '#fffbf5',
      surface: '#fef3e2',
      text: '#292524',
    },
    fonts: {
      heading: 'Noto Sans KR',
      body: 'Noto Sans KR',
    },
    layout: {
      headerStyle: 'default',
      heroStyle: 'overlay',
      contentWidth: 'default',
      cardStyle: 'elevated',
      footerStyle: 'default',
      borderRadius: 'xl',
      sermonGrid: 3,
    },
  },

  formal: {
    name: 'formal',
    label: '포멀',
    description: '장로교/감리교 스타일의 격식 있는 디자인. 진한 색상.',
    colors: {
      primary: '#7c2d12',
      secondary: '#57534e',
      accent: '#a16207',
      background: '#fafaf9',
      surface: '#f5f5f4',
      text: '#1c1917',
    },
    fonts: {
      heading: 'Noto Serif KR',
      body: 'Noto Sans KR',
    },
    layout: {
      headerStyle: 'dark',
      heroStyle: 'full',
      contentWidth: 'default',
      cardStyle: 'border',
      footerStyle: 'dark',
      borderRadius: 'sm',
      sermonGrid: 4,
    },
  },

  dark: {
    name: 'dark',
    label: '다크',
    description: '어두운 배경의 세련된 디자인. 야간 모드 느낌.',
    colors: {
      primary: '#60a5fa',
      secondary: '#94a3b8',
      accent: '#fbbf24',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f1f5f9',
    },
    fonts: {
      heading: 'Pretendard',
      body: 'Pretendard',
    },
    layout: {
      headerStyle: 'dark',
      heroStyle: 'overlay',
      contentWidth: 'wide',
      cardStyle: 'elevated',
      footerStyle: 'dark',
      borderRadius: 'lg',
      sermonGrid: 4,
    },
  },

  visual: {
    name: 'visual',
    label: '비주얼',
    description: '이미지 중심의 시각적 디자인. 큰 히어로와 풀 이미지.',
    colors: {
      primary: '#7c3aed',
      secondary: '#64748b',
      accent: '#ec4899',
      background: '#ffffff',
      surface: '#f5f3ff',
      text: '#1e1b4b',
    },
    fonts: {
      heading: 'Pretendard',
      body: 'Pretendard',
    },
    layout: {
      headerStyle: 'transparent',
      heroStyle: 'full',
      contentWidth: 'wide',
      cardStyle: 'shadow',
      footerStyle: 'centered',
      borderRadius: 'xl',
      sermonGrid: 3,
    },
  },

  simple: {
    name: 'simple',
    label: '심플',
    description: '깨끗하고 단순한 디자인. 초보자도 쉽게 사용.',
    colors: {
      primary: '#059669',
      secondary: '#6b7280',
      accent: '#0891b2',
      background: '#ffffff',
      surface: '#f0fdf4',
      text: '#1f2937',
    },
    fonts: {
      heading: 'Noto Sans KR',
      body: 'Noto Sans KR',
    },
    layout: {
      headerStyle: 'default',
      heroStyle: 'split',
      contentWidth: 'default',
      cardStyle: 'border',
      footerStyle: 'minimal',
      borderRadius: 'md',
      sermonGrid: 3,
    },
  },

  traditional: {
    name: 'traditional',
    label: '전통',
    description: '한국 전통 교회 느낌. 차분하고 신뢰감 있는 디자인.',
    colors: {
      primary: '#1d4ed8',
      secondary: '#475569',
      accent: '#dc2626',
      background: '#ffffff',
      surface: '#eff6ff',
      text: '#111827',
    },
    fonts: {
      heading: 'Noto Serif KR',
      body: 'Noto Sans KR',
    },
    layout: {
      headerStyle: 'default',
      heroStyle: 'full',
      contentWidth: 'default',
      cardStyle: 'shadow',
      footerStyle: 'default',
      borderRadius: 'md',
      sermonGrid: 4,
    },
  },

  youth: {
    name: 'youth',
    label: '청년',
    description: '활기찬 색상과 둥근 디자인. 청년부/대학부 교회에 적합.',
    colors: {
      primary: '#8b5cf6',
      secondary: '#6366f1',
      accent: '#f43f5e',
      background: '#fefefe',
      surface: '#f5f3ff',
      text: '#18181b',
    },
    fonts: {
      heading: 'Pretendard',
      body: 'Pretendard',
    },
    layout: {
      headerStyle: 'centered',
      heroStyle: 'overlay',
      contentWidth: 'wide',
      cardStyle: 'elevated',
      footerStyle: 'centered',
      borderRadius: 'xl',
      sermonGrid: 3,
    },
  },
};

/** Get all presets as an array */
export function getAllPresets(): TemplatePreset[] {
  return Object.values(templatePresets);
}

/** Get a single preset by name */
export function getPreset(name: string): TemplatePreset | null {
  return templatePresets[name] ?? null;
}
