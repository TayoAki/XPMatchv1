import { Suspense } from "react";
import { ResetForm } from "@/components/auth/ResetForm";

export const metadata = { title: "Set a new password — XPMatch" };

export default function ResetPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
