import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

const IS_IOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

export function InstallPwa() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (isStandalone()) return undefined;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setPromptEvent(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (isStandalone()) return null;

  const handleInstall = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    setPromptEvent(null);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={promptEvent ? handleInstall : () => setShowHelp((v) => !v)}
        aria-expanded={!promptEvent && showHelp}
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700/70 bg-zinc-800/60 px-2.5 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-700/70"
      >
        <Download className="h-3.5 w-3.5" />
        {promptEvent ? 'Instalar app' : 'App'}
      </button>

      {!promptEvent && showHelp && (
        <div className="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-xs leading-relaxed text-zinc-300 shadow-xl">
          {IS_IOS ? (
            <>
              En <b>Safari</b>: toca <b>Compartir</b> y elige <b>Añadir a pantalla de inicio</b>.
            </>
          ) : (
            <>
              En el menú del navegador elige <b>Instalar aplicación</b> o{' '}
              <b>Añadir a pantalla de inicio</b>. En este servidor local por HTTP el instalador
              solo aparece sobre HTTPS (usa <span className="font-mono">https://IP:3443</span>).
            </>
          )}
        </div>
      )}
    </div>
  );
}