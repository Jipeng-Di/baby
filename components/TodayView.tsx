'use client';
import {useEffect,useRef,useState} from 'react';
import {ChevronDown,ChevronRight,Plus} from 'lucide-react';
import BabyAvatar from './BabyAvatar';
import WeatherCard from './WeatherCard';
import {babyAge,localDay,timeLabel} from '@/lib/dates';
import {babyName,type Baby,type Feeding,typeLabels} from '@/lib/types';
import {tr} from '@/lib/i18n';

// After this long without a feeding, the "since last feeding" counter turns to the alert color.
const LONG_GAP_MINUTES=180;
// Matches the carousel's px-5 / scroll-px-5 inset.
const EDGE=20;
const ACTIVE_KEY='today-active-baby';
const fmt=(n:number)=>new Intl.NumberFormat('zh-CN').format(n);

type Props={
 babies:Baby[];feedings:Feeding[];avatarUrls:Record<string,string>;now:number;
 recorderName:(userId:string)=>string;
 onStartFeed:(baby:Baby,amount:number)=>void;onEditFeed:(item:Feeding)=>void;onAddBaby:()=>void;
};
type Gap={minutes:number;hours:number;rest:number;long:boolean};

function frequentAmounts(feedings:Feeding[],babyId:string){
 const recent=feedings.filter((item):item is Feeding&{amount_ml:number}=>item.baby_id===babyId&&item.amount_ml!==null).slice(0,10);
 const stats=new Map<number,{count:number;recentIndex:number}>();
 recent.forEach((item,index)=>{const current=stats.get(item.amount_ml);stats.set(item.amount_ml,{count:(current?.count??0)+1,recentIndex:current?.recentIndex??index});});
 return [...stats.entries()].sort((a,b)=>b[1].count-a[1].count||a[1].recentIndex-b[1].recentIndex).slice(0,3).map(([amount])=>amount);
}
function gapSince(item:Feeding|undefined,now:number):Gap|null{
 if(!item)return null;
 const minutes=Math.max(0,Math.floor((now-new Date(item.fed_at).getTime())/60000));
 return {minutes,hours:Math.floor(minutes/60),rest:minutes%60,long:minutes>=LONG_GAP_MINUTES};
}

