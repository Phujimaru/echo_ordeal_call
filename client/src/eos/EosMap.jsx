// ============================================================
//  แผนที่ภาพรวมของสนาม Eos (ผู้ใช้สั่ง 2026-11-09 — กล้องอยู่ใกล้ตัวผู้เล่น เลยต้องมีแผนที่ให้กดดู)
//  เปิดจากปุ่มแผนที่ใต้แท็บกองการ์ด (Game.jsx) · มองจากด้านบน 32×32 · ชื่อโซน + ไอคอน/จุดสีเท่านั้น (ไม่มีข้อความอธิบาย)
//  จุด: ตัวเรา (วงขาว) · ผู้เล่นที่มองเห็น (สีผู้เล่น) · เสา (สีเจ้าของ) · รถ · โชโกโบะ · ปีศาจ/ศัตรู AI · ยานลงจอด
//  กดที่ไหนก็ได้ / Esc = ปิด
// ============================================================
import { useEffect, useRef } from "react";

const TERRAIN_COLOR = {
  fd_eos_bldg: "#8d97a5", fd_eos_wall: "#a59a85", fd_eos_lamp: "#6e7480", fd_eos_tree: "#3f6a2a", fd_eos_rock: "#8a7058",
  fd_eos_water: "#2f6f9a", fd_eos_canal: "#2d7f8f", fd_eos_pump: "#c63b2b", fd_eos_garage: "#9a8f7a", fd_eos_pillar: "#8fdcff",
  fd_eos_lever: "#c9b98f", fd_eos_domecore: "#9fe2ff", fd_eos_switch: "#7bd36a", fd_eos_turret: "#6b6f78",
};
const SPECIAL_COLOR = {
  fd_eos_road: "#55565b", fd_eos_plaza: "#b9b2a2", fd_eos_sand: "#d9b97c", fd_eos_bridge: "#8a6a46", fd_eos_stable: "#c9a95a",
  fd_eos_forest: "#4b6a33", fd_eos_shallow: "#5aa7b8", ice: "#cfeaff",
};
const GRASS = "#7c8f4c";
const ZONES = [
  { name: "Insomnia", x: 15.5, y: 4 }, { name: "Cleigne", x: 6.5, y: 15 }, { name: "Duscae", x: 21, y: 15.5 },
  { name: "Leide", x: 22, y: 27 }, { name: "Hammerhead", x: 28, y: 29.5 }, { name: "Altissia", x: 6, y: 28.5 },
];

