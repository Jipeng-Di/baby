'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {CalendarDays,Clock3,X} from 'lucide-react';
import {locale,tr} from '@/lib/i18n';

type Parts={year:number;month:number;day:number;hour:number;minute:number};
type Field=keyof Parts;
const ROW=64;
const two=(n:number)=>String(n).padStart(2,'0');
const range=(start:number,end:number)=>Array.from({length:end-start+1},(_,i)=>start+i);
const daysInMonth=(year:number,month:number)=>new Date(year,month,0).getDate();
const snapToFive=(parts:Parts):Parts=>({...parts,minute:Math.floor(parts.minute/5)*5});

function parse(value:string):Parts{
 const match=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
 if(!match){const d=new Date();return {year:d.getFullYear(),month:d.getMonth()+1,day:d.getDate(),hour:d.getHours(),minute:d.getMinutes()};}
 return {year:Number(match[1]),month:Number(match[2]),day:Number(match[3]),hour:Number(match[4]),minute:Number(match[5])};
}
function dateText(parts:Parts){return tr(`${parts.year}年${parts.month}月${parts.day}日`,new Date(parts.year,parts.month-1,parts.day).toLocaleDateString(locale(),{month:'short',day:'numeric',year:'numeric'}));}
function serialize(parts:Parts){return `${parts.year}-${two(parts.month)}-${two(parts.day)}T${two(parts.hour)}:${two(parts.minute)}`;}
function WheelColumn({label,values,value,onChange,suffix}:{label:string;values:number[];value:number;onChange:(value:number)=>void;suffix:string}){
 const list=useRef<HTMLDivElement>(null);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>{if(list.current)list.current.scrollTop=Math.max(0,values.indexOf(value))*ROW;},[value,values]);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 function settle(){if(!list.current)return;const index=Math.max(0,Math.min(values.length-1,Math.round(list.current.scrollTop/ROW)));onChange(values[index]);list.current.scrollTo({top:index*ROW,behavior:'smooth'});}
 function choose(n:number){if(timer.current)clearTimeout(timer.current);onChange(n);}
 return <div className="min-w-0 flex-1">
  <p className="mb-2 text-center text-sm font-semibold text-(--muted)">{label}</p>
  <div className="relative overflow-hidden rounded-2xl bg-(--surface-2)">
   <div className="pointer-events-none absolute inset-x-1 top-[128px] z-10 h-16 rounded-xl border border-(--line-strong) bg-(--brand-pale)/80"/>
   <div ref={list} role="listbox" aria-label={label} tabIndex={0} className="wheel-scroll relative z-20 h-80 snap-y snap-mandatory overflow-y-auto overscroll-contain text-center" onScroll={()=>{if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(settle,160);}} onKeyDown={e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();const next=values.indexOf(value)+(e.key==='ArrowUp'?-1:1);choose(values[Math.max(0,Math.min(values.length-1,next))]);}}}>
    <div className="h-32"/>
    {values.map(n=><button key={n} type="button" role="option" aria-selected={n===value} className={`flex h-16 w-full snap-center items-center justify-center rounded-xl transition-colors ${n===value?'text-[24px] font-bold text-(--brand)':'text-[19px] text-(--soft)'}`} onClick={()=>choose(n)}>{two(n)}{suffix}</button>)}
    <div className="h-32"/>
   </div>
  </div>
 </div>;
}

