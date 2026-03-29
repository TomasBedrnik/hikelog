import { HomePageContent } from "@/components/home-page-content";
import { getPublicGlobalContent } from "@/lib/public-global-content";
import { listPublicTrips } from "@/lib/public-trips";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [trips, globalContent] = await Promise.all([
    listPublicTrips().catch(() => []),
    getPublicGlobalContent().catch(() => null),
  ]);

  return <HomePageContent globalContent={globalContent} trips={trips} />;
}
