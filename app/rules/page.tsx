import Link from "next/link";

export const metadata = {
  title: "Platform Rules & Content Moderation Guidelines — GeTopFloor",
  description: "Rules, permitted and prohibited content, and moderation safeguards governing GeTopFloor.",
};

export default function RulesPage() {
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
            Governance &amp; Moderation
          </span>
        </div>

        {/* Document Header */}
        <header className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Platform Rules &amp; Moderation Policy
          </h1>
          <p className="text-sm text-slate-500">
            Official Guidelines • GeTopFloor (https://getopfloor.com)
          </p>
        </header>

        {/* Section 1 */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 border-l-4 border-orange-500 pl-3">
            1. Overview &amp; Objective
          </h2>
          <p className="text-slate-700 leading-relaxed text-base">
            <strong>GeTopFloor</strong> is a global, interactive 3D digital discovery and advertising platform for technology startups, SaaS products, open-source projects, and indie founders. Founders claim virtual floors on a 50-story skyscraper to showcase their company name, URL, and description.
          </p>
          <p className="text-slate-700 leading-relaxed text-base">
            To maintain a trustworthy, safe, and professional ecosystem for all visitors, founders, and payment partners, all floor submissions and listings must comply strictly with these guidelines.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-5 bg-emerald-50/70 border border-emerald-200 rounded-2xl p-6 sm:p-8">
          <h2 className="text-xl font-bold text-emerald-900">
            2. Permitted Content &amp; Activities
          </h2>
          <p className="text-slate-700 text-base leading-relaxed">
            We welcome legitimate technology companies, creative ventures, and online software products, including:
          </p>
          <ul className="grid sm:grid-cols-2 gap-3 text-sm text-slate-800 font-medium">
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>SaaS, Cloud Infrastructure, APIs &amp; Dev Tools</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Artificial Intelligence &amp; Machine Learning Apps</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>E-Commerce, Direct-to-Consumer &amp; Retail Tech</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Fintech, Productivity, Workflow &amp; Design Tools</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Open-Source Projects, Developer Communities &amp; News</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Verified Tech Agencies, Studios &amp; Portfolios</span>
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-6 bg-rose-50/70 border border-rose-200 rounded-2xl p-6 sm:p-8">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-rose-900">
              3. Strictly Prohibited Content &amp; Activities
            </h2>
            <p className="text-slate-700 text-sm">
              The following content, industries, and practices are strictly prohibited from appearing on any floor of GeTopFloor:
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-white border border-rose-100 rounded-xl p-5 space-y-1 shadow-sm">
              <h3 className="font-semibold text-rose-900 text-sm">Fraud &amp; Phishing</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Phishing sites, deceptive domain names, counterfeit goods, pyramid schemes, fake investment or get-rich-quick scams.
              </p>
            </div>
            <div className="bg-white border border-rose-100 rounded-xl p-5 space-y-1 shadow-sm">
              <h3 className="font-semibold text-rose-900 text-sm">Illegal Goods &amp; Services</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Weapons, illegal narcotics, unlicensed pharmaceuticals, counterfeit credentials, or contraband.
              </p>
            </div>
            <div className="bg-white border border-rose-100 rounded-xl p-5 space-y-1 shadow-sm">
              <h3 className="font-semibold text-rose-900 text-sm">Adult &amp; Explicit Material</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Pornography, sexually explicit content, escort services, or adult-themed entertainment.
              </p>
            </div>
            <div className="bg-white border border-rose-100 rounded-xl p-5 space-y-1 shadow-sm">
              <h3 className="font-semibold text-rose-900 text-sm">Malicious Software &amp; Exploits</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Malware, spyware, ransomware, credential harvesters, DDoS tools, or unauthorized hacking utilities.
              </p>
            </div>
            <div className="bg-white border border-rose-100 rounded-xl p-5 space-y-1 shadow-sm">
              <h3 className="font-semibold text-rose-900 text-sm">Hate Speech &amp; Harassment</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Content promoting violence, discrimination, hate speech, defamation, or harassment against any group or individual.
              </p>
            </div>
            <div className="bg-white border border-rose-100 rounded-xl p-5 space-y-1 shadow-sm">
              <h3 className="font-semibold text-rose-900 text-sm">Parked &amp; Squatter Domains</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Unregistered, non-functional, parked, or domain-broker sales landing pages with no actual product or business.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4 */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900 border-l-4 border-orange-500 pl-3">
            4. Content Moderation &amp; Automated Safeguards
          </h2>
          <p className="text-slate-700 leading-relaxed text-base">
            GeTopFloor implements a rigorous, multi-layered moderation pipeline combining real-time automated screening and continuous human review:
          </p>

          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-2">
              <h3 className="text-base font-bold text-slate-900">
                A. Real-Time Pre-Payment Automated Verification
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                Before any checkout session or floor reservation can be initiated:
              </p>
              <ul className="list-disc list-inside text-xs sm:text-sm text-slate-700 space-y-1.5 pl-2 leading-relaxed">
                <li><strong>Live HTTPS &amp; SSL Probe:</strong> Automated verification tests that the destination URL is active, reachable over HTTPS, and possesses a trusted SSL certificate.</li>
                <li><strong>DNS Resolution Check:</strong> Confirms active DNS records and blocks private, unroutable, or reserved IP addresses.</li>
                <li><strong>Domain Parked &amp; Broker Filter:</strong> Automated heuristic scanner analyzes response headers and body content to reject known parked brokers and dummy domains.</li>
              </ul>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-2">
              <h3 className="text-base font-bold text-slate-900">
                B. Post-Placement Continuous Monitoring &amp; Admin Takedown
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                Our internal administrative team continuously monitors live tower listings via an administrative dashboard:
              </p>
              <ul className="list-disc list-inside text-xs sm:text-sm text-slate-700 space-y-1.5 pl-2 leading-relaxed">
                <li><strong>Instant Takedown Authority:</strong> Any listing discovered to violate prohibited content policies is immediately removed from the skyscraper without notice.</li>
                <li><strong>User Reporting Mechanism:</strong> Platform visitors can report suspicious listings directly to <span className="text-orange-600 font-mono font-medium">support@getopfloor.com</span> for review within 24 hours.</li>
                <li><strong>Account &amp; Domain Blacklisting:</strong> Violators and associated customer emails are permanently banned from placing future claims.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 5 */}
        <section className="space-y-4 border-t border-slate-200 pt-8">
          <h2 className="text-xl font-bold text-slate-900">
            5. Reporting Violations &amp; Support
          </h2>
          <p className="text-slate-700 leading-relaxed text-sm">
            If you identify a website on the tower that violates our policies, or if you have questions regarding these guidelines, please contact our compliance team immediately:
          </p>
          <div className="bg-slate-100 border border-slate-200 rounded-xl p-5 text-sm space-y-1 text-slate-800">
            <p><strong>GeTopFloor Compliance Team</strong></p>
            <p>Email: <a href="mailto:support@getopfloor.com" className="text-orange-600 hover:underline">support@getopfloor.com</a></p>
            <p className="text-slate-500 text-xs">Response time: Within 24 hours for all content and compliance inquiries.</p>
          </div>
        </section>

        {/* Footer Navigation */}
        <footer className="border-t border-slate-200 pt-8 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-slate-900 transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy Policy</Link>
            <Link href="/rules" className="font-semibold text-slate-900">Platform Rules</Link>
          </div>
          <Link href="/" className="font-semibold text-orange-600 hover:text-orange-700">Return to Skyscraper →</Link>
        </footer>

      </div>
    </div>
  );
}
