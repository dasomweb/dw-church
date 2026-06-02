// Ported from DW-AI-Web-Builder/apps/builder-ui/src/components/planner/PlannerWizard.tsx.
// b2bsmart adaptation:
//   - plannerApi is supplied as a prop instead of a module singleton, so the
//     same instance can be built per-render from the authenticated DWChurchClient.
//   - Direct fetch() calls to NEXT_PUBLIC_API_URL are replaced with plannerApi
//     methods (parseBusiness, crawlSites, census) — apps/server proxies them.
//   - onComplete now also receives the targetTenantSlug; the caller (Super
//     Admin modal) feeds PlannerResult into POST /api/v1/ai/build-pages.
import { useCallback, useEffect, useRef, useState } from "react";
import type { PlannerApi } from "../../lib/planner-api";
import MarketingCore, { type MarketingStrategy, INITIAL_STRATEGY, strategyToPromptContext } from "./MarketingCore";

// ── Types ──

interface PlannerWizardProps {
  plannerApi: PlannerApi;
  /** Tenant the build will write to. Shown in the header for context. */
  targetTenantName?: string;
  onComplete: (result: PlannerResult) => void;
  onClose: () => void;
}

export interface PlannerResult {
  business: BusinessInfo;
  strategy: Record<string, unknown>;
  designSystem: Record<string, unknown>;
  sitemap: Array<{ name: string; slug: string; parent?: string }>;
  pageContents: Record<string, Array<Record<string, unknown>>>;
}

interface BusinessInfo {
  businessName: string;
  industry: string;
  description: string;
  services: string;
  targetAudience: string;
  brandKeywords: string;
  location: string;
}

type ContentMap = Record<string, { pageName: string; purpose?: string; keyMessage?: string; sections: Array<Record<string, unknown>> }>;

// ── Steps ──
// Prompt   = 자유 입력 → AI가 비즈니스 정보 자동 파싱
// Business = Phase 1-1 (파싱된 정보 확인/수정)
// Analysis = Phase 1-2,3 (전략 + 디자인 시스템 + 크롤링)
// Sitemap  = Phase 3 (구조 설계)
// Content  = Phase 2 (콘텐츠 기획)
// Build    = Phase 4 (섹션 빌드 — 즉시, AI 불필요)

// "Strategy" is its own step now (was a tab inside Business). The split
// is what makes the AI auto-fill UX work end-to-end:
//   - Business Info is filled first (parseBusiness or manual entry)
//   - Clicking Next from Business kicks off autoStrategy and lands the
//     user on the Strategy step with a visible loading UI
//   - Chips populate, user reviews/adjusts, clicks Next → Analysis
// The previous in-tab approach hid the AI work from the user — they
// had to click the Strategy tab to see anything was happening, and many
// skipped it entirely.
const STEPS = ["Prompt", "Business", "Strategy", "Analysis", "Sitemap", "Content", "Design", "Build"] as const;
type Step = (typeof STEPS)[number];

// PAGE_SECTION_DEFAULTS was here. It mapped page names like "home" /
// "about" / "services" to a default section layout, used by the now-
// deleted getDefaultSections fallback. Removed alongside it — the
// wizard no longer ships placeholder content under any path.

const SECTION_TO_PATTERN: Record<string, string> = {
  hero: "hero-section",
  "hero-split": "hero-split",
  "hero-text": "hero-text",
  "page-hero": "page-hero",
  // Future variants — apps/server pattern-map degrades these to page-hero
  // until the dedicated form/map renderers ship.
  "hero-form": "hero-form",
  "hero-map":  "hero-map",
  about: "about-section",
  features: "features-grid",
  services: "features-grid",
  cta: "cta-section",
  testimonials: "testimonials",
  pricing: "pricing-table",
  team: "team-members",
  gallery: "gallery-showcase",
  contact: "contact",
  faq: "faq",
  stats: "stats-numbers",
  blog: "post-list",
  "post-list": "post-list",
  text: "text-block",
  "text-image": "text-image",
  "image-text": "image-text",
  carousel: "carousel",
  "logo-grid": "logo-grid",
  "two-columns": "two-columns",
  // Process / "How we work" — pattern-map routes these to steps_list.
  steps: "steps",
  process: "steps",
  "process-steps": "steps",
  "how-we-work": "steps",
  "how-it-works": "steps",
  workflow: "steps",
  // Tabbed category filter + card grid — pattern-map → category_tabs.
  "category-tabs": "category-tabs",
  "category-filter": "category-tabs",
  "tab-grid": "category-tabs",
  "filtered-grid": "category-tabs",
};

// `getDefaultSections` was here. It generated placeholder sections
// like { title: "Home — Hero", buttonText: "Learn More", description:
// businessDescription } whenever AI content-map failed. The wizard
// then built those placeholders into the tenant as if they were AI-
// generated, leaving real customers with template-shaped sites that
// looked half-finished. Removed entirely — the wizard now refuses to
// build when AI content is missing for any page (see handleBuild).

/**
 * Convert the AI's StrategyDecision payload (camelCase, 11 keys, same
 * shape as the MarketingCore UI) into a typed MarketingStrategy
 * value the panel can render. Keys match exactly so this is mostly a
 * type-narrowing pass with sensible defaults for any field the LLM
 * might omit. Used by handleAnalysis to auto-fill the panel after
 * autoStrategy returns — the operator then adjusts rather than fills
 * from scratch.
 */
function aiStrategyToMarketingStrategy(s: Record<string, unknown>): MarketingStrategy {
  const str = (k: string): string =>
    typeof s[k] === "string" ? (s[k] as string) : "";
  const arr = (k: string): string[] =>
    Array.isArray(s[k]) ? (s[k] as unknown[]).map((v) => String(v)) : [];
  return {
    deliveryModel: str("deliveryModel"),
    transactionType: str("transactionType"),
    revenueModel: str("revenueModel"),
    segmentAxis: arr("segmentAxis"),
    positioning: str("positioning"),
    involvementLevel: str("involvementLevel"),
    purchaseBlocker: str("purchaseBlocker"),
    mixFocus: str("mixFocus"),
    keyP: str("keyP"),
    funnelCoverage: arr("funnelCoverage"),
    primaryCTA: str("primaryCTA"),
  };
}

// ── Main Component ──

