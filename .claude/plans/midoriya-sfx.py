# สังเคราะห์เสียงของมิโดริยะ อิซึคุ (characters/midoriya_izuku.js · GRID_PLAN §7.33) — numpy ล้วน ไม่ดาวน์โหลด
#  python -I .claude/plans/midoriya-sfx.py [โฟลเดอร์ปลายทาง] [--only midoriya_punch,...]
#   ปกติ client/public/effect_sound/midoriya (track ใน git — ไฟล์เล็ก)
#  ใช้ตัวช่วยสังเคราะห์/มาสเตอร์ชุดเดียวกับ law-sfx.py (-16 LUFS · AAC .m4a)
#  Smash 4 แบบมีคลิปทุกครั้ง = ไม่มีเสียงเอฟเฟกต์ (กฎผู้ใช้) · 1,000,000% ครั้งต่อไป = เสียงตัดจากคลิปของผู้ใช้ (ไม่ได้อยู่ในไฟล์นี้)
#   midoriya_punch       ตีปกติ: ลมหวด → หมัดกระแทกทุ้ม + ลมแตก (จุดปะทะ 0.32 วิ)
#   midoriya_punch_cowl  ตีปกติระหว่าง Full Cowl: สายฟ้าเขียวแลบ + หมัดหนักกว่า (จุดปะทะ 0.30 วิ)
#   midoriya_cowl        Full Cowl: กระแสไฟวิ่งขึ้นทั่วตัว (ฮัมไต่ขึ้น) + สายฟ้าแตกเปรี๊ยะ + ปลดพลังฟึ่บ
#   midoriya_recoil      ร่างกายรับแรง: กระดูก/กล้ามเนื้อลั่นกร๊อบ + ทุ้มอั้น
#   midoriya_smash_storm   Smash บนกระดาน (หลังคลิปจบ — ผู้ใช้ขอเสียงโจมตี): ชาร์จ → ตูมที่ 0.55 วิ → ลมคำรามซัดออกไป
#   midoriya_million_storm 1,000,000% บนกระดาน (หลังคลิปครั้งแรก): ชาร์จ + สายฟ้า 1.6 วิ → ตูมหนัก → ลมคำรามยาว
import importlib.util, os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("lawsfx", os.path.join(HERE, "law-sfx.py"))
L = importlib.util.module_from_spec(spec)
spec.loader.exec_module(L)
SR, T, buf, put, noise, band, sweep_band = L.SR, L.T, L.buf, L.put, L.noise, L.band, L.sweep_band
env_exp, env_lin, tone, chirp, thump, crash, rumble, reverb, softclip, write = (
    L.env_exp, L.env_lin, L.tone, L.chirp, L.thump, L.crash, L.rumble, L.reverb, L.softclip, L.write)
rng = np.random.default_rng(1000000)


def whoosh(dur, f0, f1, amp):
    # ลมหวด: noise กวาดแบนด์ + ขึ้นแล้วลง
    return amp * sweep_band(dur, f0, f1, 0.7) * env_lin(dur, dur * 0.55, dur * 0.45)


def gust(dur, amp, lo=200, hi=5000):
    # ลมแตกกระจาย (แรงลมของ Smash)
    return amp * softclip(band(noise(dur), lo, hi, 0.3) * env_exp(dur, 6, 0.004), 1.4)


def zap(dur, amp):
    # สายฟ้าแลบ 1 ครั้ง: noise แหลม + ฮัม 120 Hz สั่นเร็ว
    t = T(dur)
    buzz = np.sign(np.sin(2 * np.pi * 120 * t)) * 0.4 + np.sin(2 * np.pi * 240 * t) * 0.3
    x = band(noise(dur), 2500, 9000, 0.2) + 0.5 * buzz
    flick = (rng.uniform(0, 1, int(dur * 400) + 2) > 0.45).astype(float)
    gate = np.interp(t * 400, np.arange(len(flick)), flick)
    return amp * softclip(x * gate * env_exp(dur, 9, 0.001), 1.6)


def zaps(o, start, span, count, amp):
    for _ in range(count):
        put(o, zap(rng.uniform(0.04, 0.12), amp * rng.uniform(0.5, 1.0)), start + rng.uniform(0, span))


HIT = 0.32
HIT_COWL = 0.30


def punch():
    d = 0.8; o = buf(d)
    put(o, whoosh(0.3, 300, 2400, 0.55), 0.02)
    put(o, thump(0.3, 130, 45, 11, 1.0), HIT)
    put(o, crash(0.25, 14, 600, 6000, 0.35), HIT)
    put(o, gust(0.4, 0.45), HIT + 0.01)
    return reverb(o, 0.16, 0.8)


