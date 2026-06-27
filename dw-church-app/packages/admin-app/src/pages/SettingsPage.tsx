import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  useChurchSettings,
  useUpdateChurchSettings,
  useDWChurchClient,
  useMenus,
  type ChurchSettings,
} from '@dw-church/api-client';
import { ImageUpload } from '../components';

type SettingsFormData = ChurchSettings;

export default function SettingsPage() {
  const { data: settings, isLoading } = useChurchSettings();
  const { data: menus } = useMenus();
  const updateSettings = useUpdateChurchSettings();
  const apiClient = useDWChurchClient();
  const uploadImage = async (file: File): Promise<string> => (await apiClient!.uploadFile(file)).url;

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [exporting, setExporting] = useState(false);

  // Download the full content archive (all tiers — the SaaS exit guarantee).
  const handleExport = async () => {
    if (!apiClient || exporting) return;
    setExporting(true);
    try {
      const blob = await apiClient.exportData();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().slice(0, 10);
      a.download = `${settings?.churchName || 'church'}-export-${date}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setToast({ message: '데이터를 내보냈습니다.', type: 'success' });
    } catch {
      setToast({ message: '데이터 내보내기에 실패했습니다.', type: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
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

        {/* Branding section */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">브랜딩</h2>
          <p className="text-xs text-gray-500 mb-4">로고와 파비콘은 사이트 헤더와 브라우저 탭에 표시됩니다.</p>
          <div className="space-y-4">
            <div>
              <ImageUpload
                label="로고 이미지"
                value={watch('logoUrl') || ''}
                onChange={(url) => setValue('logoUrl', url, { shouldDirty: true })}
                onUpload={uploadImage}
                resize="content"
                format="auto"
                aspectRatio="3/1"
              />
              <p className="text-xs text-gray-400 mt-1">권장: 가로형 PNG, 높이 40~60px, 투명 배경</p>
            </div>
            <div>
              <ImageUpload
                label="파비콘"
                value={watch('faviconUrl') || ''}
                onChange={(url) => setValue('faviconUrl', url, { shouldDirty: true })}
                onUpload={uploadImage}
                resize="thumb"
                format="auto"
                aspectRatio="1/1"
              />
              <p className="text-xs text-gray-400 mt-1">권장: 정사각형 PNG (32x32 또는 64x64)</p>
            </div>
          </div>
        </section>

        {/* SEO section */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">SEO (검색 엔진 최적화)</h2>
          <p className="text-xs text-gray-500 mb-4">Google 등 검색 엔진에 표시되는 정보입니다.</p>
          <div className="space-y-4">
            <div>
              <label htmlFor="seoTitle" className="block text-sm font-medium text-gray-700 mb-1">사이트 제목</label>
              <input id="seoTitle" type="text" {...register('seoTitle')} placeholder="교회이름 - 사랑과 은혜의 교회" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
              <p className="text-xs text-gray-400 mt-1">비워두면 교회 이름이 사용됩니다.</p>
            </div>
            <div>
              <label htmlFor="seoDescription" className="block text-sm font-medium text-gray-700 mb-1">사이트 설명</label>
              <textarea id="seoDescription" {...register('seoDescription')} rows={3} placeholder="교회를 소개하는 간단한 설명 (150자 이내 권장)" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label htmlFor="seoKeywords" className="block text-sm font-medium text-gray-700 mb-1">키워드</label>
              <input id="seoKeywords" type="text" {...register('seoKeywords')} placeholder="교회, 예배, 설교, 지역명" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
              <p className="text-xs text-gray-400 mt-1">쉼표로 구분</p>
            </div>
            <div>
              <ImageUpload
                label="OG 이미지 (SNS 공유용)"
                value={watch('ogImageUrl') || ''}
                onChange={(url) => setValue('ogImageUrl', url, { shouldDirty: true })}
                onUpload={uploadImage}
                resize="background"
                aspectRatio="1200/630"
              />
              <p className="text-xs text-gray-400 mt-1">SNS(카카오톡/페이스북) 공유 시 표시되는 이미지 (1200x630 권장)</p>
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

        {/* Web App bottom tabs (shows when the 웹앱 add-on is on) */}
        {(() => {
          const topMenus = (menus ?? []).filter((m: { parentId?: string | null }) => !m.parentId);
          let tabIds: string[] = [];
          try { tabIds = JSON.parse((watch('webAppTabIds') as string) || '[]'); } catch { tabIds = []; }
          const toggle = (id: string) => {
            const next = tabIds.includes(id) ? tabIds.filter((x) => x !== id) : [...tabIds, id];
            if (next.length > 5) return; // max 5 tabs
            setValue('webAppTabIds', JSON.stringify(next), { shouldDirty: true });
          };
          return (
            <section className="bg-white rounded-lg border border-gray-200 p-6">
              <input type="hidden" {...register('webAppTabIds')} />
              <h2 className="text-base font-semibold text-gray-900 mb-1">웹앱 하단 탭 <span className="text-xs font-normal text-gray-400">(웹앱 부가기능 사용 시)</span></h2>
              <p className="text-xs text-gray-500 mb-4">
                설치형 앱의 하단 탭바에 띄울 메뉴를 <strong>최대 5개</strong> 고르세요(선택 순서대로 배치). 나머지 메뉴는 "메뉴" 탭에서 보입니다. 비워두면 메뉴 순서대로 자동 표시됩니다.
              </p>
              {topMenus.length === 0 ? (
                <p className="text-sm text-gray-400">메뉴가 없습니다. 먼저 메뉴 관리에서 메뉴를 추가하세요.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {topMenus.map((m: { id: string; label: string }) => {
                    const idx = tabIds.indexOf(m.id);
                    const on = idx >= 0;
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => toggle(m.id)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${on ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                      >
                        {on && <span className="mr-1 font-bold">{idx + 1}</span>}{m.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })()}

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

      {/* Data export — the SaaS exit guarantee (available on every plan) */}
      <section className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">데이터 내보내기</h2>
        <p className="text-sm text-gray-500 mb-4">
          설교·주보·앨범·교역자 등 모든 콘텐츠와 이미지 주소를 하나의 JSON 파일로 내려받습니다.
          교회의 데이터는 언제든 직접 보관할 수 있습니다.
        </p>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="px-5 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {exporting ? '내보내는 중...' : '전체 데이터 내보내기 (.json)'}
        </button>
      </section>
    </div>
  );
}
