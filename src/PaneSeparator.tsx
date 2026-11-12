import {useRef} from 'react';

type Props = {
 label: string;
 value: number;
 min: number;
 max: number;
 step: number;
 onDrag: (start: number, delta: number) => void;
 onChange: (value: number) => void;
};

export function PaneSeparator({label,value,min,max,step,onDrag,onChange}:Props){
 const drag=useRef({x:0,value:0});
 return <div
  className="pane-separator"
  role="separator"
  aria-label={label}
  aria-orientation="vertical"
  aria-valuemin={min}
  aria-valuemax={max}
  aria-valuenow={value}
  tabIndex={0}
  onPointerDown={event=>{
   if(event.button!==0||!event.isPrimary)return;
   drag.current={x:event.clientX,value};
   event.currentTarget.setPointerCapture(event.pointerId);
  }}
  onPointerMove={event=>{
   if(event.currentTarget.hasPointerCapture(event.pointerId)){
    onDrag(drag.current.value,event.clientX-drag.current.x);
   }
  }}
  onKeyDown={event=>{
   const values:Record<string,number>={ArrowLeft:value-step,ArrowRight:value+step,Home:min,End:max};
   if(!Object.hasOwn(values,event.key))return;
   event.preventDefault();
   onChange(Math.max(min,Math.min(max,values[event.key])));
  }}
 />;
}
