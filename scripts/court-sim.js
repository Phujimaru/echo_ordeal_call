// จำลองความสมดุลศาลนารุโฮโดะ (Monte Carlo) — ใช้กติกาจริงจาก server/court.js
//  (statementPool / balancePool / contradicts / presentResult / minLiesOf / statementsOf / RULES) — ไม่ใช้ฉาก/ตัวจับเวลา
//  node scripts/court-sim.js [จำนวนคดีต่อคู่ = 5000]
//  ปรับกติกาชั่วคราว: SIM_RULES='{"presentPer":99,"wrong":1}' node scripts/court-sim.js
//  SIM_PRESET=old = กติกาก่อนจูน (ยื่นไม่จำกัด · ถูก −2..4 · ผิด −1 · ไม่มีข้อแก้ตัวโบนัส)
const Court = require("../server/court");
const R = Court.RULES;

const OLD = { presentPer: 99, bonusAlibi: 0, pressReveals: false, wrong: 1, alibiBurn: 1, witnessBreak: 2, dmg: { weapon: 3, foot: 2, receipt: 2, witness: 4 }, heal: { receipt: 1 } };
if (process.env.SIM_PRESET === "old") Object.assign(R, OLD);
if (process.env.SIM_RULES) Object.assign(R, JSON.parse(process.env.SIM_RULES));

const N = Number(process.argv[2]) || 5000;
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const TYPE = { attack: "weapon", basic: "weapon", secondary: "receipt", ultimate: "witness", move: "foot" };

// ---------- แมตช์จำลอง ----------
function makeCase() {
  const kit = ["ฟันดาบ", "ยาพิษ", "ระเบิดใหญ่", "ตีปกติ"];
  const roster = shuffle(["เซลิน", "ยูนะ", "ฟ้าใส", "กิระ", "ไจโร"]).slice(0, rnd(3, 5));
  const lastRound = rnd(5, 10);
  const events = [];
  const nEv = rnd(6, 14);
  for (let i = 0; i < nEv; i++) {
    const r = Math.random();
    const kind = r < 0.3 ? "attack" : r < 0.55 ? "basic" : r < 0.72 ? "secondary" : r < 0.8 ? "ultimate" : "move";
    const skill = kind === "attack" ? "ตีปกติ" : kind === "basic" ? "ฟันดาบ" : kind === "secondary" ? "ยาพิษ" : kind === "ultimate" ? "ระเบิดใหญ่" : "เดิน";
    events.push({ id: `e${i}`, round: rnd(1, lastRound), actorId: "D", actorName: "จำเลย", kind, skill, targetName: kind === "move" ? null : pick(roster), type: TYPE[kind] });
  }
  events.sort((a, b) => a.round - b.round);
  const hitBy = {};
  for (const t of roster) if (Math.random() < 0.4) hitBy[t] = rnd(1, lastRound);
  // แฟ้มทนาย 2–5 · พยานประชาชน 0–3 (ได้หลักฐานตั้งแต่ยก 2) · ข้อแก้ตัว 0–3
  const sh = shuffle(events);
  const folder = sh.slice(0, Math.min(sh.length, rnd(2, 5)));
  const sight = sh.slice(folder.length, folder.length + rnd(0, 3));
  return { kit, roster: [...roster, "นารุโฮโดะ ริวอิจิ"], lastRound, events, hitBy, folder, sight, alibi: rnd(0, 3) };
}

