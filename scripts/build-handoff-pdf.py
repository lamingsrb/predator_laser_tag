"""Builds the client handoff PDF - Predator Laser Tag.

Produces a single A4 PDF at:
  Hosting_Setup/Predator_Laser_Tag_Predaja_2026-04-21.pdf

Contents (in order):
  1. Cover page (logo + title + date)
  2. Thank-you letter
  3. "Your site is live" overview
  4. Access credentials (Vercel, Gmail, Vesta/SixPack)
  5. Where the source code lives
  6. Project history - 5 phases
  7. How to request future changes
  8. What runs automatically (reviews cron, SSL renew)
  9. Security do's and don'ts
  10. Support contacts
  11. Closing note

Non-tech Serbian audience. Serbian Latin dijakritike (š, ž, č, ć, đ) via
registered Arial TTFs. Pink #ff0088 brand accent, white paper.
"""
from __future__ import annotations
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, PageBreak,
    Image, Table, TableStyle, KeepTogether,
)
from reportlab.platypus.flowables import HRFlowable

# -----------------------------------------------------------------------
# Paths
# -----------------------------------------------------------------------
ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "Hosting_Setup"
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT = OUT_DIR / "Predator_Laser_Tag_Predaja_2026-04-21.pdf"
LOGO = ROOT / "public" / "assets" / "img" / "logo.png"

# -----------------------------------------------------------------------
# Fonts - Arial for full Serbian Latin support (š, ž, č, ć, đ)
# -----------------------------------------------------------------------
WIN_FONTS = Path("C:/Windows/Fonts")
pdfmetrics.registerFont(TTFont("Arial",    str(WIN_FONTS / "arial.ttf")))
pdfmetrics.registerFont(TTFont("Arial-B",  str(WIN_FONTS / "arialbd.ttf")))
pdfmetrics.registerFont(TTFont("Arial-I",  str(WIN_FONTS / "ariali.ttf")))

# -----------------------------------------------------------------------
# Colors
# -----------------------------------------------------------------------
PINK     = colors.HexColor("#ff0088")
PINK_BG  = colors.HexColor("#ffeaf4")
DARK     = colors.HexColor("#1a1a1a")
GRAY     = colors.HexColor("#666666")
LIGHT_BG = colors.HexColor("#f5f5f7")
BORDER   = colors.HexColor("#dddddd")
LINK     = colors.HexColor("#0b63ce")
WARN_BG  = colors.HexColor("#fff4d6")
WARN_TXT = colors.HexColor("#8a5a00")

# -----------------------------------------------------------------------
# Styles
# -----------------------------------------------------------------------
sheet = getSampleStyleSheet()

S_COVER_TITLE = ParagraphStyle(
    "CoverTitle", parent=sheet["Normal"],
    fontName="Arial-B", fontSize=28, leading=34, alignment=1,
    textColor=DARK, spaceBefore=0, spaceAfter=6,
)
S_COVER_SUB = ParagraphStyle(
    "CoverSub", parent=sheet["Normal"],
    fontName="Arial", fontSize=14, leading=20, alignment=1,
    textColor=PINK, spaceAfter=30,
)
S_COVER_META = ParagraphStyle(
    "CoverMeta", parent=sheet["Normal"],
    fontName="Arial", fontSize=10, leading=14, alignment=1,
    textColor=GRAY,
)

