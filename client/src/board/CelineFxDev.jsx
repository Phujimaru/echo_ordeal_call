// เฉพาะ dev: หน้าดูกระดาน ?board=1&celine=1 — ปุ่มเล่นเอฟเฟกต์ขององค์หญิงดอกไม้ เซลิน (celineFx.js) โดยไม่ต้องเปิดห้องจริง
//  มุยมิ (me) กลายเป็นเซลิน — ปุ่มสร้าง payload แบบเดียวกับ server (contract §5) แล้วผ่าน celineEventFx เหมือน BoardStage
//  ตีปกติ 6 อาวุธ = attackStyle celine* ไปหาศัตรูใกล้สุด (เสียง celine_atk_* ตรงจังหวะปะทะ · คริ = ดอกทอง + celine_crit)
//  state จำลอง: พุ่มดอกไม้ (flora → special "bloom") · กำแพงน้ำแข็ง (terrain "icewall") · ราชาดอกไม้ (kings)
//  คอนโซล: window.__celineFx({ kind: "ult", id: "me", at: { x, y } }) = ส่ง payload ของ socket "celineFx" ตรงๆ
import { useEffect } from "react";
import { CELINE_EVENT_SFX, CELINE_SWORD, CELINE_WEAPONS, celineEventFx } from "./celineFx";
import { STYLE_HIT } from "./boardDraw";
import { playSfx } from "../audio";

const IMG = "/characters/celine/celine.webp";
function celineUnits(list) {
  return list.map((u) => (u.id === "me" ? { ...u, x: 5, y: 7, name: "เซลิน", img: IMG, color: "#f3c94b", hp: 7, maxHp: 7, armor: 3, maxArmor: 3, tag: null } : u));
}
const CUR = { units: [] };
const DIR4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const man = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const STYLE = { dagger: "celineDagger", dragon: "celineDragon", great: "celineGreat", fire: "celineFire", wind: "celineWind", thunder: "celineThunder" };
const NAME = { dagger: "ดาบเล็ก", dragon: "ดาบมังกรแดง", great: "ดาบใหญ่", fire: "เวทย์ไฟ", wind: "เวทย์ลม", thunder: "เวทย์ไฟฟ้า" };
const btn = (on) => ({ font: "500 13px Kanit, sans-serif", color: "#fff", cursor: "pointer", padding: "4px 9px", border: `1px solid ${on ? "#f3c94b" : "rgba(245,154,184,.6)"}`, background: on ? "rgba(120,80,20,.95)" : "rgba(48,24,40,.94)" });

