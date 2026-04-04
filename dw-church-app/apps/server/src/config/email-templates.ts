/**
 * Email templates for TRUE LIGHT platform.
 * Optimized for Korean typography:
 *   - Larger font sizes (Korean glyphs appear smaller than Latin)
 *   - Generous line-height (1.8+) for readability
 *   - Relaxed letter-spacing to avoid cramped feel
 *   - Korean-first font stack
 */

const BRAND_COLOR = '#2563eb';
const BRAND_DARK = '#1e40af';
const TEXT_PRIMARY = '#1f2937';
const TEXT_SECONDARY = '#4b5563';
const TEXT_MUTED = '#9ca3af';
const BG_LIGHT = '#f8fafc';
const BG_WHITE = '#ffffff';
const BORDER = '#e5e7eb';

// Korean-first font stack
const FONT_STACK = "'Pretendard','Apple SD Gothic Neo','Malgun Gothic','맑은 고딕','Noto Sans KR',sans-serif";

function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:${BG_LIGHT};font-family:${FONT_STACK};-webkit-font-smoothing:antialiased;word-break:keep-all">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG_LIGHT}">
    <tr>
      <td align="center" style="padding:48px 20px">

        <!-- Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:${BG_WHITE};border-radius:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);overflow:hidden">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND_COLOR} 0%,${BRAND_DARK} 100%);padding:36px 40px;text-align:center">
              <span style="color:rgba(255,255,255,0.95);font-size:22px;font-weight:800;font-family:${FONT_STACK};letter-spacing:-0.5px">TRUE LIGHT</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:44px 40px 36px">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 28px;border-top:1px solid ${BORDER};text-align:center">
              <p style="margin:0;font-size:13px;color:${TEXT_MUTED};line-height:1.8;font-family:${FONT_STACK}">
                TRUE LIGHT · 교회 웹사이트 플랫폼<br>
                <a href="https://truelight.app" style="color:${BRAND_COLOR};text-decoration:none;font-weight:500">truelight.app</a>
              </p>
            </td>
          </tr>
        </table>

        <!-- Sub-footer -->
        <p style="margin:20px 0 0;font-size:12px;color:${TEXT_MUTED};text-align:center;font-family:${FONT_STACK};line-height:1.7">
          본 메일은 TRUE LIGHT 플랫폼에서 자동 발송되었습니다.
        </p>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

function button(text: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:32px 0">
    <tr>
      <td align="center">
        <a href="${url}" style="display:inline-block;padding:16px 40px;background:${BRAND_COLOR};color:#ffffff;font-size:16px;font-weight:700;font-family:${FONT_STACK};text-decoration:none;border-radius:12px;letter-spacing:-0.2px">${text}</a>
      </td>
    </tr>
  </table>`;
}

function infoBox(text: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0">
    <tr>
      <td style="background:${BG_LIGHT};border-radius:12px;padding:18px 22px;border-left:3px solid ${BRAND_COLOR}">
        <p style="margin:0;font-size:14px;color:${TEXT_SECONDARY};line-height:1.8;font-family:${FONT_STACK}">${text}</p>
      </td>
    </tr>
  </table>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 12px;font-size:26px;font-weight:800;color:${TEXT_PRIMARY};font-family:${FONT_STACK};letter-spacing:-0.8px;line-height:1.4">${text}</h1>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 20px;font-size:16px;color:${TEXT_SECONDARY};line-height:1.85;font-family:${FONT_STACK};letter-spacing:-0.1px">${text}</p>`;
}

function smallText(text: string): string {
  return `<p style="margin:20px 0 0;font-size:13px;color:${TEXT_MUTED};line-height:1.8;font-family:${FONT_STACK};word-break:break-all">${text}</p>`;
}

// ─── Templates ──────────────────────────────────────────

