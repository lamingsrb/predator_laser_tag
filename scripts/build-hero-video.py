"""Spaja 4 video segmenta (svetli/tamni naizmenično) sa xfade prelazima u moderan hero video.

Pristup:
- Segment 1 (BRIGHT): WA0006 cosmic room (kids bright) — start 0s, 3.5s
- Segment 2 (DARK):   WA0033 arena action           — start 0s, 3.5s (radial xfade)
- Segment 3 (BRIGHT): WA0005 birthday kids          — start 0s, 3.5s (pixelize xfade)
- Segment 4 (DARK):   main showreel action (193243) — start 0s, 3.5s (smoothleft xfade)

Ukupno ~14s sa overlap-om, izlaz 1280x720 H.264 + VP9 WebM + poster.
"""
from __future__ import annotations
import subprocess
from pathlib import Path
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "Media_RAW" / "predator LaKI" / "predator LaKI"
OUT = ROOT / "public" / "assets" / "video"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

# (source, start_offset, trim_duration) — svi landscape 1080p
SEGMENTS = [
    (RAW / "20260328_143655.mp4",  1, 5),   # bright kids outside arena
    (RAW / "20260214_193243.mp4",  3, 5),   # dark arena action/laser
    (RAW / "20260413_165828.mp4",  2, 5),   # team / bright
    (RAW / "20260320_200546.mp4",  4, 5),   # dark arena
]

TRANSITIONS = ["radial", "pixelize", "smoothleft"]
XFADE_DUR = 0.6


def run(cmd, desc=""):
    print(f"[ffmpeg] {desc}")
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(res.stderr[-600:])
        raise SystemExit(res.returncode)


# Build filter_complex for xfade chain
# Each segment gets scaled + cropped to 1280x720
segment_filters = []
for i, (_src, _start, _dur) in enumerate(SEGMENTS):
    # Dark arena segments (odd indices 1, 3) need extra brightness boost
    is_dark = i in (1, 3)
    brightness = 0.12 if is_dark else 0.05
    gamma = 0.82 if is_dark else 0.9
    contrast = 1.15 if is_dark else 1.08
    segment_filters.append(
        f"[{i}:v]trim=duration={_dur},setpts=PTS-STARTPTS,"
        f"scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,"
        f"fps=30,format=yuv420p,setsar=1,"
        f"eq=brightness={brightness}:contrast={contrast}:saturation=1.2:gamma={gamma}[v{i}]"
    )

# Chain xfades — cumulative offset calculation
# After each xfade, effective duration = sum of segment durations - total overlap so far
xfade_chain = []
prev_label = "v0"
for i, transition in enumerate(TRANSITIONS):
    next_label = f"v{i+1}"
    out_label = f"xf{i+1}" if i < len(TRANSITIONS) - 1 else "vout"
    # offset = cumulative duration so far - xfade duration (overlap happens here)
    offset = sum(SEGMENTS[k][2] for k in range(i + 1)) - (i + 1) * XFADE_DUR
    xfade_chain.append(
        f"[{prev_label}][{next_label}]xfade=transition={transition}:"
        f"duration={XFADE_DUR}:offset={offset:.2f}[{out_label}]"
    )
    prev_label = out_label

filter_complex = ";".join(segment_filters + xfade_chain)

# Input arguments
inputs = []
for src, start, _dur in SEGMENTS:
    inputs.extend(["-ss", str(start), "-i", str(src)])

# MP4 output
mp4_out = OUT / "showreel.mp4"
cmd_mp4 = [
    FFMPEG, "-y", "-hide_banner", "-loglevel", "error",
    *inputs,
    "-filter_complex", filter_complex,
    "-map", "[vout]",
    "-an",
    "-c:v", "libx264", "-preset", "medium", "-crf", "24",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    str(mp4_out),
]
run(cmd_mp4, f"Building MP4 -> {mp4_out.name}")
print(f"  -> {mp4_out.stat().st_size // 1024} KB")

# WebM output (VP9)
webm_out = OUT / "showreel.webm"
cmd_webm = [
    FFMPEG, "-y", "-hide_banner", "-loglevel", "error",
    *inputs,
    "-filter_complex", filter_complex,
    "-map", "[vout]",
    "-an",
    "-c:v", "libvpx-vp9", "-crf", "32", "-b:v", "0",
    "-deadline", "good", "-cpu-used", "2",
    str(webm_out),
]
run(cmd_webm, f"Building WebM -> {webm_out.name}")
print(f"  -> {webm_out.stat().st_size // 1024} KB")

# Poster frame at t=1.5 (middle of first bright segment)
poster = OUT / "showreel-poster.webp"
cmd_poster = [
    FFMPEG, "-y", "-hide_banner", "-loglevel", "error",
    "-ss", "1.5", "-i", str(mp4_out),
    "-frames:v", "1", "-q:v", "4",
    str(poster),
]
run(cmd_poster, f"Extracting poster -> {poster.name}")
print(f"  -> {poster.stat().st_size // 1024} KB")

print("\nDone.")
