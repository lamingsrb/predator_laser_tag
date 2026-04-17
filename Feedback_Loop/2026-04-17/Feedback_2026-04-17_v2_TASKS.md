# Feedback 2026-04-17 (v2 / veče) — Parsed Tasks

Izvor: [Feedback_2026-04-17_v2_RAW.md](Feedback_2026-04-17_v2_RAW.md)
Ukupno: 9.4 min (vlasnica Gaga + Radica pored)

---

## QUICK WINS (implementirati odmah)

### 1. 280 kvadrata → 300 kvadrata, svuda
- Status: **URAĐENO** u prethodnom commitu `f561cb7`. Treba da verifikujem.

### 2. Broj recenzija 213 → 218
- Zašto: Nova recenzija stigla posle prošlog update-a.
- Gde: [public/reviews.json](public/reviews.json) `totalReviews`.

### 3. Mapa — vrati originalne (šarene) Google boje
- "mapa je sive boje... izgleda kao mapa do groblja"
- Gde: [css/style.css](css/style.css) `.map-wrapper iframe { filter: grayscale(100%) invert(92%) contrast(85%); }` — ukloniti.

### 4. Footer — ukloniti social mrežne ikone
- "izbriši ih, nema poente, a i nisu ikonice koje su prave"
- Gde: footer section u [index.html](index.html).

### 5. Adresa format: "Zvezdara - Mirijevo"
- "ne može prvo opština pa ovo, nego Zvezdara, crtica Mirijevo" (municipality-crtica-mahalu, pa Beograd)
- Gde: footer + kontakt sekcija.
- Trenutno: `Čarobne frule 36, Mirijevo, Beograd` → `Čarobne frule 36, Zvezdara - Mirijevo, Beograd`.

### 6. Termini callouts (Individualna + Team Building) — poravnati skroz levo
- "ono što piše team building i individualni termini, nisu pomerjeni skroz levo"
- Trenutno: grid 1fr 1fr centriran preko max-width:900 margin:auto → treba da se poravna levo ili da budu u širini sadržaja sa `justify-self: start`.
- Opcija: smanjiti `max-width`, staviti `margin-right: auto; margin-left: 0`.

---

## GLAVNA STRUKTURA — PAKETI → 4 tab-a

"tamo gde su sad paketi, ona dva paketa, tu napišeš ovako: rođendani, team building, individualni termini i iznamljivanje prostora"

### Novi layout PAKETI sekcije:
4 tab-a (ili accordion ili card-grid sa click-to-expand):

1. **Rođendani** — 2 paketa (Standard 31.000 + LUX 36.000) — već postoje
2. **Team Building** — 1 strana sa tier-ovima (5 grupa, 120 min) — već postoji u //03 Termini
3. **Individualni Termini** — 1 strana (3 trajanja + piće + min 6 igrača) — već postoji u //03 Termini
4. **Iznajmljivanje Prostora** — 2 paketa — već postoje u //06 Iznajmljivanje

**Posledice:**
- //03 TERMINI sekcija NESTAJE (sadržaj ide u PAKETI tab 2+3)
- //06 IZNAJMLJIVANJE sekcija NESTAJE (sadržaj ide u PAKETI tab 4)
- PAKETI postaje jedina "cenovnik" sekcija, sve unutar sebe
- Renumerisati sekcije: PAKETI //02, POZIVNICE //03, GALERIJA //04, ISKUSTVO //05, O NAMA //06, KONTAKT //07

### Implementacija:
- Tab buttons na vrhu: `[ Rođendani ] [ Team Building ] [ Individualni ] [ Iznajmljivanje ]`
- Ispod tabova, panel menja sadržaj na klik
- Mobile: accordion (svaki tab ima expand/collapse)
- Keyboard accessible (Tab + Enter)

---

## AUDIO "GAME OVER" FEATURE (za staff)

Svrha: Vlasnici koriste sajt TOKOM igre kao "zvono" — kad se igra završi, oni kliknu dugme na sajtu i kroz zvučnike u areni pusti se "game over" poruka na srpskom, da deca znaju da ugase lasere i izađu.

### Specifikacija:
- **Tekst:** "Game Over. Molimo vas, ugasite lasere i polako izađite iz arene sa instruktorom."
- **Glas:** kompjuterski/robotski (kao Schwarzenegger u Predatoru / najavljivač u trolejbusu)
- **Gde aktivirati:** diskretno dugme na sajtu, vidljivo samo staff-u, ali pošto vlasnica želi brz pristup, praktično može biti:
  - Floating button u ćošku (staff-only URL hash `#game-over`)
  - Ili tastaturska prečica (npr. Ctrl+G)
  - Ili skrivena stranica `/game-over.html`
- **Audio:** generisati sa TTS (Google Cloud TTS srpski glas ili free online) → mp3 u public/assets/audio/game-over.mp3

### Problem:
- TTS za srpski nije trivijalno — Google Cloud TTS ima sr-RS glas, ali treba API key.
- Alternativa: snimiti kvazi-robotskim glasom sa PC-a (ja mogu da generišem sa Windows SAPI ili edge-tts?) — edge-tts je free i ima srpski glas sr-RS-SophieNeural.
- Još jedna alternativa: samo dodati kuciranje kao kod majlfunkcijom — nije dovoljno dobro.

### Plan:
1. Generiši mp3 via edge-tts (Python lib) — `sr-RS-SophieNeural` ili `sr-Latn-RS-SophieNeural`
2. Sačuvaj kao `public/assets/audio/game-over.mp3`
3. Dugme "🔊 GAME OVER" fiksirano u donjem desnom uglu, vidljivo kad korisnik doda `?staff=1` u URL ili pritisne prečicu
4. Klik → pušta audio

---

## UBUDUĆE (treba review zajedno sa vlasnicom)

### About — zameniti arena sliku
- Vlasnica želi da zajedno prođemo kroz slike. Pauzirati do njene potvrde koje slike da obrišem i koju da stavim u About.

### SEO (dugoročno, uz plaćanje)
- "Zvezdara" + "Mirijevo" + "laser tag" ključne reči
- Blogovi — možda kasnije

---

## REDOSLED IZVRŠENJA

1. Verify 280→300 (2 min)
2. Reviews 213 → 218 (30 sec)
3. Mapa: ukloniti grayscale filter (30 sec)
4. Footer: ukloniti social icons (2 min)
5. Adresa: Zvezdara - Mirijevo (1 min)
6. Termini callouts: levo poravnati (3 min)
7. Game Over audio: generate + dugme (~15 min)
8. **PAKETI restructure**: 4 tab-a (~45 min — najveći task)
9. Test sve, commit + push
