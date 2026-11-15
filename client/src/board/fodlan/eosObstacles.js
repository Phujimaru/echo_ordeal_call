// ============================================================
//  ภาพของสนาม Eos — ถังระเบิด · คริสตัล · ป้อมปืน · drawObstacle (สิ่งกีดขวางทุกชนิด) · บ้าน Altissia
//  แยกออกจาก ./stage6.js (ย้ายโค้ดล้วน · พฤติกรรมเดิม) · stage6.js ยังส่งออกชื่อเดิมครบ
//  ⚠️ ห้ามเรียกของจาก ./index ตอนโหลดไฟล์ (index import stage6 — วน) · ใช้ได้ในฟังก์ชันวาดเท่านั้น
// ============================================================
import { P, depthOf, faceVisible, gEllipse, rng } from "../boardGeo";
import { fxT } from "./index";
import { TAU, hash, K, ease, fx, glowAt, poly, SUN, hull, box, STATIC_TR, BUILDING, SETS, LAST_NIGHT, palOf, zoneAt, shadeCol, faceLit, setLastNight } from "./eosBase";
import { treeShape, palmShape, pineTree, forestTree, rockShape } from "./eosFlora";
import { drawPillar } from "./eosPillars";
import { darkAt, lastFx, lampOn, drawLever, BRIDGE_UP, bridgeLeaf, drawDomeCore, drawBarrier, drawSwitch, drawWreck, elemOf, objAt, seedOf } from "./eosTownArt";
import { wallCracks } from "./eosUnits";
import { drawTomb } from "./eosCamp";
import { drawShrine, drawDiner, drawRanch, drawPump, drawBarricade } from "./eosPveArt";

