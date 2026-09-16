import { redirect } from "next/navigation";

/** The chat list now lives inside the chat experience (history rail); keep old links working. */
export default function ChatsPage() {
  redirect("/");
}
