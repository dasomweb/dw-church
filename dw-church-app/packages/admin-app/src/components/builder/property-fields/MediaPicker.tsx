// MediaPicker — STAGE-1 STUB (b2bsmart port).
//
// b2bsmart's MediaPicker browses the tenant media library via
// useMediaLibrary(); dw-church's api-client doesn't expose that hook yet, so
// this is a minimal placeholder that keeps the interface (onClose / onSelect /
// onSelectMulti + MediaItem) intact for ImageField + ElementInspector. The
// real R2-backed media browser lands in the later media stage; for now the
// operator uploads via ImageField's upload button.
import { useEffect } from 'react';

export interface MediaItem {
  id: string;
  url: string;
  filename?: string;
  width?: number;
  height?: number;
}

interface Props {
  onClose: () => void;
  onSelect?: (item: MediaItem) => void;
  onSelectMulti?: (items: MediaItem[]) => void;
  multi?: boolean;
  // accepted for caller compatibility (ignored by the stub)
  preferredRatio?: string;
  preferredKind?: string;
}

export function MediaPicker({ onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-bold text-gray-900">미디어 라이브러리</h3>
        <p className="mt-2 text-sm text-gray-600">
          미디어 브라우저는 준비 중입니다. 지금은 이미지 필드의 <strong>업로드</strong> 버튼으로
          파일을 올려주세요. (R2 미디어 브라우저는 다음 단계에서 연결됩니다.)
        </p>
        <div className="mt-5 flex justify-end">
          <button onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
