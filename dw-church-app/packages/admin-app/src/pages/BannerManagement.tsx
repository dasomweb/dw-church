import { useState } from 'react';
import { useForm } from 'react-hook-form';
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

const PROMPT_PC = `Ultra-wide panoramic website hero banner.
Aspect ratio 16:5 (1920×600).

Modern church photography.
Natural realistic lighting.
Professional composition.
Clean and elegant.

Important:
- Keep all important subjects within center 60% area
- Leave generous negative space for text
- Avoid placing important elements near edges
- Suitable for website hero banner
- No text, no logo, no watermark

Ultra realistic.
High-end commercial photography.`;

const PROMPT_MOBILE = `Mobile website hero image.
Aspect ratio 4:5 (1080×1350).

Modern church photography.
Natural realistic lighting.
Professional composition.

Important:
- Main subject centered
- Keep all important elements within center 50%
- Leave negative space at top and bottom for text overlay
- Optimized for mobile devices
- No text, no logo

Ultra realistic.
High-end commercial photography.`;

const PROMPT_MOBILE_FULL = `Mobile website splash screen.
Aspect ratio 9:16 (1080×1920).

Modern church environment.
Natural light.
Clean composition.

Important:
- Subject positioned in middle third
- Leave space above and below for headlines
- Safe area for mobile cropping
- No text

Professional photography.
Ultra realistic.`;

function PromptBlock({ label, prompt }: { label: string; prompt: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked — user can select manually */ }
  };
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <span className="text-xs font-semibold text-gray-700">{label}</span>
        <button type="button" onClick={copy} className="text-xs font-medium text-blue-600 hover:text-blue-700">
          {copied ? '복사됨 ✓' : '프롬프트 복사'}
        </button>
      </div>
      <pre className="px-3 py-2 text-[11px] leading-relaxed text-gray-600 whitespace-pre-wrap font-sans max-h-44 overflow-auto">{prompt}</pre>
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

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <PromptBlock label="PC 배너 (16:5 · 1920×600)" prompt={PROMPT_PC} />
            <PromptBlock label="모바일 (4:5 · 1080×1350)" prompt={PROMPT_MOBILE} />
            <PromptBlock label="모바일 풀스크린 (9:16 · 1080×1920)" prompt={PROMPT_MOBILE_FULL} />
          </div>
          <p className="text-[11px] text-gray-400">
            프롬프트 복사 → AI 이미지 도구에 붙여넣기 → 생성 → (필요 시 크롭) → 위 ‘이미지 변경’에서 업로드.
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
  category: BannerCategory;
  status: PostStatus;
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
    const res = await apiClient!.uploadFile(file);
    return res.url;
  };
  const { data, isLoading, error } = useBanners(params);
  const createMutation = useCreateBanner();
  const updateMutation = useUpdateBanner();
  const deleteMutation = useDeleteBanner();
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<BannerFormData>();

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
          className="border rounded px-3 py-2 w-64"
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
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-3 text-sm font-medium">제목</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">카테고리</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">시작일</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">종료일</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">상태</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">액션</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{item.title}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${item.category === 'main' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                        {item.category === 'main' ? '메인' : '서브'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{item.startDate ? String(item.startDate).slice(0, 10) : '-'}</td>
                    <td className="px-4 py-3 text-sm">{item.endDate ? String(item.endDate).slice(0, 10) : '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      {isActive(item) ? (
                        <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">활성</span>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">{item.status}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm space-x-2">
                      <button onClick={() => handleEdit(item)} className="text-blue-600 hover:underline">편집</button>
                      <button
                        onClick={() => handleDelete(item)}
                        disabled={deleteMutation.isPending}
                        className="text-red-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
