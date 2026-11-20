# สังเคราะห์เสียงเอฟเฟกต์ของนารุโฮโดะ ริวอิจิ (GRID_PLAN §7.37 · .claude/plans/naruhodo-contract.md) — numpy ล้วน ไม่ดาวน์โหลด
#  python -I .claude/plans/naruhodo-sfx.py [โฟลเดอร์ปลายทาง] [--only point,gavel,...]
#   ปกติ client/public/characters/naruhodo_ryuichi/sfx/naru_<ชื่อ>.mp3 · มาสเตอร์ −16 LUFS (บลิปข้อความ/เสียงคนดู เบากว่า — LOUD)
#  ใช้ตัวช่วยของ law-sfx.py (กรอง FFT · reverb · limiter) · แนวเสียง Ace Attorney: ป้ายตะโกน = ออร์เคสตราสแตบ · ค้อน = ไม้เคาะ + ห้องโถง · บลิป = คลื่นสี่เหลี่ยมสั้น
#   point          เอานี่ไปดู!: หวือนิ้วชี้ + ดีดนิ้ว + บราสสั้น
#   scout          สืบสวน: ประกายแว่นขยาย (อาร์เปจโจระฆังขึ้น) + ลมกวาดเบา
#   trial_open     เริ่มการไต่สวน: ไรเซอร์ ~1 วิ (ค้อนตามมาที่ 1.05 วิ — NARU_T.trialSlam)
#   holdit         รอเดี๋ยว!!!: สแตบสองจังหวะ (ไมเนอร์เซคันด์ตึงเครียด) + ฉาบ
#   objection      คัดค้าน!: สแตบไมเนอร์ใหญ่ + ทิมปานี + ฉาบ + ห้องโถง
#   takethat       Take that!: สแตบเมเจอร์สว่าง + หวือ
#   gavel          ค้อนผู้พิพากษา: ไม้เคาะแท่น (เรโซแนนซ์ไม้) + ตุ้บทุ้ม + ห้องโถงก้อง
#   blip_low|mid|high  บลิปข้อความ (ผู้พิพากษา/ทนาย/พยาน)
#   damage         โดนหนัก (ความน่าเชื่อถือลด): กระแทกกรอบ + ทุ้มดิ่ง
#   evidence_ding  ได้หลักฐาน: ระฆังสองโน้ต
#   whoosh         หวือ (สไลด์/ป้ายบินเข้า)
#   crowd_cheer    คนดูเชียร์: เสียงฮือ + ปรบมือ
#   crowd_boo      คนดูโห่: "บู้" ทุ้มหลายเสียง
#   splat          มะเขือเทศแตก
#   stamp          ประทับ/กระแทกเบา
#   penalty        โดนปรับ: บัซซ์ลงสองโน้ต
import importlib.util, json, os, subprocess, sys, tempfile, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("lawsfx", os.path.join(HERE, "law-sfx.py"))
L = importlib.util.module_from_spec(spec)
spec.loader.exec_module(L)
SR, T, buf, put, noise, band, sweep_band = L.SR, L.T, L.buf, L.put, L.noise, L.band, L.sweep_band
env_exp, env_lin, tone, chirp, thump, crash, reverb, softclip = L.env_exp, L.env_lin, L.tone, L.chirp, L.thump, L.crash, L.reverb, L.softclip
rng = np.random.default_rng(2001)  # ปีที่ Gyakuten Saiban ออกครั้งแรก
NOTE = lambda n: 440.0 * 2 ** ((n - 69) / 12)  # MIDI → Hz


# ---------------------------------------------------------------- ตัวช่วย
def saw(dur, f, detune=0.0, vib=0.0):
    t = T(dur)
    x = np.zeros_like(t)
    for d in ((-detune, 0, detune) if detune else (0,)):
        ff = f * (1 + d) * (1 + vib * np.sin(2 * np.pi * 5.2 * t))
        ph = np.cumsum(ff) / SR
        x += 2 * (ph - np.floor(ph + 0.5))
    return x / (3 if detune else 1)


