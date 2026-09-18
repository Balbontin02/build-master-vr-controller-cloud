export function formatTime(ts: number | null | undefined): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('es-MX', { hour12: false });
}

export function formatClock(): string {
  return new Date().toLocaleTimeString('es-MX', { hour12: false });
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}