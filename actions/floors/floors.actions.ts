"use server";

import {
  FloorsService,
  type TUpdateFloorSchema,
  type TClaimFloorSchema,
  type FloorResponse,
  type FloorsResponse,
  type DeleteFloorResponse,
  type ClaimResultResponse,
} from "./floors.service";

/**
 * Server action to fetch all active floors.
 */
export async function getFloorsAction(): Promise<FloorsResponse> {
  return await FloorsService.getFloors();
}

/**
 * Server action to get the top floor price.
 */
export async function getTopFloorPriceAction() {
  return await FloorsService.getTopFloorPrice();
}

/**
 * Server action to calculate outbid pricing for a host.
 */
export async function getOutbidPricingAction(cleanHost: string) {
  return await FloorsService.getOutbidPricing(cleanHost);
}

/**
 * Server action to fetch a floor by domain or URL.
 */
export async function getFloorByDomainAction(domainOrUrl: string): Promise<FloorResponse> {
  return await FloorsService.getFloorByDomain(domainOrUrl);
}

/**
 * Server action to fetch floors owned by an email (optional).
 */
export async function getFloorsByEmailAction(email: string): Promise<FloorsResponse> {
  return await FloorsService.getFloorsByEmail(email);
}

/**
 * Server action to get a floor by ID.
 */
export async function getFloorByIdAction(id: string): Promise<FloorResponse> {
  return await FloorsService.getFloorById(id);
}

/**
 * Server action to get a floor by rank.
 */
export async function getFloorByRankAction(rank: number): Promise<FloorResponse> {
  return await FloorsService.getFloorByRank(rank);
}

/**
 * Server action to update a floor.
 */
export async function updateFloorAction(
  data: TUpdateFloorSchema,
  email?: string | null
): Promise<FloorResponse> {
  return await FloorsService.updateFloor(data, email);
}

/**
 * Server action to vacate a floor.
 */
export async function deleteFloorAction(
  floorId: string,
  email?: string | null
): Promise<DeleteFloorResponse> {
  return await FloorsService.deleteFloor(floorId, email);
}

/**
 * Server action to claim the top floor.
 */
export async function claimTopFloorAction(data: TClaimFloorSchema): Promise<ClaimResultResponse> {
  return await FloorsService.claimTopFloor(data);
}
