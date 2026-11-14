// Road Trip: เหตุการณ์ถนน (ไม่ต่อสู้ — บางทางเลือกนำไปสู้) · การ์ด 2–3 ทางเลือก โหวต 20 วิ (contract §2/§4)
//  เสียงข้างมาก · เสมอ/ไม่มีใครโหวต = ทางเลือก "ปลอดภัย" (def) · ทางที่ต้องจ่ายแต่ทีมเงินไม่พอ = กดไม่ได้ (disabled)
//  ผลลัพธ์โชว์ 3 วิ (event.result) แล้วขับต่อ/เข้าสู้ · บัฟ/ดีบัฟ "สู้ครั้งหน้า" เก็บที่ rt.buffs (fight.begin ใส่ให้)
//  คำที่ใช้ให้ตรงกันทั้งเกม: เหรียญ (ไม่ใช่ ทอง/เงิน) · รถตู้ … HP · น้ำมัน … ลิตร · ระยะทาง … กม.
const match = require("../match");
const { priceOf } = require("./diff");
const Van = require("./van");

const H = () => require("./index");
const lazyShop = () => require("../shop");
const BUFFS = [
  { key: "might", amt: 1, turns: 2, name: "เสริมพลัง" },
  { key: "guard", amt: 1, turns: 2, name: "คุ้มครอง" },
  { key: "evade", amt: 30, turns: 2, name: "หลบหลีก" },
];
// ชื่อตรงกับป้ายสถานะในเกม (Game.jsx: weak = อ่อนแอ · slow = เชื่องช้า)
const CURSES = [{ key: "weak", amt: 1, turns: 2, name: "อ่อนแอ" }, { key: "slow", amt: 1, turns: 1, name: "เชื่องช้า" }];
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const PASS = "ไม่จอด ไม่ได้อะไร ไม่เสียอะไร";

