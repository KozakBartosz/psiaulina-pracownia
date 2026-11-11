import {test,expect} from '@playwright/test';

test('kolory zaznaczenia, ponowna zmiana koloru i pomarańczowe znaczniki w PDF',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:/Przykładowe podsumowanie/}).click();
 const editor=page.locator('.cm-content');
 await editor.fill('Ważna wskazówka');await editor.press('ControlOrMeta+a');
 await page.getByRole('button',{name:'Kolor tekstu: pomarańczowy',exact:true}).click();
 await expect(page.locator('.pdf-source span[style]')).toHaveText('Ważna wskazówka');
 await expect(page.locator('.pdf-source span[style]')).toHaveCSS('color','rgb(255, 80, 27)');
 await page.getByRole('button',{name:'Kolor tekstu: brązowy',exact:true}).click();
 await expect(page.locator('.pdf-source span[style]')).toHaveCount(1);
 await expect(page.locator('.pdf-source span[style]')).toHaveCSS('color','rgb(72, 42, 48)');
 await editor.fill('## Plan\n\n- **Ważna** wskazówka\n- Drugi punkt\n\n1. Pierwszy krok');await editor.press('ControlOrMeta+a');
 await page.getByRole('button',{name:'Kolor tekstu: pomarańczowy',exact:true}).click();
 await expect(page.locator('.pdf-source h2')).toHaveText('Plan');
 await expect(page.locator('.pdf-source ul li')).toHaveCount(2);
 await expect(page.locator('.pdf-source strong')).toHaveText('Ważna');
 await page.getByRole('button',{name:'Zapisz',exact:true}).click();
 await page.getByRole('button',{name:'Wiedza',exact:true}).click();
 await page.getByRole('button',{name:'Podsumowania',exact:true}).click();
 await page.getByRole('button',{name:/Przykładowe podsumowanie/}).click();
 await expect(page.locator('.pdf-source ul li span').first()).toHaveCSS('color','rgb(255, 80, 27)');
 await expect(page.locator('.pdf-page canvas').first()).toHaveAttribute('data-rendered','true',{timeout:30000});
 await page.screenshot({path:'test-results/colours.png'});
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Drukuj / PDF'}).click();await (await download).saveAs('test-results/colours.pdf');
 // List text stays brown; orange markers are rendered separately by PDFMake.
 await editor.fill('- Zwykły tekst\n- Kolejny punkt\n\n1. Numerowany punkt');
 await expect(page.locator('.pdf-pages')).toHaveAttribute('aria-busy','false',{timeout:30000});
 await expect(page.locator('.pdf-page canvas').first()).toHaveAttribute('data-rendered','true',{timeout:30000});
 const orange=await page.locator('.pdf-page canvas').first().evaluate(element=>{
  const canvas=element as HTMLCanvasElement;
  const data=canvas.getContext('2d')!.getImageData(0,150,canvas.width,250).data;
  let count=0;for(let i=0;i<data.length;i+=4)if(data[i]>200&&data[i+1]<130&&data[i+2]<80)count++;
  return count;
 });
 expect(orange).toBeGreaterThan(5);
});

test('HTML dokumentu nie uruchamia kodu i przepuszcza tylko dozwolone kolory',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:/Przykładowe podsumowanie/}).click();
 await page.locator('.cm-content').fill('<span style="color:#ff501b" onclick="alert(1)">Kolor</span> <span style="position:fixed;color:red">Obcy styl</span><script>alert(1)</script>');
 await expect(page.locator('.pdf-source span').first()).toHaveCSS('color','rgb(255, 80, 27)');
 await expect(page.locator('.pdf-source [onclick], .pdf-source script')).toHaveCount(0);
 await expect(page.locator('.pdf-source span').nth(1)).not.toHaveAttribute('style');
});
