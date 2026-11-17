'use client';
import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {ChevronDown, ChevronRight, Moon, Pencil, Plus, Sunrise} from 'lucide-react';
import {EmptyState} from './ui';
import {tap} from '@/lib/native';
import {locale} from '@/lib/i18n';
import BabyAvatar from './BabyAvatar';
import WeatherCard from './WeatherCard';
import {babyAge, localDay, timeLabel} from '@/lib/dates';
import {babyName, type Baby, type BabyEvent, type EventKind, type Feeding, typeLabels} from '@/lib/types';
import {durationText, eventDetail, eventLabel, openSleep, summarize} from '@/lib/events';
import {DiaperIcon, EventBadge} from './event-ui';
import {tr} from '@/lib/i18n';
import {quickAmountsFor} from '@/lib/quick-amounts';
import {feedingAmount, minutesLabel, useUnit, volumeLabel, volumeNumber} from '@/lib/units';

// After this long without a feeding, the "since last feeding" counter turns to the alert color.
const LONG_GAP_MINUTES = 180;
// Matches the carousel's px-5 / scroll-px-5 inset.
const EDGE = 20;
const ACTIVE_KEY = 'today-active-baby';

type Props = {
  babies: Baby[];
  feedings: Feeding[];
  avatarUrls: Record<string, string>;
  now: number;
  recorderName: (userId: string) => string;
  onStartFeed: (baby: Baby, amount: number) => void;
  onEditFeed: (item: Feeding) => void;
  /** Care events (sleep, diapers…), or null while the table doesn't exist yet. */
  events: BabyEvent[] | null;
  onStartEvent: (baby: Baby, kind: EventKind) => void;
  onEditEvent: (item: BabyEvent) => void;
  onWakeUp: (item: BabyEvent) => void;
  onAddBaby: () => void;
};
type Gap = {minutes: number; hours: number; rest: number; long: boolean};

/** Time-of-day greeting for the page title. */
function greeting(now: number) {
  const h = new Date(now).getHours();
  if (h < 5) return tr('夜深了，辛苦了', 'Late night, you’re doing great');
  if (h < 11) return tr('早上好', 'Good morning');
  if (h < 14) return tr('中午好', 'Good afternoon');
  if (h < 18) return tr('下午好', 'Good afternoon');
  return tr('晚上好', 'Good evening');
}
/** "just now", "25 min ago", "1 h 5 min ago". */
function agoText(ms: number) {
  const minutes = ms / 60000;
  if (minutes < 1) return tr('刚刚', 'just now');
  return tr(`${durationText(minutes)}前`, `${durationText(minutes)} ago`);
}
function gapSince(item: Feeding | undefined, now: number): Gap | null {
  if (!item) return null;
  const minutes = Math.max(0, Math.floor((now - new Date(item.fed_at).getTime()) / 60000));
  return {minutes, hours: Math.floor(minutes / 60), rest: minutes % 60, long: minutes >= LONG_GAP_MINUTES};
}

