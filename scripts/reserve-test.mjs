import { chromium } from 'playwright-core';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const cache = process.env.USERPROFILE + '\\AppData\\Local\\ms-playwright';
const dirs = readdirSync(cache).filter(d => d.startsWith('chromium-')).sort();
const latest = dirs.pop();
let exe = join(cache, latest, 'chrome-win64', 'chrome.exe');
if (!existsSync(exe)) exe = join(cache, latest, 'chrome-win', 'chrome.exe');

const browser = await chromium.launch({ executablePath: exe });

// === DESKTOP test
console.log('--- DESKTOP test ---');
const dctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const dp = await dctx.newPage();
await dp.goto('http://localhost:5555/', { waitUntil: 'networkidle' });
await dp.waitForTimeout(1500);

// Find first REZERVIŠI button (in PAKETI)
await dp.evaluate(() => document.getElementById('packages').scrollIntoView());
await dp.waitForTimeout(800);

const beforeY = await dp.evaluate(() => window.scrollY);
console.log('  scrollY before click:', beforeY);

const reserveBtn = await dp.$('a[href="tel:+381645257777"]');
if (reserveBtn) {
  await reserveBtn.click();
  await dp.waitForTimeout(1500);
  const afterY = await dp.evaluate(() => window.scrollY);
  console.log('  scrollY after click:', afterY);

  const contactRect = await dp.evaluate(() => {
    const c = document.getElementById('contact');
    return { top: c.getBoundingClientRect().top };
  });
  console.log('  contact section top (relative):', contactRect.top);
  console.log('  desktop scroll behavior:', Math.abs(contactRect.top) < 100 ? 'OK (contact in view)' : 'FAIL');
}
await dp.screenshot({ path: 'scripts/reserve-desktop-after.png' });

// === MOBILE test (default tel: should NOT scroll)
console.log('\n--- MOBILE test ---');
const mctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true, hasTouch: true,
  deviceScaleFactor: 3,
});
const mp = await mctx.newPage();
await mp.goto('http://localhost:5555/', { waitUntil: 'networkidle' });
await mp.waitForTimeout(1500);

await mp.evaluate(() => document.getElementById('packages').scrollIntoView());
await mp.waitForTimeout(800);

// Capture if tel: navigation is triggered (it would try to open tel: scheme)
const navTel = [];
mp.on('framenavigated', f => {
  const u = f.url();
  if (u.startsWith('tel:')) navTel.push(u);
});

const mBeforeY = await mp.evaluate(() => window.scrollY);
const mBtn = await mp.$('a[href="tel:+381645257777"]');
if (mBtn) {
  await mBtn.click().catch(() => {}); // tel: scheme will throw in headless
  await mp.waitForTimeout(800);
  const mAfterY = await mp.evaluate(() => window.scrollY);
  console.log('  scrollY before:', mBeforeY, 'after:', mAfterY);
  console.log('  scroll change:', Math.abs(mAfterY - mBeforeY) < 50 ? 'no scroll (default tel: action)' : 'SCROLLED (BUG)');
  console.log('  href stays tel:?', await mBtn.getAttribute('href'));
}

await browser.close();
console.log('\ndone');