S_H1 = ParagraphStyle(
    "H1", parent=sheet["Normal"],
    fontName="Arial-B", fontSize=18, leading=24,
    textColor=PINK, spaceBefore=18, spaceAfter=10,
)
S_H2 = ParagraphStyle(
    "H2", parent=sheet["Normal"],
    fontName="Arial-B", fontSize=13, leading=18,
    textColor=DARK, spaceBefore=12, spaceAfter=6,
)
S_BODY = ParagraphStyle(
    "Body", parent=sheet["Normal"],
    fontName="Arial", fontSize=11, leading=17,
    textColor=DARK, spaceAfter=8, alignment=4,  # justify
)
S_BODY_LEFT = ParagraphStyle(
    "BodyLeft", parent=S_BODY, alignment=0,
)
S_BULLET = ParagraphStyle(
    "Bullet", parent=S_BODY, leftIndent=16, bulletIndent=4,
    spaceAfter=4, alignment=0,
)
S_MONO_CELL = ParagraphStyle(
    "MonoCell", parent=sheet["Normal"],
    fontName="Courier", fontSize=9.5, leading=13, textColor=DARK,
)
S_CELL_LABEL = ParagraphStyle(
    "CellLabel", parent=sheet["Normal"],
    fontName="Arial-B", fontSize=10, leading=13, textColor=DARK,
)
S_CELL_VALUE = ParagraphStyle(
    "CellValue", parent=sheet["Normal"],
    fontName="Arial", fontSize=10, leading=13, textColor=DARK,
)
S_WARN = ParagraphStyle(
    "Warn", parent=sheet["Normal"],
    fontName="Arial-B", fontSize=10, leading=14,
    textColor=WARN_TXT, alignment=0,
    backColor=WARN_BG, borderPadding=8, borderColor=WARN_BG, borderWidth=0,
    spaceBefore=6, spaceAfter=10,
)
S_SIGN = ParagraphStyle(
    "Sign", parent=sheet["Normal"],
    fontName="Arial-I", fontSize=11, leading=16,
    textColor=DARK, alignment=0, spaceBefore=16,
)
S_PHASE_TITLE = ParagraphStyle(
    "PhaseTitle", parent=sheet["Normal"],
    fontName="Arial-B", fontSize=12, leading=16,
    textColor=PINK, spaceBefore=12, spaceAfter=4,
)
S_PHASE_DATE = ParagraphStyle(
    "PhaseDate", parent=sheet["Normal"],
    fontName="Arial-I", fontSize=10, leading=13,
    textColor=GRAY, spaceAfter=6,
)


# -----------------------------------------------------------------------
# Utility: colored rule separator
# -----------------------------------------------------------------------
def rule(color=PINK, thickness=1.2, space_before=4, space_after=8):
    return HRFlowable(
        width="100%", thickness=thickness, lineCap="round", color=color,
        spaceBefore=space_before, spaceAfter=space_after,
    )


def bullet(text):
    return Paragraph(f"• {text}", S_BULLET)


def link(url, label=None):
    label = label or url
    return f'<font color="#0b63ce"><u>{label}</u></font> ({url})' if label != url else f'<font color="#0b63ce"><u>{url}</u></font>'


# -----------------------------------------------------------------------
# Page frame / footer
# -----------------------------------------------------------------------
PAGE_W, PAGE_H = A4
MARGIN = 2.0 * cm


def draw_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Arial", 8)
    canvas.setFillColor(GRAY)
    canvas.drawString(MARGIN, 1.0 * cm, "Predator Laser Tag - Predaja sajta")
    canvas.drawRightString(PAGE_W - MARGIN, 1.0 * cm, f"strana {doc.page}")
    # pink hairline above footer
    canvas.setStrokeColor(PINK)
    canvas.setLineWidth(0.6)
    canvas.line(MARGIN, 1.4 * cm, PAGE_W - MARGIN, 1.4 * cm)
    canvas.restoreState()


def draw_cover(canvas, doc):
    # No footer on cover page; keep it clean
    canvas.saveState()
    canvas.setStrokeColor(PINK)
    canvas.setLineWidth(1.2)
    # decorative L-corner top-left
    canvas.line(MARGIN, PAGE_H - MARGIN, MARGIN + 60, PAGE_H - MARGIN)
    canvas.line(MARGIN, PAGE_H - MARGIN, MARGIN, PAGE_H - MARGIN - 60)
    # decorative L-corner bottom-right
    canvas.line(PAGE_W - MARGIN, MARGIN, PAGE_W - MARGIN - 60, MARGIN)
    canvas.line(PAGE_W - MARGIN, MARGIN, PAGE_W - MARGIN, MARGIN + 60)
    canvas.restoreState()


