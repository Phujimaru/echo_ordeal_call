# Fodlan — brief ร่วมสำหรับผู้ทำแต่ละด่าน (2026-10-27)

Repo worktree: `C:\Echo\.claude\worktrees\mouse-keyboard-movement-bugs-dd8a0f` (branch claude/fodlan-new-map-b25604). **ห้าม commit/push** — ผู้คุมงานรวมเอง.
มีผู้ทำด่านอื่นทำงานพร้อมกันในโฟลเดอร์เดียวกัน — แก้ได้เฉพาะไฟล์ของด่านตัวเอง:

- `server/fodlan/stageN.js` (กติกา) · `server/fodlan/mapN.js` (ผัง + ชนิดช่อง `fd_…` — ข้อมูลล้วน ห้าม require)
- `client/src/board/fodlan/stageN.js` (ธีม/การวาด) · `tests/fodlan-stageN.test.js` (เทสต์ใหม่)
- ไฟล์กลางอื่น: แก้ได้ **เฉพาะที่ระบุในงานของด่านตัวเอง** และแก้ให้น้อยที่สุด · ถ้าต้องการจุดเสียบใหม่ใน `server/fodlan.js` ให้เพิ่มแบบเดียวกับที่มี (Read ก่อน Edit ทุกครั้ง — คนอื่นอาจแก้ไปแล้ว) และบอกในรายงาน

อ่านก่อนเริ่ม: `CLAUDE.md` · `GRID_PLAN.md` §8.5 (สเปกของผู้ใช้ทั้งหมด) · `server/fodlan/README.md` (สัญญาฮุคฝั่ง server) · หัวไฟล์ `client/src/board/fodlan/index.js` (สัญญาฝั่ง client) · `server/fodlan.js` (makeCtx) · `GAME_SYSTEM.md` ส่วนที่เกี่ยว
ตัวอย่างระบบคล้ายกัน: `server/colony.js` / `server/moonCell.js` (อีเวนต์ต้นเทิร์น เตือนก่อน) · `client/src/board/moonFx.js` (ช่องเตือน) · `client/src/board/schoolTheme.js` (ธีมครบชุด + สิ่งกีดขวางของธีม) · `client/src/board/regionThemes.js` (ธีมภูมิภาค T1–T7) · `characters/takuto.js` hudActions ที่มี tiles

กติการ่วม
- กระดาน 14×14 · จุดเกิด 7 จุดบนพื้นธรรมดา ไม่ติดกัน · จุดร้านค้า 4–6 จุดบนพื้นธรรมดา · ต้องผ่าน `tests/terrain.test.js` (ถ้าผังด่านจำเป็นต้องผิดกฎข้อไหน เช่นแม่น้ำแยกกระดาน ให้เพิ่มข้อยกเว้นเฉพาะ area ของด่านในเทสต์นั้นพร้อมคอมเมนต์เหตุผล)
- ความเสียหายไม่ระบุว่าทะลุเกราะ = ลดเกราะก่อน (`ctx.damage(p, n)`) · ตายได้
- ข้อความที่ผู้เล่นเห็นเป็นภาษาไทย · **ห้ามข้อความอธิบายใน UI** — ปุ่ม/ป้ายมีแค่ชื่อ ตัวเลข ไอคอน (บันทึกการต่อสู้ `ctx.log` เขียนประโยคได้ตามแบบเดิม)
- ปุ่ม HUD: `hudActions` คืน `{ key: "fd:…", icon, name, disabled?, tiles? }` — name สั้นๆ (เช่น "ตกปลา")
- ผลค่าต่อคนบน HUD: `playerInfo` คืน `{ badges: [{ key, icon, label, cls? }] }` (label สั้น เช่น "2/3")
- ช่องเตือนกะพริบแดง: `publicInfo` คืน `warn: [{ x, y }]` (index.js วาดให้)
- เหตุการณ์ให้ client เล่นฉาก: `ctx.fx(kind, data)` → client อ่าน `fd.fx` ใช้ `fxT(e, now, ms)` / `fxOnce(e)` (เล่นเสียงครั้งเดียว: `fodlanAudio().sfx(key)` จาก `client/src/fodlan/fodlanAudio.js` — คีย์เสียงดู `.claude/plans/fodlan-sfx-sources.md`)
- หลังแก้ `mapN.js` รัน `node scripts/gen-board-rules.js`
- ภาพ: สไตล์ 2.5D เดียวกับธีมเดิม (วาดด้วย canvas · พิกัดตรรกะ · `P/PA/quad/depthOf` จาก `../boardGeo`) · ให้อารมณ์ตรงกับฉาก 3D ของด่าน (`client/src/fodlan/dioramas/`) · ต้องเบา: ห้ามสร้าง gradient/canvas ใหม่ทุกเฟรมโดยไม่จำเป็น · `lowQ` = ตัดอนุภาค
- เทสต์: `node --test tests/fodlan-stageN.test.js tests/fodlan.test.js tests/terrain.test.js tests/board-rules-sync.test.js` · lint: `npx eslint <ไฟล์ของคุณ>` (ไม่มี error)
- ห้ามแตะ ZERO_ENABLED · ห้ามทำ layout มือถือ

รายงานกลับ (≤ 40 บรรทัด): ไฟล์ที่แก้ (รวมไฟล์กลาง + เหตุผล) · กติกาที่ลงจริง + ตัวเลข · สิ่งที่ตัดสินเอง (ผู้ใช้ไม่ได้ระบุ) · สิ่งที่ยังไม่ได้ทำ/ไม่แน่ใจ · ผลเทสต์