// ---------- ผู้เล่นจำลอง ----------
const subjectMatch = (s, e) => {
  const k = s.k || {};
  return (k.skill && e.skill === k.skill) || (k.target && e.targetName === k.target) || (k.claim && (e.targetName === k.claim || e.skill === k.claim))
    || (k.turn != null && e.round === k.turn) || (k.from != null && e.kind === "move");
};
// จำเลยเลือก n ประโยค (ปลอมพอดี need) + ข้อแก้ตัว
function defPick(pool, need, alibis, roundsLeft, folder, smart) {
  const n = Court.statementsOf(pool);
  const lies = pool.filter((s) => s.kind === "lie"), truths = pool.filter((s) => s.kind === "truth");
  const threat = (s) => folder.filter((e) => Court.contradicts(s, e, "D")).length;
  let L, T;
  if (smart) {
    L = lies.slice().sort((a, b) => threat(a) - threat(b) || Math.random() - 0.5).slice(0, need);
    const bait = (s) => folder.filter((e) => subjectMatch(s, e)).length; // เรื่องจริงที่ดูเหมือนแย้งได้ = ล่อให้ยื่นผิด
    T = truths.slice().sort((a, b) => bait(b) - bait(a) || Math.random() - 0.5).slice(0, n - need);
  } else {
    L = shuffle(lies).slice(0, need);
    T = shuffle(truths).slice(0, n - need);
  }
  const list = shuffle([...L, ...T]).map((s) => ({ ...s, alibi: false, done: false, tried: false, pressed: false }));
  let a = alibis;
  const budget = smart ? Math.ceil(alibis / Math.max(1, roundsLeft)) : alibis;
  const liesIn = list.filter((s) => s.kind === "lie");
  const order = smart ? liesIn.sort((x, y) => threat(y) - threat(x)) : shuffle(liesIn);
  let used = 0;
  for (const s of order) if (a > 0 && used < budget && (smart || Math.random() < 0.5)) { s.alibi = true; a--; used++; }
  return list;
}
// ทนาย: blind = สุ่มล้วน · random = มือใหม่ (ครึ่งหนึ่งเลือกหลักฐานที่ "เรื่องตรง" อีกครึ่งสุ่ม) · brute = ยื่นของที่เรื่องตรงทุกประโยค
//  smart = อ่านความขัดแย้งถูก 70% + กดดันประโยคที่น่าสงสัยสุดก่อน (แตกข้อแก้ตัว) + ไม่ยื่นถ้าไม่มั่นใจ
function lawyerPlan(list, folder, policy, known) {
  const live = list.filter((s) => !s.done && !s.tried);
  if (policy === "blind") return { press: pick(live), presents: shuffle(live).map((s) => ({ s, ev: pick(folder) })) };
  if (policy === "random") {
    return { press: pick(live), presents: shuffle(live).map((s) => { const m = folder.filter((e) => subjectMatch(s, e)); return { s, ev: m.length && Math.random() < 0.5 ? pick(m) : pick(folder) }; }) };
  }
  if (policy === "brute") {
    const presents = [];
    for (const s of shuffle(live)) { const ev = folder.find((e) => subjectMatch(s, e)); if (ev) presents.push({ s, ev }); }
    return { press: pick(live), presents };
  }
  // อ่านแต่ละประโยคถูก 85% (เชื่อว่าโกหก/จริง) · เชื่อว่าโกหก = หาหลักฐานที่ขัดจริงในแฟ้ม (อ่านหลักฐานออก)
  const ACC = Number(process.env.SIM_ACC) || 0.7; // มนุษย์อ่านคำให้การ+หลักฐานถูก ~70% (SIM_ACC=1 = อ่านขาด)
  const cands = [];
  for (const s of live) {
    if (known.has(s)) continue;
    const isLie = s.kind === "lie";
    const thinksLie = Math.random() < ACC ? isLie : !isLie;
    if (!thinksLie) continue;
    const hit = folder.filter((e) => Court.contradicts({ ...s, kind: "lie" }, e, "D"));
    const evs = hit.length ? hit : folder.filter((e) => subjectMatch(s, e));
    if (evs.length) cands.push({ s, ev: evs.find((e) => e.type === "witness") || evs[0], score: hit.length + (s.pressed ? 0 : 0.5) });
  }
  cands.sort((a, b) => b.score - a.score);
  const press = cands.length ? cands[0].s : pick(live.filter((s) => s.pos).concat(live));
  return { press, presents: cands };
}

