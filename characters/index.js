// ============================================================
// Character hook bundle used by server/ as CHAR_HOOKS[characterId].
// ตัวละครใหม่ต้อง require แล้วต่อท้าย CHARACTER_MODULES ที่นี่
// ============================================================

const muimi = require("./muimi"); // มุยมิ — ระดับง่าย
const oberon_summer = require("./oberon_summer"); // โอเบรอน (ฤดูร้อน) — ระดับกลาง

const CHARACTER_MODULES = [
  muimi,
  oberon_summer,
];

const CHAR_HOOKS = {};
for (const mod of CHARACTER_MODULES) CHAR_HOOKS[mod.id] = mod;

module.exports = CHAR_HOOKS;
