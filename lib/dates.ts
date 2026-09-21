export function localDay(d=new Date()){const x=new Date(d);x.setHours(0,0,0,0);return x;}
export function dayKey(d:Date){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function datetimeLocal(iso:string){const d=new Date(iso);return `${dayKey(d)}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;}
export function dateLabel(iso:string){return new Date(iso).toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'short'});}
export function timeLabel(iso:string){return new Date(iso).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false});}
export function elapsed(iso:string){const mins=Math.max(0,Math.floor((Date.now()-new Date(iso).getTime())/60000));return mins<60?`${mins} 分钟`: `${Math.floor(mins/60)} 小时 ${mins%60} 分钟`;}
export function babyAge(birthday:string,today=new Date()){
 const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(birthday);
 if(!match)return '';
 const birth={year:Number(match[1]),month:Number(match[2]),day:Number(match[3])};
 const end={year:today.getFullYear(),month:today.getMonth()+1,day:today.getDate()};
 const serial=(d:{year:number;month:number;day:number})=>Date.UTC(d.year,d.month-1,d.day);
 const daysIn=(year:number,month:number)=>new Date(year,month,0).getDate();
 const addMonths=(months:number)=>{const total=birth.year*12+birth.month-1+months;const year=Math.floor(total/12);const month=total%12+1;return {year,month,day:Math.min(birth.day,daysIn(year,month))};};
 if(serial(end)<serial(birth))return '0个月0天';
 let totalMonths=(end.year-birth.year)*12+(end.month-birth.month);
 if(serial(addMonths(totalMonths))>serial(end))totalMonths--;
 const cursor=addMonths(totalMonths);
 const days=Math.floor((serial(end)-serial(cursor))/86400000);
 const years=Math.floor(totalMonths/12);const months=totalMonths%12;
 return years>0?`${years}岁${months}个月${days}天`:`${months}个月${days}天`;
}
