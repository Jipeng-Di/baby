'use client';
import {useEffect,useMemo,useState} from 'react';
import {CartesianGrid,ComposedChart,Legend,Line,ResponsiveContainer,Scatter,Tooltip,XAxis,YAxis} from 'recharts';
import {Plus,Scale,TriangleAlert,Trash2} from 'lucide-react';
import type {Baby,BabySex,GrowthMeasurement} from '@/lib/types';
import {babyName} from '@/lib/types';
import {gestationLabel,growthAge,growthPercentile,metricInfo,percentileDrift,percentileLabel,whoGrowthRows,zScore,type GrowthDrift,type GrowthMetric} from '@/lib/who-growth';
import {dayKey} from '@/lib/dates';
import {chartPalette,useDarkMode} from '@/lib/theme';

const input='ui-input';
const card='ui-card';
const primary='ui-primary';
const sexLabels:Record<BabySex,string>={female:'女孩',male:'男孩'};
const metrics:GrowthMetric[]=['weight','length','head'];
const column:Record<GrowthMetric,'weight_kg'|'length_cm'|'head_cm'>={weight:'weight_kg',length:'length_cm',head:'head_cm'};
export type GrowthValues={weight:string;length:string;head:string};
type Props={babies:Baby[];measurements:GrowthMeasurement[];busy:boolean;onAdd:(baby:Baby,values:GrowthValues,date:string,note:string)=>Promise<boolean>;onDelete:(item:GrowthMeasurement)=>Promise<void>;onSetSex:(baby:Baby,sex:BabySex)=>Promise<void>};
type GrowthPoint={month:number;value:number;date:string;percentile:number|null;note:string|null};
type PointShapeProps={cx?:number;cy?:number;payload?:GrowthPoint};

export function formatGrowthValue(metric:GrowthMetric,value:number){return metric==='weight'?value.toFixed(2).replace(/0+$/,'').replace(/\.$/,''):value.toFixed(1).replace(/\.0$/,'');}
function formatAge(months:number){return months<1?`${Math.max(1,Math.round(months*30.4375))} 天`:`${months.toFixed(1).replace(/\.0$/,'')} 个月`;}
const valueOf=(item:GrowthMeasurement,metric:GrowthMetric)=>{const raw=item[column[metric]];return raw===null||raw===undefined?null:Number(raw);};
function summary(item:GrowthMeasurement){return metrics.flatMap(metric=>{const value=valueOf(item,metric);return value===null?[]:[`${metricInfo[metric].label} ${formatGrowthValue(metric,value)} ${metricInfo[metric].unit}`];}).join(' · ');}
const shortDate=(date:string)=>date.slice(5).replace('-','/');
function driftText(drift:GrowthDrift){return `${metricInfo[drift.metric].label}：从 ${drift.from}（${shortDate(drift.fromDate)}）${drift.direction==='down'?'下降':'上升'}到 ${drift.to}（${shortDate(drift.toDate)}），跨过了 2 条主要百分位线。`;}

