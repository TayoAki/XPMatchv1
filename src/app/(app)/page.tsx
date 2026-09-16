import { HomeClient } from "@/components/HomeClient";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const str = (v: string | string[] | undefined): string | undefined => (typeof v === "string" && v ? v : undefined);

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  return <HomeClient threadId={str(params.thread)} initialPrompt={str(params.prompt)} tripId={str(params.trip)} />;
}
