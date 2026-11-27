# ฉากหลังสนามกลืนกินของโอเบรอน (วอร์ติเกิร์น) — สร้างเลียนภาพอ้างอิงของผู้ใช้ (2026-11-27)
#  อุโมงค์หินหลายเหลี่ยมซ้อนกันเป็นชั้นๆ ลึกเข้าหาหลุมดำด้านซ้ายกลาง · ชั้นในแดงเลือดเรือง · ชั้นนอกหินน้ำตาลแดง/ม่วง
#  แสงส้มพาดแนวนอนฝั่งขวา · ฝุ่น · ไม่ใช้พิกเซลของภาพอ้างอิง (สร้างใหม่ทั้งหมด)
#  ออก: abyss_bg.webp (ฉากเต็ม) + abyss_swirl.webp (ชั้นวังวนแดงโปร่ง — หมุนบนจอใน oberonTheme.animBack)
#  รัน: python .claude/plans/oberon-abyss-bg.py <โฟลเดอร์ปลายทาง>
import sys, math
import numpy as np
from PIL import Image, ImageFilter

OUT = sys.argv[1] if len(sys.argv) > 1 else "."
W, H = 2560, 1280
S = W / 1916.0  # สเกลจากพิกัดภาพอ้างอิง (1916×957)
rng = np.random.default_rng(7)

yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)

def value_noise(scale, seed):
    r = np.random.default_rng(seed)
    gw, gh = int(W / scale) + 3, int(H / scale) + 3
    grid = r.random((gh, gw)).astype(np.float32)
    gx, gy = xx / scale, yy / scale
    x0, y0 = np.floor(gx).astype(int), np.floor(gy).astype(int)
    fx, fy = gx - x0, gy - y0
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy)
    a = grid[y0, x0]; b = grid[y0, x0 + 1]; c = grid[y0 + 1, x0]; d = grid[y0 + 1, x0 + 1]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy

def fbm(base, octs, seed):
    out = np.zeros((H, W), np.float32); amp = 1.0; tot = 0
    for i in range(octs):
        out += value_noise(base / (2 ** i), seed + i) * amp; tot += amp; amp *= 0.55
    return out / tot

# ---------- ชั้นอุโมงค์ ----------
HOLE = np.array([545 * S, 575 * S])     # หลุมดำ (ลึกสุด)
OUTC = np.array([1000 * S, 430 * S])    # ศูนย์กลางชั้นนอกสุด (อุโมงค์โค้งไปทางขวา)
K = 20
R0 = 2100 * S
q = 0.78
SIDES = [8] * K
ROT_STEP = 0.21  # oberonTheme.js ต้องใช้ค่าเดียวกัน (หมุนตอนซูมวน)
JIT = rng.uniform(-0.05, 0.05, 4)  # รูปทรงเดียวกันทุกชั้น = ภาพคล้ายตัวเอง ซูม 1/q รอบหลุมแล้วซ้อนพอดี

def poly_norm(dx, dy, sides, rot, jit):
    # ระยะแบบรูปหลายเหลี่ยม (1 = ขอบ) + หยักไม่เท่ากันต่อด้าน
    ang = np.arctan2(dy, dx) - rot
    seg = 2 * math.pi / sides
    a = np.mod(ang, seg) - seg / 2
    idx = np.floor(np.mod(ang, 2 * math.pi) / seg).astype(int) % sides
    r = np.hypot(dx, dy)
    poly = r * np.cos(a) / np.cos(seg / 2)
    # หินไม่ใช่เหลี่ยมคม: ผสมวงกลม + คลื่นต่ำตามมุม
    wob = 1 + jit[0] * np.sin(ang * 2 + jit[1] * 9) + jit[2] * np.sin(ang * 5 + jit[3] * 9)
    return (0.62 * poly + 0.38 * r) / wob

depth = np.zeros((H, W), np.float32)      # ชั้นที่ลึกที่สุดที่คลุมพิกเซล (ต่อเนื่อง)
band = np.zeros((H, W), np.float32)       # ตำแหน่งในชั้น 0 = ขอบนอก → 1 = ขอบใน
for k in range(K):
    # ศูนย์กลางเลื่อนเข้าหาหลุมตามสัดส่วนเดียวกับรัศมี (คล้ายตัวเอง → วนซูมได้ไม่มีรอยต่อ)
    c = HOLE + (OUTC - HOLE) * (q ** k)
    R = R0 * (q ** k)
    rot = ROT_STEP * k + 0.35
    jit = JIT
    n = poly_norm(xx - c[0], yy - c[1], SIDES[k], rot, jit) / R
    inside = n < 1.0
    s = np.clip((1.0 - n) / (1.0 - q), 0, 1)
    depth[inside] = k + s[inside]
    band[inside] = s[inside]

dn = depth / K  # 0 นอก → 1 ลึก
tex = fbm(180 * S, 6, 11)            # เนื้อหิน
grit = fbm(22 * S, 3, 31)            # เม็ดละเอียด
streak = fbm(60 * S, 4, 51)

# สีตามความลึก: นอก = หินน้ำตาลม่วง · กลาง = แดงหม่น · ใน = แดงเลือดเรือง · ลึกสุด = ดำ
def lerp(a, b, t): return a + (b - a) * t
c_out = np.array([150, 72, 74], np.float32)
c_mid = np.array([150, 38, 36], np.float32)
c_in = np.array([195, 26, 22], np.float32)
c_deep = np.array([12, 2, 2], np.float32)
t1 = np.clip(dn / 0.32, 0, 1)[..., None]
t2 = np.clip((dn - 0.32) / 0.3, 0, 1)[..., None]
t3 = np.clip((dn - 0.8) / 0.16, 0, 1)[..., None] ** 1.2
col = lerp(lerp(lerp(c_out, c_mid, t1), c_in, t2), c_deep, t3)

