import { chromium } from 'playwright-core';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const cache = process.env.USERPROFILE + '\\AppData\\Local\\ms-playwright';
const dirs = readdirSync(cache).filter(d => d.startsWith('chromium-')).sort();
const latest = dirs.pop();
let exe = join(cache, latest, 'chrome-win64', 'chrome.exe');
if (!existsSync(exe)) exe = join(cache, latest, 'chrome-win', 'chrome.exe');

const browser = await chromium.launch({ executablePath: exe });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 3,
});
const page = await ctx.newPage();

await page.goto('http://localhost:5555/', { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(2000);

const sections = [
  ['hero', null, 'mob-01-hero.png'],
  ['about', '#about', 'mob-02-about.png'],
  ['experience', '#experience', 'mob-03-experience.png'],
  ['packages', '#packages', 'mob-04-packages.png'],
  ['birthdays', '#birthdays', 'mob-05-birthdays.png'],
  ['gallery', '#gallery', 'mob-06-gallery.png'],
  ['reviews', '#reviews', 'mob-07-reviews.png'],
  ['contact', '#contact', 'mob-08-contact.png'],
];

for (const [name, sel, file] of sections) {
  if (sel) {
    await page.evaluate(s => document.querySelector(s).scrollIntoView(), sel);
    await page.waitForTimeout(1500);
  } else {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: `scripts/${file}`, fullPage: false });
  console.log('wrote', file);
}

// full gallery
await page.evaluate(() => document.getElementById('gallery').scrollIntoView());
await page.waitForTimeout(1000);
const gal = await page.$('#gallery');
if (gal) await gal.screenshot({ path: 'scripts/mob-06b-gallery-full.png' });

const rev = await page.$('#reviews');
await page.evaluate(() => document.getElementById('reviews').scrollIntoView());
await page.waitForTimeout(1000);
if (rev) await rev.screenshot({ path: 'scripts/mob-07b-reviews-full.png' });

await browser.close();
console.log('done');
