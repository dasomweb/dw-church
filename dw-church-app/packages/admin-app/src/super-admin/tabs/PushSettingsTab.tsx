import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../components';
import { useAdminApi } from '../shared/use-admin-api';
import { Spinner } from '../shared/admin-ui';

/**
 * 웹 푸시(VAPID) 설정 — 슈퍼어드민 전용, 플랫폼 공용 한 벌.
 *
 * VAPID 는 **보내는 서버(= TrueLight)의 신원**이지 교회별 계정이 아니다
 * (RFC 8292 §4). 그래서 교회마다 키를 받지 않고 여기서 한 번 만든다.
 *
 * ⚠️ 키 재생성은 사실상 되돌릴 수 없다. 구독은 생성 시 쓴 공개키에 묶여 있어서
 * (RFC 8292 §4.2) 키를 바꾸면 기존 구독이 전부 무효가 되고 성도 전원이 알림을
 * 다시 켜야 한다. 그래서 구독이 있으면 서버가 409 로 막고, 여기서 한 번 더
 * 확인을 받은 뒤에만 강제 재생성한다.
 */
interface PushSettings {
  publicKey: string;
  privateKeySet: boolean;
  subject: string;
  updatedAt: string | null;
  activeSubscriptions: number;
}

export default function PushSettingsTab() {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [data, setData] = useState<PushSettings | null>(null);
  const [subject, setSubject] = useState('');
  // 구독이 있는 상태에서 재생성을 누르면 한 단계 확인을 거친다.
  const [confirmRegen, setConfirmRegen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // useAdminApi 는 /api/v1/admin 접두사를 붙이고, 파싱+camelize 된 JSON 을 돌려준다.
      const json = await apiFetch<{ data: PushSettings }>('/push-settings');
      setData(json.data);
      setSubject(json.data.subject || '');
    } catch {
      showToast('error', '푸시 설정을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, showToast]);

  useEffect(() => { void load(); }, [load]);

  const generate = async (force: boolean) => {
    setWorking(true);
    try {
      const json = await apiFetch<{ data: { requiresConfirm?: boolean } }>('/push-settings/generate', {
        method: 'POST',
        body: JSON.stringify({ subject, confirmInvalidate: force }),
      });
      if (json.data?.requiresConfirm) {
        // 이미 쓰고 있는 키 — 무효화 경고를 띄우고 한 번 더 확인받는다.
        setConfirmRegen(true);
        return;
      }
      setConfirmRegen(false);
      showToast('success', force ? '키를 재생성했습니다. 성도들이 알림을 다시 켜야 합니다.' : '푸시 키를 생성했습니다.');
      await load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '키 생성에 실패했습니다.');
    } finally {
      setWorking(false);
    }
  };

  const saveSubject = async () => {
    setWorking(true);
    try {
      await apiFetch('/push-settings', {
        method: 'PATCH',
        body: JSON.stringify({ subject }),
      });
      showToast('success', '연락처를 저장했습니다.');
      await load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setWorking(false);
    }
  };

  if (loading) return <Spinner />;

  const configured = !!data?.privateKeySet && !!data?.publicKey;
  const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none';

  return (
    <div className="max-w-2xl space-y-6">
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">웹 푸시 (VAPID)</h2>
        <p className="text-xs text-gray-500 mb-4">
          성도 기기로 알림을 보내기 위한 플랫폼 공용 키입니다. 교회별로 따로 만들지 않습니다 —
          VAPID는 보내는 서버의 신원이라 한 벌이면 전체 교회에 적용됩니다. 발송 자체는 무료입니다.
        </p>

        <div className="rounded-lg border px-4 py-3 mb-4"
          style={{ borderColor: configured ? '#bbf7d0' : '#fde68a', background: configured ? '#f0fdf4' : '#fffbeb' }}>
          <p className="text-sm font-medium" style={{ color: configured ? '#166534' : '#92400e' }}>
            {configured ? '설정됨 — 푸시 발송 가능' : '아직 키가 없습니다 — 푸시가 동작하지 않습니다'}
          </p>
          {configured && (
            <p className="mt-1 text-xs text-gray-600">
              활성 구독 <b>{data?.activeSubscriptions ?? 0}</b>건
              {data?.updatedAt && ` · 생성 ${String(data.updatedAt).slice(0, 10)}`}
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="pushSubject" className="block text-sm font-medium text-gray-700 mb-1">연락처 (subject)</label>
            <input
              id="pushSubject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="mailto:support@truelight.app"
              className={inputClass}
            />
            <p className="text-xs text-gray-400 mt-1">
              푸시 서비스(구글·애플)가 문제 발생 시 연락할 주소입니다. 비워두면 기본값이 쓰입니다.
            </p>
          </div>

          {configured && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">공개키</label>
              <code className="block break-all rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-600">
                {data?.publicKey}
              </code>
              <p className="text-xs text-gray-400 mt-1">
                브라우저가 구독할 때 그대로 받아가는 값이라 공개되어도 됩니다. 개인키는 서버에만 저장되며 화면에 표시되지 않습니다.
              </p>
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {configured && (
            <button type="button" onClick={saveSubject} disabled={working}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              연락처 저장
            </button>
          )}
          {!configured ? (
            <button type="button" onClick={() => generate(false)} disabled={working}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {working ? '생성 중...' : '푸시 키 생성'}
            </button>
          ) : (
            <button type="button" onClick={() => generate(false)} disabled={working}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
              키 재생성
            </button>
          )}
        </div>

        {confirmRegen && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm font-semibold text-red-800">정말 재생성할까요?</p>
            <p className="mt-1 text-xs text-red-700">
              현재 활성 구독 <b>{data?.activeSubscriptions ?? 0}건이 모두 무효</b>가 됩니다.
              해당 성도들은 각자 기기에서 알림을 다시 켜야 하며, 그 전까지는 알림이 가지 않습니다.
              되돌릴 수 없습니다.
            </p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setConfirmRegen(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900">취소</button>
              <button type="button" onClick={() => generate(true)} disabled={working}
                className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                무효화하고 재생성
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
