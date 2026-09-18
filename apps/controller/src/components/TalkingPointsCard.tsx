import { useState } from 'react';
import { ChevronDown, NotebookPen } from 'lucide-react';

interface TalkingPointsCardProps {
  title: string;
  points: string[];
}

export function TalkingPointsCard({ title, points }: TalkingPointsCardProps) {
  const [open, setOpen] = useState(true);

  if (!points || points.length === 0) return null;

  return (
    <section className="card p-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
      >
        <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-500">
          <NotebookPen className="h-4 w-4 text-sky-300" />
          Talking Points
        </span>
        <span className="flex items-center gap-2 text-sm font-bold text-zinc-300">
          {title}
          <ChevronDown
            className={`h-4 w-4 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {open && (
        <ul className="mt-4 space-y-2.5">
          {points.map((point, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-zinc-200">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
              {point}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}