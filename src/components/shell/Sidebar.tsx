"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import {
  Bell,
  Briefcase,
  Bug,
  ChevronDown,
  Compass,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Search,
  ShieldCheck,
  Sparkles,
  SquarePlus,
  X,
} from "lucide-react";
import { useTravelStore, firstName } from "@/lib/store";
import { useChatsExpanded } from "@/lib/ui-prefs";
import { useUiState } from "@/components/providers/UiState";
import { ChatNavList } from "./ChatNavList";

const NAV = [
  { href: "/", label: "Chats", icon: MessageCircle, badge: "chats" as const },
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
  const { openAssistant, openBugReport, startNewChat } = useUiState();
  const nav = user?.admin ? [...NAV, { href: "/admin", label: "Admin", icon: ShieldCheck }] : NAV;
  const [chatsExpanded, setChatsExpanded] = useChatsExpanded();
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

      <nav className="xp-scroll mt-6 flex min-h-0 flex-col gap-0.5 overflow-y-auto">
        {nav.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(`${item.href}/`)) ||
            (item.href === "/inspiration" && pathname.startsWith("/guides"));
          const Icon = item.icon;
          const badge = "badge" in item ? (item.badge === "chats" ? chats.length : item.badge === "updates" ? unread : 0) : 0;
          const isChats = item.href === "/";
          return (
            <div key={item.href}>
              <div className={clsx("flex items-center rounded-xl transition-colors hover:bg-surface", isChats && chatsExpanded && "bg-surface/60")}>
                <Link
                  href={item.href}
                  onClick={isChats ? () => setChatsExpanded(true) : undefined}
                  className={clsx("flex h-11 min-w-0 flex-1 items-center gap-3 px-3 text-[15px] font-medium", active ? "text-foreground" : "text-neutral-800")}
                >
                  <Icon className="h-5 w-5 shrink-0" strokeWidth={1.9} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {badge > 0 ? <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-neutral-700">{badge}</span> : null}
                </Link>
                {isChats ? (
                  <button
                    type="button"
                    onClick={() => setChatsExpanded(!chatsExpanded)}
                    aria-label={chatsExpanded ? "Collapse chats" : "Expand chats"}
                    aria-expanded={chatsExpanded}
                    className="mr-1 rounded-full p-1.5 text-neutral-500 hover:bg-white hover:text-foreground"
                  >
                    <ChevronDown className={clsx("h-4 w-4 transition-transform", chatsExpanded && "rotate-180")} />
                  </button>
                ) : null}
              </div>
              {isChats && chatsExpanded ? <ChatNavList /> : null}
            </div>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={startNewChat}
        className="mt-5 h-11 w-full shrink-0 rounded-full bg-surface text-[15px] font-medium text-foreground transition-colors hover:bg-surface-2"
      >
        New chat
      </button>

      <div className="flex-1" />

      {!promoDismissed && !profile.onboarded ? (
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
        <button type="button" onClick={openBugReport} aria-label="Report a bug" title="Report a bug" className="rounded-full p-1.5 text-neutral-600 hover:bg-surface hover:text-foreground">
          <Bug className="h-5 w-5" />
        </button>
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
        <div>
          <a href="https://www.xpmatchme.com/terms-of-service" target="_blank" rel="noreferrer noopener" className="hover:underline">
            Terms
          </a>
          {" · "}
          <a href="https://www.xpmatchme.com/privacy-policy" target="_blank" rel="noreferrer noopener" className="hover:underline">
            Privacy
          </a>
        </div>
        <div className="mt-1">© {new Date().getFullYear()} XPMatch, Inc.</div>
      </div>
    </aside>
  );
}
