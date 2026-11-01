import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Column, ListParams, PostStatus } from '@dw-church/api-client';
import {
  useColumns,
  useCreateColumn,
  useUpdateColumn,
  useDeleteColumn,
  useDWChurchClient,
} from '@dw-church/api-client';
import { FormField, FormSection, FormRow, inputClass, selectClass, ImageUpload, RichEditor, useToast, ConfirmDialog, EmptyState, TableSkeleton } from '../components';
import { ContentMigrationButton } from '../components/ContentMigrationButton';
import { useBulkDelete } from '../components/useBulkDelete';
import { publishBadge, publishRangeText, churchToday } from '../lib/publish-window';

interface ColumnFormData {
  title: string;
  content: string;
  topImageUrl: string;
  bottomImageUrl: string;
  youtubeUrl: string;
  thumbnailUrl: string;
  /** 예약 공개 — 공개 시작일 / 종료일 (YYYY-MM-DD, 비우면 제한 없음) */
  publishAt: string;
  unpublishAt: string;
  status: PostStatus;
}

/** 날짜 칸이 ISO 타임스탬프로 와도 input[type=date] 가 먹을 수 있게 자른다. */
const dayValue = (v?: string | null): string => (v || '').slice(0, 10);

export default function ColumnManagement() {
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingItem, setEditingItem] = useState<Column | null>(null);
  const [params, setParams] = useState<ListParams>({ page: 1, perPage: 10, search: '' });
  const [deleteTarget, setDeleteTarget] = useState<{id: string; name: string} | null>(null);

  const { showToast } = useToast();
  const apiClient = useDWChurchClient();
  const uploadImage = async (file: File): Promise<string> => (await apiClient!.uploadFile(file, 'columns')).url;
  const { data, isLoading, error, refetch } = useColumns(params);
  const createMutation = useCreateColumn();
  const updateMutation = useUpdateColumn();
  const deleteMutation = useDeleteColumn();
  const bulk = useBulkDelete<Column>({ deleteOne: (id) => deleteMutation.mutateAsync(id), onDone: () => refetch() });
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<ColumnFormData>();

  const handleEdit = (item: Column) => {
    setEditingItem(item);
    reset({
      title: item.title,
      content: item.content,
      topImageUrl: item.topImageUrl,
      bottomImageUrl: item.bottomImageUrl,
      youtubeUrl: item.youtubeUrl,
      thumbnailUrl: item.thumbnailUrl,
      publishAt: dayValue(item.publishAt),
      unpublishAt: dayValue(item.unpublishAt),
      status: item.status,
    });
    setView('edit');
  };

  const handleCreate = () => {
    setEditingItem(null);
    reset({ title: '', content: '', topImageUrl: '', bottomImageUrl: '', youtubeUrl: '', thumbnailUrl: '', publishAt: '', unpublishAt: '', status: 'published' });
    setView('edit');
  };

  const handleDelete = (item: Column) => {
    setDeleteTarget({ id: item.id, name: item.title || '' });
  };

  const onSubmit = (formData: ColumnFormData) => {
    if (editingItem) {
      updateMutation.mutate(
        { id: editingItem.id, data: formData },
        {
          onSuccess: () => { showToast('success', '저장되었습니다.'); setView('list'); },
          onError: () => { showToast('error', '오류가 발생했습니다.'); },
        },
      );
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => { showToast('success', '저장되었습니다.'); setView('list'); },
        onError: () => { showToast('error', '오류가 발생했습니다.'); },
      });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  // 공개 일정 안내문을 즉시 갱신하려면 watch 로 읽어야 한다(register 만으로는 리렌더 없음).
  const publishAt = watch('publishAt') || '';
  const unpublishAt = watch('unpublishAt') || '';

  if (view === 'edit') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <button type="button" onClick={() => setView('list')} className="text-sm text-gray-500 hover:text-gray-700 mb-3 inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            목록으로
          </button>
          <h2 className="text-2xl font-bold text-gray-900">{editingItem ? '목회컬럼 수정' : '목회컬럼 등록'}</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FormSection title="기본 정보">
            <FormRow>
              <FormField label="제목" required error={errors.title?.message}>
                <input
                  {...register('title', { required: '제목을 입력하세요' })}
                  className={inputClass}
                />
              </FormField>
              <FormField label="상태">
                <select {...register('status')} className={selectClass}>
                  <option value="published">공개</option>
                  <option value="draft">임시저장</option>
                  <option value="archived">보관</option>
                </select>
              </FormField>
            </FormRow>
          </FormSection>

          {/* 예약 공개 — 미리 써 두고 날짜만 넣어 두면 그 날 아침에 저절로 올라간다.
              스케줄러가 없고 사이트가 읽을 때 걸러내는 방식이라, 저장만 해 두면 끝. */}
          <FormSection title="공개 일정">
            <FormRow>
              <FormField label="공개 시작일">
                <input type="date" {...register('publishAt')} className={inputClass} />
              </FormField>
              <FormField label="공개 종료일">
                <input type="date" {...register('unpublishAt')} className={inputClass} />
              </FormField>
            </FormRow>
            <p className="text-xs text-gray-500">
              시작일을 넣으면 <b>그 날짜부터</b> 사이트에 보입니다(그 전에는 숨겨지고, 주소를 알아도 열리지 않습니다).
              종료일을 넣으면 그 날이 지나면 저절로 내려갑니다. 비워 두면 저장하는 즉시 공개되고 계속 걸려 있습니다.
              기준은 교회 현지 시간(미 동부)이며 오늘은 {churchToday()} 입니다.
            </p>
            {publishAt && publishAt > churchToday() && (
              <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
                {publishAt} 부터 공개됩니다. 그때까지는 사이트에 나오지 않습니다.
              </p>
            )}
            {unpublishAt && publishAt && unpublishAt < publishAt && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                종료일이 시작일보다 앞서 있습니다 — 이대로 저장하면 사이트에 한 번도 보이지 않습니다.
              </p>
            )}
          </FormSection>

          <FormSection title="본문">
            <FormField label="내용">
              <RichEditor
                value={watch('content') || ''}
                onChange={(html) => setValue('content', html)}
                minHeight="320px"
                placeholder="칼럼 본문을 입력하세요. 문단·서식·목록을 사용할 수 있습니다."
              />
            </FormField>
          </FormSection>

          <FormSection title="미디어">
            <FormRow>
              <ImageUpload
                value={watch('topImageUrl') || ''}
                onChange={(url) => setValue('topImageUrl', url)}
                onUpload={uploadImage}
                resize="content"
                label="상단 이미지"
              />
              <ImageUpload
                value={watch('bottomImageUrl') || ''}
                onChange={(url) => setValue('bottomImageUrl', url)}
                onUpload={uploadImage}
                resize="content"
                label="하단 이미지"
              />
            </FormRow>
            <FormField label="YouTube URL">
              <input
                {...register('youtubeUrl')}
                placeholder="https://youtube.com/watch?v=..."
                className={inputClass}
              />
            </FormField>
            <ImageUpload
              value={watch('thumbnailUrl') || ''}
              onChange={(url) => setValue('thumbnailUrl', url)}
              onUpload={uploadImage}
              resize="thumb"
              label="썸네일"
            />
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
        <h2 className="text-xl font-bold">칼럼 관리</h2>
        <div className="flex items-center gap-2">
          {bulk.count > 0 && (
            <button
              onClick={() => void bulk.deleteSelected()}
              disabled={bulk.busy}
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
            >
              선택 삭제 ({bulk.count})
            </button>
          )}
          <ContentMigrationButton contentType="columns" label="칼럼" onDone={() => refetch()} />
          <button
            onClick={handleCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            새 칼럼
          </button>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="검색..."
          value={params.search || ''}
          onChange={(e) => setParams((p) => ({ ...p, search: e.target.value, page: 1 }))}
          className="border rounded px-3 py-2 w-full sm:w-64"
        />
      </div>

      {isLoading && <TableSkeleton />}
      {error && <p className="text-red-500">오류가 발생했습니다.</p>}

      {data && data.data.length === 0 && !isLoading && (
        <EmptyState
          icon="✍️"
          title="등록된 칼럼이 없습니다"
          description="새로운 칼럼을 추가해보세요."
          actionLabel="칼럼 추가"
          onAction={() => handleCreate()}
        />
      )}

      {data && data.data.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" checked={bulk.isAllSelected(data.data)} onChange={() => bulk.toggleAll(data.data)} aria-label="전체 선택" />
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium">제목</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">공개 일정</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">공개 상태</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">YouTube</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">액션</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={bulk.has(item.id)} onChange={() => bulk.toggle(item.id)} aria-label={`${item.title} 선택`} />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{item.title}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {publishRangeText(item.publishAt, item.unpublishAt)}
                      <span className="ml-2 text-xs text-gray-400">등록 {dayValue(item.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {/* 공개 상태여도 일정 밖이면 사이트엔 없다 — 둘을 같이 보여줘야 오해가 없다. */}
                      {item.status === 'published' ? (() => {
                        const st = publishBadge(item.publishAt, item.unpublishAt);
                        return <span className={`rounded px-2 py-1 text-xs ${st.cls}`}>{st.label}</span>;
                      })() : (
                        <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                          {item.status === 'draft' ? '임시저장' : '보관'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {item.youtubeUrl ? (
                        <a href={item.youtubeUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                          보기
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
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
