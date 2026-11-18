# สังเคราะห์เสียงของแม็กน่า สวิง (characters/magna.js · GRID_PLAN §7.35) — numpy ล้วน ไม่ดาวน์โหลด
#  python -I .claude/plans/magna-sfx.py [โฟลเดอร์ปลายทาง] [--only magna_swing,...]
#   ปกติ client/public/effect_sound/magna (track ใน git — ไฟล์เล็ก)
#  ใช้ตัวช่วยไฟของ shinra-sfx.py (ซึ่งใช้มาสเตอร์ของ law-sfx.py: -16 LUFS · AAC .m4a)
#  action ที่มีคลิป (Deathmatch โดน / Finisher ทำงาน) ไม่มีเสียงพวกนี้ซ้อน — pull/fin_hit/chain_break เล่นหลังคลิปจบ
#   magna_swing        ตีปกติ: เหวี่ยงไม้ → ไม้กระทบ (ตอกไม้) → ไฟปะทุ (ปะทะ 0.29 วิ = MAGNA_HIT_P × MAGNA_MS)
#   magna_knuckle      ตีปกติระหว่าง Fire Knuckle / กด Fire Knuckle: หมัดไฟ → ไฟพ่น
#   magna_ball         Fire Ball: ไฟวนเข้าศูนย์ → ลูกไฟก่อตัว (พรึ่บเล็ก)
#   magna_bat          Baseball bat: เหวี่ยงไม้ → "โป๊ก" → บอลไฟพุ่งหวือ
#   magna_bat_hit      บอลไฟระเบิดที่เป้า
#   magna_boost        Fire Boost: ไฟพ่นใต้เท้าคำราม
#   magna_throw        Deathmatch พลาด: ปาหวือ + โซ่ลากกรุ๊งกริ๊ง
#   magna_arm          Finisher กด: โซ่สั่นกรุ๊งกริ๊ง + ประกายเวทใส (โทนฟ้า)
#   magna_pull         Finisher ดึง: โซ่กระชาก + หวือเข้าหา
#   magna_fin_hit      Finisher ปะทะ: ระเบิดไฟ + เวทแตกใส
#   magna_chain_break  โซ่ขาด: เหล็กแตกกระจาย + ถ่านไฟร่วง
import importlib.util, os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("shinrasfx", os.path.join(HERE, "shinra-sfx.py"))
S = importlib.util.module_from_spec(spec)
spec.loader.exec_module(S)
L = S.L
SR, T, buf, put, noise, band, sweep_band = L.SR, L.T, L.buf, L.put, L.noise, L.band, L.sweep_band
env_exp, env_lin, tone, chirp, thump, crash, rumble, reverb, softclip, write = (
    L.env_exp, L.env_lin, L.tone, L.chirp, L.thump, L.crash, L.rumble, L.reverb, L.softclip, L.write)
roar, crackle, jet, fwoomp, whoosh, swirl = S.roar, S.crackle, S.jet, S.fwoomp, S.whoosh, S.swirl
rng = np.random.default_rng(5150)


def clink(amp=0.5, f=None):
    # ข้อโซ่กระทบ: โลหะ (โอเวอร์โทนไม่ลงตัว) หางสั้น
    f = f or rng.uniform(1900, 3200)
    d = 0.22
    t = T(d)
    x = sum(a * np.sin(2 * np.pi * f * r * t) for r, a in ((1, 1.0), (2.76, 0.5), (5.4, 0.25), (8.9, 0.12)))
    x = x * env_exp(d, rng.uniform(22, 35)) + 0.3 * band(noise(d), 3000, 9000, 0.2) * env_exp(d, 90)
    return amp * x


def rattle(dur, rate=22, amp=0.45):
    o = buf(dur)
    for _ in range(int(dur * rate)):
        put(o, clink(amp * rng.uniform(0.4, 1.0)), rng.uniform(0, max(0.001, dur - 0.2)))
    return o


def wood_crack(amp=0.9):
    # ไม้เบสบอลกระทบ: ป๊อกไม้ (เรโซแนนซ์กลาง) + ทรานเซียนต์
    d = 0.25
    t = T(d)
    x = np.sin(2 * np.pi * 620 * t) * env_exp(d, 40) + 0.6 * np.sin(2 * np.pi * 1180 * t) * env_exp(d, 55)
    x += 0.8 * band(noise(d), 800, 5000, 0.3) * env_exp(d, 120)
    return amp * x


def shimmer(dur, amp=0.35):
    # ประกายเวทใส (มานาโทนฟ้า): เสียงระฆังสูงซ้อนกระพริบ
    t = T(dur)
    o = np.zeros_like(t)
    for f in (1760, 2217, 2637, 3520):
        o += np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) * (0.6 + 0.4 * np.sin(2 * np.pi * rng.uniform(5, 11) * t))
    return amp * 0.25 * o * env_lin(dur, 0.05, dur * 0.6)


HIT_SWING = 0.29
HIT_KNUCKLE = 0.27


def swing():
    d = 0.95; o = buf(d)
    put(o, whoosh(0.26, 250, 1600, 0.55), 0.03)
    put(o, wood_crack(0.8), HIT_SWING)
    put(o, thump(0.22, 120, 50, 12, 0.7), HIT_SWING)
    put(o, fwoomp(0.45, 0.75, 85), HIT_SWING + 0.01)
    put(o, crackle(0.5, 40, 0.32), HIT_SWING + 0.04)
    return reverb(o, 0.18, 0.9)


