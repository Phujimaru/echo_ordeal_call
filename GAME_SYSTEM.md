# GAME_SYSTEM.md — คู่มือระบบเกม ECHO (เอกสารอ้างอิงภายในสำหรับ AI/ผู้พัฒนา)

> เอกสารนี้อธิบาย **การทำงานจริงของ engine** ไม่ใช่วิธีติดตั้ง/รัน (ดู [README.md](README.md))
> อ้างอิงด้วยชื่อไฟล์/ชื่อฟังก์ชัน ไม่ใช้เลขบรรทัด — ค้นด้วยชื่อฟังก์ชันได้เสมอ · ตรวจกับโค้ดล่าสุดหลังย้ายจากโปรเจกต์เดิม
> (ตัวละครที่มี: รายการใน `characters/index.js` (`CHAR_HOOKS.MODULES`) — มุยมิ · โอเบรอน (ฤดูร้อน) · นักบินปริศนา · Echo · โซระ · ไรโด ฮิคารุ · Ice Spike · เคท & เอมิลิโกะ · โหมด: ffa / duo / trio)
>
> **ระบบกระดานเดินได้ (แบบ Fire Emblem)** — กติกาที่ผู้ใช้ตัดสินอยู่ที่ [GRID_PLAN.md](GRID_PLAN.md) · ลงครบแล้ว:
> กระดาน + ช่องพิเศษ `server/board.js` · วงจรเทิร์น ORDER/ACTION `server/phases/action.js` (§2–§3) · ระยะสกิล (`area`) ·
> ร้านค้าบนแผนที่ + กระเป๋า 5 ช่อง + ระยะปืน GUTS / Mark 42 (§9) · หน้าจอกระดานฝั่ง client (§17) · ห่วงเวลาซีโร่ (§18) · **Overload Force ถอดออกแล้ว — ห้ามมี**

---

## 1. ภาพรวมสถาปัตยกรรม

```
server.js                        จุดเริ่ม: ตาข่าย error (เฉพาะตอนรันเป็น main) + require server/socket + export ให้เทสต์ + listen
server/                          เอนจินกลางทั้งหมด แยกตามระบบ (ตารางด้านล่าง)
characters.js                    DATA ล้วน — roster/ชื่อสกิล/desc/cost/img + POSITION_COLORS + publicRoster()
characters/index.js              มัดรวม CHAR_HOOKS = { [characterId]: module } — ตัวละครใหม่ต้อง require+push ที่นี่
characters/<id>.js               LOGIC ของตัวละครนั้น (หนึ่งไฟล์ต่อตัว — รายชื่อใน characters/index.js) — export { id, ...methods(engine, ...) }
characters/_universal_status.js  บัฟ/ดีบัฟกลาง (ส่วนใหญ่ pure function — tick* ที่ต้องลงดาเมจรับ engine เป็นพารามิเตอร์)
characters/_transforms.js        ตาราง metadata คัตซีน (TRANSFORMS) — data ล้วน
characters/_mark42.js            เกราะ Mark 42 (ไอเทมร้านค้า) — ระบบกลาง ไม่ใช่ตัวละคร (ไม่อยู่ใน CHAR_HOOKS, require ตรง)
characters/_journey.js           การเดินทาง 7 ภูมิภาค — ระบบกลาง ไม่ใช่ตัวละคร (require ตรง)
client/src/                      React (Vite): App.jsx คุมฉาก, screens/Game.jsx = HUD + modal (จอคอมวาดกระดานผ่าน board/BoardStage.jsx — §17)
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
| `match.js` | **สถานะของแมตช์** (เดิมเป็น `let` ระดับไฟล์): `players`, `gameState`, `gameMode`, `roundNumber`, `timeLeft`, `centralDeck`, `lastLog`, `cutsceneQueue`, `shopItems`, `shopPos`, `journeyScene`, `zero`/`zeroUsed`/`zeroFrozen`/`zeroScene` (§18) … |
| `engine.js` | `engine` object |
| `lobby.js` | สี/ตำแหน่ง/จองที่นั่ง, โหวตโหมด (`modeOptionsFor`, `voteGameMode`), จัดทีม, `checkLobbyReady`, `startSoloTest`, `startMatch`, `backToLobby`, `relayLobbyEmote`, `remainingTeamWinInfo` |
| `timers.js` | `startPhaseTimer`/`clearPhaseTimer`, `cardPhaseSeconds` (= `CARD_TIME` เสมอ) |
| `deck.js` | กองกลาง 43 ใบ, `drawFromCentralDeck`, `drawCardFor`, `drawInitialCard`, `calculateScore`, `scoreCap`, `scoreOf`, `bustedOf`, ทริกเกอร์สีการ์ด/การ์ดพิเศษ (`onCardDrawn`, `applyLockColorTriggers`) |
| `combat.js` | `maxHpOf`/`maxArmorOf`/`maxSkillOf`, `healHp`/`healArmor`/`healOverflow`, `loseHp`/`loseArmor`, `damageSoft`, `dealDirect`/`dealMixed`/`dealArmorOnly`, `adjustIncomingDamage` (ภายใน), `instantDeath`, บัฟ/ดีบัฟ wrapper, `sameTeam`/`friendlyEffectBlocked`/`withEffectSource`, `addSkill`, `voidUltimateOnBust`, `resetCombat` |
| `skills.js` | `useSkill` — ด่านเช็ค/คิดราคา/หักแต้ม แล้วเรียก hook ของตัวละคร |
| `shop.js` | เหรียญ (`addGold`), ร้านค้ามายาบนแผนที่ (`maybeMoveShop`/`relocateShop`, `openShop`, `refreshShopForJourney`, `buyShopItem`), กระเป๋า (`bagFull`, `dropItem`, `grantInventoryItem`), ไอเทม (`useInventoryItem`), ปืน GUTS (`fireGuts`, `gutsFireTargetOf`, `applyGutsBullet`) |
| `visibility.js` | **ใครมองเห็นใคร** (พุ่มหญ้า GRID_PLAN §3.3 + ล่องหนของตัวละคร §7.5): `hiddenFrom(viewer, target)`, `concealed`, `exposeBush`, `onHostileAct` (ตี/ยิง/ไอเทมใส่คนอื่น), `onAreaHit` (สกิล `area.hostile`), `onBump` (เดินชน), `filterLog` (+ `markTurn` ต้นตาเดิน: บรรทัดที่ฝ่ายผู้ตีก่อเองก่อนเป้าปรากฏตัว ฝ่ายนั้นยังเห็น), `hiddenFromUnit` (เล็งจากตาตัวที่ลงมือ — ม่านแดง) · ผู้ใช้: `view` (pos null/เส้นทาง/บันทึก/คาดการณ์ · มองไม่เห็น = `unseenPub` ซ่อนเลือด/เกราะ/แต้ม/สถานะ/ฟิลด์เฉพาะตัวด้วย), `action.moveTo` (หยุดก่อนชน), `action.attackTarget`/`resolveArea`, `shop` (ปืน/Mark 42), `skills` |
| `view.js` | `displayImg`, `buildStateFor`, `broadcastState`, `broadcastPositions`, `takenUniqueChars` (`activeSkillMusic` ภายใน) |
| `cutscene.js` | `triggerCutscene`, `queueCutscene`, `notifyTransform`, `pausePlayingForCutscene`, `runCutsceneQueue` |
| `qte.js` | QTE กลาง (`startQte`, `qteKey`, `qteTimeout`, `finishQte`, `qtePending`, `sweepQte`) |
| `dayNight.js` | `isNightRound`, `morningBonusActive` |
| `ice.js` | **น้ำแข็ง/หนามน้ำแข็ง/ไถล/ผลัก/เชื่องช้า** (§19 · Ice Spike + น้ำแข็งภูมิภาค VI): ชั้นที่สร้างระหว่างเกม (`layIce`/`undoLay`, `placeSpike`/`raiseSpike`/`lowerSpike`/`damageSpike`, `overlayOf`, `publicInfo`), `resolveEntry` (ไถล+ชน), `pushUnit`, `applySlow`, ตีหนาม (`attackSpike`, `hitSpikesInArea`), ระเบิดสะสมดาเมจ (`noteHurt`/`flushBursts`), หนามทั้งสนาม +1 Lv (`raiseAllSpikes`), `onEndTurn` |
| `zeroTime.js` | **ห่วงเวลาซีโร่** (§18): `maybeEnter`/`enter`, `onRoundStart`/`onEndTurn`, `worldRound` (เวลาโลก), `attackBonus`, `ultLocked`, ผนึก (`sealIndexOf`, `canHitSeal`, `attackSeal`, `hitSealsInArea`, `hasPendingBreak`/`runPendingBreak`), `collectPickup`, `publicInfo`, `reset` |
| `characterRules.js` | กติกากลางที่ระบบเรียกตรง: `hasKillCapability` (เนตรมณะ), `ultNameOfStatus`, เกราะ Mark 42 (`mark42Run`, `mark42Control`) |
| `socket.js` | `io.on('connection')` + handler ทุก event (`safeOn`/`onPlayerEvent`), session/reconnect, `newPlayerRecord` |
| `phases/draw.js` | `dealRound`, `hit`, `lock`, `checkAllLocked` |
| `board.js` | **กระดาน (ฟังก์ชันล้วน)**: แผนที่ภูมิภาค I–VII (`MAPS`, `mapOf`) + ช่องพิเศษ (`TERRAIN_INFO`, `specialAt`, `moveCost`, `terrainEvade`, `terrainAtk`, `tileInfo`, `endTurnTile`), เดินแบบมีค่าเดิน/ทรายดูด/น้ำแข็ง (`reachable`/`pathTo`), ระยะ (`tilesInRange`/`aoeTiles`/`lineTiles`), `attackTargets`, `canCounter`, `pushback`, `threatZone`, `assignSpawns`, `pickShopSpot`, `nearShop` · **client ใช้สำเนาที่สร้างอัตโนมัติ** `client/src/board/boardRules.js` (`node scripts/gen-board-rules.js` — เทสต์ `board-rules-sync` ฟ้องถ้าไม่ตรง) |
| `phases/summary.js` | `resolveRound` (เปิดไพ่), `afterResolve` (คัตซีนหลังเปิดไพ่ → `action.beginOrder`) |
| `phases/action.js` | **ลำดับเดิน + ตาเดิน**: `placeOnBoard`, `turnOrderOf`, `beginOrder`, `nextActor`, `canAct`, `lockMove`, `lockStrike`, `moveTo`, `undoMove`, `attackTarget`, `waitAction`, `finishActor`, `movOf`/`baseMovOf`/`rangeOf` |
| `phases/attack.js` | `attackableTargets`, `computeAttackBase`, `estimateAttackOn`, `strike` (ตี 1 ครั้ง), `boardAttack` (ตี → สวน → ถอย), `doAttack` (ตี 1 ครั้งไม่มีกระดาน), `attackSoundOf` |
| `phases/endTurn.js` | `endTurn` + `gameOver()` (ตัดสินจบเกม) + `maybeJourneyAdvance()` (ฉากเปลี่ยนภูมิภาค — ใช้ภายในไฟล์) + `journeyRebirth()` (ท่าไม้ตาย Echo ก่อกำเนิดใหม่ — `engine.journeyRebirth`) |

**กติกาเวลาแก้โค้ดใน server/**
- สถานะแมตช์อ่าน/เขียนผ่าน `match.<ชื่อ>` เสมอ (`match.gameState = "ACTION"`) — ห้าม destructure ออกมาเก็บ ค่าจะไม่อัปเดต
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
LOBBY → TEAM_MODE → (duo/trio: TEAM_SETUP) → CUTSCENE (ฉากเปิดแมตช์ + การเดินทางเริ่ม) → PLAYING (จั่ว/พอ)
      → ORDER (ลำดับเดิน) → ACTION ⇄ ATTACKING / CUTSCENE (ตาเดินทีละคน) → TRANSITION (หรือ CUTSCENE ฉากเปลี่ยนภูมิภาค / ฉากเข้าห่วงเวลาซีโร่)
      → (วน PLAYING) → GAMEOVER → LOBBY
```

| state | ความหมาย | timer |
|---|---|---|
| `LOBBY` | ห้องรอ กดพร้อม — ทุกคนพร้อม (1 คนก็ได้ = เล่นทดสอบคนเดียว) → `enterModeSelect()` · ปุ่ม "เล่นคนเดียว" = socket `startGame` (`startSoloTest`) | – |
| `TEAM_MODE` | โหวตโหมด ffa / duo / trio (ปุ่มเทาเมื่อจำนวนคนไม่ผ่าน `validGameMode`) · โหวตครบและมีอันดับหนึ่งเดี่ยว → `startTeamSetup` (ffa เข้า `startMatch` ทันที) · `modeBackToLobby` ถอยกลับห้องรอ | – |
| `TEAM_SETUP` | เลือกทีม A/B/C + ยืนยัน — ทีมเต็มครบและยืนยันหมด → `startMatch()` · `teamBackToMode` ถอยกลับ | – |
| `PLAYING` | เฟสจั่วไพ่ — **จั่ว/พอ เท่านั้น** (สกิล/ไอเทม/ร้านค้าย้ายไปตาเดิน) | `cardPhaseSeconds()` = `CARD_TIME` 60s |
| `CUTSCENE` | เล่นวีดีโอในคิว (พัก state เดิมไว้) **หรือ** พักเกมให้ client เล่นฉากที่ไม่มีคลิป (`cutsceneInfo = null`): ฉากเปิดแมตช์ `gameIntroHoldSeconds() + JOURNEY_START_SECONDS` · ฉากเปลี่ยนภูมิภาค `JOURNEY_ADVANCE_SECONDS` · ฉากโลกแตกของ Echo `REBIRTH_SECONDS` 18 (ในตาเดินของ Echo — จบฉากแล้ว `finishActor`) · ห่วงเวลาซีโร่ `match.zeroScene` (เข้า 8.5 · ผนึกแตก 3.6 · ปลดผนึก 5 — §18) | ตาม `seconds` ของแต่ละคลิป/ฉาก |
| `ORDER` | เปิดแต้มแล้วเรียงลำดับเดิน (`match.turnOrder`) · คนแรกได้เหรียญ +1 | `ORDER_TIME` 6.5s (`ORDER_TIME_MS` 6500) → `nextActor` |
| `ACTION` | ตาเดินของ `match.actorId`: เดิน 1 ครั้ง (ย้อนได้) · สกิล/ไอเทม/ซื้อของ (ทำแล้วเดินไม่ได้อีก) · โจมตีหรือ "รอ" = จบตา | `ACTION_TIME` 60s → `finishActor` |
| `ATTACKING` | ฉากตี/ตีสวน/ถอย ของคนที่กำลังเดิน (`state.attack` = `lastAttack` มี `counter`/`push`) แล้ว `runCutsceneQueue(finishActor)` | `ATTACKFX_TIME` 3s (+2 มีป้ายสกิล · +2 มีตีสวน) |
| `TRANSITION` | แบนเนอร์ "รอบที่ N" | `TRANSITION_TIME` 3s |
| `GAMEOVER` | ประกาศผู้ชนะสุดท้าย (socket `backToLobby` กลับห้องรอ) | – |

`startPhaseTimer(seconds, onExpire)` (`server/timers.js`) มีตัวเดียวทั้งเกม — ต้อง `clearPhaseTimer()` ทุกครั้งที่เปลี่ยนเฟส
· ระหว่างนับถอยหลังส่ง event `tick` (ตัวเลขอย่างเดียว) และ broadcast `state` ตัวเต็มทุก `RESYNC_EVERY` (10) วิ เป็นตาข่าย

---

## 3. วงจร 1 รอบ (call chain ที่ต้องจำ)

```
dealRound()            phases/draw.js    เริ่มรอบ: roundNumber++ (ห่วงเวลาซีโร่: zeroFrozen++ ด้วย), สับเด็คใหม่, ล้าง cutsceneQueue/lastLog/roundSkills,
                                         shop.maybeMoveShop(): ร้านตั้ง/ย้ายจุดทุก 6 เทิร์น (ไม่งั้น refreshShopForJourney) — ข้ามระหว่างห่วงเวลา
                                         ลูปต่อผู้เล่น: ภาษีกลางคืน → broadcastHook("onRoundStartTick") (ทุกตัวละครตาม CHAR_HOOKS.MODULES) → oblada/energy → ฟื้นเกราะ (ห่วงเวลา = ไม่ฟื้น)
                                         → awaken/passive roundStart → tickBurn/tickBleed/tickPoison/tickShock → แจกไพ่ใบแรก
                                         → หลับไหล → tickMend → Gargorgon → สตั้น
                                         หลังลูป: Zero.onRoundStart() (ของฟื้นพลังชีวิต · ฟ้าผ่าเฟส 4) → PLAYING (+ เล่นคิวคัตซีนถ้ามี)
   ↓ (ผู้เล่นกด)
hit(id)                phases/draw.js    จั่ว 1 ใบ (เช็ค nodraw/เพดานแต้ม/โชคลาภ/สภาพชา) → checkAllLocked()
lock(id)               phases/draw.js    "เปิดไพ่" = พร้อม — ยิง applyLockColorTriggers() ก่อนล็อก
   ↓
checkAllLocked()       phases/draw.js    ผู้รอดทุกคน locked && ไม่มี QTE ค้าง → resolveRound()
resolveRound()         phases/summary.js ล็อกทุกคน → sweepQte() → (ไม่มีผู้ชนะ/ผู้แพ้ · แต้มต่ำสุดไม่เสียเลือด) → afterResolve()
afterResolve()         phases/summary.js คัตซีน afterReveal ที่ค้าง (TRANSFORMS) → runCutsceneQueue(action.beginOrder)
beginOrder()           phases/action.js  turnOrderOf(): แต้มมากก่อน · เท่ากันสุ่ม · ไพ่แตกท้ายแถว → คนแรกเหรียญ +1 → ORDER 6.5s → nextActor
nextActor()            phases/action.js  คนถัดไปในแถว (ข้ามคนตาย/สตั้น/หลับ) → ACTION 60s · หมดแถว → endTurn()
   ↓ (คนที่กำลังเดินกด — ทุกอย่างเช็ค canAct(p))
moveTo / undoMove      phases/action.js  BFS ใน board.js (เดิน movOf(p) = mov − ไพ่แตก) · ย้อนได้จนกว่า action.locked
                                         · ทุกการเดินคิดจาก action.from บน startMap() (ถอดน้ำแข็ง/ของพังจากการเดินตานี้ — walkUndoPatch)
                                         · เดินแล้วคลิกใหม่ = rewindWalk แล้วเดินใหม่จากจุดเริ่ม · คีย์บอร์ด = Board.stepPath (ลูกศร FE ต่อ action.trail)
useSkill / useInventoryItem / buyShopItem / mark42Control   ทำแล้ว lockMove(p) = เดินไม่ได้อีก
attackTarget(id,t)     phases/action.js  เป้าในระยะ rangeOf(p) → attack.boardAttack(): strike → (เป้ารอด+ตีถึง) ตีสวน
                                         → pushback ถอย 1 ช่อง/ชน −1 → ATTACKING → runCutsceneQueue(finishActor)
                                         · เป้า "seal:N" = Zero.attackSeal() (ฉากตี → ฉากผนึกแตก/ปลดผนึก → finishActor)
waitAction / หมดเวลา    phases/action.js  finishActor(): จุดฟื้นฟู +1 → tileEndEffect → Zero.collectPickup → nextActor()
endTurn()              phases/endTurn.js ลดเทิร์นสถานะทั้งหมด, แต้มสกิล+เหรียญ, Journey.onEndTurn, Zero.onEndTurn, broadcastHook("onEndTurn"),
                                         กวาดคนเลือดหมด (หายจากกระดาน) → runCutsceneQueue → gameOver() / maybeJourneyAdvance()
                                         (เปลี่ยนภูมิภาค = placeOnBoard แผนที่ใหม่) / Zero.maybeEnter() (ฉากเข้า → dealRound)
                                         / TRANSITION → dealRound()
```

