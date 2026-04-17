# Predator Laser Tag — Feedback 2026-04-17 task list

- **Izvor:** 7 fajlova iz `KnjigoPis_AI/Feedback_Loop/17.04.2026/` (5 audio + 2 screen recordings)
- **Ukupno:** 6.5 min transkribovano preko Groq whisper-large-v3
- **Raw transkript:** [Feedback_2026-04-17_RAW.md](./Feedback_2026-04-17_RAW.md)

---

## 🔴 KRITIČNO

### 1. Galerija je razvučena — vratiti kompaktnije kockice
> *"galerija... sve razvučeno, sad kao slika, idu one... razvučene"*
> *"prvi put kad sam kliknula bilo su mi male kockice i napisano šta je na svakoj"*
> *"sad mi se razvuklo preko celog ekrana, ne mogu normalno da gledam"*

- **Problem:** Vlasnica je pre videla 4×4 bento grid (16 malih kockica, sve vidljive odjednom). Sada je trenutni marquee scroll sa 300×225px tile-ovima — previše veliko, manje tile-ova u prikazu, tile-ovi deluju "razvučeno preko celog ekrana".
- **Akcija:** Vratiti galeriju u **4×4 bento grid** (kompaktne kvadratne kockice), možda sa pagination ili scroll kroz 3 strane. Strelice levo/desno i dalje mogu ostati.
- **Napomena:** Ona je u ranijim feedback-ovima htela marquee umesto pagination. Sada je promenila mišljenje — **hoće kompaktan grid**. Imamo konflikt — pitati za razjašnjenje: "Hoćeš li kompaktan 4×4 grid sa malim kockicama, ili marquee sa manjim tile-ovima?"
- **Fajlovi:** [css/style.css](css/style.css) `.masonry-track` i `.masonry-item`.

### 2. Preimenovati "ŠTA KAŽU IGRAČI"
> *"ne bih rekla šta kažu igrači. Nama recenzije ne ostavljaju igrači."*
> *"deca od 8 godina... ne znaju, nemaju Gmail"*
> *"team building i odrasli nije ni 10% poslovanja"*
> *"nešto drugo, da nisu igrači. Posetioci nisu, nismo turistička atrakcija"*

- **Problem:** "Igrači" sugeriše decu, koja ne ostavljaju recenzije. Recenzije ostavljaju **roditelji**.
- **Akcija:** Zameniti naslov. Predlozi:
  - "**ŠTA KAŽU RODITELJI**" (najprirodnije, match-uje realnost)
  - "**UTISCI GOSTIJU**"
  - "**PREPORUKE**"
  - "**OCENE I UTISCI**"
- **Fajl:** [index.html](index.html) linija ~114, `<h2>ŠTA KAŽU <span>IGRAČI</span></h2>`
- **Predlog:** Idem sa "ŠTA KAŽU RODITELJI" osim ako vlasnica ne izabere drugo.

### 3. Zameniti crvenu (#ff0040) sa roze (#ff0088) širom sajta
> *"nisi promenio umjesto ove crvene da probamo da staviš tu roze"*
> *"probaj ove naranđasta slova sva da promeniš u to roze"*

- **Problem:** Vlasnica želi da primarna brand boja pređe iz **crvene u pink/roze**. To je veliki global color shift — nije samo orange accenti koje sam već promenio.
- **Akcija:**
  - CSS variable `--red: #ff0040` → `--red: #ff0088` (ili testovima naći tačnu roze iz logo-a)
  - ILI zadržati `--red` kao poseban var i uvesti `--pink: #ff0088` pa globalno zameniti. **Prvi pristup je jednostavniji** — sve postaje roze odjednom.
- **Napomena:** Ovo će promeniti BOJU SKORO SVEGA: naslovi glow, particles, scrollbar, ikonice, tagovi, corner akcenti, hero title highlight. Velika vizuelna transformacija.
- **Fajl:** [css/style.css](css/style.css) linija ~11, CSS root vars.

---

## 🟡 HERO SEKCIJA

### 4. Video i dalje nije dovoljno jasan
> *"video je sada malo bolji, ali i dalje ne. I dalje nije to to"*
> *"vidim samo ovo dete što se smeje, što maše, on je skroz desno i super"*
> *"treba nam jasnije video"*
> *"ajde, probaćemo nekoliko videa ovde"*

- **Akcija:** Vlasnica će testirati više kandidata. Čekamo da pošalje konkretan video fajl. Ona sama kaže "probaćemo nekoliko".
- **Status:** Čeka input.

### 5. PREDATOR naslov pomeriti malkice niže
> *"PREDATOR velikim ozlojima belo, da spustiš malkice dole"*
> *"R prelazi ovom detetu preko glave, što se smeje, pa se ne vidi"*

- **Problem:** Veliki "PREDATOR" naslov u hero-u preklapa ključni subjekt (nasmejanog deteta) u video-u.
- **Akcija:** Dodati `padding-top` ili `margin-top` na `.hero-content` na mobilnom da se naslov spusti niže. Takođe proveriti da li postoji `align-items: center` koji drži naslov centriran pa dete bude ispod. Možda koristiti `justify-content: flex-end` sa malo padding-bottom.
- **Fajl:** [css/style.css](css/style.css) `.hero`, `.hero-content`, `.hero-title`.

### 6. Čestice još smanjiti
> *"tačkice bi trebalo da smanjiš još"*

