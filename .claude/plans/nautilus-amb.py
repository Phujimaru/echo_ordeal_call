# เสียงบรรยากาศ Nautilus ชั้น 1–4 (ทำใหม่ 2026-11-19 — ผู้ใช้: "เสียงเอฟเฟคน้ำเล่นซ้ำบ่อยไป")
#  เดิม: วนคลิปสั้น (ฟอง 6 วิ ×14 · น้ำซัด 11 วิ ×8 · เรือลั่น 8 วิ ×10 · ประสานเสียง 4 วิ ×21 · ครางต่ำ 7 วิ ×3) → ได้ยินซ้ำเป็นจังหวะ
#  ใหม่: พื้นเสียง = คลิปยาวไม่วน · เสียงเหตุการณ์ = โปรยทีละครั้ง ช่วงห่างไม่เท่ากัน แต่ละครั้งเปลี่ยนท่อนที่ตัด/ความเร็ว/ความดัง
#  python .claude/plans/nautilus-amb.py [ปลายทาง=client/public/nautilus/sfx]   (ต้นฉบับ: nautilus-sfx-src · ที่มาใน SOURCES.md)
import os, random, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "nautilus-sfx-src")
OUT = sys.argv[1] if len(sys.argv) > 1 else "client/public/nautilus/sfx"


def build(name, length, lufs, beds, events, seed):
    """beds = [(ไฟล์, ฟิลเตอร์, ความดัง, เริ่มตัด)] · events = [(ไฟล์, ฟิลเตอร์, จำนวน, (ดังต่ำ, สูง), (ความเร็วต่ำ, สูง), ยาวต่อครั้ง)]"""
    rnd = random.Random(seed)
    inputs, chains, labels = [], [], []
    for i, (f, flt, vol, ss) in enumerate(beds):
        inputs += ["-i", os.path.join(SRC, f)]
        chains.append(f"[{i}:a]aresample=44100,atrim={ss}:{ss + length},asetpts=PTS-STARTPTS{',' + flt if flt else ''},volume={vol}[b{i}]")
        labels.append(f"[b{i}]")
    k = len(beds)
    for j, (f, flt, n, vr, rr, dur) in enumerate(events):
        idx = k + j
        inputs += ["-i", os.path.join(SRC, f)]
        src_len = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", os.path.join(SRC, f)]).decode().strip())
        # เวลาเกิด: ช่วงห่างสุ่มไม่เท่ากัน กระจายทั้งไฟล์ (เว้นหัวท้าย)
        slots, t = [], rnd.uniform(1.5, length / n)
        while len(slots) < n and t < length - dur - 1:
            slots.append(t); t += rnd.uniform(length / n * 0.55, length / n * 1.6)
        chains.append(f"[{idx}:a]aresample=44100,asplit={max(1, len(slots))}" + "".join(f"[e{j}_{m}]" for m in range(max(1, len(slots)))))
        for m, at in enumerate(slots):
            d = min(dur * rnd.uniform(0.7, 1.15), src_len - 0.1)
            ss = rnd.uniform(0, max(0, src_len - d))
            rate, vol = rnd.uniform(*rr), rnd.uniform(*vr)
            ms = int(at * 1000)
            chains.append(f"[e{j}_{m}]atrim={ss:.2f}:{ss + d:.2f},asetpts=PTS-STARTPTS,asetrate=44100*{rate:.3f},aresample=44100,afade=t=in:d=0.25,afade=t=out:st={max(0.1, d / rate - 0.6):.2f}:d=0.6{',' + flt if flt else ''},volume={vol:.3f},adelay={ms}|{ms},apad=whole_dur={length}[x{j}_{m}]")
            labels.append(f"[x{j}_{m}]")
    mix = "".join(labels) + f"amix=inputs={len(labels)}:normalize=0,atrim=0:{length},afade=t=in:d=1.2,afade=t=out:st={length - 1.2}:d=1.2,loudnorm=I={lufs}:TP=-1:LRA=11"
    cmd = ["ffmpeg", "-nostdin", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(chains) + ";" + mix, "-ar", "44100", "-b:a", "160k", os.path.join(OUT, f"{name}.mp3")]
    subprocess.check_call(cmd)
    print(name, "<-", len(labels), "layers")