**จุดพลาดที่เจอบ่อย**: `dealRound()` ล้าง `cutsceneQueue` ทิ้ง — โค้ดที่คิววีดีโอไว้ต้องอยู่ **หลัง** บรรทัดนั้นเสมอ

---

## 4. การ์ดและแต้ม

- **กองกลางร่วม 43 ใบ** สับใหม่ทุกรอบใน `dealRound()` (ทุกคนจั่วจากกองเดียวกัน — ไพ่หมดกอง = จั่วไม่ได้)
  - เลข 1–10 × 4 สี (red/blue/green/yellow) = 40 ใบ + `king` + `queen` + `joker`
  - `state.deckLedger` = การ์ดทั้ง 43 ใบตามลำดับคงที่ + ใบไหนถูกจั่วไปแล้วในรอบนี้ (กดกองกลางเพื่อดู)
- `drawFromCentralDeck(predicate)` (`server/deck.js`) — สุ่มจาก index ที่ผ่าน predicate (ใช้ทำ "โชคลาภ")
- `drawInitialCard()` ห้ามได้การ์ดพิเศษ
- **การ์ดพิเศษ**: King = เหรียญ +10 ทันที (ผ่าน `addGold`) · Queen = `freecast` ใช้สกิลฟรี 1 ครั้ง (หายจบเทิร์น) · Joker = `+min(12, 21-base)`
- **ทริกเกอร์สี ครบ 3 ใบ/ชุด**
  - 🔵 ฟ้า → ทำงาน **ทันทีตอนจั่ว** (`checkBlueTrigger`): ต้านสถานะผิดปกติ 1 เทิร์น
  - 🔴 แดง / 🟢 เขียว / 🟡 เหลือง → ประเมิน **ตอนกด lock** (`applyLockColorTriggers`): แดง = ATK รอบนี้ +n (`statusAmt.cardAtkBonus`) · เขียว = ฟื้นเลือด +n · เหลือง = แต้มสกิล +2n
- **แต้ม**: `calculateScore()` (raw) → `scoreOf(p)` → `bustedOf(p)`
- **เพดาน** `scoreCap(p)`: 21 (แต้มถึงเพดาน = ปุ่มจั่วปิด `atCap`)
- **ตอนนี้ไม่มีความสามารถที่ทำให้ไพ่แตก** (ผู้ใช้ตัดสิน — GRID_PLAN §7) · `bustedOf(p)` = แต้มเกิน 21
- **ไพ่แตกแล้วไม่ล็อกอัตโนมัติ** — ยังกดสกิล/ไอเทมได้จนกว่าจะกดเปิดไพ่เอง แต่ท่าไม้ตายแบบ afterReveal ที่กดไปเป็นโมฆะ (`voidUltimateOnBust` ใน `server/combat.js`)

---

## 5. ท่อความเสียหาย (สำคัญที่สุด)

**ค่าคงที่ฐาน**: `MAX_HP = 7` · `MAX_ARMOR = 3` · `MAX_SKILL = 8` · `MAX_PLAYERS = 7` (patch 2.8)
(`maxHpOf`/`maxArmorOf`/`maxSkillOf` คืนค่าคงที่ทุกคน — ตัวละครที่มีเพดานต่างออกไปต้องเพิ่มเงื่อนไขในฟังก์ชันเหล่านี้)

**ลำดับการรับดาเมจ**: เกราะ Mark 42 (ถ้าใส่อยู่) → `shield` (กันครั้ง) → ชั้นของตัวละคร (ฮุค `absorbDamage` — ไจโร: ม้าวาลคิรี · §23) → `armor` (เกราะ) → `tempHp` (เลือดชั่วคราว) → `hp` (เลือดจริง) — hp ถึง 0 = ตกรอบ
· ชั้นของตัวละครอยู่ใน `dealMixed` / `dealArmorOnly` / `damageSoft` · `dealDirect` (ทะลุเกราะ) ข้ามชั้นนี้

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

**ไม่มีดาเมจแพ้รอบแล้ว** — แต้มใช้จัดลำดับเดินเท่านั้น (GRID_PLAN §10)
**ตีบนกระดาน** (`boardAttack`): `strike` (ท่อข้างบน — เลือดหมดตกรอบทันที) → ถ้าเป้ารอดและผู้ตีอยู่ใน `rangeOf(เป้า)` → `strike` ตีสวน
→ ผู้ตีถอย `Board.pushback` 1 ช่อง (ทางตัน = ไม่ขยับ + `dealMixed` 1 "ชน −1") · `doAttack(by, target)` = ตี 1 ครั้งไม่มีกระดาน (เทสต์/โค้ดตัวละคร)
· หลังตี/ตีสวนแต่ละครั้ง (ก่อนถอย/ผลัก): ฮุค `onStrikeResolved` ของผู้ตี · ผู้สวนมีฮุค `counterPush` = กำหนดการถอยเอง (ไม่ถอยซ้อน) · ฟังก์ชันจาก `afterBoardAttack` คืนตัวเลข = พักฉากอีกกี่วินาทีก่อนจบตา (§23)

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
   · `hook.endsTurn(engine, p, tier, opts)` = ใช้แล้วจบตาเดินทันทีหลังผลลงครบ (รวมผลหลังคลิป/`skillBeat`) — `finishActor` แทนการกลับเข้าตา (มุยมิ: ท่าไม้ตาย)
6. หักแต้ม → `tickCurseOnSkill` (คำสาป) → `numbFizzles` (เหน็บชา 30% ไม่ทำงาน — แต้ม/โควตาเสียแล้ว) →
   `Journey.skillMisses` (ป่าไม้ต้องสาป กลางวัน: คืนแต้ม แต่โควตาเสีย) → `Journey.skillRefund` (ทะเลทราย กลางคืน)
7. `hook.applyInstantSkill(engine, p, tier, targets)` ลงผล — คืนข้อความต่อท้ายป้ายเด้ง · แล้ว `applyEffect(skill.effect)` (ตัวละครปัจจุบัน `effect: null` ทั้งหมด)
8. `skill.instant` → `skillFlash` (เสียงจาก `hook.skillSound(p, tier)`) · บันทึก `roundSkills` · เช็คไพ่แตก → `voidUltimateOnBust`
9. มีคัตซีนในคิว → `pausePlayingForCutscene()` (เล่นแล้วกลับมาตาเดินต่อ (เฟส ACTION) ด้วยเวลาที่เหลือ)

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
- **เปิดไพ่ / ไพ่แตก / โดนโจมตี ไม่ได้แต้มสกิล** — ไม่มี `addSkill` ใน `resolveRound()`/`strike()`
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
  · ไม่นับเป็นการใช้สกิล (`ignoresTurnQuota` + `skipsTurnQuota` — ฟังก์ชันเดียวกัน) · ปุ่มฝั่ง client แสดงจำนวนครั้งจาก `muimiEmergencyUses`/`muimiEmergencyMax` (`ammo: 2` = `EMERGENCY_USES` — เทสต์เช็คให้ตรงกัน)
- **ดาบสนิม** (secondary · 4): สถานะ `muimiRusty` ("ดาบเก่าๆ") 3 เทิร์น — ตีปกติโดนแล้วฟื้นเลือด 1 + แต้มสกิล 1 (`onAttackLanded`) · ระหว่าง "ดาบสะบั้น" = 4 แต้ม คลื่นดาบแนว 4×3 พลังโจมตี +1 (ดาเมจ 2) ไม่ได้สถานะเพิ่ม (`skillArea`/`skillCost` — GRID_PLAN §7.3)
- **ดาบสะบั้นหอคอยสวรรค์** (ultimate · 8): `muimiTower` ("ดาบสะบั้น") 2 เทิร์น + ต้านสถานะ 3 เทิร์น
  - **ใช้แล้วจบตาเดินทันที** หลังคลื่นดาบลง (ฮุค `endsTurn` — เนิฟ 2026-10-19 กันคอมโบประชิด คลื่นดาบ + ตีปกติในตาเดียว)
  - ผล "ศัตรูไพ่แตก" ถูกตัดแล้ว → คลื่นดาบแนว 4×3 (GRID_PLAN §7.3) ลงผลหลังวีดีโอผ่าน `engine.skillStrike` ·
    พลังโจมตีของคลื่น +3 (`WAVE_ATK_BONUS` — ฐาน 1 + 3 = 4) แยกจากโบนัสตีปกติ (`damageBonus` อ่าน `p.muimiWave` ที่ `swordWave` ตั้ง)
    · หนามน้ำแข็ง/ผนึกมิโกะในแนว (`Ice.hitSpikesInArea`/`Zero.hitSealsInArea` ที่ `useSkill` ต่อคิวหลังคลื่น) โดน **เท่าผู้เล่นในแนว** (ผู้ใช้สั่ง "ให้แรงเท่าตีคน")
      ทั้งคลื่นท่าไม้ตาย (รวมกรณีหลบหมด) และคลื่นของดาบสนิม — `p.muimiWave` อยู่จนชุดผลหลังคลิปจบ (ล้างด้วย microtask)
      หลังลูปฟันคนใช้กับเป้าที่ไม่ใช่ผู้เล่นเท่านั้น (ค่าประเมิน `attackPowerAgainst` ใส่ผู้เล่นไม่โดนลากตาม)
  - ระหว่างดาบสะบั้น: ตีปกติพลังโจมตี +1 (`TOWER_ATK_BONUS` ผ่าน `damageBonus`) · ตีโดนฟื้นเลือด 2 และ **ยืดสถานะ +1 เทิร์น** (สกิลติดตัว "ใจที่ไม่ยอมแพ้") ·
    ภาพบนสนาม/เพลงสกิลเปลี่ยน (`displayImg`, `activeSkillMusic` → `"muimi"`) ·
    เสียงตีปกติ `muimi_ub_hit` (ปกติ `muimi_normal_hit` — ฮุค `attackSound` ผ่าน `attackSoundOf`)
  - ดาบสะบั้นหมดอายุ (ลูปลดเทิร์นของ `endTurn`) → `onUltExpire` ล็อกท่าไม้ตาย 3 เทิร์น (`ULT_COOLDOWN_TURNS` → `p.muimiUltLock`) · ใช้ไม่ได้ระหว่าง "ดาบเก่าๆ"
    · คลื่นถูกหลบหมดตั้งล็อกเดียวกันกลางเทิร์นที่กด — `ultLocked` (ล็อกจริง) แยกจาก `ultCooldownLeft` (ตัวเลขที่โชว์ `muimiUltCd`):
      เทิร์นที่กดไม่โชว์ตัวเลข แล้ว 3 → 2 → 1 เหมือนหมดเวลาปกติ
  - คลิป: ครั้งแรกต่อเกม `muimiUltimateFull` (24 วิ) ครั้งต่อไป `muimiUltimateShort` (12 วิ) — `queueCutscene` เล่นทุกครั้ง แล้ว `useSkill` พักตาเดิน (เฟส ACTION) เล่นคลิป แล้วลงคลื่นดาบ
- ~~หัวใจนักสู้~~ (passive2) ถอดออกแล้ว (ผู้ใช้ตัดสิน — GRID_PLAN §7.1)

**นักบินปริศนา (`sliver_bullet` · ง่าย · unique)** — `characters/sliver_bullet.js` · กติกาที่ผู้ใช้ตัดสิน GRID_PLAN §7.5 · เทสต์ [tests/characters/sliver_bullet.test.js](tests/characters/sliver_bullet.test.js)
- สถานะทั้งหมดอยู่ `p.sliver` (`arm` · `hidden` · `revealUntil` เลขรอบที่ปรากฏถึง · `logCut`/`logRound`) — ล้างใน `resetCombat`
- ล่องหนคิดที่ `refresh` (เริ่มแมตช์ + ต้นเทิร์น) · ปรากฏผ่าน `onReveal` ที่ `server/visibility.js` เรียก · ศัตรูได้ `pos: null` (`buildStateFor`) — ระบบมองเห็นเดียวกับพุ่มหญ้า [tests/visibility.test.js](tests/visibility.test.js)
  · ผู้ใช้ตัดสิน "ข้อมูลอื่นซ่อน": ผู้ชมที่มองไม่เห็น (`Visibility.hiddenFrom` — ล่องหน/พุ่มหญ้า/ม่านแดง) ได้ค่าซ่อนจาก `unseenPub` (`server/view.js`): `hp`/`maxHp`/`armor`/`maxArmor`/`shield`/`mark42` = null · `skillPoints` -1 · `statuses`/`statusAmt` {} · `skillLocks`/`sliver`/ก้อนตัวละครอื่น undefined · `img` ภาพตั้งต้น · ปุ่มสกิลราคาตั้งต้น (ไม่ผ่าน `skillCostOf`) — เปลี่ยนชิ้นส่วนลับๆ แล้วมุมมองศัตรูไม่ขยับ
  · นักบินตายระหว่างล่องหน = `onDeath` เลิกล่องหนเงียบๆ (ไม่มีบันทึก "ปรากฏตัวบนสนาม!")
- Beam Magnum ลงดาเมจด้วย `dealMixed` ตรง (แบบกระสุน Nursedessei) ใน `deferAfterCutscene` + `engine.boardFx("beamFx", { from, dir, len, color })` ให้ client วาดลำแสง

**โซระ โอโตสุมิ (`sora_otosumi` · ง่าย)** — `characters/sora_otosumi.js` · กติกาที่ผู้ใช้ตัดสิน GRID_PLAN §7.7 · เทสต์ [tests/characters/sora_otosumi.test.js](tests/characters/sora_otosumi.test.js)
- สถานะอยู่ `p.sora` (`myth` · `gun` · `formRound`/`weaponRound` เทิร์นที่กดล่าสุด · `calm` นับเทิร์นร่างโซระ · `ultReady` เลขรอบที่กด Mouse Separade ได้อีก) — ล้างใน `resetCombat` · ฟื้นฟูที่ `onEndTurn` (`endTurn` หลัง `oberon_summer.onEndTurn`)
- ตีปกติผ่านฮุคกลางทั้งหมด (`range` · `damageBonus` · `critPct` · `attackBeam`/`attackBeamTone`/`attackHitFx`/`attackSound` · `afterBoardAttack`) ไม่มีจุดเรียกเจาะจง
- Mouse Separade = ฉากต่อเนื่องหลายจังหวะ: `deferAfterCutscene` (หลังคลิป) → `engine.setDash` + `engine.skillBeat` (พักตาเดินเฟส `ATTACKING` ให้กระดานเล่นวงล้อ/พุ่ง) → `queueCutscene("soraHit")` + `deferAfterCutscene` → ดาเมจ/สลับที่ + `setDash` (ระเบิด) + `skillBeat` → ชนตัวใหญ่ = `shove` ผลักถอย 2 ช่อง (เหตุการณ์ iceFx `knock` + `crash` { id, x, y, dmg, kill } — เลขดาเมจตอนกระแทก) · เป้าตกรอบ/หายไประหว่างคลิปชน = โซระหยุดที่ปลายทางพุ่ง (ช่องหน้าเป้า · ไม่ว่าง = ที่เดิม — `settleAtStop`)
  · ตัวเดินฉาก `cutscene.runSkillFlow` (คลิปที่คิว → ผลหลังคลิป → จังหวะพัก วนจนหมด แล้วกลับตาเดินด้วยเวลาที่เหลือ) — เรียกจาก `pausePlayingForCutscene` และท้าย `useSkill`
  · หลบได้ผ่าน `engine.skillDodge` (ตัวเดียวกับ `skillStrike`) · ช่องตามแนว `engine.chargeTiles` · พังของ `engine.breakObstacles` · ช่องว่าง `engine.tileFree`
  · ผลของสกิลโจมตีพื้นที่เฉพาะช่องที่พุ่งผ่านจริง + ช่องที่ชน (ผู้ใช้ตัดสิน): ฮุค `ownsAreaHit` → `useSkill` ข้าม `exposeBush`/`onAreaHit`/`hitSealsInArea`/`hitSpikesInArea` ของทั้งแนว · โซระเรียก `skills.hitArea(p, tiles, ids)` เองในจังหวะพุ่ง (ก่อนพังของ) · ระหว่างนั้น `attackBaseOverride` = `ULT_DMG` และ `damageBonus` = 0 → ผนึก/หนามโดน 3 (ไม่มีโบนัสมีด)

