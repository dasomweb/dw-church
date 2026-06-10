/**
 * normalize-date — coerce the many date shapes a Korean church site emits
 * into a canonical `YYYY-MM-DD` (or null when nothing date-like is present).
 *
 * Why this exists: the appliers cast the source date with `$n::date` /
 * `$n::timestamptz`. Postgres only accepts a narrow set of literals, so a
 * value like "2024.03.15", "2024년 3월 15일", or "2024/3/5" throws 22007 —
 * and because the applier wraps each INSERT in try/catch, the WHOLE item
 * was being silently dropped, not just its date. Normalizing up-front means
 * the date either lands correctly or degrades to null, never killing the row.
 *
 * Recognized inputs (all optionally surrounded by whitespace / trailing dot):
 *   2024-03-15            ISO date            → 2024-03-15
 *   2024-03-15T09:00:00Z  ISO datetime        → 2024-03-15
 *   2024.03.15 / 2024. 3. 5.   dot-separated   → 2024-03-15 / 2024-03-05
 *   2024/03/15            slash-separated     → 2024-03-15
 *   2024년 3월 15일        Korean             → 2024-03-15
 *   20240315              compact             → 2024-03-15
 * Anything else (relative text like "매주 주일", empty, garbage) → null.
 */

function clamp2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Build YYYY-MM-DD only if the calendar values are sane; else null. */
function build(y: number, m: number, d: number): string | null {
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  if (y < 1900 || y > 2100) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;
  return `${y}-${clamp2(m)}-${clamp2(d)}`;
}

export function normalizeDate(raw?: string | null): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;

  // ISO datetime / date — take the leading date component.
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s]|$)/);
  if (iso) return build(+iso[1]!, +iso[2]!, +iso[3]!);

  // YYYY[./년 ]MM[./월 ]DD — dot, slash, or Korean separators (mixed allowed).
  const ymd = s.match(/(\d{4})\s*[.\/년]\s*(\d{1,2})\s*[.\/월]\s*(\d{1,2})/);
  if (ymd) return build(+ymd[1]!, +ymd[2]!, +ymd[3]!);

  // Compact 8-digit YYYYMMDD.
  const compact = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) return build(+compact[1]!, +compact[2]!, +compact[3]!);

  // Year + month only ("2024년 3월", "2024-03") → first of month, so the item
  // still sorts into the right period instead of vanishing.
  const ym = s.match(/^(\d{4})\s*[.\/년-]\s*(\d{1,2})\s*월?\s*\.?$/);
  if (ym) return build(+ym[1]!, +ym[2]!, 1);

  return null;
}

/**
 * Stable idempotency key for a migrated item. Prefer the real source post URL
 * (so a re-import UPDATEs the same row); when the source gave us none,
 * synthesize a deterministic key from type + title + date so a second run
 * still dedupes instead of inserting a copy.
 *
 * Returns null (→ row inserts with NULL source_url, outside the unique index)
 * unless we have a real URL, OR both a title AND a parseable date. Without a
 * date, a synthetic title-only key would make two distinct same-title items
 * (e.g. weekly "주일예배") collide and clobber each other within one run —
 * worse than a possible duplicate on re-import. So we don't synthesize then.
 */
export function migrationKey(
  type: string,
  sourceUrl: string | null | undefined,
  title: string | null | undefined,
  date: string | null | undefined,
): string | null {
  const real = (sourceUrl ?? '').trim();
  if (real) return real;
  const t = (title ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  const d = normalizeDate(date);
  if (!t || !d) return null; // not enough to key on safely — let it insert
  return `mig:${type}:${t}:${d}`;
}
