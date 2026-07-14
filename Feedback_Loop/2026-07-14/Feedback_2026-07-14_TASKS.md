# Predator Laser Tag — Feedback task list

- **Datum feedback-a:** 2026-07-09 (Viber), unos 2026-07-14
- **Izvor:** Viber screenshot — Rada Vuković
- **Raw transkript:** [Feedback_2026-07-14_RAW.md](./Feedback_2026-07-14_RAW.md)

---

## 🔴 GLAVNI TASK

### 1. Promo popup — LETNJA AKCIJA (jul & avgust)
> *"Treba da se stavi neki baner na sajt, da izlazi čim neko otvori link."*
> *"~~31.000~~ 25.000 — Popust na ovaj standard paket, popust na termine u julu i avgustu."*

- **Šta:** Modal/popup koji se prikazuje odmah po otvaranju sajta (kratka pauza ~1s da hero animacija krene, pa popup).
- **Sadržaj:**
  - Tag: `// LETNJA AKCIJA — JUL & AVGUST`
  - Standard rođendanski paket
  - Stara cena **31.000** precrtana (sivo), nova cena **25.000 RSD** velika sa pink glow
  - Badge "UŠTEDA 6.000 RSD"
  - Napomena: važi za rođendanske termine u julu i avgustu
  - CTA: **REZERVIŠI TERMIN** (`tel:` — postojeća logika: desktop skroluje na kontakt, mobilni zove) + sekundarno **POGLEDAJ PAKET** (`#packages`)
  - Close dugme (X), klik na backdrop, ESC
- **Ponašanje:**
  - Prikazuje se jednom po sesiji (`sessionStorage`) — svaki novi ulazak preko linka ga vidi, ali ne iskače ponovo na svaku internu navigaciju/refresh u istoj sesiji
  - Klik na bilo koji CTA zatvara popup pre skrola
  - Dok je popup otvoren body ne skroluje
- **Dizajn:** u stilu sajta — tamna kartica, pink neon (#ff0088), Orbitron naslovi, HUD corner brackets. **Pravougaono, bez isečenih ćoškova** (Gaga eksplicitno ne voli — feedback 2026-04-16). `cursor: pointer` na overlay elementima (custom cursor je ispod overlay z-index-a, isti pristup kao lightbox).
- **Responsive:** desktop centriran (~520px), mobilni max-width ~92vw, sve staje bez skrola na malim ekranima.
- **Gde:** [index.html](../../index.html) (markup pre Scripts), [css/style.css](../../css/style.css) (novi PROMO MODAL blok), [js/main.js](../../js/main.js) (novi modul na kraju).

### 2. Standard kartica (Paketi → Rođendani) — promo cena
- **Šta:** Na Standard rođendanskoj kartici prikazati precrtanu staru cenu + novu:
  `~~31.000~~ 25.000 RSD` + napomena *"važi za termine u julu i avgustu"*.
- **Zašto:** Ko zatvori popup (ili dođe direktno na #packages) mora da vidi istu akciju — konzistentnost cene na celom sajtu.
- **Detalj:** Tag kartice `STANDARD` → `LETNJA AKCIJA` (pink), da kartica dobije promo naglasak, ali LUX ostaje "NAJPOPULARNIJI".
- **Gde:** [index.html](../../index.html) linija ~221-238, [css/style.css](../../css/style.css) — `.bp-old`, `.bp-promo-note`.

### 3. Typewriter linija u hero-u (sitno pojačanje)
- **Šta:** Dodati u rotaciju typewriter poruka: `LETNJA AKCIJA: Standard rođendan 25.000 RSD (jul i avgust)`.
- **Gde:** [js/main.js](../../js/main.js) — `new Typewriter(...)` lista tekstova.

---

## 📋 NAPOMENE / FOLLOW-UP

- **Istek akcije — AUTO-EXPIRE ugrađen** (na Lazarov zahtev, 2026-07-14): `PROMO_END_MS` u [js/main.js](../../js/main.js) = 01.09.2026 00:00 (Beograd). Posle isteka JS sam: uklanja popup iz DOM-a, vraća Standard karticu na 31.000 RSD + tag "STANDARD", izbacuje typewriter liniju. Verifikovano simulacijom datuma ([scripts/promo-expire-test.mjs](../../scripts/promo-expire-test.mjs)): aktivna danas ✓, aktivna 31.08. u 23h ✓, ugašena 05.09. ✓. **Ako Rada produži akciju** — samo pomeriti `PROMO_END_MS` datum. U septembru počistiti promo markup/CSS iz koda (do tada ga JS gasi sam).
- Rada je poslala i svoju Instagram grafiku ("pa ti uklopi nekako") — sajt popup ne kopira njen dizajn nego prenosi istu poruku u vizuelnom identitetu sajta. Ako bude tražila da izgleda baš kao IG grafika, tražiti da pošalje fajl.
- Posle implementacije javiti Radi da baci pogled (Laki je obećao: *"stavljam veceras pa ti javljam da bacis pogled"*).

---

## Prioritizacija

| Red. | Task | Težina | Blokira? |
|------|------|--------|----------|
| 1 | #1 Promo popup | M | DA — direktan zahtev |
| 2 | #2 Standard kartica promo cena | S | konzistentnost |
| 3 | #3 Typewriter linija | XS | polish |
