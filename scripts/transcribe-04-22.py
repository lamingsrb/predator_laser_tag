"""Transkribuje oba m4a voice feedbacka od 2026-04-22 via Groq whisper."""
from __future__ import annotations
import os, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from pathlib import Path
import requests
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parent.parent
KP_ENV = Path(r"c:/AI/AI_Assistant/AI_Assistant_Projects/KnjigoPis_AI/src/.env.local")
env = dotenv_values(KP_ENV)
API_KEY = env.get("GROQ_API_KEY") or os.environ.get("GROQ_API_KEY")
if not API_KEY:
    sys.exit("No GROQ_API_KEY")

SRC_DIR = ROOT / "Feedback_Loop" / "2026-04-22"
files = sorted(SRC_DIR.glob("*.m4a"))
if not files:
    sys.exit(f"No m4a in {SRC_DIR}")

out_md = SRC_DIR / "Feedback_2026-04-22_RAW.md"
md = [f"# Feedback 2026-04-22 - 2 audio poruke", ""]

for idx, f in enumerate(files, 1):
    size_mb = f.stat().st_size / 1024 / 1024
    print(f"[groq] #{idx}: {f.name} ({size_mb:.1f} MB)...", flush=True)
    with f.open("rb") as fh:
        r = requests.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {API_KEY}"},
            files={"file": (f.name, fh, "audio/mp4")},
            data={"model": "whisper-large-v3", "language": "sr",
                  "response_format": "verbose_json", "temperature": "0"},
            timeout=300,
        )
    if r.status_code != 200:
        print(f"ERR {r.status_code}: {r.text[:200]}")
        continue
    resp = r.json()
    text = (resp.get("text") or "").strip()
    dur = resp.get("duration", 0)
    md += [f"## Poruka #{idx} ({dur:.1f}s)", "", text, ""]
    print(f"  [{dur:.1f}s] {text[:100]}...")

out_md.write_text("\n".join(md), encoding="utf-8")
print(f"[done] -> {out_md.name}")