export function PlannerWizard({ plannerApi, targetTenantName, onComplete, onClose }: PlannerWizardProps) {
  const [step, setStep] = useState<Step>("Prompt");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Default to Claude. Was 'gemini' but the agents service's gemini-2.5
  // call started returning 400s when the model's default "thinking" mode
  // exhausted the maxOutputTokens budget on short prompts. The fix
  // (thinkingConfig: { thinkingBudget: 0 } in apps/agents/app/services/
  // planner/llm_service.py) is committed but pending a successful agents
  // re-deploy on Railway. Until that lands, route every wizard call
  // through Claude — agents is otherwise healthy.
  const model = "claude" as const;

  // Output language for every narrative agent call (Strategy, Insight,
  // Architect, Copywriter). Default 'en' so reports never surprise
  // operators of US/international businesses — Korean is an explicit
  // opt-in via the wizard header toggle. Persists in localStorage so a
  // Korean-business operator doesn't have to flip it every session.
  const [language, setLanguage] = useState<"en" | "ko">(() => {
    if (typeof window === "undefined") return "en";
    const saved = window.localStorage.getItem("plannerWizard.language");
    return saved === "ko" ? "ko" : "en";
  });
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("plannerWizard.language", language);
    }
  }, [language]);

  // Prompt step
  const [freePrompt, setFreePrompt] = useState("");

  // Phase 1: Business
  const [business, setBusiness] = useState<BusinessInfo>({
    businessName: "",
    industry: "",
    description: "",
    services: "",
    targetAudience: "",
    brandKeywords: "",
    location: "",
  });

  // Marketing Strategy
  const [marketingStrategy, setMarketingStrategy] = useState<MarketingStrategy>(INITIAL_STRATEGY);
  // Separate loading flag for the in-Step-2 strategy auto-fill so it
  // doesn't block the rest of the wizard (the user can keep editing
  // Business Info while Marketing Strategy chips populate in the
  // background).
  const [strategyLoading, setStrategyLoading] = useState(false);

  // Reference URLs
  const [referenceUrls, setReferenceUrls] = useState("");

  // Operator hard-requirement channel — see apps/agents/.../must_haves.py.
  // 4가지 채널로 운영자가 LLM 에 강제 input 을 줌. 모든 plannerApi 호출
  // (autoStrategy / sitemap / pageContent / contentMap) 의 body 에 자동
  // 포함되어 agent prompt 의 'OPERATOR MUST-HAVE REQUIREMENTS' 섹션에
  // 주입됨.
  const [mustHaves, setMustHaves] = useState("");
  const [requiredPages, setRequiredPages] = useState<string[]>([]);
  const [requiredKeyMessages, setRequiredKeyMessages] = useState<string[]>([]);
  const [requiredStats, setRequiredStats] = useState<string[]>([]);

  /** Bundle the 4 must-have fields into the shape every plannerApi call
   *  spreads into its request body. Wrapped in a helper so any new agent
   *  endpoint added later picks up the channel without per-callsite edits. */
  const mustHavePayload = () => ({
    mustHaves,
    requiredPages,
    requiredKeyMessages,
    requiredStats,
  });

  // Phase 1: Analysis results
  const [strategy, setStrategy] = useState<Record<string, unknown>>({});
  const [censusData, setCensusData] = useState<Record<string, unknown> | null>(null);
  const [insight, setInsight] = useState("");
  const [designSystem, setDesignSystem] = useState<Record<string, unknown>>({});
  const [crawlContext, setCrawlContext] = useState("");
  // crawlSummary value isn't currently read anywhere — only set (line ~312).
  // Keep the setter for the existing call site; drop the unused getter.
  const [, setCrawlSummary] = useState("");
  const [crawlData, setCrawlData] = useState<Record<string, unknown> | null>(null);

  // Phase 3: Sitemap (사용자가 추천 풀에서 골라 확정한 페이지)
  const [sitemap, setSitemap] = useState<Array<{ name: string; slug: string; parent?: string }>>([]);

  // Optional per-page operator instructions, keyed by page slug. Empty
  // by default → content generation behaves exactly as before. When the
  // operator fills one in, it's forwarded to the agents content-map call
  // and injected as the highest-priority instruction for that page.
  const [pageNotes, setPageNotes] = useState<Record<string, string>>({});

  // AI 분석 기반 추천 페이지 풀. Sitemap과 동일한 형태이지만, 별도로 보관해서
  // 사용자가 칩 클릭으로 sitemap에 추가/제거할 때 풀은 그대로 유지.
  const [recommendedPages, setRecommendedPages] = useState<Array<{ name: string; slug: string; parent?: string }>>([]);

  // Phase 2: Content map
  const [contentMap, setContentMap] = useState<ContentMap>({});

  // Background-job state for content-map. activeJobId is persisted in
  // localStorage so a refresh / accidental close mid-build can rejoin
  // the still-running server-side job instead of starting over.
  // Tied to targetTenantName so different tenants don't collide on the
  // same key (the tenant slug isn't available here directly but the
  // wizard renders one at a time and the localStorage key is cleared
  // on completion / failure).
  const CONTENT_MAP_JOB_KEY = 'b2bsmart:plannerWizard:contentMapJobId';
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  // Read once on mount and offer to resume if we find one. We don't
  // auto-resume — a job from a different wizard run might not match
  // current state, so we let the operator opt in.
  const [pendingResumeJobId, setPendingResumeJobId] = useState<string | null>(null);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CONTENT_MAP_JOB_KEY);
      if (stored) setPendingResumeJobId(stored);
    } catch { /* localStorage may be unavailable in some embeds */ }
  }, []);
  // Cancel-on-unmount guard so an aborted wizard doesn't keep polling.
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  const stepIndex = STEPS.indexOf(step);

  const updateField = (field: keyof BusinessInfo, value: string) =>
    setBusiness((b) => ({ ...b, [field]: value }));

  // ── Auto-fill Marketing Strategy from current Business Info ──
  // Used in two places:
  //   1. handlePromptParse: fired automatically after parseBusiness so
  //      Marketing Strategy chips are pre-selected by the time the user
  //      lands on Step 2. This is the user-visible fix for "Business
  //      Info에 내용이 채워짐과 동시에 Marketing Strategy에도 ... 선택이
  //      되어야 한다" — both tabs populate together.
  //   2. The "AI 자동 채우기" button on the Marketing Strategy tab, for
  //      users who entered Business Info manually (or want to re-fill
  //      after editing the description).
  // Accepts an optional `biz` arg because handlePromptParse needs to
  // pass the freshly-parsed business directly — setBusiness queues a
  // re-render so reading from `business` state in the same callback
  // tick would still see the previous value.
  const runAutoStrategy = useCallback(
    async (biz?: BusinessInfo) => {
      const b = biz ?? business;
      // Don't bother calling autoStrategy with nothing — the LLM will
      // hallucinate a wholesale-distributor strategy out of thin air.
      if (!b.businessName && !b.description && !b.industry) return;
      setStrategyLoading(true);
      setError("");
      try {
        // Pull census in the same pass — the strategy decision benefits
        // from demographic context for local-B2C cases and we want it
        // cached in state for the Insight call later anyway.
        let censusSummary = "";
        if (b.location) {
          try {
            const censusRes = (await plannerApi.census(b.location)) as Record<string, unknown>;
            if (censusRes.found) {
              censusSummary = String(censusRes.summary || "");
              setCensusData(censusRes);
            }
          } catch { /* census optional */ }
        }
        const res = (await plannerApi.autoStrategy({
          ...b,
          censusSummary: censusSummary || `Location: ${b.location}`,
          language,
          model,
          ...mustHavePayload(),
        })) as { strategy: Record<string, unknown> };
        if (res.strategy && Object.keys(res.strategy).length > 0) {
          setStrategy(res.strategy);
          setMarketingStrategy(aiStrategyToMarketingStrategy(res.strategy));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Strategy auto-fill failed");
      }
      setStrategyLoading(false);
    },
    [business, model, plannerApi],
  );

  // ── Prompt → AI parse into BusinessInfo ──
  const handlePromptParse = useCallback(async () => {
    if (!freePrompt.trim()) return;
    setLoading(true);
    setError("");
    try {
      const data = await plannerApi.parseBusiness(freePrompt, model);
      const parsed = (data.business || {}) as Record<string, string | undefined>;
      const newBusiness: BusinessInfo = {
        businessName: parsed.businessName || "",
        industry: parsed.industry || "",
        description: parsed.description || "",
        services: parsed.services || "",
        targetAudience: parsed.targetAudience || "",
        brandKeywords: parsed.brandKeywords || "",
        location: parsed.location || "",
      };
      setBusiness(newBusiness);
      if (parsed.referenceUrls) {
        setReferenceUrls(parsed.referenceUrls);
      }
      setStep("Business");
      // Note: Marketing Strategy auto-fill no longer fires here — it's
      // now triggered when the user clicks Next from the Business step
      // and lands on the dedicated Strategy step. Doing it on step
      // transition gives the user a visible loading screen instead of
      // a silent background fetch they couldn't see.
    } catch (e) {
      setError(e instanceof Error ? e.message : "Parse failed");
    }
    setLoading(false);
  }, [freePrompt, model, plannerApi]);

  // ── AI Suggest (Business step) ──
  const suggestField = useCallback(
    async (field: string) => {
      setLoading(true);
      setError("");
      try {
        const res = await plannerApi.suggest(field, { ...business }, model);
        const suggestions = res.suggestions;
        if (Array.isArray(suggestions) && suggestions.length > 0) {
          if (field === "services" || field === "targetAudience" || field === "brandKeywords") {
            updateField(field as keyof BusinessInfo, (suggestions as string[]).join(", "));
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Suggestion failed");
      }
      setLoading(false);
    },
    [business, model, plannerApi],
  );

  // ── Analysis: Insight + Design (+ optional Strategy fallback, Crawl) ──
  // The MarketingStrategy is normally already filled at this point —
  // either by the auto-trigger after handlePromptParse, or by the
  // user clicking "AI 자동 채우기" on Step 2's strategy tab. In that
  // case we use the operator-edited strategy directly (preserving any
  // chip adjustments) and only run Insight + Design.
  //
  // Fallback: if the operator skipped Step 2's strategy tab entirely
  // (chips empty when they hit Next), we still call autoStrategy here
  // before Insight so the analysis has a frame to use. The Insight
  // agent's (deliveryModel × transactionType) frame matrix needs that
  // input to avoid defaulting to ZIP-centric reporting for wholesale,
  // online, B2B, and international businesses.
  const handleAnalysis = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Parse reference URLs
      const urls = referenceUrls
        .split("\n")
        .map((u) => u.trim())
        .filter((u) => u.length > 0);

      // Step 1: Census data (fast, needed for prompt context)
      let censusSummary = "";
      try {
        const censusRes = (await plannerApi.census(business.location)) as Record<string, unknown>;
        if (censusRes.found) {
          censusSummary = String(censusRes.summary || "");
          setCensusData(censusRes);
        }
      } catch {
        // Census is optional
      }

      // Step 2: Use the operator's edited Marketing Strategy when one
      // exists; otherwise fall through to autoStrategy so we never feed
      // Insight an empty strategy block (which would silently revert to
      // ZIP-centric framing). The check for "filled" is "deliveryModel
      // chosen" — that's the field with no other natural source.
      let strategyDict: Record<string, unknown> = { ...marketingStrategy };
      if (!marketingStrategy.deliveryModel) {
        const strategyRes = (await plannerApi.autoStrategy({
          ...business,
          censusSummary: censusSummary || `Location: ${business.location}`,
          language,
          model,
          ...mustHavePayload(),
        })) as { strategy: Record<string, unknown> };
        strategyDict = strategyRes.strategy || {};
        if (Object.keys(strategyDict).length > 0) {
          setStrategy(strategyDict);
          setMarketingStrategy(aiStrategyToMarketingStrategy(strategyDict));
        }
      } else {
        // Persist the edited strategy into the legacy `strategy` state
        // too so downstream steps (Sitemap, ContentMap) read a
        // consistent value.
        setStrategy(strategyDict);
      }

      // Step 3: Insight (with strategy) + Design + optional crawl in parallel.
      const parallel: Promise<unknown>[] = [
        plannerApi.marketingInsight({
          ...business,
          targetLocation: business.location,
          censusData: censusSummary,
          targeting: business.targetAudience,
          strategy: strategyDict,
          language,
          model,
        }),
        plannerApi.designSystem({
          ...business,
          demographics: `${business.targetAudience}. ${censusSummary}`,
          languages: "English",
          model,
        }),
      ];
      if (urls.length > 0) {
        parallel.push(plannerApi.crawlSites(urls));
      }

      const results = await Promise.all(parallel);
      const insightRes = results[0] as { insight: string };
      const designRes = results[1] as { designSystem: Record<string, unknown> };

      setInsight(insightRes.insight);
      setDesignSystem(designRes.designSystem);

      // Crawl is at index 2 when present.
      if (results[2]) {
        const crawlRes = results[2] as Record<string, unknown>;
        setCrawlContext((crawlRes.promptContext as string) || "");
        setCrawlData(crawlRes);
        const sites = (crawlRes.sites || []) as Array<{ siteUrl: string; pagesAnalyzed: number; totalSections: number }>;
        const summary = sites
          .map((s) => `${s.siteUrl}: ${s.pagesAnalyzed} pages, ${s.totalSections} sections`)
          .join("\n");
        setCrawlSummary(summary);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    }
    setLoading(false);
  }, [business, marketingStrategy, model, language, referenceUrls, plannerApi]);

  /**
   * Standalone re-fetch of the design system. Used by the DesignStep's
   * "다시 시도" button when the analyze step's design call returned an
   * empty / malformed payload (the preset fallback is gone, so an empty
   * result now visibly stalls the wizard instead of silently shipping
   * DEFAULT_PALETTES[0]).
   */
  const regenerateDesign = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const censusSummaryForDemo = censusData?.summary ? String(censusData.summary) : "";
      const res = await plannerApi.designSystem({
        ...business,
        demographics: `${business.targetAudience}. ${censusSummaryForDemo}`,
        languages: language === "ko" ? "Korean" : "English",
        model,
      });
      setDesignSystem(res.designSystem);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Design generation failed");
    }
    setLoading(false);
  }, [business, language, model, censusData, plannerApi]);

  // ── Sitemap generation ──
  const handleSitemap = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await plannerApi.sitemap({
        ...business,
        marketingStrategy: JSON.stringify(strategy),
        language,
        model,
        ...mustHavePayload(),
      });
      setRecommendedPages(res.pages);
      setSitemap(res.pages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sitemap generation failed");
    }
    setLoading(false);
  }, [business, strategy, model, language, plannerApi]);

  // ── Content Map: bulk content for all pages ──
  const handleContentMap = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Phase-2: stop pre-slicing the rich analysis client-side. The
      // old code mashed insight + competitive analysis into one blob and
      // chopped each to 3000 chars, so anything past the cut never
      // reached the agent. Now we send them WHOLE as discrete fields;
      // the agent's Phase-A strategist distils per-page specifics from
      // the full text (router), and Phase-B writes from that distilled
      // per-page strategy — no global truncation anywhere.
      const mktCtx = strategyToPromptContext(marketingStrategy);
      let fullContext = crawlContext || "";
      if (mktCtx) {
        fullContext = `[MARKETING STRATEGY]\n${mktCtx}\n\n${fullContext}`;
      }
      if (censusData) {
        fullContext = `[DEMOGRAPHICS]\n${String((censusData as Record<string,unknown>).summary || "")}\n\n${fullContext}`;
      }
      const marketingInsight = insight ? String(insight) : "";
      const competitiveAnalysis = crawlData
        ? String((crawlData as Record<string, unknown>).aiAnalysis || "")
        : "";

      // Backgrounded version: server enqueues an ai_jobs row, returns
      // jobId, then we poll. The jobId is mirrored to localStorage so a
      // page refresh during the ~50s wait can offer to rejoin.
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      // Forward only non-empty notes for pages still in the sitemap.
      const trimmedNotes: Record<string, string> = {};
      for (const p of sitemap) {
        const n = (pageNotes[p.slug] ?? '').trim();
        if (n) trimmedNotes[p.slug] = n;
      }
      const res = await plannerApi.contentMapAsync(
        {
          ...business,
          pages: sitemap,
          strategy,
          designSystem,
          crawlContext: fullContext,
          ...(marketingInsight ? { marketingInsight } : {}),
          ...(competitiveAnalysis ? { competitiveAnalysis } : {}),
          ...(Object.keys(trimmedNotes).length > 0 ? { pageNotes: trimmedNotes } : {}),
          language,
          model,
          ...mustHavePayload(),
        },
        {
          signal: abortRef.current.signal,
          onJobId: (id) => {
            setActiveJobId(id);
            try { window.localStorage.setItem(CONTENT_MAP_JOB_KEY, id); } catch { /* ignore */ }
          },
        },
      );
      // Validate: every page in the sitemap must have at least one
      // section. Empty pages are a fail signal — agents emits a key
      // for every page but if the LLM returned nothing usable for some
      // slug, the value is an empty array and we must surface that
      // rather than silently building a placeholder template.
      const incoming = res.contentMap ?? {};
      const actualPages = sitemap.filter((p) => !p.slug.startsWith("#"));
      const missing = actualPages.filter(
        (p) => !incoming[p.slug] || (incoming[p.slug]?.sections ?? []).length === 0,
      );
      if (missing.length > 0) {
        const slugs = missing.map((p) => p.slug).join(', ');
        throw new Error(
          `AI 콘텐츠 생성이 ${missing.length}개 페이지에 대해 실패했습니다 (${slugs}). 다시 시도하세요.`,
        );
      }
      setContentMap(incoming);
      setActiveJobId(null);
      try { window.localStorage.removeItem(CONTENT_MAP_JOB_KEY); } catch { /* ignore */ }
    } catch (e) {
      // FAIL LOUD: surface the error and DO NOT inject placeholder
      // content. The previous fallback path (getDefaultSections)
      // produced "PageName — Hero" / "Learn More" rows that looked AI-
      // generated to the operator but were template placeholders, and
      // the wizard then built them into the tenant. The operator
      // shipped a fake site without ever knowing AI failed.
      //
      // contentMap intentionally stays empty — the Build button is
      // disabled below until the operator re-runs this step.
      setContentMap({});
      setActiveJobId(null);
      try { window.localStorage.removeItem(CONTENT_MAP_JOB_KEY); } catch { /* ignore */ }
      setError(
        e instanceof Error
          ? `AI 콘텐츠 생성 실패: ${e.message}`
          : 'AI 콘텐츠 생성에 실패했습니다. 다시 시도하세요.',
      );
    }
    setLoading(false);
  }, [business, sitemap, pageNotes, strategy, designSystem, model, language, plannerApi, marketingStrategy, crawlContext, insight, censusData, crawlData]);

  // ── Resume an interrupted content-map job ──
  // Called when the operator clicks "Resume" on the banner that appears
  // if a jobId was found in localStorage on mount. We poll the same
  // server-side job and apply its result — this works whether the job
  // is still running or already completed (waitJob handles both).
  const handleResumeContentMap = useCallback(async () => {
    if (!pendingResumeJobId) return;
    setLoading(true);
    setError("");
    setActiveJobId(pendingResumeJobId);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      const res = (await plannerApi.waitJob(pendingResumeJobId, { signal: abortRef.current.signal })) as { contentMap?: ContentMap } | null;
      if (res && typeof res === 'object' && 'contentMap' in res && res.contentMap) {
        setContentMap(res.contentMap);
      }
    } catch (e) {
      setError(e instanceof Error ? `Resume failed: ${e.message}` : 'Resume failed');
    } finally {
      setActiveJobId(null);
      setPendingResumeJobId(null);
      try { window.localStorage.removeItem(CONTENT_MAP_JOB_KEY); } catch { /* ignore */ }
      setLoading(false);
    }
  }, [pendingResumeJobId, plannerApi]);

  const handleDiscardResume = useCallback(() => {
    setPendingResumeJobId(null);
    try { window.localStorage.removeItem(CONTENT_MAP_JOB_KEY); } catch { /* ignore */ }
  }, []);

  // ── Build: instant pattern mapping (no AI) ──
  const handleBuild = useCallback(() => {
    const pageContents: Record<string, Array<Record<string, unknown>>> = {};
    const actualPages = sitemap.filter((p) => !p.slug.startsWith("#"));

    // Block build when ANY page lacks real content. The previous
    // behavior silently injected getDefaultSections placeholders for
    // missing pages — operator clicked Build, the tenant got a mix of
    // AI content and "PageName — Hero" rows, and nobody noticed until
    // the live site looked half-templated.
    const missingPages = actualPages.filter(
      (p) => !contentMap[p.slug] || (contentMap[p.slug]?.sections ?? []).length === 0,
    );
    if (missingPages.length > 0) {
      const slugs = missingPages.map((p) => p.slug).join(', ');
      setError(
        `다음 페이지에 AI 콘텐츠가 없습니다 (${slugs}). 콘텐츠 단계로 돌아가서 다시 생성하세요.`,
      );
      return;
    }

    for (const page of actualPages) {
      const entry = contentMap[page.slug]!;
      pageContents[page.slug] = entry.sections.map((s) => ({
        ...s,
        gutenbergPattern:
          SECTION_TO_PATTERN[s.sectionType as string] ||
          (s.gutenbergPattern as string) ||
          'text-block',
      }));
    }

    onComplete({ business, strategy, designSystem, sitemap, pageContents });
  }, [business, strategy, designSystem, sitemap, contentMap, onComplete]);

  // ── Data readiness checks ──
  const hasAnalysisData =
    Object.keys(strategy).length > 0 || insight.length > 0 || Object.keys(designSystem).length > 0;
  const hasSitemapData = sitemap.length > 0;
  const hasContentData = Object.keys(contentMap).length > 0;

  // ── Next button handler ──
  const handleNext = () => {
    if (step === "Prompt") {
      if (freePrompt.trim()) {
        handlePromptParse();
      } else {
        setStep("Business");
      }
      return;
    }
    if (step === "Business") {
      // Move to the Strategy step and kick off autoStrategy so the
      // chips populate while the user is looking at the loading
      // screen. Skip the call when the chips are already filled (user
      // came back to Business and edited something but the strategy
      // is still valid) — they can hit "다시 채우기" if they want a
      // fresh decision.
      setStep("Strategy");
      if (!marketingStrategy.deliveryModel) {
        void runAutoStrategy();
      }
    } else if (step === "Strategy") {
      setStep("Analysis");
      handleAnalysis();
    } else if (step === "Analysis") {
      if (hasAnalysisData) {
        setStep("Sitemap");
        handleSitemap();
      } else {
        handleAnalysis();
      }
    } else if (step === "Sitemap") {
      if (hasSitemapData) {
        setStep("Content");
        handleContentMap();
      } else {
        handleSitemap();
      }
    } else if (step === "Content") {
      if (hasContentData) {
        setStep("Design");
      } else {
        handleContentMap();
      }
    } else if (step === "Design") {
      setStep("Build");
    } else if (step === "Build") {
      handleBuild();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0e0e10] border border-zinc-800 rounded-xl w-full max-w-5xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/60">
          <div className="flex items-baseline gap-2">
            <h2 className="text-base font-semibold text-zinc-200">AI Website Planner</h2>
            {targetTenantName && (
              <span className="text-xs text-zinc-500">→ {targetTenantName}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Output language toggle — applies to every narrative agent
                call (Strategy, Insight, Architect, Copywriter). Default
                English. Operator opts into Korean here when the
                business needs Korean reports / page copy. Persists
                in localStorage. */}
            <div
              className="flex items-center text-[11px] rounded border border-zinc-700 overflow-hidden"
              role="group"
              aria-label="Output language"
            >
              <button
                type="button"
                onClick={() => setLanguage("en")}
                disabled={loading}
                className={`px-2.5 py-1 ${
                  language === "en"
                    ? "bg-blue-600 text-white"
                    : "bg-transparent text-zinc-400 hover:text-zinc-200"
                } disabled:opacity-50`}
                title="Output language: English (default)"
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage("ko")}
                disabled={loading}
                className={`px-2.5 py-1 border-l border-zinc-700 ${
                  language === "ko"
                    ? "bg-blue-600 text-white"
                    : "bg-transparent text-zinc-400 hover:text-zinc-200"
                } disabled:opacity-50`}
                title="결과물 언어: 한국어"
              >
                KO
              </button>
            </div>
            <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 text-lg">
              &times;
            </button>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex px-5 py-2 gap-1 border-b border-zinc-800/40">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full ${i <= stepIndex ? "bg-blue-500" : "bg-zinc-800"}`}
            />
          ))}
        </div>
        <div className="px-5 py-1.5">
          <span className="text-xs text-zinc-600 uppercase tracking-wider">
            {step} — Step {stepIndex + 1}/{STEPS.length}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {error && (
            <div className="text-sm text-red-400 bg-red-950/40 px-3 py-2 rounded">{error}</div>
          )}

          {step === "Prompt" && (
            <PromptStep
              value={freePrompt}
              onChange={setFreePrompt}
              loading={loading}
            />
          )}
          {step === "Business" && (
            <>
              <BusinessStep
                business={business}
                updateField={updateField}
                onSuggest={suggestField}
                loading={loading}
                referenceUrls={referenceUrls}
                onReferenceUrlsChange={setReferenceUrls}
              />
              <MustHavesPanel
                mustHaves={mustHaves}
                onMustHavesChange={setMustHaves}
                requiredPages={requiredPages}
                onRequiredPagesChange={setRequiredPages}
                requiredKeyMessages={requiredKeyMessages}
                onRequiredKeyMessagesChange={setRequiredKeyMessages}
                requiredStats={requiredStats}
                onRequiredStatsChange={setRequiredStats}
              />
            </>
          )}
          {step === "Strategy" && (
            <MarketingStrategyStep
              marketingStrategy={marketingStrategy}
              onMarketingStrategyChange={setMarketingStrategy}
              onAutoFillStrategy={() => { void runAutoStrategy(); }}
              strategyLoading={strategyLoading}
              hasBusinessInfo={Boolean(business.businessName || business.description)}
            />
          )}
          {step === "Analysis" && (
            <AnalysisStep
              strategy={strategy}
              insight={insight}
              censusData={censusData}
              crawlData={crawlData}
              loading={loading}
              businessName={business.businessName}
            />
          )}
          {step === "Design" && (
            <DesignStep
              designSystem={designSystem}
              onUpdateDesign={setDesignSystem}
              loading={loading}
              industry={business.industry}
              onRegenerate={regenerateDesign}
            />
          )}
          {step === "Sitemap" && (
            <SitemapStep
              sitemap={sitemap}
              onUpdate={setSitemap}
              recommended={recommendedPages}
              contentMap={contentMap}
              loading={loading}
              pageNotes={pageNotes}
              onPageNotesChange={setPageNotes}
            />
          )}
          {step === "Content" && (
            <>
              {pendingResumeJobId && !loading && (
                <div className="mb-4 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-sm text-amber-200 font-medium mb-1">
                    이전 콘텐츠 생성 작업이 있습니다
                  </p>
                  <p className="text-xs text-amber-300/70 mb-3">
                    페이지를 다시 불러오기 전 백그라운드에서 진행 중이던 작업이 발견되었습니다. 결과를 가져오거나 새로 시작할 수 있습니다.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleResumeContentMap}
                      className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 text-xs font-medium rounded-md"
                    >
                      이어받기
                    </button>
                    <button
                      onClick={handleDiscardResume}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-md"
                    >
                      버리고 새로 시작
                    </button>
                  </div>
                </div>
              )}
              {loading && activeJobId && (
                <div className="mb-4 px-4 py-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-xs text-blue-300 font-medium">
                    AI 콘텐츠 생성 중 — 약 30-60초 소요됩니다.
                  </p>
                  <p className="text-[10px] text-blue-300/60 mt-1 font-mono">
                    Job: {activeJobId.slice(0, 8)}… (서버에서 실행 중. 새로고침해도 작업이 계속됩니다.)
                  </p>
                </div>
              )}
              <ContentStep contentMap={contentMap} loading={loading} />
            </>
          )}
          {step === "Build" && <BuildStep sitemap={sitemap} contentMap={contentMap} />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800/60">
          <button
            onClick={() => {
              if (stepIndex > 0) {
                const prev = STEPS[stepIndex - 1];
                if (prev) setStep(prev);
              }
            }}
            disabled={stepIndex === 0 || loading}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 disabled:opacity-30"
          >
            Back
          </button>
          <button
            onClick={handleNext}
            disabled={
              loading ||
              (step === "Business" && !business.businessName) ||
              (step === "Prompt" && !freePrompt.trim() && loading) ||
              // Design 단계에서 운영자가 색/폰트 선택 안 했으면 진행 차단
              // (1206a28 의 preset 제거 후 운영자가 선택 없이 넘어가면
              // theme 반영 없이 빌드 — 강제로 한 번은 고르게).
              (step === "Design" && (!(designSystem.selectedColors as Record<string, string> | undefined) || !(designSystem.selectedHeadingFont as string | undefined)))
            }
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600
              text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2"
          >
            {loading && <span className="animate-spin">&#x27F3;</span>}
            {loading
              ? "Generating..."
              : step === "Prompt"
                ? (freePrompt.trim() ? "AI Parse" : "Skip")
                : step === "Build"
                  ? "Build All Pages"
                  : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──

function PromptStep({
  value,
  onChange,
  loading,
}: {
  value: string;
  onChange: (v: string) => void;
  loading: boolean;
}) {
  if (loading) {
    return (
      <AILoadingIndicator
        label="AI가 비즈니스 정보를 추출 중…"
        sublabel="입력하신 내용에서 사업명, 업종, 타겟 고객 등을 자동으로 분리합니다"
        estimateSec={10}
      />
    );
  }
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-zinc-300 mb-3">
          Tell us about your business in your own words. AI will extract the details automatically.
        </p>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={"e.g. We are Korus Orchid Corporation, a wholesale orchid grower based in Southern California. We specialize in Phalaenopsis, Oncidium, and tropical orchids. Our target customers are garden centers and retail nurseries across the US.\n\nReference sites:\nhttps://example-orchids.com\nhttps://another-grower.com"}
          rows={8}
          className="w-full bg-zinc-800/40 border border-zinc-700/30 text-zinc-200 px-4 py-3 rounded-lg text-sm outline-none focus:border-blue-500/40 placeholder-zinc-600 resize-none leading-relaxed"
          disabled={loading}
          autoFocus
        />
      </div>
      <div className="bg-zinc-800/30 border border-zinc-700/20 rounded-lg px-4 py-3 space-y-1.5">
        <p className="text-xs text-zinc-500 font-medium">Include any of these:</p>
        <ul className="text-xs text-zinc-600 space-y-0.5">
          <li>- Business name, industry, location</li>
          <li>- Products / services you offer</li>
          <li>- Target customers / audience</li>
          <li>- Brand style or keywords (modern, premium, warm...)</li>
          <li>- Reference / competitor website URLs</li>
        </ul>
      </div>
      {!value.trim() && (
        <p className="text-xs text-zinc-600">
          Or click Skip to fill in the form manually.
        </p>
      )}
    </div>
  );
}

function BusinessStep({
  business,
  updateField,
  onSuggest,
  loading,
  referenceUrls,
  onReferenceUrlsChange,
}: {
  business: BusinessInfo;
  updateField: (f: keyof BusinessInfo, v: string) => void;
  onSuggest: (f: string) => void;
  loading: boolean;
  referenceUrls: string;
  onReferenceUrlsChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2.5">
      <Field label="Business Name" value={business.businessName} onChange={(v) => updateField("businessName", v)} placeholder="Seoul Coffee" />
      <Field label="Industry" value={business.industry} onChange={(v) => updateField("industry", v)} placeholder="Coffee Shop / Cafe" />
      <Field label="Description" value={business.description} onChange={(v) => updateField("description", v)} placeholder="Premium specialty coffee shop in Gangnam" textarea />
      <FieldWithSuggest label="Services / Products" value={business.services} onChange={(v) => updateField("services", v)} onSuggest={() => onSuggest("services")} loading={loading} placeholder="Espresso, Latte, Pastries..." textarea />
      <FieldWithSuggest label="Target Audience" value={business.targetAudience} onChange={(v) => updateField("targetAudience", v)} onSuggest={() => onSuggest("targetAudience")} loading={loading} placeholder="Young professionals, coffee enthusiasts..." textarea />
      <FieldWithSuggest label="Brand Keywords" value={business.brandKeywords} onChange={(v) => updateField("brandKeywords", v)} onSuggest={() => onSuggest("brandKeywords")} loading={loading} placeholder="Modern, Premium, Warm..." />
      <Field label="Location" value={business.location} onChange={(v) => updateField("location", v)} placeholder="1808 Plymouth Sorrento Rd Apopka, FL 32712" />
      <div>
        <label className="text-sm text-zinc-500 mb-1 block">Reference / Competitor Sites</label>
        <textarea
          value={referenceUrls}
          onChange={(e) => onReferenceUrlsChange(e.target.value)}
          placeholder={"https://competitor1.com\nhttps://competitor2.com"}
          rows={3}
          className="w-full bg-zinc-800/40 border border-zinc-700/30 text-zinc-200 px-3 py-2 rounded-md text-sm outline-none focus:border-blue-500/40 placeholder-zinc-600 resize-none"
        />
        <p className="text-xs text-zinc-600 mt-1">Enter URLs (one per line). All pages will be crawled and analyzed.</p>
      </div>
    </div>
  );
}

// ── Strategy Step (auto-filled on entry from Business) ──

function MarketingStrategyStep({
  marketingStrategy,
  onMarketingStrategyChange,
  onAutoFillStrategy,
  strategyLoading,
  hasBusinessInfo,
}: {
  marketingStrategy: MarketingStrategy;
  onMarketingStrategyChange: (s: MarketingStrategy) => void;
  onAutoFillStrategy: () => void;
  strategyLoading: boolean;
  hasBusinessInfo: boolean;
}) {
  // deliveryModel is the most reliable "is the strategy empty?" signal
  // — none of the chips default to a value and deliveryModel has no
  // other source. When blank, none of the other chips are populated.
  const strategyEmpty = !marketingStrategy.deliveryModel;

  // Loading takeover: show a centered spinner + estimated time instead
  // of the empty MarketingCore. Once chips arrive we drop back to the
  // normal panel + "다시 채우기" affordance.
  if (strategyLoading) {
    return (
      <div className="space-y-3">
        <AILoadingIndicator
          label="AI가 Marketing Strategy를 분석 중…"
          sublabel="Business Info 내용을 바탕으로 11개 항목을 결정합니다"
          estimateSec={15}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className={`rounded-lg p-3 border ${strategyEmpty ? "bg-blue-500/10 border-blue-500/30" : "bg-zinc-800/40 border-zinc-700/30"}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className={`text-xs font-medium ${strategyEmpty ? "text-blue-200" : "text-zinc-400"}`}>
              {strategyEmpty
                ? "Marketing Strategy를 AI가 자동으로 채워드릴 수 있습니다"
                : "AI가 채운 Marketing Strategy입니다 — 칩을 눌러 조정하세요"}
            </p>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              {strategyEmpty
                ? "Business Info 내용을 분석해 11개 항목을 모두 선택합니다. 약 10-15초."
                : "수정한 내용은 Analysis 단계로 그대로 전달됩니다."}
            </p>
          </div>
          <button
            onClick={onAutoFillStrategy}
            disabled={strategyLoading || !hasBusinessInfo}
            className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${strategyEmpty
                ? "bg-blue-500 hover:bg-blue-400 disabled:bg-blue-500/40 text-white"
                : "bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 text-zinc-200"
              } disabled:cursor-not-allowed`}
            title={!hasBusinessInfo ? "먼저 Business Info를 채워주세요" : undefined}
          >
            {strategyEmpty ? "AI 자동 채우기" : "다시 채우기"}
          </button>
        </div>
      </div>
      <MarketingCore strategy={marketingStrategy} onChange={onMarketingStrategyChange} />
    </div>
  );
}

// ── Reusable AI loading indicator ──
// One visual treatment used wherever the wizard is waiting on an LLM
// call: animated dot-spinner, primary label, optional sublabel, and
// optional time estimate. Centralized so the wizard has a single
// "AI is thinking" affordance that operators learn to recognize.
function AILoadingIndicator({
  label,
  sublabel,
  estimateSec,
}: {
  label: string;
  sublabel?: string;
  estimateSec?: number;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 bg-blue-500/5 border border-blue-500/20 rounded-lg">
      <div className="flex gap-1.5 mb-4">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-pulse"
            style={{ animationDelay: `${i * 150}ms`, animationDuration: "1.2s" }}
          />
        ))}
      </div>
      <p className="text-sm font-medium text-blue-100 text-center">{label}</p>
      {sublabel && (
        <p className="text-xs text-blue-300/70 text-center mt-1.5 max-w-md">{sublabel}</p>
      )}
      {estimateSec !== undefined && (
        <p className="text-[10px] text-blue-300/50 text-center mt-3 uppercase tracking-wider">
          예상 소요 시간 약 {estimateSec}초
        </p>
      )}
    </div>
  );
}

