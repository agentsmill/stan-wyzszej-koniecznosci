#!/usr/bin/env python3
"""Generuje prostą, mroczną ścieżkę chiptune (A-moll, 112 BPM) do filmiku. Użycie: chiptune.py out.wav [sekundy]"""
import sys, math, wave, struct
import numpy as np
SR = 44100; BPM = 112; BEAT = 60 / BPM; OUT = sys.argv[1]; DUR = float(sys.argv[2]) if len(sys.argv) > 2 else 48.0
N = int(SR * DUR); t = np.arange(N) / SR; mix = np.zeros(N)

def note(f, start, length, wave_fn, vol=0.2, attack=0.005, decay=0.12):
    i0 = int(start * SR); i1 = min(N, int((start + length) * SR));
    if i0 >= N or i1 <= i0: return
    tt = np.arange(i1 - i0) / SR
    env = np.minimum(1, tt / attack) * np.exp(-tt / max(decay, 1e-3) * (1 if length < 0.6 else 0.35))
    mix[i0:i1] += vol * env * wave_fn(2 * math.pi * f * tt)

square = lambda x: np.sign(np.sin(x)) * 0.6
pulse25 = lambda x: np.where((x % (2 * math.pi)) < math.pi / 2, 1.0, -1.0) * 0.5
tri = lambda x: 2 / math.pi * np.arcsin(np.sin(x))
def noise_hit(start, length=0.05, vol=0.12):
    i0 = int(start * SR); i1 = min(N, i0 + int(length * SR));
    if i0 >= N: return
    tt = np.arange(i1 - i0) / SR; mix[i0:i1] += vol * np.random.uniform(-1, 1, i1 - i0) * np.exp(-tt / 0.012)
def kick(start, vol=0.5):
    i0 = int(start * SR); i1 = min(N, i0 + int(0.25 * SR));
    if i0 >= N: return
    tt = np.arange(i1 - i0) / SR; f = 120 * np.exp(-tt * 18) + 40
    mix[i0:i1] += vol * np.sin(2 * math.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.09)

A, C, D, E, F, G = 110.0, 130.81, 146.83, 164.81, 174.61, 196.0
bass_prog = [A, A, F, F, C, C, G, E]          # bar bass notes (1 bar = 4 beats)
arps = {A: [220, 261.63, 329.63, 440], F: [174.61, 220, 261.63, 349.23], C: [130.81, 164.81, 196.0, 261.63], G: [196.0, 246.94, 293.66, 392.0], E: [164.81, 196.0, 246.94, 329.63]}
bars = int(DUR / (4 * BEAT)) + 1
for b in range(bars):
    root = bass_prog[b % len(bass_prog)]; t0 = b * 4 * BEAT
    for k in range(8):  # ósemki basu
        note(root / 2 if k % 2 else root, t0 + k * BEAT / 2, BEAT / 2 * 0.9, square, vol=0.16, decay=0.3)
    arp = arps[root]
    for k in range(16):  # szesnastki arpeggio (od 3. taktu)
        if b >= 2: note(arp[k % 4] * (2 if (k // 4) % 2 else 1), t0 + k * BEAT / 4, BEAT / 4, pulse25, vol=0.07 if b < 6 else 0.1, decay=0.08)
    for k in range(4):
        kick(t0 + k * BEAT, 0.45); noise_hit(t0 + k * BEAT + BEAT / 2, 0.04, 0.10)
        if b >= 4: noise_hit(t0 + k * BEAT + BEAT * 0.75, 0.025, 0.05)
    if b >= 6 and b % 2 == 1:  # „syrena" co drugi takt
        i0 = int(t0 * SR); i1 = min(N, i0 + int(2 * BEAT * SR)); tt = np.arange(i1 - i0) / SR
        f = 660 + 220 * np.sin(2 * math.pi * 1.5 * tt); mix[i0:i1] += 0.04 * tri(2 * math.pi * np.cumsum(f) / SR) * np.exp(-tt / 1.2)
# miękkie wejście i wyciszenie, limiter
fade = np.ones(N); fi = int(0.4 * SR); fo = int(2.5 * SR); fade[:fi] = np.linspace(0, 1, fi); fade[-fo:] = np.linspace(1, 0, fo)
mix = np.tanh(mix * 1.6) * fade * 0.9
with wave.open(OUT, 'w') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('zapisano', OUT, f'{DUR:.0f}s')
