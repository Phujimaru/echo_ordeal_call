// ============================================================
//  ทาลัสซา — ตัวแทนลำตัวให้สกิลเล็ง/โดนได้ (ผู้ใช้ 2026-11-20 "มันต้องใช้สกิลตีได้ด้วยนะ")
//   ทุกช่องลำตัว (thalassa.bodyNow) มียูนิตเทียม 1 ตัว (server/summon.js · kind "ntWhale" · summon.whaleProxy) — สกิลทุกแบบ
//   (เล็งตัว · พื้นที่ · แนว · ทุกศัตรู) + ตีปกติ เห็นเป็นศัตรูของทุกคนแบบมอน Eos
//   ความเสียหายที่ตัวแทนได้รับ (fodlan.incomingDamage) → ส่งต่อเข้าทาลัสซา (thalassa.damageWhale) แล้วตัวแทนไม่เสียอะไร
//   คำสั่งเดียวโดนหลายช่อง = นับเฉพาะช่องแรกที่โดน (ตีซ้ำช่องเดิมในคำสั่งเดียวกันนับทุกครั้ง — สกิลหลายฮิต)
//  ตัวแทนไม่มีตาเดิน · ไม่อยู่ใน ctx.alive() ของด่าน (ท่าของทาลัสซา/ลูกเล่นชั้นไม่โดนตัวเอง) · client ไม่วาดหมาก (ภาพคือตัวปลา)
//  ซิงก์ตำแหน่ง/จำนวนตามลำตัว: เข้าชั้น · ต้นเทิร์น · จบตา · จบเทิร์น · ทาลัสซาตาย
// ============================================================
const OWNER = { id: "thalassa", name: "ทาลัสซา", position: 0, customColor: null, teamId: null }; // เจ้าของสมมติ (แบบมอน Eos)
const SIDE = "ntwhale";
const IMG = "/nautilus/whale_side.webp";

const isProxy = (p) => !!(p && p.summon && p.summon.whaleProxy);
const proxiesOf = (match) => Object.values(match.players).filter((p) => isProxy(p) && p.alive);

function sync(ctx) {
  const Th = require("./thalassa");
  const w = ctx.match.fodlan && ctx.match.fodlan.whale;
  const body = w && w.on && !w.dead && Th.enabled(ctx.match) ? Th.bodyNow(ctx) : [];
  const list = proxiesOf(ctx.match);
  const Summon = require("../summon");
  let changed = false;
  body.forEach((c, i) => {
    let p = list[i];
    if (!p) {
      p = Summon.spawn(OWNER, {
        kind: "ntWhale", pos: { x: c.x, y: c.y }, hp: Math.max(1, w.hp), armor: 0, mov: 0, range: [1, 1],
        name: "ทาลัสซา", img: IMG, color: "#2b7f9e", data: { side: SIDE, whaleProxy: true },
      });
      changed = true;
    } else if (!p.pos || p.pos.x !== c.x || p.pos.y !== c.y) { p.pos = { x: c.x, y: c.y }; changed = true; }
    // เลือดที่เห็น (หน้าคาดการณ์/ป้าย) = เลือดทาลัสซา · ไม่มีเกราะ/โล่/สถานะค้าง
    p.hp = Math.max(1, w.hp); p.summon.maxHp = w.hpMax; p.armor = 0; p.shield = 0; p.tempHp = 0;
    if (Object.keys(p.statuses || {}).length) { p.statuses = {}; p.statusAmt = { cardAtkBonus: 0 }; }
  });
  for (const p of list.slice(body.length)) { Summon.remove(p); changed = true; }
  if (changed && ctx.bump) ctx.bump();
}

// ตัวแทนโดนความเสียหาย n (หลังฮุคของผู้ตี/ออร่า) → ทาลัสซาเสียแทน · คืน 0 = ตัวแทนไม่เสียอะไร
function hit(ctx, p, n, src) {
  if (!(n > 0) || !src || isProxy(src)) return 0;
  const m = ctx.match, seq = ctx.engine && ctx.engine.commandSeq;
  const key = `${m.roundNumber}:${seq}:${m.actorId || ""}:${src.id}`;
  const last = m.fodlan.whaleProxyHit;
  if (last && last.key === key && last.id !== p.id) return 0; // คำสั่งเดียวกันโดนช่องอื่นไปแล้ว
  m.fodlan.whaleProxyHit = { key, id: p.id };
  require("./thalassa").damageWhale(ctx, src, n, { x: p.pos ? p.pos.x : 0, y: p.pos ? p.pos.y : 0, src: "skill" });
  sync(ctx);
  return 0;
}

module.exports = { isProxy, proxiesOf, sync, hit, SIDE, OWNER };
