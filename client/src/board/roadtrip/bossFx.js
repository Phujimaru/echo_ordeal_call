// ============================================================
//  เอฟเฟกต์บอส Road Trip บนกระดาน 2D (ผู้ใช้ 2026-11-14: "บอสต้องอลังการสมชื่อ · แม็กซ์ให้ฮาขำกลิ้ง")
//  ตารางเวลาอยู่ที่ rtTimeline.js (BFX) — ไฟล์นี้วาดอย่างเดียว · ground = ใต้ตัวละคร (ช่องเตือน รอยแตก วงคลื่น) · air = ทับตัวละคร
//   แม็กซ์ เวอร์สแตปเพน (devilTruck): การ์ตูนตลก — BONK ดาวกระจาย · ฝุ่นฟุ้งแบบสแลปสติก · ภาพติดตารถ F1 · ระเบิดมีคำ "ตูม!" ·
//    pitstop ทีมช่างโผล่ + นาฬิกาจับเวลา · drs ปีกหลังเปิด · spinout หมุนติ้ว + ดาวมึน · donut วงควันยาง + คอนเฟตติ · champagne ฉีดแชมเปญ ·
//    radio วิทยุทีม (กล่องดำแถบสีแบบถ่ายทอด F1) · ตาย = ธงตาหมากรุกปาดจอ
//   อัศวินเงามรณะ (darkKnight) / จอร์มุนกันด์ (jormungand): มืด/ขลัง — จอมืดลงตอนท่าใหญ่ · ออร่า · รอยแตก · คลื่นน้ำแข็ง · เกล็ดน้ำแข็ง · หมอกเย็น
//  ไม่สร้าง gradient ใหม่ทุกเฟรม: ใช้ภาพเรืองแคช (glowImg) · จำนวนอนุภาคคงที่ (สุ่มด้วย seed)
// ============================================================
import { F_TH, P, gEllipse, quad } from "../boardGeo";
import { BFX } from "./rtTimeline";
import { rtState } from "./theme";

const TAU = Math.PI * 2;
const H01 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const GLOW = new Map();
function glowImg(rgb) {
  let c = GLOW.get(rgb);
  if (!c && typeof document !== "undefined") {
    c = document.createElement("canvas"); c.width = c.height = 64;
    const x = c.getContext("2d"), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.4, `rgba(${rgb},.45)`); gr.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64); GLOW.set(rgb, c);
  }
  return c;
}
function glowAt(g, x, y, z, r, rgb, a) { if (!(a > 0)) return; const [sx, sy, s] = P(x, y, z), R = r * s, a0 = g.globalAlpha; g.globalAlpha = a0 * Math.min(1, a); g.drawImage(glowImg(rgb), sx - R, sy - R, R * 2, R * 2); g.globalAlpha = a0; }
const ease = (k) => 1 - Math.pow(1 - Math.max(0, Math.min(1, k)), 3);
function text(g, x, y, z, str, size, fill, stroke = "#1a1a24", rot = 0) {
  const [sx, sy, s] = P(x, y, z), fs = Math.max(10, size * s);
  g.save(); g.translate(sx, sy); g.rotate(rot);
  g.font = `900 ${fs}px ${F_TH}`; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineWidth = Math.max(2, fs * 0.16); g.strokeStyle = stroke; g.lineJoin = "round"; g.strokeText(str, 0, 0);
  g.fillStyle = fill; g.fillText(str, 0, 0); g.restore();
}
// ดาวการ์ตูน (BONK) แฉก n
function star(g, sx, sy, r, n, fill, rot = 0) {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) { const a = rot + i / (n * 2) * TAU, rr = i % 2 ? r * 0.45 : r; i ? g.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr) : g.moveTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); }
  g.closePath(); g.fillStyle = fill; g.fill(); g.lineWidth = Math.max(1.5, r * 0.08); g.strokeStyle = "#1a1a24"; g.stroke();
}
function puff(g, x, y, z, r, a, night, col) {
  const [sx, sy, s] = P(x, y, z);
  g.fillStyle = col || (night ? `rgba(170,170,200,${a})` : `rgba(235,228,215,${a})`);
  for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(sx + (i - 1) * r * s * 0.55, sy - (i % 2) * r * s * 0.25, r * s * (0.7 + (i % 2) * 0.25), 0, TAU); g.fill(); }
}
const MOVE_ICON = { ram: "🏎️", throw: "💥", swing: "💫", charge: "⚔️", slash: "⚔️", lunge: "🐍", tide: "🌊" };
const ACCENT = { devilTruck: "255,120,40", darkKnight: "170,80,255", jormungand: "90,200,255" };

// หาตำแหน่ง (กลางช่อง) ของยูนิต id จากรายการที่วาด
function unitAt(units, id, fallbackType) {
  const u = units.find((v) => v.id === id) || (fallbackType && units.find((v) => v.summon && typeof v.img === "string" && v.img.includes(`/mobs/${fallbackType}.`)));
  if (!u) return null;
  const K = Math.max(1, u.size | 0);
  return { x: u.rx + K / 2 + (u.ox || 0), y: u.ry + K / 2 + (u.oy || 0) };
}

