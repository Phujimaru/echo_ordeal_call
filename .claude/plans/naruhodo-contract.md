# สัญญาข้อมูล นารุโฮโดะ ริวอิจิ (`naruhodo_ryuichi`) — 2026-11-20

สเปกผู้ใช้: GRID_PLAN §7.38 (อ่านก่อน) · ต้นแบบฉากศาลฝั่ง client มีแล้ว: `client/src/court/` (หน้าทดสอบ `?court=1` เล่นกับ AI ฝั่ง client ล้วน)
ไฟล์นี้ = ข้อตกลงระหว่าง agent 3 คน (server / court UI / board+HUD+เสียง) — ชื่อฟิลด์/อีเวนต์ต้องตรงตามนี้ · ถ้าต้องเปลี่ยน แก้ไฟล์นี้แล้วบอกในรายงาน

## สื่อ (มีครบแล้ว — `C:\Echo\client\public\characters\naruhodo_ryuichi\` · worktree เห็นผ่าน junction `client/public/characters`)
- `naruhodo.webp` ปก/หมาก (ครึ่งตัว พื้นโปร่ง) · `skill1.webp` แฟ้มเอกสาร (สืบสวน) · `skill2.webp` ชี้นิ้วที่โต๊ะทนาย (เอานี่ไปดู!) · `skill3.webp` ตะโกนชี้หน้าจอ (เริ่มการไต่สวน)
- `court/` = ฉากศาลทั้งหมด (atlas `naruhodo.webp`/`judge.webp` + json · `bg_*` · `desk_*`/`stand_witness` · `gavel_0..5` · `shout_objection|takethat|holdit` (อังกฤษ) · `shout_holdit_jp.webp` (待った! — ใช้กับปุ่ม รอเดี๋ยว!!!) · `lines_top|bottom` · `ui_title|bottom|top|cross|talk` · `evidence.webp` atlas ไอคอนหลักฐาน 93 ช่อง (10 คอลัมน์ × 64px))
- `sprite/normal.webp` `sprite/talk.webp` `sprite/nod.gif` = นารุโฮโดะตัวเล็กแบบ DS (ใช้บนกระดาน/HUD ตอน "รอเดี๋ยว!!!" แทรก)
- `music/` (−12 LUFS — ผู้ใช้ขอให้ดังขึ้น 2026-11-20): `trial.mp3` เปิดศาล+ให้การ · `think.mp3` ซักค้าน · `objection.mp3` หลังคัดค้านสำเร็จครั้งแรก · `cornered.mp3` จำเลยความน่าเชื่อถือ ≤ 2 · `pursuit.mp3` (Pressing Pursuit ~ Cornered — ผู้ใช้เพิ่ม 2026-11-20) จำเลยเหลือ 1 = ช่วงปิดคดี (ทับ cornered) · `trouble.mp3` ทนาย ≤ 2 · `victory.mp3` คำตัดสินฝั่งทนายชนะ (มีความผิด)
- **วีดีโอปิดคดี `court/finale.mp4`** (5 วิ · ผู้ใช้ 2026-11-20 "ผมขอคัดค้าน"): เล่นตอนการยื่นหลักฐานครั้งสุดท้ายที่ทำให้จำเลยหมดความน่าเชื่อถือ (ก่อนคำตัดสินมีความผิด) · beat step `{ k: "clip", src: "/characters/naruhodo_ryuichi/court/finale.mp4", ms: 5300 }` · ระหว่างคลิป: เพลงศาลหยุด/เบาลง ห้ามเสียงเอฟเฟกต์/บลิป/ตะโกนซ้อนหรือตัดหน้า (กฎผู้ใช้) — แทนที่ shout objection + ฉากเส้นความเร็วของครั้งนั้น · เล่นครั้งเดียวต่อคดี
- ไม่มีเสียงเอฟเฟกต์/เสียงพากย์จริง → agent เสียงสังเคราะห์ (ห้ามดาวน์โหลดเอง)

