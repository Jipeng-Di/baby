'use client';
import {useEffect,useSyncExternalStore} from 'react';
import {tr} from './i18n';
import type {Feeding} from './types';

export type VolumeUnit='ml'|'oz';
export const volumeUnits:{value:VolumeUnit;label:string}[]=[{value:'ml',label:'ml'},{value:'oz',label:'oz'}];
export const ML_PER_OZ=29.5735;
const KEY='volume-unit';
// Starts as ml so the first client render matches the prerendered HTML; the stored choice is applied after hydration.
let unit:VolumeUnit='ml';
const listeners=new Set<()=>void>();
function apply(next:VolumeUnit){unit=next;listeners.forEach(listener=>listener());}
export function setUnit(next:VolumeUnit){try{localStorage.setItem(KEY,next);}catch{}apply(next);}
export const getUnit=()=>unit;
function subscribe(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener);};}
/** Re-renders the calling component when the volume unit changes. */
export function useUnit(){
 useEffect(()=>{let stored:string|null=null;try{stored=localStorage.getItem(KEY);}catch{}if(stored==='oz'&&unit!=='oz')apply('oz');},[]);
 return useSyncExternalStore(subscribe,getUnit,()=>'ml' as VolumeUnit);
}

/** Stored millilitres → number in the display unit (oz to one decimal). */
export function toDisplay(ml:number){return unit==='oz'?Math.round(ml/ML_PER_OZ*10)/10:Math.round(ml);}
/** Number typed in the display unit → whole millilitres for storage. */
export function fromDisplay(value:number){return unit==='oz'?Math.round(value*ML_PER_OZ):Math.round(value);}
export const volumeNumber=(ml:number)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(toDisplay(ml));
export const volumeLabel=(ml:number)=>`${volumeNumber(ml)} ${unit}`;
export const minutesLabel=(min:number)=>tr(`${min} 分钟`,`${min} min`);
/** What a single feeding amounted to: volume if known, else breastfeeding duration, else pending. */
export function feedingAmount(item:Pick<Feeding,'amount_ml'|'duration_min'>){
 if(item.amount_ml!==null)return volumeLabel(item.amount_ml);
 if(item.duration_min)return minutesLabel(item.duration_min);
 return tr('待补充','pending');
}
