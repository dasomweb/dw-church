import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { Sermon, SermonListParams, PostStatus } from '@dw-church/api-client';
import {
  useSermons,
  useCreateSermon,
  useUpdateSermon,
  useDeleteSermon,
  useSermonCategories,
  useSermonPreachers,
  useDWChurchClient,
} from '@dw-church/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { FormField, FormSection, FormRow, inputClass, selectClass, useToast, ConfirmDialog, EmptyState, TableSkeleton, CategoryManager, ImageUpload } from '../components';
import { ContentMigrationButton } from '../components/ContentMigrationButton';
import { useBulkDelete } from '../components/useBulkDelete';

// ─── YouTube 썸네일 유틸 ──────────────────────────────────
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:v=|\/embed\/|\/shorts\/|youtu\.be\/)([0-9A-Za-z_-]{11})/);
  return match?.[1] ?? null;
}

// Priority list for auto-picking the best available thumbnail. YouTube serves
// a 120x90 grey "placeholder" when a given resolution doesn't exist, so we
// probe in order and take the first real image.
const YOUTUBE_THUMB_PRIORITY = ['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault'] as const;

function getYouTubeThumbnailUrl(videoId: string, quality: string = 'maxresdefault'): string {
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}

// ─── YouTube 미디어 섹션 컴포넌트 ─────────────────────────
interface YouTubeMediaSectionProps {
  register: ReturnType<typeof useForm<SermonFormData>>['register'];
  watch: ReturnType<typeof useForm<SermonFormData>>['watch'];
  setValue: ReturnType<typeof useForm<SermonFormData>>['setValue'];
}

function YouTubeMediaSection({ register, watch, setValue }: YouTubeMediaSectionProps) {
  const youtubeUrl = watch('youtubeUrl') || '';
  const thumbnailUrl = watch('thumbnailUrl') || '';
  const videoId = extractYouTubeId(youtubeUrl);
  const [picking, setPicking] = useState(false);
  // Upload a custom thumbnail to R2 (client-side resized) so the operator can
  // override the auto YouTube thumbnail with their own image.
  const client = useDWChurchClient();
  const uploadImage = async (file: File): Promise<string> => (await client!.uploadFile(file)).url;

  // Automatically choose the best available thumbnail when the user enters a
  // YouTube URL (single image, highest quality). YouTube returns a 120x90
  // placeholder for missing resolutions, so we probe in priority order and
  // use the first real image. No per-quality picker UI.
  useEffect(() => {
    if (!videoId || thumbnailUrl) { setPicking(false); return; }
    let cancelled = false;
    setPicking(true);

    const probe = (key: string): Promise<boolean> => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const isPlaceholder = img.naturalWidth === 120 && img.naturalHeight === 90;
        resolve(!isPlaceholder);
      };
      img.onerror = () => resolve(false);
      img.src = getYouTubeThumbnailUrl(videoId, key);
    });

    (async () => {
      for (const key of YOUTUBE_THUMB_PRIORITY) {
        const ok = await probe(key);
        if (cancelled) return;
        if (ok) {
          setValue('thumbnailUrl', getYouTubeThumbnailUrl(videoId, key));
          setPicking(false);
          return;
        }
      }
      if (!cancelled) setPicking(false);
    })();

    return () => { cancelled = true; };
  }, [videoId, thumbnailUrl, setValue]);

  return (
    <FormSection title="미디어">
      <FormField label="YouTube URL">
        <input
          {...register('youtubeUrl')}
          placeholder="https://youtube.com/watch?v=..."
          className={inputClass}
        />
        {youtubeUrl && !videoId && (
          <p className="text-red-500 text-sm mt-1">유효한 YouTube URL이 아닙니다.</p>
        )}
        {videoId && (
          <p className="text-green-600 text-sm mt-1">
            영상 ID: {videoId}
            {picking && <span className="ml-2 text-gray-500">· 최고 화질 썸네일 찾는 중…</span>}
          </p>
        )}
      </FormField>

      {/* 썸네일 — YouTube URL 입력 시 자동 생성되며, 직접 이미지를 업로드하거나
          URL을 입력해 덮어쓸 수 있습니다. ImageUpload 가 미리보기/업로드/URL입력/삭제를
          모두 제공. */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-1.5">썸네일</p>
        <ImageUpload
          label=""
          value={thumbnailUrl}
          onChange={(url) => setValue('thumbnailUrl', url, { shouldDirty: true })}
          onUpload={uploadImage}
          resize="content"
          aspectRatio="16/9"
        />
        <p className="text-xs text-gray-400 mt-1">
          {videoId
            ? 'YouTube URL을 넣으면 썸네일이 자동 생성됩니다. 직접 업로드하면 자동 썸네일 대신 사용됩니다.'
            : '이미지를 직접 업로드하거나 URL을 입력하세요. (YouTube URL 입력 시 자동 생성)'}
          {picking && <span className="ml-1 text-gray-500">· 자동 썸네일 찾는 중…</span>}
        </p>
        <input type="hidden" {...register('thumbnailUrl')} />
      </div>
    </FormSection>
  );
}

