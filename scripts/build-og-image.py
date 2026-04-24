"""Generates the Open Graph share image at public/assets/img/og-image.jpg.

1200x630 is the canonical aspect ratio for Facebook/WhatsApp/Viber/Telegram.
Logo centered on a black background with a soft pink glow and a tagline
strip underneath so the brand reads at a thumbnail size.

Re-runnable. No external assets beyond the existing logo.png.
"""
from __future__ import annotations
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
LOGO = ROOT / "public" / "assets" / "img" / "logo.png"
OUT  = ROOT / "public" / "assets" / "img" / "og-image.jpg"

W, H = 1200, 630
BG = (8, 8, 12)
PINK = (255, 0, 136)
WHITE = (240, 240, 240)

FONT_BOLD = r"C:\Windows\Fonts\arialbd.ttf"
FONT_REG  = r"C:\Windows\Fonts\arial.ttf"


def build() -> None:
    img = Image.new("RGB", (W, H), BG)

    # Subtle radial pink glow behind where the logo will sit.
    glow = Image.new("RGB", (W, H), BG)
    gd = ImageDraw.Draw(glow)
    cx, cy = W // 2, H // 2 - 40
    for r in range(520, 60, -20):
        alpha = max(0, 18 - (520 - r) // 24)
        # Simulate alpha-blend on black by scaling the pink value.
        shade = tuple(int(BG[i] + (PINK[i] - BG[i]) * alpha / 255) for i in range(3))
        gd.ellipse((cx - r, cy - r, cx + r, cy + r), fill=shade)
    glow = glow.filter(ImageFilter.GaussianBlur(radius=60))
    img = Image.blend(img, glow, 0.85)

    # Thin pink rule along the bottom edge so the brand stripe reads at
    # thumbnail sizes (~320px wide on a phone Viber preview).
    d = ImageDraw.Draw(img)
    d.rectangle((0, H - 6, W, H), fill=PINK)

    # Logo — scale to ~480 px wide so it dominates without touching edges.
    logo = Image.open(LOGO).convert("RGBA")
    target_w = 560
    scale = target_w / logo.width
    target_h = int(logo.height * scale)
    logo = logo.resize((target_w, target_h), Image.LANCZOS)
    lx = (W - target_w) // 2
    ly = (H - target_h) // 2 - 50
    img.paste(logo, (lx, ly), logo)

    # Tagline strip.
    tag_font = ImageFont.truetype(FONT_BOLD, 34)
    sub_font = ImageFont.truetype(FONT_REG, 22)

    tagline = "LASER TAG ARENA • BEOGRAD"
    tw = d.textlength(tagline, font=tag_font)
    d.text(((W - tw) // 2, ly + target_h + 20), tagline, font=tag_font, fill=WHITE)

    subtitle = "Rođendani • Team Building • Iznajmljivanje prostora"
    sw = d.textlength(subtitle, font=sub_font)
    d.text(((W - sw) // 2, ly + target_h + 66), subtitle, font=sub_font,
           fill=(180, 180, 190))

    img.save(OUT, "JPEG", quality=88, optimize=True)
    kb = OUT.stat().st_size // 1024
    print(f"wrote {OUT.name}  {W}x{H}  {kb} KB")


if __name__ == "__main__":
    build()
