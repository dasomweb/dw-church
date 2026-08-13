/**
 * 프론트 샘플 — 신청자가 고를 홈페이지 디자인 샘플 갤러리 (슈퍼어드민 미리보기).
 * 각 샘플은 자기완결 HTML 문서로, <iframe srcDoc> 안에서 격리 렌더된다. 카드에는
 * 축소 라이브 썸네일 + 팔레트, 클릭하면 데스크톱/모바일 전체 미리보기 모달.
 *
 * 지금은 미리보기 전용. 이후: 선택한 샘플이 테넌트 페이지 섹션을 구성하고,
 * 마케팅 페이지의 디자인 선택지로 노출된다.
 */
import { useState } from 'react';
import { FRONT_SAMPLES, type FrontSample } from '../front-samples/templates';

function Swatches({ s }: { s: FrontSample }) {
  const cols = [s.palette.primary, s.palette.primaryDark, s.palette.accent, s.palette.surface];
  return (
    <div className="flex gap-1">
      {cols.map((c) => (
        <span key={c} className="h-4 w-4 rounded-full border border-black/10" style={{ background: c }} />
      ))}
    </div>
  );
}

// Scaled, non-interactive live thumbnail of the full sample.
function Thumb({ html }: { html: string }) {
  return (
    <div className="relative w-full overflow-hidden rounded-t-xl border-b border-gray-100 bg-white" style={{ height: 230 }}>
      <iframe
        title="preview"
        srcDoc={html}
        tabIndex={-1}
        className="pointer-events-none origin-top-left"
        style={{ width: 1280, height: 1150, transform: 'scale(0.36)', border: 0 }}
      />
    </div>
  );
}

function PreviewModal({ sample, onClose }: { sample: FrontSample; onClose: () => void }) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const width = device === 'mobile' ? 390 : '100%';
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/70" onClick={onClose}>
      <div className="flex items-center justify-between gap-3 bg-white px-5 py-3" onClick={(e) => e.stopPropagation()}>
        <div>
          <div className="text-sm font-bold text-gray-900">{sample.name}</div>
          <div className="text-[11px] text-gray-500">{sample.vibe} · theme-set: {sample.themeSet}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 p-0.5 text-xs">
            {(['desktop', 'mobile'] as const).map((d) => (
              <button key={d} onClick={() => setDevice(d)}
                className={`px-3 py-1 rounded-md font-medium ${device === d ? 'bg-blue-600 text-white' : 'text-gray-600'}`}>
                {d === 'desktop' ? '데스크톱' : '모바일'}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">닫기 ✕</button>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-gray-100 p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto bg-white shadow-xl" style={{ width, maxWidth: '100%', height: '100%' }}>
          <iframe title={sample.name} srcDoc={sample.html} className="h-full w-full" style={{ border: 0 }} />
        </div>
      </div>
    </div>
  );
}

export default function FrontSamplesTab() {
  const [open, setOpen] = useState<FrontSample | null>(null);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
        <p className="text-sm font-medium text-blue-800">
          신청자가 고를 <b>프론트페이지 디자인 샘플</b>입니다. 지금은 슈퍼어드민 미리보기 단계 —
          완성도가 갖춰지면 신청 페이지의 디자인 선택지로, 이후 테넌트 페이지 섹션 구성에 반영됩니다.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {FRONT_SAMPLES.map((s) => (
          <div key={s.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <button onClick={() => setOpen(s)} className="block w-full text-left" title="전체 미리보기">
              <Thumb html={s.html} />
            </button>
            <div className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-bold text-gray-900">{s.name}</div>
                <Swatches s={s} />
              </div>
              <div className="mt-1 text-xs text-gray-500">{s.vibe}</div>
              <div className="mt-3 flex items-center gap-2">
                <button onClick={() => setOpen(s)}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">전체 미리보기</button>
                <span className="text-[10px] font-mono text-gray-300">{s.id}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {open && <PreviewModal sample={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
