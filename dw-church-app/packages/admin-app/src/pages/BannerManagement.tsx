import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Banner, BannerListParams, BannerPosition, BannerAlign, BannerCategory, LinkTarget, PostStatus } from '@dw-church/api-client';
import {
  useBanners,
  useCreateBanner,
  useUpdateBanner,
  useDeleteBanner,
} from '@dw-church/api-client';
import { useToast, ConfirmDialog, EmptyState, TableSkeleton } from '../components';

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
  textPosition: BannerPosition;
  textAlign: BannerAlign;
  category: BannerCategory;
  status: PostStatus;
}

const POSITION_OPTIONS: { value: BannerPosition; label: string }[] = [
  { value: 'left-top', label: '좌측 상단' },
  { value: 'center-top', label: '중앙 상단' },
  { value: 'right-top', label: '우측 상단' },
  { value: 'left-center', label: '좌측 중앙' },
  { value: 'center-center', label: '중앙' },
  { value: 'right-center', label: '우측 중앙' },
  { value: 'left-bottom', label: '좌측 하단' },
  { value: 'center-bottom', label: '중앙 하단' },
  { value: 'right-bottom', label: '우측 하단' },
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
  const { data, isLoading, error } = useBanners(params);
  const createMutation = useCreateBanner();
  const updateMutation = useUpdateBanner();
  const deleteMutation = useDeleteBanner();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<BannerFormData>();

  const handleEdit = (item: Banner) => {
    setEditingItem(item);
    reset({
      title: item.title,
      pcImageUrl: item.pcImageUrl,
      mobileImageUrl: item.mobileImageUrl,
      subImageUrl: item.subImageUrl,
      linkUrl: item.linkUrl,
      linkTarget: item.linkTarget,
      startDate: item.startDate,
      endDate: item.endDate,
      textHeading: item.textOverlay?.heading || '',
      textSubheading: item.textOverlay?.subheading || '',
      textDescription: item.textOverlay?.description || '',
      textPosition: item.textOverlay?.position || 'center-center',
      textAlign: item.textOverlay?.align || 'center',
      category: item.category,
      status: item.status,
    });
    setView('edit');
  };

  const handleCreate = () => {
    setEditingItem(null);
    reset({
      title: '', pcImageUrl: '', mobileImageUrl: '', subImageUrl: '',
      linkUrl: '', linkTarget: '_self', startDate: '', endDate: '',
      textHeading: '', textSubheading: '', textDescription: '',
      textPosition: 'center-center', textAlign: 'center',
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
      pcImageUrl: formData.pcImageUrl,
      mobileImageUrl: formData.mobileImageUrl,
      subImageUrl: formData.subImageUrl,
      linkUrl: formData.linkUrl,
      linkTarget: formData.linkTarget,
      startDate: formData.startDate,
      endDate: formData.endDate,
      textOverlay: {
        heading: formData.textHeading,
        subheading: formData.textSubheading,
        description: formData.textDescription,
        position: formData.textPosition,
        align: formData.textAlign,
        widths: { pc: '100%', laptop: '100%', tablet: '100%', mobile: '100%' },
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
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">
            {editingItem ? '배너 수정' : '배너 등록'}
          </h2>
          <button
            type="button"
            onClick={() => setView('list')}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            목록으로
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">제목</label>
            <input
              {...register('title', { required: '제목을 입력하세요' })}
              className="w-full border rounded px-3 py-2"
            />
            {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">PC 이미지 URL</label>
              <input
                {...register('pcImageUrl')}
                placeholder="https://example.com/pc-banner.jpg"
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">모바일 이미지 URL</label>
              <input
                {...register('mobileImageUrl')}
                placeholder="https://example.com/mobile-banner.jpg"
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">서브 이미지 URL</label>
            <input
              {...register('subImageUrl')}
              placeholder="https://example.com/sub.jpg"
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">링크 URL</label>
              <input
                {...register('linkUrl')}
                placeholder="https://example.com/page"
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">링크 타겟</label>
              <select {...register('linkTarget')} className="w-full border rounded px-3 py-2">
                <option value="_self">현재 창 (_self)</option>
                <option value="_blank">새 창 (_blank)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">시작일</label>
              <input
                type="date"
                {...register('startDate')}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">종료일</label>
              <input
                type="date"
                {...register('endDate')}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <fieldset className="border rounded p-4">
            <legend className="text-sm font-medium px-2">텍스트 오버레이</legend>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">제목 (Heading)</label>
                <input
                  {...register('textHeading')}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">부제목 (Subheading)</label>
                <input
                  {...register('textSubheading')}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">설명 (Description)</label>
                <textarea
                  {...register('textDescription')}
                  rows={2}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">위치 (Position)</label>
                  <select {...register('textPosition')} className="w-full border rounded px-3 py-2">
                    {POSITION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">정렬 (Align)</label>
                  <select {...register('textAlign')} className="w-full border rounded px-3 py-2">
                    {ALIGN_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </fieldset>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">카테고리</label>
              <select {...register('category')} className="w-full border rounded px-3 py-2">
                <option value="main">메인</option>
                <option value="sub">서브</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">상태</label>
              <select {...register('status')} className="w-full border rounded px-3 py-2">
                <option value="published">공개</option>
                <option value="draft">임시저장</option>
                <option value="archived">보관</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? '저장 중...' : '저장'}
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              취소
            </button>
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
                    <td className="px-4 py-3 text-sm">{item.startDate || '-'}</td>
                    <td className="px-4 py-3 text-sm">{item.endDate || '-'}</td>
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
