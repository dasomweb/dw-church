/**
 * ChildBlocksEditor — 레이아웃 블록(layout_row / layout_columns / layout_section)의
 * `props.children[]` 를 빌더에서 직접 조립하는 편집기. 이게 없어서 지금까지 레이아웃
 * 컨테이너는 렌더는 되지만(스토어프론트+캔버스) 운영자가 안에 블록을 넣을 수 없었고,
 * 그래서 rows/columns 중첩이 핵심인 Claude Design 반영이 어려웠다.
 *
 * 기능: 자식 블록 추가(블록 선택) · 위/아래 순서 · 삭제 · 각 자식의 편집 필드
 * (BLOCK_DEFS.editableFields) 인라인 수정 + variant 선택. 이미지 필드는 ImageUpload
 * (파일 피커) 사용([[feedback_image_upload]]). children 는 layout='columns-N' 이면
 * 열 수만큼 순서대로 그리드에 배치된다(LayoutBlock 렌더 규칙).
 */
import { useState } from 'react';
import { BLOCK_DEFS, type BlockDef } from '../../pages/PageEditor';
import { ImageUpload } from '../../components';
import { useImageFieldApi } from './property-fields/useImageFieldApi';

type Child = { blockType: string; props: Record<string, unknown> };
type EditableField = BlockDef['editableFields'][number];

interface Props {
  sectionId: string;
  props: Record<string, unknown>;
  onChange: (sectionId: string, next: Record<string, unknown>) => void;
}

// 자식으로 넣을 수 있는 블록 — 레이아웃 컨테이너는 제외(V1: 깊은 중첩 방지),
// 카탈로그/상품 등 교회 무관 블록도 제외.
const EXCLUDE = /^(layout_|catalog_|product_|shoppable_|lookbook_|countdown_|form_split$)/;
const CHILD_CHOICES = BLOCK_DEFS.filter((b) => !EXCLUDE.test(b.type));

