# สังเคราะห์เสียงเอฟเฟกต์ของซึนาชิ ทาคุโตะ (contract §5–6) — numpy ล้วน ไม่มีไฟล์ต้นฉบับ/ไม่ดาวน์โหลด
#  python -I .claude/plans/takuto-sfx.py <โฟลเดอร์ปลายทาง>   (ปกติ client/public/characters/takuto/sfx)
#  แต่ละไฟล์: สร้าง wav (mono 44.1k) → ffmpeg loudnorm 2 รอบ (-14.5 LUFS, TP -1) → mp3
#  ตีปกติ (takuto_atk_*): จุดกระแทกอยู่ 0–15 ms แรก (BoardStage เล่นตรงจังหวะปะทะ)
#  เหตุการณ์: จังหวะในไฟล์ตรงกับฉากใน client/src/board/takutoFx.js (TAKUTO_T / FX_DUR)
import json, os, subprocess, sys, tempfile, wave
import numpy as np

SR = 44100
OUT = sys.argv[1] if len(sys.argv) > 1 else "client/public/characters/takuto/sfx"
rng = np.random.default_rng(1607)


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


def write(name, x, dur=None):
    if dur is not None:
        x = x[: int(SR * dur)]
    x = fade_tail(np.asarray(x, dtype=np.float64))
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.89
    os.makedirs(OUT, exist_ok=True)
    tmp = os.path.join(tempfile.gettempdir(), f"{name}.wav")
    with wave.open(tmp, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype("<i2").tobytes())
    # loudnorm 2 รอบ (ค่าที่วัดได้ → linear) ให้ทุกไฟล์ดังเท่ากัน
    #  เสียงฟันที่ยอดแหลมมาก: ขยายถึงเป้าแล้วจำกัดยอดก่อน (alimiter) ไม่งั้น linear ติดเพดาน TP แล้วเบากว่าเป้า
    def measure(path):
        m = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "loudnorm=I=-14.5:TP=-1:LRA=11:print_format=json", "-f", "null", "-"],
                           capture_output=True, text=True).stderr
        return json.loads(m[m.rindex("{"): m.rindex("}") + 1])
    j = measure(tmp)
    gain = -14.5 - float(j["input_i"])
    if float(j["input_tp"]) + gain > -1.2:
        lim = tmp.replace(".wav", "_lim.wav")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-af", f"volume={gain + 0.6:.2f}dB,alimiter=limit=0.8:attack=0.5:release=30:level=false",
                        "-c:a", "pcm_s16le", lim], check=True)
        os.replace(lim, tmp)
        j = measure(tmp)
    af = ("loudnorm=I=-14.5:TP=-1:LRA=11:linear=true:"
          f"measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}")
    dst = os.path.join(OUT, f"{name}.mp3")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-af", af, "-ar", "44100", "-ac", "1", "-c:a", "libmp3lame", "-q:a", "2", dst], check=True)
    os.remove(tmp)
    print(name, f"{len(x) / SR:.2f}s", f"in {j['input_i']} LUFS")


# ---------------------------------------------------------------- ตีปกติ
def atk_punch():
    d = 0.75
    o = buf(d)
    put(o, thump(d, 110, 36, 7, 1.0), 0)
    put(o, crash(0.25, 22, 150, 3500, 0.9), 0)
    put(o, tone(0.6, 412, 9, 0.22, ((1, 1), (2.71, 0.6), (4.18, 0.4), (6.43, 0.25))), 0.004)  # เหล็กกระทบ
    put(o, crash(0.06, 60, 2500, 12000, 0.5), 0)
    return softclip(reverb(o, 0.18, 0.9), 1.8)


def slash(d=0.6, lo=1800, hi=6500, ring=(2350, 3520, 5150), ring_amp=0.25):
    o = buf(d)
    sw = sweep_band(0.14, hi, lo, 0.7) * env_lin(0.14, 0.01, 0.13)
    put(o, sw * 1.0, 0)
    put(o, crash(0.08, 40, 3000, 14000, 0.55), 0)
    for i, f in enumerate(ring):
        put(o, tone(d, f, 5 + i * 2, ring_amp / (1 + i * 0.5), ((1, 1), (2.01, 0.2))), 0.006)
    return o


