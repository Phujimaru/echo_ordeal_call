// เฉพาะ dev: หน้าดูกระดาน ?board=1&emiya=1 — ปุ่มเล่นเอฟเฟกต์ของเอมิยะ ชิโร่ (emiyaFx.js) โดยไม่ต้องเปิดห้องจริง
//  มุยมิ (me) กลายเป็นชิโร่ — ปุ่มสร้าง payload แบบเดียวกับ server (contract §3) แล้วผ่าน emiyaEventFx เหมือน BoardStage
//  ตีปกติ 5 อาวุธ = attackStyle emiya* ไปหาศัตรูใกล้สุด (Nine Lives = กรอบ 2×3 · Excalibur = แนว 3×1) · เสียง emiya_atk_* ตรงจังหวะปะทะ
//  ของค้าง (prop emiya): อาวุธที่ถือ (ปุ่มอาวุธ) · โลก UBW (ปุ่ม UBW)
//  ภาพนิ่ง: ?shot=ชื่อปุ่ม@ms[&pre=ปุ่ม,ปุ่ม] (แบบ TakutoFxDev)
//  คอนโซล: window.__emiyaFx({ kind: "smash", id: "me", at: { x, y }, dir: "right", tiles }) = ส่ง payload ของ socket "emiyaFx" ตรงๆ
import { useEffect } from "react";
import { EMIYA_REPEAT_MS, emiyaEventFx } from "./emiyaFx";
import { STYLE_HIT } from "./boardDraw";
import { playSfx } from "../audio";

const IMG = "/characters/emiya_shirou/emiya.webp";
function emiyaUnits(list) {
  return list.map((u) => (u.id === "me" ? { ...u, x: 5, y: 7, name: "เอมิยะ ชิโร่", img: IMG, color: "#c4452d", hp: 7, maxHp: 7, armor: 3, maxArmor: 3, tag: null } : u));
}
const CUR = { units: [] };
const DIR4 = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const SFX = {
  trace: "emiya_trace", weaponBreak: "emiya_break", capacity: "emiya_capacity", avalon: "emiya_avalon", throw: "emiya_throw", caladbolg: "emiya_caladbolg_shot",
  caladbolgBlast: "emiya_caladbolg_blast", smash: "emiya_smash", rho: "emiya_rho", excalibur: "emiya_excalibur", ubw: "emiya_ubw", stun: "emiya_stun",
};
const STYLE = { kb: "emiyaKB", hrunting: "emiyaBow", rule: "emiyaRule", nine: "emiyaNine", excalibur: "emiyaExcal" };
const btn = (on) => ({ font: "500 13px Kanit, sans-serif", color: "#fff", cursor: "pointer", padding: "4px 9px", border: `1px solid ${on ? "#ffd36a" : "rgba(95,227,255,.6)"}`, background: on ? "rgba(120,50,20,.95)" : "rgba(18,24,34,.94)" });
const inBody = (u, x, y) => x >= u.x && y >= u.y && x < u.x + (u.size || 1) && y < u.y + (u.size || 1);

