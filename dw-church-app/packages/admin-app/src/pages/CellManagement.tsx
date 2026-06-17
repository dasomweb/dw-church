import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Cell } from '@dw-church/api-client';
import {
  useCells,
  useCreateCell,
  useUpdateCell,
  useDeleteCell,
  useDWChurchClient,
  DWChurchApiError,
} from '@dw-church/api-client';
import { FormField, FormSection, FormRow, inputClass, textareaClass, ImageUpload, useToast, ConfirmDialog, EmptyState, CardSkeleton } from '../components';
import { useBulkDelete } from '../components/useBulkDelete';

interface CellFormData {
  name: string;
  leaderName: string;
  leaderRole: string;
  region: string;
  meetingDay: string;
  meetingTime: string;
  location: string;
  contact: string;
  description: string;
  photoUrl: string;
  sortOrder: number;
  isVisible: boolean;
}

// 목장 관리는 Plus 이상 플랜에서만 사용 가능. 서버는 403 + body 안에
// PLAN_UPGRADE_REQUIRED 코드를 내려줌. DWChurchApiError 의 .status / .body 를
// 직접 확인해 친절한 안내 토스트로 바꿔준다.
function isPlanUpgradeApiError(err: unknown): boolean {
  if (err instanceof DWChurchApiError) {
    return err.status === 403 && (err.body?.includes('PLAN_UPGRADE_REQUIRED') ?? false);
  }
  return false;
}

