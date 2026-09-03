import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — GeTopFloor",
  description: "Privacy policy and data protection practices for GeTopFloor.",
};

export default function PrivacyPage() {
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
              Privacy Policy
            </h1>
            <p className="text-sm text-slate-400 mt-2">
              Effective Date: September 2026 • GeTopFloor (https://getopfloor.com)
            </p>
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">1. Information We Collect</h2>
          <p className="text-slate-300 leading-relaxed">
            When you use GeTopFloor or claim a floor spot, we collect:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2 text-sm">
            <li><strong>Account & Contact Info:</strong> Email address and name provided via Google OAuth or during checkout.</li>
            <li><strong>Startup Details:</strong> Company name, website URL, description, category, and public brand logo.</li>
            <li><strong>Transaction Details:</strong> Payment confirmation status, payment ID, and amount paid (we do not store raw credit card or banking PINs; all payment processing is handled by Dodo Payments).</li>
            <li><strong>Usage Analytics:</strong> Aggregated, privacy-preserving page view statistics and country of origin.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">2. How We Use Information</h2>
          <p className="text-slate-300 leading-relaxed">
            We use your data solely to fulfill your digital advertising placement, authenticate floor ownership for edits, and maintain security across the platform. We never sell your personal data to third parties.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">3. Third-Party Service Providers</h2>
          <p className="text-slate-300 leading-relaxed">
            We work with trusted third-party providers including:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-300 ml-2 text-sm">
            <li><strong>Dodo Payments</strong> — Merchant of Record for payment processing and invoice fulfillment.</li>
            <li><strong>Google OAuth</strong> — Secure authentication for floor management.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">4. Your Rights & Deletion Requests</h2>
          <p className="text-slate-300 leading-relaxed">
            You may request deletion or modification of your floor listing and account data at any time by emailing: <a href="mailto:support@getopfloor.com" className="text-amber-400 hover:underline font-mono">support@getopfloor.com</a>.
          </p>
        </section>

        <div className="border-t border-white/10 pt-8 flex flex-wrap gap-6 text-sm text-slate-400">
          <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          <Link href="/privacy" className="text-amber-400 font-semibold">Privacy Policy</Link>
          <Link href="/rules" className="hover:text-white transition-colors">Platform Rules</Link>
          <Link href="/" className="hover:text-white transition-colors ml-auto">Return to Home</Link>
        </div>
      </div>
    </main>
  );
}
