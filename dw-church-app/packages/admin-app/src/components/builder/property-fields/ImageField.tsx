import { useEffect, useRef, useState } from 'react';

/**
 * Reusable image-picker field for the builder inspector.
 *
 * UI grammar
 *   Empty:  [드롭존]
 *           [📁 라이브러리] [✨ AI ▾] [↑ 업로드]
 *   Filled: thumbnail + on-hover toolbar [라이브러리] [교체] [AI ▾] [제거]
 *
 * The three AI flows (자동 매칭 / 자동 생성 / 직접 프롬프트) collapse
 * into a single "✨ AI ▾" popover so the toolbar stays under four
 * controls and the operator's eye doesn't have to triage five different
 * accent colors. The popover anchors to its trigger button and closes
 * on outside click / Esc / item select.
 *
 *   onUpload          — file → URL
 *   onGenerate        — prompt → URL  (operator types the brief)
 *   onAutoGenerate    — server reads page+section+refs → new URL
 *   onAutoMatch       — server picks best existing media → URL
 *   onPickFromLibrary — open library modal, resolves with URL
 *
 * `variant` feeds the recommended dimensions hint + AI variant default.
 */

const VARIANT_HINTS: Record<string, { label: string; aspectRatio: string }> = {
  hero: { label: '1920×1080 recommended (wide)', aspectRatio: '16/9' },
  section: { label: '1280×800 recommended (4/3)', aspectRatio: '4/3' },
  square: { label: '1024×1024 recommended (square)', aspectRatio: '1/1' },
};

/* ─── YouTube URL helpers (URL paste convenience) ─────────────── */

function youtubeIdFromUrl(url: string): string | null {
  const trimmed = url.trim();
  const m = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i,
  );
  return m && m[1] ? m[1] : null;
}

function youtubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/* ─── Props ───────────────────────────────────────────────────── */

export interface ImageFieldProps {
  value: string;
  onChange: (url: string) => void;
  onUpload?: (file: File, opts?: { kind?: 'background' | 'content' }) => Promise<string>;
  onGenerate?: (
    prompt: string,
    opts: {
      variant: 'hero' | 'section' | 'square';
      referenceUrls?: string[];
      mode?: 'space' | 'product';
    },
  ) => Promise<string>;
  onAutoGenerate?: () => Promise<string>;
  onAutoMatch?: () => Promise<string>;
  onPickFromLibrary?: () => Promise<string | null>;
  defaultMode?: 'space' | 'product';
  variant?: 'hero' | 'section' | 'square';
  aspectRatio?: string;
  helpText?: string;
  initialPrompt?: string;
}

type Busy = 'upload' | 'ai' | 'auto' | 'match' | null;

/* ─── Component ───────────────────────────────────────────────── */

