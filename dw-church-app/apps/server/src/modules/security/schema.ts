import { z } from 'zod';

/**
 * 보안 이벤트(security_events) — 접근 위반 감사 로그. 크로스 테넌트 접근, 슈퍼어드민
 * 접근 거부, 중앙 로그인(truelight.app/login) 일반회원 거부, switch-tenant 거부 등.
 * 슈퍼어드민만 조회. 클라이언트(권한없음 화면)가 감지한 위반도 여기로 보낸다.
 */
export const SECURITY_EVENT_TYPES = [
  'cross_tenant_access',   // 다른 테넌트 관리 페이지 접근 시도
  'super_admin_denied',    // 슈퍼어드민 접근 시도(비-슈퍼)
  'central_login_denied',  // truelight.app/login 을 일반회원이 접근
  'switch_tenant_denied',  // switch-tenant 를 비-슈퍼가 시도
] as const;

// 클라이언트가 신고하는 위반. actor 정보는 서버가 JWT 에서 채운다(위조 방지).
export const recordSecuritySchema = z.object({
  eventType: z.string().max(40),
  targetTenantSlug: z.string().max(100).optional().nullable(),
  targetPath: z.string().max(500).optional().nullable(),
  detail: z.string().max(1000).optional().nullable(),
});
export type RecordSecurityInput = z.infer<typeof recordSecuritySchema>;
