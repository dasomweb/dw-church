import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  useUsers,
  useInviteUser,
  useRemoveUser,
} from '@dw-church/api-client';
import { useAuthStore } from '../stores/auth';

interface InviteFormData {
  email: string;
  name: string;
  role: 'admin' | 'editor';
}

const ROLE_LABELS: Record<string, string> = {
  owner: '소유자',
  admin: '관리자',
  editor: '편집자',
};

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
  editor: 'bg-green-100 text-green-800',
};

export default function UserManagement() {
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const session = useAuthStore((s) => s.session);
  const currentUser = session?.user;
  const isOwner = currentUser?.role === 'owner';

  const { data: users, isLoading } = useUsers();
  const inviteMutation = useInviteUser();
  const removeMutation = useRemoveUser();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteFormData>({
    defaultValues: { role: 'editor' },
  });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const onSubmitInvite = async (data: InviteFormData) => {
    try {
      await inviteMutation.mutateAsync(data);
      showToast(`${data.email}로 초대를 보냈습니다.`, 'success');
      reset({ email: '', name: '', role: 'editor' });
      setShowInviteForm(false);
    } catch {
      showToast('초대에 실패했습니다.', 'error');
    }
  };

  const handleRemoveUser = (userId: string, userName: string) => {
    if (!isOwner) return;
    if (window.confirm(`"${userName}" 을(를) 삭제하시겠습니까?`)) {
      removeMutation.mutate(userId, {
        onSuccess: () => showToast('사용자가 삭제되었습니다.', 'success'),
        onError: () => showToast('삭제에 실패했습니다.', 'error'),
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold">사용자 관리</h2>
        <button
          onClick={() => {
            reset({ email: '', name: '', role: 'editor' });
            setShowInviteForm(!showInviteForm);
          }}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          사용자 초대
        </button>
      </div>

      {/* Invite form */}
      {showInviteForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-bold mb-3">새 사용자 초대</h3>
          <form onSubmit={handleSubmit(onSubmitInvite)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">이름</label>
                <input
                  {...register('name', { required: '이름을 입력하세요' })}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="홍길동"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">이메일</label>
                <input
                  type="email"
                  {...register('email', { required: '이메일을 입력하세요' })}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="user@example.com"
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">역할</label>
                <select {...register('role')} className="w-full border rounded px-3 py-2 text-sm">
                  <option value="editor">편집자</option>
                  <option value="admin">관리자</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={inviteMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {inviteMutation.isPending ? '전송 중...' : '초대 보내기'}
              </button>
              <button
                type="button"
                onClick={() => setShowInviteForm(false)}
                className="px-4 py-2 bg-gray-200 text-sm rounded hover:bg-gray-300"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* User list */}
      {isLoading && <p className="text-sm text-gray-500">로딩 중...</p>}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-3 text-sm font-medium">이름</th>
              <th className="text-left px-4 py-3 text-sm font-medium">이메일</th>
              <th className="text-left px-4 py-3 text-sm font-medium">역할</th>
              <th className="text-left px-4 py-3 text-sm font-medium">액션</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((user) => (
              <tr key={user.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium">
                  {user.name}
                  {user.id === currentUser?.id && (
                    <span className="ml-2 text-xs text-gray-400">(나)</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-600'}`}>
                    {ROLE_LABELS[user.role] || user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  {isOwner && user.role !== 'owner' && user.id !== currentUser?.id && (
                    <button
                      onClick={() => handleRemoveUser(user.id, user.name)}
                      disabled={removeMutation.isPending}
                      className="text-red-600 hover:underline text-xs disabled:opacity-50"
                    >
                      삭제
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {users?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">
                  사용자가 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