def square(dur, f, duty=0.5):
    t = T(dur)
    return np.where((t * f) % 1 < duty, 1.0, -1.0)


def brass(dur, f, amp=1.0, bright=4000, k=3.5, attack=0.012):
    # เสียงเครื่องเป่าทองเหลือง: ซอว์ 3 ตัวดีจูน + กรองต่ำ ผ่านเอนเวโลปเร็ว
    x = saw(dur, f, 0.004) * env_exp(dur, k, attack)
    return amp * band(x, 60, bright, 0.3)


def strings(dur, f, amp=1.0, k=2.5):
    x = saw(dur, f, 0.007, 0.004) * env_exp(dur, k, 0.006)
    return amp * band(x, 120, 6000, 0.3)


def stab(dur, notes, amp=1.0, bright=4500, k=3.2, bass=None):
    # ออร์เคสตราสแตบ: บราส + เครื่องสาย (คอร์ดเดียวกัน) + เบส
    o = buf(dur)
    for n in notes:
        put(o, brass(dur, NOTE(n), 0.32, bright, k), 0)
        put(o, strings(dur, NOTE(n + 12), 0.14, k * 0.9), 0)
    if bass is not None:
        put(o, brass(dur, NOTE(bass), 0.45, 1200, k * 0.8), 0)
        put(o, tone(dur, NOTE(bass), k, 0.35), 0)
    return amp * o


def timpani(dur=0.9, f=NOTE(38), amp=1.0):
    t = T(dur)
    ff = f * (1 + 0.08 * np.exp(-t * 30))
    x = np.sin(2 * np.pi * np.cumsum(ff) / SR) * env_exp(dur, 4.5, 0.002) + 0.45 * np.sin(2 * np.pi * np.cumsum(ff * 1.5) / SR) * env_exp(dur, 7)
    x += 0.5 * band(noise(dur), 80, 1500) * env_exp(dur, 40)
    return amp * x


def cymbal(dur=1.3, amp=0.5):
    return amp * band(noise(dur), 4000, 15000, 0.2) * env_exp(dur, 3.0, 0.003)


def hall(x, wet=0.35, decay=1.8):
    return reverb(x, wet, decay, 0.02)


# ---------------------------------------------------------------- เสียง
def point():
    d = 0.75
    o = buf(d)
    put(o, sweep_band(0.32, 600, 4200, 0.7) * env_lin(0.32, 0.18, 0.14) * 0.55, 0)  # หวือ
    put(o, crash(0.03, 120, 1800, 9000, 0.9), 0.2)  # ดีดนิ้ว
    put(o, tone(0.05, 2400, 80, 0.4), 0.2)
    put(o, stab(0.5, [62, 66, 69], 0.7, 5000, 6), 0.2)  # บราสสั้น D major
    return softclip(hall(o, 0.25, 1.0), 1.3)


def scout():
    d = 1.0
    o = buf(d)
    put(o, sweep_band(0.5, 1500, 6000, 0.5) * env_lin(0.5, 0.2, 0.3) * 0.2, 0)
    for i, n in enumerate([84, 88, 91, 96, 100]):
        put(o, L.bell(0.6, NOTE(n), 6, 0.35 - i * 0.03), 0.06 + i * 0.07)
    put(o, tone(0.6, NOTE(103), 9, 0.12, ((1, 1), (2, 0.3)), vib=0.6), 0.38)  # ประกายเลนส์
    return hall(o, 0.3, 1.2)


def trial_open():
    d = 1.15
    o = buf(d)
    t = T(1.05)
    rise = env_lin(1.05, 1.0, 0.05) ** 2
    put(o, sweep_band(1.05, 300, 6000, 0.8) * rise * 0.45, 0)  # ลมพัดขึ้น
    for n in (50, 53, 57, 62):  # คลัสเตอร์ซอว์ไล่ขึ้น
        f0 = NOTE(n)
        ff = f0 * (1 + 0.5 * (t / 1.05) ** 2)
        x = 2 * ((np.cumsum(ff) / SR) % 1) - 1
        put(o, band(x, 80, 3500) * rise * 0.18, 0)
    # ทิมปานีรัวเร่งขึ้น
    at = 0.25
    while at < 1.0:
        put(o, timpani(0.25, NOTE(38), 0.35 * (0.4 + at)), at)
        at += 0.09 * (1.1 - at) + 0.035
    return softclip(hall(o, 0.25, 0.9), 1.2)