def atk_emerald():
    o = slash(0.9)
    put(o, thump(0.4, 120, 55, 12, 0.55), 0)
    for i, f in enumerate([1568, 2093, 2637]):  # ประกายมรกต (G6 C7 E7)
        put(o, bell(0.8, f, 6, 0.22), 0.03 + i * 0.045)
    return reverb(o, 0.25, 1.1)


def atk_sapphire():
    d = 1.0
    o = buf(d)
    sw = sweep_band(0.28, 7000, 1400, 0.8) * env_lin(0.28, 0.015, 0.26)  # กวาดยาว (หัวกระแทกอยู่ต้น)
    put(o, sw * 0.9, 0)
    put(o, crash(0.1, 32, 2500, 12000, 0.5), 0)
    put(o, thump(0.45, 110, 50, 10, 0.55), 0)
    for i, f in enumerate([2637, 3136, 3951, 5274]):  # น้ำแข็งแตกฟ้า
        put(o, bell(0.7, f, 8, 0.18), 0.02 + i * 0.05)
    put(o, crash(0.35, 14, 4000, 11000, 0.18), 0.05)  # ละอองผลึก
    return reverb(o, 0.28, 1.2)


def atk_dual():
    o = slash(1.1, ring=(2350, 3520), ring_amp=0.22)
    o2 = slash(1.0, 2200, 8000, ring=(2794, 4186), ring_amp=0.2)
    put(o, o2, 0.07)
    put(o, thump(0.5, 130, 45, 8, 0.85), 0.07)
    for i, f in enumerate([1568, 2349, 2637, 3136]):
        put(o, bell(0.9, f, 5, 0.18), 0.09 + i * 0.03)
    return reverb(o, 0.27, 1.2)


def atk_judgment():
    d = 1.7
    o = buf(d)
    put(o, thump(1.2, 95, 30, 3.2, 1.0), 0)
    put(o, crash(0.9, 5, 120, 7000, 0.85), 0)
    put(o, crash(0.08, 40, 3000, 14000, 0.5), 0)
    # คอร์ดทอง (A major) ขึ้นนุ่ม + ประกาย
    for f, a in [(220, 0.32), (277.2, 0.24), (329.6, 0.24), (440, 0.2), (659.3, 0.12)]:
        put(o, tone(1.6, f, 1.9, a, ((1, 1), (2, 0.35), (3, 0.15)), attack=0.03, vib=0.3), 0.02)
    for i, f in enumerate([1760, 2217, 2637, 3520, 4434]):
        put(o, bell(1.2, f, 3.5, 0.13), 0.04 + i * 0.06)
    return softclip(reverb(o, 0.35, 2.0), 1.5)


# ---------------------------------------------------------------- เหตุการณ์
def transform():
    d = 2.4
    o = buf(d)
    put(o, thump(1.4, 80, 28, 2.6, 1.0), 0)
    put(o, crash(1.2, 3.2, 200, 9000, 0.7), 0)
    sw = chirp(1.4, 110, 440, 0.32, harm=5) * env_lin(1.4, 0.05, 1.35)  # พลังเครื่องยนต์ไล่ขึ้น
    put(o, sw, 0.02)
    put(o, chirp(1.4, 220, 880, 0.18, harm=3) * env_lin(1.4, 0.05, 1.35), 0.02)
    for f, a in [(146.8, 0.25), (220, 0.22), (293.7, 0.2), (440, 0.14)]:  # D power chord ค้าง
        put(o, tone(2.2, f, 1.4, a, ((1, 1), (2, 0.5), (3, 0.3), (4, 0.15)), attack=0.06), 0.15)
    for i in range(8):  # ประกายวิ่งรอบตัว
        put(o, bell(0.5, 2200 + 330 * i, 9, 0.08), 0.2 + i * 0.09)
    return softclip(reverb(o, 0.3, 2.0), 1.6)


