import { useState, useEffect, type CSSProperties } from 'react';
import { useForm } from 'react-hook-form';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Banner, BannerListParams, BannerPosition, BannerAlign, BannerCategory, LinkTarget, PostStatus } from '@dw-church/api-client';
import {
  useBanners,
  useCreateBanner,
  useUpdateBanner,
  useDeleteBanner,
  useDWChurchClient,
} from '@dw-church/api-client';
import { FormField, FormSection, FormRow, inputClass, selectClass, textareaClass, ImageUpload, useToast, ConfirmDialog, EmptyState, TableSkeleton } from '../components';

// ─── 배너 이미지 생성 가이드 ──────────────────────────────────
// AI 이미지 도구(ChatGPT 등)는 정확한 픽셀이 아니라 비율(aspect ratio) 기준으로
// 생성하므로, 운영자가 좋은 결과를 얻도록 권장 사이즈 + 복사 가능한 프롬프트
// 템플릿을 제공한다.
const BANNER_SIZES: { use: string; size: string; ratio: string }[] = [
  { use: 'PC(데스크톱) 메인', size: '1920 × 600', ratio: '16:5' },
  { use: '태블릿', size: '1200 × 900', ratio: '4:3' },
  { use: '모바일 메인', size: '1080 × 1350', ratio: '4:5' },
  { use: '모바일 풀스크린', size: '1080 × 1920', ratio: '9:16' },
];

// The three banner sizes we generate copy-prompts for.
const PROMPT_SIZES: { key: string; label: string; ratio: string; px: string; usage: string }[] = [
  { key: 'pc', label: 'PC 배너', ratio: '16:5', px: '1920×600', usage: 'Ultra-wide website hero banner (desktop)' },
  { key: 'mobile', label: '모바일', ratio: '4:5', px: '1080×1350', usage: 'Mobile website hero image (portrait)' },
  { key: 'full', label: '모바일 풀스크린', ratio: '9:16', px: '1080×1920', usage: 'Mobile full-screen splash image (tall portrait)' },
];

// Non-religious style presets (플러스 "사이즈만" = ratio only, no look imposed).
const PROMPT_STYLES: { key: string; label: string; lines: string[] }[] = [
  { key: 'size', label: '사이즈만', lines: [] },
  { key: 'modern', label: '모던·클린', lines: [
    'Modern, clean, minimal design.',
    'Soft gradients and subtle geometric shapes.',
    'Sophisticated, muted color palette.',
    'Professional and elegant.',
  ] },
  { key: 'illust', label: '일러스트', lines: [
    'Flat vector illustration style.',
    'Simple, friendly, modern shapes.',
    'Soft, harmonious colors.',
    'Clean and uncluttered.',
  ] },
  { key: 'nature', label: '자연 배경', lines: [
    'Beautiful natural landscape.',
    'Soft natural light.',
    'Serene, peaceful scenery (sky, sea, mountains, or open fields).',
    'Photorealistic, high quality.',
  ] },
  { key: 'church', label: '교회', lines: [
    'Warm, reverent church atmosphere.',
    'Soft natural light.',
    'Modern, professional church photography.',
    'Clean and elegant.',
  ] },
];

// Whether the image is a pure background or should reserve space for a headline.
const PROMPT_TEXT_MODES: { key: string; label: string; lines: string[] }[] = [
  { key: 'bg', label: '글자 없는 배경', lines: [
    'Do NOT include any text, letters, numbers, or logos.',
    'Full-bleed background imagery filling the entire frame.',
  ] },
  { key: 'space', label: '글자 공간 포함', lines: [
    'Do NOT render any text or letters (a headline will be overlaid later).',
    'Keep the main subject to one side and leave generous clean negative space (the opposite side or lower third) for the headline.',
  ] },
];

function buildBannerPrompt(sizeKey: string, styleKey: string, textKey: string): string {
  const size = PROMPT_SIZES.find((s) => s.key === sizeKey)!;
  const style = PROMPT_STYLES.find((s) => s.key === styleKey)!;
  const text = PROMPT_TEXT_MODES.find((t) => t.key === textKey)!;
  const blocks = [
    `${size.usage}.\nAspect ratio ${size.ratio} (${size.px}).`,
    style.lines.join('\n'),
    text.lines.join('\n'),
    'High resolution. No watermark.',
  ].filter((b) => b.trim().length > 0);
  return blocks.join('\n\n');
}

