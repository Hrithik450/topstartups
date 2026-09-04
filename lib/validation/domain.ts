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

  // Reject dangerous or non-web protocols
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("file:") ||
    lower.startsWith("ftp:") ||
    lower.startsWith("ws:") ||
    lower.startsWith("wss:") ||
    lower.startsWith("mailto:")
  ) {
    return {
      valid: false,
      error: "Invalid protocol. Only secure web addresses (HTTPS) are permitted.",
    };
  }

  // Reject plain insecure HTTP
  if (lower.startsWith("http://")) {
    return {
      valid: false,
      error:
        "Insecure website: Plain HTTP is not permitted. Please use a secure HTTPS website (https://...).",
    };
  }

  // Prepend https:// if protocol was omitted
  if (!lower.startsWith("https://")) {
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
  const isIpv4 = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname);
  if (isIpv4 || hostname.startsWith("[") || hostname.includes(":")) {
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500); // 4.5-second timeout

    let response: Response;
    try {
      response = await fetch(targetUrl, {
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
      const requestedRoot = requestedDomain.split(".").slice(-2).join(".");
      const finalRoot = finalHost.split(".").slice(-2).join(".");
      if (
        requestedRoot &&
        finalRoot &&
        requestedRoot !== finalRoot &&
        !finalHost.includes(requestedRoot)
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
