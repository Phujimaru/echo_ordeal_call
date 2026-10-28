// เฉพาะ dev: หน้าดูกระดาน ?board=1&ohger=1 — ปุ่มเล่นเอฟเฟกต์ Ohger Finish ของคิงโอเจอร์ (ohgerFx.js) โดยไม่ต้องเปิดห้องจริง
//  มุยมิ (me) ยืนที่ (7, 6) · เหตุการณ์ = รูปแบบเดียวกับ socket "ohgerFx" ของ server (พาพิยอง from = ช่องปลายทาง แบบ server)
//  ภาพนิ่ง: ?ohshot=1 + await window.__ohShot("ชื่อปุ่ม", ms) · คอนโซล: window.__ohgerFx({ kind: "slash", color, from, tiles, dir })
import { useEffect } from "react";
import { OHGER_FX, ohgerEventFx } from "./ohgerFx";
import { STYLE_HIT } from "./boardDraw";

const ME = { x: 7, y: 6 };
const COLOR = { kuwagata: "#e23b3b", tonbo: "#3b78ff", kamakiri: "#f2c21b", papiyon: "#a54ae8", hachi: "#c9ced8" };
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
function ohgerUnits(list) {
  const at = { me: [ME.x, ME.y], p2: [8, 6], p4: [9, 3], p3: [10, 6], p5: [12, 6], p6: [2, 6] };
  return list.map((u) => (u.id === "me" ? { ...u, x: ME.x, y: ME.y, name: "คิงโอเจอร์", color: "#e23b3b", tag: null }
    : at[u.id] ? { ...u, x: at[u.id][0], y: at[u.id][1] } : u));
}
// พื้นที่ "line" len × width ตามทิศ (แบบ engine.areaTiles โดยประมาณ)
function lineTiles(from, dir, len, width) {
  const [dx, dy] = DIRS[dir], sx = -dy, sy = dx, lo = -Math.floor((width - 1) / 2), out = [];
  for (let i = 1; i <= len; i++) for (let j = lo; j < lo + width; j++) out.push({ x: from.x + dx * i + sx * j, y: from.y + dy * i + sy * j });
  return out;
}
if (typeof window !== "undefined" && /[?&]ohshot=1/.test(location.search)) {
  const orig = window.requestAnimationFrame.bind(window);
  let last = null, freezeAt = null;
  const clock = (t) => (freezeAt != null ? Math.min(t, freezeAt) : t);
  window.requestAnimationFrame = (cb) => { last = cb; return orig((t) => cb(clock(t))); };
  const tick = () => new Promise((r) => setTimeout(r, 40));
  window.__ohShot = async (label, ms) => {
    const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === label);
    if (!b) return "no button";
    const c = performance.now() + 16;
    freezeAt = c + (Number(ms) || 0);
    b.click();
    await tick();
    if (last) last(c);
    await tick();
    if (last) last(freezeAt);
    return "ok";
  };
  window.__ohUnfreeze = () => { freezeAt = null; };
}
const CUR = { units: [] };
const btn = { font: "500 13px Kanit, sans-serif", color: "#fff", cursor: "pointer", padding: "4px 9px", border: "1px solid rgba(255,214,120,.6)", background: "rgba(24,18,30,.94)" };