// ---------------------------------------------------------------- ใต้ตัวละคร
export function drawBossGround(g, now, night) {
  // ช่องเตือนท่าใหญ่ (state.roadtrip.combat.warn) — แดงกะพริบ + ไอคอนกลางพื้นที่
  const rt = rtState(), w = rt && rt.combat && rt.combat.warn;
  if (w && Array.isArray(w.tiles) && w.tiles.length) {
    const pulse = 0.5 + 0.5 * Math.sin(now / 160);
    const boss = (rt.combat && rt.combat.boss) || "devilTruck", rgb = ACCENT[boss] || "255,80,60";
    for (const t of w.tiles) {
      quad(g, t.x, t.y, 0.04); g.fillStyle = `rgba(255,60,50,${0.18 + 0.22 * pulse})`; g.fill();
      g.strokeStyle = `rgba(255,${200 - pulse * 120},120,${0.6 + 0.4 * pulse})`; g.lineWidth = 2; g.stroke();
      // ลายทแยงเตือนอันตราย (เลื่อนไหล)
      const ph = (now / 600) % 1, [ax, ay] = P(t.x + ph, t.y + 0.05), [bx, by] = P(t.x + ph - 0.3, t.y + 0.95);
      g.strokeStyle = `rgba(255,230,120,${0.35 * pulse})`; g.lineWidth = 2; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
    }
    let cx = 0, cy = 0; for (const t of w.tiles) { cx += t.x + 0.5; cy += t.y + 0.5; } cx /= w.tiles.length; cy /= w.tiles.length;
    glowAt(g, cx, cy, 0.3, 1.4, rgb, 0.4 + 0.3 * pulse);
    const [sx, sy, s] = P(cx, cy, 0.9 + 0.1 * Math.sin(now / 200));
    g.font = `${Math.max(14, s * 0.7)}px ${F_TH}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(MOVE_ICON[w.move] || "❗", sx, sy); g.textBaseline = "alphabetic";
  }
  for (const b of BFX) {
    const age = now - b.t0; if (age < 0 || age > b.dur + 1500) continue;
    const k = age / b.dur;
    switch (b.kind) {
      case "entrance": { // วงออร่า + รอยแตกพื้น
        const rr = 0.4 + ease(k) * 2.6;
        g.strokeStyle = `rgba(${ACCENT[b.boss] || "255,120,40"},${0.7 * (1 - k)})`; g.lineWidth = 4; gEllipse(g, b.x, b.y, rr, 0.02, 40); g.stroke();
        crack(g, b.x, b.y, 1.6, 7, b.t0, Math.min(1, k * 2), ACCENT[b.boss] || "255,120,40", 1 - Math.max(0, k - 0.7) / 0.3);
        break;
      }
      case "devilTruck:throw": { // จุดตก: เงาเล็งก่อนตก · หลังตก = รอยไหม้ + วงฝุ่น + คลื่นกระแทก
        const land = (b.wind + b.act) / b.dur;
        if (k < land) { const kk = Math.max(0, (k - b.wind / b.dur) / (land - b.wind / b.dur)); gEllipse(g, b.to.x + 0.5, b.to.y + 0.5, 0.3 + kk * 0.9, 0.02, 30); g.fillStyle = `rgba(0,0,0,${0.12 + kk * 0.28})`; g.fill(); }
        else {
          const q = (age - b.wind - b.act) / 1500;
          gEllipse(g, b.to.x + 0.5, b.to.y + 0.5, 1.3, 0.01, 30); g.fillStyle = `rgba(40,25,20,${0.45 * (1 - q)})`; g.fill();
          g.strokeStyle = `rgba(255,240,200,${0.8 * (1 - q)})`; g.lineWidth = 3; gEllipse(g, b.to.x + 0.5, b.to.y + 0.5, 0.5 + q * 3.2, 0.03, 40); g.stroke();
        }
        break;
      }
      case "darkKnight:slash": case "darkKnight:charge": crackTiles(g, b, now, "190,90,255"); break;
      case "jormungand:lunge": case "jormungand:tide": { // พื้นน้ำแข็งเกาะ
        const kk = Math.min(1, Math.max(0, (age - b.wind) / (b.act * 0.6)));
        for (const t of b.tiles) { quad(g, t.x, t.y, 0.05); g.fillStyle = `rgba(200,240,255,${0.45 * kk * (1 - Math.max(0, (age - b.dur) / 1500))})`; g.fill(); }
        if (b.kind === "jormungand:tide") { const r = 0.3 + Math.min(1, (age - b.wind) / b.act) * 2.6; if (age > b.wind) { g.strokeStyle = `rgba(120,210,255,${0.8 * (1 - k)})`; g.lineWidth = 5; gEllipse(g, b.from.x + 0.5, b.from.y + 0.5, r, 0.05, 48); g.stroke(); g.strokeStyle = `rgba(255,255,255,${0.6 * (1 - k)})`; g.lineWidth = 2; gEllipse(g, b.from.x + 0.5, b.from.y + 0.5, r * 0.85, 0.06, 48); g.stroke(); } }
        break;
      }
      case "donut": { // วงรอยยาง
        g.strokeStyle = `rgba(30,30,35,${0.5 * (1 - Math.max(0, k - 0.7) / 0.3)})`; g.lineWidth = 6; gEllipse(g, b.x, b.y, 1.1, 0.01, 40); g.stroke();
        break;
      }
      default: break;
    }
  }
}
function crack(g, x, y, R, n, seed, grow, rgb, a) {
  g.strokeStyle = `rgba(${rgb},${0.85 * a})`; g.lineWidth = 2;
  for (let i = 0; i < n; i++) {
    let px = x, py = y, an = i / n * TAU + H01(seed + i) * 0.5;
    const p0 = P(px, py, 0.02); g.beginPath(); g.moveTo(p0[0], p0[1]);
    for (let j = 0; j < 4; j++) { an += (H01(seed + i * 7 + j) - 0.5) * 0.9; px += Math.cos(an) * R / 4 * grow; py += Math.sin(an) * R / 4 * grow; const q = P(px, py, 0.02); g.lineTo(q[0], q[1]); }
    g.stroke();
  }
}
function crackTiles(g, b, now, rgb) {
  const age = now - b.t0, kk = Math.min(1, Math.max(0, (age - b.wind) / 260)), a = 1 - Math.max(0, (age - b.dur) / 1500);
  if (kk <= 0) return;
  b.tiles.forEach((t, i) => { crack(g, t.x + 0.5, t.y + 0.5, 0.8, 4, b.t0 + i, kk, rgb, a); glowAt(g, t.x + 0.5, t.y + 0.5, 0.05, 0.7, rgb, 0.45 * a); });
}

// ---------------------------------------------------------------- ทับตัวละคร
export function drawBossAir(g, now, night, units, view) {
  for (const b of BFX) {
    const age = now - b.t0; if (age < 0 || age > b.dur + 400) continue;
    const k = Math.min(1, age / b.dur);
    switch (b.kind) {
      case "entrance": { // เสาแสง + ประกายพุ่งขึ้น
        glowAt(g, b.x, b.y, 1.5, 2.6 * (1 - k * 0.6), ACCENT[b.boss] || "255,120,40", 0.6 * (1 - k));
        for (let i = 0; i < 18; i++) { const ph = (k * 1.6 + H01(i)) % 1, a = H01(i + 9) * TAU, r = 0.3 + H01(i + 3) * 1.2; const [sx, sy, s] = P(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r, ph * 3.2); g.fillStyle = `rgba(${ACCENT[b.boss] || "255,180,80"},${1 - ph})`; g.fillRect(sx - s * 0.03, sy - s * 0.09, s * 0.06, s * 0.18); }
        if (b.boss === "devilTruck") text(g, b.x, b.y, 3.0 + Math.sin(age / 120) * 0.08, "แม็กซ์มาแล้ว!", 0.55 * Math.min(1, age / 250), "#ffd23f", "#1a1a24", Math.sin(age / 90) * 0.06);
        break;
      }
      case "warnFlash": { // แสงวาบเหนือช่องเตือน
        const a = 0.5 * Math.abs(Math.sin(age / 90)) * (1 - k);
        for (const t of b.tiles || []) glowAt(g, t.x + 0.5, t.y + 0.5, 0.2, 0.8, "255,70,60", a);
        break;
      }
      case "devilTruck:swing": maxSwing(g, b, age, night); break;
      case "devilTruck:ram": maxRam(g, b, age, night); break;
      case "devilTruck:throw": maxThrow(g, b, age, night); break;
      case "darkKnight:slash": case "darkKnight:charge": knight(g, b, age, night, view); break;
      case "jormungand:lunge": case "jormungand:tide": serpent(g, b, age, night, view); break;
      case "radio": radio(g, b, age, units); break;
      case "pitstop": pitstop(g, b, age, units, night); break;
      case "drs": drs(g, b, age, units); break;
      case "spinout": spinout(g, b, age, units); break;
      case "donut": donut(g, b, age, units, night); break;
      case "champagne": champagne(g, b, age, units); break;
      case "bossDie": flagWipe(g, b, age, view); break;
      case "clones": { // ร่างเงา 4 ร่างแยกออกจากตัวแล้วจาง
        for (let i = 0; i < 4; i++) { const an = i / 4 * TAU + 0.4, r = ease(Math.min(1, age / 500)) * 1.3; const [sx, sy, s] = P(b.x + Math.cos(an) * r, b.y + Math.sin(an) * r * 0.7, 0); g.fillStyle = `rgba(40,0,70,${0.6 * (1 - k)})`; g.beginPath(); g.ellipse(sx, sy - s * 0.95, s * 0.3, s * 0.95, 0, 0, TAU); g.fill(); glowAt(g, b.x + Math.cos(an) * r, b.y + Math.sin(an) * r * 0.7, 1.2, 0.7, "170,80,255", 0.5 * (1 - k)); }
        break;
      }
      case "freeze": { // ถนนเยือกแข็ง: ไอเย็นฟ้าทั้งจอ + เกล็ดน้ำแข็งตกจากบน
        const a = 0.28 * Math.sin(Math.min(1, k * 1.3) * Math.PI);
        g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = `rgba(170,225,255,${a})`; g.fillRect(0, 0, g.canvas.width, g.canvas.height); g.restore();
        for (let i = 0; i < 30; i++) { const ph = ((age / 1800) + H01(i)) % 1, x = view.x0 + H01(i + 3) * (view.x1 - view.x0), y = view.y0 + ph * (view.y1 - view.y0); g.fillStyle = `rgba(240,252,255,${0.8 * (1 - k)})`; g.fillText ? (g.font = "16px sans-serif", g.fillText("❄", x, y)) : null; }
        break;
      }
      case "tracer": { // กระสุนป้อมปืนบนหลังคา → เป้า
        const q = Math.min(1, age / 160), [ax, ay] = P(b.from.x + 0.5, b.from.y + 0.5, 1.8), [bx, by] = P(b.to.x + 0.5, b.to.y + 0.5, 0.6);
        const hx = ax + (bx - ax) * q, hy = ay + (by - ay) * q;
        g.strokeStyle = `rgba(255,230,140,${1 - k})`; g.lineWidth = 3; g.beginPath(); g.moveTo(ax + (bx - ax) * Math.max(0, q - 0.4), ay + (by - ay) * Math.max(0, q - 0.4)); g.lineTo(hx, hy); g.stroke();
        glowAt(g, b.from.x + 0.5, b.from.y + 0.5, 1.8, 0.5, "255,220,120", 1 - k);
        break;
      }
      default: break;
    }
  }
}

// ---------- แม็กซ์ (ฮา)
function bonk(g, x, y, age, t0, word = "BONK!") {
  if (age < 0 || age > 700) return;
  const q = age / 700, [sx, sy, s] = P(x, y, 1.0 + q * 0.6);
  g.save(); g.globalAlpha = 1 - q * q;
  star(g, sx, sy, s * (0.35 + q * 0.4), 8, "#ffd23f", q * 2);
  star(g, sx, sy, s * (0.2 + q * 0.25), 6, "#ff6a3a", -q * 3);
  g.restore();
  g.save(); g.globalAlpha = 1 - q * q; text(g, x, y, 1.6 + q * 0.5, word, 0.42 * (1 + 0.3 * Math.sin(q * 12)), "#ffffff", "#e0302a", (H01(t0) - 0.5) * 0.5); g.restore();
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + H01(t0 + i), r = q * 1.3; const [px, py, ps] = P(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6, 0.8 + Math.sin(q * Math.PI) * 0.6); star(g, px, py, ps * 0.09 * (1 - q), 5, i % 2 ? "#ffffff" : "#ffd23f", a); }
}
function maxSwing(g, b, age, night) {
  const from = { x: b.from.x + 0.5, y: b.from.y + 0.5 }, to = { x: b.to.x + 0.5, y: b.to.y + 0.5 };
  const base = Math.atan2(to.y - from.y, to.x - from.x);
  // ง้าง: เหงื่อแตก + สั่น · ฟาด: โค้งลมหมุนหลายชั้น
  if (age < b.wind) { sweat(g, from.x, from.y, age); return; }
  const k = Math.min(1, (age - b.wind) / b.act);
  for (let i = 0; i < 3; i++) {
    const kk = Math.max(0, k - i * 0.08), a0 = base - 1.4, a1 = a0 + kk * 2.8;
    g.strokeStyle = `rgba(255,${230 - i * 50},${180 - i * 60},${0.7 * (1 - k * 0.6) / (i + 1)})`; g.lineWidth = Math.max(3, 14 - i * 4); g.lineCap = "round";
    g.beginPath();
    for (let j = 0; j <= 16; j++) { const a = a0 + (a1 - a0) * j / 16, [sx, sy] = P(from.x + Math.cos(a) * (0.9 + i * 0.12), from.y + Math.sin(a) * (0.9 + i * 0.12), 0.6); j ? g.lineTo(sx, sy) : g.moveTo(sx, sy); }
    g.stroke();
  }
  g.lineCap = "butt";
  const hitT = age - b.wind - b.act * 0.5;
  for (const t of b.tiles) bonk(g, t.x + 0.5, t.y + 0.5, hitT, b.t0 + t.x * 3 + t.y);
  if (hitT > 0 && hitT < 600) for (let i = 0; i < 4; i++) puff(g, to.x + (H01(i) - 0.5), to.y + (H01(i + 4) - 0.5) * 0.6, 0.2 + hitT / 900, 0.25 + hitT / 1500, 0.55 * (1 - hitT / 600), night);
}
function sweat(g, x, y, age) {
  for (let i = 0; i < 3; i++) { const ph = ((age / 500) + i / 3) % 1; const [sx, sy, s] = P(x + 0.25 + i * 0.1, y, 1.8 - ph * 0.6); g.fillStyle = `rgba(150,210,255,${1 - ph})`; g.beginPath(); g.moveTo(sx, sy - s * 0.08); g.quadraticCurveTo(sx + s * 0.06, sy, sx, sy + s * 0.05); g.quadraticCurveTo(sx - s * 0.06, sy, sx, sy - s * 0.08); g.fill(); }
}
function maxRam(g, b, age, night) {
  const path = b.path || [b.from, b.to].filter(Boolean);
  if (age < b.wind) { // ง้าง: ล้อหมุนฟรี ควันยางพุ่ง + ไฟท่อ
    const p = path[0]; if (!p) return;
    for (let i = 0; i < 5; i++) { const ph = ((age / 260) + i / 5) % 1; puff(g, p.x + 0.5 - (path.length > 1 ? Math.sign(path[1].x - p.x) : 1) * (0.4 + ph), p.y + 0.5 + (H01(i) - 0.5) * 0.5, 0.15 + ph * 0.5, 0.18 + ph * 0.3, 0.6 * (1 - ph), night, "rgba(220,220,225," + (0.6 * (1 - ph)) + ")"); }
    text(g, p.x + 0.5, p.y + 0.5, 2.6, "บรื้นนนน!", 0.36, "#ffffff", "#e0302a", Math.sin(age / 50) * 0.08);
    return;
  }
  const k = Math.min(1, (age - b.wind) / Math.max(1, b.act)), n = path.length - 1;
  const at = (q) => { const f = q * n, i = Math.min(n - 1, Math.floor(f)), r = f - i, a = path[i], c = path[Math.min(n, i + 1)]; return { x: a.x + 0.5 + (c.x - a.x) * r, y: a.y + 0.5 + (c.y - a.y) * r }; };
  if (n >= 1) {
    // เส้นความเร็ว + ควันยางตามหลัง + ภาพติดตา
    const head = at(k);
    for (let i = 0; i < 6; i++) { const q = Math.max(0, k - i * 0.06), p = at(q); puff(g, p.x, p.y + (H01(i) - 0.5) * 0.3, 0.15, 0.2 + i * 0.05, 0.4 * (1 - i / 6) * (1 - Math.max(0, k - 0.9) * 10), night, `rgba(225,225,230,${0.4 * (1 - i / 6)})`); }
    const dx = path[n].x - path[0].x, dy = path[n].y - path[0].y, L = Math.hypot(dx, dy) || 1;
    g.strokeStyle = "rgba(255,255,255,.75)"; g.lineCap = "round";
    for (let i = 0; i < 7; i++) { const off = (H01(i) - 0.5) * 0.9, back = 0.6 + H01(i + 7) * 1.4; const a = P(head.x - dx / L * back - dy / L * off, head.y - dy / L * back + dx / L * off, 0.3 + H01(i + 2) * 0.7), c = P(head.x - dx / L * (back + 0.8) - dy / L * off, head.y - dy / L * (back + 0.8) + dx / L * off, 0.3 + H01(i + 2) * 0.7); g.lineWidth = 2; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(c[0], c[1]); g.stroke(); }
    g.lineCap = "butt";
  }
  // จบแนว: เบรกตัวโก่ง ฝุ่นฟุ้ง + "เอี๊ยด!"
  const endT = age - b.wind - b.act;
  if (endT > 0 && endT < 900) { const p = path[n] || b.to; text(g, p.x + 0.5, p.y + 0.5, 2.2 + endT / 2000, "เอี๊ยดดด!", 0.34, "#ffffff", "#2a2a33", -0.15); for (let i = 0; i < 5; i++) puff(g, p.x + 0.5 + (H01(i) - 0.5) * 1.4, p.y + 0.5 + (H01(i + 5) - 0.5) * 0.6, 0.2 + endT / 1500, 0.3 + endT / 1800, 0.6 * (1 - endT / 900), night); }
  // ชนคนระหว่างทาง: BONK ทุกช่องในแนว (ช่วงที่รถผ่าน)
  for (let i = 1; i < path.length; i++) { const hitT = age - b.wind - i * (b.act / Math.max(1, n)); if (b.tiles.some((t) => t.x === path[i].x && t.y === path[i].y)) bonk(g, path[i].x + 0.5, path[i].y + 0.5, hitT, b.t0 + i, i % 2 ? "BONK!" : "โป๊ก!"); }
}
function maxThrow(g, b, age, night) {
  const land = age - b.wind - b.act, x = b.to.x + 0.5, y = b.to.y + 0.5;
  if (age < b.wind) { const p = b.from; text(g, p.x + 0.5, p.y + 0.5, 2.7, "ฮึบบบ!", 0.36, "#ffd23f", "#2a2a33", Math.sin(age / 40) * 0.1); sweat(g, p.x + 0.5, p.y + 0.5, age); return; }
  if (land < 0) { // ระหว่างบิน: ลูกศรเล็งกะพริบ
    const [sx, sy, s] = P(x, y, 0.1), a = 0.5 + 0.5 * Math.sin(age / 70);
    g.strokeStyle = `rgba(255,60,50,${a})`; g.lineWidth = 3; g.beginPath(); g.arc(sx, sy, s * 0.5, 0, TAU); g.stroke();
    return;
  }
  // ระเบิด: ลูกไฟ · เศษรถ · วงคลื่น · "ตูม!"
  const q = Math.min(1, land / 900);
  glowAt(g, x, y, 0.6, 2.6 * (0.5 + q), "255,150,60", 1 - q);
  glowAt(g, x, y, 0.4, 1.4, "255,240,190", Math.max(0, 1 - q * 2.5));
  for (let i = 0; i < 12; i++) { const a = H01(b.t0 + i) * TAU, sp = 0.8 + H01(i + 3) * 1.6, tt = land / 1000; const px = x + Math.cos(a) * sp * tt, py = y + Math.sin(a) * sp * tt * 0.6, pz = Math.max(0.05, 0.3 + 2.6 * tt - 4.5 * tt * tt); const [sx, sy, s] = P(px, py, pz); g.save(); g.translate(sx, sy); g.rotate(tt * 9 + i); g.fillStyle = i % 3 ? "#2d333b" : "#e11d2a"; g.globalAlpha = 1 - q; g.fillRect(-s * 0.06, -s * 0.03, s * 0.12, s * 0.06); g.restore(); }
  for (let i = 0; i < 8; i++) puff(g, x + Math.cos(i) * q * 1.2, y + Math.sin(i) * q * 0.7, 0.2 + q * 0.9, 0.3 + q * 0.5, 0.65 * (1 - q), night, i % 2 ? `rgba(80,70,70,${0.6 * (1 - q)})` : undefined);
  if (land < 900) text(g, x, y, 2.0 + q, "ตูมมม!", 0.6 * (1 + 0.2 * Math.sin(q * 20)), "#ffd23f", "#c0281f", -0.1);
}
function at(units, b, k) { const p = unitAt(units, b.id, "devilTruck"); return p || (b.x != null ? { x: b.x, y: b.y } : null); }
function radio(g, b, age, units) {
  const p = at(units, b); if (!p) return;
  const pop = Math.min(1, age / 140), out = Math.max(0, (age - b.dur + 250) / 250);
  const [sx, sy, s] = P(p.x, p.y, 2.7);
  const msg = String(b.text || "").slice(0, 60);
  g.save(); g.globalAlpha = 1 - out; g.translate(sx, sy - s * 0.3); g.scale(pop, pop);
  g.font = `700 ${Math.max(12, s * 0.26)}px ${F_TH}`;
  const w = Math.max(s * 1.6, g.measureText(msg).width + s * 0.5), h = s * 0.62;
  g.fillStyle = "rgba(14,16,22,.92)"; g.beginPath(); g.roundRect(-w / 2, -h, w, h, s * 0.08); g.fill();
  g.fillStyle = "#1e3a8a"; g.fillRect(-w / 2, -h, s * 0.12, h); g.fillStyle = "#e11d2a"; g.fillRect(-w / 2 + s * 0.12, -h, s * 0.04, h);
  g.fillStyle = "#ffd23f"; g.font = `800 ${Math.max(9, s * 0.15)}px ${F_TH}`; g.textAlign = "left"; g.fillText("📻 MAX · TEAM RADIO", -w / 2 + s * 0.22, -h + s * 0.18);
  for (let i = 0; i < 10; i++) { const hh = s * 0.05 * (0.4 + Math.abs(Math.sin(age / 60 + i * 1.7))); g.fillRect(w / 2 - s * 0.62 + i * s * 0.05, -h + s * 0.14 - hh / 2, s * 0.03, hh); }
  g.fillStyle = "#ffffff"; g.font = `700 ${Math.max(12, s * 0.24)}px ${F_TH}`; g.fillText(msg, -w / 2 + s * 0.22, -h + s * 0.45);
  g.fillStyle = "rgba(14,16,22,.92)"; g.beginPath(); g.moveTo(-s * 0.1, 0); g.lineTo(s * 0.1, 0); g.lineTo(0, s * 0.18); g.fill();
  g.restore();
}
function pitstop(g, b, age, units, night) {
  const p = at(units, b); if (!p) return;
  const crew = [[-0.9, -0.4], [0.9, -0.4], [-0.9, 0.5], [0.9, 0.5]];
  crew.forEach(([dx, dy], i) => {
    const pop = Math.min(1, Math.max(0, (age - i * 90) / 200)), leave = Math.max(0, (age - b.dur + 300) / 300), bounce = Math.abs(Math.sin(age / 70 + i)) * 0.12;
    const [sx, sy, s] = P(p.x + dx * (1 + leave), p.y + dy, bounce);
    if (pop <= 0 || leave >= 1) return;
    g.save(); g.translate(sx, sy); g.scale(pop, pop); g.globalAlpha = 1 - leave;
    g.fillStyle = "#1e3a8a"; g.beginPath(); g.roundRect(-s * 0.13, -s * 0.5, s * 0.26, s * 0.36, s * 0.06); g.fill(); // ชุดทีม
    g.fillStyle = "#e11d2a"; g.fillRect(-s * 0.13, -s * 0.38, s * 0.26, s * 0.05);
    g.fillStyle = "#f2c21b"; g.beginPath(); g.arc(0, -s * 0.6, s * 0.12, 0, TAU); g.fill(); // หมวกกันน็อก
    g.fillStyle = "#1a1a24"; g.fillRect(-s * 0.08, -s * 0.62, s * 0.16, s * 0.04);
    g.fillStyle = "#2d333b"; for (const lx of [-0.07, 0.07]) g.fillRect(lx * s - s * 0.03, -s * 0.16, s * 0.06, s * 0.16);
    if (i % 2 === 0) { g.fillStyle = "#c9d0d6"; g.save(); g.translate(s * 0.15, -s * 0.3); g.rotate(age / 30); g.fillRect(-s * 0.02, -s * 0.12, s * 0.04, s * 0.24); g.restore(); } // ปืนขันน็อตหมุนติ้ว
    else { g.fillStyle = "#15151a"; g.beginPath(); g.arc(s * 0.18, -s * 0.25, s * 0.12, 0, TAU); g.fill(); g.fillStyle = "#e5e5e5"; g.beginPath(); g.arc(s * 0.18, -s * 0.25, s * 0.05, 0, TAU); g.fill(); } // ยาง
    g.restore();
  });
  // นาฬิกาจับเวลา
  const [sx, sy, s] = P(p.x, p.y, 2.5), secs = Math.min(1.8, age / b.dur * 1.8);
  g.save(); g.translate(sx, sy);
  g.fillStyle = "rgba(14,16,22,.9)"; g.beginPath(); g.roundRect(-s * 0.55, -s * 0.22, s * 1.1, s * 0.44, s * 0.1); g.fill();
  g.fillStyle = age > b.dur * 0.9 ? "#7dff8a" : "#ffffff"; g.font = `900 ${Math.max(12, s * 0.3)}px ${F_TH}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(`⏱ ${secs.toFixed(1)} วิ`, 0, s * 0.01);
  g.restore();
  if (age % 200 < 16) puff(g, p.x + (H01(age) - 0.5), p.y + 0.3, 0.2, 0.2, 0.4, night);
}
function drs(g, b, age, units) {
  const p = at(units, b); if (!p) return;
  const q = Math.min(1, age / 300);
  text(g, p.x, p.y, 2.4 + Math.sin(age / 100) * 0.05, "DRS เปิด!", 0.36 * q, "#7dff8a", "#0b3d1a");
  g.strokeStyle = "rgba(160,255,190,.8)"; g.lineCap = "round";
  for (let i = 0; i < 8; i++) { const ph = ((age / 300) + H01(i)) % 1, y = p.y + (H01(i + 3) - 0.5) * 0.8, z = 0.2 + H01(i + 5) * 1.2; const a = P(p.x - 0.4 - ph * 1.6, y, z), c = P(p.x - 0.9 - ph * 1.6, y, z); g.lineWidth = 2; g.globalAlpha = 1 - ph; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(c[0], c[1]); g.stroke(); }
  g.globalAlpha = 1; g.lineCap = "butt";
}
function spinout(g, b, age, units) {
  const p = at(units, b); if (!p) return;
  for (let i = 0; i < 5; i++) { const a = age / 180 + i / 5 * TAU, [sx, sy, s] = P(p.x + Math.cos(a) * 0.45, p.y + Math.sin(a) * 0.25, 2.2); star(g, sx, sy, s * 0.11, 5, i % 2 ? "#ffd23f" : "#ffffff", a * 2); }
  if (age < 1200) text(g, p.x, p.y, 2.9, "มึนนน~", 0.34, "#ffffff", "#7a3fa8", Math.sin(age / 120) * 0.2);
}
function donut(g, b, age, units, night) {
  const p = at(units, b) || { x: b.x, y: b.y }; if (!p) return;
  b.x = p.x; b.y = p.y;
  for (let i = 0; i < 10; i++) { const a = age / 160 + i / 10 * TAU; puff(g, p.x + Math.cos(a) * 1.1, p.y + Math.sin(a) * 1.1, 0.2 + (i % 3) * 0.1, 0.32, 0.45, night, "rgba(230,230,235,.45)"); }
  for (let i = 0; i < 26; i++) { const ph = ((age / 1600) + H01(i)) % 1, [sx, sy, s] = P(p.x + (H01(i + 1) - 0.5) * 3, p.y + (H01(i + 2) - 0.5) * 2, 3.2 - ph * 3); g.fillStyle = ["#ff6fa8", "#ffd23f", "#5aa0e0", "#3fae7a", "#ffffff"][i % 5]; g.save(); g.translate(sx, sy); g.rotate(ph * 12 + i); g.fillRect(-s * 0.04, -s * 0.02, s * 0.08, s * 0.04); g.restore(); }
  if (age < 1600) text(g, p.x, p.y, 3.0, "เย้~ โดนัท!", 0.36, "#ffd23f", "#2a2a33", Math.sin(age / 90) * 0.1);
}
function champagne(g, b, age, units) {
  const p = at(units, b); if (!p) return;
  const [ox, oy, s] = P(p.x + 0.2, p.y, 1.6);
  for (let i = 0; i < 40; i++) {
    const ph = ((age / 700) + H01(i)) % 1, a = -Math.PI / 2 + (H01(i + 4) - 0.5) * 1.2, v = s * (2.2 + H01(i + 9));
    const x = ox + Math.cos(a) * v * ph, y = oy + Math.sin(a) * v * ph + s * 3 * ph * ph;
    g.fillStyle = `rgba(255,${235 - (i % 3) * 20},${150 + (i % 2) * 80},${1 - ph})`; g.beginPath(); g.arc(x, y, Math.max(1.2, s * 0.035), 0, TAU); g.fill();
  }
  g.fillStyle = "#1f5a2a"; g.save(); g.translate(ox, oy); g.rotate(-0.5); g.fillRect(-s * 0.05, 0, s * 0.1, s * 0.35); g.fillStyle = "#e0b84a"; g.fillRect(-s * 0.05, -s * 0.05, s * 0.1, s * 0.08); g.restore();
}
function flagWipe(g, b, age, view) {
  // ธงตาหมากรุกปาดผ่านจอ + "เข้าเส้นชัย(ด้วยการล้ม)"
  const k = Math.min(1, age / b.dur), x0 = view.x0, x1 = view.x1, y0 = view.y0, y1 = view.y1, W = x1 - x0, cell = Math.max(24, (y1 - y0) / 14);
  const front = x0 - W * 0.3 + k * W * 1.6;
  g.save(); g.globalAlpha = k < 0.85 ? 0.92 : 0.92 * (1 - (k - 0.85) / 0.15);
  for (let yy = y0, r = 0; yy < y1; yy += cell, r++) {
    const wave = Math.sin(r * 0.6 + age / 120) * cell * 0.6;
    for (let xx = front - W * 0.6, c = 0; xx < front + wave; xx += cell, c++) { g.fillStyle = (r + c) % 2 ? "#111" : "#f4f4f4"; g.fillRect(xx, yy, cell + 1, cell + 1); }
  }
  g.restore();
  if (k > 0.25 && k < 0.95) { const [cx, cy] = [(x0 + x1) / 2, (y0 + y1) / 2]; g.save(); g.font = `900 ${cell * 1.6}px ${F_TH}`; g.textAlign = "center"; g.lineWidth = cell * 0.25; g.strokeStyle = "#e0302a"; g.strokeText("แม็กซ์ เข้าพิตถาวร!", cx, cy); g.fillStyle = "#ffffff"; g.fillText("แม็กซ์ เข้าพิตถาวร!", cx, cy); g.restore(); }
}

// ---------- อัศวินเงามรณะ (มืด ขลัง)
function darken(g, view, a) { if (a <= 0) return; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = `rgba(6,2,14,${a})`; g.fillRect(0, 0, g.canvas.width, g.canvas.height); g.restore(); }
function knight(g, b, age, night, view) {
  const k = Math.min(1, age / b.dur);
  darken(g, view, 0.38 * Math.sin(Math.min(1, k * 1.2) * Math.PI));
  const from = { x: b.from.x + 0.5, y: b.from.y + 0.5 };
  // ออร่ามืดตอนง้าง (ควันม่วงพวยพุ่ง)
  if (age < b.wind + 200) for (let i = 0; i < 10; i++) { const ph = ((age / 500) + H01(i)) % 1, a = H01(i + 2) * TAU; const [sx, sy, s] = P(from.x + Math.cos(a) * 0.4 * (1 - ph), from.y + Math.sin(a) * 0.3 * (1 - ph), ph * 2.4); g.fillStyle = `rgba(120,40,200,${0.6 * (1 - ph)})`; g.beginPath(); g.arc(sx, sy, s * (0.1 + ph * 0.15), 0, TAU); g.fill(); }
  glowAt(g, from.x, from.y, 1.0, 1.6, "150,60,255", 0.5 * (1 - k));
  const kk = Math.max(0, Math.min(1, (age - b.wind) / Math.max(1, b.act)));
  if (b.kind === "darkKnight:slash") {
    // คลื่นดาบเสี้ยวจันทร์ 2 ชั้นกวาดผ่านช่อง
    let cx = 0, cy = 0; for (const t of b.tiles) { cx += t.x + 0.5; cy += t.y + 0.5; } cx /= Math.max(1, b.tiles.length); cy /= Math.max(1, b.tiles.length);
    const base = Math.atan2(cy - from.y, cx - from.x);
    if (kk > 0) for (let i = 0; i < 2; i++) {
      const R = 1.2 + i * 0.6, a0 = base - 1.1, a1 = a0 + ease(kk) * 2.2;
      g.strokeStyle = i ? `rgba(230,200,255,${0.9 * (1 - kk)})` : `rgba(140,50,255,${0.95 * (1 - kk * 0.7)})`; g.lineWidth = i ? 4 : 16; g.lineCap = "round";
      g.beginPath(); for (let j = 0; j <= 18; j++) { const a = a0 + (a1 - a0) * j / 18, [sx, sy] = P(from.x + Math.cos(a) * R, from.y + Math.sin(a) * R, 0.7); j ? g.lineTo(sx, sy) : g.moveTo(sx, sy); } g.stroke();
    }
    g.lineCap = "butt";
  } else if (b.path) {
    // พุ่ง: เงาซ้อนตามแนว (ร่างโคลนเงา) + รอยฟันตัด
    const n = b.path.length - 1, f = kk * n;
    for (let i = 0; i <= Math.min(n, Math.floor(f)); i++) { const p = b.path[i], a = 0.5 * (1 - (f - i) / 4); if (a <= 0) continue; const [sx, sy, s] = P(p.x + 0.5, p.y + 0.5, 0); g.fillStyle = `rgba(60,10,100,${a})`; g.beginPath(); g.ellipse(sx, sy - s * 0.9, s * 0.3, s * 0.9, 0, 0, TAU); g.fill(); }
    for (const t of b.tiles) { const hitT = age - b.wind - (b.path.findIndex((p) => p.x === t.x && p.y === t.y)) * (b.act / Math.max(1, n)); if (hitT > 0 && hitT < 500) { const q = hitT / 500, [sx, sy, s] = P(t.x + 0.5, t.y + 0.5, 0.8); g.strokeStyle = `rgba(220,180,255,${1 - q})`; g.lineWidth = 5; g.beginPath(); g.moveTo(sx - s * 0.6, sy - s * 0.4); g.lineTo(sx + s * 0.6, sy + s * 0.4); g.stroke(); } }
  }
}
// ---------- จอร์มุนกันด์ (น้ำ/น้ำแข็ง)
function serpent(g, b, age, night, view) {
  const k = Math.min(1, age / b.dur);
  darken(g, view, 0.25 * Math.sin(Math.min(1, k * 1.2) * Math.PI));
  const from = { x: b.from.x + 0.5, y: b.from.y + 0.5 }, kk = Math.max(0, Math.min(1, (age - b.wind) / Math.max(1, b.act)));
  if (age < b.wind) glowAt(g, from.x, from.y, 1.2, 1.8, "90,200,255", 0.6 * age / b.wind);
  if (b.kind === "jormungand:lunge" && b.tiles.length && kk > 0) {
    // ลำน้ำพุ่งเป็นงูตามแนว (คลื่นไซน์) + เกล็ดน้ำแข็ง
    const end = b.tiles[Math.min(b.tiles.length - 1, Math.floor(ease(kk) * b.tiles.length))];
    const ex = end.x + 0.5, ey = end.y + 0.5;
    g.lineCap = "round";
    for (const [w, c] of [[16, "rgba(40,140,230,.85)"], [8, "rgba(150,230,255,.95)"], [3, "rgba(255,255,255,.9)"]]) {
      g.strokeStyle = c; g.lineWidth = w; g.beginPath();
      for (let j = 0; j <= 20; j++) { const q = j / 20, x = from.x + (ex - from.x) * q, y = from.y + (ey - from.y) * q, z = 0.6 + Math.sin(q * 9 - age / 60) * 0.18 * (1 - q * 0.5), [sx, sy] = P(x, y, z); j ? g.lineTo(sx, sy) : g.moveTo(sx, sy); }
      g.stroke();
    }
    g.lineCap = "butt";
    glowAt(g, ex, ey, 0.6, 1.0, "180,240,255", 0.8);
  }
  // เกล็ดน้ำแข็งระเบิดบนช่องที่โดน + หมอกเย็น
  if (kk > 0.4) for (const [i, t] of b.tiles.entries()) {
    const q = Math.min(1, (kk - 0.4) / 0.6);
    for (let j = 0; j < 4; j++) { const a = H01(i * 7 + j) * TAU, r = q * 0.5; const [sx, sy, s] = P(t.x + 0.5 + Math.cos(a) * r, t.y + 0.5 + Math.sin(a) * r * 0.6, 0.2 + q * 0.6 * H01(j + i)); g.fillStyle = `rgba(220,248,255,${1 - q})`; g.beginPath(); g.moveTo(sx, sy - s * 0.14); g.lineTo(sx + s * 0.04, sy); g.lineTo(sx, sy + s * 0.06); g.lineTo(sx - s * 0.04, sy); g.fill(); }
    puff(g, t.x + 0.5, t.y + 0.5, 0.15, 0.35, 0.3 * (1 - q * 0.5), night, `rgba(220,240,255,${0.3 * (1 - q * 0.5)})`);
  }
}
