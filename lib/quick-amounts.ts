import {fromDisplay,getUnit,toDisplay} from './units';
import type {Feeding} from './types';

// Up to six one-tap amounts (in ml): the most frequent recent ones, padded with common defaults, in ascending order.
export function quickAmountsFor(feedings:Feeding[],babyId:string){
 const recent=feedings.filter((item):item is Feeding&{amount_ml:number}=>item.baby_id===babyId&&item.amount_ml!==null).slice(0,30);
 const stats=new Map<number,{count:number;recentIndex:number}>();
 recent.forEach((item,index)=>{// In oz, snap to the nearest half ounce so buttons read 4 or 4.5 rather than 4.1.
  const ml=getUnit()==='oz'?fromDisplay(Math.round(toDisplay(item.amount_ml)*2)/2):item.amount_ml;const current=stats.get(ml);stats.set(ml,{count:(current?.count??0)+1,recentIndex:current?.recentIndex??index});});
 const picked=[...stats.entries()].sort((a,b)=>b[1].count-a[1].count||a[1].recentIndex-b[1].recentIndex).slice(0,6).map(([amount])=>amount);
 const defaults=(getUnit()==='oz'?[2,3,4,5,6,7,8]:[60,90,120,150,180,210,240]).map(fromDisplay);
 for(const amount of defaults){if(picked.length>=6)break;if(!picked.includes(amount))picked.push(amount);}
 return picked.sort((a,b)=>a-b);
}
