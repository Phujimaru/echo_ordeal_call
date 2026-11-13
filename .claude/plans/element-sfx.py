# สังเคราะห์เสียงระบบธาตุ (server/element.js · GRID_PLAN §8.7) — numpy ล้วน ไม่ดาวน์โหลด (ผู้ใช้อนุญาต 2026-11-14: "ใช้เสียงสังเคราะห์")
#  python -I .claude/plans/element-sfx.py [โฟลเดอร์ปลายทาง] [--only elem_burst,...]
#   ปกติ client/public/effect_sound/element (track ใน git — ไฟล์เล็ก)
#  ใช้ตัวช่วยสังเคราะห์/มาสเตอร์ชุดเดียวกับ law-sfx.py (-16 LUFS · AAC .m4a 192k)
#  ปฏิกิริยา: elem_burst ปะทุ · elem_blast ระเบิด · elem_vapor ระเหย · elem_erode กัดเซาะ · elem_freeze เยือกแข็ง · elem_conduct นำไฟฟ้า · elem_swirl พัดพา
#  ระเบิดธาตุ: elem_bomb_fire / ice / bolt / water / wind
import importlib.util, os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("lawsfx", os.path.join(HERE, "law-sfx.py"))
L = importlib.util.module_from_spec(spec)
spec.loader.exec_module(L)
SR, T, buf, put, noise, band, sweep_band = L.SR, L.T, L.buf, L.put, L.noise, L.band, L.sweep_band
env_exp, env_lin, tone, chirp, bell, thump, crash, rumble, reverb, softclip, write = (
    L.env_exp, L.env_lin, L.tone, L.chirp, L.bell, L.thump, L.crash, L.rumble, L.reverb, L.softclip, L.write)
rng = np.random.default_rng(1114)


def shatter(o, at, count=18, amp=0.35):
    # แก้ว/น้ำแข็งแตก: ระฆังเสียงสูงสั้นๆ กระจาย + ซ่าสูง
    put(o, crash(0.12, 30, 3000, 12000, amp), at)
    for _ in range(count):
        u = rng.uniform(0, 1) ** 1.5
        put(o, bell(0.18, rng.uniform(1800, 5200), 28, amp * rng.uniform(0.25, 0.6) * (1 - 0.6 * u)), at + u * 0.32)


def zap(dur, f=110, amp=0.6, rate=38):
    # ไฟฟ้าซ่า: คลื่นฟันเลื่อยทุ้ม + noise กรองสูง ตัดเป็นช่วงถี่ไม่สม่ำเสมอ
    t = T(dur)
    saw = 2 * ((f * t + 0.3 * np.sin(2 * np.pi * 7 * t)) % 1) - 1
    steps = rng.uniform(0.15, 1.0, int(dur * rate) + 2)
    g = np.interp(t * rate, np.arange(len(steps)), steps)
    hiss = band(noise(dur), 2500, 11000)
    return amp * (0.55 * saw + 0.6 * hiss) * g


def thunder_crack(o, at, amp=0.8):
    put(o, crash(0.05, 60, 1500, 12000, amp), at)
    put(o, zap(0.18, 140, amp * 0.5), at)
    put(o, rumble(0.9, 30, 220, amp * 0.6) * env_lin(0.9, 0.04, 0.86), at + 0.03)


def sizzle(dur, amp=0.6):
    # ฉ่า: noise สูงกรองแบนด์ + สั่นแอมป์ถี่ (ฟองแตก)
    t = T(dur)
    flutter = 0.6 + 0.4 * np.abs(np.sin(2 * np.pi * rng.uniform(18, 26) * t + rng.uniform(0, 3)))
    return amp * band(noise(dur), 2200, 10000, 0.3) * flutter * env_lin(dur, 0.02, dur - 0.02)


def whoosh(dur, f0=300, f1=1400, amp=0.7):
    t = T(dur)
    return amp * sweep_band(dur, f0, f1, 0.8) * np.sin(np.pi * np.minimum(1, t / dur))


def toss(o, at=0.0):
    # ลูกระเบิดลอย: ลมแหวกสั้น + ป๊อก
    put(o, whoosh(0.35, 500, 1600, 0.25), at)
    put(o, tone(0.06, 520, 60, 0.3), at)


# ---------------------------------------------------------------- ปฏิกิริยา
def burst():  # ปะทุ: ตูมหนัก + แก้วแตก
    d = 1.0; o = buf(d)
    put(o, thump(0.5, 120, 40, 7, 1.0), 0)
    put(o, crash(0.4, 9, 200, 6000, 0.55), 0)
    put(o, rumble(0.7, 30, 200, 0.45) * env_lin(0.7, 0.01, 0.69), 0.02)
    shatter(o, 0.05, 22, 0.4)
    return softclip(reverb(o, 0.2, 1.0), 1.6)


def blast():  # ระเบิด: ระเบิดดัง + ฟ้าผ่า
    d = 1.3; o = buf(d)
    put(o, thump(0.7, 100, 32, 5, 1.0), 0)
    put(o, crash(0.8, 5, 150, 7000, 0.8), 0)
    put(o, rumble(1.1, 25, 260, 0.6) * env_lin(1.1, 0.02, 1.08), 0.03)
    thunder_crack(o, 0.04, 0.6)
    return softclip(reverb(o, 0.22, 1.3), 1.8)


def vapor():  # ระเหย: ฉ่า น้ำราดเหล็กร้อน
    d = 1.1; o = buf(d)
    put(o, crash(0.06, 40, 800, 6000, 0.4), 0)
    put(o, sizzle(1.0, 0.7) * env_exp(1.0, 2.6, 0.01), 0.01)
    put(o, band(noise(0.9), 300, 1200) * 0.18 * env_exp(0.9, 4), 0.02)
    return reverb(o, 0.12, 0.6)


