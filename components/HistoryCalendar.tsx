'use client';
import {useMemo, useState} from 'react';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import type {Baby, BabyEvent, EventKind, Feeding} from '@/lib/types';
import {durationText, eventDetail, eventLabel, eventTime, onDay, summarize} from '@/lib/events';
import {EventBadge, eventTone} from './event-ui';
import {babyName, typeLabels} from '@/lib/types';
import {dateLabel, dayKey, timeLabel} from '@/lib/dates';
import {locale, tr} from '@/lib/i18n';
import {compactVolume, feedingAmount, minutesLabel, useUnit, volumeLabel, volumeNumber} from '@/lib/units';
import {BabyChips} from './ui';
import {EmptyArt} from './art';

const weekdayNames = () =>
  tr('日一二三四五六', 'SMTWTFS')
    .split('')
    .map(day => tr(`周${day}`, day));
type Props = {
  babies: Baby[];
  feedings: Feeding[];
  events: BabyEvent[];
  now: number;
  onSelect: (feeding: Feeding) => void;
  onSelectEvent: (event: BabyEvent) => void;
  recorderName: (userId: string) => string;
  onMonthChange: (monthStart: Date) => void;
  loadingOlder: boolean;
  avatarUrls: Record<string, string>;
};

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
function moveMonth(value: string, offset: number) {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1 + offset, 1);
}
type Filter = 'all' | 'feed' | 'sleep' | 'diaper' | 'other';
const filters: [Filter, () => string][] = [
  ['all', () => tr('全部', 'All')],
  ['feed', () => tr('喂奶', 'Feeds')],
  ['sleep', () => tr('睡眠', 'Sleep')],
  ['diaper', () => tr('尿布', 'Diapers')],
  ['other', () => tr('其他', 'Other')],
];
const filterOf = (kind: EventKind): Filter => (kind === 'sleep' || kind === 'diaper' ? kind : 'other');
const dayBounds = (key: string) => {
  const from = new Date(`${key}T00:00:00`);
  const to = new Date(from);
  to.setDate(to.getDate() + 1);
  return [from.getTime(), to.getTime()] as const;
};

/**
 * The day at a glance: a 0–24 h strip with sleep as bands, feeds as tall ticks and everything else
 * as dots in its kind's color.
 */
