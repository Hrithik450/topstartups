import Link from "next/link";

export const metadata = {
  title: "Terms of Service & Acceptable Use — GeTopFloor",
  description: "Terms and conditions governing the purchase and display of startup floor spots on GeTopFloor.",
};

export default function TermsPage() {
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
            Terms of Service
          </span>
        </div>

        {/* Title Block */}
        <header className="legal-title-block">
          <h1 className="legal-main-title">
            Terms of Service &amp; Acceptable Use
          </h1>
          <p className="legal-sub-title">
            Effective Date: September 2026 • GeTopFloor (https://getopfloor.com)
          </p>
        </header>

        {/* Section 1 */}
        <section className="legal-section">
          <h2 className="legal-section-title">
            1. Overview &amp; Service Description
          </h2>
          <p className="legal-text">
            <strong>GeTopFloor</strong> operates an interactive 3D digital skyscraper and startup discovery platform. By claiming a floor or purchasing placement, you acquire a prominent digital advertisement listing on our virtual tower, which includes your startup name, destination URL, description, category, and brand logo rendered directly into the 3D scene and interactive directory.
          </p>
        </section>

        {/* Section 2 */}
        <section className="legal-section">
          <h2 className="legal-section-title">
            2. Floor Claiming &amp; Outbidding Mechanics
          </h2>
          <p className="legal-text">
            The skyscraper operates on a transparent, competitive outbid leaderboard designed to maximize startup visibility:
          </p>
          <div className="legal-card">
            <ul className="legal-list">
              <li className="legal-list-item">
                <strong>Dynamic Leaderboard Ranking:</strong> Floor rankings are calculated in real time by total price paid (ordered by price paid descending, followed by claim timestamp ascending).
              </li>
              <li className="legal-list-item">
                <strong>Penthouse Top Floor (#1):</strong> The startup with the highest cumulative bid occupies the prestigious Penthouse Floor #1 for maximum global exposure.
              </li>
              <li className="legal-list-item">
                <strong>Flexible Entry:</strong> Startups can claim a verified floor spot with an entry bid starting at ₹50.
              </li>
              <li className="legal-list-item">
                <strong>Outbidding &amp; Climbing Ranks:</strong> Existing startups can place incremental bids at any time to climb higher up the skyscraper or reclaim Top Floor (#1).
              </li>
              <li className="legal-list-item">
                <strong>Real-Time 3D Rendering:</strong> Claimed floors and brand marks are rendered immediately upon payment confirmation without manual delays.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 3 */}
        <section className="legal-section">
          <h2 className="legal-section-title">
            3. Payments &amp; Refunds
          </h2>
          <p className="legal-text">
            All payments are processed securely through our authorized payment processing partner, <strong>Cashfree Payments</strong> (supporting UPI, NetBanking, Debit/Credit Cards, and Wallets).
          </p>
          <p className="legal-text">
            Because floor placements are fulfilled immediately in real time on the live 3D skyscraper upon successful payment, floor spot purchases are generally non-refundable once published, except in cases of billing error or technical placement failure.
          </p>
        </section>

        {/* Section 4 */}
        <section className="legal-section">
          <h2 className="legal-section-title">
            4. Content Standards &amp; Moderation
          </h2>
          <p className="legal-text">
            All submitted URLs and descriptions must comply strictly with our <Link href="/rules" style={{ color: "#ea580c", fontWeight: 600, textDecoration: "underline" }}>Platform Rules &amp; Moderation Guidelines</Link>. We reserve the absolute right to refuse service, remove listings, or ban domains that promote fraud, phishing, illicit trade, malware, hate speech, or adult content.
          </p>
        </section>

        {/* Section 5 */}
        <section className="legal-section">
          <h2 className="legal-section-title">
            5. Intellectual Property &amp; Brand Usage
          </h2>
          <p className="legal-text">
            You retain 100% ownership of your trademarks, logos, and company content. By submitting your listing, you grant GeTopFloor a non-exclusive license to display your company name, logo, and website link on the 3D tower and promotional materials.
          </p>
        </section>

        {/* Section 6 */}
        <section className="legal-section" style={{ borderTop: "1px solid #e2e8f0", paddingTop: "32px" }}>
          <h2 className="legal-section-title" style={{ borderLeft: "none", paddingLeft: 0 }}>
            6. Contact &amp; Support
          </h2>
          <p className="legal-text" style={{ fontSize: "14px" }}>
            For billing inquiries, questions regarding these terms, or technical support:
          </p>
          <div className="legal-card" style={{ marginTop: "12px" }}>
            <p style={{ margin: "0 0 6px 0", fontWeight: 700, fontSize: "14px", color: "#0f172a" }}>GeTopFloor Support</p>
            <p style={{ margin: "0 0 4px 0", fontSize: "13.5px", color: "#475569" }}>Email: <a href="mailto:support@getopfloor.com" style={{ color: "#ea580c", fontWeight: 600, textDecoration: "underline" }}>support@getopfloor.com</a></p>
            <p style={{ margin: 0, fontSize: "13.5px", color: "#475569" }}>Website: <a href="https://getopfloor.com" style={{ color: "#ea580c", fontWeight: 600, textDecoration: "underline" }}>https://getopfloor.com</a></p>
          </div>
        </section>

        {/* Footer Navigation */}
        <footer className="legal-footer-nav">
          <div className="legal-footer-links">
            <Link href="/terms" className="legal-footer-link active">Terms of Service</Link>
            <Link href="/rules" className="legal-footer-link">Platform Rules</Link>
            <Link href="/privacy" className="legal-footer-link">Privacy Policy</Link>
          </div>
          <Link href="/" className="legal-footer-home">
            Return to Skyscraper →
          </Link>
        </footer>

      </div>
    </div>
  );
}
