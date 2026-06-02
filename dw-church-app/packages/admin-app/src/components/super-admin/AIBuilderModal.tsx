import { useCallback, useMemo, useState } from 'react';
import { useDWChurchClient } from '@dw-church/api-client';
import { PlannerWizard, type PlannerResult } from '../planner/PlannerWizard';
import { makePlannerApi } from '../../lib/planner-api';
import { useToast } from '..';

/**
 * AIBuilderModal — wraps PlannerWizard with the build-pages call.
 *
 * Used by both:
 *  - SuperAdminDashboardV2 (table row "✨ AI 빌더" quick action)
 *  - SuperAdminTenantOverview ("✨ AI 빌더 시작" button on the tenant
 *    landing page)
 *
 * Either entry point opens the same wizard; on completion it persists
 * pages + sections + menus + ai_business_profile / ai_strategy /
 * ai_design_system into the target tenant's schema, then applies the
 * chosen design to the live theme. See apps/server build-pages route.
 */
interface AIBuilderModalProps {
  tenant: { id: string; slug: string; name: string };
  onClose: () => void;
  /**
   * Optional callback fired after a successful build, before onClose.
   * The dashboard table uses this to refresh row stats; the overview
   * page can use it to refresh tenant identity / activity card.
   */
  onCompleted?: () => void;
}

export function AIBuilderModal({ tenant, onClose, onCompleted }: AIBuilderModalProps) {
  const { showToast } = useToast();
  const client = useDWChurchClient();
  const planner = useMemo(() => (client ? makePlannerApi(client) : null), [client]);
  const [building, setBuilding] = useState(false);

  const handleComplete = useCallback(async (result: PlannerResult) => {
    if (!planner) return;
    setBuilding(true);
    try {
      const res = await planner.buildPages({
        tenantSlug: tenant.slug,
        business: result.business as unknown as Record<string, unknown>,
        strategy: result.strategy,
        designSystem: result.designSystem,
        sitemap: result.sitemap,
        pageContents: result.pageContents,
      });
      // Fail loud when ANY error came back. The previous flow bundled
      // "사이트 생성 완료 (에러 3건)" as a green success toast, which
      // hid critical failures (theme apply, AI context persist, etc)
      // behind a checkmark. Treat errors as the actual outcome.
      if (res.errors && res.errors.length > 0) {
        const summary = res.errors.slice(0, 3).join(' / ');
        const more = res.errors.length > 3 ? ` 외 ${res.errors.length - 3}건` : '';
        showToast(
          'error',
          `사이트 빌드 중 오류 ${res.errors.length}건: ${summary}${more}`,
        );
        // Don't auto-close — operator needs to see the errors and decide
        // whether to retry. onCompleted skipped intentionally.
        return;
      }
      showToast(
        'success',
        `사이트 생성 완료 — 페이지 ${res.pagesCreated}개, 섹션 ${res.sectionsCreated}개, 메뉴 ${res.menusCreated}개`,
      );
      // 빌드 자체는 성공했지만 server 가 advisory warnings 를 보내면
      // (예: 'planner 가 /pricing 의 CTA 를 안 만들어서 자동 보충됨')
      // 운영자에게 알림. 추후 prompt 튜닝 신호.
      if (res.warnings && res.warnings.length > 0) {
        const wsum = res.warnings.slice(0, 2).join(' / ');
        const wmore = res.warnings.length > 2 ? ` 외 ${res.warnings.length - 2}건` : '';
        showToast('info', `참고 ${res.warnings.length}건: ${wsum}${wmore}`);
      }
      onCompleted?.();
      onClose();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '빌드 실패');
    } finally {
      setBuilding(false);
    }
  }, [planner, tenant.slug, showToast, onClose, onCompleted]);

  if (!planner) return null;

  return (
    <>
      <PlannerWizard
        plannerApi={planner}
        targetTenantName={tenant.name}
        onComplete={handleComplete}
        onClose={onClose}
      />
      {building && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center text-white text-sm">
          <div className="flex items-center gap-2">
            <span className="animate-spin">⟳</span>
            <span>{tenant.name} 스키마에 페이지/섹션 생성 중...</span>
          </div>
        </div>
      )}
    </>
  );
}
