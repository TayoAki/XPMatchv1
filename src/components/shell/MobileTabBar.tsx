"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { Bell, Briefcase, Bug, Compass, Heart, LogOut, MessageCircle, MoreHorizontal, Search, ShieldCheck, SlidersHorizontal, SquarePlus, X } from "lucide-react";
import { useTravelStore, firstName } from "@/lib/store";
import { useUiState } from "@/components/providers/UiState";

const TABS = [
  { href: "/", label: "Chat", icon: MessageCircle },
  { href: "/trips", label: "Trips", icon: Briefcase },
  { href: "/explore", label: "Explore", icon: Search },
  { href: "/saved", label: "Saved", icon: Heart },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Phone navigation: the sidebar is hidden below the md breakpoint, so this bar carries the
 * main destinations and a More sheet with the rest. Rendered under the page content, not fixed,
 * so the chat composer always sits above it.
 */
export function MobileTabBar() {
  const pathname = usePathname();
  const { updates, profile, user, logout } = useTravelStore();
  const { openAssistant, openBugReport } = useUiState();
  const [moreOpen, setMoreOpen] = useState(false);
  const unread = updates.filter((u) => !u.read).length;
  const moreActive = ["/updates", "/inspiration", "/guides", "/create", "/admin"].some((p) => pathname.startsWith(p));
  const close = () => setMoreOpen(false);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  const name = profile.name.trim() || user?.name || "Traveler";
  const initial = (firstName(profile) || user?.name || "T").charAt(0).toUpperCase();
  const handle = user ? `@${user.handle}` : "";

  const moreLinks = [
    { href: "/updates", label: "Updates", icon: Bell, badge: unread },
    { href: "/inspiration", label: "Inspiration", icon: Compass },
    { href: "/create", label: "Create", icon: SquarePlus },
    ...(user?.admin ? [{ href: "/admin", label: "Admin", icon: ShieldCheck }] : []),
  ];

  return (
    <>
      <nav aria-label="Main" data-testid="mobile-tab-bar" className="shrink-0 border-t border-border bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="grid grid-cols-5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={clsx("flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium", active ? "text-foreground" : "text-neutral-500")}
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.2 : 1.8} />
                {tab.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className={clsx("relative flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium", moreActive ? "text-foreground" : "text-neutral-500")}
          >
            <MoreHorizontal className="h-[22px] w-[22px]" strokeWidth={moreActive ? 2.2 : 1.8} />
            More
            {unread > 0 ? <span className="absolute right-[22%] top-2 h-2 w-2 rounded-full bg-red-500" aria-label={`${unread} unread updates`} /> : null}
          </button>
        </div>
      </nav>

      {moreOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/40 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="More"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setMoreOpen(false);
          }}
        >
          <div className="w-full rounded-t-3xl bg-white pb-[max(env(safe-area-inset-bottom),12px)] shadow-2xl" data-testid="more-sheet">
            <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-surface-2" aria-hidden="true" />
            <div className="flex items-center gap-3 px-5 pb-3 pt-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-[15px] font-semibold text-white">{initial}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-semibold">{name}</div>
                {handle ? <div className="truncate text-[12px] text-muted">{handle}</div> : null}
              </div>
              <button type="button" onClick={() => setMoreOpen(false)} aria-label="Close" className="rounded-full p-2 text-neutral-600 hover:bg-surface">
                <X className="h-5 w-5" />
              </button>
            </div>
            <ul className="px-2">
              {moreLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link href={item.href} onClick={close} className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-[15px] font-medium hover:bg-surface">
                      <Icon className="h-5 w-5" strokeWidth={1.9} />
                      <span className="flex-1">{item.label}</span>
                      {item.badge ? <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-neutral-700">{item.badge}</span> : null}
                    </Link>
                  </li>
                );
              })}
              <li className="my-1 border-t border-border" role="separator" />
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    openAssistant();
                  }}
                  className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] font-medium hover:bg-surface"
                >
                  <SlidersHorizontal className="h-5 w-5" strokeWidth={1.9} /> Update my assistant
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    openBugReport();
                  }}
                  className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] font-medium hover:bg-surface"
                >
                  <Bug className="h-5 w-5" strokeWidth={1.9} /> Report a bug
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    void logout();
                  }}
                  className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] font-medium text-red-600 hover:bg-surface"
                >
                  <LogOut className="h-5 w-5" strokeWidth={1.9} /> Log out
                </button>
              </li>
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
