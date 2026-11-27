# ตัดเสียงพากย์โอเบรอน (วอร์ติเกิร์น) จากคลิปอัดหน้ารายการเสียงของผู้ใช้ (เสียงพากย์.mp4 · 2026-11-27)
#  ช่วงประโยค = ช่วงที่จอมืด+ขึ้นซับ (หาจากความสว่างเฟรม) → หาขอบเสียงจริงด้วยพลังงาน -32 dBFS → เผื่อ 60/120 ms + เฟด
#  รัน: python .claude/plans/oberon-voice-cut.py <คลิป> <โฟลเดอร์ออก>
import sys, subprocess, numpy as np
SRC, OUT = sys.argv[1], sys.argv[2]
SEGS = [(2.4,5.5),(7.5,12.7),(13.7,19.5),(22.0,26.3),(27.0,30.5),(31.3,34.4),(36.0,38.5),(39.1,41.7),(43.6,46.1),(46.9,49.8),
        (52.2,54.5),(55.0,57.4),(60.3,63.9),(64.9,69.5),(70.2,75.0),(77.8,80.2),(81.2,83.5),(84.6,86.7),(88.7,90.9),(91.7,94.0),
        (96.0,99.0),(100.1,102.5),(103.5,106.0),(107.9,111.6),(112.6,115.7),(117.6,120.6),(121.3,123.6),(125.8,127.9),(128.4,131.6),(132.7,136.4),
        (138.4,141.7),(142.4,146.1)]
SR = 44100
pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", SRC, "-vn", "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
x = np.frombuffer(pcm, np.float32)
hop = int(SR * 0.02)
for i, (a, b) in enumerate(SEGS, 1):
    # หน้าต่าง = ช่วงจอมืดเท่านั้น (ก่อน/หลังมีเสียงแตะปุ่มของเมนู) · ตัดท้าย 0.35 วิ (แตะปิด)
    w0 = a - 0.05
    s0, s1 = int(w0 * SR), int((b - 0.35) * SR)
    seg = x[s0:s1]
    n = len(seg) // hop
    rms = np.sqrt((seg[:n * hop].reshape(n, hop) ** 2).mean(1) + 1e-12)
    db = 20 * np.log10(rms)
    on = np.where(db > -32)[0]
    if not len(on): print("skip", i); continue
    t0 = w0 + max(0, on[0] * 0.02 - 0.06)
    t1 = w0 + min(n, on[-1] + 1) * 0.02 + 0.12
    dur = t1 - t0
    out = f"{OUT}/obv_v{i:02d}.mp3"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t0:.3f}", "-t", f"{dur:.3f}", "-i", SRC, "-vn", "-ac", "1", "-ar", "44100",
                    "-af", f"afade=t=in:d=0.02,afade=t=out:st={max(0, dur - 0.08):.3f}:d=0.08,loudnorm=I=-16:TP=-1.5:LRA=11",
                    "-b:a", "128k", out], check=True)
    print(i, f"{t0:.2f}-{t1:.2f}", f"{dur:.2f}s")
