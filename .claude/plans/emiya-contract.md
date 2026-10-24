# สัญญาข้อมูล server ↔ client — เอมิยะ ชิโร่ (`emiya_shirou`)

กติกาเต็ม: GRID_PLAN §7.18 · server: `characters/emiya_shirou.js` · เอฟเฟกต์ `client/src/board/emiyaFx.js` · หน้าทดสอบ `?board=1&emiya=1` (`EmiyaFxDev.jsx`)
โทนสี: วงจรเวทฟ้า `#5FE3FF` · Kanshou ดำ `#202028` / Bakuya ขาว `#ECECF4` · ธนูดำ + ลูกศรแดง `#DC2834` · Rule Breaker สายรุ้ง `#C77DFF #7BE0FF #8CFFAA #FFD166` ·
Nine Lives หิน `#6E6A5E` · Excalibur ทอง `#FFD45E` / `#FFF3B0` · Rho Aias ชมพู `#FF7FB6` · โลก UBW ส้มซีเปีย `#E8823A` · ไฟ `#FF6A2B`

## 1. state ที่ client ได้
- `players[].emiya` = `{ weapon, weaponTurns, usesLeft, traceCd, wsCd, ultCd, ubw, cap, avalonCd, excalUsed }`
  - `weapon` = `kb` | `hrunting` | `rule` | `nine` | `excalibur` | null · `weaponTurns` = เทิร์นที่เหลือ (รวมเทิร์นนี้) · `usesLeft` = ตี+สกิลรองที่เหลือก่อนหาย (Excalibur = ตีที่เหลือ)
  - `*Cd` = เทิร์นคูลดาวน์ที่เหลือ · `ubw` = เทิร์นที่เหลือของ UBW (0 = ไม่กาง) · `cap` = ความจุแต้มที่เพิ่มแล้ว (0–16)
- `players[].strikeRect` = `[2, 3]` ระหว่างถือ Nine Lives (ไฮไลต์กรอบในแผนตี) · `range` / `lane` / `mov` เปลี่ยนตามอาวุธ (ฮุคกลาง)
- สถานะ `emiyaUbw` (ป้าย `STATUS_INFO` ใน Game.jsx) · ปุ่ม Trace On = 5 ตัวเลือก (`choices` มี `desc` · `cd` · `on` · `locked` · `free`) · ปุ่มรอง = ชื่อ/รูป/คำอธิบาย/พื้นที่/ราคาตามอาวุธ (`skillPub` + `skillArea` + `skillCost`) · ไม่มีอาวุธ = `skillLocks.secondary.locked`
- ฉากตี: `card.repeat` [{ dmg, dodge, kill, crit, skills }] = ฮิตเพิ่มของ Kanshou & Bakuya (BoardStage เล่นห่าง `EMIYA_REPEAT_MS`)

## 2. ท่าตีปกติ (`card.byStyle` · ไม่พุ่งตัว — ยิง/ขว้าง/ฟันจากที่ยืน)
| style | ภาพ | ms / ปะทะ |
|---|---|---|
| `emiyaKB` | ดาบคู่ขาวดำหมุนโค้งไปหาเป้า → ฟันไขว้ (ฮิตที่ 2 ตามหลัง 300ms) | 1000 / 0.42 |
| `emiyaBow` | ง้างธนูดำ แสงแดงรวมปลายลูกศร → ลูกศรพุ่งเส้นแดง → ประกายแตก | 900 / 0.56 |
| `emiyaRule` | มีดสายรุ้งซิกแซกแทง → วงเวทหกเหลี่ยมบนเป้าแตก | 820 / 0.46 |
| `emiyaNine` | ดาบหินยักษ์ฟาดลงกรอบ 2×3 (`fx.lane`) → แสงฟัน 9 จุดรัว | 1000 / 0.42 |
| `emiyaExcal` | ยกดาบทองฟันลง → แถบแสงทองวิ่งตามแนว 3×1 (`fx.lane`) | 900 / 0.40 |
เสียง: `emiya_atk_<weapon>` (จุดปะทะต้นไฟล์ — K&B มี 2 จังหวะในไฟล์)

