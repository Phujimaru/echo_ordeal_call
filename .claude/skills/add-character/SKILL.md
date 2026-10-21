---
name: add-character
description: เพิ่มตัวละครใหม่หรือรื้อสกิลตัวละครเดิมในเกม ECHO — ใช้เมื่อผู้ใช้ส่งสเปกตัวละคร (สกิลพื้นฐาน/รอง/ท่าไม้ตาย/สกิลติดตัว) มาให้ทำ หรือขอปรับสกิลของตัวละครที่มีอยู่ ครอบคลุมไฟล์ที่ต้องแตะครบทุกจุด ข้อมูลกระดาน (mov/range/area) จุดเสียบใน engine กับดักที่เคยพลาดมาแล้ว และแนวทางเขียนเทสต์
---

# เพิ่ม/รื้อตัวละครในเกม ECHO

โครงเกมแยก **ข้อมูล** (`characters.js`) ออกจาก **พฤติกรรม** (`characters/<id>.js`) แล้วให้
`server/` เรียกผ่าน `CHAR_HOOKS` — เพิ่มตัวละครจึงไม่ต้องรื้อ engine แต่ต้องเสียบ
ให้ครบทุกจุด ไม่งั้นสกิลจะ "เขียนแล้วไม่ทำงาน" แบบเงียบๆ

> ตัวละครที่มีตอนนี้: `muimi` · `oberon_summer` · `sliver_bullet` (เลือด/เกราะเฉพาะตัว · ราคาเปลี่ยนได้ · ล่องหน — ต้นแบบของฮุคพวกนี้) · `sora_otosumi` (สองร่าง · ตีปกติเปลี่ยนตามอาวุธ · ท่าพุ่งชนหลายจังหวะ) · `raido_hikaru` (เลือกร่างจากหลายปุ่ม · ตีปกติแนวตรงโดนหลายคน · ตัวใหญ่ชั่วคราว · ลำแสง+ผลัก · เอฟเฟกต์ท่าตีเฉพาะตัวใน `client/src/board/hikaruFx.js`) · `kate` + `emiliko` (ผู้เล่น 1 คนคุม 2 ตัว · ปุ่มหลายตัวเลือก · เดินต่อหลังจบตา · พื้นเปียก · พื้นที่ขัง/บังสายตา · ดาเมจตายตัว — GAME_SYSTEM §20) · `kira` (สองร่าง · ตีแนวตรง 4×1 + ท่าตีคลื่นฟัน `kiraSlash` · คลื่น `line` 4×3 ที่บีบคนแถวข้างเข้ากลาง (ส่ง `knock` ผ่าน `engine.ice.begin/flush` หลัง `skillBeat`) + สถานะ `rooted` เดินไม่ได้ · ฟื้นจากตายด้วย `preventDeath` · ออร่าควันวาดหน้า/หลังตัว (`aura` ใน BoardStage → `kiraAuraBack/Front`) · เพลงเฉพาะช่วงท่าไม้ตาย (`activeSkillMusic`) · เอฟเฟกต์ใน `client/src/board/kiraFx.js` + `darkWaveFx`) · `yuna` (วงออร่ารอบตัวตามระยะเดิน — ฮุค `auraAtk`/`auraAccurate`/`auraIncoming`/`skillMusic` ถามกับทุกคน · ศพค้าง `keepsCorpses` · สกิลเลือกศพ `place: "corpse"` + `engine.joinOrder` · ขี่ผู้เล่นอื่น `server/ride.js` · หายตัวแตะไม่ได้ `untouchable` · ชื่อ/ปกตามร่าง `characterPub` · เอฟเฟกต์ `client/src/board/yunaFx.js` — GAME_SYSTEM §21) · `gray` (เกรย์ — เก็บศพด้วยตีปกติ `canReapCorpse`/`reapCorpse` · ท่าไม้ตายชาร์จ 2 เทิร์นยิงต้นตาเดิน `onActorReady` · ระหว่างชาร์จ `mov` 0 / `range [1, 0]` / `blocksGuts` · สุ่มอาวุธต่อการตี · คริเฉพาะตัว `critPct` · เอฟเฟกต์ `client/src/board/grayFx.js` — GAME_SYSTEM §22) · `gyro_zeppeli` (ไจโร — เสียงพากย์ตามเหตุการณ์ `voiceLines` (`server/voice.js`) · ลูกเหล็กที่ตีปกติต้องใช้ (`range` → `[1, 0]` เมื่อหมด · `onStrikeResolved`/`onStrikeObject`) · ของบนกระดานที่เป็นของผู้เล่น (`p.gyro.balls`) · ชั้นเลือดม้ารับก่อนเกราะ `absorbDamage` · ตีสวนผลักแทนถอย `counterPush` · กระเด็นถึงขอบ/ข้ามสิ่งกีดขวาง/ดันคนออกข้าง `planFlight` · ปุ่มพิเศษบน HUD `hudActions`/`charAction` · นับเดินตรงจาก `afterWalk` ย้อนได้ `{ undo }` · `onActorEnd` · `onBoardPlaced` — GAME_SYSTEM §23 · เอฟเฟกต์ `client/src/board/gyroFx.js`) · `diego_alt` (ดิเอโก้ — หยุดเวลา: ตัดการโจมตีทั้งก้อนแล้วย้อนสถานะ `counterArmed`/`onCounterStop` · ตาเดินพิเศษ `engine.timeStop.queueExtra` + `onExtraTurn`/`extraTurnOutro` · ดาเมจลงตอนเวลาเดินต่อ `freeze`/`unfreeze` · ชั้นพื้นมีอายุ+ไฟลาม · กับดักล่องหนเห็นเฉพาะเจ้าของ `walkTrap`/`springTrap`/`onForcedMove` · โทษระยะเดิน `movPenalty` · ปุ่มหลายตัวเลือกไม่กินโควตา+ไม่ล็อกการเดิน · ม้ากลาง `characters/_horse.js` — GAME_SYSTEM §24) · `fern` (เฟิร์น — Energy เฉพาะตัว 10 `blocksSkillGain` · ตีแนวตรงใช้ Energy · นับการตีครบ 5 → ครั้งที่ 6 ฟรี + ทะลุเกราะ `strikePierces` + รีเซ็ทคูลดาวน์ใน `afterStrike` · ตีเพิ่มในตาเดิน `extraStrike` · ตีครั้งถัดไประยะไกลขึ้น (`range`) · กันการโจมตีทั้งก้อน `onAttacked`/`blocksAttack` · ท่าไม้ตายเปิด/ปิดฟรี (`skillFree` + ไม่กินโควตา + ไม่ล็อกเดิน) · ล่องหนที่คนใกล้เห็น `seenBy` · ลงมือแล้วหลุดยกเว้นไอเทม `onReveal(…, "act", how)` — GAME_SYSTEM §25 · เอฟเฟกต์ `client/src/board/fernFx.js`) · `funny_valentine` (วาเลนไทน์ — ชั้นมิติ `server/dimension.js` (หลบสายตาเดินทะลุ / กระดานคู่ขนาน) · ยูนิตที่ถูกเรียก `server/summon.js` (ร่างแยกคุมได้ต่อจากตัวจริง / ตัวที่เหมือนกันฝ่ายกลาง) · ฮุคหลังจบตาของใครก็ได้ `afterActorEnd` · ดาเมจจริงต่อการโจมตี `onDamageDealt` + `engine.cmdSeq` · target รูปเฉพาะ `cells` · เอฟเฟกต์ `client/src/board/valentineFx.js` — GAME_SYSTEM §26) · `celine` (เซลิน — ชั้นพุ่มดอกไม้มีอายุ `server/flora.js` (วางทับช่องเดิม · ปลูกตอนเดินด้วย `afterWalk` ย้อนได้) · ซ่อนในพุ่มไม่ได้ `bushExposed` · กำแพงตีแตกในชั้นหนาม `Ice.placeWall` · เดินตามดอกไม้ไม่เสียก้าว `flowerWalk` · คริ ×3 `critMult` · หลบเฉพาะตัว `ownEvade` · คลิปก่อนฉากตี `preAttackClip` · เลือก 2 เป้า `count` · กำแพงหมุนได้ `tile rect` + `orient` · ปุ่มหลายตัวเลือก 2 ช่อง (คฑา/อาวุธ) · เดินต่อหลังตี `cantoMov` — GAME_SYSTEM §27 · เอฟเฟกต์ `client/src/board/celineFx.js`) · `ice_spike` (ตีปกติไม่ได้ · สกิลเลือกช่อง `tile` · วางของบนกระดาน (น้ำแข็ง/หนาม) · ไถล/ผลัก/ชน · สถานะเชื่องช้า · ท่าออกผลต้นตาเดินถัดไป · ระบบกลาง `server/ice.js` GAME_SYSTEM §19) — ใช้เป็นต้นแบบ
> **เกมเป็นกระดานเดินได้แบบ Fire Emblem แล้ว** — กติกาที่ผู้ใช้ตัดสินอยู่ใน [GRID_PLAN.md](../../../GRID_PLAN.md) (§4–§8, §10)
> ระบบเดิมที่ยังใช้อยู่ดู [GAME_SYSTEM.md](../../../GAME_SYSTEM.md) · ถ้าสองไฟล์นั้นขัดกับไฟล์นี้ ให้เชื่อสองไฟล์นั้น
> เรื่องที่สเปก/แผนไม่ได้ระบุ ให้ทำแบบ Fire Emblem และถามผู้ใช้ก่อนตัดสินเรื่องใหญ่

## ลำดับที่ควรทำ

