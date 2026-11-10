// ============================================================
//  ภาพวาดแผนที่ Eos ทั้งผืนจากด้านบน — ใช้ในหน้าแผนที่ภาพรวม (EosMap.jsx · เดิมใช้ในฉากเปิดรุ่นก่อน)
//  วาดครั้งเดียวลง canvas ขนาดคงที่ → ฉากเลื่อนกล้องด้วย CSS transform (GPU) ไม่ต้องวาดใหม่ทุกเฟรม
//  ชั้น: สีพื้นแบบนุ่ม (ขยายจากภาพเล็ก = ขอบกลืนกัน) → น้ำ/ชายฝั่ง → ถนน → ป่า/ต้นไม้ → อาคาร/กำแพง (เงาทอด) → เสาคริสตัลเรือง → แสงไฟเมืองตอนกลางคืน → เกรน
// ============================================================
const GROUND = {
  fd_eos_road: [86, 84, 82], fd_eos_plaza: [196, 186, 166], fd_eos_sand: [222, 190, 128], fd_eos_bridge: [140, 106, 70],
  fd_eos_stable: [196, 168, 98], fd_eos_forest: [62, 98, 48], fd_eos_shallow: [92, 168, 186],
};
const WATER = new Set(["fd_eos_water", "fd_eos_canal"]);
const GRASS = [112, 140, 72];
const BUILD = new Set(["fd_eos_bldg", "fd_eos_garage", "fd_eos_pump", "fd_eos_tomb"]);
const WALL = new Set(["fd_eos_wall", "fd_eos_turret"]);

function hash(x, y, s = 0) { const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); }

