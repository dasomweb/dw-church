import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — TRUE LIGHT',
  description: 'Privacy Policy for TRUE LIGHT, a church website and online-ministry solution.',
};

// Plain English Privacy Policy. Governing law: State of Georgia, USA.
// NOTE: This is a good-faith draft and is NOT legal advice. Have it reviewed by
// a licensed Georgia attorney before relying on it.
export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <span className="text-sm font-bold text-white">T</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-gray-900">TRUE <span className="text-blue-600">LIGHT</span></span>
          </Link>
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">Home</Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="mb-8 text-sm text-gray-500">Last updated: June 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-gray-700">
          <section>
            <p>
              This Privacy Policy explains how TRUE LIGHT (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) collects,
              uses, and protects information in connection with our church online-ministry service
              (the &quot;Service&quot;). By using the Service, you agree to this Policy.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-gray-900">1. Information We Collect</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>Application information:</strong> church name, contact name, email, phone, church address, denomination, plan interest, and any message you provide.</li>
              <li><strong>Account information:</strong> login credentials and administrator details.</li>
              <li><strong>Content you upload:</strong> sermons, bulletins, photos, staff information, and similar materials.</li>
              <li><strong>Usage information:</strong> basic technical and log data needed to operate and secure the Service.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-gray-900">2. How We Use Information</h2>
            <p>
              We use information to review applications, provide and maintain the Service, set up
              and support your site, process payments, communicate with you, and comply with legal
              obligations. We do not sell your personal information.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-gray-900">3. How We Share Information</h2>
            <p>
              We share information only with service providers that help us operate the Service
              (for example, hosting and payment processing), bound by appropriate confidentiality
              and security obligations, or when required by law. We do not sell or rent personal
              information to third parties.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-gray-900">4. Data Retention, Export &amp; Deletion</h2>
            <p>
              We retain information for as long as your account is active or as needed to provide
              the Service and meet legal requirements. You may export your church&apos;s content at any
              time, and you may request deletion of your data by contacting us; we will delete it
              except where retention is required by law.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-gray-900">5. Security</h2>
            <p>
              We use reasonable administrative, technical, and physical safeguards to protect
              information. No method of transmission or storage is completely secure, and we cannot
              guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-gray-900">6. Cookies</h2>
            <p>
              The Service uses cookies and similar technologies necessary for authentication,
              preferences, and basic analytics. You can control cookies through your browser
              settings, though some features may not function without them.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-gray-900">7. Children&apos;s Privacy</h2>
            <p>
              The Service is intended for use by churches and their administrators, not by children.
              We do not knowingly collect personal information directly from children.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-gray-900">8. Governing Law</h2>
            <p>
              This Policy is governed by the laws of the State of Georgia, USA. Any dispute relating
              to this Policy is subject to the dispute-resolution process described in our Terms of
              Service, including a good-faith negotiation and mediation period of at least thirty
              (30) days before any litigation.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-gray-900">9. Changes to This Policy</h2>
            <p>
              We may update this Policy from time to time. Material changes will be posted here with
              a new &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-gray-900">10. Contact</h2>
            <p>
              Privacy questions: <a href="mailto:info@truelight.app" className="text-blue-600 hover:underline">info@truelight.app</a>.
              Support: <a href="mailto:support@truelight.app" className="text-blue-600 hover:underline">support@truelight.app</a>.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-gray-200 py-8 text-center text-xs text-gray-400">
        &copy; {new Date().getFullYear()} TRUE LIGHT by DASOMWEB. All rights reserved.
      </footer>
    </div>
  );
}
