/**
 * 게시 기간(공개 시작일 ~ 공개 종료일) 공용 유틸.
 *
 * 콘텐츠 모듈 여러 곳에서 같은 운영 방식을 쓴다 — 날짜를 미리 넣어 두면
 * 그 날이 되어야 사이트에 나오고(예약 공개), 끝나는 날이 지나면 저절로 내려간다.
 * 서버는 읽을 때 걸러내므로(스케줄러 없음), 관리 화면의 뱃지는 **서버와 같은
 * 기준일**로 계산해야 한다 — 안 그러면 "게시중"인데 사이트엔 없는 상태가 보인다.
 *
 * 기준일 = 교회 현지 날짜(미 동부). 운영자가 한국에서 접속해도 뱃지와 실제
 * 노출이 어긋나지 않게, 브라우저 로컬 날짜가 아니라 교회 시간대로 계산한다.
 * (서버: apps/server/src/modules 하위 각 service.ts 의 IN_WINDOW 와 같은 시간대)
 */

/** 교회 기준 시간대 — 서버 IN_WINDOW 와 반드시 같아야 한다. */
export const CHURCH_TZ = 'America/New_York';

/** 교회 현지 기준 오늘 (YYYY-MM-DD). */
export function churchToday(now: Date = new Date()): string {
  // en-CA 는 YYYY-MM-DD 형식을 준다 — 수동 조립보다 안전하다.
  return now.toLocaleDateString('en-CA', { timeZone: CHURCH_TZ });
}

export type PublishPhase = 'scheduled' | 'active' | 'ended';

/** 날짜 문자열에서 YYYY-MM-DD 만 남긴다 (DB 가 ISO 타임스탬프로 줄 수도 있다). */
const day = (v?: string | null): string => (v || '').slice(0, 10);

/**
 * 게시 기간 대비 오늘 상태.
 * - scheduled : 시작일이 아직 안 됨 → 사이트에 안 보인다
 * - ended     : 종료일이 지났음 → 사이트에서 내려갔다
 * - active    : 지금 노출 중 (기간을 안 넣었으면 항상 active)
 */
export function publishPhase(start?: string | null, end?: string | null, today = churchToday()): PublishPhase {
  const s = day(start);
  const e = day(end);
  if (s && s > today) return 'scheduled';
  if (e && e < today) return 'ended';
  return 'active';
}

/** 목록 뱃지용 라벨 + 색. */
export function publishBadge(start?: string | null, end?: string | null, today = churchToday()): { label: string; cls: string } {
  switch (publishPhase(start, end, today)) {
    case 'scheduled': return { label: '공개 예정', cls: 'bg-blue-100 text-blue-800' };
    case 'ended': return { label: '종료', cls: 'bg-gray-100 text-gray-500' };
    default: return { label: '공개중', cls: 'bg-green-100 text-green-800' };
  }
}

/** 기간 표기 — "2026-11-08 ~ —" / "제한 없음". */
export function publishRangeText(start?: string | null, end?: string | null): string {
  const s = day(start);
  const e = day(end);
  if (!s && !e) return '제한 없음';
  return `${s || '—'} ~ ${e || '—'}`;
}

/**
 * 온라인 주보의 현재 공개 상태.
 *
 * 일반 게시 기간과 규칙이 다르다 — **예배일에는 무조건 공개된다**(대표님 지시).
 * 예약일은 "그 전까지만 가려 두는" 장치라, 예약일을 예배일보다 뒤로 잘못 적어도
 * 예배일이 되면 공개된다. 서버 조회 조건(online-bulletins/service.ts VISIBLE)과 같은 규칙.
 *
 * draft 로 작업하다 공개된 줄 착각하는 사고를 막으려고, 편집 화면·목록에
 * 이 문구를 그대로 띄운다.
 */
export function bulletinVisibility(
  opts: { status?: string | null; publishAt?: string | null; serviceDate?: string | null },
  today = churchToday(),
): { visible: boolean; label: string; cls: string; note: string } {
  const pub = day(opts.publishAt);
  const svc = day(opts.serviceDate);
  if (opts.status !== 'published') {
    return { visible: false, label: '숨김', cls: 'bg-gray-200 text-gray-700', note: '임시저장 상태라 사이트에 보이지 않습니다. 성도에게 보이려면 상태를 ‘공개’로 바꾸세요.' };
  }
  if (!pub || pub <= today || (svc && svc <= today)) {
    return { visible: true, label: '공개중', cls: 'bg-green-100 text-green-800', note: '지금 사이트에서 볼 수 있습니다.' };
  }
  return {
    visible: false,
    label: `${pub}부터`,
    cls: 'bg-blue-100 text-blue-800',
    note: `${pub} 부터 공개됩니다. 그때까지는 사이트에 보이지 않습니다${svc ? ` (예배일 ${svc} 에는 무조건 공개됩니다)` : ''}.`,
  };
}
