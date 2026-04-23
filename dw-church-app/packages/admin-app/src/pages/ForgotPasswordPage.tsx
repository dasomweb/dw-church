import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import { useForgotPassword } from '@dw-church/api-client';

interface ForgotPasswordFormData {
  email: string;
}

export default function ForgotPasswordPage() {
  const { slug } = useParams<{ slug?: string }>();
  const loginPath = slug ? `/t/${slug}/login` : '/login';
  const forgotMutation = useForgotPassword();
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>();

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setErrorMsg('');
    try {
      await forgotMutation.mutateAsync(data.email);
      setSent(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '요청에 실패했습니다.';
      setErrorMsg(message);
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
          <h1 className="text-2xl font-bold text-gray-900">비밀번호 찾기</h1>
          <p className="text-sm text-gray-500 mt-1">
            등록된 이메일로 비밀번호 재설정 링크를 보내드립니다
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">이메일을 확인하세요</h3>
              <p className="text-sm text-gray-500 mb-4">
                비밀번호 재설정 링크가 이메일로 발송되었습니다.
                <br />
                메일함을 확인해 주세요.
              </p>
              <Link
                to={loginPath}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                로그인으로 돌아가기
              </Link>
            </div>
          ) : (
            <>
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

                {errorMsg && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={forgotMutation.isPending}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {forgotMutation.isPending ? '전송 중...' : '재설정 링크 전송'}
                </button>
              </form>

              <div className="mt-4 text-center text-sm">
                <Link to={loginPath} className="text-blue-600 hover:text-blue-800">
                  로그인으로 돌아가기
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
