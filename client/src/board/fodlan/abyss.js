// ============================================================
//  Nautilus ชั้น 5 "ห้วงเหวไร้แสง" −10,000 ม. (area 50 · GRID_PLAN §8.9) — ภาพทั้งชั้น · ผัง server/fodlan/map11.js · กติกา server/fodlan/ntAbyss.js
//  ภูมิประเทศจริง (ผู้ใช้สั่ง 2026-11-19 — ไม่เอาของวางกระจาย · ลึกกว่า = มืดกว่า น่ากลัวกว่า):
//   ร่องลึกดำสนิทผ่ากระดานตะวันตก→ตะวันออก (ผนังหินบะซอลต์ดิ่งลงมีชั้นหิน · ก้นร่องมีแสงแมกมาแดงริบหรี่ · ร่องต่อออกไปนอกกระดานทั้งสองฝั่ง)
//   สะพานหินแคบ 2 แห่ง · โครงกระดูกเลวีอาธานยักษ์: กะโหลกทางเหนือ กระดูกสันหลังพาดข้ามร่อง ซี่โครงโค้งสูงข้ามหัว 4 คู่
//   ผาเสาหินบะซอลต์สองข้าง · หินแหลมมีฟองน้ำแก้ว/ลิลลี่ทะเล · บ่อน้ำเกลือ (ทะเลสาบใต้ทะเลผิวเงา ขอบหอยแมลงภู่ขาว) · หลุมดิ่ง
//   ดงแพลงก์ตอนเรืองแสงฟ้าเขียว · ยานสำรวจตก (ไฟกะพริบแดง) · ปลาตกเบ็ดซุ่มในร่อง แสงล่อห้อยเหนือขอบ (abyssFx.js)
//  ของที่ขยับ: แสงแพลงก์ตอนเต้น · แมกมาก้นร่องเต้นช้า · ผิวบ่อน้ำเกลือระยิบ (ground) · หิมะทะเล · ประกายเรืองแสง · ไซโฟโนฟอร์ล่องไกล · ดวงตาในความมืดกะพริบ (air)
// ============================================================
import { P, PS, depthOf, faceVisible, glow, pitchOf, rng, sceneSize } from "../boardGeo";
import { blobAt, hash, mix, nearDist } from "./reef";
import { drawThalassaAir, drawThalassaGround } from "./thalassaArt";
import { shipFx, shipItems } from "./shipArt";
import { ABYSS_FX, abyssAir, abyssAmbient, abyssFx, abyssGround, abyssItems } from "./abyssFx";

const TAU = Math.PI * 2;
const K = (x, y) => `${x},${y}`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const kinds = ["fd_nt_chasm", "fd_nt_cliff", "fd_nt_trenchrock", "fd_nt_skull", "fd_nt_rib", "fd_nt_probe", "fd_nt_pit", "fd_nt_bridge", "fd_nt_spine", "fd_nt_plankton", "fd_nt_brine", "fd_nt_whale", "fd_nt_ship"];
export const tall = ["fd_nt_cliff", "fd_nt_trenchrock"];
export const fogRGB = "0,1,5";
export const fx = ABYSS_FX;

// ---------- สี (ก้นร่อง 10 กม. = เกือบดำ อมน้ำเงินเย็น) ----------
const BASE = {
  ground1: "#04060c", ground2: "#000000", tile: "rgba(0,0,0,0)", tile2: "rgba(0,0,0,0)",
  grid: "rgba(120,150,255,.05)", border: "rgba(110,140,230,.2)", spawn: "rgba(150,170,255,.28)",
  light: ["rgba(80,110,200,.03)", "rgba(0,0,4,.5)"], nightTint: null, shadow: "rgba(0,0,0,.6)",
  sky: ["#050811", "#020409", "#000002"], fog: "0,1,5",
  ooze: "#10141e", ooze2: "#141925", oozeDark: "#07090f", bed: "#080a11",
  basalt: ["#2a303d", "#1a1f2a", "#0e1119"], bone: ["#cdc4ab", "#9f9680", "#615c4e"],
  brine: "#081322", brineEdge: "#c9c7b4", plank: "#0c2423", magma: "70,120,180",
};
const PAL = { day: BASE, night: BASE };

// ---------- ข้อมูลผัง (info จาก boardBake) ----------
let ZCACHE = null;
export function zones(info) {
  if (ZCACHE && ZCACHE.info === info) return ZCACHE;
  const sp = new Map(), tk = info.terrainKind || {};
  for (const s of info.special || []) sp.set(K(s.x, s.y), s.kind);
  const kindAt = (x, y) => tk[K(x, y)] || sp.get(K(x, y)) || null;
  const list = (k) => { const out = []; for (let y = 0; y < info.rows; y++) for (let x = 0; x < info.cols; x++) if (kindAt(x, y) === k) out.push({ x, y }); return out; };
  const Z = { info, kindAt, chasm: list("fd_nt_chasm"), cliff: list("fd_nt_cliff"), rock: list("fd_nt_trenchrock"), skull: list("fd_nt_skull"), rib: list("fd_nt_rib"), probe: list("fd_nt_probe"), pit: list("fd_nt_pit"), bridge: list("fd_nt_bridge"), spine: list("fd_nt_spine"), plankton: list("fd_nt_plankton"), brine: list("fd_nt_brine") };
  // ช่องว่างเหนือร่อง (ร่อง + สะพาน + กระดูกสันหลังช่วงที่ข้ามร่อง) — ผนังร่องดิ่งลงใต้ช่องเหล่านี้
  const isCh = (x, y) => kindAt(x, y) === "fd_nt_chasm";
  Z.void = new Set([...Z.chasm, ...Z.bridge, ...Z.spine.filter((t) => isCh(t.x - 1, t.y) && isCh(t.x + 1, t.y))].map((t) => K(t.x, t.y)));
  Z.voidList = [...Z.void].map((k) => { const [x, y] = k.split(",").map(Number); return { x, y }; });
  // คู่ซี่โครง: ฐานซ้าย–ขวาแถวเดียวกัน
  const rows = new Map();
  for (const r of Z.rib) { if (!rows.has(r.y)) rows.set(r.y, []); rows.get(r.y).push(r.x); }
  Z.ribs = [...rows.entries()].filter(([, xs]) => xs.length >= 2).map(([y, xs]) => ({ y, x0: Math.min(...xs), x1: Math.max(...xs) }));
  // ร่องนอกกระดาน: แถวของร่องที่ขอบซ้าย/ขวา
  const edgeRows = (x) => Z.chasm.filter((t) => t.x === x).map((t) => t.y);
  Z.edgeL = edgeRows(0); Z.edgeR = edgeRows(info.cols - 1);
  ZCACHE = Z;
  return Z;
}
const quadAt = (g, x, y, pad = 0, z = 0) => { const a = P(x - pad, y - pad, z), b = P(x + 1 + pad, y - pad, z), c = P(x + 1 + pad, y + 1 + pad, z), d = P(x - pad, y + 1 + pad, z); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath(); };
export function voidClip(g, Z, pad = 0) { g.beginPath(); for (const t of Z.voidList) quadAt(g, t.x, t.y, pad); }
function poly(g, pts) { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); }

