# สังเคราะห์เสียงเอฟเฟกต์ของทราฟัลการ์ ลอว์ (trafalgar_law) — numpy ล้วน ไม่มีไฟล์ต้นฉบับ/ไม่ดาวน์โหลด (ไม่มีปัญหาลิขสิทธิ์)
#  python -I .claude/plans/law-sfx.py <โฟลเดอร์ปลายทาง> [...] [--only law_atk,law_cut]
#   (ปกติ client/public/characters/trafalgar_law/sfx — โฟลเดอร์นี้ gitignore · ห้ามลบไฟล์เดิม law_room_open / law_room_close)
#  ไม่ได้ทำที่นี่: law_room_open/close (มีอยู่แล้ว), Gamma Knife / Mess / Counter Shock (คลิปวิดีโอมีเสียงในตัว), เสียงพากย์ voice/law_v_*
#  แต่ละไฟล์: wav mono 44.1k → วัด ffmpeg loudnorm + จำกัดยอดเอง (lookahead) จนได้ -16 LUFS (law_mark -24 ตั้งใจให้เบา) → AAC .m4a 192k
#  จุดกระแทก: law_atk อยู่ที่ 100 ms (ดาบฟันตรงเป้าหลังจังหวะเงื้อ) · ไฟล์อื่นหัวเสียงอยู่ 0–10 ms แรก
#  (law_shamble ตั้งใจเข้านุ่ม ~25 ms · law_throw เป็นลมไต่ขึ้น ยอดอยู่ราว 350–500 ms)
import json, os, shutil, subprocess, sys, tempfile, wave
import numpy as np

SR = 44100
TARGET = -16.0
rng = np.random.default_rng(1997)  # ปีที่ One Piece เริ่มลงตีพิมพ์


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
    # เหล็กกล้า/ระฆัง: โอเวอร์โทนไม่ลงตัว
    return tone(dur, f, k, amp, partials=((1, 1), (2.76, 0.45), (5.4, 0.22), (8.93, 0.1)))


def blade_ring(dur, f, k=6, amp=0.5):
    # ใบดาบยาว (โนดาจิ) สั่นหลังฟัน: โหมดแท่งเหล็กบาง ไม่ลงตัว + บีตเบาๆ = "ชิ้งงง"
    parts = ((1, 1), (2.11, 0.55), (3.48, 0.35), (5.17, 0.2), (7.03, 0.1))
    t = T(dur)
    x = np.zeros_like(t)
    for i, (m, a) in enumerate(parts):
        beat = 1 + 0.12 * np.sin(2 * np.pi * (4 + i * 2.3) * t)
        x += a * np.sin(2 * np.pi * f * m * t + i * 0.7) * np.exp(-k * (1 + i * 0.5) * t) * beat
    return amp * x * np.minimum(1, t / 0.0008)


def thump(dur, f0=90, f1=38, k=9, amp=1.0):
    t = T(dur)
    f = f1 + (f0 - f1) * np.exp(-t * 18)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return amp * np.sin(ph) * env_exp(dur, k, 0.001)


def crash(dur, k=6, lo=300, hi=9000, amp=1.0):
    return amp * band(noise(dur), lo, hi) * env_exp(dur, k, 0.001)


def rumble(dur, lo=35, hi=260, amp=1.0, wobble=7):
    # หินครืน: noise ทุ้ม + ความดังโยกสุ่ม
    t = T(dur)
    steps = rng.uniform(0.4, 1.0, int(dur * wobble) + 2)
    g = np.interp(t * wobble, np.arange(len(steps)), steps)
    return amp * band(noise(dur), lo, hi, 0.3) * g


def grind(dur, lo=250, hi=2400, amp=1.0, rate=60):
    # หินครูดหิน: noise กลางๆ ตัดเป็นเม็ดถี่ไม่สม่ำเสมอ
    t = T(dur)
    steps = rng.uniform(0.0, 1.0, int(dur * rate) + 2) ** 2
    g = np.interp(t * rate, np.arange(len(steps)), steps)
    return amp * band(noise(dur), lo, hi, 0.25) * g