**ไรโด ฮิคารุ (`raido_hikaru` · กลาง)** — `characters/raido_hikaru.js` (กติกาเต็มหัวไฟล์) · กติกาที่ผู้ใช้ตัดสิน GRID_PLAN §7.8 · เทสต์ [tests/characters/raido_hikaru.test.js](tests/characters/raido_hikaru.test.js)
- สถานะอยู่ `p.hikaru` (`form` ร่าง UltraLive · `formRound` · `armorReady`/`gingaReady` เลขรอบที่ใช้ได้อีก · `formReady` { ร่าง: เลขรอบ } คูลดาวน์รายร่าง · เวลาร่างที่เหลือ = สถานะ `hikaruForm` (3) · `accUntil` แม่นยำเดิมก่อนเข้า Tiga · `ginga` · `strium` · `brace` · `kemurCalm`/`kemurSnap`/`hidden` ล่องหนร่างเคมู · `logCut`/`logRound`) — ล้างใน `resetCombat`
- จุดเสียบเจาะจง: `resetCombat` · `onEndTurn` (`endTurn` ต่อจากโซระ: Brace → ร่าง UltraLive หมด → กิงกะหมด → นับเคมู) · `onRoundStartTick` (`dealRound` — กิงกะที่ขยายตัวไม่สำเร็จลองใหม่) · `buildStateFor` ส่ง `hikaru: hikaruState(...)` (ร่าง · `formLeft` · ปุ่ม 7 ร่าง `{ key, name, img, locked, cd }` · Brace · `armorCd` — คูลดาวน์กิงกะส่งทาง `skillLocks.secondary.cd`)
- ข้อมูลรายร่างอยู่ตาราง `FORMS` (`range` · `lane` · `atk` · `onHit { status, turns, label, name }`) — ฮุค `range` / `attackLane` / `damageBonus` / `onStrikeLanded` อ่านจากตาราง ไม่มี if รายร่าง
- UltraLive ส่ง `useSkill { tier: "basic", form }` (`socket.js` ส่ง `form` ต่อใน opts · `canUseSkill` ได้ `opts` เป็นพารามิเตอร์ที่ 5) · client เปิดตัวเลือกร่าง `client/src/screens/hud/HikaruForms.jsx`
- ตีปกติแนวตรง (ฮุค `attackLane` → `true` = แนวยาวตามระยะ (แบล็คคิง) · `"face"` = ช่องติดตัวทั้งด้าน (กิงกะ)): `action.lanes` / `canStrike` / `laneVictims` · `board.laneSets` / `laneTiles` / `laneOf(..., face)` · `attack.boardAttack` ตีทุกศัตรูในแนว (`card.extra` · `card.byLane`) · ตีสวนได้แค่เป้าหลัก · `zeroTime.canHitSeal` รองรับ · client ได้ `lane` (true/"face"/false)
- ร่าง UltraLive ทุกร่างและกิงกะเป็นตัว 3×3 (`engine.resizeUnit` หลังคลิป · คืนร่าง/ร่างหมดเวลา = 1×1)
- ท่าไม้ตาย: `deferAfterCutscene` → `boardFx("hikaruBeam", { kind, from, size, dir, len, width, tiles })` → `skillBeat(BEAM_SECONDS = 1.9)` → ดาเมจ 2 (`dealMixed` · หลบไม่ได้ · กรองเป้าตอนลำแสงถึง) + `applyBurn` · Strium Ray ผลัก → `boardFx("hikaruPush", { moves })` + `skillBeat(PUSH_SECONDS = 0.9)` · จังหวะต้องไม่สั้นกว่า `HK_BEAM.reach` / `HK_PUSH_MS` ใน `hikaruFx.js`
- เอฟเฟกต์บนกระดานทั้งหมดอยู่ `client/src/board/hikaruFx.js` (ท่าตีตามร่าง `hk*` รวมเข้า `STYLE_MS`/`STYLE_HIT_P` ของ `boardDraw.js` · ปะทะ `hkHit` + `hitIds` · ลำแสง `hkCross`/`hkStriumRay`) · ตัวใหญ่ไม่มีรูป 4 ทิศ = หมากหกเหลี่ยมขยาย (`drawAnyUnit` → `drawUnit` `u.k`)

**โอเบรอน (ฤดูร้อน) (`oberon_summer` · กลาง)** — `characters/oberon_summer.js` (กติกาเต็มอยู่หัวไฟล์) · เทสต์ [tests/characters/oberon_summer.test.js](tests/characters/oberon_summer.test.js)
- **ม่านแห่งราตรี** (basic · 2): ทุกคนในรัศมี (`veilRecipients` — duo/trio = ตัวเอง + เพื่อนร่วมทีม · ไม่มีรายชื่อ = ตัวเองคนเดียว) ได้ `obsVeil` พลังโจมตี +1 3 เทิร์น + ฟื้นเลือด 1 · กดซ้ำไม่ได้จนผลหมด (`p.obsVeilUntil`)
- **นกจาบยามเช้า** (secondary · 4): เลือก 1 คน **ใครก็ได้รวมศัตรู** ฟื้นเลือด 5 + ต้านสถานะ 2 เทิร์น + `cleanseLatestDebuff` 1 อย่าง ·
  ไม่กินโควตาเทิร์น (`skipsTurnQuota`) แต่กดได้ 1 ครั้ง/เทิร์น (`p.obsLarkRound`)
  - ผลเสีย: ตั้ง `t.statuses.obsLark = LARK_MARK_TURNS` (2 — ลูป `endTurn` ลดเหลือ 1) → ต้นเทิร์นถัดไป `onRoundStartTick` (ในลูปของ `dealRound`) เสียเลือด 2 ทะลุเกราะ
    · **ไม่ห่อ `withEffectSource`** โดยตั้งใจ — มีต้นตอ = `friendlyEffectBlocked` จะกันไม่ให้ลงเพื่อนร่วมทีม · ตั้ง `_statusDamage` แทน
- **จุดจบของความฝัน** (ultimate · 4 · คูลดาวน์ 5 — `p.obsUltReady`): เลือก 1 คน (รวมศัตรู/ตัวเอง) `obsDream` +4 จนจบตาเดินถัดไปของเป้า ·
  ปัก `t.obsDreamUseRound` (เทิร์นที่ได้ใช้บัฟ — เป้าเดินไปแล้ว = เทิร์นหน้า) → `onEndTurn` ของเทิร์นนั้น (หลังลูปลดเทิร์นสถานะ) ล้าง `obsDream`
  แล้วใส่สตั้น 3 เทิร์นผ่าน `applyDebuff` (ต้านได้) — อยู่หลังลูป สตั้นจึงเต็ม 3 เทิร์นถัดไป
- **หน้าไหว้หลังหลอก** (passive): `onEndTurn` — โอเบรอนที่ `!p.wasAttacked` ทั้งเทิร์น ได้แต้มสกิล +1 และเหรียญ +1 (ถูกเลือกเป็นเป้าแม้หลบได้ก็นับว่าถูกโจมตี)
- **ใส่ซ้ำคนเดิม = ทุกครั้งนับ** (โอเบรอนหลายคน/ท่าเดิมลงซ้ำ — ผลเกิดเท่าจำนวนครั้ง ไม่เขียนทับกัน) · เก็บรายครั้งที่ตัวเป้า ล้างใน `resetCombat`:
  `t.obsVeilStack` (เทิร์นที่เหลือต่อครั้ง · ลดใน `onEndTurn` คู่กับลูปลดเทิร์น · +1 ต่อครั้ง) · `t.obsLarkStack` (จำนวนเครื่องหมาย · `onRoundStartTick` เรียก `dealDirect` 2 ทีละครั้ง) ·
  `t.obsDreamQueue` (เทิร์นใช้บัฟต่อครั้ง · `t.obsDreamUseRound` = ค่าน้อยสุด · +4 ต่อครั้ง · ครั้งที่ถึงพร้อมกันสตั้นรวม 3 × จำนวน — สตั้นซ้อนบวกต่อจากเทิร์นที่ยังเหลือเสมอ ไม่รีเซ็ต)
  · `statuses.*` ยังเป็นเทิร์นที่เหลือ (ป้าย client) · `statusAmt.obsVeil`/`obsDream` = ผลรวม · สถานะที่ตั้งตรงๆ ไม่มีรายการครั้ง = นับ 1 ครั้ง
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
- ลดเทิร์นทั้งหมดที่ลูปใน `endTurn()` (`server/phases/endTurn.js`) — **ลูปข้าม key ใน `NO_TICK_STATUS` (`_universal_status.js`) ให้เอง**
  key ใหม่ที่ไม่ควรลดเทิร์นแค่เพิ่มในชุดนั้น · ตอนนี้: `hbleed`/`hburn` (ลดเองตอนติกต้นเทิร์น) · `fortune` (หมดเมื่อจั่ว) · `spRegen` (ลดเองตอนติก) · `empower` (หมดเมื่อโจมตี)
  · `sleep` เทิร์นแรก (`p.sleepFresh`) ข้ามในลูปเป็นกรณีพิเศษ · หมดอายุแล้วล้าง `statusAmt` ให้เอง
  · สถานะหมดอายุที่ต้องมีผลตามมา เรียกฮุคในลูปนี้ (ตอนนี้: `muimiTower` → `muimi.onUltExpire`)

**บัฟกลาง** (`BUFF_KEYS` ใน `_universal_status.js` — `stripLatestBuff` ปาดได้): `resist` (ต้านสถานะ) · `guard` (คุ้มครอง) · `fortune` (โชคลาภ) ·
`mend` (เยียวยา — สแตค ต้นเทิร์นฟื้นพลังชีวิตทีละครั้ง `tickMend` ใน `dealRound`) · `spRegen` (ฟื้นพลัง — สแตค ต้นเทิร์นแต้มสกิล +1 ทีละขั้น `tickSpRegen` ใน `dealRound`) · `iceSurge` (Ice Spike) · `might`/`empower` (เสริมพลัง) · `evade` (หลบหลีก) · `spellflow` (กระแสเวท) · `freecast` (การ์ดราชินี) · `awaken` (ตื่นขึ้น) ·
`accurate` (แม่นยำ — เจาะการหลบทุกแบบ) · นอกรายการ: `netramana` (เนตรมณะ — โอกาสสังหาร 20% ตอนตีปกติ)

**ดีบัฟกลาง** (`BASIC_DEBUFF_CLEAR` = ต้าน/ล้างได้ทั้งก้อน): `discord` · `sleep` · `stun` · `nodraw` · `noskill` · `weak` · `fragile` · `spellburden` (ภาระเวท — ดูกล่องด้านล่าง) ·
`oblada` (สิ่งแปลกปลอม) · `hburn` (ลุกไหม้) · `hbleed` (เลือดไหล) · `invert` (ผกผัน) · `nohealing` · `manaSeal` · `chaa` (จั่ว 1 ครั้งได้ 2 ใบ) · `blind` (ตาบอด) ·
`poison` (พิษร้าย) · `decay` (ผุพัง เกราะไม่ฟื้น) · `stagger` (ชะงัก) · `promo` (เปิดแต้ม) · `energy` · `numb` (เหน็บชา)
· `SOFT_DEBUFF_STEP` (ล้างได้ทีละ 1): `curse` (คำสาป) · `shock` (ช็อต)
· ชื่อที่ยังค้างในรายการแต่ **ไม่มีผลในโค้ดแล้ว**: `manaLeech` · `manaRupture` · `drunk`

> ⚠️ **กติกาการมอบผลให้ผู้เล่นคนอื่นตอนต้นเทิร์น** — `tickBurn()`/`tickBleed()`/`tickPoison()`/`tickShock()` และการแจกไพ่ใบแรก
> ถูกเรียก **ในลูปต่อผู้เล่นของ `dealRound()`** ดังนั้นฮุคต้นเทิร์นที่แจกผล **ให้ผู้เล่นคนอื่น** ห้ามทำในลูปนั้น:
> คนที่ลูปยังวนไม่ถึงจะโดนผลในเทิร์นเดียวกัน ส่วนคนที่วนผ่านไปแล้วต้องรอเทิร์นถัดไป = **ผลไม่เท่ากันตามลำดับที่นั่ง**
> ให้จองไว้แล้วลงผลหลังลูปจบ (เช่นแบบ `Zero.onRoundStart()` ที่ `dealRound` เรียกหลังลูป — ตอนนี้ไม่มีฮุคตัวละครหลังลูป ต้องเพิ่มจุดเรียกเอง)
> — ฮุคในลูป (`onRoundStartTick` เช่นนกจาบยามเช้าของโอเบรอน) ลงผลกับ **ตัวผู้เล่นคนนั้นเอง** เท่านั้น
> · ถ้าฮุคใช้ `withEffectSource` อยู่ ต้องเก็บผู้มอบไว้แล้วคืน source ตอนลงผลด้วย ไม่งั้น `friendlyEffectBlocked` ในโหมดทีมจะไม่ทำงาน

**เลือดไหล (`hbleed`) — สถานะ Universal (patch 2.5)**
กลไกเหมือน `hburn` ทุกอย่าง: ดาเมจ 1 หน่วยต่อเทิร์น (เกราะก่อน) แล้วลดสแตคลง 1 ที่ `tickBleed()` ต้นเทิร์น (เรียกคู่กับ `tickBurn` ใน `dealRound`)
- ใส่สถานะผ่าน **`engine.applyBleed(p, n)`** เท่านั้น (เคารพ `resist` + เพดาน `HBLEED_MAX = 6` + ประทับ `statusAt`) — ห้ามเขียน `p.statuses.hbleed` ตรงๆ
- อยู่ใน `BASIC_DEBUFF_CLEAR` (ต้านสถานะล้างได้) และ `NO_TICK_STATUS` (ลูป `endTurn` ต้องไม่ลดซ้ำ)
- **ผลข้างเคียงที่ต่างจากลุกไหม้**: ระหว่างติดอยู่ การฟื้นพลังชีวิตเหลือครึ่ง (`bleedHealPenalty` ใน `healHp()`) — ฟื้น 1 หน่วยไม่ถูกลด
- ฮุครายตัวละคร (ไม่ต้องแก้ `_universal_status.js`): `hbleedImmune(p)` / `hbleedHeals(p)` / `hbleedLabel(p)` / `hbleedHarmless(p)`
  (`hbleedHarmless` คุมเฉพาะการลดครึ่งของ `healHp`) · ลุกไหม้มีชุดเดียวกัน `hburnImmune` / `hburnHeals` / `hburnLabel` — ตัวละครปัจจุบันไม่ได้ใช้
- **ลุกไหม้ใส่ผ่าน `engine.applyBurn(p, n)`** เหมือนกัน (เคารพ `resist` + เพดาน `HBURN_MAX = 6` + ประทับ `statusAt` · คืนจำนวนที่ติดเพิ่มจริง) — ไรโด ฮิคารุใช้ (คิงแพนด้อน · สโตเรี่ยม · ท่าไม้ตาย)

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
- **`evade` (หลบหลีก)**: ใส่ผ่าน `applyEvade(p, pct)` (`engine.applyEvade` · `applyBuff(p, "evade", …)` ก็ส่งต่อให้) — `p.statuses.evade` = 1 เทิร์นเสมอ · `p.statusAmt.evade` = % (ไม่ระบุ = 100)
  ไม่ซ้อน: ได้ซ้ำขณะติด = รีเฟรชเป็น 1 เทิร์น · % ใช้ค่ามากสุด · ทอยหลบทุกครั้งที่ถูกโจมตี (`strike`/`skillStrike`) ไม่มีอะไรถูกใช้หมด · หมดอายุที่ลูป `endTurn` ตามปกติ (จบเทิร์นที่ได้รับ เหมือนยาต้านสถานะ 1 เทิร์น)
- ตาบอด (`blind`) ทำงานที่ `buildStateFor()`: ผู้ชมที่ตาบอดไม่เห็นไพ่/แต้ม/เลือด/เกราะ/แต้มสกิลของทุกคน (ค่า `null` / `-1`)

---

## 8. คัตซีน / แปลงร่าง

- **เสียงฝั่ง client:** `audioPolicy.js` กำหนดลำดับคัตซีน/เสียงพากย์ → เพลงห่วงเวลาซีโร่ (§18) → เพลงสกิล → เพลงช่วงโจมตี (`battle_phase`) → เพลงภูมิภาค ของทุกโหมด
  คัตซีนที่ถูกซ่อนจากผู้ชมไม่หยุดเพลงของผู้ชมคนนั้น · โหมดประหยัดเล่นเพลงต่อได้เมื่อข้ามวิดีโอ
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
- `pausePlayingForCutscene(after)` — พักตาเดิน (เฟส ACTION) เล่นคิวให้จบ เรียก `after` (ผลที่ต้องเกิด **หลัง** วีดีโอ เช่นกระสุน GUTS / Mark 42) แล้วกลับ PLAYING ด้วยเวลาที่เหลือ (ขั้นต่ำ 3 วิ)
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

- **เหรียญ**: จบเทิร์น +1 ทุกคน (`GOLD_PER_TURN` + `Journey.goldBonus` ภูมิภาค 4 +1) · คนเดินลำดับแรก +1 (`GOLD_FIRST_BONUS`) · การ์ด King +10 · หน้าไหว้หลังหลอกของโอเบรอน +1 · เพดาน `goldCapOf(p)` = `GOLD_MAX` 30
  - **ทุกการได้รับเหรียญต้องผ่าน `addGold(p, n)`** (`server/shop.js`, เปิดให้ hook ผ่าน `engine.addGold`) — จุดเดียวที่บังคับเพดานรายบุคคล
    · คืน **จำนวนที่เข้ากระเป๋าจริง** หลังตัดตามเพดาน · การเสียเหรียญ (ซื้อของ / วังวนน้ำ) หัก `p.gold` ตรง
