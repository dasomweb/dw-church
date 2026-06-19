"use client";

/**
 * Church-reframed strategy panel for the AI Website Planner (Strategy step).
 * The original panel was a generic B2B marketing model (transaction type,
 * revenue model, purchase blocker, 4P/7P mix). Those don't fit a church, so the
 * UI now surfaces only church-meaningful inputs: ministry mode, who we serve,
 * church identity, the stage we mainly serve, the discipleship journey, and the
 * primary invitation (CTA).
 *
 * The legacy fields stay on the MarketingStrategy type for back-compat with the
 * strategy JSON shape the wizard/agents exchange, but the church wizard neither
 * shows nor summarizes them.
 */
export interface MarketingStrategy {
  deliveryModel: string;
  transactionType: string; // legacy (unused in church UI)
  revenueModel: string; // legacy (unused in church UI)
  segmentAxis: string[];
  positioning: string;
  involvementLevel: string;
  purchaseBlocker: string; // legacy (unused in church UI)
  mixFocus: string; // legacy (unused in church UI)
  keyP: string; // legacy (unused in church UI)
  funnelCoverage: string[];
  primaryCTA: string;
}

export const INITIAL_STRATEGY: MarketingStrategy = {
  deliveryModel: "",
  transactionType: "",
  revenueModel: "",
  segmentAxis: [],
  positioning: "",
  involvementLevel: "",
  purchaseBlocker: "",
  mixFocus: "",
  keyP: "",
  funnelCoverage: [],
  primaryCTA: "",
};

export function strategyToPromptContext(s: MarketingStrategy): string {
  const parts: string[] = [];
  if (s.deliveryModel) {
    const labels: Record<string, string> = { local: "현장 예배 중심", regional: "지역·심방 중심", online: "온라인·미디어 중심" };
    parts.push(`사역 방식: ${labels[s.deliveryModel] || s.deliveryModel}`);
  }
  if (s.segmentAxis.length) parts.push(`섬기는 대상: ${s.segmentAxis.join(", ")}`);
  if (s.positioning) parts.push(`교회 정체성: "${s.positioning}"`);
  if (s.involvementLevel) {
    const labels: Record<string, string> = { low: "처음 오신 분", medium: "정기 출석", high: "헌신된 제자" };
    parts.push(`주로 섬기는 단계: ${labels[s.involvementLevel] || s.involvementLevel}`);
  }
  if (s.funnelCoverage.length) parts.push(`신앙 여정: ${s.funnelCoverage.join(" > ")}`);
  if (s.primaryCTA) parts.push(`주요 초청: ${s.primaryCTA}`);
  return parts.join(" | ");
}

interface Props {
  strategy: MarketingStrategy;
  onChange: (s: MarketingStrategy) => void;
}

