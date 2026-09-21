import { InspirationClient } from "@/components/guides/InspirationClient";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Community guides and curated destinations; `?collection=` narrows the curated rows to a Discover collection. */
export default async function InspirationPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const collection = typeof params.collection === "string" ? params.collection : undefined;
  return <InspirationClient collection={collection} />;
}
