/**
 * Domain & Website Security Verification
 * Verifies that candidate startup websites are live, reachable, and secured over HTTPS.
 */

// Non-routable / private / test TLDs
const BLOCKED_TLDS = new Set([
  "local",
  "localhost",
  "internal",
  "invalid",
  "test",
  "example",
  "lan",
  "home",
  "onion",
  "corp",
]);

// Known dummy / test / placeholder domains to reject immediately on client and server
const BLOCKED_DOMAINS = new Set([
  "test.com",
  "test.org",
  "test.net",
  "example.com",
  "example.org",
  "example.net",
  "dummy.com",
  "fake.com",
  "placeholder.com",
  "testsite.com",
  "mytest.com",
  "testdomain.com",
  "sample.com",
  "demo.com",
]);

export interface ValidationResult {
  valid: boolean;
  cleanUrl?: string;
  domain?: string;
  error?: string;
}

/**
 * Extracts a bare canonical hostname for floor matching / identity comparison.
 * Strips protocol, port, path, and 'www.'
 * e.g. "https://www.Linear.app/pricing" -> "linear.app"
 */
export function extractRootHostname(urlOrHost: string): string {
  if (!urlOrHost) return "";
  try {
    const raw = urlOrHost.trim();
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(withProto).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return urlOrHost
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0]
      .split(":")[0]
      .toLowerCase()
      .trim();
  }
}

/**
 * Checks whether an IP address belongs to private, loopback, link-local, carrier-grade NAT, or cloud metadata ranges.
 * Protects against Server-Side Request Forgery (SSRF).
 */
export function isPrivateIpAddress(ip: string): boolean {
  if (!ip || typeof ip !== "string") return true;
  const clean = ip.trim().toLowerCase().replace(/^::ffff:/, "");

  // IPv4
  const ipv4Match = clean.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const p = ipv4Match.slice(1, 5).map(Number);
    if (p.some((n) => n > 255)) return true;
    if (p[0] === 0 || p[0] === 10 || p[0] === 127) return true; // 0.0.0.0/8, 10.0.0.0/8, 127.0.0.0/8
    if (p[0] === 169 && p[1] === 254) return true; // 169.254.0.0/16 Link-Local & Cloud Metadata (AWS/GCP)
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true; // 172.16.0.0/12
    if (p[0] === 192 && p[1] === 168) return true; // 192.168.0.0/16
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true; // 100.64.0.0/10 Carrier-grade NAT
    if (p[0] === 192 && p[1] === 0 && p[2] === 2) return true; // 192.0.2.0/24 TEST-NET-1
    if (p[0] === 198 && p[1] === 51 && p[2] === 100) return true; // 198.51.100.0/24 TEST-NET-2
    if (p[0] === 203 && p[1] === 0 && p[2] === 113) return true; // 203.0.113.0/24 TEST-NET-3
    if (p[0] >= 224) return true; // Multicast & Reserved
    return false;
  }

  // IPv6
  if (
    clean === "::1" ||
    clean === "::" ||
    clean === "0:0:0:0:0:0:0:1" ||
    clean === "0:0:0:0:0:0:0:0" ||
    clean.startsWith("fc") ||
    clean.startsWith("fd") ||
    clean.startsWith("fe8") ||
    clean.startsWith("fe9") ||
    clean.startsWith("fea") ||
    clean.startsWith("feb")
  ) {
    return true;
  }

  return false;
}

/**
 * Validate syntax, secure protocol (HTTPS), and hostname structure for a website URL.
 * Works both on client and server.
 */