export default function EmiyaFxDev({ units, pushFx, setFocus, map, em, setEm }) {
  useEffect(() => { CUR.units = units; });
  const get = (id) => CUR.units.find((u) => u.id === id);
  const inB = (x, y) => x >= 0 && y >= 0 && x < map.cols && y < map.rows;
  const T = () => get("me");
  const me = () => { const d = T(); return { x: d.x, y: d.y }; };
  const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  const foes = () => { const d = T(); return CUR.units.filter((u) => u.id !== "me").sort((a, b) => dist(a, d) - dist(b, d)); };
  const ctx = { posOf: (id) => { const u = get(id); return u ? { x: u.x, y: u.y } : null; }, sizeOf: (id) => (get(id) || {}).size || 1 };
  const play = (ev, sfx) => {
    const out = emiyaEventFx({ id: "me", color: "#c4452d", size: 1, at: me(), ...ev }, ctx);
    if (out.fx.length) pushFx(out.fx.map((f) => (f.kind === "float" ? { ...f, z: 1.5 } : f)));
    for (const [ms, list] of out.later) setTimeout(() => pushFx(list.map((f) => (f.kind === "float" ? { ...f, z: 1.5 } : f))), ms);
    for (const ms of out.shake) setTimeout(() => pushFx([{ kind: "iceShake", x: 0, y: 0, amp: 7, dur: 600 }]), ms);
    for (const [pos, ms] of out.look) setTimeout(() => setFocus(pos), ms);
    const s = sfx === undefined ? SFX[ev.kind] : sfx;
    if (s) playSfx(s);
  };
  useEffect(() => { window.__emiyaFx = (ev) => play(ev); return () => { delete window.__emiyaFx; }; });
  // ภาพนิ่งสำหรับตรวจ (headless): ?shot=ชื่อปุ่ม@ms[&pre=ปุ่ม,ปุ่ม] — กดปุ่ม pre ก่อน แล้วกดปุ่ม shot และหยุดเวลาของกระดานที่ ms หลังกด
  useEffect(() => {
    const q = new URLSearchParams(location.search), shot = q.get("shot");
    if (!shot) return undefined;
    const [label, ms] = shot.split("@");
    const orig = window.requestAnimationFrame;
    const diag = document.createElement("div");
    diag.style.cssText = "position:fixed;left:8px;top:8px;z-index:99;color:#fff;background:#000a;font:12px monospace;padding:2px 6px";
    document.body.appendChild(diag);
    let frames = 0, last = null;
    const clock = () => (window.__freezeAt != null ? Math.min(performance.now(), window.__freezeAt) : performance.now());
    const run = (cb, t) => { frames++; diag.textContent = `f${frames} t${Math.round(t - (window.__clickAt || 0))}`; cb(t); };
    window.requestAnimationFrame = (cb) => { last = cb; return orig(() => run(cb, clock())); };
    const click = (l) => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === l); if (b) b.click(); };
    const t1 = setTimeout(() => { for (const l of (q.get("pre") || "").split(",").filter(Boolean)) click(l); }, 1200);
    const t2 = setTimeout(() => {
      click(label);
      const c = performance.now() + 16;
      window.__clickAt = c; window.__freezeAt = c + (Number(ms) || 0);
      // headless เรียกเฟรมน้อยมาก — เดินเฟรมเอง: ลงทะเบียน t0 ที่ c แล้ววาดที่ c + ms
      setTimeout(() => { if (last) run(last, c); setTimeout(() => { if (last) run(last, window.__freezeAt); }, 30); }, 30);
    }, 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); window.requestAnimationFrame = orig; diag.remove(); };
  }, []);


  const dirTo = (f) => { const d = T(), dx = f.x - d.x, dy = f.y - d.y; return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up"; };
  const line = (dir, len, width) => {
    const d = T(), [vx, vy] = DIR4[dir], out = [], h = Math.floor(width / 2);
    for (let k = 1; k <= len; k++) for (let w = -h; w <= h; w++) {
      const x = vx ? d.x + vx * k : d.x + w, y = vy ? d.y + vy * k : d.y + w;
      if (inB(x, y)) out.push({ x, y });
    }
    return out;
  };
  const hitsOn = (tiles) => CUR.units.filter((u) => u.id !== "me" && tiles.some((t) => inBody(u, t.x, t.y)));
  const attack = (w) => {
    const d = T(), f = foes()[0];
    if (!f) return;
    const style = STYLE[w], dir = dirTo(f);
    const lane = w === "nine" ? line(dir, 2, 3) : w === "excalibur" ? line(dir, 3, 1) : null;
    setEm((s) => ({ ...s, weapon: w }));
    pushFx([{ kind: style, x: d.x, y: d.y, size: 1, to: { x: f.x, y: f.y }, toSize: f.size || 1, color: "#c4452d", lane, by: "me" }]);
    setFocus({ x: f.x, y: f.y });
    const hit = lane ? hitsOn(lane) : [f];
    setTimeout(() => {
      playSfx(`emiya_atk_${w}`);
      pushFx(hit.flatMap((u) => [{ kind: "burst", x: u.x, y: u.y, color: "#c4452d", size: u.size || 1 }, { kind: "float", x: u.x, y: u.y, text: w === "nine" || w === "excalibur" ? "-2" : "-1", size: 30, z: 1.5 }]));
      if (w === "rule") play({ kind: "ruleHit", targetId: f.id, to: { x: f.x, y: f.y } }, null);
    }, STYLE_HIT[style] || 400);
    if (w === "kb") setTimeout(() => pushFx([{ kind: "burst", x: f.x, y: f.y, color: "#c4452d" }, { kind: "float", x: f.x, y: f.y - 0.35, text: "-1", size: 30, z: 1.5 }]), (STYLE_HIT[style] || 400) + EMIYA_REPEAT_MS);
  };
  const trace = (w) => { setEm((s) => ({ ...s, weapon: w })); play({ kind: "trace", weapon: w }, w === "excalibur" ? "emiya_trace_excalibur" : "emiya_trace"); };
  const breakW = () => { const w = em.weapon; setEm((s) => ({ ...s, weapon: null })); if (w) play({ kind: "weaponBreak", weapon: w, why: "used" }); };
  const throwB = () => {
    const f = foes()[0];
    if (!f) return;
    play({ kind: "throw", targetId: f.id, to: { x: f.x, y: f.y }, tsize: 1 });
    setTimeout(() => play({ kind: "throwHit", targetId: f.id, to: { x: f.x, y: f.y }, dmg: 1, dodge: false }, null), 600);
  };
  const caladbolg = () => {
    const f = foes()[0], dir = f ? dirTo(f) : "right";
    const tiles = line(dir, 8, 1), first = hitsOn(tiles).sort((a, b) => dist(a, T()) - dist(b, T()))[0];
    const end = first ? tiles.filter((t) => dist(t, T()) <= dist(first, T())) : tiles;
    const to = first ? { x: first.x, y: first.y } : end[end.length - 1];
    play({ kind: "caladbolg", dir, tiles: end, to, targetId: first ? first.id : null, tsize: 1 });
    if (!first) return;
    setTimeout(() => {
      const blast = [];
      for (let y = first.y - 2; y <= first.y + 2; y++) for (let x = first.x - 2; x <= first.x + 2; x++) if (inB(x, y) && Math.abs(x - first.x) + Math.abs(y - first.y) <= 2) blast.push({ x, y });
      play({ kind: "caladbolgBlast", at: { x: first.x, y: first.y }, tsize: 1, radius: 2, tiles: blast, hits: [{ id: first.id, dmg: 3 }] });
      const near = hitsOn(blast).filter((u) => u.id !== first.id);
      if (near.length) play({ kind: "caladbolgSplash", hits: near.map((u) => ({ id: u.id, dmg: 1 })) }, null);
    }, 700);
  };
  const smash = () => {
    const f = foes()[0], dir = f ? dirTo(f) : "right", tiles = line(dir, 4, 3);
    play({ kind: "smash", dir, tiles });
    const hit = hitsOn(tiles);
    if (hit.length) setTimeout(() => { pushFx(hit.map((u) => ({ kind: "float", x: u.x, y: u.y, text: "-3", size: 30, z: 1.5 }))); play({ kind: "stun", ids: hit.map((u) => u.id) }); }, 750);
  };
  const excal = () => {
    const f = foes()[0], dir = f ? dirTo(f) : "right", tiles = line(dir, 5, 3);
    play({ kind: "excalibur", dir, tiles });
    const hit = hitsOn(tiles);
    setTimeout(() => play({ kind: "excaliburHit", hits: hit.map((u) => ({ id: u.id, dmg: 4 })) }, null), 1400);
  };
  const ubw = (on) => {
    setEm((s) => ({ ...s, ubw: on }));
    play({ kind: on ? "ubw" : "ubwEnd" }, on ? "emiya_ubw" : null);
  };
  const rows = [
    [["K&B", () => attack("kb")], ["Hrunting", () => attack("hrunting")], ["Rule Breaker", () => attack("rule")], ["Nine Lives", () => attack("nine")], ["Excalibur", () => attack("excalibur")]],
    [["Trace K&B", () => trace("kb")], ["Trace ธนู", () => trace("hrunting")], ["Trace Rule", () => trace("rule")], ["Trace Nine", () => trace("nine")], ["Trace Excal", () => trace("excalibur")], ["แตก", breakW]],
    [["Throwing Blade", throwB], ["Caladbolg II", caladbolg], ["Ground Smash", smash], ["Rho Aias", () => play({ kind: "rho" })], ["Ex calibruuuu!", excal]],
    [["Avalon", () => play({ kind: "avalon" })], ["ความจุ", () => play({ kind: "capacity", cap: 10 })], [`UBW ${em.ubw ? "✓" : "✗"}`, () => ubw(!em.ubw), em.ubw]],
  ];
  return (
    <div style={{ position: "absolute", right: 12, bottom: 12, display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", maxWidth: 900 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {r.map(([label, fn, on]) => <button key={label} style={btn(!!on)} onClick={fn}>{label}</button>)}
        </div>
      ))}
    </div>
  );
}
EmiyaFxDev.units = emiyaUnits; // BoardPreview ใช้ตอนสร้างตัวละครจำลอง
