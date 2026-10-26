# สัญญาข้อมูล — ทราฟาก้า ลอว์ (`trafalgar_law`) · GRID_PLAN §7.20

server = `characters/trafalgar_law.js` (Claude หลัก) · เอฟเฟกต์ = `client/src/board/lawFx.js` (+ `LawFxDev.jsx`, หน้า `?board=1&law=1`)
พิกัดทุกอย่างเป็นช่องกระดาน `{ x, y }` (มุมบนซ้ายของตัว · ตัวใหญ่มี `size`) · ไม่มีเสียงตอนนี้ (ผู้ใช้ส่งทีหลัง) · ห้ามมีข้อความอธิบายบนจอ

## 1. ข้อมูลค้างบนกระดาน — `state.board.law` (ฮุค `boardPublic` · ทุกคนเห็น)
```js
law: {
  rooms:   [{ owner, color, x0, y0, x1, y1, size /* 5 | 9 */, cx, cy, seq }], // x1/y1 = ช่องสุดท้าย (รวม) · seq = เลขเปิดครั้งนั้น (ใหม่ = เล่นฉากกาง)
  objects: [{ id, owner, x, y, seq }],          // วัตถุลอย (ก้อนพื้นที่ถูกตัด) ≤ 4 ต่อลอว์ · ไม่ขวางทาง (คนยืนช่องเดียวกันได้)
  marks:   [{ owner, id }],                     // ยูนิตที่ถูกมาร์ก (ตีโดน) ในตาเดินนี้ของลอว์ — ภาพ: ร่างถูกตัดเป็น 3–4 ชิ้นลอยแยกค้างตลอดที่อยู่ในรายการ (ดูด้านล่าง)
  hearts:  [{ owner, victim, left }],           // หัวใจที่ถูกดึงออก (เหยื่อ = victim · บีบได้อีก left ครั้ง)
}
```
- หนามหิน Takt = กำแพงในชั้นหนาม (`state.board.spikes[]` มี `wall: true, look: "lawRock", owner`) — วาดเป็นหินแหลมแทนกำแพงน้ำแข็งเมื่อ `look === "lawRock"`

## 2. ข้อมูลผู้เล่น — `state.players[].law` (ฮุค `lawState`)
```js
law: { inRoom, strikes, strikesMax /* 3 */, secUsed, secMax /* 2 */, roomCd /* เทิร์นที่เหลือ 0 = พร้อม */,
       gammaCd, messCd, armed /* "gamma" | "mess" | null */, shocks /* Counter Shock ที่เหลือ */, room /* { size, x0, y0, x1, y1 } | null */ }
```
- `players[].strikeZone` = `{ x0, y0, x1, y1 }` (กรอบ Room ของลอว์ที่ตีได้ · ไม่มี = ตีไม่ได้) — client ใช้คัดเป้าที่ตีได้

## 3. ท่าตีปกติ (ฉาก ATTACKING · `attack.byStyle` จากฮุค `attackStyle`)
| style | เมื่อ | ภาพ |
|---|---|---|
| `lawSlash` | ตีปกติใน Room (ห่างเท่าไรก็ได้ · **ไม่พุ่งเข้าหา**) | ฟัน Kikoku จากที่ยืน · รอยตัดเส้นบางวิ่งผ่านเป้า · ดาเมจ 0 |
| `lawGamma` | ตีที่เสริม Gamma Knife (ประชิด) | ใบมีดพลังงานเขียวแทงทะลุ · แสงข้างในตัวเป้า |
| `lawMess` | ตีที่เสริม Mess (ประชิด) | มือดันเข้าอก · หัวใจในลูกบาศก์ใสหลุดออกมา |

## 4. เหตุการณ์ — socket `lawFx` `{ kind, id /* ลอว์ */, color, at /* ช่องลอว์ */, size, ... }`
server พักฉาก (ATTACKING) ตามวินาทีในวงเล็บแล้วค่อยลงผล — ภาพต้องไม่สั้นกว่านี้ · ค่าคงที่ฝั่ง client ให้ export ใน `LAW_FX` แล้วตรงกับ `BEAT` ใน server

