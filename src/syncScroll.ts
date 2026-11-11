function scrollRange(pane:HTMLElement){
 return Math.max(0,pane.scrollHeight-pane.clientHeight);
}

export function syncScroll(editor:HTMLElement,preview:HTMLElement){
 const positions=new Map<HTMLElement,number>();
 let previewRange=scrollRange(preview);

 function align(source:HTMLElement,target:HTMLElement){
  const range=scrollRange(source);
  if(!source.clientHeight||!target.clientHeight||!range)return;
  const progress=Math.max(0,Math.min(1,source.scrollTop/range));
  target.scrollTop=progress*scrollRange(target);
  positions.set(target,target.scrollTop);
 }

 function onEditorScroll(){
  if(editor.scrollTop!==positions.get(editor))align(editor,preview);
  positions.delete(editor);
 }

 function updatePreview(){
  previewRange=scrollRange(preview);
  align(editor,preview);
 }

 function onPreviewScroll(){
  if(scrollRange(preview)!==previewRange){
   updatePreview();
  }else if(preview.scrollTop!==positions.get(preview)){
   align(preview,editor);
  }
  positions.delete(preview);
 }

 const resize=new ResizeObserver(updatePreview);
 resize.observe(preview);
 for(const child of preview.children)resize.observe(child);
 editor.addEventListener('scroll',onEditorScroll);
 preview.addEventListener('scroll',onPreviewScroll);
 updatePreview();

 return ()=>{
  resize.disconnect();
  editor.removeEventListener('scroll',onEditorScroll);
  preview.removeEventListener('scroll',onPreviewScroll);
 };
}
