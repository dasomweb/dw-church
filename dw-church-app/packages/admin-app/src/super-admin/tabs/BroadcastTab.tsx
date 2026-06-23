import { useState, useEffect } from 'react';
import { useToast } from '../../components';
import { useAdminApi } from '../shared/use-admin-api';

// 마케팅/공지 본문 프리셋 — 선택하면 제목·본문이 자동 채워진다. 본문은 디자인
// 틀 안쪽 HTML(서버가 wrapEmail 로 감쌈). 실재하는 기능/요금제만 담는다.
const BROADCAST_PRESETS: { key: string; label: string; subject: string; body: string }[] = [
  {
    key: 'demo_invite',
    label: '데모 체험 초대',
    subject: '우리 교회 홈페이지, 직접 만들고 관리해 보세요 — TRUE LIGHT 데모',
    body: `<p>안녕하세요,</p>
<p>TRUE LIGHT는 교회가 홈페이지를 <strong>직접 만들고 관리</strong>할 수 있는 서비스입니다. 설교·주보·앨범·행사를 관리자 화면에서 입력하면 홈페이지에 바로 올라갑니다 — 업체에 맡기거나 어려운 기술을 배우지 않아도 됩니다.</p>
<p>처음 디자인은 저희가 잡아 드리고, 이후 내용은 교회가 직접 올리고 고치시면 됩니다. 실제 관리자 화면을 <strong>데모로 미리</strong> 둘러보세요.</p>
<p style="text-align:center;margin:28px 0">
  <a href="https://truelight.app" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600">데모 체험 신청하기</a>
</p>
<p>궁금한 점은 이 메일에 회신해 주세요. 감사합니다.</p>`,
  },
  {
    key: 'intro',
    label: '서비스 소개',
    subject: '교회 홈페이지, 직접 만들고 직접 관리하세요 — TRUE LIGHT',
    body: `<p>안녕하세요,</p>
<p>TRUE LIGHT는 미주 한인교회를 위한 홈페이지 서비스입니다. 복잡한 제작 과정 없이, 교회가 관리자 화면에서 홈페이지를 직접 운영합니다.</p>
<ul>
  <li>설교·주보·앨범·행사·교역자·게시판을 직접 입력 — 올리면 홈페이지에 바로 반영</li>
  <li>휴대폰에서도 잘 보이는 6가지 디자인</li>
  <li>처음 디자인은 전문가가 잡아 드리고, 이후 관리는 교회가 직접</li>
</ul>
<p>매달 정해진 이용료로 부담 없이 시작하고, 교회에 맞춰 기능을 더할 수 있습니다.</p>
<p style="text-align:center;margin:28px 0">
  <a href="https://truelight.app" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600">자세히 보기</a>
</p>
<p>감사합니다.</p>`,
  },
  {
    key: 'pricing',
    label: '요금제 안내',
    subject: 'TRUE LIGHT 이용 요금 안내 — 교회 규모에 맞게',
    body: `<p>안녕하세요,</p>
<p>TRUE LIGHT는 교회 규모와 필요에 맞춰 네 가지 요금제를 제공합니다.</p>
<ul>
  <li><strong>라이트</strong> — 기본 홈페이지와 핵심 내용</li>
  <li><strong>기본</strong> — 설교·주보·앨범까지 확장</li>
  <li><strong>플러스</strong> — 게시판·행사·관리자 여러 명</li>
  <li><strong>프로</strong> — 모든 기능과 우선 지원</li>
</ul>
<p>모든 요금제는 처음 디자인 셋업을 포함하며, 이후에는 교회가 직접 관리합니다.</p>
<p style="text-align:center;margin:28px 0">
  <a href="https://truelight.app#plans" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600">요금 안내 보기</a>
</p>
<p>감사합니다.</p>`,
  },
  {
    key: 'demo_followup',
    label: '데모 후속 안내',
    subject: '데모는 어떠셨나요? 우리 교회 이름으로 시작하세요',
    body: `<p>안녕하세요,</p>
<p>TRUE LIGHT 데모를 이용해 주셔서 감사합니다. 관리자 화면에서 직접 다뤄 보시니 어떠셨나요?</p>
<p>이제 우리 교회 이름으로 시작하실 차례입니다. 요금제만 정하시면 처음 디자인은 저희가 잡아 드리고, 이후 관리는 교회가 직접 이어가시면 됩니다.</p>
<p style="text-align:center;margin:28px 0">
  <a href="https://truelight.app/apply" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600">신청하고 시작하기</a>
</p>
<p>도움이 필요하시면 이 메일에 회신해 주세요. 감사합니다.</p>`,
  },
];

