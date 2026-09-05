import { Main } from "@/components/main";
import { FloorsService } from "@/actions/floors/floors.service";
import { StatsService } from "@/actions/stats/stats.service";
import { Seo } from "@/components/seo/floors";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [floorsRes, statsRes] = await Promise.all([
    FloorsService.getFloors(),
    StatsService.getLiveStats(),
  ]);

  const initialFloors = floorsRes?.success && floorsRes?.data ? floorsRes.data : [];
  const initialStats = statsRes?.success && statsRes?.data ? statsRes.data : null;

  return (
    <>
      <Main initialFloors={initialFloors} initialStats={initialStats} />
      <Seo floors={initialFloors} stats={initialStats} />
    </>
  );
}
