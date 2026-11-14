// Road Trip — การ์ดข้อมูลมอน (คลิกมอนบนกระดาน → StatusModal ใน Game.jsx · ชี้มอน → ป้ายช่อง BoardStage แบบสนาม Eos)
//  ข้อมูลจาก state.players[].summon (server/view.js rtMobView: side "rtmob" · mobType · rtMob { atk, mov, role, elite, boss, phase, enraged, decoy, gold })
//  ความสามารถ/บทบาท/ระยะบอส = rtGuideData.js (ป้ายสั้น · คำอธิบายตอนชี้)
import { RT_MOBS, RT_ROLES, RT_ELITE_INFO, RT_BOSS_PHASES, RT_BOSS_MOVES, mobTraits, mobImg } from "./rtGuideData";
import { tip } from "./rtTip";
import "./rtGuide.css";

export const isRtMobUnit = (p) => !!(p && p.summon && p.summon.side === "rtmob");
// ชนิดมอน: summon.mobType (view.js) → สำรองจากชื่อไฟล์ภาพ (ไม่ import mobArt.js — ลำดับโหลดโมดูลกระดานวนกัน)
const rtMobTypeOf = (p) => {
  const t = p && p.summon && p.summon.mobType;
  if (t && RT_MOBS[t]) return t;
  const m = p && typeof p.img === "string" && p.img.match(/roadtrip\/mobs\/([A-Za-z]+)\./);
  return m && RT_MOBS[m[1]] ? m[1] : "stray";
};

// ป้ายบนตัวมอน: [{ key, icon, label, desc }]
export function rtMobTags(p) {
  const s = (p && p.summon) || {}, m = s.rtMob || {};
  const type = s.mobType || rtMobTypeOf(p);
  const out = [];
  if (m.boss) {
    const ph = RT_BOSS_PHASES.find((x) => x.n === (m.phase || 1)) || RT_BOSS_PHASES[0];
    out.push({ key: "phase", icon: m.enraged ? "🔥" : "👑", label: ph.label, desc: ph.desc });
  }
  if (m.elite) out.push({ key: "elite", ...RT_ELITE_INFO });
  if (m.decoy) out.push({ key: "decoy", icon: "🌑", label: "ตัวล่อ", desc: "เงาของอัศวิน — ไม่มีเหรียญ" });
  if (m.role && RT_ROLES[m.role]) out.push({ key: "role", ...RT_ROLES[m.role] });
  for (const t of mobTraits(type)) if (!(t.key === "boss" && m.decoy)) out.push(t);
  return out;
}

// ป้ายช่องตอนชี้ (BoardStage tileInfo) — รูปแบบเดียวกับมอนสนาม Eos { icon, name, stats, tags, desc }
export function rtMobTileInfo(players, x, y) {
  const p = (players || []).find((u) => isRtMobUnit(u) && u.alive && u.pos && u.pos.x === x && u.pos.y === y);
  if (!p) return null;
  const m = p.summon.rtMob || {}, type = p.summon.mobType || rtMobTypeOf(p), b = RT_MOBS[type] || {};
  const tags = rtMobTags(p);
  return {
    icon: b.icon || "👾", name: p.name,
    stats: { atk: m.atk ?? null, hp: p.hp ?? 0, maxHp: p.maxHp ?? 0, armor: p.armor ?? 0, maxArmor: p.maxArmor ?? 0 },
    tags: tags.map((t) => `${t.icon} ${t.label}`),
    desc: m.mov != null ? `เดิน ${m.mov}${m.gold ? ` · ล้ม = 🪙 ${m.gold}` : ""}` : "",
  };
}

export default function RtMobInfo({ p }) {
  const s = p.summon || {}, m = s.rtMob || {};
  const type = s.mobType || rtMobTypeOf(p);
  const b = RT_MOBS[type] || {};
  const tags = rtMobTags(p);
  const moves = m.boss ? (RT_BOSS_MOVES[type] || []) : [];
  return (
    <div className="rtg-mob rt-ui">
      <div className="rtg-mob-top">
        <span className="rtg-mob-art"><img src={p.img || mobImg(type)} alt="" draggable="false" /></span>
        <div className="rtg-mob-stats">
          <span {...tip("พลังโจมตี")}><i>⚔</i><b>{m.atk ?? "?"}</b></span>
          <span {...tip("พลังชีวิต")}><i>♥</i><b>{p.hp ?? 0}</b><small>/{p.maxHp ?? 0}</small></span>
          <span {...tip("เกราะ")}><i>⛨</i><b>{p.armor ?? 0}</b>{(p.maxArmor ?? 0) > 0 && <small>/{p.maxArmor}</small>}</span>
          <span {...tip("ระยะเดิน")}><i>👣</i><b>{m.mov ?? b.mov ?? "?"}</b></span>
          {m.gold > 0 && <span {...tip("เหรียญของคนที่ล้มมัน")}><i className="rt-coin s" /><b>{m.gold}</b></span>}
        </div>
      </div>
      {tags.length > 0 && (
        <div className="rtg-tags">
          {tags.map((t) => <span key={t.key} className="rtg-tag" data-k={t.key} {...tip(t.desc, t.label)}><span aria-hidden="true">{t.icon}</span>{t.label}</span>)}
        </div>
      )}
      {moves.length > 0 && (
        <ul className="rtg-moves">
          {moves.map((mv) => (
            <li key={mv.name} data-locked={mv.ph > (m.phase || 1) ? "true" : undefined}><b>{mv.name}</b><span>{mv.desc}</span></li>
          ))}
        </ul>
      )}
    </div>
  );
}