export default function DateTimeWheel({value,onChange}:{value:string;onChange:(value:string)=>void}){
 const [open,setOpen]=useState(false);
 const [tab,setTab]=useState<'date'|'time'>('time');
 const [draft,setDraft]=useState<Parts>(()=>parse(value));
 const years=useMemo(()=>range(2000,new Date().getFullYear()),[]);
 const months=useMemo(()=>range(1,12),[]);
 const hours=useMemo(()=>range(0,23),[]);
 const minutes=useMemo(()=>range(0,11).map(n=>n*5),[]);
 const days=useMemo(()=>range(1,daysInMonth(draft.year,draft.month)),[draft.year,draft.month]);
 const shown=parse(value);
 const chosenTime=new Date(serialize(draft)).getTime();
 const timeValid=Number.isFinite(chosenTime)&&chosenTime<=Date.now()+5*60000&&chosenTime>=new Date('2000-01-01').getTime();
 function change(field:Field,n:number){setDraft(current=>{const next={...current,[field]:n};next.day=Math.min(next.day,daysInMonth(next.year,next.month));return next;});}
 function show(){setDraft(snapToFive(parse(value)));setTab('time');setOpen(true);}
 function now(){const d=new Date();setDraft(snapToFive({year:d.getFullYear(),month:d.getMonth()+1,day:d.getDate(),hour:d.getHours(),minute:d.getMinutes()}));}
 return <>
  <button type="button" className="mt-2 flex min-h-16 w-full items-center gap-3 rounded-[18px] border border-(--line) bg-(--surface)/85 px-4 text-left text-[16px] text-(--ink) shadow-[0_2px_10px_rgba(27,61,48,.035)] transition active:scale-[.99]" onClick={show} aria-label={tr('选择喝奶日期和时间','Choose feeding date and time')}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-(--brand-pale) text-(--brand)"><CalendarDays size={20}/></span><span className="flex-1">{dateText(shown)} <strong className="ml-1 text-xl tracking-tight">{two(shown.hour)}:{two(shown.minute)}</strong></span><span className="text-sm font-semibold text-(--brand)">{tr('修改','Change')}</span></button>
  {open&&<div className="fixed inset-0 z-40 flex items-end justify-center bg-[#10231b]/50" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false);}}>
   <div role="dialog" aria-modal="true" aria-label={tr('选择喝奶日期和时间','Choose feeding date and time')} className="ui-sheet safe-bottom max-h-[92dvh] w-full max-w-lg overflow-y-auto px-5 pb-5 pt-4">
    <div className="mb-4 flex items-center justify-between"><div><p className="text-sm font-semibold text-(--brand)">{tr('喝奶时间','Feeding time')}</p><h3 className="mt-1 text-xl font-semibold">{dateText(draft)}　{two(draft.hour)}:{two(draft.minute)}</h3></div><button type="button" className="flex h-11 w-11 items-center justify-center rounded-full bg-(--chip)" aria-label={tr('取消时间选择','Cancel')} onClick={()=>setOpen(false)}><X size={20}/></button></div>
    <div className="mb-4 grid grid-cols-2 rounded-2xl bg-(--chip) p-1" role="tablist" aria-label={tr('选择日期或时间','Date or time')}><button type="button" role="tab" aria-selected={tab==='date'} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl ${tab==='date'?'bg-(--surface) font-semibold text-(--brand) shadow-sm':'text-(--muted)'}`} onClick={()=>setTab('date')}><CalendarDays size={18}/>{tr('日期','Date')}</button><button type="button" role="tab" aria-selected={tab==='time'} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl ${tab==='time'?'bg-(--surface) font-semibold text-(--brand) shadow-sm':'text-(--muted)'}`} onClick={()=>setTab('time')}><Clock3 size={18}/>{tr('时间','Time')}</button></div>
    <div className="flex gap-2" key={tab}>{tab==='date'?<><WheelColumn label={tr('年','Year')} values={years} value={draft.year} onChange={n=>change('year',n)} suffix={tr('年','')}/><WheelColumn label={tr('月','Month')} values={months} value={draft.month} onChange={n=>change('month',n)} suffix={tr('月','')}/><WheelColumn label={tr('日','Day')} values={days} value={draft.day} onChange={n=>change('day',n)} suffix={tr('日','')}/></>:<><WheelColumn label={tr('时','Hour')} values={hours} value={draft.hour} onChange={n=>change('hour',n)} suffix={tr('时','')}/><WheelColumn label={tr('分','Min')} values={minutes} value={draft.minute} onChange={n=>change('minute',n)} suffix={tr('分','')}/></>}</div>
    {!timeValid&&<p className="mt-3 text-sm text-(--danger)">{tr('喝奶时间不能是未来时间。','Feeding time can’t be in the future.')}</p>}
    <div className="mt-5 flex gap-3"><button type="button" className="min-h-14 rounded-[17px] border border-(--line) bg-(--surface)/70 px-5 font-semibold text-(--brand)" onClick={now}>{tr('现在','Now')}</button><button type="button" className="ui-primary flex-1" disabled={!timeValid} onClick={()=>{onChange(serialize(draft));setOpen(false);}}>{tr('确定','Done')}</button></div>
   </div>
  </div>}
 </>;
}
