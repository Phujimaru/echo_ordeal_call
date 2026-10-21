# สัญญาข้อมูล server ↔ client — องค์หญิงดอกไม้ เซลิน (`celine` · GRID_PLAN §7.15)

กติกาเต็มอยู่ GRID_PLAN §7.15 · ไฟล์นี้บอกแค่ "ข้อมูลที่ส่งไปมา" ให้สองฝั่งเขียนคู่ขนานได้
สื่ออยู่ `client/public/characters/celine/` (junction ไป `C:\Echo\client\public\characters\celine`)

## 1. สื่อ
| คีย์ | ไฟล์ |
|---|---|
| รูปโปรไฟล์ | `/characters/celine/celine.webp` |
| ไอคอนสกิล | `celine_skill1.webp` (ความอ่อนโยน) · `celine_skill2.webp` (ความแข็งกร้าว) · `celine_skill3.webp` (ท่าไม้ตาย) |
| ไอคอนตัวเลือก | `icons/heal.svg` `icons/wall.svg` `icons/swap.svg` `icons/pair.svg` `icons/bloom.svg` · อาวุธ `icons/dagger.svg` `icons/dragon.svg` `icons/great.svg` `icons/fire.svg` `icons/wind.svg` `icons/thunder.svg` (client ทำ) |
| คลิปคริ | `celine_crit_sword.mp4` (2.47 วิ) · `celine_crit_mage.mp4` (3.37 วิ) — server คิวเป็นคัตซีน `celineCritSword` / `celineCritMage` ก่อนฉากตีทุกครั้งที่ตีปกติติดคริ |
| เสียงพากย์ | `voice/celine_v_*.m4a` — คีย์ใน audio.js = ชื่อไฟล์ไม่มีนามสกุล (`celine_v_turn1` …) |
| เสียงเอฟเฟกต์ | `sfx/<คีย์>.mp3` — คีย์ตามตาราง §5 (client ทำไฟล์ + ลงทะเบียนใน `client/src/audio.js` FILES) |

## 2. state ต่อผู้เล่น (`state.players[i]`)
- `celine` (เฉพาะตัวเซลิน — ไม่มี = ไม่ใช่เซลิน):
  ```
  { weapon: "dagger"|"dragon"|"great"|"fire"|"wind"|"thunder",
    weaponClass: "sword"|"magic",
    tenderLeft: 0..3,            // ความอ่อนโยนที่กดได้อีกในเทิร์นนี้
    healCount: 0..3, healCd,     // ฟื้นฟูนับสะสม (ครบ 4 → คูลดาวน์)
    wallCount: 0..1, wallCd,
    swapCd, ultCd,
    king: 0..3,                  // เทิร์นที่เหลือของบัฟราชาดอกไม้ (0 = ไม่มี)
    inBloom: bool }              // ยืนในพุ่มอยู่ (เวลาน้ำชา)
  ```
- `flowerWalk: true` = เดินตามช่องดอกไม้ไม่เสียก้าว (ส่งเข้า `Rules.reachable/stepPath/threatZone` เป็น opts.flowerWalk ใน `optsOf(p)`)
- ปุ่มสกิลหลายตัวเลือกมาจาก `skillPub` → `choices` (มีอยู่แล้ว: ดิเอโก้/เคท) — แต่ละตัวเลือก `{ key, name, img, desc, area, cost, cd?, left?, locked?, on? }`
  - basic: `heal` · `wall` · `swap` · `pair` · `bloom`
  - secondary: `dagger` · `dragon` · `great` · `fire` · `wind` · `thunder` (`on: true` = อาวุธที่ถืออยู่)

## 3. กระดาน
- `state.board.special["x,y"] = "bloom"` = พุ่มดอกไม้ของเซลิน (ชั้นทับช่องเดิม) · `Rules.TERRAIN_INFO.bloom` มี `{ evade: 20, bush: true, flower: true }` (ค่าเดิน 1)
- `state.board.terrain["x,y"] = "icewall"` = กำแพงน้ำแข็ง (สิ่งกีดขวาง)
- `state.board.celine = { flora: [{ x, y, left, made, owner }], walls: [{ x, y, owner }] }` — made = เกิดจากคฑาแห่งการรังสรรค์ (อยู่ 5) · ไม่ใช่ = รอยเท้า (อยู่ 3)
- กำแพงตีได้เหมือนหนามน้ำแข็ง: อยู่ใน `state.board.spikes` ด้วย `{ x, y, lv: 1, armor: 1, wall: true }` → เป้าตีปกติ `"spike:x,y"` เดิม · client ต้องแสดงชื่อ "กำแพงน้ำแข็ง" และไม่วาดเป็นหนาม

