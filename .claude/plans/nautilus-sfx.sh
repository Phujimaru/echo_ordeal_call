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
amb|diving_in_deep_water_1312.mp3|0.3|80|1|1|1|-18
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
swim|swashing_sea_water_1179.mp3|0.9|1.4|0.25|0.8|0.6|-18|lowpass=f=700
swim2|swashing_sea_water_1179.mp3|5.4|1.4|0.25|0.8|0.6|-18|lowpass=f=700
tailslap|impact_water_humpback_tail_slaps_nps.mp3|10.6|1|0.01|0.5|0.7|-16|highpass=f=40,lowpass=f=1500,afftdn=nf=-22
waves|swashing_sea_water_1179.mp3|0.2|11|0.6|0.8|1|-22
l9_steam|stage/vent_hiss_steam_swoosh_mixkit1458.mp3|0|1.65|0.005|0.4|0.9|-15
l9_sizzle|stage/vent_hiss_lava_entering_water_mixkit2446.mp3|0|2.7|0.005|0.6|1|-16
l9_lava|stage/vent_hiss_bubbling_volcano_lava_flow_mixkit2444.mp3|5|4|0.2|1|0.85|-16
l9_quake|stage/stone_seafloor_earthquake_noaapmel.wav|6.5|5|0.3|1.5|1|-14|highpass=f=25,afftdn=nf=-25
l9_debris|stage/stone_stone_debris_falling_mixkit403.mp3|0|3.5|0.005|1|1|-15|lowpass=f=3000
l9_roll|stage/stone_magical_stone_slide_mixkit1528.mp3|0|2.2|0.01|0.5|0.7|-15
l9_blast|stage/cannon_gun_explosion_long_echo_mixkit1700.mp3|0|4|0.003|1.5|0.8|-14|lowpass=f=2500
l8_cannon|stage/cannon_gun_explosion_long_echo_mixkit1700.mp3|0|3.5|0.003|1.2|0.9|-14|lowpass=f=3200
l8_creak|stage/sub_hull_ship_hull_creak_mixkit3076.mp3|0.4|3|0.05|0.8|0.85|-16
l8_crash|stage/cannon_collapsing_structure_mixkit2958.mp3|0|4.5|0.005|1.2|0.85|-14|lowpass=f=3500
l8_door|stage/sub_engine_prison_metal_door_close_mixkit201.mp3|0|1.8|0.003|0.5|0.8|-14|lowpass=f=3000
l8_hiss|stage/sub_engine_hydraulic_door_hiss_mixkit2709.mp3|0|1.7|0.01|0.5|0.8|-17|lowpass=f=2500
l8_clang|stage/sub_hull_submarine_metal_impact_mixkit783.mp3|0|2.5|0.003|0.8|1|-15
l8_debris|stage/stone_stone_debris_falling_mixkit403.mp3|0|3|0.005|1|0.8|-15|lowpass=f=2500
l8_quake|stage/stone_seafloor_earthquake_noaapmel.wav|7.5|5|0.3|1.5|1|-14|highpass=f=25,afftdn=nf=-25
l8_coins|stage/treasure_clinking_coins_mixkit1993.mp3|0|1|0.003|0.3|1|-16
l8_lock|stage/treasure_old_medieval_door_lock_mixkit187.mp3|0.5|2|0.005|0.5|0.9|-16
TABLE