export function ChildBlocksEditor({ sectionId, props, onChange }: Props) {
  const children = (Array.isArray(props.children) ? props.children : []) as Child[];
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [addType, setAddType] = useState('');
  const api = useImageFieldApi();
  const uploadImage = async (file: File): Promise<string> => (api.upload ? (await api.upload(file)) : '');

  const commit = (next: Child[]) => onChange(sectionId, { ...props, children: next });
  const addChild = () => {
    if (!addType) return;
    const def = BLOCK_DEFS.find((b) => b.type === addType);
    commit([...children, { blockType: addType, props: { ...(def?.defaultProps ?? {}) } }]);
    setOpenIdx(children.length);
    setAddType('');
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir; if (j < 0 || j >= children.length) return;
    const n = [...children]; const a = n[i]!; n[i] = n[j]!; n[j] = a; commit(n);
    if (openIdx === i) setOpenIdx(j); else if (openIdx === j) setOpenIdx(i);
  };
  const del = (i: number) => { commit(children.filter((_, k) => k !== i)); if (openIdx === i) setOpenIdx(null); };
  const setProp = (i: number, key: string, val: unknown) => {
    const n = children.map((c, k) => (k === i ? { ...c, props: { ...c.props, [key]: val } } : c));
    commit(n);
  };

  // 그룹별 옵션(추가 셀렉트) — 카테고리로 묶어 보기 쉽게.
  const groups = CHILD_CHOICES.reduce<Record<string, BlockDef[]>>((m, b) => { (m[b.category] ??= []).push(b); return m; }, {});

  const layout = String(props.layout ?? 'row');
  const layoutHint = layout.startsWith('columns') ? `${layout.replace('columns-', '')}열 그리드 — 자식이 순서대로 각 칸에 배치됩니다`
    : layout === 'section' ? '섹션 컨테이너 — 자식이 세로로 쌓입니다' : '행 — 자식이 세로로 쌓입니다';

  return (
    <div className="border-b border-gray-100 p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">자식 블록 <span className="text-gray-400">· {children.length}</span></h3>
      </div>
      <p className="mt-1 text-[11px] text-gray-400">{layoutHint}</p>

      <div className="mt-2 space-y-2">
        {children.map((c, i) => {
          const def = BLOCK_DEFS.find((b) => b.type === c.blockType);
          const open = openIdx === i;
          return (
            <div key={i} className="rounded-lg border border-gray-200">
              <div className="flex items-center gap-1 px-2 py-1.5">
                <span className="flex-1 truncate text-xs font-medium text-gray-800">{def?.icon ?? '▫'} {def?.label ?? c.blockType}</span>
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="px-1 text-gray-400 hover:text-gray-700 disabled:opacity-30" title="위로">↑</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === children.length - 1} className="px-1 text-gray-400 hover:text-gray-700 disabled:opacity-30" title="아래로">↓</button>
                <button type="button" onClick={() => setOpenIdx(open ? null : i)} className="rounded px-2 py-0.5 text-[11px] font-medium text-blue-600 hover:bg-blue-50">{open ? '접기' : '편집'}</button>
                <button type="button" onClick={() => del(i)} className="px-1 text-gray-300 hover:text-red-600" title="삭제">×</button>
              </div>
              {open && def && (
                <div className="space-y-2.5 border-t border-gray-100 px-2.5 py-2.5">
                  {def.variants.length > 0 && (
                    <Row label="스타일">
                      <select value={String(c.props.variant ?? def.variants[0]?.id ?? '')} onChange={(e) => setProp(i, 'variant', e.target.value)} className={SEL}>
                        {def.variants.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                      </select>
                    </Row>
                  )}
                  {def.editableFields.map((f) => (
                    <ChildField key={f.key} field={f} value={c.props[f.key]} onChange={(v) => setProp(i, f.key, v)} uploadImage={uploadImage} />
                  ))}
                  {def.nature === 'dynamic' && <p className="text-[10px] text-gray-400">※ 데이터 블록 — 실제 콘텐츠는 저장·게시 후 사이트에서 자동 표시됩니다.</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex gap-1.5">
        <select value={addType} onChange={(e) => setAddType(e.target.value)} className={`${SEL} flex-1`}>
          <option value="">+ 블록 추가…</option>
          {Object.entries(groups).map(([cat, defs]) => (
            <optgroup key={cat} label={cat}>
              {defs.map((b) => <option key={b.type} value={b.type}>{b.label}</option>)}
            </optgroup>
          ))}
        </select>
        <button type="button" onClick={addChild} disabled={!addType} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40">추가</button>
      </div>
    </div>
  );
}

const SEL = 'rounded-md border border-gray-300 px-2 py-1 text-xs outline-none focus:border-blue-500 bg-white';
const INP = 'w-full rounded-md border border-gray-300 px-2 py-1 text-xs outline-none focus:border-blue-500';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-gray-500">{label}</span>
      {children}
    </label>
  );
}

function ChildField({ field, value, onChange, uploadImage }: {
  field: EditableField; value: unknown; onChange: (v: unknown) => void; uploadImage: (f: File) => Promise<string>;
}) {
  const v = value;
  switch (field.type) {
    case 'number':
      return <Row label={field.label}><input type="number" className={INP} value={Number(v ?? 0)} onChange={(e) => onChange(Number(e.target.value))} /></Row>;
    case 'select':
      return <Row label={field.label}><select className={`${SEL} w-full`} value={String(v ?? '')} onChange={(e) => onChange(e.target.value)}>{(field.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Row>;
    case 'textarea':
    case 'richtext':
      return <Row label={field.label}><textarea rows={3} className={INP} value={String(v ?? '')} onChange={(e) => onChange(e.target.value)} /></Row>;
    case 'image':
      return <Row label={field.label}><ImageUpload label="" value={String(v ?? '')} onChange={(u) => onChange(u)} onUpload={uploadImage} resize="block" /></Row>;
    case 'cardItems':
      return <CardItemsField label={field.label} withImage={!!field.withImage} value={Array.isArray(v) ? (v as CardItem[]) : []} onChange={onChange} uploadImage={uploadImage} />;
    case 'text':
    case 'url':
      return <Row label={field.label}><input className={INP} value={String(v ?? '')} onChange={(e) => onChange(e.target.value)} /></Row>;
    default:
      // richtext/images/array/tags/services/buttons/groups 등 복합 필드는 V1 인라인 미지원 —
      // 텍스트로만 안내(해당 블록은 상세 편집이 필요하면 최상위 블록으로 두고 인스펙터 사용).
      return <Row label={field.label}><span className="block text-[11px] text-gray-400">이 항목은 최상위 블록 인스펙터에서 편집하세요.</span></Row>;
  }
}

type CardItem = { title?: string; content?: string; description?: string; imageUrl?: string };
function CardItemsField({ label, withImage, value, onChange, uploadImage }: {
  label: string; withImage: boolean; value: CardItem[]; onChange: (v: unknown) => void; uploadImage: (f: File) => Promise<string>;
}) {
  const items = value;
  const set = (i: number, key: keyof CardItem, val: string) => onChange(items.map((it, k) => (k === i ? { ...it, [key]: val } : it)));
  const add = () => onChange([...items, withImage ? { title: '', description: '', imageUrl: '' } : { title: '', content: '' }]);
  const del = (i: number) => onChange(items.filter((_, k) => k !== i));
  return (
    <div>
      <span className="mb-1 block text-[11px] font-medium text-gray-500">{label} <span className="text-gray-400">· {items.length}</span></span>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="rounded-md border border-gray-200 p-2">
            <div className="flex items-center gap-1">
              <input className={`${INP} flex-1`} placeholder="제목" value={it.title ?? ''} onChange={(e) => set(i, 'title', e.target.value)} />
              <button type="button" onClick={() => del(i)} className="px-1 text-gray-300 hover:text-red-600">×</button>
            </div>
            <textarea rows={2} className={`${INP} mt-1`} placeholder="내용" value={(it.content ?? it.description) ?? ''} onChange={(e) => set(i, withImage ? 'description' : 'content', e.target.value)} />
            {withImage && <div className="mt-1"><ImageUpload label="" value={it.imageUrl ?? ''} onChange={(u) => set(i, 'imageUrl', u)} onUpload={uploadImage} resize="block" /></div>}
          </div>
        ))}
      </div>
      <button type="button" onClick={add} className="mt-1.5 text-[11px] font-semibold text-blue-600 hover:underline">+ 항목 추가</button>
    </div>
  );
}
