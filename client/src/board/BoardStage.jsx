// ============================================================
//  BoardStage — กระดานเดินได้ในเกมจริง (จอคอม/แท็บเล็ต · GRID_PLAN §11)
//  แปลง state จาก server → props ของ BoardCanvas + ส่ง socket ตอนผู้เล่นกด
//   · ตาของเรา: ฟ้า = เดินถึง · แดง = เดินแล้วตีถึง · ชี้ศัตรู = แผนเดินเข้าไปตี + หน้าต่างคาดการณ์ + ลูกศรถอย
//   · โหมดเลือกเป้า (pick) จาก Game.jsx: สกิล target / aoe / line · ปืน GUTS · Mark 42
//   · นอกตาเรา: ชี้ตัวละคร = เห็นระยะเดิน/ตีของคนนั้น · กดตัวละคร = ดูสถานะ
//   · แถบลำดับเดินด้านบน (หกเหลี่ยมใหญ่บนเส้นโคจร) · ฉากลำดับเดินเต็มจอตอน ORDER · ฉากตาเดิน (แบบ A) ทุกครั้งที่ขึ้นตาใหม่
//   · กดศัตรู / ปุ่มโจมตี = หน้าคาดการณ์เต็มจอ (แทน HUD) → ยืนยัน = เดินเข้าไปตี · ฉากตี: กล้องซูมเข้าคู่ · หมากพุ่งชน · ปะทะ + เสียง
//   · ตาของเรา: W A S D (ตำแหน่งปุ่ม — แป้นไทยก็ใช้ได้) เลื่อนช่องเป้าหมายตามมุมกล้อง · Enter/Space = เดิน/เปิดหน้าคาดการณ์ · Esc = ยกเลิก
//   · ปุ่มระยะอันตราย · ป้ายข้อมูลช่อง · ป้ายร้านค้า (วาดในแคนวาส)
//   · กล้อง: หมุน ⟲ ⟳ (Q/E) · ซูม ＋/－ (ล้อเมาส์) มุมปกติ/มุมใกล้ — จำไว้ในเครื่อง · มุมใกล้: ลาก/ลูกศรเลื่อนดู
//     เริ่มตาใคร/ตี/เดิน/เลือดเปลี่ยน → ส่ง focus ให้ BoardCanvas เลื่อนตามถ้าอยู่นอกจอ
//   · ฉากตีบนกระดาน (พุ่งชน → ปะทะ → สวน → ถอย/ชน) แทน AttackFx เต็มจอ — เสียงตีเล่นที่จังหวะปะทะ (App ไม่เล่นซ้ำในโหมดกระดาน)
//  กติกาเดิน/ระยะใช้ boardRules.js (สร้างจาก server/board.js — ผลตรงกับ server)
// ============================================================
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import BoardCanvas from "./BoardCanvas";
import { clampZoom, ZOOM_STEPS } from "./boardDraw";
import { customProjection } from "./boardGeo";
import * as Rules from "./boardRules";
import { socket } from "../socket";
import { clickSound, playSfx } from "../audio";
import { GUTS_AMMO_INFO } from "../data/shop";
import { ForecastScreen, OrderCall, TurnCall, ZeroCall } from "./BoardScenes";
import { isZeroArea } from "./zeroTheme";
import { faceStyle } from "./charFace";
import { BEAM_T, DARK_T, dashDur, QUAKE_T, SORA_T, STYLE_HIT } from "./boardDraw";
import { HK_BEAM, HK_PUSH_MS, HK_SFX_LEAD, HK_TONE, isHikaruFx } from "./hikaruFx";
import { ICE_T, iceSpikeLv, iceTrailDur, preloadIceArt } from "./iceFx";
import { dryTileFx, shadowEventFx, wetTileFx } from "./shadowFx";
import { YUNA_EVENT_FX } from "./yunaFx";
import { GRAY_BEAM, GRAY_EVENT_FX, grayChains } from "./grayFx";
import { FERN_EVENT_FX, FERN_SFX_LEAD } from "./fernFx";
import { gyroEventFx, preloadGyroArt } from "./gyroFx";
import { diegoEventFx, preloadDiegoArt } from "./diegoFx";
import { valentineEventFx } from "./valentineFx";
import { celineEventFx } from "./celineFx";
import { takutoEventFx } from "./takutoFx";
import { ryougiEventFx } from "./ryougiFx";
import { EMIYA_REPEAT_MS, emiyaEventFx } from "./emiyaFx";
import { rosterAlive, sameSide, sideAlive, sideOf } from "../duo";
import { announceArenaLand, noteArenaShown, onArenaLandRequest, onArenaLeaveRequest, shouldLandOnMount } from "../journey/arena/arenaLandBus";
import KateStorm from "../oc/intro/KateStorm";
import "./boardStage.css";

const key = (x, y) => `${x},${y}`;
const samePos = (a, b) => !!a && !!b && a.x === b.x && a.y === b.y;
// ตัวใหญ่ (Echo ขยายร่าง): ผู้เล่น → กล่อง { x, y, size } · ช่องนี้อยู่ในตัวของ p ไหม
const sizeOfP = (p) => Math.max(1, (p && p.size) | 0);
const boxOfP = (p) => (p && p.pos ? { x: p.pos.x, y: p.pos.y, size: sizeOfP(p) } : null);
const onBody = (p, t) => !!p && !!p.pos && !!t && Rules.covers(boxOfP(p), t.x, t.y);
// ชั้นมิติ / ยูนิตที่ถูกเรียก (วาเลนไทน์ · GRID_PLAN §7.13): dim null = กระดานหลัก · "veil:" = หลบสายตา · "par:" = กระดานคู่ขนาน
const dimOf = (p) => (p && p.dim) || null;
const isDoubleP = (p) => !!(p && p.summon && p.summon.kind === "double");
const veiledP = (p) => !!(p && p.valentine && p.valentine.veil);
// บินได้ (โล่บินได้ของบานาจ — server action.flies): เดินทะลุแบบ ghost · ไม่ขวางทางใคร
const fliesP = (p) => !!(p && p.flies);
// สายจูง { x, y, r } (server action.leashOf): ช่องที่หยุดได้ต้องห่างจุดนั้นไม่เกิน r — ตัดระยะเดินที่เกิน (เก็บช่องเริ่มไว้เสมอ)
function leashReach(reach, leash, start) {
  if (!reach || !leash) return reach;
  const out = new Map();
  for (const [k, n] of reach) if ((start && n.x === start.x && n.y === start.y) || Math.abs(n.x - leash.x) + Math.abs(n.y - leash.y) <= leash.r) out.set(k, n);
  return out;
}
const teamOfP = (p) => (isDoubleP(p) ? null : (p && p.teamId) || null); // ตัวเหมือน = ไม่มีทีม (เดินผ่านไม่ได้ · ตีได้ทุกคน)
const GHOST_ALPHA = 0.38; // คนคนละชั้นมิติ
// เดินทะลุ (หลบสายตา): boardRules รองรับ opts.ghost แล้วหรือยัง (ทดลองเดินทะลุหินบนกระดาน 3×1)
//  ยังไม่รองรับ = ใช้แผนที่โล่ง (ไม่มีสิ่งกีดขวาง/ช่องพิเศษ/ร้าน/ร่าง) แทน — เหลือแค่ขอบกระดานเหมือนกัน
const GHOST_RULES = (() => {
  try {
    const m = Rules.normalizeMap({ cols: 3, rows: 1, terrain: { "1,0": "rock" } });
    return Rules.reachable(m, { id: "t", x: 0, y: 0, alive: true }, 2, [], { ghost: true }).has("2,0");
  } catch { return false; }
})();
const clearMap = (m) => (m ? { ...m, terrain: {}, special: {}, flow: {} } : m);
// ระยะเดิน/ก้าวทีละช่อง ที่เข้าใจ ghost (ตัวเลือก optsOf)
const reachOf = (m, u, mov, units, o) => (o && o.ghost && !GHOST_RULES
  ? Rules.reachable(clearMap(m), u, mov, units, { ...o, blocked: null, hop: null })
  : Rules.reachable(m, u, mov, units, o));
const stepOf = (m, u, mov, units, trail, to, o) => (o && o.ghost && !GHOST_RULES
  ? Rules.stepPath(clearMap(m), u, mov, units, trail, to, { ...o, blocked: null, hop: null })
  : Rules.stepPath(m, u, mov, units, trail, to, o));
const threatOf = (m, u, mov, range, units, o) => (o && o.ghost && !GHOST_RULES
  ? Rules.threatZone(clearMap(m), u, mov, range, units, { ...o, blocked: null, hop: null })
  : Rules.threatZone(m, u, mov, range, units, o));
// รูป 4 ทิศของตัวใหญ่บนกระดาน (หน้า/ข้าง/หลัง · มุมบน) — ตัวละครที่ไม่มีในนี้ใช้หมากหกเหลี่ยมเสมอ
const BIG_ART = {
  echo: {
    front: "/characters/echo/echo_front.webp", side: "/characters/echo/echo_side.webp",
    back: "/characters/echo/echo_back.webp", top: "/characters/echo/echo_top.webp",
  },
};
// ทิศจากช่องเราไปช่องที่ชี้ (แกนที่ห่างกว่า) — ใช้กับสกิลแนว · size = ตัวใหญ่ (นับจากกลางตัว)
function dirToward(from, to, size = 1) {
  if (!from || !to) return null;
  const c = (Math.max(1, size | 0) - 1) / 2;
  const dx = to.x - (from.x + c), dy = to.y - (from.y + c);
  if (!dx && !dy) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}
// ทิศบนจอ → ทิศบนกระดาน ตามมุมที่หมุน (rotation = จำนวน 90° ตามเข็ม · เหมือน boardGeo.toView)
//  ขวาบนจอ = (cos, −sin) · ลงล่างจอ (เข้าหากล้อง) = (sin, cos)
//  สนาม Colony (มีตัวฉายภาพทรงกระบอก): เลือกก้าว 1 ใน 4 ทิศของกระดานที่ไปทางเดียวกับปุ่มบนจอมากที่สุด ณ ตำแหน่งตัวละคร (at)
const SCREEN_KEY = { KeyD: [1, 0], KeyA: [-1, 0], KeyS: [0, 1], KeyW: [0, -1] };
function screenDir(rotation, code, at) {
  const cp = customProjection();
  if (cp && at && SCREEN_KEY[code]) {
    const [kx, ky] = SCREEN_KEY[code], cx = at.x + 0.5, cy = at.y + 0.5, p0 = cp.project(cx, cy, 0);
    if (!Number.isFinite(p0[0])) return null;
    let best = null;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const q = cp.project(cx + dx * 0.5, cy + dy * 0.5, 0);
      if (!Number.isFinite(q[0])) continue;
      const vx = q[0] - p0[0], vy = q[1] - p0[1], l = Math.hypot(vx, vy) || 1, dot = (vx * kx + vy * ky) / l;
      if (!best || dot > best.dot) best = { x: dx, y: dy, dot };
    }
    return best ? { x: best.x, y: best.y } : null;
  }
  const a = (rotation % 4) * Math.PI / 2, c = Math.round(Math.cos(a)), sn = Math.round(Math.sin(a));
  if (code === "KeyD") return { x: c, y: -sn };
  if (code === "KeyA") return { x: -c, y: sn };
  if (code === "KeyS") return { x: sn, y: c };
  if (code === "KeyW") return { x: -sn, y: -c };
  return null;
}
const HEX_PTS = "50,0 100,28.5 100,85.5 50,114 0,85.5 0,28.5";
// ห่วงเวลาซีโร่: เป้า "seal:N" → N (อื่น = -1)
const sealIdx = (id) => (typeof id === "string" && id.startsWith("seal:") && Number.isInteger(Number(id.slice(5))) ? Number(id.slice(5)) : -1);
const sealOf = (z, i) => (z && Array.isArray(z.seals) ? z.seals.find((s) => s.i === i) || null : null);
// หนามน้ำแข็ง (Ice Spike): เป้า "spike:x,y" → { x, y } (อื่น = null) · Lv ของช่องจาก terrain ของกระดาน
const spikeOfId = (id) => {
  const m = typeof id === "string" ? /^spike:(-?\d+),(-?\d+)$/.exec(id) : null;
  return m ? { x: Number(m[1]), y: Number(m[2]) } : null;
};
const boardSpikeLv = (b, k) => iceSpikeLv(b && b.terrain ? b.terrain[k] : null);
const ICE_DIRS = [["up", 0, -1], ["down", 0, 1], ["left", -1, 0], ["right", 1, 0]];
// กรอบสี่เหลี่ยม n×n รอบช่องกลาง (x, y) — ตัดขอบกระดาน
function squareKeys(map, x, y, n) {
  const out = [], h = Math.floor(n / 2);
  for (let dy = -h; dy < n - h; dy++) for (let dx = -h; dx < n - h; dx++) {
    const tx = x + dx, ty = y + dy;
    if (tx >= 0 && ty >= 0 && tx < map.cols && ty < map.rows) out.push(key(tx, ty));
  }
  return out;
}
const ENERGY_C = "#7fd3ff"; // เลขแต้มสกิล (พลังงาน)

// คิว 2 คนถัดไป (ขวา ใต้ปุ่มกล้อง — ผู้ใช้สั่ง 2026-10-22): รูปหกเหลี่ยม + ชื่อ · คนที่ถึงตา/หลุดคิว เลื่อนขึ้นแล้วจางหาย ที่เหลือเลื่อนขึ้นตาม
//  แถวเรียงตาม id คงที่ (DOM ไม่สลับที่ — transition ไม่สะดุด) · ตำแหน่งจริงมาจาก --slot
const QUEUE_OUT_MS = 600;
function UpNext({ ids, byId, me, show }) {
  const sig = ids.join(",");
  const [prev, setPrev] = useState({ sig: "", ids: [] });
  const [gone, setGone] = useState([]); // { id, p } — คนที่เพิ่งหลุดคิว (เล่นแอนิเมชันออก)
  if (sig !== prev.sig) {
    const out = prev.ids.filter((id) => !ids.includes(id) && byId[id]).map((id) => ({ id, p: byId[id] }));
    setPrev({ sig, ids });
    setGone((g) => [...g.filter((x) => !ids.includes(x.id) && !out.some((o) => o.id === x.id)), ...out]);
  }
  useEffect(() => {
    if (!gone.length) return undefined;
    const t = setTimeout(() => setGone([]), QUEUE_OUT_MS);
    return () => clearTimeout(t);
  }, [gone]);
  const rows = [
    ...gone.filter((g) => !ids.includes(g.id)).map((g) => ({ id: g.id, p: g.p, slot: -1 })),
    ...ids.map((id, i) => ({ id, p: byId[id], slot: i })),
  ].filter((r) => r.p).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  if (!rows.length) return null;
  return (
    <div className="bs-queue" data-show={show ? "true" : "false"} aria-hidden="true">
      {rows.map(({ id, p, slot }) => (
        <div key={id} className="bs-q" data-out={slot < 0 ? "true" : "false"} style={{ "--slot": slot, "--bs-c": p.color || "#7fb8e6" }}>
          <div className="bs-q-plate"><b>{me && sameSide(p, me) ? "คุณ" : p.name}</b></div>
          <div className="bs-q-hexw">
            <div className="bs-actor-frame" />
            <div className="bs-actor-face"><img src={p.img} alt="" style={faceStyle(p)} onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} /></div>
          </div>
        </div>
      ))}
    </div>
  );
}

//  props เพิ่ม (ดีไซน์ UI ใหม่): atkSignal = ตัวเลขเปลี่ยน = ปุ่ม "โจมตี" ถูกกด · onAttackables(ids) = ศัตรูที่ตาเราตีถึง (เดินแล้วตีได้)
//   onOverlay(bool) = หน้าคาดการณ์เปิด/ปิด (Game ซ่อน HUD ทั้งหมด) · onCall(bool) = ฉากเต็มจอกำลังเล่น
// ป้ายโบนัสในฉากตี — ผลที่มีต่อการตีครั้งนี้จาก server (การ์ดฉากตี skills: side "atk" = ฝั่งผู้ตี · "def" = ฝั่งเป้า)
//  เช่น คริติคอล · แท่นพลัง · ม่านแห่งราตรี · มีด +1 · คุ้มครอง · เปราะบาง · ขึ้นตอนปะทะแล้วค้างจนจบฉาก
function AttackTags({ a, byId }) {
  const all = a.skills || [];
  const atk = all.filter((s) => (s.side ? s.side === "atk" : s.by === a.byName));
  const def = all.filter((s) => (s.side ? s.side === "def" : s.by !== a.byName));
  if (!atk.length && !def.length) return null;
  const col = (list, side, name, color) => list.length > 0 && (
    <div className="bs-tags-col" data-side={side} style={{ "--bs-c": color || "#7fb8e6" }}>
      <b className="bs-tags-name">{name}</b>
      {list.map((s, i) => <span key={i} className="bs-tag" style={{ "--i": i }}>{s.name}</span>)}
    </div>
  );
  const by = byId[a.byId], tg = byId[a.targetId];
  return (
    <div className="bs-tags" aria-live="polite">
      {col(atk, "atk", a.byName, a.byColor || (by && by.color))}
      {col(def, "def", a.targetName, a.targetColor || (tg && tg.color))}
    </div>
  );
}

