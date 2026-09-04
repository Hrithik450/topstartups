/**
 * Dynamic virtual skyscraper height calculation based on number of stories/floors:
 * - Base lobby / entrance foundation: 35 ft
 * - Story / floor pitch: 14 ft per floor
 * - Penthouse roof crown & helipad: 16 ft
 */
export interface LiveStatsData {
  online: number;
  heightFt: number;
  claimedFloors: number;
  totalFloors: number;
  totalViews: number;
  countriesCount: number;
}

export function calculateTowerHeightFt(floorCount: number): number {
  const count = Number(floorCount) || 0;
  if (count <= 0) return 35;
  return 35 + count * 14 + 16;
}