// =================================================================== ธีม (อบ)
export const theme = {
  pal: PAL,
  // มวลน้ำดำสนิท · ผนังร่องยักษ์สองฝั่งไกลลิบลู่เข้าหาเส้นขอบฟ้า · แสงแมกมาริบหรี่ตามแนวร่องไกล · จุดเรืองแสงประปราย
  back(c) {
    const { g, C, bY, VX0, VW, VY0 } = c;
    const gr = g.createLinearGradient(0, VY0, 0, bY + 40);
    gr.addColorStop(0, "#03050b"); gr.addColorStop(0.5, C.sky[1]); gr.addColorStop(1, C.sky[2]);
    g.fillStyle = gr; g.fillRect(VX0, VY0, VW, bY + 40 - VY0);
    const mid = VX0 + VW / 2;
    // ผนังร่องไกล (ซ้าย/ขวา) — ทรงเสาหินซ้อนกัน มืดลงตามระยะ
    for (const side of [-1, 1]) for (let layer = 0; layer < 3; layer++) {
      const col = ["rgba(14,18,30,.55)", "rgba(9,12,21,.8)", "rgba(5,7,13,.95)"][layer], R = rng(side * 13 + layer * 7 + 50);
      g.fillStyle = col; g.beginPath();
      const inner = mid + side * (60 + layer * 70), outer = side < 0 ? VX0 - 10 : VX0 + VW + 10, top = VY0 - 10, base = bY + 20;
      g.moveTo(outer, base); g.lineTo(outer, top);
      for (let i = 0; i <= 24; i++) {
        const u = i / 24, x = outer + (inner - outer) * u, jag = (R() - 0.5) * 18;
        const y = top + (base - top) * (0.05 + Math.pow(u, 2.2) * (0.55 - layer * 0.12)) + jag;
        g.lineTo(x, y);
      }
      g.lineTo(inner, base); g.closePath(); g.fill();
      // เส้นเสาหินแนวตั้งจางๆ
      g.strokeStyle = `rgba(60,80,130,${0.05 - layer * 0.012})`; g.lineWidth = 1;
      for (let i = 0; i < 26; i++) { const x = outer + (inner - outer) * R(); g.beginPath(); g.moveTo(x, top); g.lineTo(x + (R() - 0.5) * 6, base); g.stroke(); }
    }
    // แสงแมกมาก้นร่องไกล (แนวกลางจอที่เส้นขอบฟ้า)
    g.save(); g.globalCompositeOperation = "lighter";
    const mg = g.createRadialGradient(mid, bY + 6, 4, mid, bY + 6, VW * 0.22);
    mg.addColorStop(0, "rgba(20,45,90,.14)"); mg.addColorStop(1, "rgba(20,45,90,0)");
    g.fillStyle = mg; g.fillRect(VX0, bY - VW * 0.1, VW, VW * 0.2);
    // จุดเรืองแสงไกล (สิ่งมีชีวิตห้วงลึก) + หิมะทะเลนิ่ง
    const R = rng(91);
    for (let i = 0; i < 70; i++) { const x = VX0 + R() * VW, y = VY0 + R() * (bY - VY0), a = 0.08 + R() * 0.25; g.fillStyle = R() < 0.7 ? `rgba(120,200,255,${a})` : `rgba(160,255,220,${a})`; g.fillRect(x, y, 1.4, 1.4); }
    g.restore();
  },
  // พื้นก้นร่องนอกกระดาน: โคลนละเอียดมืดลงจนดำสนิทตามระยะ (ร่องลึกต่อออกไปนอกกระดานวาดสดใน ground — ตามการหมุนกระดาน)
  ground(c) {
    const { g, C, R, bY, wx0, wx1, wy1 } = c, { cols, rows } = sceneSize();
    for (let d = 22; d >= 0; d--) {
      const e = 0.4 + d * 1.2, x0 = -e, y0 = -e, x1 = cols + e, y1 = rows + e * 0.5, pts = [];
      for (let i = 0; i <= 40; i++) {
        const u = i / 40, side = Math.floor(u * 4), f = u * 4 - side, w = (hash(i, d) - 0.5) * 0.9;
        const p = side === 0 ? [x0 + (x1 - x0) * f, y0 + w] : side === 1 ? [x1 + w, y0 + (y1 - y0) * f] : side === 2 ? [x1 - (x1 - x0) * f, y1 + w] : [x0 + w, y1 - (y1 - y0) * f];
        pts.push(PS(p[0], p[1]));
      }
      g.fillStyle = mix(C.bed, "#000000", Math.min(1, 0.15 + d / 14)); poly(g, pts); g.fill();
    }
    const n = Math.min(500, Math.round((wx1 - wx0) * (wy1 + 1) * 0.3));
    for (let i = 0; i < n; i++) {
      const x = wx0 + R() * (wx1 - wx0), y = -2 + R() * (wy1 + 2), [sx, sy, s] = PS(x, y); if (sy < bY) continue;
      g.fillStyle = R() < 0.6 ? "rgba(70,85,110,.12)" : "rgba(0,0,0,.35)";
      g.beginPath(); g.ellipse(sx, sy, s * (0.2 + R() * 0.5), s * (0.06 + R() * 0.08), 0, 0, TAU); g.fill();
    }
  },
  // ข้างกระดาน: เสาหินบะซอลต์สูงชันเป็นกำแพงร่อง (ซ้าย/ขวา/ไกล) จมหายในความมืด
  side(c) {
    const { g, C, VX0, VX1, VW } = c, { cols, rows } = sceneSize();
    const rs = rng(313), band = 3 + Math.max(0, (VW - 1280) / 60), list = [];
    for (let i = 0; i < 70; i++) { list.push([-1.3 - rs() * band, rs() * (rows + 1) - 0.5, rs()]); list.push([cols + 0.3 + rs() * band, rs() * (rows + 1) - 0.5, rs()]); }
    for (let i = 0; i < 34; i++) list.push([rs() * (cols + 4) - 2, -1.3 - rs() * 3, rs()]);
    list.sort((a, b) => a[1] - b[1]).forEach(([x, y, r]) => {
      const [sx, sy, s] = PS(x, y); if (sx < VX0 - 120 || sx > VX1 + 120) return;
      const fog = clamp((-y + Math.max(0, -x, x - cols)) / 6, 0, 0.85);
      basaltColumn(g, sx, sy, s * (0.35 + r * 0.3), s * (0.9 + r * 1.5), C, r * 97);
      if (fog > 0) { g.fillStyle = `rgba(0,1,5,${fog})`; g.fillRect(sx - s * 0.5, sy - s * 4.2, s, s * 4.4); }
    });
  },
  // พื้นกระดานทั้งผืน: โคลนก้นร่อง → ร่องลึก (ผนังดิ่ง) → สะพานหิน/กระดูกสันหลัง → บ่อน้ำเกลือ → หลุมดิ่ง → ดงแพลงก์ตอน (ฐานมืด แสงวาดสด)
  base(c) {
    const { g, C, info } = c, Z = zones(info), cols = info.cols, rows = info.rows;
    poly(g, [P(-0.2, -0.2), P(cols + 0.2, -0.2), P(cols + 0.2, rows + 0.2), P(-0.2, rows + 0.2)]); g.fillStyle = C.bed; g.fill();
    // 1) โคลนละเอียด (ooze) เป็นปื้น — จางลงใกล้ร่อง (หินโผล่)
    for (let y = -1; y <= rows; y++) for (let x = -1; x <= cols; x++) {
      if (Z.void.has(K(x, y))) continue;
      const dv = nearDist(Z.voidList, x + 0.5, y + 0.5), t = clamp((dv - 0.6) / 3.5, 0, 1);
      blobAt(g, x + 0.5, y + 0.5, 0.74, 0, 12, x * 29 + y * 11, 0.26);
      g.fillStyle = mix(C.oozeDark, (x * 3 + y) % 3 ? C.ooze : C.ooze2, t); g.fill();
    }
    // 2) ลายคลื่นตะกอน + หินกรวดบะซอลต์ใกล้ขอบร่อง
    const R = rng(77);
    for (let i = 0; i < cols * rows * 1.1; i++) {
      const x = R() * cols, y = R() * rows; if (Z.void.has(K(Math.floor(x), Math.floor(y)))) continue;
      const dv = nearDist(Z.voidList, x, y), [sx, sy, s] = P(x, y, 0.01);
      if (dv < 1.6 && R() < 0.7) { g.fillStyle = R() < 0.5 ? "#1d2230" : "#11151f"; g.beginPath(); g.ellipse(sx, sy, s * (0.05 + R() * 0.09), s * (0.03 + R() * 0.04), R() * 3, 0, TAU); g.fill(); }
      else { g.fillStyle = "rgba(120,140,180,.07)"; g.beginPath(); g.ellipse(sx, sy, s * (0.1 + R() * 0.2), s * 0.015, 0, 0, TAU); g.fill(); }
    }
    // 3) ร่องลึก: ดำ + ผนังดิ่งลง (เห็นแต่ผนังที่หันหากล้อง · ตัดให้อยู่ในปากร่อง)
    chasm(g, Z, C, info);
    // 4) บ่อน้ำเกลือ: ผิวเงาดำอมฟ้า + ขอบหอยแมลงภู่/เสื่อแบคทีเรียขาว
    for (const t of Z.brine) { blobAt(g, t.x + 0.5, t.y + 0.5, 0.86, 0, 14, t.x * 7 + t.y * 5, 0.16); g.fillStyle = "#1c2230"; g.fill(); }
    for (const t of Z.brine) { blobAt(g, t.x + 0.5, t.y + 0.5, 0.7, 0, 14, t.x * 7 + t.y * 5 + 3, 0.14); g.fillStyle = C.brine; g.fill(); }
    for (const t of Z.brine) {
      const R2 = rng(t.x * 31 + t.y * 7);
      for (let i = 0; i < 26; i++) {
        const a = R2() * TAU, rr = 0.66 + R2() * 0.2, x = t.x + 0.5 + Math.cos(a) * rr, y = t.y + 0.5 + Math.sin(a) * rr;
        if (Z.kindAt(Math.floor(x), Math.floor(y)) === "fd_nt_brine" && nearDist(Z.brine, x, y) < 0.45) continue; // ในบ่อ = ไม่มีหอย
        const [sx, sy, s] = P(x, y, 0.01); g.fillStyle = R2() < 0.6 ? "rgba(205,200,180,.5)" : "rgba(120,110,95,.6)";
        g.beginPath(); g.ellipse(sx, sy, s * 0.035, s * 0.02, a, 0, TAU); g.fill();
      }
    }
    // 5) หลุมดิ่ง: ขอบหินแล้วดิ่งดำ
    for (const t of Z.pit) {
      blobAt(g, t.x + 0.5, t.y + 0.5, 0.62, 0, 18, t.x * 13 + t.y, 0.14); g.fillStyle = "#1a1f2b"; g.fill();
      g.save(); blobAt(g, t.x + 0.5, t.y + 0.5, 0.52, 0, 18, t.x * 13 + t.y, 0.1); g.clip(); // ดิ่งลงในปากหลุมเท่านั้น
      for (let i = 0; i < 6; i++) { blobAt(g, t.x + 0.5, t.y + 0.5 - i * 0.04, 0.52 * (1 - i / 9), -i * 0.4, 18, t.x * 13 + t.y + i, 0.1); g.fillStyle = mix("#0c0f17", "#000000", i / 3); g.fill(); }
      g.restore();
    }
    // 6) ดงแพลงก์ตอน: โคลนเขียวมืด (แสงวาดสด)
    for (const t of Z.plankton) { blobAt(g, t.x + 0.5, t.y + 0.5, 0.9, 0, 14, t.x * 17 + t.y * 3, 0.3); g.fillStyle = C.plank; g.globalAlpha = 0.8; g.fill(); g.globalAlpha = 1; }
    // 7) สะพานหิน + กระดูกสันหลัง (ทับร่อง)
    for (const t of Z.bridge) bridgeSlab(g, t, Z, C);
    for (const t of Z.spine) vertebra(g, t, Z, C);
    // 8) เงาใต้ผาสองข้าง
    for (const t of Z.cliff) { blobAt(g, t.x + 0.5, t.y + 0.5, 1.1, 0, 12, t.x + t.y * 3, 0.2); g.fillStyle = "rgba(0,0,0,.35)"; g.fill(); }
  },
  grid({ g, C, info }) {
    const Z = zones(info);
    g.strokeStyle = C.grid; g.lineWidth = 1;
    for (let y = 0; y < info.rows; y++) for (let x = 0; x < info.cols; x++) {
      const k = Z.kindAt(x, y);
      if (k === "fd_nt_chasm" || k === "fd_nt_pit" || k === "fd_nt_cliff") continue;
      const a = P(x, y), b = P(x + 1, y), c2 = P(x + 1, y + 1);
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c2[0], c2[1]); g.stroke();
    }
    return true;
  },
};
// ผนังร่อง: ทุกขอบของช่องว่างที่ติดพื้น → แผ่นหินดิ่งลง D ช่อง · ชั้นหินเป็นริ้ว · ก้นร่องแสงแมกมาจาง (อบ — เต้นวาดสดใน ground)
const DEPTH = 3.4;
function chasm(g, Z, C, info) {
  g.save(); voidClip(g, Z); g.clip();
  g.fillStyle = "#000"; voidClip(g, Z, 0.02); g.fill();
  const walls = [];
  for (const t of Z.voidList) for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
    const nx = t.x + dx, ny = t.y + dy;
    if (Z.void.has(K(nx, ny)) || nx < 0 || nx >= info.cols) continue;
    const e = dy < 0 ? [t.x, t.y, t.x + 1, t.y] : dy > 0 ? [t.x, t.y + 1, t.x + 1, t.y + 1] : dx < 0 ? [t.x, t.y, t.x, t.y + 1] : [t.x + 1, t.y, t.x + 1, t.y + 1];
    const mx = (e[0] + e[2]) / 2, my = (e[1] + e[3]) / 2;
    if (!faceVisible(-dx, -dy, mx, my)) continue;
    walls.push({ e, d: depthOf(mx - dx * 0.5, my - dy * 0.5), seed: t.x * 7 + t.y * 13 + dx * 3 + dy });
  }
  walls.sort((a, b) => a.d - b.d);
  for (const w of walls) {
    const [ax, ay, bx, by] = w.e;
    const a0 = P(ax, ay, 0), b0 = P(bx, by, 0), b1 = P(bx, by, -DEPTH), a1 = P(ax, ay, -DEPTH);
    const lg = g.createLinearGradient(0, (a0[1] + b0[1]) / 2, 0, (a1[1] + b1[1]) / 2);
    lg.addColorStop(0, C.basalt[1]); lg.addColorStop(0.12, C.basalt[2]); lg.addColorStop(0.4, "#020306"); lg.addColorStop(1, "#000");
    g.fillStyle = lg; poly(g, [a0, b0, b1, a1]); g.fill();
    // ริ้วชั้นหิน + รอยแตกแนวดิ่ง (เสาบะซอลต์)
    g.strokeStyle = "rgba(80,95,130,.07)"; g.lineWidth = 1;
    for (let i = 1; i <= 2; i++) { const z = -DEPTH * (i / 9) + (hash(w.seed, i) - 0.5) * 0.15, p = P(ax, ay, z), q = P(bx, by, z + (hash(i, w.seed) - 0.5) * 0.2); g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke(); }
    g.strokeStyle = "rgba(150,180,235,.16)"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(a0[0], a0[1]); g.lineTo(b0[0], b0[1]); g.stroke(); // ขอบปากร่องรับแสงจาง
  }
  // ก้นร่อง: แสงแมกมาจาง
  g.globalCompositeOperation = "lighter";
  const bird = pitchOf() >= 80;
  for (const t of Z.voidList) { const [sx, sy, s] = P(t.x + 0.5, t.y + 0.5, -DEPTH); glow(g, sx, sy, s * 0.8, C.magma, (bird ? 0.015 : 0.03) * hash(t.y, t.x)); }
  g.restore();
  // ปากร่อง: ขอบหินขรุขระ (แนวสันมืด + ไฮไลต์บางที่ขอบไกล)
  for (const t of Z.voidList) for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
    const nx = t.x + dx, ny = t.y + dy;
    if (Z.void.has(K(nx, ny)) || nx < 0 || nx >= info.cols || ny < 0 || ny >= info.rows) continue;
    const R = rng(t.x * 41 + t.y * 3 + dx + dy * 5);
    for (let i = 0; i < 5; i++) {
      const u = (i + R()) / 5, x = dx ? t.x + (dx > 0 ? 1 : 0) + dx * 0.04 : t.x + u, y = dy ? t.y + (dy > 0 ? 1 : 0) + dy * 0.04 : t.y + u;
      const [sx, sy, s] = P(x, y, 0.02); g.fillStyle = R() < 0.5 ? C.basalt[0] : C.basalt[1];
      g.beginPath(); g.ellipse(sx, sy, s * (0.07 + R() * 0.07), s * (0.035 + R() * 0.03), R() * 3, 0, TAU); g.fill();
    }
  }
}
// สะพานหินธรรมชาติ: แผ่นหินหนาขรุขระพาดข้ามร่อง (ด้านล่างดิ่งเป็นท้องโค้ง)
function bridgeSlab(g, t, Z, C) {
  const cx = t.x + 0.5, cy = t.y + 0.5, vert = Z.kindAt(t.x, t.y - 1) === "fd_nt_bridge" || Z.kindAt(t.x, t.y + 1) === "fd_nt_bridge" || Z.kindAt(t.x, t.y - 1) !== "fd_nt_chasm";
  const hw = 0.38, ring = [];
  for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU, rx = (vert ? hw : 0.55) * (0.85 + hash(t.x * 5 + i, t.y) * 0.3), ry = (vert ? 0.55 : hw) * (0.85 + hash(t.x, t.y * 5 + i) * 0.3); ring.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
  // ท้องสะพาน (เห็นจากด้านข้าง)
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i], q = ring[(i + 1) % ring.length];
    if (!faceVisible(Math.cos(((i + 0.5) / 14) * TAU), Math.sin(((i + 0.5) / 14) * TAU), (p[0] + q[0]) / 2, (p[1] + q[1]) / 2)) continue;
    g.fillStyle = i % 2 ? C.basalt[2] : C.basalt[1];
    poly(g, [P(p[0], p[1], 0), P(q[0], q[1], 0), P(q[0], q[1], -0.55 - hash(i, t.y) * 0.2), P(p[0], p[1], -0.5 - hash(t.x, i) * 0.2)]); g.fill();
  }
  poly(g, ring.map(([x, y]) => P(x, y, 0.02))); g.fillStyle = C.basalt[0]; g.fill();
  const R = rng(t.x * 19 + t.y * 23);
  for (let i = 0; i < 6; i++) { const [sx, sy, s] = P(cx + (R() - 0.5) * 0.5, cy + (R() - 0.5) * 0.6, 0.03); g.fillStyle = R() < 0.5 ? "#353c4b" : "#20252f"; g.beginPath(); g.ellipse(sx, sy, s * 0.08, s * 0.04, R() * 3, 0, TAU); g.fill(); }
  g.strokeStyle = "rgba(0,0,0,.45)"; g.lineWidth = 1; { const a = P(cx - 0.2, cy - 0.3, 0.03), b = P(cx + 0.1, cy + 0.25, 0.03); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); } // รอยร้าว
}
// ข้อกระดูกสันหลังเลวีอาธาน: ตัวกระดูกทรงกระบอกนอน + ปีกกระดูกขวาง (เดินบนนี้ได้)
function vertebra(g, t, Z, C) {
  const cx = t.x + 0.5, cy = t.y + 0.5, over = Z.void.has(K(t.x, t.y));
  // ปีกขวางซ้าย/ขวา
  for (const sd of [-1, 1]) {
    const a = P(cx + sd * 0.18, cy - 0.06, 0.12), b = P(cx + sd * 0.62, cy - 0.12, 0.05), c = P(cx + sd * 0.62, cy + 0.02, 0.05), d = P(cx + sd * 0.18, cy + 0.08, 0.12);
    g.fillStyle = C.bone[1]; poly(g, [a, b, c, d]); g.fill();
  }
  // ตัวข้อ: ด้านข้างลงไป (ข้ามร่อง = ลึกกว่า)
  const low = over ? -0.45 : 0;
  for (const sd of [-1, 1]) if (faceVisible(sd, 0, cx + sd * 0.3, cy)) { g.fillStyle = C.bone[2]; poly(g, [P(cx + sd * 0.3, cy - 0.42, 0.16), P(cx + sd * 0.3, cy + 0.42, 0.16), P(cx + sd * 0.26, cy + 0.42, low), P(cx + sd * 0.26, cy - 0.42, low)]); g.fill(); }
  if (faceVisible(0, 1, cx, cy + 0.42)) { g.fillStyle = C.bone[2]; poly(g, [P(cx - 0.3, cy + 0.42, 0.16), P(cx + 0.3, cy + 0.42, 0.16), P(cx + 0.26, cy + 0.42, low), P(cx - 0.26, cy + 0.42, low)]); g.fill(); }
  // หน้าบน (ข้อต่อสองข้อต่อช่อง)
  for (const off of [-0.22, 0.22]) {
    const ring = []; for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; ring.push(P(cx + Math.cos(a) * 0.32, cy + off + Math.sin(a) * 0.2, 0.16)); }
    poly(g, ring); g.fillStyle = C.bone[0]; g.fill();
    g.strokeStyle = "rgba(60,55,45,.6)"; g.lineWidth = 1; g.stroke();
  }
  // คราบ/รูพรุนบนกระดูก
  const R = rng(t.x * 7 + t.y * 31);
  for (let i = 0; i < 5; i++) { const [sx, sy, s] = P(cx + (R() - 0.5) * 0.45, cy + (R() - 0.5) * 0.7, 0.17); g.fillStyle = "rgba(70,62,48,.5)"; g.beginPath(); g.arc(sx, sy, s * 0.02, 0, TAU); g.fill(); }
}
// เสาหินบะซอลต์ (จุดบนจอ) — ใช้ข้างกระดาน
function basaltColumn(g, x, y, w, h, C, seed) {
  g.fillStyle = "rgba(0,0,0,.5)"; g.beginPath(); g.ellipse(x, y, w * 0.9, w * 0.3, 0, 0, TAU); g.fill();
  const n = 3 + Math.floor(hash(seed, 1) * 3);
  for (let i = 0; i < n; i++) {
    const ox = (i - (n - 1) / 2) * w * 0.42, hh = h * (0.55 + hash(seed, i + 2) * 0.45), ww = w * 0.24;
    g.fillStyle = i % 2 ? C.basalt[2] : C.basalt[1]; g.fillRect(x + ox - ww, y - hh, ww * 2, hh);
    g.fillStyle = C.basalt[0]; g.beginPath(); g.moveTo(x + ox - ww, y - hh); g.lineTo(x + ox, y - hh - ww * 0.4); g.lineTo(x + ox + ww, y - hh); g.closePath(); g.fill();
  }
}

