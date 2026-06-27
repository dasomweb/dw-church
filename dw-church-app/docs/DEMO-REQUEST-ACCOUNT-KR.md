# 데모 체험 — 신청 & 계정 자동 생성

> 잠재 교회가 데모 체험을 **신청**하면, **데모 테넌트(dasom)에 24시간짜리 임시 관리자 계정**이
> 자동 생성되고 접속 정보가 이메일로 발송되는 흐름의 상세 문서.
> 전체 데모 프로그램(스냅샷/야간 리셋/관리 탭)은 [DEMO-KR.md](./DEMO-KR.md) 참고.
>
> 코드 위치
> - 신청 API/CRM: `apps/server/src/modules/demo-requests/` (`routes.ts`, `service.ts`, `schema.ts`)
> - 계정 발급: `apps/server/src/modules/demo-tenant/demo-login.ts` (`issueDemoLogin`, `cleanupExpiredDemoLogins`)
> - 신청 폼(프론트): `apps/web/components/DemoRequestButton.tsx`

핵심 상수: **데모 테넌트 slug = `dasom`**(env `DEMO_SLUG`). 임시 계정 TTL = **24시간**, 역할 = **admin**(데모 테넌트 한정).

---

## 1. 한눈에 보는 흐름

```
[데모 체험 신청] (마케팅 사이트 — 공개, 인증 없음)
   POST /api/v1/demo-requests   { name, email, church, phone?, message? }
        │
        ├─ public.demo_requests 에 신청 기록 (status = new)   ← CRM에 항상 남음
        │
        └─ sendDemoAccess()  (best-effort — 실패해도 신청 기록은 유지)
              ├─ issueDemoLogin(email, name)
              │     · 데모 테넌트(dasom)에 임시 관리자 계정 생성/갱신
              │     · 아이디 = 신청자 이메일
              │     · 비밀번호 = 14자 랜덤(1회성, 응답으로만 노출)
              │     · 만료 = 24시간 (passwordExpiresAt)
              │     · ⚠ 실제 계정이면 거부(덮어쓰지 않음)
              ├─ 접속 안내 이메일 발송 (접속주소·아이디·비밀번호 + 24h 안내)
              └─ 신청 status = sent 로 갱신
```

자동 발송이 실패해도(SMTP 장애, 또는 이메일이 실제 계정인 경우) **신청 기록은 항상 보존**되고, 운영자가 CRM에서 수동 재발송할 수 있다.

---

## 2. 계정 자동 생성 — `issueDemoLogin(email, name)`

`apps/server/src/modules/demo-tenant/demo-login.ts`

| 항목 | 값 / 규칙 |
|---|---|
| 대상 테넌트 | 데모 테넌트 `dasom` (`DEMO_SLUG`) — 없으면 `DEMO_TENANT_MISSING` 500 |
| 아이디 | **신청자 본인 이메일** |
| 비밀번호 | **14자 랜덤** (혼동 문자 0·O·1·l·I 제외 알파벳), bcrypt(rounds 12) 해시 저장, **평문은 발급 응답으로 1회만** 노출 |
| 역할 | `admin` (데모 테넌트 한정 — 기능 자유 탐색용) |
| 만료 | 발급 시점 + **24시간** (`passwordExpiresAt`) |

### 실제 계정 보호 (가장 중요)
이메일이 이미 존재하면, **데모 테넌트의 데모 계정(`tenantSlug === dasom && role !== 'owner'`)일 때만** 재발급(비번/만료/활성/역할 갱신)한다.
그 외(실제 owner, 다른 테넌트 사용자, 슈퍼어드민)면 **`EMAIL_IN_USE`로 거부** — 절대 기존 자격증명을 덮어쓰지 않는다.

### 재발급 vs 신규
- 기존 데모 계정 → `update`(passwordHash·passwordExpiresAt·isActive·role·tenant·name 갱신)
- 없으면 → `create`

---

## 3. 만료 자동 삭제 — `cleanupExpiredDemoLogins()`

"24시간 후 계정이 삭제됩니다"를 **문구 그대로** 만들기 위해, 만료된 데모 계정을 실제로 제거한다.

```
deleteMany WHERE tenantSlug = 'dasom'
              AND role = 'admin'
              AND passwordExpiresAt IS NOT NULL AND passwordExpiresAt < NOW()
```
- 실제 사용자는 `passwordExpiresAt = NULL`이라 절대 매칭 안 됨, owner는 `role='owner'`로 제외 → **실제 계정은 삭제 불가**.
- 데모 테넌트의 야간 리셋과 함께 blast radius(영향 범위) 0.

---

## 4. 접속 안내 이메일

`sendDemoAccess()` → `accessEmailHtml()` (HTML, `sendEmail({ from: 'info' })`)

포함 내용:
- **접속 주소 / 아이디 / 비밀번호** (demo_config의 `login_url` 또는 기본 `https://admin.truelight.app/t/dasom/login`)
- ⏱ **발급 후 24시간 뒤 자동 삭제** 안내 + 만료 시각(미 동부시간)
- 데모 사이트는 **매일 밤 3시(ET) 초기 상태 자동 복원** — 자유롭게 테스트 가능 안내
- (설정 시) **카카오톡 문의** 버튼
- 안내 문구(`message_body`)는 demo_config에서 커스터마이즈, 없으면 기본 문구

---

## 5. 슈퍼어드민 관리 (CRM)

| 메서드/경로 | 권한 | 용도 |
|---|---|---|
| `POST /api/v1/demo-requests` | 공개 | 신청 접수 → 자동 발급+이메일 |
| `GET /api/v1/admin/demo-requests?status=` | 슈퍼어드민 | 신청 목록(상태 필터) |
| `PATCH /api/v1/admin/demo-requests/:id` | 슈퍼어드민 | 상태/메모 수정 |
| `DELETE /api/v1/admin/demo-requests/:id` | 슈퍼어드민 | 신청 삭제 |
| `POST /api/v1/admin/demo-requests/:id/send-access` | 슈퍼어드민 | **접속정보 수동 (재)발송** — 같은 로직, 실패를 화면에 노출 |
| `GET·PUT /api/v1/admin/demo-config` | 슈퍼어드민 | 공유 접속 안내(login_url / message_body 등) |

상태값: `new`(접수) → `sent`(접속정보 발송됨).

> 자동 발송과 수동 발송은 **같은 `sendDemoAccess()`** 를 쓴다. 차이는 에러 처리: 공개 자동 발송은 실패를 삼키고(기록 보존), 수동 발송은 운영자가 누른 것이므로 실패를 그대로 반환한다.

---

## 6. 관련 데이터

- `public.demo_requests` — 신청 기록(CRM). status: new/sent.
- `public.demo_config` — 공유 데모 접속 안내(login_url / message_body 등) 싱글톤.
- 데모 임시 계정 — 일반 `users` 테이블에 `tenantSlug='dasom'`, `role='admin'`, `passwordExpiresAt`(24h)로 생성.

---

## 7. 안전 보장 요약

1. **신청 기록은 항상 보존** — 이메일 발송 실패와 무관(자동은 best-effort).
2. **실제 계정 절대 비침해** — 데모 계정만 재발급, 그 외는 `EMAIL_IN_USE` 거부.
3. **24시간 자동 만료 + 삭제** — `passwordExpiresAt` + `cleanupExpiredDemoLogins`.
4. **데모 테넌트 야간 리셋** — 매일 밤(ET 3시) 초기 상태 복원 → 누가 무엇을 바꿔도 깨끗.
5. **데모 slug 하드코딩(`dasom`)** — 파괴적 동작이 다른 테넌트로 가지 않음.
