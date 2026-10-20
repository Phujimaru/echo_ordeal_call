// เฉพาะ dev: หน้าดูกระดาน ?board=1&diego=1 — ปุ่มเล่นเอฟเฟกต์ของดิเอโก้ แบรนโด โลกคู่ขนาน (diegoFx.js) โดยไม่ต้องเปิดห้องจริง
//  มุยมิ (me) กลายเป็นดิเอโก้ (ขี่ซิลเวอร์ บูลเล็ต) — ปุ่มสร้าง payload แบบเดียวกับ server (GRID_PLAN §7.12) แล้วผ่าน diegoEventFx เหมือนเกมจริง
//  ชั้นพื้น (น้ำมัน/ไฟ/ขี้เถ้า/ตาข่าย) · ชุ่มน้ำมัน/ติดตาข่าย · timeFreeze จำลองแบบ server: อัปเดตหลังจบจังหวะ (DIEGO_FX)
//  ระหว่างหยุดเวลา มีด/ปืน/ไม้ขีด ส่ง frozen: true แล้วเก็บดาเมจไว้ → "เวลาเดินต่อ" ส่ง hits ทั้งหมด (ของที่ค้างพุ่งเข้าเป้าพร้อมกัน)
//  คอนโซล: window.__diegoFx({ kind: "timeStop", id: "me", at: { x, y }, mode: "normal" }) = ส่ง payload ของ socket "diegoFx" ตรงๆ
import { useEffect } from "react";
import { DIEGO_FX, diegoEventFx, diegoPlotMs } from "./diegoFx";

const IMG = "/characters/diego_alt/diego.png";
function diegoUnits(list) {
  return list.map((u) => (u.id === "me" ? { ...u, x: 2, y: 8, name: "ดิเอโก้", img: IMG, color: "#D4A017", hp: 6, maxHp: 6, armor: 2, maxArmor: 2, diego: { mounted: true, horseHp: 3 } } : u));
}
const DIR4 = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
const man = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const btn = { font: "500 13px Kanit, sans-serif", color: "#fff", cursor: "pointer", padding: "4px 9px", border: "1px solid rgba(255,206,64,.6)", background: "rgba(40,30,8,.94)" };
const K = (p) => `${p.x},${p.y}`;
const pending = []; // ดาเมจที่ค้างระหว่างหยุดเวลา [{ id, dmg }]
const uniq = (list) => { const m = new Map(); for (const p of list) m.set(K(p), p); return [...m.values()]; };

