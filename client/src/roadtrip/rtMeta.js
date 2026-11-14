// Road Trip — ข้อมูลแสดงผลฝั่ง client (ชื่อ ไอคอน สี) · ตัวเลขตามสัญญา roadtrip-contract.md §3 + ต้นแบบ road-trip-van.html
//  server เป็นผู้ตัดสินค่าจริงทั้งหมด — ที่นี่ใช้แสดงผลเท่านั้น

// หมุด Road Trip บนลูกโลก (หน้าเลือกโหมด ModeVote + ฉากดิ่งตอนเริ่มแมตช์ rtFlight.js ต้องตรงกัน)
export const RT_GEO = { lon: -62, lat: 30 };

export const REGIONS = {
  plains: { name: "ทุ่งหญ้า", color: "#5fb35a", icon: "🌾" },
  desert: { name: "ทะเลทราย", color: "#e0a03a", icon: "🏜️" },
  forest: { name: "ป่าสน", color: "#2f8a55", icon: "🌲" },
  snow: { name: "ทุ่งหิมะ", color: "#5aaee0", icon: "❄️" },
  ghost: { name: "เมืองร้าง", color: "#7a62a8", icon: "👻" },
};
export const regionOf = (id) => REGIONS[id] || { name: id || "—", color: "#e0702e", icon: "🛣️" };
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
export const roman = (n) => ROMAN[Math.max(0, (n | 0) - 1)] || String(n);

// ทางแยก (fork.options[].kind) — ชื่อตามที่ผู้ใช้ตั้ง (2026-11-14) · desc = ข้อความตอนชี้เมาส์เท่านั้น (ไม่ขึ้นบนจอถาวร)
export const FORK_KINDS = {
  gas: { name: "ปั๊มน้ำมัน", icon: "⛽", color: "#3d8bd9", desc: "แวะเติมน้ำมัน ซื้อของที่มินิมาร์ท อัปเกรด/ซ่อมรถที่อู่ และเล่นกิจกรรม · คนที่ล้มฟื้นกลับมาครึ่งเลือด" },
  motel: { name: "โรงแรม", icon: "🏨", color: "#1f8a6b", desc: "นอนพักหนึ่งคืน — ทุกคนเลือดเต็ม คนที่ล้มฟื้นเต็ม ซ่อมรถตู้ครึ่งหนึ่ง (ไม่มีปั๊มและอู่)" },
  fight: { name: "มอนดักทาง", icon: "⚔️", color: "#d2455b", desc: "ฝูงมอนดักรอกลางถนน ต้องสู้ — ชนะได้เหรียญโบนัส" },
  elite: { name: "มอนระดับสูง", icon: "💀", color: "#7a3fd0", desc: "ฝูงมอนที่มีหัวหน้าคุม แรงกว่าปกติ — ชนะได้เหรียญโบนัสเพิ่มอีก 5" },
  event: { name: "เหตุการณ์ไม่คาดฝัน", icon: "❓", color: "#e0a526", desc: "สุ่มเรื่องวุ่นๆ ข้างทาง แล้วทั้งทีมโหวตว่าจะรับมือยังไง — มีทั้งของดีและเรื่องซวย" },
  boss: { name: "บอสไล่ล่า", icon: "👹", color: "#8e1a12", desc: "บอสไล่ตามมา ต้องสู้จนกว่าจะล้มมันได้ — ชนะได้เหรียญโบนัสเพิ่มอีก 10" },
  shortcut: { name: "ทางลัด", icon: "⚡", color: "#e0702e", desc: "ตัดทางให้ถึงไวขึ้น แต่ไม่รู้ว่าข้างหน้าจะเจออะไร" },
};
export const forkKind = (k) => FORK_KINDS[k] || { name: k || "?", icon: "❓", color: "#e0702e" };

// เหตุการณ์ถนน (event.kind) — ชื่อ/ไอคอนสำรองถ้า server ไม่ส่ง title · ภาพ /roadtrip/events/<kind>.webp ถ้ามี
//  คีย์ตรงกับ server/roadtrip/events.js (police · cows · hitchhiker · truck · merchant · shrine · race) + ชนิดสำรองไว้ใช้ภายหลัง
export const EVENT_KINDS = {
  police: { name: "ด่านตรวจกลางทาง", icon: "🚓", color: "#3d6fd9" },
  cows: { name: "ฝูงวัวขวางถนน", icon: "🐄", color: "#7cc46a" },
  hitchhiker: { name: "คนโบกรถ", icon: "🙋", color: "#e0702e" },
  truck: { name: "รถขนของคว่ำ", icon: "🚚", color: "#e0a03a" },
  merchant: { name: "พ่อค้าเร่ริมทาง", icon: "🧳", color: "#1f8a6b" },
  shrine: { name: "ศาลข้างทาง", icon: "⛩️", color: "#c9483f" },
  race: { name: "รถซิ่งท้าแข่ง", icon: "🏎️", color: "#d2455b" },
  ghost: { name: "ผีโบกรถ", icon: "👻", color: "#7a62a8" },
  bridge: { name: "สะพานขาด", icon: "🌉", color: "#5a7a9c" },
  storm: { name: "พายุเข้า", icon: "⛈️", color: "#4a5a7a" },
  parcel: { name: "พัสดุตกกลางถนน", icon: "📦", color: "#b8862a" },
  roadwork: { name: "ถนนกำลังซ่อม", icon: "🚧", color: "#f0a020" },
};
export const eventKind = (k) => EVENT_KINDS[k] || { name: "เหตุการณ์", icon: "❓", color: "#e0a526" };

