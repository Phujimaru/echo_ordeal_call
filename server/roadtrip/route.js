// Road Trip: เส้นทาง — ภูมิภาค (ทุก 100 กม. วนรอบ) · กลางวัน/กลางคืน (ทุก 40 กม.) · ทางแยก (contract §2)
const REGIONS = ["plains", "desert", "forest", "snow", "ghost"];
const REGION_NAMES = { plains: "ทุ่งหญ้า", desert: "ทะเลทราย", forest: "ป่าสน", snow: "ทุ่งหิมะ", ghost: "เมืองร้าง" };
const REGION_KM = 100;
const NIGHT_KM = 40;
const BOSS_KM = 50;
const LEG_KM = 10;           // ช่วงขับละ ~25 วิ ที่ 100 กม./ชม. (KM_PER_SEC)
const LEGS_PER_FORK = 2;
const KM_PER_SEC = 0.004;    // กม. ต่อวินาทีจริง ต่อ 1 กม./ชม. (100 กม./ชม. = 0.4 กม./วิ)
const NODE_KINDS = ["gas", "motel", "fight", "elite", "event"];

function regionAt(km) {
  const n = Math.floor(Math.max(0, km) / REGION_KM);
  return { id: REGIONS[n % REGIONS.length], loop: Math.floor(n / REGIONS.length) };
}
function nightAt(km) { return Math.floor(Math.max(0, km) / NIGHT_KM) % 2 === 1; }

// ทางแยก 2–3 ทาง ไม่ซ้ำชนิด · น้ำมันน้อย (< 35%) = มีปั๊มเสมอ · อีลิทหลัง 20 กม. · โมเต็ลหลัง 30 กม.
function forkOptions(rt, rng = Math.random) {
  const pool = [
    { kind: "gas", w: 25 }, { kind: "fight", w: 25 }, { kind: "event", w: 22 },
    ...(rt.km >= 20 ? [{ kind: "elite", w: 12 }] : []),
    ...(rt.km >= 30 ? [{ kind: "motel", w: 12 }] : []),
  ];
  const n = rng() < 0.45 ? 3 : 2;
  const out = [];
  const needGas = rt.van.fuel < rt.van.fuelMax * 0.35;
  if (needGas) out.push("gas");
  while (out.length < n) {
    const left = pool.filter((o) => !out.includes(o.kind));
    if (!left.length) break;
    let r = rng() * left.reduce((s, o) => s + o.w, 0);
    const pick = left.find((o) => (r -= o.w) < 0) || left[left.length - 1];
    out.push(pick.kind);
  }
  // สลับตำแหน่ง (ปั๊มไม่ได้อยู่ช่องแรกเสมอ)
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  // ระยะถึงจุดหมาย (ผู้ใช้: "ระยะถึงปั๊มถัดไปขึ้นกับทางที่เลือก") — ปั๊ม/โมเต็ลไกลกว่า · สู้ใกล้
  const KM = { gas: [4, 9], motel: [6, 11], fight: [2, 6], elite: [2, 5], event: [3, 7] };
  return out.map((kind) => { const [a, b] = KM[kind] || [3, 7]; return { kind, km: a + Math.floor(rng() * (b - a + 1)) }; });
}
module.exports = { REGIONS, REGION_NAMES, REGION_KM, NIGHT_KM, BOSS_KM, LEG_KM, LEGS_PER_FORK, KM_PER_SEC, NODE_KINDS, regionAt, nightAt, forkOptions };
