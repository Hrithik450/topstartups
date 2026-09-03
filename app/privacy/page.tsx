import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — GeTopFloor",
  description: "Privacy policy and data protection practices for GeTopFloor.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#050811] text-slate-100 py-20 px-6 sm:px-10 lg:px-16 font-sans antialiased selection:bg-amber-500/30 selection:text-amber-200">
      <div className="max-w-4xl mx-auto space-y-16">
        
        {/* Navigation & Header */}
        <header className="space-y-6 border-b border-white/10 pb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400/90 hover:text-amber-300 transition-colors"
          >
            ← Back to 3D Skyscraper
          </Link>
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Privacy Policy
            </h1>
            <p className="text-sm text-slate-400 leading-normal">
              Effective Date: September 2026 • GeTopFloor (https://getopfloor.com)
            </p>
          </div>
        </header>

        {/* Section 1 */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            1. Information We Collect
          </h2>
          <p className="text-slate-300 text-base leading-relaxed">
            When you use GeTopFloor or claim a floor spot, we collect:
          </p>
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-3">
            <ul className="list-disc list-inside space-y-2 text-slate-300 text-sm leading-relaxed pl-2">
              <li><strong>Account &amp; Contact Info:</strong> Email address and name provided via Google OAuth or during checkout.</li>
              <li><strong>Startup Details:</strong> Company name, website URL, description, category, and public brand logo.</li>
              <li><strong>Transaction Records:</strong> Payment confirmation status, payment ID, and amount paid (we do not store raw credit card or banking PINs; all payment processing is handled by Dodo Payments).</li>
              <li><strong>Usage Analytics:</strong> Aggregated, privacy-preserving page view statistics and country of origin.</li>
            </ul>
          </div>
        </section>

        {/* Section 2 */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            2. How We Use Information
          </h2>
          <p className="text-slate-300 text-base leading-relaxed">
            We use your data solely to fulfill your digital advertising placement, authenticate floor ownership for edits, and maintain security across the platform. We never sell your personal data to third parties.
          </p>
        </section>

        {/* Section 3 */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            3. Third-Party Service Providers
          </h2>
          <p className="text-slate-300 text-base leading-relaxed">
            We work with trusted third-party service providers, including:
          </p>
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-3">
            <ul className="list-disc list-inside space-y-2 text-slate-300 text-sm leading-relaxed pl-2">
              <li><strong>Dodo Payments</strong> — Authorized Merchant of Record for global checkout processing, tax compliance, and invoice fulfillment.</li>
              <li><strong>Google OAuth</strong> — Secure identity provider for floor management authentication.</li>
            </ul>
          </div>
        </section>

        {/* Section 4 */}
        <section className="space-y-4 border-t border-white/10 pt-10">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            4. Your Rights &amp; Deletion Requests
          </h2>
          <p className="text-slate-300 text-base leading-relaxed">
            You may request deletion or modification of your floor listing and account data at any time by contacting: <a href="mailto:support@getopfloor.com" className="text-amber-400 hover:underline font-mono">support@getopfloor.com</a>.
          </p>
        </section>

        {/* Footer Navigation */}
        <footer className="border-t border-white/10 pt-10 flex flex-wrap gap-8 text-sm text-slate-400">
          <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          <Link href="/privacy" className="text-amber-400 font-semibold">Privacy Policy</Link>
          <Link href="/rules" className="hover:text-white transition-colors">Platform Rules</Link>
          <Link href="/" className="hover:text-white transition-colors ml-auto font-medium">Return to Skyscraper →</Link>
        </footer>

      </div>
    </main>
  );
}
