import { notFound } from "next/navigation";
import { PublicTripPage } from "@/components/public-trip-page";
import { listPublicTripActivities } from "@/lib/public-activities";
import { getPublicTrip, listPublicTrips } from "@/lib/public-trips";

export const dynamic = "force-dynamic";

export default async function TripPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const id = Number(tripId);

  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const [trip, trips, activities] = await Promise.all([
    getPublicTrip(id).catch(() => null),
    listPublicTrips().catch(() => []),
    listPublicTripActivities(id).catch(() => []),
  ]);

  if (!trip) {
    notFound();
  }

  return <PublicTripPage trip={trip} trips={trips} activities={activities} />;
}
