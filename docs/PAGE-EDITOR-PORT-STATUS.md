# b2bsmart Page Editor Port — Handoff (paused 2026-06-07)

> 다음 세션은 이 문서부터 읽고 2단계부터 이어서 진행.

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
2. ⏭️ **교회 블록용 element-registry 작성** ← 다음. b2bsmart `element-registry.ts` 구조(`ElementKind, ElementSpec, BlockElementRegistry, ITEM_FIELDS_BY_TYPE, ELEMENT_REGISTRY`)를 참고해, dw-church `BLOCK_REGISTRY`의 ~30개 블록(hero_banner/text_image/pastor_message/worship_times/recent_sermons/staff_grid/album_gallery 등)별로 엘리먼트→필드 매핑을 새로 작성. **가장 큰 도메인 작업.**
3. **ElementInspector 포팅** — b2bsmart의 것을 복사 후 @dw-church 적응. 의존: element-registry(2단계), property-fields(1단계), `useUpdateSectionDraft` 상응(dw-church는 `PUT /pages/:id/sections/:sectionId`), RichEditor, Toast.
4. **빌더 셸 연결 + LivePreviewPane** — `TenantPageEditor`의 3-pane에 인스펙터 연결, BlockRenderer로 프리뷰.
5. **MediaPicker(실 R2 브라우저) + 교회 DynamicSource** — 스텁 교체.

각 단계 동작하면 admin 배포(아래)·검증 후 다음.

## 배포 방법 (중요)
- admin: 임시 `dw-church-app/railway.toml`(`[build] dockerfilePath="packages/admin-app/Dockerfile"`) 만들고 `cd dw-church-app && railway up --service admin --ci` → 임시파일 삭제. (자세히는 [[project_railway_deploy_method]])

## 같은 세션의 다른 미완 항목
- **게시판(BoardManagement) 일괄삭제** — 나머지 7개 콘텐츠 페이지는 `useBulkDelete`로 완료, 게시판만 중첩(게시판/게시글) 구조라 미적용. 게시글 리스트(`posts = postsData.data`, `deletePostMutation.mutateAsync({boardId, postId})`)에 적용 필요.
- **칼럼 상세 404** — `lagrangechurch.truelight.app/columns/:id` → 404 "교회 사이트 비활성화". 단서: `apps/web/app/tenant/[slug]/columns/[id]/SingleColumnClient.tsx`에서 slug 미사용 → 테넌트 해석 실패 의심.