def erode():  # กัดเซาะ: น้ำแข็งร้าว แล้วไฟฟ้าช็อต
    d = 0.95; o = buf(d)
    for i in range(7):
        put(o, crash(0.02, 120, 2000, 11000, 0.3), i * 0.035 + rng.uniform(0, 0.01))
        put(o, bell(0.12, rng.uniform(2500, 4800), 35, 0.2), i * 0.035)
    put(o, zap(0.45, 95, 0.75) * env_lin(0.45, 0.005, 0.44), 0.3)
    put(o, crash(0.06, 50, 1500, 12000, 0.6), 0.3)
    shatter(o, 0.36, 12, 0.25)
    return softclip(reverb(o, 0.15, 0.7), 1.5)


def freeze():  # เยือกแข็ง: น้ำแข็งก่อตัว กรอบแกรบ
    d = 1.0; o = buf(d)
    put(o, chirp(0.5, 900, 3200, 0.18, "exp", 3) * env_lin(0.5, 0.3, 0.2), 0)
    for i in range(26):
        at = (i / 26) ** 0.8 * 0.55
        put(o, crash(0.015, 150, 2500, 11000, rng.uniform(0.15, 0.35)), at)
    for f in (2093, 2637, 3136, 4186):
        put(o, bell(0.5, f, 6, 0.12), 0.5)
    return reverb(o, 0.3, 1.2)


def conduct():  # นำไฟฟ้า: ไฟฟ้าซ่าแหลม
    d = 0.8; o = buf(d)
    put(o, zap(0.6, 180, 0.8) * env_lin(0.6, 0.005, 0.59), 0)
    put(o, crash(0.05, 50, 2500, 12000, 0.7), 0)
    put(o, chirp(0.3, 3000, 900, 0.15) * env_exp(0.3, 8), 0.02)
    return softclip(reverb(o, 0.12, 0.5), 1.5)


def swirl():  # พัดพา: ลมหวีดหวิว
    d = 1.1; o = buf(d)
    put(o, whoosh(1.0, 250, 1800, 0.8), 0)
    put(o, chirp(0.9, 600, 1300, 0.08, "exp", 2) * np.sin(np.pi * np.minimum(1, T(0.9) / 0.9)), 0.08)
    return reverb(o, 0.25, 1.0)


# ---------------------------------------------------------------- ระเบิดธาตุ (โยน → แตก ที่ ~0.48 วิ ตรงกับภาพ)
HIT = 0.6  # ตรงกับภาพ: ลอย BOMB_FLY 0.3 × 2 วิ (elementBombFx.js)


def bomb_fire():
    d = 1.5; o = buf(d); toss(o)
    put(o, thump(0.5, 90, 40, 7, 0.8), HIT)
    put(o, band(noise(0.8), 150, 2500) * 0.6 * env_exp(0.8, 3.5, 0.02), HIT)  # ฟู่ไฟลุก
    return softclip(reverb(o, 0.18, 0.9), 1.5)


def bomb_ice():
    d = 1.5; o = buf(d); toss(o)
    put(o, thump(0.3, 140, 60, 10, 0.5), HIT)
    shatter(o, HIT, 20, 0.45)
    return reverb(o, 0.25, 1.0)


def bomb_bolt():
    d = 1.5; o = buf(d); toss(o)
    put(o, zap(0.4, 150, 0.7) * env_lin(0.4, 0.005, 0.39), HIT)
    thunder_crack(o, HIT, 0.5)
    return softclip(reverb(o, 0.15, 0.8), 1.5)


def bomb_water():
    d = 1.5; o = buf(d); toss(o)
    put(o, thump(0.25, 160, 70, 12, 0.5), HIT)
    put(o, band(noise(0.5), 400, 5000) * 0.7 * env_exp(0.5, 7, 0.005), HIT)  # สาด
    for _ in range(14):  # หยดตกกลับ
        put(o, chirp(0.05, rng.uniform(700, 1400), rng.uniform(1600, 2600), 0.12) * env_exp(0.05, 50), HIT + 0.12 + rng.uniform(0, 0.5))
    return reverb(o, 0.2, 0.8)


def bomb_wind():
    d = 1.5; o = buf(d); toss(o)
    put(o, thump(0.2, 110, 60, 14, 0.4), HIT)
    put(o, whoosh(0.8, 200, 1500, 0.8), HIT)
    return reverb(o, 0.25, 1.0)


SOUNDS = {
    "elem_burst": (burst, 1.0), "elem_blast": (blast, 1.3), "elem_vapor": (vapor, 1.1), "elem_erode": (erode, 0.95),
    "elem_freeze": (freeze, 1.0), "elem_conduct": (conduct, 0.8), "elem_swirl": (swirl, 1.1),
    "elem_bomb_fire": (bomb_fire, 1.5), "elem_bomb_ice": (bomb_ice, 1.5), "elem_bomb_bolt": (bomb_bolt, 1.5),
    "elem_bomb_water": (bomb_water, 1.5), "elem_bomb_wind": (bomb_wind, 1.5),
}
if __name__ == "__main__":
    args = sys.argv[1:]
    only = set()
    if "--only" in args:
        i = args.index("--only")
        only = set(args[i + 1].split(","))
        args = args[:i] + args[i + 2:]
    outs = args or ["client/public/effect_sound/element"]
    for name, (fn, dur) in SOUNDS.items():
        if only and name not in only:
            continue
        write(name, fn(), dur, outs)
