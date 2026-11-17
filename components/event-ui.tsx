import type {SVGProps} from 'react';
import {Bath, Moon, Pill, Thermometer, ToyBrick, type LucideProps} from 'lucide-react';
import type {EventKind} from '@/lib/types';

/** A diaper, drawn to match the lucide icon style (lucide has none). */
export function DiaperIcon({size = 24, strokeWidth = 2, ...props}: LucideProps & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M3 6h18v4a9 9 0 0 1-18 0Z" />
      <path d="M8.5 6v3.5a3.5 3.5 0 0 0 7 0V6" />
    </svg>
  );
}

export const eventIcon: Record<EventKind, (props: LucideProps) => React.ReactNode> = {
  sleep: props => <Moon {...props} />,
  diaper: props => <DiaperIcon {...props} />,
  tummy: props => <ToyBrick {...props} />,
  bath: props => <Bath {...props} />,
  medicine: props => <Pill {...props} />,
  temperature: props => <Thermometer {...props} />,
};
/** Text and tint colors per kind; the strip on the Records page uses `bar`. */
export const eventTone: Record<EventKind, {text: string; pale: string; bar: string}> = {
  sleep: {text: 'text-(--plum)', pale: 'bg-(--plum-pale)', bar: 'var(--plum)'},
  diaper: {text: 'text-(--warm)', pale: 'bg-(--warm-pale)', bar: 'var(--warm)'},
  tummy: {text: 'text-(--brand)', pale: 'bg-(--brand-pale)', bar: 'var(--brand)'},
  bath: {text: 'text-(--sky)', pale: 'bg-(--sky-pale)', bar: 'var(--sky)'},
  medicine: {text: 'text-(--danger)', pale: 'bg-(--danger-pale)', bar: 'var(--danger)'},
  temperature: {text: 'text-(--alert)', pale: 'bg-(--alert-pale)', bar: 'var(--alert)'},
};

/** Round tinted badge with the kind's icon. */
export function EventBadge({kind, size = 36}: {kind: EventKind; size?: number}) {
  const tone = eventTone[kind];
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full ${tone.pale} ${tone.text}`}
      style={{width: size, height: size}}
    >
      {eventIcon[kind]({size: Math.round(size * 0.5)})}
    </span>
  );
}
