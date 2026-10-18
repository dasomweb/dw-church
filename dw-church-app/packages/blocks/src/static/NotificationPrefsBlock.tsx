'use client';

import { useCallback, useEffect, useState } from 'react';
import { SectionShell } from '../utilities/SectionShell';
import { getServiceWorkerRegistration } from '../utilities/sw-ready';

/**
 * notification_prefs — 알림 수신 설정 블록(요청서 §3-3).
 *
 * 항목별 켜고 끄기 + 받을 시간 + 방해 금지 시간. 항목 목록은 서버
 * (/push/categories)에서 받아 그린다 — 항목이 늘어도 블록을 고치지 않는다.
 * 소그룹예배(가정·직장·목장)처럼 묶음이 있는 항목은 소제목으로 묶어 보여준다.
 *
 * 설정은 **그 기기의 구독**에 붙는다. 로그인 전에도 알림을 켤 수 있어야 해서
 * 회원이 아니라 endpoint 기준이다. 구독이 없으면(=알림을 아직 안 켬) 설정할
 * 것도 없으므로 안내만 띄운다.
 *
 * 자동저장하지 않는다 — 바꾼 뒤 [저장]을 눌러야 서버에 쓴다.
 */

const API_BASE =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) || 'https://api.truelight.app';

interface CategoryDef {
  key: string;
  label: string;
  description: string;
  defaultTime: string;
  group?: string;
}
interface GroupedCategories { group: string | null; items: CategoryDef[] }
interface PrefRow {
  category: string; enabled: boolean;
  send_time?: string; quiet_start?: string; quiet_end?: string;
}
interface PrefState { enabled: boolean; sendTime: string }

interface NotificationPrefsBlockProps {
  props: Record<string, unknown>;
  slug?: string;
}

