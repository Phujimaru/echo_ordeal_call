// เฉพาะ dev: หน้าดูกระดาน ?board=1&gyro=1 — ปุ่มเล่นเอฟเฟกต์ของไจโร เซปเปลี่ (gyroFx.js) โดยไม่ต้องเปิดห้องจริง
//  มุยมิ (me) กลายเป็นไจโร (ขี่ม้า) + ไจโรคนที่ 2 (g2 · สีอื่น) — ปุ่มสร้าง payload แบบเดียวกับ server (GRID_PLAN §7.11) แล้วผ่าน gyroEventFx เหมือนเกมจริง
//  ตำแหน่ง/ลูกบนพื้นจำลองแบบ server: อัปเดตหลังจบจังหวะ (GYRO_FX) — ระหว่างฉาก หมากถูกย้ายด้วย gyroPose แล้วค้างที่ปลายทางจน "state" มาถึง
//  คอนโซล: window.__gyroFx({ kind: "secret", id: "me", ... }) = ส่ง payload ของ socket "gyroFx" ตรงๆ
import { useEffect } from "react";
import { GYRO_FX, gyroBreakerMs, gyroEventFx } from "./gyroFx";

const IMG = "/characters/gyro_zeppeli/gyro.webp";
const G2 = { id: "g2", name: "ไจโร 2", img: IMG, color: "#D946EF", x: 13, y: 8, hp: 6, maxHp: 6, armor: 2, maxArmor: 2, gyro: { mounted: false, empowered: false, horseHp: 3 } };
function gyroUnits(list) {
  return [
    ...list.map((u) => (u.id === "me" ? { ...u, x: 2, y: 8, name: "ไจโร", img: IMG, color: "#2E9E4B", hp: 6, maxHp: 6, armor: 2, maxArmor: 2, gyro: { mounted: true, empowered: false, horseHp: 3 } } : u.id === "p4" ? { ...u, color: "#3B82C4" } : u)),
    G2,
  ];
}
const DIR4 = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
const DIR_KEYS = Object.keys(DIR4);
const isGyro = (u) => !!u && !!u.gyro;
let ballSeq = 10, dirN = 0; // ลำดับลูก (seq) · ทิศถัดไปของปุ่มวิชาลับ (วน 4 ทิศ)
const man = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const btn = { font: "500 13px Kanit, sans-serif", color: "#fff", cursor: "pointer", padding: "4px 9px", border: "1px solid rgba(120,230,70,.6)", background: "rgba(14,36,12,.94)" };
// ช่องทุกช่องที่เส้นตรง a → b (กลางช่อง) แตะ (ทแยงได้ · ผ่านมุม = นับทั้งสองข้าง)
function touchLine(a, b) {
  const out = [], seen = new Set(), ax = a.x + 0.5, ay = a.y + 0.5, bx = b.x + 0.5, by = b.y + 0.5, n = Math.ceil(Math.hypot(bx - ax, by - ay) * 40) || 1;
  for (let i = 0; i <= n; i++) {
    const x = ax + ((bx - ax) * i) / n, y = ay + ((by - ay) * i) / n;
    for (const [dx, dy] of [[0, 0], [1e-3, 1e-3], [-1e-3, -1e-3], [1e-3, -1e-3], [-1e-3, 1e-3]]) {
      const tx = Math.floor(x + dx), ty = Math.floor(y + dy), k = tx + "," + ty;
      if (!seen.has(k)) { seen.add(k); out.push({ x: tx, y: ty }); }
    }
  }
  return out;
}

