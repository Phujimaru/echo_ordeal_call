// ============================================================
// Character hook bundle used by server/ as CHAR_HOOKS[characterId].
// ตัวละครใหม่ต้อง require แล้วต่อท้าย CHARACTER_MODULES ที่นี่
// ============================================================

const muimi = require("./muimi"); // มุยมิ — ระดับง่าย
const oberon_summer = require("./oberon_summer"); // โอเบรอน (ฤดูร้อน) — ระดับกลาง
const sliver_bullet = require("./sliver_bullet"); // นักบินปริศนา — ระดับง่าย · unique
const echo = require("./echo"); // Echo — พิเศษ (ขยายร่างบนกระดาน)
const sora_otosumi = require("./sora_otosumi"); // โซระ โอโตสุมิ — ระดับง่าย (แปลงร่าง My-Th)
const raido_hikaru = require("./raido_hikaru"); // ไรโด ฮิคารุ — ระดับกลาง (UltraLive / Ultraman Ginga)

const CHARACTER_MODULES = [
  muimi,
  oberon_summer,
  sliver_bullet,
  echo,
  sora_otosumi,
  raido_hikaru,
];

const CHAR_HOOKS = {};
for (const mod of CHARACTER_MODULES) CHAR_HOOKS[mod.id] = mod;

module.exports = CHAR_HOOKS;
