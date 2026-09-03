import Link from "next/link";

export const metadata = {
  title: "Terms of Service & Acceptable Use — GeTopFloor",
  description: "Terms and conditions governing the purchase and display of startup floor spots on GeTopFloor.",
};

export default function TermsPage() {
  return (
    <div className="legal-doc-page bg-white text-slate-900">
      <div className="legal-doc-container max-w-4xl mx-auto px-6 sm:px-10 py-16 sm:py-20 space-y-12">
        
        {/* Top Navigation */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors"
          >
            ← Back to Skyscraper
          </Link>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
            Legal Agreement
          </span>
        </div>

        {/* Document Header */}
        <header className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Terms of Service &amp; Acceptable Use
          </h1>
          <p className="text-sm text-slate-500">
            Effective Date: September 2026 • GeTopFloor (https://getopfloor.com)
          </p>
        </header>

        {/* Section 1 */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 border-l-4 border-orange-500 pl-3">
            1. Overview &amp; Service Description
          </h2>
          <p className="text-slate-700 leading-relaxed text-base">
            <strong>GeTopFloor</strong> operates an interactive 3D digital skyscraper and startup discovery platform. By claiming a floor or purchasing placement, you acquire a prominent digital advertisement listing on our 50-story virtual tower, which includes your startup name, URL, description, category, and brand logo.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 border-l-4 border-orange-500 pl-3">
            2. Floor Claiming &amp; Outbidding Mechanics
          </h2>
          <p className="text-slate-700 leading-relaxed text-base">
            The skyscraper operates on a competitive outbid hierarchy designed to maximize startup visibility:
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-3">
            <ul className="list-disc list-inside space-y-2 text-slate-700 text-sm leading-relaxed">
              <li><strong>Top Floor (#1 Placement):</strong> The most recent claim occupies the Penthouse Top Floor (Rank #1) for maximum exposure.</li>
              <li><strong>Sequential Shift:</strong> Whenever a new founder claims the top floor, all existing startups shift downward by one floor (Floor #1 becomes #2, #2 becomes #3, etc.).</li>
              <li><strong>Permanent Indexing:</strong> All 50 floors remain indexed, publicly searchable, and interactable on the 3D tower and floor directory.</li>
              <li><strong>Re-Claiming:</strong> Founders can re-claim the top floor at any time by paying the incremental price difference.</li>
            </ul>
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 border-l-4 border-orange-500 pl-3">
            3. Payments &amp; Refunds
          </h2>
          <p className="text-slate-700 leading-relaxed text-base">
            All payments are processed securely through our authorized Merchant of Record, <strong>Dodo Payments</strong>.
          </p>
          <p className="text-slate-700 leading-relaxed text-base">
            Because floor placements are fulfilled immediately in real time on the live 3D skyscraper upon successful payment, floor spot purchases are generally non-refundable once published, except in cases of billing error or technical placement failure.
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 border-l-4 border-orange-500 pl-3">
            4. Content Standards &amp; Moderation
          </h2>
          <p className="text-slate-700 leading-relaxed text-base">
            All submitted URLs and descriptions must comply strictly with our <Link href="/rules" className="text-orange-600 font-semibold hover:underline">Platform Rules &amp; Moderation Guidelines</Link>. We reserve the absolute right to refuse service, remove listings, or ban domains that promote fraud, phishing, illicit trade, malware, hate speech, or adult content.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 border-l-4 border-orange-500 pl-3">
            5. Intellectual Property &amp; Brand Usage
          </h2>
          <p className="text-slate-700 leading-relaxed text-base">
            You retain 100% ownership of your trademarks, logos, and company content. By submitting your listing, you grant GeTopFloor a non-exclusive license to display your company name, logo, and website link on the 3D tower and promotional materials.
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-4 border-t border-slate-200 pt-8">
          <h2 className="text-xl font-bold text-slate-900">
            6. Contact &amp; Support
          </h2>
          <p className="text-slate-700 leading-relaxed text-sm">
            For billing inquiries, questions regarding these terms, or technical support:
          </p>
          <div className="bg-slate-100 border border-slate-200 rounded-xl p-5 text-sm space-y-1 text-slate-800">
            <p><strong>GeTopFloor Support</strong></p>
            <p>Email: <a href="mailto:support@getopfloor.com" className="text-orange-600 hover:underline">support@getopfloor.com</a></p>
            <p>Website: <a href="https://getopfloor.com" className="text-orange-600 hover:underline">https://getopfloor.com</a></p>
          </div>
        </section>

        {/* Footer Navigation */}
        <footer className="border-t border-slate-200 pt-8 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex gap-4">
            <Link href="/terms" className="font-semibold text-slate-900">Terms of Service</Link>
            <Link href="/rules" className="hover:text-slate-900 transition-colors">Platform Rules</Link>
            <Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy Policy</Link>
          </div>
          <Link href="/" className="font-semibold text-orange-600 hover:text-orange-700">Return to Skyscraper →</Link>
        </footer>

      </div>
    </div>
  );
}
