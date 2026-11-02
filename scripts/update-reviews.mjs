#!/usr/bin/env node
/**
 * Pulls the newest Google reviews plus the current rating / review count for
 * the Predator place via SerpAPI and rewrites public/reviews.json when anything
 * changed. Runs daily from .github/workflows/update-reviews.yml, so the site
 * always shows the latest reviews without anyone editing the JSON by hand.
 *
 * - Reviews come from engine=google_maps_reviews, sort_by=newestFirst.
 * - Only reviews with rating >= MIN_RATING and real text (at least
 *   MIN_TEXT_LENGTH characters as a reader counts them, an emoji being one, and
 *   at least one letter) are kept. The site always shows the MAX_REVIEWS newest
 *   of them, newest first, however old. A shown review that comes back rated
 *   under MIN_RATING or with its text cut short by its author is taken off, and
 *   stays off for the rest of the run even where another search still has the
 *   old copy; one that comes back with no text at all keeps its stored text (a
 *   response without the text does not prove the author deleted it).
 * - Reviews from earlier runs stay in reviews.json until newer ones push them
 *   out, so a run only has to see what arrived since the previous one. That
 *   matters because since 2026-10-21 SerpAPI returns just 5 reviews per search
 *   and no next page (https://github.com/serpapi/public-roadmap/issues/4483).
 *   When Google's review count grew since the last run by at least as many as
 *   the newestFirst page showed, more may have arrived than it can show, and the
 *   run fills by word. The count comes from place_info of the first page, else
 *   from the place endpoint; the two may disagree, so each is compared with what
 *   the same source said last time (reviewCounts in reviews.json).
 * - Under that bug the newestFirst page can't fill the list (most of the 5 are
 *   stars only), so a run fills it by word: it searches the reviews for each of
 *   FILL_WORDS, newest first. Such a search returns only reviews with text, the
 *   5 newest that contain the word, so together the words find (nearly) all of
 *   the MAX_REVIEWS newest; one they miss leaves the window as newer ones arrive.
 *   A fill costs one search per word, so it runs only
 *     - on a push (the updater changed) while fewer than MAX_REVIEWS are known,
 *     - on the daily schedule while fewer than MAX_REVIEWS are known, at most
 *       once every FILL_EVERY_DAYS days (lastFill in reviews.json), so a fill
 *       that got lost is redone by a later daily run; right away when a shown
 *       review was just taken off (best effort: when the words find no other
 *       review, the list stays one short until a new one arrives or the next
 *       regular fill),
 *     - when Google's count says more reviews arrived than the page showed,
 *     - always when started by hand ("Run workflow").
 *   Each day the words start at a different one, so words that keep failing
 *   can't end every fill before the others are tried. A word search that fails
 *   or comes back empty is tried once more, fresh, the ones that failed with an
 *   HTTP error (not billed) first; three retries in a row that come back
 *   without reviews end the retries. Two word searches in a row that come back
 *   unfiltered (stars-only reviews or the plain newestFirst page) mean SerpAPI
 *   ignored the query: the fill stops, retries included. While no word has
 *   found reviews, three answers without reviews (billed like any other) mean
 *   SerpAPI's word search is down: the fill stops, retries included (the words
 *   that failed with an HTTP error are retried first, so some of the three may
 *   be retries).
 * - Each review keeps its ISO date; the site turns it into "pre 3 dana" in the
 *   browser, so the label never goes stale between runs.
 * - Steady state is 1 SerpAPI search per run (rating + count come in the same
 *   response), about 30 a month of the free plan's 250; 2 while place_info
 *   lacks the count and the place endpoint is asked (about 60 a month). A fill
 *   adds one per word and per retry (an answer without reviews is billed too,
 *   an HTTP error is not).
 *   More pages (at most MAX_PAGES) are asked for only while fewer than
 *   MAX_REVIEWS reviews are known, or when more new reviews arrived since the
 *   last run than fit on one.
 * - In GitHub Actions every step is also posted as a run annotation: readable
 *   by anyone on the run page / API, while the raw job log needs admin rights.
 *
 * Usage:
 *   SERPAPI_KEY=... node scripts/update-reviews.mjs
 *
 * Exit codes:
 *   0 = success (file updated OR already current)
 *   1 = no key, a newestFirst page failed, or an unexpected error (e.g. a
 *       broken reviews.json); a failed place or word search only warns
 *   2 = ftid / placeId missing, the first page came back without reviews
 *       twice, or no review passed the filter
 *   On 1 and 2 reviews.json is left as is.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_REVIEWS = 20;     // the site always shows the 20 newest
const MIN_RATING = 4;       // never show 1-3★ reviews on the site
const MIN_TEXT_LENGTH = 10; // skip rating-only / one-word reviews (characters as a reader counts them)
const PAGE_SIZE = 20;       // reviews per SerpAPI search (API maximum)
const MAX_PAGES = 5;        // newestFirst pages per run at most
const FILL_EVERY_DAYS = 7;  // daily runs fill by word at most this often while fewer than MAX_REVIEWS are known
// Common words of this place's own reviews (picked 2026-11 so that between them they cover its 20 newest). The short
// everyday ones are kept apart: should Google skip them, two in a row would look like SerpAPI ignoring the query.
const FILL_WORDS = ['sve', 'preporuke', 'da', 'pohvale', 'veoma', 'mesto', 'su', 'deca', 'na', 'osoblje',
  'koji', 'tag', 'roditelji', 'prostor', 'zabava'];

const __dirname = dirname(fileURLToPath(import.meta.url));
const REVIEWS_PATH = resolve(__dirname, '..', 'public', 'reviews.json');

const IN_ACTIONS = process.env.GITHUB_ACTIONS === 'true';
const EVENT = process.env.GITHUB_EVENT_NAME;  // push / schedule / workflow_dispatch; unset outside GitHub Actions
function report(msg, level = 'notice') {
  if (IN_ACTIONS) console.log(`::${level}::${msg.replace(/%/g, '%25').replace(/\r?\n/g, '%0A')}`);
  else console[level === 'error' ? 'error' : 'log'](`[${level}] ${msg}`);
}
function fail(msg, code) {
  report(msg, 'error');
  process.exit(code);
}
// Anything unexpected still ends as an ::error:: annotation, not only in the admin-only raw log
process.on('uncaughtException', e => fail(`unexpected error: ${e.stack || e}`, 1));

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
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  const data = await res.json().catch(() => ({}));
  // Every answered search counts, an HTTP 200 with an error ("no results") too: SerpAPI may bill it like an empty answer
  if (res.ok) searches++;
  if (!res.ok || data.error) {
    const what = [params.engine, params.sort_by].filter(Boolean).join(' ');
    throw Object.assign(new Error(`SerpAPI ${res.status} (${what}): ${data.error || ''}`), { answered: res.ok });
  }
  return data;
}
// The newest reviews are required: a failed search ends the run and reviews.json stays as is
const search = params => serpapi(params).catch(e => fail(e.message, 1));

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

const time = r => Date.parse(r.isoDate);
const graphemes = new Intl.Segmenter('sr', { granularity: 'grapheme' });
// Real text: at least MIN_TEXT_LENGTH characters as a reader counts them (an emoji is one) and at least one letter
const realText = t => typeof t === 'string' && /\p{L}/u.test(t) && [...graphemes.segment(t)].length >= MIN_TEXT_LENGTH;
const qualifies = r => r.rating >= MIN_RATING && realText(r.text) && !Number.isNaN(time(r));
// No longer fit to show: rated under MIN_RATING, or its text cut short by its author (no text at all may be the response, not the author)
const gone = r => (r.rating >= 1 && r.rating < MIN_RATING) || (r.text !== '' && !realText(r.text));
const sameReview = (a, b) => a.author === b.author && a.isoDate === b.isoDate;
// Raw SerpAPI reviews in newest-first order by the given date field (iso_date where it is missing)
const newestFirst = (raw, key) => raw.every((r, i) => i === 0 ||
  !(Date.parse(r[key] || r.iso_date) > Date.parse(raw[i - 1][key] || raw[i - 1].iso_date)));

// Hand-copied legacy entries have no id/isoDate — they are dropped on the first run
const stored = (current.reviews || []).filter(r => r.id && qualifies(r));
const byId = new Map(stored.map(r => [r.id, r]));
const newestStored = Math.max(0, ...stored.map(time));
let removed = 0;
// Reviews a search of this run saw no longer fit to show, by id and by author + date
const takenOff = new Set();

// Adds the usable reviews of a batch to the known ones and drops known ones that no longer qualify;
// returns how many were usable and how many were not known yet
function merge(batch) {
  let usable = 0, added = 0;
  for (const r of batch) {
    const ok = qualifies(r);
    // Coming back without text is no reason to drop a known review, a rating under MIN_RATING or a cut text is
    if (!ok && !gone(r)) continue;
    // Another search that still has the old copy does not bring it back
    if (ok && (takenOff.has(r.id) || takenOff.has(`${r.author}|${r.isoDate}`))) continue;
    let known = byId.delete(r.id);
    // Google has changed its review id format before: a review that comes back under a new id replaces the stored copy
    for (const [id, s] of byId) if (sameReview(s, r)) known = byId.delete(id);
    if (!ok) {
      takenOff.add(r.id).add(`${r.author}|${r.isoDate}`);
      if (known) removed++;
      continue;
    }
    usable++;
    if (!known) added++;
    byId.set(r.id, r);
  }
  return { usable, added };
}

let placeInfo, token, firstPage = '', seen = 0;
for (let page = 1; page <= MAX_PAGES; page++) {
  const params = {
    engine: 'google_maps_reviews',
    data_id: current.ftid,
    sort_by: 'newestFirst',
    num: PAGE_SIZE,
    ...(token && { next_page_token: token }),
  };
  let data = await search(params);
  // An empty first page is SerpAPI's "Success without reviews" fault (https://github.com/serpapi/public-roadmap/issues/4378),
  // not an empty place: asked once more, fresh. Twice empty ends the run, so the count never moves past unseen reviews.
  if (page === 1 && !data.reviews?.length) data = await search({ ...params, no_cache: true });
  if (page === 1 && !data.reviews?.length) fail('SerpAPI returned no reviews twice — keeping the existing list', 2);
  placeInfo ??= data.place_info;  // only the first page carries it
  const batch = Array.isArray(data.reviews) ? data.reviews.map(toReview) : [];
  if (page === 1) firstPage = batch.map(r => r.id).join();
  seen += batch.length;
  const { usable, added } = merge(batch);
  token = data.serpapi_pagination?.next_page_token;

  const count = test => batch.filter(test).length;
  report(
    `newestFirst page ${page}: ${batch.length} reviews, ${usable} usable, ${added} new ` +
    `(${count(r => !realText(r.text))} without real text, ${count(r => !(r.rating >= MIN_RATING))} under ${MIN_RATING}★, ` +
    `${count(r => Number.isNaN(time(r)))} undated), next page: ${token ? 'yes' : 'no'}`
  );
  // The next page can still change the list only while it may hold reviews that arrived since
  // the last run, or while fewer than MAX_REVIEWS are known
  const reachedStored = !stored.length || Math.min(...batch.map(r => time(r) || 0)) <= newestStored;
  if (!token || !batch.length || (reachedStored && byId.size >= MAX_REVIEWS)) break;
}

// Rating + count come with the first page; fall back to the place endpoint if that block is missing. Asked before
// the fill decision: the count tells how many reviews arrived since the last run.
let total = placeInfo?.reviews;
let rating = placeInfo?.rating;
let source = 'place_info';
if (typeof total !== 'number') {
  report('place_info has no review count — asking the google_maps place endpoint', 'warning');
  // Not worth losing the reviews over: without an answer the current count and rating stay
  const place = (await serpapi({ engine: 'google_maps', type: 'place', place_id: current.placeId })
    .catch(e => (report(e.message, 'warning'), {}))).place_results || {};
  total = place.reviews ?? place.user_ratings_total;
  rating = place.rating;
  source = 'place';
}

// Fill by word (see the header for when). Google's count against the one the same source gave last time tells how
// many reviews arrived since (deletions blur it); at least as many as the pages showed means some may be missing.
const counts = current.reviewCounts ?? { place_info: current.totalReviews };
const last = counts[source] ?? current.totalReviews;  // a source not heard from before against the count shown
const arrived = typeof total === 'number' && typeof last === 'number' ? total - last : 0;
const burst = !token && arrived > 0 && arrived >= seen;
const fillDue = !(Date.now() - Date.parse(current.lastFill) < FILL_EVERY_DAYS * 864e5);  // never filled counts as due
const why = EVENT === 'workflow_dispatch' ? 'started by hand'
  : burst ? `${arrived} arrived since the last run, the newest-first page showed ${seen}`
  : byId.size < MAX_REVIEWS && (EVENT !== 'schedule' || fillDue || removed > 0) ? `${byId.size} of ${MAX_REVIEWS} known`
  : '';
let filledOk = false;
if (why) {
  const done = [], unordered = [], failed = new Map(), billed = new Set();
  let filled = 0, unfiltered = 0, empty = 0, asked = 0;
  async function fillWord(word, fresh) {
    let data;
    asked++;
    try {
      data = await serpapi({ engine: 'google_maps_reviews', data_id: current.ftid, sort_by: 'newestFirst', query: word, num: PAGE_SIZE, ...(fresh && { no_cache: true }) });
    } catch (e) {
      failed.set(word, e.message);  // the report lists the failed words apart
      if (e.answered) {
        empty++;
        billed.add(word);
      }
      return;
    }
    // Every word is common enough to find some: none is SerpAPI's "Success without reviews" fault (see above)
    if (!data.reviews?.length) {
      failed.set(word, 'Success without reviews');
      empty++;
      billed.add(word);
      return;
    }
    failed.delete(word);
    filledOk = true;
    const raw = data.reviews, batch = raw.map(toReview);
    // Only reviews that contain the word come back: a stars-only one, or exactly the plain newestFirst page, means
    // SerpAPI ignored the query (two in a row stop the fill)
    unfiltered = batch.some(r => !r.text) || batch.map(r => r.id).join() === firstPage ? unfiltered + 1 : 0;
    // Newest first by posting or by last-edit date, else the search did not sort by date and the word may
    // miss newer reviews. The reviews it found are real ones, so they count either way.
    if (!newestFirst(raw, 'iso_date') && !newestFirst(raw, 'iso_date_of_last_edit')) unordered.push(word);
    const { added } = merge(batch);
    filled += added;
    done.push(`${word} ${raw.length}/${added}`);
  }
  // An answer without reviews is billed like any other: while no word has found any, three of them mean SerpAPI's
  // word search is down — the fill and the retries stop there (some of the three may be retries of words that failed
  // with an HTTP error, which go first)
  const down = () => !filledOk && empty >= 3;
  // Each day another word goes first, so words that keep failing can't end every fill before the others are tried
  const start = Math.floor(Date.now() / 864e5) % FILL_WORDS.length;
  for (const word of [...FILL_WORDS.slice(start), ...FILL_WORDS.slice(0, start)]) {
    await fillWord(word);
    if (unfiltered >= 2 || down()) break;
  }
  // Once more for every failed or empty one, fresh: SerpAPI serves a repeated search from its cache for about an hour.
  // The ones that failed with an HTTP error (not billed) go first. Three answers in a row without reviews end the
  // retries (an HTTP error counts neither way), and so does SerpAPI ignoring the query.
  const retry = [...failed.keys()].sort((a, b) => billed.has(a) - billed.has(b));
  let retries = 0, emptyInARow = 0;
  for (const word of retry) {
    if (down() || emptyInARow >= 3 || unfiltered >= 2) break;
    const before = empty;
    await fillWord(word, true);
    retries++;
    emptyInARow = empty > before ? emptyInARow + 1 : failed.has(word) ? emptyInARow : 0;
  }
  const notRetried = retry.length - retries;
  report(`fill by word, newest first (${why}; reviews/new): ${done.join(', ') || 'none'} — ${filled} new in all` +
    (retries ? `, ${retry.length - failed.size} of ${retries} failed searches OK on retry` : '') +
    (notRetried && !down() && unfiltered < 2 ? `, ${notRetried} not retried after 3 answers in a row without reviews` : ''));
  if (unfiltered >= 2) report(`fill: SerpAPI ignored the word search (stars-only reviews or the plain newest-first page came back) — stopped after ${asked} word searches`, 'warning');
  if (down()) report(`fill: ${empty} word searches answered without reviews and none found any — SerpAPI's word search looks down, stopped to save searches (such answers are billed)`, 'warning');
  if (unordered.length) report(`fill: results not newest first for ${unordered.join(', ')} — kept, but these words may miss newer reviews`, 'warning');
  if (failed.size) report(`fill: ${failed.size} word searches failed (${[...failed.keys()].join(', ')}): ` +
    `${[...new Set(failed.values())].join('; ')} — "Run workflow" by hand fills again (the words start at another one each UTC day)`, 'warning');
}
if (removed) report(`${removed} shown review(s) no longer qualify (rated under ${MIN_RATING}★ or text cut short) — taken off the site`);

// The MAX_REVIEWS newest, newest first
const all = [...byId.values()].sort((a, b) => time(b) - time(a));
const reviews = all.slice(0, MAX_REVIEWS);
if (!reviews.length) fail('no review passed the filter — keeping the existing list', 2);
// A burst whose word searches all failed (an HTTP error or an answer without reviews) keeps the old count, so the next
// run still sees the reviews that arrived and fills again. A word search that got reviews back counts as a fill, even
// the plain page of an ignored query: then the count moves on, like lastFill.
const unfilledBurst = burst && !filledOk;
if (reviews.length < MAX_REVIEWS) {
  // The next regular fill of a daily run (a burst, a removal or "Run workflow" fill sooner)
  const nextFill = unfilledBurst ? 0
    : (filledOk ? Date.now() : Date.parse(current.lastFill)) + FILL_EVERY_DAYS * 864e5;  // NaN if never filled
  report(`only ${reviews.length} of ${MAX_REVIEWS} reviews known — new ones add to it; the daily run fills by word again ` +
    (nextFill > Date.now() ? `once ${new Date(nextFill).toISOString().slice(0, 16).replace('T', ' ')} UTC has passed` : 'next time') +
    ' ("Run workflow" fills now)', 'warning');
}

const next = { ...current, reviews };
if (unfilledBurst) report(`no word search worked — review count kept at ${current.totalReviews}, so the next run looks again`, 'warning');
else if (typeof total === 'number') Object.assign(next, { totalReviews: total, reviewCounts: { ...counts, [source]: total } });
else report(`review count missing — keeping ${current.totalReviews}`, 'warning');
if (typeof rating === 'number') next.averageRating = Number(rating.toFixed(1));
if (filledOk) next.lastFill = new Date(Date.now()).toISOString();

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
