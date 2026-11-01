#!/usr/bin/env node
/**
 * Pulls the newest Google reviews plus the current rating / review count for
 * the Predator place via SerpAPI and rewrites public/reviews.json when anything
 * changed. Runs daily from .github/workflows/update-reviews.yml, so the site
 * always shows the latest reviews without anyone editing the JSON by hand.
 *
 * - Reviews come from engine=google_maps_reviews, sort_by=newestFirst.
 * - Only reviews with rating >= MIN_RATING and real text are kept; the newest
 *   MAX_REVIEWS of them are stored, sorted by date (newest first).
 * - Each review keeps its ISO date; the site turns it into "pre 3 dana" in the
 *   browser, so the label never goes stale between runs.
 * - Steady state is 1 SerpAPI search per run (rating + count come in the same
 *   response). More pages are fetched only to seed an empty list or when more
 *   new reviews arrived since the last run than fit on the first page.
 *
 * Usage:
 *   SERPAPI_KEY=... node scripts/update-reviews.mjs
 *
 * Exit codes:
 *   0 = success (file updated OR already current)
 *   1 = SerpAPI request failed / no key
 *   2 = response parsed but missing required fields (reviews.json left as is)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_REVIEWS = 10;     // how many cards the site shows
const MIN_RATING = 4;       // never show 1-3★ reviews on the site
const MIN_TEXT_LENGTH = 10; // skip rating-only / one-word reviews
const MAX_PAGES = 3;        // hard cap on SerpAPI searches per run

const __dirname = dirname(fileURLToPath(import.meta.url));
const REVIEWS_PATH = resolve(__dirname, '..', 'public', 'reviews.json');

const KEY = process.env.SERPAPI_KEY;
if (!KEY) {
  console.error('[err] SERPAPI_KEY env var is not set');
  process.exit(1);
}

// ftid (Google Maps data_id) and placeId from reviews.json — canonical IDs for Rođendaonica Laser Tag Beograd Predator
const current = JSON.parse(readFileSync(REVIEWS_PATH, 'utf8'));
if (!current.ftid || !current.placeId) {
  console.error('[err] ftid / placeId missing from reviews.json');
  process.exit(2);
}

// Endpoint docs: https://serpapi.com/google-maps-reviews-api
async function serpapi(params) {
  const url = new URL('https://serpapi.com/search.json');
  for (const [k, v] of Object.entries({ ...params, hl: 'sr', api_key: KEY })) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    console.error(`[err] SerpAPI ${res.status}: ${data.error || ''}`);
    process.exit(1);
  }
  return data;
}

// The site is in Latin script — Serbian Cyrillic names/texts are transliterated.
const CYR = {
  А: 'A', Б: 'B', В: 'V', Г: 'G', Д: 'D', Ђ: 'Đ', Е: 'E', Ж: 'Ž', З: 'Z', И: 'I', Ј: 'J', К: 'K', Л: 'L', Љ: 'Lj', М: 'M',
  Н: 'N', Њ: 'Nj', О: 'O', П: 'P', Р: 'R', С: 'S', Т: 'T', Ћ: 'Ć', У: 'U', Ф: 'F', Х: 'H', Ц: 'C', Ч: 'Č', Џ: 'Dž', Ш: 'Š',
  // Russian/Ukrainian extras, so names like "Ольга" still come out readable
  Й: 'J', Я: 'Ja', Ю: 'Ju', Щ: 'Šč', Ы: 'Y', Э: 'E', Ё: 'Jo', Є: 'Je', І: 'I', Ї: 'Ji', Ґ: 'G', Ъ: '', Ь: '',
};
for (const [c, l] of Object.entries(CYR)) CYR[c.toLowerCase()] = l.toLowerCase();
const toLatin = s => s.replace(/[Ѐ-ӿ]/g, c => CYR[c] ?? c);
// Russian/Ukrainian letters that Serbian Cyrillic does not have
const NON_SERBIAN_CYR = /[ыэъёйщюяьєіїґ]/iu;

function toReview(r) {
  const snippet = r.extracted_snippet || {};
  let text = snippet.original || r.snippet || '';
  // A Russian/Ukrainian review reads better as Google's Serbian translation than transliterated
  if (NON_SERBIAN_CYR.test(text) && snippet.translated) text = snippet.translated;
  return {
    id: r.review_id || `${r.user?.name}|${r.iso_date}`,
    author: toLatin(r.user?.name || 'Google korisnik').trim(),
    rating: Number(r.rating),
    isoDate: r.iso_date,
    text: toLatin(text).replace(/\s+/g, ' ').trim(),
  };
}

const time = r => Date.parse(r.isoDate);
const qualifies = r => r.rating >= MIN_RATING && r.text.length >= MIN_TEXT_LENGTH && !Number.isNaN(time(r));

// Hand-copied legacy entries have no id/isoDate — they are dropped on the first run
const stored = (current.reviews || []).filter(r => r.id && !Number.isNaN(time(r)));
const newestStored = Math.max(0, ...stored.map(time));
const byId = new Map(stored.map(r => [r.id, r]));

console.log('[info] querying SerpAPI reviews for place:', current.ftid);
let placeInfo = {};
let token;
for (let page = 1; page <= MAX_PAGES; page++) {
  const data = await serpapi({
    engine: 'google_maps_reviews',
    data_id: current.ftid,
    sort_by: 'newestFirst',
    ...(token && { next_page_token: token, num: 20 }),
  });
  if (page === 1) placeInfo = data.place_info || {};

  const batch = Array.isArray(data.reviews) ? data.reviews.map(toReview) : [];
  if (page === 1 && !batch.length) {
    console.error('[err] response has no reviews. keys:', Object.keys(data));
    process.exit(2);
  }
  const usable = batch.filter(qualifies);
  usable.forEach(r => byId.set(r.id, r));
  console.log(`[info] page ${page}: ${batch.length} reviews, ${usable.length} usable`);

  token = data.serpapi_pagination?.next_page_token;
  const oldestInBatch = Math.min(...batch.map(r => time(r) || Infinity));
  // Done once this page reaches reviews we already had (or, when seeding, once the list is full)
  const caughtUp = stored.length ? oldestInBatch <= newestStored : byId.size >= MAX_REVIEWS;
  if (caughtUp || !token) break;
}

const reviews = [...byId.values()].sort((a, b) => time(b) - time(a)).slice(0, MAX_REVIEWS);
if (!reviews.length) {
  console.error('[err] no review passed the filter — keeping the existing list');
  process.exit(2);
}

// Rating + count come with the reviews; fall back to the place endpoint if that block is missing
let total = placeInfo.reviews;
let rating = placeInfo.rating;
if (typeof total !== 'number') {
  console.log('[info] place_info has no review count — asking the google_maps place endpoint');
  const place = (await serpapi({ engine: 'google_maps', type: 'place', place_id: current.placeId })).place_results || {};
  total = place.reviews ?? place.user_ratings_total;
  rating = place.rating;
}

const next = { ...current, reviews };
if (typeof total === 'number') next.totalReviews = total;
else console.warn('[warn] review count missing — keeping', current.totalReviews);
if (typeof rating === 'number') next.averageRating = Number(rating.toFixed(1));

if (JSON.stringify(next) === JSON.stringify(current)) {
  console.log(`[ok] no change — ${reviews.length} reviews, ${next.totalReviews} total, ${next.averageRating}★`);
  process.exit(0);
}

writeFileSync(REVIEWS_PATH, JSON.stringify(next, null, 2) + '\n', 'utf8');
console.log(
  `[updated] ${reviews.length} reviews (newest ${reviews[0].isoDate.slice(0, 10)}, oldest ${reviews.at(-1).isoDate.slice(0, 10)}), ` +
  `count ${current.totalReviews} → ${next.totalReviews}, rating ${current.averageRating} → ${next.averageRating}`
);
