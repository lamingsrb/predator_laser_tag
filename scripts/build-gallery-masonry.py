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
# Full library: 6 drustvo + 58 new pro + 43 old (48 minus 5 dropped as blurry
# per Laplacian-variance scan) + 9 videos = 116 tiles. Videos every ~12
# photos so the feed breathes. Old stock kept for nostalgia and variety; new
# pro pushed to the front.

_DROPPED_BLURRY = {"06-player-aim", "08-arena-barriers", "22-cosmic-room-a",
                   "25-cosmic-room-d", "31-team-13-d"}

# Category buckets for the 4-filter gallery UI per owner (2026-04-22):
#   arena      — ARENA I OPREMA (arena interiors, UV shots, weapons racks, equipment)
#   rodjendani — ROĐENDANI      (new pro kids photos: parties, cake, slavljenici)
#   teambuild  — TEAM BUILDING  (older phone-era photos, all the pre-refresh set)
#   prostor    — PROSTOR        (empty rooms, decorations without people)
CATEGORY = {
    # ----- New pro photos (p01-p58) -----
    # PROSTOR — empty rooms / decor
    "p01": "prostor", "p02": "prostor", "p05": "prostor", "p06": "prostor",
    "p37": "prostor", "p38": "prostor", "p49": "prostor", "p50": "prostor",
    "p51": "prostor", "p52": "prostor", "p53": "prostor", "p54": "prostor",
    "p55": "prostor", "p56": "prostor", "p57": "prostor", "p58": "prostor",
    # ARENA I OPREMA — arena interiors, weapons, UV walls (NO people-with-kids)
    "p07": "arena", "p08": "arena", "p09": "arena", "p10": "arena",
    "p11": "arena", "p12": "arena", "p13": "arena", "p14": "arena",
    "p15": "arena", "p16": "arena", "p35": "arena",
    "p36": "arena", "p43": "arena", "p44": "arena",
    # ROĐENDANI — everything with kids / parties / slavljenici
    "p03": "rodjendani", "p04": "rodjendani", "p17": "rodjendani",
    "p18": "rodjendani", "p19": "rodjendani", "p20": "rodjendani",
    "p21": "rodjendani", "p22": "rodjendani", "p23": "rodjendani",
    "p24": "rodjendani", "p25": "rodjendani", "p26": "rodjendani",
    "p27": "rodjendani", "p28": "rodjendani", "p29": "rodjendani",
    "p30": "rodjendani", "p31": "rodjendani", "p32": "rodjendani",
    "p33": "rodjendani", "p34": "rodjendani",  # kids eating at party, moved from arena
    "p39": "rodjendani", "p40": "rodjendani",
    "p41": "rodjendani", "p42": "rodjendani", "p45": "rodjendani",
    "p46": "rodjendani", "p47": "rodjendani", "p48": "rodjendani",

    # ----- Old 'drustvo' (00a-00f) -----
    # Reviewed each photo. All six are adult-oriented groups/couples.
    "00a-drustvo-bday":   "teambuild",   # adult family celebration (minor kid in frame)
    "00b-drustvo-igrac":  "teambuild",   # adult woman with laser gun
    "00c-drustvo-dvoje":  "teambuild",   # two adult women with gear
    "00d-drustvo-momci":  "teambuild",   # 4 adult men with equipment
    "00e-drustvo-mozaik": "teambuild",   # collage of adults
    "00f-drustvo-arena":  "teambuild",   # 5 adult men with equipment

    # ----- Old 01-48 — arena shots stay ARENA, everything else with kids → ROĐENDANI -----
    "01-arena-neon":       "arena",
    "02-arena-lasers":     "arena",
    "03-vojnik-neon":      "arena",
    "04-weapons-red":      "arena",
    "05-weapons-green":    "arena",
    "07-arena-long":       "arena",
    "09-vojnik-2":         "arena",
    "36-arena-action-a":   "arena",
    "37-arena-action-b":   "arena",
    "38-arena-action-c":   "arena",
    "39-arena-day":        "arena",
    "40-arena-evening":    "arena",
    "41-arena-evening-b":  "arena",
    "42-arena-group":      "arena",
    "43-arena-late":       "arena",
    "44-arena-13a":        "arena",
    "45-arena-13b":        "arena",
    "46-arena-13c":        "arena",
    "47-arena-307":        "arena",
    "48-arena-1403":       "arena",
    # Old kids photos (verified) — these WERE teambuild, now ROĐENDANI because
    # they're kid-group shots. Owner: 'nema dece u team building'.
    "10-birthday-group":   "rodjendani",
    "11-players-action":   "rodjendani",
    "12-team-ready":       "rodjendani",
    "13-cosmic-kids":      "rodjendani",
    "14-bday-14-a":        "rodjendani",
    "15-bday-14-b":        "rodjendani",
    "16-bday-14-c":        "rodjendani",
    "17-bday-14-d":        "rodjendani",
    "18-bday-14-e":        "rodjendani",
    "19-bday-20-a":        "rodjendani",
    "20-bday-20-b":        "rodjendani",
    "21-bday-20-c":        "rodjendani",
    "23-cosmic-room-b":    "rodjendani",
    "24-cosmic-room-c":    "rodjendani",
    "26-cosmic-room-e":    "rodjendani",
    "27-cosmic-room-f":    "rodjendani",
    "28-team-13-a":        "rodjendani",
    "29-team-13-b":        "rodjendani",
    "30-team-13-c":        "rodjendani",
    "32-feb-a":            "rodjendani",
    "33-feb-b":            "rodjendani",
    "34-feb-14-a":         "rodjendani",
    "35-feb-14-b":         "rodjendani",
}

