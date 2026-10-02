// components/guide/CopyButton.tsx
// Copies a piece of the guide's answer (a code block, or the whole answer) to
// the clipboard, and says so for a moment.

"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export function CopyButton({ text, label = "Copy", className }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() =>
        void navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        })
      }
      className={cn("text-mist hover:text-paper focus-visible:outline-ember inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] transition-colors focus-visible:outline-2", className)}
      aria-label={copied ? "Copied" : label}
    >
      {copied ? <Check aria-hidden="true" className="size-3" /> : <Copy aria-hidden="true" className="size-3" />}
      <span aria-hidden="true">{copied ? "Copied" : label}</span>
    </button>
  );
}
