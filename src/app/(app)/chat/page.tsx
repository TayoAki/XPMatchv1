import { HomeClient } from "@/components/HomeClient";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const str = (v: string | string[] | undefined): string | undefined => (typeof v === "string" && v ? v : undefined);

/** The conversation: `?thread=` reopens a chat, `?prompt=` sends a message carried over from another page, `?trip=` scopes it to a trip. */
export default async function ChatPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  return <HomeClient threadId={str(params.thread)} initialPrompt={str(params.prompt)} tripId={str(params.trip)} />;
}