- **ร้านค้าบนแผนที่** (GRID_PLAN §8.1) — ร้านเดียว: ร้านค้ามายา 15 ช่อง สุ่มล้วน (`openShop()`) ตั้งที่ `match.shopPos`
  - `dealRound` → `maybeMoveShop()`: ยังไม่มีที่ตั้ง (เริ่มเกม / `placeOnBoard` เปลี่ยนภูมิภาคยกร้านออก) หรือครบ `SHOP_INTERVAL_TURNS` (6) นับจาก `shopOpenedRound` (เวลาโลก — ห่วงเวลาซีโร่ไม่นับ)
    · ก่อกำเนิดใหม่ของ Echo เรียก `relocateShop()` ทันทีกลางเทิร์น (`shopOpenedRound` = เทิร์นนั้น → นับ 6 เทิร์นใหม่ ตรงกับภูมิภาคใหม่)
    → `relocateShop()` สุ่มจุดจาก `map.shopSpots` (`board.pickShopSpot`: ไม่ซ้ำจุดเดิม · ข้ามจุดที่มีคนยืน) + สุ่มของใหม่ · เทิร์น 1, 7, 13, 19 … (ตรงกับจังหวะเปลี่ยนภูมิภาค 7, 13, 19 … พอดี — ทั้งคู่ 6 เทิร์น)
  - ร้านกินช่อง: `action.boardBlocked()` ส่งให้ `reachable` (เดิน) และ `pushback` (ถอยชนร้าน = ชน −1)
  - ซื้อได้เมื่อ **ยืนติดร้าน** (`board.nearShop` ระยะ 1) ในตาตัวเอง · ซื้อแล้วเดินไม่ได้อีก (`lockMove`) · ซื้อหลายชิ้นได้
  - state: `shopPos` · `shopTurnsLeft` (ร้านอยู่จุดนี้อีกกี่เทิร์น รวมเทิร์นนี้ — บนจอเขียน "เหลือ N เทิร์น" · ตั้งใหม่ = "ปรากฏ" ห้ามใช้คำว่า "ย้าย") · `bagSlots` · `gutsRange`
  - น้ำหนักต่อช่อง `SHOP_WEIGHTS` (รวม 93): เปลี่ยนสีการ์ด 15 · โชคลาภ 5 · ต้านสถานะ 15 · แต้มสกิล 14 · เกราะ 14 · ปืน GUTS Select 8 · กระสุน 14 · เกราะ Mark 42 8
    (ยาลดไพ่ **ถอดออกแล้ว**)
  - **ไอเทมช่วงจั่วไพ่** (ผู้ใช้สั่ง 2026-10-18): ยาโชคลาภ / ยาเปลี่ยนสีการ์ด ใช้ผ่าน socket `useDrawItem {uid, cardIndex, color}` → `shop.useDrawItem`
    · เงื่อนไข: `PLAYING` · ยังไม่กด "พอ" (`!p.locked` — สตั้น/หลับไหลล็อกอยู่แล้ว) · `Duo.inGame` (ระบบคู่ = เจ้าของ กระเป๋าใช้ร่วม) · ไม่ล็อกการเดิน
    · โชคลาภ +`SHOP_FORTUNE_AMOUNT` (เต็ม `FORTUNE_MAX` = ไม่เสียของ) · เปลี่ยนสี: การ์ดเลขเท่านั้น สีต้องต่างจากเดิม → `checkBlueTrigger`
    · `useInventoryItem` (ตาเดิน) ไม่รับสองชนิดนี้ · client: หกเหลี่ยม 2 ก้อนใน `DrawDock` (`hud/HudPhases.jsx` `DrawItems`) · กระเป๋าซ่อนปุ่มใช้ (`DRAW_ITEM_TYPES` ใน `data/shop.js`)
    - แต้มสกิลแตกย่อยตาม `SHOP_SKILL_SIZES[].weight` — เล็ก (+1, 2 เหรียญ) 50 / กลาง (+4, 6) 35 / ใหญ่ (+6, 10) 15
    - กระสุนแตกย่อยตาม `SHOP_AMMO_WEIGHTS` — Shockwave/Gargorgon/Thunder อย่างละ 4 / Nurse 2
    - โควตาต่อรอบ: ปืน ≤ `SHOP_MAX_GUNS` (2) · Mark 42 ≤ `SHOP_MAX_MARK42` (2) — เต็มโควตาแล้วน้ำหนักตกไปรวมกับกระสุน (`rollShopItem(allowGun, allowMark42)`)
  - ผลของการเดินทางต่อร้าน **คิดใหม่ทุกต้นเทิร์น** ที่ `refreshShopForJourney()` (ร้านค้างข้ามช่วงกลางวัน/กลางคืน): ดูข้อ 10.1
  - ซื้อ: ใครกดก่อนได้ก่อน · หลับไหลซื้อไม่ได้ · ปืนมีได้กระบอกเดียว · ช่องนับ `bought` แล้วตัดสิน `sold` (ช่องละหลายชิ้นได้ในทุ่งดอกไม้ กลางคืน)
- ซื้อแล้วเข้า `p.inventory` (หายทุกแมตช์ใหม่) → ใช้ผ่าน `useInventoryItem()` (socket ห่อ `withEffectSource` ให้แล้ว) · ใช้ได้เฉพาะตาตัวเอง · ใช้แล้วเดินไม่ได้อีก
- **กระเป๋า `BAG_SLOTS` = 5 ช่อง** — ทุกชิ้นกิน 1 ช่อง (ปืน · กระสุนแต่ละนัด · ชุด Mark 42 ที่ยังไม่ได้ใส่) · เต็ม = ซื้อไม่ได้ / `grantInventoryItem` คืน null (ของฟรีทุ่งดอกไม้หลุด) /
  ถอด Mark 42 กลับเข้ากระเป๋าไม่ได้ · socket `dropItem {uid}` ทิ้งได้เฉพาะตาตัวเอง ไม่นับเป็นการใช้ (ยังเดินได้)
- **ปืนหน่วย GUTS Select** (15 เหรียญ · ไอเทมถาวร): ต้องมีปืนถึงจะยิงกระสุนได้ (`hasGutsGun`) · ระยะ `GUTS_RANGE` [1, 4] ·
  เป้าต้องเป็นคนอื่นที่ยังรอดและไม่ใช่เพื่อนร่วมทีม (`gutsFireTargetOf`) · **ยิง = การโจมตีของตา** (`fireGuts`): ย้อนเดินไม่ได้ → จบตาหลังฉากยิง
  - ลำดับ: วีดีโอกระสุน (เต็มจอครั้งแรกต่อผู้ยิงต่อชนิด · ครั้งต่อไปการ์ดแจ้งเตือน) → ผลกระสุน → `attack.gunAttack` ฉาก ATTACKING (`attack.gun` = ชนิดกระสุน)
    ที่มีตีสวน + ถอยถ้าผู้ยิงอยู่ในระยะตีของเป้า (`counterAndPush` ตัวเดียวกับตีปกติ) → `finishActor`
  - Shockwave = ทำลายเกราะทั้งหมด (ใส่ Mark 42 = ชุดพัง) · Gargorgon = สตั้น 1 เทิร์น **ต้นเทิร์นถัดไป** (`gutsGargorgonPending` — ต้านได้ตอนนั้น) ·
    Thunder = สภาพชา 2 เทิร์น · Nursedessei Cannon (10 เหรียญ) = ดาเมจ 4 (เกราะก่อน) แล้ว **ปืนพัง**
- **เกราะ Mark 42** (`characters/_mark42.js` — ระบบกลาง ไม่ใช่ตัวละคร · 25 เหรียญ · ระเบิด 2 · วีดีโอใส่/ใส่ให้/เรียกคืนเต็มครั้งแรกครั้งเดียวต่อผู้เล่น ระเบิดทุกครั้ง) ใครก็ใส่ได้
  - ใส่อยู่ = **เกราะชุด 7 เป็นชั้นแยก `p.mark42.armor`** ดักที่หัว `adjustIncomingDamage` (ทุกท่อ) + `damageSoft` + หัว `loseHp`/`loseArmor`
    (เส้นทางที่ข้ามท่อ) + `instantDeath` (สังหารทันที = ชุดพัง) — เลือด/เกราะจริงไม่ถูกแตะ จึงกลับร่างเดิมครบเมื่อถอด/พัง
    · **ห้ามใช้ `p.armor`** แทนชั้นนี้ (ค่าจริงต้องคงอยู่ข้างใต้) · หน้าจอแสดงเลือด 0/0 + เกราะชุด x/7 · พลังโจมตี +1 ที่ `computeAttackBase` · ภาพประจำตัวเป็นชุดเกราะ (`displayImg`)
  - เจ้าของ (`p.mark42Owned`) คุมชุดผ่าน socket `mark42Control` (recall / remove / detonate) — คนใส่ถอดเองไม่ได้ ·
    ใช้ไอเทมส่ง `mode` (`self` / `give` / `bomb`) ทาง `useInventoryItem` · วีดีโอก่อนแล้วผลเกิดหลังคลิป (`mark42Run` ใน `server/characterRules.js`)
  - การมองเห็น: ส่งชุดให้/ระเบิดใส่/สั่งชุดที่อยู่บนตัวคนอื่น (`planControl` คืน `wearerId`) = `Visibility.onHostileAct` **ก่อน** `mark42Run` ·
    ทำกับตัวเอง (ใส่เอง/ถอดจากตัวเอง) ไม่ปรากฏตัว — `mark42Run` ส่งป้าย/คลิปเฉพาะคนที่มองเห็นผู้ใช้ (`onlyFor` · ชื่อคนที่ซ่อนอยู่ไม่หลุด)
  - ชุดพังจากการต่อสู้ = เจ้าของซื้อใหม่ไม่ได้ 10 เทิร์น (`p.mark42BuyLock`) · ระเบิด/ถอด/เรียกคืนไม่ติดคูลดาวน์ · มีได้ชุดเดียวต่อคน
  - ระยะบนกระดาน: ใส่ให้ / ใส่แล้วระเบิด / เรียกคืน ต้อง **ยืนติดกัน** (ระยะ 1 — `adjacent` ใน `_mark42.js`) · ถอด / สั่งระเบิด สั่งจากไกลได้ (รีโมต)
  - เทสต์: [tests/mark42.test.js](tests/mark42.test.js) · ร้านค้า: [tests/shop.test.js](tests/shop.test.js) · ร้านบนแผนที่/กระเป๋า/ระยะปืน: [tests/shop-board.test.js](tests/shop-board.test.js)

---

## 10. กลางวัน/กลางคืน

- สลับทุก **3 เทิร์น** (`CYCLE_TURNS` · เดิม 5 — ผู้ใช้สั่งลด 2026-10-09) เริ่มเกมเป็นกลางวัน: วัน 1–3 · คืน 4–6 · วัน 7–9 … — `isNightRound(n)` (`server/dayNight.js`) · แบนเนอร์บอกทั้งสนามเมื่อช่วงเวลาเปลี่ยน
- **ทุกโหมดที่เหลือ (ffa/duo/trio) มีการเดินทาง** → ผลของภูมิภาค **แทน** กฎวัน/คืนเดิมทั้งหมด (ข้อ 10.1)
  กฎเดิมยังอยู่ในโค้ดเป็นค่า fallback เมื่อ `Journey.active()` เป็น false (ตอนนี้ไม่มีโหมดไหนเข้าทางนั้น):
  กลางวัน = จบเทิร์นแต้มสกิล +1 เฉพาะเช้าที่ 2, 4, 6, … (`morningBonusActive`) · กลางคืน = สุ่ม basic/secondary ของแต่ละคนแพงขึ้น +1 (`p.nightTaxTier`)
- **เกราะฟื้น +1 ทุกเทิร์นเลขคู่** เหมือนกันทั้งวัน/คืน (บล็อกโดย `decay`) — ภูมิภาค 5-7 ฟื้นทุกเทิร์น (`Journey.armorRegenDue`)
- **ห่วงเวลาซีโร่หยุดกลางวัน/กลางคืน** (§18): วัน/คืน · ภูมิภาค · ร้านค้า อ่าน **เวลาโลก** `Zero.worldRound()` / `engine.worldRound` (= `roundNumber − zeroFrozen`) ไม่ใช่ `roundNumber` ·
  ระหว่างอยู่ข้างในไม่มีผลวัน/คืนเลย (`Journey.current()` = null · ไม่มีภาษีกลางคืน/แต้มเช้า/แบนเนอร์)
- `cycleShift` = ตัวเลื่อนวงจรทั้งเกม (`engine.setCycleShift` ใช้ในเทสต์) — ถ้าจะเลื่อนวงจร **ต้องคำนวณใหม่ตรงๆ ห้ามบวกสะสม** (บวกคงที่ทำให้เกิดวันแทรกกลางคืนสั้นๆ)
  · ก่อกำเนิดใหม่ของ Echo ตั้ง `cycleShift = เวลาโลก − 1` (เทิร์นที่ใช้ท่า = กลางวันแรก) · รีเซ็ตเป็น 0 ใน `startMatch()`/`backToLobby()`

### 10.1 การเดินทาง 7 ภูมิภาค (ffa / duo / trio)

โมดูลกลาง [characters/_journey.js](characters/_journey.js) (require ตรงเหมือน `_mark42` — ไม่ใช่ตัวละคร) · เทสต์ [tests/journey.test.js](tests/journey.test.js)
- `Journey.active(engine)` = `gameMode` เป็น ffa/duo/trio (ทุกโหมดที่มีตอนนี้)
- ภูมิภาคเปลี่ยนทุก `AREA_TURNS` = 6 เทิร์น (= กลางวัน 3 + กลางคืน 3 พอดี · ผู้ใช้สั่ง 2026-10-09 — เดิม 5 ทำให้ย้ายกลางรอบวัน/คืน): ภูมิภาคใหม่เริ่มเทิร์น 7, 13, 19, … ไปจนจบเกม
  **ลำดับสุ่ม (ผู้ใช้สั่ง 2026-10-09)**: เทิร์น 1–6 = ภูมิภาค I เสมอ (ฐาน) · ทุกครั้งที่ข้าม `Journey.pickNextArea(from)` สุ่มจาก II–VII ไม่ซ้ำภูมิภาคที่อยู่ (ไม่กลับ I · ไม่มีภูมิภาคถาวร)
  state: `match.journeyArea` (ภูมิภาคปัจจุบัน — อ่านผ่าน `Journey.areaNow(engine)` / `engine.journeyArea`) + `match.journeyRoute` (ที่ผ่านมาตามลำดับ) · ตั้งใน `startMatch()`/`backToLobby()` · ข้ามใน `maybeJourneyAdvance()` เมื่อ `Journey.legEnds(round, match.legStart)`
  **`match.legStart`** (`engine.legStart` · ค่าเริ่ม 1 · รีเซ็ตใน `startMatch()`/`backToLobby()`) = เวลาโลกที่ภูมิภาคปัจจุบันเริ่มนับ — `legEnds(round, legStart)` = `(round − legStart + 1) % AREA_TURNS === 0` ·
  `turnInArea(round, legStart)` → `publicInfo.turnsLeft` (HUD) · ทุกตัวนับเป็น **เวลาโลก** (`Zero.worldRound()`) · ข้ามภูมิภาคปกติไม่ต้องแตะ legStart (นับ modulo ต่อเนื่อง)
  · **ก่อกำเนิดใหม่ (ท่าไม้ตาย Echo)** เริ่มภูมิภาคใหม่กลางเทิร์น: `legStart = เวลาโลก` + `cycleShift = เวลาโลก − 1` + `relocateShop()` → เทิร์นที่ใช้ = เทิร์นที่ 1 (กลางวัน) อยู่ครบ 6 เทิร์น ·
    ใช้ในเทิร์นที่เคยเป็นเทิร์นสุดท้าย (6, 12, …) ไม่ข้ามภูมิภาคซ้ำตอนจบเทิร์น (legEnds นับจาก legStart ใหม่แล้ว)
  เทสต์ตั้งภูมิภาคเองด้วย `engine.setJourneyArea(n)` (เลขเทิร์นไม่บอกภูมิภาคแล้ว)
  กลางวัน/กลางคืนอ่านจาก `isNightRound()` — ทุกภูมิภาคเริ่มด้วยกลางวัน 3 เทิร์นแล้วกลางคืน 3 เทิร์น
  · client: `JOURNEY_TURNS_PER_AREA` ใน `client/src/journey/areas.js` ต้องตรง `AREA_TURNS` (ป้ายเส้นทางหน้าเลือกโหมด `ModeVote.jsx`: I = เทิร์น 1–6 · อื่น = สุ่ม)
- ผลของภูมิภาค **แทน** กฎวัน/คืนเดิม: `Journey.nightTaxOn()` (เหลือแค่ภูมิภาค 1 กลางคืน) · `Journey.skillBonus()` (1 กลางวันเทิร์นคู่ / 7 ทุกเทิร์น)
- จุดเสียบใน engine (ชื่อฟังก์ชันใน `_journey.js` → ที่เรียก):
  `skillTax` → `useSkill()` **และ** `showCost()` ใน `buildStateFor` (ต้องคิดเหมือนกัน — สกิลราคา 0 ไม่โดน) ·
  `skillMisses`/`skillRefund` → `useSkill()` ถัดจากด่านเหน็บชา (พลาด = คืนแต้ม+การ์ดราชินี แต่เสียโควตาเทิร์น · แม่นยำ = ไม่พลาด) ·
  `tryAttackMiss` → `strike()` หลังเนตรมณะ (แม่นยำเจาะได้) · `attackBonus` → `computeAttackBase()` (ungated) ·
  `applyCrit` → `strike()` หลังตัวปรับดาเมจทุกตัว (`extraPct` เผื่ออัตราคริจากแหล่งอื่น — ทอยครั้งเดียว ×2 ไม่คูณซ้อน · ตัวละครที่มีระบบคริเองอ่าน `engine.critBonusFor(p)`) ·
  `dotBonus` → `engine.journeyDotBonus()` ใน tick ลุกไหม้/เลือดไหล/พิษร้าย ·
  `filterShopRoll`/`shopStock` → `openShop()`/`refreshShopForJourney()` (ช่องหลายชิ้นใช้ `stock`/`stockMax` — `sold` เป็น true ตอนหมดช่องเท่านั้น) ·
  `goldBonus` + `onEndTurn` → `endTurn()` (หลังลูปลดเทิร์นสถานะ ก่อนกวาดคนตาย — สตั้น/ผุพังที่ติดจึงมีผลเต็มเทิร์นหน้า) · `armorRegenDue` → `dealRound()` ·
  `journeyGiftItem` (ทุ่งดอกไม้ กลางวัน) → `grantInventoryItem`
- ความเสียหายจากสนาม (`fieldDamage`) ลดเกราะก่อน + ท่อตายชุดเดียวกับพิษร้าย และตั้ง `_statusDamage`
- **ฉากเดินทาง** (5.1: บนลูกโลก — `client/src/oc/intro/MatchIntro.jsx` เปิดแมตช์+ดิ่ง, `RegionTravel.jsx` เปลี่ยนภูมิภาค): server พักเฟส CUTSCENE (ไม่มีคลิป) — `journeyScene` `{ seq, active, mode, area, fromArea, route }` (`route` = ภูมิภาคที่ผ่านมาก่อนปลายทาง — ฉากวาดเส้นทางเก่าค้างไว้)
  · `start` = ต่อท้าย `gameIntroHoldSeconds()` ใน `startMatch()` (+`JOURNEY_START_SECONDS` 6 — client ดิ่งต่อจากฉากเปิดตัวที่ `onOutro`) · `advance` = `maybeJourneyAdvance()` ใน `server/phases/endTurn.js`
  ก่อนเทิร์นแรกของภูมิภาคใหม่ (+`JOURNEY_ADVANCE_SECONDS` 9) · เทสต์ที่ต้องการเทิร์น 1 ทันทีตั้ง env `JOURNEY_START_SECONDS=0`
  · `rebirth` = ท่าไม้ตาย Echo ก่อกำเนิดใหม่ (`journeyRebirth()` ใน `server/phases/endTurn.js` — เรียกจาก `applyInstantSkill` ผ่าน `engine.journeyRebirth(p, impact)`):
    สุ่ม `to` ไว้ก่อน → `journeyScene = { seq, active: true, mode: "rebirth", area: to, fromArea, route: [...journeyRoute], casterId }` · CUTSCENE `REBIRTH_SECONDS` 18 ·
    **ระหว่างฉาก `journeyArea`/กระดานยังเป็นภูมิภาคเดิม** (`publicInfo` ไม่นับ rebirth เป็น advance · client ไม่เปิด `RegionTravel` ให้ mode นี้) ·
    หมดเวลา: `impact()` (ศัตรูเสีย 2 ในนามของ Echo) → ศัตรูหมด = `gameOver()` ไม่เปลี่ยนภูมิภาค → ไม่งั้น `journeyArea`/route → `placeOnBoard(to)` → `legStart`/`cycleShift`/`relocateShop()` → `active = false` → `finishActor()`
    (`useSkill` เห็นเฟส CUTSCENE หลังผลสกิลแล้วแค่บรอดแคสต์)
  · `RegionTravel` (≈8.4 วิ): ซูมออก → **สุ่ม** (หมุด II–VII ยกเว้นต้นทางติดไฟสลับ ช้าลงจนล็อกปลายทาง · ป้ายเลขโรมัน+ชื่อสลับตาม · โลกเอียงตามหมุด · เส้นประเส้นทางโผล่หลังล็อกเท่านั้น) → เส้นวิ่งไปปลายทาง → ดิ่งลง
  · `state.journey` (`Journey.publicInfo`) ระหว่างฉาก advance แสดงภูมิภาค **ปลายทาง** แล้ว (ฉากหลัง/เพลงเปลี่ยนใต้ฉากเดินทาง)
