import {isBackdropClick} from './dialogBackdrop';
import {useEffect,useRef,useState,type RefObject} from 'react';
import type {EditorView} from '@codemirror/view';
import {Bold,Heading1,Heading2,Heading3,Pilcrow,List,ListOrdered,Link,X,BetweenVerticalStart,FilePlus2,Smile} from 'lucide-react';
import {defaultSpacing,type DocumentSpacing} from './documentLayout';
import {emojiGroups} from './emojiData';
type Selection={from:number;to:number;text:string};
export default function FormattingToolbar({editor,spacing,onSpacingChange}:{editor:RefObject<EditorView|null>;spacing:DocumentSpacing;onSpacingChange:(spacing:DocumentSpacing)=>void}){
 const [link,setLink]=useState<Selection|null>(null),[label,setLabel]=useState(''),[url,setUrl]=useState('https://'),[error,setError]=useState('');
 const [spacingOpen,setSpacingOpen]=useState(false);
 const spacingDialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(spacingOpen)spacingDialog.current?.showModal();else spacingDialog.current?.close()},[spacingOpen]);
 const [emojiGroup,setEmojiGroup]=useState(0);
 const emojiDialog=useRef<HTMLDialogElement>(null);
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(link)dialog.current?.showModal();else dialog.current?.close()},[link]);
 const selection=()=>{const view=editor.current;if(!view)return null;const {from,to}=view.state.selection.main;return {from,to,text:view.state.sliceDoc(from,to)}};
 const replace=(selected:Selection,value:string,from=selected.from,to=from+value.length)=>{const view=editor.current;if(!view)return;view.dispatch({changes:{from:selected.from,to:selected.to,insert:value},selection:{anchor:from,head:to},scrollIntoView:true});view.focus()};
 const insertEmoji=(emoji:string)=>{
  const selected=selection();
  emojiDialog.current?.close();
  if(!selected)return;
  const end=selected.to+emoji.length;
  replace({from:selected.to,to:selected.to,text:''},emoji,end,end);
 };
 const bold=()=>{const selected=selection();const view=editor.current;if(!selected||!view)return;const {from,to,text}=selected;if(text.startsWith('**')&&text.endsWith('**')&&text.length>4){replace(selected,text.slice(2,-2));return}if(from>=2&&view.state.sliceDoc(from-2,from)==='**'&&view.state.sliceDoc(to,to+2)==='**'){replace({from:from-2,to:to+2,text},text);return}const value=text||'pogrubiony tekst';replace(selected,`**${value}**`,from+2,from+2+value.length)};
 const colour=(value:'#482a30'|'#ff501b')=>{
  const selected=selection();const view=editor.current;if(!selected||!view)return;
  const opening=/<span style="color:#(?:482a30|ff501b)">$/;
  const before=view.state.sliceDoc(0,selected.from).match(opening);
  if(before&&view.state.sliceDoc(selected.to,selected.to+7)==='</span>'){
   const from=selected.from-before[0].length;
   const tag=`<span style="color:${value}">`;
   replace({from,to:selected.to+7,text:selected.text},tag+selected.text+'</span>',from+tag.length,from+tag.length+selected.text.length);return;
  }
  const tag=`<span style="color:${value}">`;
  const text=selected.text||'wyróżniony tekst';
  // Keep paragraph breaks and Markdown block markers outside the colour spans.
  const result=text.split('\n').map((line,index)=>{
   if(!line.trim())return line;
   const atStart=index>0||selected.from===view.state.doc.lineAt(selected.from).from;
   const prefix=atStart?(line.match(/^(?:\s*(?:#{1,6}\s+|[-*+]\s+|\d+\.\s+|>\s*))+/)?.[0]||''):'';
   const content=line.slice(prefix.length).replace(/<span style="color:#(?:482a30|ff501b)">|<\/span>/g,'');
   return prefix+tag+content+'</span>';
  }).join('\n');
  if(!text.includes('\n'))replace(selected,result,selected.from+tag.length,selected.from+result.length-7);
  else replace(selected,result);
 };
 const block=(type:'h1'|'h2'|'h3'|'p'|'ul'|'ol')=>{const selected=selection();const view=editor.current;if(!selected||!view)return;const first=view.state.doc.lineAt(selected.from),last=view.state.doc.lineAt(selected.to>selected.from?selected.to-1:selected.to);const value=view.state.sliceDoc(first.from,last.to).split('\n').map((line,index)=>{const clean=line.replace(/^\s*(?:#{1,6}\s+|[-*+]\s+|\d+\.\s+)/,'');const prefix={h1:'# ',h2:'## ',h3:'### ',p:'',ul:'- ',ol:`${index+1}. `}[type];return prefix+(clean||(type==='h1'||type==='h2'||type==='h3'?'Nagłówek':type==='p'?'Akapit':'Punkt listy'))}).join('\n');replace({from:first.from,to:last.to,text:''},value)};
 const openLink=()=>{const selected=selection();if(!selected)return;setLabel(selected.text);setUrl('https://');setError('');setLink(selected)};
 const insertLink=()=>{if(!link)return;if(!/^https?:\/\/\S+$/i.test(url.trim())){setError('Wpisz adres zaczynający się od https:// lub http://.');return}const title=(label.trim()||url.trim()).replace(/([\\\[\]])/g,'\\$1');const destination=url.trim().replace(/\(/g,'%28').replace(/\)/g,'%29');replace(link,`[${title}](${destination})`);setLink(null)};
 const pageBreak=()=>{const selected=selection();const view=editor.current;if(!selected||!view)return;const prefix=view.state.sliceDoc(0,selected.from).endsWith('\n\n')?'':'\n\n';const marker=prefix+'<!-- pagebreak -->\n\n';replace({from:selected.from,to:selected.from,text:''},marker,selected.from+marker.length,selected.from+marker.length)};
 const buttons=[{label:'Pogrubienie',icon:Bold,action:bold},{label:'Nagłówek 1',icon:Heading1,action:()=>block('h1')},{label:'Nagłówek 2',icon:Heading2,action:()=>block('h2')},{label:'Nagłówek 3',icon:Heading3,action:()=>block('h3')},{label:'Akapit',icon:Pilcrow,action:()=>block('p')},{label:'Lista punktowana',icon:List,action:()=>block('ul')},{label:'Lista numerowana',icon:ListOrdered,action:()=>block('ol')},{label:'Wstaw link',icon:Link,action:openLink},{label:'Nowa strona',icon:FilePlus2,action:pageBreak},{label:'Odstępy',icon:BetweenVerticalStart,action:()=>setSpacingOpen(true)}];
 return <><div className="format-toolbar" role="toolbar" aria-label="Formatowanie tekstu">{buttons.map(button=><button type="button" key={button.label} aria-label={button.label} title={button.label} onMouseDown={event=>event.preventDefault()} onClick={button.action}><button.icon size={17}/><span>{button.label==='Pogrubienie'?'':button.label.replace('Nagłówek 1','Tytuł').replace('Nagłówek 2','Nagłówek').replace('Nagłówek 3','Podnagłówek').replace('Lista punktowana','Punkty').replace('Lista numerowana','Numeracja').replace('Wstaw link','Link')}</span></button>)}<span className="colour-divider" aria-hidden="true"/>{([{value:'#482a30',label:'Brązowy'},{value:'#ff501b',label:'Pomarańczowy'}] as const).map(({value,label})=><button key={value} type="button" aria-label={`Kolor tekstu: ${label.toLowerCase()}`} title={`Kolor tekstu: ${label.toLowerCase()}`} onMouseDown={event=>event.preventDefault()} onClick={()=>colour(value)}><span className="colour-letter" style={{color:value}} aria-hidden="true">A</span></button>)}
 <button type="button" aria-label="Wstaw emoji" title="Wstaw emoji" onMouseDown={event=>event.preventDefault()} onClick={()=>emojiDialog.current?.showModal()}><Smile size={17}/></button>
 </div>
 <dialog ref={emojiDialog} className="settings-dialog" onClick={event=>{if(isBackdropClick(event))event.currentTarget.close()}} aria-labelledby="emoji-title">
  <div className="settings-heading"><h2 id="emoji-title">Wstaw emoji</h2><button type="button" className="icon" aria-label="Zamknij wybór emoji" onClick={()=>emojiDialog.current?.close()}><X size={18}/></button></div>
  <label className="link-field">Kategoria emoji<select value={emojiGroup} onChange={event=>setEmojiGroup(Number(event.target.value))}>
   {emojiGroups.map(({label},index)=><option key={label} value={index}>{label}</option>)}
  </select></label>
  <div className="emoji-grid" key={emojiGroup}>{emojiGroups[emojiGroup].items.map(([emoji,name])=><button type="button" key={emoji} aria-label={name} title={name} onClick={()=>insertEmoji(emoji)}>{emoji}</button>)}</div>
 </dialog>
 <dialog ref={dialog} className="settings-dialog" onClick={event=>{if(isBackdropClick(event))setLink(null)}} aria-labelledby="link-title" onCancel={()=>setLink(null)}><form onSubmit={event=>{event.preventDefault();insertLink()}}><div className="settings-heading"><h2 id="link-title">Wstaw link</h2><button type="button" className="icon" aria-label="Zamknij wstawianie linku" onClick={()=>setLink(null)}><X size={18}/></button></div><label className="link-field">Tekst linku<input autoFocus value={label} onChange={event=>setLabel(event.target.value)}/></label><label className="link-field">Adres strony<input value={url} onChange={event=>setUrl(event.target.value)} type="url" required/></label>{error&&<p role="alert">{error}</p>}<div className="link-actions"><button type="button" className="secondary" onClick={()=>setLink(null)}>Anuluj</button><button type="submit" className="primary">Wstaw</button></div></form></dialog><dialog ref={spacingDialog} className="settings-dialog" onClick={event=>{if(isBackdropClick(event))setSpacingOpen(false)}} aria-labelledby="spacing-title" onCancel={()=>setSpacingOpen(false)}><div className="settings-heading"><h2 id="spacing-title">Odstępy w dokumencie</h2><button type="button" className="icon" aria-label="Zamknij odstępy" onClick={()=>setSpacingOpen(false)}><X size={18}/></button></div><p>Zmiany dotyczą całego dokumentu i są zapisywane razem z nim.</p><label className="link-field">Interlinia<select aria-label="Interlinia" value={spacing.lineHeight} onChange={event=>onSpacingChange({...spacing,lineHeight:Number(event.target.value)})}>{[1,1.15,1.3,1.5,1.75,2].map(value=><option key={value} value={value}>{String(value).replace('.',',')}</option>)}</select></label><label className="link-field">Odstęp między akapitami<select aria-label="Odstęp między akapitami" value={spacing.paragraphGap} onChange={event=>onSpacingChange({...spacing,paragraphGap:Number(event.target.value)})}>{[0,4,7,10,14,18].map(value=><option key={value} value={value}>{value} pkt</option>)}</select></label><label className="link-field">Odstęp nad nagłówkami<select aria-label="Odstęp nad nagłówkami" value={spacing.headingGap} onChange={event=>onSpacingChange({...spacing,headingGap:Number(event.target.value)})}>{[0,5,8,11,15,20].map(value=><option key={value} value={value}>{value} pkt</option>)}</select></label><div className="link-actions"><button type="button" className="secondary" onClick={()=>onSpacingChange({...defaultSpacing})}>Przywróć domyślne</button><button type="button" className="primary" onClick={()=>setSpacingOpen(false)}>Gotowe</button></div></dialog></>;
}