export default function MarketingCore({ strategy, onChange }: Props) {
  const upd = (field: keyof MarketingStrategy, value: unknown) =>
    onChange({ ...strategy, [field]: value });
  const toggleArr = (field: keyof MarketingStrategy, value: string) => {
    const arr = (strategy[field] as string[]) || [];
    onChange({
      ...strategy,
      [field]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
    });
  };

  return (
    <div className="space-y-4">
      {/* 1. 개척/사역 모델 (Send Network 5 models) */}
      <Section label="1. 개척/사역 모델">
        <ChipGroup>
          {[
            { id: "standard", label: "전통/표준 개척", desc: "핵심팀으로 예배 공동체 론칭" },
            { id: "covocational", label: "자비량/이중직(미자립)", desc: "텐트메이커·미션형 소그룹" },
            { id: "multisite", label: "다중 사이트", desc: "모교회 비전 공유·캠퍼스 분립" },
            { id: "multiethnic", label: "다민족/다언어", desc: "이민·다언어 공동체(한인 등)" },
            { id: "replant", label: "교회 재개척", desc: "쇠퇴한 교회 리모델링" },
            { id: "micro", label: "마이크로/가정교회", desc: "건물 없이 유기적 소그룹" },
          ].map((d) => (
            <Chip key={d.id} selected={strategy.deliveryModel === d.id} onClick={() => upd("deliveryModel", d.id)} label={d.label} desc={d.desc} />
          ))}
        </ChipGroup>
      </Section>

      {/* 2. 섬기는 대상 */}
      <Section label="2. 섬기는 대상 (복수 선택)">
        <ChipGroup>
          {[
            { id: "geographic", label: "지역", desc: "동네·지역사회" },
            { id: "demographic", label: "세대·연령", desc: "다음세대·청년·장년" },
            { id: "psychographic", label: "신앙 관심·필요", desc: "구도자·새신자·성도" },
            { id: "behavioral", label: "삶의 정황", desc: "가정·직장·이민" },
          ].map((s) => (
            <Chip key={s.id} selected={strategy.segmentAxis.includes(s.id)} onClick={() => toggleArr("segmentAxis", s.id)} label={s.label} desc={s.desc} />
          ))}
        </ChipGroup>
      </Section>

      {/* 3. 교회 정체성 */}
      <Section label="3. 교회 정체성 한 문장">
        <input
          className="w-full bg-zinc-800/40 border border-zinc-700/30 text-zinc-200 px-3 py-2 rounded-md text-sm outline-none focus:border-blue-500/40 placeholder-zinc-600"
          value={strategy.positioning}
          onChange={(e) => upd("positioning", e.target.value)}
          placeholder='예: "복음으로 다음세대를 세우는 공동체"'
        />
      </Section>

      {/* 4. 주로 섬기는 단계 */}
      <Section label="4. 주로 섬기려는 단계">
        <ChipGroup>
          {[
            { id: "low", label: "처음 오신 분", desc: "교회를 처음 찾는 단계" },
            { id: "medium", label: "정기 출석", desc: "예배에 함께하는 단계" },
            { id: "high", label: "헌신된 제자", desc: "양육·사역에 참여하는 단계" },
          ].map((i) => (
            <Chip key={i.id} selected={strategy.involvementLevel === i.id} onClick={() => upd("involvementLevel", i.id)} label={i.label} desc={i.desc} />
          ))}
        </ChipGroup>
      </Section>

      {/* 5. 신앙 여정 */}
      <Section label="5. 함께 그릴 신앙 여정 (복수 선택)">
        <ChipGroup>
          {[
            { id: "awareness", label: "접촉" },
            { id: "interest", label: "관심" },
            { id: "consideration", label: "방문" },
            { id: "purchase", label: "정착" },
            { id: "loyalty", label: "제자훈련" },
            { id: "advocacy", label: "사역 동참" },
          ].map((f) => (
            <Chip key={f.id} selected={strategy.funnelCoverage.includes(f.id)} onClick={() => toggleArr("funnelCoverage", f.id)} label={f.label} />
          ))}
        </ChipGroup>
      </Section>

      {/* 6. 주요 초청 (CTA) */}
      <Section label="6. 주요 초청 (CTA)">
        <ChipGroup>
          {[
            { id: "visit", label: "예배·방문 안내" },
            { id: "newcomer", label: "새가족 등록" },
            { id: "prayer", label: "기도 요청" },
            { id: "serve", label: "사역 참여" },
            { id: "give", label: "헌금 안내" },
            { id: "contact", label: "문의" },
          ].map((c) => (
            <Chip key={c.id} selected={strategy.primaryCTA === c.id} onClick={() => upd("primaryCTA", c.id)} label={c.label} />
          ))}
        </ChipGroup>
      </Section>

      {/* Summary */}
      {strategyToPromptContext(strategy) && (
        <div className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-700/20">
          <p className="text-xs text-zinc-500 mb-1">전략 요약</p>
          <p className="text-xs text-zinc-400">{strategyToPromptContext(strategy)}</p>
        </div>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-zinc-500 font-medium mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function ChipGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-1.5">{children}</div>;
}

function Chip({
  selected,
  onClick,
  label,
  desc,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  desc?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1.5 rounded-md text-xs border transition-all ${
        selected
          ? "bg-blue-500/15 text-blue-400 border-blue-500/40"
          : "bg-zinc-800/40 text-zinc-500 border-zinc-700/30 hover:border-zinc-600"
      }`}
    >
      <span className="font-medium">{label}</span>
      {desc && <span className="block text-[10px] opacity-60 mt-0.5">{desc}</span>}
    </button>
  );
}
