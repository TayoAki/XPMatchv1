"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";

/** "Forgot password?": asks for the email and requests a reset link; the answer never says whether the account exists. */
export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/forgot", { method: "POST", json: { email } });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="grid gap-4" data-testid="forgot-sent">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight">Check your email</h1>
          <p className="mt-1 text-[14px] text-muted">
            If an account exists for <span className="font-medium text-foreground">{email.trim()}</span>, a reset link is on its way. It works once and expires in 30 minutes.
            Give it a minute and check spam if it does not show up.
          </p>
        </div>
        <p className="text-center text-[13px] text-muted">
          <Link href="/login" className="font-semibold text-foreground underline-offset-2 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4" data-testid="forgot-form">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight">Forgot your password?</h1>
        <p className="mt-1 text-[14px] text-muted">Enter the email you signed up with and we&apos;ll send a link to set a new one.</p>
      </div>
      <Field label="Email">
        <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required autoFocus />
      </Field>
      {error ? (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={busy} className="mt-1 w-full">
        {busy ? "One moment…" : "Email me a link"}
      </Button>
      <p className="text-center text-[13px] text-muted">
        <Link href="/login" className="font-semibold text-foreground underline-offset-2 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
