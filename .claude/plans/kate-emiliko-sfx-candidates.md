# เคท & เอมิลิโกะ — เสียง Mixkit (ผู้ใช้อนุญาตแล้ว 2026-10-13 · ใช้ตัวหลักทุกคีย์)

ดาวน์โหลดแล้ว (พรีวิว mp3) → `.claude/plans/kate-emiliko-sfx-src/<id>.mp3` · ตัดต้นเงียบ/ตัดความยาว/เฟดท้าย/loudnorm −19 LUFS mono → `client/public/characters/kate_emiliko/sfx/ke_*.mp3`
ซ้อน: ke_wings = 2697 + 1469 (หน่วง 0.35 วิ) · ke_hit_vase = 759 + 1311 · เสียงสังเคราะห์เดิมสำรองไว้ที่ `sfx-src/synth/`

ตอนนี้ทุกคีย์ `ke_*` ใช้เสียงสังเคราะห์จาก `node scripts/gen-kate-sfx.js` → `client/public/characters/kate_emiliko/sfx/ke_*.mp3`
รายการนี้คือไฟล์ Mixkit (ฟรี · Mixkit Sound Effects Free License ใช้ในเกมได้ ไม่ต้องให้เครดิต) ที่น่าจะเข้ากับท่ามากกว่าเสียงสังเคราะห์
- Mixkit ไม่มีหน้าแยกต่อเสียง — "หน้า" = หน้าหมวดที่มีเสียงนั้น · id = เลขของไฟล์
- พรีวิว (mp3 ฟังในเบราว์เซอร์ได้): `https://assets.mixkit.co/active_storage/sfx/<id>/<id>-preview.mp3`
- ไฟล์เต็มจากปุ่ม Download ปกติอยู่ที่ `https://assets.mixkit.co/active_storage/sfx/<id>/<id>.wav` (ยังไม่ได้ตรวจ — ใช้ปุ่มบนหน้าเว็บแทนได้)
- ถ้าผู้ใช้อนุญาต: เก็บต้นฉบับไว้ `.claude/plans/kate-emiliko-sfx-src/` แล้วตัด/เฟด/แปลงเป็น mono mp3 ด้วย ffmpeg ทับไฟล์ `ke_*.mp3` เดิม (path ใน audio.js ไม่ต้องแก้) แบบ raido-hikaru-sfx-src
- ความยาวคือที่หน้าเว็บแสดง (ปัดเป็นวินาที) · "ตัด" = ควรตัดให้เหลือตามที่ระบุ

| คีย์ | ท่า | ตัวเลือก Mixkit | id | ยาว | หน้า | หมายเหตุ / ตัวสำรอง |
|---|---|---|---|---|---|---|
| `ke_mirror` | กระจกเงาสลับตัว | Fairy teleport | 868 | 0:02 | https://mixkit.co/free-sound-effects/magic/ | สำรอง: Magic sparkle whoosh (2350) |
| `ke_revive` | ตื่นขึ้นอีกครั้ง | Medium healing spell | 880 | 0:03 | https://mixkit.co/free-sound-effects/discover/spell/ | สำรอง: Choir magic shine (658, 0:04) |
| `ke_w_mop` | เปลี่ยนเป็นไม้ถูพื้น | Fall on foam splash | 754 | 0:01 | https://mixkit.co/free-sound-effects/splash/ | |
| `ke_w_vase` | เปลี่ยนเป็นแจกันน้ำ | Glasses clinking | 2836 | 0:01 | https://mixkit.co/free-sound-effects/glass/ | สำรอง: Liquid poured in a jar with ice (125, ตัด ~0.6 วิ) |
| `ke_w_vacuum` | เปลี่ยนเป็นเครื่องดูดฝุ่น | Home vacuum engine hum | 1834 | 0:26 | https://mixkit.co/free-sound-effects/discover/vacuum/ | ตัดช่วงเปิดเครื่อง ~0.8 วิ + เฟด · สำรอง: Air zoom vacuum (2608) |
| `ke_w_sword` | เปลี่ยนเป็นดาบเขม่า | Fantasy sword slide | 2798 | 0:01 | https://mixkit.co/free-sound-effects/sword/ | |
| `ke_sword` | ดาบเขม่าย้ายมือ | Metallic sword scrape | 2799 | 0:01 | https://mixkit.co/free-sound-effects/sword/ | สำรอง: Medieval metal sword blade (2766) |
| `ke_whip` | แส้เขม่า | Fast whip strike | 1511 | 0:01 | https://mixkit.co/free-sound-effects/whip/ | สำรอง: Lasso fast whip (1513) |
| `ke_wings` | กางปีกบิน (เน้น) | Fly wings movement | 2697 | 0:05 | https://mixkit.co/free-sound-effects/wings/ | ตัด ~1.5 วิ · ซ้อน Flying fast swoosh (1469) ตอนพุ่งได้ |
| `ke_storm` | ระบำเขม่า (สำคัญสุด) | Storm coming whoosh | 2408 | 0:04 | https://mixkit.co/free-sound-effects/discover/storm/ | ตัด ~3 วิ · สำรอง: Cinematic whoosh magic gust (2343, 0:07) / Storm vortex (2410) |
| `ke_storm_tick` | พายุต้นเทิร์น | Storm wind | 2411 | 0:02 | https://mixkit.co/free-sound-effects/wind/ | ตัด ~0.6 วิ · สำรอง: Dark storm wind (2413) |
| `ke_masked` | มองไม่ออก | Ghostly whoosh passing | 2623 | 0:03 | https://mixkit.co/free-sound-effects/discover/whoosh/ | ตัด ~1 วิ · สำรอง: Terror sweep of darkness (2630) |
| `ke_hit_mop` | ตีด้วยไม้ถูพื้น | Fish flapping | 2457 | 0:01 | https://mixkit.co/free-sound-effects/splash/ | เสียงเปียกตบ · สำรอง: Short slap or clap (2167) |
| `ke_hit_vase` | ตีด้วยแจกัน | Glass break with hammer thud | 759 | 0:01 | https://mixkit.co/free-sound-effects/glass/ | ซ้อนกับ Water splash (1311) ได้ |
| `ke_hit_vacuum` | ตีด้วยเครื่องดูดฝุ่น | Vacuum swoosh transition | 1465 | 0:02 | https://mixkit.co/free-sound-effects/discover/vacuum/ | |
| `ke_hit_sword` | ตีด้วยดาบเขม่า | Metallic sword strike | 2160 | 0:01 | https://mixkit.co/free-sound-effects/sword/ | สำรอง: Sword slash swoosh (1476) |
| `ke_hit_kate` | เคทตี (กรงเล็บเขม่า) | Horror swish | 1495 | 0:02 | https://mixkit.co/free-sound-effects/discover/horror/ | สำรอง: Ghost fire swoosh (1340) |
| `ke_cheer` | ท่าไม้ตายเอมิลิโกะ | Magic sparkle poof hit | 3082 | 0:03 | https://mixkit.co/free-sound-effects/discover/sparkle/ | สำรอง: Fantasy game success notification (270) |
| `ke_splash` | น้ำสาด | Water splash | 1311 | 0:01 | https://mixkit.co/free-sound-effects/splash/ | สำรอง: Sea water splash (1198) |
| `ke_slide` | ไถลพื้นเปียก | Rubber fast squeak | 1013 | 0:01 | https://mixkit.co/free-sound-effects/discover/squeak/ | สำรอง: Glass plate slide (1527) |
