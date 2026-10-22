# สังเคราะห์เสียงเอฟเฟกต์ของผู้นำแห่งตระกูลเรียวกิ (contract §4) — numpy ล้วน ไม่ดาวน์โหลด
#  python -I .claude/plans/ryougi-sfx.py <โฟลเดอร์ปลายทาง>   (ปกติ client/public/characters/ryougi/sfx — worktree ใช้ C:/Echo/client/public/characters/ryougi/sfx)
#  แต่ละไฟล์: สร้าง wav (mono 44.1k) → ffmpeg loudnorm 2 รอบ (-16 LUFS, TP -1) → mp3
#   -16 LUFS = เบากว่าเสียงพากย์ (~-10.5 LUFS) ชัดเจน — ผู้ใช้สั่ง "อย่าให้เสียงพากย์จม"
#  ตีปกติ ryougi_slash / ryougi_leap = ไฟล์จริงที่ผู้ใช้อนุมัติ (Mixkit ฟรี — .claude/plans/ryougi-sfx-src/) ตัดช่วงเงียบหัวไฟล์ด้วย RMS
#   ให้จุดปะทะแรกอยู่ต้นไฟล์ (BoardStage เล่นตรงจังหวะปะทะ) แล้วปรับดังแบบเดียวกัน
#   ⚠️ ชื่อไฟล์ต้นฉบับสลับกับเนื้อเสียง: slash_quick_saber_cut_2158.mp3 = ฟันรัว 2.05 วิ ("Sword slashes in battle")
#      · leap_sword_slashes_in_battle_2763.mp3 = ฟันเดียว 1.16 วิ ("Quick saber cut") — จับคู่ตามเนื้อเสียง
#  เหตุการณ์: จังหวะในไฟล์ตรงกับฉากใน client/src/board/ryougiFx.js (RYOUGI_FX)
#  ตัวช่วยสังเคราะห์ (T … fade_tail) ยกมาจาก .claude/plans/takuto-sfx.py
import json, os, subprocess, sys, tempfile, wave
import numpy as np

LUFS = -16.0
SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ryougi-sfx-src")

SR = 44100
OUT = sys.argv[1] if len(sys.argv) > 1 else "client/public/characters/ryougi/sfx"
rng = np.random.default_rng(1722)


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
    # เสียงลมพัด: noise กรองแบนด์ที่ไล่ความถี่ (ทำเป็นท่อนสั้นๆ ซ้อนกัน)
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
    # ขึ้น a วินาที → ลงเส้นตรงถึงจบ
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
    if shape == "exp":
        f = f0 * (f1 / f0) ** (t / dur)
    else:
        f = f0 + (f1 - f0) * t / dur
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.zeros_like(t)
    for h in range(1, harm + 1):
        x += np.sin(ph * h) / h
    return amp * x


def bell(dur, f, k=5, amp=0.5):
    # ระฆัง/คริสตัล: โอเวอร์โทนไม่ลงตัว
    return tone(dur, f, k, amp, partials=((1, 1), (2.76, 0.45), (5.4, 0.22), (8.93, 0.1)))


def thump(dur, f0=90, f1=38, k=9, amp=1.0):
    t = T(dur)
    f = f1 + (f0 - f1) * np.exp(-t * 18)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return amp * np.sin(ph) * env_exp(dur, k, 0.001)


def crash(dur, k=6, lo=300, hi=9000, amp=1.0):
    return amp * band(noise(dur), lo, hi) * env_exp(dur, k, 0.001)


def reverb(x, wet=0.25, decay=1.6, pre=0.012):
    n = int(SR * decay)
    t = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-t * 6.9 / decay)
    ir = band(ir, 200, 7000)
    ir[: int(SR * pre)] = 0
    ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
    L = len(x) + n
    y = np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(ir, L), L)[: len(x) + n]
    out = np.concatenate([x, np.zeros(n)]) + wet * y
    return out


def softclip(x, drive=1.4):
    return np.tanh(x * drive) / np.tanh(drive)


def fade_tail(x, sec=0.05):
    n = min(len(x), int(SR * sec))
    x[-n:] *= np.linspace(1, 0, n)
    return x




def write_wav(path, x):
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype("<i2").tobytes())


def measure(path):
    m = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", f"loudnorm=I={LUFS}:TP=-1:LRA=11:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    return json.loads(m[m.rindex("{"): m.rindex("}") + 1])


