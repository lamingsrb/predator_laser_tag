"""Rebuilds the masonry-track block inside index.html from a curated list.

Curation priority (ranked):
  - Best visually-striking arena / weapons / action shots FIRST so desktop
    page 1 (16 tiles) impresses
  - Mixed with 'drustvo' family photos that the owner liked (kept as-is)
  - 7 existing gallery-action videos interspersed as LIVE AKCIJA tiles
  - Softer content (party rooms, portraits) on later pages

Writes index.html in place. Re-runnable — replaces whatever is currently
between `<div class="masonry-track" id="masonry-track">` and its closing
`</div>`.
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HTML = ROOT / "index.html"

# (stem, label, caption) — stem 'pNN' = new professional photo, 'drNNN' = kept drustvo,
# 'videoN' = gallery-action video, mapping below.
# Order is the tile order (page 1 = first 16, page 2 = next 16, etc.)
TILES = [
    # --- PAGE 1: strongest hero shots + instant vibe ---
    ("photo", "p14", "ARENA",        "UV arena u akciji"),
    ("photo", "00a-drustvo-bday", "DRUŠTVO", "Društvo u areni — rođendan"),
    ("photo", "p29", "EKIPA",        "Ekipa pred galaksiju"),
    ("video", "1",   "LIVE AKCIJA",  "Laser tag u akciji"),
    ("photo", "p13", "OPREMA",       "Puške spremne"),
    ("photo", "p22", "SLAVLJENICI",  "Cela ekipa slavljenika"),
    ("photo", "p36", "ARENA",        "Arena i sletno iskustvo"),
    ("photo", "p31", "ROĐENDAN",     "Rođendanska pauza za picu"),
    ("photo", "p07", "STANICA",      "Stanica sa opremom"),
    ("photo", "00e-drustvo-mozaik", "UTISCI", "Najbolji trenuci"),
    ("photo", "p03", "TEMA",         "Superheroj tema"),
    ("photo", "p24", "AKCIJA",       "Klinci u akciji"),
    ("video", "2",   "LIVE AKCIJA",  "Gađanje u areni"),
    ("photo", "p23", "AKCIJA",       "Napad u toku"),
    ("photo", "p04", "SLAVLJENIK",   "Slavljenik sa tablom"),
    ("photo", "p17", "EKIPA",        "Grupna fotka u areni"),

    # --- PAGE 2 ---
    ("photo", "p08", "ARENA",        "UV detalj arene"),
    ("photo", "p19", "EKIPA",        "Grupa dečaka"),
    ("video", "3",   "LIVE AKCIJA",  "Runda u toku"),
    ("photo", "p25", "SLAVLJENICI",  "Deca u areni"),
    ("photo", "p32", "ARENA",        "Arena i mural"),
    ("photo", "00f-drustvo-arena", "CREW", "Pred ulazom u arenu"),
    ("photo", "p39", "SLAVLJENIK",   "Slavljenik"),
    ("photo", "p27", "AKCIJA",       "Napad"),
    ("photo", "p46", "ROĐENDAN",     "Posle rođendana"),
    ("photo", "p12", "OPREMA",       "Oprema spremna"),
    ("video", "4",   "LIVE AKCIJA",  "Laser tag — akcija"),
    ("photo", "p42", "ARENA",        "Arena UV"),
    ("photo", "p48", "SLAVLJENICI",  "Srećan rođendan"),
    ("photo", "00d-drustvo-momci", "MOMCI", "Momci u areni"),
    ("photo", "p41", "ARENA",        "Arena osvetljenje"),
    ("photo", "p45", "PORODICA",     "Slavljenik sa porodicom"),

    # --- PAGE 3 ---
    ("photo", "p02", "PROSTOR",      "Rođendanska sala"),
    ("photo", "p18", "EKIPA",        "Grupa u galaksiji"),
    ("video", "5",   "LIVE AKCIJA",  "Arena runda"),
    ("photo", "p20", "EKIPA",        "Cela grupa"),
    ("photo", "p28", "AKCIJA",       "Kretanje kroz arenu"),
    ("photo", "p34", "ARENA",        "Arena i mural"),
    ("photo", "p35", "ARENA",        "UV detalj"),
    ("photo", "00b-drustvo-igrac", "IGRAČICA", "Igračica spremna"),
    ("photo", "p37", "TEMA",         "Superheroj zid"),
    ("photo", "p30", "AKCIJA",       "Ekipa u rundi"),
    ("photo", "p43", "ARENA",        "Arena atmosfera"),
    ("video", "6",   "LIVE AKCIJA",  "Laser u pokretu"),
    ("photo", "p49", "PROSTOR",      "Rođendanska prostorija"),
    ("photo", "p53", "PROSTOR",      "Proslava"),
    ("photo", "00c-drustvo-dvoje", "DUO", "Dvoje u areni"),
    ("photo", "p55", "PROSTOR",      "Proslava sa balonima"),
    ("video", "7",   "LIVE AKCIJA",  "Zvuk igre"),
]

ZOOM_SVG = (
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" '
    'stroke="currentColor" stroke-width="2">'
    '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>'
    '<path d="M11 8v6M8 11h6"/></svg>'
)


def photo_block(stem: str, label: str, caption: str) -> str:
    return f"""        <div class="masonry-item" data-animate="fade-up" data-lb-type="image" data-lb-src="/assets/img/gallery/{stem}.jpg" data-lb-caption="{caption}">
          <div class="masonry-media">
            <img src="/assets/img/gallery/{stem}.webp" alt="{caption}" loading="lazy">
            <div class="masonry-overlay"><span class="masonry-label">{label}</span></div>
            <div class="masonry-zoom" aria-hidden="true">
              {ZOOM_SVG}
            </div>
            <div class="masonry-frame"></div>
          </div>
        </div>
