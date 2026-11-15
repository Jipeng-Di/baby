'use client';
import type {LucideIcon} from 'lucide-react';

export const input = 'ui-input';
export const primary = 'ui-primary';
export const card = 'ui-card';

export function PageIntro({title}: {title: string}) {
  return (
    <header className="px-1">
      <h1 className="page-title">{title}</h1>
    </header>
  );
}
export function Alert({text, good = false}: {text: string; good?: boolean}) {
  return (
    <p
      role={good ? 'status' : 'alert'}
      className={`mt-4 rounded-2xl p-4 text-sm ${good ? 'bg-(--brand-pale) text-(--brand)' : 'bg-(--danger-pale) text-(--danger)'}`}
    >
      {text}
    </p>
  );
}

/** A full-screen one-line notice, used while the app is loading or redirecting. */
export function FullScreenNote({text}: {text: string}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center justify-center text-(--muted)">
      {text}
    </main>
  );
}

export type SegmentOption<T extends string | number> = {value: T; label: string; icon?: LucideIcon};
/** A pill-shaped switch between a few options (tabs or ranges). */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  tabs = false,
}: {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  /** Render as a tablist (the options switch views) instead of a button group. */
  tabs?: boolean;
}) {
  return (
    <div
      className="flex rounded-[18px] border border-(--rim)/80 bg-(--chip)/80 p-1.5 shadow-inner"
      role={tabs ? 'tablist' : 'group'}
      aria-label={label}
    >
      {options.map(({value: key, label: text, icon: Icon}) => {
        const on = value === key;
        return (
          <button
            key={key}
            type="button"
            role={tabs ? 'tab' : undefined}
            aria-selected={tabs ? on : undefined}
            aria-pressed={tabs ? undefined : on}
            className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[14px] font-semibold transition ${on ? 'bg-(--paper) text-(--brand) shadow-[0_3px_12px_rgba(30,67,52,.09)]' : 'text-(--muted)'}`}
            onClick={() => onChange(key)}
          >
            {Icon && <Icon size={18} />}
            {text}
          </button>
        );
      })}
    </div>
  );
}
