import {Baby as BabyIcon} from 'lucide-react';
import {babyName,type Baby} from '@/lib/types';

export default function BabyAvatar({baby,url,small=false,tone='green',featured=false}:{baby:Baby;url?:string;small?:boolean;tone?:'green'|'warm';featured?:boolean}){
 const size=small?'h-11 w-11 rounded-xl':featured?'h-14 w-14 rounded-[20px]':'h-12 w-12 rounded-2xl';
 const ring=featured?'ring-4 ring-(--surface) shadow-[0_5px_14px_rgba(35,67,54,.14)]':'';
 if(url)return <img src={url} alt={`${babyName(baby)}的头像`} className={`${size} ${ring} shrink-0 object-cover`}/>;
 return <div className={`flex ${size} ${ring} shrink-0 items-center justify-center ${tone==='warm'?'bg-(--warm-pale) text-(--warm-ink)':'bg-(--brand-pale) text-(--brand)'}`}><BabyIcon size={small?22:featured?27:24}/></div>;
}
