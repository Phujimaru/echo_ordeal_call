// Road Trip: แคมป์ (ผู้ใช้สั่ง 2026-11-14) — ใครก็กดปุ่ม "แคมป์" ตอนขับได้ → ทั้งทีมโหวต → ผ่าน = จอดเข้าลานแคมป์ (จุดพักชนิด "camp" · area 76)
//  โหวต: 15 วิ · ผ่าน = เสียง "ใช่" เกินครึ่งของคนที่ยังอยู่ (มีชีวิต + ต่ออยู่) · เสมอ = ไม่ผ่าน · ทุกคนโหวตครบ = ตัดสินทันที
//  เงื่อนไข: ช่วงขับ (phase drive) เท่านั้น · แคมป์ครั้งก่อนต้องห่าง ≥ 40 กม. · ห่างบอสถัดไป > 10 กม.
//  ในแคมป์ (ไม่จำกัดเวลา — ทุกคนกดพร้อม/นอนครบ = ออก · stop.js): ทุกกิจกรรมอยู่ที่จุดของมันบนกระดาน + มินิเกม (ดูหัวข้อ "ในแคมป์" ด้านล่าง)
//  ตัวเลขทั้งหมด [Claude ตั้ง] — GRID_PLAN §8.8 / GAME_SYSTEM §56
const match = require("../match");
const Maps = require("./maps");
const Food = require("./food");

const H = () => require("./index");
// มินิเกม (ผู้ใช้สั่ง 2026-11-14 "เล่นได้จริง ไม่ใช่กดแล้วได้ผล"): client เล่นแล้วส่งคะแนน 0..1 (โหมดร่วมมือ — server ตัดค่าให้อยู่ในช่วง) · ดาว/เรื่องผี server ตัดสินคำตอบเอง
//  ทำอาหาร = คนข้าว (stir) ระหว่างรอสุก · ≥ greatAt = "อร่อยพิเศษ" กินแล้วพลังชีวิต +1 เพิ่ม · มาร์ชเมลโล่ = กดค้างปิ้ง ปล่อยตอนเหลืองทอง (คนละครั้ง)
//  ซ่อมรถ (แม่แรง) = ขันน็อต 3 ตัวตามจังหวะ → รถ +1..+3 · กิจกรรมกลางคืน: รวมวง (joinMs) → เล่น (playMs) → รางวัลตามผล
//   ดูดาว = หากลุ่มดาวที่ตรงกับภาพ 1 ใน 3 (ถูก +2 เหรียญ) · ร้องเพลง = กดตามจังหวะ (เฉลี่ยทั้งวง ≥ 0.5 = ทุกคน พลังชีวิต +1 + ฮึกเหิม · ≥ 0.8 = ฮึกเหิม 2 เทิร์น)
//   เล่าเรื่องผี = ผลัดกันเลือกตอนจบ 1 ใน 3 แล้วโหวต — ทุกคนที่โหวตได้ "ขนลุก" · ตรงเสียงข้างมาก +1 เหรียญ
//  นอนเต็นท์ = เดินเข้าเต็นท์ (นับพร้อมด้วย) · ทุกคนนอนครบ = ฟ้าสาง (fx sunrise) แล้วออกเดินทางใน sunriseMs
const CAMP = { voteMs: 15000, cdKm: 40, bossGapKm: 10, cookMs: 4000, joinMs: 8000, playMs: 12000, fireReach: 2, repairHp: 3, afkSecs: 300, greatAt: 0.8, sunriseMs: 4500 };
// กิจกรรมกลุ่ม: place = วัตถุที่ต้องยืนใกล้ · min/max = จำนวนคน
const NIGHT = {
  story: { name: "เล่าเรื่องผี", place: "storylog", min: 2, max: 6, buff: { key: "evade", amt: 15, turns: 2, name: "ขนลุก" }, matchGold: 1 },
  sing: { name: "ร้องเพลงรอบกองไฟ", place: "storylog", min: 2, max: 6, heal: 1, pass: 0.5, great: 0.8, buff: { key: "might", amt: 1, turns: 1, name: "ฮึกเหิม" } },
  canoe: { name: "พายเรือแคนู", place: "canoe", min: 2, max: 2, heal: 1, gold: 1, greatGold: 2, pass: 0.5, great: 0.8 },
};
const MALLOW = { golden: 0.85, ok: 0.5, goldenHeal: 2, goldenGold: 1, okHeal: 1 };
const STARS = { gold: 2 };
const FISH = { casts: 3, ok: 0.4, great: 0.8, greatN: 2 };
const CHOP = { perPlayer: 2, ok: 0.5 };
// ไฟกองใหญ่ (ผ่าฟืน) → ออกจากแคมป์ ทุกคนได้บัฟสู้ครั้งหน้าตามขั้น (สะสม)
const FIRE = { max: 3, buffs: [{ key: "evade", amt: 10, turns: 1, name: "ไฟอุ่นใจ" }, { key: "guard", amt: 1, turns: 1, name: "ไฟอุ่นใจ" }, { key: "might", amt: 1, turns: 1, name: "ไฟอุ่นใจ" }] };
const REST = { hammockHeal: 2, petHeal: 1 }; // เปลญวน / ลูบหมา (คนละครั้ง — stop.js)
const score01 = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0; };
let timer = null;

