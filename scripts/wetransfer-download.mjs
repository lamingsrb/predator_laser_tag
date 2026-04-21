#!/usr/bin/env node
/**
 * Download one or more WeTransfer transfers via Playwright.
 *
 * Usage:
 *   node scripts/wetransfer-download.mjs <url> [<url> ...] [--out <dir>] [--prefix <p>]
 *
 * Examples:
 *   node scripts/wetransfer-download.mjs https://we.tl/t-AbCdEfGhIj
 *   node scripts/wetransfer-download.mjs --out Media_RAW/new_pack \
 *     https://we.tl/t-AaAaAaAa https://we.tl/t-BbBbBbBb
 *   node scripts/wetransfer-download.mjs --prefix photos_ https://we.tl/t-XYZ
 *
 * Notes:
 *   - Runs Chromium headful (user can see progress). Add --headless to hide.
 *   - Handles cookie consent, 'I agree' terms, and the Download click.
 *   - Downloads are saved via ctx.on('download') with an explicit Promise
 *     so browser.close() never fires before saveAs() resolves (the most
 *     common failure mode for WeTransfer scripts).
 *   - Exit codes: 0 all saved, 1 any link failed, 2 bad args.
 *
 * Requires: playwright-core (already in devDeps), Chromium cached under
 *   $USERPROFILE/AppData/Local/ms-playwright/chromium-*/ (run `npx playwright
 *   install chromium` once if missing).
 */
import { chromium } from 'playwright-core';
import { existsSync, readdirSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

function parseArgs(argv) {
  const args = { urls: [], out: null, prefix: '', headless: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out')     args.out = argv[++i];
    else if (a === '--prefix') args.prefix = argv[++i];
    else if (a === '--headless') args.headless = true;
    else if (a.startsWith('http')) args.urls.push(a);
    else {
      console.error(`Unknown arg: ${a}`);
      process.exit(2);
    }
  }
  if (!args.urls.length) {
    console.error('No URL given. See header comment for usage.');
    process.exit(2);
  }
  return args;
}

function findChromium() {
  const cache = process.env.USERPROFILE + '\\AppData\\Local\\ms-playwright';
  if (!existsSync(cache)) return null;
  const dirs = readdirSync(cache).filter(d => d.startsWith('chromium-')).sort();
  if (!dirs.length) return null;
  const latest = dirs.pop();
  const a = join(cache, latest, 'chrome-win64', 'chrome.exe');
  const b = join(cache, latest, 'chrome-win',   'chrome.exe');
  return existsSync(a) ? a : (existsSync(b) ? b : null);
}

async function clickIfVisible(page, selector, timeout = 2000) {
  try {
    const loc = page.locator(selector).first();
    if (await loc.isVisible({ timeout })) {
      await loc.click();
      return true;
    }
  } catch {}
  return false;
}

async function downloadOne(ctx, url, outDir, prefix) {
  const page = await ctx.newPage();
  console.log(`[open] ${url}`);

  // Listen for downloads BEFORE the click — ctx-level so popup windows count.
  let savedPath = null;
  let saveErr = null;
  const savedPromise = new Promise((resolveSave) => {
    const handler = async (dl) => {
      try {
        const fname = dl.suggestedFilename();
        const dest  = join(outDir, prefix + fname);
        console.log(`[downloading] ${fname}`);
        await dl.saveAs(dest);
        savedPath = dest;
        console.log(`[saved] ${dest}`);
      } catch (e) {
        saveErr = e;
        console.log(`[save err] ${e.message}`);
      } finally {
        ctx.off('download', handler);
        resolveSave();
      }
    };
    ctx.on('download', handler);
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  } catch (e) {
    console.log(`[nav err] ${e.message}`);
    await page.close();
    return null;
  }
  await page.waitForTimeout(5500);

  // 1. Outer-site cookie consent
  for (const s of ['button:has-text("I Accept")', 'button:has-text("Accept all")', 'button:has-text("Prihvati")']) {
    if (await clickIfVisible(page, s, 1500)) {
      await page.waitForTimeout(1000);
      break;
    }
  }

  // 2. Transfer-page "I agree" terms — varies in casing, try all
  let agreed = false;
  for (const s of [
    'button:has-text("I agree")', 'button:has-text("I Agree")',
    'button:has-text("Agree")',   'button:has-text("Prihvatam")',
  ]) {
    if (await clickIfVisible(page, s, 2000)) {
      agreed = true;
      await page.waitForTimeout(3500);
      break;
    }
  }
  if (!agreed) console.log('[info] no "I agree" button appeared (probably already accepted)');

  // 3. Quick sanity dump — page text is useful debug if download fails later
  try {
    const body = await page.evaluate(() => document.body.innerText.slice(0, 600));
    if (/can't be found|Yikes/i.test(body)) {
      console.log('[error] transfer not found (expired or bad link)');
      await page.close();
      return null;
    }
  } catch {}

  // 4. Click Download — waitForEvent is unreliable for popup-based downloads,
  // so we rely on the ctx listener + savedPromise instead.
  let clicked = false;
  for (const s of ['button:has-text("Download")', 'a:has-text("Download")']) {
    if (await clickIfVisible(page, s, 4000)) {
      console.log('[click] Download');
      clicked = true;
      break;
    }
  }
  if (!clicked) {
    console.log('[error] Download button not found');
    await page.close();
    return null;
  }

  // 5. Wait for saveAs to resolve (large archives can take minutes)
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('save timeout')), 15 * 60 * 1000));
  try {
    await Promise.race([savedPromise, timeout]);
  } catch (e) {
    console.log(`[error] ${e.message}`);
  }

  await page.close();
  return saveErr ? null : savedPath;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outDir = resolve(args.out || 'Media_RAW/wetransfer_' + new Date().toISOString().slice(0, 10));
  mkdirSync(outDir, { recursive: true });
  console.log(`[out] ${outDir}`);

  const exe = findChromium();
  if (!exe) {
    console.error('Chromium not found. Run: npx playwright install chromium');
    process.exit(1);
  }

  const browser = await chromium.launch({ executablePath: exe, headless: args.headless });
  const ctx = await browser.newContext({ acceptDownloads: true });

  let ok = 0, fail = 0;
  for (const url of args.urls) {
    const res = await downloadOne(ctx, url, outDir, args.prefix);
    if (res) ok++; else fail++;
  }

  await browser.close();
  console.log(`\n[summary] ok=${ok}  fail=${fail}  out=${outDir}`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
