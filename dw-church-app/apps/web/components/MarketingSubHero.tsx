// Shared sub-page hero (navy gradient band) for every marketing detail page.
// The Front page uses the banner-slider hero (MarketingHero); sub-pages use this
// lighter, image-free hero — clean, fast, no image-quality risk.
export default function MarketingSubHero({
  crumb,
  title,
  desc,
}: {
  crumb: string;
  title: React.ReactNode;
  desc: string;
}) {
  return (
    <section style={{ background: 'linear-gradient(100deg,#0b1522 0%,#12233b 55%,#1a3358 100%)' }}>
      <div className="mx-auto w-full max-w-[1200px] px-5 py-16 sm:px-6 sm:py-20">
        <div className="max-w-[820px] text-white">
          <div className="text-[12.5px] font-semibold text-[#8497b3]">홈 · <span className="text-white">{crumb}</span></div>
          <h1 className="mt-4 text-[32px] font-extrabold leading-[1.24] tracking-[-0.05em] sm:text-[44px]">{title}</h1>
          <p className="mt-4 text-[16px] leading-[1.8] text-[#c3d3ea] sm:text-[17.5px]">{desc}</p>
        </div>
      </div>
    </section>
  );
}
