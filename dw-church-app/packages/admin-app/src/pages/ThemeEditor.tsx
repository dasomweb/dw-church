import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTheme, useThemePresets, useUpdateTheme } from '@dw-church/api-client';
import type { TemplatePreset } from '@dw-church/api-client';

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

// ─── Mini Preview Component ──────────────────────────────────
function MiniPreview({ preset }: { preset: TemplatePreset }) {
  const { colors, layout } = preset;

  const headerBg =
    layout.headerStyle === 'dark' || layout.headerStyle === 'transparent'
      ? colors.primary
      : colors.surface;
  const headerText =
    layout.headerStyle === 'dark' || layout.headerStyle === 'transparent'
      ? colors.background
      : colors.text;
  const footerBg =
    layout.footerStyle === 'dark' ? colors.primary : colors.surface;
  const footerText =
    layout.footerStyle === 'dark' ? colors.background : colors.text;

  const radiusMap: Record<string, string> = {
    none: '0px',
    sm: '2px',
    md: '3px',
    lg: '4px',
    xl: '6px',
  };
  const cardRadius = radiusMap[layout.borderRadius] || '3px';

  const cardBorder =
    layout.cardStyle === 'border'
      ? `1px solid ${colors.secondary}40`
      : 'none';
  const cardShadow =
    layout.cardStyle === 'shadow'
      ? '0 1px 3px rgba(0,0,0,0.15)'
      : layout.cardStyle === 'elevated'
        ? '0 2px 6px rgba(0,0,0,0.12)'
        : 'none';
  const cardBg =
    layout.cardStyle === 'flat' ? colors.background : colors.surface;

  const cols = layout.sermonGrid >= 3 ? 4 : 3;

  return (
    <div
      style={{
        width: '100%',
        aspectRatio: '4 / 3',
        backgroundColor: colors.background,
        borderRadius: '4px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontSize: '6px',
        border: `1px solid ${colors.text}15`,
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: headerBg,
          color: headerText,
          padding: '4px 6px',
          display: 'flex',
          alignItems: layout.headerStyle === 'centered' ? 'center' : 'flex-start',
          justifyContent: layout.headerStyle === 'centered' ? 'center' : 'space-between',
          gap: '3px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: '16px',
            height: '3px',
            backgroundColor: headerText,
            borderRadius: '1px',
            opacity: 0.8,
          }}
        />
        <div style={{ display: 'flex', gap: '2px' }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: '8px',
                height: '2px',
                backgroundColor: headerText,
                borderRadius: '1px',
                opacity: 0.5,
              }}
            />
          ))}
        </div>
      </div>

      {/* Hero */}
      {layout.heroStyle !== 'none' && (
        <div
          style={{
            backgroundColor:
              layout.heroStyle === 'overlay'
                ? colors.primary
                : layout.heroStyle === 'full'
                  ? `${colors.primary}18`
                  : colors.surface,
            padding: layout.heroStyle === 'minimal' ? '4px 6px' : '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: layout.heroStyle === 'split' ? 'space-between' : 'center',
            flexShrink: 0,
          }}
        >
          {layout.heroStyle === 'split' ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div
                  style={{
                    width: '20px',
                    height: '3px',
                    backgroundColor: colors.primary,
                    borderRadius: '1px',
                  }}
                />
                <div
                  style={{
                    width: '14px',
                    height: '2px',
                    backgroundColor: colors.text,
                    opacity: 0.3,
                    borderRadius: '1px',
                  }}
                />
              </div>
              <div
                style={{
                  width: '16px',
                  height: '10px',
                  backgroundColor: `${colors.secondary}30`,
                  borderRadius: cardRadius,
                }}
              />
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
              <div
                style={{
                  width: '24px',
                  height: '3px',
                  backgroundColor:
                    layout.heroStyle === 'overlay' ? colors.background : colors.primary,
                  borderRadius: '1px',
                }}
              />
              <div
                style={{
                  width: '16px',
                  height: '2px',
                  backgroundColor:
                    layout.heroStyle === 'overlay' ? `${colors.background}80` : `${colors.text}40`,
                  borderRadius: '1px',
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Content: card grid */}
      <div
        style={{
          flex: 1,
          padding: '5px',
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: '3px',
          alignContent: 'start',
        }}
      >
        {Array.from({ length: cols * 2 }).map((_, i) => (
          <div
            key={i}
            style={{
              backgroundColor: cardBg,
              border: cardBorder,
              boxShadow: cardShadow,
              borderRadius: cardRadius,
              padding: '2px',
              display: 'flex',
              flexDirection: 'column',
              gap: '1px',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '6px',
                backgroundColor: `${colors.secondary}20`,
                borderRadius: `${cardRadius} ${cardRadius} 0 0`,
              }}
            />
            <div
              style={{
                width: '60%',
                height: '2px',
                backgroundColor: `${colors.text}30`,
                borderRadius: '1px',
              }}
            />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          backgroundColor: footerBg,
          color: footerText,
          padding: '3px 6px',
          display: 'flex',
          justifyContent:
            layout.footerStyle === 'centered' ? 'center' : 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: '12px',
            height: '2px',
            backgroundColor: footerText,
            borderRadius: '1px',
            opacity: 0.5,
          }}
        />
        {layout.footerStyle !== 'minimal' && (
          <div
            style={{
              width: '8px',
              height: '2px',
              backgroundColor: footerText,
              borderRadius: '1px',
              opacity: 0.3,
            }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Template Gallery Component ──────────────────────────────
function TemplateGallery({
  currentTemplate,
  onApply,
  isApplying,
}: {
  currentTemplate: string;
  onApply: (preset: TemplatePreset) => void;
  isApplying: boolean;
}) {
  const { data: presets, isLoading } = useThemePresets();

  if (isLoading) {
    return (
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          템플릿 갤러리
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-56 bg-gray-100 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </section>
    );
  }

  if (!presets || presets.length === 0) return null;

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">
          템플릿 갤러리
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          템플릿을 선택하면 색상, 글꼴, 레이아웃이 모두 적용됩니다.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {presets.map((preset) => {
          const isActive = currentTemplate === preset.name;
          const colorValues = [
            preset.colors.primary,
            preset.colors.secondary,
            preset.colors.accent,
            preset.colors.background,
            preset.colors.surface,
            preset.colors.text,
          ];

          return (
            <div
              key={preset.name}
              className={`relative rounded-lg border-2 overflow-hidden transition-all ${
                isActive
                  ? 'border-blue-500 ring-2 ring-blue-200 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              {/* Active badge */}
              {isActive && (
                <div className="absolute top-2 right-2 z-10 bg-blue-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  사용 중
                </div>
              )}

              {/* Mini preview */}
              <div className="p-3 pb-0">
                <MiniPreview preset={preset} />
              </div>

              {/* Info */}
              <div className="p-3">
                {/* Label + description */}
                <div className="mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {preset.label}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                    {preset.description}
                  </p>
                </div>

                {/* Color palette circles */}
                <div className="flex gap-1.5 mb-3">
                  {colorValues.map((color, idx) => (
                    <div
                      key={idx}
                      title={color}
                      style={{ backgroundColor: color }}
                      className="w-5 h-5 rounded-full border border-gray-200 shadow-sm"
                    />
                  ))}
                </div>

                {/* Font + layout info */}
                <div className="flex flex-wrap gap-1.5 text-[10px] text-gray-400 mb-3">
                  <span className="bg-gray-50 px-1.5 py-0.5 rounded">
                    {preset.fonts.heading}
                  </span>
                  <span className="bg-gray-50 px-1.5 py-0.5 rounded">
                    {preset.layout.headerStyle}
                  </span>
                  <span className="bg-gray-50 px-1.5 py-0.5 rounded">
                    {preset.layout.cardStyle}
                  </span>
                </div>

                {/* Apply button */}
                <button
                  type="button"
                  disabled={isActive || isApplying}
                  onClick={() => onApply(preset)}
                  className={`w-full text-center text-xs font-medium py-1.5 rounded-md transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 cursor-default'
                      : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  {isActive ? '현재 적용 중' : '적용'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Main ThemeEditor ────────────────────────────────────────
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

  const handleApplyPreset = async (preset: TemplatePreset) => {
    try {
      await updateTheme.mutateAsync({
        templateName: preset.name,
        colors: preset.colors,
        fonts: preset.fonts,
      });
      // Also update the form state to reflect the new values
      setValue('templateName', preset.name, { shouldDirty: false });
      setValue('colorPrimary', preset.colors.primary, { shouldDirty: false });
      setValue('colorSecondary', preset.colors.secondary, { shouldDirty: false });
      setValue('colorAccent', preset.colors.accent, { shouldDirty: false });
      setValue('colorBackground', preset.colors.background, { shouldDirty: false });
      setValue('colorSurface', preset.colors.surface, { shouldDirty: false });
      setValue('colorText', preset.colors.text, { shouldDirty: false });
      setValue('fontHeading', preset.fonts.heading, { shouldDirty: false });
      setValue('fontBody', preset.fonts.body, { shouldDirty: false });
      setToast({ message: `"${preset.label}" 템플릿이 적용되었습니다.`, type: 'success' });
    } catch {
      setToast({ message: '템플릿 적용에 실패했습니다.', type: 'error' });
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

      {/* Template Gallery - fetched from API */}
      <div className="mb-8">
        <TemplateGallery
          currentTemplate={watchTemplate}
          onApply={handleApplyPreset}
          isApplying={updateTheme.isPending}
        />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
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

        {/* Hidden template name field */}
        <input type="hidden" {...register('templateName')} />

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
