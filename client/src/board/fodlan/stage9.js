// ============================================================
//  Nautilus ชั้น 3 "ปล่องภูเขาไฟใต้ทะเล" −1,000 ม. (area 48 · GRID_PLAN §8.9) — ภาพบนกระดาน (สัญญาดูหัวไฟล์ ./index.js · ของกลาง ./nautilusArt.js)
//  ผัง server/fodlan/map9.js · กติกา server/fodlan/stage9.js · ขั้นถัดไปเติม items/air ของลูกเล่นของชั้นที่นี่
// ============================================================
import { makeNautilusStage } from "./nautilusArt";

const M = makeNautilusStage({
  stage: 9, far: "chimneys", deco: "cracks", shafts: 0, vignette: 0.5, motes: 10,
  water: ["#08141e", "#0a0606"], bed: ["#16100f", "#050303"], tile: ["rgba(255,170,120,.03)", "rgba(0,0,0,.14)"],
  grid: "rgba(255,150,90,.1)", border: "rgba(255,150,90,.45)", accent: "#9fe0ff", glowRGB: "255,120,50", snowRGB: "200,190,185", fogRGB: "18,10,8",
  dots: ["#1d1716", "#120d0c", "#2a1a14"], farCol: "#0a0808",
  rock: ["#2c2829", "#1c191a", "#100e0f"], coral: ["#5a3a30"],
  kinds: ["fd_nt_vent", "fd_nt_basalt", "fd_nt_tubeworm"], tall: ["fd_nt_vent"], groundGlow: ["fd_nt_vent"],
});

export const { kinds, tall, fx, fogRGB, theme, drawObstacle, bakeSpecial, animSpecial, ground, air } = M;
