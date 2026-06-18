/**
 * Modern, simple, clean email layout shared by all DB-managed templates +
 * broadcasts. White card, subtle border (no heavy gradient/shadow), brand
 * wordmark header, generous Korean-friendly typography, minimal footer.
 */
const FONT = "'Pretendard','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',-apple-system,sans-serif";
const BRAND = '#2563eb';
const INK = '#111827';
const SUB = '#4b5563';
const MUTED = '#9ca3af';
const BORDER = '#e9edf3';

/** A clean primary button (use inside template/broadcast bodies). */
export function emailButton(text: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:28px 0"><tr><td align="center">
    <a href="${url}" style="display:inline-block;padding:14px 34px;background:${BRAND};color:#fff;font-size:15px;font-weight:700;font-family:${FONT};text-decoration:none;border-radius:10px">${text}</a>
  </td></tr></table>`;
}

/**
 * Wrap inner body HTML in the clean shell. `inner` may contain headings,
 * paragraphs, buttons (from emailButton), etc. Keep the inner simple — the
 * shell provides the frame.
 */
export function wrapEmail(inner: string, opts?: { footerNote?: string }): string {
  const footerNote = opts?.footerNote ?? '본 메일은 TRUE LIGHT에서 발송되었습니다.';
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6fa;font-family:${FONT};-webkit-font-smoothing:antialiased;word-break:keep-all">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fa"><tr><td align="center" style="padding:40px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border:1px solid ${BORDER};border-radius:16px;overflow:hidden">
      <tr><td style="padding:28px 40px 0">
        <span style="font-size:18px;font-weight:800;color:${INK};font-family:${FONT};letter-spacing:-0.4px">TRUE <span style="color:${BRAND}">LIGHT</span></span>
      </td></tr>
      <tr><td style="padding:24px 40px 36px;font-size:16px;color:${SUB};line-height:1.8">
        ${inner}
      </td></tr>
      <tr><td style="padding:18px 40px 26px;border-top:1px solid ${BORDER}">
        <p style="margin:0;font-size:12px;color:${MUTED};line-height:1.7;font-family:${FONT}">
          ${footerNote}<br>
          <a href="https://truelight.app" style="color:${BRAND};text-decoration:none">truelight.app</a> · info@dasomweb.com
        </p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

/** Heading helper for template/broadcast bodies. */
export function emailHeading(text: string): string {
  return `<h1 style="margin:0 0 14px;font-size:22px;font-weight:800;color:${INK};font-family:${FONT};letter-spacing:-0.6px;line-height:1.4">${text}</h1>`;
}
