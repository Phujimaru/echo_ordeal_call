// เฉพาะ dev: หน้าดูกระดาน ?board=1&kazuma=1 — ปุ่มเล่นเอฟเฟกต์ของเคนซากิ คาซุมะ (kazumaFx.js) โดยไม่ต้องเปิดห้องจริง
//  มุยมิ (me) กลายเป็นคาซุมะ · เป้าจำลอง: ห่าง 1 (ขวา) / ห่าง 2 (ล่าง) / ห่าง 3 (บน — แนวพุ่ง Lightning Sonic)
//  ตีปกติ = fx แบบเดียวกับ BoardStage (lunge เมื่อห่าง ≤ 2 สำหรับดาบ/หมัด) · เสียง kazuma_atk_* ตรงจังหวะปะทะ (STYLE_HIT)
//  ภาพนิ่ง: ?kzshot=1 + window.__kzShot (ด้านล่าง) · คอนโซล: window.__kazumaFx({ kind: "metal", id: "me", at: { x, y } })
import { useEffect } from "react";
import { KAZUMA_FX, kazumaEventFx, kazumaSonicDur } from "./kazumaFx";
import { STYLE_HIT } from "./boardDraw";
import { playSfx } from "../audio";

const IMG = "/characters/kensaki_kazuma/kazuma_blade.webp";
function kazumaUnits(list) {
  const at = { me: [4, 8], p2: [5, 8], p4: [4, 10], p6: [4, 5] };
  return list.map((u) => (u.id === "me" ? { ...u, x: 4, y: 8, name: "เคนซากิ คาซุมะ", img: IMG, color: "#2b4fa8", hp: 7, maxHp: 7, armor: 3, maxArmor: 3, tag: null }
    : at[u.id] ? { ...u, x: at[u.id][0], y: at[u.id][1] } : u));
}
const CUR = { units: [] };
// ภาพนิ่งสำหรับตรวจ (แท็บพื้นหลัง/headless ไม่เรียกเฟรม): ?board=1&kazuma=1&kzshot=1 แล้วเรียก await window.__kzShot("ชื่อปุ่ม", ms) จากคอนโซล
//  = กดปุ่ม แล้วเดินเฟรมเอง (ลงทะเบียน t0 แล้ววาดที่ ms หลังกด) · ดักตั้งแต่โหลดโมดูล (ก่อน BoardCanvas เริ่มลูป)
if (typeof window !== "undefined" && /[?&]kzshot=1/.test(location.search)) {
  const orig = window.requestAnimationFrame.bind(window);
  let last = null, freezeAt = null;
  const clock = (t) => (freezeAt != null ? Math.min(t, freezeAt) : t);
  window.requestAnimationFrame = (cb) => { last = cb; return orig((t) => cb(clock(t))); };
  const tick = () => new Promise((r) => setTimeout(r, 40));
  window.__kzShot = async (label, ms) => {
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
  window.__kzUnfreeze = () => { freezeAt = null; };
}
const SFX = { henshin: "kazuma_henshin_fx", unhenshin: "kazuma_unhenshin", rouze: "kazuma_rouze", metal: "kazuma_metal", heal: "kazuma_heal" };
const btn = { font: "500 13px Kanit, sans-serif", color: "#fff", cursor: "pointer", padding: "4px 9px", border: "1px solid rgba(150,220,255,.6)", background: "rgba(18,24,40,.94)" };

export default function KazumaFxDev({ units, setUnits, pushFx, setFocus, setAnim, cinema, setCinema }) {
  useEffect(() => { CUR.units = units; });
  const get = (id) => CUR.units.find((u) => u.id === id);
  const me = () => { const d = get("me"); return { x: d.x, y: d.y }; };
  const ctx = { posOf: (id) => { const u = get(id); return u ? { x: u.x, y: u.y } : null; }, sizeOf: (id) => (get(id) || {}).size || 1 };
  const play = (ev, sfx) => {
    const out = kazumaEventFx({ id: "me", color: "#2b4fa8", size: 1, at: me(), ...ev }, ctx);
    if (out.fx.length) pushFx(out.fx.map((f) => (f.kind === "float" ? { ...f, z: 1.5 } : f)));
    for (const [ms, list] of out.later) setTimeout(() => pushFx(list.map((f) => (f.kind === "float" ? { ...f, z: 1.5 } : f))), ms);
    for (const ms of out.shake) setTimeout(() => pushFx([{ kind: "iceShake", x: 0, y: 0, amp: 7, dur: 600 }]), ms);
    for (const [pos, ms] of out.look) setTimeout(() => setFocus(pos), ms);
    const s = sfx === undefined ? SFX[ev.kind] : sfx;
    if (s) playSfx(s);
  };
  useEffect(() => { window.__kazumaFx = (ev) => play(ev); return () => { delete window.__kazumaFx; }; });
  const tilesBox = (c, r) => { const out = []; for (let y = c.y - r; y <= c.y + r; y++) for (let x = c.x - r; x <= c.x + r; x++) out.push({ x, y }); return out; };
  const strike = (style, foeId, { lane = null, dodge = false } = {}) => {
    const d = me(), f = get(foeId);
    if (!f) return;
    const near = Math.abs(d.x - f.x) + Math.abs(d.y - f.y) <= 2;
    pushFx([{ kind: style, x: d.x, y: d.y, size: 1, to: { x: f.x, y: f.y }, toSize: f.size || 1, color: "#2b4fa8", lane, by: "me", dodge }]);
    if ((style === "kazumaBlade" || style === "kazumaPunch") && near) setAnim({ kind: "lunge", id: "me", from: d, to: { x: f.x, y: f.y }, hitId: f.id });
    setFocus({ x: f.x, y: f.y });
    const key = { kazumaBlade: "blade", kazumaPunch: "punch", kazumaBlast: "blast", kazumaSlash: "slash" }[style];
    setTimeout(() => {
      playSfx(`kazuma_atk_${key}`);
      pushFx([{ kind: "float", x: f.x, y: f.y, text: dodge ? "หลบ" : "-2", size: 30, z: 1.5 }, { kind: "iceShake", x: 0, y: 0, amp: 5, dur: 300 }]);
    }, STYLE_HIT[style] || 400);
  };
  const slashLine = () => { const d = me(); return [1, 2, 3].map((k) => ({ x: d.x + k, y: d.y })); };
  const sonic = () => {
    const d = me(), f = get("p6");
    const path = [d];
    for (let y = d.y - 1; y > f.y; y--) path.push({ x: d.x, y });
    play({ kind: "sonicDash", from: d, path, dir: "up" }, "kazuma_sonic_dash");
    pushFx([{ kind: "kazumaSonic", path, step: KAZUMA_FX.dashStep, size: 1, by: "me", dur: kazumaSonicDur(path) }]);
    setAnim({ kind: "move", id: "me", path, stepMs: KAZUMA_FX.dashStep });
    const end = path[path.length - 1], run = (path.length - 1) * KAZUMA_FX.dashStep;
    setTimeout(() => setUnits((us) => us.map((u) => (u.id === "me" ? { ...u, x: end.x, y: end.y } : u))), run + 30);
    setTimeout(() => { play({ kind: "sonicHit", targetId: f.id, to: { x: f.x, y: f.y }, dmg: 4, side: [] }, "kazuma_sonic_hit"); }, run + 700);
  };
  const reset = () => setUnits((us) => kazumaUnits(us));
  const rows = [
    [["ดาบ 1", () => strike("kazumaBlade", "p2")], ["ดาบ 2", () => strike("kazumaBlade", "p4")], ["ดาบ 3", () => strike("kazumaBlade", "p6")], ["ดาบ BEAT", () => strike("kazumaBlade", "p2", { lane: tilesBox({ x: 5, y: 8 }, 1) })], ["ดาบหลบ", () => strike("kazumaBlade", "p2", { dodge: true })]],
    [["หมัด 1", () => strike("kazumaPunch", "p2")], ["หมัด 2", () => strike("kazumaPunch", "p4")], ["หมัด BEAT", () => strike("kazumaPunch", "p4", { lane: tilesBox({ x: 4, y: 10 }, 1) })]],
    [["Blast", () => strike("kazumaBlast", "p6")], ["Blast กรอบ", () => strike("kazumaBlast", "p6", { lane: tilesBox({ x: 4, y: 5 }, 1) })], ["Slash", () => strike("kazumaSlash", "p2", { lane: slashLine() })], ["Sonic", sonic], ["กลับที่", reset], [cinema ? "ซูม ✓" : "ซูม", () => setCinema(cinema ? null : { a: { x: 4, y: 6 }, b: { x: 4, y: 9 }, z: 3.2 })]],
    [["แปลงร่าง", () => play({ kind: "henshin" })], ["คลายร่าง", () => play({ kind: "unhenshin" })], ["การ์ด", () => play({ kind: "card", card: "thunder" }, "kazuma_card_thunder")], ["การ์ดครบ", () => play({ kind: "card", card: "kick", combo: "blast" }, "kazuma_card_kick")],
      ["Rouze", () => play({ kind: "rouze", cards: { slash: 1 } })], ["Rouze Lightning", () => play({ kind: "rouze", combo: "blast", cards: { kick: 1, thunder: 1 } }, "kazuma_lightning_blast")], ["METAL", () => play({ kind: "metal" })], ["ฟื้น", () => play({ kind: "heal", amount: 2 })]],
  ];
  return (
    <div style={{ position: "absolute", right: 12, bottom: 12, display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", maxWidth: 900 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {r.map(([label, fn]) => <button key={label} style={btn} onClick={fn}>{label}</button>)}
        </div>
      ))}
    </div>
  );
}
KazumaFxDev.units = kazumaUnits; // BoardPreview ใช้ตอนสร้างตัวละครจำลอง
