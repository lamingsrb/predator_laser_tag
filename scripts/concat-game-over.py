"""Spaja 1.mp3 + 2.mp3 iz Audio za dugme/ u jedinstveni game-over.mp3.

Normalizuje sample rate / kanale, ubacuje kratku pauzu izmedu, primenjuje
loudnorm da volumen bude konzistentan i ugodan za reprodukciju kroz zvucnike
u areni. Overwrites public/assets/audio/game-over.mp3.
"""
from __future__ import annotations

import subprocess
from pathlib import Path

import imageio_ffmpeg

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "Media_RAW" / "Audio za dugme"
OUT = ROOT / "public" / "assets" / "audio" / "game-over.mp3"
IN1 = SRC / "1.mp3"
IN2 = SRC / "2.mp3"
PAUSE_SEC = 0.35  # kratka pauza izmedu dve linije
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()


def run(cmd: list[str]) -> None:
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        # Print last ~40 lines of stderr so we see the real error
        lines = r.stderr.strip().splitlines()[-40:]
        print("\n".join(lines))
        raise SystemExit(r.returncode)


def main() -> None:
    assert IN1.exists() and IN2.exists(), f"Missing source: {IN1} / {IN2}"
    OUT.parent.mkdir(parents=True, exist_ok=True)

    # Single-pass filter graph:
    #  - Force both inputs to 44.1 kHz mono pcm
    #  - Silence generator (anullsrc) for a 350 ms breath between lines
    #  - Concat and apply loudnorm for even perceived volume
    filter_complex = (
        "[0:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=mono[a1];"
        "[1:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=mono[a2];"
        f"anullsrc=r=44100:cl=mono:d={PAUSE_SEC}[gap];"
        "[a1][gap][a2]concat=n=3:v=0:a=1[joined];"
        "[joined]loudnorm=I=-14:LRA=7:TP=-1.5[norm];"
        "[norm]aformat=sample_rates=44100:channel_layouts=stereo[out]"
    )

    cmd = [
        FFMPEG, "-y", "-hide_banner", "-loglevel", "warning",
        "-i", str(IN1),
        "-i", str(IN2),
        "-filter_complex", filter_complex,
        "-map", "[out]",
        "-ac", "2",
        "-ar", "44100",
        "-b:a", "160k",
        "-codec:a", "libmp3lame",
        str(OUT),
    ]
    run(cmd)

    size_kb = OUT.stat().st_size / 1024
    # Re-inspect for reporting
    probe = subprocess.run([FFMPEG, "-i", str(OUT)], capture_output=True, text=True)
    dur = None
    for line in probe.stderr.splitlines():
        if "Duration" in line:
            dur = line.strip().split("Duration: ")[1].split(",")[0]
            break
    print(f"[done] {OUT.name} — {size_kb:.1f} KB, trajanje {dur}")


if __name__ == "__main__":
    main()