def punch_cowl():
    d = 0.9; o = buf(d)
    zaps(o, 0.0, 0.28, 6, 0.4)
    put(o, whoosh(0.28, 400, 3200, 0.6), 0.02)
    put(o, thump(0.34, 140, 40, 10, 1.0), HIT_COWL)
    put(o, crash(0.3, 12, 500, 7000, 0.4), HIT_COWL)
    put(o, gust(0.5, 0.55), HIT_COWL + 0.01)
    zaps(o, HIT_COWL, 0.35, 5, 0.45)
    return reverb(o, 0.2, 1.0)


def cowl():
    d = 1.5; o = buf(d)
    t = T(1.0)
    hum = chirp(1.0, 70, 260, 0.45, "exp", 3) * env_lin(1.0, 0.8, 0.2)
    put(o, softclip(hum * (1 + 0.3 * np.sin(2 * np.pi * 18 * t)), 1.3), 0.0)
    zaps(o, 0.05, 1.0, 14, 0.5)
    put(o, gust(0.6, 0.5, 120, 3000), 0.95)
    put(o, thump(0.4, 90, 35, 7, 0.7), 0.95)
    zaps(o, 0.95, 0.45, 8, 0.55)
    return reverb(o, 0.25, 1.3)


def recoil():
    d = 0.8; o = buf(d)
    for i in range(4):
        put(o, crash(0.05, 40, 1500, 9000, 0.6 * rng.uniform(0.6, 1)), 0.0 + i * 0.03 + rng.uniform(0, 0.01))
    put(o, thump(0.35, 85, 40, 9, 0.8), 0.0)
    put(o, band(noise(0.4), 150, 900, 0.3) * env_exp(0.4, 8) * 0.35, 0.02)
    return reverb(o, 0.12, 0.7)


def roar(dur, amp, lo=60, hi=4200, rate=7.0):
    # ลมคำราม: noise แบนด์กว้าง + ทุ้ม + แอมป์ขึ้นลงแบบลมกระโชก
    t = T(dur)
    n = int(dur * rate) + 3
    g = np.interp(t * rate, np.arange(n), rng.uniform(0.55, 1.0, n))
    x = band(noise(dur), 250, hi, 0.4) + 0.8 * band(noise(dur), lo, 300, 0.3)
    return amp * softclip(x * g, 1.4)


def storm(beat, tail, big):
    # Smash บนกระดาน (หลังคลิปจบ): ชาร์จไต่ขึ้น → ตูมตรงจังหวะปะทะ (beat) → ลมคำรามซัดออกไปแล้วค่อยหาย
    d = beat + tail; o = buf(d)
    put(o, sweep_band(beat, 200, 3500 if big else 2500, 0.6) * env_lin(beat, beat * 0.9, beat * 0.1) * (0.5 if big else 0.4), 0.0)
    if big:
        zaps(o, 0.1, beat - 0.1, 22, 0.45)
        hum = chirp(beat, 50, 300, 0.4, "exp", 3) * env_lin(beat, beat * 0.95, beat * 0.05)
        put(o, hum, 0.0)
    put(o, thump(0.9 if big else 0.6, 110, 26, 5 if big else 7, 1.0), beat)
    put(o, crash(0.8 if big else 0.5, 6, 200, 9000, 0.7 if big else 0.55), beat)
    put(o, rumble(tail, 25, 160, 0.8 if big else 0.6) * env_exp(tail, 2.2 if big else 3.0), beat)
    put(o, roar(tail * 0.95, 0.75 if big else 0.6) * env_lin(tail * 0.95, 0.05, tail * 0.9), beat + 0.02)
    if big:
        zaps(o, beat, tail * 0.6, 16, 0.5)
        put(o, thump(0.7, 80, 22, 5, 0.8), beat + 0.35)
    return reverb(o, 0.3 if big else 0.22, 1.8 if big else 1.2)


SOUNDS = {
    "midoriya_punch": (punch, 0.8), "midoriya_punch_cowl": (punch_cowl, 0.9),
    "midoriya_cowl": (cowl, 1.5), "midoriya_recoil": (recoil, 0.8),
    # Smash บนกระดาน: จังหวะปะทะ = MIDORIYA_T (0.55 / 1,000,000% 1.6 วิ)
    "midoriya_smash_storm": (lambda: storm(0.55, 1.9, False), 2.45), "midoriya_million_storm": (lambda: storm(1.6, 2.8, True), 4.4),
}
if __name__ == "__main__":
    args = sys.argv[1:]
    only = set()
    if "--only" in args:
        i = args.index("--only")
        only = set(args[i + 1].split(","))
        args = args[:i] + args[i + 2:]
    outs = args or ["client/public/effect_sound/midoriya"]
    for o in outs:
        os.makedirs(o, exist_ok=True)
    for name, (fn, dur) in SOUNDS.items():
        if only and name not in only:
            continue
        write(name, fn(), dur, outs)
