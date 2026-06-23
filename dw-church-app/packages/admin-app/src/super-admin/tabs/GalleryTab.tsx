import { useState, useEffect, useRef } from 'react';
import { useToast } from '../../components';
import { useAuthStore } from '../../stores/auth';
import { resizeImage } from '../../utils/resize-image';

interface SharedImage {
  id: string;
  url: string;
  title: string;
  category: string;
  tags: string[];
  isActive: boolean;
}

const GALLERY_CATEGORIES = [
  { id: 'nature', label: '자연' },
  { id: 'flower', label: '꽃' },
  { id: 'sky', label: '하늘' },
  { id: 'park', label: '공원' },
  { id: 'cross', label: '십자가' },
  { id: 'church', label: '교회' },
  { id: 'bible', label: '성경' },
  { id: 'abstract', label: '추상' },
];

export default function GalleryTab() {
  const { showToast } = useToast();
  const [images, setImages] = useState<SharedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('nature');
  const [showUpload, setShowUpload] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const session = useAuthStore((s) => s.session);
  const token = session?.accessToken;

  const reload = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/shared-images?active=all', {
        headers: { Authorization: `Bearer ${token || ''}` },
      });
      const json = (await res.json()) as { data: SharedImage[] };
      setImages(json.data ?? []);
    } catch {
      showToast('error', '이미지를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void reload(); }, [token]);

  // Drag-drop or batch file select — every file goes up with category=auto
  // (server runs Gemini vision to pick a category).
  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (list.length === 0) return;
    setUploadingCount(list.length);
    let succeeded = 0;
    for (const file of list) {
      try {
        // Shared-library images are reused across many tenants → optimize hard
        // before upload: cap width at 1920px and re-encode as JPEG (q≈0.82).
        // Storage waste is a hard constraint. SVG/PDF/animated pass through.
        let toUpload: File = file;
        try {
          const resized = await resizeImage(file, 'background');
          toUpload = resized.file;
        } catch {
          // Resize failure (e.g. >20MB) → fall back to the original file.
        }
        const qs = new URLSearchParams({ title: file.name, category: 'auto' }).toString();
        const body = new FormData();
        body.append('file', toUpload);
        const res = await fetch(`/api/v1/admin/shared-images/upload?${qs}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token || ''}` },
          body,
        });
        if (!res.ok) throw new Error('upload failed');
        succeeded++;
        setUploadingCount((n) => n - 1);
      } catch {
        setUploadingCount((n) => n - 1);
      }
    }
    showToast(succeeded === list.length ? 'success' : 'error',
      `${succeeded}/${list.length}개 업로드 완료 (AI가 자동 분류했습니다)`);
    void reload();
  };

  const byCategory = images.filter((i) => i.category === activeCategory);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title}" 이미지를 삭제하시겠습니까?\n사용 중인 테넌트에는 자동으로 복사본이 만들어져 경로가 유지됩니다.`)) return;
    try {
      const res = await fetch(`/api/v1/admin/shared-images/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token || ''}` },
      });
      if (!res.ok) throw new Error('delete failed');
      const json = (await res.json().catch(() => ({}))) as { copiedToTenants?: number };
      const n = json.copiedToTenants ?? 0;
      showToast('success', n > 0 ? `삭제됨 — 사용 중인 ${n}개 테넌트에 복사본 생성됨` : '삭제되었습니다.');
      void reload();
    } catch {
      showToast('error', '삭제 실패');
    }
  };

  const handleToggleActive = async (img: SharedImage) => {
    try {
      const res = await fetch(`/api/v1/admin/shared-images/${img.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
        body: JSON.stringify({ isActive: !img.isActive }),
      });
      if (!res.ok) throw new Error('update failed');
      void reload();
    } catch {
      showToast('error', '상태 변경 실패');
    }
  };

  return (
    <div
      className="space-y-4"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length > 0) void handleFiles(e.dataTransfer.files);
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold">공용 이미지 라이브러리</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            드래그&드롭으로 여러 장 업로드 — AI가 카테고리를 자동 판별합니다. AI로 직접 생성할 수도 있어요.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowGenerate(true)}
            className="bg-purple-600 text-white px-3 py-1.5 text-sm rounded-lg hover:bg-purple-700"
          >
            ✨ AI로 생성
          </button>
          <button
            onClick={() => setShowUpload(true)}
            className="bg-indigo-600 text-white px-3 py-1.5 text-sm rounded-lg hover:bg-indigo-700"
          >
            + 이미지 업로드
          </button>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto">
        {GALLERY_CATEGORIES.map((c) => {
          const count = images.filter((i) => i.category === c.id).length;
          return (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
                activeCategory === c.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {c.label} {count > 0 && <span className="opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Drop zone shell — wraps grid so drop works on the entire area */}
      <div className={`relative rounded-lg border-2 border-dashed transition-colors ${
        dragOver ? 'border-indigo-500 bg-indigo-50/40' : 'border-transparent'
      }`}>
        {uploadingCount > 0 && (
          <div className="absolute top-2 right-2 z-10 bg-white shadow px-2.5 py-1 rounded-full text-xs text-indigo-700 border border-indigo-200">
            업로드 중 {uploadingCount}장...
          </div>
        )}
        {loading ? (
          <div className="text-sm text-gray-400 py-10 text-center">불러오는 중...</div>
        ) : byCategory.length === 0 ? (
          <div className="text-sm text-gray-400 py-14 text-center">
            이 카테고리에 등록된 이미지가 없습니다.
            <br />이미지 파일을 여기로 드래그해서 추가하세요.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-1">
            {byCategory.map((img) => (
              <div key={img.id} className={`group relative aspect-video rounded-lg overflow-hidden border ${img.isActive ? 'border-gray-200' : 'border-red-300 opacity-60'}`}>
                <img src={img.url} alt={img.title} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex flex-col justify-between p-2 opacity-0 group-hover:opacity-100">
                  <p className="text-white text-xs font-medium truncate">{img.title}</p>
                  <div className="flex gap-1">
                    <button onClick={() => handleToggleActive(img)} className="flex-1 text-[10px] bg-white/90 text-gray-800 py-1 rounded hover:bg-white">
                      {img.isActive ? '비활성' : '활성'}
                    </button>
                    <button onClick={() => handleDelete(img.id, img.title)} className="flex-1 text-[10px] bg-red-500 text-white py-1 rounded hover:bg-red-600">
                      삭제
                    </button>
                  </div>
                </div>
                {!img.isActive && (
                  <span className="absolute top-1 right-1 text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded">비활성</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showUpload && (
        <GalleryUploadModal
          defaultCategory={activeCategory}
          onClose={() => setShowUpload(false)}
          onUploaded={() => { setShowUpload(false); void reload(); }}
          token={token}
        />
      )}
      {showGenerate && (
        <GalleryGenerateModal
          onClose={() => setShowGenerate(false)}
          onGenerated={() => { setShowGenerate(false); void reload(); }}
          token={token}
        />
      )}
    </div>
  );
}

// AI generation modal — prompt + aspect-ratio multi-select. Server fans out
// across the chosen ratios, auto-classifies each result, and inserts rows.
const ASPECT_RATIO_OPTIONS: { id: '16:9' | '4:3' | '3:2' | '1:1' | '3:4' | '9:16'; label: string; hint: string }[] = [
  { id: '16:9', label: '16:9', hint: '히어로/배너' },
  { id: '4:3',  label: '4:3',  hint: '표준 와이드' },
  { id: '3:2',  label: '3:2',  hint: '카드' },
  { id: '1:1',  label: '1:1',  hint: '정사각/썸네일' },
  { id: '3:4',  label: '3:4',  hint: '세로 인물' },
  { id: '9:16', label: '9:16', hint: '모바일 전체화면' },
];

function GalleryGenerateModal({
  onClose,
  onGenerated,
  token,
}: {
  onClose: () => void;
  onGenerated: () => void;
  token?: string;
}) {
  const { showToast } = useToast();
  const [prompt, setPrompt] = useState('');
  const [ratios, setRatios] = useState<Record<string, boolean>>({ '16:9': true });
  const [generating, setGenerating] = useState(false);

  const toggle = (r: string) => setRatios((prev) => ({ ...prev, [r]: !prev[r] }));
  const selected = Object.entries(ratios).filter(([, v]) => v).map(([k]) => k);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) { showToast('error', '프롬프트를 입력하세요'); return; }
    if (selected.length === 0) { showToast('error', '비율을 하나 이상 선택하세요'); return; }
    setGenerating(true);
    try {
      const res = await fetch('/api/v1/admin/shared-images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
        body: JSON.stringify({ prompt: prompt.trim(), aspectRatios: selected }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.error?.message || '생성 실패');
      }
      const json = await res.json() as { data: unknown[]; failures?: string[] };
      showToast('success',
        `${json.data.length}장 생성 완료${json.failures?.length ? ` (실패: ${json.failures.join(', ')})` : ''}`);
      onGenerated();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '생성 실패');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={submit} className="bg-white rounded-xl w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold">✨ AI로 이미지 생성</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">프롬프트 *</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="예: 봄꽃이 만개한 공원의 아침 햇살, 파스텔톤, 부드러운 빛"
            className="w-full border rounded-lg px-3 py-2 text-sm leading-relaxed resize-y min-h-[100px]"
          />
          <p className="text-[11px] text-gray-400 mt-1">
            자연 · 풍경 · 빛 · 꽃 중심으로 묘사해주세요. 세부 분위기·색감을 함께 적으면 결과가 더 일관됩니다.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">비율 (복수 선택 가능)</label>
          <div className="grid grid-cols-3 gap-2">
            {ASPECT_RATIO_OPTIONS.map((opt) => {
              const checked = !!ratios[opt.id];
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggle(opt.id)}
                  className={`rounded-lg border px-2 py-2 text-left transition-colors ${
                    checked ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className={`text-xs font-semibold ${checked ? 'text-purple-700' : 'text-gray-700'}`}>
                    {opt.label} {checked && '✓'}
                  </p>
                  <p className="text-[10px] text-gray-500">{opt.hint}</p>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            선택한 비율만큼 이미지가 생성됩니다 (비율당 1장). 각각 R2에 저장되고 AI가 카테고리를 자동 분류합니다.
          </p>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={generating || !prompt.trim() || selected.length === 0}
            className="flex-1 bg-purple-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
          >
            {generating ? '생성 중... (최대 1~2분)' : `${selected.length || 0}장 생성`}
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">
            취소
          </button>
        </div>
      </form>
    </div>
  );
}

function GalleryUploadModal({
  defaultCategory,
  onClose,
  onUploaded,
  token,
}: {
  defaultCategory: string;
  onClose: () => void;
  onUploaded: () => void;
  token?: string;
}) {
  const { showToast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  // Default to the category the operator was viewing; 'AI 자동 분류' (auto)
  // lets the server vision-classify each image instead.
  const [category, setCategory] = useState(defaultCategory || 'auto');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: FileList | File[]) => {
    const imgs = Array.from(incoming).filter((f) => f.type.startsWith('image/'));
    if (imgs.length === 0) return;
    setFiles((prev) => [...prev, ...imgs]);
  };
  const removeAt = (i: number) => setFiles((prev) => prev.filter((_, x) => x !== i));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) { showToast('error', '이미지를 추가하세요'); return; }
    setUploading(true);
    setProgress({ done: 0, total: files.length });
    let succeeded = 0;
    for (const file of files) {
      try {
        // Shared-library images are reused across tenants → resize to 1920px
        // JPEG before upload. SVG/PDF/animated pass through; >20MB falls back.
        let toUpload: File = file;
        try {
          const resized = await resizeImage(file, 'background');
          toUpload = resized.file;
        } catch { /* keep original */ }
        const qs = new URLSearchParams({
          title: file.name,
          category,
          ...(tags.trim() ? { tags } : {}),
        }).toString();
        const body = new FormData();
        body.append('file', toUpload);
        const res = await fetch(`/api/v1/admin/shared-images/upload?${qs}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token || ''}` },
          body,
        });
        if (res.ok) succeeded++;
      } catch { /* count as failure */ }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }
    setUploading(false);
    showToast(succeeded === files.length ? 'success' : 'error',
      `${succeeded}/${files.length}장 업로드 완료${category === 'auto' ? ' (AI 자동 분류)' : ''}`);
    onUploaded();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={submit} className="bg-white rounded-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold">공용 이미지 업로드</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        {/* Multi-file drag & drop dropzone */}
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
          }}
          className={`cursor-pointer rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
            dragOver ? 'border-indigo-500 bg-indigo-50/60' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
          }`}
        >
          <div className="text-2xl">🖼️</div>
          <p className="mt-1 text-sm font-medium text-gray-700">여기로 여러 이미지를 드래그&드롭</p>
          <p className="text-xs text-gray-400">또는 클릭해서 선택 (여러 장 선택 가능)</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
          />
        </div>

        {/* Selected files */}
        {files.length > 0 && (
          <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-100 divide-y">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-1.5 text-xs">
                <span className="truncate text-gray-700">{f.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-gray-400">{(f.size / 1024 / 1024).toFixed(1)}MB</span>
                  <button type="button" onClick={() => removeAt(i)} className="text-red-400 hover:text-red-600">×</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">카테고리</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="auto">AI 자동 분류</option>
            {GALLERY_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">태그 (쉼표 구분, 선택)</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="봄, 꽃, 따뜻한"
            className="w-full border rounded-lg px-3 py-1.5 text-sm"
          />
        </div>
        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={uploading || files.length === 0}
            className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {uploading ? `업로드 중... ${progress.done}/${progress.total}` : `${files.length > 0 ? files.length + '장 ' : ''}업로드`}
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">
            취소
          </button>
        </div>
      </form>
    </div>
  );
}