// นิยามเหตุการณ์: choices(rt) → [{ key, label, desc, cost?, def? }] · run(rt, key) → { text, fight?: kind, mobType? }
//  label = ชื่อปุ่มสั้นๆ · desc = คำอธิบายตอนชี้เมาส์ (ค่าใช้จ่าย/ความเสี่ยง/ของที่ได้) · text = ผลลัพธ์บนการ์ด + บันทึก
//  บัฟ/ดีบัฟจากเหตุการณ์ติดทั้งทีมตอนเริ่มการต่อสู้ครั้งหน้า
const EVENTS = {
  police: {
    kind: "police",
    choices: (rt) => [
      { key: "pay", label: "จ่ายค่าปรับ", cost: priceOf(rt, 5), desc: "จ่ายเหรียญจากทีม แล้วผ่านด่านไปแบบไม่มีเรื่อง" },
      { key: "run", label: "เหยียบหนี", desc: "ลุ้น 50% — หนีพ้นได้ระยะทาง +2 กม. · พลาดโดนยิงยาง รถตู้เสีย 4 HP" },
      { key: "fight", label: "ลงไปลุย", desc: "ด่านนี้คือแก๊งมอเตอร์ไซค์ปลอมตัว — เข้าต่อสู้ทันที ล้มมอนได้เหรียญ" },
    ],
    def: "run",
    run(rt, key) {
      if (key === "pay") return { text: "จ่ายค่าปรับ ผ่านด่านไปได้" };
      if (key === "fight") return { text: "ด่านปลอม! แก๊งมอเตอร์ไซค์บุก", fight: "ambush", mobType: "biker" };
      if (Math.random() < 0.5) { rt.km += 2; return { text: "เหยียบมิดหนีพ้น · ระยะทาง +2 กม." }; }
      const d = H().hurtVan(4, "police");
      return { text: `โดนยิงยาง! รถตู้ -${d} HP` };
    },
  },
  cows: {
    kind: "cows",
    choices: () => [
      { key: "wait", label: "จอดรอ", desc: "รอฝูงวัวเดินผ่านจนหมด ปลอดภัยแต่เปลืองน้ำมัน 3 ลิตร" },
      { key: "push", label: "บีบแตรฝ่า", desc: "ลุ้น 50% — ฝ่าไปได้สบาย · พลาดโดนวัวกระทิงขวิด รถตู้เสีย 3 HP" },
    ],
    def: "wait",
    run(rt, key) {
      if (key === "wait") { const f = Math.min(rt.van.fuel, 3); rt.van.fuel -= f; return { text: `รอจนวัวผ่านหมด · น้ำมัน -${Math.round(f)} ลิตร` }; }
      if (Math.random() < 0.5) return { text: "ฝูงวัวแตกฮือ ฝ่าไปได้" };
      const d = H().hurtVan(3, "cows");
      return { text: `วัวกระทิงขวิดรถ! รถตู้ -${d} HP` };
    },
  },
  hitchhiker: {
    kind: "hitchhiker",
    choices: (rt) => [
      rt.night
        ? { key: "take", label: "รับขึ้นรถ", desc: "ใครมาโบกรถกลางดึกแบบนี้… ทีมจะติดอ่อนแอหรือเชื่องช้าในการต่อสู้ครั้งหน้า" }
        : { key: "take", label: "รับขึ้นรถ", desc: "ลุ้น 60% — ทีมได้เสริมพลัง/คุ้มครอง/หลบหลีก · 40% ติดอ่อนแอ/เชื่องช้า (มีผลในการต่อสู้ครั้งหน้า)" },
      { key: "leave", label: "ขับผ่าน", desc: PASS },
    ],
    def: "leave",
    run(rt, key) {
      if (key === "leave") return { text: "ขับผ่านไป" };
      if (rt.night) { // ผีโบกรถ
        const c = pick(CURSES);
        addTeamBuff(rt, { ...c, debuff: true });
        return { text: `👻 ผู้โดยสารหายวับ! ทีมติด${c.name}ในการต่อสู้ครั้งหน้า`, ghost: true };
      }
      if (Math.random() < 0.6) { const b = pick(BUFFS); addTeamBuff(rt, b); return { text: `✨ ผู้โดยสารใจดีให้พร · ทีมได้${b.name}ในการต่อสู้ครั้งหน้า` }; }
      const c = pick(CURSES);
      addTeamBuff(rt, { ...c, debuff: true });
      return { text: `💢 ผู้โดยสารจอมบ่น · ทีมติด${c.name}ในการต่อสู้ครั้งหน้า` };
    },
  },
  truck: {
    kind: "truck",
    choices: () => [
      { key: "loot", label: "ค้นของ", desc: "ทุกคนได้เหรียญ (ยิ่งไกลยิ่งเยอะ) · 40% เจอไอเทม · 35% มีซอมบี้รถบรรทุกซุ่มอยู่ ต้องสู้" },
      { key: "leave", label: "ขับผ่าน", desc: PASS },
    ],
    def: "leave",
    run(rt, key) {
      if (key === "leave") return { text: "ขับผ่านไป" };
      const gold = 3 + Math.floor(Math.random() * 6) + Math.floor(rt.km / 50);
      const got = H().giveGoldAll(gold);
      let item = null;
      if (Math.random() < 0.4) item = giveRandom(rt, ["armor", "cleanse", "fortune", "rtFish"]);
      const loot = `💰 ทุกคนได้เหรียญ +${gold}${item ? ` · ได้${item}` : ""}`;
      if (Math.random() < 0.35) return { text: `${loot} · ซอมบี้รถบรรทุกซุ่มโจมตี!`, fight: "ambush", mobType: "trucker", gold: got };
      return { text: loot, gold: got };
    },
  },
  merchant: {
    kind: "merchant",
    choices: (rt) => {
      const it = rt.eventItem || (rt.eventItem = pick([{ type: "lifeCrystal", price: 8 }, { type: "armorCrystal", price: 8 }, { type: "windBoots", price: 5 }, { type: "rtRevive", price: 10 }]));
      const name = lazyShop().shopItemName(it);
      return [
        { key: "buy", label: `ซื้อ${name}`, cost: Math.max(1, Math.floor(priceOf(rt, it.price) * 0.6)), desc: `${name} ถูกกว่าร้าน 40% · ของเข้ากระเป๋าคนที่โหวตซื้อก่อน (กระเป๋าเต็มทุกคน = ไม่ได้ของ)` },
        { key: "leave", label: "ไม่ซื้อ", desc: "โบกมือลาพ่อค้าแล้วขับต่อ" },
      ];
    },
    def: "leave",
    run(rt, key, voters) {
      const it = rt.eventItem; rt.eventItem = null;
      if (key !== "buy" || !it) return { text: "โบกมือลาพ่อค้า" };
      const to = giveTo(voters, it);
      return { text: to ? `🛍️ ${to.name} ได้${lazyShop().shopItemName(it)}` : "กระเป๋าเต็มทุกคน ใส่ไม่ลง" };
    },
  },
  shrine: {
    kind: "shrine",
    choices: (rt) => [
      { key: "pray", label: "แวะไหว้", desc: rt.night ? "กลางคืนเสี่ยง 30% ที่ทีมโดนอาถรรพ์ติดดีบัฟ · ที่เหลือลุ้นครึ่งๆ ให้ทุกคนฟื้นเลือด +3" : "ลุ้น 50% — ทุกคนฟื้นเลือด +3 · ไม่งั้นก็แค่ได้ไหว้" },
      { key: "leave", label: "ขับผ่าน", desc: PASS },
    ],
    def: "leave",
    run(rt, key) {
      if (key === "leave") return { text: "ขับผ่านไป" };
      if (rt.night && Math.random() < 0.3) { const c = pick(CURSES); addTeamBuff(rt, { ...c, debuff: true }); return { text: `👻 ไหว้ผิดศาล! ทีมติด${c.name}ในการต่อสู้ครั้งหน้า` }; }
      if (Math.random() < 0.5) {
        const combat = require("../combat");
        for (const p of H().crew().filter((u) => u.alive)) combat.healHp(p, 3);
        return { text: "💚 ศาลให้พร · ทุกคนเลือด +3" };
      }
      return { text: "ไหว้แล้ว… เงียบกริบ" };
    },
  },
  race: {
    kind: "race",
    choices: (rt) => {
      const need = Math.min(3, 1 + ((rt.region && rt.region.loop) | 0));
      return [
        { key: "race", label: "รับคำท้า", desc: `ชนะแน่ถ้าเครื่องยนต์ขั้น ${need} ขึ้นไป (ไม่ถึงยังลุ้นได้ 30%) · ชนะ ทุกคนได้เหรียญ +6 · แพ้ รถตู้เสีย 2 HP` },
        { key: "leave", label: "ไม่สน", desc: "ปล่อยให้เขาซิ่งไปคนเดียว" },
      ];
    },
    def: "leave",
    run(rt, key) {
      if (key === "leave") return { text: "ปล่อยให้เขาซิ่งไปคนเดียว" };
      const need = 1 + ((rt.region && rt.region.loop) | 0);
      if (Van.statOf(rt.van, "engine") >= Van.TABLE.engine[Math.min(3, need)] || Math.random() < 0.3) {
        const got = H().giveGoldAll(6);
        return { text: "🏁 เข้าเส้นชัยก่อน! ทุกคนได้เหรียญ +6", gold: got };
      }
      const d = H().hurtVan(2, "race");
      return { text: `🏁 แพ้ขาดลอย เครื่องร้อนจัด · รถตู้ -${d} HP` };
    },
  },
};
const IDS = Object.keys(EVENTS);
const META = {
  police: { title: "ด่านตรวจกลางทาง", icon: "🚓" }, cows: { title: "ฝูงวัวขวางถนน", icon: "🐄" }, hitchhiker: { title: "คนโบกรถ", icon: "🙋" },
  truck: { title: "รถขนของคว่ำ", icon: "🚚" }, merchant: { title: "พ่อค้าเร่ริมทาง", icon: "🧳" }, shrine: { title: "ศาลข้างทาง", icon: "⛩️" }, race: { title: "รถซิ่งท้าแข่ง", icon: "🏎️" },
};

