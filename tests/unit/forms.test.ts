import {afterEach,describe,expect,it} from 'vitest';
import {parseFeedForm,type FeedForm} from '@/lib/feedings';
import {parseBabyForm,babyToForm,emptyBabyForm} from '@/lib/baby-form';
import {setUnit} from '@/lib/units';

afterEach(()=>setUnit('ml'));
const base:FeedForm={baby_id:'a',amount:'120',duration:'',mode:'vol',feeding_type:'formula',fed_at:'2026-11-13T09:05',note:'  '};

describe('parseFeedForm',()=>{
 it('accepts a normal bottle feed and trims the note',()=>{
  const r=parseFeedForm(base,['a']);
  expect(r.amount_ml).toBe(120);expect(r.duration_min).toBeNull();expect(r.note).toBeNull();
  expect(r.fed_at).toBe(new Date('2026-11-13T09:05').toISOString());
 });
 it('allows a blank amount (fill in later)',()=>{
  expect(parseFeedForm({...base,amount:''},['a']).amount_ml).toBeNull();
 });
 it('stores oz input as ml',()=>{
  setUnit('oz');
  expect(parseFeedForm({...base,amount:'4'},['a']).amount_ml).toBe(118);
 });
 it('keeps nursing minutes for breast milk but ignores them for formula',()=>{
  expect(parseFeedForm({...base,feeding_type:'breast_milk',amount:'',duration:'15'},['a']).duration_min).toBe(15);
  expect(parseFeedForm({...base,duration:'15'},['a']).duration_min).toBeNull();
 });
 it('rejects bad values',()=>{
  expect(()=>parseFeedForm({...base,amount:'0'},['a'])).toThrow();
  expect(()=>parseFeedForm({...base,amount:'1001'},['a'])).toThrow();
  expect(()=>parseFeedForm({...base,feeding_type:'breast_milk',duration:'2.5'},['a'])).toThrow();
  expect(()=>parseFeedForm({...base,fed_at:'2999-01-01T00:00'},['a'])).toThrow();
  expect(()=>parseFeedForm(base,['b'])).toThrow();
 });
});

describe('parseBabyForm',()=>{
 const form={...emptyBabyForm,name:' 一一 ',birthday:'2026-06-25'};
 it('trims fields and leaves gestation empty for full term',()=>{
  expect(parseBabyForm(form,new Date(2026,10,13))).toEqual({name:'一一',nickname:null,birthday:'2026-06-25',sex:null,gestational_age_days:null});
 });
 it('stores gestational age in days',()=>{
  expect(parseBabyForm({...form,gestWeeks:'34',gestDays:'2'},new Date(2026,10,13)).gestational_age_days).toBe(240);
 });
 it('rejects future birthdays and impossible gestation',()=>{
  expect(()=>parseBabyForm({...form,birthday:'2027-01-01'},new Date(2026,10,13))).toThrow();
  expect(()=>parseBabyForm({...form,gestWeeks:'50'},new Date(2026,10,13))).toThrow();
  expect(()=>parseBabyForm({...form,gestDays:'3'},new Date(2026,10,13))).toThrow();
 });
 it('round-trips through babyToForm',()=>{
  expect(babyToForm({name:'A',nickname:null,birthday:'2026-06-25',sex:'female',gestational_age_days:240})).toMatchObject({gestWeeks:'34',gestDays:'2',sex:'female'});
 });
});
