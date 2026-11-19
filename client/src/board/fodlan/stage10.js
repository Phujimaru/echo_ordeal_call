// ============================================================
//  Nautilus ชั้น 4 "นครจมบาดาล" −3,000 ม. (area 49 · GRID_PLAN §8.9) — ภาพบนกระดาน (สัญญาดูหัวไฟล์ ./index.js · ของกลาง ./nautilusArt.js)
//  ผัง server/fodlan/map10.js · กติกา server/fodlan/stage10.js · ขั้นถัดไปเติม items/air ของลูกเล่นของชั้นที่นี่
// ============================================================
import { makeNautilusStage } from "./nautilusArt";

const M = makeNautilusStage({
  stage: 10, far: "ruins", deco: "slabs", shafts: 0, vignette: 0.55, motes: 14,
  water: ["#061424", "#02060c"], bed: ["#0e1820", "#03070a"], tile: ["rgba(120,230,255,.03)", "rgba(0,0,0,.14)"],
  grid: "rgba(90,220,240,.12)", border: "rgba(90,230,250,.5)", accent: "#5fe8ff", glowRGB: "80,230,255", snowRGB: "190,220,235", fogRGB: "4,14,22",
  dots: ["#1a2730", "#121c23", "#22323c"], farCol: "#08121a",
  rock: ["#33434c", "#25323a", "#18232a"], coral: ["#3a5a60"],
  kinds: ["fd_nt_citywall", "fd_nt_column", "fd_nt_statue", "fd_nt_rune"], tall: ["fd_nt_citywall", "fd_nt_column", "fd_nt_statue"], groundGlow: ["fd_nt_statue"],
});

export const { kinds, tall, fx, fogRGB, theme, drawObstacle, bakeSpecial, animSpecial, ground, air } = M;
