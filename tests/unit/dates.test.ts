import {describe,expect,it} from 'vitest';
import {babyAge,datetimeLocal,dayKey} from '@/lib/dates';

describe('babyAge',()=>{
 it('counts whole months then remaining days',()=>{
  expect(babyAge('2026-06-25',new Date(2026,10,13))).toBe('4个月19天');
 });
 it('handles month-end birthdays without skipping a month',()=>{
  // Born Jan 31: Feb has no 31st, so the 1-month mark is Feb 28.
  expect(babyAge('2026-01-31',new Date(2026,1,28))).toBe('1个月0天');
  expect(babyAge('2026-01-31',new Date(2026,2,30))).toBe('1个月30天');
  expect(babyAge('2026-01-31',new Date(2026,2,31))).toBe('2个月0天');
 });
 it('shows years after the first birthday',()=>{
  expect(babyAge('2025-03-10',new Date(2026,4,12))).toBe('1岁2个月2天');
 });
 it('never goes negative and rejects bad input',()=>{
  expect(babyAge('2026-12-01',new Date(2026,10,1))).toBe('0个月0天');
  expect(babyAge('not a date')).toBe('');
 });
});

describe('dayKey / datetimeLocal',()=>{
 it('formats local dates with zero padding',()=>{
  expect(dayKey(new Date(2026,0,5))).toBe('2026-01-05');
 });
 it('rounds minutes down to the step',()=>{
  const iso=new Date(2026,10,13,9,7).toISOString();
  expect(datetimeLocal(iso,5)).toBe('2026-11-13T09:05');
  expect(datetimeLocal(iso)).toBe('2026-11-13T09:07');
 });
});
