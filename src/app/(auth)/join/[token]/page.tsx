import { JoinTrip } from "@/components/trips/JoinTrip";

export const metadata = { title: "Join a trip — XPMatch" };

export default async function JoinRoute({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <JoinTrip token={token} />;
}
