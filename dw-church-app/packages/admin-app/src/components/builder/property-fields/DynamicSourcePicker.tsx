import { useMemo, useState } from 'react';
import {
  DYNAMIC_SOURCES,
  makeDynamicRef,
  dynamicRefLabel,
  isDynamicRef,
  type DynamicRef,
  type DynamicContext,
  type DynamicSourceOption,
} from '@dw-church/blocks/builder';
// STAGE-1 STUB — product field schema is b2b-specific; church dynamic field
// schema arrives in the dynamic-source stage.
const useProductFieldSchema = (): { data: unknown; isLoading: boolean } => ({ data: undefined, isLoading: false });

/**
 * 인스펙터의 text / image / url field 옆에 ⚙ 아이콘으로 노출되는 picker.
 * 운영자가 Static (직접 입력) vs Dynamic (current product/post/catalog
 * 데이터 binding) 을 선택. 대표님 2026-05-27 직접 지시 (Elementor 패턴).
 *
 * 사용처: ElementInspector 의 FieldControl 안에서 text/image/url/html
 * kind 의 field 마다 wrapping.
 */

export interface DynamicSourcePickerProps {
  /** 현재 field 의 값 — string (static) 또는 DynamicRef (dynamic). */
  value: unknown;
  onChange: (next: unknown) => void;
  /** 이 field 가 받을 수 있는 kind (DYNAMIC_SOURCES filter 기준). */
  fieldKind: 'text' | 'image' | 'url' | 'number' | 'html';
  /** 현재 페이지의 kind (product_detail / blog_post / catalog_detail 등).
   *  이에 따라 사용 가능한 context 결정. 'static' 페이지는 dynamic 불가. */
  availableContexts: DynamicContext[];
  /** product context 의 customFields.* dynamic 옵션 생성 여부. true 면
   *  product field schema (api-client 의 useProductFieldSchema) fetch
   *  결과로 dropdown 자동 확장. */
  loadProductFields?: boolean;
  /** 안내 텍스트 (선택). */
  hint?: string;
  /** 닫기 콜백. */
  onClose: () => void;
}

export function DynamicSourcePicker({
  value,
  onChange,
  fieldKind,
  availableContexts,
  loadProductFields = true,
  hint,
  onClose,
}: DynamicSourcePickerProps) {
  const currentRef = isDynamicRef(value) ? (value as DynamicRef) : null;
  const [context, setContext] = useState<DynamicContext>(
    currentRef?.context ?? availableContexts[0] ?? 'product',
  );
  const [path, setPath] = useState(currentRef?.path ?? '');

  // product context 에서만 — customFields 동적 옵션 (운영자 정의 field schema)
  const productFieldsQ = useProductFieldSchema();
  const customFieldOptions: DynamicSourceOption[] = useMemo(() => {
    if (context !== 'product' || !loadProductFields) return [];
    const schema = productFieldsQ.data as { fields?: Array<{ key: string; label: string; type: string }> } | undefined;
    const fields = schema?.fields ?? [];
    return fields.map((f) => ({
      path: `customFields.${f.key}`,
      label: `Product · ${f.label} (custom)`,
      applicableKinds:
        f.type === 'image' ? ['image', 'url']
        : f.type === 'url'   ? ['url', 'text']
        : f.type === 'bool'  ? ['text']
        : ['text'],
    } as DynamicSourceOption));
  }, [context, productFieldsQ.data, loadProductFields]);

  const allOptions = useMemo(() => {
    const base = DYNAMIC_SOURCES[context] ?? [];
    const merged = [...base, ...customFieldOptions];
    return merged.filter((o) => o.applicableKinds.includes(fieldKind));
  }, [context, customFieldOptions, fieldKind]);

  const handleApply = () => {
    if (!path) return;
    onChange(makeDynamicRef(context, path));
    onClose();
  };

  const handleClear = () => {
    onChange('');
    onClose();
  };

  if (availableContexts.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-lg max-w-md w-full p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-sm font-semibold">Dynamic Source 사용 불가</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            이 페이지는 일반 페이지 (static) 라 Dynamic Source 가 동작할 context 가 없습니다.
            Templates 메뉴의 제품 상세 / 블로그 글 / 카탈로그 상세 페이지에서만 dynamic binding 사용 가능.
          </p>
          <div className="flex justify-end">
            <button onClick={onClose} className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded hover:bg-gray-50">
              닫기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-md w-full p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">🔗 Dynamic Source</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              이 field 의 값을 현재 페이지가 렌더할 데이터로 자동 binding.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>

        {availableContexts.length > 1 && (
          <label className="block">
            <span className="text-xs font-medium text-gray-700">Context</span>
            <select
              value={context}
              onChange={(e) => { setContext(e.target.value as DynamicContext); setPath(''); }}
              className="mt-1 w-full text-sm border border-gray-300 rounded px-2 py-1.5 outline-none focus:border-blue-500 bg-white"
            >
              {availableContexts.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
        )}

        <label className="block">
          <span className="text-xs font-medium text-gray-700">Source</span>
          <select
            value={path}
            onChange={(e) => setPath(e.target.value)}
            className="mt-1 w-full text-sm border border-gray-300 rounded px-2 py-1.5 outline-none focus:border-blue-500 bg-white"
          >
            <option value="">— 선택 —</option>
            {allOptions.map((o) => (
              <option key={o.path} value={o.path}>{o.label}</option>
            ))}
          </select>
          {allOptions.length === 0 && (
            <span className="text-[10px] text-amber-600 mt-1 block">
              이 field kind ({fieldKind}) 에 binding 가능한 source 가 없습니다.
            </span>
          )}
        </label>

        {hint && <p className="text-[11px] text-gray-500">{hint}</p>}

        <div className="flex items-center justify-between gap-2 pt-2">
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-900"
          >
            Static 으로 복원
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!path}
              className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded"
            >
              적용
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Dynamic ref 상태일 때 input 자리에 표시되는 chip. 클릭하면 picker 다시
 * 열림. ✕ 클릭하면 static 으로 복원.
 */
export function DynamicChip({
  value,
  onOpen,
  onClear,
}: {
  value: DynamicRef;
  onOpen: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded border border-blue-200 bg-blue-50 text-xs text-blue-700">
      <button
        type="button"
        onClick={onOpen}
        className="flex-1 text-left flex items-center gap-1.5 truncate hover:text-blue-900"
      >
        <span>🔗</span>
        <span className="truncate">{dynamicRefLabel(value)}</span>
      </button>
      <button
        type="button"
        onClick={onClear}
        aria-label="Static 으로 복원"
        className="text-blue-400 hover:text-blue-700 text-base leading-none"
      >
        ×
      </button>
    </div>
  );
}
