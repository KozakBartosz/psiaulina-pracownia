import {useEffect,useState} from 'react';
import {getCurrentWebview} from '@tauri-apps/api/webview';
import {desktop} from './files';

export const scales=[80,90,100,110,120,130,140,150];
const scaleKey='psiaulina.interface-scale';
const scrollKey='psiaulina.smooth-wheel';

export function useViewPreferences(onZoomError:(message:string)=>void){
 const [scale,setScale]=useState(()=>{
  const saved=Number(localStorage.getItem(scaleKey));
  return scales.includes(saved)?saved:100;
 });
 const [smooth,setSmooth]=useState(()=>localStorage.getItem(scrollKey)!=='false');

 useEffect(()=>{
  const onKey=(event:KeyboardEvent)=>{
   if(!(event.ctrlKey||event.metaKey)||event.altKey||event.isComposing)return;
   const direction=event.key==='+'||event.key==='='?1:event.key==='-'?-1:0;
   if(!direction&&event.key!=='0')return;
   event.preventDefault();
   setScale(current=>direction?scales[Math.max(0,Math.min(scales.length-1,scales.indexOf(current)+direction))]:100);
  };
  window.addEventListener('keydown',onKey,true);
  return ()=>window.removeEventListener('keydown',onKey,true);
 },[]);

 useEffect(()=>{
  localStorage.setItem(scaleKey,String(scale));
  if(desktop){
   void getCurrentWebview().setZoom(scale/100).catch(()=>onZoomError('Nie udało się zmienić skali interfejsu.'));
  }else{
   document.querySelector<HTMLElement>('#root')!.style.zoom=String(scale/100);
  }
 },[scale,onZoomError]);

 useEffect(()=>{
  localStorage.setItem(scrollKey,String(smooth));
  if(!smooth)return;
  return enableSmoothWheel();
 },[smooth]);

 return {scale,setScale,smooth,setSmooth};
}

function enableSmoothWheel(){
 const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
 let pane:HTMLElement|null=null;
 let destination=0;
 let position=0;
 let frame=0;
 let lastTime=0;

 function stop(){
  cancelAnimationFrame(frame);
  frame=0;
  pane=null;
 }

 function animate(time:number){
  if(!pane?.isConnected||!pane.clientHeight||reducedMotion.matches){stop();return}
  const end=Math.min(destination,pane.scrollHeight-pane.clientHeight);
  const remaining=end-position;
  if(Math.abs(remaining)<1){
   pane.scrollTop=end;
   stop();
   return;
  }
  const elapsed=Math.min(32,time-lastTime);
  position+=remaining*(1-Math.exp(-elapsed/55));
  pane.scrollTop=position;
  lastTime=time;
  frame=requestAnimationFrame(animate);
 }

 function onWheel(event:WheelEvent){
  if(event.defaultPrevented||event.ctrlKey||event.metaKey||event.shiftKey||Math.abs(event.deltaX)>Math.abs(event.deltaY)||!event.cancelable||
    reducedMotion.matches||!(event.target instanceof Element)){
   stop();
   return;
  }
  const mode=event.deltaMode;
  const delta=event.deltaY;
  const target=event.target.closest<HTMLElement>('.editor,.preview,.file-list,.emoji-grid,.settings-dialog');
  if(!delta||!target||target.scrollHeight<=target.clientHeight){stop();return}
  event.preventDefault();
  if(target!==pane){
   stop();
   pane=target;
   position=destination=target.scrollTop;
  }
  destination=Math.max(0,Math.min(target.scrollHeight-target.clientHeight,destination+delta*(mode===2?target.clientHeight:mode===1?16:1)));
  if(!frame){
   lastTime=performance.now();
   frame=requestAnimationFrame(animate);
  }
 }

 window.addEventListener('wheel',onWheel,{passive:false});
 window.addEventListener('pointerdown',stop,true);
 window.addEventListener('keydown',stop,true);
 return ()=>{
  stop();
  window.removeEventListener('wheel',onWheel);
  window.removeEventListener('pointerdown',stop,true);
  window.removeEventListener('keydown',stop,true);
 };
}
