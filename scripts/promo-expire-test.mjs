import { chromium } from 'playwright-core';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const cache = process.env.USERPROFILE + '\\AppData\\Local\\ms-playwright';
const dirs = readdirSync(cache).filter(d => d.startsWith('chromium-'));
const latest = dirs.sort().pop();
let exe = join(cache, latest, 'chrome-win64', 'chrome.exe');
if (!existsSync(exe)) exe = join(cache, latest, 'chrome-win', 'chrome.exe');

const browser = await chromium.launch({ executablePath: exe });
const errors = [];
const URL = 'http://localhost:5555/';

async function checkState(label, fakeNowIso) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`[${label}][pageerror] ` + e.message));
  if (fakeNowIso) {
    const fakeMs = new Date(fakeNowIso).getTime();
    await page.addInitScript(`Date.now = () => ${fakeMs};`);
  }
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000); // popup opens at 1.1s if active

  const modalInDom = await page.evaluate(() => !!document.getElementById('promo-modal'));
  const modalActive = await page.isVisible('#promo-modal.active');
  const card = await page.evaluate(() => {
    const tag = document.querySelector('#pkg-birthdays .birthday-card:first-child .birthday-tag');
    const price = document.querySelector('#pkg-birthdays .birthday-card:first-child .birthday-price');
    return {
      tag: tag?.textContent.trim(),
      price: price?.textContent.replace(/\s+/g, ' ').trim(),
      note: !!document.querySelector('#pkg-birthdays .bp-promo-note'),
    };
  });
  console.log(`[${label}] modal in DOM: ${modalInDom} | modal shown: ${modalActive} | card tag: "${card.tag}" | price: "${card.price}" | promo note: ${card.note}`);
  await ctx.close();
}

await checkState('AKTIVNA (danas)');
await checkState('ISTEKLA (2026-09-05)', '2026-09-05T12:00:00+02:00');
await checkState('POSLEDNJI DAN (2026-08-31 23:00)', '2026-08-31T23:00:00+02:00');

await browser.close();
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
