import {datetimeLocal} from './dates';
import {tr} from './i18n';
import {guideItem, say} from './guide';
import {
  babyName,
  momentKindLabel,
  typeLabels,
  type Baby,
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
  const num = (v: number | null | undefined) => (v === null || v === undefined ? null : Number(v));
  return toCsv([
    [
      tr('测量日期', 'Date measured'),
      tr('宝宝', 'Baby'),
      tr('体重(kg)', 'Weight (kg)'),
      tr('身长(cm)', 'Length (cm)'),
      tr('头围(cm)', 'Head (cm)'),
      tr('备注', 'Note'),
      tr('记录人', 'Logged by'),
    ],
    ...[...rows]
      .sort((a, b) => a.measured_at.localeCompare(b.measured_at))
      .map(m => [
        m.measured_at,
        names.get(m.baby_id) ?? '',
        num(m.weight_kg),
        num(m.length_cm),
        num(m.head_cm),
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
