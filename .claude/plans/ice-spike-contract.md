# Ice Spike — ข้อตกลงข้อมูล server ↔ client (worktree C:\Echo-ice · branch ice-spike)

กติกาเต็ม: GRID_PLAN.md §7.9 · ไฟล์นี้คือรูปข้อมูลที่ server ส่ง และสิ่งที่ client ส่งกลับ

## 1. state ที่ client ได้ (view.js → state)

- `state.board.terrain["x,y"] = "icespike1" | "icespike2" | "icespike3"` — หนามน้ำแข็ง (สิ่งกีดขวาง · กติกาเดินเหมือนสิ่งกีดขวางทั่วไป)
- `state.board.special["x,y"] = "ice"` — รวมน้ำแข็งที่สร้างระหว่างเกมแล้ว (ทับช่องพิเศษเดิมของช่องนั้น)
- `state.board.spikes = [{ x, y, lv, armor, maxArmor, left, owner }]` — left = เทิร์นที่เหลือ · owner = playerId
- `state.board.ice = [{ x, y, left, owner }]` — เฉพาะน้ำแข็งที่สร้างระหว่างเกม (น้ำแข็งของภูมิภาค VI ไม่อยู่ในนี้)
- `state.board.prisons = [{ x, y, size: 5, owner }]` — คุกน้ำแข็งช่วงที่ 1 ที่รอช่วงที่ 2 (x, y = ช่องกลาง)
- `players[].statuses.slow` (> 0 = เชื่องช้า · ระยะเดิน −1 · `players[].mov` หักให้แล้ว)
- `players[].iceHurt` = ดาเมจสะสมของ Ice Spike (0–2) · ตัวอื่นไม่มีฟิลด์นี้
- Ice Spike ตีปกติไม่ได้ → `range` = `[1, 0]` (ไม่มีช่องตีถึงเลย — โค้ดเดิมไม่ต้องแก้)

กติกาเดิน/ไถล: `client/src/board/boardRules.js` (สร้างจาก server/board.js ด้วย `node scripts/gen-board-rules.js` — ห้ามแก้มือ)
- `Rules.reachable` : เดินเข้าช่องน้ำแข็ง = ไถลจนสุดแนว → โหนดปลายทาง `slide: true` (เดินต่อไม่ได้) · `pathTo` คืนทางรวมช่องที่ไถลผ่าน
- `Rules.slideLine(map, x, y, dx, dy, units, selfId, blocked)` → `{ x, y, tiles, hit }` (hit = `{ kind: "unit", id } | { kind: "obstacle", terrain } | null` + x, y)

## 2. สกิลพื้นที่ชนิดใหม่ `area.kind === "tile"` (เลือกช่องบนกระดาน)

`{ kind: "tile", range: 6, place: "ice" | "spike" | "any", square?: 5, hostile? }`
- ช่องที่เลือกได้ = ระยะแมนฮัตตันจากขอบตัวผู้ใช้ ≤ range (รวมช่องที่ยืน) และอยู่ในกระดาน
- `place: "ice"` (สกิลพื้นฐาน): ไม่ใช่สิ่งกีดขวาง/หนาม/ร้านค้า และไม่ใช่น้ำแข็งของแผนที่เดิม (น้ำแข็งที่สร้างระหว่างเกมวางซ้ำได้ = ต่อเวลา)
- `place: "spike"` (สกิลรอง): ไม่ใช่สิ่งกีดขวาง/หนาม/ร้านค้า · ช่องที่มีคน: ตัว 1×1 เท่านั้น และต้องมีช่องข้างๆ (4 ทิศ) ที่ว่างอย่างน้อย 1 → **กดช่องนั้นแล้วเข้าโหมดเลือกทิศผลัก** (ลูกศร 4 ทิศรอบตัวคนนั้น · ทิศที่ช่องปลายไม่ว่าง = กดไม่ได้)
- `place: "any"` + `square: 5` (ท่าไม้ตาย): ช่องกลางที่ไหนก็ได้ในระยะ · ชี้แล้วโชว์กรอบ 5×5 รอบช่องนั้น
- ส่ง: `socket.emit("useSkill", { tier, tile: { x, y }, dir })` (dir = "up"|"down"|"left"|"right" เฉพาะวางหนามทับคน)
- server ตรวจซ้ำ — ไม่ผ่าน = เงียบ ไม่เสียแต้ม

## 3. ตีหนาม (ทุกคนตีได้)

- เป้า `"spike:x,y"` ใช้กับ socket `attack` (`{ targetId: "spike:3,4" }`) เหมือนผนึกห่วงเวลาซีโร่ (`seal:N`)
- ฉากตี: `state.attack.spike = { x, y }` (ตำแหน่งเป้า) · `kill` = หนามแตกหมด · ไม่มี targetId ของผู้เล่น
- สกิลโจมตีพื้นที่ที่คลุมหนามลงหนามด้วย (server จัดการ)

## 4. เหตุการณ์บนกระดาน `socket.on("iceFx", { seq, events })`

