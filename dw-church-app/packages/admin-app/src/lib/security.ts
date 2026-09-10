// 접근 위반을 서버 감사 로그(security_events)에 신고한다. actor 정보는 서버가 JWT 에서
// 채우므로 여기서는 유형·대상만 보낸다. 실패는 무시(로깅이 사용자 흐름을 막지 않음).
export type SecurityEventType =
  | 'cross_tenant_access'
  | 'super_admin_denied'
  | 'central_login_denied'
  | 'switch_tenant_denied';

interface Adapter { post: (url: string, body: unknown) => Promise<unknown> }

export async function reportSecurityEvent(
  apiClient: { adapter: Adapter } | null | undefined,
  payload: { eventType: SecurityEventType; targetTenantSlug?: string | null; targetPath?: string | null; detail?: string | null },
): Promise<void> {
  if (!apiClient) return;
  try {
    await apiClient.adapter.post('/api/v1/security-events', payload);
  } catch {
    /* 감사 로깅 실패는 무시 */
  }
}
