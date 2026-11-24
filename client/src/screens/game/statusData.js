// ตารางสถานะ (STATUS_INFO) + ไล่รายการสถานะของผู้เล่น — ใช้ร่วมกันทั้งชิป/หน้าต่างสถานะ/พยากรณ์
//  แยกออกจาก screens/Game.jsx
import { PERMANENT_STATUS_KEYS } from "../../data/permanentStatus";

// ---------- สถานะผิดปกติ (patch 1.7.1): ตารางกลาง ไอคอน + ชื่อ + สี + คำอธิบาย ----------
//  คำอธิบาย (ผู้ใช้สั่ง 2026-10-09): ประโยคสั้น ไม่มีเครื่องหมาย/สัญลักษณ์ ไม่ขึ้นต้นด้วยชื่อสถานะซ้ำ · ตัวเลขเทิร์นที่เหลือแสดงที่ป้ายอยู่แล้ว ไม่ต้องเขียน
//  ใช้ทั้งป้ายเล็กบนการ์ดผู้เล่น และหน้าต่างรายละเอียด — ทุกคนเห็นสถานะของกันและกันได้
//  (แตะ/คลิกการ์ดผู้เล่นตอนที่ไม่ได้เลือกเป้าโจมตี เพื่อเปิดดูคำอธิบายเต็ม)
const STATUS_INFO = {
  // ระบบธาตุ (server/element.js · GRID_PLAN §8.7): คราบธาตุ + น้ำแข็งกัด (ปฏิกิริยาเยือกแข็ง)
  elFire:    { icon: "🔥", label: "คราบไฟ", cls: "bg-orange-400 text-gray-900", desc: "" },
  elIce:     { icon: "❄️", label: "คราบน้ำแข็ง", cls: "bg-sky-200 text-gray-900", desc: "" },
  elBolt:    { icon: "⚡", label: "คราบสายฟ้า", cls: "bg-yellow-300 text-gray-900", desc: "" },
  elWater:   { icon: "💧", label: "คราบน้ำ", cls: "bg-blue-400 text-gray-900", desc: "" },
  elPoison:  { icon: "☠️", label: "คราบพิษ", cls: "bg-lime-500 text-gray-900", desc: "" },
  elLight:   { icon: "✨", label: "คราบแสง", cls: "bg-yellow-100 text-gray-900", desc: "" },
  elDark:    { icon: "🌑", label: "คราบมืด", cls: "bg-violet-700 text-white", desc: "" },
  stirred:   { icon: "🧬", label: "กระตุ้น", cls: "bg-lime-300 text-gray-900", desc: "" },
  joshuaPhoenix: { icon: "🐦‍🔥", label: "ร่างนกเพลิง", cls: "bg-orange-500 text-gray-900", desc: "" }, // โจชัว รอสฟิลด์ (GRID_PLAN §7.41)
  frostbite: { icon: "🥶", label: "น้ำแข็งกัด", cls: "bg-sky-200 text-gray-900", desc: "" },
  // Ophy (characters/ophy.js · GRID_PLAN §7.43) — สถานะใหม่ที่ใครก็ติดได้
  immLow:    { icon: "🦠", label: "ภูมิต่ำ", cls: "bg-lime-700 text-white", desc: "ติดคราบธาตุนานขึ้น 2 เทิร์น · ผลจากปฏิกิริยาธาตุที่ได้รับ +1 (ดาเมจ +1 · สถานะ +1 เทิร์น)" },
  immHigh:   { icon: "🛡️", label: "ภูมิสูง", cls: "bg-emerald-600 text-white", desc: "ติดคราบธาตุน้อยลง 1 เทิร์น · ผลจากปฏิกิริยาธาตุที่ได้รับ −1 (ดาเมจ −1 · สถานะ −1 เทิร์น)" },
  invis:     { icon: "👻", label: "ล่องหน", cls: "bg-slate-300 text-gray-900", desc: "ศัตรูมองไม่เห็น ยกเว้นยืนห่างไม่เกิน 2 ช่อง" },
  chicken:   { icon: "🐔", label: "ไก่", cls: "bg-amber-600 text-white", desc: "เลือด/เกราะคงเดิม · เดิน 3 · ไม่มีสกิลและสกิลติดตัว · โจมตีปกติ 1" },
  bird:      { icon: "🐦", label: "นก", cls: "bg-sky-500 text-white", desc: "เลือด/เกราะคงเดิม · เดิน 6 บินข้ามสิ่งกีดขวาง · ไม่มีสกิลและสกิลติดตัว · โจมตีปกติไม่ได้ · ใช้ไอเทมได้" },
  hbleed:    { icon: "🩸", label: "เลือดไหล", cls: "bg-echo-hp", desc: "ต้นเทิร์นเสียพลังชีวิต 1 เกราะรับก่อน แล้วลดลงทีละ 1 และระหว่างนี้ฟื้นพลังชีวิตได้แค่ครึ่งเดียว" },
  hburn:     { icon: "🔥", label: "ลุกไหม้", cls: "bg-echo-hp", desc: "ต้นเทิร์นเสียพลังชีวิต 1 เกราะรับก่อน แล้วลดลงทีละ 1" },
  nodraw:    { icon: "🚫", label: "ห้ามจั่ว", cls: "bg-echo-hp", desc: "จั่วไพ่เพิ่มไม่ได้" },
  noskill:   { icon: "🚫", label: "ห้ามสกิล", cls: "bg-echo-hp", desc: "ใช้สกิลไม่ได้" },
  awaken:    { icon: "⏰", label: "ตื่นขึ้น", cls: "bg-echo-cyan text-gray-900", desc: "ต้นเทิร์นฟื้นพลังชีวิต 1" },
  sleep:     { icon: "💤", label: "หลับไหล", cls: "bg-echo-hp", desc: "ข้ามตาเดิน ใช้ของและซื้อของไม่ได้ ต้นเทิร์นเสียพลังชีวิต 1 ทะลุเกราะ แต่ไม่ถึงตาย" },
  poison:    { icon: "🧪", label: "พิษร้าย", cls: "bg-echo-magenta", desc: "ต้นเทิร์นเสียพลังชีวิต 1 เกราะรับก่อน และพลังโจมตีลดลง 1 ตลอดที่ติด" },
  shock:     { icon: "⚡", label: "ช็อต", cls: "bg-echo-ice text-gray-900", desc: "ต้นเทิร์นมีโอกาส 15% ติดสตั้น 1 เทิร์น" },
  curse:     { icon: "🕸️", label: "คำสาป", cls: "bg-echo-magenta", desc: "ใช้สกิลสำเร็จแล้วเสียพลังชีวิต 1 เกราะรับก่อน เทิร์นละครั้ง" },
  energy:    { icon: "🥤", label: "ชูกำลัง", cls: "bg-echo-cyan text-gray-900", desc: "ต้นเทิร์นได้แต้มสกิล 1 แต่เสียพลังชีวิต 1 เกราะรับก่อน ไม่ถึงตาย" },
  promo:     { icon: "📢", label: "เปิดแต้ม", cls: "bg-echo-ice text-gray-900", desc: "ทุกคนเห็นแต้มไพ่ของคุณ" },
  nohealing: { icon: "☠️", label: "ไร้ทางเยียวยา", cls: "bg-echo-hp", desc: "ฟื้นพลังชีวิตไม่ได้" },
  // ---------- สถานะพื้นฐาน universal (patch 2.0.8) ----------
  freecast:  { icon: "👸", label: "การ์ดราชินี", cls: "bg-echo-ice text-gray-900", desc: "ใช้สกิลครั้งถัดไปไม่เสียแต้มสกิล หายเมื่อจบเทิร์น" },
  stun:      { icon: "😵", label: "สตั้น", cls: "bg-echo-hp", desc: "ข้ามตาเดินทั้งตา และจั่วไพ่ไม่ได้" },
  chaa:     { icon: "🌀", label: "สภาพชา", cls: "bg-echo-hp", desc: "กดจั่วหนึ่งครั้งได้ไพ่สองใบ" },
  accurate: { icon: "🎯", label: "แม่นยำ", cls: "bg-echo-ice text-gray-900", desc: "การโจมตีของคุณเจาะการหลบทุกแบบ" },
  numb:     { icon: "🫨", label: "เหน็บชา", cls: "bg-echo-hp", desc: "ใช้สกิลมีโอกาส 30% ไม่ทำงาน แต่ยังเสียแต้มสกิล" },
  weak:      { icon: "🥀", label: "อ่อนแอ", cls: "bg-echo-hp", desc: "ดาเมจที่คุณทำลดลงตามจำนวนที่ระบุ" },
  fragile:   { icon: "💔", label: "เปราะบาง", cls: "bg-echo-hp", desc: "ดาเมจที่คุณได้รับเพิ่มขึ้นตามจำนวนที่ระบุ" },
  // นารุโฮโดะ ริวอิจิ (GRID_PLAN §7.37): คัดค้านค้างจนจบตาเดิน · ถูกสืบสวน (เห็นทะลุ/คูลดาวน์)
  naruhodoObjected: { icon: "✋", label: "ถูกคัดค้าน", cls: "bg-red-600 text-white", desc: "ห้ามสกิล · ห้ามตีปกติ" },
  naruhodoScouted:  { icon: "🔍", label: "ถูกสืบสวน", cls: "bg-amber-300 text-gray-900", desc: "" },
  jutti:     { icon: "🪔", label: "จุติ", cls: "bg-amber-400 text-gray-900", desc: "ตายแล้วคืนชีพด้วยพลังชีวิต 1 ล้างดีบัฟทั้งหมด บัฟยังอยู่ (1 ครั้ง)" },
  arjunaPurge: { icon: "🔱", label: "ขจัดสิ่งแปลกปลอม", cls: "bg-cyan-500 text-gray-900", desc: "ตีปกติพลังโจมตี +1 · ตีปกติและท่าไม้ตาย ความเสียหายเพิ่มตามชนิดดีบัฟที่เป้าติดอยู่" },
  might:     { icon: "💪", label: "เสริมพลัง", cls: "bg-echo-ice text-gray-900", desc: "ดาเมจที่คุณทำเพิ่มขึ้นตามจำนวนที่ระบุ" },
  spellflow: { icon: "🌀", label: "กระแสเวท", cls: "bg-echo-cyan text-gray-900", desc: "สกิลทุกช่องถูกลงตามจำนวนที่ระบุ" },
  spellburden: { icon: "⛓️", label: "ภาระเวท", cls: "bg-echo-hp", desc: "สกิลทุกช่องแพงขึ้นตามจำนวนที่ระบุ สูงสุด 2 และไม่เกิน 8 แต้ม" },
  manaSeal:  { icon: "⛔", label: "ผนึกพลังงาน", cls: "bg-echo-hp", desc: "ฟื้นแต้มสกิลไม่ได้ทุกช่องทาง" },
  noPassive: { icon: "🚫", label: "ลบสกิลติดตัว", cls: "bg-echo-hp", desc: "สกิลติดตัวไม่ทำงาน" },
  manaLeech: { icon: "🩸", label: "ดูดซับเวท", cls: "bg-echo-magenta", desc: "ใช้สกิลหรือได้แต้มสกิล มีโอกาส 35% ถูกขโมยแต้มสกิล 1" },
  manaRupture: { icon: "💥", label: "ระเบิดมานา", cls: "bg-echo-hp", desc: "ครบ 2 เทิร์นแล้วระเบิด แต้มสกิลยิ่งน้อยยิ่งเสียหายมาก" },
  drunk: { icon: "🍷", label: "มึนเมา", cls: "bg-echo-magenta", desc: "ใช้สกิลหรือจั่วไพ่มีโอกาสติดห้ามจั่ว ห้ามสกิล หรือสตั้น" },
  resist:    { icon: "🛡️", label: "ต้านผิดปกติ", cls: "bg-echo-ice text-gray-900", desc: "กันดีบัฟใหม่ไม่ให้ติด แต่ไม่ล้างดีบัฟที่ติดอยู่แล้ว" },
  guard:     { icon: "💗", label: "คุ้มครอง", cls: "bg-echo-armor", desc: "ดาเมจที่ได้รับจากการถูกโจมตีลดลงตามจำนวนที่ระบุ" },
  fortune:   { icon: "🍀", label: "โชคลาภ", cls: "bg-echo-ice text-gray-900", desc: "จั่วครั้งถัดไปได้ไพ่ที่ทำให้แต้มรวมเป็น 19 ถึง 21 แล้วใช้ไป 1 หน่วย" },
  empower:   { icon: "💪", label: "เสริมพลังครั้งถัดไป", cls: "bg-echo-ice text-gray-900", desc: "โจมตีปกติครั้งถัดไปแรงขึ้น 1" },
  discord:   { icon: "⚡", label: "ขัดแย้ง", cls: "bg-echo-hp", desc: "ดาเมจที่ได้รับจากการถูกโจมตีเพิ่มขึ้น 1" },
  evade:     { icon: "💨", label: "หลบหลีก", cls: "bg-echo-cyan text-gray-900", desc: "หลบการโจมตีทุกครั้งในเทิร์นนี้ตามโอกาสที่ระบุ ซ้อนไม่ได้ อยู่ 1 เทิร์น" },
  netramana:   { icon: "✨", label: "เนตรมณะ", cls: "bg-echo-ice text-gray-900", desc: "โจมตีปกติมีโอกาส 20% สังหารทันที" },
  stagger: { icon: "🫨", label: "ชะงัก", cls: "bg-echo-hp", desc: "ฟื้นแต้มสกิลไม่ได้ทุกช่องทาง" },
  muimiRusty: { icon: "🗡️", label: "ดาบเก่าๆ", cls: "bg-echo-armor", desc: "ตีปกติโดนแล้วฟื้นพลังชีวิต 1 และแต้มสกิล 1 ระหว่างนี้ใช้ท่าไม้ตายไม่ได้" },
  muimiTower: { icon: "⚔️", label: "ดาบสะบั้น", cls: "bg-echo-ice text-gray-900", desc: "พลังโจมตีเพิ่ม 1 ตีปกติโดนแล้วฟื้นพลังชีวิต 2 และสถานะนี้อยู่นานขึ้น 1 เทิร์น" },
  mend:      { icon: "💚", label: "เยียวยา", cls: "bg-echo-armor", desc: "ต้นเทิร์นฟื้นพลังชีวิตตามจำนวนที่ระบุ" },
  spRegen:   { icon: "🔷", label: "ฟื้นพลัง", cls: "bg-echo-armor", desc: "ต้นเทิร์นแต้มสกิล +1 ต่อขั้น" },
  iceSurge:  { icon: "🌨️", label: "Ice Surge", cls: "bg-echo-ice text-gray-900", desc: "ธารน้ำแข็งและหนามน้ำแข็งระยะทั้งสนาม · หนามใช้แต้มลดลง 1 ไม่จำกัดครั้ง" },
  blind:     { icon: "🕶️", label: "ตาบอด", cls: "bg-echo-hp", desc: "มองไม่เห็นไพ่ แต้ม พลังชีวิต และเกราะของทุกคน รวมถึงของตัวเอง" },
  // โอเบรอน (ฤดูร้อน)
  obsVeil:     { icon: "🌙", label: "ม่านแห่งราตรี", cls: "bg-echo-ice text-gray-900", desc: "พลังโจมตีเพิ่ม 1" },
  obsDream:    { icon: "💤", label: "จุดจบของความฝัน", cls: "bg-echo-ice text-gray-900", desc: "พลังโจมตีเพิ่ม 4 ในตาเดินถัดไป จบเทิร์นนั้นแล้วติดสตั้น 3 เทิร์น" },
  obsLark:     { icon: "🐦", label: "นกจาบยามเช้า", cls: "bg-echo-magenta", desc: "ต้นเทิร์นหน้าเสียพลังชีวิต 2 ทะลุเกราะ กันด้วยต้านสถานะไม่ได้" },
  oblada:   { icon: "🎵", label: "สิ่งแปลกปลอม", cls: "bg-echo-hp", desc: "เสียพลังชีวิต 1 ทุก 2 เทิร์น เกราะรับก่อน" },
  // Ice Spike
  slow:          { icon: "❄️", label: "เชื่องช้า", cls: "bg-echo-ice text-gray-900", desc: "ระยะเดิน −1" },
  // เคท & เอมิลิโกะ
  shadowMask:    { icon: "🌫️", label: "มืดบอด", cls: "bg-echo-magenta", desc: "หมากคนอื่นเป็นสีขาว ไม่มีชื่อ ภาพ และลำดับเดิน" },
  rooted:        { icon: "⛓️", label: "ถูกตรึง", cls: "bg-violet-900 text-white", desc: "เดินไม่ได้ แต่ใช้สกิลและโจมตีได้ตามปกติ" },
  // ดิเอโก้ แบรนโด (โลกคู่ขนาน)
  oilSoaked:     { icon: "🛢️", label: "ชุ่มน้ำมัน", cls: "bg-amber-800 text-white", desc: "ถูกโยนไม้ขีดไฟใส่จะระเบิดรอบตัว 3×3 ช่อง คนในพื้นที่เสียพลังชีวิต 2 เกราะรับก่อน ติดลุกไหม้ แล้วพื้นกลายเป็นกองไฟ" },
  dinoVirus:     { icon: "🦠", label: "ไวรัสบรรพกาล", cls: "bg-lime-700 text-white", desc: "ครบ 3 = ถูกควบคุมร่างได้ · ไม่ได้รับเพิ่ม 3 เทิร์นจะลดลง 1" },
  diegoNet:      { icon: "🕸️", label: "ติดตาข่าย", cls: "bg-stone-500 text-white", desc: "โดนไม้ขีดไฟหรือแรงระเบิดน้ำมันจะติดลุกไหม้ 3 แทน 1" },
  yunaBless:     { icon: "🕊️", label: "คำอวยพรสุดท้าย", cls: "bg-amber-200 text-gray-900", desc: "พลังโจมตีเพิ่ม 1" },
  yunaNoRide:    { icon: "🚫", label: "ขี่ไม่ได้", cls: "bg-white/20", desc: "ขี่ผู้เล่นอื่นไม่ได้" },
  // ไรโด ฮิคารุ
  hikaruGinga:   { icon: "✨", label: "Ultraman Ginga", cls: "bg-sky-500 text-gray-900", desc: "ตัวใหญ่ขนาด 3×3 เดินได้ 3 ช่องและพังสิ่งกีดขวาง ตีปกติแรงขึ้น 1 โดนศัตรูทุกคนที่ติดด้านนั้น และใช้ท่าไม้ตายลำแสงได้" },
  // องค์หญิงดอกไม้ เซลิน
  celineKing:    { icon: "👑", label: "ราชาดอกไม้", cls: "bg-amber-300 text-gray-900", desc: "เดินบนช่องดอกไม้ไม่เสียก้าว อัตราคริติคอลเพิ่ม 50% คริติคอลแรงสามเท่า และต้นเทิร์นได้แต้มสกิล 1" },
  // ผู้นำแห่งตระกูลเรียวกิ (เทิร์นที่เหลือ)
  emiyaUbw:       { icon: "⚔️", label: "Unlimited Blade Works", cls: "bg-orange-300 text-gray-900", desc: "ต้นเทิร์นได้แต้มสกิล 1 คูลดาวน์สกิลรองลดเพิ่มทุกเทิร์น Trace On ไม่มีคูลดาวน์ และระยะเดินเพิ่ม 1" },
  ryougiMind:     { icon: "🗡️", label: "รากฐานจิต", cls: "bg-slate-200 text-gray-900", desc: "การโจมตีครั้งถัดไป ศัตรูที่โดนถูกลบบัฟล่าสุด 1 อย่างและถูกปิดผลสกิลที่ทำงานอยู่อันล่าสุด 1 อย่าง ใช้ได้ครั้งเดียว" },
  ryougiBloom:    { icon: "🌸", label: "ดับสิ้นซะ", cls: "bg-pink-300 text-gray-900", desc: "พลังโจมตีเพิ่ม 1" },
  // โรลันด์ (เทิร์นที่เหลือ · เศษน้ำแข็ง = จำนวนชิ้น)
  rolandFervent: { icon: "🫀", label: "Fervent Beats", cls: "bg-rose-500", desc: "พลังโจมตีพื้นฐานเพิ่ม 3 เป็นอมตะ ครบเวลาตายทันที" },
  rolandUrging:  { icon: "❤️", label: "Urging", cls: "bg-rose-300 text-gray-900", desc: "พลังชีวิตสูงสุดเพิ่ม 1 ระยะเดินเพิ่ม 1" },
  rolandScars:   { icon: "🩹", label: "Scars", cls: "bg-amber-200 text-gray-900", desc: "ความเสียหายที่ได้รับลด 1 ถูกโจมตีมีโอกาส 20% ไม่เสียหาย" },
  rolandKiss:    { icon: "❄️", label: "A Kiss", cls: "bg-sky-200 text-gray-900", desc: "สร้างความเสียหายแล้วเป้าได้เศษน้ำแข็ง 1 ชิ้น" },
  rolandLies:    { icon: "🎞️", label: "Lies", cls: "bg-slate-300 text-gray-900", desc: "ราคาการ์ดอาวุธสุ่มใหม่ 0 ถึง 4 ทุกเทิร์น" },
  rolandCrystal: { icon: "⚔️", label: "Crystal Atelier", cls: "bg-slate-200 text-gray-900", desc: "ถูกตีปกติแล้วสวนกลับรอบตัว 3×3 ดาเมจ 1" },
  rolandIce:     { icon: "🧊", label: "เศษน้ำแข็ง", cls: "bg-sky-300 text-gray-900", desc: "ครบ 5 ชิ้น สตั้นเทิร์นถัดไปและเสียดาเมจ 1" },
  // เคนซากิ คาซุมะ (เทิร์นที่เหลือ — ครั้งที่กันได้อยู่ในป้าย kazumaMetal ของบล็อกคาซุมะ)
  kazumaMetal:    { icon: "🛡️", label: "METAL", cls: "bg-slate-300 text-gray-900", desc: "กันการโจมตีของศัตรูทั้งก้อนตามจำนวนครั้งที่เหลือ จนจบเทิร์น" },
  // Echo
  echoQueen:     { icon: "👑", label: "ราชินีแห่ง Echo", cls: "bg-echo-ice text-gray-900", desc: "ต้นเทิร์นขยายร่าง 1 ระดับ ล้างไม่ได้" },
  echoOverwrite: { icon: "🔄", label: "Overwrite", cls: "bg-echo-ice text-gray-900", desc: "พลังโจมตีเพิ่มตามจำนวนที่ระบุ" },
  // ---------- สถานะ Universal (patch 2.2.1) ----------
  invert:     { icon: "🔄", label: "ผกผัน", cls: "bg-echo-hp", desc: "การฟื้นพลังชีวิตและเกราะกลายเป็นเสียแทน และพลังโจมตีที่เพิ่มกลายเป็นลดแทน" },
  decay:      { icon: "🥀", label: "ผุพัง", cls: "bg-echo-hp", desc: "ฟื้นเกราะไม่ได้" },
  // คุเรไน โอโตยะ: ดนตรีในหัวใจ (ป้ายบนตัวเป้า — อยู่ตราบที่ยังสีไวโอลิน)
  otoyaHeart: { icon: "🎻", label: "ดนตรีในหัวใจ", cls: "bg-amber-600 text-white", desc: "พลังโจมตี +1 · เยียวยา 1/เทิร์น · คริติคอล +25% · แต้มสกิล +1/เทิร์น" },
};
// รวมสถานะทั้งหมดของผู้เล่นเป็นรายการเดียว — full = รวมของที่โชว์แยกที่อื่นด้วย (โล่/เลือดชั่วคราว)
export function statusEntries(p, full) {
  const out = [];
  for (const [k, v] of Object.entries(p.statuses || {})) {
    if (!(v > 0) || k === "hikaruForm") continue; // ร่าง UltraLive โชว์ชื่อร่างแทน (บล็อกฮิคารุด้านล่าง)
    const info = STATUS_INFO[k] || { icon: "✦", label: k, cls: "bg-white/20", desc: "" };
    const amt = (p.statusAmt || {})[k] || 0; // จำนวน (amount) ของบัฟ/ดีบัฟพื้นฐาน (patch 2.0.8)
    out.push({ key: k, v, amt, ...info });
  }
  // Echo: ขยายร่าง (ถาวร) · คูลดาวน์มหึมา · พลังโจมตีจากการกลืนกิน
  if (p.echo && p.echo.stacks > 0) out.push({ key: "echoGrow", v: p.echo.stacks, icon: "🌌", label: "ขยายร่าง", cls: "bg-echo-magenta", desc: "เลือดสูงสุดเพิ่ม 2 ต่อระดับ อยู่ถาวรจนกว่าจะใช้ Overwrite" });
  if (p.echo && p.echo.kills > 0) out.push({ key: "echoKills", v: p.echo.kills, icon: "🍽️", label: "การกลืนกิน", cls: "bg-echo-ice text-gray-900", desc: "พลังโจมตีเพิ่มตามจำนวนที่ระบุ ถาวร" });
  if ((p.muimiUltCd || 0) > 0) {
    out.push({ key: "muimiUltCd", v: p.muimiUltCd, turns: true, icon: "⏳", label: "ดาบสะบั้นพักฟื้น", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้ท่าไม้ตายได้อีก" });
  }
  // โซระ: ร่าง My-Th + อาวุธที่ถือ · ร่างโซระนับเทิร์นเพื่อคุณหนู
  if (p.sora && p.sora.myth) {
    out.push({ key: "soraMyth", v: 1, icon: "🐭", label: "Kamen Rider My-Th", cls: "bg-sky-500 text-gray-900", desc: "ตีปกติมีโอกาสคริติคอล 20% และใช้ My-Th Edge กับ Mouse Separade ได้" });
    if (p.sora.fire) out.push({ key: "soraFire", v: 1, icon: "🔥", label: "Fire Frame", cls: "bg-orange-500 text-gray-900", desc: "ตีปกติและ Mouse Separade ติดลุกไหม้ 1 จบเทิร์นเสียแต้มสกิล 1 แต้มไม่พอจะกลับร่าง My-Th" });
    out.push({ key: "soraWeapon", v: 1, icon: p.sora.gun ? "🔫" : "🗡️", label: p.sora.gun ? "ปืน" : "มีด", cls: "bg-sky-200 text-gray-900",
      desc: p.sora.gun ? "ระยะตี 1 ถึง 3 ตีโดนแล้วถ้าเป้ารอดจะถูกดึงเข้ามาประชิด" : "ตีปกติแรงขึ้น 1" });
  }
  if (p.sora && !p.sora.myth && p.sora.calm > 0) out.push({ key: "soraCalm", v: 1, icon: "💚", label: `เพื่อคุณหนู ${p.sora.calm}/${p.sora.calmMax}`, cls: "bg-echo-ice text-gray-900", desc: "อยู่ร่างโซระต่อเนื่องครบแล้วฟื้นพลังชีวิต 2 แปลงร่างแล้วนับใหม่" });
  // กิระ: ร่างราชาแมลงอวกาศ · นับเทิร์นร่างกิระ · อัฐิราชา (เทิร์นที่เหลือ)
  if (p.kira) {
    const k = p.kira;
    if (k.king) out.push({ key: "kiraKing", v: 1, icon: "🪲", label: "ราชาแมลงอวกาศ", cls: "bg-violet-500 text-white", desc: "ตีปกติเป็นคลื่นแนวตรงยาว 4 ช่องโดนศัตรูทุกคนในแนว และจบเทิร์นศัตรูที่ประชิดเสียพลังชีวิต 1 เกราะรับก่อน" });
    if (!k.king && k.calm > 0) out.push({ key: "kiraCalm", v: 1, icon: "💚", label: `บดขยี้ส่วนเกิน ${k.calm}/${k.calmMax}`, cls: "bg-echo-ice text-gray-900", desc: "อยู่ร่างกิระต่อเนื่องครบแล้วฟื้นพลังชีวิต 2 และแต้มสกิล 1 สวมเกราะแล้วนับใหม่" });
    if (k.ult > 0) out.push({ key: "kiraUlt", v: k.ult, turns: true, icon: "🦴", label: "อัฐิราชา", cls: "bg-violet-900 text-white", desc: "ตายแล้วฟื้นทันทีด้วยพลังชีวิต 1 ไม่จำกัดครั้ง และพลังโจมตีเพิ่ม 2" });
  }
  // รถบรรทุกเก่า / ออพติมัส ไพร์ม: ผู้พิทักษ์ (ตั้งท่า / คูลดาวน์) · ร่างรถนับเทิร์นฟื้นเลือด · คริ +25%
  if (p.oldTruck) {
    const o = p.oldTruck;
    if (o.stance) out.push({ key: "otGuard", v: 1, icon: "🛡️", label: "ผู้พิทักษ์", cls: "bg-sky-600 text-white", desc: "ถูกตีปกติ = ฟันสวน ความเสียหาย 2 และเลือดไหล 2 เทิร์น ไม่ว่าผู้ตีอยู่ไกลแค่ไหน" });
    else if (o.guardCd > 0) out.push({ key: "otGuardCd", v: o.guardCd, turns: true, icon: "🛡️", label: "⏳", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้ผู้พิทักษ์ได้อีก" });
    if (o.form === "truck" && o.regen > 0) out.push({ key: "otRegen", v: 1, icon: "🚛", label: `${o.regen}/${o.regenMax}`, cls: "bg-echo-ice text-gray-900", desc: "จบเทิร์นในร่างรถบรรทุกครบแล้วฟื้นพลังชีวิต 2" });
    if (o.crit) out.push({ key: "otCrit", v: 1, icon: "⚔️", label: "คริ +25%", cls: "bg-amber-500 text-gray-900", desc: "ตีปกติคริติคอลเพิ่ม 25% จนจบเทิร์น" });
  }
  // โจรุโน่: ร่าง Requiem · ธนู (รอผล/คูลดาวน์) · วนตาย (ใครก็ติดได้) · ลอยบนต้นไม้ (ใครก็ได้) · ต้นตอแห่งชีวิต · Muda · คูลดาวน์ 2 แบบ · เศษเดนมนุษย์ยังไม่ใช้
  if (p.giorno) {
    const g = p.giorno;
    if (g.requiem) out.push({ key: "gioRequiem", v: g.reqLeft, turns: true, icon: "✨", label: "Gold Experience Requiem", cls: "bg-amber-500 text-gray-900", desc: "พลังโจมตีและคริติคอลเพิ่ม ระยะเดินไกลขึ้น ต้านสถานะ ศัตรูที่โจมตีมีโอกาสถูกย้อนกลับไปเริ่มตาเดินใหม่ ใช้ท่าไม้ตายในตานั้น = ย้อนแน่นอน" });
    if (g.arrowWait) out.push({ key: "gioArrowWait", v: 1, icon: "🏹", label: "ธนู Requiem", cls: "bg-amber-300 text-gray-900", desc: "ตาถัดไปสุ่ม 50/50: แปลงร่าง Gold Experience Requiem 3 เทิร์น หรือตายทันที" });
    if (g.arrowCd > 0) out.push({ key: "gioArrowCd", v: g.arrowCd, turns: true, icon: "🏹", label: "⏳", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้ธนู Requiem ได้อีก" });
    if (g.loop) out.push({ key: "gioLoop", v: 1, icon: "🌀", label: "ไปสู่ภพภูมิที่ดี", cls: "bg-violet-900 text-white", desc: "ฟื้นทุกเทิร์นแล้วตายอีกเมื่อถึงตาตัวเอง" });
    if (g.tree) out.push({ key: "gioTree", v: 1, icon: "🌳", label: "จงกำเนิดใหม่", cls: "bg-emerald-600 text-white", desc: "ลอยบนต้นไม้ หลบการโจมตีได้แน่นอน 1 ครั้ง และเดินไม่ได้ จนถึงตาเดินถัดไป" });
    if (g.reflect) out.push({ key: "gioReflect", v: 1, icon: "🐞", label: "ต้นตอแห่งชีวิต", cls: "bg-amber-400 text-gray-900", desc: "ศัตรูโจมตีโดน 1 ครั้ง = ไม่เสียหาย ความเสียหายและดีบัฟสะท้อนกลับใส่ผู้โจมตี จนถึงตาเดินถัดไป" });
    if (g.muda) out.push({ key: "gioMuda", v: 1, icon: "👊", label: "Muda!!!!!!!", cls: "bg-yellow-500 text-gray-900", desc: "ตีปกติครั้งถัดไป: ศัตรูฟื้นพลังชีวิต 3 ล้างดีบัฟ 1 ติดเปราะบางและสตั้นแล้วจึงรับความเสียหาย · เพื่อนฟื้นพลังชีวิต 3 ล้างดีบัฟ 1" });
    if (g.shotCd > 0) out.push({ key: "gioShotCd", v: g.shotCd, turns: true, icon: "🔫", label: "⏳", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงยิงกระสุนแห่งชีวิตได้อีก" });
    if (g.reflectCd > 0) out.push({ key: "gioReflectCd", v: g.reflectCd, turns: true, icon: "🐞", label: "⏳", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้ต้นตอแห่งชีวิตได้อีก" });
    if (g.treeCd > 0) out.push({ key: "gioTreeCd", v: g.treeCd, turns: true, icon: "🌳", label: "⏳", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้จงกำเนิดใหม่ได้อีก" });
  }
  // ยูนะ: เพลงที่เปิด · ยูนะ ไอดอล (เทิร์นที่เหลือ) · คูลดาวน์ · เงาของเสียง (รอ/ทำงาน)
  if (p.yuna) {
    const y = p.yuna;
    if (y.idol > 0) out.push({ key: "yunaIdol", v: y.idol, turns: true, icon: "🔥", label: "ยูนะ ไอดอล", cls: "bg-fuchsia-500 text-white", desc: "พวกเราในวงพลังโจมตีเพิ่ม 1 ยูนะเพิ่ม 2 ทุกคนแม่นยำ ระยะตีเท่าระยะเดิน และจบเทิร์นฟื้นแต้มสกิล 1" });
    else if (y.song === "delete") out.push({ key: "yunaSong", v: 1, icon: "🎵", label: "Delete", cls: "bg-rose-700 text-white", desc: "ศัตรูในวงรับความเสียหายเพิ่ม 1 ทุกแบบ พวกเราในวงฟื้นแต้มสกิล 1 ตอนจบเทิร์น แลกกับแต้มสกิลของยูนะ 2" });
    else if (y.song === "smile") out.push({ key: "yunaSong", v: 1, icon: "🎵", label: "Smile for You", cls: "bg-pink-300 text-gray-900", desc: "พวกเราในวงรับความเสียหายลดลง 1 ทุกแบบ และฟื้นพลังชีวิต 1 ตอนจบเทิร์น แลกกับแต้มสกิลของยูนะ 2" });
    if (y.ultCd > 0) out.push({ key: "yunaUltCd", v: y.ultCd, turns: true, icon: "⏳", label: "ร้อนแรงดังไฟ", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้ท่าไม้ตายได้อีก" });
    if (y.vanish) out.push({ key: "yunaVanish", v: 1, icon: "🌫️", label: "เงาของเสียง", cls: "bg-violet-700 text-white", desc: "หายตัว ศัตรูมองไม่เห็นและเล็งไม่ได้ ไม่โดนความเสียหายและดีบัฟจากคนอื่น วงเพลงหยุดทำงาน" });
    else if (y.vanishNext) out.push({ key: "yunaVanishNext", v: 1, icon: "🌫️", label: "เงาของเสียง", cls: "bg-violet-300 text-gray-900", desc: "เทิร์นหน้าหายตัวทั้งเทิร์น ระหว่างรอใช้ท่าไม้ตายและขี่ผู้เล่นอื่นไม่ได้" });
  }
  // เกรย์: ศพที่เก็บ (พลังโจมตี) · จงบ้าคลั่ง · ชาร์จรองโกมิเนียต (เทิร์นที่เหลือก่อนยิง) · คูลดาวน์
  if (p.gray) {
    const g = p.gray;
    if (g.souls > 0) out.push({ key: "graySouls", v: 1, icon: "⚰️", label: `สัปเหร่อ ${g.souls}/${g.soulsMax}`, cls: "bg-slate-500 text-white", desc: "ศพละพลังโจมตีเพิ่ม 1 และรองโกมิเนียตแรงขึ้น 1 ครบแล้วเก็บศพได้แค่ฟื้นพลังชีวิต 2" });
    if (g.frenzy > 0) out.push({ key: "grayFrenzy", v: g.frenzy, turns: true, icon: "⛓️", label: "จงบ้าคลั่ง", cls: "bg-cyan-800 text-white", desc: "ระยะตีปกติเป็น 2 ช่อง คริติคอลเพิ่ม 25% และตีโดนแล้วเป้าติดถูกตรึง 1 เทิร์น" });
    if (g.charge) out.push({ key: "grayCharge", v: g.charge.left || 1, turns: true, icon: "✨", label: "รองโกมิเนียต", cls: "bg-amber-400 text-gray-900", desc: "เดิน ตีปกติ และใช้สกิลไม่ได้ ศัตรูในแนวถูกตรึง ครบแล้วยิงลำแสงกว้าง 7 ช่องสุดกระดาน ดาเมจ 5 บวกศพที่เก็บ" });
    else if (g.ultCd > 0) out.push({ key: "grayUltCd", v: g.ultCd, turns: true, icon: "⏳", label: "รองโกมิเนียต", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้ท่าไม้ตายได้อีก" });
  }
  // กิลกาเมช: ความมั่งคั่ง · ดาบ EA · พายุ · Enuma Elish ที่รอยิง
  if (p.gil && p.gil.wealth != null) {
    const g = p.gil;
    out.push({ key: "gilWealth", v: 1, icon: "👑", label: `${g.wealth}/${g.wealthMax}`, cls: "bg-amber-400 text-gray-900", desc: "ได้ 1 ต่อนัดที่โดนด้วยเมตตาจากราชา (สนาม Eos: ทุกนัด) · Enuma Elish ใช้ 20" });
    if (g.ea) out.push({ key: "gilEa", v: 1, icon: "🗡️", label: "EA", cls: "bg-rose-800 text-white", desc: "ตีปกติรอบตัว 8 ช่อง ดาเมจ 3 ผลักออก 1" });
    if (g.storm) out.push({ key: "gilStorm", v: 1, icon: "⛈️", label: "พายุ", cls: "bg-red-900 text-white", desc: "จบเทิร์นสายฟ้าแดงผ่าช่องที่ศัตรูยืนอยู่ ดาเมจ 2" });
    if (g.charge) out.push({ key: "gilEnuma", v: g.charge.left || 1, turns: true, icon: "🌌", label: "Enuma Elish", cls: "bg-red-700 text-white", desc: "ต้นตาเดินถัดไปยิงลำแสง ศัตรูในแนวตายทันที" });
  }
  // ไจโร: ลูกเหล็กในมือ · สัดส่วนทองคำ · ม้า (พลังชีวิตม้า / รอเรียก) · เสริมท่าไม้ตาย · คูลดาวน์ (ตัวเลข/ไอคอนเท่านั้น)
  if (p.gyro && p.gyro.hand != null) {
    const g = p.gyro;
    out.push({ key: "gyroBalls", v: 1, icon: "🟢", label: `${g.hand}/2`, cls: "bg-emerald-600 text-white", desc: "ตีปกติใช้ลูก 1 ลูก ลูกตกที่เป้า ไม่มีลูกในมือจะตีไม่ได้จนกว่าจะเรียกกลับด้วยกลับคืนเจ้าของ" });
    out.push({ key: "gyroGolden", v: 1, icon: "🌀", label: `${g.golden}/30`, cls: "bg-amber-300 text-gray-900", desc: "ได้ตอนขี่ม้าเดิน เท่ากับช่วงเดินตรงที่ยาวที่สุดในตา วิชาลับใช้ 5 ท่าไม้ตายใช้ 20 สะสมได้สูงสุด 30" });
    if (g.mounted) out.push({ key: "gyroHorse", v: 1, icon: "🐎", label: `${g.horseHp}/5`, cls: "bg-amber-700 text-white", desc: "ม้ารับความเสียหายก่อนเกราะทีละ 1 ระยะเดินและระยะตีเพิ่ม 1 ม้าล้มแล้วเรียกไม่ได้ 3 เทิร์น" });
    else if (g.horseCd > 0) out.push({ key: "gyroHorseCd", v: g.horseCd, turns: true, icon: "🐎", label: "⏳", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงเรียกม้าได้อีก" });
    if (g.empowered) out.push({ key: "gyroEmpowered", v: 1, icon: "✨", label: "การหมุนที่สมบูรณ์แบบ", cls: "bg-yellow-400 text-gray-900", desc: "ตีปกติครั้งถัดไปในตานี้ทำให้เป้ากระเด็นจนสุดขอบ เสียหายตามจำนวนช่องสูงสุด 6 และถูกตรึง 2 เทิร์น ไม่ตีก่อนจบตาจะหายไป" });
    else if (g.ultCd > 0) out.push({ key: "gyroUltCd", v: g.ultCd, turns: true, icon: "⏳", label: "การหมุนที่สมบูรณ์แบบ", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้ท่าไม้ตายได้อีก" });
  }
  // ดิเอโก้: เล่ห์เหลี่ยม · กระสุน (รีโหลด) · ม้า · เดอะเวิลด์ (ตั้งรับ / หยุดเวลา / คูลดาวน์) (ตัวเลข/ไอคอนเท่านั้น)
  //  ศัตรูได้ cunning / worldArmed / worldCd เป็น null (server ซ่อน — กดเดอะเวิลด์แล้วต้องไม่รู้)
  if (p.dio) {
    const d = p.dio;
    out.push({ key: "dioMeter", v: 1, icon: "⏱️", label: `${d.meter}/${d.meterMax}`, cls: "bg-yellow-500 text-gray-900", desc: "Time Meter" });
    out.push({ key: "dioBlood", v: 1, icon: "🩸", label: `${d.blood}/${d.bloodMax}`, cls: "bg-red-700 text-white", desc: "BloodStack" });
    if (d.stopping) out.push({ key: "dioStop", v: 1, icon: "⏱️", label: `${d.actions} Action`, cls: "bg-yellow-300 text-gray-900", desc: "Za warudo!!!!!!" });
    else if (d.pending > 0) out.push({ key: "dioPending", v: 1, icon: "⏱️", label: `${d.pending} Action`, cls: "bg-yellow-500 text-gray-900", desc: "Za warudo!!!!!!" });
    else if (d.worldCd > 0) out.push({ key: "dioWorldCd", v: d.worldCd, turns: true, icon: "⏳", label: "Za warudo!!!!!!", cls: "bg-white/20", desc: "Za warudo!!!!!!" });
  }
  if (p.diego && p.diego.ammo != null) {
    const d = p.diego;
    if (d.cunning != null) out.push({ key: "diegoCunning", v: 1, icon: "🧠", label: `${d.cunning}/${d.cunningMax}`, cls: "bg-yellow-500 text-gray-900", desc: "ได้ 1 ทุกครั้งที่ใช้คลังเครื่องมือ และเมื่อราดน้ำมันโดนศัตรู ระเบิด ตาข่ายดักติด หรือกองไฟเผาศัตรู ใช้ 5 เพื่อกดท่าไม้ตาย" });
    if (d.ammo > 0) out.push({ key: "diegoAmmo", v: 1, icon: "🔫", label: `${d.ammo}/${d.ammoMax}`, cls: "bg-stone-700 text-white", desc: "ปืนลูกโม่ยิงได้ตาละ 1 นัด กระสุนหมดแล้วต้องรีโหลด 5 เทิร์น" });
    else if (d.reloadCd > 0) out.push({ key: "diegoReload", v: d.reloadCd, turns: true, icon: "🔫", label: "⏳", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงได้กระสุนเต็ม 4 นัดและยิงได้อีก" });
    if (d.mounted) out.push({ key: "diegoHorse", v: 1, icon: "🐎", label: `${d.horseHp}/5`, cls: "bg-amber-700 text-white", desc: "ม้ารับความเสียหายก่อนเกราะทีละ 1 ระยะเดินเพิ่ม 1 ม้าล้มแล้วเรียกไม่ได้ 3 เทิร์น" });
    else if (d.horseCd > 0) out.push({ key: "diegoHorseCd", v: d.horseCd, turns: true, icon: "🐎", label: "⏳", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงเรียกม้าได้อีก" });
    if (d.stopping) out.push({ key: "diegoStop", v: 1, icon: "⏱️", label: "เดอะเวิลด์", cls: "bg-yellow-300 text-gray-900", desc: "เวลาหยุดอยู่ ได้ตาเดินใหม่ ตีปกติไม่ได้แต่ใช้สกิลรวมได้ 3 ครั้ง ความเสียหายที่ทำใส่คนอื่นลงตอนเวลาเดินต่อ" });
    else if (d.worldArmed) out.push({ key: "diegoWorld", v: 1, icon: "⏱️", label: "เดอะเวิลด์", cls: "bg-yellow-500 text-gray-900", desc: "ศัตรูทำให้เสียหายก่อนจบเทิร์น การกระทำนั้นถูกยกเลิกแล้วหยุดเวลาทันที ถ้าไม่โดนจะได้หยุดเวลาต้นเทิร์นหน้าก่อนทุกคน" });
    else if (d.worldCd > 0) out.push({ key: "diegoWorldCd", v: d.worldCd, turns: true, icon: "⏳", label: "เดอะเวิลด์", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้ท่าไม้ตายได้อีก" });
  }
  // ถูกควบคุมร่าง (server/possess.js — เข้าร่วมเผ่าพันธุ์ของดิเอโก้): ใครก็ติดได้
  if (p.possessedBy) out.push({ key: "dinoPossessed", v: 1, icon: "🦖", label: "เข้าร่วมเผ่าพันธุ์", cls: "bg-lime-800 text-white", desc: "เข้าร่วมเผ่าพันธุ์" });
  // ดิเอโก้ อสูรกายดึกดำบรรพ์: ความบ้าคลั่ง · ร่างไดโนเสาร์ · อย่ามาดูถูกกันนะ · ม้า · คูลดาวน์ท่าไม้ตาย (ตัวเลข/ไอคอนเท่านั้น)
  if (p.dino && p.dino.frenzy != null) {
    const d = p.dino, h = p.diego || {};
    out.push({ key: "dinoFrenzy", v: 1, icon: "🦖", label: `${d.frenzy}/${d.frenzyMax}`, cls: d.frenzy >= 2 ? "bg-teal-600 text-white" : "bg-teal-900 text-white", desc: "ความบ้าคลั่ง" });
    if (d.form === "dino") out.push({ key: "dinoForm", v: 1, icon: "🦖", label: "ร่างไดโนเสาร์", cls: "bg-cyan-700 text-white", desc: "ร่างไดโนเสาร์" });
    if (d.scorn > 0) out.push({ key: "dinoScorn", v: d.scorn, turns: true, icon: "🦎", label: "อย่ามาดูถูกกันนะ", cls: "bg-lime-600 text-gray-900", desc: "ไวรัสบรรพกาล +2" });
    if (h.mounted) out.push({ key: "dinoHorse", v: 1, icon: "🐎", label: `${h.horseHp}/5`, cls: "bg-amber-700 text-white", desc: "ซิลเวอร์ บูลเล็ต" });
    else if (h.horseCd > 0) out.push({ key: "dinoHorseCd", v: h.horseCd, turns: true, icon: "🐎", label: "⏳", cls: "bg-white/20", desc: "ซิลเวอร์ บูลเล็ต" });
    if (d.form !== "dino" && d.swarmCd > 0) out.push({ key: "dinoSwarmCd", v: d.swarmCd, turns: true, icon: "⏳", label: "ฉันจะฆ่าแก", cls: "bg-white/20", desc: "ฉันจะฆ่าแก" });
    if (d.form === "dino" && d.stompCd > 0) out.push({ key: "dinoStompCd", v: d.stompCd, turns: true, icon: "⏳", label: "ย่ำกระหม่อม", cls: "bg-white/20", desc: "ย่ำกระหม่อม" });
  }
  // ฟันนี่ วาเลนไทน์: กระสุน (รีโหลด) · หลบสายตา (เทิร์นที่เหลือ / คูลดาวน์) · กระดานคู่ขนานเปิดอยู่ (ตัวเลข/ไอคอนเท่านั้น)
  //  คูลดาวน์ท่าไม้ตายแต่ละแบบอยู่บนการ์ดตัวเลือก (locked + left จาก server)
  if (p.valentine && p.valentine.ammo != null) {
    const v = p.valentine;
    if (v.ammo > 0) out.push({ key: "valAmmo", v: 1, icon: "🔫", label: `${v.ammo}/${v.ammoMax || 3}`, cls: "bg-pink-800 text-white", desc: "นัดละความเสียหาย 1 ใส่ศัตรูคนแรกในแนว 5 ช่อง หมดแล้วต้องรีโหลด 5 เทิร์น" });
    else if (v.reloadCd > 0) out.push({ key: "valReload", v: v.reloadCd, turns: true, icon: "🔫", label: "⏳", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงได้กระสุนเต็ม 3 นัดตอนต้นเทิร์น" });
    if (v.veil) out.push({ key: "valVeil", v: Math.max(1, v.veil.left || 0), turns: true, icon: "🚩", label: "หลบสายตา", cls: "bg-pink-300 text-gray-900", desc: "ล่องหน เดินทะลุทุกอย่าง ไม่มีใครแตะต้องได้ จบเทิร์นได้แต้มสกิล 1 ตีปกติและยิงปืนไม่ได้" });
    else if (v.veilCd > 0) out.push({ key: "valVeilCd", v: v.veilCd, turns: true, icon: "⏳", label: "หลบสายตา", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้สกิลพื้นฐานได้อีก" });
  }
  // อยู่ในกระดานคู่ขนาน (ชั้นมิติ "par:" — ท่าไม้ตายของวาเลนไทน์): ทุกคนในมิติเห็นป้ายนี้ (หน้าตากระดานเหมือนปกติ — ผู้ใช้ 2026-10-21)
  if (typeof p.dim === "string" && p.dim.startsWith("par:")) out.push({ key: "valParallel", v: 1, icon: "🌐", label: "กระดานคู่ขนาน", cls: "bg-cyan-200 text-gray-900", desc: "มองเห็นและโจมตีได้แค่คนในกระดานเดียวกัน ตัวที่เหมือนกันชนแล้วเสียหาย 4 เกราะรับก่อน ชนหรือถูกทำลายแล้วกลับกระดานหลัก" });
  // เฟิร์น: ซ่อนเร้นมานา (อยู่ในโหมด/คูลดาวน์) · เพิ่มระยะ (รอตีครั้งถัดไป) · นับ Zoltraak n/need (ครบ = ครั้งเสริมพลังพร้อม) · ผู้เชี่ยวชาญเวทมนต์พื้นฐาน คูลดาวน์การกัน (ตัวเลข/ไอคอนเท่านั้น)
  if (p.fern) {
    const f = p.fern;
    if (f.conceal) out.push({ key: "fernConceal", v: 1, icon: "🫥", label: "ซ่อนเร้นมานา", cls: "bg-indigo-400 text-gray-900", desc: f.eos ? "ล่องหน ศัตรูมองไม่เห็น ต้นเทิร์นได้ Energy 2 และฟื้นพลังชีวิต 1 ทุกเทิร์น ตีหรือใช้สกิลแล้วหลุด ถูกโจมตีแล้วหลุดและสตั้น 1 เทิร์น" : "ล่องหน ศัตรูเห็นได้แค่ในระยะ 2 ช่อง ต้นเทิร์นได้ Energy 2 และฟื้นพลังชีวิต 1 ทุก 2 เทิร์น ตีหรือใช้สกิลแล้วหลุด ถูกโจมตีแล้วหลุดและสตั้น 1 เทิร์น" });
    else if (f.concealCd > 0) out.push({ key: "fernConcealCd", v: f.concealCd, turns: true, icon: "⏳", label: "ซ่อนเร้นมานา", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้ท่าไม้ตายได้อีก" });
    if (f.boost) out.push({ key: "fernBoost", v: 1, icon: "📏", label: "เพิ่มระยะ", cls: "bg-sky-300 text-gray-900", desc: f.eos ? "ตีปกติครั้งถัดไปโดนศัตรูทุกตัวในระยะ 8 รอบตัว ค้างไว้จนกว่าจะตี" : "ตีปกติครั้งถัดไปยิงไกลเป็นแนว 6 ช่อง ค้างไว้จนกว่าจะตี" });
    if (f.empowered) out.push({ key: "fernEmpowered", v: 1, icon: "🌟", label: `Zoltraak ${f.need || 4}/${f.need || 4}`, cls: "bg-fuchsia-300 text-gray-900", desc: "ตีปกติครั้งถัดไปไม่ใช้ Energy ทะลุเกราะทุกคนในแนว ตีแล้วรีเซ็ทคูลดาวน์ทุกอย่างและเริ่มนับใหม่" });
    else if (f.count != null) out.push({ key: "fernCount", v: 1, icon: "✨", label: `Zoltraak ${f.count}/${f.need || 4}`, cls: "bg-violet-200 text-gray-900", desc: `ตีปกติครบ ${f.need || 4} ครั้ง ครั้งถัดไปไม่ใช้ Energy ทะลุเกราะ และรีเซ็ทคูลดาวน์ทุกอย่าง` });
    if (f.shieldCd > 0) out.push({ key: "fernShieldCd", v: f.shieldCd, turns: true, icon: "🛡️", label: "ผู้เชี่ยวชาญเวทมนต์พื้นฐาน", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงกันการโจมตีได้อีก" });
    else if (f.shieldCd != null) out.push({ key: "fernShield", v: 1, icon: "🛡️", label: f.eos ? `ผู้เชี่ยวชาญเวทมนต์พื้นฐาน ${f.shieldLeft}` : "ผู้เชี่ยวชาญเวทมนต์พื้นฐาน", cls: "bg-cyan-300 text-gray-900", desc: f.eos ? `การโจมตีของศัตรูอีก ${f.shieldLeft} ครั้งถูกกันทั้งหมด ความเสียหายเป็น 0` : "การโจมตีครั้งถัดไปของศัตรูถูกกันทั้งหมด ความเสียหายเป็น 0" });
  }
  // คุซาคาเบะ ชินระ: ฉันนี่แหละฮีโร่ · อุ่นเครื่องพอแล้ว · มอดไหม้จากภายใน (เทิร์นที่เหลือ) · คูลดาวน์ลาทัม — เปลวเพลงอยู่ในแถบ ShinraEmber
  if (p.shinra) {
    const s = p.shinra;
    if (s.hero > 0) out.push({ key: "shinraHero", v: s.hero, turns: true, icon: "👟", label: "ฉันนี่แหละฮีโร่", cls: "bg-orange-400 text-gray-900", desc: "ระยะเดิน +2 · ใช้สกิลหรือไอเทมแล้วยังเดินต่อได้" });
    if (s.warm > 0) out.push({ key: "shinraWarm", v: s.warm, turns: true, icon: "🔥", label: "อุ่นเครื่องพอแล้ว", cls: "bg-red-600 text-white", desc: "เปลวเพลงสูงสุด 8 · ฟื้นเปลวเพลง +2/เทิร์น · ตีปกติติดลุกไหม้ 2" });
    if (s.smolder > 0) out.push({ key: "shinraSmolder", v: s.smolder, turns: true, icon: "💥", label: "มอดไหม้จากภายใน", cls: "bg-amber-300 text-gray-900", desc: "ตีปกติระเบิดลุกไหม้บนตัวเป้าเป็นความเสียหาย" });
    if (s.latomCd > 0) out.push({ key: "shinraLatomCd", v: s.latomCd, turns: true, icon: "⏳", label: "ลาทัม", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้ลาทัมได้" });
  }
  // แม็กน่า สวิง: OverHeat n/8 · บอลไฟ n/3 · Fire Knuckle / Fire Boost (เทิร์นที่เหลือ) · โซ่ (เทิร์นที่เหลือ / Finisher รอทำงาน)
  if (p.magna) {
    const m = p.magna;
    out.push({ key: "magnaHeat", v: 1, icon: "🔥", label: `OverHeat ${m.heat | 0}/8`, cls: m.heat >= 8 ? "bg-red-600 text-white" : m.heat >= 5 ? "bg-orange-400 text-gray-900" : m.heat >= 3 ? "bg-amber-300 text-gray-900" : "bg-white/20", desc: "3+ ระยะตี +1 · 5+ สร้างความเสียหายมีโอกาส 20% ลุกไหม้ 1 (ติดโซ่ 40%) · 8 ความเสียหายที่ได้รับ −1" });
    if (m.balls > 0) out.push({ key: "magnaBalls", v: 1, icon: "☄️", label: `บอลไฟ ${m.balls}/3`, cls: "bg-orange-300 text-gray-900", desc: "ใช้ตีด้วย Baseball bat และปา Soul Chain Deathmatch" });
    if (m.knuckle > 0) out.push({ key: "magnaKnuckle", v: m.knuckle, turns: true, icon: "👊", label: "Fire Knuckle", cls: "bg-orange-500 text-white", desc: "ตีปกติติดลุกไหม้ 1" });
    if (m.boost > 0) out.push({ key: "magnaBoost", v: m.boost, turns: true, icon: "💨", label: "Fire Boost", cls: "bg-red-500 text-white", desc: "ตีปกติได้ 2 ครั้งต่อตาเดิน · หลบหลีก 35%" });
  }
  if (p.soulChain) out.push({ key: "soulChain", v: p.magna && p.magna.chain > 0 ? p.magna.chain : 1, turns: !!(p.magna && p.magna.chain > 0), icon: "⛓️", label: p.magna && p.magna.armed ? "Soul Chain Finisher" : "Soul Chain Deathmatch", cls: p.magna && p.magna.armed ? "bg-sky-400 text-gray-900" : "bg-orange-600 text-white", desc: "แชร์แต้มสกิล · ห่างกันไม่เกิน 4 ช่อง · ใช้สกิลเคลื่อนที่ไม่ได้ · โจมตีและได้รับผลได้แค่จากกันเอง" });
  // นารุโฮโดะ ริวอิจิ: แฟ้มหลักฐาน n/5 · คูลดาวน์ รอเดี๋ยว!!! · ห้ามเดินตาหน้า (ข้อมูลเต็มเฉพาะเจ้าของ — คนอื่นได้แค่ holdReady)
  if (p.naruhodo && Array.isArray(p.naruhodo.evidence)) {
    const n = p.naruhodo;
    out.push({ key: "naruEvidence", v: 1, icon: "📁", label: `หลักฐาน ${n.evidence.filter((e) => e && !e.used).length}/5`, cls: "bg-amber-700 text-white", desc: "" });
    if (n.holdCd > 0) out.push({ key: "naruHoldCd", v: n.holdCd, turns: true, icon: "⏳", label: "รอเดี๋ยว!!!", cls: "bg-white/20", desc: "" });
    if (n.noMoveNext) out.push({ key: "naruNoMove", v: 1, icon: "🚫", label: "ห้ามเดิน", cls: "bg-echo-hp", desc: "" });
  }
  // ผู้นำแห่งตระกูลเรียวกิ: คูลดาวน์หยินหยาง (เนตรมณะ/เยียวยา) · ดับสิ้นซะ — เนตรมณะ/รากฐานจิต/ดับสิ้นซะ เป็นสถานะ netramana / ryougiMind / ryougiBloom
  if (p.ryougi) {
    const r = p.ryougi;
    if (r.eyesCd > 0) out.push({ key: "ryougiEyesCd", v: r.eyesCd, turns: true, icon: "⏳", label: "เนตรมณะ", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้เนตรมณะได้อีก" });
    if (r.mendCd > 0) out.push({ key: "ryougiMendCd", v: r.mendCd, turns: true, icon: "⏳", label: "เยียวยา", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้เยียวยาได้อีก" });
    if (r.ultCd > 0) out.push({ key: "ryougiUltCd", v: r.ultCd, turns: true, icon: "⏳", label: "ดับสิ้นซะ", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้ท่าไม้ตายได้อีก" });
  }
  // เอมิยะ ชิโร่: อาวุธที่ถือ (เทิร์น/ครั้งที่เหลือ) · คูลดาวน์ Trace On / สกิลรอง / UBW · Avalon — UBW เป็นสถานะ emiyaUbw
  if (p.emiya) {
    const e = p.emiya;
    const W = {
      kb: ["⚔️", "Kanshou & Bakuya", "ตีปกติ 1 ครั้งฟัน 2 ฮิต อัตราคริติคอลเพิ่ม 20% · ระหว่าง Unlimited Blade Works ตีโดนติดเลือดไหล 1 เทิร์น"],
      hrunting: ["🏹", "Hrunting & Caladbolg II", "ตีได้ไกล 1 ถึง 4 ช่อง ระยะเดินลด 1 · ระหว่าง Unlimited Blade Works ไม่ลดระยะเดิน พลังโจมตีเพิ่ม 1"],
      rule: ["🗡️", "Rule Breaker", "ตีโดนแล้วเป้าใช้สกิลไม่ได้จนจบตาเดินถัดไป และติดผนึกพลังงาน 2 เทิร์น · ระหว่าง Unlimited Blade Works ลบสกิลติดตัวของเป้า 2 เทิร์น"],
      nine: ["🪨", "Nine Lives Blade Works", "พลังโจมตีเพิ่ม 1 ตีโดนศัตรูทุกคนในกรอบ 2×3 ทางทิศของเป้า · ระหว่าง Unlimited Blade Works ผลักทุกคนที่โดน 2 ช่อง"],
      excalibur: ["✨", "Excalibur", "พลังโจมตีเพิ่ม 1 ตีแนว 3 ช่องโดนทุกคน ตีโดนแล้วติดเปราะบาง 2 เทิร์น"],
    }[e.weapon];
    if (W) out.push({ key: "emiyaWeapon", v: e.weaponTurns || 1, turns: true, icon: W[0], label: e.usesLeft == null ? W[1] : `${W[1]} ×${e.usesLeft}`, cls: e.weapon === "excalibur" ? "bg-amber-300 text-gray-900" : "bg-sky-200 text-gray-900", desc: W[2] });
    if (e.traceCd > 0) out.push({ key: "emiyaTraceCd", v: e.traceCd, turns: true, icon: "⏳", label: "Trace On", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้ Trace On ได้อีก" });
    if (e.wsCd > 0) out.push({ key: "emiyaWsCd", v: e.wsCd, turns: true, icon: "⏳", label: "Weapon Skill", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้สกิลรองได้อีก" });
    if (e.ultCd > 0) out.push({ key: "emiyaUltCd", v: e.ultCd, turns: true, icon: "⏳", label: "Unlimited Blade Works", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้ท่าไม้ตายได้อีก" });
    if (e.avalonCd > 0) out.push({ key: "emiyaAvalonCd", v: e.avalonCd, turns: true, icon: "🛡️", label: "Avalon", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงฟื้นพลังชีวิตจาก Avalon ได้อีก" });
  }
  // โรลันด์: Emotion · Furioso charge · หลบหลีกจาก Crystal Atelier
  if (p.roland) {
    const r = p.roland;
    out.push({ key: "rolandEmotion", v: 1, icon: "💠", label: `Emotion ${r.emotion}/${r.emotionMax}`, cls: "bg-slate-200 text-gray-900", desc: `สร้างความเสียหาย ${r.hits}/${r.hitsMax}` });
    out.push({ key: "rolandCharge", v: 1, icon: "⚫", label: `Furioso ${r.charge}/${r.chargeMax}`, cls: r.charge >= r.chargeMax ? "bg-white text-gray-900" : "bg-slate-700", desc: "การ์ดอาวุธคนละแบบ" });
    if (r.ultCd > 0) out.push({ key: "rolandUltCd", v: r.ultCd, turns: true, icon: "⏳", label: "Furioso", cls: "bg-white/20", desc: "รอให้ครบเทิร์น" });
    if (r.crystalDodge > 0) out.push({ key: "rolandDodge", v: r.crystalDodge, icon: "💨", label: "หลบหลีก", cls: "bg-slate-200 text-gray-900", desc: "หลบการโจมตี 1 ครั้ง" });
  }
  // อินุอิ ทาคุมิ: กระสุน · โหมดปืน · อุปกรณ์ · ร่าง Axel · Exceed Charge · ร่างมนุษย์นับสู่การฟื้นพลังชีวิต
  if (p.inui && p.inui.opened) {
    const n = p.inui;
    out.push({ key: "inuiAmmo", v: 1, icon: "🔋", label: `${n.ammo}/${n.ammoMax}`, cls: n.ammo > 0 ? "bg-red-200 text-gray-900" : "bg-white/20", desc: "กระสุน Faiz Phone 103 ใช้ 1 นัด 106 ใช้ 2 นัด" });
    if (n.gun) out.push({ key: "inuiGun", v: 1, icon: "🔫", label: n.gun === "103" ? "Single Mode" : "Burst Mode", cls: "bg-red-500 text-white", desc: n.gun === "103" ? "ตีปกติระยะ 3 ใช้กระสุน 1 นัด" : "ตีปกติระยะ 3 อัตราคริติคอล 50% ใช้กระสุน 2 นัด" });
    if (n.knuckle) out.push({ key: "inuiKnuckle", v: 1, icon: "👊", label: "Faiz_nuckle", cls: "bg-slate-300 text-gray-900", desc: "การโจมตีปกติแรงขึ้น 1" });
    if (n.pointer) out.push({ key: "inuiPointer", v: 1, icon: "🎯", label: "Faiz_pointer", cls: "bg-slate-300 text-gray-900", desc: "แม่นยำตลอดที่สวม" });
    if (n.axel) out.push({ key: "inuiAxel", v: n.axelLeft, turns: true, icon: "⌚", label: "Faiz Axel", cls: "bg-rose-600 text-white", desc: "ระยะเดิน 6 ใช้ Start Up ได้ ครบเวลากลับร่าง Faiz" });
    if (!n.axel && n.axelCd > 0) out.push({ key: "inuiAxelCd", v: n.axelCd, turns: true, icon: "⏳", label: "axel_watch", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงสวม axel_watch ได้อีก" });
    if (n.exceed) out.push({ key: "inuiExceed", v: 1, icon: "⚡", label: "Exceed Charge", cls: "bg-red-600 text-white", desc: n.exceed === "knuckle" ? "ระยะเดิน +2 ตีประชิดครั้งถัดไปในตานี้ ความเสียหาย 4 ลุกไหม้ 1" : "ระยะเดิน +2 ตีประชิดครั้งถัดไปในตานี้ ความเสียหาย 4 ถูกตรึง 1 เทิร์น" });
    if (n.startUp) out.push({ key: "inuiStartUp", v: 1, icon: "⏱️", label: `Start Up ${n.startUp.left}`, cls: "bg-gray-100 text-gray-900", desc: "ตีได้อีกตามจำนวนนี้ ก่อนหมดเวลา" });
    if (!n.faiz && n.humanTurns > 0) out.push({ key: "inuiHuman", v: 1, icon: "💚", label: `${n.humanTurns}/${n.humanNeed}`, cls: "bg-white/20", desc: "อยู่ร่างมนุษย์ครบ 2 เทิร์นติดกัน ฟื้นพลังชีวิต 2" });
  }
  // เคนซากิ คาซุมะ: ผล Rouze ที่รอตีปกติ (ท่า Lightning / การ์ด) · ร่างมนุษย์นับสู่การฟื้นพลังชีวิต — METAL เป็นสถานะ kazumaMetal
  if (p.kazuma) {
    const k = p.kazuma;
    const COMBO = { blast: ["⚡", "Lightning Blast", "ตีปกติครั้งถัดไปในตาเดินนี้ ระยะ 1 ถึง 3 เสียหาย 2 ตายตัว และติดช็อต 2 เทิร์น"], slash: ["⚡", "Lightning Slash", "ตีปกติครั้งถัดไปในตาเดินนี้เป็นแนว 3 ช่องโดนทุกคน เสียหาย 2 ตายตัว และติดช็อต 1 เทิร์น"], straight: ["👑", "Straight Flush", "ตีปกติครั้งถัดไปในตาเดินนี้ ความเสียหาย ×2 สูงสุด 6"] };
    if (k.king) out.push({ key: "kazumaKing", v: k.kingLeft, icon: "👑", label: "ร่างคิง", cls: "bg-amber-400 text-gray-900", desc: `เหลือ ${k.kingLeft} เทิร์น ครบแล้วคืนร่างมนุษย์ ฟื้นพลังชีวิต 2 และสตั้นตัวเอง 1 เทิร์น` });
    if (k.armed && COMBO[k.armed.kind]) { const C = COMBO[k.armed.kind]; out.push({ key: "kazumaArmed", v: 1, icon: C[0], label: C[1], cls: "bg-amber-300 text-gray-900", desc: C[2] }); }
    else if (k.armed && k.armed.cards) {
      const label = Object.entries(k.armed.cards).map(([c, n]) => `${c.toUpperCase()}${n > 1 ? ` ×${n}` : ""}`).join(" · ");
      out.push({ key: "kazumaArmed", v: 1, icon: "🃏", label, cls: "bg-sky-200 text-gray-900", desc: "ผลการ์ดเสริมตีปกติครั้งถัดไปในตาเดินนี้ ไม่ได้ตีก็หายตอนจบตา" });
    }
    if (k.metal > 1) out.push({ key: "kazumaMetalN", v: 1, icon: "🛡️", label: `METAL ×${k.metal}`, cls: "bg-slate-300 text-gray-900", desc: "กันการโจมตีของศัตรูทั้งก้อนได้อีกตามจำนวนนี้ จนจบเทิร์น" });
    if (!k.blade && k.humanTurns > 0) out.push({ key: "kazumaHuman", v: 1, icon: "💚", label: `${k.humanTurns}/${k.humanNeed || 2}`, cls: "bg-white/20", desc: "อยู่ร่างมนุษย์ครบ 2 เทิร์นติดกัน ฟื้นพลังชีวิต 2" });
  }
  // ทราฟาก้า ลอว์ (GRID_PLAN §7.20): ตีที่เหลือในเทิร์น · ศัลแพทย์ที่เหลือ · ท่าไม้ตายที่รอตี · คูลดาวน์ Room/ท่าไม้ตาย · Counter Shock
  if (p.law) {
    const L = p.law;
    if (L.inRoom) {
      out.push({ key: "lawStrikes", v: 1, icon: "🗡️", label: `${Math.max(0, L.strikesMax - L.strikes)}/${L.strikesMax}`, cls: "bg-sky-200 text-gray-900", desc: "ตีปกติที่เหลือในเทิร์นนี้ (รวมตัดพื้น)" });
      out.push({ key: "lawSec", v: 1, icon: "🩺", label: `${Math.max(0, L.secMax - L.secUsed)}/${L.secMax}`, cls: "bg-white/20", desc: "ศัลแพทย์ที่ใช้ได้อีกในเทิร์นนี้" });
    }
    if (L.armed) out.push({ key: "lawArmed", v: 1, icon: L.armed === "gamma" ? "🟢" : "🫀", label: L.armed === "gamma" ? "Gamma Knife" : "Mess", cls: "bg-emerald-300 text-gray-900", desc: "ตีปกติครั้งถัดไปในตาเดินนี้ (ประชิด)" });
    if (L.roomCd > 0) out.push({ key: "lawRoomCd", v: L.roomCd, turns: true, icon: "⏳", label: "Room", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงเปิด Room ได้อีก" });
    if (L.gammaCd > 0) out.push({ key: "lawGammaCd", v: L.gammaCd, turns: true, icon: "⏳", label: "Gamma Knife", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้ Gamma Knife ได้อีก" });
    if (L.messCd > 0) out.push({ key: "lawMessCd", v: L.messCd, turns: true, icon: "⏳", label: "Mess", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้ Mess ได้อีก" });
  }
  // เซลิน: อาวุธที่ถือ · ความอ่อนโยนที่เหลือในเทิร์น · ราชาดอกไม้ (ถ้า server ไม่ได้ส่งเป็นสถานะ) · คูลดาวน์/นับสะสม (ตัวเลข/ไอคอนเท่านั้น)
  if (p.celine && p.celine.weapon) {
    const c = p.celine;
    const W = {
      dagger: ["🗡️", "ดาบเล็ก", "ตีประชิด หลบหลีก 5% ตีหรือรอแล้วเดินต่อได้อีกรอบเต็มระยะ หลังเดินทำได้แค่รอ"],
      dragon: ["🐉", "ดาบมังกรแดง", "ตีประชิด อัตราคริติคอลเพิ่ม 50% ทั้งตีปกติและคฑาแห่งการเยียวยา"],
      great: ["⚔️", "ดาบใหญ่", "ตีประชิด พลังโจมตีเพิ่ม 1 และตีโดนแล้วผลักเป้าออกไป 1 ช่อง"],
      fire: ["🔥", "เวทย์ไฟ", "ตีได้ไกล 1 ถึง 3 ช่อง ตีโดนแล้วเป้าติดลุกไหม้ 1"],
      wind: ["🍃", "เวทย์ลม", "ตีได้ไกล 1 ถึง 3 ช่อง ตีโดนแล้วผลักเป้า 2 ช่อง ถ้าชนสิ่งกีดขวาง ขอบ หรือคน เสียหายเพิ่ม 1 เกราะรับก่อน"],
      thunder: ["⚡", "เวทย์ไฟฟ้า", "ตีได้ไกล 1 ถึง 3 ช่อง ตีโดนแล้วเป้าติดช็อต 2 เทิร์น"],
    }[c.weapon];
    if (W) out.push({ key: "celineWeapon", v: 1, icon: W[0], label: W[1], cls: c.weaponClass === "magic" ? "bg-emerald-300 text-gray-900" : "bg-pink-300 text-gray-900", desc: W[2] });
    if (c.king > 0 && !((p.statuses || {}).celineKing > 0)) out.push({ key: "celineKingTurns", v: c.king, turns: true, icon: "👑", label: "ราชาดอกไม้", cls: "bg-amber-300 text-gray-900", desc: "เดินบนช่องดอกไม้ไม่เสียก้าว อัตราคริติคอลเพิ่ม 50% คริติคอลแรงสามเท่า และต้นเทิร์นได้แต้มสกิล 1" });
    else if (c.ultCd > 0) out.push({ key: "celineUltCd", v: c.ultCd, turns: true, icon: "⏳", label: "สวนดอกไม้ของฉัน", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้ท่าไม้ตายได้อีก" });
    if (c.tenderLeft != null) out.push({ key: "celineTender", v: 1, icon: "🌸", label: `${c.tenderLeft}/3`, cls: c.tenderLeft > 0 ? "bg-pink-200 text-gray-900" : "bg-white/20", desc: "ใช้ความอ่อนโยนได้อีกกี่ครั้งในเทิร์นนี้ รวมทุกคฑาไม่เกิน 3 ครั้ง ไม่นับโควตาสกิล" });
    if (c.healCd > 0) out.push({ key: "celineHealCd", v: c.healCd, turns: true, icon: "💚", label: "⏳", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้คฑาแห่งการเยียวยาได้อีก" });
    else if (c.healCount > 0) out.push({ key: "celineHealCount", v: 1, icon: "💚", label: `${c.healCount}/4`, cls: "bg-lime-200 text-gray-900", desc: "ใช้คฑาแห่งการเยียวยาครบ 4 ครั้งแล้วพัก 5 เทิร์น นับสะสมข้ามเทิร์น" });
    if (c.wallCd > 0) out.push({ key: "celineWallCd", v: c.wallCd, turns: true, icon: "🧊", label: "⏳", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้คฑาแห่งการกีดกันได้อีก" });
    else if (c.wallCount > 0) out.push({ key: "celineWallCount", v: 1, icon: "🧊", label: `${c.wallCount}/2`, cls: "bg-sky-200 text-gray-900", desc: "ใช้คฑาแห่งการกีดกันครบ 2 ครั้งแล้วพัก 3 เทิร์น นับสะสมข้ามเทิร์น" });
    if (c.swapCd > 0) out.push({ key: "celineSwapCd", v: c.swapCd, turns: true, icon: "🔁", label: "⏳", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้คฑาแห่งการเคลื่อนย้ายได้อีก" });
    if (c.inBloom) out.push({ key: "celineTea", v: 1, icon: "🍵", label: c.teaNeed ? `${c.tea || 0}/${c.teaNeed}` : "เวลาน้ำชา", cls: "bg-lime-300 text-gray-900", desc: "ต้นเทิร์นยืนในพุ่มติดกันครบ 2 เทิร์น ฟื้นพลังชีวิต 1 แล้วนับใหม่ ระหว่างอยู่ในพุ่มอัตราคริติคอลเพิ่ม 20%" });
  }
  // ไรโด ฮิคารุ: ร่าง UltraLive (นับเทิร์นที่เหลือ) · สโตเรี่ยม · Strium Brace · หมอกเคมู · คูลดาวน์
  if (p.hikaru) {
    const h = p.hikaru;
    if (h.form) out.push({ key: "hikaruForm", v: h.formLeft || 1, icon: "🔆", label: h.formName, cls: "bg-amber-300 text-gray-900", desc: "เกราะสูงสุดเพิ่ม 2 เกราะลดลงทุก 1 ฟื้นพลังชีวิต 1 ตีปกติได้ผลตามร่าง หมดเวลาแล้วคืนร่างปกติและร่างนั้นพัก 5 เทิร์น" });
    if (h.ginga && h.strium) out.push({ key: "hikaruStrium", v: 1, icon: "🌈", label: "Strium", cls: "bg-orange-400 text-gray-900", desc: "พลังโจมตีเพิ่มอีก 1 ตีปกติติดลุกไหม้ 1 และท่าไม้ตายเปลี่ยนเป็น Strium Ray" });
    if (!h.strium && h.brace > 0) out.push({ key: "hikaruBrace", v: 1, icon: "🌈", label: `Strium Brace ${h.brace}/${h.braceMax}`, cls: "bg-echo-ice text-gray-900", desc: "จบเทิร์นในร่าง Ultraman Ginga ช่วงกลางวันได้ 1 ครบแล้วกลายเป็น Strium ถาวร" });
    if (h.kemurCalm > 0) out.push({ key: "hikaruKemur", v: 1, icon: "🌫️", label: `${h.kemurCalm}/${h.kemurMax}`, cls: "bg-purple-300 text-gray-900", desc: "ร่างมนุษย์ดาวเคมูไม่ถูกโจมตีและไม่เสียหายต่อเนื่องครบแล้ว เทิร์นถัดไปล่องหน 1 เทิร์น" });
    if (h.armorCd > 0) out.push({ key: "hikaruArmorCd", v: h.armorCd, turns: true, icon: "⏳", label: "เกราะ UltraLive", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงฟื้นเกราะ 2 ตอนเข้าร่าง UltraLive ได้อีก" });
  }
  // Ice Spike: ดาเมจสะสมก่อนระเบิด (ติดตัว 3)
  // Fodlan: ค่าของด่านต่อคน (ความอบอุ่น · ศิลาตรา · ชีพจรเทพ … — server/fodlan/stageN.js playerInfo().badges)
  if (p.fodlan && Array.isArray(p.fodlan.badges)) for (const b of p.fodlan.badges) out.push({ key: `fd_${b.key}`, v: 1, icon: b.icon, label: b.label, cls: b.cls || "bg-amber-200 text-gray-900", desc: b.desc || b.label });
  // Ice Spike ในสนาม Eos: LV ปัจจุบัน (ผู้ใช้สั่ง 2026-11-14 ให้โชว์) — ค่าตาม LV อยู่ในคำอธิบายชี้ (Eos อนุญาต desc)
  if (p.iceLv && p.iceLv.lv) { const L = p.iceLv; out.push({ key: "iceLv", v: 1, icon: "🧊", label: `Lv.${L.lv}`, cls: L.lv >= L.max ? "bg-sky-400 text-gray-900" : "bg-sky-100 text-gray-900", desc: `ซ้อนทับสูงสุด ${L.stack} · Shock Wave ${L.pct}% รอบ ${L.r} ช่อง${L.pierce ? " · ไถลทะลุ · ทำลาย 4/เทิร์น" : ""}` }); }
  if (typeof p.iceHurt === "number") out.push({ key: "iceHurt", v: 1, icon: "❄️", label: `${p.iceHurt}/3`, cls: "bg-sky-200 text-gray-900", desc: "ความเสียหายที่ได้รับสะสมครบแล้วระเบิดผลักศัตรูรอบตัวออกไป 2 ช่อง และติดเชื่องช้า 1 เทิร์น" });
  // ยูกิ มาโคโตะ: นับถอยหลังเกิดใหม่เป็นประตู (ตัวเลขเท่านั้น — showV = โชว์เลขแม้เหลือ 1)
  if (p.yuki && p.yuki.left > 0) out.push({ key: "yukiCharge", v: p.yuki.left | 0, turns: true, showV: true, icon: "🚪", label: "เกิดใหม่เป็นประตู", cls: "bg-sky-300 text-gray-900", desc: "" });
  if (full && (p.shield || 0) > 0) out.push({ key: "shield", v: p.shield, icon: "🛡️", label: "โล่", cls: "bg-echo-armor", desc: "กันความเสียหายได้ตามจำนวนโล่" });
  if (full && (p.tempHp || 0) > 0) out.push({ key: "tempHp", v: p.tempHp, icon: "💛", label: "เลือดชั่วคราว", cls: "bg-echo-ice text-gray-900", desc: "รับความเสียหายก่อนพลังชีวิต หายเองใน 2 เทิร์น" });
  return out;
}
// compact = ไอคอนล้วน ไม่มีข้อความชื่อ + จำกัดจำนวนแถวด้วย max แล้วยุบที่เหลือเป็นป้าย "+N"
//  ใช้กับการ์ดผู้เล่นอื่น/เป้าหมาย (บัฟ/ดีบัฟเยอะแล้วแถวยาวจนอ่านไม่รู้เรื่อง) — แตะที่การ์ดเพื่อดูรายละเอียดเต็มแทน (onInspect เดิม)
//  ปกติ (ไม่ compact) ยังมีชื่อเต็มเหมือนเดิม ใช้กับแผงตัวเราเองที่มีพื้นที่กว้างกว่า
// grid = แผงของตัวเอง (จอคอม): ตาราง 3 คอลัมน์ × 2 แถวตายตัว ชื่อยาวย่อด้วย … — เกิน 6 สถานะ
//  ช่องสุดท้ายเป็น "+N" ให้กดดูทั้งหมด (เดิมป้ายเต็มชื่อตัดบรรทัดอิสระ แถวที่ 3 ถูกกล่องสูง 2 แถวตัดครึ่ง = จอพัง)
export const STATUS_GRID_MAX = 6;

// สถานะที่เป็นสแตคถาวร/ตัวนับเรื่อยๆ ไม่ใช่ตัวนับถอยหลังเทิร์น (ต้องตรงกับรายการยกเว้นในลูปลดเทิร์นสถานะทั่วไปที่ server.js
//  ไม่งั้น StatusModal จะโชว์ "เหลือ N เทิร์น" หลอกๆ ทั้งที่ค่า v ที่แท้จริงคือจำนวนสแตคสะสม ไม่ใช่เทิร์นที่เหลือ)

// ค่าธง "ถาวร" ฝั่งเซิร์ฟเวอร์คือ 999 แต่บางสกิลใส่ซ้ำ/บวกทับจนโตกว่านั้นมาก
// ตัวนับเทิร์นจริงยาวสุดในเกมไม่ถึง 99 — เกินจากนี้ถือว่าไม่ใช่จำนวนเทิร์นแน่นอน
export const isPermanentTurnValue = (it) => (it.v || 0) >= 99;
export const isPermanentStatus = (it) => PERMANENT_STATUS_KEYS.has(it.key) || isPermanentTurnValue(it);
export const showStatusValue = (it) => (it.v > 1 || (it.showV && it.v > 0)) && !isPermanentTurnValue(it);
// หน้าคาดการณ์ผลการตี (BoardScenes ForecastScreen — ผู้ใช้สั่ง 2026-11-08): สถานะของทั้งสองฝั่ง · ชี้ = คำอธิบาย + จำนวนคงเหลือ
//  rem = ข้อความจำนวนคงเหลือแบบเดียวกับ StatusModal ("เหลือ N เทิร์น" / "ถาวร" / "สะสม N")
export function forecastStatusItems(p) {
  return statusEntries(p).map((it) => {
    let rem = null;
    if (it.v > 0) {
      if (isPermanentTurnValue(it)) rem = "ถาวร";
      else if (isPermanentStatus(it) || (!it.turns && !(it.key in (p.statuses || {})))) rem = it.v > 1 ? `สะสม ${it.v}` : null;
      else rem = `เหลือ ${it.v} เทิร์น`;
    }
    const n = it.amt > 0 ? `+${it.amt}` : rem && rem !== "ถาวร" ? it.v : null; // เลขบนชิป: จำนวนซ้อน > เทิร์น/สะสมที่เหลือ
    return { key: it.key, icon: it.icon, label: it.label, cls: it.cls, desc: it.desc, amt: it.amt || 0, rem, n };
  });
}
