// ============================================================
//  ไคจูของไอเซ็น มาโคโตะ (characters/aizen_makoto.js) — ฮุครายตัวของยูนิต characterId "aizen_kaiju"
//  ลงทะเบียนใน CHAR_HOOKS แต่ไม่อยู่ใน MODULES (ไม่รับฮุคกระจาย) · AI คุม (server/unitAi.js) · เดินหลังผู้เล่นทุกคน
//  ตัว 3×3 · ท่าตี/ธาตุ/ผลตีโดน ใช้ตารางเดียวกับตอนไอเซ็นสิงร่าง (aizen.KAIJU)
// ============================================================
const aizen = () => require("./aizen_makoto"); // require ตอนเรียก — กัน require วน
const eng = () => require("../server/engine").engine;
const spec = (u) => aizen().specOf(u);

module.exports = {
  id: "aizen_kaiju",
  attackBaseOverride(engine, u) { const d = spec(u); return d ? d.atk : 1; },
  attackElement(engine, u) { const d = spec(u); return d ? d.el : null; },
  attackSound(u) { const d = spec(u); return d ? d.sound : null; },
  attackStyle(u) { const d = spec(u); return d ? d.style : null; }, // ท่าตีบนกระดาน (client aizenFx.js strikeFx)
  strikeRect(u) { const d = spec(u); return d && d.rect ? d.rect : null; },
  strikeCone(u) { const d = spec(u); return d && d.cone ? d.cone : 0; },
  strikeAllows(u, t) { return aizen().shapeAllows(eng(), u, t); },
  smashes(u) { return !!spec(u); }, // ตัว 3×3 เดินพังสิ่งกีดขวางได้ (กติกาตัวใหญ่ — action.smashes)
  onStrikeLanded(engine, u, t, { counter } = {}) { if (!counter) aizen().strikeLanded(engine, u, t); return null; },
  afterBoardAttack(engine, u, target) { return aizen().afterAttack(engine, u, target); },
  aizenState(engine, u) { const k = aizen().kindOf(u); return k ? { kaiju: k, standee: aizen().KAIJU[k].img } : undefined; },
  severables() { return []; },
};