function addTeamBuff(rt, b) { (rt.buffs.team || (rt.buffs.team = [])).push({ key: b.key, amt: b.amt, turns: b.turns, debuff: !!b.debuff, name: b.name }); }
function giveRandom(rt, types) {
  const shop = lazyShop();
  for (const p of H().crew().filter((u) => u.alive).sort(() => Math.random() - 0.5)) {
    const it = { type: pick(types), value: 2 };
    if (shop.grantInventoryItem(p, it)) return shop.shopItemName(it);
  }
  return null;
}
function giveTo(voterIds, it) {
  const shop = lazyShop();
  const list = H().crew().filter((u) => u.alive).sort((a, b) => (voterIds.includes(b.id) ? 1 : 0) - (voterIds.includes(a.id) ? 1 : 0));
  for (const p of list) if (shop.grantInventoryItem(p, { type: it.type, value: it.value })) return p;
  return null;
}
function pickEvent(rt) {
  if (rt.peekEvent) return rt.peekEvent; // ชิงช้าสวรรค์เห็นไว้แล้ว = เหตุการณ์เดิม
  return IDS[Math.floor(Math.random() * IDS.length)];
}

function open(id = null) {
  const RT = H(), rt = match.roadtrip;
  const evId = EVENTS[id] ? id : pickEvent(rt);
  rt.peekEvent = null;
  rt.legs = 0;
  const def = EVENTS[evId];
  const gold = RT.teamGold();
  const choices = def.choices(rt).map((c) => ({ ...c, cost: c.cost || 0, disabled: (c.cost || 0) > gold }));
  const meta = evId === "hitchhiker" && rt.night ? { title: "ผีโบกรถ", icon: "👻" } : META[evId];
  rt.event = { id: evId, kind: def.kind, title: meta.title, icon: meta.icon, choices, votes: {}, result: null };
  RT.setPhase("event", RT.SECS.event, resolve);
  RT.fx("event", { id: evId, night: rt.night });
  RT.broadcast();
}
function vote(p, key) {
  const RT = H(), rt = match.roadtrip;
  const ev = rt.event;
  if (rt.phase !== "event" || !ev || ev.result) return false;
  const c = ev.choices.find((o) => o.key === key);
  if (!c || c.disabled) return false;
  ev.votes[p.id] = key;
  if (RT.awake().every((o) => ev.votes[o.id] != null)) resolve();
  return true;
}
function resolve() {
  const RT = H(), rt = match.roadtrip;
  const ev = rt && rt.event;
  if (!ev || ev.result || rt.phase !== "event") return;
  const def = EVENTS[ev.id];
  const n = {};
  for (const k of Object.values(ev.votes)) n[k] = (n[k] || 0) + 1;
  const top = Math.max(0, ...Object.values(n));
  const tied = Object.keys(n).filter((k) => n[k] === top);
  let key = tied.length === 1 ? tied[0] : def.def;
  let c = ev.choices.find((o) => o.key === key && !o.disabled);
  if (!c) { key = def.def; c = ev.choices.find((o) => o.key === key); }
  if (c.cost && !RT.payTeam(c.cost)) { key = def.def; c = ev.choices.find((o) => o.key === key); }
  const voters = Object.entries(ev.votes).filter(([, k]) => k === key).map(([id]) => id);
  const res = def.run(rt, key, voters) || { text: "" };
  ev.result = { key, text: res.text };
  RT.fx("eventResult", { id: ev.id, key, text: res.text });
  match.lastLog.push(`🛣️ ${res.text}`);
  if (rt.van.hp <= 0) { RT.lose("van"); return; }
  const next = res.fight ? () => require("./fight").begin(res.fight, { mobType: res.mobType }) : () => RT.toDrive();
  RT.setPhase("event", RT.SECS.eventResult, next);
  RT.broadcast();
}

module.exports = { EVENTS, IDS, META, BUFFS, CURSES, open, vote, resolve, pickEvent, addTeamBuff };
