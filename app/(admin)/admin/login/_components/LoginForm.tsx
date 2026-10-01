// app/(admin)/admin/login/_components/LoginForm.tsx
// Two steps: email + password, then a 6-digit authenticator code or a
// recovery code (BR-3.1). Copy never says which credential was wrong, and
// the client never counts attempts — the server decides lockouts (BR-3.2)
// and says only when one is in force. An expired or used-up code challenge
// answers exactly like a wrong code (BR-3.5), so "Start over" is always here.

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { BrandMark } from "@/components/shared/BrandMark";
import { adminButton, adminInput, adminLabel } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

type Step = "credentials" | "verify";
const DIGITS = 6;

export function LoginForm({ notice }: { notice: string | null }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [code, setCode] = useState<string[]>(Array(DIGITS).fill(""));
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  async function submitCredentials(e: React.FormEvent) {
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
        const body = await res.json().catch(() => null);
        if (body?.error?.code === "ACCOUNT_LOCKED" && body.error.details?.lockedUntil) {
          setLockedUntil(new Date(body.error.details.lockedUntil));
        } else {
          setError("Email or password is incorrect.");
        }
        return;
      }
      if (!res.ok) return setError("Something went wrong. Try again.");
      const body = await res.json();
      setChallengeToken(body.challengeToken);
      setPassword("");
      setStep("verify");
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitVerification(value: string) {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/admin/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeToken, code: value }),
      });
      if (!res.ok) {
        setError(useRecoveryCode ? "That recovery code didn't work." : "That code didn't work. Wait for a fresh one and try again.");
        setCode(Array(DIGITS).fill(""));
        codeRefs.current[0]?.focus();
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function fillCode(from: number, text: string) {
    const digits = text.replace(/\D/g, "").slice(0, DIGITS - from).split("");
    if (digits.length === 0) return;
    const next = [...code];
    digits.forEach((d, i) => (next[from + i] = d));
    setCode(next);
    const filled = next.every(Boolean);
    codeRefs.current[Math.min(from + digits.length, DIGITS - 1)]?.focus();
    if (filled) void submitVerification(next.join(""));
  }

  function onDigit(index: number, value: string) {
    if (value === "") {
      const next = [...code];
      next[index] = "";
      return setCode(next);
    }
    fillCode(index, value);
  }

  function startOver() {
    setStep("credentials");
    setChallengeToken(null);
    setCode(Array(DIGITS).fill(""));
    setRecoveryCode("");
    setUseRecoveryCode(false);
    setError(null);
  }

  // Lockout countdown, from the server's time.
  useEffect(() => {
    if (!lockedUntil) return;
    const tick = () => {
      const remaining = lockedUntil.getTime() - Date.now();
      if (remaining <= 0) {
        setLockedUntil(null);
        setCountdown(null);
        return false;
      }
      const minutes = Math.ceil(remaining / 60000);
      setCountdown(`${minutes} minute${minutes === 1 ? "" : "s"}`);
      return true;
    };
    const interval = setInterval(() => {
      if (!tick()) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  return (
    <main id="main" className="relative grid min-h-screen place-items-center overflow-hidden bg-night-deep px-4 py-12">
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-ember/15 blur-3xl" />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3 text-paper">
          <BrandMark className="h-8 text-paper" />
          <div>
            <p className="font-mono text-sm">MALULEKE-KS</p>
            <p className="text-xs text-mist">Admin</p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-sheet p-6 shadow-lift md:p-8">
          <h1 className="text-xl font-semibold tracking-tight text-ink">{step === "credentials" ? "Sign in" : "Two-step check"}</h1>
          {notice && step === "credentials" && !lockedUntil && <p role="status" className="mt-2 rounded-xl bg-paper px-3 py-2 text-sm text-slate">{notice}</p>}

          {lockedUntil ? (
            <div role="alert" className="mt-5 flex items-start gap-3 rounded-xl border border-critical/20 bg-critical/5 p-3 text-sm text-critical">
              <LockKeyhole aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              Too many attempts. Try again in {countdown ?? "a moment"}.
            </div>
          ) : step === "credentials" ? (
            <form onSubmit={submitCredentials} className="mt-5 space-y-4">
              <div>
                <label htmlFor="email" className={adminLabel}>Email</label>
                <input id="email" type="email" autoComplete="username" className={adminInput} value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
              </div>
              <div>
                <label htmlFor="password" className={adminLabel}>Password</label>
                <input id="password" type="password" autoComplete="current-password" className={adminInput} value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              {error && <p role="alert" className="text-sm text-critical">{error}</p>}
              <button type="submit" disabled={submitting || !email || !password} className={cn(adminButton.dark, "w-full py-2.5")}>
                {submitting ? "Checking…" : "Continue"}
              </button>
            </form>
          ) : (
            <div className="mt-5 space-y-4">
              {!useRecoveryCode ? (
                <fieldset>
                  <legend className={adminLabel}>The 6-digit code from your authenticator</legend>
                  <div className="flex justify-between gap-2">
                    {code.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => {
                          codeRefs.current[i] = el;
                        }}
                        aria-label={`Digit ${i + 1}`}
                        inputMode="numeric"
                        autoComplete={i === 0 ? "one-time-code" : "off"}
                        autoFocus={i === 0}
                        maxLength={i === 0 ? DIGITS : 1}
                        value={digit}
                        disabled={submitting}
                        onChange={(e) => onDigit(i, e.target.value)}
                        onPaste={(e) => {
                          e.preventDefault();
                          fillCode(i, e.clipboardData.getData("text"));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace" && !code[i] && i > 0) codeRefs.current[i - 1]?.focus();
                        }}
                        className="h-12 w-11 rounded-xl border border-ink/15 bg-paper text-center font-mono text-lg text-ink outline-none transition-[border-color,box-shadow] focus:border-ember focus:ring-4 focus:ring-ember/15"
                      />
                    ))}
                  </div>
                </fieldset>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void submitVerification(recoveryCode.trim());
                  }}
                >
                  <label htmlFor="recovery" className={adminLabel}>Recovery code</label>
                  <input id="recovery" autoComplete="off" className={cn(adminInput, "font-mono")} value={recoveryCode} onChange={(e) => setRecoveryCode(e.target.value)} autoFocus />
                  <button type="submit" disabled={submitting || !recoveryCode.trim()} className={cn(adminButton.dark, "mt-3 w-full py-2.5")}>
                    {submitting ? "Checking…" : "Continue"}
                  </button>
                </form>
              )}

              {error && <p role="alert" className="text-sm text-critical">{error}</p>}

              <div className="flex items-center justify-between gap-3 border-t border-ink/10 pt-4 text-sm">
                <button type="button" onClick={startOver} className="inline-flex items-center gap-1 text-slate hover:text-ink">
                  <ArrowLeft aria-hidden="true" className="size-4" /> Start over
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUseRecoveryCode(!useRecoveryCode);
                    setError(null);
                  }}
                  className="text-accent hover:underline"
                >
                  {useRecoveryCode ? "Use the 6-digit code" : "Use a recovery code"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
