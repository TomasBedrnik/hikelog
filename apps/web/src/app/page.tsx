import { getHealth } from "@/lib/api";
import { HomePageContent } from "@/components/home-page-content";

export default async function HomePage() {
  const health = await getHealth();

  return <HomePageContent health={health} />;
}
