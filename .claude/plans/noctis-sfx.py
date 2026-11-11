# เสียงสังเคราะห์ของน็อคทิส ลูซิส เคลัม (characters/noctis.js · client/src/board/noctFx.js)
#  python .claude/plans/noctis-sfx.py <โฟลเดอร์ปลายทาง>  → noct_*.mp3 (ต้องมี ffmpeg)
#  จังหวะปะทะของทุกเสียงตีอยู่ต้นไฟล์ (client เล่นตอนปะทะ)
import os
import subprocess
import sys
import wave

import numpy as np

SR = 44100
rng = np.random.default_rng(7)


def t_(d):
    return np.arange(int(SR * d)) / SR


def env(n, a=0.005, d=0.3, sustain=0.0):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * (sustain + (1 - sustain) * np.exp(-t / max(d, 1e-4)))
    return e


def band(x, lo, hi):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(X, len(x))


def noise(d):
    return rng.standard_normal(int(SR * d))


def mix(*parts):
    n = max(len(p[1]) + int(p[0] * SR) for p in parts)
    out = np.zeros(n)
    for off, x in parts:
        i = int(off * SR)
        out[i:i + len(x)] += x
    return out


def whoosh(d=0.22, lo=600, hi=5000, amp=0.6, sweep_up=True):
    n = int(SR * d)
    x = noise(d)
    segs = 6
    out = np.zeros(n)
    for k in range(segs):
        a, b = k * n // segs, (k + 1) * n // segs
        r = k / (segs - 1)
        c = (lo + (hi - lo) * (r if sweep_up else 1 - r))
        out[a:b] = band(x, c * 0.5, c * 1.6)[a:b]
    t = np.arange(n) / n
    return out * np.sin(np.pi * t) ** 1.5 * amp / (np.abs(out).max() + 1e-9)


def clang(f0=900, d=0.9, amp=0.5, ratios=(1, 2.76, 5.4, 8.93, 13.3)):
    t = t_(d)
    x = sum(np.sin(2 * np.pi * f0 * r * t + rng.random() * 6) * np.exp(-t * (3 + r * 1.6)) / (1 + r * 0.6) for r in ratios)
    return x * amp / (np.abs(x).max() + 1e-9) * env(len(t), 0.001, d)


def thump(f0=110, f1=38, d=0.6, amp=0.9):
    t = t_(d)
    f = f1 + (f0 - f1) * np.exp(-t * 18)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t * 6)
    return x * amp


def crunch(d=0.35, amp=0.5, lo=200, hi=3000):
    x = band(noise(d), lo, hi) * env(int(SR * d), 0.001, d * 0.25)
    return x * amp / (np.abs(x).max() + 1e-9)


def shimmer(d=0.8, n=18, lo=2200, hi=7000, amp=0.35, rise=False):
    t = t_(d)
    x = np.zeros_like(t)
    for _ in range(n):
        f = rng.uniform(lo, hi)
        st = rng.uniform(0, d * 0.5)
        e = np.where(t >= st, np.exp(-(t - st) * rng.uniform(6, 14)), 0)
        x += np.sin(2 * np.pi * f * (1 + (0.15 * t if rise else 0)) * t) * e
    return x * amp / (np.abs(x).max() + 1e-9)


def pluck(f0=180, d=0.6, amp=0.6, damp=0.996):
    n = int(SR * d)
    N = int(SR / f0)
    buf = rng.uniform(-1, 1, N)
    out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % N]
        buf[i % N] = damp * 0.5 * (buf[i % N] + buf[(i + 1) % N])
    return out * amp / (np.abs(out).max() + 1e-9)


def chord(fs, d=1.2, amp=0.35, vib=5):
    t = t_(d)
    x = sum(np.sin(2 * np.pi * f * t + 0.004 * f * np.sin(2 * np.pi * vib * t) / vib) for f in fs)
    e = np.minimum(1, t / 0.15) * np.exp(-t * 1.6)
    return x * e * amp / len(fs)


def verb(x, d=0.9, wet=0.25):
    ir = noise(d) * np.exp(-np.arange(int(SR * d)) / SR * 5)
    ir = band(ir, 300, 8000)
    n = len(x) + len(ir)
    y = np.fft.irfft(np.fft.rfft(x, n) * np.fft.rfft(ir, n), n)
    y = y / (np.abs(y).max() + 1e-9) * np.abs(x).max()
    out = np.zeros(n)
    out[:len(x)] += x
    return out + wet * y


def sword(f0=950, swing=0.16):
    # ฟัน: ลมตัดสั้นๆ จบที่ปะทะ (ต้นไฟล์ = ปะทะ แต่ใส่ลมบางๆ ก่อนนิดเดียว)
    return mix((0, whoosh(swing, 1200, 6000, 0.5, False)), (0.02, clang(f0, 0.7, 0.45)), (0.0, crunch(0.08, 0.25, 1500, 7000)), (0.03, shimmer(0.5, 8, 3000, 7500, 0.12)))


