import {invoke,isTauri} from '@tauri-apps/api/core';
import {open,save,confirm} from '@tauri-apps/plugin-dialog';
export type Section='podsumowania'|'wiedza'|'szablon';
export const rootAgents='@root/AGENTS.md';
export const displayName=(name:string)=>name===rootAgents?'AGENTS.md':name;
export type Entry={name:string;modified:number};
export const desktop=isTauri();
const demo:Record<Section,Record<string,string>>={podsumowania:{'Przykładowe podsumowanie.md':'Hej!\n\nTutaj przygotujesz wskazówki po konsultacji.\n\n## Najważniejsze obserwacje\n\n- Opisz sytuację i potrzeby psa.\n- Oddziel obserwacje od hipotez.\n\n## Plan pracy\n\nWpisz ustalone zalecenia.\n\n## Zadanie domowe\n\n- Dodaj zadanie dla opiekuna.\n\n## Dodatkowe informacje i linki\n\n[Psiaulina](https://www.psiaulina.pl/)'},wiedza:{[rootAgents]:'# Instrukcje dla agenta\n\nKorzystaj z materiałów w folderze wiedza.', 'Przykładowa wiedza.md':'## Materiał przykładowy\n\nTreść do edycji.'},szablon:{}};
export async function root(){return desktop?invoke<string|null>('get_root'):null}
export async function choose(){if(!desktop)return 'Tryb demonstracyjny';const path=await open({directory:true,multiple:false,title:'Wybierz folder Psiauliny'});if(typeof path!=='string')return null;return invoke<string>('set_root',{path})}
export async function list(section:Section){return desktop?invoke<Entry[]>('list_files',{section}):Object.keys(demo[section]).map(name=>({name,modified:Date.now()}))}
export async function read(section:Section,name:string){return desktop?invoke<string>('read_file',{section,name}):demo[section][name]}
export async function write(section:Section,oldName:string|null,name:string,text:string,expected:string|null){if(section==='wiedza'&&(!oldName||oldName!==name))throw Error('Można edytować tylko istniejące pliki wiedzy, bez zmiany nazwy.');if(desktop)return invoke('save_file',{section,oldName,name,text,expected});if(name!==oldName&&demo[section][name]!==undefined)throw Error('Plik o tej nazwie już istnieje.');if(oldName)delete demo[section][oldName];demo[section][name]=text}
export async function storePdf(bytes:Uint8Array,name:string){if(desktop){const path=await save({defaultPath:name,filters:[{name:'PDF',extensions:['pdf']}]});if(!path)return false;await invoke('save_pdf',{path,bytes:Array.from(bytes)});}else{const url=URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type:'application/pdf'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)}return true}

export async function confirmDiscard(message="Masz niezapisane zmiany. Odrzucić je?"){return desktop?confirm(message,{title:"Niezapisane zmiany",kind:"warning",okLabel:"Odrzuć zmiany",cancelLabel:"Wróć do edycji"}):window.confirm(message)}

export async function deleteSummary(name:string,expected:string){
 const message=`Przenieść podsumowanie „${name.replace(/\.md$/i,'')}” do Kosza?`;
 const accepted=desktop?await confirm(message,{title:'Usuń podsumowanie',kind:'warning',okLabel:'Przenieś do Kosza',cancelLabel:'Anuluj'}):window.confirm(message);
 if(!accepted)return false;
 if(desktop)await invoke('delete_summary',{name,expected});
 else{if(demo.podsumowania[name]!==expected)throw Error('Plik zmienił się. Otwórz go ponownie.');delete demo.podsumowania[name]}
 return true;
}
