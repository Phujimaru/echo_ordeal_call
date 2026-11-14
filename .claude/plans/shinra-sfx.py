# สังเคราะห์เสียงไฟของคุซาคาเบะ ชินระ (characters/kusakabe_shinra.js · GRID_PLAN §7.32) — numpy ล้วน ไม่ดาวน์โหลด
#  python -I .claude/plans/shinra-sfx.py [โฟลเดอร์ปลายทาง] [--only shinra_kick,...]
#   ปกติ client/public/effect_sound/shinra (track ใน git — ไฟล์เล็ก)
#  ใช้ตัวช่วยสังเคราะห์/มาสเตอร์ชุดเดียวกับ law-sfx.py (-16 LUFS · AAC .m4a)
#  อ้างอิงต้นฉบับ: ไฟพุ่งจากฝ่าเท้าต่อเนื่อง (ไอพ่น) · รอยเท้าเถ้า "Devil's Footprints" · Rapid = ไอพ่นบีบเป็นเส้นเดียว · Corna = ไฟระเบิด
#   shinra_kick        ตีปกติ: ไอพ่นเท้าจุด → เตะเหวี่ยง → ไฟปะทุใส่เป้า + ประกายแตก
#   shinra_kick_blaze  ตีปกติระหว่างอุ่นเครื่อง: หนักกว่า ทุ้มกว่า มีเสียงไฟคำราม
#   shinra_hero        ฉันนี่แหละฮีโร่: จุดไอพ่นเท้า (fwoomp) → ไอพ่นคำราม 2 จังหวะ (เท้าซ้าย/ขวา) → ประกาย
#   shinra_storm       อุ้งเท้าปีศาจ: พายุไฟหมุนรอบตัว (เสียงลมไฟวนซ้ายขวา) → ปะทุรอบวง
#   shinra_warm        อุ่นเครื่องพอแล้ว: หายใจเข้า → ไฟลุกท่วมตัว (ทุ้ม) → ไฟคำรามยาว + ไม้แตก
#   shinra_latom       ลาทัม: ชาร์จไอพ่น (0–0.38 วิ) → พุ่ง Rapid (เสียงจรวด) → ปะทะ
#   shinra_latom_boom  ลาทัม: ระเบิดปิดท้ายไล่ตามทางที่พุ่งผ่าน ตูม-ตาม (ผู้ใช้สั่ง)
#   shinra_detonate    มอดไหม้จากภายใน: ไฟอัดอยู่ข้างใน (ทุ้มอู้อี้) → ระเบิดออก + ซ่า
import importlib.util, os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("lawsfx", os.path.join(HERE, "law-sfx.py"))
L = importlib.util.module_from_spec(spec)
spec.loader.exec_module(L)
SR, T, buf, put, noise, band, sweep_band = L.SR, L.T, L.buf, L.put, L.noise, L.band, L.sweep_band
env_exp, env_lin, tone, chirp, thump, crash, rumble, reverb, softclip, write = (
    L.env_exp, L.env_lin, L.tone, L.chirp, L.thump, L.crash, L.rumble, L.reverb, L.softclip, L.write)
rng = np.random.default_rng(8008)  # กองร้อยที่ 8


def turb(dur, rate=9.0, depth=0.55):
    # ความปั่นป่วนของเปลวไฟ: แอมป์ขึ้นลงแบบสุ่มนุ่มๆ
    t = T(dur)
    n = int(dur * rate) + 3
    pts = rng.uniform(1 - depth, 1, n)
    return np.interp(t * rate, np.arange(n), pts)


def roar(dur, lo=120, hi=2600, amp=0.7, rate=9.0):
    # ไฟคำราม: noise แบนด์กว้าง + ฐานทุ้ม + ปั่นป่วน
    x = band(noise(dur), lo, hi, 0.4) + 0.6 * band(noise(dur), 40, 220, 0.3)
    return amp * softclip(x * turb(dur, rate), 1.3)


def crackle(dur, rate=38, amp=0.4, lo=1500, hi=8000):
    # ไม้/ถ่านแตก: แรงกระตุ้นถี่แบบสุ่ม กรองสูง หางสั้น
    o = buf(dur)
    n = int(dur * rate)
    for _ in range(n):
        at = rng.uniform(0, max(0.001, dur - 0.03))
        k = rng.uniform(90, 260)
        d = 0.025
        s = band(noise(d), lo, hi, 0.2) * env_exp(d, k) * rng.uniform(0.3, 1.0)
        put(o, amp * s, at)
    return o