export default function GrowthView({babies,measurements,busy,onAdd,onDelete,onSetSex}:Props){
 const palette=chartPalette(useDarkMode());
 const [babyId,setBabyId]=useState(babies[0]?.id??'');const [metric,setMetric]=useState<GrowthMetric>('weight');
 const [values,setValues]=useState<GrowthValues>({weight:'',length:'',head:''});const [date,setDate]=useState(dayKey(new Date()));const [note,setNote]=useState('');const [selectedPoint,setSelectedPoint]=useState<GrowthPoint|null>(null);
 useEffect(()=>{if(!babies.some(b=>b.id===babyId))setBabyId(babies[0]?.id??'');},[babies,babyId]);
 const baby=babies.find(b=>b.id===babyId)||babies[0];
 const gestation=baby?.gestational_age_days??null;
 const info=metricInfo[metric];
 const items=useMemo(()=>measurements.filter(m=>m.baby_id===baby?.id).sort((a,b)=>b.measured_at.localeCompare(a.measured_at)),[measurements,baby?.id]);
 const {points,beforeTerm}=useMemo(()=>{
  const result:GrowthPoint[]=[];let skipped=0;
  if(baby)for(const m of [...items].reverse()){
   const value=valueOf(m,metric);if(value===null)continue;
   const month=Number(growthAge(baby.birthday,m.measured_at,gestation).months.toFixed(2));
   if(month<0){skipped++;continue;}if(month>60)continue;
   result.push({month,value,date:m.measured_at,percentile:baby.sex?growthPercentile(metric,baby.sex,month,value):null,note:m.note});
  }
  return {points:result,beforeTerm:skipped};
 },[baby,items,metric,gestation]);
 const drifts=useMemo(()=>{
  if(!baby?.sex)return [];const sex=baby.sex;
  return metrics.flatMap(k=>{
   const series=items.flatMap(m=>{const value=valueOf(m,k);if(value===null)return [];const age=growthAge(baby.birthday,m.measured_at,gestation);const z=zScore(k,sex,age.months,value);return z===null?[]:[{months:age.months,z,date:m.measured_at}];});
   const drift=percentileDrift(k,series);return drift?[drift]:[];
  });
 },[baby,items,gestation]);
 const today=baby?growthAge(baby.birthday,dayKey(new Date()),gestation):null;
 const chartMax=useMemo(()=>{if(!today)return 3;const observed=points.length?Math.max(...points.map(point=>point.month)):0;const needed=Math.max(today.months,observed)+1;return Math.min(60,needed<=12?Math.max(3,Math.ceil(needed)):Math.ceil(needed/6)*6);},[today,points]);
 const rows=useMemo(()=>baby?.sex?whoGrowthRows(metric,baby.sex,chartMax):[],[baby,metric,chartMax]);
 const yAxis=useMemo(()=>{
  const all=[...rows.flatMap(row=>[row.p3,row.p97]),...points.map(point=>point.value)];if(!all.length)return {domain:[0,20],ticks:[0,5,10,15,20]};
  const low=Math.min(...all),high=Math.max(...all);const step=[1,2,5,10,20].find(n=>(high-low)/n<=5)??20;
  const start=Math.max(0,Math.floor(low/step)*step-(low%step<step/4?step:0));const end=Math.ceil(high/step)*step;
  const ticks:number[]=[];for(let t=start;t<=end+1e-9;t+=step)ticks.push(t);return {domain:[start,end],ticks};
 },[rows,points]);
 const pointRadius=points.length<=12?7:points.length<=30?6:5;
 const latest=points[points.length-1];
 const hasValue=!!(values.weight||values.length||values.head);
 if(!babies.length)return <div className={`${card} py-9 text-center`}><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-(--brand-pale)"><Plus className="text-(--brand)"/></div><p className="mt-4 text-(--muted)">添加宝宝后即可记录生长数据。</p></div>;
 return <>
  <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1" aria-label="选择宝宝">{babies.map(b=><button key={b.id} aria-pressed={baby?.id===b.id} className={`min-h-11 shrink-0 rounded-full px-5 font-semibold ${baby?.id===b.id?'bg-(--brand-solid) text-white':'border border-(--line) bg-(--surface) text-(--muted)'}`} onClick={()=>{setBabyId(b.id);setSelectedPoint(null);}}>{babyName(b)}</button>)}</div>
  {!baby?.sex?<section className={card}><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-(--brand-pale)"><Scale className="text-(--brand)"/></div><h2 className="mt-4 text-xl font-semibold">先选择 {babyName(baby)} 的性别</h2><p className="mt-2 text-sm leading-relaxed text-(--muted)">WHO 生长标准按男孩和女孩分别计算。选择后会保存到宝宝资料中。</p><div className="mt-5 grid grid-cols-2 gap-3">{(['female','male'] as BabySex[]).map(sex=><button key={sex} className="min-h-14 rounded-2xl border border-(--brand) bg-(--brand-pale) font-semibold text-(--brand)" disabled={busy} onClick={()=>onSetSex(baby,sex)}>{sexLabels[sex]}</button>)}</div></section>:<>
   {drifts.length>0&&<section role="status" className="rounded-[22px] border border-(--alert)/35 bg-(--alert-pale) p-4">
    <p className="flex items-center gap-2 font-semibold text-(--alert)"><TriangleAlert size={18}/>值得留意的生长趋势</p>
    <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-(--ink-2)">{drifts.map(d=><li key={d.metric}>{driftText(d)}</li>)}</ul>
    <p className="mt-2 text-xs leading-relaxed text-(--muted)">仅供参考，不是诊断。单次测量可能有误差，建议复测确认；如果趋势持续，请咨询儿科医生。</p>
   </section>}
   <div className="flex rounded-[18px] border border-(--rim)/80 bg-(--chip)/80 p-1.5 shadow-inner" role="group" aria-label="生长指标">{metrics.map(k=><button key={k} aria-pressed={metric===k} className={`min-h-11 flex-1 rounded-[14px] font-semibold transition ${metric===k?'bg-(--paper) text-(--brand) shadow-[0_3px_12px_rgba(30,67,52,.09)]':'text-(--muted)'}`} onClick={()=>{setMetric(k);setSelectedPoint(null);}}>{metricInfo[k].label}</button>)}</div>
   <section className={card}><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-(--muted)">{babyName(baby)} · {sexLabels[baby.sex]}{today?.corrected?' · 矫正月龄':''}</p><h2 className="mt-1 text-xl font-semibold">{info.title}</h2></div>{latest&&latest.percentile!==null?<span className="shrink-0 rounded-full bg-(--brand-pale) px-3 py-2 text-sm font-semibold text-(--brand)">{percentileLabel(latest.percentile)}</span>:null}</div>
    {latest?<div className="mt-5 flex items-end gap-2"><strong className="text-4xl tracking-tight">{formatGrowthValue(metric,latest.value)}</strong><span className="pb-1 text-(--muted)">{info.unit} · {latest.date.replaceAll('-','/')}</span></div>:<p className="mt-4 text-sm text-(--muted)">添加第一条{info.label}记录后，记录点会显示在曲线上。</p>}
    <div className="mt-5 h-80 w-full" role="img" aria-label={`${babyName(baby)}的${info.title}曲线`}><ResponsiveContainer width="100%" height="100%"><ComposedChart data={rows} margin={{top:12,right:8,left:-10,bottom:8}}><CartesianGrid vertical={false} stroke={palette.grid}/><XAxis dataKey="month" type="number" domain={[0,chartMax]} tickCount={Math.min(chartMax+1,7)} allowDecimals={false} tick={{fontSize:11,fill:palette.tick}} tickLine={false} axisLine={false} unit="月"/><YAxis type="number" dataKey="value" domain={yAxis.domain} ticks={yAxis.ticks} interval={0} tick={{fontSize:11,fill:palette.tick}} tickLine={false} axisLine={false} unit={info.unit}/><Tooltip contentStyle={palette.tooltip} labelFormatter={v=>`${Number(v).toFixed(1)} 个月`} formatter={(v,n)=>[`${Number(v).toFixed(1)} ${info.unit}`,n]}/><Legend wrapperStyle={{fontSize:12}}/><Line dataKey="p3" name="P3" stroke={palette.p3} strokeWidth={1.5} dot={false} isAnimationActive={false}/><Line dataKey="p15" name="P15" stroke={palette.p15} strokeWidth={1.5} dot={false} isAnimationActive={false}/><Line dataKey="p50" name="P50" stroke={palette.brand} strokeWidth={2.5} dot={false} isAnimationActive={false}/><Line dataKey="p85" name="P85" stroke={palette.p15} strokeWidth={1.5} dot={false} isAnimationActive={false}/><Line dataKey="p97" name="P97" stroke={palette.p3} strokeWidth={1.5} dot={false} isAnimationActive={false}/><Scatter data={points} dataKey="value" name={`${info.label}记录`} fill={palette.point} line={{stroke:palette.point,strokeWidth:2}} isAnimationActive={false} shape={(shapeProps:unknown)=>{const{cx=0,cy=0,payload}=shapeProps as PointShapeProps;if(!payload)return<g/>;const select=()=>setSelectedPoint(payload);return <g role="button" tabIndex={0} aria-label={`${payload.date}，${formatGrowthValue(metric,payload.value)}${info.unit}`} className="cursor-pointer outline-none" onClick={select} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select();}}}><circle cx={cx} cy={cy} r={14} fill="transparent"/><circle cx={cx} cy={cy} r={selectedPoint?.date===payload.date?pointRadius+2:pointRadius} fill={palette.point} stroke={palette.surface} strokeWidth={3}/></g>;}}/></ComposedChart></ResponsiveContainer></div>
    {selectedPoint&&<div className="mt-3 rounded-2xl border border-(--warm-line) bg-(--warm-pale) px-4 py-3" role="status"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-(--warm-ink)">{selectedPoint.date.replaceAll('-','/')} · {today?.corrected?'矫正':''}月龄 {formatAge(selectedPoint.month)}</p><p className="mt-1 text-sm text-(--warm-ink)">{selectedPoint.note||`${info.label}记录`}</p></div><div className="shrink-0 text-right"><strong className="text-xl text-(--warm-ink)">{formatGrowthValue(metric,selectedPoint.value)} {info.unit}</strong><p className="text-sm font-semibold text-(--warm-ink)">{selectedPoint.percentile===null?'暂无百分位':percentileLabel(selectedPoint.percentile)}</p></div></div></div>}
    {today?.corrected&&gestation&&<p className="mt-3 rounded-2xl bg-(--surface-2) px-4 py-3 text-xs leading-relaxed text-(--ink-2)">出生孕周 {gestationLabel(gestation)}，曲线和百分位按矫正月龄计算（实际月龄减去提前出生的 {Math.floor((280-gestation)/7)} 周 {(280-gestation)%7} 天），满 24 个月后自动停止矫正。{beforeTerm>0?`有 ${beforeTerm} 条记录早于预产期，不在曲线上显示。`:''}</p>}
    <p className="mt-2 text-xs leading-relaxed text-(--soft)">横轴为{today?.corrected?'矫正':''}月龄，P50 是同龄宝宝的中位数。曲线采用 WHO 0–5 岁{info.label}年龄标准{metric==='length'?'（24 个月前为躺着量的身长，之后为站立身高）':''}；P3–P97 为常用参考区间，单次百分位不能代替医生对连续生长趋势的判断。{!gestation?'早产宝宝可在“家庭”页填写出生孕周，按矫正月龄计算。':''}</p>
   </section>
   <section className={card}><h2 className="text-xl font-semibold">记录生长数据</h2><p className="mt-1 text-sm text-(--muted)">三项不必同时填写，至少填一项。</p>
    <div className="mt-4 grid grid-cols-3 gap-2">{metrics.map(k=><label key={k} className="text-sm font-medium">{metricInfo[k].label} · {metricInfo[k].unit}<input className={`${input} mt-2 px-3`} type="number" inputMode="decimal" enterKeyHint="done" min={k==='weight'?0.5:k==='length'?20:18} max={k==='weight'?80:k==='length'?130:60} step={k==='weight'?0.01:0.1} placeholder={k==='weight'?'6.25':k==='length'?'62.5':'40.5'} value={values[k]} onChange={e=>setValues(current=>({...current,[k]:e.target.value}))}/></label>)}</div>
    <div className="mt-4 grid grid-cols-2 gap-3"><label className="text-sm font-medium">测量日期<input className={`${input} mt-2`} type="date" min={baby.birthday} max={dayKey(new Date())} value={date} onChange={e=>setDate(e.target.value)}/></label><label className="text-sm font-medium">备注（可选）<input className={`${input} mt-2`} maxLength={500} placeholder="例如：体检" value={note} onChange={e=>setNote(e.target.value)}/></label></div>
    <button className={`${primary} mt-5`} disabled={busy||!hasValue||!date} onClick={async()=>{if(await onAdd(baby,values,date,note)){setValues({weight:'',length:'',head:''});setNote('');}}}>{busy?'保存中…':'保存记录'}</button>
   </section>
   <section className={card}><h2 className="text-xl font-semibold">生长记录</h2>{items.length?<div className="mt-3 divide-y divide-(--chip)">{items.map(item=><div key={item.id} className="flex min-h-16 items-center gap-3 py-2"><div className="min-w-0 flex-1"><p className="font-semibold">{item.measured_at.replaceAll('-','/')}</p><p className="text-sm text-(--ink-2)">{summary(item)}</p>{item.note&&<p className="truncate text-sm text-(--soft)">{item.note}</p>}</div><button className="flex h-11 w-11 items-center justify-center rounded-full text-(--danger)" aria-label={`删除 ${item.measured_at} 的生长记录`} disabled={busy} onClick={()=>onDelete(item)}><Trash2 size={18}/></button></div>)}</div>:<p className="mt-3 text-sm text-(--muted)">还没有生长记录。</p>}</section>
  </>}
 </>;
}
