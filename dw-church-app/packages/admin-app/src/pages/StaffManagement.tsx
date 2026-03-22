import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Staff, StaffListParams } from '@dw-church/api-client';
import {
  useStaff,
  useCreateStaff,
  useUpdateStaff,
  useDeleteStaff,
  useStaffDepartments,
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
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingItem, setEditingItem] = useState<Staff | null>(null);
  const [params, setParams] = useState<StaffListParams>({ search: '' });
  const [deleteTarget, setDeleteTarget] = useState<{id: string; name: string} | null>(null);

  const { showToast } = useToast();
  const { data: staffList, isLoading, error } = useStaff(params);
  const { data: departments } = useStaffDepartments();
  const createMutation = useCreateStaff();
  const updateMutation = useUpdateStaff();
  const deleteMutation = useDeleteStaff();

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
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">
            {editingItem ? '교역자 수정' : '교역자 등록'}
          </h2>
          <button
            type="button"
            onClick={() => setView('list')}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            목록으로
          </button>
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
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('isActive')} className="rounded" />
              <span className="text-sm font-medium text-gray-700">활성 상태</span>
            </label>
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
        <h2 className="text-xl font-bold">교역자 관리</h2>
        <button
          onClick={handleCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          새 교역자
        </button>
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
          {staffList.map((item) => (
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
                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded cursor-grab">
                  순서: {item.order}
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
