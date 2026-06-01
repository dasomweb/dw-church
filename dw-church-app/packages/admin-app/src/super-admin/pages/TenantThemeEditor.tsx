/**
 * Super-admin ThemeEditor — pragmatic 5-tab port of the b2bsmart editor
 * focused on the token surface that the new /theme/tokens endpoints
 * exercise:
 *
 *   1. Palette     — 8 system color slots + custom keys, hex picker + WCAG hint
 *   2. Typography  — heading/body/korean families + per-scale size/weight
 *   3. Preset      — 4-step font-size + 4-step spacing density pickers
 *   4. Spacing & Radius — sectionPadding / containerPadding / gap / radius scales
 *   5. Custom CSS  — escape hatch
 *
 * Header / Footer / AI-Recommendations tabs from b2bsmart aren't ported
 * yet — they depend on tenant nav state and apps/agents which we don't
 * have. They'll appear in a follow-up phase. The Palette / Typography /
 * Preset tabs are the load-bearing ones; the rest layer on top.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  applyFontSizePreset,
  applySpacingPreset,
  detectFontSizePreset,
  detectSpacingPreset,
  FONT_SIZE_PRESETS,
  SPACING_PRESETS,
  contrastRatio,
  meetsContrast,
  WCAG_AA_NORMAL,
  type DesignTokens,
  type SystemColorTokens,
  type FontSizePresetName,
  type SpacingPresetName,
  type TypographyScaleName,
} from '@dw-church/design-tokens';
import { useAuthStore } from '../../stores/auth';
import { useToast } from '../../components';
import { useSuperAdminTenant } from '../SuperAdminTenantLayout';

type TabId = 'palette' | 'typography' | 'preset' | 'spacing' | 'custom';

const TABS: { id: TabId; label: string }[] = [
  { id: 'palette',    label: '팔레트' },
  { id: 'typography', label: '타이포그래피' },
  { id: 'preset',     label: '프리셋' },
  { id: 'spacing',    label: '여백 / 둥근 모서리' },
  { id: 'custom',     label: '커스텀 CSS' },
];

const COLOR_LABELS: Record<keyof SystemColorTokens, string> = {
  primary:    '주요 (Primary)',
  secondary:  '보조 (Secondary)',
  accent:     '강조 (Accent)',
  text:       '텍스트 (Text)',
  muted:      '약화 (Muted)',
  background: '배경 (Background)',
  border:     '테두리 (Border)',
  surface:    '표면 (Surface)',
};

const SCALE_LABELS: Record<TypographyScaleName, string> = {
  h1: 'H1', h2: 'H2', h3: 'H3', h4: 'H4', h5: 'H5', h6: 'H6',
  body: '본문', caption: '캡션', overline: '오버라인', label: '라벨', button: '버튼',
};

export default function TenantThemeEditor() {
  const session = useAuthStore((s) => s.session);
  const { tenant } = useSuperAdminTenant();
  const { showToast } = useToast();
  const [tab, setTab] = useState<TabId>('palette');
  const [tokens, setTokens] = useState<DesignTokens | null>(null);
  const [customCss, setCustomCss] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const baseUrl = useMemo(() => {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    return host.startsWith('admin.')
      ? `https://api.${host.replace('admin.', '')}`
      : (import.meta.env.VITE_API_BASE_URL as string) || '';
  }, []);

  const headers = useMemo(() => ({
    Authorization: `Bearer ${session?.accessToken ?? ''}`,
    'X-Tenant-Slug': tenant?.slug ?? '',
    'Content-Type': 'application/json',
  }), [session?.accessToken, tenant?.slug]);

  useEffect(() => {
    if (!tenant?.slug || !session?.accessToken) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [tokensRes, themeRes] = await Promise.all([
          fetch(`${baseUrl}/api/v1/theme/tokens`, { headers }),
          fetch(`${baseUrl}/api/v1/theme`, { headers }),
        ]);
        if (!tokensRes.ok) throw new Error(`tokens HTTP ${tokensRes.status}`);
        const tokensBody = await tokensRes.json() as { data: DesignTokens };
        const themeBody = themeRes.ok ? (await themeRes.json() as { customCss?: string }) : { customCss: '' };
        if (cancelled) return;
        setTokens(tokensBody.data);
        setCustomCss(themeBody.customCss ?? '');
      } catch (err) {
        if (!cancelled) showToast('error', err instanceof Error ? err.message : '테마 로딩 실패');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tenant?.slug, session?.accessToken, baseUrl, headers, showToast]);

  const save = async (next: DesignTokens) => {
    setSaving(true);
    try {
      const res = await fetch(`${baseUrl}/api/v1/theme/tokens`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json() as { data: DesignTokens };
      setTokens(body.data);
      showToast('success', '저장되었습니다.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const saveCustomCss = async (css: string) => {
    setSaving(true);
    try {
      const res = await fetch(`${baseUrl}/api/v1/theme`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ customCss: css }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast('success', '저장되었습니다.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !tokens) {
    return (
      <div className="p-6">
        <div className="animate-pulse text-sm text-gray-500">테마 로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">테마 설정</h1>
        {saving && <span className="text-xs text-gray-500">저장 중...</span>}
      </div>

      <div className="border-b border-gray-200 mb-6 flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px whitespace-nowrap transition-colors ${
              tab === t.id
                ? 'border-blue-600 text-blue-700 font-semibold'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'palette' && <PaletteTab tokens={tokens} onChange={save} saving={saving} />}
      {tab === 'typography' && <TypographyTab tokens={tokens} onChange={save} saving={saving} />}
      {tab === 'preset' && <PresetTab tokens={tokens} onChange={save} saving={saving} />}
      {tab === 'spacing' && <SpacingTab tokens={tokens} onChange={save} saving={saving} />}
      {tab === 'custom' && <CustomCssTab value={customCss} onChange={setCustomCss} onSave={() => saveCustomCss(customCss)} saving={saving} />}
    </div>
  );
}

// ─── Palette ─────────────────────────────────────────────────────────
function PaletteTab({ tokens, onChange, saving }: { tokens: DesignTokens; onChange: (t: DesignTokens) => void; saving: boolean }) {
  const setSlot = (slot: keyof SystemColorTokens, hex: string) => {
    onChange({ ...tokens, colors: { ...tokens.colors, system: { ...tokens.colors.system, [slot]: hex } } });
  };
  const slots = Object.keys(COLOR_LABELS) as (keyof SystemColorTokens)[];

  return (
    <section className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">시스템 컬러 (8슬롯)</h3>
        <p className="text-xs text-gray-500 mb-4">테넌트 사이트 전체에 <code>--brand-primary</code> 등 CSS 변수로 카스케이드됩니다.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {slots.map((slot) => {
            const hex = tokens.colors.system[slot];
            const bg = tokens.colors.system.background ?? '#ffffff';
            const ratio = contrastRatio(hex, bg);
            const passes = meetsContrast(hex, bg, WCAG_AA_NORMAL);
            return (
              <div key={slot} className="rounded-lg border border-gray-200 p-3 bg-white">
                <label className="text-xs font-medium text-gray-700">{COLOR_LABELS[slot]}</label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="color"
                    value={hex}
                    onChange={(e) => setSlot(slot, e.target.value)}
                    disabled={saving}
                    className="w-10 h-10 rounded cursor-pointer disabled:opacity-50"
                  />
                  <input
                    type="text"
                    value={hex}
                    onChange={(e) => setSlot(slot, e.target.value)}
                    disabled={saving}
                    className="flex-1 px-2 py-1.5 text-xs font-mono border rounded disabled:opacity-50"
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[10px]">
                  <span className="font-mono text-gray-500">vs bg: {ratio.toFixed(1)}:1</span>
                  <span className={passes ? 'text-green-600 font-semibold' : 'text-amber-600'}>
                    {passes ? 'AA' : 'AA 미달'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Typography ──────────────────────────────────────────────────────
function TypographyTab({ tokens, onChange, saving }: { tokens: DesignTokens; onChange: (t: DesignTokens) => void; saving: boolean }) {
  const setFamily = (k: 'heading' | 'body' | 'korean', v: string) => {
    onChange({ ...tokens, typography: { ...tokens.typography, families: { ...tokens.typography.families, [k]: v } } });
  };
  const setScaleSize = (name: TypographyScaleName, desktop: number) => {
    const cur = tokens.typography.scales[name];
    if (!cur) return;
    onChange({
      ...tokens,
      typography: {
        ...tokens.typography,
        scales: { ...tokens.typography.scales, [name]: { ...cur, size: { ...cur.size, desktop } } },
      },
    });
  };
  const setScaleWeight = (name: TypographyScaleName, weight: number) => {
    const cur = tokens.typography.scales[name];
    if (!cur) return;
    onChange({
      ...tokens,
      typography: {
        ...tokens.typography,
        scales: { ...tokens.typography.scales, [name]: { ...cur, weight } },
      },
    });
  };

  const scaleNames = Object.keys(SCALE_LABELS) as TypographyScaleName[];

  return (
    <section className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">폰트 패밀리</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(['heading', 'body', 'korean'] as const).map((k) => (
            <label key={k} className="text-xs">
              <span className="block font-medium text-gray-700 mb-1 uppercase">{k}</span>
              <input
                type="text"
                value={tokens.typography.families[k]}
                onChange={(e) => setFamily(k, e.target.value)}
                disabled={saving}
                className="w-full px-2 py-1.5 border rounded font-mono disabled:opacity-50"
              />
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">스케일 (Desktop)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {scaleNames.map((name) => {
            const spec = tokens.typography.scales[name];
            if (!spec) return null;
            return (
              <div key={name} className="rounded border border-gray-200 p-2 bg-white flex items-center gap-2">
                <span className="text-xs font-mono w-12 text-gray-500">{SCALE_LABELS[name]}</span>
                <input
                  type="number"
                  value={spec.size.desktop}
                  onChange={(e) => setScaleSize(name, Number(e.target.value) || spec.size.desktop)}
                  disabled={saving}
                  className="w-14 px-1.5 py-0.5 text-xs border rounded disabled:opacity-50"
                />
                <span className="text-[10px] text-gray-400">px</span>
                <input
                  type="number"
                  value={spec.weight}
                  step={100}
                  min={100}
                  max={900}
                  onChange={(e) => setScaleWeight(name, Number(e.target.value) || spec.weight)}
                  disabled={saving}
                  className="w-14 px-1.5 py-0.5 text-xs border rounded disabled:opacity-50"
                />
                <span className="text-[10px] text-gray-400">wt</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Preset ──────────────────────────────────────────────────────────
function PresetTab({ tokens, onChange, saving }: { tokens: DesignTokens; onChange: (t: DesignTokens) => void; saving: boolean }) {
  const activeFont = detectFontSizePreset(tokens);
  const activeSpacing = detectSpacingPreset(tokens);
  const fontKeys = Object.keys(FONT_SIZE_PRESETS) as FontSizePresetName[];
  const spacingKeys = Object.keys(SPACING_PRESETS) as SpacingPresetName[];

  return (
    <section className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">글자 크기 프리셋</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {fontKeys.map((key) => {
            const active = activeFont === key;
            return (
              <button
                key={key}
                type="button"
                disabled={saving}
                onClick={() => onChange(applyFontSizePreset(tokens, key))}
                className={`text-left rounded-lg border p-3 transition-colors disabled:opacity-50 ${active ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
              >
                <div className="text-sm font-semibold capitalize">{key}</div>
                <div className="text-xs text-gray-500 mt-0.5">h1: {FONT_SIZE_PRESETS[key].h1.desktop}px</div>
                {active && <div className="mt-1 text-[10px] text-blue-600 font-medium">현재 적용중</div>}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">여백 밀도 프리셋</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {spacingKeys.map((key) => {
            const active = activeSpacing === key;
            return (
              <button
                key={key}
                type="button"
                disabled={saving}
                onClick={() => onChange(applySpacingPreset(tokens, key))}
                className={`text-left rounded-lg border p-3 transition-colors disabled:opacity-50 ${active ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
              >
                <div className="text-sm font-semibold capitalize">{key}</div>
                <div className="text-xs text-gray-500 mt-0.5">패딩: {SPACING_PRESETS[key].sectionPaddingY}px</div>
                {active && <div className="mt-1 text-[10px] text-blue-600 font-medium">현재 적용중</div>}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Spacing & Radius ────────────────────────────────────────────────
function SpacingTab({ tokens, onChange, saving }: { tokens: DesignTokens; onChange: (t: DesignTokens) => void; saving: boolean }) {
  const setSpacing = (k: keyof DesignTokens['spacing'], v: number) => {
    onChange({ ...tokens, spacing: { ...tokens.spacing, [k]: v } });
  };
  const setRadius = (k: keyof DesignTokens['radius'], v: number) => {
    onChange({ ...tokens, radius: { ...tokens.radius, [k]: v } });
  };
  return (
    <section className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">여백</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(['sectionPaddingY', 'containerPaddingX', 'gapGrid'] as const).map((k) => (
            <label key={k} className="text-xs">
              <span className="block font-medium text-gray-700 mb-1">{k}</span>
              <input
                type="number"
                value={tokens.spacing[k]}
                onChange={(e) => setSpacing(k, Number(e.target.value) || tokens.spacing[k])}
                disabled={saving}
                className="w-full px-2 py-1.5 border rounded disabled:opacity-50"
              />
            </label>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">둥근 모서리 (Radius)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(['sm', 'md', 'lg', 'full'] as const).map((k) => (
            <label key={k} className="text-xs">
              <span className="block font-medium text-gray-700 mb-1 uppercase">{k}</span>
              <input
                type="number"
                value={tokens.radius[k]}
                onChange={(e) => setRadius(k, Number(e.target.value) || tokens.radius[k])}
                disabled={saving}
                className="w-full px-2 py-1.5 border rounded disabled:opacity-50"
              />
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Custom CSS ──────────────────────────────────────────────────────
function CustomCssTab({ value, onChange, onSave, saving }: { value: string; onChange: (v: string) => void; onSave: () => void; saving: boolean }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">커스텀 CSS</h3>
        <p className="text-xs text-gray-500 mt-0.5">스토어프론트 <code>:root</code> 다음에 주입됩니다. 토큰으로 표현 안 되는 예외 케이스 전용.</p>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={saving}
        rows={18}
        spellCheck={false}
        className="w-full px-3 py-2 font-mono text-xs border rounded disabled:opacity-50"
        placeholder=":root { --custom-shadow: 0 8px 32px rgba(0,0,0,0.12); }"
      />
      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          저장
        </button>
      </div>
    </section>
  );
}
