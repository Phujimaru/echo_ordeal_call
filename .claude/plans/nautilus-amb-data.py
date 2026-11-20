# เสียงบรรยากาศ Nautilus ชั้น 6 ทะเลข้อมูลจินตภาพ (2026-11-19 · ผู้ใช้ "เอาทั้งหมด": เสียงบรรยากาศของชั้นนี้เอง) — สังเคราะห์ล้วน ไม่มีไฟล์ต้นฉบับ
#  ชั้นเสียง: โดรนต่ำสองเสียงแกว่งช้า · คอร์ดแพดเย็นค่อยๆ บวม · ลมข้อมูลความถี่สูงเบาๆ · เสียงบี๊บดิจิทัลโปรยห่างไม่เท่ากัน (ระดับเสียง/ช่องซ้ายขวาสุ่ม)
#   · ปิงโซนาร์ลึกนานๆ ครั้ง · ไม่มีคลิปสั้นวนซ้ำ (กฎผู้ใช้: ห้ามได้ยินวนซ้ำ) — ยาว 160 วิ จางหัวท้ายให้ต่อวนเนียน
#  python .claude/plans/nautilus-amb-data.py [ปลายทาง=client/public/nautilus/sfx]   (ต้องมี numpy + ffmpeg)
import os, subprocess, sys, tempfile, wave
import numpy as np

OUT = sys.argv[1] if len(sys.argv) > 1 else "client/public/nautilus/sfx"
SR, LEN = 44100, 160.0
rng = np.random.default_rng(612)
n = int(SR * LEN)
t = np.arange(n) / SR
L = np.zeros(n); R = np.zeros(n)

def add(sig, at, pan=0.0, gain=1.0):
    i0 = int(at * SR); i1 = min(n, i0 + len(sig))
    if i1 <= i0: return
    s = sig[: i1 - i0] * gain
    L[i0:i1] += s * np.sqrt((1 - pan) / 2); R[i0:i1] += s * np.sqrt((1 + pan) / 2)

# โดรน: 55 Hz + 82.4 Hz แกว่งช้า (ไม่ลงจังหวะกัน)
drone = 0.22 * np.sin(2 * np.pi * 55 * t + 0.4 * np.sin(2 * np.pi * 0.05 * t)) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.031 * t))
drone += 0.14 * np.sin(2 * np.pi * 82.41 * t + 0.3 * np.sin(2 * np.pi * 0.071 * t)) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.023 * t + 1))
L += drone; R += drone * 0.96
# แพดเย็น (A–C–E–B) บวมช้าคนละจังหวะ ซ้ายขวาเหลื่อมกันนิด
for f, ph, rate in [(220, 0, 0.017), (261.63, 1.3, 0.021), (329.63, 2.1, 0.013), (493.88, 0.7, 0.027)]:
    env = np.clip(np.sin(2 * np.pi * rate * t + ph), 0, 1) ** 2
    v = 0.035 * env * (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2.003 * t))
    L += v; R += 0.035 * env * (np.sin(2 * np.pi * f * 1.002 * t + 0.5) + 0.3 * np.sin(2 * np.pi * f * 2.0 * t))
# ลมข้อมูล: นอยส์ผ่านกรองแถบ 3–7 kHz (ฟูเรียร์) บวมช้า
def band(lo, hi, amp):
    spec = np.fft.rfft(rng.standard_normal(n)); fr = np.fft.rfftfreq(n, 1 / SR)
    spec[(fr < lo) | (fr > hi)] = 0
    x = np.fft.irfft(spec, n); return amp * x / (np.abs(x).max() + 1e-9)
air = band(3000, 7000, 0.04) * (0.4 + 0.6 * np.clip(np.sin(2 * np.pi * 0.019 * t), 0, 1))
L += air; R += np.roll(air, 1200)
# บี๊บดิจิทัล: โปรยห่าง 1.5–6 วิ ไม่เท่ากัน · เสียงไล่ขึ้น/ลง/กระพริบ 2–4 ครั้ง
at = 2.0
while at < LEN - 3:
    kind = rng.integers(0, 3); f0 = rng.uniform(900, 2600); d = rng.uniform(0.06, 0.18)
    k = np.arange(int(d * SR)) / SR
    if kind == 0: sig = np.sin(2 * np.pi * (f0 * k + rng.uniform(-2000, 2000) * k * k)) * np.exp(-k * 25)
    elif kind == 1: sig = np.concatenate([np.sin(2 * np.pi * f0 * k[: len(k) // 3]) * np.exp(-k[: len(k) // 3] * 40), np.zeros(int(0.05 * SR))] * int(rng.integers(2, 5)))
    else: sig = np.sign(np.sin(2 * np.pi * f0 * 0.5 * k)) * np.exp(-k * 35) * 0.5
    add(sig, at, pan=rng.uniform(-0.8, 0.8), gain=rng.uniform(0.03, 0.07))
    at += rng.uniform(1.5, 6.0)
# ปิงโซนาร์ลึก: ทุก 17–34 วิ
at = rng.uniform(6, 14)
while at < LEN - 8:
    k = np.arange(int(6 * SR)) / SR; f = rng.uniform(380, 520)
    sig = (np.sin(2 * np.pi * f * k) + 0.4 * np.sin(2 * np.pi * f * 1.5 * k)) * np.exp(-k * 0.9) * (1 - np.exp(-k * 80))
    add(sig, at, pan=rng.uniform(-0.4, 0.4), gain=0.07)
    at += rng.uniform(17, 34)
# จางหัวท้าย 2 วิ (วนต่อกันเนียน)
fade = np.ones(n); m = int(2 * SR); fade[:m] = np.linspace(0, 1, m); fade[-m:] = np.linspace(1, 0, m)
L *= fade; R *= fade
pk = max(np.abs(L).max(), np.abs(R).max()) + 1e-9
pcm = (np.stack([L, R], axis=1) / pk * 0.9 * 32767).astype(np.int16)
tmp = os.path.join(tempfile.gettempdir(), "amb_data.wav")
with wave.open(tmp, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
dst = os.path.join(OUT, "amb_data.mp3")
subprocess.check_call(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", tmp, "-af", "loudnorm=I=-18:TP=-1:LRA=11", "-ar", "44100", "-b:a", "160k", dst])
os.remove(tmp)
print("amb_data ->", dst)