- เพลง: `journey_<area>_<day|night>` ใน `client/src/audio.js` (5.1 เลิกใช้เพลง `journey_map` ระหว่างฉากเดินทาง — เล่นเพลงภูมิภาคปลายทางทันที · เปิดแมตช์ยังเป็น `lobby5`) — ไฟล์อยู่ `client/public/journey/` (R2)

---

## 11. ~~Overload Force~~ (ถอดออกแล้ว)

ผู้ใช้สั่งถอดออกทั้งระบบ (2026-10-08) — แต้มเสมอกันแค่สุ่มลำดับเดิน (§3) · **ห้ามใส่กลับ** · ไม่มีสแนปช็อตย้อนเทิร์นแล้ว
(โฟลเดอร์สื่อ `/overload_force` ยังอยู่เพราะเพลงท่าไม้ตายมุยมิ `overload_force_theme.mp3` อยู่ในนั้น)

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
จั่วไพ่:        hit   lock
ตาเดิน:        move {x,y}   undoMove   attack {targetId}   endAction (รอ)   useSkill {tier,targets,dir}
               buyShopItem {itemId}   useInventoryItem {uid,targetId,mode}   dropItem {uid}   mark42Control {action}
               (ทั้งหมดผ่านด่าน action.canAct — ตาของตัวเองเท่านั้น)
               qteKey {key}   qteTimeout
จบเกม:         backToLobby
```

**Server → Client**

| event | เนื้อหา |
|---|---|
| `state` | **snapshot ทั้งเกม ต่อผู้ชมแต่ละคน** — `buildStateFor(viewerId)` (`server/view.js`) ซ่อนไพ่/แต้มคนอื่นตอน PLAYING · กระดาน: `board` (แผนที่ภูมิภาค + `special`/`flow`/`healKind`), `turnOrder`, `actorId`, `action` {from,moved,locked,path}, `forecast` (คนที่กำลังเดิน: {[id]:{dmg,back,hit,crit,backHit,backCrit}} — hit/crit เป็น % จาก `estimateHitOn`/`estimateCritOf`), `shopPos`, `shopTurnsLeft`, `bagSlots`, `gutsRange`, ต่อผู้เล่น `pos`/`mov`/`baseMov`/`range` |
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
  - `POSITION_COLORS` มี 7 คีย์ = ที่นั่ง 1-7 (`POSITIONS` ฝั่ง client ตรงกัน)
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
  canUseSkill(engine, p, tier, targets, opts) { return true; },  // ด่านก่อนหักแต้ม (useSkill) · opts = ตัวเลือกจาก client (ฮิคารุ: opts.form)
  ignoresTurnQuota(p, tier) { return false; },                   // กดได้แม้ใช้โควตาเทิร์นไปแล้ว
  skipsTurnQuota(p, tier) { return false; },                     // กดแล้วไม่กินโควตาเทิร์น
  endsTurn(engine, p, tier, opts) { return false; },             // ใช้แล้วจบตาเดินทันที (หลังผล/คลิปจบ) — ตีปกติ/ไอเทม/สกิลต่อไม่ได้
  applyInstantSkill(engine, p, tier, targets, opts) { return ""; }, // ลงผลสกิล — คืนข้อความต่อท้ายป้าย skillFlash · opts.dir = ทิศของสกิล line
  skillCost(p, tier, base) { return base; },                     // ราคาที่เปลี่ยนตามสถานะ (useSkill + ป้ายราคาใน buildStateFor ใช้ตัวเดียวกัน)
  silentFlash(p, tier) { return false; },                        // true = ไม่ขึ้นป้าย skillFlash กลาง / ไม่บันทึก roundSkills
  maxHp(p) {}, maxArmor(p, base) {},                             // เลือด/เกราะสูงสุดเฉพาะตัว (ไม่มี = MAX_HP 7 / MAX_ARMOR 3 · base = MAX_ARMOR)
  onArmorLost(engine, p) {},                                     // เกราะลด 1 หน่วย (combat.loseArmor — ทุกทางที่ทำเกราะลด · ฮิคารุ: ฟื้นพลังชีวิต 1)
  preventDeath(engine, p) { return false; },                     // true = ไม่ตาย (combat.instantDeath — ทุกทางที่ตาย ยกเว้น force · ฮุคตั้งเลือดใหม่เอง · กิระ: อัฐิราชาฟื้นพลังชีวิต 1)
  stealthed(p) { return false; },                                // ล่องหน — ศัตรูมองไม่เห็น (server/visibility.js)
  onReveal(engine, p, kind) {},                                  // "act" ตัวเองโจมตี · "hit" อยู่ในสกิลโจมตีพื้นที่ · "bump" ถูกเดินชน
  logCut(p, round) { return 0; },                                // index บันทึกที่ปรากฏตัว — บรรทัดก่อนหน้าที่มีชื่อซ่อนจากศัตรู
  publicState(engine, p, viewer) {},                             // ข้อมูลเฉพาะตัว → state.players[].sliver (ตอนนี้เฉพาะนักบินปริศนา)
  skillSound(p, tier) { return null; },                          // คีย์เสียงของป้าย skillFlash
  skillLocks(engine, p) { return undefined; },                   // ล็อก/คูลดาวน์รายช่อง → state.players[].skillLocks
  displayImg(p) { return null; },                                // ภาพบนสนาม (null = ภาพประจำตัว)
  damageBonus(engine, attacker, target, ctx) { return 0; },      // บวกพลังโจมตี (computeAttackBase) — ห้ามแก้ state
  attackBaseOverride(engine, attacker, target, ctx) { return 1; }, // แทนที่พลังโจมตีฐาน
  adjustIncomingDamage(engine, p, n, isNormalAttack, kind) { return n; }, // ปรับดาเมจขาเข้า (ไม่รวม damageSoft)
  onQteDone(engine, p, ok, qte) {},                              // ผล QTE (tag = id ตัวละคร)
  skillPub(p, tier) { return null; },                            // ฟิลด์ที่ทับบนปุ่มสกิล (ชื่อ/รูปตามสถานะ) — buildStateFor
  range(p) { return null; }, mov(p) { return null; },            // ระยะตี/เดินตามสถานะ (null = ค่าใน characters.js)
  critPct(p) { return 0; },                                      // อัตราคริเฉพาะตัว (%) ของตีปกติ — รวมกับคริสนามแล้วทอยครั้งเดียว
  attackSound(p) {}, attackBeam(p) { return 0; }, attackBeamTone(p) { return null; }, attackHitFx(p) { return null; },
                                                                 // ฉากตีปกติ: เสียง · ลำแสง (ยาว/สี "blue") · เอฟเฟกต์ปะทะ ("mythSlash") → การ์ดฉากตี
  attackFxNames(attacker, atkCtx) { return []; },                // ป้ายโบนัสใต้ฉากตี (อ่าน ctx ที่ damageBonus ใส่ไว้)
  afterBoardAttack(engine, attacker, target, res) { return null; }, // ฟังก์ชันที่ทำหลังฉากตีจบ ก่อนจบตา (โซระ ปืน: ดึงเป้า)
  attackLane(p) { return false; },                               // ตีปกติแนวตรงจากขอบตัว — ทุกศัตรูในแนวโดน · "face" = ช่องติดตัวทั้งด้าน (action.lanes · ฮิคารุ: แบล็คคิง / กิงกะ)
  onStrikeLanded(engine, attacker, target, { counter }) { return []; }, // ตีปกติลง (รวมทุกคนในแนว) → ชื่อป้ายในฉากตี (ฮิคารุ: ติดสถานะตามร่าง)
  attackStyle(p, dist) { return null; },                         // ท่าตีบนกระดาน → การ์ดฉากตี byStyle (Echo: echo/hair/rock · ฮิคารุ: hk*)
  skillArea(p, tier, area) { return area; },                     // พื้นที่สกิลตามสถานะ (useSkill + ปุ่มใช้ตัวเดียวกัน)
  ownsAreaHit(p, tier, opts) { return false; },                  // true = useSkill ไม่ลงผลพื้นที่ hostile ทั้งแนว (พุ่มหญ้า/ล่องหน/ผนึก/หนาม) — ตัวละครเรียก skills.hitArea(p, tiles, ids) เองกับช่องที่โดนจริง (โซระ ท่าไม้ตาย)
  keepsMove(engine, p, tier) { return false; },                  // true = ใช้สกิลนี้แล้วยังเดินได้ (ไม่ lockMove — Ice Spike ก่อนเดิน)
  onActorStart(engine, p) {},                                    // ต้นตาเดินของ p (nextActor — ก่อนเช็คสตั้น · ท่าที่ "ออกผลตาเดินถัดไป")
  afterWalk(engine, p, tiles, ctx) { return []; },               // หลังเดิน/ไถล (tiles = ทุกช่องที่ผ่านจากจุดเริ่มตา — เรียกใหม่ทุกครั้งที่เดิน/ก้าว หลังถอดผลเดิมแล้ว) → บันทึกไว้ย้อน (Ice.layIce) · ctx = เหตุการณ์ iceFx
  onDamageTaken(engine, p, n) {},                                // เสียพลังชีวิต/เกราะ/เลือดชั่วคราว 1 หน่วย (combat.loseHp/loseArmor)
  onSlide(engine, p, n, ctx) {}, slideStrike(engine, p, u, n, ctx) {}, ownSpike(engine, p, ctx) { return 0; },
                                                                 // ระบบไถล (server/ice.js §19): ไถลเสร็จ · ไถลชนศัตรู (ลงดาเมจเอง) · ชนหนามตัวเอง (คืนแต้มที่ได้)
  // hburnImmune / hburnHeals / hburnLabel · hbleedImmune / hbleedHeals / hbleedLabel / hbleedHarmless (ข้อ 7)
  // ---- ออร่า/ระบบกลางของยูนะ (§21) — ถูกถามกับ "ทุกคน" จากทุกโมดูล: ฮุคต้องเช็คเองว่าเกี่ยวกับใคร ----
  auraAtk(engine, attacker) { return null; },        // { amount, name, img } พลังโจมตีจากออร่า (computeAttackBase · ป้ายฉากตี)
  auraAccurate(p) { return false; },                 // "แม่นยำ" จากออร่า (_universal_status.accurateActive — ลงทะเบียนใน characters/index.js)
  auraIncoming(engine, p, n) { return 0; },          // ส่วนต่างดาเมจที่ p ได้รับ (combat.adjustIncomingDamage — ทุกความเสียหาย หลังฮุคของเป้าเอง · ลดถึง 0 ได้)
  skillMusic(engine, p) { return null; },            // { music, at } เพลงสนามจากคนนี้ (view.activeSkillMusic — at มากสุดชนะ)
  // ---- เฉพาะตัวเอง ----
  untouchable(engine, p) { return false; },          // ไม่มีดาเมจ/ดีบัฟจากคนอื่นแตะได้ (combat.applyDebuff / adjustIncomingDamage)
  characterPub(engine, p) { return null; },          // { name, img } ชื่อ/ปกตัวละครที่เปลี่ยนตามร่าง → state.players[].character
  keepsCorpses(p) { return false; },                 // ระหว่างที่คนนี้ยังอยู่ ทุกคนที่ตายทิ้งศพ (server/duo.js corpseKept)
  canRide(engine, p) { return false; }, onMount(engine, p, mount, from) {}, onFall(engine, p, reason, base) {}, onDismount(engine, p, reason) {}, rideSound(p, kind) {},
  damageCap(engine, source) { return null; },        // เพดานความเสียหายต่อครั้งของผู้ลงมือ (combat.damageCapOf — ท่อดาเมจ + ฉากตี · ยูนะ: ขี่อยู่ไม่เกิน 2)
                                                     // ขี่ผู้เล่นอื่น (server/ride.js §21)
  canReapCorpse(engine, p, dead) { return false; }, reapCorpse(engine, p, dead) { return 1; },
                                                     // ตีปกติใส่ศพ "corpse:<id>" (action.attackTarget — §22) · reapCorpse ลงผลแล้วคืนวินาทีของฉาก ATTACKING ก่อนจบตา
  onActorReady(engine, p) {},                        // ตาเริ่มแล้ว (ACTION + นาฬิกา — nextActor) · ฉากต้นตาเดิน: queueCutscene/skillBeat แล้ว engine.pausePlayingForCutscene() (§22)
  blocksGuts(engine, p) { return false; },           // ยิงปืน GUTS ไม่ได้ (shop.gutsFireTargetOf)
  // ---- ไจโร (§23) ----
  voiceLines(p) { return null; },                    // { turn, strike, struck, basic, secondary, ultimate: [คีย์เสียง…] } เสียงพากย์ตามเหตุการณ์ (server/voice.js)
  absorbDamage(engine, p) { return false; },         // true = ชั้นของตัวละครรับดาเมจ 1 หน่วยไว้ (หลังโล่ ก่อนเกราะ · ทะลุเกราะข้าม)
  onStrikeResolved(engine, attacker, target, res, { counter }) {}, // หลังตีปกติ/ตีสวน 1 ครั้ง (attack.boardAttack / counterAndPush — เป้ายังอยู่ช่องเดิม)
  counterPush(engine, counterer, attacker, res) { return null; }, // ผู้สวนกำหนดการถอยของผู้ตีเอง → { push } (null = ถอยปกติ ชน −1)
  afterCounterPush(engine, counterer, attacker, res) {},        // หลังผลัก/ถอยของการสวน (ขยับหรือไม่ก็ตาม) — ไจโร: ลูกตกช่องที่ผู้ตีถูกผลักไป
  onStrikeObject(engine, p, at) {},                  // ตีปกติใส่ผนึกมิโกะ/หนามน้ำแข็ง (action.attackTarget) ก่อนลงผล
  onActorEnd(engine, p) {},                          // ตาเดินของ p จบจริง (finishActor — หลังเดินต่อ ก่อนผลของช่อง)
  hudActions(engine, p) { return undefined; },       // ปุ่มพิเศษบน HUD [{ key, icon, name, on, cd, disabled }] → state.players[].actions (เจ้าตัวเห็น)
  charAction(engine, p, key) { return false; },      // กดปุ่มพิเศษ (socket charAction { key }) — เช็คตาเดิน + บรอดแคสต์เอง

  // ---- ฮุค broadcast: engine เรียกทุกตัวละครตามลำดับ CHAR_HOOKS.MODULES (combat.broadcastHook) — ฮุคต้องเช็คเองว่าเป็นตัวเองไหม ----
  resetCombat(p) {},                       // combat.resetCombat() — ล้างฟิลด์เฉพาะตัวทุกแมตช์
  onRoundStartTick(engine, p) {},          // ลูปต่อผู้เล่นของ dealRound (p ตาย = ข้ามผลต้นเทิร์นที่เหลือ/ไม่ได้ไพ่)
  onEndTurn(engine) {},                    // endTurn() หลังลูปลดเทิร์นสถานะ
  onDeath(engine, p) {},                   // combat.instantDeath() — มีคนตกรอบ (p = คนที่ตาย · pos ยังไม่ถูกล้าง)
  onKill(engine, killer, victim) {},       // instantDeath → เฉพาะโมดูลของผู้สังหาร (match.effectSourceId)
  onBoardPlaced(engine) {},                // action.placeOnBoard — แผนที่ใหม่ (เริ่มเกม/เปลี่ยนภูมิภาค/ห่วงเวลาซีโร่) · ไจโร: ลูกบนพื้นกลับมือ
  //  ฮุคที่โยน error ถูก log (console.error ชื่อตัวละคร + ชื่อฮุค) แล้วข้าม — แมตช์ไม่ค้าง
};
```

**จุดที่ server เรียกตัวละครแบบเจาะจงตอนนี้** (ตัวละครใหม่ที่ต้องการจังหวะเดียวกันต้องเพิ่มบรรทัดเรียกเองที่จุดนั้น):
`muimi.onAttackLanded` / `towerActive` / `IMG` (`strike`, `activeSkillMusic`) · `muimi.onUltExpire` (ลูปลดเทิร์นของ `endTurn`) ·
`oberon_summer.atkBonus`/`atkFx` (`computeAttackBase`/`doAttack`) ·
`ice_spike.isIceSpike` (`buildStateFor` ฟิลด์ `iceHurt`) · `sliver_bullet.refresh` (`startMatch` + `dealRound`) / `attackSound` (`attackSoundOf`) · ฟิลด์ `muimi*` ใน `newPlayerRecord` (`server/socket.js`) และ `buildStateFor`

**กฎเหล็ก**
1. เข้าถึง state ผ่าน `engine.*` เท่านั้น (`engine.log`, `engine.healHp`, `engine.dealMixed`, `engine.players`, …)
2. อ่านค่าของแมตช์ผ่าน getter (`engine.roundNumber`) — เขียนผ่าน setter (`engine.setRoundNumber`)
3. ค่าคงที่เฉพาะตัวละครเก็บในไฟล์ตัวเอง (`server/constants.js` มีแต่ค่ากลาง)
4. ตัวละครใหม่ = เพิ่ม data ใน `characters.js` + ไฟล์ใน `characters/` + `require`+push ใน `characters/index.js` (ขั้นตอนเต็ม: skill `add-character`)

---

## 15. Gotchas ที่ควรจำก่อนแก้โค้ด

