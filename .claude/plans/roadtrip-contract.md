# Road Trip — สัญญาข้อมูลกลาง (build v1 · 2026-11-14)

ทุกคนที่ลงโค้ดโหมดนี้อ่านไฟล์นี้ + GRID_PLAN.md §8.8 ก่อน · ต้นแบบที่ผู้ใช้เห็นแล้ว: `.claude/plans/road-trip-van.html` (รถตู้ 3D, ขับ, วิทยุ, อัปเกรด, ของแต่ง) และ `.claude/plans/road-trip-station-2d.html` (ปั๊ม 2D)
กฎโปรเจกต์ (CLAUDE.md): ข้อความผู้เล่นเป็นภาษาไทย · **ห้ามข้อความอธิบายใน UI** (ชื่อ ตัวเลข ไอคอนเท่านั้น) · ไม่ทำมือถือ · ธีมมืด/สว่าง (ui-theme.css) · ทุกสกิลหลบได้ · ห้าม commit (ผู้ประสานงาน commit เอง)

## 1. ตัวตนของโหมด
- `match.world = "roadtrip"`, `match.gameMode = "roadtrip"`, ความยาก `match.rtDiff` = `"easy" | "normal" | "hard"` (โหวตเสียงข้างมาก เสมอ = normal — แบบ `eosDiffOf`)
- ผู้เล่น 1–6 คน ทีมเดียว (team A) — `teamModeActive()` = true
- ลูกโลก: หมุดย่อยบนโลก `"roadtrip"` (ข้าง origin/fodlan/eos) · โหมดเดียว → เปิดหน้าต่างโหวต + ความยากทันที (แบบ `SINGLE`)
- client ส่ง `socket.emit("selectGameMode", { mode: "roadtrip", world: "roadtrip", diff })`

## 2. วงจรเกม (server — `server/roadtrip/`)
`state.roadtrip.phase`:
| phase | gameState | ภาพ (client) | การ์ด |
|---|---|---|---|
| `intro` | `ROADTRIP` | 3D ขับ (ฉากเปิด ~6 วิ) | ไม่มี |
| `drive` | `ROADTRIP` | 3D ขับเต็มจอ (`RoadDrive`) | ไม่มี |
| `fork` | `ROADTRIP` | 3D ขับ + แผงเลือกทาง | ไม่มี |
| `event` | `ROADTRIP` | 3D ขับ (รถชะลอ) + การ์ดเหตุการณ์ | ไม่มี |
| `stop` | `ROADTRIP` | **กระดาน 2D เดิม** (แผนที่ปั๊ม/โมเต็ล) เดินอิสระ | ไม่มี |
| `combat` | วงจรเดิม (`PLAYING`→`ACTION`…) | กระดาน 2D ทับฉาก 3D ถนน (แบบ Colony) | จั่วตามปกติ |
| `over` | `GAMEOVER` | สรุป | — |

- drive ช่วงละ ~25 วิ จริง (server tick 250 ms): `km` เพิ่มตามความเร็ว · น้ำมันลด · สิ่งกีดขวาง (`hazards`) โผล่ล่วงหน้า 3 วิ ในเลน −1/0/1 → ถ้าตอนถึง `van.lane` = เลนนั้น → รถเสีย HP (กันชนลดดาเมจ) · คนขับ (`van.driverId`) เปลี่ยนเลนได้ · ไม่มีคนขับ = รถวิ่งตรง
- ทุก 2 ช่วงขับ → `fork` 2–3 ทาง (ไอคอน) โหวต 15 วิ → ไปถึงจุดนั้น:
  `gas` → stop (ปั๊ม) · `motel` → stop (โมเต็ล: ฟื้นเต็ม + ชุบคนตาย) · `fight` → combat ambush · `elite` → combat ambush + อีลิท · `event` → การ์ดเหตุการณ์ · `boss` (บังคับทุก 50 กม.) → combat boss
