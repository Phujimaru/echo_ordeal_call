# สังเคราะห์เสียงระเบิดท้าย Ohger Finish (ohger_finish_boom) — numpy ล้วน ไม่มีไฟล์ต้นฉบับ/ไม่ดาวน์โหลด (ผู้ใช้สั่ง 2026-10-28:
#  ตัดระเบิดเดิมท้าย ohger_finish_call ออก แล้วหาเสียงระเบิดใหม่มาเอง)
#  python -I .claude/plans/ohger-boom.py [โฟลเดอร์ปลายทาง]   (ปกติ client/public/characters/ohger/sfx — gitignore)
#  ชั้นเสียง: แฟลชคลิกต้น (สว่าง) → ตุ้บต่ำกวาดลง 70→32 Hz → ระเบิดนอยส์ย่านกลางสลายเร็ว → เศษประกายแตก → ครางต่ำยาว
#  วัด ffmpeg ebur128 แล้วคูณให้ได้ −16 LUFS (เท่าเสียงจังหวะเดียวอื่น) · จำกัดยอดไม่เกิน −1 dBFS · AAC .m4a 192k
import os, subprocess, sys, tempfile, wave
import numpy as np

SR = 48000
TARGET = -16.0
rng = np.random.default_rng(2023)  # ปีที่คิงโอเจอร์ออกอากาศ


def t(n):
    return np.arange(n) / SR


def lowpass(x, fc):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / (1 + (f / fc) ** 4)
    return np.fft.irfft(X, len(x))


def band(x, lo, hi):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = (1 / (1 + (lo / np.maximum(f, 1)) ** 4)) * (1 / (1 + (f / hi) ** 4))
    return np.fft.irfft(X * m, len(x))


def boom(dur=2.6):
    n = int(SR * dur)
    tt = t(n)
    out = np.zeros(n)
    # แฟลชต้น: คลิกสว่างสั้น
    k = int(SR * 0.012)
    out[:k] += band(rng.standard_normal(k), 2500, 9000) * np.linspace(1, 0, k) * 0.6
    # ตุ้บต่ำกวาดลง
    f = 32 + 38 * np.exp(-tt / 0.18)
    ph = 2 * np.pi * np.cumsum(f) / SR
    out += np.sin(ph) * np.exp(-tt / 0.55) * 1.0 * np.minimum(1, tt / 0.004)
    # ระเบิดนอยส์ย่านกลาง
    nz = rng.standard_normal(n)
    out += band(nz, 120, 2600) * np.exp(-tt / 0.22) * 0.9 * np.minimum(1, tt / 0.003)
    # เศษประกายแตก (คลิกสุ่มช่วง 0.05–0.9 วิ)
    crack = np.zeros(n)
    for _ in range(90):
        at = int(SR * rng.uniform(0.05, 0.9))
        L = int(SR * rng.uniform(0.002, 0.008))
        if at + L < n:
            crack[at:at + L] += rng.standard_normal(L) * np.linspace(1, 0, L) * rng.uniform(0.2, 1.0) * np.exp(-at / SR / 0.5)
    out += band(crack, 1500, 8000) * 0.35
    # ครางต่ำยาว
    out += lowpass(rng.standard_normal(n), 180) * np.exp(-tt / 0.9) * 0.9
    # หางจางนุ่ม 0.4 วิสุดท้าย
    fade = int(SR * 0.4)
    out[-fade:] *= np.linspace(1, 0, fade) ** 2
    return out


def save_wav(path, x):
    y = np.clip(x, -1, 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((y * 32767).astype(np.int16).tobytes())


def lufs(path):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True)
    I = peak = None
    for line in r.stderr.splitlines():
        s = line.strip()
        if s.startswith("I:"): I = float(s.split()[1])
        if s.startswith("Peak:"): peak = float(s.split()[1])
    return I, peak


def main():
    out_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "..", "client", "public", "characters", "ohger", "sfx")
    x = boom()
    x /= np.max(np.abs(x))
    tmp = tempfile.mkdtemp()
    raw = os.path.join(tmp, "raw.wav")
    save_wav(raw, x * 0.5)
    I, _ = lufs(raw)
    gain = 10 ** ((TARGET - I) / 20)
    y = x * 0.5 * gain
    pk = np.max(np.abs(y))
    ceil = 10 ** (-3.0 / 20)  # เผื่อยอดเด้งตอนเข้ารหัส AAC (ผลจริง ≤ −1 dBFS)
    if pk > ceil:  # จำกัดยอดแบบนุ่ม (tanh) ให้ไม่เกิน −3 dBFS ก่อนเข้ารหัส แล้ววัดใหม่
        y = np.tanh(y / ceil) * ceil
    fin = os.path.join(tmp, "fin.wav")
    save_wav(fin, y)
    I2, _ = lufs(fin)
    y *= 10 ** ((TARGET - I2) / 20)
    save_wav(fin, np.clip(y, -ceil, ceil))
    dst = os.path.join(out_dir, "ohger_finish_boom.m4a")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", fin, "-c:a", "aac", "-b:a", "192k", dst], check=True)
    I3, P3 = lufs(dst)
    print(f"ohger_finish_boom  {len(y) / SR:.2f}s  {I3} LUFS  peak {P3} dBFS -> {dst}")


if __name__ == "__main__":
    main()
