import { useState, type ReactNode } from 'react';

/**
 * Reusable "AI 이미지 생성 가이드" — a collapsible panel with the intro, Korean
 * banner-text tips, a size/ratio reference table, and a prompt PRESET picker
 * (style × text-mode → one copy button per size, prompt body hidden). Callers
 * pass their own sizes (banner uses PC/모바일/풀스크린; events use 4:5/1:1).
 */

export interface PromptSize {
  key: string;
  label: string;
  ratio: string;
  /** Recommended pixel size, e.g. "1080×1350". */
  px: string;
  /** English usage line seeded into the prompt. */
  usage: string;
}

// Non-religious style presets ("사이즈만" = ratio only, no look imposed; "교회"
// is available but not the default).
const PROMPT_STYLES: { key: string; label: string; lines: string[] }[] = [
  { key: 'size', label: '사이즈만', lines: [] },
  { key: 'modern', label: '모던·클린', lines: [
    'Modern, clean, minimal design.',
    'Soft gradients and subtle geometric shapes.',
    'Sophisticated, muted color palette.',
    'Professional and elegant.',
  ] },
  { key: 'illust', label: '일러스트', lines: [
    'Flat vector illustration style.',
    'Simple, friendly, modern shapes.',
    'Soft, harmonious colors.',
    'Clean and uncluttered.',
  ] },
  { key: 'nature', label: '자연 배경', lines: [
    'Beautiful natural landscape.',
    'Soft natural light.',
    'Serene, peaceful scenery (sky, sea, mountains, or open fields).',
    'Photorealistic, high quality.',
  ] },
  { key: 'church', label: '교회', lines: [
    'Warm, reverent church atmosphere.',
    'Soft natural light.',
    'Modern, professional church photography.',
    'Clean and elegant.',
  ] },
];

const PROMPT_TEXT_MODES: { key: string; label: string; lines: string[] }[] = [
  // Reserve empty space; the operator overlays the headline in the editor, so
  // the AI must NOT draw text.
  { key: 'space', label: '글자 공간 포함', lines: [
    'Do NOT render any text or letters (a headline will be overlaid later).',
    'Keep the main subject to one side and leave generous clean negative space (the opposite side or lower third) for the headline.',
  ] },
  // The operator adds their own text/content to the prompt — no anti-text
  // restriction that would block it. Just size + style.
  { key: 'text', label: '글자포함', lines: [] },
];

function buildPrompt(size: PromptSize, styleKey: string, textKey: string): string {
  const style = PROMPT_STYLES.find((s) => s.key === styleKey)!;
  const text = PROMPT_TEXT_MODES.find((t) => t.key === textKey)!;
  const blocks = [
    `${size.usage}.\nAspect ratio ${size.ratio} (${size.px}).`,
    style.lines.join('\n'),
    text.lines.join('\n'),
    'High resolution. No watermark.',
  ].filter((b) => b.trim().length > 0);
  return blocks.join('\n\n');
}

