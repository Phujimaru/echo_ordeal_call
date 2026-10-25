# สังเคราะห์เสียงเอฟเฟกต์ของเคนซากิ คาซุมะ (Kamen Rider Blade · GRID_PLAN §7.19) — numpy ล้วน ไม่มีไฟล์ต้นฉบับ/ไม่ดาวน์โหลด
#  python -I .claude/plans/kazuma-sfx.py <โฟลเดอร์ปลายทาง> [<โฟลเดอร์ปลายทาง> ...] [--only ชื่อ,ชื่อ]
#   (ปกติ client/public/characters/kensaki_kazuma/sfx — โฟลเดอร์นี้ gitignore · ห้ามลบไฟล์เดิม kazuma_card_* / kazuma_lightning_* ฯลฯ)
#  แต่ละไฟล์: สร้าง wav (mono 44.1k) → วัด ffmpeg loudnorm + จำกัดยอดเอง จนได้ -16 LUFS → AAC .m4a 192k (128k ยอดเด้งเกิน 0 dBFS ตอนถอด)
#  ตีปกติ (kazuma_atk_*): จุดกระแทกอยู่ 0–15 ms แรก (BoardStage เล่นตรงจังหวะปะทะ STYLE_HIT)
#  เหตุการณ์ (engine.sfx จาก server): เล่นตรงเวลาที่เหตุการณ์เกิด — หัวเสียงอยู่ต้นไฟล์
import json, os, shutil, subprocess, sys, tempfile, wave
import numpy as np

SR = 44100
TARGET = -16.0
rng = np.random.default_rng(2004)  # ปีที่ Blade ออกอากาศ


def T(dur):
    return np.arange(int(SR * dur)) / SR


def buf(dur):
    return np.zeros(int(SR * dur))


def put(out, sig, at):
    i = int(SR * at)
    n = min(len(sig), len(out) - i)
    if n > 0:
        out[i:i + n] += sig[:n]


def noise(dur):
    return rng.standard_normal(int(SR * dur))


def band(x, lo, hi, soft=0.15):
    # กรองช่วงความถี่ด้วย FFT (ขอบนุ่ม)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(f)
    if lo > 0:
        m *= 1 / (1 + np.exp(-(f - lo) / max(1, lo * soft)))
    if hi < SR / 2:
        m *= 1 / (1 + np.exp((f - hi) / max(1, hi * soft)))
    return np.fft.irfft(X * m, len(x))


def sweep_band(dur, f0, f1, width=0.6):
    # ลมพัด/ดาบกวาด: noise กรองแบนด์ที่ไล่ความถี่ (ท่อนสั้นซ้อนกัน)
    n = int(SR * dur)
    out = np.zeros(n)
    seg = 1024
    win = np.hanning(seg * 2)
    src = rng.standard_normal(n + seg * 2)
    for s in range(0, n, seg):
        u = s / max(1, n - 1)
        fc = f0 * (f1 / f0) ** u
        chunk = band(src[s:s + seg * 2], fc * (1 - width / 2), fc * (1 + width / 2)) * win
        e = min(len(chunk), n - s)
        out[s:s + e] += chunk[:e]
    return out


def env_exp(dur, k, attack=0.002):
    t = T(dur)
    return np.minimum(1, t / max(attack, 1e-4)) * np.exp(-k * t)


def env_lin(dur, a, d):
    t = T(dur)
    return np.minimum(1, t / max(a, 1e-4)) * np.clip(1 - np.maximum(0, t - a) / max(d, 1e-4), 0, 1)


def tone(dur, f, k=6, amp=1.0, partials=((1, 1),), attack=0.002, vib=0):
    t = T(dur)
    x = np.zeros_like(t)
    for m, a in partials:
        ph = 2 * np.pi * f * m * t + (vib * np.sin(2 * np.pi * 5.5 * t) if vib else 0)
        x += a * np.sin(ph)
    return amp * x * env_exp(dur, k, attack)


