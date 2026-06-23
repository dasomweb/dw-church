import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../components';
import { useAdminApi } from '../shared/use-admin-api';
import { Spinner, EmptyState } from '../shared/admin-ui';


// ═══════════════════════════════════════════════════════════
// ─── Tab: Email Templates (이메일 템플릿) ────────────────
// ═══════════════════════════════════════════════════════════
// 자동 발송 메일(가입/결제/지원 등)의 제목·본문 템플릿을 편집한다.
// body 는 디자인 틀 안쪽 inner HTML 이며 {{변수}} 와 {{button}}(동작 버튼)
// 토큰을 지원한다. vars 는 사용 가능한 변수 힌트(쉼표 구분 문자열).
interface EmailTemplate {
  key: string;
  name: string;
  subject: string;
  body: string;
  vars: string;
  updatedAt: string;
}

export default function EmailTemplatesTab() {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 편집 중인(로컬) 제목/본문 — 선택된 템플릿에 대해서만 유지.
  const [draftSubject, setDraftSubject] = useState('');
  const [draftBody, setDraftBody] = useState('');

  // 테스트 발송
  const [testTo, setTestTo] = useState('');
  const [testing, setTesting] = useState(false);

  // 디자인 미리보기 — 편집 중(저장 전) 제목/본문을 서버 디자인 틀로 렌더.
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewSubject, setPreviewSubject] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: EmailTemplate[] }>('/email-templates');
      const list = res.data ?? [];
      setTemplates(list);
      // 선택을 유지하되, 없으면 첫 항목 선택.
      setSelectedKey((prev) => (prev && list.some((t) => t.key === prev) ? prev : list[0]?.key ?? null));
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '이메일 템플릿을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = templates.find((t) => t.key === selectedKey) ?? null;

  // 선택이 바뀌면 draft 를 서버 값으로 리셋.
  useEffect(() => {
    if (selected) {
      setDraftSubject(selected.subject);
      setDraftBody(selected.body);
    }
  }, [selected]);

  // dirty: 서버 값과 draft 가 다를 때만 저장 버튼 활성화.
  const dirty = !!selected && (draftSubject !== selected.subject || draftBody !== selected.body);

  // 편집 중인 제목/본문이 바뀌면(디바운스) 서버에서 디자인 틀이 입혀진 최종
  // 메일 HTML 을 받아 미리보기에 렌더한다. 저장하지 않아도 즉시 확인 가능.
  const previewKey = selected?.key;
  useEffect(() => {
    if (!previewKey) { setPreviewHtml(''); setPreviewSubject(''); return; }
    let cancelled = false;
    setPreviewLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await apiFetch<{ data: { subject: string; html: string } }>(
          `/email-templates/${previewKey}/preview`,
          { method: 'POST', body: JSON.stringify({ subject: draftSubject, body: draftBody }) },
        );
        if (!cancelled) { setPreviewHtml(res.data?.html ?? ''); setPreviewSubject(res.data?.subject ?? ''); }
      } catch {
        /* 미리보기 실패는 조용히 무시 (편집/저장에는 영향 없음) */
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [previewKey, draftSubject, draftBody, apiFetch]);

  const handleSave = async () => {
    if (!selected || saving || !dirty) return;
    setSaving(true);
    try {
      await apiFetch(`/email-templates/${selected.key}`, {
        method: 'PATCH',
        body: JSON.stringify({ subject: draftSubject, body: draftBody }),
      });
      showToast('success', '저장되었습니다.');
      await load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!selected || testing) return;
    if (!testTo.trim()) {
      showToast('error', '받는 사람 이메일을 입력하세요.');
      return;
    }
    setTesting(true);
    try {
      await apiFetch(`/email-templates/${selected.key}/test`, {
        method: 'POST',
        body: JSON.stringify({ to: testTo.trim() }),
      });
      showToast('success', '테스트 메일을 보냈습니다.');
    } catch (err) {
      // 서버가 400 으로 한글 오류 메시지를 던진다 — 그대로 노출.
      showToast('error', err instanceof Error ? err.message : '테스트 메일 발송 실패');
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <Spinner />;
  if (templates.length === 0) return <EmptyState message="등록된 이메일 템플릿이 없습니다." />;

  const inputCls =
    'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';

  return (
    <div className="space-y-5">
      {/* Intro */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
        <p className="text-sm font-medium text-blue-800">
          가입·결제·지원 등 자동 발송 메일의 제목과 본문을 편집합니다.
          본문은 디자인 틀 안쪽 HTML이며 저장 후 테스트 발송으로 확인할 수 있습니다.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* 템플릿 목록 */}
        <div className="lg:w-64 shrink-0 bg-white rounded-xl shadow-sm border border-gray-100 p-2">
          <ul className="space-y-1">
            {templates.map((t) => (
              <li key={t.key}>
                <button
                  onClick={() => setSelectedKey(t.key)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    t.key === selectedKey
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {t.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* 편집기 */}
        <div className="flex-1 min-w-0 space-y-5">
          {selected && (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">키</label>
                  <code className="inline-block bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs font-mono text-gray-700">
                    {selected.key}
                  </code>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">제목</label>
                  <input
                    value={draftSubject}
                    onChange={(e) => setDraftSubject(e.target.value)}
                    className={inputCls}
                    placeholder="메일 제목"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">본문</label>
                  <textarea
                    value={draftBody}
                    onChange={(e) => setDraftBody(e.target.value)}
                    rows={12}
                    className={`${inputCls} font-mono leading-relaxed`}
                    placeholder="<p>안녕하세요 {{churchName}}님</p>"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    사용 가능한 변수: {selected.vars || '없음'}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    본문은 HTML이며 {'{{변수}}'}와 {'{{button}}'}(동작 버튼)을 사용할 수 있습니다.
                    디자인 틀은 자동으로 입혀집니다.
                  </p>
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => void handleSave()}
                    disabled={saving || !dirty}
                    className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? '저장 중...' : '저장'}
                  </button>
                </div>
              </div>

              {/* 디자인 미리보기 — 디자인 틀이 입혀진 실제 메일 모습 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-700">
                    미리보기 <span className="text-xs font-normal text-gray-400">· 샘플 변수 적용 · 디자인 틀 포함</span>
                  </h2>
                  {previewLoading && <span className="text-xs text-gray-400">갱신 중…</span>}
                </div>
                {previewSubject && (
                  <div className="text-xs text-gray-500">
                    제목: <span className="font-medium text-gray-700">{previewSubject}</span>
                  </div>
                )}
                <div className="rounded-lg border border-gray-200 overflow-hidden bg-gray-100">
                  <iframe
                    title="이메일 미리보기"
                    srcDoc={previewHtml || '<p style="font-family:sans-serif;color:#9ca3af;padding:24px">미리보기를 불러오는 중…</p>'}
                    sandbox=""
                    className="w-full h-[560px] bg-white"
                  />
                </div>
                <p className="text-xs text-gray-400">
                  저장 전 편집 내용이 그대로 반영됩니다. 실제 발송 메일과 동일한 디자인 틀이 적용됩니다.
                </p>
              </div>

              {/* 테스트 발송 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3">
                <h2 className="text-sm font-semibold text-gray-700">테스트 발송</h2>
                <p className="text-xs text-gray-400">
                  저장 후 테스트하세요. 샘플 변수가 채워진 메일이 입력한 주소로 발송됩니다.
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
