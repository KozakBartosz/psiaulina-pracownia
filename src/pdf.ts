import pdfMake from 'pdfmake/build/pdfmake';
import htmlToPdfmake from 'html-to-pdfmake';
import type {Content,TDocumentDefinitions} from 'pdfmake/interfaces';
import {defaultSpacing,parseDocument} from './documentLayout';
import {storePdf} from './files';
pdfMake.vfs = {};
let documentFonts:Promise<void>|undefined;
async function loadDocumentFonts(){
 if(!documentFonts)documentFonts=(async()=>{
  await Promise.all(['Quicksand-Regular.ttf','Quicksand-Bold.ttf','Quicksand-RegularOblique.ttf','Quicksand-BoldOblique.ttf','NotoEmoji.ttf'].map(async filename=>{
   const response=await fetch(`/${filename}`);if(!response.ok)throw Error(`Nie udało się wczytać czcionki ${filename}.`);
   const blob=await response.blob();
   pdfMake.vfs[filename]=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(blob)});
  }));
  pdfMake.fonts={Quicksand:{normal:'Quicksand-Regular.ttf',bold:'Quicksand-Bold.ttf',italics:'Quicksand-RegularOblique.ttf',bolditalics:'Quicksand-BoldOblique.ttf'},Emoji:{normal:'NotoEmoji.ttf',bold:'NotoEmoji.ttf',italics:'NotoEmoji.ttf',bolditalics:'NotoEmoji.ttf'}};
 })().catch(error=>{documentFonts=undefined;throw error});
 return documentFonts;
}
const segmenter=new Intl.Segmenter('pl',{granularity:'grapheme'});
function textRuns(text:string){
 const normalized=text.replace(/[\u2028\u2029]/g,'\n');
 if(!/[\p{Extended_Pictographic}\p{Regional_Indicator}\u20e3]/u.test(normalized))return normalized;
 const runs:{text:string;font?:string;bold?:boolean;italics?:boolean;opacity?:number}[]=[];
 for(const {segment} of segmenter.segment(normalized)){
  const emoji=/[\p{Extended_Pictographic}\p{Regional_Indicator}\u20e3]/u.test(segment);
  const previous=runs.at(-1);
  if(previous&&!emoji&&!previous.font)previous.text+=segment;
  else runs.push(emoji?{text:segment,font:'Emoji',bold:false,italics:false,opacity:0}:{text:segment});
 }
 return runs;
}
function withEmoji(value:unknown):unknown{
 if(typeof value==='string'){const text=textRuns(value);return typeof text==='string'?text:{text}}
 if(Array.isArray(value))return value.map(withEmoji);
 if(value&&typeof value==='object'){const result=Object.fromEntries(Object.entries(value).map(([key,item])=>[key,key==='text'&&typeof item==='string'?textRuns(item):typeof item==='object'?withEmoji(item):item]));if('ul' in value||'ol' in value)result.markerColor='#ff501b';return result}
 return value;
}
// PDF fonts cannot retain the system's colour emoji. Keep their text for selection
// and draw a transparent PNG over each laid-out emoji at its final page position.
const emojiImages=new Map<string,string>();
function emojiImage(text:string){
 let image=emojiImages.get(text);
 if(!image){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const context=canvas.getContext('2d');if(!context)throw Error('Nie udało się narysować emoji.');
  context.font='100px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
  context.textAlign='center';context.textBaseline='middle';context.fillText(text,64,64);
  image=canvas.toDataURL('image/png');emojiImages.set(text,image);
 }
 return image;
}
type PdfLine={x:number;y:number;getAscenderHeight:()=>number;inlines:{text:string;x:number;width:number;fontSize:number;opacity:number}[]};
type EmojiPdfStream=PDFKit.PDFDocument & {_pdfMakePages:{items:{type:string;item:PdfLine}[]}[]};
function colourPdf(doc:TDocumentDefinitions){
 return new Promise<Uint8Array>((resolve,reject)=>{
  const output=pdfMake.createPdf(doc) as unknown as {getStream:(options:{bufferPages:boolean},callback:(stream:EmojiPdfStream)=>void)=>void};
  output.getStream({bufferPages:true},stream=>{
   try{
    stream._pdfMakePages.forEach((page,index)=>{
     stream.switchToPage(index);
     for(const entry of page.items){
      if(entry.type!=='line')continue;
      const line=entry.item;
      for(const inline of line.inlines){
       if(inline.opacity!==0||!/[\p{Extended_Pictographic}\p{Regional_Indicator}\u20e3]/u.test(inline.text))continue;
       const segments=[...segmenter.segment(inline.text)];
       const width=inline.width/segments.length;
       segments.forEach(({segment},i)=>{
        const size=Math.min(inline.fontSize*1.2,width);
        stream.save().opacity(1).image(emojiImage(segment),line.x+inline.x+i*width+(width-size)/2,line.y+line.getAscenderHeight()-size*.85,{width:size,height:size}).restore();
       });
      }
     }
    });
    const chunks:Uint8Array[]=[];
    stream.on('data',(chunk:Uint8Array)=>chunks.push(chunk));stream.on('error',reject);
    stream.on('end',()=>{const bytes=new Uint8Array(chunks.reduce((sum,chunk)=>sum+chunk.length,0));let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}resolve(bytes)});
    stream.end();
   }catch(error){stream.end();reject(error)}
  });
 });
}
async function createPdf(html:string,name:string){
 await loadDocumentFonts();
 const blob=await (await fetch('/logo.png')).blob();
 const logo=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(blob)});
 const source=new DOMParser().parseFromString(html,'text/html');
 const layout=source.querySelector('[data-document-spacing]')?.getAttribute('data-document-spacing');
 const spacing=layout?parseDocument(`<!-- psiaulina-layout ${layout} -->\n`).spacing:defaultSpacing;
 const headingMargin:[number,number,number,number]=[0,spacing.headingGap,0,2];
 const smallHeading={fontSize:11.5,bold:true,margin:headingMargin};
 const options:Parameters<typeof htmlToPdfmake>[1]={
  removeExtraBlanks:true,
  defaultStyles:{
   h1:{fontSize:17,color:'#ff501b',margin:headingMargin},
   h2:{fontSize:14,bold:true,margin:headingMargin},
   h3:smallHeading,h4:smallHeading,h5:smallHeading,h6:smallHeading,
   a:{color:'#482a30',decoration:'underline'},
   p:{margin:[0,0,0,spacing.paragraphGap]},
   ul:{margin:[0,0,0,spacing.paragraphGap]},
   ol:{margin:[0,0,0,spacing.paragraphGap]},
   li:{margin:[0,0,0,4]}
  }
 };
 const sections=Array.from(source.querySelectorAll('[data-pdf-section]'));
 for(const marker of source.querySelectorAll('.manual-page-break'))marker.remove();
 const parts=sections.length?sections.filter(section=>section.textContent?.trim()).map(section=>section.innerHTML):[source.body.innerHTML];
 const content:Content[]=parts.flatMap((part,index)=>[
  ...(index>0?[{text:' ',fontSize:0,lineHeight:0,pageBreak:'before' as const,margin:0}]:[]),
  withEmoji(htmlToPdfmake(part,options)) as Content
 ]);
 const doc:TDocumentDefinitions={pageSize:'A4',pageMargins:[36,82,36,42],defaultStyle:{font:'Quicksand',fontSize:10.5,color:'#482a30',lineHeight:spacing.lineHeight},info:{title:name,author:'Psiaulina'},header:{margin:[36,30,36,0],columns:[{text:'WSKAZÓWKI PO KONSULTACJI',bold:true,color:'#ff501b',fontSize:16,margin:[0,7,0,0]},{image:logo,width:125}],columnGap:20},footer:(current,total)=>({text:`${current} z ${total}`,alignment:'right',margin:[36,10,36,0],fontSize:9}),content};
 const bytes=await colourPdf(doc);
 return bytes;
}

let cachedKey='';
let cachedPdf:Promise<Uint8Array>|undefined;
export function generatePdf(html:string,name:string){
 const key=JSON.stringify([html,name]);
 if(key!==cachedKey||!cachedPdf){cachedKey=key;cachedPdf=createPdf(html,name).catch(error=>{cachedPdf=undefined;throw error})}
 return cachedPdf;
}
export async function exportPdf(element:HTMLElement,name:string){return storePdf(await generatePdf(element.innerHTML,name),`${name}.pdf`)}