1. **`dealRound()` ล้าง `cutsceneQueue`** — คิววีดีโอไว้ก่อนบรรทัดนั้น = หาย
2. **ลูปลดเทิร์นสถานะใน `endTurn()`** — status key ใหม่ที่ไม่ควรลดเทิร์นต้องเพิ่มใน `NO_TICK_STATUS` (`characters/_universal_status.js`) ไม่งั้นหายเงียบ; ตรงข้าม key ในชุดนั้นที่ไม่มีใครลบทิ้ง = ค้างถาวรทั้งแมตช์
3. **โรลโอกาสต้องอยู่ที่จุดตัดสินจริง** — ถ้าโรลทีหลังจุดที่สุ่มผู้ชนะจากการเสมอไปแล้ว (เช่นใน `afterSummary()`) โอกาสจริงจะถูกหารด้วยจำนวนคนที่เสมอ → โรลใน `resolveRound()`
4. **`withEffectSource`** ต้องห่อทุก handler ที่ก่อเอฟเฟกต์ ไม่งั้น friendly-fire / แหล่งที่มาดาเมจพัง · callback หลังวีดีโอ (`pausePlayingForCutscene(after)`) ต้องห่อซ้ำ
   · กลับกัน ผลเสียที่ **ตั้งใจ** ให้ลงเพื่อนร่วมทีมได้ (นกจาบยามเช้า) ต้อง **ไม่** มีต้นตอ
5. **ห้ามแก้ `p.hp` / `p.armor` / `p.statuses.evade` ตรงๆ** — ใช้ primitive ที่ให้ไว้ (Mark 42 / เลือดชั่วคราว / `applyEvade` คุมกติกา 1 เทิร์น·ไม่ซ้อน) · ข้อยกเว้นที่มีอยู่: หลับไหลหักเลือดตรง (ค้างที่ 1)
6. **`isNormalAttack`** ให้ `true` เฉพาะจาก `doAttack()` เท่านั้น
7. **`p.seen[key]` vs `p.cutsceneShown[key]`** — อันแรกกันเอฟเฟกต์ afterReveal ทำงานซ้ำ (ล้างเมื่อสถานะหมด) อันหลังกันวีดีโอเล่นซ้ำทั้งเกม คนละเรื่องกัน
8. `process.on("uncaughtException")` ใน `server.js` เป็น **ตาข่ายสำรอง** (ติดตั้งเฉพาะตอนรันเป็น main — ตอนเทสต์ require ต้องให้ error ระเบิดออกมา) ไม่ใช่ที่จัดการ error — handler ต้อง try/catch เอง (`safeOn`/`onPlayerEvent` ทำให้แล้ว)
9. ไฟล์สื่อ (รูป/วีดีโอ/เพลง) ไม่ track ใน git — ไม่มีไฟล์ในเครื่อง client จะ fallback เป็นอีโมจิ (`client/src/data/avatars.js`)
10. **ตัวละคร `unique`** (ตอนนี้: นักบินปริศนา `sliver_bullet` · Echo `echo` — ที่เหลือเลือกซ้ำได้) กันซ้ำ **2 ชั้น**: handler `join` ตอบ `characterTaken` และหน้าเลือกตัวละคร
    ปิดการ์ดจาก event `takenChars` — ตัว unique ใหม่แค่ใส่ `unique: true` ใน `characters.js` · ตัวที่เลือกซ้ำได้ต้องเก็บสถานะแยกต่อผู้เล่น (`duplicate-safety.test.js`)
11. `resetCombat(p)` (`server/combat.js`) คือรายการฟิลด์ผู้เล่นทั้งหมด — **ฟิลด์ใหม่ของตัวละครต้องรีเซ็ตที่นี่** (และใส่ค่าเริ่มใน `newPlayerRecord`) ไม่งั้นค้างข้ามแมตช์
12. **ราคาบนปุ่ม = ราคาที่หักจริง** — สูตรอยู่ที่ `skillCostOf()` (`server/skills.js`) ที่เดียว ใช้ทั้ง `useSkill` และ `showCost()` ใน `buildStateFor`
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
- กระดาน: `board` · `action` · `turn-order` · `skill-area` · `terrain` · `board-rules-sync` (client = server)
- ระบบกลางที่มีเทสต์แยก: `journey` · `zeroTime` · `mark42` · `shop` / `shop-board` · `spellburden` · `team-friendly-fire` / `team-reveal` / `support-team-targets` · `audio-policy` / `audio-volume` · `sceneQueue` / `phaseSceneTiming`

---

## 17. หน้าจอกระดาน (client · จอคอม/แท็บเล็ต)

มือถือ (`vp.w < 768`) ยังเป็นหน้าจอเดิม ไม่ทำต่อ (CLAUDE.md) — ทุกอย่างในหัวข้อนี้คือจอคอม
```
screens/Game.jsx (GameBoard)   HUD ล่าง (SelfHud) · modal ร้าน/กระเป๋า/สถานะ · โหมดเลือกเป้า (pickReq → boardPick) · เงื่อนไขกดได้/ไม่ได้
  └ board/BoardStage.jsx      state → BoardCanvas · แถบลำดับเดิน · แบนเนอร์ ORDER · แผนเดินแล้วตี · หน้าต่างคาดการณ์ ·
                              ระยะอันตราย · ป้ายข้อมูลช่อง · ป้ายร้าน · ฉากตีบนกระดาน · หมุนกระดาน (Q/E, localStorage echo.boardRotation)
      └ board/BoardCanvas.jsx  canvas ล้วน (ไม่รู้กติกา) — ตัววาดอยู่ใน board/boardDraw.js · ธีมรายภูมิภาค
board/boardRules.js            สำเนากติกาจาก server/board.js (สร้างอัตโนมัติ ห้ามแก้ตรง)
```
- **ตาของเรา** (`phase === "ACTION" && actorId === me.id`): ฟ้า = เดินถึง (`reachable`) · แดง = เดินแล้วตีถึง (`threatZone`) ·
  ชี้ศัตรู = แผนยืนตีที่เดินน้อยสุด + ลูกศรถอย (`pushback`) + หน้าต่างคาดการณ์ (`state.forecast`) · คลิกศัตรู = `move` แล้วรอแอนิเมชันจบค่อย `attack`
- ปุ่มกลาง HUD: ช่วงจั่ว = จั่ว / พอ · ORDER/ACTION/ATTACKING = ย้อน (`undoMove`) / รอ (`endAction`)
- สกิล: `area.kind` self = ส่งทันที · target / aoe / line = `pickReq` → BoardStage เลือกเป้า/ยืนยัน/ทิศ แล้วส่ง `useSkill {tier, targets | dir}` ·
  ป้ายระยะบนปุ่ม (`areaText`) · target ที่ไม่มีใครในระยะ (และเลือกตัวเองไม่ได้) = ปุ่มเทา
- ปืน GUTS (`range = state.gutsRange`, ศัตรูเท่านั้น) และ Mark 42 ใส่ให้/ระเบิดใส่ (ระยะ 1) ใช้โหมดเลือกเป้าเดียวกัน
- ฉากตี (ATTACKING): BoardStage วาดฟัน → สวน → ถอย/ชน (`attack.counter`, `attack.push`) แทน `AttackFx` เต็มจอ (`OverlayLayer boardFx`) ·
  เลือด/เกราะเปลี่ยนนอกฉากตี = ตัวเลขลอยบนตัวนั้น
- เพลง: ORDER/ACTION/ATTACKING เล่นเพลงภูมิภาคต่อ (`audioPolicy.js` — ไม่สลับไปเพลงโจมตีแล้ว)
- **เครื่องมือ dev**: `?autoplay=<characterId>` (เข้าห้องที่นั่ง 1 → พร้อม → โหวต ffa) คู่กับ `node scripts/dev-bots.js [จำนวน]` (บอทเดินเข้าหาแล้วตี) ·
  `?hud=1&game=1&scn=playing|order|my|moved|other|attack|collide|gun|region` (state จำลอง `screens/hud/mockBoardState.js`) ·
  `?board=1` (ตัววาดล้วน) · `window.__echoState` = state ล่าสุด (dev)
- env เฉพาะ dev (ไม่ตั้ง = เกมปกติ · เทสต์ `dev-start-round`): `ECHO_DEV_START_ROUND=13` เริ่มแมตช์ที่เทิร์นนั้น (เกิน 6 = สุ่มภูมิภาค II–VII เหมือนเกมจริง) · `ECHO_DEV_START_AREA=3` บังคับภูมิภาคเริ่ม · `ECHO_DEV_RICH=1` เหรียญ 30 + แต้มสกิลเต็ม · `ECHO_DEV_ACTION_TIME=600` ยืดเวลาตาเดิน · `ECHO_DEV_ZERO=1` ห่วงเวลาซีโร่เกิดแน่นอนที่กลางคืนแรก (§18) ·
  `ECHO_SERVER_PORT` = พอร์ต server ที่ vite proxy ไปหา (ค่าเริ่ม 3000) · บอท: `node scripts/dev-bots.js [จำนวน] [url] [ffa|duo|trio]` (เดินแบบ FE · สุ่มยิงปืน/ใช้สกิล/ไอเทม/ซื้อของ)
- **กระดาน 14×14 ทุกภูมิภาค** (ผู้ใช้ตัดสิน 2026-10-09) · กล้องจัดกลาง/ย่อจาก `map.cols×rows` เอง
- ซูม: `BoardCanvas` prop `zoom` 0|1 (มุมใกล้ ×1.6) + `onZoomChange` (ล้อเมาส์) + `focus` {x,y} (เลื่อนกล้องไปหา ถ้าอยู่นอกจอ) · โหมดใกล้: ลากเมาส์/ปุ่มขวา/ลูกศรเลื่อนดู · ปุ่ม ＋/－ ใน BoardStage · จำใน localStorage `echo.boardZoom` · ป้ายร้าน "🏪 N" วาดในแคนวาส (`shopLabel`) · dev: `?board=1&sq=1`, `window.__boardFocus(x,y)`
- หมุนกระดาน: `BoardCanvas` prop `rotation` 0–3 (ภาพอย่างเดียว พิกัด/คอลแบ็กเป็นพิกัดกระดานเสมอ) · คีย์ใช้ `e.code` KeyQ/KeyE (แป้นโหมดไทยใช้ได้) · ตัววาดแยก `boardGeo.js` (กล้อง/หมุน) · `boardProps.js` (สิ่งกีดขวาง/ช่องพิเศษ) · `regionThemes.js` (ธีม 7 ภูมิภาค)

---

## 18. ห่วงเวลาซีโร่ (Zero Time)

โมดูล [server/zeroTime.js](server/zeroTime.js) · กติกาที่ผู้ใช้ตัดสิน: [GRID_PLAN.md](GRID_PLAN.md) §8.2 · เทสต์ [tests/zeroTime.test.js](tests/zeroTime.test.js) ·
client: ธีม/ผนึก/ฟ้าผ่า `client/src/board/zeroTheme.js` · ฉาก `client/src/board/zeroScene.js`
- **ปิดอยู่** (2026-10-12 · เปิดกลับใน 5.6.12 แล้วผู้ใช้สั่งปิดอีก 2026-10-15): `ZERO_ENABLED = false` → `maybeEnter` คืน false เสมอ (ยกเว้น `ECHO_DEV_ZERO=1`) · ระบบทั้งหมดยังอยู่ครบ เปิดกลับได้ด้วยค่าเดียว — ห้ามเปิดเองโดยไม่ได้รับคำสั่ง
- **เกิด** (`maybeEnter` — ท้าย `endTurn` หลัง `gameOver()`/`maybeJourneyAdvance()`): เทิร์นถัดไปของ **เวลาโลก** เป็นกลางคืนและ ≥ `ZERO_START_ROUND` 10
  → ทอย `ZERO_CHANCE` 30% · **ครั้งเดียวต่อเกม** (`match.zeroUsed`) · `reset()` ใน `startMatch`/`backToLobby`
  · dev: `ECHO_DEV_ZERO=1` = เกิดแน่นอนตั้งแต่กลางคืนแรก (จบเทิร์น 3)
- **เข้า** (`enter`): เก็บ `saved` { board, shopPos, positions } → `placeOnBoard(ZERO_AREA)` สุ่มจุดเกิดบนสนามเฉพาะ (ร้านถูกยกออก) → ฉาก `enter` → `dealRound()`
- **เวลาโลก vs `roundNumber`**: `worldRound = roundNumber − zeroFrozen` (`Zero.worldRound()` / `engine.worldRound`) — `dealRound` บวก `zeroFrozen` ทุกเทิร์นที่อยู่ข้างใน
  · ใช้เวลาโลก: กลางวัน/กลางคืน (`dealRound`, `endTurn` แต้มเช้า, `buildStateFor` `cycle`) · ภูมิภาค (`legEnds` ใน `maybeJourneyAdvance`, `Journey.current`/`skillBonus`/`publicInfo`) ·
    ร้านค้า (`shopDue`/`relocateShop`/`shopTurnsLeft`) · การทอยเกิด
  · **คงใช้ `roundNumber`**: สถานะ/คูลดาวน์ทั้งหมด (คูลดาวน์ท่าไม้ตาย/สกิลของตัวละคร, `mark42BuyLock`, ปรากฏตัวของนักบิน, คำสาป ฯลฯ) — นับต่อตามปกติระหว่างอยู่ข้างใน
- **state ใน `match.js`**: `zero` { saved, seals[{x,y,hp,armor,broken}], pickups[{x,y}], pending[{i,by}], enteredRound, bolt } (null = ไม่ได้อยู่) ·
  `zeroUsed` · `zeroFrozen` · `zeroScene` { seq, active, mode, stage, seal, breakerId }
  → client ได้ `state.zero` (`publicInfo`): { active, stage, buffPhase, seals[{i,x,y,hp,armor,maxHp,maxArmor,broken}], pickups, atk, scene } ·
  ฉากปลดผนึก = { active: false, scene } · `skillLocks.ultimate.locked` = true ทุกตัว (`zeroLocks` ใน `view.js`)
- **ข้างใน**: ผลภูมิภาค/วัน-คืนปิด (`Journey.current()` = null) · ร้านปิด (`maybeMoveShop` ข้าม · `shopPos` null) · **ท่าไม้ตายล็อก** (`useSkill` → `ultLocked`) ·
  **เกราะไม่ฟื้น** (`dealRound`) · จบเทิร์นทุกคนเสีย `DRAIN` 1 (`onEndTurn` → `fieldHit`: ลดเกราะก่อน · ตายได้ · `_statusDamage`)
- **เฟส** = ผนึกแตก + 1 (`stage()` 1–4 · บัฟทุกคน สะสม): 1 แต้มสกิล +1/เทิร์น · 2 เหรียญ +1/เทิร์น (`onEndTurn`) ·
  3 พลังโจมตี +1 · 4 (เหลือผนึกเดียว) +2 (`attackBonus` → `computeAttackBase` `zeroAtkFx` ungated + ป้ายสกิลในฉากตี)
  · เฟส 4: ต้นเทิร์น (`onRoundStart` — หลังสถานะต้นเทิร์น) ฟ้าผ่า `BOLT_COUNT` 3 ช่องสุ่ม เสีย `BOLT_DMG` 2 → `engine.boardFx("zeroBolt", {tiles, hits})`
- **ของฟื้นพลังชีวิต**: `onRoundStart` เกิด 1 ชิ้นบนช่องว่าง (ไม่เกิน `PICKUP_MAX` 4) · จบตาบนช่อง = เก็บ +`PICKUP_HEAL` 2 (`finishActor` → `collectPickup` · ตัวใหญ่ช่องไหนก็ได้)
- **ผนึกมิโกะ** 4 มุม (`Board.ZERO_SEALS` [0,0] [13,0] [13,13] [0,13] = เหนือ/ตะวันออก/ใต้/ตะวันตก) พลังชีวิต `SEAL_HP` 3 เกราะ `SEAL_ARMOR` 2 · ลดเกราะก่อน · ไม่หลบ ไม่สวน
  · สนาม `ZERO_AREA` 8–11 ใน `server/board.js` (ผังเดียวกัน — ระดับ 1–4 ต่างแค่หน้าตาฝั่ง client) · terrain `seal` อยู่ใน `UNBREAKABLE`:
    ตัวใหญ่เดิน/ขยายทับไม่ได้ (`bigFits`/`growPlan`/`breakObstacles` ข้าม) · แตกแล้วแท่นยังเป็นสิ่งกีดขวาง
  · ตีปกติ: `attackTarget(id, "seal:N")` → `canHitSeal` (ระยะ `rangeOf`) → `attackSeal` (ท่อพลังโจมตีเดียวกับตีคน ใช้เสริมพลัง) → ATTACKING → `runPendingBreak(finishActor)`
  · สกิลโจมตีพื้นที่ (`area.hostile` aoe/line): `useSkill` เก็บ `action.areaTiles` แล้ว `hitSealsInArea` หลังผลสกิล (deferred) — ดาเมจ = พลังโจมตีไม่รวมเสริมพลัง
    → แตก = `runPendingBreak` แล้วกลับ ACTION ด้วยเวลาที่เหลือ (ขั้นต่ำ 3 วิ) · สกิลมีคลิป: `pausePlayingForCutscene` เล่นฉากผนึกก่อนกลับเฟสเดิม
- **ฉาก** (`playScene`: CUTSCENE + `cutsceneInfo = null` แบบฉากเดินทาง) — server พักรอ `ENTER_SECONDS` 8.5 · `BREAK_SECONDS` 3.6 · `RELEASE_SECONDS` 5
  (ต้องตรงความยาวฉากฝั่ง client) · `enter` ลำแสง → คลื่น → โซ่ → ผนึก · `break` ผนึกแตก + `match.board.area` = `ZERO_AREA + stage − 1` · `release` มิติแตกกลับสนามเดิม
- **ปลดผนึก** (`release` — อันสุดท้ายแตก): คืน `board`/`shopPos` · `match.zero = null` (บัฟหมด) · วางทุกคนที่ตำแหน่งเดิม (ไม่ว่าง → ช่องว่างใกล้สุด `spotNear` ·
  ตัวใหญ่วางไม่ได้ = หดเหลือ 1 ช่อง) · ทุกคนเสีย `RELEASE_DMG` 2 ยกเว้นคนทุบอันสุดท้าย · ปลดกลางเทิร์น = คนที่เหลือเดินต่อบนสนามเดิม
  คนทุบเดินต่อไม่ได้ (`action.locked`) · เวลาโลกเดินต่อจากที่หยุด (เข้าตอนจบเทิร์น 9 → ออกมาเทิร์นถัดไปเป็นเทิร์น 10 กลางคืน)
- **เพลง** (`client/src/audioPolicy.js`): `state.zero.active` = `zero_<stage>` (1–4) **ชนะเพลงสกิล/ท่าไม้ตาย** (ผู้ใช้สั่ง — วีดีโอคัตซีนยังพักเพลงตามปกติ) · ฉากปลดผนึกกลับเพลงภูมิภาค ·
  ไฟล์ `/zero_time/phase1..4.mp3` + `thunder.mp3` (`zero_thunder` — ฟ้าผ่า) อยู่ R2 (`mediaDirs.js` `zero_time`) ·
  `LOUDNESS_GAIN` phase1 0.55 · phase2 0.56 · phase3 0.58 · phase4 0.6 (ไฟล์ดัง −8.7 ถึง −9.5 LUFS — ลดให้ไม่กลบเสียงกด/เอฟเฟกต์) · thunder ไม่ลด