export function ImageField({
  value,
  onChange,
  onUpload,
  onGenerate,
  onAutoGenerate,
  onAutoMatch,
  onPickFromLibrary,
  variant = 'section',
  aspectRatio,
  helpText,
  initialPrompt,
  defaultMode,
}: ImageFieldProps) {
  const [mode, setMode] = useState<'idle' | 'ai-prompt'>('idle');
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState(initialPrompt ?? '');
  const [aiUseReference, setAiUseReference] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const aiAbort = useRef<AbortController | null>(null);

  const hint = VARIANT_HINTS[variant] ?? VARIANT_HINTS.section!;
  const ratio = aspectRatio ?? hint.aspectRatio;

  /* ─── Handlers ─────────────────────────────────────────────── */

  const handleUpload = async (file: File) => {
    if (!onUpload) return;
    setError(null);
    setBusy('upload');
    try {
      const kind = variant === 'hero' ? 'background' : 'content';
      const url = await onUpload(file, { kind });
      onChange(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleAiGenerate = async () => {
    if (!onGenerate || !aiPrompt.trim()) return;
    setError(null);
    setBusy('ai');
    aiAbort.current = new AbortController();
    try {
      const url = await onGenerate(aiPrompt.trim(), {
        variant,
        referenceUrls: aiUseReference && value ? [value] : undefined,
        mode: defaultMode,
      });
      onChange(url);
      setMode('idle');
    } catch (e) {
      if (aiAbort.current?.signal.aborted) return;
      setError(e instanceof Error ? e.message : 'Image generation failed');
    } finally {
      setBusy(null);
      aiAbort.current = null;
    }
  };

  const cancelAi = () => {
    aiAbort.current?.abort();
    setBusy(null);
  };

  const handleAutoGenerate = async () => {
    if (!onAutoGenerate) return;
    setError(null);
    setBusy('auto');
    try {
      const url = await onAutoGenerate();
      onChange(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI auto-generate failed');
    } finally {
      setBusy(null);
    }
  };

  const handleAutoMatch = async () => {
    if (!onAutoMatch) return;
    setError(null);
    setBusy('match');
    try {
      const url = await onAutoMatch();
      onChange(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI auto-match failed');
    } finally {
      setBusy(null);
    }
  };

  const handlePickLibrary = async () => {
    if (!onPickFromLibrary) return;
    const url = await onPickFromLibrary();
    if (url) onChange(url);
  };

  const applyUrl = () => {
    const trimmed = urlDraft.trim();
    if (!trimmed) return;
    setError(null);
    const ytId = youtubeIdFromUrl(trimmed);
    const finalUrl = ytId ? youtubeThumbnailUrl(ytId) : trimmed;
    onChange(finalUrl);
    setUrlDraft('');
  };

  const hasAnyAi = !!(onAutoMatch || onAutoGenerate || onGenerate);

  /* ─── AI inline prompt panel ─────────────────────────────── */
  if (mode === 'ai-prompt') {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-gray-700">
            ✨ Generate from prompt
          </span>
          <button
            type="button"
            onClick={() => setMode('idle')}
            className="text-gray-500 hover:text-gray-700 text-xs"
          >
            Cancel
          </button>
        </div>
        <textarea
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder="e.g. modern office, team working on laptops, natural light"
          rows={3}
          className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none resize-none"
          disabled={busy === 'ai'}
        />
        {value && onGenerate && (
          <label className="flex items-center gap-1.5 text-[11px] text-gray-700">
            <input
              type="checkbox"
              checked={aiUseReference}
              onChange={(e) => setAiUseReference(e.target.checked)}
              disabled={busy === 'ai'}
              className="rounded border-gray-300"
            />
            <span>Use current image as reference</span>
          </label>
        )}
        <button
          type="button"
          onClick={busy === 'ai' ? cancelAi : handleAiGenerate}
          disabled={!aiPrompt.trim() && busy !== 'ai'}
          className={`w-full px-3 py-1.5 rounded text-xs font-semibold transition-colors disabled:opacity-50 ${
            busy === 'ai'
              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              : 'bg-gray-900 text-white hover:bg-gray-800'
          }`}
        >
          {busy === 'ai' ? 'Generating… cancel' : 'Generate'}
        </button>
        {error && (
          <p className="text-[11px] text-red-600 break-words">{error}</p>
        )}
      </div>
    );
  }

  /* ─── Filled state — thumbnail + on-hover toolbar ────────── */
  if (value) {
    return (
      <div className="space-y-2">
        <div
          className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50 group"
          style={{ aspectRatio: ratio }}
        >
          <img
            src={value}
            alt=""
            className="w-full h-full object-cover"
            onError={() => setError('Failed to load image')}
          />
          {busy && <BusyOverlay busy={busy} />}
          <div className={`absolute inset-0 bg-black/0 group-hover:bg-black/45 transition-colors flex items-end justify-center p-2 opacity-0 group-hover:opacity-100 ${busy ? 'invisible' : ''}`}>
            <Toolbar
              onPickFromLibrary={onPickFromLibrary ? handlePickLibrary : undefined}
              onReplace={onUpload ? () => fileRef.current?.click() : undefined}
              hasAnyAi={hasAnyAi}
              onAutoMatch={onAutoMatch ? handleAutoMatch : undefined}
              onAutoGenerate={onAutoGenerate ? handleAutoGenerate : undefined}
              onOpenAiPrompt={onGenerate ? () => setMode('ai-prompt') : undefined}
              onRemove={() => onChange('')}
              compact
            />
          </div>
        </div>
        {onUpload && (
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUpload(f);
            }}
          />
        )}
        <p className="text-[10px] text-gray-400 font-mono break-all">{value}</p>
        {error && <p className="text-[11px] text-red-600">{error}</p>}
      </div>
    );
  }

  /* ─── Empty state — dropzone + 3-button row + URL ────────── */
  return (
    <div className="space-y-2">
      <div className="text-[10px] text-gray-400">{hint.label}</div>
      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
          busy
            ? 'border-blue-400 bg-blue-50/30 pointer-events-none'
            : 'border-gray-300 hover:border-blue-400 cursor-pointer'
        }`}
        style={{ minHeight: 120 }}
        onClick={() => !busy && onUpload && fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (busy) return;
          const f = e.dataTransfer.files?.[0];
          if (f) void handleUpload(f);
        }}
      >
        {busy ? (
          <BusyOverlayInline busy={busy} />
        ) : (
          <>
            <UploadIcon className="w-7 h-7 mx-auto mb-1.5 text-gray-400" />
            <p className="text-xs text-gray-700 font-medium whitespace-nowrap">
              Drop a file or click to upload
            </p>
            {onUpload && (
              <p className="text-[10px] text-gray-400 mt-1">PNG / JPG / WEBP / SVG</p>
            )}
          </>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleUpload(f);
        }}
      />
      <Toolbar
        onPickFromLibrary={onPickFromLibrary ? handlePickLibrary : undefined}
        onReplace={onUpload ? () => fileRef.current?.click() : undefined}
        hasAnyAi={hasAnyAi}
        onAutoMatch={onAutoMatch ? handleAutoMatch : undefined}
        onAutoGenerate={onAutoGenerate ? handleAutoGenerate : undefined}
        onOpenAiPrompt={onGenerate ? () => setMode('ai-prompt') : undefined}
        replaceLabel="Upload"
        showRemove={false}
      />
      <details className="text-[11px] text-gray-500">
        <summary className="cursor-pointer hover:text-gray-700">Paste URL (YouTube links supported)</summary>
        <div className="mt-1.5 space-y-1">
          <div className="flex gap-1.5">
            <input
              type="text"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  applyUrl();
                }
              }}
              placeholder="https://... or https://youtu.be/..."
              className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 focus:border-blue-500 outline-none font-mono"
            />
            <button
              type="button"
              onClick={applyUrl}
              disabled={!urlDraft.trim()}
              className="bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 px-2 py-1 rounded text-xs"
            >
              Apply
            </button>
          </div>
          {youtubeIdFromUrl(urlDraft) && (
            <p className="text-[10px] text-blue-700">
              ▶ YouTube video detected — will be converted to thumbnail image
            </p>
          )}
        </div>
      </details>
      {helpText && <p className="text-[10px] text-gray-400">{helpText}</p>}
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
}

/* ─── Toolbar — 3-button row with AI popover ──────────────── */

function Toolbar({
  onPickFromLibrary,
  onReplace,
  hasAnyAi,
  onAutoMatch,
  onAutoGenerate,
  onOpenAiPrompt,
  onRemove,
  replaceLabel = '교체',
  showRemove = true,
  compact = false,
}: {
  onPickFromLibrary?: () => void;
  onReplace?: () => void;
  hasAnyAi: boolean;
  onAutoMatch?: () => void;
  onAutoGenerate?: () => void;
  onOpenAiPrompt?: () => void;
  onRemove?: () => void;
  replaceLabel?: string;
  showRemove?: boolean;
  compact?: boolean;
}) {
  const [aiOpen, setAiOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aiOpen) return;
    const handleDoc = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setAiOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAiOpen(false);
    };
    window.addEventListener('mousedown', handleDoc);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleDoc);
      window.removeEventListener('keydown', handleKey);
    };
  }, [aiOpen]);

  // Compact mode (hover toolbar over thumbnail) uses smaller buttons +
  // light surfaces over the dark backdrop. Empty-state mode uses the
  // standard primary/secondary palette.
  const baseBtn = compact
    ? 'h-7 px-2.5 text-[11px] font-medium rounded whitespace-nowrap transition-colors'
    : 'flex-1 h-8 px-3 text-xs font-medium rounded whitespace-nowrap transition-colors';

  const surfaceBtn = compact
    ? `${baseBtn} bg-white/95 text-gray-800 hover:bg-white shadow-sm`
    : `${baseBtn} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50`;

  const primaryBtn = compact
    ? `${baseBtn} bg-blue-600 text-white hover:bg-blue-500 shadow-sm`
    : `${baseBtn} bg-blue-600 text-white hover:bg-blue-500`;

  const dangerBtn = compact
    ? 'h-7 w-7 flex items-center justify-center text-[12px] font-medium rounded bg-white/90 text-red-600 hover:bg-white shadow-sm'
    : 'h-8 px-3 text-xs font-medium rounded border border-gray-300 bg-white text-red-600 hover:bg-red-50 whitespace-nowrap';

  return (
    <div ref={wrapperRef} className={`relative flex items-center gap-1.5 ${compact ? '' : 'w-full'}`}>
      {onPickFromLibrary && (
        <button
          type="button"
          onClick={onPickFromLibrary}
          className={primaryBtn}
          title="Pick from Media Library"
        >
          📁 Library
        </button>
      )}
      {onReplace && (
        <button
          type="button"
          onClick={onReplace}
          className={surfaceBtn}
          title="Upload file"
        >
          {compact ? 'Replace' : `↑ ${replaceLabel}`}
        </button>
      )}
      {hasAnyAi && (
        <button
          type="button"
          onClick={() => setAiOpen((v) => !v)}
          aria-expanded={aiOpen}
          className={`${surfaceBtn} flex items-center gap-1`}
          title="AI options"
        >
          <span>✨ AI</span>
          <span className="text-[10px] opacity-70">▾</span>
        </button>
      )}
      {showRemove && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className={dangerBtn}
          title="Remove image"
        >
          {compact ? '×' : 'Remove'}
        </button>
      )}

      {aiOpen && (
        <div
          role="menu"
          className="absolute z-30 right-0 top-full mt-1 min-w-[220px] rounded-lg border border-gray-200 bg-white shadow-xl overflow-hidden"
        >
          {onAutoMatch && (
            <AiMenuItem
              icon="🔍"
              label="Auto-match from Library"
              desc="Pick the best existing photo (5-10s)"
              onClick={() => { setAiOpen(false); onAutoMatch(); }}
            />
          )}
          {onAutoGenerate && (
            <AiMenuItem
              icon="🔮"
              label="Auto-generate from context"
              desc="New image from page · section content (10-30s)"
              onClick={() => { setAiOpen(false); onAutoGenerate(); }}
            />
          )}
          {onOpenAiPrompt && (
            <AiMenuItem
              icon="✏️"
              label="Generate from prompt"
              desc="Write your own prompt"
              onClick={() => { setAiOpen(false); onOpenAiPrompt(); }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function AiMenuItem({
  icon, label, desc, onClick,
}: {
  icon: string;
  label: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="w-full px-3 py-2.5 text-left hover:bg-gray-50 flex items-start gap-2.5 border-b border-gray-100 last:border-b-0"
    >
      <span className="text-base leading-none mt-0.5">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-xs font-semibold text-gray-900">{label}</span>
        <span className="block text-[10px] text-gray-500 mt-0.5">{desc}</span>
      </span>
    </button>
  );
}

/* ─── Busy overlay variants ────────────────────────────────── */

function BusyOverlay({ busy }: { busy: Exclude<Busy, null> }) {
  return (
    <div className="absolute inset-0 bg-white/85 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-10 pointer-events-none">
      <div className="w-8 h-8 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-xs font-semibold text-gray-800">{busyLabel(busy)}</p>
      <p className="text-[10px] text-gray-500">
        {busy === 'upload' ? 'Please wait…' : 'Takes 10–30 seconds'}
      </p>
    </div>
  );
}

function BusyOverlayInline({ busy }: { busy: Exclude<Busy, null> }) {
  return (
    <>
      <div className="w-7 h-7 mx-auto mb-1.5 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-xs font-semibold text-blue-700">{busyLabel(busy)}</p>
      <p className="text-[10px] text-gray-500 mt-1">
        {busy === 'upload' ? 'Please wait…' : 'Takes 10–30 seconds'}
      </p>
    </>
  );
}

function busyLabel(busy: Exclude<Busy, null>): string {
  return busy === 'auto'  ? '🔮 Auto-generating…'
       : busy === 'match' ? '🔍 Matching library…'
       : busy === 'ai'    ? '✨ Generating…'
       :                    '↑ Uploading…';
}

/* ─── Minimal upload icon (replaces 📁 emoji for cleaner look) ── */

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
