import Experience from "@/components/Experience";
import { getCachedActiveFloors } from "@/lib/db/floors";
import { getAllFloorLocks } from "@/lib/db/locks";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [floors, locks] = await Promise.all([
    getCachedActiveFloors().catch(() => []),
    getAllFloorLocks().catch(() => ({})),
  ]);

  const serializedFloors = (floors || []).map((f) => ({
    ...f,
    createdAt: f.createdAt ? f.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: f.updatedAt ? f.updatedAt.toISOString() : new Date().toISOString(),
    claimedAt: f.claimedAt ? f.claimedAt.toISOString() : null,
  }));

  return <Experience initialFloors={serializedFloors} initialLocks={locks || {}} />;
}
