import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function doCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  }
  return (
    <button
      onClick={doCopy}
      title={label ?? "Copiar"}
      className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary transition ml-1"
    >
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      <span className="text-[10px]">{copied ? "copiado!" : label ?? "copiar"}</span>
    </button>
  );
}

export function CopyableText({ text, className = "" }: { text: string; className?: string }) {
  return (
    <div className="group flex items-start gap-1">
      <p className={className}>{text}</p>
      <CopyButton text={text} />
    </div>
  );
}