---

## 19. น้ำแข็ง / หนามน้ำแข็ง / ไถล (`server/ice.js` — Ice Spike · GRID_PLAN §7.9)

ระบบกลาง ตัวละครอื่นใช้ซ้ำได้ผ่าน `engine.ice.*` · รูปข้อมูล client ↔ server: `.claude/plans/ice-spike-contract.md`
- **กติกาไถล (ทุกน้ำแข็ง รวมภูมิภาค VI)** อยู่ใน `server/board.js`: `isIce` · `slideLine(map, x, y, dx, dy, units, selfId, blocked)` = ไถลจนสุดแนว หยุดบนช่องน้ำแข็งช่องสุดท้าย
  (ช่องถัดไปไม่ว่าง = หยุดก่อน · ทแยงได้) คืน `{ x, y, tiles, hit }` · `reachable`: เดินเข้าน้ำแข็ง = โหนดปลาย `slide: true` (เดินต่อไม่ได้) · `pushback` ไถลต่อ
- **ชั้นที่สร้างระหว่างเกม** `match.board.ice` / `spikes` + `iceVer` → `action.boardMap()` รวมเข้าแผนที่ (หนาม = terrain `icespike<lv>` · น้ำแข็ง = special `ice` ทับช่องพิเศษเดิม)
  — กติกาเดิน/ระยะ/วาดทุกอย่างใช้ของเดิมได้เลย · เปลี่ยนภูมิภาค = `placeOnBoard` ตั้ง `match.board` ใหม่ ชั้นหายเอง · `onEndTurn` นับ `left` ลง
- **เดิน** (`action.moveTo`): ช่องน้ำแข็งแรกในเส้นทาง = จุดเริ่มไถล → `Ice.resolveEntry` (ตำแหน่งจริงทุกคน) · ไถลแล้ว `action.locked` · ไถลชนด้วยฮุค `slideStrike` = จบตา (ATTACKING ตาม `fxSeconds`)
  · เดินทีละก้าวเข้าน้ำแข็งก็ไถล · ก้าวกลับช่องเริ่มตา = ย้อนเสมอ · ฮุค `afterWalk` (วางน้ำแข็ง) ย้อนได้ด้วย `action.iceUndo`
  · ทุกการเดินถอดผล `afterWalk` ของตานี้ออกก่อน (`rewindWalk`) แล้วเรียกใหม่ด้วยเส้นทางเต็มจากจุดเริ่มตา → น้ำแข็งที่ตัวเองเพิ่งเดินสร้างไม่ทำให้ไถล/ขวาง · เหตุการณ์ `lay` ส่งเฉพาะช่องใหม่
  · client คิดเส้นทางบนแผนที่เดียวกันจาก `state.action.walkUndo` (`Board.patchMap`) + `state.action.trail`
- **ชน** (`impact`): คน — ฮุค `slideStrike` ของผู้ไถล (ศัตรูเท่านั้น) แล้วเป้ากระเด็น 1 ช่อง · ไม่มีฮุค = เป้ากระเด็นไม่เสียเลือด · เพื่อน = หยุดเฉยๆ ·
  หนาม — เสียเท่า Lv (`dealMixed` ต้นตอ = เจ้าของหนาม) + เชื่องช้า · หนามลด 1 Lv · เจ้าของชนเอง = ฮุค `ownSpike` · `pushUnit` = ผลัก 1 ช่อง (ตัวใหญ่/ไม่ว่าง = เด้ง) ลงน้ำแข็ง = ไถลต่อ (ทอดสูงสุด 12)
  · ตายจากหนาม: `instantDeath` อยู่ใต้ต้นตอ = เจ้าของหนามด้วย → เจ้าของได้เครดิตสังหาร (ฮุค onKill)
- **ผลัก/ดึงแบบบังคับลงน้ำแข็ง = ไถลต่อ** (ผู้ใช้ตัดสิน): ทุกที่ที่ตั้ง `pos` เองหลังผลัก/ดึง (Strium Ray, ปืนโซระดึง, ขยายร่างดันออก `resizeUnit`, น้ำวน, ถอยหลังตีสวน) เรียก
  `Ice.forcedSlides(moves, source)` (`moves = [{ id, from?, to, dir }]` — 1×1 ที่ยืนบนน้ำแข็งเท่านั้น · มี `from` = ใส่ knock นำหน้า) หลังเอฟเฟกต์ผลักเล่นแล้ว → iceFx ชุดเดียว
  · ก่อนส่งพิกัดให้ทุกคน (growFx / hikaruPush / iceFx) ตัวที่ถูกผลักต้อง `Ice.revealPushed(u)` ก่อน (ถูกดัน = เผยตัว: ออกจากพุ่ม + ฮุค onReveal "bump")
- **เชื่องช้า** `statuses.slow` (`Ice.applySlow`: −1 เดินใน `action.movOf` · ไม่ซ้อน · 3 เทิร์น +1 ถ้าเป้าเดินไปแล้ว/กำลังเดิน · ต้านได้ · อยู่ใน `BASIC_DEBUFF_CLEAR`)
- **หนาม**: Lv1–3 เกราะ `SPIKE_ARMOR` [_, 1, 1, 1] · `left` 3 (ขึ้น Lv = นับใหม่) · ตีได้ด้วยเป้า `"spike:x,y"` (`action.attackTarget` → `attackSpike` ฉากตี `card.spike`) ·
  สกิลโจมตีพื้นที่ลงหนามด้วย (`skills.js` → `hitSpikesInArea`) · เกราะแตก = ลด Lv · ตัวใหญ่เดินพังได้ (`breakObstacles` → `smashedSpikes` ย้อนได้)
- **สกิลเลือกช่อง** `area.kind: "tile"` (`range`, `square?`, `place` ให้ client) — socket `useSkill { tile: { x, y }, dir? }` → `resolveArea(p, area, targets, dir, tile)` / `areaTiles(..., tile)` / `engine.tileArea`
- **ระเบิดสะสมดาเมจ**: ฮุค `onDamageTaken` → `Ice.noteHurt` · ครบ 3 = `flushBursts` หลังงานปัจจุบันจบ (`setImmediate` · ระหว่างฉากตีรอ `finishActor`)
- **เหตุการณ์ให้ client**: `Ice.begin()` → ใส่ `ctx.events` → `Ice.flush(ctx)` = socket `iceFx { seq, events }` (ชนิดเหตุการณ์: contract §4) ·
  client ค้างตำแหน่งคนในชุดไว้จนแอนิเมชันของคนนั้นเล่นถึง — **ทุกการขยับตัวที่อยู่ในชุดต้องมีเหตุการณ์ walk/slide/knock** ไม่งั้นตัวค้างที่เดิมจนจบชุด

## 20. ระบบคู่ / ม่านแดง / พื้นเปียก (`server/duo.js` · `server/soot.js` — เคท & เอมิลิโกะ · GRID_PLAN §7.10)
- **ระบบคู่** (ตัวละครที่มี `duo: "<id ตัวที่สอง>"` ใน characters.js): `Duo.setup()` ตอน `startMatch` สร้างระเบียน `<id>~duo` ใน `match.players` (`duoOf` = เจ้าของ · เจ้าของได้ `duoWith`) · `Duo.teardown()` ตอนกลับห้องรอ
  - ใช้ร่วม (getter/setter บนระเบียนคู่): `skillPoints gold inventory cards gutsShotTurn` · คู่ `locked` ตลอด ไม่จั่วไพ่ ไม่อยู่ใน `turnOrder` ไม่มี socket (`broadcastState` ข้าม)
  - `Duo.sideKey(p)` = id เจ้าของ → `combat.sameTeam` / `lobby.isAlly` = true เสมอ · จบเกมนับต่อฝ่าย (`Duo.sideCount`) · `Duo.cardHolders()` = ผู้ถือไพ่ที่ยังอยู่ (ใช้แทน alivePlayers ในช่วงจั่ว/เปิดไพ่/ลำดับเดิน/แต้มและเหรียญจบเทิร์น)
  - ตาเดิน `match.duo = { ownerId, acts, done }` · `Duo.switchTo(u)` (เก็บ action ของตัวเดิม · เดินแล้ว = `action.rebaseMove` เริ่มใหม่จากช่องที่ยืน `movLeft` = ระยะที่เหลือ · หมด = locked) · `finishActor` → ตัวถัดไปของฝ่าย (`Duo.nextUnit`) ด้วยเวลาที่เหลือ (`match.actionLeft` — `timers.clearPhaseTimer` จดไว้) · หมดเวลา = `action.actionTimeUp` (ทุกที่ที่ตั้งตัวจับเวลาตาเดินต้องใช้ตัวนี้ ไม่ใช่ finishActor)
  - socket คำสั่งตาเดิน (`onUnitEvent`) ส่งไปตัวที่คุม `Duo.controlledId` · state ได้ `controlId`, `duo`, `players[].duoOf/duoWith/corpse`
  - ร่าง: `instantDeath` → `Duo.onDeath` จำ `p.corpse` · `action.boardBlocked()` รวมร่าง + `hopTiles()` ให้ `Board.reachable` เดินข้ามได้ (`opts.hop`) · ห่วงเวลาซีโร่: `enter` จำร่าง (`Duo.saveCorpses`) → `release` คืนช่องเดิม (`Duo.restoreCorpses`) ก่อนวางคน แล้ว `Duo.placeCorpses(free, true)` ให้ร่างที่ล้มข้างในลงข้างอีกตัว
  - การมองเห็นของฝ่ายคู่ = รวมกัน (ตัวไหนเห็นก็เห็น — `Visibility.hiddenFrom` — แผนที่/หมอก) · แต่การเล็ง/ตี/ยิง/ส่งชุด ใช้ `Visibility.hiddenFromUnit(ตัวที่ลงมือ, เป้า)` = ม่านแดงนับจากตาของตัวนั้นเอง (ถูกขังในม่าน = เล็งคนนอกไม่ได้แม้อีกตัวอยู่ข้างนอก)
  - ตายต้นเทิร์นหลังแจกไพ่ (ฟ้าผ่าซีโร่ / ม่านแดง — `instantDeath` ล็อกเพราะยังไม่ PLAYING): `draw.reopenFallenOwners` เปิดให้เจ้าของที่อีกตัวยังรอดจั่วต่อ
  - เกราะ Mark 42 นับทั้งฝ่าย: `Mark42.ownsSuit / buyLockLeft` ดู `mark42Owned / mark42BuyLock` ของทุกตัว (`Duo.unitsOf`) — ฝ่ายหนึ่งมีชุดเดียว
    · คุมชุดได้ทั้งฝ่าย: `planControl / privateState` หาตัวที่ถือ `mark42Owned` (`holderOf`) — ตัวไหนสั่งก็ได้ ระยะนับจากตัวที่สั่ง · เรียกคืน = ตัวที่เรียกถือสิทธิ์แทน
  - สตั้น/หลับไหล: ตัวที่ติดถูกข้ามตา (`action.nextActor` · `Duo.canSwitchTo/nextUnit` เช็ค `stuck`) · ยังมีตัวที่ขยับได้ = จั่วปกติ ·
    ทุกตัวที่ยังอยู่ติดหมด (ติดทั้งคู่ / ล้ม + ติด) = ไม่ได้จั่ว (`draw.lockStuckSides` — หลัง `reopenFallenOwners`)
- **เดินต่อหลังจบตา (canto)**: ฮุค `cantoMov(engine, p)` → ตี/รอแล้วได้ `match.action.canto` (เดิน/ย้อน/รอเท่านั้น · `action.canAct(p, { move: true })`) · ฮุค `cantoSkill(p, tier)` = สกิลที่กดได้ระหว่างนั้น
- **ปุ่มหลายตัวเลือก**: `skillPub` คืน `choices: [{ key, name, img, cost, area, active, desc, locked?, left? }]` (`desc` **บังคับทุกตัวเลือก** (กฎผู้ใช้ 2026-10-19) = ชี้เมาส์ค้าง · `left` = ใช้ได้อีกกี่ครั้ง → 🔋N บนการ์ด) → client ส่ง `useSkill { form: key }` · `skillCost / skillArea / keepsMove / skipsTurnQuota / ignoresTurnQuota / silentFlash / skillSound` ได้ `opts` เป็นอาร์กิวเมนต์สุดท้าย
- **หลังตีปกติจบ**: ฮุค `afterStrike(engine, p)` — `action.attackTarget` เรียกก่อนจบตาทุกแบบ (ตีคน/หนามน้ำแข็ง/ผนึก) · เอมิลิโกะ: เครื่องดูดฝุ่นหัก 1 ครั้ง (`st.vacuumLeft` 5 ต่อเกม · ท่าไม้ตายก็หัก 1 · หมด = กลับไปถือไม้ถูพื้น เลือกใหม่ไม่ได้)
- **ห้ามตีปกติในตานี้**: `action.lockStrike(p)` = `locked` + `match.action.noStrike` (ตีไม่ได้ · ไม่ได้เดินต่อหลังจบตา · ยังใช้สกิล/รอ/สลับตัวได้) → state `action.noStrike` (client ซ่อนช่องตี/ปุ่มโจมตี) · ขนมปังของเอมิลิโกะ (กินเอง/ป้อนเคท)
- **ดาเมจตายตัวของตีปกติ**: ฮุค `fixedStrikeDamage(engine, attacker, target)` → ไม่รับบัฟฝั่งผู้ตี/คริ (หน้าคาดการณ์ใช้ค่านี้)
- **ไถลชน**: ฮุค `slideStrikes(engine, p)` = ลงดาเมจตอนนี้ไหม · `slideStrike` คืน `{ attack: false }` (ไม่จบตา) / `{ knock: false }` (ไม่กระเด็น)
- **พื้นเปียก**: `match.board.wet` (`Ice.layWet / dryWet / wetAt`) → special `"wet"` (`TERRAIN_INFO.slide` — `Board.isIce` = ไถลได้ทั้งน้ำแข็งและพื้นเปียก) · ถาวรจนเปลี่ยนภูมิภาค · iceFx kind `wet` / `dry`
- **ม่านแดง** (`server/soot.js`): `match.board.storms` · ฝ่ายผู้ร่าย = ฝ่ายคู่ + เพื่อนร่วมทีม (`friendly` — `combat.sameTeam`: ไม่โดน ไม่ถูกขัง เห็นข้ามม่าน) · `Soot.trapOf/blockedFor` (ขัง — `action.boardBlocked(selfId)` · ทุกที่ที่ขยับตัวคนต้องส่ง id) · `Soot.hiddenByStorm` (Visibility — เล็ง/ตีใช้ `hiddenFromUnit`) · `tickRound` ต้นเทิร์น · `onEndTurn` นับเวลา · `view.activeSkillMusic` = `kate_storm`
- **แส้เขม่า** เล็งได้แค่เอมิลิโกะหรือศัตรู (`sootAllowed` — เพื่อนร่วมทีมโหมด duo/trio ไม่ได้)
- **มืดบอด** (`shadowMask`): `buildStateFor` → `state.masked` · หมากคนอื่น `maskPub` (สีขาว ไม่มีชื่อ/ภาพ/ตัวเลข) · `turnOrder: []` · log ว่าง

## 21. ศพค้าง / ขี่ผู้เล่นอื่น / วงออร่า (`server/ride.js` · `server/duo.js` — ยูนะ · ผู้ใช้ส่งสเปก 2026-10-18)
- **ศพค้าง** (ฮุค `keepsCorpses(p)`): ระหว่างที่มีคนเก็บร่างยังอยู่ (`Duo.keeperAlive`) ทุกคนที่ตายได้ `p.corpse` (ช่องที่ตาย) — ขวางช่อง เดินข้ามได้ (กติกาเดียวกับร่างระบบคู่)
  · `Duo.corpseKept(p)` = ร่างนี้ยังอยู่ (ระบบคู่ที่อีกตัวรอด หรือมีคนเก็บร่าง) → `corpseKeys` / `boardBlocked` / `hopTiles` / state `players[].corpse`
  · คนเก็บร่างคนสุดท้ายตาย = ร่างที่ไม่ใช่ระบบคู่หายหมด · เปลี่ยนภูมิภาค = ศพลงช่องเดิมบนแผนที่ใหม่ (ไม่ว่าง = ช่องว่างใกล้สุด — `placeCorpses`) · `engine.corpseKept`
- **ฟื้นแล้วได้เดินเทิร์นนี้**: `action.joinOrder(id)` / `engine.joinOrder` — ยังไม่ถึงคิว = รอคิวเดิม · เดินไปแล้ว/ไม่มีชื่อ = ย้ายไปท้ายแถว (`actorIndex` เลื่อนตาม)
- **สกิลเลือกศพ**: `area { kind: "tile", range, place: "corpse" }` — client ไฮไลต์เฉพาะช่องศพในระยะ · `resolveArea` คืนคนบนช่อง (= `[]`) · ฮุคหา `opts.tile` เอง (ยูนะ: `corpseAt`)
- **ขี่ผู้เล่นอื่น** (`server/ride.js`): `rider.mountId` = id ตัวที่ถูกขี่
  · นอกตาเดินของตัวเอง `pos = null` (ไม่อยู่บนกระดาน → ไม่มีใครเล็ง/ตี · สกิลพื้นที่โดนแค่ตัวที่ถูกขี่ · ไม่ขวางช่อง) · `Ride.centerOf(p)` = ช่องจุดกลาง (ขี่ = ช่องของตัวที่ถูกขี่)
  · `nextActor` → `Ride.seat` (pos = ช่องของตัวที่ถูกขี่ชั่วคราว — ใช้สกิล/ตีจากตรงนั้น) · `finishActor` → `Ride.unseat` (ไม่ได้ผลของช่อง) · `beginOrder` นับตัวที่ขี่ว่ายังอยู่บนกระดาน
  · เดินออก = ลง (`moveTo` → `act.dismount` · ตานั้นขึ้นใหม่ไม่ได้ · จบตาแล้วยังลงอยู่ = `Ride.dismounted` → ฮุค `onDismount`) · ย้อนกลับช่องเดิม = ขึ้นกลับ (`rewindWalk`) · เปลี่ยนภูมิภาค = ลงหมด (`Ride.clearAll` ใน `placeOnBoard`)
  · ขอขี่: socket `rideAsk { targetId }` (ตาของตัวเอง ยังไม่ล็อก ติดกัน 1×1 ทั้งคู่ ฮุค `canRide`) → `match.rideAsk` → state `rideAsk` (คนขอ/เจ้าของตัวที่ถูกขอ — `mine`) → socket `rideAnswer { ok }` จากเจ้าของ · คำขอหมดอายุพร้อมจบตา
  · ตัวที่ถูกขี่สั่งให้ลง: socket `rideDrop` (ตาของตัวเอง · ไม่กินอะไร) → `Ride.drop` → `fall(reason "drop")` (ยูนะ: ไม่ติดห้ามขี่) · client ปุ่ม "ให้ลง" (`HudCommand drop`)
  · ยินยอม = ขึ้นหลัง + `action.locked` (ยังใช้สกิล/ตีได้) + ฮุค `onMount` · ร่วง: ตัวที่ถูกขี่ถูกตีปกติ (`strike` รวมหลบพ้น) / เสียหายจากผู้เล่นอื่น (`combat.tookDamage`) / ตาย (`Ride.onDeath` ใน `instantDeath`) → ช่องว่างใกล้สุด + ฮุค `onFall`
  · client: `players[].ride` → BoardStage ไม่วาดตัวที่ขี่แยก แต่ส่ง `rider` ให้หมากตัวที่ถูกขี่ (`boardDraw` → `yunaFx.drawRider`) · ปุ่ม "ขี่" (`HudCommand ride`) · กล่องยินยอม (Game.jsx — `state.rideAsk.mine`)
