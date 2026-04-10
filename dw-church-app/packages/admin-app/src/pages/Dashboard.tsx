import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  useBulletins,
  useSermons,
  useAlbums,
  useEvents,
  useStaff,
  useDWChurchClient,
} from '@dw-church/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../components';

function StatCard({
  label,
  count,
  loading,
  to,
}: {
  label: string;
  count: number;
  loading: boolean;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow"
    >
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">
        {loading ? (
          <span className="inline-block w-10 h-8 bg-gray-200 rounded animate-pulse" />
        ) : (
          count
        )}
      </p>
    </Link>
  );
}

function RecentItem({
  title,
  date,
  editLink,
}: {
  title: string;
  date: string;
  editLink: string;
}) {
  return (
    <li className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
        <p className="text-xs text-gray-500">{date}</p>
      </div>
      <Link
        to={editLink}
        className="ml-3 text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap"
      >
        편집
      </Link>
    </li>
  );
}

const quickLinks = [
  { to: '/bulletins', label: '주보 관리', description: '주보를 생성하고 관리합니다.' },
  { to: '/sermons', label: '설교 관리', description: '설교 영상과 오디오를 관리합니다.' },
  { to: '/columns', label: '목회컬럼 관리', description: '목회 컬럼을 작성하고 편집합니다.' },
  { to: '/albums', label: '앨범 관리', description: '사진 앨범을 관리합니다.' },
  { to: '/banners', label: '배너 관리', description: '메인 배너를 설정합니다.' },
  { to: '/events', label: '이벤트 관리', description: '교회 행사를 관리합니다.' },
  { to: '/staff', label: '교역자 관리', description: '교역자 정보를 관리합니다.' },
  { to: '/history', label: '연혁 관리', description: '교회 연혁을 관리합니다.' },
  { to: '/pages', label: '페이지 편집', description: '사이트 페이지를 구성하고 편집합니다.' },
  { to: '/menus', label: '메뉴 관리', description: '사이트 메뉴를 구성합니다.' },
  { to: '/theme', label: '테마 설정', description: '사이트 디자인과 색상을 변경합니다.' },
  { to: '/users', label: '사용자 관리', description: '팀원을 초대하고 권한을 관리합니다.' },
  { to: '/settings', label: '설정', description: '교회 정보 및 사이트 설정을 변경합니다.' },
];

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

