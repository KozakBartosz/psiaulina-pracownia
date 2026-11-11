import {test,expect} from '@playwright/test';
test('usunięcie podsumowania wymaga potwierdzenia i odświeża listę',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:/Przykładowe podsumowanie/}).click();
 page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('button',{name:'Usuń podsumowanie',exact:true}).click();
 await expect(page.locator('.file.selected')).toHaveCount(1);
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Usuń podsumowanie',exact:true}).click();
 await expect(page.locator('.file')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Usuń podsumowanie',exact:true})).toHaveCount(0);
 await expect(page.locator('.status-message')).toContainText('Przeniesiono podsumowanie do Kosza');
 await page.getByRole('button',{name:'Szablon',exact:true}).click();
 await expect(page.getByRole('button',{name:'Usuń podsumowanie',exact:true})).toHaveCount(0);
});
