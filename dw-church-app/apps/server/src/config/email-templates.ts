export function passwordResetEmail(resetUrl: string): { subject: string; html: string } {
  return {
    subject: '비밀번호 재설정 - DW Church',
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h2 style="color:#2563eb">비밀번호 재설정</h2>
      <p>아래 링크를 클릭하여 비밀번호를 재설정하세요.</p>
      <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0">비밀번호 재설정</a>
      <p style="color:#666;font-size:14px">이 링크는 1시간 동안 유효합니다.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
      <p style="color:#999;font-size:12px">DW Church - 교회 웹사이트 플랫폼</p>
    </div>`,
  };
}

export function inviteEmail(churchName: string, inviteUrl: string): { subject: string; html: string } {
  return {
    subject: `${churchName} 관리자 초대 - DW Church`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h2 style="color:#2563eb">${churchName} 관리자 초대</h2>
      <p>${churchName}의 관리자로 초대되었습니다.</p>
      <a href="${inviteUrl}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0">초대 수락</a>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
      <p style="color:#999;font-size:12px">DW Church - 교회 웹사이트 플랫폼</p>
    </div>`,
  };
}

export function welcomeEmail(churchName: string): { subject: string; html: string } {
  return {
    subject: `${churchName} 가입을 환영합니다 - DW Church`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h2 style="color:#2563eb">환영합니다!</h2>
      <p>${churchName}이(가) DW Church에 등록되었습니다.</p>
      <a href="https://admin.truelight.app" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0">관리자 페이지 바로가기</a>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
      <p style="color:#999;font-size:12px">DW Church - 교회 웹사이트 플랫폼</p>
    </div>`,
  };
}
