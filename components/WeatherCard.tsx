'use client';
import {useCallback,useEffect,useState} from 'react';
import {Cloud,CloudDrizzle,CloudFog,CloudLightning,CloudMoon,CloudRain,CloudSnow,CloudSun,Droplets,LoaderCircle,MapPin,Moon,RefreshCw,Sun,Umbrella,Wind,type LucideIcon} from 'lucide-react';

type Weather={temp:number;feels:number;humidity:number;wind:number;code:number;isDay:boolean;max:number;min:number;rain:number|null;uv:number|null;place:string|null;fetchedAt:number};
type Status='idle'|'loading'|'ready'|'denied'|'error';
const CACHE_KEY='weather-cache-v1';
const ENABLED_KEY='weather-enabled';
const UNIT_KEY='weather-unit';
const FRESH_MS=30*60*1000;

const read=<T,>(key:string):T|null=>{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw) as T:null;}catch{return null;}};
const write=(key:string,value:unknown)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};

// WMO weather interpretation codes used by Open-Meteo.
function describe(code:number,isDay:boolean):{text:string;Icon:LucideIcon}{
 if(code===0)return {text:'晴',Icon:isDay?Sun:Moon};
 if(code===1)return {text:'晴间多云',Icon:isDay?CloudSun:CloudMoon};
 if(code===2)return {text:'多云',Icon:isDay?CloudSun:CloudMoon};
 if(code===3)return {text:'阴',Icon:Cloud};
 if(code===45||code===48)return {text:'雾',Icon:CloudFog};
 if(code>=51&&code<=57)return {text:'毛毛雨',Icon:CloudDrizzle};
 if(code===61)return {text:'小雨',Icon:CloudRain};
 if(code===63)return {text:'中雨',Icon:CloudRain};
 if(code===65)return {text:'大雨',Icon:CloudRain};
 if(code===66||code===67)return {text:'冻雨',Icon:CloudRain};
 if(code===71)return {text:'小雪',Icon:CloudSnow};
 if(code===73)return {text:'中雪',Icon:CloudSnow};
 if(code===75)return {text:'大雪',Icon:CloudSnow};
 if(code===77)return {text:'雪粒',Icon:CloudSnow};
 if(code>=80&&code<=82)return {text:'阵雨',Icon:CloudRain};
 if(code===85||code===86)return {text:'阵雪',Icon:CloudSnow};
 if(code===95)return {text:'雷阵雨',Icon:CloudLightning};
 if(code===96||code===99)return {text:'雷阵雨伴冰雹',Icon:CloudLightning};
 return {text:'—',Icon:Cloud};
}

function locate(){
 return new Promise<GeolocationPosition>((resolve,reject)=>{
  if(!('geolocation' in navigator)){reject(new Error('unsupported'));return;}
  navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:false,maximumAge:3*60*60*1000,timeout:15000});
 });
}

async function load():Promise<Weather>{
 const {coords}=await locate();
 // ~1 km precision is plenty for weather and avoids sending an exact location.
 const lat=coords.latitude.toFixed(2),lon=coords.longitude.toFixed(2);
 const url=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max&timezone=auto&forecast_days=1`;
 const [weatherRes,place]=await Promise.all([
  fetch(url),
  fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=zh`).then(r=>r.ok?r.json():null).then(j=>j?.city||j?.locality||j?.principalSubdivision||null).catch(()=>null),
 ]);
 if(!weatherRes.ok)throw new Error('weather');
 const data=await weatherRes.json();
 const c=data.current,d=data.daily;
 return {temp:c.temperature_2m,feels:c.apparent_temperature,humidity:c.relative_humidity_2m,wind:c.wind_speed_10m,code:c.weather_code,isDay:c.is_day===1,max:d.temperature_2m_max?.[0],min:d.temperature_2m_min?.[0],rain:d.precipitation_probability_max?.[0]??null,uv:d.uv_index_max?.[0]??null,place,fetchedAt:Date.now()};
}

