/**
 * 프론트 샘플 에디터 (슈퍼어드민 전용).
 * 샘플 HTML을 <iframe>(srcDoc, same-origin) 안에서 직접 편집한다:
 *   - 텍스트: body contenteditable → 클릭해서 바로 수정
 *   - 사진: <image-slot> 클릭 → 업로드하거나 샘플 사진으로 교체
 * 저장하면 편집된 전체 HTML을 서버(public.front_sample_edits)에 보관하고,
 * 갤러리는 기본 HTML 위에 이 편집본을 덮어 렌더한다. (자동 저장 없음 — 저장 클릭 시에만)
 */
import { useCallback, useRef, useState } from 'react';
import type { CanvasSample } from './canvas/canvas-index';
import { useAdminApi } from '../shared/use-admin-api';
import { useAuthStore } from '../../stores/auth';

const SAMPLE_BASE = 'https://pub-674328f08783498389f7857dc6e1ab00.r2.dev/_samples/frontpage';
// 슬롯 클릭 시 고를 수 있는 기본 샘플 사진 풀.
const POOL: [string, string][] = [
  ['sermon-1', '설교 (목사)'], ['worship-1', '찬양팀'], ['worship-2', '회중 예배'],
  ['pray-1', '기도'], ['group-1', '소그룹 (거실)'], ['group-2', '청년 소그룹'],
  ['serving-1', '구제 봉사'], ['serving-2', '배식 봉사'], ['retreat-1', '여름 수련회'],
  ['church-1', '교회 외관'], ['church-2', '예배당 내부'],
  ['bible-1', '성경'], ['bible-coffee-1', '성경 + 커피'], ['sky-1', '하늘'], ['sky-2', '노을'],
];

const EDITOR_CSS = `
#__ed_style{}
image-slot[data-edit]{cursor:pointer!important}
image-slot[data-edit]:hover{outline:3px solid #2b7fff;outline-offset:-3px}
.__ed_badge{position:absolute;top:8px;left:8px;z-index:20;background:#2b7fff;color:#fff;font-size:12px;font-weight:700;padding:4px 9px;border-radius:6px;pointer-events:none;opacity:0;transition:opacity .12s;font-family:'Pretendard',sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.25)}
image-slot[data-edit]:hover .__ed_badge{opacity:1}
body[contenteditable="true"]{outline:none}
[contenteditable="true"]:focus{outline:2px dashed rgba(43,127,255,.45);outline-offset:2px}
`;

// 파일 → 캔버스로 리사이즈(최대 1600px) → JPEG Blob. (스토리지 낭비 방지)
function resizeToBlob(file: File, max = 1600): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.naturalWidth, h = img.naturalHeight;
      if (w > max || h > max) { const s = Math.min(max / w, max / h); w = Math.round(w * s); h = Math.round(h * s); }
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const ctx = c.getContext('2d'); if (!ctx) return reject(new Error('canvas'));
      ctx.drawImage(img, 0, 0, w, h);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), 'image/jpeg', 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load')); };
    img.src = url;
  });
}

