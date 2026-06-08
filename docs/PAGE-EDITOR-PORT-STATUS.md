# b2bsmart Page Editor Port — Handoff (updated 2026-06-08)

> 다음 세션은 이 문서부터 읽고 **5단계(LivePreviewPane + 실 MediaPicker/DynamicSource)** 부터 진행.
>
> **상태: 1~4단계 + 5단계(LivePreview·MediaPicker·element-click) 완료 + 프로덕션 배포·검증 완료.**
> 슈퍼어드민 `/super-admin/t/:slug/pages` = 4-pane(페이지|섹션|라이브 프리뷰|인스펙터).
> 풀 ElementInspector(3-tab)가 모든 dw-church 블록 커버, 중앙에 테넌트 공개 페이지 iframe
> 라이브 프리뷰(클릭→인스펙터 포커스 + 선택 윤곽), 라이브러리 버튼은 실 R2 MediaPicker,
> **DynamicSource 콘텐츠 상세 템플릿(설교/칼럼/주보를 빌더로 디자인 + 현재 항목 바인딩) 완료.**
> **b2bsmart 페이지 에디터 패리티 달성.** 남은 것: (옵션) 상세 템플릿 빠른 생성 UI 정도.

## 목표
슈퍼어드민의 페이지 디자인 편집기(`/super-admin/t/:slug/pages`)를 b2bsmart의 풀 인스펙터 수준으로 끌어올린다. 현재 dw-church 버전(`packages/admin-app/src/super-admin/pages/TenantPageEditor.tsx`, 351줄)은 의도적으로 간소화된 "Phase 4 minimal" — 6개 인라인 필드뿐. b2bsmart는 17-field × 3-tab(Layout/Style/Advanced) × element-registry 기반 인스펙터 + 라이브 프리뷰.

## 소스 (디스크에 있음)
- b2bsmart 빌더: `/h/GitHub/b2bsmart/packages/admin-app/src/components/builder/` (26파일, 10,699줄)
  - `element-registry.ts` (1491줄) — 블록→엘리먼트→필드 스펙
  - `ElementInspector.tsx` (2587줄) — 3-tab 인스펙터
  - `LivePreviewPane.tsx` (1426줄)
  - `property-fields/` (3727줄, 17개) — 범용 디자인 컨트롤
  - `StructurePane.tsx`, `BlockStyleInspector.tsx`, `AIImageGenerateModal.tsx`, `BulkImagingActions.tsx`
- b2bsmart `pages/builder/PageBuilder.tsx` — 3-pane 셸

## dw-church 기반 (이미 b2bsmart에서 포팅됨)
- `@dw-church/blocks`: `elements/`, `registry.ts`+`registry.json`(BLOCK_REGISTRY), `utilities/block-style-resolver.ts`, `element-styles.ts`. Export: `ElementStyle, getElementStyle, mergeElementStyle, blockStyleToCss, Icon, ICONS, ICON_NAMES, isDynamicRef, dynamicContextsForPageKind, DynamicContext, DynamicSourceOption`.
- `@dw-church/design-tokens`: `BoxSides` 등.
- `@dw-church/api-client`: `useDWChurchClient`, `client.uploadFile(file)`(kind 옵션 없음), `usePages`, `useUploadFile`. **없음**: `useCatalogs/useApplicationForms/useProductFieldSchema/useMediaLibrary/MediaItem/ImageKind/useB2BSmartClient`.

## 5단계 계획
1. ✅ **property-fields 포팅** (커밋 `c080da01`) — `packages/admin-app/src/components/builder/property-fields/`. @b2bsmart→@dw-church 치환 완료, 컴파일 OK. admin-app package.json에 `@dw-church/blocks` 추가됨.
   - 어댑트/스텁된 것: `useImageFieldApi`(useDWChurchClient+uploadFile, AI 엔드포인트 fetch는 유지하지만 dw-church에 `/api/v1/ai/builder/image/*`·`section-image/*` 존재 여부 미확인), `MediaPicker`(스텁), `LinkField`(catalog/form 스텁, usePages만), `DynamicSourcePicker`(useProductFieldSchema 스텁).
