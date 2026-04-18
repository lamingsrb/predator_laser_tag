"""Transkribuje audio feedback od 2026-04-18 via Groq whisper."""
from __future__ import annotations

import os
import sys
from pathlib import Path

import requests
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parent.parent
KP_ENV = Path(r"c:/AI/AI_Assistant/AI_Assistant_Projects/KnjigoPis_AI/src/.env.local")
env = dotenv_values(KP_ENV)
API_KEY = env.get("GROQ_API_KEY") or os.environ.get("GROQ_API_KEY")
if not API_KEY:
    sys.exit("No GROQ_API_KEY")

SRC_DIR = ROOT / "Feedback_Loop" / "2026-04-18"
m4a_files = sorted(SRC_DIR.glob("*.m4a"))
if not m4a_files:
    sys.exit(f"No .m4a in {SRC_DIR}")
TARGET = m4a_files[0]
RAW_MD = SRC_DIR / "Feedback_2026-04-18_RAW.md"

size_mb = TARGET.stat().st_size / 1024 / 1024
print(f"[groq] {TARGET.name} ({size_mb:.1f} MB)...", flush=True)
with TARGET.open("rb") as f:
    r = requests.post(
        "https://api.groq.com/openai/v1/audio/transcriptions",
        headers={"Authorization": f"Bearer {API_KEY}"},
        files={"file": (TARGET.name, f, "audio/mp4")},
        data={"model": "whisper-large-v3", "language": "sr",
              "response_format": "verbose_json", "temperature": "0"},
        timeout=600,
    )
if r.status_code != 200:
    sys.exit(f"ERR {r.status_code}: {r.text[:400]}")

resp = r.json()
text = (resp.get("text") or "").strip()
dur = resp.get("duration", 0)
segs = resp.get("segments") or []

md = [
    f"# Predator Laser Tag — Feedback transcript 2026-04-18",
    "",
    f"- **File:** `{TARGET.name}`",
    f"- **Trajanje:** {dur:.1f}s ({dur/60:.1f} min)",
    f"- **Model:** whisper-large-v3 (Groq)",
    "",
    "---",
    "",
    "## Full transcript",
    "",
    text,
    "",
    "## Segments",
    "",
]
for s in segs:
    start = s.get("start", 0)
    mm = int(start // 60); ss = int(start % 60)
    md.append(f"**[{mm:02d}:{ss:02d}]** {(s.get('text') or '').strip()}")

RAW_MD.write_text("\n".join(md), encoding="utf-8")
print(f"[done] {RAW_MD.name} — {dur/60:.1f} min, {len(segs)} segments")
