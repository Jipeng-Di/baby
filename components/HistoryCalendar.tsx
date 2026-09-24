'use client';
import {useMemo,useState} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import type {Baby,Feeding} from '@/lib/types';
import {babyName,typeLabels} from '@/lib/types';
import {dateLabel,dayKey,timeLabel} from '@/lib/dates';

const input='w-full rounded-2xl border border-[#d2ded5] bg-white/90 px-4 py-3.5 text-[16px] text-[#18312b] shadow-[0_2px_8px_rgba(22,54,42,.035)] outline-none transition focus:border-[#4f977d] focus:ring-4 focus:ring-[#dcece3]';
const weekdays=['日','一','二','三','四','五','六'];
type Props={babies:Baby[];feedings:Feeding[];onSelect:(feeding:Feeding)=>void};

function monthKey(date:Date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;}
function moveMonth(value:string,offset:number){const[year,month]=value.split('-').map(Number);return new Date(year,month-1+offset,1);}
function amountLabel(total:number,hasAmount:boolean){return hasAmount?`${total} ml`:'待补充';}

export default function HistoryCalendar({babies,feedings,onSelect}:Props){
 const today=dayKey(new Date());
 const [babyId,setBabyId]=useState('');
 const [month,setMonth]=useState(()=>monthKey(new Date()));
 const [selectedDate,setSelectedDate]=useState(today);
 const currentMonth=today.slice(0,7);
 const selectedBabyId=babyId&&babies.some(baby=>baby.id===babyId)?babyId:(babies.find(baby=>baby.is_active)?.id??babies[0]?.id??'');
 const babyById=useMemo(()=>new Map(babies.map(baby=>[baby.id,baby])),[babies]);
 const filtered=useMemo(()=>selectedBabyId?feedings.filter(item=>item.baby_id===selectedBabyId):[],[feedings,selectedBabyId]);
 const daily=useMemo(()=>{const result=new Map<string,{total:number;count:number;hasAmount:boolean}>();for(const item of filtered){const key=dayKey(new Date(item.fed_at));const current=result.get(key)??{total:0,count:0,hasAmount:false};current.count+=1;if(item.amount_ml!==null){current.total+=item.amount_ml;current.hasAmount=true;}result.set(key,current);}return result;},[filtered]);
 const selectedRows=useMemo(()=>filtered.filter(item=>dayKey(new Date(item.fed_at))===selectedDate).sort((a,b)=>new Date(b.fed_at).getTime()-new Date(a.fed_at).getTime()),[filtered,selectedDate]);
 const calendar=useMemo(()=>{const[year,monthNumber]=month.split('-').map(Number);const first=new Date(year,monthNumber-1,1);const count=new Date(year,monthNumber,0).getDate();return{year,monthNumber,offset:first.getDay(),days:Array.from({length:count},(_,index)=>`${month}-${String(index+1).padStart(2,'0')}`)};},[month]);
 function changeMonth(offset:number){const next=moveMonth(month,offset);const key=monthKey(next);setMonth(key);setSelectedDate(key===currentMonth?today:`${key}-01`);}
 return <>
  <label className="block text-sm font-medium">选择宝宝<select className={`${input} mt-2`} value={selectedBabyId} disabled={babies.length===0} onChange={event=>setBabyId(event.target.value)}>{babies.length===0&&<option value="">暂无宝宝</option>}{babies.map(baby=><option key={baby.id} value={baby.id}>{babyName(baby)}{baby.is_active?'':'（已移出）'}</option>)}</select></label>
  <section className="rounded-[28px] border border-white/90 bg-white/88 p-3 shadow-[0_12px_35px_rgba(28,64,49,.075)] backdrop-blur-xl">
   <div className="flex items-center justify-between px-1 py-2"><button type="button" className="flex h-11 w-11 items-center justify-center rounded-full border border-[#dce5df] text-[#13795b]" aria-label="上个月" onClick={()=>changeMonth(-1)}><ChevronLeft size={20}/></button><h2 className="text-lg font-semibold">{calendar.year}年{calendar.monthNumber}月</h2><button type="button" disabled={month>=currentMonth} className="flex h-11 w-11 items-center justify-center rounded-full border border-[#dce5df] text-[#13795b] disabled:cursor-not-allowed disabled:opacity-30" aria-label="下个月" onClick={()=>changeMonth(1)}><ChevronRight size={20}/></button></div>
   <div className="mt-2 grid grid-cols-7 text-center text-xs font-semibold text-[#789087]">{weekdays.map(day=><div className="py-2" key={day}>周{day}</div>)}</div>
   <div className="grid grid-cols-7 gap-1">{Array.from({length:calendar.offset},(_,index)=><div key={`blank-${index}`}/>)}{calendar.days.map(key=>{const day=daily.get(key);const selected=selectedDate===key;const isToday=key===today;return <button type="button" key={key} aria-pressed={selected} aria-label={`${key}，${day?amountLabel(day.total,day.hasAmount):'无记录'}`} className={`relative flex min-h-[68px] flex-col items-center rounded-xl border px-0.5 py-1.5 transition ${selected?'border-[#13795b] bg-[#e8f3ed] shadow-[0_3px_10px_rgba(19,121,91,.12)]':day?'border-[#d5e4da] bg-[#f7faf8]':'border-transparent bg-[#fbfcfb]'} active:scale-[.97]`} onClick={()=>setSelectedDate(key)}><span className={`flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold ${isToday?'bg-[#13795b] text-white':selected?'text-[#13795b]':'text-[#41574e]'}`}>{Number(key.slice(-2))}</span>{day?<><span className="mt-1 max-w-full truncate text-[10px] font-bold leading-none text-[#176f56]">{day.hasAmount?day.total:'—'} ml</span><span className="mt-1 text-[9px] leading-none text-[#789087]">{day.count}次</span></>:null}</button>;})}</div>
  </section>
  <section><div className="mb-3 flex items-end justify-between gap-3"><div><p className="text-sm text-[#62776d]">{dateLabel(`${selectedDate}T12:00:00`)}</p><h2 className="mt-1 text-xl font-semibold">当天记录</h2></div>{daily.get(selectedDate)?<div className="text-right"><strong className="text-lg text-[#13795b]">{amountLabel(daily.get(selectedDate)!.total,daily.get(selectedDate)!.hasAmount)}</strong><p className="text-xs text-[#789087]">{daily.get(selectedDate)!.count} 次</p></div>:null}</div>{selectedRows.length?<div className="space-y-2">{selectedRows.map(item=>{const baby=babyById.get(item.baby_id);return <button key={item.id} type="button" className="flex min-h-18 w-full items-center gap-3 rounded-2xl border border-[#dce5df] bg-white px-4 py-3 text-left shadow-[0_3px_14px_rgba(31,67,52,.04)]" onClick={()=>onSelect(item)}><div className="w-13 text-sm font-semibold text-[#4f665c]">{timeLabel(item.fed_at)}</div><div className="min-w-0 flex-1"><p className="font-semibold">{baby?babyName(baby):'宝宝'}</p><p className="truncate text-sm text-[#789087]">{typeLabels[item.feeding_type]}{item.note?` · ${item.note}`:''}</p></div><strong className="text-lg">{item.amount_ml===null?'待补充':<>{item.amount_ml} <span className="text-sm font-normal text-[#62776d]">ml</span></>}</strong><ChevronRight size={16} className="text-[#9aada0]"/></button>;})}</div>:<div className="rounded-2xl border border-dashed border-[#ccd9d0] bg-white/60 px-5 py-8 text-center text-sm text-[#789087]">这一天没有喝奶记录</div>}</section>
 </>;
}
