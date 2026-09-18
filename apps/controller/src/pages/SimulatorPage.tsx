import { useCallback, useRef, useState } from 'react';
import {
  MessageType,
  findScene,
  scenes,
  type Envelope,
} from '@shared';
import { useBuildMasterWs } from '../lib/ws';
import { StatusPill, type PillState } from '../components/StatusPill';
import { formatTime } from '../lib/format';
import { Radio, Send, Terminal } from 'lucide-react';

interface LogEntry {
  ts: number;
  dir: 'in' | 'out';
  type: string;
  payload: string;
}

export function SimulatorPage() {
  const [code, setCode] = useState('');
  const [token, setToken] = useState('');
  const [joined, setJoined] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentSceneId, setCurrentSceneId] = useState('scene_e3abad37db7b4b10a1eac5379ae180db');
  const [autoConfirm, setAutoConfirm] = useState(true);
  const [manualScene, setManualScene] = useState('scene_e3abad37db7b4b10a1eac5379ae180db');
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const sendRef = useRef<(t: string, p?: unknown, m?: string) => boolean>(() => false);
  const autoConfirmRef = useRef(autoConfirm);
  autoConfirmRef.current = autoConfirm;
  const currentSceneIdRef = useRef(currentSceneId);
  currentSceneIdRef.current = currentSceneId;

  const addLog = useCallback((dir: LogEntry['dir'], type: string, payload?: unknown) => {
    setLogs((prev) => [
      ...prev.slice(-99),
      { ts: Date.now(), dir, type, payload: JSON.stringify(payload ?? {}) },
    ]);
  }, []);

  const onWsMessage = useCallback(
    (msg: Envelope) => {
      const p = (msg.payload ?? {}) as Record<string, unknown>;
      addLog('in', msg.type, p);
      switch (msg.type) {
        case MessageType.SessionJoined:
          setJoined(true);
          setSessionId(p.sessionId as string);
          sendRef.current(MessageType.SceneCurrent, { sceneId: currentSceneIdRef.current });
          break;

        case MessageType.SceneChange:
          setCurrentSceneId(p.sceneId as string);
          if (autoConfirmRef.current) {
            window.setTimeout(() => {
              sendRef.current(MessageType.SceneChanged, {
                sceneId: p.sceneId,
                source: 'command',
              });
              addLog('out', MessageType.SceneChanged, {
                sceneId: p.sceneId,
                source: 'command',
              });
            }, 900);
          }
          break;

        case MessageType.SessionClosed:
          setJoined(false);
          setSessionId(null);
          break;

        default:
          break;
      }
    },
    [addLog],
  );

  const { status, send, reconnect } = useBuildMasterWs(onWsMessage);
  sendRef.current = send;

  const handleJoin = useCallback(() => {
    addLog('out', MessageType.ClientRegister, { role: 'QUEST', deviceName: 'SIMULADOR' });
    send(MessageType.ClientRegister, { role: 'QUEST', deviceName: 'SIMULADOR' });
    addLog('out', MessageType.SessionJoin, { code, token });
    send(MessageType.SessionJoin, { code: code.trim().toUpperCase(), token: token.trim() || undefined });
  }, [send, code, token, addLog]);

  const handleManualChange = useCallback(() => {
    send(MessageType.SceneChanged, { sceneId: manualScene, source: 'manual' });
    addLog('out', MessageType.SceneChanged, { sceneId: manualScene, source: 'manual' });
  }, [send, manualScene, addLog]);

  const currentScene = findScene(currentSceneId);
  const wsPill: PillState =
    status === 'connected' ? 'connected' : status === 'connecting' ? 'connecting' : 'disconnected';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-50">Simulador de Quest</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Simula un Meta Quest para probar el servidor sin hardware.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill state={wsPill} label="WebSocket" />
          {status !== 'connected' && (
            <button type="button" onClick={reconnect} className="btn-ghost">
              Reconectar
            </button>
          )}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-400">
          <Radio className="h-4 w-4" /> Unirse a una sesión
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs font-semibold text-zinc-500">Código</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ZIMA-7421"
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold text-zinc-500">Token (secreto)</span>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="token de la sesión"
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" onClick={handleJoin} className="btn-primary">
            <Send className="h-4 w-4" />
            Conectar como Quest
          </button>
          {joined && (
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
              Unido · {sessionId?.slice(0, 8) ?? ''}
            </span>
          )}
        </div>
      </section>

      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Escena actual</p>
            <p className="text-2xl font-extrabold text-zinc-50">
              {currentScene?.label ?? currentSceneId}
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-zinc-300">
            <input
              type="checkbox"
              checked={autoConfirm}
              onChange={(e) => setAutoConfirm(e.target.checked)}
              className="h-4 w-4 rounded accent-sky-400"
            />
            Confirmar cambios automáticamente
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block min-w-[220px] flex-1">
            <span className="text-xs font-semibold text-zinc-500">Simular navegación manual del cliente</span>
            <select
              value={manualScene}
              onChange={(e) => setManualScene(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              {scenes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={handleManualChange} className="btn-ghost">
            Cambio manual
          </button>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-400">
          <Terminal className="h-4 w-4" /> Registro de mensajes
        </h2>
        <div className="mt-3 max-h-80 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed">
          {logs.length === 0 ? (
            <p className="text-zinc-600">Sin mensajes todavía.</p>
          ) : (
            logs.map((l, i) => (
              <p key={i} className={l.dir === 'out' ? 'text-sky-300' : 'text-zinc-400'}>
                <span className="text-zinc-600">{formatTime(l.ts)}</span> [{l.dir === 'out' ? '→' : '←'}]
                {l.type} {l.payload}
              </p>
            ))
          )}
        </div>
      </section>
    </div>
  );
}