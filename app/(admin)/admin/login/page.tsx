// app/(admin)/admin/login/page.tsx
// Implements Design System §5 and BR-3.1–BR-3.3 exactly.
// Uses shadcn/ui primitives (Button, Input) — install via the shadcn CLI,
// don't hand-roll these; the design tokens come from tailwind.config.ts.

"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Step = "credentials" | "verify";

export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  // --- Step 1: credentials ---
  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/v1/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.status === 401) {
        const body = await res.json();
        // BR-3.2 — the server is the source of truth on attempt count and
        // lock state; the client reflects it, never counts independently.
        if (body.error?.code === "ACCOUNT_LOCKED") {
          setLockedUntil(new Date(body.error.details?.lockedUntil));
          setError(null);
        } else {
          setFailedAttempts(body.error?.details?.failedAttempts ?? failedAttempts + 1);
          // Generic copy — never states which field was wrong.
          setError("Email or password is incorrect.");
        }
        return;
      }

      if (!res.ok) {
        setError("Something went wrong. Try again.");
        return;
      }

      const { challengeToken } = await res.json();
      setChallengeToken(challengeToken);
      setStep("verify");
    } finally {
      setSubmitting(false);
    }
  }

  // --- Step 2: verification ---
  function handleCodeDigit(index: number, value: string) {
    if (!/^\d?$/.test(value)) return;
    const next = [...code];
    next[index] = value;
    setCode(next);

    if (value && index < 5) {
      codeRefs.current[index + 1]?.focus();
    }
    if (value && index === 5) {
      void submitVerification(next.join(""));
    }
  }

  function handleCodeKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  }

  async function submitVerification(fullCode: string) {
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/v1/admin/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeToken,
          code: useRecoveryCode ? recoveryCode : fullCode,
        }),
      });

      if (!res.ok) {
        setError(useRecoveryCode ? "Recovery code is invalid." : "Code is incorrect.");
        setCode(Array(6).fill(""));
        codeRefs.current[0]?.focus();
        return;
      }

      router.push("/admin");
    } finally {
      setSubmitting(false);
    }
  }

  // --- Lockout countdown ---
  const [countdown, setCountdown] = useState<string | null>(null);
  useEffect(() => {
    if (!lockedUntil) return;
    const interval = setInterval(() => {
      const remainingMs = lockedUntil.getTime() - Date.now();
      if (remainingMs <= 0) {
        setLockedUntil(null);
        setCountdown(null);
        clearInterval(interval);
        return;
      }
      const minutes = Math.ceil(remainingMs / 60000);
      setCountdown(`${minutes} minute${minutes === 1 ? "" : "s"}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="font-mono text-sm text-slate">MALULEKE-KS</p>
          <h1 className="font-sans text-xl text-ink mt-1">Admin</h1>
        </div>

        {lockedUntil ? (
          <div className="border border-critical/30 bg-critical/5 px-4 py-3">
            <p className="font-sans text-sm text-critical">
              Too many attempts. Try again in {countdown ?? "a moment"}.
            </p>
          </div>
        ) : step === "credentials" ? (
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div>
              <label className="font-sans text-sm text-ink block mb-1">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="font-sans text-sm text-ink block mb-1">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="font-sans text-sm text-critical">
                {error}
                {failedAttempts >= 2 && (
                  <span className="block text-slate mt-1">
                    {5 - failedAttempts} attempt{5 - failedAttempts === 1 ? "" : "s"} remaining
                    before a temporary lock.
                  </span>
                )}
              </p>
            )}

            <Button type="submit" disabled={submitting} className="w-full bg-ink text-paper">
              Continue
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            {!useRecoveryCode ? (
              <>
                <label className="font-sans text-sm text-ink block">Enter your 6-digit code</label>
                <div className="flex gap-2">
                  {code.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        codeRefs.current[i] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeDigit(i, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(i, e)}
                      className="w-10 h-12 text-center font-mono text-lg border border-slate/30 focus:border-ink outline-none rounded-none"
                    />
                  ))}
                </div>
              </>
            ) : (
              <div>
                <label className="font-sans text-sm text-ink block mb-1">Recovery code</label>
                <Input
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value)}
                  autoFocus
                />
                <Button
                  type="button"
                  onClick={() => submitVerification("")}
                  disabled={submitting || !recoveryCode}
                  className="w-full bg-ink text-paper mt-3"
                >
                  Continue
                </Button>
              </div>
            )}

            {error && <p className="font-sans text-sm text-critical">{error}</p>}

            <button
              type="button"
              onClick={() => setUseRecoveryCode(!useRecoveryCode)}
              className="font-sans text-sm text-slate underline underline-offset-2"
            >
              {useRecoveryCode ? "Use your 6-digit code instead" : "Use a recovery code instead"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
