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
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const errors = [];
page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
page.on('console', msg => { if (msg.type() === 'error') errors.push('[console.error] ' + msg.text()); });

await page.goto('http://localhost:5555/', { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(1500);

await page.screenshot({ path: 'scripts/shot-01-hero.png', fullPage: false });

// Hero with video — wait a beat for video to load + play
await page.waitForTimeout(2000);
await page.screenshot({ path: 'scripts/shot-02-hero-video.png', fullPage: false });

// Full gallery — scroll to start + screenshot whole section element
await page.evaluate(() => document.getElementById('gallery').scrollIntoView());
await page.waitForTimeout(1500);
await page.screenshot({ path: 'scripts/shot-03-gallery.png', fullPage: false });
const gallerySection = await page.$('#gallery');
if (gallerySection) {
  await gallerySection.screenshot({ path: 'scripts/shot-03b-gallery-full.png' });
}

// Contact section (social links)
await page.evaluate(() => document.getElementById('contact').scrollIntoView());
await page.waitForTimeout(1200);
const contact = await page.$('#contact');
if (contact) await contact.screenshot({ path: 'scripts/shot-08-contact-social.png' });
const footer = await page.$('footer.footer');
if (footer) await footer.screenshot({ path: 'scripts/shot-09-footer-social.png' });

// Reviews section
await page.evaluate(() => document.getElementById('reviews').scrollIntoView());
await page.waitForTimeout(1500);
const rev = await page.$('#reviews');
if (rev) await rev.screenshot({ path: 'scripts/shot-07-reviews.png' });

// Click first masonry item → lightbox
await page.evaluate(() => document.querySelector('.masonry-item').click());
await page.waitForTimeout(900);
await page.screenshot({ path: 'scripts/shot-04-lightbox.png', fullPage: false });

// Mobile viewport
await page.setViewportSize({ width: 375, height: 812 });
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(500);
await page.screenshot({ path: 'scripts/shot-05-mobile-hero.png', fullPage: false });

await page.evaluate(() => document.getElementById('gallery').scrollIntoView());
await page.waitForTimeout(1200);
await page.screenshot({ path: 'scripts/shot-06-mobile-gallery.png', fullPage: false });

console.log('screenshots written');
if (errors.length) {
  console.log('---ERRORS---');
  errors.forEach(e => console.log(e));
} else {
  console.log('no console errors');
}

await browser.close();
