'use client';
import {useMemo, useState} from 'react';
import {ChevronDown, X} from 'lucide-react';
import {GuideRow} from './TimelineView';
import {Disclaimer, SourceLink} from './timeline-ui';
import {guideFor, MILESTONE_AGES, say, type GuideItem} from '@/lib/guide';
import {ageWindowLabel, buildTimeline, nearMilestoneAges} from '@/lib/timeline';
import {tr, useLang} from '@/lib/i18n';
import {regions, useRegion} from '@/lib/region';
import {babyName, type Baby, type Moment} from '@/lib/types';

type Tab = 'milestone' | 'vaccine' | 'checkup' | 'health';

/** The whole guide for one baby, with everything that can be ticked off. */
export default function GuideSheet({
  baby,
  initialTab = 'milestone',
  moments,
  today,
  onLog,
  onEdit,
  onClose,
}: {
  baby: Baby;
  initialTab?: Tab;
  moments: Moment[];
  today: string;
  onLog: (item: GuideItem) => void;
  onEdit: (moment: Moment) => void;
  onClose: () => void;
}) {
  useLang();
  const region = useRegion();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [open, setOpen] = useState<string | null>(null);
  const timeline = useMemo(() => buildTimeline(baby, moments, region, today), [baby, moments, region, today]);
  const [ageOpen, setAgeOpen] = useState<number | null>(
    () => nearMilestoneAges(timeline.ages.corrected)[0] ?? 24,
  );
  const guide = guideFor(region);
  const regionName = regions.find(r => r.value === region)!;
  const row = (item: GuideItem) => {
    const done = timeline.done.get(item.key);
    return (
      <GuideRow
        key={item.key}
        item={item}
        ages={timeline.ages}
        open={open === item.key}
        onToggle={() => setOpen(open === item.key ? null : item.key)}
        onLog={() => (done ? onEdit(done) : onLog(item))}
        doneOn={done?.occurred_on}
        inVisit={item.kind !== 'milestone'}
      />
    );
  };
  const byWindow = (items: GuideItem[]) => {
    const groups = new Map<string, GuideItem[]>();
    for (const item of items) {
      const label = ageWindowLabel(item);
      groups.set(label, [...(groups.get(label) ?? []), item]);
    }
    return [...groups.entries()];
  };
  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-[#10231b]/40"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={tr('成长指南', 'Growth guide')}
        className="ui-sheet safe-bottom flex max-h-[94dvh] w-full max-w-lg flex-col"
      >
        <div className="px-5 pt-3">
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-(--line)" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">{tr('成长指南', 'Growth guide')}</h2>
              <p className="mt-0.5 text-sm text-(--muted)">
                {babyName(baby)} · {tr(`${regionName.label()}程序`, `${regionName.label()} schedule`)}
              </p>
            </div>
            <button
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-(--chip)"
              aria-label={tr('关闭', 'Close')}
              onClick={onClose}
            >
              <X size={20} />
            </button>
          </div>
          <div
            className="mt-4 grid grid-cols-4 gap-1 rounded-[18px] border border-(--rim)/80 bg-(--chip)/80 p-1.5 shadow-inner"
            role="tablist"
          >
            {(
              [
                ['milestone', tr('里程碑', 'Milestones')],
                ['vaccine', tr('疫苗', 'Vaccines')],
                ['checkup', tr('体检', 'Checkups')],
                ['health', tr('健康', 'Health')],
              ] as [Tab, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                className={`min-h-10 min-w-0 truncate whitespace-nowrap rounded-[13px] px-1 text-[13px] font-semibold transition ${tab === key ? 'bg-(--paper) text-(--brand) shadow-[0_3px_12px_rgba(30,67,52,.09)]' : 'text-(--muted)'}`}
                onClick={() => {
                  setTab(key);
                  setOpen(null);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-8 pt-4">
          {tab === 'milestone' && (
            <>
              <p className="text-sm leading-relaxed text-(--muted)">
                {tr(
                  '每一条都是约 75% 的宝宝到这个月龄能做到的事。早产宝宝按矫正月龄看。点 ✓ 记下宝宝做到的那天。',
                  'Each item is something about 75% of babies do by that age (corrected age for preterm babies). Tap ✓ to log the day your baby did it.',
                )}
              </p>
              {MILESTONE_AGES.map(age => {
                const items = guide.filter(i => i.kind === 'milestone' && i.from === age);
                const done = items.filter(i => timeline.done.has(i.key)).length;
                const isOpen = ageOpen === age;
                return (
                  <section key={age} className="rounded-[22px] border border-(--line) bg-(--surface)/70">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      className="flex min-h-14 w-full items-center gap-3 px-4 text-left"
                      onClick={() => setAgeOpen(isOpen ? null : age)}
                    >
                      <span className="flex-1 font-semibold">{ageWindowLabel({from: age, to: age})}</span>
                      <span className="text-sm text-(--muted)">
                        {done}/{items.length}
                      </span>
                      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-(--chip)">
                        <span
                          className="block h-full rounded-full bg-(--brand-solid)"
                          style={{width: `${(done / items.length) * 100}%`}}
                        />
                      </span>
                      <ChevronDown
                        size={18}
                        className={`text-(--soft) transition ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {isOpen && (
                      <ul className="divide-y divide-(--line) border-t border-(--line) px-3">
                        {items.map(row)}
                      </ul>
                    )}
                  </section>
                );
              })}
            </>
          )}
          {(tab === 'vaccine' || tab === 'checkup') &&
            byWindow(guide.filter(i => i.kind === tab).sort((a, b) => a.from - b.from || a.to - b.to)).map(
              ([label, items]) => (
                <section key={label}>
                  <h3 className="px-1 text-sm font-semibold text-(--muted)">{label}</h3>
                  <ul className="mt-1 divide-y divide-(--line) rounded-[22px] border border-(--line) bg-(--surface)/70 px-3">
                    {items.map(row)}
                  </ul>
                </section>
              ),
            )}
          {tab === 'vaccine' && (
            <p className="text-xs leading-relaxed text-(--soft)">
              {region === 'us'
                ? tr(
                    '按美国儿科学会（AAP）2026 年 9 月更新的程序。美国 CDC 的儿童疫苗时间表今年有调整且仍有法律争议，具体请以儿科医生的建议为准。可在“家庭 → 设置”切换为中国程序。',
                    'Follows the AAP schedule updated September 2026. The CDC childhood schedule changed this year and is still being challenged in court, so follow your pediatrician’s advice. Switch to China’s schedule in Family → Settings.',
                  )
                : tr(
                    '按《国家免疫规划疫苗儿童免疫程序及说明（2026 年版）》，只包含免费的免疫规划疫苗。非免疫规划疫苗（如 Hib、肺炎球菌、轮状病毒、流感）可咨询接种门诊。可在“家庭 → 设置”切换为美国程序。',
                    'Follows China’s 2026 National Immunization Program, which lists free programme vaccines only. Ask your clinic about optional ones such as Hib, pneumococcal, rotavirus and flu. Switch to the US schedule in Family → Settings.',
                  )}
            </p>
          )}
          {tab === 'health' &&
            guide
              .filter(i => i.kind === 'phase' || i.kind === 'tip')
              .sort((a, b) => a.from - b.from)
              .map(item => (
                <section
                  key={item.key}
                  className={`rounded-[22px] p-4 ${item.important ? 'bg-(--alert-pale)' : item.kind === 'phase' ? 'bg-(--warm-pale)' : 'border border-(--line) bg-(--surface)/70'}`}
                >
                  <p className="text-xs font-semibold text-(--muted)">{ageWindowLabel(item)}</p>
                  <h3 className={`mt-0.5 font-semibold ${item.important ? 'text-(--alert)' : ''}`}>
                    {say(item.title)}
                  </h3>
                  {item.body && (
                    <p className="mt-1.5 text-sm leading-relaxed text-(--ink-2)">{say(item.body)}</p>
                  )}
                  <div className="mt-2">
                    <SourceLink source={item.source} />
                  </div>
                </section>
              ))}
          <Disclaimer />
        </div>
      </div>
    </div>
  );
}