## ข้อมูลตัวละคร (`characters.js`)
`id: "naruhodo_ryuichi"` · `name: "นารุโฮโดะ ริวอิจิ"` · `gender: "m"` · `difficulty: "special"` · `unique: true` · `img: "/characters/naruhodo_ryuichi/naruhodo.webp"` · `mov: 4` · `range: [1, 1]` · ค่าพื้นฐานกลาง (HP 10 / เกราะ 5 / atk 1) · ธาตุทุกการกระทำ = ปกติ (`null`)
- basic **เอานี่ไปดู!** 1 แต้ม · `area { kind: "line", len: 3, width: 1, hostile: true }` · ศัตรูคนแรกในแนว `skillStrike` (หลบได้) ดาเมจ 1 · ถ้ามีหลักฐานที่ผูกกับเป้า (ยังไม่ใช้) → ใช้ 1 ชิ้น (อันล่าสุด) ดาเมจ 3 แทน · img `skill2.webp`
- secondary **สืบสวน** 2 แต้ม · คูลดาวน์ 2 · `area { kind: "target", range: 4, hostile: true }` · ได้หลักฐานจากการกระทำล่าสุดของเป้าที่ยังไม่มีในแฟ้ม (ไม่มี = หลักฐาน "ข้อสังเกต" ชนิด receipt ผูกเป้า) · เห็นเป้าทะลุล่องหน/พุ่ม (`trueSight` เฉพาะเป้านั้น) + เห็นคูลดาวน์ของเป้า จนจบเทิร์นหน้า · img `skill1.webp`
- ultimate **เริ่มการไต่สวน** 6 แต้ม · คูลดาวน์ 5 (นับหลังคดีจบ) · `area { kind: "target", range: 5, hostile: true }` · ทอยหลบ (`skillDodge`) — หลบพ้น = ไม่ขึ้นศาล คูลดาวน์นับเลย · โดน = ศาล (ด้านล่าง) · img `skill3.webp`
- passive **รอเดี๋ยว!!!** (ปุ่ม HUD · คูลดาวน์ 3 เทิร์น · ไม่ใช้แต้ม) — ด้านล่าง
- `severables`: สถานะสืบสวน (trueSight/เห็นคูลดาวน์) · คำคัดค้านที่ค้าง (ห้ามสกิล/ตีของเป้า) · ห้ามเดินตาหน้าของตัวเอง — **ศาลที่กำลังพิจารณาไม่ถูกตัด**
- Echo สวมร่างได้ครบ (แฟ้มหลักฐาน/คูลดาวน์อยู่ที่ `p.naruhodo` · `KEEP_ON_MIMIC` ถ้าจำเป็น · ผ่าน `echo-mimic-all` + `echo-mimic-stress`) · ห้ามเพิ่ม BLOCKED
- สกิลติดตัวปิดได้ด้วย `noPassive` (ปุ่ม รอเดี๋ยว!!! กดไม่ได้) · ไม่มีสกิลเคลื่อนที่ (การเดิน 2 ช่องของรอเดี๋ยว!!! = เดินปกติ → ติดโซ่ Soul Chain ก็เดินได้ในขอบโซ่)

## บันทึกเหตุการณ์ → หลักฐาน / ข้อแก้ตัว (server)
- มีนารุโฮโดะ (รวม Echo สวมร่าง · `statId`) อย่างน้อย 1 คนในแมตช์ → จดทุก **ตีปกติ / ใช้สกิล / ใช้ไอเทมโจมตี** ของผู้เล่นอื่น (ไม่ใช่ตัวนารุโฮโดะเอง · รวมยูนิตอัญเชิญที่มีเจ้าของ = นับเป็นเจ้าของ · มอน PVE ไม่นับ) + **เดินไกล ≥ 3 ช่องในตาเดิน** (kind `move`)
- event = `{ id, round, actorId, actorName, kind: "attack"|"basic"|"secondary"|"ultimate"|"item"|"move", skill (ชื่อท่า/ไอเทม/"ตีปกติ"/"เดิน"), targetName|null, type }`
  type: attack/basic → `weapon` · secondary/item → `receipt` · ultimate → `witness` · move → `foot`
- นารุโฮโดะที่อยู่ห่าง ≤ 4 (แมนฮัตตัน · `Board` ระยะ) และมองเห็นผู้กระทำ (`Visibility.hiddenFromOne` = false) ตอนเกิดเหตุ → ได้หลักฐาน (ถือสูงสุด 5 · เต็มแล้วตัดอันเก่าสุดที่ยังไม่ใช้)
- ไม่มีนารุโฮโดะคนไหนเห็น → ผู้กระทำได้ **ข้อแก้ตัว** +1 (สูงสุด 3 · `p.courtAlibi`) — เฉพาะแมตช์ที่มีนารุโฮโดะ
- หลักฐาน (ส่งให้เจ้าของเท่านั้น) = `{ id, round, actorId, actorName, kind, skill, targetName, type, icon (0–92 จาก EV_POOLS ด้านล่าง), name (ชื่อไอคอนไทย), desc (ประโยคไทย), used }`
  - desc ตัวอย่าง: `"ดิโอ บรันโด ใช้ Throwing knife ใส่ เซลิน ตอนเทิร์น 3"` · move: `"รอยเท้าของ ดิโอ บรันโด เดินข้ามสนามตอนเทิร์น 4"`
  - icon เลือกแบบคงที่จาก hash(id) ในกลุ่มตาม type — ตาราง `EV_POOLS`/`EV_ICON_NAMES` ย้ายไปไฟล์ CJS ใช้ร่วม: **`characters/_court_evidence.js`** (client `client/src/court/evidenceData.js` คงสำเนาเดิม — ต้องตรงกัน มีเทสต์คุม)

