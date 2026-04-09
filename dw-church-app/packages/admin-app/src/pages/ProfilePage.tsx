import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUpdateProfile } from '@dw-church/api-client';
import { useAuthStore } from '../stores/auth';
import { useToast } from '../components';

const profileSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요'),
  email: z.string().email('올바른 이메일을 입력해주세요'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요'),
    newPassword: z.string().min(8, '비밀번호는 8자 이상이어야 합니다'),
    confirmPassword: z.string().min(1, '비밀번호 확인을 입력해주세요'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다',
    path: ['confirmPassword'],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

const ROLE_LABELS: Record<string, string> = {
  super_admin: '슈퍼 관리자',
  owner: '소유자',
  admin: '관리자',
  editor: '편집자',
  member: '멤버',
};

export default function ProfilePage() {
  const session = useAuthStore((s) => s.session);
  const setSession = useAuthStore((s) => s.setSession);
  const user = session?.user;
  const updateProfile = useUpdateProfile();
  const { showToast } = useToast();

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors, isDirty: isProfileDirty, isSubmitting: isProfileSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  // Populate profile form when user data is available
  useEffect(() => {
    if (user) {
      resetProfile({ name: user.name, email: user.email });
    }
  }, [user, resetProfile]);

  const onProfileSubmit = async (data: ProfileFormData) => {
    try {
      const updated = await updateProfile.mutateAsync({ name: data.name, email: data.email });
      // Update the local session with new name/email
      if (session) {
        setSession({
          ...session,
          user: { ...session.user, name: updated.name, email: updated.email || session.user.email },
        });
      }
      showToast('success', '프로필이 업데이트되었습니다.');
    } catch {
      showToast('error', '프로필 업데이트에 실패했습니다.');
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    try {
      const host = window.location.hostname;
      const baseUrl = host.startsWith('admin.')
        ? `https://api.${host.replace('admin.', '')}`
        : (import.meta.env.VITE_API_BASE_URL as string) || '';

      const res = await fetch(`${baseUrl}/api/v1/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken || ''}`,
        },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: '변경 실패' } }));
        throw new Error(err.error?.message || `HTTP ${res.status}`);
      }

      showToast('success', '비밀번호가 변경되었습니다.');
      resetPassword();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '비밀번호 변경에 실패했습니다.');
    }
  };

  if (!user) {
    return (
      <div className="max-w-2xl space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Profile Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">기본 정보</h2>

        <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              이름
            </label>
            <input
              id="name"
              type="text"
              {...registerProfile('name')}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {profileErrors.name && (
              <p className="mt-1 text-sm text-red-600">{profileErrors.name.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              이메일
            </label>
            <input
              id="email"
              type="email"
              {...registerProfile('email')}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {profileErrors.email && (
              <p className="mt-1 text-sm text-red-600">{profileErrors.email.message}</p>
            )}
          </div>

          {/* Role (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              역할
            </label>
            <div className="block w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
              {ROLE_LABELS[user.role] || user.role}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!isProfileDirty || isProfileSubmitting}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProfileSubmitting ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>

      {/* Password Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">비밀번호 변경</h2>

        <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
          {/* Current Password */}
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
              현재 비밀번호
            </label>
            <input
              id="currentPassword"
              type="password"
              {...registerPassword('currentPassword')}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="현재 비밀번호 입력"
            />
            {passwordErrors.currentPassword && (
              <p className="mt-1 text-sm text-red-600">{passwordErrors.currentPassword.message}</p>
            )}
          </div>

          {/* New Password */}
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
              새 비밀번호
            </label>
            <input
              id="newPassword"
              type="password"
              {...registerPassword('newPassword')}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="8자 이상 입력"
            />
            {passwordErrors.newPassword && (
              <p className="mt-1 text-sm text-red-600">{passwordErrors.newPassword.message}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              새 비밀번호 확인
            </label>
            <input
              id="confirmPassword"
              type="password"
              {...registerPassword('confirmPassword')}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="비밀번호를 다시 입력"
            />
            {passwordErrors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{passwordErrors.confirmPassword.message}</p>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isPasswordSubmitting}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPasswordSubmitting ? '변경 중...' : '비밀번호 변경'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
