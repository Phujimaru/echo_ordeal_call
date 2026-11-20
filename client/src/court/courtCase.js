// ศาลของนารุโฮโดะ (GRID_PLAN §7.37) — ข้อมูลคดี: บันทึกเหตุการณ์ → หลักฐาน / ข้อแก้ตัว / คำให้การ + กติกาตัดสินแต่ละครั้ง
// ไม่มี React — ใช้ได้ทั้งหน้าทดสอบ (?court=1) และฝั่ง server ภายหลัง
//  เหตุการณ์ (event) = { id, turn, kind: basic|secondary|ult|attack|move, skill, target, seen, type }
//  หลักฐาน = เหตุการณ์ที่นารุโฮโดะเห็น · ข้อแก้ตัว = จำนวนเหตุการณ์ที่เขาไม่เห็น (สูงสุด 3)
//  คำให้การ = ประโยคจากแม่แบบ: lie (ปฏิเสธสิ่งที่ทำจริง — มี key ให้หลักฐานจับ) / truth (เรื่องจริง — ยื่นอะไรใส่ก็ผิด)

export const EV_TYPES = {
  weapon: { i: "🔪", n: "อาวุธ" },
  foot: { i: "👣", n: "รอยเท้า" },
  receipt: { i: "💊", n: "ใบเสร็จ" },
  witness: { i: "📜", n: "พยาน" },
};
export const RULES = {
  cred: 5, testimonies: 3, statements: 3, pressPer: 1, counselObj: 1,
  wrong: 1, alibiBurn: 1, witnessBreak: 2, maxEvidence: 5, maxAlibi: 3,
  dmg: { weapon: 3, foot: 2, receipt: 2, witness: 4 },
  heal: { receipt: 1 },
};
const TYPE_OF = { basic: "weapon", attack: "weapon", secondary: "receipt", ult: "witness", move: "foot" };

const pick = (a, r) => a[Math.floor(r() * a.length)];
export const shuffle = (a, r = Math.random) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// แมตช์ปลอมสำหรับหน้าทดสอบ: จำเลยทำ 1 อย่างต่อเทิร์น 8 เทิร์น
export function mockMatch(def, others, r = Math.random) {
  const sk = def.sk || [];
  const names = { basic: sk[0] || "ตีปกติ", secondary: sk[1] || sk[0] || "ตีปกติ", ult: sk[2] || "ท่าไม้ตาย", attack: "ตีปกติ", move: "เดิน" };
  const ev = []; let ultUsed = false;
  for (let t = 1; t <= 8; t++) {
    let kind = pick(["basic", "basic", "secondary", "attack", "move", "ult"], r);
    if (kind === "ult" && (ultUsed || t < 3)) kind = "attack";
    if (kind === "ult") ultUsed = true;
    const target = kind === "move" ? null : pick(others, r).name;
    ev.push({ id: "e" + t, turn: t, kind, skill: names[kind], target, seen: r() < 0.6, type: TYPE_OF[kind] });
  }
  if (!ev.some((e) => e.seen)) ev[ev.length - 1].seen = true;
  return ev;
}

export function evidenceOf(events) {
  return events.filter((e) => e.seen).slice(-RULES.maxEvidence).map((e) => ({ ...e, used: false }));
}
export const alibiOf = (events) => Math.min(RULES.maxAlibi, events.filter((e) => !e.seen).length);
export const evName = (e) => (e.kind === "move" ? "รอยเท้า" : e.target ? `${e.skill} → ${e.target}` : e.skill);
export const evSub = (e) => `${EV_TYPES[e.type].n} · เทิร์น ${e.turn}`;

// ประโยคทั้งหมดที่จำเลยพูดได้จากบันทึก (ตัดเรื่องที่ถูกพิสูจน์แล้ว)
export function statementPool(events, proven = new Set()) {
  const out = [], seenKey = new Set();
  const add = (s) => { const k = s.kind + "|" + s.text; if (!seenKey.has(k) && !proven.has(s.text)) { seenKey.add(k); out.push(s); } };
  for (const e of events) {
    if (e.kind === "move") {
      add({ kind: "lie", key: { turn: e.turn }, text: `เทิร์น ${e.turn} ฉันยืนอยู่กับที่` });
      add({ kind: "truth", text: `เทิร์น ${e.turn} ฉันเดินไปอีกฝั่งของสนาม` });
      continue;
    }
    add({ kind: "lie", key: { skill: e.skill }, text: `ฉันไม่ได้ใช้ ${e.skill}` });
    if (e.target) add({ kind: "lie", key: { target: e.target }, text: `ฉันไม่เคยแตะต้อง ${e.target}` });
    add({ kind: "lie", key: { turn: e.turn }, text: `เทิร์น ${e.turn} ฉันไม่ได้ทำอะไรเลย` });
    add({ kind: "truth", text: e.target ? `ฉันใช้ ${e.skill} ใส่ ${e.target} ตอนเทิร์น ${e.turn}` : `ฉันใช้ ${e.skill} ตอนเทิร์น ${e.turn}` });
  }
  return out;
}

export function contradicts(st, ev) {
  if (!st || st.kind !== "lie" || !ev) return false;
  const k = st.key;
  return (k.skill != null && ev.skill === k.skill) || (k.target != null && ev.target === k.target) || (k.turn != null && ev.turn === k.turn);
}

// คำให้การของจำเลย AI: โกหก 2–3 + เรื่องจริงอุด · แปะข้อแก้ตัวสุ่ม
export function aiTestimony(pool, alibi, r = Math.random) {
  const lies = shuffle(pool.filter((s) => s.kind === "lie"), r), truths = shuffle(pool.filter((s) => s.kind === "truth"), r);
  const nl = Math.min(lies.length, r() < 0.5 ? 2 : 3);
  let list = [...lies.slice(0, nl), ...truths.slice(0, RULES.statements - nl)];
  list = shuffle(list, r).map((s) => ({ ...s, alibi: false, pressed: false, done: false }));
  let a = alibi;
  for (const s of shuffle(list, r)) if (s.kind === "lie" && a > 0 && r() < 0.45) { s.alibi = true; a--; }
  return list;
}

// ผลของการยื่นหลักฐาน (ไม่รวมฝ่ายค้านคัดค้าน — จัดการก่อนเรียก)
//  คืน { kind, dL, dD, healL, burn, breakAlibi, reveal }
export function presentResult(st, ev) {
  if (st.kind === "truth") return { kind: "irrelevant", dL: RULES.wrong };
  if (!contradicts(st, ev)) return { kind: "wrong", dL: RULES.wrong };
  if (st.alibi && ev.type !== "witness") return { kind: "alibi", dL: RULES.alibiBurn, burn: true, breakAlibi: true };
  if (st.alibi && ev.type === "witness") return { kind: "pierce", dD: RULES.witnessBreak, breakAlibi: true, burn: true };
  return { kind: "hit", dD: RULES.dmg[ev.type], healL: RULES.heal[ev.type] || 0, burn: true, reveal: ev.type === "foot" };
}

// AI ทนาย: ยื่นหลักฐานที่จับได้ · บางทีกดเดี๋ยวก่อน · บางทีพลาด
export function aiLawyerPlan(st, evidence, pressLeft, r = Math.random) {
  const live = evidence.filter((e) => !e.used);
  const hit = live.find((e) => contradicts(st, e));
  const press = st.kind === "lie" && pressLeft > 0 && r() < 0.4;
  let present = null;
  if (hit && r() < 0.9) present = hit;
  else if (live.length && r() < 0.12) present = pick(live, r);
  return { press, present };
}
