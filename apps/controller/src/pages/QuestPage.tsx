import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ExternalLink,
  Eye,
  MousePointerClick,
  QrCode,
  Smartphone,
  Wifi,
} from 'lucide-react';
import { getConfig } from '../lib/api';
import { CopyButton } from '../components/CopyButton';

export function QuestPage() {
  const [params] = useSearchParams();
  const session = (params.get('session') ?? '').toUpperCase();
  const [baseUrl, setBaseUrl] = useState('');
  const [tourUrl, setTourUrl] = useState('');
  const [tourName, setTourName] = useState('');

  useEffect(() => {
    getConfig()
      .then((c) => {
        setBaseUrl(c.baseUrl);
        setTourUrl(c.project.tourUrl);
        setTourName(c.project.tourName);
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="card p-6 text-center">
        <h1 className="text-2xl font-extrabold text-zinc-50">Conexión de Meta Quest</h1>
        <p className="mt-2 text-sm text-zinc-400">
          El tour se abre en el navegador del Quest. Este asistente te guía paso a paso.
        </p>
        {session && (
          <div className="mt-6">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">
              Sesión para unirse
            </p>
            <p className="mt-1 font-mono text-5xl font-extrabold tracking-tight text-zinc-50">
              {session}
            </p>
          </div>
        )}
      </section>

      <ol className="space-y-4">
        <li className="card flex gap-4 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-300">
            <Wifi className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold text-zinc-100">Paso 1 · Misma red WiFi</p>
            <p className="mt-1 text-sm leading-relaxed text-zinc-400">
              Conecta el Meta Quest y la computadora del asesor a la misma red local.
            </p>
          </div>
        </li>

        <li className="card flex gap-4 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-300">
            <Eye className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-zinc-100">Paso 2 · Abre el tour D5</p>
            <p className="mt-1 text-sm leading-relaxed text-zinc-400">
              Abre el tour {tourName} en el Meta Quest Browser.
            </p>
            {tourUrl && (
              <a
                href={tourUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-sky-300 hover:text-sky-200"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir tour D5
              </a>
            )}
          </div>
        </li>

        <li className="card flex gap-4 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-300">
            <MousePointerClick className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-zinc-100">Paso 3 · Ejecuta el bookmarklet</p>
            <p className="mt-1 text-sm leading-relaxed text-zinc-400">
              Dentro del tour D5, ejecuta el favorito:{' '}
              <span className="font-semibold text-zinc-200">BUILD MASTER VR CONNECT</span>. Si aún
              no existe, el asesor debe crearlo una vez desde la página{' '}
              <span className="font-mono text-zinc-300">/setup</span>.
            </p>
            <p className="mt-2 text-[11px] text-zinc-500">
              Verás un panel pequeño de “BUILD MASTER VR” arriba a la izquierda cuando el bridge
              esté activo.
            </p>
          </div>
        </li>

        <li className="card flex gap-4 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold text-zinc-100">Paso 4 · Confirma la conexión</p>
            <p className="mt-1 text-sm leading-relaxed text-zinc-400">
              En la pantalla del asesor el Quest debe aparecer como{' '}
              <span className="font-semibold text-emerald-300">Conectado</span>.
            </p>
          </div>
        </li>
      </ol>

      {session && baseUrl && (
        <section className="card flex flex-col items-center gap-3 p-6">
          <QrCode className="h-6 w-6 text-zinc-400" />
          <p className="text-sm text-zinc-400">
            URL de esta sesión: <span className="font-mono text-zinc-200">{baseUrl}/quest</span>
          </p>
          <CopyButton text={`${baseUrl}/quest?session=${session}`} label="Copiar enlace de sesión" />
        </section>
      )}
    </div>
  );
}