export default function TodayView({babies,feedings,avatarUrls,now,recorderName,onStartFeed,onEditFeed,onAddBaby}:Props){
 const [expanded,setExpanded]=useState<string[]>([]);
 const [active,setActive]=useState(0);
 const scroller=useRef<HTMLDivElement>(null);
 const restored=useRef(false);
 const multi=babies.length>1;
 const current=Math.min(active,Math.max(0,babies.length-1));

 const start=localDay(new Date(now));const end=new Date(start);end.setDate(end.getDate()+1);
 const todayFeedings=feedings.filter(f=>{const t=new Date(f.fed_at).getTime();return t>=start.getTime()&&t<end.getTime();});
 const lastByBaby=new Map<string,Feeding>();
 for(const item of feedings)if(!lastByBaby.has(item.baby_id))lastByBaby.set(item.baby_id,item);

 // Scroll offset at which slide `index` is snapped: earlier slides align to the start, the last slide to the end.
 function snapLeft(index:number){
  const el=scroller.current;const slide=el?.children[index] as HTMLElement|undefined;if(!el||!slide)return 0;
  const left=index===babies.length-1?slide.offsetLeft+slide.offsetWidth+EDGE-el.clientWidth:slide.offsetLeft-EDGE;
  return Math.max(0,Math.min(el.scrollWidth-el.clientWidth,left));
 }
 function remember(index:number){try{localStorage.setItem(ACTIVE_KEY,babies[index].id);}catch{}}
 function scrollToIndex(index:number,behavior:ScrollBehavior='smooth'){scroller.current?.scrollTo({left:snapLeft(index),behavior});}
 function select(index:number){setActive(index);remember(index);if(multi)scrollToIndex(index);}
 function onScroll(){
  const el=scroller.current;if(!el)return;
  let index=0;let best=Infinity;
  babies.forEach((_,i)=>{const distance=Math.abs(snapLeft(i)-el.scrollLeft);if(distance<best){best=distance;index=i;}});
  if(index!==active){setActive(index);remember(index);}
 }
 // Reopen on the baby the user last looked at.
 useEffect(()=>{
  if(!multi||restored.current)return;restored.current=true;
  let id:string|null=null;try{id=localStorage.getItem(ACTIVE_KEY);}catch{}
  const index=babies.findIndex(b=>b.id===id);
  if(index>0){setActive(index);scrollToIndex(index,'auto');}
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[multi,babies]);

 function renderCard(baby:Baby,i:number){
  const items=todayFeedings.filter(f=>f.baby_id===baby.id);
  const last=lastByBaby.get(baby.id);const gap=gapSince(last,now);
  const total=items.reduce((sum,f)=>sum+(f.amount_ml??0),0);
  const isExpanded=expanded.includes(baby.id);const quickAmounts=frequentAmounts(feedings,baby.id);
  const warm=i%2===1;
  return <section className={`ui-card p-4! relative overflow-hidden bg-gradient-to-br from-(--surface) ${warm?'to-(--warm-pale)':'to-(--surface-2)'}`}>
   <span className={`absolute inset-x-0 top-0 h-1 ${warm?'bg-[#e6aa75]':'bg-[#5ca789]'}`}/>
   <div className={`rounded-[20px] border px-4 py-3 ${gap?.long?'border-(--alert)/35 bg-(--alert-pale)':warm?'border-(--warm-line) bg-(--warm-pale)':'border-(--line-strong) bg-(--brand-pale)'}`}>
    <p className="text-[11px] font-semibold tracking-[.12em] text-(--muted)">{tr('距上次喂奶','Since last feed')}</p>
    {gap&&last?<>
     <p className={`mt-1 flex items-baseline gap-1 ${gap.long?'text-(--alert)':'text-(--ink)'}`}>
      {gap.hours>0&&<><strong className="text-[38px] leading-none tracking-tight">{gap.hours}</strong><span className="mr-1.5 text-base font-semibold">{tr('小时','h')}</span></>}
      <strong className="text-[38px] leading-none tracking-tight">{gap.hours>0?gap.rest:gap.minutes}</strong><span className="text-base font-semibold">{tr('分钟','min')}</span>
     </p>
     <p className="mt-1.5 text-sm text-(--ink-2)"><span className="font-semibold text-(--ink)">{timeLabel(last.fed_at)}</span> · {last.amount_ml===null?tr('奶量待补充','amount pending'):`${last.amount_ml} ml`} · {tr(`${recorderName(last.created_by)}记录`,`by ${recorderName(last.created_by)}`)}</p>
    </>:<p className="mt-1 text-base font-semibold text-(--muted)">{tr('还没有喝奶记录','No feedings yet')}</p>}
   </div>
   <div className="mt-2.5 grid grid-cols-2 gap-2">
    <div className="rounded-2xl border border-(--line) bg-(--surface)/70 px-3.5 py-2"><p className="text-xs font-medium text-(--muted)">{tr('今日总奶量','Today’s total')}</p><p className="mt-0.5"><strong className="text-xl tracking-tight text-(--ink)">{fmt(total)}</strong> <span className="text-sm text-(--muted)">ml</span></p></div>
    <div className="rounded-2xl border border-(--line) bg-(--surface)/70 px-3.5 py-2"><p className="text-xs font-medium text-(--muted)">{tr('今日次数','Feeds today')}</p><p className="mt-0.5"><strong className="text-xl tracking-tight text-(--ink)">{items.length}</strong> <span className="text-sm text-(--muted)">{tr('次','feeds')}</span></p></div>
   </div>
   {items.length>0&&<div className="mt-1">
    <button type="button" aria-expanded={isExpanded} aria-controls={`today-feedings-${baby.id}`} className="flex min-h-10 w-full items-center justify-between rounded-xl px-1 text-sm font-semibold text-(--brand) transition active:bg-(--surface)/70" onClick={()=>setExpanded(list=>list.includes(baby.id)?list.filter(id=>id!==baby.id):[...list,baby.id])}><span>{isExpanded?tr('收起今日记录','Hide today’s feeds'):tr(`展开今日记录 · ${items.length} 次`,`Show today’s feeds · ${items.length}`)}</span><ChevronDown size={18} className={isExpanded?'rotate-180 transition-transform':'transition-transform'}/></button>
    <div id={`today-feedings-${baby.id}`} hidden={!isExpanded} className="mt-1 divide-y divide-(--line) rounded-2xl border border-(--line) bg-(--surface-2) px-3">{items.map(item=><button key={item.id} type="button" className="flex min-h-14 w-full items-center gap-2 text-left" onClick={()=>onEditFeed(item)}><span className="w-14 font-semibold text-(--ink)">{timeLabel(item.fed_at)}</span><span className="min-w-0 flex-1 truncate text-sm text-(--muted)">{typeLabels[item.feeding_type]} · {recorderName(item.created_by)}</span><strong className="text-(--ink)">{item.amount_ml===null?tr('待补充','pending'):`${item.amount_ml} ml`}</strong><ChevronRight size={16} className="text-(--faint)"/></button>)}</div>
   </div>}
   <div className="mt-2.5 grid gap-2" style={{gridTemplateColumns:`repeat(${quickAmounts.length+1},minmax(0,1fr))`}}>
    {quickAmounts.map(amount=><button key={amount} className="min-h-12 rounded-2xl border border-(--line-strong) bg-(--surface)/75 px-1 text-[15px] font-semibold text-(--brand) shadow-[0_3px_10px_rgba(32,84,63,.05)] transition active:scale-[.97] active:bg-(--brand-pale)" onClick={()=>onStartFeed(baby,amount)}>+{amount}</button>)}
    <button className="min-h-12 rounded-2xl border border-(--line-strong) bg-(--surface)/75 px-1 text-[15px] font-semibold text-(--brand) shadow-[0_3px_10px_rgba(32,84,63,.05)] transition active:scale-[.97] active:bg-(--brand-pale)" onClick={()=>onStartFeed(baby,0)}>{tr('更多','More')}</button>
   </div>
  </section>;
 }

 return <div className="space-y-3">
  <WeatherCard now={now}/>
  {babies.length===0?<div className="ui-card py-9 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-(--brand-pale) text-(--brand)"><Plus/></div><p className="mt-4 text-(--muted)">{tr('添加宝宝后即可开始记录','Add a baby to start logging')}</p><button className="mt-4 min-h-12 px-5 font-semibold text-(--brand)" onClick={onAddBaby}>{tr('添加宝宝 →','Add baby →')}</button></div>
  :<div>
   <div className="no-scrollbar flex gap-2 overflow-x-auto" role="tablist" aria-label={tr('切换宝宝','Switch baby')}>{babies.map((baby,i)=>{const selected=i===current;return <button key={baby.id} type="button" role="tab" aria-selected={selected} aria-controls={`baby-slide-${baby.id}`} className={`flex min-h-[68px] flex-1 items-center gap-3 rounded-[22px] border px-3.5 py-2.5 text-left transition active:scale-[.98] ${babies.length>2?'min-w-[46%]':'min-w-0'} ${selected?'border-(--brand) bg-(--brand-pale) shadow-[0_4px_14px_rgba(19,121,91,.12)]':'border-(--line) bg-(--surface)/70'}`} onClick={()=>select(i)}><BabyAvatar baby={baby} url={avatarUrls[baby.id]} tone={i%2?'warm':'green'} small onTint={selected}/><span className="min-w-0"><span className={`block truncate text-[17px] font-semibold ${selected?'text-(--brand)':'text-(--ink)'}`}>{babyName(baby)}</span><span className="block truncate text-[13px] text-(--muted)">{babyAge(baby.birthday)}</span></span></button>;})}</div>
   {!multi?<div className="mt-2.5">{renderCard(babies[0],0)}</div>:<>
    <div ref={scroller} onScroll={onScroll} className="no-scrollbar relative -mx-5 mt-1.5 flex snap-x snap-mandatory items-start gap-3 overflow-x-auto overscroll-x-contain scroll-px-5 px-5 pb-5 pt-1" aria-roledescription="carousel" aria-label={tr('宝宝卡片，左右滑动切换','Baby cards, swipe to switch')}>
     {babies.map((baby,i)=><div key={baby.id} id={`baby-slide-${baby.id}`} role="tabpanel" aria-roledescription="slide" aria-label={tr(`${babyName(baby)}，第 ${i+1} 个，共 ${babies.length} 个`,`${babyName(baby)}, ${i+1} of ${babies.length}`)} className={`w-[calc(100%-28px)] shrink-0 snap-always ${i===babies.length-1?'snap-end':'snap-start'}`}>{renderCard(baby,i)}</div>)}
     <div aria-hidden className="w-2 shrink-0"/>
    </div>
    <div className="-mt-3 flex justify-center gap-1.5" aria-hidden>{babies.map((baby,i)=><span key={baby.id} className={`h-1.5 rounded-full transition-all ${i===current?'w-5 bg-(--brand)':'w-1.5 bg-(--faint)/60'}`}/>)}</div>
   </>}
  </div>}
 </div>;
}
