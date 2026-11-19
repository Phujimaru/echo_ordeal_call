#!/usr/bin/env bash
# เสียงปลาวาฬทาลัสซา (GRID_PLAN §8.9 โหมด Nautilus) — ไฟล์ Mixkit (Sound Effects Free License) ผู้ใช้อนุญาตให้โหลด 2026-11-19
#  ต้นฉบับ: .claude/plans/nautilus-sfx-src/<ชื่อ>_<id>.mp3 (preview จาก assets.mixkit.co) · หน้าเสียง https://mixkit.co (ค้น id)
#  bash .claude/plans/nautilus-sfx.sh [ปลายทาง=client/public/nautilus/sfx]
#  แต่ละไฟล์: ตัดช่วง → ปรับ rate (<1 = ต่ำและช้าลง ให้ดูตัวใหญ่) → fade → loudnorm → mp3 160k
set -e
SRC="$(dirname "$0")/nautilus-sfx-src"
OUT="${1:-client/public/nautilus/sfx}"
mkdir -p "$OUT"
# คีย์ | ไฟล์ | เริ่ม | ยาว | fade เข้า | fade ออก | rate | LUFS | ฟิลเตอร์เสริม (ไม่ใส่ก็ได้ — ลดเสียงซ่าของไฟล์บันทึกจริง)
while IFS='|' read -r key src ss dur fi fo rate lufs pre; do
  [ -z "$key" ] && continue
  len=$(awk "BEGIN{print ${dur}/${rate}}")
  af="aresample=44100,${pre:+$pre,}atrim=start=${ss}:duration=${dur},asetpts=PTS-STARTPTS,asetrate=44100*${rate},aresample=44100,afade=t=in:d=${fi},afade=t=out:st=$(awk "BEGIN{print ${len}-${fo}}"):d=${fo},loudnorm=I=${lufs}:TP=-1:LRA=11"
  ffmpeg -nostdin -v error -y -i "$SRC/$src" -af "$af" -ar 44100 -b:a 160k "$OUT/$key.mp3"
  echo "$key ← $src"
done <<'TABLE'
ping|airport_radar_ping_1582.mp3|0|1.6|0.003|0.5|1|-18
whoosh|swirling_whoosh_1493.mp3|0|1.4|0.01|0.4|0.85|-16
slap|sea_water_splash_1198.mp3|0|1.4|0.003|0.5|0.8|-16
rush|cinematic_tunnel_reverb_woosh_1486.mp3|0|3.5|0.01|1|0.9|-15
roar|giant_monster_roar_1972.mp3|0|3.1|0.01|0.8|0.62|-14
call|aquatic_creature_scream_2203.mp3|0|1.6|0.01|0.5|0.5|-15
swirl|sink_underwater_drain_1877.mp3|2|3|0.3|0.8|1|-17
zap|static_electric_crackles_1455.mp3|0|1.0|0.002|0.3|1|-16
blast|electricity_lightning_blast_2601.mp3|0|2.5|0.003|0.8|1|-15
gulp|swallowing_water_drink_150.mp3|0|0.75|0.005|0.2|0.5|-14
splash|jump_into_the_water_1180.mp3|0|2.3|0.003|0.6|0.85|-15
spit|jumping_into_water_1304.mp3|0|1.9|0.003|0.5|1.1|-16
rumble|bass_rumble_hum_2297.mp3|0|3|0.3|1|1|-17
boom|bomb_drop_cold_water_explosion_2806.mp3|0|4|0.005|1.2|0.9|-14
bubbles|deep_water_bubbles_1321.mp3|0|0.96|0.005|0.3|0.8|-18
amb|diving_in_deep_water_1312.mp3|0.3|80|1|1|1|-26
song|whale_call_humpback_song_noaa.mp3|34.5|6.8|0.3|1.2|0.85|-15|highpass=f=60,afftdn=nf=-25
song2|whale_call_humpback_song_noaa.mp3|47.5|6|0.3|1.2|0.85|-15|highpass=f=60,afftdn=nf=-25
moo|whale_call_humpback_moo_nps.mp3|0.4|2.2|0.1|0.6|0.75|-16|highpass=f=70,afftdn=nf=-22
blue|whale_low_nep_blue_10x_noaapmel.wav|4.6|2.4|0.2|0.8|0.65|-14|highpass=f=30,afftdn=nf=-25
whup|whale_call_humpback_whup_nps.mp3|21.5|1.6|0.05|0.4|0.85|-16|highpass=f=70,afftdn=nf=-22
whip|tentacle_lasso_fast_whip_mixkit1513.mp3|0|0.3|0.003|0.08|0.85|-15
squish|tentacle_mech_stomp_squish_mixkit3047.mp3|0|1.7|0.003|0.4|0.8|-16
impact|impact_water_cinematic_water_metal_hit_mixkit1306.mp3|0|4|0.003|1|0.9|-14
deepimpact|impact_water_cinematic_whoosh_deep_impact_mixkit1143.mp3|0|4.1|0.005|1|1|-14
echarge|electric_underwater_electric_whoosh_mixkit2596.mp3|0|3.1|0.01|0.6|1|-16
crackle|electric_underwater_electric_welding_sparkles_mixkit2603.mp3|0|2.5|0.01|0.6|1|-17
TABLE
