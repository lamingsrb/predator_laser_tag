import { chromium } from 'playwright-core';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const cache = process.env.USERPROFILE + '\\AppData\\Local\\ms-playwright';
const dirs = readdirSync(cache).filter(d => d.startsWith('chromium-')).sort();
const latest = dirs.pop();
let exe = join(cache, latest, 'chrome-win64', 'chrome.exe');
if (!existsSync(exe)) exe = join(cache, latest, 'chrome-win', 'chrome.exe');

const browser = await chromium.launch({ executablePath: exe });

// Desktop 1440
const deskCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const dp = await deskCtx.newPage();
await dp.goto('http://localhost:5555/', { waitUntil: 'networkidle' });
await dp.waitForTimeout(1500);

await dp.evaluate(() => document.getElementById('packages').scrollIntoView());
await dp.waitForTimeout(1000);
const pkg = await dp.$('#packages');
if (pkg) await pkg.screenshot({ path: 'scripts/pkg-desktop.png' });

await dp.evaluate(() => document.getElementById('birthdays').scrollIntoView());
await dp.waitForTimeout(1000);
const bd = await dp.$('#birthdays');
if (bd) await bd.screenshot({ path: 'scripts/bday-desktop.png' });

await dp.evaluate(() => document.getElementById('iznajmljivanje').scrollIntoView());
await dp.waitForTimeout(1000);
const vn = await dp.$('#iznajmljivanje');
if (vn) await vn.screenshot({ path: 'scripts/venue-desktop.png' });

// Mobile 390
const mCtx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 3,
});
const mp = await mCtx.newPage();
await mp.goto('http://localhost:5555/', { waitUntil: 'networkidle' });
await mp.waitForTimeout(1500);

await mp.evaluate(() => document.getElementById('packages').scrollIntoView());
await mp.waitForTimeout(1000);
const pkgM = await mp.$('#packages');
if (pkgM) await pkgM.screenshot({ path: 'scripts/pkg-mobile.png' });

await mp.evaluate(() => document.getElementById('birthdays').scrollIntoView());
await mp.waitForTimeout(1000);
const bdM = await mp.$('#birthdays');
if (bdM) await bdM.screenshot({ path: 'scripts/bday-mobile.png' });

await browser.close();
console.log('done');