# เสียงบรรยากาศประจำชั้น (ผสมหลายชั้นเสียง · ผู้ใช้: "อย่าให้เสียงสภาพแวดล้อมด้านหลังเบาเกินไป" → -16 LUFS)
#  ชั้น 1 แนวปะการัง: น้ำลึก + คลื่นซัด (ผิวน้ำ 30 ม.) + ฟองอากาศเป็นระยะ
ffmpeg -nostdin -v error -y -i "$SRC/diving_in_deep_water_1312.mp3" -stream_loop 7 -i "$SRC/swashing_sea_water_1179.mp3" -stream_loop 13 -i "$SRC/deep_water_bubbles_1321.mp3" \
  -filter_complex "[0:a]aresample=44100,atrim=0.3:80.3,asetpts=PTS-STARTPTS[a];[1:a]aresample=44100,atrim=0:80,asetpts=PTS-STARTPTS,lowpass=f=1800,volume=0.55[b];[2:a]aresample=44100,atrim=0:80,asetpts=PTS-STARTPTS,volume=0.3[c];[a][b][c]amix=inputs=3:normalize=0,afade=t=in:d=1,afade=t=out:st=79:d=1,loudnorm=I=-16:TP=-1:LRA=11" \
  -ar 44100 -b:a 160k "$OUT/amb_reef.mp3"
echo "amb_reef ← mix"
#  ชั้น 3 ปล่องภูเขาไฟ: เสียงหึ่งน้ำลึกต่ำ + ลาวาเดือดปุดๆ (ทุ้มลง) + ครางของแผ่นดินเบาๆ + ฟองเป็นระยะ
ffmpeg -nostdin -v error -y -i "$SRC/stage/depth_drone_deep_cinematic_wind_hum_mixkit1177.mp3" -stream_loop 1 -i "$SRC/stage/vent_hiss_bubbling_volcano_lava_flow_mixkit2444.mp3" -stream_loop 2 -i "$SRC/bass_rumble_hum_2297.mp3" -stream_loop 13 -i "$SRC/deep_water_bubbles_1321.mp3"   -filter_complex "[0:a]aresample=44100,atrim=0:54,asetpts=PTS-STARTPTS[a];[1:a]aresample=44100,atrim=0:54,asetpts=PTS-STARTPTS,asetrate=44100*0.8,aresample=44100,lowpass=f=1400,volume=0.7[b];[2:a]aresample=44100,atrim=0:54,asetpts=PTS-STARTPTS,volume=0.45[c];[3:a]aresample=44100,atrim=0:54,asetpts=PTS-STARTPTS,volume=0.22[d];[a][b][c][d]amix=inputs=4:normalize=0,atrim=0:54,afade=t=in:d=1,afade=t=out:st=53:d=1,loudnorm=I=-15:TP=-1:LRA=11"   -ar 44100 -b:a 160k "$OUT/amb_vents.mp3"
echo "amb_vents ← mix"
#  ชั้น 2 ซากเรือรบ: ห้องมืดทุ้มต่ำ + น้ำลึก + ตัวเรือเหล็กลั่นเป็นระยะ (ช้าลงให้ดูใหญ่) + ฟองรั่วจากรอยแตก
ffmpeg -nostdin -v error -y -i "$SRC/stage/depth_drone_dark_cinematic_room_tone_mixkit3081.mp3" -i "$SRC/diving_in_deep_water_1312.mp3" -stream_loop 9 -i "$SRC/stage/sub_hull_ship_hull_creak_mixkit3076.mp3" -stream_loop 13 -i "$SRC/deep_water_bubbles_1321.mp3" \
  -filter_complex "[0:a]aresample=44100,atrim=0:72,asetpts=PTS-STARTPTS[a];[1:a]aresample=44100,atrim=0.3:72.3,asetpts=PTS-STARTPTS,lowpass=f=1500,volume=0.6[b];[2:a]aresample=44100,atrim=0:72,asetpts=PTS-STARTPTS,asetrate=44100*0.7,aresample=44100,lowpass=f=1800,volume=0.4,apulsator=hz=0.06:amount=0.9[c];[3:a]aresample=44100,atrim=0:72,asetpts=PTS-STARTPTS,volume=0.22[d];[a][b][c][d]amix=inputs=4:normalize=0,atrim=0:72,afade=t=in:d=1,afade=t=out:st=71:d=1,loudnorm=I=-16:TP=-1:LRA=11" \
  -ar 44100 -b:a 160k "$OUT/amb_wreck.mp3"
echo "amb_wreck ← mix"