## ศาล (server `server/court.js` — ระบบกลาง · `engine.court.*`)
ทั้งเกมหยุด (แบบคัตซีน: ตัวจับเวลาตาเดินค้าง · ไม่มีใครเดิน · กลับมาตาเดินของนารุโฮโดะด้วยเวลาที่เหลือหลังคดีจบ) · ทุกคนในแมตช์เห็นฉากศาลพร้อมกัน

บทบาท: `lawyerId` (นารุโฮโดะ) · `defendantId` · `coIds` (เพื่อนร่วมทีมทนาย — duo/trio) · `counselIds` (เพื่อนร่วมทีมจำเลย) · `galleryIds` (ผู้เล่นที่เหลือที่ยังมีชีวิต — PVP ต่างคนต่างสู้เท่านั้น) · ผู้ตาย/ยูนิตอัญเชิญไม่มีบทบาท
- จำเลยเป็น AI / บอส / มอน / ผู้เล่นหลุด = server เลือกแทนอัตโนมัติ (กติกาเดียวกับ AI ในต้นแบบ `courtCase.js aiTestimony`)
- ความน่าเชื่อถือฝ่ายละ **6** · คำให้การสูงสุด **4** รอบ · **4** ประโยคต่อรอบ = ปลอม 2 จริง 2 พอดี (ผู้ใช้ 2026-11-20 — เดิม 5 / 3 / 3 · กองมีไม่พอ = `minLiesOf` ปรับ · state ฝั่งจำเลยส่ง `minLies` + `nStatements`) · เดี๋ยวก่อน! 1 ครั้ง/รอบ · ฝ่ายค้านคัดค้าน 1 ครั้ง/รอบ (ทั้งทีมรวมกัน)

ขั้น (`court.phase`):
1. `opening` (ค้อน 3 ครั้ง + บทเปิด ~8 วิ)
2. `testimony` — จำเลยเลือก 4 ประโยค (ปลอม 2 จริง 2) จาก `pool` (≤ 10 ประโยค สุ่มจาก `statementPool` ของบันทึก **ของจำเลยเอง** ทุกเหตุการณ์ ไม่สนว่าใครเห็น) + แปะข้อแก้ตัว 📍 ได้เฉพาะประโยคโกหก (ไม่เกินจำนวนที่มี) · 40 วิ (หมด = AI เลือกให้) · ฝ่ายค้านเสนอได้แต่จำเลยเป็นคนกด
3. `testify` — เล่นประโยคทีละอัน (client เล่นเอง ~2.5 วิ/ประโยค)
4. `cross` — ทนาย (+ผู้ช่วย ใครกดก่อนได้) เลือกประโยค แล้ว `press` / `present(evId)` / `end` · 60 วิต่อรอบซักค้าน (หมด = end) · หลังลงผลแต่ละครั้งเข้า `beat` แล้วกลับ `cross` (ประโยค done ทุกอัน = จบรอบ)
   - ฝ่ายค้านเห็นปุ่ม คัดค้าน! 3 วิ ทุกครั้งที่ทนาย present (ฝ่ายค้าน AI = 45%)
5. `gallery` (PVP) — ประชาชนกด 👏/👎 ฝ่ายใด หรือ 🍅 ปาใส่ฝ่ายใด 8 วิ (ไม่กด = ไม่มีผล) → ±ความน่าเชื่อถือ (เชียร์ +1 ฝ่ายนั้น · โห่ −1 ฝ่ายนั้น · รวมต่อรอบต่อฝ่ายไม่เกิน ±2) · 🍅 > 3 ในรอบ = "เงียบ!" ไล่คนปาล่าสุด (ไม่มีสิทธิ์ในคดีนี้อีก)
   - **ขึ้นให้การเป็นพยาน** (ผู้ใช้เน้น 2026-11-20: ทุกคนต้องมีส่วนร่วม · เกมเพลย์แน่น · สมจริง) — ประชาชนแต่ละคน 1 ครั้งต่อคดี เลือกแทนเชียร์/โห่/ปา ในขั้น gallery:
     - **ช่วยทนาย** `courtGallery { e: "witnessL", evKey }`: ยื่นเหตุการณ์ของจำเลยที่ **ตัวเองเห็น** (จดเหมือนหลักฐาน: ห่าง ≤ 4 + มองเห็น ตอนเกิดเหตุ — server จดการเห็นของทุกคน ไม่ใช่แค่นารุโฮโดะ · `court.sightings` ส่งเฉพาะเจ้าตัว) → เป็นหลักฐานของทนายทันที (ฉาก: กล้อง cocounsel + พยานพูด)
     - **ช่วยจำเลย** `courtGallery { e: "witnessD" }`: จำเลยได้ข้อแก้ตัว +1 (ฉาก: พยานยืนยันที่อยู่ของจำเลย)
     - พยานที่ฝ่ายตัวเองชนะคดี = HP +1 และ **เหรียญ +2** · ฝ่ายแพ้ = ไม่มีผล
   - เพื่อนร่วมทีมทนาย (co) ก็ยื่นหลักฐานที่ตัวเองเห็นให้ทนายได้ระหว่าง `cross` (`courtAct { type: "lend", evKey }` · 1 ครั้งต่อคนต่อคดี) · ฝ่ายค้านใช้ข้อแก้ตัวของตัวเองแทนจำเลยได้ (`courtTestimony` picks ของฝ่ายค้านรวมกองเดียวกับจำเลย)
