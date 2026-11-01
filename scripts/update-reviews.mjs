#!/usr/bin/env node
/**
 * Pulls the newest Google reviews plus the current rating / review count for
 * the Predator place via SerpAPI and rewrites public/reviews.json when anything
 * changed. Runs daily from .github/workflows/update-reviews.yml, so the site
 * always shows the latest reviews without anyone editing the JSON by hand.
 *
 * - Reviews come from engine=google_maps_reviews, sort_by=newestFirst.
 * - Only reviews with rating >= MIN_RATING and real text are kept, newest first.
 *   The site shows the ones from the last MAX_AGE_DAYS (at most MAX_REVIEWS); an
 *   older one stays only while fewer than MIN_REVIEWS newer ones exist, so the
 *   section never goes empty in a quiet month, but never shows "pre 3 meseca"
 *   next to fresher reviews either.
 * - Reviews from earlier runs stay in reviews.json until they age out, so a run
 *   only has to see what arrived since the previous one. That matters because
 *   since 2026-10-21 SerpAPI returns just 5 reviews per search and no next page
 *   (https://github.com/serpapi/public-roadmap/issues/4483): the daily run still
 *   catches every new review unless more than 5 arrive in one day.
 * - Each review keeps its ISO date; the site turns it into "pre 3 dana" in the
 *   browser, so the label never goes stale between runs.
 * - Steady state is 1 SerpAPI search per run (rating + count come in the same
 *   response), about 30 a month of the free plan's 250. A second page is asked
 *   for only when more new reviews arrived since the last run than fit on one.
 * - In GitHub Actions every step is also posted as a run annotation: readable
 *   by anyone on the run page / API, while the raw job log needs admin rights.
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

const MAX_REVIEWS = 10;     // most cards the site shows
const MIN_REVIEWS = 2;      // fewest: while fewer recent reviews exist, the newest older ones fill up to this
const MAX_AGE_DAYS = 60;    // "recent" — the site says "pre 2 meseca" from day 60 on
const MIN_RATING = 4;       // never show 1-3★ reviews on the site
const MIN_TEXT_LENGTH = 10; // skip rating-only / one-word reviews
const PAGE_SIZE = 20;       // reviews per SerpAPI search (API maximum)
const NEWEST_PAGES = 2;     // newestFirst pages per run at most

const __dirname = dirname(fileURLToPath(import.meta.url));
const REVIEWS_PATH = resolve(__dirname, '..', 'public', 'reviews.json');

const IN_ACTIONS = process.env.GITHUB_ACTIONS === 'true';
function report(msg, level = 'notice') {
  if (IN_ACTIONS) console.log(`::${level}::${msg.replace(/%/g, '%25').replace(/\r?\n/g, '%0A')}`);
  else console[level === 'error' ? 'error' : 'log'](`[${level}] ${msg}`);
}
function fail(msg, code) {
  report(msg, 'error');
  process.exit(code);
}

const KEY = process.env.SERPAPI_KEY;
if (!KEY) fail('SERPAPI_KEY env var is not set', 1);

// ftid (Google Maps data_id) and placeId from reviews.json — canonical IDs for Rođendaonica Laser Tag Beograd Predator
const current = JSON.parse(readFileSync(REVIEWS_PATH, 'utf8'));
if (!current.ftid || !current.placeId) fail('ftid / placeId missing from reviews.json', 2);

// Endpoint docs: https://serpapi.com/google-maps-reviews-api
let searches = 0;
async function serpapi(params) {
  const url = new URL('https://serpapi.com/search.json');
  for (const [k, v] of Object.entries({ ...params, hl: 'sr', api_key: KEY })) url.searchParams.set(k, v);
  searches++;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) fail(`SerpAPI ${res.status} (${params.engine} ${params.sort_by || ''}): ${data.error || ''}`, 1);
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
    isoDate: r.iso_date || r.iso_date_of_last_edit,
    text: toLatin(text).replace(/\s+/g, ' ').trim(),
  };
}

const NOW = Date.now();
const time = r => Date.parse(r.isoDate);
const recent = r => NOW - time(r) <= MAX_AGE_DAYS * 864e5;
const qualifies = r => r.rating >= MIN_RATING && r.text.length >= MIN_TEXT_LENGTH && !Number.isNaN(time(r));

// Hand-copied legacy entries have no id/isoDate — they are dropped on the first run
const stored = (current.reviews || []).filter(r => r.id && !Number.isNaN(time(r)));
const byId = new Map(stored.map(r => [r.id, r]));
const newestStored = Math.max(0, ...stored.map(time));
// Paging stops at reviews an earlier run already saw or too old to show
const seenUntil = Math.max(newestStored, NOW - MAX_AGE_DAYS * 864e5);
let placeInfo, token;

for (let page = 1; page <= NEWEST_PAGES; page++) {
  const data = await serpapi({
    engine: 'google_maps_reviews',
    data_id: current.ftid,
    sort_by: 'newestFirst',
    num: PAGE_SIZE,
    ...(token && { next_page_token: token }),
  });
  placeInfo ??= data.place_info;  // only the first page carries it
  const batch = Array.isArray(data.reviews) ? data.reviews.map(toReview) : [];
  const usable = batch.filter(qualifies);
  const added = usable.filter(r => time(r) > newestStored).length;
  usable.forEach(r => byId.set(r.id, r));
  token = data.serpapi_pagination?.next_page_token;

  const count = test => batch.filter(test).length;
  report(
    `newestFirst page ${page}: ${batch.length} reviews, ${usable.length} usable, ${added} new ` +
    `(${count(r => r.text.length < MIN_TEXT_LENGTH)} without text, ${count(r => !(r.rating >= MIN_RATING))} under ${MIN_RATING}★, ` +
    `${count(r => Number.isNaN(time(r)))} undated), next page: ${token ? 'yes' : 'no'}`
  );
  if (!token || Math.min(...batch.map(r => time(r) || 0)) <= seenUntil) break;
}

// Newest first; reviews older than MAX_AGE_DAYS only fill up to MIN_REVIEWS
const all = [...byId.values()].sort((a, b) => time(b) - time(a));
const fresh = all.filter(recent);
const reviews = (fresh.length >= MIN_REVIEWS ? fresh : all.slice(0, MIN_REVIEWS)).slice(0, MAX_REVIEWS);
if (!reviews.length) fail('no review passed the filter — keeping the existing list', 2);

// Rating + count come with the reviews; fall back to the place endpoint if that block is missing
let total = placeInfo?.reviews;
let rating = placeInfo?.rating;
if (typeof total !== 'number') {
  report('place_info has no review count — asking the google_maps place endpoint', 'warning');
  const place = (await serpapi({ engine: 'google_maps', type: 'place', place_id: current.placeId })).place_results || {};
  total = place.reviews ?? place.user_ratings_total;
  rating = place.rating;
}

const next = { ...current, reviews };
if (typeof total === 'number') next.totalReviews = total;
else report(`review count missing — keeping ${current.totalReviews}`, 'warning');
if (typeof rating === 'number') next.averageRating = Number(rating.toFixed(1));

const summary = `${reviews.length} reviews (${reviews[0].isoDate.slice(0, 10)} … ${reviews.at(-1).isoDate.slice(0, 10)}, ` +
  `${all.length - reviews.length} older left out), ${searches} SerpAPI searches`;
if (JSON.stringify(next) === JSON.stringify(current)) {
  report(`no change — ${summary}, ${next.totalReviews} total, ${next.averageRating}★`);
  process.exit(0);
}

writeFileSync(REVIEWS_PATH, JSON.stringify(next, null, 2) + '\n', 'utf8');
report(
  `updated — ${summary}, count ${current.totalReviews} → ${next.totalReviews}, ` +
  `rating ${current.averageRating} → ${next.averageRating}`
);
