# เคท & เอมิลิโกะ — สัญญาข้อมูล server ↔ client

Worktree: `C:\Echo\.claude\worktrees\kate-emiliko` (branch `kate-emiliko`) · server ทำโดย session หลัก (characters/kate_emiliko.js, server/duo.js, server/ice.js, server/soot.js)
สื่อ: `client/public/characters/kate_emiliko/` — kate.webp emiliko.webp mirror.jpg revive.jpg whip.jpg sword.png wings.jpg storm.avif tools.jpg mop.jpg vase.jpg vacuum.jpg cheer.jpg kate_theme_intro.m4a kate_theme_loop.mp3
กฎโปรเจกต์: ห้ามข้อความอธิบายใน UI (ชื่อ/ตัวเลข/ไอคอนเท่านั้น) · ข้อความไทย · ไม่ทำมือถือ · อนิเมชันใช้ transform/opacity · เคารพ lowQ/prefers-reduced-motion

## state (buildStateFor — ต่อผู้ชม)
- `state.youId` = ระเบียนของผู้เล่น (= เคท) · `state.controlId` = ตัวที่ผู้เล่นคุมอยู่ตอนนี้ (เคท หรือ `<id>~duo` = เอมิลิโกะ)
  → แผงตัวเรา/ปุ่มสกิล/ระยะเดิน/คาดการณ์ ต้องใช้ตัว `controlId` · ไพ่/แต้ม/การจั่ว ใช้ระเบียน `youId` (ไพ่อยู่กับเจ้าของ) · แต้มสกิล/เหรียญ/กระเป๋าเท่ากันทั้งสองระเบียน
- `state.duo` = `{ ownerId, done: [unitId…] }` ระหว่างตาของฝ่ายคู่ · ตัวใน done = สลับกลับไม่ได้
- `state.action.canto` = true → เอมิลิโกะกำลัง "เดินต่อหลังจบตา" (ได้แค่เดิน/ย้อน/รอ — ปุ่มสกิล/ตี/ร้าน/กระเป๋าปิด ยกเว้นปุ่มพื้นฐาน กระจกเงา)
- `players[]` ทุกตัวมี `duoOf` (id เจ้าของ ถ้าเป็นตัวที่สอง) / `duoWith` (id ตัวที่สอง ถ้าเป็นเจ้าของ)
  - ตัวที่ `duoOf` ไม่ใช่ผู้เล่นแยก: **ห้ามนับในรายชื่อผู้เล่น/แผงคู่แข่ง/ลำดับเดิน/หน้าจบเกม** แต่ **วาดบนกระดาน** ตามปกติ (pos/size/color/img มีครบ)
  - `corpse: {x,y} | null` = ร่างของตัวที่ล้ม (alive=false) ขณะอีกตัวยังอยู่ — วาดเป็นร่างเงา/ตุ๊กตาล้มที่ช่องนั้น (ขวางช่อง เดินข้ามได้ หยุดไม่ได้)
  - `shadow: { weapon: "mop"|"vase"|"vacuum"|"sword", sword: null|"kate"|"emi", inStorm: bool }` (เฉพาะสองตัวนี้)
  - `character.secondary.choices = [{ key, name, img, cost, area, active? }]` = ปุ่มรองแบบหลายตัวเลือก
    - เอมิลิโกะ: mop/vase/vacuum/(sword ถ้าได้ดาบ) — area self, active = อาวุธที่ถืออยู่
    - เคท: whip (target range 3) · hold (self) · give (target range 4 — เลือกเอมิลิโกะ) · recall (self) · wings (line len 4 width 1 — เลือกทิศ)
    - กดปุ่มรอง → แสดงตัวเลือก (แบบ HikaruForms) → เลือกแล้วเข้าโหมดเลือกเป้าตาม `area` ของตัวเลือก → `socket.emit("useSkill", { tier: "secondary", form: key, targets, dir, tile })`
  - `character.basic` เปลี่ยนเป็น "ตื่นขึ้นอีกครั้ง" (cost 6, img revive.jpg) เมื่ออีกตัวล้ม · `skillLocks.basic.locked` = กดไม่ได้
