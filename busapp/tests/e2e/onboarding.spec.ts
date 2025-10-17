import { test, expect } from '@playwright/test';

const uniqueEmail = () => `test+${Date.now()}@example.com`;

test.describe('Authentication and onboarding flow', () => {
  test('user can sign up and finish onboarding', async ({ page }) => {
    const email = uniqueEmail();
    const password = 'Test1234!A';
    const ico = `${Math.floor(Math.random() * 90000000) + 10000000}`;

    // Signup
    await page.goto('/signup', { waitUntil: 'load' });
    await expect(page.getByRole('heading', { name: 'Registrace' })).toBeVisible();
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Celé jméno').fill('Playwright Tester');
    await page.getByLabel('Heslo').fill(password);
    await page.getByLabel('Název firmy').fill('Playwright s.r.o.');
    await page.getByLabel('IČO').fill(ico);
    await page.getByRole('button', { name: 'Registrovat' }).click();

    await expect(page).toHaveURL(/\/onboarding$/);

    // Step 1 - Address
    await expect(page.getByRole('heading', { name: 'Adresa firmy' })).toBeVisible();
    await page.getByLabel('Ulice a číslo popisné').fill('Testovací 123');
    await page.getByLabel('Město').fill('Praha');
    await page.getByLabel('PSČ').fill('11000');
    await page.getByRole('button', { name: 'Pokračovat' }).click();

    // Step 2 - Bank
    await expect(page.getByRole('heading', { name: 'Bankovní údaje' })).toBeVisible();
    await page.getByLabel('Číslo účtu (např. 123456789/0100)').fill('123456789/0100');
    await page.getByRole('button', { name: 'Pokračovat' }).click();

    // Step 3 - VAT settings
    await expect(page.getByRole('heading', { name: 'Nastavení DPH a fakturace' })).toBeVisible();
    await page.getByLabel('Jsem plátce DPH').check();
    await page.getByLabel('DIČ (nepovinné)').fill('CZ12345678');
    await page.getByLabel('Výchozí sazba DPH (%)').fill('21');
    await page.getByLabel('Prefix čísla faktury (nepovinné)').fill('PW');
    await page.getByLabel('Začátek číslování faktur').fill('1');
    await page.getByRole('button', { name: 'Dokončit nastavení' }).click();

    // Redirect to dashboard
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });
});
