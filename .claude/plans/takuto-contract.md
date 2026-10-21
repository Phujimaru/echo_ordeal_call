# สัญญาข้อมูล server ↔ client — ซึนาชิ ทาคุโตะ (`takuto` · ระดับพิเศษ · unique)

กติกาเต็มอยู่ GRID_PLAN §7.16 · ไฟล์นี้บอกแค่ "ข้อมูลที่ส่งไปมา" ให้สองฝั่งเขียนคู่ขนานได้
สื่ออยู่ `client/public/characters/takuto/` (junction ไป `C:\Echo\client\public\characters\takuto` — gitignored ห้ามลบ)

## 0. ภาพรวมตัวละคร (ย่อ)
- ร่างคน (ตัว 1×1 · เดิน 5) ใช้สกิลไม่ได้เลย · ห่วงเวลาซีโร่เริ่ม → คลิปแปลงร่าง → **ทาวเบิร์น** ตัว 3×3 (เดิน 5 · ช่วงมิติพังทลาย 8) อยู่จนจบเกม
- ดาบ 2 เล่ม (สกิลพื้นฐาน · ถือพร้อมกันได้) ลอยรอบตัวทาวเบิร์น · ช่วงมิติพังทลายถือครบ 2 เล่ม = รวมเป็น "ดาบแห่งการพิพากษา" (ปาไปไกล 4 ช่อง)
- ห่วงเวลาซีโร่มีช่วงใหม่ "มิติซีโร่ค่อยๆ พังทลาย" 5 เทิร์นหลังผนึกอันสุดท้ายแตก (เฉพาะเกมที่ทาคุโตะยังมีชีวิต) — ยังอยู่สนามซีโร่ · เพลง `takuto_theme`

## 1. สื่อ
| คีย์ | ไฟล์ |
|---|---|
| รูปโปรไฟล์ร่างคน | `/characters/takuto/takuto.webp` |
| รูปทาวเบิร์น (กระดาน/ปก) | `/characters/takuto/tauburn.webp` |
| ปกช่วงมิติพังทลาย | `/characters/takuto/takuto_zero.webp` (ทาคุโตะถือดาบ 2 เล่ม) |
| ไอคอนสกิล | basic `takuto_zero.webp` · ตัวเลือก `sword_emerald.webp` / `sword_sapphire.webp` · secondary `takuto_skill2.webp` · ult `takuto_skill3.webp` |
| คลิป (server คิวเอง) | `takuto_tauburn.mp4` 29.4 วิ (แปลงร่าง) · `takuto_passive.mp4` 13.1 (เฟส 2) · `takuto_passive2.mp4` 4.9 (เฟส 4) · `takuto_passive3.mp4` 10.5 (ห่วงเวลาถูกทำลาย) · `takuto_duosword.mp4` 1.1 (ดาบรวมร่าง) · `takuto_duosword_hit.mp4` 12.9 (ปาดาบ — ก่อนฉากตีทุกครั้ง) · `takuto_skill2.mp4` 17.3 · `takuto_skill3.mp4` 14.9 · `takuto_skill3_extra.mp4` 18.4 |
| เพลง | `takuto_theme.m4a` (−8.0 LUFS → LOUDNESS_GAIN ≈ 0.5) — คีย์เพลง `takuto_theme` |
| เสียงเรียกดาบ (มีแล้ว) | `sfx/takuto_sword_emerald.mp3` (9.3 วิ — เสียงพากย์เรียกดาบเขียว) · `sfx/takuto_sword_sapphire.mp3` (4.1 วิ — ดาบฟ้า) |
| เสียงเอฟเฟกต์ (client ทำ — สังเคราะห์เอง ไม่ดาวน์โหลด) | ตาราง §5 + `attackSound` §6 — วางไฟล์ที่ `sfx/<คีย์>.mp3` แล้วลงทะเบียนใน `client/src/audio.js` FILES |

## 2. state ต่อผู้เล่น (`state.players[i]`)
- `takuto` (เฉพาะตัวทาคุโตะ):
  ```
  { form: "human" | "tauburn",
    emerald: 0..5,      // เทิร์นที่เหลือของดาบเอเมอรูด (0 = ไม่มี) — ซ้ำกับ statuses.takutoEmerald
    sapphire: 0..5,     // ดาบแซฟไฟร์ — statuses.takutoSapphire
    judgment: bool,     // ดาบรวมร่างเป็นดาบแห่งการพิพากษาแล้ว (วาดดาบใหญ่ดาบเดียวแทน 2 เล่ม)
    dash: bool,         // ปลดล็อกพุ่งต้นตาเดินแล้ว (ตั้งแต่เข้าเฟส 2)
    secCd, ultCd,       // คูลดาวน์ (เทิร์น)
    collapse: bool }    // ช่วงมิติพังทลาย (ท่าไม้ตายเปลี่ยนเป็น "ฉันยังมองเห็นอยู่" · เดิน 8)
  ```
