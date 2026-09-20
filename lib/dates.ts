export function localDay(d=new Date()){const x=new Date(d);x.setHours(0,0,0,0);return x;}
export function dayKey(d:Date){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function datetimeLocal(iso:string){const d=new Date(iso);return `${dayKey(d)}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;}
export function dateLabel(iso:string){return new Date(iso).toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'short'});}
export function timeLabel(iso:string){return new Date(iso).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false});}
export function elapsed(iso:string){const mins=Math.max(0,Math.floor((Date.now()-new Date(iso).getTime())/60000));return mins<60?`${mins} 分钟`: `${Math.floor(mins/60)} 小时 ${mins%60} 分钟`;}
