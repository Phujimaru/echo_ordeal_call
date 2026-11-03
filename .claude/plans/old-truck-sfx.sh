#!/bin/sh
# รถบรรทุกเก่า / ออพติมัส ไพร์ม — สร้างเสียงจาก Mixkit ฟรี (ต้นฉบับ .claude/plans/old-truck-sfx-src/ · ผู้ใช้อนุญาตให้โหลด 2026-11-03)
# ตัดเงียบหัวไฟล์ · mono · -16 LUFS · ปลายทาง client/public/characters/old_truck/sfx/
set -e
SRC=.claude/plans/old-truck-sfx-src
OUT=${1:-client/public/characters/old_truck/sfx}
mkdir -p "$OUT"
TRIM="silenceremove=start_periods=1:start_threshold=-45dB"
NORM="loudnorm=I=-16:TP=-1.5:LRA=11"
one() { ffmpeg -y -loglevel error -i "$SRC/$1" -af "$TRIM,$NORM,afade=t=out:st=$3:d=0.25" -ac 1 -ar 44100 -b:a 128k "$OUT/$2.mp3"; }
one heavy_sword_smashes_metal_2795.mp3 ot_slash 1.2
one sword_strikes_armor_2765.mp3 ot_counter 0.8
one mechanical_technology_movements_3117.mp3 ot_transform 2.2
one metallic_sword_scrape_2799.mp3 ot_stance 0.9
one machine_activation_short_3180.mp3 ot_heal 1.6
# ท่าไม้ตาย: ลมฟันออกตัว แล้วระเบิดเหล็กตอนคลื่นปะทะ (+0.25 วิ)
ffmpeg -y -loglevel error -i "$SRC/metal_hit_woosh_1485.mp3" -i "$SRC/dramatic_metal_explosion_impact_1687.mp3" \
  -filter_complex "[0]$TRIM[a];[1]$TRIM,adelay=250|250[b];[a][b]amix=inputs=2:normalize=0,$NORM,afade=t=out:st=2.6:d=0.6" \
  -ac 1 -ar 44100 -b:a 128k "$OUT/ot_ult.mp3"
# ร่างรถตีปกติ: แตรรถ แล้วชนเหล็ก (+0.35 วิ)
ffmpeg -y -loglevel error -i "$SRC/truck_horn_720.mp3" -i "$SRC/factory_metal_hard_hit_2980.mp3" \
  -filter_complex "[0]$TRIM,atrim=0:0.6,afade=t=out:st=0.45:d=0.15[a];[1]$TRIM,adelay=350|350[b];[a][b]amix=inputs=2:normalize=0,$NORM,afade=t=out:st=1.4:d=0.3" \
  -ac 1 -ar 44100 -b:a 128k "$OUT/ot_ram.mp3"
