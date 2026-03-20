import { Link } from 'react-router-dom';
import {
  useBulletins,
  useSermons,
  useAlbums,
  useEvents,
  useStaff,
} from '@dw-church/api-client';

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

export default function Dashboard() {
  const bulletins = useBulletins({ perPage: 3 });
  const sermons = useSermons({ perPage: 3 });
  const albums = useAlbums({ perPage: 3 });
  const events = useEvents({ perPage: 1 });
  const staff = useStaff({ perPage: 1 });

  return (
    <div className="space-y-8">
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
    </div>
  );
}
