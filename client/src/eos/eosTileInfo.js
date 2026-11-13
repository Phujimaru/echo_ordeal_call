// ============================================================
//  ป้ายข้อมูลช่องของสนาม Eos (ชี้ของบนแผนที่แล้วขึ้นชื่อ + คำอธิบาย — ผู้ใช้สั่ง 2026-11-10 "หลายอย่างไม่มีคำอธิบาย ไม่เข้าใจอะไรเลย")
//  ผู้ใช้สั่ง 2026-11-14 "คำอธิบายโคตรยาว ใจความสำคัญไม่ค่อยมี · ไม่ต้องบอกว่าต้องกดอะไร ชี้แล้วจะมีอะไร":
//   คำอธิบาย = ผลสำคัญ + ตัวเลข สั้นๆ บรรทัดเดียว · ไม่สอนวิธีกด (ปุ่มขึ้นเองเมื่อยืนติด) · ของที่ชื่อบอกอยู่แล้ว = ไม่มีคำอธิบาย
//  BoardStage.jsx tileInfo เรียกก่อนป้ายช่องปกติ · คืน { icon, name, desc?, stats?, tags? } | null
//  fd = state.fodlan.board (server/fodlan/stage6.js publicInfo) · players = state.players
// ============================================================
const ZONE = { insomnia: "Insomnia", hammerhead: "Hammerhead", duscae: "Duscae", lake: "Cleigne", altissia: "Altissia" };
const at = (t, x, y) => !!t && t.x === x && t.y === y;
const hpOf = (o, max) => `♥ ${o.hp ?? max}/${max}`;
const MOB = {
  daemon: { icon: "👹", name: "ปีศาจ", desc: "ออกกลางคืน แกร่งขึ้นทุกคืน · เข้าเมืองที่ไฟเปิดไม่ได้ · ฟ้าสางสลาย" },
  magitek: { icon: "🤖", name: "ทหารเหล็ก", desc: "ลงจากยาน · เล็งเสาก่อน · เข้าเมืองได้ · อยู่ 4 เทิร์น" },
  beast: { icon: "🦣", name: "สัตว์ยักษ์", desc: "ตีคนที่เข้าใกล้ · โดนตีแล้วไล่ตาม" },
  nest: { icon: "🔥", name: "รังปีศาจ", desc: "กลางคืนพ่นปีศาจ" },
  gold: { icon: "🐤", name: "โชโกโบะทอง", desc: "วิ่งหนี · อยู่ 2 เทิร์น · เหรียญ 12 + ของดี" },
  giant: { icon: "🗿", name: "ยักษ์หิน", desc: "เหยียบแถบกว้าง 3 ดาเมจ 3 (ช่องส้ม = เทิร์นหน้า) · ล้ม = แต้มรวม +4" },
};

