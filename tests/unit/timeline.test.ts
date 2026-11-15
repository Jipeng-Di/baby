import {afterEach, describe, expect, it} from 'vitest';
import {guideFor, guideItem, loggable, SOURCES} from '@/lib/guide';
import {
  ageOn,
  ageWindowLabel,
  babyAges,
  buildTimeline,
  dueState,
  nearMilestoneAges,
  parseMomentForm,
} from '@/lib/timeline';
import {setLang} from '@/lib/i18n';
import type {Moment} from '@/lib/types';

afterEach(() => setLang('en'));

const baby = {id: 'b1', birthday: '2026-06-25', gestational_age_days: null};
const moment = (over: Partial<Moment>): Moment => ({
  id: 'x',
  baby_id: 'b1',
  family_id: 'f',
  recorded_by: 'u',
  kind: 'milestone',
  guide_key: null,
  title: 'Smiled',
  occurred_on: '2026-08-10',
  note: null,
  photo_path: null,
  created_at: '2026-08-10T10:00:00Z',
  updated_at: '2026-08-10T10:00:00Z',
  ...over,
});

describe('guide content', () => {
  it('has unique keys and a source on every item', () => {
    for (const region of ['us', 'cn'] as const) {
      const items = guideFor(region);
      expect(new Set(items.map(i => i.key)).size).toBe(items.length);
      for (const item of items) {
        expect(item.title.zh && item.title.en).toBeTruthy();
        expect(item.source.name.en).toBeTruthy();
        expect(item.to).toBeGreaterThanOrEqual(item.from);
      }
    }
  });
  it('follows the 2026 China schedule for DTaP (2, 4, 6, 18 months, 6 years)', () => {
    const dtap = guideFor('cn').filter(i => i.vaccine === 'dtap');
    expect(dtap.map(i => i.from)).toEqual([2, 4, 6, 18, 72]);
  });
  it('follows the AAP schedule for MMR (12–15 months, 4–6 years)', () => {
    const mmr = guideFor('us').filter(i => i.vaccine === 'mmr');
    expect(mmr.map(i => [i.from, i.to])).toEqual([
      [12, 15],
      [48, 72],
    ]);
  });
  it('keeps region-only items out of the other region', () => {
    expect(guideFor('cn').some(i => i.key === 't.iron')).toBe(false);
    expect(guideFor('us').some(i => i.vaccine === 'bcg')).toBe(false);
    expect(guideFor('us').some(i => i.key === 'p.crying')).toBe(true);
  });
  it('lets families tick off milestones, vaccines and checkups only', () => {
    expect(loggable(guideItem('m.2.social-smile')!)).toBe(true);
    expect(loggable(guideItem('v.us.dtap.1')!)).toBe(true);
    expect(loggable(guideItem('p.crying')!)).toBe(false);
    expect(SOURCES.cnSchedule.url).toMatch(/^https:/);
  });
});

