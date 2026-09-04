import { Main } from "@/components/main";
import { FloorsService } from "@/actions/floors/floors.service";

export const dynamic = "force-dynamic";

export default async function Page() {
  const res = await FloorsService.getFloors();
  const initialFloors = res?.success && res?.data ? res.data : [];

  return <Main initialFloors={initialFloors} />;
}
