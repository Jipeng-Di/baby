'use client';
import {useMemo, useState} from 'react';
import {
  BookOpen,
  Cake,
  Check,
  CheckCheck,
  ChevronDown,
  HeartPulse,
  Plus,
  ShieldAlert,
  Sprout,
} from 'lucide-react';
import BabyAvatar from './BabyAvatar';
import {Disclaimer, KIND, KindBadge, SourceLink, itemKind} from './timeline-ui';
import {AFTER_VACCINE, VACCINES, guideItem, say, type GuideItem} from '@/lib/guide';
import {
  ageOn,
  ageWindowLabel,
  buildTimeline,
  dueState,
  type Ages,
  type Timeline,
  type Visit,
} from '@/lib/timeline';
import {babyAge} from '@/lib/dates';
import {locale, tr, useLang} from '@/lib/i18n';
import {useRegion} from '@/lib/region';
import {babyName, type Baby, type Moment, type MomentKind} from '@/lib/types';

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
  onOpenGuide: (baby: Baby) => void;
  onLogVisit: (baby: Baby, items: GuideItem[]) => void;
};
type Filter = 'all' | MomentKind;

export const longDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString(locale(), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

/** Growth timeline: where the baby is now, what's coming up, and the moments the family has logged. */
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
  const [filter, setFilter] = useState<Filter>('all');
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
  const {ages, phases, tips} = timeline;
  const shown = timeline.moments.filter(m => filter === 'all' || m.kind === filter);
  const counts = timeline.moments.reduce<Partial<Record<MomentKind, number>>>(
    (acc, m) => ({...acc, [m.kind]: (acc[m.kind] ?? 0) + 1}),
    {},
  );
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
                setFilter('all');
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

      <NowCard
        baby={baby}
        avatarUrl={avatarUrls[baby.id]}
        ages={ages}
        today={today}
        phases={phases}
        tips={tips}
      />

      {unavailable ? (
        <section className="rounded-[22px] border border-(--warm-line) bg-(--warm-pale) p-4 text-sm leading-relaxed text-(--warm-ink)">
          {tr(
            '时间线的数据库还没开通，暂时不能记录。请先在 Supabase 运行 202611160001_baby_moments.sql。',
            'The timeline database isn’t set up yet, so entries can’t be saved. Run 202611160001_baby_moments.sql in Supabase first.',
          )}
        </section>
      ) : (
        <>
          {timeline.visits.map((visit, i) => (
            <VisitCard
              key={`${baby.id}-${visit.from}`}
              baby={baby}
              visit={visit}
              timeline={timeline}
              first={i === 0}
              onLog={onLog}
              onEdit={onEdit}
              onLogVisit={onLogVisit}
            />
          ))}
          <StageMilestones baby={baby} items={timeline.milestones} timeline={timeline} onLog={onLog} />
        </>
      )}

      <section aria-labelledby="moments-title">
        <div className="flex items-center justify-between gap-3 px-1">
          <h2 id="moments-title" className="text-xl font-semibold tracking-tight">
            {tr('成长时刻', 'Moments')}
          </h2>
          <button
            type="button"
            disabled={unavailable}
            className="flex min-h-10 items-center gap-1.5 rounded-full bg-(--brand-solid) px-4 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(19,105,79,.2)] transition active:scale-[.97]"
            onClick={() => onLog(baby)}
          >
            <Plus size={17} />
            {tr('记录', 'Add')}
          </button>
        </div>
        {timeline.moments.length > 0 && (
          <div
            className="no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1"
            role="group"
            aria-label={tr('筛选', 'Filter')}
          >
            {(['all', 'milestone', 'first', 'vaccine', 'checkup'] as Filter[]).map(f => {
              const n = f === 'all' ? timeline.moments.length : (counts[f] ?? 0);
              if (f !== 'all' && !n) return null;
              const on = filter === f;
              return (
                <button
                  key={f}
                  type="button"
                  aria-pressed={on}
                  className={`min-h-9 shrink-0 rounded-full px-3.5 text-sm font-semibold transition ${on ? 'bg-(--ink) text-(--paper)' : 'border border-(--line) bg-(--surface) text-(--muted)'}`}
                  onClick={() => setFilter(f)}
                >
                  {f === 'all' ? tr('全部', 'All') : KIND[f].label()} <span className="opacity-60">{n}</span>
                </button>
              );
            })}
          </div>
        )}
        <ol className="relative mt-4 space-y-3 pl-7 before:absolute before:bottom-6 before:left-[11px] before:top-3 before:w-0.5 before:rounded-full before:bg-(--line-strong)">
          {shown.map(m => (
            <MomentRow
              key={m.id}
              moment={m}
              birthday={baby.birthday}
              photoUrl={m.photo_path ? photoUrls[m.photo_path] : undefined}
              onEdit={onEdit}
            />
          ))}
          {filter === 'all' && (
            <li className="relative">
              <span className="absolute -left-7 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-(--warm) text-white ring-4 ring-(--canvas)">
                <Cake size={13} />
              </span>
              <div className="rounded-[20px] border border-dashed border-(--warm-line) bg-(--warm-pale)/70 px-4 py-3">
                <p className="font-semibold text-(--warm-ink)">
                  {tr(`${babyName(baby)} 出生啦`, `${babyName(baby)} was born`)}
                </p>
                <p className="text-sm text-(--muted)">{longDate(baby.birthday)}</p>
              </div>
            </li>
          )}
        </ol>
        {timeline.moments.length === 0 && !unavailable && (
          <p className="mt-3 px-1 text-sm leading-relaxed text-(--muted)">
            {tr(
              '第一次微笑、第一次翻身、第一次洗澡……点“记录”或上面的 ✓，把这些时刻留下来，家人手机上也能看到。',
              'First smile, first roll, first bath… tap Add or a ✓ above to keep these moments. Your family sees them too.',
            )}
          </p>
        )}
      </section>

      <button
        type="button"
        className="flex min-h-14 w-full items-center gap-3 rounded-[22px] border border-(--line) bg-(--surface)/80 px-4 text-left transition active:scale-[.99]"
        onClick={() => onOpenGuide(baby)}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-(--sky-pale) text-(--sky)">
          <BookOpen size={19} />
        </span>
        <span className="flex-1">
          <span className="block font-semibold">{tr('完整成长指南', 'Full growth guide')}</span>
          <span className="block text-xs text-(--muted)">
            {tr('0–2 岁里程碑、疫苗、体检和健康提示', 'Milestones, vaccines, checkups & health, 0–2 years')}
          </span>
        </span>
      </button>
      <Disclaimer />
    </>
  );
}

