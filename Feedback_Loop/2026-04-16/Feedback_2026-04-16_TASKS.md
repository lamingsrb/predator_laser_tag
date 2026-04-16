# Predator Laser Tag — Feedback task list

- **Datum feedback-a:** 2026-04-16
- **Izvor:** audio snimak vlasnice (Gaga?), 14 min, Groq whisper-large-v3
- **Raw transkript:** [Feedback_2026-04-16_RAW.md](./Feedback_2026-04-16_RAW.md)

---

## 🔴 KRITIČNE BAGE (moraju odmah)

### 1. Galerija — lightbox ne radi
> *"kad kliknem na arenu nema slike ... nijedna slika neće se otvari"*
> *"Druga video neće da se pusti, live akcije. Neće da se pusti."*
> *"Sad mi je zabagovalo"*

- **Šta:** Klik na bilo koji tile u galeriji ne otvara lightbox u produkciji.
- **Pretpostavka:** Možda event listener ne radi kad su tile-ovi sakriveni paginacijom, ili Vite/Vercel build ne baca module. Proveri u production build-u.
- **Gde:** [js/main.js](js/main.js) — lightbox modul + mobile pagination modul mogu biti u konfliktu jer oba slušaju klikove na `.masonry-item`.
- **Video tile-ovi:** muted autoplay takođe ne radi — možda poster slika ne učitava.
- **Akcija:** Testirati production URL (Vercel), otvoriti DevTools, reprodukovati i popraviti.

### 2. Kontakt — Google Maps embed ne radi
> *"kad klikne, ne radi, ova mapa ne može ... kontakt moram da ti dam drugu mapu, zato što ovo nije dobra"*

- **Šta:** Trenutni `<iframe>` u kontakt sekciji ne prikazuje pravu lokaciju (stari embed URL sa placeholder koordinatama).
- **Akcija:** Čekati da vlasnica pošalje tačan Google Maps embed link za Koste Nađa 12d (ili Čarobne Frule 36?), onda zameniti iframe `src` u [index.html](index.html).

---

## 🎨 GLOBALNE PROMENE (boja + struktura)

### 3. Zameniti narandžastu boju sa **roze/pink** (iz logo-a)
> *"laser na logu je roze ... ako je ova roze laser na logu onda bacaj brate ovo isto roze umesto ovu narančost"*
> *"nisam za previše boja, ovde imamo naranđastu, belu, zelenu i crnu"*

- **Šta:** Svi trenutni narandžasti akcenti (orange avatar circle na recenzijama, možda naslovi ili emoji-ji) zameniti sa **roze/pink** koja se poklapa sa laserom iz logo-a.
- **Gde:**
  - [css/style.css](css/style.css) — proveriti sve `#ff6b00` / orange gradiente
  - Avatar boje u reviews modulu ([js/main.js](js/main.js:avatarColors) — `#ff6b00` treba ići)
  - `.birthday-tag`, `.section-intro strong` — proveriti
- **Nova boja:** Treba uzeti tačan HEX iz logo-a (pink/roze laser zrak). Otvoriti logo u Photoshop-u/Pippete-u, ili probati `#ff00aa` / `#e91e63` kao početak.

### 4. Premestiti redosled sekcija
> *"prva strana bih stavila možda recenzije, druga strana paketi, treća strana galerija, pa onda možda ide rođendan iskustvo o nama i kontakt"*
> *"pakete bi stavila znači da budu drugi, jer svi gledaju ... ja prva tražim cenu"*
> *"ja bih o nama stavila poslednju stranu"*

**Novi redosled sekcija:**
1. Hero (ostaje)
2. **RECENZIJE** ⬅ pomeriti sa //07 na //02 (4.8 zvezdica, 198 recenzija = jak social proof)
3. **PAKETI** ⬅ pomeriti na //03 (cene, najvažnije za konverziju)
4. **GALERIJA** ⬅ //04
5. **ROĐENDANI** ⬅ //05
6. **IZNAJMLJIVANJE PROSTORA** ⬅ //06
7. **ISKUSTVO** ⬅ //07
8. **O NAMA** ⬅ //08 (pre kontakta)
9. **KONTAKT** (ostaje poslednji)