def holdit():
    d = 1.5
    o = buf(d)
    put(o, stab(0.18, [57, 58, 64], 0.9, 5500, 9, bass=45), 0)  # จังหวะแรกสั้น
    put(o, stab(1.2, [57, 60, 63, 68], 1.0, 5000, 2.6, bass=33), 0.2)  # ค้าง ตึง
    put(o, timpani(0.9, NOTE(33), 0.7), 0.2)
    put(o, cymbal(1.3, 0.35), 0.2)
    return softclip(hall(o, 0.32, 1.6), 1.4)


def objection():
    d = 1.7
    o = buf(d)
    put(o, sweep_band(0.12, 800, 5000, 0.8) * 0.3, 0)
    put(o, stab(1.4, [62, 65, 69, 74], 1.05, 5200, 2.2, bass=38), 0.06)  # D minor หนัก
    put(o, timpani(1.0, NOTE(38), 0.9), 0.06)
    put(o, crash(0.06, 60, 200, 4000, 0.6), 0.06)
    put(o, cymbal(1.5, 0.45), 0.06)
    return softclip(hall(o, 0.38, 2.0), 1.5)


def takethat():
    d = 1.45
    o = buf(d)
    put(o, sweep_band(0.25, 500, 6000, 0.7) * env_lin(0.25, 0.15, 0.1) * 0.45, 0)
    put(o, stab(1.15, [67, 71, 74, 79], 1.0, 6500, 2.6, bass=43), 0.14)  # G major สว่าง
    put(o, timpani(0.8, NOTE(43), 0.7), 0.14)
    put(o, cymbal(1.2, 0.4), 0.14)
    return softclip(hall(o, 0.33, 1.7), 1.4)


def gavel():
    d = 1.6
    o = buf(d)
    # ไม้เคาะแท่น: เรโซแนนซ์ไม้หลายโหมด (สลายเร็ว) + ทรานเซียนต์ + ตุ้บทุ้ม
    for f, a, k in ((190, 0.8, 28), (430, 0.6, 38), (780, 0.4, 55), (1350, 0.25, 70), (2300, 0.12, 90)):
        put(o, tone(0.35, f, k, a), 0)
    put(o, crash(0.03, 140, 900, 7000, 1.0), 0)
    put(o, thump(0.3, 120, 55, 14, 0.9), 0)
    x = softclip(o, 1.6)
    return hall(x, 0.42, 1.5)


def desk_slam():
    # สองมือทุบโต๊ะทนาย (ผู้ใช้ขอ 2026-11-20): ตุ้บหนักทุ้ม + ไม้โต๊ะสั่น (โหมดต่ำกว่าค้อน) + มือสองข้างห่างกันนิด + กระดาษ/ของบนโต๊ะสะเทือน + ห้องกว้าง
    d = 1.3
    o = buf(d)
    for at, g in ((0.0, 1.0), (0.018, 0.8)):
        put(o, thump(0.45, 95, 38, 9, 1.0 * g), at)
        put(o, crash(0.05, 90, 700, 5200, 0.9 * g), at)
        for f, a, k in ((120, 0.7, 14), (260, 0.55, 20), (520, 0.35, 30), (910, 0.18, 45)):
            put(o, tone(0.6, f * (1 + 0.03 * g), k, a * g), at)
    for _ in range(14):  # ของบนโต๊ะเด้ง
        put(o, band(noise(0.03), 1800, 7500) * env_exp(0.03, 90) * rng.uniform(0.05, 0.16), rng.uniform(0.04, 0.3))
    put(o, band(noise(0.25), 2500, 9000) * env_exp(0.25, 14) * 0.12, 0.02)  # กระดาษสะบัด
    return hall(softclip(o, 1.8), 0.38, 1.3)


