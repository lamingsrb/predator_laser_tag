"""Transcribe the client feedback audio via Groq Whisper Large v3.

Mirrors the KnjigoPis AI whisper-cloud approach: POST to
https://api.groq.com/openai/v1/audio/transcriptions with
model=whisper-large-v3, language=sr. Writes raw markdown
to Feedback_Loop/<date>/Feedback_<date>_RAW.md.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path
from datetime import date

import requests
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parent.parent
AUDIO = ROOT / "Media_RAW" / "predator LaKI" / "Novi feedback sajta.m4a"
KP_ENV = Path(r"c:/AI/AI_Assistant/AI_Assistant_Projects/KnjigoPis_AI/src/.env.local")

env = dotenv_values(KP_ENV)
API_KEY = env.get("GROQ_API_KEY") or os.environ.get("GROQ_API_KEY")
if not API_KEY:
    print("GROQ_API_KEY not found in KnjigoPis .env.local or environ", file=sys.stderr)
    sys.exit(1)

if not AUDIO.exists():
    print(f"Audio not found: {AUDIO}", file=sys.stderr)
    sys.exit(2)

today = date.today().isoformat()  # YYYY-MM-DD
out_dir = ROOT / "Feedback_Loop" / today
out_dir.mkdir(parents=True, exist_ok=True)
raw_md = out_dir / f"Feedback_{today}_RAW.md"

print(f"[groq] uploading {AUDIO.name} ({AUDIO.stat().st_size / 1024 / 1024:.1f} MB)...")

with AUDIO.open("rb") as f:
    files = {"file": (AUDIO.name, f, "audio/mp4")}
    data = {
        "model": "whisper-large-v3",
        "language": "sr",
        "response_format": "verbose_json",
        "temperature": "0",
    }
    r = requests.post(
        "https://api.groq.com/openai/v1/audio/transcriptions",
        headers={"Authorization": f"Bearer {API_KEY}"},
        files=files,
        data=data,
        timeout=600,
    )

if r.status_code != 200:
    print(f"Groq API error {r.status_code}: {r.text[:600]}", file=sys.stderr)
    sys.exit(3)

resp = r.json()
text = (resp.get("text") or "").strip()
dur = resp.get("duration", 0)
lang = resp.get("language", "sr")

print(f"[groq] done — lang={lang}, duration={dur:.1f}s, text {len(text)} chars")

segments = resp.get("segments") or []

md = [
    f"# Predator Laser Tag — Feedback transcript (RAW)",
    "",
    f"- **Datum:** {today}",
    f"- **Audio:** `Media_RAW/predator LaKI/{AUDIO.name}` ({AUDIO.stat().st_size / 1024 / 1024:.1f} MB)",
    f"- **Trajanje:** {dur:.1f}s ({dur/60:.1f} min)",
    f"- **Jezik:** {lang}",
    f"- **Model:** whisper-large-v3 (Groq)",
    "",
    "---",
    "",
    "## Pun transkript",
    "",
    text,
    "",
]

if segments:
    md.extend(["---", "", "## Segmenti sa timecode-ovima", ""])
    for seg in segments:
        start = seg.get("start", 0)
        end = seg.get("end", 0)
        seg_text = (seg.get("text") or "").strip()
        mm = int(start // 60)
        ss = int(start % 60)
        md.append(f"**[{mm:02d}:{ss:02d}]** {seg_text}")
        md.append("")

raw_md.write_text("\n".join(md), encoding="utf-8")
print(f"[groq] wrote {raw_md}")
print(f"[groq] {len(segments)} segments")
