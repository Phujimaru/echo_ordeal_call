# GAME_SYSTEM.md — คู่มือระบบเกม ECHO (เอกสารอ้างอิงภายในสำหรับ AI/ผู้พัฒนา)

> เอกสารนี้อธิบาย **การทำงานจริงของ engine** ไม่ใช่วิธีติดตั้ง/รัน (ดู [README.md](README.md))
> อ้างอิงด้วยชื่อไฟล์/ชื่อฟังก์ชัน ไม่ใช้เลขบรรทัด — ค้นด้วยชื่อฟังก์ชันได้เสมอ · ตรวจกับโค้ดล่าสุดหลังย้ายจากโปรเจกต์เดิม
> (ตัวละครที่มี: **มุยมิ** `muimi` + **โอเบรอน (ฤดูร้อน)** `oberon_summer` · โหมด: ffa / duo / trio)
>
> ⚠️ **ระบบกระดานเดินได้ (แบบ Fire Emblem) จะมาแทนวงจรรอบปัจจุบัน** (ผู้ชนะการจั่ว → `SUMMARY` → `ATTACK`) — แผนอยู่ที่
> [GRID_PLAN.md](GRID_PLAN.md) · เอกสารนี้อธิบาย **ระบบที่ใช้อยู่ตอนนี้** จนกว่าระบบกระดานจะลงโค้ดจริง

---

## 1. ภาพรวมสถาปัตยกรรม

```
server.js                        จุดเริ่ม: ตาข่าย error (เฉพาะตอนรันเป็น main) + require server/socket + export ให้เทสต์ + listen
server/                          เอนจินกลางทั้งหมด แยกตามระบบ (ตารางด้านล่าง)
characters.js                    DATA ล้วน — roster/ชื่อสกิล/desc/cost/img + POSITION_COLORS + publicRoster()
characters/index.js              มัดรวม CHAR_HOOKS = { [characterId]: module } — ตัวละครใหม่ต้อง require+push ที่นี่
characters/<id>.js               LOGIC ของตัวละครนั้น (ตอนนี้ 2 ตัว: muimi, oberon_summer) — export { id, ...methods(engine, ...) }
characters/_universal_status.js  บัฟ/ดีบัฟกลาง (ส่วนใหญ่ pure function — tick* ที่ต้องลงดาเมจรับ engine เป็นพารามิเตอร์)
characters/_transforms.js        ตาราง metadata คัตซีน (TRANSFORMS) — data ล้วน
characters/_mark42.js            เกราะ Mark 42 (ไอเทมร้านค้า) — ระบบกลาง ไม่ใช่ตัวละคร (ไม่อยู่ใน CHAR_HOOKS, require ตรง)
characters/_journey.js           การเดินทาง 7 ภูมิภาค — ระบบกลาง ไม่ใช่ตัวละคร (require ตรง)
client/src/                      React (Vite): App.jsx คุมฉาก, screens/Game.jsx (~2.6k บรรทัด) คือ UI สนามทั้งหมด
tests/                           node --test (ไม่มี dep เพิ่ม) — มี integration test ที่ spawn server จริง
```

