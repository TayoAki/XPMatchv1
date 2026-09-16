import { TripPage } from "@/components/trips/TripPage";

export default async function TripDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TripPage tripId={id} />;
}
