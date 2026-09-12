/**
 * ClaudeDesignDialog — per-tenant Claude Design 진입점 (슈퍼어드민 테넌트 드롭다운).
 *
 * ⚠ 정직: Claude Design 임포트는 서버 런타임이 아니라 **개발(Claude Code)이 DesignSync
 * (claude.ai 로그인 에이전트 도구)로 실행**한다 — admin 앱은 Claude Design 에 인증할 수
 * 없다. 그래서 이 화면은 "실행 버튼"이 아니라, 이 테넌트에 어떤 Claude Design 시안을
 * 반영할지 **요청(핸드오프)을 만들어 복사**해 개발에 넘기는 진입점이다.
 * (마이그레이션=서버 크롤 / AI빌더=생성 / Claude Design=완성 시안 결정적 재현 — 별개 기능.)
 * 절차·매핑 규칙: scripts/design-importer/CLAUDE-DESIGN-IMPORT-GUIDE.md.
 */
import { useEffect, useState } from 'react';
import { useToast } from '../index';

interface Props {
  tenant: { id: string; slug: string; name: string };
  open: boolean;
  onClose: () => void;
}

type Mode = '전면개편' | '부분추가';

function handoffText(projectLink: string, file: string, slug: string, mode: Mode): string {
  const f = file.trim() || '<구현할 .dc.html>';
  return [
    'Use the claude_design MCP (https://api.anthropic.com/v1/design/mcp, auth via /design-login) to import this project:',
    projectLink.trim() || '<claude.ai/design/p/... 링크>',
    '',
    'Focus on these files (the whole project is readable):',
    `- \`${f}\``,
    'Also read the design system + helpers the selection imports:',
    '- `_ds/<design-system>/_tokens.css`',
    '- `_ds/<design-system>/_ds_bundle.js`',
    '- `image-slot.js`',
    '- `support.js`',
    '',
    `Implement: \`${f}\``,
    `→ tenant: ${slug}`,
    `→ mode: ${mode}`,
  ].join('\n');
}

export function ClaudeDesignDialog({ tenant, open, onClose }: Props) {
  const { showToast } = useToast();
  const [link, setLink] = useState('');
  const [file, setFile] = useState('');
  const [mode, setMode] = useState<Mode>('전면개편');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLink(''); setFile(''); setMode('전면개편'); setCopied(false);
  }, [open, tenant.id]);

  if (!open) return null;

  const text = handoffText(link, file, tenant.slug, mode);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1600); showToast('success', '요청을 복사했습니다 — 개발(Claude Code)에 붙여넣으세요.'); }
    catch { showToast('error', '복사 실패 — 아래 텍스트를 직접 선택해 복사하세요.'); }
  };
  const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500';

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
          Claude Design 인증 불가). 여기서 <b>요청을 만들어 복사</b>해 개발에 넘기면, 개발이
          시안을 전체 정독 → 매핑표 확인 → 테마+페이지로 반영합니다. (마이그레이션·AI빌더와 별개)
        </div>

        <div className="space-y-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Claude Design 프로젝트 링크</label>
            <input className={inputCls} placeholder="https://claude.ai/design/p/…?file=…" value={link} onChange={(e) => setLink(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">구현할 파일 (.dc.html)</label>
            <input className={inputCls} placeholder="예: 엠마오교회 리뉴얼.dc.html" value={file} onChange={(e) => setFile(e.target.value)} />
          </div>
          <div>
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
        </div>

        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-700">개발에 넘길 요청 (미리보기)</span>
            {link.trim() && <a href={link.trim()} target="_blank" rel="noopener noreferrer" className="text-[11px] font-medium text-blue-600 hover:underline">↗ 프로젝트 열기</a>}
          </div>
          <pre className="max-h-44 overflow-auto whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-3 text-[11px] leading-relaxed text-gray-800">{text}</pre>
        </div>

        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm text-gray-700 hover:bg-gray-50">닫기</button>
          <button onClick={copy} className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">{copied ? '복사됨 ✓' : '요청 복사'}</button>
        </div>
      </div>
    </div>
  );
}