**หลักการแบ่งความรับผิดชอบ**
- `characters.js` = ตัวเลข/ข้อความที่ผู้เล่นเห็น (ไม่มี logic)
- `characters/<id>.js` = ผลของสกิลจริง — เรียก state ผ่าน `engine.*` เท่านั้น ห้าม require server.js หรือ server/* (จะ circular)
- `server/` = ผู้ถือ state จริง + เรียก hook ตามจังหวะ (dispatcher)
- ผลที่ "ตัวละครไหนก็ควรใช้ร่วมกันได้" → ใช้สถานะ universal ไม่สร้าง key เฉพาะตัวใหม่

**engine object** (`server/engine.js`) คือ context ที่ส่งให้ hook ทุกตัว — `gameState`/`roundNumber`/`centralDeck` ฯลฯ อยู่ใน `match`
จึง expose ผ่าน getter/setter (`engine.gameState`, `engine.setGameState(v)`) ไม่ใช่ค่า primitive ตรงๆ

### 1.1 ไฟล์ใน server/ — ฟังก์ชันไหนอยู่ไหน

| ไฟล์ | เนื้อหา (ฟังก์ชันหลัก) |
|---|---|
| `app.js` | Express + HTTP + Socket.IO (`app`, `server`, `io`), redirect ไฟล์สื่อไป R2 |
| `mediaDirs.js` | รายชื่อโฟลเดอร์สื่อบน R2 (ใช้ร่วมกับ `app.js` และ `desktop/` ที่แคชไฟล์ในเครื่อง) |
| `constants.js` | ค่าคงที่ทั้งหมด (`CARD_TIME`, `MAX_HP`, ราคาร้านค้า `SHOP_*`/`GUTS_*`, `CYCLE_TURNS`, `JOURNEY_*_SECONDS`, `TRANSFORMS` ฯลฯ) |
| `match.js` | **สถานะของแมตช์** (เดิมเป็น `let` ระดับไฟล์): `players`, `gameState`, `gameMode`, `roundNumber`, `timeLeft`, `centralDeck`, `lastLog`, `cutsceneQueue`, `shopItems`, `journeyScene`, `turnSnapshot` … |
| `engine.js` | `engine` object |
| `lobby.js` | สี/ตำแหน่ง/จองที่นั่ง, โหวตโหมด (`modeOptionsFor`, `voteGameMode`), จัดทีม, `checkLobbyReady`, `startSoloTest`, `startMatch`, `backToLobby`, `relayLobbyEmote`, `remainingTeamWinInfo` |
| `timers.js` | `startPhaseTimer`/`clearPhaseTimer`, `cardPhaseSeconds` (= `CARD_TIME` เสมอ) |
| `deck.js` | กองกลาง 43 ใบ, `drawFromCentralDeck`, `drawCardFor`, `drawInitialCard`, `calculateScore`, `scoreCap`, `scoreOf`, `bustedOf`, ทริกเกอร์สีการ์ด/การ์ดพิเศษ (`onCardDrawn`, `applyLockColorTriggers`) |
| `combat.js` | `maxHpOf`/`maxArmorOf`/`maxSkillOf`, `healHp`/`healArmor`/`healOverflow`, `loseHp`/`loseArmor`, `damageSoft`, `dealDirect`/`dealMixed`/`dealArmorOnly`, `adjustIncomingDamage` (ภายใน), `instantDeath`, บัฟ/ดีบัฟ wrapper, `sameTeam`/`friendlyEffectBlocked`/`withEffectSource`, `addSkill`, `voidUltimateOnBust`, `resetCombat` |
| `skills.js` | `useSkill` — ด่านเช็ค/คิดราคา/หักแต้ม แล้วเรียก hook ของตัวละคร |
| `shop.js` | เหรียญ (`addGold`), ร้านค้ามายา (`openShop`, `refreshShopForJourney`, `buyShopItem`), ไอเทม (`useInventoryItem`), ปืน GUTS (`gutsFireTargetOf`, `applyGutsBullet`) |
| `view.js` | `displayImg`, `buildStateFor`, `broadcastState`, `broadcastPositions`, `takenUniqueChars` (`activeSkillMusic` ภายใน) |
| `cutscene.js` | `triggerCutscene`, `queueCutscene`, `notifyTransform`, `pausePlayingForCutscene`, `runCutsceneQueue` |
| `qte.js` | QTE กลาง (`startQte`, `qteKey`, `qteTimeout`, `finishQte`, `qtePending`, `sweepQte`) |
| `dayNight.js` | `isNightRound`, `morningBonusActive` |
| `overload.js` | snapshot ย้อนเทิร์น (`captureTurnSnapshot`/`restoreTurnSnapshot`/`clearTurnSnapshot`) + `triggerOverloadForce` |
| `characterRules.js` | กติกากลางที่ระบบเรียกตรง: `hasKillCapability` (เนตรมณะ), `ultNameOfStatus`, เกราะ Mark 42 (`mark42Run`, `mark42Control`) |
| `socket.js` | `io.on('connection')` + handler ทุก event (`safeOn`/`onPlayerEvent`), session/reconnect, `newPlayerRecord` |
| `phases/draw.js` | `dealRound`, `hit`, `lock`, `checkAllLocked` |
| `phases/summary.js` | `resolveRound`, `afterResolve`, `goSummary` |
| `phases/attack.js` | `afterSummary`, `attackableTargets`, `computeAttackBase`, `estimateAttackOn`, `doAttack`, `attackSoundOf` |
| `phases/endTurn.js` | `endTurn` + `gameOver()` (ตัดสินจบเกม) + `maybeJourneyAdvance()` (ฉากเปลี่ยนภูมิภาค) — สองตัวหลังใช้ภายในไฟล์ |

**กติกาเวลาแก้โค้ดใน server/**
- สถานะแมตช์อ่าน/เขียนผ่าน `match.<ชื่อ>` เสมอ (`match.gameState = "SUMMARY"`) — ห้าม destructure ออกมาเก็บ ค่าจะไม่อัปเดต
  สถานะใหม่ของแมตช์ = เพิ่ม field ใน `server/match.js`
- เรียกฟังก์ชันข้ามไฟล์ผ่านชื่อโมดูล (`combat.healHp(p, 1)`, `view.broadcastState()`) — ไฟล์ใน server/ require วนกันเอง
  จึง **ห้าม** `const { healHp } = require("./combat")` (ได้ undefined ถ้าโหลดก่อน) · ยกเว้นไฟล์ที่ไม่ require ใครกลับ:
  `constants`, `match`, `app` และ `engine` ที่ destructure ได้
- ฟังก์ชันที่ไฟล์อื่นเรียกต้องอยู่ใน `Object.assign(module.exports, {...})` **บนสุดของไฟล์** (ก่อน require)
  ใช้ได้เพราะ function declaration ถูก hoist — ห้ามเปลี่ยนเป็น `const fn = () => {}` ถ้าจะ export
- ไฟล์ใหม่ใน server/ ไม่ต้องลงทะเบียนที่ไหน แค่ require จากไฟล์ที่ใช้

---

## 2. State machine (`gameState`)

```
LOBBY → TEAM_MODE → (duo/trio: TEAM_SETUP) → CUTSCENE (ฉากเปิดแมตช์ + การเดินทางเริ่ม) → PLAYING ⇄ CUTSCENE
      → SUMMARY → ATTACK → ATTACKING → TRANSITION (หรือ CUTSCENE ฉากเปลี่ยนภูมิภาค) → (วน PLAYING) → GAMEOVER → LOBBY
```

| state | ความหมาย | timer |
|---|---|---|
| `LOBBY` | ห้องรอ กดพร้อม — ทุกคนพร้อม (1 คนก็ได้ = เล่นทดสอบคนเดียว) → `enterModeSelect()` · ปุ่ม "เล่นคนเดียว" = socket `startGame` (`startSoloTest`) | – |
| `TEAM_MODE` | โหวตโหมด ffa / duo / trio (ปุ่มเทาเมื่อจำนวนคนไม่ผ่าน `validGameMode`) · โหวตครบและมีอันดับหนึ่งเดี่ยว → `startTeamSetup` (ffa เข้า `startMatch` ทันที) · `modeBackToLobby` ถอยกลับห้องรอ | – |
| `TEAM_SETUP` | เลือกทีม A/B/C + ยืนยัน — ทีมเต็มครบและยืนยันหมด → `startMatch()` · `teamBackToMode` ถอยกลับ | – |
| `PLAYING` | เฟสจั่วไพ่ + ใช้สกิล/ไอเทม | `cardPhaseSeconds()` = `CARD_TIME` 60s |
| `CUTSCENE` | เล่นวีดีโอในคิว (พัก state เดิมไว้) **หรือ** พักเกมให้ client เล่นฉากที่ไม่มีคลิป (`cutsceneInfo = null`): ฉากเปิดแมตช์ `gameIntroHoldSeconds() + JOURNEY_START_SECONDS` · ฉากเปลี่ยนภูมิภาค `JOURNEY_ADVANCE_SECONDS` | ตาม `seconds` ของแต่ละคลิป/ฉาก |
| `SUMMARY` | เปิดแต้มทุกคน ประกาศผู้ชนะ | `SUMMARY_TIME` 5s |
| `ATTACK` | ผู้ชนะเลือกเป้า (หมดเวลา = สุ่มเป้าให้) | `ATTACK_TIME` 15s |
| `ATTACKING` | การ์ดสรุปการโจมตี (`state.attack` = `lastAttack`) แล้ว `runCutsceneQueue(endTurn)` | `ATTACKFX_TIME` 3s (+2 ถ้ามีป้ายสกิล) |
| `TRANSITION` | แบนเนอร์ "รอบที่ N" | `TRANSITION_TIME` 3s |
| `GAMEOVER` | ประกาศผู้ชนะสุดท้าย (socket `backToLobby` กลับห้องรอ) | – |

`startPhaseTimer(seconds, onExpire)` (`server/timers.js`) มีตัวเดียวทั้งเกม — ต้อง `clearPhaseTimer()` ทุกครั้งที่เปลี่ยนเฟส
· ระหว่างนับถอยหลังส่ง event `tick` (ตัวเลขอย่างเดียว) และ broadcast `state` ตัวเต็มทุก `RESYNC_EVERY` (10) วิ เป็นตาข่าย

---

## 3. วงจร 1 รอบ (call chain ที่ต้องจำ)

```
dealRound()            phases/draw.js    เริ่มรอบ: roundNumber++, ปิด Overload Force, สับเด็คใหม่, ล้าง cutsceneQueue/lastLog/roundSkills,
                                         ร้านเปิดทุก 5 เทิร์น (ไม่งั้น refreshShopForJourney)
                                         ลูปต่อผู้เล่น: ภาษีกลางคืน → oberon_summer.onRoundStartTick → oblada/energy → ฟื้นเกราะ
                                         → awaken/passive roundStart → tickBurn/tickBleed/tickPoison/tickShock → แจกไพ่ใบแรก
                                         → หลับไหล → tickMend → Gargorgon → สตั้น
                                         หลังลูป: muimi.onRoundStartAfterLoop → captureTurnSnapshot() → PLAYING (+ เล่นคิวคัตซีนถ้ามี)
   ↓ (ผู้เล่นกด)
hit(id)                phases/draw.js    จั่ว 1 ใบ (เช็ค nodraw/เพดานแต้ม/โชคลาภ/สภาพชา) → checkAllLocked()
useSkill(id,tier,...)  skills.js         ใช้สกิล (ดูข้อ 6)
lock(id)               phases/draw.js    "เปิดไพ่" = พร้อม — ยิง applyLockColorTriggers() ก่อนล็อก
   ↓
checkAllLocked()       phases/draw.js    ผู้รอดทุกคน locked && ไม่มี QTE ค้าง → resolveRound()
resolveRound()         phases/summary.js ล็อกทุกคน → sweepQte() → หาผู้ชนะ (best) / ผู้แพ้ (worst) → ดาเมจแพ้ → muimi.onAfterRoundScores
                                         → afterResolve()
   └ ถ้าแต้มสูงสุดเสมอ & ไม่มี "ดาบสะบั้น" ในสนาม & rand<30% → triggerOverloadForce() → restoreTurnSnapshot() (ย้อนทั้งเทิร์น)
     → beginOverloadForceDraw() (แจกไพ่ใหม่ในเทิร์นเดิม)
afterResolve()         phases/summary.js คัตซีน afterReveal ที่ค้าง (TRANSFORMS) → runCutsceneQueue(goSummary)
goSummary()            phases/summary.js gameState = SUMMARY, timer 5s → afterSummary
afterSummary()         phases/attack.js  ผู้ชนะหลับ/สตั้น/ชนะจากการเสมอแต้ม/ไม่มีเป้า → endTurn()
                                         ไม่งั้น gameState = ATTACK รอ doAttack
doAttack(by,target)    phases/attack.js  ท่อดาเมจเต็ม (ดูข้อ 5) → ATTACKING → runCutsceneQueue(endTurn)
endTurn()              phases/endTurn.js ลดเทิร์นสถานะทั้งหมด, แต้มสกิล+เหรียญ, Journey.onEndTurn, oberon_summer.onEndTurn,
                                         กวาดคนเลือดหมด → runCutsceneQueue → gameOver() / maybeJourneyAdvance() / TRANSITION → dealRound()
```

**จุดพลาดที่เจอบ่อย**: `dealRound()` ล้าง `cutsceneQueue` ทิ้ง — โค้ดที่คิววีดีโอไว้ต้องอยู่ **หลัง** บรรทัดนั้นเสมอ

---

## 4. การ์ดและแต้ม

- **กองกลางร่วม 43 ใบ** สับใหม่ทุกรอบใน `dealRound()` (ทุกคนจั่วจากกองเดียวกัน — ไพ่หมดกอง = จั่วไม่ได้)
  - เลข 1–10 × 4 สี (red/blue/green/yellow) = 40 ใบ + `king` + `queen` + `joker`
  - `state.deckLedger` = การ์ดทั้ง 43 ใบตามลำดับคงที่ + ใบไหนถูกจั่วไปแล้วในรอบนี้ (กดกองกลางเพื่อดู)
- `drawFromCentralDeck(predicate)` (`server/deck.js`) — สุ่มจาก index ที่ผ่าน predicate (ใช้ทำ "โชคลาภ")
- `drawInitialCard()` ห้ามได้การ์ดพิเศษ
- **การ์ดพิเศษ**: King = เหรียญ +10 ทันที (ผ่าน `addGold`) · Queen = `freecast` ใช้สกิลฟรี 1 ครั้ง (หายจบเทิร์น) · Joker = `+min(12, 21-base)` (Overload Force = +12 ตายตัว)
- **ทริกเกอร์สี ครบ 3 ใบ/ชุด**
  - 🔵 ฟ้า → ทำงาน **ทันทีตอนจั่ว** (`checkBlueTrigger`): ต้านสถานะผิดปกติ 1 เทิร์น
  - 🔴 แดง / 🟢 เขียว / 🟡 เหลือง → ประเมิน **ตอนกด lock** (`applyLockColorTriggers`): แดง = ATK รอบนี้ +n (`statusAmt.cardAtkBonus`) · เขียว = ฟื้นเลือด +n · เหลือง = แต้มสกิล +2n
- **แต้ม**: `calculateScore()` (raw) → `scoreOf(p)` → `bustedOf(p)`
- **เพดาน** `scoreCap(p)`: ปกติ 21 · Overload Force = `Infinity` (แต้มถึงเพดาน = ปุ่มจั่วปิด `atCap`)
- **`bustedOf(p)` เช็คการ "สั่งให้แตก" ก่อนทุกอย่าง** — `CHAR_HOOKS.muimi.forcedBust()` (ท่าไม้ตาย/หัวใจนักสู้ของมุยมิ) คืน true
  แม้จะอยู่ใน Overload Force (เพราะเป็นคำสั่ง ไม่ใช่ผลการคิดแต้ม)
- **ไพ่แตกแล้วไม่ล็อกอัตโนมัติ** — ยังกดสกิล/ไอเทมได้จนกว่าจะกดเปิดไพ่เอง แต่ท่าไม้ตายแบบ afterReveal ที่กดไปเป็นโมฆะ (`voidUltimateOnBust` ใน `server/combat.js`)

---

## 5. ท่อความเสียหาย (สำคัญที่สุด)

**ค่าคงที่ฐาน**: `MAX_HP = 7` · `MAX_ARMOR = 3` · `MAX_SKILL = 8` · `MAX_PLAYERS = 7` (patch 2.8)
(`maxHpOf`/`maxArmorOf`/`maxSkillOf` คืนค่าคงที่ทุกคน — ตัวละครที่มีเพดานต่างออกไปต้องเพิ่มเงื่อนไขในฟังก์ชันเหล่านี้)

**ลำดับการรับดาเมจ**: เกราะ Mark 42 (ถ้าใส่อยู่) → `shield` (กันครั้ง) → `armor` (เกราะ) → `tempHp` (เลือดชั่วคราว) → `hp` (เลือดจริง) — hp ถึง 0 = ตกรอบ

| ฟังก์ชัน | พฤติกรรม |
|---|---|
| `damageSoft(p)` | 1 หน่วยมาตรฐาน: Mark 42 → shield → armor → hp (ใช้กับดาเมจแพ้จั่ว — **ไม่ผ่าน** `adjustIncomingDamage`) |
| `dealMixed(p,n,isNormal)` | n หน่วย เกราะก่อนแล้วเลือด (ท่ามาตรฐานของสกิล/โจมตี) |
| `dealDirect(p,n,isNormal)` | ทะลุเกราะ เข้าเลือดจริงตรงๆ (ยังกิน shield) |
| `dealArmorOnly(p,n)` | กินเฉพาะเกราะ |
| `loseHp(p)` / `loseArmor(p)` | primitive ระดับ 1 หน่วย (Mark 42 ดักที่นี่ด้วย · `loseHp` กิน `tempHp` ก่อน) — ห้ามแก้ `p.hp` ตรงๆ นอกจากนี้ |
| `instantDeath(p, force)` | ตกรอบทันที — ใส่ Mark 42 อยู่ = แค่ชุดพัง (เว้นแต่ `force`) · ล้าง QTE ที่ค้าง |

`dealMixed`/`dealDirect`/`dealArmorOnly` ทุกตัวเช็ค `friendlyEffectBlocked` (ยิงพวกเดียวกันในโหมดทีม) ก่อน แล้วผ่าน
`adjustIncomingDamage(p, n, isNormalAttack, kind)` → เกราะ Mark 42 ดูดทั้งก้อนก่อน → `CHAR_HOOKS[id].adjustIncomingDamage()` (ถ้ามี)
· `kind` = `"direct"` / `"armor"` / `"mixed"`

`isNormalAttack = true` **เฉพาะที่ `doAttack()` เรียกเท่านั้น** — ใช้แยกว่าเป็น "โจมตีปกติ" ในฮุคของตัวละคร

**พลังโจมตี**: `computeAttackBase(engine, attacker, target)` (`server/phases/attack.js`) — ฐาน 1 หน่วย (`hook.attackBaseOverride()` แทนที่ได้)
\+ `hook.damageBonus()` + บัฟ ungated ที่ใครติดก็ได้: Mark 42 +1 · ผลสนามของการเดินทาง (`Journey.attackBonus`) ·
บัฟจากท่าของโอเบรอน (`oberon_summer.atkBonus` — ม่านแห่งราตรี +1 / จุดจบของความฝัน +4) · `empower` +1 · การ์ดแดง `cardAtkBonus`
→ มีเทสต์แยกที่ [tests/computeAttackBase.test.js](tests/computeAttackBase.test.js)
· `damageBonus` ต้องไม่แก้ state (เขียนลง `ctx` ได้ เช่น `ctx.muimiTowerAtk` ไว้ทำป้าย) — `estimateAttackOn` (`engine.attackPowerAgainst`) เรียกท่อเดียวกันเพื่อ "ประเมิน"

**ลำดับใน `doAttack()`**: ตรวจเป้า → หลบหลีก `evade` (ข้ามถ้าผู้ตีติด `accurate`) → เนตรมณะ (สังหารทันที 20%) →
`Journey.tryAttackMiss` (ป่าไม้ต้องสาป กลางวัน) → `computeAttackBase` → ผกผัน (`invert`) → `might` +n → `weak` + พิษร้าย −n →
`guard` ของเป้า −n → `discord` +1 → `fragile` +n → คริติคอลของสนาม (`Journey.applyCrit`) → `dealMixed(target, dmg, true)` →
`muimi.onAttackLanded` → `empower` หมดไป → ป้ายสกิล (`skills` แยกฝั่ง atk/def) → `ATTACKING`

**ดาเมจแพ้รอบ** (`resolveRound`): แต้มน้อยสุด (และไม่ใช่ผู้ชนะ) → `damageSoft` 1 หน่วย — **ไม่ได้แต้มสกิล** · ทุกคนแต้มเท่ากัน = ไม่มีผู้แพ้

---

## 6. สกิล

| tier | cost (ตั้งใน `characters.js`) | หมายเหตุ |
|---|---|---|
| `passive` (+ `passive2`) | ฟรี | ทำงานเองตาม trigger (`firePassive`: `roundStart`/`win`/`lose`) หรือ engine/ฮุคเรียกตรง — ทั้งสองตัวตอนนี้เรียกจากฮุค |
| `basic` | ปกติ 2 | มุยมิ 0 · โอเบรอน 2 |
| `secondary` | ปกติ 4 | มุยมิ 4 · โอเบรอน 4 |
| `ultimate` | ตามตัวละคร (หลอดจุ `MAX_SKILL` 8) | มุยมิ 8 · โอเบรอน 4 |

**ลำดับใน `useSkill(id, tier, targets)`** (`server/skills.js`) — ห่อ `withEffectSource(p)` ให้เองถ้ายังไม่มีต้นตอ
1. ด่านพื้นฐาน: ยังรอด · `gameState === "PLAYING"` · ยังไม่ `locked` (สตั้น/หลับ/เปิดไพ่แล้ว = ใช้ไม่ได้) · ไม่ติด `noskill`
2. คิดราคา (ดูสูตรด้านล่าง) · มีการ์ด Queen = ฟรี · แต้มไม่พอ = ไม่ทำงาน
3. `hook.canUseSkill(engine, p, tier, targets)` — ด่านของตัวละคร (คูลดาวน์/โควตา/ต้องมีเป้า) คืน false = ไม่หักอะไรเลย
4. **โควตา 1 สกิลต่อเทิร์น** (`p.skillUsedRound`) — `hook.ignoresTurnQuota(p, tier)` = กดได้แม้ใช้โควตาไปแล้ว ·
   `hook.skipsTurnQuota(p, tier)` = กดแล้วไม่กินโควตา (มุยมิ "เสบียงฉุกเฉิน" ใช้ทั้งคู่ · โอเบรอน "นกจาบยามเช้า" ใช้แค่ skips)
5. ท่าไม้ตายที่ `effect` เป็นสถานะ: กดซ้ำไม่ได้ระหว่างสถานะยังอยู่
6. หักแต้ม → `tickCurseOnSkill` (คำสาป) → `numbFizzles` (เหน็บชา 30% ไม่ทำงาน — แต้ม/โควตาเสียแล้ว) →
   `Journey.skillMisses` (ป่าไม้ต้องสาป กลางวัน: คืนแต้ม แต่โควตาเสีย) → `Journey.skillRefund` (ทะเลทราย กลางคืน)
7. `hook.applyInstantSkill(engine, p, tier, targets)` ลงผล — คืนข้อความต่อท้ายป้ายเด้ง · แล้ว `applyEffect(skill.effect)` (ตัวละครปัจจุบัน `effect: null` ทั้งหมด)
8. `skill.instant` → `skillFlash` (เสียงจาก `hook.skillSound(p, tier)`) · บันทึก `roundSkills` · เช็คไพ่แตก → `voidUltimateOnBust`
9. มีคัตซีนในคิว → `pausePlayingForCutscene()` (เล่นแล้วกลับมาจั่วต่อด้วยเวลาที่เหลือ)

**สูตรราคาจริง** (`useSkill` และ `showCost()` ใน `buildStateFor` ต้องคิดเหมือนกันเป๊ะ — ราคาบนปุ่ม = ราคาที่หักจริง)
```
cost = min(SKILL_COST_MAX /* 8 */,
         max(0, skill.cost - statusAmt(spellflow))   // กระแสเวท (ลดราคา)
       + (nightTaxTier === tier ? 1 : 0)             // ภาษีกลางคืน: สุ่ม basic/secondary แพงขึ้น 1 (การเดินทาง: เฉพาะภูมิภาค 1 กลางคืน)
       + Journey.skillTax(baseCost)                  // ภูมิภาค 3: +1 (สกิลราคา 0 ยังฟรี)
       + min(SPELLBURDEN_MAX /* 2 */, statusAmt(spellburden)))  // ภาระเวท