const owner = (p) => (p && p.duoOf && match.players[p.duoOf]) || p;
const alive = () => H().awake().filter((p) => p.alive);
// คนที่นับเสียง/พร้อม: มีชีวิต + ต่ออยู่ (ล้มทั้งหมด = ใช้คนที่ต่ออยู่)
function voters() { const a = alive(); return a.length ? a : H().awake(); }

// ---------------------------------------------------------------- โหวตแคมป์ (ช่วงขับ)
function kmLeft(rt) { return rt.lastCampKm == null ? 0 : Math.max(0, Math.ceil(rt.lastCampKm + CAMP.cdKm - rt.km)); }
// เปิดโหวตได้ไหม → null = ได้ · "phase" | "busy" | "cd" | "boss"
function blockOf(rt) {
  if (!rt || rt.phase !== "drive") return "phase";
  if (rt.campVote) return "busy";
  if (kmLeft(rt) > 0) return "cd";
  if (rt.nextBossKm - rt.km <= CAMP.bossGapKm) return "boss";
  return null;
}
function start(p) {
  const RT = H(), rt = match.roadtrip;
  if (!p.alive || blockOf(rt)) return false;
  rt.campVote = { by: p.id, endsAt: Date.now() + CAMP.voteMs, votes: { [p.id]: true } };
  RT.fx("campVote", { by: p.id });
  match.lastLog.push(`🏕️ ${p.name} ชวนตั้งแคมป์ — โหวต!`);
  if (!settle()) schedule();
  return true;
}
function vote(p, yes) {
  const rt = match.roadtrip, v = rt && rt.campVote;
  if (!v || !p.alive || v.votes[p.id] != null) return false;
  v.votes[p.id] = !!yes;
  settle();
  return true;
}
// ทุกคนโหวตครบ = ตัดสินทันที
function settle() {
  const rt = match.roadtrip, v = rt && rt.campVote;
  if (!v) return false;
  if (voters().every((u) => v.votes[u.id] != null)) { resolve(); return true; }
  return false;
}
function resolve() {
  const RT = H(), rt = match.roadtrip, v = rt && rt.campVote;
  if (!v) return false;
  const list = voters();
  const yes = list.filter((u) => v.votes[u.id] === true).length;
  const ok = yes * 2 > list.length && rt.phase === "drive";
  rt.campVote = null;
  RT.fx("campVoteEnd", { ok, yes, n: list.length });
  if (!ok) { match.lastLog.push("🏕️ ไม่ตั้งแคมป์ — ขับต่อ"); RT.broadcast(); return false; }
  rt.lastCampKm = rt.km;
  require("./stop").enter("camp");
  return true;
}
// ออกจากช่วงขับ (ทางแยก/สู้/บอส/จุดพัก) ระหว่างโหวต = ยกเลิก (ไม่นับคูลดาวน์)
function onPhase(rt, name) {
  if (rt && rt.campVote && name !== "drive") { rt.campVote = null; H().fx("campVoteEnd", { ok: false, cancel: true }); }
}

