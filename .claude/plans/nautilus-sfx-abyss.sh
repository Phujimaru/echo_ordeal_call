#!/usr/bin/env bash
# bash .claude/plans/nautilus-sfx-abyss.sh [ปลายทาง] · ชั้น 5 ห้วงเหวไร้แสง — เสียงลูกเล่น l11_* + เสียงบรรยากาศ amb_abyss (ต้นฉบับใน .claude/plans/nautilus-sfx-src · SOURCES.md)
set -e
SRC="$(dirname "$0")/nautilus-sfx-src"
OUT="${1:-client/public/nautilus/sfx}"
while IFS='|' read -r key src ss dur fi fo rate lufs pre; do
  [ -z "$key" ] && continue
  len=$(awk "BEGIN{print ${dur}/${rate}}")
  af="aresample=44100,${pre:+$pre,}atrim=start=${ss}:duration=${dur},asetpts=PTS-STARTPTS,asetrate=44100*${rate},aresample=44100,afade=t=in:d=${fi},afade=t=out:st=$(awk "BEGIN{print ${len}-${fo}}"):d=${fo},loudnorm=I=${lufs}:TP=-1:LRA=11"
  ffmpeg -nostdin -v error -y -i "$SRC/$src" -af "$af" -ar 44100 -b:a 160k "$OUT/$key.mp3"
  echo "$key <- $src"
done <<'TABLE'
l11_clicks|stage/whale_call_sperm_clicks_noaa.mp3|0|6.3|0.2|1.2|0.9|-17|highpass=f=200,afftdn=nf=-25
l11_collapse|stage/cannon_collapsing_structure_mixkit2958.mp3|0|5.9|0.003|1.5|0.7|-14|lowpass=f=3000
l11_dark|stage/transition_reverse_cinematic_impact_mixkit784.mp3|2|8|0.5|1.5|0.6|-15|lowpass=f=2200
l11_flare|electric_underwater_electric_welding_sparkles_mixkit2603.mp3|0|3|0.003|1|0.9|-16
l11_glow|stage/magic_glow_magical_light_transition_mixkit2583.mp3|0|2.4|0.005|0.8|0.9|-17|highpass=f=300
TABLE
# บรรยากาศชั้น 5: โดรนห้องมืดต่ำ (ช้าลง) + ลมฮัมลึก (ตัดสูง) + แผ่นดินไหว/บลุ๊ปน้ำแข็งไกลเป็นช่วง + คลิกวาฬหัวทุยไกลมีเสียงก้อง · เบาบาง ไม่ทับเพลง Genjitsu
ffmpeg -nostdin -v error -y \
  -stream_loop 1 -i "$SRC/stage/depth_drone_dark_cinematic_room_tone_mixkit3081.mp3" \
  -stream_loop 2 -i "$SRC/stage/depth_drone_deep_cinematic_wind_hum_mixkit1177.mp3" \
  -i "$SRC/stage/depth_drone_bloop_icequake_noaapmel.wav" \
  -i "$SRC/stage/whale_call_sperm_clicks_noaa.mp3" \
  -i "$SRC/stage/stone_seafloor_earthquake_noaapmel.wav" \
  -filter_complex "[0:a]aresample=44100,asetrate=44100*0.75,aresample=44100,atrim=0:80,asetpts=PTS-STARTPTS,lowpass=f=1400[a];\
[1:a]aresample=44100,atrim=0:80,asetpts=PTS-STARTPTS,lowpass=f=600,volume=0.7[b];\
[2:a]aresample=44100,highpass=f=25,afftdn=nf=-25,asetpts=PTS-STARTPTS,volume=0.6,adelay=18000|18000,apad=whole_dur=80[c];\
[3:a]aresample=44100,highpass=f=200,afftdn=nf=-25,aecho=0.8:0.6:600|1300:0.35|0.2,volume=0.25,adelay=41000|41000,apad=whole_dur=80[d];\
[4:a]aresample=44100,highpass=f=20,afftdn=nf=-25,atrim=0:12,asetpts=PTS-STARTPTS,lowpass=f=800,volume=0.5,adelay=60000|60000,apad=whole_dur=80[e];\
[a][b][c][d][e]amix=inputs=5:normalize=0,atrim=0:80,afade=t=in:d=1.5,afade=t=out:st=78.5:d=1.5,loudnorm=I=-18:TP=-1:LRA=11" \
  -ar 44100 -b:a 160k "$OUT/amb_abyss.mp3"
echo "amb_abyss <- mix"
