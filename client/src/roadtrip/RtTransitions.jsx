// ============================================================
//  Road Trip — ฉากเปลี่ยนทั้งหมดของโหมด (GRID_PLAN §8.8) · ข้อความบนจอมีแค่ชื่อ ตัวเลข ไอคอน (กฎ UI)
//
//  useRtView(state) — ภาพที่ "โชว์อยู่" (drive = จอขับ 3D · board = กระดาน 2D · over = สรุป) ตามหลังเฟสจริงของ server เล็กน้อย
//   เฟสเปลี่ยน → เล่นช่วงเข้าบนภาพเดิม (รถชะลอ ป้าย แบนเนอร์ กล้องโฉบ) → ม่านทึบ → สลับภาพใต้ม่าน → เผยภาพใหม่
//   ระหว่างค้างภาพกระดานเดิม (ออกจากจุดพัก/ชนะ) ใช้ state ชุดสุดท้ายของกระดาน (boardState) — ไม่เห็นกระดานว่างแวบ
//   รีคอนเนกต์/เข้ากลางทาง = สลับทันที ไม่มีฉาก
//
//  <RtTransitions state view act endAct lowQ /> — ชั้น DOM ทั้งหมด (pointer-events: none ไม่บังการกด)
//   1 ฉากเปิดทริป (phase intro): แฟลชต่อจากลูกโลก (MatchIntro + rtFlight.js) → ROAD TRIP + ความยาก → รถตู้แล่นเข้า (บทกล้อง intro)
//     → ป้ายรูปผู้เล่นทรงกลม (ลูกเรือ) เด้งเรียงแถวใต้รถ 3D → "ออกเดินทาง" + แตร → กล้องคืนท่าไล่หลังพอดีกับที่ server เข้า drive
//   2 จุดพัก: รถชะลอ + ไฟเลี้ยว + ป้ายริมทาง (⛽ ปั๊มน้ำมัน / 🏨 โรงแรม + ชื่อสถานที่) → ม่านวงกลมหุบ → กระดาน (กล้องค่อยนิ่ง)
//      ออก: ม่านวงกลมหุบบนกระดาน → เปิดบนจอขับ 3D: ประตูท้ายรถจริง (เปิดค้างตั้งแต่จอด) ปิดปัง + เสียง → รถออกตัว (บทกล้อง pullout)
//   3 ดักทาง/อีลิท: เบรกเสียงยาง + แฟลชแดง + แถบแบนเนอร์เฉียง "มอนดักทาง!" / "มอนระดับสูง!" + ภาพมอน → กล้องโฉบสู่มุมกระดาน
//      → แถบขยายเต็มจอเป็นม่าน → สลับ → แถบหดคืน
//   4 ไล่ล่าบนรถตู้: ไฟไซเรนกวาดขอบจอ + "ไล่ล่า!" + กล้องเหวี่ยงอ้อมรถ
//   5 บอส: แถบภาพยนตร์ + ภาพบอสใหญ่ + ชื่อ + ระยะ (กม.) — server พักก่อนแจกการ์ด (ดู RT_BOSS_HOLD ในรายงาน) · ถ้าเริ่มรอบก่อน = ตัดออกไว
//   6 เหตุการณ์: รถชะลอ (การ์ดพลิกเข้า — CSS ทับ .rt-event) · ทางแยก: ป้ายแขวนแกว่งลง (CSS ทับ .rt-route)
//   7 จบสู้: ชนะ "ผ่านไปได้!" (มอนถอยหนี = "รอดมาได้!") + 🪙 เหรียญ + กม. → แถบส้มกวาด → จอขับรถออกตัว · แพ้ = จอซีดมืด → สรุป
//   8 เข้าภูมิภาค: ป้ายใหญ่ ไอคอน + ชื่อ + รอบ (II…) + กม. · กลางวัน/กลางคืน: ป้ายเล็ก — รอคิวจนกลับมาจอขับ
//  เสียง: เสียงเปลี่ยนเฟส/ fx หลักเล่นที่ rtAudio.handleFx (App) — ที่นี่เล่นเฉพาะเสียงที่ handleFx ไม่เล่น (ยางเบรก ประตู ชนะ เหรียญ แตร)
//   rtSfx ไม่เล่นระหว่างคลิปวีดีโอ (กฎผู้ใช้ 2026-11-03)
// ============================================================
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RT_DEFS } from "../board/roadtrip/maps.gen";
import { regionOf, roman, diffOf, forkKind } from "./rtMeta";
import { rtSfx } from "./rtAudio";
import { serverNow } from "./rtSocket";
import * as director from "./rtDirector";
import { RT_DIVE_T } from "./rtFlight";
import "./RtTransitions.css";

