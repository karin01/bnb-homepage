"""사이트용 공부 BGM 루프를 만듭니다. 저작권 없는 원곡입니다."""

from __future__ import annotations

import math
import struct
import wave
from pathlib import Path

SAMPLE_RATE = 22050
BPM = 76
BEAT = 60.0 / BPM
BARS = 8
BEATS_PER_BAR = 4
DURATION = BARS * BEATS_PER_BAR * BEAT
SAMPLE_COUNT = int(SAMPLE_RATE * DURATION)


def midi_to_hz(note: float) -> float:
    return 440.0 * (2.0 ** ((note - 69.0) / 12.0))


def envelope(position: int, length: int, attack: float, release: float) -> float:
    if length <= 0:
        return 0.0
    time = position / SAMPLE_RATE
    total = length / SAMPLE_RATE
    if time < attack:
        return time / attack if attack > 0 else 1.0
    remaining = total - time
    if remaining < release:
        return max(0.0, remaining / release) if release > 0 else 0.0
    return 1.0


def add_tone(
    buffer: list[float],
    frequency: float,
    start_beat: float,
    length_beat: float,
    amplitude: float,
    harmonics: tuple[tuple[float, float], ...],
    attack: float,
    release: float,
) -> None:
    start = int(start_beat * BEAT * SAMPLE_RATE)
    length = int(length_beat * BEAT * SAMPLE_RATE)
    for index in range(length):
        target = start + index
        if target >= SAMPLE_COUNT:
            break
        time = index / SAMPLE_RATE
        wave_sum = 0.0
        for harmonic, weight in harmonics:
            wave_sum += weight * math.sin(2.0 * math.pi * frequency * harmonic * time)
        buffer[target] += amplitude * envelope(index, length, attack, release) * wave_sum


def add_noise_hit(buffer: list[float], start_beat: float, length_beat: float, amplitude: float) -> None:
    start = int(start_beat * BEAT * SAMPLE_RATE)
    length = int(length_beat * BEAT * SAMPLE_RATE)
    seed = 12345 + start
    for index in range(length):
        target = start + index
        if target >= SAMPLE_COUNT:
            break
        seed = (1103515245 * seed + 12345) & 0x7FFFFFFF
        noise = (seed / 0x7FFFFFFF) * 2.0 - 1.0
        buffer[target] += amplitude * envelope(index, length, 0.002, length_beat * BEAT) * noise


def normalize(buffer: list[float], peak: float = 0.72) -> None:
    loudest = max((abs(sample) for sample in buffer), default=1.0)
    if loudest == 0:
        return
    scale = peak / loudest
    for index, sample in enumerate(buffer):
        buffer[index] = sample * scale


def write_wav(path: Path, buffer: list[float]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "w") as file:
        file.setnchannels(1)
        file.setsampwidth(2)
        file.setframerate(SAMPLE_RATE)
        frames = bytearray()
        for sample in buffer:
            clipped = max(-1.0, min(1.0, sample))
            frames.extend(struct.pack("<h", int(clipped * 32767)))
        file.writeframes(frames)


def main() -> None:
    buffer = [0.0] * SAMPLE_COUNT
    pad = ((1.0, 1.0), (2.0, 0.22), (3.0, 0.08), (4.0, 0.04))
    bass = ((1.0, 1.0), (2.0, 0.18))
    pluck = ((1.0, 1.0), (2.0, 0.35), (3.0, 0.12))
    progression = [
        (45, 48, 52, 55),  # A minor
        (41, 45, 48, 53),  # F
        (48, 52, 55, 60),  # C
        (43, 47, 50, 55),  # G
    ]
    melody = [72, 71, 69, 67, 69, 64, 67, 69, 71, 72, 74, 72, 71, 69, 67, 64]

    for bar in range(BARS):
        chord = progression[bar % len(progression)]
        bar_start = bar * BEATS_PER_BAR
        add_tone(buffer, midi_to_hz(chord[0] - 12), bar_start, BEATS_PER_BAR, 0.22, bass, 0.04, 0.4)
        for note in chord:
            add_tone(buffer, midi_to_hz(note), bar_start, BEATS_PER_BAR, 0.09, pad, 0.08, 0.5)
        for beat in range(BEATS_PER_BAR):
            add_noise_hit(buffer, bar_start + beat, 0.12, 0.045 if beat % 2 == 0 else 0.028)
            melody_note = melody[(bar * BEATS_PER_BAR + beat) % len(melody)]
            add_tone(
                buffer,
                midi_to_hz(melody_note),
                bar_start + beat + 0.08,
                0.85,
                0.11,
                pluck,
                0.01,
                0.35,
            )

    normalize(buffer)
    root = Path(__file__).resolve().parents[1]
    wav_path = root / "public" / "music" / "bnb-study-loop.wav"
    write_wav(wav_path, buffer)
    print(f"wrote {wav_path} ({DURATION:.1f}s)")


if __name__ == "__main__":
    main()
