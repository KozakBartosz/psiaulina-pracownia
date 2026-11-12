import {test,expect} from '@playwright/test';

test('wczytuje starszy zapis do edytora bez zapisu na dysku',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:/Przykładowe podsumowanie/}).click();
 const history=page.getByRole('button',{name:'Przywróć wersję',exact:true});
 await history.click();
 await expect(page.getByRole('dialog')).toContainText('Brak kopii zapasowych');
 await page.getByRole('button',{name:'Zamknij historię wersji'}).click();
 const editor=page.locator('.cm-content');
 const save=page.getByRole('button',{name:'Zapisz',exact:true});
 await editor.fill('Pierwsza wersja');
 await save.click();
 await expect(save).toBeDisabled();
 await editor.fill('Druga wersja');
 await save.click();
 await expect(save).toBeDisabled();

 await history.click();
 const restore=page.getByRole('button',{name:'Przywróć',exact:true});
 await expect(restore).toHaveCount(2);
 await restore.nth(1).click();
 await expect(editor).toHaveText('Pierwsza wersja');
 await expect(save).toBeEnabled();
 await expect(page.locator('.file')).toHaveCount(1);
 await history.click();
 await expect(restore).toHaveCount(2);
 await page.getByRole('button',{name:'Zamknij historię wersji'}).click();
 page.once('dialog',dialog=>dialog.accept());
 await page.getByRole('button',{name:'Odśwież',exact:true}).click();
 await expect(editor).toHaveText('Druga wersja');
});