def debris(o, start, span, count, amp=(0.1, 0.3), lo=700, hi=7000, k=70):
    # เศษหินกระเด็น/ร่วง: เคาะสั้นสุ่มกระจาย (เบาลงเรื่อยๆ)
    for _ in range(count):
        u = rng.uniform(0, 1) ** 1.3
        at = start + u * span
        a = rng.uniform(*amp) * (1 - 0.6 * u)
        put(o, crash(rng.uniform(0.02, 0.05), k * rng.uniform(0.7, 1.4), lo * rng.uniform(0.7, 1.3), hi, a), at)
        if rng.uniform() < 0.4:
            put(o, tone(0.05, rng.uniform(900, 2200), 70, a * 0.4), at)


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
    # จำกัดยอดแบบมองล่วงหน้า (ลดเกนก่อนยอดมาถึง · คืนเกนช้าๆ) — ไม่ตัดยอดแข็ง
    w = max(3, int(SR * look) | 1)
    env = np.lib.stride_tricks.sliding_window_view(np.pad(np.abs(x), (w // 2, w // 2), mode="edge"), w).max(axis=1)
    g = np.minimum(1, ceil / (env + 1e-9))
    a = np.exp(-1 / (SR * rel))
    out = g.copy()
    for i in range(1, len(out)):
        out[i] = min(g[i], a * out[i - 1] + (1 - a) * g[i])
    out = np.convolve(np.pad(out, (w // 2, w // 2), mode="edge"), np.ones(w) / w, mode="valid")
    return x * out


def write(name, x, dur, outs, target=TARGET):
    x = fade_tail(np.asarray(x[: int(SR * dur)], dtype=np.float64))
    x = band(x, 30, 15000, 0.05)
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.5
    tmp = os.path.join(tempfile.gettempdir(), f"{name}.wav")

    def save(sig):
        with wave.open(tmp, "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
            w.writeframes((np.clip(sig, -1, 1) * 32767).astype("<i2").tobytes())

    def measure(sig):
        # loudnorm วัด integrated ด้วยบล็อก 400 ms — ไฟล์สั้นกว่านั้นได้ -inf → เติมความเงียบให้ยาวพอเฉพาะตอนวัด
        save(np.concatenate([sig, np.zeros(max(0, int(SR * 0.6) - len(sig)))]))
        m = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", tmp, "-af", f"loudnorm=I={target}:TP=-1:LRA=11:print_format=json", "-f", "null", "-"],
                           capture_output=True, text=True).stderr
        return float(json.loads(m[m.rindex("{"): m.rindex("}") + 1])["input_i"])
    src_i = measure(x)
    gain, y, got = target - src_i, x, src_i
    for _ in range(8):
        y = limit(x * 10 ** (gain / 20))
        got = measure(y)
        if abs(got - target) < 0.25:
            break
        gain += target - got
    save(y)
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


# ---------------------------------------------------------------- เสียง
def atk():
    # ตีปกติ: คิโคคุฟันจากระยะไกล (Amputate) — ฟึ่บเงื้อสั้น 100 ms → ตัด "ชิ้ง" คม + ใบดาบสั่นใส + ลมดาบกวาดลง
    d = 0.7
    o = buf(d)
    HIT = 0.1
    pre = sweep_band(HIT, 1800, 6500, 0.6) * (T(HIT) / HIT) ** 2.2
    put(o, pre * 0.45, 0)
    put(o, crash(0.025, 140, 4000, 15000, 0.85), HIT)
    put(o, blade_ring(0.6, 2350, 6.5, 0.42), HIT)
    put(o, bell(0.45, 4480, 9, 0.16), HIT + 0.002)
    sw = sweep_band(0.2, 9000, 2400, 0.55) * env_lin(0.2, 0.003, 0.197)
    put(o, sw * 0.75, HIT)
    put(o, thump(0.18, 210, 90, 22, 0.35), HIT)
    return softclip(reverb(o, 0.22, 1.0), 1.5)


def cut():
    # ตัดพื้น: ฟันชิ้งสั้น → ก้อนหินถูกตัดหลุด (ครืนเบาๆ + หินครูด) → ลอยขึ้น (ฮัมทุ้มไต่ขึ้น)
    d = 0.75
    o = buf(d)
    put(o, crash(0.02, 160, 4000, 15000, 0.7), 0)
    put(o, blade_ring(0.35, 2600, 11, 0.3), 0)
    sw = sweep_band(0.14, 8000, 2600, 0.55) * env_lin(0.14, 0.003, 0.137)
    put(o, sw * 0.6, 0)
    put(o, thump(0.25, 120, 55, 11, 0.55), 0.04)
    gr = grind(0.32, 250, 2200, 0.32, 70) * env_lin(0.32, 0.04, 0.28)
    put(o, gr, 0.06)
    put(o, rumble(0.6, 35, 220, 0.75) * env_lin(0.6, 0.08, 0.52), 0.05)
    lift = chirp(0.55, 70, 150, 0.3, harm=3) * env_lin(0.55, 0.2, 0.35)
    put(o, lift, 0.15)
    put(o, sweep_band(0.5, 400, 1600, 0.5) * env_lin(0.5, 0.25, 0.25) * 0.18, 0.2)
    debris(o, 0.07, 0.4, 6, (0.05, 0.14), 900, 6000)
    return softclip(reverb(o, 0.2, 0.9), 1.5)


def shuffle():
    # แชมเบิลส์สลับตำแหน่ง: "ซวิ๊บ" ขึ้นเร็ว + บลิปใส 2 โน้ต (ของสองชิ้นสลับกัน) + ลมฟุบบางๆ
    d = 0.5
    o = buf(d)
    z = chirp(0.07, 500, 3200, 0.38, harm=2) * env_lin(0.07, 0.004, 0.066)
    put(o, z, 0)
    put(o, crash(0.015, 200, 3000, 12000, 0.35), 0)
    put(o, tone(0.3, 1760, 13, 0.3, ((1, 1), (2, 0.25), (3, 0.08)), attack=0.002), 0.055)
    z2 = chirp(0.06, 3000, 900, 0.22, harm=2) * env_lin(0.06, 0.003, 0.057)
    put(o, z2, 0.1)
    put(o, tone(0.32, 2637, 12, 0.22, ((1, 1), (2, 0.2)), attack=0.002), 0.115)
    sw = sweep_band(0.3, 1200, 5500, 0.6) * env_lin(0.3, 0.03, 0.27)
    put(o, sw * 0.28, 0)
    return reverb(o, 0.26, 0.8)


def takt():
    # ทัคท์: แท่งหินพุ่งจากพื้น — แตกเปรี๊ยะ + ตูมทุ้ม + ครืนดันขึ้น + เศษหินกระเด็น
    d = 0.65
    o = buf(d)
    put(o, crash(0.04, 90, 1800, 12000, 0.9), 0)
    put(o, crash(0.03, 120, 3500, 15000, 0.5), 0.012)
    put(o, thump(0.4, 150, 52, 9, 1.0), 0)
    put(o, crash(0.25, 14, 150, 3000, 0.7), 0.005)
    put(o, grind(0.3, 300, 2600, 0.45, 90) * env_lin(0.3, 0.01, 0.29), 0.02)
    put(o, rumble(0.55, 30, 200, 0.8) * env_exp(0.55, 4.5, 0.01), 0)
    put(o, sweep_band(0.22, 500, 2200, 0.6) * env_lin(0.22, 0.02, 0.2) * 0.3, 0.01)
    debris(o, 0.04, 0.45, 14, (0.12, 0.35), 700, 7000)
    return softclip(reverb(o, 0.18, 0.9), 1.9)


def throw():
    # ปล่อยก้อนหินลอย: ฮัมทุ้มไต่ขึ้น + ลมพุ่งหลายสายเหลื่อมกัน (หลายก้อน) ไต่สูง
    d = 0.85
    o = buf(d)
    put(o, thump(0.2, 110, 60, 14, 0.35), 0)
    for i, (at, f0, f1, a) in enumerate([(0.0, 300, 2600, 0.8), (0.07, 380, 3200, 0.6), (0.15, 450, 3800, 0.5)]):
        L = 0.62
        sw = sweep_band(L, f0, f1, 0.7) * env_lin(L, 0.38, 0.24)
        put(o, sw * a, at)
    put(o, chirp(0.7, 55, 170, 0.32, harm=3) * env_lin(0.7, 0.35, 0.35), 0)
    put(o, grind(0.25, 300, 1800, 0.18, 50) * env_lin(0.25, 0.02, 0.23), 0)
    return softclip(reverb(o, 0.2, 0.9), 1.4)


def throw_hit():
    # ก้อนหินชนเป้า: ตูมหนักหลายก้อนเหลื่อมกัน + หินแตกกลาง + เศษกระจาย
    d = 0.5
    o = buf(d)
    for at, a, f0 in [(0.0, 1.0, 130), (0.035, 0.75, 115), (0.075, 0.6, 145)]:
        put(o, thump(0.3, f0, 56, 12, a), at)
        put(o, crash(0.14, 26, 250, 5000, a * 0.75), at)
        put(o, crash(0.025, 130, 2500, 12000, a * 0.4), at)
    put(o, rumble(0.4, 35, 250, 0.5) * env_exp(0.4, 7, 0.005), 0)
    debris(o, 0.02, 0.4, 16, (0.1, 0.3), 700, 7000)
    return softclip(reverb(o, 0.16, 0.8), 2.0)


def shamble():
    # สลับ HP: สองโทนเลื่อนสวนกัน (ขึ้น/ลง) ไขว้ตรงกลาง + ประกายวนเบาๆ — เข้านุ่ม ~25 ms
    d = 1.15
    o = buf(d)
    L = 1.0
    t = T(L)
    env = np.minimum(1, t / 0.025) * np.clip(1 - np.maximum(0, t - 0.6) / 0.4, 0, 1)
    for f0, f1, a in [(330, 880, 0.3), (880, 330, 0.3)]:
        f = f0 * (f1 / f0) ** (0.5 - 0.5 * np.cos(np.pi * t / L))
        f = f * (1 + 0.012 * np.sin(2 * np.pi * 6 * t))
        ph = 2 * np.pi * np.cumsum(f) / SR
        x = np.sin(ph) + 0.3 * np.sin(2 * ph) + 0.1 * np.sin(3 * ph)
        put(o, a * x * env, 0)
    swirl = sweep_band(L, 2200, 5200, 0.4) * env * (0.5 + 0.5 * np.sin(2 * np.pi * 7 * t))
    put(o, swirl * 0.12, 0)
    for i, f in enumerate([2637, 3136, 3951, 3136]):
        put(o, bell(0.4, f, 9, 0.05), 0.12 + i * 0.17)
    return reverb(o, 0.4, 1.4)


def squeeze():
    # บีบหัวใจในกล่อง: ตุบ-ตับ อู้อี้ (ลับ-ดับ) + เสียงบีบเปียก + ชีพจรปวดสั่นลากหาง
    d = 0.62
    o = buf(d)
    put(o, thump(0.3, 110, 58, 13, 1.0), 0)
    put(o, tone(0.12, 150, 30, 0.35, ((1, 1), (2, 0.3))), 0)
    put(o, crash(0.06, 40, 80, 600, 0.45), 0)
    put(o, thump(0.25, 95, 52, 15, 0.7), 0.16)
    put(o, tone(0.1, 135, 34, 0.25, ((1, 1), (2, 0.3))), 0.16)
    t = T(0.38)
    gurgle = band(noise(0.38), 250, 1400, 0.3) * (0.5 + 0.5 * np.sin(2 * np.pi * (18 + 30 * t) * t)) ** 3
    put(o, gurgle * env_lin(0.38, 0.06, 0.32) * 0.5, 0.03)
    sq = chirp(0.3, 420, 180, 0.18, harm=4) * env_lin(0.3, 0.05, 0.25)
    put(o, band(sq, 100, 1500), 0.05)
    tp = T(0.45)
    pulse = np.sin(2 * np.pi * 62 * tp + 0.8 * np.sin(2 * np.pi * 124 * tp)) * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * tp)) ** 2
    put(o, pulse * env_lin(0.45, 0.08, 0.37) * 0.4, 0.15)
    return band(softclip(reverb(o, 0.12, 0.6), 1.7), 30, 2500, 0.2)


def mark():
    # ติดเครื่องหมาย: เส้นตัดบางๆ วิบ — ชิ้งเล็กสูง + ลมแหลมบาง (เบา)
    d = 0.32
    o = buf(d)
    put(o, crash(0.01, 300, 6000, 15000, 0.3), 0)
    put(o, blade_ring(0.28, 4200, 14, 0.25), 0)
    sw = sweep_band(0.12, 10000, 5000, 0.4) * env_lin(0.12, 0.004, 0.116)
    put(o, sw * 0.3, 0)
    return reverb(o, 0.3, 0.6)


def rock_down():
    # แท่งหินถล่ม: ครืนแตกร่วง (ไม่มีตูมกระแทกแรง) + เศษหินร่วงถี่ + ฝุ่นซ่า
    d = 0.52
    o = buf(d)
    put(o, crash(0.03, 110, 1500, 9000, 0.6), 0)
    put(o, thump(0.25, 110, 52, 13, 0.55), 0.01)
    put(o, rumble(0.5, 30, 300, 0.75) * env_lin(0.5, 0.02, 0.48), 0)
    put(o, grind(0.4, 300, 2600, 0.35, 80) * env_lin(0.4, 0.01, 0.39), 0.01)
    put(o, crash(0.45, 6, 2500, 9000, 0.12), 0.03)
    debris(o, 0.02, 0.42, 22, (0.1, 0.3), 600, 6500)
    return softclip(reverb(o, 0.16, 0.8), 1.7)


SOUNDS = {
    "law_atk": (atk, 0.7), "law_cut": (cut, 0.75), "law_shuffle": (shuffle, 0.5), "law_takt": (takt, 0.65),
    "law_throw": (throw, 0.85), "law_throw_hit": (throw_hit, 0.5), "law_shamble": (shamble, 1.15),
    "law_squeeze": (squeeze, 0.62), "law_mark": (mark, 0.32), "law_rock_down": (rock_down, 0.52),
}
LOUD = {"law_mark": -24.0}  # เครื่องหมายเบาๆ ตามสั่ง
if __name__ == "__main__":
    args = sys.argv[1:]
    only = set()
    if "--only" in args:
        i = args.index("--only")
        only = set(args[i + 1].split(","))
        args = args[:i] + args[i + 2:]
    outs = args or ["client/public/characters/trafalgar_law/sfx"]
    for name, (fn, dur) in SOUNDS.items():
        if only and name not in only:
            continue
        write(name, fn(), dur, outs, LOUD.get(name, TARGET))
