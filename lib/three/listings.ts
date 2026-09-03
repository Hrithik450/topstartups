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
 * 50 architectural floor slots for the 3D Skyscraper.
 */
export function createDefaultPlaceholderListings(): Listing[] {
  return Array.from({ length: 50 }, (_, i) => {
    const rank = i + 1;
    return {
      id: `floor-slot-${rank}`,
      url_or_handle: "https://getopfloor.com",
      title: `Open Floor #${rank}`,
      description: "Spot reserved for your startup — Outbid & claim top floor",
      category: "Available Floor",
      total_paid: 0,
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
