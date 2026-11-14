export type FeedingType = 'formula' | 'breast_milk' | 'mixed';
export type BabySex = 'female' | 'male';
export type Family = {id:string;name:string;family_code:string;created_by:string};
export type Baby = {id:string;family_id:string;name:string;nickname:string|null;birthday:string;sex:BabySex|null;avatar_path:string|null;is_active:boolean;gestational_age_days?:number|null};
export type Feeding = {id:string;baby_id:string;family_id:string;created_by:string;amount_ml:number|null;feeding_type:FeedingType;fed_at:string;note:string|null;created_at:string;updated_at:string};
export type GrowthMeasurement = {id:string;baby_id:string;family_id:string;recorded_by:string;weight_kg:number|null;length_cm:number|null;head_cm:number|null;measured_at:string;note:string|null;created_at:string;updated_at:string};
export type Member = {id:string;user_id:string;role:'owner'|'member';display_name?:string|null};
import {tr} from './i18n';
// Getters so the label follows the current language each time it is read.
export const typeLabels: Record<FeedingType,string> = {get formula(){return tr('配方奶','Formula');},get breast_milk(){return tr('母乳','Breast milk');},get mixed(){return tr('混合','Mixed');}};
export const babyName=(b:Baby)=>b.nickname?.trim()||b.name;
