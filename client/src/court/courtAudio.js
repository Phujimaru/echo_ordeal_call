// เสียงในฉากศาล: เล่นคีย์ naru_* จาก audio.js ของเกม (board agent ลงทะเบียน) · คีย์ไหนยังไม่มี = เสียงสังเคราะห์ courtSfx.js แทน
import { playSfx } from "../audio";
import { CSFX, courtMuted } from "./courtSfx";

const SYN = {
  point: CSFX.shout, holdit: CSFX.shout, objection: CSFX.shout, takethat: CSFX.shout, trial_open: CSFX.gavel,
  gavel: CSFX.gavel, blip_low: () => CSFX.blip("J"), blip_mid: () => CSFX.blip("L"), blip_high: () => CSFX.blip("D"),
  damage: CSFX.hit, penalty: CSFX.pen, evidence_ding: CSFX.ok, whoosh: CSFX.whoosh,
  desk_slam: CSFX.gavel, crowd_cheer: CSFX.cheer, crowd_boo: CSFX.boo, splat: CSFX.splat, stamp: CSFX.stamp, scout: CSFX.ok,
};
let lastBlip = 0;
// ระหว่างคลิปวีดีโอ (beat step "clip") ห้ามเสียงเอฟเฟกต์ทุกชนิด (กฎผู้ใช้: ไม่มีเสียงตัดหน้า/ซ้อนวีดีโอ)
let clipLock = 0;
export const setClipLock = (on) => { clipLock = Math.max(0, clipLock + (on ? 1 : -1)); };
export function csfx(key) {
  if (courtMuted || clipLock) return;
  if (key.startsWith("blip_")) { const n = performance.now(); if (n - lastBlip < 55) return; lastBlip = n; }
  let a = null;
  try { a = playSfx("naru_" + key); } catch { a = null; }
  if (!a && SYN[key]) SYN[key]();
}
