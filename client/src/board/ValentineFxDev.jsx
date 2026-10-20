// เฉพาะ dev: หน้าดูกระดาน ?board=1&valentine=1 — ปุ่มเล่นเอฟเฟกต์ของฟันนี่ วาเลนไทน์ (valentineFx.js) โดยไม่ต้องเปิดห้องจริง
//  มุยมิ (me) กลายเป็นวาเลนไทน์ — ปุ่มสร้าง payload แบบเดียวกับ server (GRID_PLAN §7.13) แล้วผ่าน valentineEventFx เหมือนเกมจริง
//  state จำลองแบบ server: ลงผลทันทีตอนส่งเหตุการณ์ (ธงปัก · dim · ตัวเหมือน/ร่างแยกเกิด/หาย) — ฉากต้องค้างภาพเอง
//  คอนโซล: window.__valFx({ kind: "veilIn", id: "me", at: { x, y }, flag: { x, y } }) = ส่ง payload ของ socket "valentineFx" ตรงๆ
import { useEffect } from "react";
import { VAL_FX, valRunMs, valShotsMs, valentineEventFx } from "./valentineFx";

const IMG = "/characters/funny_valentine/valentine.webp";
function valUnits(list) {
  return list.map((u) => (u.id === "me" ? { ...u, x: 3, y: 8, name: "วาเลนไทน์", img: IMG, color: "#E796BF", hp: 7, maxHp: 7, armor: 3, maxArmor: 3, tag: null } : u));
}
const CUR = { units: [], seq: 0 }; // หมากล่าสุด (setTimeout อ่านค่าใหม่ได้)
const nextSeq = () => ++CUR.seq;
// ตัวจับเวลาของหน้าทดสอบตามนาฬิกากระดาน (window.__clk.scale — ภาพช้าตอนตรวจเฟรม) · ปกติ = เวลาจริง
const slow = () => { const c = typeof window !== "undefined" && window.__clk; return c && c.scale > 0 ? Math.max(0.02, Math.min(1, c.scale)) : 1; };
const later = (ms, fn) => setTimeout(fn, ms / slow());
const DIR4 = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
const man = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const btn = (on) => ({ font: "500 13px Kanit, sans-serif", color: "#fff", cursor: "pointer", padding: "4px 9px", border: `1px solid ${on ? "#F06AB8" : "rgba(231,150,191,.55)"}`, background: on ? "rgba(120,40,90,.95)" : "rgba(40,16,34,.94)" });

