export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    // Try to parse DWChurchApiError body
    try {
      if ('body' in err && typeof (err as any).body === 'string') {
        const parsed = JSON.parse((err as any).body);
        if (parsed?.error?.message) return parsed.error.message;
        if (parsed?.message) return parsed.message;
      }
    } catch {}

    if ('status' in err) {
      const status = (err as any).status;
      if (status === 401) return '인증이 만료되었습니다. 다시 로그인해주세요.';
      if (status === 403) return '접근 권한이 없습니다.';
      if (status === 404) return '요청한 항목을 찾을 수 없습니다.';
      if (status === 409) return '이미 존재하는 항목입니다.';
    }
    return err.message;
  }
  return '알 수 없는 오류가 발생했습니다.';
}
