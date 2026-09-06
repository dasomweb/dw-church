import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useDWChurchClient } from '@dw-church/api-client';

/**
 * GR-01 소그룹 현황 — 화면 시안(목장 시스템 화면 시안.dc.html)을 그대로 구현.
 * 4개 통계 카드 + 연합별 현황 표 + 분가 검토 대상 + 리포트 미제출(amber) + 돌봄 요청.
 * 데이터는 GET /group-stats 실제 집계(더미 아님). 용어는 프리셋에서 온다.
 */
type Stats = Record<string, any>;

export default function SmallGroupDashboard() {
  const apiClient = useDWChurchClient();
  const api = apiClient!.adapter;
  const navigate = useNavigate();
  const { slug = '' } = useParams<{ slug: string }>();
  const go = (p: string) => navigate(`/t/${slug}/${p}`);

  const presetQ = useQuery({ queryKey: ['group-preset'], queryFn: async () => (await api.get<{ data: any }>('/api/v1/group-preset') as any).data });
  const statsQ = useQuery({ queryKey: ['group-stats'], queryFn: async () => (await api.get<{ data: Stats }>('/api/v1/group-stats') as any).data as Stats });

  const t = presetQ.data?.terminology ?? { org: '조직', leader: '리더', member: '구성원' };
  const d = statsQ.data;
  const s = d?.stats ?? {};

  const queueSub = useMemo(() => {
    const by = s.queueBy ?? {};
    const parts = [
      by.course ? `수료 ${by.course}` : null,
      by.transfer ? `전입 ${by.transfer}` : null,
      by.inquiry ? `요청 ${by.inquiry}` : null,
      by.manual ? `등록 ${by.manual}` : null,
    ].filter(Boolean);
    return parts.join(' · ') || '대기 없음';
  }, [s.queueBy]);

  if (statsQ.isLoading) return <div className="p-8 text-center text-sm text-[#8b93a3]">불러오는 중…</div>;

  const unions: any[] = d?.unions ?? [];
  const splits: any[] = d?.splitCandidates ?? [];
  const unsub: any[] = d?.unsubmitted ?? [];
  const care: any[] = d?.care ?? [];
  const notSubmitted = Math.max(0, (s.reportsTotal ?? 0) - (s.reportsSubmitted ?? 0));

  return (
    <div className="text-[#16181d]">
      {/* 헤더: 제목 + 주차 + 액션 */}
      <div className="flex items-center gap-3 flex-wrap mb-6">
        <b className="text-[17px]">{t.org} 현황</b>
        {d?.week && <span className="text-[12.5px] text-[#61697a]">2026년 {d.week.replace('-', '월 ')}주</span>}
        <div className="ml-auto flex items-center gap-2.5">
          <button onClick={() => go('group-monitor')} className="text-[13px] font-bold text-[#3c4353] border border-[#dfe3ea] rounded-[9px] px-3.5 py-2.5 hover:bg-[#f7f8fa]">리포트 현황</button>
          <button onClick={() => go('group-notices')} className="text-[13.5px] font-bold text-white bg-[#1466d6] rounded-[9px] px-4 py-2.5 hover:bg-[#0f4fa8]">공지 작성</button>
        </div>
      </div>

      {/* 통계 카드 4개 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        <StatCard label={`운영 ${t.org}`} value={String(s.operating ?? 0)}
          sub={`${s.unions ?? 0}연합 · 평균 ${s.avgMembers ?? 0}명`} />
        <StatCard label="이번 주 리포트" value={String(s.reportsSubmitted ?? 0)} unit={`/ ${s.reportsTotal ?? 0} 제출`}
          sub={notSubmitted ? `미제출 ${notSubmitted}곳 독려하기` : '전체 제출 완료'} subAmber={notSubmitted > 0}
          onSub={() => go('group-monitor')} />
        <StatCard label="배치 대기" value={String(s.queueTotal ?? 0)} sub={queueSub} onSub={() => go('group-queue')} />
        <StatCard label={`이번 주 ${t.meeting ?? '모임'} 참석`} value={`${s.attendanceRate ?? 0}%`}
          sub={`초신자 동반 ${s.newcomers ?? 0}명`} />
      </div>

      {/* 본문 2열 */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
        {/* 좌: 연합별 현황 + 분가 검토 */}
        <div className="bg-white border border-[#e5e7eb] rounded-[14px] overflow-hidden">
          <div className="px-[22px] py-[18px] border-b border-[#eef0f4] flex items-center">
            <b className="text-[14.5px]">연합별 현황</b>
            <button onClick={() => go('groups')} className="ml-auto text-[12.5px] font-bold text-[#1466d6] hover:text-[#0f4fa8]">{t.org} 편성 보기</button>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_64px_72px_minmax(0,1.1fr)] gap-2.5 px-[22px] py-[11px] bg-[#fafbfc] border-b border-[#eef0f4] text-[11.5px] font-extrabold text-[#8b93a3]">
            <span>연합</span><span>{t.org}</span><span>{t.member}</span><span>리포트 제출</span>
          </div>
          {unions.length === 0 ? (
            <div className="px-[22px] py-8 text-center text-[13px] text-[#8b93a3]">아직 {t.org}이(가) 없습니다.</div>
          ) : unions.map((u) => {
            const pct = u.reportTotal ? Math.round((u.reportSubmitted / u.reportTotal) * 100) : 0;
            return (
              <div key={u.id} className="grid grid-cols-[minmax(0,1fr)_64px_72px_minmax(0,1.1fr)] gap-2.5 px-[22px] py-3.5 border-b border-[#f2f4f7] text-[13px] items-center">
                <div><b className="block font-bold">{u.name}</b><span className="text-[11.5px] text-[#8b93a3]">{u.leaderName ? `${t.leader} ${u.leaderName}` : '—'}</span></div>
                <span>{u.groupCount}</span>
                <span>{u.memberCount}</span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-[7px] rounded-full bg-[#eef1f5] overflow-hidden"><div className="h-full" style={{ width: `${pct}%`, background: pct >= 70 ? '#1466d6' : '#f5b423' }} /></div>
                  <span className="text-[12px] text-[#61697a] tabular-nums">{u.reportSubmitted}/{u.reportTotal}</span>
                </div>
              </div>
            );
          })}
          <div className="px-[22px] py-4 border-b border-[#eef0f4]"><b className="text-[14.5px]">분가 검토 대상</b></div>
          <div className="flex flex-col gap-2.5 px-[22px] pb-5 pt-3.5 text-[13px]">
            {splits.length === 0 ? <span className="text-[12.5px] text-[#8b93a3]">권장 인원을 넘는 {t.org}이(가) 없습니다.</span>
              : splits.map((g) => (
                <div key={g.id} className="flex items-center gap-3">
                  <b className="font-bold">{g.name}{g.leaderName ? ` · ${g.leaderName}` : ''}</b>
                  <span className="text-[#61697a]">{g.memberCount}명 · 권장 14명 초과</span>
                  <button onClick={() => go('groups')} className="ml-auto text-[12.5px] font-bold text-[#1466d6] hover:text-[#0f4fa8]">분가 처리</button>
                </div>
              ))}
          </div>
        </div>

        {/* 우: 리포트 미제출 + 돌봄 요청 */}
        <div className="flex flex-col gap-4">
          <div className="bg-white border border-[#f3e0b0] rounded-[14px] px-[22px] py-5">
            <div className="flex items-center mb-3.5">
              <b className="text-[14.5px]">리포트 미제출 {unsub.length}곳</b>
              <span className="ml-auto text-[12.5px] font-extrabold text-[#8a6410] bg-[#fdf4e0] px-2.5 py-1 rounded-full">이번 주</span>
            </div>
            {unsub.length === 0 ? <p className="text-[12.5px] text-[#8b93a3] py-2">미제출 {t.org}이(가) 없습니다. 👏</p> : (
              <>
                <div className="flex flex-col gap-2.5 text-[13px]">
                  {unsub.map((u) => (
                    <div key={u.groupId} className="flex items-center gap-2.5">
                      <span className="font-bold">{u.name}</span>
                      <span className="text-[#8b93a3]">{u.leaderName}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => go('group-notices')} className="flex items-center justify-center w-full mt-4 h-10 rounded-[9px] bg-[#1466d6] text-white text-[13.5px] font-bold hover:bg-[#0f4fa8]">공지로 독려하기</button>
              </>
            )}
          </div>
          <div className="bg-white border border-[#e5e7eb] rounded-[14px] px-[22px] py-5">
            <b className="text-[14.5px] block mb-3.5">돌봄 요청</b>
            {care.length === 0 ? <p className="text-[12.5px] text-[#8b93a3]">접수된 돌봄 요청이 없습니다.</p> : (
              <div className="flex flex-col gap-3 text-[12.5px] text-[#4a5262]">
                {care.map((c, i) => (
                  <div key={i} className="flex gap-2.5">
                    <span className="w-[7px] h-[7px] rounded-full bg-[#f5b423] mt-[7px] shrink-0" />
                    <div><b className="font-bold">{c.groupName}</b> {c.text}{c.date && <span className="text-[#8b93a3]"> · {c.date}</span>}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, unit, sub, subAmber, onSub }: {
  label: string; value: string; unit?: string; sub: string; subAmber?: boolean; onSub?: () => void;
}) {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-[14px] px-5 py-[18px]">
      <span className="text-[12.5px] text-[#61697a] font-bold">{label}</span>
      <div className="flex items-end gap-2 mt-1.5">
        <b className="text-[30px] font-extrabold tracking-[-0.05em] leading-none">{value}</b>
        {unit && <span className="text-[12.5px] font-bold text-[#61697a] pb-1.5">{unit}</span>}
      </div>
      {onSub ? (
        <button onClick={onSub} className={`text-[11.5px] mt-1 ${subAmber ? 'text-[#b98307] font-bold' : 'text-[#8b93a3]'} hover:underline`}>{sub}</button>
      ) : (
        <span className={`block text-[11.5px] mt-1 ${subAmber ? 'text-[#b98307] font-bold' : 'text-[#8b93a3]'}`}>{sub}</span>
      )}
    </div>
  );
}
