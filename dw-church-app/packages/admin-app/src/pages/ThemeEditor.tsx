import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTheme, useUpdateTheme } from '@dw-church/api-client';

const TEMPLATES = [
  { name: 'classic', label: '클래식', description: '전통적이고 격조 있는 디자인' },
  { name: 'modern', label: '모던', description: '깔끔하고 세련된 디자인' },
  { name: 'warm', label: '따뜻한', description: '부드럽고 따뜻한 색감' },
  { name: 'minimal', label: '미니멀', description: '여백을 활용한 심플 디자인' },
  { name: 'bold', label: '볼드', description: '강렬하고 임팩트 있는 디자인' },
  { name: 'nature', label: '자연', description: '자연 친화적 색감과 톤' },
  { name: 'elegant', label: '우아한', description: '품격 있는 섬세한 디자인' },
  { name: 'vibrant', label: '생동감', description: '밝고 활기찬 색상 조합' },
  { name: 'dark', label: '다크', description: '어두운 배경의 모던 디자인' },
  { name: 'pastel', label: '파스텔', description: '부드러운 파스텔톤 디자인' },
];

const FONT_OPTIONS = [
  'Noto Sans KR',
  'Noto Serif KR',
  'Pretendard',
  'Spoqa Han Sans Neo',
  'IBM Plex Sans KR',
  'Gothic A1',
  'Nanum Gothic',
  'Nanum Myeongjo',
  'Black Han Sans',
  'Do Hyeon',
];

interface ThemeFormData {
  templateName: string;
  colorPrimary: string;
  colorSecondary: string;
  colorAccent: string;
  colorBackground: string;
  colorSurface: string;
  colorText: string;
  fontHeading: string;
  fontBody: string;
  customCss: string;
}

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex gap-2 items-center">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded border border-gray-300 cursor-pointer p-0.5"
        />
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="flex-1 border rounded px-2 py-1.5 text-sm font-mono"
        />
      </div>
    </div>
  );
}

export default function ThemeEditor() {
  const { data: theme, isLoading } = useTheme();
  const updateTheme = useUpdateTheme();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isDirty },
  } = useForm<ThemeFormData>();

  const watchTemplate = watch('templateName');

  useEffect(() => {
    if (theme) {
      reset({
        templateName: theme.templateName,
        colorPrimary: theme.colors.primary,
        colorSecondary: theme.colors.secondary,
        colorAccent: theme.colors.accent,
        colorBackground: theme.colors.background,
        colorSurface: theme.colors.surface,
        colorText: theme.colors.text,
        fontHeading: theme.fonts.heading,
        fontBody: theme.fonts.body,
        customCss: theme.customCss,
      });
    }
  }, [theme, reset]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const onSubmit = async (data: ThemeFormData) => {
    try {
      await updateTheme.mutateAsync({
        templateName: data.templateName,
        colors: {
          primary: data.colorPrimary,
          secondary: data.colorSecondary,
          accent: data.colorAccent,
          background: data.colorBackground,
          surface: data.colorSurface,
          text: data.colorText,
        },
        fonts: {
          heading: data.fontHeading,
          body: data.fontBody,
        },
        customCss: data.customCss,
      });
      setToast({ message: '테마가 저장되었습니다.', type: 'success' });
    } catch {
      setToast({ message: '테마 저장에 실패했습니다.', type: 'error' });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {toast.message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Template selector */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">템플릿 선택</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.name}
                type="button"
                onClick={() => setValue('templateName', tmpl.name, { shouldDirty: true })}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  watchTemplate === tmpl.name
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-sm font-semibold">{tmpl.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{tmpl.description}</div>
              </button>
            ))}
          </div>
          <input type="hidden" {...register('templateName')} />
        </section>

        {/* Colors */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">색상</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <ColorPicker
              label="Primary"
              value={watch('colorPrimary') || ''}
              onChange={(v) => setValue('colorPrimary', v, { shouldDirty: true })}
            />
            <ColorPicker
              label="Secondary"
              value={watch('colorSecondary') || ''}
              onChange={(v) => setValue('colorSecondary', v, { shouldDirty: true })}
            />
            <ColorPicker
              label="Accent"
              value={watch('colorAccent') || ''}
              onChange={(v) => setValue('colorAccent', v, { shouldDirty: true })}
            />
            <ColorPicker
              label="Background"
              value={watch('colorBackground') || ''}
              onChange={(v) => setValue('colorBackground', v, { shouldDirty: true })}
            />
            <ColorPicker
              label="Surface"
              value={watch('colorSurface') || ''}
              onChange={(v) => setValue('colorSurface', v, { shouldDirty: true })}
            />
            <ColorPicker
              label="Text"
              value={watch('colorText') || ''}
              onChange={(v) => setValue('colorText', v, { shouldDirty: true })}
            />
          </div>

          {/* Preview area */}
          <div className="mt-6 p-4 rounded-lg border" style={{
            backgroundColor: watch('colorBackground') || '#ffffff',
            color: watch('colorText') || '#000000',
          }}>
            <div className="text-xs text-gray-400 mb-2">미리보기</div>
            <div
              className="text-lg font-bold mb-1"
              style={{ color: watch('colorPrimary') || '#3b82f6' }}
            >
              Primary Color Heading
            </div>
            <p className="text-sm mb-2">본문 텍스트 예시입니다.</p>
            <div className="flex gap-2">
              <span
                className="px-3 py-1 rounded text-xs text-white"
                style={{ backgroundColor: watch('colorPrimary') || '#3b82f6' }}
              >
                Primary
              </span>
              <span
                className="px-3 py-1 rounded text-xs text-white"
                style={{ backgroundColor: watch('colorSecondary') || '#6b7280' }}
              >
                Secondary
              </span>
              <span
                className="px-3 py-1 rounded text-xs text-white"
                style={{ backgroundColor: watch('colorAccent') || '#f59e0b' }}
              >
                Accent
              </span>
            </div>
            <div
              className="mt-3 p-3 rounded"
              style={{ backgroundColor: watch('colorSurface') || '#f9fafb' }}
            >
              <span className="text-xs">Surface 영역</span>
            </div>
          </div>
        </section>

        {/* Fonts */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">글꼴</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">제목 글꼴</label>
              <select
                {...register('fontHeading')}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">본문 글꼴</label>
              <select
                {...register('fontBody')}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Custom CSS */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-2">커스텀 CSS</h2>
          <p className="text-xs text-gray-500 mb-3">고급 사용자를 위한 커스텀 CSS를 입력할 수 있습니다.</p>
          <textarea
            {...register('customCss')}
            rows={8}
            className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
            placeholder="/* 커스텀 CSS 입력 */"
          />
        </section>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pb-6">
          {isDirty && (
            <span className="text-sm text-amber-600">저장되지 않은 변경사항이 있습니다.</span>
          )}
          <button
            type="submit"
            disabled={updateTheme.isPending || !isDirty}
            className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {updateTheme.isPending ? '저장 중...' : '테마 저장'}
          </button>
        </div>
      </form>
    </div>
  );
}