function DayRhythm({
  from,
  to,
  feeds,
  events,
  now,
}: {
  from: number;
  to: number;
  feeds: Feeding[];
  events: BabyEvent[];
  now: number;
}) {
  const span = to - from;
  const pct = (t: number) => `${Math.min(100, Math.max(0, ((t - from) / span) * 100))}%`;
  return (
    <div aria-hidden className="rounded-2xl border border-(--line) bg-(--surface) px-3 pt-3 pb-2">
      <div className="relative h-9 rounded-lg bg-(--surface-2)">
        {[6, 12, 18].map(h => (
          <span
            key={h}
            className="absolute inset-y-0 w-px bg-(--line)"
            style={{left: `${(h / 24) * 100}%`}}
          />
        ))}
        {events
          .filter(e => e.kind === 'sleep')
          .map(e => {
            const start = Math.max(new Date(e.started_at).getTime(), from);
            const end = Math.min(e.ended_at ? new Date(e.ended_at).getTime() : now, to);
            return end > start ? (
              <span
                key={e.id}
                className={`absolute inset-y-1 rounded-md ${e.ended_at ? '' : 'animate-pulse'}`}
                style={{
                  left: pct(start),
                  width: `max(3px, calc(${pct(end)} - ${pct(start)}))`,
                  background: eventTone.sleep.bar,
                  opacity: 0.55,
                }}
              />
            ) : null;
          })}
        {feeds.map(f => (
          <span
            key={f.id}
            className="absolute -top-1 -bottom-1 w-[3px] -translate-x-1/2 rounded-full bg-(--brand)"
            style={{left: pct(new Date(f.fed_at).getTime())}}
          />
        ))}
        {events
          .filter(e => e.kind !== 'sleep')
          .map(e => (
            <span
              key={e.id}
              className="absolute bottom-1 h-2 w-2 -translate-x-1/2 rounded-full ring-2 ring-(--surface)"
              style={{left: pct(new Date(e.started_at).getTime()), background: eventTone[e.kind].bar}}
            />
          ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-(--soft)">
        {['0', '6', '12', '18', '24'].map(h => (
          <span key={h}>{h}</span>
        ))}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-(--muted)">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-[3px] rounded-full bg-(--brand)" />
          {tr('喂奶', 'Feed')}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-3 rounded-sm" style={{background: eventTone.sleep.bar, opacity: 0.55}} />
          {tr('睡眠', 'Sleep')}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{background: eventTone.diaper.bar}} />
          {tr('尿布', 'Diaper')}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{background: eventTone.bath.bar}} />
          {tr('其他', 'Other')}
        </span>
      </div>
    </div>
  );
}

function amountLabel(total: number, hasAmount: boolean, minutes = 0) {
  return hasAmount ? volumeLabel(total) : minutes ? minutesLabel(minutes) : tr('待补充', 'pending');
}

export default function HistoryCalendar({
  babies,
  feedings,
  events,
  now,
  onSelect,
  onSelectEvent,
  recorderName,
  onMonthChange,
  loadingOlder,
  avatarUrls,
}: Props) {
  const unit = useUnit();
  const today = dayKey(new Date());
  const [babyId, setBabyId] = useState('');
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [selectedDate, setSelectedDate] = useState(today);
  const [filter, setFilter] = useState<Filter>('all');
  const currentMonth = today.slice(0, 7);
  const selectedBabyId =
    babyId && babies.some(baby => baby.id === babyId)
      ? babyId
      : (babies.find(baby => baby.is_active)?.id ?? babies[0]?.id ?? '');
  const babyById = useMemo(() => new Map(babies.map(baby => [baby.id, baby])), [babies]);
  const filtered = useMemo(
    () => (selectedBabyId ? feedings.filter(item => item.baby_id === selectedBabyId) : []),
    [feedings, selectedBabyId],
  );
  const daily = useMemo(() => {
    const result = new Map<string, {total: number; count: number; hasAmount: boolean; minutes: number}>();
    for (const item of filtered) {
      const key = dayKey(new Date(item.fed_at));
      const current = result.get(key) ?? {total: 0, count: 0, hasAmount: false, minutes: 0};
      current.count += 1;
      if (item.amount_ml !== null) {
        current.total += item.amount_ml;
        current.hasAmount = true;
      } else if (item.duration_min) current.minutes += item.duration_min;
      result.set(key, current);
    }
    return result;
  }, [filtered]);
  const babyEvents = useMemo(
    () => (selectedBabyId ? events.filter(e => e.baby_id === selectedBabyId) : []),
    [events, selectedBabyId],
  );
  // Which kinds of care records each day has, for the dots in the calendar cells.
  const dailyKinds = useMemo(() => {
    const result = new Map<string, Set<Filter>>();
    for (const e of babyEvents) {
      const key = dayKey(new Date(e.started_at));
      const set = result.get(key) ?? new Set<Filter>();
      set.add(filterOf(e.kind));
      result.set(key, set);
    }
    return result;
  }, [babyEvents]);
  const [dayFrom, dayTo] = dayBounds(selectedDate);
  const dayEvents = useMemo(
    () => babyEvents.filter(e => onDay(e, dayFrom, dayTo, now)),
    [babyEvents, dayFrom, dayTo, now],
  );
  const care = summarize(dayEvents, dayFrom, dayTo, now);
  const selectedRows = useMemo(
    () =>
      filtered
        .filter(item => dayKey(new Date(item.fed_at)) === selectedDate)
        .sort((a, b) => new Date(b.fed_at).getTime() - new Date(a.fed_at).getTime()),
    [filtered, selectedDate],
  );
  const calendar = useMemo(() => {
    const [year, monthNumber] = month.split('-').map(Number);
    const first = new Date(year, monthNumber - 1, 1);
    const count = new Date(year, monthNumber, 0).getDate();
    return {
      year,
      monthNumber,
      offset: first.getDay(),
      days: Array.from({length: count}, (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`),
    };
  }, [month]);
  function changeMonth(offset: number) {
    const next = moveMonth(month, offset);
    const key = monthKey(next);
    onMonthChange(next);
    setMonth(key);
    setSelectedDate(key === currentMonth ? today : `${key}-01`);
  }
  return (
    <>
      <BabyChips
        babies={babies}
        value={selectedBabyId}
        onChange={setBabyId}
        avatarUrls={avatarUrls}
        label={tr('选择宝宝', 'Choose baby')}
      />
      <section className="ui-card p-3">
        <div className="flex items-center justify-between px-1 py-2">
          <button
            type="button"
            className="ui-icon-button"
            aria-label={tr('上个月', 'Previous month')}
            onClick={() => changeMonth(-1)}
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <h2 className="text-lg font-semibold tracking-tight">
              {tr(
                `${calendar.year}年${calendar.monthNumber}月`,
                new Date(calendar.year, calendar.monthNumber - 1, 1).toLocaleDateString(locale(), {
                  month: 'long',
                  year: 'numeric',
                }),
              )}
            </h2>
            {loadingOlder && (
              <p className="text-xs text-(--soft)" role="status">
                {tr('正在加载…', 'Loading…')}
              </p>
            )}
          </div>
          <button
            type="button"
            disabled={month >= currentMonth}
            className="ui-icon-button disabled:cursor-not-allowed disabled:opacity-30"
            aria-label={tr('下个月', 'Next month')}
            onClick={() => changeMonth(1)}
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="mt-2 grid grid-cols-7 text-center text-xs font-semibold text-(--soft)">
          {weekdayNames().map((day, index) => (
            <div className="py-2" key={index}>
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({length: calendar.offset}, (_, index) => (
            <div key={`blank-${index}`} />
          ))}
          {calendar.days.map(key => {
            const day = daily.get(key);
            const selected = selectedDate === key;
            const isToday = key === today;
            return (
              <button
                type="button"
                key={key}
                aria-pressed={selected}
                aria-label={tr(
                  `${key}，${day ? amountLabel(day.total, day.hasAmount, day.minutes) : '无记录'}`,
                  `${key}, ${day ? amountLabel(day.total, day.hasAmount, day.minutes) : 'no records'}`,
                )}
                className={`relative flex min-h-[68px] flex-col items-center rounded-xl border px-0.5 py-1.5 transition ${selected ? 'border-(--brand) bg-(--brand-pale) shadow-[0_3px_10px_rgba(19,121,91,.12)]' : day ? 'border-(--line) bg-(--surface-2)' : 'border-transparent bg-(--surface-2)'} active:scale-[.97]`}
                onClick={() => setSelectedDate(key)}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold ${isToday ? 'bg-(--brand-solid) text-white' : selected ? 'text-(--brand)' : 'text-(--ink-2)'}`}
                >
                  {Number(key.slice(-2))}
                </span>
                {day ? (
                  <>
                    <span className="mt-1 max-w-full truncate text-[10px] font-bold leading-none text-(--brand)">
                      {day.hasAmount
                        ? compactVolume(day.total)
                        : day.minutes
                          ? minutesLabel(day.minutes)
                          : `— ${unit}`}
                    </span>
                    <span className="mt-1 text-[9px] leading-none text-(--soft)">
                      {day.count}
                      {tr('次', '×')}
                    </span>
                  </>
                ) : null}
                {dailyKinds.get(key) && (
                  <span className="mt-auto flex gap-0.5 pt-0.5">
                    {(['sleep', 'diaper', 'other'] as const)
                      .filter(k => dailyKinds.get(key)!.has(k))
                      .map(k => (
                        <span
                          key={k}
                          className="h-1.5 w-1.5 rounded-full"
                          style={{background: eventTone[k === 'other' ? 'bath' : k].bar}}
                        />
                      ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>
      <section className="space-y-3">
        <div>
          <p className="text-sm text-(--muted)">{dateLabel(`${selectedDate}T12:00:00`)}</p>
          <h2 className="mt-1 text-xl font-semibold">{tr('当天记录', 'Records that day')}</h2>
        </div>
        {(() => {
          const day = daily.get(selectedDate);
          const tiles: [Filter, string, string, string][] = [
            [
              'feed',
              tr('喂奶', 'Feeds'),
              day ? amountLabel(day.total, day.hasAmount, day.minutes) : '—',
              day ? tr(`${day.count} 次`, `${day.count} feeds`) : '',
            ],
            [
              'sleep',
              tr('睡眠', 'Sleep'),
              care.sleepMinutes >= 1 ? durationText(care.sleepMinutes) : '—',
              tr(
                `${dayEvents.filter(e => e.kind === 'sleep').length} 段`,
                `${dayEvents.filter(e => e.kind === 'sleep').length} naps`,
              ),
            ],
            [
              'diaper',
              tr('尿布', 'Diapers'),
              care.diapers ? String(care.diapers) : '—',
              care.diapers
                ? tr(`尿 ${care.wet} · 便 ${care.dirty}`, `${care.wet} wet · ${care.dirty} dirty`)
                : '',
            ],
          ];
          return (
            <div className="grid grid-cols-3 gap-2">
              {tiles.map(([key, label, value, sub]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={filter === key}
                  className={`rounded-2xl border px-3 py-2 text-left transition ${filter === key ? 'border-(--brand) bg-(--brand-pale)' : 'border-(--line) bg-(--surface)'}`}
                  onClick={() => setFilter(f => (f === key ? 'all' : key))}
                >
                  <span className="block text-[11px] font-medium text-(--muted)">{label}</span>
                  <strong className="block truncate text-[15px] text-(--ink)">{value}</strong>
                  <span className="block truncate text-[11px] text-(--soft)">{sub || '\u00a0'}</span>
                </button>
              ))}
            </div>
          );
        })()}
        {(selectedRows.length > 0 || dayEvents.length > 0) && (
          <DayRhythm from={dayFrom} to={dayTo} feeds={selectedRows} events={dayEvents} now={now} />
        )}
        <div
          className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1"
          role="group"
          aria-label={tr('筛选记录', 'Filter records')}
        >
          {filters.map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              className={`min-h-9 shrink-0 rounded-full px-3.5 text-[13px] font-semibold transition ${filter === key ? 'bg-(--brand-solid) text-white' : 'bg-(--chip) text-(--muted)'}`}
              onClick={() => setFilter(key)}
            >
              {label()}
            </button>
          ))}
        </div>
        {(() => {
          const rows = [
            ...(filter === 'all' || filter === 'feed'
              ? selectedRows.map(f => ({at: f.fed_at, feed: f, event: null as BabyEvent | null}))
              : []),
            ...dayEvents
              .filter(e => filter === 'all' || filterOf(e.kind) === filter)
              .map(e => ({at: e.started_at, feed: null as Feeding | null, event: e})),
          ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
          if (!rows.length)
            return (
              <div className="flex flex-col items-center rounded-2xl border border-dashed border-(--line) bg-(--surface)/60 px-5 py-5 text-center text-sm text-(--soft)">
                <EmptyArt kind="calendar" className="h-20 w-28" />
                <span className="mt-1">
                  {filter === 'all'
                    ? tr('这一天没有记录', 'Nothing logged on this day')
                    : tr('这一天没有这类记录', 'Nothing of this kind on this day')}
                </span>
              </div>
            );
          return (
            <div className="space-y-2">
              {rows.map(({feed: item, event}) => {
                if (item) {
                  const baby = babyById.get(item.baby_id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-(--line) bg-(--surface) px-4 py-2.5 text-left shadow-[0_3px_14px_rgba(31,67,52,.04)]"
                      onClick={() => onSelect(item)}
                    >
                      <div className="w-12 shrink-0 text-sm font-semibold text-(--ink-2)">
                        {timeLabel(item.fed_at)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">
                          {tr('喂奶', 'Feed')} · {typeLabels[item.feeding_type]}
                        </p>
                        <p className="truncate text-sm text-(--soft)">
                          {baby ? `${babyName(baby)} · ` : ''}
                          {recorderName(item.created_by)}
                          {item.note ? ` · ${item.note}` : ''}
                        </p>
                      </div>
                      <strong className="shrink-0 text-lg">
                        {item.amount_ml === null ? (
                          feedingAmount(item)
                        ) : (
                          <>
                            {volumeNumber(item.amount_ml)}{' '}
                            <span className="text-sm font-normal text-(--muted)">{unit}</span>
                          </>
                        )}
                      </strong>
                      <ChevronRight size={16} className="shrink-0 text-(--faint)" />
                    </button>
                  );
                }
                if (!event) return null;
                const detail = eventDetail(event, now);
                return (
                  <button
                    key={event.id}
                    type="button"
                    className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-(--line) bg-(--surface) px-4 py-2.5 text-left shadow-[0_3px_14px_rgba(31,67,52,.04)]"
                    onClick={() => onSelectEvent(event)}
                  >
                    <div className="w-12 shrink-0 text-sm leading-tight font-semibold text-(--ink-2)">
                      {eventTime(event)
                        .split('–')
                        .map((part, i) => (
                          <span key={i} className={i ? 'block text-xs font-normal text-(--soft)' : 'block'}>
                            {i ? `–${part || tr('现在', 'now')}` : part}
                          </span>
                        ))}
                    </div>
                    <EventBadge kind={event.kind} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{eventLabel[event.kind]()}</p>
                      <p className="truncate text-sm text-(--soft)">
                        {event.note ? `${event.note} · ` : ''}
                        {recorderName(event.created_by)}
                      </p>
                    </div>
                    {detail && (
                      <strong className={`shrink-0 text-[15px] ${eventTone[event.kind].text}`}>
                        {detail}
                      </strong>
                    )}
                    <ChevronRight size={16} className="shrink-0 text-(--faint)" />
                  </button>
                );
              })}
            </div>
          );
        })()}
      </section>
    </>
  );
}
