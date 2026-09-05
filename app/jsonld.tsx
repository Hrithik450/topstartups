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
      "Claim the top floor of the internet's tallest virtual tower. Outbid competitors and put your company in front of global founders and investors.",
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
      description: "Minimum starting bid to claim a floor on the skyscraper",
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
      "A real-time attention market and 3D virtual skyscraper allowing startups to claim floors, display branding, and drive high-intent visitor traffic.",
    featureList: [
      "Interactive 3D WebGL Skyscraper with 50 customizable floors",
      "Real-time outbid auction engine for Top Floor (#1) penthouse placement",
      "Automated instant fulfillment via secure Dodo Payments integration",
      "Self-service management portal for floor owners to edit URL, logo, and copy",
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
          text: "GeTopFloor is an interactive 3D virtual skyscraper and digital advertising platform. Companies and founders claim floors on the tower to gain visibility, backlinks, and exposure to thousands of founders, investors, and tech enthusiasts worldwide.",
        },
      },
      {
        "@type": "Question",
        name: "How does the outbid system work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The skyscraper holds 50 active floors. Anyone can place a bid starting from ₹50 INR to claim the Penthouse Top Floor (#1). When a new company claims Floor #1, all existing claimed floors automatically shift down one level, maintaining a live, competitive attention market.",
        },
      },
      {
        "@type": "Question",
        name: "What is the minimum amount to claim a floor?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The minimum bid amount starts at ₹50 INR. Founders can outbid the current price by adjusting the price stepper before proceeding to secure checkout.",
        },
      },
      {
        "@type": "Question",
        name: "Can I update or delete my website details after claiming a floor?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes! Every claim generates a secure, private management token. You can click 'Manage' on your floor card to edit your company name, website URL, industry category, tagline, description, or logo, or choose to vacate the floor anytime.",
        },
      },
      {
        "@type": "Question",
        name: "How quickly is my website placed on the skyscraper after payment?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Fulfillment is instant and fully automated. As soon as your payment succeeds via Dodo Payments, your company is immediately placed on Top Floor (#1) and visible to all global visitors.",
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