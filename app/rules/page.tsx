import Link from "next/link";

export const metadata = {
  title: "Platform Rules & Content Moderation Guidelines — GeTopFloor",
  description: "Rules, permitted and prohibited content, and moderation safeguards governing GeTopFloor.",
};

export default function RulesPage() {
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
              Platform Rules &amp; Moderation Guidelines
            </h1>
            <p className="text-sm text-slate-400 leading-normal">
              Official Governance &amp; Content Policy • GeTopFloor (https://getopfloor.com)
            </p>
          </div>
        </header>

        {/* Section 1: Overview */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            1. Overview &amp; Purpose
          </h2>
          <p className="text-slate-300 text-base leading-relaxed">
            <strong>GeTopFloor</strong> is a global, interactive 3D digital discovery and advertising platform for technology startups, SaaS products, open-source projects, and indie founders. Founders claim virtual floors on a 50-story skyscraper to showcase their company name, URL, and description.
          </p>
          <p className="text-slate-300 text-base leading-relaxed">
            To maintain a trustworthy, safe, and professional ecosystem for all visitors, founders, and partners, all floor submissions and listings must comply strictly with these guidelines.
          </p>
        </section>

        {/* Section 2: Permitted Content */}
        <section className="space-y-5 bg-emerald-950/20 border border-emerald-500/25 rounded-2xl p-8 sm:p-10">
          <h2 className="text-xl sm:text-2xl font-bold text-emerald-400 tracking-tight">
            2. Permitted Content &amp; Activities
          </h2>
          <p className="text-slate-200 text-base leading-relaxed">
            We welcome legitimate technology companies, creative ventures, and online software products, including:
          </p>
          <ul className="grid sm:grid-cols-2 gap-3 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>SaaS, Cloud Infrastructure, APIs &amp; Dev Tools</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>Artificial Intelligence &amp; Machine Learning Apps</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>E-Commerce, Direct-to-Consumer &amp; Retail Tech</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>Fintech, Productivity, Workflow &amp; Design Tools</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>Open-Source Projects, Developer Communities &amp; News</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>Verified Tech Agencies, Studios &amp; Portfolios</span>
            </li>
          </ul>
        </section>

        {/* Section 3: Prohibited Content */}
        <section className="space-y-6 bg-rose-950/20 border border-rose-500/25 rounded-2xl p-8 sm:p-10">
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-rose-400 tracking-tight">
              3. Strictly Prohibited Content &amp; Activities
            </h2>
            <p className="text-slate-200 text-base leading-relaxed">
              The following content, industries, and practices are strictly prohibited from appearing on any floor of GeTopFloor:
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-black/40 border border-white/5 rounded-xl p-5 space-y-2">
              <h3 className="font-semibold text-white text-base">Fraud &amp; Phishing</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Phishing sites, deceptive domain names, counterfeit goods, pyramid schemes, fake investment or get-rich-quick scams.
              </p>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-xl p-5 space-y-2">
              <h3 className="font-semibold text-white text-base">Illegal Goods &amp; Services</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Weapons, illegal narcotics, unlicensed pharmaceuticals, counterfeit credentials, or contraband.
              </p>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-xl p-5 space-y-2">
              <h3 className="font-semibold text-white text-base">Adult &amp; Explicit Material</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Pornography, sexually explicit content, escort services, or adult-themed entertainment.
              </p>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-xl p-5 space-y-2">
              <h3 className="font-semibold text-white text-base">Malicious Software &amp; Exploits</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Malware, spyware, ransomware, credential harvesters, DDoS tools, or unauthorized hacking utilities.
              </p>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-xl p-5 space-y-2">
              <h3 className="font-semibold text-white text-base">Hate Speech &amp; Harassment</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Content promoting violence, discrimination, hate speech, defamation, or harassment against any group or individual.
              </p>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-xl p-5 space-y-2">
              <h3 className="font-semibold text-white text-base">Parked &amp; Squatter Domains</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Unregistered, non-functional, parked, or domain-broker sales landing pages with no actual product or business.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Moderation & Safeguards */}
        <section className="space-y-6">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            4. Content Moderation &amp; Automated Safeguards
          </h2>
          <p className="text-slate-300 text-base leading-relaxed">
            GeTopFloor implements a rigorous, multi-layered moderation pipeline combining real-time automated screening and continuous human review:
          </p>

          <div className="space-y-4">
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-3">
              <h3 className="text-lg font-bold text-amber-400">
                A. Real-Time Pre-Payment Automated Verification
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Before any checkout session or floor reservation can be initiated:
              </p>
              <ul className="list-disc list-inside text-sm text-slate-300 space-y-2 pl-2 leading-relaxed">
                <li><strong>Live HTTPS &amp; SSL Probe:</strong> Automated verification tests that the destination URL is active, reachable over HTTPS, and possesses a trusted SSL certificate.</li>
                <li><strong>DNS Resolution Check:</strong> Confirms active DNS records and blocks private, unroutable, or reserved IP addresses.</li>
                <li><strong>Domain Parked &amp; Broker Filter:</strong> Automated heuristic scanner analyzes response headers and body content to reject known parked brokers and dummy domains.</li>
              </ul>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-3">
              <h3 className="text-lg font-bold text-amber-400">
                B. Post-Placement Continuous Monitoring &amp; Admin Takedown
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Our internal administrative team continuously monitors live tower listings via an administrative dashboard:
              </p>
              <ul className="list-disc list-inside text-sm text-slate-300 space-y-2 pl-2 leading-relaxed">
                <li><strong>Instant Takedown Authority:</strong> Any listing discovered to violate prohibited content policies is immediately removed from the skyscraper without notice.</li>
                <li><strong>User Reporting Mechanism:</strong> Platform visitors can report suspicious listings directly to <span className="text-amber-300 font-mono">support@getopfloor.com</span> for review within 24 hours.</li>
                <li><strong>Account &amp; Domain Blacklisting:</strong> Violators and associated customer emails are permanently banned from placing future claims.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 5: Contact */}
        <section className="space-y-4 border-t border-white/10 pt-10">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            5. Reporting Violations &amp; Support
          </h2>
          <p className="text-slate-300 text-base leading-relaxed">
            If you identify a website on the tower that violates our policies, or if you have questions regarding these guidelines, please contact our compliance team immediately:
          </p>
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 text-sm space-y-2">
            <p><strong>Email:</strong> <a href="mailto:support@getopfloor.com" className="text-amber-400 hover:underline">support@getopfloor.com</a></p>
            <p className="text-slate-400 text-xs">Response time: Within 24 hours for all content and compliance inquiries.</p>
          </div>
        </section>

        {/* Footer Navigation */}
        <footer className="border-t border-white/10 pt-10 flex flex-wrap gap-8 text-sm text-slate-400">
          <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link href="/rules" className="text-amber-400 font-semibold">Platform Rules</Link>
          <Link href="/" className="hover:text-white transition-colors ml-auto font-medium">Return to Skyscraper →</Link>
        </footer>

      </div>
    </main>
  );
}
