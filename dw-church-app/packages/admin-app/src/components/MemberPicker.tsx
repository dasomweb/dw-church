import { useMemo, useRef, useState } from 'react';

/**
 * 교인 검색 선택기 — 심방/성례/이동/가족 추가에서 교인을 고를 때 씀. 드롭다운은
 * 인원이 조금만 많아도 불편 + 동명이인 구분 불가라, 이름/전화 검색 + 결과에
 * 구역·직분·새가족 표시로 정확히 고르게 한다. members 는 이미 로드된 목록을
 * 받아 클라이언트에서 필터(수백 명까지 문제 없음).
 */
export interface PickMember {
  id: string;
  name: string;
  position?: string;
  faithLevel?: string;
  householdRegion?: string;
  regStatus?: string;
  phone?: string;
  photoUrl?: string;
}

export function MemberPicker({
  members, value, onChange, placeholder = '이름 검색으로 교인 선택', autoFocus, disabled,
}: {
  members: PickMember[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const selected = members.find((m) => m.id === value) || null;

  const results = useMemo(() => {
    const s = q.trim();
    const base = s ? members.filter((m) => (m.name || '').includes(s) || (m.phone || '').includes(s)) : members;
    return base.slice(0, 50);
  }, [q, members]);

  const meta = (m: PickMember) => [m.householdRegion, m.position, m.regStatus === 'newcomer' ? '새가족' : ''].filter(Boolean).join(' · ');

  // Selected state — show a chip with 변경 button, no dropdown.
  if (selected && !open) {
    return (
      <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white">
        {selected.photoUrl ? <img src={selected.photoUrl} alt="" className="w-6 h-6 rounded-full object-cover" /> :
          <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[11px] text-gray-400">{(selected.name || '·')[0]}</span>}
        <span className="text-sm font-medium text-gray-800">{selected.name}</span>
        {meta(selected) && <span className="text-xs text-gray-400">{meta(selected)}</span>}
        {!disabled && <button type="button" onClick={() => { setOpen(true); setQ(''); }} className="ml-auto text-xs text-blue-600 hover:text-blue-700">변경</button>}
      </div>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        autoFocus={autoFocus}
        disabled={disabled}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        placeholder={placeholder}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1 max-h-72 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          {results.length === 0 ? (
            <div className="px-3 py-4 text-sm text-gray-400 text-center">검색 결과가 없습니다.</div>
          ) : results.map((m) => (
            <button
              key={m.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onChange(m.id); setOpen(false); setQ(''); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-blue-50 border-b border-gray-50 last:border-b-0"
            >
              {m.photoUrl ? <img src={m.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" /> :
                <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-400 shrink-0">{(m.name || '·')[0]}</span>}
              <span className="min-w-0">
                <span className="flex items-center gap-1.5">
                  <b className="text-sm text-gray-800">{m.name}</b>
                  {m.regStatus === 'newcomer' && <span className="text-[10px] font-medium bg-amber-50 text-amber-700 rounded-full px-1.5 py-0.5">새가족</span>}
                </span>
                <span className="block text-xs text-gray-400 truncate">{[m.householdRegion, m.position, m.phone].filter(Boolean).join(' · ') || '—'}</span>
              </span>
            </button>
          ))}
          {q.trim() === '' && members.length > 50 && (
            <div className="px-3 py-2 text-[11px] text-gray-400 text-center border-t border-gray-100">이름을 입력해 검색하세요 (상위 50명 표시)</div>
          )}
        </div>
      )}
    </div>
  );
}
