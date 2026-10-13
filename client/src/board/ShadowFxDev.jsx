// เฉพาะ dev: หน้าดูกระดาน ?board=1&ke=1 — ปุ่มเล่นเอฟเฟกต์ของเคท & เอมิลิโกะ (shadowFx.js) โดยไม่ต้องเปิดห้องจริง
//  มุยมิ (me) กลายเป็นเคท + เพิ่มเอมิลิโกะ (emi) ข้างตัว · ปุ่มสร้าง payload แบบเดียวกับ server แล้วผ่าน shadowEventFx เหมือนเกมจริง
//  ตัวที่ฉากย้าย (บิน/แส้) = ย้ายตำแหน่งจำลองทันทีแบบ state ของ server (ท่าระหว่างทางวาดจาก shadowPose)
//  คอนโซล: window.__shadowFx({ kind: "wings", ... }) = ส่ง payload ของ socket "shadowFx" ตรงๆ
import { useEffect } from "react";
import { CHEER_HIT, SH_HIT_P, SH_MS, dryTileFx, shadowEventFx, wetTileFx } from "./shadowFx";

const IMG = { kate: "/characters/kate_emiliko/kate.webp", emi: "/characters/kate_emiliko/emiliko.webp" };
// ตัวละครจำลอง: มุยมิ (me) → เคท · เพิ่มเอมิลิโกะติดตัว
function keUnits(list) {
  return [
    ...list.map((u) => (u.id === "me" ? { ...u, name: "เคท", img: IMG.kate, color: "#B3122E" } : u)),
    { id: "emi", name: "เอมิลิโกะ", img: IMG.emi, color: "#E8C14A", x: 3, y: 9, hp: 6, maxHp: 7, armor: 1, maxArmor: 3 },
  ];
}
const DIRS = { right: [1, 0], down: [0, 1], left: [-1, 0], up: [0, -1] };
const DIR_KEYS = Object.keys(DIRS);
let dirN = 0; // ทิศถัดไปของปุ่มปีก/ร่าเริง (วน 4 ทิศ)
const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const btn = { font: "500 13px Kanit, sans-serif", color: "#fff", cursor: "pointer", padding: "4px 9px", border: "1px solid rgba(179,18,46,.6)", background: "rgba(36,10,18,.94)" };