def encode(name, tmp):
    # loudnorm 2 รอบ (ค่าที่วัดได้ → linear) · ยอดแหลมเกินเพดาน = จำกัดยอดก่อน (alimiter) ไม่งั้น linear ติด TP แล้วเบากว่าเป้า
    j = measure(tmp)
    gain = LUFS - float(j["input_i"])
    if float(j["input_tp"]) + gain > -1.2:
        lim = tmp.replace(".wav", "_lim.wav")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-af", f"volume={gain + 0.6:.2f}dB,alimiter=limit=0.8:attack=0.5:release=30:level=false",
                        "-c:a", "pcm_s16le", lim], check=True)
        os.replace(lim, tmp)
        j = measure(tmp)
    af = (f"loudnorm=I={LUFS}:TP=-1:LRA=11:linear=true:"
          f"measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}")
    os.makedirs(OUT, exist_ok=True)
    dst = os.path.join(OUT, f"{name}.mp3")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-af", af, "-ar", "44100", "-ac", "1", "-c:a", "libmp3lame", "-q:a", "2", dst], check=True)
    os.remove(tmp)
    out = measure(dst)
    print(name, f"in {j['input_i']} -> out {out['input_i']} LUFS · TP {out['input_tp']}")


def write(name, x, dur=None):
    if dur is not None:
        x = x[: int(SR * dur)]
    x = fade_tail(np.asarray(x, dtype=np.float64))
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.89
    tmp = os.path.join(tempfile.gettempdir(), f"{name}.wav")
    write_wav(tmp, x)
    encode(name, tmp)


def from_file(name, src, pre=0.004):
    # ไฟล์จริง: ถอดเป็น mono → หาเฟรม 5 ms แรกที่ดังเกิน (ยอด − 30 dB) → ตัดหัวเหลือ pre วินาทีก่อนจุดนั้น · ตัดหางที่เงียบสนิท
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    w = int(SR * 0.005)
    n = len(x) // w
    rms = np.sqrt((x[: n * w].reshape(n, w) ** 2).mean(1))
    db = 20 * np.log10(rms + 1e-12)
    first = int(np.argmax(db > db.max() - 30))
    cut = max(0, first * w - int(SR * pre))
    x = x[cut:]
    loud = np.where(20 * np.log10(np.abs(x) + 1e-12) > -70)[0]
    if len(loud):
        x = x[: min(len(x), loud[-1] + int(SR * 0.02))]
    x = fade_tail(x.copy(), 0.03)
    tmp = os.path.join(tempfile.gettempdir(), f"{name}.wav")
    write_wav(tmp, x)
    print(name, f"cut head {cut / SR * 1000:.0f} ms · {len(x) / SR:.2f}s")
    encode(name, tmp)


def crackle(dur, rate=90, lo=1500, hi=9000, amp=1.0, grow=1.0):
    # เสียงร้าวแตกเป็นเม็ด (คลิกสั้นๆ สุ่ม ถี่ขึ้นตาม grow)
    o = buf(dur)
    t = 0.0
    while t < dur:
        u = t / dur
        g = (0.3 + 0.7 * u ** 0.5) if grow else 1
        put(o, band(noise(0.012), lo, hi) * env_exp(0.012, 380, 0.0005) * amp * (0.4 + 0.6 * rng.random()) * g, t)
        t += rng.exponential(1 / (rate * (0.4 + grow * u) if grow else rate))
    return o


def heartbeat(amp=1.0):
    o = buf(0.5)
    put(o, thump(0.3, 70, 38, 14, amp), 0)
    put(o, thump(0.3, 64, 34, 16, amp * 0.7), 0.17)
    return o


# ---------------------------------------------------------------- เหตุการณ์ (จังหวะตรง RYOUGI_FX)
def eyes_open():
    # 0 จอมืด (ลมดูดลง) · 0.38 ตาวาบ (ประกายคริสตัล) · 0.62 รอยร้าวแผ่ (เสียงแตกถี่ขึ้น + เสียงต่ำครืน) · 1.45 จุดตายเต้น (หัวใจทุก 0.76 วิ)
    d = 2.7
    o = buf(d)
    put(o, sweep_band(0.4, 3500, 300, 0.8) * env_lin(0.4, 0.03, 0.37) * 0.55, 0)
    put(o, thump(0.8, 60, 30, 3, 0.6), 0.02)
    for i, f in enumerate([2093, 2637, 3136, 4186]):
        put(o, bell(1.0, f, 4.5, 0.17), 0.36 + i * 0.025)
    put(o, chirp(0.5, 5200, 9000, 0.05) * env_lin(0.5, 0.02, 0.48), 0.36)
    put(o, crackle(1.4, 70, 1200, 8000, 0.6), 0.62)
    t = T(1.6)
    put(o, band(noise(1.6), 40, 260) * np.minimum(1, t / 0.25) * np.clip(1 - np.maximum(0, t - 1.0) / 0.6, 0, 1) * 0.55, 0.6)
    put(o, crash(0.4, 9, 300, 5000, 0.4), 0.62)
    for k in range(2):
        put(o, heartbeat(), 1.45 + k * 0.76)
    return softclip(reverb(o, 0.3, 1.6), 1.5)


