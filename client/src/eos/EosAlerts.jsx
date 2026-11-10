// ============================================================
//  ประกาศเตือนของสนาม Eos (PVE รอบสอง — GRID_PLAN §8.6): การ์ดเล็กซ้ายใต้แถบบน เมื่อเกิดเรื่องที่ต้องรีบรู้
//   ยานกำลังลง · เสาโดนตี/หลุด · ราชาปีศาจกำลังมา/ลงแล้ว · พระจันทร์สีเลือด · ภารกิจใหม่/สำเร็จ · ขบวนเสบียง · หีบโผล่
//  อยู่ 4.5 วิ (ซ้อนได้ 4 ใบ) · กดการ์ด = กล้องไปที่จุดเกิดเหตุ (window "eos:look") · ชื่อ + โซน + ไอคอนเท่านั้น
//  แหล่งข้อมูล: state.fodlan.board.fx (เหตุการณ์ใหม่ = seq ที่ยังไม่เคยเห็น · เปิดหน้ามาใหม่ไม่ประกาศของเก่า)
// ============================================================
import { useEffect, useRef, useState } from "react";
import "./eosAlerts.css";

const ZN = { insomnia: "Insomnia", hammerhead: "Hammerhead", duscae: "Duscae", forest: "ป่าดัสเค", lake: "Cleigne", altissia: "Altissia", desert: "Leide" };
const ZONES = [
  ["insomnia", [8, 0, 23, 8]], ["hammerhead", [24, 24, 31, 31]], ["altissia", [0, 24, 12, 31]], ["lake", [0, 11, 12, 21]],
  ["duscae", [13, 11, 27, 21]], ["forest", [24, 0, 31, 9]], ["desert", [13, 20, 31, 31]],
];
const zoneAt = (x, y) => { const z = ZONES.find(([, r]) => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]); return z ? ZN[z[0]] : "Eos"; };
const pillarZone = (fd, id) => { const pl = (fd.pillars || []).find((o) => o.id === id); return pl ? ZN[pl.zone] || pl.zone : ""; };
function alertOf(e, fd) {
  switch (e.kind) {
    case "dropship_warn": return { icon: "🚨", title: "ยานจักรวรรดิกำลังลง", zone: zoneAt(e.x, e.y), tone: "warn" };
    case "pillar_hit": return { icon: "💢", title: `เสาโดนตี ${e.hits}/2`, zone: pillarZone(fd, e.id), tone: "danger" };
    case "pillar_lost": return { icon: "💔", title: "เสาหลุด", zone: pillarZone(fd, e.id), tone: "danger" };
    case "boss_warn": return { icon: "⚠️", title: "ราชาปีศาจกำลังมา", zone: zoneAt(e.x, e.y), tone: "danger" };
    case "boss_land": return { icon: "👑", title: "ราชาปีศาจปรากฏ", zone: zoneAt(e.x, e.y), tone: "danger" };
    case "boss_die": return { icon: "🏆", title: "โค่นราชาปีศาจ · +5", zone: "", tone: "good" };
    case "blood_moon": return { icon: "🩸", title: "คืนพระจันทร์สีเลือด", zone: "", tone: "warn" };
    case "quest_new": return { icon: e.qtype === "hunt" ? "⚔️" : "📡", title: `ภารกิจใหม่ · ${e.qtype === "hunt" ? "กวาดล้าง" : "สำรวจ"}`, zone: ZN[e.zone] || "", tone: "good" };
    case "quest_done": return { icon: "📯", title: "ภารกิจสำเร็จ · +3", zone: ZN[e.zone] || "", tone: "good" };
    case "convoy_start": return { icon: "🚚", title: "ขบวนเสบียงออกเดินทาง", zone: `${ZN[e.from] || ""} → ${ZN[e.to] || ""}`, tone: "good" };
    case "convoy_done": return { icon: "🚚", title: "ขบวนเสบียงถึงแล้ว · +6", zone: "", tone: "good" };
    case "convoy_fail": return { icon: "💥", title: "ขบวนเสบียงถูกทำลาย", zone: zoneAt(e.x, e.y), tone: "danger" };
    case "chest_spawn": return { icon: "🎁", title: `หีบสมบัติโผล่ ${(e.list || []).length} ใบ`, zone: "", tone: "good", at: (e.list || [])[0] };
    // PVE รอบสาม
    case "final_start": return { icon: "🌑", title: "คืนสุดท้าย", zone: "", tone: "danger" };
    case "giant_warn": return { icon: "🗿", title: "ยักษ์หินกำลังมา", zone: e.path && e.path[0] ? zoneAt(e.path[0].x, e.path[0].y) : "", tone: "warn", at: e.path && e.path[0] };
    case "giant_die": return { icon: "🗿", title: "ล้มยักษ์หิน · +4", zone: "", tone: "good" };
    case "nest_spawn": return { icon: "🔥", title: `รังปีศาจโผล่ ${(e.list || []).length} แห่ง`, zone: e.list && e.list[0] ? zoneAt(e.list[0].x, e.list[0].y) : "", tone: "warn", at: (e.list || [])[0] };
    case "civ_spawn": return { icon: "🕊️", title: "พลเรือนติดค้าง", zone: e.list && e.list[0] ? zoneAt(e.list[0].x, e.list[0].y) : "", tone: "good", at: (e.list || [])[0] };
    case "civ_saved": return { icon: "🕊️", title: "พาพลเรือนถึงเมือง · +2", zone: zoneAt(e.x, e.y), tone: "good" };
    case "civ_lost": return { icon: "💔", title: "พลเรือนถูกทำร้าย", zone: zoneAt(e.x, e.y), tone: "danger" };
    case "gauge_full": return { icon: "☄️", title: "มาตรวัดทีมเต็ม", zone: "", tone: "good" };
    default: return null;
  }
}
const LIFE = 4500;