interface SermonFormData {
  title: string;
  scripture: string;
  preacher: string;
  youtubeUrl: string;
  date: string;
  categoryIds: string;
  thumbnailUrl: string;
  status: PostStatus;
}

export default function SermonManagement() {
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingItem, setEditingItem] = useState<Sermon | null>(null);
  const [params, setParams] = useState<SermonListParams>({ page: 1, perPage: 10, search: '' });
  const [deleteTarget, setDeleteTarget] = useState<{id: string; name: string} | null>(null);

  const { showToast } = useToast();
  const { data, isLoading, error, refetch } = useSermons(params);
  const { data: categories } = useSermonCategories();
  const { data: preachers } = useSermonPreachers();
  const createMutation = useCreateSermon();
  const updateMutation = useUpdateSermon();
  const deleteMutation = useDeleteSermon();
  const bulk = useBulkDelete<Sermon>({ deleteOne: (id) => deleteMutation.mutateAsync(id), onDone: () => refetch() });
  const apiClient = useDWChurchClient();
  const queryClient = useQueryClient();

  const [newPreacherOpen, setNewPreacherOpen] = useState(false);
  const [newPreacherName, setNewPreacherName] = useState('');
  const [savingPreacher, setSavingPreacher] = useState(false);
  const [catManagerOpen, setCatManagerOpen] = useState(false);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<SermonFormData>();

  // Save an inline-added preacher (from the "+ 설교자 등록" button), then
  // refresh the dropdown and auto-select the newcomer.
  const handleSavePreacher = async () => {
    const name = newPreacherName.trim();
    if (!name || savingPreacher) return;
    setSavingPreacher(true);
    try {
      await apiClient!.adapter.post<{ data: { id: string; name: string } }>(
        '/api/v1/preachers',
        { name },
      );
      await queryClient.invalidateQueries({ queryKey: ['taxonomies', 'sermon_preacher'] });
      setValue('preacher', name);
      setNewPreacherName('');
      setNewPreacherOpen(false);
      showToast('success', `설교자 "${name}" 등록됨`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '설교자 등록 실패');
    } finally {
      setSavingPreacher(false);
    }
  };

  // Delete a preacher from the dedicated preachers table. Fails (FK) if a sermon
  // still references them — surfaced as a clear message.
  const handleDeletePreacher = async (id: string, name: string) => {
    if (!window.confirm(`설교자 "${name}"을(를) 삭제하시겠습니까?`)) return;
    try {
      await apiClient!.adapter.delete(`/api/v1/preachers/${id}`);
      await queryClient.invalidateQueries({ queryKey: ['taxonomies', 'sermon_preacher'] });
      showToast('success', `설교자 "${name}" 삭제됨`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '삭제 실패 — 이 설교자를 사용하는 설교가 있는지 확인하세요.');
    }
  };

  const handleEdit = (item: Sermon) => {
    setEditingItem(item);
    reset({
      title: item.title,
      scripture: item.scripture,
      preacher: item.preacher,
      youtubeUrl: item.youtubeUrl,
      // type="date" only accepts YYYY-MM-DD; trim any ISO datetime so the saved
      // date actually shows (and re-saves) instead of appearing blank.
      date: item.date ? String(item.date).slice(0, 10) : '',
      categoryIds: JSON.stringify(item.categoryIds),
      thumbnailUrl: item.thumbnailUrl,
      status: item.status,
    });
    setView('edit');
  };

  const handleCreate = () => {
    setEditingItem(null);
    reset({ title: '', scripture: '', preacher: '', youtubeUrl: '', date: '', categoryIds: '[]', thumbnailUrl: '', status: 'draft' });
    setView('edit');
  };

  const handleDelete = (item: Sermon) => {
    setDeleteTarget({ id: item.id, name: item.title || '' });
  };

  const onSubmit = (formData: SermonFormData) => {
    const payload = {
      title: formData.title,
      scripture: formData.scripture,
      preacher: formData.preacher,
      youtubeUrl: formData.youtubeUrl,
      date: formData.date,
      categoryIds: JSON.parse(formData.categoryIds || '[]') as string[],
      category: '',
      thumbnailUrl: formData.thumbnailUrl,
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
          <h2 className="text-2xl font-bold text-gray-900">{editingItem ? '설교 수정' : '설교 등록'}</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FormSection title="설교 정보">
            <FormField label="제목" required error={errors.title?.message}>
              <input
                {...register('title', { required: '제목을 입력하세요' })}
                className={inputClass}
              />
            </FormField>
            <FormRow>
              <FormField label="설교자">
                <div className="flex gap-2">
                  <select {...register('preacher')} className={`${selectClass} flex-1`}>
                    <option value="">선택하세요</option>
                    {preachers?.map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setNewPreacherOpen((v) => !v)}
                    className="whitespace-nowrap px-3 py-1.5 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100"
                  >
                    {newPreacherOpen ? '닫기' : '+ 설교자 등록'}
                  </button>
                </div>
                {newPreacherOpen && (
                  <div className="mt-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 space-y-2">
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={newPreacherName}
                        onChange={(e) => setNewPreacherName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void handleSavePreacher(); } }}
                        placeholder="예: 김요한 목사"
                        className="flex-1 border border-indigo-300 rounded px-2 py-1 text-sm"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => void handleSavePreacher()}
                        disabled={!newPreacherName.trim() || savingPreacher}
                        className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {savingPreacher ? '저장 중...' : '저장'}
                      </button>
                    </div>
                    {preachers && preachers.length > 0 && (
                      <ul className="space-y-1 border-t border-indigo-200 pt-2">
                        {preachers.map((p) => (
                          <li key={p.id} className="flex items-center justify-between text-xs text-gray-700">
                            <span>{p.name}{(p as { isDefault?: boolean }).isDefault ? ' (기본)' : ''}</span>
                            {!(p as { isDefault?: boolean }).isDefault && (
                              <button
                                type="button"
                                onClick={() => void handleDeletePreacher(p.id, p.name)}
                                className="text-red-500 hover:text-red-700"
                              >
                                삭제
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </FormField>
              <FormField label="성경구절">
                <input
                  {...register('scripture')}
                  placeholder="요한복음 3:16"
                  className={inputClass}
                />
              </FormField>
            </FormRow>
            <FormRow>
              <FormField label="날짜" required error={errors.date?.message}>
                <input
                  type="date"
                  {...register('date', { required: '날짜를 선택하세요' })}
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

          <YouTubeMediaSection
            register={register}
            watch={watch}
            setValue={setValue}
          />

          <FormSection title="카테고리">
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => setCatManagerOpen(true)}
                className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
              >
                카테고리 관리
              </button>
            </div>
            <div className="border rounded p-3 max-h-40 overflow-y-auto space-y-1">
              {(() => {
                let selectedIds: string[] = [];
                try { selectedIds = JSON.parse(watch('categoryIds') || '[]'); } catch { selectedIds = []; }
                return categories?.map((cat) => (
                  <label key={cat.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(cat.id)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...new Set([...selectedIds, cat.id])]
                          : selectedIds.filter((x) => x !== cat.id);
                        setValue('categoryIds', JSON.stringify(next), { shouldDirty: true });
                      }}
                      className="rounded"
                    />
                    {cat.name}
                  </label>
                ));
              })()}
              {(!categories || categories.length === 0) && (
                <p className="text-gray-400 text-sm">카테고리가 없습니다</p>
              )}
            </div>
            <input type="hidden" {...register('categoryIds')} />
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

        {catManagerOpen && (
          <CategoryManager
            title="설교 카테고리"
            list={() => apiClient!.getSermonCategoriesList()}
            create={(name, slug) => apiClient!.createSermonCategory({ name, slug })}
            update={(id, patch) => apiClient!.updateSermonCategory(id, patch)}
            remove={(id) => apiClient!.deleteSermonCategory(id)}
            onClose={() => setCatManagerOpen(false)}
            onChanged={() => void queryClient.invalidateQueries({ queryKey: ['taxonomies', 'sermon_category'] })}
          />
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">설교 관리</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCatManagerOpen(true)}
            className="text-sm text-gray-600 border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50"
          >
            카테고리 관리
          </button>
          {bulk.count > 0 && (
            <button onClick={() => void bulk.deleteSelected()} disabled={bulk.busy}
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50">
              선택 삭제 ({bulk.count})
            </button>
          )}
          <ContentMigrationButton contentType="sermons" label="설교" onDone={() => refetch()} />
          <button
            onClick={handleCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            새 설교
          </button>
        </div>
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
          onChange={(e) => setParams((p) => ({ ...p, category: e.target.value || undefined, page: 1 }))}
          className="border rounded px-3 py-2"
        >
          <option value="">전체 카테고리</option>
          {categories?.map((cat) => (
            <option key={cat.id} value={cat.slug}>{cat.name}</option>
          ))}
        </select>
        <select
          value={params.preacher || ''}
          onChange={(e) => setParams((p) => ({ ...p, preacher: e.target.value || undefined, page: 1 }))}
          className="border rounded px-3 py-2"
        >
          <option value="">전체 설교자</option>
          {preachers?.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {isLoading && <TableSkeleton />}
      {error && <p className="text-red-500">오류가 발생했습니다.</p>}

      {data && data.data.length === 0 && !isLoading && (
        <EmptyState
          icon="🎤"
          title="등록된 설교가 없습니다"
          description="새로운 설교를 추가해보세요."
          actionLabel="설교 추가"
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
                  <th className="text-left px-4 py-3 text-sm font-medium">설교자</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">성경구절</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">날짜</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">YouTube</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">카테고리</th>
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
                    <td className="px-4 py-3 text-sm">{item.preacher}</td>
                    <td className="px-4 py-3 text-sm">{item.scripture}</td>
                    <td className="px-4 py-3 text-sm">{item.date ? String(item.date).slice(0, 10) : '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      {item.youtubeUrl ? (
                        <a href={item.youtubeUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                          보기
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">{item.category || '-'}</td>
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

      {catManagerOpen && (
        <CategoryManager
          title="설교 카테고리"
          list={() => apiClient!.getSermonCategoriesList()}
          create={(name, slug) => apiClient!.createSermonCategory({ name, slug })}
          update={(id, patch) => apiClient!.updateSermonCategory(id, patch)}
          remove={(id) => apiClient!.deleteSermonCategory(id)}
          onClose={() => setCatManagerOpen(false)}
          onChanged={() => void queryClient.invalidateQueries({ queryKey: ['taxonomies', 'sermon_category'] })}
        />
      )}
    </div>
  );
}
