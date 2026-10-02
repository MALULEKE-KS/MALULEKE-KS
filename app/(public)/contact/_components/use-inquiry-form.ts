// app/(public)/contact/_components/use-inquiry-form.ts
// Let's Talk — the conversation's state and its one way out. Everything that
// isn't drawing lives here: what the visitor typed (kept per category, so
// switching back loses nothing), the signed form token and its refresh, the
// AI guide's draft (BR-4.1/4.2: it fills the message, the visitor sends),
// validation (the same schemas as the server — lib/inquiries/fields.ts), and
// sending: one idempotency key per message (BR-2.6), the honeypot (BR-2.7),
// PDFs as multipart, an expired token renewed and retried once.

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { INQUIRY_DRAFT_KEY } from "@/lib/guide/keys";
import { formFor, type CategoryKey } from "@/lib/inquiries/forms";
import {
  EMPTY_COMPENSATION,
  EMPTY_CONTACT,
  EMPTY_MEETING,
  buildDetails,
  collectIssues,
  progressOf,
  validateDraft,
  type CompensationDraft,
  type ContactDraft,
  type Draft,
  type Errors,
  type MeetingDraft,
} from "@/lib/inquiries/fields";
import type { InquiryTypeOption } from "@/lib/queries/site";

export type SendState = { kind: "form" } | { kind: "sending" } | { kind: "sent"; reference: string } | { kind: "problem"; message: string };

/** A form token older than an hour is swapped for a fresh one before sending. */
const tokenIsStale = (t: { at: number } | null) => !t || Date.now() - t.at > 60 * 60 * 1000;

type Issue = { path: PropertyKey[]; message: string };
type ApiBody = { reference?: string; error?: { code?: string; message?: string; details?: { issues?: Issue[] } } } | null;