// ความยาก (state.roadtrip.diff) — desc ตามตาราง server/roadtrip/diff.js (ชี้เมาส์ที่ปุ่มเลือกความยาก)
export const DIFFS = {
  easy: { name: "ง่าย", lv: 1, color: "#3f9a6b", price: 0.8, desc: "มอนโหดขึ้นช้าและมาน้อยลง · น้ำมันหมดช้า · ของถูกลง 20% · ขนนกคืนชีพราคาถูก · คนที่ล้มฟื้นเองครึ่งเลือดหลังจบการต่อสู้" },
  normal: { name: "ปกติ", lv: 2, color: "#3d8bd9", price: 1, desc: "มอน น้ำมัน และราคาของตามมาตรฐาน · ขนนกคืนชีพมีขายที่มินิมาร์ททุกปั๊ม" },
  hard: { name: "ยาก", lv: 3, color: "#c9483f", price: 1.25, desc: "มอนโหดขึ้นไวและมาเยอะขึ้น · น้ำมันหมดไว · ของแพงขึ้น 25% · ชนสิ่งกีดขวางเจ็บกว่า · ขนนกคืนชีพไม่มีขายประจำ" },
};
export const diffOf = (d) => DIFFS[d] || DIFFS.normal;

// อัปเกรด 8 อย่าง × ขั้น 0–3 (van.upg) — ค่าแสดงผลตามสัญญา §3 · ราคา ขั้น 1/2/3 = 6/10/16 × ราคาตามความยาก
export const UPG_PRICE = [6, 10, 16];
//  desc = ผลของอัปเกรดทุกขั้น 0 → 3 (ชี้เมาส์) — ตัวเลขตรงกับ server/roadtrip/van.js TABLE
export const UPGRADES = [
  { key: "body", name: "ตัวถังเสริม", icon: "🛡️", vals: [20, 30, 40, 55], unit: "HP", desc: "HP รถตู้สูงสุด 20 → 30 → 40 → 55 · อัปแล้วได้ HP ส่วนที่เพิ่มทันที · รถตู้พัง = จบการเดินทาง" },
  { key: "engine", name: "เครื่องยนต์", icon: "⚙️", vals: [100, 115, 130, 150], unit: "กม./ชม.", desc: "ความเร็ว 100 → 115 → 130 → 150 กม./ชม. · ถึงทางแยกไวขึ้น และชนะรถซิ่งท้าแข่งได้ชัวร์" },
  { key: "tank", name: "ถังน้ำมัน", icon: "⛽", vals: [40, 60, 80, 100], unit: "ลิตร", desc: "จุน้ำมัน 40 → 60 → 80 → 100 ลิตร (ราว 0.6 ลิตรต่อ กม.) · อัปแล้วได้น้ำมันส่วนที่เพิ่มทันที · หมดถัง = คลาน 30 กม./ชม." },
  { key: "susp", name: "ช่วงล่าง", icon: "🛞", vals: [1, 1.3, 1.6, 2], fmt: (v) => `×${v}`, desc: "เปลี่ยนเลนไวขึ้น ×1 → ×1.3 → ×1.6 → ×2 · หักหลบสิ่งกีดขวางทันกว่าเดิม" },
  { key: "nitro", name: "ไนตรัส", icon: "🔥", vals: [0, 1, 2, 3], desc: "บูสต์ความเร็ว ×1.5 นาน 5 วิ ได้ 0 → 1 → 2 → 3 ครั้ง · เติมเต็มทุกจุดพัก" },
  { key: "turret", name: "ป้อมปืน", icon: "🎯", vals: [0, 1, 2, 3], desc: "ป้อมปืนบนหลังคายิงมอนที่อยู่ใกล้รถที่สุดเองทุกรอบ ดาเมจ 0 → 1 → 2 → 3" },
  { key: "bumper", name: "กันชนเหล็ก", icon: "🦏", vals: [0, 1, 2, 3], desc: "ชนสิ่งกีดขวางเสีย HP น้อยลง 0 → 1 → 2 → 3 · มอนที่ขวางหน้ารถโดนชนแรงเท่ากัน" },
  { key: "storage", name: "ที่เก็บของ", icon: "🧳", vals: [0, 1, 2, 3], fmt: (v) => `+${v}`, desc: "ช่องกระเป๋าของทุกคนเพิ่ม +0 → +1 → +2 → +3" },
];
export const upgPrice = (lv, diff, van) => {
  if (lv >= 3) return null;
  if (van && van.prices && Array.isArray(van.prices) && van.prices[lv] != null) return van.prices[lv];
  return Math.round(UPG_PRICE[lv] * diffOf(diff).price);
};
export const fmtUpg = (u, lv) => {
  const v = u.vals[Math.max(0, Math.min(3, lv | 0))];
  return u.fmt ? u.fmt(v) : String(v);
};

