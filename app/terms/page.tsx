import Link from "next/link";

export const metadata = {
  title: "Terms of Service & Acceptable Use — GeTopFloor",
  description: "Terms and conditions governing the purchase and display of startup floor spots on GeTopFloor.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#070b14] text-slate-200 py-16 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="border-b border-white/10 pb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors mb-3"
            >
              ← Back to Skyscraper
            </Link>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Terms of Service & Acceptable Use
            </h1>
            <p className="text-sm text-slate-400 mt-2">
              Effective Date: September 2026 • GeTopFloor (https://getopfloor.com)
            </p>
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">1. Service Description</h2>
          <p className="text-slate-300 leading-relaxed">
            GeTopFloor provides an interactive 3D digital billboard and startup directory. By purchasing or claiming a floor, you receive a digital advertisement slot on our 50-story 3D skyscraper representing your startup's name, URL, tagline, and logo.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">2. Payments, Pricing & Outbidding Mechanism</h2>
          <p className="text-slate-300 leading-relaxed">
            All payments are processed securely through our authorized Merchant of Record, <strong>Dodo Payments</strong>. Floor claims operate on an outbid ladder structure:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2 text-sm">
            <li>When a new startup claims the Top Floor (Rank #1), all existing floors shift downward by one level (Rank 1 becomes Rank 2, Rank 2 becomes Rank 3, etc.).</li>
            <li>All 50 floors remain visible and interactable in the 3D tower and floor directory.</li>
            <li>Floor spot purchases are non-refundable once digital placement is executed and published to the live 3D tower.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">3. Content Standards & Right of Refusal</h2>
          <p className="text-slate-300 leading-relaxed">
            All content must comply with our <Link href="/rules" className="text-amber-400 hover:underline font-medium">Platform Rules & Moderation Guidelines</Link>. We reserve the absolute right to refuse service, remove listings, or ban domains that engage in fraud, phishing, illicit trade, malware distribution, or adult entertainment.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">4. Intellectual Property</h2>
          <p className="text-slate-300 leading-relaxed">
            You retain all rights to your startup trademarks, logos, and branding. By submitting your company details, you grant GeTopFloor a worldwide, non-exclusive license to display your logo, title, and website preview on the 3D skyscraper for advertising purposes.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">5. Contact Information</h2>
          <p className="text-slate-300 leading-relaxed">
            For support, billing inquiries, or compliance notices, please contact: <a href="mailto:support@getopfloor.com" className="text-amber-400 hover:underline font-mono">support@getopfloor.com</a>
          </p>
        </section>

        <div className="border-t border-white/10 pt-8 flex flex-wrap gap-6 text-sm text-slate-400">
          <Link href="/terms" className="text-amber-400 font-semibold">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link href="/rules" className="hover:text-white transition-colors">Platform Rules</Link>
          <Link href="/" className="hover:text-white transition-colors ml-auto">Return to Home</Link>
        </div>
      </div>
    </main>
  );
}
