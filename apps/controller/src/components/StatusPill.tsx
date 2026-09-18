export type PillState = 'connected' | 'connecting' | 'disconnected';

const STYLES: Record<PillState, string> = {
  connected: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  connecting: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  disconnected: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
};

const DOT: Record<PillState, string> = {
  connected: 'bg-emerald-400',
  connecting: 'bg-sky-400 animate-pulse',
  disconnected: 'bg-rose-400',
};

export function StatusPill({
  state,
  label,
}: {
  state: PillState;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${STYLES[state]}`}
      role="status"
    >
      <span className={`h-2 w-2 rounded-full ${DOT[state]}`} aria-hidden="true" />
      {label}
    </span>
  );
}