function Segmented({ options, value, onChange }: { options: { key: string; label: string }[]; value: string; onChange: (k: string) => void }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${value === o.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function PresetPicker({ sizes }: { sizes: PromptSize[] }) {
  const [styleKey, setStyleKey] = useState('modern');
  // Default = 글자포함 (no anti-text restriction). Checking "Only 배경" switches
  // to the no-text background mode for overlaying a headline in the editor.
  const [bgOnly, setBgOnly] = useState(false);
  const textKey = bgOnly ? 'space' : 'text';
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copy = async (size: PromptSize) => {
    try {
      await navigator.clipboard.writeText(buildPrompt(size, styleKey, textKey));
      setCopiedKey(size.key);
      setTimeout(() => setCopiedKey((k) => (k === size.key ? null : k)), 1500);
    } catch { /* clipboard blocked — retry */ }
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold text-gray-500">스타일</span>
        <Segmented options={PROMPT_STYLES} value={styleKey} onChange={setStyleKey} />
      </div>
      <label className="flex w-fit cursor-pointer select-none items-center gap-2 text-xs text-gray-600">
        <input type="checkbox" checked={bgOnly} onChange={(e) => setBgOnly(e.target.checked)} className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600" />
        <span><strong>Only 배경</strong> <span className="text-gray-400">— 글자 없는 배경으로 생성 (에디터에서 직접 글자를 올릴 때). 체크 해제 시 프롬프트에 원하는 문구를 넣어 생성합니다.</span></span>
      </label>
      <div className={`grid grid-cols-1 gap-2 ${sizes.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {sizes.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => void copy(s)}
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-blue-300 hover:bg-blue-50/50"
          >
            <span>
              <span className="block text-xs font-semibold text-gray-800">{s.label}</span>
              <span className="block font-mono text-[10px] text-gray-400">{s.ratio} · {s.px}</span>
            </span>
            <span className={`shrink-0 text-xs font-medium ${copiedKey === s.key ? 'text-green-600' : 'text-blue-600'}`}>
              {copiedKey === s.key ? '복사됨 ✓' : '프롬프트 복사'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

const DEFAULT_INTRO = (
  <>
    ChatGPT 등 AI 이미지는 <strong>정확한 픽셀이 아니라 비율(aspect ratio)</strong> 기준으로 생성됩니다.
    프롬프트에 <strong>비율과 용도</strong>를 명확히 적고, 생성 후 Canva·Figma·Photoshop 등에서 최종 크기로
    크롭/리사이즈하세요.
  </>
);

export function ImagePromptGuide({
  sizes,
  title = '이미지 만들기 가이드 (AI 이미지 생성)',
  intro = DEFAULT_INTRO,
}: {
  sizes: PromptSize[];
  title?: string;
  intro?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left"
      >
        <span className="text-sm font-semibold text-blue-800">{title}</span>
        <svg className={`w-4 h-4 text-blue-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="space-y-4 px-4 pb-4">
          <p className="text-xs leading-relaxed text-gray-600">{intro}</p>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
            <p className="text-xs font-semibold text-amber-800">한글 폰트·텍스트 디자인 팁</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] leading-relaxed text-amber-700">
              <li><strong>고딕(산세리프) 계열 추천</strong> — 배너·행사 이미지엔 명조보다 굵은 고딕체가 멀리서도 또렷합니다. (예: Pretendard, 나눔스퀘어, 노토 산스 KR)</li>
              <li><strong>행간(줄 간격)은 넉넉히</strong> — 한글은 받침이 있어 행간이 좁으면 답답합니다. 1.3~1.5배 정도가 편안하게 읽힙니다.</li>
              <li><strong>자간은 살짝 좁게</strong> — 한글 제목은 자간을 약간(-2~-5%) 좁히면 더 단정하고 밀도 있어 보입니다.</li>
              <li><strong>배경과 대비 확보</strong> — 사진 위 글자는 어두운 오버레이나 그림자로 가독성을 확보하세요. 밝은 배경엔 진한 글자, 어두운 배경엔 흰 글자.</li>
              <li><strong>좌우 여백(여백의 미)을 충분히</strong> — 글자를 가장자리까지 꽉 채우지 말고 양옆을 비워두면 한글이 훨씬 정돈되고 고급스럽게 보입니다.</li>
              <li><strong>폰트는 과도하게 크지 않게</strong> — 한글은 영문보다 글자 면적이 커서 너무 키우면 답답해 보입니다. 제목은 한눈에 읽히는 선에서 절제하고 굵기·여백으로 강조하세요.</li>
              <li>핵심 문구는 짧게 — 한 줄에 다 담으려 하기보다 핵심만 남기면 여백이 살아납니다.</li>
            </ul>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-3 py-1.5 text-left font-medium">용도</th>
                  <th className="px-3 py-1.5 text-left font-medium">권장 사이즈</th>
                  <th className="px-3 py-1.5 text-left font-medium">비율</th>
                </tr>
              </thead>
              <tbody>
                {sizes.map((s) => (
                  <tr key={s.key} className="border-t border-gray-100">
                    <td className="px-3 py-1.5 text-gray-700">{s.label}</td>
                    <td className="px-3 py-1.5 font-mono text-gray-600">{s.px}</td>
                    <td className="px-3 py-1.5 font-mono text-gray-600">{s.ratio}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <p className="mb-2.5 text-xs font-semibold text-gray-700">프롬프트 프리셋</p>
            <PresetPicker sizes={sizes} />
          </div>
          <p className="text-[11px] text-gray-400">
            스타일·텍스트를 고르고 원하는 사이즈의 <strong>프롬프트 복사</strong> → AI 이미지 도구에 붙여넣기 → 생성 → (필요 시 크롭) → ‘이미지 변경’에서 업로드.
          </p>
        </div>
      )}
    </div>
  );
}
