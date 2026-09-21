'use client';

import {useMemo,useRef,useState} from 'react';
import {Minus,Plus,X} from 'lucide-react';

const SIZE=280;
type Point={x:number;y:number};
type Dimensions={width:number;height:number};

function clamp(point:Point,width:number,height:number):Point{
 return {
  x:Math.max(-(width-SIZE)/2,Math.min((width-SIZE)/2,point.x)),
  y:Math.max(-(height-SIZE)/2,Math.min((height-SIZE)/2,point.y)),
 };
}

export default function AvatarCropper({src,name,busy,uploadError,onCancel,onConfirm}:{src:string;name:string;busy:boolean;uploadError?:string;onCancel:()=>void;onConfirm:(file:File)=>Promise<void>}){
 const image=useRef<HTMLImageElement>(null);
 const drag=useRef<{x:number;y:number;offset:Point}|null>(null);
 const [natural,setNatural]=useState<Dimensions>({width:0,height:0});
 const [zoom,setZoom]=useState(1);
 const [offset,setOffset]=useState<Point>({x:0,y:0});
 const [processingError,setProcessingError]=useState('');
 const baseScale=useMemo(()=>natural.width&&natural.height?Math.max(SIZE/natural.width,SIZE/natural.height):1,[natural]);
 const display=useMemo(()=>({width:natural.width*baseScale*zoom,height:natural.height*baseScale*zoom}),[natural,baseScale,zoom]);

 async function crop(){
  const img=image.current;
  if(!img||!natural.width)return;
  setProcessingError('');
  try{
   const scale=baseScale*zoom;
   const sourceSize=SIZE/scale;
   const sx=(natural.width-sourceSize)/2-offset.x/scale;
   const sy=(natural.height-sourceSize)/2-offset.y/scale;
   const canvas=document.createElement('canvas');
   canvas.width=512;canvas.height=512;
   const context=canvas.getContext('2d');
   if(!context)throw new Error('无法处理这张图片。');
   context.drawImage(img,sx,sy,sourceSize,sourceSize,0,0,512,512);
   const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('无法生成头像图片。')),'image/jpeg',.9));
   await onConfirm(new File([blob],'baby-avatar.jpg',{type:'image/jpeg'}));
  }catch(e){setProcessingError(e instanceof Error?e.message:'无法处理这张图片。');}
 }

 return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#10231b]/60">
  <div role="dialog" aria-modal="true" aria-label={`调整 ${name} 的头像`} className="safe-bottom max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-t-[32px] bg-white p-5 shadow-2xl">
   <div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-[#13795b]">宝宝头像</p><h2 className="mt-1 text-2xl font-semibold">调整照片</h2></div><button type="button" className="flex h-11 w-11 items-center justify-center rounded-full bg-[#edf2ed]" aria-label="取消头像调整" onClick={onCancel} disabled={busy}><X size={20}/></button></div>
   <p className="mt-3 text-sm text-[#62776d]">拖动照片调整位置，使用滑杆缩放。方框中的内容会成为头像。</p>
   {(processingError||uploadError)&&<p role="alert" className="mt-3 rounded-2xl bg-[#fff0ed] p-3 text-sm text-[#a64c49]">{processingError||uploadError}</p>}
   <div className="touch-none mx-auto mt-5 overflow-hidden rounded-[36px] bg-[#dfe7e1] shadow-inner" style={{width:SIZE,height:SIZE}} onPointerDown={event=>{event.currentTarget.setPointerCapture(event.pointerId);drag.current={x:event.clientX,y:event.clientY,offset};}} onPointerMove={event=>{if(!drag.current)return;setOffset(clamp({x:drag.current.offset.x+event.clientX-drag.current.x,y:drag.current.offset.y+event.clientY-drag.current.y},display.width,display.height));}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
    <div className="relative h-full w-full"><img ref={image} src={src} alt="待裁剪的宝宝头像" draggable={false} onLoad={event=>{setNatural({width:event.currentTarget.naturalWidth,height:event.currentTarget.naturalHeight});setOffset({x:0,y:0});}} className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none" style={{width:display.width||SIZE,height:display.height||SIZE,transform:`translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`}}/><div className="pointer-events-none absolute inset-0 rounded-[36px] ring-2 ring-inset ring-white/90"/></div>
   </div>
   <label className="mt-6 flex items-center gap-3"><Minus size={18} className="text-[#62776d]"/><span className="sr-only">头像缩放</span><input className="h-11 min-w-0 flex-1 accent-[#13795b]" type="range" aria-label="头像缩放" min="1" max="3" step="0.01" value={zoom} onChange={event=>{const next=Number(event.target.value);setZoom(next);setOffset(current=>clamp(current,natural.width*baseScale*next,natural.height*baseScale*next));}}/><Plus size={18} className="text-[#62776d]"/></label>
   <div className="mt-5 grid grid-cols-2 gap-3"><button type="button" className="min-h-14 rounded-2xl border border-[#dce5df] font-semibold text-[#62776d]" onClick={onCancel} disabled={busy}>取消</button><button type="button" className="min-h-14 rounded-2xl bg-[#13795b] font-semibold text-white disabled:opacity-50" onClick={crop} disabled={busy||!natural.width}>{busy?'上传中…':'使用这张照片'}</button></div>
  </div>
 </div>;
}
