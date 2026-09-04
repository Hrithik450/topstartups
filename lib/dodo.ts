import crypto from "crypto";

export interface CreateCheckoutInput {
  companyUrl: string;
  url?: string;
  category?: string;
  companyName: string;
  customerName?: string;
  targetRank?: number;
  price: number; // in INR
  customerEmail?: string;
  returnUrl: string;
}

export interface CheckoutResult {
  checkoutSessionId: string;
  checkoutUrl: string;
  isMock?: boolean;
}

export function getDodoApiUrl(): string {
  const env = (process.env.DODO_PAYMENTS_ENVIRONMENT || "").trim().toLowerCase();
  const isLive =
    env === "live" ||
    env === "live_mode" ||
    env === "production" ||
    env === "prod";
  return isLive ? "https://live.dodopayments.com" : "https://test.dodopayments.com";
}

/**
 * Creates a Dodo Payments checkout session.
 * If DODO_PAYMENTS_API_KEY is not configured or in test mock mode,
 * falls back to a sandbox test checkout URL for seamless local developer testing.
 */
export async function createDodoCheckout(input: CreateCheckoutInput): Promise<CheckoutResult> {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY?.trim();
  const companyUrl = input.companyUrl || input.url || "";

  // If no API key or mock flag, return seamless mock checkout for local dev
  if (!apiKey || apiKey.startsWith("mock_")) {
    const mockSessionId = `mock_cks_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const mockCheckoutUrl = `/api/checkout/mock-success?session_id=${mockSessionId}&company_url=${encodeURIComponent(
      companyUrl
    )}&category=${encodeURIComponent(input.category || "")}&company_name=${encodeURIComponent(
      input.companyName
    )}&price=${input.price}&return_url=${encodeURIComponent(input.returnUrl)}`;

    return {
      checkoutSessionId: mockSessionId,
      checkoutUrl: mockCheckoutUrl,
      isMock: true,
    };
  }

  const productId = process.env.DODO_PAYMENTS_PRODUCT_ID?.trim();
  if (!productId) {
    throw new Error("DODO_PAYMENTS_PRODUCT_ID is not configured");
  }

  // Ensure return URL includes {CHECKOUT_ID} placeholder so Dodo injects checkout session ID on return
  const returnUrlWithParams = input.returnUrl.includes("{CHECKOUT_ID}")
    ? input.returnUrl
    : `${input.returnUrl}${input.returnUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_ID}`;

  // Real Dodo Payments REST API call
  try {
    const response = await fetch(`${getDodoApiUrl()}/checkouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        ...(input.customerEmail?.trim()
          ? {
              customer: {
                email: input.customerEmail.trim(),
                ...(input.customerName?.trim() ? { name: input.customerName.trim() } : {}),
              },
            }
          : {}),
        billing_currency: "INR",
        minimal_address: true,
        billing_address: {
          country: "IN",
          zipcode: "560001",
        },
        product_cart: [
          {
            product_id: productId,
            amount: Math.round(Number(input.price) * 100), // Dodo amounts in subunits (paise / cents)
            quantity: 1,
          },
        ],
        return_url: returnUrlWithParams,
        metadata: {
          company_url: companyUrl,
          url: companyUrl,
          category: input.category || "",
          company_name: input.companyName,
          target_rank: (input.targetRank || 1).toString(),
          price: input.price.toString(),
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Dodo Payments API error:", response.status, errorText);
      let parsedMsg = "";
      try {
        const parsed = JSON.parse(errorText);
        parsedMsg = parsed.message || parsed.error || "";
      } catch {}
      throw new Error(
        parsedMsg
          ? `Payment gateway error: ${parsedMsg}`
          : "Payment processing failed. Please try again."
      );
    }

    const data = await response.json();
    return {
      checkoutSessionId: data.session_id || data.checkout_id || data.id,
      checkoutUrl: data.checkout_url || data.payment_url || data.url,
      isMock: false,
    };
  } catch (err) {
    console.error("Failed to create Dodo Payments checkout session:", err);
    throw err;
  }
}

/**
 * Standard Webhooks verification using the official Standard Webhooks specification
 * as mandated by Dodo Payments documentation (Svix-standard webhook-id, webhook-timestamp, webhook-signature).
 */
import { Webhook } from "standardwebhooks";

export function verifyDodoWebhookSignature(
  rawBody: string,
  headersOrSignature: Record<string, string | null | undefined> | string | null
): boolean {
  const webhookSecret = process.env.DODO_PAYMENTS_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    console.error("DODO_PAYMENTS_WEBHOOK_SECRET is not configured — rejecting webhook");
    return false;
  }

  // Normalize headers
  const headers =
    typeof headersOrSignature === "object" && headersOrSignature !== null
      ? headersOrSignature
      : { "webhook-signature": headersOrSignature };

  const id = headers["webhook-id"] || headers["x-webhook-id"] || "";
  const timestamp = headers["webhook-timestamp"] || headers["x-webhook-timestamp"] || "";
  const signature =
    headers["webhook-signature"] || headers["dodo-signature"] || headers["x-dodo-signature"] || "";

  // 1. Try official standardwebhooks verification if id & timestamp are present
  if (id && timestamp && signature) {
    try {
      const wh = new Webhook(webhookSecret);
      wh.verify(rawBody, {
        "webhook-id": id,
        "webhook-timestamp": timestamp,
        "webhook-signature": signature,
      });
      return true;
    } catch (err) {
      console.warn("Standard Webhooks signature mismatch, checking fallback:", err);
    }
  }

  // 2. Fallback: direct HMAC SHA256 verification (for CLI / testing / direct signatures)
  if (signature) {
    try {
      const cleanSig = signature.startsWith("v1,") ? signature.slice(3) : signature;
      const secret = webhookSecret.startsWith("whsec_")
        ? Buffer.from(webhookSecret.slice(6), "base64")
        : Buffer.from(webhookSecret, "utf8");

      const computedBase64 = crypto
        .createHmac("sha256", secret)
        .update(id && timestamp ? `${id}.${timestamp}.${rawBody}` : rawBody)
        .digest("base64");

      if (computedBase64 === cleanSig) return true;

      // Hex comparison fallback
      const computedHex = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");

      const computedBuf = Buffer.from(computedHex, "utf8");
      const receivedBuf = Buffer.from(signature, "utf8");
      if (
        computedBuf.length === receivedBuf.length &&
        crypto.timingSafeEqual(computedBuf, receivedBuf)
      ) {
        return true;
      }
    } catch (err) {
      console.error("Error in fallback webhook verification:", err);
    }
  }

  return false;
}

/**
 * Extracts payment_id, session_id, and status according to the official Dodo Payments redirect specification:
 * Dodo redirects with: ?payment_id=pay_xxx&status=succeeded&email=customer@example.com
 */
export function extractDodoRedirectParams(searchParams: URLSearchParams): {
  paymentId: string | null;
  sessionId: string | null;
  targetId: string | null;
  status: string | null;
} {
  const paymentId = searchParams.get("payment_id")?.trim() || null;
  const rawSessionId =
    searchParams.get("session_id")?.trim() ||
    searchParams.get("checkout_session_id")?.trim() ||
    searchParams.get("checkout_id")?.trim() ||
    null;
  const sessionId = rawSessionId && rawSessionId !== "{CHECKOUT_ID}" ? rawSessionId : null;
  const status = searchParams.get("status")?.trim() || null;
  const targetId = paymentId || sessionId;

  return { paymentId, sessionId, targetId, status };
}