function NowCard({
  baby,
  avatarUrl,
  ages,
  today,
  phases,
  tips,
}: {
  baby: Baby;
  avatarUrl?: string;
  ages: Ages;
  today: string;
  phases: GuideItem[];
  tips: GuideItem[];
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [tipsOpen, setTipsOpen] = useState(false);
  const important = tips.filter(t => t.important);
  const other = tips.filter(t => !t.important);
  const corrected = ages.isCorrected
    ? babyAge(
        shiftDate(baby.birthday, Math.round((ages.actual - ages.corrected) * 30.4375)),
        new Date(`${today}T12:00:00`),
      )
    : null;
  return (
    <section className="overflow-hidden rounded-[28px] border border-(--card-rim) bg-(--card-bg) shadow-[0_12px_32px_rgba(35,67,54,.08)]">
      <div className="relative bg-[linear-gradient(135deg,var(--brand-pale),transparent_75%)] px-5 pb-4 pt-5">
        <div className="flex items-center gap-3">
          <BabyAvatar baby={baby} url={avatarUrl} featured />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-(--brand)">{tr('现在', 'Now')}</p>
            <h2 className="truncate text-2xl font-bold tracking-tight">
              {babyAge(baby.birthday, new Date(`${today}T12:00:00`))}
            </h2>
            {corrected && (
              <p className="text-xs text-(--muted)">
                {tr(`矫正月龄 ${corrected}`, `Corrected age ${corrected}`)}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="space-y-2.5 px-5 pb-5 pt-1">
        {phases.length === 0 && important.length === 0 && (
          <p className="text-sm text-(--muted)">
            {tr(
              '这段时间没有特别需要留意的阶段，享受和宝宝在一起的时光吧。',
              'Nothing special to watch for right now. Enjoy this stage together.',
            )}
          </p>
        )}
        {phases.map(p => (
          <Expandable
            key={p.key}
            open={open === p.key}
            onToggle={() => setOpen(open === p.key ? null : p.key)}
            tone="phase"
            title={say(p.title)}
            meta={ageWindowLabel(p)}
          >
            {p.body && <p>{say(p.body)}</p>}
            <SourceLink source={p.source} />
          </Expandable>
        ))}
        {important.map(t => (
          <Expandable
            key={t.key}
            open={open === t.key}
            onToggle={() => setOpen(open === t.key ? null : t.key)}
            tone="alert"
            title={say(t.title)}
          >
            {t.body && <p>{say(t.body)}</p>}
            <SourceLink source={t.source} />
          </Expandable>
        ))}
        {other.length > 0 && (
          <div className="rounded-2xl bg-(--surface-2)">
            <button
              type="button"
              aria-expanded={tipsOpen}
              className="flex min-h-12 w-full items-center gap-2.5 px-3.5 text-left text-sm font-semibold"
              onClick={() => setTipsOpen(!tipsOpen)}
            >
              <HeartPulse size={17} className="text-(--brand)" />
              <span className="flex-1">
                {tr(`这个阶段的健康提示 · ${other.length}`, `Health tips for this stage · ${other.length}`)}
              </span>
              <ChevronDown size={18} className={`text-(--soft) transition ${tipsOpen ? 'rotate-180' : ''}`} />
            </button>
            {tipsOpen && (
              <ul className="space-y-3 px-3.5 pb-3.5">
                {other.map(t => (
                  <li key={t.key} className="text-sm leading-relaxed">
                    <p className="font-semibold">{say(t.title)}</p>
                    {t.body && <p className="mt-0.5 text-(--ink-2)">{say(t.body)}</p>}
                    <div className="mt-1">
                      <SourceLink source={t.source} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
const shiftDate = (date: string, days: number) => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function Expandable({
  open,
  onToggle,
  tone,
  title,
  meta,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  tone: 'phase' | 'alert';
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  const alert = tone === 'alert';
  return (
    <div className={`rounded-2xl ${alert ? 'bg-(--alert-pale)' : 'bg-(--warm-pale)'}`}>
      <button
        type="button"
        aria-expanded={open}
        className="flex min-h-12 w-full items-center gap-2.5 px-3.5 py-2 text-left"
        onClick={onToggle}
      >
        {alert ? (
          <ShieldAlert size={17} className="shrink-0 text-(--alert)" />
        ) : (
          <span className="h-2 w-2 shrink-0 rounded-full bg-(--warm)" />
        )}
        <span className={`flex-1 text-sm font-semibold ${alert ? 'text-(--alert)' : 'text-(--warm-ink)'}`}>
          {title}
        </span>
        {meta && <span className="shrink-0 text-xs text-(--muted)">{meta}</span>}
        <ChevronDown size={18} className={`shrink-0 text-(--soft) transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-2 px-3.5 pb-3.5 text-sm leading-relaxed text-(--ink-2)">{children}</div>
      )}
    </div>
  );
}

function VisitCard({
  baby,
  visit,
  timeline,
  first,
  onLog,
  onEdit,
  onLogVisit,
}: {
  baby: Baby;
  visit: Visit;
  timeline: Timeline;
  first: boolean;
  onLog: (baby: Baby, item?: GuideItem) => void;
  onEdit: (moment: Moment) => void;
  onLogVisit: (baby: Baby, items: GuideItem[]) => void;
}) {
  const [expanded, setExpanded] = useState(first);
  const [open, setOpen] = useState<string | null>(null);
  const checkup = visit.items.find(i => i.kind === 'checkup');
  const vaccines = visit.items.filter(i => i.kind === 'vaccine');
  const state = dueState(visit.items[0], timeline.ages);
  const doneCount = visit.items.length - visit.open.length;
  const title = checkup
    ? say(checkup.title)
    : tr(`${ageWindowLabel(visit.items[0])}的疫苗`, `Vaccines at ${ageWindowLabel(visit.items[0])}`);
  return (
    <section className="ui-card p-0">
      <button
        type="button"
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 p-4 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <KindBadge kind={checkup ? 'checkup' : 'vaccine'} />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold leading-snug">{title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-(--muted)">
            {vaccines.length > 0 &&
              tr(`${vaccines.length} 种疫苗`, `${vaccines.length} vaccine${vaccines.length > 1 ? 's' : ''}`)}
            {doneCount > 0 && (
              <span>
                {tr(`已完成 ${doneCount}/${visit.items.length}`, `${doneCount}/${visit.items.length} done`)}
              </span>
            )}
            {state === 'now' ? (
              <span className="rounded-full bg-(--warm-pale) px-2 py-0.5 font-semibold text-(--warm-ink)">
                {tr('到时间了', 'Due now')}
              </span>
            ) : (
              <span className="rounded-full bg-(--sky-pale) px-2 py-0.5 font-semibold text-(--sky)">
                {tr(`${ageWindowLabel(visit.items[0])}时`, `At ${ageWindowLabel(visit.items[0])}`)}
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
        <div className="border-t border-(--line) px-4 pb-4">
          <ul className="divide-y divide-(--line)">
            {visit.items.map(item => {
              const done = timeline.done.get(item.key);
              return (
                <GuideRow
                  key={item.key}
                  item={item}
                  ages={timeline.ages}
                  open={open === item.key}
                  onToggle={() => setOpen(open === item.key ? null : item.key)}
                  onLog={() => (done ? onEdit(done) : onLog(baby, item))}
                  doneOn={done?.occurred_on}
                  inVisit
                />
              );
            })}
          </ul>
          {visit.open.length > 1 && (
            <button
              type="button"
              className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-(--sky-pale) font-semibold text-(--sky) transition active:scale-[.99]"
              onClick={() => onLogVisit(baby, visit.open)}
            >
              <CheckCheck size={19} />
              {tr('记下这次就诊', 'Log this visit')}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function StageMilestones({
  baby,
  items,
  timeline,
  onLog,
}: {
  baby: Baby;
  items: GuideItem[];
  timeline: Timeline;
  onLog: (baby: Baby, item?: GuideItem) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  if (!items.length) return null;
  return (
    <section className="ui-card px-4 pb-2 pt-4" aria-labelledby="stage-title">
      <h2 id="stage-title" className="flex items-baseline justify-between gap-3 px-1">
        <span className="text-lg font-semibold tracking-tight">
          {tr('可以留意的进步', 'Things to look out for')}
        </span>
        <span className="shrink-0 text-xs text-(--muted)">
          {tr(`约 ${ageWindowLabel(items[0])}`, `Around ${ageWindowLabel(items[0])}`)}
        </span>
      </h2>
      <ul className="mt-1 divide-y divide-(--line)">
        {items.map(item => (
          <GuideRow
            key={item.key}
            item={item}
            ages={timeline.ages}
            open={open === item.key}
            onToggle={() => setOpen(open === item.key ? null : item.key)}
            onLog={() => onLog(baby, item)}
          />
        ))}
      </ul>
    </section>
  );
}

/** A guide item with a ✓ button; tapping the text shows what it is and where it comes from. */
export function GuideRow({
  item,
  ages,
  open,
  onToggle,
  onLog,
  doneOn,
  inVisit = false,
}: {
  item: GuideItem;
  ages: Ages;
  open: boolean;
  onToggle: () => void;
  onLog: () => void;
  doneOn?: string;
  /** Inside a visit card the age and due state are already in the card header. */
  inVisit?: boolean;
}) {
  const kind = itemKind(item);
  const state = item.kind === 'milestone' ? null : dueState(item, ages);
  const vaccine = item.vaccine ? VACCINES[item.vaccine] : null;
  return (
    <li className="py-2.5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          onClick={onToggle}
        >
          <KindBadge kind={kind} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold leading-snug">{say(item.title)}</span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-(--muted)">
              {doneOn ? (
                <span className="font-semibold text-(--brand)">
                  {tr(`已记录 · ${longDate(doneOn)}`, `Done · ${longDate(doneOn)}`)}
                </span>
              ) : item.kind === 'milestone' ? (
                tr(`多数宝宝 ${ageWindowLabel(item)}前做到`, `Most babies by ${ageWindowLabel(item)}`)
              ) : inVisit ? (
                item.to > item.from ? (
                  <span>
                    {tr(`可在 ${ageWindowLabel(item)}之间接种`, `Any time ${ageWindowLabel(item)}`)}
                  </span>
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
              )}
            </span>
          </span>
        </button>
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
      {open && (
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

function MomentRow({
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
    <li className="relative">
      <span
        className={`absolute -left-7 top-3 flex h-6 w-6 items-center justify-center rounded-full ${k.dot} text-white ring-4 ring-(--canvas)`}
      >
        <Icon size={13} />
      </span>
      <button
        type="button"
        className="w-full overflow-hidden rounded-[22px] border border-(--card-rim) bg-(--card-bg) text-left shadow-[0_6px_18px_rgba(35,67,54,.06)] transition active:scale-[.99]"
        onClick={() => onEdit(moment)}
      >
        {photoUrl && <img src={photoUrl} alt="" className="aspect-[4/3] w-full object-cover" />}
        <div className="px-4 py-3">
          <p className="text-xs font-semibold text-(--muted)">
            <span className={k.ink}>{k.label()}</span> · {longDate(moment.occurred_on)} ·{' '}
            {ageOn(birthday, moment.occurred_on)}
          </p>
          <p className="mt-1 text-[17px] font-semibold leading-snug">
            {item ? say(item.title) : moment.title}
          </p>
          {moment.note && (
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-(--ink-2)">{moment.note}</p>
          )}
          {item?.kind === 'milestone' && (
            <p className="mt-2 inline-flex rounded-full bg-(--brand-pale) px-2.5 py-1 text-xs font-medium text-(--brand)">
              {tr(`多数宝宝 ${ageWindowLabel(item)}前做到`, `Most babies by ${ageWindowLabel(item)}`)}
            </p>
          )}
        </div>
      </button>
    </li>
  );
}