def blip(f):
    def fn():
        d = 0.06
        x = square(d, f, 0.5) * env_exp(d, 45, 0.001) * 0.6
        return band(x, 150, 6000)
    return fn


def damage():
    d = 0.75
    o = buf(d)
    put(o, crash(0.08, 40, 300, 8000, 1.0), 0)
    put(o, chirp(0.45, 260, 55, 0.9, harm=4) * env_exp(0.45, 6), 0)
    put(o, thump(0.4, 140, 40, 7, 1.0), 0)
    put(o, square(0.3, 70) * env_exp(0.3, 10) * 0.25, 0.02)
    return softclip(hall(o, 0.18, 0.7), 2.2)


def evidence_ding():
    d = 0.95
    o = buf(d)
    put(o, tone(0.7, NOTE(88), 5, 0.6, ((1, 1), (2, 0.25), (3, 0.1))), 0)
    put(o, tone(0.8, NOTE(95), 4.5, 0.6, ((1, 1), (2, 0.25), (3, 0.1))), 0.11)
    put(o, L.bell(0.6, NOTE(107), 7, 0.12), 0.11)
    return hall(o, 0.28, 1.1)


def whoosh():
    d = 0.5
    x = sweep_band(d, 400, 3800, 0.8) * env_lin(d, 0.28, 0.22)
    return reverb(x * 0.9, 0.12, 0.4)


def crowd_cheer():
    d = 1.9
    o = buf(d)
    t = T(d)
    swell = env_lin(d, 0.25, 1.65)
    # ฮือ: noise ช่วงเสียงพูด มอดูเลตสุ่ม หลายชั้น (เสียงคนหลายคน)
    for i in range(10):
        f = rng.uniform(450, 1600)
        steps = rng.uniform(0.2, 1.0, int(d * 9) + 2)
        g = np.interp(t * 9, np.arange(len(steps)), steps)
        put(o, band(noise(d), f * 0.7, f * 1.4, 0.2) * g * swell * 0.18, 0)
    # ปรบมือ: คลิกสั้นถี่สุ่ม
    for _ in range(170):
        at = rng.uniform(0, d - 0.05) ** 1.1
        put(o, crash(0.025, 160, 900, 6500, rng.uniform(0.15, 0.4)) * (1 - at / d), at)
    return reverb(o, 0.3, 1.2)


def crowd_boo():
    d = 1.6
    o = buf(d)
    t = T(d)
    swell = env_lin(d, 0.2, 1.4)
    for i in range(9):
        f = rng.uniform(105, 190)
        x = saw(d, f, 0.0, 0.012) * (1 - 0.15 * np.sin(2 * np.pi * rng.uniform(3, 6) * t))
        ff = f * (1 - 0.12 * t / d)  # ลากเสียงลง
        x = 2 * ((np.cumsum(ff) / SR) % 1) - 1
        put(o, band(x, 80, 650, 0.3) * swell * 0.22, rng.uniform(0, 0.12))
    return reverb(o, 0.3, 1.2)


def splat():
    d = 0.5
    o = buf(d)
    put(o, band(noise(0.12), 200, 3000, 0.3) * env_exp(0.12, 30) * 0.9, 0)
    put(o, chirp(0.18, 420, 110, 0.7) * env_exp(0.18, 16), 0)
    for _ in range(9):  # น้ำกระเด็น
        put(o, band(noise(0.04), 1500, 7000) * env_exp(0.04, 80) * rng.uniform(0.1, 0.3), rng.uniform(0.03, 0.25))
    return softclip(reverb(o, 0.1, 0.35), 1.6)


def stamp():
    d = 0.45
    o = buf(d)
    put(o, thump(0.3, 110, 45, 12, 1.0), 0)
    put(o, crash(0.03, 120, 700, 5000, 0.7), 0)
    put(o, band(noise(0.15), 2000, 8000) * env_exp(0.15, 25) * 0.15, 0.01)  # กระดาษ
    return softclip(reverb(o, 0.15, 0.5), 1.5)


