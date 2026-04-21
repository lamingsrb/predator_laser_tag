"""Encodes the two full professional videos as gallery-action-8 and
gallery-action-9 (mp4 + webm + webp poster), landscape 1280x720 crop.
These become the new lead tiles on page 1 of the masonry gallery.
"""
from __future__ import annotations
import subprocess
from pathlib import Path
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parent.parent
SRC  = ROOT / "Media_RAW" / "2026-04-21_knjigovodja_update"
OUT  = ROOT / "public" / "assets" / "video"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

# (index, source, duration, poster_time)
JOBS = [
    (8, SRC / "copy_760D4C2A-D14B-4F95-BC3F-E7ED38B6C91D.mov", 28.0,  1.0),
    (9, SRC / "copy_BCE9EB6A-03D2-4D55-B9B3-950964E8F2C6.mov", 77.0, 32.0),  # UV arena moment
]


def run(cmd, desc=""):
    print(f"[ffmpeg] {desc}")
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr[-700:]); raise SystemExit(r.returncode)


VF = (
    "scale=1280:720:force_original_aspect_ratio=increase,"
    "crop=1280:720,fps=30,format=yuv420p,setsar=1,"
    "eq=brightness=0.02:contrast=1.05:saturation=1.1"
)

for idx, src, dur, poster_t in JOBS:
    mp4 = OUT / f"gallery-action-{idx}.mp4"
    webm = OUT / f"gallery-action-{idx}.webm"
    poster = OUT / f"gallery-action-{idx}-poster.webp"

    # MP4
    run([
        FFMPEG, "-y", "-hide_banner", "-loglevel", "error",
        "-i", str(src),
        "-t", str(dur),
        "-vf", VF,
        "-an",
        "-c:v", "libx264", "-preset", "medium", "-crf", "26",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        str(mp4),
    ], f"gallery-action-{idx}.mp4 ({dur} s)")
    print(f"  -> {mp4.stat().st_size // 1024} KB")

    # WebM VP9
    run([
        FFMPEG, "-y", "-hide_banner", "-loglevel", "error",
        "-i", str(src),
        "-t", str(dur),
        "-vf", VF,
        "-an",
        "-c:v", "libvpx-vp9", "-crf", "34", "-b:v", "0",
        "-deadline", "good", "-cpu-used", "2", "-row-mt", "1",
        str(webm),
    ], f"gallery-action-{idx}.webm")
    print(f"  -> {webm.stat().st_size // 1024} KB")

    # Poster
    run([
        FFMPEG, "-y", "-hide_banner", "-loglevel", "error",
        "-ss", str(poster_t), "-i", str(mp4),
        "-frames:v", "1", "-q:v", "4", str(poster),
    ], f"poster-{idx}.webp at t={poster_t}")
    print(f"  -> {poster.stat().st_size // 1024} KB")

print("\nDone.")