BUB = "deep_water_bubbles_1321.mp3"
# ชั้น 1 แนวปะการัง (−30 ม. ยังมีแสง/คลื่นผิวน้ำไกลๆ): ใต้น้ำต่อเนื่อง + หึ่งลึกเบา · คลื่นผิวน้ำทุ้มไกล 3 ครั้ง · ฟองบาง 6 ครั้ง · วาฬร้องไกลมาก 1 ครั้ง
build("amb_reef", 80, -16,
      [("diving_in_deep_water_1312.mp3", "", 1, 0.3), ("stage/sub_engine_low_drone_engine_hum_mixkit2745.mp3", "lowpass=f=300", 0.18, 3)],
      [("swashing_sea_water_1179.mp3", "lowpass=f=700", 3, (0.18, 0.3), (0.8, 0.95), 5),
       (BUB, "", 6, (0.15, 0.32), (0.75, 1.15), 2.2),
       ("whale_call_humpback_whup_nps.mp3", "highpass=f=70,afftdn=nf=-22,lowpass=f=1500,aecho=0.8:0.6:500|1100:0.3|0.2", 1, (0.12, 0.16), (0.85, 0.95), 2.5)],
      seed=7)
# ชั้น 2 ซากเรือรบ: ห้องมืด + น้ำลึก · เหล็กลั่น 5 ครั้งต่างระดับ · ฟองรั่ว 5 ครั้ง
build("amb_wreck", 72, -16,
      [("stage/depth_drone_dark_cinematic_room_tone_mixkit3081.mp3", "", 1, 0), ("diving_in_deep_water_1312.mp3", "lowpass=f=1500", 0.6, 0.3)],
      [("stage/sub_hull_ship_hull_creak_mixkit3076.mp3", "lowpass=f=1800", 5, (0.3, 0.5), (0.6, 0.8), 4.5),
       (BUB, "", 5, (0.15, 0.28), (0.8, 1.1), 2)],
      seed=8)
# ชั้น 3 ปล่องภูเขาไฟ: หึ่งน้ำลึก + ลาวาเดือดยาว (ไม่วน) · ครางแผ่นดิน 4 ครั้ง · ฟอง 5 ครั้ง
build("amb_vents", 54, -15,
      [("stage/depth_drone_deep_cinematic_wind_hum_mixkit1177.mp3", "", 1, 0), ("stage/vent_hiss_bubbling_volcano_lava_flow_mixkit2444.mp3", "asetrate=44100*0.8,aresample=44100,lowpass=f=1400", 0.7, 0)],
      [("bass_rumble_hum_2297.mp3", "", 4, (0.35, 0.55), (0.8, 1.05), 5),
       (BUB, "", 5, (0.15, 0.3), (0.75, 1.1), 2)],
      seed=9)
# ชั้น 4 นครบาดาล: ห้องเงียบโบราณ + ลมน้ำลึก · ประสานเสียงทุ้มก้องไกล 4 ครั้ง · ฟอง 4 ครั้ง
build("amb_city", 75, -16,
      [("stage/depth_drone_dark_cinematic_room_tone_mixkit3081.mp3", "", 1, 0), ("stage/depth_drone_deep_cinematic_wind_hum_mixkit1177.mp3", "lowpass=f=900", 0.6, 0)],
      [("stage/magic_glow_choir_magic_shine_mixkit658.mp3", "lowpass=f=1200,aecho=0.8:0.7:400|900:0.4|0.3", 4, (0.14, 0.22), (0.48, 0.56), 3.6),
       (BUB, "", 4, (0.14, 0.24), (0.8, 1.1), 2)],
      seed=10)
