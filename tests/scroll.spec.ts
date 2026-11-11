import {expect,test} from '@playwright/test';

test('synchronizuje pozycję w obu kierunkach i zachowuje ją podczas edycji',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:'Nowy dokument',exact:true}).first().click();
 const editor=page.locator('section.editor');
 const preview=page.locator('section.preview');
 await page.locator('.cm-content').fill(Array.from({length:140},(_,i)=>`Akapit ${i+1} — spokojny spacer.`).join('\n\n'));
 await expect(page.locator('.pdf-pages')).toHaveAttribute('aria-busy','false');
 const fraction=(pane:typeof editor)=>pane.evaluate(el=>el.scrollTop/(el.scrollHeight-el.clientHeight));
 const scroll=(pane:typeof editor,value:number)=>pane.evaluate((el,p)=>{el.scrollTop=p*(el.scrollHeight-el.clientHeight)},value);
 await expect.poll(()=>page.locator('.pdf-page').count()).toBeGreaterThan(1);

 await scroll(editor,0.2);
 await expect.poll(()=>fraction(preview)).toBeCloseTo(0.2,2);
 const before=await editor.evaluate(el=>el.scrollTop);
 const handled=await editor.evaluate(el=>!el.dispatchEvent(new WheelEvent('wheel',{
  deltaY:37,bubbles:true,cancelable:true,
 })));
 expect(handled).toBe(true);
 await expect.poll(()=>editor.evaluate(el=>el.scrollTop)).toBeCloseTo(before+37,0);
 await expect.poll(()=>fraction(preview)).toBeCloseTo(await fraction(editor),2);

 await scroll(editor,0.4);

 await expect.poll(()=>fraction(preview)).toBeCloseTo(0.4,2);
 await scroll(preview,0.65);
 await expect.poll(()=>fraction(editor)).toBeCloseTo(0.65,2);
 await page.getByLabel('Nazwa dokumentu').fill('Próba synchronizacji');
 await expect(page.locator('.pdf-pages')).toHaveAttribute('aria-busy','true');
 await expect.poll(()=>fraction(preview)).toBeCloseTo(0.65,2);
 await expect(page.locator('.pdf-pages')).toHaveAttribute('aria-busy','false');
 await expect.poll(()=>fraction(preview)).toBeCloseTo(0.65,2);
});
