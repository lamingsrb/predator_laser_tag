import { chromium } from 'playwright-core';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const cache = process.env.USERPROFILE + '\\AppData\\Local\\ms-playwright';
const dirs = readdirSync(cache).filter(d => d.startsWith('chromium-')).sort();
const latest = dirs.pop();
let exe = join(cache, latest, 'chrome-win64', 'chrome.exe');
if (!existsSync(exe)) exe = join(cache, latest, 'chrome-win', 'chrome.exe');

const browser = await chromium.launch({ executablePath: exe, headless: false });
const ctx = await browser.newContext({ locale: 'sr-RS', viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const mapsUrl = 'https://www.google.com/maps/place/Ro%C4%91endaonica+Laser+Tag+Beograd+Predator/@44.7930654,20.5369601,17z/data=!3m1!4b1!4m6!3m5!1s0x475a7b23825c063b:0xe12c11a8cf7f6f9a!8m2!3d44.7930654!4d20.5369601!16s%2Fg%2F11h0334qwl';

console.log('Opening Maps place page...');
await page.goto(mapsUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(8000);

// Dump all anchors that might be write-review links
const urls = await page.$$eval('a[href]', as => as.map(a => a.href));
console.log('\n=== All Maps URLs after load ===');
const filtered = urls.filter(u => /writereview|review|contrib|lrd=/.test(u));
[...new Set(filtered)].forEach(u => console.log(u));

// Search page source for writereview URL constructs
const html = await page.content();
const patterns = [
  /https?:\/\/[^"'\s]*writereview[^"'\s]*/gi,
  /https?:\/\/search\.google\.com\/local[^"'\s]*/gi,
  /https?:\/\/www\.google\.com\/maps[^"'\s]*lrd=[^"'\s]*/gi,
];
console.log('\n=== Patterns in HTML ===');
for (const p of patterns) {
  const m = [...new Set(html.match(p) || [])];
  m.slice(0, 5).forEach(h => console.log('  ', h));
}

// Try clicking "Write a review" button if visible
console.log('\n=== Looking for Write a review button ===');
const writeBtn = await page.$('button:has-text("Write a review"), button:has-text("Napiši recenziju"), [aria-label*="review" i]');
if (writeBtn) {
  console.log('Found button, listening for nav...');
  const [popup] = await Promise.all([
    page.context().waitForEvent('page', { timeout: 5000 }).catch(() => null),
    writeBtn.click().catch(e => console.log('click err', e.message))
  ]);
  await page.waitForTimeout(3000);
  if (popup) {
    await popup.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
    console.log('POPUP URL:', popup.url());
  } else {
    console.log('No popup, current page URL:', page.url());
  }
} else {
  console.log('No write-review button found on initial view');
}

await browser.close();
