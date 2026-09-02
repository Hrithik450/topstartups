import crypto from "crypto";

export interface CreateCheckoutInput {
  url: string;
  category?: string;
  companyName: string;
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

  const productId =
    process.env.DODO_PAYMENTS_PRODUCT_ID?.trim() || "pdt_0Nmk416j1IPMQxU2qgfrP";

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
          email: input.customerEmail || "founder@example.com",
          name: input.companyName,
        },
        product_cart: [
          {
            product_id: productId,
            amount: input.price * 100, // Dodo amounts in subunits (paise / cents)
            quantity: 1,
          },
        ],
        return_url: `${input.returnUrl}${
          input.returnUrl.includes("?") ? "&" : "?"
        }claimed=true&payment_id={CHECKOUT_ID}`,
        metadata: {
          url: input.url,
          category: input.category || "",
          company_name: input.companyName,
          price: input.price.toString(),
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Dodo Payments API error:", errorText);
      throw new Error(`Dodo Payments error: ${response.status} ${errorText}`);
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
 */
export function verifyDodoWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  const webhookSecret = process.env.DODO_PAYMENTS_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    // If webhook secret not yet configured, allow in dev mode
    return process.env.NODE_ENV !== "production";
  }

  if (!signatureHeader) return false;

  try {
    const computedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(computedSignature, "utf8"),
      Buffer.from(signatureHeader, "utf8")
    );
  } catch (err) {
    console.error("Error verifying Dodo webhook signature:", err);
    return false;
  }
}