// ---------------------------------------------------------------- ในแคมป์ — ทุกกิจกรรมอยู่ที่จุดของมันบนกระดาน (ผู้ใช้สั่ง 2026-11-15 "ห้ามรวมหลายกิจกรรมในแผงเดียว")
//  กองไฟ/ครัวกลางแจ้ง = ทำอาหาร · ขอนเล่าเรื่อง = เล่าเรื่องผี/ร้องเพลง (กลุ่ม) · ที่ปิ้ง = มาร์ชเมลโล่ · ลานหิน+กล้อง = ดูดาว (เดี่ยว)
//  ท่าเรือ (ทะเลสาบซ้าย) = ตกปลา · ทะเลสาบขวา = พายเรือแคนู 2 คน · กองฟืน = ผ่าฟืนเติมกองไฟ · เปลญวน · หมาแคมป์ · แม่แรง · เต็นท์ (stop.js)
function fresh(rt) {
  return { cooking: {}, slept: {}, fixed: {}, acts: {}, done: {}, feast: {}, feastBuffed: {}, vendor: true, mallow: {}, stars: {}, fish: {}, chop: {}, fire: 0, hammock: {}, pet: {}, sunriseAt: 0 };
}
const campOf = (rt = match.roadtrip) => (rt && rt.phase === "stop" && rt.stop && rt.stop.kind === "camp" ? rt.stop.camp : null);
function propOf(rt, kind, style) { const d = rt.stop && Maps.defs[rt.stop.area]; return ((d && d.props) || []).find((o) => o.kind === kind && (!style || o.style === style)) || null; }
const boxDist = (pos, o) => Math.max(o.x0 - pos.x, 0, pos.x - o.x1) + Math.max(o.y0 - pos.y, 0, pos.y - o.y1);
// ยืนใกล้จุดนั้นไหม — place = ชนิดวัตถุ ("canoe"/"fish" = ทะเลสาบแบบนั้น · ต้องติดน้ำ)
function nearPlace(rt, p, place) {
  if (!p || !p.alive || !p.pos) return false;
  if (place === "fish" || place === "canoe") { const o = propOf(rt, "lake", place); return !!o && boxDist(p.pos, o) <= 1; }
  const o = propOf(rt, place);
  return !!o && boxDist(p.pos, o) <= CAMP.fireReach;
}
const nearFire = (rt, p) => nearPlace(rt, p, "campfire");
const nearCook = (rt, p) => nearFire(rt, p) || nearPlace(rt, p, "kitchen");

function cook(p, id) {
  const RT = H(), rt = match.roadtrip, c = campOf(rt);
  const r = Food.recipeOf(id);
  if (!c || !r || !nearCook(rt, p) || c.cooking[p.id]) return false;
  const u = owner(p), stash = rt.stash || (rt.stash = []);
  if (!Food.canCook(u.inventory, stash, r)) return false;
  Food.consume(u.inventory || (u.inventory = []), stash, r);
  const now = Date.now();
  c.cooking[p.id] = { recipe: r.id, at: now, doneAt: now + CAMP.cookMs };
  RT.fx("cook", { id: p.id, recipe: r.id });
  schedule();
  return true;
}
// จานสุก → กระเป๋าคนทำ · เต็ม = กล่องรถ · กล่องเต็ม = ยังให้ (กระเป๋าเกิน — ไม่ทิ้งอาหารที่ทำเสร็จ)
function serve(rt, c, pid, force = false, now = Date.now()) {
  const job = c.cooking[pid];
  if (!job || (!force && job.doneAt > now)) return false;
  delete c.cooking[pid];
  const r = Food.recipeOf(job.recipe), p = match.players[pid];
  if (!r || !p) return false;
  const u = owner(p);
  let where = "bag";
  const great = job.score != null && job.score >= CAMP.greatAt; // คนข้าวดี = อร่อยพิเศษ
  if (!Food.addTo(u, r.dish, great ? { great: true } : {})) {
    const item = { uid: `rtf_${r.dish}_${pid}_${now}`, type: r.dish, price: 0, ...(great ? { great: true } : {}) };
    if (Food.mergeInto(rt.stash || (rt.stash = []), item, require("./stash").cap(rt)) === 0) where = "stash";
    else { (u.inventory = u.inventory || []).push(item); where = "bag"; }
  }
  H().fx("cookDone", { id: pid, recipe: r.id, dish: r.dish, where, great });
  match.lastLog.push(`🍳 ${p.name} ทำ${r.name}เสร็จ`);
  return true;
}
// คนข้าวระหว่างรอสุก (ส่งครั้งเดียว)
function stir(p, o) {
  const c = campOf(), job = c && c.cooking[p.id];
  if (!job || job.score != null) return false;
  job.score = score01(o.score);
  return true;
}

