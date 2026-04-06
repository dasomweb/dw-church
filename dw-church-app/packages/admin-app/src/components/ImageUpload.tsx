import { useState, useRef } from 'react';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  /** Optional: upload file to server and return URL instead of base64 DataURL */
  onUpload?: (file: File) => Promise<string>;
  label?: string;
  accept?: string;
  aspectRatio?: string;
  placeholder?: string;
}

export function ImageUpload({
  value,
  onChange,
  onUpload,
  label,
  accept = 'image/*',
  aspectRatio = '16/9',
  placeholder = '이미지를 선택하거나 URL을 입력하세요',
}: ImageUploadProps) {
  const [mode, setMode] = useState<'url' | 'preview'>(value ? 'preview' : 'url');
  const [urlInput, setUrlInput] = useState(value || '');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (onUpload) {
      // Upload to server and get URL
      setUploading(true);
      try {
        const url = await onUpload(file);
        onChange(url);
        setMode('preview');
      } catch {
        // Fallback to base64 on error
        const reader = new FileReader();
        reader.onload = () => {
          onChange(reader.result as string);
          setMode('preview');
        };
        reader.readAsDataURL(file);
      } finally {
        setUploading(false);
      }
    } else {
      // Fallback: base64 DataURL
      const reader = new FileReader();
      reader.onload = () => {
        onChange(reader.result as string);
        setMode('preview');
      };
      reader.readAsDataURL(file);
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
      <div className="relative group">
        {label && <p className="text-sm font-medium text-gray-700 mb-1.5">{label}</p>}
        <div className="relative rounded-lg overflow-hidden border border-gray-200" style={{ aspectRatio }}>
          <img src={value} alt="미리보기" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <button
              type="button"
              onClick={() => { setMode('url'); setUrlInput(value); }}
              className="bg-white text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium shadow"
            >
              변경
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium shadow"
            >
              삭제
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {label && <p className="text-sm font-medium text-gray-700 mb-1.5">{label}</p>}
      <div
        className={`border-2 border-dashed border-gray-300 rounded-lg p-6 text-center transition-colors ${uploading ? 'opacity-60 pointer-events-none' : 'hover:border-blue-400 cursor-pointer'}`}
        onClick={() => !uploading && fileRef.current?.click()}
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
    </div>
  );
}

interface MultiImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  /** Optional: upload file to server and return URL instead of base64 DataURL */
  onUpload?: (file: File) => Promise<string>;
  max?: number;
  label?: string;
}

export function MultiImageUpload({ value = [], onChange, onUpload, max = 15, label }: MultiImageUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const remaining = max - value.length;
    const toAdd = Array.from(files).slice(0, remaining);

    if (onUpload) {
      setUploading(true);
      try {
        const urls: string[] = [];
        for (const file of toAdd) {
          const url = await onUpload(file);
          urls.push(url);
        }
        onChange([...value, ...urls]);
      } catch {
        // Fallback to base64
        const promises = toAdd.map((file) =>
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
      const promises = toAdd.map((file) =>
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
    [arr[from], arr[to]] = [arr[to], arr[from]];
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
            className={`border-2 border-dashed border-gray-300 rounded-lg p-4 text-center transition-colors ${uploading ? 'opacity-60 pointer-events-none' : 'hover:border-blue-400 cursor-pointer'}`}
            onClick={() => !uploading && fileRef.current?.click()}
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
        </>
      )}
      {value.length >= max && (
        <p className="text-amber-600 text-xs mt-1">최대 {max}개까지 업로드 가능합니다.</p>
      )}
    </div>
  );
}
