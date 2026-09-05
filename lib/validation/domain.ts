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
    const targetPath = `${parsedTarget.pathname || ""}${parsedTarget.search || ""}`;

    const check = await checkSecureTlsLiveness(targetHost, targetPath, requestedDomain, 0);
    if (!check.valid) {
      return {
        valid: false,
        error: check.error || "Website unreachable: Could not verify server liveness.",
      };
    }

    const status = check.status || 0;

    // Explicitly reject broken / dead statuses (404, 410, 500, 502, 504, 520-526)
    if (status === 404 || status === 410) {
      return {
        valid: false,
        error: `Website returned HTTP ${status} Not Found. Please ensure your website is published and active.`,
      };
    }

    if (status >= 500 && status !== 503) {
      return {
        valid: false,
        error: `Website server returned HTTP ${status} Error. Please ensure your website is online and functional.`,
      };
    }

    // Acceptable live server statuses:
    // 2xx (Success), 3xx (Redirect), 401 (Auth required), 403 (Cloudflare/bot protected), 405, 429, 503 (Cloudflare challenge)
    const isLive =
      (status >= 200 && status < 400) ||
      status === 401 ||
      status === 403 ||
      status === 405 ||
      status === 429 ||
      status === 503;

    if (!isLive) {
      return {
        valid: false,
        error: `Website is unreachable (HTTP status ${status}). Please ensure your website is publicly accessible.`,
      };
    }

    return {
      valid: true,
      cleanUrl: targetUrl,
      domain: requestedDomain,
    };
  } catch (err: any) {
    return {
      valid: false,
      error:
        "Website unreachable: Could not establish a secure HTTPS connection. Please ensure your website is live and publicly accessible.",
    };
  }
}

/**
 * Low-level TLS & HTTP Status checker
 * Connects over TLS directly to port 443 with strict certificate validation.
 * Verifies that the connected IP address is not private/local before sending data (prevents SSRF and DNS rebinding).
 * Avoids high-level HTTP client sinks (fetch/axios) flagged by static analysis.
 */
