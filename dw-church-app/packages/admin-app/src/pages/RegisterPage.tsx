import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useRegister } from '@dw-church/api-client';
import { useAuthStore } from '../stores/auth';

interface RegisterFormData {
  churchName: string;
  slug: string;
  ownerName: string;
  email: string;
  password: string;
  passwordConfirm: string;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const registerMutation = useRegister();
  const setSession = useAuthStore((s) => s.setSession);
  const [errorMsg, setErrorMsg] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>();

  const watchSlug = watch('slug', '');
  const watchPassword = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    setErrorMsg('');
    if (data.password !== data.passwordConfirm) {
      setErrorMsg('비밀번호가 일치하지 않습니다.');
      return;
    }
    try {
      const session = await registerMutation.mutateAsync({
        churchName: data.churchName,
        slug: data.slug,
        ownerName: data.ownerName,
        email: data.email,
        password: data.password,
      });
      setSession(session);
      navigate('/');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '등록에 실패했습니다.';
      setErrorMsg(message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <svg className="w-12 h-12 text-blue-600 mx-auto mb-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18L19.35 7.5 12 10.82 4.65 7.5 12 4.18z" />
          </svg>
          <h1 className="text-2xl font-bold text-gray-900">교회 등록</h1>
          <p className="text-sm text-gray-500 mt-1">True Light 플랫폼에 교회를 등록하세요</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                교회 이름
              </label>
              <input
                {...register('churchName', { required: '교회 이름을 입력하세요' })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="예: 사랑의교회"
              />
              {errors.churchName && (
                <p className="text-red-500 text-sm mt-1">{errors.churchName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                사이트 주소 (slug)
              </label>
              <div className="flex items-center">
                <input
                  {...register('slug', {
                    required: 'slug를 입력하세요',
                    pattern: {
                      value: /^[a-z0-9-]+$/,
                      message: '영문 소문자, 숫자, 하이픈만 사용 가능합니다',
                    },
                    minLength: { value: 3, message: '3자 이상 입력하세요' },
                  })}
                  className="flex-1 rounded-l-lg border border-r-0 border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="my-church"
                />
                <span className="bg-gray-100 border border-gray-300 rounded-r-lg px-3 py-2 text-sm text-gray-500 whitespace-nowrap">
                  .dw-church.app
                </span>
              </div>
              {watchSlug && (
                <p className="text-xs text-gray-400 mt-1">
                  https://{watchSlug}.dw-church.app
                </p>
              )}
              {errors.slug && (
                <p className="text-red-500 text-sm mt-1">{errors.slug.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                대표자 이름
              </label>
              <input
                {...register('ownerName', { required: '대표자 이름을 입력하세요' })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="홍길동"
              />
              {errors.ownerName && (
                <p className="text-red-500 text-sm mt-1">{errors.ownerName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이메일
              </label>
              <input
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호
              </label>
              <input
                type="password"
                autoComplete="new-password"
                {...register('password', {
                  required: '비밀번호를 입력하세요',
                  minLength: { value: 8, message: '8자 이상 입력하세요' },
                })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호 확인
              </label>
              <input
                type="password"
                autoComplete="new-password"
                {...register('passwordConfirm', {
                  required: '비밀번호 확인을 입력하세요',
                  validate: (value) =>
                    value === watchPassword || '비밀번호가 일치하지 않습니다',
                })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="••••••••"
              />
              {errors.passwordConfirm && (
                <p className="text-red-500 text-sm mt-1">{errors.passwordConfirm.message}</p>
              )}
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {registerMutation.isPending ? '등록 중...' : '교회 등록'}
            </button>
          </form>

          <div className="mt-4 text-center text-sm">
            <span className="text-gray-500">이미 계정이 있나요? </span>
            <Link to="/login" className="text-blue-600 hover:text-blue-800">
              로그인
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
