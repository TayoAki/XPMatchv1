"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import {
  Bell,
  Briefcase,
  Compass,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Search,
  Sparkles,
  SquarePlus,
  X,
} from "lucide-react";
import { useTravelStore, firstName } from "@/lib/store";
import { useUiState } from "@/components/providers/UiState";

const NAV = [
  { href: "/chats", label: "Chats", icon: MessageCircle, badge: "chats" as const },
  { href: "/trips", label: "Trips", icon: Briefcase },
  { href: "/explore", label: "Explore", icon: Search },
  { href: "/saved", label: "Saved", icon: Heart },
  { href: "/updates", label: "Updates", icon: Bell, badge: "updates" as const },
  { href: "/inspiration", label: "Inspiration", icon: Compass },
  { href: "/create", label: "Create", icon: SquarePlus },
];

function handleFor(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug ? `@${slug}` : "@traveler";
}

export function Sidebar() {
  const pathname = usePathname();
  const { chats, updates, profile, user, logout } = useTravelStore();
  const { openAssistant, startNewChat } = useUiState();
  const [promoDismissed, setPromoDismissed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const unread = updates.filter((u) => !u.read).length;
  const name = profile.name.trim() || user?.name || "Traveler";
  const initial = (firstName(profile) || user?.name || "T").charAt(0).toUpperCase();
  const handle = user ? `@${user.handle}` : handleFor(profile.name);

  return (
    <aside className="hidden w-[236px] shrink-0 flex-col border-r border-border bg-white px-3 pb-3 pt-4 md:flex">
      <Link href="/" className="flex items-center gap-2 px-2 py-1" aria-label="XPMatch home">
        <Sparkles className="h-5 w-5" strokeWidth={2.2} />
        <span className="text-[22px] font-bold tracking-tight">xpmatch.</span>
      </Link>

      <nav className="mt-6 flex flex-col gap-0.5">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`) || (item.href === "/chats" && pathname === "/");
          const Icon = item.icon;
          const badge = item.badge === "chats" ? chats.length : item.badge === "updates" ? unread : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors hover:bg-surface",
                active ? "text-foreground" : "text-neutral-800",
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={1.9} />
              <span className="flex-1">{item.label}</span>
              {badge > 0 ? (
                <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-neutral-700">
                  {badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={startNewChat}
        className="mt-5 h-11 w-full rounded-full bg-surface text-[15px] font-medium text-foreground transition-colors hover:bg-surface-2"
      >
        New chat
      </button>

      <div className="flex-1" />

      {!promoDismissed ? (
        <div className="relative mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-teal-100 via-cyan-100 to-emerald-100 p-4">
          <button
            type="button"
            onClick={() => setPromoDismissed(true)}
            aria-label="Dismiss"
            className="absolute right-2 top-2 rounded-full p-1 text-neutral-500 hover:bg-white/60"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="text-[15px] font-semibold">Personalize your assistant</div>
          <p className="mt-1 text-[13px] leading-snug text-neutral-700">
            Tell XPMatch your travel style, budget and home city for sharper picks.
          </p>
          <button
            type="button"
            onClick={openAssistant}
            className="mt-2 text-[13px] font-semibold underline underline-offset-2"
          >
            Update preferences
          </button>
        </div>
      ) : null}

      <div className="relative flex items-center gap-3 px-1">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold">{name}</div>
          <div className="truncate text-xs text-muted">{handle}</div>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Account menu"
          className="rounded-full p-1.5 text-neutral-600 hover:bg-surface"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
        {menuOpen ? (
          <div className="absolute bottom-11 right-0 z-20 w-48 rounded-xl border border-border bg-white p-1 shadow-lg">
            <button
              type="button"
              className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface"
              onClick={() => {
                setMenuOpen(false);
                openAssistant();
              }}
            >
              Update my assistant
            </button>
            <button
              type="button"
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-surface"
              onClick={() => {
                setMenuOpen(false);
                void logout();
              }}
            >
              Log out
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-4 px-1 text-[11px] leading-relaxed text-muted">
        <div>Company · Contact · Help</div>
        <div>Terms · Privacy</div>
        <div className="mt-1">© {new Date().getFullYear()} XPMatch, Inc.</div>
      </div>
    </aside>
  );
}
