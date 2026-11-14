// Road Trip — ตัวเลขของคู่มือ (RtGuide.jsx) + การ์ดมอน (RtMobInfo.jsx)
//  ทุกค่าที่นี่ซ้ำจาก server/roadtrip/* — tests/roadtrip-guide.test.js เทียบกับ server ทุกตัว (แก้ server แล้วเทสต์จะฟ้อง)
//  ใช้แสดงผลเท่านั้น · server ตัดสินค่าจริงทั้งหมด

// route.js · drive.js · fight.js · index.js SECS
export const RT_ROUTE = {
  bossKm: 50, regionKm: 100, nightKm: 40,
  forkKm: { gas: [4, 9], motel: [6, 11], fight: [2, 6], elite: [2, 5], event: [3, 7] },
  eliteFromKm: 20, motelFromKm: 30, lowFuelPct: 35,
  secs: { fork: 15, event: 20 }, // จุดพัก (ปั๊ม/โมเต็ล/แคมป์) ไม่จำกัดเวลา — ทุกคนพร้อม = ออก
};
export const RT_DRIVE = { fuelPerKm: 0.6, emptyKmh: 30, nitroMs: 5000, nitroMul: 1.5, driverIdleMs: 20000, hzWarnMs: 5000, onvanPct: 15, onvanMinKm: 25 };
export const RT_REWARD = { base: 3, perKm: 25, elite: 5, boss: 10 };
export const RT_FIGHT = { swerve: { cd: 1, dmg: 2, stun: 1 }, roofFall: 0.15, turretRange: 5, turretBase: 2, fallDmg: 2, maxRounds: 15, dog: { hp: 6, armor: 1, mov: 5, atk: 2 } };
// ค่าความยาก (diff.js DIFF) — เฉพาะค่าที่คู่มือใช้
export const RT_DIFF = {
  easy: { grow: 0.03, count: 0.8, fuel: 0.7, price: 0.8, revive: 6, autoRevive: true, hazard: 1, bossHp: 0.8, bossGrow: 0.15, bossAtk: -1 },
  normal: { grow: 0.04, count: 1, fuel: 1, price: 1, revive: 10, autoRevive: false, hazard: 2, bossHp: 1, bossGrow: 0.2, bossAtk: 0 },
  hard: { grow: 0.055, count: 1.15, fuel: 1.15, price: 1.15, revive: null, autoRevive: false, hazard: 3, bossHp: 1.15, bossGrow: 0.25, bossAtk: 0 },
};
// stop.js · stash.js · van.js
export const RT_STOP = { fuelPerGold: 4, dogFeeds: 3, repairPerGold: 3 };
export const RT_STASH = { base: 6, perLv: 2 };
export const RT_BAG_CAP = 8;
// camp.js CAMP/NIGHT/MALLOW · food.js (แคมป์ + วัตถุดิบ/อาหาร — ผู้ใช้สั่ง 2026-11-14)
export const RT_CAMP = {
  voteMs: 15000, cdKm: 40, bossGapKm: 10, cookMs: 4000, joinMs: 8000, playMs: 12000, fireReach: 2, repairHp: 3, greatAt: 0.8, sunriseMs: 4500, afkSecs: 300,
  mallow: { golden: 0.85, ok: 0.5, goldenHeal: 2, goldenGold: 1, okHeal: 1 },
  story: { evade: 15, turns: 2, matchGold: 1, min: 2 }, sing: { heal: 1, pass: 0.5, great: 0.8, min: 2 }, canoe: { heal: 1, gold: 1, greatGold: 2, pass: 0.5, great: 0.8 },
  stars: { gold: 2 }, fish: { casts: 3, ok: 0.4, great: 0.8, greatN: 2 }, chop: { perPlayer: 2, ok: 0.5 }, fireMax: 3, rest: { hammockHeal: 2, petHeal: 1 },
};
export const RT_FOOD = {
  stack: 5, grocer: 3, vendor: 2, greatHeal: 1, feast: { min: 2, guard: 1, turns: 1 },
  ing: { ingRice: 1, ingEgg: 1, ingVeg: 1, ingSpice: 1, ingMeat: 2, ingFish: 2 },
};
// vanfun.js FUN (ค่าที่คู่มือใช้)
export const RT_FUN = {
  dice: { antes: [1, 2, 3], max: 6 },
  jam: { lenMs: 20000, tiers: [{ min: 0.35, evade: 15, might: 0, turns: 1 }, { min: 0.6, evade: 15, might: 1, turns: 1 }, { min: 0.9, evade: 20, might: 1, turns: 2 }] },
  grill: { perLeg: 2, max: 6, heal: 2, armor: 1 },
  spot: { max: 2, coin: 2, itemPct: 25 },
  fridge: { stock: 3, heal: 1 },
  repair: { needMs: 5000, hp: 1, cdMs: 20000 },
};