**Gde:** Preurediti `<section>` blokove u [index.html](index.html) + ažurirati `// 01` - `// 09` oznake + nav linkove.

---

## 🖥️ HERO SEKCIJA

### 5. Video u pozadini se ne vidi — particles prekrivaju
> *"tek sam ga sad videla, pravo da ti kažem, tek sam sad videla u pozadini video"*
> *"gledamo ovo već dva minuta, znači da se ovo dobro ne vidi"*
> *"zato što je arena sva šarena i ove naše zvezdice i ovo je sve šareno i bukvalno se laki ne vidi"*
> *"baš ovde da se vrti video da izbaciš ove žute, naranđaste, ove kockice, nisu zvezdice"*

- **Šta:** Particle canvas (žute, cyan, zelene, ljubičaste čestice) je **prejak iznad hero video-a**. Vlasnica je 2 minuta gledala sajt i nije ni shvatila da postoji video u pozadini jer ga čestice potpuno prekrivaju.
- **Primer:** Shvatila je tek kad je videla klinca u beloj duksarici u videu kroz rupe između čestica.
- **Akcija — dve opcije:**
  - **A:** Sakriti particles canvas u hero-u (`display: none` samo unutar .hero via ::before / z-index), pustiti video da dominira. Particles ostaju u ostalim sekcijama.
  - **B:** Drastično smanjiti broj particles na hero-u (sa 400 na 60) + smanjiti opacity čestica (sa trenutne na 0.3-0.4) tako da video bude glavna stvar. Zadržati klik-eksplozije.
- **Preporuka:** Opcija B — zadrži interaktivnost (laser-shot klikovi) ali video dominira.
- **Gde:** [js/particles.js](js/particles.js) — broj čestica + [css/style.css](css/style.css) — `.hero-video { opacity }` povećati sa 0.42 na 0.7+.

### 6. Hero "desni deo" polovinu izbaciti
> *"ovaj desni deo ćemo pola izbaciti, pošto mi se to ne dopada"*

- **Šta:** Nejasno koji deo. Možda se odnosi na stats kolonu (280m², 8, 5000) ili na scroll indicator, ili neki particle cluster.
- **Akcija:** Traži razjašnjenje od vlasnice — ili snimak ekrana sa crvenom oznakom.

---

## 🎯 PAKETI SEKCIJA

### 7. REZERVIŠI dugme — izjednačiti oblike
> *"svuda su ti slova generalno ista, brojevi mi se sviđaju ovi kompjuterski, to je sve super"*
> *"levo ti je rezerviši kod Standarda, kockica lepa crna, piše REZERVIŠI"*
> *"a ovde da je VIP crveni i veliko je i neki geometrijski oblik ... ja ne znam šta je ovo"*
> *"kapiram da je to crveno da kao znaš VIP ... ali ne volim različite oblike"*
> *"okej da bude crveno, ali ovaj oblik sa isečenim čoškojima mi se ne dopada"*
> *"mislim da ovako šira i veća kockica za REZERVIŠI"*

- **Šta:** LUX i ostala featured/crvena dugmad imaju **oblik sa isečenim čoškovima** (ivice rese). Vlasnica ih ne voli — hoće sve dugmad **iste pravougaone kvadratne forme** kao crni "REZERVIŠI" kod Standard kartice.
- **Akcija:** Ukloniti clip-path / pseudo-elemente koji prave isečene čoškove na `.btn-primary`. Zadržati crvenu boju, ali forma = obična pravougaona kockica.
- **Gde:** [css/style.css](css/style.css) — pretraga `.btn-primary`, `.btn-block`, clip-path ili skew.

---

## 🎉 ROĐENDANI SEKCIJA

