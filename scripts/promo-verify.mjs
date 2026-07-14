import { chromium } from 'playwright-core';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Find installed chromium binary
const cache = process.env.USERPROFILE + '\\AppData\\Local\\ms-playwright';
const dirs = readdirSync(cache).filter(d => d.startsWith('chromium-'));
const latest = dirs.sort().pop();
let exe = join(cache, latest, 'chrome-win64', 'chrome.exe');
if (!existsSync(exe)) exe = join(cache, latest, 'chrome-win', 'chrome.exe');
if (!existsSync(exe)) { console.error('no chromium:', exe); process.exit(1); }

const browser = await chromium.launch({ executablePath: exe });
const errors = [];
const URL = 'http://localhost:5555/';

function wire(page) {
  page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push('[console.error] ' + msg.text() + ' @ ' + (msg.location()?.url || '?')); });
  page.on('requestfailed', req => errors.push('[requestfailed] ' + req.url() + ' — ' + (req.failure()?.errorText || '?')));
}

// ---------- DESKTOP ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  wire(page);
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#promo-modal.active', { timeout: 15000 });
  await page.waitForTimeout(800); // let open transition finish

  const visible = await page.isVisible('#promo-modal.active');
  console.log('desktop popup visible:', visible);
  await page.screenshot({ path: 'scripts/promo-desktop.png' });

  // Close via X
  await page.click('.promo-close');
  await page.waitForTimeout(600);
  const closed = !(await page.isVisible('#promo-modal.active'));
  console.log('desktop popup closed via X:', closed);

  // Reload same session — must NOT reappear
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const reappeared = await page.isVisible('#promo-modal.active');
  console.log('desktop popup suppressed on same-session reload:', !reappeared);

  // Standard card promo price
  await page.evaluate(() => document.getElementById('packages').scrollIntoView());
  await page.waitForTimeout(1500);
  const pkg = await page.$('#packages');
  if (pkg) await pkg.screenshot({ path: 'scripts/promo-pkg-desktop.png' });

  await ctx.close();
}

// ---------- DESKTOP: CTA "POGLEDAJ PAKET" closes modal + scrolls ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  wire(page);
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#promo-modal.active', { timeout: 15000 });
  await page.waitForTimeout(800);
  await page.click('.promo-cta-group a[href="#packages"]');
  await page.waitForTimeout(1500);
  const closed = !(await page.isVisible('#promo-modal.active'));
  const scrolled = await page.evaluate(() => window.scrollY > 300);
  console.log('CTA closes modal:', closed, '| scrolled to packages:', scrolled);
  await page.screenshot({ path: 'scripts/promo-after-cta.png' });
  await ctx.close();
}

// ---------- MOBILE ----------
{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  });
  const page = await ctx.newPage();
  wire(page);
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#promo-modal.active', { timeout: 15000 });
  await page.waitForTimeout(800);
  const visible = await page.isVisible('#promo-modal.active');
  console.log('mobile popup visible:', visible);
  // Card must fit in viewport (no vertical overflow)
  const fits = await page.evaluate(() => {
    const r = document.querySelector('.promo-card').getBoundingClientRect();
    return r.top >= 0 && r.bottom <= window.innerHeight && r.left >= 0 && r.right <= window.innerWidth;
  });
  console.log('mobile card fits viewport:', fits);
  await page.screenshot({ path: 'scripts/promo-mobile.png' });

  // ESC key path is desktop-only; close via backdrop tap
  await page.tap('.promo-backdrop', { position: { x: 10, y: 10 } });
  await page.waitForTimeout(600);
  console.log('mobile popup closed via backdrop:', !(await page.isVisible('#promo-modal.active')));

  await page.evaluate(() => document.getElementById('packages').scrollIntoView());
  await page.waitForTimeout(1500);
  const pkg = await page.$('#packages');
  if (pkg) await pkg.screenshot({ path: 'scripts/promo-pkg-mobile.png' });
  await ctx.close();
}

await browser.close();
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console/page errors');
