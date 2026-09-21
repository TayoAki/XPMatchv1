"use client";

import { useState, type FormEvent } from "react";
import clsx from "clsx";
import { Camera, FileText, Link2, Sparkles, Ticket } from "lucide-react";
import { IMPORT_MAX_IMAGE_BYTES, screenshotOnlyHost, type ImportRecord } from "@/lib/import/types";
import type { Reservation } from "@/lib/reservations/types";
import { api, ApiError } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TextArea, TextInput } from "@/components/ui/Field";
import { useSendMessage } from "@/components/chat/useSendMessage";
import { ReservationCards } from "@/components/reservations/ReservationCards";
import { ImportedPlacesCards, importPrompt } from "./ImportedPlacesCards";

type Mode = "places" | "reservation";

async function upload<T>(path: string, field: string, file: File): Promise<T> {
  const form = new FormData();
  form.append(field, file);
  const res = await fetch(path, { method: "POST", body: form, credentials: "same-origin" });
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
  return (await res.json()) as T;
}

function hintFor(url: string): string | null {
  try {
    const host = screenshotOnlyHost(new URL(url.trim()).hostname);
    return host ? `${host} posts can't be read from a link. Take a screenshot of the post and upload it below instead.` : null;
  } catch {
    return null;
  }
}

const FILE_INPUT_CLASS =
  "block w-full text-[13px] text-neutral-700 file:mr-3 file:rounded-full file:border file:border-border file:bg-white file:px-3 file:py-1.5 file:text-[13px] file:font-medium hover:file:bg-surface";

/**
 * Two imports in one form. *Places from a post*: a link or a screenshot becomes
 * verified place cards. *A reservation*: a pasted confirmation, its PDF or a
 * screenshot becomes bookings with Add to trip. Used as a modal from the chat
 * composer and inline on the Create page.
 */
export function ImportForm({ onImported, onOpenChat }: { onImported?: (record: ImportRecord) => void; onOpenChat?: () => void }) {
  const send = useSendMessage();
  const [mode, setMode] = useState<Mode>("places");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportRecord | null>(null);
  const [reservations, setReservations] = useState<{ list: Reservation[]; source: string } | null>(null);
  const hint = hintFor(url);

  const reset = () => {
    setResult(null);
    setReservations(null);
    setUrl("");
    setText("");
    setFile(null);
    setError(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (file && file.size > IMPORT_MAX_IMAGE_BYTES) {
      setError("That file is larger than 6 MB. Crop, resize or export it smaller first.");
      return;
    }
    if (mode === "places") {
      if (!file && !url.trim()) {
        setError("Paste a link or choose a screenshot.");
        return;
      }
      if (!file && hint) {
        setError(hint);
        return;
      }
    } else if (!file && text.trim().length < 20) {
      setError("Paste the confirmation email, or choose its PDF or a screenshot.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "places") {
        const record = file ? (await upload<{ import: ImportRecord }>("/api/import", "image", file)).import : (await api<{ import: ImportRecord }>("/api/import", { method: "POST", json: { url: url.trim() } })).import;
        setResult(record);
        onImported?.(record);
      } else {
        const res = file
          ? await upload<{ reservations: Reservation[]; source: string }>("/api/reservations", "file", file)
          : await api<{ reservations: Reservation[]; source: string }>("/api/reservations", { method: "POST", json: { text: text.trim() } });
        setReservations({ list: res.reservations, source: res.source });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  const openInChat = () => {
    if (!result) return;
    onOpenChat?.();
    void send(importPrompt(result));
  };

  if (result || reservations) {
    return (
      <div className="grid gap-3" data-testid="import-result">
        {result ? <ImportedPlacesCards record={result} pinOnMap={false} /> : null}
        {reservations ? <ReservationCards reservations={reservations.list} source={reservations.source} /> : null}
        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          {result ? (
            <Button size="sm" onClick={openInChat}>
              <Sparkles className="h-4 w-4" /> Chat about these
            </Button>
          ) : null}
          <Button size="sm" variant="outline" onClick={reset}>
            Import another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-3" data-testid="import-form">
      <div role="group" aria-label="What are you importing?" className="inline-flex w-fit rounded-full border border-border bg-white p-0.5">
        {(
          [
            { key: "places", label: "Places from a post", icon: Link2 },
            { key: "reservation", label: "A reservation", icon: Ticket },
          ] as { key: Mode; label: string; icon: typeof Link2 }[]
        ).map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.key}
              type="button"
              aria-pressed={mode === m.key}
              onClick={() => {
                setMode(m.key);
                setError(null);
                setFile(null);
              }}
              className={clsx("inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold", mode === m.key ? "bg-brand text-white" : "text-neutral-700 hover:bg-surface")}
            >
              <Icon className="h-4 w-4" /> {m.label}
            </button>
          );
        })}
      </div>

      {mode === "places" ? (
        <>
          <label className="grid gap-1 text-[13px] font-medium">
            <span className="flex items-center gap-1.5">
              <Link2 className="h-4 w-4" /> Link
            </span>
            <TextInput value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… a blog post, Reddit thread, YouTube page or article" aria-label="Link to import" inputMode="url" />
          </label>
          {hint ? (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-[13px] text-amber-800" data-testid="import-hint">
              {hint}
            </p>
          ) : null}
          <label className="grid gap-1 text-[13px] font-medium">
            <span className="flex items-center gap-1.5">
              <Camera className="h-4 w-4" /> Or a screenshot / photo
            </span>
            <input type="file" accept="image/png,image/jpeg,image/webp" aria-label="Screenshot to import" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className={FILE_INPUT_CLASS} />
            <span className="text-[12px] font-normal text-muted">Instagram, TikTok and screenshots of saved lists work best this way. Up to 6 MB.</span>
          </label>
        </>
      ) : (
        <>
          <label className="grid gap-1 text-[13px] font-medium">
            <span className="flex items-center gap-1.5">
              <FileText className="h-4 w-4" /> Confirmation email or booking text
            </span>
            <TextArea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the whole confirmation: flight, hotel, restaurant, car, train or tickets" aria-label="Confirmation text" rows={6} />
          </label>
          <label className="grid gap-1 text-[13px] font-medium">
            <span className="flex items-center gap-1.5">
              <Camera className="h-4 w-4" /> Or the PDF / a screenshot
            </span>
            <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" aria-label="Confirmation file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className={FILE_INPUT_CLASS} />
            <span className="text-[12px] font-normal text-muted">Codes and dates are copied as written; hotels and venues that Google Places recognizes get a pin. Up to 6 MB.</span>
          </label>
        </>
      )}
      {error ? (
        <p className="text-[13px] text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex items-center justify-end gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Reading…" : mode === "places" ? "Find the places" : "Find the reservations"}
        </Button>
      </div>
      <p className="text-[12px] text-muted">
        {mode === "places"
          ? "Only places that Google Places can verify become cards; the rest are listed as unverified. Imports are kept under Saved › Imports."
          : "Reservations become bookings on the trip you choose, with their details, and show on the board on their day."}
      </p>
    </form>
  );
}

export function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <Modal open onClose={onClose} title="Import inspiration" description="Turn a link, a screenshot or a booking confirmation into places and reservations you can save, add to a trip or plan around." size="lg">
      <ImportForm onOpenChat={onClose} />
    </Modal>
  );
}
