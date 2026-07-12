import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDWChurchClient } from '@dw-church/api-client';

interface ResetFormData {
  password: string;
  confirm: string;
}

/**
 * Password reset landing page — the target of the reset link emailed by
 * auth.service (https://admin.truelight.app/reset-password?token=…). The token
 * identifies the user, so this page is intentionally NOT auth-gated (works
 * whether or not someone is logged in). Without this route the link fell
 * through to the login page.
 */
export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const client = useDWChurchClient();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { register, handleSubmit, watch, formState: { errors } } = useForm<ResetFormData>();

  const onSubmit = async (data: ResetFormData) => {
    setErrorMsg('');
    if (!token) { setErrorMsg('유효하지 않은 링크입니다. 다시 비밀번호 찾기를 진행해 주세요.'); return; }
    setSubmitting(true);
    try {
      await client!.resetPassword(token, data.password);
      setDone(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '재설정에 실패했습니다.';
      setErrorMsg(/expire|invalid|token/i.test(message)
        ? '링크가 만료되었거나 유효하지 않습니다. 다시 비밀번호 찾기를 진행해 주세요.'
        : message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <svg className="w-12 h-12 text-blue-600 mx-auto mb-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18L19.35 7.5 12 10.82 4.65 7.5 12 4.18z" />
          </svg>
          <h1 className="text-2xl font-bold text-gray-900">비밀번호 재설정</h1>
          <p className="text-sm text-gray-500 mt-1">새 비밀번호를 입력해 주세요</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          {done ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">변경되었습니다</h3>
              <p className="text-sm text-gray-500 mb-4">새 비밀번호로 로그인해 주세요. 잠시 후 로그인 화면으로 이동합니다.</p>
              <Link to="/login" className="text-sm text-blue-600 hover:text-blue-800">지금 로그인하기</Link>
            </div>
          ) : !token ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-600 mb-4">유효하지 않은 링크입니다. 비밀번호 찾기를 다시 진행해 주세요.</p>
              <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-800">비밀번호 찾기</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  {...register('password', { required: '비밀번호를 입력하세요', minLength: { value: 8, message: '8자 이상 입력하세요' } })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="8자 이상"
                />
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
              </div>

              <div>
                <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">비밀번호 확인</label>
                <input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  {...register('confirm', {
                    required: '비밀번호를 다시 입력하세요',
                    validate: (v) => v === watch('password') || '비밀번호가 일치하지 않습니다',
                  })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="비밀번호 재입력"
                />
                {errors.confirm && <p className="text-red-500 text-sm mt-1">{errors.confirm.message}</p>}
              </div>

              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{errorMsg}</div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? '변경 중...' : '비밀번호 변경'}
              </button>

              <div className="text-center text-sm">
                <Link to="/login" className="text-blue-600 hover:text-blue-800">로그인으로 돌아가기</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
