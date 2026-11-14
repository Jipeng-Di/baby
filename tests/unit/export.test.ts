import {describe,expect,it} from 'vitest';
import {toCsv} from '@/lib/export';

describe('toCsv',()=>{
 it('adds a BOM, quotes special characters and blanks nulls',()=>{
  expect(toCsv([['a','b,c','say "hi"',null,3]])).toBe('﻿a,"b,c","say ""hi""",,3');
 });
 it('neutralises spreadsheet formulas in text but not numbers',()=>{
  expect(toCsv([['=SUM(A1)',-5]])).toBe("﻿'=SUM(A1),-5");
 });
});