export function useInquiryForm({ categories, initialCategory, maxFiles, maxMegabytes }: { categories: InquiryTypeOption[]; initialCategory: string | null; maxFiles: number; maxMegabytes: number }) {
  const [category, setCategory] = useState<string | null>(categories.some((c) => c.value === initialCategory) ? initialCategory : null);
  const chosen = categories.find((c) => c.value === category) ?? null;
  const form: CategoryKey = chosen?.form ?? formFor(chosen?.value ?? "general");

  const [subtype, setSubtype] = useState("");
  const [subtypeOther, setSubtypeOther] = useState("");
  const [message, setMessage] = useState("");
  const [contact, setContactState] = useState<ContactDraft>(EMPTY_CONTACT);
  // The category's own values, namespaced by form so switching back keeps them.
  const [allValues, setAllValues] = useState<Record<string, string>>({});
  const [compensation, setCompensationState] = useState<CompensationDraft>(EMPTY_COMPENSATION);
  const [meeting, setMeetingState] = useState<MeetingDraft>(EMPTY_MEETING);
  const [files, setFiles] = useState<File[]>([]);
  const [website, setWebsite] = useState(""); // honeypot
  const [errors, setErrors] = useState<Errors>({});
  const [state, setState] = useState<SendState>({ kind: "form" });
  const [fromGuide, setFromGuide] = useState(false);
  const idempotencyKey = useRef<string | null>(null);
  const token = useRef<{ value: string; at: number } | null>(null);

  const browserZone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "";
    }
  }, []);

  const fetchToken = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/inquiries/form", { cache: "no-store" });
      const data = (await res.json()) as { token: string };
      token.current = { value: data.token, at: Date.now() };
    } catch {
      token.current = null;
    }
  }, []);

  useEffect(() => {
    void fetchToken();
    try {
      const draft = sessionStorage.getItem(INQUIRY_DRAFT_KEY);
      if (!draft) return;
      sessionStorage.removeItem(INQUIRY_DRAFT_KEY);
      /* eslint-disable react-hooks/set-state-in-effect -- reading the session once, after hydration */
      setMessage((current) => current || draft);
      setFromGuide(true);
      /* eslint-enable react-hooks/set-state-in-effect */
    } catch {
      // Storage blocked: nothing to prefill.
    }
  }, [fetchToken]);

  const prefix = `${form}.`;
  const values = Object.fromEntries(Object.entries(allValues).filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k.slice(prefix.length), v]));
  const draft: Draft = { form, values, compensation, meeting, browserZone };

  // Editing a field clears its error, so the message never outlives the fix.
  const clear = (...keys: string[]) => setErrors((e) => (keys.some((k) => e[k]) ? Object.fromEntries(Object.entries(e).filter(([k]) => !keys.includes(k))) : e));
  const setValue = (key: string, value: string) => {
    setAllValues((v) => ({ ...v, [`${form}.${key}`]: value }));
    clear(`details.${key}`);
  };
  const setContact = (patch: Partial<ContactDraft>) => {
    setContactState((c) => ({ ...c, ...patch }));
    clear(...Object.keys(patch));
  };
  const setCompensation = (patch: Partial<CompensationDraft>) => {
    setCompensationState((c) => ({ ...c, ...patch }));
    clear(...Object.keys(patch).map((k) => `details.compensation.${k}`));
  };
  const setMeeting = (patch: Partial<MeetingDraft>) => {
    setMeetingState((m) => ({ ...m, ...patch, timeZone: patch.timeZone ?? (m.timeZone || browserZone) }));
    clear(...Object.keys(patch).map((k) => `details.meeting.${k}`));
  };
  const updateMessage = (m: string) => {
    setMessage(m);
    clear("message");
  };

  const choose = (key: string | null) => {
    setCategory(key);
    setSubtype("");
    setSubtypeOther("");
    setErrors({});
    setState({ kind: "form" });
    idempotencyKey.current = null; // a new message, a new key (BR-2.6)
  };

  const addFiles = (picked: File[]) => {
    const pdfs = picked.filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    setErrors((x) => ({ ...x, documents: pdfs.length < picked.length ? "Only PDF files can be attached" : "" }));
    setFiles((cur) => [...cur, ...pdfs].slice(0, maxFiles));
  };
  const removeFile = (i: number) => setFiles((cur) => cur.filter((_, j) => j !== i));

  /** Validates, then sends. Returns true once the inquiry is received. */
  async function submit(): Promise<boolean> {
    if (!chosen) return false;
    const found = validateDraft({
      draft,
      contact,
      message,
      needsSubtype: Boolean(chosen.subtypes?.length),
      subtype,
      subtypeOther,
      fileBytes: files.reduce((n, f) => n + f.size, 0),
      maxMegabytes,
    });
    setErrors(found);
    if (Object.keys(found).length > 0) return false;

    setState({ kind: "sending" });
    idempotencyKey.current ??= crypto.randomUUID();
    if (tokenIsStale(token.current)) await fetchToken();
    const payload = {
      inquiryType: chosen.value,
      ...(subtype && { subtype }),
      ...(subtype === "other" && { subtypeOther: subtypeOther.trim() }),
      ...Object.fromEntries(Object.entries(contact).filter(([, v]) => v !== "")),
      message,
      details: buildDetails(draft),
      idempotencyKey: idempotencyKey.current,
      formToken: token.current?.value,
      website,
    };
    const send = () => {
      if (files.length === 0) return fetch("/api/v1/inquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const fd = new FormData();
      fd.set("payload", JSON.stringify(payload));
      for (const f of files) fd.append("documents", f);
      return fetch("/api/v1/inquiries", { method: "POST", body: fd });
    };
    try {
      let res = await send();
      if (res.status === 400) {
        const body = (await res.clone().json().catch(() => null)) as ApiBody;
        if (body?.error?.code === "FORM_EXPIRED") {
          await fetchToken();
          payload.formToken = token.current?.value;
          res = await send();
        }
      }
      const data = (await res.json().catch(() => null)) as ApiBody;
      if (res.ok && data?.reference) {
        setState({ kind: "sent", reference: data.reference });
        return true;
      }
      if (res.status === 400 && data?.error?.details?.issues) setErrors(collectIssues(data.error.details.issues));
      setState({
        kind: "problem",
        message: res.status === 429 ? (data?.error?.message ?? "Too many messages — try again later.") : res.status === 413 ? "The attachments are too large." : (data?.error?.message ?? "Something went wrong. Try again."),
      });
    } catch {
      setState({ kind: "problem", message: "Couldn't reach the site — check your connection and try again. Nothing was sent twice." });
    }
    return false;
  }

  return {
    chosen,
    form,
    choose,
    subtype,
    setSubtype: (s: string) => {
      setSubtype(s);
      clear("subtype");
    },
    subtypeOther,
    setSubtypeOther: (s: string) => {
      setSubtypeOther(s);
      clear("subtypeOther");
    },
    message,
    setMessage: updateMessage,
    values,
    setValue,
    contact,
    setContact,
    compensation,
    setCompensation,
    meeting,
    setMeeting,
    files,
    addFiles,
    removeFile,
    website,
    setWebsite,
    errors,
    state,
    fromGuide,
    progress: progressOf({ draft, contact, message }),
    submit,
  };
}

export type InquiryForm = ReturnType<typeof useInquiryForm>;