SOUNDS = {
    "noct_atk_wise": lambda: verb(sword(1100), 0.6, 0.18),
    "noct_atk_engine": lambda: verb(mix((0, sword(760)), (0.0, clang(260, 0.5, 0.35, (1, 1.5, 2.2))), (0.16, whoosh(0.14, 900, 4000, 0.4)), (0.2, clang(820, 0.5, 0.3))), 0.7, 0.2),
    "noct_atk_father": lambda: verb(mix((0, sword(1250)), (0.03, chord([880, 1320, 1760], 0.9, 0.25))), 0.9, 0.25),
    "noct_atk_mystic": lambda: verb(mix((0, sword(1400)), (0.0, shimmer(0.9, 26, 1800, 6500, 0.3, True)), (0.0, chord([220, 330], 0.8, 0.25, 9))), 1.0, 0.3),
    "noct_atk_katana": lambda: verb(mix(*[(i * 0.085, mix((0, whoosh(0.07, 2500, 8000, 0.55, False)), (0.01, clang(1900 + i * 140, 0.35, 0.3)))) for i in range(3)], (0.34, clang(3200, 0.25, 0.25, (1, 2.1)))), 0.5, 0.15),
    "noct_atk_wanderer": lambda: verb(mix((0, sword(1050, 0.12)), (0.07, sword(1300, 0.1))), 0.6, 0.18),
    "noct_atk_tall": lambda: verb(mix((0, thump(95, 32, 0.8, 0.9)), (0, clang(520, 1.0, 0.45, (1, 2.3, 4.1, 6.6))), (0, crunch(0.5, 0.45, 120, 2500))), 0.9, 0.22),
    "noct_atk_axe": lambda: verb(mix((0, thump(130, 45, 0.5, 0.8)), (0, crunch(0.3, 0.6, 300, 4000)), (0.01, clang(620, 0.5, 0.3))), 0.6, 0.18),
    "noct_atk_mace": lambda: verb(mix((0, thump(80, 28, 1.0, 1.0)), (0, crunch(0.6, 0.5, 80, 1800)), (0.02, clang(340, 0.7, 0.3, (1, 1.9, 3.2)))), 1.1, 0.25),
    "noct_atk_shield": lambda: verb(mix((0, thump(160, 70, 0.4, 0.7)), (0, clang(430, 0.8, 0.5, (1, 2.4, 3.9, 5.1))), (0, crunch(0.12, 0.3, 400, 3000))), 0.7, 0.2),
    "noct_atk_scepter": lambda: verb(mix((0, shimmer(1.1, 30, 2000, 7000, 0.35, True)), (0, chord([523, 659, 784, 1046], 1.3, 0.4)), (0.0, thump(220, 120, 0.3, 0.3))), 1.4, 0.35),
    "noct_atk_bow": lambda: verb(mix((0, whoosh(0.05, 2000, 6000, 0.4)), (0.04, thump(240, 90, 0.18, 0.55)), (0.04, crunch(0.07, 0.45, 800, 5000)), (0.0, pluck(140, 0.35, 0.18))), 0.5, 0.15),
    "noct_atk_star": lambda: verb(mix((0, whoosh(0.18, 1500, 5000, 0.4)), (0.05, clang(1600, 0.45, 0.35, (1, 2.9, 5.2))), (0.25, whoosh(0.25, 1200, 4000, 0.3, False))), 0.5, 0.15),
    "noct_atk_trident": lambda: verb(mix((0, whoosh(0.1, 1500, 7000, 0.55)), (0.03, clang(1450, 0.6, 0.4, (1, 3.1, 6.2))), (0.03, crunch(0.1, 0.3, 1000, 6000))), 0.6, 0.18),
    "noct_warp": lambda: verb(mix((0, whoosh(0.25, 800, 7000, 0.5)), (0, shimmer(0.7, 30, 2500, 8000, 0.45)), (0.18, shimmer(0.6, 20, 3000, 9000, 0.35))), 0.8, 0.3),
    "noct_point": lambda: verb(mix((0, whoosh(0.18, 1500, 7000, 0.35)), (0.05, shimmer(0.6, 16, 1800, 5000, 0.35))), 0.8, 0.3),
    "noct_throw": lambda: mix((0, whoosh(0.3, 900, 6000, 0.55)), (0.0, shimmer(0.3, 8, 3000, 8000, 0.15))),
    "noct_arm": lambda: verb(shimmer(0.7, 24, 1500, 6500, 0.4, True), 0.8, 0.3),
    "noct_heed": lambda: verb(mix((0, chord([196, 247, 294, 392], 1.6, 0.5, 4)), (0.1, shimmer(1.2, 26, 2000, 6000, 0.25, True))), 1.6, 0.4),
    "noct_ruin": lambda: verb(mix(*[(i * 0.06, whoosh(0.16, 1000 + i * 120, 6000, 0.35)) for i in range(13)], (0.75, thump(110, 40, 0.6, 0.6)), (0.75, shimmer(0.8, 30, 2000, 8000, 0.4))), 0.9, 0.25),
    "noct_end": lambda: verb(mix((0, thump(70, 25, 1.4, 1.0)), (0, clang(300, 1.6, 0.5, (1, 2.2, 3.7, 5.9))), (0, crunch(0.8, 0.5, 60, 2500)), (0.05, shimmer(1.4, 40, 1500, 7000, 0.35))), 1.6, 0.35),
}


def save(name, x, out):
    x = x / (np.abs(x).max() + 1e-9) * 0.7
    wav = os.path.join(out, name + ".wav")
    with wave.open(wav, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav, "-b:a", "128k", os.path.join(out, name + ".mp3")], check=True)
    os.remove(wav)


if __name__ == "__main__":
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    for k, f in SOUNDS.items():
        save(k, f(), out)
        print(k)
