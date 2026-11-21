"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { appName } from "@/lib/config";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isSignup = mode === "signup";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    if (isSignup) {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: String(form.get("name") ?? ""), email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Signup failed");
        setBusy(false);
        return;
      }
    }

    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setError(
        isSignup
          ? "Account created, but sign-in failed. Try logging in."
          : "Invalid email or password"
      );
      setBusy(false);
      return;
    }

    router.push("/docs");
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="mb-6 text-center text-lg font-semibold tracking-tight">{appName}</p>

        <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <h1 className="mb-5 text-xl font-semibold">{isSignup ? "Create your account" : "Log in"}</h1>

          <form onSubmit={onSubmit} className="space-y-4">
            {isSignup && <Input name="name" label="Name (optional)" autoComplete="name" />}
            <Input name="email" type="email" label="Email" required autoComplete="email" />
            <Input
              name="password"
              type="password"
              label="Password"
              required
              minLength={isSignup ? 8 : undefined}
              autoComplete={isSignup ? "new-password" : "current-password"}
            />
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <Button type="submit" loading={busy} className="w-full">
              {isSignup ? "Sign up" : "Log in"}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-muted">
          {isSignup ? "Already have an account? " : "No account? "}
          <Link href={isSignup ? "/login" : "/signup"} className="font-medium text-primary hover:underline">
            {isSignup ? "Log in" : "Sign up"}
          </Link>
        </p>
      </div>
    </main>
  );
}
