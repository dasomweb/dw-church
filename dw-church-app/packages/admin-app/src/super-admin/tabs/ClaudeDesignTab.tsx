/**
 * Claude Design 워크플로우 진입 (슈퍼어드민).
 *
 * Claude Design 을 활용하는 기능은 정해진 순서로 진행한다(docs/CLAUDE-DESIGN-WORKFLOW.md):
 *   1) 가져와 분석 → 2) 기존 블록과 매칭 → 3) 디자인만 안 맞으면 스킨/variant 추가
 *   → 4) 구조(Properties)가 안 맞으면 신규 블록.
 *
 * ⚠ 정직: admin 앱은 Claude Design 에 인증할 수 없어(런타임 토큰 없음) 여기서 프로젝트
 * 파일을 실제로 import/분석하지는 않는다 — 실제 DesignSync import·분석·블록 반영은 개발
 * (Claude Code) 단계에서 수행한다. 이 화면은 그 워크플로우의 **진입점 + 접수 + 가이드**:
 * 프로젝트 링크와 원하는 기능을 적어 "반영 요청"을 만들면, 개발에 그대로 넘길 수 있는
 * 구조화된 텍스트를 복사해 준다. 접수 목록은 이 브라우저에만 저장된다(localStorage).
 */
import { useEffect, useState } from 'react';

interface Req { id: string; link: string; feature: string; note: string; createdAt: string }
const LS_KEY = 'dw-claude-design-requests';

const STEPS: { n: string; title: string; desc: string }[] = [
  { n: '1', title: '가져와 분석', desc: 'Claude Design 프로젝트의 디자인 시스템(토큰) + 화면 시안을 가져와 구조 분석. 시안은 앞부분만 보지 말고 전체를 읽는다.' },
  { n: '2', title: '기존 블록과 매칭', desc: '각 섹션이 현재 블록 시스템의 어떤 블록에 대응되는지 확인.' },
  { n: '3', title: '디자인 안 맞으면 → 스킨/variant', desc: '대응 블록은 있는데(속성 구조는 맞음) 모양만 다르면, 새 블록 대신 그 블록에 디자인 패턴(variant)을 추가.' },
  { n: '4', title: '구조 안 맞으면 → 신규 블록', desc: 'Properties(속성·데이터 구조)가 기존 블록과 근본적으로 안 맞으면 그때 신규 블록을 만들어 추가(전체 배선).' },
];

function loadReqs(): Req[] {
  try { const raw = localStorage.getItem(LS_KEY); return raw ? (JSON.parse(raw) as Req[]) : []; } catch { return []; }
}
function saveReqs(rs: Req[]) { try { localStorage.setItem(LS_KEY, JSON.stringify(rs)); } catch { /* private mode */ } }

function requestText(r: Req): string {
  return [
    'Claude Design 반영 요청 (docs/CLAUDE-DESIGN-WORKFLOW.md 순서로)',
    `- 프로젝트: ${r.link || '(링크 없음)'}`,
    `- 원하는 기능/화면: ${r.feature || '(미기재)'}`,
    r.note ? `- 참고: ${r.note}` : '',
    '',
    '진행: 1) 가져와 분석 → 2) 기존 블록 매칭 → 3) 디자인만 다르면 스킨/variant 추가 → 4) 구조가 다르면 신규 블록. custom_html 통짜 금지.',
  ].filter(Boolean).join('\n');
}

