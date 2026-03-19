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

  const { data: staffList, isLoading, error } = useStaff(params);
  const { data: departments } = useStaffDepartments();
  const createMutation = useCreateStaff();
  const updateMutation = useUpdateStaff();
  const deleteMutation = useDeleteStaff();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<StaffFormData>();

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
    if (window.confirm(`"${item.name}" 을(를) 삭제하시겠습니까?`)) {
      deleteMutation.mutate(item.id);
    }
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
        { onSuccess: () => setView('list') },
      );
    } else {
      createMutation.mutate(payload, { onSuccess: () => setView('list') });
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
            className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
          >
            목록으로
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">이름</label>
              <input
                {...register('name', { required: '이름을 입력하세요' })}
                className="w-full border rounded px-3 py-2"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">직분</label>
              <input
                {...register('role')}
                placeholder="담임목사"
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">부서</label>
            <select {...register('department')} className="w-full border rounded px-3 py-2">
              <option value="">선택하세요</option>
              {departments?.map((dept) => (
                <option key={dept.id} value={dept.slug}>{dept.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">사진 URL</label>
            <input
              {...register('photoUrl')}
              placeholder="https://example.com/photo.jpg"
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">이메일</label>
              <input
                type="email"
                {...register('email')}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">전화번호</label>
              <input
                {...register('phone')}
                placeholder="010-0000-0000"
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">소개</label>
            <textarea
              {...register('bio')}
              rows={4}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <fieldset className="border rounded p-4">
            <legend className="text-sm font-medium px-2">SNS 링크</legend>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Facebook</label>
                <input
                  {...register('snsFacebook')}
                  placeholder="https://facebook.com/..."
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Instagram</label>
                <input
                  {...register('snsInstagram')}
                  placeholder="https://instagram.com/..."
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">YouTube</label>
                <input
                  {...register('snsYoutube')}
                  placeholder="https://youtube.com/..."
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
          </fieldset>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">정렬 순서</label>
              <input
                type="number"
                {...register('order', { valueAsNumber: true })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" {...register('isActive')} className="rounded" />
                <span className="text-sm font-medium">활성 상태</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? '저장 중...' : '저장'}
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              className="px-6 py-2 bg-gray-200 rounded hover:bg-gray-300"
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
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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

      {isLoading && <p className="text-gray-500">로딩 중...</p>}
      {error && <p className="text-red-500">오류가 발생했습니다.</p>}

      {staffList && (
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
                    className="text-xs text-red-600 hover:underline disabled:opacity-50"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