6. `verdict` — guilty (จำเลยหมด หรือครบ 3 รอบแล้วจำเลยน้อยกว่า) / free (ทนายหมด หรือน้อยกว่า) / tie
   - guilty: จำเลย `engine.instantDeath(t, "absolute")` (ข้ามจุติ/อมตะ/ฟื้นทุกแบบ — ผู้ใช้สั่ง) · มีเหรียญ/ค่าหัวตามปกติของการฆ่า (ผู้ฆ่า = ทนาย)
   - free: ทนาย ดาเมจ **5** (ผู้ใช้เปลี่ยนจาก 3 · 2026-11-20 · เกราะก่อน · ไม่มีต้นตอ) + `stun` 2 เทิร์น · `verdict.lawyerDmg: 5` / `verdict.lawyerStun: 2` ส่งมาให้ client แสดงตัวเลข (อย่า hardcode)
   - tie: ไม่มีผล
   - PVP: ประชาชนที่เชียร์ฝ่ายชนะมากสุด (≥1) ได้ HP +1 (`healHp`)
   - ฉาก verdict ~6 วิ แล้ว `court = null` กลับเกม
- ผลของ present = `presentResult` แบบต้นแบบ (`client/src/court/courtCase.js`): truth → ทนาย −1 · ไม่ตรง → ทนาย −1 · ตรงแต่มีข้อแก้ตัว (ไม่ใช่ witness) → หลักฐานถูกเผา + ข้อแก้ตัวหมด + ทนาย −1 · witness ทะลุข้อแก้ตัว → จำเลย −2 · ตรง → จำเลย −ดาเมจชนิด (weapon 3 / foot 2 / receipt 2 / witness 4) + receipt ทนาย +1 + foot = เปิดเผย 📍 ของประโยคที่เหลือในรอบนี้ให้ฝ่ายทนาย
- press: ประโยคมีข้อแก้ตัว → ข้อแก้ตัวแตก (จำเลยเสีย 📍 1 · ประโยคยัง present ได้) + ทนายได้หลักฐานจากเหตุการณ์ที่ประโยคนั้นปฏิเสธ (ถ้ามีและยังไม่ถือ) · ไม่มี → ไม่มีผล (ประโยคนั้น press ซ้ำไม่ได้)
- ฝ่ายค้านคัดค้าน + ทนายกำลัง press (ไม่ใช่ present) = ไม่มี (ปุ่มขึ้นเฉพาะตอน present) · คัดค้านสำเร็จ = present ครั้งนั้นถูกปัด (หลักฐานไม่เสีย · ประโยคนั้น present ไม่ได้อีกรอบนี้)
- ใครหลุดเน็ต/ตายระหว่างคดี: ทนายตาย/หลุด → ยุติ ไม่มีผล · จำเลยหลุด → AI แทน
- คดีซ้อนไม่ได้ · ระหว่างคดีทุกฮุคตาเดินหยุด · Road Trip = ต่อสู้เท่านั้น (`combatOnly`) · หยุดเวลาของคนอื่นอยู่ = ใช้ท่าไม้ตายไม่ได้