server ลงผลทั้งหมดทันทีแล้วส่ง state ใหม่ **หลัง** iceFx — client ต้องค้างตำแหน่งที่แสดงของทุกคนที่อยู่ใน events ไว้จนแอนิเมชันของคนนั้นเล่นถึง
(แบบ `dashSkip`/`hold` ของโซระ) และไม่ขึ้นเลขลอย/เลื่อนอัตโนมัติซ้ำสำหรับคนเหล่านั้น — ใช้เลขจาก events แทน
เล่นตามลำดับใน array: เหตุการณ์ที่ขยับตัว = คิวแอนิเมชันต่อกัน · เหตุการณ์อื่นเกิดตอนแอนิเมชันก่อนหน้าจบ

| kind | ฟิลด์ | ภาพ/เสียงที่ควรเล่น |
|---|---|---|
| `walk` | `id, path` | เดินปกติ (เส้นทางรวมช่องเริ่ม) |
| `lay` | `tiles, by` | น้ำแข็งเกิดบนช่อง (เกล็ดน้ำแข็งแผ่) · เสียง `is_gp` สุ่ม gp_1/gp_2 (ทีละช่องได้แต่ไม่เกิน ~4 ครั้งต่อเหตุการณ์) |
| `slide` | `id, path, n` | ไถลเร็ว (path เริ่มที่ช่องน้ำแข็งช่องแรก · ยาว 1 = ไม่ขยับ) · หางลม + เศษน้ำแข็ง · เสียง slide_1/slide_2 สุ่ม |
| `knock` | `id, from, to, collide?` | กระเด็น 1 ช่อง (collide = ขยับไม่ได้ แค่เด้ง) |
| `hit` | `id, by, x, y, dmg, kill, max` | Ice Spike ไถลชนศัตรู: น้ำแข็งแตกกระจาย · จอสั่นแรงตาม dmg (1–4) · max = โบนัสเต็ม 4 → ค้างภาพสั้นๆ (hit-stop) · เลข `-dmg` · เสียง `is_hit` (max = `is_hit_max`) |
| `bump` | `id, by, x, y` | คนอื่นไถลชนคน (ไม่มีดาเมจ) · เสียง `is_bump` |
| `spike` | `x, y, by, lvFrom, lvTo, dmg, kill, own, energy` | ไถลชนหนาม: หนามแตก/หด (lvTo 0 = หาย) · ผู้ชน `-dmg` · own = ชนหนามตัวเอง: เลข `+2` สีพลังงาน + เสียง `is_spike_self` · เสียง `skill_2_broke` |
| `slow` | `id` | ติดเชื่องช้า: เกล็ดน้ำแข็งเกาะตัวชั่วครู่ · เสียง `is_slow` |
| `regen` | `id, hp, sp` | ฟื้นจากไถล: เลข `+hp` เขียว / `+sp` พลังงาน · เสียง `is_regen` |
| `spikeUp` | `x, y, lv, from` | หนามโผล่/ขึ้น Lv (from 0 = ใหม่): พุ่งขึ้นจากพื้น + วงน้ำแข็ง · เสียง `skill_2` |
| `spikeDown` | `x, y, lv, from` | หนามลด Lv / แตกจากการถูกตี (lv 0 = หาย): เศษแตก · เสียง `skill_2_broke` |
| `burst` | `id, x, y` | ติดตัว 3: วงคลื่นน้ำแข็งแผ่จากตัว 8 ช่องรอบ · เสียง `is_burst` · จอสั่น |
| `prisonMark` | `x, y, size, by` | คุกช่วงที่ 1: กรอบ 5×5 เรืองแสง · เสียง `is_prison_mark` |
| `prison` | `x, y, by, ice: [{x,y}], ring: [{x,y,lv}]` | คุกช่วงที่ 2: กล้องไปที่กลาง · น้ำแข็งแผ่ 3×3 · หนามโผล่ไล่วนรอบกรอบทีละอัน · จอสั่น · เสียง `ult` |

เสียง (มีไฟล์แล้วใน `client/public/characters/ice_spike/sfx/` — ใส่ใน `FILES` ของ `client/src/audio.js`):
`gp_1 gp_2 slide_1 slide_2 skill_2 skill_2_broke ult` (ของผู้ใช้) · `is_hit is_hit_alt is_hit_max is_bump is_prison_mark is_slow is_burst is_regen is_spike_self` (Mixkit)

## 5. รูป (มีแล้วใน `client/public/characters/ice_spike/`)

- `ice_spike.webp` (โปรไฟล์) · `skill1.webp` `skill2.webp` `skill3.webp` (ไอคอนสกิล)
- หนาม `spike{1,2,3}_t.webp` = มุมบน (view "top") · `spike{1,2,3}_b.webp` = มุมเอียง (view "tilt" — ตั้งขึ้นจากพื้น)
- น้ำแข็ง = ภาพพื้นน้ำแข็งเดิมของเกม (ช่องพิเศษ "ice") ต้องวาดได้ทุกภูมิภาค ไม่ใช่แค่ภูมิภาค VI

## 6. ข้อห้ามจาก CLAUDE.md

- ห้ามใส่ข้อความอธิบายใน UI — มีแค่ชื่อ ตัวเลข ไอคอน · ข้อความผู้เล่นเป็นภาษาไทย
- ไม่ทำมือถือ (`vp.w < 768`)