// เงาทอดของของบนชั้น layer (ถัง/หินเวท — ไม่อยู่ในผังที่อบ castShadows) · วาดใน ground()
export function dynShadow(g, x, y, h, inset, night) {
  const ox = SUN.x * h, oy = SUN.y * h;
  const sq = [[x + inset, y + inset], [x + 1 - inset, y + inset], [x + 1 - inset, y + 1 - inset], [x + inset, y + 1 - inset]];
  const pts = hull([...sq, ...sq.map(([a, b]) => [a + ox, b + oy])]);
  g.beginPath(); pts.forEach(([a, b], i) => { const q = P(a, b); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.closePath();
  g.fillStyle = night ? "rgba(0,0,12,.22)" : "rgba(20,24,10,.26)"; g.fill();
}

// ทรงกระบอกตั้ง (ถังน้ำมัน / แป้นหมุนป้อม) · stripe = สีแถบเตือนอันตราย (ลายเฉียงดำ)
function cylPath(g, t, b, rx, ry) {
  g.beginPath(); g.moveTo(t[0] - rx, t[1]); g.lineTo(b[0] - rx, b[1]); g.ellipse(b[0], b[1], rx, ry, 0, Math.PI, 0, true); g.lineTo(t[0] + rx, t[1]);
  g.ellipse(t[0], t[1], rx, ry, 0, 0, Math.PI, false); g.closePath();
}
export function drum(g, cx, cy, r, h, col, stripe = null, z0 = 0) {
  const b = P(cx, cy, z0), t = P(cx, cy, z0 + h), rx = b[2] * r, ry = rx * 0.5;
  const gr = g.createLinearGradient(b[0] - rx, 0, b[0] + rx, 0);
  gr.addColorStop(0, col.dark); gr.addColorStop(0.3, col.body); gr.addColorStop(0.5, col.hi); gr.addColorStop(0.68, col.body); gr.addColorStop(1, col.dark);
  cylPath(g, t, b, rx, ry); g.fillStyle = gr; g.fill();
  if (stripe) {
    const lo = P(cx, cy, z0 + h * 0.48), up = P(cx, cy, z0 + h * 0.72);
    g.save();
    cylPath(g, up, lo, rx, ry); g.fillStyle = stripe; g.fill(); g.clip();
    g.fillStyle = "rgba(22,18,14,.92)";
    const bh = lo[1] - up[1] + ry * 2, w = rx * 0.3;
    for (let i = -3; i < 9; i++) {
      const x0 = lo[0] - rx + i * w * 2;
      g.beginPath(); g.moveTo(x0, up[1] - ry); g.lineTo(x0 + w, up[1] - ry); g.lineTo(x0 + w - bh * 0.7, lo[1] + ry); g.lineTo(x0 - bh * 0.7, lo[1] + ry); g.closePath(); g.fill();
    }
    g.restore();
  }
  // สันถัง + ฝา + จุกเติม
  g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 1;
  for (const k of [0.22, 0.86]) { const m = P(cx, cy, z0 + h * k); g.beginPath(); g.ellipse(m[0], m[1], rx, ry, 0, 0, Math.PI); g.stroke(); }
  g.fillStyle = col.hi; g.beginPath(); g.ellipse(t[0], t[1], rx, ry, 0, 0, TAU); g.fill();
  g.strokeStyle = col.dark; g.beginPath(); g.ellipse(t[0], t[1], rx * 0.8, ry * 0.8, 0, 0, TAU); g.stroke();
  g.fillStyle = col.dark; g.beginPath(); g.arc(t[0] + rx * 0.42, t[1], Math.max(1, rx * 0.13), 0, TAU); g.fill();
}

// ---------- ถังน้ำมัน Hammerhead (แดง/เหลือง + แถบเตือน) ----------
const DRUM_RED = { body: "#c8321f", dark: "#56120a", hi: "#ff8f72" }, DRUM_YEL = { body: "#e2b31a", dark: "#6e5005", hi: "#fff0a6" };
function drawBarrel(g, x, y) {
  const b = objAt("barrels", x, y), seed = b ? seedOf(b.id) : x * 7 + y;
  const [bx, by, s] = P(x + 0.5, y + 0.58);
  g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.ellipse(bx, by, s * 0.4, s * 0.15, 0, 0, TAU); g.fill();
  gEllipse(g, x + 0.66, y + 0.74, 0.2, 0.01, 14, 0.11); g.fillStyle = "rgba(18,12,8,.5)"; g.fill(); // คราบน้ำมัน
  const A = hash(seed, 1) < 0.5 ? DRUM_RED : DRUM_YEL, B = A === DRUM_RED ? DRUM_YEL : DRUM_RED;
  const drums = [
    { x: x + 0.32, y: y + 0.34, r: 0.17, h: 0.38, col: B, st: B === DRUM_RED ? "#f2c21b" : "#e8e2cf" },
    { x: x + 0.58, y: y + 0.6, r: 0.22, h: 0.5, col: A, st: A === DRUM_RED ? "#f2c21b" : "#e8e2cf" },
  ].sort((p, q) => depthOf(p.x, p.y) - depthOf(q.x, q.y));
  for (const d of drums) drum(g, d.x, d.y, d.r, d.h, d.col, d.st);
}

// ---------- แหล่งหินเวท (หิน + ผลึกเรืองตามธาตุ) ----------
export function shard(g, bx, by, len, w, ang, col, hi, a = 1) {
  const tx = bx + Math.sin(ang) * len, ty = by - Math.cos(ang) * len, nx = Math.cos(ang) * w, ny = Math.sin(ang) * w;
  const mx = bx + (tx - bx) * 0.55, my = by + (ty - by) * 0.55;
  const a0 = g.globalAlpha;
  g.globalAlpha = a0 * a; g.fillStyle = col;
  g.beginPath(); g.moveTo(bx - nx * 0.6, by - ny * 0.6); g.lineTo(mx - nx, my - ny); g.lineTo(tx, ty); g.lineTo(mx + nx, my + ny); g.lineTo(bx + nx * 0.6, by + ny * 0.6); g.closePath(); g.fill();
  g.globalAlpha = a0 * a * 0.6; g.fillStyle = hi;
  g.beginPath(); g.moveTo(bx - nx * 0.6, by - ny * 0.6); g.lineTo(mx - nx, my - ny); g.lineTo(tx, ty); g.lineTo(mx, my); g.closePath(); g.fill();
  g.globalAlpha = a0;
}
const SHARDS = [[-0.16, 0.04, 0.4, -0.55], [0.0, -0.02, 0.62, 0.05], [0.15, 0.03, 0.44, 0.5], [-0.05, 0.1, 0.28, -0.22], [0.24, 0.11, 0.24, 0.85]];
function drawCrystal(g, x, y, C, night, now) {
  const c = objAt("crystals", x, y), E = elemOf(c && c.element);
  const [sx, sy, s] = P(x + 0.5, y + 0.6);
  rockShape(g, sx, sy, s * 0.95, zoneAt(x, y) === "desert" ? C : { ...C, rock: C.stone, rock2: C.stone2 }, 0.5);
  const pulse = 0.5 + 0.5 * Math.sin(now / 520 + x * 1.3 + y);
  glowAt(g, sx, sy - s * 0.5, s * (night ? 1.25 : 0.9), E.rgb, (night ? 0.55 : 0.35) + 0.15 * pulse);
  const R = rng(x * 31 + y * 17);
  for (const [dx, dy, len, ang] of SHARDS) shard(g, sx + dx * s, sy - s * 0.32 + dy * s, s * len * (0.85 + R() * 0.3), s * 0.075, ang + (R() - 0.5) * 0.2, E.body, E.hi);
  if (Math.sin(now / 260 + x * 5 + y) > 0.8) { // ประกาย
    const px = sx + (R() - 0.5) * s * 0.4, py = sy - s * (0.55 + R() * 0.3), k = s * 0.06;
    g.fillStyle = "rgba(255,255,255,.9)"; g.fillRect(px - 1, py - k, 2, k * 2); g.fillRect(px - k, py - 1, k * 2, 2);
  }
}

// ---------- ป้อมปืนบนกำแพง Insomnia (หันตามเป้าล่าสุด / กวาดหาเป้า) ----------
export function rbox(g, cx, cy, ang, hl, hw, z0, z1, top, s1, s2) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const c = [[-hl, -hw], [hl, -hw], [hl, hw], [-hl, hw]].map(([u, v]) => [cx + u * ca - v * sa, cy + u * sa + v * ca]);
  const mid = depthOf(cx, cy);
  c.forEach((a, i) => {
    const b = c[(i + 1) % 4];
    if (depthOf((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) <= mid) return;
    poly(g, [[a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1]]); g.fillStyle = i % 2 ? s1 : s2; g.fill();
  });
  poly(g, c.map(([px, py]) => [px, py, z1])); g.fillStyle = top; g.fill();
  g.strokeStyle = "rgba(255,255,255,.16)"; g.lineWidth = 1; g.stroke();
}
const TURRET_GUN = "#1c1f24", TURRET_PLATE = { body: "#4a5058", dark: "#1e2227", hi: "#8a929c" };
function turretShot(x, y, now) {
  const e = lastFx("turret_shot");
  return e && e.from && e.from.x === x && e.from.y === y ? { e, p: fxT(e, now, fx.turret_shot) } : null;
}
function drawTurret(g, x, y, C, now) {
  try { return drawTurretBody(g, x, y, C, now); } finally { wallCracks(g, x, y); } // ป้อมบนกำแพงพังได้ (รอยร้าว + หลอดเลือด)
}
function drawTurretBody(g, x, y, C, now) {
  box(g, x, y + 0.15, x + 1, y + 0.85, 0.75, C.wall, C.wall2, C.wall);
  box(g, x + 0.16, y + 0.18, x + 0.84, y + 0.82, 0.88, C.stone, C.stone2, C.stone);
  const cx = x + 0.5, cy = y + 0.5, sh = turretShot(x, y, now);
  // มุม: ยิงล่าสุด = หันหาเป้า (ค้างไว้) · ไม่มี = กวาดช้าๆ หันออกนอกเมือง
  const out = Math.atan2(cy - 4, cx - 15.5);
  const a = sh && sh.e.to ? Math.atan2(sh.e.to.y + 0.5 - cy, sh.e.to.x + 0.5 - cx) : out + Math.sin(now / 2600 + x * 0.7) * 0.7;
  const firing = !!sh && sh.p < 0.6, recoil = firing ? Math.abs(Math.sin(sh.p * 32)) * 0.07 : 0;
  drum(g, cx, cy, 0.24, 0.1, TURRET_PLATE, null, 0.88);
  const ca = Math.cos(a), sa = Math.sin(a);
  const tip = (off) => [cx + ca * (0.66 - recoil) - sa * off, cy + sa * (0.66 - recoil) + ca * off];
  const guns = () => {
    for (const off of [-0.07, 0.07]) {
      const r0 = P(cx + ca * 0.1 - sa * off, cy + sa * 0.1 + ca * off, 1.13), t = tip(off), r1 = P(t[0], t[1], 1.13);
      g.strokeStyle = TURRET_GUN; g.lineWidth = Math.max(2, r0[2] * 0.06); g.lineCap = "round";
      g.beginPath(); g.moveTo(r0[0], r0[1]); g.lineTo(r1[0], r1[1]); g.stroke(); g.lineCap = "butt";
    }
  };
  const front = depthOf(...tip(0)) > depthOf(cx, cy);
  if (!front) guns();
  rbox(g, cx - ca * recoil, cy - sa * recoil, a, 0.24, 0.2, 0.98, 1.24, "#6a727c", "#3a4048", "#4d545d");
  if (front) {
    guns();
    const eye = P(cx + ca * 0.25, cy + sa * 0.25, 1.17);
    g.fillStyle = "#ff3a28"; g.beginPath(); g.arc(eye[0], eye[1], Math.max(1.2, eye[2] * 0.03), 0, TAU); g.fill();
    glowAt(g, eye[0], eye[1], eye[2] * 0.25, "255,60,40", 0.6);
  }
  const lt = P(cx, cy, 1.27);
  if (Math.sin(now / 300 + x) > 0.2) glowAt(g, lt[0], lt[1], lt[2] * 0.3, "255,60,40", 0.7);
  if (firing && Math.sin(sh.p * 60) > 0) for (const off of [-0.07, 0.07]) {
    const t = tip(off), m = P(t[0] + ca * 0.06, t[1] + sa * 0.06, 1.13);
    glowAt(g, m[0], m[1], m[2] * 0.45, "255,220,140", 0.95);
  }
}

export function drawObstacle(g, t, ctx, now) {
  setLastNight(!!(ctx && ctx.night));
  const C = palOf(ctx), night = LAST_NIGHT;
  const { x, y, kind } = t;
  if (kind === "fd_eos_water" || kind === "fd_eos_canal" || kind === "fd_eos_daemon") return; // น้ำวาดในพื้น · ปีศาจใน items
  if (kind === "fd_eos_pillar") { drawPillar(g, t, C, night, now); return; }
  if (kind === "fd_eos_lever") { drawLever(g, x, y, C, now); return; }
  if (kind === "fd_eos_bridgeup") { const e = lastFx("bridge"); bridgeLeaf(g, x, y, C, e && e.up ? BRIDGE_UP * ease(fxT(e, now, fx.bridge)) : BRIDGE_UP); return; }
  if (kind === "fd_eos_domecore") { drawDomeCore(g, x, y, C, night, now); return; }
  if (kind === "fd_eos_barrier") { drawBarrier(g, x, y, now); return; }
  if (kind === "fd_eos_switch") { drawSwitch(g, x, y, C, now); return; }
  if (kind === "fd_eos_wreck") { drawWreck(g, x, y, now); return; }
  if (kind === "fd_eos_mob" || kind === "fd_eos_chest") return; // มอนสเตอร์ · หีบสมบัติ วาดใน items
  if (kind === "fd_eos_barricade") { drawBarricade(g, x, y, C, now); return; }
  if (kind === "fd_eos_barrel") { drawBarrel(g, x, y); return; }
  if (kind === "fd_eos_crystal") { drawCrystal(g, x, y, C, night, now); return; }
  if (kind === "fd_eos_turret") { drawTurret(g, x, y, C, now); return; }
  if (kind === "fd_eos_tomb") { drawTomb(g, x, y, C, night, now); return; }
  if (kind === "fd_eos_shrine") { drawShrine(g, x, y, night, now); return; }
  if (kind === "fd_eos_diner") { drawDiner(g, x, y, night, now); return; }
  if (kind === "fd_eos_ranch") { drawRanch(g, x, y, night, now); return; }
  const [sx, sy, s] = P(x + 0.5, y + 0.6);
  const zone = zoneAt(x, y), r = hash(x, y);
  if (kind === "fd_eos_tree") {
    if (zone === "desert" || zone === "altissia") palmShape(g, sx, sy, s * 1.2, C, r);
    else if (zone === "north" || zone === "hills") pineTree(g, sx, sy, s * 1.3, C);
    else if (SETS.forest && (SETS.forest.has(K(x, y)) || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => SETS.forest.has(K(x + dx, y + dy))))) forestTree(g, sx, sy, s * (1.0 + r * 0.25), C, r, now, false);
    else treeShape(g, sx, sy, s * (1.05 + r * 0.3), C, r);
    return;
  }
  if (kind === "fd_eos_rock") { rockShape(g, sx, sy, s, zone === "desert" ? C : { ...C, rock: C.stone, rock2: C.stone2 }, r); return; }
  if (kind === "fd_eos_bldg") {
    const b = BUILDING.get(K(x, y)), h = b ? b.h : 1.2, tone = b ? b.id % 3 : 0;
    const same = (nx, ny) => { const o = BUILDING.get(K(x + nx, y + ny)); return !!(o && b && o.id === b.id); }; // ผนังด้านในของตึกเดียวกัน
    if (zone === "altissia") { drawAltHouse(g, x, y, b, same, C, night, s); return; }
    const top = C.bldg[tone], s1 = C.bldg[(tone + 1) % 3], s2 = C.bldg[(tone + 2) % 3];
    const hh = h;
    const faces = box(g, x, y, x + 1, y + 1, hh, top, s1, s2, 0, same);
    roofDeck(g, x, y, hh, top, same, C);
    if (hh > 1.4 && hash(x, y + 7) < 0.45) box(g, x + 0.25, y + 0.3, x + 0.55, y + 0.6, hh + 0.14, C.bldg[(tone + 1) % 3], C.bldg[(tone + 2) % 3], C.bldg[tone]);
    // หน้าต่าง: เฉพาะผนังด้านนอกที่มองเห็นจริง (เดิมวาดผนังทิศเดียวเสมอ → หมุนกล้องแล้วหน้าต่างลอยทะลุตึก)
    const R = rng(x * 37 + y * 11);
    for (const f of faces) {
      if (Math.abs(P(f.a[0], f.a[1], hh)[1] - P(f.a[0], f.a[1], 0)[1]) < s * 0.35) continue; // มุมบน: ผนังแบน ไม่วาดหน้าต่าง
      for (let zz = 0.25; zz < hh - 0.15; zz += 0.3) for (const t of [0.3, 0.7]) {
        const lit = R() < 0.55 && night && !darkAt(x, y);
        const px = f.a[0] + (f.b[0] - f.a[0]) * t + f.nx * 0.01, py = f.a[1] + (f.b[1] - f.a[1]) * t + f.ny * 0.01;
        const p = P(px, py, zz);
        g.fillStyle = lit ? C.winLit : C.win; g.fillRect(p[0] - s * 0.04, p[1] - s * 0.08, s * 0.08, s * 0.1);
        if (lit && R() < 0.25) glowAt(g, p[0], p[1] - s * 0.03, s * 0.18, "255,210,130", 0.35);
      }
    }
    return;
  }
  if (kind === "fd_eos_wall") {
    // หันตามแนวที่ต่อกัน (กำแพงข้างเมืองเป็นแนวตั้ง) · ไม่วาดผนังรอยต่อกับกำแพงช่องข้าง (เดิมเป็นแผ่นแนวนอนทุกช่อง = หมุนแล้วทะลุ)
    const isW = (dx, dy) => { const k = STATIC_TR[K(x + dx, y + dy)]; return k === "fd_eos_wall" || k === "fd_eos_turret"; };
    const vert = (isW(0, -1) || isW(0, 1)) && !(isW(-1, 0) || isW(1, 0));
    const join = (nx, ny) => isW(nx, ny);
    if (vert) {
      box(g, x + 0.15, y, x + 0.85, y + 1, 0.75, C.wall, C.wall2, C.wall, 0, join);
      for (let i = 0; i < 3; i++) box(g, x + 0.2, y + 0.05 + i * 0.33, x + 0.8, y + 0.25 + i * 0.33, 0.9, C.wall, C.wall2, C.wall);
    } else {
      box(g, x, y + 0.15, x + 1, y + 0.85, 0.75, C.wall, C.wall2, C.wall, 0, join);
      for (let i = 0; i < 3; i++) box(g, x + 0.05 + i * 0.33, y + 0.2, x + 0.25 + i * 0.33, y + 0.8, 0.9, C.wall, C.wall2, C.wall);
    }
    wallCracks(g, x, y);
    return;
  }
  if (kind === "fd_eos_lamp") {
    const base = P(x + 0.5, y + 0.5), top = P(x + 0.5, y + 0.5, 1.5);
    g.strokeStyle = C.lamp; g.lineWidth = Math.max(2, s * 0.06); g.beginPath(); g.moveTo(base[0], base[1]); g.lineTo(top[0], top[1]); g.stroke();
    g.fillStyle = C.lamp; g.fillRect(top[0] - s * 0.1, top[1] - s * 0.04, s * 0.2, s * 0.06);
    const fl = 0.85 + 0.15 * Math.sin(now / 170 + x), on = night && lampOn(x, y, now);
    g.fillStyle = on ? "#ffe2a0" : night ? "#5a5a52" : "#d8d3c0"; g.beginPath(); g.arc(top[0], top[1] + s * 0.04, s * 0.05, 0, TAU); g.fill();
    if (on) { glowAt(g, top[0], top[1], s * 0.9, "255,210,130", 0.75 * fl); glowAt(g, base[0], base[1], s * 0.8, "255,200,120", 0.35 * fl); }
    return;
  }
  if (kind === "fd_eos_pump") { drawPump(g, x, y, C, night, now, s); return; }
  if (kind === "fd_eos_garage") {
    box(g, x, y, x + 1, y + 1, 0.9, "#9a8f7a", "#6f6656", "#827866", 0, (nx, ny) => STATIC_TR[K(x + nx, y + ny)] === "fd_eos_garage"); // อู่หลายช่อง = หลังเดียว
    const on = night && !darkAt(x, y);
    const p = P(x + 0.5, y + 0.99, 0.35); g.fillStyle = on ? "#ffcc66" : "#3a3a3a"; g.fillRect(p[0] - s * 0.3, p[1] - s * 0.2, s * 0.6, s * 0.3);
    if (on) glowAt(g, p[0], p[1], s * 0.8, "255,200,100", 0.4);
  }
}

// หลังคาตึกเมือง (Insomnia/Hammerhead): ขอบกันตก (parapet) ตามขอบนอกของตึก + พื้นหลังคาเข้มกว่า + เครื่องปรับอากาศ/ช่องระบาย
//  (เดิมหลังคาเรียบสีเดียว → มองจากด้านบนเป็นกล่องเทาเปล่า)
function roofDeck(g, x, y, hh, top, same, C) {
  const iN = same(0, -1) ? 0 : 0.09, iS = same(0, 1) ? 0 : 0.09, iW = same(-1, 0) ? 0 : 0.09, iE = same(1, 0) ? 0 : 0.09;
  poly(g, [[x + iW, y + iN, hh], [x + 1 - iE, y + iN, hh], [x + 1 - iE, y + 1 - iS, hh], [x + iW, y + 1 - iS, hh]]);
  g.fillStyle = shadeCol(top, -0.1); g.fill();
  const r = hash(x * 3 + 11, y * 5 + 7);
  if (r < 0.32) {
    const ux = x + 0.22 + hash(x, y * 2) * 0.3, uy = y + 0.22 + hash(x * 2, y) * 0.3;
    box(g, ux, uy, ux + 0.24, uy + 0.18, hh + 0.12, C.roofUnit, C.roofUnit2, shadeCol(C.roofUnit, -0.18), hh);
    const fc = P(ux + 0.12, uy + 0.09, hh + 0.12), s = fc[2];
    g.strokeStyle = C.roofUnit2; g.lineWidth = 1; g.beginPath(); g.arc(fc[0], fc[1], s * 0.05, 0, TAU); g.stroke();
  } else if (r < 0.48) {
    const vx = x + 0.3 + hash(x, y + 3) * 0.35, vy = y + 0.3 + hash(x + 3, y) * 0.35;
    poly(g, [[vx, vy, hh], [vx + 0.14, vy, hh], [vx + 0.14, vy + 0.14, hh], [vx, vy + 0.14, hh]]); g.fillStyle = "rgba(0,0,0,.28)"; g.fill();
  }
}
// บ้านเมืองน้ำ Altissia (แบบเวนิส): ผนังพาสเทลต่อหลัง · หลังคาจั่วกระเบื้องดินเผา สันหลังคาตามแนวยาวของตึก (บ้านแถวต่อสันเดียวกัน)
//  ขอบบัวสีขาวใต้ชายคา · หน้าต่างโค้งมีบานเกล็ดเขียว · กระถางดอกไม้ใต้หน้าต่างบางบาน · ประตูโค้ง · ปล่องไฟบางหลัง
//  (เดิมเป็นกล่องส้มทึบ + จุดหน้าต่าง)
const ALT_AXIS = new Map(); // id ตึก → "x" | "y" (แนวสันหลังคา = ด้านยาวของตึก)
function altAxis(id) {
  if (ALT_AXIS.has(id)) return ALT_AXIS.get(id);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [k, v] of BUILDING) if (v.id === id) { const [a, c] = k.split(",").map(Number); x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, c); y1 = Math.max(y1, c); }
  const ax = x1 - x0 >= y1 - y0 ? "x" : "y";
  ALT_AXIS.set(id, ax);
  return ax;
}
function drawAltHouse(g, x, y, b, same, C, night, s) {
  const id = b ? b.id : 0, hh = 0.78 + hash(id, 9) * 0.3;
  const wall = C.altWalls[id % C.altWalls.length], roof = C.altRoofs[id % C.altRoofs.length];
  const faces = box(g, x, y, x + 1, y + 1, hh, wall, wall, shadeCol(wall, -0.1), 0, same);
  const R = rng(x * 41 + y * 13);
  for (const f of faces) {
    for (const t of [0.3, 0.7]) {
      const px = f.a[0] + (f.b[0] - f.a[0]) * t + f.nx * 0.01, py = f.a[1] + (f.b[1] - f.a[1]) * t + f.ny * 0.01;
      const p = P(px, py, hh * 0.55), w = s * 0.07, hgt = s * 0.13;
      if (Math.abs(P(px, py, hh)[1] - P(px, py, 0)[1]) < s * 0.35) continue; // มุมบน: ผนังแบนจนหน้าต่างกลายเป็นจุด — ไม่วาด
      const lit = night && R() < 0.6;
      // บานเกล็ด + หน้าต่างโค้ง
      g.fillStyle = C.shutter; g.fillRect(p[0] - w * 1.05, p[1] - hgt * 0.5, w * 0.32, hgt); g.fillRect(p[0] + w * 0.73, p[1] - hgt * 0.5, w * 0.32, hgt);
      g.fillStyle = lit ? C.winLit : "#3a3f4a";
      g.beginPath(); g.moveTo(p[0] - w * 0.5, p[1] + hgt * 0.5); g.lineTo(p[0] - w * 0.5, p[1] - hgt * 0.2); g.arc(p[0], p[1] - hgt * 0.2, w * 0.5, Math.PI, 0); g.lineTo(p[0] + w * 0.5, p[1] + hgt * 0.5); g.closePath(); g.fill();
      if (lit) glowAt(g, p[0], p[1], s * 0.16, "255,210,130", 0.3);
      // กระถางดอกไม้
      if (R() < 0.45) {
        g.fillStyle = "#7a4a2a"; g.fillRect(p[0] - w * 0.6, p[1] + hgt * 0.5, w * 1.2, s * 0.025);
        for (let i = 0; i < 3; i++) { g.fillStyle = C.flower[(i + id) % C.flower.length]; g.beginPath(); g.arc(p[0] - w * 0.4 + i * w * 0.4, p[1] + hgt * 0.5 - s * 0.008, Math.max(1, s * 0.018), 0, TAU); g.fill(); }
      }
      // ประตูโค้งชั้นล่าง (บางผนัง)
      if (t === 0.3 && R() < 0.35) {
        const d = P(px + (f.b[0] - f.a[0]) * 0.2, py + (f.b[1] - f.a[1]) * 0.2, 0);
        g.fillStyle = "#5a3a26"; g.beginPath(); g.moveTo(d[0] - w * 0.55, d[1]); g.lineTo(d[0] - w * 0.55, d[1] - s * 0.13); g.arc(d[0], d[1] - s * 0.13, w * 0.55, Math.PI, 0); g.lineTo(d[0] + w * 0.55, d[1]); g.closePath(); g.fill();
      }
    }
    // ขอบบัวสีขาวใต้ชายคา
    const a = P(f.a[0], f.a[1], hh - 0.04), c2 = P(f.b[0], f.b[1], hh - 0.04);
    g.strokeStyle = night ? "rgba(200,200,190,.35)" : "rgba(255,250,236,.9)"; g.lineWidth = Math.max(1.5, s * 0.035); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(c2[0], c2[1]); g.stroke();
  }
  // หลังคาจั่ว: สันตามแกนยาว · ปลายที่ติดบ้านหลังเดียวกันต่อสันไปถึงขอบช่อง (ไม่มีหน้าจั่วกลางตึก) · ชายคายื่นเฉพาะขอบนอก
  const ax = altAxis(id), rz = hh + 0.34, e = 0.04;
  const X0 = x - (same(-1, 0) ? 0 : e), X1 = x + 1 + (same(1, 0) ? 0 : e), Y0 = y - (same(0, -1) ? 0 : e), Y1 = y + 1 + (same(0, 1) ? 0 : e);
  let pa, pb, sides;
  if (ax === "x") {
    pa = [same(-1, 0) ? x : x + 0.3, y + 0.5]; pb = [same(1, 0) ? x + 1 : x + 0.7, y + 0.5];
    sides = [
      { pts: [[X0, Y0, hh], [X1, Y0, hh], [pb[0], pb[1], rz], [pa[0], pa[1], rz]], n: [0, -1] },
      { pts: [[X1, Y1, hh], [X0, Y1, hh], [pa[0], pa[1], rz], [pb[0], pb[1], rz]], n: [0, 1] },
      same(-1, 0) ? null : { pts: [[X0, Y1, hh], [X0, Y0, hh], [pa[0], pa[1], rz]], n: [-1, 0] },
      same(1, 0) ? null : { pts: [[X1, Y0, hh], [X1, Y1, hh], [pb[0], pb[1], rz]], n: [1, 0] },
    ];
  } else {
    pa = [x + 0.5, same(0, -1) ? y : y + 0.3]; pb = [x + 0.5, same(0, 1) ? y + 1 : y + 0.7];
    sides = [
      { pts: [[X0, Y1, hh], [X0, Y0, hh], [pa[0], pa[1], rz], [pb[0], pb[1], rz]], n: [-1, 0] },
      { pts: [[X1, Y0, hh], [X1, Y1, hh], [pb[0], pb[1], rz], [pa[0], pa[1], rz]], n: [1, 0] },
      same(0, -1) ? null : { pts: [[X1, Y0, hh], [X0, Y0, hh], [pa[0], pa[1], rz]], n: [0, -1] },
      same(0, 1) ? null : { pts: [[X0, Y1, hh], [X1, Y1, hh], [pb[0], pb[1], rz]], n: [0, 1] },
    ];
  }
  const list = sides.filter(Boolean).map((f) => ({ ...f, front: faceVisible(f.n[0], f.n[1], x + 0.5 + f.n[0] * 0.5, y + 0.5 + f.n[1] * 0.5) ? 1 : 0 }));
  list.sort((p, q) => p.front - q.front); // ด้านหลังก่อน แล้วด้านที่หันกล้องทับ
  for (const f of list) {
    poly(g, f.pts); g.fillStyle = shadeCol(roof, faceLit(f.n[0], f.n[1]) > 0 ? 0.1 : -0.16); g.fill();
    // แนวกระเบื้อง: เส้นขนานชายคา 2 เส้น
    g.strokeStyle = night ? "rgba(0,0,0,.25)" : "rgba(90,30,10,.22)"; g.lineWidth = 1;
    const A = f.pts[0], B = f.pts[1], Cc = f.pts[2], D = f.pts[3] || f.pts[2];
    for (const k of [0.35, 0.68]) {
      const pu = P(A[0] + (D[0] - A[0]) * k, A[1] + (D[1] - A[1]) * k, A[2] + (D[2] - A[2]) * k);
      const pv = P(B[0] + (Cc[0] - B[0]) * k, B[1] + (Cc[1] - B[1]) * k, B[2] + (Cc[2] - B[2]) * k);
      g.beginPath(); g.moveTo(pu[0], pu[1]); g.lineTo(pv[0], pv[1]); g.stroke();
    }
  }
  // สันหลังคา
  const r0 = P(pa[0], pa[1], rz), r1 = P(pb[0], pb[1], rz);
  g.strokeStyle = shadeCol(roof, -0.3); g.lineWidth = Math.max(1.5, s * 0.03); g.beginPath(); g.moveTo(r0[0], r0[1]); g.lineTo(r1[0], r1[1]); g.stroke();
  // ปล่องไฟ (บางช่อง)
  if (hash(x * 7, y * 3) < 0.22) {
    const cx = x + 0.62, cy = y + 0.3;
    box(g, cx, cy, cx + 0.12, cy + 0.12, rz + 0.08, shadeCol(roof, -0.05), shadeCol(roof, -0.2), shadeCol(roof, -0.32), hh + 0.15);
  }
}
