#!/usr/bin/env bash
# เสียงฉากเข้าด่าน/เปลี่ยนชั้นของ Nautilus (client/src/nautilus/NautilusDive.jsx) — แยกจาก nautilus-sfx.sh (ไฟล์นั้นหลายชั้นเติมร่วมกัน)
#  ต้นฉบับ .claude/plans/nautilus-sfx-src/stage/ (ที่มา/สัญญาอนุญาต: nautilus-sfx-src/SOURCES.md) · bash .claude/plans/nautilus-sfx-cine.sh [ปลายทาง]
set -e
SRC="$(dirname "$0")/nautilus-sfx-src/stage"
OUT="${1:-client/public/nautilus/sfx}"
mkdir -p "$OUT"
mk() { # คีย์ ไฟล์ เริ่ม ยาว fadeเข้า fadeออก rate LUFS [ฟิลเตอร์เสริม]
  local len; len=$(awk "BEGIN{print $4/$7}")
  ffmpeg -nostdin -v error -y -i "$SRC/$2" -af "aresample=44100,${9:+$9,}atrim=start=$3:duration=$4,asetpts=PTS-STARTPTS,asetrate=44100*$7,aresample=44100,afade=t=in:d=$5,afade=t=out:st=$(awk "BEGIN{print $len-$6}"):d=$6,loudnorm=I=$8:TP=-1:LRA=11" -ar 44100 -b:a 160k "$OUT/$1.mp3"
  echo "$1 ← $2"
}
mk cine_klaxon sub_engine_wwii_dive_klaxon_usnavy.ogg 0 3.8 0.01 0.4 1 -16
mk cine_creak sub_hull_ship_hull_creak_mixkit3076.mp3 0 7.9 0.2 1 0.8 -17
mk cine_hiss sub_engine_hydraulic_door_hiss_mixkit2709.mp3 0 1.7 0.01 0.5 0.8 -17
mk cine_riser transition_cinematic_mysterious_riser_brass_mixkit2283.mp3 0 12 1 2 0.9 -18
mk cine_woosh transition_deep_air_woosh_mixkit2604.mp3 0 3 0.01 0.8 0.8 -16
mk cine_sonar sub_ping_multibeam_sonar_chirp_usgs.mp3 0 2.8 0.01 0.6 0.9 -18
mk cine_impact transition_reverse_cinematic_impact_mixkit784.mp3 0 10.1 0.05 1.5 1 -16
mk cine_engine sub_engine_low_drone_engine_hum_mixkit2745.mp3 5 12 1 2 0.85 -20
