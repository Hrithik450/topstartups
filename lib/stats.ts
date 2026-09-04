/**
 * Dynamic virtual skyscraper height calculation based on number of stories/floors:
 * - Starts from 0 ft
 * - Each floor is 12 ft
 */
export interface LiveStatsData {
  online: number;
  heightFt: number;
  claimedFloors: number;
  totalFloors: number;
  totalViews: number;
  countriesCount: number;
  totalSales: number;
}

export function calculateTowerHeightFt(floorCount: number): number {
  const count = Number(floorCount) || 0;
  if (count <= 0) return 0;
  return count * 12;
}
