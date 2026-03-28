import { PublicTripsPage } from "@/components/public-trips-page";
import { listPublicTrips } from "@/lib/public-trips";

export const dynamic = "force-dynamic";

export default async function TripsPage() {
  let trips = [];

  try {
    trips = await listPublicTrips();
  } catch {
    trips = [];
  }

  return <PublicTripsPage trips={trips} />;
}