- ภูมิภาคเปลี่ยนทุก 100 กม. วนรอบ (`loop`++ โหดขึ้น): `plains` ทุ่งหญ้า → `desert` ทะเลทราย → `forest` ป่า → `snow` หิมะ → `ghost` เมืองร้าง
- กลางคืน: ทุก 40 กม. สลับ กลางวัน/กลางคืน (`night`) — กลางคืน = ปั๊มหลอน ผีโบกรถ
- combat:
  - `ambush` / `elite` / `boss`: วางกระดานถนน (area `RT_ROAD`) — รถตู้จอดกลางกระดานเป็นสิ่งกีดขวาง · ผู้เล่นเกิดข้างรถ · มอนเกิดหน้า/หลัง · จบเมื่อมอนหมด → รางวัลทอง → drive
  - `onvan`: กระดาน `RT_ONVAN` — ช่องในรถตู้ 3×7 (terrain `van`) ผู้เล่นเกิดในรถ · มอนเกิดบนถนนสองข้าง/ท้าย · ทุกรอบถนนเลื่อน: ยูนิตบนช่องถนน (ไม่ใช่ `van`) ถอยหลัง `scroll` ช่อง · ตกขอบหลัง = มอนหายไป / ผู้เล่นตก = เสีย HP แล้ววางกลับท้ายรถ · ช่องคนขับว่างตอนจบรอบ = รถส่าย (รถเสีย HP) · รอดครบ `rounds` รอบ หรือฆ่าหมด = ชนะ · ประตูท้ายเปิด (`van.rearOpen`) = ยืนแถวท้ายตี/สกิลระยะ +1
  - แพ้: ผู้เล่นตายหมด หรือ `van.hp` ≤ 0 → `over`
- stop: เดินอิสระ ไม่จำกัดระยะ ไม่มีตาเดิน (คลิกช่อง → `rt:walk`) · ร้าน = ระบบร้านเดิม (`shop.js`) ที่ช่องร้านของแผนที่ · กิจกรรม = วัตถุบนแผนที่ (`rt:act`) · อู่ = อัปเกรด/ของแต่ง · หมดเวลา (ปั๊ม 150 วิ / โมเต็ล 60 วิ) หรือทุกคนกดพร้อม → drive
- ตาย: นอนรอ → ฟื้นที่จุดพักถัดไป (ปั๊ม 50% · โมเต็ลเต็ม) หรือใช้ `ขนนกคืนชีพ` (ขายที่มินิมาร์ท ยกเว้น hard = สุ่มของหายาก)
- คะแนน = `km` · สรุปตอนจบ `summary`

### ความยาก (`DIFF` ใน server/roadtrip/diff.js)
| | easy | normal | hard |
|---|---|---|---|
| มอน HP/ATK ต่อ 10 กม. | +4% | +7% | +11% |
| จำนวนมอน ×| 0.8 | 1 | 1.3 |
| น้ำมันใช้ ×| 0.7 | 1 | 1.3 |
| ราคา ×| 0.8 | 1 | 1.25 |
| ขนนกคืนชีพ | ถูก (6) | 10 | ไม่ขายประจำ |
| ฟื้นหลังสู้ | อัตโนมัติ 50% | ที่จุดพัก | ที่จุดพัก |

