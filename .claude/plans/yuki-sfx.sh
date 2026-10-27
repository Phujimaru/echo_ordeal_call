#!/usr/bin/env bash
# ยูกิ มาโคโตะ — เสียงเอฟเฟกต์ (Mixkit ฟรี · ผู้ใช้อนุมัติ 2026-10-27)
#  ต้นฉบับ: C:/Users/LOQ/Downloads/yuki-sfx-src/<id>.wav (788 = พรีวิว mp3 — ไม่มี wav บน CDN)
#   790 Cinematic trailer riser · 788 Big cinematic impact · 2777 Masive explosion in battle
#   1686 Underground explosion impact echo · 1695 Whoosh transition explosion echo
#   1703 Explosion with rocks debris · 1278 Distant thunder explosion · 1177 Deep cinematic wind hum
#  ใช้: bash .claude/plans/yuki-sfx.sh <src> <out>   (out = client/public/characters/yuki_makoto/sfx)
#
#  yuki_boom (14 วิ · −13 LUFS ดังกว่าเสียงอื่นตั้งใจ): จังหวะตรงกับ YUKI_BOOM ใน client/src/board/yukiFx.js
#   0.00 riser ก่อตัว → 2.60 ระเบิด (impact + massive + sub) → 2.90 คลื่นกระแทก → 3.40 เศษหิน → 4.80 ฟ้าร้องก้องยาว → fade 4 วิท้าย
#  yuki_aura (6 วิ · −18 LUFS): ลมต่ำรวมตัว fade in/out — เล่นต้นเทิร์นระหว่างนับถอยหลัง
set -euo pipefail
SRC="${1:?src}"; OUT="${2:?out}"
mkdir -p "$OUT"
T=$(mktemp -d)

# ตัดช่วงเงียบหัวไฟล์ของเลเยอร์ระเบิด (จุดปะทะ = ต้นไฟล์)
trim() { ffmpeg -v error -y -i "$1" -af "silenceremove=start_periods=1:start_threshold=-38dB,aresample=44100" -ac 2 "$2"; }
trim "$SRC/788.mp3"  "$T/impact.wav"
trim "$SRC/2777.wav" "$T/massive.wav"
trim "$SRC/1686.wav" "$T/sub.wav"
trim "$SRC/1695.wav" "$T/wave.wav"
trim "$SRC/1703.wav" "$T/debris.wav"
trim "$SRC/1278.wav" "$T/thunder.wav"

ffmpeg -v error -y \
  -i "$SRC/790.wav" -i "$T/impact.wav" -i "$T/massive.wav" -i "$T/sub.wav" -i "$T/wave.wav" -i "$T/debris.wav" -i "$T/thunder.wav" \
  -filter_complex "\
[0:a]aresample=44100,aformat=channel_layouts=stereo,volume=-3dB[r];\
[1:a]adelay=2600|2600,volume=0dB[i];\
[2:a]adelay=2600|2600,volume=0dB[m];\
[3:a]adelay=2600|2600,volume=+2dB,lowpass=f=900[s];\
[4:a]adelay=2900|2900,volume=-4dB[w];\
[5:a]adelay=3400|3400,volume=-5dB[d];\
[6:a]adelay=4800|4800,volume=-1dB[t];\
[r][i][m][s][w][d][t]amix=inputs=7:normalize=0:duration=longest,atrim=0:14,afade=t=out:st=10:d=4,alimiter=limit=0.89[o]" \
  -map "[o]" "$T/boom.wav"

ffmpeg -v error -y -i "$SRC/1177.wav" -af "atrim=4:10,asetpts=PTS-STARTPTS,afade=t=in:d=1.5,afade=t=out:st=3.5:d=2.5,aresample=44100" -ac 2 "$T/aura.wav"

# ปรับดังแบบ gain ล้วน (วัด integrated LUFS → ชดเชย)
norm() {
  local in="$1" out="$2" target="$3"
  local cur
  cur=$(ffmpeg -hide_banner -nostats -i "$in" -af ebur128 -f null - 2>&1 | grep -E '^\s+I:' | tail -1 | awk '{print $2}')
  local g
  g=$(awk -v t="$target" -v c="$cur" 'BEGIN{printf "%.2f", t - c}')
  ffmpeg -v error -y -i "$in" -af "volume=${g}dB,alimiter=limit=0.94" -codec:a libmp3lame -b:a 192k -ar 44100 "$out"
  echo "$(basename "$out"): $cur LUFS → gain ${g} dB"
}
norm "$T/boom.wav" "$OUT/yuki_boom.mp3" -13
norm "$T/aura.wav" "$OUT/yuki_aura.mp3" -18
rm -rf "$T"
