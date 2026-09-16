import { HomeClient } from "@/components/HomeClient";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const threadId = typeof params.thread === "string" && params.thread ? params.thread : undefined;
  const initialPrompt = typeof params.prompt === "string" && params.prompt ? params.prompt : undefined;
  return <HomeClient threadId={threadId} initialPrompt={initialPrompt} />;
}
