import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageType,
  findScene,
  getTalkingPoints,
  sceneGroups,
  type Envelope,
  type QuestInfo,
  type ServerConfigPayload,
  type SessionCreatedPayload,
} from '@shared';
import { getConfig } from '../lib/api';
import { useBuildMasterWs } from '../lib/ws';
import { hostnameOf, formatTime } from '../lib/format';
import { StatusPill, type PillState } from '../components/StatusPill';
import { SceneButton } from '../components/SceneButton';
import { QrCard } from '../components/QrCard';
import { CopyButton } from '../components/CopyButton';
import { TalkingPointsCard } from '../components/TalkingPointsCard';
import {
  ExternalLink,
  MapPin,
  Plus,
  Trash2,
} from 'lucide-react';

const SESSION_KEY = 'bmvr.session.v1';
const PENDING_TIMEOUT_MS = 20_000;

interface SavedSession {
  sessionId: string;
  code: string;
  token: string;
}

export function ControlPage() {
  const [config, setConfig] = useState<ServerConfigPayload | null>(null);
  const [session, setSession] = useState<SessionCreatedPayload | null>(null);
  const [quests, setQuests] = useState<QuestInfo[]>([]);
  const [currentSceneId, setCurrentSceneId] = useState<string | null>(null);
  const [pendingSceneId, setPendingSceneId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [host, setHost] = useState('');

  const pendingRef = useRef<string | null>(null);
  const pendingTimerRef = useRef<number | undefined>(undefined);
  const sendRef = useRef<(t: string, p?: unknown, m?: string) => boolean>(() => false);

  const clearPending = useCallback(() => {
    pendingRef.current = null;
    setPendingSceneId(null);
    if (pendingTimerRef.current) {
      window.clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = undefined;
    }
  }, []);

  const onWsMessage = useCallback(
    (msg: Envelope) => {
      const p = (msg.payload ?? {}) as Record<string, unknown>;
      switch (msg.type) {
        case MessageType.ClientRegistered:
          try {
            const raw = localStorage.getItem(SESSION_KEY);
            if (raw) {
              const saved = JSON.parse(raw) as SavedSession;
              sendRef.current(MessageType.SessionCreate, {
                resumeCode: saved.code,
                resumeToken: saved.token,
              });
            }
          } catch {
            /* localStorage no disponible */
          }
          break;

        case MessageType.SessionCreated:
          setSession(p as unknown as SessionCreatedPayload);
          setQuests((p.quests as QuestInfo[]) ?? []);
          setCurrentSceneId(null);
          setNotice(null);
          try {
            localStorage.setItem(
              SESSION_KEY,
              JSON.stringify({ sessionId: p.sessionId, code: p.code, token: p.token }),
            );
          } catch {
            /* ignore */
          }
          break;

        case MessageType.SessionClosed:
          setSession(null);
          setQuests([]);
          setCurrentSceneId(null);
          clearPending();
          try {
            localStorage.removeItem(SESSION_KEY);
          } catch {
            /* ignore */
          }
          setNotice('Sesión terminada.');
          break;

        case MessageType.QuestConnected:
          setQuests((prev) => {
            const next = prev.filter((q) => q.clientId !== p.clientId);
            return [
              ...next,
              {
                clientId: p.clientId as string,
                deviceName: (p.deviceName as string) ?? 'META QUEST',
                connected: true,
                lastSeen: Date.now(),
              },
            ];
          });
          setNotice(null);
          break;

        case MessageType.QuestDisconnected:
          setQuests((prev) =>
            prev.map((q) => (q.clientId === p.clientId ? { ...q, connected: false } : q)),
          );
          break;

        case MessageType.SceneChanged:
        case MessageType.SceneCurrent:
          setCurrentSceneId(p.sceneId as string);
          if (pendingRef.current === p.sceneId) clearPending();
          setNotice(null);
          break;

        case MessageType.SceneChangeFailed:
          if (pendingRef.current === p.sceneId) clearPending();
          setNotice(
            `No se pudo cambiar a esa escena${p.reason ? ` (${String(p.reason)})` : ''}`,
          );
          break;

        case MessageType.Error:
          clearPending();
          setNotice((p.message as string) ?? (p.code as string) ?? 'Error del servidor');
          break;

        default:
          break;
      }
    },
    [clearPending],
  );

  const { status, send, reconnect } = useBuildMasterWs(onWsMessage, {
    role: 'ADVISOR',
    deviceName: 'LAPTOP',
  });
  sendRef.current = send;

  useEffect(() => {
    getConfig()
      .then((c) => {
        setConfig(c);
        setHost(hostnameOf(c.baseUrl) || c.localIps[0] || 'localhost');
      })
      .catch(() => setNotice('No se pudo obtener la configuración del servidor.'));
  }, []);

  const handleCreateSession = useCallback(() => {
    setNotice(null);
    if (!send(MessageType.SessionCreate, {})) setNotice('No conectado al servidor.');
  }, [send]);

  const handleEndSession = useCallback(() => {
    send(MessageType.SessionLeave, {});
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
    setSession(null);
    setQuests([]);
    setCurrentSceneId(null);
    clearPending();
  }, [send, clearPending]);

  const handleSceneClick = useCallback(
    (sceneId: string) => {
      if (!session || pendingRef.current) return;
      pendingRef.current = sceneId;
      setPendingSceneId(sceneId);
      setNotice(null);
      if (!send(MessageType.SceneChange, { sceneId })) {
        clearPending();
        setNotice('No conectado al servidor.');
        return;
      }
      if (pendingTimerRef.current) window.clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = window.setTimeout(() => {
        if (pendingRef.current === sceneId) {
          clearPending();
          setNotice('Sin respuesta del Quest (timeout).');
        }
      }, PENDING_TIMEOUT_MS);
    },
    [session, send, clearPending],
  );

  const wsPill: PillState =
    status === 'connected' ? 'connected' : status === 'connecting' ? 'connecting' : 'disconnected';

  const questConnected = quests.some((q) => q.connected);
  const questPill: PillState = session
    ? questConnected
      ? 'connected'
      : 'connecting'
    : 'disconnected';

  const joinUrl =
    session && config
      ? `http://${host}:${config.httpPort}/quest?session=${session.code}&token=${session.token}`
      : '';

  const currentScene = currentSceneId ? findScene(currentSceneId) : null;
  const currentTalkingPoints = currentSceneId ? getTalkingPoints(currentSceneId) : [];

  const hostOptions = useRef<string[]>([]);
  if (config && hostOptions.current.length === 0) {
    hostOptions.current = [
      ...new Set([
        hostnameOf(config.baseUrl),
        config.requestHost,
        ...config.localIps,
      ]),
    ].filter(Boolean) as string[];
  }

  const lastComm = quests.reduce<number | null>(
    (acc, q) => (q.lastSeen && (!acc || q.lastSeen > acc) ? q.lastSeen : acc),
    null,
  );

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-50 sm:text-3xl">
            Build Master VR
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-zinc-400">
            <span className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs font-bold tracking-widest text-zinc-200">
              {config?.project.name ?? 'ZIMÁ'}
            </span>
            <span className="text-zinc-600">·</span>
            <span>{config?.project.tourName ?? 'Tour principal'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill state={wsPill} label={status === 'connected' ? 'Servidor' : 'Servidor'} />
        </div>
      </section>

      {notice && (
        <div
          className="card border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-200"
          role="alert"
        >
          {notice}
        </div>
      )}

      {!session ? (
        <section className="card flex flex-col items-center gap-6 px-6 py-14 text-center">
          <img
            src="/branding/BM logotipo blanco.png"
            alt="Logotipo Build Master"
            className="h-12 w-auto max-w-[75%] object-contain"
          />
          <div className="max-w-md space-y-2">
            <h2 className="text-xl font-bold text-zinc-50">Nueva presentación</h2>
            <p className="text-sm leading-relaxed text-zinc-400">
              Crea una sesión para conectar un Meta Quest. Recibirás un código y un QR para que el
              Quest se una a esta sesión.
            </p>
          </div>
          <button type="button" onClick={handleCreateSession} className="btn-primary px-6 py-3 text-base">
            <Plus className="h-5 w-5" />
            Nueva sesión
          </button>
          {config && (
            <a
              href={config.project.tourUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-500 transition hover:text-zinc-300"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Abrir tour D5
            </a>
          )}
        </section>
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-[1fr_auto]">
            <div className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                    Código de sesión
                  </p>
                  <p className="mt-1 font-mono text-4xl font-extrabold tracking-tight text-zinc-50 sm:text-5xl">
                    {session.code}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                      Token
                    </p>
                    <p className="font-mono text-xl font-extrabold tracking-tight text-sky-300 sm:text-2xl">
                      {session.token}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <QrCard value={joinUrl} />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    Escanea en el Quest
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor="host-select">
                  Servidor (IP)
                </label>
                <select
                  id="host-select"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-semibold text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                >
                  {hostOptions.current.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <CopyButton text={session.code} label="Copiar código" />
                <CopyButton text={joinUrl} label="Copiar enlace" />
                <Link
                  to={`/setup?session=${session.code}&token=${session.token}&host=${encodeURIComponent(host)}`}
                  className="btn-ghost"
                >
                  <MapPin className="h-4 w-4" />
                  Bookmarklet de sesión
                </Link>
                <button type="button" onClick={handleEndSession} className="btn-ghost text-rose-300">
                  <Trash2 className="h-4 w-4" />
                  Terminar
                </button>
              </div>
            </div>

            <div className="card min-w-[260px] p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Quest</p>
                <StatusPill
                  state={questPill}
                  label={questConnected ? 'Conectado' : quests.length > 0 ? 'Reconectando…' : 'Esperando…'}
                />
              </div>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-zinc-500">Dispositivo</dt>
                  <dd className="truncate font-semibold text-zinc-200">
                    {quests.filter((q) => q.connected).map((q) => q.deviceName).join(', ') ||
                      quests.map((q) => q.deviceName).join(', ') ||
                      '—'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-zinc-500">Última comunicación</dt>
                  <dd className="font-semibold text-zinc-200">{formatTime(lastComm)}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-zinc-500">Servidor</dt>
                  <dd className="font-mono text-xs text-zinc-300">
                    {host}:{config?.httpPort ?? '?'}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-[11px] leading-relaxed text-zinc-500">
                El Quest debe abrir el tour D5 y ejecutar el bookmarklet{' '}
                <span className="font-semibold text-zinc-300">BUILD MASTER VR CONNECT</span>.
              </p>
            </div>
          </section>

          <section className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                Escena actual
              </p>
              <p className="text-xl font-extrabold tracking-tight text-emerald-300 sm:text-2xl">
                {currentScene ? currentScene.label : '—'}
              </p>
            </div>
          </section>

          <TalkingPointsCard
            title={currentScene ? currentScene.label : '—'}
            points={currentTalkingPoints}
          />

          <section className="space-y-8">
            {sceneGroups.map((group) => {
              const groupScenes = session.scenes.filter((s) => s.group === group.id);
              if (groupScenes.length === 0) return null;
              return (
                <div key={group.id}>
                  <h2 className="mb-3 text-sm font-extrabold uppercase tracking-[0.25em] text-zinc-500">
                    {group.label}
                  </h2>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {groupScenes.map((scene) => (
                      <SceneButton
                        key={scene.id}
                        label={scene.label}
                        active={currentSceneId === scene.id}
                        pending={pendingSceneId === scene.id}
                        disabled={Boolean(pendingSceneId)}
                        onClick={() => handleSceneClick(scene.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        </>
      )}

      <div className="flex items-center justify-center gap-2 pb-4 text-[11px] text-zinc-600">
        {status !== 'connected' && (
          <button
            type="button"
            onClick={reconnect}
            className="rounded-lg border border-zinc-700 px-2 py-1 font-semibold text-zinc-400 hover:text-zinc-200"
          >
            Reconectar
          </button>
        )}
      </div>
    </div>
  );
}