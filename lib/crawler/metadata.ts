/**
 * Ultra-fast, zero-dependency OpenGraph & HTML metadata scraper with Firecrawl support.
 * Extracts: Company Name, Tagline/Snippet, Description, High-Res Logo/Favicon, and Category.
 */

export interface WebsiteMetadata {
  companyName: string;
  tagline: string;
  description: string;
  logoUrl: string;
  category: string;
}

function decodeHtmlEntities(text: string): string {
  if (!text) return "";
  return text
    .replace(/&#x27;/gi, "'")
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        return String.fromCharCode(Number(dec));
      } catch {
        return "";
      }
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch {
        return "";
      }
    });
}

/**
 * Clean up title strings by stripping common marketing fluff suffixes.
 * e.g. "Linear – A better way to build software" -> "Linear"
 */
function cleanCompanyName(title: string, hostname: string): string {
  const decoded = decodeHtmlEntities(title || "");
  if (!decoded) {
    const cleanHost = hostname.replace(/^www\./, "").split(".")[0];
    return cleanHost.charAt(0).toUpperCase() + cleanHost.slice(1);
  }

  // Split on common delimiters: " | ", " – ", " - ", " : ", " • "
  const parts = decoded.split(/\s+[-|–—:•]\s+/);
  if (parts.length > 1 && parts[0].trim().length > 1 && parts[0].trim().length < 40) {
    return parts[0].trim();
  }

  // If title is short enough, return it
  if (decoded.length <= 40) return decoded.trim();

  // Otherwise fallback to hostname capitalized
  const cleanHost = hostname.replace(/^www\./, "").split(".")[0];
  return cleanHost.charAt(0).toUpperCase() + cleanHost.slice(1);
}

/**
 * Clean and truncate description to a concise snippet.
 */
function cleanDescription(desc: string, maxLength = 240): string {
  if (!desc) return "Next-generation startup on GeTopFloor skyscraper.";
  const decoded = decodeHtmlEntities(desc);
  const clean = decoded.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  return clean.slice(0, maxLength - 3) + "...";
}

/**
 * Auto-detect likely startup category from keywords.
 */
function guessCategory(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("ai") || lower.includes("artificial intelligence") || lower.includes("gpt") || lower.includes("agent") || lower.includes("llm") || lower.includes("machine learning")) {
    return "AI & Machine Learning";
  }
  if (lower.includes("api") || lower.includes("developer") || lower.includes("code") || lower.includes("github") || lower.includes("sdk") || lower.includes("framework") || lower.includes("dev tool")) {
    return "Developer Tools";
  }
  if (lower.includes("crypto") || lower.includes("web3") || lower.includes("blockchain") || lower.includes("token") || lower.includes("defi")) {
    return "Web3 & Crypto";
  }
  if (lower.includes("pay") || lower.includes("banking") || lower.includes("finance") || lower.includes("investment") || lower.includes("billing") || lower.includes("invoice")) {
    return "Fintech";
  }
  if (lower.includes("shop") || lower.includes("store") || lower.includes("ecommerce") || lower.includes("checkout") || lower.includes("cart") || lower.includes("d2c")) {
    return "E-Commerce";
  }
  if (lower.includes("health") || lower.includes("medical") || lower.includes("doctor") || lower.includes("care") || lower.includes("wellness") || lower.includes("fitness")) {
    return "Health & Wellness";
  }
  if (lower.includes("design") || lower.includes("figma") || lower.includes("ui") || lower.includes("ux") || lower.includes("creative") || lower.includes("graphic")) {
    return "Design & Creative";
  }
  if (lower.includes("security") || lower.includes("auth") || lower.includes("cyber") || lower.includes("privacy") || lower.includes("compliance")) {
    return "Security & Privacy";
  }
  if (lower.includes("saas") || lower.includes("software") || lower.includes("crm") || lower.includes("analytics") || lower.includes("dashboard") || lower.includes("productivity")) {
    return "B2B SaaS";
  }
  return "Startup";
}

/**
 * Resolve relative URLs to absolute URLs against origin.
 */
function resolveUrl(relativeUrl: string, baseUrl: string): string {
  try {
    return new URL(relativeUrl, baseUrl).href;
  } catch {
    return relativeUrl;
  }
}

/**
 * Scrape website metadata, OpenGraph tags, and icons using native HTTP + optional Firecrawl.
 */