def jet(dur, f0=500, f1=2200, amp=0.7):
    # ไอพ่นจากฝ่าเท้า: แบนด์ไหลขึ้น + ฐานทุ้มสั่น + ซ่าสูง
    x = sweep_band(dur, f0, f1, 0.7) * 0.9 + 0.5 * band(noise(dur), 60, 300, 0.3) * turb(dur, 22, 0.4)
    x += 0.25 * band(noise(dur), 4000, 10000, 0.3)
    return amp * softclip(x, 1.5)


def fwoomp(dur=0.5, amp=0.9, low=70):
    # ไฟติดพรึ่บ: เสียงดูดลม → พองออก (โลว์พาสเปิดเร็วแล้วปิด) + ทุ้มกระแทก
    t = T(dur)
    x = sweep_band(dur, 180, 2400, 0.9)
    e = np.minimum(1, t / 0.04) * np.exp(-t * 6)
    o = amp * x * e
    put(o, thump(min(dur, 0.35), low * 1.6, low * 0.6, 10, amp * 0.8), 0.0)
    return o


def whoosh(dur, f0=300, f1=1400, amp=0.7):
    t = T(dur)
    return amp * sweep_band(dur, f0, f1, 0.8) * np.sin(np.pi * np.minimum(1, t / dur))


def swirl(dur, amp=0.7, spins=3.0):
    # ลมไฟวนรอบตัว: แบนด์ผ่านแกว่งขึ้นลงตามรอบหมุน
    t = T(dur)
    phase = np.sin(2 * np.pi * spins * t / dur * (1 + t / dur))
    lo = band(noise(dur), 200, 900, 0.3)
    hi = band(noise(dur), 900, 3500, 0.3)
    mix = lo * (0.6 - 0.4 * phase) + hi * (0.6 + 0.4 * phase)
    return amp * mix * turb(dur, 14, 0.35) * env_lin(dur, 0.12, 0.35)


# ---------- เสียงจริง ----------
HIT = 0.30  # จังหวะปะทะของตีปกติ (client SHINRA_HIT_P × SHINRA_MS)


def kick():
    d = 0.95; o = buf(d)
    put(o, jet(0.22, 400, 1800, 0.45) * env_lin(0.22, 0.02, 0.12), 0.0)           # จุดไอพ่นเท้า
    put(o, whoosh(0.22, 350, 1900, 0.55), 0.08)                                      # เหวี่ยงขา
    put(o, thump(0.22, 120, 48, 12, 0.9), HIT)                                       # ปะทะ
    put(o, fwoomp(0.45, 0.8, 80), HIT)                                               # ไฟปะทุ
    put(o, crackle(0.5, 40, 0.35), HIT + 0.04)
    return reverb(o, 0.18, 0.9)


def kick_blaze():
    d = 1.15; o = buf(d)
    put(o, jet(0.26, 300, 2200, 0.6) * env_lin(0.26, 0.02, 0.14), 0.0)
    put(o, whoosh(0.24, 250, 2200, 0.65), 0.06)
    put(o, thump(0.3, 100, 36, 9, 1.0), HIT)
    put(o, fwoomp(0.5, 1.0, 60), HIT)
    put(o, roar(0.7, 90, 2200, 0.55) * env_lin(0.7, 0.02, 0.5), HIT + 0.02)
    put(o, crackle(0.7, 55, 0.4), HIT + 0.05)
    return reverb(o, 0.22, 1.1)


def hero():
    d = 1.35; o = buf(d)
    put(o, fwoomp(0.45, 0.8, 75), 0.0)                                               # เท้าซ้ายติดไฟ
    put(o, fwoomp(0.45, 0.75, 85), 0.16)                                             # เท้าขวา
    put(o, jet(0.9, 500, 2600, 0.55) * env_lin(0.9, 0.08, 0.5), 0.22)                # ไอพ่นคำราม
    put(o, crackle(1.0, 30, 0.3), 0.25)
    return reverb(o, 0.2, 1.0)


def storm():
    d = 1.6; o = buf(d)
    put(o, fwoomp(0.4, 0.7, 70), 0.0)
    put(o, swirl(1.15, 0.85, 3.5), 0.05)                                             # พายุวน
    put(o, roar(1.0, 100, 2400, 0.5) * env_lin(1.0, 0.2, 0.5), 0.1)
    put(o, thump(0.35, 100, 40, 9, 0.9), 0.75)                                       # ปะทุรอบวง (ตรง T.stormBeat)
    put(o, crash(0.5, 9, 300, 6000, 0.45), 0.75)
    put(o, crackle(0.8, 50, 0.4), 0.78)
    return reverb(o, 0.25, 1.3)


