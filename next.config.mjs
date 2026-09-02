/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  skipTrailingSlashRedirect: true,

  // SECURITY: Comprehensive security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent clickjacking
          { key: "X-Frame-Options", value: "DENY" },
          // Prevent MIME type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Control Referer header — prevent manage_token leaking via Referer
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Force HTTPS (1 year)
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // Disable browser features we don't need
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(self)",
          },
          // Content Security Policy — allow Three.js, inline styles, images from https
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' https: data: blob:",
              "connect-src 'self' blob: data: https://test.dodopayments.com https://live.dodopayments.com https://test.checkout.dodopayments.com https://checkout.dodopayments.com",
              "media-src 'self' blob: data:",
              "frame-src https://test.checkout.dodopayments.com https://checkout.dodopayments.com",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
      // SECURITY: CORS headers for API routes
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: process.env.NEXT_PUBLIC_BASE_URL || "https://getopfloor.com",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PATCH, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
