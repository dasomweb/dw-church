import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useDWChurchClient } from '@dw-church/api-client';
import { useEntitlements } from '../hooks/useEntitlements';
import { featureAllowed } from '../lib/plan-features';

/**
 * MB-01 교적 현황 — 화면 시안(교적관리 화면 시안.dc.html) 그대로 구현.
 * 4개 통계 카드 + 구역(조직)별 주일 출석 + 이번 주 할 일 + 연령 분포.
 * 데이터는 GET /member-stats/dashboard 실제 집계(더미 아님).
 */
type Dash = Record<string, any>;

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 기준`;
};

export default function MemberDashboard() {
  const apiClient = useDWChurchClient();
  const api = apiClient!.adapter;
  const navigate = useNavigate();
  const { slug = '' } = useParams<{ slug: string }>();
  const go = (p: string) => navigate(`/t/${slug}/${p}`);
  const { features } = useEntitlements(slug);
  const hasSmallgroup = featureAllowed(features, 'smallgroup'); // 스몰그룹 있을 때만 구역별 출석 노출

  const dashQ = useQuery({ queryKey: ['member-dashboard'], queryFn: async () => (await api.get<{ data: Dash }>('/api/v1/member-stats/dashboard') as any).data as Dash });

  if (dashQ.isLoading) return <div className="p-8 text-center text-sm text-[#8b93a3]">불러오는 중…</div>;
  const d = dashQ.data ?? {};
  const c = d.cards ?? {};
  const byGroup: any[] = d.byGroup ?? [];
  const todos: any[] = d.todos ?? [];
  const ageDist: any[] = d.ageDist ?? [];
  const ageMax = Math.max(1, ...ageDist.map((a) => a.n));

  return (
    <div className="text-[#16181d]">
      {/* 헤더 */}
      <div className="flex items-center gap-3 flex-wrap mb-6">
        <b className="text-[17px]">교적 현황</b>
        <span className="text-[12px] font-bold text-[#61697a]">{today()}</span>
        <div className="ml-auto flex items-center gap-2.5">
          <button onClick={() => go('members')} className="h-9 w-[240px] max-w-[45vw] border border-[#dfe3ea] rounded-[9px] flex items-center px-3 text-[13px] text-[#a3aab8] hover:bg-[#f7f8fa]">교인 이름 · 전화 뒷자리 검색</button>
          <button onClick={() => go('members')} className="px-4 py-2.5 bg-[#1466d6] text-white rounded-[9px] text-[13.5px] font-bold hover:bg-[#0f4fa8]">교인 등록</button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        <Card label="재적 교인" value={num(c.registered)} sub={`세대 ${num(c.households)} · 미편성 ${num(c.unassigned)}`} />
        <Card label="주일 출석률 (지난주)" value={`${c.attendanceRate ?? 0}%`} sub={`출석 ${num(c.present)} · 온라인 ${num(c.online)}`} />
        <Card label="새가족 (30일)" value={num(c.newcomers)}
          sub={c.newcomerUnassigned ? `미배정 ${c.newcomerUnassigned}` : '전원 배정'} subAmber={!!c.newcomerUnassigned} />
        <Card label="장기 결석 (4주+)" value={num(c.longAbsent)} sub="심방 배정하기" subLink onSub={() => go('member-visits')} />
      </div>

      {/* 본문 — 스몰그룹 애드온이 있으면 좌측에 구역별 출석 추가(교적 단독일 땐 미노출) */}
      <div className={`grid grid-cols-1 gap-4 ${hasSmallgroup ? 'lg:grid-cols-[1.5fr_1fr]' : ''}`}>
        {hasSmallgroup && (
          <div className="bg-white border border-[#e5e7eb] rounded-[14px] px-[22px] py-5">
            <div className="flex items-center mb-[18px]">
              <b className="text-[14.5px]">구역별 주일 출석 <span className="text-[#8b93a3] font-normal text-[12.5px]">(지난주)</span></b>
              <button onClick={() => go('attendance')} className="ml-auto text-[12.5px] font-bold text-[#1466d6] hover:text-[#0f4fa8]">전체 보기</button>
            </div>
            {byGroup.length === 0 ? (
              <p className="text-[12.5px] text-[#8b93a3] py-3">지난주 출석 기록 또는 조직(구역)이 없습니다. 출석을 기록하면 조직별로 집계됩니다.</p>
            ) : (
              <div className="flex flex-col gap-[13px]">
                {byGroup.map((g, i) => (
                  <div key={i} className="flex items-center gap-3 text-[13px]">
                    <span className="basis-[76px] shrink-0 font-bold truncate">{g.name}</span>
                    <div className="flex-1 h-[9px] rounded-full bg-[#eef1f5] overflow-hidden">
                      <div className="h-full" style={{ width: `${g.rate}%`, background: g.rate >= 60 ? '#1466d6' : '#f5b423' }} />
                    </div>
                    <span className="basis-[92px] shrink-0 text-right text-[#61697a] tabular-nums">{g.present} / {g.total} · {g.rate}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 우측 (교적 단독이면 아래 2개가 전체 폭) */}
        <div className={hasSmallgroup ? 'flex flex-col gap-4' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}>
          <div className="bg-white border border-[#e5e7eb] rounded-[14px] px-[22px] py-5">
            <b className="text-[14.5px] block mb-3.5">이번 주 할 일</b>
            {todos.length === 0 ? <p className="text-[12.5px] text-[#8b93a3]">지금 처리할 일이 없습니다. 👍</p> : (
              <div className="flex flex-col gap-3 text-[13px]">
                {todos.map((t, i) => (
                  <div key={i} className="flex gap-2.5 items-start">
                    <span className="w-[18px] h-[18px] border border-[#cdd3de] rounded-[5px] shrink-0 mt-0.5" />
                    <div>{t.text}{t.note && <span className={`block text-[11.5px] ${t.noteAmber ? 'font-bold text-[#b98307]' : 'font-semibold text-[#8b93a3]'}`}>{t.note}</span>}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-[#e5e7eb] rounded-[14px] px-[22px] py-5">
            <b className="text-[14.5px] block mb-3.5">연령 분포</b>
            <div className="flex items-end gap-2 h-[96px]">
              {ageDist.map((a, i) => {
                const h = Math.round((a.n / ageMax) * 72);
                const isMax = a.n === ageMax && a.n > 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-full rounded-t-[5px]" style={{ height: `${Math.max(h, 3)}px`, background: isMax ? '#1466d6' : '#c8dcfa' }} title={`${a.bucket} ${a.n}명`} />
                    <span className={`text-[11px] ${isMax ? 'text-[#3c4353] font-bold' : 'text-[#8b93a3]'}`}>{a.bucket}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const num = (v: any) => Number(v ?? 0).toLocaleString();

function Card({ label, value, sub, subAmber, subLink, onSub }: {
  label: string; value: string; sub: string; subAmber?: boolean; subLink?: boolean; onSub?: () => void;
}) {
  const subCls = subLink ? 'text-[#1466d6] font-bold' : subAmber ? 'text-[#b98307] font-bold' : 'text-[#8b93a3]';
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-[14px] px-5 py-[18px]">
      <span className="text-[12.5px] text-[#61697a] font-bold">{label}</span>
      <div className="flex items-end gap-2 mt-1.5">
        <b className="text-[30px] font-extrabold tracking-[-0.05em] leading-none">{value}</b>
      </div>
      {onSub ? <button onClick={onSub} className={`text-[11.5px] mt-1 hover:underline ${subCls}`}>{sub}</button>
        : <span className={`block text-[11.5px] mt-1 ${subCls}`}>{sub}</span>}
    </div>
  );
}
