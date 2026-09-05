import "./globals.css";
import { bricolage } from "@/assets/fonts";
import type { Metadata, Viewport } from "next";
import { LayoutWrapper } from "@/app/layout-wrapper";
import { OrganizationJsonLd, WebsiteJsonLd, SoftwareApplicationJsonLd, FAQJsonLd } from "./jsonld";

export const metadata: Metadata = {
  metadataBase: new URL("https://getopfloor.com"),
  title: {
    default: "GeTopFloor — Claim the Top Floor of the Virtual Skyscraper",
    template: "%s | GeTopFloor",
  },
  description:
    "Claim the top floor of the internet's tallest interactive 3D tower. Boost your startup placement, reach thousands of global founders and investors, and own the digital skyline.",
  applicationName: "GeTopFloor",
  keywords: [
    "GeTopFloor",
    "top floor",
    "claim top floor",
    "virtual skyscraper",
    "startup discovery",
    "promote startup",
    "startup directory",
    "digital advertising",
    "sponsored listing",
    "3D directory",
    "startup ranking",
    "tech startup launch",
    "SaaS showcase",
  ],
  authors: [{ name: "GeTopFloor", url: "https://getopfloor.com" }],
  creator: "GeTopFloor",
  publisher: "GeTopFloor",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/logo.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://getopfloor.com",
    siteName: "GeTopFloor",
    title: "GeTopFloor — Claim the Top Floor of the Internet's Tallest Tower",
    description:
      "Interactive 3D skyscraper where ambitious startups claim and boost their floors to reach Top Floor #1. Showcase your product to founders and investors worldwide.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "GeTopFloor 3D Skyscraper — Claim the Top Floor",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GeTopFloor — Claim the Top Floor of the Internet's Tallest Tower",
    description:
      "Interactive 3D skyscraper where ambitious startups claim and boost their floors to reach Top Floor #1. Showcase your product to thousands of founders.",
    images: ["/og-image.png"],
    creator: "@GeTopFloor",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "technology",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#050811",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={bricolage.variable}>
      <head>
        <OrganizationJsonLd />
        <WebsiteJsonLd />
        <SoftwareApplicationJsonLd />
        <FAQJsonLd />
      </head>

      <body className={bricolage.className}>
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}