- **Akcija:** Trenutno 320/90 desktop/mobile. Smanjiti na **200/60**. Vlasnica testira na iPad-u (veći ekran od telefona), tamo su joj još gužva.
- **Fajl:** [js/particles.js](js/particles.js) linija 44.

### 7. Marquee banner ispod hero tagline-a
> *"ispod ovog što piše 'nezaboravno iskustvo' da ide onako, ne ovako što se nestaje, nego da ide sa desna na levo"*
> *"ono što je kod nas najbitnije — parking obezbeđen, ljubaznost, najbolje recenzije od svih laser tag-ova"*

- **Novi zahtev:** Ispod hero tagline-a (typewriter poruka) dodati **horizontalni marquee traku** koja stalno skroluje sa desna na levo sa ključnim prodajnim tačkama:
  - 🅿️ Parking obezbeđen
  - 💖 Ljubaznost osoblja
  - ⭐ Najbolje recenzije od svih laser tag-ova u Beogradu
  - (ona će još smisliti sa Radicom i Necom, tako je rekla — čekamo finalnu listu)
- **Akcija:** Dodati `.hero-usp-marquee` ispod `.hero-tagline`, sa CSS animation translateX loop.
- **Fajl:** [index.html](index.html) hero sekcija + [css/style.css](css/style.css) + možda novi keyframe.
- **Napomena:** Ona kaže "to ću da vidim ja sa Radicom još i sa Necom" — čeka joj finalnu listu USP-ova. Za sada mogu postaviti placeholder sa 3 stavke.

---

## 🟢 BRENDING / LOGO / HEADER

### 8. Logo u header-u smeta — beli sa roze varijanta
> *"logo ovaj skroz levo kad se otvori, on mi sad smeta"*
> *"sivo i to roze mi bode oči"*
> *"imamo logo beli sa rozim — možda bi on bolje stajao, malkice veći"*

- **Problem:** Trenutni logo (pink "A" shield sa tamnom metalnom teksturom) ne uklapa se sa novom roze paletom (task #3). Vlasnica želi **beli logo sa roze akcentima**, malo veći.
- **Akcija:**
  1. Čekati da vlasnica pošalje fajl beli/roze logo
  2. Zameniti `public/assets/img/logo.png`
  3. Povećati `.nav-logo-img` sa trenutnih ~50px na ~60-70px visine
- **Fajl:** [css/style.css](css/style.css) `.nav-logo-img`.
- **Status:** Čeka logo fajl.

---

## ⏳ ZA KASNIJE / VLASNICA ČEKA

### 9. Google Maps business profil slika je loša
> *"na Google map izlazi ovo, brate, katastrofa"*
> *"a mi smo još ovamo, desno"*
> *"ona je dobra i ona te vodi, tačno se vidi, ali ova slika ovde je odvratna"*
> *"ja nikad ne bi otišla u igraonicu kad bih gledala ovu sliku"*

- **Problem:** Kada vlasnica deli link od arene, Google Maps prikazuje stari / loš thumbnail. Ovo NIJE na našem sajtu — to je **Google Business Profile** podešavanje.
- **Akcija:** Napomenuti vlasnici da se uloguje na [business.google.com](https://business.google.com) i **zameni cover photo** na novi (može koristiti "arena najbolja slika" ili drugu lepu).
- **Status:** Ne radi se na našem sajtu. Savetujemo vlasnicu.

---

## 📋 PITANJA ZA VLASNICU

Pre nego što krenem s radom, potreban mi je input:

1. **Galerija** (task #1): kompaktan 4×4 grid bez marquee-ja, ILI manje tile-ove u marquee-u? Napiši mi.
2. **"Šta kažu igrači"** (task #2): predlažem **"ŠTA KAŽU RODITELJI"** — ako imaš bolji predlog, javi.
3. **Crvena → roze** (task #3): siguran si da hoćeš ceo sajt u roze (umesto crvene)? Ovo menja SKORO SVE crvene akcente u pink/magenta. Veliki vizuelni zaokret.
4. **USP marquee** (task #7): daj mi finalnu listu 3-5 stavki koje treba da skrolluju (parking, ljubaznost, nešto dalje?).
5. **Beli logo** (task #8): pošalji fajl kad budeš u mogućnosti.
6. **Novi hero video** (task #4): pošalji kandidata kad snimiš.

---

## Prioritet

| Red. | Task | Blokira? |
|------|------|----------|
| 1 | #2 Preimenovati "ŠTA KAŽU IGRAČI" → RODITELJI | NE — 30s posla |
| 2 | #5 Spustiti PREDATOR naslov niže | NE — 5 min |
| 3 | #6 Smanjiti čestice 320→200 | NE — 10s |
| 4 | #1 Vratiti kompaktan gallery grid | **DA** — vlasnica ne može da gleda galeriju |
| 5 | #3 Crvena → roze globalno | Veliko, čeka potvrdu |
| 6 | #7 Hero USP marquee | Čeka listu od vlasnice |
| 7 | #8 Novi logo | Čeka fajl |
| 8 | #4 Novi hero video | Čeka fajl |
| 9 | #9 Google Business profil slika | Van našeg sajta |

---

## Preporuka

**Odmah (10 min):** #2 rename, #5 naslov niže, #6 particles -30%.

**Čim vlasnica odgovori na pitanja:** #1 gallery, #3 roze, #7 USP marquee.

**Kad stignu fajlovi:** #8 logo, #4 video.
