"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";

type LinkState = { status: "checking" } | { status: "ok"; email: string } | { status: "dead"; message: string };

/** The page a reset link opens: confirms whose password it sets, takes the new one, signs the browser in. */
export function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [link, setLink] = useState<LinkState>({ status: "checking" });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    api<{ email: string }>(`/api/auth/reset?token=${encodeURIComponent(token)}`)
      .then((info) => active && setLink({ status: "ok", email: info.email }))
      .catch((err: unknown) => active && setLink({ status: "dead", message: err instanceof ApiError ? err.message : "This reset link cannot be checked right now." }));
    return () => {
      active = false;
    };
  }, [token]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/reset", { method: "POST", json: { token, password } });
      // Full navigation (as the sign-in form does) so the signed-in shell mounts fresh and hydrates the store.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  };

  if (link.status === "checking") {
    return <p className="text-[14px] text-muted">Checking your link…</p>;
  }

  if (link.status === "dead") {
    return (
      <div className="grid gap-4" data-testid="reset-dead">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight">This link no longer works</h1>
          <p className="mt-1 text-[14px] text-muted">{link.message}</p>
        </div>
        <p className="text-[13px] text-muted">
          Reset links work once and expire after 30 minutes.{" "}
          <Link href="/forgot" className="font-semibold text-foreground underline-offset-2 hover:underline">
            Request a new one
          </Link>
          , or{" "}
          <Link href="/login" className="font-semibold text-foreground underline-offset-2 hover:underline">
            sign in
          </Link>{" "}
          if you remember your password.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4" data-testid="reset-form">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight">Set a new password</h1>
        <p className="mt-1 text-[14px] text-muted">
          For <span className="font-medium text-foreground">{link.email}</span>. Every other device is signed out once you save.
        </p>
      </div>
      <Field label="New password" hint="At least 8 characters">
        <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} required autoFocus aria-label="New password" />
      </Field>
      <Field label="Confirm password">
        <TextInput type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" minLength={8} required aria-label="Confirm password" />
      </Field>
      {error ? (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={busy} className="mt-1 w-full">
        {busy ? "One moment…" : "Set password"}
      </Button>
    </form>
  );
}