### state ที่ส่ง client (`buildStateFor(viewerId)`)
```
state.court = null | {
  id, phase: "opening"|"testimony"|"testify"|"cross"|"beat"|"objectWindow"|"gallery"|"verdict",
  round, rounds: 4, deadline (ms epoch) | null,
  lawyerId, defendantId, coIds:[], counselIds:[], galleryIds:[], outIds:[] (ประชาชนถูกไล่),
  cred: { L, D },                       // ทุกคนเห็น (UI ไม่โชว์เป็นแถบ — ใช้กับท่าทาง/เพลง)
  list: [{ text, done, pressed, presentTried, alibiShown: bool }] | null,   // ประโยครอบนี้ — alibi จริงส่งเฉพาะฝั่งจำเลย: { ..., alibi } เมื่อ viewer เป็นจำเลย/ฝ่ายค้าน
  cx: index ประโยคที่ทนายกำลังดู,
  pool: [{ key, text, kind }] (เฉพาะจำเลย/ฝ่ายค้าน ตอน testimony) , alibiLeft (เฉพาะจำเลย/ฝ่ายค้าน),
  evidence: [หลักฐาน...] (เฉพาะทนาย/ผู้ช่วย),
  sightings: [{ key, desc, icon, name, type }] (เฉพาะเจ้าตัว — เหตุการณ์ของจำเลยที่ viewer เห็นเอง · ใช้ witnessL / lend),
  witnessUsed: [ids], lent: [ids],
  pressLeft, counselLeft,
  beat: { seq, steps: [ ...ขั้นฉาก ] } | null,   // ฉากที่ client ต้องเล่นตอนนี้ (seq เพิ่มทุกครั้ง)
  verdict: null | { w: "guilty"|"free"|"tie", rewards: [{ id, name, hp: 1 }] },
  music: "trial"|"think"|"objection"|"cornered"|"pursuit"|"trouble"|"victory"|null,
}
```
`beat.steps` (client เล่นตามลำดับ · server ประเมินเวลาเอง `sum(step.ms)` แล้วไปขั้นต่อ):
`{ k: "cam", cam: "defense"|"witness"|"prosecution"|"judge"|"wide"|"cocounsel"|"lines", who? }` ·
`{ k: "say", who: "L"|"D"|"C"|"J"|"T"|"G", name, text, color?: "blue"|"green"|"red", ms }` ·
`{ k: "shout", who, kind: "objection"|"holdit"|"takethat", ms: 950 }` · `{ k: "gavel", n, ms }` · `{ k: "pose", who: "L"|"J", pose|one }` ·
`{ k: "present", ev: { icon, name, desc }, ms }` · `{ k: "hurt", side: "L"|"D", n, ms }` · `{ k: "heal", side, n }` · `{ k: "banner", kind: "test"|"cross", ms }` ·
`{ k: "gallery", rx: [{ id, e: "👏"|"👎"|"🍅", side }], ms }` · `{ k: "kick", id }` · `{ k: "verdict", w, ms }` · `{ k: "clash", ms }`
ข้อความ say ทั้งหมด server เขียน (ไทย · ชื่อตัวละครจริง)

### socket (client → server · ทุกตัวห่อ `combatOnly` + เช็คบทบาท/phase)
- `courtTestimony { picks: [{ key, alibi }] }` (จำเลย หรือฝ่ายค้าน)
- `courtAct { type: "press"|"present"|"end"|"view", idx, evId }` (ทนาย/ผู้ช่วย · `view` = เลื่อนประโยค อัปเดต `cx` ให้ทุกคนเห็น)
- `courtObject {}` (ฝ่ายค้าน ระหว่าง `objectWindow`)
- `courtGallery { e: "cheer"|"boo"|"throw", side: "L"|"D" }` (ประชาชน ระหว่าง `gallery` · 1 ครั้ง/รอบ)
- `courtSkip {}` (ใครก็ได้ — กดข้ามข้อความ = ไม่มีผล server · ไว้เผื่อ ไม่ต้องทำก็ได้)

## รอเดี๋ยว!!! (ปุ่มติดตัว · แทรกตาคนอื่น)
- กดได้เมื่อ: ไม่ใช่ตาตัวเอง · gameState ACTION · ผู้ที่กำลังเดิน (`actorId`) เป็นศัตรูที่ห่าง ≤ 4 และมองเห็น · คูลดาวน์ 0 · ไม่ติด stun/sleep/noPassive · ไม่มีคดี/หยุดเวลา/Clock Up ค้าง · ไม่ใช่ Road Trip ช่วงเดินทาง
- ผล: ตาเดินของผู้กระทำหยุดชั่วคราว (`engine.timeStop.interrupt` แบบดิโอ หรือกลไกเทียบเท่า — เวลาที่เหลือของเขาคืนให้ครบ) → ฉาก "待った!" (`shout_holdit_jp.webp`) → นารุโฮโดะได้ตาแทรก 15 วิ เลือก 1 อย่าง:
  - `move` เดินไม่เกิน 2 ช่อง (เดินปกติ) · `gather` ได้หลักฐานจากการกระทำล่าสุดของผู้กระทำ (แบบสืบสวน ไม่มีผลเห็นทะลุ) · `object(evId)` ใช้หลักฐานที่ผูกกับผู้กระทำ → ผู้กระทำ **ใช้สกิล/ตีปกติไม่ได้จนจบตาเดินนี้** (เดินได้) — ผู้กระทำมีข้อแก้ตัว → ได้ปุ่ม 📍 3 วิ สวนกลับ: ใช้ข้อแก้ตัว 1 = คำคัดค้านล้ม หลักฐานถูกเผา นารุโฮโดะเกราะ −2
  - ไม่เลือกใน 15 วิ = เสียตาแทรก (คูลดาวน์ยังนับ)
