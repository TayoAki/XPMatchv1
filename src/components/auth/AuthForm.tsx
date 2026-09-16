"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";

function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/api/auth/${mode}`, {
        method: "POST",
        json: mode === "signup" ? { name, email, password } : { email, password },
      });
      // Full navigation so the signed-in shell mounts fresh and hydrates the store.
      window.location.assign(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  };

  const otherHref = `${mode === "signup" ? "/login" : "/signup"}${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`;

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
        <p className="mt-1 text-[14px] text-muted">
          {mode === "signup"
            ? "Plan trips, save places and share guides with the community."
            : "Sign in to pick up your trips and saved places."}
        </p>
      </div>
      {mode === "signup" ? (
        <Field label="Name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Tayo Akigbogun" autoComplete="name" required autoFocus />
        </Field>
      ) : null}
      <Field label="Email">
        <TextInput
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
          autoFocus={mode === "login"}
        />
      </Field>
      <Field label="Password" hint={mode === "signup" ? "At least 8 characters" : undefined}>
        <TextInput
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          minLength={mode === "signup" ? 8 : 1}
          required
        />
      </Field>
      {error ? (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={busy} className="mt-1 w-full">
        {busy ? "One moment…" : mode === "signup" ? "Create account" : "Sign in"}
      </Button>
      <p className="text-center text-[13px] text-muted">
        {mode === "signup" ? "Already have an account? " : "New here? "}
        <Link href={otherHref} className="font-semibold text-foreground underline-offset-2 hover:underline">
          {mode === "signup" ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
