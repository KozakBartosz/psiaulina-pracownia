import {isBackdropClick} from './dialogBackdrop';
import {useEffect,useRef,useState} from 'react';
import CodeMirror from '@uiw/react-codemirror';
import {EditorView} from '@codemirror/view';
import FormattingToolbar from './FormattingToolbar';
import PdfPreview from './PdfPreview';
import {scales,useViewPreferences} from './viewPreferences';
import {syncScroll} from './syncScroll';
import {markdown} from '@codemirror/lang-markdown';
import DocumentContent from './DocumentContent';
import {parseDocument,serializeDocument} from './documentLayout';

import {Plus,FileText,Save,Printer,Search,BookOpen,LayoutTemplate,ChevronRight,Settings,FolderOpen,X,Trash2} from 'lucide-react';
import * as files from './files';
import type {Section,Entry} from './files';
const tabs=[{id:'podsumowania' as Section,label:'Podsumowania',icon:FileText},{id:'wiedza' as Section,label:'Wiedza',icon:BookOpen},{id:'szablon' as Section,label:'Szablon',icon:LayoutTemplate}];
export default function App(){
 const [folder,setFolder]=useState<string|null>(null),[section,setSection]=useState<Section>('podsumowania'),[entries,setEntries]=useState<Entry[]>([]),[selected,setSelected]=useState<string|null>(null),[name,setName]=useState(''),[text,setText]=useState(''),[baseline,setBaseline]=useState(''),[query,setQuery]=useState(''),[active,setActive]=useState(false),[status,setStatus]=useState(''),[busy,setBusy]=useState(false),[mode,setMode]=useState('split');
 const [settingsOpen,setSettingsOpen]=useState(false),[pickingFolder,setPickingFolder]=useState(false);
 const {scale,setScale,smooth,setSmooth}=useViewPreferences(setStatus);
 const settingsDialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(settingsOpen)settingsDialog.current?.showModal();else settingsDialog.current?.close()},[settingsOpen]);
 const editorView=useRef<EditorView|null>(null);
 const isKnowledge=section==='wiedza';
 const previewPane=useRef<HTMLElement>(null);
 const editorPane=useRef<HTMLElement>(null);
 useEffect(()=>{
  if(active&&mode==='split'&&editorPane.current&&previewPane.current){
   return syncScroll(editorPane.current,previewPane.current);
  }
 },[mode,active,isKnowledge]);
 const document= parseDocument(text);
 const preview=useRef<HTMLDivElement>(null);const dirty=active&&(text!==baseline||`${name}.md`!==files.displayName(selected||''));const dirtyRef=useRef(dirty);dirtyRef.current=dirty;
 const notify=(e:unknown)=>setStatus(e instanceof Error?e.message:String(e));
 const refresh=async()=>{try{setEntries((await files.list(section)).sort((a,b)=>Number(b.name===files.rootAgents)-Number(a.name===files.rootAgents)||b.modified-a.modified||a.name.localeCompare(b.name,'pl')))}catch(e){notify(e)}};
 useEffect(()=>{files.root().then(setFolder).catch(notify)},[]);
 useEffect(()=>{if(folder||!files.desktop)void refresh()},[folder,section]);
 useEffect(()=>{const timer=setInterval(async()=>{if(!folder&&files.desktop)return;await refresh();if(selected&&!dirtyRef.current){try{const latest=await files.read(section,selected);if(!dirtyRef.current){setText(latest);setBaseline(latest)}}catch{/* A renamed external file remains visible until user selects another. */}}},2500);return()=>clearInterval(timer)},[folder,section,selected]);
 // Desktop close protection belongs to Tauri; browser beforeunload can block WebView shutdown.
 useEffect(()=>{if(files.desktop)return;const unload=(e:BeforeUnloadEvent)=>{if(dirtyRef.current)e.preventDefault()};window.addEventListener('beforeunload',unload);return()=>window.removeEventListener('beforeunload',unload)},[]);
 useEffect(()=>{
  if(!files.desktop)return;
  let disposed=false,pending=false;
  let cleanup:(()=>void)|undefined;
  void import('@tauri-apps/api/window').then(async({getCurrentWindow})=>{
   if(disposed)return;
   const unlisten=await getCurrentWindow().onCloseRequested(async e=>{
    if(disposed||pending){e.preventDefault();return}
    if(!dirtyRef.current)return;
    pending=true;
    try{
     // Let Tauri destroy the window after approval, without issuing another close event.
     if(!await files.confirmDiscard('Masz niezapisane zmiany. Zamknąć aplikację?'))e.preventDefault();
    }catch(error){e.preventDefault();notify(error)}finally{pending=false}
   });
   if(disposed)unlisten();else cleanup=unlisten;
  }).catch(notify);
  return()=>{disposed=true;cleanup?.()};
 },[]);
 const canLeave=async()=>!dirty||await files.confirmDiscard();
 const clear=()=>{setSelected(null);setName('');setText('');setBaseline('');setActive(false);setStatus('')};
 const pick=async()=>{if(pickingFolder||!await canLeave())return;setPickingFolder(true);try{const path=await files.choose();if(path){setFolder(path);clear();setEntries([]);setQuery('')}}catch(e){notify(e)}finally{setPickingFolder(false)}};
 const openFile=async(filename:string)=>{
  if(!await canLeave())return;
  try{
   const value=await files.read(section,filename);
   setSelected(filename);setName(files.displayName(filename).replace(/\.md$/i,''));
   setText(value);setBaseline(value);setActive(true);setStatus('');
  }catch(e){notify(e)}
 };
 const create=async()=>{if(isKnowledge||!await canLeave())return;clear();setName('Nowy dokument');setActive(true)};
 const save=async()=>{if(isKnowledge&&!selected)return;if(!name.trim()||/[<>:"/\\|?*\x00-\x1f]/.test(name)||/[. ]$/.test(name)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name)){setStatus('Wpisz poprawną nazwę pliku, bez znaków specjalnych i kropki na końcu.');return}setBusy(true);try{const filename=selected===files.rootAgents?files.rootAgents:`${name}.md`;await files.write(section,selected,filename,text,selected?baseline:null);setSelected(filename);setBaseline(text);setStatus('Zapisano');await refresh()}catch(e){notify(e)}finally{setBusy(false)}};
 const remove=async()=>{if(section!=='podsumowania'||!selected||busy)return;if(dirty&&!await canLeave())return;setBusy(true);try{if(await files.deleteSummary(selected,baseline)){clear();setEntries([]);await refresh();setStatus('Przeniesiono podsumowanie do Kosza')}}catch(e){notify(e)}finally{setBusy(false)}};
 const print=async()=>{if(!preview.current)return;setBusy(true);try{const {exportPdf}=await import('./pdf');const saved=await exportPdf(preview.current,name||'Podsumowanie');setStatus(saved?'Zapisano PDF':'Anulowano zapis PDF')}catch(e){notify(e)}finally{setBusy(false)}};
 return <div className="app"><aside><div className="brand"><img src="/logo.png" alt="Psiaulina — psia behawiorystka"/></div><nav>{tabs.map(tab=><button key={tab.id} className={section===tab.id?'tab active':'tab'} onClick={async()=>{if(section!==tab.id&&await canLeave()){clear();setSection(tab.id);setQuery('')}}}><tab.icon size={16}/>{tab.label}</button>)}</nav><div className="list-tools"><span>{tabs.find(t=>t.id===section)?.label} <small>{entries.length}</small></span>{!isKnowledge&&<button className="icon" title="Nowy dokument" aria-label="Nowy dokument" onClick={create} disabled={!folder&&files.desktop}><Plus size={19}/></button>}</div><label className="search"><Search size={15}/><input placeholder="Szukaj pliku…" value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="file-list">{entries.filter(e=>files.displayName(e.name).toLocaleLowerCase('pl').includes(query.toLocaleLowerCase('pl'))).map(entry=><button key={entry.name} className={`file${entry.name===selected?' selected':''}${entry.name===files.rootAgents?' agents-file':''}`} onClick={()=>void openFile(entry.name)}><FileText size={18}/><div><strong>{entry.name===files.rootAgents?'AGENTS.md':entry.name.replace(/\.md$/i,'')}</strong><span>{entry.name===files.rootAgents?'Instrukcje główne · ':''}{new Date(entry.modified).toLocaleString('pl-PL',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</span></div>{entry.name===selected&&<ChevronRight size={15}/>}</button>)}{!entries.length&&<div className="list-empty">{folder||!files.desktop?(isKnowledge?'Brak plików wiedzy w wybranym katalogu.':'Jeszcze tu pusto. Dodaj pierwszy dokument.'):'Wybierz folder, aby zobaczyć dokumenty.'}</div>}</div><div className="sidebar-bottom"><button className="settings-button" onClick={()=>setSettingsOpen(true)}><Settings size={17}/>Ustawienia</button></div></aside><main>{active?<><div className="document-bar"><div className="document-name"><div><input aria-label="Nazwa dokumentu" readOnly={isKnowledge} value={name} onChange={e=>setName(e.target.value)}/></div>{dirty&&<span className="unsaved">Niezapisane zmiany</span>}</div>{!isKnowledge&&<>{section==='podsumowania'&&selected&&<button className="delete-button" title="Usuń podsumowanie" aria-label="Usuń podsumowanie" disabled={busy} onClick={()=>void remove()}><Trash2 size={17}/></button>}<button className="secondary" onClick={()=>void print()} disabled={busy}><Printer size={16}/>Drukuj / PDF</button></>}<button className="primary" onClick={()=>void save()} disabled={busy||!dirty}><Save size={16}/>Zapisz</button></div><div className="editor-toolbar"><div>{[['edit','Edytor'],['split','Edytor i podgląd'],['preview','Podgląd']].map(([id,label])=><button key={id} className={(mode===id)?'chosen':''} onClick={()=>setMode(id)}>{label}</button>)}</div><span>Markdown <span className="dot">·</span> {text.trim()?text.trim().split(/\s+/).length:0} słów</span></div><div className={`workspace ${mode}${isKnowledge?' knowledge':''}`}><section className="editor" ref={editorPane}><FormattingToolbar editor={editorView} spacing={document.spacing} onSpacingChange={spacing=>setText(serializeDocument(document.body,spacing))}/><CodeMirror onCreateEditor={view=>{editorView.current=view}} className="editor-input" editable={true} value={document.body} extensions={[markdown(),EditorView.lineWrapping,EditorView.theme({".cm-scroller":{lineHeight:String(document.spacing.lineHeight)}})]} onChange={body=>setText(serializeDocument(body,document.spacing))} basicSetup={{lineNumbers:false,foldGutter:false,highlightActiveLine:false,highlightActiveLineGutter:false}} height="100%"/></section><section className="preview" ref={previewPane}><div className="pane-label">PODGLĄD DOKUMENTU {!isKnowledge&&<span>A4</span>}</div>{isKnowledge?<article className="paper"><div className="markdown"><DocumentContent text={text}/></div></article>:<><div className="pdf-source" aria-hidden="true"><div className="markdown" ref={preview}><DocumentContent text={text}/></div></div><PdfPreview source={preview} text={text} name={name}/></>}</section></div></>:<div className="welcome"><div className="welcome-icon"><BookOpen size={34}/></div><span className="eyebrow">MIEJSCE NA DOBRĄ OPIEKĘ</span><h1>Wszystko pod łapą.</h1><p>Podsumowania konsultacji, Twoja wiedza i szablony.<br/>W jednym miejscu, w zwykłych plikach Markdown.</p>{(!isKnowledge||(!folder&&files.desktop))&&<button className="primary" onClick={folder||!files.desktop?create:()=>void pick()}><Plus size={17}/>{folder||!files.desktop?'Nowy dokument':'Wybierz folder z materiałami'}</button>}<small>{isKnowledge?'Wybierz materiał z listy, aby go przeczytać lub edytować.':folder?'Wybierz dokument z listy lub zacznij nowy.':'Wskaż folder, z którego korzystasz również z agentem.'}</small></div>}{status&&!settingsOpen&&<div className="status-message" role="status">{status}<button aria-label="Zamknij komunikat" onClick={()=>setStatus('')}>×</button></div>}</main><dialog ref={settingsDialog} className="settings-dialog" onCancel={()=>setSettingsOpen(false)} onClick={event=>{if(isBackdropClick(event))setSettingsOpen(false)}} aria-labelledby="settings-title"><div className="settings-heading"><h2 id="settings-title">Ustawienia</h2><button className="icon" aria-label="Zamknij ustawienia" onClick={()=>setSettingsOpen(false)}><X size={19}/></button></div><h3>Wygląd</h3><div className="view-preferences">
 <label>Skala interfejsu <select value={scale} onChange={event=>setScale(Number(event.target.value))}>{scales.map(value=><option key={value} value={value}>{value}%</option>)}</select></label>
 <label><input type="checkbox" checked={smooth} onChange={event=>setSmooth(event.target.checked)}/> Płynne przewijanie</label>
 </div><h3>Folder materiałów</h3><p>Wybierz folder z wiedzą, szablonami i podsumowaniami.</p><div className="folder-row"><div className="folder-path"><FolderOpen size={19}/><span title={folder??undefined}>{folder||'Nie wybrano folderu'}</span></div><button className="primary" disabled={!files.desktop||pickingFolder} onClick={()=>void pick()}><FolderOpen size={16}/>{pickingFolder?'Wybieranie…':folder?'Zmień folder':'Wybierz folder'}</button></div>{!files.desktop&&<p className="settings-note">Wybór folderu jest dostępny w aplikacji komputerowej.</p>}<div className="folder-structure"><span>Zawartość folderu</span><code>AGENTS.md<br/>wiedza/<br/>szablon/<br/>podsumowania/</code></div><p className="settings-note">Ten sam folder dodaj w Codexie jako osobny projekt do pracy z agentem. Kod aplikacji przechowuj oddzielnie.</p>{status&&<p className="settings-error" role="status">{status}</p>}</dialog></div>
}
