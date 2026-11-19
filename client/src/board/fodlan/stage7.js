// ============================================================
//  Nautilus ชั้น 1 "แนวปะการัง" −30 ม. (area 46 · GRID_PLAN §8.9) — ภาพบนกระดาน (สัญญาดูหัวไฟล์ ./index.js · ของกลาง ./nautilusArt.js)
//  ผัง server/fodlan/map7.js · กติกา server/fodlan/stage7.js · ขั้นถัดไปเติม items/air ของลูกเล่นของชั้นที่นี่
// ============================================================
import { makeNautilusStage } from "./nautilusArt";

const M = makeNautilusStage({
  stage: 7, far: "mounds", deco: "sand", shafts: 0.9, vignette: 0.25, motes: 0,
  water: ["#0e5a6e", "#06222c"], bed: ["#123a40", "#04141a"], tile: ["rgba(190,230,210,.05)", "rgba(0,0,0,.08)"],
  grid: "rgba(150,230,230,.13)", border: "rgba(150,240,240,.5)", accent: "#8fe8ff", glowRGB: "140,240,255", snowRGB: "220,245,240", fogRGB: "20,70,80",
  dots: ["#2c4c48", "#1d3633", "#3d5a52"], farCol: "#0a2f37",
  rock: ["#5a5f58", "#3f4642", "#2b302d"], coral: ["#d4606e", "#e08a4a", "#b85aa8", "#d9b04a"],
  kinds: ["fd_nt_reefrock", "fd_nt_coral"], tall: [],
});

export const { kinds, tall, fx, fogRGB, theme, drawObstacle, bakeSpecial, animSpecial, ground, air } = M;
