import type { ReactNode } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-[radial-gradient(circle_at_50%_0%,#e8fff6,#ffffff_55%)] px-4">
      <Link href="/login" className="mb-8 flex items-center gap-2" aria-label="XPMatch">
        <Sparkles className="h-6 w-6" strokeWidth={2.2} />
        <span className="text-[26px] font-bold tracking-tight">xpmatch.</span>
      </Link>
      <div className="w-full max-w-[420px] rounded-3xl border border-border bg-white p-8 shadow-xl">{children}</div>
      <p className="mt-6 max-w-sm text-center text-[12px] leading-relaxed text-muted">
        Your trips, saved places and guides are stored under your account. Recommendations use live map data; always
        double-check prices before booking.
      </p>
    </div>
  );
}
