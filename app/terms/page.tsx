import Link from "next/link";

export const metadata = {
  title: "Terms of Service & Acceptable Use — GeTopFloor",
  description: "Terms and conditions governing the purchase and display of startup floor spots on GeTopFloor.",
};

export default function TermsPage() {
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
              Terms of Service &amp; Acceptable Use
            </h1>
            <p className="text-sm text-slate-400 leading-normal">
              Effective Date: September 2026 • GeTopFloor (https://getopfloor.com)
            </p>
          </div>
        </header>

        {/* Section 1 */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            1. Service Description
          </h2>
          <p className="text-slate-300 text-base leading-relaxed">
            GeTopFloor provides an interactive 3D digital billboard and startup directory. By purchasing or claiming a floor, you receive a digital advertisement slot on our 50-story 3D skyscraper representing your startup&apos;s name, URL, tagline, and logo.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            2. Payments, Pricing &amp; Outbidding Mechanism
          </h2>
          <p className="text-slate-300 text-base leading-relaxed">
            All payments are processed securely through our authorized Merchant of Record, <strong>Dodo Payments</strong>. Floor claims operate on an outbid ladder structure:
          </p>
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-3">
            <ul className="list-disc list-inside space-y-2 text-slate-300 text-sm leading-relaxed pl-2">
              <li>When a new startup claims the Top Floor (Rank #1), all existing floors shift downward by one level (Rank 1 becomes Rank 2, Rank 2 becomes Rank 3, etc.).</li>
              <li>All 50 floors remain permanently indexed, visible, and interactable in the 3D tower and floor directory.</li>
              <li>Floor spot purchases are non-refundable once digital placement is fulfilled and published to the live 3D tower.</li>
            </ul>
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            3. Content Standards &amp; Right of Refusal
          </h2>
          <p className="text-slate-300 text-base leading-relaxed">
            All submitted content must comply with our <Link href="/rules" className="text-amber-400 hover:underline font-medium">Platform Rules &amp; Moderation Guidelines</Link>. We reserve the absolute right to refuse service, remove listings, or ban domains that engage in fraud, phishing, illicit trade, malware distribution, or adult entertainment.
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            4. Intellectual Property
          </h2>
          <p className="text-slate-300 text-base leading-relaxed">
            You retain all rights to your startup trademarks, logos, and branding. By submitting your company details, you grant GeTopFloor a worldwide, non-exclusive license to display your logo, title, and website preview on the 3D skyscraper for advertising purposes.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-4 border-t border-white/10 pt-10">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            5. Contact Information
          </h2>
          <p className="text-slate-300 text-base leading-relaxed">
            For support, billing inquiries, or compliance notices, please reach out to us at: <a href="mailto:support@getopfloor.com" className="text-amber-400 hover:underline font-mono">support@getopfloor.com</a>
          </p>
        </section>

        {/* Footer Navigation */}
        <footer className="border-t border-white/10 pt-10 flex flex-wrap gap-8 text-sm text-slate-400">
          <Link href="/terms" className="text-amber-400 font-semibold">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link href="/rules" className="hover:text-white transition-colors">Platform Rules</Link>
          <Link href="/" className="hover:text-white transition-colors ml-auto font-medium">Return to Skyscraper →</Link>
        </footer>

      </div>
    </main>
  );
}
