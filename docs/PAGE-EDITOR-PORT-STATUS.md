# b2bsmart Page Editor Port — Handoff (updated 2026-06-08)

> 다음 세션은 이 문서부터 읽고 **5단계(LivePreviewPane + 실 MediaPicker/DynamicSource)** 부터 진행.
>
> **상태: 1~4단계 완료 + 프로덕션 배포·검증 완료.** 슈퍼어드민 `/super-admin/t/:slug/pages`
> 에 풀 ElementInspector(3-tab Content/Style/Advanced)가 라이브. element-registry가 dw-church
> 의 모든 BLOCK_DEFS 블록을 커버(아래 참고). admin.truelight.app 서빙 중
> (entry `admin-veOsNiVS.js`, chunk `TenantPageEditor-UC34XBYr.js`, 레지스트리 마커 확인됨).

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
5. ⏭️ **NEXT — LivePreviewPane + 실 MediaPicker(R2 브라우저) + 교회 DynamicSource**. 현재 미연결/스텁:
   - **LivePreviewPane**: 중앙에 BlockRenderer 라이브 프리뷰 없음. 단, BlockRenderer는 `@dw-church/ui-components`에 의존 → admin 번들에 직접 넣으면 깨짐(4단계 builder 서브패스가 ui-components 회피한 이유). 대안: 테넌트 공개 페이지를 iframe(`https://{slug}.truelight.app/{pageSlug}`)으로 띄우고 저장 시 리로드 — ui-components 재번들 회피 + 프로덕션 렌더와 동일.
   - **MediaPicker** (`builder/property-fields/MediaPicker.tsx`) 스텁 — R2 미디어 브라우저 미구현(지금은 ImageField 업로드 버튼만).
   - **DynamicSourcePicker** — `useProductFieldSchema` 스텁(b2b 제품 도메인). 교회용 DynamicSource(설교/주보/교역자 등)로 교체 필요.
   - element-click 포커스 선택(프리뷰에서 엘리먼트 클릭→인스펙터 포커스)도 5단계.

## 배포 방법 (중요)
- admin: 임시 `dw-church-app/railway.toml`(`[build] dockerfilePath="packages/admin-app/Dockerfile"`) 만들고 `cd dw-church-app && railway up --service admin --ci` → 임시파일 삭제. (자세히는 [[project_railway_deploy_method]])

## 같은 세션의 다른 미완 항목
- **게시판(BoardManagement) 일괄삭제** — 나머지 7개 콘텐츠 페이지는 `useBulkDelete`로 완료, 게시판만 중첩(게시판/게시글) 구조라 미적용. 게시글 리스트(`posts = postsData.data`, `deletePostMutation.mutateAsync({boardId, postId})`)에 적용 필요.
- **칼럼 상세 404** — `lagrangechurch.truelight.app/columns/:id` → 404 "교회 사이트 비활성화". 단서: `apps/web/app/tenant/[slug]/columns/[id]/SingleColumnClient.tsx`에서 slug 미사용 → 테넌트 해석 실패 의심.
