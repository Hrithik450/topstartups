import { FloorsModel } from "@/actions/floors/floors.model";
import { type Floor, type NewFloor } from "./schema";
import { ClaimFloorInput, UpdateFloorInput } from "@/actions/floors/floors.types";

export type { Floor, NewFloor, ClaimFloorInput, UpdateFloorInput };

export const getActiveFloors = FloorsModel.getActiveFloors;
export const initializeFloorsIfEmpty = FloorsModel.initializeFloorsIfEmpty;
export const claimTopFloorTransactional = FloorsModel.claimTopFloor;
export const getFloorsByEmail = FloorsModel.getFloorsByEmail;
export const updateFloorByEmail = FloorsModel.updateFloor;
export const deleteFloorByEmail = FloorsModel.deleteFloor;
