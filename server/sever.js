// ============================================================
//  ตัดผลสกิลที่ทำงานอยู่ — ระบบกลาง (GRID_PLAN §7.17 · ต้นแบบ รากฐานจิตของผู้นำแห่งตระกูลเรียวกิ)
//  "ผลสกิล" = สิ่งที่สกิลของตัวเป้าเองเปิดค้างไว้: ท่าไม้ตาย/สถานะจากสกิล · ร่างแปลง · ท่าที่รอ trigger (เดอะเวิลด์ counter ฯลฯ)
//  ตัวละครบอกรายการผ่านฮุค severables(engine, p) → [{ key, label, at, cancel() }]
//   key   = ชื่อภายใน (ไม่ซ้ำในตัวละครเดียวกัน)
//   label = ชื่อที่ผู้เล่นเห็นในป้าย/log (ชื่อสกิลหรือร่าง)
//   at    = ลำดับที่ได้ผลนี้มา (เลขยิ่งมาก = ยิ่งใหม่) — ตอนเปิดผลให้จด engine.severStamp() ไว้
//   cancel() = ปิดผลทันที: กลับร่างเดิม/ล้างสถานะ/ยกเลิกท่าที่รอ · สกิลนั้นเข้าคูลดาวน์ตามปกติ (เหมือนหมดเวลาเอง)
//  cut(engine, t) ตัดอันที่ได้มาล่าสุด 1 อย่าง → { key, label } | null
// ============================================================
Object.assign(module.exports, { stamp, list, latest, cut });

const CHAR_HOOKS = require("../characters/index");

let seq = 0;
// ลำดับกลางของการได้ผลสกิล (เพิ่มขึ้นเรื่อยๆ ข้ามแมตช์ — ใช้เทียบใหม่/เก่าเท่านั้น)
function stamp() { return ++seq; }

function list(engine, t) {
  if (!t || !t.alive) return [];
  const hook = CHAR_HOOKS[t.characterId];
  if (!hook || typeof hook.severables !== "function") return [];
  let out = null;
  try { out = hook.severables(engine, t); } catch (err) { console.error(`[hook] ${hook.id}.severables โยน error:`, err); }
  return Array.isArray(out) ? out.filter((e) => e && typeof e.cancel === "function") : [];
}
function latest(engine, t) {
  let best = null;
  for (const e of list(engine, t)) if (!best || (e.at || 0) > (best.at || 0)) best = e;
  return best;
}
function cut(engine, t) {
  const e = latest(engine, t);
  if (!e) return null;
  try { e.cancel(); } catch (err) { console.error(`[sever] ${t.characterId}.${e.key} cancel โยน error:`, err); return null; }
  return { key: e.key, label: e.label || e.key };
}