1. **ถามให้จบก่อนเขียนโค้ด** — สเปกตัวละครมักกำกวมตรงตัวเลข ขอบเขต และ **ระยะบนกระดาน** ถามรวดเดียวแล้วค่อยลงมือ
   ดีกว่าเขียนไปแก้ไป (ดูหัวข้อ "คำถามที่ต้องถามเกือบทุกครั้ง")
2. เช็คไฟล์สื่อก่อน: `ls client/public/characters/<id>/` — โฟลเดอร์นี้อยู่ใน `.gitignore`
   **ห้ามลบไฟล์ในนั้นเด็ดขาด** เพราะ git กู้คืนไม่ได้
3. เขียน `characters/<id>.js`
4. ลงทะเบียนใน `characters/index.js`
5. เพิ่มคัตซีนใน `characters/_transforms.js` (ถ้ามี)
6. เพิ่มข้อมูลตัวละครใน `characters.js` — **รวม `mov` / `range` / `area` ของทุกสกิล** (หัวข้อถัดไป)
7. เสียบ hook ใน `server/` (ตารางด้านล่างบอกไฟล์)
8. ฝั่ง client: `client/src/screens/Game.jsx` (ป้ายสถานะ/ข้อมูลเฉพาะตัว) — ปุ่มสกิลกับการเลือกเป้าบนกระดานได้เองจาก `area`
9. เขียนเทสต์ `tests/characters/<id>.test.js`
10. `npm test` (รัน 2-3 รอบเช็คความเสถียร) · `npx eslint server.js server characters characters.js client/src` · `cd client && npx vite build`

## ไฟล์ที่ต้องแตะ

| ไฟล์ | ทำอะไร |
|---|---|
| `characters/<id>.js` | พฤติกรรมทั้งหมด export เป็น object ที่มี `id` |
| `characters/index.js` | `require` + ใส่ใน `CHARACTER_MODULES` |
| `characters.js` | ชื่อ/ความยาก/รูป/`mov`/`range`/คำอธิบายสกิล/ราคา/`area` (`effect: null` ถ้าจัดการเองในโมดูล) |
| `characters/_transforms.js` | คัตซีน: `{ img, video, title, label, seconds, music, afterReveal }` |
| `server/*.js` | เสียบ hook ตามตารางด้านล่าง (ฟังก์ชันไหนอยู่ไฟล์ไหน: GAME_SYSTEM.md §1.1) |
| `client/src/screens/Game.jsx` | ป้ายสถานะ (`STATUS_INFO`) · ข้อมูลเฉพาะตัวบน HUD · เอฟเฟกต์เฉพาะตัว |
| `client/src/screens/CharacterSelect.jsx` | ใส่ id ใน `order` ของหมวดความยาก (ไม่ใส่ก็ขึ้น แต่ไปต่อท้ายสุด) |
| `tests/characters/<id>.test.js` | เทสต์ |

## ข้อมูลกระดานใน `characters.js` (GRID_PLAN §5–§7)

ระยะทุกอย่างนับ **แมนฮัตตัน** (ไม่มีแนวทแยง) · สิ่งกีดขวางบังการเดิน แต่ **ไม่บังการตี/สกิล**

**ระดับตัวละคร**
- `mov` — ระยะเดิน · ไม่ใส่ = `DEFAULT_MOV` (4, `server/constants.js`) · ตอนนี้ทุกตัว 4
  - `action.baseMovOf(p)` = ค่า `mov` ดิบ ("ระยะเดินปกติสูงสุด") · `action.movOf(p)` = หักไพ่แตก −1 แล้ว (ใช้เดินจริง)
- `range: [rmin, rmax]` — ระยะตีปกติ · ไม่ใส่ = `DEFAULT_RANGE` `[1, 1]` · ตอนนี้ทุกตัวประชิด `[1, 1]` ยกเว้นนักบินปริศนา `[1, 4]` (ยิงลำแสง — ฮุค `attackBeam`)
  - ตัวระยะไกล เช่น `[2, 2]` = ตีได้เฉพาะห่าง 2 ช่อง (แบบธนู) → ตัวประชิดที่โดนยิงจากห่าง 2 **สวนไม่ได้** และตัวนี้ก็สวนคนที่ตีประชิดไม่ได้
  - ตัวละครใหม่ที่ไม่ใช่ `[1, 1]` ถามผู้ใช้ก่อนเสมอ (แผนระบุว่าตอนนี้ทุกตัวประชิด)

**ระดับสกิล — ทุกสกิล (basic/secondary/ultimate) ต้องมี `area`** (ไม่ใส่ = `self`)

| kind | ฟิลด์ | ความหมาย | ป้ายบนปุ่ม |
|---|---|---|---|
| `self` | – | ใช้กับตัวเอง | (ไม่มีป้าย) |
| `target` | `range`, `self?` | เลือก 1 คนในระยะ ≤ `range` · `self: true` = เลือกตัวเองได้ · ไม่มีใครในระยะ = กดไม่ได้ | "ระยะ N" |
| `aoe` | `range`, `self?` | ทุกคนในรัศมี `range` รอบตัว (ข้าวหลามตัด ไม่รวมช่องตัวเอง) · `self: true` = รวมตัวเอง | "รอบตัว N" |
| `line` | `len`, `width` | เลือกทิศ 1 ใน 4 → สี่เหลี่ยมยาว `len` เริ่มจากช่องติดตัว กว้าง `width` (ใช้เลขคี่ กลางตรงแนวตัวเรา) · ไม่รวมตัวเอง | "ทิศทาง L×W" |
| `field` | – | ทุกคนไม่สนตำแหน่ง | "ทั้งสนาม" |
| `tile` | `range`, `square?`, `place` | เลือก **ช่อง** บนกระดานในระยะ (รวมช่องที่ยืน) · `square: 5` = กรอบ 5×5 รอบช่องนั้น · `place` (`ice`/`spike`/`any`) บอก client ว่าช่องไหนกดได้ · hook ได้ `opts.tile` (+ `opts.dir` ถ้า client ให้เลือกทิศ) · `targets` = คนบนช่อง/ในกรอบ | "ระยะ N" |

- `range` เป็นตัวเลข หรือ `"mov"` = เท่าระยะเดินปกติสูงสุดของผู้ใช้ (`action.areaRange` → `baseMovOf`) — `buildStateFor` แปลงเป็นตัวเลขก่อนส่งให้ client
- **กฎผู้ใช้: บัฟ/ฟื้นฟู/มอบผลให้คนอื่น ต้องมีระยะเสมอ** → ใช้ `target` หรือ `aoe` เท่านั้น ห้าม `field`
- **`field` ตอนนี้ไม่มีสกิลไหนใช้** (เก็บไว้สำหรับอนาคต) — สเปกที่เขียน "ศัตรูทุกคน" ให้ถามผู้ใช้ว่าจะเป็น `aoe` รัศมีเท่าไร
- **ไม่มีความสามารถที่ทำให้ไพ่แตก** (กฎผู้ใช้) — สเปกเก่าที่มี "ทำให้ไพ่แตก" ต้องถามว่าจะแทนด้วยอะไร (ต้นแบบ: ท่าไม้ตายมุยมิเปลี่ยนเป็นคลื่นดาบ `line` 4×3 — §7.3)
- `effect` ใน `characters.js` (`combat.applyEffect`) **ลงกับผู้ใช้เองเท่านั้น** — สกิลที่โดนคนอื่นต้อง `effect: null` แล้วเขียนใน hook
- **`area.hostile: true` = สกิลโจมตี** — โดนคนที่มองไม่เห็นในพื้นที่ด้วย (คนในพุ่มหญ้า/ล่องหน) และคนล่องหนที่โดนปรากฏตัว · ไม่ใส่ = คนที่ผู้ใช้มองไม่เห็นหลุดจากพื้นที่ (ใช้กับบัฟ) · `target` เล็งคนที่มองไม่เห็นไม่ได้เสมอ (GRID_PLAN §3.3)
- `instant: true` = เด้งป้าย `skillFlash` ให้ทุกคนเห็นทันทีตอนกด (ทุกสกิลตอนนี้ตั้งไว้ — ตั้งเหมือนกัน)

## กติกาตาเดินที่สกิลต้องเคารพ (GRID_PLAN §4, §7)

- **ใช้สกิลได้เฉพาะในตาเดินของตัวเอง** — `useSkill()` เช็ค `action.canAct(p)` ให้แล้ว (`gameState === "ACTION"` และ `match.actorId === p.id`) · ช่วงจั่วไพ่เหลือแค่จั่ว/พอ
- **ใช้สกิล/ไอเทม/ซื้อของแล้วเดินไม่ได้อีก แต่ยังโจมตีปกติได้** — `useSkill()` เรียก `action.lockMove(p)` ให้ทุกสกิล (รวมสกิลที่ไม่กินโควตา)
  ถ้าเพิ่มทางกดใหม่ที่ไม่ผ่าน `useSkill()` (socket ใหม่/ไอเทม) ต้องเรียก `action.canAct` + `action.lockMove` เอง
  ต้องการให้ตีปกติไม่ได้ด้วย (และไม่ได้เดินต่อหลังจบตา) = `action.lockStrike(p)` แทน (ขนมปังของเอมิลิโกะ)