export default function TodayView({
  babies,
  feedings,
  avatarUrls,
  now,
  recorderName,
  onStartFeed,
  onEditFeed,
  events,
  onStartEvent,
  onEditEvent,
  onWakeUp,
  onAddBaby,
}: Props) {
  const unit = useUnit();
  const [expanded, setExpanded] = useState<string[]>([]);
  const [active, setActive] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const restored = useRef(false);
  const multi = babies.length > 1;
  const current = Math.min(active, Math.max(0, babies.length - 1));

  const start = localDay(new Date(now));
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const todayFeedings = feedings.filter(f => {
    const t = new Date(f.fed_at).getTime();
    return t >= start.getTime() && t < end.getTime();
  });
  const lastByBaby = new Map<string, Feeding>();
  for (const item of feedings) if (!lastByBaby.has(item.baby_id)) lastByBaby.set(item.baby_id, item);

  // Scroll offset at which slide `index` is snapped: earlier slides align to the start, the last slide to the end.
  function snapLeft(index: number) {
    const el = scroller.current;
    const slide = el?.children[index] as HTMLElement | undefined;
    if (!el || !slide) return 0;
    const left =
      index === babies.length - 1
        ? slide.offsetLeft + slide.offsetWidth + EDGE - el.clientWidth
        : slide.offsetLeft - EDGE;
    return Math.max(0, Math.min(el.scrollWidth - el.clientWidth, left));
  }
  function remember(index: number) {
    try {
      localStorage.setItem(ACTIVE_KEY, babies[index].id);
    } catch {}
  }
  function scrollToIndex(index: number, behavior: ScrollBehavior = 'smooth') {
    scroller.current?.scrollTo({left: snapLeft(index), behavior});
  }
  function select(index: number) {
    setActive(index);
    remember(index);
    if (multi) scrollToIndex(index);
  }
  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    let index = 0;
    let best = Infinity;
    babies.forEach((_, i) => {
      const distance = Math.abs(snapLeft(i) - el.scrollLeft);
      if (distance < best) {
        best = distance;
        index = i;
      }
    });
    if (index !== active) {
      setActive(index);
      remember(index);
    }
  }
  // Each card fills the space down to the tab bar, but grows only with its own content: the carousel
  // aligns cards to the top, so expanding one card no longer stretches the others. The fill height is
  // written straight to a CSS variable on the scroller.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!multi || !el) return;
    const measure = () => {
      const tabBar = document.querySelector<HTMLElement>('[data-tab-bar]');
      const top = el.getBoundingClientRect().top + window.scrollY;
      // pt-1 + pb-5 on the scroller, plus the page dots under it.
      const room = window.innerHeight - (tabBar?.offsetHeight ?? 0) - top - 24 - 28;
      el.style.setProperty('--slide-min', `${Math.max(360, Math.round(room))}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (el.parentElement) observer.observe(el.parentElement);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [multi]);
  // Reopen on the baby the user last looked at.
  useEffect(() => {
    if (!multi || restored.current) return;
    restored.current = true;
    let id: string | null = null;
    try {
      id = localStorage.getItem(ACTIVE_KEY);
    } catch {}
    const index = babies.findIndex(b => b.id === id);
    if (index > 0) {
      setActive(index);
      scrollToIndex(index, 'auto');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multi, babies]);

  function renderCard(baby: Baby, i: number) {
    const items = todayFeedings.filter(f => f.baby_id === baby.id);
    const last = lastByBaby.get(baby.id);
    const gap = gapSince(last, now);
    const total = items.reduce((sum, f) => sum + (f.amount_ml ?? 0), 0);
    const minutes = items.reduce((sum, f) => sum + (f.amount_ml === null ? (f.duration_min ?? 0) : 0), 0);
    const isExpanded = expanded.includes(baby.id);
    const care = (events ?? []).filter(e => e.baby_id === baby.id);
    const careToday = care.filter(e => {
      const t = new Date(e.started_at).getTime();
      return t >= start.getTime() && t < end.getTime();
    });
    const asleep = openSleep(care, baby.id);
    const careSummary = summarize(care, start.getTime(), end.getTime(), now);
    const lastDiaper = care.find(e => e.kind === 'diaper');
    // Today's feeds and care records in one list, newest first.
    const todayRows = [
      ...items.map(f => ({at: f.fed_at, feed: f, event: null})),
      ...careToday.map(e => ({at: e.started_at, feed: null, event: e})),
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    const quickAmounts = quickAmountsFor(feedings, baby.id);
    const warm = i % 2 === 1;
    return (
      <section
        className={`ui-card p-4! relative flex flex-1 flex-col overflow-hidden bg-gradient-to-br from-(--surface) ${warm ? 'to-(--warm-pale)' : 'to-(--surface-2)'}`}
      >
        <span className={`absolute inset-x-0 top-0 h-1 ${warm ? 'bg-[#e6aa75]' : 'bg-[#5ca789]'}`} />
        <div
          className={`flex min-h-[96px] flex-1 flex-col justify-center rounded-[20px] border px-4 py-2.5 ${gap?.long ? 'border-(--alert)/35 bg-(--alert-pale)' : warm ? 'border-(--warm-line) bg-(--warm-pale)' : 'border-(--line-strong) bg-(--brand-pale)'}`}
        >
          <p className="text-[11px] font-semibold tracking-[.12em] text-(--muted)">
            {tr('距上次喂奶', 'Since last feed')}
          </p>
          {gap && last ? (
            <>
              <p className={`mt-1 flex items-baseline gap-1 ${gap.long ? 'text-(--alert)' : 'text-(--ink)'}`}>
                {gap.hours > 0 && (
                  <>
                    <strong className="text-[34px] leading-none tracking-tight">{gap.hours}</strong>
                    <span className="mr-1 text-sm font-semibold">{tr('小时', 'h')}</span>
                  </>
                )}
                <strong className="text-[34px] leading-none tracking-tight">
                  {gap.hours > 0 ? gap.rest : gap.minutes}
                </strong>
                <span className="text-sm font-semibold">{tr('分钟', 'min')}</span>
              </p>
              <p className="mt-1 text-[13px] text-(--ink-2)">
                <span className="font-semibold text-(--ink)">{timeLabel(last.fed_at)}</span> ·{' '}
                {last.amount_ml === null && !last.duration_min
                  ? tr('奶量待补充', 'amount pending')
                  : feedingAmount(last)}{' '}
                · {tr(`${recorderName(last.created_by)}记录`, `by ${recorderName(last.created_by)}`)}
              </p>
            </>
          ) : (
            <p className="mt-1 text-[15px] font-semibold text-(--muted)">
              {tr('还没有喝奶记录', 'No feedings yet')}
            </p>
          )}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-(--line) bg-(--surface)/70 px-3 py-1.5">
            <p className="text-[11px] font-medium text-(--muted)">{tr('今日总奶量', 'Today’s total')}</p>
            <p>
              <strong className="text-lg tracking-tight text-(--ink)">{volumeNumber(total)}</strong>{' '}
              <span className="text-[13px] text-(--muted)">{unit}</span>
              {minutes > 0 && (
                <span className="block text-[11px] text-(--muted)">
                  {tr('另有亲喂', 'plus nursing')} {minutesLabel(minutes)}
                </span>
              )}
            </p>
          </div>
          <div className="rounded-2xl border border-(--line) bg-(--surface)/70 px-3 py-1.5">
            <p className="text-[11px] font-medium text-(--muted)">{tr('今日次数', 'Feeds today')}</p>
            <p>
              <strong className="text-lg tracking-tight text-(--ink)">{items.length}</strong>{' '}
              <span className="text-[13px] text-(--muted)">{tr('次', 'feeds')}</span>
            </p>
          </div>
        </div>
        {todayRows.length > 0 && (
          <div className="mt-0.5">
            <button
              type="button"
              aria-expanded={isExpanded}
              aria-controls={`today-feedings-${baby.id}`}
              className="flex min-h-9 w-full items-center justify-between rounded-xl px-1 text-[13px] font-semibold text-(--brand) transition active:bg-(--surface)/70"
              onClick={() =>
                setExpanded(list =>
                  list.includes(baby.id) ? list.filter(id => id !== baby.id) : [...list, baby.id],
                )
              }
            >
              <span>
                {isExpanded
                  ? tr('收起今日记录', 'Hide today’s records')
                  : tr(`展开今日记录 · ${todayRows.length} 条`, `Show today’s records · ${todayRows.length}`)}
              </span>
              <ChevronDown
                size={16}
                className={isExpanded ? 'rotate-180 transition-transform' : 'transition-transform'}
              />
            </button>
            <div
              id={`today-feedings-${baby.id}`}
              hidden={!isExpanded}
              className="mt-1 divide-y divide-(--line) rounded-2xl border border-(--line) bg-(--surface-2) px-3"
            >
              {todayRows.map(({feed: item, event}) =>
                item ? (
                  <button
                    key={item.id}
                    type="button"
                    className="flex min-h-12 w-full items-center gap-2 text-left text-sm"
                    onClick={() => onEditFeed(item)}
                  >
                    <span className="w-12 font-semibold text-(--ink)">{timeLabel(item.fed_at)}</span>
                    <span className="min-w-0 flex-1 truncate text-(--muted)">
                      {typeLabels[item.feeding_type]} · {recorderName(item.created_by)}
                    </span>
                    <strong className="text-(--ink)">{feedingAmount(item)}</strong>
                    <ChevronRight size={16} className="text-(--faint)" />
                  </button>
                ) : event ? (
                  <button
                    key={event.id}
                    type="button"
                    className="flex min-h-12 w-full items-center gap-2 text-left text-sm"
                    onClick={() => onEditEvent(event)}
                  >
                    <span className="w-12 font-semibold text-(--ink)">{timeLabel(event.started_at)}</span>
                    <EventBadge kind={event.kind} size={24} />
                    <span className="min-w-0 flex-1 truncate text-(--muted)">
                      {eventLabel[event.kind]()}
                      {event.kind === 'medicine' && event.note ? ` · ${event.note}` : ''}
                    </span>
                    <strong className="shrink-0 text-(--ink)">{eventDetail(event, now)}</strong>
                    <ChevronRight size={16} className="text-(--faint)" />
                  </button>
                ) : null,
              )}
            </div>
          </div>
        )}
        <p className="mt-2 mb-1.5 px-1 text-[11px] font-medium text-(--muted)">
          {tr(`快捷记录 · ${unit}`, `Quick log · ${unit}`)}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {quickAmounts.map(amount => (
            <button
              key={amount}
              className="min-h-11 rounded-2xl border border-(--line-strong) bg-(--surface)/75 px-1 text-sm font-semibold text-(--brand) shadow-[0_3px_10px_rgba(32,84,63,.05)] transition active:scale-[.97] active:bg-(--brand-pale)"
              aria-label={tr(`记录 ${volumeLabel(amount)}`, `Log ${volumeLabel(amount)}`)}
              onClick={() => {
                void tap();
                onStartFeed(baby, amount);
              }}
            >
              +{volumeNumber(amount)}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="ui-primary mt-2 min-h-11! text-[15px]! whitespace-nowrap"
          onClick={() => onStartFeed(baby, 0)}
        >
          <Pencil size={16} className="shrink-0" />
          {tr('输入奶量 / 亲喂时长', 'Enter amount or time')}
        </button>
        {events && (
          <div className="mt-3 border-t border-(--line) pt-2.5">
            <p className="mb-1.5 flex items-center justify-between gap-3 px-1 text-[11px] font-medium text-(--muted)">
              <span className="shrink-0">{tr('日常记录', 'Care log')}</span>
              <span className="flex min-w-0 items-center gap-2.5">
                {asleep ? (
                  <span className="truncate text-(--plum)">
                    {tr(
                      `${timeLabel(asleep.started_at)} 入睡`,
                      `Asleep since ${timeLabel(asleep.started_at)}`,
                    )}
                  </span>
                ) : (
                  <>
                    {careSummary.sleepMinutes >= 1 && (
                      <span className="flex min-w-0 items-center gap-1" title={tr('今日睡眠', 'Sleep today')}>
                        <Moon size={11} className="shrink-0 text-(--plum)" />
                        <span className="truncate">{durationText(careSummary.sleepMinutes)}</span>
                      </span>
                    )}
                    {lastDiaper && (
                      <span
                        className="flex min-w-0 items-center gap-1"
                        title={tr('上次换尿布', 'Last diaper')}
                      >
                        <DiaperIcon size={11} className="shrink-0 text-(--warm)" />
                        <span className="truncate">
                          {agoText(now - new Date(lastDiaper.started_at).getTime())}
                        </span>
                      </span>
                    )}
                  </>
                )}
              </span>
            </p>
            <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_auto] gap-2">
              {asleep ? (
                <button
                  type="button"
                  className="flex min-h-11 items-center justify-center gap-1.5 rounded-2xl bg-(--plum) px-2 text-sm font-semibold text-white transition active:scale-[.97]"
                  aria-label={tr(
                    `醒了，已睡 ${durationText((now - new Date(asleep.started_at).getTime()) / 60000)}`,
                    `Woke up, asleep for ${durationText((now - new Date(asleep.started_at).getTime()) / 60000)}`,
                  )}
                  onClick={() => {
                    void tap();
                    onWakeUp(asleep);
                  }}
                >
                  <Sunrise size={16} className="shrink-0" />
                  <span className="flex min-w-0 flex-col items-start leading-tight">
                    <span className="truncate">{tr('醒了', 'Woke up')}</span>
                    <span className="truncate text-[11px] font-medium opacity-85">
                      {durationText((now - new Date(asleep.started_at).getTime()) / 60000)}
                    </span>
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  className="flex min-h-11 items-center justify-center gap-1.5 rounded-2xl border border-(--plum)/30 bg-(--plum-pale) px-2 text-sm font-semibold text-(--plum) transition active:scale-[.97]"
                  onClick={() => onStartEvent(baby, 'sleep')}
                >
                  <Moon size={16} className="shrink-0" />
                  {tr('睡觉', 'Sleep')}
                </button>
              )}
              <button
                type="button"
                className="flex min-h-11 items-center justify-center gap-1.5 rounded-2xl border border-(--warm-line) bg-(--warm-pale) px-2 text-sm font-semibold text-(--warm-ink) transition active:scale-[.97]"
                onClick={() => onStartEvent(baby, 'diaper')}
              >
                <DiaperIcon size={16} className="shrink-0" />
                {tr('尿布', 'Diaper')}
              </button>
              <button
                type="button"
                className="flex min-h-11 items-center justify-center gap-1 rounded-2xl border border-(--line-strong) bg-(--surface)/75 px-3 text-sm font-semibold text-(--brand) transition active:scale-[.97]"
                aria-label={tr(
                  '更多记录：趴趴、洗澡、用药、体温',
                  'More: tummy time, bath, medicine, temperature',
                )}
                onClick={() => onStartEvent(baby, 'tummy')}
              >
                <Plus size={16} />
                {tr('更多', 'More')}
              </button>
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <div
      className="flex flex-col gap-3"
      style={{
        minHeight: 'calc(100dvh - max(24px, env(safe-area-inset-top)) - 88px - env(safe-area-inset-bottom))',
      }}
    >
      <header className="px-1">
        <p className="page-kicker">
          {new Date(now).toLocaleDateString(locale(), {month: 'long', day: 'numeric', weekday: 'long'})}
        </p>
        <h1 className="page-title">{greeting(now)}</h1>
      </header>
      <WeatherCard now={now} />
      {babies.length === 0 ? (
        <EmptyState
          kind="baby"
          title={tr('还没有宝宝', 'No baby yet')}
          text={tr(
            '添加宝宝后，这里会显示距上次喂奶的时间和今天的记录。',
            'Add your baby to see time since the last feed and today’s log here.',
          )}
          action={tr('添加宝宝', 'Add baby')}
          onAction={onAddBaby}
        />
      ) : (
        <div className="flex flex-1 flex-col">
          <div
            className="no-scrollbar flex gap-2 overflow-x-auto"
            role="tablist"
            aria-label={tr('切换宝宝', 'Switch baby')}
          >
            {babies.map((baby, i) => {
              const selected = i === current;
              return (
                <button
                  key={baby.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`baby-slide-${baby.id}`}
                  className={`flex min-h-[56px] flex-1 items-center gap-2.5 rounded-[20px] border px-3 py-2 text-left transition active:scale-[.98] ${babies.length > 2 ? 'min-w-[46%]' : 'min-w-0'} ${selected ? 'border-(--brand) bg-(--brand-pale) shadow-[0_4px_14px_rgba(19,121,91,.12)]' : 'border-(--line) bg-(--surface)/70'}`}
                  onClick={() => select(i)}
                >
                  <BabyAvatar
                    baby={baby}
                    url={avatarUrls[baby.id]}
                    tone={i % 2 ? 'warm' : 'green'}
                    small
                    onTint={selected}
                  />
                  <span className="min-w-0">
                    <span
                      className={`block truncate text-[15px] font-semibold ${selected ? 'text-(--brand)' : 'text-(--ink)'}`}
                    >
                      {babyName(baby)}
                    </span>
                    <span className="block truncate text-xs text-(--muted)">{babyAge(baby.birthday)}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {!multi ? (
            <div className="mt-2.5 flex flex-1 flex-col">{renderCard(babies[0], 0)}</div>
          ) : (
            <>
              <div
                ref={scroller}
                onScroll={onScroll}
                className="no-scrollbar relative -mx-5 mt-1.5 flex flex-1 snap-x snap-mandatory items-start gap-3 overflow-x-auto overscroll-x-contain scroll-px-5 px-5 pb-5 pt-1"
                aria-roledescription="carousel"
                aria-label={tr('宝宝卡片，左右滑动切换', 'Baby cards, swipe to switch')}
              >
                {babies.map((baby, i) => (
                  <div
                    key={baby.id}
                    id={`baby-slide-${baby.id}`}
                    role="tabpanel"
                    aria-roledescription="slide"
                    aria-label={tr(
                      `${babyName(baby)}，第 ${i + 1} 个，共 ${babies.length} 个`,
                      `${babyName(baby)}, ${i + 1} of ${babies.length}`,
                    )}
                    className={`flex min-h-(--slide-min) w-[calc(100%-56px)] shrink-0 flex-col snap-always ${i === babies.length - 1 ? 'snap-end' : 'snap-start'}`}
                  >
                    {renderCard(baby, i)}
                  </div>
                ))}
                <div aria-hidden className="w-2 shrink-0" />
              </div>
              <div className="-mt-3 flex justify-center gap-1.5" aria-hidden>
                {babies.map((baby, i) => (
                  <span
                    key={baby.id}
                    className={`h-1.5 rounded-full transition-all ${i === current ? 'w-5 bg-(--brand)' : 'w-1.5 bg-(--faint)/60'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
