import {describe,expect,it} from 'vitest';
import {growthAge,growthPercentile,percentileDrift,whoGrowthRows,zScore} from '@/lib/who-growth';

describe('WHO growth math',()=>{
 it('puts the median at z = 0 / P50',()=>{
  const p50=whoGrowthRows('weight','female',6).find(r=>r.month===4)!.p50;
  // The published P50 is rounded to 0.1 kg, so allow a small difference from the exact LMS median.
  expect(Math.abs(zScore('weight','female',4,p50)!)).toBeLessThan(.05);
  expect(Math.abs(growthPercentile('weight','female',4,p50)!-50)).toBeLessThan(2);
 });
 it('matches the published P3 and P97 lines',()=>{
  const row=whoGrowthRows('length','male',12).find(r=>r.month===12)!;
  expect(growthPercentile('length','male',12,row.p3)).toBeCloseTo(3,0);
  expect(growthPercentile('length','male',12,row.p97)).toBeCloseTo(97,0);
 });
 it('uses corrected age for preterm babies until 24 months',()=>{
  const term=growthAge('2026-01-01','2026-07-01',null);
  const preterm=growthAge('2026-01-01','2026-07-01',34*7);
  expect(term.corrected).toBe(false);
  expect(preterm.corrected).toBe(true);
  expect(term.months-preterm.months).toBeCloseTo(42/30.4375,3);
  expect(growthAge('2024-01-01','2026-07-01',34*7).corrected).toBe(false);
 });
});

describe('percentileDrift',()=>{
 const pt=(months:number,z:number,date:string)=>({months,z,date});
 it('flags a drop across two major lines',()=>{
  const d=percentileDrift('weight',[pt(2,0.5,'2026-08-01'),pt(4,-1.5,'2026-10-01')]);
  expect(d?.direction).toBe('down');
 });
 it('ignores a one-line change and the newborn fortnight',()=>{
  expect(percentileDrift('weight',[pt(2,0.5,'2026-08-01'),pt(4,-0.5,'2026-10-01')])).toBeNull();
  expect(percentileDrift('weight',[pt(0.2,1.5,'2026-06-28'),pt(4,-1.5,'2026-10-01')])).toBeNull();
 });
 it('flags rapid head growth upward but not weight gain',()=>{
  expect(percentileDrift('head',[pt(2,-1.5,'2026-08-01'),pt(4,0.5,'2026-10-01')])?.direction).toBe('up');
  expect(percentileDrift('weight',[pt(2,-1.5,'2026-08-01'),pt(4,0.5,'2026-10-01')])).toBeNull();
 });
});
