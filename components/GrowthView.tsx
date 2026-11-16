'use client';
import {useEffect, useMemo, useRef, useState} from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  XAxis,
  YAxis,
} from 'recharts';
import {ChevronDown, Plus, RotateCcw, Scale, TriangleAlert, Trash2, ZoomIn, ZoomOut} from 'lucide-react';
import type {Baby, BabySex, GrowthMeasurement} from '@/lib/types';
import {babyName} from '@/lib/types';
import {
  gestationLabel,
  growthAge,
  growthPercentile,
  medianAt,
  metricInfo,
  percentileDrift,
  percentileLabel,
  whoGrowthRows,
  zScore,
  type GrowthDrift,
  type GrowthMetric,
} from '@/lib/who-growth';
import {dayKey} from '@/lib/dates';
import {chartPalette, useDarkMode} from '@/lib/theme';
import {tr, useLang} from '@/lib/i18n';
import {BabyChips, EmptyState, Segmented, card, input, primary} from './ui';

const sexLabels: Record<BabySex, string> = {
  get female() {
    return tr('女孩', 'Girl');
  },
  get male() {
    return tr('男孩', 'Boy');
  },
};
const metrics: GrowthMetric[] = ['weight', 'length', 'head'];
const column: Record<GrowthMetric, 'weight_kg' | 'length_cm' | 'head_cm'> = {
  weight: 'weight_kg',
  length: 'length_cm',
  head: 'head_cm',
};
export type GrowthValues = {weight: string; length: string; head: string};
type Props = {
  babies: Baby[];
  measurements: GrowthMeasurement[];
  busy: boolean;
  onAdd: (baby: Baby, values: GrowthValues, date: string, note: string) => Promise<boolean>;
  onDelete: (item: GrowthMeasurement) => Promise<void>;
  onSetSex: (baby: Baby, sex: BabySex) => Promise<void>;
};
type GrowthPoint = {
  month: number;
  value: number;
  date: string;
  percentile: number | null;
  note: string | null;
};
type PointShapeProps = {cx?: number; cy?: number; payload?: GrowthPoint};

function formatGrowthValue(metric: GrowthMetric, value: number) {
  return metric === 'weight'
    ? value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
    : value.toFixed(1).replace(/\.0$/, '');
}
function formatAge(months: number) {
  const days = Math.max(1, Math.round(months * 30.4375));
  const mo = months.toFixed(1).replace(/\.0$/, '');
  return months < 1 ? tr(`${days} 天`, `${days} d`) : tr(`${mo} 个月`, `${mo} mo`);
}
const valueOf = (item: GrowthMeasurement, metric: GrowthMetric) => {
  const raw = item[column[metric]];
  return raw === null || raw === undefined ? null : Number(raw);
};
function summary(item: GrowthMeasurement) {
  return metrics
    .flatMap(metric => {
      const value = valueOf(item, metric);
      return value === null
        ? []
        : [`${metricInfo[metric].label} ${formatGrowthValue(metric, value)} ${metricInfo[metric].unit}`];
    })
    .join(' · ');
}
const shortDate = (date: string) => date.slice(5).replace('-', '/');
const signed = (metric: GrowthMetric, delta: number) =>
  `${delta > 0 ? '+' : delta < 0 ? '−' : '±'}${formatGrowthValue(metric, Math.abs(delta))}`;
