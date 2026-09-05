import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — GeTopFloor",
  description: "Privacy policy and data protection practices for GeTopFloor.",
};

export default function PrivacyPage() {
  return (
    <div className="legal-doc-page">
      <div className="legal-doc-container">
        
        {/* Top Header Navigation */}
        <div className="legal-header-bar">
          <Link href="/" className="legal-back-btn">
            <span>←</span>
            <span>Back to Skyscraper</span>
          </Link>
          <span className="legal-badge">
            Privacy Policy
          </span>
        </div>

        {/* Title Block */}
        <header className="legal-title-block">
          <h1 className="legal-main-title">
            Privacy Policy
          </h1>
          <p className="legal-sub-title">
            Effective Date: September 2026 • GeTopFloor (https://getopfloor.com)
          </p>
        </header>

        {/* Section 1 */}
        <section className="legal-section">
          <h2 className="legal-section-title">
            1. Information We Collect (Zero-Login Architecture)
          </h2>
          <p className="legal-text">
            <strong>GeTopFloor</strong> operates on a <strong>zero-login, frictionless architecture</strong>. We do not require visitors or founders to register user accounts, choose passwords, or create customer profiles. We collect only the essential information necessary to verify domains, process secure transactions, and render your digital placement on the 3D skyscraper:
          </p>
          <div className="legal-card">
            <ul className="legal-list">
              <li className="legal-list-item">
                <strong>Order &amp; Billing Contact Data:</strong> Contact email address provided during checkout strictly to deliver digital payment receipts, claim confirmations, and critical transaction notifications.
              </li>
              <li className="legal-list-item">
                <strong>Public Company &amp; Listing Details:</strong> Company name, destination website URL, category, tagline, description, and brand logo submitted for display on the 3D tower and interactive directory.
              </li>
              <li className="legal-list-item">
                <strong>Transaction &amp; Fulfillment Details:</strong> Payment status, checkout session/order ID, transaction amount, and timestamp. All payments are processed securely by authorized, PCI-DSS certified payment gateway and payment aggregator partners. We never handle, store, or have access to raw debit/credit card numbers, CVVs, UPI PINs, or net-banking credentials.
              </li>
              <li className="legal-list-item">
                <strong>Automated Domain &amp; Asset Data:</strong> Technical verification metadata including live HTTPS status, DNS resolution, and brand assets (SVGs, touch icons) scraped from the public destination URL and cached on Vercel Blob CDN.
              </li>
              <li className="legal-list-item">
                <strong>Privacy-Preserving Live Analytics:</strong> Aggregated, non-identifying telemetry including active tab sessions, real-time live visitor counters, and country codes derived from network edge headers (without storing raw IP addresses).
              </li>
            </ul>
          </div>
        </section>

        {/* Section 2 */}
        <section className="legal-section">
          <h2 className="legal-section-title">
            2. How We Use Your Information
          </h2>
          <p className="legal-text">
            We use collected listing and order information strictly to:
          </p>
          <ul className="legal-list" style={{ marginBottom: "16px" }}>
            <li className="legal-list-item">Render and publish your company&apos;s verified floor spot on the live 3D skyscraper and interactive search directory.</li>
            <li className="legal-list-item">Deliver automated payment receipts and digital fulfillment confirmations to your billing email.</li>
            <li className="legal-list-item">Process founder-requested listing modifications, logo updates, or voluntary floor deletions via verified email support.</li>
            <li className="legal-list-item">Screen submitted domains for security, prevent malicious links or phishing, and maintain platform integrity.</li>
          </ul>
          <p className="legal-text" style={{ fontWeight: 600 }}>
            We do not engage in behavioral user tracking, cross-site advertising profiling, or the sale or renting of personal data to third parties.
          </p>
        </section>

        {/* Section 3 */}
        <section className="legal-section">
          <h2 className="legal-section-title">
            3. Third-Party Service Providers
          </h2>
          <p className="legal-text">
            We rely on trusted, industry-standard infrastructure and service providers to operate the platform:
          </p>
          <div className="legal-grid-2">
            <div className="legal-grid-item">
              <h3 className="legal-grid-title">Payment Gateways &amp; Aggregators</h3>
              <p className="legal-grid-desc">
                Authorized, RBI-regulated and PCI-DSS Level 1 certified payment processing partners handling secure, encrypted transactions across UPI, Debit/Credit Cards, NetBanking, and Digital Wallets.
              </p>
            </div>
            <div className="legal-grid-item">
              <h3 className="legal-grid-title">Vercel &amp; Vercel Blob CDN</h3>
              <p className="legal-grid-desc">
                Global serverless cloud hosting and secure asset CDN storage for high-resolution company logos, 3D assets, and WebGL textures.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4 */}
        <section className="legal-section">
          <h2 className="legal-section-title">
            4. Data Retention, Updates &amp; Deletion Rights
          </h2>
          <p className="legal-text">
            Because GeTopFloor does not maintain user accounts or passwords, you do not need to navigate an account settings dashboard to manage your data.
          </p>
          <p className="legal-text">
            Founders retain full control over their public listings. To request an update to your company information, upload a revised logo, or request permanent deletion of your listing and associated contact data, email our compliance team at <a href="mailto:support@getopfloor.com" style={{ color: "#ea580c", fontWeight: 600, textDecoration: "underline" }}>support@getopfloor.com</a> from an authorized email address at your listed company domain. All requests are verified and processed within <strong>24–48 hours</strong>.
          </p>
        </section>

        {/* Section 5 */}
        <section className="legal-section" style={{ borderTop: "1px solid #e2e8f0", paddingTop: "32px" }}>
          <h2 className="legal-section-title" style={{ borderLeft: "none", paddingLeft: 0 }}>
            5. Contact Information
          </h2>
          <p className="legal-text" style={{ fontSize: "14px" }}>
            For privacy inquiries or compliance notices, reach out to our team:
          </p>
          <div className="legal-card" style={{ marginTop: "12px" }}>
            <p style={{ margin: "0 0 6px 0", fontWeight: 700, fontSize: "14px", color: "#0f172a" }}>GeTopFloor Compliance Team</p>
            <p style={{ margin: "0 0 4px 0", fontSize: "13.5px", color: "#475569" }}>Email: <a href="mailto:support@getopfloor.com" style={{ color: "#ea580c", fontWeight: 600, textDecoration: "underline" }}>support@getopfloor.com</a></p>
            <p style={{ margin: 0, fontSize: "13.5px", color: "#475569" }}>Website: <a href="https://getopfloor.com" style={{ color: "#ea580c", fontWeight: 600, textDecoration: "underline" }}>https://getopfloor.com</a></p>
          </div>
        </section>

        {/* Footer Navigation */}
        <footer className="legal-footer-nav">
          <div className="legal-footer-links">
            <Link href="/terms" className="legal-footer-link">Terms of Service</Link>
            <Link href="/rules" className="legal-footer-link">Platform Rules</Link>
            <Link href="/privacy" className="legal-footer-link active">Privacy Policy</Link>
          </div>
          <Link href="/" className="legal-footer-home">
            Return to Skyscraper →
          </Link>
        </footer>

      </div>
    </div>
  );
}
