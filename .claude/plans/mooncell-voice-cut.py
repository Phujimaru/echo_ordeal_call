# ตัดเสียงพากย์ฮาคุโนะจากไฟล์ของผู้ใช้ (Downloads/mooncell/เสียงพายก์ฮาคุโนะชายและหญิง.mp4 · 3:24)
#  ก่อน 1:46 = ฮาคุโนะชาย · หลัง 1:46 = ฮาคุโนะหญิง (ผู้ใช้บอก 2026-10-25) · ตัดตามช่วงเงียบ (silencedetect -35 dB ≥ 0.5 วิ)
#  ท่อน < 0.4 วิ ทิ้ง · ปรับความดัง -16 LUFS · ออก client/public/mooncell/voice/hakuno_{m|f}_NN.mp3
#  ใช้: python .claude/plans/mooncell-voice-cut.py <ไฟล์ต้นฉบับ> <โฟลเดอร์ปลายทาง>
import re, subprocess, sys, os

src, out = sys.argv[1], sys.argv[2]
SPLIT = 106.0
os.makedirs(out, exist_ok=True)
log = subprocess.run(["ffmpeg", "-hide_banner", "-i", src, "-vn", "-af", "silencedetect=noise=-35dB:d=0.5", "-f", "null", "-"],
                     capture_output=True, text=True, encoding="utf-8", errors="ignore").stderr
starts = [float(x) for x in re.findall(r"silence_start: ([0-9.]+)", log)]
ends = [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", log)]
dur = float(re.search(r"Duration: (\d+):(\d+):([0-9.]+)", log).group(3)) + 60 * int(re.search(r"Duration: (\d+):(\d+)", log).group(2))
# ช่วงพูด = จากปลายความเงียบก่อนหน้า ถึงต้นความเงียบถัดไป
bounds = [0.0] + ends
segs = []
for i, a in enumerate(bounds):
    b = starts[i] if i < len(starts) else dur
    if b - a >= 0.4:
        segs.append((max(0.0, a - 0.05), b + 0.12))
n = {"m": 0, "f": 0}
for a, b in segs:
    side = "m" if (a + b) / 2 < SPLIT else "f"
    n[side] += 1
    name = f"hakuno_{side}_{n[side]:02d}.mp3"
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", f"{a:.3f}", "-to", f"{b:.3f}", "-i", src, "-vn",
                    "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "44100", "-b:a", "160k", os.path.join(out, name)], check=True)
    print(f"{name}\t{a:.2f}-{b:.2f}\t{b - a:.2f}s")
print(n)