export default function CelineFxDev({ units, setUnits, pushFx, setFocus, map, cel, setCel }) {
  useEffect(() => { CUR.units = units; });
  const get = (id) => CUR.units.find((u) => u.id === id);
  const inB = (x, y) => x >= 0 && y >= 0 && x < map.cols && y < map.rows;
  const C = () => get("me");
  const me = () => { const d = C(); return { x: d.x, y: d.y }; };
  const foes = () => { const d = C(); return CUR.units.filter((u) => u.id !== "me").sort((a, b) => man(a, d) - man(b, d)); };
  const ctx = { posOf: (id) => { const u = get(id); return u ? { x: u.x, y: u.y } : null; }, sizeOf: () => 1 };
  const play = (ev, sfx) => {
    const out = celineEventFx({ id: "me", color: "#f3c94b", ...ev }, ctx);
    pushFx(out.fx);
    for (const [ms, list] of out.later) setTimeout(() => pushFx(list.map((f) => (f.kind === "float" ? { ...f, z: 1.5 } : f))), ms);
    for (const ms of out.shake) setTimeout(() => pushFx([{ kind: "iceShake", x: 0, y: 0, amp: 7, dur: 600 }]), ms);
    if (out.look.length) setFocus(out.look[0][0]);
    const s = sfx || CELINE_EVENT_SFX[ev.kind];
    if (s) playSfx(s);
  };
  useEffect(() => { window.__celineFx = (ev) => play(ev); return () => { delete window.__celineFx; }; });

  // ตีปกติ: ดาบ = ประชิด (ยืนติดเป้าก่อน) · เวท = ระยะ ≤ 3 (ยิงจากที่ยืน)
  const attack = (w, crit) => {
    const d = C(), f = foes()[0];
    if (!f) return;
    let from = { x: d.x, y: d.y };
    if (CELINE_SWORD[w] && man(d, f) > 1) {
      const spot = DIR4.map(([dx, dy]) => ({ x: f.x + dx, y: f.y + dy })).filter((t) => inB(t.x, t.y) && !map.terrain[`${t.x},${t.y}`] && !CUR.units.some((u) => u.id !== "me" && u.x === t.x && u.y === t.y)).sort((a, b) => man(a, d) - man(b, d))[0];
      if (spot) { from = spot; setUnits((us) => us.map((u) => (u.id === "me" ? { ...u, ...spot } : u))); }
    }
    const kind = STYLE[w];
    pushFx([{ kind, x: from.x, y: from.y, size: 1, to: { x: f.x, y: f.y }, toSize: 1, color: "#f3c94b" }]);
    setFocus({ x: f.x, y: f.y });
    setTimeout(() => {
      playSfx(`celine_atk_${w}`);
      const dmg = (w === "great" ? 2 : 1) * (crit ? 2 : 1);
      pushFx([{ kind: "burst", x: f.x, y: f.y, color: "#f3c94b" }, { kind: "float", x: f.x, y: f.y, text: `-${dmg}`, color: crit ? "#ffd84a" : undefined, size: crit ? 38 : 30, z: 1.5 },
        ...(crit ? [{ kind: "celineCrit", x: f.x, y: f.y, size: 1 }, { kind: "float", x: f.x, y: f.y - 0.6, text: "คริติคอล", color: "#ffd84a", size: 24, z: 1.5 }] : [])]);
      if (crit) playSfx("celine_crit");
      if (w === "fire") setTimeout(() => play({ kind: "burn", targetId: f.id }), 120);
      if (w === "thunder") setTimeout(() => play({ kind: "shock", targetId: f.id }), 120);
      if (w === "wind") setTimeout(() => play({ kind: "gust", targetId: f.id }), 120);
    }, STYLE_HIT[kind] || 400);
  };

  // ความอ่อนโยน
  const heal = (mode) => {
    const d = C(), t = mode === "self" ? d : foes()[0];
    if (!t) return;
    play({ kind: "heal", from: me(), to: { x: t.x, y: t.y }, targetId: t.id, amt: 1, selfAmt: mode === "self" ? 0 : 1, crit: mode === "crit", mult: 2, self: mode === "self" }, mode === "crit" ? "celine_heal_crit" : "celine_heal");
    setTimeout(() => pushFx([{ kind: "float", x: t.x, y: t.y, text: mode === "crit" ? "+2" : "+1", color: "#8ff0b0", z: 1.5 }]), 900);
  };
  const wallTiles = (orient) => {
    const d = C(), c = { x: d.x, y: d.y - 2 };
    return [-1, 0, 1].map((k) => (orient === "v" ? { x: c.x + 2, y: c.y + k + 2 } : { x: c.x + k, y: c.y })).filter((t) => inB(t.x, t.y));
  };
  const wall = (orient) => {
    const tiles = wallTiles(orient).filter((t) => !map.terrain[`${t.x},${t.y}`] || map.terrain[`${t.x},${t.y}`] === "icewall");
    setCel((c) => ({ ...c, walls: [...c.walls.filter((w) => !tiles.some((t) => t.x === w.x && t.y === w.y)), ...tiles] }));
    play({ kind: "wall", tiles, orient });
  };
  const wallBreak = (why) => {
    if (!cel.walls.length) return;
    const tiles = why === "hit" ? [cel.walls[Math.floor(cel.walls.length / 2)]] : cel.walls;
    setCel((c) => ({ ...c, walls: c.walls.filter((w) => !tiles.includes(w)) }));
    play({ kind: "wallBreak", tiles, why });
  };
  const swap = (mode) => {
    const d = C(), fs = foes();
    if (!fs[0]) return;
    let a, b;
    if (mode === "pair") {
      if (!fs[1]) return;
      a = { id: fs[0].id, from: { x: fs[0].x, y: fs[0].y }, to: { x: fs[1].x, y: fs[1].y } };
      b = { id: fs[1].id, from: { x: fs[1].x, y: fs[1].y }, to: { x: fs[0].x, y: fs[0].y } };
    } else {
      a = { id: "me", from: { x: d.x, y: d.y }, to: { x: fs[0].x, y: fs[0].y } };
      b = { id: fs[0].id, from: { x: fs[0].x, y: fs[0].y }, to: { x: d.x, y: d.y } };
    }
    play({ kind: "swap", mode, a, b });
    setUnits((us) => us.map((u) => (u.id === a.id ? { ...u, ...a.to } : u.id === b.id ? { ...u, ...b.to } : u)));
  };
  const addFlora = (tiles, made) => setCel((c) => ({ ...c, flora: [...c.flora.filter((f) => !tiles.some((t) => t.x === f.x && t.y === f.y)), ...tiles.map((t) => ({ ...t, left: made ? 5 : 3, made }))] }));
  const bloom = () => {
    const f = foes()[0], d = C(), t = f ? { x: Math.round((f.x + d.x) / 2), y: Math.round((f.y + d.y) / 2) } : { x: d.x + 1, y: d.y };
    if (map.terrain[`${t.x},${t.y}`]) return;
    addFlora([t], true);
    play({ kind: "bloom", tiles: [t], made: true });
  };
  const trail = () => {
    const d = C(), tiles = [];
    for (let i = 0; i <= 4; i++) { const t = { x: d.x - i, y: d.y + 1 }; if (inB(t.x, t.y) && !map.terrain[`${t.x},${t.y}`]) tiles.push(t); }
    if (!tiles.length) return;
    addFlora(tiles, false);
    play({ kind: "trail", tiles });
  };
  const target = () => foes()[0];
  const onHit = (kind) => { const f = target(); if (f) play({ kind, targetId: f.id }); };
  const rows = [
    [...CELINE_WEAPONS.map((w) => [NAME[w], () => attack(w, false)]), ["คริ ดาบเล็ก", () => attack("dagger", true)], ["คริ เวทย์ไฟ", () => attack("fire", true)]],
    [["เยียวยา", () => heal("one")], ["เยียวยา คริ", () => heal("crit")], ["เยียวยาตัวเอง", () => heal("self")], ["กำแพง ─", () => wall("h")], ["กำแพง │", () => wall("v")],
      ["กำแพงแตก", () => wallBreak("hit")], ["กำแพงละลาย", () => wallBreak("expire")], ["สลับ", () => swap("swap")], ["จับคู่", () => swap("pair")], ["รังสรรค์", bloom]],
    [...CELINE_WEAPONS.map((w) => [`ถือ ${NAME[w]}`, () => play({ kind: "weapon", weapon: w, at: me() }, CELINE_SWORD[w] ? "celine_weapon_sword" : "celine_weapon_magic")])],
    [["สวนดอกไม้ของฉัน", () => { play({ kind: "ult", at: me() }); setCel((c) => ({ ...c, king: true })); }], ["ราชาดอกไม้", () => setCel((c) => ({ ...c, king: !c.king }))],
      ["เวลาน้ำชา", () => play({ kind: "tea", at: me(), amt: 1 })], ["น้ำชา คริ", () => play({ kind: "tea", at: me(), amt: 2, crit: true })],
      ["ลุกไหม้", () => onHit("burn")], ["ช็อต", () => onHit("shock")], ["ลมผลัก", () => onHit("gust")], ["ชน", () => onHit("collide")],
      ["รอยเท้า", trail], ["เหี่ยว", () => setCel((c) => ({ ...c, flora: c.flora.map((f) => ({ ...f, left: f.left === 1 ? (f.made ? 5 : 3) : 1 })) }))],
      ["ล้าง", () => setCel({ flora: [], walls: [], king: false })]],
  ];
  return (
    <div style={{ position: "absolute", right: 12, bottom: 12, display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", maxWidth: 980 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {r.map(([label, fn]) => <button key={label} style={btn(label === "ราชาดอกไม้" && cel.king)} onClick={fn}>{label}</button>)}
        </div>
      ))}
    </div>
  );
}
CelineFxDev.units = celineUnits; // BoardPreview ใช้ตอนสร้างตัวละครจำลอง
