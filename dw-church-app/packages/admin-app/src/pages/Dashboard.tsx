import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  useBulletins,
  useSermons,
  useAlbums,
  useEvents,
  useStaff,
  useDWChurchClient,
} from '@dw-church/api-client';
import { useToast } from '../components';
import { useAuthStore } from '../stores/auth';

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

const PIPELINE_STAGES = [
  { id: 'input', label: '콘텐츠 입력' },
  { id: 'developing', label: '디자인·개발' },
  { id: 'review', label: '검수' },
  { id: 'live', label: '오픈' },
] as const;

// 사이트 제작 진행바. 교회는 현재 단계를 확인하고, 슈퍼어드민(운영자)은 단계를
// 클릭해 갱신한다. 1단계(콘텐츠 입력)는 교회의 초기셋업 status(작성 중/제출)로
// 세부 표시, 2~4단계는 운영자가 수동 전환.
function BuildPipeline({ slug }: { slug: string }) {
  const apiClient = useDWChurchClient();
  const isSuperAdmin = !!useAuthStore((s) => s.session)?.user?.isSuperAdmin;
  const { showToast } = useToast();
  const [stage, setStage] = useState<string>('input');
  const [status, setStatus] = useState<string>('draft');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await apiClient!.getIntake();
        if (!cancelled) { setStage(res.buildStage || 'input'); setStatus(res.status || 'draft'); }
      } catch { /* ignore — no intake yet */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [apiClient]);

  const currentIdx = Math.max(0, PIPELINE_STAGES.findIndex((s) => s.id === stage));
  const inputSub = stage === 'input' ? (status === 'submitted' ? ' (제출 완료)' : ' (작성 중)') : '';

  const changeStage = async (id: string) => {
    if (!isSuperAdmin || saving) return;
    setSaving(true);
    try {
      await apiClient!.setBuildStage(slug, id);
      setStage(id);
      showToast('success', '진행 단계를 변경했습니다.');
    } catch {
      showToast('error', '단계 변경에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">사이트 제작 진행</h2>
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-center">
          {PIPELINE_STAGES.map((s, i) => {
            const done = i <= currentIdx;
            const isCurrent = i === currentIdx;
            return (
              <div key={s.id} className="flex flex-1 items-center last:flex-none">
                <button
                  type="button"
                  disabled={!isSuperAdmin || saving}
                  onClick={() => changeStage(s.id)}
                  className="flex flex-col items-center gap-1"
                  title={isSuperAdmin ? '클릭하여 이 단계로 변경' : undefined}
                >
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${done ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    {i + 1}
                  </span>
                  <span className={`text-xs whitespace-nowrap ${isCurrent ? 'font-semibold text-blue-700' : 'text-gray-500'}`}>
                    {s.label}{isCurrent ? inputSub : ''}
                  </span>
                </button>
                {i < PIPELINE_STAGES.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${i < currentIdx ? 'bg-blue-600' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>
        {isSuperAdmin && (
          <p className="mt-3 text-xs text-gray-400">운영자: 단계를 클릭하면 교회 대시보드의 진행 상황이 갱신됩니다.</p>
        )}
      </div>
    </section>
  );
}

export default function Dashboard() {
  const bulletins = useBulletins({ perPage: 3 });
  const sermons = useSermons({ perPage: 3 });
  const albums = useAlbums({ perPage: 3 });
  const events = useEvents({ perPage: 1 });
  const staff = useStaff({ perPage: 1 });
  const { slug = '' } = useParams<{ slug: string }>();
  const tPath = (p: string) => (p ? `/t/${slug}/${p}` : `/t/${slug}`);
  const navigate = useNavigate();
  const apiClient = useDWChurchClient();
  const isSuperAdmin = !!useAuthStore((s) => s.session)?.user?.isSuperAdmin;

  // b2bsmart-style first-login onboarding: a tenant owner who hasn't submitted
  // the initial setup is sent to the standalone onboarding page. Skipped once
  // they click '나중에 하기' (session flag) and never for super-admins viewing.
  useEffect(() => {
    if (isSuperAdmin || sessionStorage.getItem('tl_onboarding_skip')) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await apiClient!.getIntake();
        if (!cancelled && res.status !== 'submitted' && res.status !== 'built') {
          navigate(`/t/${slug}/onboarding`, { replace: true });
        }
      } catch { /* network error — leave them on the dashboard */ }
    })();
    return () => { cancelled = true; };
  }, [apiClient, slug, isSuperAdmin, navigate]);

  return (
    <div className="space-y-8">
      <BuildPipeline slug={slug} />
      {/* Stats cards */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">현황</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="주보"   count={bulletins.data?.total ?? 0} loading={bulletins.isLoading} to={tPath('bulletins')} />
          <StatCard label="설교"   count={sermons.data?.total ?? 0}   loading={sermons.isLoading}   to={tPath('sermons')} />
          <StatCard label="앨범"   count={albums.data?.total ?? 0}    loading={albums.isLoading}    to={tPath('albums')} />
          <StatCard label="이벤트" count={events.data?.total ?? 0}    loading={events.isLoading}    to={tPath('events')} />
          <StatCard label="교역자" count={Array.isArray(staff.data) ? staff.data.length : 0} loading={staff.isLoading} to={tPath('staff')} />
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
              <Link to={tPath('bulletins')} className="text-xs text-blue-600 hover:text-blue-800">
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
                    editLink={`${tPath('bulletins')}?edit=${b.id}`}
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
              <Link to={tPath('sermons')} className="text-xs text-blue-600 hover:text-blue-800">
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
                    editLink={`${tPath('sermons')}?edit=${s.id}`}
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
              <Link to={tPath('albums')} className="text-xs text-blue-600 hover:text-blue-800">
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
                    editLink={`${tPath('albums')}?edit=${a.id}`}
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
    </div>
  );
}
