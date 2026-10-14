// กติกากลางที่ระบบเรียกตรง (สังหารทันที · ชื่อท่าจากสถานะ · เกราะ Mark 42)
// export ก่อน require: ไฟล์ใน server/ require วนกันเอง — function declaration ถูก hoist จึงพร้อมใช้ตั้งแต่บรรทัดแรก
Object.assign(module.exports, {
  hasKillCapability,
  ultNameOfStatus,
  mark42Run, mark42Control,
});

const { netramanaActive } = require("../characters/_universal_status");
const Mark42 = require("../characters/_mark42");
const { io } = require("./app");
const { TRANSFORMS } = require("./constants");
const match = require("./match");
const { engine } = require("./engine");
const combat = require("./combat");
const cutscene = require("./cutscene");
const actionPhase = require("./phases/action");
const lobby = require("./lobby");
const shop = require("./shop");
const view = require("./view");
const Visibility = require("./visibility");

// ผู้เล่นคนนี้ "มี" ความสามารถสังหารทันทีติดตัวไหม
function hasKillCapability(p) {
  if (!p || !p.alive) return false;
  // "เนตรมณะ" (สถานะ Universal patch 2.2.7): ใครติดบัฟนี้ก็มีความสามารถสังหารทันทีระหว่างที่บัฟยังอยู่
  if (netramanaActive(p)) return true;
  return false;
}
// ชื่อท่าไม้ตายจาก status (ใช้ตอนยกเลิกย้อนหลัง — บางท่าไม่มีใน TRANSFORMS/ข้อมูลสกิล)
function ultNameOfStatus(p, key) {
  const t = TRANSFORMS[key];
  if (t && t.title) return t.title;
  const s = combat.skillByStatus(p, key);
  return s ? s.name : key;
}
// ---------- เกราะ Mark 42: เล่นวีดีโอก่อน แล้วค่อยเกิดผล (แพทเทิร์นเดียวกับกระสุน GUTS) ----------
//  ผู้เรียกต้องทำให้ผู้ใช้ปรากฏตัวก่อน (Visibility.onHostileAct) ถ้าการกระทำนี้ไปถึงตัวคนอื่น
//  ผู้ใช้ยังซ่อนอยู่ (ล่องหน/พุ่มหญ้า/ม่านแดง — ใส่เอง · ถอดจากตัวเอง) = ป้าย/คลิปส่งเฉพาะคนที่มองเห็นเขา (ชื่อไม่หลุด)
function mark42Run(p, plan, onUsed) {
  const onlyFor = seenBy(p);
  const flash = { name: plan.flash, img: Mark42.IMG.item, by: p.name, color: lobby.colorOf(p) };
  if (onlyFor) for (const id of onlyFor) io.to(id).emit("skillFlash", flash);
  else io.emit("skillFlash", flash);
  if (onUsed) onUsed();
  const after = () => combat.withEffectSource(p, plan.after);
  if (plan.video && (match.gameState === "PLAYING" || match.gameState === "ACTION")) {
    // ระเบิดเล่นทุกครั้ง · ใส่เอง/ใส่ให้/เรียกคืน เต็มครั้งแรกครั้งเดียว (ครั้งถัดไปแค่การ์ดแจ้งเตือน ไม่หยุดเกม)
    //  ผ่าน engine — เทสต์แทนที่ได้ (ในเกมจริงคือฟังก์ชันเดียวกัน)
    if (plan.video === "mark42Bomb") engine.queueCutscene(p, plan.video, onlyFor);
    else if (!onlyFor) engine.triggerCutscene(p, plan.video);
    else if (p.cutsceneShown[plan.video]) engine.notifyTransform(p, plan.video, onlyFor);
    else { p.cutsceneShown[plan.video] = true; engine.queueCutscene(p, plan.video, onlyFor); }
    if (match.cutsceneQueue.length) { cutscene.pausePlayingForCutscene(after); return; }
  }
  after();
  view.broadcastState();
}
// เจ้าของคุมชุดที่ส่งออกไปแล้ว: เรียกคืน / ถอด / สั่งระเบิด (ช่วงจั่วการ์ด · คนใส่ถอดเองไม่ได้)
//  ระบบคู่: ตัวไหนของฝ่ายก็สั่งชุดของฝ่ายได้ (Mark42.planControl)
//  ชุดอยู่บนตัวคนอื่น (ระเบิด/เรียกคืน/ถอดจากคนอื่น) = ผู้สั่งปรากฏตัวก่อนส่งอะไรออกไป (เหมือนส่งชุดให้ — shop.useInventoryItem)
function mark42Control(id, action) {
  const p = match.players[id];
  if (!p || !p.alive || !actionPhase.canAct(p) || shop.asleep(p)) return;
  const plan = Mark42.planControl(engine, p, action);
  if (!plan) { view.broadcastState(); return; }
  actionPhase.lockMove(p);
  if (plan.wearerId !== p.id) Visibility.onHostileAct(p);
  mark42Run(p, plan, null);
}
// ผู้เล่นที่มองเห็น p (id สำหรับ io.to) — ทุกคนเห็น = undefined (ส่งทุกคนตามเดิม)
function seenBy(p) {
  const viewers = Object.values(match.players).filter((v) => !v.duoOf);
  const out = viewers.filter((v) => !Visibility.hiddenFrom(v, p)).map((v) => v.id);
  return out.length === viewers.length ? undefined : out;
}
