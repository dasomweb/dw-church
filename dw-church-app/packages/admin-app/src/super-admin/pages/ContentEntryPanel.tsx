// ContentEntryPanel — the CONTENT-vs-DESIGN separation control in the page
// editor inspector. For the selected Static Block section it lets the
// operator: save the current content as a reusable Content Entry, link an
// existing entry, or unlink. Design (blockStyle/elementStyles/variant) stays
// on the section; only content fields move into the entry.
//
// Changes are applied via onChangeProps (the editor's local-hold handler), so
// they persist on Publish like any other edit.
import { useCallback, useEffect, useState } from 'react';

interface Section {
  id: string;
  blockType: string;
  props: Record<string, unknown>;
}
interface EntryRow { id: string; name: string; type: string }

interface Props {
  baseUrl: string;
  headers: Record<string, string>;
  section: Section;
  onChangeProps: (sectionId: string, next: Record<string, unknown>) => void;
}

// Keys that are DESIGN, not content — never moved into a content entry.
const DESIGN_KEYS = new Set(['blockStyle', 'elementStyles', 'variant', 'contentEntryId', 'children']);

export function ContentEntryPanel({ baseUrl, headers, section, onChangeProps }: Props) {
  const linkedId = section.props.contentEntryId as string | undefined;
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [busy, setBusy] = useState(false);

  const loadEntries = useCallback(async () => {
    try {
      const res = await fetch(`${baseUrl}/api/v1/content-entries?type=${encodeURIComponent(section.blockType)}`, { headers });
      if (!res.ok) return;
      const body = await res.json() as { data: EntryRow[] };
      setEntries(body.data ?? []);
    } catch { /* ignore */ }
  }, [baseUrl, headers, section.blockType]);

  useEffect(() => { void loadEntries(); }, [loadEntries]);

  const linkedName = entries.find((e) => e.id === linkedId)?.name;

  const saveAsEntry = async () => {
    const name = window.prompt('재사용 콘텐츠 이름', (section.props.title as string) || section.blockType);
    if (!name) return;
    setBusy(true);
    try {
      const data = Object.fromEntries(Object.entries(section.props).filter(([k]) => !DESIGN_KEYS.has(k)));
      const res = await fetch(`${baseUrl}/api/v1/content-entries`, {
        method: 'POST', headers, body: JSON.stringify({ type: section.blockType, name, data }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const created = (await res.json() as { data: EntryRow }).data;
      onChangeProps(section.id, { ...section.props, contentEntryId: created.id });
      await loadEntries();
    } catch { /* surfaced by lack of change */ } finally { setBusy(false); }
  };

  const linkEntry = (id: string) => {
    if (!id) return;
    onChangeProps(section.id, { ...section.props, contentEntryId: id });
  };

  const unlink = () => {
    const next = { ...section.props };
    delete next.contentEntryId;
    onChangeProps(section.id, next);
  };

  return (
    <div className="border-b bg-indigo-50/40 px-3 py-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-indigo-700">재사용 콘텐츠</span>
        {linkedId && <span className="text-[10px] text-green-700">● 연결됨</span>}
      </div>
      {linkedId ? (
        <div className="mt-1.5 space-y-1.5">
          <div className="text-[11px] text-gray-600">
            이 블록은 콘텐츠 항목 <strong>{linkedName ?? linkedId.slice(0, 8)}</strong> 을(를) 표시합니다.
            내용은 항목에서 관리되고, 이 블록은 디자인만 담당합니다.
          </div>
          <button type="button" onClick={unlink}
            className="rounded border border-gray-300 px-2 py-1 text-[11px] text-gray-700 hover:bg-white">연결 해제</button>
        </div>
      ) : (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={saveAsEntry} disabled={busy}
            className="rounded bg-indigo-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-indigo-500 disabled:opacity-50">
            {busy ? '저장 중…' : '현재 내용을 항목으로 저장'}
          </button>
          {entries.length > 0 && (
            <select
              defaultValue=""
              onChange={(e) => linkEntry(e.target.value)}
              className="rounded border border-gray-300 px-1.5 py-1 text-[11px] text-gray-700"
            >
              <option value="" disabled>기존 항목 연결…</option>
              {entries.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          )}
        </div>
      )}
    </div>
  );
}
