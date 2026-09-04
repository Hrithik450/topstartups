/**
 * Simple & Reliable Website Metadata Crawler
 *
 * Uses Firecrawl (if FIRECRAWL_API_KEY is configured) to extract:
 * 1. Company Name
 * 2. Tagline (One-Liner)
 * 3. Description
 * 4. High-Resolution Favicon / Logo
 * 5. Industry Category
 *
 * Falls back to a fast direct HTML parser if Firecrawl is not configured.
 */

export interface WebsiteMetadata {
  companyName: string;
  tagline: string;
  description: string;
  logoUrl: string;
  category: string;
}

// ─────────────────────────────────────────────────────────────
// 1. HELPER UTILITIES
// ─────────────────────────────────────────────────────────────

/**
 * Extracts a clean company name from page title or hostname.
 * e.g. "Linear – A better way to build software" -> "Linear"
 */
function cleanTitle(title: string, hostname: string): string {
  const cleanHost = hostname.replace(/^www\./, "").toLowerCase();
  return cleanHost;
}

/**
 * Clean and truncate description text.
 */
function truncate(text: string, maxLength: number): string {
  if (!text) return "";
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned.length <= maxLength ? cleaned : cleaned.slice(0, maxLength - 3) + "...";
}

/**
 * Automatically guess category based on common startup keywords.
 */
function guessCategory(text: string): string {
  const t = text.toLowerCase();
  if (
    t.includes("ai") ||
    t.includes("gpt") ||
    t.includes("agent") ||
    t.includes("llm") ||
    t.includes("machine learning")
  ) {
    return "AI & Machine Learning";
  }
  if (
    t.includes("developer") ||
    t.includes("api") ||
    t.includes("code") ||
    t.includes("github") ||
    t.includes("sdk")
  ) {
    return "Developer Tools";
  }
  if (
    t.includes("crypto") ||
    t.includes("web3") ||
    t.includes("blockchain") ||
    t.includes("token")
  ) {
    return "Web3 & Crypto";
  }
  if (
    t.includes("pay") ||
    t.includes("finance") ||
    t.includes("bank") ||
    t.includes("invoice") ||
    t.includes("billing")
  ) {
    return "Fintech";
  }
  if (
    t.includes("shop") ||
    t.includes("store") ||
    t.includes("ecommerce") ||
    t.includes("cart") ||
    t.includes("d2c")
  ) {
    return "E-Commerce";
  }
  if (t.includes("design") || t.includes("figma") || t.includes("ui") || t.includes("creative")) {
    return "Design & Creative";
  }
  if (
    t.includes("saas") ||
    t.includes("software") ||
    t.includes("crm") ||
    t.includes("analytics") ||
    t.includes("dashboard")
  ) {
    return "B2B SaaS";
  }
  return "Startup";
}

/**
 * Resolve relative URL to absolute URL against the base target URL.
 */
function resolveUrl(url: string, baseUrl: string): string {
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}

// ─────────────────────────────────────────────────────────────
// 2. FIRECRAWL SCRAPER
// ─────────────────────────────────────────────────────────────

async function crawlWithFirecrawl(url: string, apiKey: string): Promise<WebsiteMetadata | null> {
  const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true,
    }),
    signal: AbortSignal.timeout(6000),
  });

  if (!response.ok) return null;

  const data = await response.json();
  const meta = data.data?.metadata || {};
  const hostname = new URL(url).hostname;

  const title = meta.title || meta.ogTitle || "";
  const desc = meta.description || meta.ogDescription || "";
  const icon = meta.appleTouchIcon || meta.favicon || meta.icon || meta.logo || meta.ogImage;

  const companyName = cleanTitle(title, hostname);
  const tagline = truncate(desc, 110) || `${companyName} — Official Skyscraper Floor`;
  const description = truncate(desc, 240) || `Claimed top floor on GeTopFloor skyscraper.`;
  const logoUrl = icon
    ? resolveUrl(icon, url)
    : `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
  const category = guessCategory(`${companyName} ${desc}`);

  return {
    companyName,
    tagline,
    description,
    logoUrl,
    category,
  };
}

// ─────────────────────────────────────────────────────────────
// 3. SIMPLE DIRECT HTML PARSER (FALLBACK)
// ─────────────────────────────────────────────────────────────

async function crawlDirectHtml(url: string): Promise<WebsiteMetadata> {
  const parsed = new URL(url);
  const hostname = parsed.hostname;
  const fallbackFavicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 GeTopFloorBot/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(4000),
      redirect: "follow",
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    // 1. Extract Title
    const ogTitle = html.match(
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
    )?.[1];
    const htmlTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
    const companyName = cleanTitle(ogTitle || htmlTitle || "", hostname);

    // 2. Extract Description
    const ogDesc = html.match(
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i
    )?.[1];
    const metaDesc = html.match(
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i
    )?.[1];
    const rawDesc = ogDesc || metaDesc || "";
    const tagline = truncate(rawDesc, 110) || `${companyName} — Official Skyscraper Floor`;
    const description = truncate(rawDesc, 240) || `Claimed top floor on GeTopFloor skyscraper.`;

    // 3. Extract Favicon
    const appleIcon = html.match(
      /<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)["']/i
    )?.[1];
    const stdIcon = html.match(
      /<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/i
    )?.[1];
    const rawIcon = appleIcon || stdIcon;
    const logoUrl = rawIcon ? resolveUrl(rawIcon, url) : fallbackFavicon;

    const category = guessCategory(`${companyName} ${rawDesc}`);

    return {
      companyName,
      tagline,
      description,
      logoUrl,
      category,
    };
  } catch {
    const cleanHost = hostname.replace(/^www\./, "").toLowerCase();
    const companyName = cleanHost;
    return {
      companyName,
      tagline: `${companyName} — Official Skyscraper Floor`,
      description: `Claimed top floor on GeTopFloor skyscraper.`,
      logoUrl: fallbackFavicon,
      category: "Startup",
    };
  }
}

// ─────────────────────────────────────────────────────────────
// 4. MAIN EXPORTED SCRAPER FUNCTION
// ─────────────────────────────────────────────────────────────

export async function scrapeWebsiteMetadata(targetUrl: string): Promise<WebsiteMetadata> {
  let cleanUrl = targetUrl.trim();
  if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
    cleanUrl = `https://${cleanUrl}`;
  }

  // 1. Try Firecrawl if API key is provided
  const firecrawlKey = process.env.FIRECRAWL_API_KEY?.trim();
  if (firecrawlKey) {
    try {
      const result = await crawlWithFirecrawl(cleanUrl, firecrawlKey);
      if (result) return result;
    } catch (err) {
      console.warn("Firecrawl request failed, falling back to direct parser:", err);
    }
  }

  // 2. Fallback to direct HTML parser
  return crawlDirectHtml(cleanUrl);
}
