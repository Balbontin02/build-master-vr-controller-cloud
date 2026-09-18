import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

export function QrCard({ value, size = 176 }: { value: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !value) return;
    let cancelled = false;
    QRCode.toCanvas(canvas, value, {
      width: size,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#18181b', light: '#ffffff' },
    }).catch(() => {
      if (!cancelled) canvas.textContent = 'QR inválido';
    });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  return (
    <canvas
      ref={ref}
      className="rounded-xl border border-zinc-800 bg-white"
      style={{ width: size, height: size }}
      role="img"
      aria-label="Código QR"
    />
  );
}