2. ✅ **element-registry 포팅 + dw-church 블록 보강** (커밋 `2cb7f510` 포팅, `bb719f31` 보강). b2bsmart 레지스트리는 product/catalog 도메인이라 dw-church 블록 18개가 빠져 있었음(인스펙터에서 "No editor registered" 막다른 길). `element-registry.ts` 끝에 `churchBlock()` 헬퍼로 18개 추가: pastor_message, church_intro, recent_sermons, recent_bulletins, event_grid, staff_grid, history_timeline, recent_columns, worship_times, worship_schedule, map_embed, address_info, visitor_welcome, first_time_guide, newcomer_info, layout_row/columns/section. **field path/kind는 `PageEditor.tsx` BLOCK_DEFS와 동일**(렌더러가 읽는 키와 1:1). BLOCK_DEFS가 단일 진실원 — 바뀌면 여기도 미러.
3. ✅ **ElementInspector 포팅** (커밋 `d477b484`) — 3-tab + element-registry 구동. 어댑터: `useUpdateSectionDraft`(=`PUT /pages/:id/sections/:sectionId`), `blockStyle`는 `props.blockStyle`에 저장(dw-church PageSection엔 styleOverrides 필드 없음).
4. ✅ **빌더 셸 연결 + 배포** (커밋 `df4b432c` 연결, `4ffd4d74` blocks/builder 서브패스, `e42b96db` Docker 수정). `TenantPageEditor` 3-pane(페이지/섹션/인스펙터)에 ElementInspector 연결, raw fetch + X-Tenant-Slug. **LivePreviewPane은 아직 없음**(섹션 리스트만, 라이브 렌더 미연결).
   - ⚠️ **Docker 함정(해결됨)**: admin Dockerfile builder 스테이지가 `packages/blocks/node_modules`를 복사 안 해서, vite가 `blocks/src/utilities/block-style-resolver.ts`의 `@dw-church/design-tokens` import를 Rollup이 해석 못 함 → 빌드 실패. 로컬은 pnpm install이 만들어 둬서 통과(가려짐). `COPY --from=deps /app/packages/blocks/node_modules` 추가로 해결. **앞으로 blocks 소스를 더 끌어오면 같은 패턴 주의.**
