"""Transkribuje sve audio/video fajlove iz folder-a 17.04.2026 via Groq."""
from __future__ import annotations

import os
import sys
import subprocess
from pathlib import Path
from datetime import date

import requests
from dotenv import dotenv_values
import imageio_ffmpeg

SRC = Path(r"C:/AI/AI_Assistant/AI_Assistant_Projects/KnjigoPis_AI/Feedback_Loop/17.04.2026")
ROOT = Path(__file__).resolve().parent.parent
KP_ENV = Path(r"c:/AI/AI_Assistant/AI_Assistant_Projects/KnjigoPis_AI/src/.env.local")
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

env = dotenv_values(KP_ENV)
API_KEY = env.get("GROQ_API_KEY") or os.environ.get("GROQ_API_KEY")
if not API_KEY:
    sys.exit("No GROQ_API_KEY")

today = "2026-04-17"
out_dir = ROOT / "Feedback_Loop" / today
out_dir.mkdir(parents=True, exist_ok=True)
raw_md = out_dir / f"Feedback_{today}_RAW.md"

# Collect all audio + video files
audio_exts = {".m4a", ".mp3", ".wav", ".ogg"}
video_exts = {".mp4", ".mov", ".webm"}
files = sorted([p for p in SRC.iterdir() if p.suffix.lower() in audio_exts | video_exts])
print(f"Found {len(files)} media files in {SRC.name}")


def extract_audio(video_path: Path) -> Path:
    """Extract audio track from a video to a small m4a via ffmpeg."""
    out = video_path.with_suffix(".extracted.m4a")
    cmd = [FFMPEG, "-y", "-hide_banner", "-loglevel", "error",
           "-i", str(video_path), "-vn", "-c:a", "aac", "-b:a", "96k", str(out)]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"[ffmpeg err] {video_path.name}: {res.stderr[:200]}")
        return None
    return out


def transcribe(path: Path):
    size_mb = path.stat().st_size / 1024 / 1024
    print(f"[groq] {path.name} ({size_mb:.1f} MB)...", flush=True)
    with path.open("rb") as f:
        files_data = {"file": (path.name, f, "audio/mp4")}
        data = {
            "model": "whisper-large-v3",
            "language": "sr",
            "response_format": "verbose_json",
            "temperature": "0",
        }
        r = requests.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {API_KEY}"},
            files=files_data, data=data, timeout=600,
        )
    if r.status_code != 200:
        print(f"  ERR {r.status_code}: {r.text[:200]}")
        return None
    resp = r.json()
    return {
        "text": (resp.get("text") or "").strip(),
        "duration": resp.get("duration", 0),
        "segments": resp.get("segments") or [],
        "language": resp.get("language", "sr"),
    }


md_parts = [
    f"# Predator Laser Tag — Feedback transcript {today} (RAW)",
    "",
    f"- **Izvor:** `{SRC}`",
    f"- **Ukupno fajlova:** {len(files)}",
    f"- **Model:** whisper-large-v3 (Groq)",
    "",
    "---",
    "",
]

total_dur = 0
for path in files:
    # For videos, extract audio first
    input_path = path
    if path.suffix.lower() in video_exts:
        extracted = extract_audio(path)
        if extracted is None:
            md_parts.append(f"## {path.name}\n\n_ffmpeg extraction failed, skipped_\n\n---\n")
            continue
        input_path = extracted

    result = transcribe(input_path)
    if result is None:
        md_parts.append(f"## {path.name}\n\n_transcription failed_\n\n---\n")
        continue

    total_dur += result["duration"]
    md_parts.extend([
        f"## {path.name}",
        "",
        f"- Trajanje: {result['duration']:.1f}s ({result['duration']/60:.1f} min)",
        f"- Jezik: {result['language']}",
        "",
        "### Transkript",
        "",
        result["text"],
        "",
    ])
    if result["segments"]:
        md_parts.append("### Segmenti")
        md_parts.append("")
        for seg in result["segments"]:
            start = seg.get("start", 0)
            mm = int(start // 60)
            ss = int(start % 60)
            seg_text = (seg.get("text") or "").strip()
            md_parts.append(f"**[{mm:02d}:{ss:02d}]** {seg_text}")
        md_parts.append("")
    md_parts.append("---\n")

    # cleanup extracted
    if input_path != path:
        try: input_path.unlink()
        except: pass

md_parts.append(f"\n**Ukupno trajanje:** {total_dur:.1f}s ({total_dur/60:.1f} min)")
raw_md.write_text("\n".join(md_parts), encoding="utf-8")
print(f"\n[done] wrote {raw_md}")
print(f"[done] total {total_dur/60:.1f} min")
