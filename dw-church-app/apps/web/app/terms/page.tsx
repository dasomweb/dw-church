import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — TRUE LIGHT',
  description: 'Terms of Service for TRUE LIGHT, a church website and online-ministry solution.',
};

// Plain English Terms of Service. Governing law: State of Georgia, USA.
// NOTE: This is a good-faith draft and is NOT legal advice. Have it reviewed by
// a licensed Georgia attorney before relying on it.
export default function TermsPage() {
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
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Terms of Service</h1>
        <p className="mb-8 text-sm text-gray-500">Last updated: June 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-gray-700">
          <section>
            <p>
              These Terms of Service (&quot;Terms&quot;) govern your access to and use of the
              websites, software, and services (collectively, the &quot;Service&quot;) provided by
              TRUE LIGHT (&quot;TRUE LIGHT,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By submitting an
              application, creating an account, or using the Service, you (&quot;you,&quot; the
              &quot;Customer,&quot; or the &quot;Church&quot;) agree to these Terms.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-gray-900">1. The Service</h2>
            <p>
              TRUE LIGHT is a church online-ministry solution that provides a hosted church
              website together with content and ministry tools. We set up and configure each
              site; the Customer manages its own content (text and images) thereafter.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-gray-900">2. Eligibility &amp; Statement of Faith</h2>
            <p className="mb-3">
              The Service is offered to Christian churches and ministries that affirm the historic
              Christian faith summarized in the Apostles&apos; and Nicene Creeds (the &quot;Statement of
              Faith&quot;), namely:
            </p>
            <ul className="mb-3 list-disc space-y-1 pl-5">
              <li>One God, eternally existing in three persons — Father, Son, and Holy Spirit (the Trinity);</li>
              <li>The full deity and humanity of Jesus Christ, His virgin birth, atoning death, and bodily resurrection;</li>
              <li>Salvation by grace through faith in Jesus Christ;</li>
              <li>The divine inspiration and authority of the Bible (the Old and New Testaments);</li>
              <li>The bodily return of Jesus Christ.</li>
            </ul>
            <p>
              By applying, you represent that your church affirms this Statement of Faith. Churches
              of any recognized denomination as well as independent / non-denominational churches
              that affirm this Statement of Faith are eligible. Because building and hosting a church
              website is expressive work carried out in furtherance of our mission, we serve churches
              aligned with this Statement of Faith and may decline or discontinue the Service where
              this eligibility requirement is not met. These eligibility decisions are based on
              doctrinal alignment and the expressive nature of our work, and are not based on any
              characteristic protected under applicable federal or Georgia law.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-gray-900">3. Accounts &amp; Responsibilities</h2>
            <p>
              You are responsible for the accuracy of the information you provide, for maintaining
              the confidentiality of your account credentials, and for all activity under your
              account. You must promptly notify us of any unauthorized use.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-gray-900">4. Fees &amp; Billing</h2>
            <p>
              The Service is offered in tiered plans billed monthly or annually, plus a one-time
              setup fee that covers initial design, build, and (where applicable) migration of
              existing content. Recurring fees are billed in advance and are non-refundable except
              as required by law. The setup fee is non-refundable once setup work has begun. Plans
              may be upgraded at any time; fees are subject to change with reasonable notice.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-gray-900">5. Your Content &amp; Ownership</h2>
            <p>
              You retain ownership of all content you upload (sermons, bulletins, photos, text,
              and similar materials). You grant us a limited license to host and display that
              content solely to operate the Service. You may export your content at any time using
              the export feature included with your plan.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-gray-900">6. Acceptable Use</h2>
            <p>
              You agree not to use the Service to upload unlawful content, infringe others&apos;
              rights, distribute malware, or attempt to disrupt or gain unauthorized access to the
              Service. We may remove content or suspend accounts that violate these Terms.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-gray-900">7. Intellectual Property</h2>
            <p>
              The Service, including its software, designs, and templates, is owned by TRUE LIGHT
              and protected by applicable law. Except for your own content, no rights are granted
              to you other than the limited right to use the Service under these Terms.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-gray-900">8. Termination</h2>
            <p>
              You may cancel at any time; cancellation takes effect at the end of the current
              billing period. We may suspend or terminate the Service for violation of these Terms
              or as described in Section 2. Upon termination, you may export your content for a
              reasonable period before it is removed.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-gray-900">9. Disclaimers &amp; Limitation of Liability</h2>
            <p>
              The Service is provided &quot;as is&quot; without warranties of any kind to the fullest
              extent permitted by law. To the maximum extent permitted by law, TRUE LIGHT&apos;s total
              liability arising out of or relating to the Service shall not exceed the amounts you
              paid to us in the twelve (12) months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-gray-900">10. Governing Law &amp; Dispute Resolution</h2>
            <p>
              These Terms are governed by the laws of the State of Georgia, USA, without regard to
              its conflict-of-laws rules. <strong>Before initiating any arbitration or lawsuit, the
              parties agree to first attempt in good faith to resolve any dispute through informal
              negotiation and, if needed, mediation, for a period of at least thirty (30) days from
              the date written notice of the dispute is given.</strong> If the dispute is not
              resolved within that 30-day period, it shall be resolved in the state or federal
              courts located in Georgia, and the parties consent to the jurisdiction of those courts.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-gray-900">11. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. Material changes will be communicated
              by posting the updated Terms with a new &quot;Last updated&quot; date. Continued use of the
              Service after changes take effect constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-gray-900">12. Contact</h2>
            <p>
              Questions about these Terms: <a href="mailto:info@truelight.app" className="text-blue-600 hover:underline">info@truelight.app</a>.
              Customer support: <a href="mailto:support@truelight.app" className="text-blue-600 hover:underline">support@truelight.app</a>.
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