export default function CellManagement() {
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingItem, setEditingItem] = useState<Cell | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const { showToast } = useToast();
  const apiClient = useDWChurchClient();
  // 목장 사진을 R2 에 업로드하고 짧은 URL 을 받는다. ImageUpload 가 먼저
  // 클라이언트 측에서 리사이즈하므로 저장 시 photo_url 길이 제한을 넘지 않는다.
  const uploadImage = async (file: File): Promise<string> => {
    const res = await apiClient!.uploadFile(file);
    return res.url;
  };

  const { data: cells, isLoading, error, refetch } = useCells();
  const createMutation = useCreateCell();
  const updateMutation = useUpdateCell();
  const deleteMutation = useDeleteCell();
  const bulk = useBulkDelete<Cell>({ deleteOne: (id) => deleteMutation.mutateAsync(id), onDone: () => refetch() });

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<CellFormData>();

  // sortOrder 기준 정렬 (없으면 0 으로 취급)
  const sortedCells = cells ? [...cells].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)) : [];

  const handleEdit = (item: Cell) => {
    setEditingItem(item);
    reset({
      name: item.name,
      leaderName: item.leaderName ?? '',
      leaderRole: item.leaderRole ?? '',
      region: item.region ?? '',
      meetingDay: item.meetingDay ?? '',
      meetingTime: item.meetingTime ?? '',
      location: item.location ?? '',
      contact: item.contact ?? '',
      description: item.description ?? '',
      photoUrl: item.photoUrl ?? '',
      sortOrder: item.sortOrder ?? 0,
      isVisible: item.isVisible ?? true,
    });
    setView('edit');
  };

  const handleCreate = () => {
    setEditingItem(null);
    reset({
      name: '', leaderName: '', leaderRole: '', region: '', meetingDay: '', meetingTime: '',
      location: '', contact: '', description: '', photoUrl: '', sortOrder: 0, isVisible: true,
    });
    setView('edit');
  };

  const handleDelete = (item: Cell) => {
    setDeleteTarget({ id: item.id, name: item.name || '' });
  };

  const onSubmit = async (formData: CellFormData) => {
    const payload: Omit<Cell, 'id'> = {
      name: formData.name,
      leaderName: formData.leaderName || null,
      leaderRole: formData.leaderRole || null,
      region: formData.region || null,
      meetingDay: formData.meetingDay || null,
      meetingTime: formData.meetingTime || null,
      location: formData.location || null,
      contact: formData.contact || null,
      description: formData.description || null,
      photoUrl: formData.photoUrl || null,
      sortOrder: Number(formData.sortOrder),
      isVisible: formData.isVisible,
    };

    try {
      if (editingItem) {
        await updateMutation.mutateAsync({ id: editingItem.id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      showToast('success', '저장되었습니다.');
      setView('list');
    } catch (err) {
      if (isPlanUpgradeApiError(err)) {
        showToast('error', '목장 관리는 플러스 이상 플랜에서 사용할 수 있습니다.');
        return;
      }
      showToast('error', '오류가 발생했습니다.');
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
          <h2 className="text-2xl font-bold text-gray-900">{editingItem ? '목장 수정' : '목장 등록'}</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FormSection title="기본 정보">
            <FormRow>
              <FormField label="목장 이름" required error={errors.name?.message}>
                <input
                  {...register('name', { required: '목장 이름을 입력하세요' })}
                  placeholder="사랑 목장"
                  className={inputClass}
                />
              </FormField>
              <FormField label="노출 순서">
                <input
                  type="number"
                  {...register('sortOrder', { valueAsNumber: true })}
                  className={inputClass}
                />
              </FormField>
            </FormRow>
            <FormRow>
              <FormField label="목자/리더">
                <input
                  {...register('leaderName')}
                  placeholder="홍길동"
                  className={inputClass}
                />
              </FormField>
              <FormField label="직분">
                <input
                  {...register('leaderRole')}
                  placeholder="집사"
                  className={inputClass}
                />
              </FormField>
            </FormRow>
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-5 py-4">
              <div>
                <p className="text-sm font-medium text-gray-900">노출 상태</p>
                <p className="text-xs text-gray-500 mt-0.5">비활성으로 설정하면 사이트에 표시되지 않습니다</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" {...register('isVisible')} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-blue-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>
          </FormSection>

          <FormSection title="모임 정보">
            <FormRow>
              <FormField label="지역/구역">
                <input
                  {...register('region')}
                  placeholder="강남구"
                  className={inputClass}
                />
              </FormField>
              <FormField label="모임 장소">
                <input
                  {...register('location')}
                  placeholder="교회 2층 소그룹실"
                  className={inputClass}
                />
              </FormField>
            </FormRow>
            <FormRow>
              <FormField label="모임 요일">
                <input
                  {...register('meetingDay')}
                  placeholder="매주 금요일"
                  className={inputClass}
                />
              </FormField>
              <FormField label="모임 시간">
                <input
                  {...register('meetingTime')}
                  placeholder="오후 7:30"
                  className={inputClass}
                />
              </FormField>
            </FormRow>
            <FormField label="연락처">
              <input
                type="tel"
                {...register('contact')}
                placeholder="010-0000-0000"
                className={inputClass}
              />
            </FormField>
          </FormSection>

          <FormSection title="소개">
            <ImageUpload
              value={watch('photoUrl') || ''}
              onChange={(url) => setValue('photoUrl', url)}
              onUpload={uploadImage}
              resize="content"
              label="목장 사진"
            />
            <FormField label="소개글">
              <textarea
                {...register('description')}
                rows={5}
                className={textareaClass}
              />
            </FormField>
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
        </form>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">목장 관리</h2>
        <div className="flex items-center gap-2">
          {sortedCells.length > 0 && (
            <button onClick={() => bulk.toggleAll(sortedCells)}
              className="text-sm text-gray-600 border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50">
              {bulk.isAllSelected(sortedCells) ? '선택 해제' : '전체 선택'}
            </button>
          )}
          {bulk.count > 0 && (
            <button onClick={() => void bulk.deleteSelected()} disabled={bulk.busy}
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50">
              선택 삭제 ({bulk.count})
            </button>
          )}
          <button
            onClick={handleCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            새 목장
          </button>
        </div>
      </div>

      {isLoading && <CardSkeleton />}
      {error && <p className="text-red-500">오류가 발생했습니다.</p>}

      {cells && cells.length === 0 && !isLoading && (
        <EmptyState
          icon="🏠"
          title="등록된 목장이 없습니다"
          description="새로운 목장을 추가해보세요."
          actionLabel="목장 추가"
          onAction={() => handleCreate()}
        />
      )}

      {sortedCells.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-2.5 w-10"></th>
                <th className="px-4 py-2.5 font-medium text-gray-600">목장</th>
                <th className="px-4 py-2.5 font-medium text-gray-600 w-32">목자</th>
                <th className="px-4 py-2.5 font-medium text-gray-600 w-28">지역</th>
                <th className="px-4 py-2.5 font-medium text-gray-600 w-40">모임</th>
                <th className="px-4 py-2.5 font-medium text-gray-600 w-20 text-center">노출</th>
                <th className="px-4 py-2.5 font-medium text-gray-600 w-24 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedCells.map((item) => (
                <tr key={item.id} className={`hover:bg-gray-50 ${bulk.has(item.id) ? 'bg-red-50' : ''}`}>
                  <td className="px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={bulk.has(item.id)}
                      onChange={() => bulk.toggle(item.id)}
                      aria-label={`${item.name} 선택`}
                      className="h-4 w-4 accent-red-600 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      {item.photoUrl ? (
                        <img src={item.photoUrl} alt={item.name} className="w-9 h-9 rounded-lg object-cover bg-gray-100" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs">🏠</div>
                      )}
                      <span className="font-medium text-gray-800">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {item.leaderName}
                    {item.leaderRole ? <span className="text-gray-400"> ({item.leaderRole})</span> : null}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{item.region}</td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {[item.meetingDay, item.meetingTime].filter(Boolean).join(' ')}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {item.isVisible !== false ? (
                      <span className="inline-block bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded">노출</span>
                    ) : (
                      <span className="inline-block bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded">숨김</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => handleEdit(item)} className="text-xs text-blue-600 hover:underline">편집</button>
                      <button
                        onClick={() => handleDelete(item)}
                        disabled={deleteMutation.isPending}
                        className="text-xs text-red-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
