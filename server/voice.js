// ============================================================
//  เสียงพากย์ตามเหตุการณ์ — ระบบกลาง (GAME_SYSTEM §23 · ต้นแบบ ไจโร เซปเปลี่)
//  ตัวละครบอกรายการคีย์เสียง (client/src/audio.js FILES) ต่อเหตุการณ์ผ่านฮุค voiceLines(p) → { [event]: [key…] }
//   "turn"     = ถึงตาเดินของตัวเอง (nextActor — ไม่นับตาที่ถูกข้ามเพราะสตั้น)
//   "strike"   = ตีปกติ/ตีสวน (attack.strike — รวมตีพลาด)
//   "struck"   = โดนตีปกติ/ตีสวน (หลบพ้น = ไม่ดัง)
//   "basic" | "secondary" | "ultimate" = ใช้สกิลช่องนั้นสำเร็จ (skills.useSkill หลังลงผล)
//  หลายคีย์ = สุ่ม 1 คีย์ทุกครั้ง · ส่ง socket "sfx" { sound, voice: playerId } — client ตัดเสียงพากย์เก่าของคนเดียวกันก่อนเล่นใหม่
//  ไม่มีฮุค/ไม่มีคีย์ = เงียบ (ไม่แตะ Math.random — เทสต์ที่ล็อกลำดับสุ่มของตัวอื่นไม่เพี้ยน)
// ============================================================
Object.assign(module.exports, { play, linesOf });

const CHAR_HOOKS = require("../characters/index");
const { engine } = require("./engine");

function linesOf(p, event) {
  const hook = p && CHAR_HOOKS[p.characterId];
  if (!hook || typeof hook.voiceLines !== "function") return [];
  let lines = null;
  try { lines = hook.voiceLines(p); } catch (err) { console.error(`[hook] ${hook.id}.voiceLines โยน error:`, err); }
  const list = lines && lines[event];
  return Array.isArray(list) ? list.filter(Boolean) : [];
}
// เล่นเสียงพากย์ของ p สำหรับเหตุการณ์นี้ → คีย์ที่เล่น | null
function play(p, event) {
  const list = linesOf(p, event);
  if (!list.length) return null;
  const key = list.length > 1 ? list[Math.floor(Math.random() * list.length)] : list[0];
  engine.sfx(key, null, { voice: p.id });
  return key;
}