export default function EosAlerts({ state }) {
  const fd = state && state.fodlan && state.fodlan.board;
  const seen = useRef(null);
  const [list, setList] = useState([]);
  useEffect(() => {
    if (!fd || !Array.isArray(fd.fx)) return;
    const maxSeq = fd.fx.reduce((m, e) => Math.max(m, e.seq || 0), 0);
    if (seen.current == null) { seen.current = maxSeq; return; } // เปิดหน้าใหม่: ไม่ประกาศของเก่า
    const fresh = fd.fx.filter((e) => e.seq > seen.current);
    seen.current = Math.max(seen.current, maxSeq);
    const add = [];
    for (const e of fresh) {
      const a = alertOf(e, fd);
      if (!a) continue;
      const at = a.at || (Number.isFinite(e.x) && Number.isFinite(e.y) ? { x: e.x, y: e.y } : null);
      add.push({ ...a, at, id: e.seq, t: Date.now() });
    }
    if (add.length) setList((l) => [...add.reverse(), ...l].slice(0, 4));
  }, [fd]);
  useEffect(() => {
    if (!list.length) return undefined;
    const id = setInterval(() => setList((l) => l.filter((a) => Date.now() - a.t < LIFE)), 500);
    return () => clearInterval(id);
  }, [list.length]);
  if (!list.length) return null;
  return (
    <div className="eos-alerts">
      {list.map((a) => (
        <button key={a.id} type="button" className="eos-alert" data-tone={a.tone} disabled={!a.at}
          onClick={() => a.at && window.dispatchEvent(new CustomEvent("eos:look", { detail: a.at }))}>
          <span className="badge" aria-hidden="true"><span className="ico">{a.icon}</span></span>
          <span className="txt"><b>{a.title}</b>{a.zone && <span className="zone">{a.zone}</span>}</span>
          {a.at && <span className="go" aria-hidden="true">›</span>}
          <i className="sweep" aria-hidden="true" />
          <i className="life" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
