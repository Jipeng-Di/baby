'use client';
import {useMemo, useState} from 'react';
import {
  BookOpen,
  Cake,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  HeartPulse,
  Plus,
  ShieldAlert,
  Sprout,
} from 'lucide-react';
import BabyAvatar from './BabyAvatar';
import {Disclaimer, KIND, KindBadge, ReadLink, SourceLink, itemKind} from './timeline-ui';
import {AFTER_VACCINE, VACCINES, guideItem, say, type GuideItem} from '@/lib/guide';
import {
  ageOn,
  ageWindowLabel,
  buildTimeline,
  dueState,
  type Ages,
  type Timeline,
  type Upcoming,
} from '@/lib/timeline';
import {babyAge} from '@/lib/dates';
import {locale, tr, useLang} from '@/lib/i18n';
import {useRegion} from '@/lib/region';
import {babyName, type Baby, type Moment} from '@/lib/types';

export type GuideTab = 'milestone' | 'vaccine' | 'checkup' | 'health';

type Props = {
  babies: Baby[];
  avatarUrls: Record<string, string>;
  moments: Moment[];
  /** Signed photo URLs by storage path. */
  photoUrls: Record<string, string>;
  unavailable: boolean;
  today: string;
  onLog: (baby: Baby, item?: GuideItem) => void;
  onEdit: (moment: Moment) => void;
  onOpenGuide: (baby: Baby, tab?: GuideTab) => void;
  onLogVisit: (baby: Baby, items: GuideItem[]) => void;
};

/** How many future nodes sit above "today" before the rest fold away. */
const NEAR = 3;

const longDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString(locale(), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

/**
 * One line, newest at the top: what's ahead, then today, then everything the family has logged, down to
 * the day the baby was born.
 */
export default function TimelineView({
  babies,
  avatarUrls,
  moments,
  photoUrls,
  unavailable,
  today,
  onLog,
  onEdit,
  onOpenGuide,
  onLogVisit,
}: Props) {
  useLang();
  const region = useRegion();
  const [babyId, setBabyId] = useState(babies[0]?.id ?? '');
  const [showFar, setShowFar] = useState(false);
  // Falls back to the first baby if the chosen one is removed.
  const baby = babies.find(b => b.id === babyId) || babies[0];
  const timeline = useMemo(
    () => (baby ? buildTimeline(baby, moments, region, today) : null),
    [baby, moments, region, today],
  );
  if (!baby || !timeline)
    return (
      <div className="ui-card py-9 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-(--brand-pale)">
          <Sprout className="text-(--brand)" />
        </div>
        <p className="mt-4 text-(--muted)">
          {tr('添加宝宝后，就能看到成长时间线。', 'Add a baby to see their growth timeline.')}
        </p>
      </div>
    );
  // Furthest ahead at the top, so reading down is reading towards today.
  const near = timeline.upcoming.slice(0, NEAR).reverse();
  const far = timeline.upcoming.slice(NEAR).reverse();
  return (
    <>
      {babies.length > 1 && (
        <div
          className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
          aria-label={tr('选择宝宝', 'Choose baby')}
        >
          {babies.map(b => (
            <button
              key={b.id}
              aria-pressed={baby.id === b.id}
              className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full py-1 pl-1 pr-4 font-semibold transition ${baby.id === b.id ? 'bg-(--brand-solid) text-white shadow-[0_6px_16px_rgba(19,105,79,.22)]' : 'border border-(--line) bg-(--surface) text-(--muted)'}`}
              onClick={() => {
                setBabyId(b.id);
                setShowFar(false);
              }}
            >
              <span className="scale-[.82]">
                <BabyAvatar baby={b} url={avatarUrls[b.id]} small onTint={baby.id === b.id} />
              </span>
              {babyName(b)}
            </button>
          ))}
        </div>
      )}

      <ol className="relative space-y-3 pl-11 before:absolute before:bottom-5 before:left-[19px] before:top-4 before:w-0.5 before:rounded-full before:bg-(--line-strong)">
        {unavailable ? (
          <Node marker={<Dot tone="warm" />}>
            <div className="rounded-[20px] border border-(--warm-line) bg-(--warm-pale) px-4 py-3 text-sm leading-relaxed text-(--warm-ink)">
              {tr(
                '时间线的数据库还没开通，暂时不能记录。请先在 Supabase 运行 202611160001_baby_moments.sql。',
                'The timeline database isn’t set up yet, so entries can’t be saved. Run 202611160001_baby_moments.sql in Supabase first.',
              )}
            </div>
          </Node>
        ) : (
          <>
            {far.length > 0 && (
              <Node marker={<Dot tone="faint" />}>
                <button
                  type="button"
                  aria-expanded={showFar}
                  className="flex min-h-10 items-center gap-1.5 px-1 text-sm font-semibold text-(--muted)"
                  onClick={() => setShowFar(!showFar)}
                >
                  {showFar
                    ? tr('收起更远的安排', 'Hide later plans')
                    : tr(`之后还有 ${far.length} 项安排`, `${far.length} more later on`)}
                  {showFar ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </Node>
            )}
            {(showFar ? far : []).concat(near).map(node => (
              <UpcomingNode
                key={`${baby.id}-${node.kind}-${node.from}`}
                baby={baby}
                node={node}
                timeline={timeline}
                onLog={onLog}
                onEdit={onEdit}
                onLogVisit={onLogVisit}
              />
            ))}
          </>
        )}

        <TodayNode
          baby={baby}
          avatarUrl={avatarUrls[baby.id]}
          timeline={timeline}
          today={today}
          onOpenGuide={onOpenGuide}
          onLog={unavailable ? undefined : () => onLog(baby)}
        />

        {timeline.moments.map(m => (
          <MomentNode
            key={m.id}
            moment={m}
            birthday={baby.birthday}
            photoUrl={m.photo_path ? photoUrls[m.photo_path] : undefined}
            onEdit={onEdit}
          />
        ))}
        {timeline.moments.length === 0 && !unavailable && (
          <Node marker={<Dot tone="faint" />}>
            <p className="px-1 py-1 text-sm leading-relaxed text-(--muted)">
              {tr(
                '第一次微笑、第一次翻身、第一次洗澡……点“记录一个成长时刻”或上面的 ✓，把这些时刻留下来，家人手机上也能看到。',
                'First smile, first roll, first bath… tap “Add a moment” or a ✓ above to keep these moments. Your family sees them too.',
              )}
            </p>
          </Node>
        )}
        <Node
          marker={
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-(--warm) text-white ring-4 ring-(--canvas)">
              <Cake size={14} />
            </span>
          }
        >
          <div className="px-1 py-0.5">
            <p className="font-semibold text-(--warm-ink)">
              {tr(`${babyName(baby)} 出生啦`, `${babyName(baby)} was born`)}
            </p>
            <p className="text-sm text-(--muted)">{longDate(baby.birthday)}</p>
          </div>
        </Node>
      </ol>

      <button
        type="button"
        className="flex min-h-11 w-full items-center justify-center gap-2 text-sm font-semibold text-(--sky)"
        onClick={() => onOpenGuide(baby)}
      >
        <BookOpen size={16} />
        {tr('完整成长指南：0–2 岁里程碑、疫苗、体检', 'Full growth guide: milestones, vaccines, checkups')}
      </button>
      <Disclaimer />
    </>
  );
}

/** A list item on the line, with its marker centred on the line. */
function Node({marker, children}: {marker: React.ReactNode; children: React.ReactNode}) {
  return (
    <li className="relative">
      <span className="absolute left-[-24px] top-2.5 flex -translate-x-1/2 items-center justify-center">
        {marker}
      </span>
      {children}
    </li>
  );
}

function Dot({tone}: {tone: 'faint' | 'warm' | 'open'}) {
  const look = {
    faint: 'h-3 w-3 bg-(--line-strong)',
    warm: 'h-4 w-4 bg-(--warm)',
    open: 'h-4 w-4 border-2 border-(--line-strong) bg-(--canvas)',
  }[tone];
  return <span className={`block rounded-full ring-4 ring-(--canvas) ${look}`} />;
}

function TodayNode({
  baby,
  avatarUrl,
  timeline,
  today,
  onOpenGuide,
  onLog,
}: {
  baby: Baby;
  avatarUrl?: string;
  timeline: Timeline;
  today: string;
  onOpenGuide: (baby: Baby, tab?: GuideTab) => void;
  /** Opens the add-moment sheet; absent while the database isn't set up. */
  onLog?: () => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const {ages, phases, tips, care} = timeline;
  const important = tips.filter(t => t.important);
  const other = tips.length - important.length + care.length;
  const corrected = ages.isCorrected
    ? babyAge(
        shiftDate(baby.birthday, Math.round((ages.actual - ages.corrected) * 30.4375)),
        new Date(`${today}T12:00:00`),
      )
    : null;
  const notes = [...phases, ...important];
  return (
    <Node
      marker={
        <span className="rounded-full ring-4 ring-(--canvas)">
          <BabyAvatar baby={baby} url={avatarUrl} small />
        </span>
      }
    >
      <section
        aria-label={tr('今天', 'Today')}
        className="overflow-hidden rounded-[24px] border border-(--card-rim) bg-(--card-bg) shadow-[0_12px_32px_rgba(35,67,54,.08)]"
      >
        <div className="bg-[linear-gradient(135deg,var(--brand-pale),transparent_75%)] px-4 pb-3 pt-3.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-(--brand)">
            {tr('今天', 'Today')} · {longDate(today)}
          </p>
          <h2 className="mt-0.5 text-2xl font-bold tracking-tight">
            {babyAge(baby.birthday, new Date(`${today}T12:00:00`))}
          </h2>
          {corrected && (
            <p className="text-xs text-(--muted)">
              {tr(`矫正月龄 ${corrected}`, `Corrected age ${corrected}`)}
            </p>
          )}
        </div>
        {(notes.length > 0 || other > 0) && (
          <div className="space-y-1 px-2 pb-2 pt-1">
            {notes.map(n => {
              const alert = n.kind === 'tip';
              const isOpen = open === n.key;
              return (
                <div
                  key={n.key}
                  className={`rounded-2xl ${isOpen ? (alert ? 'bg-(--alert-pale)' : 'bg-(--warm-pale)') : ''}`}
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    className="flex min-h-11 w-full items-center gap-2.5 px-2.5 text-left"
                    onClick={() => setOpen(isOpen ? null : n.key)}
                  >
                    {alert ? (
                      <ShieldAlert size={16} className="shrink-0 text-(--alert)" />
                    ) : (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-(--warm)" />
                    )}
                    <span
                      className={`flex-1 text-[15px] font-semibold ${alert ? 'text-(--alert)' : 'text-(--warm-ink)'}`}
                    >
                      {say(n.title)}
                    </span>
                    {n.kind === 'phase' && (
                      <span className="shrink-0 text-xs text-(--muted)">{ageWindowLabel(n)}</span>
                    )}
                    <ChevronDown
                      size={16}
                      className={`shrink-0 text-(--soft) transition ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="space-y-2.5 px-2.5 pb-3 text-sm leading-relaxed text-(--ink-2)">
                      {n.body && <p>{say(n.body)}</p>}
                      <ReadLink source={n.source} />
                    </div>
                  )}
                </div>
              );
            })}
            {other > 0 && (
              <button
                type="button"
                className="flex min-h-10 w-full items-center gap-2.5 px-2.5 text-left text-sm font-semibold text-(--muted)"
                onClick={() => onOpenGuide(baby, 'health')}
              >
                <HeartPulse size={16} className="shrink-0 text-(--brand)" />
                {tr(
                  `这个阶段的健康提示和常见问题 · ${other}`,
                  `Health tips & common problems now · ${other}`,
                )}
              </button>
            )}
          </div>
        )}
        {onLog && (
          <div className="px-3 pb-3 pt-1">
            <button
              type="button"
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-(--brand-solid) font-semibold text-white shadow-[0_6px_16px_rgba(19,105,79,.22)] transition active:scale-[.98]"
              onClick={onLog}
            >
              <Plus size={20} strokeWidth={2.4} />
              {tr('记录一个成长时刻', 'Add a moment')}
            </button>
          </div>
        )}
      </section>
    </Node>
  );
}
const shiftDate = (date: string, days: number) => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** A future node: one line when closed, the items with ✓ buttons when open. */
function UpcomingNode({
  baby,
  node,
  timeline,
  onLog,
  onEdit,
  onLogVisit,
}: {
  baby: Baby;
  node: Upcoming;
  timeline: Timeline;
  onLog: (baby: Baby, item?: GuideItem) => void;
  onEdit: (moment: Moment) => void;
  onLogVisit: (baby: Baby, items: GuideItem[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const checkup = node.items.find(i => i.kind === 'checkup');
  const vaccines = node.items.filter(i => i.kind === 'vaccine');
  const doneCount = node.items.length - node.open.length;
  const when = ageWindowLabel({from: node.from, to: node.from});
  // The visit checklist, or the CDC checklist the milestones come from.
  const read = node.kind === 'milestones' ? node.items[0]?.source : checkup?.read;
  const title =
    node.kind === 'milestones'
      ? tr(`${when}前可以留意的进步`, `Things to look out for by ${when}`)
      : checkup
        ? say(checkup.title)
        : tr(`${when}的疫苗`, `Vaccines at ${when}`);
  const detail =
    node.kind === 'milestones'
      ? tr(`${node.open.length} 项`, `${node.open.length} item${node.open.length > 1 ? 's' : ''}`)
      : [
          vaccines.length > 0 &&
            tr(`${vaccines.length} 种疫苗`, `${vaccines.length} vaccine${vaccines.length > 1 ? 's' : ''}`),
          doneCount > 0 &&
            tr(`已完成 ${doneCount}/${node.items.length}`, `${doneCount}/${node.items.length} done`),
        ]
          .filter(Boolean)
          .join(' · ');
  return (
    <Node marker={<Dot tone={node.due ? 'warm' : 'open'} />}>
      <div
        className={`rounded-[20px] border ${node.due ? 'border-(--warm-line) bg-(--surface)' : 'border-(--line) bg-(--surface)/70'}`}
      >
        <button
          type="button"
          aria-expanded={expanded}
          className="flex min-h-14 w-full items-center gap-3 px-3.5 text-left"
          onClick={() => setExpanded(!expanded)}
        >
          <span className="min-w-0 flex-1">
            <span className="block font-semibold leading-snug">{title}</span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-(--muted)">
              {node.kind === 'visit' && <span>{when}</span>}
              {detail && <span>{detail}</span>}
              {node.due && (
                <span className="rounded-full bg-(--warm-pale) px-2 py-0.5 font-semibold text-(--warm-ink)">
                  {node.kind === 'visit' ? tr('到时间了', 'Due now') : tr('现在留意', 'Watch now')}
                </span>
              )}
            </span>
          </span>
          <ChevronDown
            size={18}
            className={`shrink-0 text-(--soft) transition ${expanded ? 'rotate-180' : ''}`}
          />
        </button>
        {expanded && (
          <div className="border-t border-(--line) px-3.5 pb-3">
            <ul className="divide-y divide-(--line)">
              {node.items.map(item => {
                const done = timeline.done.get(item.key);
                return (
                  <GuideRow
                    key={item.key}
                    item={item}
                    ages={timeline.ages}
                    onLog={() => (done ? onEdit(done) : onLog(baby, item))}
                    doneOn={done?.occurred_on}
                    compact
                  />
                );
              })}
            </ul>
            {read && (
              <div className="mt-2">
                <ReadLink
                  source={read}
                  label={tr(`去之前读一读：${say(read.name)}`, `Before you go: ${say(read.name)}`)}
                />
              </div>
            )}
            {node.kind === 'visit' && node.open.length > 1 && (
              <button
                type="button"
                className="mt-1 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-(--sky-pale) text-sm font-semibold text-(--sky) transition active:scale-[.99]"
                onClick={() => onLogVisit(baby, node.open)}
              >
                <CheckCheck size={18} />
                {tr('记下这次就诊', 'Log this visit')}
              </button>
            )}
          </div>
        )}
      </div>
    </Node>
  );
}

/**
 * A guide item with a ✓ button. In the full guide, tapping the text shows what it is and where it comes
 * from; on the timeline (`compact`) the row is just the title.
 */
export function GuideRow({
  item,
  ages,
  open = false,
  onToggle,
  onLog,
  doneOn,
  inVisit = false,
  compact = false,
}: {
  item: GuideItem;
  ages: Ages;
  open?: boolean;
  onToggle?: () => void;
  onLog: () => void;
  doneOn?: string;
  /** Inside a visit group the age and due state are already in the header. */
  inVisit?: boolean;
  /** Title only, no expandable details. */
  compact?: boolean;
}) {
  const kind = itemKind(item);
  const state = item.kind === 'milestone' ? null : dueState(item, ages);
  const vaccine = item.vaccine ? VACCINES[item.vaccine] : null;
  const sub = doneOn ? (
    <span className="font-semibold text-(--brand)">
      {tr(`已记录 · ${longDate(doneOn)}`, `Done · ${longDate(doneOn)}`)}
    </span>
  ) : compact ? (
    item.kind !== 'milestone' && item.to > item.from ? (
      <span>{tr(`可在 ${ageWindowLabel(item)}之间接种`, `Any time ${ageWindowLabel(item)}`)}</span>
    ) : null
  ) : item.kind === 'milestone' ? (
    tr(`多数宝宝 ${ageWindowLabel(item)}前做到`, `Most babies by ${ageWindowLabel(item)}`)
  ) : inVisit ? (
    item.to > item.from ? (
      <span>{tr(`可在 ${ageWindowLabel(item)}之间接种`, `Any time ${ageWindowLabel(item)}`)}</span>
    ) : item.vaccine ? (
      <span>{tr('点开看预防什么', 'Tap to see what it prevents')}</span>
    ) : null
  ) : (
    <>
      <span>{ageWindowLabel(item)}</span>
      {state === 'now' && (
        <span className="rounded-full bg-(--warm-pale) px-2 py-0.5 font-semibold text-(--warm-ink)">
          {tr('到时间了', 'Due now')}
        </span>
      )}
    </>
  );
  const text = (
    <>
      <KindBadge kind={kind} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold leading-snug">{say(item.title)}</span>
        {sub && (
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-(--muted)">{sub}</span>
        )}
      </span>
    </>
  );
  return (
    <li className="py-2.5">
      <div className="flex items-center gap-3">
        {compact ? (
          <div className="flex min-w-0 flex-1 items-center gap-3">{text}</div>
        ) : (
          <button
            type="button"
            aria-expanded={open}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
            onClick={onToggle}
          >
            {text}
          </button>
        )}
        <button
          type="button"
          aria-label={
            doneOn
              ? tr('查看记录', 'View entry')
              : tr(`标记“${say(item.title)}”已完成`, `Mark “${say(item.title)}” as done`)
          }
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition active:scale-95 ${doneOn ? `border-transparent ${KIND[kind].dot} text-white` : 'border-(--line-strong) text-(--faint) hover:border-(--brand) hover:text-(--brand)'}`}
          onClick={onLog}
        >
          <Check size={20} strokeWidth={2.6} />
        </button>
      </div>
      {open && !compact && (
        <div className="ml-12 mt-2 space-y-2 rounded-2xl bg-(--surface-2) p-3 text-sm leading-relaxed text-(--ink-2)">
          {vaccine && <p>{say(vaccine.prevents)}</p>}
          {item.body && <p>{say(item.body)}</p>}
          {vaccine?.after && <p>{say(vaccine.after)}</p>}
          {vaccine && <p className="text-(--muted)">{say(AFTER_VACCINE)}</p>}
          {item.kind === 'milestone' && (
            <p className="text-(--muted)">
              {tr(
                `这是约 75% 的宝宝在 ${ageWindowLabel(item)}前能做到的事。还没做到也很常见，有担心可以问问医生。`,
                `About 75% of babies do this by ${ageWindowLabel(item)}. Not yet is common; ask your doctor if you’re concerned.`,
              )}
            </p>
          )}
          <SourceLink source={item.source} />
        </div>
      )}
    </li>
  );
}

function MomentNode({
  moment,
  birthday,
  photoUrl,
  onEdit,
}: {
  moment: Moment;
  birthday: string;
  photoUrl?: string;
  onEdit: (m: Moment) => void;
}) {
  const k = KIND[moment.kind];
  const Icon = k.icon;
  const item = guideItem(moment.guide_key);
  return (
    <Node
      marker={
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full ${k.dot} text-white ring-4 ring-(--canvas)`}
        >
          <Icon size={14} />
        </span>
      }
    >
      <button
        type="button"
        className="w-full overflow-hidden rounded-[20px] border border-(--card-rim) bg-(--card-bg) text-left shadow-[0_6px_18px_rgba(35,67,54,.06)] transition active:scale-[.99]"
        onClick={() => onEdit(moment)}
      >
        {photoUrl && <img src={photoUrl} alt="" className="aspect-[4/3] w-full object-cover" />}
        <div className="px-4 py-3">
          <p className="text-xs font-semibold text-(--muted)">
            <span className={k.ink}>{k.label()}</span> · {longDate(moment.occurred_on)} ·{' '}
            {ageOn(birthday, moment.occurred_on)}
          </p>
          <p className="mt-0.5 text-[17px] font-semibold leading-snug">
            {item ? say(item.title) : moment.title}
          </p>
          {moment.note && (
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-(--ink-2)">{moment.note}</p>
          )}
        </div>
      </button>
    </Node>
  );
}
