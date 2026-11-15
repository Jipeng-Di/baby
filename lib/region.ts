'use client';
import {tr} from './i18n';
import {createPreference} from './preference';
import type {Region} from './guide';

/** Which country's vaccine and checkup schedule the health guide follows. Per device, like language. */
export const regions: {value: Region; label: () => string; detail: () => string}[] = [
  {
    value: 'us',
    label: () => tr('美国', 'United States'),
    detail: () => tr('AAP 2026 免疫程序与体检时间表', 'AAP 2026 immunization & checkup schedules'),
  },
  {
    value: 'cn',
    label: () => tr('中国', 'China'),
    detail: () =>
      tr('国家免疫规划（2026 年版）与儿童保健', 'National Immunization Program (2026) & child health checks'),
  },
];
const pref = createPreference<Region>('health-region', 'us', ['us', 'cn']);
export const setRegion = pref.set;
export const useRegion = pref.use;