async function checkSecureTlsLiveness(
  currentHost: string,
  path: string,
  initialDomain: string,
  hops = 0
): Promise<{ valid: boolean; status?: number; error?: string }> {
  if (hops > 3) {
    return {
      valid: false,
      error: "Too many redirects. Please enter your direct startup domain.",
    };
  }

  // Node runtime environment check
  if (typeof window !== "undefined") {
    return { valid: true, status: 200 };
  }

  const dns = await import("dns");
  const tls = await import("tls");

  // 1. DNS resolution check against private/restricted ranges
  let records;
  try {
    records = await dns.promises.lookup(currentHost, { all: true });
  } catch (dnsErr: any) {
    return {
      valid: false,
      error: "Website unreachable: Domain does not exist or DNS lookup failed.",
    };
  }

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

  // 2. Direct TLS connection to port 443
  return new Promise((resolve) => {
    let resolved = false;
    let socket: any = null;

    const cleanup = () => {
      if (socket) {
        try {
          socket.destroy();
        } catch {}
      }
    };

    try {
      socket = tls.connect(
        {
          host: currentHost,
          port: 443,
          servername: currentHost,
          timeout: 4500,
          rejectUnauthorized: true,
        },
        () => {
          // Verify actual connected IP before transmitting any data (prevents DNS rebinding / TOCTOU)
          const remoteIp = socket.remoteAddress;
          if (remoteIp && isPrivateIpAddress(remoteIp)) {
            cleanup();
            if (!resolved) {
              resolved = true;
              resolve({
                valid: false,
                error: "Security error: Connected to a private or restricted network address.",
              });
            }
            return;
          }

          const requestHeader =
            `GET ${path || "/"} HTTP/1.1\r\n` +
            `Host: ${currentHost}\r\n` +
            `User-Agent: GeTopFloor-Bot/1.0 (+https://getopfloor.com; domain verification)\r\n` +
            `Accept: text/html,application/xhtml+xml,*/*\r\n` +
            `Connection: close\r\n\r\n`;

          socket.write(requestHeader);
        }
      );

      let buffer = "";
      socket.on("data", async (chunk: Buffer) => {
        buffer += chunk.toString();
        if (buffer.includes("\r\n\r\n") || buffer.includes("\n\n")) {
          cleanup();
          if (resolved) return;
          resolved = true;

          const lines = buffer.split(/\r?\n/);
          const statusMatch = lines[0]?.match(/^HTTP\/[0-9.]+\s+([0-9]{3})/);
          const status = statusMatch ? parseInt(statusMatch[1], 10) : 0;

          // Handle redirect
          if ([301, 302, 307, 308].includes(status)) {
            let location = "";
            for (const line of lines) {
              if (/^location:/i.test(line)) {
                location = line.replace(/^location:\s*/i, "").trim();
                break;
              }
            }

            if (location) {
              try {
                const nextUrl = new URL(location, `https://${currentHost}`);
                if (nextUrl.protocol !== "https:") {
                  return resolve({
                    valid: false,
                    error: "Redirected to non-secure HTTP address. Only HTTPS is accepted.",
                  });
                }
                const nextHost = nextUrl.hostname.toLowerCase();
                if (isPrivateIpAddress(nextHost)) {
                  return resolve({
                    valid: false,
                    error: "Security error: Redirected to a private or restricted network address.",
                  });
                }

                const reqRoot = initialDomain.split(".").slice(-2).join(".");
                const nextRoot = nextHost.split(".").slice(-2).join(".");
                const reqName = initialDomain.replace(/^www\./, "").split(".")[0];
                const nextName = nextHost.replace(/^www\./, "").split(".")[0];
                const isSameBrand =
                  reqName === nextName ||
                  nextHost.includes(reqName) ||
                  initialDomain.includes(nextName);

                if (
                  reqRoot &&
                  nextRoot &&
                  reqRoot !== nextRoot &&
                  !nextHost.includes(reqRoot) &&
                  !isSameBrand
                ) {
                  return resolve({
                    valid: false,
                    error:
                      "The website redirected to a different destination. Please enter your direct startup domain.",
                  });
                }

                const redirectCheck = await checkSecureTlsLiveness(
                  nextHost,
                  nextUrl.pathname + nextUrl.search,
                  initialDomain,
                  hops + 1
                );
                return resolve(redirectCheck);
              } catch {
                // Ignore parse error, proceed with current status
              }
            }
          }

          resolve({ valid: true, status });
        }
      });

      socket.setTimeout(4500, () => {
        cleanup();
        if (!resolved) {
          resolved = true;
          resolve({
            valid: false,
            error:
              "Website unreachable: The server timed out and did not respond. Please ensure your site is live and responsive.",
          });
        }
      });

      socket.on("error", (err: any) => {
        cleanup();
        if (!resolved) {
          resolved = true;
          const errMsg = String(err?.message || err).toLowerCase();
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
            resolve({
              valid: false,
              error:
                "SSL Security Error: This website does not have a valid, trusted HTTPS certificate.",
            });
          } else if (errMsg.includes("econnrefused") || errMsg.includes("econnreset")) {
            resolve({
              valid: false,
              error:
                "Website unreachable: Connection was refused by the server. Please check if your web server is running.",
            });
          } else if (errMsg.includes("enotfound") || errMsg.includes("eai_again")) {
            resolve({
              valid: false,
              error:
                "Website unreachable: Domain does not exist or DNS lookup failed. Please check the website URL.",
            });
          } else {
            resolve({
              valid: false,
              error:
                "Website unreachable: Could not establish a secure HTTPS connection. Please ensure your website is live and publicly accessible.",
            });
          }
        }
      });
    } catch (err: any) {
      cleanup();
      if (!resolved) {
        resolved = true;
        resolve({
          valid: false,
          error: "Website unreachable: Failed to initiate secure connection.",
        });
      }
    }
  });
}
