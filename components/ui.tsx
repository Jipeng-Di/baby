'use client';
import type {LucideIcon} from 'lucide-react';
import BabyAvatar from './BabyAvatar';
import {EmptyArt, type EmptyKind} from './art';
import {tr} from '@/lib/i18n';
import {babyName, type Baby} from '@/lib/types';

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

/** The pill row for switching between babies (used by Records, Growth and the timeline). */
export function BabyChips({
  babies,
  value,
  onChange,
  avatarUrls,
  label,
}: {
  babies: Baby[];
  value: string;
  onChange: (id: string) => void;
  avatarUrls?: Record<string, string>;
  label: string;
}) {
  if (babies.length < 2) return null;
  return (
    <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label={label}>
      {babies.map(b => {
        const on = value === b.id;
        return (
          <button
            key={b.id}
            type="button"
            aria-pressed={on}
            className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full py-1 pl-1 pr-4 font-semibold transition active:scale-[.97] ${on ? 'bg-(--brand-solid) text-white shadow-[0_6px_16px_rgba(19,105,79,.22)]' : 'border border-(--line) bg-(--surface) text-(--muted)'}`}
            onClick={() => onChange(b.id)}
          >
            <span className="scale-[.82]">
              <BabyAvatar baby={b} url={avatarUrls?.[b.id]} small onTint={on} />
            </span>
            {babyName(b)}
            {!b.is_active && <span className="text-xs opacity-70">{tr('已移出', 'removed')}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** An illustrated empty state with one line of copy and an optional action. */
export function EmptyState({
  kind,
  title,
  text,
  action,
  onAction,
}: {
  kind: EmptyKind;
  title: string;
  text?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className={`${card} flex flex-col items-center py-8 text-center`}>
      <EmptyArt kind={kind} className="h-28 w-40" />
      <p className="mt-3 text-base font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-xs text-sm leading-relaxed text-(--muted)">{text}</p>}
      {action && onAction && (
        <button type="button" className={`${primary} mt-5 w-auto! px-6`} onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  );
}
