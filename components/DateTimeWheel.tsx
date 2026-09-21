'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {CalendarDays,Clock3,X} from 'lucide-react';

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
function serialize(parts:Parts){return `${parts.year}-${two(parts.month)}-${two(parts.day)}T${two(parts.hour)}:${two(parts.minute)}`;}
function WheelColumn({label,values,value,onChange,suffix}:{label:string;values:number[];value:number;onChange:(value:number)=>void;suffix:string}){
 const list=useRef<HTMLDivElement>(null);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>{if(list.current)list.current.scrollTop=Math.max(0,values.indexOf(value))*ROW;},[value,values]);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 function settle(){if(!list.current)return;const index=Math.max(0,Math.min(values.length-1,Math.round(list.current.scrollTop/ROW)));onChange(values[index]);list.current.scrollTo({top:index*ROW,behavior:'smooth'});}
 function choose(n:number){if(timer.current)clearTimeout(timer.current);onChange(n);}
 return <div className="min-w-0 flex-1">
  <p className="mb-2 text-center text-sm font-semibold text-[#62776d]">{label}</p>
  <div className="relative overflow-hidden rounded-2xl bg-[#f3f6f3]">
   <div className="pointer-events-none absolute inset-x-1 top-[128px] z-10 h-16 rounded-xl border border-[#bad9c7] bg-[#e3f1e9]/80"/>
   <div ref={list} role="listbox" aria-label={label} tabIndex={0} className="wheel-scroll relative z-20 h-80 snap-y snap-mandatory overflow-y-auto overscroll-contain text-center" onScroll={()=>{if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(settle,160);}} onKeyDown={e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();const next=values.indexOf(value)+(e.key==='ArrowUp'?-1:1);choose(values[Math.max(0,Math.min(values.length-1,next))]);}}}>
    <div className="h-32"/>
    {values.map(n=><button key={n} type="button" role="option" aria-selected={n===value} className={`flex h-16 w-full snap-center items-center justify-center rounded-xl transition-colors ${n===value?'text-[24px] font-bold text-[#13795b]':'text-[19px] text-[#82958a]'}`} onClick={()=>choose(n)}>{two(n)}{suffix}</button>)}
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
  <button type="button" className="mt-2 flex min-h-16 w-full items-center gap-3 rounded-2xl border border-[#dce5df] bg-white px-4 text-left text-[17px] text-[#18312b]" onClick={show} aria-label="选择喝奶日期和时间"><CalendarDays size={22} className="shrink-0 text-[#13795b]"/><span className="flex-1">{shown.year}年{shown.month}月{shown.day}日 <strong className="ml-1 text-xl">{two(shown.hour)}:{two(shown.minute)}</strong></span><span className="text-sm text-[#13795b]">修改</span></button>
  {open&&<div className="fixed inset-0 z-40 flex items-end justify-center bg-[#10231b]/50" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false);}}>
   <div role="dialog" aria-modal="true" aria-label="选择喝奶日期和时间" className="safe-bottom max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[30px] bg-white px-5 pb-5 pt-4 shadow-2xl">
    <div className="mb-4 flex items-center justify-between"><div><p className="text-sm font-semibold text-[#13795b]">喝奶时间</p><h3 className="mt-1 text-xl font-semibold">{draft.year}年{draft.month}月{draft.day}日　{two(draft.hour)}:{two(draft.minute)}</h3></div><button type="button" className="flex h-11 w-11 items-center justify-center rounded-full bg-[#edf2ed]" aria-label="取消时间选择" onClick={()=>setOpen(false)}><X size={20}/></button></div>
    <div className="mb-4 grid grid-cols-2 rounded-2xl bg-[#edf2ed] p-1" role="tablist" aria-label="选择日期或时间"><button type="button" role="tab" aria-selected={tab==='date'} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl ${tab==='date'?'bg-white font-semibold text-[#13795b] shadow-sm':'text-[#62776d]'}`} onClick={()=>setTab('date')}><CalendarDays size={18}/>日期</button><button type="button" role="tab" aria-selected={tab==='time'} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl ${tab==='time'?'bg-white font-semibold text-[#13795b] shadow-sm':'text-[#62776d]'}`} onClick={()=>setTab('time')}><Clock3 size={18}/>时间</button></div>
    <div className="flex gap-2" key={tab}>{tab==='date'?<><WheelColumn label="年" values={years} value={draft.year} onChange={n=>change('year',n)} suffix="年"/><WheelColumn label="月" values={months} value={draft.month} onChange={n=>change('month',n)} suffix="月"/><WheelColumn label="日" values={days} value={draft.day} onChange={n=>change('day',n)} suffix="日"/></>:<><WheelColumn label="时" values={hours} value={draft.hour} onChange={n=>change('hour',n)} suffix="时"/><WheelColumn label="分" values={minutes} value={draft.minute} onChange={n=>change('minute',n)} suffix="分"/></>}</div>
    {!timeValid&&<p className="mt-3 text-sm text-[#a64c49]">喝奶时间不能是未来时间。</p>}
    <div className="mt-5 flex gap-3"><button type="button" className="min-h-14 rounded-2xl border border-[#dce5df] px-5 font-semibold text-[#13795b]" onClick={now}>现在</button><button type="button" className="min-h-14 flex-1 rounded-2xl bg-[#13795b] px-5 font-semibold text-white" disabled={!timeValid} onClick={()=>{onChange(serialize(draft));setOpen(false);}}>确定</button></div>
   </div>
  </div>}
 </>;
}
