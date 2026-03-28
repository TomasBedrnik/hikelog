import { notFound } from "next/navigation";
import { TripMapPage } from "@/components/trip-map-page";
import { getPublicTrip } from "@/lib/public-trips";

export const dynamic = "force-dynamic";

export default async function TripMapRoute({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const id = Number(tripId);

  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const trip = await getPublicTrip(id).catch(() => null);

  if (!trip) {
    notFound();
  }

  return <TripMapPage trip={trip} />;
}