# Videos — gallery-action-N → category
VIDEO_CATEGORY = {
    "1": "arena", "2": "arena", "3": "arena", "4": "arena",
    "5": "arena", "6": "arena", "7": "arena",
    "8": "arena",        # pro UV arena walkthrough
    "9": "rodjendani",   # pro 77 s includes birthday scenes
}

# Page 1 (16): strongest mixed open — 2 new pro videos, new hero pics,
# marquee old arena shots, a drustvo warm-up.
_PAGE1 = [
    ("video", "8",   "NOVO",        "Profesionalni snimak — UV arena"),
    ("photo", "p14", "ARENA",       "UV arena u akciji"),
    ("video", "9",   "NOVO",        "Profesionalni snimak — rođendan"),
    ("photo", "00a-drustvo-bday",   "DRUŠTVO",   "Društvo u areni"),
    ("photo", "p29", "EKIPA",       "Ekipa pred galaksiju"),
    ("video", "1",   "LIVE AKCIJA", "Laser tag u akciji"),
    ("photo", "03-vojnik-neon",     "ARENA",     "Vojnik pod UV svetlom"),
    ("photo", "p13", "OPREMA",      "Puške spremne"),
    ("photo", "p22", "SLAVLJENICI", "Cela ekipa slavljenika"),
    ("photo", "01-arena-neon",      "ARENA",     "Arena pod UV svetlom"),
    ("photo", "p36", "ARENA",       "Arena i sletno iskustvo"),
    ("photo", "00e-drustvo-mozaik", "UTISCI",    "Najbolji trenuci"),
    ("photo", "p31", "ROĐENDAN",    "Rođendanska pauza"),
    ("photo", "05-weapons-green",   "OPREMA",    "Oprema pod UV"),
    ("photo", "02-arena-lasers",    "ARENA",     "Arena puna lasera"),
    ("video", "2",   "LIVE AKCIJA", "Gađanje u areni"),
]

# New pro photos that haven't appeared on page 1 — ordered by visual impact
_PRO_REMAINING_ORDER = [
    "p07", "p03", "p24", "p23", "p04", "p17", "p08", "p19", "p25",
    "p32", "p39", "p27", "p46", "p12", "p42", "p48", "p41", "p45",
    "p02", "p18", "p20", "p28", "p34", "p35", "p37", "p30", "p43",
    "p49", "p53", "p55", "p01", "p05", "p06", "p09", "p10", "p11",
    "p15", "p16", "p21", "p26", "p33", "p38", "p40", "p44", "p47",
    "p50", "p51", "p52", "p54", "p56", "p57", "p58",
]

# Old arena/action photos — sharpest first (per blur-detect.py scan)
_OLD_SHARP_ORDER = [
    "10-birthday-group", "34-feb-14-a", "14-bday-14-a", "20-bday-20-b",
    "12-team-ready", "21-bday-20-c", "17-bday-14-d", "16-bday-14-c",
    "28-team-13-a", "15-bday-14-b", "35-feb-14-b", "48-arena-1403",
    "45-arena-13b", "30-team-13-c", "29-team-13-b", "37-arena-action-b",
    "44-arena-13a", "46-arena-13c", "39-arena-day", "40-arena-evening",
    "41-arena-evening-b", "43-arena-late", "09-vojnik-2", "27-cosmic-room-f",
    "26-cosmic-room-e", "47-arena-307", "36-arena-action-a", "32-feb-a",
    "33-feb-b", "42-arena-group", "18-bday-14-e", "19-bday-20-a",
    "13-cosmic-kids", "24-cosmic-room-c", "38-arena-action-c",
    "23-cosmic-room-b", "07-arena-long", "11-players-action",
    "04-weapons-red",
]

