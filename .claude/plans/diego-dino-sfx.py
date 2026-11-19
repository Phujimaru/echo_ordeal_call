# สังเคราะห์เสียงของดิเอโก้ แบรนโด (อสูรกายดึกดำบรรพ์) (characters/diego_dino.js · GRID_PLAN §7.36) — numpy ล้วน ไม่ดาวน์โหลด
#  python -I .claude/plans/diego-dino-sfx.py [โฟลเดอร์ปลายทาง] [--only dino_claw,...]
#   ปกติ client/public/effect_sound/diego_dino (track ใน git — ไฟล์เล็ก)
#  ใช้ตัวช่วยของ shinra-sfx.py / law-sfx.py (มาสเตอร์ -16 LUFS · AAC .m4a)
#  action ที่มีคลิป (ฉันจะฆ่าแก กด / ตีใส่คนที่ถูกฝูงไดโนเสาร์ตรึง / กลายพันธุ์ / อ๊ากกกโดน / ย่ำกระหม่อม) ไม่มีเสียงพวกนี้ซ้อน
#   dino_claw     ตีปกติร่างคน: ตะปบกรงเล็บ (หวือสั้น → ข่วนฉีก)
#   dino_bite     ตีปกติร่างไดโนเสาร์: อ้าปาก → งับ (ฟันกระทบ + ตุบ)
#   dino_crack    อย่ามาดูถูกกันนะ: เกราะแตกร้าว → เกล็ดงอก (เสียงกรอบ + คำรามต่ำในคอ)
#   dino_virus    ไวรัสบรรพกาลติด: ฟู่ฟ่อง + ชีพจรต่ำ
#   dino_possess  เข้าร่วมเผ่าพันธุ์: หัวใจเต้นตุบ ×3 + โทนหลอนลากต่ำขึ้น
#   dino_charge   ว๊ากกก: ฝีเท้าหนักวิ่งรัว + ลมพุ่ง
#   dino_slam     ว๊ากกกชน (ชนขอบ/สิ่งกีดขวาง): กระแทกหนัก + เศษหิน
#   dino_leap     อ๊ากกกไม่โดนใคร: กระโดดหวือ → ลงพื้นตุบ
#   dino_drain    ดูดแต้มสกิล: ประกายไหลลง (โทนเขียวพิษ)
#   dino_revert   คืนร่าง: เกล็ดหดกรอบแกรบ + ลมหายใจออก
import importlib.util, os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("shinrasfx", os.path.join(HERE, "shinra-sfx.py"))
S = importlib.util.module_from_spec(spec)
spec.loader.exec_module(S)
L = S.L
SR, T, buf, put, noise, band, sweep_band = L.SR, L.T, L.buf, L.put, L.noise, L.band, L.sweep_band
env_exp, env_lin, tone, chirp, thump, crash, rumble, reverb, softclip, write, debris = (
    L.env_exp, L.env_lin, L.tone, L.chirp, L.thump, L.crash, L.rumble, L.reverb, L.softclip, L.write, L.debris)
whoosh = S.whoosh
rng = np.random.default_rng(1887)


def scratch(dur=0.22, amp=0.8, lo=1800, hi=7500):
    # ข่วนฉีก: นอยส์ช่วงสูงเป็นเม็ดถี่ (เนื้อผ้า/ผิวถูกกรีด)
    t = T(dur)
    grit = (np.sin(2 * np.pi * 95 * t) > 0.2).astype(float) * 0.6 + 0.4
    return amp * band(noise(dur), lo, hi, 0.25) * grit * env_lin(dur, 0.01, dur - 0.01)


def growl(dur, f=72, amp=0.6):
    # คำรามต่ำในคอ: ฟันเลื่อยความถี่ต่ำ + สั่นแอมพลิจูด
    t = T(dur)
    saw = 2 * ((f * t * (1 + 0.05 * np.sin(2 * np.pi * 3 * t))) % 1) - 1
    am = 0.6 + 0.4 * np.sin(2 * np.pi * 23 * t + rng.uniform(0, 6))
    return amp * band(saw * am, 50, 900, 0.3) * env_lin(dur, 0.06, dur * 0.4)


def snap(amp=1.0):
    # ฟันกระทบ: คลิกแข็งสองชั้น
    d = 0.08
    t = T(d)
    x = band(noise(d), 1200, 6000, 0.2) * env_exp(d, 140) + 0.5 * np.sin(2 * np.pi * 1450 * t) * env_exp(d, 90)
    return amp * x


def step(amp=0.8):
    return thump(0.22, 120, 45, 16, amp) + 0.25 * band(noise(0.22), 200, 1400, 0.3) * env_exp(0.22, 40)


def claw():
    d = 0.6; o = buf(d)
    put(o, whoosh(0.16, 600, 2400, 0.5), 0.0)
    put(o, scratch(0.18, 0.9), 0.13)
    put(o, scratch(0.12, 0.5, 2500, 9000), 0.2)
    put(o, thump(0.15, 140, 60, 20, 0.35), 0.13)
    return reverb(o, 0.15, 0.6)