export default function ValentineFxDev({ units, setUnits, pushFx, setFocus, map, flags, setFlags, dimView, setDimView }) {
  useEffect(() => { CUR.units = units; });
  const get = (id) => CUR.units.find((u) => u.id === id);
  const inB = (x, y) => x >= 0 && y >= 0 && x < map.cols && y < map.rows;
  const free = (x, y, skip = []) => inB(x, y) && !map.terrain[`${x},${y}`] && !CUR.units.some((u) => !skip.includes(u.id) && u.x === x && u.y === y);
  const ctx = {
    posOf: (id) => { const u = get(id); return u ? { x: u.x, y: u.y } : null; },
    sizeOf: () => 1,
    lookOf: (id) => { const u = get(id); return u ? { img: u.img, color: u.color, name: u.name, hp: u.hp, maxHp: u.maxHp, armor: u.armor, maxArmor: u.maxArmor, size: 1, summon: u.summon || null } : null; },
  };
  const play = (ev) => {
    const out = valentineEventFx(ev, ctx);
    pushFx(out.fx);
    for (const [ms, list] of out.later) later(ms, () => pushFx(list));
    if (out.look.length) setFocus(out.look[0][0]);
    return out;
  };
  useEffect(() => { window.__valFx = (ev) => play(ev); return () => { delete window.__valFx; }; });
  const V = () => get("me");
  const foes = () => { const d = V(); return CUR.units.filter((u) => u.id !== "me" && !u.summon).sort((a, b) => man(a, d) - man(b, d)); };
  // ชั้นของเรา = dim ของ me · คนคนละชั้น = ภาพโปร่ง (แบบที่ BoardStage ส่งให้ BoardCanvas)
  const regh = (us) => { const my = (us.find((u) => u.id === "me") || {}).dim || null; return us.map((u) => { const gd = (u.dim || null) !== my; return { ...u, ghostDim: gd, alpha: gd ? 0.38 : undefined }; }); };
  const setDims = (fn) => setUnits((us) => regh(fn(us)));
  const patch = (id, p) => setDims((us) => us.map((u) => (u.id === id ? { ...u, ...(typeof p === "function" ? p(u) : p) } : u)));
  const hurt = (id, n) => patch(id, (u) => { let { armor, hp } = u; for (let i = 0; i < n; i++) { if (armor > 0) armor--; else hp--; } return { armor, hp: Math.max(0, hp) }; });
  // ช่องว่างใกล้สุดรอบช่อง c ที่ระยะ r (ไม่มี = r + 1 …)
  const nearFree = (c, r0 = 1, skip = []) => {
    for (let r = r0; r < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.abs(dx) + Math.abs(dy) !== r) continue;
      if (free(c.x + dx, c.y + dy, skip)) return { x: c.x + dx, y: c.y + dy };
    }
    return null;
  };
  // ทิศ 4 ทางที่มีศัตรูใกล้สุดในแนว
  const lineTo = (len) => {
    const d = V();
    let best = null;
    for (const [dir, v] of Object.entries(DIR4)) {
      const tiles = [];
      for (let i = 1; i <= len && inB(d.x + v[0] * i, d.y + v[1] * i); i++) tiles.push({ x: d.x + v[0] * i, y: d.y + v[1] * i });
      const hit = tiles.map((t) => CUR.units.find((u) => u.id !== "me" && u.x === t.x && u.y === t.y)).find(Boolean) || null;
      if (hit && (!best || !best.hit || man(hit, d) < man(best.hit, d))) best = { dir, v, tiles, hit };
      else if (!best) best = { dir, v, tiles, hit: null };
    }
    return best;
  };

  // ---------- หลบสายตา ----------
  const veil = () => {
    const d = V();
    if (d.dim) {
      const from = flags.find((f) => f.ownerId === "me") || { x: d.x, y: d.y };
      const at = free(d.x, d.y, ["me"]) ? { x: d.x, y: d.y } : nearFree(d, 1, ["me"]);
      play({ kind: "veilOut", id: "me", from, at });
      setFlags((fs) => fs.filter((f) => f.ownerId !== "me"));
      patch("me", { dim: null, x: at.x, y: at.y });
      setDimView(null);
      return;
    }
    const at = { x: d.x, y: d.y };
    play({ kind: "veilIn", id: "me", at, flag: at });
    setFlags((fs) => [...fs.filter((f) => f.ownerId !== "me"), { ...at, ownerId: "me" }]);
    patch("me", { dim: "veil:me" });
    setDimView("veil");
  };
  // เดินในมิติ (ทะลุทุกอย่าง)
  const veilWalk = () => {
    const d = V(), dir = Object.keys(DIR4).find((k) => inB(d.x + DIR4[k][0] * 3, d.y + DIR4[k][1] * 3)) || "right", v = DIR4[dir];
    for (let i = 1; i <= 3; i++) later(i * 140, () => patch("me", { x: d.x + v[0] * i, y: d.y + v[1] * i }));
  };
  // ---------- ปืน / ตีปกติ ----------
  const shoot = (n) => {
    const d = V(), L = lineTo(5), victims = L.tiles.map((t) => CUR.units.find((u) => u.id !== "me" && u.x === t.x && u.y === t.y)).filter(Boolean);
    const shots = [];
    for (let i = 0; i < n; i++) {
      const tgt = victims[0];
      const miss = !!tgt && i === 1; // นัดที่ 2 หลบ (ตัวอย่าง)
      shots.push({ to: tgt ? { x: tgt.x, y: tgt.y } : L.tiles[L.tiles.length - 1], hitId: tgt ? tgt.id : null, miss });
    }
    play({ kind: "shots", id: "me", from: { x: d.x, y: d.y }, dir: L.dir, shots });
    for (const s of shots) if (s.hitId && !s.miss) hurt(s.hitId, 1);
    later(valShotsMs(n) - 120, () => play({ kind: "gain", id: "me", at: { x: d.x, y: d.y }, n: 1 }));
  };
  const strike = (style) => {
    const d = V(), f = foes()[0];
    if (!f) return;
    const want = style === "valKnife" ? 1 : 2;
    // ย้ายเป้าให้อยู่ระยะพอดี (หน้าทดสอบ)
    let to = { x: f.x, y: f.y };
    if (man(f, d) !== want) {
      const c = [[want, 0], [-want, 0], [0, want], [0, -want], [1, 1], [-1, 1], [1, -1], [-1, -1]].filter(([dx, dy]) => Math.abs(dx) + Math.abs(dy) === want).map(([dx, dy]) => ({ x: d.x + dx, y: d.y + dy })).find((p) => free(p.x, p.y, [f.id]));
      if (!c) return;
      to = c; patch(f.id, c);
    }
    later(60, () => {
      pushFx([{ kind: style, x: d.x, y: d.y, size: 1, to, toSize: 1, color: d.color }]);
      const hit = style === "valKnife" ? 250 : 210;
      later(hit, () => { pushFx([{ kind: "float", x: to.x, y: to.y, text: "-1", size: 30 }]); hurt(f.id, 1); });
    });
  };
  // ---------- ท่าไม้ตาย ----------
  const spawnDouble = (target, layer) => {
    const at = nearFree(target, 2, []) || nearFree(target, 1, []);
    if (!at) return null;
    const id = `me~s${nextSeq()}`;
    play({ kind: "doubleSpawn", id, look: target.id, at, targetId: target.id });
    setDims((us) => [...us, { id, x: at.x, y: at.y, name: target.name, img: target.img, color: target.color, hp: 3, maxHp: 3, armor: 2, maxArmor: 2, summon: { kind: "double", ownerId: "me", look: target.id, targetId: target.id }, dim: layer || null }]);
    return id;
  };
  const parallel = () => {
    const d = V(), L = lineTo(4), v = L.v, px = -v[1], py = v[0], tiles = [];
    for (let i = 1; i <= 4; i++) for (let j = -1; j <= 1; j++) { const x = d.x + v[0] * i + px * j, y = d.y + v[1] * i + py * j; if (inB(x, y)) tiles.push({ x, y }); }
    const inArea = CUR.units.filter((u) => u.id !== "me" && !u.summon && tiles.some((t) => t.x === u.x && t.y === u.y));
    const ids = ["me", ...inArea.map((u) => u.id)];
    play({ kind: "parallelIn", id: "me", at: { x: d.x, y: d.y }, dir: L.dir, tiles, ids });
    const dim = "par:me:1";
    setDims((us) => us.map((u) => (ids.includes(u.id) ? { ...u, dim } : u)));
    setDimView("par");
    later(VAL_FX.parallelIn, () => inArea.forEach((t, i) => later(i * 160, () => spawnDouble(get(t.id), dim))));
  };
  const know = () => {
    const f = foes()[0];
    if (f) spawnDouble(f, null);
  };
  const doubles = () => CUR.units.filter((u) => u.summon && u.summon.kind === "double");
  // ตัวเหมือนวิ่งเข้าหาเป้า (BFS ง่ายๆ) → ถึงตัว = เมนเจอร์
  const run = () => {
    const dd = doubles()[0];
    if (!dd) return;
    const t = get(dd.summon.targetId);
    if (!t) return;
    const prev = new Map([[`${dd.x},${dd.y}`, null]]), q = [{ x: dd.x, y: dd.y }];
    let goal = null;
    while (q.length && !goal) {
      const c = q.shift();
      for (const [dx, dy] of Object.values(DIR4)) {
        const n = { x: c.x + dx, y: c.y + dy }, k = `${n.x},${n.y}`;
        if (prev.has(k) || !free(n.x, n.y, [dd.id])) continue;
        prev.set(k, c); q.push(n);
        if (man(n, t) === 1) { goal = n; break; }
      }
    }
    if (!goal) { if (man(dd, t) === 1) collide(dd, t); return; }
    const path = [];
    for (let c = goal; c; c = prev.get(`${c.x},${c.y}`)) path.unshift(c);
    play({ kind: "doubleRun", id: dd.id, path: path.slice(1), targetId: t.id });
    patch(dd.id, { x: goal.x, y: goal.y });
    later(valRunMs(path.length - 1), () => collide(get(dd.id), get(t.id)));
  };
  const collide = (dd, t) => {
    if (!dd || !t) return;
    const par = !!dd.dim;
    play({ kind: "menger", id: dd.id, targetId: t.id, at: { x: dd.x, y: dd.y }, dmg: par ? 4 : 2, pierce: !par });
    setUnits((us) => us.filter((u) => u.id !== dd.id));
    later(1000, () => hurt(t.id, par ? 4 : 2));
    later(VAL_FX.menger, () => play({ kind: "gain", id: "me", at: { x: V().x, y: V().y }, n: 1 }));
    if (par && !doubles().some((x) => x.id !== dd.id && x.dim)) later(VAL_FX.menger, () => dimOut([t.id, "me"]));
    else if (par) later(VAL_FX.menger, () => dimOut([t.id]));
  };
  const breakDouble = () => {
    const dd = doubles()[0];
    if (!dd) return;
    play({ kind: "doubleBreak", id: dd.id, at: { x: dd.x, y: dd.y } });
    setUnits((us) => us.filter((u) => u.id !== dd.id));
  };
  const dimOut = (ids) => {
    const list = ids || CUR.units.filter((u) => u.dim && !u.summon).map((u) => u.id);
    if (!list.length) return;
    play({ kind: "dimOut", ids: list, dim: "par:me:1" });
    setDims((us) => us.map((u) => (list.includes(u.id) ? { ...u, dim: null } : u)));
    if (list.includes("me")) setDimView(null);
  };
  const clones = () => {
    const d = V(), spawns = [];
    const taken = [];
    for (let r = 1; r < 4 && spawns.length < 3; r++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1], [2, 0], [-2, 0], [0, 2], [0, -2]]) {
      if (spawns.length >= 3) break;
      const p = { x: d.x + dx, y: d.y + dy };
      if (free(p.x, p.y) && !taken.some((t) => t.x === p.x && t.y === p.y)) { taken.push(p); spawns.push({ id: `me~c${spawns.length + 1}`, at: p }); }
    }
    play({ kind: "clones", id: "me", at: { x: d.x, y: d.y }, spawns });
    setUnits((us) => [...us.filter((u) => !(u.summon && u.summon.kind === "clone")), ...spawns.map((s) => ({ id: s.id, x: s.at.x, y: s.at.y, name: d.name, img: d.img, color: d.color, hp: 1, maxHp: 1, armor: 1, maxArmor: 1, summon: { kind: "clone", ownerId: "me" } }))]);
  };
  const cloneFade = () => {
    const ids = CUR.units.filter((u) => u.summon && u.summon.kind === "clone").map((u) => u.id);
    if (!ids.length) return;
    play({ kind: "cloneFade", ids });
    setUnits((us) => us.filter((u) => !ids.includes(u.id)));
  };
  const justice = () => {
    const d = V(), r = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    play({ kind: "justice", id: "me", at: { x: d.x, y: d.y } });
    patch("me", { hp: r(2, 4), armor: r(1, 3) });
  };
  const toggleGhost = () => {
    const f = foes()[1] || foes()[0];
    if (f) setUnits((us) => us.map((u) => (u.id === f.id ? { ...u, ghostDim: !u.ghostDim, alpha: u.ghostDim ? undefined : 0.38 } : u)));
  };
  const toggleDouble = () => {
    const ex = doubles()[0];
    if (ex) { setUnits((us) => us.filter((u) => u.id !== ex.id)); return; }
    const f = foes()[0];
    if (!f) return;
    const at = nearFree(f, 2);
    if (at) setUnits((us) => [...us, { id: "me~sX", x: at.x, y: at.y, name: f.name, img: f.img, color: f.color, hp: 3, maxHp: 3, armor: 2, maxArmor: 2, summon: { kind: "double", ownerId: "me", look: f.id, targetId: f.id } }]);
  };
  const reset = () => {
    setFlags([]); setDimView(null);
    setUnits((us) => valUnits(us.filter((u) => !u.summon).map((u) => ({ ...u, dim: null, ghostDim: false, alpha: undefined }))));
  };
  const rows = [
    [["หลบสายตา / ออก", veil], ["เดินในมิติ", veilWalk], ["ยิง 1", () => shoot(1)], ["ยิง 2", () => shoot(2)], ["ยิง 3", () => shoot(3)], ["รีโหลด", () => play({ kind: "reload", id: "me", at: { x: V().x, y: V().y } })],
      ["มีด", () => strike("valKnife")], ["ปืน", () => strike("valGun")], ["ติดตัว +1", () => play({ kind: "gain", id: "me", at: { x: V().x, y: V().y }, n: 1 })]],
    [["จงปลาบปลื้ม", parallel], ["รู้จักตัวเอง", know], ["ตัวเหมือนวิ่ง", run], ["ทำลายตัวเหมือน", breakDouble], ["กลับโลกหลัก", () => dimOut()],
      ["แด่ตัวฉันทุกคน", clones], ["ร่างแยกหมดเวลา", cloneFade], ["ความยุติธรรม", justice]],
    [["มุมมองคู่ขนาน", () => setDimView(dimView === "par" ? null : "par"), dimView === "par"], ["มุมมองหลังผ้า", () => setDimView(dimView === "veil" ? null : "veil"), dimView === "veil"],
      ["คนละโลก", toggleGhost], ["ตัวเหมือน", toggleDouble], ["ธงปัก", () => setFlags((fs) => (fs.length ? [] : [{ x: 6, y: 6, ownerId: "me" }, { x: 9, y: 9, ownerId: "me" }]))], ["ล้าง", reset]],
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
ValentineFxDev.units = valUnits; // BoardPreview ใช้ตอนสร้างตัวละครจำลอง
