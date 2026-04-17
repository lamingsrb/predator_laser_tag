#!/usr/bin/env node
/**
 * Fetches current Google Maps review count for the Predator place via SerpAPI
 * and updates public/reviews.json if the count (or rating) changed.
 *
 * Usage:
 *   SERPAPI_KEY=... node scripts/update-review-count.mjs
 *
 * Exit codes:
 *   0 = success (file updated OR already current)
 *   1 = SerpAPI request failed / no key
 *   2 = response parsed but missing required fields
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REVIEWS_PATH = resolve(__dirname, '..', 'public', 'reviews.json');

const KEY = process.env.SERPAPI_KEY;
if (!KEY) {
  console.error('[err] SERPAPI_KEY env var is not set');
  process.exit(1);
}

// Place ID from reviews.json — canonical Google place ID for Rođendaonica Laser Tag Beograd Predator
const reviews = JSON.parse(readFileSync(REVIEWS_PATH, 'utf8'));
const placeId = reviews.placeId;
if (!placeId) {
  console.error('[err] placeId missing from reviews.json');
  process.exit(2);
}

// SerpAPI google_maps engine returns place_results with rating + reviews count.
// Endpoint docs: https://serpapi.com/google-maps-api
const url = new URL('https://serpapi.com/search.json');
url.searchParams.set('engine', 'google_maps');
url.searchParams.set('type', 'place');
url.searchParams.set('place_id', placeId);
url.searchParams.set('hl', 'sr');
url.searchParams.set('api_key', KEY);

console.log('[info] querying SerpAPI for place:', placeId);
const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
if (!res.ok) {
  console.error(`[err] SerpAPI ${res.status}: ${await res.text().catch(() => '')}`);
  process.exit(1);
}
const data = await res.json();

const place = data.place_results || {};
const rating = place.rating;
const total  = place.reviews ?? place.user_ratings_total;

if (typeof total !== 'number') {
  console.error('[err] response missing reviews count. keys:', Object.keys(place));
  process.exit(2);
}

const prevTotal  = reviews.totalReviews;
const prevRating = reviews.averageRating;

if (prevTotal === total && Math.abs((prevRating ?? 0) - (rating ?? 0)) < 0.05) {
  console.log(`[ok] no change — still ${total} reviews, ${rating ?? 'n/a'}★`);
  process.exit(0);
}

reviews.totalReviews  = total;
if (typeof rating === 'number') reviews.averageRating = Number(rating.toFixed(1));

writeFileSync(REVIEWS_PATH, JSON.stringify(reviews, null, 2) + '\n', 'utf8');
console.log(`[updated] reviews ${prevTotal} → ${total}, rating ${prevRating} → ${reviews.averageRating}`);
