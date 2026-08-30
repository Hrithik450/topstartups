import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const bricolage = localFont({
  src: "../assets/fonts/bricolage-grotesque-variable.woff2",
  weight: "200 800",
  variable: "--font-bricolage",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BharatHunt — Claim the top floor",
  description:
    "Claim the top floor of the internet's tallest tower. Enter your URL, outbid the last owner, and put your company on top.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#8ec5fd",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={bricolage.variable}>
      <body className={bricolage.className}>{children}</body>
    </html>
  );
}