## 4. การเลือกเป้า (useSkill)
socket `useSkill { tier, targets, dir, form, tile, orient }`
| ตัวเลือก | area | ส่ง |
|---|---|---|
| `heal` | `{ kind: "target", range: N, self: true }` | `targets: [id]` (ศัตรูได้) |
| `wall` | `{ kind: "tile", range: N, place: "wall", rect: [3, 1] }` (rect ตาม orient: h = [3,1] · v = [1,3]) | `tile` = ช่องกลาง · `orient: "h"|"v"` (คลิกขวา/R/ล้อเมาส์หมุน) · มีคนในแนว = เลือกทิศผลัก `dir` ตั้งฉากกับกำแพง (h → up/down · v → left/right · ทิศที่ผลักไม่ได้กดไม่ได้) |
| `swap` | `{ kind: "target", range: 5 }` | `targets: [id]` (ไม่ใช่ตัวเอง · ตัว 2×2 ขึ้นไปไม่ได้) |
| `pair` | `{ kind: "target", range: 5, count: 2 }` | `targets: [a, b]` สองคนต่างกันในระยะ (ไม่รวมเซลิน · ตัว 2×2 ขึ้นไปไม่ได้) |
| `bloom` | `{ kind: "tile", range: 26, place: "bloom" }` | `tile` — ช่องที่ไม่ใช่สิ่งกีดขวาง/ร้านค้า (มีคนยืนได้) |
| อาวุธ 6 แบบ | `self` | `form` = คีย์อาวุธ |
| ท่าไม้ตาย | `self` | – |

## 5. เอฟเฟกต์ — socket `celineFx` (`engine.boardFx`) · ทุกก้อนมี `{ kind, id, color }`
| kind | ฟิลด์ | เสียง (sfx ที่ server ส่งพร้อม) |
|---|---|---|
| `heal` | `from {x,y}`, `to {x,y}`, `targetId`, `amt`, `selfAmt`, `crit`, `mult` (2/3), `self` (เลือกตัวเอง) | `celine_heal` (คริ = `celine_heal_crit`) |
| `wall` | `tiles [{x,y}]`, `orient` | `celine_wall` — คนที่ถูกผลักมาเป็น `iceFx` knock ตามหลัง |
| `wallBreak` | `tiles [{x,y}]`, `why: "hit"|"expire"` | `celine_wall_break` |
| `swap` | `mode: "swap"|"pair"`, `a { id, from, to }`, `b { id, from, to }` | `celine_swap` |
| `bloom` | `tiles [{x,y}]`, `made: true` | `celine_bloom` |
| `trail` | `tiles [{x,y}]` ตามลำดับก้าว (พุ่มงอกใต้เท้า — เล่นทีละช่องตามจังหวะเดิน ~120 ms/ก้าว) | `celine_trail` (เบา) |
| `weapon` | `weapon`, `at` | `celine_weapon_sword` / `celine_weapon_magic` |
| `ult` | `at` | `celine_ult` |
| `tea` | `at`, `amt`, `crit` | `celine_tea` |
| `burn` / `shock` / `gust` | `targetId`, `at`, `sound` (ผลติดหลังตีปกติ — burn/shock ส่งเสียงใน payload ให้ client เล่นตอนปะทะ) | `celine_fire_hit` / `celine_thunder_hit` / `celine_wind_hit` |
| `collide` | `targetId`, `at` (ลมผลักชน +1) | `celine_collide` |

ตีปกติ: `attackStyle` = `celineDagger` · `celineDragon` · `celineGreat` · `celineFire` · `celineWind` · `celineThunder` (ต้องมีตัววาด + `STYLE_MS`/`STYLE_HIT_P` ใน boardDraw.js) · `attackSound` = `celine_atk_<weapon>`

## 6. ธีมภาพ
เจ้าหญิงดอกไม้: ทอง (#f3c94b) · เขียวอ่อนใบไม้ (#b5d86a / #7fae3b) · ชมพูดอกไม้ (#f59ab8) · ส้มผีเสื้อ (#f39a4b) · ขาวครีม (#fff6dc)
กลีบดอกไม้ ผีเสื้อ มงกุฎ ประกายทอง วงเวทลายเถาวัลย์ · ห้ามมีข้อความอธิบายใน UI (CLAUDE.md)