describe('timeline', () => {
  it('shows the colic phase and fever safety tip at 6 weeks', () => {
    const t = buildTimeline(baby, [], 'us', '2026-08-06');
    expect(t.phases.map(p => p.key)).toContain('p.crying');
    expect(t.tips[0].key).toBe('t.fever');
  });
  it('groups the 2-month checkup and vaccines into one visit at 6 weeks', () => {
    const t = buildTimeline(baby, [], 'us', '2026-08-06');
    expect(t.visits.map(v => v.from)).toEqual([1, 2]);
    const two = t.visits[1];
    expect(two.items[0].key).toBe('c.us.2');
    expect(two.items.map(i => i.key)).toContain('v.us.dtap.1');
    expect(two.items.some(i => i.key === 'v.us.mmr.1')).toBe(false);
    expect(t.milestones.map(i => i.key)).toContain('m.2.social-smile');
  });
  it('drops logged items and maps them as done', () => {
    const logged = moment({guide_key: 'v.us.dtap.1', kind: 'vaccine'});
    const t = buildTimeline(baby, [logged, moment({id: 'other', baby_id: 'b2'})], 'us', '2026-08-06');
    const two = t.visits.find(v => v.from === 2)!;
    expect(two.items.some(i => i.key === 'v.us.dtap.1')).toBe(true);
    expect(two.open.some(i => i.key === 'v.us.dtap.1')).toBe(false);
    expect(t.done.get('v.us.dtap.1')?.id).toBe('x');
    expect(t.moments).toHaveLength(1);
  });
  it('moves on to the next milestone age once the current highlights are logged', () => {
    const keys = ['m.2.social-smile', 'm.2.sounds', 'm.2.head-up'];
    const t = buildTimeline(
      baby,
      keys.map((k, i) => moment({id: k + i, guide_key: k})),
      'us',
      '2026-08-06',
    );
    expect(t.milestones.every(i => i.from === 4)).toBe(true);
  });
  it('stops showing the seasonal RSV antibody after the first month', () => {
    const t = buildTimeline(baby, [], 'us', '2026-10-25');
    expect(t.visits.flatMap(v => v.items).some(i => i.vaccine === 'rsv')).toBe(false);
  });
  it('uses corrected age for milestones and actual age for vaccines', () => {
    const preterm = {...baby, gestational_age_days: 30 * 7};
    const ages = babyAges(preterm, '2026-10-25');
    expect(ages.isCorrected).toBe(true);
    expect(ages.actual - ages.corrected).toBeCloseTo(70 / 30.4375, 3);
    const t = buildTimeline(preterm, [], 'us', '2026-10-25');
    // Actual age 4 months: the 4-month visit is due even though corrected age is under 2 months.
    expect(t.visits.some(v => v.from === 4)).toBe(true);
    expect(t.milestones.every(i => i.from === 2)).toBe(true);
  });
  it('picks the current and next milestone checklist ages', () => {
    expect(nearMilestoneAges(0.5)).toEqual([2]);
    expect(nearMilestoneAges(4.7)).toEqual([4, 6]);
    expect(nearMilestoneAges(13)).toEqual([12, 15]);
  });
  it('marks vaccines as soon, due now or past', () => {
    const ages = babyAges(baby, '2026-08-06');
    expect(dueState(guideItem('v.us.dtap.1')!, ages)).toBe('soon');
    expect(dueState(guideItem('v.us.hepb.1')!, ages)).toBe('past');
    expect(dueState(guideItem('v.us.hepb.2')!, ages)).toBe('now');
  });
});

describe('labels', () => {
  it('describes age windows', () => {
    expect(ageWindowLabel({from: 0, to: 0})).toBe('at birth');
    expect(ageWindowLabel({from: 2, to: 2})).toBe('2 months');
    expect(ageWindowLabel({from: 12, to: 15})).toBe('12–15 months');
    expect(ageWindowLabel({from: 48, to: 72})).toBe('4–6 years');
    setLang('zh');
    expect(ageWindowLabel({from: 1, to: 1})).toBe('1 个月');
  });
  it('gives the age on a date in days, weeks, then months', () => {
    expect(ageOn('2026-06-25', '2026-06-25')).toBe('birth day');
    expect(ageOn('2026-06-25', '2026-07-01')).toBe('6 days');
    expect(ageOn('2026-06-25', '2026-08-10')).toBe('6 weeks');
    expect(ageOn('2026-06-25', '2026-11-15')).toBe('4 months');
    expect(ageOn('2024-06-25', '2026-11-15')).toBe('2 yr 4 mo');
  });
});

describe('parseMomentForm', () => {
  const form = {
    kind: 'first' as const,
    guide_key: null,
    title: ' First bath ',
    occurred_on: '2026-07-01',
    note: '',
  };
  it('trims and accepts a valid form', () => {
    expect(parseMomentForm(form, '2026-06-25', '2026-11-15')).toEqual({
      kind: 'first',
      guide_key: null,
      title: 'First bath',
      occurred_on: '2026-07-01',
      note: null,
    });
  });
  it('takes the kind from the linked guide item', () => {
    const parsed = parseMomentForm({...form, guide_key: 'v.us.hepb.1'}, '2026-06-25', '2026-11-15');
    expect(parsed.kind).toBe('vaccine');
  });
  it('rejects empty titles and dates outside birth–today', () => {
    expect(() => parseMomentForm({...form, title: '  '}, '2026-06-25', '2026-11-15')).toThrow();
    expect(() => parseMomentForm({...form, occurred_on: '2026-06-01'}, '2026-06-25', '2026-11-15')).toThrow();
    expect(() => parseMomentForm({...form, occurred_on: '2026-11-16'}, '2026-06-25', '2026-11-15')).toThrow();
  });
});
