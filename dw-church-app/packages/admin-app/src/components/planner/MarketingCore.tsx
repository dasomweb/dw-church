"use client";

export interface MarketingStrategy {
  deliveryModel: string;
  transactionType: string;
  revenueModel: string;
  segmentAxis: string[];
  positioning: string;
  involvementLevel: string;
  purchaseBlocker: string;
  mixFocus: string;
  keyP: string;
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
    const labels: Record<string, string> = { local: "Local (customer visits)", regional: "Regional (we visit)", online: "Online (no travel)" };
    parts.push(`Delivery: ${labels[s.deliveryModel] || s.deliveryModel}`);
  }
  if (s.transactionType) parts.push(`Transaction: ${s.transactionType.toUpperCase()}`);
  if (s.revenueModel) {
    const labels: Record<string, string> = { "one-time": "One-time purchase", repeat: "Repeat purchase", subscription: "Subscription", "high-ticket": "High-ticket" };
    parts.push(`Revenue: ${labels[s.revenueModel] || s.revenueModel}`);
  }
  if (s.segmentAxis.length) parts.push(`Segments: ${s.segmentAxis.join(", ")}`);
  if (s.positioning) parts.push(`Positioning: "${s.positioning}"`);
  if (s.involvementLevel) {
    const labels: Record<string, string> = { low: "Low (impulse)", medium: "Medium (compare)", high: "High (research)" };
    parts.push(`Involvement: ${labels[s.involvementLevel] || s.involvementLevel}`);
  }
  if (s.purchaseBlocker) parts.push(`Blocker: ${s.purchaseBlocker}`);
  if (s.mixFocus) parts.push(`Mix: ${s.mixFocus.toUpperCase()}`);
  if (s.keyP) parts.push(`Key P: ${s.keyP}`);
  if (s.funnelCoverage.length) parts.push(`Funnel: ${s.funnelCoverage.join(" > ")}`);
  if (s.primaryCTA) parts.push(`CTA: ${s.primaryCTA}`);
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

  const isB2B = strategy.transactionType === "b2b" || strategy.transactionType === "b2g";

  return (
    <div className="space-y-4">
      {/* 1. Delivery Model */}
      <Section label="1. Service Delivery">
        <ChipGroup>
          {[
            { id: "local", label: "Local", desc: "Customer visits (restaurant, salon)" },
            { id: "regional", label: "Regional", desc: "We visit (contractor, service)" },
            { id: "online", label: "Online", desc: "No travel (SaaS, e-commerce)" },
          ].map((d) => (
            <Chip key={d.id} selected={strategy.deliveryModel === d.id} onClick={() => upd("deliveryModel", d.id)} label={d.label} desc={d.desc} />
          ))}
        </ChipGroup>
      </Section>

      {/* 2. Transaction Type */}
      <Section label="2. Transaction Type">
        <ChipGroup>
          {[
            { id: "b2c", label: "B2C", desc: "Visual + emotion driven" },
            { id: "b2b", label: "B2B", desc: "Trust + ROI + case studies" },
            { id: "b2g", label: "B2G", desc: "Credentials + compliance" },
            { id: "mixed", label: "Mixed", desc: "B2C + B2B" },
          ].map((t) => (
            <Chip key={t.id} selected={strategy.transactionType === t.id} onClick={() => upd("transactionType", t.id)} label={t.label} desc={t.desc} />
          ))}
        </ChipGroup>
      </Section>

      {/* 3. Revenue Model */}
      <Section label="3. Revenue Model">
        <ChipGroup>
          {[
            { id: "one-time", label: "One-time", desc: "First conversion focus" },
            { id: "repeat", label: "Repeat", desc: "Re-purchase / membership" },
            { id: "subscription", label: "Subscription", desc: "Onboarding / trust" },
            { id: "high-ticket", label: "High-ticket", desc: "Long funnel / consultation" },
          ].map((r) => (
            <Chip key={r.id} selected={strategy.revenueModel === r.id} onClick={() => upd("revenueModel", r.id)} label={r.label} desc={r.desc} />
          ))}
        </ChipGroup>
      </Section>

      {/* 4. Segmentation */}
      <Section label="4. Segmentation Axes (multi-select)">
        <ChipGroup>
          {[
            { id: "geographic", label: "Geographic" },
            { id: "demographic", label: "Demographic" },
            { id: "psychographic", label: "Psychographic" },
            { id: "behavioral", label: "Behavioral" },
            ...(isB2B ? [{ id: "firmographic", label: "Firmographic" }] : []),
          ].map((s) => (
            <Chip key={s.id} selected={strategy.segmentAxis.includes(s.id)} onClick={() => toggleArr("segmentAxis", s.id)} label={s.label} />
          ))}
        </ChipGroup>
      </Section>

      {/* 5. Positioning */}
      <Section label="5. Positioning Statement">
        <input
          className="w-full bg-zinc-800/40 border border-zinc-700/30 text-zinc-200 px-3 py-2 rounded-md text-sm outline-none focus:border-blue-500/40 placeholder-zinc-600"
          value={strategy.positioning}
          onChange={(e) => upd("positioning", e.target.value)}
          placeholder='e.g., "Your trusted wholesale orchid partner"'
        />
      </Section>

      {/* 6. Involvement Level */}
      <Section label="6. Customer Involvement">
        <ChipGroup>
          {[
            { id: "low", label: "Low", desc: "Impulse — visual impact, simple" },
            { id: "medium", label: "Medium", desc: "Compare — reviews, info + emotion" },
            { id: "high", label: "High", desc: "Research — detailed info, consultation" },
          ].map((i) => (
            <Chip key={i.id} selected={strategy.involvementLevel === i.id} onClick={() => upd("involvementLevel", i.id)} label={i.label} desc={i.desc} />
          ))}
        </ChipGroup>
      </Section>

      {/* 7. Purchase Blocker */}
      <Section label="7. Purchase Decision Blocker">
        <ChipGroup>
          {[
            { id: "awareness", label: "Awareness", desc: "Don't know we exist" },
            { id: "search", label: "Search", desc: "Can't find info" },
            { id: "evaluation", label: "Evaluation", desc: "Comparing with competitors" },
            { id: "decision", label: "Decision", desc: "Not confident to buy" },
            { id: "post", label: "Post-purchase", desc: "No repeat / referral" },
          ].map((b) => (
            <Chip key={b.id} selected={strategy.purchaseBlocker === b.id} onClick={() => upd("purchaseBlocker", b.id)} label={b.label} desc={b.desc} />
          ))}
        </ChipGroup>
      </Section>

      {/* 8. Marketing Mix */}
      <Section label="8. Marketing Mix">
        <ChipGroup>
          <Chip selected={strategy.mixFocus === "4p"} onClick={() => upd("mixFocus", "4p")} label="4P (Product-focused)" />
          <Chip selected={strategy.mixFocus === "7p"} onClick={() => upd("mixFocus", "7p")} label="7P (Service-focused)" />
        </ChipGroup>
        {strategy.mixFocus && (
          <div className="mt-2">
            <p className="text-xs text-zinc-600 mb-1">Key P — most critical element:</p>
            <ChipGroup>
              {[
                { id: "product", label: "Product" },
                { id: "price", label: "Price" },
                { id: "place", label: "Place" },
                { id: "promotion", label: "Promotion" },
                ...(strategy.mixFocus === "7p"
                  ? [{ id: "people", label: "People" }, { id: "process", label: "Process" }, { id: "evidence", label: "Evidence" }]
                  : []),
              ].map((p) => (
                <Chip key={p.id} selected={strategy.keyP === p.id} onClick={() => upd("keyP", p.id)} label={p.label} />
              ))}
            </ChipGroup>
          </div>
        )}
      </Section>

      {/* 9. Funnel Coverage */}
      <Section label="9. Funnel Coverage (multi-select)">
        <ChipGroup>
          {[
            { id: "awareness", label: "Awareness" },
            { id: "interest", label: "Interest" },
            { id: "consideration", label: "Consideration" },
            { id: "purchase", label: "Purchase" },
            { id: "loyalty", label: "Loyalty" },
            { id: "advocacy", label: "Advocacy" },
          ].map((f) => (
            <Chip key={f.id} selected={strategy.funnelCoverage.includes(f.id)} onClick={() => toggleArr("funnelCoverage", f.id)} label={f.label} />
          ))}
        </ChipGroup>
      </Section>

      {/* 10. Primary CTA */}
      <Section label="10. Primary CTA">
        <ChipGroup>
          {[
            { id: "buy", label: "구매" },
            { id: "contact", label: "문의" },
            { id: "book", label: "예약" },
            { id: "subscribe", label: "구독" },
            { id: "call", label: "전화" },
            { id: "quote", label: "견적 요청" },
            { id: "trial", label: "무료 체험" },
            { id: "consult", label: "상담" },
          ].map((c) => (
            <Chip key={c.id} selected={strategy.primaryCTA === c.id} onClick={() => upd("primaryCTA", c.id)} label={c.label} />
          ))}
        </ChipGroup>
      </Section>

      {/* Summary */}
      {strategyToPromptContext(strategy) && (
        <div className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-700/20">
          <p className="text-xs text-zinc-500 mb-1">Strategy Summary</p>
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
