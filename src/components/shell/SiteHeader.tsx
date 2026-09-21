"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Bell, BookOpen, Bug, ChevronDown, LogOut, Plus, Search, ShieldCheck, SlidersHorizontal, Sparkles, SquarePlus } from "lucide-react";
import { firstName, useTravelStore } from "@/lib/store";
import { useUiState } from "@/components/providers/UiState";

const NAV = [
  { href: "/", label: "Discover" },
  { href: "/trips", label: "My trips" },
  { href: "/saved", label: "Saved" },
];

/** Discover covers the browsing pages too (Explore, Inspiration, a guide), so one link stays lit. */
function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/" || ["/explore", "/inspiration", "/guides"].some((p) => pathname.startsWith(p));
  return pathname === href || pathname.startsWith(`${href}/`);
}

function handleFor(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug ? `@${slug}` : "@traveler";
}

/** The brand mark: the sparkle and the wordmark, the only logo the app has. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <Link href="/" className={clsx("flex items-center gap-2 rounded-lg py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus", className)} aria-label="XPMatch home">
      <Sparkles className="h-5 w-5 text-brand" strokeWidth={2.2} aria-hidden="true" />
      <span className="text-[22px] font-bold tracking-tight text-foreground">xpmatch.</span>
    </Link>
  );
}

/**
 * The top header on every signed-in page: wordmark, Discover · My trips · Saved, the Updates bell,
 * the account menu (assistant settings, the browsing pages, admin, bug report, legal links, log out)
 * and the Create a trip pill. Phones keep the wordmark, the bell and the pill; the tab bar carries
 * navigation and the More sheet the account items.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const { updates, profile, user, logout } = useTravelStore();
  const { openAssistant, openBugReport, openPlanner } = useUiState();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const unread = updates.filter((u) => !u.read).length;
  const name = profile.name.trim() || user?.name || "Traveler";
  const first = firstName(profile) || user?.name?.split(" ")[0] || "Traveler";
  const initial = first.charAt(0).toUpperCase();
  const handle = user ? `@${user.handle}` : handleFor(profile.name);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const close = () => setMenuOpen(false);
  const menuLink = "flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] font-medium text-foreground hover:bg-surface";
  const menuButton = `${menuLink} w-full text-left`;

  return (
    <header className="z-40 grid h-16 shrink-0 grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-border bg-white px-4 sm:px-6 lg:grid-cols-[1fr_auto_1fr] lg:px-9" data-testid="site-header">
      <div className="flex min-w-0 items-center">
        <Wordmark />
      </div>

      <nav aria-label="Main" className="hidden items-center gap-0.5 justify-self-center md:flex lg:gap-1">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "relative flex h-10 items-center rounded-lg px-3.5 text-[14px] font-medium transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                active ? "text-foreground after:absolute after:inset-x-3.5 after:bottom-1 after:h-px after:bg-brand" : "text-muted",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex min-w-0 items-center justify-end gap-1 sm:gap-2">
        <Link
          href="/updates"
          aria-label={unread ? `Updates, ${unread} unread` : "Updates"}
          title="Updates"
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <Bell className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
          {unread > 0 ? (
            <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold leading-none text-white" aria-hidden="true">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Link>

        <div className="relative hidden md:block" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Account menu"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            className="flex h-11 items-center gap-2 rounded-full py-1 pl-1 pr-2.5 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-[13px] font-semibold text-white">{initial}</span>
            <span className="hidden max-w-[120px] truncate text-[14px] font-medium lg:inline">{first}</span>
            <ChevronDown className={clsx("h-4 w-4 text-muted transition-transform", menuOpen && "rotate-180")} aria-hidden="true" />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-12 z-50 w-64 rounded-2xl border border-border bg-white p-1.5 shadow-floating" aria-label="Account" data-testid="account-menu">
              <div className="flex items-center gap-3 px-3 pb-2 pt-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-[14px] font-semibold text-white">{initial}</span>
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold">{name}</span>
                  <span className="block truncate text-[12px] text-muted">{handle}</span>
                </span>
              </div>
              <div className="my-1 border-t border-border" />
              <button
                type="button"
                className={menuButton}
                onClick={() => {
                  close();
                  openAssistant();
                }}
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Update my assistant
              </button>
              <Link href="/inspiration" onClick={close} className={menuLink}>
                <BookOpen className="h-4 w-4" aria-hidden="true" /> Inspiration
              </Link>
              <Link href="/explore" onClick={close} className={menuLink}>
                <Search className="h-4 w-4" aria-hidden="true" /> Explore near you
              </Link>
              <Link href="/create" onClick={close} className={menuLink}>
                <SquarePlus className="h-4 w-4" aria-hidden="true" /> Create a guide
              </Link>
              {user?.admin ? (
                <Link href="/admin" onClick={close} className={menuLink}>
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Admin
                </Link>
              ) : null}
              <button
                type="button"
                className={menuButton}
                onClick={() => {
                  close();
                  openBugReport();
                }}
              >
                <Bug className="h-4 w-4" aria-hidden="true" /> Report a bug
              </button>
              <div className="my-1 border-t border-border" />
              <div className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-muted">
                <a href="https://www.xpmatchme.com/terms-of-service" target="_blank" rel="noreferrer noopener" className="hover:underline">
                  Terms
                </a>
                <span aria-hidden="true">·</span>
                <a href="https://www.xpmatchme.com/privacy-policy" target="_blank" rel="noreferrer noopener" className="hover:underline">
                  Privacy
                </a>
                <span className="ml-auto">© {new Date().getFullYear()} XPMatch</span>
              </div>
              <button
                type="button"
                className={clsx(menuButton, "text-error")}
                onClick={() => {
                  close();
                  void logout();
                }}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" /> Log out
              </button>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => openPlanner("where")}
          aria-label="Create a trip"
          className="ml-1 flex h-11 shrink-0 items-center gap-2 rounded-full bg-brand px-3 text-[15px] font-medium text-white transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:px-4 lg:px-5"
        >
          <Plus className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
          <span className="hidden sm:inline">Create a trip</span>
        </button>
      </div>
    </header>
  );
}