export default function GyroFxDev({ units, setUnits, pushFx, setFocus, map, balls, setBalls }) {
  const get = (id) => units.find((u) => u.id === id);
  const inB = (x, y) => x >= 0 && y >= 0 && x < map.cols && y < map.rows;
  const occ = (x, y, skip = []) => units.some((u) => !skip.includes(u.id) && u.x === x && u.y === y);
  const free = (x, y, skip = []) => inB(x, y) && !map.terrain[`${x},${y}`] && !occ(x, y, skip);

  const ctx = {
    posOf: (id) => { const u = get(id); return u ? { x: u.x, y: u.y } : null; },
    sizeOf: () => 1,
    idAt: (t) => { const u = units.find((v) => v.x === t.x && v.y === t.y); return u ? u.id : null; },
    terrainAt: (x, y) => map.terrain[`${x},${y}`] || null,
  };
  const play = (ev) => {
    const out = gyroEventFx(ev, ctx);
    pushFx(out.fx);
    for (const [ms, list] of out.later) setTimeout(() => pushFx(list), ms);
    for (const ms of out.shake) setTimeout(() => pushFx([{ kind: "iceShake", x: 0, y: 0, amp: 4, dur: 300 }]), ms);
    if (out.look.length) setFocus(out.look[0][0]);
    return out;
  };
  useEffect(() => { window.__gyroFx = (ev) => play(ev); return () => { delete window.__gyroFx; }; });
  const move = (moves) => setUnits((us) => us.map((u) => (moves[u.id] ? { ...u, ...moves[u.id] } : u)));
  const setGyro = (id, patch) => setUnits((us) => us.map((u) => (u.id === id ? { ...u, gyro: { ...u.gyro, ...(typeof patch === "function" ? patch(u.gyro) : patch) } } : u)));
  const foes = (G) => units.filter((u) => u.id !== G.id).sort((a, b) => man(a, G) - man(b, G));
  const later = (ms, fn) => setTimeout(fn, ms);

  // ตีปกติ: ลูกบินไปเป้า · โดน = ผลักถอย 1 ช่อง (ชน = ไม่ขยับ) · ลูกค้างที่ช่องเดิมของเป้า
  const strike = (gid, { dodge = false, empowered = false, targetId = null } = {}) => {
    const G = get(gid), T = targetId ? get(targetId) : foes(G)[0];
    if (!G || !T) return null;
    const to = { x: T.x, y: T.y };
    play({ kind: "throw", id: G.id, color: G.color, from: { x: G.x, y: G.y }, to, land: to, hit: !dodge, counter: false, empowered });
    later(GYRO_FX.throw, () => {
      setBalls((bs) => [...(bs || []), { owner: G.id, color: G.color, x: to.x, y: to.y, seq: ++ballSeq }]);
      if (dodge || empowered) return;
      const dx = Math.sign(T.x - G.x), dy = Math.sign(T.y - G.y), step = Math.abs(T.x - G.x) >= Math.abs(T.y - G.y) ? [dx, 0] : [0, dy];
      if (free(T.x + step[0], T.y + step[1], [T.id])) move({ [T.id]: { x: T.x + step[0], y: T.y + step[1] } });
    });
    return { G, T };
  };
  const recall = (gid) => {
    const G = get(gid), mine = (balls || []).filter((b) => b.owner === gid).sort((a, b) => a.seq - b.seq);
    if (!G || !mine.length) return;
    const b = mine[0], path = touchLine(b, G).filter((t) => inB(t.x, t.y));
    const hits = units.filter((u) => u.id !== gid && path.some((t) => t.x === u.x && t.y === u.y)).map((u) => u.id);
    play({ kind: "recall", id: gid, color: G.color, from: { x: b.x, y: b.y }, to: { x: G.x, y: G.y }, path, hits });
    later(GYRO_FX.recall, () => setBalls((bs) => (bs || []).filter((x) => x !== b)));
  };
  const secret = (gid) => {
    // ทิศที่มีศัตรูในแนวมากสุด (เท่ากัน = วนตามลำดับ)
    const G = get(gid), lineOf = (d) => { const v = DIR4[d], out = []; for (let i = 1; i <= 8; i++) if (inB(G.x + v[0] * i, G.y + v[1] * i)) out.push({ x: G.x + v[0] * i, y: G.y + v[1] * i }); return out; };
    const count = (d) => units.filter((u) => u.id !== gid && lineOf(d).some((t) => t.x === u.x && t.y === u.y)).length;
    const order = DIR_KEYS.map((_, i) => DIR_KEYS[(dirN + i) % 4]), dir = order.reduce((b, d) => (count(d) > count(b) ? d : b), order[0]);
    dirN++;
    const v = DIR4[dir], tiles = lineOf(dir);
    const inLine = units.filter((u) => u.id !== gid && tiles.some((t) => t.x === u.x && t.y === u.y)).sort((a, b) => man(a, G) - man(b, G));
    const taken = new Set(units.filter((u) => !inLine.includes(u)).map((u) => `${u.x},${u.y}`)), pulls = [];
    for (const u of inLine) {
      let p = { x: u.x, y: u.y };
      for (let k = 0; k < 4; k++) {
        const n = { x: p.x - v[0], y: p.y - v[1] };
        if (!inB(n.x, n.y) || map.terrain[`${n.x},${n.y}`] || taken.has(`${n.x},${n.y}`)) break;
        p = n;
      }
      taken.add(`${p.x},${p.y}`);
      if (p.x !== u.x || p.y !== u.y) pulls.push({ id: u.id, from: { x: u.x, y: u.y }, to: p });
    }
    play({ kind: "secret", id: gid, color: G.color, from: { x: G.x, y: G.y }, dir, len: 8, tiles, hits: inLine.map((u) => u.id), pulls });
    later(GYRO_FX.secret, () => move(Object.fromEntries(pulls.map((p) => [p.id, p.to]))));
  };
  const golden = (gid) => {
    const G = get(gid);
    play({ kind: "golden", id: gid, color: G.color, at: { x: G.x, y: G.y } });
    later(GYRO_FX.golden, () => setGyro(gid, { empowered: true }));
  };
  // ตีเสริม: ขว้างลูกทอง → ระเบิด → เป้ากระเด็นตาม 1 ใน 8 ทิศจนสุดขอบ · ต้นไม้/รั้ว = พัง · เสา/ป้าย = เด้งข้าม · คนขวาง = ดันออกข้าง
  const breaker = (gid) => {
    const G = get(gid), T = foes(G)[0];
    if (!G || !T) return;
    strike(gid, { empowered: true, targetId: T.id });
    const ang = Math.round(Math.atan2(T.y - G.y, T.x - G.x) / (Math.PI / 4)) * (Math.PI / 4), v = [Math.round(Math.cos(ang)), Math.round(Math.sin(ang))];
    const path = [], jumps = [], smashed = [], shoves = [];
    const taken = new Set(units.filter((u) => u.id !== T.id).map((u) => `${u.x},${u.y}`));
    let x = T.x, y = T.y, last = { x, y };
    while (inB(x + v[0], y + v[1])) {
      x += v[0]; y += v[1];
      const k = `${x},${y}`, kind = map.terrain[k];
      path.push({ x, y });
      if (kind) { if (/pillar|banner|seal/.test(kind)) jumps.push({ x, y }); else smashed.push({ x, y }); continue; }
      const who = units.find((u) => u.id !== T.id && u.x === x && u.y === y);
      if (who) {
        const side = [[-v[1], v[0]], [v[1], -v[0]]].map(([sx, sy]) => ({ x: x + sx, y: y + sy })).find((p) => free(p.x, p.y) && !taken.has(`${p.x},${p.y}`));
        if (side) { shoves.push({ id: who.id, from: { x, y }, to: side }); taken.delete(k); taken.add(`${side.x},${side.y}`); }
      }
      if (!taken.has(k)) last = { x, y };
    }
    const cut = path.findIndex((p) => p.x === last.x && p.y === last.y);
    const fly = path.slice(0, cut + 1), dist = fly.length;
    later(GYRO_FX.throw, () => {
      play({ kind: "breaker", id: gid, color: G.color, targetId: T.id, from: { x: T.x, y: T.y }, to: last, path: fly, dist, dmg: Math.min(6, dist),
        jumps: jumps.filter((j) => fly.some((p) => p.x === j.x && p.y === j.y)), smashed: smashed.filter((j) => fly.some((p) => p.x === j.x && p.y === j.y)), shoves });
      setGyro(gid, { empowered: false });
      later(gyroBreakerMs(dist), () => move({ [T.id]: last, ...Object.fromEntries(shoves.map((s) => [s.id, s.to])) }));
    });
  };
  const horse = (gid, mode) => {
    const G = get(gid);
    play({ kind: "horse", id: gid, color: G.color, at: { x: G.x, y: G.y }, mode });
    setGyro(gid, (g) => ({ mounted: mode === "mount", horseHp: mode === "die" ? 0 : mode === "mount" && !(g.horseHp > 0) ? 3 : g.horseHp }));
  };
  const walk = (gid) => {
    // ควบตรง 3 ช่อง (ทิศที่ว่าง) — ฝุ่นกีบ + ได้สัดส่วนทองคำ
    const G = get(gid), dir = DIR_KEYS.find((d) => [1, 2, 3].every((i) => free(G.x + DIR4[d][0] * i, G.y + DIR4[d][1] * i, [gid])));
    if (!dir) return;
    const v = DIR4[dir];
    for (let i = 1; i <= 3; i++) later(i * 180, () => move({ [gid]: { x: G.x + v[0] * i, y: G.y + v[1] * i } }));
    later(600, () => play({ kind: "goldenTick", id: gid, color: G.color, at: { x: G.x + v[0] * 3, y: G.y + v[1] * 3 }, gain: 3 }));
  };
  const reset = () => {
    setBalls(null);
    setUnits((us) => us.map((u) => (isGyro(u) ? { ...u, gyro: { mounted: u.id === "me", empowered: false, horseHp: 3 } } : u)));
  };
  const rows = [
    [["ขว้าง", () => strike("me")], ["ขว้าง หลบ", () => strike("me", { dodge: true })], ["เรียกคืน", () => recall("me")], ["วิชาลับ", () => secret("me")],
      ["หมุนทองคำ", () => golden("me")], ["ตีเสริม", () => breaker("me")]],
    [["ขึ้นม้า", () => horse("me", "mount")], ["ลงม้า", () => horse("me", "dismount")], ["ม้าตาย", () => horse("me", "die")],
      ["ม้าโดนตี", () => setGyro("me", (g) => ({ horseHp: Math.max(0, (g.horseHp | 0) - 1) }))], ["ควบ", () => walk("me")],
      ["เสริมพลัง", () => setGyro("me", (g) => ({ empowered: !g.empowered }))], ["ไจโร 2 ขว้าง", () => strike("g2", { targetId: "me" })],
      ["ไจโร 2 เรียกคืน", () => recall("g2")], ["ล้าง", reset]],
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
GyroFxDev.units = gyroUnits; // BoardPreview ใช้ตอนสร้างตัวละครจำลอง
