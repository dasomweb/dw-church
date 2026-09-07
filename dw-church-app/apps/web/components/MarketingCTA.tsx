// Shared deep CTA band (#0f1b2d) used at the foot of every marketing page.
export default function MarketingCTA({
  title = '관리자 화면을 먼저 보시겠습니까',
  desc = '교회 사정을 듣고 어떤 구성이 맞을지 정리해 드립니다. 데모는 실제 화면으로 안내합니다.',
  primaryLabel = '도입 상담 신청',
  primaryHref = '/apply',
  secondaryLabel = '데모 신청',
  secondaryHref = '/apply',
}: {
  title?: string;
  desc?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}) {
  return (
    <section className="bg-[#0f1b2d] text-white">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 py-14 sm:px-6 sm:py-16 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-[26px] font-extrabold tracking-[-0.045em] sm:text-[32px]">{title}</h2>
          <p className="mt-2.5 text-[15.5px] text-[#9db0cc]">{desc}</p>
        </div>
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
          <a href={primaryHref} className="inline-flex min-h-[52px] items-center justify-center rounded-[11px] bg-[#2b7fff] px-8 text-[15.5px] font-extrabold text-white transition-colors hover:bg-[#1466d6]">{primaryLabel}</a>
          <a href={secondaryHref} className="inline-flex min-h-[52px] items-center justify-center rounded-[11px] border border-[rgba(255,255,255,.4)] px-8 text-[15.5px] font-bold text-white transition-colors hover:bg-[rgba(255,255,255,.1)]">{secondaryLabel}</a>
        </div>
      </div>
    </section>
  );
}
