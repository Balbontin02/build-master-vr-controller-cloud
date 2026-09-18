import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { copyText } from '../lib/copy';

export function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handle = async () => {
    const ok = await copyText(text);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <button
      type="button"
      onClick={handle}
      className="btn-ghost"
      aria-label={label ?? 'Copiar'}
    >
      {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
      {copied ? '¡Copiado!' : label ?? 'Copiar'}
    </button>
  );
}