import {test,expect} from '@playwright/test';
test('edycja wiedzy zachowuje nazwę i blokuje tworzenie oraz usuwanie',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Wiedza',exact:true}).click();
 await expect(page.getByRole('button',{name:'Nowy dokument',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:/Przykładowa wiedza/}).click();
 await expect(page.getByLabel('Nazwa dokumentu')).toHaveAttribute('readonly','');
 await page.locator('.cm-content').fill('## Zmieniona wiedza\n\nNowa treść istniejącego materiału.');
 page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('button',{name:'Podsumowania',exact:true}).click();
 await expect(page.getByLabel('Nazwa dokumentu')).toHaveValue('Przykładowa wiedza');
 await page.getByRole('button',{name:'Zapisz',exact:true}).click();
 await expect(page.getByRole('button',{name:'Zapisz',exact:true})).toBeDisabled();
 await expect(page.locator('.knowledge .markdown')).toContainText('Zmieniona wiedza');
 await expect(page.getByRole('button',{name:'Usuń podsumowanie',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Podsumowania',exact:true}).click();await page.getByRole('button',{name:'Wiedza',exact:true}).click();await page.getByRole('button',{name:/Przykładowa wiedza/}).click();
 await expect(page.locator('.cm-content')).toContainText('Nowa treść istniejącego materiału.');
});

test('główny AGENTS.md jest przypięty nad wiedzą i zachowuje zapis',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Wiedza',exact:true}).click();
 const agents=page.locator('.file-list .file').first();
 await expect(agents).toHaveClass(/agents-file/);
 await expect(agents).toContainText('AGENTS.md');
 await expect(agents).toContainText('Instrukcje główne');
 await agents.click();
 await expect(page.getByLabel('Nazwa dokumentu')).toHaveValue('AGENTS');
 await expect(page.getByRole('button',{name:'Zapisz',exact:true})).toBeDisabled();
 await page.locator('.cm-content').fill('# Instrukcje główne\n\nZaktualizowana instrukcja.');
 await page.getByRole('button',{name:'Zapisz',exact:true}).click();
 await expect(page.getByRole('button',{name:'Zapisz',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:/Przykładowa wiedza/}).click();await agents.click();
 await expect(page.locator('.cm-content')).toContainText('Zaktualizowana instrukcja.');
 await expect(page.locator('.file-list .agents-file')).toHaveCount(1);
});