// =================================================================== สิ่งกีดขวาง (วาดตามลำดับความลึกของ boardProps)
export function drawObstacle(g, t, ctx, now) {
  const { x, y, kind } = t, C = BASE;
  // ร่อง/หลุม = อบลงพื้น · กะโหลก/ซี่โครง/ยานสำรวจ = items (abyssFx/ด้านล่าง) · เรือ = shipArt · ลำตัวปลาวาฬ = thalassaArt
  if (kind === "fd_nt_chasm" || kind === "fd_nt_pit" || kind === "fd_nt_skull" || kind === "fd_nt_rib" || kind === "fd_nt_probe" || kind === "fd_nt_whale" || kind === "fd_nt_ship") return;
  if (kind === "fd_nt_cliff") { cliffStack(g, x, y, t.conn || {}, C); return; }
  if (kind === "fd_nt_trenchrock") { spire(g, x, y, C, now); return; }
}
// ผาดิ่ง: กลุ่มเสาหินบะซอลต์หกเหลี่ยมสูงต่างระดับ (ช่องข้างเคียงเป็นผา = เสาเบียดกันเป็นกำแพง)
function hexCol(g, cx, cy, r, h, C, shade) {
  const top = [], bot = [];
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.3; top.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  const order = [...Array(6).keys()].sort((i, j) => depthOf(cx + Math.cos(((i + 0.5) / 6) * TAU + 0.3), cy + Math.sin(((i + 0.5) / 6) * TAU + 0.3)) - depthOf(cx + Math.cos(((j + 0.5) / 6) * TAU + 0.3), cy + Math.sin(((j + 0.5) / 6) * TAU + 0.3)));
  for (const i of order) {
    const p = top[i], q = top[(i + 1) % 6];
    g.fillStyle = (i + shade) % 3 === 0 ? C.basalt[1] : C.basalt[2];
    poly(g, [P(p[0], p[1], 0), P(q[0], q[1], 0), P(q[0], q[1], h), P(p[0], p[1], h)]); g.fill();
  }
  poly(g, top.map(([x, y]) => P(x, y, h))); g.fillStyle = C.basalt[0]; g.fill();
  g.strokeStyle = "rgba(110,140,220,.12)"; g.lineWidth = 1; g.stroke(); // ขอบรับแสงฟ้าจาง
  void bot;
}
function cliffStack(g, x, y, conn, C) {
  const R = rng(x * 53 + y * 17), n = 3 + Math.floor(R() * 2);
  const [bx, by, s] = P(x + 0.5, y + 0.5);
  g.fillStyle = "rgba(0,0,0,.5)"; g.beginPath(); g.ellipse(bx, by, s * 0.7, s * 0.28, 0, 0, TAU); g.fill();
  const cols = [];
  for (let i = 0; i < n; i++) cols.push({ x: x + 0.2 + R() * 0.6, y: y + 0.2 + R() * 0.6, r: 0.16 + R() * 0.1, h: 1.5 + R() * 1.2 + (conn.l && conn.r ? 0.3 : 0) });
  cols.sort((a, b) => depthOf(a.x, a.y) - depthOf(b.x, b.y)).forEach((c, i) => hexCol(g, c.x, c.y, c.r, c.h, C, i));
}
// หินแหลมร่องลึก: ยอดหินบิดเกลียว + ฟองน้ำแก้วขาว/ลิลลี่ทะเลโบก
function spire(g, x, y, C, now) {
  const cx = x + 0.5, cy = y + 0.5, H = 1.5 + hash(x, y) * 1.1, R = rng(x * 71 + y * 29);
  const [bx, by, s] = P(cx, cy);
  g.fillStyle = "rgba(0,0,0,.5)"; g.beginPath(); g.ellipse(bx, by, s * 0.45, s * 0.18, 0, 0, TAU); g.fill();
  const segs = 7, lean = (hash(y, x) - 0.5) * 0.5;
  for (let i = 0; i < segs; i++) {
    const u0 = i / segs, u1 = (i + 1) / segs, r0 = 0.36 * (1 - u0 * 0.8), r1 = 0.36 * (1 - u1 * 0.8);
    const c0 = [cx + lean * u0 * u0, cy], c1 = [cx + lean * u1 * u1, cy];
    for (const sd of [-1, 1]) {
      g.fillStyle = sd < 0 ? C.basalt[1] : C.basalt[2];
      poly(g, [P(c0[0], c0[1], H * u0), P(c0[0] + sd * r0, c0[1], H * u0), P(c1[0] + sd * r1, c1[1], H * u1), P(c1[0], c1[1], H * u1)]); g.fill();
    }
  }
  // ฟองน้ำแก้ว (แจกันขาวโปร่ง) บนไหล่หิน
  if (R() < 0.7) {
    const p = P(cx + 0.18, cy + 0.12, H * 0.35), ss = p[2];
    g.fillStyle = "rgba(220,225,235,.55)"; g.beginPath(); g.moveTo(p[0] - ss * 0.04, p[1]); g.quadraticCurveTo(p[0] - ss * 0.08, p[1] - ss * 0.2, p[0] - ss * 0.05, p[1] - ss * 0.32); g.lineTo(p[0] + ss * 0.05, p[1] - ss * 0.32); g.quadraticCurveTo(p[0] + ss * 0.08, p[1] - ss * 0.2, p[0] + ss * 0.04, p[1]); g.closePath(); g.fill();
    g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 0.8; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(p[0] - ss * 0.06, p[1] - ss * 0.08 * i); g.lineTo(p[0] + ss * 0.06, p[1] - ss * 0.08 * i); g.stroke(); }
  }
  // ลิลลี่ทะเล (ก้านยาว แขนขนนกโบก)
  const q = P(cx - 0.2, cy + 0.15, H * 0.5), qs = q[2], sw = Math.sin(now / 1300 + x * 2 + y) * 0.2;
  g.strokeStyle = "rgba(170,120,150,.75)"; g.lineWidth = Math.max(1, qs * 0.015);
  const tip = [q[0] - qs * 0.05 + sw * qs * 0.1, q[1] - qs * 0.45];
  g.beginPath(); g.moveTo(q[0], q[1]); g.quadraticCurveTo(q[0] - qs * 0.1, q[1] - qs * 0.25, tip[0], tip[1]); g.stroke();
  for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.45 + sw; g.beginPath(); g.moveTo(tip[0], tip[1]); g.quadraticCurveTo(tip[0] + Math.cos(a) * qs * 0.1, tip[1] + Math.sin(a) * qs * 0.1, tip[0] + Math.cos(a + 0.6) * qs * 0.16, tip[1] + Math.sin(a + 0.6) * qs * 0.08 + qs * 0.05); g.stroke(); }
}

