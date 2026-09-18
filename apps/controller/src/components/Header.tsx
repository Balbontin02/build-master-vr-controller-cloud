import { Link } from 'react-router-dom';
import { InstallPwa } from './InstallPwa';

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-800/80 bg-zinc-950/85 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/control" className="flex min-w-0 items-center gap-3">
          <img
            src="/branding/BM isotipo blanco.png"
            alt="Isotipo Build Master"
            className="h-9 w-auto shrink-0"
          />
          <div className="leading-tight">
            <p className="text-sm font-extrabold tracking-wide text-zinc-100">BUILD MASTER</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-500">
              VR Controller
            </p>
          </div>
        </Link>
        <nav className="flex items-center gap-1 text-xs font-semibold text-zinc-400">
          <Link
            to="/control"
            className="rounded-lg px-2.5 py-2 transition hover:bg-zinc-800 hover:text-zinc-200"
          >
            Control
          </Link>
          <Link
            to="/setup"
            className="hidden rounded-lg px-2.5 py-2 transition hover:bg-zinc-800 hover:text-zinc-200 sm:inline-flex"
          >
            Setup
          </Link>
          <Link
            to="/diagnostics"
            className="hidden rounded-lg px-2.5 py-2 transition hover:bg-zinc-800 hover:text-zinc-200 md:inline-flex"
          >
            Diag
          </Link>
          <Link
            to="/simulator"
            className="hidden rounded-lg px-2.5 py-2 transition hover:bg-zinc-800 hover:text-zinc-200 md:inline-flex"
          >
            Sim
          </Link>
          <InstallPwa />
        </nav>
      </div>
    </header>
  );
}