## 3. รถตู้ (ค่าสถานะ — รีเซ็ตทุกรอบเล่น)
อัปเกรด 8 อย่าง ขั้น 0–3 (ค่าตามต้นแบบ): `body` HP 20/30/40/55 · `engine` 100/115/130/150 กม./ชม. · `tank` 40/60/80/100 ลิตร · `susp` ×1/1.3/1.6/2 (หลบสิ่งกีดขวางไว) · `nitro` 0–3 · `turret` 0–3 (ป้อมปืนบนหลังคา: ตอน combat ยิงอัตโนมัติ 1 ครั้ง/รอบ ใส่มอนใกล้รถ ดาเมจ = ขั้น) · `bumper` 0–3 (ชนสิ่งกีดขวางเสียน้อย · ambush: มอนที่ติดหน้ารถโดนชน) · `storage` 6/8/10/12 (ช่องกระเป๋าเพิ่มให้ทุกคน +0/+1/+2/+3 ไม่เกิน 8)
ราคาอัปเกรด (ทอง ทีมจ่ายจากคนกด): ขั้น 1/2/3 = 6/10/16 × diff.price
ของแต่ง (ฟรี ไม่มีผลค่าสถานะ — ปลดล็อกด้วยกิจกรรม/ทองนิดหน่อย v1 = ฟรีทั้งหมด): ชื่อตามต้นแบบ 20 อย่าง + ทรง `normal|goofy|cool` + สี (`paint` hex) + ทะเบียน (`plate` ≤ 9 ตัว ตัดอักขระควบคุม)

## 4. `state.roadtrip` (server/view.js → client)
```js
{
  phase, endsAt,            // endsAt = epoch ms ของ phase นี้ (null = ไม่มี)
  diff, km, region: { id, loop }, night,
  van: { hp, hpMax, fuel, fuelMax, kmh, lane, driverId, nitro, style, paint, plate, decor: [..], upg: { body, engine, tank, susp, nitro, turret, bumper, storage }, rearOpen },
  hazards: [{ id, lane, at }],          // at = epoch ms ที่ถึงรถ
  fork: { options: [{ kind }], votes: { [pid]: i } } | null,
  event: { id, kind, choices: [{ key, label, cost }], votes: { [pid]: key } } | null,
  stop: { kind: "gas" | "motel", ready: { [pid]: true }, acts: { [objId]: { cd } } } | null,
  combat: { kind, round, rounds, scroll } | null,
  radio: { src: "off" | "synth" | "yt", station, yt: { id, list, start, at }, by },
  fx: [{ k, ... }],                     // เหตุการณ์ชั่วคราวให้ client เล่น (key กันเล่นซ้ำ แบบ colonyEvents)
  summary: { km, kills, gold, region, loop, diff } | null,
}
```

## 5. คำสั่ง socket (onPlayerEvent — ใช้ได้ทุกคนไม่ต้องเป็นตาตัวเอง ยกเว้นระบุ)
`rt:seat {seat: "driver" | null}` · `rt:steer {lane}` (คนขับ) · `rt:nitro` (คนขับ) · `rt:horn` · `rt:vote {i}` (fork) · `rt:event {key}` · `rt:walk {x, y}` (stop) · `rt:act {id}` (stop — ต้องยืนติดวัตถุ server เดินให้ถ้ายังไม่ติด) · `rt:ready` · `rt:upg {key}` · `rt:decor {name, on}` · `rt:style {style}` · `rt:paint {hex}` · `rt:plate {text}` · `rt:radio {src, station, yt}` · `rt:rear` (สลับประตูท้าย — combat ตาตัวเองเท่านั้น)
ร้านค้าที่ปั๊ม = `viewShop` / `buyShopItem` เดิม (ยกเว้นข้อจำกัดตาเดินตอน phase stop)

## 6. แผนที่ (server/roadtrip/maps.js → board.js `MAPS[area]` + `npm`/`node scripts/gen-board-rules.js`)
area id: `RT_ROAD = 70` (ambush 20×11) · `RT_ONVAN = 71` (20×11 รถตู้กลาง) · `RT_GAS = 72/73/74` (ปั๊ม 3 แบบ 24×16) · `RT_MOTEL = 75` (16×12) — ตรวจว่า id ว่างก่อนใช้
วัตถุบนแผนที่ปั๊ม/โมเต็ล (ส่งผ่าน `map.rtProps` หรือ layer): `{ id, kind, x0, y0, x1, y1, spot: [x, y], h }` kind = `mart | garage | wash | wc | pump | claw | gacha | arcade | karaoke | dog | fortune | spicy | pond | ferris | price | bench | plant | canopy | van | motel | pool | bbq | vending | ...` — client วาดด้วย `client/src/board/roadtrip/props.js` (สไตล์กระดานเดิม: เอียง หน้าสว่าง/ข้างเข้ม พาสเทล)

