import { useRef, useState } from 'react';

interface FileUploadProps {
  /** Current file URL (already on R2), or '' when none. */
  value: string;
  onChange: (url: string) => void;
  /** Upload the picked file to R2 and return its public URL. */
  onUpload: (file: File) => Promise<string>;
  label?: string;
  /** Accept filter for the picker. Defaults to PDF. */
  accept?: string;
  /** Human hint shown under the control. */
  help?: string;
}

/**
 * FileUpload — a file picker for non-image documents (주보 PDF 등).
 *
 * Why this exists: the bulletin form previously asked the admin to paste a
 * "PDF URL" into a text box — but a church admin has a PDF *file*, not a URL.
 * This uploads the chosen file to R2 (via onUpload) and stores the returned
 * URL, the same way ImageUpload does for pictures. Shows the current file as
 * a link with 변경/삭제 once set.
 */
export function FileUpload({
  value,
  onChange,
  onUpload,
  label,
  accept = 'application/pdf,.pdf',
  help,
}: FileUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileName = (() => {
    if (!value) return '';
    try {
      const path = new URL(value).pathname;
      return decodeURIComponent(path.split('/').pop() || value);
    } catch {
      return value.split('/').pop() || value;
    }
  })();

  const pick = () => fileRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const url = await onUpload(file);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드에 실패했습니다.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const remove = () => {
    onChange('');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div>
      {label && <p className="text-sm font-medium text-gray-700 mb-1.5">{label}</p>}

      <input
        ref={fileRef}
        type="file"
        accept={accept}
        onChange={(e) => void handleFile(e)}
        className="hidden"
      />

      {value ? (
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <svg className="w-6 h-6 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 2a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6H6zm7 1.5L18.5 9H13V3.5z" />
          </svg>
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="flex-1 truncate text-sm font-medium text-blue-600 hover:underline"
            title={fileName}
          >
            {fileName || '첨부된 파일'}
          </a>
          <button
            type="button"
            onClick={pick}
            disabled={uploading}
            className="text-xs font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50"
          >
            {uploading ? '업로드 중…' : '변경'}
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={uploading}
            className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
          >
            삭제
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={pick}
          disabled={uploading}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-white px-4 py-6 text-sm font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.9A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          {uploading ? '업로드 중…' : '파일 선택 (PDF)'}
        </button>
      )}

      {help && !error && <p className="mt-1.5 text-xs text-gray-500">{help}</p>}
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
