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
    return { valid: false, error: "Invalid website URL format. Please check for spelling mistakes." };
  }

  if (parsed.protocol !== "https:") {
    return { valid: false, error: "Only secure HTTPS websites are allowed (e.g. https://yourcompany.com)." };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 1. Block Localhost
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "127.0.0.1" || hostname === "[::1]") {
    return { valid: false, error: "Localhost addresses cannot be claimed. Please enter your live, public website." };
  }

  // 2. Block Raw IP Addresses (IPv4 or IPv6)
  const isIpv4 = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname);
  if (isIpv4 || hostname.startsWith("[") || hostname.includes(":")) {
    return { valid: false, error: "Raw IP addresses are not permitted. Please enter a valid registered domain name." };
  }

  // 3. Check for valid domain format (must have at least one dot)
  const parts = hostname.split(".");
  if (parts.length < 2) {
    return { valid: false, error: "Please provide a complete domain name with an extension (e.g. acme.com or startup.ai)." };
  }

  // Check each domain part
  for (const part of parts) {
    if (!part || part.length > 63 || !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(part)) {
      return { valid: false, error: `Invalid characters in domain name '${hostname}'.` };
    }
  }

  // 4. Validate TLD
  const tld = parts[parts.length - 1];
  if (BLOCKED_TLDS.has(tld)) {
    return { valid: false, error: `Domains ending in .${tld} are internal or reserved and cannot be claimed.` };
  }
  if (!/^[a-z]{2,24}$/.test(tld)) {
    return { valid: false, error: `Invalid domain extension '.${tld}'. Please enter a standard web domain.` };
  }

  // 5. Block dummy / test / placeholder domains
  if (BLOCKED_TEST_DOMAINS.has(hostname)) {
    return { valid: false, error: `Demo domain '${hostname}' is reserved. Please enter your company's real website.` };
  }

  // Block obvious test prefixes (e.g. test-site.com, demo-page.com)
  if (
    hostname.startsWith("test-") ||
    hostname.startsWith("demo-") ||
    hostname.startsWith("dummy-") ||
    hostname.startsWith("sample-") ||
    hostname.endsWith("-test.com") ||
    hostname.endsWith("-demo.com")
  ) {
    return { valid: false, error: "Test or demo domain names are not allowed on the skyscraper." };
  }

  // Clean canonical URL (root or path, normalized lowercase host)
  const cleanUrl = parsed.toString().replace(/\/$/, "");

  return {
    valid: true,
    cleanUrl,
    domain: hostname,
  };
}

/**
 * Server-side verification: Validates syntax and performs a live reachability & SSL health check.
 */
export async function verifyWebsiteLive(inputUrl: string): Promise<ValidationResult> {
  const syntaxCheck = validateWebsiteSyntax(inputUrl);
  if (!syntaxCheck.valid || !syntaxCheck.cleanUrl) {
    return syntaxCheck;
  }

  const targetUrl = syntaxCheck.cleanUrl;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4-second timeout

    let response: Response;
    try {
      // Try fast HEAD request first
      response = await fetch(targetUrl, {
        method: "HEAD",
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent": "GeTopFloor-Bot/1.0 (+https://getopfloor.com; domain verification)",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      // If server doesn't allow HEAD (405 Method Not Allowed), fall back to GET
      if (response.status === 405) {
        response = await fetch(targetUrl, {
          method: "GET",
          signal: controller.signal,
          redirect: "follow",
          headers: {
            "User-Agent": "GeTopFloor-Bot/1.0 (+https://getopfloor.com; domain verification)",
          },
        });
      }
    } finally {
      clearTimeout(timeoutId);
    }

    // Server responded!
    // 2xx, 3xx, 401, 403 (Cloudflare/bot protection) all indicate a live, active domain with SSL.
    if (response.status >= 500 && response.status <= 599) {
      console.warn(`Target ${targetUrl} returned server error ${response.status}, but domain is alive.`);
    }

    return {
      valid: true,
      cleanUrl: targetUrl,
      domain: syntaxCheck.domain,
    };
  } catch (err: any) {
    const msg = err?.message || "";
    const code = err?.cause?.code || err?.code || "";

    // Specific network errors
    if (code === "ENOTFOUND" || msg.includes("getaddrinfo ENOTFOUND") || msg.includes("ENOTFOUND")) {
      return {
        valid: false,
        error: `Could not resolve domain '${syntaxCheck.domain}'. Please ensure your website has active DNS records.`,
      };
    }

    if (
      code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ||
      code === "CERT_HAS_EXPIRED" ||
      code === "DEPTH_ZERO_SELF_SIGNED_CERT" ||
      msg.includes("certificate") ||
      msg.includes("SSL") ||
      msg.includes("TLS")
    ) {
      return {
        valid: false,
        error: "Your website does not have a valid, trusted SSL certificate. Please use a secure HTTPS domain.",
      };
    }

    if (err?.name === "AbortError" || code === "ETIMEDOUT" || msg.includes("timeout")) {
      return {
        valid: false,
        error: `The website at '${syntaxCheck.domain}' took too long to respond. Please ensure your website is online and publicly accessible.`,
      };
    }

    if (code === "ECONNREFUSED") {
      return {
        valid: false,
        error: `Connection refused by '${syntaxCheck.domain}'. Please ensure your web server is running.`,
      };
    }

    // Other network errors — still return friendly message
    console.warn(`Live check warning for ${targetUrl}:`, err);
    return {
      valid: false,
      error: `Could not connect to '${syntaxCheck.domain}'. Please check that the URL is correct and the site is live.`,
    };
  }
}
