// ============================================================
//  สถานการณ์ตอนนี้ของสนาม Eos (ผู้ใช้สั่ง 2026-11-10: "ไม่ใช่รายการเหตุการณ์ทั้งหมด แค่บอกว่าตอนนี้มีอีเว้นอะไร สภาพอากาศอะไร
//   และอื่นๆ ที่ต้องรู้เกี่ยวกับกระดานตอนนี้" + "กดอ่านสรุปได้ว่าจะให้ทำอะไร" — ซ้ายบนข้างตัวนับเทิร์น)
//  ผู้ใช้สั่ง 2026-11-14 "คำอธิบายโคตรยาว ใจความสำคัญไม่ค่อยมี": detail = ตัวเลข/ข้อเท็จจริงสั้นๆ · todo = ไม่กี่คำ (มีเฉพาะที่ต้องรีบทำ)
//  eosSituation(state) → [{ key, icon, title, detail?, todo?, tone, at? }] เรียงสำคัญก่อน · tone: "danger" | "warn" | "good" | "info"
//  ใช้ทั้งชิปบนแถบซ้ายบน (ไอคอน) และแผง EosSituation.jsx · ไม่มีอะไร = รายการว่าง
// ============================================================
const ZONE = { insomnia: "Insomnia", hammerhead: "Hammerhead", duscae: "Duscae", forest: "ป่าดัสเค", lake: "Cleigne", altissia: "Altissia", desert: "Leide", wild: "Eos" };
const WX = {
  eos_storm: { icon: "⛈️", title: "ฝนฟ้าคะนอง", detail: "เดิน −1 · ช่องแดงฟ้าผ่า 2 · ทหารเหล็กตี −1", todo: "ออกจากช่องแดง" },
  eos_fog: { icon: "🌫️", title: "หมอก", detail: "เห็นมอนแค่ระยะเดิน · ปีศาจเดิน +1" },
  eos_snow: { icon: "🌨️", title: "พายุหิมะ", detail: "ทุกตัวเดิน −1 · ในเมือง/แคมป์ไม่โดน" },
  eos_magnet: { icon: "🧲", title: "พายุแม่เหล็ก", detail: "มอนเห็นแค่ 4 ช่อง" },
  eos_sand: { icon: "🏜️", title: "พายุทราย", detail: "ใน Leide เห็นแค่ 2 ช่อง" },
};
const DIFF = { easy: "ง่าย", normal: "ปกติ", hard: "ยาก", lament: "Lament" };