| kind | payload | จังหวะ server |
|---|---|---|
| `roomOpen` | `room { x0, y0, x1, y1, size, cx, cy, seq }` | state มี Room ทันที · พัก 1.0 วิ |
| `roomClose` | `room`, `objects [{ id, x, y }]`, `why` (`skill`/`region`/`sever`/`death`) | Room/วัตถุหายจาก state ทันที · พัก 0.6 (เฉพาะ `skill`) |
| `cut` | `tile`, `obj { id, x, y }` | ตัดพื้น (ปุ่ม HUD) · วัตถุอยู่ใน state ทันที · พัก 0.7 |
| `shuffle` | `a`, `b` = `{ id /* unit id หรือ "obj:<id>" */, from, to, size }` | ส่งตอนกด · พัก 0.55 แล้ววางตำแหน่งใหม่ |
| `takt` | `tile`, `hitId`, `dodge` | ส่งตอนกด · พัก 0.45 → ดาเมจ + ผลัก (`iceFx` knock) + หนามลง state · พัก 0.5 |
| `rockDown` | `tiles [{ x, y }]` | หนามหินหมดเวลา (ต้นตาเดินลอว์) |
| `throw` | `to`, `objects [{ id, x, y }]` | ส่งตอนกด (ก้อนลอยขึ้นแล้วพุ่ง) · พัก 0.8 → ดาเมจ |
| `throwHit` | `to`, `hits [{ id, dmg, dodge, kill }]`, `n` | หลังพัก 0.8 · พัก 0.4 |
| `shamble` | `a`, `b` = `{ id, at, size, hp, armor }` (ค่าก่อนสลับ) | ส่งตอนกด · พัก 1.1 → สลับค่า |
| `shambleDone` | `a`, `b` (ค่าหลังสลับ) | หลังพัก 1.1 · พัก 0.4 |
| `ultArm` | `ult` (`gamma`/`mess`) | กดท่าไม้ตาย · พัก 0.6 |
| `gamma` | `targetId`, `to`, `applied ["burn","bleed","poison"]`, `extra` | หลังตีโดน (ระหว่างฉากตี) |
| `mess` | `targetId`, `to` | หลังตีโดน — หัวใจลอยเข้าหาลอว์ |
| `squeeze` | `targetId`, `to /* ช่องเหยื่อ */`, `left` | ใช้หัวใจในกระเป๋า · พัก 0.6 → ดาเมจ |
| `squeezeHit` | `targetId`, `to`, `dmg`, `kill` | หลังพัก 0.6 |
| `heartGone` | `targetId`, `why` (`used`/`dead`/`drop`/`sever`) | หัวใจคืนเจ้าของ/สลาย |
| `shock` | `targetId /* ศพ */`, `to` | Counter Shock · พัก 0.6 → ฟื้น |
| `revived` | `targetId`, `to` | หลังพัก 0.6 · พัก 0.5 |
| `mark` | `targetId`, `to` | ตีโดน (ส่งตอนตีลง) — รอยตัดวาบบนตัว (ร่างแยกชิ้นมาจาก `board.law.marks` ด้านล่าง) |
| `unmark` | `ids [unitId…]` | จบตาเดินของลอว์ (มาร์กหมด · `board.law.marks` เอา id เหล่านั้นออกพร้อมกัน) — ชิ้นส่วนลอยกลับมาต่อกัน + รอยต่อวาบ ~0.6 วิ · ไม่ต้องพัก |

**ภาพมาร์ก (ผู้ใช้สั่ง 2026-10-26 — Amputate ในเรื่อง):** ตีปกติของลอว์โดน (`lawSlash` ที่จังหวะปะทะ · `lawGamma`/`lawMess` ตอนจบท่า) → ร่างเป้าถูกตัดเป็น 3–4 ชิ้น (เส้นเฉียง + เส้นเกือบแนวนอน) ลอยแยกห่างเล็กน้อย ขอบรอยตัดเรืองฟ้า ลอยขึ้นลงเบาๆ
**ค้างตลอดที่ id อยู่ใน `board.law.marks`** (แทนรอยตัดเส้นบางเดิม) · ชิ้นส่วนตามตำแหน่งตัวปัจจุบัน (ถูก Shambles ย้ายได้) · ตีซ้ำตัวที่ถูกตัดอยู่แล้ว = แค่รอยตัดวาบ ไม่ตัดใหม่ ·
`unmark` = ต่อกลับพร้อมรอยต่อวาบ · มาร์กหายจาก state โดยไม่มี `unmark` (ซิงก์ใหม่/ตาย) = ต่อกลับเงียบๆ · มาร์กที่ไม่มีฉากตีนำ (เข้าเกมกลางทาง) = แยกชิ้นเองหลัง 1.3 วิ ·
ระหว่างแยกชิ้น หมากตัวนั้นวาดแบบ `lawCut` (ตัวหมากโปร่ง — แถบเลือด/ชื่อ/เป้าเล็ง/คลิกเลือกยังใช้ได้) · client: `lawSliced` / `drawSlice` ใน `lawFx.js` · ฉากตีส่ง `tid` (id เป้า) มากับ fx ท่าตี

## 5. HUD (Claude หลักทำ)
- ปุ่มพิเศษ `players[].actions`: `cut` (ตัดพื้น · tiles = ช่องว่างใน Room) · `shock` (Counter Shock · tiles = ศพประชิด)
- สกิลรอง Shambles / Shamble = `area { kind: "tile", place: "list", tiles, count: 2 }` → socket `useSkill { tier, form, tiles: [a, b] }`
- หัวใจในกระเป๋า = ไอเทม `{ type: "lawHeart", targetId, targetName, uses, ready }`