// mobs.js — ค่าฐาน + ความสามารถ (ROSTER) · ELITE · เพดาน · การขยายตามจำนวนผู้เล่น
export const RT_MOB_CAPS = { atk: 6, bossAtk: 8, count: 12 };
export const RT_ELITE = { hp: 2, atk: 1, armor: 1, gold: 3 };
export const RT_CHASERS = ["biker", "crow", "stray", "trucker", "boar", "saberclaw", "ghost"];
export const RT_BOSSES = ["devilTruck", "darkKnight", "jormungand"];
export const RT_MOBS = {
  stray: { name: "หมาจรจัด", hp: 3, armor: 0, atk: 1, mov: 5, gold: 1, icon: "🐕" },
  crow: { name: "อีกาเหล็ก", hp: 2, armor: 0, atk: 1, mov: 5, gold: 1, fly: true, icon: "🐦‍⬛" },
  biker: { name: "แก๊งมอเตอร์ไซค์", hp: 4, armor: 1, atk: 2, mov: 4, gold: 2, dash: 5, icon: "🏍️" },
  trucker: { name: "ซอมบี้รถบรรทุก", hp: 7, armor: 2, atk: 2, mov: 3, gold: 3, ram: 3, icon: "🧟" },
  giant: { name: "ยักษ์ขวางถนน", hp: 14, armor: 3, atk: 3, mov: 2, gold: 5, icon: "🗿" },
  cactus: { name: "กระบองเพชรเดินได้", hp: 5, armor: 1, atk: 1, mov: 3, gold: 2, thorns: 1, icon: "🌵" },
  boar: { name: "หมูป่า", hp: 6, armor: 1, atk: 2, mov: 4, gold: 2, dash: 3, icon: "🐗" },
  yeti: { name: "มนุษย์หิมะ", hp: 9, armor: 2, atk: 2, mov: 3, gold: 3, slowHit: true, icon: "❄️" },
  ghost: { name: "ผีโบกรถ", hp: 4, armor: 0, atk: 2, mov: 4, gold: 2, phase: true, icon: "👻" },
  saberclaw: { name: "เสือเขี้ยวดาบ", hp: 6, armor: 1, atk: 2, mov: 6, gold: 3, dash: 4, icon: "🐅" },
  devilTruck: { name: "แม็กซ์ เวอร์สแตปเพน", hp: 40, armor: 3, atk: 4, mov: 3, gold: 15, boss: true, icon: "🏎️" },
  darkKnight: { name: "อัศวินเงามรณะ", hp: 48, armor: 5, atk: 4, mov: 3, gold: 18, boss: true, icon: "⚔️" },
  jormungand: { name: "จอร์มุนกันด์", hp: 44, armor: 2, atk: 4, mov: 2, gold: 20, boss: true, icon: "🐍" },
};
export const RT_MOB_ORDER = ["stray", "crow", "saberclaw", "biker", "boar", "cactus", "yeti", "ghost", "trucker", "giant"];
// ที่เจอ (mobs.js poolFor)
export const RT_MOB_WHERE = {
  stray: "ทุกที่ · หายไปหลัง 150 กม.", crow: "ทุกที่", saberclaw: "หลัง 10 กม. · ชุมในป่าสน/ทุ่งหิมะ", biker: "หลัง 25 กม.",
  boar: "ป่าสน", cactus: "ทะเลทราย", yeti: "ทุ่งหิมะ", ghost: "กลางคืน · เมืองร้าง", trucker: "หลัง 75 กม.", giant: "หลัง 75 กม.",
};
export const partyMul = (n) => 0.65 + 0.1 * Math.min(6, n);
export const bossPartyMul = (n) => 0.1 + 0.2 * Math.min(6, n);

