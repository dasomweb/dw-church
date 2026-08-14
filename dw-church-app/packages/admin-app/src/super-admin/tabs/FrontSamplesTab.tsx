/**
 * 프론트 샘플 — 신청자가 고를 홈페이지 디자인 갤러리 (슈퍼어드민 미리보기).
 * 샘플은 'Church Homepage' Claude Design 캔버스에서 가져온 실제 디자인 시안
 * (packages/admin-app/.../front-samples/canvas/*.html) 으로, 디자인시스템 토큰 +
 * <image-slot> 플레이스홀더 shim 으로 감싸 <iframe srcDoc> 안에서 격리 렌더된다.
 *
 * 지금은 미리보기 전용. 이후: 신청 페이지 디자인 선택지 → 테넌트 페이지 섹션 구성.
 */
import { useEffect, useMemo, useState } from 'react';
import { CANVAS_SAMPLES, type CanvasSample } from '../front-samples/canvas/canvas-index';
import { useAdminApi } from '../shared/use-admin-api';
import FrontSampleEditor from '../front-samples/FrontSampleEditor';

// Lazy raw-HTML loaders for every wrapped canvas sample (kept out of the main
// bundle — each is a separate chunk fetched on tab open).
const LOADERS = import.meta.glob('../front-samples/canvas/*.html', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;
const loaderFor = (file: string) => {
  const key = Object.keys(LOADERS).find((k) => k.endsWith('/' + file));
  return key ? LOADERS[key] : undefined;
};

function Thumb({ html }: { html: string }) {
  return (
    <div className="relative w-full overflow-hidden rounded-t-xl border-b border-gray-100 bg-white" style={{ height: 236 }}>
      <iframe title="preview" srcDoc={html} tabIndex={-1}
        className="pointer-events-none origin-top-left"
        style={{ width: 1280, height: 1310, transform: 'scale(0.3125)', border: 0 }} />
    </div>
  );
}

function PreviewModal({ sample, html, onClose }: { sample: CanvasSample; html: string; onClose: () => void }) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const width = device === 'mobile' ? 390 : '100%';
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/70" onClick={onClose}>
      <div className="flex items-center justify-between gap-3 bg-white px-5 py-3" onClick={(e) => e.stopPropagation()}>
        <div>
          <div className="text-sm font-bold text-gray-900">{sample.name} <span className="ml-1 text-[11px] font-mono text-gray-400">{sample.code}</span></div>
          <div className="text-[11px] text-gray-500">{sample.group} · {sample.desc}</div>
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
          <iframe title={sample.name} srcDoc={html} className="h-full w-full" style={{ border: 0 }} />
        </div>
      </div>
    </div>
  );
}

export default function FrontSamplesTab() {
  const apiFetch = useAdminApi();
  const [htmls, setHtmls] = useState<Record<string, string>>({});
  // Saved edits keyed by cardId (sample.id) — override the bundled base html.
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<CanvasSample | null>(null);
  const [editing, setEditing] = useState<CanvasSample | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      Promise.all(
        CANVAS_SAMPLES.map(async (s) => {
          const load = loaderFor(s.file);
          return [s.file, load ? await load() : ''] as const;
        }),
      ),
      apiFetch<{ data: Record<string, string> }>('/front-samples').then((r) => r.data).catch(() => ({})),
    ]).then(([pairs, ov]) => {
      if (!cancelled) { setHtmls(Object.fromEntries(pairs)); setOverrides(ov); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [apiFetch]);

  // Edited html wins over the bundled base for previews.
  const htmlFor = (s: CanvasSample) => overrides[s.id] ?? htmls[s.file] ?? '';

  const groups = useMemo(() => {
    const order: string[] = [];
    const by = new Map<string, CanvasSample[]>();
    for (const s of CANVAS_SAMPLES) {
      let arr = by.get(s.group);
      if (!arr) { arr = []; by.set(s.group, arr); order.push(s.group); }
      arr.push(s);
    }
    return order.map((g) => ({ group: g, items: by.get(g)! }));
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
        <p className="text-sm font-medium text-blue-800">
          신청자가 고를 <b>프론트페이지 디자인 시안 {CANVAS_SAMPLES.length}종</b> — 'Church Homepage' 디자인에서 가져온 실제 시안입니다.
          사진 자리(<span className="font-mono text-[12px]">image-slot</span>)는 실제 셋업 시 교회 사진으로 채워집니다.
        </p>
        <p className="mt-1 text-xs text-blue-700/80">지금은 미리보기 단계. 완성도가 갖춰지면 신청 페이지 디자인 선택지 → 테넌트 페이지 섹션 구성에 반영됩니다.</p>
      </div>

      {loading ? (
        <div className="p-10 text-center text-sm text-gray-400">시안 불러오는 중…</div>
      ) : (
        groups.map(({ group, items }) => (
          <section key={group} className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900">{group} <span className="text-gray-400 font-normal">· {items.length}종</span></h3>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {items.map((s) => (
                <div key={s.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <button onClick={() => setOpen(s)} className="relative block w-full text-left" title="전체 미리보기">
                    <Thumb html={htmlFor(s)} />
                    {overrides[s.id] && (
                      <span className="absolute right-2 top-2 rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white shadow">편집됨</span>
                    )}
                  </button>
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-bold text-gray-900">{s.name}</div>
                      <span className="text-[10px] font-mono text-gray-300">{s.code}</span>
                    </div>
                    {s.desc && <div className="mt-1 text-xs text-gray-500 line-clamp-2">{s.desc}</div>}
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => setOpen(s)}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">전체 미리보기</button>
                      <button onClick={() => setEditing(s)}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">✎ 편집</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      {open && (
        <PreviewModal sample={open} html={htmlFor(open)} onClose={() => setOpen(null)} />
      )}

      {editing && (
        <FrontSampleEditor
          sample={editing}
          baseHtml={htmlFor(editing)}
          hasOverride={Boolean(overrides[editing.id])}
          onClose={() => setEditing(null)}
          onSaved={(cardId, html) => setOverrides((p) => ({ ...p, [cardId]: html }))}
          onReverted={(cardId) => setOverrides((p) => { const n = { ...p }; delete n[cardId]; return n; })}
        />
      )}
    </div>
  );
}
