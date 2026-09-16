"use client";

import { useEffect, useState } from "react";
import { Camera, Sparkles } from "lucide-react";
import { ToolCallStatus } from "@copilotkit/core";
import type { ImportInspirationArgs, Streaming } from "@/lib/travel/schemas";
import type { ImportRecord } from "@/lib/import/types";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/chat/cards/shared";
import { ImportedPlacesCards } from "./ImportedPlacesCards";

interface ToolResult {
  importId?: string;
  error?: string;
  screenshot?: boolean;
}

function parseResult(result?: string): ToolResult {
  if (!result) return {};
  try {
    return JSON.parse(result) as ToolResult;
  } catch {
    return {};
  }
}

/**
 * Chat rendering of import_inspiration: the tool result carries only the
 * import id (the model gets names, not photos), so the card loads the stored
 * record, which also brings it back when a chat is reopened.
 */
export function ImportToolCard({ args, status, result }: { args: Partial<ImportInspirationArgs> | ImportInspirationArgs; status: ToolCallStatus; result?: string }) {
  const a = args as Streaming<ImportInspirationArgs>;
  const parsed = parseResult(result);
  const [record, setRecord] = useState<{ id: string; data: ImportRecord | null; error: string | null } | null>(null);
  const importId = parsed.importId;

  useEffect(() => {
    if (!importId) return;
    let active = true;
    api<{ import: ImportRecord }>(`/api/import/${encodeURIComponent(importId)}`)
      .then((res) => active && setRecord({ id: importId, data: res.import, error: null }))
      .catch((err: unknown) => active && setRecord({ id: importId, data: null, error: err instanceof Error ? err.message : "Could not load the import" }));
    return () => {
      active = false;
    };
  }, [importId]);

  if (status !== ToolCallStatus.Complete) {
    return (
      <div className="mt-2 rounded-2xl border border-border bg-surface/70 px-4 py-3 text-[13px]" data-testid="import-pending">
        <div className="flex items-center gap-2 font-semibold">
          <Sparkles className="h-4 w-4" /> Reading {a.url ? <span className="truncate text-neutral-700">{a.url}</span> : "the link"}…
        </div>
        <Skeleton className="mt-2 h-4 w-2/3" />
      </div>
    );
  }
  if (parsed.error) {
    return (
      <div className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900" data-testid="import-error">
        <div className="flex items-center gap-2 font-semibold">
          <Camera className="h-4 w-4" /> Could not import that link
        </div>
        <p className="mt-1">{parsed.error}</p>
      </div>
    );
  }
  const current = record && record.id === importId ? record : null;
  if (!importId || !current) return <Skeleton className="mt-2 h-24 w-full rounded-2xl" />;
  if (current.error || !current.data) return <p className="mt-2 text-[13px] text-red-600">{current.error ?? "Import not found"}</p>;
  return <ImportedPlacesCards record={current.data} />;
}