def yinyang():
    # หมุนใต้เท้า (ลมวน) → 0.9 แตกเป็นแสงเขียว (ระฆังอุ่น + ประกายลอยขึ้น)
    d = 1.9
    o = buf(d)
    t = T(0.9)
    put(o, sweep_band(0.9, 500, 1600, 0.5) * (0.5 + 0.5 * np.sin(2 * np.pi * 6 * t)) * env_lin(0.9, 0.2, 0.7) * 0.4, 0)
    for f, a in [(523.3, 0.3), (659.3, 0.25), (784, 0.22), (1046.5, 0.16)]:
        put(o, bell(1.0, f, 3.2, a), 0.9)
    for i in range(7):
        put(o, bell(0.4, 1568 + 260 * i, 9, 0.06), 1.0 + i * 0.09)
    put(o, crash(0.3, 12, 2000, 9000, 0.25), 0.9)
    return reverb(o, 0.35, 1.6)


def mind():
    # ใบมีดปรากฏ (ชักมีด "ชิ้ง") + เส้นขาววนรอบตัว
    d = 1.4
    o = buf(d)
    put(o, sweep_band(0.12, 3000, 9000, 0.5) * env_lin(0.12, 0.08, 0.04) * 0.6, 0)
    put(o, tone(1.2, 3520, 4.5, 0.32, ((1, 1), (1.503, 0.4), (2.71, 0.22)), 0.002), 0.1)
    put(o, tone(1.2, 5274, 6, 0.16, ((1, 1), (2.01, 0.3))), 0.105)
    t = T(1.1)
    put(o, sweep_band(1.1, 1200, 2600, 0.6) * (0.5 + 0.5 * np.sin(2 * np.pi * 3.5 * t)) * env_lin(1.1, 0.3, 0.8) * 0.25, 0.2)
    return reverb(o, 0.3, 1.3)


def sever():
    # ตัดผลสกิล: เส้นขาวผ่า (0.16) → แก้วแสงแตก
    d = 1.0
    o = buf(d)
    put(o, sweep_band(0.16, 2000, 9000, 0.6) * env_lin(0.16, 0.14, 0.02) * 0.4, 0)
    put(o, crash(0.06, 50, 3000, 14000, 0.7), 0.16)
    put(o, tone(0.6, 2960, 7, 0.25, ((1, 1), (2.76, 0.4))), 0.165)
    for i, f in enumerate([3951, 4699, 5588, 6645, 3520]):
        put(o, bell(0.5, f, 10, 0.12), 0.18 + i * 0.03)
    return reverb(o, 0.3, 1.0)


def dash():
    # ชาร์จ 0–0.25 → พุ่ง 0.25–0.52 → ถึง (ลมกระแทก) → เส้นตัดฮัม + รอยร้าวแตกถึง 1.2
    d = 1.3
    o = buf(d)
    put(o, sweep_band(0.25, 600, 3500, 0.5) * env_lin(0.25, 0.22, 0.03) * 0.4, 0)
    put(o, sweep_band(0.3, 7000, 900, 0.8) * env_lin(0.3, 0.03, 0.27) * 0.9, 0.24)
    put(o, thump(0.5, 110, 40, 7, 0.75), 0.52)
    put(o, crash(0.3, 12, 500, 9000, 0.5), 0.52)
    t = T(0.7)
    put(o, tone(0.7, 1760, 0.3, 0.08, ((1, 1), (2, 0.3))) * (0.6 + 0.4 * np.sin(2 * np.pi * 30 * t)) * env_lin(0.7, 0.1, 0.6), 0.55)
    put(o, crackle(0.65, 60, 1500, 7000, 0.35), 0.55)
    return softclip(reverb(o, 0.25, 1.2), 1.5)