// =================================================================== ของที่เรียงความลึกกับตัวละคร
export function items(list, g, fd, info, units, now, lowQ) {
  const Z = zones(info), t = now / 1000;
  // กะโหลกเลวีอาธาน (2×2 ชิ้นเดียว ความลึกตรงกลาง)
  if (Z.skull.length) {
    const sx = Z.skull.reduce((a, q) => a + q.x + 0.5, 0) / Z.skull.length, sy = Z.skull.reduce((a, q) => a + q.y + 0.5, 0) / Z.skull.length;
    list.push({ d: depthOf(sx, sy), f: () => skull(g, sx, sy, t) });
  }
  // ซี่โครง (ทำใหม่ 2026-11-19 ผู้ใช้: ซุ้มโค้งเดิมไม่สวย): กระดูกแยกซี่ โคนหนามีหัวข้อต่อฝังตะกอน → เรียวโค้งขึ้นแล้วงุ้มเข้าหากระดูกสันหลัง ปลายไม่ชนกัน
  //  สูงไม่เท่ากัน · บางซี่หัก · กวาดเอียงไปทางหาง · แบ่งท่อนเรียงความลึกเอง · มีตัวละครอยู่หลังซี่ = จาง
  for (const rb of ribBones(Z)) {
    const fade = ribFade(rb, units);
    for (let i = 0; i < rb.pts.length - 1; i++) {
      const p0 = rb.pts[i], p1 = rb.pts[i + 1];
      list.push({ d: depthOf((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2) + 0.02, f: () => ribSeg(g, rb, i, fade, t) });
    }
    list.push({ d: depthOf(rb.pts[0][0], rb.pts[0][1]) + 0.021, f: () => ribRoot(g, rb, fade) });
  }
  shipItems(list, g, fd, info, now, lowQ);
  abyssItems(list, g, fd, info, now, Z);
}
function skull(g, cx, cy, t) {
  const C = BASE;
  // กะโหลกนอนหงายปากชี้เหนือ: ท้ายกะโหลกโดม (ใต้) + ปากยาวเรียว (เหนือ) · วาดส่วนไกลกล้องก่อน
  const back = [cx + 0.1, cy + 0.4], tip = [cx - 0.05, cy - 1.05];
  const [bx, by, bs] = P(cx, cy);
  g.fillStyle = "rgba(0,0,0,.55)"; g.beginPath(); g.ellipse(bx, by, bs * 0.95, bs * 0.4, 0, 0, TAU); g.fill();
  const snout = () => {
    // ขากรรไกรบน: แผ่นเรียวยาว ยกสูงที่โคน ต่ำที่ปลาย
    const n = 10, L = [], Rr = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, x = back[0] + (tip[0] - back[0]) * u, y = back[1] + (tip[1] - back[1]) * u, w = 0.55 * (1 - u * 0.72), z = 0.75 * (1 - u * 0.7);
      L.push(P(x - w, y, z * 0.55)); Rr.push(P(x + w, y, z * 0.55));
    }
    const top = []; for (let i = 0; i <= n; i++) { const u = i / n; top.push(P(back[0] + (tip[0] - back[0]) * u, back[1] + (tip[1] - back[1]) * u, 0.75 * (1 - u * 0.7))); }
    g.fillStyle = C.bone[2]; poly(g, [...L, ...Rr.slice().reverse()]); g.fill();
    const lg = g.createLinearGradient(L[0][0], L[0][1], Rr[0][0], Rr[0][1]); lg.addColorStop(0, C.bone[1]); lg.addColorStop(0.5, C.bone[0]); lg.addColorStop(1, C.bone[2]);
    g.fillStyle = lg; poly(g, [...L.map((p, i) => [(p[0] + top[i][0]) / 2, (p[1] + top[i][1]) / 2]), ...Rr.map((p, i) => [(p[0] + top[i][0]) / 2, (p[1] + top[i][1]) / 2]).reverse()]); g.fill();
    // ฟันตามขอบปาก
    g.fillStyle = "#e6dfc9";
    for (const side of [L, Rr]) for (let i = 2; i < n; i++) { const p = side[i], ss = p[2]; g.beginPath(); g.moveTo(p[0] - ss * 0.025, p[1]); g.lineTo(p[0] + ss * 0.025, p[1]); g.lineTo(p[0], p[1] + ss * 0.1); g.closePath(); g.fill(); }
    // รูจมูก
    const nz = P(back[0] + (tip[0] - back[0]) * 0.45, back[1] + (tip[1] - back[1]) * 0.45, 0.5); g.fillStyle = "rgba(15,13,10,.85)"; g.beginPath(); g.ellipse(nz[0], nz[1], nz[2] * 0.09, nz[2] * 0.035, 0, 0, TAU); g.fill();
  };
  const dome = () => {
    const c = P(back[0], back[1] + 0.15, 0.42), s = c[2];
    const gr = g.createRadialGradient(c[0] - s * 0.2, c[1] - s * 0.35, s * 0.05, c[0], c[1], s * 0.8); gr.addColorStop(0, C.bone[0]); gr.addColorStop(0.6, C.bone[1]); gr.addColorStop(1, C.bone[2]);
    g.fillStyle = gr; g.beginPath(); g.ellipse(c[0], c[1], s * 0.56, s * 0.4, 0, 0, TAU); g.fill();
    // เบ้าตาลึก + แสงเขียวลอยในเบ้า
    for (const sd of [-1, 1]) {
      const e = P(back[0] + sd * 0.36, back[1] - 0.2, 0.5), es = e[2];
      g.fillStyle = "#06070a"; g.beginPath(); g.ellipse(e[0], e[1], es * 0.17, es * 0.12, sd * 0.35, 0, TAU); g.fill();
      glow(g, e[0], e[1], es * 0.22, "120,255,200", 0.22 * (0.6 + 0.4 * Math.sin(t * 1.3 + sd)));
    }
    // รอยแตก + เพรียงเกาะ
    g.strokeStyle = "rgba(60,52,40,.6)"; g.lineWidth = 1; g.beginPath(); g.moveTo(c[0] + s * 0.1, c[1] - s * 0.5); g.lineTo(c[0] + s * 0.18, c[1] - s * 0.2); g.lineTo(c[0] + s * 0.05, c[1]); g.stroke();
    const R = rng(4242); for (let i = 0; i < 10; i++) { const a = R() * TAU, r = R() * 0.5; g.fillStyle = R() < 0.5 ? "rgba(90,100,110,.6)" : "rgba(170,160,140,.6)"; g.beginPath(); g.arc(c[0] + Math.cos(a) * s * r, c[1] + Math.sin(a) * s * r * 0.8, s * 0.025, 0, TAU); g.fill(); }
  };
  if (depthOf(tip[0], tip[1]) < depthOf(back[0], back[1])) { snout(); dome(); } else { dome(); snout(); }
}
// ---------- ซี่โครงเลวีอาธาน ----------
const SPINE_X = 10.5;
// "แถว,ฝั่ง" (ฝั่ง -1 ซ้าย / 1 ขวา) → [ความสูง, หักที่ u (1 = ไม่หัก)]
const RIB_SPEC = { "3,-1": [3.1, 0.62], "3,1": [3.4, 1], "5,-1": [4.1, 1], "5,1": [3.9, 0.74], "10,-1": [3.8, 1], "10,1": [4.0, 1], "12,-1": [2.9, 0.5], "12,1": [3.0, 1] };
let RIB_CACHE = null;
function ribBones(Z) {
  if (RIB_CACHE && RIB_CACHE.Z === Z) return RIB_CACHE.list;
  const list = [];
  for (const r of Z.rib) {
    const dir = r.x + 0.5 < SPINE_X ? 1 : -1, side = -dir, spec = RIB_SPEC[`${r.y},${side}`] || [3.2 + hash(r.x, r.y) * 0.6, 1];
    const H = spec[0], brk = spec[1], bx = r.x + 0.5, by = r.y + 0.5, reach = Math.abs(SPINE_X - bx) - 0.75, tail = r.y < 8 ? 0.45 : 0.3;
    const N = Math.max(4, Math.round(16 * brk)), pts = [], w = [];
    for (let i = 0; i <= N; i++) {
      const u = (i / N) * brk;
      const x = bx + dir * (reach * Math.pow(u, 2.1) - 0.32 * Math.sin(u * Math.PI) * (1 - u)); // เอนออกก่อนแล้วงุ้มเข้า
      const y = by + tail * Math.pow(u, 1.6) + Math.sin(u * 7 + r.x) * 0.03;
      const z = (H * Math.sin(u * Math.PI * 0.6)) / Math.sin(Math.PI * 0.6);
      pts.push([x, y, z]); w.push(0.05 + 0.2 * Math.pow(1 - u, 0.8) + (u < 0.08 ? (0.08 - u) * 1.2 : 0));
    }
    list.push({ x: r.x, y: r.y, dir, pts, w, broken: brk < 1, seed: r.x * 31 + r.y * 7 });
  }
  RIB_CACHE = { Z, list };
  return list;
}
function ribFade(rb, units) {
  if (!units || !units.length) return 1;
  let lo = Infinity, hi = -Infinity, top = Infinity, bot = -Infinity;
  for (const p of rb.pts) { const [sx, sy] = P(p[0], p[1], p[2]); lo = Math.min(lo, sx); hi = Math.max(hi, sx); top = Math.min(top, sy); bot = Math.max(bot, sy); }
  const dRib = depthOf(rb.pts[0][0], rb.pts[0][1]);
  for (const u of units) {
    const ux = (u.rx ?? u.x) + 0.5, uy = (u.ry ?? u.y) + 0.5; if (depthOf(ux, uy) >= dRib) continue;
    const [sx, sy, s] = P(ux, uy, 0.6);
    if (sx > lo - s * 0.4 && sx < hi + s * 0.4 && sy > top && sy < bot + s * 0.2) return 0.38;
  }
  return 1;
}
// ท่อนกระดูก: ทรงท่อเรียว (เงา/เนื้อ/ไฮไลต์ 3 ชั้น) + ข้อต่อกลมกันรอยต่อ · ปลายหัก = ขอบแตกเห็นโพรงไขกระดูก
function ribSeg(g, rb, i, fade, t) {
  const C = BASE, p0 = rb.pts[i], p1 = rb.pts[i + 1], a = P(p0[0], p0[1], p0[2]), b = P(p1[0], p1[1], p1[2]);
  const wa = Math.max(1.2, a[2] * rb.w[i]), wb = Math.max(1, b[2] * rb.w[i + 1]);
  let nx = -(b[1] - a[1]), ny = b[0] - a[0]; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
  if (ny > 0) { nx = -nx; ny = -ny; } // n ชี้ขึ้นบนจอ = ด้านรับแสง
  const band = (k0, k1, col) => {
    g.fillStyle = col; g.beginPath();
    g.moveTo(a[0] + nx * wa * k0, a[1] + ny * wa * k0); g.lineTo(b[0] + nx * wb * k0, b[1] + ny * wb * k0);
    g.lineTo(b[0] + nx * wb * k1, b[1] + ny * wb * k1); g.lineTo(a[0] + nx * wa * k1, a[1] + ny * wa * k1); g.closePath(); g.fill();
  };
  g.save(); g.globalAlpha = fade;
  // เงา (ทั้งท่อ) → เนื้อกระดูก (เลื่อนขึ้นหาแสง) → สันไฮไลต์
  band(-1, 1, C.bone[2]); g.fillStyle = C.bone[2]; g.beginPath(); g.arc(b[0], b[1], wb, 0, TAU); g.fill();
  band(-0.25, 0.92, C.bone[1]); g.fillStyle = C.bone[1]; g.beginPath(); g.arc(b[0] + nx * wb * 0.33, b[1] + ny * wb * 0.33, wb * 0.58, 0, TAU); g.fill();
  band(0.45, 0.78, C.bone[0]);
  g.strokeStyle = "rgba(10,9,8,.55)"; g.lineWidth = Math.max(1, wa * 0.18); g.beginPath(); g.moveTo(a[0] - nx * wa, a[1] - ny * wa); g.lineTo(b[0] - nx * wb, b[1] - ny * wb); g.stroke();
  // ผิวกระดูก: ร่องเส้นใยตามยาว + เพรียงเกาะบางท่อน
  const R = rng(rb.seed * 13 + i);
  if (wa > 3) { g.strokeStyle = "rgba(70,62,50,.45)"; g.lineWidth = 0.8; const k = (R() - 0.5) * 1.2; g.beginPath(); g.moveTo(a[0] + nx * wa * k, a[1] + ny * wa * k); g.lineTo(b[0] + nx * wb * k, b[1] + ny * wb * k); g.stroke(); }
  if (R() < 0.35) { const m = R(), px = a[0] + (b[0] - a[0]) * m - nx * wa * 0.4, py = a[1] + (b[1] - a[1]) * m - ny * wa * 0.4; g.fillStyle = R() < 0.5 ? "rgba(95,105,115,.8)" : "rgba(150,140,120,.85)"; g.beginPath(); g.arc(px, py, Math.max(1, wa * 0.28), 0, TAU); g.fill(); }
  // หนอนท่อเรืองแสงเกาะท่อนล่าง (เต้นช้า)
  if (i < 4 && R() < 0.5) { const px = a[0] - nx * wa * 0.9, py = a[1] - ny * wa * 0.9; g.globalCompositeOperation = "lighter"; glow(g, px, py, wa * 1.6, "90,230,200", 0.25 * fade * (0.6 + 0.4 * Math.sin(t * 1.4 + rb.seed + i))); g.globalCompositeOperation = "source-over"; }
  // ปลายซี่
  if (i === rb.pts.length - 2) {
    if (rb.broken) {
      const Rb = rng(rb.seed); g.fillStyle = C.bone[1]; g.beginPath();
      for (let k = 0; k <= 6; k++) { const ang = Math.atan2(ny, nx) + Math.PI * (k / 6) - Math.PI / 2, rr = wb * (0.8 + Rb() * 0.6); g.lineTo(b[0] + Math.cos(ang) * rr, b[1] + Math.sin(ang) * rr - Rb() * wb * 0.5); }
      g.closePath(); g.fill();
      g.fillStyle = "rgba(40,30,22,.9)"; g.beginPath(); g.ellipse(b[0], b[1], wb * 0.55, wb * 0.4, Math.atan2(ny, nx), 0, TAU); g.fill(); // โพรงไขกระดูก
    } else { g.fillStyle = C.bone[0]; g.beginPath(); g.arc(b[0] + nx * wb * 0.3, b[1] + ny * wb * 0.3, wb * 0.45, 0, TAU); g.fill(); }
  }
  g.restore();
}
// โคนซี่: หัวข้อต่อปุ่มกลม 2 ลูก ฝังในเนินตะกอน + เศษกระดูกแตก (ซี่หัก = ท่อนปลายที่หักตกอยู่ข้างโคน)
function ribRoot(g, rb, fade) {
  const C = BASE, [x, y] = rb.pts[0], [sx, sy, s] = P(x, y, 0);
  g.save(); g.globalAlpha = fade;
  g.fillStyle = "rgba(0,0,0,.55)"; g.beginPath(); g.ellipse(sx, sy, s * 0.42, s * 0.16, 0, 0, TAU); g.fill();
  for (const k of [-1, 1]) {
    const [kx, ky, ks] = P(x - rb.dir * 0.12 * (k + 1), y + k * 0.1, 0.12);
    const gr = g.createRadialGradient(kx - ks * 0.04, ky - ks * 0.05, ks * 0.01, kx, ky, ks * 0.13); gr.addColorStop(0, C.bone[0]); gr.addColorStop(1, C.bone[2]);
    g.fillStyle = gr; g.beginPath(); g.ellipse(kx, ky, ks * 0.12, ks * 0.09, 0, 0, TAU); g.fill();
  }
  g.fillStyle = mix(C.ooze2, "#000000", 0.15); g.beginPath(); g.ellipse(sx, sy + s * 0.02, s * 0.36, s * 0.1, 0, 0, Math.PI); g.fill(); // ตะกอนกลบครึ่งล่าง
  const R = rng(rb.seed + 5);
  for (let i = 0; i < (rb.broken ? 5 : 2); i++) {
    const [fx, fy, fs] = P(x + (R() - 0.5) * 1.1, y + 0.2 + R() * 0.5, 0.03), ang = R() * 3, big = rb.broken && i === 0, L = fs * (big ? 0.5 : 0.12 + R() * 0.1);
    g.lineCap = "round";
    g.strokeStyle = C.bone[2]; g.lineWidth = Math.max(1.5, fs * (big ? 0.07 : 0.03));
    g.beginPath(); g.moveTo(fx - Math.cos(ang) * L, fy - Math.sin(ang) * L * 0.4); g.lineTo(fx + Math.cos(ang) * L, fy + Math.sin(ang) * L * 0.4); g.stroke();
    g.strokeStyle = C.bone[0]; g.lineWidth = Math.max(0.8, fs * (big ? 0.03 : 0.012));
    g.beginPath(); g.moveTo(fx - Math.cos(ang) * L, fy - Math.sin(ang) * L * 0.4 - 1); g.lineTo(fx + Math.cos(ang) * L, fy + Math.sin(ang) * L * 0.4 - 1); g.stroke();
    g.lineCap = "butt";
  }
  g.restore();
}

