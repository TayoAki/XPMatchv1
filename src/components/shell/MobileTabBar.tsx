"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { Bell, BookOpen, Briefcase, Bug, Compass, Heart, LogOut, MoreHorizontal, Search, ShieldCheck, SlidersHorizontal, Sparkles, SquarePlus, X } from "lucide-react";
import { useTravelStore, firstName } from "@/lib/store";
import { useUiState } from "@/components/providers/UiState";

const TABS = [
  { href: "/", label: "Discover", icon: Compass },
  { href: "/trips", label: "Trips", icon: Briefcase },
  { href: "/saved", label: "Saved", icon: Heart },
  { href: "/chat", label: "Concierge", icon: Sparkles },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Phone navigation: the header keeps only the wordmark and the Create a trip pill below the md
 * breakpoint, so this bar carries Discover, Trips, Saved and the Concierge, and a More sheet with
 * the rest. Rendered under the page content, not fixed, so the chat composer always sits above it.
 */
export function MobileTabBar() {
  const pathname = usePathname();
  const { updates, profile, user, logout } = useTravelStore();
  const { openAssistant, openBugReport } = useUiState();
  const [moreOpen, setMoreOpen] = useState(false);
  const unread = updates.filter((u) => !u.read).length;
  const moreActive = ["/explore", "/updates", "/inspiration", "/guides", "/create", "/admin"].some((p) => pathname.startsWith(p));
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
    { href: "/explore", label: "Explore", icon: Search },
    { href: "/inspiration", label: "Inspiration", icon: BookOpen },
    { href: "/updates", label: "Updates", icon: Bell, badge: unread },
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
                className={clsx("flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors duration-200", active ? "text-brand" : "text-muted")}
              >
                <Icon className={clsx("h-[22px] w-[22px] transition-transform duration-300 ease-[var(--xp-ease)]", active && "-translate-y-0.5 scale-110")} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
                {tab.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className={clsx("relative flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium", moreActive ? "text-brand" : "text-muted")}
          >
            <MoreHorizontal className="h-[22px] w-[22px]" strokeWidth={moreActive ? 2.2 : 1.8} aria-hidden="true" />
            More
            {unread > 0 ? <span className="absolute right-[22%] top-2 h-2 w-2 rounded-full bg-error" aria-label={`${unread} unread updates`} /> : null}
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
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-[15px] font-semibold text-white">{initial}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-semibold">{name}</div>
                {handle ? <div className="truncate text-[12px] text-muted">{handle}</div> : null}
              </div>
              <button type="button" onClick={() => setMoreOpen(false)} aria-label="Close" className="rounded-full p-2 text-neutral-600 hover:bg-surface">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <ul className="px-2">
              {moreLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link href={item.href} onClick={close} className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-[15px] font-medium hover:bg-surface">
                      <Icon className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
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
                  <SlidersHorizontal className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" /> Update my assistant
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
                  <Bug className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" /> Report a bug
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    void logout();
                  }}
                  className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] font-medium text-error hover:bg-surface"
                >
                  <LogOut className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" /> Log out
                </button>
              </li>
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