def warm():
    d = 2.4; o = buf(d)
    put(o, chirp(0.35, 140, 70, 0.0), 0.0)
    put(o, sweep_band(0.4, 2400, 300, 0.6) * env_lin(0.4, 0.3, 0.1) * 0.35, 0.0)     # ดูดลมเข้า
    put(o, thump(0.5, 80, 28, 6, 1.0), 0.38)                                         # ไฟลุกท่วมตัว
    put(o, fwoomp(0.6, 1.0, 50), 0.38)
    put(o, roar(1.9, 70, 2600, 0.75, 7.0) * env_lin(1.9, 0.05, 1.1), 0.42)           # คำรามยาว
    put(o, rumble(1.6, 30, 160, 0.5) * env_lin(1.6, 0.05, 1.0), 0.4)
    put(o, crackle(1.8, 45, 0.45), 0.5)
    return reverb(o, 0.3, 1.8)


def latom():
    d = 1.5; o = buf(d)
    CH = 0.38
    put(o, jet(CH, 300, 1400, 0.5) * np.linspace(0.2, 1, int(SR * CH)), 0.0)       # ชาร์จไอพ่น
    put(o, thump(0.3, 140, 40, 10, 1.0), CH)                                         # ออกตัว Rapid
    put(o, fwoomp(0.4, 0.9, 70), CH)
    put(o, jet(0.55, 900, 3200, 0.75) * env_lin(0.55, 0.01, 0.4), CH + 0.02)        # พุ่งเป็นเส้นไฟ
    put(o, whoosh(0.5, 1500, 400, 0.6), CH + 0.05)
    put(o, crash(0.45, 8, 400, 7000, 0.5), CH + 0.42)                                # ปะทะแนว
    put(o, crackle(0.6, 50, 0.4), CH + 0.45)
    return reverb(o, 0.22, 1.2)


def detonate():
    d = 1.1; o = buf(d)
    put(o, band(noise(0.18), 60, 400, 0.3) * env_lin(0.18, 0.12, 0.03) * 0.6, 0.0)  # ไฟอัดข้างใน (อู้อี้)
    put(o, thump(0.35, 110, 32, 8, 1.0), 0.16)                                       # ระเบิดออก
    put(o, crash(0.6, 7, 300, 9000, 0.75), 0.16)
    put(o, fwoomp(0.45, 0.8, 55), 0.17)
    put(o, crackle(0.7, 60, 0.45), 0.2)
    return reverb(o, 0.25, 1.1)


def latom_boom():
    # ระเบิดปิดท้ายลาทัม: ตูม-ตามไล่กันทีละช่อง (ช่องละ 60 ms ตาม client LATOM_BOOM.gap) แล้วคำรามทุ้มค้าง
    d = 2.0; o = buf(d)
    for i in range(7):
        at = i * 0.06
        amp = 1.0 if i in (0, 6) else rng.uniform(0.6, 0.85)
        put(o, thump(0.4, rng.uniform(95, 130), rng.uniform(30, 42), 8, amp), at)
        put(o, crash(0.45, 8, 250, 8000, amp * 0.55), at)
        put(o, fwoomp(0.35, amp * 0.6, 60), at + 0.01)
    put(o, rumble(1.6, 25, 150, 0.7) * env_lin(1.6, 0.03, 1.2), 0.0)
    put(o, roar(1.2, 80, 2000, 0.4) * env_lin(1.2, 0.05, 0.9), 0.2)
    put(o, crackle(1.3, 60, 0.4), 0.15)
    return reverb(o, 0.3, 1.6)


SOUNDS = {
    "shinra_kick": (kick, 0.95), "shinra_kick_blaze": (kick_blaze, 1.15), "shinra_hero": (hero, 1.35),
    "shinra_storm": (storm, 1.6), "shinra_warm": (warm, 2.4), "shinra_latom": (latom, 1.5), "shinra_detonate": (detonate, 1.1),
    "shinra_latom_boom": (latom_boom, 2.0),
}
if __name__ == "__main__":
    args = sys.argv[1:]
    only = set()
    if "--only" in args:
        i = args.index("--only")
        only = set(args[i + 1].split(","))
        args = args[:i] + args[i + 2:]
    outs = args or ["client/public/effect_sound/shinra"]
    for o in outs:
        os.makedirs(o, exist_ok=True)
    for name, (fn, dur) in SOUNDS.items():
        if only and name not in only:
            continue
        write(name, fn(), dur, outs)
