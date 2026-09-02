/**
 * Brevo (Sendinblue) Transactional Email Service
 * Sends 6-digit verification codes for passwordless floor management.
 */

interface SendOtpOptions {
  email: string;
  code: string;
  companyName?: string;
}

export async function sendOtpEmail({
  email,
  code,
  companyName,
}: SendOtpOptions): Promise<{ success: boolean; messageId?: string; devMode?: boolean }> {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const senderEmail =
    process.env.BREVO_SENDER_EMAIL?.trim() || "notifications@getopfloor.com";
  const senderName = process.env.BREVO_SENDER_NAME?.trim() || "GeTopFloor";

  // Development fallback: if no Brevo key configured, log OTP to console
  if (!apiKey) {
    console.log("\n=======================================================");
    console.log(`[BREVO DEV MODE] Verification code for: ${email}`);
    console.log(`👉 OTP CODE: ${code}`);
    console.log(`Expires in 10 minutes.`);
    console.log("=======================================================\n");
    return { success: true, devMode: true };
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>GeTopFloor Verification Code</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0c0d12; color: #f3f4f6; margin: 0; padding: 40px 20px;">
        <div style="max-width: 500px; margin: 0 auto; background: #161822; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 36px 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          
          <div style="margin-bottom: 24px;">
            <span style="font-size: 20px; font-weight: 800; letter-spacing: -0.02em; color: #ffffff;">
              🏢 GeTop<span style="color: #6366f1;">Floor</span>
            </span>
          </div>

          <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 12px; color: #ffffff;">
            Verify Floor Management Access
          </h1>

          <p style="font-size: 15px; line-height: 1.6; color: #9ca3af; margin: 0 0 28px;">
            Enter the 6-digit verification code below to manage, update, or vacate your skyscraper floors on GeTopFloor.
          </p>

          <div style="background: rgba(99, 102, 241, 0.1); border: 1px dashed rgba(99, 102, 241, 0.4); border-radius: 12px; padding: 20px; text-align: center; margin: 0 0 28px;">
            <span style="font-family: monospace, Courier, sans-serif; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #818cf8; display: inline-block;">
              ${code}
            </span>
          </div>

          <p style="font-size: 13px; color: #6b7280; margin: 0 0 16px; line-height: 1.5;">
            ⏰ This verification code will expire in <strong>10 minutes</strong>.
          </p>
          <p style="font-size: 13px; color: #6b7280; margin: 0; line-height: 1.5;">
            If you did not request this verification code, you can safely ignore this email.
          </p>

          <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 12px; color: #4b5563; text-align: center;">
            GeTopFloor — The Digital Skyscraper & Attention Market for High-Growth Startups
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email }],
        subject: `${code} is your GeTopFloor verification code`,
        htmlContent,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Brevo API error:", res.status, errorText);
      throw new Error(`Brevo email sending failed (${res.status})`);
    }

    const data = await res.json();
    return { success: true, messageId: data.messageId };
  } catch (err: any) {
    console.error("Failed to send OTP via Brevo:", err);
    throw err;
  }
}