- `board.wet = [{x,y}]` พื้นเปียก (special "wet" ใน terrain/special ด้วย — กติกาไถลเหมือนน้ำแข็ง)
- `board.storms = [{ x0, y0, x1, y1, owner, left }]` ม่านแดง (ระบำเขม่า · 8×8 · อยู่ 3 เทิร์น) — วาดค้างบนกระดานตลอดที่ยังอยู่
- `state.masked = true` → ผู้ชมคนนี้ติด "มองไม่ออก": หมากทุกตัวยกเว้นของตัวเอง (ทั้งคู่) ได้ `masked: true, name: "", img: null, color: "#ffffff"` · `turnOrder: []`
  → client วาดหมากพวกนั้นเป็นสีขาวล้วน ไม่มีชื่อ/ภาพ/ลำดับ
- `skillMusic: "kate_storm"` ระหว่างมีม่านแดงของเคทอยู่ (เปลี่ยน skillMusicSeq = ครั้งใหม่): เล่น intro ครั้งเดียว ต่อด้วย loop วนจนเพลงเปลี่ยน

## event (socket)
- `shadowFx` payload `{ kind, ... }`:
  - `mirror` `{ from: unitId, to: unitId, at: {x,y} }` สลับตัว (กระจกเงา)
  - `revive` `{ by, id, at }`
  - `weapon` `{ id, weapon }` เอมิลิโกะเปลี่ยนอาวุธ
  - `sword` `{ id, holder, from? }` ดาบเขม่าย้ายมือ (holder = id ตัวที่ถือ)
  - `whip` `{ by, target, mode: "pull"|"dash", from: {x,y}, to: {x,y}, hitAt?: {x,y}, dmg? }` (pull = ดึงเอมิลิโกะ from→to · dash = เคทพุ่ง from→to แล้วฟาดเป้า)
  - `wings` `{ id, from, to, dir, carry: { id, from, to } | null }` เคทกางปีกบิน (ข้ามทุกอย่าง) — **ท่าที่ผู้ใช้เน้น: ปีกเขม่าใหญ่ ขนนกเขม่าปลิว เงาบนพื้น**
  - `storm` `{ by, x0, y0, x1, y1, center }` ร่ายระบำเขม่า — **ท่าที่สำคัญที่สุด ต้องอลังการ** (server พักตาเดิน ~4 วิ ให้ฉากเล่น)
  - `stormTick` `{ hits: [{ id, dmg }] }` ดาเมจพายุต้นเทิร์น
  - `masked` `{ id }` เป้าติด "มองไม่ออก"
  - `cheer` `{ id, weapon, dir, tiles: [{x,y}], dash: { from, to } | null }` ท่าไม้ตายเอมิลิโกะ (ผลัก/ดูดตามมาเป็น iceFx)
- `iceFx` (ระบบเดิม client/src/board/iceFx.js) เพิ่ม kind: `wet { tiles }` (ช่องเปียกใหม่) · `dry { tiles }` (ไม้ถูพื้นถูแห้ง) · `hit` มี `style: "mop"` ได้ · `knock` ใช้กับผลัก/ดูด
- ฉากตีปกติ (`state.attack` card) `byStyle`: `keMop` `keVase` `keVacuum` `keSword` (เอมิลิโกะตามอาวุธ) · `keKate` (เคท — กรงเล็บเขม่า) — ต้องมีตัววาด + STYLE_MS แบบ hikaruFx.js
- เสียง: คีย์ใน client/src/audio.js ขึ้นต้น `ke_` — `ke_mirror ke_revive ke_w_mop ke_w_vase ke_w_vacuum ke_w_sword ke_sword ke_whip ke_wings ke_storm ke_storm_tick ke_masked ke_hit_mop ke_hit_vase ke_hit_vacuum ke_hit_sword ke_hit_kate ke_cheer ke_splash ke_slide`
