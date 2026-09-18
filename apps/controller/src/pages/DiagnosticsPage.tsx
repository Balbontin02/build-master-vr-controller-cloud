import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  CircleDot,
  Network,
  RefreshCw,
  Server as ServerIcon,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { getDiagnostics, type Diagnostics } from '../lib/api';
import { formatTime } from '../lib/format';
import { StatusPill } from '../components/StatusPill';

export function DiagnosticsPage() {
  const [data, setData] = useState<Diagnostics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getDiagnostics()
      .then(setData)
      .catch(() => setError('No se pudo cargar el diagnóstico.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const connectedClients = data?.clients.filter((c) => c.role === 'QUEST').length ?? 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-zinc-50">Diagnóstico</h1>
        <button type="button" onClick={load} className="btn-ghost" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refrescar
        </button>
      </section>

      {error && (
        <div className="card border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200">
          {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card p-5">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
            <ServerIcon className="h-4 w-4" /> Servidor
          </p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">Versión</dt>
              <dd className="font-semibold">{data?.server.version ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Uptime</dt>
              <dd className="font-semibold">{data ? `${data.server.uptime}s` : '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">HTTP / HTTPS</dt>
              <dd className="font-mono text-xs">
                :{data?.server.httpPort ?? '?'} / :{data?.server.httpsPort ?? '?'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Iniciado</dt>
              <dd className="font-semibold">{formatTime(data?.server.startedAt)}</dd>
            </div>
          </dl>
        </div>

        <div className="card p-5">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
            <Network className="h-4 w-4" /> WebSocket
          </p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">Estado</dt>
              <dd>
                <StatusPill
                  state={(data?.ws.connectedClients ?? 0) >= 0 ? 'connected' : 'disconnected'}
                  label="Activo"
                />
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Clientes conectados</dt>
              <dd className="font-semibold">{data?.ws.connectedClients ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Conexiones totales</dt>
              <dd className="font-semibold">{data?.ws.totalConnections ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Mensajes procesados</dt>
              <dd className="font-semibold">{data?.ws.messagesProcessed ?? '—'}</dd>
            </div>
          </dl>
        </div>

        <div className="card p-5">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
            <Activity className="h-4 w-4" /> Red local
          </p>
          <div className="mt-3">
            {data?.server.localIps.length ? (
              <ul className="space-y-1.5">
                {data.server.localIps.map((ip) => (
                  <li key={ip} className="font-mono text-sm text-zinc-200">
                    {ip}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500">Sin IP local detectada.</p>
            )}
          </div>
          <p className="mt-3 text-[11px] text-zinc-500">
            Usa estas IPs para que el Quest alcance el servidor (bookmarklet + QR).
          </p>
        </div>
      </section>

      <section className="card p-5">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
          <Users className="h-4 w-4" /> Sesiones activas ({data?.sessions.length ?? 0})
        </p>
        {!data || data.sessions.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No hay sesiones activas.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {data.sessions.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono font-bold text-zinc-100">{s.code}</p>
                  <div className="flex items-center gap-3 text-xs text-zinc-400">
                    <span className="inline-flex items-center gap-1">
                      <CircleDot className="h-3 w-3 text-emerald-400" /> Asesor{' '}
                      {s.advisorConnected ? 'conectado' : 'offline'}
                    </span>
                    <span>Quests: {s.quests.length}</span>
                    <span>{formatTime(s.lastActivity)}</span>
                  </div>
                </div>
                {s.quests.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {s.quests.map((q) => (
                      <li key={q.clientId} className="flex items-center justify-between text-sm">
                        <span className="truncate text-zinc-300">{q.deviceName}</span>
                        <span className="text-xs">
                          {q.connected ? (
                            <span className="font-semibold text-emerald-400">conectado</span>
                          ) : (
                            <span className="font-semibold text-rose-400">desconectado</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card p-5">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
          <ShieldCheck className="h-4 w-4" /> Clientes WebSocket
        </p>
        {!data || data.clients.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Sin clientes conectados.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-500">
                  <th className="py-2 pr-4">Rol</th>
                  <th className="py-2 pr-4">Dispositivo</th>
                  <th className="py-2 pr-4">Sesión</th>
                  <th className="py-2 pr-4">IP</th>
                  <th className="py-2">Último contacto</th>
                </tr>
              </thead>
              <tbody>
                {data.clients.map((c) => (
                  <tr key={c.id} className="border-b border-zinc-800/60 text-zinc-300">
                    <td className="py-2 pr-4 font-semibold">{c.role ?? '—'}</td>
                    <td className="py-2 pr-4">{c.deviceName ?? '—'}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{c.sessionId ? 'sí' : '—'}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{c.ip}</td>
                    <td className="py-2">{formatTime(c.lastSeen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="pb-4 text-center text-[11px] text-zinc-600">
        Quest bridge conectados: {connectedClients}. Para el detalle del bridge (KRPano detectado,
        versión, escena actual), abre el overlay dentro del tour D5 en el Quest.
      </p>
    </div>
  );
}