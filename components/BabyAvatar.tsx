import {babyName, type Baby} from '@/lib/types';
import {tr} from '@/lib/i18n';

/** Deterministic pastel pair for a baby without a photo, keyed on the id so it stays the same everywhere. */
function hue(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

export default function BabyAvatar({
  baby,
  url,
  small = false,
  tone = 'green',
  featured = false,
  onTint = false,
}: {
  baby: Baby;
  url?: string;
  small?: boolean;
  tone?: 'green' | 'warm';
  featured?: boolean;
  onTint?: boolean;
}) {
  const size = small
    ? 'h-11 w-11 rounded-xl text-lg'
    : featured
      ? 'h-14 w-14 rounded-[20px] text-2xl'
      : 'h-12 w-12 rounded-2xl text-xl';
  const ring = featured ? 'ring-4 ring-(--surface) shadow-[0_5px_14px_rgba(35,67,54,.14)]' : '';
  if (url)
    return (
      <img
        src={url}
        alt={tr(`${babyName(baby)}的头像`, `${babyName(baby)}’s photo`)}
        className={`${size} ${ring} shrink-0 object-cover`}
      />
    );
  // No photo: the first letter of the name on a soft gradient (girl → warm, boy → green, unknown → by id).
  const h = baby.sex === 'female' ? 22 : baby.sex === 'male' ? 160 : tone === 'warm' ? 22 : hue(baby.id);
  const initial = Array.from(babyName(baby).trim())[0]?.toUpperCase() ?? '·';
  return (
    <div
      className={`flex ${size} ${ring} shrink-0 items-center justify-center font-bold text-white ${onTint ? 'ring-2 ring-(--surface)' : ''}`}
      style={{
        background: `linear-gradient(145deg, hsl(${h} 45% 62%), hsl(${(h + 24) % 360} 50% 48%))`,
        textShadow: '0 1px 2px rgba(0,0,0,.18)',
      }}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}
