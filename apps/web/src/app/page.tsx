import { HomePageContent } from "@/components/home-page-content";
import { listPublicTrips } from "@/lib/public-trips";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const trips = await listPublicTrips().catch(() => []);
  return <HomePageContent trips={trips} />;
}