// 공지·마케팅 메일을 선택한 대상에게 BCC로 일괄 발송한다. testTo 가 있으면 해당
// 주소로만 미리보기 발송. 프리셋으로 제목·본문을 채울 수 있다. 디자인 틀은 서버 적용.
export default function BroadcastTab() {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [testTo, setTestTo] = useState('');
  const [testing, setTesting] = useState(false);
  const [sending, setSending] = useState(false);
  const [aud, setAud] = useState({ admins: false, demo: true, applications: false });
  const [customEmails, setCustomEmails] = useState('');
  const [counts, setCounts] = useState<{ admins: number; demo: number; applications: number } | null>(null);
  const [kakaoUrl, setKakaoUrl] = useState('');
  const [kakaoSaving, setKakaoSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await apiFetch<{ data: { admins: number; demo: number; applications: number } }>('/email-broadcast/audiences');
        setCounts(res.data);
      } catch { /* ignore — counts are best-effort */ }
      try {
        const res = await apiFetch<{ data: { kakaoUrl: string | null } }>('/marketing-config');
        setKakaoUrl(res.data.kakaoUrl ?? '');
      } catch { /* ignore */ }
    })();
  }, [apiFetch]);

  const saveKakao = async () => {
    setKakaoSaving(true);
    try {
      await apiFetch('/marketing-config', { method: 'PUT', body: JSON.stringify({ kakaoUrl: kakaoUrl.trim() || null }) });
      showToast('success', '카카오톡 문의 링크를 저장했습니다');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '저장 실패');
    } finally {
      setKakaoSaving(false);
    }
  };

  const selectedAudiences = (Object.keys(aud) as (keyof typeof aud)[]).filter((k) => aud[k]);
  const customCount = customEmails.split(/[\s,;]+/).map((s) => s.trim()).filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)).length;
  const audienceTotal =
    (aud.admins ? counts?.admins ?? 0 : 0) + (aud.demo ? counts?.demo ?? 0 : 0) + (aud.applications ? counts?.applications ?? 0 : 0) + customCount;
  const hasRecipients = selectedAudiences.length > 0 || customCount > 0;

  const canCompose = subject.trim().length > 0 && body.trim().length > 0;

  const applyPreset = (key: string) => {
    const p = BROADCAST_PRESETS.find((x) => x.key === key);
    if (!p) return;
    if ((subject.trim() || body.trim()) && !window.confirm('현재 작성 중인 내용을 프리셋으로 덮어쓸까요?')) return;
    setSubject(p.subject);
    setBody(p.body);
  };

  const handleTest = async () => {
    if (testing) return;
    if (!canCompose) {
      showToast('error', '제목과 본문을 입력하세요.');
      return;
    }
    if (!testTo.trim()) {
      showToast('error', '받는 사람 이메일을 입력하세요.');
      return;
    }
    setTesting(true);
    try {
      await apiFetch('/email-broadcast', {
        method: 'POST',
        body: JSON.stringify({ subject, body, testTo: testTo.trim() }),
      });
      showToast('success', '테스트 메일을 보냈습니다.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '테스트 메일 발송 실패');
    } finally {
      setTesting(false);
    }
  };

  const handleSendAll = async () => {
    if (sending) return;
    if (!canCompose) {
      showToast('error', '제목과 본문을 입력하세요.');
      return;
    }
    if (!hasRecipients) {
      showToast('error', '받는 대상을 한 개 이상 선택하거나 이메일을 입력하세요.');
      return;
    }
    if (!window.confirm(`선택한 대상(약 ${audienceTotal}명)에게 BCC로 메일을 발송합니다. 되돌릴 수 없습니다. 진행할까요?`)) return;
    setSending(true);
    try {
      const res = await apiFetch<{ data: { recipients: number; sent: number; failed: number; batches: number } }>(
        '/email-broadcast',
        {
          method: 'POST',
          body: JSON.stringify({ subject, body, audiences: selectedAudiences, customEmails }),
        },
      );
      const { recipients, sent, failed, batches } = res.data;
      showToast('success', `발송 완료 — 대상 ${recipients}명 · 성공 ${sent} · 실패 ${failed} (BCC ${batches}묶음)`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '메일 발송 실패');
    } finally {
      setSending(false);
    }
  };

  const inputCls =
    'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';

  return (
    <div className="space-y-5">
      {/* Intro */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
        <p className="text-sm font-medium text-blue-800">
          공지·마케팅 메일을 선택한 대상에게 BCC(서로 주소 비공개)로 일괄 발송합니다.
          먼저 테스트 발송으로 내용을 확인한 뒤 발송하세요.
        </p>
      </div>

      {/* 카카오톡 문의 링크 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-2">
        <h2 className="text-sm font-semibold text-gray-700">카카오톡 문의 링크</h2>
        <p className="text-xs text-gray-400">
          카카오톡 채널 또는 오픈채팅 주소를 넣으면, 발송 메일과 홈페이지에 "카카오톡으로 문의" 버튼이 자동으로 표시됩니다. 비우면 표시되지 않습니다.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={kakaoUrl}
            onChange={(e) => setKakaoUrl(e.target.value)}
            className={`${inputCls} sm:flex-1`}
            placeholder="예: https://pf.kakao.com/_xxxxx 또는 https://open.kakao.com/o/xxxxx"
          />
          <button
            onClick={() => void saveKakao()}
            disabled={kakaoSaving}
            className="bg-gray-900 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {kakaoSaving ? '저장 중...' : '링크 저장'}
          </button>
        </div>
      </div>

      {/* 받는 대상 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">받는 대상</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {([
            { key: 'admins', label: '교회 관리자', count: counts?.admins },
            { key: 'demo', label: '데모 체험 신청자', count: counts?.demo },
            { key: 'applications', label: '서비스 신청자', count: counts?.applications },
          ] as const).map((o) => (
            <label key={o.key} className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm cursor-pointer transition-colors ${aud[o.key] ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
              <input type="checkbox" checked={aud[o.key]} onChange={(e) => setAud({ ...aud, [o.key]: e.target.checked })} className="rounded" />
              <span className="font-medium text-gray-800">{o.label}</span>
              <span className="ml-auto text-xs text-gray-400">{o.count ?? '…'}명</span>
            </label>
          ))}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">직접 입력 (선택)</label>
          <textarea
            value={customEmails}
            onChange={(e) => setCustomEmails(e.target.value)}
            rows={3}
            className={`${inputCls} font-mono`}
            placeholder="쉼표·줄바꿈으로 구분된 이메일 주소 (예: a@x.com, b@y.com)"
          />
          {customCount > 0 && <p className="mt-1 text-xs text-gray-500">직접 입력 유효 주소 {customCount}개</p>}
        </div>
        <p className="text-xs text-gray-500">선택·입력 합계 <strong className="text-gray-800">약 {audienceTotal}명</strong> (중복 주소는 발송 시 자동 제거)</p>
      </div>

      {/* 작성 폼 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">내용 작성</h2>

        <div>
          <label className="block text-sm font-medium mb-1">프리셋 불러오기</label>
          <select
            value=""
            onChange={(e) => { if (e.target.value) applyPreset(e.target.value); }}
            className={inputCls}
          >
            <option value="">프리셋 선택 — 제목·본문 자동 채우기</option>
            {BROADCAST_PRESETS.map((p) => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-400">선택하면 제목과 본문이 채워집니다. 이후 자유롭게 수정하세요.</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">제목</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={inputCls}
            placeholder="공지 제목"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">본문</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            className={`${inputCls} font-mono leading-relaxed`}
            placeholder="<p>안녕하세요, 공지 내용입니다.</p>"
          />
          <p className="mt-1 text-xs text-gray-400">
            {'{{변수}}'}는 공지에선 사용하지 않습니다. 디자인 틀은 자동 적용됩니다.
          </p>
        </div>
      </div>

      {/* 테스트 발송 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">테스트 발송</h2>
        <p className="text-xs text-gray-400">
          입력한 주소로만 미리보기 메일이 발송됩니다.
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
            {testing ? '발송 중...' : '테스트 발송'}
          </button>
        </div>
      </div>

      {/* 발송 */}
      <div className="bg-white rounded-xl shadow-sm border border-red-200 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-red-700">발송</h2>
        <p className="text-xs text-red-600">
          ⚠ 선택한 대상(약 {audienceTotal}명)에게 즉시 BCC로 발송합니다. 되돌릴 수 없습니다.
        </p>
        <button
          onClick={() => void handleSendAll()}
          disabled={sending || !canCompose || !hasRecipients}
          className="bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? '발송 중...' : `발송 (약 ${audienceTotal}명)`}
        </button>
      </div>
    </div>
  );
}