# แสง: ร่องเงาขอบนอกของแต่ละชั้น (s เล็ก) → หน้าหินสว่าง → มืดลงก่อนชั้นถัดไป
edge = np.clip(band / 0.035, 0, 1) ** 0.8                 # เส้นรอยต่อชั้น (มืดบาง)
face = 0.22 + 0.78 * np.clip(np.sin(np.clip(band, 0, 1) * math.pi), 0, 1) ** 0.55   # ขอบทั้งสองข้างของชั้นมืด กลางชั้นสว่าง (เป็นแถบหินซ้อน)
crease = edge
light = edge * face
# แสงอุ่นจากขวาบน · ซ้ายมืดม่วง
lx = np.clip(xx / W, 0, 1)
warm = 0.55 + 0.6 * lx ** 1.2 + 0.55 * np.exp(-((xx - 0.47 * W) / (0.22 * W)) ** 2 - ((yy - 0.18 * H) / (0.22 * H)) ** 2) - 0.15 * (yy / H)
blot = fbm(90 * S, 5, 71)
ridge = 1 - np.abs(2 * fbm(40 * S, 4, 91) - 1)
fine = fbm(5 * S, 2, 97)
rock = (0.45 + 1.1 * tex) * (0.7 + 0.55 * grit) * (0.65 + 0.7 * np.clip(blot * 1.6 - 0.3, 0, 1)) * (0.8 + 0.2 * (1 - ridge ** 6)) * (0.5 + 0.75 * fbm(260 * S, 4, 113)) * (0.8 + 0.4 * fine)
lum = light * warm * rock
lum = lum * (0.75 + 0.5 * (1 - dn))  # ชั้นในพึ่งสีเรืองแทนแสง
img = col * lum[..., None]
# เรืองแดงชั้นใน (ไม่พึ่งแสง)
glowr = np.clip((dn - 0.3) / 0.3, 0, 1) * (1 - np.clip((dn - 0.92) / 0.08, 0, 1))
img[..., 0] += 70 * glowr * (0.6 + 0.6 * streak) * crease
img[..., 1] += 6 * glowr
# เกลียววังวน (เส้นเลือดแดงหมุนเข้าหลุม) — แบบภาพอ้างอิงที่ชั้นในเบลอเป็นเกลียว
hx, hy = xx - HOLE[0], yy - HOLE[1]
hr = np.hypot(hx, hy) + 1
th = np.arctan2(hy, hx)
sp = np.sin(th * 2 + np.log(hr) * 6.5 + streak * 4) * 0.5 + 0.5
zone = np.clip((dn - 0.28) / 0.22, 0, 1) * (1 - np.clip((dn - 0.9) / 0.08, 0, 1))
img[..., 0] += 140 * sp ** 2.5 * zone
img[..., 1] += 8 * sp ** 3 * zone
img *= (1 - 0.35 * (1 - sp) ** 2 * zone)[..., None]
# ม่วงฝั่งซ้าย
lp = np.clip(1 - xx / (W * 0.45), 0, 1) * (1 - dn) ** 1.5
img[..., 2] += 22 * lp; img[..., 0] -= 8 * lp

# ฝุ่นจุด
dots = rng.random((H, W)) < 0.0016
img[dots] *= 0.35
dots2 = rng.random((H, W)) < 0.0006
img[dots2] = img[dots2] * 0.5 + np.array([200, 140, 110]) * 0.5

# (แสงส้มพาดแนวนอนของภาพอ้างอิง — ผู้ใช้สั่งเอาออก 2026-11-27)

# ขอบมืด
vig = 1 - 0.55 * np.clip(np.hypot((xx / W - 0.45) * 1.25, (yy / H - 0.5) * 1.6) - 0.25, 0, 1) ** 1.3
img *= vig[..., None]

bg = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), "RGB").filter(ImageFilter.GaussianBlur(0.6))
bg.save(f"{OUT}/abyss_bg.webp", quality=86, method=6)

# ---------- ชั้นวังวนแดง (โปร่ง) — หมุนรอบหลุมบนจอ ----------
RS = int(560 * S)
cx, cy = int(HOLE[0]), int(HOLE[1])
padded = np.pad(np.array(bg, np.float32), ((RS, RS), (RS, RS), (0, 0)), mode="edge")
crop = padded[cy:cy + 2 * RS, cx:cx + 2 * RS].copy()
gy2, gx2 = np.mgrid[-RS:RS, -RS:RS].astype(np.float32)
rr = np.hypot(gx2, gy2) / RS
alpha = np.clip((1 - rr) / 0.35, 0, 1) ** 1.5
# เส้นเกลียวเลือด (ให้หมุนแล้วเห็นการเคลื่อน)
th = np.arctan2(gy2, gx2)
spiral = (np.sin(th * 3 + rr * 18) * 0.5 + 0.5) ** 6 * np.clip(rr * 2.2, 0, 1) * (1 - rr)
crop[..., 0] += 120 * spiral; crop[..., 1] += 10 * spiral
sw = np.dstack([np.clip(crop, 0, 255), alpha * 255]).astype(np.uint8)
Image.fromarray(sw, "RGBA").save(f"{OUT}/abyss_swirl.webp", quality=88, method=6)
print("hole px", cx, cy, "swirl radius", RS, "size", W, H)
