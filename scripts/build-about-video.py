"""Encodes the professional venue walkthrough as the About section loop.

Source: copy_760D4C2A (28 s) — starts on the PREDATOR UV wall and pans
through the arena, the natural 'ulazak u lokal' walkthrough.

Output: public/assets/video/about-arena.{mp4,webm,poster.webp}
  - Portrait 720x1280 (keeps the 2160x3840 aspect, half the hero size
    because About section is smaller)
  - Muted, autoplay-friendly, no audio track
  - H.264 CRF 27, VP9 CRF 34 — about 3–5 MB per codec for smooth load
"""
from __future__ import annotations
import subprocess
from pathlib import Path
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parent.parent
SRC  = ROOT / "Media_RAW" / "2026-04-21_knjigovodja_update" / "copy_760D4C2A-D14B-4F95-BC3F-E7ED38B6C91D.mov"
OUT  = ROOT / "public" / "assets" / "video"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

VF = (
    "scale=720:1280:force_original_aspect_ratio=increase,"
    "crop=720:1280,fps=30,format=yuv420p,setsar=1,"
    "eq=brightness=0.02:contrast=1.05:saturation=1.1"
)


def run(cmd, desc):
    print(f"[ffmpeg] {desc}")
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr[-800:]); raise SystemExit(r.returncode)


mp4 = OUT / "about-arena.mp4"
webm = OUT / "about-arena.webm"
poster = OUT / "about-arena-poster.webp"

run([
    FFMPEG, "-y", "-hide_banner", "-loglevel", "error",
    "-i", str(SRC),
    "-t", "28",
    "-vf", VF,
    "-an",
    "-c:v", "libx264", "-preset", "medium", "-crf", "27",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    str(mp4),
], f"about-arena.mp4")
print(f"  -> {mp4.stat().st_size // 1024} KB")

run([
    FFMPEG, "-y", "-hide_banner", "-loglevel", "error",
    "-i", str(SRC),
    "-t", "28",
    "-vf", VF,
    "-an",
    "-c:v", "libvpx-vp9", "-crf", "34", "-b:v", "0",
    "-deadline", "good", "-cpu-used", "2", "-row-mt", "1",
    str(webm),
], "about-arena.webm")
print(f"  -> {webm.stat().st_size // 1024} KB")

run([
    FFMPEG, "-y", "-hide_banner", "-loglevel", "error",
    "-ss", "0.5", "-i", str(mp4),
    "-frames:v", "1", "-q:v", "4", str(poster),
], "about-arena-poster.webp")
print(f"  -> {poster.stat().st_size // 1024} KB")

print("\nDone.")