export default function DiegoFxDev({ units, setUnits, pushFx, setFocus, map, ground, setGround, freeze, setFreeze }) {
  const get = (id) => units.find((u) => u.id === id);
  const inB = (x, y) => x >= 0 && y >= 0 && x < map.cols && y < map.rows;
  const free = (x, y, skip = []) => inB(x, y) && !map.terrain[`${x},${y}`] && !units.some((u) => !skip.includes(u.id) && u.x === x && u.y === y);

  const G = ground || { oil: [], fire: [], ash: [], nets: [] };
  const ctx = {
    posOf: (id) => { const u = get(id); return u ? { x: u.x, y: u.y } : null; },
    sizeOf: () => 1,
    idAt: (t) => { const u = units.find((v) => v.x === t.x && v.y === t.y); return u ? u.id : null; },
  };
  const play = (ev) => {
    const out = diegoEventFx(ev, ctx);
    pushFx(out.fx);
    for (const [ms, list] of out.later) setTimeout(() => pushFx(list), ms);
    if (out.look.length) setFocus(out.look[0][0]);
    return out;
  };
  useEffect(() => { window.__diegoFx = (ev) => play(ev); return () => { delete window.__diegoFx; }; });
  const later = (ms, fn) => setTimeout(fn, ms);
  const D = () => get("me");
  const base = () => { const d = D(); return { id: "me", color: d.color, frozen: !!freeze }; };
  const foes = () => { const d = D(); return units.filter((u) => u.id !== "me").sort((a, b) => man(a, d) - man(b, d)); };
  const area3 = (c) => { const out = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inB(c.x + dx, c.y + dy) && !map.terrain[`${c.x + dx},${c.y + dy}`]) out.push({ x: c.x + dx, y: c.y + dy }); return out; };
  const setG = (patch) => setGround((g) => ({ oil: [], fire: [], ash: [], nets: [], ...(g || {}), ...patch(g || { oil: [], fire: [], ash: [], nets: [] }) }));
  const setStat = (ids, patch) => setUnits((us) => us.map((u) => (ids.includes(u.id) ? { ...u, dstat: { ...(u.dstat || {}), ...patch } } : u)));
  const hurt = (id, dmg) => { if (freeze) pending.push({ id, dmg }); };
  // แนวตรง 4 ทิศที่ศัตรูคนแรกใกล้สุด (ไม่มี = ทิศขวา)
  const lineTo = (len) => {
    const d = D();
    let best = null;
    for (const [dir, v] of Object.entries(DIR4)) {
      const tiles = [];
      for (let i = 1; i <= len && inB(d.x + v[0] * i, d.y + v[1] * i); i++) tiles.push({ x: d.x + v[0] * i, y: d.y + v[1] * i });
      const hit = tiles.map((t) => units.find((u) => u.id !== "me" && u.x === t.x && u.y === t.y)).find(Boolean) || null;
      if (hit && (!best || !best.hit || man(hit, d) < man(best.hit, d))) best = { dir, v, tiles, hit };
      else if (!best) best = { dir, v, tiles, hit: null };
    }
    return best;
  };

  const oil = () => {
    const f = foes()[0], d = D(), at = f ? { x: f.x, y: f.y } : { x: d.x + 3, y: d.y };
    play({ ...base(), kind: "throw", item: "oil", from: { x: d.x, y: d.y }, to: at });
    later(DIEGO_FX.throw, () => {
      const tiles = area3(at), soaked = units.filter((u) => u.id !== "me" && tiles.some((t) => t.x === u.x && t.y === u.y)).map((u) => u.id);
      play({ ...base(), kind: "oil", at, tiles, soaked });
      setG((g) => ({ oil: uniq([...g.oil, ...tiles]) }));
      setStat(soaked, { soaked: true });
    });
  };
  const match = () => {
    const d = D();
    if (G.oil.length) {
      const at = G.oil[Math.floor(G.oil.length / 2)], tiles = G.oil.slice();
      play({ ...base(), kind: "throw", item: "match", from: { x: d.x, y: d.y }, to: at });
      later(DIEGO_FX.throw, () => {
        const hits = units.filter((u) => u.id !== "me" && tiles.some((t) => t.x === u.x && t.y === u.y)).map((u) => u.id);
        play({ ...base(), kind: "explode", at, tiles, hits });
        hits.forEach((id) => hurt(id, 2));
        setG((g) => ({ oil: [], fire: uniq([...g.fire, ...tiles.map((t) => ({ ...t, left: 3 }))]) }));
        setStat(hits, { soaked: false });
      });
      return;
    }
    const f = foes()[0];
    if (!f) return;
    play({ ...base(), kind: "throw", item: "match", from: { x: d.x, y: d.y }, to: { x: f.x, y: f.y } });
    later(DIEGO_FX.throw, () => { play({ ...base(), kind: "ignite", targetId: f.id, turns: 1 }); hurt(f.id, 1); });
  };
  const net = () => {
    const f = foes()[0], d = D();
    const c = f ? [[2, 0], [-2, 0], [0, 2], [0, -2]].map(([dx, dy]) => ({ x: f.x + dx, y: f.y + dy })).find((p) => free(p.x, p.y)) : { x: d.x + 3, y: d.y };
    if (!c) return;
    play({ ...base(), kind: "throw", item: "net", from: { x: d.x, y: d.y }, to: c });
    later(DIEGO_FX.throw, () => { play({ ...base(), kind: "net", at: c, tiles: area3(c) }); setG((g) => ({ nets: [...g.nets, { ...c, color: D().color }] })); });
  };
  const trap = () => {
    const n = G.nets[0];
    if (!n) return;
    const f = units.filter((u) => u.id !== "me").sort((a, b) => man(a, n) - man(b, n))[0];
    if (!f) return;
    const to = free(n.x, n.y, [f.id]) ? { x: n.x, y: n.y } : { x: f.x, y: f.y };
    play({ ...base(), kind: "netTrap", targetId: f.id, from: { x: f.x, y: f.y }, to, tiles: area3(n) });
    setG((g) => ({ nets: g.nets.slice(1) }));
    later(DIEGO_FX.netTrap, () => { setUnits((us) => us.map((u) => (u.id === f.id ? { ...u, x: to.x, y: to.y, dstat: { ...(u.dstat || {}), netted: true } } : u))); });
  };
  const shoot = (kind) => {
    const d = D(), L = lineTo(kind === "knife" ? 4 : 5);
    const to = L.hit ? { x: L.hit.x, y: L.hit.y } : L.tiles[L.tiles.length - 1] || { x: d.x + 1, y: d.y };
    play({ ...base(), kind, from: { x: d.x, y: d.y }, dir: L.dir, to, hitId: L.hit ? L.hit.id : null });
    if (L.hit) hurt(L.hit.id, 1);
  };
  const stop = (mode) => {
    const d = D(), f = foes()[0];
    pending.splice(0);
    play({ ...base(), frozen: false, kind: "timeStop", at: { x: d.x, y: d.y }, mode, attackerId: mode === "counter" && f ? f.id : null });
    setFreeze({ by: "me" });
  };
  const resume = () => {
    const d = D(), sum = new Map();
    for (const h of pending) sum.set(h.id, (sum.get(h.id) || 0) + h.dmg);
    pending.splice(0);
    const hits = [...sum.entries()].map(([id, dmg]) => ({ id, dmg, kill: false }));
    play({ ...base(), frozen: false, kind: "timeResume", at: { x: d.x, y: d.y }, hits });
    setFreeze(null);
  };
  // กลอุบาย: พุ่งแนว 4 ไปหาศัตรูคนแรก → หยุดที่ช่องเดิมของเป้า · เป้ากระเด็น 2 ช่องตามทิศ (ชนอะไรหยุด)
  const plot = () => {
    const d = D(), L = lineTo(4), path = [];
    for (const t of L.tiles) { if (map.terrain[K(t)]) break; path.push(t); if (L.hit && t.x === L.hit.x && t.y === L.hit.y) break; }
    let push = null;
    if (L.hit) {
      let p = { x: L.hit.x, y: L.hit.y };
      for (let i = 0; i < 2; i++) { const n = { x: p.x + L.v[0], y: p.y + L.v[1] }; if (!free(n.x, n.y, [L.hit.id])) break; p = n; }
      push = { from: { x: L.hit.x, y: L.hit.y }, to: p };
      hurt(L.hit.id, 4);
    }
    play({ ...base(), frozen: false, kind: "plot", from: { x: d.x, y: d.y }, dir: L.dir, path, hitId: L.hit ? L.hit.id : null, push });
    const end = path[path.length - 1];
    later(diegoPlotMs(path.length), () => setUnits((us) => us.map((u) => (u.id === "me" && end ? { ...u, x: end.x, y: end.y } : push && u.id === L.hit.id ? { ...u, x: push.to.x, y: push.to.y } : u))));
    if (freeze) later(diegoPlotMs(path.length) + 120, resume);
  };
  const ash = () => {
    if (!G.fire.length) return;
    const tiles = G.fire.map((t) => ({ x: t.x, y: t.y }));
    play({ ...base(), kind: "ash", tiles });
    setG((g) => ({ fire: [], ash: uniq([...g.ash, ...tiles]) }));
  };
  const burn = () => {
    const f = units.find((u) => u.id !== "me" && G.fire.some((t) => t.x === u.x && t.y === u.y)) || foes()[0];
    if (f) play({ ...base(), kind: "burn", targetId: f.id, at: { x: f.x, y: f.y } });
  };
  const horse = (mode) => {
    const d = D();
    play({ ...base(), kind: "horse", at: { x: d.x, y: d.y }, mode });
    setUnits((us) => us.map((u) => (u.id === "me" ? { ...u, diego: { mounted: mode === "mount", horseHp: mode === "die" ? 0 : mode === "mount" && !(u.diego.horseHp > 0) ? 3 : u.diego.horseHp } } : u)));
  };
  const simple = (kind, extra = {}) => { const d = D(); play({ ...base(), frozen: false, kind, at: { x: d.x, y: d.y }, ...extra }); };
  const walk = () => {
    const d = D(), dir = Object.keys(DIR4).find((k) => [1, 2, 3].every((i) => free(d.x + DIR4[k][0] * i, d.y + DIR4[k][1] * i, ["me"])));
    if (!dir) return;
    const v = DIR4[dir];
    for (let i = 1; i <= 3; i++) later(i * 180, () => setUnits((us) => us.map((u) => (u.id === "me" ? { ...u, x: d.x + v[0] * i, y: d.y + v[1] * i } : u))));
  };
  const reset = () => {
    setGround(null); setFreeze(null); pending.splice(0);
    setUnits((us) => us.map((u) => (u.id === "me" ? { ...u, diego: { mounted: true, horseHp: 3 }, dstat: null } : { ...u, dstat: null })));
  };
  const rows = [
    [["ถังน้ำมัน", oil], ["ไม้ขีดไฟ", match], ["ตาข่ายดัก", net], ["ตาข่ายทำงาน", trap], ["มีด", () => shoot("knife")], ["ปืน", () => shoot("shot")],
      ["รีโหลด", () => simple("reload")], ["ปฐมพยาบาล", () => simple("firstAid")], ["เล่ห์เหลี่ยม", () => simple("cunning", { gain: 2 })], ["กองไฟมอด", ash], ["กองไฟเผา", burn]],
    [["เดอะเวิลด์", () => simple("world")], ["หยุดเวลา", () => stop("normal")], ["หยุดเวลา (สวน)", () => stop("counter")], ["เวลาเดินต่อ", resume],
      ["เป็นไปดั่งกลอุบาย", plot], ["ขึ้นม้า", () => horse("mount")], ["ลงม้า", () => horse("dismount")], ["ม้าตาย", () => horse("die")], ["ควบ", walk], ["ล้าง", reset]],
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
DiegoFxDev.units = diegoUnits; // BoardPreview ใช้ตอนสร้างตัวละครจำลอง
