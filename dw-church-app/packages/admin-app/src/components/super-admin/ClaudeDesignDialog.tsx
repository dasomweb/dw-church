/**
 * ClaudeDesignDialog — per-tenant Claude Design 진입점 (슈퍼어드민 테넌트 드롭다운).
 *
 * ⚠ 정직: Claude Design 임포트는 서버 런타임이 아니라 **개발(Claude Code)이 DesignSync
 * (claude.ai 로그인 에이전트 도구)로 실행**한다 — admin 앱은 Claude Design 에 인증할 수
 * 없다. 그래서 이 화면은 "실행 버튼"이 아니라, Claude Design 이 준 `claude_design MCP …`
 * 요청 블록을 **붙여넣으면 파싱해서**(프로젝트·파일 확인) + 이 테넌트/모드를 붙여
 * **개발에 넘길 최종 요청을 복사**해 주는 진입점이다.
 * (마이그레이션=서버 크롤 / AI빌더=생성 / Claude Design=완성 시안 결정적 재현 — 별개.)
 * 절차·매핑 규칙: scripts/design-importer/CLAUDE-DESIGN-IMPORT-GUIDE.md.
 */
import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../index';

interface Props {
  tenant: { id: string; slug: string; name: string };
  open: boolean;
  onClose: () => void;
}
type Mode = '전면개편' | '부분추가';

interface Parsed { projectId: string | null; projectLink: string | null; file: string | null }

/** Claude Design 이 준 요청 블록에서 프로젝트/파일을 파싱한다. */
export function parseClaudeDesignRequest(raw: string): Parsed {
  const link = raw.match(/https:\/\/claude\.ai\/design\/p\/[^\s'"`)]+/)?.[0] ?? null;
  const projectId = (link ?? raw).match(/design\/p\/([A-Za-z0-9-]+)/)?.[1] ?? null;
  // file: ?file= 우선 → Implement: `…` → 첫 .dc.html 백틱
  let file: string | null = null;
  const fromParam = (link ?? raw).match(/[?&]file=([^&\s'"`]+)/)?.[1];
  if (fromParam) { try { file = decodeURIComponent(fromParam.replace(/\+/g, ' ')); } catch { file = fromParam; } }
  if (!file) file = raw.match(/Implement:\s*`?([^`\n]+\.dc\.html)`?/i)?.[1]?.trim() ?? null;
  if (!file) file = raw.match(/`([^`]+\.dc\.html)`/)?.[1]?.trim() ?? null;
  return { projectId, projectLink: link, file };
}

export function ClaudeDesignDialog({ tenant, open, onClose }: Props) {
  const { showToast } = useToast();
  const [raw, setRaw] = useState('');
  const [mode, setMode] = useState<Mode>('전면개편');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRaw(''); setMode('전면개편'); setCopied(false);
  }, [open, tenant.id]);

  const parsed = useMemo(() => parseClaudeDesignRequest(raw), [raw]);

  if (!open) return null;

  // 최종 요청 = 붙여넣은 블록 + (없으면) tenant/mode 2줄 추가.
  const finalText = (() => {
    let t = raw.trim();
    if (!t) return '';
    if (!/→\s*tenant\s*:/i.test(t)) t += `\n→ tenant: ${tenant.slug}`;
    else t = t.replace(/→\s*tenant\s*:.*/i, `→ tenant: ${tenant.slug}`);
    if (!/→\s*mode\s*:/i.test(t)) t += `\n→ mode: ${mode}`;
    else t = t.replace(/→\s*mode\s*:.*/i, `→ mode: ${mode}`);
    return t;
  })();

  const copy = async () => {
    if (!finalText) { showToast('error', 'Claude Design 요청 블록을 붙여넣으세요.'); return; }
    try { await navigator.clipboard.writeText(finalText); setCopied(true); setTimeout(() => setCopied(false), 1600); showToast('success', '요청 복사됨 — 개발(Claude Code)에 붙여넣으세요.'); }
    catch { showToast('error', '복사 실패 — 아래 텍스트를 직접 선택해 복사하세요.'); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="mb-3 flex items-start gap-3">
          <div className="text-3xl">🎨</div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">Claude Design 반영</h3>
            <p className="mt-1 text-sm text-gray-600"><span className="font-semibold">{tenant.name}</span> 에 완성된 Claude Design 시안을 반영합니다.</p>
          </div>
        </div>

        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
          Claude Design 임포트는 <b>개발(Claude Code)이 DesignSync로 실행</b>합니다(admin 앱은
          Claude Design 인증 불가). Claude Design 이 준 <b>요청 블록을 그대로 붙여넣으면</b> 파싱해
          이 테넌트로 넘길 최종 요청을 만들어 드립니다.
        </div>

        <label className="mb-1 block text-xs font-medium text-gray-700">Claude Design 요청 붙여넣기</label>
        <textarea
          value={raw} onChange={(e) => setRaw(e.target.value)} autoFocus rows={7}
          placeholder={'Use the claude_design MCP (…) to import this project:\nhttps://claude.ai/design/p/…?file=…\n\nFocus on these files:\n- `…리뉴얼.dc.html`\n\nImplement: `…리뉴얼.dc.html`'}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-[11px] leading-relaxed outline-none focus:border-blue-500"
        />

        {/* 파싱 미리보기 */}
        {raw.trim() && (
          <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[11px] text-gray-700 space-y-0.5">
            <div>프로젝트: {parsed.projectId ? <span className="font-mono text-gray-900">{parsed.projectId}</span> : <span className="text-red-600">감지 실패 — 링크가 있는지 확인</span>}</div>
            <div>파일: {parsed.file ? <span className="font-medium text-gray-900">{parsed.file}</span> : <span className="text-red-600">감지 실패 — Implement 줄 확인</span>}</div>
            <div>테넌트: <span className="font-medium text-gray-900">{tenant.slug}</span> · 모드: <span className="font-medium text-gray-900">{mode}</span></div>
          </div>
        )}

        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-gray-700">반영 방식</label>
          <div className="flex gap-2">
            {(['전면개편', '부분추가'] as Mode[]).map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${mode === m ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                {m}{m === '전면개편' ? ' (백업 후 초기화)' : ''}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm text-gray-700 hover:bg-gray-50">닫기</button>
          <button onClick={copy} disabled={!raw.trim()} className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{copied ? '복사됨 ✓ — 개발 채팅에 붙여넣기' : '요청 복사 (tenant·mode 포함)'}</button>
        </div>
        <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] leading-relaxed text-blue-900">
          <b>다음 단계</b> — 이 다이얼로그는 "실행"이 아니라 <b>요청 만들기</b>입니다(서버는 Claude
          Design 인증 불가). ① 위 <b>요청 복사</b> → ② <b>Claude Code(개발) 채팅에 붙여넣기</b> →
          ③ 개발이 DesignSync로 시안 정독 → 매핑표 확인 → 테마+페이지 반영. 전면개편이면 먼저
          백업 후 초기화합니다.
        </div>
      </div>
    </div>
  );
}
