'use client';
import {tr} from './i18n';
import {createPreference} from './preference';
import type {Feeding} from './types';

export type VolumeUnit = 'ml' | 'oz';
export const volumeUnits: {value: VolumeUnit; label: string}[] = [
  {value: 'ml', label: 'ml'},
  {value: 'oz', label: 'oz'},
];
const ML_PER_OZ = 29.5735;
const pref = createPreference<VolumeUnit>('volume-unit', 'ml', ['ml', 'oz']);
export const setUnit = pref.set;
/** Re-renders the calling component when the volume unit changes. */
export const useUnit = pref.use;
export const getUnit = pref.get;

/** Stored millilitres → number in the display unit (oz to one decimal). */
export function toDisplay(ml: number) {
  return getUnit() === 'oz' ? Math.round((ml / ML_PER_OZ) * 10) / 10 : Math.round(ml);
}
/** Number typed in the display unit → whole millilitres for storage. */
export function fromDisplay(value: number) {
  return getUnit() === 'oz' ? Math.round(value * ML_PER_OZ) : Math.round(value);
}
export const volumeNumber = (ml: number) =>
  new Intl.NumberFormat('en-US', {maximumFractionDigits: 1}).format(toDisplay(ml));
export const volumeLabel = (ml: number) => `${volumeNumber(ml)} ${getUnit()}`;
/** Short form for tight spaces such as a calendar cell: 1,080 ml becomes 1.08 L. */
export const compactVolume = (ml: number) =>
  getUnit() === 'ml' && ml >= 1000
    ? `${new Intl.NumberFormat('en-US', {maximumFractionDigits: 2}).format(ml / 1000)} L`
    : volumeLabel(ml);
export const minutesLabel = (min: number) => tr(`${min} 分钟`, `${min} min`);
/** What a single feeding amounted to: volume if known, else breastfeeding duration, else pending. */
export function feedingAmount(item: Pick<Feeding, 'amount_ml' | 'duration_min'>) {
  if (item.amount_ml !== null) return volumeLabel(item.amount_ml);
  if (item.duration_min) return minutesLabel(item.duration_min);
  return tr('待补充', 'pending');
}