export async function scrapeWebsiteMetadata(targetUrl: string): Promise<WebsiteMetadata> {
  let cleanUrl = targetUrl.trim();
  if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
    cleanUrl = `https://${cleanUrl}`;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(cleanUrl);
  } catch {
    return {
      companyName: "Startup",
      tagline: "Spot reserved for your startup — Outbid & claim top floor",
      description: "Claimed top floor on GeTopFloor skyscraper.",
      logoUrl: `https://www.google.com/s2/favicons?domain=getopfloor.com&sz=128`,
      category: "Startup",
    };
  }

  const hostname = parsedUrl.hostname;
  const fallbackFavicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;

  // 1. Optional Firecrawl API Integration (if FIRECRAWL_API_KEY is configured in env)
  const firecrawlKey = process.env.FIRECRAWL_API_KEY?.trim();
  if (firecrawlKey) {
    try {
      const fcRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firecrawlKey}`,
        },
        body: JSON.stringify({
          url: cleanUrl,
          formats: ["markdown", "extract"],
          onlyMainContent: true,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (fcRes.ok) {
        const fcData = await fcRes.json();
        const meta = fcData.data?.metadata || {};
        const title = meta.title || meta.ogTitle || "";
        const desc = meta.description || meta.ogDescription || "";
        const ogImage = meta.ogImage || fallbackFavicon;

        const name = cleanCompanyName(title, hostname);
        const tagline = cleanDescription(desc, 110);
        const description = cleanDescription(desc, 260);
        const category = guessCategory(`${name} ${desc}`);

        return {
          companyName: name,
          tagline,
          description,
          logoUrl: ogImage || fallbackFavicon,
          category,
        };
      }
    } catch (fcErr) {
      console.warn("Firecrawl scrape attempt timed out, falling back to direct OpenGraph parser:", fcErr);
    }
  }

  // 2. High-Performance Direct OpenGraph & HTML Parser
  try {
    const res = await fetch(cleanUrl, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 GeTopFloorBot/1.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(4000),
      redirect: "follow",
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const html = await res.text();

    // Extract OpenGraph site name or title
    const ogSiteNameMatch = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i);

    const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);

    const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);

    const rawTitle = ogSiteNameMatch?.[1] || ogTitleMatch?.[1] || titleTagMatch?.[1] || "";
    const companyName = cleanCompanyName(rawTitle, hostname);

    // Extract Description / Tagline
    const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i);

    const metaDescMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);

    const twitterDescMatch = html.match(/<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:description["']/i);

    const rawDesc = ogDescMatch?.[1] || metaDescMatch?.[1] || twitterDescMatch?.[1] || "";
    const tagline = rawDesc ? cleanDescription(rawDesc, 110) : `${companyName} — Official Skyscraper Floor`;
    const description = rawDesc ? cleanDescription(rawDesc, 260) : `Claimed top floor on GeTopFloor skyscraper.`;

    // Extract Icons & Favicons with multi-tier favicon crawler (HTML + Next.js RSC + JSON-LD Schema)
    const appleTouchIconMatch =
      html.match(/<link[^>]+rel=["'](?:apple-touch-icon|apple-touch-icon-precomposed)["'][^>]+href=["']([^"']+)["']/i) ||
      html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:apple-touch-icon|apple-touch-icon-precomposed)["']/i) ||
      html.match(/\\"rel\\":\\"apple-touch-icon\\",\\"href\\":\\"([^\\"]+)\\"/i) ||
      html.match(/"rel":"apple-touch-icon","href":"([^"]+)"/i);

    const jsonLdLogoMatch =
      html.match(/"logo":"([^"]+)"/i) ||
      html.match(/\\"logo\\":\\"([^\\"]+)\\"/i);

    const pngIconMatch =
      html.match(/<link[^>]+rel=["'](?:shortcut icon|icon)["'][^>]+type=["']image\/(?:png|svg\+xml)["'][^>]+href=["']([^"']+)["']/i) ||
      html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut icon|icon)["'][^>]+type=["']image\/(?:png|svg\+xml)["']/i);

    const iconMatch =
      html.match(/<link[^>]+rel=["'](?:shortcut icon|icon)["'][^>]+href=["']([^"']+)["']/i) ||
      html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut icon|icon)["']/i) ||
      html.match(/\\"rel\\":\\"(?:shortcut icon|icon)\\",\\"href\\":\\"([^\\"]+)\\"/i) ||
      html.match(/"rel":"(?:shortcut icon|icon)","href":"([^"]+)"/i);

    let logoUrl = fallbackFavicon;
    if (appleTouchIconMatch?.[1]) {
      logoUrl = resolveUrl(appleTouchIconMatch[1], cleanUrl);
    } else if (jsonLdLogoMatch?.[1]) {
      logoUrl = resolveUrl(jsonLdLogoMatch[1], cleanUrl);
    } else if (pngIconMatch?.[1]) {
      logoUrl = resolveUrl(pngIconMatch[1], cleanUrl);
    } else if (iconMatch?.[1]) {
      logoUrl = resolveUrl(iconMatch[1], cleanUrl);
    } else {
      logoUrl = fallbackFavicon;
    }

    const category = guessCategory(`${companyName} ${tagline} ${description}`);

    return {
      companyName,
      tagline,
      description,
      logoUrl,
      category,
    };
  } catch (err) {
    console.warn(`Direct metadata scrape fallback for ${cleanUrl}:`, err);
    const cleanName = hostname.replace(/^www\./, "").split(".")[0];
    const companyName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

    return {
      companyName,
      tagline: `${companyName} — Official Skyscraper Floor`,
      description: `Claimed top floor on GeTopFloor skyscraper.`,
      logoUrl: fallbackFavicon,
      category: "Startup",
    };
  }
}
