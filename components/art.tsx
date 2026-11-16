/**
 * Inline illustrations in the app's palette. They read CSS variables, so they follow dark mode.
 * Everything is decorative (aria-hidden); the surrounding text carries the meaning.
 */

const B = 'var(--brand)';
const BP = 'var(--brand-pale)';
const BS = 'var(--brand-solid)';
const W = 'var(--warm)';
const WP = 'var(--warm-pale)';
const S = 'var(--surface)';
const L = 'var(--line-strong)';
const SKY = 'var(--sky)';
const SKYP = 'var(--sky-pale)';

/** The bottle in the app icon, drawn as an outline-free glyph. */
function Bottle({
  x,
  y,
  s = 1,
  body = S,
  stroke = B,
}: {
  x: number;
  y: number;
  s?: number;
  body?: string;
  stroke?: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-7 -40a7 7 0 0 1 14 0v5h-14z" fill={stroke} />
      <rect x="-15" y="-35" width="30" height="10" rx="4" fill={stroke} />
      <path
        d="M-21 -17a6 6 0 0 1 6-6h30a6 6 0 0 1 6 6v47a14 14 0 0 1-14 14h-14a14 14 0 0 1-14-14z"
        fill={body}
        stroke={stroke}
        strokeWidth="3"
      />
      <rect x="-12" y="-2" width="14" height="4" rx="2" fill={stroke} opacity=".55" />
      <rect x="-12" y="10" width="8" height="4" rx="2" fill={stroke} opacity=".55" />
      <rect x="-12" y="22" width="14" height="4" rx="2" fill={stroke} opacity=".55" />
    </g>
  );
}
function Star({x, y, s = 1, fill = W}: {x: number; y: number; s?: number; fill?: string}) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 -9c1.2 4.6 3.4 6.8 8 8c-4.6 1.2-6.8 3.4-8 8c-1.2-4.6-3.4-6.8-8-8c4.6-1.2 6.8-3.4 8-8z"
      fill={fill}
    />
  );
}
function Cloud({x, y, s = 1, fill = S}: {x: number; y: number; s?: number; fill?: string}) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M-30 10a12 12 0 0 1 2-23.8a16 16 0 0 1 30-6a12 12 0 0 1 20 10a10 10 0 0 1-2 19.8z"
      fill={fill}
      opacity=".9"
    />
  );
}

/** Sign-in / onboarding hero: a night-time nursery scene with the bottle at the centre. */
export function HeroArt({className = ''}: {className?: string}) {
  return (
    <svg viewBox="0 0 320 180" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="hero-glow" cx="50%" cy="60%" r="60%">
          <stop offset="0%" stopColor={BP} />
          <stop offset="100%" stopColor={BP} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="160" cy="110" rx="150" ry="70" fill="url(#hero-glow)" />
      <path d="M246 44a26 26 0 1 0 12 48a22 22 0 1 1-12-48z" fill={W} opacity=".85" />
      <Star x={62} y={46} s={1.1} />
      <Star x={100} y={28} s={0.7} fill={B} />
      <Star x={214} y={30} s={0.8} />
      <Star x={282} y={96} s={0.6} fill={B} />
      <Cloud x={70} y={100} s={1.1} />
      <Cloud x={262} y={128} s={0.9} />
      <ellipse cx="160" cy="154" rx="78" ry="10" fill={L} opacity=".45" />
      <Bottle x={160} y={112} s={1.25} />
      <circle cx="118" cy="140" r="6" fill={BS} opacity=".35" />
      <circle cx="206" cy="146" r="4" fill={W} opacity=".6" />
    </svg>
  );
}

export type EmptyKind = 'baby' | 'feeds' | 'growth' | 'moments' | 'calendar';

/** Small scene for an empty list. */
export function EmptyArt({kind, className = ''}: {kind: EmptyKind; className?: string}) {
  return (
    <svg viewBox="0 0 160 110" className={className} aria-hidden="true">
      <ellipse cx="80" cy="96" rx="52" ry="7" fill={L} opacity=".4" />
      {kind === 'baby' && (
        <>
          {/* bassinet */}
          <path
            d="M28 46h104v18a26 26 0 0 1-26 26H54a26 26 0 0 1-26-26z"
            fill={BP}
            stroke={B}
            strokeWidth="3"
          />
          <path d="M28 46c0-18 14-30 52-30s52 12 52 30" fill={S} stroke={B} strokeWidth="3" />
          <path d="M60 46v44M80 46v44M100 46v44" stroke={B} strokeWidth="2" opacity=".35" />
          <path d="M80 36c-3-6-12-5-12 2c0 6 12 12 12 12s12-6 12-12c0-7-9-8-12-2z" fill={W} />
          <Star x={128} y={22} s={0.8} />
          <Star x={34} y={26} s={0.6} fill={B} />
        </>
      )}
      {kind === 'feeds' && (
        <>
          <Bottle x={72} y={56} s={0.95} />
          <Bottle x={108} y={62} s={0.7} body={WP} stroke={W} />
          <Star x={40} y={34} s={0.9} />
          <Star x={128} y={26} s={0.7} fill={B} />
        </>
      )}
      {kind === 'growth' && (
        <>
          {/* ruler */}
          <rect x="30" y="70" width="100" height="20" rx="6" fill={WP} stroke={W} strokeWidth="3" />
          {[42, 54, 66, 78, 90, 102, 114].map((x, i) => (
            <path key={x} d={`M${x} 70v${i % 2 ? 6 : 10}`} stroke={W} strokeWidth="2.5" />
          ))}
          {/* sprout */}
          <path d="M80 70V40" stroke={B} strokeWidth="4" strokeLinecap="round" />
          <path d="M80 52c-16 0-24-10-24-22c14 0 24 8 24 22z" fill={BS} />
          <path d="M80 44c12 0 22-8 22-20c-12 0-22 6-22 20z" fill={B} opacity=".75" />
        </>
      )}
      {kind === 'moments' && (
        <>
          <rect
            x="40"
            y="28"
            width="80"
            height="62"
            rx="10"
            fill={S}
            stroke={B}
            strokeWidth="3"
            transform="rotate(-6 80 59)"
          />
          <rect x="50" y="38" width="60" height="38" rx="5" fill={SKYP} transform="rotate(-6 80 59)" />
          <circle cx="68" cy="50" r="6" fill={W} transform="rotate(-6 80 59)" />
          <path d="M52 74l16-16l12 10l10-8l18 14z" fill={SKY} opacity=".8" transform="rotate(-6 80 59)" />
          <Star x={126} y={30} s={0.9} />
          <Star x={36} y={88} s={0.6} fill={B} />
        </>
      )}
      {kind === 'calendar' && (
        <>
          <rect x="36" y="30" width="88" height="62" rx="10" fill={S} stroke={B} strokeWidth="3" />
          <rect x="36" y="30" width="88" height="18" rx="8" fill={BP} />
          <path d="M56 24v12M104 24v12" stroke={B} strokeWidth="3" strokeLinecap="round" />
          {[0, 1, 2, 3, 4].map(i => (
            <rect key={i} x={48 + i * 14} y="56" width="8" height="8" rx="2" fill={L} />
          ))}
          {[0, 1, 2].map(i => (
            <rect key={i} x={48 + i * 14} y="70" width="8" height="8" rx="2" fill={L} />
          ))}
          <path d="M100 70c-2-4-8-3-8 1c0 4 8 8 8 8s8-4 8-8c0-4-6-5-8-1z" fill={W} />
        </>
      )}
    </svg>
  );
}
