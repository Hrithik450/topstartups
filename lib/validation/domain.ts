/**
 * Domain & Website Security Verification
 * Filters out spam, placeholder/test domains, insecure protocols, and unreachable websites.
 */

// Known placeholder and dummy test domains to block
const BLOCKED_TEST_DOMAINS = new Set([
  "test.com",
  "test.org",
  "test.net",
  "test.io",
  "test.dev",
  "example.com",
  "example.org",
  "example.net",
  "sample.com",
  "dummy.com",
  "temp.com",
  "asdf.com",
  "qwerty.com",
  "foo.bar",
  "domain.com",
  "website.com",
  "mycompany.com",
  "yourcompany.com",
  "sitename.com",
  "placeholder.com",
  "fake.com",
  "demo.com",
]);

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

export interface ValidationResult {
  valid: boolean;
  cleanUrl?: string;
  domain?: string;
  error?: string;
}

/**
 * Validate syntax, security, and spam rules for a website URL.
 * Works both on client and server.
 */
export function validateWebsiteSyntax(inputUrl: string): ValidationResult {
  if (!inputUrl || typeof inputUrl !== "string") {
    return { valid: false, error: "Please enter your startup website URL." };
  }

  let trimmed = inputUrl.trim();

  // Reject dangerous protocols
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
    return { valid: false, error: "Invalid protocol. Only secure web addresses (HTTPS) are permitted." };
  }

  // Enforce HTTPS:
  // If user entered plain HTTP (e.g. http://example.com), reject insecure HTTP
  if (lower.startsWith("http://")) {
    return {
      valid: false,
      error: "Insecure website: Plain HTTP is not permitted. Please use a secure HTTPS website (https://...).",
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
    return { valid: false, error: "This website is not valid, please enter a valid website." };
  }

  if (parsed.protocol !== "https:") {
    return { valid: false, error: "This website is not valid, please enter a valid website." };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 1. Block Localhost
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "127.0.0.1" || hostname === "[::1]") {
    return { valid: false, error: "This website is not valid, please enter a valid website." };
  }

  // 2. Block Raw IP Addresses (IPv4 or IPv6)
  const isIpv4 = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname);
  if (isIpv4 || hostname.startsWith("[") || hostname.includes(":")) {
    return { valid: false, error: "This website is not valid, please enter a valid website." };
  }

  // 3. Check for valid domain format (must have at least one dot)
  const parts = hostname.split(".");
  if (parts.length < 2) {
    return { valid: false, error: "This website is not valid, please enter a valid website." };
  }

  // Check each domain part
  for (const part of parts) {
    if (!part || part.length > 63 || !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(part)) {
      return { valid: false, error: "This website is not valid, please enter a valid website." };
    }
  }

  // 4. Validate TLD
  const tld = parts[parts.length - 1];
  if (BLOCKED_TLDS.has(tld) || !/^[a-z]{2,24}$/.test(tld)) {
    return { valid: false, error: "This website is not valid, please enter a valid website." };
  }

  // 5. Block dummy / test / placeholder domains
  if (BLOCKED_TEST_DOMAINS.has(hostname)) {
    return { valid: false, error: "This website is not valid, please enter a valid website." };
  }

  // Block obvious test prefixes and combinations (e.g. testsetup.com, demo-page.com, testapp.io)
  const domainPrefix = hostname.split(".")[0];
  if (
    domainPrefix === "test" ||
    domainPrefix === "demo" ||
    domainPrefix === "dummy" ||
    domainPrefix === "sample" ||
    domainPrefix.startsWith("test-") ||
    domainPrefix.startsWith("demo-") ||
    domainPrefix.startsWith("dummy-") ||
    domainPrefix.startsWith("sample-") ||
    domainPrefix.startsWith("testsetup") ||
    domainPrefix.startsWith("testapp") ||
    domainPrefix.startsWith("testsite") ||
    domainPrefix.endsWith("-test") ||
    domainPrefix.endsWith("-demo")
  ) {
    return { valid: false, error: "This website is not valid, please enter a valid website." };
  }

  // Clean canonical URL (root or path, normalized lowercase host)
  const cleanUrl = parsed.toString().replace(/\/$/, "");

  return {
    valid: true,
    cleanUrl,
    domain: hostname,
  };
}

/** Known domain squatter and parking platforms */
const PARKED_DOMAIN_HOSTS = [
  "hugedomains.com",
  "sedo.com",
  "sedoparking.com",
  "godaddy.com",
  "dan.com",
  "afternic.com",
  "domainmarket.com",
  "parkingcrew.net",
  "bodis.com",
  "domainagents.com",
  "undeveloped.com",
  "squadhelp.com",
  "atom.com",
  "brandpa.com",
  "brandbucket.com",
  "domainnamesales.com",
];

/**
 * Server-side verification: Validates syntax and performs a live reachability & SSL health check.
 * Also verifies that the domain is a real active site and not a parked/for-sale placeholder.
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
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4-second timeout

    let response: Response;
    try {
      response = await fetch(targetUrl, {
        method: "GET",
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent": "GeTopFloor-Bot/1.0 (+https://getopfloor.com; domain verification)",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
    } finally {
      clearTimeout(timeoutId);
    }

    // If server responded, check if status is acceptable:
    // 2xx, 3xx, 401 (Auth required), 403 (Cloudflare / Bot protection), 405, 429, 503 (Cloudflare challenge)
    // All indicate an active, live web server hosting the domain.
    const isLiveServer =
      response.ok ||
      response.status === 401 ||
      response.status === 403 ||
      response.status === 405 ||
      response.status === 429 ||
      response.status === 503;

    if (!isLiveServer) {
      return {
        valid: false,
        error: "This website is not valid, please enter a valid website.",
      };
    }

    // Check if the domain redirected to a known domain-parking/squatting broker
    const finalUrl = response.url || targetUrl;
    try {
      const finalParsed = new URL(finalUrl);
      const finalHost = finalParsed.hostname.toLowerCase();

      // Check against known parking platforms
      if (PARKED_DOMAIN_HOSTS.some((p) => finalHost.includes(p))) {
        return {
          valid: false,
          error: "This website is not valid, please enter a valid website.",
        };
      }

      // If redirected to completely different root domain
      const requestedRoot = requestedDomain.split(".").slice(-2).join(".");
      const finalRoot = finalHost.split(".").slice(-2).join(".");
      if (requestedRoot && finalRoot && requestedRoot !== finalRoot && !finalHost.includes(requestedRoot)) {
        return {
          valid: false,
          error: "This website is not valid, please enter a valid website.",
        };
      }
    } catch {}

    // Inspect initial HTML content for parking/for-sale signatures
    try {
      const textSample = (await response.text()).slice(0, 4000).toLowerCase();
      if (
        textSample.includes("buy this domain") ||
        textSample.includes("domain is for sale") ||
        textSample.includes("domain is parked") ||
        textSample.includes("hugedomains.com") ||
        textSample.includes("inquire about this domain") ||
        textSample.includes("domain name is available for sale") ||
        textSample.includes("parked free, courtesy of")
      ) {
        return {
          valid: false,
          error: "This website is not valid, please enter a valid website.",
        };
      }
    } catch {}

    return {
      valid: true,
      cleanUrl: targetUrl,
      domain: requestedDomain,
    };
  } catch (err: any) {
    console.warn(`Live check unreachable for ${targetUrl}:`, err?.message || err);
    return {
      valid: false,
      error: "This website is not valid, please enter a valid website.",
    };
  }
}
