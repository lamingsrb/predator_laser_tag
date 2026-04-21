"""Ranks gallery images by Laplacian-variance sharpness score.

Low score = blurry; high score = sharp. Used to decide which of the old
01–48 arena/action photos are safe to bring back into the masonry.

Prints a table sorted ascending — blurriest on top. Manual review threshold
around 60–80 (images below that are noticeably soft).
"""
from __future__ import annotations
from pathlib import Path
import numpy as np
from PIL import Image

# Minimal Laplacian via numpy (no OpenCV dependency)
LAPLACIAN = np.array([
    [ 0, 1, 0],
    [ 1,-4, 1],
    [ 0, 1, 0],
], dtype=np.float32)


def laplacian_variance(img_path: Path) -> float:
    img = Image.open(img_path).convert("L")
    # Downscale large images so the score is comparable across resolutions
    if max(img.size) > 1000:
        r = 1000 / max(img.size)
        img = img.resize((int(img.width * r), int(img.height * r)), Image.LANCZOS)
    a = np.asarray(img, dtype=np.float32)
    # 2D convolution via FFT-free manual (small kernel, OK loop)
    lap = np.zeros_like(a)
    lap[1:-1, 1:-1] = (
        a[1:-1, 0:-2] + a[1:-1, 2:] +
        a[0:-2, 1:-1] + a[2:,   1:-1] -
        4 * a[1:-1, 1:-1]
    )
    return float(lap.var())


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    gallery = root / "public" / "assets" / "img" / "gallery"
    # Only the OLD 01-48 series — drustvo and new p* are known good
    candidates = sorted(
        p for p in gallery.glob("*.webp")
        if not p.stem.startswith(("00", "p"))
    )
    print(f"scoring {len(candidates)} old gallery photos\n")
    scored = [(p.stem, laplacian_variance(p)) for p in candidates]
    scored.sort(key=lambda x: x[1])
    print(f"{'stem':<22} {'score':>10}  verdict")
    print("-" * 50)
    for stem, s in scored:
        verdict = "BLURRY" if s < 70 else ("soft" if s < 130 else "sharp")
        print(f"{stem:<22} {s:>10.1f}  {verdict}")


if __name__ == "__main__":
    main()