// ---------------------------------------------------------------- กิจกรรมกลุ่ม (เล่าเรื่องผี/ร้องเพลง ที่ขอนเล่าเรื่อง · แคนู ที่ทะเลสาบขวา)
//  เปิดวง/ร่วม (rt:camp { a: "night", key }) → รวมวง joinMs (ครบ min) → เล่น playMs (rt:camp { a: "play", ... }) → รางวัล · อย่างละครั้ง · ไม่ครบ = ไม่เสียสิทธิ์
//  ขอนเล่าเรื่องจัดวงได้ทีละวง (เล่าเรื่องผี หรือ ร้องเพลง)
function night(p, key) {
  const RT = H(), rt = match.roadtrip, c = campOf(rt), a = NIGHT[key];
  if (!c || !a || !nearPlace(rt, p, a.place) || c.done[key]) return false;
  const now = Date.now(), cur = c.acts[key];
  if (cur) {
    if (cur.stage !== "join" || cur.ids[p.id] || Object.keys(cur.ids).length >= a.max) return false;
    cur.ids[p.id] = true; // ร่วมวง
    RT.fx("campJoin", { id: p.id, act: key }); // act (ไม่ใช่ key — key = เลข fx)
    if (Object.keys(cur.ids).length >= a.max) { cur.endsAt = now; endAct(rt, c, key, now); } // เต็มวง (แคนู 2 คน) = เริ่มเลย
    return true;
  }
  if (Object.entries(c.acts).some(([k, x]) => x && NIGHT[k].place === a.place)) return false; // จุดเดียวกันมีวงอื่นอยู่
  c.acts[key] = { key, by: p.id, stage: "join", endsAt: now + CAMP.joinMs, ids: { [p.id]: true }, res: {} };
  RT.fx("campAct", { id: p.id, act: key });
  match.lastLog.push(`🔥 ${p.name} ชวน${a.name}`);
  schedule();
  return true;
}
// ส่งผลมินิเกมของวง: story = { pick: 0..2 } · sing/canoe = { score }
function play(p, o) {
  const rt = match.roadtrip, c = campOf(rt);
  if (!c) return false;
  const key = typeof o.key === "string" && c.acts[o.key] ? o.key : Object.keys(c.acts).find((k) => c.acts[k] && c.acts[k].ids[p.id]);
  const act = key && c.acts[key];
  if (!act || act.stage !== "play" || !act.ids[p.id] || act.res[p.id] != null) return false;
  if (key === "story") { const k = Number(o.pick); if (![0, 1, 2].includes(k)) return false; act.res[p.id] = k; }
  else act.res[p.id] = score01(o.score);
  H().fx("campPlay", { id: p.id, act: key });
  if (Object.keys(act.ids).every((id) => act.res[id] != null)) { act.endsAt = Date.now(); endAct(rt, c, key); } // ทุกคนเล่นครบ = ตัดสินเลย
  return true;
}
function endAct(rt, c, key, now = Date.now()) {
  const act = c.acts[key];
  if (!act || act.endsAt > now) return false;
  const a = NIGHT[key], ids = Object.keys(act.ids).filter((id) => match.players[id] && match.players[id].alive);
  if (act.stage === "join") {
    if (ids.length < a.min) { delete c.acts[key]; H().fx("campActEnd", { act: key, ok: false, ids }); return true; }
    act.stage = "play"; act.endsAt = now + CAMP.playMs;
    act.ids = Object.fromEntries(ids.map((id) => [id, true]));
    act.seed = Math.floor(Math.random() * 1e6) + 1;
    H().fx("campPlayStart", { act: key });
    return true;
  }
  delete c.acts[key];
  c.done[key] = true;
  const combat = require("../combat"), shop = require("../shop"), res = act.res, got = {};
  const buff = (p, b) => (rt.buffs[p.id] || (rt.buffs[p.id] = [])).push({ ...b });
  let top = null;
  if (key === "story") {
    const votes = ids.filter((id) => res[id] != null), n = [0, 0, 0];
    for (const id of votes) n[res[id]]++;
    top = n.indexOf(Math.max(...n));
    for (const id of votes) { const p = match.players[id]; buff(p, a.buff); got[id] = 1; if (res[id] === top) shop.addGold(owner(p), a.matchGold); }
  } else {
    const played = ids.filter((id) => res[id] != null), avg = ids.length ? played.reduce((s, id) => s + res[id], 0) / ids.length : 0;
    if (avg >= a.pass) for (const id of played) {
      const p = match.players[id];
      if (a.heal) combat.healHp(p, a.heal);
      if (a.buff) buff(p, { ...a.buff, turns: avg >= a.great ? 2 : 1 });
      if (a.gold) shop.addGold(owner(p), avg >= a.great ? a.greatGold : a.gold);
      got[id] = 1;
    }
  }
  H().fx("campActEnd", { act: key, ok: Object.keys(got).length > 0, ids, got, ...(top != null ? { top } : {}) });
  match.lastLog.push(`🔥 ${a.name} — ${ids.map((id) => match.players[id].name).join(", ")}`);
  return true;
}

