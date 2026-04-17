"""Generise 'Game Over' audio najavu u predatorskom stilu via edge-tts (sr-RS)."""
import asyncio
import sys
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "assets" / "audio" / "game-over.mp3"
OUT.parent.mkdir(parents=True, exist_ok=True)

# Predator-style voice-over. Use male (Nicholas) for deeper cyborg feel.
# Slow rate + lower pitch → vibes of Schwarzenegger/movie announcer.
TEXT = (
    "Game over. "
    "Game over. "
    "Molimo vas, ugasite lasere i polako izadjite iz arene sa instruktorom."
)
VOICE = "sr-RS-NicholasNeural"
RATE  = "-8%"   # slightly slower for gravitas
PITCH = "-6Hz"  # deeper voice


async def main():
    tts = edge_tts.Communicate(TEXT, voice=VOICE, rate=RATE, pitch=PITCH)
    await tts.save(str(OUT))
    size_kb = OUT.stat().st_size / 1024
    print(f"[done] {OUT} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    asyncio.run(main())
