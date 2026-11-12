import {test,expect} from '@playwright/test';
test('ręczny podział stron i zapis odstępów razem z dokumentem',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:/Przykładowe podsumowanie/}).click();
 const editor=page.locator('.cm-content');await editor.fill('Pierwsza strona.');await editor.press('ControlOrMeta+End');
 await page.getByRole('button',{name:'Nowa strona',exact:true}).click();await editor.press('End');await page.keyboard.type('Druga strona.');
 await expect(editor).toContainText('<!-- pagebreak -->');
 await expect(page.locator('.pdf-page')).toHaveCount(2,{timeout:30000});
 await page.getByRole('button',{name:'Odstępy',exact:true}).click();
 await page.getByLabel('Interlinia',{exact:true}).selectOption('1.75');
 await page.getByLabel('Odstęp między akapitami',{exact:true}).selectOption('14');
 await page.getByLabel('Odstęp nad nagłówkami',{exact:true}).selectOption('8');
 await page.getByRole('button',{name:'Gotowe',exact:true}).click();
 await expect(editor).not.toContainText('psiaulina-layout');
 await page.getByRole('button',{name:'Zapisz',exact:true}).click();
 await page.getByRole('button',{name:'Wiedza',exact:true}).click();await page.getByRole('button',{name:'Podsumowania',exact:true}).click();await page.getByRole('button',{name:/Przykładowe podsumowanie/}).click();
 await page.getByRole('button',{name:'Odstępy',exact:true}).click();
 await expect(page.getByLabel('Interlinia',{exact:true})).toHaveValue('1.75');
 await expect(page.getByLabel('Odstęp między akapitami',{exact:true})).toHaveValue('14');
 await page.getByRole('button',{name:'Gotowe',exact:true}).click();
 await expect(page.locator('.pdf-page')).toHaveCount(2,{timeout:30000});
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Drukuj / PDF'}).click();await (await download).saveAs('test-results/page-break.pdf');
});

test('pojedynczy Enter łamie wiersz, a podwójny tworzy akapit w źródle PDF',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:/Przykładowe podsumowanie/}).click();
 await page.locator('.cm-content').fill('Pierwszy wiersz\nDrugi wiersz\n\nNowy akapit');
 const paragraphs=page.locator('.pdf-source .document-section > p');
 await expect(paragraphs).toHaveCount(2);
 await expect(paragraphs.first().locator('br')).toHaveCount(1);
 await expect(paragraphs.last()).toHaveText('Nowy akapit');
});
