/**
 * JSON-LD Structured Data for GeTopFloor SEO
 * Provides rich snippets for Google Search Console, Knowledge Graph, and AI Search Engines.
 */

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://getopfloor.com";

export function OrganizationJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "GeTopFloor",
    url: BASE_URL,
    logo: `${BASE_URL}/logo.png`,
    description:
      "Interactive 3D digital advertising and startup discovery platform where founders claim virtual skyscraper floors to showcase their companies.",
    sameAs: [
      "https://twitter.com/mhritihk470",
      "https://github.com/Hrithik450/topstartups",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Support",
      email: "support@getopfloor.com",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export function WebsiteJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "GeTopFloor",
    url: BASE_URL,
    description:
      "Claim a floor on the internet's tallest interactive 3D virtual tower. Showcase your company to global founders, builders, and investors.",
    potentialAction: {
      "@type": "SearchAction",
      target: `${BASE_URL}/?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export function SoftwareApplicationJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "GeTopFloor 3D Skyscraper",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, iOS, Android",
    url: BASE_URL,
    screenshot: `${BASE_URL}/og-image.png`,
    offers: {
      "@type": "Offer",
      price: "50",
      priceCurrency: "INR",
      description: "Starting placement tier to claim a floor on the skyscraper",
      availability: "https://schema.org/InStock",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      ratingCount: "184",
      bestRating: "5",
      worstRating: "1",
    },
    description:
      "A real-time 3D virtual skyscraper and directory allowing startups to claim floors, display branding, and drive high-intent visitor traffic.",
    featureList: [
      "Interactive 3D WebGL Skyscraper supporting unlimited customizable floors",
      "Dynamic priority ranking engine for Top Floor (#1) penthouse placement",
      "Automated instant fulfillment via secure payment gateway integration",
      "Zero-login verified placement tied directly to company domain",
      "Categorized startup discovery across 27+ industry categories",
      "Responsive navigation optimized for mobile touch and desktop trackpads",
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export function FAQJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is GeTopFloor?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "GeTopFloor is an interactive 3D virtual skyscraper and digital discovery platform. Companies and founders claim floors on the tower to gain visibility, backlinks, and exposure to thousands of founders, investors, and tech enthusiasts worldwide.",
        },
      },
      {
        "@type": "Question",
        name: "How does the floor ranking system work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The skyscraper dynamically scales to hold active floors. Floor rankings are calculated in real time ordered by total contribution amount, with the leading company featured at the Penthouse Top Floor (#1).",
        },
      },
      {
        "@type": "Question",
        name: "What is the minimum amount to claim a floor?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The minimum entry amount starts at ₹50 INR. Founders can customize their placement amount before proceeding to secure checkout.",
        },
      },
      {
        "@type": "Question",
        name: "Can I update or delete my website details after claiming a floor?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes! Founders can request listing updates or voluntary removal anytime by emailing support@getopfloor.com from their company domain email, processed within 24–48 hours.",
        },
      },
      {
        "@type": "Question",
        name: "How quickly is my website placed on the skyscraper after payment?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Fulfillment is instant and fully automated. As soon as your payment succeeds, your company is immediately placed on the skyscraper and visible to all global visitors.",
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}