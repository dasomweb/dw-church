# 온보딩(Onboarding) 기능 정리

True Light(트루라이트)는 **done-for-you(대행 제작)** 모델입니다. 교회가 직접 가입·제작하는 self-serve가 아니라, **신청 → 검토 → 결제 → 자동 프로비저닝 → 초기 콘텐츠 입력 → AI 빌드** 순서로 운영자가 사이트를 만들어 넘깁니다.

> 코드 위치 요약
> - 신청서: `apps/server/src/modules/applications/` · 슈퍼어드민 `super-admin/tabs/ApplicationsTab.tsx`
> - 결제·프로비저닝: `apps/server/src/modules/billing/service.ts` · `apps/server/src/modules/tenants/service.ts`
> - 초기 입력(intake): `apps/server/src/modules/intake/` · 테넌트 `pages/OnboardingPage.tsx`(→ `IntakeWizard`) · 슈퍼어드민 `super-admin/tabs/IntakeTab.tsx`
> - AI 빌드: `apps/server/src/modules/ai/build-pages/`

---

## 1. 전체 플로우

```
[마케팅 /apply 폼]
      │  교회가 신청서 제출 (교회명·연락처·교단·플랜·기존 URL 등 + 신앙고백 동의)
      ▼
public.service_applications   (status = new)
      │  슈퍼어드민 "신청서" 탭에서 검토
      │   · 교단 자동 대조(이단 필터, reference_denominations)
      │   · 상태 변경: new → reviewing → approved
      │   · 결제 링크 발송 (Stripe Checkout)
      ▼
[교회가 결제]  Stripe Checkout
      │  webhook: checkout.session.completed
      ▼
status = paid  →  provisionTenantFromApplication()
      │   · 테넌트 스키마(tenant_{slug}) 생성 + 기본 구조 시드
      │   · 오너 계정 생성(임시 비밀번호 1회 발급)
      │   · Stripe customer/subscription ID 연결
      │   · 환영 이메일(접속 정보) 발송
      ▼
[교회가 /t/{slug}/onboarding 접속]  ← OnboardingPage (풀스크린, IntakeWizard)
      │  초기 콘텐츠 입력: 교회정보·교역자·연혁·목장·홈 블록 문구/사진 등
      ▼
public.site_intake  (status = submitted)
      │  슈퍼어드민 "초기 입력" 탭에서 내용 열람
      │  → AI 빌더 실행으로 페이지 자동 구성
      │  → "완료 표시"(built)
      ▼
status = built   사이트 오픈
```

---

## 2. 단계별 상세

### 2-1. 신청 (Application intake)
- **경로:** 마케팅 사이트 `/apply` → `POST /api/v1/applications` → `public.service_applications`.
- **상태값:** `new · reviewing · approved · paid · converted · rejected`.
- **신앙고백/자격:** 신청 시 신앙고백 동의(약관). 서버가 신청 교단·교회명을 `reference_denominations`와 대조해 `denominationStatus`(recognized/watch/cult) 자동 표기 — 운영자가 최종 판단.
- **관리 화면:** 슈퍼어드민 **신청서(ApplicationsTab)** — 상태 필터, 상세(교단 배지·이단 경보), 결제 링크 발송, 메모.

### 2-2. 결제 (Billing)
- `modules/billing/service.ts` 가 **신청서 기반 Stripe Checkout**(done-for-you 경로)을 생성. 가격은 **상품/가격(Pricing) 탭의 단일 출처**(light/basic/plus/pro 월요금 + 셋업비)에서 가져옴. Stripe 대시보드에 상품을 따로 만들 필요 없음.
- 프로모션 쿠폰(셋업비 할인)이 있으면 적용.

### 2-3. 자동 프로비저닝 (Provisioning)
- Stripe webhook `checkout.session.completed` 수신 시:
  1. 해당 신청서 `status = 'paid'`.
  2. `tenant_slug`가 비어 있으면 `provisionTenantFromApplication(app)` 실행:
     - 테넌트 스키마 `tenant_{slug}` 생성 + 기본 구조(페이지·메뉴·테마·설정) 시드.
     - 오너 계정 생성, **임시 비밀번호 1회 발급**.
     - Stripe customer/subscription ID를 테넌트에 연결(이후 인보이스/구독 webhook이 테넌트를 찾도록).
     - 환영(접속 정보) 이메일 발송.
  - **멱등성:** `tenant_slug`가 이미 있으면 재프로비저닝하지 않음 → webhook 재전송에도 중복 생성 없음.
  - **실패 안전:** 프로비저닝 실패해도 webhook은 200 반환, `status='paid'`로 남겨 운영자가 수동으로 테넌트 생성 가능.

### 2-4. 초기 콘텐츠 입력 (Intake)
- **테넌트 측:** `/t/{slug}/onboarding` 의 **OnboardingPage**(사이드바 없는 풀스크린) → `IntakeWizard` 단계로 콘텐츠 입력.
- **저장 모델:** `public.site_intake` (테넌트당 1행, `data` JSONB = 섹션 id → field 값).
  - `GET /intake` 드래프트 불러오기(이어쓰기), `PUT /intake` 중간 저장, `POST /intake/submit` 제출.
- **슈퍼어드민 측(초기 입력 탭):** `GET /admin/intake` 목록, `GET /admin/intake/:slug` 전체 콘텐츠 열람·복사, `POST /admin/intake/:slug/apply`(설정·교역자·연혁·목장·홈 블록을 사이트에 바로 적용), `POST /admin/intake/:slug/built`(완료 표시).

### 2-5. AI 빌드
- `modules/ai/build-pages/` 파이프라인이 초기 입력 콘텐츠 + 플랜으로 **페이지를 자동 생성**(블록 매핑은 `pattern-map.ts`).
- 생성 후 운영자가 슈퍼어드민 페이지 에디터/테넌트 에디터에서 다듬고 게시.

---

## 3. 운영자 체크리스트
1. 신청서 접수 확인 → 교단/신앙고백 검토 → `approved`.
2. 결제 링크 발송 → 결제 완료 시 테넌트 자동 생성 + 환영 메일.
3. 교회가 초기 입력 제출했는지 "초기 입력" 탭에서 확인.
4. AI 빌드 → 페이지 다듬기 → 게시 → `built` 표시.
5. (선택) 도메인 연결(도메인 관리), 콘텐츠(설교·주보 등) 등록 안내.

## 4. 관련 데이터(공개 스키마)
- `public.service_applications` — 신청서(프로스펙트).
- `public.site_intake` — 초기 입력 콘텐츠(테넌트당 1행).
- `tenant_{slug}` — 결제 완료 시 생성되는 테넌트 스키마.
