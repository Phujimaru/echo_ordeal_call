// ============================================================
//  Nautilus ชั้น 5 "ร่องลึกก้นสมุทร" −10,000 ม. (area 50 · GRID_PLAN §8.9) — ภาพบนกระดาน (สัญญาดูหัวไฟล์ ./index.js · ของกลาง ./nautilusArt.js)
//  ผัง server/fodlan/map11.js · กติกา server/fodlan/stage11.js · ขั้นถัดไปเติม items/air ของลูกเล่นของชั้นที่นี่
// ============================================================
import { makeNautilusStage } from "./nautilusArt";

const M = makeNautilusStage({
  stage: 11, far: "cliffs", deco: "abyss", shafts: 0, vignette: 0.7, motes: 26,
  water: ["#010205", "#000002"], bed: ["#05070c", "#000000"], tile: ["rgba(120,150,255,.025)", "rgba(0,0,0,.2)"],
  grid: "rgba(110,140,255,.08)", border: "rgba(110,150,255,.35)", accent: "#7f9cff", glowRGB: "90,170,255", snowRGB: "150,170,210", fogRGB: "0,1,4",
  dots: ["#0a0d16", "#06080e"], farCol: "#020309",
  rock: ["#151a26", "#0d111a", "#070a10"], coral: ["#1a2440"],
  kinds: ["fd_nt_trenchrock", "fd_nt_pit", "fd_nt_plankton"], tall: [],
});

export const { kinds, tall, fx, fogRGB, theme, drawObstacle, bakeSpecial, animSpecial, ground, air } = M;
