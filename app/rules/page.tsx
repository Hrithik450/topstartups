import Link from "next/link";

export const metadata = {
  title: "Platform Rules & Content Moderation Guidelines — GeTopFloor",
  description: "Rules, permitted and prohibited content, and moderation safeguards governing GeTopFloor.",
};

export default function RulesPage() {
  return (
    <main className="min-h-screen bg-[#070b14] text-slate-200 py-16 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <div className="border-b border-white/10 pb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors mb-3"
            >
              ← Back to Skyscraper
            </Link>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Platform Rules & Moderation Guidelines
            </h1>
            <p className="text-sm text-slate-400 mt-2">
              Last updated: September 2026 • Governing GeTopFloor (https://getopfloor.com)
            </p>
          </div>
        </div>

        {/* Introduction */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">1. Overview & Purpose</h2>
          <p className="text-slate-300 leading-relaxed">
            GeTopFloor is a global, interactive 3D digital discovery and advertising platform for technology startups, SaaS products, open-source projects, and indie founders. Founders claim virtual floors on a 50-story skyscraper to showcase their company name, URL, and description.
          </p>
          <p className="text-slate-300 leading-relaxed">
            To maintain a trustworthy, safe, and professional ecosystem for all visitors, founders, and partners, all floor submissions and listings must comply strictly with these guidelines.
          </p>
        </section>

        {/* Permitted Activities */}
        <section className="space-y-4 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-emerald-400">2. Permitted Content & Activities</h2>
          <p className="text-slate-300">We welcome genuine technology businesses and creative ventures, including:</p>
          <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
            <li>SaaS (Software-as-a-Service), Developer Tools, APIs, and Cloud Services.</li>
            <li>AI applications, Machine Learning tools, and generative software.</li>
            <li>E-Commerce platforms, DTC brands, and consumer digital apps.</li>
            <li>Fintech, productivity, design, educational, and workflow applications.</li>
            <li>Open-source tools, developer communities, and technology newsletters.</li>
            <li>Live portfolio websites, technology agencies, and verified indie projects.</li>
          </ul>
        </section>

        {/* Prohibited Activities */}
        <section className="space-y-4 bg-rose-950/20 border border-rose-500/20 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-rose-400">3. Strictly Prohibited Content & Activities</h2>
          <p className="text-slate-300">
            The following content, industries, and practices are strictly prohibited from appearing on any floor of GeTopFloor:
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mt-3">
            <div className="bg-black/40 border border-white/5 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-2">🚫 Fraud & Deception</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Phishing sites, deceptive domain names, counterfeit goods, pyramid schemes, fake investment or get-rich-quick scams.
              </p>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-2">🚫 Illegal Goods & Services</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Weapons, illegal narcotics, unlicensed pharmaceuticals, counterfeit credentials, or contraband.
              </p>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-2">🚫 Adult & Explicit Material</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Pornography, sexually explicit content, escort services, or adult-themed entertainment.
              </p>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-2">🚫 Malicious Software & Exploits</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Malware, spyware, ransomware, credential harvesters, DDoS tools, or unauthorized hacking utilities.
              </p>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-2">🚫 Hate Speech & Harassment</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Content promoting violence, discrimination, hate speech, defamation, or harassment against any group or individual.
              </p>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-2">🚫 Parked / Squatter Domains</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Unregistered, non-functional, parked, or domain-broker sales landing pages with no actual product or business.
              </p>
            </div>
          </div>
        </section>

        {/* Moderation & Safeguards */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">4. Content Moderation & Automated Safeguards</h2>
          <p className="text-slate-300 leading-relaxed">
            GeTopFloor implements a rigorous, multi-layered moderation pipeline combining real-time automated screening and continuous human review:
          </p>

          <div className="space-y-4 mt-3">
            <div className="bg-slate-900/60 border border-white/10 rounded-xl p-5">
              <h3 className="text-base font-semibold text-amber-400">A. Real-Time Pre-Payment Automated Verification</h3>
              <p className="text-sm text-slate-300 mt-1 leading-relaxed">
                Before any checkout session or floor reservation can be initiated:
              </p>
              <ul className="list-disc list-inside text-xs text-slate-300 space-y-1 mt-2 ml-2">
                <li><strong>Live HTTPS & SSL Probe:</strong> Automated verification tests that the destination URL is active, reachable over HTTPS, and possesses a trusted SSL certificate.</li>
                <li><strong>DNS Resolution Check:</strong> Confirms active DNS records and blocks private, unroutable, or reserved IP addresses.</li>
                <li><strong>Domain Parked & Broker Filter:</strong> Automated heuristic scanner analyzes response headers and body content to reject known parked brokers and dummy domains.</li>
              </ul>
            </div>

            <div className="bg-slate-900/60 border border-white/10 rounded-xl p-5">
              <h3 className="text-base font-semibold text-amber-400">B. Post-Placement Continuous Monitoring & Admin Takedown</h3>
              <p className="text-sm text-slate-300 mt-1 leading-relaxed">
                Our internal administrative team continuously monitors live tower listings via an administrative dashboard:
              </p>
              <ul className="list-disc list-inside text-xs text-slate-300 space-y-1 mt-2 ml-2">
                <li><strong>Instant Takedown Authority:</strong> Any listing discovered to violate prohibited content policies is immediately removed from the skyscraper without notice.</li>
                <li><strong>User Reporting Mechanism:</strong> Platform visitors can report suspicious listings directly to <span className="text-amber-300 font-mono">support@getopfloor.com</span> for review within 24 hours.</li>
                <li><strong>Account & Domain Blacklisting:</strong> Violators and associated customer emails are permanently banned from placing future claims.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Contact & Enforcement */}
        <section className="space-y-4 border-t border-white/10 pt-8">
          <h2 className="text-xl font-bold text-white">5. Reporting Violations & Support</h2>
          <p className="text-slate-300 leading-relaxed">
            If you identify a website on the tower that violates our policies, or if you have questions regarding these guidelines, please contact our compliance team immediately:
          </p>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 inline-block text-sm">
            <p><strong>Email:</strong> <a href="mailto:support@getopfloor.com" className="text-amber-400 hover:underline">support@getopfloor.com</a></p>
            <p className="text-slate-400 text-xs mt-1">Response time: Within 24 hours for all content and compliance inquiries.</p>
          </div>
        </section>

        {/* Footer Navigation */}
        <div className="border-t border-white/10 pt-8 flex flex-wrap gap-6 text-sm text-slate-400">
          <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link href="/rules" className="text-amber-400 font-semibold">Platform Rules</Link>
          <Link href="/" className="hover:text-white transition-colors ml-auto">Return to Home</Link>
        </div>
      </div>
    </main>
  );
}
