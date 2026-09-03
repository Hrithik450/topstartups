export interface Listing {
  id: string;
  url_or_handle: string;
  title: string;
  description?: string | null;
  category?: string | null;
  total_paid: number;
  clicks?: number | null;
  created_at: string;
  updated_at?: string | null;
  last_bid_at?: string | null;
  cute_votes?: number | null;
  not_cute_votes?: number | null;
  image_url?: string | null;
  finish_token?: string | null;
  country_code?: string | null;
  country_name?: string | null;
  hiring?: boolean | null;
  views?: number | null;
  is_claimed?: boolean;
  rank?: number;
  [key: string]: any;
}

/**
 * 50 premium placeholder floors initially populated in the tower.
 * When founders bid/claim, their company takes Rank 1 (Top Penthouse)
 * and existing floors shift down seamlessly.
 */
export function createDefaultPlaceholderListings(): Listing[] {
  const TITLES = [
    "Penthouse Floor #1",
    "Skyline Suite #2",
    "Summit Level #3",
    "High Altitude Deck #4",
    "Executive Floor #5",
    "Venture Vista #6",
    "Sky Lounge Level #7",
    "Horizon Terrace #8",
    "Cloudview Floor #9",
    "Apex Studio #10",
  ];

  return Array.from({ length: 50 }, (_, i) => {
    const rank = i + 1;
    const price = 50 + (50 - rank); // Pricing ladder: Floor 50 = ₹50, Floor 1 = ₹99
    const title = rank <= 10 ? TITLES[rank - 1] : `Tower Floor #${rank}`;

    return {
      id: `floor-slot-${rank}`,
      url_or_handle: "https://getopfloor.com",
      title,
      description: "Spot reserved for your startup — Claim top floor",
      category: "Available Floor",
      total_paid: price,
      clicks: 0,
      created_at: new Date().toISOString(),
      is_claimed: false,
      rank,
      country_code: "IN",
      country_name: "India",
      hiring: false,
      views: 0,
    };
  });
}

export const INITIAL_LISTINGS: Listing[] = createDefaultPlaceholderListings();
