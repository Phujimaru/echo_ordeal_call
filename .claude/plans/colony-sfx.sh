#!/usr/bin/env bash
# เสียงเอฟเฟกต์สนาม Colony (GRID_PLAN §8.3 ขั้นที่ 4) — ไฟล์ Mixkit (Sound Effects Free License) ที่ผู้ใช้อนุมัติ 2026-10-25
#  ต้นฉบับ: .claude/plans/colony-sfx-src/<ชื่อ>_<id>.mp3 (แปลงจาก wav ที่ดาวน์โหลด 192k) · หน้าเสียง https://mixkit.co (ค้น id)
#  bash .claude/plans/colony-sfx.sh [ปลายทาง=client/public/colony/sfx]
#  แต่ละไฟล์: ตัดช่วง (เริ่ม/ยาว จาก RMS envelope) → fade เข้า/ออก → loudnorm (-16 LUFS, TP -1) → mp3 160k
#   -16 LUFS = ระดับเดียวกับเสียงเอฟเฟกต์ตัวละครอื่น (เช่น ryougi-sfx.py)
#  จังหวะที่เล่นในเกม: client/src/board/colony3d.js (onEvent / boomFinale / ปิดผนึก) — ชื่อคีย์ใน client/src/audio.js = colony_*
set -e
SRC="$(dirname "$0")/colony-sfx-src"
OUT="${1:-client/public/colony/sfx}"
mkdir -p "$OUT"
# คีย์ | ไฟล์ต้นฉบับ | เริ่ม(วิ) | ยาว(วิ) | fade เข้า | fade ออก
while IFS='|' read -r key src ss dur fi fo; do
  [ -z "$key" ] && continue
  af="atrim=start=${ss}:duration=${dur},asetpts=PTS-STARTPTS,afade=t=in:d=${fi},afade=t=out:st=$(awk "BEGIN{print ${dur}-${fo}}"):d=${fo},loudnorm=I=-16:TP=-1:LRA=11"
  ffmpeg -v error -y -i "$SRC/$src" -af "$af" -ar 44100 -b:a 160k "$OUT/$key.mp3"
  echo "$key ← $src"
done <<'EOF'
colony_meteor_fall|meteor_whoosh_3024.mp3|0|3.2|0.02|0.8
colony_meteor_hit|dramatic_metal_explosion_impact_1687.mp3|0|4|0.005|1
colony_wind|horror_scifi_wind_tunnel_894.mp3|6|5|0.3|1.2
colony_sucked|air_zoom_vacuum_2608.mp3|0|1.27|0.005|0.3
colony_beam_charge|scifi_plasma_gun_power_1680.mp3|2|2.1|0.05|0.25
colony_beam|cinematic_laser_gun_thunder_1287.mp3|0.15|4.4|0.01|1
colony_capsule_fall|rocket_landing_whoosh_1721.mp3|0.5|2.6|0.1|0.5
colony_capsule_land|submarine_metal_impact_783.mp3|0|2.6|0.005|0.8
colony_drift|futuristic_machine_starting_2689.mp3|0|3|0.05|0.9
colony_alarm_seal|spaceship_alarm_998.mp3|0|3|0.005|0.3
colony_door_slide|industrial_metal_sliding_door_200.mp3|0|2.52|0.005|0.3
colony_door_close|prison_metal_door_close_201.mp3|0|1.8|0.005|0.4
colony_alarm_count|critical_alarm_1004.mp3|0|3.18|0.005|0.3
colony_boom_chain|masive_explosion_in_battle_2777.mp3|0|8.5|0.005|2
colony_glass|explosion_and_glass_debris_1701.mp3|0|4.5|0.005|1.2
colony_boom_final|underground_explosion_impact_echo_1686.mp3|0|4.1|0.005|1.2
colony_jump|fast_rocket_whoosh_1714.mp3|0.35|2.8|0.02|0.6
colony_stomp|golem_stomp_c_3046.mp3|1.4|1.7|0.005|0.5
colony_lift|machine_activation_short_3180.mp3|0|2.71|0.005|0.4
EOF
