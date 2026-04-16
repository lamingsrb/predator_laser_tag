import { chromium } from 'playwright-core';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const cache = process.env.USERPROFILE + '\\AppData\\Local\\ms-playwright';
const dirs = readdirSync(cache).filter(d => d.startsWith('chromium-')).sort();
const latest = dirs.pop();
let exe = join(cache, latest, 'chrome-win64', 'chrome.exe');
if (!existsSync(exe)) exe = join(cache, latest, 'chrome-win', 'chrome.exe');

const browser = await chromium.launch({ executablePath: exe, headless: true });
const ctx = await browser.newContext({ locale: 'sr-RS' });
const page = await ctx.newPage();

page.on('framenavigated', f => {
  if (f === page.mainFrame()) console.log('NAV:', f.url());
});

// Go to Google search with the kgmid - loads the knowledge panel with Write a Review button
await page.goto('https://www.google.com/search?hl=sr&kgmid=/g/11h0334qwl&q=Predator+Laser+Tag+Beograd', {
  waitUntil: 'networkidle', timeout: 30000
}).catch(e => console.log('err', e.message));
await page.waitForTimeout(3000);

// Extract ALL href attributes on the page that contain Google review-relevant params
const links = await page.$$eval('a[href]', as => as.map(a => a.href));
const interesting = links.filter(h =>
  /writereview|lrd=|ChIJ|0x[0-9a-f]+:0x|placeid=|place_id=|ftid=|g\.page\/r\/|maps\.app/.test(h)
);
console.log('\nInteresting links (' + interesting.length + '):');
interesting.slice(0, 20).forEach(h => console.log('  ', h));

// Inline scripts / data attributes often hold the Place ID
const scripts = await page.$$eval('script', ss => ss.map(s => s.textContent).join('\n').slice(0, 1_500_000));
const pool = scripts + '\n' + await page.content();
const idPatterns = {
  ChIJ: /ChIJ[A-Za-z0-9_-]{20,30}/g,
  ftid: /0x[0-9a-f]{12,20}:0x[0-9a-f]{1,20}/gi,
  cid: /\bcid=(\d{15,25})\b/gi,
};
console.log('\nID patterns found in page:');
for (const [name, rx] of Object.entries(idPatterns)) {
  const m = [...new Set(pool.match(rx) || [])];
  if (m.length) console.log('  ', name, ':', m.slice(0, 5).join(', '));
}
const finalUrl = page.url();
console.log('\nFINAL URL:', finalUrl);

// Try to find place ID in HTML content
const html = await page.content();
const patterns = [
  /ChIJ[A-Za-z0-9_-]{20,30}/g,
  /0x[0-9a-f]{8,20}:0x[0-9a-f]{1,20}/gi,
  /placeid=([^&"'\s]+)/gi,
  /place_id["':=\s]+([A-Za-z0-9_-]+)/gi,
  /ftid=([^&"'\s]+)/gi,
  /!1s(0x[0-9a-f]+:0x[0-9a-f]+)/gi,
  /cid=(\d+)/gi,
];
console.log('\nMATCHES:');
for (const p of patterns) {
  const matches = [...new Set(html.match(p) || [])];
  if (matches.length) console.log('  ', p.source, '=>', matches.slice(0, 5).join(', '));
}

// Check if "Write a review" button exists and get its onclick
const writeBtn = await page.$('[jsname="V67aGc"]');
if (writeBtn) {
  const parentHref = await writeBtn.evaluate(el => {
    let p = el;
    while (p) {
      if (p.tagName === 'A' && p.href) return p.href;
      if (p.hasAttribute && p.hasAttribute('data-url')) return p.getAttribute('data-url');
      p = p.parentElement;
    }
    return null;
  });
  console.log('\nWrite review button parent href:', parentHref);
}

await browser.close();
