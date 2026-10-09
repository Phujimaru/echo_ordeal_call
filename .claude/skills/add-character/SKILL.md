---
name: add-character
description: เพิ่มตัวละครใหม่หรือรื้อสกิลตัวละครเดิมในเกม ECHO — ใช้เมื่อผู้ใช้ส่งสเปกตัวละคร (สกิลพื้นฐาน/รอง/ท่าไม้ตาย/สกิลติดตัว) มาให้ทำ หรือขอปรับสกิลของตัวละครที่มีอยู่ ครอบคลุมไฟล์ที่ต้องแตะครบทุกจุด ข้อมูลกระดาน (mov/range/area) จุดเสียบใน engine กับดักที่เคยพลาดมาแล้ว และแนวทางเขียนเทสต์
---

# เพิ่ม/รื้อตัวละครในเกม ECHO

โครงเกมแยก **ข้อมูล** (`characters.js`) ออกจาก **พฤติกรรม** (`characters/<id>.js`) แล้วให้
`server/` เรียกผ่าน `CHAR_HOOKS` — เพิ่มตัวละครจึงไม่ต้องรื้อ engine แต่ต้องเสียบ
ให้ครบทุกจุด ไม่งั้นสกิลจะ "เขียนแล้วไม่ทำงาน" แบบเงียบๆ

> ตัวละครที่มีตอนนี้: `muimi` · `oberon_summer` · `sliver_bullet` (เลือด/เกราะเฉพาะตัว · ราคาเปลี่ยนได้ · ล่องหน — ต้นแบบของฮุคพวกนี้) — ใช้เป็นต้นแบบ
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
- **โควตา 1 สกิลต่อเทิร์นเหมือนเดิม** (`p.skillUsedRound`) · สกิลที่ไม่กินโควตาใช้ฮุค `skipsTurnQuota` / `ignoresTurnQuota`
- **โจมตีปกติ = จบตา** · สกิลไม่จบตา — สกิลที่ "ตีแล้วจบตา" ต้องถามผู้ใช้ก่อน
- **"เทิร์น" ≠ "ตาเดิน"**: เทิร์น = รอบทั้งวง (`dealRound` → `endTurn`, `engine.roundNumber`) · ตาเดิน = ตาของคนหนึ่งในเทิร์น (`nextActor` → `finishActor`)
  สถานะทุกตัวลดเทิร์นที่ `endTurn()` (ทีละเทิร์น ไม่ใช่ทีละตาเดิน)
- ข้อความเก่าที่เขียนว่า **"ก่อนเปิดไพ่" / "หลังเปิดไพ่" / "ช่วงจั่วการ์ด"** ใช้ไม่ได้แล้ว — สกิลเกิดหลังเปิดไพ่เสมอ (ในตาเดิน)
  ต้องเขียนผลใหม่ให้เข้ากับตาเดิน: ผลที่ไปยุ่งกับไพ่/แต้ม (จั่วเพิ่ม, ทิ้งมือ, ปรับแต้ม) ไม่มีความหมายแล้ว
  (ยาเปลี่ยนสีการ์ด/ยาลดไพ่ถูกถอดจากร้านด้วยเหตุผลนี้) → ถามผู้ใช้ว่าจะแทนด้วยอะไร

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
  - ผลดี: `engine.teamModeActive()` + `engine.isAlly(p, o)` — ดู `allies()` ใน `characters/oberon_summer.js` (ffa = ทุกคนในวงได้)
- socket `useSkill` รับ `{ tier, targets, dir }` · เทสต์เรียก `engine.useSkill(id, tier, targets, { dir })`

## จุดเสียบใน server/

เสียบเท่าที่ตัวละครใช้ เรียกฟังก์ชันข้ามไฟล์ผ่านชื่อโมดูล (`combat.healHp(...)`) และสถานะแมตช์ผ่าน `match.*` — ดูกติกาใน GAME_SYSTEM.md §1.1
ฝั่ง `characters/<id>.js` เข้าถึงทุกอย่างผ่าน `engine.*` เท่านั้น (GAME_SYSTEM.md §14)

**ฮุคกลาง** — server เรียกให้ทุกตัวละครอัตโนมัติ (`CHAR_HOOKS[p.characterId]`) แค่ export ในโมดูลก็ทำงาน:

