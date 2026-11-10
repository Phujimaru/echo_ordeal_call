// ============================================================
//  สถานการณ์ตอนนี้ของสนาม Eos (ผู้ใช้สั่ง 2026-11-10: "ไม่ใช่รายการเหตุการณ์ทั้งหมด แค่บอกว่าตอนนี้มีอีเว้นอะไร สภาพอากาศอะไร
//   และอื่นๆ ที่ต้องรู้เกี่ยวกับกระดานตอนนี้" + "กดอ่านสรุปได้ว่าจะให้ทำอะไร" — ซ้ายบนข้างตัวนับเทิร์น)
//  eosSituation(state) → [{ key, icon, title, detail, todo, tone, at? }] เรียงสำคัญก่อน · tone: "danger" | "warn" | "good" | "info"
//  ใช้ทั้งชิปบนแถบซ้ายบน (ไอคอน) และแผง EosSituation.jsx · ไม่มีอะไร = รายการว่าง
// ============================================================
const ZONE = { insomnia: "Insomnia", hammerhead: "Hammerhead", duscae: "Duscae", forest: "ป่าดัสเค", lake: "Cleigne", altissia: "Altissia", desert: "Leide", wild: "Eos" };
const WX = {
  eos_storm: { icon: "⛈️", title: "ฝนฟ้าคะนอง", detail: "เดิน −1 · ช่องเตือนแดงจะโดนฟ้าผ่าต้นเทิร์นหน้า ดาเมจ 2", todo: "หลบออกจากช่องเตือนแดงก่อนจบตา" },
  eos_fog: { icon: "🌫️", title: "หมอก", detail: "มองเห็นมอนเตอร์แค่ในระยะเดินของฝ่ายเรา", todo: "เดินเป็นกลุ่ม ระวังมอนที่โผล่จากหมอก" },
  eos_sand: { icon: "🏜️", title: "พายุทราย", detail: "ในทะเลทราย Leide มองเห็นแค่ 2 ช่อง", todo: "อย่าเข้าทะเลทรายคนเดียว" },
};
const DIFF = { easy: "ง่าย", normal: "ปกติ", hard: "ยาก" };