// ตัวปรับ "ขาขึ้น" ทุกตัวรวมกันดันราคาได้ไม่เกิน 8 → สกิลที่ cost 8 อยู่แล้วจะไม่แพงขึ้นอีก
ถ้า cost > 0 และมี freecast (การ์ด Queen) → ฟรี 1 ครั้ง
```

**การได้แต้มสกิล** (จุดจริงในโค้ด):
- จบเทิร์น **+1** + โบนัสภูมิภาค `Journey.skillBonus()` (ภูมิภาค 1 กลางวันเทิร์นคู่ +1 · ภูมิภาค 7 ทุกเทิร์น +1) — `endTurn()`
- ทริกเกอร์ไพ่เหลืองครบ 3 ใบ **+2 ต่อชุด**
- ไอเทม "ยาฟื้นแต้มสกิล" · สกิล/สกิลติดตัวของตัวละคร (เสบียงฉุกเฉิน +2 · ดาบเก่าๆ +1/หมัด · หน้าไหว้หลังหลอก +1)
- **ชนะการจั่ว / แพ้แต้มน้อยสุด / ไพ่แตก / โดนโจมตี ไม่ได้แต้มสกิล** — ไม่มี `addSkill` ใน `resolveRound()`/`doAttack()`
- บล็อกการฟื้นแต้ม: `stagger` (ชะงัก) · `manaSeal` (ผนึกพลังงาน) — เช็คที่หัว `addSkill`
- `addSkill(p, n, src)` — `src` เป็น tag ของ "ช่องทางฟื้นฟู" (`"item"` / `"passive"` / `"card"`) ใส่เฉพาะจุดที่เป็นการฟื้นพลังงานจริงๆ
  (ไม่ใส่ให้แต้มพื้นฐานจบเทิร์น) · ตอนนี้ยังไม่มีระบบไหนอ่านค่านี้ แต่ให้คงคอนเวนชันไว้

**คูลดาวน์/สิทธิ์ที่กินเวลาข้ามเทิร์น เก็บเป็น "เลขรอบ"** ไม่ใช่ตัวนับใน `p.statuses` (ไม่โผล่ในรายการสถานะให้ทุกคนเห็น
และไม่ต้องมีใครลดเทิร์นให้) — เทียบกับ `engine.roundNumber` ตรงๆ เช่น `p.muimiUltLock`, `p.obsUltReady`, `p.obsVeilUntil`
- ฟิลด์พวกนี้ไม่ใช่สถานะ จึง**ต้องล้างเองใน `resetCombat()`** (ผ่าน `hook.resetCombat`) และใส่ค่าเริ่มใน `newPlayerRecord()` ของ `server/socket.js`
- ส่งให้ client ผ่านฟิลด์ของตัวเอง (`muimiUltCd`) หรือก้อนกลาง `skillLocks` (`hook.skillLocks(engine, p)` → `{ basic: { cd }, secondary: { locked }, … }`)
  — ปุ่มต้องล็อกทั้งสองฝั่ง (`canUseSkill` + ปุ่มฝั่ง client)

**มุยมิ (`muimi` · ง่าย)** — `characters/muimi.js` · เทสต์ [tests/characters/muimi.test.js](tests/characters/muimi.test.js)
- **เสบียงฉุกเฉิน** (basic · 0 แต้ม): 1 ครั้ง/เทิร์น รวม 2 ครั้งต่อเกม (`p.muimiEmergencyUses`/`p.muimiEmergencyUsedRound`) ฟื้นเลือด 2 + แต้มสกิล 2
  · ไม่นับเป็นการใช้สกิล (`ignoresTurnQuota` + `skipsTurnQuota`) · ปุ่มฝั่ง client แสดงจำนวนครั้งจาก `muimiEmergencyUses`/`muimiEmergencyMax` (`ammo: 2`)
- **ดาบสนิม** (secondary · 4): สถานะ `muimiRusty` ("ดาบเก่าๆ") 3 เทิร์น — ตีปกติโดนแล้วฟื้นเลือด 1 + แต้มสกิล 1 (`onAttackLanded`) · ใช้ไม่ได้ระหว่าง "ดาบสะบั้น"
- **ดาบสะบั้นหอคอยสวรรค์** (ultimate · 8): ศัตรูทุกคน (ไม่รวมเพื่อนร่วมทีม) **ไพ่แตกทันที** + `muimiTower` ("ดาบสะบั้น") 2 เทิร์น + ต้านสถานะ 3 เทิร์น
  - "ไพ่แตก" เป็นคำสั่งตรง ไม่ใช่ดีบัฟ: ตั้ง `target.muimiForcedBustRound = roundNumber` แล้ว `bustedOf()` อ่านผ่าน `muimi.forcedBust()` (ต้านไม่ได้ · ไม่ผ่าน `applyDebuff`)
  - ระหว่างดาบสะบั้น: พลังโจมตี +3 (`damageBonus`) · ตีโดนฟื้นเลือด 2 และ **ยืดสถานะ +1 เทิร์น** (สกิลติดตัว "ใจที่ไม่ยอมแพ้") ·
    **Overload Force ไม่เกิด** (`blocksOverloadForce` เช็คใน `resolveRound`) · ภาพบนสนาม/เพลงสกิลเปลี่ยน (`displayImg`, `activeSkillMusic` → `"muimi"`) ·
    เสียงตีปกติ `muimi_ub_hit` (ปกติ `muimi_normal_hit` — `attackSoundOf`)
  - ดาบสะบั้นหมดอายุ (ลูปลดเทิร์นของ `endTurn`) → `onUltExpire` ล็อกท่าไม้ตาย 5 เทิร์น (`p.muimiUltLock`) · ใช้ไม่ได้ระหว่าง "ดาบเก่าๆ"
  - คลิป: ครั้งแรกต่อเกม `muimiUltimateFull` (24 วิ) ครั้งต่อไป `muimiUltimateShort` (12 วิ) — `queueCutscene` เล่นทุกครั้ง แล้ว `useSkill` พักเฟสจั่วไพ่
- **หัวใจนักสู้** (passive2): `onAfterRoundScores` (ท้าย `resolveRound`) นับแพ้/ไพ่แตกติดกัน — **เทิร์นที่กดท่าไม้ตายนับเป็นแพ้** ·
  ครบ 3 → จองเทิร์นถัดไป (`p.muimiHeartRound`) → `onRoundStartAfterLoop` (หลังแจกไพ่ใบแรกครบทั้งสนาม) สุ่ม 50% บังคับศัตรูไพ่แตกแบบเดียวกับท่าไม้ตาย
  · สุ่มแล้วรีเซ็ตสตรีคเสมอ (สำเร็จหรือไม่ก็ตาม)

**โอเบรอน (ฤดูร้อน) (`oberon_summer` · กลาง)** — `characters/oberon_summer.js` (กติกาเต็มอยู่หัวไฟล์) · เทสต์ [tests/characters/oberon_summer.test.js](tests/characters/oberon_summer.test.js)
- **ม่านแห่งราตรี** (basic · 2): ทุกคน (duo/trio = ตัวเอง + เพื่อนร่วมทีม) ได้ `obsVeil` พลังโจมตี +1 3 เทิร์น + ฟื้นเลือด 1 · กดซ้ำไม่ได้จนผลหมด (`p.obsVeilUntil`)
- **นกจาบยามเช้า** (secondary · 4): เลือก 1 คน **ใครก็ได้รวมศัตรู** ฟื้นเลือด 5 + ต้านสถานะ 2 เทิร์น + `cleanseLatestDebuff` 1 อย่าง ·
  ไม่กินโควตาเทิร์น (`skipsTurnQuota`) แต่กดได้ 1 ครั้ง/เทิร์น (`p.obsLarkRound`)
  - ผลเสีย: ตั้ง `t.statuses.obsLark = 2` (ลูป `endTurn` ลดเหลือ 1) → ต้นเทิร์นถัดไป `onRoundStartTick` (ในลูปของ `dealRound`) เสียเลือด 2 ทะลุเกราะ
    · **ไม่ห่อ `withEffectSource`** โดยตั้งใจ — มีต้นตอ = `friendlyEffectBlocked` จะกันไม่ให้ลงเพื่อนร่วมทีม · ตั้ง `_statusDamage` แทน
- **จุดจบของความฝัน** (ultimate · 4 · คูลดาวน์ 5 — `p.obsUltReady`): เลือก 1 คน (รวมศัตรู/ตัวเอง) `obsDream` +4 เฉพาะเทิร์นนี้ ·
  ปัก `t.obsDreamStunDue` → `onEndTurn` (หลังลูปลดเทิร์นสถานะ) ใส่สตั้น 3 เทิร์นผ่าน `applyDebuff` (ต้านได้) — อยู่หลังลูป สตั้นจึงเต็ม 3 เทิร์นถัดไป
- **หน้าไหว้หลังหลอก** (passive): `onEndTurn` — โอเบรอนที่ `!p.wasAttacked` ทั้งเทิร์น ได้แต้มสกิล +1 และเหรียญ +1 (ถูกเลือกเป็นเป้าแม้หลบได้ก็นับว่าถูกโจมตี)
- `obsVeil`/`obsDream`/`obsLark` ไม่อยู่ใน `BUFF_KEYS`/`BASIC_DEBUFF_CLEAR` → ปาด/ล้าง/ต้านไม่ได้ · พลังโจมตีอ่านแบบ ungated ที่ `computeAttackBase` (`atkBonus`) + ป้าย `atkFx`
- ล็อก/คูลดาวน์รายช่องส่งผ่าน `skillLocks` · เสียงกดสกิลรายช่อง `skillSound` (`oberon_summer_skill1-3`)
- เลือกตัวละครซ้ำกันได้หลายคน — สถานะ/ตัวนับต้องแยกต่อคน: [tests/characters/duplicate-safety.test.js](tests/characters/duplicate-safety.test.js)

**QTE (Quick Time Event) — ระบบกลาง (patch 3.0)** `server/qte.js` · **ตอนนี้ยังไม่มีตัวละครที่ใช้** (โครงพร้อมใช้)
```
startQte(p, { count, perNoteMs, tag })   สุ่มลำดับ w/a/s/d เก็บที่ p.qte  (engine.startQte)
qteKey(id, key) / qteTimeout(id)         socket handler — ตรวจทั้ง "ตัวถูก" และ "มาทัน" ที่ server
finishQte(p, ok) -> CHAR_HOOKS[tag].onQteDone(engine, p, ok, qte)
qtePending() / sweepQte()                กันสรุปรอบ (checkAllLocked) + กวาดตอนหมดเฟส (resolveRound)
```
- **ไม่มี timer ฝั่ง server เลยโดยตั้งใจ** — `startPhaseTimer` มีตัวเดียวทั้งเกมและถูกล้างทุกครั้งที่เปลี่ยนเฟส
  ส่วน `setTimeout` ต่อ QTE มีโอกาสค้างเมื่อผู้เล่นหลุด/จบเทิร์น/กลับล็อบบี้ → เก็บแค่ `deadline` (ms) แล้วตัดสินตอนคำตอบมาถึง
- **คลิปผลลัพธ์ต้องสั่งเล่นที่ `finishQte()`** — `onQteDone` ของตัวละครแค่ `queueCutscene` ไว้ · `finishQte` เรียก `pausePlayingForCutscene()` ต่อท้ายเสมอเมื่ออยู่ใน PLAYING และมีของในคิว
- **ไม่แช่คนอื่น**: คนอื่นจั่ว/เปิดไพ่ได้ตามปกติ แค่ยังไม่สรุปรอบให้ · หมดเฟสจั่วไพ่แล้วยังไม่จบ = `sweepQte()` ถือว่าพลาด
- **กันโกง**: ลำดับปุ่มถูกสุ่มและเทียบที่ server · `buildStateFor` ส่งให้เจ้าของ **แค่ปุ่มตัวถัดไปตัวเดียว** · `qteTimeout` จาก client ถูกตรวจเวลาซ้ำก่อนเชื่อ
- `instantDeath` ล้าง QTE ที่ค้างของคนที่ตกรอบ

---

## 7. สถานะ (statuses)

- `p.statuses[key]` = **จำนวนเทิร์นที่เหลือ** (หรือจำนวนสแตค แล้วแต่ key)
- `p.statusAmt[key]` = **ขนาดของผล** (เช่น guard 2 = ลดดาเมจ 2) — อ่านด้วย `statusAmtOf(p,key)` เสมอ
- ลดเทิร์นทั้งหมดที่ลูปใน `endTurn()` (`server/phases/endTurn.js`) — **key ที่ไม่ควรลดเทิร์นต้อง `continue;` ในลูปนั้นเอง**
  ตอนนี้ข้าม: `hbleed`/`hburn` (ลดเองตอนติกต้นเทิร์น) · `fortune` (หมดเมื่อจั่ว) · `evade` (mirror ของ `p.evadeStacks`) · `empower` (หมดเมื่อโจมตี) ·
  `sleep` เทิร์นแรก (`p.sleepFresh`) — ตรงกับ `NO_TICK_STATUS` ใน `_universal_status.js` · หมดอายุแล้วล้าง `statusAmt` ให้เอง
  · สถานะหมดอายุที่ต้องมีผลตามมา เรียกฮุคในลูปนี้ (ตอนนี้: `muimiTower` → `muimi.onUltExpire`)

**บัฟกลาง** (`BUFF_KEYS` ใน `_universal_status.js` — `stripLatestBuff` ปาดได้): `resist` (ต้านสถานะ) · `guard` (คุ้มครอง) · `fortune` (โชคลาภ) ·
`mend` (เยียวยา) · `might`/`empower` (เสริมพลัง) · `evade` (หลบหลีก) · `spellflow` (กระแสเวท) · `freecast` (การ์ดราชินี) · `awaken` (ตื่นขึ้น) ·
`accurate` (แม่นยำ — เจาะการหลบทุกแบบ) · นอกรายการ: `netramana` (เนตรมณะ — โอกาสสังหาร 20% ตอนตีปกติ)

**ดีบัฟกลาง** (`BASIC_DEBUFF_CLEAR` = ต้าน/ล้างได้ทั้งก้อน): `discord` · `sleep` · `stun` · `nodraw` · `noskill` · `weak` · `fragile` · `spellburden` (ภาระเวท — ดูกล่องด้านล่าง) ·
`oblada` (สิ่งแปลกปลอม) · `hburn` (ลุกไหม้) · `hbleed` (เลือดไหล) · `invert` (ผกผัน) · `nohealing` · `manaSeal` · `chaa` (จั่ว 1 ครั้งได้ 2 ใบ) · `blind` (ตาบอด) ·
`poison` (พิษร้าย) · `decay` (ผุพัง เกราะไม่ฟื้น) · `stagger` (ชะงัก) · `promo` (เปิดแต้ม) · `energy` · `numb` (เหน็บชา)
· `SOFT_DEBUFF_STEP` (ล้างได้ทีละ 1): `curse` (คำสาป) · `shock` (ช็อต)
· ชื่อที่ยังค้างในรายการแต่ **ไม่มีผลในโค้ดแล้ว**: `manaLeech` · `manaRupture` · `drunk`

> ⚠️ **กติกาการมอบผลให้ผู้เล่นคนอื่นตอนต้นเทิร์น** — `tickBurn()`/`tickBleed()`/`tickPoison()`/`tickShock()` และการแจกไพ่ใบแรก
> ถูกเรียก **ในลูปต่อผู้เล่นของ `dealRound()`** ดังนั้นฮุคต้นเทิร์นที่แจกผล **ให้ผู้เล่นคนอื่น** ห้ามทำในลูปนั้น:
> คนที่ลูปยังวนไม่ถึงจะโดนผลในเทิร์นเดียวกัน ส่วนคนที่วนผ่านไปแล้วต้องรอเทิร์นถัดไป = **ผลไม่เท่ากันตามลำดับที่นั่ง**
> ให้จองไว้แล้วลงผลหลังลูปจบ (ต้นแบบ: `muimi.onRoundStartAfterLoop` ที่บังคับศัตรูไพ่แตกหลังแจกไพ่ใบแรกครบทั้งสนาม)
> — ฮุคในลูป (`oberon_summer.onRoundStartTick`) ลงผลกับ **ตัวผู้เล่นคนนั้นเอง** เท่านั้น
> · ถ้าฮุคใช้ `withEffectSource` อยู่ ต้องเก็บผู้มอบไว้แล้วคืน source ตอนลงผลด้วย ไม่งั้น `friendlyEffectBlocked` ในโหมดทีมจะไม่ทำงาน

**เลือดไหล (`hbleed`) — สถานะ Universal (patch 2.5)**
กลไกเหมือน `hburn` ทุกอย่าง: ดาเมจ 1 หน่วยต่อเทิร์น (เกราะก่อน) แล้วลดสแตคลง 1 ที่ `tickBleed()` ต้นเทิร์น (เรียกคู่กับ `tickBurn` ใน `dealRound`)
- ใส่สถานะผ่าน **`engine.applyBleed(p, n)`** เท่านั้น (เคารพ `resist` + เพดาน `HBLEED_MAX = 6` + ประทับ `statusAt`) — ห้ามเขียน `p.statuses.hbleed` ตรงๆ
- อยู่ใน `BASIC_DEBUFF_CLEAR` (ต้านสถานะล้างได้) และ `NO_TICK_STATUS` (ลูป `endTurn` ต้องไม่ลดซ้ำ)
- **ผลข้างเคียงที่ต่างจากลุกไหม้**: ระหว่างติดอยู่ การฟื้นพลังชีวิตเหลือครึ่ง (`bleedHealPenalty` ใน `healHp()`) — ฟื้น 1 หน่วยไม่ถูกลด
- ฮุครายตัวละคร (ไม่ต้องแก้ `_universal_status.js`): `hbleedImmune(p)` / `hbleedHeals(p)` / `hbleedLabel(p)` / `hbleedHarmless(p)`
  (`hbleedHarmless` คุมเฉพาะการลดครึ่งของ `healHp`) · ลุกไหม้มีชุดเดียวกัน `hburnImmune` / `hburnHeals` / `hburnLabel` — ตัวละครปัจจุบันไม่ได้ใช้

**ภาระเวท (`spellburden`) — กฎกลาง ห้าม bypass** (ตอนนี้ไม่มีตัวละครที่มอบ — ระบบยังอยู่และมีเทสต์)
ทุกแหล่งต้องเรียก **`engine.applySpellburden(p, turns)`** เท่านั้น (`_universal_status.js` → wrapper ใน `server/combat.js`)
ห้ามเขียน `p.statuses.spellburden` / `applyDebuff(p, "spellburden", ...)` ตรงๆ
- จำนวนสะสม **+1 ต่อครั้ง เพดาน `SPELLBURDEN_MAX = 2`** (เพิ่มราคาสกิลของเป้าหมายได้มากสุด 2 แต้ม)
- **ใช้ซ้ำใส่คนเดิมขณะสถานะยังติดอยู่ = ไม่ต่ออายุ** — `turns` ใช้เฉพาะตอนที่สถานะยังไม่ติด (ผ่าน `setTurnsNoRefresh()`) · `turns` เป็นของแต่ละแหล่งกำหนดเอง
- `resist` กันได้ทั้งก้อน (คืน `false`) · หมดอายุที่ `endTurn()` แล้วล้าง `statusAmt` ให้เอง (จำนวนไม่ค้าง)
- wrapper ใน `server/combat.js` กันเฉพาะ "เพื่อนร่วมทีม**คนอื่น**" ไม่กันการใส่ตัวเอง — สกิลที่แลกภาระเวทของตัวเองเป็นพลังต้องทำงานได้ในโหมดทีม
- เทสต์: [tests/spellburden.test.js](tests/spellburden.test.js)

- **ล้างดีบัฟ "ที่โดนล่าสุด"** `cleanseLatestDebuff(p)` (นกจาบยามเช้าของโอเบรอน): `applyBuff`/`applyDebuff`/`applyBleed` ประทับ `p.statusAt` ให้ทั้งบัฟและดีบัฟที่ล้างได้
  ดีบัฟที่เขียน `p.statuses` ตรงๆ ไม่มีตรา = ถือว่าเก่ากว่า · `SOFT_DEBUFF_STEP` ลดทีละ 1 ที่เหลือล้างทั้งก้อน
- `applyDebuff()` คืน `false` ถ้าโดน `resist` กัน (wrapper ใน `combat.js` คืน `false` ด้วยถ้าเป็นเพื่อนร่วมทีม) — `cleanseDebuffs` ล้าง `BASIC_DEBUFF_CLEAR` ทั้งหมด + `SOFT_DEBUFF_STEP` ทีละ 1
- **`evade` เป็นกรณีพิเศษ**: ตัวจริงอยู่ใน `p.evadeStacks` (array อายุต่อสแตค, สูงสุด 3 สแตค × 2 เทิร์น) — `p.statuses.evade` เป็นแค่ mirror ใช้ `grantEvadeStack`/`consumeEvadeStack`/`tickEvadeStacks` เท่านั้น ห้ามแตะตรงๆ
- ตาบอด (`blind`) ทำงานที่ `buildStateFor()`: ผู้ชมที่ตาบอดไม่เห็นไพ่/แต้ม/เลือด/เกราะ/แต้มสกิลของทุกคน (ค่า `null` / `-1`)

---

## 8. คัตซีน / แปลงร่าง

- **เสียงฝั่ง client:** `audioPolicy.js` กำหนดลำดับคัตซีน/เสียงพากย์ → เพลงสกิล → เพลงช่วงโจมตี (`battle_phase`) → เพลงภูมิภาค ของทุกโหมด
  คัตซีนที่ถูกซ่อนจากผู้ชมไม่หยุดเพลงของผู้ชมคนนั้น · โหมดประหยัดเล่นเพลงต่อได้เมื่อข้ามวิดีโอ (ยกเว้นคัตซีน `overloadForce` ที่บังคับเล่น)
  `playCutsceneVideo()` พักเพลงด้วย `suspendMusic()` จนกว่าจะออกจากคลิป และคืนเสียงหลัง autoplay บังคับปิดเสียงเมื่อผู้เล่นคลิก/กดแป้นพิมพ์
  เสียงพากย์ประกาศร่างต้องหยุดเมื่อออกจากฉาก · เสียงจบเทิร์นติดตามจาก PLAYING ผ่านคัตซีนถึง SUMMARY และเสียงโจมตีนับตาม `attack.id`
- **สัดส่วนผสมเสียง (`client/src/audio.js`):** ระดับ = ฐานตามชนิด × ค่าปรับรายไฟล์ × `masterGain()`
  ฐาน: เพลง `MUSIC_BASE` 0.75 (เดิม 0.5 — ผู้เล่นบอกว่าเบาไป) · เอฟเฟกต์/เสียงพากย์ `SFX_BASE` 1 · คลิก `CLICK_BASE` 0.55 · วีดีโอ `VIDEO_BASE` 1 (เพลงถูกพักระหว่างวีดีโอ)
  ลูปเสียงเฉพาะกิจ (`startLoopSfx`/`stopLoopSfx`) ใช้ฐานเพลง เพราะมันเล่นแทนเพลงประกอบ — ระหว่างนั้นใช้ "หรี่" (`musicDuck`) แทน `stopMusic()`
  (เอฟเฟกต์เพลงใน `App.jsx` สั่ง `playMusic()` ซ้ำทุกครั้งที่ state เปลี่ยน เพลงที่ถูก pause จะกลับมาเล่นเองในบรอดแคสต์ถัดไป)
  `LOUDNESS_GAIN` = ตารางค่าปรับรายไฟล์ (key = path) สร้างจากการวัด RMS แบบตัดช่วงเงียบ เป้า เพลง/เอฟเฟกต์ -14 · วีดีโอ -16 dBFS
  ค่าปรับลดได้อย่างเดียว (HTMLAudio `volume` เกิน 1 ไม่ได้) — ไฟล์ที่เบาเกินจึงถูกเข้ารหัสใหม่ให้ดังขึ้นที่ตัวไฟล์ (ต้นฉบับสำรองที่ R2 `_backup_audio/`)
  **ไฟล์เสียง/วีดีโอใหม่:** วัดความดังก่อนใส่ ถ้าดังกว่าเป้าให้เพิ่มลงตาราง ถ้าไม่อยู่ในตาราง = ไม่ลด
- **มาตรฐานไฟล์วีดีโอคัตซีน** (วีดีโอสตรีมจาก R2 ซึ่งเร็วแค่ ~1-5 Mbps และไม่คงที่ — ไฟล์บิตเรตสูงจะหยุดรอโหลดเป็นช่วงๆ = "กระตุก"):
  H.264 Main · yuv420p · ไม่เกิน 720p (แนวตั้งไม่เกิน 720 กว้าง) · CRF 23 เพดาน 3 Mbps · keyframe ทุก ~2 วิ ·
  **faststart (moov อยู่หน้าไฟล์ — ไม่งั้นเบราว์เซอร์ต้องดึงท้ายไฟล์ก่อนเริ่มเล่น)** · เสียง AAC
  ไฟล์ที่ได้จากแหล่งอื่นเกือบทั้งหมดไม่ผ่านเกณฑ์นี้ — ต้องแปลงก่อนอัป R2 ทุกครั้ง

- `TRANSFORMS` (`characters/_transforms.js`) = metadata ต่อ key: `{ img, video, title, label, seconds, music, voice, afterReveal, noIntro }`
  ตอนนี้มี: คลิปท่าไม้ตายของมุยมิ (`muimiUltimateFull`/`muimiUltimateShort`) · เกราะ Mark 42 (`mark42Suitup`/`mark42Recall`/`mark42SuitSome`/`mark42Bomb`) · กระสุน GUTS (`guts*`)
- `queueCutscene(p,key,onlyFor)` เข้าคิว (เล่นทุกครั้ง) · `triggerCutscene(p,key)` ครั้งแรกต่อเกมวีดีโอเต็ม ครั้งถัดไปแค่การ์ดแจ้งเตือน (`transformNotice` — ดู `p.cutsceneShown`)
  · key ที่ไม่มี `video` = แจ้งเตือนอย่างเดียว ไม่ตัดเข้า CUTSCENE
- `runCutsceneQueue(onDone)` (`server/cutscene.js`) — ตั้ง `gameState = "CUTSCENE"` เล่นเรียงทีละคลิป แล้วเรียก `onDone`
- `pausePlayingForCutscene(after)` — พักเฟสจั่วไพ่ เล่นคิวให้จบ เรียก `after` (ผลที่ต้องเกิด **หลัง** วีดีโอ เช่นกระสุน GUTS / Mark 42) แล้วกลับ PLAYING ด้วยเวลาที่เหลือ (ขั้นต่ำ 3 วิ)
  · `after` ทำงานนอกขอบเขต `effectSourceId` เดิมแล้ว — ต้องห่อ `withEffectSource` ซ้ำเอง
- **`onlyFor` (patch 2.8.1)** = array ของ `playerId` ที่เห็นคลิปนี้ · `buildStateFor(viewerId)` ส่ง `cutscene: null`
  ให้คนนอกลิสต์ (client วาดกระดานตามปกติแทน) แต่ **ทุกคนยังหยุดรอครบเวลาเดียวกัน** เกมจึงไม่หลุดซิงก์
  · `notifyTransform(p, key, onlyFor)` และ `engine.sfx(sound, onlyFor)` รับ `onlyFor` แบบเดียวกัน (ส่ง `io.to(id)` รายคน)
- **`noIntro`** ใน `TRANSFORMS` = ข้ามการ์ดเปิดตัว 950ms ของ client ไปเข้าวีดีโอเลย (คลิปที่สั้นกว่าการ์ดเปิดตัว)
  · `seconds` ของคลิปต้องตั้งให้พอดีความยาวจริง (วัดจาก mvhd แล้วปัดขึ้น) ไม่งั้นค้างเฟรมสุดท้าย/ตัดก่อนจบ
- `afterReveal: true` = ลูปใน `afterResolve()` ไล่หา **สถานะที่ชื่อตรงกับคีย์ TRANSFORMS** แล้วเล่นให้เอง (และ `voidUltimateOnBust` ลบสถานะนั้นถ้าเจ้าของไพ่แตก)
  · คลิปที่โค้ด **คิวเอง** ผ่าน `queueCutscene` ต้องเป็น `afterReveal: false` เสมอ ไม่งั้นเล่นซ้ำ 2 ครั้ง (ตอนนี้ทุกคีย์เป็น `false`)
- `p.transformAt = ++transformCounter` (`engine.nextTransformCounter()`) ใช้ตัดสินว่าเพลงสกิลของใครทับใคร เมื่อเปิดร่างพร้อมกัน
- โหมดประหยัด (client `lowQ`) ข้ามวีดีโอแต่ยัง **รอเวลาเท่าเดิม** เพื่อให้ทุกคนซิงก์กัน
- **การ์ดสกิลเด้ง** `skillFlash` (ไม่หยุดเกม) — `useSkill` ยิงให้สกิล `instant` · `payload.sound` = คีย์เสียงใน `client/src/audio.js`

---

## 9. เศรษฐกิจ + ร้านค้า

- **เหรียญ**: จบเทิร์น +1 ทุกคน (`GOLD_PER_TURN` + `Journey.goldBonus` ภูมิภาค 4 +1) · ชนะจั่ว +1 · การ์ด King +10 · หน้าไหว้หลังหลอกของโอเบรอน +1 · เพดาน `goldCapOf(p)` = `GOLD_MAX` 30
  - **ทุกการได้รับเหรียญต้องผ่าน `addGold(p, n)`** (`server/shop.js`, เปิดให้ hook ผ่าน `engine.addGold`) — จุดเดียวที่บังคับเพดานรายบุคคล
    · คืน **จำนวนที่เข้ากระเป๋าจริง** หลังตัดตามเพดาน · การเสียเหรียญ (ซื้อของ / วังวนน้ำ) หัก `p.gold` ตรง
- **ร้านเปิดทุก 5 เทิร์น** (`roundNumber % SHOP_INTERVAL_TURNS === 0` ใน `dealRound`) — **ร้านเดียว: ร้านค้ามายา 15 ช่อง สุ่มล้วน** (`openShop()`)
  - น้ำหนักต่อช่อง `SHOP_WEIGHTS` (รวม 105): เปลี่ยนสีการ์ด 15 · โชคลาภ 5 · ต้านสถานะ 15 · ยาลดไพ่ 12 · แต้มสกิล 14 · เกราะ 14 · ปืน GUTS Select 8 · กระสุน 14 · เกราะ Mark 42 8
    - แต้มสกิลแตกย่อยตาม `SHOP_SKILL_SIZES[].weight` — เล็ก (+1, 2 เหรียญ) 50 / กลาง (+4, 6) 35 / ใหญ่ (+6, 10) 15
    - กระสุนแตกย่อยตาม `SHOP_AMMO_WEIGHTS` — Shockwave/Gargorgon/Thunder อย่างละ 4 / Nurse 2
    - โควตาต่อรอบ: ปืน ≤ `SHOP_MAX_GUNS` (2) · Mark 42 ≤ `SHOP_MAX_MARK42` (2) — เต็มโควตาแล้วน้ำหนักตกไปรวมกับกระสุน (`rollShopItem(allowGun, allowMark42)`)
  - ผลของการเดินทางต่อร้าน **คิดใหม่ทุกต้นเทิร์น** ที่ `refreshShopForJourney()` (ร้านค้างข้ามช่วงกลางวัน/กลางคืน): ดูข้อ 10.1
  - ซื้อ: ใครกดก่อนได้ก่อน · หลับไหลซื้อไม่ได้ · ปืนมีได้กระบอกเดียว · ช่องนับ `bought` แล้วตัดสิน `sold` (ช่องละหลายชิ้นได้ในทุ่งดอกไม้ กลางคืน)
- ซื้อแล้วเข้า `p.inventory` (หายทุกแมตช์ใหม่) → ใช้ผ่าน `useInventoryItem()` (socket ห่อ `withEffectSource` ให้แล้ว) · หลับไหลใช้ไม่ได้
  · ยาเปลี่ยนสีการ์ด / ยาลดไพ่ ใช้ได้เฉพาะช่วงจั่วไพ่ก่อนเปิดไพ่ (ยาลดไพ่คืนใบล่าสุดเข้ากองกลาง)
- **ปืนหน่วย GUTS Select** (15 เหรียญ · ไอเทมถาวร): ยิงได้ 1 นัด/เทิร์น (`p.gutsShotTurn`) เฉพาะช่วงจั่วไพ่ก่อนเปิดไพ่ · ต้องมีปืนถึงจะยิงกระสุนได้ (`hasGutsGun`) ·
  เป้าต้องเป็นคนอื่นที่ยังรอดและไม่ใช่เพื่อนร่วมทีม (`gutsFireTargetOf`)
  - วีดีโอกระสุนเต็มจอครั้งแรกต่อผู้ยิงต่อชนิด แล้วผลเกิด **หลังวีดีโอ** (`pausePlayingForCutscene(after)`) · ครั้งต่อไปเป็นการ์ดแจ้งเตือน + ผลทันที
  - Shockwave = ทำลายเกราะทั้งหมด (ใส่ Mark 42 = ชุดพัง) · Gargorgon = สตั้น 1 เทิร์น **ต้นเทิร์นถัดไป** (`gutsGargorgonPending` — ต้านได้ตอนนั้น) ·
    Thunder = สภาพชา 2 เทิร์น · Nursedessei Cannon (10 เหรียญ) = ดาเมจ 4 (เกราะก่อน) แล้ว **ปืนพัง**
- **เกราะ Mark 42** (`characters/_mark42.js` — ระบบกลาง ไม่ใช่ตัวละคร · 25 เหรียญ · ระเบิด 2 · วีดีโอใส่/ใส่ให้/เรียกคืนเต็มครั้งแรกครั้งเดียวต่อผู้เล่น ระเบิดทุกครั้ง) ใครก็ใส่ได้
  - ใส่อยู่ = **เกราะชุด 7 เป็นชั้นแยก `p.mark42.armor`** ดักที่หัว `adjustIncomingDamage` (ทุกท่อ) + `damageSoft` + หัว `loseHp`/`loseArmor`
    (เส้นทางที่ข้ามท่อ) + `instantDeath` (สังหารทันที = ชุดพัง) — เลือด/เกราะจริงไม่ถูกแตะ จึงกลับร่างเดิมครบเมื่อถอด/พัง
    · **ห้ามใช้ `p.armor`** แทนชั้นนี้ (ค่าจริงต้องคงอยู่ข้างใต้) · หน้าจอแสดงเลือด 0/0 + เกราะชุด x/7 · พลังโจมตี +1 ที่ `computeAttackBase` · ภาพประจำตัวเป็นชุดเกราะ (`displayImg`)
  - เจ้าของ (`p.mark42Owned`) คุมชุดผ่าน socket `mark42Control` (recall / remove / detonate) — คนใส่ถอดเองไม่ได้ ·
    ใช้ไอเทมส่ง `mode` (`self` / `give` / `bomb`) ทาง `useInventoryItem` · วีดีโอก่อนแล้วผลเกิดหลังคลิป (`mark42Run` ใน `server/characterRules.js`)
  - ชุดพังจากการต่อสู้ = เจ้าของซื้อใหม่ไม่ได้ 10 เทิร์น (`p.mark42BuyLock`) · ระเบิด/ถอด/เรียกคืนไม่ติดคูลดาวน์ · มีได้ชุดเดียวต่อคน
  - เทสต์: [tests/mark42.test.js](tests/mark42.test.js) · ร้านค้า: [tests/shop.test.js](tests/shop.test.js)

---

## 10. กลางวัน/กลางคืน

- สลับทุก **5 เทิร์น** (`CYCLE_TURNS`) เริ่มเกมเป็นกลางวัน — `isNightRound(n)` (`server/dayNight.js`) · แบนเนอร์บอกทั้งสนามเมื่อช่วงเวลาเปลี่ยน
- **ทุกโหมดที่เหลือ (ffa/duo/trio) มีการเดินทาง** → ผลของภูมิภาค **แทน** กฎวัน/คืนเดิมทั้งหมด (ข้อ 10.1)
  กฎเดิมยังอยู่ในโค้ดเป็นค่า fallback เมื่อ `Journey.active()` เป็น false (ตอนนี้ไม่มีโหมดไหนเข้าทางนั้น):
  กลางวัน = จบเทิร์นแต้มสกิล +1 เฉพาะเช้าที่ 2, 4, 6, … (`morningBonusActive`) · กลางคืน = สุ่ม basic/secondary ของแต่ละคนแพงขึ้น +1 (`p.nightTaxTier`)
- **เกราะฟื้น +1 ทุกเทิร์นเลขคู่** เหมือนกันทั้งวัน/คืน (บล็อกโดย `decay`) — ภูมิภาค 5-7 ฟื้นทุกเทิร์น (`Journey.armorRegenDue`)
- `cycleShift` = ตัวเลื่อนวงจรทั้งเกม (`engine.setCycleShift` ใช้ในเทสต์ · ถูกเก็บในสแนปช็อต Overload Force) — ถ้าจะเลื่อนวงจร **ต้องคำนวณใหม่ตรงๆ ห้ามบวกสะสม** (บวกคงที่ทำให้เกิดวันแทรกกลางคืนสั้นๆ)

### 10.1 การเดินทาง 7 ภูมิภาค (ffa / duo / trio)

โมดูลกลาง [characters/_journey.js](characters/_journey.js) (require ตรงเหมือน `_mark42` — ไม่ใช่ตัวละคร) · เทสต์ [tests/journey.test.js](tests/journey.test.js)
- `Journey.active(engine)` = `gameMode` เป็น ffa/duo/trio (ทุกโหมดที่มีตอนนี้)
- ภูมิภาค = `areaOf(roundNumber)` เปลี่ยนทุก `AREA_TURNS` (10) เทิร์น ค้างที่ 7 ถาวร — **ไม่มี state แยก** Overload Force จึงย้อนภูมิภาคไปด้วยเอง
  กลางวัน/กลางคืนอ่านจาก `isNightRound()` (เทิร์น 1-5 ของภูมิภาคกลางวัน 6-10 กลางคืน)
- ผลของภูมิภาค **แทน** กฎวัน/คืนเดิม: `Journey.nightTaxOn()` (เหลือแค่ภูมิภาค 1 กลางคืน) · `Journey.skillBonus()` (1 กลางวันเทิร์นคู่ / 7 ทุกเทิร์น)
- จุดเสียบใน engine (ชื่อฟังก์ชันใน `_journey.js` → ที่เรียก):
  `skillTax` → `useSkill()` **และ** `showCost()` ใน `buildStateFor` (ต้องคิดเหมือนกัน — สกิลราคา 0 ไม่โดน) ·
  `skillMisses`/`skillRefund` → `useSkill()` ถัดจากด่านเหน็บชา (พลาด = คืนแต้ม+การ์ดราชินี แต่เสียโควตาเทิร์น · แม่นยำ = ไม่พลาด) ·
  `tryAttackMiss` → `doAttack()` หลังเนตรมณะ (แม่นยำเจาะได้) · `attackBonus` → `computeAttackBase()` (ungated) ·
  `applyCrit` → `doAttack()` หลังตัวปรับดาเมจทุกตัว (`extraPct` เผื่ออัตราคริจากแหล่งอื่น — ทอยครั้งเดียว ×2 ไม่คูณซ้อน · ตัวละครที่มีระบบคริเองอ่าน `engine.critBonusFor(p)`) ·
  `dotBonus` → `engine.journeyDotBonus()` ใน tick ลุกไหม้/เลือดไหล/พิษร้าย ·
  `filterShopRoll`/`shopStock` → `openShop()`/`refreshShopForJourney()` (ช่องหลายชิ้นใช้ `stock`/`stockMax` — `sold` เป็น true ตอนหมดช่องเท่านั้น) ·
  `goldBonus` + `onEndTurn` → `endTurn()` (หลังลูปลดเทิร์นสถานะ ก่อนกวาดคนตาย — สตั้น/ผุพังที่ติดจึงมีผลเต็มเทิร์นหน้า) · `armorRegenDue` → `dealRound()` ·
  `journeyGiftItem` (ทุ่งดอกไม้ กลางวัน) → `grantInventoryItem`
- ความเสียหายจากสนาม (`fieldDamage`) ลดเกราะก่อน + ท่อตายชุดเดียวกับพิษร้าย และตั้ง `_statusDamage`
- **ฉากเดินทาง** (5.1: บนลูกโลก — `client/src/oc/intro/MatchIntro.jsx` เปิดแมตช์+ดิ่ง, `RegionTravel.jsx` เปลี่ยนภูมิภาค): server พักเฟส CUTSCENE (ไม่มีคลิป) — `journeyScene` `{ seq, active, mode, area, fromArea }`
  · `start` = ต่อท้าย `gameIntroHoldSeconds()` ใน `startMatch()` (+`JOURNEY_START_SECONDS` 6 — client ดิ่งต่อจากฉากเปิดตัวที่ `onOutro`) · `advance` = `maybeJourneyAdvance()` ใน `server/phases/endTurn.js`
  ก่อนเทิร์นแรกของภูมิภาคใหม่ (+`JOURNEY_ADVANCE_SECONDS` 7) · เทสต์ที่ต้องการเทิร์น 1 ทันทีตั้ง env `JOURNEY_START_SECONDS=0`
  · `state.journey` (`Journey.publicInfo`) ระหว่างฉาก advance แสดงภูมิภาค **ปลายทาง** แล้ว (ฉากหลัง/เพลงเปลี่ยนใต้ฉากเดินทาง)
- เพลง: `journey_<area>_<day|night>` ใน `client/src/audio.js` (5.1 เลิกใช้เพลง `journey_map` ระหว่างฉากเดินทาง — เล่นเพลงภูมิภาคปลายทางทันที · เปิดแมตช์ยังเป็น `lobby5`) — ไฟล์อยู่ `client/public/journey/` (R2)

---

## 11. Overload Force

- แต้มสูงสุด **เสมอกัน** (2 คนขึ้นไป) → โรล 30% (`OVERLOAD_FORCE_CHANCE`) → `triggerOverloadForce()` (`server/overload.js`)
  - กันไม่ให้เกิด: เกิดไปแล้วในเทิร์นนี้ (`overloadForceActive`) · มีมุยมิติด "ดาบสะบั้น" ในสนาม (`muimi.blocksOverloadForce`)
  - เล่นคลิป `overload_force_start.mp4` (คัตซีน `kind: "overloadForce"` — บังคับเล่นแม้โหมดประหยัด) แล้ว `beginOverloadForceDraw()`
  - แจกไพ่ใหม่ **ในเทิร์นเดิม**, ปลดเพดาน 21 (ไม่มีการแตก — ยกเว้นคำสั่งไพ่แตกของมุยมิ), Joker = +12 ตายตัว, ปิดโชคลาภ · เพลง `overload_force`
  - โทษ: ทุกใบที่ 5 ที่จั่วหลังแต้มเกิน 21 → เสีย HP จริง 1 (`applyOverloadOverdrawPenalty` ผ่าน `loseHp` — Mark 42/เลือดชั่วคราวรับแทนได้)
- **ย้อนทั้งเทิร์นก่อนแจกไพ่ใหม่**: `captureTurnSnapshot()` (`structuredClone` ของ `players` + `roundSkills` + `shopItems` + `cycleShift`/`transformCounter`) ปลาย `dealRound()` ก่อนเข้าเฟสจั่วไพ่ ·
  `restoreTurnSnapshot()` เรียกเป็นอย่างแรกใน `triggerOverloadForce()`
  - คืนให้ครบ: แต้มสกิล, โควตา `skillUsedRound`, ไอเทม+เหรียญ, ดาเมจ/ดีบัฟที่ก่อในเทิร์นนั้น, ฟิลด์เฉพาะตัวละครบน `p` (เลขรอบคูลดาวน์ ฯลฯ), แม้แต่คนที่ตายไปแล้วก็ฟื้น
    (บั๊กเดิม: สกิลที่ทำงาน "หลังเปิดไพ่" ถูกล้างทิ้งพร้อมมือไพ่ = เสียแต้มกับสกิลฟรี)
  - **ไม่ย้อน** ข้อมูลการเชื่อมต่อ (`socketId`/`connected`/`sessionToken`/`ready`) และไม่ปลุกผู้เล่นที่ออกจากเกมกลางเทิร์น · สแนปช็อตใช้ได้ครั้งเดียว (ล้างทิ้งหลัง restore / ตอน `startMatch()` / กลับล็อบบี้)
  - ผลข้างเคียง: ฟิลด์ของตัวละครต้องเป็น plain data ที่ `structuredClone` ได้ (ห้ามเก็บฟังก์ชัน/อ้างอิงวน) ไม่งั้นสแนปช็อตเป็น `null` เงียบๆ
- เทสต์: [tests/overload-force.test.js](tests/overload-force.test.js) · [tests/overload-rollback.test.js](tests/overload-rollback.test.js)

## 12. โหมดทีม

`gameMode`: `ffa` | `duo` (2 คน/ทีม) | `trio` (3 คน/ทีม) | `pending` (ระหว่างโหวต)
- โหวตเลือกโหมด → `TEAM_SETUP` เลือกทีม A/B/C + ยืนยันครบ → `startMatch()` (ffa ข้าม `TEAM_SETUP`)
- `validGameMode`: ffa ≥ 1 คน · duo จำนวนคู่ ≥ 4 · trio 6 คนเป๊ะ — มี 7 คนในห้องจึงเหลือแค่ ffa
- `sameTeam(a,b)` กันเลือกเป็นเป้าโจมตี/เป้ากระสุน · `friendlyEffectBlocked(target)` กันเอฟเฟกต์ลบใส่พวกเดียวกัน (อิงต้นตอ `effectSourceId`)
- `isAlly(a,b)` (`server/lobby.js`) = "พวกเดียวกัน" สำหรับการมอบผลดี (ม่านแห่งราตรีของโอเบรอน) และ `teamReveal` (เพื่อนร่วมทีมเห็นแต้มกันตลอดใน `buildStateFor`)
- `withEffectSource(source, fn)` ตั้ง `effectSourceId` ให้ระบบรู้ว่าใครเป็นต้นตอ — **handler ที่ก่อเอฟเฟกต์ต้องห่อด้วยตัวนี้** ไม่งั้น friendly-fire check พัง (ดู [tests/team-friendly-fire.test.js](tests/team-friendly-fire.test.js))
  · `useSkill`/`doAttack` ห่อให้เอง · socket `useInventoryItem`/`mark42Control` ห่อที่ handler
- ชนะเมื่อเหลือทีมเดียว (`remainingTeamWinInfo` เรียกจาก `gameOver()` ใน `server/phases/endTurn.js`) · ffa เหลือคนสุดท้าย (หรือไม่เหลือใคร = เสมอ)

---

## 13. Socket protocol

**Client → Server** — event ระหว่างเกมผ่าน `onPlayerEvent()` (try/catch + rate-limit ต่อ event + แปลง socket เป็น `playerId`) ·
event ก่อนเข้าห้อง/การเชื่อมต่อใช้ `safeOn()` ตรงพร้อมโควตาของตัวเอง
```
safeOn:        reconnectSession {sessionToken}   reserve {position}   join {name,position,characterId,color}   leave   disconnect
ห้องรอ:        startGame   toggleReady   selectGameMode {mode}   modeBackToLobby   teamBackToMode
               chooseTeam {teamId}   confirmTeam {confirmed}   lobbyEmote {emoji,dir}