| ต้องการ | ฮุค | เรียกจาก |
|---|---|---|
| ด่านเงื่อนไขก่อนหักแต้ม | `canUseSkill(engine, p, tier, targets)` (targets ผ่าน `resolveArea` แล้ว) | `server/skills.js` `useSkill()` |
| ลงผลสกิล | `applyInstantSkill(engine, p, tier, targets, opts)` (คืนข้อความต่อท้าย skillFlash ได้ · `opts.dir` = ทิศของ `line`) | `server/skills.js` |
| ราคาเปลี่ยนตามสถานะ | `skillCost(p, tier, base)` (useSkill + ป้ายราคาใช้ตัวเดียวกัน) | `server/skills.js` · `server/view.js` |
| พื้นที่สกิลเปลี่ยนตามสถานะ | `skillArea(p, tier, area)` (useSkill + ปุ่ม/โหมดเลือกเป้าใช้ตัวเดียวกัน — มุยมิ: ดาบสนิมระหว่างดาบสะบั้น) | `server/skills.js` · `server/view.js` |
| ตีปกติเป็นลำแสง (ฉากตี) | `attackBeam(p)` → ความยาวช่อง (การ์ดฉากตี `byBeam`) | `strikeCard()` — `server/phases/attack.js` |
| ไม่ขึ้นป้ายสกิลกลาง | `silentFlash(p, tier)` | `server/skills.js` |
| เลือด/เกราะสูงสุดเฉพาะตัว | `maxHp(p)` / `maxArmor(p)` | `combat.maxHpOf`/`maxArmorOf` |
| ล่องหน | `stealthed(p)` + `onReveal(engine, p, kind)` (`act`/`hit`/`bump`) + `logCut(p, round)` | `server/visibility.js` |
| สกิลไม่นับโควตา / ไม่กินโควตา | `ignoresTurnQuota(p, tier)` / `skipsTurnQuota(p, tier)` | `server/skills.js` |
| เสียงตอนใช้สกิล | `skillSound(p, tier)` | `server/skills.js` |
| ล็อก/คูลดาวน์รายช่องให้ client | `skillLocks(engine, p)` | `server/view.js` |
| เปลี่ยนรูปบนกระดาน | `displayImg(p)` | `server/view.js` |
| โบนัส/หักพลังโจมตี | `damageBonus(engine, attacker, target, ctx)` · แทนฐานทั้งหมด `attackBaseOverride` | `computeAttackBase()` — `server/phases/attack.js` |
| หลบ/ลดดาเมจ | `adjustIncomingDamage(engine, p, n, isNormalAttack, kind)` | `server/combat.js` |
| ผล QTE | `onQteDone(engine, p, ok, qte)` | `server/qte.js` |

**จุดที่ server เรียกตัวละครตรงๆ** — ถ้าตัวใหม่ต้องการ ให้แปะบรรทัดเรียกของตัวเองข้างๆ ตัวที่มีอยู่ (grep ชื่อในคอลัมน์ขวา):

| ต้องการ | จุดเสียบ (ตัวอย่างที่มีอยู่) |
|---|---|
| ล้างฟิลด์ทุกแมตช์ | `resetCombat(p)` — `server/combat.js` (`CHAR_HOOKS.muimi.resetCombat`) + ค่าเริ่มใน `newPlayerRecord` (`server/socket.js`) |
| ผลต้นเทิร์น | ลูปต่อผู้เล่นใน `dealRound()` — `server/phases/draw.js` (`oberon_summer.onRoundStartTick`) |
| ผลจบเทิร์น | `endTurn()` — `server/phases/endTurn.js` (`oberon_summer.onEndTurn` หลังลูปลดเทิร์น · `muimi.onUltExpire` ในลูป) |
| ผลเมื่อตีปกติลง (รวมตีสวน) | `strike()` — `server/phases/attack.js` (`muimi.onAttackLanded`) |
| ป้ายผลในฉากตี | `strike()` — `server/phases/attack.js` (`oberon_summer.atkFx`) |
| พลังโจมตีจากบัฟที่แจกคนอื่น | `computeAttackBase()` (`oberon_summer.atkBonus`) — ไม่ผูก id ผู้ตี ใครติดสถานะก็ได้ |
| เสียงตีปกติเฉพาะตัว | `attackSoundOf()` — `server/phases/attack.js` |
| ผลตอนเริ่ม/จบตาเดินของคนหนึ่ง | `nextActor()` / `finishActor()` — `server/phases/action.js` (ตอนนี้มีแค่จุดฟื้นฟูใน `finishActor` — ยังไม่มีตัวละครเสียบ) |
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