def bite():
    d = 0.75; o = buf(d)
    put(o, growl(0.25, 90, 0.35), 0.0)
    put(o, whoosh(0.12, 400, 1600, 0.35), 0.14)
    put(o, snap(1.0), 0.26)
    put(o, snap(0.6), 0.29)
    put(o, thump(0.25, 110, 40, 12, 0.7), 0.26)
    put(o, scratch(0.14, 0.4, 1200, 5000), 0.3)
    return reverb(o, 0.15, 0.7)


def crack():
    d = 1.3; o = buf(d)
    for i in range(7):
        put(o, snap(rng.uniform(0.4, 0.9)), 0.04 * i + rng.uniform(0, 0.02))
    put(o, crash(0.3, 14, 900, 8000, 0.35), 0.0)
    put(o, growl(0.9, 64, 0.7), 0.3)
    put(o, thump(0.3, 80, 40, 8, 0.5), 0.3)
    return reverb(o, 0.2, 0.9)


def virus():
    d = 0.7; o = buf(d)
    t = T(0.6)
    bub = band(noise(0.6), 300, 2600, 0.3) * (0.5 + 0.5 * np.sin(2 * np.pi * 17 * t)) * env_lin(0.6, 0.04, 0.4)
    put(o, 0.6 * bub, 0.0)
    put(o, chirp(0.45, 180, 90, 0.35), 0.05)
    for i in range(5):
        put(o, tone(0.07, rng.uniform(500, 900), 40, 0.25), 0.05 + 0.1 * i)
    return reverb(o, 0.25, 0.8)


def possess():
    d = 2.0; o = buf(d)
    for i, at in enumerate((0.0, 0.42, 0.84)):
        put(o, thump(0.25, 70, 38, 12, 0.9), at)
        put(o, thump(0.2, 60, 34, 14, 0.5), at + 0.16)
    t = T(1.8)
    drone = sum(np.sin(2 * np.pi * f * t * (1 + 0.6 * t / 1.8)) for f in (55, 82.5, 110)) / 3
    put(o, 0.5 * drone * env_lin(1.8, 0.6, 0.6), 0.1)
    put(o, growl(1.0, 58, 0.45), 0.9)
    return reverb(o, 0.3, 1.4)


def charge():
    d = 1.1; o = buf(d)
    for i in range(6):
        put(o, step(0.55 + 0.08 * i), 0.0 + 0.13 * i)
    put(o, whoosh(0.8, 250, 1800, 0.6), 0.15)
    put(o, growl(0.5, 80, 0.4), 0.0)
    return reverb(o, 0.15, 0.8)


def slam():
    d = 1.0; o = buf(d)
    put(o, thump(0.4, 95, 32, 7, 1.0), 0.0)
    put(o, crash(0.45, 9, 300, 6000, 0.55), 0.0)
    debris(o, 0.05, 0.6, 14, (0.08, 0.25), 600, 5000, 60)
    return reverb(o, 0.2, 1.0)


def leap():
    d = 1.0; o = buf(d)
    put(o, step(0.6), 0.0)
    put(o, whoosh(0.45, 300, 1500, 0.6), 0.05)
    put(o, thump(0.35, 100, 36, 9, 0.9), 0.52)
    debris(o, 0.55, 0.35, 8, (0.06, 0.18), 700, 5000, 70)
    return reverb(o, 0.18, 0.8)


def drain():
    d = 0.9; o = buf(d)
    for i in range(8):
        f = 1800 * (0.82 ** i)
        put(o, tone(0.14, f, 22, 0.35, partials=((1, 1), (2, 0.3))), 0.07 * i)
    put(o, chirp(0.6, 900, 200, 0.25), 0.05)
    return reverb(o, 0.3, 1.0)


def revert():
    d = 1.0; o = buf(d)
    for i in range(10):
        put(o, snap(rng.uniform(0.2, 0.5)), 0.03 * i + rng.uniform(0, 0.02))
    t = T(0.7)
    breath = band(noise(0.7), 300, 2200, 0.3) * env_lin(0.7, 0.1, 0.5)
    put(o, 0.45 * breath, 0.3)
    return reverb(o, 0.2, 0.8)


SOUNDS = {
    "dino_claw": (claw, 0.6), "dino_bite": (bite, 0.75), "dino_crack": (crack, 1.3), "dino_virus": (virus, 0.7),
    "dino_possess": (possess, 2.0), "dino_charge": (charge, 1.1), "dino_slam": (slam, 1.0), "dino_leap": (leap, 1.0),
    "dino_drain": (drain, 0.9), "dino_revert": (revert, 1.0),
}
if __name__ == "__main__":
    args = sys.argv[1:]
    only = set()
    if "--only" in args:
        i = args.index("--only")
        only = set(args[i + 1].split(","))
        args = args[:i] + args[i + 2:]
    outs = args or ["client/public/effect_sound/diego_dino"]
    for o in outs:
        os.makedirs(o, exist_ok=True)
    for name, (fn, dur) in SOUNDS.items():
        if only and name not in only:
            continue
        write(name, fn(), dur, outs)