def chirp(dur, f0, f1, amp=1.0, shape="exp", harm=1):
    t = T(dur)
    f = f0 * (f1 / f0) ** (t / dur) if shape == "exp" else f0 + (f1 - f0) * t / dur
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.zeros_like(t)
    for h in range(1, harm + 1):
        x += np.sin(ph * h) / h
    return amp * x


def bell(dur, f, k=5, amp=0.5):
    # ระฆัง/เหล็กกล้า: โอเวอร์โทนไม่ลงตัว
    return tone(dur, f, k, amp, partials=((1, 1), (2.76, 0.45), (5.4, 0.22), (8.93, 0.1)))


def clang(dur, f, k=5, amp=0.5):
    # ใบดาบเหล็กกระทบ: โหมดแผ่นโลหะ (ไม่ลงตัว · ลอยแกว่งเล็กน้อย)
    parts = ((1, 1), (1.506, 0.7), (2.33, 0.55), (3.17, 0.35), (4.41, 0.22), (5.93, 0.12))
    t = T(dur)
    x = np.zeros_like(t)
    for i, (m, a) in enumerate(parts):
        beat = 1 + 0.08 * np.sin(2 * np.pi * (3 + i * 1.7) * t)
        x += a * np.sin(2 * np.pi * f * m * t + i) * np.exp(-k * (1 + i * 0.35) * t) * beat
    return amp * x * np.minimum(1, t / 0.0015)


def thump(dur, f0=90, f1=38, k=9, amp=1.0):
    t = T(dur)
    f = f1 + (f0 - f1) * np.exp(-t * 18)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return amp * np.sin(ph) * env_exp(dur, k, 0.001)


def crash(dur, k=6, lo=300, hi=9000, amp=1.0):
    return amp * band(noise(dur), lo, hi) * env_exp(dur, k, 0.001)


def crackle(dur, rate=180, amp=0.6, lo=2500, hi=14000, k=0):
    # ประกายไฟฟ้า: แรงกระตุ้นสุ่มห่างๆ (แรงไม่เท่ากัน) กรองสูง
    n = int(SR * dur)
    x = np.zeros(n)
    m = int(rate * dur)
    idx = rng.integers(0, max(1, n - 64), m)
    for i in idx:
        L = int(rng.integers(8, 60))
        x[i:i + L] += rng.standard_normal(L) * np.exp(-np.arange(L) / (L * 0.3)) * rng.uniform(0.2, 1.0)
    x = band(x, lo, hi)
    if k:
        x *= np.exp(-k * T(dur))
    return amp * x / (np.max(np.abs(x)) + 1e-9)


def buzz(dur, f=110, amp=0.4, flicker=28, k=0):
    # กระแสไฟฟ้า: ฟันเลื่อยความถี่ต่ำ + ความดังกระพริบสุ่ม (อาร์ค)
    t = T(dur)
    ph = 2 * np.pi * f * t + 0.6 * np.sin(2 * np.pi * f * 3.01 * t)
    saw = 2 * ((ph / (2 * np.pi)) % 1) - 1
    steps = rng.uniform(0.15, 1.0, int(dur * flicker) + 2)
    gate = np.interp(t * flicker, np.arange(len(steps)), steps) ** 2
    x = band(saw * gate, 90, 7000)
    if k:
        x *= np.exp(-k * t)
    return amp * x


def zap(dur, f0=3200, f1=180, amp=0.5, k=6):
    # สายฟ้าฟาด: ความถี่ตกเร็ว + FM หยาบ
    t = T(dur)
    f = f1 + (f0 - f1) * np.exp(-t * 14)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph + 2.5 * np.sin(ph * 2.03)) * env_exp(dur, k, 0.001)
    return amp * x


def reverb(x, wet=0.25, decay=1.6, pre=0.012):
    n = int(SR * decay)
    t = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-t * 6.9 / decay)
    ir = band(ir, 200, 7000)
    ir[: int(SR * pre)] = 0
    ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
    L = len(x) + n
    y = np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(ir, L), L)[: len(x) + n]
    return np.concatenate([x, np.zeros(n)]) + wet * y