export function eosSituation(state) {
  const b = state && state.fodlan && state.fodlan.board;
  if (!b || !b.eos) return [];
  const out = [];
  const round = state.roundNumber || 0;
  const me = (state.players || []).find((p) => p.id === state.youId);
  // คืนสุดท้าย (PVE รอบสาม)
  if (b.final) out.push({ key: "final", icon: "🌑", title: "คืนสุดท้าย", detail: `ปีศาจบุกเสาทุกเทิร์น · ${b.score || 0}/${b.goal || 50}`, todo: "เฝ้าเสา", tone: "danger" });
  else if (b.finalAt && (b.score || 0) >= b.finalAt - 8) out.push({ key: "finalSoon", icon: "🌑", title: "คืนสุดท้ายใกล้มา", detail: `เริ่มที่แต้ม ${b.finalAt} · ตอนนี้ ${b.score || 0}`, tone: "warn" });
  // การ์ดทีมรอโหวต · โชโกโบะทอง
  if (b.perkOffer) out.push({ key: "perk", icon: "✨", title: "โหวตการ์ดทีม", detail: b.perkOffer.choices.map((c) => `${c.icon} ${c.name}`).join(" · "), tone: "good" });
  const gold = (b.mobs || []).find((m) => m.type === "gold");
  if (gold) out.push({ key: "gold", icon: "🐤", title: "โชโกโบะทอง", detail: "อยู่ 2 เทิร์น · เหรียญ 12 + ของ", tone: "good", at: { x: gold.x, y: gold.y } });
  // มาตรวัดทีมเต็ม
  if (b.gaugeMax && (b.gauge || 0) >= b.gaugeMax) out.push({ key: "gauge", icon: "☄️", title: "ถล่มพร้อม", detail: "วง 5×5 ดาเมจ 4", tone: "good" });
  // ยักษ์หิน
  if (b.giant) {
    const gm = (b.mobs || []).find((m) => m.id === b.giant.id);
    const at = gm ? { x: gm.x, y: gm.y } : b.giant.path && b.giant.path[0] ? { x: b.giant.path[0].x, y: b.giant.path[0].y } : null;
    out.push({ key: "giant", icon: "🗿", title: b.giant.state === "warn" ? "ยักษ์หินกำลังมา" : "ยักษ์หิน", detail: `${gm ? `♥ ${gm.hp}/${gm.maxHp} · ` : ""}ช่องส้มเหยียบ 3`, todo: "หลบช่องส้ม", tone: "warn", at });
  }
  // รังปีศาจ
  const nests = (b.mobs || []).filter((m) => m.type === "nest");
  if (nests.length) out.push({ key: "nests", icon: "🔥", title: `รังปีศาจ ${nests.length}`, detail: "กลางคืนพ่นปีศาจ", tone: b.night ? "danger" : "warn", at: { x: nests[0].x, y: nests[0].y } });
  // พลเรือน
  for (const c of b.civs || []) {
    const lead = c.follow ? (state.players || []).find((u) => u.id === c.follow) : null;
    out.push({ key: `civ${c.id}`, icon: "🕊️", title: lead ? `${lead.name} พาพลเรือน` : "พลเรือน", detail: `♥ ${c.hp}/${c.maxHp} · ถึงเมือง +2`, tone: "good", at: { x: c.x, y: c.y } });
  }
  // พลังประจำเสา
  const POW = { insomnia: "🔫 ป้อมยิงเอง", altissia: "⛲ ฟื้นเลือด", duscae: "🐤 โชโกโบะ +1", hammerhead: "🚗 รถ +1", lake: "🎣 ตกปลา ×2" };
  if ((b.powers || []).length) out.push({ key: "powers", icon: "✨", title: `พลังเสา ${b.powers.length}/5`, detail: b.powers.map((z) => POW[z] || z).join(" · "), tone: "good" });
  // บอส
  const boss = b.boss ? [...(b.daemons || [])].find((d) => d.id === b.boss) : null;
  if (boss) out.push({ key: "boss", icon: "👑", title: "ราชาปีศาจ", detail: `♥ ${boss.hp}/${boss.maxHp} · ⛨ ${boss.armor}`, tone: "danger", at: { x: boss.x, y: boss.y } });
  else if (b.bossWarn) out.push({ key: "bossWarn", icon: "⚠️", title: "ราชาปีศาจกำลังมา", detail: "ลงเทิร์นหน้า", tone: "danger", at: { x: b.bossWarn.x, y: b.bossWarn.y } });
  else if (!b.bossFirst && b.bossAt) out.push({ key: "bossSoon", icon: "👑", title: "ราชาปีศาจ", detail: `มาที่แต้ม ${b.bossAt} · ตอนนี้ ${b.score || 0}`, tone: "info" });
  // เสาโดนตี
  for (const pl of b.pillars || []) if (pl.owner && (pl.hits || 0) > 0) out.push({ key: `ph${pl.id}`, icon: "💢", title: `เสา ${ZONE[pl.zone] || pl.zone} โดนตี`, detail: `รอยตี ${pl.hits}/${pl.hp || 2}`, todo: "ซ่อมเสา", tone: "danger", at: { x: pl.x, y: pl.y } });
  // ยาน
  const warnShips = (b.ships || []).filter((d) => d.state === "warn"), landed = (b.ships || []).filter((d) => d.state === "landed");
  if (warnShips.length) out.push({ key: "shipWarn", icon: "🚨", title: `ยานกำลังลง ${warnShips.length}`, detail: "ช่องแดง = ลงเทิร์นหน้า", tone: "warn", at: { x: warnShips[0].x, y: warnShips[0].y } });
  if (landed.length) out.push({ key: "ships", icon: "🛸", title: `ยานจอด ${landed.length}`, detail: `ทหารเหล็ก ${(b.mobs || []).filter((m) => m.type === "magitek").length}`, tone: "warn", at: { x: landed[0].x, y: landed[0].y } });
  // PVE รอบหก: ท้องฟ้า/รถไฟเสบียง
  const sk = b.sky || {};
  if (sk.eclipse) out.push({ key: "eclipse", icon: "🌑", title: "สุริยคราส", detail: `อีก ${sk.eclipse.left} เทิร์น · ปีศาจออก`, tone: "danger" });
  if (sk.fullMoon) out.push({ key: "moon", icon: "🌕", title: "จันทร์เต็มดวง", detail: "สัตว์ยักษ์ตี +1 · ของ ×2", tone: "warn" });
  if (sk.meteor) out.push({ key: "meteor", icon: "☄️", title: `ฝนดาวตก ${sk.meteor.tiles.length}`, detail: "เทิร์นหน้า ดาเมจ 3", todo: "ออกจากวง", tone: "danger", at: sk.meteor.tiles[0] });
  if (sk.supply) out.push({ key: "supply", icon: "🚂", title: "รถไฟเสบียง", detail: `${sk.supply.loads}/${sk.supply.max} · ออกใน ${sk.supply.left} เทิร์น`, tone: "good", at: { x: sk.supply.x, y: sk.supply.y } });
  if (b.dome && b.dome.maxHp) out.push({ key: "dome", icon: "🛡️", title: `โดม Insomnia ${b.dome.left} เทิร์น`, detail: `♥ ${b.dome.hp}/${b.dome.maxHp}`, tone: "info" });
  // ขบวนเสบียง
  if (b.convoy) out.push({ key: "convoy", icon: "🚚", title: `ขบวนเสบียง → ${ZONE[b.convoy.to] || ""}`, detail: `♥ ${b.convoy.hp}/${b.convoy.maxHp} · ถึง +6`, tone: "good", at: { x: b.convoy.x, y: b.convoy.y } });
  // ภารกิจ
  for (const q of b.quests || []) out.push({
    key: q.id, icon: q.type === "hunt" ? "⚔️" : q.type === "guard" ? "🛡️" : "📡", title: `${q.type === "hunt" ? "กวาดล้าง" : q.type === "guard" ? "เฝ้าเมือง" : "สำรวจ"} ${ZONE[q.zone] || q.zone}`,
    detail: `${q.type === "scout" ? "" : `${q.have}/${q.need} · `}เหลือ ${q.left} เทิร์น · +3`, tone: "good", at: { x: q.x, y: q.y },
  });
  // พระจันทร์สีเลือด · กลางวัน/คืน
  if (b.blood) out.push({ key: "blood", icon: "🩸", title: "จันทร์สีเลือด", detail: "ปีศาจ ×1.5 · ของ ×2", tone: "warn" });
  out.push(b.night
    ? { key: "time", icon: "🌙", title: `คืนที่ ${b.nightNo || 1}`, detail: `ฟ้าสางใน ${b.cycleLeft || "?"} เทิร์น`, tone: "info" }
    : { key: "time", icon: "☀️", title: `วันที่ ${b.dayNo || 1}`, detail: `ค่ำใน ${b.cycleLeft || "?"} เทิร์น`, tone: "info" });
  // สภาพอากาศ
  const wx = state.fodlan.weather;
  if (wx && WX[wx.kind]) out.push({ key: "wx", ...WX[wx.kind], title: `${WX[wx.kind].title} · ${wx.left} เทิร์น`, tone: "warn" });
  // รถไฟ
  if (b.rail && b.rail.next) {
    const left = b.rail.next - round;
    if (left <= 2) out.push({ key: "train", icon: "🚆", title: left <= 1 ? "รถไฟกำลังมา!" : `รถไฟใน ${left} เทิร์น`, detail: "บนราง โดน 3 + กระเด็น", todo: "ออกจากราง", tone: left <= 1 ? "danger" : "info" });
  }
  // หีบ · เพื่อนล้ม · เมือง
  if ((b.chests || []).length) out.push({ key: "chest", icon: "🎁", title: `หีบสมบัติ ${b.chests.length}`, tone: "good", at: { x: b.chests[0].x, y: b.chests[0].y } });
  for (const sp of b.spirits || []) {
    const p = (state.players || []).find((u) => u.id === sp.id), r = (b.revive || []).find((o) => o.id === sp.id);
    if (!p) continue;
    out.push({ key: `sp${sp.id}`, icon: "🕯️", title: `${p.name} ล้ม`, detail: `ฟื้นใน ${r ? Math.max(0, r.at - round) : "?"} เทิร์น`, tone: "warn", at: { x: sp.x, y: sp.y } });
  }
  if (b.dome && !b.dome.maxHp) out.push({ key: "dome", icon: "🛡️", title: `โดม Insomnia ${b.dome.left} เทิร์น`, tone: "info" });
  const off = Object.entries(b.lightsOff || {}).filter(([, v]) => v).map(([k]) => ZONE[k] || k);
  if (off.length) out.push({ key: "lights", icon: "💡", title: `ไฟดับ: ${off.join(", ")}`, detail: "มอนเข้าเมืองได้", todo: "เปิดไฟ", tone: "warn" });
  // ของที่เราได้เทิร์นนี้
  const got = [];
  for (const e of b.fx || []) {
    if (e.round !== state.roundNumber) continue;
    if ((e.kind === "mob_die" || e.kind === "daemon_die" || e.kind === "chest_open") && e.by === (me && me.id)) { if (e.gold) got.push(`${e.gold} เหรียญ`); for (const n of e.loot || []) got.push(n); }
    if (e.kind === "boss_die" || e.kind === "giant_die") for (const l of e.loot || []) if (me && l.id === me.id) got.push(l.name);
  }
  if (got.length) out.push({ key: "got", icon: "🎒", title: "ได้รับเทิร์นนี้", detail: got.join(" · "), tone: "good" });
  out.push({ key: "diff", icon: "🎚️", title: DIFF[b.diff] || "ปกติ", detail: `${b.score || 0}/${b.goal || 50} · +${b.rate || 0}/เทิร์น`, tone: "info" });
  return out;
}
export const SIT_COUNT = (list) => list.filter((s) => s.tone === "danger" || s.tone === "warn").length;