## 3. socket `emiyaFx` — `{ kind, id, color, at, size, ... }` (at/size = ของชิโร่ ณ ตอนส่ง)
| kind | ฟิลด์เพิ่ม | ภาพ | server พัก |
|---|---|---|---|
| `trace` | `weapon, prev` | วงจรเวทฟ้าวิ่งขึ้นรอบตัว → โครงลวดอาวุธเหนือหัวก่อตัวเป็นของจริง (Excalibur มีแสงทอง) | – |
| `weaponBreak` | `weapon, why` (`used`/`expire`/`sever`) | อาวุธแตกเป็นละอองฟ้า | – |
| `capacity` | `cap` | ประกายฟ้าวนขึ้นรอบตัว | – |
| `avalon` | – | ฝักดาบทองน้ำเงินลอยขึ้น + วงแสงทอง/เขียว | – |
| `throw` / `throwHit` | `targetId, to, tsize` / `+ dmg, dodge` | ดาบคู่หมุนโค้งไปหาเป้า → ฟันไขว้ · throwHit = เลขดาเมจ | throw 0.6 วิ |
| `ruleHit` | `targetId, to` | วงสายรุ้งแตกรอบเป้า (ห้ามสกิล/ผนึกพลังงานติด) | – |
| `caladbolg` | `dir, tiles, to, targetId, tsize` | (หลังคลิป Before/After) ลูกศรสว่านพุ่งตามแนวถึงเป้าแรก หางเกลียวแดงฟ้า | 0.7 วิ |
| `caladbolgBlast` | `at, tsize, radius, tiles, hits[{id,dmg,dodge}]` | ลูกไฟ + คลื่นกระแทกรัศมี 2 + ช่องไหม้ + เศษไฟ · เลขดาเมจคนแรก | 0.9 วิ |
| `caladbolgSplash` | `hits[{id,dmg}]` | เลขดาเมจรอบวงระเบิด | – |
| `smash` | `dir, tiles` | ยกดาบหิน → ทุบพื้น รอยแตก/ฝุ่นวิ่งตามแนว 4×3 (ผลักเล่นทาง `iceFx`) | 0.75 วิ + ผลัก |
| `stun` | `ids` | ดาวหมุนเหนือหัวคนที่ชน | – |
| `rho` | – | โล่ดอกไม้ 7 กลีบชมพูบานหน้าตัว | – |
| `excalibur` / `excaliburHit` | `dir, tiles` / `hits[{id,dmg}]` | ชาร์จแสงทอง → ลำแสงทองกว้างวิ่งตามแนว 5×3 · เลขดาเมจ | 1.4 วิ |
| `ubw` | – | (หลังคลิป UBW) วงไฟแผ่จากตัวชิโร่ทั่วกระดาน → โลกแห่งดาบเฟดเข้า | – |
| `ubwEnd` | `why` | โลกแห่งดาบจางหาย | – |

## 4. ชั้นค้าง (prop `emiya` ของ BoardCanvas = `{ ubw, units: [{ id, weapon }] }`)
- `drawEmiyaWorld` พื้นโทนส้มซีเปีย (ใต้ไฮไลต์) · `emiyaItems` ดาบปักพื้น (~1 ใน 5 ช่องที่ไม่มีสิ่งกีดขวาง/คน · โผล่ตามวงไฟ) + อาวุธที่ถือลอยข้างไหล่ · `drawEmiyaSky` เฟืองยักษ์หมุนช้าที่ขอบบน + ประกายไฟลอยขึ้น + ขอบจออุ่น
- เคารพ `lowQ` / `prefers-reduced-motion`

## 5. เสียง (`client/src/audio.js`) — Mixkit ฟรี ~-16 LUFS (แหล่งที่มา `.claude/plans/emiya-sfx-sources.md` · สร้างใหม่ได้ด้วย `.claude/plans/emiya-sfx.py`)
`emiya_trace` · `emiya_trace_excalibur` · `emiya_break` · `emiya_capacity` · `emiya_avalon` · `emiya_atk_{kb,hrunting,rule,nine,excalibur}` · `emiya_throw` · `emiya_caladbolg_shot` · `emiya_caladbolg_blast` · `emiya_smash` · `emiya_rho` · `emiya_excalibur` · `emiya_ubw` · `emiya_stun`
- ไม่มีเสียงพากย์ (รอไฟล์จากผู้ใช้) · คลิป Caladbolg / UBW มีเสียงในตัว
