import { CreateClient } from "@/components/guides/CreateClient";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CreatePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const guideId = typeof params.guide === "string" && params.guide ? params.guide : undefined;
  return <CreateClient guideId={guideId} />;
}
