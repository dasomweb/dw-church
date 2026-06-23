'use client';

import { useRef, useState, useEffect } from 'react';

/**
 * Clickwrap consent gate. The applicant must OPEN this, SCROLL the document to
 * the end, and then explicitly check agreement before they can continue —
 * stronger evidence of informed consent. Checking = binding agreement; a false
 * representation may result in cancellation (stated in the document + Terms).
 */
const FAITH = [
  '성부·성자·성령, 삼위로 영원히 존재하시는 한 분 하나님(삼위일체)',
  '주 예수 그리스도의 완전한 신성과 인성, 동정녀 탄생, 대속의 죽음과 육체적 부활을 믿으며, 그분 외의 다른 "그리스도", 재림주, 메시아를 인정하지 않음',
  '오직 은혜와 오직 믿음으로 받는 구원',
  '구약과 신약 66권을 하나님의 완전하고 권위 있는 말씀이자 최종 권위로 받아들이며, 어떠한 새 계시나 추가 경전도 인정하지 않음',
  '예수 그리스도의 인격적이고 육체적이며 가시적인 재림',
];

export function TermsConsentModal({
  open,
  onClose,
  onAgree,
}: {
  open: boolean;
  onClose: () => void;
  onAgree: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [checked, setChecked] = useState(false);

  // Reset each time it opens; if the document fits without scrolling, unlock.
  useEffect(() => {
    if (!open) return;
    setReachedEnd(false);
    setChecked(false);
    const el = scrollRef.current;
    if (el && el.scrollHeight <= el.clientHeight + 8) setReachedEnd(true);
  }, [open]);

  if (!open) return null;

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setReachedEnd(true);
  };

  const canAgree = reachedEnd && checked;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">이용약관 및 신앙고백 동의</h2>
          <button onClick={onClose} className="text-2xl leading-none text-gray-400 hover:text-gray-600">&times;</button>
        </div>

        <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-gray-700">
          <p className="mb-4 text-gray-500">아래 내용을 <strong>끝까지 읽어 주세요.</strong> 끝까지 스크롤해야 동의 버튼이 활성화됩니다.</p>

          <h3 className="mb-2 font-bold text-gray-900">1. 신앙고백 (Statement of Faith)</h3>
          <p className="mb-2">본 서비스는 역사적 정통 기독교 신앙을 고백하는 교회를 위한 것입니다. 장로교·침례교·감리교·성결교·오순절 등 <strong>교단과 전통을 막론하고</strong>, 아래의 핵심 진리를 믿고 고백하는 교회라면 신청할 수 있습니다. (특정 신경(信經)에 대한 형식적 가입 여부가 아니라, 아래 신앙의 내용에 동의하는지를 기준으로 합니다.) 구체적으로:</p>
          <ul className="mb-5 list-disc space-y-1.5 pl-5">
            {FAITH.map((f, i) => <li key={i}>{f}</li>)}
          </ul>

          <h3 className="mb-2 font-bold text-gray-900">2. 자격 및 동의</h3>
          <p className="mb-2">인정 교단 소속 교회는 물론, 위 신앙고백에 동의하는 무교단·독립교회도 신청할 수 있습니다. 교회 홈페이지를 제작·호스팅하는 일은 당사의 종교적 사명 수행으로서의 표현 활동이므로, 당사는 본 신앙고백에 부합하는 교회를 대상으로 서비스합니다.</p>
          <p className="mb-2">아래 <strong>동의 체크는 법적 구속력 있는 동의</strong>를 의미합니다. 귀하는 본 신앙고백과 <a href="/terms" target="_blank" rel="noreferrer" className="text-blue-600 underline">이용약관 전문 및 개인정보처리방침</a>을 끝까지 읽고 그 전부에 동의하는 것으로 봅니다.</p>

          <h3 className="mb-2 font-bold text-gray-900">3. 허위 진술 시 취소·해지</h3>
          <p className="mb-2">귀하가 기재·진술한 내용(신앙고백 동의 및 제공한 정보 포함)이 <strong>사실과 다르거나 부정확함이 확인될 경우, 당사는 즉시 서비스를 해지할 수 있으며, 이 경우 기 지불된 요금은 일체 환불되지 않습니다.</strong></p>
          <p className="mb-2">또한 귀하는 귀 교회를 대표하여 본 동의를 할 권한이 있음을 진술합니다.</p>

          <p className="mt-6 rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-400">전체 이용약관·개인정보처리방침은 truelight.app/terms, truelight.app/privacy 에서 확인할 수 있습니다. (한글 원본이 정본)</p>
        </div>

        <div className="border-t border-gray-100 px-6 py-4">
          {!reachedEnd && (
            <p className="mb-2 text-center text-xs text-amber-600">↓ 끝까지 스크롤하면 동의할 수 있습니다.</p>
          )}
          <label className={`mb-3 flex items-start gap-2 text-sm ${reachedEnd ? 'text-gray-800' : 'text-gray-400'}`}>
            <input
              type="checkbox"
              checked={checked}
              disabled={!reachedEnd}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 flex-shrink-0"
            />
            <span>본인은 위 이용약관과 신앙고백을 끝까지 읽었으며, 이에 동의합니다. 체크는 법적 동의를 의미하며, 기재한 내용이 사실과 다를 경우 서비스가 취소·해지될 수 있음에 동의합니다.</span>
          </label>
          <button
            type="button"
            disabled={!canAgree}
            onClick={() => { onAgree(); onClose(); }}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            동의하고 계속
          </button>
        </div>
      </div>
    </div>
  );
}