// =================================================================== พื้นทุกเฟรม (ใต้ตัวละคร)
export function ground(g, fd, info, now, lowQ) {
  const Z = zones(info), t = now / 1000;
  // ร่องลึกต่อออกไปนอกกระดาน (ตามการหมุนกระดาน)
  offBoardTrench(g, Z, info, t);
  // แมกมาก้นร่องเต้นช้า (ตัดในปากร่อง)
  g.save(); voidClip(g, Z); g.clip(); g.globalCompositeOperation = "lighter";
  for (const v of Z.voidList) {
    const k = 0.5 + 0.5 * Math.sin(t * 0.7 + v.x * 0.8 + v.y * 1.3);
    if (k < 0.6 || hash(v.x, v.y) < 0.55) continue;
    const [sx, sy, s] = P(v.x + 0.5, v.y + 0.5, -DEPTH); glow(g, sx, sy, s * 0.7, BASE.magma, 0.06 * (k - 0.6));
  }
  g.restore();
  // ร่องหายใจ: ทุก ~22 วิ คลื่นแมกมาวิ่งตามร่องจากตะวันตกไปตะวันออก (ชั้นนี้อยู่ยาว — ต้องมีจังหวะเปลี่ยนไปเรื่อยๆ)
  breath(g, Z, info, t);
  // เงายักษ์ผ่านใต้ความมืด (ทุก ~50 วิ) — หันหัวตามทิศที่เคลื่อนบนจอ
  passingShadow(g, info, t);
  // ผิวบ่อน้ำเกลือ: เส้นสะท้อนเงาเคลื่อนช้า + ระลอกขอบ
  if (!lowQ) for (const b of Z.brine) for (let i = 0; i < 2; i++) {
    const u = (t * 0.08 + hash(b.x, b.y + i)) % 1, y = b.y + 0.25 + i * 0.45;
    const a = P(b.x + 0.15 + u * 0.4, y, 0.02), c = P(b.x + 0.45 + u * 0.4, y, 0.02);
    g.strokeStyle = `rgba(140,170,220,${0.18 * Math.sin(u * Math.PI)})`; g.lineWidth = 1; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(c[0], c[1]); g.stroke();
  }
  abyssGround(g, fd, info, now, lowQ, Z);
  // ความมืดห้วงลึก: พื้นทั้งสนามจมดำ เห็นแค่รอบแหล่งแสง (ตัวละคร · ช่องที่สว่าง · ไฟล่อ · พลุ · ฟองอากาศ · เรือ) — ชั้นสุดท้ายต้องน่ากลัว
  //  วาดท้ายชั้นพื้น = ใต้ช่องเดิน/โจมตี ตัวละคร และของสูง (เล่นได้ชัดเหมือนเดิม) · มุมจอ/ตัวละครใช้ของเฟรมก่อน (air เก็บไว้)
  if (LAST_VIEW) darkMask(g, fd, info, LAST_UNITS, t, LAST_VIEW.X0, LAST_VIEW.Y0, LAST_VIEW.W, LAST_VIEW.H, Z);
  drawThalassaGround(g, fd, info, now);
}
function breath(g, Z, info, t) {
  const per = 22, k = (t % per) / 6; if (k > 1) return;
  const head = -3 + k * (info.cols + 6);
  g.save(); voidClip(g, Z, 0); g.clip(); g.globalCompositeOperation = "lighter";
  for (const v of Z.voidList) {
    const d = Math.abs(v.x + 0.5 - head); if (d > 3) continue;
    const a = (1 - d / 3) * Math.sin(Math.min(1, k * 3) * Math.PI / 2) * (1 - k * 0.5);
    const [sx, sy, s] = P(v.x + 0.5, v.y + 0.5, -DEPTH * 0.8); glow(g, sx, sy, s * 1.1, BASE.magma, 0.09 * a);
  }
  g.restore();
}
function passingShadow(g, info, t) {
  const per = 50, k = ((t + 17) % per) / 14; if (k > 1) return;
  const dir = Math.floor((t + 17) / per) % 2 ? 1 : -1, y = info.rows * (0.3 + 0.4 * hash(Math.floor((t + 17) / per), 3));
  const x = dir > 0 ? -8 + k * (info.cols + 16) : info.cols + 8 - k * (info.cols + 16), a = Math.sin(k * Math.PI);
  const head = P(x, y, -2), tail = P(x - dir * 7, y + Math.sin(t) * 0.3, -2), ang = Math.atan2(head[1] - tail[1], head[0] - tail[0]);
  const len = Math.hypot(head[0] - tail[0], head[1] - tail[1]);
  g.save(); g.translate(tail[0], tail[1]); g.rotate(ang); g.fillStyle = `rgba(0,0,0,${0.35 * a})`;
  g.beginPath(); g.moveTo(0, 0);
  for (let i = 0; i <= 20; i++) { const u = i / 20, w = len * 0.07 * Math.sin(Math.min(1, u * 1.2) * Math.PI * 0.9) + len * 0.01; g.lineTo(u * len, -w + Math.sin(t * 2 - u * 6) * len * 0.01); }
  for (let i = 20; i >= 0; i--) { const u = i / 20, w = len * 0.07 * Math.sin(Math.min(1, u * 1.2) * Math.PI * 0.9) + len * 0.01; g.lineTo(u * len, w + Math.sin(t * 2 - u * 6) * len * 0.01); }
  g.closePath(); g.fill(); g.restore();
}
function offBoardTrench(g, Z, info, t) {
  for (const [rowsAt, x0, dir] of [[Z.edgeL, 0, -1], [Z.edgeR, info.cols, 1]]) {
    if (!rowsAt.length) continue;
    const y0 = Math.min(...rowsAt), y1 = Math.max(...rowsAt) + 1, L = 7;
    for (let i = 0; i < L; i++) { // ทีละท่อน จางลงตามระยะ (ไม่ตัดเป็นขอบตรง)
      const xa = x0 + dir * i, xb = x0 + dir * (i + 1), wob = (k) => (hash(k, y0) - 0.5) * 0.5;
      const top0 = y0 + wob(i), top1 = y0 + wob(i + 1), bot0 = y1 + wob(i + 20), bot1 = y1 + wob(i + 21);
      g.fillStyle = `rgba(0,0,0,${0.92 - i * 0.11})`; poly(g, [P(xa, top0), P(xb, top1), P(xb, bot1), P(xa, bot0)]); g.fill();
      // ผนังไกล (หันหากล้อง) — แถบหินมืดดิ่งลง
      if (faceVisible(0, 1, (xa + xb) / 2, top0)) { g.fillStyle = `rgba(22,26,36,${0.8 - i * 0.1})`; poly(g, [P(xa, top0), P(xb, top1), P(xb, top1, -1.6), P(xa, top0, -1.6)]); g.fill(); }
      if (faceVisible(0, -1, (xa + xb) / 2, bot0)) { g.fillStyle = `rgba(22,26,36,${0.8 - i * 0.1})`; poly(g, [P(xa, bot0), P(xb, bot1), P(xb, bot1, -1.6), P(xa, bot0, -1.6)]); g.fill(); }
      const [sx, sy, s] = P((xa + xb) / 2, (y0 + y1) / 2, -DEPTH);
      g.save(); g.globalCompositeOperation = "lighter"; glow(g, sx, sy, s * 0.7, BASE.magma, (0.02 + 0.01 * Math.sin(t * 0.6 + i)) * (1 - i / L)); g.restore();
    }
  }
}

