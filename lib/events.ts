import {supabase} from './supabase';
import {tr} from './i18n';
import {validTime} from './feedings';
import {temperatureFromDisplay, temperatureText, temperatureUnit} from './growth-units';
import {timeLabel} from './dates';
import type {BabyEvent, DiaperType, EventKind} from './types';

export const eventKinds: EventKind[] = ['sleep', 'diaper', 'tummy', 'bath', 'medicine', 'temperature'];
export const eventLabel: Record<EventKind, () => string> = {
  sleep: () => tr('睡眠', 'Sleep'),
  diaper: () => tr('尿布', 'Diaper'),
  tummy: () => tr('趴趴时间', 'Tummy time'),
  bath: () => tr('洗澡', 'Bath'),
  medicine: () => tr('用药', 'Medicine'),
  temperature: () => tr('体温', 'Temperature'),
};
export const diaperTypes: DiaperType[] = ['wet', 'dirty', 'both'];
export const diaperLabel: Record<DiaperType, () => string> = {
  wet: () => tr('尿', 'Wet'),
  dirty: () => tr('便', 'Dirty'),
  both: () => tr('尿 + 便', 'Wet + dirty'),
};

const ms = (iso: string) => new Date(iso).getTime();
export const byNewestEvent = (a: BabyEvent, b: BabyEvent) => ms(b.started_at) - ms(a.started_at);

/** True when the table is missing because its migration hasn't run yet. */
export const isMissingTable = (e: {code?: string} | null) => e?.code === '42P01' || e?.code === 'PGRST205';

export async function fetchEvents(familyId: string, since: string | null, before: string | null = null) {
  const sb = supabase();
  const all: BabyEvent[] = [];
  for (let start = 0; ; start += 1000) {
    let query = sb.from('baby_events').select('*').eq('family_id', familyId);
    if (since) query = query.gte('started_at', since);
    if (before) query = query.lt('started_at', before);
    const {data, error} = await query
      .order('started_at', {ascending: false})
      .order('id')
      .range(start, start + 999);
    if (error) throw error;
    all.push(...((data ?? []) as BabyEvent[]));
    if ((data ?? []).length < 1000) break;
  }
  return all;
}

/** "45 min", "2 h 5 min". */
export function durationText(minutes: number) {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (!h) return tr(`${rest} 分钟`, `${rest} min`);
  return rest ? tr(`${h} 小时 ${rest} 分`, `${h} h ${rest} min`) : tr(`${h} 小时`, `${h} h`);
}
/** The open sleep, if the baby is asleep right now. */
export const openSleep = (events: BabyEvent[], babyId: string) =>
  events.find(e => e.baby_id === babyId && e.kind === 'sleep' && !e.ended_at);
/** Minutes of an event inside [from, to); an ongoing sleep counts up to `now`. */
export function minutesWithin(e: BabyEvent, from: number, to: number, now: number) {
  const start = Math.max(ms(e.started_at), from);
  const end = Math.min(e.ended_at ? ms(e.ended_at) : now, to);
  return end > start ? (end - start) / 60000 : 0;
}

/** One line describing an event, without its time: "2 h 30 min", "Wet", "37.8 °C", the medicine note. */
export function eventDetail(e: BabyEvent, now: number) {
  switch (e.kind) {
    case 'sleep':
    case 'tummy':
      return e.ended_at
        ? durationText((ms(e.ended_at) - ms(e.started_at)) / 60000)
        : tr(
            `睡着了 · ${durationText((now - ms(e.started_at)) / 60000)}`,
            `Asleep · ${durationText((now - ms(e.started_at)) / 60000)}`,
          );
    case 'diaper':
      return e.diaper ? diaperLabel[e.diaper]() : '';
    case 'temperature':
      return e.temperature_c === null ? '' : temperatureText(Number(e.temperature_c));
    default:
      return '';
  }
}
/** "21:10–23:40" for sleep and tummy time, "21:10" otherwise. */
export function eventTime(e: BabyEvent) {
  if (e.kind === 'sleep' && !e.ended_at) return `${timeLabel(e.started_at)}–`;
  return e.ended_at && (e.kind === 'sleep' || e.kind === 'tummy')
    ? `${timeLabel(e.started_at)}–${timeLabel(e.ended_at)}`
    : timeLabel(e.started_at);
}

