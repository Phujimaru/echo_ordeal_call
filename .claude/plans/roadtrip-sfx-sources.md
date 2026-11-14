# Road Trip — แหล่งเสียงเอฟเฟกต์/บรรยากาศ (Mixkit · 2026-11-14)

- ทุกเสียงมาจาก Mixkit Free Sound Effects (Mixkit Sound Effects Free License — ใช้ในเกมได้ ไม่ต้องให้เครดิต) ยกเว้น 2 เลเยอร์สังเคราะห์ (`synth:screech`, `synth:squeal`) — Mixkit ไม่มีเสียงยางเสียดถนน/เบรกหวีดที่ใช้ได้
- ต้นฉบับ: `https://assets.mixkit.co/active_storage/sfx/<id>/<id>.wav` (1662 ไม่มี wav → `1662-preview.mp3`) · ตอนสร้างเก็บไว้ที่ scratchpad (ไม่อยู่ใน repo) — ดาวน์โหลดใหม่ตาม id ด้านล่าง
- Mixkit ไม่มีหน้าแยกต่อเสียง — "หน้า" = `https://mixkit.co/free-sound-effects/<หน้า>/`
- ปลายทาง `client/public/roadtrip/sfx/<key>.mp3` · 51 ไฟล์ (ลูป 13 + one-shot 38) รวม ~4.6 MB · รายการสำหรับโค้ด `client/src/roadtrip/sfxManifest.js`
- สร้างใหม่: `python -I .claude/plans/roadtrip-sfx.py <โฟลเดอร์ต้นฉบับ> client/public/roadtrip/sfx [key...]` · ตรวจ: `python -I .claude/plans/roadtrip-sfx.py --check client/public/roadtrip/sfx`

## ขั้นตอน (สูตรเดียวกับ fodlan-sfx.py)
- **One-shot**: ตัดช่วง → วางเลเยอร์ (gain/กรอง) → ตัดความเงียบหัวไฟล์ (−30 dB จากพีค, บางคีย์ −40/−45) → fade-in 3 ms / fade-out cosine → (บางคีย์ alimiter) → gain ล้วนไป −16 LUFS เพดาน sample peak −3.5 dBFS → mp3 128 kbps 44.1 kHz stereo · ไฟล์ที่ติดเพดานพีคจะเบากว่า −16 (van_door −23, alert/turret/sizzle ≈ −20) → ชดเชยใน `RT_GAIN` · `km_tick` สั้นเกินวัด LUFS → ตั้งพีค −20 dBFS (เบาตั้งใจ)
- **ลูป**: เลเยอร์พื้นหลังหา offset ที่หน้าต่างครอสเฟดไม่มีเสียงกระแทกและระดับใกล้กัน → ครอสเฟด equal-power หาง→หัว → วนซ้ำ k รอบถ้าต้นฉบับสั้น → RMS −20 dBFS + gain → อีเวนต์วางในลูป (ส่วนเกินวนไปหัว) → หมุนจุดเริ่มไปที่เงียบ/ระดับเท่ากัน → −22 LUFS (engine_loop −20) → mp3 96 kbps · ตรวจแล้วระดับ 0.5 s แรก/ท้ายต่างกัน ≤ 0.3 dB

