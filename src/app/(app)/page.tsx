import { redirect } from "next/navigation";
import { DiscoverPage } from "@/components/discover/DiscoverPage";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const str = (v: string | string[] | undefined): string | undefined => (typeof v === "string" && v ? v : undefined);

/** Home is Discover. Chat links from before the redesign (`/?thread=`, `/?prompt=`, `/?trip=`) keep working by redirecting to `/chat`. */
export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const carried = new URLSearchParams();
  for (const key of ["thread", "prompt", "trip"]) {
    const value = str(params[key]);
    if (value) carried.set(key, value);
  }
  if (carried.size) redirect(`/chat?${carried.toString()}`);
  return <DiscoverPage />;
}
