// ============================================================
//  ฉากเข้าสนาม Eos (GRID_PLAN §8.6) — ครึ่งหลังของฉากเดียวต่อเนื่องใน MatchIntro โหมด eos (App.startPendingJourney)
//   ก่อนหน้า: ลูกโลกร่วมหมุนหาหมุด Eos → หมุดเรือง → ดิ่งชนผิวโลก (eosFlight.js)
//  <EosCine D={ms} live board self night lowQ />
//  ผู้ใช้สั่ง 2026-11-10: ฉาก 3D เดิม (eosFly.js — Three.js) กระตุกและไม่สวย → ทำใหม่ "วิธีไหนก็ได้ ขอให้ดูดีและสวย"
//   ภาพแผนที่ทั้งผืนวาดครั้งเดียว (eosPaint.js) ตอน mount (ยังไม่ live — ซ่อนอยู่ระหว่างช่วงลูกโลก)
//   กล้อง = CSS 3D transform ของแผ่นแผนที่ (perspective + เอียง + หมุน + ซูม) — เลื่อนบน GPU ไม่วาดใหม่ → ลื่น
//   ลำดับ: แฟลชฟ้า → ทะลุชั้นเมฆ (เมฆ 2 ชั้นแยกออก) → ร่อนผ่าน Insomnia → Duscae → Leide → ลดระดับลงหาตัวเรา (วงแสง) → จางเผยกระดานจริง
//   ชื่อโซนขึ้นตอนกล้องผ่าน (ชื่อเท่านั้น — ไม่มีคำอธิบาย) · แสงอาทิตย์ลอด (god rays) + นกบินผ่าน
//  เสียง: cine_swoop ของ Fodlan ตอนโฉบลง (ไม่ใช่วีดีโอ — ไม่ขัดกฎเสียงซ้อนวีดีโอ)
// ============================================================
import { useEffect, useMemo, useRef } from "react";
import { paintEos } from "./eosPaint";
import { fodlanAudio } from "../fodlan/fodlanAudio";
import { EOS_INTRO_MS, EOS_T, EOS_ZONE_INFO } from "./eosMeta";
import "./eosCine.css";

const FADE = 0.9; // จางเผยกระดานจริงจากจุดนี้ถึงจบ
// จุดกล้อง: u = เวลา (0..1) · x, y = จุดกลางบนแผนที่ (ช่อง) · z = ช่องที่เห็นตามแนวกว้างจอ · tilt = มุมเอียง (องศา) · yaw = หมุน (องศา)
const KEYS = [
  { u: 0.0, x: 16, y: 17, z: 44, tilt: 8, yaw: -18 },
  { u: 0.2, x: 15.5, y: 6, z: 20, tilt: 40, yaw: -6 },
  { u: 0.42, x: 20.5, y: 14.5, z: 18, tilt: 48, yaw: 8 },
  { u: 0.62, x: 23, y: 25, z: 18, tilt: 50, yaw: 18 },
];
const ZONES = [
  { id: "insomnia", u0: 0.12, u1: 0.3 },
  { id: "duscae", u0: 0.34, u1: 0.52 },
  { id: "desert", u0: 0.55, u1: 0.71 },
];
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
// Catmull-Rom ระหว่างจุดกล้อง (ลื่นต่อเนื่อง ไม่หยุดกระตุกที่แต่ละจุด)
function camAt(keys, u) {
  if (u <= keys[0].u) return keys[0];
  const n = keys.length;
  if (u >= keys[n - 1].u) return keys[n - 1];
  let i = 0;
  while (i < n - 2 && u > keys[i + 1].u) i++;
  const a = keys[Math.max(0, i - 1)], b = keys[i], c = keys[i + 1], d = keys[Math.min(n - 1, i + 2)];
  const t = (u - b.u) / (c.u - b.u);
  const cr = (p0, p1, p2, p3) => 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
  const out = {};
  for (const k of ["x", "y", "z", "tilt", "yaw"]) out[k] = cr(a[k], b[k], c[k], d[k]);
  return out;
}