// ความสามารถ (ป้ายสั้น + คำอธิบายตอนชี้) — ตรงกับพฤติกรรมใน mobs.js actOne/hit/walkOpts
export function mobTraits(type) {
  const b = RT_MOBS[type];
  if (!b) return [];
  const out = [];
  if (b.fly) out.push({ key: "fly", icon: "🪽", label: "บินได้", desc: "บินข้ามสิ่งกีดขวาง · ตีคนบนหลังคารถตู้ได้" });
  if (b.dash) out.push({ key: "dash", icon: "💨", label: `พุ่งชน ${b.dash}`, desc: `เป้าอยู่แนวตรงไม่เกิน ${b.dash} ช่อง ทางโล่ง = พุ่งไปติดแล้วตี พลังโจมตี +1` });
  if (b.ram) out.push({ key: "ram", icon: "🚚", label: `ชนกระแทก ${b.ram}`, desc: `เป้าอยู่แนวตรงไม่เกิน ${b.ram} ช่อง = ชนแล้วตี พลังโจมตี +1 · เป้ากระเด็น 1 ช่อง` });
  if (b.thorns) out.push({ key: "thorns", icon: "🌵", label: `หนาม ${b.thorns}`, desc: `ต้นตาของมัน ทุกคนที่ยืนติดตัวโดน ${b.thorns}` });
  if (b.slowHit) out.push({ key: "slowHit", icon: "🧊", label: "ตีแล้วเชื่องช้า", desc: "ตีโดน = เชื่องช้า 1 เทิร์น" });
  if (b.phase) out.push({ key: "phase", icon: "🌫️", label: "ทะลุร่าง", desc: "กลางคืนหรือในเมืองร้าง เดินทะลุทุกอย่าง" });
  if (b.boss) out.push({ key: "boss", icon: "👑", label: "บอส", desc: "ตีคนบนหลังคาได้ · ท่าใหญ่เตือนช่องก่อน 1 เทิร์น · ทุกท่าหลบได้" });
  if (RT_CHASERS.includes(type)) out.push({ key: "chase", icon: "🚐", label: "ไล่รถทัน", desc: "โผล่ตอนมอนไล่ล่ารถตู้ (สู้บนรถ) ได้" });
  return out;
}
export const RT_ROLES = {
  hunter: { icon: "🎯", label: "ล่าผู้เล่น", desc: "เดินหาผู้เล่นที่ใกล้สุด (ระยะทางเดินจริง) แล้วตีในตาเดียวกันถ้าถึง" },
  saboteur: { icon: "🔨", label: "ป่วนรถ", desc: "เดินไปทุบรถตู้ · มีคนยืนติดตัว = ตีคนนั้นก่อน · ราว 1 ใน 4 ของฝูง" },
};
export const RT_ELITE_INFO = { icon: "💀", label: "หัวหน้า", desc: `เลือด ×${RT_ELITE.hp} +2 · พลังโจมตี +${RT_ELITE.atk} · เกราะ +${RT_ELITE.armor} · เหรียญ +${RT_ELITE.gold}` };
export const RT_BOSS_PHASES = [
  { n: 1, label: "ระยะ 1", desc: "เลือดมากกว่า 50%" },
  { n: 2, label: "ระยะ 2", desc: "เลือด ≤ 50% · ปลดท่าใหม่" },
  { n: 3, label: "คลั่ง", desc: "เลือด ≤ 20% · พลังโจมตี +1 · เดิน +1" },
];
// ท่าบอส (mobs.js MOVE · movesFor · bossPre) — ดาเมจ = พลังโจมตี + โบนัส
export const RT_BOSS_MOVES = {
  devilTruck: [
    { ph: 1, name: "ฟาดรถ F1", desc: "โค้ง 3 ช่องหน้าตัว พลังโจมตี +1 · กระเด็น 1 ช่อง" },
    { ph: 1, name: "ขี่รถ F1 พุ่งชน", desc: "เตือนแนวตรง 6 ช่อง → พุ่งทั้งแนว พลังโจมตี +2 · คนบนแนวกระเด็นออกข้าง" },
    { ph: 1, name: "โยนรถ F1 ใส่", desc: `วง 3×3 ระยะ ≤ 5 พลังโจมตี +2 · ซากรถกลางวงเป็นสิ่งกีดขวาง (♥ 4) อยู่ 2 เทิร์น` },
    { ph: 2, name: "พิทสต็อป", desc: "เลือดถึง 50% และ 20% ครั้งละหน: หลบทุกอย่าง 1 เทิร์น · ฟื้น 25% · พุ่งแรงขึ้น" },
    { ph: 2, name: "DRS / ล็อกล้อ", desc: "บางตาเดิน ×2 พุ่งยาว · พุ่งแล้ว 20% หมุนติ้วมึน 1 เทิร์น" },
    { ph: 2, name: "โดนัทฉลองแชมป์", desc: "ฆ่าผู้เล่นได้ = โดนัทวง 1 (กระเด็น) + แชมเปญวง 2 (เชื่องช้า)" },
  ],
  darkKnight: [
    { ph: 1, name: "พุ่งชน", desc: "เตือนแนวตรง → พุ่งทั้งแนว พลังโจมตี +2" },
    { ph: 1, name: "ฟันกว้าง", desc: "หน้าตัว 3×2 พลังโจมตี +3" },
    { ph: 2, name: "เงาอัศวิน", desc: "เข้าระยะ 2 = แยกเงา 2 ตัว (♥ 3 · พลังโจมตี 1 · ตัวล่อ)" },
    { ph: 2, name: "คลื่นดาบเงา", desc: "แนวตรง 9 ช่อง พลังโจมตี +2" },
    { ph: 2, name: "หนามเงาผุด", desc: "ใต้ผู้เล่นในระยะ 6 (สูงสุด 3 คน) พลังโจมตี +2" },
  ],
  jormungand: [
    { ph: 1, name: "ฉก", desc: "แนวตรง 6 ช่อง พลังโจมตี +2 · เชื่องช้า" },
    { ph: 1, name: "ฟาดหาง", desc: "รอบตัว 8 ช่อง พลังโจมตี +1 · กระเด็น" },
    { ph: 1, name: "คลื่นน้ำแข็ง", desc: "รัศมี 2 พลังโจมตี +1 · เชื่องช้า" },
    { ph: 2, name: "ถนนน้ำแข็ง", desc: "เข้าระยะ 2 = พื้นรอบผู้เล่นเป็นน้ำแข็ง ลื่น 3 เทิร์น" },
    { ph: 2, name: "คลื่นยักษ์", desc: "2 แถวเต็มความกว้าง พลังโจมตี +1 · ดันออกห่าง 1 ช่อง" },
    { ph: 2, name: "คุกน้ำแข็ง", desc: "คนที่ใกล้สุดในระยะ 6 พลังโจมตี +1 · ตรึง" },
  ],
};
export const mobImg = (type) => `/roadtrip/mobs/${type}.webp`;
