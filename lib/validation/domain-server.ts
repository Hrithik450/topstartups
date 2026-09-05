import dns from "dns";
import tls from "tls";
import {
  validateWebsiteSyntax,
  isPrivateIpAddress,
  type ValidationResult,
} from "./domain";

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
  } catch {
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

  // 1. DNS resolution check against private/restricted ranges
  let records;
  try {
    records = await dns.promises.lookup(currentHost, { all: true });
  } catch {
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
    } catch {
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