// ของแต่ง 20 อย่าง (ชื่อตามต้นแบบ — van.decor = รายชื่อที่เปิดอยู่)
//  ชื่อห้ามเปลี่ยน (ตรงกับ van3d.js DECOR + server van.js) · desc = ชี้เมาส์ · ของแต่งทุกชิ้นไม่มีผลค่าสถานะ (DECOR_NOTE ต่อท้าย)
export const DECOR_NOTE = "ของแต่งฟรี ไม่มีผลต่อค่าสถานะ";
export const DECOR = [
  { name: "ไฟหลังคา", icon: "🚨", desc: "ไฟไซเรนกะพริบบนหลังคา ใครเห็นก็หลบทาง" },
  { name: "แร็คหลังคา", icon: "🧺", desc: "แร็คขนของบนหลังคา ดูพร้อมเที่ยวสุดๆ" },
  { name: "ธง", icon: "🚩", desc: "ธงสะบัดตามลมตอนรถวิ่ง" },
  { name: "ตุ๊กตาหน้ารถ", icon: "🧸", desc: "ตุ๊กตาหัวโยกหน้ารถ โยกตามทุกโค้ง" },
  { name: "ลายไฟ", icon: "🔥", desc: "ลายเปลวไฟข้างรถ แรงขึ้นแค่ในใจ" },
  { name: "ลายดอกไม้", icon: "🌺", desc: "ลายดอกไม้สไตล์ฮิปปี้ ทริปนี้ต้องชิล" },
  { name: "หน้ายิ้ม", icon: "😊", desc: "หน้ารถยิ้มแฉ่งให้ทุกคนบนถนน" },
  { name: "ขนตา", icon: "👁️", desc: "ขนตางอนเหนือไฟหน้า ส่งสายตาใส่มอน" },
  { name: "หูแมว", icon: "🐱", desc: "หูแมวบนหลังคา เมี้ยว" },
  { name: "เขากวาง", icon: "🦌", desc: "เขากวางบนหลังคา เท่แบบป่าๆ" },
  { name: "ครีบฉลาม", icon: "🦈", desc: "ครีบฉลามบนหลังคา ว่ายผ่านถนนได้เลย" },
  { name: "ล้อแม็กทอง", icon: "🌟", desc: "ล้อแม็กสีทองอร่าม" },
  { name: "ท่อคู่", icon: "💨", desc: "ท่อไอเสียคู่ พ่นควันโชว์" },
  { name: "ไฟใต้ท้อง", icon: "💡", desc: "ไฟนีออนใต้ท้องรถ สวยสุดตอนกลางคืน" },
  { name: "ป้ายหลังคา", icon: "🪧", desc: "ป้ายไฟบนหลังคา ประกาศให้โลกรู้ว่าใครมา" },
  { name: "ลูกโป่ง", icon: "🎈", desc: "ลูกโป่งผูกรถ ปลิวไสวตลอดทาง" },
  { name: "ไฟประดับนอก", icon: "✨", desc: "ไฟประดับรอบตัวรถ เหมือนรถงานวัด" },
  { name: "เซิร์ฟบอร์ด", icon: "🏄", desc: "เซิร์ฟบอร์ดบนหลังคา เผื่อเจอทะเล" },
  { name: "กันชนกันวัว", icon: "🐂", desc: "กันชนกันวัวหน้ารถ (แค่ของแต่ง ไม่ใช่อัปเกรดกันชนเหล็ก)" },
  { name: "บังแดดกระจกหน้า", icon: "🕶️", desc: "บังแดดเหนือกระจกหน้า รถก็ต้องใส่แว่นกันแดด" },
];

// ทรงรถ (van.style)
export const STYLES = [
  { key: "normal", name: "มาตรฐาน", icon: "🚐", desc: "ทรงรถตู้คลาสสิก" },
  { key: "goofy", name: "ติ๊งต๊อง", icon: "🤪", desc: "ทรงสูงป่อง ตาโตแป๋ว ล้อโต แตรเสียงตลก" },
  { key: "cool", name: "เท่", icon: "😎", desc: "ทรงเตี้ยกว้าง คาดแถบซิ่ง กระจกดำ" },
];
// สีรถ (van.paint — hex) ตามต้นแบบ
export const PAINTS = [
  { name: "ฟ้า", hex: "#7fb8d8" }, { name: "ส้ม", hex: "#f08a4b" }, { name: "เหลือง", hex: "#f2c94c" }, { name: "มิ้นต์", hex: "#8fd3b0" },
  { name: "ชมพู", hex: "#f2a1b5" }, { name: "แดง", hex: "#d9534f" }, { name: "กรมท่า", hex: "#34497a" }, { name: "ขาว", hex: "#eeeeea" },
];
// ทะเบียน: ≤ 9 ตัว ตัดอักขระควบคุม (server ตัดซ้ำ)
export const cleanPlate = (t) => String(t || "").replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 9);
