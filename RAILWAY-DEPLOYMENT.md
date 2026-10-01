# RAILWAY-DEPLOYMENT.md — Railway 통합 배포 가이드

모든 프론트/백엔드를 **Railway 단일 플랫폼**에서 운영한다. 다른 호스팅 제공자는 쓰지 않는다.

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
├── Service 2: web
│   ├── Source: apps/web/Dockerfile
│   ├── Domain: truelight.app + *.truelight.app (wildcard)
│   └── Tech: Next.js 15 (standalone output)
│
└── Service 3: admin
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

### 3단계: Runtime Env Vars
```
NODE_ENV=production
PORT=3000
API_SERVER_URL=http://api-server.railway.internal:3000
```
⚠️ admin 서비스는 정적 파일 + `/api/*` 프록시를 겸하는 Node 서버입니다.
브라우저는 admin과 같은 origin으로 API를 호출하므로 CORS가 필요 없습니다.
`VITE_API_BASE_URL`은 빌드 시에 필요 없음 — 프런트엔드는 `window.location.origin`을 기본값으로 사용.

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
# CORS_ORIGINS 제거됨 — api-server는 origin: '*' (embed.js용). admin/web은
# same-origin 프록시로 호출하므로 CORS 자체가 불필요.
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

## 왜 Railway 단일 플랫폼인가

| 항목 | 효과 |
|------|------|
| 프론트/백엔드 통합 | 단일 플랫폼 |
| 서버리스 제약 | 없음 (실행시간·용량 제한 없음) |
| Cold start | 없음 (Always on) |
| 미들웨어 | Node.js Full (Edge Runtime 제약 없음) |
| 로그 확인 | 하나의 대시보드 |
| 비용 | 리소스 기반 |
| 에러 디버깅 | Docker 컨테이너 전체 접근 |

---

## 롤백

문제 발생 시 Railway 대시보드에서 **이전 deployment 로 redeploy**(Deployments → 해당 빌드 → Redeploy).
DNS 는 Cloudflare 에서 관리되며 origin 은 Railway 하나뿐이므로, 다른 호스팅으로 전환하는
롤백 경로는 존재하지 않는다.