// ---------------------------------------------------------------- กิจกรรมเดี่ยว (ส่งคะแนนมินิเกม 0..1)
// มาร์ชเมลโล่ (ที่ปิ้งข้างกองไฟ · คนละครั้ง): score = ความสุกตอนปล่อย (เลยแถบทอง = ไหม้ — client ส่ง 0)
function mallow(p, o) {
  const rt = match.roadtrip, c = campOf(rt);
  if (!c || !nearPlace(rt, p, "mallow") || c.mallow[p.id] != null) return false;
  const s = score01(o.score), combat = require("../combat");
  const res = s >= MALLOW.golden ? "golden" : s >= MALLOW.ok ? "ok" : "burnt";
  c.mallow[p.id] = res;
  if (res === "golden") { combat.healHp(p, MALLOW.goldenHeal); require("../shop").addGold(owner(p), MALLOW.goldenGold); }
  else if (res === "ok") combat.healHp(p, MALLOW.okHeal);
  H().fx("mallow", { id: p.id, res });
  return true;
}
// ดูดาว (กล้องบนลานหิน · คนละครั้ง): กดที่กล้อง = ได้โจทย์ (stop.js act) · ตอบ { pick } → ถูก = +เหรียญ
function starsAsk(p) {
  const c = campOf();
  if (!c) return false;
  if (!c.stars[p.id]) c.stars[p.id] = { seed: Math.floor(Math.random() * 1e6) + 1, answer: Math.floor(Math.random() * 3), res: null };
  return true;
}
function stars(p, o) {
  const rt = match.roadtrip, c = campOf(rt), q = c && c.stars[p.id];
  if (!q || q.res != null || !nearPlace(rt, p, "ledge")) return false;
  const k = Number(o.pick);
  if (![0, 1, 2].includes(k)) return false;
  q.res = k === q.answer ? "ok" : "miss";
  if (q.res === "ok") require("../shop").addGold(owner(p), STARS.gold);
  H().fx("stars", { id: p.id, res: q.res, answer: q.answer });
  return true;
}
// ตกปลาที่ท่าเรือ (คนละ FISH.casts ครั้ง): คะแนนดี = ปลาสด (วัตถุดิบ) เข้ากระเป๋า (เต็ม = กล่องรถ)
function fish(p, o) {
  const rt = match.roadtrip, c = campOf(rt);
  if (!c || !nearPlace(rt, p, "fish") || (c.fish[p.id] || 0) >= FISH.casts) return false;
  c.fish[p.id] = (c.fish[p.id] || 0) + 1;
  const s = score01(o.score), n = s >= FISH.great ? FISH.greatN : s >= FISH.ok ? 1 : 0;
  let got = 0;
  for (let i = 0; i < n; i++) {
    if (Food.addTo(owner(p), "ingFish")) { got++; continue; }
    if (Food.mergeInto(rt.stash || (rt.stash = []), { uid: `rtf_fish_${p.id}_${Date.now()}_${i}`, type: "ingFish", qty: 1, price: 0 }, require("./stash").cap(rt)) === 0) got++;
  }
  H().fx("fish", { id: p.id, n: got });
  return true;
}
// ผ่าฟืน (ตอสับฟืน · คนละ CHOP.perPlayer ครั้ง): คะแนน ≥ CHOP.ok = ไฟกองใหญ่ขึ้น 1 ขั้น (สูงสุด FIRE.max) — ออกจากแคมป์ = บัฟทุกคนตามขั้นไฟ
function chop(p, o) {
  const rt = match.roadtrip, c = campOf(rt);
  if (!c || !nearPlace(rt, p, "woodpile") || (c.chop[p.id] || 0) >= CHOP.perPlayer) return false;
  c.chop[p.id] = (c.chop[p.id] || 0) + 1;
  const up = score01(o.score) >= CHOP.ok && c.fire < FIRE.max;
  if (up) c.fire++;
  H().fx("chop", { id: p.id, up, fire: c.fire });
  return true;
}
function fireBuffs(rt, c) {
  if (!c || !c.fire) return;
  const list = FIRE.buffs.slice(0, c.fire);
  for (const p of H().crew().filter((u) => u.alive)) for (const b of list) (rt.buffs[p.id] || (rt.buffs[p.id] = [])).push({ ...b });
  match.lastLog.push(`🔥 กองไฟขั้น ${c.fire} — ทุกคนอุ่นใจ`);
}
// ซ่อมรถด้วยมือที่แม่แรง (ยืนติดแม่แรง · คนละครั้ง) → รถ +1..+3 ตามคะแนน
function repair(p, o) {
  const rt = match.roadtrip, c = campOf(rt);
  if (!c || c.fixed[p.id] || !p.pos) return false;
  const jack = propOf(rt, "jack");
  if (!jack || boxDist(p.pos, jack) !== 1) return false;
  const need = rt.van.hpMax - rt.van.hp;
  if (need <= 0) return false;
  const hp = Math.min(need, 1 + Math.round(score01(o.score) * (CAMP.repairHp - 1)));
  c.fixed[p.id] = true;
  rt.van.hp += hp;
  H().fx("act", { id: p.id, obj: jack.id, kind: "jack", hp, text: `ซ่อมรถด้วยมือ +${hp}` });
  match.lastLog.push(`🛠️ ${p.name} ซ่อมรถด้วยมือ +${hp}`);
  return true;
}
// นอนเต็นท์ครบทุกคน (มีชีวิต + ต่ออยู่) → ฟ้าสาง แล้วออกเดินทาง
function onSleep(rt) {
  const c = rt.stop && rt.stop.camp;
  if (!c || c.sunriseAt) return;
  const need = voters();
  if (!need.length || !need.every((u) => c.slept[u.id] || (u.duoOf && c.slept[u.duoOf]))) return;
  c.sunriseAt = Date.now() + CAMP.sunriseMs;
  H().fx("sunrise", {});
  match.lastLog.push("🌅 ทุกคนหลับสนิท — ฟ้าสางแล้ว ออกเดินทาง!");
  schedule();
}
// กินอาหาร (food.eat) ที่กองไฟในแคมป์ → อิ่มด้วยกัน ≥ 2 คน = บัฟทุกคนที่กินที่นั่น (คนละครั้ง) · คืน true = คนนี้ได้บัฟ
function onEat(p) {
  const rt = match.roadtrip, c = campOf(rt);
  if (!c || !nearFire(rt, p)) return false;
  c.feast[p.id] = true;
  const ids = Object.keys(c.feast);
  if (ids.length < Food.FEAST.min) return false;
  let me = false;
  for (const id of ids) {
    if (c.feastBuffed[id] || !match.players[id]) continue;
    c.feastBuffed[id] = true;
    (rt.buffs[id] || (rt.buffs[id] = [])).push({ ...Food.FEAST.buff });
    if (id === p.id) me = true;
  }
  if (me || c.feastBuffed[p.id]) H().fx("feast", { ids });
  return me;
}