export default function BoardStage({ state, me, lowQ, vp, pick, onInspect, registerOther, hidden, atkSignal = 0, onAttackables, onOverlay }) {
  const phase = state.gameState;
  const map = useMemo(() => Rules.normalizeMap(state.board), [state.board]);
  const teamMode = state.gameMode === "duo" || state.gameMode === "trio";
  const shopPos = state.shopPos || null;
  // ร่างของตัวที่ล้ม (ระบบคู่ — p.corpse): ขวางช่อง เดินข้ามได้ หยุดทับไม่ได้ → อยู่ทั้งใน blocked และ hop (ตรงกับ server)
  const corpseSig = state.players.filter((p) => p.corpse && Number.isFinite(p.corpse.x) && Number.isFinite(p.corpse.y)).map((p) => `${p.id}@${key(p.corpse.x, p.corpse.y)}`).join("|");
  const corpses = useMemo(() => (corpseSig ? corpseSig.split("|").map((s) => { const [id, k] = s.split("@"); const [x, y] = k.split(",").map(Number); return { id, x, y }; }) : []), [corpseSig]);
  const hop = useMemo(() => (corpses.length ? new Set(corpses.map((c) => key(c.x, c.y))) : null), [corpses]);
  const blocked = useMemo(() => {
    if (!shopPos && !hop) return null;
    const b = new Set(hop || []);
    if (shopPos) b.add(key(shopPos.x, shopPos.y));
    return b;
  }, [shopPos, hop]);
  const night = state.cycle === "night";

  // ผู้เล่นบนกระดาน (รูปที่ boardRules ใช้)
  const byId = useMemo(() => Object.fromEntries(state.players.map((p) => [p.id, p])), [state.players]);
  // ชั้นมิติ (วาเลนไทน์ · GRID_PLAN §7.13): ชั้นของเรา = dim ของตัวที่คุม · คนคนละชั้น = ภาพโปร่ง กดไม่ได้
  //  ไม่นับในระยะเดิน/ชนตอนวางแผนเดิน/ระยะอันตราย/เป้าตี/เป้าสกิล/คาดการณ์
  const myDim = dimOf(me);
  const sameDim = useCallback((p) => !!p && dimOf(p) === myDim, [myDim]);
  const ruleUnits = useMemo(
    () => state.players.filter((p) => p.alive && p.pos && dimOf(p) === myDim && !fliesP(p)).map((p) => ({ id: p.id, x: p.pos.x, y: p.pos.y, alive: true, teamId: teamOfP(p), size: sizeOfP(p) })),
    [state.players, myDim],
  );
  const isAlly = useCallback((a, b) => teamMode && !!a.teamId && a.teamId === b.teamId, [teamMode]);
  const unitOf = (p) => (p && p.pos ? { id: p.id, x: p.pos.x, y: p.pos.y, alive: true, teamId: teamOfP(p), size: sizeOfP(p) } : null);
  // ตัวเลือกของกติกาเดินต่อคน: smash = ตัวใหญ่ที่เดินพังสิ่งกีดขวางได้ (server ส่งมา)
  //  lane = ตีปกติแบบแนวตรง (ไรโด ฮิคารุ: แบล็คคิง / กิงกะ) — ระยะอันตรายเป็นแนวตรงจากขอบตัว
  //  ghost = อยู่ในมิติหลบสายตา (p.valentine.veil) — เดินทะลุทุกอย่าง เหลือแค่ขอบกระดาน (Board.reachable ghost)
  //  flowerWalk = ราชาดอกไม้ของเซลิน (p.flowerWalk) — ช่องดอกไม้ (TERRAIN_INFO flower) ไม่เสียก้าว
  const optsOf = (p) => ({ isAlly, blocked, hop, smash: !!(p && p.smash), lane: !!(p && p.lane), ghost: veiledP(p) || fliesP(p), flowerWalk: !!(p && p.flowerWalk) });
  // ช่องที่ p ตีปกติถึงจากช่อง (x, y) — แนวตรง (lane) หรือระยะแมนฮัตตัน
  const strikeTiles = (p, x, y, range) => (p && p.lane ? Rules.laneTiles(map, x, y, sizeOfP(p), range) : Rules.tilesInRange(map, x, y, range, sizeOfP(p)));
  // ตัวที่เหมือนกัน (summon double) = ฝ่ายกลาง: ทุกคนในชั้นเดียวกันตีได้ (ไม่ใช่เพื่อนใคร)
  //  กล่องของลาพลัส (summon laplace) = ฝ่ายกลางเหมือนกัน ยกเว้นเจ้าของกล่อง
  const isEnemy = (p) => !!p && !!me && p.id !== me.id && sameDim(p)
    && !(p.summon && p.summon.kind === "laplace" && p.summon.ownerId === me.id)
    && (isDoubleP(p) || (!sameSide(p, me) && !(teamMode && me.teamId && p.teamId === me.teamId)));
  // ถูกล่อเป้า (โล่ผู้พิทักษ์ — server action.tauntOf): เล็งศัตรูได้เฉพาะตัวล่อ (ตีปกติ + สกิลเลือกเป้า)
  const tauntOk = (p) => !me || !Array.isArray(me.taunt) || !me.taunt.length || !isEnemy(p) || me.taunt.includes(p.id);

  const action = state.action;
  const myTurn = !!me && me.alive && !!me.pos && phase === "ACTION" && state.actorId === me.id && !!action;
  // เดินได้จนกว่าจะล็อก (ใช้สกิล/ไอเทม/ซื้อ/ตี) — เดินแล้วคลิก/กดใหม่ = เดินใหม่จากจุดเริ่มตา (server/phases/action.js moveTo)
  const canMove = myTurn && !action.locked;
  // ตีปกติไม่ได้: เอมิลิโกะเดินต่อหลังจบตา (เดินได้อย่างเดียว) · กินขนมปังแล้ว (action.noStrike)
  //  อยู่ในมิติหลบสายตา (วาเลนไทน์) — ทำอะไรใครไม่ได้
  const strikeOff = myTurn && (!!action.canto || !!action.noStrike || veiledP(me));
  const masked = !!state.masked; // ผู้ชมติด "มืดบอด": หมากคนอื่นขาวล้วน · ไม่มีลำดับเดิน

  // ---------- โฮเวอร์ / ระยะอันตราย ----------
  const [hover, setHover] = useState(null);
  const [danger, setDanger] = useState(false);
  // หมุนกระดาน 4 มุม (ทีละ 90° ตามเข็มนาฬิกา) — จำไว้ในเครื่องผู้เล่น · Q / E = หมุนซ้าย / ขวา
  const [rotation, setRotation] = useState(() => {
    try { return Number(localStorage.getItem("echo.boardRotation")) % 4 || 0; } catch { return 0; }
  });
  const rotate = useCallback((d) => setRotation((r) => {
    const n = (r + d + 4) % 4;
    try { localStorage.setItem("echo.boardRotation", String(n)); } catch { /* ไม่มีที่เก็บ */ }
    return n;
  }), []);
  // ซูม 2 ระดับ: 1 = มุมใกล้ (ค่าเริ่ม — ผู้ใช้ตัดสิน 2026-10-09) · 0 = เห็นทั้งกระดาน — จำไว้ในเครื่อง · ล้อเมาส์ / ปุ่ม ＋ －
  //  มุมมอง (แยกจากซูม — ผู้ใช้สั่ง): "tilt" = เอียง 32° · "top" = มองจากด้านบน — ปุ่มสลับ · ซูม/เลื่อน/หมุนได้ทั้งสองมุม
  const [view, setViewState] = useState(() => {
    try { return localStorage.getItem("echo.boardView") === "top" || localStorage.getItem("echo.boardZoom") === "2" ? "top" : "tilt"; } catch { return "tilt"; }
  });
  const toggleView = useCallback(() => setViewState((v) => {
    const n = v === "top" ? "tilt" : "top";
    try { localStorage.setItem("echo.boardView", n); } catch { /* ไม่มีที่เก็บ */ }
    return n;
  }), []);
  // ระดับซูม 0..ZOOM_STEPS−1 (ผู้ใช้สั่ง 2026-10-11 — ปรับทีละขั้น ไม่ใช่แค่ย่อสุด/ซูมสุด) · จำไว้ใน echo.boardZoomLv
  //  ค่าเริ่ม = 2 (เท่ามุมใกล้เดิม) · เครื่องที่เคยตั้งแบบเก่า echo.boardZoom = "0" → 0
  const [zoom, setZoomState] = useState(() => {
    try {
      const lv = localStorage.getItem("echo.boardZoomLv");
      if (lv != null && lv !== "") return clampZoom(lv);
      return localStorage.getItem("echo.boardZoom") === "0" ? 0 : 2;
    } catch { return 2; }
  });
  const setZoom = useCallback((z) => {
    const n = clampZoom(z);
    setZoomState(n);
    try { localStorage.setItem("echo.boardZoomLv", String(n)); } catch { /* ไม่มีที่เก็บ */ }
  }, []);
  // จุดที่กล้องมุมใกล้ควรเห็น (อ็อบเจกต์ใหม่ = เลื่อนไปถ้าอยู่นอกจอ)
  const [focus, setFocus] = useState(() => (me && me.pos ? { x: me.pos.x, y: me.pos.y } : null));
  const look = useCallback((pos) => { if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) setFocus({ x: pos.x, y: pos.y }); }, []);
  useEffect(() => {
    const onKey = (e) => {
      if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
      // ใช้ตำแหน่งปุ่ม (e.code) ไม่ใช่ตัวอักษร — แป้นโหมดไทย Q/E พิมพ์เป็น ๆ/ำ
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code === "KeyQ") rotate(-1);
      else if (e.code === "KeyE") rotate(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rotate]);
  const hoverUnit = hover ? state.players.find((p) => p.alive && onBody(p, hover) && sameDim(p)) : null; // คนคนละชั้น = ชี้ไม่ติด
  // ห่วงเวลาซีโร่: ผนึกที่ยังไม่แตก = เป้าตีได้ (หน่วยเทียม — ชี้ = แผนเดินเข้าไปตี · คลิก = ตีเลย ไม่มีหน้าคาดการณ์)
  const zero = state.zero || null;
  const sealFoes = useMemo(() => (zero && zero.active && Array.isArray(zero.seals)
    ? zero.seals.filter((s) => !s.broken).map((s) => ({ id: `seal:${s.i}`, pos: { x: s.x, y: s.y }, alive: true, size: 1, isSeal: true, name: "ผนึก" }))
    : []), [zero]);
  const hoverSeal = hover && !hoverUnit ? sealFoes.find((s) => samePos(s.pos, hover)) || null : null;
  // หนามน้ำแข็ง (Ice Spike): ทุกคนตีได้ — หน่วยเทียมแบบเดียวกับผนึก (ชี้ = แผนเดินเข้าไปตี · คลิก = ตีเลย)
  const board = state.board || null;
  const spikeList = useMemo(() => (board && Array.isArray(board.spikes)
    ? board.spikes.filter((s) => s && Number.isFinite(s.x) && Number.isFinite(s.y)) : []), [board]);
  //  กำแพงน้ำแข็งของเซลิน (wall: true) อยู่ในรายการเดียวกัน — ตีได้เหมือนหนาม แต่ชื่อ "กำแพงน้ำแข็ง"
  const spikeFoes = useMemo(() => spikeList.map((s) => ({ id: `spike:${s.x},${s.y}`, pos: { x: s.x, y: s.y }, alive: true, size: 1, isSpike: true, isWall: !!s.wall, name: s.wall ? "กำแพงน้ำแข็ง" : `หนามน้ำแข็ง Lv.${s.lv}` })), [spikeList]);
  // เซลิน: พุ่มดอกไม้บนกระดาน (board.celine.flora · ช่อง special "bloom" ที่ไม่มีในรายการ = พุ่มรอยเท้า 3 เทิร์น)
  const celFlora = useMemo(() => {
    const list = board && board.celine && Array.isArray(board.celine.flora)
      ? board.celine.flora.filter((f) => f && Number.isFinite(f.x) && Number.isFinite(f.y)).map((f) => ({ x: f.x, y: f.y, left: f.left ?? 3, made: !!f.made })) : [];
    const seen = new Set(list.map((f) => key(f.x, f.y)));
    for (const [k, kind] of Object.entries((board && board.special) || {})) {
      if (kind !== "bloom" || seen.has(k)) continue;
      const [x, y] = k.split(",").map(Number);
      if (Number.isFinite(x) && Number.isFinite(y)) list.push({ x, y, left: 3, made: false });
    }
    return list;
  }, [board]);
  const hoverSpike = hover && !hoverUnit && !hoverSeal ? spikeFoes.find((s) => samePos(s.pos, hover)) || null : null;
  // เกรย์ (สัปเหร่อ): ศพบนกระดาน = เป้าตีปกติ (เก็บศพ) — หน่วยเทียมแบบผนึก · ตีได้เฉพาะประชิด 1 ช่องเสมอ (planFor) · ไม่อยู่ในปุ่มโจมตี
  const reaper = !!(me && me.gray && me.gray.reaper);
  const corpseFoes = useMemo(() => (reaper ? corpses.map((c) => ({ id: `corpse:${c.id}`, pos: { x: c.x, y: c.y }, alive: true, size: 1, isCorpse: true, name: "ศพ" })) : []), [reaper, corpses]);
  const hoverCorpse = hover && !hoverUnit && !hoverSeal && !hoverSpike ? corpseFoes.find((s) => samePos(s.pos, hover)) || null : null;
  const hasIceSpike = state.players.some((p) => p.character && p.character.id === "ice_spike");
  useEffect(() => { if (hasIceSpike) preloadIceArt(); }, [hasIceSpike]);
  const hasGyro = state.players.some((p) => !!p.gyro);
  useEffect(() => { if (hasGyro) preloadGyroArt(); }, [hasGyro]);
  const hasDiego = state.players.some((p) => !!p.diego);
  useEffect(() => { if (hasDiego) preloadDiegoArt(); }, [hasDiego]);
  // เริ่มตาใคร (รวมตาเรา) → กล้องตามคนนั้น (ปรับ state ระหว่าง render ตามตาที่เปลี่ยน — ไม่ต้องรอ effect)
  const [lookedTurn, setLookedTurn] = useState("");
  const turnKey = phase === "ACTION" && state.actorId ? `${state.roundNumber}|${state.actorId}` : lookedTurn;
  if (turnKey !== lookedTurn) {
    setLookedTurn(turnKey);
    const a = byId[state.actorId];
    if (a && a.pos) setFocus({ x: a.pos.x, y: a.pos.y });
  }

  // ---------- ระยะเดินของเรา ----------
  //  คิดจากจุดเริ่มตา (action.from) บนแผนที่ตอนเริ่มตา — ถอดน้ำแข็งที่ Ice Spike เดินสร้าง/ของที่ตัวใหญ่เดินพังในตานี้ออก (action.walkUndo)
  const startMap = useMemo(() => (myTurn && map && action.walkUndo ? Rules.patchMap(map, action.walkUndo) : map), [myTurn, map, action]);
  const originUnit = useMemo(() => (myTurn && action.from ? { id: me.id, x: action.from.x, y: action.from.y, alive: true, teamId: me.teamId || null, size: sizeOfP(me) } : null), [myTurn, action, me]);
  const myReach = useMemo(() => {
    if (!myTurn || !map) return null;
    // เดินไม่ได้แล้ว (ล็อก/ชนคนที่มองไม่เห็น/ไถล) = ช่องที่ยืนเท่านั้น — ไม่เปิดเดินตามดอกไม้ฟรี (ราชาดอกไม้ของเซลิน: งบ 0 ก้าวยังเดินบนดอกไม้ได้
    //  → แผนตีเลือกช่องยืนที่ต้องเดิน → server ไม่ให้เดิน → ตีค้างรอเดินจบ)
    if (!canMove || !originUnit) return reachOf(map, unitOf(me), 0, ruleUnits, { ...optsOf(me), flowerWalk: false });
    return leashReach(reachOf(startMap, originUnit, me.mov || 0, ruleUnits, optsOf(me)), me.leash, me.pos);
  }, [myTurn, canMove, map, startMap, me, action, ruleUnits, isAlly, blocked]); // eslint-disable-line react-hooks/exhaustive-deps
  // ช่องที่ชี้ → ช่องมุมบนซ้ายที่จะเดินไป (ตัว 1 ช่อง = ช่องนั้นเอง) · ตัวใหญ่: ให้กลางตัวอยู่ที่ช่องที่ชี้ ไม่ได้ = มุมที่ตัวครอบช่องนั้นและเดินน้อยสุด
  //  ช่องที่ยืนอยู่ = ไม่ใช่เป้าเดิน · เดินแล้วชี้จุดเริ่มตา = ย้อนการเดิน (server ย้อนให้)
  const anchorFor = useCallback((t) => {
    if (!t || !myReach) return null;
    const s = sizeOfP(me);
    const ok = (n) => !!n && !samePos(n, me.pos) && (n.d > 0 || !!(action && action.moved));
    if (s <= 1) { const n = myReach.get(key(t.x, t.y)); return ok(n) ? n : null; }
    const c = Math.floor((s - 1) / 2), want = myReach.get(key(t.x - c, t.y - c));
    if (ok(want)) return want;
    let best = null;
    for (const n of myReach.values()) {
      if (!ok(n) || !Rules.covers({ x: n.x, y: n.y, size: s }, t.x, t.y)) continue;
      if (!best || n.d < best.d) best = n;
    }
    return best;
  }, [myReach, me, action]);

  // แผนตีศัตรู foe: ช่องยืนที่เดินน้อยสุดซึ่งตีถึง + ตีสวนได้ไหม + ถอยไปไหน (ตีไม่ถึง = null)
  const planFor = useCallback((foe) => {
    if (!myTurn || strikeOff || pick || !myReach || !foe || !isEnemy(foe) || !foe.pos || !foe.alive || !tauntOk(foe)) return null;
    const range = foe.isCorpse ? [1, 1] : me.range || [1, 1];
    const laneOn = !foe.isCorpse && me.lane;
    const hits = (n) => (laneOn ? !!Rules.laneOf(map, n.x, n.y, sizeOfP(me), range, boxOfP(foe), me.lane === "face") : Rules.inRange(range, Rules.dist({ x: n.x, y: n.y, size: sizeOfP(me) }, boxOfP(foe))));
    // ตีถึงจากช่องที่ยืนอยู่แล้ว = ตีจากตรงนี้ (เดินมาแล้วก็ไม่ต้องเดินใหม่)
    let best = hits(me.pos) ? { x: me.pos.x, y: me.pos.y, here: true } : null;
    if (!best) {
      for (const n of myReach.values()) {
        if (!hits(n)) continue;
        if (!best || n.d < best.d) best = n;
      }
    }
    if (!best) return null;
    const stand = { x: best.x, y: best.y };
    // ตีแนวตรง: ทุกคนในแนวเดียวกับเป้าโดนด้วย (ไฮไลต์ทั้งแนว)
    // ตีเป็นกรอบ (me.strikeRect [ลึก, กว้าง] — ชิโร่ Nine Lives Blade Works): ทุกคนในกรอบทางทิศของเป้าโดนด้วย
    const rect = !laneOn && !foe.isCorpse && Array.isArray(me.strikeRect) ? Rules.rectToward(map, stand.x, stand.y, sizeOfP(me), boxOfP(foe), me.strikeRect[0], me.strikeRect[1]) : null;
    const lane = laneOn ? Rules.laneOf(map, stand.x, stand.y, sizeOfP(me), range, boxOfP(foe), me.lane === "face", me.laneLen || 0) : rect; // laneLen: เรียวกิ เล็งประชิด ฟันยาว 2 ช่อง
    // ตีสวนเฉพาะคนที่มีความสามารถ (foe.counter — ตอนนี้ไม่มีใคร)
    const counter = !!foe.counter && Rules.canCounter(foe.range || [1, 1], stand, foe.pos);
    let push = null;
    if (counter) {
      const moved = ruleUnits.map((u) => (u.id === me.id ? { ...u, ...stand } : u));
      const pb = Rules.pushback(map, stand, foe.pos, moved, { selfId: me.id, blocked });
      push = { from: stand, to: { x: pb.x, y: pb.y }, collide: pb.collide };
      if (pb.collide) {
        // ลูกศรชน: ชี้ไปช่องที่ควรถอย (ขยับนิดแล้วเด้งกลับ)
        const dx = Math.sign(stand.x - foe.pos.x), dy = Math.sign(stand.y - foe.pos.y);
        push.to = Math.abs(stand.x - foe.pos.x) >= Math.abs(stand.y - foe.pos.y) && dx ? { x: stand.x + dx, y: stand.y } : { x: stand.x, y: stand.y + (dy || 1) };
      }
    }
    return { foe, stand, path: best.here ? null : Rules.pathTo(myReach, stand.x, stand.y), counter, push, lane: lane ? lane.tiles.map((t) => key(t.x, t.y)) : null };
  }, [myTurn, strikeOff, pick, myReach, me, ruleUnits, map, blocked]); // eslint-disable-line react-hooks/exhaustive-deps
  const plan = useMemo(() => (hoverUnit ? planFor(hoverUnit) : hoverSeal ? planFor(hoverSeal) : hoverSpike ? planFor(hoverSpike) : hoverCorpse ? planFor(hoverCorpse) : null), [planFor, hoverUnit, hoverSeal, hoverSpike, hoverCorpse]);
  // ศัตรูที่ตาเราตีถึง (ใกล้สุดก่อน) — ปุ่ม "โจมตี" ใช้ · ส่งให้ Game เฉพาะตอนรายการเปลี่ยน
  const attackables = useMemo(() => {
    if (!myTurn || pick) return [];
    return state.players.map((p) => planFor(p)).filter(Boolean).sort((a, b) => (a.path ? a.path.length : 0) - (b.path ? b.path.length : 0)).map((pl) => pl.foe.id);
  }, [myTurn, pick, state.players, planFor]);
  const atkSig = attackables.join(",");
  useEffect(() => { if (onAttackables) onAttackables(atkSig ? atkSig.split(",") : []); }, [atkSig]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- หน้าคาดการณ์เต็มจอ (กดศัตรู / ปุ่มโจมตี) ----------
  const [fcId, setFcId] = useState(null);
  const fcFoe = fcId ? byId[fcId] : null;
  const fcPlan = fcFoe ? planFor(fcFoe) : null;
  if (fcId && !fcPlan) setFcId(null); // หมดตา/เป้าหลุดระยะ = ปิดเอง
  useEffect(() => { if (onOverlay) onOverlay(!!fcId); }, [fcId]); // eslint-disable-line react-hooks/exhaustive-deps
  const [seenAtkSignal, setSeenAtkSignal] = useState(atkSignal);
  if (atkSignal !== seenAtkSignal) {
    setSeenAtkSignal(atkSignal);
    if (attackables.length) setFcId(attackables[0]);
  }

  // ---------- โหมดเลือกเป้า (สกิล/ปืน/Mark 42) ----------
  // กำแพงน้ำแข็งของเซลิน (tile place "wall" · contract §4): 3 ช่องตามแนว orient รอบช่องกลาง (h = แนวนอน x · v = แนวตั้ง y)
  //  ช่องที่วางได้ = ไม่ใช่สิ่งกีดขวาง/ร้าน · ต้องวางได้อย่างน้อย 1 ช่อง · มีตัวใหญ่ (2×2 ขึ้นไป) ในแนว = วางไม่ได้
  //  คนที่เรามองเห็นในแนว (units) = ต้องเลือกทิศผลักตั้งฉากกับกำแพง · orient หมุนได้ด้วยคลิกขวา / R / ล้อเมาส์
  const [wallOrient, setWallOrient] = useState("h");
  const wallPlan = useCallback((c, orient) => {
    const v = orient === "v";
    const tiles = [-1, 0, 1].map((d) => ({ x: c.x + (v ? 0 : d), y: c.y + (v ? d : 0) })).filter((t) => Rules.inBounds(map, t.x, t.y));
    const placed = tiles.filter((t) => !Rules.isObstacle(map, t.x, t.y, blocked));
    const units = [];
    for (const t of placed) {
      const u = Rules.unitAt(ruleUnits, t.x, t.y);
      if (!u) continue;
      if (sizeOfP(u) > 1) return { ok: false, tiles, placed, units };
      if (!units.some((q) => q.id === u.id)) units.push(u);
    }
    return { ok: placed.length > 0, tiles, placed, units };
  }, [map, blocked, ruleUnits]);
  // ทิศผลักของกำแพง: ลูกศรที่ช่องติดช่องกลางตามทิศ · กดได้เมื่อทุกคนในแนวมีช่องว่างปลายทาง
  const wallArrows = useCallback((c, orient, plan) => {
    const dirs = orient === "v" ? [["left", -1, 0], ["right", 1, 0]] : [["up", 0, -1], ["down", 0, 1]];
    const onWall = new Set(plan.placed.map((t) => key(t.x, t.y)));
    return dirs.map(([dir, dx, dy]) => ({
      x: c.x + dx, y: c.y + dy, dir,
      ok: plan.units.every((u) => !onWall.has(key(u.x + dx, u.y + dy)) && Rules.freeTile(map, u.x + dx, u.y + dy, ruleUnits, u.id, blocked)),
    })).filter((a) => Rules.inBounds(map, a.x, a.y));
  }, [map, ruleUnits, blocked]);
  const pickInfo = useMemo(() => {
    if (!pick || !me || !me.pos || !map) return null;
    if (pick.kind === "target") {
      // target รูปเฉพาะ (area.cells — วาเลนไทน์ "รู้จักตัวเองอย่างแท้จริง"): ช่องตามรูปนับจากช่องของเรา แทนการนับระยะ
      const cells = Array.isArray(pick.cells) && pick.cells.length ? pick.cells : null;
      const tiles = cells
        ? cells.filter((c) => Array.isArray(c) && Number.isFinite(c[0]) && Number.isFinite(c[1])).map(([dx, dy]) => ({ x: me.pos.x + dx, y: me.pos.y + dy })).filter((t) => Rules.inBounds(map, t.x, t.y))
        : Rules.tilesInRange(map, me.pos.x, me.pos.y, pick.range, sizeOfP(me));
      const keys = new Set(tiles.map((t) => key(t.x, t.y)));
      if (pick.self) for (const t of Rules.footprint(me.pos.x, me.pos.y, sizeOfP(me))) keys.add(key(t.x, t.y));
      const inKeys = (p) => Rules.footprint(p.pos.x, p.pos.y, sizeOfP(p)).some((t) => keys.has(key(t.x, t.y)));
      const valid = new Set(state.players.filter((p) => p.alive && p.pos && sameDim(p) && inKeys(p) && (!pick.allow || pick.allow(p)) && tauntOk(p)).map((p) => p.id));
      return { skill: [...keys], valid };
    }
    if (pick.kind === "aoe") return { aoe: Rules.aoeTiles(map, me.pos.x, me.pos.y, pick.radius, sizeOfP(me)).map((t) => key(t.x, t.y)) };
    if (pick.kind === "line") {
      const dir = dirToward(me.pos, hover, sizeOfP(me)) || pick.lastDir || "up";
      return { dir, aoe: Rules.lineTiles(map, me.pos.x, me.pos.y, dir, pick.len, pick.width, sizeOfP(me)).map((t) => key(t.x, t.y)) };
    }
    if (pick.kind === "tile" && pick.place === "list") {
      // ปุ่มพิเศษที่มี tiles (actions[].tiles — ทาคุโตะพุ่งต้นตาเดิน): ช่องในรายการ = มุมบนซ้ายของตัว · ตัวใหญ่ = ทุกช่องในกรอบเลือกได้
      //  ชี้ช่องไหน = กรอบที่ให้กลางตัวอยู่ช่องนั้น · ไม่มี = กรอบในรายการที่ครอบช่องนั้นและกลางตัวใกล้สุด
      const n = Math.max(1, pick.foot | 0), c = Math.floor((n - 1) / 2);
      const anchors = (Array.isArray(pick.tiles) ? pick.tiles : []).filter((t) => t && Number.isFinite(t.x) && Number.isFinite(t.y) && Rules.inBounds(map, t.x, t.y));
      const cells = new Set();
      for (const a of anchors) for (const t of Rules.footprint(a.x, a.y, n)) if (Rules.inBounds(map, t.x, t.y)) cells.add(key(t.x, t.y));
      const anchorOf = (x, y) => {
        const want = anchors.find((a) => a.x === x - c && a.y === y - c);
        if (want) return want;
        let best = null, bd = Infinity;
        for (const a of anchors) {
          if (!Rules.covers({ x: a.x, y: a.y, size: n }, x, y)) continue;
          const d = Math.abs(a.x + (n - 1) / 2 - x) + Math.abs(a.y + (n - 1) / 2 - y);
          if (d < bd) { bd = d; best = a; }
        }
        return best;
      };
      const skill = [...cells];
      return { tile: true, list: true, foot: n, anchorOf, skill, validSet: new Set(skill) };
    }
    if (pick.kind === "tile" && pick.place === "wall") {
      const valid = Rules.tilesInRange(map, me.pos.x, me.pos.y, [0, pick.range | 0], sizeOfP(me)).filter((t) => wallPlan(t, wallOrient).ok).map((t) => key(t.x, t.y));
      return { tile: true, wall: true, skill: valid, validSet: new Set(valid) };
    }
    if (pick.kind === "tile") {
      // เลือกช่อง (Ice Spike · contract §2): ระยะแมนฮัตตันจากขอบตัว ≤ range (รวมช่องที่ยืน)
      //  ice = ไม่ใช่สิ่งกีดขวาง/หนาม/ร้าน และไม่ใช่น้ำแข็งของแผนที่เดิม · spike = ไม่ใช่สิ่งกีดขวาง/หนาม/ร้าน · คน: 1×1 + ข้างๆ ว่างอย่างน้อย 1 · any = ทุกช่อง
      const own = new Set(((board && board.ice) || []).map((t) => key(t.x, t.y)));
      const corpseKeys = new Set(corpses.map((c) => key(c.x, c.y)));
      const ok = (t) => {
        if (pick.place === "any") return true;
        if (pick.place === "corpse") return corpseKeys.has(key(t.x, t.y)); // ยูนะ: คำอวยพรสุดท้าย — เลือกศพ
        if (Rules.isObstacle(map, t.x, t.y, blocked)) return false;
        if (pick.place === "bloom") return true; // เซลิน: พุ่มดอกไม้ — ช่องไหนก็ได้ที่ไม่ใช่สิ่งกีดขวาง/ร้าน (มีคนยืนได้)
        const k = key(t.x, t.y);
        if (pick.place === "ice") return !(map.special[k] === "ice" && !own.has(k));
        const u = Rules.unitAt(ruleUnits, t.x, t.y);
        if (!u) return true;
        return sizeOfP(u) <= 1 && ICE_DIRS.some(([, dx, dy]) => Rules.freeTile(map, t.x + dx, t.y + dy, ruleUnits, u.id, blocked));
      };
      const valid = Rules.tilesInRange(map, me.pos.x, me.pos.y, [0, pick.range | 0], sizeOfP(me)).filter(ok).map((t) => key(t.x, t.y));
      return { tile: true, skill: valid, validSet: new Set(valid) };
    }
    return null;
  }, [pick, me, map, hover, state.players, board, ruleUnits, blocked, corpses, sameDim, wallPlan, wallOrient]);
  // วางหนามทับคน: เลือกทิศผลัก (ลูกศร 4 ทิศรอบคนนั้น · ทิศที่ช่องปลายไม่ว่าง = กดไม่ได้)
  const pickSig = pick ? `${pick.kind}|${pick.label || ""}|${pick.place || ""}` : "";
  const [dirPick, setDirPick] = useState(null); // { sig, x, y, arrows: [{ x, y, dir, ok }], orient?, tiles? (กำแพง) }
  if (dirPick && dirPick.sig !== pickSig) setDirPick(null);
  // เลือกหลายเป้า (area.count — เซลินจับคู่สลับ 2 คน): คนที่เลือกแล้วในโหมดนี้ · ครบ count = ส่ง
  const [multi, setMulti] = useState({ sig: "", ids: [] });
  const multiIds = useMemo(() => (multi.sig === pickSig ? multi.ids : []), [multi, pickSig]);
  const pickTarget = (id) => {
    const need = Math.max(1, (pick && pick.count) | 0);
    if (need <= 1) { clickSound(); pick.onPick(id); return; }
    clickSound();
    if (multiIds.includes(id)) { setMulti({ sig: pickSig, ids: multiIds.filter((q) => q !== id) }); return; }
    const ids = [...multiIds, id];
    if (ids.length >= need) { setMulti({ sig: "", ids: [] }); pick.onPick(ids); return; }
    setMulti({ sig: pickSig, ids });
  };
  const pickTileAt = (x, y) => {
    if (!pick || pick.kind !== "tile" || !pickInfo || !pickInfo.tile) return;
    if (pickInfo.list) {
      const a = pickInfo.anchorOf(x, y);
      if (!a) return;
      clickSound();
      pick.onPick({ x: a.x, y: a.y });
      return;
    }
    if (dirPick) {
      const ar = dirPick.arrows.find((a) => a.x === x && a.y === y);
      if (ar && ar.ok) { clickSound(); setDirPick(null); pick.onPick({ x: dirPick.x, y: dirPick.y }, ar.dir, dirPick.orient); }
      else if (!(x === dirPick.x && y === dirPick.y)) setDirPick(null);
      return;
    }
    if (!pickInfo.validSet.has(key(x, y))) return;
    clickSound();
    if (pick.place === "wall") {
      // กำแพงทับคน = เลือกทิศผลักก่อน (ลูกศรตั้งฉากกับกำแพง)
      const plan = wallPlan({ x, y }, wallOrient);
      if (plan.units.length) { setDirPick({ sig: pickSig, x, y, orient: wallOrient, tiles: plan.placed, arrows: wallArrows({ x, y }, wallOrient, plan) }); return; }
      pick.onPick({ x, y }, null, wallOrient);
      return;
    }
    const u = pick.place === "spike" ? Rules.unitAt(ruleUnits, x, y) : null;
    if (u) {
      const arrows = ICE_DIRS.map(([dir, dx, dy]) => ({ x: x + dx, y: y + dy, dir, ok: Rules.freeTile(map, x + dx, y + dy, ruleUnits, u.id, blocked) }))
        .filter((a) => a.x >= 0 && a.y >= 0 && a.x < map.cols && a.y < map.rows);
      setDirPick({ sig: pickSig, x, y, arrows });
      return;
    }
    pick.onPick({ x, y });
  };

  // ---------- ระยะอันตราย: ช่องที่ศัตรูทุกคนเดินแล้วตีถึง ----------
  const dangerKeys = useMemo(() => {
    if (!danger || !map || !me) return null;
    const out = new Set();
    for (const p of state.players) {
      if (!p.alive || !p.pos || !isEnemy(p)) continue;
      const z = threatOf(map, unitOf(p), p.mov || 0, p.range || [1, 1], ruleUnits, optsOf(p));
      for (const k of z.move) out.add(k);
      for (const k of z.threat) out.add(k);
    }
    return [...out];
  }, [danger, map, me, state.players, ruleUnits, isAlly, blocked]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- แอนิเมชัน: เดิน (จาก action.path) / ถอย (ฉากตี) ----------
  const [animQ, setAnimQ] = useState([]);
  const anim = animQ[0] || null;
  const [fx, setFx] = useState([]);
  const fxSeq = useRef(0);
  const pushFx = useCallback((list) => setFx((old) => [...old.slice(-30), ...list.map((f) => ({ ...f, key: ++fxSeq.current }))]), []);
  const [hold, setHold] = useState({}); // id → ช่องที่ค้างไว้ระหว่างฉากตี (ก่อนแอนิเมชันถอยเริ่ม)
  const [cinema, setCinema] = useState(null); // กล้องฉากตี { a, b, z }
  const [ghost, setGhost] = useState(null);   // เป้าที่ตกรอบในฉากตี (วาดค้างไว้จนถึงจังหวะปะทะ)
  const [shake, setShake] = useState(0);      // จอสั่น/แฟลช (เลขเปลี่ยน = เล่นใหม่)
  const prevPlayers = useRef({});
  const prevZero = useRef(state.zero || null);
  const [sealHold, setSealHold] = useState(null); // ผนึกที่แตกจากการตี — วาดค้างไว้จนถึงจังหวะปะทะ
  const [faces, setFaces] = useState({}); // id → { x, y } ทิศที่หันหน้า (ก้าวสุดท้ายที่เดิน · เริ่มต้น = หันเข้าหากล้อง)
  const prevPos = useRef({});
  const prevVit = useRef({});
  const seenAttack = useRef(null);
  // ท่าไม้ตายโซระ (state.dash): seq ล่าสุดที่เห็น · ตัวที่ค้างไว้ปลายทางพุ่ง { seq, id, from, done } · id → ช่องปลายทาง (ข้ามแอนิเมชันเลื่อนอัตโนมัติ)
  const seenDash = useRef(null);
  const dashHold = useRef(null);
  const dashSkip = useRef({});
  const seeded = useRef(false);
  const hkPushTo = useRef({}); // ไรโด ฮิคารุ (Strium Ray): id → { from, to } ปลายทางที่ถูกผลัก (มาก่อน state ใหม่)
  const shadowBusy = useRef({}); // เคท & เอมิลิโกะ: id → เวลา (performance.now) ที่ฉาก shadowFx ย้ายตัวนี้เองจบ — ไม่เลื่อน/ไม่ไถลซ้ำ
  const isShadowBusy = (id) => (shadowBusy.current[id] || 0) > performance.now();
  // ดิเอโก้ (socket "diegoFx"): id → เวลา (performance.now) ที่ของที่ขว้าง/ยิงถึงตัว — เลขดาเมจจาก state รอขึ้นตอนนั้น
  //  diegoGhosts = id → ภาพผู้เล่นก่อนตาย (ตกรอบตอนเวลาเดินต่อ — วาดค้างจนของที่ค้างกลางอากาศพุ่งถึง แล้วค่อยระเบิดตกรอบ)
  const diegoDefer = useRef({});
  const [diegoGhosts, setDiegoGhosts] = useState({});
  const diegoDeferMs = (id) => Math.max(0, (diegoDefer.current[id] || 0) - performance.now());
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (ms, fn) => { timers.current.push(setTimeout(fn, ms)); };
  // Ice Spike (socket "iceFx" — contract §4): เล่นเหตุการณ์ตามลำดับ · server ส่ง state ผลสุดท้ายตามมาทันที จึงต้องค้างภาพไว้
  //  iceHold = id → ช่องที่แสดง (ตำแหน่งก่อนเหตุการณ์ → ปลายแอนิเมชันล่าสุดของคนนั้น) · iceLv = "x,y" → Lv หนามที่แสดง (0 = ซ่อน)
  //  iceMask = "x,y" → ช่องพิเศษเดิม (ซ่อนน้ำแข็งใหม่จนเหตุการณ์ถึง) · iceGhosts = id → ภาพผู้เล่นก่อนตาย (วาดจนถึงจังหวะตาย)
  const [iceHold, setIceHold] = useState({});
  const [iceLv, setIceLv] = useState(null);
  const [iceMask, setIceMask] = useState(null);
  const [iceGhosts, setIceGhosts] = useState({});
  // เซลิน: กำแพงน้ำแข็งที่ถูกตีแตก — วาดค้างไว้ถึงจังหวะปะทะ (wallHold) · ช่องที่ฉากตีจัดการเอง (wallClaim "x,y" → หมดอายุ ms)
  //  celineHitAt = เวลา (performance.now) ที่ฉากตีปกติของเซลินถึงจังหวะปะทะ — ผลติดหลังตี (burn/shock/gust/collide) รอถึงตอนนั้น
  const [wallHold, setWallHold] = useState([]);
  const wallClaim = useRef({});
  const celineHitAt = useRef(0);
  // เรียวกิ: ryougiHitAt = เวลาที่ฉากตีปกติของเรียวกิถึงจังหวะปะทะ (ฉากสังหาร/ตัดผลสกิลจากการตีเริ่มตอนนั้น)
  //  ryougiSlain = id → เวลาหมดอายุ: คนที่ถูกเรียวกิสังหาร (socket มาก่อน state) — ไม่ระเบิดตกรอบ (ร่างแยกสองซีกแทน)
  const ryougiHitAt = useRef(0);
  const ryougiSlain = useRef({});
  const iceRun = useRef(null); // { ids, active, gotState, done, pos, snap, snd }
  const iceSeen = useRef(null);
  const finishIceRef = useRef(null); // finishIce ล่าสุด (ประกาศทีหลัง — effect ด้านล่างเรียกผ่านตัวนี้)
  const prevBoard = useRef(state.board || null);

  useEffect(() => {
    const atk = phase === "ATTACKING" ? state.attack : null;
    const freshAtk = atk && atk.id !== seenAttack.current ? atk : null;
    if (freshAtk) seenAttack.current = freshAtk.id;
    const nextPos = {}, nextVit = {};
    for (const p of state.players) { nextPos[p.id] = p.pos ? { ...p.pos } : null; nextVit[p.id] = (p.hp || 0) + (p.armor || 0); }
    const lastPlayers = prevPlayers.current;
    prevPlayers.current = Object.fromEntries(state.players.map((p) => [p.id, p]));
    const zNow = state.zero || null, zPrev = prevZero.current;
    prevZero.current = zNow;
    const dash = state.dash && state.dash.seq != null ? state.dash : null;
    if (!seeded.current) { seeded.current = true; prevPos.current = nextPos; prevVit.current = nextVit; seenDash.current = dash ? dash.seq : null; return; }
    const freshDash = dash && dash.seq !== seenDash.current && Array.isArray(dash.path) && dash.path.length && dash.id != null ? dash : null;
    if (dash) seenDash.current = dash.seq;
    const anims = [];
    // ระบบคู่: ตัวที่ล้มแต่อีกตัวของฝ่ายยังรอด = ยังไม่ตกรอบ (ไม่ขึ้นป้าย "ตกรอบ")
    //  ยูนิตที่ถูกเรียก (วาเลนไทน์) ไม่ใช่ผู้เล่น = ไม่มีป้าย "ตกรอบ"
    const sideStays = (id) => { const t = state.players.find((p) => p.id === id) || lastPlayers[id]; return !!t && (!!t.summon || sideAlive(t, state.players)); };
    // Ice Spike: คนที่อยู่ในเหตุการณ์ iceFx ที่กำลังเล่น (หรือยังรอ state ผลสุดท้าย) — ไม่เลื่อน/ไม่ขึ้นเลข/ไม่ระเบิดซ้ำ (เล่นจากเหตุการณ์แทน)
    const ir = iceRun.current, iceIds = ir && (ir.active || !ir.gotState) ? ir.ids : null;
    const iceSkip = (id) => !!iceIds && iceIds.has(id);
    if (ir) ir.gotState = true;
    const spikeDone = new Set(); // ช่องหนามที่ฉากตีจัดการแล้ว
    // ตกรอบ = ระเบิดการ์ตูน + รูปปลิวหมุนขึ้นฟ้า (ผู้ใช้สั่ง) — ฉากตี/ฉากพุ่งระเบิดตรงจังหวะปะทะ · ทางอื่น (สกิล/ลำแสง/ช่องพิเศษ) ระเบิดทันที
    const boomed = new Set();
    const deathBoom = (t, at) => {
      if (!t || !at || isDoubleP(t)) return; // ตัวที่เหมือนกันแตกเป็นลูกบาศก์ (valentineFx doubleBreak) แทน
      if ((ryougiSlain.current[t.id] || 0) > performance.now()) return; // ถูกเรียวกิสังหาร = ร่างแยกสองซีก → กองเลือด (ryougiFx kill)
      pushFx([{ kind: "deathBoom", x: at.x, y: at.y, size: sizeOfP(t), img: t.img, color: t.color, name: t.name }]);
      playSfx("death_boom");
      if (!lowQ) setShake((n) => n + 1);
    };
    // ปล่อยตัวที่ค้างไว้ปลายทางพุ่ง: server ย้ายตัวจริงแล้ว (ไม่อยู่ช่องเริ่ม) หรือมีฉากพุ่งใหม่
    //  หรือฉากสกิลจบไปแล้วโดยไม่มีเฟสชน (เป้าตกรอบ/หายไประหว่างคลิปชน — server ไม่ส่ง dash ใหม่ โซระยังอยู่ช่องเริ่ม) · dash ถูกล้าง
    const dh = dashHold.current;
    const dashFlowOver = (phase !== "ATTACKING" && phase !== "CUTSCENE") || !dash || dash.seq !== dh?.seq;
    if (dh && !dh.done && (freshDash || dashFlowOver || !samePos(nextPos[dh.id], dh.from))) {
      dh.done = true;
      if (samePos(nextPos[dh.id], dh.from)) delete dashSkip.current[dh.id]; // ไม่ได้ย้ายจริง = ปลายทางพุ่งเดิมใช้ไม่ได้แล้ว
      setHold((h) => { if (!h[dh.id]) return h; const n = { ...h }; delete n[dh.id]; return n; });
    }
    // ท่าไม้ตายโซระ (Mouse Separade) — ตัวที่ขยับเพราะฉากพุ่ง (ทั้งเฟสวิ่ง/ชน) ไม่ต้องเลื่อนอัตโนมัติ (เลขดาเมจยังขึ้นตามปกติ)
    const dashFloat = {}; // id → { ms, at } เลื่อนเลขดาเมจไปขึ้นตอนระเบิด
    if (freshDash) {
      const d = freshDash, id = d.id, pts = d.path.filter((t) => t && Number.isFinite(t.x) && Number.isFinite(t.y)).map((t) => ({ x: t.x, y: t.y }));
      const s0 = pts[0], end = pts[pts.length - 1], size = sizeOfP(byId[id]);
      if (s0 && d.wheel) {
        // เฟสวิ่ง: กรงจักรหนูที่ช่องเริ่ม (WHEEL_MS) → พุ่งตามเส้นทาง (DASH_STEP_MS ต่อช่อง) → ค้างที่ปลายทางจน server ย้ายตัวจริง
        // ทิศจาก server (ทิศที่เลือก) — เป้ายืนติดตัว = เส้นทางยาว 0 ช่อง ใช้เส้นทางเดาทิศไม่ได้
        const dir = d.dir && Number.isFinite(d.dir.x) && Number.isFinite(d.dir.y) ? { x: d.dir.x, y: d.dir.y } : { x: end.x - s0.x, y: end.y - s0.y };
        dashSkip.current[id] = end;
        dashHold.current = { seq: d.seq, id, from: s0, done: false };
        anims.push({ kind: "wheel", id, at: s0, ms: SORA_T.wheel, dir, lunge: pts.length <= 1, seq: ++fxSeq.current });
        if (pts.length > 1) anims.push({ kind: "move", id, path: pts, stepMs: SORA_T.step, holdEnd: end, dashSeq: d.seq, seq: ++fxSeq.current });
        pushFx([
          { kind: "soraWheel", x: s0.x, y: s0.y, size, dir, spin: SORA_T.wheel, path: pts, step: SORA_T.step, dur: SORA_T.wheel + Math.max(0, pts.length - 1) * SORA_T.step + 160 },
          ...(pts.length > 1 ? [{ kind: "soraDash", path: pts, step: SORA_T.step, delay: SORA_T.wheel, size, dur: SORA_T.wheel + dashDur(pts, SORA_T.step) }] : []),
        ]);
        if (dir.x || dir.y) setFaces((f) => ({ ...f, [id]: { x: Math.sign(dir.x), y: Math.sign(dir.y) } }));
        look(s0);
        playSfx("sora_squeak");
        playSfx("sora_wheel"); // ยาวเท่าช่วงปั่นจักร (SORA_T.wheel)
        later(SORA_T.wheel, () => { look(end); playSfx("sora_dash"); if (!lowQ) setShake((n) => n + 1); });
      } else if (s0) {
        // เฟสชน (หลังวิดีโอ): โซระเข้าช่องเป้า · เป้าถูกเหวี่ยงไปช่องเริ่ม (swap) · ระเบิดฟ้าที่ช่องเป้า
        const moveMs = pts.length > 1 ? (pts.length - 1) * SORA_T.step : 0;
        dashSkip.current[id] = end;
        if (pts.length > 1) anims.push({ kind: "move", id, path: pts, stepMs: SORA_T.step, seq: ++fxSeq.current });
        const sw = d.swap && d.swap.id != null && d.swap.from && d.swap.to ? d.swap : null;
        const boom = d.boom && Number.isFinite(d.boom.x) && Number.isFinite(d.boom.y) ? d.boom : end;
        const bSize = Math.max(1, d.boomSize | 0);
        if (sw && nextPos[sw.id]) {
          dashSkip.current[sw.id] = sw.to;
          setHold((h) => ({ ...h, [sw.id]: sw.from }));
          anims.push({ kind: "fling", id: sw.id, from: { x: sw.from.x, y: sw.from.y }, to: { x: sw.to.x, y: sw.to.y }, releaseHold: true, seq: ++fxSeq.current });
          dashFloat[sw.id] = { ms: moveMs + 60, at: boom };
        }
        // เป้าตกรอบ (server เอาออกแล้ว) = วาดค้างไว้ถึงตอนระเบิด + เลขดาเมจ/ตกรอบ
        const dead = sw ? null : Object.values(lastPlayers).find((t) => t && t.id !== id && t.pos && !nextPos[t.id] && Rules.covers(boxOfP(t), boom.x, boom.y));
        if (dead) {
          setGhost({ id: dead.id, x: dead.pos.x, y: dead.pos.y, img: dead.img, color: dead.color, name: dead.name, hp: dead.hp ?? 0, maxHp: dead.maxHp ?? 0, armor: dead.armor ?? 0, maxArmor: dead.maxArmor ?? 0, size: sizeOfP(dead) });
          later(moveMs + 40, () => setGhost(null));
          boomed.add(dead.id);
        }
        if (nextPos[id]) dashFloat[id] = { ms: moveMs + 60, at: nextPos[id] };
        const lost = dead ? (nextVit[dead.id] ?? 0) - (prevVit.current[dead.id] ?? 0) : 0;
        look(boom);
        later(moveMs, () => {
          pushFx([
            { kind: "soraBoom", x: boom.x, y: boom.y, size: bSize },
            ...(dead && lost < 0 ? [{ kind: "float", x: boom.x, y: boom.y, text: `${lost}`, size: 30, z: lowQ ? 2.4 : 1.5 }] : []),
            ...(dead ? [{ kind: "float", x: boom.x, y: boom.y - 0.6, text: "ตกรอบ", color: "#ff8f8f", size: 24, z: lowQ ? 2.4 : 1.5 }] : []),
          ]);
          if (!lowQ) setShake((n) => n + 1);
          if (dead) deathBoom(dead, dead.pos);
        });
      }
    }
    // ตัวที่ถึงปลายทางของฉากพุ่งแล้ว (ใช้ครั้งเดียว)
    const dashMoved = new Set();
    for (const [id, to] of Object.entries(dashSkip.current)) {
      const before = prevPos.current[id], now = nextPos[id];
      if (!now) { delete dashSkip.current[id]; continue; }
      if (before && !samePos(before, now) && samePos(now, to)) { dashMoved.add(id); delete dashSkip.current[id]; }
    }

    // ย้อนการเดิน (ปุ่มย้อน / ก้าวหรือคลิกกลับจุดเริ่ม): ภาพเดินที่ยังค้างในคิวของคนนั้นทิ้งหมด — กลับที่เดิมทันที
    const act = state.action;
    if (state.actorId && act && !act.moved && act.from) {
      const id = state.actorId, before = prevPos.current[id], now = nextPos[id];
      if (before && now && !samePos(before, now) && samePos(now, act.from)) {
        setAnimQ((q) => q.filter((a) => !(a.id === id && a.kind === "move")));
        if (ir && !ir.done && ir.ids.has(id) && finishIceRef.current) finishIceRef.current(ir);
      }
    }
    // เดิน: ตำแหน่งคนที่กำลังเดินเปลี่ยนตามเส้นทางของตานี้
    //  เส้นทางเริ่มที่ช่องเดิม หรือเริ่มที่จุดเริ่มตา (เดินแล้วคลิกใหม่ = เดินใหม่จากจุดเริ่ม)
    const path = act && act.path;
    if (state.actorId && path && path.length > 1 && !dashMoved.has(state.actorId) && !iceSkip(state.actorId)) {
      const id = state.actorId, before = prevPos.current[id], now = nextPos[id];
      if (before && now && !samePos(before, now) && (samePos(path[0], before) || samePos(path[0], act.from)) && samePos(path[path.length - 1], now)) {
        // Echo เดินกระโดดดึ๋งๆ ทีละช่อง (ตัวใหญ่กระโดดช้าและหนักกว่า)
        const mover = state.players.find((q) => q.id === id);
        const hop = mover && mover.character && BIG_ART[mover.character.id] ? sizeOfP(mover) : 0;
        anims.push({ kind: "move", id, path, hop, seq: ++fxSeq.current });
        const a = path[path.length - 2], b = path[path.length - 1];
        setFaces((f) => ({ ...f, [id]: { x: Math.sign(b.x - a.x), y: Math.sign(b.y - a.y) } }));
        look(now);
      }
    }
    // ฉากตี (ดีไซน์ใหม่): กล้องซูมเข้าคู่ → หมากพุ่งชน → ปะทะ (แสงแตก + จอสั่น/แฟลช + เลขดาเมจ + เสียงตี) → (สวน) → ถอย/ชน → กล้องคืน
    //  ยิงปืน = ไม่พุ่ง (ยิงจากที่ยืน) · lowQ = ไม่ซูม/ไม่พุ่ง (ปะทะทันที)
    const involved = new Set();
    if (freshAtk) {
      const a = freshAtk;
      involved.add(a.byId); involved.add(a.targetId);
      // ตีแนวตรง (ไรโด ฮิคารุ): ศัตรูคนอื่นในแนวโดนด้วย — เลขดาเมจ/สั่นขึ้นพร้อมเป้าหลักที่จังหวะปะทะ
      const extras = (Array.isArray(a.extra) ? a.extra : []).map((e) => ({ ...e, at: nextPos[e.targetId] || prevPos.current[e.targetId] || null })).filter((e) => e.at);
      for (const e of extras) involved.add(e.targetId);
      // ตีผนึก (ห่วงเวลาซีโร่): ตำแหน่งเป้า = ช่องผนึก · แตก = วาดค้างไว้ถึงจังหวะปะทะแล้วค่อยแตก
      const sI = Number.isInteger(a.seal) ? a.seal : sealIdx(a.targetId);
      const sealT = sI >= 0 ? sealOf(zNow, sI) || sealOf(zPrev, sI) : null;
      const sealBroke = !!(sealT && a.kill);
      const sealStage = (zPrev && zPrev.stage) || (zNow && zNow.stage) || 1;
      if (sealBroke) setSealHold(sI);
      // ตีหนามน้ำแข็ง: ตำแหน่งเป้า = ช่องหนาม · Lv ลด/แตก = วาดหนามเดิมค้างไว้ถึงจังหวะปะทะ
      const spikeT = a.spike && Number.isFinite(a.spike.x) && Number.isFinite(a.spike.y) ? { x: a.spike.x, y: a.spike.y } : spikeOfId(a.targetId);
      const spikeK = spikeT ? key(spikeT.x, spikeT.y) : null;
      const spikeWas = spikeK ? boardSpikeLv(prevBoard.current, spikeK) : 0, spikeNow = spikeK ? boardSpikeLv(state.board, spikeK) : 0;
      if (spikeK) spikeDone.add(spikeK);
      // กำแพงน้ำแข็งของเซลิน (terrain "icewall") แตกจากการตี = วาดค้างไว้ถึงจังหวะปะทะ แล้วแตกกระจาย (celineFx wallBreak ที่มาพร้อมกันถูกจองไว้)
      const pbT = prevBoard.current && prevBoard.current.terrain, nbT = state.board && state.board.terrain;
      const wallHit = !!spikeK && !!pbT && pbT[spikeK] === "icewall" && !(nbT && nbT[spikeK] === "icewall");
      if (wallHit) {
        wallClaim.current[spikeK] = performance.now() + 2500;
        setWallHold((h) => [...h.filter((t) => !samePos(t, spikeT)), { x: spikeT.x, y: spikeT.y }]);
      }
      if (spikeK && spikeWas > 0 && spikeNow !== spikeWas) setIceLv((m) => ({ ...(m || {}), [spikeK]: spikeWas }));
      const tPos = sealT ? { x: sealT.x, y: sealT.y } : spikeT || nextPos[a.targetId] || prevPos.current[a.targetId];
      const fromPos = a.push ? a.push.from : (nextPos[a.byId] || prevPos.current[a.byId]);
      if (a.push) setHold((h) => ({ ...h, [a.byId]: a.push.from }));
      // คนตีหันหน้าเข้าหาเป้า (ตัวใหญ่ใช้รูปหน้า/ข้าง/หลังตามทิศ) · มีสวนกลับ = เป้าหันกลับมาด้วย
      if (fromPos && tPos) {
        const faceTo = (p, q, sp, sq) => {
          const dx = (q.x + sq / 2) - (p.x + sp / 2), dy = (q.y + sq / 2) - (p.y + sp / 2);
          return Math.abs(dx) >= Math.abs(dy) ? { x: Math.sign(dx) || 1, y: 0 } : { x: 0, y: Math.sign(dy) };
        };
        const sa = sizeOfP(byId[a.byId]), st = sizeOfP(byId[a.targetId]);
        setFaces((f) => ({
          ...f,
          [a.byId]: faceTo(fromPos, tPos, sa, st),
          ...(a.counter ? { [a.targetId]: faceTo(tPos, fromPos, st, sa) } : {}),
        }));
      }
      // ตีปกติเป็นลำแสง (นักบินปริศนา · byBeam = ความยาวช่อง): ยิงจากที่ยืน ลำแสงพุ่งไปหาเป้า ปลายลำแสงถึง = จังหวะปะทะ
      const beam = !a.gun && a.byBeam > 0 && fromPos && tPos;
      // ท่าตีเฉพาะตัว (Echo: คลื่นเสียง / ผมฟาด / ปาหิน) — ตีจากที่ยืน เอฟเฟกต์วิ่งจากตัวไปหาเป้า
      const style = !a.gun && !beam && a.byStyle && STYLE_HIT[a.byStyle] && fromPos && tPos ? a.byStyle : null;
      // ไจโรตีด้วยลูกเหล็กที่ขว้าง (gyroFx "throw") — ไม่พุ่งชนแม้อยู่ใกล้
      const melee = !a.gun && !beam && !style && fromPos && tPos && !(byId[a.byId] && byId[a.byId].gyro) && Math.abs(fromPos.x - tPos.x) + Math.abs(fromPos.y - tPos.y) <= 2;
      const ZOOM_IN = lowQ ? 0 : 480;
      const HIT = ZOOM_IN + (beam ? BEAM_T.charge + BEAM_T.extend : style ? STYLE_HIT[style] : melee && !lowQ ? 385 : 120);
      if (beam) later(ZOOM_IN, () => pushFx([{ kind: "beam", x: fromPos.x, y: fromPos.y, to: tPos, len: a.byBeam, hitId: a.targetId, tone: a.byBeamTone || null }]));
      // มีดโซระ (byHitFx "mythSlash"): พุ่งชนแบบเดิม · เสียงเริ่มก่อนปะทะ (ฟันแรกในเสียงตรงจังหวะปะทะ) · ฟันฟ้า 2 ครั้งแทนแสงแตก
      //  ดาบ BeamSaber ของบานาจ (byHitFx "saberRed"): ฟันไขว้แบบเดียวกันแต่สีแดง · เสียงตีตรงจังหวะปะทะ
      const saber = a.byHitFx === "saberRed";
      const myth = a.byHitFx === "mythSlash" || saber;
      if (myth && !saber && tPos) later(Math.max(0, HIT - SORA_T.lead), () => playSfx(a.byAttackSound || "attack"));
      if (style && style.startsWith("celine")) celineHitAt.current = performance.now() + HIT;
      if (style && style.startsWith("ryougi")) ryougiHitAt.current = performance.now() + HIT;
      if (style) later(ZOOM_IN, () => pushFx([{ kind: style, x: fromPos.x, y: fromPos.y, size: a.bySize || 1, to: { x: tPos.x, y: tPos.y }, toSize: sizeOfP(byId[a.targetId]), color: a.byColor, lane: Array.isArray(a.byLane) ? a.byLane : null, by: a.byId }]));
      // ท่าตีของฮิคารุ (hk*): ปะทะเป็นแสงตามสีร่าง + ทุกคนที่โดนสั่นพร้อมกัน (แทนแสงแตกกลาง)
      const hk = !!style && isHikaruFx(style);
      // เสียงของท่าฮิคารุเริ่มก่อนปะทะ (ช่วงดังสุดของไฟล์ตรงจังหวะปะทะ)
      if (hk && tPos) later(Math.max(ZOOM_IN, HIT - (HK_SFX_LEAD[style] || 0)), () => playSfx(a.byAttackSound || "attack"));
      // Zoltraak ของเฟิร์น: เสียงร่าย/ชาร์จเริ่มพร้อมวงเวท · เสียงระเบิดในไฟล์ (1.5 วิ) ตรงจังหวะปะทะ
      const fernZ = style === "fernZoltraak" || style === "fernZoltraakMax";
      if (fernZ && tPos) later(Math.max(ZOOM_IN, HIT - FERN_SFX_LEAD), () => playSfx(a.byAttackSound || "attack"));
      // ตีซ้ำเป้าเดิมในการตีครั้งเดียว (card.repeat — ชิโร่ Kanshou & Bakuya): ฮิตละ EMIYA_REPEAT_MS หลังฮิตแรก · ตายที่ฮิตไหน = ตกรอบตอนนั้น
      const reps = Array.isArray(a.repeat) ? a.repeat : [];
      const repKill = reps.findIndex((r) => r.kill);
      const tKill = !!a.kill || repKill >= 0;
      const tKillAt = a.kill ? HIT : HIT + EMIYA_REPEAT_MS * (repKill + 1);
      // เป้าตกรอบ (server เอาออกจากกระดานแล้ว) = วาดค้างไว้ถึงจังหวะปะทะ
      if (tKill && tPos && !nextPos[a.targetId] && lastPlayers[a.targetId]) {
        const t = lastPlayers[a.targetId];
        setGhost({ id: t.id, x: tPos.x, y: tPos.y, img: t.img, color: t.color, name: t.name, hp: t.hp ?? 0, maxHp: t.maxHp ?? 0, armor: t.armor ?? 0, maxArmor: t.maxArmor ?? 0 });
        later(tKillAt + 40, () => setGhost(null));
      }
      // ตกรอบในฉากตี (เป้าหลัก + คนอื่นในแนว) = ระเบิดตอนปะทะ
      const mainDead = tKill && tPos && !sealT && lastPlayers[a.targetId] ? { t: lastPlayers[a.targetId], at: tPos } : null;
      const deadInAtk = extras.filter((e) => e.kill && lastPlayers[e.targetId]).map((e) => ({ t: lastPlayers[e.targetId], at: e.at }));
      if (mainDead) boomed.add(mainDead.t.id);
      for (const d of deadInAtk) boomed.add(d.t.id);
      if (mainDead) later(tKillAt, () => deathBoom(mainDead.t, mainDead.at));
      if (deadInAtk.length) later(HIT, () => deadInAtk.forEach((d) => deathBoom(d.t, d.at)));
      if (tPos) {
        look(tPos);
        if (!lowQ && fromPos) setCinema({ a: fromPos, b: tPos, z: 2 });
        if (melee && !lowQ) later(ZOOM_IN, () => setAnimQ((q) => [...q, { kind: "lunge", id: a.byId, from: fromPos, to: tPos, hitId: a.targetId, seq: ++fxSeq.current }]));
        later(HIT, () => {
          if ((!myth || saber) && !hk && !fernZ) playSfx(a.byAttackSound || "attack");
          if (style && grayChains(style) && !a.dodge) playSfx("gray_chains"); // เกรย์จงบ้าคลั่ง: โซ่ตรึงซ้อนเสียงอาวุธ
          // เซลินติดคริ: ดอกทอง + มงกุฎเล็กเหนือเป้า + เสียงประกาย (ซ้อนเสียงอาวุธ)
          if (style && style.startsWith("celine") && a.crit && !a.dodge) { playSfx("celine_crit"); pushFx([{ kind: "celineCrit", x: tPos.x, y: tPos.y, size: sizeOfP(byId[a.targetId]) }]); }
          if (wallHit) {
            setWallHold((h) => h.filter((t) => !samePos(t, spikeT)));
            pushFx([{ kind: "celineWallBreak", x: spikeT.x, y: spikeT.y, tiles: [{ x: spikeT.x, y: spikeT.y }], why: "hit" }]);
          }
          setShake((n) => n + 1);
          if (myth && !a.dodge && !lowQ) later(SORA_T.slash2, () => setShake((n) => n + 1));
          const first = a.gun ? (GUTS_AMMO_INFO[a.gun]?.name || "ยิง") : a.dodge ? "หลบ" : a.byDeferDmg ? null : `-${a.dmg}`;
          pushFx([
            hk && !a.dodge
              ? { kind: "hkHit", x: tPos.x, y: tPos.y, size: sizeOfP(byId[a.targetId]), tone: HK_TONE[style], hitIds: [a.targetId, ...extras.filter((e) => !e.dodge).map((e) => e.targetId)] }
              : { kind: a.dodge ? "slash" : myth ? "mythSlash" : "burst", x: tPos.x, y: tPos.y, color: a.byColor, size: sizeOfP(byId[a.targetId]), tone: saber ? "red" : null },
            ...extras.flatMap((e) => [
              e.dodge ? { kind: "slash", x: e.at.x, y: e.at.y, color: a.byColor } : hk ? { kind: "hkHit", x: e.at.x, y: e.at.y, size: sizeOfP(byId[e.targetId]), tone: HK_TONE[style] } : { kind: "burst", x: e.at.x, y: e.at.y, color: a.byColor },
              { kind: "float", x: e.at.x, y: e.at.y, text: e.dodge ? "หลบ" : `-${e.dmg}`, color: e.crit && !e.dodge ? "#ffd84a" : undefined, size: 28, z: lowQ ? 2.4 : 1.5 },
              ...(e.kill && !sideStays(e.targetId) ? [{ kind: "float", x: e.at.x, y: e.at.y - 0.6, text: "ตกรอบ", color: "#ff8f8f", size: 22, z: lowQ ? 2.4 : 1.5 }] : []),
            ]),
            ...(first == null ? [] : [{ kind: "float", x: tPos.x, y: tPos.y, text: first, color: a.gun ? "#ffd27a" : a.crit && !a.dodge ? "#ffd84a" : undefined, size: a.gun ? 20 : a.crit && !a.dodge ? 38 : 30, z: lowQ ? 2.4 : 1.5 }]),
            // คริติคอลติด = ป้ายเหนือเลขดาเมจ (เดิมฉากบนกระดานไม่บอก — ดาเมจ ×2 แล้วผู้เล่นไม่รู้ตัว)
            ...(a.crit && !a.dodge && !a.gun ? [{ kind: "float", x: tPos.x, y: tPos.y - (a.kill ? 1.2 : 0.6), text: "คริติคอล", color: "#ffd84a", size: 24, z: lowQ ? 2.4 : 1.5 }] : []),
            ...(a.kill && !sealT && !spikeT && !sideStays(a.targetId) ? [{ kind: "float", x: tPos.x, y: tPos.y - 0.6, text: "ตกรอบ", color: "#ff8f8f", size: 24, z: lowQ ? 2.4 : 1.5 }] : []),
          ]);
          if (spikeK && spikeWas > 0 && spikeNow !== spikeWas) {
            setIceLv((m) => { if (!m || !(spikeK in m)) return m; const n = { ...m }; delete n[spikeK]; return Object.keys(n).length ? n : null; });
            pushFx([{ kind: "iceSpikeBreak", x: tPos.x, y: tPos.y, lv: spikeNow }]);
            playSfx("is_skill_2_broke");
          }
          if (sealBroke) {
            setSealHold((h) => (h === sI ? null : h));
            pushFx([{ kind: "sealBreak", x: tPos.x, y: tPos.y, i: sI, stage: sealStage }]);
            if (a.byAttackSound && a.byAttackSound !== "attack") playSfx("attack");
          }
        });
      }
      if (tPos) reps.forEach((r, i) => later(HIT + EMIYA_REPEAT_MS * (i + 1), () => {
        setShake((n) => n + 1);
        const zz = lowQ ? 2.4 : 1.5, crit = r.crit && !r.dodge;
        pushFx([
          { kind: r.dodge ? "slash" : "burst", x: tPos.x, y: tPos.y, color: a.byColor, size: sizeOfP(byId[a.targetId]) },
          { kind: "float", x: tPos.x, y: tPos.y - 0.35, text: r.dodge ? "หลบ" : `-${r.dmg}`, color: crit ? "#ffd84a" : undefined, size: crit ? 38 : 30, z: zz },
          ...(crit ? [{ kind: "float", x: tPos.x, y: tPos.y - (r.kill ? 1.5 : 0.95), text: "คริติคอล", color: "#ffd84a", size: 24, z: zz }] : []),
          ...(r.kill && !sideStays(a.targetId) ? [{ kind: "float", x: tPos.x, y: tPos.y - 0.95, text: "ตกรอบ", color: "#ff8f8f", size: 24, z: zz }] : []),
        ]);
      }));
      let t = HIT + EMIYA_REPEAT_MS * reps.length;
      if (a.counter && fromPos) {
        t = HIT + 640;
        const c = a.counter;
        if (c.byBeam > 0 && tPos) later(t - BEAM_T.charge - BEAM_T.extend, () => pushFx([{ kind: "beam", x: tPos.x, y: tPos.y, to: fromPos, len: c.byBeam, hitId: c.targetId, tone: c.byBeamTone || null }]));
        const cMyth = c.byHitFx === "mythSlash";
        if (cMyth) later(Math.max(0, t - SORA_T.lead), () => playSfx(c.byAttackSound || "attack"));
        later(t, () => {
          if (!cMyth) playSfx(c.byAttackSound || "attack");
          setShake((n) => n + 1);
          if (cMyth && !c.dodge && !lowQ) later(SORA_T.slash2, () => setShake((n) => n + 1));
          pushFx([
            { kind: c.dodge ? "slash" : cMyth ? "mythSlash" : "burst", x: fromPos.x, y: fromPos.y, color: c.byColor, size: sizeOfP(byId[c.targetId]) },
            { kind: "float", x: fromPos.x, y: fromPos.y, text: c.dodge ? "หลบ" : `สวน -${c.dmg}`, color: "#ffb0a8", size: 24 },
          ]);
        });
      }
      if (a.push) {
        later(t + 420, () => {
          setHold((h) => { const n = { ...h }; delete n[a.byId]; return n; });
          setAnimQ((q) => [...q, { kind: "push", id: a.byId, from: a.push.from, to: a.push.to, collide: a.push.collide, seq: ++fxSeq.current }]);
          if (a.push.collide) pushFx([{ kind: "float", x: a.push.from.x, y: a.push.from.y, text: "ชน -1", color: "#ffc56b", size: 22 }]);
        });
      }
      const slashTail = myth || (a.counter && (a.counter.byHitFx === "mythSlash" || a.counter.byHitFx === "saberRed")) ? SORA_T.slash2 : 0;
      if (!lowQ) later(t + slashTail + (a.push ? 900 : 1000), () => setCinema(null));
    }
    // ผนึกแตกนอกฉากตี (สกิลพื้นที่) = แตกทันที
    if (zNow && zPrev && Array.isArray(zNow.seals) && Array.isArray(zPrev.seals)) {
      const atkSeal = freshAtk ? (Number.isInteger(freshAtk.seal) ? freshAtk.seal : sealIdx(freshAtk.targetId)) : -1;
      for (const s of zNow.seals) {
        const was = sealOf(zPrev, s.i);
        if (!s.broken || !was || was.broken || s.i === atkSeal) continue;
        pushFx([{ kind: "sealBreak", x: s.x, y: s.y, i: s.i, stage: zPrev.stage || 1 }]);
        look(s);
        if (!lowQ) setShake((n) => n + 1);
      }
    }
    // หนามน้ำแข็งลด Lv/หายนอกฉากตีและนอกเหตุการณ์ iceFx (สกิลพื้นที่ตีโดน / หมดเวลา) = แตกทันที
    const pb = prevBoard.current, nb = state.board;
    if (pb && nb && pb.area === nb.area && !iceIds) {
      let broke = false;
      for (const [k, kind] of Object.entries(pb.terrain || {})) {
        const was = iceSpikeLv(kind), now = boardSpikeLv(nb, k);
        if (!was || now >= was || spikeDone.has(k)) continue;
        const [x, y] = k.split(",").map(Number), old = (pb.spikes || []).find((sp) => sp.x === x && sp.y === y);
        pushFx([{ kind: "iceSpikeBreak", x, y, lv: now }]);
        if (!(now === 0 && old && old.left <= 1)) broke = true; // หมดเวลา = แตกเงียบ
      }
      if (broke) playSfx("is_skill_2_broke");
    }
    // เลือด/เกราะเปลี่ยนนอกฉากตี (สกิล/สถานะ/ช่องพิเศษ) → ตัวเลขลอย (กล้องตามคนแรกที่โดน)
    let hurtPos = null;
    for (const p of state.players) {
      if (involved.has(p.id) || !p.pos || iceSkip(p.id)) continue;
      const d = (nextVit[p.id] || 0) - (prevVit.current[p.id] ?? nextVit[p.id]);
      const df = dashFloat[p.id] || (d < 0 && diegoDeferMs(p.id) > 0 ? { ms: diegoDeferMs(p.id), at: p.pos } : null), at = df ? df.at : p.pos;
      const fl = d < 0 ? [{ kind: "float", x: at.x, y: at.y, text: `${d}` }] : d > 0 ? [{ kind: "float", x: at.x, y: at.y, text: `+${d}`, color: "#8ff0b0" }] : null;
      if (fl && df) later(df.ms, () => pushFx(fl));
      else if (fl) pushFx(fl);
      if (d && !hurtPos) hurtPos = p.pos;
    }
    if (hurtPos && !freshAtk) look(hurtPos);
    for (const p of state.players) {
      const was = lastPlayers[p.id];
      if (!was || !was.alive || !was.pos || p.alive || boomed.has(p.id) || iceSkip(p.id)) continue;
      // ตกรอบตอนเวลาเดินต่อ (ดิเอโก้): ระเบิดตอนของที่ค้างกลางอากาศพุ่งถึง (ร่างค้างไว้ใน diegoGhosts)
      const dms = diegoDeferMs(p.id);
      if (dms > 0) { later(dms, () => { deathBoom(was, was.pos); setDiegoGhosts((g) => { if (!g[p.id]) return g; const n = { ...g }; delete n[p.id]; return n; }); }); continue; }
      deathBoom(was, was.pos);
    }
    // ขยับเองนอกการเดิน/ฉากตี (น้ำวนดัน ฯลฯ) ระยะ 1–2 ช่อง = เลื่อนไปแทนการกระโดด
    //  ถูก Strium Ray ผลัก (server แจ้งปลายทางมาก่อนทาง hikaruPush) = เลื่อนไปไกลเท่าไรก็ได้
    for (const p of state.players) {
      const before = prevPos.current[p.id], now = nextPos[p.id];
      if (!before || !now || samePos(before, now) || involved.has(p.id) || dashMoved.has(p.id) || iceSkip(p.id) || isShadowBusy(p.id) || anims.some((a) => a.id === p.id)) continue;
      const hp = hkPushTo.current[p.id];
      if (hp && samePos(now, hp.to)) {
        delete hkPushTo.current[p.id];
        anims.push({ kind: "push", id: p.id, from: before, to: now, collide: false, ms: HK_PUSH_MS, seq: ++fxSeq.current });
        continue;
      }
      if (Math.abs(before.x - now.x) + Math.abs(before.y - now.y) > 2) continue; // ไกลกว่านั้น = วางใหม่ (เปลี่ยนภูมิภาค/ย้อนการเดิน)
      if (p.id === state.actorId && !(state.action && state.action.moved)) continue; // กดย้อน = กลับที่เดิมทันที
      anims.push({ kind: "push", id: p.id, from: before, to: now, collide: false, seq: ++fxSeq.current });
    }
    if (anims.length) setAnimQ((q) => [...q, ...anims]);
    prevPos.current = nextPos;
    prevVit.current = nextVit;
    prevBoard.current = state.board || null;
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps -- เทียบกับ state ก่อนหน้าเท่านั้น

  // ลำแสง Beam Magnum (นักบินปริศนา) — server ส่งให้ทุกคน { from, dir, len, color } · ลำแสงเริ่มช่องติด from
  //  กล้องมุมใกล้ตามกลางแนวถ้าอยู่นอกจอ · จังหวะยิง (หลังชาร์จ) = จอสั่น/แฟลช
  const boardRef = useRef(state.board);
  useLayoutEffect(() => { boardRef.current = state.board; });
  useEffect(() => {
    const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const onBeam = (b) => {
      const v = b && DIRS[b.dir];
      if (!v || !b.from || !Number.isFinite(b.from.x) || !Number.isFinite(b.from.y)) return;
      pushFx([{ kind: "beam", x: b.from.x, y: b.from.y, dir: b.dir, len: b.len, color: b.color, tone: b.tone || null }]);
      const bd = boardRef.current || {}, half = Math.ceil((Number(b.len) || 6) / 2);
      const cl = (n, hi) => Math.max(0, Math.min(Math.max(0, (hi || 1) - 1), n));
      look({ x: cl(b.from.x + v[0] * half, bd.cols), y: cl(b.from.y + v[1] * half, bd.rows) });
      if (!lowQ) timers.current.push(setTimeout(() => setShake((n) => n + 1), BEAM_T.charge));
    };
    socket.on("beamFx", onBeam);
    return () => socket.off("beamFx", onBeam);
  }, [pushFx, look, lowQ]);

  // คลื่นดาบถล่ม (มุยมิ: ท่าไม้ตาย / ดาบสนิมระหว่างดาบสะบั้น) — { from, dir, len, width, color } · กล้องตามกลางแนว · จอสั่นตอนดาบแถวแรก/แถวท้ายปักพื้น
  useEffect(() => {
    const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const onQuake = (b) => {
      const v = b && DIRS[b.dir];
      if (!v || !b.from || !Number.isFinite(b.from.x) || !Number.isFinite(b.from.y)) return;
      const len = Number(b.len) || 4;
      pushFx([{ kind: "quake", x: b.from.x, y: b.from.y, dir: b.dir, len, width: b.width, color: b.color }]);
      const bd = boardRef.current || {}, half = Math.ceil(len / 2);
      const cl = (n, hi) => Math.max(0, Math.min(Math.max(0, (hi || 1) - 1), n));
      look({ x: cl(b.from.x + v[0] * half, bd.cols), y: cl(b.from.y + v[1] * half, bd.rows) });
      if (!lowQ) {
        timers.current.push(setTimeout(() => setShake((n) => n + 1), QUAKE_T.fall));
        if (len > 1) timers.current.push(setTimeout(() => setShake((n) => n + 1), QUAKE_T.fall + (len - 1) * QUAKE_T.stagger));
      }
    };
    socket.on("quakeFx", onQuake);
    return () => socket.off("quakeFx", onQuake);
  }, [pushFx, look, lowQ]);
  // คลื่นความมืด (กิระ) — { from, dir, len, width, color } · กล้องตามกลางแนว · จอสั่นตอนแถวแรกซัดลง
  useEffect(() => {
    const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const onDark = (b) => {
      const v = b && DIRS[b.dir];
      if (!v || !b.from || !Number.isFinite(b.from.x) || !Number.isFinite(b.from.y)) return;
      const len = Number(b.len) || 4;
      pushFx([{ kind: "darkWave", x: b.from.x, y: b.from.y, dir: b.dir, len, width: b.width, color: b.color }]);
      playSfx("kira_wave");
      const bd = boardRef.current || {}, half = Math.ceil(len / 2);
      const cl = (n, hi) => Math.max(0, Math.min(Math.max(0, (hi || 1) - 1), n));
      look({ x: cl(b.from.x + v[0] * half, bd.cols), y: cl(b.from.y + v[1] * half, bd.rows) });
      if (!lowQ) timers.current.push(setTimeout(() => setShake((n) => n + 1), DARK_T.rise));
    };
    socket.on("darkWaveFx", onDark);
    return () => socket.off("darkWaveFx", onDark);
  }, [pushFx, look, lowQ]);

  // ยูนะ: socket "yunaFx" { kind, at, from, to, r, song, ... } → เอฟเฟกต์บนกระดาน (yunaFx.js) · เสียงมาจาก server (sfx / skillFlash)
  useEffect(() => {
    const onYuna = (e) => {
      const kind = e && YUNA_EVENT_FX[e.kind];
      if (!kind) return;
      pushFx([{ ...e, kind, x: e.at ? e.at.x : e.to ? e.to.x : 0, y: e.at ? e.at.y : e.to ? e.to.y : 0 }]);
      if ((e.kind === "revive" || e.kind === "idol") && e.at) look(e.at);
      if (e.kind === "idol" && !lowQ) setShake((n) => n + 1);
    };
    socket.on("yunaFx", onYuna);
    return () => socket.off("yunaFx", onYuna);
  }, [pushFx, look, lowQ]);

  // เกรย์: socket "grayFx" { kind: keeper | grave | reap | beam, at, ... } → เอฟเฟกต์บนกระดาน (grayFx.js) · เสียง keeper/grave/reap มาจาก server
  //  beam (รองโกมิเนียต): เสียงลำแสง + กล้องตามกลางแนว · ดาเมจลงที่ GRAY_BEAM.hit = คนในแนวสั่น + จอสั่น/แฟลช + กล้องสั่นแรง
  const playersRef = useRef(state.players);
  useLayoutEffect(() => { playersRef.current = state.players; });
  useEffect(() => {
    const onGray = (e) => {
      const kind = e && GRAY_EVENT_FX[e.kind];
      if (!kind || !e.at || !Number.isFinite(e.at.x) || !Number.isFinite(e.at.y)) return;
      const f = { ...e, kind, x: e.at.x, y: e.at.y };
      if (e.kind === "beam") {
        const tiles = Array.isArray(e.tiles) ? e.tiles.filter((t) => t && Number.isFinite(t.x) && Number.isFinite(t.y)) : [];
        const set = new Set(tiles.map((t) => key(t.x, t.y)));
        const list = playersRef.current, caster = list.find((p) => p.alive && p.pos && samePos(p.pos, e.at)) || null;
        const ally = (p) => !!caster && (p.id === caster.id || sameSide(p, caster) || (!!caster.teamId && p.teamId === caster.teamId));
        f.hitIds = list.filter((p) => p.alive && p.pos && !ally(p) && (!caster || dimOf(p) === dimOf(caster)) && Rules.footprint(p.pos.x, p.pos.y, sizeOfP(p)).some((t) => set.has(key(t.x, t.y)))).map((p) => p.id);
        f.hitDelay = GRAY_BEAM.hit;
        playSfx("gray_beam");
        if (tiles.length) {
          const xs = tiles.map((t) => t.x), ys = tiles.map((t) => t.y);
          look({ x: Math.round((Math.min(...xs) + Math.max(...xs)) / 2), y: Math.round((Math.min(...ys) + Math.max(...ys)) / 2) });
        } else look(e.at);
        if (!lowQ) {
          timers.current.push(setTimeout(() => setShake((n) => n + 1), GRAY_BEAM.hit));
          timers.current.push(setTimeout(() => pushFx([{ kind: "iceShake", x: 0, y: 0, amp: 9, dur: 1100 }]), GRAY_BEAM.hit));
          timers.current.push(setTimeout(() => setShake((n) => n + 1), GRAY_BEAM.hit + 650));
        }
      } else look(e.kind === "reap" && e.from ? e.from : e.at);
      pushFx([f]);
    };
    socket.on("grayFx", onGray);
    return () => socket.off("grayFx", onGray);
  }, [pushFx, look, lowQ]);

  // เฟิร์น: socket "fernFx" { kind: cast | boost | conceal | unveil | shield | empower | reset, at, id } → fernFx.js
  //  เสียงมาจาก server (engine.sfx ส่งพร้อมเหตุการณ์ — characters/fern.js) · conceal = เห็นเฉพาะเจ้าของ (กล้องไม่ตาม)
  useEffect(() => {
    const onFern = (e) => {
      const kind = e && FERN_EVENT_FX[e.kind];
      if (!kind || !e.at || !Number.isFinite(e.at.x) || !Number.isFinite(e.at.y)) return;
      const p = e.id != null ? playersRef.current.find((q) => q.id === e.id) : null;
      if (e.kind !== "conceal") look(e.at);
      pushFx([{ ...e, kind, x: e.at.x, y: e.at.y, size: p ? sizeOfP(p) : 1 }]);
    };
    socket.on("fernFx", onFern);
    return () => socket.off("fernFx", onFern);
  }, [pushFx, look]);

  // ท่าไม้ตายไรโด ฮิคารุ: { id, kind: "cross" | "ray", from, size, dir, len, width, tiles } — ชาร์จที่หน้าตัว → ลำแสงวิ่งถึงปลาย (= ดาเมจลง)
  //  กล้องตามกลางแนว · จอสั่นตอนลำแสงปล่อย/ถึงปลาย · hikaruPush { moves: [{ id, from, to }] } = คนที่ถูกผลัก (เลื่อนตามเมื่อ state มาถึง)
  useEffect(() => {
    const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const onBeam = (b) => {
      const v = b && DIRS[b.dir];
      if (!v || !b.from || !Number.isFinite(b.from.x) || !Number.isFinite(b.from.y)) return;
      const n = Math.max(1, b.size | 0), len = Number(b.len) || 5;
      pushFx([{ kind: b.kind === "ray" ? "hkStriumRay" : "hkCross", id: b.id, x: b.from.x, y: b.from.y, size: n, dir: b.dir, len, width: Number(b.width) || 1, tiles: Array.isArray(b.tiles) ? b.tiles : [] }]);
      const bd = boardRef.current || {}, c = (n - 1) / 2, reach = n / 2 + len / 2;
      const cl = (q, hi) => Math.max(0, Math.min(Math.max(0, (hi || 1) - 1), q));
      look({ x: cl(Math.round(b.from.x + c + v[0] * reach), bd.cols), y: cl(Math.round(b.from.y + c + v[1] * reach), bd.rows) });
      playSfx(b.kind === "ray" ? "hk_ray" : "hk_cross"); // ช่วงดังสุดของไฟล์ ≈ จังหวะลำแสงปล่อย (HK_BEAM.charge)
      if (!lowQ) {
        timers.current.push(setTimeout(() => setShake((k) => k + 1), HK_BEAM.charge));
        timers.current.push(setTimeout(() => setShake((k) => k + 1), HK_BEAM.reach));
      }
    };
    const onPush = (m) => {
      for (const mv of (m && Array.isArray(m.moves) ? m.moves : [])) {
        if (mv && mv.id != null && mv.to && Number.isFinite(mv.to.x) && Number.isFinite(mv.to.y)) hkPushTo.current[mv.id] = mv;
      }
    };
    socket.on("hikaruBeam", onBeam);
    socket.on("hikaruPush", onPush);
    return () => { socket.off("hikaruBeam", onBeam); socket.off("hikaruPush", onPush); };
  }, [pushFx, look, lowQ]);

  // ขยายร่าง (Echo): { id, from, to, at, prev, pushed, smashed } — 1 → 2 = ทะลุออกจากกรอบหกเหลี่ยม · ขั้นต่อไป = แรงกระแทกรอบตัว
  //  ของที่พังตอนขยาย = ของแตก · กล้องตามตัว · จอสั่น
  useEffect(() => {
    const onGrow = (g) => {
      if (!g || !g.at || !Number.isFinite(g.at.x) || !Number.isFinite(g.at.y)) return;
      const p = (prevPlayers.current || {})[g.id];
      pushFx([{ kind: "grow", id: g.id, x: g.at.x, y: g.at.y, from: g.from | 0, to: g.to | 0, color: p && p.color }]);
      if (g.smashed && g.smashed.length) pushFx([{ kind: "smash", tiles: g.smashed }]);
      look({ x: g.at.x + ((g.to | 0) - 1) / 2, y: g.at.y + ((g.to | 0) - 1) / 2 });
      if (!lowQ && g.to > g.from) timers.current.push(setTimeout(() => setShake((n) => n + 1), g.from <= 1 ? 520 : 260));
      playSfx(g.to > g.from ? "attack" : "notificate");
    };
    const onSmash = (m) => {
      if (!m || !Array.isArray(m.tiles) || !m.tiles.length) return;
      pushFx([{ kind: "smash", tiles: m.tiles }]);
      if (!lowQ) setShake((n) => n + 1);
    };
    socket.on("growFx", onGrow);
    socket.on("smashFx", onSmash);
    return () => { socket.off("growFx", onGrow); socket.off("smashFx", onSmash); };
  }, [pushFx, look, lowQ]);

  // ฟ้าผ่า (ห่วงเวลาซีโร่ เฟส 4 · ต้นเทิร์น): { tiles: [{x,y}×3], hits } · กล้องตามสายแรก · จอสั่น
  useEffect(() => {
    const onBolt = (b) => {
      const tiles = b && Array.isArray(b.tiles) ? b.tiles.filter((t) => t && Number.isFinite(t.x) && Number.isFinite(t.y)) : [];
      if (!tiles.length) return;
      pushFx([{ kind: "zeroBolt", tiles }]);
      playSfx("zero_thunder");
      look(tiles[0]);
      if (!lowQ) setShake((n) => n + 1);
    };
    socket.on("zeroBolt", onBolt);
    return () => socket.off("zeroBolt", onBolt);
  }, [pushFx, look, lowQ]);

  // ---------- Ice Spike: เหตุการณ์บนกระดาน (socket "iceFx" { seq, events } — .claude/plans/ice-spike-contract.md §4) ----------
  //  เล่นตามลำดับ: เหตุการณ์ที่ขยับตัว (walk/slide/knock) = คิวแอนิเมชัน (ต่อเหตุการณ์ถัดไปเมื่อแอนิเมชันนั้นจบ — anim.then)
  //  เหตุการณ์อื่น = เกิดทันทีแล้วรอสั้นๆ (ค้างภาพตอนชนเต็ม/ฉากคุก) · จบทั้งชุด = ปล่อยภาพที่ค้างไว้ให้ตรง state ผลสุดท้าย
  const byIdRef = useRef(byId);
  useLayoutEffect(() => { byIdRef.current = byId; });
  const finishIce = (run) => {
    if (!run || run.done) return;
    run.done = true; run.active = false;
    clearTimeout(run.safety);
    if (iceRun.current !== run) return;
    setIceHold({}); setIceLv(null); setIceMask(null); setIceGhosts({});
  };
  const startIce = (events) => {
    if (iceRun.current && !iceRun.current.done) finishIce(iceRun.current);
    const bd = boardRef.current || {}, pl = prevPlayers.current || {};
    const run = { ids: new Set(), active: true, gotState: false, done: false, pos: {}, snap: {}, snd: {}, lv: {} };
    iceRun.current = run;
    const ok = (t) => !!t && Number.isFinite(t.x) && Number.isFinite(t.y);
    const pts = (list) => (Array.isArray(list) ? list.filter(ok).map((t) => ({ x: t.x, y: t.y })) : []);
    const lvMap = {}, mask = {}, hold = {}, ghosts = {};
    const noteLv = (x, y) => { const k = key(x, y); if (!(k in lvMap)) lvMap[k] = boardSpikeLv(bd, k); };
    const noteIce = (t) => { if (!ok(t)) return; const k = key(t.x, t.y), was = (bd.special || {})[k] || null; if (was !== "ice" && !(k in mask)) mask[k] = was; };
    for (const ev of events) {
      if (!ev || typeof ev !== "object") continue;
      for (const id of [ev.id, ev.by]) {
        const p = id != null ? pl[id] : null;
        if (!p || run.ids.has(id)) continue;
        run.ids.add(id);
        if (p.alive && p.pos) { run.pos[id] = { x: p.pos.x, y: p.pos.y }; hold[id] = run.pos[id]; run.snap[id] = p; ghosts[id] = p; }
      }
      if ((ev.kind === "spike" || ev.kind === "spikeUp" || ev.kind === "spikeDown" || ev.kind === "trample") && ok(ev)) noteLv(ev.x, ev.y);
      if (ev.kind === "lay") for (const t of pts(ev.tiles)) noteIce(t);
      // พื้นเปียก (เอมิลิโกะ): ช่องเปียกใหม่ซ่อนไว้จนน้ำกระเซ็นถึง · ช่องที่ถูแห้งยังเปียกจนไม้ถูผ่าน
      if (ev.kind === "wet" || ev.kind === "dry") for (const t of pts(ev.tiles)) {
        const k = key(t.x, t.y), was = (bd.special || {})[k] || null;
        if (!(k in mask) && (ev.kind === "wet" ? was !== "wet" : was === "wet")) mask[k] = ev.kind === "wet" ? was : "wet";
      }
    }
    Object.assign(run.lv, lvMap);
    setIceHold(hold);
    setIceLv(Object.keys(lvMap).length ? lvMap : null);
    setIceMask(Object.keys(mask).length ? mask : null);
    setIceGhosts(ghosts);
    run.safety = setTimeout(() => finishIce(run), 30000); // กันค้าง (แอนิเมชันไม่จบ ฯลฯ)
    const live = () => !run.done && iceRun.current === run;
    // เสียงซ้ำในเวลาใกล้กัน (ติดเชื่องช้าหลายคนพร้อมกัน) = ดังครั้งเดียว
    const sfx = (name) => { const t = performance.now(); if (run.snd[name] && t - run.snd[name] < 110) return; run.snd[name] = t; playSfx(name); };
    const pick2 = (a, b) => (Math.random() < 0.5 ? a : b);
    const setLv = (x, y, lv) => { const k = key(x, y); run.lv[k] = lv; setIceLv((m) => ({ ...(m || {}), [k]: lv })); };
    const reveal = (list) => {
      const ks = list.filter(ok).map((t) => key(t.x, t.y));
      setIceMask((m) => { if (!m) return m; const n = { ...m }; for (const k of ks) delete n[k]; return Object.keys(n).length ? n : null; });
    };
    const shake = (amp) => { if (!lowQ) pushFx([{ kind: "iceShake", x: 0, y: 0, amp }]); };
    const posOf = (id) => run.pos[id] || (byIdRef.current[id] && byIdRef.current[id].pos) || null;
    const die = (id, at) => {
      const t = run.snap[id];
      if (!t || !at) return;
      pushFx([
        { kind: "float", x: at.x, y: at.y - 0.6, text: "ตกรอบ", color: "#ff8f8f", size: 24, z: lowQ ? 2.4 : 1.5 },
        { kind: "deathBoom", x: at.x, y: at.y, size: sizeOfP(t), img: t.img, color: t.color, name: t.name },
      ]);
      playSfx("death_boom");
      if (!lowQ) setShake((n) => n + 1);
      setIceGhosts((g) => { if (!g[id]) return g; const n = { ...g }; delete n[id]; return n; });
    };
    const float = (at, text, color, dy = 0, size = 28) => { if (at) pushFx([{ kind: "float", x: at.x, y: at.y + dy, text, ...(color ? { color } : {}), size, z: lowQ ? 2.4 : 1.5 }]); };
    let step = () => {};
    const enqueue = (a, end) => {
      setAnimQ((q) => [...q, { ...a, seq: ++fxSeq.current, iceRun: run, iceHoldEnd: end, then: () => { run.pos[a.id] = end; step(); } }]);
      return "anim";
    };
    const face = (id, a, b) => { if (a && b && (a.x !== b.x || a.y !== b.y)) setFaces((f) => ({ ...f, [id]: { x: Math.sign(b.x - a.x), y: Math.sign(b.y - a.y) } })); };
    // คืนค่า: "anim" = รอแอนิเมชันจบ · ตัวเลข = รอกี่ ms ก่อนเหตุการณ์ถัดไป
    const fire = (ev) => {
      if (!ev || typeof ev !== "object") return 0;
      const id = ev.id;
      switch (ev.kind) {
        case "walk": {
          const path = pts(ev.path);
          if (path.length < 2 || !run.pos[id]) { if (path.length) run.pos[id] = path[path.length - 1]; return 0; }
          const mover = byIdRef.current[id], hop = mover && mover.character && BIG_ART[mover.character.id] ? sizeOfP(mover) : 0;
          const end = path[path.length - 1];
          face(id, path[path.length - 2], end);
          look(end);
          return enqueue({ kind: "move", id, path, hop }, end);
        }
        case "slide": {
          let path = pts(ev.path);
          const cur = run.pos[id];
          if (cur && path.length && !samePos(cur, path[0])) path = [cur, ...path];
          if (path.length < 2 || !cur) { if (path.length) run.pos[id] = path[path.length - 1]; return 0; }
          const end = path[path.length - 1], dur = iceTrailDur(path, ICE_T.slideStep);
          // ฉาก shadowFx ย้ายตัวนี้อยู่แล้ว (แส้เขม่าพุ่ง) = ไม่ไถลซ้ำ
          if (isShadowBusy(id)) { run.pos[id] = end; setIceHold((h) => ({ ...h, [id]: end })); return 0; }
          // ไถลบนพื้นเปียก / เอมิลิโกะถือไม้ถูพื้น = ทางน้ำ (เสียงไม้ถูพื้น server เล่นเอง)
          const spOf = (b, t) => ((b && b.special) || {})[key(t.x, t.y)];
          const mopper = byIdRef.current[id] && byIdRef.current[id].shadow && byIdRef.current[id].shadow.weapon === "mop";
          const water = path.some((t) => spOf(bd, t) === "wet" || spOf(boardRef.current, t) === "wet") || (mopper && !path.some((t) => spOf(bd, t) === "ice"));
          pushFx([{ kind: water ? "keWetTrail" : "iceTrail", path, step: ICE_T.slideStep, dur, len: dur }]);
          if (!water) sfx(pick2("is_slide_1", "is_slide_2"));
          else if (!mopper) sfx("ke_slide");
          face(id, path[path.length - 2], end);
          look(end);
          return enqueue({ kind: "move", id, path, stepMs: ICE_T.slideStep }, end);
        }
        case "knock": {
          if (!ok(ev.from) || !ok(ev.to) || !run.pos[id]) return 0;
          const from = { x: ev.from.x, y: ev.from.y }, to = { x: ev.to.x, y: ev.to.y };
          return enqueue({ kind: "push", id, from, to, collide: !!ev.collide }, ev.collide ? from : to);
        }
        case "hit": {
          const at = ok(ev) ? { x: ev.x, y: ev.y } : posOf(id);
          if (!at) return 0;
          const dmg = Math.max(0, ev.dmg | 0);
          const mop = ev.style === "mop"; // ไม้ถูพื้นไถลชน (เอมิลิโกะ)
          pushFx([{ kind: mop ? "keMopHit" : "iceHit", x: at.x, y: at.y, dmg, max: !!ev.max, hitIds: id != null ? [id] : [] }]);
          if (dmg > 0) float(at, `-${dmg}`, ev.max ? "#d8f2ff" : undefined, 0, ev.max ? 40 : 30);
          sfx(mop ? "ke_hit_mop" : ev.max ? "is_hit_max" : pick2("is_hit", "is_hit_alt"));
          shake(2.5 + dmg * 1.8 + (ev.max ? 4 : 0));
          if (ev.max && !lowQ) setShake((n) => n + 1);
          look(at);
          if (ev.kill) die(id, at);
          return ev.max ? ICE_T.hitStop : 90;
        }
        case "bump": {
          const at = ok(ev) ? { x: ev.x, y: ev.y } : posOf(id);
          if (!at) return 0;
          pushFx([{ kind: "iceBump", x: at.x, y: at.y, hitIds: id != null ? [id] : [] }]);
          sfx("is_bump");
          shake(2);
          return 60;
        }
        // Mouse Separade (โซระ): ตัวใหญ่ถูกผลักไปติดของ — x, y = มุมบนซ้ายของตัว
        case "crash": {
          const at = ok(ev) ? { x: ev.x, y: ev.y } : posOf(id);
          if (!at) return 0;
          const n = run.snap[id] ? sizeOfP(run.snap[id]) : 1, mid = { x: at.x + (n - 1) / 2, y: at.y + (n - 1) / 2 };
          pushFx([{ kind: "iceBump", x: mid.x, y: mid.y, hitIds: id != null ? [id] : [] }]);
          if (ev.dmg > 0) float(mid, `-${ev.dmg}`, "#ffc56b", 0, 30);
          sfx("is_bump");
          shake(4);
          look(mid);
          if (ev.kill) die(id, at);
          return 120;
        }
        case "spike": {
          if (!ok(ev)) return 0;
          const who = ev.by != null ? ev.by : id, at = posOf(who), lvTo = Math.max(0, ev.lvTo | 0);
          setLv(ev.x, ev.y, lvTo);
          pushFx([{ kind: "iceSpikeBreak", x: ev.x, y: ev.y, lv: lvTo, hitIds: who != null ? [who] : [] }]);
          sfx("is_skill_2_broke");
          if (ev.own) { float(at, `+${ev.energy || 2}`, ENERGY_C); sfx("is_spike_self"); }
          else if (ev.dmg > 0) float(at, `-${ev.dmg}`);
          shake(3);
          if (ev.kill) die(who, at);
          return 80;
        }
        // ตัวใหญ่เดินเหยียบหนาม: หนามแตกทันที · ดาเมจขึ้นที่ช่องหนาม (x, y)
        case "trample": {
          if (!ok(ev)) return 0;
          const at = { x: ev.x, y: ev.y };
          setLv(ev.x, ev.y, 0);
          pushFx([{ kind: "iceSpikeBreak", x: ev.x, y: ev.y, lv: 0, hitIds: ev.by != null ? [ev.by] : [] }]);
          sfx("is_skill_2_broke");
          if (ev.dmg > 0) float(at, `-${ev.dmg}`);
          shake(2 + Math.max(0, ev.dmg | 0) * 1.5);
          if (ev.kill) die(ev.by, posOf(ev.by));
          return 80;
        }
        case "slow": {
          const at = posOf(id);
          if (at) pushFx([{ kind: "iceSlow", x: at.x, y: at.y }]);
          sfx("is_slow");
          return 0;
        }
        case "regen": {
          const at = posOf(id);
          if (!at) return 0;
          pushFx([{ kind: "iceRegen", x: at.x, y: at.y }]);
          if (ev.hp > 0) float(at, `+${ev.hp}`, "#8ff0b0");
          if (ev.sp > 0) float(at, `+${ev.sp}`, ENERGY_C, -0.55, 24);
          sfx("is_regen");
          return 0;
        }
        case "spikeUp": {
          if (!ok(ev)) return 0;
          const lv = Math.max(1, ev.lv | 0);
          setLv(ev.x, ev.y, lv);
          pushFx([{ kind: "iceSpikeUp", x: ev.x, y: ev.y, lv, from: ev.from | 0 }]);
          sfx("is_skill_2");
          look(ev);
          return 140;
        }
        case "spikeDown": {
          if (!ok(ev)) return 0;
          const lv = Math.max(0, ev.lv | 0);
          setLv(ev.x, ev.y, lv);
          pushFx([{ kind: "iceSpikeBreak", x: ev.x, y: ev.y, lv }]);
          sfx("is_skill_2_broke");
          return 0;
        }
        // เอมิลิโกะ: น้ำกระเซ็นเป็นพื้นเปียก / ไม้ถูพื้นเช็ดแห้ง (เสียงน้ำ server เล่นเอง)
        case "wet":
        case "dry": {
          const tiles = pts(ev.tiles);
          if (!tiles.length) return 0;
          reveal(tiles);
          pushFx(ev.kind === "wet" ? wetTileFx(tiles) : dryTileFx(tiles));
          return 0;
        }
        case "lay": {
          const tiles = pts(ev.tiles);
          if (!tiles.length) return 0;
          reveal(tiles);
          pushFx(tiles.map((t, i) => { const delay = Math.min(i * ICE_T.layStep, 600); return { kind: "iceLay", x: t.x, y: t.y, delay, dur: 560 + delay }; }));
          const n = Math.min(4, tiles.length), gap = n > 1 ? Math.min(600, (tiles.length - 1) * ICE_T.layStep) / (n - 1) : 0;
          for (let k = 0; k < n; k++) later(Math.round(k * Math.max(110, gap)), () => { if (live()) playSfx(pick2("is_gp_1", "is_gp_2")); });
          return 0;
        }
        case "burst": {
          const at = ok(ev) ? { x: ev.x, y: ev.y } : posOf(id);
          if (!at) return 0;
          pushFx([{ kind: "iceBurst", x: at.x, y: at.y }]);
          sfx("is_burst");
          shake(6);
          look(at);
          return 180;
        }
        case "surge": {
          // ท่าไม้ตาย Ice Surge: คลื่นน้ำแข็งแผ่ทั้งสนามจากตัว · หนามที่ขึ้น Lv ตามมาเป็น spikeUp
          const at = ok(ev) ? { x: ev.x, y: ev.y } : posOf(id);
          if (!at) return 0;
          look(at);
          playSfx("is_ult");
          pushFx([{ kind: "iceSurge", x: at.x, y: at.y }]);
          shake(7);
          return ICE_T.surge;
        }
        default:
          return 0;
      }
    };
    let i = 0;
    step = () => {
      if (!live()) return;
      while (i < events.length) {
        const w = fire(events[i++]);
        if (w === "anim") return;
        if (w > 0) { later(w, step); return; }
      }
      finishIce(run);
    };
    step();
  };
  const startIceRef = useRef(startIce);
  useLayoutEffect(() => { startIceRef.current = startIce; finishIceRef.current = finishIce; });
  useEffect(() => {
    const onIce = (m) => {
      if (!m || !Array.isArray(m.events) || !m.events.length) return;
      if (m.seq != null && m.seq === iceSeen.current) return;
      iceSeen.current = m.seq;
      startIceRef.current(m.events);
    };
    socket.on("iceFx", onIce);
    return () => socket.off("iceFx", onIce);
  }, []);

  // ---------- เคท & เอมิลิโกะ: socket "shadowFx" (สัญญา .claude/plans/kate-emiliko-contract.md · ตัววาด shadowFx.js) ----------
  //  "storm" (ฉากท่าไม้ตายเคท) อยู่ที่อื่น — shadowEventFx ข้ามให้เอง
  useEffect(() => {
    const posOf = (id) => { const p = byIdRef.current[id] || (prevPlayers.current || {})[id]; return p && p.pos ? p.pos : null; };
    const idsOn = (tiles, owner) => {
      const ks = new Set(tiles.map((t) => key(t.x, t.y))), me0 = byIdRef.current[owner];
      return Object.values(byIdRef.current).filter((p) => p && p.alive && p.pos && p.id !== owner && p.duoOf !== owner && p.duoWith !== owner
        && !(me0 && (me0.duoOf === p.id || me0.duoWith === p.id))
        && Rules.footprint(p.pos.x, p.pos.y, sizeOfP(p)).some((t) => ks.has(key(t.x, t.y)))).map((p) => p.id);
    };
    const onShadow = (ev) => {
      const out = shadowEventFx(ev, { posOf, idsOn });
      if (!out.fx.length) return;
      const t0 = performance.now();
      for (const b of out.busy) shadowBusy.current[b.id] = Math.max(shadowBusy.current[b.id] || 0, t0 + b.ms);
      pushFx(out.fx);
      const at = (ms, fn) => (ms > 0 ? timers.current.push(setTimeout(fn, ms)) : fn());
      for (const [name, ms] of out.sfx) at(ms, () => playSfx(name));
      for (const [pos, ms] of out.look) at(ms, () => look(pos));
      if (!lowQ) for (const ms of out.shake) at(ms, () => setShake((n) => n + 1));
      for (const [ms, list] of out.later) at(ms, () => pushFx(list.map((f) => (f.kind === "float" ? { ...f, z: lowQ ? 2.4 : 1.5 } : f))));
    };
    socket.on("shadowFx", onShadow);
    return () => socket.off("shadowFx", onShadow);
  }, [pushFx, look, lowQ]);

  // ไจโร: socket "gyroFx" { kind: throw | recall | secret | golden | breaker | horse | goldenTick, id, color, ... } → gyroFx.js
  //  หมากที่ฉากย้ายเอง (ถูกดึง/กระเด็น/ดันออกข้าง) จดไว้ใน shadowBusy (ไม่เลื่อน/ไถลซ้ำตอน state มาถึง) · เสียงมาจาก server
  useEffect(() => {
    const posOf = (id) => { const p = byIdRef.current[id] || (prevPlayers.current || {})[id]; return p && p.pos ? p.pos : null; };
    const sizeOf = (id) => sizeOfP(byIdRef.current[id]);
    const idAt = (t) => { const p = Object.values(byIdRef.current).find((q) => q && q.alive && q.pos && Rules.covers(boxOfP(q), t.x, t.y)); return p ? p.id : null; };
    const terrainAt = (x, y) => { const b = boardRef.current; return b && b.terrain ? b.terrain[key(x, y)] || null : null; };
    const onGyro = (ev) => {
      const out = gyroEventFx(ev, { posOf, sizeOf, idAt, terrainAt });
      if (!out.fx.length) return;
      const t0 = performance.now();
      for (const b of out.busy) shadowBusy.current[b.id] = Math.max(shadowBusy.current[b.id] || 0, t0 + b.ms);
      pushFx(out.fx);
      const at = (ms, fn) => (ms > 0 ? timers.current.push(setTimeout(fn, ms)) : fn());
      for (const [pos, ms] of out.look) at(ms, () => look(pos));
      if (!lowQ) for (const ms of out.shake) at(ms, () => setShake((n) => n + 1));
      for (const [ms, list] of out.later) at(ms, () => pushFx(lowQ ? list.filter((f) => f.kind !== "iceShake") : list));
    };
    socket.on("gyroFx", onGyro);
    return () => socket.off("gyroFx", onGyro);
  }, [pushFx, look, lowQ]);

  // ดิเอโก้ แบรนโด (โลกคู่ขนาน): socket "diegoFx" { kind, id, color, frozen?, ... } → diegoFx.js (GRID_PLAN §7.12)
  //  หมากที่ฉากย้ายเอง (ตาข่ายดึง · ควบกลอุบาย · กระเด็น) จดไว้ใน shadowBusy · เลขดาเมจรอขึ้นตอนของถึงตัว (diegoDefer)
  //  ตกรอบตอนเวลาเดินต่อ = วาดร่างค้าง (diegoGhosts) จนของที่ค้างกลางอากาศพุ่งถึง · เสียงมาจาก server
  useEffect(() => {
    const posOf = (id) => { const p = byIdRef.current[id] || (prevPlayers.current || {})[id]; return p && p.pos ? p.pos : null; };
    const sizeOf = (id) => sizeOfP(byIdRef.current[id]);
    const idAt = (t) => { const p = Object.values(byIdRef.current).find((q) => q && q.alive && q.pos && Rules.covers(boxOfP(q), t.x, t.y)); return p ? p.id : null; };
    const onDiego = (ev) => {
      const out = diegoEventFx(ev, { posOf, sizeOf, idAt });
      if (!out.fx.length) return;
      const t0 = performance.now();
      for (const b of out.busy) shadowBusy.current[b.id] = Math.max(shadowBusy.current[b.id] || 0, t0 + b.ms);
      for (const d of out.defer) diegoDefer.current[d.id] = Math.max(diegoDefer.current[d.id] || 0, t0 + d.ms);
      if (out.ghosts.length) {
        const add = {};
        for (const gh of out.ghosts) { const p = byIdRef.current[gh.id]; if (p && p.pos) add[gh.id] = { ...p }; }
        setDiegoGhosts((g) => ({ ...g, ...add }));
        // กันค้าง: ไม่มีใครตกรอบจริง (state ไม่เปลี่ยน) = เอาร่างออกเมื่อเลยจังหวะ
        for (const gh of out.ghosts) timers.current.push(setTimeout(() => setDiegoGhosts((g) => { if (!g[gh.id]) return g; const n = { ...g }; delete n[gh.id]; return n; }), gh.ms + 1500));
      }
      pushFx(out.fx);
      const at = (ms, fn) => (ms > 0 ? timers.current.push(setTimeout(fn, ms)) : fn());
      for (const [pos, ms] of out.look) at(ms, () => look(pos));
      if (!lowQ) for (const ms of out.shake) at(ms, () => setShake((n) => n + 1));
      for (const [ms, list] of out.later) at(ms, () => pushFx(lowQ ? list.filter((f) => f.kind !== "iceShake") : list));
    };
    socket.on("diegoFx", onDiego);
    return () => socket.off("diegoFx", onDiego);
  }, [pushFx, look, lowQ]);

  // นักบินปริศนา / บานาจ ลิงซ์ (GRID_PLAN §7.5.1): socket "sliverFx" { kind, id, ... } — แสงแตก/จอสั่นตามเหตุการณ์ (ตำแหน่งใหม่มากับ state)
  useEffect(() => {
    const onSliver = (ev) => {
      if (!ev || !ev.kind) return;
      const burstAt = (t, size = 1, color = ev.color) => t && { kind: "burst", x: t.x + (size - 1) / 2, y: t.y + (size - 1) / 2, color };
      if (ev.kind === "boxDrop" && ev.at) {
        look(ev.at);
        pushFx([burstAt(ev.at, ev.size || 2, "#ffd36a"), { kind: "slash", x: ev.at.x + 0.5, y: ev.at.y + 0.5, color: ev.color || "#ffffff" }].filter(Boolean));
        if (!lowQ) setShake((n) => n + 1);
      } else if (ev.kind === "boxWear" && ev.at) {
        pushFx([burstAt(ev.at, 2, "#ffffff")]);
      } else if (ev.kind === "funnels") {
        pushFx((ev.spawns || []).map((s) => burstAt(s.at, 1, "#7dffb0")).filter(Boolean));
      } else if (ev.kind === "funnelFade" || ev.kind === "funnelBreak") {
        pushFx([...(ev.at && !Array.isArray(ev.at) ? [ev.at] : ev.at || [])].map((t) => burstAt(t, 1, "#ffffff")).filter(Boolean));
      } else if (ev.kind === "guard" && ev.at) {
        pushFx([burstAt(ev.at, 1, "#7dffb0"), ...(ev.ids || []).map((id) => { const p = byIdRef.current[id]; return p && p.pos ? { kind: "slash", x: p.pos.x, y: p.pos.y, color: "#7dffb0" } : null; }).filter(Boolean)]);
      } else if ((ev.kind === "absorb" || ev.kind === "absorbHit" || ev.kind === "ntd") && ev.at) {
        pushFx([burstAt(ev.at, 1, ev.kind === "ntd" ? "#ff3b4e" : "#8fd8ff")]);
      }
    };
    socket.on("sliverFx", onSliver);
    return () => socket.off("sliverFx", onSliver);
  }, [pushFx, look, lowQ]);

  // ฟันนี่ วาเลนไทน์ (D4C): socket "valentineFx" { kind, id, ... } → valentineFx.js (GRID_PLAN §7.13)
  //  ตัวที่ฉากย้ายเอง (ตัวเหมือนวิ่ง · ตัวที่กำลังพัง) จดไว้ใน shadowBusy · เลขดาเมจรอขึ้นตอนกระสุน/เมนเจอร์ถึงตัว (diegoDefer — ใช้ร่วม)
  //  lookOf = หน้าตาตอนเกิดเหตุการณ์ (ฉากวาดภาพที่จับไว้ของตัวที่ state เอาออก/ซ่อนแล้ว) · เสียงมาจาก server
  useEffect(() => {
    const recOf = (id) => byIdRef.current[id] || (prevPlayers.current || {})[id] || null;
    const posOf = (id) => { const p = recOf(id); return p && p.pos ? p.pos : null; };
    const sizeOf = (id) => sizeOfP(recOf(id));
    const lookOf = (id) => {
      const p = recOf(id);
      return p ? { img: p.img, color: p.color, name: p.name, hp: p.hp, maxHp: p.maxHp, armor: p.armor, maxArmor: p.maxArmor, size: sizeOfP(p), summon: p.summon || null } : null;
    };
    //  ev.delay (ms) = ฉากนี้เริ่มทีหลัง (ตัวเหมือนเดินถึงก่อนค่อยชน · หลายตัวต่อกัน) — จับหน้าตา/ตำแหน่งตอนเหตุการณ์มาถึง (state ตามมาทันที)
    const onVal = (ev) => {
      const out = valentineEventFx(ev, { posOf, sizeOf, lookOf });
      if (!out.fx.length) return;
      const delay = Math.max(0, Number(ev && ev.delay) || 0);
      const t0 = performance.now() + delay;
      for (const b of out.busy) shadowBusy.current[b.id] = Math.max(shadowBusy.current[b.id] || 0, t0 + b.ms);
      for (const d of out.defer) diegoDefer.current[d.id] = Math.max(diegoDefer.current[d.id] || 0, t0 + d.ms);
      const at = (ms, fn) => (ms > 0 ? timers.current.push(setTimeout(fn, ms)) : fn());
      at(delay, () => pushFx(out.fx));
      for (const [pos, ms] of out.look) at(delay + ms, () => look(pos));
      if (!lowQ) for (const ms of out.shake) at(delay + ms, () => setShake((n) => n + 1));
      for (const [ms, list] of out.later) at(delay + ms, () => pushFx(list.map((f) => (f.kind === "float" ? { ...f, z: lowQ ? 2.4 : 1.5 } : f))));
    };
    socket.on("valentineFx", onVal);
    return () => socket.off("valentineFx", onVal);
  }, [pushFx, look, lowQ]);

  // องค์หญิงดอกไม้ เซลิน: socket "celineFx" { kind, id, color, ... } → celineFx.js (GRID_PLAN §7.15 · contract §5) · เสียงมาจาก server (ผลติดหลังตี = ev.sound เล่นที่นี่)
  //  swap = คนที่ถูกสลับบินโค้งตามฉาก (celinePose) — จดไว้ใน shadowBusy (ไม่เลื่อนซ้ำตอน state มาถึง)
  //  wallBreak จากการตี = รอ state ของฉากตี (ฉากตีวาดแตกเองตอนปะทะ — wallClaim) · ผลติดหลังตีปกติ = รอถึงจังหวะปะทะ (celineHitAt)
  useEffect(() => {
    const recOf = (id) => byIdRef.current[id] || (prevPlayers.current || {})[id] || null;
    const posOf = (id) => { const p = recOf(id); return p && p.pos ? p.pos : null; };
    const sizeOf = (id) => sizeOfP(recOf(id));
    const at = (ms, fn) => (ms > 0 ? timers.current.push(setTimeout(fn, ms)) : fn());
    const run = (ev) => {
      const out = celineEventFx(ev, { posOf, sizeOf });
      if (typeof ev.sound === "string") playSfx(ev.sound); // ผลติดหลังตีปกติ: เสียงมากับ payload (ดังพร้อมภาพตอนปะทะ)
      if (!out.fx.length) return;
      const t0 = performance.now();
      for (const b of out.busy) shadowBusy.current[b.id] = Math.max(shadowBusy.current[b.id] || 0, t0 + b.ms);
      pushFx(out.fx);
      for (const [pos, ms] of out.look) at(ms, () => look(pos));
      if (!lowQ) for (const ms of out.shake) at(ms, () => setShake((n) => n + 1));
      for (const [ms, list] of out.later) at(ms, () => pushFx(list.map((f) => (f.kind === "float" ? { ...f, z: lowQ ? 2.4 : 1.5 } : f))));
    };
    const ON_HIT = { burn: 1, shock: 1, gust: 1, collide: 1 };
    const onCeline = (ev) => {
      if (!ev || typeof ev !== "object") return;
      if (ev.kind === "wallBreak" && ev.why !== "expire") {
        at(140, () => {
          const now = performance.now();
          const tiles = (Array.isArray(ev.tiles) ? ev.tiles : []).filter((t) => t && !((wallClaim.current[key(t.x, t.y)] || 0) > now));
          if (tiles.length) run({ ...ev, tiles });
        });
        return;
      }
      if (ON_HIT[ev.kind]) {
        at(120, () => { const wait = celineHitAt.current - performance.now(); if (wait > 0) at(wait + 60, () => run(ev)); else run(ev); });
        return;
      }
      run(ev);
    };
    socket.on("celineFx", onCeline);
    return () => socket.off("celineFx", onCeline);
  }, [pushFx, look, lowQ]);

  // ซึนาชิ ทาคุโตะ: socket "takutoFx" { kind, id, color, at, size, ... } → takutoFx.js (GRID_PLAN §7.16 · contract §5) · เสียงมาจาก server
  //  dash / flash = ตัวที่ฉากย้ายเอง (takutoPose) จดไว้ใน shadowBusy (ไม่เลื่อนซ้ำตอน state มาถึง)
  //  flash / missile / blast: server พัก 1.6 / 1.8 / 2.0 วิก่อนดาเมจลง — คนที่โดนสั่น (hitIds) + จอสั่นตรงจังหวะปะทะในฉาก
  useEffect(() => {
    const recOf = (id) => byIdRef.current[id] || (prevPlayers.current || {})[id] || null;
    const posOf = (id) => { const p = recOf(id); return p && p.pos ? p.pos : null; };
    const sizeOf = (id) => sizeOfP(recOf(id));
    const idsOn = (tiles, owner) => {
      const ks = new Set(tiles.map((t) => key(t.x, t.y))), me0 = recOf(owner);
      return Object.values(byIdRef.current).filter((p) => p && p.alive && p.pos && p.id !== owner
        && !(me0 && (sameSide(p, me0) || (!!me0.teamId && p.teamId === me0.teamId)))
        && (!me0 || dimOf(p) === dimOf(me0))
        && Rules.footprint(p.pos.x, p.pos.y, sizeOfP(p)).some((t) => ks.has(key(t.x, t.y)))).map((p) => p.id);
    };
    const at = (ms, fn) => (ms > 0 ? timers.current.push(setTimeout(fn, ms)) : fn());
    const onTakuto = (ev) => {
      const out = takutoEventFx(ev, { posOf, sizeOf, idsOn });
      if (!out.fx.length) return;
      const t0 = performance.now();
      for (const b of out.busy) shadowBusy.current[b.id] = Math.max(shadowBusy.current[b.id] || 0, t0 + b.ms);
      pushFx(out.fx);
      for (const [pos, ms] of out.look) at(ms, () => look(pos));
      if (!lowQ) for (const ms of out.shake) at(ms, () => setShake((n) => n + 1));
      for (const [ms, list] of out.later) at(ms, () => pushFx(list.map((f) => (f.kind === "float" ? { ...f, z: lowQ ? 2.4 : 1.5 } : f))));
    };
    socket.on("takutoFx", onTakuto);
    return () => socket.off("takutoFx", onTakuto);
  }, [pushFx, look, lowQ]);

  // ผู้นำแห่งตระกูลเรียวกิ: socket "ryougiFx" { kind, id, color, at, size, ... } → ryougiFx.js (GRID_PLAN §7.17 · contract §3) · เสียงมาจาก server
  //  dash / crumble = ตัวที่ฉากย้ายเอง (ryougiPose) จดไว้ใน shadowBusy · kill / sever จากการตีปกติ = เริ่มตอนจังหวะปะทะของฉากตี (gate ← ryougiHitAt)
  //  kill = จับหน้าตาเป้าตอนเหตุการณ์มาถึง (state ตามมาเอาตัวออก) + กันระเบิดตกรอบ (ryougiSlain)
  useEffect(() => {
    const recOf = (id) => byIdRef.current[id] || (prevPlayers.current || {})[id] || null;
    const posOf = (id) => { const p = recOf(id); return p && p.pos ? p.pos : null; };
    const sizeOf = (id) => sizeOfP(recOf(id));
    const lookOf = (id) => { const p = recOf(id); return p ? { img: p.masked ? null : p.img, color: p.masked ? "#ffffff" : p.color, name: p.name } : null; };
    const foesOf = (owner) => {
      const me0 = recOf(owner);
      return Object.values(byIdRef.current).filter((p) => p && p.alive && p.pos && p.id !== owner
        && !(me0 && (sameSide(p, me0) || (!!me0.teamId && p.teamId === me0.teamId)))
        && (!me0 || dimOf(p) === dimOf(me0))).map((p) => p.id);
    };
    const at = (ms, fn) => (ms > 0 ? timers.current.push(setTimeout(fn, ms)) : fn());
    const onRyougi = (ev) => {
      const out = ryougiEventFx(ev, { posOf, sizeOf, lookOf, foesOf });
      // เสียงสังหาร/ตัดผลสกิลจากการตีปกติ (ev.sound / ev.line) — server ส่งตอนเริ่มฉากตี → เล่นตรงจังหวะปะทะของฉากตีเรียวกิ
      const sounds = [ev.sound, ev.line].filter(Boolean);
      if (sounds.length) at(125, () => at(Math.max(0, ryougiHitAt.current - performance.now()), () => { for (const s of sounds) playSfx(s); }));
      if (!out.fx.length) return;
      const t0 = performance.now();
      for (const id of out.slain) ryougiSlain.current[id] = t0 + 6000;
      for (const b of out.busy) shadowBusy.current[b.id] = Math.max(shadowBusy.current[b.id] || 0, t0 + b.ms);
      for (const g of out.gates) {
        if (g.mode !== "hit") { g.gate.at = t0; continue; }
        // state ของฉากตีตามมาหลัง socket นี้ — รอให้ฉากตีตั้งจังหวะปะทะก่อน (ไม่มีฉากตี = เริ่มทันที)
        at(120, () => { const n = performance.now(); g.gate.at = ryougiHitAt.current > n ? ryougiHitAt.current : n; });
      }
      pushFx(out.fx);
      for (const [pos, ms] of out.look) at(ms, () => look(pos));
      if (!lowQ) for (const ms of out.shake) at(ms, () => setShake((n) => n + 1));
      for (const [ms, list] of out.later) at(ms, () => pushFx(list));
    };
    socket.on("ryougiFx", onRyougi);
    return () => socket.off("ryougiFx", onRyougi);
  }, [pushFx, look, lowQ]);

  // เอมิยะ ชิโร่: socket "emiyaFx" { kind, id, color, at, size, ... } → emiyaFx.js (GRID_PLAN §7.18 · contract §3) · เสียงมาจาก server
  //  เลขดาเมจของสกิลมากับเหตุการณ์ (throwHit / caladbolgBlast / caladbolgSplash / excaliburHit) — ตรงจังหวะที่ server ลงผล
  useEffect(() => {
    const recOf = (id) => byIdRef.current[id] || (prevPlayers.current || {})[id] || null;
    const posOf = (id) => { const p = recOf(id); return p && p.pos ? p.pos : null; };
    const sizeOf = (id) => sizeOfP(recOf(id));
    const at = (ms, fn) => (ms > 0 ? timers.current.push(setTimeout(fn, ms)) : fn());
    const z = (list) => list.map((f) => (f.kind === "float" ? { ...f, z: lowQ ? 2.4 : 1.5 } : f));
    const onEmiya = (ev) => {
      const out = emiyaEventFx(ev, { posOf, sizeOf });
      if (out.fx.length) pushFx(z(out.fx));
      for (const [pos, ms] of out.look) at(ms, () => look(pos));
      if (!lowQ) for (const ms of out.shake) at(ms, () => setShake((n) => n + 1));
      for (const [ms, list] of out.later) at(ms, () => pushFx(z(list)));
    };
    socket.on("emiyaFx", onEmiya);
    return () => socket.off("emiyaFx", onEmiya);
  }, [pushFx, look, lowQ]);
  // สนาม Colony (GRID_PLAN §8.3): เหตุการณ์ของสนาม → ฉาก 3D ใน BoardCanvas (colony3d.js onEvent) · ค้างไว้ 24 อันล่าสุด (key กันเล่นซ้ำ)
  const [colonyEvents, setColonyEvents] = useState([]);
  useEffect(() => {
    let seq = 0;
    const kinds = ["colonyScene", "colonySeal", "colonyBoom", "colonyJump", "colonyLift"];
    // ตายตอนปิดผนึก/ระเบิด (event มาก่อน state): ค้างร่างไว้ (ระบบร่างค้างเดียวกับดิเอโก้) จนม่านเหล็กปิด/แฟลช แล้วค่อยระเบิดตกรอบ
    const DEATH_AT = { colonySeal: 2300, colonyBoom: 2600 };
    const holdDead = (kind, data) => {
      const ms = DEATH_AT[kind], ids = data && Array.isArray(data.dead) ? data.dead : [];
      if (!ms || !ids.length) return;
      const t0 = performance.now(), add = {};
      for (const id of ids) { const p = byIdRef.current[id]; if (p && p.pos) { add[id] = { ...p }; diegoDefer.current[id] = Math.max(diegoDefer.current[id] || 0, t0 + ms); } }
      if (!Object.keys(add).length) return;
      setDiegoGhosts((g) => ({ ...g, ...add }));
      for (const id of Object.keys(add)) timers.current.push(setTimeout(() => setDiegoGhosts((g) => { if (!g[id]) return g; const n = { ...g }; delete n[id]; return n; }), ms + 1500));
    };
    // กระโดดผ่านแกน / ลิฟต์ = ย้ายตำแหน่งตรงๆ (ไม่ใช่การเดิน) → จบฉากแล้วโฟกัสกล้องไปจุดลง (ไม่งั้นกล้องกลับไปค้างที่จุดเดิม)
    const LAND_AT = { colonyJump: 1000, colonyLift: 900 };
    const followLand = (kind, data) => {
      const ms = LAND_AT[kind], to = data && data.to;
      if (ms && to && Number.isFinite(to.x) && Number.isFinite(to.y)) timers.current.push(setTimeout(() => look(to), ms));
    };
    const handlers = kinds.map((kind) => [kind, (data) => { holdDead(kind, data); followLand(kind, data); setColonyEvents((l) => [...l.slice(-23), { key: `${Date.now()}-${++seq}`, kind, data }]); }]);
    for (const [k, fn] of handlers) socket.on(k, fn);
    return () => { for (const [k, fn] of handlers) socket.off(k, fn); };
  }, [look]);

  // เดินแล้วตีต่อ: รอแอนิเมชันเดินจบก่อนค่อยสั่งตี
  const pendingAttack = useRef(null);
  const animRef = useRef(null);
  useLayoutEffect(() => { animRef.current = anim; });
  const onAnimDone = useCallback(() => {
    // ฉากพุ่งโซระ: พุ่งจบ = ค้างตัวไว้ปลายทาง (server ยังไม่ย้าย) · ถูกเหวี่ยงลงพื้น = ปล่อยตัวที่ค้างไว้ช่องเดิม
    const cur = animRef.current, dh = dashHold.current;
    if (cur && cur.holdEnd && dh && !dh.done && dh.seq === cur.dashSeq) setHold((h) => ({ ...h, [cur.id]: cur.holdEnd }));
    if (cur && cur.releaseHold) setHold((h) => { if (!h[cur.id]) return h; const n = { ...h }; delete n[cur.id]; return n; });
    // Ice Spike: จบแอนิเมชันของเหตุการณ์ = ค้างตัวไว้ปลายทาง (state ผลสุดท้ายมาก่อนแล้ว) แล้วเล่นเหตุการณ์ถัดไป
    if (cur && cur.iceRun && !cur.iceRun.done && cur.iceHoldEnd) setIceHold((h) => ({ ...h, [cur.id]: cur.iceHoldEnd }));
    setAnimQ((q) => q.slice(1));
    if (cur && typeof cur.then === "function") cur.then();
  }, []);
  // เดินไปช่องยืนแล้วค่อยตี: server ไม่ให้เดิน (ตำแหน่งไม่เปลี่ยน) = ยกเลิกตีที่ค้างรอ — ไม่งั้นกดตี/เดินอะไรไม่ได้อีกทั้งตา
  const armPendingAttack = useCallback((id, stand) => {
    pendingAttack.current = id;
    const from = me && me.pos ? { ...me.pos } : null;
    timers.current.push(setTimeout(() => {
      if (pendingAttack.current !== id) return;
      const cur = byIdRef.current[me.id];
      if (cur && cur.pos && from && samePos(cur.pos, from) && !samePos(from, stand)) pendingAttack.current = null;
    }, 1500));
    socket.emit("move", { x: stand.x, y: stand.y });
  }, [me]);
  // เดินจบทั้งชุดแล้วค่อยตี (รวมไถลน้ำแข็งต่อจากเดิน — ชุด iceFx จบ = iceHold ถูกล้าง)
  useEffect(() => {
    if (anim || !pendingAttack.current) return;
    if (iceRun.current && iceRun.current.active) return;
    const pa = pendingAttack.current;
    pendingAttack.current = null;
    socket.emit("attack", { targetId: pa });
  }, [anim, iceHold]);
  // ตานี้จบ/เปลี่ยนคน = ล้างตีค้าง
  useEffect(() => { if (!myTurn) pendingAttack.current = null; }, [myTurn]);

  // ช่องที่ไปได้จากจุดเริ่มตา (ไฮไลต์ฟ้าหลังขยับแล้ว) = myReach ตอนยังเดินได้
  const startReach = canMove ? myReach : null;

  // ---------- ไฮไลต์ ----------
  const highlights = useMemo(() => {
    const h = {};
    if (dangerKeys) h.danger = dangerKeys;
    if (anim) return h;
    if (pickInfo && pickInfo.tile) {
      // เลือกช่อง (Ice Spike): ม่วง = ช่องที่เลือกได้ · ชี้ = ช่องนั้น (คุก = กรอบ 5×5) · เลือกทิศผลัก = ลูกศร 4 ทิศ
      if (dirPick) {
        h.arrows = dirPick.arrows;
        h.skill = dirPick.arrows.filter((a) => a.ok).map((a) => key(a.x, a.y));
        h.aoe = Array.isArray(dirPick.tiles) ? dirPick.tiles.map((t) => key(t.x, t.y)) : [key(dirPick.x, dirPick.y)];
        return h;
      }
      h.skill = pickInfo.skill;
      if (hover && pickInfo.list) {
        // กรอบเท่าตัวที่จะไปอยู่ (ตัวใหญ่ = กรอบ n×n แบบเดินตัวใหญ่)
        const a = pickInfo.anchorOf(hover.x, hover.y);
        if (a) {
          const fp = Rules.footprint(a.x, a.y, pickInfo.foot).map((t) => key(t.x, t.y));
          h.aoe = fp;
          if (pickInfo.foot > 1) h.ghost = fp;
        }
      } else if (hover && pickInfo.validSet.has(key(hover.x, hover.y))) {
        h.aoe = pickInfo.wall ? wallPlan(hover, wallOrient).placed.map((t) => key(t.x, t.y))
          : pick.square > 1 ? squareKeys(map, hover.x, hover.y, pick.square) : [key(hover.x, hover.y)];
      }
      return h;
    }
    if (pickInfo) {
      if (pickInfo.skill) h.skill = pickInfo.skill;
      if (pickInfo.aoe) h.aoe = pickInfo.aoe;
      // ชี้คนที่เลือกได้ = ไฮไลต์ช่องของคนนั้น (คนนอกระยะไม่ขึ้น — กดไม่ได้)
      if (pickInfo.valid && hoverUnit && hoverUnit.pos && pickInfo.valid.has(hoverUnit.id)) h.target = { ...boxOfP(hoverUnit) };
      // เลือกหลายเป้า: คนที่เลือกไว้แล้ว = กรอบทอง
      if (multiIds.length) h.aoe = multiIds.map((id) => byId[id]).filter((p) => p && p.pos).flatMap((p) => Rules.footprint(p.pos.x, p.pos.y, sizeOfP(p)).map((t) => key(t.x, t.y)));
      return h;
    }
    if (myTurn && myReach) {
      const range = me.range || [1, 1];
      if (canMove && !action.moved) {
        const z = threatOf(startMap, originUnit, me.mov || 0, range, ruleUnits, optsOf(me));
        h.move = [...z.move];
        h.attack = strikeOff ? [] : [...z.threat];
      } else if (startReach) {
        // ขยับแล้วแต่ยังไม่ล็อก (เดินด้วยคีย์บอร์ดต่อได้): ฟ้า = ช่องที่ไปได้จากจุดเริ่มตา · แดง = ตีถึงจากช่องที่ยืน
        h.move = [...new Set([...startReach.values()].flatMap((n) => Rules.footprint(n.x, n.y, sizeOfP(me)).map((t) => key(t.x, t.y))))];
        h.attack = strikeOff ? [] : strikeTiles(me, me.pos.x, me.pos.y, range).map((t) => key(t.x, t.y));
      } else if (!strikeOff) {
        h.attack = strikeTiles(me, me.pos.x, me.pos.y, range).map((t) => key(t.x, t.y));
      }
      const goal = hover && canMove && !hoverUnit ? anchorFor(hover) : null;
      if (plan) {
        if (plan.path && plan.path.length > 1) h.path = plan.path;
        h.target = { ...boxOfP(plan.foe) };
        if (plan.lane) h.aoe = plan.lane;
        if (plan.push) h.push = plan.push;
      } else if (goal) {
        h.path = Rules.pathTo(myReach, goal.x, goal.y);
        if (sizeOfP(me) > 1) h.ghost = Rules.footprint(goal.x, goal.y, sizeOfP(me)).map((t) => key(t.x, t.y));
      } else if (hoverUnit && hoverUnit.pos && isEnemy(hoverUnit)) {
        // ชี้ศัตรูที่ตาเราเดินไปตีไม่ถึง = เห็นระยะเดิน+ตีของศัตรูตัวนั้น (แบบ FE)
        const z = threatOf(map, unitOf(hoverUnit), hoverUnit.mov || 0, hoverUnit.range || [1, 1], ruleUnits, optsOf(hoverUnit));
        h.danger = [...new Set([...(h.danger || []), ...z.move, ...z.threat])];
      }
      return h;
    }
    // นอกตาเรา: ชี้ตัวละคร = ระยะเดิน/ตีของคนนั้น (แบบ FE)
    if (hoverUnit && hoverUnit.pos && map) {
      const z = threatOf(map, unitOf(hoverUnit), hoverUnit.mov || 0, hoverUnit.range || [1, 1], ruleUnits, optsOf(hoverUnit));
      h.move = [...z.move];
      h.attack = [...z.threat];
    }
    return h;
  }, [dangerKeys, anim, pickInfo, dirPick, multiIds, wallPlan, wallOrient, byId, myTurn, strikeOff, myReach, canMove, startReach, startMap, action, plan, hover, hoverUnit, map, me, ruleUnits, isAlly, blocked, anchorFor]); // eslint-disable-line react-hooks/exhaustive-deps
  // โหมดเลือกเป้า: คนที่เลือกไม่ได้ (นอกระยะ/ไม่ใช่เป้าของท่านี้) ส่งธง dim ให้ตัววาด (GRID_PLAN §7 "คนนอกระยะจางลง")
  const pickValid = pickInfo && pickInfo.valid ? pickInfo.valid : null;

  // ---------- ตัวละครบนกระดาน ----------
  // ขี่ผู้เล่นอื่น (ยูนะ — p.ride = id ตัวที่ถูกขี่): ตัวที่ขี่ไม่วาดแยก (ตาของตัวเองมี pos = ช่องเดียวกัน) แต่วาดบนหลังตัวที่ถูกขี่
  const riderOn = useMemo(() => {
    const out = {};
    for (const p of state.players) if (p.alive && p.ride) out[p.ride] = p;
    return out;
  }, [state.players]);
  const units = useMemo(() => state.players.filter((p) => p.alive && p.pos && !p.ride).map((p) => {
    const at = iceHold[p.id] || hold[p.id] || p.pos;
    const mk = !!p.masked; // "มืดบอด": ขาวล้วน ไม่มีชื่อ/รูป/แถบเลือด
    const other = dimOf(p) !== myDim; // คนละชั้นมิติ (วาเลนไทน์) = ภาพโปร่ง (ghostDim — ประกายใน valentineFx) · กดไม่ได้
    return {
      ...(other ? { alpha: GHOST_ALPHA, ghostDim: true } : null),
      // ยูนิตที่ถูกเรียก (วาเลนไทน์): ร่างแยก clone / ตัวที่เหมือนกัน double (look = id เป้าที่เลียนหน้าตา)
      summon: !mk && p.summon ? { kind: p.summon.kind, look: p.summon.look || null } : null,
      id: p.id, x: at.x, y: at.y, img: mk ? null : p.img, color: mk ? "#ffffff" : p.color, name: mk ? "" : p.name, masked: mk,
      size: sizeOfP(p), art: (!mk && p.character && BIG_ART[p.character.id]) || null, face: faces[p.id] || null,
      hp: p.hp ?? 0, maxHp: p.maxHp ?? 0, armor: p.armor ?? 0, maxArmor: p.maxArmor ?? 0,
      isMe: !!me && p.id === me.id, isActor: p.id === state.actorId, teamId: p.teamId || null,
      dim: !!pickValid && !pickValid.has(p.id),
      // ซ่อนจากศัตรูอยู่ (นักบินปริศนาซ่อนตัว / ยืนในพุ่ม) — เราเห็นเพราะเป็นตัวเอง/ทีมเดียวกัน → วาดจางแบบเงา
      cloak: !!p.veiled,
      // เคทยืนในม่านแดงของตัวเอง = ปีกเขม่ากางค้าง (มืดบอด = ไม่เห็น)
      wings: !mk && !!p.shadow && !!p.shadow.inStorm && (p.characterId || (p.character && p.character.id)) === "kate",
      aura: p.kira && p.kira.king ? "kira" : null, // กิระร่างราชาแมลงอวกาศ: หมอกดำแดง (ศัตรูประชิดเสียหายทุกเทิร์น)
      // ไจโร: ม้าใต้หมาก (mounted) · ออร่าทอง/เกลียวทองคำ (empowered) · ม้าโดนตี = แวบ (horseHp ลด) — gyroFx.js (มืดบอด = ไม่เห็น)
      gyro: !mk && p.gyro ? { mounted: !!p.gyro.mounted, empowered: !!p.gyro.empowered, horseHp: p.gyro.horseHp } : null,
      // ดิเอโก้: ซิลเวอร์ บูลเล็ตใต้หมาก (mounted) · ม้าโดนตี = แวบ · ชุ่มน้ำมัน/ติดตาข่าย = หยดน้ำมัน/ลวดรัดตัว (ใครก็ติดได้) — diegoFx.js
      diego: !mk && p.diego ? { mounted: !!p.diego.mounted, horseHp: p.diego.horseHp } : null,
      dstat: !mk && p.statuses && (p.statuses.oilSoaked > 0 || p.statuses.diegoNet > 0) ? { soaked: p.statuses.oilSoaked > 0, netted: p.statuses.diegoNet > 0 } : null,
      rider: riderOn[p.id] ? { img: riderOn[p.id].masked ? null : riderOn[p.id].img, color: riderOn[p.id].masked ? "#ffffff" : riderOn[p.id].color, name: riderOn[p.id].name, masked: !!riderOn[p.id].masked } : null,
    };
  }).concat(ghost && !state.players.some((p) => p.id === ghost.id && p.alive && p.pos) ? [{ ...ghost, isMe: false, isActor: false, teamId: null }] : [])
    // ร่างของตัวที่ล้ม (ระบบคู่): เงาร่างล้มบนช่อง (id "corpse:<id>" — คลิก = คลิกช่อง)
    .concat(corpses.map((c) => {
      const p = byId[c.id] || {};
      return { id: `corpse:${c.id}`, corpse: true, ryougiSlain: !!p.ryougiSlain, x: c.x, y: c.y, img: p.masked ? null : p.img, color: p.masked ? "#ffffff" : p.color, name: "", size: 1, isMe: false, isActor: false, teamId: null, hp: 0, maxHp: 0, armor: 0, maxArmor: 0 };
    }))
    // Ice Spike: คนที่ตายระหว่างเหตุการณ์ iceFx — วาดค้างไว้ (ตามตำแหน่งที่แสดง) จนถึงจังหวะตาย
    .concat(Object.values(iceGhosts).filter((t) => t && t.pos && !state.players.some((p) => p.id === t.id && p.alive && p.pos)).map((t) => {
      const at = iceHold[t.id] || t.pos;
      return {
        id: t.id, x: at.x, y: at.y, img: t.img, color: t.color, name: t.name, size: sizeOfP(t), art: (t.character && BIG_ART[t.character.id]) || null, face: faces[t.id] || null,
        hp: t.hp ?? 0, maxHp: t.maxHp ?? 0, armor: t.armor ?? 0, maxArmor: t.maxArmor ?? 0, isMe: false, isActor: false, teamId: t.teamId || null,
      };
    }))
    // ดิเอโก้: คนที่ตกรอบตอนเวลาเดินต่อ — วาดค้างจนของที่ค้างกลางอากาศพุ่งถึง
    .concat(Object.values(diegoGhosts).filter((t) => t && t.pos && !iceGhosts[t.id] && !state.players.some((p) => p.id === t.id && p.alive && p.pos)).map((t) => ({
      id: t.id, x: t.pos.x, y: t.pos.y, img: t.masked ? null : t.img, color: t.masked ? "#ffffff" : t.color, name: t.masked ? "" : t.name, masked: !!t.masked,
      size: sizeOfP(t), art: (!t.masked && t.character && BIG_ART[t.character.id]) || null, face: faces[t.id] || null,
      hp: t.hp ?? 0, maxHp: t.maxHp ?? 0, armor: t.armor ?? 0, maxArmor: t.maxArmor ?? 0, isMe: false, isActor: false, teamId: t.teamId || null,
    }))),
  [state.players, state.actorId, me, myDim, hold, pickValid, ghost, faces, iceHold, iceGhosts, diegoGhosts, corpses, byId, riderOn]);
  // วงเพลงของยูนะ (yunaFx.js drawYunaZones) — คนที่มองไม่เห็นยูนะได้ yuna = undefined (view.unseenPub) จึงไม่เห็นวง
  const songSig = state.players.map((p) => (p.alive && p.yuna && p.yuna.aura ? `${p.yuna.aura.kind}@${p.yuna.aura.x},${p.yuna.aura.y},${p.yuna.aura.r}` : "")).filter(Boolean).join("|");
  const songs = useMemo(() => (songSig ? songSig.split("|").map((t) => { const [kind, rest] = t.split("@"); const [x, y, r] = rest.split(",").map(Number); return { kind, x, y, r }; }) : null), [songSig]);
  // เกรย์ชาร์จรองโกมิเนียต (p.gray.charge) — ทุกคนเห็นแนวลำแสง + หอกเหนือหัว (grayFx.js drawGrayGround / drawGrayAir)
  const graySig = JSON.stringify(state.players.filter((p) => p.alive && p.pos && p.gray && p.gray.charge && Array.isArray(p.gray.charge.tiles))
    .map((p) => ({ id: p.id, x: p.pos.x, y: p.pos.y, size: sizeOfP(p), dir: p.gray.charge.dir, left: p.gray.charge.left, tiles: p.gray.charge.tiles.map((t) => ({ x: t.x, y: t.y })) })));
  const grays = useMemo(() => { const list = JSON.parse(graySig); return list.length ? list : null; }, [graySig]);
  // เฟิร์น: Zoltraak ครั้งที่ 6 พร้อม (p.fern.empowered) / เพิ่มระยะรออยู่ (p.fern.boost) — แสงที่ปลายคทา (fernFx.js drawFernAir)
  //  เห็นเฉพาะตอนมีตำแหน่งบนกระดาน · ระหว่างซ่อนเร้นไม่วาด
  const fernSig = JSON.stringify(state.players.filter((p) => p.alive && p.pos && p.fern && !p.fern.conceal && (p.fern.empowered || p.fern.boost))
    .map((p) => ({ id: p.id, x: p.pos.x, y: p.pos.y, size: sizeOfP(p), empowered: !!p.fern.empowered, boost: !!p.fern.boost })));
  const ferns = useMemo(() => { const list = JSON.parse(fernSig); return list.length ? list : null; }, [fernSig]);
  // ลูกเหล็กของไจโรบนพื้น (p.gyro.balls — ข้อมูลอยู่ที่ตัวผู้เล่น · ไจโรหลายคน = วงสีตามเจ้าของ) — gyroFx.js gyroBallItems
  const ballSig = JSON.stringify(state.players.filter((p) => p.gyro && Array.isArray(p.gyro.balls) && p.gyro.balls.length)
    .flatMap((p) => p.gyro.balls.filter((b) => b && Number.isFinite(b.x) && Number.isFinite(b.y)).map((b) => ({ owner: p.id, color: p.color, x: b.x, y: b.y, seq: b.seq | 0 }))));
  const gyroBalls = useMemo(() => { const list = JSON.parse(ballSig); return list.length ? list : null; }, [ballSig]);
  // ดิเอโก้: ชั้นพื้น board.diego (น้ำมัน/ไฟ/ขี้เถ้า — ทุกคนเห็น) + ตาข่าย (server ส่ง nets ให้เจ้าของเท่านั้น · สีตามเจ้าของ)
  const dBoard = state.board && state.board.diego ? state.board.diego : null;
  const diegoSig = JSON.stringify({
    oil: dBoard && Array.isArray(dBoard.oil) ? dBoard.oil : [], fire: dBoard && Array.isArray(dBoard.fire) ? dBoard.fire : [], ash: dBoard && Array.isArray(dBoard.ash) ? dBoard.ash : [],
    nets: state.players.filter((p) => p.diego && Array.isArray(p.diego.nets)).flatMap((p) => p.diego.nets.filter((n) => n && Number.isFinite(n.x) && Number.isFinite(n.y)).map((n) => ({ x: n.x, y: n.y, color: p.color }))),
  });
  const diegoGround = useMemo(() => { const d = JSON.parse(diegoSig); return d.oil.length || d.fire.length || d.ash.length || d.nets.length ? d : null; }, [diegoSig]);
  // เซลิน (celineFx.js): พุ่มดอกไม้ · ราชาดอกไม้ (p.celine.king > 0 — มงกุฎ/กลีบโคจร) · กำแพงค้างถึงจังหวะปะทะ · พรีวิวกำแพงตอนเลือกช่อง
  const kingSig = JSON.stringify(state.players.filter((p) => p.alive && p.pos && p.celine && p.celine.king > 0 && sameDim(p))
    .map((p) => ({ id: p.id, x: p.pos.x, y: p.pos.y, size: sizeOfP(p) })));
  const wallPreview = useMemo(() => {
    if (!pickInfo || !pickInfo.wall) return null;
    if (dirPick && Array.isArray(dirPick.tiles)) return { tiles: dirPick.tiles, orient: dirPick.orient, ok: true };
    if (!hover || !pickInfo.validSet.has(key(hover.x, hover.y))) return null;
    return { tiles: wallPlan(hover, wallOrient).placed, orient: wallOrient, ok: true };
  }, [pickInfo, dirPick, hover, wallPlan, wallOrient]);
  // ซึนาชิ ทาคุโตะ (takutoFx.js): ทาวเบิร์นถือดาบ (p.takuto.emerald / sapphire = เทิร์นที่เหลือ · judgment) · ช่วงมิติพังทลาย (collapse)
  //  ร่างคนถือดาบไม่ได้ = ไม่วาด
  const takutoSig = JSON.stringify(state.players.filter((p) => p.alive && p.pos && p.takuto && p.takuto.form === "tauburn" && sameDim(p))
    .map((p) => ({ id: p.id, x: p.pos.x, y: p.pos.y, size: sizeOfP(p), emerald: p.takuto.emerald > 0, sapphire: p.takuto.sapphire > 0, judgment: !!p.takuto.judgment, collapse: !!p.takuto.collapse }))
    .filter((c) => c.emerald || c.sapphire || c.judgment || c.collapse));
  const takutos = useMemo(() => { const list = JSON.parse(takutoSig); return list.length ? list : null; }, [takutoSig]);
  // ผู้นำแห่งตระกูลเรียวกิ (ryougiFx.js): เนตรมณะ / รากฐานจิต / ซากุระหลังดับสิ้นซะ (p.ryougi — เทิร์นที่เหลือ) · กองเลือด (board.ryougi.blood)
  const rBlood = state.board && state.board.ryougi && Array.isArray(state.board.ryougi.blood) ? state.board.ryougi.blood : [];
  const ryougiSig = JSON.stringify({
    units: state.players.filter((p) => p.alive && p.pos && p.ryougi && sameDim(p))
      .map((p) => ({ id: p.id, eyes: p.ryougi.eyes > 0, mind: p.ryougi.mind > 0, bloom: p.ryougi.bloom > 0 })).filter((r) => r.eyes || r.mind || r.bloom),
    blood: rBlood.filter((b) => b && Number.isFinite(b.x) && Number.isFinite(b.y)).map((b) => ({ x: b.x, y: b.y, size: Math.max(1, b.size | 0), id: b.id })),
  });
  const ryougiProp = useMemo(() => { const r = JSON.parse(ryougiSig); return r.units.length || r.blood.length ? r : null; }, [ryougiSig]);
  // เอมิยะ ชิโร่ (emiyaFx.js): โลก Unlimited Blade Works (ชิโร่คนไหนก็ได้ที่กางอยู่) · อาวุธที่ถือลอยข้างตัว
  const emiyaSig = JSON.stringify({
    ubw: state.players.some((p) => p.alive && p.emiya && p.emiya.ubw > 0),
    units: state.players.filter((p) => p.alive && p.pos && p.emiya && p.emiya.weapon && sameDim(p)).map((p) => ({ id: p.id, weapon: p.emiya.weapon })),
  });
  const emiyaProp = useMemo(() => { const r = JSON.parse(emiyaSig); return r.ubw || r.units.length ? r : null; }, [emiyaSig]);
  const celineProp = useMemo(() => {
    const kings = JSON.parse(kingSig);
    if (!celFlora.length && !kings.length && !wallHold.length && !wallPreview) return null;
    return { flora: celFlora, kings, hold: wallHold, preview: wallPreview };
  }, [celFlora, kingSig, wallHold, wallPreview]);

  // ---------- คลิก ----------
  const busy = !!anim;
  const onUnitClick = (id) => {
    const cp = typeof id === "string" && id.startsWith("corpse:") ? corpses.find((c) => `corpse:${c.id}` === id) : null;
    if (cp) { onTileClick(cp.x, cp.y); return; } // ร่าง = ช่องธรรมดา (เลือกช่อง/เดิน)
    const p = byId[id];
    if (!p) return;
    // คนคนละชั้นมิติ = กดตัวไม่ได้ (คลิก = คลิกช่องใต้ภาพโปร่ง — ชั้นเราเดินไปยืนช่องนั้นได้)
    if (!sameDim(p)) { const t = hover && onBody(p, hover) ? hover : p.pos; if (t) onTileClick(t.x, t.y); return; }
    if (pick) {
      if (pick.kind === "tile") { const t = hover && onBody(p, hover) ? hover : p.pos; pickTileAt(t.x, t.y); return; }
      if (pick.kind === "target" && pickInfo && pickInfo.valid.has(id)) pickTarget(id);
      else if (pick.kind === "aoe" && pickInfo && Rules.footprint(p.pos.x, p.pos.y, sizeOfP(p)).some((t) => pickInfo.aoe.includes(key(t.x, t.y)))) { clickSound(); pick.onConfirm(); }
      else if (pick.kind === "line" && pickInfo) { clickSound(); pick.onPick(pickInfo.dir); }
      return;
    }
    if (myTurn && !busy && !pendingAttack.current && planFor(p)) {
      clickSound();
      setFcId(id);
      return;
    }
    if (onInspect && !(p.masked && !sameSide(p, me))) onInspect(id); // มืดบอด = ดูสถานะไม่ได้
  };
  const onTileClick = (x, y) => {
    const k = key(x, y);
    if (pick) {
      if (pick.kind === "tile") { pickTileAt(x, y); return; }
      if (pick.kind === "aoe" && pickInfo && pickInfo.aoe.includes(k)) { clickSound(); pick.onConfirm(); }
      else if (pick.kind === "line" && pickInfo) { clickSound(); pick.onPick(dirToward(me.pos, { x, y }, sizeOfP(me)) || pickInfo.dir); }
      return;
    }
    // ผนึก (ห่วงเวลาซีโร่): ตีเลย — ยืนในระยะแล้ว = ตี · ยังไม่ถึง = เดินไปช่องยืนก่อน แล้วตีเมื่อเดินจบ
    // หนามน้ำแข็ง (Ice Spike) · ศพ (เกรย์เก็บศพ) ใช้ทางเดียวกัน
    const at = (s) => s.pos.x === x && s.pos.y === y;
    const seal = sealFoes.find(at) || spikeFoes.find(at) || corpseFoes.find(at);
    if (seal) {
      if (!myTurn || busy || pendingAttack.current) return;
      const pl = planFor(seal);
      if (!pl) return;
      clickSound();
      if (samePos(pl.stand, me.pos)) socket.emit("attack", { targetId: seal.id });
      else armPendingAttack(seal.id, pl.stand);
      return;
    }
    if (!myTurn || busy || !canMove || !myReach) return;
    const n = anchorFor({ x, y });
    if (!n) return;
    clickSound();
    socket.emit("move", { x: n.x, y: n.y });
  };
  // ยืนยันโจมตีจากหน้าคาดการณ์: ยืนติดเป้าแล้ว = ตีเลย · ยังไม่ติด = เดินไปช่องยืนก่อน แล้วตีเมื่อแอนิเมชันเดินจบ
  const confirmAttack = useCallback(() => {
    const pl = fcPlan;
    setFcId(null);
    if (!pl || !myTurn || pendingAttack.current) return;
    clickSound();
    if (samePos(pl.stand, me.pos)) socket.emit("attack", { targetId: pl.foe.id });
    else armPendingAttack(pl.foe.id, pl.stand);
  }, [fcPlan, myTurn, me, armPendingAttack]);
  const cancelForecast = useCallback(() => { clickSound(); setFcId(null); }, []);

  // ---------- เดินด้วยคีย์บอร์ด (ตาของเรา) ----------
  //  W A S D อ่านจากตำแหน่งปุ่ม (e.code) — แป้นภาษาไทยก็ใช้ได้ · กดแล้วตัวละครก้าวทันที 1 ช่องตามทิศบนจอ (ไม่มีเส้นนำทาง)
  //  ไปได้ทุกช่องที่อยู่ในระยะเดินจากจุดเริ่มตา (server ตรวจซ้ำ — move { step: true }) · ใช้สกิล/ไอเทม/ซื้อ/ตีแล้ว = ล็อก
  const stepSent = useRef(null); // ก้าวที่ส่งไปแล้วแต่ state ยังไม่กลับมา (กันส่งซ้ำจากตำแหน่งเก่า)
  useEffect(() => {
    if (!myTurn || pick || fcId) return undefined;
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))) return;
      const dir = screenDir(rotation, e.code, me && me.pos);
      if (!dir) return;
      e.preventDefault();
      const sent = stepSent.current;
      if (sent && (samePos(me.pos, sent.to) || performance.now() - sent.t > 700)) stepSent.current = null;
      if (!canMove || !originUnit || !me.pos || stepSent.current) return;
      const to = { x: me.pos.x + dir.x, y: me.pos.y + dir.y };
      // กติกาเดียวกับ server (Board.stepPath): ต่อเส้นทางที่เดินมา · ถอยกลับ = ตัดเส้นทาง · ก้าวเข้าน้ำแข็ง = ไถล
      if (!stepOf(startMap, originUnit, me.mov || 0, ruleUnits, action.trail, to, optsOf(me))) return;
      stepSent.current = { to, t: performance.now() };
      look(to);
      socket.emit("move", { x: to.x, y: to.y, step: true });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [myTurn, pick, fcId, me, rotation, canMove, startMap, action, ruleUnits, look]); // eslint-disable-line react-hooks/exhaustive-deps

  // โหมดเลือกเป้า (ผู้ใช้สั่ง 2026-10-09): เลือกเป้า = คลิกคน/ตัวเองบนกระดาน · สกิลหมู่ = คลิกในพื้นที่ซ้ำเพื่อใช้
  //  ยกเลิก = ปุ่มยกเลิกกลางล่าง / Esc / คลิกขวา
  //  กำแพงน้ำแข็งของเซลิน: คลิกขวา / R / ล้อเมาส์ = หมุนแนวกำแพง (ยกเลิก = Esc / ปุ่มยกเลิก)
  const wallMode = !!pick && pick.kind === "tile" && pick.place === "wall";
  const flipWall = useCallback(() => setWallOrient((o) => (o === "h" ? "v" : "h")), []);
  useEffect(() => {
    if (!pick || !pick.onCancel) return undefined;
    // เลือกทิศผลักอยู่ (Ice Spike / กำแพง) = ถอยกลับไปเลือกช่องก่อน · เลือกหลายเป้าไว้แล้ว = ล้างที่เลือกก่อน
    const back = () => { if (dirPick) setDirPick(null); else if (multiIds.length) setMulti({ sig: "", ids: [] }); else pick.onCancel(); };
    const onKey = (e) => {
      if (e.key === "Escape") back();
      else if (wallMode && !dirPick && e.code === "KeyR" && !e.ctrlKey && !e.metaKey && !e.altKey && !(e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))) flipWall();
    };
    const onCtx = (e) => { e.preventDefault(); if (wallMode && !dirPick) flipWall(); else back(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("contextmenu", onCtx);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("contextmenu", onCtx); };
  }, [pick, dirPick, multiIds, wallMode, flipWall]);
  // ล้อเมาส์หมุนกำแพง — ดักก่อนถึง BoardCanvas (ซูม) ด้วย capture ที่ชั้นนอก
  const rootRef = useRef(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !wallMode || dirPick) return undefined;
    let last = 0;
    const onWheel = (e) => {
      if (e.ctrlKey || !e.deltaY) return;
      e.preventDefault(); e.stopPropagation();
      const t = performance.now();
      if (t - last < 160) return;
      last = t;
      flipWall();
    };
    el.addEventListener("wheel", onWheel, { capture: true, passive: false });
    return () => el.removeEventListener("wheel", onWheel, { capture: true });
  }, [wallMode, dirPick, flipWall]);

  // ---------- ป้ายข้อมูลช่อง ----------
  const tileInfo = useMemo(() => {
    if (!hover || !map) return null;
    if (samePos(shopPos, hover)) return { icon: "🏪", name: "ร้านค้ามายา", desc: state.shopTurnsLeft ? `เหลือ ${state.shopTurnsLeft} เทิร์น` : "" };
    // Ice Spike: หนามน้ำแข็ง · ธารน้ำแข็ง (น้ำแข็งที่สร้างระหว่างเกม)
    const sp = spikeList.find((t) => samePos(t, hover));
    if (sp && sp.wall) return { icon: "🧊", name: "กำแพงน้ำแข็ง", desc: "" };
    if (sp) return { icon: "❄️", name: `หนามน้ำแข็ง Lv.${sp.lv}`, desc: `เกราะ ${sp.armor ?? 0}/${sp.maxArmor ?? 0} · เหลือ ${sp.left ?? 0} เทิร์น` };
    // เซลิน: พุ่มดอกไม้
    const fl = celFlora.find((t) => samePos(t, hover));
    if (fl) return { icon: "🌸", name: "พุ่มดอกไม้", desc: `เหลือ ${fl.left ?? 0} เทิร์น` };
    const ic = board && Array.isArray(board.ice) ? board.ice.find((t) => samePos(t, hover)) : null;
    if (ic) return { icon: "🧊", name: "ธารน้ำแข็ง", desc: `เหลือ ${ic.left ?? 0} เทิร์น` };
    return Rules.tileInfo(map, hover.x, hover.y); // ช่องพิเศษ / จุดฟื้นฟู (ชื่อตามภูมิภาค) · พื้นธรรมดา = null
  }, [hover, map, shopPos, state.shopTurnsLeft, spikeList, board, celFlora]);

  // ---------- เปลี่ยนภูมิภาค: กระดานเดิมซูมออก (ลอยขึ้นไปหาลูกโลก) → รอฉาก RegionTravel ชนผิวโลก → กระดานใหม่ซูมเข้า ----------
  //  เริ่มแมตช์ (ต่อจาก MatchIntro) ก็ซูมเข้า · mount ใหม่ในภูมิภาคเดิม (หลังคัตซีน) ไม่เล่นซ้ำ — ดู journey/arena/arenaLandBus.js
  const boardArea = state.board ? state.board.area : 0;
  const [shown, setShown] = useState(() => ({ board: state.board, fly: state.board && shouldLandOnMount(state.board.area) ? "in" : null, seq: 0 }));
  if (state.board && shown.board && boardArea !== shown.board.area && shown.fly !== "out" && shown.fly !== "wait") {
    // เข้า/ออก/เปลี่ยนระดับห่วงเวลาซีโร่ = ไม่บินไปลูกโลก (BoardCanvas เล่นฉากเปลี่ยนผ่านเอง)
    if (isZeroArea(boardArea) || isZeroArea(shown.board.area)) setShown((v) => ({ board: state.board, fly: null, seq: v.seq + 1 }));
    else setShown((v) => ({ ...v, fly: "out", seq: v.seq + 1 }));
  }
  useEffect(() => {
    if (shown.fly === "in") announceArenaLand();
    if (!shown.fly || shown.fly === "wait") return undefined;
    const t = setTimeout(() => setShown((v) => ({ ...v, fly: v.fly === "out" ? "wait" : null })), shown.fly === "out" ? 750 : 1100);
    return () => clearTimeout(t);
  }, [shown.fly, shown.seq]);
  useEffect(() => {
    if (shown.fly !== "out" && shown.fly !== "wait") return undefined;
    let done = false;
    const land = () => { if (done) return; done = true; setShown((v) => ({ board: state.board, fly: "in", seq: v.seq + 1 })); };
    const off = onArenaLandRequest(land);
    const t = setTimeout(land, shown.hold ? 30000 : 9000);
    return () => { off(); clearTimeout(t); };
  }, [shown.fly === "out" || shown.fly === "wait", boardArea]); // eslint-disable-line react-hooks/exhaustive-deps
  // ท่าไม้ตาย Echo (EchoRebirth): ถอยออกตอนเริ่มฉากทั้งที่ภูมิภาคยังไม่เปลี่ยน แล้วค้างซ่อนจนฉากสั่งลง (hold = รอนานกว่าปกติ)
  useEffect(() => onArenaLeaveRequest(() => setShown((v) => (v.fly === "out" || v.fly === "wait" ? v : { ...v, fly: "out", hold: true, seq: v.seq + 1 }))), []);
  const shownArea = shown.board ? shown.board.area : 0;
  useEffect(() => { noteArenaShown(shownArea); return () => noteArenaShown(shownArea); }, [shownArea]);
  const baseBoard = shown.fly === "out" || shown.fly === "wait" ? shown.board : state.board;
  // Ice Spike: น้ำแข็งใหม่ที่เหตุการณ์ยังเล่นไม่ถึง = แสดงช่องพิเศษเดิมไว้ก่อน
  const displayBoard = useMemo(() => {
    if (!baseBoard || !iceMask) return baseBoard;
    const sp = { ...(baseBoard.special || {}) };
    for (const [k, was] of Object.entries(iceMask)) { if (was) sp[k] = was; else delete sp[k]; }
    return { ...baseBoard, special: sp };
  }, [baseBoard, iceMask]);
  const iceProp = useMemo(() => (iceLv ? { lv: iceLv } : null), [iceLv]);

  // ---------- ฉากเต็มจอ: ลำดับเดิน (ORDER) · ตาเดิน (ทุกครั้งที่ขึ้นตาใหม่) ----------
  const sk = vp ? Math.min(vp.w / 1920, vp.h / 1080) : 1; // ตัวย่อของเวทีออกแบบ 1920 × 1080
  const roster = rosterAlive(state.players); // ผู้เล่นจริง (ตัวที่สองของระบบคู่ไม่นับในลำดับ · เจ้าของที่ล้มแต่คู่ยังรอด = ยังอยู่)
  const seat = [...roster].filter((p) => p.alive || p.score != null).sort((a, b) => (a.position || 0) - (b.position || 0)).map((p) => p.id);
  const [call, setCall] = useState(null); // { id, key }
  // ระบบคู่: สลับตัวในตาเดียวกัน (กระจกเงา) ไม่ขึ้นฉากตาเดินซ้ำ — นับตาตามฝ่าย · ฉากใช้เจ้าของฝ่าย
  const actorSide = state.actorId ? sideOf(byId[state.actorId]) || state.actorId : null;
  const callKey = phase === "ACTION" && state.actorId ? `${state.roundNumber}|${actorSide}` : "";
  const [calledKey, setCalledKey] = useState("");
  if (callKey && callKey !== calledKey) {
    setCalledKey(callKey);
    setCall({ id: state.actorId, key: callKey });
  }
  const endCall = useCallback(() => setCall(null), []);
  // เสียงฉากตาเดิน (ผู้ใช้ให้ไฟล์มา 2026-10-09): ตาเรา = notificate_mine · ตาคนอื่น = notificate
  useEffect(() => { if (call) playSfx(me && sameSide(byId[call.id] || { id: call.id }, me) ? "notificate_mine" : "notificate"); }, [call]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- ฉากห่วงเวลาซีโร่ (ป้ายชื่อ/เฟส · เสียง) — ภาพบนกระดาน BoardCanvas เล่นเองจาก zeroScene ----------
  const zScene = zero && zero.scene ? zero.scene : null;
  const [zCall, setZCall] = useState(null); // { seq, mode, stage }
  const [zSeenSeq, setZSeenSeq] = useState(0);
  if (zScene && zScene.seq !== zSeenSeq) {
    setZSeenSeq(zScene.seq);
    setZCall({ seq: zScene.seq, mode: zScene.mode, stage: zScene.stage });
  }
  const endZCall = useCallback(() => setZCall(null), []);
  const zCallSeq = zCall ? zCall.seq : 0;
  useEffect(() => {
    if (!zCall) return undefined;
    if (zCall.mode === "enter") playSfx("change_cutscene");
    if (zCall.mode !== "release") return undefined;
    const t = setTimeout(() => playSfx("attack"), 1450);
    return () => clearTimeout(t);
  }, [zCallSeq]); // eslint-disable-line react-hooks/exhaustive-deps -- เล่นครั้งเดียวต่อฉาก
  // ผนึกที่แตกจากการตีวาดค้างไว้จนถึงจังหวะปะทะ
  const zeroProp = useMemo(() => {
    if (!zero || sealHold == null || !Array.isArray(zero.seals)) return zero;
    return { ...zero, seals: zero.seals.map((s) => (s.i === sealHold ? { ...s, broken: false } : s)) };
  }, [zero, sealHold]);

  // ---------- แถบลำดับเดิน ----------
  // มืดบอด (masked): server ส่ง turnOrder ว่าง — ไม่แสดงลำดับเลย
  const order = masked ? []
    : phase === "PLAYING" || !state.turnOrder || !state.turnOrder.length
      ? [...roster].filter((p) => p.alive).sort((a, b) => (a.position || 0) - (b.position || 0)).map((p) => p.id)
      : state.turnOrder;
  const actor = state.actorId ? byId[state.actorId] : null;
  // คิว 2 คนถัดไป: ต่อจากตำแหน่งที่เดินล่าสุด (server actorIndex · ไม่มี = หาจากฝ่ายของคนที่เดินอยู่) · ตัดคนตกรอบ/มองไม่เห็น (มืดบอด)
  const actIdx = typeof state.actorIndex === "number" ? state.actorIndex : (state.turnOrder || []).indexOf(actorSide);
  const upNext = masked || phase === "PLAYING" || !state.turnOrder ? []
    : state.turnOrder.slice(actIdx + 1).filter((id) => byId[id] && sideAlive(byId[id], state.players) && !byId[id].masked).slice(0, 2);

  // แถบลำดับเดินชนแถบบนซ้าย (รอบ/ภูมิภาค) ในแนวนอน — จอแคบหรือคนเยอะ → ลดลงไปอยู่ใต้แถบบน
  //  วัดใหม่เมื่อจอ/รายชื่อ/ข้อความแถบบนเปลี่ยน (เทียบแค่แนวนอน ตำแหน่งแนวตั้งไม่มีผล) · setState เฉพาะตอนค่าเปลี่ยน
  const orderRef = useRef(null);
  const [orderLow, setOrderLow] = useState(0); // 0 = ที่เดิม · ตัวเลข = ระยะจากขอบบน (ใต้แถบบนซ้าย)
  const [orderDx, setOrderDx] = useState(0);   // ชนแถบบนซ้ายแต่เลื่อนขวาแล้วยังพ้นปุ่มกล้อง = เลื่อนขวาแทนการลงล่าง (ไม่บังกระดาน)
  const orderSig = `${vp ? vp.w : 0}x${vp ? vp.h : 0}|${order.join(",")}|${phase}|${state.roundNumber}|${state.journey ? state.journey.name : ""}`;
  useLayoutEffect(() => {
    const el = orderRef.current;
    const top = document.querySelector(".hud-top");
    let low = 0, dx = 0;
    if (el && top) {
      const a = el.getBoundingClientRect(), b = top.getBoundingClientRect();
      const left = a.left - orderDx, right = a.right - orderDx; // ตำแหน่งตอนยังไม่เลื่อน
      if (b.width > 0 && left < b.right + 8 && right > b.left - 8) {
        const need = b.right + 12 - left, tools = document.querySelector(".bs-tools");
        const limit = tools ? tools.getBoundingClientRect().left - 8 : window.innerWidth - 8;
        if (right + need <= limit) dx = Math.round(need);
        else low = Math.round(b.bottom + 6);
      }
    }
    setOrderLow(low);
    setOrderDx(dx);
  }, [orderSig, map, state.actorId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!map) return null;
  return (
    <div ref={rootRef} className="bs-root" data-hidden={hidden ? "true" : "false"} data-order-low={orderLow ? "true" : "false"}
      data-fc={fcId ? "true" : "false"} data-fly={shown.fly || "none"} data-shake={shake % 2 ? "true" : "false"}
      style={{ "--bs-k": Math.max(0.55, Math.min(1.3, sk)), "--bs-order-dx": `${orderDx}px`, ...(orderLow ? { "--bs-order-top": `${orderLow}px` } : null) }}>
      <BoardCanvas
        map={displayBoard}
        units={units}
        highlights={highlights}
        shopPos={shopPos}
        night={night}
        lowQ={lowQ}
        rotation={rotation}
        zoom={zoom}
        view={view}
        onZoomChange={setZoom}
        focus={focus}
        cinema={cinema}
        shopLabel={state.shopTurnsLeft > 0 ? state.shopTurnsLeft : null}
        anim={anim}
        fx={fx}
        zero={zeroProp}
        zeroScene={zScene}
        ice={iceProp}
        storms={state.board ? state.board.storms : null}
        colony={state.colony || null}
        colonyEvents={colonyEvents}
        songs={songs}
        grays={grays}
        ferns={ferns}
        takutos={takutos}
        ryougi={ryougiProp}
        emiya={emiyaProp}
        gyroBalls={gyroBalls}
        diego={diegoGround}
        timeFreeze={state.timeFreeze || null}
        valentine={state.board && state.board.valentine ? state.board.valentine : null}
        celine={celineProp}
        dimView={typeof myDim === "string" ? (myDim.startsWith("par") ? "par" : myDim.startsWith("veil") ? "veil" : null) : null}
        onAnimDone={onAnimDone}
        onTileClick={onTileClick}
        onUnitClick={onUnitClick}
        onHoverTile={(x, y) => setHover(x == null ? null : { x, y })}
      />

      {/* คนที่กำลังเดิน (บนกลาง) — แทนแถบลำดับทุกคน (ผู้ใช้สั่ง 2026-10-09: เหลือเฉพาะคนที่เดินตอนนี้ + รูปโปรไฟล์) · ช่วงอื่นไม่มี */}
      {actor && (phase === "ACTION" || phase === "ATTACKING") && !(actor.masked && !sameSide(actor, me)) && (
        <div className="bs-actor" key={`actor-${actor.id}-${state.roundNumber}`} ref={orderRef} style={{ "--bs-c": actor.color || "#7fb8e6" }}>
          <div className="bs-actor-hexw" ref={(el) => registerOther && registerOther(actor.id, el)}>
            <svg className="bs-actor-ring" viewBox="0 0 100 114" preserveAspectRatio="none" aria-hidden="true"><polygon points={HEX_PTS} /></svg>
            <div className="bs-actor-frame" />
            <div className="bs-actor-face"><img src={actor.img} alt="" style={faceStyle(actor)} onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} /></div>
          </div>
          <div className="bs-actor-plate">
            <b>{me && sameSide(actor, me) ? "คุณ" : actor.name}</b>
            {actor.character && actor.character.name && <small>{actor.character.name}</small>}
          </div>
          <span className="bs-actor-pts" data-bust={actor.busted ? "true" : "false"}>{actor.busted ? "แตก" : actor.score ?? "?"}</span>
        </div>
      )}

      {/* คิว 2 คนถัดไป (ขวา · จอคอม/แท็บเล็ต) */}
      {(!vp || vp.w >= 768) && <UpNext ids={upNext} byId={byId} me={me} show={phase === "ACTION" || phase === "ATTACKING"} />}

      {/* ฉากลำดับเดินเต็มจอ (ORDER ~6.5 วิ) */}
      {/* ฉากเต็มจอทั้งหมดไปอยู่ที่ <body> (ทับ HUD ทุกชั้น) */}
      {phase === "ORDER" && !masked && createPortal(
        <OrderCall key={`order-${state.roundNumber}`} k={sk} round={state.roundNumber} seat={seat.filter((id) => order.includes(id))} order={order} byId={byId} myId={me && me.id} lowQ={lowQ} />,
        document.body,
      )}
      {/* ฉากตาเดิน (แบบ A ประตูหกเหลี่ยม) */}
      {call && phase === "ACTION" && byId[call.id] && !(masked && byId[call.id].masked) && createPortal(
        <TurnCall key={call.key} k={sk} p={byId[call.id]} rank={Math.max(1, order.indexOf(sideOf(byId[call.id])) + 1)} isMe={!!me && sameSide(byId[call.id], me)} onDone={endCall} />,
        document.body,
      )}


      {/* ฉากห่วงเวลาซีโร่: ชื่อ + เฟส + บัฟ */}
      {zCall && (zCall.mode === "enter" || zCall.mode === "break") && createPortal(
        <ZeroCall key={`zero-${zCall.seq}`} k={sk} mode={zCall.mode} stage={zCall.stage} onDone={endZCall} />,
        document.body,
      )}

      {/* โหมดเลือกเป้า: เหลือแค่ปุ่มยกเลิก (ผู้ใช้สั่ง — เลือก/ใช้ทำบนกระดาน) */}
      {pick && pick.onCancel && (
        <button type="button" className="bs-cancel" onClick={() => { clickSound(); pick.onCancel(); }}>✕ ยกเลิก</button>
      )}

      {/* ปุ่มระยะอันตราย + หมุนกระดาน + ซูม */}
      <div className="bs-tools">
        <button type="button" className="bs-tool" title="หมุนซ้าย (Q)" onClick={() => { clickSound(); rotate(-1); }}>⟲</button>
        <button type="button" className="bs-tool" title="หมุนขวา (E)" onClick={() => { clickSound(); rotate(1); }}>⟳</button>
        <button type="button" className="bs-tool" title="ซูมเข้า" disabled={zoom >= ZOOM_STEPS - 1}
          onClick={() => { clickSound(); if (zoom === 0 && me && me.pos) look(me.pos); setZoom(zoom + 1); }}>＋</button>
        <span className="bs-zoom-lv" aria-hidden="true">{[...Array(ZOOM_STEPS - 1)].map((_, i) => <i key={i} data-on={i < zoom ? "true" : "false"} />)}</span>
        <button type="button" className="bs-tool" title="ซูมออก" disabled={zoom === 0}
          onClick={() => { clickSound(); setZoom(zoom - 1); }}>－</button>
        <button type="button" className="bs-tool bs-view" title={view === "top" ? "มุมเอียง" : "มุมบน"} data-on={view === "top" ? "true" : "false"}
          onClick={() => { clickSound(); toggleView(); }}>
          {view === "top"
            ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18 L9 7 H15 L19 18 Z" /><path d="M7 13 H17 M12 7 V18" /></svg>
            : <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" /><path d="M4 12 H20 M12 4 V20" /></svg>}
        </button>
        <button type="button" className="bs-danger" data-on={danger ? "true" : "false"} onClick={() => { clickSound(); setDanger((v) => !v); }}>
          ระยะอันตราย
        </button>
      </div>

      {/* ป้ายข้อมูลช่อง */}
      {tileInfo && (
        <div className="bs-tile">
          <div className="bs-tile-name">{tileInfo.icon ? `${tileInfo.icon} ` : ""}{tileInfo.name}</div>
          {tileInfo.desc && <div className="bs-tile-desc">{tileInfo.desc}</div>}
        </div>
      )}

      {/* ป้ายโบนัสในฉากตี (ฝั่งผู้ตี / ฝั่งเป้า) */}
      {phase === "ATTACKING" && state.attack && <AttackTags key={`tags-${state.attack.id}`} a={state.attack} byId={byId} />}

      {/* หน้าคาดการณ์ผลการตี (แทน HUD ทั้งจอ) */}
      {fcPlan && me && createPortal(
        <ForecastScreen
          k={sk} me={me} foe={fcPlan.foe}
          fc={state.forecast ? state.forecast[fcPlan.foe.id] : null}
          counter={!!fcPlan.counter}
          accurate={!!(me.statuses && me.statuses.accurate > 0)}
          onConfirm={confirmAttack} onCancel={cancelForecast}
        />,
        document.body,
      )}
      {shake > 0 && !lowQ && <div className="bs-flash" key={`flash-${shake}`} />}
      {/* ฉากร่ายระบำเขม่า (เคท · shadowFx kind "storm") — เต็มจอ + กล้องซูมพื้นที่ม่านแดง */}
      <KateStorm lowQ={lowQ} socket={socket} onCinema={setCinema} warm={state.players.some((p) => p.character && p.character.id === "kate")} />
    </div>
  );
}