- **ของที่ใช้ได้จำกัดครั้งด้วยการตีปกติ** — ฮุค `afterStrike(engine, p)` ถูกเรียกหลังตีปกติจบทุกแบบ (คน/หนาม/ผนึก) ก่อนจบตา (เครื่องดูดฝุ่นของเอมิลิโกะ)
- **โควตา 1 สกิลต่อเทิร์นเหมือนเดิม** (`p.skillUsedRound`) · สกิลที่ไม่กินโควตาใช้ฮุค `skipsTurnQuota` / `ignoresTurnQuota`
- **โจมตีปกติ = จบตา** · สกิลไม่จบตา — สกิลที่ "ตีแล้วจบตา" ต้องถามผู้ใช้ก่อน (ผู้ใช้สั่งแล้ว = ฮุค `endsTurn`)
- **"เทิร์น" ≠ "ตาเดิน"**: เทิร์น = รอบทั้งวง (`dealRound` → `endTurn`, `engine.roundNumber`) · ตาเดิน = ตาของคนหนึ่งในเทิร์น (`nextActor` → `finishActor`)
  สถานะทุกตัวลดเทิร์นที่ `endTurn()` (ทีละเทิร์น ไม่ใช่ทีละตาเดิน)
- ข้อความเก่าที่เขียนว่า **"ก่อนเปิดไพ่" / "หลังเปิดไพ่" / "ช่วงจั่วการ์ด"** ใช้ไม่ได้แล้ว — สกิลเกิดหลังเปิดไพ่เสมอ (ในตาเดิน)
  ต้องเขียนผลใหม่ให้เข้ากับตาเดิน: ผลที่ไปยุ่งกับไพ่/แต้ม (จั่วเพิ่ม, ทิ้งมือ, ปรับแต้ม) ไม่มีความหมายแล้ว
  (ยาลดไพ่ถูกถอดจากร้านด้วยเหตุผลนี้ · ยาโชคลาภ/ยาเปลี่ยนสีการ์ดเป็นข้อยกเว้นที่ผู้ใช้สั่ง — ใช้ช่วงจั่วผ่าน `useDrawItem`) → ถามผู้ใช้ว่าจะแทนด้วยอะไร

## ด่านกลางใน `useSkill()` (`server/skills.js`) — ลำดับจริง

`canAct` → tier ถูกต้อง → `noskill` → คิดราคา (`nightTaxTier` / `Journey.skillTax` / `spellflow` / `spellburden` / `freecast`)
→ **`action.resolveArea(p, skill.area, targets, opts.dir)`** (นอกระยะ/ไม่ได้เลือกทิศ = `null` = จบ ไม่เสียแต้ม)
→ `canUseSkill(engine, p, tier, targets)` → โควตา → หักแต้ม + `lockMove` → คำสาป/เหน็บชา/ป่าพลาดเป้า
→ **`applyInstantSkill(engine, p, tier, targets)`** → `applyEffect` → `skillFlash` → คิวคัตซีน (เล่นทันที แล้วกลับมาตาเดินต่อด้วยเวลาที่เหลือ)

**`targets` ที่ hook ได้รับ = รายชื่อผู้โดนจริงหลัง `resolveArea`** (array ของ playerId) ไม่ใช่สิ่งที่ client ส่งมา:
- `self` → `[]` (หรือ targets ที่ส่งมาตรงๆ) · `target` → `[id]` 1 คน (ตรวจระยะ/ยังมีชีวิตแล้ว)
- `aoe` → ทุกคนในรัศมี (+ ตัวเองไว้หน้าสุดถ้า `self: true`) · `line` → ทุกคนในแนว (ไม่รวมตัวเอง)
- **คัดเพื่อน/ศัตรูเป็นหน้าที่ของ hook** — `resolveArea` คืนทุกคนในพื้นที่ทั้งเพื่อนและศัตรู:
  - ศัตรู: `engine.sameTeam(p, t)` = เพื่อนร่วมทีม (ข้าม) — ดูคลื่นดาบใน `characters/muimi.js`
  - ผลดี: `engine.teamModeActive()` + `engine.isAlly(p, o)` — ดู `veilRecipients()` ใน `characters/oberon_summer.js` (ffa = ทุกคนในวงได้)
- socket `useSkill` รับ `{ tier, targets, dir }` · เทสต์เรียก `engine.useSkill(id, tier, targets, { dir })`

## จุดเสียบใน server/

เสียบเท่าที่ตัวละครใช้ เรียกฟังก์ชันข้ามไฟล์ผ่านชื่อโมดูล (`combat.healHp(...)`) และสถานะแมตช์ผ่าน `match.*` — ดูกติกาใน GAME_SYSTEM.md §1.1
ฝั่ง `characters/<id>.js` เข้าถึงทุกอย่างผ่าน `engine.*` เท่านั้น (GAME_SYSTEM.md §14)

**ฮุคกลาง** — server เรียกให้ทุกตัวละครอัตโนมัติ (`CHAR_HOOKS[p.characterId]`) แค่ export ในโมดูลก็ทำงาน:

