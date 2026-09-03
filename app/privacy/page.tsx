import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — GeTopFloor",
  description: "Privacy policy and data protection practices for GeTopFloor.",
};

export default function PrivacyPage() {
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
            Legal Document
          </span>
        </div>

        {/* Document Header */}
        <header className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Privacy Policy
          </h1>
          <p className="text-sm text-slate-500">
            Effective Date: September 2026 • GeTopFloor (https://getopfloor.com)
          </p>
        </header>

        {/* Section 1 */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 border-l-4 border-orange-500 pl-3">
            1. Information We Collect
          </h2>
          <p className="text-slate-700 leading-relaxed text-base">
            When you visit GeTopFloor, register an account, or claim a virtual floor on the skyscraper, we collect only the information necessary to fulfill our digital advertising and discovery services:
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-3">
            <ul className="list-disc list-inside space-y-2 text-slate-700 text-sm leading-relaxed">
              <li><strong>Account &amp; Profile Data:</strong> Email address and profile name provided through Google OAuth login.</li>
              <li><strong>Company &amp; Listing Details:</strong> Company/startup name, destination website URL, product category, tagline, description, and brand logo.</li>
              <li><strong>Transaction &amp; Order Details:</strong> Payment status, checkout session ID, transaction amount, and timestamp. All payment transactions are securely processed by our authorized Merchant of Record, <strong>Dodo Payments</strong>. We never store raw credit card numbers or banking PINs.</li>
              <li><strong>Aggregated Analytics:</strong> Privacy-preserving aggregated metrics, including visitor country of origin and total tower views.</li>
            </ul>
          </div>
        </section>

        {/* Section 2 */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 border-l-4 border-orange-500 pl-3">
            2. How We Use Your Information
          </h2>
          <p className="text-slate-700 leading-relaxed text-base">
            We use your data solely to:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-700 text-base pl-2">
            <li>Publish and display your startup on your claimed skyscraper floor.</li>
            <li>Verify floor ownership and allow you to update or manage your listing.</li>
            <li>Deliver automated invoice receipts and payment confirmation notifications.</li>
            <li>Protect platform integrity, prevent fraudulent submissions, and enforce our moderation rules.</li>
          </ul>
          <p className="text-slate-700 leading-relaxed text-base font-medium">
            We never sell, rent, or monetize your personal information with third-party advertisers.
          </p>
        </section>

        {/* Section 3 */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 border-l-4 border-orange-500 pl-3">
            3. Third-Party Service Providers
          </h2>
          <p className="text-slate-700 leading-relaxed text-base">
            We partner with vetted, industry-leading infrastructure and payment partners:
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-1">
              <h3 className="font-semibold text-slate-900 text-sm">Dodo Payments</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Authorized global Merchant of Record handling billing, PCI-compliant payment gateways, tax remittance, and invoices.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-1">
              <h3 className="font-semibold text-slate-900 text-sm">Google OAuth</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Secure identity provider used for passwordless, authenticated floor management.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4 */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 border-l-4 border-orange-500 pl-3">
            4. Data Retention &amp; Your Rights
          </h2>
          <p className="text-slate-700 leading-relaxed text-base">
            You have the right to access, update, or request permanent deletion of your listing and associated personal data at any time.
          </p>
          <p className="text-slate-700 leading-relaxed text-base">
            To submit a data access or deletion request, please email our support team at <a href="mailto:support@getopfloor.com" className="text-orange-600 font-semibold hover:underline">support@getopfloor.com</a>. Requests are processed within 48 hours.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-4 border-t border-slate-200 pt-8">
          <h2 className="text-xl font-bold text-slate-900">
            5. Contact Information
          </h2>
          <p className="text-slate-700 leading-relaxed text-sm">
            For any privacy inquiries or legal notices, contact our compliance team:
          </p>
          <div className="bg-slate-100 border border-slate-200 rounded-xl p-5 text-sm space-y-1 text-slate-800">
            <p><strong>GeTopFloor Compliance Team</strong></p>
            <p>Email: <a href="mailto:support@getopfloor.com" className="text-orange-600 hover:underline">support@getopfloor.com</a></p>
            <p>Website: <a href="https://getopfloor.com" className="text-orange-600 hover:underline">https://getopfloor.com</a></p>
          </div>
        </section>

        {/* Footer Navigation */}
        <footer className="border-t border-slate-200 pt-8 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-slate-900 transition-colors">Terms of Service</Link>
            <Link href="/rules" className="hover:text-slate-900 transition-colors">Platform Rules</Link>
            <Link href="/privacy" className="font-semibold text-slate-900">Privacy Policy</Link>
          </div>
          <Link href="/" className="font-semibold text-orange-600 hover:text-orange-700">Return to Skyscraper →</Link>
        </footer>

      </div>
    </div>
  );
}