export type DaySummary = {
  sleepMinutes: number;
  diapers: number;
  wet: number;
  dirty: number;
  other: number;
};
/** Totals for one baby over [from, to). Sleep that crosses midnight is split between the two days. */
export function summarize(events: BabyEvent[], from: number, to: number, now: number): DaySummary {
  const s: DaySummary = {sleepMinutes: 0, diapers: 0, wet: 0, dirty: 0, other: 0};
  for (const e of events) {
    if (e.kind === 'sleep') {
      s.sleepMinutes += minutesWithin(e, from, to, now);
      continue;
    }
    const t = ms(e.started_at);
    if (t < from || t >= to) continue;
    if (e.kind === 'diaper') {
      s.diapers++;
      if (e.diaper !== 'dirty') s.wet++;
      if (e.diaper !== 'wet') s.dirty++;
    } else s.other++;
  }
  return s;
}
/** Whether an event belongs on a day's list: it starts that day, or it is a sleep running into it. */
export function onDay(e: BabyEvent, from: number, to: number, now: number) {
  const t = ms(e.started_at);
  return (t >= from && t < to) || (e.kind === 'sleep' && minutesWithin(e, from, to, now) > 0);
}

/** The event sheet's fields. Times are local "YYYY-MM-DDTHH:mm" strings like the feed sheet. */
export type EventForm = {
  baby_id: string;
  kind: EventKind;
  started_at: string;
  /** Sleep: still asleep, so no end time yet. */
  ongoing: boolean;
  ended_at: string;
  /** Tummy time, in minutes. */
  duration: string;
  diaper: DiaperType | null;
  /** In the device's temperature unit. */
  temperature: string;
  note: string;
};

/** Validates the event sheet and returns the columns to save. Throws a user-facing Error when invalid. */
export function parseEventForm(form: EventForm, activeBabyIds: string[]) {
  if (!activeBabyIds.includes(form.baby_id))
    throw new Error(tr('请选择当前家庭的宝宝。', 'Choose a baby from this family.'));
  if (!validTime(form.started_at))
    throw new Error(
      tr('请选择有效的时间，不能是未来时间。', 'Choose a valid time that isn’t in the future.'),
    );
  const started = new Date(form.started_at);
  let ended: Date | null = null;
  if (form.kind === 'sleep' && !form.ongoing) {
    if (!validTime(form.ended_at))
      throw new Error(
        tr('请选择有效的醒来时间，不能是未来时间。', 'Choose a valid wake-up time that isn’t in the future.'),
      );
    ended = new Date(form.ended_at);
    if (ended <= started)
      throw new Error(tr('醒来时间要晚于入睡时间。', 'The wake-up time must be after falling asleep.'));
    if (ended.getTime() - started.getTime() > 24 * 3600000)
      throw new Error(tr('一次睡眠不能超过 24 小时。', 'A single sleep can’t be longer than 24 hours.'));
  }
  if (form.kind === 'tummy') {
    const minutes = Number(form.duration.trim());
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 240)
      throw new Error(tr('时长请输入 1–240 之间的整数分钟。', 'Enter 1–240 whole minutes.'));
    ended = new Date(Math.min(started.getTime() + minutes * 60000, Date.now()));
  }
  if (form.kind === 'diaper' && !form.diaper)
    throw new Error(tr('请选择尿布情况。', 'Choose wet, dirty or both.'));
  let temperature: number | null = null;
  if (form.kind === 'temperature') {
    const typed = Number(form.temperature.trim());
    temperature = form.temperature.trim() ? temperatureFromDisplay(typed) : NaN;
    if (!Number.isFinite(temperature) || temperature < 34 || temperature > 43)
      throw new Error(
        tr(
          `请输入合理的体温（${temperatureUnit() === '°F' ? '93.2–109.4 °F' : '34–43 °C'}）。`,
          `Enter a temperature between ${temperatureUnit() === '°F' ? '93.2 and 109.4 °F' : '34 and 43 °C'}.`,
        ),
      );
  }
  const note = form.note.trim() || null;
  if (form.kind === 'medicine' && !note)
    throw new Error(tr('请填写药名和剂量。', 'Enter the medicine and dose.'));
  return {
    kind: form.kind,
    started_at: started.toISOString(),
    ended_at: ended ? ended.toISOString() : null,
    diaper: form.kind === 'diaper' ? form.diaper : null,
    temperature_c: temperature,
    note,
  };
}
