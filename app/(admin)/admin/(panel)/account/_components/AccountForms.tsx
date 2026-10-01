// app/(admin)/admin/(panel)/account/_components/AccountForms.tsx
// Password change and recovery-code regeneration (#104). Each asks for the
// current password and a live authenticator code; repeated failures end the
// session (lib/auth/reauth), which the request helper turns into sign-in.
// New recovery codes are shown once, here, and never stored in plain text.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Download, KeyRound, ShieldCheck } from "lucide-react";
import { adminButton, adminHint, adminInput, adminLabel, Panel } from "@/components/admin/ui";
import { adminRequest } from "@/lib/admin/request";
import { cn } from "@/lib/utils";

const MIN_PASSWORD = 12; // PasswordChangeInputSchema

function Reauth({ idPrefix, password, code, onPassword, onCode }: { idPrefix: string; password: string; code: string; onPassword: (v: string) => void; onCode: (v: string) => void }) {
  return (
    <>
      <div>
        <label htmlFor={`${idPrefix}-current`} className={adminLabel}>Current password</label>
        <input id={`${idPrefix}-current`} type="password" autoComplete="current-password" className={adminInput} value={password} onChange={(e) => onPassword(e.target.value)} />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-code`} className={adminLabel}>Authenticator code</label>
        <input
          id={`${idPrefix}-code`}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          className={cn(adminInput, "font-mono tracking-[0.3em]")}
          value={code}
          onChange={(e) => onCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        />
        <p className={adminHint}>A fresh code — each one works once.</p>
      </div>
    </>
  );
}

export function AccountForms({ recoveryCodesLow }: { recoveryCodesLow: boolean }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <PasswordForm />
      <RecoveryCodesForm low={recoveryCodesLow} />
    </div>
  );
}

function PasswordForm() {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const mismatch = confirm.length > 0 && next !== confirm;
  const ready = current && next.length >= MIN_PASSWORD && next === confirm && code.length === 6;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    const res = await adminRequest("/auth/change-password", { method: "POST", body: { currentPassword: current, newPassword: next, code } });
    setBusy(false);
    setCode("");
    if (!res.ok) return setResult({ ok: false, text: res.message });
    setCurrent("");
    setNext("");
    setConfirm("");
    setResult({ ok: true, text: "Password changed. Every other session has been signed out." });
    router.refresh();
  }

  return (
    <Panel title="Change password" description="Ends every other session (BR-3.15).">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="pw-new" className={adminLabel}>New password</label>
          <input id="pw-new" type="password" autoComplete="new-password" className={adminInput} value={next} onChange={(e) => setNext(e.target.value)} />
          <p className={adminHint}>At least {MIN_PASSWORD} characters. A passphrase is easiest to remember.</p>
        </div>
        <div>
          <label htmlFor="pw-confirm" className={adminLabel}>Repeat new password</label>
          <input id="pw-confirm" type="password" autoComplete="new-password" className={adminInput} value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-invalid={mismatch} />
          {mismatch && <p className="mt-1 text-xs text-critical">The two don&apos;t match.</p>}
        </div>
        <Reauth idPrefix="pw" password={current} code={code} onPassword={setCurrent} onCode={setCode} />
        <button type="submit" disabled={!ready || busy} className={adminButton.primary}>
          <KeyRound aria-hidden="true" /> {busy ? "Changing…" : "Change password"}
        </button>
        {result && <p role="status" className={cn("text-sm", result.ok ? "text-signal-finished" : "text-critical")}>{result.text}</p>}
      </form>
    </Panel>
  );
}

function RecoveryCodesForm({ low }: { low: boolean }) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await adminRequest<{ codes: string[] }>("/auth/recovery-codes", { method: "POST", body: { currentPassword: current, code } });
    setBusy(false);
    setCode("");
    if (!res.ok) return setError(res.message);
    setCurrent("");
    setCodes(res.data.codes);
    router.refresh();
  }

  async function copy() {
    if (!codes) return;
    await navigator.clipboard.writeText(codes.join("\n")).catch(() => null);
    setCopied(true);
  }

  function download() {
    if (!codes) return;
    const blob = new Blob([`MALULEKE-KS admin recovery codes\nEach works once. Generated ${new Date().toISOString()}\n\n${codes.join("\n")}\n`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "maluleke-ks-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Panel title="Recovery codes" description="Sign in with one if you lose your authenticator. New codes replace every old one (BR-3.12).">
      {codes ? (
        <div>
          <p className="mb-3 text-sm text-ink">Save these now — they won&apos;t be shown again. Each works once.</p>
          <ul className="grid grid-cols-2 gap-2 rounded-xl bg-night-deep p-4 font-mono text-sm text-paper">
            {codes.map((c) => <li key={c}>{c}</li>)}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={copy} className={adminButton.secondary}><Copy aria-hidden="true" /> {copied ? "Copied" : "Copy"}</button>
            <button type="button" onClick={download} className={adminButton.secondary}><Download aria-hidden="true" /> Download</button>
            <button type="button" onClick={() => setCodes(null)} className={adminButton.ghost}>I&apos;ve saved them</button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {low && <p className="rounded-xl border border-ember/30 bg-ember/10 p-3 text-sm text-accent">You&apos;re running low — make a fresh set.</p>}
          <Reauth idPrefix="rc" password={current} code={code} onPassword={setCurrent} onCode={setCode} />
          <button type="submit" disabled={!current || code.length !== 6 || busy} className={adminButton.dark}>
            <ShieldCheck aria-hidden="true" /> {busy ? "Generating…" : "Generate new codes"}
          </button>
          {error && <p role="status" className="text-sm text-critical">{error}</p>}
        </form>
      )}
    </Panel>
  );
}
