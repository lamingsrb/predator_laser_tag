"""Generate favicon set from the Predator 'A' shield logo.

Outputs:
  assets/img/favicon.ico      (16, 32, 48 multi-size)
  assets/img/favicon-16.png
  assets/img/favicon-32.png
  assets/img/favicon-48.png
  assets/img/apple-touch-icon.png  (180x180)
  assets/img/icon-192.png
  assets/img/icon-512.png
"""
from __future__ import annotations
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC_LOGO = ROOT / "assets" / "img" / "logo.png"
OUT = ROOT / "assets" / "img"

# Build a clean favicon square from the logo
# 1. crop just the shield (top area, square)
# 2. paste on solid dark background
# 3. resize to needed sizes
src = Image.open(SRC_LOGO).convert("RGBA")
w, h = src.size
# The shield occupies roughly the upper-center portion
# Crop a square around the shield/text area
crop_size = min(w, h)
left = (w - crop_size) // 2
top = 0
right = left + crop_size
bottom = crop_size
shield = src.crop((left, top, right, bottom))

# Base canvas = dark bg (matches site), rounded corners, shield centered
def make_favicon(size: int) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (10, 10, 10, 255))
    # Rounded-corner mask for modern look (Chrome, Safari)
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    radius = max(2, size // 6)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    # Resize shield with padding
    pad = max(1, size // 8)
    inner = size - 2 * pad
    shield_small = shield.resize((inner, inner), Image.LANCZOS)
    canvas.paste(shield_small, (pad, pad), shield_small)
    canvas.putalpha(mask)
    # Slight sharpness boost at small sizes
    if size <= 48:
        canvas = canvas.filter(ImageFilter.SHARPEN)
    return canvas


sizes = {
    "favicon-16.png": 16,
    "favicon-32.png": 32,
    "favicon-48.png": 48,
    "apple-touch-icon.png": 180,
    "icon-192.png": 192,
    "icon-512.png": 512,
}

for name, sz in sizes.items():
    img = make_favicon(sz)
    out = OUT / name
    img.save(out, "PNG", optimize=True)
    print(f"  wrote {name} ({sz}x{sz}, {out.stat().st_size} B)")

# Multi-size .ico (Windows + legacy browsers)
ico_sizes = [16, 32, 48]
ico_imgs = [make_favicon(s) for s in ico_sizes]
ico_path = OUT / "favicon.ico"
ico_imgs[0].save(ico_path, format="ICO", sizes=[(s, s) for s in ico_sizes])
print(f"  wrote favicon.ico ({ico_sizes}, {ico_path.stat().st_size} B)")

# Also overwrite the old favicon.png with a proper 32x32
make_favicon(32).save(OUT / "favicon.png", "PNG", optimize=True)
print(f"  wrote favicon.png (32x32)")

# Minimal web manifest
manifest = ROOT / "public" / "site.webmanifest"
manifest.parent.mkdir(exist_ok=True)
manifest.write_text("""{
  "name": "Predator Laser Tag",
  "short_name": "Predator",
  "icons": [
    { "src": "/assets/img/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/assets/img/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "theme_color": "#ff0040",
  "background_color": "#0a0a0a",
  "display": "standalone"
}
""", encoding="utf-8")
print(f"  wrote public/site.webmanifest")
