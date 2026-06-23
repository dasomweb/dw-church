import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../components';
import { useAdminApi } from '../shared/use-admin-api';
import { Spinner } from '../shared/admin-ui';

interface EmailSettings {
  id: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassSet: boolean;
  fromInfo: string;
  fromOrder: string;
  fromSupport: string;
  fromName: string;
  updatedAt: string;
}

export default function EmailSettingsTab() {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passSet, setPassSet] = useState(false);
  const [form, setForm] = useState({
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: '',
    smtpPass: '', // 빈 값이면 기존 비밀번호 유지 (PATCH 에서 생략)
    fromInfo: '',
    fromOrder: '',
    fromSupport: '',
    fromName: '',
  });

  // 테스트 메일 전송 상태
  const [testTo, setTestTo] = useState('');
  const [testing, setTesting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: EmailSettings }>('/email-settings');
      const s = res.data;
      setPassSet(!!s.smtpPassSet);
      setForm({
        smtpHost: s.smtpHost ?? '',
        smtpPort: s.smtpPort ?? 587,
        smtpSecure: !!s.smtpSecure,
        smtpUser: s.smtpUser ?? '',
        smtpPass: '', // 절대 서버에서 받아오지 않음
        fromInfo: s.fromInfo ?? '',
        fromOrder: s.fromOrder ?? '',
        fromSupport: s.fromSupport ?? '',
        fromName: s.fromName ?? '',
      });
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '이메일 설정을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // smtpPass 는 새로 입력한 경우에만 전송 — 빈 값이면 기존 비밀번호 유지.
      const body: Record<string, unknown> = {
        smtpHost: form.smtpHost,
        smtpPort: Number(form.smtpPort),
        smtpSecure: form.smtpSecure,
        smtpUser: form.smtpUser,
        fromInfo: form.fromInfo,
        fromOrder: form.fromOrder,
        fromSupport: form.fromSupport,
        fromName: form.fromName,
      };
      if (form.smtpPass.trim()) body.smtpPass = form.smtpPass;

      await apiFetch('/email-settings', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      showToast('success', '이메일 설정이 저장되었습니다.');
      await load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (testing) return;
    if (!testTo.trim()) {
      showToast('error', '받는 사람 이메일을 입력하세요.');
      return;
    }
    setTesting(true);
    try {
      await apiFetch('/email-settings/test', {
        method: 'POST',
        body: JSON.stringify({ to: testTo.trim() }),
      });
      showToast('success', '테스트 메일을 보냈습니다. 수신함을 확인하세요.');
    } catch (err) {
      // SMTP 설정 오류 등은 서버가 Error 로 던진다 — 메시지 그대로 노출.
      showToast('error', err instanceof Error ? err.message : '테스트 메일 발송 실패');
    } finally {
      setTesting(false);
    }
  };

  const set = (key: keyof typeof form, val: string | number | boolean) =>
    setForm((f) => ({ ...f, [key]: val }));

  if (loading) return <Spinner />;

  const inputCls =
    'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';

  return (
    <div className="space-y-5">
      {/* Intro */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
        <p className="text-sm font-medium text-blue-800">
          여기서 설정한 SMTP로 결제 안내·고객지원 등 모든 자동 메일이 발송됩니다.
          비밀번호는 보안상 다시 표시되지 않습니다.
        </p>
      </div>

      {/* SMTP 설정 폼 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">SMTP 서버</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">SMTP 서버</label>
            <input
              value={form.smtpHost}
              onChange={(e) => set('smtpHost', e.target.value)}
              className={inputCls}
              placeholder="SiteGround SMTP 등 (예: mail.dasomweb.com)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">포트</label>
            <input
              type="number"
              value={form.smtpPort}
              onChange={(e) => set('smtpPort', e.target.value === '' ? 0 : Number(e.target.value))}
              className={inputCls}
              placeholder="587"
            />
          </div>

          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.smtpSecure}
                onChange={(e) => set('smtpSecure', e.target.checked)}
                className="rounded"
              />
              보안 연결(SSL)
            </label>
          </div>
          <p className="sm:col-span-2 -mt-2 text-xs text-gray-400">
            포트 465는 SSL, 587은 STARTTLS 입니다.
          </p>

          <div>
            <label className="block text-sm font-medium mb-1">SMTP 사용자</label>
            <input
              value={form.smtpUser}
              onChange={(e) => set('smtpUser', e.target.value)}
              className={inputCls}
              placeholder="보통 전체 이메일 주소 (예: info@dasomweb.com)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">SMTP 비밀번호</label>
            <input
              type="password"
              value={form.smtpPass}
              onChange={(e) => set('smtpPass', e.target.value)}
              className={inputCls}
              placeholder={passSet ? '●●●● (저장됨)' : '비밀번호 입력'}
            />
            <p className="mt-0.5 text-xs text-gray-400">
              비워두면 기존 비밀번호가 유지됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* 보내는 주소 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">보내는 주소</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">일반/문의</label>
            <input
              value={form.fromInfo}
              onChange={(e) => set('fromInfo', e.target.value)}
              className={inputCls}
              placeholder="info@dasomweb.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">주문/결제</label>
            <input
              value={form.fromOrder}
              onChange={(e) => set('fromOrder', e.target.value)}
              className={inputCls}
              placeholder="order@dasomweb.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">고객지원</label>
            <input
              value={form.fromSupport}
              onChange={(e) => set('fromSupport', e.target.value)}
              className={inputCls}
              placeholder="support@dasomweb.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">보내는 이름</label>
            <input
              value={form.fromName}
              onChange={(e) => set('fromName', e.target.value)}
              className={inputCls}
              placeholder="TRUE LIGHT"
            />
          </div>
        </div>

        <div className="pt-1">
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      {/* 테스트 메일 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">테스트 메일 보내기</h2>
        <p className="text-xs text-gray-400">
          테스트 전에 위 설정을 먼저 저장하세요. 입력한 주소로 테스트 메일이 발송됩니다.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            className={`${inputCls} sm:flex-1`}
            placeholder="받는 사람 이메일"
          />
          <button
            onClick={() => void handleTest()}
            disabled={testing}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {testing ? '발송 중...' : '테스트 메일 보내기'}
          </button>
        </div>
      </div>
    </div>
  );
}
