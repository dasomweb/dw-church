/**
 * Pull the human-readable message out of an adapter error. FetchAdapter throws
 * DWChurchApiError whose `.message` is just "… 409: Conflict" and whose `.body`
 * holds the server JSON `{ error: { code, message } }` — this returns that inner
 * Korean message so toasts show what actually went wrong (e.g. 코드 사용 중 안내).
 */
export function serverErr(e: unknown, fallback = '요청을 처리하지 못했습니다.'): string {
  const anyE = e as { body?: string; message?: string } | null;
  if (anyE?.body) {
    try {
      const parsed = JSON.parse(anyE.body) as { error?: { message?: string } };
      if (parsed?.error?.message) return parsed.error.message;
    } catch { /* body wasn't JSON */ }
  }
  return anyE?.message || fallback;
}