function trial(lawPolicy, defSmart) {
  const m = makeCase();
  const cred = { L: R.cred, D: R.cred };
  let folder = m.folder.slice(), alibis = m.alibi + (R.bonusAlibi || 0);
  const proven = [];
  const contest = new Set([...m.folder, ...m.sight].map((e) => e.id));
  let rounds = 0;
  for (let round = 1; round <= R.rounds; round++) {
    rounds = round;
    if (round === 2 && m.sight.length && Math.random() < 0.5) folder = [...folder, ...m.sight.filter((e) => !folder.includes(e))];
    const info = { skills: m.kit, roster: m.roster, round: m.lastRound, hitBy: m.hitBy, contest: new Set([...folder.map((e) => e.id), ...contest]) };
    let pool = Court.balancePool(Court.statementPool(m.events, proven, info));
    const gen = ["g1", "g2", "g3", "g4"];
    while (pool.length < R.statements) pool.push({ form: "generic", kind: "truth", pos: false, text: gen.shift(), k: {} });
    const need = Court.minLiesOf(pool);
    const list = defPick(pool, need, alibis, R.rounds - round + 1, folder, defSmart);
    alibis -= list.filter((s) => s.alibi).length; // แปะไว้ = จองไว้ (คืนถ้าไม่ถูกแตะ)
    const known = new Set();
    let pressLeft = R.pressPer, presentLeft = R.presentPer;
    const plan = lawyerPlan(list, folder, lawPolicy, known);
    // กดดัน
    for (let i = 0; i < pressLeft && plan.press; i++) {
      const s = plan.press;
      s.pressed = true;
      if (s.alibi && (R.pressReveals || process.env.SIM_PRESS === "reveal")) s.alibiShown = true; // เห็นว่ามี 📍 (ข้อแก้ตัวไม่แตก)
      else if (s.alibi) { s.alibi = false; const e = m.events.find((x) => x.id === s.evKey); if (e && !folder.includes(e)) folder.push(e); }
      else if (s.kind === "truth" && s.pos) { cred.D -= R.confess; s.done = true; known.add(s); }
      break;
    }
    if (cred.D <= 0) break;
    // ยื่นหลักฐาน
    const plan2 = plan;
    for (const { s, ev } of plan2.presents) {
      if (presentLeft <= 0 || cred.L <= 0 || cred.D <= 0) break;
      if (lawPolicy === "smart" && s.alibiShown && ev.type !== "witness") continue; // เห็น 📍 แล้ว = ไม่ยื่นใส่ (ยกเว้นพยาน)
      if (s.done || s.tried || !folder.includes(ev)) continue;
      presentLeft--;
      const r = Court.presentResult(s, ev, "D");
      if (r.kind === "irrelevant" || r.kind === "wrong") { cred.L -= r.dL; s.tried = true; }
      else if (r.kind === "alibi") { cred.L -= r.dL; s.alibi = false; folder = folder.filter((e) => e !== ev); }
      else {
        cred.D -= r.dD; s.done = true; proven.push(s.text); folder = folder.filter((e) => e !== ev);
        if (r.healL) cred.L = Math.min(R.cred, cred.L + r.healL);
      }
    }
    alibis += list.filter((s) => s.alibi).length; // ข้อแก้ตัวที่ไม่ถูกใช้คืนกอง
    if (cred.L <= 0 || cred.D <= 0) break;
  }
  const w = cred.D <= 0 ? "L" : cred.L <= 0 ? "D" : cred.D < cred.L ? "L" : cred.L < cred.D ? "D" : "T";
  return { w, rounds, credL: Math.max(0, cred.L) };
}

function run(law, defSmart) {
  const res = { L: 0, D: 0, T: 0, rounds: [], heal: 0 };
  for (let i = 0; i < N; i++) { const t = trial(law, defSmart); res[t.w]++; res.rounds.push(t.rounds); if (t.w === "L") res.heal += t.credL; }
  res.rounds.sort((a, b) => a - b);
  const pct = (x) => `${((100 * x) / N).toFixed(1)}%`;
  return {
    lawyer: pct(res.L), defendant: pct(res.D), tie: pct(res.T),
    avgRounds: (res.rounds.reduce((a, b) => a + b, 0) / N).toFixed(2), medianRounds: res.rounds[Math.floor(N / 2)],
    avgHealOnWin: res.L ? (res.heal / res.L).toFixed(2) : "-",
  };
}

const table = {
  "blind vs random": run("blind", false),
  "random vs random": run("random", false),
  "brute vs random": run("brute", false),
  "smart vs random": run("smart", false),
  "random vs smart": run("random", true),
  "brute vs smart": run("brute", true),
  "smart vs smart": run("smart", true),
};
console.log(`ศาลจำลอง ${N} คดี/คู่ · cred ${R.cred} · ${R.rounds} ยก · ${R.statements} ประโยค · ยื่น/ยก ${R.presentPer} · กดดัน/ยก ${R.pressPer} · ข้อแก้ตัวโบนัส ${R.bonusAlibi} · ถูก ${JSON.stringify(R.dmg)} · ผิด ${R.wrong} · ชนข้อแก้ตัว ${R.alibiBurn}`);
console.table(table);
