"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

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

  const input = "w-full rounded border border-gray-300 px-3 py-2 text-sm";

  return (
    <main className="mx-auto mt-24 w-full max-w-sm px-4">
      <h1 className="mb-6 text-2xl font-semibold">{isSignup ? "Create account" : "Log in"}</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        {isSignup && <input name="name" placeholder="Name (optional)" className={input} />}
        <input name="email" type="email" required placeholder="Email" autoComplete="email" className={input} />
        <input
          name="password"
          type="password"
          required
          placeholder="Password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          className={input}
        />
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {busy ? "Please wait…" : isSignup ? "Sign up" : "Log in"}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-600">
        {isSignup ? "Already have an account? " : "No account? "}
        <Link href={isSignup ? "/login" : "/signup"} className="underline">
          {isSignup ? "Log in" : "Sign up"}
        </Link>
      </p>
    </main>
  );
}