export default function ClaudeDesignTab() {
  const [link, setLink] = useState('');
  const [feature, setFeature] = useState('');
  const [note, setNote] = useState('');
  const [reqs, setReqs] = useState<Req[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => { setReqs(loadReqs()); }, []);

  const copy = async (text: string, id: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 1500); }
    catch { /* clipboard blocked */ }
  };

  const addRequest = () => {
    if (!link.trim() && !feature.trim()) return;
    const r: Req = { id: crypto.randomUUID(), link: link.trim(), feature: feature.trim(), note: note.trim(), createdAt: new Date().toISOString() };
    const next = [r, ...reqs];
    setReqs(next); saveReqs(next);
    void copy(requestText(r), r.id);
    setLink(''); setFeature(''); setNote('');
  };
  const remove = (id: string) => { const next = reqs.filter((r) => r.id !== id); setReqs(next); saveReqs(next); };

  const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500';

  return (
    <div className="space-y-6">
      {/* 안내 */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
        <p className="text-sm font-semibold text-blue-800">Claude Design 워크플로우</p>
        <p className="mt-1 text-xs text-blue-700/80">
          Claude Design 을 활용하는 기능은 아래 순서로 진행합니다. 실제 가져오기·분석·블록 반영은
          개발(Claude Code)이 이 순서대로 수행합니다 — 이 화면에서 <b>프로젝트 링크 + 원하는 기능</b>을
          적어 <b>반영 요청</b>을 만들면 개발에 넘길 텍스트가 복사됩니다.
        </p>
      </div>

      {/* 4단계 가이드 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s) => (
          <div key={s.n} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">{s.n}</div>
            <div className="mt-2 text-sm font-bold text-gray-900">{s.title}</div>
            <div className="mt-1 text-[12px] leading-relaxed text-gray-500">{s.desc}</div>
          </div>
        ))}
      </div>
      <div className="text-xs text-gray-400">
        한 줄 규칙: 기존 블록 우선 → 안 맞는 게 <b>디자인</b>이면 스킨(variant) 추가 → 안 맞는 게
        <b> 구조(Properties)</b>면 신규 블록. (통짜 custom_html 은 프론트샘플 전용 — 일반 기능엔 쓰지 않음.)
        <span className="ml-1 text-gray-400">문서: <code className="text-[11px]">docs/CLAUDE-DESIGN-WORKFLOW.md</code></span>
      </div>

      {/* 반영 요청 접수 */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-bold text-gray-900">반영 요청 만들기</h3>
        <p className="mt-0.5 text-xs text-gray-500">Claude Design 프로젝트 링크와 원하는 기능을 적으세요. 요청을 만들면 개발에 넘길 텍스트가 복사됩니다.</p>
        <div className="mt-3 space-y-2">
          <input className={inputCls} placeholder="Claude Design 프로젝트 링크 (https://claude.ai/design/p/...)" value={link} onChange={(e) => setLink(e.target.value)} />
          <input className={inputCls} placeholder="원하는 기능/화면 (예: 교적 통계 대시보드, 새 히어로 섹션)" value={feature} onChange={(e) => setFeature(e.target.value)} />
          <textarea className={`${inputCls} min-h-[64px]`} placeholder="참고 사항 (선택)" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={addRequest} disabled={!link.trim() && !feature.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">요청 만들기 + 복사</button>
          {link.trim() && (
            <a href={link.trim()} target="_blank" rel="noopener noreferrer"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">↗ 프로젝트 열기</a>
          )}
        </div>
      </div>

      {/* 접수 목록 (이 브라우저 저장) */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h3 className="text-sm font-bold text-gray-900">접수한 요청 <span className="text-gray-400">· {reqs.length}</span></h3>
          <span className="text-[11px] text-gray-400">이 브라우저에만 저장됩니다</span>
        </div>
        {reqs.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">아직 접수한 요청이 없습니다.</div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {reqs.map((r) => (
              <li key={r.id} className="flex items-start gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-gray-800">{r.feature || '(기능 미기재)'}</div>
                  {r.link && <a href={r.link} target="_blank" rel="noopener noreferrer" className="block truncate text-[11px] text-blue-600 hover:underline">{r.link}</a>}
                  {r.note && <div className="mt-0.5 truncate text-[11px] text-gray-400">{r.note}</div>}
                  <div className="mt-0.5 text-[10px] text-gray-300">{new Date(r.createdAt).toLocaleString('ko-KR')}</div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => copy(requestText(r), r.id)} className="rounded-md border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50">{copied === r.id ? '복사됨 ✓' : '복사'}</button>
                  <button onClick={() => remove(r.id)} className="rounded-md px-2 py-1 text-[11px] font-medium text-gray-300 hover:text-red-600">삭제</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
