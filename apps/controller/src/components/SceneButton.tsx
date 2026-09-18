import { Check, Loader2 } from 'lucide-react';

interface SceneButtonProps {
  label: string;
  active: boolean;
  pending: boolean;
  disabled: boolean;
  onClick: () => void;
}

export function SceneButton({ label, active, pending, disabled, onClick }: SceneButtonProps) {
  let cls = 'btn-scene';
  if (active) cls += ' btn-scene-active';
  if (pending) cls += ' btn-scene-pending';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-busy={pending}
      className={cls}
    >
      {pending ? (
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      ) : active ? (
        <Check className="h-5 w-5" aria-hidden="true" />
      ) : null}
      {label}
    </button>
  );
}