def merge():
    d = 1.9
    o = buf(d)
    F = 0.83  # วาบรวมร่าง (MERGE FLASH 0.46 × 1800 ms)
    t = T(F)
    # สองเสียงหมุนวนเข้าหากัน (ระดับเสียงไล่ขึ้น · ส่ายซ้ายขวาแบบเทรโมโล)
    for f0, f1, ph in [(520, 1040, 0), (780, 1560, np.pi)]:
        x = chirp(F, f0, f1, 0.18, harm=2) * (0.6 + 0.4 * np.sin(2 * np.pi * (3 + 9 * t / F) * t + ph)) * (t / F) ** 0.7
        put(o, x, 0)
    put(o, sweep_band(F, 800, 7000, 0.5) * (T(F) / F) ** 2 * 0.5, 0)
    put(o, thump(0.9, 100, 40, 5, 0.8), F)
    put(o, crash(0.5, 9, 1500, 13000, 0.5), F)
    for f, a in [(440, 0.22), (554.4, 0.18), (659.3, 0.18), (880, 0.14), (1318.5, 0.1)]:
        put(o, tone(1.0, f, 2.8, a, ((1, 1), (2, 0.3)), attack=0.01), F)
    for i, f in enumerate([2637, 3520, 4434, 5274]):
        put(o, bell(0.8, f, 5, 0.12), F + 0.03 + i * 0.07)
    return reverb(o, 0.3, 1.6)


def vanish():
    d = 1.0
    o = buf(d)
    put(o, crash(0.35, 10, 3000, 14000, 0.6), 0.02)
    for i in range(16):  # เศษผลึกแตก
        f = rng.uniform(2500, 7500)
        put(o, tone(0.25, f, 22, rng.uniform(0.08, 0.2), ((1, 1), (2.3, 0.3))), 0.02 + rng.uniform(0, 0.35))
    put(o, chirp(0.6, 1400, 300, 0.15) * env_lin(0.6, 0.01, 0.59), 0.05)
    return reverb(o, 0.3, 1.0)


def heal():
    d = 1.5
    o = buf(d)
    put(o, sweep_band(0.5, 600, 3500, 0.6) * env_lin(0.5, 0.35, 0.15) * 0.35, 0)
    for i, f in enumerate([523.3, 659.3, 784, 1046.5, 1318.5, 1568]):  # C major ไล่ขึ้น
        put(o, bell(1.0, f, 3.5, 0.24), 0.18 + i * 0.07)
    for f in [261.6, 392, 523.3]:
        put(o, tone(1.2, f, 1.6, 0.12, ((1, 1), (2, 0.2)), attack=0.2), 0.3)
    return reverb(o, 0.35, 1.5)


def dash():
    d = 0.75
    o = buf(d)
    put(o, sweep_band(0.4, 5000, 600, 0.9) * env_lin(0.4, 0.02, 0.38) * 1.0, 0)  # วูบ (ดอปเปลอร์ลง)
    put(o, crash(0.3, 9, 60, 600, 0.6), 0)  # ไอพ่นต่ำ
    put(o, thump(0.3, 80, 45, 14, 0.45), 0.24)
    put(o, tone(0.3, 620, 16, 0.12, ((1, 1), (2.7, 0.5))), 0.25)  # เหล็กลงพื้น
    return reverb(o, 0.15, 0.7)


def flash():
    d = 2.1
    o = buf(d)
    t = T(0.42)
    put(o, chirp(0.42, 300, 1400, 0.22, harm=2) * (t / 0.42) ** 1.5, 0)  # ชาร์จดาบคู่
    put(o, sweep_band(0.36, 1500, 7000, 0.6) * env_lin(0.36, 0.3, 0.06) * 0.5, 0.06)
    put(o, sweep_band(0.34, 6000, 900, 0.8) * env_lin(0.34, 0.02, 0.32) * 0.9, 0.42)  # พุ่งตามแนว
    put(o, slash(0.6) * 0.85, 0.76)  # ฟันเขียว
    put(o, slash(0.6, 2200, 8000, ring=(2794, 4186)) * 0.85, 0.91)  # ฟันฟ้า
    put(o, chirp(0.16, 2400, 200, 0.25) * env_lin(0.16, 0.01, 0.15), 1.17)  # วาบหาย
    put(o, chirp(0.18, 300, 2600, 0.25) * env_lin(0.18, 0.16, 0.02), 1.08)
    put(o, bell(0.5, 2093, 7, 0.18), 1.26)  # โผล่
    put(o, thump(0.6, 130, 40, 7, 1.0), 1.52)  # ปะทะ (ดาเมจ)
    put(o, crash(0.3, 14, 800, 12000, 0.7), 1.52)
    for i, f in enumerate([1568, 2349, 3136]):
        put(o, bell(0.5, f, 6, 0.14), 1.54 + i * 0.03)
    return softclip(reverb(o, 0.25, 1.2), 1.4)