// Style + text-mode selector with one copy button per size (프롬프트 본문은 숨기고
// 복사만). Composes the prompt on the fly from the current selections.
function BannerPromptPresets() {
  const [styleKey, setStyleKey] = useState('modern');
  const [textKey, setTextKey] = useState('space');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copy = async (sizeKey: string) => {
    try {
      await navigator.clipboard.writeText(buildBannerPrompt(sizeKey, styleKey, textKey));
      setCopiedKey(sizeKey);
      setTimeout(() => setCopiedKey((k) => (k === sizeKey ? null : k)), 1500);
    } catch { /* clipboard blocked — retry */ }
  };
  const Segmented = ({ options, value, onChange }: { options: { key: string; label: string }[]; value: string; onChange: (k: string) => void }) => (
    <div className="inline-flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${value === o.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-gray-500">스타일</span>
          <Segmented options={PROMPT_STYLES} value={styleKey} onChange={setStyleKey} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-gray-500">텍스트</span>
          <Segmented options={PROMPT_TEXT_MODES} value={textKey} onChange={setTextKey} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {PROMPT_SIZES.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => void copy(s.key)}
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-blue-300 hover:bg-blue-50/50"
          >
            <span>
              <span className="block text-xs font-semibold text-gray-800">{s.label}</span>
              <span className="block font-mono text-[10px] text-gray-400">{s.ratio} · {s.px}</span>
            </span>
            <span className={`shrink-0 text-xs font-medium ${copiedKey === s.key ? 'text-green-600' : 'text-blue-600'}`}>
              {copiedKey === s.key ? '복사됨 ✓' : '프롬프트 복사'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function BannerImageGuide() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left"
      >
        <span className="text-sm font-semibold text-blue-800">배너 이미지 만들기 가이드 (AI 이미지 생성)</span>
        <svg className={`w-4 h-4 text-blue-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="space-y-4 px-4 pb-4">
          <p className="text-xs leading-relaxed text-gray-600">
            ChatGPT 등 AI 이미지는 <strong>정확한 픽셀이 아니라 비율(aspect ratio)</strong> 기준으로 생성됩니다.
            프롬프트에 <strong>비율과 용도</strong>를 명확히 적고, 생성 후 Canva·Figma·Photoshop 등에서 최종 크기로
            크롭/리사이즈하세요. <strong>모바일은 가로형을 그대로 쓰면 좌우가 잘려</strong> 중요한 부분이 사라지므로,
            모바일 이미지는 별도로 생성하는 것을 권장합니다.
          </p>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
            <p className="text-xs font-semibold text-amber-800">한글 배너 텍스트 팁</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] leading-relaxed text-amber-700">
              <li><strong>좌우 여백(여백의 미)을 충분히</strong> — 글자를 가장자리까지 꽉 채우지 말고 양옆을 비워두면 한글이 훨씬 정돈되고 고급스럽게 보입니다.</li>
              <li><strong>폰트는 과도하게 크지 않게</strong> — 한글은 영문보다 글자 면적이 커서 너무 키우면 답답해 보입니다. 제목은 한눈에 읽히는 선에서 절제하고 굵기·여백으로 강조하세요.</li>
              <li>핵심 문구는 짧게 — 한 줄에 다 담으려 하기보다 핵심만 남기면 여백이 살아납니다.</li>
            </ul>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-3 py-1.5 text-left font-medium">용도</th>
                  <th className="px-3 py-1.5 text-left font-medium">권장 사이즈</th>
                  <th className="px-3 py-1.5 text-left font-medium">비율</th>
                </tr>
              </thead>
              <tbody>
                {BANNER_SIZES.map((s) => (
                  <tr key={s.use} className="border-t border-gray-100">
                    <td className="px-3 py-1.5 text-gray-700">{s.use}</td>
                    <td className="px-3 py-1.5 font-mono text-gray-600">{s.size}</td>
                    <td className="px-3 py-1.5 font-mono text-gray-600">{s.ratio}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <p className="mb-2.5 text-xs font-semibold text-gray-700">프롬프트 프리셋</p>
            <BannerPromptPresets />
          </div>
          <p className="text-[11px] text-gray-400">
            스타일·텍스트를 고르고 원하는 사이즈의 <strong>프롬프트 복사</strong> → AI 이미지 도구에 붙여넣기 → 생성 → (필요 시 크롭) → 위 ‘이미지 변경’에서 업로드.
          </p>
        </div>
      )}
    </div>
  );
}

interface BannerFormData {
  title: string;
  pcImageUrl: string;
  mobileImageUrl: string;
  subImageUrl: string;
  linkUrl: string;
  linkTarget: LinkTarget;
  startDate: string;
  endDate: string;
  textHeading: string;
  textSubheading: string;
  textDescription: string;
  textButtonText: string;
  textButtonUrl: string;
  textPosition: BannerPosition;
  textAlign: BannerAlign;
  overlayEnabled: boolean;
  category: BannerCategory;
  status: PostStatus;
}

// 상태 칸 한글 라벨/색상. '표시중'(녹색)은 별도 — 공개 + 표시 기간 내라 지금 사이트에
// 노출되는 배너. 그 외에는 발행 상태(공개/임시저장/보관)를 그대로 보여준다.
const BANNER_STATUS_LABELS: Record<string, string> = { published: '공개', draft: '임시저장', archived: '보관' };
const BANNER_STATUS_BADGE: Record<string, string> = {
  published: 'bg-blue-100 text-blue-700',
  draft: 'bg-amber-100 text-amber-700',
  archived: 'bg-gray-100 text-gray-500',
};

// One draggable row of the banner list. The drag handle reorders rows; the new
// order is persisted as sort_order, which is exactly the order the storefront
// slider plays them in.
function SortableBannerRow({ item, active, onEdit, onDelete, deleteDisabled }: {
  item: Banner;
  active: boolean;
  onEdit: () => void;
  onDelete: () => void;
  deleteDisabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <tr ref={setNodeRef} style={style} className="border-b bg-white hover:bg-gray-50">
      <td className="w-8 px-2 py-3 text-center text-gray-400 cursor-grab active:cursor-grabbing touch-none" {...attributes} {...listeners} aria-label="드래그하여 순서 변경" title="드래그하여 순서 변경">
        <svg className="mx-auto h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" /><circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" /><circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" /></svg>
      </td>
      <td className="px-4 py-3 text-sm font-medium">{item.title}</td>
      <td className="px-4 py-3 text-sm">
        <span className={`px-2 py-1 rounded text-xs ${item.category === 'main' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
          {item.category === 'main' ? '메인' : '서브'}
        </span>
      </td>
      <td className="px-4 py-3 text-sm">{item.startDate ? String(item.startDate).slice(0, 10) : '-'}</td>
      <td className="px-4 py-3 text-sm">{item.endDate ? String(item.endDate).slice(0, 10) : '-'}</td>
      <td className="px-4 py-3 text-sm">
        {active ? (
          <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800" title="공개 상태이며 표시 기간 내라 지금 사이트에 노출됩니다">표시중</span>
        ) : (
          <span
            className={`px-2 py-1 rounded text-xs ${BANNER_STATUS_BADGE[item.status] ?? 'bg-gray-100 text-gray-600'}`}
            title={item.status === 'published' ? '공개 상태이지만 표시 기간이 아닙니다 (예약 또는 종료)' : undefined}
          >
            {BANNER_STATUS_LABELS[item.status] ?? item.status}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm space-x-2">
        <button onClick={onEdit} className="text-blue-600 hover:underline">편집</button>
        <button onClick={onDelete} disabled={deleteDisabled} className="text-red-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed">삭제</button>
      </td>
    </tr>
  );
}

const POSITION_OPTIONS: { value: BannerPosition; label: string }[] = [
  { value: 'top-left', label: '좌측 상단' },
  { value: 'top-center', label: '중앙 상단' },
  { value: 'top-right', label: '우측 상단' },
  { value: 'center-left', label: '좌측 중앙' },
  { value: 'center', label: '중앙' },
  { value: 'center-right', label: '우측 중앙' },
  { value: 'bottom-left', label: '좌측 하단' },
  { value: 'bottom-center', label: '중앙 하단' },
  { value: 'bottom-right', label: '우측 하단' },
];

const ALIGN_OPTIONS: { value: BannerAlign; label: string }[] = [
  { value: 'left', label: '좌측' },
  { value: 'center', label: '중앙' },
  { value: 'right', label: '우측' },
];

export default function BannerManagement() {
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingItem, setEditingItem] = useState<Banner | null>(null);
  const [params, setParams] = useState<BannerListParams>({ page: 1, perPage: 10, search: '' });
  const [deleteTarget, setDeleteTarget] = useState<{id: string; name: string} | null>(null);

  const { showToast } = useToast();
  const apiClient = useDWChurchClient();
  // Banner images MUST upload to R2 (returns a short URL). Without onUpload,
  // ImageUpload falls back to a base64 data URI, which blows past the
  // pc_image_url 2000-char DB limit → the image is dropped and the slider
  // shows a broken image. ImageUpload already client-side resizes first.
  const uploadImage = async (file: File): Promise<string> => {
    const res = await apiClient!.uploadFile(file, 'banners');
    return res.url;
  };
  const { data, isLoading, error } = useBanners(params);
  const createMutation = useCreateBanner();
  const updateMutation = useUpdateBanner();
  const deleteMutation = useDeleteBanner();
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<BannerFormData>();

  // Local order mirror so drag reordering is instant; synced from the query and
  // persisted back as sort_order (drives the storefront slider order).
  const [ordered, setOrdered] = useState<Banner[]>([]);
  useEffect(() => { if (data?.data) setOrdered(data.data); }, [data]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = ordered.findIndex((b) => b.id === active.id);
    const newIndex = ordered.findIndex((b) => b.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(ordered, oldIndex, newIndex);
    setOrdered(next);
    // Persist only rows whose position actually changed.
    next.forEach((b, idx) => {
      if (b.sortOrder !== idx) updateMutation.mutate({ id: b.id, data: { sortOrder: idx } });
    });
    showToast('success', '순서가 변경되었습니다.');
  };

  const handleEdit = (item: Banner) => {
    setEditingItem(item);
    const overlay = item.textOverlay || {};
    reset({
      title: item.title,
      pcImageUrl: item.pcImageUrl || '',
      mobileImageUrl: item.mobileImageUrl || '',
      subImageUrl: item.subImageUrl || '',
      linkUrl: item.linkUrl || '',
      linkTarget: item.linkTarget || '_self',
      // DATE columns come back as ISO datetimes (2026-06-20T00:00:00.000Z); a
      // type="date" input needs YYYY-MM-DD, and the server regex rejects the ISO
      // form — slice so the date both displays and re-saves correctly.
      startDate: item.startDate ? String(item.startDate).slice(0, 10) : '',
      endDate: item.endDate ? String(item.endDate).slice(0, 10) : '',
      textHeading: overlay.heading || '',
      textSubheading: overlay.subheading || '',
      textDescription: overlay.description || '',
      textButtonText: (overlay as any).buttonText || '',
      textButtonUrl: (overlay as any).buttonUrl || '',
      textPosition: overlay.position || 'center',
      textAlign: overlay.align || 'center',
      overlayEnabled: (overlay as { overlayEnabled?: boolean }).overlayEnabled !== false, // default on
      category: item.category || 'main',
      status: item.status || 'draft',
    });
    setView('edit');
  };

  const handleCreate = () => {
    setEditingItem(null);
    reset({
      title: '', pcImageUrl: '', mobileImageUrl: '', subImageUrl: '',
      linkUrl: '', linkTarget: '_self', startDate: '', endDate: '',
      textHeading: '', textSubheading: '', textDescription: '',
      textButtonText: '', textButtonUrl: '',
      textPosition: 'center', textAlign: 'center',
      overlayEnabled: true,
      category: 'main', status: 'draft',
    });
    setView('edit');
  };

  const handleDelete = (item: Banner) => {
    setDeleteTarget({ id: item.id, name: item.title || '' });
  };

  const isActive = (item: Banner): boolean => {
    const now = new Date();
    const start = item.startDate ? new Date(item.startDate) : null;
    const end = item.endDate ? new Date(item.endDate) : null;
    if (start && now < start) return false;
    if (end && now > end) return false;
    return item.status === 'published';
  };

  const onSubmit = (formData: BannerFormData) => {
    const payload = {
      title: formData.title,
      pcImageUrl: formData.pcImageUrl || null,
      mobileImageUrl: formData.mobileImageUrl || null,
      subImageUrl: formData.subImageUrl || null,
      linkUrl: formData.linkUrl || null,
      linkTarget: formData.linkTarget,
      startDate: formData.startDate || null,
      endDate: formData.endDate || null,
      textOverlay: {
        heading: formData.textHeading,
        subheading: formData.textSubheading,
        description: formData.textDescription,
        buttonText: formData.textButtonText,
        buttonUrl: formData.textButtonUrl,
        position: formData.textPosition,
        align: formData.textAlign,
        overlayEnabled: formData.overlayEnabled,
      },
      category: formData.category,
      status: formData.status,
    };
    if (editingItem) {
      updateMutation.mutate(
        { id: editingItem.id, data: payload },
        {
          onSuccess: () => { showToast('success', '저장되었습니다.'); setView('list'); },
          onError: () => { showToast('error', '오류가 발생했습니다.'); },
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => { showToast('success', '저장되었습니다.'); setView('list'); },
        onError: () => { showToast('error', '오류가 발생했습니다.'); },
      });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (view === 'edit') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <button type="button" onClick={() => setView('list')} className="text-sm text-gray-500 hover:text-gray-700 mb-3 inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            목록으로
          </button>
          <h2 className="text-2xl font-bold text-gray-900">{editingItem ? '배너 수정' : '배너 등록'}</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FormSection title="배너 정보">
            <FormRow>
              <FormField label="제목" required error={errors.title?.message}>
                <input {...register('title', { required: '제목을 입력하세요' })} className={inputClass} />
              </FormField>
              <FormField label="상태">
                <select {...register('status')} className={selectClass}>
                  <option value="published">공개</option>
                  <option value="draft">임시저장</option>
                  <option value="archived">보관</option>
                </select>
              </FormField>
            </FormRow>
            <FormRow>
              <FormField label="카테고리">
                <select {...register('category')} className={selectClass}>
                  <option value="main">메인</option>
                  <option value="sub">서브</option>
                </select>
              </FormField>
              <div />
            </FormRow>
            <FormRow>
              <FormField label="시작일">
                <input type="date" {...register('startDate')} className={inputClass} />
              </FormField>
              <FormField label="종료일">
                <input type="date" {...register('endDate')} className={inputClass} />
              </FormField>
            </FormRow>
          </FormSection>

          <FormSection title="배너 이미지">
            <BannerImageGuide />
            <FormRow>
              <ImageUpload
                label="PC 이미지"
                value={watch('pcImageUrl') || ''}
                onChange={(url) => setValue('pcImageUrl', url)}
                onUpload={uploadImage}
                aspectRatio="21/9"
                resize="hero"
              />
              <ImageUpload
                label="모바일 이미지"
                value={watch('mobileImageUrl') || ''}
                onChange={(url) => setValue('mobileImageUrl', url)}
                onUpload={uploadImage}
                aspectRatio="9/16"
                resize="hero"
              />
            </FormRow>
            <ImageUpload
              label="서브 배너 이미지"
              value={watch('subImageUrl') || ''}
              onChange={(url) => setValue('subImageUrl', url)}
              onUpload={uploadImage}
              aspectRatio="16/9"
              resize="hero"
            />
          </FormSection>

          <FormSection title="링크">
            <FormRow>
              <FormField label="링크 URL">
                <input {...register('linkUrl')} placeholder="https://example.com/page" className={inputClass} />
              </FormField>
              <FormField label="링크 타겟">
                <select {...register('linkTarget')} className={selectClass}>
                  <option value="_self">현재 창 (_self)</option>
                  <option value="_blank">새 창 (_blank)</option>
                </select>
              </FormField>
            </FormRow>
          </FormSection>

          <FormSection title="텍스트 오버레이">
            <label className="mb-2 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-700">
              <input type="checkbox" {...register('overlayEnabled')} />
              어둡게(오버레이) 표시
              <span className="ml-1 text-xs font-normal text-gray-400">— 끄면 이미지 위 어두운 막을 없애 원본 이미지를 그대로 보여줍니다.</span>
            </label>
            <FormRow>
              <FormField label="제목">
                <input {...register('textHeading')} className={inputClass} />
              </FormField>
              <FormField label="부제목">
                <input {...register('textSubheading')} className={inputClass} />
              </FormField>
            </FormRow>
            <FormField label="설명">
              <textarea {...register('textDescription')} rows={3} className={textareaClass} />
            </FormField>
            <FormRow>
              <FormField label="버튼 텍스트">
                <input {...register('textButtonText')} placeholder="예: 자세히 보기" className={inputClass} />
              </FormField>
              <FormField label="버튼 링크">
                <input {...register('textButtonUrl')} placeholder="/sermons" className={inputClass} />
              </FormField>
            </FormRow>
            <FormRow>
              <FormField label="위치">
                <select {...register('textPosition')} className={selectClass}>
                  {POSITION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="정렬">
                <select {...register('textAlign')} className={selectClass}>
                  {ALIGN_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </FormField>
            </FormRow>
          </FormSection>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">모든 필수 항목을 입력해주세요</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setView('list')} className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                취소
              </button>
              <button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 py-2.5 text-sm font-medium transition-all disabled:opacity-50 shadow-sm shadow-blue-600/25">
                {isSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>

          {(createMutation.isError || updateMutation.isError) && (
            <p className="text-red-500 text-sm">저장 중 오류가 발생했습니다.</p>
          )}
        </form>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">배너 관리</h2>
        <button
          onClick={handleCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          새 배너
        </button>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="검색..."
          value={params.search || ''}
          onChange={(e) => setParams((p) => ({ ...p, search: e.target.value, page: 1 }))}
          className="border rounded px-3 py-2 w-full sm:w-64"
        />
        <select
          value={params.category || ''}
          onChange={(e) => setParams((p) => ({ ...p, category: (e.target.value as BannerCategory) || undefined, page: 1 }))}
          className="border rounded px-3 py-2"
        >
          <option value="">전체 카테고리</option>
          <option value="main">메인</option>
          <option value="sub">서브</option>
        </select>
      </div>

      {isLoading && <TableSkeleton />}
      {error && <p className="text-red-500">오류가 발생했습니다.</p>}

      {data && data.data.length === 0 && !isLoading && (
        <EmptyState
          icon="🖼️"
          title="등록된 배너가 없습니다"
          description="새로운 배너를 추가해보세요."
          actionLabel="배너 추가"
          onAction={() => handleCreate()}
        />
      )}

      {data && data.data.length > 0 && (
        <>
          {/* 상태 범례 — '표시중'과 '공개'의 차이를 헷갈리지 않도록 명시 */}
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-500">
            <span className="font-semibold text-gray-600">상태 안내</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-800">표시중</span>
              공개 + 표시 기간 내 — 지금 사이트에 노출
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">공개</span>
              공개 상태이나 표시 기간 아님(예약/종료)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">임시저장</span>
              비공개 초안
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">보관</span>
              사용 안 함
            </span>
          </div>
          <p className="mb-2 text-xs text-gray-400">⋮⋮ 손잡이를 드래그해 순서를 바꾸면 사이트 배너 슬라이드 순서가 그대로 반영됩니다.</p>
          <div className="overflow-x-auto">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="w-8 px-2 py-3" aria-label="순서" />
                    <th className="text-left px-4 py-3 text-sm font-medium">제목</th>
                    <th className="text-left px-4 py-3 text-sm font-medium">카테고리</th>
                    <th className="text-left px-4 py-3 text-sm font-medium">시작일</th>
                    <th className="text-left px-4 py-3 text-sm font-medium">종료일</th>
                    <th className="text-left px-4 py-3 text-sm font-medium">상태</th>
                    <th className="text-left px-4 py-3 text-sm font-medium">액션</th>
                  </tr>
                </thead>
                <tbody>
                  <SortableContext items={ordered.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                    {ordered.map((item) => (
                      <SortableBannerRow
                        key={item.id}
                        item={item}
                        active={isActive(item)}
                        onEdit={() => handleEdit(item)}
                        onDelete={() => handleDelete(item)}
                        deleteDisabled={deleteMutation.isPending}
                      />
                    ))}
                  </SortableContext>
                </tbody>
              </table>
            </DndContext>
          </div>

          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-gray-500">
              총 {data.total}건 (페이지 {data.page}/{data.totalPages})
            </span>
            <div className="flex gap-2">
              <button
                disabled={data.page <= 1}
                onClick={() => setParams((p) => ({ ...p, page: (p.page || 1) - 1 }))}
                className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                이전
              </button>
              <button
                disabled={data.page >= data.totalPages}
                onClick={() => setParams((p) => ({ ...p, page: (p.page || 1) + 1 }))}
                className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음
              </button>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="삭제 확인"
        message={`"${deleteTarget?.name}"을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        variant="danger"
        onConfirm={() => {
          deleteMutation.mutate(deleteTarget!.id, {
            onSuccess: () => { showToast('success', '삭제되었습니다.'); },
            onError: () => { showToast('error', '오류가 발생했습니다.'); },
          });
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
