// ============================================================
//  หุ่นยืนเฉย (เล่นคนเดียว (ทดสอบ) — ผู้ใช้สั่ง 2026-11-11 "เอาบอทที่ยืนเฉยๆ มาด้วยตัวหนึ่งระหว่างทดสอบ")
//  แมตช์ที่มีผู้เล่นจริงคนเดียว (ไม่ใช่ Fodlan/Eos/Moon Cell ที่มีศัตรูของด่านอยู่แล้ว) = มีหุ่น 1 ตัวยืนใกล้ผู้เล่น
//  เป็นยูนิตที่ถูกเรียกแบบไม่มีเจ้าของคุม (server/summon.js — ศัตรูของทุกคน · ไม่มีตาเดิน · ไม่นับในการตัดสินผล)
//  ตาย/หายตอนเปลี่ยนภูมิภาค = ต้นเทิร์นถัดไปเกิดใหม่ (phases/draw.js dealRound เรียก ensure)
// ============================================================
Object.assign(module.exports, { ensure });

const match = require("./match");

const KIND = "soloDummy";
const HP = 7;
const ARMOR = 3;

function ensure() {
  const Summon = require("./summon");
  const action = require("./phases/action");
  const Fodlan = require("./fodlan");
  const Moon = require("./moonCell");
  const real = Object.values(match.players).filter((p) => !p.summon && !p.duoOf);
  if (real.length !== 1 || Fodlan.inWorld() || Moon.inWorld()) return null;
  const owner = real[0];
  if (Object.values(match.players).some((p) => p.summon && p.alive && p.summon.kind === KIND)) return null;
  const near = owner.pos ? { x: owner.pos.x + 2, y: owner.pos.y } : null;
  const at = near ? action.nearFreeTile(near) : null;
  if (!at) return null;
  return Summon.spawn(owner, { kind: KIND, name: "หุ่นยืนเฉย", hp: HP, armor: ARMOR, mov: 0, range: [1, 0], pos: at, img: "/image/logo_current.webp", color: "#8a8f99" });
}
