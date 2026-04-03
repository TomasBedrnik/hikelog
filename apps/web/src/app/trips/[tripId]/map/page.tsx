import { notFound } from "next/navigation";
import { TripMapPage } from "@/components/trip-map-page";
import { listPublicTripActivities } from "@/lib/public-activities";
import { getPublicTrip } from "@/lib/public-trips";

export const dynamic = "force-dynamic";

export default async function TripMapRoute({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const id = Number(tripId);

  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const [trip, activities] = await Promise.all([
    getPublicTrip(id).catch(() => null),
    listPublicTripActivities(id).catch(() => []),
  ]);

  if (!trip) {
    notFound();
  }

  return <TripMapPage activities={activities} trip={trip} />;
}
