import {Baby as BabyIcon} from 'lucide-react';
import {babyName,type Baby} from '@/lib/types';
import {tr} from '@/lib/i18n';

export default function BabyAvatar({baby,url,small=false,tone='green',featured=false,onTint=false}:{baby:Baby;url?:string;small?:boolean;tone?:'green'|'warm';featured?:boolean;onTint?:boolean}){
 const size=small?'h-11 w-11 rounded-xl':featured?'h-14 w-14 rounded-[20px]':'h-12 w-12 rounded-2xl';
 const ring=featured?'ring-4 ring-(--surface) shadow-[0_5px_14px_rgba(35,67,54,.14)]':'';
 if(url)return <img src={url} alt={tr(`${babyName(baby)}的头像`,`${babyName(baby)}’s photo`)} className={`${size} ${ring} shrink-0 object-cover`}/>;
 return <div className={`flex ${size} ${ring} shrink-0 items-center justify-center ${onTint?'bg-(--surface)':tone==='warm'?'bg-(--warm-pale)':'bg-(--brand-pale)'} ${tone==='warm'?'text-(--warm-ink)':'text-(--brand)'}`}><BabyIcon size={small?22:featured?27:24}/></div>;
}