# -----------------------------------------------------------------------
# Build content
# -----------------------------------------------------------------------
def build_story():
    story = []

    # --- COVER ------------------------------------------------------
    story.append(Spacer(1, 4 * cm))
    if LOGO.exists():
        logo_img = Image(str(LOGO), width=7 * cm, height=7 * cm, kind="proportional")
        logo_img.hAlign = "CENTER"
        story.append(logo_img)
    story.append(Spacer(1, 1.5 * cm))
    story.append(Paragraph("Predator Laser Tag", S_COVER_TITLE))
    story.append(Paragraph("Predaja sajta", S_COVER_SUB))
    story.append(Spacer(1, 1.0 * cm))
    story.append(Paragraph("21. april 2026.", S_COVER_META))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph(
        "<i>Poverljiv dokument - sadrži šifre za pristup.<br/>"
        "Čuvati na sigurnom mestu.</i>", S_COVER_META))
    story.append(PageBreak())

    # --- ZAHVALNICA -------------------------------------------------
    story.append(Paragraph("Hvala Vam", S_H1))
    story.append(rule())
    story.append(Paragraph(
        "Poštovana,",
        S_BODY_LEFT))
    story.append(Paragraph(
        "Kroz <b>tri kruga feedback-a</b>, nekoliko dana fokusiranog rada i "
        "više zajedničkih pregleda fotografija i video materijala, zajedno "
        "smo napravili sajt koji danas preuzimate. Svaki kadar u galeriji, "
        "svaka rečenica u tekstu i svaka cena na kartici je proverena sa "
        "Vama pre nego što je ušla u finalnu verziju.",
        S_BODY))
    story.append(Paragraph(
        "Hvala Vam na poverenju, na strpljenju, i na tome što ste mi "
        "poslali profesionalni foto i video materijal baš u pravom trenutku. "
        "Sajt koji danas preuzimate - prelep, savremen, brz i potpuno Vaš "
        "- nije mogao da postoji bez tog materijala i Vaše jasne vizije "
        "šta želite da roditelji osete kada ga otvore.",
        S_BODY))
    story.append(Paragraph(
        "Sad je na red došao najlepši deo priče: da Vam sajt donosi rezervacije "
        "i da deca nastave da izlaze iz arene izmorena od smeha. ",
        S_BODY))
    story.append(Paragraph(
        "Od srca,<br/><b>Lazar Milićević</b><br/>"
        "<font size='9' color='#666666'>lamingsrb@gmail.com</font>",
        S_SIGN))
    story.append(PageBreak())

    # --- SAJT JE LIVE -----------------------------------------------
    story.append(Paragraph("Vaš sajt je live", S_H1))
    story.append(rule())
    story.append(Paragraph(
        "Od 21. aprila 2026. u 23h, sajt <b>https://lasertagpredator.rs</b> "
        "je javan i dostupan svima.",
        S_BODY))
    info_data = [
        [Paragraph("<b>Glavni URL</b>", S_CELL_LABEL),
         Paragraph("https://lasertagpredator.rs", S_CELL_VALUE)],
        [Paragraph("<b>www verzija</b>", S_CELL_LABEL),
         Paragraph("https://www.lasertagpredator.rs - automatski preusmerava na glavni URL", S_CELL_VALUE)],
        [Paragraph("<b>Hosting</b>", S_CELL_LABEL),
         Paragraph("Vercel (globalna mreža servera, automatsko skaliranje)", S_CELL_VALUE)],
        [Paragraph("<b>SSL sertifikat</b>", S_CELL_LABEL),
         Paragraph("aktivan (ikona katanca u browser-u) - automatski se obnavlja", S_CELL_VALUE)],
        [Paragraph("<b>Mesečni trošak hostinga</b>", S_CELL_LABEL),
         Paragraph("<b>0 RSD</b> (Vercel Hobby plan besplatan za ovaj obim posete)", S_CELL_VALUE)],
    ]
    t = Table(info_data, colWidths=[4.8 * cm, 11.2 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), LIGHT_BG),
        ("GRID",       (0, 0), (-1, -1), 0.5, BORDER),
        ("VALIGN",     (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING",(0, 0), (-1, -1), 8),
        ("RIGHTPADDING",(0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 6),
    ]))
    story.append(t)
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "<b>Šta ovo u praksi znači za Vas:</b> sajt se učitava brzo iz bilo "
        "koje zemlje (Vercel ima servere širom sveta, korisnik iz Niša dobija "
        "sadržaj sa evropskog servera, ne sa američkog). Ne morate da brinete "
        "o SSL sertifikatu, bekapu, održavanju - sve to radi Vercel "
        "automatski u pozadini.",
        S_BODY))
    story.append(PageBreak())

    # --- PRISTUPI ---------------------------------------------------
    story.append(Paragraph("Vaši pristupi", S_H1))
    story.append(rule())

    # --- Vercel
    story.append(Paragraph("Vercel - gde Vaš sajt živi", S_H2))
    story.append(Paragraph(
        "Ovo je Vaš glavni nalog. Preko njega vidite sve što se dešava sa sajtom.",
        S_BODY))
    vercel = [
        [Paragraph("<b>URL</b>", S_CELL_LABEL),
         Paragraph("https://vercel.com", S_CELL_VALUE)],
        [Paragraph("<b>Login email</b>", S_CELL_LABEL),
         Paragraph("<font face='Courier'>predatorlasertagbeograd@gmail.com</font>", S_CELL_VALUE)],
        [Paragraph("<b>Šifra</b>", S_CELL_LABEL),
         Paragraph("ona koju ste izabrali pri registraciji<br/>"
                   "<font size='8' color='#666'>(ako je zaboravite - klik na 'Forgot password' na login stranici, stiže Vam reset mail)</font>",
                   S_CELL_VALUE)],
        [Paragraph("<b>Ime projekta</b>", S_CELL_LABEL),
         Paragraph("<font face='Courier'>predator-laser-tag</font>", S_CELL_VALUE)],
    ]
    t = Table(vercel, colWidths=[3.5 * cm, 12.5 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), LIGHT_BG),
        ("GRID",       (0, 0), (-1, -1), 0.5, BORDER),
        ("VALIGN",     (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING",(0, 0), (-1, -1), 8),
        ("RIGHTPADDING",(0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 6),
    ]))
    story.append(t)
    story.append(Spacer(1, 8))
    story.append(Paragraph("<b>Šta smete:</b>", S_CELL_LABEL))
    story.append(bullet("Da vidite listu deploy-eva (svaka izmena = jedan deploy, sa datumom)"))
    story.append(bullet("Da uradite <b>Rollback</b> jednim klikom - vraća sajt na prethodnu verziju ako nešto novo iskrene"))
    story.append(bullet("Da vidite koliko ljudi posećuje sajt (Analytics tab, opciono)"))
    story.append(Paragraph("<b>Šta ne treba da dirate:</b>", S_CELL_LABEL))
    story.append(bullet("<b>Environment Variables</b> i <b>Build Settings</b> - ako nešto promenite tu, deploy može da pukne"))
    story.append(bullet("Dugme <b>Delete Project</b> - briše sajt trajno"))

    # --- Gmail
    story.append(Paragraph("Gmail", S_H2))
    story.append(Paragraph(
        "Nalog <font face='Courier'>predatorlasertagbeograd@gmail.com</font> "
        "i dalje radi kao i ranije. Nismo ga dirali.",
        S_BODY))

    # --- Vesta / Domen
    story.append(Paragraph("Stari hosting (SixPack / Vesta) - zbog domena", S_H2))
    story.append(Paragraph(
        "Sajt je preseljen na Vercel, ali <b>domen</b> "
        "<font face='Courier'>lasertagpredator.rs</font> je i dalje registrovan "
        "preko SixPack-a (zavedeni su kao Vaš kontakt kod registra). Godišnja "
        "obnova se plaća njima. Za detalje iznosa i datum obnove obratite se "
        "direktno Marku - kontakt je dole. Sve dok je domen kod njih, pristup "
        "Vesta panelu Vam je potreban.",
        S_BODY))
    story.append(Paragraph(
        "<b>Detalji domena</b> (iz javnog RNIDS registra):",
        S_CELL_LABEL))
    domen_tab = [
        [Paragraph("<b>Registrator</b>", S_CELL_LABEL),
         Paragraph("Loopia d.o.o. (tehnički registrator kod RNIDS-a)", S_CELL_VALUE)],
        [Paragraph("<b>Kontakt za Vas</b>", S_CELL_LABEL),
         Paragraph("SixPack - Marko Pavišić (oni naplaćuju godišnju obnovu)", S_CELL_VALUE)],
        [Paragraph("<b>Datum isteka</b>", S_CELL_LABEL),
         Paragraph("<b>21. avgust 2026.</b> - račun očekujte oko mesec dana pre", S_CELL_VALUE)],
    ]
    td = Table(domen_tab, colWidths=[3.5 * cm, 12.5 * cm])
    td.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), LIGHT_BG),
        ("GRID",       (0, 0), (-1, -1), 0.5, BORDER),
        ("VALIGN",     (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING",(0, 0), (-1, -1), 8),
        ("RIGHTPADDING",(0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 6),
    ]))
    story.append(td)
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "<b>Pristup Vesta panelu</b> (za eventualne tehničke izmene):",
        S_CELL_LABEL))
    vesta = [
        [Paragraph("<b>Panel URL</b>", S_CELL_LABEL),
         Paragraph("https://spd.mysafeservers.com:12383/?logovanje", S_CELL_VALUE)],
        [Paragraph("<b>Username</b>", S_CELL_LABEL),
         Paragraph("<font face='Courier'>PredatorLaser</font>", S_CELL_VALUE)],
        [Paragraph("<b>Šifra</b>", S_CELL_LABEL),
         Paragraph("<font face='Courier'>nI@9@H%G45sq%f4$G5gcGkdc</font>", S_CELL_VALUE)],
        [Paragraph("<b>Provider kontakt</b>", S_CELL_LABEL),
         Paragraph("Marko Pavišić (SixPack) - marko.pavisic@sixpack.rs - +381 63 850 9000",
                   S_CELL_VALUE)],
    ]
    t = Table(vesta, colWidths=[3.5 * cm, 12.5 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), LIGHT_BG),
        ("GRID",       (0, 0), (-1, -1), 0.5, BORDER),
        ("VALIGN",     (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING",(0, 0), (-1, -1), 8),
        ("RIGHTPADDING",(0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 6),
    ]))
    story.append(t)
    story.append(Paragraph(
        "<b>VAŽNO:</b> prvi put kada uđete u panel, odmah promenite šifru "
        "(Settings → Change Password). Gornja šifra je bila deljena između Vas, mene "
        "i provajdera tokom postavke - više nije potpuno tajna. Nova šifra "
        "treba da ostane samo kod Vas.",
        S_WARN))
    story.append(PageBreak())

    # --- ŠTA JE URAĐENO ---------------------------------------------
    story.append(Paragraph("Šta je urađeno - put do sajta", S_H1))
    story.append(rule())
    story.append(Paragraph(
        "Projekat je prošao kroz <b>tri velika kruga Vašeg feedback-a</b> i "
        "84 commit-a (tačaka snimanja u istoriji). Grupisano u 5 faza:",
        S_BODY))

    phases = [
        ("Faza 1 - Temelj sajta", "20. mart - 16. april", [
            "Prvi skelet sajta i arhitektura sekcija (Hero, O nama, Paketi, Galerija, Recenzije, Kontakt).",
            "Hero video iz prvih materijala koje ste dali.",
            "Google recenzije povučene automatski (avatari, zvezde, tekstovi) - bez ručnog kucanja.",
            "Galerija (marquee sa lightbox-om za uvećanu sliku kada se klikne).",
            "Realne cene paketa preuzete iz Vašeg cenovnika, ne izmišljene.",
            "Kompletan favicon set generisan iz Vašeg logoa (ikona koja se vidi u tabu browsera).",
            "Mobilna responsivnost - sajt radi isto lepo na telefonu kao na desktopu, hero video se prikazuje i na mobilnom.",
        ]),
        ("Faza 2 - Prva velika kritika i redizajn", "17. april", [
            "Posle Vašeg 14-minutnog audio feedback-a, sajt je skoro u potpunosti prerađen.",
            "Hero video posvetljen, novi uvod sa decom i balonima.",
            "Brand boja crvena → <b>pink #ff0088 iz Vašeg logoa</b> globalno (narandžasta potpuno eliminisana).",
            "Logo transparentan, veći u headeru i footeru - jače prisutan.",
            "Paketi Standard i LUX sa tekstom tačno iz Vaših materijala i cenama <b>31.000 / 36.000 RSD</b>.",
            "Nova sekcija <b>Pozivnice</b> sa 4 primera koje ste dali.",
            "Dugme „UĐI U ARENU\" sada vodi na galeriju (ne na pakete).",
            "Scroll-spy meni - stavka u meniju svetli pink dok ste u toj sekciji, roditelj odmah zna gde je.",
            "Sekcija „Iznajmljivanje Prostora\" iz ljubičaste prebačena u brand pink.",
            "Adresa ispravljena na „Čarobne frule 36, Zvezdara - Mirijevo\".",
            "Ispravka na 300m² umesto 280m² svuda gde se pominje arena.",
            "Footer ikonice društvenih mreža uklonjene (niste ih koristili tako jer nisu bile prave brand ikonice).",
            "Google mapa u kontaktu - klik bilo gde na mapu otvara pravu Google Maps lokaciju.",
            "Popravljen lightbox galerije (klik na sliku otvara veliki pregled).",
            "Fotografija u „O nama\" zamenjena novom, zanimljivijom.",
        ]),
        ("Faza 3 - Detalji i restruktura", "17 - 18. april", [
            "PAKETI sekcija restrukturisana u <b>4 taba</b>: Rođendani / Team Building / Individualni termini / Iznajmljivanje Prostora.",
            "Broj Google recenzija 213 → 218 → i pustili smo ga da se <b>automatski ažurira</b> svaku noć u 4:15 po Beogradu preko SerpAPI servisa. Ne morate više nikad ručno da ga menjate.",
            "Na kartici „Rođendani\" dodata eksplicitna poruka <b>„Nema ograničenja za broj dece\"</b> - 90% roditelja Vas je to pitalo, sad je napisano.",
            "Implementiran skriveni <b>„Game Over\" glasovni signal</b> za kraj igre u areni: dugo držanje logoa u headeru (~0.7 sekundi) pušta snimak „Game over. Molimo vas, ugasite lasere i polako izađite iz arene...\". Ženski glas je aktivan, muški je u rezervi ako budete želeli promenu.",
            "Ispravljene gramatičke greške i besmislene rečenice u sekciji „Iskustvo\" (reč „puškomi\" bila je slovna greška, tekst prerađen na ljudski govor).",
        ]),
        ("Faza 4 - Vizuelni i emocionalni punch", "19 - 21. april", [
            "Ugradnja Vašeg novog profesionalnog materijala: <b>58 fotografija + 2 video klipa</b>.",
            "Galerija proširena na <b>116 pločica</b> = 58 novih profesionalnih + 43 oštre stare + 6 porodičnih. Pet mutnih fotografija automatski isključeno (algoritam za detekciju zamagljenosti). Oba nova profesionalna videa su na prvoj strani galerije.",
            "Hero video na vrhu sajta rebuildovan - sada uključuje ceo Vaš novi profesionalni snimak kroz arenu.",
            "Slika u „O nama\" zamenjena <b>video walkthrough-om</b> koji se vrti u loop-u - profesionalni snimak od ulaznih vrata kroz ceo lokal.",
            "Tekst u „O nama\" prepisan za <b>roditelje</b> umesto za tehničku publiku. Naslov: „Dva sata za njih. Dva sata mira za vas.\" Pogodi roditeljski osećaj - umor, sreća, tih put kući - ne nabraja se tehnologija.",
            "Efekti: laser zraci (crveni i zeleni, kao iz Predator / Star Wars) koji povremeno preseku ekran i razbijaju particles u akciji. Zvukovi su kasnije utišani po Vašem traženju, efekat ostaje samo vizuelan.",
        ]),
        ("Faza 5 - Lansiranje na pravi domen", "21. april", [
            "Kreiran Vaš lični Vercel nalog preko predatorlasertagbeograd@gmail.com.",
            "Projekat prebačen sa mog naloga na Vaš - <b>sajt je sada zvanično Vaš</b>.",
            "Domen <b>lasertagpredator.rs</b> dodat u Vaš Vercel + automatski 308 redirekt sa <b>www.</b>",
            "DNS (adresa koja govori internetu gde da pronađe Vaš sajt) promenjen u Vesta CP panelu - stari server → Vercel.",
            "Registracija domena <b>lasertagpredator.rs</b> ostaje kod SixPack-a - godišnju obnovu fakturišu oni.",
            "SSL sertifikat automatski izdat od <b>Let's Encrypt</b> preko Vercel-a (ikona katanca u browser-u).",
            "Globalna DNS propagacija gotova za ~10 minuta.",
            "<b>Sajt je live.</b>",
        ]),
    ]

    for title, date, items in phases:
        block = [
            Paragraph(title, S_PHASE_TITLE),
            Paragraph(date, S_PHASE_DATE),
        ] + [bullet(it) for it in items]
        # KeepTogether keeps each phase block on one page when possible
        story.append(KeepTogether(block))
    story.append(PageBreak())

    # --- KAKO SE TRAZE IZMENE ---------------------------------------
    story.append(Paragraph("Kako se traže izmene u budućnosti", S_H1))
    story.append(rule())
    story.append(Paragraph(
        "Jednostavno - <b>pišete mi</b>. Email ili telefon. Kažete šta želite "
        "da se promeni (tekst, cena, slika, novo dugme…).",
        S_BODY))
    story.append(Paragraph(
        "Tok izmene:",
        S_CELL_LABEL))
    story.append(bullet("Vi pošaljete opis promene."))
    story.append(bullet("Ja uradim izmenu u kodu i pošaljem je na GitHub."))
    story.append(bullet("Vercel automatski detektuje promenu i deploy-uje novu verziju za ~30 sekundi."))
    story.append(bullet("Vi osvežite sajt u browseru - nova verzija je tamo."))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "<b>Ne treba da ulazite u Vercel panel za ovo.</b> Vercel otvorite samo "
        "ako želite da vidite kako sajt izgleda u analytics-u ili ako se nešto "
        "pokvari i treba hitan rollback.",
        S_BODY))
    story.append(PageBreak())

    # --- AUTOMATIZMI ------------------------------------------------
    story.append(Paragraph("Šta radi samo, bez Vas", S_H1))
    story.append(rule())
    story.append(Paragraph(
        "Sajt u pozadini ima nekoliko stvari koje se odvijaju automatski - "
        "niste ih Vi postavili, ne morate ih održavati:",
        S_BODY))
    auto = [
        [Paragraph("<b>Broj Google recenzija</b>", S_CELL_LABEL),
         Paragraph("Svako jutro u 4:15 po Beogradu, robot proverava Google i ažurira broj (bez Vas, bez mene).",
                   S_CELL_VALUE)],
        [Paragraph("<b>SSL sertifikat</b>", S_CELL_LABEL),
         Paragraph("Vercel ga automatski obnavlja svaka 3 meseca. Nikad ne ističe.",
                   S_CELL_VALUE)],
        [Paragraph("<b>Bekap koda</b>", S_CELL_LABEL),
         Paragraph("GitHub čuva celu istoriju - svih 84 verzija u kojima je projekat prošao.",
                   S_CELL_VALUE)],
        [Paragraph("<b>Skaliranje</b>", S_CELL_LABEL),
         Paragraph("Ako za vikend dobijete 10× više poseta, sajt to preživljava bez usporavanja. Vercel to reši sam.",
                   S_CELL_VALUE)],
    ]
    t = Table(auto, colWidths=[4.5 * cm, 11.5 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), LIGHT_BG),
        ("GRID",       (0, 0), (-1, -1), 0.5, BORDER),
        ("VALIGN",     (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING",(0, 0), (-1, -1), 8),
        ("RIGHTPADDING",(0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 6),
    ]))
    story.append(t)

    # --- SIGURNOST --------------------------------------------------
    story.append(Paragraph("Sigurnost - par pravila", S_H1))
    story.append(rule())
    story.append(Paragraph("<b>Uradite:</b>", S_CELL_LABEL))
    story.append(bullet("Promenite Vesta šifru čim uđete prvi put."))
    story.append(bullet("Ako primite mejl da je Vaš nalog „hakovan\" ili „suspendovan\" - ne klikćite linkove. Prvo me pozovite."))
    story.append(bullet("Šifre iz ovog dokumenta čuvajte kao tajnu. Ne deliti preko običnog emaila neznancima."))
    story.append(Paragraph("<b>Ne dirajte:</b>", S_CELL_LABEL))
    story.append(bullet("Environment variables i Build settings u Vercelu - mogu da pokvare deploy."))
    story.append(bullet("DNS zapise u Vesta panelu - ako se promene, sajt prestaje da radi na Vašem domenu."))
    story.append(bullet("Dugme „Delete\" bilo gde - uglavnom je trajno."))
    story.append(Paragraph(
        "Ako nešto deluje čudno (sajt ne radi, ne stiže email, broj recenzija "
        "naglo promenjen, bilo šta), <b>prvi potez je da me pozovete</b>. Ne "
        "trošite sat vremena u panici - 80% stvari se reši za 10 minuta sa "
        "moje strane.",
        S_BODY))
    story.append(PageBreak())

    # --- KONTAKT ----------------------------------------------------
    story.append(Paragraph("Podrška i kontakti", S_H1))
    story.append(rule())
    kontakt = [
        [Paragraph("<b>Developer (ja)</b>", S_CELL_LABEL),
         Paragraph("<b>Lazar Milićević</b><br/>"
                   "Email: <font face='Courier'>lamingsrb@gmail.com</font><br/>"
                   "GSM: <font face='Courier'>&lt;popuniti pre slanja&gt;</font>",
                   S_CELL_VALUE)],
        [Paragraph("<b>Vercel podrška</b>", S_CELL_LABEL),
         Paragraph("https://vercel.com/help<br/>"
                   "<font size='8' color='#666'>Za tehnička pitanja oko Vercel platforme.</font>",
                   S_CELL_VALUE)],
        [Paragraph("<b>Stari hosting + domen (SixPack)</b>", S_CELL_LABEL),
         Paragraph("Marko Pavišić<br/>"
                   "Email: <font face='Courier'>marko.pavisic@sixpack.rs</font><br/>"
                   "Mobilni: +381 63 850 9000",
                   S_CELL_VALUE)],
    ]
    t = Table(kontakt, colWidths=[5.2 * cm, 10.8 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), LIGHT_BG),
        ("GRID",       (0, 0), (-1, -1), 0.5, BORDER),
        ("VALIGN",     (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING",(0, 0), (-1, -1), 8),
        ("RIGHTPADDING",(0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 8),
    ]))
    story.append(t)

    # --- POSLEDNJA REC ----------------------------------------------
    story.append(Spacer(1, 16))
    story.append(Paragraph("Poslednja reč", S_H1))
    story.append(rule())
    story.append(Paragraph(
        "Ovaj sajt je sada potpuno Vaš. Domen, sadržaj, vizuelni identitet, "
        "fotografije - sve na jednom mestu, u Vašim rukama. "
        "Ja sam ovde kad god Vam nešto zatreba - od promene cene do nove sekcije.",
        S_BODY))
    story.append(Paragraph(
        "Srećno sa narednim rođendanom! Nek` ih bude što više.",
        S_BODY))
    story.append(Paragraph(
        "- Lazar",
        S_SIGN))

    return story


