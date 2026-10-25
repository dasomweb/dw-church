import { useRef, useState } from 'react';

export interface UploadedDoc {
  url: string;
  name?: string;
}

interface MultiFileUploadProps {
  value: UploadedDoc[];
  onChange: (files: UploadedDoc[]) => void;
  /** 고른 파일을 R2 에 올리고 공개 URL 을 돌려준다. */
  onUpload: (file: File) => Promise<string>;
  label?: string;
  /** picker 의 accept. 기본은 PDF + 워드. */
  accept?: string;
  max?: number;
  help?: string;
}

/** URL 에서 파일명만 뽑는다. 서버가 비이미지 파일은 **원본 파일명을 R2 키에 보존**하므로
 *  (files/service.ts safeDocumentName) 대개 의미 있는 이름이 나온다. */
export function fileNameFromUrl(url: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname.split('/').pop() || url);
  } catch {
    return url.split('/').pop() || url;
  }
}

/**
 * MultiFileUpload — 문서 여러 개(활동학습 자료 PDF·워드 등)를 올리는 picker.
 *
 * ImageUpload/MultiImageUpload 의 문서 버전. 이미지와 달리 리사이즈하지 않고,
 * **표시 이름을 따로 저장**한다 — 성도는 "활동지_1과.pdf" 보다 "3~5세 활동지"가
 * 더 알아보기 쉽고, 교회가 파일을 교체해도 이름은 유지되기 때문.
 */
export function MultiFileUpload({
  value,
  onChange,
  onUpload,
  label,
  accept = 'application/pdf,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  max = 10,
  help,
}: MultiFileUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    setError(null);
    const room = max - value.length;
    if (room <= 0) { setError(`최대 ${max}개까지 올릴 수 있습니다.`); return; }

    setUploading(true);
    const added: UploadedDoc[] = [];
    try {
      for (const f of picked.slice(0, room)) {
        const url = await onUpload(f);
        // 표시 이름은 확장자를 뗀 원본 파일명 — 운영자가 바로 고칠 수 있다.
        added.push({ url, name: f.name.replace(/\.[^.]+$/, '') });
      }
      onChange([...value, ...added]);
    } catch {
      setError('업로드에 실패했습니다. 파일 크기(최대 25MB)를 확인해주세요.');
      if (added.length > 0) onChange([...value, ...added]); // 올라간 것까지는 살린다
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const setName = (i: number, name: string) => {
    const next = [...value];
    next[i] = { ...next[i]!, name };
    onChange(next);
  };
  const remove = (i: number) => onChange(value.filter((_, x) => x !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    const [m] = next.splice(i, 1);
    next.splice(j, 0, m!);
    onChange(next);
  };

  return (
    <div>
      {label && <p className="mb-1.5 text-sm font-medium text-gray-700">{label}</p>}

      {value.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {value.map((f, i) => (
            <li key={`${f.url}-${i}`} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
              <span className="shrink-0 text-gray-400" aria-hidden="true">📄</span>
              <input
                value={f.name ?? ''}
                onChange={(e) => setName(i, e.target.value)}
                placeholder={fileNameFromUrl(f.url)}
                className="min-w-0 flex-1 rounded border border-transparent px-1.5 py-1 text-sm hover:border-gray-300 focus:border-blue-500 focus:outline-none"
                aria-label="표시 이름"
              />
              <a href={f.url} target="_blank" rel="noopener noreferrer"
                className="shrink-0 text-xs text-blue-600 hover:underline">열기</a>
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                className="shrink-0 px-1 text-gray-400 hover:text-gray-700 disabled:opacity-30" aria-label="위로">↑</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === value.length - 1}
                className="shrink-0 px-1 text-gray-400 hover:text-gray-700 disabled:opacity-30" aria-label="아래로">↓</button>
              <button type="button" onClick={() => remove(i)}
                className="shrink-0 text-sm text-red-500 hover:text-red-700">삭제</button>
            </li>
          ))}
        </ul>
      )}

      <input ref={fileRef} type="file" accept={accept} multiple onChange={handleFiles} className="hidden" />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading || value.length >= max}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {uploading ? '올리는 중...' : value.length >= max ? `최대 ${max}개` : '＋ 파일 선택 (PDF · 워드)'}
      </button>

      {help && !error && <p className="mt-1 text-xs text-gray-400">{help}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