_REMAINING_DRUSTVO = ["00d-drustvo-momci", "00f-drustvo-arena",
                      "00b-drustvo-igrac", "00c-drustvo-dvoje"]
_REMAINING_VIDEOS  = ["3", "4", "5", "6", "7"]


def _label_for(stem: str) -> tuple[str, str]:
    """Heuristic (label, caption) for old stock whose filename hints at topic."""
    s = stem.lower()
    if "drustvo" in s:  return ("DRUŠTVO", "Društvo u areni")
    if "bday" in s:     return ("ROĐENDAN", "Rođendanska proslava")
    if "team" in s:     return ("EKIPA", "Ekipa spremna")
    if "cosmic" in s:   return ("SLAVLJENICI", "U kosmičkoj sali")
    if "arena" in s:    return ("ARENA", "Arena u akciji")
    if "vojnik" in s:   return ("AVATAR", "Vojnik pod UV")
    if "weapons" in s:  return ("OPREMA", "Oprema za akciju")
    if "players" in s:  return ("AKCIJA", "Igrači u pokretu")
    if "feb" in s:      return ("EKIPA", "Ekipa spremna")
    if "birthday" in s: return ("ROĐENDAN", "Rođendanska grupa")
    return ("ARENA", "U areni")


def _remaining_tiles() -> list[tuple[str, str, str, str]]:
    """Interleave new + old + drustvo + videos so later pages stay varied."""
    out: list[tuple[str, str, str, str]] = []
    new_i = old_i = drust_i = vid_i = 0
    position = 0
    while (new_i < len(_PRO_REMAINING_ORDER) or old_i < len(_OLD_SHARP_ORDER)
           or drust_i < len(_REMAINING_DRUSTVO) or vid_i < len(_REMAINING_VIDEOS)):
        # 1 video every ~10 photos
        if position > 0 and position % 10 == 0 and vid_i < len(_REMAINING_VIDEOS):
            out.append(("video", _REMAINING_VIDEOS[vid_i], "LIVE AKCIJA", "Laser tag — akcija"))
            vid_i += 1; position += 1; continue
        # 1 drustvo every ~14 photos
        if position > 0 and position % 14 == 0 and drust_i < len(_REMAINING_DRUSTVO):
            stem = _REMAINING_DRUSTVO[drust_i]
            label, cap = _label_for(stem)
            out.append(("photo", stem, label, cap))
            drust_i += 1; position += 1; continue
        # Alternate new (higher priority) and old so both get coverage
        pick_new = new_i < len(_PRO_REMAINING_ORDER) and (position % 3 != 2 or old_i >= len(_OLD_SHARP_ORDER))
        if pick_new:
            stem = _PRO_REMAINING_ORDER[new_i]
            out.append(("photo", stem, "ARENA", "Predator Laser Tag"))
            new_i += 1
        elif old_i < len(_OLD_SHARP_ORDER):
            stem = _OLD_SHARP_ORDER[old_i]
            label, cap = _label_for(stem)
            out.append(("photo", stem, label, cap))
            old_i += 1
        elif drust_i < len(_REMAINING_DRUSTVO):
            stem = _REMAINING_DRUSTVO[drust_i]
            label, cap = _label_for(stem)
            out.append(("photo", stem, label, cap))
            drust_i += 1
        elif vid_i < len(_REMAINING_VIDEOS):
            out.append(("video", _REMAINING_VIDEOS[vid_i], "LIVE AKCIJA", "Laser tag — akcija"))
            vid_i += 1
        position += 1
    return out


TILES = _PAGE1 + _remaining_tiles()

ZOOM_SVG = (
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" '
    'stroke="currentColor" stroke-width="2">'
    '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>'
    '<path d="M11 8v6M8 11h6"/></svg>'
)


def photo_block(stem: str, label: str, caption: str) -> str:
    category = CATEGORY.get(stem, "arena")
    return f"""        <div class="masonry-item" data-animate="fade-up" data-category="{category}" data-lb-type="image" data-lb-src="/assets/img/gallery/{stem}.jpg" data-lb-caption="{caption}">
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
    category = VIDEO_CATEGORY.get(num, "arena")
    return f"""        <div class="masonry-item masonry-item-video" data-animate="fade-up" data-category="{category}" data-lb-type="video" data-lb-src="/assets/video/gallery-action-{num}.mp4" data-lb-caption="{caption}">
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
