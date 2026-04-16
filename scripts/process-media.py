"""
One-shot media pipeline for Predator Laser Tag site.
Reads curated files from Media_RAW/, outputs optimized web assets to assets/.

Deps: Pillow, imageio-ffmpeg (already installed).

Run: python scripts/process-media.py
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageOps
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parent.parent
MEDIA_RAW = ROOT / "Media_RAW" / "predator LaKI"
STUDIO = MEDIA_RAW / "sa maila laki"
RAW = MEDIA_RAW / "predator LaKI"
OUT_IMG = ROOT / "assets" / "img"
OUT_GAL = OUT_IMG / "gallery"
OUT_VID = ROOT / "assets" / "video"

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()


IMAGE_JOBS = [
    # (source, output_name_no_ext, max_width, description)
    (STUDIO / "arena najbolja slika.jpg",       OUT_IMG / "hero-bg",            1920, "Hero background — UV neon arena"),
    (STUDIO / "arena najbolja slika.jpg",       OUT_IMG / "about-arena",        1600, "About section — UV neon arena"),
    (STUDIO / "arena sa krivudavim laserom.jpg", OUT_IMG / "showreel-poster",   1920, "Showreel poster frame fallback"),

    (STUDIO / "arena najbolja slika.jpg",        OUT_GAL / "01-arena-neon",     1600, "Arena UV neon wide"),
    (STUDIO / "arena sa krivudavim laserom.jpg", OUT_GAL / "02-arena-lasers",   1600, "Red laser beams arena"),
    (STUDIO / "vojnik.jpg",                      OUT_GAL / "03-vojnik-neon",    1200, "Neon soldier wall art"),
    (STUDIO / "puske crvena poz..jpg",           OUT_GAL / "04-weapons-red",    1200, "Weapons red-lit"),
    (STUDIO / "puske zelena poz..jpg",           OUT_GAL / "05-weapons-green",  1200, "Weapons green-lit"),
    (STUDIO / "dragana nisani.jpg",              OUT_GAL / "06-player-aim",     1200, "Player aiming"),
    (STUDIO / "arena u duzinu.jpg",              OUT_GAL / "07-arena-long",     1600, "Arena length view"),
    (STUDIO / "arena vide se pregrade.jpg",      OUT_GAL / "08-arena-barriers", 1400, "Arena barriers"),
    (STUDIO / "vojnik 2.jpg",                    OUT_GAL / "09-vojnik-2",       1200, "Neon soldier 2"),
    (RAW / "IMG-20260314-WA0022.jpg",            OUT_GAL / "10-birthday-group", 1400, "Birthday group"),
    (RAW / "IMG-20260402-WA0011.jpg",            OUT_GAL / "11-players-action", 1400, "Players in action"),
    (RAW / "IMG-20260320-WA0003.jpg",            OUT_GAL / "12-team-ready",     1400, "Team ready"),
    (RAW / "IMG-20260402-WA0001.jpg",            OUT_GAL / "13-cosmic-kids",    1400, "Birthday kids cosmic wall"),
    # --- Expansion: +35 tiles for full paginated gallery ---
    (RAW / "IMG-20260314-WA0025.jpg",            OUT_GAL / "14-bday-14-a",      1400, "Birthday group 14-03 a"),
    (RAW / "IMG-20260314-WA0026.jpg",            OUT_GAL / "15-bday-14-b",      1400, "Birthday group 14-03 b"),
    (RAW / "IMG-20260314-WA0027.jpg",            OUT_GAL / "16-bday-14-c",      1400, "Birthday group 14-03 c"),
    (RAW / "IMG-20260314-WA0028.jpg",            OUT_GAL / "17-bday-14-d",      1400, "Birthday group 14-03 d"),
    (RAW / "IMG-20260314-WA0031.jpg",            OUT_GAL / "18-bday-14-e",      1400, "Birthday group 14-03 e"),
    (RAW / "IMG-20260320-WA0001.jpg",            OUT_GAL / "19-bday-20-a",      1400, "Birthday group 20-03 a"),
    (RAW / "IMG-20260320-WA0002.jpg",            OUT_GAL / "20-bday-20-b",      1400, "Birthday group 20-03 b"),
    (RAW / "IMG-20260320-WA0005.jpg",            OUT_GAL / "21-bday-20-c",      1400, "Birthday group 20-03 c"),
    (RAW / "IMG-20260402-WA0000.jpg",            OUT_GAL / "22-cosmic-room-a",  1400, "Cosmic room a"),
    (RAW / "IMG-20260402-WA0002.jpg",            OUT_GAL / "23-cosmic-room-b",  1400, "Cosmic room b"),
    (RAW / "IMG-20260402-WA0003.jpg",            OUT_GAL / "24-cosmic-room-c",  1400, "Cosmic room c"),
    (RAW / "IMG-20260402-WA0010.jpg",            OUT_GAL / "25-cosmic-room-d",  1400, "Cosmic room d"),
    (RAW / "IMG-20260402-WA0012.jpg",            OUT_GAL / "26-cosmic-room-e",  1400, "Cosmic room e"),
    (RAW / "IMG-20260402-WA0013.jpg",            OUT_GAL / "27-cosmic-room-f",  1400, "Cosmic room f"),
    (RAW / "IMG-20260413-WA0000.jpg",            OUT_GAL / "28-team-13-a",      1400, "Team 13-04 a"),
    (RAW / "IMG-20260413-WA0001.jpg",            OUT_GAL / "29-team-13-b",      1400, "Team 13-04 b"),
    (RAW / "IMG-20260413-WA0002.jpg",            OUT_GAL / "30-team-13-c",      1400, "Team 13-04 c"),
    (RAW / "IMG-20260413-WA0003.jpg",            OUT_GAL / "31-team-13-d",      1400, "Team 13-04 d"),
    (RAW / "IMG-20260208-WA0028.jpg",            OUT_GAL / "32-feb-a",          1400, "Februar a"),
    (RAW / "IMG-20260208-WA0029.jpg",            OUT_GAL / "33-feb-b",          1400, "Februar b"),
    (RAW / "IMG-20260214-WA0011.jpg",            OUT_GAL / "34-feb-14-a",       1400, "Februar 14 a"),
    (RAW / "IMG-20260214-WA0012.jpg",            OUT_GAL / "35-feb-14-b",       1400, "Februar 14 b"),
    (RAW / "20260307_190117.jpg",                OUT_GAL / "36-arena-action-a", 1400, "Arena candid a"),
    (RAW / "20260307_191148.jpg",                OUT_GAL / "37-arena-action-b", 1400, "Arena candid b"),
    (RAW / "20260307_194351.jpg",                OUT_GAL / "38-arena-action-c", 1400, "Arena candid c"),
    (RAW / "20260314_154122.jpg",                OUT_GAL / "39-arena-day",      1400, "Arena day shot"),
    (RAW / "20260320_195920.jpg",                OUT_GAL / "40-arena-evening",  1400, "Arena evening"),
    (RAW / "20260320_195930.jpg",                OUT_GAL / "41-arena-evening-b",1400, "Arena evening b"),
    (RAW / "20260328_143626.jpg",                OUT_GAL / "42-arena-group",    1400, "Arena group"),
    (RAW / "20260328_161250.jpg",                OUT_GAL / "43-arena-late",     1400, "Arena late"),
    (RAW / "20260413_162208.jpg",                OUT_GAL / "44-arena-13a",      1400, "Arena 13-04 a"),
    (RAW / "20260413_162220.jpg",                OUT_GAL / "45-arena-13b",      1400, "Arena 13-04 b"),
    (RAW / "20260413_162241.jpg",                OUT_GAL / "46-arena-13c",      1400, "Arena 13-04 c"),
    (RAW / "20260307_192514.jpg",                OUT_GAL / "47-arena-307",      1400, "Arena 307"),
    (RAW / "20260314_163046.jpg",                OUT_GAL / "48-arena-1403",     1400, "Arena 14-03"),
]

# Video jobs: (source, output_basename, start_sec, duration_sec, target_w, target_h, crf, description)
VIDEO_JOBS = [
    # Showreel — dinamičniji action snippet, 720p
    (RAW / "20260214_193243.mp4", OUT_VID / "showreel", 2, 14, 1280, 720, 26, "Main showreel — action"),
    # Gallery loop tiles — shorter, 540p
    (RAW / "VID-20260307-WA0020.mp4", OUT_VID / "gallery-action-1", 0, 6, 960, 540, 28, "Gallery tile 1 — action"),
    (RAW / "VID-20260328-WA0005.mp4", OUT_VID / "gallery-action-2", 0, 6, 960, 540, 28, "Gallery tile 2 — birthday"),
    (RAW / "VID-20260413-WA0009.mp4", OUT_VID / "gallery-action-3", 0, 6, 960, 540, 28, "Gallery tile 3 — team"),
    (RAW / "VID-20260314-WA0033.mp4", OUT_VID / "gallery-action-4", 0, 6, 960, 540, 28, "Gallery tile 4 — action"),
    (RAW / "VID-20260328-WA0006.mp4", OUT_VID / "gallery-action-5", 0, 6, 960, 540, 28, "Gallery tile 5 — birthday"),
    (RAW / "VID-20260402-WA0006.mp4", OUT_VID / "gallery-action-6", 0, 6, 960, 540, 28, "Gallery tile 6 — cosmic"),
    (RAW / "VID-20260413-WA0010.mp4", OUT_VID / "gallery-action-7", 0, 6, 960, 540, 28, "Gallery tile 7 — team 13"),
]


def log(msg: str) -> None:
    print(f"[media] {msg}", flush=True)


def process_image(src: Path, out_base: Path, max_width: int, desc: str) -> None:
    if not src.exists():
        log(f"SKIP image (missing): {src}")
        return
    out_base.parent.mkdir(parents=True, exist_ok=True)
    log(f"img  {src.name} -> {out_base.name}  ({desc})")

    img = Image.open(src)
    img = ImageOps.exif_transpose(img)  # normalize phone EXIF orientation
    img = img.convert("RGB")

    if img.width > max_width:
        ratio = max_width / img.width
        new_h = int(img.height * ratio)
        img = img.resize((max_width, new_h), Image.LANCZOS)

    webp_path = out_base.with_suffix(".webp")
    jpg_path = out_base.with_suffix(".jpg")
    img.save(webp_path, "WEBP", quality=82, method=6)
    img.save(jpg_path, "JPEG", quality=85, optimize=True, progressive=True)
    log(f"     wrote  {webp_path.name} ({webp_path.stat().st_size // 1024} KB)"
        f"  +  {jpg_path.name} ({jpg_path.stat().st_size // 1024} KB)")


def run_ffmpeg(args: list[str]) -> None:
    cmd = [FFMPEG, "-y", "-hide_banner", "-loglevel", "error", *args]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        log(f"ffmpeg failed: {' '.join(cmd)}")
        log(res.stderr)
        sys.exit(res.returncode)


def process_video(src: Path, out_base: Path, start: int, dur: int,
                  w: int, h: int, crf: int, desc: str) -> None:
    if not src.exists():
        log(f"SKIP video (missing): {src}")
        return
    out_base.parent.mkdir(parents=True, exist_ok=True)
    log(f"vid  {src.name} -> {out_base.name}  ({desc})")

    vf = (
        f"scale={w}:{h}:force_original_aspect_ratio=increase,"
        f"crop={w}:{h},"
        f"eq=contrast=1.08:saturation=1.1:gamma=0.95"
    )

    mp4 = out_base.with_suffix(".mp4")
    run_ffmpeg([
        "-ss", str(start), "-t", str(dur), "-i", str(src),
        "-vf", vf,
        "-an",  # no audio
        "-c:v", "libx264", "-preset", "medium", "-crf", str(crf),
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        str(mp4),
    ])
    log(f"     wrote  {mp4.name} ({mp4.stat().st_size // 1024} KB)")

    webm = out_base.with_suffix(".webm")
    run_ffmpeg([
        "-ss", str(start), "-t", str(dur), "-i", str(src),
        "-vf", vf,
        "-an",
        "-c:v", "libvpx-vp9", "-crf", str(crf + 6), "-b:v", "0",
        "-deadline", "good", "-cpu-used", "2",
        str(webm),
    ])
    log(f"     wrote  {webm.name} ({webm.stat().st_size // 1024} KB)")

    poster = out_base.with_name(out_base.name + "-poster").with_suffix(".jpg")
    run_ffmpeg([
        "-ss", str(start + 1), "-i", str(src),
        "-vf", f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h}",
        "-frames:v", "1", "-q:v", "4",
        str(poster),
    ])

    webp_poster = poster.with_suffix(".webp")
    with Image.open(poster) as im:
        im.convert("RGB").save(webp_poster, "WEBP", quality=80, method=6)
    poster.unlink()
    log(f"     wrote  {webp_poster.name} ({webp_poster.stat().st_size // 1024} KB)")


def main() -> None:
    OUT_IMG.mkdir(parents=True, exist_ok=True)
    OUT_GAL.mkdir(parents=True, exist_ok=True)
    OUT_VID.mkdir(parents=True, exist_ok=True)

    log(f"ffmpeg: {FFMPEG}")
    log(f"{len(IMAGE_JOBS)} images, {len(VIDEO_JOBS)} videos queued")

    log("=== IMAGES ===")
    for job in IMAGE_JOBS:
        process_image(*job)

    log("=== VIDEOS ===")
    for job in VIDEO_JOBS:
        process_video(*job)

    log("done.")


if __name__ == "__main__":
    main()
