import Link from "next/link";

export const metadata = {
  title: "Platform Rules & Content Moderation Guidelines — GeTopFloor",
  description: "Rules, permitted and prohibited content, and moderation safeguards governing GeTopFloor.",
};

export default function RulesPage() {
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
            Platform Rules
          </span>
        </div>

        {/* Title Block */}
        <header className="legal-title-block">
          <h1 className="legal-main-title">
            Platform Rules &amp; Moderation Policy
          </h1>
          <p className="legal-sub-title">
            Official Guidelines • GeTopFloor (https://getopfloor.com)
          </p>
        </header>

        {/* Section 1 */}
        <section className="legal-section">
          <h2 className="legal-section-title">
            1. Overview &amp; Objective
          </h2>
          <p className="legal-text">
            <strong>GeTopFloor</strong> is a global, interactive 3D digital discovery and advertising platform for technology startups, SaaS products, open-source projects, and indie founders. Founders claim virtual floors on a 50-story skyscraper to showcase their company name, URL, and description.
          </p>
          <p className="legal-text">
            To maintain a trustworthy, safe, and professional ecosystem for all visitors, founders, and payment partners, all floor submissions and listings must comply strictly with these guidelines.
          </p>
        </section>

        {/* Section 2 */}
        <section className="legal-section">
          <div className="legal-card-emerald">
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#065f46", margin: "0 0 10px 0" }}>
              2. Permitted Content &amp; Activities
            </h2>
            <p className="legal-text" style={{ color: "#064e3b", marginBottom: "14px" }}>
              We welcome legitimate technology companies, creative ventures, and online software products, including:
            </p>
            <div className="legal-grid-2">
              <div className="legal-grid-item" style={{ backgroundColor: "#ffffff" }}>
                <h3 className="legal-grid-title" style={{ color: "#065f46" }}>✓ SaaS &amp; Cloud Tools</h3>
                <p className="legal-grid-desc">Software-as-a-Service, developer tools, cloud infrastructure, APIs, and micro-SaaS.</p>
              </div>
              <div className="legal-grid-item" style={{ backgroundColor: "#ffffff" }}>
                <h3 className="legal-grid-title" style={{ color: "#065f46" }}>✓ AI &amp; Machine Learning</h3>
                <p className="legal-grid-desc">Artificial intelligence applications, LLM agents, automation, and machine learning models.</p>
              </div>
              <div className="legal-grid-item" style={{ backgroundColor: "#ffffff" }}>
                <h3 className="legal-grid-title" style={{ color: "#065f46" }}>✓ E-Commerce &amp; DTC</h3>
                <p className="legal-grid-desc">Direct-to-consumer products, verified digital store platforms, and consumer apps.</p>
              </div>
              <div className="legal-grid-item" style={{ backgroundColor: "#ffffff" }}>
                <h3 className="legal-grid-title" style={{ color: "#065f46" }}>✓ Fintech &amp; Productivity</h3>
                <p className="legal-grid-desc">Accounting, invoicing, design, workflow automation, and collaboration software.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3 */}
        <section className="legal-section">
          <div className="legal-card-rose">
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#9f1239", margin: "0 0 6px 0" }}>
              3. Strictly Prohibited Content &amp; Activities
            </h2>
            <p className="legal-text" style={{ color: "#881337", fontSize: "14px", marginBottom: "14px" }}>
              The following content, industries, and practices are strictly prohibited from appearing on any floor:
            </p>
            <div className="legal-grid-2">
              <div className="legal-grid-item" style={{ backgroundColor: "#ffffff" }}>
                <h3 className="legal-grid-title" style={{ color: "#9f1239" }}>🚫 Fraud &amp; Phishing</h3>
                <p className="legal-grid-desc">Phishing sites, deceptive domain names, counterfeit goods, pyramid schemes, or fake investments.</p>
              </div>
              <div className="legal-grid-item" style={{ backgroundColor: "#ffffff" }}>
                <h3 className="legal-grid-title" style={{ color: "#9f1239" }}>🚫 Illegal Goods &amp; Services</h3>
                <p className="legal-grid-desc">Weapons, illegal narcotics, unlicensed pharmaceuticals, counterfeit credentials, or contraband.</p>
              </div>
              <div className="legal-grid-item" style={{ backgroundColor: "#ffffff" }}>
                <h3 className="legal-grid-title" style={{ color: "#9f1239" }}>🚫 Adult &amp; Explicit Material</h3>
                <p className="legal-grid-desc">Pornography, sexually explicit content, escort services, or adult-themed entertainment.</p>
              </div>
              <div className="legal-grid-item" style={{ backgroundColor: "#ffffff" }}>
                <h3 className="legal-grid-title" style={{ color: "#9f1239" }}>🚫 Malicious Software &amp; Exploits</h3>
                <p className="legal-grid-desc">Malware, spyware, ransomware, credential harvesters, DDoS tools, or unauthorized hacking tools.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4 */}
        <section className="legal-section">
          <h2 className="legal-section-title">
            4. Content Moderation &amp; Automated Safeguards
          </h2>
          <p className="legal-text">
            GeTopFloor implements a multi-layered moderation pipeline combining real-time automated screening and continuous human review:
          </p>

          <div className="legal-card">
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", margin: "0 0 8px 0" }}>
              A. Real-Time Pre-Payment Automated Verification
            </h3>
            <p className="legal-text" style={{ fontSize: "14px", marginBottom: "10px" }}>
              Before any checkout session or floor reservation can be initiated:
            </p>
            <ul className="legal-list">
              <li className="legal-list-item">
                <strong>Live HTTPS &amp; SSL Probe:</strong> Automated verification tests that the destination URL is active, reachable over HTTPS, and possesses a trusted SSL certificate.
              </li>
              <li className="legal-list-item">
                <strong>DNS Resolution Check:</strong> Confirms active DNS records and blocks private, unroutable, or reserved IP addresses.
              </li>
              <li className="legal-list-item">
                <strong>Domain Parked &amp; Broker Filter:</strong> Automated heuristic scanner analyzes response headers and body content to reject known parked brokers and dummy domains.
              </li>
            </ul>
          </div>

          <div className="legal-card" style={{ marginTop: "16px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", margin: "0 0 8px 0" }}>
              B. Post-Placement Continuous Monitoring &amp; Admin Takedown
            </h3>
            <p className="legal-text" style={{ fontSize: "14px", marginBottom: "10px" }}>
              Our internal administrative team continuously monitors live tower listings via an administrative dashboard:
            </p>
            <ul className="legal-list">
              <li className="legal-list-item">
                <strong>Instant Takedown Authority:</strong> Any listing discovered to violate prohibited content policies is immediately removed from the skyscraper without notice.
              </li>
              <li className="legal-list-item">
                <strong>User Reporting Mechanism:</strong> Platform visitors can report suspicious listings directly to <span style={{ color: "#ea580c", fontWeight: 600 }}>support@getopfloor.com</span> for review within 24 hours.
              </li>
              <li className="legal-list-item">
                <strong>Account &amp; Domain Blacklisting:</strong> Violators and associated customer emails are permanently banned from placing future claims.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 5 */}
        <section className="legal-section" style={{ borderTop: "1px solid #e2e8f0", paddingTop: "32px" }}>
          <h2 className="legal-section-title" style={{ borderLeft: "none", paddingLeft: 0 }}>
            5. Reporting Violations &amp; Support
          </h2>
          <p className="legal-text" style={{ fontSize: "14px" }}>
            If you identify a website on the tower that violates our policies, or if you have questions regarding these guidelines, please contact our compliance team immediately:
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
            <Link href="/rules" className="legal-footer-link active">Platform Rules</Link>
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
