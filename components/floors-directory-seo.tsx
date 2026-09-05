import type { Floor } from "@/lib/db/config/schema";
import { FloorsItemListJsonLd } from "@/app/jsonld";

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

  return (
    <>
      <FloorsItemListJsonLd floors={floors} />

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
                  Floor #{rank}: {displayName}
                </h3>
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
