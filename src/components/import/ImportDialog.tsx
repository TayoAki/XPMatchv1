"use client";

import { useState, type FormEvent } from "react";
import clsx from "clsx";
import { Camera, Link2, Sparkles } from "lucide-react";
import { IMPORT_MAX_IMAGE_BYTES, screenshotOnlyHost, type ImportRecord } from "@/lib/import/types";
import { api, ApiError } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { useSendMessage } from "@/components/chat/useSendMessage";
import { ImportedPlacesCards, importPrompt } from "./ImportedPlacesCards";

async function uploadImage(file: File): Promise<ImportRecord> {
  const form = new FormData();
  form.append("image", file);
  const res = await fetch("/api/import", { method: "POST", body: form, credentials: "same-origin" });
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
  return ((await res.json()) as { import: ImportRecord }).import;
}

function hintFor(url: string): string | null {
  try {
    const host = screenshotOnlyHost(new URL(url.trim()).hostname);
    return host ? `${host} posts can't be read from a link. Take a screenshot of the post and upload it below instead.` : null;
  } catch {
    return null;
  }
}

/**
 * Paste a link or upload a screenshot; the places named in it come back as
 * cards with Save, Add to trip and the collection option. Used as a modal
 * from the chat composer and inline on the Create page.
 */
export function ImportForm({ onImported, onOpenChat }: { onImported?: (record: ImportRecord) => void; onOpenChat?: () => void }) {
  const send = useSendMessage();
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportRecord | null>(null);
  const hint = hintFor(url);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (file && file.size > IMPORT_MAX_IMAGE_BYTES) {
      setError("That image is larger than 6 MB. Crop or resize it first.");
      return;
    }
    if (!file && !url.trim()) {
      setError("Paste a link or choose a screenshot.");
      return;
    }
    if (!file && hint) {
      setError(hint);
      return;
    }
    setBusy(true);
    try {
      const record = file ? await uploadImage(file) : (await api<{ import: ImportRecord }>("/api/import", { method: "POST", json: { url: url.trim() } })).import;
      setResult(record);
      onImported?.(record);
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

  if (result) {
    return (
      <div className="grid gap-3" data-testid="import-result">
        <ImportedPlacesCards record={result} pinOnMap={false} />
        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          <Button size="sm" onClick={openInChat}>
            <Sparkles className="h-4 w-4" /> Chat about these
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setResult(null); setUrl(""); setFile(null); }}>
            Import another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-3" data-testid="import-form">
      <label className="grid gap-1 text-[13px] font-medium">
        <span className="flex items-center gap-1.5">
          <Link2 className="h-4 w-4" /> Link
        </span>
        <TextInput value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… a blog post, Reddit thread, YouTube page or article" aria-label="Link to import" inputMode="url" />
      </label>
      {hint ? <p className="rounded-xl bg-amber-50 px-3 py-2 text-[13px] text-amber-800" data-testid="import-hint">{hint}</p> : null}
      <label className={clsx("grid gap-1 text-[13px] font-medium")}>
        <span className="flex items-center gap-1.5">
          <Camera className="h-4 w-4" /> Or a screenshot / photo
        </span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aria-label="Screenshot to import"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-[13px] text-neutral-700 file:mr-3 file:rounded-full file:border file:border-border file:bg-white file:px-3 file:py-1.5 file:text-[13px] file:font-medium hover:file:bg-surface"
        />
        <span className="text-[12px] font-normal text-muted">Instagram, TikTok and screenshots of saved lists work best this way. Up to 6 MB.</span>
      </label>
      {error ? <p className="text-[13px] text-red-600" role="alert">{error}</p> : null}
      <div className="flex items-center justify-end gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Reading…" : "Find the places"}
        </Button>
      </div>
      <p className="text-[12px] text-muted">Only places that Google Places can verify become cards; the rest are listed as unverified. Imports are kept under Saved › Imports.</p>
    </form>
  );
}

export function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <Modal open onClose={onClose} title="Import inspiration" description="Turn a link or a screenshot into places you can save, add to a trip or plan around." size="lg">
      <ImportForm onOpenChat={onClose} />
    </Modal>
  );
}
