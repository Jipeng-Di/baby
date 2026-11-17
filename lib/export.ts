import {datetimeLocal} from './dates';
import {tr} from './i18n';
import {guideItem, say} from './guide';
import {getGrowthUnit, growthToDisplay, growthUnitLabel} from './growth-units';
import type {GrowthMetric} from './who-growth';
import {diaperLabel, eventLabel} from './events';
import {temperatureToDisplay, temperatureUnit} from './growth-units';
import {
  babyName,
  momentKindLabel,
  typeLabels,
  type Baby,
  type BabyEvent,
  type Feeding,
  type GrowthMeasurement,
  type Moment,
} from './types';
type Cell = string | number | null | undefined;

function cell(value: Cell) {
  if (value === null || value === undefined) return '';
  let text = String(value);
  // Free-text fields could start with a formula character; neutralise them for spreadsheet apps.
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// BOM keeps Chinese text readable when the file is opened in Excel.
export function toCsv(rows: Cell[][]) {
  return '﻿' + rows.map(row => row.map(cell).join(',')).join('\r\n');
}

export const localDateTime = (iso: string) => datetimeLocal(iso).replace('T', ' ');

export async function saveTextFile(name: string, text: string) {
  const file = new File([text], name, {type: 'text/csv;charset=utf-8'});
  const touch = window.matchMedia('(pointer: coarse)').matches;
  // On phones (especially an installed iOS PWA) the share sheet is the reliable way to save a file.
  if (touch && navigator.canShare?.({files: [file]})) {
    try {
      await navigator.share({files: [file], title: name});
      return;
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type Names = Map<string, string>;
type Recorder = (userId: string) => string;
const babyNames = (babies: Baby[]): Names => new Map(babies.map(b => [b.id, babyName(b)]));

/** All feedings, oldest first, as a spreadsheet. */
export function feedingsCsv(rows: Feeding[], babies: Baby[], recorder: Recorder) {
  const names = babyNames(babies);
  return toCsv([
    [
      tr('时间', 'Time'),
      tr('宝宝', 'Baby'),
      tr('奶量(ml)', 'Amount (ml)'),
      tr('亲喂(分钟)', 'Nursing (min)'),
      tr('类型', 'Type'),
      tr('备注', 'Note'),
      tr('记录人', 'Logged by'),
    ],
    ...[...rows]
      .sort((a, b) => a.fed_at.localeCompare(b.fed_at))
      .map(f => [
        localDateTime(f.fed_at),
        names.get(f.baby_id) ?? '',
        f.amount_ml,
        f.duration_min ?? null,
        typeLabels[f.feeding_type],
        f.note,
        recorder(f.created_by),
      ]),
  ]);
}
export function growthCsv(rows: GrowthMeasurement[], babies: Baby[], recorder: Recorder) {
  const names = babyNames(babies);
  // Exported in the device's growth unit; pounds as a decimal (e.g. 13.38) so spreadsheets can chart them.
  const num = (metric: GrowthMetric, v: number | null | undefined) => {
    if (v === null || v === undefined) return null;
    const value = growthToDisplay(metric, Number(v));
    return getGrowthUnit() === 'metric' ? value : Math.round(value * 100) / 100;
  };
  const u = (metric: GrowthMetric) => growthUnitLabel(metric);
  return toCsv([
    [
      tr('测量日期', 'Date measured'),
      tr('宝宝', 'Baby'),
      tr(`体重(${u('weight')})`, `Weight (${u('weight')})`),
      tr(`身长(${u('length')})`, `Length (${u('length')})`),
      tr(`头围(${u('head')})`, `Head (${u('head')})`),
      tr('备注', 'Note'),
      tr('记录人', 'Logged by'),
    ],
    ...[...rows]
      .sort((a, b) => a.measured_at.localeCompare(b.measured_at))
      .map(m => [
        m.measured_at,
        names.get(m.baby_id) ?? '',
        num('weight', m.weight_kg),
        num('length', m.length_cm),
        num('head', m.head_cm),
        m.note,
        recorder(m.recorded_by),
      ]),
  ]);
}
export function momentsCsv(rows: Moment[], babies: Baby[], recorder: Recorder) {
  const names = babyNames(babies);
  return toCsv([
    [
      tr('日期', 'Date'),
      tr('宝宝', 'Baby'),
      tr('类型', 'Type'),
      tr('标题', 'Title'),
      tr('备注', 'Note'),
      tr('记录人', 'Logged by'),
    ],
    ...[...rows]
      .sort((a, b) => a.occurred_on.localeCompare(b.occurred_on))
      .map(m => {
        const item = guideItem(m.guide_key);
        return [
          m.occurred_on,
          names.get(m.baby_id) ?? '',
          momentKindLabel[m.kind](),
          item ? say(item.title) : m.title,
          m.note,
          recorder(m.recorded_by),
        ];
      }),
  ]);
}

export function eventsCsv(rows: BabyEvent[], babies: Baby[], recorder: Recorder) {
  const names = babyNames(babies);
  return toCsv([
    [
      tr('开始时间', 'Start'),
      tr('结束时间', 'End'),
      tr('宝宝', 'Baby'),
      tr('类型', 'Type'),
      tr('时长(分钟)', 'Duration (min)'),
      tr('尿布', 'Diaper'),
      tr(`体温(${temperatureUnit()})`, `Temperature (${temperatureUnit()})`),
      tr('备注', 'Note'),
      tr('记录人', 'Logged by'),
    ],
    ...[...rows]
      .sort((a, b) => a.started_at.localeCompare(b.started_at))
      .map(e => [
        datetimeLocal(e.started_at).replace('T', ' '),
        e.ended_at ? datetimeLocal(e.ended_at).replace('T', ' ') : null,
        names.get(e.baby_id) ?? '',
        eventLabel[e.kind](),
        e.ended_at ? Math.round((Date.parse(e.ended_at) - Date.parse(e.started_at)) / 60000) : null,
        e.diaper ? diaperLabel[e.diaper]() : null,
        e.temperature_c === null ? null : temperatureToDisplay(Number(e.temperature_c)),
        e.note,
        recorder(e.created_by),
      ]),
  ]);
}