const BOARD_PH = new Set(["stop", "combat"]);
const COMBAT_KINDS = new Set(["ambush", "elite", "onvan", "boss"]);

/** ภาพที่ควรโชว์ตามเฟสจริง: drive | board | over | null (ไม่ใช่ Road Trip) */
export function rtTargetView(state) {
  const rt = state && state.gameMode === "roadtrip" ? state.roadtrip : null;
  if (!rt) return null;
  if (rt.phase === "over" || state.gameState === "GAMEOVER") return "over";
  return BOARD_PH.has(rt.phase) ? "board" : "drive";
}

const fxList = (rt) => (rt && Array.isArray(rt.fx) ? rt.fx : []);
const fxKey = (f) => f.key ?? f.id ?? 0;
function fxLatest(rt, k) {
  let best = null;
  for (const f of fxList(rt)) if (f.k === k && (!best || fxKey(f) > fxKey(best))) best = f;
  return best;
}

export const BOSS_INFO = {
  devilTruck: { name: "แม็กซ์ เวอร์สแตปเพน", latin: "MAX VERSTAPPEN", c: "#e0343c", g: "#ff9a6a" },
  darkKnight: { name: "อัศวินเงามรณะ", latin: "DARK KNIGHT", c: "#7b6cff", g: "#cfc6ff" },
  jormungand: { name: "จอร์มุนกันด์", latin: "JÖRMUNGANDR", c: "#22b0c0", g: "#b8f6ff" },
};
const mobImg = (type) => `/roadtrip/mobs/${type}.webp`;

// เวลาที่ภาพเดิมค้างก่อนสลับ (ms) — ม่านของแต่ละฉากทึบสนิทก่อนเวลานี้เสมอ (ดู ACT)
const HOLD = { stop: 1850, ambush: 1100, elite: 1100, onvan: 1100, boss: 1500, leave: 520, win: 1300, lose: 1500 };
// cover = เริ่มม่าน (ms หลังเริ่มฉาก) · linger = ค้างหลังเผยภาพใหม่ · out = ช่วงออก
const ACT = {
  stop: { cover: 1380, linger: 1150, out: 450 },
  ambush: { cover: 880, linger: 850, out: 380 },
  elite: { cover: 880, linger: 850, out: 380 },
  onvan: { cover: 880, linger: 850, out: 380 },
  boss: { cover: 1150, linger: 2100, out: 600 },
  leave: { cover: 0, linger: 900, out: 300 },
  win: { cover: 1050, linger: 1150, out: 450 },
  lose: { cover: 1100, linger: 0, out: 900 },
};