def missile():
    d = 2.95
    o = buf(d)
    FIRE, REACH = 1.15, 1.70
    t = T(FIRE)
    hum = chirp(FIRE, 70, 260, 0.3, harm=6) * (t / FIRE) ** 1.2  # ชาร์จอกแดง
    whine = chirp(FIRE, 500, 2400, 0.12) * (t / FIRE) ** 2
    put(o, hum + whine, 0)
    for i in range(10):  # ประกายไฟฟ้า
        put(o, crash(0.03, 80, 2000, 12000, 0.25), rng.uniform(0.25, FIRE - 0.05))
    put(o, thump(1.0, 120, 32, 3.5, 1.0), FIRE)  # ยิง
    put(o, crash(0.6, 6, 300, 9000, 0.8), FIRE)
    L = 1.3
    tl = T(L)
    roar = band(noise(L), 120, 2400) * 0.45 + chirp(L, 110, 98, 0.35, harm=5) * (1 + 0.2 * np.sin(2 * np.pi * 9 * tl))
    roar *= np.minimum(1, tl / 0.05) * np.clip(1 - np.maximum(0, tl - 0.75) / 0.55, 0, 1)
    put(o, roar, FIRE)
    put(o, thump(0.7, 100, 35, 5, 0.8), REACH)  # ถึงปลายแนว
    put(o, crash(0.4, 8, 200, 6000, 0.5), REACH)
    return softclip(reverb(o, 0.25, 1.4), 1.8)


def steal():
    d = 1.45
    o = buf(d)
    for i in range(3):  # ลูกแสงลอยออกทีละลูก (80 + 110i ms)
        st = 0.08 + i * 0.11
        put(o, chirp(0.3, 600 + 120 * i, 1500 + 200 * i, 0.16) * env_lin(0.3, 0.02, 0.28), st)
        put(o, bell(0.4, 1760 + 220 * i, 8, 0.12), st)
    put(o, sweep_band(0.6, 900, 3000, 0.6) * env_lin(0.6, 0.45, 0.15) * 0.3, 0.3)
    for i, f in enumerate([1318.5, 1760, 2637]):  # ดูดเข้าตัว
        put(o, bell(0.6, f, 5, 0.2), 0.86 + i * 0.05)
    return reverb(o, 0.3, 1.1)


def blast():
    d = 2.9
    o = buf(d)
    BOOM, HIT = 1.30, 1.95
    t = T(BOOM)
    rise = (t / BOOM) ** 2.2
    put(o, band(noise(BOOM), 400, 9000) * rise * 0.45, 0)  # แสงขาวรวม (ดูดเข้า)
    for f in [220, 277.2, 329.6, 440]:
        put(o, chirp(BOOM, f * 0.5, f, 0.08, harm=3) * rise, 0)
    put(o, chirp(BOOM, 1200, 5200, 0.08) * rise, 0)
    put(o, thump(1.6, 90, 26, 2.2, 1.0), BOOM)  # ระเบิด
    put(o, crash(1.4, 2.8, 80, 8000, 1.0), BOOM)
    put(o, crash(0.1, 30, 2500, 14000, 0.6), BOOM)
    put(o, thump(0.8, 120, 34, 4.5, 0.75), HIT)  # ถึงขอบรัศมี (ดาเมจ)
    put(o, crash(0.5, 7, 300, 7000, 0.45), HIT)
    return softclip(reverb(o, 0.3, 1.8), 2.2)


SOUNDS = {
    "takuto_atk_punch": (atk_punch, 0.8), "takuto_atk_emerald": (atk_emerald, 1.1), "takuto_atk_sapphire": (atk_sapphire, 1.2),
    "takuto_atk_dual": (atk_dual, 1.3), "takuto_atk_judgment": (atk_judgment, 2.2),
    "takuto_transform": (transform, 2.9), "takuto_merge": (merge, 2.2), "takuto_vanish": (vanish, 1.2), "takuto_heal": (heal, 1.8),
    "takuto_dash": (dash, 0.85), "takuto_flash": (flash, 2.4), "takuto_missile": (missile, 3.1), "takuto_steal": (steal, 1.6),
    "takuto_blast": (blast, 3.4),
}
if __name__ == "__main__":
    only = set(sys.argv[2:])
    for name, (fn, dur) in SOUNDS.items():
        if only and name not in only:
            continue
        write(name, fn(), dur)