export default function EosMap({ state, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  useEffect(() => {
    const cv = ref.current, b = state && state.board;
    if (!cv || !b) return;
    const cols = b.cols || 32, rows = b.rows || 32;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = cv.clientWidth || 600, T = size / Math.max(cols, rows);
    cv.width = size * dpr; cv.height = size * dpr;
    const g = cv.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = GRASS; g.fillRect(0, 0, size, size);
    const terr = b.terrain || {}, spec = b.special || {};
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const k = `${x},${y}`, col = TERRAIN_COLOR[terr[k]] || SPECIAL_COLOR[spec[k]];
      if (!col) continue;
      g.fillStyle = col; g.fillRect(x * T, y * T, T + 0.5, T + 0.5);
    }
    const fd = state.fodlan && state.fodlan.board;
    const dot = (x, y, r, fill, stroke) => {
      g.beginPath(); g.arc((x + 0.5) * T, (y + 0.5) * T, r * T, 0, Math.PI * 2);
      g.fillStyle = fill; g.fill();
      if (stroke) { g.lineWidth = Math.max(1.5, T * 0.12); g.strokeStyle = stroke; g.stroke(); }
    };
    if (fd) {
      for (const pl of fd.pillars || []) {
        const cx = (pl.x + 0.5) * T, cy = (pl.y + 0.5) * T, r = T * 0.62;
        g.beginPath(); g.moveTo(cx, cy - r); g.lineTo(cx + r * 0.7, cy); g.lineTo(cx, cy + r); g.lineTo(cx - r * 0.7, cy); g.closePath();
        g.fillStyle = pl.color || "#8fdcff"; g.fill(); g.lineWidth = 1.5; g.strokeStyle = "#fff"; g.stroke();
      }
      for (const c of fd.cars || []) { g.fillStyle = c.img === 1 ? "#f2c21b" : c.img === 2 ? "#d8321e" : "#9da2a8"; g.fillRect(c.x * T + 2, c.y * T + 2, T * 2 - 4, T * 2 - 4); }
      for (const c of fd.chocos || []) if (c.x != null && !c.rider) dot(c.x, c.y, 0.32, "#ffd23a");
      for (const d of fd.daemons || []) dot(d.x, d.y, 0.34, "#7a1f6e", "#2a0626");
      for (const m of fd.mobs || []) dot(m.x, m.y, m.type === "beast" ? 0.45 : 0.32, m.type === "beast" ? "#6b3f7a" : "#9aa0a8", "#1b1b22");
      for (const w of fd.wrecks || []) { g.fillStyle = "#6b4a32"; g.fillRect(w.x * T + 3, w.y * T + 3, T - 6, T - 6); }
      // PVE รอบสอง: ยานทุกลำ · หีบ · ภารกิจ · ขบวนเสบียง (เส้นทาง) · ดวงวิญญาณ · บอส/วงเวท
      for (const d of fd.ships || []) { g.strokeStyle = d.state === "warn" ? "#ff3b3b" : "#9aa0a8"; g.lineWidth = 2; g.setLineDash(d.state === "warn" ? [4, 3] : []); g.strokeRect(d.x * T, d.y * T, T * 2, T * 2); g.setLineDash([]); }
      for (const c of fd.chests || []) { g.fillStyle = "#e0a63a"; g.fillRect(c.x * T + T * 0.2, c.y * T + T * 0.3, T * 0.6, T * 0.45); g.strokeStyle = "#5a3313"; g.lineWidth = 1; g.strokeRect(c.x * T + T * 0.2, c.y * T + T * 0.3, T * 0.6, T * 0.45); }
      for (const q of fd.quests || []) {
        if (q.type === "hunt" && q.rect) { g.strokeStyle = "rgba(255,190,80,.9)"; g.lineWidth = 2; g.setLineDash([6, 4]); g.strokeRect(q.rect[0] * T, q.rect[1] * T, (q.rect[2] - q.rect[0] + 1) * T, (q.rect[3] - q.rect[1] + 1) * T); g.setLineDash([]); }
        else dot(q.x, q.y, 0.4, "#ffe08a", "#7a5a10");
      }
      if (fd.convoy) {
        g.strokeStyle = "rgba(255,210,110,.9)"; g.lineWidth = 2; g.setLineDash([3, 4]); g.beginPath();
        (fd.convoy.path || []).forEach((p, i) => (i ? g.lineTo((p.x + 0.5) * T, (p.y + 0.5) * T) : g.moveTo((p.x + 0.5) * T, (p.y + 0.5) * T))); g.stroke(); g.setLineDash([]);
        g.fillStyle = "#e0a63a"; g.fillRect(fd.convoy.x * T + 2, fd.convoy.y * T + 2, T - 4, T - 4); g.strokeStyle = "#fff"; g.lineWidth = 1.5; g.strokeRect(fd.convoy.x * T + 2, fd.convoy.y * T + 2, T - 4, T - 4);
      }
      for (const sp of fd.spirits || []) dot(sp.x, sp.y, 0.3, "#9fd8ff", "#1b3a5a");
      if (fd.bossWarn) { g.strokeStyle = "#ff2a4a"; g.lineWidth = 3; g.beginPath(); g.arc((fd.bossWarn.x + 0.5) * T, (fd.bossWarn.y + 0.5) * T, T * 0.9, 0, Math.PI * 2); g.stroke(); }
      const boss = fd.boss && (fd.daemons || []).find((d) => d.id === fd.boss);
      if (boss) dot(boss.x, boss.y, 0.7, "#c21f4a", "#ffd34a");
    }
    // ผู้เล่นที่มองเห็น (state.players ส่งมาเฉพาะคนที่เรามองเห็น) · ตัวเราวงขาว
    for (const p of state.players || []) {
      if (!p.alive || !p.pos || (p.summon && !p.duoOf)) continue;
      const mine = p.id === state.youId;
      dot(p.pos.x, p.pos.y, mine ? 0.5 : 0.42, p.color || "#e05a8a", mine ? "#ffffff" : "#1b1b22");
    }
    // ชื่อโซน
    g.font = `600 ${Math.max(11, T * 0.62) | 0}px "Chakra Petch","Kanit",sans-serif`;
    g.textAlign = "center"; g.textBaseline = "middle";
    for (const z of ZONES) {
      g.lineWidth = 3; g.strokeStyle = "rgba(10,16,28,.65)"; g.strokeText(z.name, z.x * T, z.y * T);
      g.fillStyle = "#ffffff"; g.fillText(z.name, z.x * T, z.y * T);
    }
  }, [state]);
  return (
    <div className="eos-map" role="dialog" aria-label="แผนที่" onClick={onClose}>
      <canvas ref={ref} className="eos-map-canvas" />
    </div>
  );
}
