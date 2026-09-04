export interface LiveStatsData {
  online: number;
  heightFt: number;
  claimedFloors: number;
  totalFloors: number;
  totalViews: number;
  countriesCount: number;
  totalSales: number;
}

/**
 * Dynamic virtual skyscraper height calculation based on number of stories/floors:
 * - Starts from 0 ft
 * - Each floor is 12 ft
 */
export function calculateTowerHeightFt(floorCount: number): number {
  const count = Number(floorCount) || 0;
  if (count <= 0) return 0;
  return count * 12;
}

/**
 * Resolves an ISO 3166-1 alpha-2 country code to its official English name
 * using the built-in Intl.DisplayNames API.
 * Validates and discards bogus, private, or unassigned codes.
 */
export function getCanonicalCountry(
  code?: string | null
): { code: string; name: string } | null {
  if (!code || typeof code !== "string") return null;
  const clean = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(clean)) return null;

  // Discard reserved/unassigned/dummy test codes
  if (
    clean === "XX" ||
    clean === "ZZ" ||
    clean === "AA" ||
    clean === "QM" ||
    clean === "QZ" ||
    clean === "XA" ||
    clean === "XZ" ||
    clean === "T1"
  ) {
    return null;
  }

  try {
    const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
    const name = displayNames.of(clean);
    if (!name || name === clean || name.toLowerCase().includes("unknown")) {
      return null;
    }
    return { code: clean, name };
  } catch {
    return null;
  }
}

/**
 * Client-side browser country detection fallback:
 * 1. Checks Intl.Locale on navigator.languages / navigator.language
 * 2. Checks timezone mapping as a resilient backup
 */
export function getClientCountryGuess(): { code: string; name: string } | null {
  if (typeof window === "undefined") return null;

  try {
    // 1. Check navigator.languages / navigator.language via Intl.Locale
    const languages =
      navigator.languages && navigator.languages.length
        ? navigator.languages
        : [navigator.language];

    for (const lang of languages) {
      if (!lang) continue;
      try {
        const locale = new Intl.Locale(lang);
        if (locale.region) {
          const canonical = getCanonicalCountry(locale.region);
          if (canonical) return canonical;
        }
      } catch {}
    }

    // 2. Fallback: inspect resolved timezone
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (!tz) return null;

    if (tz.includes("Kolkata") || tz.includes("Calcutta") || tz.includes("India"))
      return getCanonicalCountry("IN");
    if (
      tz.includes("New_York") ||
      tz.includes("Los_Angeles") ||
      tz.includes("Chicago") ||
      tz.includes("Denver") ||
      tz.includes("Phoenix") ||
      tz.includes("America")
    )
      return getCanonicalCountry("US");
    if (tz.includes("London") || tz.includes("Europe/London")) return getCanonicalCountry("GB");
    if (tz.includes("Berlin") || tz.includes("Europe/Berlin")) return getCanonicalCountry("DE");
    if (tz.includes("Paris") || tz.includes("Europe/Paris")) return getCanonicalCountry("FR");
    if (tz.includes("Tokyo") || tz.includes("Asia/Tokyo")) return getCanonicalCountry("JP");
    if (tz.includes("Singapore") || tz.includes("Asia/Singapore")) return getCanonicalCountry("SG");
    if (tz.includes("Dubai") || tz.includes("Asia/Dubai")) return getCanonicalCountry("AE");
    if (tz.includes("Sydney") || tz.includes("Melbourne")) return getCanonicalCountry("AU");
    if (tz.includes("Toronto") || tz.includes("Vancouver")) return getCanonicalCountry("CA");
    if (tz.includes("Madrid")) return getCanonicalCountry("ES");
    if (tz.includes("Rome")) return getCanonicalCountry("IT");
    if (tz.includes("Amsterdam")) return getCanonicalCountry("NL");

    return null;
  } catch {
    return null;
  }
}