### 8. Boja PROSLAVI ROĐENDAN — možda roze/ljubičasto
> *"bela slova, pa naranđasta, možda bi ovu naranđastu pre prebacila u ovu ljubičastu koja ti je ova boja kućice gde piše treba ti samo prostor"*
> *"ok znam da je laser crveni ali ajde ... možda si u pravu da je ovako naročito"*

- **Šta:** Vlasnica razmatra da zameni narandžastu u `ROĐENDAN` glow sa **ljubičastom** (ista kao iznajmljivanje prostora). Nije finalno odlučila, ali želi da vidi kako izgleda.
- **Akcija:** Ako se spoji sa task-om 3 (ukloniti orange, zameniti sa pink), i ljubičasta i pink rade. Finalno dogovoriti sa vlasnicom.

---

## 🖼️ GALERIJA SEKCIJA

### 9. Ukloniti "IGRAČ" sliku (sestra bivše vlasnice)
> *"ovo gde piše igrač, to bi izbacila, mislim okej kao plavušica i to, ali to je sestra od bivše vlasnice pa bi možda nju izbacila i ubacila neku drugu sliku"*

- **Šta:** Slika `06-player-aim.webp` (dragana nisani.jpg) je sestra bivše vlasnice — ne sme da ostane na sajtu.
- **Akcija:**
  - Zameniti sliku sa drugom iz Media_RAW (verovatno bolji kandidat: player action shot sa novijim fotkama).
  - Ažurirati [scripts/process-media.py](scripts/process-media.py) i [index.html](index.html) → 06-player-aim tile, kao i [public/reviews.json](public/reviews.json) ako se referencira.
- **Alternativa:** Dodati novi fajl `06-player-new.webp` i samo zameniti src u HTML-u bez rename-a broja.

### 10. Zameniti labele: STANICA ↔ OPREMA
> *"nazvao si to stanica ... to je u stvari oprema ... ovo ti je stanica"*

- **Šta:** Trenutno `STANICA` tile prikazuje opremu (puške pod zelenim svetlom), a `OPREMA` tile prikazuje zapravo stanicu.
- **Akcija:** Zameniti `<span class="masonry-label">` tekst između ova dva tile-a u [index.html](index.html).
- **Fajlovi:** `04-weapons-red` i `05-weapons-green` — koji je tačno koji? Proveriti na licu mesta — oprema = gun rack, stanica = charging station sa šlemovima.

### 11. Uvesti fotografije sa 2 nova lasera (kad budu dostupne)
> *"Kupili smo još dva nova lasera, tako da će arena još lepše da izgleda"*

- **Šta:** Arena sada ima 2 nova laser topa. Kad vlasnica snimi, zameniti galerijske slike sa novijim (bolja prezentacija).
- **Akcija:** Čekati fotografije od vlasnice.

---

## 👥 O NAMA SEKCIJA

### 12. Zameniti About sliku (ljepša, manje narandžasto)
> *"možda bih zamenila ovu sliku ... tumačimo mi lepšu sliku ove i pušaka"*
> *"slova su naranđasta i ovo je naranđasto, mislim da je malo"*

- **Šta:** Trenutna about-arena.webp je crvena slika sa puškama — vizuelno previše narandžastog/crvenog naglaska.
- **Akcija:** Izabrati drugu sliku iz `Media_RAW/sa maila laki/` (npr. **arena najbolja slika.jpg** ili **arena sa krivudavim laserom.jpg** — izgledaju impresivnije bez previše narandžastog).
- **Gde:** Ažurirati [scripts/process-media.py](scripts/process-media.py) → about-arena source, reprocess, push.

---

## 📱 KONTAKT SEKCIJA

### 13. Social media ikonice u pravim brand bojama
> *"ja bi stavila njih u bojama, kao što je TikTok je crno-beli, Instagram je kao roze, facebook je plavi"*
> *"samo bi stavila prave ikonice koji jesu, a ne ovako da budu crno-bele"*