"""


def video_block(num: str, label: str, caption: str) -> str:
    has_live = "LIVE" in label.upper()
    label_html = (
        f'<span class="masonry-label"><span class="live-dot"></span> {label}</span>'
        if has_live else
        f'<span class="masonry-label">{label}</span>'
    )
    return f"""        <div class="masonry-item masonry-item-video" data-animate="fade-up" data-lb-type="video" data-lb-src="/assets/video/gallery-action-{num}.mp4" data-lb-caption="{caption}">
          <div class="masonry-media">
            <video muted loop playsinline preload="metadata" poster="/assets/video/gallery-action-{num}-poster.webp">
              <source src="/assets/video/gallery-action-{num}.webm" type="video/webm">
              <source src="/assets/video/gallery-action-{num}.mp4" type="video/mp4">
            </video>
            <div class="masonry-overlay">{label_html}</div>
            <div class="masonry-frame"></div>
          </div>
        </div>
"""


def build_track() -> str:
    out = []
    for kind, ident, label, caption in TILES:
        if kind == "video":
            out.append(video_block(ident, label, caption))
        else:
            out.append(photo_block(ident, label, caption))
    return "\n".join(out)


def main() -> None:
    html = HTML.read_text(encoding="utf-8")
    # Match from the masonry-track opening through its matching closing </div>
    # followed by the </div> closing masonry. The block is fenced by a blank
    # line after the closing </div> of masonry-track.
    start_pattern = re.compile(r'<div class="masonry-track" id="masonry-track">\s*\n')
    # Everything from the start of the track's closing </div> up to (but not
    # including) the next masonry-nav button line.
    end_pattern   = re.compile(r'(      </div>\n        <button class="masonry-nav masonry-next")')

    start_match = start_pattern.search(html)
    if not start_match:
        raise SystemExit("masonry-track opening not found")
    end_match = end_pattern.search(html, start_match.end())
    if not end_match:
        raise SystemExit("masonry-track end marker not found")

    new_tiles = build_track()
    before = html[:start_match.end()]
    after  = html[end_match.start():]  # keeps '      </div>\n        <button…'

    rebuilt = before + new_tiles + after
    HTML.write_text(rebuilt, encoding="utf-8")

    n_photos = sum(1 for k, *_ in TILES if k == "photo")
    n_videos = sum(1 for k, *_ in TILES if k == "video")
    print(f"rewrote masonry — {len(TILES)} tiles  ({n_photos} photos, {n_videos} videos)")


if __name__ == "__main__":
    main()
