import { create } from "zustand";
import { useUserStore } from "./user-store";
import { devtools } from "zustand/middleware";
import type { Floor, NewFloor } from "@/lib/db/config/schema";
import { extractRootHostname } from "@/lib/validation/domain";

export interface FloorStore {
  floors: Floor[];
  ownedFloors: Floor[];
  isFloorsReady: boolean;

  // Direct Setters
  setFloors: (floors: Floor[]) => void;
  setOwnedFloors: (floors: Floor[]) => void;
  setIsFloorsReady: (isReady: boolean) => void;

  // Ownership Check
  isOwnerOfFloor: (floorIdOrRank: string) => boolean;

  // Mutations
  addNewFloor: (newFloor: NewFloor) => void;
}

export const useFloorsStore = create<FloorStore>()(
  devtools((set, get) => ({
    floors: [],
    ownedFloors: [],
    isFloorsReady: false,

    setFloors: (input) => {
      if (!Array.isArray(input)) return;
      set({
        floors: input,
        isFloorsReady: true,
      });
    },

    setOwnedFloors: (floors) => {
      set({ ownedFloors: Array.isArray(floors) ? floors : [] });
    },

    setIsFloorsReady: (isReady) => {
      set({ isFloorsReady: isReady });
    },

    isOwnerOfFloor: (floorId: string) => {
      const { ownedFloors } = get();
      const currentUser = useUserStore.getState().user;
      if (!currentUser || ownedFloors.length === 0) return false;
      return ownedFloors.some((f) => String(f.id) === floorId);
    },

    addNewFloor: (newFloor: NewFloor) => {
      const currentFloors = get().floors;
      const currentOwned = get().ownedFloors;
      const currentUser = useUserStore.getState().user;

      const newHost = extractRootHostname(newFloor.companyUrl || "");
      const newId = newFloor.id ? String(newFloor.id) : null;

      // 1. Check if floor already exists in the skyscraper (by id or canonical hostname)
      const existingIndex = currentFloors.findIndex(
        (f) =>
          (newId && String(f.id) === newId) ||
          (newHost && extractRootHostname(f.companyUrl || "") === newHost)
      );

      let targetFloor: Floor;
      let nextFloors: Floor[];

      if (existingIndex !== -1) {
        // UPDATE EXISTING FLOOR IN PLACE
        const existing = currentFloors[existingIndex];
        const incomingPrice = Number(newFloor.pricePaid || 0);

        // If incoming price is already cumulative (greater than existing), use it; otherwise add to existing
        const finalPrice =
          incomingPrice > Number(existing.pricePaid || 0)
            ? incomingPrice
            : Number(existing.pricePaid || 0) + incomingPrice;

        targetFloor = {
          ...existing,
          companyName: newFloor.companyName || existing.companyName,
          companyUrl: newFloor.companyUrl || existing.companyUrl,
          category: newFloor.category || existing.category,
          tagline: newFloor.tagline || existing.tagline,
          description: newFloor.description || existing.description,
          logoUrl: newFloor.logoUrl !== undefined ? newFloor.logoUrl : existing.logoUrl,
          pricePaid: finalPrice,
          userEmail: newFloor.userEmail || existing.userEmail,
          userId: newFloor.userId || existing.userId,
          claimedAt: new Date(),
          updatedAt: new Date(),
        };

        nextFloors = [...currentFloors];
        nextFloors[existingIndex] = targetFloor;
      } else {
        targetFloor = {
          id: String(newFloor.id || "temp-" + Date.now()),
          rank: 1,
          companyName: newFloor.companyName,
          companyUrl: newFloor.companyUrl,
          category: newFloor.category || "Startup",
          tagline: newFloor.tagline || newFloor.description || "",
          description: newFloor.description || newFloor.tagline || "",
          logoUrl: newFloor.logoUrl || null,
          pricePaid: Number(newFloor.pricePaid || 0),
          userEmail: newFloor.userEmail || null,
          userId: newFloor.userId || null,
          claimedAt: newFloor.claimedAt ? new Date(newFloor.claimedAt) : new Date(),
          updatedAt: new Date(),
        };

        nextFloors = [targetFloor, ...currentFloors];
      }

      // 2. Re-sort dynamically by pricePaid DESC, claimedAt ASC (unlimited skyscraper)
      const sortedFloors = nextFloors
        .sort((a, b) => {
          const pDiff = Number(b.pricePaid || 0) - Number(a.pricePaid || 0);
          if (pDiff !== 0) return pDiff;
          return new Date(a.claimedAt || 0).getTime() - new Date(b.claimedAt || 0).getTime();
        })
        .map((f, idx) => ({
          ...f,
          rank: idx + 1,
        }));

      // 3. Update ownedFloors in-place if owned by current user
      let updatedOwned = currentOwned;
      const isOwnedByCurrent =
        (currentUser?.email && targetFloor.userEmail === currentUser.email) ||
        (currentUser?.id && targetFloor.userId === currentUser.id);

      if (isOwnedByCurrent) {
        const ownedIndex = currentOwned.findIndex(
          (f) =>
            String(f.id) === String(targetFloor.id) ||
            (newHost && extractRootHostname(f.companyUrl || "") === newHost)
        );

        if (ownedIndex !== -1) {
          updatedOwned = [...currentOwned];
          updatedOwned[ownedIndex] = targetFloor;
        } else {
          updatedOwned = [targetFloor, ...currentOwned];
        }
      }

      set({
        floors: sortedFloors,
        ownedFloors: updatedOwned,
        isFloorsReady: true,
      });
    },
  }))
);