export function NotificationPrefsBlock({ props, slug = '' }: NotificationPrefsBlockProps) {
  const p = (props ?? {}) as Record<string, unknown>;
  const title = String(p.title ?? '알림 설정');
  const description = String(p.description ?? '받고 싶은 항목과 시간을 고르세요.');
  const notSubscribedText = String(p.notSubscribedText ?? '먼저 알림을 켜주세요. 알림을 켜면 여기서 항목별로 조정할 수 있습니다.');

  const [grouped, setGrouped] = useState<GroupedCategories[]>([]);
  const [prefs, setPrefs] = useState<Record<string, PrefState>>({});
  const [quiet, setQuiet] = useState({ start: '', end: '' });
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'no-sub' | 'ready' | 'saving' | 'saved'>('loading');
  const [dirty, setDirty] = useState(false);

  const TEXT = 'var(--dw-text, #3a3129)';
  const MUTED = 'var(--brand-muted, #6f6255)';
  const PRIMARY = 'var(--dw-primary, #7b7d5c)';
  const LINE = '1px solid var(--border, #ece2d6)';

  useEffect(() => {
    let alive = true;
    (async () => {
      // 항목 목록은 구독 여부와 무관하게 먼저 받아둔다(안내 화면에서도 쓸 수 있게).
      let cats: GroupedCategories[] = [];
      try {
        const res = await fetch(`${API_BASE}/api/v1/push/categories`, { cache: 'no-store' });
        const json = await res.json() as { data: { grouped: GroupedCategories[] } };
        cats = json.data?.grouped ?? [];
      } catch { /* 목록을 못 받으면 아래에서 빈 화면 */ }
      if (!alive) return;
      setGrouped(cats);

      if (typeof window === 'undefined') { setStatus('no-sub'); return; }
      // ready 를 그냥 await 하면 SW 미등록 교회에서 **영원히 멈춰** 블록이 통째로
      // 안 그려진다(에러도 안 남). 시간 제한을 둔 헬퍼로 바꾼다.
      const reg = await getServiceWorkerRegistration();
      const sub = reg ? await reg.pushManager.getSubscription().catch(() => null) : null;
      if (!alive) return;
      if (!sub) { setStatus('no-sub'); return; }
      setEndpoint(sub.endpoint);

      // 기본값: 모든 항목 켬 + 항목별 권장 시각. 저장된 설정이 있으면 덮어쓴다.
      const init: Record<string, PrefState> = {};
      for (const g of cats) for (const c of g.items) init[c.key] = { enabled: true, sendTime: c.defaultTime };
      try {
        const res = await fetch(`${API_BASE}/api/v1/push/prefs?endpoint=${encodeURIComponent(sub.endpoint)}`, {
          headers: { 'X-Tenant-Slug': slug }, cache: 'no-store',
        });
        const json = await res.json() as { data: PrefRow[] };
        for (const r of json.data ?? []) {
          init[r.category] = { enabled: !!r.enabled, sendTime: r.send_time ?? '' };
          if (r.quiet_start || r.quiet_end) {
            setQuiet({ start: r.quiet_start ?? '', end: r.quiet_end ?? '' });
          }
        }
      } catch { /* 저장된 게 없으면 기본값 그대로 */ }
      if (!alive) return;
      setPrefs(init);
      setStatus('ready');
    })();
    return () => { alive = false; };
  }, [slug]);

  const setOne = (key: string, patch: Partial<PrefState>) => {
    setPrefs((prev) => ({ ...prev, [key]: { ...(prev[key] ?? { enabled: true, sendTime: '' }), ...patch } }));
    setDirty(true);
  };

  const save = useCallback(async () => {
    if (!endpoint) return;
    setStatus('saving');
    try {
      const body = {
        endpoint,
        prefs: Object.entries(prefs).map(([category, v]) => ({
          category,
          enabled: v.enabled,
          sendTime: v.sendTime,
          // 방해 금지는 기기 단위 설정이라 모든 항목에 같은 값을 붙인다.
          quietStart: quiet.start,
          quietEnd: quiet.end,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
        })),
      };
      const res = await fetch(`${API_BASE}/api/v1/push/prefs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Slug': slug },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('save failed');
      setDirty(false);
      setStatus('saved');
      setTimeout(() => setStatus('ready'), 2000);
    } catch {
      setStatus('ready');
    }
  }, [endpoint, prefs, quiet, slug]);

  if (status === 'loading') return null;

  const timeInput = {
    border: LINE, borderRadius: 2, padding: '6px 8px', fontSize: 14,
    background: 'var(--dw-background, #fffdf9)', color: TEXT, fontFamily: 'inherit',
  } as const;

  return (
    <SectionShell
      props={props}
      applyLayout
      defaultContentClass="mx-auto max-w-7xl px-4 sm:px-6"
      style={{ paddingBlock: 'var(--section-py-md)' }}
    >
      <div style={{ maxWidth: '40em' }}>
        <h2 style={{
          fontFamily: 'var(--dw-font-heading, var(--brand-font-heading, serif))',
          margin: 0, fontSize: 'clamp(22px,3vw,32px)', fontWeight: 600, color: TEXT,
        }}>{title}</h2>
        <p style={{ margin: '12px 0 0', fontSize: 16, lineHeight: 1.75, color: MUTED }}>
          {status === 'no-sub' ? notSubscribedText : description}
        </p>

        {status !== 'no-sub' && (
          <>
            <div style={{ marginTop: 24 }}>
              {grouped.map((g, gi) => (
                <div key={gi} style={{ marginTop: gi === 0 ? 0 : 22 }}>
                  {g.group && (
                    <p style={{
                      margin: '0 0 6px', fontSize: 12, fontWeight: 700,
                      letterSpacing: '.14em', color: 'var(--dw-secondary, #5e6044)',
                    }}>{g.group}</p>
                  )}
                  {g.items.map((c) => {
                    const v = prefs[c.key] ?? { enabled: true, sendTime: c.defaultTime };
                    return (
                      <div key={c.key} style={{
                        display: 'flex', flexWrap: 'wrap', gap: '8px 16px',
                        alignItems: 'center', borderTop: LINE, padding: '14px 0',
                      }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 220px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={v.enabled}
                            onChange={(e) => setOne(c.key, { enabled: e.target.checked })}
                            style={{ width: 18, height: 18, accentColor: 'var(--dw-primary, #7b7d5c)' }}
                          />
                          <span style={{ minWidth: 0 }}>
                            <span style={{ display: 'block', fontSize: 16, fontWeight: 600, color: TEXT }}>{c.label}</span>
                            {c.description && (
                              <span style={{ display: 'block', fontSize: 13, color: MUTED }}>{c.description}</span>
                            )}
                          </span>
                        </label>
                        {/* 시각이 정해진 항목만 시간 선택을 보여준다 — 공지처럼 그때그때
                            나가는 항목에 시간 칸이 있으면 설정해도 안 지켜지는 것처럼 보인다. */}
                        {c.defaultTime !== '' && (
                          <input
                            type="time"
                            value={v.sendTime}
                            disabled={!v.enabled}
                            onChange={(e) => setOne(c.key, { sendTime: e.target.value })}
                            style={{ ...timeInput, opacity: v.enabled ? 1 : 0.45 }}
                            aria-label={`${c.label} 받을 시간`}
                          />
                        )}
                      </div>
                    );
                  })}
                  <div style={{ borderTop: LINE }} />
                </div>
              ))}
            </div>

            <div style={{ marginTop: 24 }}>
              <p style={{
                margin: '0 0 8px', fontSize: 12, fontWeight: 700,
                letterSpacing: '.14em', color: 'var(--dw-secondary, #5e6044)',
              }}>방해 금지 시간</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <input type="time" value={quiet.start} aria-label="방해 금지 시작"
                  onChange={(e) => { setQuiet((q) => ({ ...q, start: e.target.value })); setDirty(true); }}
                  style={timeInput} />
                <span style={{ color: MUTED }}>~</span>
                <input type="time" value={quiet.end} aria-label="방해 금지 종료"
                  onChange={(e) => { setQuiet((q) => ({ ...q, end: e.target.value })); setDirty(true); }}
                  style={timeInput} />
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 13, color: MUTED }}>
                이 시간에 걸린 알림은 끝나는 시각으로 미뤄집니다. 비워두면 적용되지 않습니다.
              </p>
            </div>

            <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
              <button type="button" onClick={save} disabled={!dirty || status === 'saving'}
                style={{
                  background: PRIMARY, color: '#fff', border: 0, borderRadius: 2,
                  padding: '12px 26px', fontSize: 15, fontWeight: 600,
                  fontFamily: 'inherit', cursor: dirty ? 'pointer' : 'default',
                  opacity: dirty && status !== 'saving' ? 1 : 0.5,
                }}>
                {status === 'saving' ? '저장 중...' : '저장'}
              </button>
              {status === 'saved' && <span style={{ fontSize: 14, color: MUTED }}>저장했습니다.</span>}
            </div>
          </>
        )}
      </div>
    </SectionShell>
  );
}
