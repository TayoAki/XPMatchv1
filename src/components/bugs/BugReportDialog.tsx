"use client";

import { useState, type FormEvent } from "react";
import clsx from "clsx";
import { Bug, Check } from "lucide-react";
import { ApiError } from "@/lib/api";
import { BUG_SEVERITIES, SCREENSHOT_MAX_BYTES, SCREENSHOT_MAX_EDGE, type BugReport, type BugSeverity } from "@/lib/bugs/types";
import { useMapView } from "@/lib/map-store";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, TextArea } from "@/components/ui/Field";
import { useUiState } from "@/components/providers/UiState";

/** Downscales a screenshot in the browser (longest edge 1280 px, JPEG) so reports stay small. */
export async function downscaleImage(file: File): Promise<Blob> {
  if (typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, SCREENSHOT_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
    return blob ?? file;
  } catch {
    return file;
  }
}

export function BugReportDialog() {
  const { bugReportOpen, closeBugReport } = useUiState();
  return bugReportOpen ? <BugReportForm onClose={closeBugReport} /> : null;
}

function BugReportForm({ onClose }: { onClose: () => void }) {
  const { threadId } = useMapView();
  const [body, setBody] = useState("");
  const [expected, setExpected] = useState("");
  const [severity, setSeverity] = useState<BugSeverity>("broken");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<BugReport | null>(null);
  const page = typeof window !== "undefined" ? window.location.pathname + window.location.search : "";
  const browser = typeof navigator !== "undefined" ? navigator.userAgent : "";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const text = body.trim();
    if (text.length < 3) {
      setError("Tell us what happened in a few words.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      const title = text.split("\n")[0].slice(0, 120);
      form.append("payload", JSON.stringify({ title, body: text, expected: expected.trim(), severity, page, threadId: threadId ?? undefined, userAgent: browser }));
      if (file) {
        const blob = await downscaleImage(file);
        if (blob.size > SCREENSHOT_MAX_BYTES) throw new ApiError(413, "That screenshot is still too large; crop it and try again.");
        form.append("screenshot", blob, blob.type === "image/jpeg" ? "screenshot.jpg" : file.name);
      }
      const res = await fetch("/api/bugs", { method: "POST", body: form, credentials: "same-origin" });
      if (!res.ok) {
        let message = res.statusText;
        try {
          const data = (await res.json()) as { error?: string };
          if (data.error) message = data.error;
        } catch {
          // keep statusText
        }
        throw new ApiError(res.status, message);
      }
      const data = (await res.json()) as { report: BugReport };
      setDone(data.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the report");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <Modal open onClose={onClose} title="Thanks — logged" description="The team sees it under Admin with the page you were on.">
        <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-[14px] text-emerald-900" data-testid="bug-report-done">
          <Check className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <div className="font-semibold">Report #{done.id.slice(0, 8)} sent</div>
            <div className="mt-0.5 text-[13px]">
              {BUG_SEVERITIES.find((s) => s.value === done.severity)?.label} · {done.title}
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Report a bug"
      description="A screenshot helps most. The page you're on, the current chat and your browser are attached automatically."
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] text-red-600" role={error ? "alert" : undefined}>
            {error}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" form="bug-report-form" disabled={busy}>
              <Bug className="h-4 w-4" /> {busy ? "Sending…" : "Send report"}
            </Button>
          </div>
        </div>
      }
    >
      <form id="bug-report-form" onSubmit={submit} className="grid gap-4">
        <div>
          <div className="mb-2 text-[13px] font-medium">What kind of thing is it?</div>
          <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label="Severity">
            {BUG_SEVERITIES.map((s) => (
              <button
                key={s.value}
                type="button"
                aria-pressed={severity === s.value}
                onClick={() => setSeverity(s.value)}
                className={clsx("rounded-2xl border px-3 py-2.5 text-left transition-colors", severity === s.value ? "border-brand bg-brand text-white" : "border-border bg-white hover:bg-surface")}
              >
                <span className="block text-[13px] font-semibold">{s.label}</span>
                <span className={clsx("block text-[12px]", severity === s.value ? "text-white/80" : "text-muted")}>{s.hint}</span>
              </button>
            ))}
          </div>
        </div>
        <Field label="What happened?">
          <TextArea value={body} onChange={(e) => setBody(e.target.value)} placeholder="I clicked Add to trip on the Colosseum card and nothing happened." aria-label="What happened" rows={4} autoFocus />
        </Field>
        <Field label="What did you expect?" hint="Optional">
          <TextArea value={expected} onChange={(e) => setExpected(e.target.value)} placeholder="The trip picker should open." aria-label="What you expected" rows={2} />
        </Field>
        <label className="grid gap-1 text-[13px] font-medium">
          Screenshot (optional)
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            aria-label="Screenshot"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-[13px] text-neutral-700 file:mr-3 file:rounded-full file:border file:border-border file:bg-white file:px-3 file:py-1.5 file:text-[13px] file:font-medium hover:file:bg-surface"
          />
          <span className="text-[12px] font-normal text-muted">Resized in your browser before sending.</span>
        </label>
        <dl className="grid gap-1 rounded-2xl bg-surface/70 p-3 text-[12px] text-muted" data-testid="bug-context">
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 font-medium text-neutral-700">Page</dt>
            <dd className="truncate">{page || "—"}</dd>
          </div>
          {threadId ? (
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 font-medium text-neutral-700">Chat</dt>
              <dd className="truncate">{threadId}</dd>
            </div>
          ) : null}
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 font-medium text-neutral-700">Browser</dt>
            <dd className="truncate">{browser || "—"}</dd>
          </div>
        </dl>
      </form>
    </Modal>
  );
}