// =================================================================== ทับตัวละคร
export function air(g, fd, info, units, now, lowQ, view) {
  const t = now / 1000, cols = info.cols, rows = info.rows, Z = zones(info);
  const X0 = view ? view.x0 : 0, W = view ? view.x1 - view.x0 : 1280, Y0 = view ? view.y0 : 0, H = view ? view.y1 - view.y0 : 720;
  // ฟองจากช่องฟื้นฟู
  for (const h of info.heal || []) for (let i = 0; i < 5; i++) {
    const k = ((t * 0.3 + i / 5 + hash(h.x, h.y)) % 1), [sx, sy, s] = P(h.x + 0.5 + Math.sin(t * 2 + i) * 0.08, h.y + 0.5, k * 3);
    g.strokeStyle = `rgba(170,210,255,${0.6 * (1 - k)})`; g.lineWidth = 1; g.beginPath(); g.arc(sx, sy, s * (0.03 + i * 0.008), 0, TAU); g.stroke();
  }
  if (!lowQ) {
    // หิมะทะเล (ตะกอนอินทรีย์ร่วงช้า)
    g.fillStyle = "rgba(190,200,220,.28)";
    for (let i = 0; i < 90; i++) { const x = X0 + ((hash(i, 1) * W + Math.sin(t * 0.25 + i) * 10) % W), y = Y0 + ((hash(i, 2) * H + t * (4 + hash(i, 3) * 7)) % H); g.fillRect(x, y, 1.3, 1.3); }
    // ประกายเรืองแสงวาบ (สัตว์เล็กตกใจ)
    g.save(); g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 10; i++) {
      const slot = Math.floor(t / 3 + hash(i, 4) * 3), d = (t / 3 + hash(i, 4) * 3) % 1;
      if (d > 0.25) continue;
      const [sx, sy, s] = P(hash(slot, i) * cols, hash(i, slot) * rows, 0.5 + hash(slot + i, 2) * 2), a = Math.sin((d / 0.25) * Math.PI);
      glow(g, sx, sy, s * 0.18, "90,200,255", 0.5 * a);
    }
    // ไซโฟโนฟอร์ (สายสัตว์เรืองแสงยาว) ล่องผ่านไกลเหนือกระดาน
    const k = (t * 0.012) % 1, base = [-4 + k * (cols + 8), rows * 0.25 + Math.sin(t * 0.1) * 2];
    for (let i = 0; i < 26; i++) {
      const [sx, sy, s] = P(base[0] - i * 0.22, base[1] + Math.sin(t * 0.8 - i * 0.4) * 0.3, 4.5 - i * 0.02);
      glow(g, sx, sy, s * 0.07, "120,170,255", 0.35 - i * 0.01);
    }
    g.restore();
  }
  // ประกายไฟ/เถ้าร้อนลอยขึ้นจากร่องเหว (จุดเด่นของชั้น — แสงเดียวที่มาจากใต้เท้า)
  if (Z.voidList.length) {
    g.save(); g.globalCompositeOperation = "lighter";
    // แสงผีซีดลอยอยู่ลึกในเหว (สิ่งมีชีวิตที่ไม่มีใครเห็นตัว) — ช้า หายแล้วโผล่ที่อื่น · ทับหมอกมืด
    for (let i = 0; i < 7; i++) {
      const per = 9 + hash(i, 21) * 7, cyc = (t + hash(i, 22) * per) / per, slot = Math.floor(cyc), u = cyc - slot;
      const v = Z.voidList[Math.floor(hash(slot, i + 30) * Z.voidList.length)];
      const [sx, sy, s] = P(v.x + 0.5 + Math.sin(u * 3 + i) * 0.4, v.y + 0.5, -DEPTH * (0.45 + 0.35 * hash(i, slot))), a = Math.pow(Math.sin(u * Math.PI), 2);
      glow(g, sx, sy, s * 0.35, "150,210,255", 0.18 * a); glow(g, sx, sy, s * 0.05, "225,245,255", 0.7 * a);
    }
    // หิมะทะเลถูกดูดจมหายลงเหว (ช้า · ยิ่งลึกยิ่งจางหาย)
    const n = lowQ ? 30 : 90;
    for (let i = 0; i < n; i++) {
      const per = 7 + hash(i, 11) * 6, cyc = (t + hash(i, 12) * per) / per, slot = Math.floor(cyc), u = cyc - slot;
      const v = Z.voidList[Math.floor(hash(slot, i) * Z.voidList.length)];
      const x = v.x + hash(i, slot + 1) + Math.sin(u * 5 + i) * 0.06, y = v.y + hash(slot + 2, i), z = 1.8 - u * (DEPTH + 1.8);
      const [sx, sy, s] = P(x, y, z), a = Math.min(1, u * 4) * (1 - u);
      g.fillStyle = `rgba(200,215,235,${0.55 * a})`; g.beginPath(); g.arc(sx, sy, Math.max(0.7, s * 0.01), 0, TAU); g.fill();
    }
    g.restore();
  }
  abyssAir(g, fd, info, units, now, lowQ, view, Z);
  LAST_VIEW = { X0, Y0, W, H }; LAST_UNITS = units;
  ambientMoments(t);
  // ดวงตาในความมืด (นอกขอบกระดาน/ในร่อง) — คู่ตาเรืองกะพริบเป็นพักๆ
  eyes(g, Z, info, t);
  // เหตุการณ์ในห้วงมืด (ถี่ขึ้นเรื่อยๆ ตามเวลาที่อยู่ชั้นนี้ — ศึกสุดท้าย): หนวดยักษ์โผล่จากเหว · เงาอสูรกายผ่านหลังร่อง · แผ่นดินสั่นหินร่วง · แสงวาบไกล
  voidEvents(g, Z, info, t, X0, Y0, W, H, lowQ);
  // ขอบจอมืดหนัก (ลึกที่สุด)
  const vg = g.createRadialGradient(X0 + W / 2, Y0 + H / 2, Math.min(W, H) * 0.25, X0 + W / 2, Y0 + H / 2, Math.max(W, H) * 0.72);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, `rgba(0,0,3,${0.84 + 0.08 * Math.sin(t * 0.45)})`); g.fillStyle = vg; g.fillRect(X0, Y0, W, H);
  shipFx(g, fd, info, now);
  abyssFx(g, fd, info, now, Z);
  entrance(g, info, now, X0, Y0, W, H);
}
// ---------- ความมืดห้วงลึก (มาสก์ทั้งจอ เจาะรูนุ่มรอบแหล่งแสง) ----------
let MASK = null, LAST_VIEW = null, LAST_UNITS = null;
function darkMask(g, fd, info, units, t, X0, Y0, W, H, Z) {
  if (typeof document === "undefined") return;
  const SC = 0.5, mw = Math.max(2, Math.ceil(W * SC)), mh = Math.max(2, Math.ceil(H * SC));
  if (!MASK) MASK = document.createElement("canvas");
  if (MASK.width !== mw || MASK.height !== mh) { MASK.width = mw; MASK.height = mh; }
  const m = MASK.getContext("2d"), ab = fd && fd.abyss;
  m.setTransform(1, 0, 0, 1, 0, 0); m.globalCompositeOperation = "source-over"; m.clearRect(0, 0, mw, mh);
  m.fillStyle = `rgba(0,1,5,${0.74 + 0.06 * Math.sin(t * 0.45)})`; m.fillRect(0, 0, mw, mh);
  m.globalCompositeOperation = "destination-out";
  const hole = (x, y, z, r, a = 1) => {
    const [sx, sy, s] = P(x, y, z), cx = (sx - X0) * SC, cy = (sy - Y0) * SC, rr = s * r * SC; if (rr < 1) return;
    const gr = m.createRadialGradient(cx, cy, rr * 0.15, cx, cy, rr); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(0.55, `rgba(0,0,0,${a * 0.75})`); gr.addColorStop(1, "rgba(0,0,0,0)");
    m.fillStyle = gr; m.beginPath(); m.arc(cx, cy, rr, 0, TAU); m.fill();
  };
  for (const u of units || []) { const h = Math.max(1, u.size | 0) / 2; hole((u.rx ?? u.x) + h, (u.ry ?? u.y) + h, 0.5, 1.9 + h); }
  const lit = ab && ab.lit;
  if (lit && lit.length) for (const k of lit) { const [x, y] = k.split(",").map(Number); hole(x + 0.5, y + 0.5, 0.2, 1.05, 0.8); }
  else for (const q of Z.plankton) hole(q.x + 0.5, q.y + 0.5, 0.1, 1.4, 0.8 * (0.8 + 0.2 * Math.sin(t * 1.2 + q.x)));
  for (const l of (ab && ab.lures) || []) if (l.on) hole(l.x + 0.5, l.y + 0.5, 0.9, 1.5, 0.9);
  for (const f of (ab && ab.flares) || []) hole(f.x + 0.5, f.y + 0.5, 1, (f.r || 2) + 1.2, 1);
  for (const h of info.heal || []) hole(h.x + 0.5, h.y + 0.5, 0.3, 0.9, 0.6);
  hole(10, 1, 0.6, 3.4, 0.85); // เรือ Nautilus ที่ท่าจอด (ไฟตัวเรือ)
  g.drawImage(MASK, X0, Y0, W, H);
}
// ---------- เหตุการณ์ในห้วงมืด (วาดทับฉากหลัง/กระดานแบบจาง ไม่บังตัวละคร) ----------
let ESC_T0 = null;
function farEdgeY(info) { return Math.min(P(0, 0)[1], P(info.cols, 0)[1], P(0, info.rows)[1], P(info.cols, info.rows)[1]); }
const fired = new Set();
function once(key, fn) { if (fired.has(key)) return; fired.add(key); if (fired.size > 64) fired.delete(fired.values().next().value); fn(); }
function videoOn() { return typeof document !== "undefined" && (document.hidden || [...document.querySelectorAll("video")].some((v) => !v.paused)); }
function voidEvents(g, Z, info, t, X0, Y0, W, H, lowQ) {
  if (ESC_T0 == null) ESC_T0 = t;
  const esc = clamp((t - ESC_T0) / 600, 0, 1); // 10 นาทีบนชั้นนี้ = ถี่สุด
  const top = farEdgeY(info);
  // 1) หนวดยักษ์ค่อยๆ โผล่จากเหว ม้วนงอ แล้วจมกลับ (เงาดำ ขอบแสงเย็น ปุ่มดูดซีด) — ถี่ขึ้นตามเวลา
  if (Z.voidList.length) { const per = 40 - esc * 16, slot = Math.floor((t + 8) / per), k = ((t + 8) - slot * per) / 9;
    if (k >= 0 && k < 1) {
      const edge = Z.chasm.filter((v) => v.x >= 2 && v.x <= info.cols - 3 && Math.abs(v.x + 0.5 - SPINE_X) > 1.5), v = edge[Math.floor(hash(slot, 3) * edge.length)] || Z.voidList[0];
      const rise = k < 0.3 ? easeInOut(k / 0.3) : k > 0.72 ? 1 - easeInOut((k - 0.72) / 0.28) : 1, H0 = 5.2 * rise, side = hash(slot, 4) < 0.5 ? -1 : 1;
      if (H0 > 0.05) tentacle(g, v.x + 0.5, v.y + 0.5, H0, side, t, slot, lowQ);
      if (k < 0.05) once(`tent${slot}`, () => { if (!videoOn()) { abyssAmbient("rumble"); abyssAmbient("swirl"); } });
    } }
  // 2) เงาอสูรกายยักษ์ว่ายผ่านหลังร่อง (หันหัวตามทิศที่ว่าย)
  { const per = 70 - esc * 25, slot = Math.floor((t + 30) / per), k = ((t + 30) - slot * per) / 18;
    if (k >= 0 && k < 1) {
      const dir = slot % 2 ? 1 : -1, x = dir > 0 ? X0 - W * 0.6 + k * W * 2.2 : X0 + W * 1.6 - k * W * 2.2, y = top - H * 0.02, L = W * 0.55, a = Math.sin(k * Math.PI);
      g.save(); g.translate(x, y); g.scale(dir, 1);
      g.fillStyle = `rgba(1,2,6,${0.75 * a})`; g.strokeStyle = `rgba(70,110,200,${0.18 * a})`; g.lineWidth = 2;
      g.beginPath(); g.moveTo(L * 0.5, 0);
      for (let i = 0; i <= 24; i++) { const u = i / 24, w = L * 0.09 * Math.sin(Math.min(1, (1 - u) * 1.3) * Math.PI * 0.85) + L * 0.008; g.lineTo(L * 0.5 - u * L, -w + Math.sin(t * 1.5 - u * 5) * L * 0.015); }
      for (let i = 24; i >= 0; i--) { const u = i / 24, w = L * 0.07 * Math.sin(Math.min(1, (1 - u) * 1.3) * Math.PI * 0.85) + L * 0.008; g.lineTo(L * 0.5 - u * L, w + Math.sin(t * 1.5 - u * 5) * L * 0.015); }
      g.closePath(); g.fill(); g.stroke();
      for (let i = 0; i < 8; i++) glow(g, L * (0.42 - i * 0.1), L * 0.05, L * 0.012, "120,200,255", 0.5 * a); // แถวไฟเรืองข้างลำตัว
      g.restore();
      if (k < 0.05) once(`sil${slot}`, () => { if (!videoOn()) abyssAmbient("blue"); });
    } }
  // 3) แผ่นดินสั่น: หินร่วงจากผาข้างกระดาน + ความมืดวูบ
  { const per = 34 - esc * 14, slot = Math.floor((t + 11) / per), k = ((t + 11) - slot * per) / 2.6;
    if (k >= 0 && k < 1) {
      const a = Math.sin(k * Math.PI);
      g.fillStyle = `rgba(0,0,0,${0.18 * a})`; g.fillRect(X0, Y0, W, H);
      if (!lowQ) for (let i = 0; i < 26; i++) { const sx = hash(i, slot) < 0.5 ? -1.5 - hash(i, 2) * 2 : info.cols + 0.5 + hash(i, 2) * 2, sy = hash(slot, i) * info.rows, [px, py, ps] = P(sx, sy, 3.5 - ((k * 1.4 + hash(i, 5)) % 1) * 3.5); g.fillStyle = "rgba(60,66,80,.9)"; g.fillRect(px, py, ps * 0.05, ps * 0.05); }
      if (k < 0.1) once(`quake${slot}`, () => { if (!videoOn()) abyssAmbient("rumble"); });
    } }
  // 4) แสงวาบไกลในความมืด (สิ่งมีชีวิตเรืองแสงตกใจ)
  { const per = 19, slot = Math.floor((t + 5) / per), k = ((t + 5) - slot * per) / 0.9;
    if (k >= 0 && k < 1) { const x = X0 + W * hash(slot, 7), y = Y0 + (top - Y0) * (0.2 + 0.6 * hash(slot, 8)); g.save(); g.globalCompositeOperation = "lighter"; glow(g, x, y, W * 0.12 * (0.4 + k), "80,170,255", 0.35 * (1 - k)); g.restore(); } }
}
// ฉากเข้าชั้น (ครั้งแรกที่เห็นชั้นนี้ · ผู้ใช้สั่ง 2026-11-19: เป็นฟองอากาศลอยขึ้น): มืดสนิท → ฟองอากาศพรั่งพรูจากล่างขึ้นบนเต็มจอ
//  → ความมืดจางจากล่างขึ้นบนตามคลื่นฟอง → ฟองสุดท้ายลอยพ้นจอ เผยสนาม (ไม่มีดวงตา/สีแดง)
//  เล่นใหม่เมื่อเป็นผังใหม่ (info ใหม่) หลังไม่ได้วาดชั้นนี้ > 3 วิ — สะพานพังกลางเกม (info ใหม่แต่วาดต่อเนื่อง) / สลับแท็บกลับมา (info เดิม) ไม่เล่นซ้ำ
let ENTRY = null, LAST_SEEN = -1e9, ENTRY_INFO = null;
function entrance(g, info, now, X0, Y0, W, H) {
  if (ENTRY == null || (info !== ENTRY_INFO && now - LAST_SEEN > 3000)) {
    ENTRY_INFO = info; ENTRY = now; if (!videoOn()) { abyssAmbient("bubbles"); setTimeout(() => { if (!videoOn()) abyssAmbient("boom"); }, 1500); } }
  LAST_SEEN = now;
  const k = (now - ENTRY) / 5200; if (k >= 1) return;
  const lift = easeInOut(clamp((k - 0.25) / 0.6, 0, 1)), edge = Y0 + H * (1.15 - lift * 1.6);
  const gr = g.createLinearGradient(0, edge - H * 0.35, 0, edge + H * 0.25);
  gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr; g.fillRect(X0, Y0, W, H);
  // ฟองอากาศ: ใหญ่เร็ว เล็กช้า ส่ายซ้ายขวา ขอบสะท้อนแสงเย็น + จุดไฮไลต์
  g.save(); g.globalCompositeOperation = "lighter";
  for (let i = 0; i < 140; i++) {
    const r = W * (0.004 + Math.pow(hash(i, 1), 3) * 0.035), sp = 0.9 + (r / W) * 30 + hash(i, 2) * 0.5, delay = hash(i, 3) * 0.45;
    const u = (k - delay) * sp; if (u <= 0 || u >= 1.3) continue;
    const x = X0 + W * hash(i, 4) + Math.sin(u * 9 + i) * r * 1.2, y = Y0 + H * (1.08 - u), a = Math.min(1, u * 5) * (k > 0.8 ? (1 - k) / 0.2 : 1);
    const bg = g.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.05, x, y, r);
    bg.addColorStop(0, `rgba(210,235,255,${0.22 * a})`); bg.addColorStop(0.7, `rgba(90,140,200,${0.06 * a})`); bg.addColorStop(1, `rgba(170,210,255,${0.35 * a})`);
    g.fillStyle = bg; g.beginPath(); g.ellipse(x, y, r, r * (0.92 + Math.sin(u * 14 + i) * 0.06), 0, 0, TAU); g.fill();
    g.fillStyle = `rgba(255,255,255,${0.75 * a})`; g.beginPath(); g.arc(x - r * 0.35, y - r * 0.4, Math.max(0.8, r * 0.16), 0, TAU); g.fill();
  }
  g.restore();
}
// หนวดยักษ์ (จอ): โคนจมในเหว ลำเรียวโค้งขึ้น ปลายม้วน · ลำตัวดำ ขอบรับแสงฟ้าเย็น ปุ่มดูดซีดด้านใน
function tentacle(g, bx, by, H0, side, t, seed, lowQ) {
  const N = lowQ ? 14 : 26, pts = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, curl = Math.pow(u, 3) * 2.4;
    const x = bx + side * (Math.sin(u * 2.2 + Math.sin(t * 0.7 + seed) * 0.4) * 0.9 * u + Math.sin(curl) * 0.5 * u), y = by - 0.2 * u + Math.sin(t * 0.5 + u * 3) * 0.1;
    const z = -1.2 + (H0 + 1.2) * Math.sin(u * Math.PI * 0.55) - Math.max(0, curl - 1.2) * 0.4;
    pts.push(P(x, y, z));
  }
  const wid = (i, s) => s * (0.42 * (1 - i / N) + 0.025);
  const L = [], R = [];
  for (let i = 0; i <= N; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)], nl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / nl, ny = (b[0] - a[0]) / nl, w = wid(i, pts[i][2]);
    L.push([pts[i][0] + nx * w, pts[i][1] + ny * w]); R.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
  }
  g.save();
  g.fillStyle = "#0b111b"; g.beginPath(); L.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); for (let i = N; i >= 0; i--) g.lineTo(R[i][0], R[i][1]); g.closePath(); g.fill();
  g.strokeStyle = "rgba(140,185,245,.6)"; g.lineWidth = 2; g.beginPath(); L.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
  for (let i = 2; i < N - 1; i++) { const p = R[i], q = pts[i], r = Math.max(0.8, wid(i, q[2]) * 0.28); g.fillStyle = "rgba(190,190,200,.5)"; g.beginPath(); g.ellipse((p[0] * 2 + q[0]) / 3, (p[1] * 2 + q[1]) / 3, r, r * 0.7, 0, 0, TAU); g.fill(); }
  g.restore();
}
const easeInOut = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
// ช่วงเสียงในความมืด (เพลงวาฬไกล · เสียงคลิกปลาวาฬหัวทุย · ครางต่ำ) ทุก ~37 วิ — เบา (เพลง Genjitsu ดังกว่า) · มีวีดีโอเล่นอยู่ = งด (กฎผู้ใช้)
let AMB_SLOT = -1;
function ambientMoments(t) {
  const slot = Math.floor(t / 37); if (slot === AMB_SLOT) return; const first = AMB_SLOT < 0; AMB_SLOT = slot; if (first) return;
  if (typeof document !== "undefined" && (document.hidden || [...document.querySelectorAll("video")].some((v) => !v.paused))) return;
  abyssAmbient(["song", "l11_clicks", "blue", "song2"][slot % 4]);
}
const EYES = [[-2.2, 3], [-2.8, 11], [21.6, 5], [22.3, 12.5], [6, -2.4], [14.5, -2.6], [9, 17.6], [-1.6, 7.3], [21, 7.6]];
function eyes(g, Z, info, t) {
  for (let i = 0; i < EYES.length; i++) {
    const slot = Math.floor(t / 7 + hash(i, 9)), d = (t / 7 + hash(i, 9)) % 1;
    if (hash(slot, i) < 0.45 || d > 0.3) continue;
    const a = Math.sin((d / 0.3) * Math.PI), blink = Math.abs(Math.sin(d * 40)) > 0.12 ? 1 : 0.1;
    const [x, y] = EYES[i], z = i === 7 || i === 8 ? -1.2 : 0.6, [sx, sy, s] = P(x + hash(slot, 2) * 0.6, y, z), col = hash(i, slot) < 0.5 ? "190,220,255" : "160,255,220";
    for (const ex of [-1, 1]) {
      glow(g, sx + ex * s * 0.16, sy, s * 0.14, col, 0.55 * a * blink);
      g.fillStyle = `rgba(230,245,255,${0.9 * a * blink})`; g.beginPath(); g.ellipse(sx + ex * s * 0.16, sy, s * 0.035, s * 0.018 * blink, 0, 0, TAU); g.fill();
    }
  }
  void Z; void info;
}
export function bakeSpecial() {}
export function animSpecial() {}
// ทาลัสซาวาดหลังหมอกความมืด (index.js drawFodlanAir เรียก airTop ต่อจาก drawFog) — ผู้ใช้ 2026-11-19: ตัวปลาโดนหมอกความมืดบัง
export const airTop = drawThalassaAir;