## ลูป
| คีย์ | ยาว | เลเยอร์ (id · ชื่อ Mixkit · หน้า) | การตัด/ซ้อน |
|---|---|---|---|
| `amb_road` | 24 s | 1620 · Truck slowing down · truck + 2463 · Road traffic sound · city + 1172 · Wind cold interior · wind | 1620 lowpass 2.5k 0 dB (วน 3) · 2463 lowpass 3k −6 · 1172 −12 |
| `amb_wind` | 24 s | 2658 · Wind blowing ambience · wind + 1172 · Wind cold interior · wind | 2658 0 · 1172 −8 |
| `amb_day_birds` | 28 s | 2472 · Morning birds · birds + 1221 · Forest near countryside farm · countryside | 2472 0 · 1221 −8 |
| `amb_forest` | 28 s | 1238 · Windy humming forest with birds · birds + 1213 · European forest ambience · birds | 1238 0 · 1213 −6 |
| `amb_desert` | 24 s | 2495 · Desert ambience · desert + 1154 · Arctic winds · desert + 2494 · Sand in the desert · desert | 2495 0 · 1154 lowpass 1.2k −10 · 2494 ทรายไหลที่ 11 s −14 |
| `amb_snow` | 24 s | 1154 · Arctic winds · desert + 1175 · Winter wind loop · snow | 1154 0 · 1175 −4 (วน 3) |
| `amb_night` | 28 s | 1789 · Summer night crickets loop · crickets + 1241 · Forest ambience with croaking frogs · birds | 1789 0 · 1241 −6 |
| `amb_ghost` | 24 s | 1172 · Wind cold interior · wind + 1157 · Scary graveyard wind · horror + 1163 · Door creak opened by the wind · creak + 2623 · Ghostly whoosh passing · whoosh | 1172 0 (วน 2) · 1157 −3 (วน 3) · ประตูลั่น 6.5 s lowpass −10 · วูบผี 16 s lowpass+ก้อง −12 |
| `amb_station` | 26 s | 2929 · Urban ambience with traffic · city + 2504 · Industrial machine hum · wind + 371 · Sub urban ambience and birds · traffic | 2929 lowpass 2.2k 0 · 2504 lowpass 400 −12 (ฮัมไฟ) · 371 −8 |
| `amb_station_night` | 24 s | 1788 · Summer crickets loop · crickets + 2678 · Urban city ambience at night · city + 910 · Electricity buzz · buzz | 1788 0 (วน 2) · 2678 lowpass 1.5k −9 · 910 band 100–4k −14 (นีออน, วน 3) |
| `amb_motel` | 24 s | 1785 · River shore insect noise · crickets + 3126 · Water flowing ambience loop · water | 1785 0 (แมลงร้องแบบจักจั่น) · 3126 lowpass 1.4k −9 (น้ำสระ) |
| `wash_loop` | 16 s | 1537 · Car interior on car wash · car + 1870 · Shower water · shower | 1537 (ช่วง 20–150 s) 0 · 1870 −8 (วน 5) |
| `engine_loop` | 4 s | 1623 · Truck start engine · truck | ช่วงเครื่องเดินเบา 1.5–9 s lowpass 3.5k · ครอสเฟด 0.6 s · ลูปสั้นสำหรับปรับ playbackRate |