export default function FrontSampleEditor({
  sample, baseHtml, hasOverride, onClose, onSaved, onReverted,
}: {
  sample: CanvasSample;
  baseHtml: string;
  hasOverride: boolean;
  onClose: () => void;
  onSaved: (cardId: string, html: string) => void;
  onReverted: (cardId: string) => void;
}) {
  const apiFetch = useAdminApi();
  const session = useAuthStore((s) => s.session);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pickerEl = useRef<HTMLElement | null>(null);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const setupEditor = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc || doc.getElementById('__ed_style')) return;
    const st = doc.createElement('style'); st.id = '__ed_style'; st.textContent = EDITOR_CSS; doc.head.appendChild(st);
    doc.body.setAttribute('contenteditable', 'true');
    doc.querySelectorAll('image-slot').forEach((raw) => {
      const el = raw as HTMLElement;
      el.setAttribute('contenteditable', 'false');
      el.setAttribute('data-edit', 'img');
      const badge = doc.createElement('div');
      badge.className = '__ed_badge'; badge.textContent = '📷 사진 교체';
      badge.setAttribute('contenteditable', 'false');
      el.appendChild(badge);
      el.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        pickerEl.current = el; setPickerOpen(true);
      });
    });
  }, []);

  const applyImage = useCallback((url: string) => {
    const el = pickerEl.current;
    if (el) {
      el.setAttribute('data-filled', '');
      el.style.backgroundImage = `url('${url}')`;
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
      el.style.backgroundRepeat = 'no-repeat';
      setDirty(true);
    }
    setPickerOpen(false);
  }, []);

  const onFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    setUploading(true);
    try {
      const blob = await resizeToBlob(f);
      const host = window.location.hostname;
      const baseUrl = host.startsWith('admin.')
        ? `https://api.${host.replace('admin.', '')}`
        : ((import.meta.env.VITE_API_BASE_URL as string) || '');
      const fd = new FormData();
      fd.append('file', blob, 'upload.jpg');
      const res = await fetch(`${baseUrl}/api/v1/admin/front-samples/upload`, {
        method: 'POST', headers: { Authorization: `Bearer ${session?.accessToken || ''}` }, body: fd,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      applyImage(j.data.url as string);
    } catch (err) {
      alert('이미지 업로드 실패: ' + (err as Error).message);
    } finally {
      setUploading(false);
    }
  }, [session?.accessToken, applyImage]);

  const save = useCallback(async () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const clone = doc.documentElement.cloneNode(true) as HTMLElement;
    clone.querySelector('#__ed_style')?.remove();
    clone.querySelectorAll('.__ed_badge').forEach((n) => n.remove());
    clone.querySelectorAll('[contenteditable]').forEach((n) => n.removeAttribute('contenteditable'));
    clone.querySelectorAll('[data-edit]').forEach((n) => n.removeAttribute('data-edit'));
    const html = '<!doctype html>' + clone.outerHTML;
    setSaving(true);
    try {
      await apiFetch(`/front-samples/${sample.id}`, { method: 'PUT', body: JSON.stringify({ html }) });
      onSaved(sample.id, html);
      onClose();
    } catch (err) {
      alert('저장 실패: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [apiFetch, sample.id, onSaved, onClose]);

  const revert = useCallback(async () => {
    if (!confirm('이 시안을 기본값으로 되돌릴까요? 편집한 내용이 삭제됩니다.')) return;
    setSaving(true);
    try {
      await apiFetch(`/front-samples/${sample.id}`, { method: 'DELETE' });
      onReverted(sample.id);
      onClose();
    } catch (err) {
      alert('되돌리기 실패: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [apiFetch, sample.id, onReverted, onClose]);

  // Edit at the sample's native 1280px width (matches the preview) so full-bleed
  // heroes fill the full width and layout matches what applicants see.
  const width = device === 'mobile' ? 390 : 1280;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3">
        <div>
          <div className="text-sm font-bold text-gray-900">
            편집 · {sample.name} <span className="ml-1 text-[11px] font-mono text-gray-400">{sample.code}</span>
          </div>
          <div className="text-[11px] text-gray-500">텍스트는 클릭해 바로 수정 · 사진 자리는 클릭해 교체 {dirty && <span className="ml-1 font-semibold text-amber-600">· 저장 안 됨</span>}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 p-0.5 text-xs">
            {(['desktop', 'mobile'] as const).map((d) => (
              <button key={d} onClick={() => setDevice(d)}
                className={`rounded-md px-3 py-1 font-medium ${device === d ? 'bg-blue-600 text-white' : 'text-gray-600'}`}>
                {d === 'desktop' ? '데스크톱' : '모바일'}
              </button>
            ))}
          </div>
          {hasOverride && (
            <button onClick={revert} disabled={saving}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">기본값 복원</button>
          )}
          <button onClick={save} disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? '저장 중…' : '저장'}
          </button>
          <button onClick={onClose} disabled={saving}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">닫기 ✕</button>
        </div>
      </div>

      <div className="relative flex-1 overflow-auto bg-gray-100 p-4">
        <div className="mx-auto bg-white shadow-xl" style={{ width, maxWidth: device === 'mobile' ? '100%' : 'none', height: '100%' }}>
          <iframe ref={iframeRef} title={`edit-${sample.name}`} srcDoc={baseHtml} onLoad={setupEditor}
            className="h-full w-full" style={{ border: 0 }} />
        </div>

        {pickerOpen && (
          <div className="absolute inset-0 flex items-stretch justify-end bg-black/40" onClick={() => setPickerOpen(false)}>
            <div className="flex w-[420px] max-w-full flex-col bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                <div className="text-sm font-bold text-gray-900">사진 교체</div>
                <button onClick={() => setPickerOpen(false)} className="text-gray-400 hover:text-gray-700">✕</button>
              </div>
              <div className="border-b border-gray-100 p-4">
                <label className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 px-4 py-4 text-sm font-semibold text-blue-700 hover:bg-blue-100">
                  {uploading ? '업로드 중…' : '＋ 내 사진 업로드'}
                  <input type="file" accept="image/*" className="hidden" onChange={onFile} disabled={uploading} />
                </label>
                <p className="mt-2 text-[11px] text-gray-400">업로드 시 자동으로 최대 1600px JPEG로 최적화되어 저장됩니다.</p>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <div className="mb-2 text-[11px] font-semibold text-gray-500">샘플 사진에서 고르기</div>
                <div className="grid grid-cols-3 gap-2">
                  {POOL.map(([key, label]) => (
                    <button key={key} onClick={() => applyImage(`${SAMPLE_BASE}/${key}.jpg`)}
                      className="group overflow-hidden rounded-lg border border-gray-200 hover:border-blue-400" title={label}>
                      <div className="h-16 w-full bg-cover bg-center" style={{ backgroundImage: `url('${SAMPLE_BASE}/${key}.jpg')` }} />
                      <div className="truncate px-1.5 py-1 text-[10px] text-gray-600 group-hover:text-blue-700">{label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