export default function WeatherCard({now}:{now:number}){
 const [weather,setWeather]=useState<Weather|null>(null);
 const [status,setStatus]=useState<Status>('idle');
 const [fahrenheit,setFahrenheit]=useState(false);

 const refresh=useCallback(async()=>{
  setStatus('loading');
  try{const next=await load();setWeather(next);write(CACHE_KEY,next);write(ENABLED_KEY,true);setStatus('ready');}
  catch(e){const denied=typeof GeolocationPositionError!=='undefined'&&e instanceof GeolocationPositionError&&e.code===e.PERMISSION_DENIED;setStatus(denied?'denied':'error');if(denied)write(ENABLED_KEY,false);}
 },[]);

 useEffect(()=>{
  const cached=read<Weather>(CACHE_KEY);
  if(cached){setWeather(cached);setStatus('ready');}
  setFahrenheit(read<boolean>(UNIT_KEY)===true);
  if(read<boolean>(ENABLED_KEY)&&(!cached||Date.now()-cached.fetchedAt>FRESH_MS))void refresh();
 },[refresh]);

 // `now` ticks every 30s from the parent; refetch once the cached reading is stale.
 useEffect(()=>{
  if(status==='loading'||!weather||read<boolean>(ENABLED_KEY)!==true)return;
  if(now-weather.fetchedAt>FRESH_MS&&document.visibilityState==='visible')void refresh();
 },[now,weather,status,refresh]);

 const deg=(c:number)=>Math.round(fahrenheit?c*9/5+32:c);
 const toggleUnit=()=>{setFahrenheit(f=>{write(UNIT_KEY,!f);return !f;});};
 const date=new Date(now).toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'long'});

 return <section className="relative overflow-hidden rounded-[28px] border border-(--rim)/90 bg-gradient-to-br from-(--brand-pale) via-(--surface-2) to-(--warm-pale) px-5 py-4 shadow-[0_14px_34px_rgba(31,67,52,.08)]" aria-label="今日天气">
  <span className="absolute -right-5 -top-8 h-24 w-24 rounded-full bg-(--surface)/50"/>
  <div className="relative flex items-center justify-between gap-3 text-sm font-medium text-(--muted)">
   <span>{date}</span>
   {weather?.place&&<span className="flex min-w-0 items-center gap-1"><MapPin size={14} className="shrink-0"/><span className="truncate">{weather.place}</span></span>}
  </div>
  {weather?(()=>{const {text,Icon}=describe(weather.code,weather.isDay);return <>
   <div className="relative mt-2 flex items-center gap-3">
    <Icon size={44} strokeWidth={1.6} className="shrink-0 text-(--brand)"/>
    <button type="button" onClick={toggleUnit} className="flex items-start leading-none" aria-label={`当前 ${deg(weather.temp)} 度，点按切换${fahrenheit?'摄氏':'华氏'}`}><strong className="text-[44px] font-semibold tracking-tight text-(--ink)">{deg(weather.temp)}</strong><span className="mt-1 text-lg font-semibold text-(--muted)">°{fahrenheit?'F':'C'}</span></button>
    <div className="ml-auto text-right">
     <p className="text-lg font-semibold text-(--ink)">{text}</p>
     <p className="text-sm text-(--muted)">{deg(weather.max)}° / {deg(weather.min)}°</p>
     <p className="text-sm text-(--muted)">体感 {deg(weather.feels)}°</p>
    </div>
   </div>
   <div className="relative mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-(--ink-2)">
    <span className="flex items-center gap-1"><Droplets size={14} className="text-(--soft)"/>湿度 {Math.round(weather.humidity)}%</span>
    <span className="flex items-center gap-1"><Wind size={14} className="text-(--soft)"/>风 {Math.round(fahrenheit?weather.wind/1.609:weather.wind)} {fahrenheit?'mph':'km/h'}</span>
    {weather.rain!==null&&<span className="flex items-center gap-1"><Umbrella size={14} className="text-(--soft)"/>降水 {Math.round(weather.rain)}%</span>}
    {weather.uv!==null&&<span className="flex items-center gap-1"><Sun size={14} className="text-(--soft)"/>紫外线 {Math.round(weather.uv)}</span>}
    <button type="button" onClick={()=>void refresh()} disabled={status==='loading'} className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-(--soft)" aria-label="刷新天气">{status==='loading'?<LoaderCircle size={15} className="animate-spin"/>:<RefreshCw size={15}/>}</button>
   </div>
   {status==='denied'&&<p className="relative mt-2 text-xs text-(--muted)">无法获取定位，显示的是上次的天气。</p>}
  </>;})():<div className="relative mt-3">
   {status==='loading'?<p className="flex items-center gap-2 py-3 text-(--muted)"><LoaderCircle size={18} className="animate-spin"/>正在获取天气…</p>
   :status==='denied'?<p className="py-2 text-sm leading-relaxed text-(--muted)">没有定位权限，无法显示天气。可在手机“设置”中允许浏览器或“奶记”使用位置，然后<button type="button" className="font-semibold text-(--brand)" onClick={()=>void refresh()}>重试</button>。</p>
   :<button type="button" onClick={()=>void refresh()} className="flex min-h-12 items-center gap-2 rounded-2xl bg-(--surface)/70 px-4 font-semibold text-(--brand)"><MapPin size={18}/>{status==='error'?'天气获取失败，点此重试':'显示当地天气'}</button>}
  </div>}
 </section>;
}