def knuckle():
    d = 1.0; o = buf(d)
    put(o, fwoomp(0.3, 0.5, 90), 0.0)
    put(o, whoosh(0.2, 400, 1800, 0.5), 0.08)
    put(o, thump(0.25, 110, 42, 10, 0.95), HIT_KNUCKLE)
    put(o, jet(0.45, 600, 2400, 0.55) * env_lin(0.45, 0.01, 0.35), HIT_KNUCKLE + 0.01)
    put(o, crackle(0.55, 45, 0.35), HIT_KNUCKLE + 0.05)
    return reverb(o, 0.2, 1.0)


def ball():
    d = 0.95; o = buf(d)
    put(o, swirl(0.5, 0.5, 2.5), 0.0)
    put(o, fwoomp(0.45, 0.65, 95), 0.38)
    put(o, crackle(0.5, 25, 0.25), 0.42)
    return reverb(o, 0.18, 0.9)


def bat():
    d = 1.0; o = buf(d)
    put(o, whoosh(0.18, 300, 1500, 0.5), 0.0)
    put(o, wood_crack(1.0), 0.17)
    put(o, fwoomp(0.3, 0.55, 100), 0.18)
    put(o, whoosh(0.4, 1800, 600, 0.55), 0.2)                                        # บอลไฟพุ่งหวือ
    put(o, roar(0.35, 300, 3000, 0.25) * env_lin(0.35, 0.02, 0.25), 0.22)
    return reverb(o, 0.18, 0.9)


def bat_hit():
    d = 0.9; o = buf(d)
    put(o, thump(0.3, 120, 40, 9, 0.9), 0.0)
    put(o, fwoomp(0.45, 0.85, 70), 0.0)
    put(o, crash(0.4, 9, 300, 7000, 0.4), 0.0)
    put(o, crackle(0.6, 50, 0.38), 0.03)
    return reverb(o, 0.22, 1.0)


def boost():
    d = 1.3; o = buf(d)
    put(o, fwoomp(0.45, 0.85, 70), 0.0)
    put(o, jet(1.0, 450, 2600, 0.6) * env_lin(1.0, 0.05, 0.55), 0.08)
    put(o, crackle(1.0, 35, 0.3), 0.12)
    return reverb(o, 0.2, 1.1)


def throw():
    d = 1.1; o = buf(d)
    put(o, whoosh(0.35, 300, 1700, 0.55), 0.0)
    put(o, rattle(0.6, 26, 0.35), 0.05)
    put(o, roar(0.5, 250, 2600, 0.25) * env_lin(0.5, 0.05, 0.35), 0.05)
    return reverb(o, 0.2, 1.0)


def arm():
    d = 1.2; o = buf(d)
    put(o, rattle(0.55, 30, 0.45), 0.0)
    put(o, shimmer(1.0, 0.5), 0.1)
    put(o, sweep_band(0.6, 600, 4200, 0.6) * env_lin(0.6, 0.2, 0.35) * 0.3, 0.1)
    return reverb(o, 0.3, 1.3)


def pull():
    d = 0.9; o = buf(d)
    put(o, clink(0.8, 2400), 0.0)
    put(o, rattle(0.35, 40, 0.5), 0.0)
    put(o, whoosh(0.45, 1600, 350, 0.7), 0.05)
    put(o, thump(0.2, 140, 60, 14, 0.6), 0.48)
    return reverb(o, 0.2, 0.9)


def fin_hit():
    d = 1.5; o = buf(d)
    put(o, thump(0.4, 110, 30, 7, 1.0), 0.0)
    put(o, crash(0.7, 7, 250, 9000, 0.7), 0.0)
    put(o, fwoomp(0.5, 0.9, 55), 0.0)
    put(o, shimmer(0.9, 0.55), 0.08)
    put(o, roar(0.9, 80, 2200, 0.4) * env_lin(0.9, 0.03, 0.7), 0.05)
    put(o, crackle(1.0, 55, 0.4), 0.08)
    return reverb(o, 0.3, 1.5)


def chain_break():
    d = 1.1; o = buf(d)
    for i in range(9):
        put(o, clink(rng.uniform(0.5, 0.9)), 0.02 * i + rng.uniform(0, 0.02))
    put(o, crash(0.35, 12, 1500, 9000, 0.35), 0.0)
    put(o, crackle(0.9, 30, 0.3), 0.1)
    return reverb(o, 0.25, 1.1)


SOUNDS = {
    "magna_swing": (swing, 0.95), "magna_knuckle": (knuckle, 1.0), "magna_ball": (ball, 0.95), "magna_bat": (bat, 1.0),
    "magna_bat_hit": (bat_hit, 0.9), "magna_boost": (boost, 1.3), "magna_throw": (throw, 1.1), "magna_arm": (arm, 1.2),
    "magna_pull": (pull, 0.9), "magna_fin_hit": (fin_hit, 1.5), "magna_chain_break": (chain_break, 1.1),
}
if __name__ == "__main__":
    args = sys.argv[1:]
    only = set()
    if "--only" in args:
        i = args.index("--only")
        only = set(args[i + 1].split(","))
        args = args[:i] + args[i + 2:]
    outs = args or ["client/public/effect_sound/magna"]
    for o in outs:
        os.makedirs(o, exist_ok=True)
    for name, (fn, dur) in SOUNDS.items():
        if only and name not in only:
            continue
        write(name, fn(), dur, outs)