- ราคา: คูลดาวน์ 3 เทิร์น · ตาเดินถัดไปของนารุโฮโดะเดินไม่ได้ (`p.naruhodo.noMoveNext`)
- ผู้กระทำกลับมาตาเดินเดิมด้วยเวลาที่เหลือ
- socket: `holdIt {}` · `holdItAct { kind: "move", tile } | { kind: "gather" } | { kind: "object", evId }` · `holdItAlibi {}` (ผู้กระทำ)
- state: `players[].naruhodo` (เฉพาะเจ้าตัวได้เต็ม · คนอื่นได้แค่ `{ holdReady }`) = `{ evidence:[...], holdCd, holdReady, noMoveNext, scout: { targetId, until, cds } | null }` · `state.holdIt = null | { lawyerId, actorId, phase: "flash"|"choose"|"alibi", deadline, result? }`
- เสียง/ฉาก: client เล่น shout + เพลงไม่เปลี่ยน · ห้ามเสียงซ้อนวีดีโอ (ไม่มีวีดีโอ)

## ผลบนกระดาน (client — board/HUD agent)
- ตีปกติ/สกิล: fx ใหม่ใน `client/src/board/naruhodoFx.js` — เอานี่ไปดู! = นิ้วชี้พุ่งตามแนว + ไอคอนหลักฐานลอยไปปะทะ (ถ้าใช้หลักฐาน) · สืบสวน = แว่นขยาย/แฟ้มเปิดเหนือเป้า + เส้นเชื่อม · เริ่มการไต่สวน = จอสั่น ค้อนตก ก่อนเข้าฉากศาล
- server ส่ง `engine.boardFx("naruhodoPoint"|"naruhodoScout"|"naruhodoTrial"|"naruhodoHoldIt", payload)` — ชื่อ event ตามนี้
- HUD: ช่องแฟ้มหลักฐาน (ไอคอน + ชี้แล้วขึ้นชื่อ+desc) · ปุ่ม รอเดี๋ยว!!! ลอยตอนตาคนอื่น (กดได้/คูลดาวน์) · แผงตาแทรก (เดิน 2 / เก็บหลักฐาน / คัดค้าน!) · ป้ายสถานะ `naruhodoObjected` (ถูกคัดค้าน: ห้ามสกิล/ตี) · `naruhodoScouted`
- เสียง: สังเคราะห์ (`.claude/plans/naruhodo-sfx.py` → `public/characters/naruhodo_ryuichi/sfx/*.wav|mp3`): `point`, `scout`, `trial_open`, `holdit`, `objection`, `takethat`, `gavel`, `blip_low|mid|high`, `damage`, `evidence_ding`, `whoosh`, `crowd_cheer`, `crowd_boo`, `splat`, `stamp`, `penalty` · ลงทะเบียนคีย์ `naru_*` ใน `client/src/audio.js`

## หมายเหตุจาก board/HUD/เสียง (2026-11-20)
- fx กระดาน `client/src/board/naruhodoFx.js` (`naruEventFx`) อ่าน payload ตามที่ server ส่งจริง: `from`/`to`/`targetId`/`icon`/`dir` + `kind` ย่อย (Trial: cast/dodge/open · HoldIt: shout/object/alibi · Scout: scout/gather) — Point ไม่ต้องส่ง tiles (คำนวณจาก `dir`)
- เสียงตอนกดสกิล = server `skillSound` (naru_point / naru_scout / naru_trial_open) · client เล่นเฉพาะ: ปะทะ (naru_damage/stamp/whoosh) · ได้หลักฐาน (evidence_ding) · ค้อน (gavel ตอน cast) · รอเดี๋ยว (holdit) · gather (scout) · ผลคัดค้าน (objection/penalty จาก HUD ตาม `holdIt.result`) — ระหว่าง `state.court` ไม่มีเสียงจากกระดาน/HUD เลย
- HUD อ่าน `holdIt.result = { kind: "move"|"gather"|"object", ok? }` (object + ok:false = ถูกข้อแก้ตัวสวน) · `holdIt.seq` · ถ้า server ส่ง `holdIt.tiles` (ช่องที่เดิน 2 ได้) HUD ใช้เลย ไม่มี = คำนวณเองด้วย Rules.reachable
- ⚠️ **คีย์เพลงชนกับเสียงเอฟเฟกต์**: `skillMusic` ส่ง `naru_${court.music}` → `naru_objection` ชนกับเสียงตะโกน naru_objection (ฉากศาลใช้ csfx("objection")) → **server ควรส่ง `naru_bgm_${court.music}`** (audio.js มีคีย์ naru_bgm_* ครบทุกเพลงแล้ว · naru_trial/think/cornered/trouble/victory/pursuit ยังลงทะเบียนไว้ด้วยเพื่อไม่พังระหว่างเปลี่ยน) · เพลงศาลทุกเพลง MUSIC_TRACK_SCALE 1.3 (ผู้ใช้ขอให้ดัง)