export default function OhgerFxDev({ units, setUnits, pushFx, setFocus, setAnim, setCinema }) {
  useEffect(() => { CUR.units = units; });
  const get = (id) => CUR.units.find((u) => u.id === id);
  const me = () => { const d = get("me"); return { x: d.x, y: d.y }; };
  const idsOn = (tiles, self) => CUR.units.filter((u) => u.id !== self && tiles.some((t) => t.x === u.x && t.y === u.y)).map((u) => u.id);
  const play = (ev) => {
    const out = ohgerEventFx({ id: "me", ...ev }, { idsOn });
    if (!out.fx.length) return;
    pushFx(out.fx);
    if (out.look) setFocus(out.look);
    for (const ms of out.shake) setTimeout(() => pushFx([{ kind: "iceShake", x: 0, y: 0, amp: 6, dur: 400 }]), ms);
  };
  useEffect(() => { window.__ohgerFx = (ev) => play(ev); return () => { delete window.__ohgerFx; }; });
  const reset = () => setUnits((us) => ohgerUnits(us));
  const slash = (form, w) => { const f = me(); play({ kind: "slash", form, color: COLOR[form], from: f, dir: "up", tiles: lineTiles(f, "up", 4, w) }); };
  const tonbo = () => {
    const f = me(), line = lineTiles(f, "right", 6, 1);
    setAnim({ kind: "move", id: "me", path: [f, ...line, ...line.slice(0, -1).reverse(), f], stepMs: OHGER_FX.dashStep });
    play({ kind: "dash", form: "tonbo", color: COLOR.tonbo, from: f, dir: "right", tiles: line });
  };
  const papiyon = () => {
    const f = me(), path = [f];
    for (let i = 1; i <= 4; i++) path.push({ x: f.x - i, y: f.y });
    const end = path[path.length - 1], t = get("p6");
    setAnim({ kind: "move", id: "me", path, stepMs: OHGER_FX.dashStep });
    setTimeout(() => setUnits((us) => us.map((u) => (u.id === "me" ? { ...u, x: end.x, y: end.y } : u))), (path.length - 1) * OHGER_FX.dashStep + 30);
    play({ kind: "dash", form: "papiyon", color: COLOR.papiyon, from: end, dir: "left", tiles: path.slice(1), target: t ? { x: t.x, y: t.y } : null });
  };
  const needle = () => { const f = me(); play({ kind: "needle", form: "hachi", color: COLOR.hachi, from: f, dir: "down", tiles: lineTiles(f, "down", 5, 1) }); };
  const wave = () => { const f = me(); play({ kind: "wave", form: "kuwagata", color: COLOR.kuwagata, from: f, dir: "down", tiles: lineTiles(f, "down", 4, 1) }); };
  // ตีปกติร่างสวมเกราะ (ohAtk1–5) — fx แบบเดียวกับ BoardStage + lunge เมื่อห่าง ≤ 2
  const strike = (n, dodge = false) => {
    const d = me(), f = get("p2");
    if (!f) return;
    const style = `ohAtk${n}`, color = [COLOR.kuwagata, COLOR.tonbo, COLOR.kamakiri, COLOR.papiyon, COLOR.hachi][n - 1];
    pushFx([{ kind: style, x: d.x, y: d.y, size: 1, to: { x: f.x, y: f.y }, toSize: 1, color, by: "me", tid: f.id, dodge }]);
    if (Math.abs(d.x - f.x) + Math.abs(d.y - f.y) <= 2) setAnim({ kind: "lunge", id: "me", from: d, to: { x: f.x, y: f.y }, hitId: f.id });
    setFocus({ x: f.x, y: f.y });
    if (setCinema) { setCinema({ a: d, b: { x: f.x, y: f.y }, z: 3 }); setTimeout(() => setCinema(null), 1400); }
    setTimeout(() => pushFx([...(dodge ? [{ kind: "slash", x: f.x, y: f.y, color }] : []), { kind: "float", x: f.x, y: f.y, text: dodge ? "หลบ" : "-2", size: 30, z: 1.5 }]), STYLE_HIT[style] || 385);
  };
  const rows = [
    [["ตี 1", () => strike(1)], ["ตี 2", () => strike(2)], ["ตี 3", () => strike(3)], ["ตี 4", () => strike(4)], ["ตี 5", () => strike(5)], ["หลบ 1", () => strike(1, true)], ["หลบ 5", () => strike(5, true)]],
    [["คุวากาตะ", () => slash("kuwagata", 4)], ["คามาคิริ", () => slash("kamakiri", 5)], ["ทอมโบ", tonbo], ["พาพิยอง", papiyon], ["ฮาจิ", needle], ["คลื่นดาบ", wave], ["กลับที่", reset]],
  ];
  return (
    <div style={{ position: "absolute", right: 12, bottom: 12, display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {r.map(([label, fn]) => <button key={label} style={btn} onClick={fn}>{label}</button>)}
        </div>
      ))}
    </div>
  );
}
OhgerFxDev.units = ohgerUnits; // BoardPreview ใช้ตอนสร้างตัวละครจำลอง
