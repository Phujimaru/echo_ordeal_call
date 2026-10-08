// คิวคัตซีน/วีดีโอแปลงร่าง
// export ก่อน require: ไฟล์ใน server/ require วนกันเอง — function declaration ถูก hoist จึงพร้อมใช้ตั้งแต่บรรทัดแรก
Object.assign(module.exports, {
  triggerCutscene, queueCutscene, notifyTransform, pausePlayingForCutscene, runCutsceneQueue,
});

const { io } = require("./app");
const { TRANSFORMS } = require("./constants");
const match = require("./match");
const endTurnPhase = require("./phases/endTurn");
const action = require("./phases/action");
const draw = require("./phases/draw");
const lobby = require("./lobby");
const summary = require("./phases/summary");
const timers = require("./timers");
const view = require("./view");

// ============================================================
//  cutscene
// ============================================================
// ครั้งแรกต่อเกม/ต่อคน = เล่นวีดีโอเต็ม (หยุดกระดาน), ครั้งต่อไป = แค่การ์ดแจ้งเตือนเล็กๆ ไม่หยุดเกม
function triggerCutscene(p, key) {
  // ท่าที่ไม่มีวีดีโอ (มีแต่ภาพ+เพลง) = แจ้งเตือนบนกระดานอย่างเดียว ไม่ตัดเข้าเฟส CUTSCENE
  if (!TRANSFORMS[key] || !TRANSFORMS[key].video) { notifyTransform(p, key); return; }
  if (p.cutsceneShown[key]) notifyTransform(p, key);
  else { p.cutsceneShown[key] = true; queueCutscene(p, key); }
}
// onlyFor (ไม่บังคับ): array ของ playerId ที่ "เห็นวีดีโอนี้" — คนอื่นยังหยุดรอตามจังหวะเดียวกัน
//  แต่ buildStateFor จะไม่ส่ง cutscene ให้ (client จึงวาดกระดานตามปกติแทนที่จะเล่นคลิป)
//  ใช้กับคลิปที่เป็นเรื่องส่วนตัวของผู้เล่นบางคน
function queueCutscene(p, key, onlyFor) {
  const t = TRANSFORMS[key];
  if (!t || !t.video) return;
  match.cutsceneQueue.push({
    seconds: t.seconds,
    info: {
      playerId: p.id, name: p.name,
      img: t.img, color: lobby.colorOf(p),
      video: t.video, title: t.title, label: t.label, voice: t.voice || null,
      noIntro: !!t.noIntro, // true = ตัดการ์ดเปิดตัว 950ms ทิ้ง เข้าวีดีโอทันที (คลิปสั้นมาก)
      onlyFor: Array.isArray(onlyFor) && onlyFor.length ? [...onlyFor] : null,
    },
  });
}
// การ์ดแจ้งเตือนเล็กๆ (ครั้งที่ 2 เป็นต้นไป): ส่งทันทีแบบเดียวกับ skillFlash — ไม่ตัดเข้าเฟส CUTSCENE
// ไม่หยุดเวลา/กระดาน แค่บอกว่าใครใช้ท่าอะไรซ้ำ
//  onlyFor (ไม่บังคับ): array ของ playerId ที่เห็นการ์ดนี้ (แบบเดียวกับ queueCutscene) — คนอื่นไม่ได้รับ event เลย
function notifyTransform(p, key, onlyFor) {
  const t = TRANSFORMS[key];
  if (!t) return;
  const payload = {
    playerId: p.id, name: p.name,
    img: t.img, color: lobby.colorOf(p),
    title: t.title, label: t.label,
  };
  if (Array.isArray(onlyFor)) { for (const id of onlyFor) io.to(id).emit("transformNotice", payload); return; }
  io.emit("transformNotice", payload);
}
// พักเฟสปัจจุบันไว้ เล่น cutscene ให้จบ แล้วกลับมาเฟสเดิมด้วยเวลาที่เหลือ
//  ช่วงจั่วไพ่ (PLAYING) หรือ ตาเดิน (ACTION — สกิล/ไอเทมที่มีคลิปในตาของตัวเอง)
// after (ไม่บังคับ): งานที่ต้องทำ "หลังวีดีโอจบ" ก่อนกลับเข้าเฟสจั่วไพ่ — ใช้กับกระสุน GUTS Select
//  ที่ต้องเล่นวีดีโอก่อนแล้วค่อยให้ผลเสียหาย/สถานะโผล่บนกระดาน (ไม่ใช่ลดเลือดไปตั้งแต่ก่อนวีดีโอเล่น)
function pausePlayingForCutscene(after) {
  const remain = Math.max(3, match.timeLeft);
  const inAction = match.gameState === "ACTION";
  timers.clearPhaseTimer();
  runCutsceneQueue(() => {
    if (after) after();
    if (inAction) {
      // ศัตรูหมดแล้ว (เช่นคลื่นดาบ/ระเบิดฆ่าคนสุดท้าย) = จบเกมทันที
      if (endTurnPhase.gameOver()) return;
      // คนเดินอยู่ตกรอบระหว่างคลิป (เช่นระเบิดตัวเอง) = ไปคนถัดไปเลย
      const actor = match.players[match.actorId];
      if (!actor || !actor.alive) { action.finishActor(); return; }
      match.gameState = "ACTION";
      timers.startPhaseTimer(remain, action.finishActor);
      view.broadcastState();
      return;
    }
    match.gameState = "PLAYING";
    timers.startPhaseTimer(remain, summary.resolveRound);
    view.broadcastState();
    draw.checkAllLocked();
  });
}
function runCutsceneQueue(onDone) {
  if (match.cutsceneQueue.length === 0) { match.cutsceneInfo = null; onDone(); return; }
  const c = match.cutsceneQueue.shift();
  match.cutsceneInfo = { ...c.info, id: ++match.cutsceneSeq }; // id ใหม่ทุกครั้ง -> client remount วีดีโอ
  match.gameState = "CUTSCENE";
  timers.startPhaseTimer(c.seconds, () => runCutsceneQueue(onDone));
  view.broadcastState();
}
