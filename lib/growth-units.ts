'use client';
import {tr} from './i18n';
import {createPreference} from './preference';
import type {GrowthMetric} from './who-growth';

/**
 * Units for growth measurements. Records are always stored as kg and cm; this per-device setting only
 * changes what is shown and typed. US units show weight as pounds and ounces and lengths in inches.
 */
export type GrowthUnit = 'metric' | 'us';
export const growthUnits: {value: GrowthUnit; label: () => string}[] = [
  {value: 'metric', label: () => tr('公制 (kg, cm, °C)', 'Metric (kg, cm, °C)')},
  {value: 'us', label: () => tr('美制 (lb, oz, in, °F)', 'US (lb, oz, in, °F)')},
];
const pref = createPreference<GrowthUnit>('growth-unit', 'metric', ['metric', 'us']);
export const setGrowthUnit = pref.set;
/** Re-renders the calling component when the growth unit changes. */
export const useGrowthUnit = pref.use;
export const getGrowthUnit = pref.get;

const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;
const us = () => getGrowthUnit() === 'us';

/** Unit of a measure in the current setting: kg / cm, or lb / in (pounds shown with ounces in text). */
export const growthUnitLabel = (metric: GrowthMetric) =>
  us() ? (metric === 'weight' ? 'lb' : 'in') : metric === 'weight' ? 'kg' : 'cm';

/** Stored kg or cm → number in the current unit (pounds as a decimal). */
export function growthToDisplay(metric: GrowthMetric, stored: number) {
  if (!us()) return stored;
  return metric === 'weight' ? stored / KG_PER_LB : stored / CM_PER_IN;
}
/** Number in the current unit → kg (2 decimals) or cm (1 decimal), the precision the database keeps. */
export function growthFromDisplay(metric: GrowthMetric, value: number) {
  const stored = us() ? value * (metric === 'weight' ? KG_PER_LB : CM_PER_IN) : value;
  return metric === 'weight' ? Math.round(stored * 100) / 100 : Math.round(stored * 10) / 10;
}

/** The range the database accepts (0.5–80 kg, 20–130 cm, 18–60 cm), in the current unit. */
export function growthLimits(metric: GrowthMetric) {
  const [min, max] = metric === 'weight' ? [0.5, 80] : metric === 'length' ? [20, 130] : [18, 60];
  if (!us()) return {min, max};
  return {
    min: Math.ceil(growthToDisplay(metric, min) * 10) / 10,
    max: Math.floor(growthToDisplay(metric, max) * 10) / 10,
  };
}

const trim = (value: number, digits: number) => value.toFixed(digits).replace(/\.?0+$/, '');

/**
 * A value already in the current unit, split into number/unit pairs for display:
 * [["6.25", "kg"]], [["13", "lb"], ["6", "oz"]] or [["24.5", "in"]]. Ounces are rounded to whole ounces;
 * a zero part is left out ("12 oz", "14 lb").
 */
export function growthParts(metric: GrowthMetric, display: number): [string, string][] {
  if (!us()) return [[metric === 'weight' ? trim(display, 2) : trim(display, 1), growthUnitLabel(metric)]];
  if (metric !== 'weight') return [[trim(display, 1), 'in']];
  const ounces = Math.round(Math.abs(display) * 16);
  const lb = Math.floor(ounces / 16);
  const oz = ounces % 16;
  const parts: [string, string][] = [];
  if (lb) parts.push([String(lb), 'lb']);
  if (oz || !lb) parts.push([String(oz), 'oz']);
  return parts;
}
/** "6.25 kg", "13 lb 6 oz" or "24.5 in" for a value already in the current unit. */
export const growthText = (metric: GrowthMetric, display: number) =>
  growthParts(metric, display)
    .map(([n, unit]) => `${n} ${unit}`)
    .join(' ');
/** The same as growthText, from a stored kg or cm value. */
export const storedGrowthText = (metric: GrowthMetric, stored: number) =>
  growthText(metric, growthToDisplay(metric, stored));

/** Body temperature follows the same setting: °C with metric, °F with US units. */
export const temperatureUnit = () => (us() ? '°F' : '°C');
/** Stored °C → the current unit, one decimal. */
export const temperatureToDisplay = (c: number) => Math.round((us() ? (c * 9) / 5 + 32 : c) * 10) / 10;
/** Typed value in the current unit → °C with one decimal, as stored. */
export const temperatureFromDisplay = (value: number) =>
  Math.round((us() ? ((value - 32) * 5) / 9 : value) * 10) / 10;
export const temperatureText = (c: number) => `${temperatureToDisplay(c)} ${temperatureUnit()}`;