function describe(from, to, state, boardSnap) {
  const rt = state.roadtrip || {};
  if (to === "over") return { kind: "lose", km: +rt.km || 0 };
  if (from === "drive" && to === "board") {
    if (rt.phase === "stop") {
      const area = (rt.stop && rt.stop.area) ?? (state.board && state.board.area);
      return { kind: "stop", stop: rt.stop && rt.stop.kind === "motel" ? "motel" : "gas", place: (RT_DEFS[area] && RT_DEFS[area].name) || "" };
    }
    const ck = (rt.combat && rt.combat.kind) || "ambush";
    const sp = fxLatest(rt, "mobSpawn");
    const seen = new Set(), mobs = [];
    for (const m of (sp && Array.isArray(sp.list) ? sp.list : [])) {
      if (!m || !m.type || seen.has(m.type + (m.elite ? "*" : ""))) continue;
      seen.add(m.type + (m.elite ? "*" : ""));
      mobs.push({ type: m.type, elite: !!m.elite });
    }
    mobs.sort((a, b) => (b.elite ? 1 : 0) - (a.elite ? 1 : 0));
    if (ck === "boss") {
      const ba = fxLatest(rt, "bossAlert");
      const boss = (ba && BOSS_INFO[ba.type] && ba.type) || (mobs.find((m) => BOSS_INFO[m.type]) || {}).type || "devilTruck";
      return { kind: "boss", boss, km: Math.round(+rt.km || 0) };
    }
    return { kind: ck === "onvan" ? "onvan" : ck === "elite" ? "elite" : "ambush", mobs: mobs.slice(0, 5) };
  }
  if (from === "board" && to === "drive") {
    const was = boardSnap && boardSnap.roadtrip ? boardSnap.roadtrip.phase : null;
    const end = fxLatest(rt, "combatEnd");
    if (was === "combat" && end && end.win) {
      const flee = fxLatest(rt, "mobsFlee"), cs = fxLatest(rt, "combatStart");
      const onvan = !!(boardSnap.roadtrip.combat && boardSnap.roadtrip.combat.kind === "onvan");
      return { kind: "win", gold: end.gold | 0, flee: !!(flee && (!cs || fxKey(flee) > fxKey(cs))), km: +rt.km || 0, onvan };
    }
    return { kind: "leave" };
  }
  return { kind: null };
}

/**
 * ภาพที่โชว์ + ฉากเปลี่ยนที่กำลังเล่น · ใช้ใน GameBoard (Game.jsx) ก่อนตัดสินว่าจะ mount จอขับ/กระดาน/สรุป
 * @returns {{ view, act, endAct, boardState }}
 */
export function useRtView(state) {
  const target = rtTargetView(state);
  const [view, setView] = useState(target);
  const [act, setAct] = useState(null);
  const viewRef = useRef(view);
  viewRef.current = view;
  const snap = useRef(null);
  if (view === "board" && (target === "board" || !snap.current)) snap.current = state; // กระดานสด · ค้างภาพ = ชุดสุดท้าย
  const timer = useRef(0);
  const seq = useRef(0);
  const stRef = useRef(state);
  stRef.current = state;
  useEffect(() => {
    if (!target) return;
    clearTimeout(timer.current);
    const cur = viewRef.current;
    if (target === cur || !cur) {
      if (!cur) setView(target);
      setAct((a) => (a && !a.swapped ? null : a)); // กลับมาภาพเดิมก่อนสลับ = ยกเลิกฉาก
      return;
    }
    const info = describe(cur, target, stRef.current, snap.current);
    const hold = info.kind ? HOLD[info.kind] || 0 : 0;
    if (!hold) { setView(target); setAct(null); return; }
    const id = ++seq.current;
    setAct({ id, ...info, from: cur, to: target, swapped: false });
    timer.current = setTimeout(() => {
      setView(target);
      setAct((a) => (a && a.id === id ? { ...a, swapped: true } : a));
    }, hold);
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearTimeout(timer.current), []);
  // dev: window.__rtTx("boss", { boss: "darkKnight" }) = เล่นฉากบนภาพปัจจุบัน (ไม่สลับภาพจริง) ไว้ตรวจหน้าตา
  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;
    window.__rtTx = (kind, extra = {}) => {
      const id = ++seq.current, v = viewRef.current;
      const demo = { stop: { stop: "gas", place: "ปั๊มทางหลวง" }, ambush: { mobs: [{ type: "biker" }, { type: "stray" }, { type: "crow" }] }, elite: { mobs: [{ type: "trucker", elite: true }, { type: "biker" }] }, onvan: { mobs: [{ type: "biker" }, { type: "crow" }] }, boss: { boss: "devilTruck", km: 50 }, win: { gold: 7, km: 63.4 }, lose: {} }[kind] || {};
      setAct({ id, kind, from: v, to: v, swapped: false, ...demo, ...extra });
      setTimeout(() => setAct((a) => (a && a.id === id ? { ...a, swapped: true } : a)), HOLD[kind] || 500);
    };
    return () => { delete window.__rtTx; };
  }, []);
  const endAct = useCallback((id) => setAct((a) => (a && a.id === id ? null : a)), []);
  const live = view === "board" && target === "board";
  return { view: view || target, act, endAct, boardState: live ? state : snap.current || state };
}

