"""Processes 58 new professional photos for the Predator Laser Tag gallery.

For each photo:
  - Reads EXIF orientation + auto-rotates (iPhone/DSLR shots come in as
    portrait but stored as landscape with orientation tag).
  - Generates a WebP at ~1200 px long side, q=82, for inline gallery display.
  - Generates a JPG at ~1800 px long side, q=85, for the lightbox click-zoom.
  - Writes to public/assets/img/gallery/p01..p58.{webp,jpg}.

Also picks image #14 (UV arena long-exposure) as the new About section hero
and saves it as public/assets/img/about-arena.{webp,jpg} at 1800 px.
"""
from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC  = ROOT / "Media_RAW" / "2026-04-21_knjigovodja_update" / "foto"
OUT  = ROOT / "public" / "assets" / "img" / "gallery"
ABOUT = ROOT / "public" / "assets" / "img"

OUT.mkdir(parents=True, exist_ok=True)

GALLERY_LONG_SIDE = 1200
LIGHTBOX_LONG_SIDE = 1800
ABOUT_LONG_SIDE    = 1800

WEBP_QUALITY = 82
JPG_QUALITY  = 85


def scale_long_side(img: Image.Image, target: int) -> Image.Image:
    w, h = img.size
    long_side = max(w, h)
    if long_side <= target:
        return img
    ratio = target / long_side
    return img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)


def export(img: Image.Image, stem: str, long_side: int):
    resized = scale_long_side(img, long_side)
    resized.save(OUT / f"{stem}.webp", "WEBP", quality=WEBP_QUALITY, method=6)
    resized.convert("RGB").save(OUT / f"{stem}.jpg", "JPEG", quality=JPG_QUALITY, optimize=True)
    return resized


def main() -> None:
    src_files = sorted([p for p in SRC.iterdir() if p.suffix.lower() in {".jpg", ".jpeg"}])
    print(f"processing {len(src_files)} source photos")

    for p in src_files:
        stem = "p" + p.stem.replace("image", "").lstrip("0").zfill(2)
        img = Image.open(p)
        img = ImageOps.exif_transpose(img)  # auto-rotate per EXIF orientation
        img = img.convert("RGB")
        out_img = export(img, stem, GALLERY_LONG_SIDE)
        # Lightbox version (jpg only) — bigger, but only for click-to-zoom
        big = scale_long_side(img, LIGHTBOX_LONG_SIDE)
        big.save(OUT / f"{stem}.jpg", "JPEG", quality=JPG_QUALITY, optimize=True)
        print(f"  {p.name:>22} -> {stem}.{{webp,jpg}}  {out_img.width}x{out_img.height}")

    # About hero: image #14 is the stunning UV arena long-exposure shot
    src14 = SRC / "image00014.jpeg"
    img = Image.open(src14)
    img = ImageOps.exif_transpose(img).convert("RGB")
    about = scale_long_side(img, ABOUT_LONG_SIDE)
    about.save(ABOUT / "about-arena.webp", "WEBP", quality=86, method=6)
    about.save(ABOUT / "about-arena.jpg",  "JPEG", quality=87, optimize=True)
    print(f"\nAbout hero (image00014 -> about-arena.{{webp,jpg}}): {about.width}x{about.height}")


if __name__ == "__main__":
    main()