export default function ShadowFxDev({ units, setUnits, pushFx, setFocus, map }) {
  const get = (id) => units.find((u) => u.id === id);
  const inB = (x, y) => x >= 0 && y >= 0 && x < map.cols && y < map.rows;
  const free = (x, y, skip = []) => inB(x, y) && !map.terrain[`${x},${y}`] && !units.some((u) => !skip.includes(u.id) && u.x === x && u.y === y);
  const ctx = {
    posOf: (id) => { const u = get(id); return u ? { x: u.x, y: u.y } : null; },
    idsOn: (tiles, owner) => units.filter((u) => u.id !== owner && u.id !== "me" && u.id !== "emi" && tiles.some((t) => t.x === u.x && t.y === u.y)).map((u) => u.id),
  };
  const play = (ev) => {
    const out = shadowEventFx(ev, ctx);
    pushFx(out.fx);
    for (const [ms, list] of out.later) setTimeout(() => pushFx(list), ms);
    if (out.look.length) setFocus(out.look[out.look.length - 1][0]);
  };
  useEffect(() => { window.__shadowFx = (ev) => play(ev); return () => { delete window.__shadowFx; }; });
  const move = (moves) => setUnits((us) => us.map((u) => (moves[u.id] ? { ...u, ...moves[u.id] } : u)));
  const foes = () => { const k = get("me"); return units.filter((u) => u.id !== "me" && u.id !== "emi").sort((a, b) => dist(a, k) - dist(b, k)); };
  const nextTo = (a, near, self) => [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: a.x + dx, y: a.y + dy })).filter((c) => free(c.x, c.y, [self])).sort((p, q) => dist(p, near) - dist(q, near))[0] || null;
  const nextDir = () => DIR_KEYS[dirN++ % 4];

  const wings = (carryOn) => {
    const K = get("me"), E = get("emi"), dir = nextDir(), v = DIRS[dir];
    const carry = carryOn && E && dist(E, K) === 1 ? E : null, skip = carry ? ["me", "emi"] : ["me"];
    let to = null;
    for (let i = 4; inB(K.x + v[0] * i, K.y + v[1] * i); i++) if (free(K.x + v[0] * i, K.y + v[1] * i, skip)) { to = { x: K.x + v[0] * i, y: K.y + v[1] * i }; break; }
    for (let i = 3; !to && i >= 1; i--) if (free(K.x + v[0] * i, K.y + v[1] * i, skip)) to = { x: K.x + v[0] * i, y: K.y + v[1] * i };
    if (!to) return;
    let cTo = null;
    if (carry) { const w = { x: to.x + carry.x - K.x, y: to.y + carry.y - K.y }; cTo = free(w.x, w.y, skip) && !(w.x === to.x && w.y === to.y) ? w : nextTo(to, w, "emi") || { x: carry.x, y: carry.y }; }
    play({ kind: "wings", id: "me", from: { x: K.x, y: K.y }, to, dir, carry: carry ? { id: "emi", from: { x: carry.x, y: carry.y }, to: cTo } : null });
    move({ me: to, ...(carry ? { emi: cTo } : {}) });
  };
  const whipPull = () => {
    const K = get("me"), E = get("emi"), to = nextTo(K, E, "emi");
    if (!to) return;
    play({ kind: "whip", by: "me", target: "emi", mode: "pull", from: { x: E.x, y: E.y }, to });
    move({ emi: to });
  };
  const whipDash = (dodge) => {
    const K = get("me"), F = foes()[0];
    if (!F) return;
    const to = dist(K, F) <= 1 ? { x: K.x, y: K.y } : nextTo(F, K, "me");
    if (!to) return;
    play({ kind: "whip", by: "me", target: F.id, mode: "dash", from: { x: K.x, y: K.y }, to, hitAt: { x: F.x, y: F.y }, dmg: dodge ? 0 : 1, dodge });
    move({ me: to });
  };
  const cheerTiles = (E, v) => {
    const out = [];
    for (let i = 1; i <= 4; i++) for (let j = -1; j <= 1; j++) {
      const x = E.x + v[0] * i + (v[1] ? j : 0), y = E.y + v[1] * i + (v[0] ? j : 0);
      if (inB(x, y)) out.push({ x, y });
    }
    return out;
  };
  const cheer = (weapon) => {
    const E = get("emi"), dir = nextDir(), v = DIRS[dir];
    play({ kind: "cheer", id: "emi", weapon, dir, tiles: cheerTiles(E, v), dash: null });
    if (weapon !== "mop") return;
    setTimeout(() => {
      const E2 = E, path = [{ x: E2.x, y: E2.y }];
      for (let i = 1; i <= 4 && free(E2.x + v[0] * i, E2.y + v[1] * i, ["emi"]); i++) path.push({ x: E2.x + v[0] * i, y: E2.y + v[1] * i });
      if (path.length < 2) return;
      const end = path[path.length - 1], dur = (path.length - 1) * 62 + 520;
      pushFx([{ kind: "keWetTrail", path, step: 62, dur, len: dur }, ...wetTileFx(path.slice(0, -1))]);
      play({ kind: "cheerDash", id: "emi", from: path[0], to: end });
      move({ emi: end });
    }, CHEER_HIT);
  };
  const frontTiles = (n = 3) => { const E = get("emi"); return Array.from({ length: n }, (_, i) => ({ x: E.x + 1 + i, y: E.y })).filter((t) => inB(t.x, t.y)); };
  const attack = (style) => {
    const A = get(style === "keKate" ? "me" : "emi"), F = foes()[0];
    if (!A || !F) return;
    pushFx([{ kind: style, x: A.x, y: A.y, size: 1, to: { x: F.x, y: F.y }, toSize: 1 }]);
    setTimeout(() => pushFx([{ kind: "burst", x: F.x, y: F.y }, { kind: "float", x: F.x, y: F.y, text: "-2" }]), Math.round(SH_MS[style] * SH_HIT_P[style]));
    setFocus({ x: F.x, y: F.y });
  };
  const K = () => get("me"), F0 = () => foes()[0] || get("emi");
  const rows = [
    [["ปีก", () => wings(false)], ["ปีก+หิ้ว", () => wings(true)], ["ม่านแดง", () => setUnits((us) => us.map((u) => (u.id === "me" ? { ...u, wings: !u.wings } : u)))],
      ["แส้ดึง", whipPull], ["แส้พุ่ง", () => whipDash(false)], ["แส้พุ่ง หลบ", () => whipDash(true)]],
    [["กระจกเงา", () => play({ kind: "mirror", from: "me", to: "emi", at: { x: K().x, y: K().y } })], ["ฟื้น", () => play({ kind: "revive", by: "me", id: "emi", at: { x: get("emi").x, y: get("emi").y } })],
      ["ดาบ ถือ", () => play({ kind: "sword", id: "me", holder: "me" })], ["ดาบ ส่ง", () => play({ kind: "sword", id: "me", holder: "emi", from: "me" })], ["ดาบ คืน", () => play({ kind: "sword", id: "me", holder: "me", from: "emi" })],
      ["มองไม่ออก", () => play({ kind: "masked", id: F0().id })], ["ม่านแดง ทิก", () => play({ kind: "stormTick", hits: foes().slice(0, 2).map((u) => ({ id: u.id, dmg: 1 })) })]],
    [...["mop", "vase", "vacuum", "sword"].map((w) => [`อาวุธ ${w}`, () => play({ kind: "weapon", id: "emi", weapon: w })]),
      ...["mop", "vase", "vacuum", "sword"].map((w) => [`ร่าเริง ${w}`, () => cheer(w)])],
    [["เปียก", () => pushFx(wetTileFx(frontTiles()))], ["ถูแห้ง", () => pushFx(dryTileFx(frontTiles()))], ["ไม้ถูชน", () => { const f = F0(); pushFx([{ kind: "keMopHit", x: f.x, y: f.y, dmg: 2, hitIds: [f.id] }]); }],
      ["ไถลน้ำ", () => { const t = frontTiles(4); const p = [{ x: get("emi").x, y: get("emi").y }, ...t]; pushFx([{ kind: "keWetTrail", path: p, step: 62, dur: (p.length - 1) * 62 + 520, len: (p.length - 1) * 62 + 520 }]); }],
      ...["keMop", "keVase", "keVacuum", "keSword", "keKate"].map((s) => [s, () => attack(s)])],
  ];
  return (
    <div style={{ position: "absolute", right: 12, bottom: 12, display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", maxWidth: 820 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {r.map(([label, fn]) => <button key={label} style={btn} onClick={fn}>{label}</button>)}
        </div>
      ))}
    </div>
  );
}
ShadowFxDev.units = keUnits; // BoardPreview ใช้ตอนสร้างตัวละครจำลอง
