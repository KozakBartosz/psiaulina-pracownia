import {useEffect,useRef,useState,type RefObject} from 'react';
import {getDocument,GlobalWorkerOptions,type PDFDocumentProxy,type PDFPageProxy} from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
GlobalWorkerOptions.workerSrc=workerUrl;
function Page({pdf,number}:{pdf:PDFDocumentProxy;number:number}){
 const canvas=useRef<HTMLCanvasElement>(null);
 const [error,setError]=useState(''),[ready,setReady]=useState(false);
 useEffect(()=>{
  let stopped=false;let render:ReturnType<PDFPageProxy['render']>|undefined;
  pdf.getPage(number).then(page=>{
   if(stopped||!canvas.current)return;
   const viewport=page.getViewport({scale:1.6});
   canvas.current.width=Math.ceil(viewport.width);canvas.current.height=Math.ceil(viewport.height);
   render=page.render({canvas:canvas.current,viewport});
   return render.promise.then(()=>{if(!stopped)setReady(true)});
  }).catch(error=>{if(!stopped)setError(String(error))});
  return()=>{stopped=true;render?.cancel()};
 },[pdf,number]);
 return <figure className="pdf-page" aria-label={`Strona ${number} z ${pdf.numPages}`}><canvas ref={canvas} data-rendered={ready} role="img" aria-label={`Dokument A4, strona ${number} z ${pdf.numPages}`}/>{error&&<p role="alert">{error}</p>}</figure>;
}
export default function PdfPreview({source,text,name}:{source:RefObject<HTMLDivElement|null>;text:string;name:string}){
 const [pdf,setPdf]=useState<PDFDocumentProxy|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>()=>{if(pdf)void pdf.loadingTask.destroy()},[pdf]);
 useEffect(()=>{
  let published=false;
  let stopped=false;let task:ReturnType<typeof getDocument>|undefined;
  setLoading(true);setError('');
  const timer=setTimeout(async()=>{
   try{
    const {generatePdf}=await import('./pdf');
    const bytes=await generatePdf(source.current?.innerHTML||'',name||'Podsumowanie');
    if(stopped)return;
    task=getDocument({data:bytes.slice()});
    const document=await task.promise;
    if(stopped)return;
    published=true;
    setPdf(document);setLoading(false);
   }catch(error){if(!stopped){setError(String(error));setLoading(false)}}
  },450);
  return()=>{stopped=true;clearTimeout(timer);if(task&&!published)void task.destroy()};
 },[text,name,source]);
 return <div className="pdf-pages" aria-busy={loading}>{loading&&!pdf&&<div className="preview-state" role="status">Aktualizowanie podglądu…</div>}{error&&<p role="alert">Nie udało się wygenerować podglądu: {error}</p>}{pdf&&Array.from({length:pdf.numPages},(_,i)=><Page key={`${pdf.fingerprints[0]}-${i}`} pdf={pdf} number={i+1}/>)}</div>;
}
