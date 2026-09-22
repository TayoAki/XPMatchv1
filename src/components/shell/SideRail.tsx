"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { Bell, BookOpen, Briefcase, ChevronDown, Heart, MessageCircle, PanelLeftClose, PanelLeftOpen, Plus, Search, ShieldCheck, SquarePlus, Trash2, type LucideIcon } from "lucide-react";
import { useTravelStore } from "@/lib/store";
import { useMapView } from "@/lib/map-store";
import { useChatsExpanded, useRailCollapsed } from "@/lib/ui-prefs";
import { useUiState } from "@/components/providers/UiState";

const NAV: { href: string; label: string; icon: LucideIcon; badge?: "updates" }[] = [
  { href: "/chat", label: "Chats", icon: MessageCircle },
  { href: "/trips", label: "Trips", icon: Briefcase },
  { href: "/explore", label: "Explore", icon: Search },
  { href: "/saved", label: "Saved", icon: Heart },
  { href: "/updates", label: "Updates", icon: Bell, badge: "updates" },
  { href: "/inspiration", label: "Inspiration", icon: BookOpen },
  { href: "/create", label: "Create", icon: SquarePlus },
];

const INITIAL_CHATS = 8;

function isActive(pathname: string, href: string): boolean {
  if (href === "/inspiration") return pathname.startsWith("/inspiration") || pathname.startsWith("/guides");
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The conversation list under Chats: newest first, trip labels, remove on hover, Show all. */
function ChatHistory({ collapsed }: { collapsed: boolean }) {
  const { chats, trips, removeChat } = useTravelStore();
  const { threadId } = useMapView();
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? chats : chats.slice(0, INITIAL_CHATS);
  if (collapsed) return null;
  return (
    <div className="mb-1 ml-[22px] border-l border-border pl-2" data-testid="chat-nav-list">
      {chats.length === 0 ? <p className="px-2 py-1.5 text-[12px] text-muted">No conversations yet.</p> : null}
      <ul className="grid gap-0.5">
        {visible.map((c) => {
          const active = c.id === threadId;
          const trip = c.tripId ? trips.find((t) => t.id === c.tripId) : undefined;
          return (
            <li key={c.id} className="group relative">
              <Link
                href={`/chat?thread=${encodeURIComponent(c.id)}`}
                aria-current={active ? "page" : undefined}
                title={c.title}
                className={clsx("block rounded-lg px-2 py-1.5 pr-7 text-[13px] leading-snug transition-colors duration-150", active ? "bg-brand-soft font-semibold text-brand" : "text-neutral-700 hover:bg-surface")}
              >
                <span className="block truncate">{c.title}</span>
                {trip ? (
                  <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted">
                    <Briefcase className="h-3 w-3 shrink-0" aria-hidden="true" /> {trip.title}
                  </span>
                ) : null}
              </Link>
              <button
                type="button"
                onClick={() => removeChat(c.id)}
                aria-label={`Remove ${c.title}`}
                className="absolute right-1 top-1.5 rounded-full p-1 text-neutral-400 opacity-0 transition-opacity hover:bg-white hover:text-error focus:opacity-100 group-hover:opacity-100"
              >
                <Trash2 className="h-3 w-3" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
      {chats.length > INITIAL_CHATS ? (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-0.5 px-2 py-1 text-[12px] font-medium text-neutral-600 hover:underline">
          {showAll ? "Show fewer" : `Show all ${chats.length}`}
        </button>
      ) : null}
    </div>
  );
}

/**
 * The left rail on every page but Discover (tablet and up; phones use the tab bar): New chat,
 * the sections with the conversation history under Chats, and a collapse toggle that folds the
 * rail to icons. Width and labels animate; the choice is remembered per browser.
 */
export function SideRail() {
  const pathname = usePathname();
  const { updates, user } = useTravelStore();
  const { startNewChat } = useUiState();
  const [collapsed, setCollapsed] = useRailCollapsed();
  const [chatsExpanded, setChatsExpanded] = useChatsExpanded();
  const unread = updates.filter((u) => !u.read).length;
  const nav = user?.admin ? [...NAV, { href: "/admin", label: "Admin", icon: ShieldCheck }] : NAV;

  return (
    <aside
      className={clsx("hidden shrink-0 flex-col border-r border-border bg-white transition-[width] duration-300 ease-[cubic-bezier(.2,.8,.2,1)] md:flex", collapsed ? "w-[68px]" : "w-[236px]")}
      data-testid="side-rail"
      data-collapsed={collapsed || undefined}
    >
      <div className={clsx("flex items-center pt-3", collapsed ? "justify-center px-2" : "px-3")}>
        <button
          type="button"
          onClick={startNewChat}
          title="New chat"
          className={clsx(
            "flex h-10 items-center gap-2 rounded-full bg-brand text-[14px] font-medium text-white shadow-sm transition-all duration-200 hover:bg-brand-hover hover:shadow-md active:scale-[0.98]",
            collapsed ? "w-10 justify-center" : "w-full justify-center px-4",
          )}
        >
          <Plus className="h-4 w-4 shrink-0" strokeWidth={2.4} aria-hidden="true" />
          {collapsed ? <span className="sr-only">New chat</span> : <span className="whitespace-nowrap">New chat</span>}
        </button>
      </div>

      <nav aria-label="Sections" className={clsx("xp-scroll mt-4 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden", collapsed ? "px-2" : "px-3")}>
        {nav.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          const badge = item.badge === "updates" ? unread : 0;
          const isChats = item.href === "/chat";
          return (
            <div key={item.href}>
              <div className={clsx("relative flex items-center rounded-xl transition-colors duration-150", active ? "bg-brand-soft" : "hover:bg-surface")}>
                {active ? <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand" aria-hidden="true" /> : null}
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? item.label : undefined}
                  className={clsx("flex h-11 min-w-0 flex-1 items-center gap-3 text-[14px] font-medium", collapsed ? "justify-center px-0" : "px-3", active ? "text-brand" : "text-foreground")}
                >
                  <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.1 : 1.8} aria-hidden="true" />
                  {collapsed ? (
                    <span className="sr-only">{item.label}</span>
                  ) : (
                    <>
                      <span className="flex-1 truncate">{item.label}</span>
                      {badge > 0 ? <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-white">{badge}</span> : null}
                    </>
                  )}
                  {collapsed && badge > 0 ? <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand" aria-hidden="true" /> : null}
                </Link>
                {isChats && !collapsed ? (
                  <button
                    type="button"
                    onClick={() => setChatsExpanded(!chatsExpanded)}
                    aria-label={chatsExpanded ? "Collapse chats" : "Expand chats"}
                    aria-expanded={chatsExpanded}
                    className="mr-1 rounded-full p-1.5 text-neutral-500 transition-colors hover:bg-white hover:text-foreground"
                  >
                    <ChevronDown className={clsx("h-4 w-4 transition-transform duration-200", chatsExpanded && "rotate-180")} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
              {isChats && chatsExpanded ? <ChatHistory collapsed={collapsed} /> : null}
            </div>
          );
        })}
      </nav>

      <div className={clsx("border-t border-border py-2", collapsed ? "px-2" : "px-3")}>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          aria-expanded={!collapsed}
          className={clsx("flex h-10 items-center gap-3 rounded-xl text-[13px] font-medium text-muted transition-colors hover:bg-surface hover:text-foreground", collapsed ? "w-full justify-center" : "w-full px-3")}
        >
          {collapsed ? <PanelLeftOpen className="h-5 w-5" aria-hidden="true" /> : <PanelLeftClose className="h-5 w-5" aria-hidden="true" />}
          {collapsed ? null : <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
