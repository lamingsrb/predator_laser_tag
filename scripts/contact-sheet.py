"""Generise contact sheet od 58 novih profesionalnih fotografija — jedna slika
koja pokazuje sve thumbnail-e sa brojevima, da zajedno odlucimo sta ide gde."""
from __future__ import annotations

import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SRC  = ROOT / "Media_RAW" / "2026-04-21_knjigovodja_update" / "foto"
OUT  = ROOT / "scripts" / "contact-sheet-2026-04-21.jpg"

TILE_W, TILE_H = 340, 260   # landscape target; portraits scale to fit
COLS = 6
PAD  = 8
LABEL_H = 26

files = sorted([p for p in SRC.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}])
print(f"{len(files)} photos")

rows = (len(files) + COLS - 1) // COLS
sheet_w = COLS * TILE_W + (COLS + 1) * PAD
sheet_h = rows * (TILE_H + LABEL_H) + (rows + 1) * PAD

sheet = Image.new("RGB", (sheet_w, sheet_h), (18, 18, 22))
draw = ImageDraw.Draw(sheet)

# Try a clean font, fall back to PIL default
try:
    font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 20)
except Exception:
    font = ImageFont.load_default()

for i, p in enumerate(files):
    r, c = divmod(i, COLS)
    x = PAD + c * (TILE_W + PAD)
    y = PAD + r * (TILE_H + LABEL_H + PAD)

    img = Image.open(p)
    img.thumbnail((TILE_W, TILE_H), Image.LANCZOS)
    tx = x + (TILE_W - img.width) // 2
    ty = y + (TILE_H - img.height) // 2
    sheet.paste(img, (tx, ty))

    # label: number + filename tail
    num  = p.stem.replace("image", "").lstrip("0") or "0"
    label = f"#{num.zfill(2)}"
    draw.rectangle([x, y + TILE_H, x + TILE_W, y + TILE_H + LABEL_H], fill=(32, 32, 40))
    draw.text((x + 8, y + TILE_H + 3), label, fill=(230, 80, 160), font=font)

sheet.save(OUT, "JPEG", quality=85)
print(f"contact sheet -> {OUT}  ({OUT.stat().st_size / 1024 / 1024:.1f} MB, {sheet_w}x{sheet_h})")
