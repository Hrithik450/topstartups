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
  return [];
}

export const INITIAL_LISTINGS: Listing[] = [];