## หมายเหตุจาก server (2026-11-20 — สิ่งที่ลงโค้ดจริง · client อ่านตามนี้)
- `skillMusic` ส่ง **`naru_bgm_${court.music}`** แล้ว · ระหว่างคลิปปิดคดี `court.music = null` (ฮุคคืน null) แล้ว `victory` ตอนคำตัดสิน
- `state.court` เพิ่ม: `rx: [ids]` (ประชาชนที่กดแล้วในขั้น gallery) · `sightings` ส่งให้ทุกคนที่ไม่ใช่จำเลย (เฉพาะเจ้าตัว) · `list[].kind` ส่งเฉพาะฝั่งจำเลย · `verdict.rewards[].gold` (2 = พยานฝ่ายชนะ)
- `state.holdIt` เพิ่ม `seq` · `canAlibi` (true เฉพาะผู้ถูกแทรกตอน phase alibi ที่ยังมีข้อแก้ตัว) · ไม่ส่ง `tiles` (client คำนวณเอง — movLeft 2) · `result = { kind: "move"|"gather"|"object", ok?, ev? }`
- `players[].naruhodo` (เจ้าตัว) เพิ่ม `sealed` (ลบสกิลติดตัว) · `players[].courtAlibi` (เจ้าตัว · มีเมื่อ > 0)
- `courtAct` รับ `evKey` สำหรับ `lend` · `courtGallery` รับ `evKey` สำหรับ `witnessL`
- ทุกจังหวะของคดีเป็นจังหวะแบบเปิด (`engine.skillBeat` open) — server ไปต่อเองเมื่อครบ `sum(ms)` · ขั้นรอ (testimony/cross/objectWindow/gallery) จบก่อนเวลาเมื่อผู้เล่นกดครบ · `beat` = null ระหว่างขั้นรอ
- คัดค้านของฝ่ายค้าน = ทายใจ: หลักฐานที่จะจับได้จริง → ปัดตก (หลักฐานไม่เสีย) · หลักฐานผิดอยู่แล้ว → ฝ่ายจำเลย −1 (ตาม GRID_PLAN "ทายผิด = ฝ่ายจำเลย −1") · ยื่นแล้วประโยคนั้นยื่นซ้ำไม่ได้ในยกนั้น (`presentTried`) ยกเว้นยื่นชนข้อแก้ตัว
- 🍅 = −1 ฝ่ายนั้นเหมือนโห่ (รวมเพดาน ±2) · ประชาชนมีทุกโหมดที่ไม่ใช่ PVE (ffa + คนนอกสองฝ่ายใน duo/trio) · Eos/Road Trip/Moon Cell ไม่มีประชาชน
- คำตัดสินมีความผิด = `combat.instantDeath(t, "final")` (ระดับใหม่: แบบ absolute + ข้ามจุติ) · ผู้สังหาร = ทนาย
- มอน/บอส PVE ถูกจดในบันทึกด้วย (ผู้กระทำ = ตัวมันเอง · ไม่มีข้อแก้ตัว) เพื่อให้คดีใน PVE มีหลักฐานจริง
- **จำเลยระบบคู่ (เคท & เอมิลิโกะ · ผู้ใช้ 2026-11-20)**: `state.court.defendantUnits: [{ id, name, img }]` — ทุกตัวของจำเลยที่ยังมีชีวิต (ตัวที่ถูกเลือกก่อน · ตัวเดียว = array 1 ตัว) · `defendantId` = ตัวที่ถูกเลือก · ชื่อจำเลยในบทพูด = "เคท & เอมิลิโกะ" · ทั้งคู่ส่งคำให้การ/ข้อแก้ตัวได้ (เห็น pool/alibi ฝั่งจำเลย) · บันทึก/หลักฐาน/ข้อแก้ตัวของทั้งคู่ผูกกับฝ่ายเดียวกัน (`actorId` = เจ้าของ · `actorName` = ตัวที่ลงมือ) · มีความผิด = ตายทั้งคู่ (`final`) · ไม่มีความผิด/เสมอ = เหมือนเดิม
- **ขั้นฉากตาม court UI (server 2026-11-20)**: `say` ทุกอันมี `name` · ผู้พูดรหัส `C` (ฝ่ายค้าน) / `T` (ผู้ช่วยทนาย + พยานจากประชาชน) / `G` (ประชาชนเชียร์/โห่/ปา/คนถูกไล่) ใส่ `id` ผู้เล่น · `cam` ก่อนบทของคนเหล่านั้นใส่ `who: id` · ทุกขั้นมี `ms` ตาม `client/src/court/courtSteps.js stepMs` (pan 420 · gavel 640/ครั้ง · present 1500 · hurt 1100 · heal 800 · gallery 2800 · kick 700 · verdict 3800 · clash 1500 · clip 5300 · say = min(5200, 1300 + 48×ตัวอักษร))
- ยกหนึ่ง: ฉากผู้พิพากษาสั่งให้การ (`beat`) → `testify` (`beat = null` · client เล่นเอง · server รอ 1.5 + 2.5 × จำนวนประโยค วิ) → ฉากแบนเนอร์ซักค้าน + ความคิดในใจ (`beat`) → `cross`
- `verdict.rewards[]` = `{ id, name, hp: 1, gold?: 2 }`
- **คำให้การแบบมีชั้นเชิง (ผู้ใช้ 2026-11-20 "เหมือนเฉลยมาแล้ว")**: ประโยค 7 รูปแบบ — ปฏิเสธท่า (`denySkill`/ตีปกติ) · ปฏิเสธเป้า (`denyTarget`) · เทิร์นว่าง (`idleTurn`) · ไม่ได้ขยับตั้งแต่เทิร์น n (`stillSince`) · ยอมรับการกระทำ (`claimDeed` — โกหก = ป้ายผิด เป้า/เทิร์น ±1–2/ท่า ผิดหนึ่งอย่าง) · เป้าคนแรก (`firstVictim`) · อีกฝ่ายลงมือก่อน (`defended`) — **ทุกรูปแบบมีทั้งจริงและโกหก ถ้อยคำจากกองเดียวกัน** (`courtLines.js STATEMENTS[form]`) · โกหกทุกประโยคมีเหตุการณ์จริงหักล้างได้ · เรื่องจริงไม่มีหลักฐานไหนหักล้าง · กอง ≤ 9 โกหก ≥ 3 เมื่อบันทึกพอ
  · กดดัน: ข้อความยอมรับที่จริง (`claimDeed`/`firstVictim`/`defended` ที่จริง) = รับสารภาพ −1 · คำปฏิเสธที่จริงและคำโกหก (ไม่มี 📍) = ยืนยันคำเดิมจากกองเดียวกัน `pressHoldDef` ไม่มีผล (ไม่บอกใบ้) · state ที่ส่ง client ไม่เปลี่ยน (`pool[].kind` เฉพาะฝั่งจำเลย)
