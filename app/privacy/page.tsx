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
            1. Information We Collect
          </h2>
          <p className="legal-text">
            When you visit GeTopFloor, authenticate an account, or claim a virtual floor on the skyscraper, we collect only the essential information needed to fulfill our digital advertising and discovery services:
          </p>
          <div className="legal-card">
            <ul className="legal-list">
              <li className="legal-list-item">
                <strong>Account &amp; Profile Data:</strong> Email address and profile name provided through Google OAuth authentication.
              </li>
              <li className="legal-list-item">
                <strong>Company &amp; Listing Details:</strong> Company name, destination website URL, product category, tagline, description, and brand logo.
              </li>
              <li className="legal-list-item">
                <strong>Transaction &amp; Order Details:</strong> Payment status, checkout session ID, transaction amount, and timestamp. All payments are securely processed by our authorized Merchant of Record, <strong>Dodo Payments</strong>. We never store raw payment cards or banking PINs.
              </li>
              <li className="legal-list-item">
                <strong>Aggregated Analytics:</strong> Privacy-preserving aggregated metrics, including visitor country of origin and total tower views.
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
            We use your collected information strictly to:
          </p>
          <ul className="legal-list" style={{ marginBottom: "16px" }}>
            <li className="legal-list-item">Publish and showcase your startup on your claimed skyscraper floor.</li>
            <li className="legal-list-item">Verify floor ownership and allow you to manage or update your floor listing.</li>
            <li className="legal-list-item">Deliver automated payment receipts and claim confirmation notifications.</li>
            <li className="legal-list-item">Protect platform integrity, prevent fraudulent submissions, and enforce our moderation rules.</li>
          </ul>
          <p className="legal-text" style={{ fontWeight: 600 }}>
            We never sell, rent, or monetize your personal information with third-party advertisers.
          </p>
        </section>

        {/* Section 3 */}
        <section className="legal-section">
          <h2 className="legal-section-title">
            3. Third-Party Service Providers
          </h2>
          <p className="legal-text">
            We partner with vetted, industry-leading infrastructure and payment partners:
          </p>
          <div className="legal-grid-2">
            <div className="legal-grid-item">
              <h3 className="legal-grid-title">Dodo Payments</h3>
              <p className="legal-grid-desc">
                Authorized global Merchant of Record handling billing, PCI-compliant payment processing, tax remittance, and invoices.
              </p>
            </div>
            <div className="legal-grid-item">
              <h3 className="legal-grid-title">Google OAuth</h3>
              <p className="legal-grid-desc">
                Secure identity provider used for passwordless, authenticated floor management.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4 */}
        <section className="legal-section">
          <h2 className="legal-section-title">
            4. Data Retention &amp; Your Rights
          </h2>
          <p className="legal-text">
            You have the right to access, update, or request permanent deletion of your listing and associated personal data at any time.
          </p>
          <p className="legal-text">
            To submit a data access or deletion request, please email our team at <a href="mailto:support@getopfloor.com" style={{ color: "#ea580c", fontWeight: 600, textDecoration: "underline" }}>support@getopfloor.com</a>. Requests are processed within 48 hours.
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
