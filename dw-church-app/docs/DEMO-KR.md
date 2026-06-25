# 데모(체험) 신청 · 이메일 발송(자동화) · 관리 기능 정리

잠재 교회가 **실제 운영 화면을 직접 체험**할 수 있게 하는 기능입니다. 별도의 일회용 사이트를 만들지 않고, **하나의 데모 테넌트** 위에서 체험하게 하고 **매일 밤 초기 상태로 자동 리셋**합니다.

> 코드 위치 요약
> - 체험 신청 CRM: `apps/server/src/modules/demo-requests/` · 슈퍼어드민 `super-admin/tabs/DemoTab.tsx`
> - 데모 테넌트 수명주기(스냅샷/리셋): `apps/server/src/modules/demo-tenant/` (`service.ts`, `demo-login.ts`, `scheduler.ts`, `snapshot-staleness.ts`, `edit-tracker.ts`)
> - 이메일: `apps/server/src/config/email.ts` · `modules/email-templates/service.ts`

핵심 상수: **데모 테넌트 slug = `dasom`** (env `DEMO_SLUG`로 override 가능). 파괴적 리셋이 절대 다른 테넌트로 가지 않도록 slug는 하드코딩되어 있습니다.

---

## 1. 체험 신청 → 자동 접속 발급 → 이메일 (자동화)

```
[체험 신청 폼]  →  POST /api/v1/demo-requests   (PUBLIC)
      │
      ├─ public.demo_requests 에 신청 기록 (status = new)  ← CRM
      │
      └─ sendDemoAccess()  (best-effort, 실패해도 신청 기록은 남음)
            ├─ issueDemoLogin(email):
            │     · 데모 테넌트(dasom)에 24시간짜리 관리자 계정 생성
            │     · 아이디 = 신청자 이메일, 비밀번호 = 1회성 랜덤
            │     · 역할 = DEMO_ROLE, 24h 후 만료(passwordExpiresAt)
            │     · 안전장치: 이메일이 "실제 계정"이면 덮어쓰지 않고 거부
            └─ 접속 정보(로그인 URL·아이디·비밀번호) 이메일 발송
```

- **자동화 포인트:** 신청 제출만으로 접속 계정 생성 + 이메일 발송이 끝납니다(운영자 개입 불필요).
- **재발송:** 운영자가 슈퍼어드민에서 특정 신청 건의 접속 정보를 다시 발급/이메일 보낼 수 있음(`POST /api/v1/admin/demo-requests/:id/access` 류).
- **만료 정리:** `cleanupExpiredDemoLogins()`가 만료된 24h 데모 계정을 제거 — 매일 리셋과 함께 blast radius(영향 범위) 0.

### 공유 데모 계정(선택)
- `public.demo_config`(싱글톤 id=1): 모두가 쓰는 **공유 접속 정보**(login_url / login_email / login_password / message_body). 개별 발급 대신 "공유 체험 계정"을 안내할 때 사용.

---

## 2. 데모 테넌트 수명주기 (골든 스냅샷 + 야간 리셋)

체험자들이 콘텐츠를 바꿔도 매일 밤 깨끗한 상태로 되돌립니다.

- **골든 스냅샷 캡처** — `captureSnapshot(dasom)`: 현재 콘텐츠를 `tenant_dasom_snapshot` 스키마로 복제(`CREATE TABLE AS`, 데이터+타입 그대로). 메타는 `public.demo_snapshots`에 기록.
- **복원(리셋)** — `restoreSnapshot(dasom)`: 라이브 테넌트의 모든 테이블을 `TRUNCATE ... CASCADE` 후 스냅샷에서 재복사. FK는 트랜잭션 내 일시 비활성(자동 복구). 스냅샷 이후 부팅 ALTER로 추가된 컬럼도 안전 처리.
- **야간 자동 리셋** — `scheduler.ts`의 `startDemoResetScheduler()`가 **매일 03:00 America/New_York(미 동부)** 에 복원 실행. in-process 타이머(03:00–03:04 윈도, ET 날짜 가드로 하루 1회). `index.ts` 부팅 시 등록.
- **스냅샷 신선도** — `snapshot-staleness.ts`: 스키마 구조가 바뀌어 스냅샷이 오래됐는지 검사(오래되면 새 스냅샷 권장).
- **편집 추적** — `edit-tracker.ts`: 체험 중 어떤 편집이 있었는지 추적.

> 운영 주의: 파괴적 로직(복원)은 반드시 데모 slug에만 동작. 절대 다른 테넌트에 실행 금지(데이터 유실 위험).

---

## 3. 관리 기능 (슈퍼어드민 "데모 체험" 탭 — DemoTab)

- **체험 신청 CRM:** `public.demo_requests` 목록/상태(new 등)/메모 관리, 신규 건수 배지(`countNewDemoRequests`).
- **접속 정보 재발급:** 신청 건별 24h 데모 로그인 재발급 + 이메일 재발송.
- **공유 데모 계정 설정:** `demo_config`(로그인 URL/계정/비번/안내문) 편집.
- **스냅샷/리셋 제어:** 골든 스냅샷 캡처, 수동 복원(필요 시).
- **마케팅 발송 대상:** 공지·마케팅(Broadcast)에서 **"데모" 오디언스** = `demo_requests` 이메일 목록으로 일괄 메일 발송 가능(`audienceCounts` / `emailsFromTable('public.demo_requests')`).

---

## 4. 관련 데이터(공개 스키마)
- `public.demo_requests` — 체험 신청(CRM).
- `public.demo_config` — 공유 데모 접속 설정(싱글톤).
- `public.demo_snapshots` — 스냅샷 메타(테이블 수·시각).
- `tenant_dasom` / `tenant_dasom_snapshot` — 데모 라이브 / 골든 스냅샷 스키마.
- (계정) 데모 로그인은 일반 `users`에 DEMO_ROLE + 24h 만료로 생성.

## 5. 엔드포인트 요약
- `POST /api/v1/demo-requests` — 공개 신청 → 자동 발급 + 이메일.
- `GET /api/v1/admin/demo-requests` — 신청 목록(관리).
- `POST /api/v1/admin/demo-requests/:id/access` — 접속 정보 재발급/재발송.
- `GET/PUT /api/v1/admin/demo-config` — 공유 데모 계정 설정.
- (내부) 야간 스케줄러 — 03:00 ET 자동 복원.
