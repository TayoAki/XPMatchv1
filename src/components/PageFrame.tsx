"use client";

import type { ReactNode } from "react";

/** Standard content page: title, optional serif description and actions, then the body; extra bottom room keeps the concierge launcher off the content. */
export function PageFrame({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="xp-scroll h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 pb-28 pt-8 lg:px-9">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-semibold tracking-[-0.03em]">{title}</h1>
            {description ? <p className="mt-1 font-serif text-[16px] text-muted">{description}</p> : null}
          </div>
          {actions}
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-border px-6 py-14 text-center">
      <div className="text-[17px] font-semibold">{title}</div>
      <p className="mx-auto mt-1 max-w-md text-[14px] text-muted">{body}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
