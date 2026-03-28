import { notFound } from "next/navigation";
import { PublicActivityPage } from "@/components/public-activity-page";
import { getPublicActivity } from "@/lib/public-activities";

export const dynamic = "force-dynamic";

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ activityId: string }>;
}) {
  const { activityId } = await params;
  const id = Number(activityId);

  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const activity = await getPublicActivity(id).catch(() => null);

  if (!activity) {
    notFound();
  }

  return <PublicActivityPage activity={activity} />;
}
