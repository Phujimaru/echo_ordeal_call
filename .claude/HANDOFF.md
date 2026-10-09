# บันทึกส่งต่องาน ECHO (อัปเดต 2026-10-08 · ระบบกระดานลงครบทุกขั้น)

> สำหรับ session ถัดไป: อ่านไฟล์นี้ให้จบก่อนเริ่มงาน แล้วอ่าน [CLAUDE.md](../CLAUDE.md), [GRID_PLAN.md](../GRID_PLAN.md) (กติกาทั้งหมดที่ผู้ใช้ตัดสินแล้ว) และ [GAME_SYSTEM.md](../GAME_SYSTEM.md) §1–§3 + §17
> คุยกับผู้ใช้เป็นภาษาไทยเสมอ · **commit + push `origin/main` ทุกครั้งที่จบขั้นงาน (ผู้ใช้อนุญาตแล้ว ไม่ต้องถาม)**
> ผู้ใช้ชอบให้แบ่งงานคู่ขนานให้ subagent ได้ (แยกไฟล์กันชัดเจน · งานที่ชนไฟล์เดียวกันใช้ worktree แล้ว merge)

## สถานะ repo (C:\Echo · remote `github.com/Phujimaru/echo_ordeal_call` · branch `main`)

- ย้ายมาจาก `C:\backjact` @ `3b687da` (เริ่มประวัติ git ใหม่) · เหลือตัวละคร `muimi` + `oberon_summer` + ระบบกลาง Mark 42 / ปืน GUTS / การเดินทาง 7 ภูมิภาค / สถานะ Universal · โหมด ffa / duo / trio
- ตรวจล่าสุด: `npm test` **212/212** · build client ผ่าน · `npx eslint .` 0 error
- **Overload Force ถอดออกทั้งระบบแล้ว (ผู้ใช้สั่ง — "ห้ามมี")** `2d12ab7` · yuna ไม่มีโค้ดเหลือ — **ห้ามใส่กลับทั้งคู่** · โฟลเดอร์สื่อ `/overload_force` ยังอยู่เพราะเพลงท่าไม้ตายมุยมิอยู่ในนั้น
- **เกมกระดานแบบ Fire Emblem — GRID_PLAN §13 ลงครบ:**
  - ✅ 1 `board.js` · ✅ 2 วงจรเทิร์น PLAYING → ORDER → ACTION → ATTACKING · ✅ 3 ระยะสกิล `area` · ✅ 4 ร้านบนแผนที่ + กระเป๋า 5 ช่อง + ระยะปืน/Mark 42 (`2b92b94`)
  - ✅ 5–6 หน้าจอกระดานในเกมจริง `client/src/board/BoardStage.jsx` (`ef4a3a2`) — โครง/การทำงานดู GAME_SYSTEM §17 · ผู้ใช้ลองเล่นกับบอทแล้ว เดิน/ตีใช้ได้
  - ✅ 7 server: แผนที่ II–VII + ช่องพิเศษ (`a1dc9a8` merge `79a067a`) — ผัง + รายละเอียดที่ Claude ตัดสินเอง อยู่ใน GRID_PLAN §3.1–§3.2
  - ⏳ 7 ภาพ: ธีมรายภูมิภาค + ภาพช่องพิเศษ + **หมุนกระดาน 4 มุม (ผู้ใช้ขอเพิ่ม)** ใน `boardDraw.js`/`BoardCanvas.jsx` — ทำโดย subagent ใน worktree (ดูหัวข้อ "งานถัดไป")
  - ✅ 8 เอกสาร GAME_SYSTEM (§17 หน้าจอกระดาน) / GRID_PLAN / skill add-character + remove-character
- มือถือ (`vp.w < 768`) ยังเป็นหน้าจอเดิมที่อ่าน SUMMARY/ATTACK — ตามกติกา CLAUDE.md ไม่ทำต่อ

