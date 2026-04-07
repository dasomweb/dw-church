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
    localStorage.removeItem('dw-church-session');
    try {
      const session = await loginMutation.mutateAsync(data);
      setSession(session);
      if (session.user?.isSuperAdmin) {
        navigate('/super-admin');
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
    <div className="min-h-screen flex">
      {/* Left — Image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=85&auto=format"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 flex flex-col justify-end p-12 text-white">
          <h2 className="text-4xl font-bold mb-3">True Light</h2>
          <p className="text-lg opacity-90 max-w-md">교회 웹사이트를 쉽고 빠르게 관리하세요</p>
          <p className="text-sm opacity-60 mt-2">truelight.app</p>
        </div>
      </div>

      {/* Right — Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50 lg:bg-white">
        <div className="w-full max-w-md">
          {/* Logo (mobile) */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 mb-4">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18L19.35 7.5 12 10.82 4.65 7.5 12 4.18z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">True Light</h1>
            <p className="text-sm text-gray-500 mt-1">관리자 로그인</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                이메일
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email', { required: '이메일을 입력하세요' })}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                placeholder="admin@example.com"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1.5">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password', { required: '비밀번호를 입력하세요' })}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                placeholder="••••••••"
              />
              {errors.password && <p className="text-red-500 text-xs mt-1.5">{errors.password.message}</p>}
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {loginMutation.isPending ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm">
            <Link to="/forgot-password" className="text-gray-500 hover:text-blue-600 transition-colors">
              비밀번호를 잊으셨나요?
            </Link>
            <Link to="/register" className="text-blue-600 font-medium hover:text-blue-800 transition-colors">
              교회 등록 →
            </Link>
          </div>

          <p className="mt-10 text-center text-xs text-gray-400">
            &copy; {new Date().getFullYear()} True Light. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
