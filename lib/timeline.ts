import {growthAge} from './who-growth';
import {guideFor, guideItem, MILESTONE_AGES, type GuideItem, type Region} from './guide';
import {tr} from './i18n';
import type {Baby, Moment, MomentKind} from './types';

export type Ages = {
  /** Months since birth. */
  actual: number;
  /** Months adjusted for prematurity (equals `actual` for term babies and after 24 months). */
  corrected: number;
  isCorrected: boolean;
};
export function babyAges(baby: Pick<Baby, 'birthday' | 'gestational_age_days'>, today: string): Ages {
  const actual = growthAge(baby.birthday, today, null).months;
  const c = growthAge(baby.birthday, today, baby.gestational_age_days);
  return {actual, corrected: c.months, isCorrected: c.corrected};
}
/** The age a guide item is measured against: corrected for development, actual for vaccines and checkups. */
export const ageFor = (item: GuideItem, ages: Ages) => (item.corrected ? ages.corrected : ages.actual);

export type Timeline = {
  ages: Ages;
  /** Phases the baby is in right now. */
  phases: GuideItem[];
  /** Health tips for this age, safety items first. */
  tips: GuideItem[];
  /** What's ahead on the timeline: doctor visits and milestone checklists, nearest first. */
  upcoming: Upcoming[];
  /** Logged moments, newest first. */
  moments: Moment[];
  /** guide_key → moment, for showing guide items as done. */
  done: Map<string, Moment>;
};

/** A future node on the timeline: one doctor visit, or the milestones to look out for by one age. */
export type Upcoming = {
  kind: 'visit' | 'milestones';
  /** Age in months the node is scheduled for. */
  from: number;
  /** Checkup first, then vaccines; or the highlighted milestones of the checklist age. */
  items: GuideItem[];
  /** Items not logged yet. */
  open: GuideItem[];
  /** The window has started: the baby is old enough now. */
  due: boolean;
};

/** Milestone checklist ages close to the current (corrected) age: the stage now and the next one. */
export function nearMilestoneAges(corrected: number) {
  return MILESTONE_AGES.filter(a => a >= corrected - 1 && a <= corrected + 3).slice(0, 2);
}

export function buildTimeline(
  baby: Pick<Baby, 'id' | 'birthday' | 'gestational_age_days'>,
  moments: Moment[],
  region: Region,
  today: string,
): Timeline {
  const ages = babyAges(baby, today);
  const mine = moments
    .filter(m => m.baby_id === baby.id)
    .sort((a, b) => b.occurred_on.localeCompare(a.occurred_on) || b.created_at.localeCompare(a.created_at));
  const done = new Map(mine.flatMap(m => (m.guide_key ? [[m.guide_key, m] as const] : [])));
  const guide = guideFor(region);
  const within = (item: GuideItem) => {
    const age = ageFor(item, ages);
    return item.from <= age && age <= item.to;
  };
  // Milestone checklists from the current age on, skipping ages whose highlights are all logged.
  const milestoneNodes: Upcoming[] = MILESTONE_AGES.filter(a => a >= ages.corrected - 1).flatMap(age => {
    const items = guide.filter(i => i.kind === 'milestone' && i.highlight && i.from === age);
    const open = items.filter(i => !done.has(i.key));
    // Milestones are things to look out for *by* this age, so the window opens well before it.
    return open.length
      ? [{kind: 'milestones' as const, from: age, items, open, due: ages.corrected >= age - 2}]
      : [];
  });
  // Vaccines and checkups still open, grouped by visit age. Windows that closed over a month ago are left
  // to the full guide rather than kept on the timeline forever.
  const health = guide.filter(i => i.kind === 'vaccine' || i.kind === 'checkup');
  const pending = health.filter(i => {
    if (done.has(i.key)) return false;
    // The RSV antibody is seasonal and depends on the mother's vaccine, so don't keep it "due" for months.
    if (i.vaccine === 'rsv' && ages.actual > 1) return false;
    return i.to >= ageFor(i, ages) - 1;
  });
  const visitNodes: Upcoming[] = [...new Set(pending.map(i => i.from))]
    .sort((a, b) => a - b)
    .map(from => {
      const items = health
        .filter(i => i.from === from && (i.vaccine !== 'rsv' || pending.includes(i)))
        .sort((a, b) => kindOrder(a) - kindOrder(b));
      return {
        kind: 'visit',
        from,
        items,
        open: items.filter(i => !done.has(i.key)),
        due: ageFor(items[0], ages) >= from,
      };
    });
  // Milestones sort just ahead of the visit at the same age: families watch for them before the checkup.
  const upcoming = [...milestoneNodes, ...visitNodes].sort(
    (a, b) => sortAge(a) - sortAge(b) || Number(b.kind === 'milestones') - Number(a.kind === 'milestones'),
  );
  return {
    ages,
    phases: guide.filter(item => item.kind === 'phase' && within(item)),
    tips: guide
      .filter(item => item.kind === 'tip' && within(item))
      .sort((a, b) => Number(!!b.important) - Number(!!a.important)),
    upcoming,
    moments: mine,
    done,
  };
}
const sortAge = (n: Upcoming) => (n.kind === 'milestones' ? n.from - 0.5 : n.from);
const ORDER: Record<GuideItem['kind'], number> = {checkup: 0, vaccine: 1, milestone: 2, phase: 3, tip: 4};
const kindOrder = (item: GuideItem) => ORDER[item.kind];

