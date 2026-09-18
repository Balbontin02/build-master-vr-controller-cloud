import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bookmark,
  Bug,
  ClipboardCheck,
  Globe,
  MonitorSmartphone,
  RefreshCw,
  ShieldAlert,
  Wifi,
} from 'lucide-react';
import { getBookmarklet, getConfig } from '../lib/api';
import { buildBookmarklet } from '../lib/bookmarklet';
import { CopyButton } from '../components/CopyButton';
import { hostnameOf } from '../lib/format';

export function SetupPage() {
  const [params] = useSearchParams();
  const [bundle, setBundle] = useState('');
  const [bookmarkletName] = useState('BUILD MASTER VR CONNECT');
  const [error, setError] = useState<string | null>(null);

  const [httpPort, setHttpPort] = useState(3000);
  const [httpsPort, setHttpsPort] = useState(3443);
  const [hostOptions, setHostOptions] = useState<string[]>([]);
  const [host, setHost] = useState('');
  const [code, setCode] = useState((params.get('session') ?? '').toUpperCase());
  const [token, setToken] = useState(params.get('token') ?? '');
  const [deviceName, setDeviceName] = useState('');
  const [debug, setDebug] = useState(false);
  const [productionWssUrl, setProductionWssUrl] = useState(import.meta.env.VITE_PRODUCTION_WSS_URL || '');

  useEffect(() => {
    getConfig()
      .then((c) => {
        setHttpPort(c.httpPort);
        setHttpsPort(c.httpsPort);
        const hosts = [...new Set([hostnameOf(c.baseUrl), c.requestHost, ...c.localIps])].filter(
          Boolean,
        ) as string[];
        setHostOptions(hosts);
        setHost(params.get('host') || hosts[0] || 'localhost');
      })
      .catch(() => setError('No se pudo cargar la configuración del servidor.'));
    getBookmarklet()
      .then((b) => setBundle(b.bundle))
      .catch(() => setError('El bookmarklet aún no existe. Ejecuta: npm run build:bookmarklet'));
  }, [params]);

  const cfg = useMemo(() => {
    const c: Record<string, unknown> = {
      ws: `ws://${host}:${httpPort}/ws`,
      wss: `wss://${host}:${httpsPort}/ws`,
    };
    if (productionWssUrl.trim()) c.wss = productionWssUrl.trim();
    if (code.trim()) c.code = code.trim().toUpperCase();
    if (token.trim()) c.token = token.trim();
    if (deviceName.trim()) c.deviceName = deviceName.trim();
    if (debug) c.debug = true;
    return c;
  }, [host, httpPort, httpsPort, code, token, deviceName, debug, productionWssUrl]);

  const bookmarklet = useMemo(
    () => (bundle ? buildBookmarklet(bundle, cfg) : ''),
    [bundle, cfg],
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="card p-6">
        <h1 className="text-xl font-extrabold text-zinc-50">Setup del Quest</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Genera el favorito (bookmarklet) que conecta el Meta Quest al servidor. El código se
          genera automáticamente desde el Quest Bridge: una sola fuente, sin versiones duplicadas.
        </p>
      </section>

      {error && (
        <div className="card border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-200">
          {error}
        </div>
      )}

      <section className="card p-6">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-400">
          <Globe className="h-4 w-4" /> 1 · Servidor
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold text-zinc-500">IP del servidor</span>
            <select
              value={host}
              onChange={(e) => setHost(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-semibold text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              {hostOptions.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-3">
            <div>
              <p className="text-xs font-semibold text-zinc-500">HTTP (ws://)</p>
              <p className="font-mono text-sm text-zinc-300">:{httpPort}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-500">HTTPS (wss://)</p>
              <p className="font-mono text-sm text-zinc-300">:{httpsPort}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-400">
          <ShieldAlert className="h-4 w-4" /> Producción (Vercel)
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          URL del WebSocket seguro (wss://) en producción. Si se define, el bookmarklet generado la
          usará directamente en el Quest, sin pedir IP. Debe ser la URL completa del endpoint WebSocket
          del servidor persistente (ej. <code className="text-zinc-300">wss://mi-servidor.railway.app/ws</code>).
        </p>
        <label className="block mt-3">
          <span className="text-xs font-semibold text-zinc-500">Producción WSS URL</span>
          <input
            value={productionWssUrl}
            onChange={(e) => setProductionWssUrl(e.target.value)}
            placeholder="wss://mi-servidor.railway.app/ws"
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-mono text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          />
        </label>
        {import.meta.env.VITE_PRODUCTION_WSS_URL && (
          <p className="mt-2 text-xs text-emerald-300">
            Valor por defecto (build): <code className="font-mono text-zinc-200">{import.meta.env.VITE_PRODUCTION_WSS_URL}</code>
          </p>
        )}
      </section>

      <section className="card p-6">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-400">
          <MonitorSmartphone className="h-4 w-4" /> 2 · Sesión (opcional)
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Recomendado: <b>déjalo vacío</b>. El favorito queda genérico y, al ejecutarlo, te pedirá el
          código y el token por pantalla. Así sirve para cualquier sesión y para reinicios del
          servidor. Solo rellena si quieres que el Quest se conecte automáticamente a una sesión en
          concreto.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs font-semibold text-zinc-500">Código (ZIMA-XXXX)</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ZIMA-7421"
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-mono text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold text-zinc-500">Token (secreto)</span>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="token generado por el asesor"
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-mono text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            />
          </label>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold text-zinc-500">Nombre del dispositivo</span>
            <input
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="META QUEST"
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            />
          </label>
          <label className="flex cursor-pointer items-center gap-2 self-end pb-2">
            <input
              type="checkbox"
              checked={debug}
              onChange={(e) => setDebug(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 accent-sky-400"
            />
            <span className="flex items-center gap-1.5 text-sm font-semibold text-zinc-300">
              <Bug className="h-4 w-4" /> Modo debug (overlay + logs)
            </span>
          </label>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-400">
          <Bookmark className="h-4 w-4" /> 3 · Bookmarklet
        </h2>
        <div className="mt-3 space-y-3">
          <div>
            <p className="text-xs font-semibold text-zinc-500">Nombre del favorito</p>
            <p className="font-mono text-sm font-bold text-zinc-100">{bookmarkletName}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-500">Código del bookmarklet</p>
            {bookmarklet ? (
              <div className="code-block">{bookmarklet}</div>
            ) : (
              <div className="code-block text-zinc-500">
                Generando… (necesita dist/build-master-vr-connect.bookmarklet.txt)
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={bookmarklet} label="Copiar bookmarklet" />
            <CopyButton text={bundle} label="Copiar bundle (.js)" />
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-400">
          <ClipboardCheck className="h-4 w-4" /> 4 · Crear el favorito en Meta Quest Browser
        </h2>
        <ol className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-400">
          <li>
            <span className="font-semibold text-zinc-200">1.</span> Abre una página cualquiera en el
            Meta Quest Browser y agrégala a favoritos (icono ⋮ → Añadir a favoritos).
          </li>
          <li>
            <span className="font-semibold text-zinc-200">2.</span> Edita el favorito y pega el
            código anterior en el campo de URL. Nómbralo <b>{bookmarkletName}</b>.
          </li>
          <li>
            <span className="font-semibold text-zinc-200">3.</span> Si el navegador elimina{' '}
            <span className="font-mono text-zinc-300">javascript:</span> al pegar, escribe
            manualmente <span className="font-mono text-zinc-300">javascript:</span> primero y pega
            el resto después.
          </li>
          <li>
            <span className="font-semibold text-zinc-200">4.</span> Abre el tour D5 y ejecuta el
            favorito. Si es el favorito genérico, te pedirá el <b>código</b> y el <b>token</b> de la
            sesión activa (los ves en el control).
          </li>
        </ol>
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className="text-xs leading-relaxed text-amber-200/90">
            El tour D5 se sirve por HTTPS. Los navegadores bloquean <b>ws://</b> desde páginas
            HTTPS, así que el bridge usa <b>wss://</b> contra el servidor local (puerto {httpsPort}).
            La primera vez, abre <span className="font-mono">https://{host}:{httpsPort}</span> en el
            Quest y acepta la advertencia de certificado (self-signed local). Una sola vez por red.
          </p>
        </div>
        <div className="mt-3 flex items-start gap-3 rounded-xl border border-zinc-700/60 p-4">
          <Wifi className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
          <p className="text-xs leading-relaxed text-zinc-400">
            Si pruebas desde un tour servido por <b>HTTP</b> (p. ej. localhost), el bridge usa{' '}
            <b>ws://</b> automáticamente. El simulador y la UI del asesor usan ws:// sin problemas
            porque se sirven por HTTP.
          </p>
        </div>
      </section>

      <section className="flex justify-center pb-4">
        <a href="/quest" className="btn-ghost">
          <RefreshCw className="h-4 w-4" />
          Abrir página de instrucciones para Quest
        </a>
      </section>
    </div>
  );
}