export function paintEos(board, { size = 1536, night = false } = {}) {
  const cols = (board && board.cols) || 32, rows = (board && board.rows) || 32;
  const terr = (board && board.terrain) || {}, spec = (board && board.special) || {};
  const T = size / Math.max(cols, rows);
  const cv = document.createElement("canvas");
  cv.width = Math.round(cols * T); cv.height = Math.round(rows * T);
  const g = cv.getContext("2d");
  // 1) พื้นนุ่ม: ภาพเล็ก (ช่องละ 1 พิกเซล + น้ำ) ขยายแบบ smoothing → ขอบโซนกลืนเป็นธรรมชาติ
  const lo = document.createElement("canvas"); lo.width = cols; lo.height = rows;
  const lg = lo.getContext("2d"), img = lg.createImageData(cols, rows);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const k = `${x},${y}`, tk = terr[k], sk = spec[k];
    let c = GROUND[sk] || GRASS;
    if (WATER.has(tk)) c = tk === "fd_eos_canal" ? [40, 120, 136] : [36, 96, 140];
    else if (BUILD.has(tk) || WALL.has(tk) || tk === "fd_eos_lamp" || tk === "fd_eos_domecore" || tk === "fd_eos_lever" || tk === "fd_eos_switch") c = [170, 164, 150];
    else if (tk === "fd_eos_tree") c = [70, 108, 52];
    else if (tk === "fd_eos_rock") c = [128, 126, 110];
    const n = (hash(x, y) - 0.5) * 14;
    const i = (y * cols + x) * 4;
    img.data[i] = c[0] + n; img.data[i + 1] = c[1] + n; img.data[i + 2] = c[2] + n; img.data[i + 3] = 255;
  }
  lg.putImageData(img, 0, 0);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
  g.filter = `blur(${Math.round(T * 0.14)}px)`;
  g.drawImage(lo, -T * 0.5, -T * 0.5, cv.width + T, cv.height + T);
  g.filter = "none";
  // 1b) ถนน/ลานเมือง/สะพาน: วาดคมทับพื้นนุ่ม (ขอบมนเล็กน้อย) — พื้นเบลอทั้งหมดดูเลอะ
  const PAVE = { fd_eos_road: "#55534f", fd_eos_plaza: "#cfc4ab", fd_eos_bridge: "#8a6a46" };
  for (const [kind, col] of Object.entries(PAVE)) {
    g.fillStyle = col;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const k = `${x},${y}`;
      const isP = spec[k] === kind || (kind === "fd_eos_plaza" && (BUILD.has(terr[k]) || WALL.has(terr[k]) || terr[k] === "fd_eos_lamp" || terr[k] === "fd_eos_domecore" || terr[k] === "fd_eos_switch" || terr[k] === "fd_eos_lever" || terr[k] === "fd_eos_pillar") && /plaza|road/.test(spec[`${x + 1},${y}`] || spec[`${x - 1},${y}`] || spec[`${x},${y + 1}`] || spec[`${x},${y - 1}`] || ""));
      if (!isP) continue;
      g.beginPath(); g.roundRect ? g.roundRect(x * T - 0.5, y * T - 0.5, T + 1, T + 1, T * 0.12) : g.rect(x * T - 0.5, y * T - 0.5, T + 1, T + 1); g.fill();
    }
  }
  // ลายกระเบื้องลานเมือง
  g.strokeStyle = "rgba(120,108,86,.22)"; g.lineWidth = 1;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (spec[`${x},${y}`] === "fd_eos_plaza") g.strokeRect(x * T + T * 0.08, y * T + T * 0.08, T * 0.84, T * 0.84);
  // 2) น้ำ: ประกายผิวน้ำ + ฟองชายฝั่ง
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const tk = terr[`${x},${y}`];
    if (!WATER.has(tk)) continue;
    const cx = (x + 0.5) * T, cy = (y + 0.5) * T;
    const shore = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const o = terr[`${x + dx},${y + dy}`]; return x + dx >= 0 && y + dy >= 0 && x + dx < cols && y + dy < rows && !WATER.has(o) && spec[`${x + dx},${y + dy}`] !== "fd_eos_shallow"; });
    if (shore) { g.fillStyle = "rgba(220,240,255,.18)"; g.beginPath(); g.arc(cx, cy, T * 0.62, 0, 7); g.fill(); }
    g.strokeStyle = "rgba(200,235,255,.22)"; g.lineWidth = Math.max(1, T * 0.04);
    for (let i = 0; i < 2; i++) { const ox = (hash(x, y, i) - 0.5) * T * 0.6, oy = (hash(y, x, i) - 0.5) * T * 0.6; g.beginPath(); g.moveTo(cx + ox - T * 0.16, cy + oy); g.quadraticCurveTo(cx + ox, cy + oy - T * 0.06, cx + ox + T * 0.16, cy + oy); g.stroke(); }
  }
  // 3) ถนน: เส้นกลางถนนประ
  g.strokeStyle = "rgba(240,226,170,.55)"; g.lineWidth = Math.max(1, T * 0.05); g.setLineDash([T * 0.2, T * 0.2]);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (spec[`${x},${y}`] !== "fd_eos_road") continue;
    const r = spec[`${x + 1},${y}`] === "fd_eos_road", d = spec[`${x},${y + 1}`] === "fd_eos_road";
    if (r && !d && hash(x, y, 3) > 0.5) { g.beginPath(); g.moveTo(x * T, (y + 0.5) * T); g.lineTo((x + 1) * T, (y + 0.5) * T); g.stroke(); }
  }
  g.setLineDash([]);
  // 4) ป่า/ต้นไม้: พุ่มกลมมีเงา
  const tree = (cx, cy, r, dark) => {
    g.fillStyle = "rgba(0,0,0,.28)"; g.beginPath(); g.ellipse(cx + r * 0.35, cy + r * 0.35, r, r * 0.8, 0, 0, 7); g.fill();
    const gr = g.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r);
    gr.addColorStop(0, dark ? "#5f8f3f" : "#7fb04f"); gr.addColorStop(1, dark ? "#24401c" : "#33582a");
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
  };
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const k = `${x},${y}`;
    if (spec[k] === "fd_eos_forest") for (let i = 0; i < 3; i++) tree((x + 0.2 + hash(x, y, i) * 0.6) * T, (y + 0.2 + hash(y, x, i) * 0.6) * T, T * (0.22 + hash(x, y, i + 5) * 0.12), true);
    else if (terr[k] === "fd_eos_tree") tree((x + 0.5) * T, (y + 0.5) * T, T * 0.42, false);
    else if (terr[k] === "fd_eos_rock") { g.fillStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.ellipse((x + 0.6) * T, (y + 0.62) * T, T * 0.36, T * 0.24, 0, 0, 7); g.fill(); g.fillStyle = "#9a9686"; g.beginPath(); g.ellipse((x + 0.5) * T, (y + 0.5) * T, T * 0.34, T * 0.26, 0.4, 0, 7); g.fill(); }
  }
  // 5) อาคาร/กำแพง: หลังคา + เงาทอดทิศตะวันออกเฉียงใต้
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const tk = terr[`${x},${y}`];
    if (!BUILD.has(tk) && !WALL.has(tk)) continue;
    const h = WALL.has(tk) ? 0.18 : 0.22 + hash(x, y, 9) * 0.3;
    g.fillStyle = "rgba(0,0,0,.32)"; g.fillRect((x + 0.1 + h) * T, (y + 0.1 + h) * T, T * 0.84, T * 0.84);
    const roof = WALL.has(tk) ? "#b3a68c" : tk === "fd_eos_garage" ? "#9a8f7a" : tk === "fd_eos_pump" ? "#c94a33" : tk === "fd_eos_tomb" ? "#6f6a60" : ["#8d97a5", "#7d8796", "#a0a9b6"][Math.floor(hash(x, y, 2) * 3)];
    g.fillStyle = "rgba(40,44,52,.55)"; g.fillRect((x + 0.08) * T, (y + 0.08 + 0.84 - 0.1) * T, T * 0.84, T * 0.14); // ผนังด้านใต้ (ดูนูน)
    g.fillStyle = roof; g.fillRect((x + 0.08) * T, (y + 0.06) * T, T * 0.84, T * 0.8);
    g.fillStyle = "rgba(255,255,255,.16)"; g.fillRect((x + 0.08) * T, (y + 0.08) * T, T * 0.84, T * 0.12);
    if (night && !WALL.has(tk)) for (let i = 0; i < 3; i++) if (hash(x, y, i + 20) > 0.45) { g.fillStyle = "rgba(255,214,140,.9)"; g.fillRect((x + 0.2 + hash(x, y, i) * 0.55) * T, (y + 0.25 + hash(y, x, i) * 0.5) * T, T * 0.07, T * 0.07); }
  }
  // 6) กลางคืน: มืดลง + แสงไฟเมือง
  if (night) {
    g.fillStyle = "rgba(10,18,48,.55)"; g.fillRect(0, 0, cv.width, cv.height);
    g.globalCompositeOperation = "lighter";
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (terr[`${x},${y}`] !== "fd_eos_lamp" && !(spec[`${x},${y}`] === "fd_eos_plaza" && hash(x, y, 7) > 0.7)) continue;
      const gr = g.createRadialGradient((x + 0.5) * T, (y + 0.5) * T, 0, (x + 0.5) * T, (y + 0.5) * T, T * 1.6);
      gr.addColorStop(0, "rgba(255,190,110,.5)"); gr.addColorStop(1, "rgba(255,190,110,0)");
      g.fillStyle = gr; g.fillRect((x - 1.5) * T, (y - 1.5) * T, T * 4, T * 4);
    }
    g.globalCompositeOperation = "source-over";
  }
  // 7) เสาคริสตัล: แสงฟ้าเรือง
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (terr[`${x},${y}`] !== "fd_eos_pillar") continue;
    const cx = (x + 0.5) * T, cy = (y + 0.5) * T;
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, T * 2.2);
    gr.addColorStop(0, "rgba(170,230,255,.85)"); gr.addColorStop(0.3, "rgba(120,200,255,.35)"); gr.addColorStop(1, "rgba(120,200,255,0)");
    g.fillStyle = gr; g.fillRect(cx - T * 2.2, cy - T * 2.2, T * 4.4, T * 4.4);
    g.fillStyle = "#e8f8ff"; g.beginPath(); g.moveTo(cx, cy - T * 0.42); g.lineTo(cx + T * 0.24, cy); g.lineTo(cx, cy + T * 0.42); g.lineTo(cx - T * 0.24, cy); g.closePath(); g.fill();
  }
  // 8) เกรน + ขอบมืด
  const vg = g.createRadialGradient(cv.width / 2, cv.height / 2, cv.width * 0.35, cv.width / 2, cv.height / 2, cv.width * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,10,.35)");
  g.fillStyle = vg; g.fillRect(0, 0, cv.width, cv.height);
  return { canvas: cv, T, cols, rows };
}