# -----------------------------------------------------------------------
# Assemble document
# -----------------------------------------------------------------------
def main():
    doc = BaseDocTemplate(
        str(OUT),
        pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=MARGIN, bottomMargin=MARGIN,
        title="Predator Laser Tag - Predaja sajta",
        author="Lazar Milićević",
        subject="Klijentska predaja sajta",
    )
    frame = Frame(
        MARGIN, MARGIN, PAGE_W - 2 * MARGIN, PAGE_H - 2 * MARGIN,
        leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0,
        id="normal",
    )
    # Cover uses a different page template (no footer)
    cover_template = PageTemplate(id="cover", frames=frame, onPage=draw_cover)
    main_template  = PageTemplate(id="main",  frames=frame, onPage=draw_footer)
    doc.addPageTemplates([cover_template, main_template])

    story = build_story()
    # After cover page, switch template via a hook. We insert PageBreak after
    # cover content already; setting NextPageTemplate is the reportlab way:
    from reportlab.platypus import NextPageTemplate
    # Prepend a switcher so first flowable after cover goes to 'main' template
    # Actually simpler: add NextPageTemplate('main') right before the first
    # PageBreak. We rebuild story to inject it.
    injected = []
    inserted = False
    for fl in story:
        if not inserted and isinstance(fl, PageBreak):
            injected.append(NextPageTemplate("main"))
            injected.append(fl)
            inserted = True
        else:
            injected.append(fl)

    doc.build(injected)
    size_kb = OUT.stat().st_size / 1024
    print(f"[done] {OUT}  ({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
