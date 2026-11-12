import {test,expect} from '@playwright/test';
test('długi dokument zawija wiersze, mieści edytor i dzieli podgląd na strony A4',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:/Przykładowe podsumowanie/}).click();
 const text=Array.from({length:40},(_,i)=>`## Część ${i+1}\n\n${'Długi akapit o spokojnych spacerach, odpoczynku i potrzebach psa. '.repeat(10)}\n\n`).join('');
 await page.locator('.cm-content').fill(text);
 const geometry=await page.locator('.cm-scroller').evaluate(el=>({width:el.clientWidth,scrollWidth:el.scrollWidth,height:el.clientHeight,wrapping:el.querySelector('.cm-content')?.classList.contains('cm-lineWrapping')}));
 expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width+2);

 expect(geometry.wrapping).toBe(true);
 await page.locator('.editor').evaluate(el=>{el.scrollTop=0});
 await page.locator('.editor').hover();
 await page.mouse.wheel(0,600);
 await expect.poll(()=>page.locator('.editor').evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
 const toolbarTop=await page.locator('.format-toolbar').evaluate(el=>el.getBoundingClientRect().top);
 const editorTop=await page.locator('.editor').evaluate(el=>el.getBoundingClientRect().top);
 expect(Math.abs(toolbarTop-editorTop)).toBeLessThanOrEqual(1);
 await expect(page.locator('.pdf-page canvas').first()).toBeVisible({timeout:30000});
 await expect.poll(()=>page.locator('.pdf-page').count()).toBeGreaterThan(1);
 await expect(page.locator('.pdf-page canvas').first()).toHaveAttribute('data-rendered','true');
 await page.screenshot({path:'test-results/long-document.png'});
});

test('tryb Podgląd wykorzystuje całą szerokość dla wiedzy i A4',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:/Przykładowe podsumowanie/}).click();
 await page.getByRole('button',{name:'Podgląd',exact:true}).click();
 const check=async()=>{
  const box=await page.locator('main').boundingBox();
  const workspace=await page.locator('.workspace').boundingBox();
  const preview=await page.locator('section.preview').boundingBox();
  expect(Math.abs(workspace!.width-box!.width)).toBeLessThan(2);
  expect(Math.abs(preview!.width-workspace!.width)).toBeLessThan(2);
 };
 await check();
 await page.getByRole('button',{name:'Wiedza',exact:true}).click();await page.getByRole('button',{name:/Przykładowa wiedza/}).click();
 await check();
 await expect(page.locator('.knowledge .paper')).toBeVisible();
});

test('uchwyty zmieniają szerokość paneli, a zwinięte menu otwiera listę plików',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:/Przykładowe podsumowanie/}).click();
 const sidebar=page.getByRole('separator',{name:'Szerokość lewego menu'});
 const split=page.getByRole('separator',{name:'Podział edytora i podglądu'});
 const drag=async(handle:typeof sidebar,delta:number)=>{
  const box=(await handle.boundingBox())!;
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  await page.mouse.down();
  await page.mouse.move(box.x+box.width/2+delta,box.y+box.height/2,{steps:8});
  await page.mouse.up();
 };
 await drag(sidebar,-90);
 await expect(page.getByRole('button',{name:'Wiedza',exact:true}).locator('span')).toBeHidden();
 const title=page.locator('#file-sidebar .list-title');
 const count=page.locator('#file-sidebar .list-tools small');
 const add=page.getByRole('button',{name:'Nowy dokument',exact:true});
 await expect(title).toBeVisible();
 await expect(page.locator('#file-sidebar .file').first().locator('svg').first()).toBeVisible();
 const titleBox=(await title.boundingBox())!;
 expect((await count.boundingBox())!.y).toBeGreaterThanOrEqual(titleBox.y+titleBox.height);
 expect((await add.boundingBox())!.y).toBeGreaterThanOrEqual(titleBox.y+titleBox.height);
 const editorWidth=(await page.locator('.editor').boundingBox())!.width;
 await drag(split,100);
 expect((await page.locator('.editor').boundingBox())!.width).toBeGreaterThan(editorWidth);
 await drag(sidebar,-125);
 await expect(page.locator('#file-sidebar')).toBeHidden();
 const menu=page.getByRole('button',{name:'Otwórz menu plików'});
 await menu.click();
 await expect(page.getByRole('button',{name:/Przykładowe podsumowanie/})).toBeVisible();
 await page.getByRole('button',{name:'Zamknij menu plików'}).click();
 await expect(menu).toBeFocused();
 await sidebar.press('End');
 await expect(page.locator('#file-sidebar')).toBeVisible();
 await expect.poll(async()=>{
  const nav=(await page.locator('#file-sidebar nav').boundingBox())!;
  const toolbar=(await page.locator('.editor-toolbar').boundingBox())!;
  return Math.abs(nav.y+nav.height-toolbar.y-toolbar.height);
 }).toBeLessThan(1);
});
