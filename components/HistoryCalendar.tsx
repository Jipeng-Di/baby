'use client';
import {useMemo,useState} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import type {Baby,Feeding} from '@/lib/types';
import {babyName,typeLabels} from '@/lib/types';
import {dateLabel,dayKey,timeLabel} from '@/lib/dates';
import {locale,tr} from '@/lib/i18n';

const input='ui-input';
const weekdayNames=()=>tr('日一二三四五六','SMTWTFS').split('').map(day=>tr(`周${day}`,day));
type Props={babies:Baby[];feedings:Feeding[];onSelect:(feeding:Feeding)=>void;recorderName:(userId:string)=>string;onMonthChange:(monthStart:Date)=>void;loadingOlder:boolean};

function monthKey(date:Date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;}
function moveMonth(value:string,offset:number){const[year,month]=value.split('-').map(Number);return new Date(year,month-1+offset,1);}
function amountLabel(total:number,hasAmount:boolean){return hasAmount?`${total} ml`:tr('待补充','pending');}

export default function HistoryCalendar({babies,feedings,onSelect,recorderName,onMonthChange,loadingOlder}:Props){
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
 function changeMonth(offset:number){const next=moveMonth(month,offset);const key=monthKey(next);onMonthChange(next);setMonth(key);setSelectedDate(key===currentMonth?today:`${key}-01`);}
 return <>
  <label className="block text-sm font-medium">{tr('选择宝宝','Choose baby')}<select className={`${input} mt-2`} value={selectedBabyId} disabled={babies.length===0} onChange={event=>setBabyId(event.target.value)}>{babies.length===0&&<option value="">{tr('暂无宝宝','No babies')}</option>}{babies.map(baby=><option key={baby.id} value={baby.id}>{babyName(baby)}{baby.is_active?'':tr('（已移出）',' (removed)')}</option>)}</select></label>
  <section className="ui-card p-3">
   <div className="flex items-center justify-between px-1 py-2"><button type="button" className="ui-icon-button" aria-label={tr('上个月','Previous month')} onClick={()=>changeMonth(-1)}><ChevronLeft size={20}/></button><div className="text-center"><h2 className="text-lg font-semibold tracking-tight">{tr(`${calendar.year}年${calendar.monthNumber}月`,new Date(calendar.year,calendar.monthNumber-1,1).toLocaleDateString(locale(),{month:'long',year:'numeric'}))}</h2>{loadingOlder&&<p className="text-xs text-(--soft)" role="status">{tr('正在加载…','Loading…')}</p>}</div><button type="button" disabled={month>=currentMonth} className="ui-icon-button disabled:cursor-not-allowed disabled:opacity-30" aria-label={tr('下个月','Next month')} onClick={()=>changeMonth(1)}><ChevronRight size={20}/></button></div>
   <div className="mt-2 grid grid-cols-7 text-center text-xs font-semibold text-(--soft)">{weekdayNames().map((day,index)=><div className="py-2" key={index}>{day}</div>)}</div>
   <div className="grid grid-cols-7 gap-1">{Array.from({length:calendar.offset},(_,index)=><div key={`blank-${index}`}/>)}{calendar.days.map(key=>{const day=daily.get(key);const selected=selectedDate===key;const isToday=key===today;return <button type="button" key={key} aria-pressed={selected} aria-label={tr(`${key}，${day?amountLabel(day.total,day.hasAmount):'无记录'}`,`${key}, ${day?amountLabel(day.total,day.hasAmount):'no records'}`)} className={`relative flex min-h-[68px] flex-col items-center rounded-xl border px-0.5 py-1.5 transition ${selected?'border-(--brand) bg-(--brand-pale) shadow-[0_3px_10px_rgba(19,121,91,.12)]':day?'border-(--line) bg-(--surface-2)':'border-transparent bg-(--surface-2)'} active:scale-[.97]`} onClick={()=>setSelectedDate(key)}><span className={`flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold ${isToday?'bg-(--brand-solid) text-white':selected?'text-(--brand)':'text-(--ink-2)'}`}>{Number(key.slice(-2))}</span>{day?<><span className="mt-1 max-w-full truncate text-[10px] font-bold leading-none text-(--brand)">{day.hasAmount?day.total:'—'} ml</span><span className="mt-1 text-[9px] leading-none text-(--soft)">{day.count}{tr('次','×')}</span></>:null}</button>;})}</div>
  </section>
  <section><div className="mb-3 flex items-end justify-between gap-3"><div><p className="text-sm text-(--muted)">{dateLabel(`${selectedDate}T12:00:00`)}</p><h2 className="mt-1 text-xl font-semibold">{tr('当天记录','Records that day')}</h2></div>{daily.get(selectedDate)?<div className="text-right"><strong className="text-lg text-(--brand)">{amountLabel(daily.get(selectedDate)!.total,daily.get(selectedDate)!.hasAmount)}</strong><p className="text-xs text-(--soft)">{tr(`${daily.get(selectedDate)!.count} 次`,`${daily.get(selectedDate)!.count} feeds`)}</p></div>:null}</div>{selectedRows.length?<div className="space-y-2">{selectedRows.map(item=>{const baby=babyById.get(item.baby_id);return <button key={item.id} type="button" className="flex min-h-18 w-full items-center gap-3 rounded-2xl border border-(--line) bg-(--surface) px-4 py-3 text-left shadow-[0_3px_14px_rgba(31,67,52,.04)]" onClick={()=>onSelect(item)}><div className="w-13 text-sm font-semibold text-(--ink-2)">{timeLabel(item.fed_at)}</div><div className="min-w-0 flex-1"><p className="font-semibold">{baby?babyName(baby):tr('宝宝','Baby')}</p><p className="truncate text-sm text-(--soft)">{typeLabels[item.feeding_type]} · {recorderName(item.created_by)}{item.note?` · ${item.note}`:''}</p></div><strong className="text-lg">{item.amount_ml===null?tr('待补充','pending'):<>{item.amount_ml} <span className="text-sm font-normal text-(--muted)">ml</span></>}</strong><ChevronRight size={16} className="text-(--faint)"/></button>;})}</div>:<div className="rounded-2xl border border-dashed border-(--line) bg-(--surface)/60 px-5 py-8 text-center text-sm text-(--soft)">{tr('这一天没有喝奶记录','No feedings on this day')}</div>}</section>
 </>;
}
