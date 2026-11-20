// ============================================================
//  BoardStage — กระดานเดินได้ในเกมจริง (จอคอม/แท็บเล็ต · GRID_PLAN §11)
//  แปลง state จาก server → props ของ BoardCanvas + ส่ง socket ตอนผู้เล่นกด
//   · ตาของเรา: ฟ้า = เดินถึง · แดง = เดินแล้วตีถึง · ชี้ศัตรู = แผนเดินเข้าไปตี + หน้าต่างคาดการณ์ + ลูกศรถอย
//   · โหมดเลือกเป้า (pick) จาก Game.jsx: สกิล target / aoe / line
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
import { shopDims } from "./shopProps";
import * as Rules from "./boardRules";
import { socket } from "../socket";
import { clickSound, playSfx } from "../audio";
import { requestAttention } from "../attention";
import { ForecastScreen, OrderCall, TurnCall } from "./BoardScenes";
import { faceStyle } from "./charFace";
import { preloadIceArt } from "./iceFx";
import { preloadGyroArt } from "./gyroFx";
import { preloadDiegoArt } from "./diegoFx";
import { ELEMENTS, auraOf } from "../data/elements";
import ReactionPanel from "./ReactionPanel";
import { rosterAlive, sameSide, sideAlive, sideOf } from "../duo";
import { announceArenaLand, noteArenaShown, onArenaLandRequest, onArenaLeaveRequest, shouldLandOnMount } from "../journey/arena/arenaLandBus";
import KateStorm from "../oc/intro/KateStorm";
import "./boardStage.css";
import { setRoadtripState } from "./roadtrip/theme";
import { rtPropAt } from "./roadtrip/props";
import { rtDefOf } from "./roadtrip/theme";
import { key, samePos, sizeOfP, boxOfP, onBody, dimOf, isDoubleP, veiledP, fliesP, leashReach, teamOfP, GHOST_ALPHA, reachOf, stepOf, EOS_MOB_RANGE, threatOf, BIG_ART, dirToward, screenDir, HEX_PTS, ICE_DIRS, squareKeys } from "./stage/stageRules";
import { AttackTags, UpNext } from "./stage/StageBits";
import useStateDiffFx from "./stage/useStateDiffFx";
import useBoardEventFx from "./stage/useBoardEventFx";
import useIceFx from "./stage/useIceFx";
import useCharSocketFx from "./stage/useCharSocketFx";
import useCharLayers from "./stage/useCharLayers";
import useTileInfo from "./stage/useTileInfo";


