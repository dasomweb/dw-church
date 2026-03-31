import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useLogin, DWChurchApiError } from '@dw-church/api-client';
import { useAuthStore } from '../stores/auth';

interface LoginFormData {
  email: string;
  password: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const loginMutation = useLogin();
  const setSession = useAuthStore((s) => s.setSession);
  const [errorMsg, setErrorMsg] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setErrorMsg('');
    try {
      const session = await loginMutation.mutateAsync(data);
      setSession(session);
      // Use window.location for super admin to ensure full page load
      // (React Router navigate may fire before zustand state propagates)
      if (session.user?.isSuperAdmin) {
        window.location.href = '/super-admin';
      } else {
        navigate('/');
      }
    } catch (err: unknown) {
      if (err instanceof DWChurchApiError) {
        if (err.status === 401) {
          setErrorMsg('이메일 또는 비밀번호가 올바르지 않습니다.');
        } else {
          setErrorMsg(`서버 오류가 발생했습니다. (${err.status})`);
        }
      } else {
        const message = err instanceof Error ? err.message : '로그인에 실패했습니다.';
        setErrorMsg(message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <svg className="w-12 h-12 text-blue-600 mx-auto mb-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18L19.35 7.5 12 10.82 4.65 7.5 12 4.18z" />
          </svg>
          <h1 className="text-2xl font-bold text-gray-900">DW Church</h1>
          <p className="text-sm text-gray-500 mt-1">관리자 로그인</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                이메일
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email', { required: '이메일을 입력하세요' })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="admin@example.com"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password', { required: '비밀번호를 입력하세요' })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loginMutation.isPending ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm">
            <Link to="/forgot-password" className="text-blue-600 hover:text-blue-800">
              비밀번호를 잊으셨나요?
            </Link>
            <Link to="/register" className="text-blue-600 hover:text-blue-800">
              교회 등록
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
