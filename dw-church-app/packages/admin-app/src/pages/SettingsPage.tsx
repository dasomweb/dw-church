import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  useChurchSettings,
  useUpdateChurchSettings,
  type ChurchSettings,
} from '@dw-church/api-client';

type SettingsFormData = ChurchSettings;

export default function SettingsPage() {
  const { data: settings, isLoading } = useChurchSettings();
  const updateSettings = useUpdateChurchSettings();

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty, isSubmitting },
  } = useForm<SettingsFormData>();

  // Populate form when settings load
  useEffect(() => {
    if (settings) {
      reset(settings);
    }
  }, [settings, reset]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const onSubmit = async (data: SettingsFormData) => {
    try {
      await updateSettings.mutateAsync(data);
      setToast({ message: '설정이 저장되었습니다.', type: 'success' });
    } catch {
      setToast({ message: '설정 저장에 실패했습니다.', type: 'error' });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-14 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      {/* Toast notification */}
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic info section */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">교회 기본 정보</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                교회 이름
              </label>
              <input
                id="name"
                type="text"
                {...register('churchName')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                주소
              </label>
              <input
                id="address"
                type="text"
                {...register('churchAddress')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                전화번호
              </label>
              <input
                id="phone"
                type="tel"
                {...register('churchPhone')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                이메일
              </label>
              <input
                id="email"
                type="email"
                {...register('churchEmail')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                웹사이트
              </label>
              <input
                id="website"
                type="url"
                {...register('churchWebsite')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </section>

        {/* SNS section */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">SNS 링크</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="socialYoutube" className="block text-sm font-medium text-gray-700 mb-1">
                YouTube
              </label>
              <input
                id="socialYoutube"
                type="url"
                {...register('socialYoutube')}
                placeholder="https://youtube.com/@channel"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label htmlFor="socialInstagram" className="block text-sm font-medium text-gray-700 mb-1">
                Instagram
              </label>
              <input
                id="socialInstagram"
                type="url"
                {...register('socialInstagram')}
                placeholder="https://instagram.com/account"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label htmlFor="socialFacebook" className="block text-sm font-medium text-gray-700 mb-1">
                Facebook
              </label>
              <input
                id="socialFacebook"
                type="url"
                {...register('socialFacebook')}
                placeholder="https://facebook.com/page"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label htmlFor="socialLinkedin" className="block text-sm font-medium text-gray-700 mb-1">
                LinkedIn
              </label>
              <input
                id="socialLinkedin"
                type="url"
                {...register('socialLinkedin')}
                placeholder="https://linkedin.com/company/name"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label htmlFor="socialTiktok" className="block text-sm font-medium text-gray-700 mb-1">
                TikTok
              </label>
              <input
                id="socialTiktok"
                type="url"
                {...register('socialTiktok')}
                placeholder="https://tiktok.com/@account"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label htmlFor="socialKakaotalk" className="block text-sm font-medium text-gray-700 mb-1">
                카카오톡
              </label>
              <input
                id="socialKakaotalk"
                type="text"
                {...register('socialKakaotalk')}
                placeholder="카카오톡 ID"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label htmlFor="socialKakaotalkChannel" className="block text-sm font-medium text-gray-700 mb-1">
                카카오톡 채널
              </label>
              <input
                id="socialKakaotalkChannel"
                type="url"
                {...register('socialKakaotalkChannel')}
                placeholder="https://pf.kakao.com/channel"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </section>

        {/* Submit button */}
        <div className="flex items-center justify-end gap-3">
          {isDirty && (
            <span className="text-sm text-amber-600">저장되지 않은 변경사항이 있습니다.</span>
          )}
          <button
            type="submit"
            disabled={isSubmitting || !isDirty}
            className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? '저장 중...' : '설정 저장'}
          </button>
        </div>
      </form>
    </div>
  );
}
