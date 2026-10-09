// ============================================================
// Character hook bundle used by server/ as CHAR_HOOKS[characterId].
// ตัวละครใหม่ต้อง require แล้วต่อท้าย CHARACTER_MODULES ที่นี่
// ============================================================

const muimi = require("./muimi"); // มุยมิ — ระดับง่าย
const oberon_summer = require("./oberon_summer"); // โอเบรอน (ฤดูร้อน) — ระดับกลาง
const sliver_bullet = require("./sliver_bullet"); // นักบินปริศนา — ระดับง่าย · unique

const CHARACTER_MODULES = [
  muimi,
  oberon_summer,
  sliver_bullet,
];

const CHAR_HOOKS = {};
for (const mod of CHARACTER_MODULES) CHAR_HOOKS[mod.id] = mod;

module.exports = CHAR_HOOKS;