def crumble():
    # เส้นตัดวาบ (0.06) → พื้นแตกไล่ทีละช่อง (ทุก 35 ms × 8) → ก้อนร่วง + เสียงครืนต่ำ
    d = 1.6
    o = buf(d)
    put(o, crash(0.05, 50, 3500, 14000, 0.5), 0.06)
    for i in range(8):
        at = 0.06 + i * 0.035
        put(o, crash(0.18, 18, 200, 5000, 0.55), at)
        put(o, thump(0.3, 95 - i * 3, 40, 10, 0.5), at)
    t = T(1.4)
    put(o, band(noise(1.4), 30, 220) * np.minimum(1, t / 0.08) * np.exp(-t * 2.2) * 0.9, 0.08)
    for i in range(14):
        put(o, crash(0.06, 40, 800, 6000, 0.12 + 0.1 * rng.random()), 0.3 + rng.random() * 0.9)
    return softclip(reverb(o, 0.3, 1.4), 1.8)


def kill():
    # เส้นแห่งความตายขึ้น (เสียงร้าวไฟฟ้า 0–0.3) → เส้นตัดขาว 0.38 → ร่างแยก (ฉีกเบา) → ยุบลงพื้น 0.95
    d = 1.6
    o = buf(d)
    put(o, crackle(0.34, 140, 2000, 9000, 0.35), 0.0)
    t = T(0.38)
    put(o, tone(0.38, 92, 0.2, 0.3, ((1, 1), (2, 0.5), (3, 0.25))) * (t / 0.38), 0)
    put(o, sweep_band(0.07, 4000, 11000, 0.5) * env_lin(0.07, 0.06, 0.01) * 0.5, 0.31)
    put(o, crash(0.05, 60, 4000, 15000, 0.9), 0.38)
    put(o, tone(0.9, 2489, 5, 0.3, ((1, 1), (2.01, 0.25), (3.98, 0.1))), 0.383)
    put(o, band(noise(0.5), 300, 2500) * env_lin(0.5, 0.05, 0.45) * 0.18, 0.45)
    put(o, thump(0.4, 80, 40, 9, 0.45), 0.95)
    put(o, band(noise(0.3), 150, 900) * env_exp(0.3, 14) * 0.3, 0.95)
    return reverb(o, 0.25, 1.2)


def bloom():
    # ซากุระระเบิดออก: ลมพุ่ง + ระฆังเพนทาโทนิกไล่ขึ้น + กลีบเสียดสี
    d = 2.4
    o = buf(d)
    put(o, sweep_band(0.5, 800, 5000, 0.7) * env_lin(0.5, 0.03, 0.47) * 0.6, 0)
    put(o, thump(0.4, 120, 60, 9, 0.35), 0)
    for i, f in enumerate([587.3, 659.3, 880, 987.8, 1174.7, 1318.5, 1760]):
        put(o, bell(1.2, f, 3.5, 0.18), 0.02 + i * 0.07)
    t = T(2.0)
    put(o, crackle(2.0, 50, 3000, 10000, 0.12, grow=0) * np.clip(1 - t / 2.0, 0, 1), 0.2)
    return reverb(o, 0.35, 1.8)


SOUNDS = {
    "ryougi_eyes_open": (eyes_open, 2.9), "ryougi_yinyang": (yinyang, 2.1), "ryougi_mind": (mind, 1.6), "ryougi_sever": (sever, 1.2),
    "ryougi_dash": (dash, 1.5), "ryougi_crumble": (crumble, 1.9), "ryougi_kill": (kill, 1.8), "ryougi_bloom": (bloom, 2.8),
}
# ไฟล์จริง (ผู้ใช้อนุมัติ) — คีย์ = ชื่อไฟล์ปลายทาง
FILES = {
    "ryougi_slash": "leap_sword_slashes_in_battle_2763.mp3",   # เนื้อเสียง = Mixkit "Quick saber cut" (ฟันเดียว)
    "ryougi_leap": "slash_quick_saber_cut_2158.mp3",           # เนื้อเสียง = Mixkit "Sword slashes in battle" (ฟันรัว)
}
if __name__ == "__main__":
    only = set(sys.argv[2:])
    for name, src in FILES.items():
        if only and name not in only:
            continue
        from_file(name, os.path.join(SRC, src))
    for name, (fn, dur) in SOUNDS.items():
        if only and name not in only:
            continue
        write(name, fn(), dur)
