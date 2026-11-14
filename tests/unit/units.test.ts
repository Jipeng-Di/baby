import {afterEach,describe,expect,it} from 'vitest';
import {feedingAmount,fromDisplay,setUnit,toDisplay,volumeLabel} from '@/lib/units';
import {quickAmountsFor} from '@/lib/quick-amounts';
import type {Feeding} from '@/lib/types';

afterEach(()=>setUnit('ml'));

describe('volume units',()=>{
 it('passes ml through unchanged',()=>{
  expect(toDisplay(120)).toBe(120);
  expect(fromDisplay(120)).toBe(120);
  expect(volumeLabel(1234)).toBe('1,234 ml');
 });
 it('converts oz to whole ml and back to one decimal',()=>{
  setUnit('oz');
  expect(fromDisplay(4)).toBe(118);
  expect(toDisplay(118)).toBe(4);
  expect(toDisplay(fromDisplay(4.5))).toBe(4.5);
  expect(volumeLabel(150)).toBe('5.1 oz');
 });
 it('describes a feeding by volume, else nursing minutes, else pending',()=>{
  expect(feedingAmount({amount_ml:90,duration_min:null})).toBe('90 ml');
  expect(feedingAmount({amount_ml:null,duration_min:15})).toBe('15 分钟');
  expect(feedingAmount({amount_ml:null,duration_min:null})).toBe('待补充');
 });
});

const feed=(amount:number|null,i:number):Feeding=>({id:String(i),baby_id:'a',family_id:'f',created_by:'u',amount_ml:amount,duration_min:null,feeding_type:'formula',fed_at:new Date(2026,10,13,20-i).toISOString(),note:null,created_at:'',updated_at:''});

describe('quickAmountsFor',()=>{
 it('returns six ascending amounts, most frequent first, padded with defaults',()=>{
  const feedings=[120,120,150,null,110].map(feed);
  expect(quickAmountsFor(feedings,'a')).toEqual([60,90,110,120,150,180]);
 });
 it('ignores other babies',()=>{
  expect(quickAmountsFor([feed(130,0)],'b')).toEqual([60,90,120,150,180,210]);
 });
 it('snaps to half ounces in oz mode',()=>{
  setUnit('oz');
  const amounts=quickAmountsFor([feed(110,0),feed(122,1)],'a').map(toDisplay);
  expect(amounts).toEqual([2,3,3.5,4,5,6]);
 });
});
