import { useState, useRef, useEffect } from 'react';
import { resizeImage } from '../utils/resize-image.js';
import type { ResizePreset, ResizeResult, OutputFormat } from '../utils/resize-image.js';
import { MediaPicker } from './builder/property-fields/MediaPicker';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  /** Optional: upload file to server and return URL instead of base64 DataURL */
  onUpload?: (file: File) => Promise<string>;
  label?: string;
  accept?: string;
  aspectRatio?: string;
  placeholder?: string;
  /** Phase 12-γ.2: resize preset before R2 upload. See [[feedback_image_resize]].
   *  Defaults to 'block' (1600px). Use 'hero' for banner images,
   *  'avatar' for staff/profile photos. */
  resize?: ResizePreset;
  /** Output encoding. Default 'jpeg' (smallest). Use 'auto' for logos/favicons/
   *  icons so a transparent PNG keeps its PNG type + alpha (still resized). */
  format?: OutputFormat;
}

export function ImageUpload({
  value,
  onChange,
  onUpload,
  label,
  accept = 'image/*',
  aspectRatio = '16/9',
  placeholder = '이미지를 선택하거나 URL을 입력하세요',
  resize = 'block',
  format = 'jpeg',
}: ImageUploadProps) {
  const [mode, setMode] = useState<'url' | 'preview'>(value ? 'preview' : 'url');
  const [urlInput, setUrlInput] = useState(value || '');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [resizeInfo, setResizeInfo] = useState<ResizeResult | null>(null);
  const [resizeError, setResizeError] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Sync mode when value changes externally (e.g. AI generation)
  useEffect(() => {
    if (value) {
      setMode('preview');
    } else {
      setMode('url');
      setUrlInput('');
    }
  }, [value]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void processFile(file);
  };

  const processFile = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    setResizeError(null);
    setResizeInfo(null);

    // Phase 12-γ.2: client-side resize before R2 upload.
    // See [[feedback_image_resize]] — R2 storage cost is the constraint.
    let toUpload: File = file;
    try {
      const result = await resizeImage(file, resize, { format });
      toUpload = result.file;
      setResizeInfo(result);
    } catch (err) {
      // Hard reject path — file > 20 MB. Surface the error and abort.
      setResizeError(err instanceof Error ? err.message : '이미지 처리 실패');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    if (onUpload) {
      // Upload to server and get URL
      setUploading(true);
      try {
        const url = await onUpload(toUpload);
        onChange(url);
        setMode('preview');
      } catch {
        // Fallback to base64 on error
        const reader = new FileReader();
        reader.onload = () => {
          onChange(reader.result as string);
          setMode('preview');
        };
        reader.readAsDataURL(toUpload);
      } finally {
        setUploading(false);
      }
    } else {
      // Fallback: base64 DataURL (still uses resized blob)
      const reader = new FileReader();
      reader.onload = () => {
        onChange(reader.result as string);
        setMode('preview');
      };
      reader.readAsDataURL(toUpload);
    }
  };

  const handleUrlApply = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      setMode('preview');
    }
  };

  const handleRemove = () => {
    onChange('');
    setUrlInput('');
    setMode('url');
    if (fileRef.current) fileRef.current.value = '';
  };

  if (mode === 'preview' && value) {
    return (
      <div>
        {label && <p className="text-sm font-medium text-gray-700 mb-1.5">{label}</p>}
        {/* object-contain (not cover) so portrait/세로 photos show in full inside the
            preview frame instead of being cropped to the center strip. The checkered
            bg hints at the letterbox area without implying the photo is that shape. */}
        <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50" style={{ aspectRatio }}>
          <img src={value} alt="미리보기" className="w-full h-full object-contain" />
        </div>
        {/* Always-visible controls. These were previously hover-only
            (opacity-0 group-hover:opacity-100), so on touch devices
            (tablet/phone — no hover) the operator could never change or
            delete an uploaded image. A visible button row works on every
            device. */}
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => { setMode('url'); setUrlInput(value); }}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            이미지 변경
          </button>
          <button
            type="button"
            onClick={handleRemove}
            className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            삭제
          </button>
        </div>
        {resizeInfo && !resizeInfo.skipped && (
          <p className="mt-1 text-[10px] text-gray-400">
            최적화: {formatBytes(resizeInfo.originalBytes)} → {formatBytes(resizeInfo.resizedBytes)}
            {' '}({Math.round((1 - resizeInfo.resizedBytes / resizeInfo.originalBytes) * 100)}% 절감)
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      {label && <p className="text-sm font-medium text-gray-700 mb-1.5">{label}</p>}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          uploading ? 'opacity-60 pointer-events-none border-gray-300'
            : dragOver ? 'border-blue-500 bg-blue-50/60 cursor-pointer'
            : 'border-gray-300 hover:border-blue-400 cursor-pointer'
        }`}
        onClick={() => !uploading && fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!uploading) setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file && !uploading) void processFile(file);
        }}
      >
        <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
        {uploading ? (
          <>
            <div className="w-8 h-8 mx-auto mb-2 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-blue-500">업로드 중...</p>
          </>
        ) : (
          <>
            <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-500">{placeholder}</p>
            <p className="text-xs text-gray-400 mt-1">클릭하여 파일 선택</p>
          </>
        )}
      </div>
      {/* Pick from the tenant media library (previously-uploaded images). */}
      <button
        type="button"
        onClick={() => setShowLibrary(true)}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors"
      >
        <span>🖼️</span> 미디어 라이브러리에서 선택
      </button>
      {showLibrary && (
        <MediaPicker
          onClose={() => setShowLibrary(false)}
          onSelect={(item) => { onChange(item.url); setMode('preview'); setShowLibrary(false); }}
        />
      )}
      <div className="flex gap-2 mt-2">
        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleUrlApply())}
          placeholder="또는 이미지 URL 입력"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        />
        <button
          type="button"
          onClick={handleUrlApply}
          disabled={!urlInput.trim()}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
        >
          적용
        </button>
      </div>
      {resizeError && (
        <p className="mt-1 text-xs text-red-600">{resizeError}</p>
      )}
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

interface MultiImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  /** Optional: upload file to server and return URL instead of base64 DataURL */
  onUpload?: (file: File) => Promise<string>;
  max?: number;
  label?: string;
  /** Phase 12-γ.2: resize preset before R2 upload. Defaults to 'thumb'
   *  (800px) — galleries usually display ≤ 400px. */
  resize?: ResizePreset;
}

export function MultiImageUpload({ value = [], onChange, onUpload, max = 15, label, resize = 'thumb' }: MultiImageUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  // Phase 12-γ.2: surface per-batch resize savings + reject errors.
  const [resizeError, setResizeError] = useState<string | null>(null);
  const [batchSaved, setBatchSaved] = useState<{ original: number; resized: number } | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) void processFiles(e.target.files);
  };

  const processFiles = async (files: FileList | File[]) => {
    const imgs = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (imgs.length === 0) return;
    const remaining = max - value.length;
    const toAdd = imgs.slice(0, remaining);
    setResizeError(null);
    setBatchSaved(null);

    // Phase 12-γ.2: resize each file sequentially (memory pressure if
    // parallel — phone batch upload of 20 photos would balloon). See
    // [[feedback_image_resize]] §3.
    const resized: File[] = [];
    let totalOriginal = 0;
    let totalResized = 0;
    for (const file of toAdd) {
      try {
        const r = await resizeImage(file, resize);
        resized.push(r.file);
        totalOriginal += r.originalBytes;
        totalResized += r.resizedBytes;
      } catch (err) {
        // Reject path — file too large. Stop the batch and surface error.
        setResizeError(err instanceof Error ? err.message : '이미지 처리 실패');
        if (fileRef.current) fileRef.current.value = '';
        return;
      }
    }
    if (totalOriginal > totalResized) {
      setBatchSaved({ original: totalOriginal, resized: totalResized });
    }

    if (onUpload) {
      setUploading(true);
      try {
        const urls: string[] = [];
        for (const file of resized) {
          const url = await onUpload(file);
          urls.push(url);
        }
        onChange([...value, ...urls]);
      } catch {
        // Fallback to base64 (still using resized files)
        const promises = resized.map((file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          })
        );
        const results = await Promise.all(promises);
        onChange([...value, ...results]);
      } finally {
        setUploading(false);
      }
    } else {
      const promises = resized.map((file) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        })
      );
      Promise.all(promises).then((results) => onChange([...value, ...results]));
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleAddUrl = () => {
    if (urlInput.trim() && value.length < max) {
      onChange([...value, urlInput.trim()]);
      setUrlInput('');
    }
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleMove = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return;
    const arr = [...value];
    // Both indices are in-bounds (to is range-checked above; from is a valid item index), so values are non-null.
    const tmp = arr[from]!;
    arr[from] = arr[to]!;
    arr[to] = tmp;
    onChange(arr);
  };

  return (
    <div>
      {label && (
        <p className="text-sm font-medium text-gray-700 mb-1.5">
          {label} <span className="text-gray-400 font-normal">({value.length}/{max})</span>
        </p>
      )}

      {value.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mb-3">
          {value.map((url, i) => (
            <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200">
              <img src={url} alt={`이미지 ${i + 1}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                {i > 0 && (
                  <button type="button" onClick={() => handleMove(i, i - 1)} className="bg-white w-6 h-6 rounded-full text-xs shadow">←</button>
                )}
                {i < value.length - 1 && (
                  <button type="button" onClick={() => handleMove(i, i + 1)} className="bg-white w-6 h-6 rounded-full text-xs shadow">→</button>
                )}
                <button type="button" onClick={() => handleRemove(i)} className="bg-red-500 text-white w-6 h-6 rounded-full text-xs shadow">×</button>
              </div>
              {i === 0 && (
                <span className="absolute top-1 left-1 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded">대표</span>
              )}
            </div>
          ))}
        </div>
      )}

      {value.length < max && (
        <>
          <div
            className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
              uploading ? 'opacity-60 pointer-events-none border-gray-300'
                : dragOver ? 'border-blue-500 bg-blue-50/60 cursor-pointer'
                : 'border-gray-300 hover:border-blue-400 cursor-pointer'
            }`}
            onClick={() => !uploading && fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); if (!uploading) setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files.length > 0 && !uploading) void processFiles(e.dataTransfer.files);
            }}
          >
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
            {uploading ? (
              <>
                <div className="w-6 h-6 mx-auto mb-1 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-blue-500">업로드 중...</p>
              </>
            ) : (
              <p className="text-sm text-gray-500">+ 이미지 추가 (클릭 또는 드래그)</p>
            )}
          </div>
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddUrl())}
              placeholder="이미지 URL 입력"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
            <button type="button" onClick={handleAddUrl} disabled={!urlInput.trim()} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
              추가
            </button>
          </div>
          {/* Pick one or more from the tenant media library. */}
          <button
            type="button"
            onClick={() => setShowLibrary(true)}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors"
          >
            <span>🖼️</span> 미디어 라이브러리에서 선택
          </button>
        </>
      )}
      {showLibrary && (
        <MediaPicker
          multi
          onClose={() => setShowLibrary(false)}
          onSelectMulti={(items) => {
            const remaining = max - value.length;
            const urls = items.map((it) => it.url).slice(0, Math.max(0, remaining));
            if (urls.length > 0) onChange([...value, ...urls]);
            setShowLibrary(false);
          }}
        />
      )}
      {value.length >= max && (
        <p className="text-amber-600 text-xs mt-1">최대 {max}개까지 업로드 가능합니다.</p>
      )}
      {resizeError && (
        <p className="mt-1 text-xs text-red-600">{resizeError}</p>
      )}
      {batchSaved && (
        <p className="mt-1 text-[10px] text-gray-400">
          일괄 최적화: {formatBytes(batchSaved.original)} → {formatBytes(batchSaved.resized)}
          {' '}({Math.round((1 - batchSaved.resized / batchSaved.original) * 100)}% 절감)
        </p>
      )}
    </div>
  );
}