export default function EosCine({ D = Math.round((1 - EOS_T.crash) * EOS_INTRO_MS), live = true, board = null, self = null, night = false, lowQ = false }) {
  const rootRef = useRef(null);
  const stageRef = useRef(null);
  const sheetRef = useRef(null);
  const ringRef = useRef(null);
  const cloudRef = useRef(null);
  const zoneRefs = useRef({});
  const liveRef = useRef(live);
  useEffect(() => { liveRef.current = live; }, [live]);
  const me = self && Number.isFinite(self.x) ? self : { x: 15.5, y: 15.5 };
  const keys = useMemo(() => [...KEYS, { u: 0.86, x: me.x + 0.5, y: me.y + 0.5, z: 12, tilt: 46, yaw: 4 }, { u: 1, x: me.x + 0.5, y: me.y + 0.5, z: 9, tilt: 42, yaw: 0 }], [me.x, me.y]);

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return undefined;
    let painted = null;
    try { painted = paintEos(board, { size: lowQ ? 1024 : 1536, night }); } catch (err) { console.error("[eos] วาดแผนที่ฉากเปิดไม่ได้:", err); }
    if (painted) {
      painted.canvas.className = "eoc-map";
      sheet.prepend(painted.canvas);
    }
    const T = painted ? painted.T : 48;
    const W = painted ? painted.canvas.width : 1536, H = painted ? painted.canvas.height : 1536;
    sheet.style.width = `${W}px`; sheet.style.height = `${H}px`;
    if (ringRef.current) { ringRef.current.style.left = `${(me.x + 0.5) * T}px`; ringRef.current.style.top = `${(me.y + 0.5) * T}px`; ringRef.current.style.setProperty("--r", `${T * 0.9}px`); }
    let raf = 0, t0 = 0, swooped = false;
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (!liveRef.current) return;
      if (!t0) t0 = now;
      const u = import.meta.env.DEV && window.__eosU != null ? window.__eosU : Math.min(1, (now - t0) / D);
      const uc = ease(u) * 0.35 + u * 0.65; // เวลาของกล้อง (เร่ง-ผ่อนเล็กน้อย) — ชื่อโซนใช้จังหวะเดียวกัน
      const c = camAt(keys, uc);
      const vw = window.innerWidth || 1280;
      const s = vw / (c.z * T); // พิกเซลจอต่อพิกเซลภาพ
      // จุดกลางแผนที่ (c.x, c.y) อยู่กลางจอ · เอียงรอบจุดนั้น
      sheet.style.transformOrigin = `${c.x * T}px ${c.y * T}px`;
      sheet.style.transform = `translate(${-c.x * T}px, ${-c.y * T}px) rotateX(${c.tilt}deg) rotateZ(${c.yaw}deg) scale(${s})`;
      // เมฆ: ช่วงแรกทึบ แยกออกสองข้าง
      if (cloudRef.current) {
        const k = Math.min(1, u / 0.2);
        cloudRef.current.style.opacity = String(1 - ease(k));
        cloudRef.current.style.setProperty("--spread", `${ease(k) * 60}vw`);
      }
      for (const z of ZONES) {
        const el = zoneRefs.current[z.id];
        if (!el) continue;
        const on = uc >= z.u0 && uc <= z.u1;
        el.dataset.on = on ? "true" : "false";
      }
      if (ringRef.current) ringRef.current.style.opacity = String(Math.max(0, Math.min(1, (u - 0.72) / 0.1)));
      if (!swooped && u >= 0.66) { swooped = true; try { fodlanAudio().sfx("cine_swoop", { gain: 0.7 }); } catch { /* ไม่มีเสียง */ } }
      const el = rootRef.current;
      if (el) el.style.opacity = String(1 - Math.pow(Math.max(0, (u - FADE) / (1 - FADE)), 1.4));
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); if (painted) painted.canvas.remove(); };
    // ฉากสร้างครั้งเดียวต่อการ mount (ข้อมูลกระดานตอนเริ่มแมตช์)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={rootRef} className={`eoc${live ? " is-live" : ""}${night ? " is-night" : ""}`} aria-hidden="true">
      <div ref={stageRef} className="eoc-stage">
        <div ref={sheetRef} className="eoc-sheet">
          <i ref={ringRef} className="eoc-ring" />
        </div>
      </div>
      <i className="eoc-haze" />
      <i className="eoc-rays" />
      {!lowQ && <div className="eoc-birds">{[0, 1, 2, 3, 4].map((i) => <i key={i} style={{ "--i": i }} />)}</div>}
      <div ref={cloudRef} className="eoc-clouds"><i className="l" /><i className="r" /><i className="m" /></div>
      {ZONES.map((z) => {
        const info = EOS_ZONE_INFO[z.id] || {};
        return (
          <div key={z.id} ref={(el) => { zoneRefs.current[z.id] = el; }} className="eoc-zone" data-on="false" style={{ "--c": info.c, "--g": info.g }}>
            <b>{info.name}</b>
            <span>{info.latin}</span>
          </div>
        );
      })}
      <i className="eoc-flash" />
      <i className="eoc-bar top" />
      <i className="eoc-bar bot" />
      <i className="eoc-vig" />
    </div>
  );
}