export function welcomeEmail(churchName: string): { subject: string; html: string } {
  return {
    subject: `${churchName} 등록을 환영합니다 — TRUE LIGHT`,
    html: layout(`
      ${heading('환영합니다!')}
      ${paragraph(`<strong style="color:${TEXT_PRIMARY}">${churchName}</strong>이(가) TRUE LIGHT 플랫폼에 성공적으로 등록되었습니다.`)}

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG_LIGHT};border-radius:14px;margin:24px 0">
        <tr>
          <td style="padding:24px 28px">
            <p style="margin:0 0 16px;font-size:15px;font-weight:700;color:${TEXT_PRIMARY};font-family:${FONT_STACK}">이런 것들을 할 수 있어요</p>
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr><td style="padding:6px 0;font-size:15px;color:${TEXT_SECONDARY};font-family:${FONT_STACK};line-height:1.6">✓&nbsp;&nbsp;교회 정보 및 테마 설정</td></tr>
              <tr><td style="padding:6px 0;font-size:15px;color:${TEXT_SECONDARY};font-family:${FONT_STACK};line-height:1.6">✓&nbsp;&nbsp;설교 영상 업로드</td></tr>
              <tr><td style="padding:6px 0;font-size:15px;color:${TEXT_SECONDARY};font-family:${FONT_STACK};line-height:1.6">✓&nbsp;&nbsp;주보 등록 및 PDF 관리</td></tr>
              <tr><td style="padding:6px 0;font-size:15px;color:${TEXT_SECONDARY};font-family:${FONT_STACK};line-height:1.6">✓&nbsp;&nbsp;교역자 소개 페이지</td></tr>
              <tr><td style="padding:6px 0;font-size:15px;color:${TEXT_SECONDARY};font-family:${FONT_STACK};line-height:1.6">✓&nbsp;&nbsp;교회 앨범 및 행사 관리</td></tr>
            </table>
          </td>
        </tr>
      </table>

      ${button('관리자 페이지 시작하기', 'https://admin.truelight.app')}

      ${infoBox('도움이 필요하시면 언제든 문의해 주세요.')}
    `),
  };
}

export function passwordResetEmail(resetUrl: string): { subject: string; html: string } {
  return {
    subject: '비밀번호 재설정 안내 — TRUE LIGHT',
    html: layout(`
      ${heading('비밀번호 재설정')}
      ${paragraph('비밀번호 재설정 요청이 접수되었습니다.<br>아래 버튼을 눌러 새로운 비밀번호를 설정해 주세요.')}

      ${button('새 비밀번호 설정하기', resetUrl)}

      ${infoBox('이 링크는 <strong>1시간</strong> 동안만 유효합니다.<br>본인이 요청하지 않으셨다면 이 메일을 무시하셔도 됩니다.')}

      ${smallText(`버튼이 동작하지 않는 경우, 아래 주소를 브라우저에 직접 입력해 주세요.<br><a href="${resetUrl}" style="color:${BRAND_COLOR};text-decoration:none">${resetUrl}</a>`)}
    `),
  };
}

export function inviteEmail(churchName: string, inviteUrl: string): { subject: string; html: string } {
  return {
    subject: `${churchName} 관리자 초대 — TRUE LIGHT`,
    html: layout(`
      ${heading('관리자로 초대되었습니다')}
      ${paragraph(`<strong style="color:${TEXT_PRIMARY}">${churchName}</strong>에서 관리자로 초대해 주셨습니다.<br>아래 버튼을 눌러 초대를 수락하고 비밀번호를 설정해 주세요.`)}

      ${button('초대 수락하기', inviteUrl)}

      ${infoBox('이 초대 링크는 <strong>72시간</strong> 동안 유효합니다.')}

      ${smallText(`버튼이 동작하지 않는 경우, 아래 주소를 브라우저에 직접 입력해 주세요.<br><a href="${inviteUrl}" style="color:${BRAND_COLOR};text-decoration:none">${inviteUrl}</a>`)}
    `),
  };
}