5. **진행 중 — LivePreviewPane + MediaPicker 완료, DynamicSource/element-click 남음**:
   - ✅ **LivePreviewPane** (커밋 `bc410ce6`) — 중앙 패널이 테넌트 공개 페이지를 iframe(`https://{slug}.truelight.app/{pageSlug}`)으로 렌더. 데스크탑/태블릿/모바일 폭 토글 + 새로고침 + 새 탭. 공개 페이지가 `cache:'no-store'`라 저장 시 `previewNonce` bump → 즉시 반영. BlockRenderer를 admin 번들에 넣지 않음(ui-components 회피). 레이아웃: 페이지 | 섹션 | 라이브 프리뷰 | 인스펙터(우측 고정 w-96).
   - ✅ **MediaPicker 실 구현** (커밋 `9610b76d`) — `GET /api/v1/files`(`client.adapter.get`, camelize+tenant 헤더) 이미지 그리드 + 인라인 업로드(`client.uploadFile` = 클라 리사이즈+R2+DB). 단일/다중 선택. SuperAdminTenantLayout이 `client.setTenantSlug(slug)` 하므로 대상 테넌트로 정확히 조회/업로드.
   - ✅ **DynamicSource 콘텐츠 상세 템플릿** (커밋 `4aab6106`) — b2bsmart식 "콘텐츠 블록" 완성. 운영자가 설교/칼럼/주보 **상세 페이지를 페이지 빌더로 디자인**하고 블록 필드를 현재 항목 데이터에 바인딩.
     - server: `pages.kind` 컬럼(startup ALTER, 기본 'static') + service SELECT/INSERT/UPDATE + zod enum(`static|sermon_detail|column_detail|bulletin_detail`).
     - blocks: `dynamicContextsForPageKind`가 3개 교회 kind → `'post'` context 매핑(title/content/topImageUrl/youtubeUrl/thumbnailUrl/createdAt).
     - admin: `TenantPageEditor`에 '페이지 종류' selector 추가 + 실제 `pageKind`를 ElementInspector에 전달 → **이미 구현돼 있던** DynamicSourcePicker ⚙ 버튼이 text/image/url/html 필드에 활성화.
     - web: 설교/칼럼/주보 상세 라우트가 매칭 `*_detail` 템플릿 조회 → 있으면 `BlockRenderer`+`resolveDynamicProps(item)`로 렌더(`apps/web/lib/dynamic.ts`에 resolver 인라인 — `@dw-church/blocks` 의존 없음), 없으면 기존 고정 레이아웃(템플릿 없으면 동작 무변).
     - **배포·검증**: api-server(repo root에서 `railway up --service api-server`)·web·admin 3개. api `/pages`에 `kind` 노출 확인, admin 청크에 `페이지 종류`/`sermon_detail` 확인, web home 200(무회귀).
     - 참고: `DynamicSourcePicker`의 유일한 잔여 스텁은 `useProductFieldSchema`(b2b 제품 커스텀필드)뿐 — 교회 도메인 불필요.
   - ⏭️ (옵션) 상세 템플릿 **빠른 생성 UI**: 현재는 기존 페이지의 '페이지 종류'를 바꿔 템플릿화. 전용 "새 상세 템플릿" 버튼은 후속 개선 여지.
   - ✅ **element-click 포커스 선택** (커밋 `1e692d11`) — 프리뷰에서 섹션 클릭 → 인스펙터 포커스 + 프리뷰에 선택 윤곽선. `postMessage` 브리지:
     - web: `BlockRenderer`가 최상위 섹션을 `data-dw-section`으로 래핑. 신규 `PreviewBridge`(테넌트 layout에 마운트, `?preview=1` + iframe 임베드일 때만 활성) — 클릭→`postMessage('dw-preview:select')` + hover/선택 윤곽. 일반 방문자엔 무영향(null 렌더).
     - admin: `LivePreviewPane`이 `preview=1` 추가, origin 검증 후 선택 메시지 수신→`onSelectSection`, 선택 변경 시 `dw-preview:highlight` 푸시. `TenantPageEditor`가 `selectedSectionId`↔`setSelectedSectionId` 연결.
     - **배포**: web(service `web`/6509a260)·admin 둘 다. web은 `apps/web/Dockerfile` temp toml로 `railway up --service web --ci`. 검증: `data-dw-section`이 SSR HTML에, 브리지 로직이 `tenant/%5Bslug%5D/layout-*.js` 청크에.

## 배포 방법 (중요)
- admin: 임시 `dw-church-app/railway.toml`(`[build] dockerfilePath="packages/admin-app/Dockerfile"`) 만들고 `cd dw-church-app && railway up --service admin --ci` → 임시파일 삭제. (자세히는 [[project_railway_deploy_method]])

## 같은 세션의 다른 미완 항목
- **게시판(BoardManagement) 일괄삭제** — 나머지 7개 콘텐츠 페이지는 `useBulkDelete`로 완료, 게시판만 중첩(게시판/게시글) 구조라 미적용. 게시글 리스트(`posts = postsData.data`, `deletePostMutation.mutateAsync({boardId, postId})`)에 적용 필요.
- **칼럼 상세 404** — `lagrangechurch.truelight.app/columns/:id` → 404 "교회 사이트 비활성화". 단서: `apps/web/app/tenant/[slug]/columns/[id]/SingleColumnClient.tsx`에서 slug 미사용 → 테넌트 해석 실패 의심.