## งานถัดไป / รอผู้ใช้
- ✅ **2026-10-09 (ยังไม่ commit) ผู้ใช้สั่งเร่งจังหวะเกม:** กลางวัน/กลางคืนสลับทุก **3** เทิร์น (`CYCLE_TURNS` เดิม 5) · เปลี่ยนภูมิภาคทุก **5** เทิร์น (`AREA_TURNS` เดิม 10 — ภูมิภาคใหม่เริ่มเทิร์น 6, 11, 16 … ค้างที่ VII ตั้งแต่เทิร์น 31) · ร้านยังปรากฏทุก 5 เทิร์น (1, 6, 11 …) ตรงจังหวะเปลี่ยนภูมิภาคพอดี · client `JOURNEY_TURNS_PER_AREA` (`journey/areas.js`) ต้องตรง `AREA_TURNS` · launch `server-dev` `ECHO_DEV_START_ROUND` 51 → 26 (ยังเป็นภูมิภาค VI) · ตารางวัน/คืนต่อภูมิภาคดู GAME_SYSTEM "การเดินทาง"
- ✅ **2026-10-09 ปล่อย 5.4.2:** มุมบน (bird's-eye) แยกเป็นปุ่มมุมมอง (`view` "tilt"/"top" · localStorage `echo.boardView`) ซูม/เลื่อน/หมุนได้ทุกมุม · ถาดกองการ์ดเป็นกล่องปกติ · **เปลี่ยนภูมิภาค = กระดานซูมออก → รอ RegionTravel ชนผิวโลก → ซูมเข้า** (`BoardStage` shown.fly · ใช้ arenaLandBus เดิม) · รูปใหญ่หน้าคาดการณ์หัวเท่ากันทุกตัว (`bigArtStyle` · `hs` ใน charFace) · หน้าจบเกมใหม่ธีม ORDEAL CALL (`VictoryScreen.jsx` + `victory.css` · ดู `?victory=1|team|draw`)
- ✅ **2026-10-09 ปล่อย 5.4.0:** WASD ก้าวทันที (`move { step }`) · ซูมขั้นที่ 3 มองจากด้านบน (`setPitch` 90°) · กระเป๋าใหม่ `BagScreen` · คำอธิบายย่อร้าน/กระเป๋า (`short`) · กองการ์ดกลางเป็นแถบสไลด์ · เลือกเป้าสกิลเหลือปุ่มยกเลิก · ตัดป้าย "ตาของ X" ข้างล่าง · **เนิฟมุยมิ** (ตีปกติระหว่างดาบสะบั้น +1 · คลื่นดาบยังเท่าพลังโจมตี +3 = 4 · คูลดาวน์ 3) · **กลางวัน/คืนอย่างละ 3 เทิร์น · เปลี่ยนภูมิภาคทุก 5 เทิร์น (6, 11, …)**
  · ✅ 5.4.1: หน้าคาดการณ์ = **แบบ D** (ผู้ใช้เลือก · เลย์เอาต์เดิมไม่มีกล่อง · มีแถบเกราะ) — `BoardScenes.jsx` `ForecastScreen`/`FdSide` · ต้นแบบ `.claude/plans/forecast-variants.html?v=d` · **กับดัก:** คลาส `.ar` ชน `journey/arena/arena.css` ห้ามใช้
- ✅ **2026-10-09 ปล่อย 5.3.3 (แก้บั๊กเดิม):** บางครั้งหน้าเลือกตัวละครไม่มีตัวละคร — server ส่ง `roster`/`positions`/`takenChars` ทันทีตอนเชื่อมต่อ แต่ App ผูก listener หลัง render แรก (เชื่อมต่อเร็ว = ข้อความหลุด) → `socket.js` จำค่าไว้ใน `connectData` แล้ว App อ่านตอนผูก
- ✅ **2026-10-09 ปล่อย 5.3.2 (แก้บั๊ก):** ลูกโลก/วงแหวนหน้าเลือกลำดับ/เลือกตัวลากหมุนไม่ได้ — CSS ฉากลำดับเดินใช้คลาส `.oc-globe`/`.oc-tick` ชนธีม ORDEAL CALL (CSS ของ Game โหลดทั้งแอป) → เปลี่ยนเป็น `toc-*` และ `.pc-hex` → `dpc-*`
  · **กับดัก:** คลาส `oc-*` เป็นของธีมกลาง (`oc/theme.css`) ห้ามใช้ในคอมโพเนนต์อื่น · CSS ทุกไฟล์โหลดรวมทั้งแอป ตั้งชื่อคลาส/keyframes ให้มี prefix เฉพาะเสมอ
- ✅ **2026-10-09 ปล่อย 5.3.1:** เสียงฉากตาเดิน — ตาเรา `effect_sound/notificate_mine.mp3` · ตาคนอื่น `effect_sound/notificate.mp3` (ไฟล์จากผู้ใช้)
- ✅ **2026-10-09 ปล่อย 5.3.0: UI ในเกมแบบใหม่ทั้งหมด** (ต้นแบบที่ผู้ใช้อนุมัติ [.claude/plans/game-ui-redesign.html](plans/game-ui-redesign.html) — สรุปใน GRID_PLAN §11) · server: คาดการณ์มี `hit/crit/backHit/backCrit` + ORDER 6.5 วิ (`ORDER_TIME_MS`) · กฎใหม่ใน CLAUDE.md: ห้ามมีข้อความอธิบายใน UI
  · ดูต้นแบบ: launch config `plans` (python http.server :5180) → `/.claude/plans/game-ui-redesign.html`
- ✅ **2026-10-09 (ยังไม่ได้ปล่อยเวอร์ชัน — ล่าสุดบน R2 = 5.2.1):** กระดาน 14×14 + แผนที่ใหม่ 7 ภูมิภาค (ช่องอันตรายขวางทางหลัก) · กล้องซูมใกล้/เลื่อน/หมุน · **เลิกตีสวน** (เก็บกลไก `counter: true`) · ศัตรูหมด = จบเกมทันที · มุยมิ: คลื่นดาบหลังวีดีโอ + หลบหมด = เสียท่า/คูลดาวน์ + กดซ้ำไม่ได้ + วีดีโออย่างละครั้ง · [STATUS_GUIDE.md](../STATUS_GUIDE.md) สรุปบัฟ/ดีบัฟ/ระยะ · แก้ผลไพ่สีตอนหมดเวลา, หน้าไหว้หลังหลอกนับคลื่นดาบ/ปืน
  · ❓ รอผู้ใช้: ยาต้านสถานะ/ไพ่ฟ้า 1 เทิร์นหมดก่อนกันอะไรได้ · สภาพชาจากปืนได้ผลจริงครั้งเดียว (STATUS_GUIDE §7 ข้อ 2, 5)
- ✅ **ปล่อย 5.2.1 ขึ้น R2 แล้ว** (QA แก้บั๊ก: คลิกช่องหลังตัวหมาก · คัตซีนกลางช่วงจั่วไม่เปิดแต้ม · ค่า mov ไม่บอกใบ้ไพ่แตก · คาดการณ์นับชน −1 · แถบลำดับไม่ทับแถบบน · ชี้ศัตรูนอกระยะเห็นระยะของมัน · ข้อความช่องพิเศษสั้นลง) · ลิงก์ `updates/ECHO-Setup-5.2.1.exe`
- ✅ **ปล่อย 5.2.0 ขึ้น R2 แล้ว** (2026-10-08 · ผู้ใช้สั่ง) — ลิงก์ติดตั้ง `updates/ECHO-Setup-5.2.0.exe` · ธีมภาพ II–VII + หมุนกระดาน (Q/E ใช้ e.code) รวมแล้ว `a612c02` · บั๊กที่ QA เจอหลังจากนี้ → ปล่อย 5.2.1
  · **ไฟล์สื่อใน `client/public` ของ repo นี้คัดลอกมาจาก `C:ackjactclientpublic` เฉพาะที่เกมใช้** (characters/muimi, oberon, oberon(summer), Mark42 · item/guts_key, guts_select_gun · journey/map1–7 · overload_force/overload_force_theme.mp3) — manifest สร้างจากโฟลเดอร์นี้ ห้ามปล่อยถ้าโฟลเดอร์หาย (manifest จะขาดไฟล์) · ไฟล์ตัวละครเก่าบน R2 ยังไม่ได้ลบ (ผู้ใช้ไม่ได้สั่ง)
- รวมงานภาพ (ธีมภูมิภาค + หมุนกระดาน) → ตรวจภาพทุกภูมิภาค/ทุกมุม → push · BoardStage ส่ง prop `rotation` และเรียก `tileCenter(x, y, z, rotation)` ไว้แล้ว (ปุ่ม ⟲ ⟳ + คีย์ Q/E · localStorage `echo.boardRotation`)
- ❓ ถามผู้ใช้: ตัวเลขช่องพิเศษ §3.1 (ลองเล่นแล้วยืนยัน) · หนามพิษตั้งพิษ 2 ในโค้ด (= พิษมีผล 1 เทิร์นจริง) โอเคไหม
- ยังไม่มีแอนิเมชันเฉพาะ: น้ำวนดัน / ลาวา / พิษ / ไถลน้ำแข็งตอนถูกถอย (`attack.push.via`) — ตอนนี้มีแค่ตัวเลขลอย + ตำแหน่งกระโดด
- UI ผู้เล่นที่ยังไม่ได้ออกแบบใหม่ (ผู้ใช้ยังไม่สั่ง): แผงตัวเราซ้ายล่างยังไม่โชว์ค่า "เดิน N / ระยะตี" · StatusModal · หน้าจบเกม
- ระหว่างทดสอบ: `node scripts/dev-bots.js 3` + เปิด `http://localhost:5173/?autoplay=muimi` (เปิด server + client ด้วย launch config `server`/`client`) · ปิดพอร์ตทุกครั้งหลังทดสอบ (ผู้ใช้สั่ง)

## เรื่องค้างเล็กๆ ที่รู้แล้ว (ยังไม่แก้)
- คอมเมนต์ค้าง: `toggleReady` บอก "อย่างน้อย 2 คน" (โค้ดให้ 1) · `characters.js` บอก `passive.trigger` = win/lose/attacked แต่ server ยิงแค่ `roundStart` (win/lose = เดินลำดับแรก/ท้าย ยังไม่มีใครยิง — ถ้าจะใช้ต้องเสียบใน `beginOrder`)
- โค้ดไม่มีผลแล้ว: สถานะ `manaLeech`/`manaRupture`/`drunk` ไม่มีใครสร้าง · กติกาวัน/คืนแบบไม่มีการเดินทาง ไม่มีทางทำงานเพราะทุกโหมดเปิดการเดินทาง — **ห้ามลบระบบวัน/คืน (ผู้ใช้สั่ง)**
- `p.journeyStunRound` ไม่ถูกรีเซ็ตใน `resetCombat`
- โค้ดจอคอมเก่าใน Game.jsx ที่ไม่ได้ใช้แล้วแต่ยังเก็บไว้เพราะมือถือใช้: `SummaryTiers`, `AttackFx`, `AttackCall`, `MobileOpponent`, `isTargetable`/`resolveAttackPick`, ฉาก 2.5D `ArenaBackground`

## เคล็ดลับเครื่องมือที่ใช้ใน session นี้
- **อย่าใช้ heredoc ใน Bash เขียนสคริปต์ที่มี `\\`** (Bash tool ยุบ backslash) — เขียนไฟล์ .js ด้วยเครื่องมือ Write ใน scratchpad แล้วค่อยรัน
- ไฟล์ปน LF/CRLF — สคริปต์แทนข้อความต้อง normalize `\r\n` ก่อนเทียบแล้วคืนรูปเดิมตอนเขียน (helper แบบ `rep(a,b)` + `cut(a,b)` + `save()` ที่ fail ทั้งก้อนถ้าหาไม่เจอ ใช้ได้ดี)
- เทสต์ขับตาเดิน: `engine.setActor(id)` (เข้าตาเดินทันทีไม่มีตัวจับเวลา) · `engine.moveTo/undoMove/attackTarget/waitAction/finishActor/beginOrder/placeOnBoard` · ทุกครั้งที่เรียกฟังก์ชันที่ตั้งตัวจับเวลา ให้ `engine.clearPhaseTimer()` ตาม
- ตัวละครสมมติในเทสต์: `characterId: 'dummy'` (ไม่มีฮุค · เดิน 4 · ตีประชิด)

## ประวัติจาก repo เดิม (ยังเกี่ยวข้อง)

### B. ECHO 5.0 — แจกเกมเป็น exe (กำลังทำ — ขั้น 1 เสร็จแล้ว)
- Electron ในโฟลเดอร์ใหม่ `desktop/` แบบ **เปิดห้องเอง**: "สร้างห้อง" = fork `server.js` ด้วย `utilityProcess.fork` (ไม่ require เข้า main process — ให้ตาข่าย error/listen ใน server.js ทำงานเอง, server พังไม่ลากแอปพัง, ปิดห้อง = kill process ล้างสถานะแมตช์หมด) · "เข้าร่วม" = ใส่ IP แล้วโหลด `http://IP:3000` (หน้าเกมมาจาก host — `client/src/socket.js` ใช้ `io()` ไม่ต้องแก้)
- เพื่อนอยู่ไกลกัน → ใช้ **Radmin VPN** (IP ขึ้นต้น `26.`) — หน้าสร้างห้องหา IP นี้แล้วโชว์ปุ่มคัดลอก · จำ IP ล่าสุด · เตือนเรื่อง Windows Firewall ต้องติ๊ก Public · ดัก `EADDRINUSE` (พอร์ต 3000 ถูกใช้) แล้วบอกเป็นภาษาไทย
- exe ตัวแรก = **5.0.0** · ตัวติดตั้ง NSIS (Setup.exe ~90MB) · build ต้องข้ามไฟล์สื่อใน `client/dist` (`copyPublicDir: false`) และต้องพก `server/`, `characters/`, `characters.js` + dependency ฝั่ง server
- **เลขเวอร์ชันมีที่เดียว = `desktop/package.json`** → ส่งให้ server เป็น env `ECHO_VERSION` ตอน fork
- **ไฟล์สื่อ: ผู้ใช้เลือกแบบ (ก) โหลดครบ ~1.3GB ตอนเปิดครั้งแรก** มีแถบความคืบหน้า + โหลดต่อจากที่ค้างได้ แล้วแคชในเครื่อง
  - ดักคำขอให้ครบทั้ง 8 โฟลเดอร์ใน `R2_DIRS` ([server/app.js](../server/app.js)): characters, item, overload_force, theme_song, effect_sound, image, mooncell, journey — ไม่ใช่แค่ `/characters`
  - ต้องมี `updates/media-manifest.json` บน R2 (path + ขนาด + hash) + สคริปต์สร้างตอนออกเวอร์ชัน — ด่านที่ 2 เทียบกับไฟล์นี้
  - **ความเสี่ยง:** ส่ง mp4 จากแคชผ่าน protocol handler ต้องรองรับ header `Range` เอง ไม่งั้นคัตซีนกรอ/เล่นไม่ได้ — ลองให้ได้ตั้งแต่ต้น
- อัปเดตอัตโนมัติด้วย `electron-updater` (generic provider) · ไฟล์อัปเดต (`latest.yml`, Setup.exe, `.blockmap`) เก็บ **R2 bucket เดิม โฟลเดอร์ `updates/`** · session ของ Claude เข้า R2 ไม่ได้ → ต้องทำสคริปต์ปล่อยเวอร์ชัน (rclone/wrangler) ให้ผู้ใช้รันเอง
- ด่านตรวจ 3 ชั้นทุกครั้งที่เปิด: (1) เช็คเวอร์ชันกับ R2 — เช็คไม่ได้ = ไม่ให้เข้า มีแค่ปุ่มลองใหม่ · มีใหม่ = โหลดแล้วรีสตาร์ท (2) เช็ค/โหลดไฟล์สื่อที่เปลี่ยนตาม manifest (3) ตอนเข้าร่วม ถาม `/version` ของเครื่อง host — ต้องตรงทุกตัวเลข ไม่ตรงไม่ให้เข้า · ไม่อัปเดตกลางแมตช์
- SmartScreen: ไม่ซื้อใบรับรอง — เตรียมคำแนะนำให้เพื่อนกด More info → Run anyway (อัปเดตอัตโนมัติไม่โดนเตือนซ้ำ)
- ข้อสังเกตเล็ก: localStorage แยกตาม origin (= IP ของ host) → ค่าที่จำไว้ เช่นระดับเสียง ต้องตั้งใหม่เมื่อเข้าห้องของ host คนใหม่

**ลำดับงาน:**
1. ✅ endpoint `/version` ใน [server/app.js](../server/app.js) (ตอบ `{ version }` จาก `ECHO_VERSION`, ไม่มี = `"dev"`, `no-store` + CORS `*`) + เทสต์ `tests/version-endpoint.test.js`
2. ✅ `desktop/` โครงพื้นฐาน (Electron 44) — `main.js` (หน้าต่างเต็มจอ, IPC, เข้าร่วม+ด่านที่ 3, จำ IP ล่าสุดใน `%APPDATA%/ECHO/settings.json`), `room.js` (เช็คพอร์ต → `utilityProcess.fork` → รอ `/version`), `preload.js` (เปิด `window.echo` ให้เฉพาะหน้า `file:`), `launcher/` (หน้าแรกภาษาไทย โทนม่วง-ทอง)
   - ผู้ใช้เลือก: **เปิดมาเต็มจอ** (F11 สลับ, F10 ออกจากห้องพร้อม dialog ยืนยัน) · **เข้าห้องได้เฉพาะจาก exe** — exe ต่อท้าย user agent ด้วย `ECHO-Desktop/<เวอร์ชัน>` และ `server/app.js` ปฏิเสธ HTTP (403) + socket (`desktop-only`) ที่ไม่มี token เวอร์ชันเดียวกัน เมื่อรันด้วย `ECHO_VERSION` (`/version` ถามได้เสมอ)
   - รัน dev: `cd desktop && npm install && npm start` (`start.js` ล้าง `ELECTRON_RUN_AS_NODE` ที่เทอร์มินัลของ VS Code/Claude ตั้งค้างไว้) · `ECHO_WINDOWED=1` = ไม่เต็มจอ · `ECHO_ASSET_BASE_URL` = ส่งต่อเป็น `ASSET_BASE_URL` ให้ server ของห้อง (ตอน dev ไม่ตั้งก็ได้ ใช้สื่อใน `client/dist`)
   - ทดสอบแล้วด้วยการขับแอปผ่าน `--remote-debugging-port` (CDP): สร้างห้อง, เข้าห้องตัวเอง, เบราว์เซอร์ธรรมดาได้ 403, หน้าเกมไม่มี `window.echo`, ปิดแอปแล้ว server ปิดตาม, เข้าร่วมด้วย IP ผิดรูปแบบ/ไม่มีห้อง ขึ้นข้อความถูก · **ยังไม่ได้ทดสอบ:** dialog ของ F10 (กดจริง), เล่นข้าม 2 เครื่องผ่าน Radmin
   - หน้า splash ของเกมยังเขียน "เวอร์ชัน 4.0" — ต้องถามผู้ใช้ก่อนออก 5.0.0 ว่าจะเปลี่ยนไหม
3. ✅ แคชไฟล์สื่อ — `desktop/media.js` + `desktop/config.js` (R2 public URL) + `server/mediaDirs.js` (รายชื่อ 8 โฟลเดอร์ ใช้ร่วม server/desktop)
   - manifest: `cd desktop && npm run media-manifest` → `desktop/dist/updates/media-manifest.json` (682 ไฟล์ 1.12GB ณ 2026-10-01 · ข้าม .txt/.md) · เช็คแล้วขนาดไฟล์บน R2 ตรงกับ `client/public` ครบทุกไฟล์ · **ยังไม่ได้อัปขึ้น R2** (ขั้นที่ 4)
   - แคชอยู่ `%APPDATA%/ECHO/media/` + `index.json` · โหลดขนาน 6 ไฟล์ ตรวจ sha256 ลองซ้ำ 3 ครั้ง เช็คพื้นที่ดิสก์ ลบไฟล์ที่ถูกถอด · โหลดค้างแล้วเปิดใหม่ = ต่อจากไฟล์ที่ยังไม่เสร็จ
   - ตอบไฟล์สื่อด้วย `protocol.handle("http")` ที่ **origin เดิมของหน้าเกม** (ไม่ redirect) เพราะถ้าข้าม origin แล้ว canvas โดน taint (**บนเว็บที่ redirect ไป R2 น่าจะพังอยู่แล้ว ยังไม่ได้ยืนยัน**) · header `X-Echo-Media: cache|local` · ไม่มีในแคช → (dev: `client/public`) → R2
   - dev: ไม่ตั้ง `ECHO_MEDIA_MANIFEST` = ข้ามการโหลด ใช้ `client/public` ตรงๆ · exe ใช้ manifest บน R2 เสมอ โหลด manifest ไม่ได้ = เข้าหน้าแรกไม่ได้ (มีปุ่มลองใหม่)
   - ทดสอบในแอปจริงด้วย manifest ย่อย 7 ไฟล์จาก R2 จริง: โหลดครบ, ชื่อไฟล์ไทย+เว้นวรรค, Range 206, กรอวิดีโอ (readyState 4), canvas อ่านพิกเซลได้, socket.io ผ่าน, เปิดรอบสองไม่โหลดซ้ำ · เทสต์ `tests/desktop-media.test.js` · **ยังไม่ได้ลองโหลดเต็ม 1.1GB**
4. ✅ electron-updater + ด่านที่ 1 + build exe + สคริปต์ปล่อยเวอร์ชัน — คู่มือเต็มอยู่ [desktop/README.md](../desktop/README.md) (มีข้อความส่งให้เพื่อนด้วย)
   - `updater.js`: generic provider `R2/updates/` · `allowDowngrade` = เวอร์ชันบน R2 เป็นตัวตัดสิน (ถอยเวอร์ชันได้) · ตรวจไม่ได้ = ไม่ให้เข้า · มีใหม่ = โหลด → "กำลังเปิดโปรแกรมใหม่" 1.5 วิ → `quitAndInstall(silent)`
   - `npm run dist` = `scripts/stage-game.js` (โค้ดเกม 10MB → `desktop/build/game`, `npm ci --omit=dev`, build client ไม่ copy สื่อ) + electron-builder NSIS oneClick ต่อผู้ใช้ → `desktop/dist/ECHO-Setup-<ver>.exe` (~109MB)
   - **กับดัก:** electron-builder ข้าม `node_modules` ใน extraResources → ต้องมีรายการแยก `build/game/node_modules` (มีแล้วใน package.json) · build แบบ `--dir` ไม่สร้าง `resources/app-update.yml` (อัปเดตจะพัง ENOENT) — ทดสอบอัปเดตต้องใช้ build เต็ม
   - ทดสอบ exe ที่ build แล้วผ่าน CDP: ตรวจเวอร์ชันไม่ได้ → ค้างที่ด่าน 1, เวอร์ชันตรง → ผ่านทุกด่าน สร้างห้อง เข้าเกม (สื่อนอกแคช → R2), มี 5.0.1 → โหลดครบถึง "กำลังเปิดโปรแกรมใหม่" (ฆ่าแอปก่อนติดตั้งจริง)
   - `npm run release` (`scripts/release.js`): กุญแจ R2 อ่านจาก `.env` ราก repo (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`) · ห้ามปล่อยเลขเวอร์ชันซ้ำ · `--dry-run` / `--skip-build` / `--prune` · dry-run ล่าสุด: สื่อบน R2 ครบ ไม่ต้องอัปเพิ่ม
   - **r2.dev จำกัดความถี่ (HTTP 429)** — ตัวโหลดสื่อ (ขนาน 4, ลองซ้ำ 5 ครั้งพร้อมรอ) และสคริปต์ release รอแล้วลองใหม่ให้แล้ว · ถ้าเพื่อนหลายคนโหลดพร้อมกันแล้วช้า/ล้ม ทางแก้จริงคือผูก custom domain กับ bucket — **ผู้ใช้ไม่มีโดเมน ตัดสินใจใช้ r2.dev ไปก่อน** (2026-10-01) อย่าเสนอซ้ำ เว้นแต่มีปัญหาโหลดจริง
   - ยังไม่มีไอคอนโปรแกรม (ใช้ไอคอน Electron) — รอผู้ใช้ส่งรูป
   - ✅ **ปล่อย 5.0.0 ขึ้น R2 แล้ว** (2026-10-01) bucket `echo-characters` · กุญแจอยู่ใน `.env` (ผู้ใช้เลือกใช้ชุดเดิม) · ลิงก์ตัวติดตั้ง `https://pub-246229b6130d42e19ea95765c029663e.r2.dev/updates/ECHO-Setup-5.0.0.exe`
   - ✅ ลบไฟล์สื่อเก่าบน R2 แล้ว 154 ไฟล์ (620MB: ตัวละครที่ถูกถอดรวม musashi + ไฟล์ไม่ได้ใช้) ด้วย `npm run release -- --prune-only` · โฟลเดอร์ `_backup_audio/` `_backup_video/` ใน bucket ไม่ได้แตะ
5. build 5.0.0 แล้วลองเล่นจริง 2 เครื่องผ่าน Radmin — **ยังไม่ได้ทำ** (ผู้ใช้จะลองเอง)

### ถอนการติดตั้งแล้วลบไฟล์เกมด้วย (✅ ปล่อยเป็น 5.0.1 แล้ว 2026-10-01)
ผู้ใช้สั่ง: ถอนการติดตั้ง = ลบไฟล์เกมที่โหลดมาด้วย **แต่ห้ามลบอะไรนอกโฟลเดอร์ของเกมเด็ดขาด** (กลัวแบบข่าว uninstaller ลบทั้งไดรฟ์)
- ไฟล์: `desktop/installer.nsh` + `desktop/package.json` (`nsis.deleteAppDataOnUninstall: true`, `nsis.include: "installer.nsh"`) · ✅ `npm run release` 5.0.1 ขึ้น R2 แล้ว (latest.yml = 5.0.1 · ลิงก์ติดตั้งใหม่ `updates/ECHO-Setup-5.0.1.exe`)
- macro `customUnInstall` ทำงาน**ก่อน** electron-builder ลบไฟล์ (`templates/nsis/uninstaller.nsh`) → Abort = ไม่มีอะไรถูกลบ · ด่าน: `$INSTDIR` ต้องลงท้าย `\echo-desktop` และ (เฉพาะถอนจริง ไม่ใช่อัปเดต) ต้องมี `ECHO.exe` · ตอนอัปเดตไม่บังคับ `ECHO.exe` เพราะถ้า Abort ตอนอัปเดต ตัวติดตั้งจะวนลอง 5 รอบแล้วล้ม
- **`$INSTDIR` ของตัวถอนมาจาก registry** `HKCU\Software\4e959771-d971-5c37-9ea6-6ef8e009d21b` ค่า `InstallLocation` (`multiUser.nsh`) ไม่ใช่ `_?=` — ทดสอบด่านต้องแก้ค่านี้ ไม่ใช่ก๊อปตัวถอนไปที่อื่น
- ผลทดสอบเก่าที่ว่า "macro ไม่ทำงาน" ผิด — build debug ยืนยันว่า macro รัน + `DELETE_APP_DATA_ON_UNINSTALL` ถูก define
- ทดสอบผ่านทั้งหมด (`/S`): ถอนจริง → โปรแกรม/`%APPDATA%\ECHO`/updater/ทางลัด/registry หาย โฟลเดอร์ข้างเคียงชื่อคล้ายกันยังอยู่ · ติดตั้งตัวเก่าจาก R2 แล้วติดตั้งตัวใหม่ทับ (กรณีเพื่อน) → ไฟล์เกมยังอยู่ ตัวถอนถูกเปลี่ยนเป็นรุ่นใหม่ · ติดตั้งตัวใหม่ทับตัวใหม่ → ไฟล์เกมยังอยู่ · `InstallLocation` ชี้โฟลเดอร์ชื่ออื่น หรือชี้ `...\echo-desktop` ที่ไม่มี `ECHO.exe` → ยกเลิก ไม่มีอะไรหายเลย
- เพื่อนที่ใช้ 5.0.0 ไม่ต้องติดตั้งใหม่ — อัปเดตอัตโนมัติเป็น 5.0.1 แล้วได้ตัวถอนใหม่ (ถ้าถอนก่อนได้อัปเดต `%APPDATA%\ECHO` จะค้าง ต้องลบเอง)
- **เขียน .nsh ด้วยเครื่องมือ Write เท่านั้น** — ผ่าน Bash/Python heredoc แล้ว `$\r$\n` / backslash เพี้ยน · ตัวติดตั้งเปิดแอปเองหลังติดตั้ง (แม้ `/S`) ปิดด้วย `taskkill //F //IM ECHO.exe //T` · ทดสอบในเครื่องผู้ใช้ให้ย้าย `%APPDATA%\ECHO` (1.2GB ของจริง) ไปสำรองก่อน

### C. ECHO 5.1 — ธีม ORDEAL CALL (แทน Avalon) · branch `feat/ordeal-call` (2026-10-01)
✅ **5.1.27** (2026-10-05): แก้ Echo — ท่าไม้ตาย/สนาม/เพลงทำงานเองก่อนเทิร์น 1 (ตัวนับรอบเทียบ 0 >= 0) · ระหว่างสนามราชินี: การ์ด Echo → แถบเลือดบอสเหนือหัว (`EchoBossBar`) · ตัวราชินีต่ำลง · การ์ดคนอื่นย้ายสองข้างจอ (`echoSideSlots`) · กองไพ่เป็นลิ้นชักขวา · ตีฟรีกดการ์ดศัตรูได้ทันที (`targetChain.echoFreeIds`)
✅ **5.1.11** (2026-10-02): แต้มสกิล/ทรัพยากรต่อชิดใต้แผงตัวละครเป็นแท่งเดียว (`.hud-prof-stack`) · การ์ดคู่แข่งขยายตามจอเท่า HUD (`arenaCardZoom(W,H)`, ACS 0.9) · ล็อกเป้าใหม่ (`TargetLock` นอก clip-path ของการ์ด + `HexLock` + `.pc-targetable`, CSS `.tl-*` ท้าย index.css · มือถือใช้ `TargetLockLegacy`)
✅ **5.1.10** (2026-10-02): HUD สุดท้าย = แผงตัวละครหกเหลี่ยม (E1) + แผงแต้มสกิลแยกชิดใต้ + ตราสกิลหกเหลี่ยม (S2) + ปุ่มกระเป๋ารูปอย่างเดียว/ร้านค้ามีไอคอน + UI ขยายตามจอ (z = clamp(min(h/810, w/1376), 0.6, 1.6)) + การ์ดคู่แข่งหกเหลี่ยมใหญ่ขึ้น (`arenaCardZoom`, `cardX` กันล้นจอ, วงที่นั่งหดตามจอแคบ) · ดีไซน์ทั้งหมดใน canvas หน้า "การ์ดโปรไฟล์" ·  **สนามครบ 7 ภูมิภาค** (`journey/arena/areas/area4-7.js` + `art4-7.jsx` + css · registry `areas/index.js` · ตัวช่วยร่วม `arenaKit.js`) · **จอกระพริบ**: คัตซีนแทนกระดานทั้งจอ → สนาม mount ใหม่แล้วพุ่งลงซ้ำ (ม่านขาว) — `arenaLandBus` จำภูมิภาคล่าสุด (`shouldLandOnMount`, `arenaLandDelay`, Game อ่าน seq ด้วย `useSyncExternalStore`) + เลิก filter ต่อชิ้น · ฉากพุ่งลง ~5 วิ (เกลียวมองตรงลง → เอียง → คลื่นกระแทก) และรอสัญญาณ `requestArenaLand` จาก RegionTravel ตอนเปลี่ยนภูมิภาค · การ์ดหลบกองไพ่กลาง (`stackCards` นับกองไพ่) · **HUD ตัวเราใหม่** `screens/hud/SelfHud.jsx` (+HudTopBar, สถานะแนวตั้งเลื่อนลง, preview dev `?hud=1` / `?hud=1&game=1`) — แผงเลื่อนลงตอนเลือกเป้า (รายการ state ใน `pickingTarget`, ไม่รวม bardPending) / ตอนเราโจมตี (`hudAway`)
✅ **5.1.9** (2026-10-02): สนาม 2.5D เปลี่ยนเป็น**กล้องก้ม 30°** (ผู้ใช้: 55° ดูแบนเหมือน 2D) — `arenaCamera` e30 p1300 R590 + `oy` (perspective-origin ใต้จอ = shift lens เห็นเส้นขอบฟ้า) · แนวเนินไกลปิดขอบพื้น · การ์ดผู้เล่นไม่ทับกัน: `stackCards` ยืดเส้นแสงที่นั่งไกลให้การ์ดลอยพ้นใบใกล้ (`bottom`/`stem`) · **ฉากพุ่งลงจากฟ้า** (`DiveSky` + `arLandPlane` ~3.4 วิ หลัง mount ใต้แฟลช: ฟ้า+เมฆแตก+เส้นความเร็ว → ซูมมองตรงลง → เอียงกล้อง → ป๊อปอัป → การ์ด/กองไพ่หล่นลงที่นั่ง `arSeatIn`, `ARENA_SEAT_IN_S`)
✅ **5.1.8** (2026-10-02): **สนามประลอง 2.5D ภูมิภาค I–III** (`client/src/journey/arena/`) — มุมกล้องเฉียง 55° (ผู้ใช้เลือก) · พื้น CSS perspective+rotateX · ของตั้งเป็นป้ายหันหน้ากล้อง วางด้วยสูตร `proj` เดียวกับพื้น (`arenaData.js`) · ความลึก: ยกพื้นเป็นชั้น (`cyl`), ของไกลเบลอ/จาง, ของบังหน้ากล้อง, พารัลแลกซ์ (ชั้นพื้นไม่แกว่ง เพราะการ์ดผู้เล่นต้องตรงฐานที่นั่ง) · ร่อนลงตอนเข้าภูมิภาค (`.ar-land`) · ที่นั่ง: คนอื่นครึ่งวงด้านไกล เราใกล้กล้อง — `arenaLayout` ให้ทั้ง Game.jsx (การ์ด slot[3]="bottom", กองไพ่บนแท่นกลาง) และฉากหลัง · ภูมิภาค IV–VII ยังใช้ JourneyBackdrop เดิม · ต้นแบบดีไซน์ใน canvas https://claude.ai/artifact/J3mAm1EbTqtK8wmYbhh47s · หน้าดู dev: `?arena=1..3&n=0..6&night=1&lowq=1`
✅ **5.1.7** (2026-10-02): ฉากเปลี่ยนภูมิภาค — เส้นทางที่เดินมาแล้ว (I → … → ต้นทาง) ค้างบนโลก + จุดตรงภูมิภาคที่ผ่าน แล้วค่อยลากเส้นช่วงใหม่ (`RegionTravel.jsx`)
✅ **5.1.6** (2026-10-02): ฉากเปิดแมตช์ไม่ตัดหลังโหวตโหมด (ลูกโลกร่วมลูกเดิม, `oc/intro/screenGhost.js` จางหน้าเลือกโหมด, การ์ดโคจรรอบโลก)
✅ **5.1.5** (2026-10-02): การ์ดรายละเอียดตัวละครแขวนบนเส้นโคจรรอบภาพหกเหลี่ยม (`layoutArc`, `ARC_OFF` ต้องตรง `--cs-arc-off`) · `oc/intro/MatchIntro.jsx` = เปิดตัวผู้เล่นรอบลูกโลก + ดิ่ง (canvas เดียว, App: state `intro`, `startPendingJourney()` คืน `{area,durationMs}`, `onHandoff`) · `RegionTravel.jsx` = เปลี่ยนภูมิภาค (ซูมออก → เส้นเดินทาง → ชื่อ → ดิ่งกลับ) · ลบ GameIntro / GlobeDive / JourneyMap / MapArt / mapGeometry / Emblem + เพลง journey_map
📋 **แผนรอทำ (อีก session):** เข้าฉากด่านให้ลื่น ไม่ตัดฉับหลังฉากดิ่ง → [.claude/plans/scene-loading-plan.md](plans/scene-loading-plan.md)
✅ **5.1.3** (2026-10-02): ห้องรอ — สวิตช์ขวาบนลงมาใต้ปุ่มเสียง/เมนู · เลือกโหมด — ไม่เลือกให้ก่อน, กดหมุด=ซูม+แผง, กดที่ว่าง/Esc=ถอย, ไม่มีอีโมต, ป้ายหมุดแค่ชื่อและกรอบต่างกันทุกโหมด, ย้อนกลับซ้ายล่าง · เลือกตัว — ตัวกรองเป็นปุ่มแยกไม่มีตัวเลข ซ่อนตอนเลือกตัว, โลกใหญ่ขึ้น, ยืนยันขวาล่าง, รูปโหลดล่วงหน้าตั้งแต่หน้าเลือกลำดับ (`oc/charselect/portraits.js` createImageBitmap ทีละ 2) + เส้นวงวาดตัวเองก่อนการ์ดโผล่
✅ **5.1.2** (2026-10-01): **ลูกโลกร่วม** `globe/SharedGlobe.jsx` — App วาง canvas เดียวช่วง setup/character/connecting/lobby, `GlobeCanvas` ยืมโลกร่วม (div โปร่งใสรับเมาส์ผ่าน `core.setEventTarget`, `scopeCore` เก็บกวาดของ 3D/listener ตอนออกหน้า) ใช้แทนม่าน (`GLOBE_SCREENS` ใน TransitionCurtain) · เสียงคลิกทุกการกด (`installClickSound` ใน audio.js) · เมนูข้างปุ่มเสียง = ออกจากห้อง/ออกกลางเกม (`window.echoApp` ใน preload เฉพาะหน้าเกม) · launcher: แถบโหลดจาง, ปุ่มเสียง+เมนู, ส่ง `vol` ใน hash · เลือกลำดับ: ไม่มีลูกศร, กดที่ว่าง/Esc = คืนที่นั่ง (`reserve {position:null}`) · เลือกตัว: แผงขึ้นเมื่อเลือก, การ์ดบินออกจากวง, ตัวกรองหมวดใหม่ (มีแถว "ทั้งหมด") · ห้องรอใหม่: ที่นั่งเรียงรอบโลก ปุ่มพร้อมขวาล่าง · เล่นคนเดียวผ่านหน้าเลือกโหมด (`startSoloTest`, ffa เล่น 1 คนได้)
✅ **5.1.1** (2026-10-01): แก้พื้นเทาตอนหน้าเกมโหลด (body + `<html style>`) · แผงเลือกโหมดหลุดไปมุมซ้ายบน = ลำดับ CSS (`main.jsx` ต้อง import `oc/theme.css` ก่อน App) · กดหมุดโหมด = ดูเฉยๆ โหวตที่ปุ่ม · เลือกตัวละคร: ไม่เลือกให้ก่อน, วงโคจรแบบอะตอม, กดหมวด/การ์ด = ซูมเหลือวงเดียว, กดที่ว่าง/Esc/ปุ่ม = ถอยกลับ · ซาโทรุหมวดง่าย ลบหมวดยากสุดขีด · lobby5 เริ่มตั้งแต่หน้าเลือกลำดับ · หน้าเลือกลำดับ: โลกใหญ่ก่อน เลือกที่นั่งแล้วค่อยมีแผง
✅ **ปล่อย 5.1.0 ขึ้น R2 แล้ว** (2026-10-01, build จาก branch นี้ — ยังไม่ merge เข้า main) · ลิงก์ติดตั้ง `updates/ECHO-Setup-5.1.0.exe` · อัปเพลงใหม่ 2 ไฟล์แล้ว
ต้นแบบที่ผู้ใช้อนุมัติ: artifact `https://claude.ai/artifact/Tj8U5YdrUD6XGPeUJxqwcV` · ขาวเด่น ฟ้าแซม ม่วง ECHO เป็นสีเน้น · ในเกมแผงน้ำเงินเข้ม
- **ของกลาง:** `client/src/globe/globeCore.js` (ลูกโลก three.js ใช้ทุกหน้า + launcher ผ่าน iife) · `GlobeCanvas.jsx` · `client/src/oc/theme.css` (โทเคน `--oc-*`) · `oc/ui.jsx`
  - three r186 = แสงแบบ physical + sRGB — ค่าแสงจูนแล้ว · ShaderMaterial ต้อง `#include <colorspace_fragment>` ไม่งั้นสีเข้มเพี้ยน
- **flow ใหม่:** launcher (เปิดโปรแกรม → แตะเพื่อเริ่ม → หน้าแรก → สร้างห้อง/เข้าร่วม) → เกมเริ่มที่ "เลือกลำดับผู้เล่น" (ลบ Splash ในเกมแล้ว) → เลือกตัวละคร (การ์ดโคจรรอบโลก หมวดละวง) → ห้องรอ (โลกกลาง + อีโมต) → เลือกโหมดบนโลก → จัดทีม → `oc/intro/MatchIntro.jsx` (5.1.6: ใช้**ลูกโลกร่วม**ต่อจากหน้าเลือกโหมด — "gameintro" อยู่ใน `GLOBE_SCREENS`, ระหว่างฉากไม่ render `<Game>` · การ์ดผู้เล่นไหลเข้าโคจรรอบโลก → ไหลออก → ดิ่ง · `<Game>` mount ครั้งเดียวที่จังหวะชนใต้แฟลช) → กระดาน · เปลี่ยนภูมิภาค = `RegionTravel.jsx` (ลบ JourneyMap/GameIntro/GlobeDive แล้ว)
- **เพลง:** `main5` เฉพาะใน launcher (ไฟล์พกใน `desktop/launcher/vendor/`, autoplayPolicy) · เข้าห้องแล้ว = `lobby5` ทันทีตั้งแต่หน้าเลือกลำดับ ถึง LOBBY/TEAM_* + intro (`musicForState(..., {intro})`) · กลไก `#music=main5&mt=` (`applyHandoff`) ยังอยู่แต่ไม่ได้ใช้แล้ว (ผู้ใช้สั่งเปลี่ยนเพลงทันทีที่เข้าห้อง)
- **launcher vendor:** `desktop/scripts/build-launcher-vendor.js` (vite `client/vite.globe.config.js` → `globe.js` + main5.0.mp3 + โลโก้) รันอัตโนมัติใน start.js / stage-game.js · gitignore แล้ว
- **อีโมตห้องรอ:** socket `lobbyEmote {emoji, dir}` → broadcast `{emoji, dir, color, playerId}` (`server/lobby.js relayLobbyEmote`, จำกัด 1 ครั้ง/600ms) · เทสต์ `tests/lobby-emote.test.js`
- **กฎข้อความ (ผู้ใช้สั่ง):** หน้าจอมีแค่หัวข้อ/ป้าย ห้ามประโยคอธิบาย ห้ามคำแปลก/ศัพท์ธีม · ห้าม letter-spacing กับภาษาไทย · ห้ามคำ "Blackjack Skill Battle"
- **ยังค้าง/ข้อสังเกต:**
  - server `view.js` ยังส่งข้อมูลตัวละครของทุกคนช่วงก่อนเริ่มเกม (มีมาก่อน) — UI ไม่แสดง แต่ถ้าจะซ่อนจริงต้องตัดที่ server
  - ห้องรอ: ผู้ใช้ยังไม่อนุมัติโครงหน้า (ขอดูคร่าวๆ ก่อน) · ส่วน persona `p-*` ใน index.css ยังม่วงเดิม · ArenaBackdrop เปลี่ยนสีแล้วแต่ยังเป็นภาพปราสาทเดิม
  - ระหว่างทดสอบ agent เขียนทับ `%APPDATA%\ECHO\settings.json` lastHost เป็น 127.0.0.1 (แจ้งผู้ใช้แล้ว)

## ปัญหาที่มีมาก่อน (ไม่ใช่จากงานนี้)
- vite เตือน chunk ใหญ่กว่า 500 kB

## เคล็ดลับเครื่องมือ (เครื่องนี้ Windows + Git Bash)
- **Bash tool ยุบ `\\` เป็น `\` ทั้งใน heredoc และ `node -e '...'`** — regex ที่มี backslash ให้เขียนเป็นไฟล์ .js ใน scratchpad แล้วค่อยรัน (เคยทำให้ Game.jsx เสียหายมาแล้ว ต้อง restore)
- ไฟล์ปน LF/CRLF (`add-character/SKILL.md`, `VictoryScreen.jsx` เป็น CRLF) — สคริปต์แทนข้อความต้อง normalize ก่อนเทียบ
- build หน้าเกมโดยไม่ copy ไฟล์สื่อ 1.8GB: ใน `client/` รัน
  `node --input-type=module -e "import { build } from 'vite'; await build({ build: { outDir: '<scratch>', emptyOutDir: true, copyPublicDir: false } })"`
- เช็คชุดเต็ม: `npm test` · `npx eslint .` · build ด้านบน