- สถานะใหม่ใน `statuses` (ต้องมี `STATUS_INFO` ใน Game.jsx — ชื่อ + ไอคอน ไม่มีคำอธิบาย): `takutoEmerald` "ดาบเอเมอรูด" · `takutoSapphire` "ดาบแซฟไฟร์"
- ปุ่มสกิลพื้นฐานเป็นปุ่มหลายตัวเลือก (`skillPub` → `choices` แบบเซลิน): `emerald` · `sapphire` — `{ key, name, img, desc, area: {kind:"self"}, cost: 2, cd, locked, on, free: true }` (`on` = ถืออยู่)
- `actions` (ปุ่มพิเศษบน HUD — ฮุค hudActions) **ฟิลด์ใหม่ `tiles`**:
  `[{ key: "dash", icon: "💨", name: "พุ่ง", tiles: [{ x, y }], disabled }]`
  → client: กดปุ่มที่มี `tiles` = เข้าโหมดเลือกช่องบนกระดาน (ไฮไลต์ช่องใน tiles — ตำแหน่ง = มุมบนซ้ายของตัว 3×3 ให้วาดกรอบเท่าตัวตอนชี้) · คลิกช่อง = `socket.emit("charAction", { key, tile: { x, y } })` · Esc/คลิกขวา = ยกเลิก
  (ไม่มี `tiles` = กดแล้วส่ง `{ key }` ทันทีแบบเดิม — ม้าของไจโร/ดิเอโก้)

## 3. ห่วงเวลาซีโร่ (`state.zero` — `publicInfo`)
- เพิ่ม `collapse: { left, total: 5, seq }` ระหว่างช่วงมิติพังทลาย (`active` ยัง true · `stage` = 4 · `seals` แตกหมด · `atk` = 0 · ไม่มีของฟื้นพลังชีวิต/ฟ้าผ่า)
- `audioPolicy.musicForState`: `zero.collapse` อยู่ = **ไม่เล่นเพลง zero_N** ให้ `state.skillMusic` (`takuto_theme`) เล่นแทน
- `zeroTheme.js`: ช่วงพังทลายวาดสนามซีโร่ "ค่อยๆ พังทลาย" ตาม `1 − left/total` — รอยร้าวลามเพิ่มทุกเทิร์น · เศษหินลอยหลุดขึ้นฟ้า · ขอบสนามแตกเป็นช่องว่างดำ (ภาพเท่านั้น ไม่กระทบการเดิน) · สีจางลงเรื่อยๆ
- ฉาก: ผนึกอันสุดท้ายแตก = ฉาก `break` เดิม (stage 4) → คลิป `takuto_passive3` · ครบ 5 เทิร์น = ฉาก `release` เดิม (กลับสนามเดิม)

## 4. การเลือกเป้า (useSkill)
| สกิล | area | ส่ง |
|---|---|---|
| ดาบอันเจิดจรัด (`emerald`/`sapphire`) | `self` | `form` |
| ดาบประกายแสง | `{ kind: "line", len: 5, width: 3, hostile: true }` | `dir` |
| ทาวววว มิสไซล์ | `{ kind: "line", len: 8, width: 1, hostile: true }` | `dir` |
| ฉันยังมองเห็นอยู่ (ช่วงพังทลาย — skillArea/skillPub เปลี่ยนให้) | `{ kind: "aoe", range: <ระยะเดิน 8>, hostile: true }` | – |