export function eosSituation(state) {
  const b = state && state.fodlan && state.fodlan.board;
  if (!b || !b.eos) return [];
  const out = [];
  const round = state.roundNumber || 0;
  const me = (state.players || []).find((p) => p.id === state.youId);
  // คืนสุดท้าย (PVE รอบสาม)
  if (b.final) out.push({ key: "final", icon: "🌑", title: "คืนสุดท้าย", detail: `กลางคืนถาวร · ปีศาจบุกรอบเสาที่ยึดไว้ทุกเทิร์น · แต้มรวม ${b.score || 0}/${b.goal || 50}`, todo: "เฝ้าเสาให้ครบจนแต้มถึงเป้า — ใกล้ชนะแล้ว", tone: "danger" });
  else if (b.finalAt && (b.score || 0) >= b.finalAt - 8) out.push({ key: "finalSoon", icon: "🌑", title: "คืนสุดท้ายใกล้มา", detail: `แต้มรวมถึง ${b.finalAt} = กลางคืนถาวร + คลื่นปีศาจบุกเสา (ตอนนี้ ${b.score || 0})`, todo: "ซ่อมเสา เสริมเกราะเสา เตรียมของ", tone: "warn" });
  // มาตรวัดทีมเต็ม
  if (b.gaugeMax && (b.gauge || 0) >= b.gaugeMax) out.push({ key: "gauge", icon: "☄️", title: "มาตรวัดทีมเต็ม", detail: "ถล่มวง 5×5 ที่ไหนก็ได้ ดาเมจ 4 ใส่มอนทุกตัวในวง", todo: "กดปุ่ม \"ถล่ม\" แล้วเลือกมอน (ใช้การโจมตีของตา)", tone: "good" });
  // ยักษ์หิน
  if (b.giant) {
    const gm = (b.mobs || []).find((m) => m.id === b.giant.id);
    const at = gm ? { x: gm.x, y: gm.y } : b.giant.path && b.giant.path[0] ? { x: b.giant.path[0].x, y: b.giant.path[0].y } : null;
    out.push({ key: "giant", icon: "🗿", title: b.giant.state === "warn" ? "ยักษ์หินกำลังมา" : "ยักษ์หินเดินผ่าน", detail: `${gm ? `♥ ${gm.hp}/${gm.maxHp} · ` : ""}เดินทีละ 4 ช่อง เหยียบแถบกว้าง 3 ช่อง ดาเมจ 3 ทุกตัว (มอนด้วย) · ช่องส้ม = จะเหยียบเทิร์นหน้า`, todo: "หลบช่องส้ม · ล่อมอนให้โดนเหยียบ · รวมทีมล้มได้ แต้มรวม +4 ทุกคนได้ของ", tone: "warn", at });
  }
  // รังปีศาจ
  const nests = (b.mobs || []).filter((m) => m.type === "nest");
  if (nests.length) out.push({ key: "nests", icon: "🔥", title: `รังปีศาจ ${nests.length} แห่ง`, detail: "ค่ำแล้วรังพ่นปีศาจ 3 ตัว และเพิ่มอีกตัวทุกเทิร์นกลางคืน", todo: b.night ? "ทำลายรังเพื่อหยุดปีศาจที่เกิดเพิ่ม" : "ทำลายก่อนค่ำ — ได้เหรียญ + ของ", tone: b.night ? "danger" : "warn", at: { x: nests[0].x, y: nests[0].y } });
  // พลเรือน
  for (const c of b.civs || []) {
    const lead = c.follow ? (state.players || []).find((u) => u.id === c.follow) : null;
    out.push({ key: `civ${c.id}`, icon: "🕊️", title: lead ? `${lead.name} กำลังพาพลเรือน` : "พลเรือนติดค้าง", detail: `♥ ${c.hp}/${c.maxHp} · มอนเล็งพลเรือนด้วย`, todo: lead ? "พาเข้าเมือง (Insomnia / Hammerhead / Altissia) = แต้มรวม +2" : "ยืนติดแล้วกด \"พาไป\" — พลเรือนจะตามติดตัว", tone: "good", at: { x: c.x, y: c.y } });
  }
  // พลังประจำเสา
  const POW = { insomnia: "🔫 ป้อมยิงเอง", altissia: "⛲ น้ำพุฟื้นเลือด", duscae: "🐤 โชโกโบะ +1", hammerhead: "🚗 รถ +1", lake: "🎣 ตกปลานำโชค" };
  if ((b.powers || []).length) out.push({ key: "powers", icon: "✨", title: `พลังเสา ${b.powers.length}/5`, detail: b.powers.map((z) => POW[z] || z).join(" · "), todo: "เสาหลุด = พลังของโซนนั้นหายด้วย", tone: "good" });
  // บอส
  const boss = b.boss ? [...(b.daemons || [])].find((d) => d.id === b.boss) : null;
  if (boss) out.push({ key: "boss", icon: "👑", title: "ราชาปีศาจ", detail: `♥ ${boss.hp}/${boss.maxHp} · ⛨ ${boss.armor} · ตีเสาทีเดียวหลุด · กระทืบทุกคนรอบตัว · เรียกปีศาจทุก 2 เทิร์น`, todo: "รวมทีมล้มก่อนถึงเสา · ใช้เกราะเสากันไว้ · ล้มได้ แต้มรวม +5 ทุกคนได้ของ", tone: "danger", at: { x: boss.x, y: boss.y } });
  else if (b.bossWarn) out.push({ key: "bossWarn", icon: "⚠️", title: "ราชาปีศาจกำลังมา", detail: "วงเวทแดงบนแผนที่ = จุดที่จะลงต้นเทิร์นหน้า", todo: "เตรียมป้องกันเสาที่ใกล้วงเวท", tone: "danger", at: { x: b.bossWarn.x, y: b.bossWarn.y } });
  else if (!b.bossFirst && b.bossAt) out.push({ key: "bossSoon", icon: "👑", title: "ราชาปีศาจ", detail: `จะปรากฏเมื่อแต้มรวมถึง ${b.bossAt} (ตอนนี้ ${b.score || 0}) แล้วมาทุกคืนหลังจากนั้น`, tone: "info" });
  // เสาโดนตี
  for (const pl of b.pillars || []) if (pl.owner && (pl.hits || 0) > 0) out.push({ key: `ph${pl.id}`, icon: "💢", title: `เสา ${ZONE[pl.zone] || pl.zone} โดนตี`, detail: `รอยตี ${pl.hits}/${pl.hp || 2} · ครบ = หลุดกลับเป็นกลาง`, todo: "ยืนติดเสากด \"ซ่อมเสา\" หรือใช้เกราะเสา", tone: "danger", at: { x: pl.x, y: pl.y } });
  // ยาน
  const warnShips = (b.ships || []).filter((d) => d.state === "warn"), landed = (b.ships || []).filter((d) => d.state === "landed");
  if (warnShips.length) out.push({ key: "shipWarn", icon: "🚨", title: `ยานจักรวรรดิกำลังลง ${warnShips.length} ลำ`, detail: "ช่องเตือนแดง 2×2 = จุดลงจอดต้นเทิร์นหน้า ปล่อยทหารเหล็กที่มุ่งไปตีเสา", todo: "ออกจากช่องเตือน · เตรียมกันเสาใกล้ๆ", tone: "warn", at: { x: warnShips[0].x, y: warnShips[0].y } });
  if (landed.length) out.push({ key: "ships", icon: "🛸", title: `ยานลงจอดอยู่ ${landed.length} ลำ`, detail: `ทหารเหล็ก ${(b.mobs || []).filter((m) => m.type === "magitek").length} ตัว · อยู่ 4 เทิร์นแล้วกลับ · ตัวตาแดง = ยิงไกล 3 ช่อง`, todo: "สกัดก่อนถึงเสา", tone: "warn", at: { x: landed[0].x, y: landed[0].y } });
  // ขบวนเสบียง
  if (b.convoy) out.push({ key: "convoy", icon: "🚚", title: `ขบวนเสบียง ${ZONE[b.convoy.from] || ""} → ${ZONE[b.convoy.to] || ""}`, detail: `♥ ${b.convoy.hp}/${b.convoy.maxHp} · วิ่งตามเส้นประทองต้นทุกเทิร์น · มอนเล็งรถด้วย`, todo: "คุ้มกันให้ถึงปลายทาง = แต้มรวม +6 ทุกคนได้เหรียญ+ของ", tone: "good", at: { x: b.convoy.x, y: b.convoy.y } });
  // ภารกิจ
  for (const q of b.quests || []) out.push({
    key: q.id, icon: q.type === "hunt" ? "⚔️" : "📡", title: `ภารกิจ ${ZONE[q.zone] || q.zone}: ${q.type === "hunt" ? "กวาดล้าง" : "สำรวจ"}`,
    detail: q.type === "hunt" ? `ล้มมอนในกรอบโซน ${q.have}/${q.need} · เหลือ ${q.left} เทิร์น` : `ไปยืนบนลำแสงทองแล้วกด "สำรวจ" · เหลือ ${q.left} เทิร์น`,
    todo: "สำเร็จ = แต้มรวม +3 · คนทำได้เหรียญ + ของ", tone: "good", at: { x: q.x, y: q.y },
  });
  // พระจันทร์สีเลือด · กลางวัน/คืน
  if (b.blood) out.push({ key: "blood", icon: "🩸", title: "คืนพระจันทร์สีเลือด", detail: "ปีศาจมากขึ้น 1.5 เท่า · เหรียญ/ของจากมอนเพิ่ม 2 เท่า", todo: "ล่ามอนเก็บของ แต่อย่าทิ้งเสา", tone: "warn" });
  out.push(b.night
    ? { key: "time", icon: "🌙", title: `กลางคืน (คืนที่ ${b.nightNo || 1})`, detail: `ปีศาจโผล่และเติมทุกเทิร์น · อีก ${b.cycleLeft || "?"} เทิร์นฟ้าสาง (ปีศาจสลาย)`, todo: "เฝ้าเสา อย่าเดินคนเดียว", tone: "info" }
    : { key: "time", icon: "☀️", title: `กลางวัน (วันที่ ${b.dayNo || 1})`, detail: `ยานจักรวรรดิลงบ่อย · อีก ${b.cycleLeft || "?"} เทิร์นค่ำ (ปีศาจรุ่นที่ ${(b.nightNo || 0) + 1})`, todo: "ยึดเสาเพิ่ม เก็บหีบ ทำภารกิจ", tone: "info" });
  // สภาพอากาศ
  const wx = state.fodlan.weather;
  if (wx && WX[wx.kind]) out.push({ key: "wx", ...WX[wx.kind], title: `${WX[wx.kind].title} · อีก ${wx.left} เทิร์น`, tone: "warn" });
  // รถไฟ
  if (b.rail && b.rail.next) {
    const left = b.rail.next - round;
    if (left <= 2) out.push({ key: "train", icon: "🚆", title: left <= 1 ? "รถไฟกำลังมา!" : `รถไฟมาในอีก ${left} เทิร์น`, detail: "ยืนบนราง (แถวรางรถไฟ) โดน 3 + กระเด็น · ยืนบนชานชาลา = ไปอีกฝั่งแผนที่", todo: "ออกจากราง", tone: left <= 1 ? "danger" : "info" });
  }
  // หีบ · เพื่อนล้ม · เมือง
  if ((b.chests || []).length) out.push({ key: "chest", icon: "🎁", title: `หีบสมบัติ ${b.chests.length} ใบ`, detail: "โจมตีหีบ = เหรียญ + ไอเทม/ขวดเวท", todo: "เดินไปโจมตีหีบเปิด (กดการ์ดนี้ = กล้องไปดู)", tone: "good", at: { x: b.chests[0].x, y: b.chests[0].y } });
  for (const sp of b.spirits || []) {
    const p = (state.players || []).find((u) => u.id === sp.id), r = (b.revive || []).find((o) => o.id === sp.id);
    if (!p) continue;
    out.push({ key: `sp${sp.id}`, icon: "🕯️", title: `${p.name} ล้ม`, detail: `ฟื้นในอีก ${r ? Math.max(0, r.at - round) : "?"} เทิร์น${sp.helped ? " · มีคนช่วยแล้ว จะฟื้นข้างดวงวิญญาณ" : ""}`, todo: "ยืนติดดวงวิญญาณกด \"ช่วย\" = ฟื้นเร็วขึ้น 1 เทิร์น", tone: "warn", at: { x: sp.x, y: sp.y } });
  }
  if (b.dome) out.push({ key: "dome", icon: "🛡️", title: `โดม Insomnia อีก ${b.dome.left} เทิร์น`, detail: "ประตูเมืองปิด · ตีจากนอกโดมเข้าไปไม่ได้", tone: "info" });
  const off = Object.entries(b.lightsOff || {}).filter(([, v]) => v).map(([k]) => ZONE[k] || k);
  if (off.length) out.push({ key: "lights", icon: "💡", title: `ไฟดับ: ${off.join(", ")}`, detail: "ปีศาจ/ทหารเหล็กเข้าเมืองนี้ได้", todo: "ไปเปิดไฟที่แผงไฟเมือง", tone: "warn" });
  // ของที่เราได้เทิร์นนี้
  const got = [];
  for (const e of b.fx || []) {
    if (e.round !== state.roundNumber) continue;
    if ((e.kind === "mob_die" || e.kind === "daemon_die" || e.kind === "chest_open") && e.by === (me && me.id)) { if (e.gold) got.push(`${e.gold} เหรียญ`); for (const n of e.loot || []) got.push(n); }
    if (e.kind === "boss_die" || e.kind === "giant_die") for (const l of e.loot || []) if (me && l.id === me.id) got.push(l.name);
  }
  if (got.length) out.push({ key: "got", icon: "🎒", title: "ได้รับเทิร์นนี้", detail: got.join(" · "), todo: "ไอเทมอยู่ในกระเป๋า · ขวดเวทเป็นปุ่มพิเศษ", tone: "good" });
  out.push({ key: "diff", icon: "🎚️", title: `ความยาก: ${DIFF[b.diff] || "ปกติ"}`, detail: `แต้มรวม ${b.score || 0}/${b.goal || 50} · จบเทิร์นนี้ +${b.rate || 0}`, tone: "info" });
  return out;
}
export const SIT_COUNT = (list) => list.filter((s) => s.tone === "danger" || s.tone === "warn").length;