- **Šta:** Trenutne ikonice su monohromne (belo/crno sa hover crveni glow) — vlasnica želi **prave brand boje**:
  - **Facebook:** #1877F2 (plavi)
  - **Instagram:** pink/purple/yellow gradient (`linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)`)
  - **TikTok:** crno-beli sa cyan/magenta accents (`#25F4EE` + `#FE2C55`)
  - **YouTube:** #FF0000 (crveno)
  - **LinkedIn:** #0A66C2 (plavi)
  - **Threads:** crno/belo (već je monohromno, OK)
  - **Email** (mail icon): zadržati trenutni cyan
- **Akcija:** Za svaku `.social-link` dodati specifičnu boju ili class; popuniti SVG-ove sa pravim brand bojama.
- **Gde:** [index.html](index.html) social links + [css/style.css](css/style.css) `.social-link` hover.

---

## 📋 SITNICE / NOT BLOCKING

### 14. Hero sekcija — "// 01" tag neko zbunjuje
> *"o nama, ne znam šta ovo piše 0.1, to je vratno nešto tebi treba tu za sajt ne znam šta ovo piše ili nije to 0.1"*

- **Šta:** Tag "// 01" iznad naslova "O NAMA" vlasnica je pokušala da dešifruje i pitala se da li je greška. Posle je sama shvatila da je to oznaka rednog broja sekcije.
- **Akcija:** Ne menjati — ostaje kao dizajnerski element (izgleda kul), ali razmisliti da li treba da se smanji opacity na 0.6 da bude manje napadan.

### 15. Logo sa pink/roze — proveriti varijante
> *"i ovaj logo, mi imamo nekoliko vrsti logoa na nekoliko podloga pa ćemo videti samo koje se najbolje uklapa"*

- **Šta:** Vlasnica ima više verzija logo-a (različite pozadine). Treba izabrati onu koja se najbolje uklapa sa novom pink/roze paletom.
- **Akcija:** Čekati da vlasnica pošalje alternative logo fajlove.

---

## Prioritizacija

| Red. | Task | Težina | Blokira korisnika? |
|------|------|--------|-------|
| 1 | #1 Lightbox galerije ne radi | L | **DA** — nemoguće pogledati slike |
| 2 | #2 Mapa u kontaktu ne radi | S | **DA** — čeka novu URL od vlasnice |
| 3 | #3 Zameniti orange sa pink (brand sync) | M | vizuelno |
| 4 | #4 Preurediti redosled sekcija | M | UX |
| 5 | #5 Smanjiti particles u hero-u (da se video vidi) | S | UX — WOW efekat |
| 6 | #9 Ukloniti IGRAČ sliku (sestra biv. vlasnice) | XS | Osetljivo/PR |
| 7 | #10 Zameniti STANICA ↔ OPREMA labele | XS | Ispravnost |
| 8 | #7 REZERVIŠI dugmad — iste forme | S | dizajn |
| 9 | #13 Social ikonice u brand bojama | S | UX |
| 10 | #12 Zameniti About sliku | S | estetika |
| 11 | #6 Hero "desni deo" polovinu (razjasniti) | ? | treba clarification |
| 12 | #8 Rođendan boja — roze vs naranđasto (part of #3) | - | spaja se sa #3 |
| 13 | #11 Fotke sa 2 nova lasera | - | čeka vlasnicu |
| 14 | #15 Logo varijante | - | čeka vlasnicu |
| 15 | #14 "// 01" tag — možda smanjiti opacity | XS | polish |

---

## Sledeći korak

Preporučeni redosled rešavanja (1-2 dana rada):

1. **Fixovati lightbox** (#1) — test na production, debug
2. **Preurediti sekcije** (#4) — HTML reorganize + renumeracija
3. **Pink/roze boja globalno** (#3) — extract iz logo-a + replace orange
4. **Hero particles smanjiti** (#5) — video da dominira
5. **Galerija cleanup** (#9 + #10) — slika + labele
6. **REZERVIŠI dugmad** (#7) — clip-path removal
7. **About slika** (#12) — process-media.py rerun
8. **Social ikonice boje** (#13)
9. **Čekati** vlasnicu za: novu mapu (#2), nove fotke (#11), logo variante (#15)
