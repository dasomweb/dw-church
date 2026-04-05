'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// ─── Hero Slides (21:9 ratio) ────────────────────────────────
const SLIDES = [
  {
    // Church interior with warm lighting — welcoming, modern worship space
    image: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=1680&h=720&fit=crop',
    headline: 'Your Church.\nOnline. Effortlessly.',
    subline: 'Sermons, bulletins, events, staff — all managed in one platform.\nNo coding. No hassle. Just your ministry, amplified.',
  },
  {
    // Team collaboration / people using laptop — church admin managing website
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1680&h=720&fit=crop',
    headline: 'Built for Churches.\nManaged by You.',
    subline: 'Professional church websites with 10 design templates,\ndrag-and-drop editor, and everything your congregation needs.',
  },
  {
    // Person working on laptop in a calm setting — tech handled for you
    image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1680&h=720&fit=crop',
    headline: 'Focus on Ministry.\nWe Handle the Tech.',
    subline: 'Custom domain, mobile-ready design, YouTube integration,\nand seamless content management — all included. Start in minutes.',
  },
];

function HeroSlider() {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => setCurrent((c) => (c + 1) % SLIDES.length), []);

  useEffect(() => {
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next]);

  return (
    <section className="relative w-full overflow-hidden bg-gray-900" style={{ aspectRatio: '21/9' }}>
      {SLIDES.map((slide, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-1000 ${i === current ? 'opacity-100' : 'opacity-0'}`}
        >
          <img
            src={slide.image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading={i === 0 ? 'eager' : 'lazy'}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
          <div className="relative flex h-full items-center px-6 sm:px-12 lg:px-20">
            <div className="max-w-2xl">
              <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl xl:text-6xl" style={{ whiteSpace: 'pre-line', letterSpacing: '-0.5px' }}>
                {slide.headline}
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-gray-200 sm:mt-6 sm:text-base lg:text-lg" style={{ whiteSpace: 'pre-line' }}>
                {slide.subline}
              </p>
              <div className="mt-6 flex gap-3 sm:mt-8">
                <Link href="/register" className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-blue-700 sm:px-8 sm:text-base">
                  Get Started
                </Link>
                <a href="#plans" className="rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 sm:px-8 sm:text-base">
                  See Plans
                </a>
              </div>
            </div>
          </div>
        </div>
      ))}
      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 sm:bottom-6">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-2 rounded-full transition-all ${i === current ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/60'}`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}

// ─── Features ────────────────────────────────────────────────
const features = [
  { title: 'Sermon Management', desc: 'YouTube integration, categories, speaker filtering, and automatic thumbnail extraction.', icon: '🎙️' },
  { title: 'Weekly Bulletin', desc: 'Upload PDF bulletins and display as image pages. Members access them anytime.', icon: '📄' },
  { title: 'Photo Albums', desc: 'Share church moments in beautiful gallery grids with lightbox viewing.', icon: '📸' },
  { title: 'Staff Directory', desc: 'Showcase pastors and staff with featured layouts, bios, and contact info.', icon: '👥' },
  { title: 'Event Calendar', desc: 'Promote services, retreats, and special events with rich cards and locations.', icon: '📅' },
  { title: 'Custom Domain', desc: 'Use your own domain (e.g., yourbethel.com) with free SSL certificate.', icon: '🌐' },
  { title: 'Page Builder', desc: 'Drag-and-drop block editor with 20+ block types and 8 page templates.', icon: '🧱' },
  { title: 'Mobile Ready', desc: 'Every site looks great on phones, tablets, and desktops. No extra work.', icon: '📱' },
  { title: 'Multi-language', desc: 'Korean and English interface. Serve your congregation in their language.', icon: '🌍' },
];

// ─── Plans ───────────────────────────────────────────────────
const plans = [
  {
    name: 'Essential',
    price: '$99',
    period: '/mo',
    subtitle: 'Church Website',
    description: 'A complete church website with template-based design, content management, and your own domain.',
    features: [
      '10 professional design templates',
      'Sermon & bulletin management',
      'Photo albums & event calendar',
      'Staff directory & church history',
      'Page builder with drag & drop',
      'Up to 5 pages',
      'Department sites (up to 3)',
      'Custom domain + SSL',
      'Managed hosting & backups',
      'Email support',
    ],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Ministry',
    price: '$199',
    period: '/mo',
    subtitle: 'Website + Member Directory',
    description: 'Everything in Essential, plus a private member directory to stay connected with your congregation.',
    features: [
      'Everything in Essential',
      'Advanced theme editor',
      'Member directory (up to 200)',
      'Contact groups & categories',
      'Member search & filtering',
      'Up to 15 pages',
      'Priority email support',
    ],
    cta: 'Start Ministry Plan',
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    name: 'Outreach',
    price: '$399',
    period: '/mo',
    subtitle: 'Website + Members + Growth',
    description: 'The complete platform for growing churches — expanded capacity, department sites, and analytics.',
    features: [
      'Everything in Ministry',
      'Member directory (up to 1,000)',
      'Analytics & engagement dashboard',
      'Up to 30 pages',
      'Priority email support',
    ],
    cta: 'Get Outreach Plan',
    highlighted: false,
  },
];

// Custom design add-on (shown below pricing table)
const customDesignAddon = {
  title: 'Need a Custom Design?',
  description: 'Want a unique look beyond our templates? Our design team will create a fully custom website tailored to your church\'s brand and identity.',
  features: ['Custom homepage & page layouts', 'Brand-matched color scheme & typography', 'Custom logo & graphic elements', 'Delivered as a reusable template'],
  price: 'Custom Quote',
  note: 'One-time design fee. Contact us for a personalized estimate.',
};

// ─── Process ─────────────────────────────────────────────────
const process_steps = [
  { step: '01', title: 'Sign Up & Choose a Plan', desc: 'Pick the plan that fits your church. Get instant access to the admin panel.' },
  { step: '02', title: 'Pick a Template', desc: 'Choose from 10 professional designs. Customize colors, fonts, and layout.' },
  { step: '03', title: 'Add Your Content', desc: 'Upload sermons, bulletins, photos, and staff info through the easy admin panel.' },
  { step: '04', title: 'Go Live', desc: 'Connect your domain and share your website with your congregation.' },
];

// ─── Page Component ──────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <span className="text-sm font-bold text-white">T</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-gray-900">TRUE <span className="text-blue-600">LIGHT</span></span>
          </Link>
          <nav className="hidden gap-6 md:flex">
            <a href="#features" className="text-sm text-gray-600 hover:text-gray-900">Features</a>
            <a href="#how-it-works" className="text-sm text-gray-600 hover:text-gray-900">How It Works</a>
            <a href="#plans" className="text-sm text-gray-600 hover:text-gray-900">Plans</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">
              Sign In
            </Link>
            <Link href="/register" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Slider */}
      <HeroSlider />

      {/* Trust Bar */}
      <section className="border-b border-gray-100 bg-gray-50 px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-8 text-sm text-gray-500">
          <span className="flex items-center gap-2"><span className="text-green-500">✓</span> No coding required</span>
          <span className="flex items-center gap-2"><span className="text-green-500">✓</span> Mobile responsive</span>
          <span className="flex items-center gap-2"><span className="text-green-500">✓</span> Custom domain support</span>
          <span className="flex items-center gap-2"><span className="text-green-500">✓</span> Managed hosting</span>
          <span className="flex items-center gap-2"><span className="text-green-500">✓</span> Dedicated support</span>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-6 text-3xl font-bold text-gray-900 sm:text-4xl" style={{ letterSpacing: '-0.5px' }}>
            Church Website Management,<br />
            <span className="text-blue-600">Simplified.</span>
          </h2>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">
            TRUE LIGHT provides a complete church website platform — professionally designed,
            easy to manage, and fully hosted. We handle the technology so your team can focus
            on what matters most: ministry.
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-gray-50 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">Everything Your Church Needs</h2>
            <p className="text-gray-600">A complete platform built specifically for church ministry.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl bg-white p-7 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
                <div className="mb-4 text-3xl">{f.icon}</div>
                <h3 className="mb-2 text-base font-bold text-gray-900">{f.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">How It Works</h2>
            <p className="text-gray-600">Get your church online in four simple steps.</p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {process_steps.map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-xl font-bold text-blue-600">
                  {s.step}
                </div>
                <h3 className="mb-2 text-base font-bold text-gray-900">{s.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="bg-gray-50 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">Simple, Transparent Pricing</h2>
            <p className="text-gray-600">Choose the plan that fits your church. Upgrade or downgrade anytime.</p>
          </div>
          <div className="grid gap-8 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border-2 bg-white p-8 transition-shadow hover:shadow-lg ${
                  plan.highlighted ? 'border-blue-600 shadow-xl' : 'border-gray-200'
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-xs font-bold text-white">
                    {plan.badge}
                  </span>
                )}
                <div className="mb-1 text-sm font-medium text-blue-600">{plan.subtitle}</div>
                <h3 className="mb-2 text-xl font-bold text-gray-900">{plan.name}</h3>
                <div className="mb-3">
                  <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
                  <span className="text-gray-500">{plan.period}</span>
                </div>
                <p className="mb-6 text-sm leading-relaxed text-gray-600">{plan.description}</p>
                <ul className="mb-8 space-y-3">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm text-gray-700">
                      <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.name === 'Enterprise' ? 'mailto:hello@truelight.app' : '/register'}
                  className={`block w-full rounded-xl py-3.5 text-center text-sm font-bold transition-colors ${
                    plan.highlighted
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-gray-500">
            All plans include hosting, SSL, backups, and platform updates. No hidden fees.<br />
            Need more members? Add 50 members for $10/mo. Over 1,000 members? <a href="mailto:hello@truelight.app" className="text-blue-600 hover:underline">Contact us</a> for a custom plan.
          </p>

          {/* Custom Design Add-on */}
          <div className="mt-12 mx-auto max-w-3xl rounded-2xl border-2 border-dashed border-gray-300 bg-white p-8 text-center">
            <div className="mb-3 text-3xl">🎨</div>
            <h3 className="mb-2 text-xl font-bold text-gray-900">{customDesignAddon.title}</h3>
            <p className="mb-5 text-sm text-gray-600">{customDesignAddon.description}</p>
            <div className="mb-5 flex flex-wrap justify-center gap-3">
              {customDesignAddon.features.map((f) => (
                <span key={f} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">{f}</span>
              ))}
            </div>
            <p className="mb-1 text-2xl font-bold text-gray-900">{customDesignAddon.price}</p>
            <p className="text-xs text-gray-500">{customDesignAddon.note}</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-3xl bg-gradient-to-br from-blue-600 to-blue-800 px-8 py-16 text-center shadow-2xl sm:px-16">
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">Ready to Get Started?</h2>
          <p className="mb-8 text-base text-blue-100">
            Join churches across the U.S. using TRUE LIGHT to connect with their communities online.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/register" className="rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-blue-700 shadow-lg hover:bg-gray-50">
              Get Started Now
            </Link>
            <a href="mailto:hello@truelight.app" className="rounded-xl border border-white/30 px-8 py-3.5 text-sm font-semibold text-white hover:bg-white/10">
              Contact Us
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <span className="text-lg font-bold text-gray-900">TRUE <span className="text-blue-600">LIGHT</span></span>
              <p className="mt-3 text-sm text-gray-500">Professional church website platform for modern ministries.</p>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-bold text-gray-900">Platform</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#features" className="hover:text-gray-700">Features</a></li>
                <li><a href="#plans" className="hover:text-gray-700">Pricing</a></li>
                <li><Link href="/embed" className="hover:text-gray-700">Widget Embed</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-bold text-gray-900">Support</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="mailto:hello@truelight.app" className="hover:text-gray-700">Contact Us</a></li>
                <li><Link href="/login" className="hover:text-gray-700">Admin Login</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-bold text-gray-900">Company</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="/terms" className="hover:text-gray-700">Terms of Service</a></li>
                <li><a href="/privacy" className="hover:text-gray-700">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-gray-200 pt-6 text-center text-xs text-gray-400">
            &copy; {new Date().getFullYear()} TRUE LIGHT by DASOMWEB. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