// ---------------------------------------------------------------- จังหวะเวลา (โหวต/อาหารสุก/วงกิจกรรม/ฟ้าสาง) — ตัวจับเวลาเดียว · tick(now) เรียกตรงได้ในเทสต์
function tick(now = Date.now()) {
  const RT = H(), rt = match.roadtrip;
  if (!RT.active() || !rt) return stop();
  let dirty = false;
  if (rt.campVote && rt.campVote.endsAt <= now) { resolve(); dirty = true; }
  const c = campOf(rt);
  if (c) {
    for (const pid of Object.keys(c.cooking)) if (serve(rt, c, pid, false, now)) dirty = true;
    for (const key of Object.keys(c.acts)) if (endAct(rt, c, key, now)) dirty = true;
    if (c.sunriseAt && c.sunriseAt <= now) { require("./stop").leave(); return; } // ฟ้าสาง = ออกเดินทาง (leave broadcast เอง)
  }
  if (dirty) RT.broadcast();
  schedule(now);
}
function nextDue(rt) {
  const t = [];
  if (rt.campVote) t.push(rt.campVote.endsAt);
  const c = campOf(rt);
  if (c) { for (const j of Object.values(c.cooking)) t.push(j.doneAt); for (const a of Object.values(c.acts)) t.push(a.endsAt); if (c.sunriseAt) t.push(c.sunriseAt); }
  return t.length ? Math.min(...t) : null;
}
function schedule(now = Date.now()) {
  stop();
  const rt = match.roadtrip, due = rt ? nextDue(rt) : null;
  if (due == null) return;
  timer = setTimeout(() => { timer = null; try { tick(); } catch (err) { console.error("[roadtrip] camp tick:", err); } }, Math.max(20, due - now + 10));
  if (timer.unref) timer.unref();
}
function stop() { if (timer) clearTimeout(timer); timer = null; }

