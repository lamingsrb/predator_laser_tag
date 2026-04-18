"""Spaja vlasnicin 1.mp3 (Game Over intro) sa drugim delom poruke u dve
produkcijske verzije — zensku (default) i musku (backup).

Za svaki par:
  - Normalizuje sample rate i kanale na 44.1 kHz mono
  - Ubacuje 350 ms 'breath' izmedu intro + nastavka
  - Aplicira loudnorm za ujednacenu glasnocu kroz zvucnike u areni
  - Izlazi stereo 44.1 kHz 160 kbps mp3

Outputs:
  public/assets/audio/game-over-female.mp3  (1.mp3 + Zenski glas 2.mp3)
  public/assets/audio/game-over-male.mp3    (1.mp3 + Muski glas 2.mp3)
  public/assets/audio/game-over.mp3         (kopija aktivnog — trenutno zenski)

Za prebacivanje na muski glas: kopiraj game-over-male.mp3 preko game-over.mp3
(ili promeni ACTIVE u ovoj skripti pa pokreni ponovo).
"""
from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

import imageio_ffmpeg

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "Media_RAW" / "Audio za dugme"
OUT_DIR = ROOT / "public" / "assets" / "audio"
PAUSE_SEC = 0.35
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

# Ime kombinovane verzije koju sajt trenutno koristi za logo long-press.
ACTIVE = "female"

# Every voice has its own intro + body. Owner can send fresh takes anytime;
# the pipeline just needs the updated file names here.
JOBS = {
    "female": (SRC / "Novi zenski 1. deo zvuka.mp3", SRC / "Zenski glas 2.mp3"),
    "male":   (SRC / "1.mp3",                        SRC / "Muski glas 2.mp3"),
}


def run(cmd: list[str]) -> None:
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        lines = r.stderr.strip().splitlines()[-40:]
        print("\n".join(lines))
        raise SystemExit(r.returncode)


def build(intro: Path, body: Path, out: Path) -> None:
    assert intro.exists() and body.exists(), f"Missing: {intro} / {body}"
    out.parent.mkdir(parents=True, exist_ok=True)

    filter_complex = (
        "[0:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=mono[a1];"
        "[1:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=mono[a2];"
        f"anullsrc=r=44100:cl=mono:d={PAUSE_SEC}[gap];"
        "[a1][gap][a2]concat=n=3:v=0:a=1[joined];"
        "[joined]loudnorm=I=-14:LRA=7:TP=-1.5[norm];"
        "[norm]aformat=sample_rates=44100:channel_layouts=stereo[out]"
    )

    run([
        FFMPEG, "-y", "-hide_banner", "-loglevel", "warning",
        "-i", str(intro),
        "-i", str(body),
        "-filter_complex", filter_complex,
        "-map", "[out]",
        "-ac", "2",
        "-ar", "44100",
        "-b:a", "160k",
        "-codec:a", "libmp3lame",
        str(out),
    ])


def probe_duration(path: Path) -> str:
    r = subprocess.run([FFMPEG, "-i", str(path)], capture_output=True, text=True)
    for line in r.stderr.splitlines():
        if "Duration" in line:
            return line.strip().split("Duration: ")[1].split(",")[0]
    return "?"


def main() -> None:
    for tag, (intro, body) in JOBS.items():
        out = OUT_DIR / f"game-over-{tag}.mp3"
        build(intro, body, out)
        size_kb = out.stat().st_size / 1024
        print(f"[done] {out.name} — {size_kb:.1f} KB, trajanje {probe_duration(out)}")

    # Promote the active voice to the canonical game-over.mp3 the site serves.
    src = OUT_DIR / f"game-over-{ACTIVE}.mp3"
    dst = OUT_DIR / "game-over.mp3"
    shutil.copy2(src, dst)
    print(f"[active] game-over.mp3 = game-over-{ACTIVE}.mp3  ({dst.stat().st_size/1024:.1f} KB)")


if __name__ == "__main__":
    main()
