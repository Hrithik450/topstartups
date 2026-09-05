import Link from "next/link";

export const metadata = {
  title: "Terms of Service & Acceptable Use — GeTopFloor",
  description: "Terms and conditions governing the zero-login claiming, outbidding, and display of startup floor spots on GeTopFloor.",
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
            1. Overview &amp; Zero-Login Service Model
          </h2>
          <p className="legal-text">
            <strong>GeTopFloor</strong> operates an interactive, real-time 3D digital skyscraper and discovery directory for technology startups, indie builders, and software businesses.
          </p>
          <p className="legal-text">
            Our platform operates on a <strong>frictionless, zero-login architecture</strong>. Founders and participants are not required to create user accounts, set passwords, or complete account sign-in procedures. Placements and rankings are directly associated with the company&apos;s verified public website domain. By claiming a floor spot or outbidding on the skyscraper, you purchase a prominent digital placement that showcases your company name, destination website URL, category, tagline, description, and brand logo rendered directly into our interactive 3D WebGL tower and search directory.
          </p>
        </section>

        {/* Section 2 */}
        <section className="legal-section">
          <h2 className="legal-section-title">
            2. Floor Claiming &amp; Outbidding Mechanics
          </h2>
          <p className="legal-text">
            The skyscraper operates on a transparent, competitive outbidding leaderboard governed by deterministic sorting rules:
          </p>
          <div className="legal-card">
            <ul className="legal-list">
              <li className="legal-list-item">
                <strong>Dynamic Leaderboard Ranking:</strong> Floor rankings are computed dynamically across all active placements ordered by <code>price_paid DESC, claimed_at ASC</code>. Every floor&apos;s height and position updates immediately without race conditions.
              </li>
              <li className="legal-list-item">
                <strong>Penthouse Top Floor (#1):</strong> The company with the highest cumulative bid occupies the prestigious Penthouse Floor #1 at the pinnacle of the 3D skyscraper.
              </li>
              <li className="legal-list-item">
                <strong>Entry Bid Starting at ₹50:</strong> Any eligible startup or tech product can claim a verified floor spot on the tower with an entry bid starting from ₹50.
              </li>
              <li className="legal-list-item">
                <strong>Climbing Ranks &amp; Outbidding:</strong> Existing startups can place incremental bids starting at ₹50 at any time to climb higher up the tower, or bid the calculated difference to outbid and reclaim Top Floor (#1).
              </li>
              <li className="legal-list-item">
                <strong>Instant Client-Side Placement (0ms Latency):</strong> Upon verified payment confirmation, placements are published directly into the live Zustand state and Three.js 3D canvas without requiring manual review delays.
              </li>
              <li className="legal-list-item">
                <strong>Domain Normalization:</strong> Brand domains are automatically standardized to lowercase hostnames (e.g., <code>example.com</code>) to preserve clean and uniform architectural typography.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 3 */}
        <section className="legal-section">
          <h2 className="legal-section-title">
            3. Automated Domain Verification &amp; Asset Extraction
          </h2>
          <p className="legal-text">
            To preserve platform quality and protect visitors, all submitted URLs undergo automated real-time verification before checkout:
          </p>
          <div className="legal-card">
            <ul className="legal-list">
              <li className="legal-list-item">
                <strong>HTTPS-Only Enforcement:</strong> Only secure <code>https://</code> web addresses are permitted. Unencrypted <code>http://</code> URLs and raw IP addresses are rejected automatically.
              </li>
              <li className="legal-list-item">
                <strong>Live TLS Handshake &amp; DNS Probe:</strong> Automated server-side network probes confirm that the submitted domain resolves to active DNS records and successfully completes a secure SSL handshake.
              </li>
              <li className="legal-list-item">
                <strong>Anti-Spam &amp; Parked Domain Filter:</strong> Placeholder, dummy, or parked broker domains (such as <code>example.com</code>, <code>test.com</code>, <code>dummy.com</code>, or <code>localhost</code>) are blocked.
              </li>
              <li className="legal-list-item">
                <strong>Automated Logo &amp; Metadata Pipeline:</strong> Metadata (titles, taglines, descriptions) and high-resolution brand marks (SVGs, Apple touch icons, PWA icons) are crawled automatically and permanently cached on Vercel Blob Storage CDN for WebGL canvas rendering.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 4 */}
        <section className="legal-section">
          <h2 className="legal-section-title">
            4. Payments, Fulfillment &amp; Refund Policy
          </h2>
          <p className="legal-text">
            All payments are processed securely through our authorized, PCI-DSS certified payment gateway and payment aggregator partners (supporting UPI, NetBanking, Debit/Credit Cards, and Digital Wallets). We do not store or process raw credit/debit card numbers, CVVs, or banking passwords on our servers.
          </p>
          <p className="legal-text">
            <strong>Fulfillment:</strong> Virtual floor placements are fulfilled immediately in real time on the live 3D skyscraper upon successful transaction completion. Because digital advertising placement is rendered and published instantly, transactions are generally non-refundable once published.
          </p>
          <p className="legal-text">
            <strong>Refunds:</strong> In the event of a verified duplicate charge, billing error, or technical placement failure where your floor is not rendered on the tower, refunds will be issued in full back to the original payment source within <strong>5–7 working days</strong>.
          </p>
        </section>

        {/* Section 5 */}
        <section className="legal-section">
          <h2 className="legal-section-title">
            5. Listing Updates &amp; Deletion (Zero-Login Support)
          </h2>
          <p className="legal-text">
            Because GeTopFloor does not require user accounts or credentials, founders do not manage listings through a password-protected self-service portal.
          </p>
          <p className="legal-text">
            If you need to update your company description, change your destination URL, upload a replacement logo, or request voluntary permanent removal of your floor from the skyscraper, simply send an email to <a href="mailto:support@getopfloor.com" style={{ color: "#ea580c", fontWeight: 600, textDecoration: "underline" }}>support@getopfloor.com</a> from an authorized email address associated with your listed company domain. Our administrative team will verify domain ownership and fulfill your request within <strong>24–48 hours</strong>.
          </p>
        </section>

        {/* Section 6 */}
        <section className="legal-section">
          <h2 className="legal-section-title">
            6. Content Standards &amp; Administrative Moderation
          </h2>
          <p className="legal-text">
            All submitted URLs, logos, and descriptions must comply strictly with our <Link href="/rules" style={{ color: "#ea580c", fontWeight: 600, textDecoration: "underline" }}>Platform Rules &amp; Content Moderation Policy</Link>. We enforce zero tolerance for fraud, deceptive domains, phishing, illicit trade, malware, hate speech, or adult content.
          </p>
          <p className="legal-text">
            Our administrative team continuously monitors live skyscraper listings through our internal administrative portal and reserves the right to immediately take down any listing that violates our guidelines without refund.
          </p>
        </section>

        {/* Section 7 */}
        <section className="legal-section">
          <h2 className="legal-section-title">
            7. Intellectual Property &amp; Brand Usage
          </h2>
          <p className="legal-text">
            You retain full 100% ownership of your trademarks, company names, logos, and website materials. By submitting your listing, you grant GeTopFloor a non-exclusive, royalty-free, worldwide license to display your brand mark, company name, and website link within our 3D skyscraper, interactive directory cards, and marketing materials solely for directory showcase and discovery purposes.
          </p>
        </section>

        {/* Section 8 */}
        <section className="legal-section" style={{ borderTop: "1px solid #e2e8f0", paddingTop: "32px" }}>
          <h2 className="legal-section-title" style={{ borderLeft: "none", paddingLeft: 0 }}>
            8. Contact &amp; Support
          </h2>
          <p className="legal-text" style={{ fontSize: "14px" }}>
            For billing assistance, domain updates, or inquiries regarding these Terms:
          </p>
          <div className="legal-card" style={{ marginTop: "12px" }}>
            <p style={{ margin: "0 0 6px 0", fontWeight: 700, fontSize: "14px", color: "#0f172a" }}>GeTopFloor Support Team</p>
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