// ---------------------------------------------------------------- ชิ้นส่วนร่วม
function Portrait({ src, color, elite = false, i = 0, cls = "rtx-mob", alt = "?" }) {
  const [bad, setBad] = useState(false);
  return (
    <span className={cls} data-elite={elite ? "true" : "false"} style={{ "--i": i, "--pc": color || "#e0702e" }}>
      {src && !bad ? <img src={src} alt="" draggable={false} decoding="async" onError={() => setBad(true)} /> : <b>{alt}</b>}
    </span>
  );
}
const realPlayers = (state) => (state.players || []).filter((p) => p && !p.summon && !p.duoOf).sort((a, b) => (a.position || 0) - (b.position || 0));
const kmTxt = (km) => (Math.round((+km || 0) * 10) / 10).toFixed(1);

// รอให้จอขับ 3D วาดเฟรมแรกแล้ว (ฉากเพิ่ง mount ใต้แฟลช) → cb · กันค้าง 1.6 วิ
function whenDrivePainted(cb) {
  let n = 0, raf = 0, dead = false;
  const t0 = performance.now();
  const step = () => {
    if (dead) return;
    if (director.sceneNow()) n++;
    if (n >= 3 || performance.now() - t0 > 1600) { cb(); return; }
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => { dead = true; cancelAnimationFrame(raf); };
}

// ---------------------------------------------------------------- 1 ฉากเปิดทริป
function RtIntro({ R, state, onDone }) {
  const rt = state.roadtrip || {};
  const d = diffOf(rt.diff);
  const crew = useMemo(() => realPlayers(state), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [ready, setReady] = useState(false);
  useEffect(() => {
    director.reset();
    director.shot("intro", R + 300);
    const stop = whenDrivePainted(() => setReady(true));
    const style = rt.van && rt.van.style;
    const t1 = setTimeout(() => rtSfx(style === "goofy" ? "horn_goofy" : "horn"), Math.round(R * 0.8));
    const t2 = setTimeout(onDone, R + 700);
    return () => { stop(); clearTimeout(t1); clearTimeout(t2); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const ms = (k) => `${Math.round(k * R)}ms`;
  return (
    <div className="rtx rtx-intro" data-ready={ready ? "true" : "false"} aria-hidden="true"
      style={{ "--R": `${R}ms`, "--d": d.color, "--t-title": ms(0.06), "--t-diff": ms(0.16), "--t-van": ms(0.34), "--t-go": ms(0.78), "--t-out": ms(0.93) }}>
      <i className="rtx-bar top" />
      <i className="rtx-bar bot" />
      <div className="rtx-intro-title">
        <div className="rtx-rt-mark">
          <i className="rtx-rt-rule" />
          <b className="rtx-latin">ROAD TRIP</b>
          <i className="rtx-rt-rule" />
        </div>
        <div className="rtx-diff">
          <span className="rtx-diff-pips">{[1, 2, 3].map((n) => <i key={n} data-on={n <= d.lv ? "true" : "false"} />)}</span>
          <b>{d.name}</b>
        </div>
      </div>
      <div className="rtx-crew">
        {crew.map((p, i) => (
          <span key={p.id} className="rtx-crew-one" style={{ "--i": i, "--pc": p.color || "#e0702e" }}>
            <Portrait cls="rtx-badge" src={(p.character && p.character.img) || p.img} color={p.color} i={i} alt={Array.from(p.name || "?")[0]} />
            <b>{p.name}</b>
          </span>
        ))}
      </div>
      <div className="rtx-go"><b>ออกเดินทาง</b></div>
      <i className="rtx-flash" />
    </div>
  );
}

/** ชั้น DOM ช่วงลูกโลกของ MatchIntro (โหมด roadtrip): เส้นความเร็ว + แฟลชส้ม-ขาวตอนชน — D = ms ทั้งช่วง */
export function RtDiveCine({ D }) {
  const ms = (k) => `${Math.round(k * D)}ms`;
  return (
    <div className="rtx-dive" aria-hidden="true" style={{ "--lock": ms(RT_DIVE_T.turn - 0.04), "--dive": ms(RT_DIVE_T.dive), "--crash": ms(RT_DIVE_T.crash - 0.05), "--crash-dur": ms(0.08) }}>
      <div className="rtx-dive-tag"><i /><b className="rtx-latin">ROAD TRIP</b><i /></div>
      <i className="rtx-dive-rush" />
      <i className="rtx-dive-flash" />
    </div>
  );
}

// ---------------------------------------------------------------- 2–7 ฉากเปลี่ยนภาพ
const STAGES = ["in", "cover", "reveal", "out"];
function Act({ act, view, state, onDone }) {
  const cfg = ACT[act.kind] || { cover: 0, linger: 0, out: 300 };
  const [stage, setStageRaw] = useState("in"); // in → cover → reveal → out
  // dev: window.__rtFreeze = "cover" | "reveal" … = หยุดฉากไว้ที่ช่วงนั้น (ตรวจภาพทีละช่วง)
  const setStage = (s) => setStageRaw((cur) => {
    const nx = typeof s === "function" ? s(cur) : s;
    if (import.meta.env.DEV && window.__rtFreeze && STAGES.indexOf(nx) > STAGES.indexOf(window.__rtFreeze)) return cur;
    return nx;
  });
  const doneRef = useRef(false);
  const timers = useRef([]);
  const at = (ms, fn) => timers.current.push(setTimeout(fn, Math.max(0, ms)));
  const finish = () => { if (doneRef.current) return; doneRef.current = true; onDone(); };
  // เริ่มฉาก: ผู้กำกับ 3D + เสียงที่ handleFx ไม่เล่น
  useEffect(() => {
    const k = act.kind;
    if (k === "stop") { director.slowTo(1, 1500); director.shot("pullover", 2300); at(1050, () => director.rear(true)); } // จอดแล้วประตูท้ายเปิด (ค้างไว้จนออกจากจุดพัก)
    else if (k === "ambush" || k === "elite") { rtSfx("tire_screech"); director.slowTo(1, 900); director.shot("swoop", 1150); }
    else if (k === "onvan") { director.slowTo(0.15, 700); director.shot("swing", 1150); }
    else if (k === "boss") { rtSfx("tire_screech"); director.slowTo(1, 1300); director.shot("swoop", 1500); }
    else if (k === "win") { at(120, () => rtSfx("victory")); at(640, () => rtSfx("coin")); } // หลัง App หยุดคลิป/เสียงค้างของการต่อสู้ (effect ของ App รันหลังตัวนี้)
    if (cfg.cover > 0) at(cfg.cover, () => setStage((s) => (s === "in" ? "cover" : s)));
    else setStage("cover");
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      if (!act.swapped && !doneRef.current) { director.clearShot(); director.slowTo(0, 900); director.rear(null); } // ถูกยกเลิกกลางทาง
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // สลับภาพแล้ว → รอเฟรมแรกของภาพใหม่ → เผย
  useEffect(() => {
    if (view !== act.to || !act.swapped || stage === "reveal" || stage === "out") return undefined;
    if (act.to === "drive" && act.onvan) { director.clearShot(); director.slowTo(0, 900); } // สู้บนรถตู้ = รถวิ่งอยู่แล้ว
    else if (act.to === "drive") {
      // จอดอยู่ → ออกตัว · ออกจากจุดพัก: ประตูท้ายรถ 3D ที่เปิดค้างไว้ปิดปัง (เสียงประตู) แล้วคืนให้ state จริงคุม
      director.slowTo(0, 2600, 1); director.shot("pullout", 2600);
      if (act.kind === "leave") { at(560, () => { director.rear(false); rtSfx("van_door"); }); at(1700, () => director.rear(null)); }
      else director.rear(null);
    }
    let raf = 0, n = 0, dead = false;
    const go = () => {
      if (dead) return;
      dead = true;
      cancelAnimationFrame(raf);
      setStage("reveal");
      at(cfg.linger + 420, () => setStage("out"));
    };
    const step = () => { if (dead) return; if (++n >= 3) go(); else raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    const fb = setTimeout(go, 900); // แท็บซ่อน/เฟรมค้าง (rAF ไม่มา) = เผยตามเวลา
    return () => { dead = true; cancelAnimationFrame(raf); clearTimeout(fb); };
  }, [view === act.to && act.swapped]); // eslint-disable-line react-hooks/exhaustive-deps
  // ต่อสู้เริ่มจริงแล้ว (server แจกการ์ด) = รีบออก ไม่บังกระดาน
  const dealt = state.roadtrip && state.roadtrip.phase === "combat" && state.gameState !== "CUTSCENE";
  useEffect(() => { if (dealt && COMBAT_KINDS.has(act.kind) && stage === "reveal") setStage("out"); }, [dealt, stage]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (stage === "out") { const t = setTimeout(finish, cfg.out + 80); return () => clearTimeout(t); } return undefined; }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  const common = { "data-stage": stage, "aria-hidden": "true" };
  if (act.kind === "stop") {
    const fk = forkKind(act.stop);
    return (
      <div className="rtx rtx-stop" {...common} style={{ "--c": fk.color }}>
        <div className="rtx-sign">
          <span className="rtx-sign-post" />
          <div className="rtx-sign-board">
            <span className="rtx-sign-ico">{fk.icon}</span>
            <span className="rtx-sign-txt"><b>{fk.name}</b>{act.place && act.place !== fk.name && <small>{act.place}</small>}</span>
            <span className="rtx-blinker"><svg viewBox="0 0 24 24"><path d="M4 9h9V4.5L21 12l-8 7.5V15H4z" /></svg></span>
          </div>
        </div>
        <i className="rtx-iris" />
        <i className="rtx-settle" />
      </div>
    );
  }
  if (act.kind === "leave") {
    return (
      <div className="rtx rtx-leave" {...common}>
        <i className="rtx-iris" />
      </div>
    );
  }
  if (act.kind === "ambush" || act.kind === "elite" || act.kind === "onvan") {
    const onvan = act.kind === "onvan";
    const fk = forkKind(onvan ? "fight" : act.kind === "elite" ? "elite" : "fight");
    const title = onvan ? "ไล่ล่า!" : act.kind === "elite" ? "มอนระดับสูง!" : "มอนดักทาง!";
    return (
      <div className={`rtx rtx-fight is-${act.kind}`} {...common}>
        <i className="rtx-redflash" />
        <i className="rtx-alarm" />
        {onvan && <><i className="rtx-siren a" /><i className="rtx-siren b" /></>}
        <div className="rtx-band">
          <div className="rtx-band-in">
            <span className="rtx-band-ico">{onvan ? "🚨" : fk.icon}</span>
            <b className="rtx-band-title">{title}</b>
            {act.mobs && act.mobs.length > 0 && (
              <span className="rtx-mobs">{act.mobs.map((m, i) => <Portrait key={m.type + i} src={mobImg(m.type)} elite={m.elite} i={i} />)}</span>
            )}
          </div>
        </div>
      </div>
    );
  }
  if (act.kind === "boss") {
    const b = BOSS_INFO[act.boss] || BOSS_INFO.devilTruck;
    return (
      <div className="rtx rtx-boss" {...common} style={{ "--c": b.c, "--g": b.g }}>
        <i className="rtx-dim" />
        <i className="rtx-bar top" />
        <i className="rtx-bar bot" />
        <i className="rtx-boss-glow" />
        <div className="rtx-boss-art"><img src={mobImg(act.boss)} alt="" draggable={false} decoding="async" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} /></div>
        <div className="rtx-boss-plate">
          <span className="rtx-boss-ico">👹</span>
          <b className="rtx-boss-name">{b.name}</b>
          <span className="rtx-latin rtx-boss-latin">{b.latin}</span>
          <span className="rtx-chip"><i>🛣️</i>{act.km} กม.</span>
        </div>
      </div>
    );
  }
  if (act.kind === "win") {
    return (
      <div className="rtx rtx-win" {...common}>
        <i className="rtx-wipe" />
        <div className="rtx-band is-win">
          <div className="rtx-band-in">
            <span className="rtx-band-ico">{act.flee ? "💨" : "🏆"}</span>
            <b className="rtx-band-title">{act.flee ? "รอดมาได้!" : "ผ่านไปได้!"}</b>
            <span className="rtx-chips">
              {act.gold > 0 && <span className="rtx-chip is-gold"><i>🪙</i>+{act.gold}</span>}
              <span className="rtx-chip"><i>🛣️</i>{kmTxt(act.km)} กม.</span>
            </span>
          </div>
        </div>
        <Coins />
      </div>
    );
  }
  if (act.kind === "lose") {
    return (
      <div className="rtx rtx-lose" {...common}>
        <i className="rtx-drain" />
        <i className="rtx-black" />
      </div>
    );
  }
  return null;
}

function Coins() {
  const list = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ x: 8 + ((i * 53) % 84), d: (i % 7) * 70, r: (i * 37) % 360, s: 0.7 + ((i * 13) % 5) / 10 })), []);
  return (
    <div className="rtx-coins">
      {list.map((c, i) => <i key={i} style={{ "--x": `${c.x}%`, "--dl": `${c.d}ms`, "--r": `${c.r}deg`, "--s": c.s }}>🪙</i>)}
    </div>
  );
}

// ---------------------------------------------------------------- 8 ป้ายภูมิภาค / กลางวัน-กลางคืน
function RegionCard({ card, onDone }) {
  useEffect(() => {
    const t0 = performance.now();
    let done = false;
    const t = setTimeout(() => { done = true; onDone(); }, card.k === "region" ? 3300 : 2500);
    // ถูกฉากอื่นแทรก (เช่นบอสโผล่ทันที) หลังโชว์ไปพอสมควรแล้ว = ถือว่าเห็นแล้ว ไม่ต้องเล่นซ้ำทีหลัง
    return () => { clearTimeout(t); if (!done && performance.now() - t0 > 1200) onDone(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (card.k === "region") {
    const r = regionOf(card.id);
    const loop = (card.loop | 0) + 1;
    return (
      <div className="rtx rtx-region" aria-hidden="true" style={{ "--c": r.color }}>
        <i className="rtx-region-wash" />
        <div className="rtx-region-card">
          <span className="rtx-region-medal"><span>{r.icon}</span></span>
          <span className="rtx-region-line"><i /><b>{r.name}</b>{loop > 1 && <em className="rtx-latin">{roman(loop)}</em>}<i /></span>
          <span className="rtx-chip"><i>🛣️</i>{Math.round(+card.km || 0)} กม.</span>
        </div>
      </div>
    );
  }
  const night = card.k === "night";
  return (
    <div className="rtx rtx-cycle" data-night={night ? "true" : "false"} aria-hidden="true">
      <span className="rtx-cycle-orb">{night ? "🌙" : "☀️"}</span>
      <b>{night ? "กลางคืน" : "กลางวัน"}</b>
    </div>
  );
}

// ---------------------------------------------------------------- ชั้นรวม
export default function RtTransitions({ state, view, act, endAct, lowQ = false }) {
  const rt = state.roadtrip || {};
  const phase = rt.phase;
  // ---- ฉากเปิด: เห็นเฟส intro ที่เหลือเวลาพอ (เข้ากลางทาง/เหลือน้อย = ไม่เล่น)
  const [intro, setIntro] = useState(null);
  const introSeen = useRef(false);
  useEffect(() => {
    if (phase !== "intro" || introSeen.current) return;
    introSeen.current = true;
    const left = rt.endsAt ? rt.endsAt - serverNow() : 6000;
    if (left > 2600) setIntro({ R: Math.min(12000, left) });
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- เหตุการณ์: รถชะลอระหว่างการ์ดเหตุการณ์ · กลับมาขับโดยไม่มีฉาก = คืนความเร็ว
  const prevPh = useRef(phase);
  useEffect(() => {
    const was = prevPh.current;
    prevPh.current = phase;
    if (phase === "event") director.slowTo(0.72, 1300);
    else if (was === "event" && phase !== "combat") director.slowTo(0, 1600);
  }, [phase]);
  const prevView = useRef(view);
  useEffect(() => {
    const was = prevView.current;
    prevView.current = view;
    if (view === "drive" && was && was !== "drive" && !act) { director.clearShot(); director.slowTo(0, 1200); director.rear(null); }
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => director.reset(), []);
  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;
    window.__rtIntro = (R = 6000) => setIntro({ R });
    window.__rtCard = (card) => setQueue((q) => [{ key: Date.now(), at: Date.now(), km: 100, ...card }, ...q]);
    return () => { delete window.__rtIntro; delete window.__rtCard; };
  }, []);

  // ---- ป้ายภูมิภาค/กลางวัน-กลางคืน: คิว (fx ใหม่เท่านั้น) · โชว์เมื่ออยู่จอขับและไม่มีฉากอื่น
  const seen = useRef(null);
  const [queue, setQueue] = useState([]);
  const fx = fxList(rt);
  useEffect(() => {
    if (!seen.current) { seen.current = new Set(fx.map(fxKey)); return; }
    const add = [];
    for (const f of fx) {
      const k = fxKey(f);
      if (seen.current.has(k)) continue;
      seen.current.add(k);
      if (f.k === "region") add.push({ key: k, k: "region", id: f.id, loop: f.loop, km: rt.km, at: Date.now() });
      else if (f.k === "night" || f.k === "day") add.push({ key: k, k: f.k, at: Date.now() });
    }
    if (add.length) setQueue((q) => {
      // กลางวัน/กลางคืนซ้อนกันในคิว = เอาอันล่าสุด
      let next = [...q, ...add];
      const lastCyc = [...next].reverse().find((c) => c.k !== "region");
      next = next.filter((c) => c.k === "region" || c === lastCyc);
      return next.slice(-3);
    });
    if (seen.current.size > 300) seen.current = new Set(Array.from(seen.current).slice(-150));
  }, [fx]); // eslint-disable-line react-hooks/exhaustive-deps
  const head = queue[0] || null;
  const canCard = (view === "drive" || (head && head.force)) && !act && !intro && phase !== "intro" && phase !== "over";
  const stale = head && Date.now() - head.at > 240000;
  useEffect(() => { if (stale) setQueue((q) => q.slice(1)); }, [stale]);
  const popCard = useCallback(() => setQueue((q) => q.slice(1)), []);

  return (
    <div className="rtx-root" data-lowq={lowQ ? "true" : "false"}>
      {intro && <RtIntro R={intro.R} state={state} onDone={() => setIntro(null)} />}
      {act && <Act key={act.id} act={act} view={view} state={state} onDone={() => endAct(act.id)} />}
      {head && canCard && !stale && <RegionCard key={head.key} card={head} onDone={popCard} />}
    </div>
  );
}
