#!/usr/bin/env bash
# เสียงเอฟเฟกต์ของ Moon Cell (GRID_PLAN §8.4) — สังเคราะห์ด้วย ffmpeg ล้วน (ไม่ต้องดาวน์โหลด) แล้วปรับ -16 LUFS
#  ใช้: bash .claude/plans/mooncell-sfx.sh <โฟลเดอร์ปลายทาง>   (ปกติ client/public/mooncell/sfx)
set -e
OUT="${1:-client/public/mooncell/sfx}"
mkdir -p "$OUT"
mk() { # ชื่อ ความยาว นิพจน์
  ffmpeg -hide_banner -loglevel error -y -f lavfi -i "aevalsrc=exprs='$3':s=44100:d=$2" \
    -af "loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=out:st=$(awk "BEGIN{print $2-0.08}"):d=0.08" -ar 44100 -b:a 160k "$OUT/$1.mp3"
}
# (เสียงคำสาปลง = ไฟล์ m4a ของผู้ใช้ client/public/mooncell/hakuno_duo_ultimate_sound.m4a — ไม่สังเคราะห์)
# เสาข้อมูลพุ่ง: ซ่าดิจิทัลไต่ขึ้น
mk moon_pillar 0.9 "0.6*sin(2*PI*(200+1400*t)*t)*exp(-2.2*t)+0.3*sgn(sin(2*PI*(80+900*t)*t))*exp(-4*t)"
# ฟื้นคืนชีพ: เสียงระฆังใสไต่ขึ้น 3 โน้ต
mk moon_revive 1.6 "0.5*sin(2*PI*880*t)*exp(-3*t)+0.45*sin(2*PI*1320*t)*exp(-3*(t-0.25))*gt(t,0.25)+0.45*sin(2*PI*1760*t)*exp(-2.5*(t-0.5))*gt(t,0.5)"
# เตือน (คำสาป/เสาชุดใหม่): ปิ๊งสองโทน
mk moon_warn 1.0 "0.55*sin(2*PI*660*t)*lt(t,0.35)*exp(-4*t)+0.55*sin(2*PI*990*t)*gt(t,0.4)*exp(-4*(t-0.4))"
# ตีปกติของฮาคุโนะชาย (หมัด code cast): กระแทกทึบ + คลิกดิจิทัล
mk hakuno_hit_m 0.45 "0.9*sin(2*PI*(160*exp(-6*t))*t)*exp(-9*t)+0.4*(random(0)*2-1)*exp(-30*t)+0.25*sin(2*PI*2400*t)*exp(-25*t)"
# ตีปกติของฮาคุโนะหญิง (หอกข้อมูลจากวงเวท): ใสแหลม + ประกายไล่ลง
mk hakuno_hit_f 0.6 "0.5*sin(2*PI*(2600-1800*t)*t)*exp(-6*t)+0.35*sin(2*PI*1320*t)*exp(-8*t)+0.25*(random(0)*2-1)*exp(-20*t)"
ls -la "$OUT"
