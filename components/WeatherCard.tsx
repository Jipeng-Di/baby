'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {getLang,locale,tr,useLang} from '@/lib/i18n';
import {Cloud,CloudDrizzle,CloudFog,CloudLightning,CloudMoon,CloudRain,CloudSnow,CloudSun,Droplets,LoaderCircle,MapPin,Moon,RefreshCw,Sun,Umbrella,Wind,type LucideIcon} from 'lucide-react';

type Weather={temp:number;feels:number;humidity:number;wind:number;code:number;isDay:boolean;max:number;min:number;rain:number|null;uv:number|null;place:string|null;placeLang?:string;fetchedAt:number};
type Status='idle'|'loading'|'ready'|'denied'|'error';
const CACHE_KEY='weather-cache-v1';
const ENABLED_KEY='weather-enabled';
const UNIT_KEY='weather-unit';
const FRESH_MS=30*60*1000;

const read=<T,>(key:string):T|null=>{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw) as T:null;}catch{return null;}};
const write=(key:string,value:unknown)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};

// WMO weather interpretation codes used by Open-Meteo.
function describe(code:number,isDay:boolean):{text:string;Icon:LucideIcon}{
 if(code===0)return {text:tr('晴','Clear'),Icon:isDay?Sun:Moon};
 if(code===1)return {text:tr('晴间多云','Mostly clear'),Icon:isDay?CloudSun:CloudMoon};
 if(code===2)return {text:tr('多云','Partly cloudy'),Icon:isDay?CloudSun:CloudMoon};
 if(code===3)return {text:tr('阴','Overcast'),Icon:Cloud};
 if(code===45||code===48)return {text:tr('雾','Fog'),Icon:CloudFog};
 if(code>=51&&code<=57)return {text:tr('毛毛雨','Drizzle'),Icon:CloudDrizzle};
 if(code===61)return {text:tr('小雨','Light rain'),Icon:CloudRain};
 if(code===63)return {text:tr('中雨','Rain'),Icon:CloudRain};
 if(code===65)return {text:tr('大雨','Heavy rain'),Icon:CloudRain};
 if(code===66||code===67)return {text:tr('冻雨','Freezing rain'),Icon:CloudRain};
 if(code===71)return {text:tr('小雪','Light snow'),Icon:CloudSnow};
 if(code===73)return {text:tr('中雪','Snow'),Icon:CloudSnow};
 if(code===75)return {text:tr('大雪','Heavy snow'),Icon:CloudSnow};
 if(code===77)return {text:tr('雪粒','Snow grains'),Icon:CloudSnow};
 if(code>=80&&code<=82)return {text:tr('阵雨','Showers'),Icon:CloudRain};
 if(code===85||code===86)return {text:tr('阵雪','Snow showers'),Icon:CloudSnow};
 if(code===95)return {text:tr('雷阵雨','Thunderstorm'),Icon:CloudLightning};
 if(code===96||code===99)return {text:tr('雷阵雨伴冰雹','Thunderstorm with hail'),Icon:CloudLightning};
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
  fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=${getLang()}`).then(r=>r.ok?r.json():null).then(j=>j?.city||j?.locality||j?.principalSubdivision||null).catch(()=>null),
 ]);
 if(!weatherRes.ok)throw new Error('weather');
 const data=await weatherRes.json();
 const c=data.current,d=data.daily;
 return {temp:c.temperature_2m,feels:c.apparent_temperature,humidity:c.relative_humidity_2m,wind:c.wind_speed_10m,code:c.weather_code,isDay:c.is_day===1,max:d.temperature_2m_max?.[0],min:d.temperature_2m_min?.[0],rain:d.precipitation_probability_max?.[0]??null,uv:d.uv_index_max?.[0]??null,place,placeLang:getLang(),fetchedAt:Date.now()};
}

export default function WeatherCard({now}:{now:number}){
 const [weather,setWeather]=useState<Weather|null>(null);
 const [status,setStatus]=useState<Status>('idle');
 const [fahrenheit,setFahrenheit]=useState(false);
 const lastAttempt=useRef(0);
 const lang=useLang();

 const refresh=useCallback(async()=>{
  lastAttempt.current=Date.now();setStatus('loading');
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
  // Retry at most every 5 minutes so an offline phone doesn't hammer the API.
  if(now-weather.fetchedAt>FRESH_MS&&now-lastAttempt.current>5*60*1000&&document.visibilityState==='visible')void refresh();
 },[now,weather,status,refresh]);

 // The city name comes back in the requested language, so refetch after switching languages.
 useEffect(()=>{
  if(status!=='ready'||!weather||(weather.placeLang??'zh')===lang||read<boolean>(ENABLED_KEY)!==true)return;
  void refresh();
 },[lang,weather,status,refresh]);

 const deg=(c:number)=>Math.round(fahrenheit?c*9/5+32:c);
 const toggleUnit=()=>{setFahrenheit(f=>{write(UNIT_KEY,!f);return !f;});};
 const date=new Date(now).toLocaleDateString(locale(),{month:'long',day:'numeric',weekday:'long'});

 return <section className="relative overflow-hidden rounded-[22px] border border-(--rim)/90 bg-gradient-to-br from-(--brand-pale) via-(--surface-2) to-(--warm-pale) px-4 py-2.5 shadow-[0_14px_34px_rgba(31,67,52,.08)]" aria-label={tr('今日天气','Today’s weather')}>
  <span className="absolute -right-5 -top-8 h-24 w-24 rounded-full bg-(--surface)/50"/>
  <div className="relative flex items-center justify-between gap-3 text-xs font-medium text-(--muted)">
   <span>{date}</span>
   {weather&&<span className="-my-1.5 -mr-1.5 flex min-w-0 items-center gap-1">{weather.place&&<><MapPin size={12} className="shrink-0"/><span className="truncate">{weather.place}</span></>}<button type="button" onClick={()=>void refresh()} disabled={status==='loading'} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-(--soft)" aria-label={tr('刷新天气','Refresh weather')}>{status==='loading'?<LoaderCircle size={13} className="animate-spin"/>:<RefreshCw size={13}/>}</button></span>}
  </div>
  {weather?(()=>{const {text,Icon}=describe(weather.code,weather.isDay);return <>
   <div className="relative mt-1 flex items-center gap-2.5">
    <Icon size={30} strokeWidth={1.6} className="shrink-0 text-(--brand)"/>
    <button type="button" onClick={toggleUnit} className="flex items-start leading-none" aria-label={tr(`当前 ${deg(weather.temp)} 度，点按切换${fahrenheit?'摄氏':'华氏'}`,`Now ${deg(weather.temp)} degrees. Tap to switch to ${fahrenheit?'Celsius':'Fahrenheit'}`)}><strong className="text-[30px] font-semibold tracking-tight text-(--ink)">{deg(weather.temp)}</strong><span className="mt-0.5 text-sm font-semibold text-(--muted)">°{fahrenheit?'F':'C'}</span></button>
    <div className="ml-auto text-right leading-tight">
     <p className="text-[15px] font-semibold text-(--ink)">{text}</p>
     <p className="text-xs text-(--muted)">{deg(weather.max)}° / {deg(weather.min)}° · {tr('体感','Feels')} {deg(weather.feels)}°</p>
    </div>
   </div>
   <div className="relative mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-(--ink-2)">
    <span className="flex items-center gap-1"><Droplets size={12} className="text-(--soft)"/>{tr('湿度','Humidity')} {Math.round(weather.humidity)}%</span>
    <span className="flex items-center gap-1"><Wind size={12} className="text-(--soft)"/>{tr('风','Wind')} {Math.round(fahrenheit?weather.wind/1.609:weather.wind)} {fahrenheit?'mph':'km/h'}</span>
    {weather.rain!==null&&<span className="flex items-center gap-1"><Umbrella size={12} className="text-(--soft)"/>{tr('降水','Rain')} {Math.round(weather.rain)}%</span>}
    {weather.uv!==null&&<span className="flex items-center gap-1"><Sun size={12} className="text-(--soft)"/>{tr('紫外线','UV')} {Math.round(weather.uv)}</span>}
   </div>
   {status==='denied'&&<p className="relative mt-2 text-xs text-(--muted)">{tr('无法获取定位，显示的是上次的天气。','Can’t get your location. Showing the last weather.')}</p>}
  </>;})():<div className="relative mt-3">
   {status==='loading'?<p className="flex items-center gap-2 py-3 text-(--muted)"><LoaderCircle size={18} className="animate-spin"/>{tr('正在获取天气…','Getting weather…')}</p>
   :status==='denied'?<p className="py-2 text-sm leading-relaxed text-(--muted)">{tr('没有定位权限，无法显示天气。可在手机“设置”中允许浏览器或“奶记”使用位置，然后','Location access is off, so weather can’t be shown. Allow location for your browser or this app in your phone’s Settings, then ')}<button type="button" className="font-semibold text-(--brand)" onClick={()=>void refresh()}>{tr('重试','try again')}</button>{tr('。','.')}</p>
   :<button type="button" onClick={()=>void refresh()} className="flex min-h-12 items-center gap-2 rounded-2xl bg-(--surface)/70 px-4 font-semibold text-(--brand)"><MapPin size={18}/>{status==='error'?tr('天气获取失败，点此重试','Couldn’t load weather. Tap to retry'):tr('显示当地天气','Show local weather')}</button>}
  </div>}
 </section>;
}
