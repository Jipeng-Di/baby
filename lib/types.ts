export type FeedingType = 'formula' | 'breast_milk' | 'mixed';
export type Family = {id:string;name:string;created_by:string};
export type Baby = {id:string;family_id:string;name:string;nickname:string|null;birthday:string;is_active:boolean};
export type Feeding = {id:string;baby_id:string;family_id:string;created_by:string;amount_ml:number;feeding_type:FeedingType;fed_at:string;note:string|null;created_at:string;updated_at:string};
export type Member = {id:string;user_id:string;role:'owner'|'member';display_name?:string|null};
export const typeLabels: Record<FeedingType,string> = {formula:'配方奶',breast_milk:'母乳',mixed:'混合'};
export const babyName=(b:Baby)=>b.nickname?.trim()||b.name;