- **วงออร่า**: ฮุค `auraAtk` / `auraAccurate` / `auraIncoming` / `skillMusic` (§14) — ถามกับทุกคน · วาดวงบนพื้นด้วย prop `songs` ของ BoardCanvas (`[{ kind, x, y, r }]` — `yunaFx.drawYunaZones`)
- **หายตัวแบบแตะไม่ได้**: `stealthed` + `onReveal` ว่าง + ฮุค `untouchable` (ไม่มีดาเมจ/ดีบัฟจากคนอื่น) — ยูนะ: เงาของเสียง
- **ป้ายสกิลตามหน้าตาปุ่ม**: `skillPub` คืน `flash: true` = ป้าย skillFlash ใช้ชื่อ/รูปของปุ่มตอนกด (อ่านก่อนลงผล) แทนค่าใน characters.js
- **ชื่อ/ปกตามร่าง**: ฮุค `characterPub` → `players[].character.name/img/cover` (ยูนะ ไอดอล = "ยูนะ" + ปกไอดอล)

---
## 22. เก็บศพ / ท่าชาร์จข้ามเทิร์น (เกรย์ — `characters/gray.js` · ผู้ใช้ส่งสเปก 2026-10-19)
- **เก็บศพด้วยการตีปกติ**: client ส่ง `attack { targetId: "corpse:<playerId>" }` → `action.attackTarget` เรียกฮุค `canReapCorpse` (ระยะ/เงื่อนไขเป็นของตัวละคร) แล้ว `reapCorpse` (ตั้ง `dead.corpse = null` เอง) → `action.locked` + `didAttackRound` → เฟส `ATTACKING` ตามวินาทีที่คืน → `finishActor` (จบตาแบบตีปกติ · `lockStrike` = เก็บไม่ได้)
  · ศพที่ถูกเก็บ = สกิลฟื้นจากศพ (ยูนะ/เคท) หาไม่เจอ · ร่างระบบคู่ที่อีกตัวรอด กลับมาข้างตัวที่รอดตอนเปลี่ยนภูมิภาค (`Duo.placeCorpses` เดิม)
  · client (`BoardStage.jsx`): `me.gray.reaper` = ศพเป็นเป้าตีปกติแบบเดียวกับหนาม/ผนึก (ระยะ [1, 1] เสมอ)
- **ท่าที่ยิงตาเดินถัดๆ ไป**: กดแล้วเก็บสถานะชาร์จไว้ (เกรย์ `p.gray.charge { dir, cast, fire }`) · ฮุค `onActorReady` ของเทิร์นที่ต้องยิงคิวคลิป (`queueCutscene`) + ผลหลังคลิป (`deferAfterCutscene` → `skillBeat`) แล้วเรียก `engine.pausePlayingForCutscene()` → เล่นจบกลับเข้าตาเดินด้วยเวลาที่เหลือ
  · ผลระหว่างชาร์จ: ฮุค `onEndTurn` (เกรย์: จบเทิร์นที่กด ตรึงศัตรูที่ยังอยู่ในแนวจนถึงตอนยิง — ลงหลังลูปลดเทิร์นสถานะ จึงติดเต็มเทิร์นถัดไป)
  · ระหว่างชาร์จ: ฮุค `mov` = 0 · `range` = `[1, 0]` · `canUseSkill` = false · `blocksGuts` · ไอเทมอื่น/จั่วไพ่ได้
  · ถูกข้ามตา (สตั้น/หลับ) ในเทิร์นที่ต้องยิง = `onEndTurn` เลื่อนไปเทิร์นหน้า · ตาย = ยกเลิก (`onDeath`)
  · ผลพื้นที่ (โผล่จากพุ่ม/หนาม/ผนึก) ลงตอนยิง: ฮุค `ownsAreaHit` + `engine.hitArea(p, tiles, ids)`
- **อาวุธสุ่มต่อการตี**: `strikeCard` เรียก `attackStyle` ก่อน `attackSound` — สุ่มอาวุธใน `attackStyle` แล้วให้เสียงอ่านอาวุธที่ได้ (เกรย์: ค้อน/เคียว · ระยะ 2 = ธนู)

---
## 23. เสียงพากย์ตามเหตุการณ์ / ของบนกระดานของผู้เล่น / ชั้นเลือดม้า / กระเด็นถึงขอบ (ไจโร — `characters/gyro_zeppeli.js` · `server/voice.js` · GRID_PLAN §7.11)
- **เสียงพากย์ตามเหตุการณ์** (`server/voice.js` — ระบบกลาง): ฮุค `voiceLines(p)` → `{ turn, strike, struck, basic, secondary, ultimate: [คีย์เสียง…] }` (คีย์ใน `client/src/audio.js` FILES)
  · `turn` = ถึงตาเดิน (`nextActor` — ตาที่ถูกข้ามไม่ดัง) · `strike` = ตีปกติ/ตีสวน (`attack.strike` รวมพลาด) · `struck` = โดนตีแล้วไม่หลบ · tier = ใช้สกิลสำเร็จ (`skills.useSkill` หลังลงผล)
  · หลายคีย์ = สุ่ม 1 ทุกครั้ง (คีย์เดียว/ไม่มีฮุค = ไม่แตะ `Math.random`) · ส่ง `sfx { sound, voice: playerId }` (`engine.sfx(sound, onlyFor, extra)`) → client ตัดประโยคเก่าของคนเดียวกันก่อนพูดใหม่ (Game.jsx `onSfx`)
- **ทรัพยากรที่ตีปกติต้องใช้**: ฮุค `range` คืน `[1, 0]` เมื่อหมด (ไม่มีช่องที่ตีถึง → ตีสวนก็ไม่ได้ · ปืน GUTS ยังยิงได้) · ใช้ทรัพยากรใน `onStrikeResolved` (ตีคน/ตีสวน) + `onStrikeObject` (ตีผนึก/หนาม)
- **วัตถุบนกระดานที่เป็นของผู้เล่น** (ลูกเหล็ก): เก็บที่ตัวผู้เล่น (`p.gyro.balls [{ x, y, seq }]`) ไม่ใช่ตารางกลางรายช่อง — หลายคนตกช่องเดียวกันได้ · ไม่ขวางทาง · ตาย (`onDeath`) / เปลี่ยนแผนที่ (`onBoardPlaced`) ล้างเฉพาะของคนนั้น · state `players[].gyro` (ผู้ชมที่มองไม่เห็นเจ้าของยังเห็นลูก)
- **ชั้นเลือดรับดาเมจก่อนเกราะ**: ฮุค `absorbDamage(engine, p)` → true = รับ 1 หน่วย (`combat.layerAbsorb` — หลังโล่ ก่อนเกราะ ใน `dealMixed`/`dealArmorOnly`/`damageSoft` · `dealDirect` ข้าม) · ไจโร: ม้าเลือด 3 ตาย = ลงม้า + เรียกไม่ได้ 3 เทิร์น
- **ตีสวนแล้วผลักแทนถอย**: ฮุค `counterPush` ของผู้สวน → `{ push }` = ผู้ตีขยับ `Board.pushback` 1 ช่องเมื่อ push (ชน = ไม่ขยับ ไม่เสียเพิ่ม · `card.push = null`) — ไม่ถอยซ้อน · ผลักเป้าหลังฉากตี = `afterBoardAttack` → `engine.ice.pushUnit` (iceFx `knock` · ลงน้ำแข็งไถลต่อ)
  · ลูกตกช่องที่เป้าถูกผลักไป: ตีเอง = ทำนายช่องผลักตอน `onStrikeResolved` (`knockLand` → throw `land`) แล้ว `settleBall` ย้ายไปช่องจริงหลังผลัก/ไถล · ตีสวน = รอฮุค `afterCounterPush` แล้วค่อยส่ง throw (`land` = ช่องหลังผลัก)
- **เส้นทแยงแบบแตะทุกช่อง**: `touchLine(a, b)` (ลูกวิ่งกลับ) — เส้นผ่านมุมพอดี = ได้ทั้งสองช่องข้างมุม · รวมปลายทั้งสอง
- **กระเด็นถึงขอบ** (`planFlight` — วางแผนบนสำเนาตำแหน่ง ไม่แตะเกม จึงใช้คิดดาเมจล่วงหน้าใน `fixedStrikeDamage` / หน้าต่างคาดการณ์ได้): ทิศ 1 ใน 8 (`dir8`) · ช่องถัดไปนอกกระดาน = หยุด · สิ่งกีดขวางพังได้ = `engine.breakObstacles` · พังไม่ได้ (ผนึก/ร้านค้า/ร่าง) = ลอยข้าม (`jumps`)
  · คนขวาง = ดันออกข้างตั้งฉากกับทิศ (ช่องว่างใกล้สุด) · สองข้างไม่ว่าง = ดันนำหน้า (ดันต่อไม่ได้ = เป้าหยุด) · ช่องสุดท้ายยืนไม่ได้ = ถอยกลับตามทาง · ลงน้ำแข็ง = `Ice.forcedSlides`
  · พักฉากหลังฉากตี: ฟังก์ชันจาก `afterBoardAttack` คืน `{ hold, land }` (hold = 800 + 110 ms/ช่อง) → `boardAttack` ค้าง ATTACKING แล้วเรียก `land()` (ดาเมจตามช่องที่กระเด็น + ตรึง + คนที่ถูกชน −1) ก่อนจบตา
  · ตอนลูกแตะ: `fixedStrikeDamage(..., ctx)` คืน 0 (ctx.estimate = หน้าคาดการณ์ → ดาเมจจริงที่จะได้) · ฮุค `deferStrikeDamage(p)` → การ์ดฉากตี `byDeferDmg` = client ไม่ขึ้นเลขตอนปะทะ
- **ปุ่มพิเศษบน HUD** (ไม่ใช่ช่องสกิล): ฮุค `hudActions` → `players[].actions` (เจ้าตัวเห็น) → `HudCommand extra` · กด = socket `charAction { key }` → ฮุค `charAction` (เช็คตาเดิน + บรอดแคสต์เอง · ไม่ล็อกการเดิน ไม่กินโควตา)
- **นับเดินตรงจาก afterWalk**: บันทึกย้อน `{ undo: fn }` (`Ice.undoLay` เรียก fn · `walkUndoPatch` ข้ามบันทึกที่ไม่มี `k`) — ฮุคถูกเรียกใหม่ทุกครั้งด้วยเส้นทางเต็มหลังย้อนผลเดิม จึงคิดจากค่าก่อนเดินได้เสมอ
- **ดาเมจตามจังหวะเอฟเฟกต์** (วิชาลับไจโร): จับเวลาที่ลูกผ่านแต่ละคนด้วยสูตรเดียวกับ client (`SEC_T` = `SC` ใน gyroFx.js) แล้วเรียง `engine.skillBeat` เป็นช่วงต่อกัน (เวลาเท่ากันรวมเป็นจังหวะเดียว — `startPhaseTimer(0)` = รอ 1 วิ ห้ามส่ง 0) · ลงดาเมจแล้วส่ง `secretHit` ให้ client ขึ้นเลข
- **จบตาเดินของตัวเอง**: ฮุค `onActorEnd(engine, p)` (`finishActor` — หลังเดินต่อ ก่อนผลของช่อง) · ไจโร: เสริมท่าไม้ตายที่ไม่ได้ตีหมดลง
- เอฟเฟกต์: `engine.boardFx("gyroFx", { kind, id, color, … })` ตามสัญญา §7.11 (`horse` ใช้ `mode`) · server ลงผลทันทีตอนส่ง แล้วพักฉากตาม `GYRO_FX` ผ่าน `engine.skillBeat` — client ค้างภาพเอง (`client/src/board/gyroFx.js`)

---
## 24. หยุดเวลา / ตัดการโจมตี / ตาเดินพิเศษ / ชั้นพื้นมีอายุ / กับดักล่องหน (ดิเอโก้ — `characters/diego_alt.js` · `server/timeStop.js` · GRID_PLAN §7.12)
- **ตัดการโจมตีทั้งก้อน** (`server/timeStop.js`): ฮุค `counterArmed(engine, p)` = ตั้งรับ · `combat.adjustIncomingDamage` เรียก `TimeStop.check` → ศัตรูที่เป็นฝ่ายของคนที่กำลังเดิน (`effectSourceId`) ทำให้ p เสียหาย > 0 = โยน `TimeStopInterrupt`
  · จุดย้อน: `TimeStop.mark()` จด snapshot (`structuredClone` ของ `match` + ผู้เล่นทุกคน ยกเว้นตัวจับเวลา/คิวฉาก/ฟิลด์การเชื่อมต่อ) — ต้นตาเดิน (`nextActor`) + ต้นคำสั่ง (`TimeStop.guard` ห่อ `useSkill` / `attackTarget` / `moveTo` / socket `onUnitEvent` ทุกคำสั่ง) · จดเฉพาะตอนมีคนตั้งรับเป็นศัตรูของคนที่เดิน (ไม่มี = ไม่จด ไม่ตัด)
  · จับการตัด: `guard` + `timers.tick` (ผลที่ลงทีหลังในฉาก) → `catchInterrupt`: ย้อนสถานะ (คงตัวอ็อบเจกต์ผู้เล่นเดิม) · ล้างคิวฉาก · ฮุค `onCounterStop(engine, ผู้ตั้งรับ, ผู้โจมตี)` (จองตาพิเศษ) → ตาพิเศษได้ `resume` = ตาของผู้โจมตี (`actorId/action/duo/เวลาที่เหลือ`) → จบตาพิเศษแล้ว `action.resumeFrom` กลับไปเล่นต่อ (ถูกย้ายระหว่างนั้น = ล็อกการเดิน · ตาย = จบตานั้น) · `action.runExtras()` เล่นคิวตาพิเศษทันที
  · `combat.runHook` โยนการตัดต่อขึ้นไป (ไม่กลืน) · เทสต์ที่เรียก `doAttack` ตรงๆ ไม่มีจุดย้อน = ไม่ตัด
- **ตาเดินพิเศษ**: `engine.timeStop.queueExtra(id, kind)` → `nextActor` เล่นก่อนเลื่อนลำดับ (`actorIndex` ไม่ขยับ — จบแล้วไปคนถัดไปของลำดับเดิม) · `match.action.extra = kind`
  · ฮุค `onExtraTurn(engine, p, kind)` หลังตั้งตา+นาฬิกา (พักฉากด้วย `skillBeat` + `pausePlayingForCutscene` ได้) · `extraTurnOutro(engine, p, kind)` → วินาทีพักฉากก่อนจบตาจริง (ครั้งเดียว — `finishActor` เรียกซ้ำหลังฉาก)
  · ฮุค broadcast `onOrderBegin(engine)` (`beginOrder` หลังเรียงลำดับ) — จองตาพิเศษต้นเทิร์น · `match.extraTurns` ล้างทุก `dealRound`
- **หยุดเวลา (ดาเมจลงตอนเวลาเดินต่อ)**: `engine.timeStop.freeze(byId)` จดเลือด/เกราะ/โล่/สถานะของทุกคน · ระหว่างนั้น `combat.instantDeath` ค้างการตาย (`holdsDeath`) · `view` ส่งค่าที่จดไว้แทนค่าจริง (`frozenView`) + `state.timeFreeze = { by }`
  · `unfreeze()` → คนที่เลือดหมดตกรอบพร้อมกัน (ในนามผู้หยุด) → `[{ id, dmg, kill }]` · ระหว่างหยุดไม่มีใครตั้งรับได้ (`check` ข้าม)
- **ฮุคใหม่ (broadcast — ถามทุกโมดูล)**: `movPenalty(engine, p, from)` → โทษระยะเดิน (`action.movOf` · from = ช่องเริ่มตา) · `walkTrap(engine, p, tile)` → ข้อมูลกับดัก + `springTrap(engine, p, tile, info)` (เดินเหยียบ = หยุดช่องนั้น การเดินจบ — ก่อนชนคนที่มองไม่เห็น)
  · `onForcedMove(engine, u)` (`Ice.pushUnit` / `Ice.forcedSlides` ทุกการย้าย ไม่ว่าจะลงน้ำแข็งไหม) · `boardPublic(engine)` → คีย์ที่รวมเข้า `state.board`
- **ชั้นพื้นมีอายุ** (`match.board.diego = { oil, fire, ash }` "x,y" → { owner, until }): หายเองเมื่อเปลี่ยนแผนที่ · ไฟลาม = BFS แอ่งน้ำมันติดกัน 4 ทิศ · ต้นเทิร์นยืนบนกองไฟ = `onRoundStartTick` (ลงกับ p เอง)
- **กับดักล่องหน** (ตาข่าย — `p.diego.nets`): state เห็นเฉพาะเจ้าของ (`diegoState(engine, p, viewer)`) · เอฟเฟกต์วาง = `engine.boardFxTo([id], …)` (ส่งเฉพาะคน)
- **ม้ากลาง** `characters/_horse.js` (`fresh / setMounted / absorb / action / toggle / cooldown`) — ดิเอโก้ใช้ · ไจโรยังมีโค้ดม้าของตัวเอง (กติกาเดียวกัน)
- **ปุ่มหลายตัวเลือกที่ไม่กินโควตา + ไม่ล็อกการเดิน**: `skipsTurnQuota` + `ignoresTurnQuota` + `keepsMove` ของ tier นั้น · โควตาเฉพาะตัวนับใน `canUseSkill` (คลังเครื่องมือ 2 ครั้งต่อเทิร์น)
- เอฟเฟกต์: `engine.boardFx("diegoFx", { kind, id, color, … })` ตามสัญญา §7.12 · `frozen: true` = เกิดระหว่างหยุดเวลา (client ค้างของกลางอากาศจน `timeResume`)
