import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Staff, StaffListParams } from '@dw-church/api-client';
import {
  useStaff,
  useCreateStaff,
  useUpdateStaff,
  useDeleteStaff,
  useStaffDepartments,
  useReorderStaff,
  useChurchSettings,
  useUpdateChurchSettings,
} from '@dw-church/api-client';
import { FormField, FormSection, FormRow, inputClass, selectClass, textareaClass, ImageUpload, useToast, ConfirmDialog, EmptyState, CardSkeleton } from '../components';

interface StaffFormData {
  name: string;
  role: string;
  department: string;
  photoUrl: string;
  email: string;
  phone: string;
  bio: string;
  snsFacebook: string;
  snsInstagram: string;
  snsYoutube: string;
  order: number;
  isActive: boolean;
}

export default function StaffManagement() {
  const [view, setView] = useState<'list' | 'edit' | 'display'>('list');
  const [editingItem, setEditingItem] = useState<Staff | null>(null);
  const [params, setParams] = useState<StaffListParams>({ search: '' });
  const [deleteTarget, setDeleteTarget] = useState<{id: string; name: string} | null>(null);

  const { showToast } = useToast();
  const { data: staffList, isLoading, error } = useStaff(params);
  const { data: departments } = useStaffDepartments();
  const { data: settings } = useChurchSettings();
  const updateSettings = useUpdateChurchSettings();
  const createMutation = useCreateStaff();
  const updateMutation = useUpdateStaff();
  const deleteMutation = useDeleteStaff();
  const reorderMutation = useReorderStaff();

  const handleMoveStaff = (index: number, direction: 'up' | 'down') => {
    if (!staffList) return;
    const sorted = [...staffList];
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    [sorted[index], sorted[swapIdx]] = [sorted[swapIdx], sorted[index]];
    reorderMutation.mutate(sorted.map((s) => s.id), {
      onSuccess: () => showToast('success', '순서가 변경되었습니다.'),
    });
  };

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<StaffFormData>();

  const handleEdit = (item: Staff) => {
    setEditingItem(item);
    reset({
      name: item.name,
      role: item.role,
      department: item.department,
      photoUrl: item.photoUrl,
      email: item.email,
      phone: item.phone,
      bio: item.bio,
      snsFacebook: item.snsLinks?.facebook || '',
      snsInstagram: item.snsLinks?.instagram || '',
      snsYoutube: item.snsLinks?.youtube || '',
      order: item.order,
      isActive: item.isActive,
    });
    setView('edit');
  };

  const handleCreate = () => {
    setEditingItem(null);
    reset({
      name: '', role: '', department: '', photoUrl: '', email: '', phone: '',
      bio: '', snsFacebook: '', snsInstagram: '', snsYoutube: '', order: 0, isActive: true,
    });
    setView('edit');
  };

  const handleDelete = (item: Staff) => {
    setDeleteTarget({ id: item.id, name: item.name || '' });
  };

  const onSubmit = (formData: StaffFormData) => {
    const payload: Omit<Staff, 'id'> = {
      name: formData.name,
      role: formData.role,
      department: formData.department,
      photoUrl: formData.photoUrl,
      email: formData.email,
      phone: formData.phone,
      bio: formData.bio,
      snsLinks: {
        facebook: formData.snsFacebook || undefined,
        instagram: formData.snsInstagram || undefined,
        youtube: formData.snsYoutube || undefined,
      },
      order: Number(formData.order),
      isActive: formData.isActive,
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
          <h2 className="text-2xl font-bold text-gray-900">{editingItem ? '교역자 수정' : '교역자 등록'}</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FormSection title="기본 정보">
            <FormRow>
              <FormField label="이름" required error={errors.name?.message}>
                <input
                  {...register('name', { required: '이름을 입력하세요' })}
                  className={inputClass}
                />
              </FormField>
              <FormField label="직분/역할">
                <input
                  {...register('role')}
                  placeholder="담임목사"
                  className={inputClass}
                />
              </FormField>
            </FormRow>
            <FormRow>
              <FormField label="부서">
                <select {...register('department')} className={selectClass}>
                  <option value="">선택하세요</option>
                  {departments?.map((dept) => (
                    <option key={dept.id} value={dept.slug}>{dept.name}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="노출 순서">
                <input
                  type="number"
                  {...register('order', { valueAsNumber: true })}
                  className={inputClass}
                />
              </FormField>
            </FormRow>
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-5 py-4">
              <div>
                <p className="text-sm font-medium text-gray-900">활성 상태</p>
                <p className="text-xs text-gray-500 mt-0.5">비활성으로 설정하면 사이트에 표시되지 않습니다</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" {...register('isActive')} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-blue-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>
          </FormSection>

          <FormSection title="프로필">
            <ImageUpload
              value={watch('photoUrl') || ''}
              onChange={(url) => setValue('photoUrl', url)}
              aspectRatio="1/1"
              label="프로필 사진"
            />
            <FormField label="약력">
              <textarea
                {...register('bio')}
                rows={6}
                className={textareaClass}
              />
            </FormField>
          </FormSection>

          <FormSection title="연락처">
            <FormRow>
              <FormField label="이메일">
                <input
                  type="email"
                  {...register('email')}
                  className={inputClass}
                />
              </FormField>
              <FormField label="전화번호">
                <input
                  type="tel"
                  {...register('phone')}
                  placeholder="010-0000-0000"
                  className={inputClass}
                />
              </FormField>
            </FormRow>
          </FormSection>

          <FormSection title="SNS">
            <FormRow cols={3}>
              <FormField label="Facebook URL">
                <input
                  {...register('snsFacebook')}
                  placeholder="https://facebook.com/..."
                  className={inputClass}
                />
              </FormField>
              <FormField label="Instagram URL">
                <input
                  {...register('snsInstagram')}
                  placeholder="https://instagram.com/..."
                  className={inputClass}
                />
              </FormField>
              <FormField label="YouTube URL">
                <input
                  {...register('snsYoutube')}
                  placeholder="https://youtube.com/..."
                  className={inputClass}
                />
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

  // ─── Display Settings Tab ─────────────────────
  if (view === 'display') {
    const staffDisplay = (settings as any)?.staffDisplay || {};
    const displayLayout = staffDisplay.layout || 'grid';
    const displayColumns = staffDisplay.columns || 4;
    const displayGroupBy = staffDisplay.groupBy || 'role';
    const displayGroups: string[] = (staffDisplay.customGroups || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    const [localLayout, setLocalLayout] = useState(displayLayout);
    const [localColumns, setLocalColumns] = useState(displayColumns);
    const [localGroupBy, setLocalGroupBy] = useState(displayGroupBy);
    const [localGroups, setLocalGroups] = useState<string[]>(displayGroups);
    const [newGroup, setNewGroup] = useState('');

    const handleSaveDisplay = () => {
      updateSettings.mutate({
        staffDisplay: {
          layout: localLayout,
          columns: localColumns,
          groupBy: localGroupBy,
          customGroups: localGroups.join(','),
        },
      } as any, {
        onSuccess: () => showToast('success', '표시 설정이 저장되었습니다.'),
        onError: () => showToast('error', '저장 중 오류가 발생했습니다.'),
      });
    };

    const handleAddGroup = () => {
      if (!newGroup.trim() || localGroups.includes(newGroup.trim())) return;
      setLocalGroups([...localGroups, newGroup.trim()]);
      setNewGroup('');
    };

    const handleMoveGroup = (index: number, dir: 'up' | 'down') => {
      const swapIdx = dir === 'up' ? index - 1 : index + 1;
      if (swapIdx < 0 || swapIdx >= localGroups.length) return;
      const arr = [...localGroups];
      [arr[index], arr[swapIdx]] = [arr[swapIdx], arr[index]];
      setLocalGroups(arr);
    };

    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">교역자 관리</h2>
        </div>
        <div className="flex gap-2 mb-6">
          <button onClick={() => setView('list')} className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200">교역자 목록</button>
          <button className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white">표시 설정</button>
        </div>

        <div className="max-w-xl space-y-6">
          <FormSection title="레이아웃">
            <FormRow>
              <FormField label="표시 방식">
                <select value={localLayout} onChange={(e) => setLocalLayout(e.target.value)} className={selectClass}>
                  <option value="grid">전체 그리드</option>
                  <option value="grouped">직분별 그룹</option>
                </select>
              </FormField>
              {localLayout === 'grid' && (
                <FormField label="열 수">
                  <select value={localColumns} onChange={(e) => setLocalColumns(Number(e.target.value))} className={selectClass}>
                    <option value={2}>2열</option>
                    <option value={3}>3열</option>
                    <option value={4}>4열</option>
                  </select>
                </FormField>
              )}
            </FormRow>
          </FormSection>

          {localLayout === 'grouped' && (
            <FormSection title="그룹 설정">
              <FormField label="그룹 기준">
                <select value={localGroupBy} onChange={(e) => setLocalGroupBy(e.target.value)} className={selectClass}>
                  <option value="role">직분 (role)</option>
                  <option value="department">부서 (department)</option>
                </select>
              </FormField>

              <FormField label="그룹 순서">
                <div className="space-y-1.5">
                  {localGroups.length > 0 && (
                    <div className="space-y-1">
                      {localGroups.map((g, i) => (
                        <div key={`${g}-${i}`} className="flex items-center gap-1 bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-xs text-gray-400 w-5">{i + 1}</span>
                          <span className="flex-1 text-sm font-medium">{g}</span>
                          <button type="button" onClick={() => handleMoveGroup(i, 'up')} disabled={i === 0} className="text-gray-400 hover:text-gray-700 disabled:opacity-20 px-1">▲</button>
                          <button type="button" onClick={() => handleMoveGroup(i, 'down')} disabled={i === localGroups.length - 1} className="text-gray-400 hover:text-gray-700 disabled:opacity-20 px-1">▼</button>
                          <button type="button" onClick={() => setLocalGroups(localGroups.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 px-1">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={newGroup}
                      onChange={(e) => setNewGroup(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddGroup(); } }}
                      placeholder="그룹명 (예: 담임목사)"
                      className={inputClass}
                    />
                    <button type="button" onClick={handleAddGroup} disabled={!newGroup.trim()} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">추가</button>
                  </div>
                  <p className="text-xs text-gray-400">비어있으면 데이터에서 자동 분류됩니다</p>
                </div>
              </FormField>
            </FormSection>
          )}

          <button
            onClick={handleSaveDisplay}
            disabled={updateSettings.isPending}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {updateSettings.isPending ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">교역자 관리</h2>
        <button
          onClick={handleCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          새 교역자
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setView('list')} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white">교역자 목록</button>
        <button onClick={() => setView('display')} className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200">표시 설정</button>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="검색..."
          value={params.search || ''}
          onChange={(e) => setParams((p) => ({ ...p, search: e.target.value }))}
          className="border rounded px-3 py-2 w-64"
        />
        <select
          value={params.department || ''}
          onChange={(e) => setParams((p) => ({ ...p, department: e.target.value || undefined }))}
          className="border rounded px-3 py-2"
        >
          <option value="">전체 부서</option>
          {departments?.map((dept) => (
            <option key={dept.id} value={dept.slug}>{dept.name}</option>
          ))}
        </select>
      </div>

      {isLoading && <CardSkeleton />}
      {error && <p className="text-red-500">오류가 발생했습니다.</p>}

      {staffList && staffList.length === 0 && !isLoading && (
        <EmptyState
          icon="👥"
          title="등록된 교역자가 없습니다"
          description="새로운 교역자를 추가해보세요."
          actionLabel="교역자 추가"
          onAction={() => handleCreate()}
        />
      )}

      {staffList && staffList.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {staffList.map((item, index) => (
            <div key={item.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-square bg-gray-100 relative">
                {item.photoUrl ? (
                  <img
                    src={item.photoUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl">
                    ?
                  </div>
                )}
                {!item.isActive && (
                  <span className="absolute top-2 right-2 bg-red-500/80 text-white text-xs px-2 py-1 rounded">
                    비활성
                  </span>
                )}
                {/* 순서 변경 버튼 */}
                <div className="absolute bottom-2 left-2 flex gap-1">
                  <button
                    onClick={() => handleMoveStaff(index, 'up')}
                    disabled={index === 0 || reorderMutation.isPending}
                    className="bg-black/60 text-white text-xs w-6 h-6 rounded flex items-center justify-center hover:bg-black/80 disabled:opacity-30"
                    title="위로"
                  >
                    ◀
                  </button>
                  <span className="bg-black/60 text-white text-xs px-2 h-6 rounded flex items-center">{index + 1}</span>
                  <button
                    onClick={() => handleMoveStaff(index, 'down')}
                    disabled={index === staffList.length - 1 || reorderMutation.isPending}
                    className="bg-black/60 text-white text-xs w-6 h-6 rounded flex items-center justify-center hover:bg-black/80 disabled:opacity-30"
                    title="아래로"
                  >
                    ▶
                  </button>
                </div>
              </div>
              <div className="p-3">
                <h3 className="text-sm font-bold">{item.name}</h3>
                <p className="text-xs text-gray-600">{item.role}</p>
                <p className="text-xs text-gray-400">{item.department}</p>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => handleEdit(item)} className="text-xs text-blue-600 hover:underline">편집</button>
                  <button
                    onClick={() => handleDelete(item)}
                    disabled={deleteMutation.isPending}
                    className="text-xs text-red-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
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
