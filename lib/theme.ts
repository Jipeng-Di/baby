'use client';
import {useEffect,useState} from 'react';

export function useDarkMode(){
 const [dark,setDark]=useState(false);
 useEffect(()=>{
  const media=window.matchMedia('(prefers-color-scheme: dark)');
  const update=()=>setDark(media.matches);
  update();
  media.addEventListener('change',update);
  return()=>media.removeEventListener('change',update);
 },[]);
 return dark;
}

// SVG chart attributes can't reliably read CSS variables, so charts get concrete colors per scheme.
export function chartPalette(dark:boolean){
 return dark?{
  series:['#5fc59c','#f0a86e','#8fa0e6','#d39cc4','#c3c75e'],
  grid:'#2e3b35',tick:'#8fa39a',brand:'#5fc59c',p3:'#4a5f55',p15:'#6c877a',
  point:'#f08a5d',surface:'#1a2420',
  tooltip:{background:'#1f2a26',border:'1px solid #2e3b35',borderRadius:12,color:'#e7efea'},
 }:{
  series:['#13795b','#e39b61','#6c7ec7','#b77ca7','#a1a537'],
  grid:'#e9efeb',tick:'#789087',brand:'#13795b',p3:'#b8c5bd',p15:'#86a293',
  point:'#e07b52',surface:'#ffffff',
  tooltip:{background:'#ffffff',border:'1px solid #dce5df',borderRadius:12,color:'#18312b'},
 };
}