// ออกจากแคมป์: อาหารที่ยังไม่สุก = เสิร์ฟเลย (ไม่เสียวัตถุดิบ) · วงกิจกรรมที่ค้าง = ยกเลิก · ไฟกองใหญ่ = บัฟทุกคน
function onLeave(rt) {
  const c = rt && rt.stop && rt.stop.camp;
  if (!c) return;
  for (const pid of Object.keys(c.cooking)) serve(rt, c, pid, true);
  c.acts = {};
  fireBuffs(rt, c);
  stop();
}

function command(p, o) {
  const a = o && o.a;
  if (a === "start") return start(p);
  if (a === "vote") return vote(p, !!o.yes);
  if (o && o.unitId != null) { p = require("../duo").unitsOf(p).find((x) => x.id === o.unitId) || null; if (!p) return false; } // ระบบคู่: ตัวที่ยืนตรงจุดนั้น
  if (a === "cook") return cook(p, typeof o.recipe === "string" ? o.recipe : "");
  if (a === "night") return night(p, typeof o.key === "string" ? o.key : "");
  if (a === "play") return play(p, o);
  if (a === "mallow") return mallow(p, o);
  if (a === "stir") return stir(p, o);
  if (a === "repair") return repair(p, o);
  if (a === "stars") return stars(p, o);
  if (a === "fish") return fish(p, o);
  if (a === "chop") return chop(p, o);
  return false;
}

// state.roadtrip.camp: ปุ่มแคมป์/โหวต (ช่วงขับ) · stop.camp: สถานะในแคมป์
function publicInfo(rt) {
  const v = rt.campVote;
  return { block: blockOf(rt), kmLeft: kmLeft(rt), vote: v ? { by: v.by, endsAt: v.endsAt, votes: { ...v.votes } } : null };
}
function publicStop(rt) {
  const c = rt.stop && rt.stop.camp;
  if (!c) return null;
  return {
    cooking: Object.fromEntries(Object.entries(c.cooking).map(([k, j]) => [k, { recipe: j.recipe, at: j.at, doneAt: j.doneAt }])), slept: { ...c.slept }, fixed: { ...c.fixed },
    acts: Object.fromEntries(Object.entries(c.acts).map(([k, a]) => [k, { key: k, by: a.by, stage: a.stage, endsAt: a.endsAt, ids: { ...a.ids }, played: Object.keys(a.res || {}), seed: a.seed || 0 }])),
    done: { ...c.done }, feast: Object.keys(c.feast), vendor: !!c.vendor, mallow: { ...c.mallow },
    stars: Object.fromEntries(Object.entries(c.stars).map(([k, q]) => [k, { ...q }])), // โจทย์ดูดาวรายคน (seed + answer — client วาดภาพเป้าหมาย)
    fish: { ...c.fish }, chop: { ...c.chop }, fire: c.fire, hammock: { ...c.hammock }, pet: { ...c.pet }, sunriseAt: c.sunriseAt || 0,
  };
}

module.exports = { CAMP, NIGHT, MALLOW, STARS, FISH, CHOP, FIRE, REST, play, mallow, stir, repair, stars, starsAsk, fish, chop, fireBuffs, onSleep, kmLeft, blockOf, start, vote, settle, resolve, onPhase, fresh, campOf, nearFire, nearPlace, cook, serve, night, endAct, onEat, tick, schedule, stop, onLeave, command, publicInfo, publicStop };