ในแมตช์:       hit   lock   useSkill {tier,targets}   attack {targetId}
               buyShopItem {itemId}   useInventoryItem {uid,cardIndex,color,targetId,mode}   mark42Control {action}
               qteKey {key}   qteTimeout
จบเกม:         backToLobby
```

**Server → Client**

| event | เนื้อหา |
|---|---|
| `state` | **snapshot ทั้งเกม ต่อผู้ชมแต่ละคน** — `buildStateFor(viewerId)` (`server/view.js`) ซ่อนไพ่/แต้มคนอื่นตอน PLAYING |
| `tick` | ตัวเลขเวลาที่เหลือทุกวินาที (state ตัวเต็มส่งทุก `RESYNC_EVERY` วิ) |
| `roster` / `positions` / `takenChars` | หน้า setup/lobby (ส่งตอนเชื่อมต่อ + `broadcastPositions()`) |
| `joined` / `reconnected` / `sessionExpired` / `sessionInUse` | session (`sessionToken`) |
| `positionTaken` / `full` / `inProgress` / `characterTaken` | ปฏิเสธการ `join` |
| `rateLimited` | ยิง event เกินโควตา (แจ้งครั้งแรกที่เกิน) |
| `skillFlash` | การ์ดสกิลเด้งบนกระดาน (ไม่หยุดเกม) |
| `transformNotice` | แจ้งแปลงร่าง/ใช้ท่าซ้ำ (ครั้งที่ 2+) |
| `sfx` | เสียงสั้นๆ (`engine.sfx`) |
| `lobbyEmote` | อีโมตบนลูกโลกในห้องรอ |

- ไม่มีระบบห้อง — **เกมเดียวทั้งเซิร์ฟเวอร์**, สูงสุด 7 คน (patch 2.8)
  - `POSITION_COLORS` มี 7 คีย์ = ที่นั่ง 1-7 (`POSITIONS` ฝั่ง client ตรงกัน) · `SLOTS` ใน `client/src/screens/Game.jsx` คือผังการ์ดผู้เล่นคนอื่น
    (index = จำนวนคนอื่น สูงสุด 6) ที่ต้อง **ไม่ทับกองการ์ดกลาง** (top 40% / left 45-55%)
- `playerId` แยกจาก `socket.id` → รีคอนเนกต์กลับมาเป็นคนเดิมได้ · ระหว่างแมตช์ผู้เล่นที่หลุดถูกพักไว้ไม่มีกำหนด ·
  ในห้องรอ/ก่อนเริ่มเกม ถูกลบเมื่อครบ `RECONNECT_GRACE_MS` (60s) · มีคนออกหรือหลุดก่อนเริ่มเกม = ย้อนกลับห้องรอ (`resetPregameFlowToLobby`)
- `buildStateFor` เป็นจุดเดียวที่ตัดสินว่าอะไรถูกซ่อน — เพิ่มฟิลด์ลับต้องระวังที่นี่ (`mine` = ของเจ้าตัวเท่านั้น)

---

## 14. Contract ของ character hook

```js
// characters/<id>.js
module.exports = {
  id: "<characterId>",                     // ต้องตรงกับ id ใน characters.js

  // ---- ฮุคกลาง: engine เรียกให้ทุกตัวละครอัตโนมัติถ้ามี (ไม่ต้องแก้ server/) ----
  canUseSkill(engine, p, tier, targets) { return true; },        // ด่านก่อนหักแต้ม (useSkill)
  ignoresTurnQuota(p, tier) { return false; },                   // กดได้แม้ใช้โควตาเทิร์นไปแล้ว
  skipsTurnQuota(p, tier) { return false; },                     // กดแล้วไม่กินโควตาเทิร์น
  applyInstantSkill(engine, p, tier, targets) { return ""; },    // ลงผลสกิล — คืนข้อความต่อท้ายป้าย skillFlash
  skillSound(p, tier) { return null; },                          // คีย์เสียงของป้าย skillFlash
  skillLocks(engine, p) { return undefined; },                   // ล็อก/คูลดาวน์รายช่อง → state.players[].skillLocks
  displayImg(p) { return null; },                                // ภาพบนสนาม (null = ภาพประจำตัว)
  damageBonus(engine, attacker, target, ctx) { return 0; },      // บวกพลังโจมตี (computeAttackBase) — ห้ามแก้ state
  attackBaseOverride(engine, attacker, target, ctx) { return 1; }, // แทนที่พลังโจมตีฐาน
  adjustIncomingDamage(engine, p, n, isNormalAttack, kind) { return n; }, // ปรับดาเมจขาเข้า (ไม่รวม damageSoft)
  onQteDone(engine, p, ok, qte) {},                              // ผล QTE (tag = id ตัวละคร)
  // hburnImmune / hburnHeals / hburnLabel · hbleedImmune / hbleedHeals / hbleedLabel / hbleedHarmless (ข้อ 7)

  // ---- ที่เหลือคือ method ที่ server/ เรียกเองแบบเจาะจง: CHAR_HOOKS.<id>.<method>(engine, ...) ----
  resetCombat(p) {},                       // ต้องเพิ่มการเรียกใน combat.resetCombat() เอง
};
```

**จุดที่ server เรียกตัวละครแบบเจาะจงตอนนี้** (ตัวละครใหม่ที่ต้องการจังหวะเดียวกันต้องเพิ่มบรรทัดเรียกเองที่จุดนั้น):
`muimi.forcedBust` (`bustedOf`) · `muimi.blocksOverloadForce` / `onAfterRoundScores` (`resolveRound`) · `muimi.onRoundStartAfterLoop` (หลังลูปของ `dealRound`) ·
`muimi.onAttackLanded` / `towerActive` / `IMG` (`doAttack`, `attackSoundOf`, `activeSkillMusic`) · `muimi.onUltExpire` (ลูปลดเทิร์นของ `endTurn`) ·
`oberon_summer.onRoundStartTick` (ลูปของ `dealRound`) · `oberon_summer.atkBonus`/`atkFx` (`computeAttackBase`/`doAttack`) · `oberon_summer.onEndTurn` (`endTurn`) ·
`resetCombat` ทั้งสองตัว (`combat.resetCombat`) · ฟิลด์ `muimi*` ใน `newPlayerRecord` (`server/socket.js`) และ `buildStateFor`

**กฎเหล็ก**
1. เข้าถึง state ผ่าน `engine.*` เท่านั้น (`engine.log`, `engine.healHp`, `engine.dealMixed`, `engine.players`, …)
2. อ่านค่าของแมตช์ผ่าน getter (`engine.roundNumber`) — เขียนผ่าน setter (`engine.setRoundNumber`)
3. ค่าคงที่เฉพาะตัวละครเก็บในไฟล์ตัวเอง (`server/constants.js` มีแต่ค่ากลาง)
4. ตัวละครใหม่ = เพิ่ม data ใน `characters.js` + ไฟล์ใน `characters/` + `require`+push ใน `characters/index.js` (ขั้นตอนเต็ม: skill `add-character`)

---

## 15. Gotchas ที่ควรจำก่อนแก้โค้ด

1. **`dealRound()` ล้าง `cutsceneQueue`** — คิววีดีโอไว้ก่อนบรรทัดนั้น = หาย
2. **ลูปลดเทิร์นสถานะใน `endTurn()`** — status key ใหม่ที่ไม่ควรลดเทิร์นต้องเพิ่ม `continue;` เอง ไม่งั้นหายเงียบ; ตรงข้าม key ที่ `continue` แล้วไม่มีใครลบทิ้ง = ค้างถาวรทั้งแมตช์
3. **โรลโอกาสต้องอยู่ที่จุดตัดสินจริง** — ถ้าโรลทีหลังจุดที่สุ่มผู้ชนะจากการเสมอไปแล้ว (เช่นใน `afterSummary()`) โอกาสจริงจะถูกหารด้วยจำนวนคนที่เสมอ → โรลใน `resolveRound()`
4. **`withEffectSource`** ต้องห่อทุก handler ที่ก่อเอฟเฟกต์ ไม่งั้น friendly-fire / แหล่งที่มาดาเมจพัง · callback หลังวีดีโอ (`pausePlayingForCutscene(after)`) ต้องห่อซ้ำ
   · กลับกัน ผลเสียที่ **ตั้งใจ** ให้ลงเพื่อนร่วมทีมได้ (นกจาบยามเช้า) ต้อง **ไม่** มีต้นตอ
5. **ห้ามแก้ `p.hp` / `p.armor` / `p.statuses.evade` ตรงๆ** — ใช้ primitive ที่ให้ไว้ (Mark 42 / เลือดชั่วคราว / mirror ผูกอยู่) · ข้อยกเว้นที่มีอยู่: หลับไหลหักเลือดตรง (ค้างที่ 1)
6. **`isNormalAttack`** ให้ `true` เฉพาะจาก `doAttack()` เท่านั้น
7. **`p.seen[key]` vs `p.cutsceneShown[key]`** — อันแรกกันเอฟเฟกต์ afterReveal ทำงานซ้ำ (ล้างเมื่อสถานะหมด) อันหลังกันวีดีโอเล่นซ้ำทั้งเกม คนละเรื่องกัน
8. `process.on("uncaughtException")` ใน `server.js` เป็น **ตาข่ายสำรอง** (ติดตั้งเฉพาะตอนรันเป็น main — ตอนเทสต์ require ต้องให้ error ระเบิดออกมา) ไม่ใช่ที่จัดการ error — handler ต้อง try/catch เอง (`safeOn`/`onPlayerEvent` ทำให้แล้ว)
9. ไฟล์สื่อ (รูป/วีดีโอ/เพลง) ไม่ track ใน git — ไม่มีไฟล์ในเครื่อง client จะ fallback เป็นอีโมจิ (`client/src/data/avatars.js`)
10. **ตัวละคร `unique`** (ตอนนี้ไม่มีตัวไหนตั้งไว้ — มุยมิ/โอเบรอนเลือกซ้ำได้) กันซ้ำ **2 ชั้น**: handler `join` ตอบ `characterTaken` และหน้าเลือกตัวละคร
    ปิดการ์ดจาก event `takenChars` — ตัว unique ใหม่แค่ใส่ `unique: true` ใน `characters.js` · ตัวที่เลือกซ้ำได้ต้องเก็บสถานะแยกต่อผู้เล่น (`duplicate-safety.test.js`)
11. `resetCombat(p)` (`server/combat.js`) คือรายการฟิลด์ผู้เล่นทั้งหมด — **ฟิลด์ใหม่ของตัวละครต้องรีเซ็ตที่นี่** (และใส่ค่าเริ่มใน `newPlayerRecord`) ไม่งั้นค้างข้ามแมตช์
12. **ราคาบนปุ่ม = ราคาที่หักจริง** — แก้สูตรราคาใน `useSkill` ต้องแก้ `showCost()` ใน `buildStateFor` ด้วยเสมอ (และกลับกัน)
13. **ผลที่ "ต้องรอวีดีโอจบก่อน"** ใช้ `pausePlayingForCutscene(after)` ระหว่าง PLAYING — ลงผลก่อนแล้วค่อยเล่นคลิป ผู้เล่นจะเห็นเลือดลดก่อนวีดีโอ

---

## 16. เทสต์

```bash
npm test    # node --test "tests/**/*.test.js"
```
- `server.integration.test.js` — spawn server จริงแล้วต่อด้วย socket.io-client (port 32000 + pid%1000)
- `computeAttackBase.test.js` — `require("../server.js").computeAttackBase` ตรงๆ (server ไม่ listen เมื่อไม่ใช่ main module)
- `tests/characters/*.test.js` — ทดสอบ hook รายตัวละคร (`muimi`, `oberon_summer`, `duplicate-safety`) ผ่าน `engine` จริงจาก `server.js` หรือ mock
- อยากเทสต์ฟังก์ชันใหม่ใน server/ ต้องเพิ่มเข้า `module.exports` ท้าย `server.js` ก่อน (เช่น `resolveRound: summary.resolveRound`) หรือเปิดผ่าน `engine.*`
- เทสต์ที่ค้นข้อความในโค้ดฝั่ง server ใช้ `serverSource()` จาก `tests/serverSource.js` (อ่าน server.js + server/ ทั้งหมด)
- ระบบกลางที่มีเทสต์แยก: `journey` · `mark42` · `shop` · `spellburden` · `overload-force` / `overload-rollback` · `team-friendly-fire` / `team-reveal` / `support-team-targets` · `audio-policy` / `audio-volume` · `sceneQueue` / `phaseSceneTiming`