// Page Wizard categories — same structure as PageEditor
const WIZARD_PAGES = [
  { icon: '⛪', title: '교회 안내', pages: [
    { label: '인사말', prompt: '담임목사 인사말 페이지를 만들어줘. 담임목사 프로필 사진과 인사말, 비전/사명 선언문을 포함해줘' },
    { label: '교회 소개', prompt: '교회 소개 페이지를 만들어줘. 교회 소개 텍스트와 이미지, 비전/미션, 교회 표어 성경구절을 포함해줘' },
    { label: '교회 역사', prompt: '교회 역사 페이지를 만들어줘. 연도별 타임라인과 교회 사진을 포함해줘' },
    { label: '교역자 소개', prompt: '교역자 소개 페이지를 만들어줘. 교역자 그리드(4열)를 포함해줘' },
    { label: '신앙고백/비전', prompt: '신앙고백과 비전 페이지를 만들어줘. 신앙고백 본문, 핵심가치, 비전 성경구절을 포함해줘' },
    { label: '오시는 길', prompt: '오시는 길 페이지를 만들어줘. 구글맵 지도, 주소, 연락처, 주차 안내를 포함해줘' },
  ]},
  { icon: '🙏', title: '예배 및 모임', pages: [
    { label: '예배 시간표', prompt: '예배 안내 페이지를 만들어줘. 예배 시간표(주일1부, 주일2부, 수요예배, 금요기도), 특별예배 공지를 포함해줘' },
    { label: '주보', prompt: '주보 페이지를 만들어줘. 주보 목록(12개, 4열 그리드)을 포함해줘' },
    { label: '새가족 안내', prompt: '새가족 안내 페이지를 만들어줘. 환영 메시지, 등록 절차, 예배 시간, 오시는 길을 포함해줘' },
  ]},
  { icon: '👥', title: '사역 부서', pages: [
    { label: '아동부/주일학교', prompt: '아동부/주일학교 소개 페이지를 만들어줘. 교육철학, 행사 일정, 등록 게시판을 포함해줘' },
    { label: '청년부', prompt: '청년부 소개 페이지를 만들어줘. 부서 소개, 활동 사진 갤러리, 게시판을 포함해줘' },
    { label: '장년부/구역', prompt: '장년부/구역 소개 페이지를 만들어줘. 구역 목록, 성경공부 일정, 게시판을 포함해줘' },
    { label: '선교부', prompt: '선교부 페이지를 만들어줘. 선교지 현황, 후원 안내, 소식 게시판을 포함해줘' },
  ]},
  { icon: '📺', title: '미디어', pages: [
    { label: '설교 영상', prompt: '설교 영상 페이지를 만들어줘. 설교 목록(12개, 4열 그리드)을 포함해줘' },
    { label: '갤러리', prompt: '갤러리 페이지를 만들어줘. 앨범 목록(12개, 4열 그리드)을 포함해줘' },
    { label: '찬양/악보', prompt: '찬양과 악보 페이지를 만들어줘. 찬양 목록 게시판을 포함해줘' },
    { label: '목회칼럼', prompt: '목회칼럼 페이지를 만들어줘. 칼럼 목록(12개, 3열 그리드)을 포함해줘' },
  ]},
  { icon: '🤝', title: '공동체', pages: [
    { label: '공지사항', prompt: '공지사항 페이지를 만들어줘. 공지 게시판을 포함해줘' },
    { label: '교회 소식', prompt: '교회 소식 페이지를 만들어줘. 소식 목록(12개, 3열 카드)을 포함해줘' },
    { label: '기도 요청', prompt: '기도 요청 페이지를 만들어줘. 안내 텍스트와 기도 요청 게시판을 포함해줘' },
    { label: '새가족 등록', prompt: '새가족 등록 페이지를 만들어줘. 환영 메시지, 등록 절차, 예배시간, 오시는 길을 포함해줘' },
  ]},
  { icon: '💝', title: '연락/헌금', pages: [
    { label: '연락처', prompt: '연락처 페이지를 만들어줘. 교회 정보, 구글맵 지도, 문의 안내를 포함해줘' },
    { label: '온라인 헌금', prompt: '온라인 헌금 페이지를 만들어줘. 헌금 종류, Zelle/Venmo/Check 안내를 포함해줘' },
  ]},
];

