/**
 * Email templates for DW Church platform.
 * All templates use inline styles for maximum email client compatibility.
 */

const BRAND_COLOR = '#2563eb';
const BRAND_DARK = '#1e40af';
const TEXT_PRIMARY = '#111827';
const TEXT_SECONDARY = '#4b5563';
const TEXT_MUTED = '#9ca3af';
const BG_LIGHT = '#f9fafb';
const BORDER = '#e5e7eb';

function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:${BG_LIGHT};font-family:'Apple SD Gothic Neo','Malgun Gothic','맑은 고딕',sans-serif;-webkit-font-smoothing:antialiased">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG_LIGHT}">
    <tr>
      <td align="center" style="padding:40px 20px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);overflow:hidden">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND_COLOR},${BRAND_DARK});padding:32px 40px;text-align:center">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto">
                <tr>
                  <td style="padding-right:10px;vertical-align:middle">
                    <div style="width:36px;height:36px;background:rgba(255,255,255,0.2);border-radius:10px;text-align:center;line-height:36px;font-size:18px;color:#fff;font-weight:bold">✦</div>
                  </td>
                  <td style="vertical-align:middle">
                    <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px">DW Church</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:40px">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid ${BORDER};text-align:center">
              <p style="margin:0;font-size:12px;color:${TEXT_MUTED};line-height:1.6">
                DW Church — 교회 웹사이트 플랫폼<br>
                <a href="https://truelight.app" style="color:${TEXT_MUTED};text-decoration:underline">truelight.app</a>
              </p>
            </td>
          </tr>
        </table>
        <!-- Sub-footer -->
        <p style="margin:24px 0 0;font-size:11px;color:${TEXT_MUTED};text-align:center">
          이 메일은 DW Church 플랫폼에서 자동 발송되었습니다.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function button(text: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0">
    <tr>
      <td style="background:${BRAND_COLOR};border-radius:10px">
        <a href="${url}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:-0.2px">${text}</a>
      </td>
    </tr>
  </table>`;
}

function infoBox(text: string): string {
  return `<div style="background:${BG_LIGHT};border-radius:10px;padding:16px 20px;margin:20px 0">
    <p style="margin:0;font-size:13px;color:${TEXT_SECONDARY};line-height:1.6">${text}</p>
  </div>`;
}

// ─── Templates ──────────────────────────────────────────

export function welcomeEmail(churchName: string): { subject: string; html: string } {
  return {
    subject: `${churchName} 등록을 환영합니다 — DW Church`,
    html: layout(`
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${TEXT_PRIMARY};letter-spacing:-0.5px">환영합니다! 🎉</h1>
      <p style="margin:0 0 24px;font-size:15px;color:${TEXT_SECONDARY};line-height:1.7">
        <strong style="color:${TEXT_PRIMARY}">${churchName}</strong>이(가) DW Church 플랫폼에 성공적으로 등록되었습니다.
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG_LIGHT};border-radius:12px;margin-bottom:24px">
        <tr>
          <td style="padding:20px 24px">
            <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:${TEXT_PRIMARY}">시작하기</p>
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr><td style="padding:4px 0;font-size:14px;color:${TEXT_SECONDARY}">✓ 교회 정보 설정</td></tr>
              <tr><td style="padding:4px 0;font-size:14px;color:${TEXT_SECONDARY}">✓ 설교 영상 업로드</td></tr>
              <tr><td style="padding:4px 0;font-size:14px;color:${TEXT_SECONDARY}">✓ 주보 등록</td></tr>
              <tr><td style="padding:4px 0;font-size:14px;color:${TEXT_SECONDARY}">✓ 교역자 소개 작성</td></tr>
            </table>
          </td>
        </tr>
      </table>

      ${button('관리자 페이지 바로가기', 'https://admin.truelight.app')}

      ${infoBox('궁금한 점이 있으시면 언제든 문의해주세요.')}
    `),
  };
}

export function passwordResetEmail(resetUrl: string): { subject: string; html: string } {
  return {
    subject: '비밀번호 재설정 — DW Church',
    html: layout(`
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${TEXT_PRIMARY};letter-spacing:-0.5px">비밀번호 재설정</h1>
      <p style="margin:0 0 4px;font-size:15px;color:${TEXT_SECONDARY};line-height:1.7">
        비밀번호 재설정을 요청하셨습니다.<br>
        아래 버튼을 클릭하여 새 비밀번호를 설정하세요.
      </p>

      ${button('비밀번호 재설정', resetUrl)}

      ${infoBox('⏱ 이 링크는 <strong>1시간</strong> 동안 유효합니다.<br>본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.')}

      <p style="margin:24px 0 0;font-size:12px;color:${TEXT_MUTED};line-height:1.6;word-break:break-all">
        버튼이 작동하지 않으면 아래 링크를 브라우저에 직접 붙여넣으세요:<br>
        <a href="${resetUrl}" style="color:${BRAND_COLOR}">${resetUrl}</a>
      </p>
    `),
  };
}

export function inviteEmail(churchName: string, inviteUrl: string): { subject: string; html: string } {
  return {
    subject: `${churchName} 관리자로 초대되었습니다 — DW Church`,
    html: layout(`
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${TEXT_PRIMARY};letter-spacing:-0.5px">관리자 초대</h1>
      <p style="margin:0 0 24px;font-size:15px;color:${TEXT_SECONDARY};line-height:1.7">
        <strong style="color:${TEXT_PRIMARY}">${churchName}</strong>의 관리자로 초대되었습니다.<br>
        아래 버튼을 클릭하여 초대를 수락하고 비밀번호를 설정하세요.
      </p>

      ${button('초대 수락하기', inviteUrl)}

      ${infoBox('⏱ 이 초대 링크는 <strong>72시간</strong> 동안 유효합니다.')}

      <p style="margin:24px 0 0;font-size:12px;color:${TEXT_MUTED};line-height:1.6;word-break:break-all">
        버튼이 작동하지 않으면 아래 링크를 브라우저에 직접 붙여넣으세요:<br>
        <a href="${inviteUrl}" style="color:${BRAND_COLOR}">${inviteUrl}</a>
      </p>
    `),
  };
}