## 7. client — ไฟล์ใหม่ / เจ้าของ
- `client/src/roadtrip/van3d.js` — โมเดลรถตู้ (พอร์ตจากต้นแบบ: ทรง 3 แบบ ของแต่ง อัปเกรด ห้องใน หลังคา ประตูท้าย) `createVan(opts) → { group, setState(van), tick(dt, t, ctx), dispose }`
- `client/src/roadtrip/road3d.js` — ฉากถนน 3D + ภูมิภาค 5 แบบ + กลางคืน + รถอื่น/สิ่งกีดขวาง · ใช้ 2 แบบ: (ก) `RoadDrive` เต็มจอ (มุมกล้อง 9 แบบ) (ข) ใต้กระดาน combat — API เหมือน `colony3d` (`update/project/unproject/depth/dispose`) ให้ `boardGeo.setCustomProjection`
- `client/src/roadtrip/RoadDrive.jsx` — หน้าขับ (HUD ความเร็ว กม. น้ำมัน HP · ปุ่มนั่งคนขับ · คีย์ ←→ / A D เปลี่ยนเลน · Shift ไนตรัส · Space แตร · C มุมกล้อง)
- `client/src/roadtrip/radio.js` — วิทยุ: สังเคราะห์ 5 สถานี (พอร์ตจากต้นแบบ) + YouTube IFrame (ตัวเล่นมุมขวาล่าง ≥ 200×200) · ซิงก์ตาม `state.roadtrip.radio`
- `client/src/roadtrip/*.jsx` — แผงเลือกทาง · การ์ดเหตุการณ์ · แผงจุดพัก (พร้อม/เวลา) · อู่ (อัปเกรด/ของแต่ง/สี/ทะเบียน/ทรง) · แถบสถานะรถ · สรุปจบ
- `client/src/board/roadtrip/props.js` + `mobArt.js` — วาดวัตถุแผนที่ + มอน (ถ้ามีไฟล์ `/roadtrip/mobs/<type>.webp` ใช้ภาพนั้น ไม่มีก็วาดเอง)
- dev route: `?roadtrip=drive` (หน้าขับแบบไม่ต่อ server) · `?roadtrip=stop` (กระดานปั๊ม)

## 8. มอน (server/roadtrip/mobs.js · Summon side `"rtmob"`)
ทั่วไป: `stray` หมาจรจัด (เร็ว อ่อน) · `crow` อีกาเหล็ก (บิน ข้ามสิ่งกีดขวาง) · `biker` แก๊งมอเตอร์ไซค์ (พุ่ง 5 ช่องชน) · `trucker` ซอมบี้รถบรรทุก (ถึก ชนแนว) · `giant` ยักษ์ขวางถนน (ถึกมาก ช้า)
ภูมิภาค: `cactus` กระบองเพชรเดินได้ (ทะเลทราย หนาม) · `boar` หมูป่า (ป่า) · `yeti` มนุษย์หิมะ (หิมะ ทำเชื่องช้า) · `ghost` ผีโบกรถ (กลางคืน/เมืองร้าง ทะลุ) · บอส `devilTruck` รถบรรทุกปีศาจ (ทุก 50 กม.)
ค่าสถานะ = ฐาน × (1 + diff.grow × floor(km/10)) × (1 + 0.25 × loop) · AI: เดิน BFS เข้าหาเป้า (ผู้เล่นใกล้สุด / รถ) แล้วตี · มอนตาก่อนผู้เล่นใน preRound (แบบ Eos)