export function eosTileInfo(fd, players, x, y, round = 0) {
  if (!fd || !fd.eos) return null;
  const mob = (players || []).find((p) => p.alive && p.pos && p.pos.x === x && p.pos.y === y && p.summon && p.summon.kind === "eosMob");
  if (mob) {
    const list = [...(fd.daemons || []).map((d) => ({ ...d, type: "daemon" })), ...(fd.mobs || [])];
    const info = list.find((m) => m.id === mob.id) || {};
    const m = (info.trait && EOS_TRAIT_INFO[info.trait]) || MOB[info.type] || MOB.daemon;
    const el = (info.elite || []).map((k) => ELITE_INFO[k]).filter(Boolean);
    // ตัวเลขก่อน คำอธิบายท้ายสุด (ผู้ใช้ 2026-11-14 "ผู้เล่นอยากรู้พลังโจมตี เกราะ พลังชีวิต · คำอธิบายเป็นอย่างท้ายๆ")
    return {
      icon: el.length ? "👑" : m.icon, name: `${mob.name}`,
      stats: { atk: info.atk ?? null, hp: mob.hp ?? info.hp ?? 0, maxHp: info.maxHp ?? mob.maxHp ?? 0, armor: mob.armor ?? info.armor ?? 0, maxArmor: info.maxArmor ?? 0 },
      tags: el,
      desc: m.desc,
    };
  }
  const sk = fd.sky || {};
  if (sk.meteor && (sk.meteor.tiles || []).some((t) => at(t, x, y))) return { icon: "☄️", name: "จุดตกอุกกาบาต", desc: "เทิร์นหน้า ดาเมจ 3" };
  if (fd.dome && (fd.dome.gates || []).some((t) => at(t, x, y))) return { icon: "🛡️", name: "บาเรียประตูโดม", desc: `♥ ${fd.dome.hp}/${fd.dome.maxHp} · มอนผ่านไม่ได้` };
  if (sk.supply && Math.abs(sk.supply.x - x) + Math.abs(sk.supply.y - y) <= 0) return { icon: "🚂", name: "รถไฟขนเสบียง", desc: `${sk.supply.loads}/${sk.supply.max} · ออกใน ${sk.supply.left} เทิร์น · ขนของ = แต้มรวม +1` };
  const wl = (fd.walls || []).find((w) => at(w, x, y));
  if (wl) return { icon: "🧱", name: "กำแพงไม้", desc: `${hpOf(wl, wl.max || 3)} · มอนผ่านไม่ได้` };
  const cv = (fd.civs || []).find((c) => at(c, x, y));
  if (cv) return { icon: "🕊️", name: "พลเรือน", desc: `♥ ${cv.hp}/${cv.maxHp} · พาถึงเมือง = แต้มรวม +2` };
  if (fd.giant && (fd.giant.next || []).some((t) => at(t, x, y))) return { icon: "🗿", name: "ทางเดินยักษ์หิน", desc: "เทิร์นหน้า ดาเมจ 3" };
  if (fd.convoy && at(fd.convoy, x, y)) return { icon: "🚚", name: "รถเสบียง", desc: `♥ ${fd.convoy.hp}/${fd.convoy.maxHp} · ถึงปลายทาง = แต้มรวม +6` };
  const sp = (fd.spirits || []).find((o) => at(o, x, y));
  if (sp) { const pp = (players || []).find((u) => u.id === sp.id); return { icon: "🕯️", name: `ดวงวิญญาณ ${pp ? pp.name : ""}`, desc: "ช่วย = ฟื้นเร็วขึ้น 1 เทิร์น ที่นี่" }; }
  const qq = (fd.quests || []).find((o) => o.type === "scout" && at(o, x, y));
  if (qq) return { icon: "📡", name: "จุดสัญญาณ", desc: `แต้มรวม +3 · เหลือ ${qq.left} เทิร์น` };
  const bb = (fd.bossBig || []).find((o) => (o.tiles || []).some((t) => at(t, x, y)));
  if (bb && bb.kind === "dark_zone") return { icon: "🌑", name: "เขตทมิฬ", desc: `เสียเทิร์นละ 1 · เหลือ ${bb.left} เทิร์น` };
  if (bb && bb.kind === "dark") return { icon: "🌑", name: "เขตทมิฬ", desc: "เทิร์นหน้า ดาเมจ 2" };
  if (bb) return { icon: bb.kind === "beam" ? "🔦" : bb.kind === "ring" ? "⭕" : "☄️", name: bb.kind === "beam" ? "ลำแสงทมิฬ" : bb.kind === "ring" ? "วงแหวนมรณะ" : "ฝนอุกกาบาต", desc: `เทิร์นหน้า ดาเมจ ${bb.kind === "beam" ? 4 : 3}` };
  if (fd.bossWarn && at(fd.bossWarn, x, y)) return { icon: "⚠️", name: "ราชาปีศาจกำลังมา", desc: "ลงเทิร์นหน้า" };
  const pl = (fd.pillars || []).find((p) => at(p, x, y));
  if (pl) {
    const name = `เสาคริสตัล ${ZONE[pl.zone] || ""}`;
    if (pl.owner) return { icon: "🔷", name, desc: `ยึดแล้ว · รอยตี ${pl.hits || 0}/${pl.hp || 2} · โล่ ${pl.ward || 0}/${pl.wardMax || 2}` };
    if (pl.ch) return { icon: "🔷", name, desc: "กำลังยึด" };
    return { icon: "🔷", name, desc: "ยึด 2 ตาติดกัน = ได้แต้มทุกเทิร์น" };
  }
  if ((fd.chests || []).some((c) => at(c, x, y))) return { icon: "🎁", name: "หีบสมบัติ", desc: "ตี = เหรียญ + ของ" };
  const car = (fd.cars || []).find((c) => at(c, x, y));
  if (car) {
    const hp = car.maxHp ? `♥ ${car.hp}/${car.maxHp} · ` : "";
    if (car.broken) return { icon: "🚗", name: "รถพัง", desc: `${hp}ซ่อมแล้วขับได้` };
    return { icon: "🚗", name: "รถ", desc: `${hp}เดิน +3 บนถนน · ชนมอนได้ · ใช้สกิลไม่ได้` };
  }
  const ch = (fd.chocos || []).find((c) => !c.rider && at(c, x, y));
  if (ch) return { icon: "🐤", name: "โชโกโบะ", desc: `${ch.maxHp ? `♥ ${ch.hp}/${ch.maxHp} · ` : ""}เดิน +2 · ป่า/น้ำตื้นไม่ช้า` };
  if ((fd.barrels || []).some((b) => at(b, x, y))) return { icon: "🛢️", name: "ถังน้ำมัน", desc: "ตี = ระเบิด 3×3 ดาเมจ 2 + ไฟ" };
  const cr = (fd.crystals || []).find((c) => at(c, x, y));
  if (cr) return { icon: "💎", name: cr.meteor ? "หินอุกกาบาต" : "หินพลังเวท", desc: `ตี = ขวดเวท${cr.element === "fire" ? "ไฟ" : cr.element === "ice" ? "น้ำแข็ง" : "สายฟ้า"}` };
  if ((fd.wrecks || []).some((w) => at(w, x, y))) return { icon: "🚙", name: "ซากรถ", desc: "ผลักไปปิดทางมอน" };
  if ((fd.tunnels || []).some((pair) => pair.some((t) => at(t, x, y)))) return { icon: "🕳️", name: "อุโมงค์" };
  if ((fd.docks || []).some((t) => at(t, x, y))) return { icon: "🛶", name: "ท่ากอนโดลา" };
  if ((fd.camps || []).some((t) => at(t, x, y))) return { icon: "🏕️", name: "แคมป์", desc: "อาหาร 3 เทิร์น: ตี +1 / ฟื้นเลือด / เดิน +1 · กลางคืนปีศาจเข้าวงไฟไม่ได้" };
  if (fd.night && (fd.camps || []).some((t) => Math.abs(t.x - x) + Math.abs(t.y - y) <= (fd.lightR || 2))) return { icon: "🔥", name: "วงไฟแคมป์", desc: "ปีศาจเข้าไม่ได้" };
  if ((fd.fish || []).some((t) => at(t, x, y))) return { icon: "🎣", name: "จุดตกปลา" };
  const ts = fd.townSpots || {};
  if ((ts.shrine || []).some((t) => at(t, x, y))) return { icon: "⛩️", name: "ศาลเทพธิดา", desc: `ทั้งทีมเกราะ +2 · ทุก 4 เทิร์น${fd.shrineReady === false ? " · ยังไม่พร้อม" : ""}` };
  if ((ts.diner || []).some((t) => at(t, x, y))) return { icon: "🍽️", name: "ร้านอาหาร", desc: "4 เหรียญ: เลือด +3 · ตี +1 เดิน +1 3 เทิร์น" };
  if ((ts.ranch || []).some((t) => at(t, x, y))) return { icon: "🐤", name: "ฟาร์มโชโกโบะ", desc: "3 เหรียญ = เรียกโชโกโบะ" };
  if ((ts.garage || []).some((t) => at(t, x, y))) return { icon: "🔧", name: "อู่ Hammerhead", desc: "ซ่อมรถเต็ม · เดิน +2 3 เทิร์น" };
  const tomb = (fd.tombs || []).find((t) => at(t, x, y));
  if (tomb) return { icon: "⚔️", name: tomb.name || "สุสานราชวงศ์", desc: tomb.open ? "เปิดแล้ว" : `5 เทิร์น: ${tomb.desc || "ตี +1"}${tomb.w === "father" ? "" : " · ตีแล้วเสียเลือด 1"}` };
  if ((fd.trams || []).some((t) => at(t, x, y))) return { icon: "🚋", name: "ป้ายรถราง", desc: "คนละ 2 เที่ยว แล้วพัก 2 เทิร์น" };
  if (fd.rail) {
    if ((fd.rail.stations || []).some((t) => at(t, x, y))) return { icon: "🚉", name: "ชานชาลา", desc: `รถไฟมาเทิร์น ${fd.rail.next}` };
    if (y === fd.rail.y) return { icon: "🛤️", name: "รางรถไฟ", desc: `รถไฟเทิร์น ${fd.rail.next}${fd.rail.next - round <= 1 ? " (มาแล้ว!)" : ""} · โดน 3 + กระเด็น` };
  }
  return null;
}
// สิ่งกีดขวาง/ช่องพิเศษที่ป้ายเดิมมีแค่ชื่อ (Rules.tileInfo) → เติมคำอธิบายตามชื่อ (ไม่มีในตาราง = ชื่ออย่างเดียว)
export const EOS_NAME_DESC = {
  "ป้อมปืน": "ยิงมอนระยะ 6 ดาเมจ 2",
  "คันโยกสะพาน": "สะพานยก = ข้ามไม่ได้",
  "แท่นโดม": "โดม 3 เทิร์น กันมอนนอกเมือง",
  "แผงไฟเมือง": "ไฟเปิด = มอนเข้าเมืองไม่ได้ · สาดไฟ = มอนระยะ 6 มึน 1 เทิร์น",
  "ซากกำแพง": "เดินผ่านได้ · ซ่อมได้",
  "ป่าทึบ": "เดินกิน 2 ก้าว · หลบ +20%",
  "น้ำตื้น": "เดินกิน 2 ก้าว",
  "คอกโชโกโบะ": "โชโกโบะเกิดใหม่",
  "น้ำลึก": "เดินไม่ได้ · ขวดน้ำแข็งแช่เป็นทางได้",
  "คลอง": "เดินไม่ได้ · ขวดน้ำแข็งแช่เป็นทางได้",
};
// สิ่งกีดขวางที่มีลูกเล่น (อยู่ชั้น terrain — Rules.tileInfo อ่านแค่ special) → ชื่อ + คำอธิบาย (ผู้ใช้ 2026-11-10 "อันไหนมีลูกเล่นต้องมีคำอธิบาย")
export const EOS_TERRAIN_INFO = {
  fd_eos_domecore: { icon: "🛡️", name: "แท่นโดม" },
  fd_eos_switch: { icon: "💡", name: "แผงไฟเมือง" },
  fd_eos_turret: { icon: "🔫", name: "ป้อมปืน" },
  fd_eos_lever: { icon: "🔗", name: "คันโยกสะพาน" },
};
export function eosTerrainInfo(map, x, y, fd = null, round = 0) {
  const k = map && map.terrain ? map.terrain[`${x},${y}`] : null;
  // กำแพงเมือง Insomnia (พังได้ — ผู้ใช้สั่ง 2026-11-10)
  if (k === "fd_eos_turret" && fd) {
    const cw = fd.cityWalls, h = cw && (cw.hurt || []).find((o) => o.x === x && o.y === y), max = (cw && cw.max) || 4;
    return { icon: "🔫", name: "ป้อมปืน", desc: `♥ ${h ? h.hp : max}/${max} · ${EOS_NAME_DESC["ป้อมปืน"]}` };
  }
  if (k === "fd_eos_wall" && x >= 8 && x <= 23 && y <= 8) {
    const cw = fd && fd.cityWalls, h = cw && (cw.hurt || []).find((o) => o.x === x && o.y === y), max = (cw && cw.max) || 4;
    return { icon: "🧱", name: "กำแพง Insomnia", desc: `♥ ${h ? h.hp : max}/${max}` };
  }
  if (k === "fd_eos_domecore" && fd) {
    const on = fd.dome && fd.dome.left > 0, cd = Math.max(0, (fd.domeReadyAt || 0) - round);
    return { icon: "🛡️", name: "แท่นโดม", desc: on ? `เปิดอยู่ · เหลือ ${fd.dome.left} เทิร์น` : cd > 0 ? `พร้อมใน ${cd} เทิร์น` : EOS_NAME_DESC["แท่นโดม"] };
  }
  const t = k && EOS_TERRAIN_INFO[k];
  return t ? { icon: t.icon, name: t.name, desc: t.desc || EOS_NAME_DESC[t.name] || "" } : null;
}
// มอนหัวหน้า (server/fodlan/eosElite.js — 2026-11-12)
const ELITE_INFO = { swift: "💨 เดิน +2", armored: "🪨 เกราะ +3", vampiric: "🩸 ดูดเลือด", volatile: "💥 ตายแล้วระเบิด 2", commander: "🚩 มอนรอบตัวตี +1", regen: "✚ ฟื้น 2/เทิร์น", thorns: "🌵 สวน 1" };
// มอนพิเศษ — ความสามารถสั้นๆ (ตัวเลขตี/เลือด/เกราะอยู่แถวบนของป้ายแล้ว)
export const EOS_TRAIT_INFO = {
  boss: { icon: "👑", desc: "พุ่งชน · กระทืบรอบตัว · ท่าใหญ่ทุก 3 เทิร์น (เตือนก่อน) · เลือดครึ่งคลั่ง · ล้ม = แต้มรวม +5" },
  lament: { icon: "💀", desc: "วูบไปหาคนอ่อนแอสุด · เคียวโดนทุกคนระยะ 2 · ต้องล้มจึงชนะ" },
  bomber: { icon: "💣", desc: "ถึงตัวแล้วระเบิด 3×3 · ตายก็ระเบิด" },
  healer: { icon: "💚", desc: "ไม่ตี · ฟื้นมอนรอบตัว 2 ทุกเทิร์น" },
  mech: { icon: "🦾", desc: "ช้า ถึก · ตีจากด้านหลัง (วงส้ม) +2" },
  sniper: { icon: "🎯", desc: "ยิงระยะ 3" },
  archer: { icon: "🏹", desc: "ยิงระยะ 4 · ถอยเมื่อโดนประชิด" },
  shield: { icon: "🛡️", desc: "ตีจากด้านหน้าเหลือ 1" },
  weaver: { icon: "🕸️", desc: "พ่นใยระยะ 3 = ตรึง 1 เทิร์น" },
  blinker: { icon: "👻", desc: "วาร์ปไปตีคนอ่อนแอสุดในระยะ 8 ทุก 2 เทิร์น" },
  hooker: { icon: "⛓️", desc: "ลากคนในแนวตรง 2–4 ช่องมาติดตัว" },
  rune: { icon: "🔮", desc: "วางวง 3×3 ระเบิดเทิร์นหน้า ดาเมจ 3" },
  swarm: { icon: "🐝", desc: "เลือด 1 · มาเป็นฝูง" },
  splitter: { icon: "🪨", desc: "ตายแล้วแตก 2 ร่าง" },
  splitling: { icon: "🪨", desc: "ร่างแยก" },
};