- **คำให้การ รอบ 2 (ผู้ใช้ 2026-11-20 "ถ้าจำเลยระบุเทิร์นที่ไม่ตรงเลย เราก็แย้งไม่ได้")**: หักล้างที่ "เรื่อง" (ท่า/เป้า) เทิร์นไหนก็ได้ — มีแค่ `idleTurn`/`stillSince` ที่ต้องตรงเทิร์น · ตัด `claimDeed` (มีเลขเทิร์น) แทนด้วย `onlyTarget` ("ท่า S โดนแค่ T") และ `onlySkill` ("ที่ใส่ T มีแค่ S") · คำโกหกทุกประโยคในกองต้องหักล้างได้ด้วยสิ่งที่ฝั่งทนายถืออยู่ตอนนั้น (แฟ้มทนาย + ผู้ช่วยที่ยังไม่ได้ยื่น + ประชาชนที่ยังไม่ได้ขึ้นเป็นพยาน) · ฝั่งทนายไม่มีอะไร = กองมีแต่เรื่องจริง (`minLies` 0) · ยื่นแล้วไม่ขัด = ผู้พิพากษาบอกเหตุผล 1 บรรทัดจากรายละเอียดที่เทียบ (กอง `why*` ใน courtLines — เรื่องของคนอื่น / เป้าไม่ตรง / ท่าไม่ตรง / เทิร์นไม่ตรง / ไม่ใช่รอยเท้า / ลำดับไม่ขัด) ใช้ทั้งกับประโยคจริงและโกหก
