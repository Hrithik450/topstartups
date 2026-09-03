import crypto from "crypto";

export interface CreateCheckoutInput {
  url: string;
  category?: string;
  companyName: string;
  customerName?: string;
  targetRank?: number;
  price: number; // in INR
  customerEmail?: string;
  returnUrl: string;
}

export interface CheckoutResult {
  paymentId: string;
  checkoutUrl: string;
  isMock?: boolean;
}

const DODO_ENV = process.env.DODO_PAYMENTS_ENVIRONMENT || "test";
const DODO_API_URL =
  DODO_ENV === "live"
    ? "https://live.dodopayments.com"
    : "https://test.dodopayments.com";

/**
 * Creates a Dodo Payments checkout session.
 * If DODO_PAYMENTS_API_KEY is not configured or in test mock mode,
 * falls back to a sandbox test checkout URL for seamless local developer testing.
 */
export async function createDodoCheckout(
  input: CreateCheckoutInput
): Promise<CheckoutResult> {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY?.trim();

  // If no API key or mock flag, return seamless mock checkout for local dev
  if (!apiKey || apiKey.startsWith("mock_")) {
    const mockPaymentId = `mock_dodo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const mockCheckoutUrl = `/api/checkout/mock-success?payment_id=${mockPaymentId}&url=${encodeURIComponent(
      input.url
    )}&category=${encodeURIComponent(input.category || "")}&company_name=${encodeURIComponent(
      input.companyName
    )}&price=${input.price}&return_url=${encodeURIComponent(input.returnUrl)}`;

    return {
      paymentId: mockPaymentId,
      checkoutUrl: mockCheckoutUrl,
      isMock: true,
    };
  }

  const productId = process.env.DODO_PAYMENTS_PRODUCT_ID?.trim();
  if (!productId) {
    throw new Error("DODO_PAYMENTS_PRODUCT_ID is not configured");
  }

  // Real Dodo Payments REST API call
  try {
    const response = await fetch(`${DODO_API_URL}/checkouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        customer: {
          ...(input.customerEmail ? { email: input.customerEmail } : {}),
          ...(input.customerName ? { name: input.customerName } : {}),
        },
        product_cart: [
          {
            product_id: productId,
            amount: Math.round(Number(input.price) * 100), // Dodo amounts in subunits (paise / cents)
            quantity: 1,
          },
        ],
        return_url: `${input.returnUrl}${
          input.returnUrl.includes("?") ? "&" : "?"
        }session_id={CHECKOUT_ID}`,
        metadata: {
          url: input.url,
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
      // SECURITY: Don't expose Dodo API error details to clients
      throw new Error("Payment processing failed. Please try again.");
    }

    const data = await response.json();
    return {
      paymentId: data.session_id || data.payment_id || data.id,
      checkoutUrl: data.checkout_url || data.url,
      isMock: false,
    };
  } catch (err) {
    console.error("Failed to create Dodo Payments checkout session:", err);
    throw err;
  }
}

/**
 * Verify Dodo Payments webhook signature using HMAC SHA256.
 * SECURITY: Always reject if webhook secret is not configured.
 */
export function verifyDodoWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  const webhookSecret = process.env.DODO_PAYMENTS_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    console.error(
      "DODO_PAYMENTS_WEBHOOK_SECRET is not configured — rejecting webhook"
    );
    return false;
  }

  if (!signatureHeader) return false;

  try {
    const computedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    // SECURITY: Check length match before timingSafeEqual to prevent crash
    const computedBuf = Buffer.from(computedSignature, "utf8");
    const receivedBuf = Buffer.from(signatureHeader, "utf8");
    if (computedBuf.length !== receivedBuf.length) return false;

    return crypto.timingSafeEqual(computedBuf, receivedBuf);
  } catch (err) {
    console.error("Error verifying Dodo webhook signature:", err);
    return false;
  }
}

