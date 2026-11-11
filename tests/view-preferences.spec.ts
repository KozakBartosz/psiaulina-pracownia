import {expect,test} from '@playwright/test';

test('zmienia skalę skrótami i zapamiętuje ustawienia widoku',async({page})=>{
 await page.goto('/');
 await page.keyboard.press('Control+=');
 await page.getByRole('button',{name:'Ustawienia'}).click();
 const scale=page.getByLabel('Skala interfejsu');
 const smooth=page.getByLabel('Płynne przewijanie');
 await expect(scale).toHaveValue('110');
 await page.keyboard.press('Control+-');
 await expect(scale).toHaveValue('100');
 await scale.selectOption('130');
 await expect(smooth).toBeChecked();
 await smooth.uncheck();
 await page.reload();
 await page.getByRole('button',{name:'Ustawienia'}).click();
 await expect(scale).toHaveValue('130');
 await expect(smooth).not.toBeChecked();
 await page.keyboard.press('Control+0');
 await expect(scale).toHaveValue('100');
});
