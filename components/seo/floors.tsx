import type { Floor } from "@/lib/db/config/schema";

interface FloorsDirectorySeoProps {
  floors: Floor[];
}

/**
 * Server-rendered Semantic SEO Directory & Schema.org Structured Data
 * Pre-rendered on the server so search engine crawlers (Googlebot, Bingbot)
 * index all startup floors, categories, descriptions, and direct backlinks.
 * Invisible to sighted users via .sr-only.
 */
export function FloorsDirectorySeo({ floors = [] }: FloorsDirectorySeoProps) {
  if (!floors || floors.length === 0) return null;

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "GeTopFloor 3D Skyscraper Startup Leaderboard",
    description:
      "Ranked directory of startups, founders, and companies claiming floors on the GeTopFloor virtual skyscraper.",
    numberOfItems: floors.length,
    itemListElement: floors.map((f, idx) => ({
      "@type": "ListItem",
      position: f.rank || idx + 1,
      name: `${f.companyName || f.companyUrl} (Floor #${f.rank || idx + 1} · ₹${f.pricePaid || 0})`,
      url: f.companyUrl,
      description: `${f.description || f.tagline || `Claimed floor #${f.rank || idx + 1} on GeTopFloor skyscraper.`} Winning bid: ₹${f.pricePaid || 0} INR.`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />

      <section className="sr-only" aria-label="GeTopFloor Skyscraper Directory & Company Listings">
        <h2>GeTopFloor — Internet&apos;s Tallest 3D Startup Skyscraper</h2>
        <p>
          A real-time attention market and virtual skyscraper where startups and founders claim
          floors to outbid competitors, showcase their products, and reach thousands of global
          investors.
        </p>

        <ol>
          {floors.map((floor, idx) => {
            const rank = floor.rank || idx + 1;
            const displayName = floor.companyName || floor.companyUrl;
            return (
              <li key={floor.id || idx}>
                <h3>
                  Floor #{rank}: {displayName} — Claimed for ₹{floor.pricePaid || 0}
                </h3>
                <p>Winning Bid: ₹{floor.pricePaid || 0} INR</p>
                {floor.category && <p>Category: {floor.category}</p>}
                {floor.tagline && <p>Tagline: {floor.tagline}</p>}
                {floor.description && <p>Description: {floor.description}</p>}
                {floor.companyUrl && (
                  <a href={floor.companyUrl} rel="noopener noreferrer">
                    Visit {displayName} ({floor.companyUrl})
                  </a>
                )}
              </li>
            );
          })}
        </ol>
      </section>
    </>
  );
}