export type DueState = 'now' | 'soon' | 'past';
/** Where a vaccine or checkup stands relative to today. */
export function dueState(item: GuideItem, ages: Ages): DueState {
  const age = ageFor(item, ages);
  if (age < item.from) return 'soon';
  return age <= item.to + 1 ? 'now' : 'past';
}

/** "2 months", "12–15 months", "4–6 years", "at birth", "3–5 days" for a guide item's age window. */
export function ageWindowLabel(item: Pick<GuideItem, 'from' | 'to'>) {
  const one = (m: number) => {
    if (m === 0) return tr('出生时', 'at birth');
    if (m < 0.5) return tr('出生后几天', 'first days');
    if (m < 1) return tr('满月', '1 month');
    if (m >= 24 && m % 12 === 0) return tr(`${m / 12} 岁`, `${m / 12} years`);
    return tr(`${trim(m)} 个月`, `${trim(m)} month${m === 1 ? '' : 's'}`);
  };
  if (item.to <= item.from) return one(item.from);
  if (item.from === 0) return tr(`出生–${trim(item.to)} 个月`, `birth–${trim(item.to)} months`);
  if (item.from >= 24 && item.from % 12 === 0 && item.to % 12 === 0)
    return tr(`${item.from / 12}–${item.to / 12} 岁`, `${item.from / 12}–${item.to / 12} years`);
  return tr(`${trim(item.from)}–${trim(item.to)} 个月`, `${trim(item.from)}–${trim(item.to)} months`);
}
const trim = (m: number) => String(Math.round(m * 10) / 10);

/** Age on a given date: days in the first 2 weeks, weeks until 3 months, then months (and years). */
export function ageOn(birthday: string, date: string) {
  const days = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${birthday}T00:00:00Z`)) / 86400000);
  if (!Number.isFinite(days)) return '';
  if (days <= 0) return tr('出生当天', 'birth day');
  if (days < 14) return tr(`${days} 天`, `${days} day${days === 1 ? '' : 's'}`);
  if (days < 91) {
    const weeks = Math.floor(days / 7);
    return tr(`${weeks} 周`, `${weeks} weeks`);
  }
  const months = Math.floor(growthAge(birthday, date, null).months + 1e-9);
  if (months < 24) return tr(`${months} 个月`, `${months} months`);
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest
    ? tr(`${years} 岁 ${rest} 个月`, `${years} yr ${rest} mo`)
    : tr(`${years} 岁`, `${years} years`);
}

export type MomentForm = {
  kind: MomentKind;
  guide_key: string | null;
  title: string;
  occurred_on: string;
  note: string;
};
/** Validates a moment form; throws a user-facing error. */
export function parseMomentForm(form: MomentForm, birthday: string, today: string) {
  const title = form.title.trim();
  if (!title) throw new Error(tr('请填写标题。', 'Add a title.'));
  if (title.length > 80) throw new Error(tr('标题最多 80 个字。', 'The title can be at most 80 characters.'));
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(form.occurred_on) ||
    form.occurred_on < birthday ||
    form.occurred_on > today
  )
    throw new Error(tr('日期应在出生日期至今天之间。', 'The date must be between birth and today.'));
  const note = form.note.trim();
  if (note.length > 500)
    throw new Error(tr('备注最多 500 个字。', 'The note can be at most 500 characters.'));
  const item = guideItem(form.guide_key);
  return {
    kind: item && item.kind !== 'phase' && item.kind !== 'tip' ? item.kind : form.kind,
    guide_key: item ? item.key : null,
    title,
    occurred_on: form.occurred_on,
    note: note || null,
  };
}