**ฮุค broadcast** — แค่ implement ในโมดูล **ไม่ต้องแก้ server/** (เลิกแปะบรรทัดเรียกเองแล้ว): engine วนเรียก **ทุกโมดูล** ตามลำดับ
`CHAR_HOOKS.MODULES` (= `CHARACTER_MODULES` ใน `characters/index.js` — ตัวใหม่ต่อท้าย) ผ่าน `combat.broadcastHook`
→ ฮุคถูกเรียกกับผู้เล่นทุกคน/ทุกตัวละคร **ต้องเช็คเองว่าเป็นตัวเองไหม** (`isX(p)`) · ทุกฮุคผ่าน `combat.runHook` = แยกความผิดพลาด
(โยน error → `console.error` ชื่อตัวละคร + ชื่อฮุค แล้วข้าม ตัวอื่นยังทำงาน · แมตช์ไม่ค้าง)

| ฮุค | จังหวะ |
|---|---|
| `resetCombat(p)` | `combat.resetCombat()` ทุกแมตช์ — ล้างฟิลด์เฉพาะตัว (+ ค่าเริ่มใน `newPlayerRecord` ของ `server/socket.js`) |
| `onRoundStartTick(engine, p)` | ลูปต่อผู้เล่นของ `dealRound()` — ลงผลกับ `p` เท่านั้น (GAME_SYSTEM §7 กล่องเตือน) · `p` ตาย = ข้ามผลต้นเทิร์นที่เหลือ |
| `onEndTurn(engine)` | `endTurn()` หลังลูปลดเทิร์นสถานะ (สตั้นที่ใส่ตรงนี้เต็มเทิร์นถัดไป) |
| `onDeath(engine, p)` | `combat.instantDeath()` — มีคนตกรอบ (`p` = คนที่ตาย · `pos` ยังไม่ถูกล้าง) |
| `auraAtk(engine, attacker)` → `{ amount, name, img }` | `computeAttackBase` — พลังโจมตีจากออร่า (ยูนะ) |
| `auraIncoming(engine, p, n)` → ส่วนต่าง | `combat.adjustIncomingDamage` — ทุกความเสียหายที่ p ได้รับ (ยูนะ: Delete +1 / Smile −1) |
| `auraAccurate(p)` | `_universal_status.accurateActive` (ลงทะเบียนใน `characters/index.js`) |
| `skillMusic(engine, p)` → `{ music, at }` | `view.activeSkillMusic` — ถามกับทุกคนที่ยังอยู่ · at มากสุดชนะ |
| `onKill(engine, killer, victim)` | **ไม่ broadcast** — เฉพาะโมดูลของผู้สังหาร (`match.effectSourceId`) ผ่าน `runHook` |
| `onBoardPlaced(engine)` | `action.placeOnBoard` — แผนที่ใหม่ (เริ่มเกม/เปลี่ยนภูมิภาค/ห่วงเวลาซีโร่) · ไจโร: ลูกบนพื้นกลับมือ |
| `afterActorEnd(engine, p)` → วินาที | `action.finishActor` — ตาเดินของ **ใครก็ได้** จบ (หลังผลของช่อง ก่อนไปตัว/คนถัดไป) · > 0 = ค้าง ATTACKING แล้วไปต่อ (ผลจบตาไม่ลงซ้ำ) · วาเลนไทน์: ตัวที่เหมือนกันวิ่งเข้าหา + ชน |
| `onDamageDealt(engine, src, victim)` | `combat.tookDamage` — src ทำให้ victim เสียหายจริง 1 หน่วย (ทุกช่องทาง) · แยกการโจมตีแต่ละครั้งด้วย `engine.cmdSeq` (วาเลนไทน์: แต้ม +1 ต่อการโจมตี) |

| ต้องการ | ฮุค | เรียกจาก |
|---|---|---|
| ด่านเงื่อนไขก่อนหักแต้ม | `canUseSkill(engine, p, tier, targets)` (targets ผ่าน `resolveArea` แล้ว) | `server/skills.js` `useSkill()` |
| ลงผลสกิล | `applyInstantSkill(engine, p, tier, targets, opts)` (คืนข้อความต่อท้าย skillFlash ได้ · `opts.dir` = ทิศของ `line`) | `server/skills.js` |
| ราคาเปลี่ยนตามสถานะ | `skillCost(p, tier, base)` (useSkill + ป้ายราคาใช้ตัวเดียวกัน) | `server/skills.js` · `server/view.js` |
| พื้นที่สกิลเปลี่ยนตามสถานะ | `skillArea(p, tier, area)` (useSkill + ปุ่ม/โหมดเลือกเป้าใช้ตัวเดียวกัน — มุยมิ: ดาบสนิมระหว่างดาบสะบั้น) | `server/skills.js` · `server/view.js` |
| ตีปกติเป็นลำแสง (ฉากตี) | `attackBeam(p)` → ความยาวช่อง (การ์ดฉากตี `byBeam`) · สี `attackBeamTone(p)` → `"blue"` | `strikeCard()` — `server/phases/attack.js` |
| เอฟเฟกต์ปะทะ/เสียงตีปกติเฉพาะตัว | `attackHitFx(p)` → `"mythSlash"` (โซระ) · `attackSound(p)` | `strikeCard()` / `attackSoundOf()` |
| ระยะตีตามสถานะ | `range(p)` → `[rmin, rmax]` (โซระ: ปืน `[1, 3]`) | `action.rangeOf` |
| อัตราคริเฉพาะตัว | `critPct(p)` → % (รวมคริสนาม ทอยครั้งเดียว · หน้าต่างคาดการณ์ด้วย) | `strike()` / `estimateCritOf()` |
| ป้ายโบนัสใต้ฉากตี | `attackFxNames(attacker, atkCtx)` | `strike()` |
| ผลหลังฉากตีปกติ (ก่อนจบตา) | `afterBoardAttack(engine, attacker, target, res)` → ฟังก์ชัน | `boardAttack()` |
| ชื่อ/รูปปุ่มสกิลตามสถานะ | `skillPub(p, tier)` → ฟิลด์ที่ทับ | `server/view.js` |
| ฉากสกิลหลายจังหวะ (พักให้กระดานเล่นเอฟเฟกต์ → คลิป → ผล) | `engine.skillBeat(sec, fn)` + `deferAfterCutscene` + `queueCutscene` (ต้นแบบ Mouse Separade ของโซระ) | `cutscene.runSkillFlow` |
| ไม่ขึ้นป้ายสกิลกลาง | `silentFlash(p, tier)` | `server/skills.js` |
| ท่าที่เปลี่ยนภูมิภาคทันที + นับเวลาใหม่ (ฉากเฉพาะตัว) | `engine.journeyRebirth(p, impact)` → ฉาก CUTSCENE `journey.scene.mode: "rebirth"` 18 วิ แล้ว impact() → ภูมิภาคใหม่ + `legStart`/`cycleShift`/ร้านรีเซ็ต + จบตา (ต้นแบบ ก่อกำเนิดใหม่ของ Echo · ฉากโลกแตกห้ามใช้กับตัวอื่น) | `server/phases/endTurn.js` |
| ตีปกติใส่ศพ (เก็บศพ) | `canReapCorpse(engine, p, dead)` + `reapCorpse(engine, p, dead)` → วินาทีของฉาก (client ส่ง `attack { targetId: "corpse:<id>" }` — ต้นแบบ เกรย์ · GAME_SYSTEM §22) | `action.attackTarget` |
| ท่าชาร์จที่ยิงตาเดินถัดๆ ไป (คลิป/เอฟเฟกต์ต้นตาเดิน) | `onActorReady(engine, p)` → `queueCutscene` / `deferAfterCutscene` / `skillBeat` แล้ว `engine.pausePlayingForCutscene()` (ต้นแบบ รองโกมิเนียตของเกรย์) | `nextActor()` หลังตั้งตา+นาฬิกา |
| ยิงปืน GUTS ไม่ได้ | `blocksGuts(engine, p)` | `shop.gutsFireTargetOf` |
| แต้มสกิลฟื้นจากทางอื่นไม่ได้ | `blocksSkillGain(p, src)` → true = `addSkill` ไม่เพิ่ม · ฟื้นของตัวเองใช้ src เฉพาะ (เฟิร์น `"fern"`) · เพดาน `maxSkill` · `skillRegen` 0 | `combat.addSkill` · เงินคืนทะเลทราย `skills.js` |
| กดฟรีจริง (ไม่คิดภาษีกลางคืน/การเดินทาง/ภาระเวท) | `skillFree(p, tier, opts)` (เฟิร์น: ซ่อนเร้นมานา เข้า/ยกเลิก) | `skills.skillCostOf` |
| ตีปกติทะลุเกราะ (เข้าเลือดตรง · โล่ยังกัน) | `strikePierces(engine, attacker, target)` → true (ทุกคนในแนวถูกถามแยก — เฟิร์น: Zoltraak ครั้งที่ 6) · ป้ายใต้ฉากตีใช้ `attackFxNames` | `attack.strike` (`dealDirect` แทน `dealMixed`) |
| ผลหลังฉากตีปกติ 1 ครั้ง (ทุกเป้า: คน/ผนึก/หนาม/ศพ · ก่อน `extraStrike`/จบตา) | `afterStrike(engine, p)` (เฟิร์น: นับ Zoltraak · ใช้เพิ่มระยะ · รีเซ็ทคูลดาวน์ · เอมิลิโกะ: เครื่องดูดฝุ่นหัก) | `action.strikeTarget` (`done`) |
| ตีปกติแล้วไม่จบตา (ตีเพิ่มที่ตุนไว้) | `extraStrike(engine, p)` → true (ฮุคหักเอง) = กลับเข้าตาเดินด้วยเวลาที่เหลือ (เฟิร์น: ร่ายต่อเนื่อง) | `action.strikeTarget` (`done`) |
| รู้ว่าถูกศัตรูโจมตี (รวมหลบพ้น) / กันการโจมตีทั้งก้อน | `onAttacked(engine, p, attacker, kind)` (`strike` ก่อนทอยหลบ · `skillDodge` · `gunAttack` · ดาเมจจากศัตรู — เรียกซ้ำได้ในการโจมตีเดียว แยกด้วย `engine.commandSeq`) + `blocksAttack(engine, p, attacker)` → `{ name, img }` = 0 ทั้งก้อน (ฉากตีขึ้น 0) — ต้นแบบ ผู้เชี่ยวชาญเวทมนต์พื้นฐานของเฟิร์น (GAME_SYSTEM §25) | `combat.notifyAttacked` / `attackBlocked` |
| ล่องหนที่ศัตรูใกล้ๆ มองเห็น | `seenBy(engine, viewer, target)` → true = ข้าม `stealthed` (พุ่ม/ม่านยังบัง) | `visibility.hiddenFromOne` |
| ซ่อนในพุ่มไม่ได้ (ศัตรูเห็นเสมอ) | `bushExposed(p)` → true (เซลิน) | `visibility.inBush` |
| เดินตามช่องดอกไม้ไม่เสียก้าว | `flowerWalk(p)` → true (ช่อง `TERRAIN_INFO[...].flower` = 0 ก้าว · client อ่าน `players[].flowerWalk`) | `action.planWalk` / `rebaseMove` → `Board.stepCost` |
| ตัวคูณคริ / หลบหลีกเฉพาะตัว | `critMult(p)` → ×N (ไม่มี = 2) · `ownEvade(p)` → % (ตีปกติ + `skillDodge` + คาดการณ์) | `attack.strike` |
| คลิปก่อนฉากตีปกติ | `preAttackClip(engine, ผู้ตี, card)` → คีย์คัตซีน (เซลิน: ติดคริ) | `attack.playAttackCard` |
| ชั้นพื้นที่ปลูก/วางทับระหว่างเกม (ซ่อนตัวได้) | `server/flora.js` (`lay/undo/clear/canBloom`) — ปลูกตอนเดินคืน `{ k, undo }` จาก `afterWalk` · กำแพงตีแตก `engine.ice.placeWall/removeWall/wallsOf` | GAME_SYSTEM §27 |
| เลือกหลายเป้า / พื้นที่สี่เหลี่ยมหมุนได้ | `area { kind: "target", count: 2 }` · `area { kind: "tile", rect: [3, 1] }` + `skillArea` อ่าน `opts.orient` (socket `orient`) | `action.resolveArea` / `tileArea` |
| ตีสวนได้ (ตัวละครนี้) | `counter: true` ใน characters.js (ตอนนี้ไม่มีตัวไหนเปิด — ตีสวนปิดทั้งเกม GRID_PLAN §6) | `attack.counterAndPush` |
| สุ่มอาวุธต่อการตี (เสียงตามอาวุธ) | สุ่มใน `attackStyle` แล้ว `attackSound` อ่านค่าที่สุ่มไว้ (`strikeCard` เรียก style ก่อน sound) | `strikeCard()` |
| ศพค้างระหว่างที่ตัวนี้อยู่ | `keepsCorpses(p)` (server/duo.js `corpseKept`) · ฟื้นศพ: `area { kind: "tile", place: "corpse" }` + `engine.joinOrder(id)` (ได้เดินเทิร์นนี้) | – |
| ขี่ผู้เล่นอื่น | `canRide / onMount / onFall / rideSound` — ระบบกลาง `server/ride.js` (GAME_SYSTEM §21) | socket `rideAsk` / `rideAnswer` |
| ไม่มีดาเมจ/ดีบัฟจากคนอื่นแตะได้ | `untouchable(engine, p)` | `combat.applyDebuff` / `adjustIncomingDamage` |
| ชื่อ/ปกตัวละครตามร่าง | `characterPub(engine, p)` → `{ name, img }` | `server/view.js` |
| ป้ายสกิลใช้ชื่อ/รูปของปุ่มตอนกด | `skillPub` คืน `flash: true` | `server/skills.js` |
| เลือด/เกราะสูงสุดเฉพาะตัว | `maxHp(p)` / `maxArmor(p, base)` (base = MAX_ARMOR) | `combat.maxHpOf`/`maxArmorOf` |
| ผลเมื่อเกราะลด (ทุกทาง) | `onArmorLost(engine, p)` (ฮิคารุ: ฟื้นพลังชีวิต 1) | `combat.loseArmor` |
| กันตาย/ฟื้นทันที (ทุกทางที่ตาย) | `preventDeath(engine, p)` → true = ไม่ตาย (ฮุคตั้ง `p.hp` เอง · ข้ามเมื่อ `force`) — ผู้เรียก `instantDeath` ทุกจุดเช็ค `!p.alive` ก่อนเก็บกวาด จึงรอดได้ทุกทาง (กิระ: อัฐิราชา) | `combat.instantDeath` |
| ตีปกติแนวตรง + ภาพท่าตีวิ่งตามแนว | `attackLane` + `range` + `attackStyle` (client ได้ `fx.lane` = ช่องทั้งแนว · ตัววาดลงตาราง `STYLE_MS`/`STYLE_HIT_P` ใน boardDraw.js — ต้นแบบ `kiraSlash` ใน kiraFx.js · ลำแสงใช้ `attackBeam`/`attackBeamTone`) | – |
| ตีปกติแนวตรงโดนทุกคนในแนว | `attackLane(p)` → true (ระยะจาก `range` · client ได้ `lane` ไปคิดไฮไลต์/แผนเดินเอง) | `action.canStrike` / `laneVictims` → `attack.boardAttack` (`card.extra`) |
| ผลเมื่อตีปกติลง (เฉพาะตัวผู้ตี) | `onStrikeLanded(engine, attacker, target, { counter })` → ชื่อป้ายฉากตี | `strike()` |
| ท่าตีบนกระดานเฉพาะตัว | `attackStyle(p, dist)` → คีย์ fx (ต้องมีตัววาดใน `boardDraw.js` / `hikaruFx.js` + `STYLE_MS`) | `strikeCard()` |
| ตัวเลือกเพิ่มจาก client (เช่นเลือกร่าง) | `canUseSkill(engine, p, tier, targets, opts)` / `applyInstantSkill(..., opts)` — socket `useSkill` ส่ง `form` ต่อให้แล้ว · ฟิลด์ใหม่ต้องเพิ่มใน `server/socket.js` | `server/skills.js` |
| ล่องหน | `stealthed(p)` + `onReveal(engine, p, kind, how)` (`act`/`hit`/`bump` · `act` ได้ `how` = `strike`/`gun`/`slide`/`item`) + `logCut(p, round)` | `server/visibility.js` |
| สกิลไม่นับโควตา / ไม่กินโควตา | `ignoresTurnQuota(p, tier)` / `skipsTurnQuota(p, tier)` | `server/skills.js` |
| ใช้สกิลแล้วจบตาเดินทันที (หลังผล/คลิปจบ) | `endsTurn(engine, p, tier, opts)` → true (มุยมิ: ท่าไม้ตาย) | `server/skills.js` · `cutscene.pausePlayingForCutscene(after, { endTurn })` |
| เสียงพากย์ตามเหตุการณ์ (ต้นตาเดิน/ตี/โดนตี/สกิล · สุ่มจากหลายไฟล์) | `voiceLines(p)` → `{ turn, strike, struck, basic, secondary, ultimate: [คีย์] }` · client ตัดประโยคเก่าของคนเดียวกัน (ต้นแบบ ไจโร — GAME_SYSTEM §23) | `server/voice.js` (`nextActor` / `strike` / `useSkill`) |
| ทรัพยากรที่ตีปกติต้องใช้ (หมด = ตีไม่ได้) | `range(p)` → `[1, 0]` เมื่อหมด · ใช้ใน `onStrikeResolved(engine, attacker, target, res, { counter })` (ตีคน + ตีสวน · เป้ายังอยู่ช่องเดิม) + `onStrikeObject(engine, p, at)` (ตีผนึก/หนาม) | `attack.boardAttack` / `counterAndPush` · `action.attackTarget` |
| ตีสวนแล้วผลักผู้ตีแทนการถอยปกติ | `counterPush(engine, counterer, attacker, res)` → `{ push }` (ชน = ไม่ขยับ ไม่เสียเพิ่ม · ไม่ถอยซ้อน) · หลังผลักเสร็จ (ขยับหรือไม่) `afterCounterPush(engine, counterer, attacker, res)` | `attack.counterAndPush` |
| พักฉากหลังผลของ `afterBoardAttack` | ฟังก์ชันที่ฮุคคืน → คืนวินาที = ค้าง ATTACKING ก่อนจบตา · หรือ `{ hold, land }` = ค้าง hold วินาทีแล้วเรียก `land()` ก่อนจบตา (ไจโร: กระเด็นถึงขอบแล้วค่อยเสียดาเมจ) | `attack.boardAttack` |
| ดาเมจตีปกติไม่ลงตอนปะทะ (ไปลงทีหลัง) | `fixedStrikeDamage(engine, a, t, ctx)` คืน 0 เมื่อไม่ใช่ `ctx.estimate` (หน้าคาดการณ์ยังเห็นดาเมจจริง) + `deferStrikeDamage(p)` → การ์ด `byDeferDmg` ไม่ขึ้นเลข | `attack.strike` / `strikeCard` |
| ชั้นเลือดรับดาเมจก่อนเกราะ (ม้า/โล่ชีวิต) | `absorbDamage(engine, p)` → true = รับ 1 หน่วย (หลังโล่ ก่อนเกราะ · ทะลุเกราะข้าม) | `combat.dealMixed` / `dealArmorOnly` / `damageSoft` |
| ปุ่มพิเศษบน HUD ที่ไม่ใช่ช่องสกิล (ขึ้น/ลงม้า) | `hudActions(engine, p)` → `[{ key, icon, name, on, cd, disabled }]` (เจ้าตัวเห็น → `HudCommand extra`) + `charAction(engine, p, key)` (เช็ค `engine.canAct` + บรอดแคสต์เอง) | socket `charAction { key }` · `view.buildStateFor` `players[].actions` |
| ตั้งรับ: ศัตรูทำให้เสียหาย = ยกเลิกการกระทำนั้นทั้งก้อน (ย้อนสถานะ · แต้มคืน) + ผู้โจมตีจบตา | `counterArmed(engine, p)` → true · `onCounterStop(engine, p, attacker)` (ต้นแบบ เดอะเวิลด์ของดิเอโก้ — GAME_SYSTEM §24) | `server/timeStop.js` (`combat.adjustIncomingDamage`) |
| ตาเดินพิเศษ (แทรกก่อนเลื่อนลำดับ) | `engine.timeStop.queueExtra(id, kind)` · `onExtraTurn(engine, p, kind)` · `extraTurnOutro(engine, p, kind)` → วินาทีพักฉากก่อนจบ · broadcast `onOrderBegin(engine)` = จองต้นเทิร์น | `action.nextActor` / `finishActor` / `beginOrder` |
| หยุดเวลา: คนอื่นไม่ตาย + ผู้ชมเห็นค่าเดิม จนเวลาเดินต่อ | `engine.timeStop.freeze(id)` / `unfreeze()` → `[{ id, dmg, kill }]` · `deferStrikeDamage` ระหว่างนั้น | `combat.instantDeath` · `view.buildStateFor` |
| ของบนพื้นที่มีผลกับคนอื่น (โทษเดิน / กับดัก / ถูกผลักเข้า / ข้อมูลกระดาน) | broadcast `movPenalty(engine, p, from)` · `walkTrap(engine, p, tile)` + `springTrap(engine, p, tile, info)` · `onForcedMove(engine, u)` · `boardPublic(engine)` | `action.movOf` / `moveTo` · `Ice.pushUnit`/`forcedSlides` · `view.boardPublic` |
| เอฟเฟกต์ที่เห็นเฉพาะบางคน (กับดักล่องหน) | `engine.boardFxTo([ids], event, payload)` | – |
| ผลตอนตาเดินของตัวเองจบ | `onActorEnd(engine, p)` (หลังเดินต่อ ก่อนผลของช่อง — ไจโร: เสริมที่ไม่ได้ใช้หมด) | `action.finishActor` |
| ผลจาก `afterWalk` ที่ไม่ใช่น้ำแข็ง แต่ต้องย้อนได้ (นับเดินตรง) | คืนบันทึก `{ undo: fn }` — `Ice.undoLay` เรียก fn ตอนย้อนเดิน/เดินใหม่ | `action.moveTo` |
| วัตถุบนกระดานที่เป็นของผู้เล่น (ไม่ขวาง · หลายคนช่องเดียวกันได้) | เก็บที่ตัวผู้เล่น (`p.gyro.balls`) ไม่ใช่ตารางกลางรายช่อง · ล้างใน `onDeath` (เช็ค `p` เป็นตัวเอง) / `onBoardPlaced` · ส่งผ่าน state ของผู้เล่น | – |
| เส้นทแยงแตะทุกช่อง / กระเด็นถึงขอบ+ข้ามสิ่งกีดขวาง+ดันคนออกข้าง | `touchLine` / `dir8` / `planFlight` ใน `characters/gyro_zeppeli.js` (วางแผนบนสำเนา → ใช้คิดดาเมจล่วงหน้าได้) | – |
| เสียงตอนใช้สกิล | `skillSound(p, tier)` | `server/skills.js` |
| ล็อก/คูลดาวน์รายช่องให้ client | `skillLocks(engine, p)` | `server/view.js` |
| เปลี่ยนรูปบนกระดาน | `displayImg(p)` | `server/view.js` |
| โบนัส/หักพลังโจมตี | `damageBonus(engine, attacker, target, ctx)` · แทนฐานทั้งหมด `attackBaseOverride` · สกิลพื้นที่ `hostile` ทุบหนามน้ำแข็ง/ผนึกด้วยท่อนี้ **หลัง** ผลของสกิล (`useSkill` ต่อคิวไว้) — โบนัสเฉพาะสกิลต้องยังอยู่ตอนนั้น (ต้นแบบ `p.muimiWave` ของมุยมิ) | `computeAttackBase()` — `server/phases/attack.js` |
| หลบ/ลดดาเมจ | `adjustIncomingDamage(engine, p, n, isNormalAttack, kind)` | `server/combat.js` |
| ผล QTE | `onQteDone(engine, p, ok, qte)` | `server/qte.js` |
| ใช้สกิลแล้วยังเดินได้ (ใช้ก่อนเดิน) | `keepsMove(engine, p, tier)` → true = ไม่ `lockMove` (Ice Spike: เฉพาะตอนยังไม่เดิน) | `server/skills.js` |
| ผลต้นตาเดินของตัวเอง | `onActorStart(engine, p)` (ถึงคิวแล้ว ก่อนเช็คสตั้น — ท่าที่ "ออกผลตาเดินถัดไป") | `nextActor()` — `server/phases/action.js` |
| ผลหลังเดิน (ทุกช่องที่เดิน/ไถลผ่าน) | `afterWalk(engine, p, tiles, ctx)` → บันทึกไว้ย้อนตอนกดย้อนการเดิน · **ถูกเรียกใหม่ทุกครั้งที่เดิน/ก้าว ด้วยเส้นทางเต็มจากจุดเริ่มตา** หลัง server ถอดผลเดิมด้วยบันทึกนั้นแล้ว — ผลที่ไม่คืนบันทึกจะซ้อนทุกก้าว | `moveTo()` |
| ผลเมื่อเสียพลังชีวิต/เกราะ (ทุกทาง) | `onDamageTaken(engine, p, n)` | `combat.loseHp` / `loseArmor` |
| ไถลบนน้ำแข็ง (ระบบกลาง `server/ice.js`) | `onSlide(engine, p, n, ctx)` · `slideStrike(engine, p, target, n, ctx)` (ไถลชนศัตรู — ลงดาเมจเอง · เดินชน = จบตา) · `ownSpike(engine, p, ctx)` | `Ice.resolveEntry` |
| วาง/ผลัก/ทำเชื่องช้าบนกระดาน | `engine.ice.layIce / placeSpike / raiseSpike / pushUnit(u, dir, ctx, n = 1) / applySlow(t, turns = 3) / begin+flush (iceFx)` — ดู GAME_SYSTEM §19 · ตัวใหญ่ 2×2 ขึ้นไปเดินเหยียบหนามน้ำแข็งได้ (`trampleSpikes` — ตัวใหญ่ใหม่ได้กติกานี้เอง) | `server/ice.js` |
| ตีปกติไม่ได้ | `range: [1, 0]` ใน `characters.js` (ไม่มีช่องที่ตีถึง — ปืน GUTS ยังยิงได้) | – |
| ผู้เล่น 1 คนคุม 2 ตัว | `duo: "<id ตัวที่สอง>"` ใน characters.js (ตัวที่สอง `hidden: true`) — ระบบกลาง `server/duo.js` (GAME_SYSTEM §20 · ต้นแบบ เคท & เอมิลิโกะ) | `lobby.startMatch` |
| สลับตัว/ตัวอีกตัวของฝ่าย | `engine.duo.switchTo / canSwitchTo / unitDone / otherUnit / moved` | `server/duo.js` |
| เดินต่อหลังตี/รอ (canto) | `cantoMov(engine, p)` → ระยะ · `cantoSkill(p, tier)` = สกิลที่กดได้ระหว่างนั้น | `action.finishActor` |
| ปุ่มหลายตัวเลือก (**ทุกตัวเลือกต้องมี `desc`** — ชี้เมาส์ค้างขึ้นคำอธิบาย · กฎผู้ใช้ 2026-10-19) | `skillPub` คืน `choices` · client ส่ง `form` · `skillCost/skillArea/keepsMove/skipsTurnQuota/ignoresTurnQuota/silentFlash/skillSound` ได้ `opts` | `server/skills.js` |
| ดาเมจตายตัวของตีปกติ (ไม่รับบัฟ) | `fixedStrikeDamage(engine, attacker, target)` → ตัวเลข | `attack.strike` |
| ไถลชนแบบมีเงื่อนไข | `slideStrikes(engine, p)` · `slideStrike` คืน `{ attack: false, knock: false }` | `Ice.impact` |
| พื้นเปียก / พื้นที่ขัง+บังสายตา | `engine.ice.layWet / dryWet` · `engine.soot.cast / strikeInside / inStormOf / trapOf` | `server/ice.js` · `server/soot.js` |
| สกิลพื้นที่ที่โดนจริงน้อยกว่าพื้นที่ที่ประกาศ (พุ่งแล้วชนหยุด) | `ownsAreaHit(p, tier, opts)` → true แล้วเรียก `skills.hitArea(p, tiles, ids)` เองกับช่องที่โดนจริง ในจังหวะที่ผลลง (ต้นแบบ ท่าไม้ตายโซระ) | `server/skills.js` |
| ผลัก/ดึงคน (ตั้ง `pos` เอง) | หลังเอฟเฟกต์ผลัก เรียก `Ice.forcedSlides(moves, source)` (ลงน้ำแข็ง = ไถลต่อ) · ก่อนส่งพิกัดให้ client เรียก `Ice.revealPushed(u)` (ถูกดัน = เผยตัว) — GAME_SYSTEM §19 | `server/ice.js` |
| ชั้นมิติ (มิติแยก/เดินทะลุ — คนต่างชั้นมองเห็นแต่ทำอะไรกันไม่ได้) | `engine.dim.enter(p, dim, { ghost })` / `leave(p)` (ช่องว่างใกล้สุดบนกระดานหลัก) / `same` / `ghost` / `membersOf` · `engine.boardUnits(ref)` แยกชั้น · state `players[].dim` — GAME_SYSTEM §26 | `server/dimension.js` |
| ยูนิตที่ถูกเรียก (ร่างแยกคุมได้ / ตัวกลางที่ไม่มีตาเดิน) | `engine.summon.spawn(owner, { kind, controlled, hp, armor, mov, range, dim, characterId, name, img, look, targetId, until, data })` · `remove` · `ofOwner` · ตายแล้วฮุค `onSummonDeath(engine, owner, u)` ของโมดูลเจ้าของ · โมดูลที่ใช้ `characterId` ตัวเองกับยูนิตต้องแยก `p.summon` ในทุกฮุค | `server/summon.js` |
| target รูปเฉพาะ (กรอบ/ทรงที่ไม่ใช่ระยะ) | `area: { kind: "target", range, cells: [[dx, dy], …] }` (นับจากช่องผู้ใช้ · range = ป้าย) | `action.resolveArea` |
| เล็ง/ตีข้ามม่านแดง | ใช้ `Visibility.hiddenFromUnit(ตัวที่ลงมือ, เป้า)` ไม่ใช่ `hiddenFrom` (ฝ่ายคู่เห็นแผนที่รวมกัน แต่เล็งได้ตามตาตัวเอง) | `server/visibility.js` |

**จุดที่ server เรียกตัวละครตรงๆ** — ถ้าตัวใหม่ต้องการ ให้แปะบรรทัดเรียกของตัวเองข้างๆ ตัวที่มีอยู่ (grep ชื่อในคอลัมน์ขวา):

| ต้องการ | จุดเสียบ (ตัวอย่างที่มีอยู่) |
|---|---|
| ล้างฟิลด์ / ผลต้นเทิร์น / ผลจบเทิร์น | ไม่ต้องเสียบแล้ว — ใช้ฮุค broadcast ด้านบน (`resetCombat` / `onRoundStartTick` / `onEndTurn`) |
| สถานะหมดอายุแล้วมีผลตามมา | ในลูปลดเทิร์นของ `endTurn()` — `server/phases/endTurn.js` (`muimi.onUltExpire`) |
| ผลเมื่อตีปกติลง (รวมตีสวน) | `strike()` — `server/phases/attack.js` (`muimi.onAttackLanded`) |
| ป้ายผลในฉากตี | `strike()` — `server/phases/attack.js` (`oberon_summer.atkFx`) |
| พลังโจมตีจากบัฟที่แจกคนอื่น | `computeAttackBase()` (`oberon_summer.atkBonus`) — ไม่ผูก id ผู้ตี ใครติดสถานะก็ได้ |
| ผลตอนจบตาเดินของคนหนึ่ง | `finishActor()` — `server/phases/action.js` (ตอนนี้มีแค่จุดฟื้นฟู — ยังไม่มีฮุคตัวละคร) · ต้นตาเดินใช้ฮุค `onActorStart` (ไม่ต้องเสียบ) |
| ผลตามลำดับเดิน (คนแรก/คนท้าย) | `beginOrder()` — `server/phases/action.js` (เหรียญคนแรก `GOLD_FIRST_BONUS`) |
| ข้อมูลส่งให้ client | `buildStateFor()` — `server/view.js` (ฟิลด์ `muimiEmergencyUses` ฯลฯ) |
| เพลงสนามระหว่างสถานะ | `activeSkillMusic()` — `server/view.js` (`muimi.towerActive`) |
| ข้ามตาผู้เล่นอื่น | ใช้สถานะ Universal `stun` / `sleep` — `nextActor()` ข้ามตาให้เอง (ไม่ต้องเสียบ) |
| ห้ามเดินแต่ทำอย่างอื่นได้ | ด่านใน `moveTo()` — `server/phases/action.js` |
| แก้เวลาเฟสจั่วไพ่ / ตาเดิน | `cardPhaseSeconds()` — `server/timers.js` · `ACTION_TIME` (`server/constants.js`) |

## จังหวะเวลาบนกระดาน — helper ที่มีอยู่

- `engine.hasActed(id)` — คนนี้เดินไปแล้วในเทิร์นนี้ไหม (คนที่กำลังเดินอยู่ = `false`) · ใช้ตัดสิน "ได้ผลเทิร์นนี้หรือเทิร์นหน้า"
  ต้นแบบ: ท่าไม้ตายโอเบรอน (GRID_PLAN §7.4) ตั้ง `t.obsDreamUseRound` = `round` หรือ `round + 1` ตาม `hasActed` แล้วล้างบัฟ + ติดสตั้นใน `onEndTurn`
- `engine.turnOrder` / `engine.actorId` / `engine.action` — ลำดับเดินของเทิร์น คนที่กำลังเดิน และสถานะตา (`{ from, moved, locked, path }`)
- `finishActor()` — จบตา: ผลของช่องที่ยืน (จุดฟื้นฟู +1 · ช่องพิเศษภูมิภาคอื่นในอนาคต) แล้ว `nextActor()` · ผล "จบตาเดินของตัวเอง" เสียบที่นี่
- **สกิลติดตัว "ชนะ/แพ้การจั่ว" ไม่มีแล้ว** → ความหมายใหม่คือ **เดินลำดับแรก / เดินท้ายสุด** (GRID_PLAN §10)
  ตอนนี้ server ยิง `combat.firePassive(p, ...)` แค่ `"roundStart"` (ใน `dealRound`) — `win`/`lose` ไม่มีใครยิง
  ตัวละครที่ต้องใช้ให้เสียบใน `beginOrder()` อ่าน `match.turnOrder[0]` / ตัวท้ายแถว

## การโจมตีปกติ ตีสวน และดาเมจจากสกิล

- ตีปกติ: `action.attackTarget()` (เป้าต้องอยู่ใน `rangeOf(p)` จากช่องที่ยืน) → `attack.boardAttack()` → `strike()` →
  `counterAndPush()`: เป้ารอด + ผู้ตีอยู่ในระยะของเป้า (`Board.canCounter`) = **ตีสวน 1 ครั้ง** (`strike(..., { counter: true })`) แล้วผู้ตี **ถอย 1 ช่อง** (ชนของ/ขอบ/คน = ไม่ขยับ เสียเพิ่ม 1)
  → ฉาก `ATTACKING` → `finishActor` (จบตา)
- **ตีสวนนับเป็นการโจมตีปกติ** → ฮุคใน `strike()` (`onAttackLanded`, `damageBonus`, หลบ/คริ) ติดตอนสวนด้วย · ผู้โดนตี/สวนถูกตั้ง `wasAttacked = true` ทั้งคู่
  ถ้าสเปกบอก "เมื่อโจมตี" ต้องถามว่านับตอนตีสวนไหม
- **สกิลที่ฟันด้วยพลังโจมตีให้ใช้ `engine.skillStrike(p, t, "ชื่อท่า")`** (`attack.skillStrike`) — ไม่มีตีสวน/ถอย ไม่จบตา
  คิดหลบหลีก (แม่นยำเจาะได้) · คุ้มครอง · ขัดแย้ง · เปราะบาง · เกราะ/โล่รับก่อน · ไม่ใช้เสริมพลัง ไม่ติดผลตีปกติ · ตายแล้วล้าง `pos` ให้
- ใส่ลุกไหม้/เลือดไหล ผ่าน `engine.applyBurn` / `engine.applyBleed` เท่านั้น (เคารพต้านสถานะ + เพดาน)
- `engine.doAttack()` = ตีแบบไม่มีกระดาน (ไม่มีสวน/ถอย/ฉาก) ไว้ให้เทสต์ท่อดาเมจ — ห้ามใช้ในสกิลแทนการตีบนกระดาน

## ฝั่ง client

- ปุ่มสกิลอ่าน `area` จาก `state.players[].character.<tier>.area` (range `"mov"` เป็นตัวเลขแล้ว) — **สกิลที่มี `area` ถูกต้องได้ป้ายระยะและโหมดเลือกเป้าบนกระดานอัตโนมัติ**
  (`client/src/board/BoardStage.jsx` prop `pick`): `target` → กดคนในระยะ (คนนอกระยะจาง) · `aoe` → กดยืนยัน · `line` → ชี้/กดเลือกทิศ — ไม่ต้องเขียน UI เลือกเป้าเอง
- `ลำดับเดิน`, ฉากตี/สวน/ถอย, หน้าต่างคาดการณ์ผล อยู่ใน `BoardStage.jsx` — ตัวละครไม่ต้องแตะ
- ป้ายสถานะเฉพาะตัวใส่ `STATUS_INFO` ใน `Game.jsx` · เฉพาะจอคอม/แท็บเล็ต (CLAUDE.md)

## เขียนคำอธิบายสกิล (`desc` ใน characters.js และ `STATUS_INFO` ใน Game.jsx)

ผู้เล่นอ่านบนการ์ดเล็กๆ — สั้นแต่ครบ:
- **ตัวเลข เงื่อนไข ระยะเวลา จำนวนเป้า จำนวนครั้ง ต้องครบ** (ตรวจกับโค้ดจริง ไม่ใช่สเปกเก่า)
- **ระยะต้องตรงกับ `area`**: "1 คนในระยะ 3" · "ทุกคนในระยะรอบตัว 2" · "1 คนในระยะเดิน (รวมตัวเอง)" · "เลือกทิศ: ... แนว 4×3"
- **ห้ามขึ้นต้นด้วย `ก่อนเปิดไพ่:` / `หลังเปิดไพ่:` / `ช่วงจั่วไพ่:`** และห้ามพูดถึงไพ่แตก — `tests/skill-area.test.js` ตรวจ `/ก่อนเปิดไพ่|ไพ่แตก/` อยู่
- แยกผลด้วย ` · ` · ข้อจำกัดใส่ในวงเล็บ: `(คูลดาวน์ 3 เทิร์น)` `(ต้านได้)` `(ไม่นับเป็นการใช้สกิล)` · "ซึ่งมีผลเทิร์นถัดไป" → `(เทิร์นหน้า)`
- แยกคำ "เทิร์น" (รอบทั้งวง) กับ "ตาเดิน" (ตาของคนหนึ่ง) ให้ถูก — เช่น "จนจบตาเดินถัดไปของเป้า"
- **ห้ามใส่เลขแพตช์/เวอร์ชัน** และเหตุผลเบื้องหลังการออกแบบ — เก็บไว้ในคอมเมนต์โค้ดแทน
- เป้าหมาย: สกิลทั่วไปไม่เกิน ~250 ตัวอักษร · สกิลติดตัวที่ซับซ้อนไม่เกิน ~500

## กับดักที่เคยพลาดมาแล้ว — อ่านก่อนเขียน

**1. ล็อกมีสองตัว อย่าสับสน** — `p.locked` = กด "พอ" แล้วในช่วงจั่วไพ่ ถ้าตั้งให้คนอื่น `checkAllLocked()` จะนับว่าครบแล้วเปิดไพ่ทันที ·
`match.action.locked` = ตาเดินนี้ย้อน/เดินไม่ได้แล้ว (ตั้งผ่าน `action.lockMove`) · จะแช่ผู้เล่นอื่นให้ใช้สถานะ `stun`/`sleep` ไม่ใช่ธงพวกนี้

**2. `resolveArea` ไม่คัดเพื่อน/ศัตรูให้** — ลืมเช็ค `engine.sameTeam` = โหมดทีมฟันเพื่อน · ลืมเช็ค `isAlly` = บัฟศัตรูในวง
และ `target` ที่ `self: true` อาจได้ตัวเองมา — hook ต้องรองรับ

**3. ดาเมจจากสกิลที่ไม่ผ่าน `skillStrike` ต้องจัดการคนตายเอง** — `engine.dealMixed`/`dealDirect` ไม่ตัดสินตาย ไม่ล้าง `pos` และไม่บวก `fragile`
ถ้าใช้ตรงๆ ต้องเช็ค `t.alive && t.hp <= 0` → `engine.instantDeath(t)` แล้ว `t.pos = null` เอง (ไม่งั้นศพยืนขวางทางจนจบเทิร์น)
และถ้าสเปกบอกว่าต้องคิด "เปราะบาง" ให้บวก `engine.statusAmtOf(target, "fragile")` เอง

**4. หยุดเวลาห้าม `clearPhaseTimer()` ทิ้งเฉยๆ** — ถ้าเจ้าของท่าหลุดเน็ต ห้องค้างถาวรโดยไม่มีอะไรมาปลด
ให้ตั้งตัวจับเวลายาวๆ เป็นตาข่ายกันเหนียวแล้วให้ฝั่ง client ไม่โชว์เป็นนาฬิกา

**5. ห้ามใส่เลขเทิร์นยาวๆ แทนความถาวร** — `applyDebuff(p, "fragile", 1, 99)` จะทำให้ป้ายสถานะ
ขึ้นเลข `99` ให้ผู้เล่นเห็น ถ้าอยากให้คงอยู่เรื่อยๆ ให้ **ต่ออายุสั้นๆ ทุกต้นเทิร์น** แทน
ส่วนสถานะที่เป็น "สแตค" จริงๆ ต้องใส่ทั้งใน `NO_TICK_STATUS` (`characters/_universal_status.js`)
และ `PERMANENT_STATUS_KEYS` (`client/src/data/permanentStatus.js`) — มีเทสต์คุมให้สองฝั่งตรงกัน

**6. สถานะลดทีละเทิร์น ไม่ใช่ทีละตาเดิน** — บัฟ "ใช้ได้ในตาเดินถัดไปของเป้า" ต้องคิดด้วย `hasActed` ว่าเป้าเดินไปแล้วหรือยัง
(ให้หลังเป้าเดินแล้ว = ต้องอยู่ถึงเทิร์นหน้า) — ดู GRID_PLAN §7.4 และ `applyInstantSkill` tier `ultimate` ของ `oberon_summer.js`

**7. สกิลที่เป็น "สวิตช์" ไม่ควรกินโควตาสกิลของเทิร์น** — ใช้ฮุค `skipsTurnQuota` (กดแล้วยังกดท่าอื่นได้)
และ `ignoresTurnQuota` (กดได้แม้ใช้โควตาไปแล้ว) แทนการแก้ `useSkill()` · แต่ยังล็อกการเดินเหมือนสกิลอื่น (กฎพื้นฐาน)

**8. ตัวละครที่มี `adjustIncomingDamage` จะหลบดาเมจแบบสุ่ม**
เลือกเป็นเป้าหมายในเทสต์เมื่อไรเทสต์จะแกว่งทันที — ใช้ `characterId: "dummy"` (ตัวละครสมมติ ไม่มีฮุค) เป็นเป้าแทน

**9. `characters.js` เป็นสตริง JS** — เครื่องหมาย `"` ในคำอธิบายสกิลต้อง escape เป็น `\"`
ไม่งั้นไฟล์พัง (หรือใช้ `“ ”` แบบที่ไฟล์ใช้อยู่)

**10. อนิเมชัน CSS ต้องขยับด้วย `transform`/`opacity` เท่านั้น** — `background-position` บนเลเยอร์
เต็มจอบังคับ repaint ทุกเฟรมบน CPU แล้วเกมกระตุก (ยิ่งถ้าซ้อนบนวีดีโอ) ใส่ `will-change: transform`
และเคารพ `prefers-reduced-motion` + ธง `lowQ`

**11. ห้ามพิมพ์ชื่อ selector แบบมีจุดนำ (เช่น `.cy-bird`) ลงในคอมเมนต์ของ `arena.css`** —
`tests/sceneQueue.test.js` อ่าน CSS ด้วย regex แล้วนับข้อความก่อนปีกกาเป็น selector จะจับผิดทันที

**12. `buildStateFor(viewerId)` เป็น per-viewer** — ถ้าต้องซ่อนข้อมูลจากคนอื่น ทำได้ที่นี่
แต่ `lastLog` กับ `io.emit("skillFlash")` เป็นก้อนเดียวส่งทุกคน ซ่อนรายคนไม่ได้

**13a. การมองเห็น (`server/visibility.js`)** — ทางกดใหม่ที่เล็งคนอื่น (socket/ไอเทม) ต้องเช็ค `Visibility.hiddenFrom(p, target)` และเรียก `Visibility.onHostileAct(p)` ตอนโจมตี
ไม่งั้นตีคนในพุ่ม/คนล่องหนได้ หรือคนในพุ่มตีแล้วไม่โผล่ · แก้ `server/board.js` แล้วต้องรัน `node scripts/gen-board-rules.js` (เทสต์ `board-rules-sync`)

**13b. ของที่ขยับตัวคนนอกการเดินปกติ (ผลัก/ไถล) ต้องส่งเหตุการณ์ให้ client** — `engine.ice.pushUnit`/`resolveEntry` ใส่ `knock`/`slide` ให้เอง ·
ถ้าเขียนการขยับเองแล้วส่ง `iceFx` ชุดที่มีคนนั้นอยู่ แต่ไม่มีเหตุการณ์ขยับ client จะค้างตัวไว้ที่เดิมจนจบชุดแล้วกระโดด

**14. `Object.assign(module.exports, {...})` บนสุดของไฟล์ใช้ได้กับ function declaration เท่านั้น** — `const` ที่ใส่ไว้ตรงนั้นพังทั้งเซิร์ฟเวอร์
(`Cannot access ... before initialization`) ให้ export ค่าคงที่หลังบรรทัดที่ประกาศ (ดู `server/ice.js`)

**15. ยูนิตที่ถูกเรียกเป็นระเบียนใน `match.players`** — ลูปที่ไล่ผู้เล่นทุกคนเพื่อ "นับคน/ส่ง socket/แจกของ" ต้องข้าม `p.summon` (ดู GAME_SYSTEM §26) · ร่างแยกที่ใช้ `characterId` ของตัวละครเองจะโดนฮุคของตัวละครทุกตัว — เช็ค `!p.summon` ก่อนอ่านสถานะเฉพาะตัว

**13. ไม่ต้องทำหน้าจอมือถือ** (CLAUDE.md) — โมดัล/ฉากใหม่เสียบเฉพาะจอคอม/แท็บเล็ต

## เขียนเทสต์ยังไง

ลอกโครงจาก `tests/skill-area.test.js` (ระยะ/ตาเดิน — ต้นแบบที่ดีที่สุด) หรือ `tests/characters/muimi.test.js` / `oberon_summer.test.js`:

- `const { engine, resolveRound } = require('../../server.js')` แล้วยัด `engine.players` เอง → `engine.startMatch()` → `engine.clearPhaseTimer()`
- **ตั้งตำแหน่ง**: `p.pos = { x, y }` ตรงๆ (ใช้พิกัดที่เทสต์เดิมใช้ หรือเช็ค `engine.boardMap().terrain` ว่าไม่ใช่สิ่งกีดขวาง) · หรือ `engine.placeOnBoard(1)` ให้สุ่มจุดเกิด
- **เข้าตาเดิน**: `engine.setActor(id)` = ให้คนนั้นอยู่ในตาของตัวเองทันที (ข้ามจั่ว/ลำดับ ไม่ตั้งตัวจับเวลา) — ไม่ตั้ง = `useSkill` เงียบ ไม่มีอะไรเกิด
- ใช้สกิล: `engine.useSkill(id, tier, [targetId])` · สกิล `line`: `engine.useSkill(id, tier, [], { dir: 'up' })`
- เดิน/ตี: `engine.moveTo(id, x, y)` · `engine.attackTarget(id, targetId)` (เข้าฉาก `ATTACKING` → `engine.clearPhaseTimer()` แล้วเรียก `engine.finishActor()` เองถ้าจะไปต่อ)
- เทสต์จังหวะหลายตา: ตั้ง `p.cards` ให้ลำดับแน่นอน → `resolveRound()` → `engine.clearPhaseTimer()` → `engine.finishActor()` ไล่ทีละตา (เช็ค `engine.actorId`) → `engine.endTurn()`
- ตัวประกอบใช้ `characterId: 'dummy'` — ไม่มีใน `CHAR_BY_ID` จึงได้ `mov` 4 ประชิด `[1, 1]` ไม่มีฮุค
- stub `engine.triggerCutscene` / `queueCutscene` / `skillFlash` (และ `notifyTransform` ถ้าใช้) ใน `test.before`
- คืนค่าเดิมใน `test.after` และ `engine.clearPhaseTimer()` ใน `test.afterEach` (ไม่งั้น process ค้าง)
- ล็อก `Math.random` เมื่อทดสอบอะไรที่มีการโรล แล้วคืนค่าใน `afterEach`
- `engine.setRoundNumber` / `setCycleShift` / `setGameState` / `setGameMode` คุมสถานะเกม
- เทสต์ที่ขยับช่วงกลางวัน/กลางคืน (`setCycleShift`) ต้อง `engine.setCycleShift(0)` คืนทุกเทสต์ ไม่งั้นเทสต์ถัดไปอ่าน
  กลางวัน/กลางคืนผิดแบบสุ่ม
- **เทสต์ระยะทุกสกิลที่มี `range`**: ในระยะพอดีกดได้ · เกิน 1 ช่องกดไม่ได้และ **ไม่เสียแต้ม** · นอกตาตัวเองกดไม่ได้ · ใช้แล้ว `engine.action.locked` เป็น `true`
- **รัน `npm test` 2-3 รอบเสมอ** — เทสต์ที่แกว่งจะโผล่รอบที่สองหรือสาม

## คำถามที่ต้องถามเกือบทุกครั้ง

- **ระยะบนกระดาน**: สกิลนี้ `self` / `target` / `aoe` / `line` ? ระยะกี่ช่อง (หรือเท่าระยะเดิน)? เลือก/รวมตัวเองได้ไหม?
  โดนเฉพาะศัตรู เฉพาะพวก หรือทุกคนในพื้นที่? (บัฟ/ฟื้นฟูต้องมีระยะเสมอ)
- `mov` / `range` ของตัวละครเป็นค่าตั้งต้น (4 · `[1, 1]`) หรือไม่?
- สเปกที่เขียนจังหวะแบบเก่า ("ก่อนเปิดไพ่", "ชนะ/แพ้การจั่ว", "ทำให้ไพ่แตก", "ผู้ชนะได้ตี") — จะแปลเป็นอะไรบนกระดาน?
- ผลเกิด "ตาเดินนี้" หรือ "เทิร์นหน้า"? ถ้าให้คนอื่น — เขาเดินไปแล้วหรือยังมีผลต่างกันไหม?
- ตัวเลขเป็น "เพดาน" หรือ "ผลบวก"? (เช่น "ดาเมจสูงสุด 3" มักเป็นผลบวกของโบนัสหลายตัว)
- ดาเมจ **ทะลุเกราะ** หรือ **ลดเกราะก่อน**? หลบได้ไหม? **ฆ่าได้ไหม** หรือค้างที่เลือด 1? นับเป็นการโจมตีปกติ (โดนสวน/ถอย/จบตา) ไหม?
- "ต้านสถานะผิดปกติ" กันสถานะนี้ได้ไหม?
- สถานะอยู่กี่เทิร์น และ **ถูกล้างสถานะแล้วหายทั้งก้อนหรือลดทีละ 1**?
- ท่า toggle — กดยกเลิกเสียแต้มอีกไหม ติดคูลดาวน์ไหม?
- คูลดาวน์: กดเทิร์น N คูลดาวน์ 5 หมายถึงกดได้อีกทีเทิร์นไหน? (เก็บเป็น "เลขรอบ" ไม่ใช่ตัวนับ
  จะได้เดินต่อเองแม้ตัวละครทำอะไรไม่ได้ — ดู `obsUltReady` ใน `oberon_summer.js` / `ultCooldownLeft` ใน `muimi.js`)
- ไฟล์สื่อมีครบไหม ชื่ออะไรบ้าง
