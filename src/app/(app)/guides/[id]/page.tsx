import { GuidePage } from "@/components/guides/GuidePage";

export default async function GuideRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GuidePage guideId={id} />;
}