// ── Analysis Step (Strategy + Design + Crawl combined) ──

function AnalysisStep({
  strategy,
  insight,
  censusData,
  crawlData,
  loading,
  businessName,
}: {
  strategy: Record<string, unknown>;
  insight: string;
  censusData: Record<string, unknown> | null;
  crawlData: Record<string, unknown> | null;
  loading: boolean;
  businessName: string;
}) {
  const [activeTab, setActiveTab] = useState<"analysis" | "reference">("analysis");
  const hasStrategy = Object.keys(strategy).length > 0;
  const hasCrawl = crawlData && ((crawlData.sites as unknown[]) || []).length > 0;

  if (!hasStrategy && !insight && !loading) {
    return <p className="text-sm text-zinc-600">Click Next to generate</p>;
  }
  if (loading && !hasStrategy) {
    return (
      <AILoadingIndicator
        label="AI가 마케팅 분석을 진행 중…"
        sublabel="Marketing Insight + Design System + 경쟁사 사이트 분석을 동시에 실행합니다"
        estimateSec={45}
      />
    );
  }

  // Download analysis as text file
  const handleDownload = () => {
    let content = `=== ${businessName} — Analysis Report ===\n\n`;
    if (hasStrategy) {
      content += "--- MARKETING STRATEGY ---\n";
      for (const [k, v] of Object.entries(strategy)) {
        content += `${k}: ${Array.isArray(v) ? (v as string[]).join(", ") : String(v)}\n`;
      }
      content += "\n";
    }
    if (censusData) {
      content += "--- DEMOGRAPHICS (US CENSUS) ---\n";
      content += `${String(censusData.summary || "")}\n\n`;
    }
    if (insight) {
      content += "--- MARKETING INSIGHT ---\n";
      content += `${insight}\n\n`;
    }
    if (crawlData) {
      content += "--- REFERENCE SITE ANALYSIS ---\n";
      const sites = (crawlData.sites || []) as Array<Record<string, unknown>>;
      for (const site of sites) {
        content += `\nSite: ${String(site.siteUrl)} (${String(site.pagesAnalyzed)} pages)\n`;
        const pages = (site.pages || []) as Array<Record<string, unknown>>;
        for (const page of pages) {
          content += `  Page: ${String(page.title)} (${String(page.url)})\n`;
          const sections = (page.sections || []) as Array<Record<string, unknown>>;
          for (const sec of sections) {
            content += `    [${String(sec.type)}] ${String(sec.title || "")}\n`;
            if (sec.description) content += `      ${String(sec.description).slice(0, 200)}\n`;
          }
        }
      }
    }
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${businessName.replace(/\s+/g, "-")}-analysis.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      {/* Tab bar + download */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-zinc-800/50 rounded-lg p-0.5">
          <button
            onClick={() => setActiveTab("analysis")}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${activeTab === "analysis" ? "bg-zinc-700 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            Analysis
          </button>
          <button
            onClick={() => setActiveTab("reference")}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${activeTab === "reference" ? "bg-zinc-700 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"} ${!hasCrawl ? "opacity-40" : ""}`}
            disabled={!hasCrawl}
          >
            Reference Sites {hasCrawl ? `(${((crawlData?.sites as unknown[]) || []).length})` : ""}
          </button>
        </div>
        <button
          onClick={handleDownload}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          Download
        </button>
      </div>

      {/* ── Analysis Tab ── */}
      {activeTab === "analysis" && (
        <div className="space-y-4">
          {hasStrategy && (
            <div className="space-y-1.5">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Strategy</p>
              {Object.entries(strategy).map(([key, val]) => (
                <div key={key} className="flex items-start gap-2 text-sm">
                  <span className="text-zinc-500 w-32 shrink-0">{key}</span>
                  <span className="text-zinc-300">
                    {Array.isArray(val) ? (val as string[]).join(", ") : String(val)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {censusData && (
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Demographics (US Census)</p>
              <div className="text-sm text-zinc-400 bg-zinc-900/50 rounded p-3">
                <p className="text-zinc-300 font-medium mb-1">{String(censusData.summary || "")}</p>
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                  <div>Pop: <span className="text-zinc-300">{String(censusData.totalPopulation || "")}</span></div>
                  <div>Age: <span className="text-zinc-300">{String(censusData.medianAge || "")}</span></div>
                  <div>Income: <span className="text-zinc-300">${String(censusData.medianIncome || "")}</span></div>
                  <div>Households: <span className="text-zinc-300">{String(censusData.households || "")}</span></div>
                </div>
              </div>
            </div>
          )}

          {insight && (
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Marketing Insight</p>
              <div className="text-sm text-zinc-400 leading-relaxed max-h-80 overflow-y-auto bg-zinc-900/50 rounded p-3 whitespace-pre-line">
                {insight}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Reference Sites Tab ── */}
      {activeTab === "reference" && crawlData && (
        <ReferenceAnalysisTab crawlData={crawlData} />
      )}
    </div>
  );
}

// ── Reference Site Analysis Tab ──

function ReferenceAnalysisTab({ crawlData }: { crawlData: Record<string, unknown> }) {
  const [expandedSite, setExpandedSite] = useState<number | null>(0);
  const [expandedPage, setExpandedPage] = useState<string | null>(null);
  const sites = (crawlData.sites || []) as Array<Record<string, unknown>>;
  const aiAnalysis = String(crawlData.aiAnalysis || "");

  return (
    <div className="space-y-3">
      {/* AI Analysis Summary */}
      {aiAnalysis && (
        <div className="bg-blue-950/20 border border-blue-900/30 rounded-lg p-3">
          <p className="text-xs text-blue-400/70 uppercase tracking-wider mb-2 font-medium">AI Competitive Analysis</p>
          <div className="text-sm text-zinc-400 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-line">
            {aiAnalysis}
          </div>
        </div>
      )}

      {sites.map((site, siteIdx) => {
        const siteUrl = String(site.siteUrl || "");
        const pagesAnalyzed = Number(site.pagesAnalyzed || 0);
        const totalSections = Number(site.totalSections || 0);
        const sitePages = (site.pages || []) as Array<Record<string, unknown>>;
        const nav = (site.navigation || []) as Array<Record<string, unknown>>;
        const isExpanded = expandedSite === siteIdx;

        return (
          <div key={siteIdx} className="bg-zinc-900/40 border border-zinc-800/40 rounded-lg overflow-hidden">
            {/* Site header */}
            <button
              onClick={() => setExpandedSite(isExpanded ? null : siteIdx)}
              className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-zinc-800/30 transition-colors text-left"
            >
              <span className="text-xs text-zinc-600">{isExpanded ? "▼" : "▶"}</span>
              <span className="text-sm text-zinc-200 font-medium truncate flex-1">{siteUrl}</span>
              <span className="text-xs text-zinc-600">{pagesAnalyzed} pages, {totalSections} sections</span>
            </button>

            {isExpanded && (
              <div className="border-t border-zinc-800/40">
                {/* Navigation structure */}
                {nav.length > 0 && (
                  <div className="px-3 py-2 bg-zinc-800/20 border-b border-zinc-800/30">
                    <p className="text-xs text-zinc-500 mb-1">Navigation</p>
                    <div className="flex flex-wrap gap-1">
                      {nav.slice(0, 15).map((item, i) => (
                        <span key={i} className="text-xs bg-zinc-800/60 text-zinc-400 px-1.5 py-0.5 rounded">
                          {String(item.text || "")}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pages */}
                <div className="divide-y divide-zinc-800/30">
                  {sitePages.map((page, pageIdx) => {
                    const pageUrl = String(page.url || "");
                    const pageTitle = String(page.title || "");
                    const pageSections = (page.sections || []) as Array<Record<string, unknown>>;
                    const pageText = String(page.pageText || "");
                    const pageKey = `${siteIdx}-${pageIdx}`;
                    const isPageExpanded = expandedPage === pageKey;

                    return (
                      <div key={pageIdx}>
                        <button
                          onClick={() => setExpandedPage(isPageExpanded ? null : pageKey)}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-800/20 transition-colors text-left"
                        >
                          <span className="text-xs text-zinc-700">{isPageExpanded ? "▼" : "▶"}</span>
                          <span className="text-sm text-zinc-300 truncate flex-1">{pageTitle.split(" – ")[0]?.split(" - ")[0] ?? pageTitle}</span>
                          <span className="text-xs text-zinc-700 font-mono truncate max-w-[120px]">
                            {pageUrl.replace(siteUrl, "").replace(/^https?:\/\/[^/]+/, "")}
                          </span>
                        </button>

                        {isPageExpanded && (pageText || pageSections.length > 0) && (
                          <div className="px-3 pb-2 space-y-2">
                            {pageSections.map((sec, secIdx) => {
                              const sType = String(sec.type || "content");
                              const sTitle = String(sec.title || "");
                              const sSubtitle = String(sec.subtitle || "");
                              const sDesc = String(sec.description || "");
                              const sBtn = String(sec.buttonText || "");
                              const items = (sec.items || []) as Array<Record<string, unknown>>;

                              return (
                                <div key={secIdx} className="bg-zinc-800/30 rounded p-2.5 text-sm">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-xs font-mono text-emerald-400/70 bg-emerald-500/10 px-1 py-0.5 rounded">
                                      {sType}
                                    </span>
                                    {Number(sec.estimatedColumns || 0) > 1 && (
                                      <span className="text-xs text-zinc-600">{String(sec.estimatedColumns)}-col</span>
                                    )}
                                    {Number(sec.imageCount || 0) > 0 && (
                                      <span className="text-xs text-zinc-600">{String(sec.imageCount)} imgs</span>
                                    )}
                                  </div>
                                  {sTitle && <p className="text-zinc-200 font-medium">{sTitle}</p>}
                                  {sSubtitle && <p className="text-zinc-400 text-xs mt-0.5">{sSubtitle}</p>}
                                  {sDesc && (
                                    <p className="text-zinc-500 text-xs mt-1 leading-relaxed">
                                      {sDesc.slice(0, 300)}{sDesc.length > 300 ? "..." : ""}
                                    </p>
                                  )}
                                  {sBtn && <p className="text-xs text-blue-400/60 mt-1">CTA: {sBtn}</p>}
                                  {items.length > 0 && (
                                    <div className="mt-1.5 pl-2 border-l border-zinc-700/50 space-y-0.5">
                                      {items.slice(0, 4).map((item, j) => (
                                        <p key={j} className="text-xs text-zinc-600">
                                          {String(item.title || "")}
                                          {item.description ? ` — ${String(item.description).slice(0, 80)}` : ""}
                                        </p>
                                      ))}
                                      {items.length > 4 && <p className="text-xs text-zinc-700">+{items.length - 4} more</p>}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {/* Show raw page text if no sections parsed */}
                            {pageSections.length === 0 && pageText && (
                              <div className="bg-zinc-800/30 rounded p-2.5">
                                <p className="text-xs text-zinc-500 mb-1 uppercase">Page Content</p>
                                <div className="text-xs text-zinc-400 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-line">
                                  {pageText.slice(0, 1500)}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Design Step (Color + Font selection with matching) ──

function DesignStep({
  designSystem,
  onUpdateDesign,
  loading,
  industry,
  onRegenerate,
}: {
  designSystem: Record<string, unknown>;
  onUpdateDesign: (updater: Record<string, unknown> | ((ds: Record<string, unknown>) => Record<string, unknown>)) => void;
  loading: boolean;
  /** business.industry — used by the Hero tab's "Auto-pick by industry" button. */
  industry?: string;
  /** Re-fire the design-system endpoint (used by the empty-state retry
   *  button). Wired up after preset removal so an empty AI response is
   *  visibly recoverable instead of silently leaking DEFAULT_PALETTES[0]. */
  onRegenerate?: () => void | Promise<void>;
}) {
  const [designTab, setDesignTab] = useState<"style" | "layout" | "hero" | "header" | "footer">("style");

  // colors / fonts come ONLY from the AI agent's designSystem output —
  // no hardcoded preset fallback. If the agent failed or returned empty,
  // the wizard surfaces an empty state below (operator re-runs the
  // analyze step). This enforces the "no hardcoded defaults" rule: the
  // earlier DEFAULT_PALETTES / DEFAULT_FONTSETS path was applying the
  // same 9 palettes × 6 fontsets to every tenant whenever the agent
  // didn't deliver, producing the "same site over and over" symptom the
  // operator flagged.
  const colors = (designSystem.colorOptions || []) as Array<Record<string, unknown>>;
  const fonts = (designSystem.fontOptions || []) as Array<Record<string, unknown>>;

  const selectedColors = designSystem.selectedColors as Record<string, string> | undefined;
  const selectedHeading = designSystem.selectedHeadingFont as string | undefined;

  /** Apply the first AI-generated palette + fontset (or no-op when empty).
   *  Replaces the old preset-driven autoMatch — now purely a "promote the
   *  agent's top recommendation to the active selection" shortcut. */
  const generateAll = () => {
    const firstColor = colors[0] as { colors?: Record<string, string> } | undefined;
    const firstFont = fonts[0] as { heading?: string; body?: string; koreanFont?: string } | undefined;
    if (!firstColor?.colors && !firstFont) return;
    onUpdateDesign((ds) => ({
      ...ds,
      ...(firstColor?.colors ? { selectedColors: firstColor.colors } : {}),
      ...(firstFont?.heading ? { selectedHeadingFont: firstFont.heading } : {}),
      ...(firstFont?.body ? { selectedBodyFont: firstFont.body } : {}),
      ...(firstFont?.koreanFont ? { selectedKoreanFont: firstFont.koreanFont } : {}),
    }));
  };

  // Load Google Fonts for all font options
  const allFontNames = new Set<string>();
  for (const f of fonts) {
    if (f.heading) allFontNames.add(String(f.heading));
    if (f.body) allFontNames.add(String(f.body));
  }
  const fontLink = allFontNames.size > 0
    ? `https://fonts.googleapis.com/css2?${Array.from(allFontNames).map((f) => `family=${encodeURIComponent(f)}:wght@400;600;700`).join("&")}&display=swap`
    : "";
  const selectedBody = designSystem.selectedBodyFont as string | undefined;

  if (colors.length === 0 && fonts.length === 0) {
    if (loading) {
      return (
        <AILoadingIndicator
          label="AI가 디자인 시스템을 생성 중…"
          sublabel="비즈니스 맥락에 맞는 컬러 팔레트와 폰트 조합을 제안합니다"
          estimateSec={20}
        />
      );
    }
    // Preset fallback was removed (commit 1206a28) — empty AI response is
    // now a real "stalled" state, not a silently-applied DEFAULT_PALETTES[0].
    // Surface it with a retry path so the operator can recover without
    // restarting the entire wizard.
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-6 text-center space-y-3">
        <p className="text-sm font-medium text-amber-900">
          AI가 디자인 시스템을 만들지 못했습니다
        </p>
        <p className="text-xs text-amber-700 leading-relaxed max-w-md mx-auto">
          비즈니스 설명 / 브랜드 키워드 / 무드 입력을 다시 확인해 주세요.
          입력값이 충분하면 아래 버튼으로 재시도할 수 있습니다.
        </p>
        {onRegenerate && (
          <button
            type="button"
            onClick={() => { void onRegenerate(); }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M4 4v6h6M20 20v-6h-6M4 10a8 8 0 0114-4.9M20 14a8 8 0 01-14 4.9" />
            </svg>
            디자인 다시 생성
          </button>
        )}
      </div>
    );
  }

  // Find selected font name for matching
  const selectedFontName = fonts.find(
    (f) => f.heading === selectedHeading && f.body === selectedBody,
  )?.name as string | undefined;

  // Find selected color's matchingFont
  const selectedColorOpt = colors.find(
    (c) => selectedColors && JSON.stringify(c.colors) === JSON.stringify(selectedColors),
  );
  const colorMatchingFont = selectedColorOpt?.matchingFont as string | undefined;

  // Compute preview colors with proper fallbacks
  const previewBg = (selectedColors?.background as string) || "#0e0e10";
  const previewText = (selectedColors?.text as string) || "#e0e0e0";
  const previewMuted = (selectedColors?.muted as string) || "#888";
  const previewBorder = (selectedColors?.border as string) || "#333";
  const previewPrimary = (selectedColors?.primary as string) || "#3b82f6";

  return (
    <div className="space-y-4">
      {/* Load Google Fonts */}
      {fontLink && <link href={fontLink} rel="stylesheet" />}

      {/* Design tabs */}
      <div className="flex gap-1 bg-zinc-800/50 rounded-lg p-0.5">
        {(["style", "layout", "hero", "header", "footer"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setDesignTab(tab)}
            className={`flex-1 px-2 py-1.5 text-xs rounded-md transition-colors capitalize ${
              designTab === tab ? "bg-zinc-700 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Header Tab ── */}
      {designTab === "header" && (
        <HeaderFooterSelector
          type="header"
          selected={(designSystem.headerStyle as string) || "standard"}
          onSelect={(style) => onUpdateDesign((ds) => ({ ...ds, headerStyle: style }))}
          designSystem={designSystem}
        />
      )}

      {/* ── Footer Tab ── */}
      {designTab === "footer" && (
        <HeaderFooterSelector
          type="footer"
          selected={(designSystem.footerStyle as string) || "3-column"}
          onSelect={(style) => onUpdateDesign((ds) => ({ ...ds, footerStyle: style }))}
          designSystem={designSystem}
        />
      )}

      {/* ── Layout Tab ── */}
      {designTab === "layout" && (
        <div className="space-y-4">
          <div>
            <p className="text-xs text-zinc-500 mb-1.5">Container Max Width</p>
            <div className="flex gap-1">
              {["1200px", "1400px", "1600px"].map((w) => (
                <button key={w} onClick={() => onUpdateDesign((ds) => ({ ...ds, containerMax: w }))}
                  className={`flex-1 px-2 py-1.5 rounded text-xs border transition-all ${(designSystem.containerMax || "1200px") === w ? "bg-blue-500/15 text-blue-400 border-blue-500/40" : "bg-zinc-800/40 text-zinc-500 border-zinc-700/30"}`}>{w}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-1.5">Section Padding (Top/Bottom)</p>
            <div className="flex gap-1">
              {["50px", "75px", "100px", "120px"].map((p) => (
                <button key={p} onClick={() => onUpdateDesign((ds) => ({ ...ds, sectionPadding: p }))}
                  className={`flex-1 px-2 py-1.5 rounded text-xs border transition-all ${(designSystem.sectionPadding || "75px") === p ? "bg-blue-500/15 text-blue-400 border-blue-500/40" : "bg-zinc-800/40 text-zinc-500 border-zinc-700/30"}`}>{p}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-1.5">Border Radius</p>
            <div className="flex gap-1">
              {[{ id: "0px", label: "None" }, { id: "6px", label: "Small" }, { id: "12px", label: "Medium" }, { id: "20px", label: "Large" }].map((r) => (
                <button key={r.id} onClick={() => onUpdateDesign((ds) => ({ ...ds, borderRadius: r.id }))}
                  className={`flex-1 px-2 py-1.5 rounded text-xs border transition-all ${(designSystem.borderRadius || "12px") === r.id ? "bg-blue-500/15 text-blue-400 border-blue-500/40" : "bg-zinc-800/40 text-zinc-500 border-zinc-700/30"}`}>{r.label}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-1.5">Sub-page Hero Height</p>
            <div className="flex gap-1">
              {["200px", "300px", "400px", "500px"].map((h) => (
                <button key={h} onClick={() => onUpdateDesign((ds) => ({ ...ds, pageHeroHeight: h }))}
                  className={`flex-1 px-2 py-1.5 rounded text-xs border transition-all ${(designSystem.pageHeroHeight || "300px") === h ? "bg-blue-500/15 text-blue-400 border-blue-500/40" : "bg-zinc-800/40 text-zinc-500 border-zinc-700/30"}`}>{h}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Hero Tab — variant + size for home/sub/special pages ── */}
      {designTab === "hero" && (
        <HeroDesignPanel
          designSystem={designSystem}
          onUpdateDesign={onUpdateDesign}
          industry={industry || ''}
        />
      )}

      {/* ── Style Tab (Colors & Fonts) ── */}
      {designTab === "style" && (
      <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-zinc-500">
          폰트셋을 먼저 선택한 후 컬러셋을 선택하세요. 매칭되는 조합에 추천 배지가 됩니다.
        </p>
        <button
          onClick={generateAll}
          className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-md transition-colors active:scale-[0.97]"
          title="현재 선택과 가장 잘 매칭되는 폰트+컬러 페어를 한 번에 적용"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
            <path d="M5 3v4M3 5h4M6 17v4m-2-2h4M13 3l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7z" />
          </svg>
          전체 생성 (폰트+컬러)
        </button>
      </div>

      {/* Font Combinations */}
      {fonts.length > 0 && (
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
            Font Combinations ({fonts.length})
          </p>
          <div className="grid grid-cols-2 gap-2">
            {fonts.slice(0, 6).map((opt, i) => {
              const isSelected = selectedHeading === opt.heading && selectedBody === opt.body;
              const isRecommended = colorMatchingFont && colorMatchingFont === opt.name;

              return (
                <button
                  key={i}
                  onClick={() =>
                    onUpdateDesign((ds) => ({
                      ...ds,
                      selectedHeadingFont: opt.heading,
                      selectedBodyFont: opt.body,
                      selectedKoreanFont: opt.koreanFont || "",
                    }))
                  }
                  className={`text-left rounded-lg p-3 border-2 transition-all ${
                    isSelected
                      ? "border-blue-500 bg-blue-500/10"
                      : isRecommended
                        ? "border-emerald-500/50 bg-emerald-500/5"
                        : "border-zinc-800/50 bg-zinc-900/50 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-zinc-200 font-medium">{String(opt.name || `Font ${i + 1}`)}</span>
                    {isSelected && <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">Selected</span>}
                    {isRecommended && !isSelected && <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">Match</span>}
                  </div>

                  {/* Live preview with selected colors */}
                  <div
                    className="rounded-md p-3 space-y-1"
                    style={{
                      backgroundColor: previewBg,
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: previewBorder,
                    }}
                  >
                    <p
                      style={{
                        color: previewPrimary,
                        fontFamily: `'${String(opt.heading)}', sans-serif`,
                        fontSize: "11px",
                        fontWeight: 600,
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.05em",
                      }}
                    >
                      {String(opt.name || "")}
                    </p>
                    <p
                      className="font-bold leading-tight"
                      style={{
                        color: previewText,
                        fontFamily: `'${String(opt.heading)}', sans-serif`,
                        fontSize: "18px",
                      }}
                    >
                      {String(opt.heading)}
                    </p>
                    <p
                      className="leading-relaxed"
                      style={{
                        color: previewMuted,
                        fontFamily: `'${String(opt.body)}', sans-serif`,
                        fontSize: "13px",
                      }}
                    >
                      {String(opt.body)} — {String(opt.mood || "")}
                    </p>
                    {String(opt.koreanFont || "") && (
                      <p
                        style={{
                          color: previewText,
                          fontFamily: `'${String(opt.koreanFont)}', sans-serif`,
                          fontSize: "13px",
                        }}
                      >
                        한국어 프리뷰 텍스트
                      </p>
                    )}
                    {/* Mini color strip */}
                    {selectedColors && (
                      <div className="flex gap-0.5 mt-2 pt-2" style={{ borderTop: `1px solid ${previewBorder}` }}>
                        {Object.entries(selectedColors).slice(0, 7).map(([key, hex]) => (
                          <div key={key} className="flex-1 text-center">
                            <div className="h-3 rounded-sm" style={{ backgroundColor: hex, border: `1px solid ${previewBorder}` }} />
                            <span style={{ fontSize: "8px", color: previewMuted }}>{key.charAt(0).toUpperCase()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Color Palettes */}
      {colors.length > 0 && (
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
            Color Palettes ({colors.length})
          </p>
          <div className="grid grid-cols-3 gap-2">
            {colors.slice(0, 9).map((opt, i) => {
              const optColors = (opt.colors || {}) as Record<string, string>;
              const isSelected = selectedColors && JSON.stringify(selectedColors) === JSON.stringify(optColors);
              const isRecommended = selectedFontName && opt.matchingFont === selectedFontName;

              return (
                <button
                  key={i}
                  onClick={() =>
                    onUpdateDesign((ds) => ({
                      ...ds,
                      selectedColors: optColors,
                    }))
                  }
                  className={`text-left rounded-lg p-2.5 border-2 transition-all ${
                    isSelected
                      ? "border-blue-500 bg-blue-500/10"
                      : isRecommended
                        ? "border-emerald-500/50 bg-emerald-500/5"
                        : "border-zinc-800/50 bg-zinc-900/50 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-xs text-zinc-300 truncate flex-1">{String(opt.name || `Option ${i + 1}`)}</span>
                    {isSelected && <span className="text-xs text-blue-400 shrink-0">&#10003;</span>}
                    {isRecommended && !isSelected && <span className="text-xs text-emerald-400 shrink-0">Match</span>}
                  </div>
                  <div className="flex gap-0.5">
                    {Object.entries(optColors).map(([key, hex]) => (
                      <div
                        key={key}
                        className="flex-1 h-6 first:rounded-l last:rounded-r"
                        style={{ backgroundColor: hex }}
                        title={`${key}: ${hex}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-zinc-600 mt-1.5 truncate">{String(opt.mood || "")}</p>
                </button>
              );
            })}
          </div>

          {/* Selected palette detail */}
          {selectedColors && (
            <div className="mt-3 bg-zinc-900/50 border border-zinc-800/40 rounded-lg p-3">
              <p className="text-xs text-zinc-500 mb-2">Selected Palette</p>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(selectedColors).map(([key, hex]) => (
                  <div key={key} className="text-center">
                    <div className="h-10 rounded-md border border-zinc-700/30" style={{ backgroundColor: hex }} />
                    <span className="text-xs text-zinc-600 mt-1 block uppercase">{key}</span>
                    <span className="text-xs text-zinc-700 font-mono">{hex}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      </div>
      )}
    </div>
  );
}

// ── Header / Footer Selector ──

const HEADER_STYLES = [
  { id: "standard",    label: "Standard",    desc: "Logo left + Nav right" },
  { id: "centered",    label: "Centered",    desc: "Logo center + Nav below" },
  { id: "minimal",     label: "Minimal",     desc: "Logo left + Hamburger right" },
  { id: "transparent", label: "Transparent", desc: "Over hero, white text" },
];

const FOOTER_STYLES = [
  { id: "3-column",   label: "3-Column",     desc: "Company + Links + Contact" },
  { id: "4-column",   label: "4-Column",     desc: "About + Products + Support + Social" },
  { id: "simple",     label: "Simple",       desc: "Logo + Links + Copyright" },
  { id: "cta-footer", label: "CTA + Footer", desc: "CTA banner + footer columns" },
  { id: "minimal",    label: "Minimal",      desc: "Copyright only" },
];

// ── Hero Design Panel (DesignStep / "hero" tab) ──────────────────
// Lets the user pick a hero variant + sizing for (a) the home page and
// (b) every sub-page, plus opt-in toggles for contact / location pages.
// The selection lands in designSystem.heroStyles which build-pages reads
// when synthesising hero rows for pages whose LLM output skipped them.

interface HeroVariantDef {
  id: 'image-overlay' | 'split-image' | 'page-hero' | 'text-only';
  label: string;
  desc: string;
  // Which roles this variant is valid for.
  allowedFor: Array<'home' | 'sub'>;
}

const HERO_VARIANTS: HeroVariantDef[] = [
  { id: 'image-overlay', label: 'Image Overlay', desc: 'Full-bleed image with text on top — high impact', allowedFor: ['home', 'sub'] },
  { id: 'split-image',   label: 'Split Image',   desc: '50/50 text + side image — works for stories',     allowedFor: ['home', 'sub'] },
  { id: 'page-hero',     label: 'Page Hero',     desc: 'Compact header strip — default for sub-pages',     allowedFor: ['sub']         },
  { id: 'text-only',     label: 'Text Only',     desc: 'No image, color or gradient bg — minimal',         allowedFor: ['home', 'sub'] },
];

const HERO_HEIGHTS = ['sm', 'md', 'lg', 'full'] as const;
const HERO_WIDTHS  = ['contained', 'full-bleed'] as const;

interface HeroStyleSelection {
  variant: HeroVariantDef['id'];
  height: typeof HERO_HEIGHTS[number];
  width:  typeof HERO_WIDTHS[number];
  textAlign: 'left' | 'center' | 'right';
}

const DEFAULT_HOME_HERO: HeroStyleSelection = { variant: 'image-overlay', height: 'lg',  width: 'full-bleed', textAlign: 'center' };
const DEFAULT_SUB_HERO:  HeroStyleSelection = { variant: 'page-hero',     height: 'sm',  width: 'full-bleed', textAlign: 'left'   };

// Industry → opinionated default heroStyles. Used by the "Auto-pick" button
// and on first entry when designSystem.heroStyles is empty.
function autoPickHeroStyles(industry: string): {
  homeHero: HeroStyleSelection;
  subPageHero: HeroStyleSelection;
} {
  const ind = (industry || '').toLowerCase();
  // Visually rich industries → image-heavy home, split sub-pages.
  if (/(restaurant|food|hospitality|hotel|travel|tour|gallery|art|fashion|wedding|event)/.test(ind)) {
    return {
      homeHero: { ...DEFAULT_HOME_HERO, variant: 'image-overlay', height: 'full' },
      subPageHero: { ...DEFAULT_SUB_HERO, variant: 'page-hero', height: 'sm' },
    };
  }
  // Minimal / corporate / SaaS → cleaner hero, no full-bleed image needed.
  if (/(saas|software|tech|b2b|consulting|finance|law|accounting|insurance)/.test(ind)) {
    return {
      homeHero: { variant: 'text-only', height: 'lg', width: 'full-bleed', textAlign: 'center' },
      subPageHero: { ...DEFAULT_SUB_HERO },
    };
  }
  // Wholesale / supply / logistics — split-image story works well.
  if (/(wholesale|supply|distrib|logistics|manufactur|industrial|trade|export|import)/.test(ind)) {
    return {
      homeHero: { variant: 'split-image', height: 'lg', width: 'contained', textAlign: 'left' },
      subPageHero: { ...DEFAULT_SUB_HERO },
    };
  }
  // Otherwise — sensible default.
  return { homeHero: DEFAULT_HOME_HERO, subPageHero: DEFAULT_SUB_HERO };
}

function HeroDesignPanel({
  designSystem,
  onUpdateDesign,
  industry,
}: {
  designSystem: Record<string, unknown>;
  onUpdateDesign: (updater: Record<string, unknown> | ((ds: Record<string, unknown>) => Record<string, unknown>)) => void;
  industry: string;
}) {
  const heroStyles = (designSystem.heroStyles as Record<string, unknown> | undefined) ?? {};
  const homeHero = (heroStyles.homeHero as HeroStyleSelection | undefined) ?? DEFAULT_HOME_HERO;
  const subPageHero = (heroStyles.subPageHero as HeroStyleSelection | undefined) ?? DEFAULT_SUB_HERO;
  const contactHero = heroStyles.contactHero as { variant?: string } | null | undefined;
  const locationHero = heroStyles.locationHero as { variant?: string } | null | undefined;

  // Live design tokens for the mini previews — NO hard-coded hex
  // fallbacks. When the AI Designer hasn't run yet the preview renders
  // with empty inline styles (inherits parent), making it obvious to
  // the operator that the design system is not set. Shipping
  // '#0e0e10' / '#3b82f6' / 'Inter' fallbacks made every preview look
  // identical regardless of brand. See feedback-no-hardcoded-defaults.
  const colors = (designSystem.selectedColors as Record<string, string> | undefined) ?? {};
  const previewBg = colors.background || '';
  const previewSurface = colors.surface || '';
  const previewText = colors.text || '';
  const previewMuted = colors.muted || '';
  const previewPrimary = colors.primary || '';
  const previewBorder = colors.border || '';
  const heading = (designSystem.selectedHeadingFont as string) || '';

  function update(path: 'homeHero' | 'subPageHero', patch: Partial<HeroStyleSelection>) {
    onUpdateDesign((ds) => ({
      ...ds,
      heroStyles: {
        ...((ds.heroStyles as object) ?? {}),
        [path]: {
          ...((ds.heroStyles as Record<string, unknown> | undefined)?.[path] as object ?? {}),
          ...patch,
        },
      },
    }));
  }

  function toggleSpecial(path: 'contactHero' | 'locationHero', defaultVariant: 'form-split' | 'map-split') {
    onUpdateDesign((ds) => {
      const cur = (ds.heroStyles as Record<string, unknown> | undefined)?.[path];
      return {
        ...ds,
        heroStyles: {
          ...((ds.heroStyles as object) ?? {}),
          [path]: cur ? null : { variant: defaultVariant },
        },
      };
    });
  }

  function autoPick() {
    const picked = autoPickHeroStyles(industry);
    onUpdateDesign((ds) => ({
      ...ds,
      heroStyles: {
        ...((ds.heroStyles as object) ?? {}),
        homeHero: picked.homeHero,
        subPageHero: picked.subPageHero,
      },
    }));
  }

  const previewProps = {
    bg: previewBg,
    surface: previewSurface,
    text: previewText,
    muted: previewMuted,
    primary: previewPrimary,
    border: previewBorder,
    heading,
  };

  return (
    <div className="space-y-5">
      {/* Header + Auto-pick */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-zinc-500">
          Hero 디자인을 페이지별로 지정하세요. 빌드 시 LLM이 hero를 빠뜨리면 여기 설정값이
          자동 적용됩니다.
        </p>
        <button
          onClick={autoPick}
          className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-md transition-colors active:scale-[0.97]"
          title="현재 industry에 맞는 hero 조합을 한 번에 적용"
        >
          ✨ Auto-pick by industry
        </button>
      </div>

      {/* Home Page Hero */}
      <HeroSelectionGroup
        label="Home Page Hero"
        sub="홈 페이지의 첫 인상. 풀스크린 임팩트 또는 깔끔한 미니멀."
        role="home"
        selection={homeHero}
        onChange={(patch) => update('homeHero', patch)}
        preview={previewProps}
      />

      <hr className="border-zinc-800/50" />

      {/* Sub-page Hero */}
      <HeroSelectionGroup
        label="Sub-page Hero"
        sub="모든 서브 페이지의 default. 보통 컴팩트한 헤더 스트립."
        role="sub"
        selection={subPageHero}
        onChange={(patch) => update('subPageHero', patch)}
        preview={previewProps}
      />

      <hr className="border-zinc-800/50" />

      {/* Special Pages */}
      <div className="space-y-2">
        <p className="text-xs text-zinc-500 uppercase tracking-wider">Special Pages</p>
        <label className="flex items-start gap-3 cursor-pointer p-2 rounded hover:bg-zinc-800/30 transition-colors">
          <input
            type="checkbox"
            checked={!!contactHero}
            onChange={() => toggleSpecial('contactHero', 'form-split')}
            className="mt-0.5"
          />
          <div className="flex-1 text-sm">
            <div className="text-zinc-200">Use form hero on /contact pages</div>
            <div className="text-xs text-zinc-500 mt-0.5">
              연락처 / 견적 / 상담 페이지의 hero에 폼을 띄움 (현재는 page-hero로 폴백, 폼 렌더러 추후).
            </div>
          </div>
        </label>
        <label className="flex items-start gap-3 cursor-pointer p-2 rounded hover:bg-zinc-800/30 transition-colors">
          <input
            type="checkbox"
            checked={!!locationHero}
            onChange={() => toggleSpecial('locationHero', 'map-split')}
            className="mt-0.5"
          />
          <div className="flex-1 text-sm">
            <div className="text-zinc-200">Use map hero on /location pages</div>
            <div className="text-xs text-zinc-500 mt-0.5">
              지점 / 매장 위치 페이지의 hero에 지도를 띄움 (현재는 page-hero로 폴백, 지도 렌더러 추후).
            </div>
          </div>
        </label>
      </div>
    </div>
  );
}

function HeroSelectionGroup({
  label,
  sub,
  role,
  selection,
  onChange,
  preview,
}: {
  label: string;
  sub: string;
  role: 'home' | 'sub';
  selection: HeroStyleSelection;
  onChange: (patch: Partial<HeroStyleSelection>) => void;
  preview: { bg: string; surface: string; text: string; muted: string; primary: string; border: string; heading: string };
}) {
  const variants = HERO_VARIANTS.filter((v) => v.allowedFor.includes(role));
  return (
    <div>
      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-xs text-zinc-600 mb-3">{sub}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {variants.map((v) => (
          <button
            key={v.id}
            onClick={() => onChange({ variant: v.id })}
            className={`text-left rounded-lg p-2 border-2 transition-all ${
              selection.variant === v.id
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-zinc-800/50 bg-zinc-900/50 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-xs text-zinc-200 font-medium truncate">{v.label}</span>
              {selection.variant === v.id && (
                <span className="text-xs text-blue-400 shrink-0">✓</span>
              )}
            </div>
            <HeroVariantMiniPreview variant={v.id} preview={preview} />
            <p className="text-[10px] text-zinc-600 mt-1.5 leading-tight line-clamp-2">{v.desc}</p>
          </button>
        ))}
      </div>

      {/* Height + Width controls */}
      <div className="grid grid-cols-2 gap-3 mt-3">
        <div>
          <p className="text-xs text-zinc-500 mb-1.5">Height</p>
          <div className="flex gap-1">
            {HERO_HEIGHTS.map((h) => (
              <button
                key={h}
                onClick={() => onChange({ height: h })}
                className={`flex-1 px-2 py-1.5 rounded text-xs border transition-all ${
                  selection.height === h
                    ? 'bg-blue-500/15 text-blue-400 border-blue-500/40'
                    : 'bg-zinc-800/40 text-zinc-500 border-zinc-700/30'
                }`}
              >
                {h}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-1.5">Width</p>
          <div className="flex gap-1">
            {HERO_WIDTHS.map((w) => (
              <button
                key={w}
                onClick={() => onChange({ width: w })}
                className={`flex-1 px-2 py-1.5 rounded text-xs border transition-all ${
                  selection.width === w
                    ? 'bg-blue-500/15 text-blue-400 border-blue-500/40'
                    : 'bg-zinc-800/40 text-zinc-500 border-zinc-700/30'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroVariantMiniPreview({
  variant,
  preview,
}: {
  variant: HeroVariantDef['id'];
  preview: { bg: string; surface: string; text: string; muted: string; primary: string; border: string; heading: string };
}) {
  const baseStyle: React.CSSProperties = {
    backgroundColor: preview.surface,
    border: `1px solid ${preview.border}`,
    fontFamily: `'${preview.heading}', sans-serif`,
  };

  if (variant === 'image-overlay') {
    return (
      <div
        style={{
          ...baseStyle,
          height: 60,
          background: `linear-gradient(135deg, ${preview.primary}99, #00000099), linear-gradient(135deg, ${preview.primary}, ${preview.surface})`,
        }}
        className="rounded relative"
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center text-[8px] text-white">
          <div className="font-bold">HEADLINE</div>
          <div className="opacity-70 mt-0.5">subtitle</div>
        </div>
      </div>
    );
  }
  if (variant === 'split-image') {
    return (
      <div style={baseStyle} className="rounded h-[60px] flex">
        <div className="flex-1 flex flex-col justify-center px-1.5 text-[8px]" style={{ color: preview.text }}>
          <div className="font-bold">Title</div>
          <div className="opacity-60">copy</div>
        </div>
        <div className="flex-1" style={{ backgroundColor: preview.primary, opacity: 0.4 }} />
      </div>
    );
  }
  if (variant === 'page-hero') {
    return (
      <div style={baseStyle} className="rounded h-[28px] flex items-center px-2 mt-4 mb-4">
        <span className="text-[9px] font-bold" style={{ color: preview.text }}>Page Title</span>
      </div>
    );
  }
  // text-only
  return (
    <div
      style={{
        ...baseStyle,
        height: 60,
        background: `linear-gradient(135deg, ${preview.primary}55, ${preview.surface})`,
      }}
      className="rounded flex flex-col items-center justify-center"
    >
      <div className="text-[8px] font-bold" style={{ color: preview.text }}>HEADLINE</div>
      <div className="text-[7px] opacity-60" style={{ color: preview.text }}>no image</div>
    </div>
  );
}

/** Header / Footer 비주얼 미리보기 — 선택된 컬러+폰트가 실제로 적용된 mini mock. */
function HeaderPreview({
  variant,
  brand,
  bg,
  fg,
  primary,
  border,
  heading,
  body,
}: {
  variant: string;
  brand: string;
  bg: string;
  fg: string;
  primary: string;
  border: string;
  heading: string;
  body: string;
}) {
  const navItems = ["Home", "About", "Services", "Contact"];
  const baseStyle: React.CSSProperties = {
    backgroundColor: bg,
    color: fg,
    border: `1px solid ${border}`,
    fontFamily: `'${body}', sans-serif`,
  };
  const logoStyle: React.CSSProperties = {
    fontFamily: `'${heading}', sans-serif`,
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: "-0.01em",
  };

  if (variant === "centered") {
    return (
      <div style={baseStyle} className="rounded px-3 py-2.5 text-center">
        <div style={logoStyle}>{brand}</div>
        <nav className="flex justify-center gap-3 mt-1.5 text-[11px]" style={{ opacity: 0.75 }}>
          {navItems.map((n) => <span key={n}>{n}</span>)}
        </nav>
      </div>
    );
  }
  if (variant === "minimal") {
    return (
      <div style={baseStyle} className="rounded px-3 py-2.5 flex items-center justify-between">
        <span style={logoStyle}>{brand}</span>
        <span style={{ fontSize: 14 }}>☰</span>
      </div>
    );
  }
  if (variant === "transparent") {
    return (
      <div
        className="relative rounded h-16 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${primary}aa, #00000099), linear-gradient(135deg, ${primary}, ${fg})`,
          border: `1px solid ${border}`,
        }}
      >
        <div className="absolute inset-0 flex items-center justify-between px-3" style={{ color: "#fff" }}>
          <span style={{ ...logoStyle, color: "#fff" }}>{brand}</span>
          <nav className="flex gap-3 text-[11px]" style={{ opacity: 0.9 }}>
            {navItems.slice(0, 3).map((n) => <span key={n}>{n}</span>)}
          </nav>
        </div>
        <div className="absolute bottom-1.5 right-2 text-[9px]" style={{ color: "#fff", opacity: 0.5 }}>
          (overlay on hero)
        </div>
      </div>
    );
  }
  // standard
  return (
    <div style={baseStyle} className="rounded px-3 py-2.5 flex items-center justify-between">
      <span style={logoStyle}>{brand}</span>
      <nav className="flex gap-3 text-[11px]" style={{ opacity: 0.75 }}>
        {navItems.map((n) => <span key={n}>{n}</span>)}
      </nav>
    </div>
  );
}

function FooterCol({
  title,
  items,
  headStyle,
  muted,
}: {
  title: string;
  items: string[];
  headStyle: React.CSSProperties;
  muted: React.CSSProperties;
}) {
  return (
    <div className="space-y-0.5">
      <div style={headStyle}>{title}</div>
      {items.map((i) => <div key={i} style={muted}>{i}</div>)}
    </div>
  );
}

function FooterPreview({
  variant,
  brand,
  bg,
  fg,
  primary,
  surface,
  border,
  heading,
  body,
}: {
  variant: string;
  brand: string;
  bg: string;
  fg: string;
  primary: string;
  surface: string;
  border: string;
  heading: string;
  body: string;
}) {
  const baseStyle: React.CSSProperties = {
    backgroundColor: surface,
    color: fg,
    border: `1px solid ${border}`,
    fontFamily: `'${body}', sans-serif`,
  };
  const headStyle: React.CSSProperties = {
    fontFamily: `'${heading}', sans-serif`,
    fontWeight: 600,
    fontSize: 11,
  };
  const muted = { opacity: 0.65, fontSize: 10 } as React.CSSProperties;

  if (variant === "minimal") {
    return (
      <div style={baseStyle} className="rounded px-3 py-2.5 text-center text-[11px]" >
        <span style={muted}>© 2024 {brand}. All rights reserved.</span>
      </div>
    );
  }
  if (variant === "simple") {
    return (
      <div style={baseStyle} className="rounded px-3 py-2.5 space-y-1.5">
        <div className="flex items-center justify-between">
          <span style={{ ...headStyle, fontSize: 13 }}>{brand}</span>
          <nav className="flex gap-3 text-[11px]" style={muted}>
            <span>Home</span><span>About</span><span>Contact</span>
          </nav>
        </div>
        <div className="text-center text-[10px]" style={muted}>© 2024 {brand}.</div>
      </div>
    );
  }
  if (variant === "cta-footer") {
    return (
      <div className="space-y-1.5">
        <div
          className="rounded px-3 py-2.5 flex items-center justify-between"
          style={{ backgroundColor: primary, color: bg, border: `1px solid ${primary}` }}
        >
          <span style={{ ...headStyle, color: bg, fontSize: 12 }}>Ready to start?</span>
          <button
            className="text-[10px] px-2 py-1 rounded"
            style={{ backgroundColor: bg, color: primary, fontWeight: 600 }}
          >
            Get Started
          </button>
        </div>
        <div style={baseStyle} className="rounded px-3 py-2.5 grid grid-cols-3 gap-2 text-[10px]">
          <FooterCol title="About" items={["Story", "Team"]} headStyle={headStyle} muted={muted} />
          <FooterCol title="Links" items={["Blog", "Careers"]} headStyle={headStyle} muted={muted} />
          <FooterCol title="Contact" items={["Email", "Phone"]} headStyle={headStyle} muted={muted} />
        </div>
      </div>
    );
  }
  if (variant === "4-column") {
    return (
      <div style={baseStyle} className="rounded px-3 py-2.5 space-y-1.5">
        <div className="grid grid-cols-4 gap-2 text-[10px]">
          <FooterCol title="About" items={["Story", "Team"]} headStyle={headStyle} muted={muted} />
          <FooterCol title="Products" items={["Features", "Pricing"]} headStyle={headStyle} muted={muted} />
          <FooterCol title="Support" items={["Docs", "FAQ"]} headStyle={headStyle} muted={muted} />
          <FooterCol title="Social" items={["X", "Insta"]} headStyle={headStyle} muted={muted} />
        </div>
        <div className="text-center text-[10px] pt-1 border-t" style={{ ...muted, borderColor: border }}>
          © 2024 {brand}.
        </div>
      </div>
    );
  }
  // 3-column (default)
  return (
    <div style={baseStyle} className="rounded px-3 py-2.5 space-y-1.5">
      <div className="grid grid-cols-3 gap-2 text-[10px]">
        <FooterCol title="Company" items={["About", "Team", "Careers"]} headStyle={headStyle} muted={muted} />
        <FooterCol title="Links" items={["Blog", "Pricing"]} headStyle={headStyle} muted={muted} />
        <FooterCol title="Contact" items={["Email", "Phone"]} headStyle={headStyle} muted={muted} />
      </div>
      <div className="text-center text-[10px] pt-1 border-t" style={{ ...muted, borderColor: border }}>
        © 2024 {brand}. All rights reserved.
      </div>
    </div>
  );
}

function HeaderFooterSelector({
  type,
  selected,
  onSelect,
  designSystem,
}: {
  type: "header" | "footer";
  selected: string;
  onSelect: (style: string) => void;
  designSystem: Record<string, unknown>;
}) {
  const options = type === "header" ? HEADER_STYLES : FOOTER_STYLES;

  // 미리보기에 쓰이는 디자인 토큰. 비어 있으면 합리적 default fallback.
  const colors = (designSystem.selectedColors as Record<string, string> | undefined) || {};
  const bg = colors.background || "#ffffff";
  // No hard-coded hex / font fallbacks — preview reflects whatever the
  // AI Designer produced (or nothing, if it hasn't run). Operator should
  // see "design not configured" rather than identical demo palette across
  // every business. See feedback-no-hardcoded-defaults.
  const fg = colors.text || '';
  const surface = colors.surface || '';
  const border = colors.border || '';
  const primary = colors.primary || '';
  const heading = (designSystem.selectedHeadingFont as string) || '';
  const body = (designSystem.selectedBodyFont as string) || '';
  // Brand name preview pulls from the operator-supplied business name —
  // never a fixture string like "Your Brand".
  const brand = '';

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
        {type === "header" ? "Header Style" : "Footer Style"}
      </p>
      {options.map((opt) => {
        const isSelected = selected === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            className={`w-full text-left rounded-lg p-3 border-2 transition-all ${
              isSelected
                ? "border-blue-500 bg-blue-500/10"
                : "border-zinc-800/50 bg-zinc-900/50 hover:border-zinc-700"
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm text-zinc-200 font-medium">{opt.label}</span>
              {isSelected && (
                <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">Selected</span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mb-2">{opt.desc}</p>
            {/* 실제 디자인 토큰을 적용한 mini visual preview */}
            <div className="bg-zinc-950/40 rounded p-2">
              {type === "header" ? (
                <HeaderPreview
                  variant={opt.id}
                  brand={brand}
                  bg={bg}
                  fg={fg}
                  primary={primary}
                  border={border}
                  heading={heading}
                  body={body}
                />
              ) : (
                <FooterPreview
                  variant={opt.id}
                  brand={brand}
                  bg={bg}
                  fg={fg}
                  primary={primary}
                  surface={surface}
                  border={border}
                  heading={heading}
                  body={body}
                />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Sitemap Step ──

import { DndContext as SitemapDnd, closestCenter, PointerSensor as SitemapSensor, useSensor as useSitemapSensor, useSensors as useSitemapSensors, type DragEndEvent as SitemapDragEnd } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortablePageItem({
  page,
  isEditing,
  onStartEdit,
  onRename,
  onRemove,
  isChild,
}: {
  page: { name: string; slug: string; parent?: string };
  isEditing: boolean;
  onStartEdit: () => void;
  onRename: (name: string) => void;
  onRemove: () => void;
  isChild?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.slug });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-1.5 group ${
        isChild
          ? "pl-6 bg-zinc-900/20"
          : "bg-zinc-900/30 border border-zinc-800/30 rounded"
      } ${isDragging ? "ring-1 ring-blue-500/30 z-10" : ""}`}
    >
      {/* Drag handle */}
      <span {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-zinc-700 hover:text-zinc-400 select-none text-xs">
        ⠿
      </span>

      <span className={`text-sm flex-1 ${isChild ? "text-zinc-400" : "text-zinc-300"}`}>
        {isEditing ? (
          <input
            autoFocus
            defaultValue={page.name}
            onBlur={(e) => onRename(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onRename((e.target as HTMLInputElement).value); if (e.key === "Escape") onRename(page.name); }}
            className="bg-zinc-700 text-zinc-200 px-1.5 py-0.5 rounded text-sm outline-none w-full"
          />
        ) : (
          <span onDoubleClick={onStartEdit} className="cursor-text">{page.name}</span>
        )}
      </span>
      <span className="text-xs text-zinc-700 font-mono truncate max-w-[100px]">{page.slug}</span>
      <button onClick={onRemove} className="text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs shrink-0">&times;</button>
    </div>
  );
}

function SitemapStep({
  sitemap,
  onUpdate,
  recommended,
  contentMap,
  loading,
  pageNotes,
  onPageNotesChange,
}: {
  sitemap: Array<{ name: string; slug: string; parent?: string }>;
  onUpdate: (pages: Array<{ name: string; slug: string; parent?: string }>) => void;
  recommended: Array<{ name: string; slug: string; parent?: string }>;
  contentMap: ContentMap;
  loading: boolean;
  pageNotes: Record<string, string>;
  onPageNotesChange: (next: Record<string, string>) => void;
}) {
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [newPageName, setNewPageName] = useState("");
  const [newPageParent, setNewPageParent] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);
  const sensors = useSitemapSensors(useSitemapSensor(SitemapSensor, { activationConstraint: { distance: 5 } }));

  // Recommended chips: AI 분석으로 받은 페이지 풀에서 한 번 클릭으로 sitemap에 추가/제거.
  // 이미 sitemap에 있는 슬러그는 비활성 상태로 표시되어 중복 추가를 방지.
  const sitemapSlugSet = new Set(sitemap.map((p) => p.slug));
  const toggleRecommended = (page: { name: string; slug: string; parent?: string }) => {
    if (sitemapSlugSet.has(page.slug)) {
      // 이미 있으면 제거 (자식 페이지도 함께 제거)
      onUpdate(sitemap.filter((p) => p.slug !== page.slug && p.parent !== page.slug));
    } else {
      onUpdate([...sitemap, page]);
    }
  };
  const applyAllRecommended = () => {
    const merged = [...sitemap];
    for (const r of recommended) {
      if (!merged.some((p) => p.slug === r.slug)) merged.push(r);
    }
    onUpdate(merged);
  };
  const clearAllSitemap = () => onUpdate([]);

  const topLevel = sitemap.filter((p) => !p.parent);
  const menuGroups = topLevel.filter((p) => p.slug.startsWith("#"));
  const standalonePages = topLevel.filter((p) => !p.slug.startsWith("#"));

  const removePage = (slug: string) => {
    onUpdate(sitemap.filter((p) => p.slug !== slug && p.parent !== slug));
  };

  const renamePage = (slug: string, newName: string) => {
    onUpdate(sitemap.map((p) => (p.slug === slug ? { ...p, name: newName } : p)));
    setEditingSlug(null);
  };

  const addPage = () => {
    if (!newPageName.trim()) return;
    const slug = newPageParent
      ? `${newPageParent}/${newPageName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`
      : `/${newPageName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`;
    onUpdate([...sitemap, { name: newPageName.trim(), slug, ...(newPageParent ? { parent: newPageParent } : {}) }]);
    setNewPageName("");
    setNewPageParent("");
  };


  // 추천 풀도 비어있고 sitemap도 비어있으면 generate 안내만 표시.
  // 추천이 있는데 사용자가 모두 제거한 상태라면 칩과 add 폼은 계속 보여줘야
  // 다시 추가가 가능하므로 여기서 early return하지 않는다.
  if (sitemap.length === 0 && recommended.length === 0) {
    if (loading) {
      return (
        <AILoadingIndicator
          label="AI가 사이트맵을 설계 중…"
          sublabel="Marketing Strategy + Business Info를 바탕으로 페이지 구성을 추천합니다"
          estimateSec={20}
        />
      );
    }
    return <p className="text-sm text-zinc-600">Click Next to generate</p>;
  }

  const handleDragEnd = (event: SitemapDragEnd) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = sitemap.findIndex((p) => p.slug === active.id);
    const newIdx = sitemap.findIndex((p) => p.slug === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const arr = [...sitemap];
    const [moved] = arr.splice(oldIdx, 1);
    if (!moved) return;
    arr.splice(newIdx, 0, moved);
    onUpdate(arr);
  };

  // Build display order: groups with children interleaved
  const displayItems: Array<{ page: { name: string; slug: string; parent?: string }; isChild: boolean; isGroupHeader: boolean; childCount: number }> = [];
  for (const group of menuGroups) {
    const children = sitemap.filter((p) => p.parent === group.slug);
    displayItems.push({ page: group, isChild: false, isGroupHeader: true, childCount: children.length });
    for (const child of children) {
      displayItems.push({ page: child, isChild: true, isGroupHeader: false, childCount: 0 });
    }
  }
  for (const page of standalonePages) {
    displayItems.push({ page, isChild: false, isGroupHeader: false, childCount: 0 });
  }

  return (
    <div className="space-y-3">
      {/* AI 추천 페이지 칩 풀 — 클릭으로 사이트맵에 추가/제거 */}
      {recommended.length > 0 && (
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-zinc-400">
              <span className="text-blue-400">AI 추천</span>
              <span className="text-zinc-600 ml-1.5">({recommended.length}개 · 클릭으로 추가/제거)</span>
            </p>
            <div className="flex gap-1">
              <button
                onClick={applyAllRecommended}
                className="text-xs text-blue-400 hover:text-blue-300 px-1.5"
              >
                전체 추가
              </button>
              <span className="text-zinc-700">·</span>
              <button
                onClick={clearAllSitemap}
                className="text-xs text-zinc-500 hover:text-red-400 px-1.5"
              >
                초기화
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {recommended.map((page) => {
              const isInSitemap = sitemapSlugSet.has(page.slug);
              const isMenuGroup = page.slug.startsWith("#");
              const cnt = contentMap[page.slug];
              const sectionCount = cnt && Array.isArray(cnt.sections) ? cnt.sections.length : 0;
              return (
                <button
                  key={page.slug}
                  onClick={() => toggleRecommended(page)}
                  title={
                    sectionCount > 0
                      ? `${cnt?.pageName || page.name} — ${sectionCount}개 섹션 콘텐츠 포함`
                      : page.slug
                  }
                  className={`group inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all active:scale-[0.97] ${
                    isInSitemap
                      ? isMenuGroup
                        ? "bg-purple-500/15 text-purple-300 border-purple-500/40"
                        : "bg-blue-500/15 text-blue-300 border-blue-500/40"
                      : "bg-zinc-800/40 text-zinc-400 border-zinc-700/40 hover:border-zinc-600 hover:text-zinc-200"
                  }`}
                >
                  {isInSitemap && <span className="text-[10px]">&#10003;</span>}
                  <span>{page.name}</span>
                  {sectionCount > 0 && (
                    <span
                      className="text-[10px] text-emerald-400/70"
                      title={`${sectionCount}개 섹션 콘텐츠 포함`}
                    >
                      +{sectionCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500 uppercase tracking-wider">
          Menu Structure ({sitemap.length} pages)
        </p>
        <p className="text-xs text-zinc-600">Drag to reorder. Double-click to edit.</p>
      </div>

      {/* Sortable menu tree */}
      <SitemapDnd sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={displayItems.map((d) => d.page.slug)} strategy={verticalListSortingStrategy}>
          <div className="space-y-0.5">
            {displayItems.map((item) => (
              <div key={item.page.slug}>
                {item.isGroupHeader && (
                  <div className="flex items-center gap-1 px-2 pt-2 pb-0.5">
                    <span className="text-xs text-zinc-600 uppercase tracking-wider font-medium">{item.page.name}</span>
                    <span className="text-xs text-zinc-700">{item.childCount}</span>
                    <div className="flex-1" />
                    <button onClick={() => removePage(item.page.slug)} className="text-zinc-700 hover:text-red-400 text-xs">&times;</button>
                  </div>
                )}
                {!item.isGroupHeader && (
                  <SortablePageItem
                    page={item.page}
                    isEditing={editingSlug === item.page.slug}
                    onStartEdit={() => setEditingSlug(item.page.slug)}
                    onRename={(name) => renamePage(item.page.slug, name)}
                    onRemove={() => removePage(item.page.slug)}
                    isChild={item.isChild}
                  />
                )}
              </div>
            ))}
          </div>
        </SortableContext>
      </SitemapDnd>

      {/* Add page */}
      <div className="bg-zinc-800/20 border border-zinc-700/20 rounded-lg p-3 space-y-2">
        <p className="text-xs text-zinc-500">Add Page</p>
        <div className="flex gap-2">
          <input
            value={newPageName}
            onChange={(e) => setNewPageName(e.target.value)}
            placeholder="Page name"
            className="flex-1 bg-zinc-800/40 border border-zinc-700/30 text-zinc-200 px-2.5 py-1.5 rounded text-sm outline-none focus:border-blue-500/40 placeholder-zinc-600"
            onKeyDown={(e) => { if (e.key === "Enter") addPage(); }}
          />
          <select
            value={newPageParent}
            onChange={(e) => setNewPageParent(e.target.value)}
            className="bg-zinc-800/40 border border-zinc-700/30 text-zinc-400 px-2 py-1.5 rounded text-sm outline-none"
          >
            <option value="">Top level</option>
            {menuGroups.map((g) => (
              <option key={g.slug} value={g.slug}>{g.name}</option>
            ))}
          </select>
          <button
            onClick={addPage}
            disabled={!newPageName.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 text-white text-sm px-3 py-1.5 rounded transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Optional per-page operator instructions. Collapsed by default;
          empty fields change nothing — content generation behaves
          exactly as before unless the operator writes a note. */}
      {(() => {
        const notePages = sitemap.filter((p) => !p.slug.startsWith("#"));
        if (notePages.length === 0) return null;
        const filledCount = notePages.filter(
          (p) => (pageNotes[p.slug] ?? "").trim().length > 0,
        ).length;
        const setNote = (slug: string, v: string) =>
          onPageNotesChange({ ...pageNotes, [slug]: v });
        return (
          <div className="bg-zinc-800/20 border border-zinc-700/20 rounded-lg">
            <button
              onClick={() => setNotesOpen((o) => !o)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-left"
            >
              <span className="text-xs text-zinc-400">
                페이지별 특별 지시{" "}
                <span className="text-zinc-600">(선택)</span>
                {filledCount > 0 && (
                  <span className="ml-1.5 text-emerald-400/80">
                    · {filledCount}개 작성됨
                  </span>
                )}
              </span>
              <span className="text-zinc-600 text-xs">{notesOpen ? "▲" : "▼"}</span>
            </button>
            {notesOpen && (
              <div className="px-3 pb-3 space-y-2">
                <p className="text-[11px] text-zinc-600 leading-relaxed">
                  특정 페이지에만 적용할 지시를 적으면 그 페이지 콘텐츠
                  생성 시 최우선으로 반영됩니다. 예: &quot;소개 페이지는
                  지속가능성과 인증을 강조&quot;. 비워두면 기존과 동일하게
                  생성됩니다.
                </p>
                {notePages.map((p) => (
                  <div key={p.slug} className="space-y-1">
                    <label className="text-[11px] text-zinc-500 font-mono">
                      {p.name}{" "}
                      <span className="text-zinc-700">{p.slug}</span>
                    </label>
                    <textarea
                      value={pageNotes[p.slug] ?? ""}
                      onChange={(e) => setNote(p.slug, e.target.value)}
                      rows={2}
                      placeholder="이 페이지에만 적용할 지시 (선택)"
                      className="w-full bg-zinc-800/40 border border-zinc-700/30 text-zinc-200 px-2.5 py-1.5 rounded text-sm outline-none focus:border-blue-500/40 placeholder-zinc-600 resize-y"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      <p className="text-xs text-zinc-600">Double-click a name to edit. Hover for move/delete controls.</p>
    </div>
  );
}

// ── Content Step (Phase 2: full content review before build) ──

function ContentStep({
  contentMap,
  loading,
}: {
  contentMap: ContentMap;
  loading: boolean;
}) {
  const [expandedPage, setExpandedPage] = useState<string | null>(null);
  const slugs = Object.keys(contentMap);

  if (slugs.length === 0) {
    if (loading) {
      return (
        <AILoadingIndicator
          label="AI가 페이지 콘텐츠를 생성 중…"
          sublabel="모든 페이지의 섹션 텍스트를 한 번에 작성합니다 (Phase A 전략 + Phase B 카피라이팅)"
          estimateSec={60}
        />
      );
    }
    return <p className="text-sm text-zinc-600">Click Next to generate content</p>;
  }

  const totalSections = slugs.reduce(
    (sum, slug) => sum + (contentMap[slug]?.sections.length ?? 0),
    0,
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500 uppercase tracking-wider">
          Content Review — {slugs.length} pages, {totalSections} sections
        </p>
        <p className="text-xs text-zinc-600">Review content below, then click Next to build</p>
      </div>

      {slugs.map((slug) => {
        const entry = contentMap[slug];
        if (!entry) return null; // narrow: slugs is derived from contentMap, this guards strict tsc
        const isExpanded = expandedPage === slug;

        return (
          <div key={slug} className="bg-zinc-900/40 rounded-lg border border-zinc-800/40 overflow-hidden">
            {/* Page header — click to expand/collapse */}
            <button
              onClick={() => setExpandedPage(isExpanded ? null : slug)}
              className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-zinc-800/30 transition-colors text-left"
            >
              <span className="text-xs text-zinc-600">{isExpanded ? "▼" : "▶"}</span>
              <span className="text-sm text-zinc-200 font-medium">{entry.pageName}</span>
              <span className="text-xs text-zinc-600 font-mono">{slug}</span>
              <span className="text-xs text-zinc-600 ml-auto">
                {entry.sections.length} sections
              </span>
            </button>

            {/* Expanded: page purpose + full content */}
            {isExpanded && (
              <div className="border-t border-zinc-800/40">
                {/* Page strategy */}
                {(entry.purpose || entry.keyMessage) && (
                  <div className="px-3 py-2.5 bg-blue-950/20 border-b border-zinc-800/30">
                    {entry.purpose && (
                      <div className="mb-1">
                        <span className="text-xs text-blue-400/70 font-medium">Purpose: </span>
                        <span className="text-sm text-zinc-300">{entry.purpose}</span>
                      </div>
                    )}
                    {entry.keyMessage && (
                      <div>
                        <span className="text-xs text-blue-400/70 font-medium">Key Message: </span>
                        <span className="text-sm text-zinc-200 font-medium">{entry.keyMessage}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="divide-y divide-zinc-800/30">
                {entry.sections.map((section, i) => {
                  const s = section as Record<string, unknown>;
                  const sectionType = String(s.sectionType || "text");
                  const title = String(s.title || "");
                  const subtitle = String(s.subtitle || "");
                  const description = String(s.description || "");
                  const buttonText = String(s.buttonText || "");
                  const items = (s.items || []) as Array<Record<string, unknown>>;
                  const pattern = String(s.gutenbergPattern || "");

                  return (
                    <div key={i} className="px-3 py-3 space-y-2">
                      {/* Section type badge */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-blue-400/80 bg-blue-500/10 px-1.5 py-0.5 rounded">
                          {sectionType}
                        </span>
                        <span className="text-xs text-zinc-700 font-mono">{pattern}</span>
                      </div>

                      {/* Title */}
                      {title && (
                        <div>
                          <span className="text-xs text-zinc-600">Title: </span>
                          <span className="text-sm text-zinc-200 font-medium">{title}</span>
                        </div>
                      )}

                      {/* Subtitle */}
                      {subtitle && (
                        <div>
                          <span className="text-xs text-zinc-600">Subtitle: </span>
                          <span className="text-sm text-zinc-400">{subtitle}</span>
                        </div>
                      )}

                      {/* Description */}
                      {description && (
                        <div>
                          <span className="text-xs text-zinc-600">Description: </span>
                          <span className="text-sm text-zinc-400 leading-relaxed">{description}</span>
                        </div>
                      )}

                      {/* Button */}
                      {buttonText && (
                        <div>
                          <span className="text-xs text-zinc-600">CTA: </span>
                          <span className="text-sm text-blue-400">{buttonText}</span>
                        </div>
                      )}

                      {/* Items (features, pricing, team, faq, testimonials) */}
                      {items.length > 0 && (
                        <div className="pl-3 border-l-2 border-zinc-800/60 space-y-1.5 mt-1">
                          {items.map((item, j) => {
                            const iTitle = String(item.title || "");
                            const iName = String(item.name || "");
                            const iDesc = String(item.description || "");
                            const iRole = String(item.role || "");
                            const iQuestion = String(item.question || "");
                            const iAnswer = String(item.answer || "");
                            const iQuote = String(item.quote || "");
                            const iAuthor = String(item.author || "");
                            const iPrice = String(item.price || "");

                            return (
                              <div key={j} className="text-sm">
                                {iTitle && (
                                  <div>
                                    <span className="text-zinc-300 font-medium">{iTitle}</span>
                                    {iDesc && <span className="text-zinc-500"> — {iDesc}</span>}
                                  </div>
                                )}
                                {iName && !iTitle && (
                                  <div>
                                    <span className="text-zinc-300">{iName}</span>
                                    {iRole && <span className="text-zinc-500"> — {iRole}</span>}
                                  </div>
                                )}
                                {iQuestion && (
                                  <div>
                                    <span className="text-zinc-300">Q: {iQuestion}</span>
                                    {iAnswer && <div className="text-zinc-500 pl-4">A: {iAnswer}</div>}
                                  </div>
                                )}
                                {iQuote && (
                                  <div>
                                    <span className="text-zinc-400 italic">&quot;{iQuote}&quot;</span>
                                    {iAuthor && <span className="text-zinc-500"> — {iAuthor}</span>}
                                  </div>
                                )}
                                {iPrice && !iTitle && (
                                  <div>
                                    <span className="text-zinc-300">{iName}</span>
                                    <span className="text-blue-400 ml-2">{iPrice}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Build Step (Phase 4: instant pattern mapping summary) ──

function BuildStep({
  sitemap,
  contentMap,
}: {
  sitemap: Array<{ name: string; slug: string; parent?: string }>;
  contentMap: ContentMap;
}) {
  const pages = sitemap.filter((p) => !p.slug.startsWith("#"));
  const totalSections = Object.values(contentMap).reduce(
    (sum, entry) => sum + entry.sections.length,
    0,
  );

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500 uppercase tracking-wider">Ready to Build</p>
      <p className="text-sm text-zinc-400">
        {pages.length} pages, {totalSections} sections will be created with Gutenberg pattern
        mapping.
      </p>
      <div className="text-sm text-zinc-600 space-y-1.5">
        {pages.slice(0, 12).map((p) => {
          const entry = contentMap[p.slug];
          const sectionCount = entry?.sections.length ?? 0;
          return (
            <div key={p.slug} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span className="text-zinc-300">{p.name}</span>
              <span className="text-zinc-700 font-mono text-xs">{p.slug}</span>
              {sectionCount > 0 && (
                <span className="text-zinc-700 text-xs ml-auto">
                  {sectionCount} sections
                </span>
              )}
            </div>
          );
        })}
        {pages.length > 12 && (
          <div className="text-zinc-700">+{pages.length - 12} more</div>
        )}
      </div>
      <div className="mt-2 px-3 py-2 bg-blue-950/30 border border-blue-900/30 rounded text-xs text-blue-300/80">
        Instant build — content is injected into Gutenberg block patterns without additional AI
        calls.
      </div>
      <div className="mt-1.5 px-3 py-2 bg-amber-950/30 border border-amber-900/40 rounded text-xs text-amber-300/90">
        ⚠️ 빌드를 실행하면 이 테넌트의 <strong>기존 페이지 / 섹션 / 메뉴가 모두 삭제</strong>되고
        새로 생성됩니다. 콘텐츠 모듈(블로그 / 앨범 / 게시판 등)과 테마 설정은 보존됩니다.
      </div>
    </div>
  );
}

// ── Shared form components ──

function Field({
  label,
  value,
  onChange,
  placeholder,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
}) {
  const cls =
    "w-full bg-zinc-800/40 border border-zinc-700/30 text-zinc-200 px-3 py-2 rounded-md text-sm outline-none focus:border-blue-500/40 placeholder-zinc-600";
  return (
    <div>
      <label className="text-sm text-zinc-500 mb-1 block">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className={`${cls} resize-none`}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cls}
        />
      )}
    </div>
  );
}

function FieldWithSuggest({
  label,
  value,
  onChange,
  onSuggest,
  loading,
  placeholder,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onSuggest: () => void;
  loading: boolean;
  placeholder?: string;
  textarea?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm text-zinc-500">{label}</label>
        <button
          onClick={onSuggest}
          disabled={loading}
          className="text-xs text-blue-500 hover:text-blue-400 disabled:opacity-50"
        >
          {loading ? "..." : "AI Suggest"}
        </button>
      </div>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="w-full bg-zinc-800/40 border border-zinc-700/30 text-zinc-200 px-3 py-2 rounded-md text-sm outline-none focus:border-blue-500/40 placeholder-zinc-600 resize-none"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-zinc-800/40 border border-zinc-700/30 text-zinc-200 px-3 py-2 rounded-md text-sm outline-none focus:border-blue-500/40 placeholder-zinc-600"
        />
      )}
    </div>
  );
}

// ── MustHaves Panel — 운영자 hard-requirement input 채널 ──
// 4가지 input 을 한 패널로:
//   - 자유 텍스트 (must-haves)
//   - 필수 페이지[] (architect 가 sitemap 에 강제 포함)
//   - 필수 키 메시지[] (copywriter 가 헤드라인/본문에 verbatim 반영)
//   - 필수 수치/통계[] (copywriter 가 stats/proof 섹션에 정확히)
//
// 모든 plannerApi 호출 (autoStrategy/sitemap/contentMap) 의 body 에
// 자동 포함됨. agent prompt 의 최상단 'OPERATOR MUST-HAVE REQUIREMENTS'
// 섹션에 주입되어 LLM 의 자체 판단보다 우선.

function MustHavesPanel({
  mustHaves,
  onMustHavesChange,
  requiredPages,
  onRequiredPagesChange,
  requiredKeyMessages,
  onRequiredKeyMessagesChange,
  requiredStats,
  onRequiredStatsChange,
}: {
  mustHaves: string;
  onMustHavesChange: (v: string) => void;
  requiredPages: string[];
  onRequiredPagesChange: (v: string[]) => void;
  requiredKeyMessages: string[];
  onRequiredKeyMessagesChange: (v: string[]) => void;
  requiredStats: string[];
  onRequiredStatsChange: (v: string[]) => void;
}) {
  return (
    <div className="mt-6 rounded-lg border border-amber-700/40 bg-amber-950/20 p-5 space-y-4">
      <header>
        <h3 className="text-sm font-semibold text-amber-200 flex items-center gap-2">
          <span aria-hidden>📌</span>
          <span>필수 반영 사항 (운영자 강제 input)</span>
        </h3>
        <p className="text-xs text-amber-300/70 mt-1 leading-relaxed">
          여기 입력한 내용은 AI 가 사이트맵·전략·페이지 콘텐츠를 만들 때
          반드시 반영합니다. 추측이 아니라 운영자 의도를 LLM 에 직접 강제.
          모두 비워두셔도 됩니다 — 입력한 항목만 강제됩니다.
        </p>
      </header>

      <div>
        <label className="block text-xs font-medium text-amber-200 mb-1.5">
          반드시 반영할 내용 (자유 텍스트)
        </label>
        <textarea
          value={mustHaves}
          onChange={(e) => onMustHavesChange(e.target.value)}
          placeholder="예: 1) 20년 경력 강조  2) Apopka, FL 베이스 (지역 신뢰)  3) B2B 도매만 — 소매 X  4) 마지막 페이지에 '견적 요청' 버튼 강조"
          rows={4}
          className="w-full bg-zinc-900/60 border border-zinc-700/40 text-zinc-200 px-3 py-2 rounded-md text-sm outline-none focus:border-amber-500/50 placeholder-zinc-600 resize-y font-mono"
        />
      </div>

      <MustHaveListInput
        label="필수 페이지 (사이트맵에 반드시 포함)"
        items={requiredPages}
        onChange={onRequiredPagesChange}
        placeholder="예: Pricing, 문의하기, 채용"
      />
      <MustHaveListInput
        label="필수 키 메시지 (헤드라인 / 본문에 반영)"
        items={requiredKeyMessages}
        onChange={onRequiredKeyMessagesChange}
        placeholder="예: 24시간 응답 보장, 평균 출하 2일"
      />
      <MustHaveListInput
        label="필수 수치 / 통계 (정확한 숫자 반영)"
        items={requiredStats}
        onChange={onRequiredStatsChange}
        placeholder="예: 1,000+ 거래처, 99.5% 정시 출하"
      />
    </div>
  );
}

function MustHaveListInput({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...items, v]);
    setDraft("");
  };
  return (
    <div>
      <label className="block text-xs font-medium text-amber-200 mb-1.5">{label}</label>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="flex-1 bg-zinc-900/60 border border-zinc-700/40 text-zinc-200 px-3 py-2 rounded-md text-sm outline-none focus:border-amber-500/50 placeholder-zinc-600"
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          className="px-3 py-2 rounded-md bg-amber-700/60 hover:bg-amber-700 text-white text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          + 추가
        </button>
      </div>
      {items.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {items.map((it, i) => (
            <li
              key={`${it}-${i}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-800/40 border border-amber-700/40 text-xs text-amber-100"
            >
              <span>{it}</span>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                className="text-amber-300 hover:text-amber-100 leading-none"
                aria-label="Remove"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
