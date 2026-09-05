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
  if (title) {
    const parts = title.split(/[-–—|:•·]/);
    const candidate = parts[0]?.trim();
    if (candidate && candidate.length >= 2 && candidate.length <= 40 && !candidate.includes("<")) {
      return candidate.toLowerCase();
    }
  }
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

function isWideOgBanner(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  const l = url.toLowerCase();
  return (
    l.includes("og-image") ||
    l.includes("og_image") ||
    l.includes("opengraph") ||
    l.includes("/og.") ||
    l.endsWith("/og") ||
    l.includes("twitter:image") ||
    l.includes("twitter_image") ||
    l.includes("social-preview") ||
    l.includes("social-card") ||
    l.includes("banner") ||
    l.includes("cover") ||
    l.includes("1200x630")
  );
}

/**
 * Checks if a logo URL is low resolution (e.g. 16px/32px .ico or generic favicon).
 */
function isLowResLogo(url?: string | null): boolean {
  if (!url) return true;
  const lower = url.toLowerCase();
  if (lower.endsWith(".ico") || lower.includes(".ico?")) return true;
  if (lower.includes("google.com/s2/favicons")) return true;
  if (lower.includes("favicon") && !lower.includes("512") && !lower.includes("192") && !lower.includes("svg")) {
    return true;
  }
  return false;
}

/**
 * Extracts high-resolution logo from HTML:
 * Prioritizes SVGs, 512x512, 192x192, Apple Touch Icons (180x180), Schema.org logos, and nav images.
 */
function extractHighResBrandLogo(html: string, baseUrl: string): string | null {
  const candidates: { url: string; score: number }[] = [];

  // 1. Parse all <link> tags regardless of attribute order
  const linkRegex = /<link\s+([^>]+)>/gi;
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(html)) !== null) {
    const attrs = match[1];
    const rel = attrs.match(/rel=["']([^"']+)["']/i)?.[1]?.toLowerCase() || "";
    const href = attrs.match(/href=["']([^"']+)["']/i)?.[1] || "";
    const sizes = attrs.match(/sizes=["']([^"']+)["']/i)?.[1]?.toLowerCase() || "";
    const type = attrs.match(/type=["']([^"']+)["']/i)?.[1]?.toLowerCase() || "";

    if ((rel.includes("icon") || rel.includes("apple-touch")) && href) {
      if (isWideOgBanner(href)) continue;

      let score = 300;
      const lowerHref = href.toLowerCase();

      // Highest: Vector SVGs
      if (type.includes("svg") || lowerHref.endsWith(".svg")) {
        score = 1000;
      } else if (sizes.includes("512x512") || lowerHref.includes("512")) {
        score = 900;
      } else if (sizes.includes("256x256") || sizes.includes("384x384") || lowerHref.includes("256")) {
        score = 850;
      } else if (sizes.includes("192x192") || lowerHref.includes("192")) {
        score = 800;
      } else if (rel.includes("apple-touch-icon") || sizes.includes("180x180") || lowerHref.includes("apple-touch")) {
        score = 750;
      } else if (sizes.includes("96x96") || sizes.includes("128x128") || sizes.includes("144x144")) {
        score = 600;
      } else if (sizes.includes("48x48") || sizes.includes("64x64")) {
        score = 400;
      } else if (lowerHref.endsWith(".ico") || sizes.includes("16x16") || sizes.includes("32x32")) {
        score = 100;
      }

      candidates.push({ url: resolveUrl(href, baseUrl), score });
    }
  }

  // 2. Check JSON-LD Schema.org for official Organization/Brand logo
  const jsonLdMatches = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  for (const jMatch of jsonLdMatches) {
    try {
      const parsedJson = JSON.parse(jMatch[1]);
      const candidate =
        parsedJson.logo?.url ||
        parsedJson.logo ||
        parsedJson.publisher?.logo?.url ||
        parsedJson.publisher?.logo;
      if (candidate && typeof candidate === "string" && !isWideOgBanner(candidate)) {
        candidates.push({ url: resolveUrl(candidate, baseUrl), score: 850 });
        break;
      }
    } catch {}
  }

  // 3. Check for Header / Nav Brand Images (e.g. logo.png, logo.svg)
  const navImgRegex = /<(?:img|source)[^>]+(?:src|srcset)=["']([^"']*(?:logo|brand)[^"']*\.(?:png|svg|webp))["']/gi;
  let imgMatch: RegExpExecArray | null;
  while ((imgMatch = navImgRegex.exec(html)) !== null) {
    const src = imgMatch[1];
    if (src && !isWideOgBanner(src)) {
      const score = src.toLowerCase().endsWith(".svg") ? 950 : 780;
      candidates.push({ url: resolveUrl(src, baseUrl), score });
      break;
    }
  }

  // Sort candidates by score descending
  candidates.sort((a, b) => b.score - a.score);

  // Return best high-res candidate (score > 100 avoids tiny .ico)
  if (candidates.length > 0 && candidates[0].score > 100) {
    return candidates[0].url;
  }

  return candidates[0]?.url || null;
}

/**
 * Fast direct HTML scraper to fetch high-res logo when Firecrawl only has low-res icon.
 */
async function scrapeDirectHighResLogo(url: string): Promise<string | null> {
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

    if (!res.ok) return null;
    const html = await res.text();
    return extractHighResBrandLogo(html, url);
  } catch {
    return null;
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

  // Prioritize square brand logo or Apple touch icon from Firecrawl metadata
  let icon = meta.logo;
  if (isWideOgBanner(icon)) {
    icon = null;
  }
  if (!icon) {
    icon = meta.appleTouchIcon || meta.icon || meta.favicon;
  }
  if (isWideOgBanner(icon)) {
    icon = meta.appleTouchIcon || meta.favicon || null;
  }

  const companyName = cleanTitle(title, hostname);
  const tagline = truncate(desc, 110) || `${companyName} — Official Skyscraper Floor`;
  const description = truncate(desc, 240) || `Claimed top floor on GeTopFloor skyscraper.`;
  let logoUrl = icon
    ? resolveUrl(icon, url)
    : `https://www.google.com/s2/favicons?domain=${hostname}&sz=256`;

  // If Firecrawl only returned a low-res .ico/favicon, scrape the high-res logo from HTML
  if (isLowResLogo(logoUrl)) {
    const directLogo = await scrapeDirectHighResLogo(url);
    if (directLogo) {
      logoUrl = directLogo;
    }
  }

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

    // 3. Extract High-Resolution Brand Logo
    const logoUrl =
      extractHighResBrandLogo(html, url) ||
      `https://www.google.com/s2/favicons?domain=${hostname}&sz=256`;

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