def penalty():
    d = 0.75
    o = buf(d)
    for i, f in enumerate((392, 262)):
        x = (square(0.24, f, 0.35) * 0.5 + square(0.24, f * 1.012, 0.5) * 0.3) * env_lin(0.24, 0.005, 0.23)
        put(o, band(x, 100, 4000), i * 0.22)
    put(o, thump(0.3, 90, 40, 9, 0.6), 0.22)
    return reverb(o, 0.15, 0.5)


SOUNDS = {
    "point": (point, 0.75), "scout": (scout, 1.0), "trial_open": (trial_open, 1.15), "holdit": (holdit, 1.5),
    "objection": (objection, 1.7), "takethat": (takethat, 1.45), "gavel": (gavel, 1.6), "desk_slam": (desk_slam, 1.3),
    "blip_low": (blip(240), 0.06), "blip_mid": (blip(420), 0.06), "blip_high": (blip(700), 0.06),
    "damage": (damage, 0.75), "evidence_ding": (evidence_ding, 0.95), "whoosh": (whoosh, 0.5),
    "crowd_cheer": (crowd_cheer, 1.9), "crowd_boo": (crowd_boo, 1.6), "splat": (splat, 0.5), "stamp": (stamp, 0.45), "penalty": (penalty, 0.75),
}
# บลิปข้อความเล่นถี่ (ทีละตัวอักษร) = เบากว่ามาก · เสียงคนดู = พื้นหลัง
LOUD = {"blip_low": -24.0, "blip_mid": -24.0, "blip_high": -25.0, "crowd_cheer": -19.0, "crowd_boo": -19.0, "whoosh": -19.0}


def write_mp3(name, x, dur, outs, target):
    # มาสเตอร์เหมือน law-sfx.py write (วัด loudnorm แล้วไล่เกน + limiter) แต่เข้ารหัส .mp3
    x = L.fade_tail(np.asarray(x[: int(SR * dur)], dtype=np.float64), 0.01 if dur < 0.1 else 0.05)
    x = band(x, 30, 15000, 0.05)
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.5
    tmp = os.path.join(tempfile.gettempdir(), f"naru_{name}.wav")

    def save(sig):
        with wave.open(tmp, "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
            w.writeframes((np.clip(sig, -1, 1) * 32767).astype("<i2").tobytes())

    def measure(sig):
        save(np.concatenate([sig, np.zeros(max(0, int(SR * 0.6) - len(sig)))]))
        m = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", tmp, "-af", f"loudnorm=I={target}:TP=-1:LRA=11:print_format=json", "-f", "null", "-"],
                           capture_output=True, text=True).stderr
        return float(json.loads(m[m.rindex("{"): m.rindex("}") + 1])["input_i"])
    src = measure(x)
    gain, y, got = target - src, x, src
    for _ in range(8):
        y = L.limit(x * 10 ** (gain / 20), 0.89)
        got = measure(y)
        if abs(got - target) < 0.3:
            break
        gain += target - got
    save(y)
    for out in outs:
        os.makedirs(out, exist_ok=True)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-ar", "44100", "-ac", "1", "-c:a", "libmp3lame", "-b:a", "160k", os.path.join(out, f"naru_{name}.mp3")], check=True)
    os.remove(tmp)
    print(f"naru_{name}", f"{len(x) / SR:.2f}s", f"src {src:.1f} -> {got:.1f} LUFS")


if __name__ == "__main__":
    args = sys.argv[1:]
    only = set()
    if "--only" in args:
        i = args.index("--only")
        only = set(args[i + 1].split(","))
        args = args[:i] + args[i + 2:]
    outs = args or ["client/public/characters/naruhodo_ryuichi/sfx"]
    for name, (fn, dur) in SOUNDS.items():
        if only and name not in only:
            continue
        write_mp3(name, fn(), dur, outs, LOUD.get(name, L.TARGET))
