// ============================================================
//  Nautilus ชั้น 2 "ซากเรือรบ" −200 ม. (area 47 · GRID_PLAN §8.9) — ภาพบนกระดาน (สัญญาดูหัวไฟล์ ./index.js · ของกลาง ./nautilusArt.js)
//  ผัง server/fodlan/map8.js · กติกา server/fodlan/stage8.js · ขั้นถัดไปเติม items/air ของลูกเล่นของชั้นที่นี่
// ============================================================
import { makeNautilusStage } from "./nautilusArt";

const M = makeNautilusStage({
  stage: 8, far: "wreck", deco: "wreck", shafts: 0.35, vignette: 0.4, motes: 0,
  water: ["#0b3550", "#03121c"], bed: ["#0f2730", "#030b10"], tile: ["rgba(170,210,230,.04)", "rgba(0,0,0,.1)"],
  grid: "rgba(130,200,230,.12)", border: "rgba(140,210,240,.45)", accent: "#9fe0ff", glowRGB: "255,190,120", snowRGB: "210,230,240", fogRGB: "12,40,55",
  dots: ["#24343a", "#1a272c", "#3a3026"], farCol: "#061822",
  rock: ["#4b4f4f", "#353a3a", "#242828"], coral: ["#8a4a52", "#7a5a3a"],
  kinds: ["fd_nt_hull", "fd_nt_timber", "fd_nt_cannon", "fd_nt_deck"], tall: ["fd_nt_hull"],
});

export const { kinds, tall, fx, fogRGB, theme, drawObstacle, bakeSpecial, animSpecial, ground, air } = M;
