import Experience from "@/components/Experience";
import { getCachedActiveFloors } from "@/lib/db/floors";
import { getAllFloorLocks } from "@/lib/db/locks";

export const dynamic = "force-dynamic";

function safeIso(val: any): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "string") return val;
  try {
    return new Date(val).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function safeIsoOrNull(val: any): string | null {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "string") return val;
  try {
    return new Date(val).toISOString();
  } catch {
    return null;
  }
}

export default async function Page() {
  try {
    const [floors, locks] = await Promise.all([
      getCachedActiveFloors().catch(() => []),
      getAllFloorLocks().catch(() => ({})),
    ]);

    const serializedFloors = (Array.isArray(floors) ? floors : []).map((f) => ({
      ...f,
      createdAt: safeIso(f.createdAt),
      updatedAt: safeIso(f.updatedAt),
      claimedAt: safeIsoOrNull(f.claimedAt),
    }));

    return <Experience initialFloors={serializedFloors} initialLocks={locks || {}} />;
  } catch (err) {
    console.error("Error rendering Page:", err);
    return <Experience initialFloors={[]} initialLocks={{}} />;
  }
}