## 5. เอฟเฟกต์ — socket `takutoFx` (`engine.boardFx`) · ทุกก้อนมี `{ kind, id, color, at {x,y} (มุมบนซ้าย), size }`
ธีมภาพ: ทาวเบิร์น = หุ่นยนต์ขาว/ดำ/แดง ตาเหลือง (Star Driver) · ดาบเอเมอรูด = เขียวมรกตเรือง · ดาบแซฟไฟร์ = ฟ้าคราม · ดาบแห่งการพิพากษา = ขาวทองผสมเขียวฟ้า · ลำแสง/ระเบิด = แดงชมพู + ขาว
| kind | ฟิลด์เพิ่ม | เสียง (server ส่ง engine.sfx พร้อม) |
|---|---|---|
| `tauburn` | – (แปลงร่างเสร็จ หลังคลิป: วงแสงแดงขาวปะทุ + เส้นพลังรอบตัว 3×3) | `takuto_transform` |
| `summon` | `sword: "emerald"\|"sapphire"` (ดาบโผล่จากวงแสงข้างตัว แล้วลอยไปที่ประจำ) | `takuto_sword_emerald` / `takuto_sword_sapphire` |
| `merge` | – (2 เล่มหมุนเข้าหากัน วาบ → ดาบแห่งการพิพากษา) | `takuto_merge` |
| `vanish` | `sword: "emerald"\|"sapphire"\|"judgment"` (หมดเวลา/ถูกใช้: แตกเป็นละอองสีของดาบ) | `takuto_vanish` |
| `heal` | `amt` (ดาบเอเมอรูดดูดพลัง: ละอองเขียวไหลจากเป้ากลับเข้าตัว) · `big: true` = ฟื้นเฟส 4 (เสาแสงเขียวใหญ่) | `takuto_heal` |
| `dash` | `from`, `to`, `dir` ("up"/"down"/"left"/"right") — พุ่งต้นตาเดิน: เงาซ้อน 3 ชั้น + เส้นความเร็ว · ตำแหน่งใน state เปลี่ยนแล้ว (เลื่อนตัวตาม) | `takuto_dash` |
| `flash` | `from`, `to` (ตำแหน่งใหม่ของทาคุโตะ), `dir`, `tiles` (แนว 5×3), `targetId`, `targetFrom`, `targetTo` — ดาบประกายแสง: ดาบคู่ไขว้ พุ่งเป็นแสงเขียวฟ้าตามแนว → ฟันกากบาทที่เป้า → สลับตำแหน่ง (เป้าวาบไปจุดเดิมของทาคุโตะ) · ดาเมจลงตอนจบฉาก (server พัก 1.6 วิ) | `takuto_flash` |
| `missile` | `dir`, `tiles` (แนว 8×1) — ทาวววว มิสไซล์: ชาร์จที่อกแดง → ลำแสงแดงขาวหนาพุ่งยาว 8 ช่อง (server พัก 1.8 วิ ก่อนดาเมจลง) | `takuto_missile` |
| `steal` | `targetId`, `from` {x,y} (ตัวเป้า), `amt` (แต้มที่ได้), `extra` (ดาเมจส่วนต่าง) — ลูกแสงฟ้าลอยจากเป้ามาเข้าตัว | `takuto_steal` |
| `blast` | `range`, `tiles` (ทุกช่องในรัศมี) — ฉันยังมองเห็นอยู่: แสงขาวรวมที่ตัว → ระเบิดวงกว้างแดงขาวไล่ออกถึงขอบรัศมี + คลื่นกระแทก (server พัก 2 วิ ก่อนดาเมจลง) | `takuto_blast` |

## 6. ตีปกติ (`attackStyle` → ต้องมีตัววาด + `STYLE_MS`/`STYLE_HIT_P` ใน boardDraw.js) · `attackSound`
| ร่าง/ดาบ | style | เสียง |
|---|---|---|
| ร่างคน | null (พุ่งชนกลาง) | null (เสียงกลาง) |
| ทาวเบิร์น ไม่มีดาบ | `takutoPunch` (หมัดหุ่นยนต์กระแทก) | `takuto_atk_punch` |
| ทาวเบิร์น + เอเมอรูด | `takutoEmerald` (ฟันเฉียงเขียว) | `takuto_atk_emerald` |
| ทาวเบิร์น + แซฟไฟร์ | `takutoSapphire` (กวาดฟันฟ้าทั้งด้าน 3 ช่อง — fx.lane = ช่องทั้งด้าน) | `takuto_atk_sapphire` |
| ทาวเบิร์น + ทั้งสองเล่ม (ก่อนรวมร่าง) | `takutoDual` (ฟันคู่เขียวฟ้าไขว้ทั้งด้าน 3 ช่อง — fx.lane) | `takuto_atk_dual` |
| ดาบแห่งการพิพากษา | `takutoJudgment` (ขว้างดาบใหญ่หมุนเป็นวงไปที่เป้า ระยะ ≤ 4 · ปะทะ = เสาแสงทอง) — มีคลิป `duosword_hit` เล่นก่อนฉากตีแล้ว | `takuto_atk_judgment` |

## 7. ค้างบนตัว (BoardCanvas prop ใหม่ `takutos` จาก `p.takuto` — แบบ `ferns`)
`[{ id, x, y, size, emerald, sapphire, judgment, collapse }]` — ดาบลอยข้างตัวทาวเบิร์น (เอเมอรูดซ้าย · แซฟไฟร์ขวา · ขยับขึ้นลงช้าๆ) · judgment = ดาบใหญ่เล่มเดียวลอยด้านหลัง · collapse = ออร่าแดงจางๆ รอบตัว
ร่างคนไม่มีดาบ (ร่างคนถือดาบไม่ได้)

## 8. อื่นๆ
- `CharacterSelect.jsx`: เพิ่ม `takuto` ท้าย `order` ของหมวด special
- เพลงสกิล: server ส่ง `state.skillMusic = "takuto_theme"` ระหว่างช่วงพังทลาย (ฮุค skillMusic)
- ห้ามมีข้อความอธิบายใน UI (CLAUDE.md) · ไม่ต้องทำมือถือ
