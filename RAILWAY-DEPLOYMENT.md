# RAILWAY-DEPLOYMENT.md — Railway 통합 배포 가이드

Vercel → Railway 이전. 모든 프론트/백엔드를 Railway 단일 플랫폼에서 운영.

---

## 아키텍처

```
Railway 프로젝트 (DW Church)
│
├── Service 1: api-server           (기존 유지)
│   ├── Source: apps/server/Dockerfile
│   ├── Domain: api.truelight.app
│   └── Tech: Fastify + Prisma + PostgreSQL
│
├── Service 2: web                  (신규 — Vercel에서 이전)
│   ├── Source: apps/web/Dockerfile
│   ├── Domain: truelight.app + *.truelight.app (wildcard)
│   └── Tech: Next.js 15 (standalone output)
│
└── Service 3: admin                (신규 — Vercel에서 이전)
    ├── Source: packages/admin-app/Dockerfile
    ├── Domain: admin.truelight.app
    └── Tech: Vite SPA + serve (static)

외부 서비스:
├── Cloudflare R2    — 이미지/파일 저장 (변동 없음)
├── Supabase / Railway PostgreSQL — DB
└── Stripe, Gemini   — 결제, AI (변동 없음)
```

---

## 새 Railway 서비스 생성 — Web (Next.js)

### 1단계: Railway 대시보드에서 서비스 추가
```
Railway 프로젝트 → New Service → GitHub Repo → dasomweb/dw-church
```

### 2단계: 서비스 설정
- **Service Name**: `web`
- **Root Directory**: (비워둠 — 모노레포 루트)
- **Dockerfile Path**: `dw-church-app/apps/web/Dockerfile`
- **Build Context**: `dw-church-app/`

### 3단계: 환경변수 등록
```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.truelight.app
RAILWAY_API_URL=https://api.truelight.app
```

### 4단계: Custom Domain 연결
Railway Service → Settings → Networking → Custom Domain
```
truelight.app
*.truelight.app    ← 와일드카드 (테넌트 서브도메인)
```

DNS (truelight.app 도메인 제공자에서):
```
A       @              [Railway IP]
A       *              [Railway IP]
CNAME   www            [Railway domain]
```

Railway는 Let's Encrypt 와일드카드 인증서를 자동 발급합니다.

---

## 새 Railway 서비스 생성 — Admin (Vite SPA)

### 1단계: 서비스 추가
```
Railway 프로젝트 → New Service → GitHub Repo → dasomweb/dw-church
```

### 2단계: 서비스 설정
- **Service Name**: `admin`
- **Dockerfile Path**: `dw-church-app/packages/admin-app/Dockerfile`
- **Build Context**: `dw-church-app/`

### 3단계: Build Args
Railway Service → Settings → Variables → Build Variables
```
VITE_API_BASE_URL=https://api.truelight.app
```
⚠️ Vite는 빌드 타임에 환경변수를 번들에 주입합니다. Runtime 변수 아님.

### 4단계: Runtime Env Vars
```
NODE_ENV=production
PORT=3000
```

### 5단계: Custom Domain
```
admin.truelight.app
```

---

## 기존 API Server 환경변수 (참고용)

이미 Railway에 설정되어 있음:
```
# Database
DATABASE_URL=postgresql://...

# Auth
JWT_SECRET=<32+ chars>
SUPER_ADMIN_EMAILS=info@dasomweb.com,admin@truelight.app

# R2 Storage
R2_ENDPOINT=https://<account>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=dw-church-files
R2_PUBLIC_URL=https://pub-<hash>.r2.dev

# Email (선택)
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=re_...
EMAIL_FROM=True Light <noreply@truelight.app>

# Stripe (선택)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_BASIC=price_...
STRIPE_PRICE_PRO=price_...

# AI (선택)
GEMINI_API_KEY=...

# Monitoring (선택)
SENTRY_DSN=https://...

# Runtime
PORT=3000
NODE_ENV=production
CORS_ORIGINS=https://admin.truelight.app,https://truelight.app
```

---

## 배포 명령어

```bash
# Railway CLI 로그인 (최초 1회)
railway login

# 프로젝트 연결 (dw-church 모노레포 루트에서 실행)
cd dw-church-app
railway link

# 서비스별 배포
railway up --service api-server
railway up --service web
railway up --service admin

# 로그 확인
railway logs --service web
railway logs --service admin

# 환경변수 확인
railway variables --service web
```

---

## Vercel → Railway 마이그레이션 체크리스트

- [x] `apps/web/Dockerfile` 추가 (Next.js standalone)
- [x] `apps/web/next.config.ts`에 `output: 'standalone'` 추가
- [x] `packages/admin-app/Dockerfile` 추가 (Vite + serve)
- [x] `vercel.json` 파일 제거 (apps/server, packages/admin-app)
- [x] `apps/web/middleware.ts`의 custom domain 로직 — Railway에서도 동일 동작
- [ ] Railway 대시보드에서 `web` 서비스 생성 및 환경변수 등록
- [ ] Railway 대시보드에서 `admin` 서비스 생성 및 Build Args 등록
- [ ] DNS 레코드 업데이트 (Vercel → Railway IP)
- [ ] Custom domain 추가 (Railway Networking)
- [ ] SSL 인증서 자동 발급 확인 (Let's Encrypt)
- [ ] 기존 Vercel 프로젝트 삭제 또는 비활성화

---

## 이전의 장점

| 항목 | Vercel (기존) | Railway (이전 후) |
|------|--------------|-------------------|
| 프론트/백엔드 통합 | 분산 운영 | 단일 플랫폼 |
| 서버리스 제약 | 10초/15MB 등 제한 | 제약 없음 |
| Cold start | 있음 (Next.js API) | 없음 (Always on) |
| 미들웨어 | Edge Runtime 제약 | Node.js Full |
| 로그 확인 | 여러 대시보드 | 하나의 대시보드 |
| 비용 | 함수 실행 시간 기반 | 리소스 기반 |
| 에러 디버깅 | 제한적 | Docker 컨테이너 전체 접근 |

---

## 롤백 계획

문제 발생 시 DNS만 Vercel로 되돌리면 즉시 복구:
```
A  @   [Vercel IP]
A  *   [Vercel IP]
```

Vercel 프로젝트를 삭제하기 전까지 안전망으로 유지 권장.
