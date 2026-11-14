import {tr} from './i18n';
import type {BabySex} from './types';

export type BabyForm = {
  name: string;
  nickname: string;
  birthday: string;
  sex: BabySex | '';
  gestWeeks: string;
  gestDays: string;
};
export const emptyBabyForm: BabyForm = {
  name: '',
  nickname: '',
  birthday: '',
  sex: '',
  gestWeeks: '',
  gestDays: '',
};

/** Validates the baby form and returns the row fields. Throws a user-facing Error when invalid. */
export function parseBabyForm(form: BabyForm, today = new Date()) {
  if (!form.name.trim() || !form.birthday)
    throw new Error(tr('请填写宝宝姓名和出生日期。', 'Enter the baby’s name and date of birth.'));
  if (new Date(form.birthday) > today)
    throw new Error(tr('出生日期不能晚于今天。', 'Date of birth can’t be in the future.'));
  const weeks = form.gestWeeks.trim();
  const extra = form.gestDays.trim();
  let gestation: number | null = null;
  if (weeks) {
    const w = Number(weeks),
      d = extra ? Number(extra) : 0;
    if (!Number.isInteger(w) || w < 22 || w > 44 || !Number.isInteger(d) || d < 0 || d > 6)
      throw new Error(
        tr('出生孕周请填写 22–44 周，天数 0–6。', 'Gestational age must be 22–44 weeks and 0–6 days.'),
      );
    gestation = w * 7 + d;
  } else if (extra)
    throw new Error(tr('请先填写出生孕周的周数。', 'Enter the weeks of gestational age first.'));
  return {
    name: form.name.trim(),
    nickname: form.nickname.trim() || null,
    birthday: form.birthday,
    sex: form.sex || null,
    gestational_age_days: gestation,
  };
}
/** Prefills the form from an existing baby. */
export function babyToForm(b: {
  name: string;
  nickname: string | null;
  birthday: string;
  sex: BabySex | null;
  gestational_age_days?: number | null;
}): BabyForm {
  return {
    name: b.name,
    nickname: b.nickname || '',
    birthday: b.birthday,
    sex: b.sex || '',
    gestWeeks: b.gestational_age_days ? String(Math.floor(b.gestational_age_days / 7)) : '',
    gestDays: b.gestational_age_days ? String(b.gestational_age_days % 7) : '',
  };
}