export function validateWebsiteSyntax(inputUrl: string): ValidationResult {
  if (!inputUrl || typeof inputUrl !== "string") {
    return {
      valid: false,
      error: "Please enter your startup website URL (e.g. acme.com or yourstartup.ai).",
    };
  }

  let trimmed = inputUrl.trim();
  const lower = trimmed.toLowerCase();

  // If a URL scheme is provided, strictly enforce https:// (resolves CodeQL js/incomplete-url-scheme-check)
  if (/^[a-z0-9+.-]+:/i.test(trimmed)) {
    if (!lower.startsWith("https://")) {
      return {
        valid: false,
        error: "Only secure HTTPS websites (https://...) are accepted.",
      };
    }
  } else {
    // Protocol omitted: default to https://
    trimmed = `https://${trimmed}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: "Invalid URL format. Please enter a valid website address." };
  }

  if (parsed.protocol !== "https:") {
    return { valid: false, error: "Only secure HTTPS websites (https://...) are accepted." };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 1. Block Localhost
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  ) {
    return {
      valid: false,
      error: "Localhost addresses are not permitted. Please enter a publicly accessible website.",
    };
  }

  // 2. Block Raw IP Addresses
  if (
    /^[0-9.]+$/.test(hostname) ||
    hostname.startsWith("[") ||
    hostname.includes(":") ||
    isPrivateIpAddress(hostname)
  ) {
    return {
      valid: false,
      error: "Raw IP addresses are not permitted. Please enter a valid domain name.",
    };
  }

  // 3. Check for valid domain format
  const parts = hostname.split(".");
  if (parts.length < 2) {
    return {
      valid: false,
      error: "Please enter a complete domain name with an extension (e.g., startup.com).",
    };
  }

  // Check each domain label
  for (const part of parts) {
    if (!part || part.length > 63 || !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(part)) {
      return {
        valid: false,
        error: "The domain name contains invalid characters. Please check your URL.",
      };
    }
  }

  // 4. Validate TLD
  const tld = parts[parts.length - 1];
  if (BLOCKED_TLDS.has(tld) || !/^[a-z]{2,24}$/.test(tld)) {
    return {
      valid: false,
      error: `The .${tld} domain extension is not a valid public web extension.`,
    };
  }

  // 5. Block known test and placeholder dummy domains immediately
  if (
    BLOCKED_DOMAINS.has(hostname) ||
    hostname.startsWith("teststartup.") ||
    hostname.startsWith("fakestartup.") ||
    hostname.startsWith("dummystartup.")
  ) {
    return {
      valid: false,
      error:
        "Test and placeholder domains (like teststartup.com) are not accepted. Please enter your genuine live startup website URL.",
    };
  }

  // Clean canonical URL (root or path, normalized lowercase host)
  const cleanUrl = parsed.toString().replace(/\/$/, "");

  return {
    cleanUrl,
    valid: true,
    domain: hostname,
  };
}

/**
 * Server-side verification: Validates syntax, SSL certificates, live reachability, and active server status.
 * Ensures the website is active and reachable before accepting payment or claiming a skyscraper floor.
 */
export async function verifyWebsiteLive(inputUrl: string): Promise<ValidationResult> {
  const syntaxCheck = validateWebsiteSyntax(inputUrl);
  if (!syntaxCheck.valid || !syntaxCheck.cleanUrl) {
    return syntaxCheck;
  }

  const targetUrl = syntaxCheck.cleanUrl;
  const requestedDomain = syntaxCheck.domain || "";

  try {
    const parsedTarget = new URL(targetUrl);
    const targetHost = parsedTarget.hostname.toLowerCase();

    // 1. Pre-resolve DNS to block SSRF attempts targeting private/internal network addresses
    if (typeof window === "undefined") {
      try {
        const dns = await import("dns");
        const records = await dns.promises.lookup(targetHost, { all: true });
        if (!records || records.length === 0) {
          return {
            valid: false,
            error: "Website unreachable: Domain does not exist or DNS lookup failed.",
          };
        }
        for (const rec of records) {
          if (isPrivateIpAddress(rec.address)) {
            return {
              valid: false,
              error: "Security error: Domain resolves to a private or restricted network address.",
            };
          }
        }
      } catch (dnsErr: any) {
        return {
          valid: false,
          error: "Website unreachable: Domain DNS lookup failed. Please check the website URL.",
        };
      }
    }

    // Reconstruct safe URL strictly bounded to HTTPS and validated public hostname
    const safeTargetUrl = new URL(
      `${parsedTarget.pathname || ""}${parsedTarget.search || ""}`,
      `https://${targetHost}`
    ).toString();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500); // 4.5-second timeout

    let response: Response;
    try {
      response = await fetch(safeTargetUrl, {
        method: "GET",
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent": "GeTopFloor-Bot/1.0 (+https://getopfloor.com; domain verification)",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
    } finally {
      clearTimeout(timeoutId);
    }

    // Explicitly reject broken / dead statuses (404, 410, 500, 502, 504, 520-526)
    if (response.status === 404 || response.status === 410) {
      return {
        valid: false,
        error: `Website returned HTTP ${response.status} Not Found. Please ensure your website is published and active.`,
      };
    }

    if (response.status >= 500 && response.status !== 503) {
      return {
        valid: false,
        error: `Website server returned HTTP ${response.status} Error. Please ensure your website is online and functional.`,
      };
    }

    // Check acceptable live server statuses:
    // 2xx (Success), 3xx (Redirect), 401 (Auth required), 403 (Cloudflare/bot protected), 405, 429, 503 (Cloudflare challenge)
    const isLive =
      response.ok ||
      response.status === 401 ||
      response.status === 403 ||
      response.status === 405 ||
      response.status === 429 ||
      response.status === 503;

    if (!isLive) {
      return {
        valid: false,
        error: `Website is unreachable (HTTP status ${response.status}). Please ensure your website is publicly accessible.`,
      };
    }

    // Check if redirected to a completely different root domain
    const finalUrl = response.url || targetUrl;
    try {
      const finalParsed = new URL(finalUrl);
      const finalHost = finalParsed.hostname.toLowerCase();
      if (isPrivateIpAddress(finalHost)) {
        return {
          valid: false,
          error: "Security error: Redirected to a private or restricted network address.",
        };
      }
      const requestedRoot = requestedDomain.split(".").slice(-2).join(".");
      const finalRoot = finalHost.split(".").slice(-2).join(".");
      const reqName = requestedDomain.replace(/^www\./, "").split(".")[0];
      const finName = finalHost.replace(/^www\./, "").split(".")[0];
      const isSameBrand =
        reqName === finName ||
        finalHost.includes(reqName) ||
        requestedDomain.includes(finName);

      if (
        requestedRoot &&
        finalRoot &&
        requestedRoot !== finalRoot &&
        !finalHost.includes(requestedRoot) &&
        !isSameBrand
      ) {
        return {
          valid: false,
          error:
            "The website redirected to a different destination. Please enter your direct startup domain.",
        };
      }
    } catch {}

    return {
      valid: true,
      cleanUrl: targetUrl,
      domain: requestedDomain,
    };
  } catch (err: any) {
    const errMsg = String(err?.message || err?.cause?.message || err).toLowerCase();
    console.warn(`Live reachability check failed for ${targetUrl}:`, errMsg);

    // SSL Certificate / Security failures
    if (
      errMsg.includes("cert_") ||
      errMsg.includes("certificate") ||
      errMsg.includes("self-signed") ||
      errMsg.includes("self signed") ||
      errMsg.includes("unable_to_verify") ||
      errMsg.includes("depth_zero") ||
      errMsg.includes("ssl") ||
      errMsg.includes("tls")
    ) {
      return {
        valid: false,
        error: "SSL Security Error: This website does not have a valid, trusted HTTPS certificate.",
      };
    }

    // Timeout / Unresponsive
    if (errMsg.includes("abort") || errMsg.includes("timeout") || errMsg.includes("timed out")) {
      return {
        valid: false,
        error:
          "Website unreachable: The server timed out and did not respond. Please ensure your site is live and responsive.",
      };
    }

    // DNS / Domain does not exist
    if (errMsg.includes("enotfound") || errMsg.includes("eai_again") || errMsg.includes("dns")) {
      return {
        valid: false,
        error:
          "Website unreachable: Domain does not exist or DNS lookup failed. Please check the website URL.",
      };
    }

    // Connection refused / Connection reset
    if (errMsg.includes("econnrefused") || errMsg.includes("econnreset")) {
      return {
        valid: false,
        error:
          "Website unreachable: Connection was refused by the server. Please check if your web server is running.",
      };
    }

    return {
      valid: false,
      error:
        "Website unreachable: Could not establish a secure HTTPS connection. Please ensure your website is live and publicly accessible.",
    };
  }
}
