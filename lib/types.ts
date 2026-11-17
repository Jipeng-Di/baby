export type FeedingType = 'formula' | 'breast_milk' | 'mixed';
export type BabySex = 'female' | 'male';
export type Family = {id: string; name: string; family_code: string; created_by: string};
export type Baby = {
  id: string;
  family_id: string;
  name: string;
  nickname: string | null;
  birthday: string;
  sex: BabySex | null;
  avatar_path: string | null;
  is_active: boolean;
  gestational_age_days?: number | null;
};
export type Feeding = {
  id: string;
  baby_id: string;
  family_id: string;
  created_by: string;
  amount_ml: number | null;
  duration_min?: number | null;
  feeding_type: FeedingType;
  fed_at: string;
  note: string | null;
  created_at: string;
  updated_at: string;
};
export type GrowthMeasurement = {
  id: string;
  baby_id: string;
  family_id: string;
  recorded_by: string;
  weight_kg: number | null;
  length_cm: number | null;
  head_cm: number | null;
  measured_at: string;
  note: string | null;
  created_at: string;
  updated_at: string;
};
export type Member = {id: string; user_id: string; role: 'owner' | 'member'; display_name?: string | null};
import {tr} from './i18n';
// Getters so the label follows the current language each time it is read.
export const typeLabels: Record<FeedingType, string> = {
  get formula() {
    return tr('配方奶', 'Formula');
  },
  get breast_milk() {
    return tr('母乳', 'Breast milk');
  },
  get mixed() {
    return tr('混合', 'Mixed');
  },
};
export const babyName = (b: Baby) => b.nickname?.trim() || b.name;
export type MomentKind = 'milestone' | 'first' | 'vaccine' | 'checkup';
export const momentKindLabel: Record<MomentKind, () => string> = {
  milestone: () => tr('里程碑', 'Milestone'),
  first: () => tr('第一次', 'First'),
  vaccine: () => tr('疫苗', 'Vaccine'),
  checkup: () => tr('体检', 'Checkup'),
};
/** A timeline entry: a milestone, a "first", a vaccine dose or a checkup. */
export type Moment = {
  id: string;
  baby_id: string;
  family_id: string;
  recorded_by: string;
  kind: MomentKind;
  guide_key: string | null;
  title: string;
  occurred_on: string;
  note: string | null;
  photo_path: string | null;
  created_at: string;
  updated_at: string;
};
/** Everyday care records next to feedings. Sleep and tummy time have an end; an open sleep is ongoing. */
export type EventKind = 'sleep' | 'diaper' | 'tummy' | 'bath' | 'medicine' | 'temperature';
export type DiaperType = 'wet' | 'dirty' | 'both';
export type BabyEvent = {
  id: string;
  baby_id: string;
  family_id: string;
  created_by: string;
  kind: EventKind;
  started_at: string;
  ended_at: string | null;
  diaper: DiaperType | null;
  temperature_c: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};