def softclip(x, drive=1.4):
    return np.tanh(x * drive) / np.tanh(drive)


def fade_tail(x, sec=0.05):
    n = min(len(x), int(SR * sec))
    x[-n:] *= np.linspace(1, 0, n)
    return x


def limit(x, ceil=0.6, look=0.004, rel=0.05):
    # จำกัดยอดแบบมองล่วงหน้า (ลดเกนก่อนยอดมาถึง · คืนเกนช้าๆ) — ไม่ตัดยอดแข็ง (ฮาร์มอนิกที่เกิดใหม่ทำให้ AAC ถอดแล้วยอดเด้งเกิน)
    w = max(3, int(SR * look) | 1)
    env = np.lib.stride_tricks.sliding_window_view(np.pad(np.abs(x), (w // 2, w // 2), mode="edge"), w).max(axis=1)
    g = np.minimum(1, ceil / (env + 1e-9))
    a = np.exp(-1 / (SR * rel))
    out = g.copy()
    for i in range(1, len(out)):
        out[i] = min(g[i], a * out[i - 1] + (1 - a) * g[i])
    out = np.convolve(np.pad(out, (w // 2, w // 2), mode="edge"), np.ones(w) / w, mode="valid")
    return x * out


def write(name, x, dur, outs):
    x = fade_tail(np.asarray(x[: int(SR * dur)], dtype=np.float64))
    x = band(x, 30, 15000, 0.05)  # ตัดเหนือ 15 kHz ก่อน (ตัวเข้ารหัส AAC ตัดอยู่แล้ว — ตัดเองก่อนจำกัดยอด ยอดจะไม่เด้งหลังถอด)
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.5
    tmp = os.path.join(tempfile.gettempdir(), f"{name}.wav")

    def save(sig):
        with wave.open(tmp, "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
            w.writeframes((np.clip(sig, -1, 1) * 32767).astype("<i2").tobytes())

    # ปรับดังถึงเป้า -16 LUFS (วัดด้วย ffmpeg loudnorm) → จำกัดยอด -4.4 dBFS (limit) → วัดซ้ำแล้วชดเชย (สูงสุด 8 รอบ)
    #  ไม่ใช้ loudnorm/alimiter ตอนเข้ารหัส: หัวเสียงกระแทกที่ต้นไฟล์หลุด limiter แล้ว AAC ถอดออกมาเกิน 0 dBFS (เบราว์เซอร์ตัดยอดแตก)
    def measure(sig):
        save(sig)
        m = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", tmp, "-af", f"loudnorm=I={TARGET}:TP=-1:LRA=11:print_format=json", "-f", "null", "-"],
                           capture_output=True, text=True).stderr
        return float(json.loads(m[m.rindex("{"): m.rindex("}") + 1])["input_i"])
    src_i = measure(x)
    gain, y, got = TARGET - src_i, x, src_i
    for _ in range(8):
        y = limit(x * 10 ** (gain / 20))
        got = measure(y)
        if abs(got - TARGET) < 0.25:
            break
        gain += TARGET - got
    first = None
    for out in outs:
        os.makedirs(out, exist_ok=True)
        dst = os.path.join(out, f"{name}.m4a")
        if first:
            shutil.copyfile(first, dst)
            continue
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-ar", "44100", "-ac", "1", "-c:a", "aac", "-b:a", "192k",
                        "-movflags", "+faststart", dst], check=True)
        first = dst
    os.remove(tmp)
    print(name, f"{len(x) / SR:.2f}s", f"src {src_i:.1f} -> {got:.1f} LUFS")


# ---------------------------------------------------------------- ตีปกติ (กระแทกที่ต้นไฟล์)
def atk_blade():
    # เบลย์ เราเซอร์: ใบดาบเหล็กกระทบ (แคลงก์) + ฟุบลมดาบผ่าน + ทุ้มกระแทก
    d = 0.75
    o = buf(d)
    put(o, crash(0.05, 70, 2500, 15000, 0.7), 0)
    put(o, clang(d, 1180, 6.5, 0.42), 0.002)
    put(o, clang(d, 1730, 8, 0.22), 0.004)
    put(o, thump(0.3, 140, 60, 14, 0.6), 0)
    sw = sweep_band(0.22, 6500, 1600, 0.7) * env_lin(0.22, 0.006, 0.21)
    put(o, sw * 0.8, 0)
    return softclip(reverb(o, 0.22, 1.0), 1.6)


def atk_punch():
    # หมัด/เตะร่างคน: ทุ้มสั้นแน่น + ผ้าสะบัด
    d = 0.45
    o = buf(d)
    put(o, thump(d, 160, 48, 11, 1.0), 0)
    put(o, crash(0.12, 34, 180, 3200, 0.85), 0)
    put(o, crash(0.03, 120, 2500, 11000, 0.45), 0)
    sw = sweep_band(0.12, 2600, 900, 0.8) * env_lin(0.12, 0.004, 0.11)
    put(o, sw * 0.35, 0.004)
    return softclip(reverb(o, 0.12, 0.6), 2.0)


def atk_blast():
    # Lightning Blast: ไรเดอร์คิกลงเป้า — บูมทุ้ม + สายฟ้าแตก + ประกายไฟลากหาง
    d = 1.3
    o = buf(d)
    put(o, thump(1.1, 120, 32, 3.6, 1.0), 0)
    put(o, crash(0.7, 6, 120, 7000, 0.85), 0)
    put(o, crash(0.06, 60, 3000, 15000, 0.6), 0)
    put(o, zap(0.5, 4200, 160, 0.45, 7), 0)
    put(o, zap(0.4, 3000, 220, 0.3, 9), 0.06)
    put(o, crackle(1.1, 150, 0.5, 2500, 14000, 3.2), 0.01)
    put(o, buzz(0.9, 96, 0.32, 30, 4), 0.02)
    return softclip(reverb(o, 0.28, 1.4), 2.0)


def atk_slash():
    # Lightning Slash: ฟันดาบสายฟ้า — แคลงก์ + สายฟ้าฟาดตามแนว + อาร์คไฟฟ้า
    d = 1.0
    o = buf(d)
    put(o, crash(0.05, 70, 2500, 15000, 0.7), 0)
    put(o, clang(0.8, 1320, 6, 0.36), 0.002)
    put(o, zap(0.55, 5200, 240, 0.5, 6), 0)
    sw = sweep_band(0.3, 8000, 1400, 0.7) * env_lin(0.3, 0.008, 0.29)
    put(o, sw * 0.6, 0)
    put(o, crackle(0.9, 200, 0.5, 3000, 15000, 3.5), 0.01)
    put(o, buzz(0.7, 120, 0.3, 34, 5), 0.01)
    put(o, thump(0.4, 120, 50, 10, 0.55), 0)
    return softclip(reverb(o, 0.24, 1.2), 1.8)


# ---------------------------------------------------------------- เหตุการณ์
def henshin():
    # แปลงร่าง: แผ่นแสง Orichalcum Element กางออก (หึ่งไฟฟ้าไต่ขึ้น) → วิ่งผ่านตัว (ชิ้ง + กระแทกเหล็ก)
    d = 1.4
    o = buf(d)
    PASS = 0.62
    t = T(PASS)
    rise = (t / PASS) ** 1.8
    put(o, buzz(PASS, 82, 0.35, 22) * rise, 0)
    put(o, chirp(PASS, 180, 720, 0.18, harm=4) * rise, 0)
    put(o, sweep_band(PASS, 900, 7000, 0.6) * rise * 0.5, 0)
    put(o, crackle(PASS, 90, 0.25, 3000, 14000) * rise, 0)
    put(o, crash(0.06, 60, 3000, 15000, 0.7), PASS)
    put(o, clang(0.8, 880, 4.5, 0.4), PASS)
    put(o, bell(0.8, 1760, 4, 0.22), PASS + 0.01)
    put(o, bell(0.8, 2637, 4.5, 0.16), PASS + 0.03)
    put(o, thump(0.6, 110, 40, 6, 0.85), PASS)
    put(o, zap(0.35, 3600, 300, 0.25, 9), PASS)
    return softclip(reverb(o, 0.3, 1.4), 1.8)


def unhenshin():
    # คลายร่าง: เกราะแตกเป็นเศษแสง (ชิ้งลง + เศษแก้วกระจาย)
    d = 0.9
    o = buf(d)
    put(o, chirp(0.6, 1400, 260, 0.2, harm=3) * env_exp(0.6, 4.5, 0.004), 0)
    for i, f in enumerate([3136, 2637, 2093, 1568, 1319]):
        put(o, bell(0.5, f, 9, 0.15), 0.02 + i * 0.05)
    put(o, crackle(0.5, 120, 0.3, 4000, 15000, 6), 0)
    put(o, sweep_band(0.4, 5000, 900, 0.7) * env_lin(0.4, 0.01, 0.39) * 0.35, 0)
    return reverb(o, 0.28, 1.0)


def rouze():
    # รูดการ์ด (Rouze): สะบัดการ์ดผ่านเครื่องอ่าน — ฟึ่บสั้นสูง + คลิกเหล็ก + บี๊บยืนยัน
    d = 0.5
    o = buf(d)
    sw = sweep_band(0.11, 2400, 9000, 0.6) * env_lin(0.11, 0.07, 0.04)
    put(o, sw * 0.9, 0)
    put(o, crash(0.02, 160, 3000, 14000, 0.6), 0.1)
    put(o, clang(0.25, 2100, 18, 0.25), 0.1)
    put(o, tone(0.18, 1568, 14, 0.18, ((1, 1), (2, 0.3)), attack=0.004), 0.13)
    put(o, tone(0.22, 2093, 12, 0.16, ((1, 1), (2, 0.3)), attack=0.004), 0.2)
    return reverb(o, 0.18, 0.7)


def metal():
    # METAL: ร่างกลายเป็นเหล็ก รับการโจมตี — ติ้งใสยาว + ทุ้มเหล็กหนา
    d = 1.1
    o = buf(d)
    put(o, crash(0.03, 120, 3000, 15000, 0.55), 0)
    put(o, bell(d, 2490, 3.2, 0.4), 0)
    put(o, bell(d, 3740, 4.2, 0.22), 0.002)
    put(o, clang(0.6, 520, 7, 0.4), 0)
    put(o, thump(0.3, 180, 80, 14, 0.5), 0)
    return reverb(o, 0.26, 1.2)


def heal():
    # ร่างคนฟื้นพลัง: ระฆังใสไล่ขึ้น (E–G#–B–E) + ประกาย
    d = 1.3
    o = buf(d)
    for i, f in enumerate([659.3, 830.6, 987.8, 1318.5]):
        put(o, tone(0.9, f, 3.5, 0.24, ((1, 1), (2, 0.25), (3, 0.08)), attack=0.012), i * 0.09)
    for i, f in enumerate([2637, 3322, 3951]):
        put(o, bell(0.6, f, 6, 0.08), 0.3 + i * 0.07)
    put(o, sweep_band(0.7, 1500, 6000, 0.5) * env_lin(0.7, 0.25, 0.45) * 0.12, 0)
    return reverb(o, 0.35, 1.3)


def sonic_dash():
    # Lightning Sonic เริ่มพุ่ง: ปะทุไฟฟ้า → ฟิ้ววว (ลมไต่ขึ้น) + หึ่งไฟฟ้าลากหาง
    d = 0.9
    o = buf(d)
    put(o, zap(0.25, 2800, 420, 0.35, 12), 0)
    put(o, crash(0.04, 90, 2500, 14000, 0.5), 0)
    sw = sweep_band(0.7, 700, 6500, 0.7) * env_lin(0.7, 0.08, 0.62)
    put(o, sw * 0.95, 0.02)
    put(o, buzz(0.75, 140, 0.32, 40, 2.5), 0.02)
    put(o, crackle(0.8, 220, 0.4, 3000, 15000, 3), 0.02)
    return softclip(reverb(o, 0.2, 0.9), 1.5)


def sonic_hit():
    # Lightning Sonic ชน: ระเบิดใหญ่ + สายฟ้าแตกหลายสาย + ดาบแคลงก์ทับ
    d = 1.5
    o = buf(d)
    put(o, thump(1.3, 110, 28, 2.8, 1.0), 0)
    put(o, crash(0.9, 4.5, 100, 8000, 0.9), 0)
    put(o, crash(0.07, 50, 3000, 15000, 0.65), 0)
    put(o, clang(0.9, 1050, 4.5, 0.32), 0.003)
    for i, (f0, f1) in enumerate([(5200, 200), (3800, 260), (4600, 150)]):
        put(o, zap(0.5, f0, f1, 0.32, 7), i * 0.07)
    put(o, crackle(1.3, 180, 0.55, 2500, 15000, 2.4), 0.01)
    put(o, buzz(1.1, 88, 0.35, 32, 3), 0.02)
    return softclip(reverb(o, 0.32, 1.6), 2.1)


def crash_sfx():
    # ชนสิ่งกีดขวาง: ทุ้มหนักทึบ + เศษหินร่วง
    d = 0.8
    o = buf(d)
    put(o, thump(0.6, 95, 34, 7, 1.0), 0)
    put(o, crash(0.3, 14, 150, 4500, 0.85), 0)
    for i in range(10):
        at = 0.03 + rng.uniform(0, 0.45)
        put(o, crash(0.04, 80, 800, 6000, rng.uniform(0.1, 0.3)), at)
    return softclip(reverb(o, 0.18, 0.8), 1.8)


def magnet():
    # MAGNET ดึงเป้า: ฮัมแม่เหล็กโยกเฟส ไต่ขึ้น → ตึ้บเมื่อมาถึง
    d = 0.85
    o = buf(d)
    L = 0.6
    t = T(L)
    wob = 0.5 + 0.5 * np.sin(2 * np.pi * (6 + 10 * t / L) * t)
    hum = chirp(L, 70, 220, 0.4, harm=5) * wob * np.minimum(1, t / 0.08)
    put(o, band(hum, 60, 4000), 0)
    put(o, sweep_band(L, 3000, 600, 0.6) * env_lin(L, 0.45, 0.15) * 0.35, 0)
    put(o, thump(0.3, 150, 60, 12, 0.7), L - 0.02)
    put(o, clang(0.3, 760, 12, 0.18), L - 0.02)
    return reverb(o, 0.18, 0.8)


SOUNDS = {
    "kazuma_atk_blade": (atk_blade, 0.8), "kazuma_atk_punch": (atk_punch, 0.5), "kazuma_atk_blast": (atk_blast, 1.4),
    "kazuma_atk_slash": (atk_slash, 1.1),
    "kazuma_henshin_fx": (henshin, 1.5), "kazuma_unhenshin": (unhenshin, 0.9), "kazuma_rouze": (rouze, 0.55),
    "kazuma_metal": (metal, 1.2), "kazuma_heal": (heal, 1.4), "kazuma_sonic_dash": (sonic_dash, 0.95),
    "kazuma_sonic_hit": (sonic_hit, 1.5), "kazuma_crash": (crash_sfx, 0.8), "kazuma_magnet": (magnet, 0.9),
}
if __name__ == "__main__":
    args = sys.argv[1:]
    only = set()
    if "--only" in args:
        i = args.index("--only")
        only = set(args[i + 1].split(","))
        args = args[:i] + args[i + 2:]
    outs = args or ["client/public/characters/kensaki_kazuma/sfx"]
    for name, (fn, dur) in SOUNDS.items():
        if only and name not in only:
            continue
        write(name, fn(), dur, outs)
