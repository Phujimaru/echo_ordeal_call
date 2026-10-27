# server/fodlan/ — ด่านของโหมด Fodlan (GRID_PLAN §8.5)

ตัวคุมกลาง = `server/fodlan.js` (ลำดับด่าน · สภาพอากาศ · จุดเสียบเข้า engine ทั้งหมด) · แต่ละด่านมี 2 ไฟล์:

- `mapN.js` — **ข้อมูลล้วน** (ไม่ require อะไรใน server/ — board.js โหลดตอนเริ่ม):
  `module.exports = { map: { terrain, special, heal, healKind?, spawns, shopSpots, cols?, rows? } | null, TERRAIN: { kind: { name, icon, desc, cost?, evade?, bush?, end?, … } } }`
  - `map` = สเปกเดียวกับ `buildMap` ใน server/board.js (area/name ใส่ให้เอง) · `null` = ยังใช้แผนที่ชั่วคราว
  - `TERRAIN` = ชนิดช่องใหม่ (รวมเข้า `Board.TERRAIN_INFO`) — ตั้งชื่อขึ้นต้น `fd_` เสมอ (client วาดผ่าน `client/src/board/fodlan/`)
  - ช่องใน `terrain` = สิ่งกีดขวาง (เดิน/ยืนไม่ได้) · ช่องใน `special` = เดินได้แต่มีผล
- `stageN.js` — กติกาของด่าน: export ฟังก์ชันที่ต้องใช้ (ไม่มี = ไม่ทำอะไร) · ทุกฟังก์ชันได้ `(ctx, st, …)`
  - `ctx` = เครื่องมือกลาง (ดู `makeCtx` ใน server/fodlan.js): match · engine · Board · action · combat · Status · view · log · rng · units() · map() · damage() · bump() …
  - `st` = สถานะของการมาเยือนครั้งนี้ (`match.fodlan.s` — ล้างทุกครั้งที่เข้าด่าน) · `st.weather` = `{ kind, left }` | null (อ่านอย่างเดียว)

| ฮุค | เรียกจาก | ใช้ทำ |
|---|---|---|
| `enter(ctx, st)` | เข้าด่าน (หลัง placeOnBoard) | ตั้งของบนกระดาน (เรือ กองไฟ ศิลาตรา …) |
| `weatherStart(ctx, st)` | จบเทิร์นที่สุ่มสภาพอากาศติดกลางด่าน | ผลตอนสภาพอากาศเริ่ม (กองไฟดับ) — ตอนเข้าด่านให้ `enter` ดู `ctx.weather` เอง |
| `layer(ctx, st, map) → map` · `layerVer(ctx, st) → string` | action.boardMap | ช่องที่เปลี่ยนระหว่างเกม (เรือ ไฟลาม สะพานน้ำแข็ง) — ต้องคืน map ใหม่ ห้ามแก้ของเดิม · ver เปลี่ยนเมื่อชั้นเปลี่ยน (`ctx.bump()` เพิ่ม `st.ver`) |
| `preRound(ctx, st) → วินาที` | ต้นเทิร์นก่อนแจกไพ่ | ลงผลเหตุการณ์ที่เตือนไว้ (ฟ้าผ่า ธนู มังกร ซึนามิ) + ตั้งเป้าเทิร์นหน้า · คืน > 0 = พักเกมให้ client เล่นฉาก (`st.fx`) |
| `onEndTurn(ctx, st)` | จบเทิร์น (ก่อนตัดสินจบเกม) | ความอบอุ่น · ไฟลาม · นับเวลา |
| `onUnitEnd(ctx, st, p)` | จบตาของแต่ละตัว (endUnitTile) | ยึดธง · ยืนบนไฟ · นั่งบัลลังก์ |
| `hudActions(ctx, st, p) → [{ key: "fd:…", icon, name, disabled?, tiles?: [{x,y}] }]` | view.js (ปุ่ม HUD เจ้าตัว) | ตกปลา · ขับเรือ · คันโยก · ยิงเครื่องยิงหิน · วางคบเพลิง · หยิบศิลาตรา … |
| `charAction(ctx, st, p, key, tile) → bool` | socket charAction (key ขึ้นต้น `fd:`) | ทำตามปุ่ม · ใช้แทนการตี = `ctx.useStrike(p, secs, after)` |
| `objects(ctx, st) → [{ id, x, y, kind, hp?, strike? }]` | publicInfo + ตีปกติ | ของบนกระดานที่ตีได้ (`strike: true` — เสาเวทมืด ต้นไม้แห้ง กองหิมะ) id = "fd:<ชื่อ>" |
| `strikeObject(ctx, st, p, objId) → วินาที \| false` | action.strikeTarget (targetId "fd:…") | ผลของการตีของชิ้นนั้น |
| `movMod(ctx, st, p) → จำนวน` | action.movOf | ฝนฟ้าผ่า −1 |
| `atkBonus(ctx, st, p) → จำนวน` | attack.computeAttackBase | ศิลาตรา +1 |
| `preventDeath(ctx, st, p) → bool` | combat.instantDeath | ชีพจรเทพ (ตั้งเลือดเองแล้วคืน true) |
| `hides(ctx, st, viewer, target) → bool` | visibility.hiddenFromOne | หมอก (ด่าน II) |
| `vision(ctx, st, viewer) → string[] \| null` | view.js (เจ้าตัว) | ช่องที่ viewer มองเห็น (client วาดหมอกนอกช่องเหล่านี้) |
| `publicInfo(ctx, st) → object` | state.fodlan.board | ข้อมูลให้ client วาด (เรือ ไฟ ช่องเตือน ฉาก fx …) |
| `playerInfo(ctx, st, p) → object` | state.players[].fodlan | ความอบอุ่น · ศิลาตรา · ชีพจรเทพ |
| `persist: { preventDeath, atkBonus, maxHpBonus, onEndTurn, playerInfo }` | ฮุคเดียวกันข้างบน + combat.maxHpOf | **ผลค้างข้ามด่าน** — ถามทุกด่านที่ export ไม่ใช่แค่ด่านปัจจุบัน · ได้ `(ctx, st \| null, …)` (st = null เมื่อตอนนี้อยู่ด่านอื่น) · เก็บสถานะเองที่ `match.fodlan` · ชีพจรเทพ/ศิลาตรา/ร่างอสูร (ด่าน V) · playerInfo ต่อ badges |

กฎ: ห้ามแก้ไฟล์กลาง (server/*.js, client ส่วนกลาง) จากในไฟล์ด่าน — ถ้าต้องการจุดเสียบใหม่ให้เพิ่มใน server/fodlan.js ตามแบบเดิม