export default function BoardStage({ state, me, onRtSelect, lowQ, vp, pick, onInspect, registerOther, hidden, atkSignal = 0, onAttackables, onOverlay, statusOf }) {
  const phase = state.gameState;
  const map = useMemo(() => Rules.normalizeMap(state.board), [state.board]);
  const mapRef = useRef(map);
  useLayoutEffect(() => { mapRef.current = map; });
  const teamMode = state.gameMode === "duo" || state.gameMode === "trio" || state.gameMode === "eos"; // eos = PVE ทุกคนทีมเดียว
  // โหมดร่วมมือ (duo/trio/Moon Cell): หมากเพื่อนร่วมทีมมีวงเขียว + ป้าย "ทีม" (ผู้ใช้สั่ง 2026-10-27)
  const coopMode = teamMode || state.gameMode === "moon";
  // ร้านบนกระดาน (state.shops — สูงสุด 3 ร้าน · ร้านปกติ 1×1 · พ่อค้าเร่ 2×1 · Colony = แคปซูล 1 ช่อง): ทุกช่องของร้านขวางทาง/ยืนไม่ได้
  const shops = useMemo(() => (Array.isArray(state.shops) ? state.shops.filter((sh) => sh && Number.isFinite(sh.x) && Number.isFinite(sh.y)) : []), [state.shops]);
  const shopSig = shops.map((sh) => `${sh.x},${sh.y},${shopDims(sh).join(",")}`).join("|");
  const shopTiles = useMemo(() => {
    const out = [];
    for (const part of shopSig ? shopSig.split("|") : []) {
      const [x, y, w, h] = part.split(",").map(Number);
      for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) out.push(key(Rules.wx(x + dx), y + dy));
    }
    return out;
  }, [shopSig]);
  // ร่างของตัวที่ล้ม (ระบบคู่ — p.corpse): ขวางช่อง เดินข้ามได้ หยุดทับไม่ได้ → อยู่ทั้งใน blocked และ hop (ตรงกับ server)
  const corpseSig = state.players.filter((p) => p.corpse && Number.isFinite(p.corpse.x) && Number.isFinite(p.corpse.y)).map((p) => `${p.id}@${key(p.corpse.x, p.corpse.y)}`).join("|");
  const corpses = useMemo(() => (corpseSig ? corpseSig.split("|").map((s) => { const [id, k] = s.split("@"); const [x, y] = k.split(",").map(Number); return { id, x, y }; }) : []), [corpseSig]);
  const hop = useMemo(() => (corpses.length ? new Set(corpses.map((c) => key(c.x, c.y))) : null), [corpses]);
  const blocked = useMemo(() => {
    if (!shopTiles.length && !hop) return null;
    const b = new Set(hop || []);
    for (const k of shopTiles) b.add(k);
    return b;
  }, [shopTiles, hop]);
  // Road Trip: กลางวัน/กลางคืนตามระยะทาง (state.roadtrip.night) · ส่ง state.roadtrip ให้ตัววาดกระดาน (theme.setRoadtripState — ภูมิภาค/fx/รถตู้) ทั้งจุดพักและตอนต่อสู้
  const rtWorld = (state.world === "roadtrip" || state.gameMode === "roadtrip") && !!state.roadtrip;
  const night = rtWorld ? !!state.roadtrip.night : state.cycle === "night";
  if (rtWorld) setRoadtripState(state.roadtrip, state.youId, (state.players || []).filter((p) => p.duoOf === state.youId).map((p) => p.id)); // + ตัวที่สองของระบบคู่ = ของเครื่องนี้
  const rtUnit = rtWorld && me && me.id !== state.youId ? { unitId: me.id } : {}; // จุดพัก: ระบบคู่คุมตัวที่สอง (Game.jsx rtSel)

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
  const optsOf = (p) => ({ isAlly, blocked, hop, smash: !!(p && p.smash), lane: !!(p && p.lane), ghost: veiledP(p) || fliesP(p), flowerWalk: !!(p && p.flowerWalk), swim: !!(p && p.swim), flatWalk: !!(p && p.flatWalk), carWalk: !!(p && p.carWalk), zone: (p && p.strikeZone) || null });
  // ช่องที่ p ตีปกติถึงจากช่อง (x, y) — แนวตรง (lane) หรือระยะแมนฮัตตัน
  const strikeTiles = (p, x, y, range) => (p && p.lane ? Rules.laneTiles(map, x, y, sizeOfP(p), range) : Rules.tilesInRange(map, x, y, range, sizeOfP(p)));
  // ตัวที่เหมือนกัน (summon double) = ฝ่ายกลาง: ทุกคนในชั้นเดียวกันตีได้ (ไม่ใช่เพื่อนใคร)
  //  กล่องของลาพลัส (summon laplace) = ฝ่ายกลางเหมือนกัน ยกเว้นเจ้าของกล่อง
  const isEnemy = (p) => !!p && !!me && p.id !== me.id && sameDim(p)
    && !(p.summon && p.summon.kind === "laplace" && p.summon.ownerId === me.id)
    && (isDoubleP(p) || (!sameSide(p, me) && !(teamMode && me.teamId && p.teamId === me.teamId)));
  // ตีปกติใส่เพื่อนร่วมทีมได้ (me.allyStrike — โจรุโน่: ฟื้นพลังชีวิต · server action.strikeAlly)
  const isAllyHit = (p) => !!p && !!me && !!me.allyStrike && p.id !== me.id && !!p.pos && sameDim(p) && !isDoubleP(p) && !p.summon
    && (sameSide(p, me) || (teamMode && !!me.teamId && p.teamId === me.teamId));
  // ถูกล่อเป้า (โล่ผู้พิทักษ์ — server action.tauntOf): เล็งศัตรูได้เฉพาะตัวล่อ (ตีปกติ + สกิลเลือกเป้า)
  //  + โซ่ Soul Chain (server/soulChain.js apart): ติดโซ่ = เล็ง/ตีได้แค่คู่โซ่ · คนที่ติดโซ่กับคนอื่น = เล็งไม่ได้
  const chainOk = (p) => !me || !p || p.id === me.id || ((!me.soulChain || me.soulChain.with === p.id) && (!p.soulChain || p.soulChain.with === me.id));
  const tauntOk = (p) => chainOk(p) && (!me || !Array.isArray(me.taunt) || !me.taunt.length || !isEnemy(p) || me.taunt.includes(p.id));

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
  const [rxOpen, setRxOpen] = useState(false); // ตารางปฏิกิริยาธาตุ (มุมขวาบน · GRID_PLAN §8.7 — ผู้ใช้สั่ง)
  // อยู่บนกระดาน = ปุ่มระบบมุมขวาบน (.ocv) ใช้ทรงโค้งเดียวกับแถวปุ่มกระดาน (volume.css :root[data-board])
  useEffect(() => {
    document.documentElement.dataset.board = "1";
    return () => { delete document.documentElement.dataset.board; };
  }, []);
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
  const lookTo = useCallback((pos) => { if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) setFocus({ x: pos.x, y: pos.y }); }, []);
  // กล้องตามเหตุการณ์อัตโนมัติ (ตีพิเศษ/เดิน/ฉาก ฯลฯ) — สนาม Eos ไม่ตามเลย (ผู้ใช้สั่ง 2026-11-14 "ไม่ต้องขยับตามกิจกรรมต่างๆ รวมถึงเวลาถึงเทิร์นใคร")
  //  กล้องที่ผู้เล่นสั่งเอง (Tab · Space กลับตัวเรา · กดป้ายสถานการณ์) ใช้ lookTo
  const autoCamOn = state.world !== "eos";
  const autoCam = useRef(autoCamOn);
  useEffect(() => { autoCam.current = autoCamOn; }, [autoCamOn]);
  const look = useCallback((pos) => { if (autoCam.current) lookTo(pos); }, [lookTo]);
  // Tab / Shift+Tab = เลื่อนกล้องไปดูหมากตัวถัดไป/ก่อนหน้า (วนตามลำดับในรายชื่อ — รวมตัวเรา · ผู้ใช้สั่ง 2026-11-09)
  const tabIdx = useRef(-1);
  const unitsRef = useRef([]);
  useEffect(() => { unitsRef.current = state.players.filter((p) => p.alive && p.pos && !(p.summon && !p.duoOf)); }, [state.players]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== "Tab" || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      const list = unitsRef.current;
      if (!list.length) return;
      e.preventDefault();
      tabIdx.current = (tabIdx.current + (e.shiftKey ? -1 : 1) + list.length) % list.length;
      lookTo(list[tabIdx.current].pos);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lookTo]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
      // ใช้ตำแหน่งปุ่ม (e.code) ไม่ใช่ตัวอักษร — แป้นโหมดไทย Q/E พิมพ์เป็น ๆ/ำ
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // สนาม Eos: กลับมาหมุนทีละ 90° (กดครั้งเดียว — ผู้ใช้สั่ง 2026-11-10 · เดิมค้าง Q/E หมุนอิสระ)
      if (e.code === "KeyQ") rotate(-1);
      else if (e.code === "KeyE") rotate(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rotate, state.world]);
  const hoverUnit = hover ? state.players.find((p) => p.alive && onBody(p, hover) && sameDim(p)) : null; // คนคนละชั้น = ชี้ไม่ติด
  // หนามน้ำแข็ง (Ice Spike): ทุกคนตีได้ — หน่วยเทียม (ชี้ = แผนเดินเข้าไปตี · คลิก = ตีเลย ไม่มีหน้าคาดการณ์)
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
  const hoverSpike = hover && !hoverUnit ? spikeFoes.find((s) => samePos(s.pos, hover)) || null : null;
  // เกรย์ (สัปเหร่อ): ศพบนกระดาน = เป้าตีปกติ (เก็บศพ) — หน่วยเทียมแบบหนามน้ำแข็ง · ตีได้เฉพาะประชิด 1 ช่องเสมอ (planFor) · ไม่อยู่ในปุ่มโจมตี
  const reaper = !!(me && me.gray && me.gray.reaper);
  const corpseFoes = useMemo(() => (reaper ? corpses.map((c) => ({ id: `corpse:${c.id}`, pos: { x: c.x, y: c.y }, alive: true, size: 1, isCorpse: true, name: "ศพ" })) : []), [reaper, corpses]);
  const hoverCorpse = hover && !hoverUnit && !hoverSpike ? corpseFoes.find((s) => samePos(s.pos, hover)) || null : null;
  // Fodlan (board/fodlan/): ข้อมูลวาดของด่าน + ของที่ตีได้ (เสาเวทมืด ต้นไม้แห้ง กองหิมะ … — id "fd:…") = หน่วยเทียมแบบหนามน้ำแข็ง
  const fdBoard = state.fodlan && state.fodlan.board ? state.fodlan.board : null;
  const fodlanProp = useMemo(() => (fdBoard ? { ...fdBoard, stage: state.fodlan.stage, weather: state.fodlan.weather, vision: state.fodlanVision || null } : null),
    [fdBoard, state.fodlan, state.fodlanVision]);
  //  + Colony: ป้อมปืนรักษาการณ์ (id "col:turret:i" — server/colony.js strikeTurret) ใช้ทางเดียวกัน
  const colTurrets = state.colony && Array.isArray(state.colony.turrets) ? state.colony.turrets : null;
  const fdFoes = useMemo(() => [
    ...(fdBoard && Array.isArray(fdBoard.objects)
      ? fdBoard.objects.filter((o) => o && o.strike && Number.isFinite(o.x) && Number.isFinite(o.y)).map((o) => ({ id: o.id, pos: { x: o.x, y: o.y }, alive: true, size: 1, isFodlan: true, name: o.name || "" }))
      : []),
    ...(colTurrets || []).map((t) => ({ id: `col:turret:${t.i}`, pos: { x: t.x, y: t.y }, alive: true, size: 1, isFodlan: true, name: "ป้อมปืนรักษาการณ์" })),
  ], [fdBoard, colTurrets]);
  const hoverFd = hover && !hoverUnit && !hoverSpike && !hoverCorpse ? fdFoes.find((s) => samePos(s.pos, hover)) || null : null;
  const hasIceSpike = state.players.some((p) => p.character && p.character.id === "ice_spike");
  useEffect(() => { if (hasIceSpike) preloadIceArt(); }, [hasIceSpike]);
  const hasGyro = state.players.some((p) => !!p.gyro);
  useEffect(() => { if (hasGyro) preloadGyroArt(); }, [hasGyro]);
  const hasDiego = state.players.some((p) => !!p.diego);
  useEffect(() => { if (hasDiego) preloadDiegoArt(); }, [hasDiego]);
  // เริ่มตาเรา → กล้องมาที่ตัวเรา (ปรับ state ระหว่าง render ตามตาที่เปลี่ยน — ไม่ต้องรอ effect)
  //  ตาคนอื่นไม่ดึงกล้องไปหา (ผู้ใช้สั่ง 2026-11-10) · ตัวคู่/ยูนิตที่เราคุม = ตาเรา · คนดู (ไม่มีตัว) = ตามทุกตาเหมือนเดิม
  const [lookedTurn, setLookedTurn] = useState("");
  const turnKey = phase === "ACTION" && state.actorId ? `${state.roundNumber}|${state.actorId}` : lookedTurn;
  if (turnKey !== lookedTurn) {
    setLookedTurn(turnKey);
    const a = byId[state.actorId];
    const mine = !me || (a && (a.id === me.id || a.duoOf === me.id || (a.summon && a.summon.ownerId === me.id)));
    if (a && a.pos && mine && autoCamOn) setFocus({ x: a.pos.x, y: a.pos.y });
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
    const allyHit = isAllyHit(foe);
    if (!myTurn || strikeOff || pick || !myReach || !foe || !(isEnemy(foe) || allyHit) || !foe.pos || !foe.alive || (!allyHit && !tauntOk(foe))) return null;
    const range = foe.isCorpse ? [1, 1] : me.range || [1, 1];
    const laneOn = !foe.isCorpse && me.lane;
    // กรอบที่ตีได้ (me.strikeZone — ลอว์: ตัวเองยืนใน Room และเป้าทับ Room) — server ฮุค strikeAllows คัดแบบเดียวกัน
    const zone = !foe.isCorpse && me.strikeZone ? me.strikeZone : null;
    const inZone = (x, y) => !zone || (x >= zone.x0 && x <= zone.x1 && y >= zone.y0 && y <= zone.y1);
    if (zone && !Rules.footprint(foe.pos.x, foe.pos.y, sizeOfP(foe)).some((t) => inZone(t.x, t.y))) return null;
    // ตีรอบตัว 8 ช่อง รวมทแยง (me.strikeRing — กิลกาเมช ถือ EA): ช่องยืนต้องติดเป้า (เชบีเชฟ 1)
    const ring = !foe.isCorpse && !!me.strikeRing;
    const cheb1 = (n) => { const a = { x: n.x, y: n.y, size: sizeOfP(me) }, b = boxOfP(foe); const dx = Math.max(0, a.x - (b.x + b.size - 1), b.x - (a.x + a.size - 1)), dy = Math.max(0, a.y - (b.y + b.size - 1), b.y - (a.y + a.size - 1)); return Math.max(dx, dy) === 1; };
    // โดมกำแพงเวท (Eos — server Fodlan.shields): เป้าอยู่ในโดม = ต้องยืนในโดมด้วยจึงตีถึง
    const dome = !foe.isCorpse && fdBoard && fdBoard.dome && Array.isArray(fdBoard.dome.rect) ? fdBoard.dome.rect : null;
    const inDome = (x, y) => x >= dome[0] && x <= dome[2] && y >= dome[1] && y <= dome[3];
    const foeDomed = !!dome && Rules.footprint(foe.pos.x, foe.pos.y, sizeOfP(foe)).some((t) => inDome(t.x, t.y));
    const domeOk = (n) => !foeDomed || Rules.footprint(n.x, n.y, sizeOfP(me)).some((t) => inDome(t.x, t.y));
    // ตีโดนทุกศัตรูในระยะรอบตัว (me.strikeArea — ยังไม่มีตัวไหนใช้): เล็งแบบระยะปกติ · ไฮไลต์ทุกช่องในระยะ
    const area = !foe.isCorpse && !!me.strikeArea;
    const hits0 = (n) => ring ? inZone(n.x, n.y) && cheb1(n) : inZone(n.x, n.y) && (laneOn ?!!Rules.laneOf(map, n.x, n.y, sizeOfP(me), range, boxOfP(foe), me.lane === "face") : Rules.inRange(range, Rules.dist({ x: n.x, y: n.y, size: sizeOfP(me) }, boxOfP(foe))));
    // ตีเป็นกรอบ (me.strikeRect): เป้าต้องอยู่ในกรอบจากช่องที่ยืน (server canStrike คัดแบบเดียวกัน)
    const rectOk = (n) => laneOn || ring || foe.isCorpse || !Array.isArray(me.strikeRect) || !!Rules.rectToward(map, n.x, n.y, sizeOfP(me), boxOfP(foe), me.strikeRect[0], me.strikeRect[1]);
    const hits = (n) => domeOk(n) && hits0(n) && rectOk(n);
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
    const ringLane = ring ? { tiles: (() => { const out = [], sz = sizeOfP(me); for (let y = stand.y - 1; y <= stand.y + sz; y++) for (let x = stand.x - 1; x <= stand.x + sz; x++) { if (x >= stand.x && x < stand.x + sz && y >= stand.y && y < stand.y + sz) continue; if (x >= 0 && y >= 0 && x < (map.cols || 14) && y < (map.rows || 14)) out.push({ x, y }); } return out; })() } : null;
    const areaLane = area && !ring ? { tiles: Rules.tilesInRange(map, stand.x, stand.y, range, sizeOfP(me)) } : null;
    const lane = ringLane || areaLane || (laneOn ? Rules.laneOf(map, stand.x, stand.y, sizeOfP(me), range, boxOfP(foe), me.lane === "face", me.laneLen || 0) : rect); // laneLen: เรียวกิ เล็งประชิด ฟันยาว 2 ช่อง
    // ตีสวนเฉพาะคนที่มีความสามารถ (foe.counter — ตอนนี้ไม่มีใคร)
    const counter = !allyHit && !!foe.counter && Rules.canCounter(foe.range || [1, 1], stand, foe.pos);
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
    return { foe, ally: allyHit, stand, path: best.here ? null : Rules.pathTo(myReach, stand.x, stand.y), counter, push, lane: lane ? lane.tiles.map((t) => key(t.x, t.y)) : null };
  }, [myTurn, strikeOff, pick, myReach, me, ruleUnits, map, blocked, fdBoard]); // eslint-disable-line react-hooks/exhaustive-deps
  const plan = useMemo(() => (hoverUnit ? planFor(hoverUnit) : hoverSpike ? planFor(hoverSpike) : hoverCorpse ? planFor(hoverCorpse) : hoverFd ? planFor(hoverFd) : null), [planFor, hoverUnit, hoverSpike, hoverCorpse, hoverFd]);
  // ศัตรูที่ตาเราตีถึง (ใกล้สุดก่อน) — ปุ่ม "โจมตี" ใช้ · ส่งให้ Game เฉพาะตอนรายการเปลี่ยน
  const attackables = useMemo(() => {
    if (!myTurn || pick) return [];
    return state.players.map((p) => planFor(p)).filter(Boolean).sort((a, b) => (a.ally ? 1 : 0) - (b.ally ? 1 : 0) || (a.path ? a.path.length : 0) - (b.path ? b.path.length : 0)).map((pl) => pl.foe.id); // ศัตรูก่อนเพื่อน (ตีเพื่อน = ฮีล)
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

  // ---------- โหมดเลือกเป้า (สกิล) ----------
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
    if (pick.kind === "aoe") return { aoe: Rules.aoeTiles(map, me.pos.x, me.pos.y, pick.radius, sizeOfP(me), !!pick.square).map((t) => key(t.x, t.y)) };
    if (pick.kind === "line") {
      const dir = dirToward(me.pos, hover, sizeOfP(me)) || pick.lastDir || "up";
      return { dir, aoe: Rules.lineTiles(map, me.pos.x, me.pos.y, dir, pick.len, pick.width, sizeOfP(me), pick.arc || 0, !!pick.cone, Number.isFinite(pick.fan) ? pick.fan : -1, pick.pad | 0, Array.isArray(pick.boxes) ? pick.boxes : null).map((t) => key(t.x, t.y)) };
    }
    if (pick.kind === "tile" && pick.place === "list") {
      // ปุ่มพิเศษที่มี tiles (actions[].tiles): ช่องในรายการ = มุมบนซ้ายของตัว · ตัวใหญ่ = ทุกช่องในกรอบเลือกได้
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
        // ธารน้ำแข็งวางบนแม่น้ำ Fodlan ด่าน I ได้ (TERRAIN_INFO iceBridge → สะพานน้ำแข็ง · server/ice.js openTile bridge)
        const bridge = pick.place === "ice" && !!(Rules.TERRAIN_INFO[map.terrain[key(t.x, t.y)]] || {}).iceBridge && !(blocked && blocked.has(key(t.x, t.y)));
        if (!bridge && Rules.isObstacle(map, t.x, t.y, blocked)) return false;
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
      // เลือกหลายช่อง (pick.count — ลอว์: Shambles / Shamble 2 อย่าง): ช่องที่เลือกซ้ำ = ยกเลิก · ครบ = ส่งทั้งชุด (multi เก็บเป็น "x,y")
      const need = Math.max(1, pick.count | 0);
      if (need > 1) {
        const k = key(a.x, a.y);
        if (multiIds.includes(k)) { setMulti({ sig: pickSig, ids: multiIds.filter((q) => q !== k) }); return; }
        const ids = [...multiIds, k];
        if (ids.length >= need) { setMulti({ sig: "", ids: [] }); pick.onPick(ids.map((s) => { const [tx, ty] = s.split(",").map(Number); return { x: tx, y: ty }; })); return; }
        setMulti({ sig: pickSig, ids });
        return;
      }
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
    if (pick.band) { pick.onPick({ x, y }, null, wallOrient); return; } // Mahapralaya: แถบเต็มแผนที่ตามแนวที่หมุนไว้
    const u = pick.place === "spike" ? Rules.unitAt(ruleUnits, x, y) : null;
    if (u) {
      const arrows = ICE_DIRS.map(([dir, dx, dy]) => ({ x: x + dx, y: y + dy, dir, ok: Rules.freeTile(map, x + dx, y + dy, ruleUnits, u.id, blocked) }))
        .filter((a) => a.x >= 0 && a.y >= 0 && a.x < map.cols && a.y < map.rows);
      setDirPick({ sig: pickSig, x, y, arrows });
      return;
    }
    pick.onPick({ x, y });
  };

  // ---------- สนาม Eos: ระยะตีจริงของมอนตามนิสัย (ผู้ใช้ 2026-11-14 "ทำทุกข้อ" — บอกว่ามอนตัวไหนจะตีเราได้เทิร์นหน้า) ----------
  //  พลธนู 4 · ซุ่มยิง/พ่นใย 3 · โซ่ลาก 2–4 · วาร์ป ทุกช่องในระยะ 8 · หมอ/รัง/โชโกโบะทอง/ยักษ์หิน ไม่ตีปกติ
  const eosMobTrait = useMemo(() => {
    const fd = state.fodlan && state.fodlan.board, out = {};
    if (!fd || !fd.eos) return null;
    for (const d of fd.daemons || []) out[d.id] = d.trait || "daemon";
    for (const m of fd.mobs || []) out[m.id] = m.type === "nest" || m.type === "gold" || m.type === "giant" ? "none" : m.trait || m.type;
    return out;
  }, [state.fodlan]);
  const zoneOf = (p) => {
    const tr = eosMobTrait && eosMobTrait[p.id];
    if (tr === "none" || tr === "healer") return null;
    const rg = EOS_MOB_RANGE[tr] || p.range || [1, 1];
    const z = threatOf(map, unitOf(p), p.mov || 0, rg, ruleUnits, optsOf(p));
    if (tr !== "blinker") return z;
    const th = new Set(z.threat);
    for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) if (Math.abs(dx) + Math.abs(dy) <= 8) th.add(key(p.pos.x + dx, p.pos.y + dy));
    return { move: z.move, threat: [...th] };
  };
  // ---------- ระยะอันตราย: ช่องที่ศัตรูทุกคนเดินแล้วตีถึง ----------
  const dangerKeys = useMemo(() => {
    if (!danger || !map || !me) return null;
    const out = new Set();
    for (const p of state.players) {
      if (!p.alive || !p.pos || !isEnemy(p)) continue;
      const z = zoneOf(p);
      if (!z) continue;
      for (const k of z.move) out.add(k);
      for (const k of z.threat) out.add(k);
    }
    return [...out];
  }, [danger, map, me, state.players, ruleUnits, isAlly, blocked, eosMobTrait]); // eslint-disable-line react-hooks/exhaustive-deps
  // Eos: มอนที่ตีถึงตัวเราได้เทิร์นหน้า (ไม่ต้องเปิดระยะอันตราย) → ❗ เหนือหัวมอน (board/fodlan/stage6.js mobBadges)
  const threatIds = useMemo(() => {
    const out = new Set();
    if (!eosMobTrait || !map || !me || !me.alive || !me.pos) return out;
    const mine = Rules.footprint(me.pos.x, me.pos.y, sizeOfP(me)).map((t) => key(t.x, t.y));
    for (const p of state.players) {
      if (!p.alive || !p.pos || !isEnemy(p) || !(p.id in eosMobTrait)) continue;
      const z = zoneOf(p);
      const th = z && z.threat ? (z.threat instanceof Set ? z.threat : new Set(z.threat)) : null; // threatZone คืน Set (เดิมเรียก .includes = จอขาวทั้งกระดาน)
      if (th && mine.some((k) => th.has(k))) out.add(p.id);
    }
    return out;
  }, [eosMobTrait, map, me, state.players, ruleUnits]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- แอนิเมชัน: เดิน (จาก action.path) / ถอย (ฉากตี) ----------
  const [animQ, setAnimQ] = useState([]);
  const anim = animQ[0] || null;
  const [glides, setGlides] = useState({}); // ช่วง Clock Up: id → { key, path, stepMs } เดินพร้อมกัน (socket "clockWalk")
  const [fx, setFx] = useState([]);
  const fxSeq = useRef(0);
  const pushFx = useCallback((list) => setFx((old) => [...old.slice(-30), ...list.map((f) => ({ ...f, key: ++fxSeq.current }))]), []);
  // อีโมตระหว่างแมตช์ (socket "gameEmote" { id, emoji }): ฟองเหนือตัวนั้น — วาดเฉพาะตัวที่เราเห็นบนกระดาน (ชั้นมิติเดียวกัน · ไม่มืดบอด)
  //  หมุดทีม (socket "teamPing" { x, y, by, color }): วงกระเพื่อมที่ช่อง (server ส่งเฉพาะเพื่อนร่วมทีม) · Alt + คลิกช่อง = ปัก
  useEffect(() => {
    const onEmote = ({ id, emoji } = {}) => {
      const u = unitsRef.current.find((p) => p.id === id);
      if (!u || u.masked || !emoji) return;
      pushFx([{ kind: "emote", x: u.pos.x, y: u.pos.y, size: sizeOfP(u), emoji, color: u.color }]);
    };
    const onPing = ({ x, y, color } = {}) => {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      pushFx([{ kind: "teamPing", x, y, color: color || "#3d8bd9" }]);
      playSfx("notificate");
    };
    socket.on("gameEmote", onEmote);
    socket.on("teamPing", onPing);
    return () => { socket.off("gameEmote", onEmote); socket.off("teamPing", onPing); };
  }, [pushFx]);
  const onPing = useCallback((x, y) => { if (coopMode && me) socket.emit("teamPing", { x, y }); }, [coopMode, me]);
  const [hold, setHold] = useState({}); // id → ช่องที่ค้างไว้ระหว่างฉากตี (ก่อนแอนิเมชันถอยเริ่ม)
  // สนาม Eos: มอนเดินมาแล้วค่อยตี (fx delay) → หลอดเลือด/เกราะของคนที่โดนค้างค่าเดิมจนถึงจังหวะตี (ผู้ใช้ 2026-11-14)
  const [vitHold, setVitHold] = useState({}); // id → { hp, armor }
  const eosFxSeq = useRef(null);
  const [cinema, setCinema] = useState(null); // กล้องฉากตี { a, b, z }
  const [ghost, setGhost] = useState(null);   // เป้าที่ตกรอบในฉากตี (วาดค้างไว้จนถึงจังหวะปะทะ)
  const [shake, setShake] = useState(0);      // จอสั่น/แฟลช (เลขเปลี่ยน = เล่นใหม่)
  const prevPlayers = useRef({});
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
  const hitFx = useRef({}); // ชื่อเหตุการณ์ → ตัวเล่น · card.hitFx (engine.boardFxAtHit) เล่นตรงจังหวะปะทะ
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
  const lawHitAt = useRef(0); // ลอว์: เวลาที่ฉากตีปกติของลอว์ถึงจังหวะปะทะ (เหตุการณ์ gamma / mess / mark รอถึงตอนนั้น)
  const iceRun = useRef(null); // { ids, active, gotState, done, pos, snap, snd }
  const iceSeen = useRef(null);
  const finishIceRef = useRef(null); // finishIce ล่าสุด (ประกาศทีหลัง — effect ด้านล่างเรียกผ่านตัวนี้)
  const prevBoard = useRef(state.board || null);

  useStateDiffFx({ autoCam, byId, celineHitAt, dashHold, dashSkip, diegoDeferMs, eosFxSeq, finishIceRef, fxSeq, hitFx, hkPushTo, iceRun, isShadowBusy, later, lawHitAt, look, lowQ, me, phase, prevBoard, prevPlayers, prevPos, prevVit, pushFx, rtWorld, ryougiHitAt, ryougiSlain, seeded, seenAttack, seenDash, setAnimQ, setCinema, setDiegoGhosts, setFaces, setGhost, setGlides, setHold, setIceLv, setShake, setVitHold, setWallHold, state, wallClaim });

  const boardRef = useRef(state.board);
  useLayoutEffect(() => { boardRef.current = state.board; });
  useBoardEventFx({ boardRef, hitFx, hkPushTo, look, lowQ, prevPlayers, pushFx, setShake, state, timers });

  // ---------- Ice Spike: เหตุการณ์บนกระดาน (socket "iceFx" { seq, events } — .claude/plans/ice-spike-contract.md §4) ----------
  //  เล่นตามลำดับ: เหตุการณ์ที่ขยับตัว (walk/slide/knock) = คิวแอนิเมชัน (ต่อเหตุการณ์ถัดไปเมื่อแอนิเมชันนั้นจบ — anim.then)
  //  เหตุการณ์อื่น = เกิดทันทีแล้วรอสั้นๆ (ค้างภาพตอนชนเต็ม/ฉากคุก) · จบทั้งชุด = ปล่อยภาพที่ค้างไว้ให้ตรง state ผลสุดท้าย
  const byIdRef = useRef(byId);
  useLayoutEffect(() => { byIdRef.current = byId; });
  const myIdRef = useRef(null); // ตัวที่เราคุมอยู่ (onClockWalk: วิ่งจบแล้วส่งตีที่รอไว้)
  const pendingAttack = useRef(null); // เดินแล้วตีต่อ: เป้าที่รอตีหลังเดินถึงช่องยืน
  useLayoutEffect(() => { myIdRef.current = me ? me.id : null; });
  useIceFx({ boardRef, byIdRef, finishIceRef, fxSeq, iceRun, iceSeen, isShadowBusy, later, look, lowQ, prevPlayers, pushFx, setAnimQ, setFaces, setIceGhosts, setIceHold, setIceLv, setIceMask, setShake });

  useCharSocketFx({ boardRef, byIdRef, celineHitAt, dashSkip, diegoDefer, hitFx, lawHitAt, look, lowQ, mapRef, myIdRef, pendingAttack, prevPlayers, pushFx, ryougiHitAt, ryougiSlain, setDiegoGhosts, setFaces, setGlides, setShake, shadowBusy, timers, wallClaim });
  // สนาม Colony (GRID_PLAN §8.3): เหตุการณ์ของสนาม → ฉาก 3D ใน BoardCanvas (colony3d.js onEvent) · ค้างไว้ 24 อันล่าสุด (key กันเล่นซ้ำ)
  const [colonyEvents, setColonyEvents] = useState([]);
  // หอสังเกตการณ์: เป้าอีเวนต์ของเทิร์น +2 ที่เห็นเฉพาะเรา (me.colony.foresee) รวมเข้าชั้นเตือน (ติดธง foresee — วาดจางกว่า)
  const myForesee = me && me.colony && Array.isArray(me.colony.foresee) ? me.colony.foresee : null;
  const colonyView = useMemo(() => (state.colony && myForesee && myForesee.length
    ? { ...state.colony, tele: [...(state.colony.tele || []), ...myForesee.map((t) => ({ ...t, foresee: true }))] }
    : state.colony || null), [state.colony, myForesee]);
  const [colonyHome, setColonyHome] = useState(0); // ปุ่มเป้า (Colony) = กล้องกลับมาที่ตัวเรา
  // สนาม Eos (GRID_PLAN §8.6): กล้อง RTS — Space / ปุ่มเป้า = กลับมาที่ตัวเรา
  const eosRts = state.world === "eos";
  const [camHome, setCamHome] = useState(0);
  // สนาม Eos: เข้าแมตช์ = กล้องระยะใกล้ชิดตามหมากเรา (ซูมเข้าสุด — ผู้ใช้สั่ง 2026-11-09) · ไม่บันทึกทับค่าซูมของแผนที่อื่น
  const [eosZoomed, setEosZoomed] = useState(false);
  if (eosRts && !eosZoomed) { setEosZoomed(true); setZoomState(ZOOM_STEPS - 2); } // ช่วงซูมกว้างขึ้น (2026-11-10: 24↔6 ช่อง) → ขั้นรองสุด ≈ 8.5 ช่อง เท่ากล้องเริ่มเดิม
  if (!eosRts && eosZoomed) setEosZoomed(false);
  const goHome = useCallback(() => { if (me && me.pos) lookTo(me.pos); setCamHome((n) => n + 1); }, [me, lookTo]);
  // สนาม Eos: แผงสถานการณ์ / ประกาศ กดแล้วกล้องไปดูจุดนั้น (window event "eos:look" { x, y })
  useEffect(() => {
    const onLook = (e) => { const at = e.detail; if (at && Number.isFinite(at.x) && Number.isFinite(at.y)) lookTo({ x: at.x, y: at.y }); };
    window.addEventListener("eos:look", onLook);
    return () => window.removeEventListener("eos:look", onLook);
  }, [lookTo]);
  useEffect(() => {
    if (!eosRts) return undefined;
    const onKey = (e) => {
      if (e.code !== "Space" || e.ctrlKey || e.metaKey || e.altKey || e.repeat || (e.target && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName))) return;
      e.preventDefault();
      goHome();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [eosRts, goHome]);
  const [colonyAway, setColonyAway] = useState(false); // กล้อง Colony ออกห่างตัวเรา → ปุ่มกลับที่หมาก (หกเหลี่ยมรูปตัวเรา)
  useEffect(() => {
    let seq = 0;
    const kinds = ["colonyScene", "colonySeal", "colonyBoom", "colonyJump", "colonyLift", "colonyBelt", "colonyWarp", "colonyTurret", "colonyTurretHit"];
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
    const LAND_AT = { colonyJump: 1000, colonyLift: 900, colonyWarp: 900, colonyBelt: 700 };
    const followLand = (kind, data) => {
      const ms = LAND_AT[kind], to = data && (data.to || (Array.isArray(data.path) && data.path[data.path.length - 1]));
      if (ms && to && Number.isFinite(to.x) && Number.isFinite(to.y)) timers.current.push(setTimeout(() => look(to), ms));
    };
    const handlers = kinds.map((kind) => [kind, (data) => { holdDead(kind, data); followLand(kind, data); setColonyEvents((l) => [...l.slice(-23), { key: `${Date.now()}-${++seq}`, kind, data }]); }]);
    for (const [k, fn] of handlers) socket.on(k, fn);
    return () => { for (const [k, fn] of handlers) socket.off(k, fn); };
  }, [look]);

  // เดินแล้วตีต่อ: รอแอนิเมชันเดินจบก่อนค่อยสั่งตี (pendingAttack ประกาศไว้ข้างบน — onClockWalk ใช้ด้วย)
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
      if (pickInfo.list) {
        // กรอบเท่าตัวที่จะไปอยู่ (ตัวใหญ่ = กรอบ n×n แบบเดินตัวใหญ่)
        const a = hover ? pickInfo.anchorOf(hover.x, hover.y) : null;
        if (a) {
          const fp = Rules.footprint(a.x, a.y, pickInfo.foot).map((t) => key(t.x, t.y));
          h.aoe = fp;
          if (pickInfo.foot > 1) h.ghost = fp;
          // ระเบิดรอบจุดลง (ดิเอโก้ ย่ำกระหม่อม: ข้าวหลามตัดรัศมี blast)
          if (pick.blast > 0) h.aoe = [...fp, ...Rules.aoeTiles(map, a.x, a.y, pick.blast, 1).map((t) => key(t.x, t.y))];
        }
        // เลือกหลายช่อง (ลอว์: Shambles / Shamble): ช่องที่เลือกไว้แล้ว = กรอบทองค้าง
        if (multiIds.length) h.aoe = [...new Set([...(h.aoe || []), ...multiIds])];
      } else if (hover && pickInfo.validSet.has(key(hover.x, hover.y))) {
        h.aoe = pickInfo.wall ? wallPlan(hover, wallOrient).placed.map((t) => key(t.x, t.y))
          : pick.band ? Rules.bandTiles(map, hover.x, hover.y, wallOrient, pick.band).map((t) => key(t.x, t.y))
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
        const z = zoneOf(hoverUnit);
        if (z) h.danger = [...new Set([...(h.danger || []), ...z.move, ...z.threat])];
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
  const carDrivers = useMemo(() => new Set(((state.fodlan && state.fodlan.board && state.fodlan.board.cars) || []).map((c) => c.driver).filter(Boolean)), [state.fodlan]);
  // สนาม Eos: ขับรถ/ขี่โชโกโบะ = หลอดบนตัวเป็นเลือดของพาหนะ (เขียว) แทนเลือด/เกราะของคน (ผู้ใช้สั่ง 2026-11-10 — พาหนะรับดาเมจก่อน)
  const vehicleBars = useMemo(() => {
    const fd = state.fodlan && state.fodlan.board, out = {};
    if (!fd) return out;
    for (const c of fd.cars || []) if (c.driver && c.maxHp) out[c.driver] = { hp: c.hp ?? c.maxHp, maxHp: c.maxHp };
    for (const c of fd.chocos || []) if (c.rider && c.maxHp) out[c.rider] = { hp: c.hp ?? c.maxHp, maxHp: c.maxHp };
    return out;
  }, [state.fodlan]);
  const units = useMemo(() => state.players.filter((p) => p.alive && p.pos && !p.ride).map((p) => {
    const at = iceHold[p.id] || hold[p.id] || p.pos;
    const mk = !!p.masked; // "มืดบอด": ขาวล้วน ไม่มีชื่อ/รูป/แถบเลือด
    const other = dimOf(p) !== myDim; // คนละชั้นมิติ (วาเลนไทน์) = ภาพโปร่ง (ghostDim — ประกายใน valentineFx) · กดไม่ได้
    return {
      ...(other ? { alpha: GHOST_ALPHA, ghostDim: true } : null),
      // ยูนิตที่ถูกเรียก (วาเลนไทน์): ร่างแยก clone / ตัวที่เหมือนกัน double (look = id เป้าที่เลียนหน้าตา)
      summon: !mk && p.summon ? { kind: p.summon.kind, look: p.summon.look || null } : null,
      ...(carDrivers.has(p.id) ? { inCar: true } : null), // สนาม Eos: คนขับนั่งในรถ (boardDraw — ไม่มีฐาน/เสา รูปอยู่ในห้องโดยสาร)
      id: p.id, x: at.x, y: at.y, img: mk ? null : p.img, color: mk ? "#ffffff" : p.color, name: mk ? "" : p.name, masked: mk,
      size: sizeOfP(p), art: (!mk && p.character && BIG_ART[p.character.id]) || null, face: faces[p.id] || null,
      ...(vehicleBars[p.id] && !mk ? { hp: vehicleBars[p.id].hp, maxHp: vehicleBars[p.id].maxHp, armor: 0, maxArmor: 0 } : { hp: (vitHold[p.id] ? vitHold[p.id].hp : p.hp) ?? 0, maxHp: p.maxHp ?? 0, armor: (vitHold[p.id] ? vitHold[p.id].armor : p.armor) ?? 0, maxArmor: p.maxArmor ?? 0 }),
      isMe: !!me && p.id === me.id, isActor: p.id === state.actorId, teamId: p.teamId || null,
      ...(threatIds.has(p.id) ? { threat: true } : null), // Eos: มอนตัวนี้ตีถึงเราได้เทิร์นหน้า
      ally: coopMode && !mk && !!me && p.id !== me.id && !!me.teamId && p.teamId === me.teamId && !isDoubleP(p),
      // สนาม Eos (PVE — ผู้เล่นทุกคนทีมเดียวกัน): หลอดเลือดผู้เล่นสีเขียว (มอนวาดเองใน fodlan/stage6.js = แดง)
      hpTone: state.world === "eos" && !mk && !(p.summon && !p.summon.controlled) ? "ally" : null,
      dim: !!pickValid && !pickValid.has(p.id),
      // ซ่อนจากศัตรูอยู่ (นักบินปริศนาซ่อนตัว / ยืนในพุ่ม) — เราเห็นเพราะเป็นตัวเอง/ทีมเดียวกัน → วาดจางแบบเงา
      cloak: !!p.veiled,
      // ผู้เล่นหลุดอยู่ (socket.js — ตาเดินเหลือ 5 วิ): ป้ายสายหลุดมุมหมาก · ตัวคู่/ร่างแยกดูจากเจ้าของ (boardDraw.js drawOffline)
      offline: !mk && (() => { const ow = p.duoOf ? state.players.find((o) => o.id === p.duoOf) : p.summon ? state.players.find((o) => o.id === p.summon.ownerId) : p; return !!ow && ow.connected === false && !ow.summon; })(),
      // เคทยืนในม่านแดงของตัวเอง = ปีกเขม่ากางค้าง (มืดบอด = ไม่เห็น)
      wings: !mk && !!p.shadow && !!p.shadow.inStorm && (p.characterId || (p.character && p.character.id)) === "kate",
      // อินุอิ Start Up / ช่วง Clock Up (ไรเดอร์ ZECT — state.clockUp): ภาพค้างตามตัว (faizFx.js)
      faizTrail: state.clockUp && state.clockUp.members.some((m) => m.id === p.id && !m.over) ? (state.clockUp.members.some((m) => m.id === p.id && m.kind === "alter") ? "alter" : "clock") : !!(p.inui && p.inui.startUp && p.inui.startUp.running),
      // แม็กน่า สวิง (magnaFx.js): บอลไฟวนรอบตัว · แสงร้อนตาม OverHeat · Fire Knuckle/Boost · โซ่ (เจ้าของโซ่วาดไปหาคู่โซ่ — server soulChain.publicOf)
      magna: !mk && p.magna ? { balls: p.magna.balls | 0, heat: p.magna.heat | 0, knuckle: p.magna.knuckle | 0, boost: p.magna.boost | 0 } : null,
      chain: p.soulChain && p.soulChain.by === p.id ? { to: p.soulChain.with, armed: !!(p.magna && p.magna.armed) } : null,
      aura: p.midoriya && p.midoriya.cowl > 0 ? "midoriyaCowl" : p.shinra && p.shinra.warm > 0 ? "shinraBlaze" : p.shinra && p.shinra.hero > 0 ? "shinraHero" : p.kira && p.kira.king ? "kira" : p.kazuma && p.kazuma.king ? "kazumaKing" : p.inui && p.inui.exceed ? "faizExceed" : null, // กิระร่างราชาแมลงอวกาศ: หมอกดำแดง · คาซุมะ King Form: ตราโพทอง
      // ยูกินับถอยหลังเกิดใหม่เป็นประตู (p.yuki = { left, at } — ทุกคนเห็น): ออร่าฟ้า-ขาวไหลเข้าตัว + ตัวเลข · กระดานมืด (yukiFx.js)
      yuki: p.yuki && p.yuki.left > 0 ? { left: p.yuki.left | 0, at: p.yuki.at } : null,
      // ไจโร: ม้าใต้หมาก (mounted) · ออร่าทอง/เกลียวทองคำ (empowered) · ม้าโดนตี = แวบ (horseHp ลด) — gyroFx.js (มืดบอด = ไม่เห็น)
      gyro: !mk && p.gyro ? { mounted: !!p.gyro.mounted, empowered: !!p.gyro.empowered, horseHp: p.gyro.horseHp } : null,
      // ดิเอโก้: ซิลเวอร์ บูลเล็ตใต้หมาก (mounted) · ม้าโดนตี = แวบ · ชุ่มน้ำมัน/ติดตาข่าย = หยดน้ำมัน/ลวดรัดตัว (ใครก็ติดได้) — diegoFx.js
      diego: !mk && p.diego ? { mounted: !!p.diego.mounted, horseHp: p.diego.horseHp } : null,
      // รถบรรทุกเก่า: ร่างรถ = รถใต้หมาก · ผู้พิทักษ์ตั้งท่า = วงโล่ฟ้า (optimusFx.js)
      truck: !mk && p.oldTruck ? { form: p.oldTruck.form, stance: !!p.oldTruck.stance } : null,
      standee: !mk && p.freddy ? p.freddy.standee || null : !mk && p.foxy ? p.foxy.standee || null : !mk && p.master ? p.master.standee || null : !mk && p.dino ? p.dino.standee || null : null, // เฟรดดี้ / Master + ตัวอัญเชิญ / ดิเอโก้ อสูรกายดึกดำบรรพ์ (ร่างคน/ไดโนเสาร์ · ขี่ม้า = หกเหลี่ยม): ภาพตัวเต็มแทนหมาก
      // ดิเอโก้ อสูรกายดึกดำบรรพ์ (dinoFx.js): ร่าง/ความบ้าคลั่ง · ไวรัสบนตัว (ใครก็ติดได้) · กำลังถูกควบคุมร่าง (server/possess.js)
      dino: !mk && p.dino ? { form: p.dino.form, frenzy: p.dino.frenzy | 0 } : null,
      dvirus: !mk && p.statuses ? (p.statuses.dinoVirus | 0) : 0,
      possessed: !mk && !!p.possessedBy,
      master: !mk && p.master ? { phase: p.master.phase || 1, down: !!p.master.down, summon: p.master.summon || null } : null, // Master (masterFx.js): ออร่า/ท่าทาง
      // โจรุโน่: ลอยบนต้นไม้ (ใครก็ได้) · ต้นตอแห่งชีวิต · Muda · ร่าง Requiem (เปลวทอง) · รอผลธนู (แสงทอง) · วนตาย (ใครก็ติดได้) — giornoFx.js
      dio: !mk && p.dio && (p.dio.stopping || p.dio.blood >= 6) ? { stop: !!p.dio.stopping, blood: p.dio.blood } : null, // ดิโอ: ออร่าใต้หมาก (dioFx.js)
      elem: !mk ? auraOf(p) : null, // คราบธาตุ (elementFx.js · GRID_PLAN §8.7)
      // คุเรไน โอโตยะ (otoyaFx.js): ร่าง Dark Kiva / หลุมพราง / Wake Up 2 / กำลังสีไวโอลิน · เป้าดนตรีในหัวใจ (ใครก็ได้)
      otoya: !mk && p.otoya && (p.otoya.kiva || p.otoya.trap || p.otoya.wake2 || p.otoya.heartTo || p.otoya.heartBy) ? { kiva: !!p.otoya.kiva, trap: !!p.otoya.trap, wake2: !!p.otoya.wake2, playing: !!p.otoya.heartTo, heart: !!p.otoya.heartBy } : null,
      giorno: !mk && p.giorno && (p.giorno.tree || p.giorno.reflect || p.giorno.muda || p.giorno.requiem || p.giorno.arrowWait || p.giorno.loop) ? { tree: !!p.giorno.tree, reflect: !!p.giorno.reflect, muda: !!p.giorno.muda, requiem: !!p.giorno.requiem, arrowWait: !!p.giorno.arrowWait, loop: !!p.giorno.loop } : null,
      // อรชุน: จุติ (ใครก็ติดได้) · ขจัดสิ่งแปลกปลอม (arjunaBoardFx.js)
      arjuna: !mk && p.statuses && (p.statuses.jutti > 0 || p.statuses.arjunaPurge > 0) ? { jutti: p.statuses.jutti > 0, purge: p.statuses.arjunaPurge > 0 } : null,
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
  [state.players, state.actorId, state.clockUp, me, myDim, hold, vitHold, threatIds, pickValid, ghost, faces, iceHold, iceGhosts, diegoGhosts, corpses, byId, riderOn, coopMode, carDrivers, state.world, vehicleBars]);
  const { songs, grays, gils, ferns, gyroBalls, kiriGround, diegoGround, otoyaProp, ryougiProp, emiyaProp, lawProp, celineProp } = useCharLayers({ celFlora, dirPick, hover, pickInfo, sameDim, spikeList, state, wallHold, wallOrient, wallPlan });
  // ---------- คลิก ----------
  const busy = !!anim;
  const onUnitClick = (id) => {
    const cp = typeof id === "string" && id.startsWith("corpse:") ? corpses.find((c) => `corpse:${c.id}` === id) : null;
    if (cp) { onTileClick(cp.x, cp.y); return; } // ร่าง = ช่องธรรมดา (เลือกช่อง/เดิน)
    const p = byId[id];
    if (!p) return;
    // Road Trip จุดพัก: กดตัวเองอีกตัว (ระบบคู่) = เลือกคุมตัวนั้น — นอกตาเดินไม่มีกระจกเงา (QA 2026-11-14)
    if (rtWorld && state.roadtrip.phase === "stop" && !pick && onRtSelect && p.id !== me?.id && (p.id === state.youId || p.duoOf === state.youId) && p.alive && p.pos) { clickSound(); onRtSelect(p.id); return; }
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
    // Road Trip จุดพัก: เดินอิสระ (rt:walk) · คลิกวัตถุที่มีกิจกรรม = rt:act (server เดินไปช่องเล่นให้ — มินิมาร์ท/สำนักงาน = เปิดร้าน fx "shop" → Game.jsx)
    if (rtWorld && state.roadtrip.phase === "stop" && !pick) {
      const pr = rtPropAt(state.board && state.board.area, x, y);
      if (pr && !pr.spot) return;
      clickSound();
      // รถตู้ที่จอด = กล่องเก็บของกลาง (ผู้ใช้สั่ง 2026-11-14): server เดินไปติดรถแล้วเปิดกระเป๋า + กล่องรถ (fx stash)
      const vb = !pr ? (rtDefOf(state.board && state.board.area) || {}).vanBlock : null;
      if (vb && x >= vb.x0 && x <= vb.x1 && y >= vb.y0 && y <= vb.y1) { socket.emit("rt:act", { id: "van", ...rtUnit }); return; }
      if (pr) socket.emit("rt:act", { id: pr.id, ...rtUnit }); else socket.emit("rt:walk", { x, y, ...rtUnit });
      return;
    }
    if (pick) {
      if (pick.kind === "tile") { pickTileAt(x, y); return; }
      if (pick.kind === "aoe" && pickInfo && pickInfo.aoe.includes(k)) { clickSound(); pick.onConfirm(); }
      else if (pick.kind === "line" && pickInfo) { clickSound(); pick.onPick(dirToward(me.pos, { x, y }, sizeOfP(me)) || pickInfo.dir); }
      return;
    }
    // หนามน้ำแข็ง (Ice Spike) · ศพ (เกรย์เก็บศพ) · ของบนกระดานของด่าน: ตีเลย — ยืนในระยะแล้ว = ตี · ยังไม่ถึง = เดินไปช่องยืนก่อน แล้วตีเมื่อเดินจบ
    const at = (s) => s.pos.x === x && s.pos.y === y;
    const obj = spikeFoes.find(at) || corpseFoes.find(at) || fdFoes.find(at);
    if (obj) {
      if (!myTurn || busy || pendingAttack.current) return;
      const pl = planFor(obj);
      if (!pl) return;
      clickSound();
      if (samePos(pl.stand, me.pos)) socket.emit("attack", { targetId: obj.id });
      else armPendingAttack(obj.id, pl.stand);
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
  // Road Trip จุดพัก (ไม่มีตาเดิน — ผู้ใช้แจ้ง 2026-11-14 "เดินด้วย WASD ไม่ได้"): ก้าวทีละช่องผ่าน rt:walk (server เช็คช่องว่าง/ทางผ่าน)
  const rtStopWalk = rtWorld && state.roadtrip.phase === "stop" && !!me && me.alive && !!me.pos;
  useEffect(() => {
    if (!rtStopWalk || pick) return undefined;
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))) return;
      if (document.querySelector('.rt-scrim, .shs-veil, .bag-veil, [aria-modal="true"]')) return; // หน้าอู่/ร้าน/กระเป๋าเปิดอยู่ = ไม่เดิน (QA 2026-11-14 — กด S ในหน้าอู่แล้วตัวเดินออกจนปุ่มอัปเกรดใช้ไม่ได้)
      const dir = screenDir(rotation, e.code, me.pos);
      if (!dir) return;
      e.preventDefault();
      const sent = stepSent.current;
      if (sent && (samePos(me.pos, sent.to) || performance.now() - sent.t > 400)) stepSent.current = null;
      if (stepSent.current) return;
      const to = { x: me.pos.x + dir.x, y: me.pos.y + dir.y };
      stepSent.current = { to, t: performance.now() };
      look(to);
      socket.emit("rt:walk", { x: to.x, y: to.y, ...rtUnit });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rtStopWalk, pick, me, rotation, look]); // eslint-disable-line react-hooks/exhaustive-deps
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
  const wallMode = !!pick && pick.kind === "tile" && (pick.place === "wall" || !!pick.band);
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

  const { tallTiles, tileInfo } = useTileInfo({ board, celFlora, hover, map, rtWorld, shops, spikeList, state });

  // ---------- เปลี่ยนภูมิภาค: กระดานเดิมซูมออก (ลอยขึ้นไปหาลูกโลก) → รอฉาก RegionTravel ชนผิวโลก → กระดานใหม่ซูมเข้า ----------
  //  เริ่มแมตช์ (ต่อจาก MatchIntro) ก็ซูมเข้า · mount ใหม่ในภูมิภาคเดิม (หลังคัตซีน) ไม่เล่นซ้ำ — ดู journey/arena/arenaLandBus.js
  const boardArea = state.board ? state.board.area : 0;
  const [shown, setShown] = useState(() => ({ board: state.board, fly: state.board && shouldLandOnMount(state.board.area) ? "in" : null, seq: 0 }));
  if (state.board && shown.board && boardArea !== shown.board.area && shown.fly !== "out" && shown.fly !== "wait") {
    setShown((v) => ({ ...v, fly: "out", seq: v.seq + 1 }));
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
  useEffect(() => {
    if (!call || (byId[call.id] && byId[call.id].summon && /^master_/.test(byId[call.id].summon.kind || ""))) return;
    const mine = !!me && sameSide(byId[call.id] || { id: call.id }, me);
    playSfx(mine ? "notificate_mine" : "notificate");
    if (mine) requestAttention(); // ถึงตาเรา: หน้าต่างไม่ได้โฟกัส = ไอคอนแถบงานกระพริบ
  }, [call]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- แถบลำดับเดิน ----------
  // มืดบอด (masked): server ส่ง turnOrder ว่าง — ไม่แสดงลำดับเลย
  //  ยูนิตที่ถูกเรียก (ตัวอัญเชิญของ Master / มอน) ไม่ขึ้นในแถบลำดับ — ผู้ใช้ 2026-11-16 (กระดานโดนเบียด)
  const isAiUnit = (u) => !!(u && u.summon && /^master_/.test(u.summon.kind || ""));
  const notUnit = (id) => !isAiUnit(byId[id]);
  const order = masked ? []
    : phase === "PLAYING" || !state.turnOrder || !state.turnOrder.length
      ? [...roster].filter((p) => p.alive && !isAiUnit(p)).sort((a, b) => (a.position || 0) - (b.position || 0)).map((p) => p.id)
      : state.turnOrder.filter(notUnit);
  const actor = state.actorId ? byId[state.actorId] : null;
  // คิว 2 คนถัดไป: ต่อจากตำแหน่งที่เดินล่าสุด (server actorIndex · ไม่มี = หาจากฝ่ายของคนที่เดินอยู่) · ตัดคนตกรอบ/มองไม่เห็น (มืดบอด)
  const actIdx = typeof state.actorIndex === "number" ? state.actorIndex : (state.turnOrder || []).indexOf(actorSide);
  const upNext = masked || phase === "PLAYING" || !state.turnOrder ? []
    : state.turnOrder.slice(actIdx + 1).filter((id) => byId[id] && notUnit(id) && sideAlive(byId[id], state.players) && !byId[id].masked).slice(0, 2);

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

  // สนาม Eos: แผงแต้ม/เสามุมขวาบน (EosScoreboard — พับ/กางได้) อยู่ที่เดียวกับคิวคนถัดไป → คิวลงไปอยู่ใต้แผง (ผู้ใช้แจ้ง 2026-11-12 ซ้อนบังกัน)
  //  Road Trip: ปุ่ม "?" คู่มือ (roadtrip/RtGuideButton .rtg-btn) อยู่ใต้แถวปุ่มระบบมุมขวาบนตลอดทริป → คิวลงไปใต้ปุ่ม (ผู้ใช้แจ้ง 2026-11-15 ปุ่มทับลำดับ)
  const [queueTop, setQueueTop] = useState(0);
  useEffect(() => {
    const upd = () => {
      const el = document.querySelector(".eos-score") || document.querySelector(".rtg-btn"), root = rootRef.current;
      const r = el ? el.getBoundingClientRect() : null;
      const rt = root ? root.getBoundingClientRect() : null;
      const v = r && r.height > 0 && rt ? Math.round(Math.min(r.bottom - rt.top + 10, rt.height - 250)) : 0; // แผงกางยาว = ไม่ดันคิวตกจอ
      setQueueTop((o) => (o === v ? o : v));
    };
    upd();
    const t = setInterval(upd, 700);
    window.addEventListener("resize", upd);
    return () => { clearInterval(t); window.removeEventListener("resize", upd); };
  }, []);

  if (!map) return null;
  return (
    <div ref={rootRef} className="bs-root" data-hidden={hidden ? "true" : "false"} data-order-low={orderLow ? "true" : "false"} data-queue-low={queueTop ? "true" : "false"}
      data-fc={fcId ? "true" : "false"} data-fly={shown.fly || "none"} data-shake={shake % 2 ? "true" : "false"} data-rx={rxOpen ? "true" : "false"}
      style={{ "--bs-k": Math.max(0.55, Math.min(1.3, sk)), "--bs-order-dx": `${orderDx}px`, ...(orderLow ? { "--bs-order-top": `${orderLow}px` } : null), ...(queueTop ? { "--bs-queue-top": `${queueTop}px` } : null) }}>
      <BoardCanvas
        map={displayBoard}
        units={units}
        highlights={highlights}
        shops={shops}
        night={night}
        lowQ={lowQ}
        rotation={rotation}
        zoom={zoom}
        view={view}
        onZoomChange={setZoom}
        focus={focus}
        cinema={cinema}
        anim={anim}
        glides={glides}
        fx={fx}
        ice={iceProp}
        storms={state.board ? state.board.storms : null}
        elemFields={state.board ? state.board.elemFields : null}
        colony={colonyView}
        roadtrip={(state.world === "roadtrip" || state.gameMode === "roadtrip") && state.roadtrip && state.roadtrip.phase === "combat" ? state.roadtrip : null}
        moon={state.moon || null}
        fodlan={fodlanProp}
        colonyEvents={colonyEvents}
        colonyHome={colonyHome}
        rts={eosRts}
        camHome={camHome}
        selfPos={eosRts && me && me.alive !== false ? me.pos : null}
        selfFollow={eosRts ? myTurn : undefined}
        onYawSettle={eosRts ? setRotation : undefined}
        onColonyAway={setColonyAway}
        songs={songs}
        grays={grays}
        gils={gils}
        ferns={ferns}
        ryougi={ryougiProp}
        otoya={otoyaProp}
        emiya={emiyaProp}
        law={lawProp}
        gyroBalls={gyroBalls}
        diego={diegoGround}
        kiri={kiriGround}
        soraShells={state.board && Array.isArray(state.board.soraShells) ? state.board.soraShells : null}
        timeFreeze={state.timeFreeze || null}
        valentine={state.board && state.board.valentine ? state.board.valentine : null}
        celine={celineProp}
        dimView={typeof myDim === "string" ? (myDim.startsWith("par") ? "par" : myDim.startsWith("veil") ? "veil" : null) : null}
        onAnimDone={onAnimDone}
        onTileClick={onTileClick}
        onPing={coopMode && me ? onPing : undefined}
        onUnitClick={onUnitClick}
        onHoverTile={(x, y) => setHover(x == null ? null : { x, y })}
        tallTiles={tallTiles}
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
      {call && phase === "ACTION" && byId[call.id] && notUnit(call.id) && !(masked && byId[call.id].masked) && createPortal(
        <TurnCall key={call.key} k={sk} p={byId[call.id]} rank={Math.max(1, order.indexOf(sideOf(byId[call.id])) + 1)} isMe={!!me && sameSide(byId[call.id], me)} onDone={endCall} />,
        document.body,
      )}


      {/* โหมดเลือกเป้า: เหลือแค่ปุ่มยกเลิก (ผู้ใช้สั่ง — เลือก/ใช้ทำบนกระดาน) */}
      {pick && pick.onCancel && (
        <button type="button" className="bs-cancel" onClick={() => { clickSound(); pick.onCancel(); }}>✕ ยกเลิก</button>
      )}

      {/* Colony: กล้องออกห่างตัวเรา → ปุ่มกลับที่หมาก (รูปตัวเรา · กด = กล้องกลับ เหมือน Space) */}
      {state.colony && colonyAway && me && me.alive !== false && (
        <button type="button" className="bs-home" title="กลับที่ตัวเรา (Space)" style={{ "--c": me.color || "#3B82C4" }}
          onClick={() => { clickSound(); setColonyHome((n) => n + 1); }}>
          <svg className="bs-home-hex" viewBox="0 0 100 114" aria-hidden="true"><polygon points={HEX_PTS} /></svg>
          {me.img && <img src={me.img} alt="" style={faceStyle(me)} onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />}
          <svg className="bs-home-aim" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6.5" /><circle cx="12" cy="12" r="1.6" /><path d="M12 2.5 V6 M12 18 V21.5 M2.5 12 H6 M18 12 H21.5" /></svg>
        </button>
      )}

      {/* มุมขวาบน (จัดใหม่ 2026-11-14 · ผู้ใช้ยืนยันแบบร่าง .claude/plans/element-ui.html): แถวเดียวกับปุ่มระบบ (VolumeControl)
          กลุ่มกล้อง (หมุน · ซูม · มุมมอง · กลับที่ตัวเรา) · กลุ่มข้อมูลกระดาน (ระยะอันตราย · ตารางปฏิกิริยาธาตุ) */}
      <div className="bs-tools">
        <div className="bs-grp">
          <button type="button" className="bs-tool" title="หมุนซ้าย (Q)" onClick={() => { clickSound(); rotate(-1); }}>⟲</button>
          <button type="button" className="bs-tool" title="หมุนขวา (E)" onClick={() => { clickSound(); rotate(1); }}>⟳</button>
          <button type="button" className="bs-tool" title="ซูมออก" disabled={zoom === 0}
            onClick={() => { clickSound(); setZoom(zoom - 1); }}>－</button>
          <span className="bs-zoom-lv" aria-hidden="true">{[...Array(ZOOM_STEPS - 1)].map((_, i) => <i key={i} data-on={i < zoom ? "true" : "false"} />)}</span>
          <button type="button" className="bs-tool" title="ซูมเข้า" disabled={zoom >= ZOOM_STEPS - 1}
            onClick={() => { clickSound(); if (zoom === 0 && me && me.pos) look(me.pos); setZoom(zoom + 1); }}>＋</button>
          <button type="button" className="bs-tool bs-view" title={view === "top" ? "มุมเอียง" : "มุมบน"} data-on={view === "top" ? "true" : "false"}
            onClick={() => { clickSound(); toggleView(); }}>
            {view === "top"
              ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18 L9 7 H15 L19 18 Z" /><path d="M7 13 H17 M12 7 V18" /></svg>
              : <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" /><path d="M4 12 H20 M12 4 V20" /></svg>}
          </button>
          {(state.colony || eosRts) && (
            <button type="button" className="bs-tool bs-view" title="กลับที่ตัวเรา (Space)" onClick={() => { clickSound(); if (eosRts) goHome(); else setColonyHome((n) => n + 1); }}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6.5" /><circle cx="12" cy="12" r="1.6" /><path d="M12 2.5 V6 M12 18 V21.5 M2.5 12 H6 M18 12 H21.5" /></svg>
            </button>
          )}
        </div>
        <div className="bs-grp">
          <button type="button" className="bs-tool bs-view bs-danger" title="ระยะอันตราย" data-on={danger ? "true" : "false"} onClick={() => { clickSound(); setDanger((v) => !v); }}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 L21 19 H3 Z" /><path d="M12 9 V13 M12 16 V16.5" /></svg>
          </button>
          <button type="button" className="bs-tool bs-elem" title="ปฏิกิริยาธาตุ" data-on={rxOpen ? "true" : "false"} onClick={() => { clickSound(); setRxOpen((v) => !v); }}>
            <span className="bs-elem-dots" aria-hidden="true">{["fire", "ice", "bolt", "water"].map((k) => <i key={k} style={{ background: ELEMENTS[k].color }} />)}</span>
          </button>
        </div>
      </div>
      {rxOpen && <ReactionPanel />}

      {/* ป้ายข้อมูลช่อง */}
      {tileInfo && (
        <div className="bs-tile">
          <div className="bs-tile-name">{tileInfo.icon ? `${tileInfo.icon} ` : ""}{tileInfo.name}</div>
          {tileInfo.stats && ( /* มอน Eos: ตัวเลขใหญ่ก่อน คำอธิบายท้ายสุด */
            <div className="bs-tile-stats">
              <span className="atk" title="พลังโจมตี"><i>⚔</i><b>{tileInfo.stats.atk == null ? "?" : tileInfo.stats.atk || "—"}</b></span>
              <span className="hp" title="พลังชีวิต"><i>♥</i><b>{tileInfo.stats.hp}</b><small>/{tileInfo.stats.maxHp}</small></span>
              <span className="arm" title="เกราะ"><i>⛨</i><b>{tileInfo.stats.armor}</b>{tileInfo.stats.maxArmor > 0 && <small>/{tileInfo.stats.maxArmor}</small>}</span>
            </div>
          )}
          {tileInfo.tags && tileInfo.tags.length > 0 && <div className="bs-tile-tags">{tileInfo.tags.map((t) => <span key={t}>{t}</span>)}</div>}
          {tileInfo.desc && <div className={`bs-tile-desc${tileInfo.stats ? " bs-tile-desc-sub" : ""}`}>{tileInfo.desc}</div>}
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
          statusOf={statusOf}
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
