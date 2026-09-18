import { useCallback, useEffect, useRef, useState } from 'react';
import { WS_PATH, MessageType, createEnvelope, type Envelope } from '@shared';

export type WsStatus = 'connecting' | 'connected' | 'disconnected';

export type WsRole = 'ADVISOR' | 'QUEST';

const RECONNECT_DELAYS_MS = [1000, 2000, 5000, 10000, 20000, 30000];

function getWsUrl(): string {
  const envUrl = import.meta.env.VITE_WS_URL;
  if (envUrl) return envUrl;
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}${WS_PATH}`;
}

export function useBuildMasterWs(
  onMessage: (msg: Envelope) => void,
  options?: { role?: WsRole; deviceName?: string },
): {
  status: WsStatus;
  send: (type: string, payload?: unknown, messageId?: string) => boolean;
  reconnect: () => void;
} {
  const [status, setStatus] = useState<WsStatus>('connecting');
  const wsRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(0);
  const timerRef = useRef<number | undefined>(undefined);
  const onMessageRef = useRef(onMessage);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  onMessageRef.current = onMessage;

  const open = useCallback(() => {
    const url = getWsUrl();
    setStatus('connecting');
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      attemptRef.current = 0;
      setStatus('connected');
      const opts = optionsRef.current;
      if (opts?.role) {
        ws.send(
          JSON.stringify(
            createEnvelope(MessageType.ClientRegister, {
              role: opts.role,
              deviceName:
                opts.deviceName ?? (opts.role === 'ADVISOR' ? 'LAPTOP' : 'META QUEST'),
            }),
          ),
        );
      }
    };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as Envelope;
        onMessageRef.current(msg);
      } catch {
        /* mensaje no JSON: ignorar */
      }
    };
    ws.onerror = () => {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    };
    ws.onclose = () => {
      if (wsRef.current !== ws) return;
      wsRef.current = null;
      setStatus('disconnected');
      const delay = RECONNECT_DELAYS_MS[Math.min(attemptRef.current, RECONNECT_DELAYS_MS.length - 1)];
      attemptRef.current += 1;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(open, delay);
    };
  }, []);

  useEffect(() => {
    open();
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [open]);

  const send = useCallback((type: string, payload?: unknown, messageId?: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify(createEnvelope(type, payload, messageId)));
    return true;
  }, []);

  const reconnect = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = undefined;
    attemptRef.current = 0;
    wsRef.current?.close();
    wsRef.current = null;
    open();
  }, [open]);

  return { status, send, reconnect };
}