export default function Dashboard() {
  const bulletins = useBulletins({ perPage: 3 });
  const sermons = useSermons({ perPage: 3 });
  const albums = useAlbums({ perPage: 3 });
  const events = useEvents({ perPage: 1 });
  const staff = useStaff({ perPage: 1 });
  const apiClient = useDWChurchClient();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardLoading, setWizardLoading] = useState('');
  const [wizardCustom, setWizardCustom] = useState('');

  const handleWizardCreate = async (prompt: string, label: string) => {
    setWizardLoading(label);
    try {
      const res = await apiClient.adapter.post<{ data: { page: { id: string; title: string; slug: string }; sections: number } }>('/ai/generate-page', { prompt });
      showToast('success', `"${res.data.page.title}" 페이지가 생성되었습니다 (${res.data.sections}개 블록)`);
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      setWizardOpen(false);
      navigate('/pages');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '페이지 생성 실패');
    } finally {
      setWizardLoading('');
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Wizard CTA */}
      <section className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">페이지 마법사</h2>
            <p className="text-sm text-purple-100 mt-1">AI가 교회 웹사이트에 필요한 페이지를 자동으로 구성해드립니다</p>
          </div>
          <button
            onClick={() => setWizardOpen(true)}
            className="bg-white text-purple-700 px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-purple-50 transition-colors flex-shrink-0"
          >
            페이지 추가
          </button>
        </div>
      </section>

      {/* Stats cards */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">현황</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            label="주보"
            count={bulletins.data?.total ?? 0}
            loading={bulletins.isLoading}
            to="/bulletins"
          />
          <StatCard
            label="설교"
            count={sermons.data?.total ?? 0}
            loading={sermons.isLoading}
            to="/sermons"
          />
          <StatCard
            label="앨범"
            count={albums.data?.total ?? 0}
            loading={albums.isLoading}
            to="/albums"
          />
          <StatCard
            label="이벤트"
            count={events.data?.total ?? 0}
            loading={events.isLoading}
            to="/events"
          />
          <StatCard
            label="교역자"
            count={Array.isArray(staff.data) ? staff.data.length : 0}
            loading={staff.isLoading}
            to="/staff"
          />
        </div>
      </section>

      {/* Recent content */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">최근 콘텐츠</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Recent Bulletins */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">최근 주보</h3>
              <Link to="/bulletins" className="text-xs text-blue-600 hover:text-blue-800">
                전체 보기
              </Link>
            </div>
            {bulletins.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <ul>
                {bulletins.data?.data.map((b) => (
                  <RecentItem
                    key={b.id}
                    title={b.title}
                    date={formatDate(b.date)}
                    editLink={`/bulletins?edit=${b.id}`}
                  />
                ))}
                {(!bulletins.data?.data.length) && (
                  <p className="text-sm text-gray-400 py-2">등록된 주보가 없습니다.</p>
                )}
              </ul>
            )}
          </div>

          {/* Recent Sermons */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">최근 설교</h3>
              <Link to="/sermons" className="text-xs text-blue-600 hover:text-blue-800">
                전체 보기
              </Link>
            </div>
            {sermons.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <ul>
                {sermons.data?.data.map((s) => (
                  <RecentItem
                    key={s.id}
                    title={s.title}
                    date={formatDate(s.date)}
                    editLink={`/sermons?edit=${s.id}`}
                  />
                ))}
                {(!sermons.data?.data.length) && (
                  <p className="text-sm text-gray-400 py-2">등록된 설교가 없습니다.</p>
                )}
              </ul>
            )}
          </div>

          {/* Recent Albums */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">최근 앨범</h3>
              <Link to="/albums" className="text-xs text-blue-600 hover:text-blue-800">
                전체 보기
              </Link>
            </div>
            {albums.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <ul>
                {albums.data?.data.map((a) => (
                  <RecentItem
                    key={a.id}
                    title={a.title}
                    date={formatDate(a.createdAt)}
                    editLink={`/albums?edit=${a.id}`}
                  />
                ))}
                {(!albums.data?.data.length) && (
                  <p className="text-sm text-gray-400 py-2">등록된 앨범이 없습니다.</p>
                )}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Quick links */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">바로가기</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow group"
            >
              <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">
                {link.label}
              </h3>
              <p className="text-xs text-gray-500 mt-1">{link.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Page Wizard Modal */}
      {wizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setWizardOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
              <div>
                <h3 className="text-base font-bold">페이지 마법사</h3>
                <p className="text-xs text-gray-400 mt-0.5">추가할 페이지를 선택하면 AI가 블록을 구성하고 자동 생성합니다</p>
              </div>
              <button onClick={() => setWizardOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {WIZARD_PAGES.map((cat) => (
                  <div key={cat.title} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-gray-50 border-b">
                      <h4 className="text-xs font-bold text-gray-700">{cat.icon} {cat.title}</h4>
                    </div>
                    <div className="p-1">
                      {cat.pages.map((pg) => (
                        <button
                          key={pg.label}
                          onClick={() => handleWizardCreate(pg.prompt, pg.label)}
                          disabled={!!wizardLoading}
                          className="w-full text-left px-3 py-2 rounded-md text-xs hover:bg-purple-50 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                          <span className="flex-1 font-medium text-gray-700">
                            {wizardLoading === pg.label ? '생성 중...' : pg.label}
                          </span>
                          {wizardLoading === pg.label && (
                            <span className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 border-t" />
                <span className="text-[10px] text-gray-400">또는 직접 입력</span>
                <div className="flex-1 border-t" />
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={wizardCustom}
                  onChange={(e) => setWizardCustom(e.target.value)}
                  placeholder="원하는 페이지를 설명하세요..."
                  className="flex-1 border rounded-lg px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  onKeyDown={(e) => { if (e.key === 'Enter' && wizardCustom.trim()) handleWizardCreate(wizardCustom, '커스텀'); }}
                />
                <button
                  onClick={() => wizardCustom.trim() && handleWizardCreate(wizardCustom, '커스텀')}
                  disabled={!!wizardLoading || !wizardCustom.trim()}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                >
                  {wizardLoading === '커스텀' ? '...' : '생성'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
