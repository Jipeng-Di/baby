'use client';

export const input='ui-input';
export const primary='ui-primary';
export const card='ui-card';

export function PageIntro({title}:{title:string}){return <header className="px-1"><h1 className="page-title">{title}</h1></header>;}
export function Alert({text,good=false}:{text:string;good?:boolean}){return <p role={good?'status':'alert'} className={`mt-4 rounded-2xl p-4 text-sm ${good?'bg-(--brand-pale) text-(--brand)':'bg-(--danger-pale) text-(--danger)'}`}>{text}</p>;}
