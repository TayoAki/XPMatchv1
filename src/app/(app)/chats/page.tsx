import { redirect } from "next/navigation";

/** The chat list lives in the Recent menu on the concierge page; keep old links working. */
export default function ChatsPage() {
  redirect("/chat");
}
