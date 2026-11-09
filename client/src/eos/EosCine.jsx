// ============================================================
//  ฉากเข้าสนาม Eos (GRID_PLAN §8.6) — ครึ่งหลังของฉากเดียวต่อเนื่องใน MatchIntro โหมด eos (App.startPendingJourney)
//   ก่อนหน้า: ลูกโลกร่วมหมุนหาหมุด Eos → หมุดเรือง → ดิ่งชนผิวโลก (eosFlight.js)
//  <EosCine D={ms} live board self night lowQ />
//   mount ตั้งแต่เริ่มช่วงลูกโลก (สร้างฉาก 3D + คอมไพล์ shader ล่วงหน้า · ยังไม่วาด) → live = true ตอนชน (EOS_T.crash)
//   แฟลชฟ้าคริสตัล → ทะลุชั้นเมฆ → บินโค้งเหนือกระดานจริง (eosFly.js) ผ่านคริสตัลนครหลวง → ลดระดับลงหาหมากของเรา
//   → จางเผยกระดานจริงข้างใต้ (App วางกระดานไว้ตั้งแต่ใต้แฟลช — EOS_HANDOFF)
//  ไม่มีข้อความบนจอ · เสียง: ไฟล์ฉาก Fodlan เดิม (cine_swoop) ตอนโฉบลง — ไม่ใช่วีดีโอ ไม่ขัดกฎเสียงซ้อนวีดีโอ
// ============================================================
import { useEffect, useRef } from "react";
import { createEosFly } from "./eosFly";
import { fodlanAudio } from "../fodlan/fodlanAudio";
import { EOS_INTRO_MS, EOS_T } from "./eosMeta";
import "./eosCine.css";

const FADE = 0.88; // จางเผยกระดานจริงจากจุดนี้ถึงจบ

export default function EosCine({ D = Math.round((1 - EOS_T.crash) * EOS_INTRO_MS), live = true, board = null, self = null, night = false, lowQ = false }) {
  const rootRef = useRef(null);
  const cvRef = useRef(null);
  const flyRef = useRef(null);
  const liveRef = useRef(live);
  useEffect(() => { liveRef.current = live; }, [live]);

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return undefined;
    let fly = null;
    try { fly = createEosFly(cv, { board, self, lowQ, night }); } catch (err) { console.error("[eos] สร้างฉากบินไม่ได้:", err); }
    flyRef.current = fly;
    if (import.meta.env.DEV) window.__eosFly = fly; // ตรวจฉากจากคอนโซล
    const onResize = () => fly?.resize();
    window.addEventListener("resize", onResize);
    let raf = 0, t0 = 0, swooped = false;
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (!liveRef.current || !fly) return;
      if (!t0) t0 = now;
      // dev: window.__eosU = 0..1 หยุดฉากไว้ที่จุดนั้น
      const u = import.meta.env.DEV && window.__eosU != null ? window.__eosU : Math.min(1, (now - t0) / D);
      if (!swooped && u >= 0.5) { swooped = true; try { fodlanAudio().sfx("cine_swoop", { gain: 0.7 }); } catch { /* ไม่มีเสียง */ } }
      fly.frame(u, (now - t0) / 1000);
      const el = rootRef.current;
      if (el) el.style.opacity = String(1 - Math.pow(Math.max(0, (u - FADE) / (1 - FADE)), 1.4));
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      fly?.dispose();
      flyRef.current = null;
    };
    // ฉากสร้างครั้งเดียวต่อการ mount (ข้อมูลกระดานตอนเริ่มแมตช์)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={rootRef} className={`eoc${live ? " is-live" : ""}`} aria-hidden="true">
      <canvas ref={cvRef} className="eoc-cv" />
      <i className="eoc-flash" />
      <i className="eoc-bar top" />
      <i className="eoc-bar bot" />
      <i className="eoc-vig" />
    </div>
  );
}
