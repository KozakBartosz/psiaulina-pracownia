import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const permissions=JSON.parse(readFileSync('src-tauri/capabilities/default.json','utf8')).permissions;

test.beforeEach(async({page})=>{
 await page.addInitScript(({permissions})=>{
  const callbacks=new Map<number,Function>();
  const listeners=new Map<number,number>();
  let next=0;
  const state={destroyed:0,confirmations:0,answer:false,errors:[] as string[],listeners:0};
  Object.assign(window,{isTauri:true,closeTest:state,__TAURI_INTERNALS__:{
   metadata:{currentWindow:{label:'main'},currentWebview:{label:'main'}},
   transformCallback:(fn:Function)=>{callbacks.set(++next,fn);return next},
   unregisterCallback:(id:number)=>callbacks.delete(id),
   invoke:async(cmd:string,args:any)=>{
    if(cmd==='plugin:event|listen'){const id=++next;listeners.set(id,args.handler);state.listeners=listeners.size;return id}
    if(cmd==='plugin:event|unlisten'){listeners.delete(args.eventId);state.listeners=listeners.size;return}
    if(cmd==='plugin:window|destroy'){
     if(!permissions.includes('core:window:allow-destroy'))throw Error('window.destroy not allowed');
     state.destroyed++;return;
    }
    if(cmd==='plugin:window|close'){await (window as any).requestTestClose();return}
    if(cmd==='plugin:dialog|message'){state.confirmations++;return state.answer?'Odrzuć zmiany':'Wróć do edycji'}
    if(cmd==='get_root')return '/test';
    if(cmd==='list_files')return [];
   }
  },__TAURI_EVENT_PLUGIN_INTERNALS__:{unregisterListener:()=>{}},
  requestTestClose:async()=>{
   for(const handler of [...listeners.values()]){
    try{await callbacks.get(handler)?.({event:'tauri://close-requested',id:1,payload:null})}
    catch(e){state.errors.push(String(e))}
   }
  }});
 },{permissions});
 await page.goto('/');
 await expect.poll(()=>page.evaluate(()=>(window as any).closeTest.listeners)).toBeGreaterThan(0);
});

test('zamyka niezmienione okno z rzeczywistymi uprawnieniami aplikacji',async({page})=>{
 expect(await page.evaluate(()=>(window as any).closeTest.listeners)).toBe(1);
 await page.evaluate(()=>(window as any).requestTestClose());
 expect(await page.evaluate(()=>(window as any).closeTest.errors)).toEqual([]);
 expect(await page.evaluate(()=>(window as any).closeTest.destroyed)).toBe(1);
});

test('anulowanie chroni dokument, odrzucenie zamyka jeden raz',async({page})=>{
 await page.getByRole('button',{name:'Nowy dokument',exact:true}).first().click();
 expect(await page.evaluate(()=>{const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);return event.defaultPrevented})).toBe(false);
 await page.evaluate(()=>(window as any).requestTestClose());
 expect(await page.evaluate(()=>(window as any).closeTest.destroyed)).toBe(0);
 expect(await page.evaluate(()=>(window as any).closeTest.confirmations)).toBe(1);
 await expect(page.getByLabel('Nazwa dokumentu')).toHaveValue('Nowy dokument');
 await page.evaluate(()=>{(window as any).closeTest.answer=true;return (window as any).requestTestClose()});
 expect(await page.evaluate(()=>(window as any).closeTest.errors)).toEqual([]);
 expect(await page.evaluate(()=>(window as any).closeTest.destroyed)).toBe(1);
 expect(await page.evaluate(()=>(window as any).closeTest.confirmations)).toBe(2);
});