## One-shot
| คีย์ | ยาว | แหล่ง (id · ชื่อ · หน้า) | การตัด/ซ้อน |
|---|---|---|---|
| `horn` | 0.72 | 718 · Car horn · car | ตัดหัว |
| `horn_goofy` | 0.95 | 715 · Clown horn at circus · horn | ตัดหัว |
| `tire_screech` | 1.45 | **synthesized** (`synth:screech`) + 1620 · Truck slowing down · truck | โทน 1.55→1.17 kHz สั่นแบบ stick-slip + ฮาร์มอนิก + นอยส์ 0.9–5.2k · 1620 lowpass 900 −12 (เสียงเครื่องใต้) |
| `crash` | 1.8 | 2980 · Factory metal hard hit · crash + 1551 · Car window breaking · car + 1616 · Truck crash with explosion · crash | 2980 0 · กระจก −3 ที่ 30 ms · 1616 (ต้น 1.8 s) lowpass 2.5k −8 · limiter |
| `hazard_hit` | 0.9 | 2980 · Factory metal hard hit · crash + 1564 · Car door slam · car | 1564 −6 (ตุ้บ) |
| `nitro` | 2.0 | 1714 · Fast rocket whoosh · transition + 1720 · Space rocket full power turbine · power-up | 1720 fade-in −9 |
| `gear` | 0.75 | 2757 · Metal tank gear shift · engine | |
| `van_door` | 0.7 | 1564 · Car door slam · car | limiter |
| `sliding_door` | 2.5 | 1534 · Metallic door sliding · metal | |
| `rear_doors` | 2.0 | 3129 · Car door close · car | 2 ครั้ง (ครั้งที่ 2 ที่ 0.38 s ช้าลง 6 % −3) |
| `brake_stop` | 2.0 | **synthesized** (`synth:squeal`) + 1626 · Stopping truck · truck | เบรกหวีด ~2.7 kHz ส่าย 5.5 Hz −2 · 1626 (5.2–7.4 s ลมเบรก/หยุด) highpass −6 |
| `alert` | 1.0 | 268 · Game quick warning notification · alert | limiter |
| `boss_alarm` | 2.0 | 994 · Security facility breach alarm · alarm | 0–2 s (2 รอบ) |
| `fork_chime` | 1.3 | 2309 · Musical alert notification · alert | |
| `event_sting` | 2.2 | 2633 · Sweeping sparkle presentation intro · magic | ตัดหัว −40 |
| `victory` | 3.4 | 2059 · Game level completed · game | |
| `pump_beep` | 0.4 | 1073 · Shop scanner beeps · beep | ปี๊บแรก |
| `fuel_fill` | 2.5 | 1819 · Filling sink with water · water + 1835 · Vacuum engine hum · vacuum | 1819 lowpass 3k · 1835 lowpass 700 −10 (มอเตอร์ปั๊ม) |
| `shop_chime` | 2.2 | 109 · Home standard ding dong · bell | |
| `cash` | 1.0 | 1993 · Clinking coins · cash + 1838 · Kitchen oven ding · cooking | ding ที่ 0.12 s −4 |
| `toilet_flush` | 3.0 | 1871 · Toilet flush · splash | |
| `teleport` | 2.2 | 868 · Fairy teleport · magic | |
| `dog_bark` | 1.6 | 1 · Dog barking twice · dog | |
| `claw` | 1.25 | 1405 · Robot retract mechanism · mechanic | |
| `gacha` | 1.6 | 2817 · Winding up toy · toy + 2364 · Hard pop click · water | หมุน 1 s → ป๊อปแคปซูลที่ 1.02 s · limiter |
| `arcade` | 0.7 | 211 · Retro arcade casino notification · arcade | |
| `splash` | 1.4 | 1311 · Water splash · splash | |
| `ferris_creak` | 2.4 | 3076 · Ship hull creak · creak | 0.5–3.1 s |
| `sizzle` | 2.0 | 121 · Frying eggs on hot pan · frying | 2–4.2 s · limiter |
| `crowd_cheer` | 3.8 | 459 · Male crowd cheering short · crowd | |
| `upgrade` | 1.3 | 3164 · Video game power up · power-up | |
| `wrench` | 1.8 | 853 · Wrench metal noises · tools | 2.2–4.1 s · limiter |
| `paint_spray` | 1.0 | 1890 · Air freshener spray · spray | |
| `coin` | 0.6 | 2069 · Winning a coin, video game · coin | |
| `km_tick` | 0.12 | 1117 · Classic click · click | highpass 800 · พีค −20 dBFS |
| `region_enter` | 4.0 | 2628 · Relaxing harp sweep · magic | ตัดหัว −45 (เก็บช่วงค่อยๆ ดัง) |
| `ghost_whisper` | 3.5 | 302 · Male conspiracy voices whispers · whisper | ช้าลง 8 % lowpass 3.5k + ก้อง |
| `turret_fire` | 0.7 | 1662 · Game gun shot · gun (preview mp3) + 1681 · Laser weapon shot · gun | 1681 −10 · limiter |

## ยังไม่ได้ฟังจริง
- ทั้งหมดเลือกจากชื่อ + envelope/สเปกตรัม ไม่ได้ฟังด้วยหู — โดยเฉพาะ 2 เสียงสังเคราะห์ (tire_screech, brake_stop), `amb_motel` (เสียงแมลงแทนจักจั่น), `amb_road` (ใช้เสียงรถบรรทุกวิ่งคงที่เป็นเสียงยาง/ถนน)
- `amb_day_birds` รอยต่อลูปตกช่วงที่มีนกร้อง (ค่า seam cost สูง) แต่ครอสเฟด 3 s แล้ว ระดับหัว/ท้ายต่างกัน 0.3 dB

## เพลง

- `music/motel.mp3` — Mixkit "Lo-Fi 03" (#765) · https://mixkit.co/free-stock-music/tag/lounge/ · ไฟล์ https://assets.mixkit.co/music/765/765.mp3 · Mixkit Stock Music Free License · ตัดเงียบหัว/ท้าย (-50dB) + loudnorm I=-11.3 TP=-1 · 44.1 kHz 192 kbps · 1:52
