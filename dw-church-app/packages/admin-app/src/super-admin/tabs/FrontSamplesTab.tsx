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

// "시안 그대로 적용"용: 시안 전체 문서 → 실제 사이트에 넣을 조각으로 변환.
//  - <style>(토큰/리셋/image-slot shim)는 유지하되 전역 body{} 규칙은 제거해
//    스토어프론트 전체가 오염되지 않게 함
//  - 본문의 첫 자식(내비바)·마지막 자식(푸터)은 제거 → 실제 사이트 헤더/푸터가 대신
function buildExactHtml(fullDoc: string): string {
  try {
    const doc = new DOMParser().parseFromString(fullDoc, 'text/html');
    const styles = Array.from(doc.head.querySelectorAll('style'))
      .map((s) => s.textContent || '')
      .join('\n')
      .replace(/body\s*\{[^}]*\}/gi, ''); // drop global body rule
    const body = doc.body;
    const kids = Array.from(body.children);
    // canvas cards open with a nav bar and end with a footer — strip both so the
    // tenant's real header/footer aren't duplicated.
    if (kids.length >= 3) { kids[0].remove(); kids[kids.length - 1].remove(); }
    return `<style>${styles}</style>\n${body.innerHTML}`;
  } catch {
    return fullDoc;
  }
}

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
  // Samples are designed at 1280px — render the preview at that fixed width so
  // every sample looks consistent and full-bleed heroes fill the full 1280.
  const width = device === 'mobile' ? 390 : 1280;
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
        <div className="mx-auto bg-white shadow-xl" style={{ width, maxWidth: device === 'mobile' ? '100%' : 'none', height: '100%' }}>
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
  // "테넌트에 적용" — rebuild a tenant's home page_sections from this design's preset.
  const [applyFor, setApplyFor] = useState<CanvasSample | null>(null);
  const [tenants, setTenants] = useState<{ slug: string; name: string }[]>([]);
  const [applySlug, setApplySlug] = useState('');
  const [applyState, setApplyState] = useState<'idle' | 'loading' | 'applying' | 'done' | 'error'>('idle');
  const [applyMsg, setApplyMsg] = useState('');
  // 'exact' = 시안 HTML 그대로(픽셀 일치), 'blocks' = 블록 프리셋(편집 쉬움)
  const [applyMode, setApplyMode] = useState<'exact' | 'blocks'>('exact');

  const openApply = (s: CanvasSample) => {
    setApplyFor(s); setApplySlug(''); setApplyMsg(''); setApplyState('loading');
    // provisioned tenants only (those with a tenant_<slug> schema) — prevents
    // applying to a schema-less tenant row (which returns NO_SCHEMA / 404).
    apiFetch<{ data: { slug: string; name?: string }[] }>('/front-samples/tenants')
      .then((r) => {
        setTenants((r.data || []).map((t) => ({ slug: t.slug, name: t.name || t.slug })));
        setApplyState('idle'); // no auto-select — operator must pick the target explicitly
      })
      .catch((e) => { setApplyState('error'); setApplyMsg((e as Error).message); });
  };
  const doApply = async () => {
    if (!applyFor || !applySlug) return;
    setApplyState('applying'); setApplyMsg('');
    try {
      if (applyMode === 'exact') {
        const html = buildExactHtml(htmlFor(applyFor));
        await apiFetch('/front-samples/apply-exact', {
          method: 'POST', body: JSON.stringify({ slug: applySlug, html }),
        });
        setApplyState('done'); setApplyMsg('적용 완료 · 시안 디자인 그대로 홈에 반영되었습니다.');
      } else {
        const r = await apiFetch<{ data: { sections: number } }>('/front-samples/apply', {
          method: 'POST', body: JSON.stringify({ slug: applySlug, design: applyFor.id }),
        });
        setApplyState('done'); setApplyMsg(`적용 완료 · 홈 ${r.data.sections}개 블록으로 구성되었습니다.`);
      }
    } catch (e) { setApplyState('error'); setApplyMsg((e as Error).message); }
  };

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
                      <button onClick={() => openApply(s)}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50" title="이 디자인을 테넌트 홈에 적용">↪ 테넌트 적용</button>
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

      {applyFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setApplyFor(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-base font-bold text-gray-900">테넌트에 디자인 적용</div>
            <div className="mt-1 text-sm text-gray-500"><b className="text-gray-800">{applyFor.name}</b> 구성으로 선택한 테넌트의 <b>홈 페이지</b>를 다시 만듭니다.</div>
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              홈의 기존 섹션 구성이 이 시안으로 <b>교체</b>됩니다. (설교·주보 등 콘텐츠 데이터는 그대로 유지)
            </div>

            {applyState === 'loading' ? (
              <div className="py-6 text-center text-sm text-gray-400">테넌트 목록 불러오는 중…</div>
            ) : applyState === 'done' ? (
              <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-3 text-sm font-medium text-emerald-700">{applyMsg}</div>
            ) : (
              <>
                <div className="mt-4 text-xs font-semibold text-gray-500">적용 방식</div>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setApplyMode('exact')}
                    className={`rounded-lg border px-3 py-2 text-left text-xs ${applyMode === 'exact' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                    <div className="font-bold">시안 그대로</div>
                    <div className="mt-0.5 text-[10px] opacity-80">시안과 동일한 디자인. 편집은 시안 편집기로.</div>
                  </button>
                  <button type="button" onClick={() => setApplyMode('blocks')}
                    className={`rounded-lg border px-3 py-2 text-left text-xs ${applyMode === 'blocks' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                    <div className="font-bold">블록으로</div>
                    <div className="mt-0.5 text-[10px] opacity-80">근접 재현. 페이지 편집기로 수정 쉬움.</div>
                  </button>
                </div>
                <label className="mt-4 block text-xs font-semibold text-gray-500">대상 테넌트</label>
                <select value={applySlug} onChange={(e) => setApplySlug(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
                  <option value="">{tenants.length === 0 ? '적용 가능한 테넌트 없음' : '테넌트를 선택하세요…'}</option>
                  {tenants.map((t) => <option key={t.slug} value={t.slug}>{t.name} ({t.slug})</option>)}
                </select>
                {applyState === 'error' && <div className="mt-2 text-xs font-medium text-red-600">{applyMsg}</div>}
              </>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setApplyFor(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                {applyState === 'done' ? '닫기' : '취소'}
              </button>
              {applyState !== 'done' && (
                <button onClick={doApply} disabled={!applySlug || applyState === 'applying' || applyState === 'loading'}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  {applyState === 'applying' ? '적용 중…' : '적용'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