const daysBetween = (a: string, b: string) =>
  Math.round((new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / 86400000);
function driftText(drift: GrowthDrift) {
  const label = metricInfo[drift.metric].label;
  return tr(
    `${label}：从 ${drift.from}（${shortDate(drift.fromDate)}）${drift.direction === 'down' ? '下降' : '上升'}到 ${drift.to}（${shortDate(drift.toDate)}），跨过了 2 条主要百分位线。`,
    `${label}: ${drift.direction === 'down' ? 'dropped' : 'rose'} from ${drift.from} (${shortDate(drift.fromDate)}) to ${drift.to} (${shortDate(drift.toDate)}), crossing 2 major percentile lines.`,
  );
}

export default function GrowthView({babies, measurements, busy, onAdd, onDelete, onSetSex}: Props) {
  const lang = useLang();
  const palette = chartPalette(useDarkMode());
  const [babyId, setBabyId] = useState(babies[0]?.id ?? '');
  const [metric, setMetric] = useState<GrowthMetric>('weight');
  const [values, setValues] = useState<GrowthValues>({weight: '', length: '', head: ''});
  const [date, setDate] = useState(dayKey(new Date()));
  const [note, setNote] = useState('');
  const [showAll, setShowAll] = useState(false);
  // Once the baby is past a year the full 0–60 month axis squeezes the points; default to the last six months.
  const [range, setRange] = useState<'recent' | 'all'>('recent');
  // A hand-zoomed window in months (pinch, drag or the +/− buttons); null follows the preset range.
  const [view, setView] = useState<{min: number; max: number} | null>(null);
  const gesture = useRef<{
    kind: 'pinch' | 'pan';
    startX: number;
    startDist: number;
    anchor: number;
    start: {min: number; max: number};
    moved: boolean;
  } | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<GrowthPoint | null>(null);
  useEffect(() => {
    if (!babies.some(b => b.id === babyId)) setBabyId(babies[0]?.id ?? '');
  }, [babies, babyId]);
  const baby = babies.find(b => b.id === babyId) || babies[0];
  const gestation = baby?.gestational_age_days ?? null;
  const info = metricInfo[metric];
  const items = useMemo(
    () =>
      measurements
        .filter(m => m.baby_id === baby?.id)
        .sort((a, b) => b.measured_at.localeCompare(a.measured_at)),
    [measurements, baby?.id],
  );
  const {points, beforeTerm} = useMemo(() => {
    const result: GrowthPoint[] = [];
    let skipped = 0;
    if (baby)
      for (const m of [...items].reverse()) {
        const value = valueOf(m, metric);
        if (value === null) continue;
        const month = Number(growthAge(baby.birthday, m.measured_at, gestation).months.toFixed(2));
        if (month < 0) {
          skipped++;
          continue;
        }
        if (month > 60) continue;
        result.push({
          month,
          value,
          date: m.measured_at,
          percentile: baby.sex ? growthPercentile(metric, baby.sex, month, value) : null,
          note: m.note,
        });
      }
    return {points: result, beforeTerm: skipped};
  }, [baby, items, metric, gestation]);
  const drifts = useMemo(() => {
    if (!baby?.sex) return [];
    const sex = baby.sex;
    return metrics.flatMap(k => {
      const series = items.flatMap(m => {
        const value = valueOf(m, k);
        if (value === null) return [];
        const age = growthAge(baby.birthday, m.measured_at, gestation);
        const z = zScore(k, sex, age.months, value);
        return z === null ? [] : [{months: age.months, z, date: m.measured_at}];
      });
      const drift = percentileDrift(k, series);
      return drift ? [drift] : [];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baby, items, gestation, lang]);
  const today = baby ? growthAge(baby.birthday, dayKey(new Date()), gestation) : null;
  const chartMax = useMemo(() => {
    if (!today) return 3;
    const observed = points.length ? Math.max(...points.map(point => point.month)) : 0;
    const needed = Math.max(today.months, observed) + 1;
    return Math.min(60, needed <= 12 ? Math.max(3, Math.ceil(needed)) : Math.ceil(needed / 6) * 6);
  }, [today, points]);
  const zoomable = chartMax > 12;
  const preset = {
    min: zoomable && range === 'recent' && today ? Math.max(0, Math.floor(today.months) - 6) : 0,
    max: chartMax,
  };
  const window_ = view ?? preset;
  const chartMin = window_.min;
  const chartEnd = window_.max;
  const span = chartEnd - chartMin;
  const MIN_SPAN = 1;
  /** Keeps a window inside 0–chartMax and at least a month wide. */
  const clampView = (min: number, max: number) => {
    const width = Math.max(MIN_SPAN, Math.min(chartMax, max - min));
    const start = Math.max(0, Math.min(min, chartMax - width));
    return {min: start, max: start + width};
  };
  const zoomBy = (factor: number) => {
    const centre = chartMin + span / 2;
    const width = span * factor;
    setView(clampView(centre - width / 2, centre + width / 2));
  };
  const monthAt = (clientX: number, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    return chartMin + ((clientX - rect.left) / rect.width) * span;
  };
  const touchDist = (t: React.TouchList) =>
    Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  function onTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    const start = {min: chartMin, max: chartEnd};
    if (e.touches.length >= 2) {
      const mid = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      gesture.current = {
        kind: 'pinch',
        startX: mid,
        startDist: touchDist(e.touches),
        anchor: monthAt(mid, e.currentTarget),
        start,
        moved: false,
      };
    } else if (e.touches.length === 1) {
      gesture.current = {
        kind: 'pan',
        startX: e.touches[0].clientX,
        startDist: 0,
        anchor: 0,
        start,
        moved: false,
      };
    }
  }
  function onTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const startSpan = g.start.max - g.start.min;
    if (g.kind === 'pinch' && e.touches.length >= 2) {
      const scale = g.startDist / Math.max(1, touchDist(e.touches));
      const width = startSpan * scale;
      const ratio = (g.anchor - g.start.min) / startSpan;
      g.moved = true;
      setView(clampView(g.anchor - ratio * width, g.anchor - ratio * width + width));
    } else if (g.kind === 'pan' && e.touches.length === 1) {
      const dx = e.touches[0].clientX - g.startX;
      if (!g.moved && Math.abs(dx) < 10) return;
      g.moved = true;
      const shift = (dx / rect.width) * startSpan;
      setView(clampView(g.start.min - shift, g.start.max - shift));
    }
  }
  function onTouchEnd(e: React.TouchEvent<HTMLDivElement>) {
    if (e.touches.length === 1 && gesture.current?.kind === 'pinch')
      gesture.current = {
        kind: 'pan',
        startX: e.touches[0].clientX,
        startDist: 0,
        anchor: 0,
        start: {min: chartMin, max: chartEnd},
        moved: false,
      };
    else if (!e.touches.length) gesture.current = null;
  }
  // Each row carries the two shaded bands as [low, high] ranges, plus the P50 line.
  const rows = useMemo(
    () =>
      baby?.sex
        ? whoGrowthRows(metric, baby.sex, chartMax)
            .filter(row => row.month >= Math.floor(chartMin) && row.month <= Math.ceil(chartEnd))
            .map(row => ({
              ...row,
              outer: [row.p3, row.p97] as [number, number],
              inner: [row.p15, row.p85] as [number, number],
            }))
        : [],
    [baby, metric, chartMax, chartMin, chartEnd],
  );
  const visiblePoints = useMemo(
    () => points.filter(point => point.month >= chartMin && point.month <= chartEnd),
    [points, chartMin, chartEnd],
  );
  // The axis starts just below the lowest visible value instead of at zero, so the curves use the whole height.
  const yAxis = useMemo(() => {
    const all = [...rows.flatMap(row => [row.p3, row.p97]), ...visiblePoints.map(point => point.value)];
    if (!all.length) return {domain: [0, 20], ticks: [0, 5, 10, 15, 20]};
    const low = Math.min(...all),
      high = Math.max(...all);
    const step = [0.5, 1, 2, 5, 10, 20].find(n => (high - low) / n <= 5) ?? 20;
    let start = Math.floor(low / step) * step;
    if (low - start < step * 0.15) start -= step;
    start = Math.max(0, start);
    const end = Math.ceil(high / step) * step;
    const ticks: number[] = [];
    for (let t = start; t <= end + 1e-9; t += step) ticks.push(Number(t.toFixed(1)));
    return {domain: [start, end], ticks};
  }, [rows, visiblePoints]);
  const pointRadius = points.length <= 12 ? 7 : points.length <= 30 ? 6 : 5;
  const latest: GrowthPoint | undefined = points[points.length - 1];
  // The header describes the tapped point, or the latest one until something is tapped.
  const shown = selectedPoint && points.some(p => p.date === selectedPoint.date) ? selectedPoint : latest;
  const shownIndex = shown ? points.findIndex(p => p.date === shown.date) : -1;
  const previous: GrowthPoint | undefined = shownIndex > 0 ? points[shownIndex - 1] : undefined;
  const median = shown && baby?.sex ? medianAt(metric, baby.sex, shown.month) : null;
  const hasValue = !!(values.weight || values.length || values.head);
  if (!babies.length)
    return (
      <EmptyState
        kind="growth"
        title={tr('还没有宝宝', 'No baby yet')}
        text={tr(
          '在“家庭”页添加宝宝后即可记录体重、身长和头围。',
          'Add a baby on the Family page to record weight, length and head size.',
        )}
      />
    );
  return (
    <>
      <BabyChips
        babies={babies}
        value={baby?.id ?? ''}
        onChange={id => {
          setBabyId(id);
          setSelectedPoint(null);
          setView(null);
        }}
        label={tr('选择宝宝', 'Choose baby')}
      />
      {!baby?.sex ? (
        <section className={card}>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-(--brand-pale)">
            <Scale className="text-(--brand)" />
          </div>
          <h2 className="mt-4 text-xl font-semibold">
            {tr(`先选择 ${babyName(baby)} 的性别`, `First, choose ${babyName(baby)}’s sex`)}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-(--muted)">
            {tr(
              'WHO 生长标准按男孩和女孩分别计算。选择后会保存到宝宝资料中。',
              'WHO growth standards differ for boys and girls. This is saved to the baby’s profile.',
            )}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {(['female', 'male'] as BabySex[]).map(sex => (
              <button
                key={sex}
                className="min-h-14 rounded-2xl border border-(--brand) bg-(--brand-pale) font-semibold text-(--brand)"
                disabled={busy}
                onClick={() => onSetSex(baby, sex)}
              >
                {sexLabels[sex]}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <>
          {drifts.length > 0 && (
            <section
              role="status"
              className="rounded-[22px] border border-(--alert)/35 bg-(--alert-pale) p-4"
            >
              <p className="flex items-center gap-2 font-semibold text-(--alert)">
                <TriangleAlert size={18} />
                {tr('值得留意的生长趋势', 'Growth trend worth noting')}
              </p>
              <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-(--ink-2)">
                {drifts.map(d => (
                  <li key={d.metric}>{driftText(d)}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs leading-relaxed text-(--muted)">
                {tr(
                  '仅供参考，不是诊断。单次测量可能有误差，建议复测确认；如果趋势持续，请咨询儿科医生。',
                  'For reference only, not a diagnosis. A single measurement can be off, so measure again to confirm; if the trend continues, talk to your pediatrician.',
                )}
              </p>
            </section>
          )}
          <Segmented
            label={tr('生长指标', 'Growth measure')}
            value={metric}
            onChange={k => {
              setMetric(k);
              setSelectedPoint(null);
              setView(null);
            }}
            options={metrics.map(k => ({value: k, label: metricInfo[k].label}))}
          />
          <section className={card}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-(--muted)">
                  {babyName(baby)} · {sexLabels[baby.sex]}
                  {today?.corrected ? tr(' · 矫正月龄', ' · corrected age') : ''}
                </p>
                <h2 className="mt-1 text-xl font-semibold">{info.title}</h2>
              </div>
              {shown && shown.percentile !== null ? (
                <span className="shrink-0 rounded-full bg-(--brand-pale) px-3 py-2 text-sm font-semibold text-(--brand)">
                  {percentileLabel(shown.percentile)}
                </span>
              ) : null}
            </div>
            {shown ? (
              <>
                <div className="mt-4 flex items-end gap-2">
                  <strong className="text-4xl tracking-tight">
                    {formatGrowthValue(metric, shown.value)}
                  </strong>
                  <span className="pb-1 text-(--muted)">{info.unit}</span>
                  {shown === latest ? (
                    <span className="mb-1.5 ml-1 rounded-full bg-(--chip) px-2 py-0.5 text-xs font-semibold text-(--muted)">
                      {tr('最新', 'Latest')}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-(--muted)">
                  {shown.date.replaceAll('-', '/')} ·{' '}
                  {today?.corrected ? tr('矫正月龄', 'corrected age') : tr('月龄', 'age')}{' '}
                  {formatAge(shown.month)}
                  {shown.note ? ` · ${shown.note}` : ''}
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-2xl bg-(--surface-2) px-3 py-2.5">
                    <dt className="text-xs text-(--soft)">{tr('较上次', 'Since last time')}</dt>
                    <dd className="mt-0.5 font-semibold text-(--ink)">
                      {previous
                        ? tr(
                            `${signed(metric, shown.value - previous.value)} ${info.unit} · ${daysBetween(previous.date, shown.date)} 天`,
                            `${signed(metric, shown.value - previous.value)} ${info.unit} in ${daysBetween(previous.date, shown.date)} d`,
                          )
                        : tr('第一条记录', 'First record')}
                    </dd>
                  </div>
                  <div className="rounded-2xl bg-(--surface-2) px-3 py-2.5">
                    <dt className="text-xs text-(--soft)">{tr('与同龄中位数 P50', 'vs. median P50')}</dt>
                    <dd className="mt-0.5 font-semibold text-(--ink)">
                      {median === null
                        ? tr('暂无', 'n/a')
                        : `${signed(metric, shown.value - median)} ${info.unit}`}
                    </dd>
                  </div>
                </dl>
              </>
            ) : (
              <p className="mt-4 text-sm text-(--muted)">
                {tr(
                  `添加第一条${info.label}记录后，记录点会显示在曲线上。`,
                  `Add the first ${info.label.toLowerCase()} record to see it on the chart.`,
                )}
              </p>
            )}
            <div className="mt-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1" role="group" aria-label={tr('缩放', 'Zoom')}>
                {(
                  [
                    [ZoomOut, tr('缩小', 'Zoom out'), () => zoomBy(1.5), span >= chartMax],
                    [ZoomIn, tr('放大', 'Zoom in'), () => zoomBy(1 / 1.5), span <= MIN_SPAN],
                  ] as const
                ).map(([Icon, label, run, disabled]) => (
                  <button
                    key={label}
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-(--chip) text-(--muted) disabled:opacity-40"
                    aria-label={label}
                    title={label}
                    disabled={disabled}
                    onClick={run}
                  >
                    <Icon size={16} />
                  </button>
                ))}
                {view && (
                  <button
                    type="button"
                    className="flex h-9 items-center gap-1 rounded-full bg-(--chip) px-3 text-xs font-semibold text-(--muted)"
                    onClick={() => setView(null)}
                  >
                    <RotateCcw size={14} />
                    {tr('复位', 'Reset')}
                  </button>
                )}
              </div>
              {zoomable && (
                <div
                  className="flex rounded-full bg-(--chip) p-1"
                  role="group"
                  aria-label={tr('时间范围', 'Time range')}
                >
                  {(
                    [
                      ['recent', tr('近 6 个月', '6 months')],
                      ['all', tr('出生至今', 'All')],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={!view && range === key}
                      className={`min-h-9 rounded-full px-3 text-xs font-semibold whitespace-nowrap transition ${!view && range === key ? 'bg-(--paper) text-(--brand) shadow-sm' : 'text-(--muted)'}`}
                      onClick={() => {
                        setRange(key);
                        setView(null);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="mt-1 text-right text-[11px] text-(--soft)">
              {tr('双指捏合缩放，左右拖动平移', 'Pinch to zoom, drag sideways to pan')}
            </p>
            <div
              className="mt-2 h-72 w-full touch-pan-y select-none"
              role="img"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              onTouchCancel={() => (gesture.current = null)}
              aria-label={tr(
                `${babyName(baby)}的${info.title}曲线`,
                `${info.title} chart for ${babyName(baby)}`,
              )}
            >
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={rows} margin={{top: 16, right: 12, left: -14, bottom: 0}}>
                  <CartesianGrid vertical={false} stroke={palette.grid} />
                  <XAxis
                    dataKey="month"
                    type="number"
                    domain={[chartMin, chartEnd]}
                    allowDataOverflow
                    tickCount={Math.min(Math.ceil(span) + 1, 7)}
                    allowDecimals={span < 6}
                    tickFormatter={v =>
                      span < 6 ? Number(v).toFixed(1).replace(/\.0$/, '') : String(Math.round(Number(v)))
                    }
                    tick={{fontSize: 11, fill: palette.tick}}
                    tickLine={false}
                    axisLine={false}
                    unit={tr('月', 'mo')}
                  />
                  <YAxis
                    type="number"
                    dataKey="value"
                    domain={yAxis.domain}
                    allowDataOverflow
                    ticks={yAxis.ticks}
                    interval={0}
                    tick={{fontSize: 11, fill: palette.tick}}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Area
                    dataKey="outer"
                    type="monotone"
                    fill={palette.bandOuter}
                    stroke="none"
                    activeDot={false}
                    isAnimationActive={false}
                  />
                  <Area
                    dataKey="inner"
                    type="monotone"
                    fill={palette.bandInner}
                    stroke="none"
                    activeDot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    dataKey="p50"
                    type="monotone"
                    stroke={palette.brand}
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={false}
                    activeDot={false}
                    isAnimationActive={false}
                  />
                  {today && today.months >= chartMin && today.months <= chartEnd && (
                    <ReferenceLine
                      x={today.months}
                      stroke={palette.tick}
                      strokeDasharray="2 4"
                      label={{
                        value: tr('今天', 'Today'),
                        position: 'insideTopRight',
                        fontSize: 11,
                        fill: palette.tick,
                      }}
                    />
                  )}
                  <Scatter
                    data={visiblePoints}
                    dataKey="value"
                    name={tr(`${info.label}记录`, `${info.label} records`)}
                    fill={palette.point}
                    line={{stroke: palette.point, strokeWidth: 2}}
                    isAnimationActive={false}
                    shape={(shapeProps: unknown) => {
                      const {cx = 0, cy = 0, payload} = shapeProps as PointShapeProps;
                      if (!payload) return <g />;
                      const select = () => setSelectedPoint(payload);
                      const on = shown?.date === payload.date;
                      return (
                        <g
                          role="button"
                          tabIndex={0}
                          aria-label={tr(
                            `${payload.date}，${formatGrowthValue(metric, payload.value)}${info.unit}`,
                            `${payload.date}, ${formatGrowthValue(metric, payload.value)} ${info.unit}`,
                          )}
                          className="cursor-pointer outline-none"
                          onClick={select}
                          onKeyDown={event => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              select();
                            }
                          }}
                        >
                          <circle cx={cx} cy={cy} r={16} fill="transparent" />
                          {on && (
                            <circle cx={cx} cy={cy} r={pointRadius + 6} fill={palette.point} opacity={0.22} />
                          )}
                          <circle
                            cx={cx}
                            cy={cy}
                            r={on ? pointRadius + 1 : pointRadius}
                            fill={palette.point}
                            stroke={palette.surface}
                            strokeWidth={3}
                          />
                        </g>
                      );
                    }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-(--soft)">
              <li className="flex items-center gap-1.5">
                <span className="h-3 w-5 rounded-sm" style={{background: palette.bandInner}} />
                P15–P85
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-3 w-5 rounded-sm" style={{background: palette.bandOuter}} />
                P3–P97
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-5 border-t-2 border-dashed" style={{borderColor: palette.brand}} />
                P50
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{background: palette.point}} />
                {tr('记录（点一下查看）', 'Records (tap one)')}
              </li>
            </ul>
            <details className="group mt-3 border-t border-(--line) pt-1">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden text-sm font-medium text-(--muted)">
                <span>
                  {today?.corrected
                    ? tr('曲线说明 · 已按矫正月龄', 'About this chart · corrected age')
                    : tr('曲线说明', 'About this chart')}
                </span>
                <ChevronDown
                  size={18}
                  className="shrink-0 text-(--soft) transition-transform group-open:rotate-180"
                />
              </summary>
              {today?.corrected && gestation && (
                <p className="mt-1 rounded-2xl bg-(--surface-2) px-4 py-3 text-xs leading-relaxed text-(--ink-2)">
                  {tr(
                    `出生孕周 ${gestationLabel(gestation)}，曲线和百分位按矫正月龄计算（实际月龄减去提前出生的 ${Math.floor((280 - gestation) / 7)} 周 ${(280 - gestation) % 7} 天），满 24 个月后自动停止矫正。`,
                    `Born at ${gestationLabel(gestation)}. The chart and percentiles use corrected age (actual age minus the ${Math.floor((280 - gestation) / 7)} weeks ${(280 - gestation) % 7} days born early); correction stops automatically at 24 months.`,
                  )}
                  {beforeTerm > 0
                    ? tr(
                        `有 ${beforeTerm} 条记录早于预产期，不在曲线上显示。`,
                        ` ${beforeTerm} record(s) from before the due date are not shown on the chart.`,
                      )
                    : ''}
                </p>
              )}
              <p className="mt-2 pb-2 text-xs leading-relaxed text-(--soft)">
                {tr(
                  `横轴为${today?.corrected ? '矫正' : ''}月龄，P50 是同龄宝宝的中位数。曲线采用 WHO 0–5 岁${info.label}年龄标准${metric === 'length' ? '（24 个月前为躺着量的身长，之后为站立身高）' : ''}；P3–P97 为常用参考区间，单次百分位不能代替医生对连续生长趋势的判断。${!gestation ? '早产宝宝可在“家庭”页填写出生孕周，按矫正月龄计算。' : ''}`,
                  `The horizontal axis is ${today?.corrected ? 'corrected ' : ''}age in months; P50 is the median for babies of the same age. Curves use the WHO 0–5 year ${info.label.toLowerCase()}-for-age standard${metric === 'length' ? ' (lying length before 24 months, standing height after)' : ''}. P3–P97 is the usual reference range; a single percentile can’t replace a doctor’s view of the growth trend.${!gestation ? ' For a premature baby, add the gestational age at birth on the Family page to use corrected age.' : ''}`,
                )}
              </p>
            </details>
          </section>
          <details className={`${card} group`} open={!items.length || undefined}>
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2 text-lg font-semibold text-(--brand)">
                <Plus size={20} />
                {tr('记录生长数据', 'Record growth')}
              </span>
              <ChevronDown
                size={18}
                className="shrink-0 text-(--soft) transition-transform group-open:rotate-180"
              />
            </summary>
            <p className="mt-1 text-sm text-(--muted)">
              {tr('三项不必同时填写，至少填一项。', 'Fill in at least one of the three.')}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {metrics.map(k => (
                <label key={k} className="text-sm font-medium">
                  {metricInfo[k].label} · {metricInfo[k].unit}
                  <input
                    className={`${input} mt-2 px-3`}
                    type="number"
                    inputMode="decimal"
                    enterKeyHint="done"
                    min={k === 'weight' ? 0.5 : k === 'length' ? 20 : 18}
                    max={k === 'weight' ? 80 : k === 'length' ? 130 : 60}
                    step={k === 'weight' ? 0.01 : 0.1}
                    placeholder={k === 'weight' ? '6.25' : k === 'length' ? '62.5' : '40.5'}
                    value={values[k]}
                    onChange={e => setValues(current => ({...current, [k]: e.target.value}))}
                  />
                </label>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-sm font-medium">
                {tr('测量日期', 'Date measured')}
                <input
                  className={`${input} mt-2`}
                  type="date"
                  min={baby.birthday}
                  max={dayKey(new Date())}
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </label>
              <label className="text-sm font-medium">
                {tr('备注（可选）', 'Note (optional)')}
                <input
                  className={`${input} mt-2`}
                  maxLength={500}
                  placeholder={tr('例如：体检', 'e.g. checkup')}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
              </label>
            </div>
            <button
              className={`${primary} mt-5`}
              disabled={busy || !hasValue || !date}
              onClick={async () => {
                if (await onAdd(baby, values, date, note)) {
                  setValues({weight: '', length: '', head: ''});
                  setNote('');
                }
              }}
            >
              {busy ? tr('保存中…', 'Saving…') : tr('保存记录', 'Save')}
            </button>
          </details>
          <section className={card}>
            <h2 className="text-lg font-semibold">{tr('生长记录', 'Growth records')}</h2>
            {items.length ? (
              <>
                <div className="mt-3 divide-y divide-(--chip)">
                  {(showAll ? items : items.slice(0, 5)).map(item => (
                    <div key={item.id} className="flex min-h-16 items-center gap-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{item.measured_at.replaceAll('-', '/')}</p>
                        <p className="text-sm text-(--ink-2)">{summary(item)}</p>
                        {item.note && <p className="truncate text-sm text-(--soft)">{item.note}</p>}
                      </div>
                      <button
                        className="flex h-11 w-11 items-center justify-center rounded-full text-(--danger)"
                        aria-label={tr(
                          `删除 ${item.measured_at} 的生长记录`,
                          `Delete growth record from ${item.measured_at}`,
                        )}
                        disabled={busy}
                        onClick={() => onDelete(item)}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
                {items.length > 5 && (
                  <button
                    type="button"
                    className="mt-1 min-h-11 w-full text-sm font-semibold text-(--brand)"
                    onClick={() => setShowAll(v => !v)}
                  >
                    {showAll
                      ? tr('收起', 'Show less')
                      : tr(`查看全部 ${items.length} 条`, `Show all ${items.length}`)}
                  </button>
                )}
              </>
            ) : (
              <p className="mt-3 text-sm text-(--muted)">
                {tr('还没有生长记录。', 'No growth records yet.')}
              </p>
            )}
          </section>
        </>
      )}
    </>
  );
}
