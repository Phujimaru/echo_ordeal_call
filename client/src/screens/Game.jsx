import { shopInfoOf, DRAW_ITEM_TYPES } from "../data/shop";
import EosMap from "../eos/EosMap";
import EosGuide from "../eos/EosGuide";
import EosSituation from "../eos/EosSituation";
import EosAlerts from "../eos/EosAlerts";
import { eosSituation, SIT_COUNT as sitCount } from "../eos/eosSitData";
import EosZoneCard from "../eos/EosZoneCard";
import EosScoreboard from "../eos/EosScoreboard";
import EosPerks from "../eos/EosPerks";
import { beginNotice, endNotice, noticeBusy, onNotice } from "../ui/noticeBus";
import { useTick, TickSeconds } from "../tickStore";
import { PERMANENT_STATUS_KEYS } from "../data/permanentStatus";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Card from "../components/Card";
import Button from "../components/Button";
import VictoryScreen from "../components/VictoryScreen";
import ArenaBackdrop from "../components/ArenaBackdrop";
import JourneyBackdrop from "../journey/JourneyBackdrop";
import ArenaScene from "../journey/arena/ArenaScene";
import { arenaLayout } from "../journey/arena/arenaData";
import { journeyArea } from "../journey/areas";
import { fodlanStage } from "../fodlan/stages";
import { RoundBanner, CycleScene } from "../components/BattleScenes";
import { AvModal, AvButton } from "../components/avalon";
import { socket } from "../socket";
import { StatRow, VitalExtras } from "./hud/StatRow";
import { SkillSlot } from "./hud/SkillSlot";
import { DioGauge, DioInterrupt, LastStandDuel } from "./hud/DioHud";
import { FreddyDoors } from "./hud/FreddyDoors";
import { ClockUpButton, ClockDuel } from "./hud/ZectHud";
import { SelfHud, HudPanel, HudStatusDrawer, HudTopBar } from "./hud/SelfHud";
import { DrawDock, HudCommand, BagButton, PhaseCall } from "./hud/HudPhases";
import BagScreen from "./hud/BagScreen";
import ShopScreen from "./hud/shops/ShopScreen";
import { shopName } from "../board/shopProps";
import HikaruForms from "./hud/HikaruForms";
import SkillChoices from "./hud/SkillChoices";
import DiaryBook, { DiaryCenter } from "./hud/DiaryBook";
import RecallBadge from "./hud/RecallBadge";
import { BladeRouzerSlot, EvolutionScene, BladeRouzerPanel } from "./hud/BladeRouzer";
import OhgerSword from "./hud/OhgerSword";
import FaizPhone, { AxelClock } from "./hud/FaizPhone";
import { rosterOf, rosterAlive, sameSide, sideAlive, unitsOfSide } from "../duo";
import { requestAttention } from "../attention";
import { clickSound, playSfx, stopSfx, sfxPlayId, playCutsceneVideo, suspendMusic, startLoopSfx, stopLoopSfx, pauseLoopSfx, resumeLoopSfx } from "../audio";
import BoardStage from "../board/BoardStage";
import YukiBoom from "../board/YukiBoom";
import ArjunaUlt from "../board/ArjunaUlt";
import { preloadArjunaUlt } from "../board/arjunaFx";
import * as Rules from "../board/boardRules";
import { holdBoard } from "../board/boardPause";

const P_DISPLAY = "var(--font-p-display)";
const TEAM_COLORS = { A: "#22d3ee", B: "#f97316", C: "#a3e635" };
function teamAccent(teamId) {
  return TEAM_COLORS[teamId] || "var(--color-p-accent-bright)";
}
function TeamBadge({ teamId, className = "" }) {
  if (!teamId) return null;
  const accent = teamAccent(teamId);
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] sm:text-xs font-black text-black shadow-lg whitespace-nowrap ${className}`}
      style={{ background: accent, borderColor: "rgba(255,255,255,.55)", boxShadow: `0 0 14px ${accent}66` }}
    >
      Team {teamId}
    </span>
  );
}
// ขนาดจอ (อัปเดตเมื่อหมุน/ย่อขยาย) — ใช้ย่อทั้งกระดานให้พอดีจอ รองรับมือถือแนวตั้ง
function useViewport() {
  const [vp, setVp] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 1280,
    h: typeof window !== "undefined" ? window.innerHeight : 720,
  }));
  useEffect(() => {
    const onResize = () => {
      const vv = window.visualViewport;
      setVp({ w: vv ? vv.width : window.innerWidth, h: vv ? vv.height : window.innerHeight });
    };
    onResize();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    if (window.visualViewport) window.visualViewport.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      if (window.visualViewport) window.visualViewport.removeEventListener("resize", onResize);
    };
  }, []);
  return vp;
}

// เช็คว่าการ์ดคู่ต่อสู้คนนี้กดโจมตี/เลือกเป็นเป้าหมายได้ไหม — ใช้ร่วมกันทั้ง layout มือถือและจอใหญ่
function isTargetable(p, iAmAttacker, c) {
  const friendly = c.teamModeActive && c.myTeamId && p.teamId === c.myTeamId;
  const self = p.id === c.myId;
  const normalAttackTarget = iAmAttacker && !friendly;
  // โอเบรอน (ฤดูร้อน): โหมดเลือกเป้าหมายกลาง — ตัวเองกดปุ่ม "เลือกตัวเอง" บนแบนเนอร์
  //  anyone = เลือกศัตรูได้แม้โหมดทีม (โอเบรอนใช้ผลเสียของท่ากับศัตรูได้) · ไม่งั้นโหมดทีมเลือกได้เฉพาะเพื่อน (server กันซ้ำ)
  //  onlyIds = จำกัดเฉพาะบางคน
  const giftTarget = !!c.giftSel && (!c.giftSel.onlyIds || c.giftSel.onlyIds.includes(p.id)) && (c.giftSel.anyone || !c.teamModeActive || friendly);
  return (normalAttackTarget || giftTarget) && p.alive;
}
// แตะ/คลิกการ์ดคู่ต่อสู้แล้วต้องทำอะไร — ไล่ตามโหมดเลือกเป้าหมายที่เปิดอยู่ ไม่มีเลยก็โจมตีปกติ
function resolveAttackPick(id, c) {
  if (c.giftSel) return c.pickGift(id);
  return socket.emit("attack", { targetId: id });
}

// ---------- cutscene แปลงร่าง (วีดีโอเต็มจอ ครั้งแรกต่อเกมเท่านั้น) ----------
//  ~950ms แรก: การ์ดเปิดตัวเท่ๆ บอกว่าใครใช้ (ชื่อ+รูปโปรไฟล์ใหญ่ ไม่มี title ท่า)
//  วีดีโอเล่นอยู่ตลอด (ไม่หน่วง ไม่กินเวลาที่ server กำหนด) — หลังจากนั้นเหลือแค่ title ท่ามุมบน ไม่มีรูปทับอีก
function Cutscene({ cs }) {
  const ref = useRef(null);
  const [introDone, setIntroDone] = useState(false);
  useEffect(() => holdBoard(), []); // วีดีโอทึบเต็มจอบังกระดาน → พักวาดกระดานให้เครื่องถอดรหัสวีดีโอได้เต็มที่
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    return playCutsceneVideo(v);
  }, [cs.id]); // remount ต่อ cutscene -> เล่นวีดีโอใหม่เสมอ (กันจอดำตอนท่าเดียวกันต่อกัน)
  useEffect(() => {
    // noIntro: คลิปสั้นมาก — ข้ามการ์ดเปิดตัวไปเข้าวีดีโอเลย
    if (cs.noIntro) { setIntroDone(true); return; }
    setIntroDone(false);
    const t = setTimeout(() => setIntroDone(true), 950);
    return () => clearTimeout(t);
  }, [cs.id, cs.noIntro]);

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden">
      <video ref={ref} src={cs.video} poster={cs.img || undefined} preload="auto" autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-white cut-flash pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle, transparent 45%, rgba(0,0,0,0.75) 100%)" }} />
      {!introDone && (
        <div className="absolute inset-0 z-10 bg-black/70 flex flex-col items-center justify-center gap-3 transition-opacity duration-200">
          <div className="flex items-center gap-3">
            <div className="cut-portrait cut-glow rounded-2xl overflow-hidden w-32 h-32 sm:w-44 sm:h-44 border-4" style={{ borderColor: cs.color, "--cut-color": cs.color }}>
              <img src={cs.img} alt="" className="w-full h-full object-cover" />
            </div>
            {cs.img2 && (
              <div className="cut-portrait cut-glow rounded-2xl overflow-hidden w-32 h-32 sm:w-44 sm:h-44 border-4" style={{ borderColor: cs.color, "--cut-color": cs.color }}>
                <img src={cs.img2} alt="" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
          <div className="cut-title text-3xl sm:text-4xl font-black drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            <span style={{ color: cs.color }}>{cs.name}</span>
          </div>
          {cs.label && <div className="text-lg sm:text-xl font-bold opacity-90 -mt-2">{cs.label}!</div>}
        </div>
      )}
      {/* เจ้าหญิง Echo: คลิปของร่างที่สวมจากไดอารี่ = โปรไฟล์ Echo มุมขวาล่าง (cs.recall — characters/echo.js recallOf) */}
      <RecallBadge recall={cs.recall} />
      {introDone && cs.title && ( // ไม่มีชื่อ (แปลงร่างไรเดอร์ ZECT) = ไม่ขึ้นตัวอักษรบนคลิป
        <div className="absolute top-[8%] inset-x-0 text-center px-4 transition-opacity duration-200">
          <div className="cut-title glitch text-4xl sm:text-6xl font-black" data-text={cs.title}>{cs.title}</div>
        </div>
      )}
    </div>
  );
}

// ---------- อนิเมชันบอกว่าใครตีใคร + สกิลที่มีผลกับการโจมตีครั้งนี้ ----------
//  แถวสกิลข้างใต้บอกว่า "ทำไมความเสียหายถึงเป็นเท่านี้ / ทำไมป้องกันได้"
//  choreography ใหม่: พุ่งเข้าปะทะ -> แฟลชกระทบ -> ตัวเลข/ผล -> สกิลไล่เข้าทีละใบ — ทั้งหมดต้องจบภายใน a.fxMs (server เป็นคนคุมเวลาตัดฉาก)
// การ์ดเหตุผลดาเมจ 1 ใบ (แถวใครตี/ป้องกันด้วยอะไร) — ต้องอยู่นอก AttackFx เป็น component คงที่
//  ถ้าประกาศซ้อนอยู่ข้างในจะได้ function reference ใหม่ทุก re-render (ทุกครั้งที่ state broadcast เข้ามาระหว่างฉากโจมตี)
//  ทำให้ React มองว่าเป็นคนละ component แล้ว unmount/remount เล่นอนิเมชันบินเข้าใหม่ซ้ำๆ ทั้งที่ข้อมูลเดิม
function AttackSkillCard({ s, i }) {
  return (
    <motion.div
      className="fx-skill"
      style={{ "--sc": s.color || "var(--av-orchid)" }}
      initial={{ opacity: 0, x: -26, filter: "blur(8px)" }}
      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.34, delay: i * 0.09, ease: [0.16, 1, 0.3, 1] }}
    >
      <span className="fx-skill-edge" />
      {s.img ? (
        <img src={s.img} alt="" className="fx-skill-img" />
      ) : (
        <span className="fx-skill-rune">✦</span>
      )}
      <div className="text-left leading-tight min-w-0">
        <div className="av-heading text-sm truncate" style={{ color: "var(--av-gold-lit)" }}>{s.name}</div>
        <div className="av-heading text-xs truncate" style={{ color: s.color }}>{s.by}</div>
      </div>
    </motion.div>
  );
}

function DrawCall() {
  const cards = Array.from({ length: 11 }, (_, i) => {
    const a = (i / 11) * Math.PI * 2 + 0.4;
    const d = 30 + (i % 4) * 9;
    return {
      dx: `${(Math.cos(a) * d).toFixed(1)}vw`,
      dy: `${(Math.sin(a) * d * 0.82).toFixed(1)}vh`,
      dr: `${(i % 2 ? 1 : -1) * (320 + (i % 5) * 90)}deg`,
      dur: 1.35 + (i % 4) * 0.16,
      delay: (i % 6) * 0.045,
    };
  });
  return (
    <div className="dc">
      <div className="dc-wash" />
      <span className="dc-ring" />
      {cards.map((c, i) => (
        <span
          key={i}
          className="dc-card"
          style={{
            "--dx": c.dx,
            "--dy": c.dy,
            "--dr": c.dr,
            animationDuration: `${c.dur}s`,
            animationDelay: `${c.delay}s`,
          }}
        />
      ))}
      <div className="absolute inset-0 grid place-items-center">
        <div
          className="dc-text av-title av-title-thai text-8xl"
          style={{
            background: "linear-gradient(180deg,#fff 0%,#dcebfa 40%,#b95fc4 70%,#3b1454 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          เริ่มจั่วการ์ด
        </div>
      </div>
    </div>
  );
}

function AttackCall() {
  const sparks = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2 + 0.25;
    const d = 22 + (i % 5) * 8;
    return {
      sx: `${(Math.cos(a) * d).toFixed(1)}vw`,
      sy: `${(Math.sin(a) * d * 0.85).toFixed(1)}vh`,
      size: 3 + (i % 3) * 2,
      delay: 0.18 + (i % 6) * 0.03,
    };
  });
  return (
    <div className="ac">
      <div className="ac-wash" />
      <span className="ac-blade ac-blade-a" />
      <span className="ac-blade ac-blade-b" />
      <span className="ac-ring" />
      <span className="ac-chev ac-chev-l" />
      <span className="ac-chev ac-chev-r" />
      {sparks.map((k, i) => (
        <span
          key={i}
          className="rb-spark"
          style={{
            width: k.size,
            height: k.size,
            marginLeft: -k.size / 2,
            marginTop: -k.size / 2,
            "--sx": k.sx,
            "--sy": k.sy,
            animationDelay: `${k.delay}s`,
          }}
        />
      ))}
      <div className="absolute inset-0 grid place-items-center">
        <div
          className="ac-text av-title av-title-thai text-8xl"
          style={{
            background: "linear-gradient(180deg,#fff 0%,#eaf3fc 38%,#ff9d6b 66%,#8d1622 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          เริ่มโจมตีได้
        </div>
      </div>
    </div>
  );
}

function AttackFx({ a }) {
  const total = a.fxMs || 3000;
  const [stage, setStage] = useState(0);
  useEffect(() => {
    setStage(0);
    const t1 = setTimeout(() => setStage(1), Math.min(460, total * 0.3));
    const t2 = setTimeout(() => setStage(2), Math.min(780, total * 0.44));
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [a.id, total]);

  const speeds = useMemo(
    () => Array.from({ length: 15 }, (_, i) => ({ top: 3 + i * 6.4, h: 1 + (i % 3), delay: (i % 6) * 0.035 })),
    []
  );
  const cracks = useMemo(
    () => Array.from({ length: 14 }, (_, i) => ({ deg: i * 25.7 + (i % 3) * 8, len: 26 + (i % 4) * 16, delay: (i % 5) * 0.025 })),
    []
  );

  const accent = a.dodge ? "#6fd8ff" : a.kill ? "#ff5f6d" : "#eaf3fc";
  const atkSkills = (a.skills || []).filter((sk) => (sk.side ? sk.side === "atk" : sk.by === a.byName));
  const defSkills = (a.skills || []).filter((sk) => (sk.side ? sk.side === "def" : sk.by !== a.byName));

  return (
    <div className="fx">
      <div className="fx-veil" />

      {stage < 1 && speeds.map((sp, i) => (
        <span key={i} className="fx-speed" style={{ top: `${sp.top}%`, height: sp.h, animationDelay: `${sp.delay}s` }} />
      ))}

      {stage >= 1 && (
        <>
          <span className="fx-white" />
          <span
            className="fx-shock"
            style={{ borderColor: accent, boxShadow: `0 0 60px 14px ${accent}99, inset 0 0 40px 8px ${accent}55` }}
          />
          {cracks.map((c, i) => (
            <span
              key={i}
              className="fx-crackline"
              style={{
                width: `${c.len}vw`,
                "--ca": `${c.deg}deg`,
                animationDelay: `${c.delay}s`,
                background: `linear-gradient(90deg, #fff, ${accent} 28%, transparent)`,
              }}
            />
          ))}
        </>
      )}

      <div className={`absolute inset-0 flex flex-col items-center justify-center gap-6 px-[6vw] ${stage === 1 ? "fx-shake" : ""}`}>
        <div className="relative w-full max-w-6xl flex items-center justify-between">
          <motion.div
            className="flex flex-col items-center gap-2 shrink-0"
            initial={{ x: -280, opacity: 0, rotate: -12 }}
            animate={{ x: 0, opacity: 1, rotate: -4 }}
            transition={{ duration: 0.42, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div className="fx-portrait w-36 h-36" style={{ borderColor: a.byColor, boxShadow: `0 0 40px -8px ${a.byColor}` }}>
              <img src={a.byImg} alt="" />
            </div>
            <span className="av-chip" style={{ borderColor: a.byColor, color: a.byColor }}>{a.byName}</span>
          </motion.div>

          <div className="flex-1 grid place-items-center min-w-0">
            {stage >= 1 && (
              <div className="fx-dmg text-center">
                {a.dodge ? (
                  <div
                    className="av-title av-title-thai text-7xl"
                    style={{ background: "linear-gradient(180deg,#fff,#6fd8ff 60%,#2f8fb8)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}
                  >
                    หลบพ้น
                  </div>
                ) : a.kill ? (
                  <div
                    className="av-title av-title-thai text-7xl"
                    style={{ background: "linear-gradient(180deg,#fff,#ff8a94 55%,#8d1622)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}
                  >
                    สังหาร
                  </div>
                ) : (
                  <span className="av-title text-[10rem] leading-none" style={{ WebkitTextStroke: "2px rgba(28,63,110,.55)" }}>
                    -{a.dmg}
                  </span>
                )}
                <div className="flex items-center justify-center gap-2 mt-2">
                </div>
              </div>
            )}
          </div>

          <motion.div
            className="flex flex-col items-center gap-2 shrink-0"
            initial={{ rotate: 4 }}
            animate={stage >= 1 ? { x: [0, 30, -12, 0], rotate: [4, 13, 4] } : {}}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div
              className="fx-portrait w-36 h-36"
              style={{
                borderColor: a.targetColor,
                boxShadow: `0 0 40px -8px ${a.targetColor}`,
                filter: stage >= 1 && a.kill ? "grayscale(1) brightness(0.7)" : undefined,
                transition: "filter .5s ease",
              }}
            >
              <img src={a.targetImg} alt="" />
            </div>
            <span className="av-chip" style={{ borderColor: a.targetColor, color: a.targetColor }}>{a.targetName}</span>
          </motion.div>
        </div>

        {stage >= 2 && (atkSkills.length > 0 || defSkills.length > 0) && (
          <div className="grid grid-cols-2 gap-x-8 w-full max-w-3xl items-start">
            <div className="flex flex-col items-center gap-1.5">
              {atkSkills.length > 0 && (
                <span className="av-chip" style={{ borderColor: a.byColor, color: a.byColor }}>ฝั่งโจมตี</span>
              )}
              {atkSkills.map((sk, i) => <AttackSkillCard key={i} s={sk} i={i} />)}
            </div>
            <div className="flex flex-col items-center gap-1.5">
              {defSkills.length > 0 && (
                <span className="av-chip" style={{ borderColor: a.targetColor, color: a.targetColor }}>ฝั่งป้องกัน</span>
              )}
              {defSkills.map((sk, i) => <AttackSkillCard key={i} s={sk} i={i} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- สกิลช่วงจั่วการ์ด: เด้งขึ้นทันทีบนกระดาน (ไม่ตัดเข้าจอดำ) ----------
function SkillFlash({ f }) {
  return (
    <div className="absolute top-[58%] left-1/2 -translate-x-1/2 z-40 pointer-events-none">
      <div className="pop-in flex items-center gap-3 bg-black/75 rounded-2xl px-4 py-2 border-2 text-hard" style={{ borderColor: f.color }}>
        {f.img ? (
          <img src={f.img} alt="" className="w-16 h-11 object-cover rounded-lg" />
        ) : (
          <span className="text-2xl">✦</span>
        )}
        <div className="text-left leading-tight">
          <div className="text-lg font-black text-echo-ice">{f.name}</div>
          <div className="text-sm font-bold" style={{ color: f.color }}>{f.by} ใช้สกิล</div>
        </div>
      </div>
    </div>
  );
}

// ---------- โหมดประหยัด (patch 2.0.6): ข้ามวีดีโอคัตซีน — แจ้งเตือนแทน แต่ยังรอเวลาเท่าวีดีโอจริง ----------
//  ผู้เล่นที่เปิดโหมดนี้จะเห็นแค่ว่าใครเปิดท่าไม้ตาย/สกิลอะไร พร้อมนับถอยหลังรอคนอื่นดูวีดีโอจบ
function CutsceneSkipNotice({ cs }) {
  const timeLeft = useTick();
  return (
    <div className="fixed top-[32%] left-1/2 -translate-x-1/2 z-40 pointer-events-none px-3 max-w-full">
      <div className="pop-in flex items-center gap-3 bg-black/85 rounded-2xl px-4 py-2.5 border-2 text-hard" style={{ borderColor: cs.color }}>
        {cs.img ? (
          <img src={cs.img} alt="" className="w-16 h-16 object-cover rounded-xl border-2 shrink-0" style={{ borderColor: cs.color }} />
        ) : (
          <span className="text-2xl">✦</span>
        )}
        <div className="text-left leading-tight">
          <div className="text-lg font-black" style={{ color: cs.color }}>{cs.name} {cs.label || "ปล่อยท่าไม้ตาย"}!</div>
          <div className="text-sm font-bold text-echo-ice">{cs.title}</div>
          <div className="text-xs opacity-80 mt-0.5">🎬 โหมดประหยัด — รอผู้เล่นอื่นดูวีดีโอให้จบ ({timeLeft} วิ)</div>
        </div>
      </div>
    </div>
  );
}

// ---------- แจ้งเตือนแปลงร่างซ้ำ (ครั้งที่ 2 เป็นต้นไป): การ์ดเล็กๆ ไม่หยุดเกม ----------
function TransformNotice({ n }) {
  return (
    <div className="fixed top-[58%] left-1/2 -translate-x-1/2 z-40 pointer-events-none">
      <div className="pop-in flex items-center gap-3 bg-black/75 rounded-2xl px-4 py-2 border-2 text-hard" style={{ borderColor: n.color }}>
        {n.img ? (
          <img src={n.img} alt="" className="w-16 h-16 object-cover rounded-xl border-2 shrink-0" style={{ borderColor: n.color }} />
        ) : (
          <span className="text-2xl">✦</span>
        )}
        <div className="text-left leading-tight">
          <div className="text-lg font-black" style={{ color: n.color }}>{n.name}</div>
          <div className="text-sm font-bold text-echo-ice">{n.label ? `${n.title} ${n.label}!` : n.title}</div>
        </div>
        <RecallBadge recall={n.recall} small />
      </div>
    </div>
  );
}

// ---------- การเดินทาง (ffa/duo/trio): หน้าต่างอ่านผลสนาม (ป้ายภูมิภาครวมอยู่ในแถบซ้ายบน HudTopBar แล้ว) ----------
//  ข้อความผลสนามมาจาก server (characters/_journey.js) ทั้งหมด — client ไม่เก็บตัวเลขบาลานซ์ซ้ำ
function JourneyInfoModal({ journey, onClose }) {
  const a = journeyArea(journey.area);
  const rows = [
    journey.passive && { k: "ตลอดภูมิภาค", v: journey.passive, on: true },
    { k: "☀️ กลางวัน", v: journey.day, on: !journey.night },
    { k: "🌙 กลางคืน", v: journey.nightDesc, on: journey.night },
  ].filter(Boolean);
  return (
    <AvModal tone="white" label={`การเดินทาง · ภูมิภาคที่ ${journey.area}`} title={journey.name} onClose={onClose} width="min(34rem, 94vw)">
      <div className="flex flex-col gap-2">
        {rows.map((r) => (
          <div key={r.k} className="rounded-xl px-3 py-2 border" style={{ borderColor: r.on ? `${a.color}aa` : "var(--avm-line, rgba(255,255,255,.1))", background: r.on ? `${a.color}1f` : "rgba(255,255,255,.03)", opacity: r.on ? 1 : 0.55 }}>
            <div className="av-heading text-xs avm-k" style={{ "--avm-c": a.color, color: r.on ? `var(--avm-on, ${a.glow})` : "var(--avm-dim, rgba(234,243,252,.6))" }}>{r.k}{r.on && r.k !== "ตลอดภูมิภาค" ? " (ตอนนี้)" : ""}</div>
            <div className="text-sm leading-relaxed">{r.v}</div>
          </div>
        ))}
        <div className="text-xs opacity-60 text-center mt-1">
          {journey.turnsLeft != null ? `เดินทางต่อไปยังภูมิภาคถัดไปในอีก ${journey.turnsLeft} เทิร์น` : "สุดทางแล้ว — ภูมิภาคนี้จะอยู่ไปจนจบเกม"}
        </div>
      </div>
    </AvModal>
  );
}

const ARENA_FALLBACK_COLS = ["#3d8bd9", "#9b4f96", "#e0812f", "#2fa39a", "#d2455b", "#6b7fd6", "#c49a2c"];
function ArenaBackground({ area, night, lowQ, spec }) {
  const { W, H, seats } = useMemo(() => {
    const [n, w, h, colors] = spec.split("~");
    const lay = arenaLayout(Number(w), Number(h), area, Number(n));
    const cols = colors.split("|");
    return {
      W: Number(w), H: Number(h),
      seats: [{ phi: 90, col: cols[0] || ARENA_FALLBACK_COLS[0], me: true },
        ...lay.others.map((o, i) => ({ phi: o.phi, stem: o.stem, col: cols[i + 1] || ARENA_FALLBACK_COLS[(i + 1) % 7] }))],
    };
  }, [spec, area]);
  return <ArenaScene area={area} night={night} lowQ={lowQ} W={W} H={H} seats={seats} />;
}

// ---------- ฉากหลังกลางวัน/กลางคืน (patch 1.7) ----------
//  กลางวัน = background_morning.jpg | กลางคืน = background_night.jpg
//  เปลี่ยนช่วงเวลาแบบ crossfade ช้าๆ (ไม่ตัดปุ๊บปั๊บ) — ซ้อนทั้ง 2 ภาพแล้วเฟดสลับกัน
function GameBackground({ cycle, round, lowQ, journey, arena }) {
  return (
    <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
      {/* การเดินทาง (ffa/duo/trio): ฉากหลังประจำภูมิภาค แยกกลางวัน/กลางคืน แทนสนามดอกไม้เดิม */}
      {/*  ภูมิภาค I–III (5.1.8): สนามประลอง 2.5D มุมกล้องเฉียง 55° — ที่นั่งบนพื้นสนามตรงกับการ์ดผู้เล่น (arena = ผังจาก GameBoard) */}
      {journey && arena
        ? <ArenaBackground area={journey.area} night={journey.night} lowQ={lowQ} spec={arena} />
        : journey
          ? <JourneyBackdrop area={journey.area} night={journey.night} lowQ={lowQ} />
          : <ArenaBackdrop cycle={cycle} round={round} />}
      {/* ฉากหลังการเดินทางมีชั้นเกรดสีของตัวเองแล้ว (jb-grade) — ไม่ซ้อนดำเพิ่มอีกชั้น */}
      {!journey && <div className="absolute inset-0 bg-[#0b1d3a]/10" />}
    </div>
  );
}

// ---------- แบนเนอร์สลับช่วงเวลา (กลางวัน <-> กลางคืน ทุก 3 เทิร์น) ----------
// ---------- ฉากสลับกลางวัน/กลางคืน: วอชสีเต็มจอ + แถบแสงกวาดแนวทแยง + ไอคอนลอยขึ้นเรืองแสง + ข้อความคลี่ตัว ----------
// ---------- ฉากสรุปผล: ลีดเดอร์บอร์ดแนวนอน — แถวผู้ชนะ (ทองเรืองแสง เข้าจากซ้าย) บนสุด
//  ตามด้วยแถวผู้แพ้ (เข้าจากขวา มีเลขอันดับ) ด้านล่าง — คนละภาษาการออกแบบกับพอร์เทรตคู่แบบเดิมโดยสิ้นเชิง ----------
function Laurel({ size = 250 }) {
  const leaves = Array.from({ length: 22 }, (_, i) => i);
  return (
    <svg className="sum-laurel" width={size} height={size * 0.55} viewBox="0 0 260 143" aria-hidden="true">
      {leaves.map((i) => {
        const side = i % 2 === 0 ? -1 : 1;
        const t = Math.floor(i / 2) / 10;
        const ang = Math.PI * (0.5 + t * 0.4);
        const cx = 130 + Math.cos(ang) * 120 * side;
        const cy = 140 - Math.sin(ang) * 100;
        return (
          <ellipse
            key={i}
            cx={cx}
            cy={cy}
            rx="11"
            ry="4.6"
            fill="#eaf3fc"
            transform={`rotate(${side * (26 + t * 44)} ${cx} ${cy})`}
          />
        );
      })}
    </svg>
  );
}

function SummaryTiers({ winners, losers, compact }) {
  if (!winners.length && !losers.length) return null;
  const winAvatar = compact ? 54 : 72;
  const loseAvatar = compact ? 32 : 40;
  return (
    <div className="sum">
      <div className="sum-veil" />

      <div className="sum-head relative z-10 flex flex-col items-center gap-1">
        <span className="av-label">ผลการจั่วไพ่</span>
        <span className="av-crack" style={{ position: "relative", width: compact ? "16rem" : "26rem", height: 2 }} />
      </div>

      <div
        className="relative z-10 flex flex-col items-center gap-2"
        style={{ width: compact ? "min(24rem, 92vw)" : "min(40rem, 80vw)" }}
      >
        {winners.map((p, i) => (
          <div key={p.id} className="sum-win w-full" style={{ animationDelay: `${i * 0.13}s` }}>
            <Laurel size={compact ? 190 : 250} />
            <img
              src={p.character?.cover || p.img}
              alt=""
              className="rounded-full object-cover shrink-0 relative"
              style={{ width: winAvatar, height: winAvatar, border: `2px solid ${p.color}`, boxShadow: `0 0 22px -4px ${p.color}` }}
            />
            <div className="min-w-0 flex-1 relative">
              <div className="av-label" style={{ fontSize: "0.68rem" }}>ผู้ชนะรอบนี้</div>
              <div className={`av-heading truncate text-white ${compact ? "text-lg" : "text-2xl"}`}>{p.name}</div>
            </div>
            <span className={`av-title relative shrink-0 ${compact ? "text-4xl" : "text-6xl"}`}>
              {p.busted ? "แตก" : p.score}
            </span>
          </div>
        ))}

        {losers.length > 0 && (
          <div className="w-full mt-2 flex flex-col">
            {losers.map((p, i) => (
              <div key={p.id} className="sum-row" style={{ animationDelay: `${0.2 + i * 0.08}s` }}>
                <span
                  className="av-numeral shrink-0 w-7 text-center"
                  style={{ fontSize: compact ? "1.5rem" : "2rem", WebkitTextStroke: "1.5px rgba(127,184,230,.55)" }}
                >
                  {i + 2}
                </span>
                <img
                  src={p.character?.cover || p.img}
                  alt=""
                  className="rounded-full object-cover grayscale shrink-0"
                  style={{ width: loseAvatar, height: loseAvatar, border: `1px solid ${p.color}` }}
                />
                <span
                  className={`av-heading truncate shrink-0 ${compact ? "text-sm" : "text-base"}`}
                  style={{ color: p.color, maxWidth: "11rem" }}
                >
                  {p.name}
                </span>
                <span className="sum-lead" />
                <span
                  className={`av-heading shrink-0 ${compact ? "text-sm" : "text-lg"}`}
                  style={{ color: p.busted ? "#e06a78" : "rgba(234,243,252,.8)" }}
                >
                  {p.busted ? "ไพ่แตก" : p.score}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// overlay ที่ใช้ร่วมกันทั้ง layout มือถือและจอใหญ่ (อนิเมชันตีกัน/ประกาศเปลี่ยนร่าง/แจ้งเตือนคัตซีน/สกิลแฟลช/แบนเนอร์กลางวันคืน)
// ระยะเวลาของแต่ละฉากประกาศ (มิลลิวินาที) — ต้องยาวพอให้อนิเมชันใน css เล่นจบ
//  ไม่งั้นฉากจะถูกถอดออกกลางคัน แล้วฉากถัดไปในคิวจะเด้งมาทับตอนอันเก่ายังจางไม่หมด
const SCENE_MS = { cycle: 3500, draw: 2000, atk: 2200, shop: 3700 };

function OverlayLayer({ phase, attack, csSkipped, flash, notice, cycleFx, boardFx = false }) {
  return (
    <>
      {!boardFx && phase === "ATTACKING" && attack && <AttackFx key={attack.id} a={attack} />}
      {csSkipped && <CutsceneSkipNotice key={csSkipped.id} cs={csSkipped} />}
      {flash && <SkillFlash key={flash.id} f={flash} />}
      {notice && <TransformNotice key={notice.id} n={notice} />}
      {cycleFx && <CycleScene key={cycleFx.id} c={cycleFx} />}
    </>
  );
}

// modal ต่างๆ ที่ต้อง mount ร่วมกันทั้ง layout มือถือและจอใหญ่ (ลำดับเดียวกันทั้งสองที่ กัน stacking เพี้ยน)
function ModalMounts({
  showChar, ch, me, onCloseChar,
  statusView, statusViewIsSelf, onCloseStatus,
  shop = null, onCloseShop, shopBlock,
  bagOpen, onCloseBag, players, gameState, roundNumber,
  myTurn, bagSlots, newBag = false, drawBag = null, onDrawUse,
  skillConfirm, onConfirmSkill, onCancelSkill, remoteShops = null, onRemoteShop,
}) {
  return (
    <>
      {showChar && ch && <CharModal ch={ch} me={me} onClose={onCloseChar} />}
      {statusView && <StatusModal p={statusView} statusOnly={statusViewIsSelf} onClose={onCloseStatus} />}
      {shop && (newBag
        ? <ShopScreen shop={shop} me={me} block={shopBlock} bagSlots={bagSlots || 5} onClose={onCloseShop} />
        : <ShopModal shop={shop} me={me} block={shopBlock} onClose={onCloseShop} />)}
      {bagOpen && newBag && <BagScreen me={me} players={players} myTurn={myTurn} bagSlots={bagSlots} draw={drawBag} onDrawUse={onDrawUse} statusOf={forecastStatusItems} onClose={onCloseBag} shops={remoteShops} onShop={onRemoteShop} />}
      {bagOpen && !newBag && <InventoryModal me={me} myTurn={myTurn} bagSlots={bagSlots} onClose={onCloseBag} />}
      {skillConfirm && <SkillConfirmModal confirm={skillConfirm} onConfirm={onConfirmSkill} onCancel={onCancelSkill} />}
      <CharVideoPreloader players={players} />
    </>
  );
}

// ชื่อเฟส (โชว์อนิเมชันตอนเปลี่ยนเฟส)

// ฉากสรุปผล: จัดผู้เล่นเป็นชั้นตามแต้ม (ไพ่แตก = -1) — ชั้นบนสุด (แต้มดีที่สุด) คือ "ผู้ชนะ" (เสมอกันได้หลายคน)
//  ชั้นที่เหลือทั้งหมดถือเป็น "ผู้แพ้" กลุ่มเดียวกัน ไม่แยกอันดับย่อย — ไม่พึ่ง isWinner/isLoser/winnerId เพราะแคบเกินไป (สุ่มมาแค่ 1 คน)
function rankTiers(players) {
  const combatants = players.filter((p) => p.score != null);
  if (!combatants.length) return [];
  const val = (p) => (p.busted ? -1 : p.score);
  const scores = [...new Set(combatants.map(val))].sort((a, b) => b - a);
  return scores.map((v) => ({ score: v, players: combatants.filter((p) => val(p) === v) }));
}


// รูปตัวละคร (เต็มกรอบ + fallback) — แยกชั้น "รูป" (overflow-hidden ตัดขอบ) ออกจากชั้น "ออร่า" (ต้องฟุ้งเลยขอบพอร์เทรตได้)
function Portrait({ p, className, rounded = "rounded-2xl" }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className={`relative ${className}`}>
      <div className={`absolute inset-0 overflow-hidden ${rounded}`} style={{ background: "linear-gradient(135deg,#3d8bd9,#12264a)" }}>
        {p.img && !broken ? (
          <img src={p.img} alt="" className="absolute inset-0 w-full h-full object-cover" onError={() => setBroken(true)} />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-3xl">🙂</span>
        )}
      </div>
    </div>
  );
}

function Shield({ on, size = 16 }) {
  const c = "#3d8bd9";
  return (
    <svg width={size} height={Math.round(size * 1.125)} viewBox="0 0 24 24" className="shrink-0">
      <path d="M12 2 L21 6 V12 C21 17 12 22 12 22 C12 22 3 17 3 12 V6 Z"
        fill={on ? c : "transparent"} stroke={c} strokeWidth="2" />
    </svg>
  );
}

function TargetLockLegacy() {
  return (
    <>
      <span className="p-target-ring" aria-hidden="true" />
      <span className="p-target-corner tl" aria-hidden="true" />
      <span className="p-target-corner tr" aria-hidden="true" />
      <span className="p-target-corner bl" aria-hidden="true" />
      <span className="p-target-corner br" aria-hidden="true" />
    </>
  );
}

// ---------- แถวเลือด + เกราะ (ใช้ร่วมกันทุกจุด) ----------
//  บังคับอยู่บรรทัดเดียวแนวนอนเสมอ ไม่หักขึ้นบรรทัดใหม่ตามความยาว — sm = ขนาดเล็ก (การ์ดคู่ต่อสู้มือถือ)
//  ตามคำขอ: กลับไปใช้หัวใจ/โล่แบบเดิม (เคยลองเปลี่ยนเป็นเกจแท่ง/เพชรเอียงแล้วไม่ถูกใจ)
function LifeBar({ p, sm, className = "" }) {
  // ตาบอด (สถานะ Universal): HP/เกราะ/โล่ของทุกคน (รวมตัวเอง) ถูกซ่อนเป็น null
  if (p.maxHp == null) {
    return (
      <span className={`inline-flex items-center gap-1 whitespace-nowrap shrink-0 ${sm ? "text-xs" : "text-sm"} font-black opacity-80 ${className}`} title="ถูกซ่อน (ตาบอด)">
        🌑 ???
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap shrink-0 ${className}`}>
      <span className={`${sm ? "text-sm" : "text-lg"} leading-none whitespace-nowrap`}>
        {Array.from({ length: p.maxHp }, (_, i) => (i < p.hp ? "❤️" : "🖤")).join("")}
      </span>
      {p.tempHp > 0 && <span className={`${sm ? "text-xs" : "text-sm"} text-echo-ice font-bold`}>💛{p.tempHp}</span>}
      <span className="inline-flex gap-0.5 shrink-0">
        {Array.from({ length: p.maxArmor }, (_, i) => <Shield key={i} on={i < p.armor} size={sm ? 12 : 16} />)}
      </span>
      {p.shield > 0 && <span className={`${sm ? "text-xs" : "text-sm"} text-echo-cyan font-bold`}>+🛡️{p.shield}</span>}
    </span>
  );
}

// ---------- สถานะผิดปกติ (patch 1.7.1): ตารางกลาง ไอคอน + ชื่อ + สี + คำอธิบาย ----------
//  คำอธิบาย (ผู้ใช้สั่ง 2026-10-09): ประโยคสั้น ไม่มีเครื่องหมาย/สัญลักษณ์ ไม่ขึ้นต้นด้วยชื่อสถานะซ้ำ · ตัวเลขเทิร์นที่เหลือแสดงที่ป้ายอยู่แล้ว ไม่ต้องเขียน
//  ใช้ทั้งป้ายเล็กบนการ์ดผู้เล่น และหน้าต่างรายละเอียด — ทุกคนเห็นสถานะของกันและกันได้
//  (แตะ/คลิกการ์ดผู้เล่นตอนที่ไม่ได้เลือกเป้าโจมตี เพื่อเปิดดูคำอธิบายเต็ม)
const STATUS_INFO = {
  hbleed:    { icon: "🩸", label: "เลือดไหล", cls: "bg-echo-hp", desc: "ต้นเทิร์นเสียพลังชีวิต 1 เกราะรับก่อน แล้วลดลงทีละ 1 และระหว่างนี้ฟื้นพลังชีวิตได้แค่ครึ่งเดียว" },
  hburn:     { icon: "🔥", label: "ลุกไหม้", cls: "bg-echo-hp", desc: "ต้นเทิร์นเสียพลังชีวิต 1 เกราะรับก่อน แล้วลดลงทีละ 1" },
  nodraw:    { icon: "🚫", label: "ห้ามจั่ว", cls: "bg-echo-hp", desc: "จั่วไพ่เพิ่มไม่ได้" },
  noskill:   { icon: "🚫", label: "ห้ามสกิล", cls: "bg-echo-hp", desc: "ใช้สกิลไม่ได้" },
  awaken:    { icon: "⏰", label: "ตื่นขึ้น", cls: "bg-echo-cyan text-gray-900", desc: "ต้นเทิร์นฟื้นพลังชีวิต 1" },
  sleep:     { icon: "💤", label: "หลับไหล", cls: "bg-echo-hp", desc: "ข้ามตาเดิน ใช้ของและซื้อของไม่ได้ ต้นเทิร์นเสียพลังชีวิต 1 ทะลุเกราะ แต่ไม่ถึงตาย" },
  poison:    { icon: "🧪", label: "พิษร้าย", cls: "bg-echo-magenta", desc: "ต้นเทิร์นเสียพลังชีวิต 1 เกราะรับก่อน และพลังโจมตีลดลง 1 ตลอดที่ติด" },
  shock:     { icon: "⚡", label: "ช็อต", cls: "bg-echo-ice text-gray-900", desc: "ต้นเทิร์นมีโอกาส 15% ติดสตั้น 1 เทิร์น" },
  curse:     { icon: "🕸️", label: "คำสาป", cls: "bg-echo-magenta", desc: "ใช้สกิลสำเร็จแล้วเสียพลังชีวิต 1 เกราะรับก่อน เทิร์นละครั้ง" },
  energy:    { icon: "🥤", label: "ชูกำลัง", cls: "bg-echo-cyan text-gray-900", desc: "ต้นเทิร์นได้แต้มสกิล 1 แต่เสียพลังชีวิต 1 เกราะรับก่อน ไม่ถึงตาย" },
  promo:     { icon: "📢", label: "เปิดแต้ม", cls: "bg-echo-ice text-gray-900", desc: "ทุกคนเห็นแต้มไพ่ของคุณ" },
  nohealing: { icon: "☠️", label: "ไร้ทางเยียวยา", cls: "bg-echo-hp", desc: "ฟื้นพลังชีวิตไม่ได้" },
  // ---------- สถานะพื้นฐาน universal (patch 2.0.8) ----------
  freecast:  { icon: "👸", label: "การ์ดราชินี", cls: "bg-echo-ice text-gray-900", desc: "ใช้สกิลครั้งถัดไปไม่เสียแต้มสกิล หายเมื่อจบเทิร์น" },
  stun:      { icon: "😵", label: "สตั้น", cls: "bg-echo-hp", desc: "ข้ามตาเดินทั้งตา และจั่วไพ่ไม่ได้" },
  chaa:     { icon: "🌀", label: "สภาพชา", cls: "bg-echo-hp", desc: "กดจั่วหนึ่งครั้งได้ไพ่สองใบ" },
  accurate: { icon: "🎯", label: "แม่นยำ", cls: "bg-echo-ice text-gray-900", desc: "การโจมตีของคุณเจาะการหลบทุกแบบ" },
  numb:     { icon: "🫨", label: "เหน็บชา", cls: "bg-echo-hp", desc: "ใช้สกิลมีโอกาส 30% ไม่ทำงาน แต่ยังเสียแต้มสกิล" },
  weak:      { icon: "🥀", label: "อ่อนแอ", cls: "bg-echo-hp", desc: "ดาเมจที่คุณทำลดลงตามจำนวนที่ระบุ" },
  fragile:   { icon: "💔", label: "เปราะบาง", cls: "bg-echo-hp", desc: "ดาเมจที่คุณได้รับเพิ่มขึ้นตามจำนวนที่ระบุ" },
  jutti:     { icon: "🪔", label: "จุติ", cls: "bg-amber-400 text-gray-900", desc: "ตายแล้วคืนชีพด้วยพลังชีวิต 1 ล้างดีบัฟทั้งหมด บัฟยังอยู่ (1 ครั้ง)" },
  arjunaPurge: { icon: "🔱", label: "ขจัดสิ่งแปลกปลอม", cls: "bg-cyan-500 text-gray-900", desc: "ตีปกติพลังโจมตี +1 · ตีปกติและท่าไม้ตาย ความเสียหายเพิ่มตามชนิดดีบัฟที่เป้าติดอยู่" },
  might:     { icon: "💪", label: "เสริมพลัง", cls: "bg-echo-ice text-gray-900", desc: "ดาเมจที่คุณทำเพิ่มขึ้นตามจำนวนที่ระบุ" },
  spellflow: { icon: "🌀", label: "กระแสเวท", cls: "bg-echo-cyan text-gray-900", desc: "สกิลทุกช่องถูกลงตามจำนวนที่ระบุ" },
  spellburden: { icon: "⛓️", label: "ภาระเวท", cls: "bg-echo-hp", desc: "สกิลทุกช่องแพงขึ้นตามจำนวนที่ระบุ สูงสุด 2 และไม่เกิน 8 แต้ม" },
  manaSeal:  { icon: "⛔", label: "ผนึกพลังงาน", cls: "bg-echo-hp", desc: "ฟื้นแต้มสกิลไม่ได้ทุกช่องทาง" },
  manaLeech: { icon: "🩸", label: "ดูดซับเวท", cls: "bg-echo-magenta", desc: "ใช้สกิลหรือได้แต้มสกิล มีโอกาส 35% ถูกขโมยแต้มสกิล 1" },
  manaRupture: { icon: "💥", label: "ระเบิดมานา", cls: "bg-echo-hp", desc: "ครบ 2 เทิร์นแล้วระเบิด แต้มสกิลยิ่งน้อยยิ่งเสียหายมาก" },
  drunk: { icon: "🍷", label: "มึนเมา", cls: "bg-echo-magenta", desc: "ใช้สกิลหรือจั่วไพ่มีโอกาสติดห้ามจั่ว ห้ามสกิล หรือสตั้น" },
  resist:    { icon: "🛡️", label: "ต้านผิดปกติ", cls: "bg-echo-ice text-gray-900", desc: "กันดีบัฟใหม่ไม่ให้ติด แต่ไม่ล้างดีบัฟที่ติดอยู่แล้ว" },
  guard:     { icon: "💗", label: "คุ้มครอง", cls: "bg-echo-armor", desc: "ดาเมจที่ได้รับจากการถูกโจมตีลดลงตามจำนวนที่ระบุ" },
  fortune:   { icon: "🍀", label: "โชคลาภ", cls: "bg-echo-ice text-gray-900", desc: "จั่วครั้งถัดไปได้ไพ่ที่ทำให้แต้มรวมเป็น 19 ถึง 21 แล้วใช้ไป 1 หน่วย" },
  empower:   { icon: "💪", label: "เสริมพลังครั้งถัดไป", cls: "bg-echo-ice text-gray-900", desc: "โจมตีปกติครั้งถัดไปแรงขึ้น 1" },
  discord:   { icon: "⚡", label: "ขัดแย้ง", cls: "bg-echo-hp", desc: "ดาเมจที่ได้รับจากการถูกโจมตีเพิ่มขึ้น 1" },
  evade:     { icon: "💨", label: "หลบหลีก", cls: "bg-echo-cyan text-gray-900", desc: "หลบการโจมตีทุกครั้งในเทิร์นนี้ตามโอกาสที่ระบุ ซ้อนไม่ได้ อยู่ 1 เทิร์น" },
  netramana:   { icon: "✨", label: "เนตรมณะ", cls: "bg-echo-ice text-gray-900", desc: "โจมตีปกติมีโอกาส 20% สังหารทันที" },
  stagger: { icon: "🫨", label: "ชะงัก", cls: "bg-echo-hp", desc: "ฟื้นแต้มสกิลไม่ได้ทุกช่องทาง" },
  muimiRusty: { icon: "🗡️", label: "ดาบเก่าๆ", cls: "bg-echo-armor", desc: "ตีปกติโดนแล้วฟื้นพลังชีวิต 1 และแต้มสกิล 1 ระหว่างนี้ใช้ท่าไม้ตายไม่ได้" },
  muimiTower: { icon: "⚔️", label: "ดาบสะบั้น", cls: "bg-echo-ice text-gray-900", desc: "พลังโจมตีเพิ่ม 1 ตีปกติโดนแล้วฟื้นพลังชีวิต 2 และสถานะนี้อยู่นานขึ้น 1 เทิร์น" },
  mend:      { icon: "💚", label: "เยียวยา", cls: "bg-echo-armor", desc: "ต้นเทิร์นฟื้นพลังชีวิตตามจำนวนที่ระบุ" },
  spRegen:   { icon: "🔷", label: "ฟื้นพลัง", cls: "bg-echo-armor", desc: "ต้นเทิร์นแต้มสกิล +1 ต่อขั้น" },
  iceSurge:  { icon: "🌨️", label: "Ice Surge", cls: "bg-echo-ice text-gray-900", desc: "ธารน้ำแข็งและหนามน้ำแข็งระยะทั้งสนาม · หนามใช้แต้มลดลง 1 ไม่จำกัดครั้ง" },
  blind:     { icon: "🕶️", label: "ตาบอด", cls: "bg-echo-hp", desc: "มองไม่เห็นไพ่ แต้ม พลังชีวิต และเกราะของทุกคน รวมถึงของตัวเอง" },
  // โอเบรอน (ฤดูร้อน)
  obsVeil:     { icon: "🌙", label: "ม่านแห่งราตรี", cls: "bg-echo-ice text-gray-900", desc: "พลังโจมตีเพิ่ม 1" },
  obsDream:    { icon: "💤", label: "จุดจบของความฝัน", cls: "bg-echo-ice text-gray-900", desc: "พลังโจมตีเพิ่ม 4 ในตาเดินถัดไป จบเทิร์นนั้นแล้วติดสตั้น 3 เทิร์น" },
  obsLark:     { icon: "🐦", label: "นกจาบยามเช้า", cls: "bg-echo-magenta", desc: "ต้นเทิร์นหน้าเสียพลังชีวิต 2 ทะลุเกราะ กันด้วยต้านสถานะไม่ได้" },
  oblada:   { icon: "🎵", label: "สิ่งแปลกปลอม", cls: "bg-echo-hp", desc: "เสียพลังชีวิต 1 ทุก 2 เทิร์น เกราะรับก่อน" },
  // Ice Spike
  slow:          { icon: "❄️", label: "เชื่องช้า", cls: "bg-echo-ice text-gray-900", desc: "ระยะเดิน −1" },
  // เคท & เอมิลิโกะ
  shadowMask:    { icon: "🌫️", label: "มืดบอด", cls: "bg-echo-magenta", desc: "หมากคนอื่นเป็นสีขาว ไม่มีชื่อ ภาพ และลำดับเดิน" },
  rooted:        { icon: "⛓️", label: "ถูกตรึง", cls: "bg-violet-900 text-white", desc: "เดินไม่ได้ แต่ใช้สกิลและโจมตีได้ตามปกติ" },
  // ดิเอโก้ แบรนโด (โลกคู่ขนาน)
  oilSoaked:     { icon: "🛢️", label: "ชุ่มน้ำมัน", cls: "bg-amber-800 text-white", desc: "ถูกโยนไม้ขีดไฟใส่จะระเบิดรอบตัว 3×3 ช่อง คนในพื้นที่เสียพลังชีวิต 2 เกราะรับก่อน ติดลุกไหม้ แล้วพื้นกลายเป็นกองไฟ" },
  diegoNet:      { icon: "🕸️", label: "ติดตาข่าย", cls: "bg-stone-500 text-white", desc: "โดนไม้ขีดไฟหรือแรงระเบิดน้ำมันจะติดลุกไหม้ 3 แทน 1" },
  yunaBless:     { icon: "🕊️", label: "คำอวยพรสุดท้าย", cls: "bg-amber-200 text-gray-900", desc: "พลังโจมตีเพิ่ม 1" },
  yunaNoRide:    { icon: "🚫", label: "ขี่ไม่ได้", cls: "bg-white/20", desc: "ขี่ผู้เล่นอื่นไม่ได้" },
  // ไรโด ฮิคารุ
  hikaruGinga:   { icon: "✨", label: "Ultraman Ginga", cls: "bg-sky-500 text-gray-900", desc: "ตัวใหญ่ขนาด 3×3 เดินได้ 3 ช่องและพังสิ่งกีดขวาง ตีปกติแรงขึ้น 1 โดนศัตรูทุกคนที่ติดด้านนั้น และใช้ท่าไม้ตายลำแสงได้" },
  // องค์หญิงดอกไม้ เซลิน
  celineKing:    { icon: "👑", label: "ราชาดอกไม้", cls: "bg-amber-300 text-gray-900", desc: "เดินบนช่องดอกไม้ไม่เสียก้าว อัตราคริติคอลเพิ่ม 50% คริติคอลแรงสามเท่า และต้นเทิร์นได้แต้มสกิล 1" },
  // ซึนาชิ ทาคุโตะ (ดาบอันเจิดจรัด — เทิร์นที่เหลือ)
  takutoEmerald:  { icon: "🗡️", label: "ดาบเอเมอรูด", cls: "bg-emerald-400 text-gray-900", desc: "ตีปกติฟื้นพลังชีวิตเท่าความเสียหายจริงที่ทำได้รวมเกราะ ไม่เกิน 2 ต่อการตีหนึ่งครั้ง" },
  takutoSapphire: { icon: "🗡️", label: "ดาบแซฟไฟร์", cls: "bg-sky-400 text-gray-900", desc: "ตีปกติโดนศัตรูทุกคนที่อยู่ติดด้านนั้นของตัวทั้ง 3 ช่อง" },
  // ผู้นำแห่งตระกูลเรียวกิ (เทิร์นที่เหลือ)
  emiyaUbw:       { icon: "⚔️", label: "Unlimited Blade Works", cls: "bg-orange-300 text-gray-900", desc: "ต้นเทิร์นได้แต้มสกิล 1 คูลดาวน์สกิลรองลดเพิ่มทุกเทิร์น Trace On ไม่มีคูลดาวน์ และระยะเดินเพิ่ม 1" },
  ryougiMind:     { icon: "🗡️", label: "รากฐานจิต", cls: "bg-slate-200 text-gray-900", desc: "การโจมตีครั้งถัดไป ศัตรูที่โดนถูกลบบัฟล่าสุด 1 อย่างและถูกปิดผลสกิลที่ทำงานอยู่อันล่าสุด 1 อย่าง ใช้ได้ครั้งเดียว" },
  ryougiBloom:    { icon: "🌸", label: "ดับสิ้นซะ", cls: "bg-pink-300 text-gray-900", desc: "พลังโจมตีเพิ่ม 1" },
  // โรลันด์ (เทิร์นที่เหลือ · เศษน้ำแข็ง = จำนวนชิ้น)
  rolandFervent: { icon: "🫀", label: "Fervent Beats", cls: "bg-rose-500", desc: "พลังโจมตีพื้นฐานเพิ่ม 3 เป็นอมตะ บัฟหมดลงตายทันที" },
  rolandUrging:  { icon: "❤️", label: "Urging", cls: "bg-rose-300 text-gray-900", desc: "พลังชีวิตสูงสุดเพิ่ม 1 ระยะเดินเพิ่ม 1" },
  rolandScars:   { icon: "🩹", label: "Scars", cls: "bg-amber-200 text-gray-900", desc: "ความเสียหายที่ได้รับลด 1 ถูกโจมตีมีโอกาส 20% ไม่เสียหาย" },
  rolandKiss:    { icon: "❄️", label: "A Kiss", cls: "bg-sky-200 text-gray-900", desc: "สร้างความเสียหายแล้วเป้าได้เศษน้ำแข็ง 1 ชิ้น" },
  rolandLies:    { icon: "🎞️", label: "Lies", cls: "bg-slate-300 text-gray-900", desc: "ราคาการ์ดอาวุธสุ่มใหม่ 0 ถึง 4 ทุกเทิร์น" },
  rolandCrystal: { icon: "⚔️", label: "Crystal Atelier", cls: "bg-slate-200 text-gray-900", desc: "ถูกตีปกติแล้วสวนกลับรอบตัว 3×3 ดาเมจ 1" },
  rolandIce:     { icon: "🧊", label: "เศษน้ำแข็ง", cls: "bg-sky-300 text-gray-900", desc: "ครบ 5 ชิ้น สตั้นเทิร์นถัดไปและเสียดาเมจ 1" },
  // เคนซากิ คาซุมะ (เทิร์นที่เหลือ — ครั้งที่กันได้อยู่ในป้าย kazumaMetal ของบล็อกคาซุมะ)
  kazumaMetal:    { icon: "🛡️", label: "METAL", cls: "bg-slate-300 text-gray-900", desc: "กันการโจมตีของศัตรูทั้งก้อนตามจำนวนครั้งที่เหลือ จนจบเทิร์น" },
  // Echo
  echoQueen:     { icon: "👑", label: "ราชินีแห่ง Echo", cls: "bg-echo-ice text-gray-900", desc: "ต้นเทิร์นขยายร่าง 1 ระดับ ล้างไม่ได้" },
  echoOverwrite: { icon: "🔄", label: "Overwrite", cls: "bg-echo-ice text-gray-900", desc: "พลังโจมตีเพิ่มตามจำนวนที่ระบุ" },
  // ---------- สถานะ Universal (patch 2.2.1) ----------
  invert:     { icon: "🔄", label: "ผกผัน", cls: "bg-echo-hp", desc: "การฟื้นพลังชีวิตและเกราะกลายเป็นเสียแทน และพลังโจมตีที่เพิ่มกลายเป็นลดแทน" },
  decay:      { icon: "🥀", label: "ผุพัง", cls: "bg-echo-hp", desc: "ฟื้นเกราะไม่ได้" },
  // คุเรไน โอโตยะ: ดนตรีในหัวใจ (ป้ายบนตัวเป้า — อยู่ตราบที่ยังสีไวโอลิน)
  otoyaHeart: { icon: "🎻", label: "ดนตรีในหัวใจ", cls: "bg-amber-600 text-white", desc: "พลังโจมตี +1 · เยียวยา 1/เทิร์น · คริติคอล +25% · แต้มสกิล +1/เทิร์น" },
};
// รวมสถานะทั้งหมดของผู้เล่นเป็นรายการเดียว — full = รวมของที่โชว์แยกที่อื่นด้วย (โล่/เลือดชั่วคราว)
function statusEntries(p, full) {
  const out = [];
  for (const [k, v] of Object.entries(p.statuses || {})) {
    if (!(v > 0) || k === "hikaruForm") continue; // ร่าง UltraLive โชว์ชื่อร่างแทน (บล็อกฮิคารุด้านล่าง)
    const info = STATUS_INFO[k] || { icon: "✦", label: k, cls: "bg-white/20", desc: "" };
    const amt = (p.statusAmt || {})[k] || 0; // จำนวน (amount) ของบัฟ/ดีบัฟพื้นฐาน (patch 2.0.8)
    out.push({ key: k, v, amt, ...info });
  }
  // Echo: ขยายร่าง (ถาวร) · คูลดาวน์มหึมา · พลังโจมตีจากการกลืนกิน
  if (p.echo && p.echo.stacks > 0) out.push({ key: "echoGrow", v: p.echo.stacks, icon: "🌌", label: "ขยายร่าง", cls: "bg-echo-magenta", desc: "เลือดสูงสุดเพิ่ม 2 ต่อระดับ อยู่ถาวรจนกว่าจะใช้ Overwrite" });
  if (p.echo && p.echo.kills > 0) out.push({ key: "echoKills", v: p.echo.kills, icon: "🍽️", label: "การกลืนกิน", cls: "bg-echo-ice text-gray-900", desc: "พลังโจมตีเพิ่มตามจำนวนที่ระบุ ถาวร" });
  if ((p.muimiUltCd || 0) > 0) {
    out.push({ key: "muimiUltCd", v: p.muimiUltCd, turns: true, icon: "⏳", label: "ดาบสะบั้นพักฟื้น", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้ท่าไม้ตายได้อีก" });
  }
  // โซระ: ร่าง My-Th + อาวุธที่ถือ · ร่างโซระนับเทิร์นเพื่อคุณหนู
  if (p.sora && p.sora.myth) {
    out.push({ key: "soraMyth", v: 1, icon: "🐭", label: "Kamen Rider My-Th", cls: "bg-sky-500 text-gray-900", desc: "ตีปกติมีโอกาสคริติคอล 20% และใช้ My-Th Edge กับ Mouse Separade ได้" });
    if (p.sora.fire) out.push({ key: "soraFire", v: 1, icon: "🔥", label: "Fire Frame", cls: "bg-orange-500 text-gray-900", desc: "ตีปกติและ Mouse Separade ติดลุกไหม้ 1 จบเทิร์นเสียแต้มสกิล 1 แต้มไม่พอจะกลับร่าง My-Th" });
    out.push({ key: "soraWeapon", v: 1, icon: p.sora.gun ? "🔫" : "🗡️", label: p.sora.gun ? "ปืน" : "มีด", cls: "bg-sky-200 text-gray-900",
      desc: p.sora.gun ? "ระยะตี 1 ถึง 3 ตีโดนแล้วถ้าเป้ารอดจะถูกดึงเข้ามาประชิด" : "ตีปกติแรงขึ้น 1" });
  }
  if (p.sora && !p.sora.myth && p.sora.calm > 0) out.push({ key: "soraCalm", v: 1, icon: "💚", label: `เพื่อคุณหนู ${p.sora.calm}/${p.sora.calmMax}`, cls: "bg-echo-ice text-gray-900", desc: "อยู่ร่างโซระต่อเนื่องครบแล้วฟื้นพลังชีวิต 2 แปลงร่างแล้วนับใหม่" });
  // กิระ: ร่างราชาแมลงอวกาศ · นับเทิร์นร่างกิระ · อัฐิราชา (เทิร์นที่เหลือ)
  if (p.kira) {
    const k = p.kira;
    if (k.king) out.push({ key: "kiraKing", v: 1, icon: "🪲", label: "ราชาแมลงอวกาศ", cls: "bg-violet-500 text-white", desc: "ตีปกติเป็นคลื่นแนวตรงยาว 4 ช่องโดนศัตรูทุกคนในแนว และจบเทิร์นศัตรูที่ประชิดเสียพลังชีวิต 1 เกราะรับก่อน" });
    if (!k.king && k.calm > 0) out.push({ key: "kiraCalm", v: 1, icon: "💚", label: `บดขยี้ส่วนเกิน ${k.calm}/${k.calmMax}`, cls: "bg-echo-ice text-gray-900", desc: "อยู่ร่างกิระต่อเนื่องครบแล้วฟื้นพลังชีวิต 2 และแต้มสกิล 1 สวมเกราะแล้วนับใหม่" });
    if (k.ult > 0) out.push({ key: "kiraUlt", v: k.ult, turns: true, icon: "🦴", label: "อัฐิราชา", cls: "bg-violet-900 text-white", desc: "ตายแล้วฟื้นทันทีด้วยพลังชีวิต 1 ไม่จำกัดครั้ง และพลังโจมตีเพิ่ม 2" });
  }
  // รถบรรทุกเก่า / ออพติมัส ไพร์ม: ผู้พิทักษ์ (ตั้งท่า / คูลดาวน์) · ร่างรถนับเทิร์นฟื้นเลือด · คริ +25%
  if (p.oldTruck) {
    const o = p.oldTruck;
    if (o.stance) out.push({ key: "otGuard", v: 1, icon: "🛡️", label: "ผู้พิทักษ์", cls: "bg-sky-600 text-white", desc: "ถูกตีปกติ = ฟันสวน ความเสียหาย 2 และเลือดไหล 2 เทิร์น ไม่ว่าผู้ตีอยู่ไกลแค่ไหน" });
    else if (o.guardCd > 0) out.push({ key: "otGuardCd", v: o.guardCd, turns: true, icon: "🛡️", label: "⏳", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้ผู้พิทักษ์ได้อีก" });
    if (o.form === "truck" && o.regen > 0) out.push({ key: "otRegen", v: 1, icon: "🚛", label: `${o.regen}/${o.regenMax}`, cls: "bg-echo-ice text-gray-900", desc: "จบเทิร์นในร่างรถบรรทุกครบแล้วฟื้นพลังชีวิต 2" });
    if (o.crit) out.push({ key: "otCrit", v: 1, icon: "⚔️", label: "คริ +25%", cls: "bg-amber-500 text-gray-900", desc: "ตีปกติคริติคอลเพิ่ม 25% จนจบเทิร์น" });
  }
  // โจรุโน่: ร่าง Requiem · ธนู (รอผล/คูลดาวน์) · วนตาย (ใครก็ติดได้) · ลอยบนต้นไม้ (ใครก็ได้) · ต้นตอแห่งชีวิต · Muda · คูลดาวน์ 2 แบบ · เศษเดนมนุษย์ยังไม่ใช้
  if (p.giorno) {
    const g = p.giorno;
    if (g.requiem) out.push({ key: "gioRequiem", v: g.reqLeft, turns: true, icon: "✨", label: "Gold Experience Requiem", cls: "bg-amber-500 text-gray-900", desc: "พลังโจมตีและคริติคอลเพิ่ม ระยะเดินไกลขึ้น ต้านสถานะ ศัตรูที่โจมตีมีโอกาสถูกย้อนกลับไปเริ่มตาเดินใหม่ ใช้ท่าไม้ตายในตานั้น = ย้อนแน่นอน" });
    if (g.arrowWait) out.push({ key: "gioArrowWait", v: 1, icon: "🏹", label: "ธนู Requiem", cls: "bg-amber-300 text-gray-900", desc: "ตาถัดไปสุ่ม 50/50: แปลงร่าง Gold Experience Requiem 3 เทิร์น หรือตายทันที" });
    if (g.arrowCd > 0) out.push({ key: "gioArrowCd", v: g.arrowCd, turns: true, icon: "🏹", label: "⏳", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้ธนู Requiem ได้อีก" });
    if (g.loop) out.push({ key: "gioLoop", v: 1, icon: "🌀", label: "ไปสู่ภพภูมิที่ดี", cls: "bg-violet-900 text-white", desc: "ฟื้นทุกเทิร์นแล้วตายอีกเมื่อถึงตาตัวเอง" });
    if (g.tree) out.push({ key: "gioTree", v: 1, icon: "🌳", label: "จงกำเนิดใหม่", cls: "bg-emerald-600 text-white", desc: "ลอยบนต้นไม้ หลบการโจมตีได้แน่นอน 1 ครั้ง และเดินไม่ได้ จนถึงตาเดินถัดไป" });
    if (g.reflect) out.push({ key: "gioReflect", v: 1, icon: "🐞", label: "ต้นตอแห่งชีวิต", cls: "bg-amber-400 text-gray-900", desc: "ศัตรูโจมตีโดน 1 ครั้ง = ไม่เสียหาย ความเสียหายและดีบัฟสะท้อนกลับใส่ผู้โจมตี จนถึงตาเดินถัดไป" });
    if (g.muda) out.push({ key: "gioMuda", v: 1, icon: "👊", label: "Muda!!!!!!!", cls: "bg-yellow-500 text-gray-900", desc: "ตีปกติครั้งถัดไป: ศัตรูฟื้นพลังชีวิต 3 ล้างดีบัฟ 1 ติดเปราะบางและสตั้นแล้วจึงรับความเสียหาย · เพื่อนฟื้นพลังชีวิต 3 ล้างดีบัฟ 1" });
    if (g.shotCd > 0) out.push({ key: "gioShotCd", v: g.shotCd, turns: true, icon: "🔫", label: "⏳", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงยิงกระสุนแห่งชีวิตได้อีก" });
    if (g.reflectCd > 0) out.push({ key: "gioReflectCd", v: g.reflectCd, turns: true, icon: "🐞", label: "⏳", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้ต้นตอแห่งชีวิตได้อีก" });
    if (g.treeCd > 0) out.push({ key: "gioTreeCd", v: g.treeCd, turns: true, icon: "🌳", label: "⏳", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้จงกำเนิดใหม่ได้อีก" });
  }
  // ยูนะ: เพลงที่เปิด · ยูนะ ไอดอล (เทิร์นที่เหลือ) · คูลดาวน์ · เงาของเสียง (รอ/ทำงาน)
  if (p.yuna) {
    const y = p.yuna;
    if (y.idol > 0) out.push({ key: "yunaIdol", v: y.idol, turns: true, icon: "🔥", label: "ยูนะ ไอดอล", cls: "bg-fuchsia-500 text-white", desc: "พวกเราในวงพลังโจมตีเพิ่ม 1 ยูนะเพิ่ม 2 ทุกคนแม่นยำ ระยะตีเท่าระยะเดิน และจบเทิร์นฟื้นแต้มสกิล 1" });
    else if (y.song === "delete") out.push({ key: "yunaSong", v: 1, icon: "🎵", label: "Delete", cls: "bg-rose-700 text-white", desc: "ศัตรูในวงรับความเสียหายเพิ่ม 1 ทุกแบบ พวกเราในวงฟื้นแต้มสกิล 1 ตอนจบเทิร์น แลกกับแต้มสกิลของยูนะ 2" });
    else if (y.song === "smile") out.push({ key: "yunaSong", v: 1, icon: "🎵", label: "Smile for You", cls: "bg-pink-300 text-gray-900", desc: "พวกเราในวงรับความเสียหายลดลง 1 ทุกแบบ และฟื้นพลังชีวิต 1 ตอนจบเทิร์น แลกกับแต้มสกิลของยูนะ 2" });
    if (y.ultCd > 0) out.push({ key: "yunaUltCd", v: y.ultCd, turns: true, icon: "⏳", label: "ร้อนแรงดังไฟ", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้ท่าไม้ตายได้อีก" });
    if (y.vanish) out.push({ key: "yunaVanish", v: 1, icon: "🌫️", label: "เงาของเสียง", cls: "bg-violet-700 text-white", desc: "หายตัว ศัตรูมองไม่เห็นและเล็งไม่ได้ ไม่โดนความเสียหายและดีบัฟจากคนอื่น วงเพลงหยุดทำงาน" });
    else if (y.vanishNext) out.push({ key: "yunaVanishNext", v: 1, icon: "🌫️", label: "เงาของเสียง", cls: "bg-violet-300 text-gray-900", desc: "เทิร์นหน้าหายตัวทั้งเทิร์น ระหว่างรอใช้ท่าไม้ตายและขี่ผู้เล่นอื่นไม่ได้" });
  }
  // เกรย์: ศพที่เก็บ (พลังโจมตี) · จงบ้าคลั่ง · ชาร์จรองโกมิเนียต (เทิร์นที่เหลือก่อนยิง) · คูลดาวน์
  if (p.gray) {
    const g = p.gray;
    if (g.souls > 0) out.push({ key: "graySouls", v: 1, icon: "⚰️", label: `สัปเหร่อ ${g.souls}/${g.soulsMax}`, cls: "bg-slate-500 text-white", desc: "ศพละพลังโจมตีเพิ่ม 1 และรองโกมิเนียตแรงขึ้น 1 ครบแล้วเก็บศพได้แค่ฟื้นพลังชีวิต 2" });
    if (g.frenzy > 0) out.push({ key: "grayFrenzy", v: g.frenzy, turns: true, icon: "⛓️", label: "จงบ้าคลั่ง", cls: "bg-cyan-800 text-white", desc: "ระยะตีปกติเป็น 2 ช่อง คริติคอลเพิ่ม 25% และตีโดนแล้วเป้าติดถูกตรึง 1 เทิร์น" });
    if (g.charge) out.push({ key: "grayCharge", v: g.charge.left || 1, turns: true, icon: "✨", label: "รองโกมิเนียต", cls: "bg-amber-400 text-gray-900", desc: "เดิน ตีปกติ และใช้สกิลไม่ได้ ศัตรูในแนวถูกตรึง ครบแล้วยิงลำแสงกว้าง 7 ช่องสุดกระดาน ดาเมจ 5 บวกศพที่เก็บ" });
    else if (g.ultCd > 0) out.push({ key: "grayUltCd", v: g.ultCd, turns: true, icon: "⏳", label: "รองโกมิเนียต", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้ท่าไม้ตายได้อีก" });
  }
  // กิลกาเมช: ความมั่งคั่ง · ดาบ EA · พายุ · Enuma Elish ที่รอยิง
  if (p.gil && p.gil.wealth != null) {
    const g = p.gil;
    out.push({ key: "gilWealth", v: 1, icon: "👑", label: `${g.wealth}/${g.wealthMax}`, cls: "bg-amber-400 text-gray-900", desc: "ได้ 1 ต่อนัดที่โดนด้วยเมตตาจากราชา (สนาม Eos: ทุกนัด) · Enuma Elish ใช้ 20" });
    if (g.ea) out.push({ key: "gilEa", v: 1, icon: "🗡️", label: "EA", cls: "bg-rose-800 text-white", desc: "ตีปกติรอบตัว 8 ช่อง ดาเมจ 3 ผลักออก 1" });
    if (g.storm) out.push({ key: "gilStorm", v: 1, icon: "⛈️", label: "พายุ", cls: "bg-red-900 text-white", desc: "จบเทิร์นสายฟ้าแดงผ่าช่องที่ศัตรูยืนอยู่ ดาเมจ 2" });
    if (g.charge) out.push({ key: "gilEnuma", v: g.charge.left || 1, turns: true, icon: "🌌", label: "Enuma Elish", cls: "bg-red-700 text-white", desc: "ต้นตาเดินถัดไปยิงลำแสง ศัตรูในแนวตายทันที" });
  }
  // ไจโร: ลูกเหล็กในมือ · สัดส่วนทองคำ · ม้า (พลังชีวิตม้า / รอเรียก) · เสริมท่าไม้ตาย · คูลดาวน์ (ตัวเลข/ไอคอนเท่านั้น)
  if (p.gyro && p.gyro.hand != null) {
    const g = p.gyro;
    out.push({ key: "gyroBalls", v: 1, icon: "🟢", label: `${g.hand}/2`, cls: "bg-emerald-600 text-white", desc: "ตีปกติใช้ลูก 1 ลูก ลูกตกที่เป้า ไม่มีลูกในมือจะตีไม่ได้จนกว่าจะเรียกกลับด้วยกลับคืนเจ้าของ" });
    out.push({ key: "gyroGolden", v: 1, icon: "🌀", label: `${g.golden}/30`, cls: "bg-amber-300 text-gray-900", desc: "ได้ตอนขี่ม้าเดิน เท่ากับช่วงเดินตรงที่ยาวที่สุดในตา วิชาลับใช้ 5 ท่าไม้ตายใช้ 20 สะสมได้สูงสุด 30" });
    if (g.mounted) out.push({ key: "gyroHorse", v: 1, icon: "🐎", label: `${g.horseHp}/3`, cls: "bg-amber-700 text-white", desc: "ม้ารับความเสียหายก่อนเกราะทีละ 1 ระยะเดินและระยะตีเพิ่ม 1 ม้าล้มแล้วเรียกไม่ได้ 3 เทิร์น" });
    else if (g.horseCd > 0) out.push({ key: "gyroHorseCd", v: g.horseCd, turns: true, icon: "🐎", label: "⏳", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงเรียกม้าได้อีก" });
    if (g.empowered) out.push({ key: "gyroEmpowered", v: 1, icon: "✨", label: "การหมุนที่สมบูรณ์แบบ", cls: "bg-yellow-400 text-gray-900", desc: "ตีปกติครั้งถัดไปในตานี้ทำให้เป้ากระเด็นจนสุดขอบ เสียหายตามจำนวนช่องสูงสุด 6 และถูกตรึง 2 เทิร์น ไม่ตีก่อนจบตาจะหายไป" });
    else if (g.ultCd > 0) out.push({ key: "gyroUltCd", v: g.ultCd, turns: true, icon: "⏳", label: "การหมุนที่สมบูรณ์แบบ", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้ท่าไม้ตายได้อีก" });
  }
  // ดิเอโก้: เล่ห์เหลี่ยม · กระสุน (รีโหลด) · ม้า · เดอะเวิลด์ (ตั้งรับ / หยุดเวลา / คูลดาวน์) (ตัวเลข/ไอคอนเท่านั้น)
  //  ศัตรูได้ cunning / worldArmed / worldCd เป็น null (server ซ่อน — กดเดอะเวิลด์แล้วต้องไม่รู้)
  if (p.dio) {
    const d = p.dio;
    out.push({ key: "dioMeter", v: 1, icon: "⏱️", label: `${d.meter}/${d.meterMax}`, cls: "bg-yellow-500 text-gray-900", desc: "Time Meter" });
    out.push({ key: "dioBlood", v: 1, icon: "🩸", label: `${d.blood}/${d.bloodMax}`, cls: "bg-red-700 text-white", desc: "BloodStack" });
    if (d.stopping) out.push({ key: "dioStop", v: 1, icon: "⏱️", label: `${d.actions} Action`, cls: "bg-yellow-300 text-gray-900", desc: "Za warudo!!!!!!" });
    else if (d.pending > 0) out.push({ key: "dioPending", v: 1, icon: "⏱️", label: `${d.pending} Action`, cls: "bg-yellow-500 text-gray-900", desc: "Za warudo!!!!!!" });
    else if (d.worldCd > 0) out.push({ key: "dioWorldCd", v: d.worldCd, turns: true, icon: "⏳", label: "Za warudo!!!!!!", cls: "bg-white/20", desc: "Za warudo!!!!!!" });
  }
  if (p.diego && p.diego.ammo != null) {
    const d = p.diego;
    if (d.cunning != null) out.push({ key: "diegoCunning", v: 1, icon: "🧠", label: `${d.cunning}/${d.cunningMax}`, cls: "bg-yellow-500 text-gray-900", desc: "ได้ 1 ทุกครั้งที่ใช้คลังเครื่องมือ และเมื่อราดน้ำมันโดนศัตรู ระเบิด ตาข่ายดักติด หรือกองไฟเผาศัตรู ใช้ 5 เพื่อกดท่าไม้ตาย" });
    if (d.ammo > 0) out.push({ key: "diegoAmmo", v: 1, icon: "🔫", label: `${d.ammo}/${d.ammoMax}`, cls: "bg-stone-700 text-white", desc: "ปืนลูกโม่ยิงได้ตาละ 1 นัด กระสุนหมดแล้วต้องรีโหลด 5 เทิร์น" });
    else if (d.reloadCd > 0) out.push({ key: "diegoReload", v: d.reloadCd, turns: true, icon: "🔫", label: "⏳", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงได้กระสุนเต็ม 4 นัดและยิงได้อีก" });
    if (d.mounted) out.push({ key: "diegoHorse", v: 1, icon: "🐎", label: `${d.horseHp}/3`, cls: "bg-amber-700 text-white", desc: "ม้ารับความเสียหายก่อนเกราะทีละ 1 ระยะเดินเพิ่ม 1 ม้าล้มแล้วเรียกไม่ได้ 3 เทิร์น" });
    else if (d.horseCd > 0) out.push({ key: "diegoHorseCd", v: d.horseCd, turns: true, icon: "🐎", label: "⏳", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงเรียกม้าได้อีก" });
    if (d.stopping) out.push({ key: "diegoStop", v: 1, icon: "⏱️", label: "เดอะเวิลด์", cls: "bg-yellow-300 text-gray-900", desc: "เวลาหยุดอยู่ ได้ตาเดินใหม่ ตีปกติไม่ได้แต่ใช้สกิลรวมได้ 3 ครั้ง ความเสียหายที่ทำใส่คนอื่นลงตอนเวลาเดินต่อ" });
    else if (d.worldArmed) out.push({ key: "diegoWorld", v: 1, icon: "⏱️", label: "เดอะเวิลด์", cls: "bg-yellow-500 text-gray-900", desc: "ศัตรูทำให้เสียหายก่อนจบเทิร์น การกระทำนั้นถูกยกเลิกแล้วหยุดเวลาทันที ถ้าไม่โดนจะได้หยุดเวลาต้นเทิร์นหน้าก่อนทุกคน" });
    else if (d.worldCd > 0) out.push({ key: "diegoWorldCd", v: d.worldCd, turns: true, icon: "⏳", label: "เดอะเวิลด์", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้ท่าไม้ตายได้อีก" });
  }
  // ฟันนี่ วาเลนไทน์: กระสุน (รีโหลด) · หลบสายตา (เทิร์นที่เหลือ / คูลดาวน์) · กระดานคู่ขนานเปิดอยู่ (ตัวเลข/ไอคอนเท่านั้น)
  //  คูลดาวน์ท่าไม้ตายแต่ละแบบอยู่บนการ์ดตัวเลือก (locked + left จาก server)
  if (p.valentine && p.valentine.ammo != null) {
    const v = p.valentine;
    if (v.ammo > 0) out.push({ key: "valAmmo", v: 1, icon: "🔫", label: `${v.ammo}/${v.ammoMax || 3}`, cls: "bg-pink-800 text-white", desc: "นัดละความเสียหาย 1 ใส่ศัตรูคนแรกในแนว 5 ช่อง หมดแล้วต้องรีโหลด 5 เทิร์น" });
    else if (v.reloadCd > 0) out.push({ key: "valReload", v: v.reloadCd, turns: true, icon: "🔫", label: "⏳", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงได้กระสุนเต็ม 3 นัดตอนต้นเทิร์น" });
    if (v.veil) out.push({ key: "valVeil", v: Math.max(1, v.veil.left || 0), turns: true, icon: "🚩", label: "หลบสายตา", cls: "bg-pink-300 text-gray-900", desc: "ล่องหน เดินทะลุทุกอย่าง ไม่มีใครแตะต้องได้ จบเทิร์นได้แต้มสกิล 1 ตีปกติและยิงปืนไม่ได้" });
    else if (v.veilCd > 0) out.push({ key: "valVeilCd", v: v.veilCd, turns: true, icon: "⏳", label: "หลบสายตา", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้สกิลพื้นฐานได้อีก" });
  }
  // อยู่ในกระดานคู่ขนาน (ชั้นมิติ "par:" — ท่าไม้ตายของวาเลนไทน์): ทุกคนในมิติเห็นป้ายนี้ (หน้าตากระดานเหมือนปกติ — ผู้ใช้ 2026-10-21)
  if (typeof p.dim === "string" && p.dim.startsWith("par:")) out.push({ key: "valParallel", v: 1, icon: "🌐", label: "กระดานคู่ขนาน", cls: "bg-cyan-200 text-gray-900", desc: "มองเห็นและโจมตีได้แค่คนในกระดานเดียวกัน ตัวที่เหมือนกันชนแล้วเสียหาย 4 เกราะรับก่อน ชนหรือถูกทำลายแล้วกลับกระดานหลัก" });
  // เฟิร์น: ซ่อนเร้นมานา (อยู่ในโหมด/คูลดาวน์) · เพิ่มระยะ (รอตีครั้งถัดไป) · นับ Zoltraak n/need (ครบ = ครั้งเสริมพลังพร้อม) · ผู้เชี่ยวชาญเวทมนต์พื้นฐาน คูลดาวน์การกัน (ตัวเลข/ไอคอนเท่านั้น)
  if (p.fern) {
    const f = p.fern;
    if (f.conceal) out.push({ key: "fernConceal", v: 1, icon: "🫥", label: "ซ่อนเร้นมานา", cls: "bg-indigo-400 text-gray-900", desc: f.eos ? "ล่องหน ศัตรูมองไม่เห็น ต้นเทิร์นได้ Energy 2 และฟื้นพลังชีวิต 1 ทุกเทิร์น ตีหรือใช้สกิลแล้วหลุด ถูกโจมตีแล้วหลุดและสตั้น 1 เทิร์น" : "ล่องหน ศัตรูเห็นได้แค่ในระยะ 2 ช่อง ต้นเทิร์นได้ Energy 2 และฟื้นพลังชีวิต 1 ทุก 2 เทิร์น ตีหรือใช้สกิลแล้วหลุด ถูกโจมตีแล้วหลุดและสตั้น 1 เทิร์น" });
    else if (f.concealCd > 0) out.push({ key: "fernConcealCd", v: f.concealCd, turns: true, icon: "⏳", label: "ซ่อนเร้นมานา", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้ท่าไม้ตายได้อีก" });
    if (f.boost) out.push({ key: "fernBoost", v: 1, icon: "📏", label: "เพิ่มระยะ", cls: "bg-sky-300 text-gray-900", desc: f.eos ? "ตีปกติครั้งถัดไปโดนศัตรูทุกตัวในระยะ 8 รอบตัว ค้างไว้จนกว่าจะตี" : "ตีปกติครั้งถัดไปยิงไกลเป็นแนว 6 ช่อง ค้างไว้จนกว่าจะตี" });
    if (f.empowered) out.push({ key: "fernEmpowered", v: 1, icon: "🌟", label: `Zoltraak ${f.need || 4}/${f.need || 4}`, cls: "bg-fuchsia-300 text-gray-900", desc: "ตีปกติครั้งถัดไปไม่ใช้ Energy ทะลุเกราะทุกคนในแนว ตีแล้วรีเซ็ทคูลดาวน์ทุกอย่างและเริ่มนับใหม่" });
    else if (f.count != null) out.push({ key: "fernCount", v: 1, icon: "✨", label: `Zoltraak ${f.count}/${f.need || 4}`, cls: "bg-violet-200 text-gray-900", desc: `ตีปกติครบ ${f.need || 4} ครั้ง ครั้งถัดไปไม่ใช้ Energy ทะลุเกราะ และรีเซ็ทคูลดาวน์ทุกอย่าง` });
    if (f.shieldCd > 0) out.push({ key: "fernShieldCd", v: f.shieldCd, turns: true, icon: "🛡️", label: "ผู้เชี่ยวชาญเวทมนต์พื้นฐาน", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงกันการโจมตีได้อีก" });
    else if (f.shieldCd != null) out.push({ key: "fernShield", v: 1, icon: "🛡️", label: f.eos ? `ผู้เชี่ยวชาญเวทมนต์พื้นฐาน ${f.shieldLeft}` : "ผู้เชี่ยวชาญเวทมนต์พื้นฐาน", cls: "bg-cyan-300 text-gray-900", desc: f.eos ? `การโจมตีของศัตรูอีก ${f.shieldLeft} ครั้งถูกกันทั้งหมด ความเสียหายเป็น 0` : "การโจมตีครั้งถัดไปของศัตรูถูกกันทั้งหมด ความเสียหายเป็น 0" });
  }
  // ซึนาชิ ทาคุโตะ: ดาบแห่งการพิพากษา (รวมร่างแล้ว) · คูลดาวน์สกิล (ตัวเลข/ไอคอนเท่านั้น) — ดาบ 2 เล่มเป็นสถานะ takutoEmerald / takutoSapphire
  if (p.takuto) {
    const t = p.takuto;
    if (t.judgment) out.push({ key: "takutoJudgment", v: 1, icon: "⚔️", label: "ดาบแห่งการพิพากษา", cls: "bg-amber-200 text-gray-900", desc: "ตีปกติเป็นการปาดาบใส่เป้าเดียวไกล 1 ถึง 4 ช่อง เสียหาย 4 ตายตัว แล้วดาบทั้งสองเล่มหายไป" });
    if (t.secCd > 0) out.push({ key: "takutoSecCd", v: t.secCd, turns: true, icon: "⏳", label: "ดาบประกายแสง", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้ดาบประกายแสงได้อีก" });
    if (t.ultCd > 0) out.push({ key: "takutoUltCd", v: t.ultCd, turns: true, icon: "⏳", label: t.collapse ? "ฉันยังมองเห็นอยู่" : "ทาวววว มิสไซล์", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้ท่าไม้ตายได้อีก" });
  }
  // ผู้นำแห่งตระกูลเรียวกิ: คูลดาวน์หยินหยาง (เนตรมณะ/เยียวยา) · ดับสิ้นซะ — เนตรมณะ/รากฐานจิต/ดับสิ้นซะ เป็นสถานะ netramana / ryougiMind / ryougiBloom
  if (p.ryougi) {
    const r = p.ryougi;
    if (r.eyesCd > 0) out.push({ key: "ryougiEyesCd", v: r.eyesCd, turns: true, icon: "⏳", label: "เนตรมณะ", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้เนตรมณะได้อีก" });
    if (r.mendCd > 0) out.push({ key: "ryougiMendCd", v: r.mendCd, turns: true, icon: "⏳", label: "เยียวยา", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้เยียวยาได้อีก" });
    if (r.ultCd > 0) out.push({ key: "ryougiUltCd", v: r.ultCd, turns: true, icon: "⏳", label: "ดับสิ้นซะ", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้ท่าไม้ตายได้อีก" });
  }
  // เอมิยะ ชิโร่: อาวุธที่ถือ (เทิร์น/ครั้งที่เหลือ) · คูลดาวน์ Trace On / สกิลรอง / UBW · Avalon — UBW เป็นสถานะ emiyaUbw
  if (p.emiya) {
    const e = p.emiya;
    const W = {
      kb: ["⚔️", "Kanshou & Bakuya", "ตีปกติ 1 ครั้งฟัน 2 ฮิต อัตราคริติคอลเพิ่ม 30%"],
      hrunting: ["🏹", "Hrunting & Caladbolg II", "ตีได้ไกล 1 ถึง 4 ช่อง ระยะเดินลด 1"],
      rule: ["🗡️", "Rule Breaker", "ตีโดนแล้วเป้าใช้สกิลไม่ได้จนจบตาเดินถัดไป และติดผนึกพลังงาน 2 เทิร์น"],
      nine: ["🪨", "Nine Lives Blade Works", "พลังโจมตีเพิ่ม 1 ตีโดนศัตรูทุกคนในกรอบ 2×3 ทางทิศของเป้า"],
      excalibur: ["✨", "Excalibur", "พลังโจมตีเพิ่ม 1 ตีแนว 3 ช่องโดนทุกคน ตีโดนแล้วติดเปราะบาง 2 เทิร์น"],
    }[e.weapon];
    if (W) out.push({ key: "emiyaWeapon", v: e.weaponTurns || 1, turns: true, icon: W[0], label: `${W[1]} ×${e.usesLeft}`, cls: e.weapon === "excalibur" ? "bg-amber-300 text-gray-900" : "bg-sky-200 text-gray-900", desc: W[2] });
    if (e.traceCd > 0) out.push({ key: "emiyaTraceCd", v: e.traceCd, turns: true, icon: "⏳", label: "Trace On", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้ Trace On ได้อีก" });
    if (e.wsCd > 0) out.push({ key: "emiyaWsCd", v: e.wsCd, turns: true, icon: "⏳", label: "Weapon Skill", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้สกิลรองได้อีก" });
    if (e.ultCd > 0) out.push({ key: "emiyaUltCd", v: e.ultCd, turns: true, icon: "⏳", label: "Unlimited Blade Works", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้ท่าไม้ตายได้อีก" });
    if (e.avalonCd > 0) out.push({ key: "emiyaAvalonCd", v: e.avalonCd, turns: true, icon: "🛡️", label: "Avalon", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงฟื้นพลังชีวิตจาก Avalon ได้อีก" });
  }
  // โรลันด์: Emotion · Furioso charge · หลบหลีกจาก Crystal Atelier
  if (p.roland) {
    const r = p.roland;
    out.push({ key: "rolandEmotion", v: 1, icon: "💠", label: `Emotion ${r.emotion}/${r.emotionMax}`, cls: "bg-slate-200 text-gray-900", desc: `สร้างความเสียหาย ${r.hits}/${r.hitsMax}` });
    out.push({ key: "rolandCharge", v: 1, icon: "⚫", label: `Furioso ${r.charge}/${r.chargeMax}`, cls: r.charge >= r.chargeMax ? "bg-white text-gray-900" : "bg-slate-700", desc: "การ์ดอาวุธคนละแบบ" });
    if (r.ultCd > 0) out.push({ key: "rolandUltCd", v: r.ultCd, turns: true, icon: "⏳", label: "Furioso", cls: "bg-white/20", desc: "รอให้ครบเทิร์น" });
    if (r.crystalDodge > 0) out.push({ key: "rolandDodge", v: r.crystalDodge, icon: "💨", label: "หลบหลีก", cls: "bg-slate-200 text-gray-900", desc: "หลบการโจมตี 1 ครั้ง" });
  }
  // อินุอิ ทาคุมิ: กระสุน · โหมดปืน · อุปกรณ์ · ร่าง Axel · Exceed Charge · ร่างมนุษย์นับสู่การฟื้นพลังชีวิต
  if (p.inui && p.inui.opened) {
    const n = p.inui;
    out.push({ key: "inuiAmmo", v: 1, icon: "🔋", label: `${n.ammo}/${n.ammoMax}`, cls: n.ammo > 0 ? "bg-red-200 text-gray-900" : "bg-white/20", desc: "กระสุน Faiz Phone 103 ใช้ 1 นัด 106 ใช้ 2 นัด" });
    if (n.gun) out.push({ key: "inuiGun", v: 1, icon: "🔫", label: n.gun === "103" ? "Single Mode" : "Burst Mode", cls: "bg-red-500 text-white", desc: n.gun === "103" ? "ตีปกติระยะ 3 ใช้กระสุน 1 นัด" : "ตีปกติระยะ 3 อัตราคริติคอล 50% ใช้กระสุน 2 นัด" });
    if (n.knuckle) out.push({ key: "inuiKnuckle", v: 1, icon: "👊", label: "Faiz_nuckle", cls: "bg-slate-300 text-gray-900", desc: "การโจมตีปกติแรงขึ้น 1" });
    if (n.pointer) out.push({ key: "inuiPointer", v: 1, icon: "🎯", label: "Faiz_pointer", cls: "bg-slate-300 text-gray-900", desc: "แม่นยำตลอดที่สวม" });
    if (n.axel) out.push({ key: "inuiAxel", v: n.axelLeft, turns: true, icon: "⌚", label: "Faiz Axel", cls: "bg-rose-600 text-white", desc: "ระยะเดิน 6 ใช้ Start Up ได้ ครบเวลากลับร่าง Faiz" });
    if (!n.axel && n.axelCd > 0) out.push({ key: "inuiAxelCd", v: n.axelCd, turns: true, icon: "⏳", label: "axel_watch", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงสวม axel_watch ได้อีก" });
    if (n.exceed) out.push({ key: "inuiExceed", v: 1, icon: "⚡", label: "Exceed Charge", cls: "bg-red-600 text-white", desc: n.exceed === "knuckle" ? "ระยะเดิน +2 ตีประชิดครั้งถัดไปในตานี้ ความเสียหาย 4 ลุกไหม้ 1" : "ระยะเดิน +2 ตีประชิดครั้งถัดไปในตานี้ ความเสียหาย 4 ถูกตรึง 1 เทิร์น" });
    if (n.startUp) out.push({ key: "inuiStartUp", v: 1, icon: "⏱️", label: `Start Up ${n.startUp.left}`, cls: "bg-gray-100 text-gray-900", desc: "ตีได้อีกตามจำนวนนี้ ก่อนหมดเวลา" });
    if (!n.faiz && n.humanTurns > 0) out.push({ key: "inuiHuman", v: 1, icon: "💚", label: `${n.humanTurns}/${n.humanNeed}`, cls: "bg-white/20", desc: "อยู่ร่างมนุษย์ครบ 2 เทิร์นติดกัน ฟื้นพลังชีวิต 2" });
  }
  // เคนซากิ คาซุมะ: ผล Rouze ที่รอตีปกติ (ท่า Lightning / การ์ด) · ร่างมนุษย์นับสู่การฟื้นพลังชีวิต — METAL เป็นสถานะ kazumaMetal
  if (p.kazuma) {
    const k = p.kazuma;
    const COMBO = { blast: ["⚡", "Lightning Blast", "ตีปกติครั้งถัดไปในตาเดินนี้ ระยะ 1 ถึง 3 เสียหาย 2 ตายตัว และติดช็อต 2 เทิร์น"], slash: ["⚡", "Lightning Slash", "ตีปกติครั้งถัดไปในตาเดินนี้เป็นแนว 3 ช่องโดนทุกคน เสียหาย 2 ตายตัว และติดช็อต 1 เทิร์น"], straight: ["👑", "Straight Flush", "ตีปกติครั้งถัดไปในตาเดินนี้ ความเสียหาย ×2 สูงสุด 6"] };
    if (k.king) out.push({ key: "kazumaKing", v: k.kingLeft, icon: "👑", label: "ร่างคิง", cls: "bg-amber-400 text-gray-900", desc: `เหลือ ${k.kingLeft} เทิร์น ครบแล้วคืนร่างมนุษย์ ฟื้นพลังชีวิต 2 และสตั้นตัวเอง 1 เทิร์น` });
    if (k.armed && COMBO[k.armed.kind]) { const C = COMBO[k.armed.kind]; out.push({ key: "kazumaArmed", v: 1, icon: C[0], label: C[1], cls: "bg-amber-300 text-gray-900", desc: C[2] }); }
    else if (k.armed && k.armed.cards) {
      const label = Object.entries(k.armed.cards).map(([c, n]) => `${c.toUpperCase()}${n > 1 ? ` ×${n}` : ""}`).join(" · ");
      out.push({ key: "kazumaArmed", v: 1, icon: "🃏", label, cls: "bg-sky-200 text-gray-900", desc: "ผลการ์ดเสริมตีปกติครั้งถัดไปในตาเดินนี้ ไม่ได้ตีก็หายตอนจบตา" });
    }
    if (k.metal > 1) out.push({ key: "kazumaMetalN", v: 1, icon: "🛡️", label: `METAL ×${k.metal}`, cls: "bg-slate-300 text-gray-900", desc: "กันการโจมตีของศัตรูทั้งก้อนได้อีกตามจำนวนนี้ จนจบเทิร์น" });
    if (!k.blade && k.humanTurns > 0) out.push({ key: "kazumaHuman", v: 1, icon: "💚", label: `${k.humanTurns}/${k.humanNeed || 2}`, cls: "bg-white/20", desc: "อยู่ร่างมนุษย์ครบ 2 เทิร์นติดกัน ฟื้นพลังชีวิต 2" });
  }
  // ทราฟาก้า ลอว์ (GRID_PLAN §7.20): ตีที่เหลือในเทิร์น · ศัลแพทย์ที่เหลือ · ท่าไม้ตายที่รอตี · คูลดาวน์ Room/ท่าไม้ตาย · Counter Shock
  if (p.law) {
    const L = p.law;
    if (L.inRoom) {
      out.push({ key: "lawStrikes", v: 1, icon: "🗡️", label: `${Math.max(0, L.strikesMax - L.strikes)}/${L.strikesMax}`, cls: "bg-sky-200 text-gray-900", desc: "ตีปกติที่เหลือในเทิร์นนี้ (รวมตัดพื้น)" });
      out.push({ key: "lawSec", v: 1, icon: "🩺", label: `${Math.max(0, L.secMax - L.secUsed)}/${L.secMax}`, cls: "bg-white/20", desc: "ศัลแพทย์ที่ใช้ได้อีกในเทิร์นนี้" });
    }
    if (L.armed) out.push({ key: "lawArmed", v: 1, icon: L.armed === "gamma" ? "🟢" : "🫀", label: L.armed === "gamma" ? "Gamma Knife" : "Mess", cls: "bg-emerald-300 text-gray-900", desc: "ตีปกติครั้งถัดไปในตาเดินนี้ (ประชิด)" });
    if (L.roomCd > 0) out.push({ key: "lawRoomCd", v: L.roomCd, turns: true, icon: "⏳", label: "Room", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงเปิด Room ได้อีก" });
    if (L.gammaCd > 0) out.push({ key: "lawGammaCd", v: L.gammaCd, turns: true, icon: "⏳", label: "Gamma Knife", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้ Gamma Knife ได้อีก" });
    if (L.messCd > 0) out.push({ key: "lawMessCd", v: L.messCd, turns: true, icon: "⏳", label: "Mess", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้ Mess ได้อีก" });
  }
  // เซลิน: อาวุธที่ถือ · ความอ่อนโยนที่เหลือในเทิร์น · ราชาดอกไม้ (ถ้า server ไม่ได้ส่งเป็นสถานะ) · คูลดาวน์/นับสะสม (ตัวเลข/ไอคอนเท่านั้น)
  if (p.celine && p.celine.weapon) {
    const c = p.celine;
    const W = {
      dagger: ["🗡️", "ดาบเล็ก", "ตีประชิด หลบหลีก 5% ตีหรือรอแล้วเดินต่อได้อีกรอบเต็มระยะ หลังเดินทำได้แค่รอ"],
      dragon: ["🐉", "ดาบมังกรแดง", "ตีประชิด อัตราคริติคอลเพิ่ม 50% ทั้งตีปกติและคฑาแห่งการเยียวยา"],
      great: ["⚔️", "ดาบใหญ่", "ตีประชิด พลังโจมตีเพิ่ม 1 และตีโดนแล้วผลักเป้าออกไป 1 ช่อง"],
      fire: ["🔥", "เวทย์ไฟ", "ตีได้ไกล 1 ถึง 3 ช่อง ตีโดนแล้วเป้าติดลุกไหม้ 1"],
      wind: ["🍃", "เวทย์ลม", "ตีได้ไกล 1 ถึง 3 ช่อง ตีโดนแล้วผลักเป้า 2 ช่อง ถ้าชนสิ่งกีดขวาง ขอบ หรือคน เสียหายเพิ่ม 1 เกราะรับก่อน"],
      thunder: ["⚡", "เวทย์ไฟฟ้า", "ตีได้ไกล 1 ถึง 3 ช่อง ตีโดนแล้วเป้าติดช็อต 2 เทิร์น"],
    }[c.weapon];
    if (W) out.push({ key: "celineWeapon", v: 1, icon: W[0], label: W[1], cls: c.weaponClass === "magic" ? "bg-emerald-300 text-gray-900" : "bg-pink-300 text-gray-900", desc: W[2] });
    if (c.king > 0 && !((p.statuses || {}).celineKing > 0)) out.push({ key: "celineKingTurns", v: c.king, turns: true, icon: "👑", label: "ราชาดอกไม้", cls: "bg-amber-300 text-gray-900", desc: "เดินบนช่องดอกไม้ไม่เสียก้าว อัตราคริติคอลเพิ่ม 50% คริติคอลแรงสามเท่า และต้นเทิร์นได้แต้มสกิล 1" });
    else if (c.ultCd > 0) out.push({ key: "celineUltCd", v: c.ultCd, turns: true, icon: "⏳", label: "สวนดอกไม้ของฉัน", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้ท่าไม้ตายได้อีก" });
    if (c.tenderLeft != null) out.push({ key: "celineTender", v: 1, icon: "🌸", label: `${c.tenderLeft}/3`, cls: c.tenderLeft > 0 ? "bg-pink-200 text-gray-900" : "bg-white/20", desc: "ใช้ความอ่อนโยนได้อีกกี่ครั้งในเทิร์นนี้ รวมทุกคฑาไม่เกิน 3 ครั้ง ไม่นับโควตาสกิล" });
    if (c.healCd > 0) out.push({ key: "celineHealCd", v: c.healCd, turns: true, icon: "💚", label: "⏳", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้คฑาแห่งการเยียวยาได้อีก" });
    else if (c.healCount > 0) out.push({ key: "celineHealCount", v: 1, icon: "💚", label: `${c.healCount}/4`, cls: "bg-lime-200 text-gray-900", desc: "ใช้คฑาแห่งการเยียวยาครบ 4 ครั้งแล้วพัก 5 เทิร์น นับสะสมข้ามเทิร์น" });
    if (c.wallCd > 0) out.push({ key: "celineWallCd", v: c.wallCd, turns: true, icon: "🧊", label: "⏳", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้คฑาแห่งการกีดกันได้อีก" });
    else if (c.wallCount > 0) out.push({ key: "celineWallCount", v: 1, icon: "🧊", label: `${c.wallCount}/2`, cls: "bg-sky-200 text-gray-900", desc: "ใช้คฑาแห่งการกีดกันครบ 2 ครั้งแล้วพัก 3 เทิร์น นับสะสมข้ามเทิร์น" });
    if (c.swapCd > 0) out.push({ key: "celineSwapCd", v: c.swapCd, turns: true, icon: "🔁", label: "⏳", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงใช้คฑาแห่งการเคลื่อนย้ายได้อีก" });
    if (c.inBloom) out.push({ key: "celineTea", v: 1, icon: "🍵", label: c.teaNeed ? `${c.tea || 0}/${c.teaNeed}` : "เวลาน้ำชา", cls: "bg-lime-300 text-gray-900", desc: "ต้นเทิร์นยืนในพุ่มติดกันครบ 2 เทิร์น ฟื้นพลังชีวิต 1 แล้วนับใหม่ ระหว่างอยู่ในพุ่มอัตราคริติคอลเพิ่ม 20%" });
  }
  // ไรโด ฮิคารุ: ร่าง UltraLive (นับเทิร์นที่เหลือ) · สโตเรี่ยม · Strium Brace · หมอกเคมู · คูลดาวน์
  if (p.hikaru) {
    const h = p.hikaru;
    if (h.form) out.push({ key: "hikaruForm", v: h.formLeft || 1, icon: "🔆", label: h.formName, cls: "bg-amber-300 text-gray-900", desc: "เกราะสูงสุดเพิ่ม 2 เกราะลดลงทุก 1 ฟื้นพลังชีวิต 1 ตีปกติได้ผลตามร่าง หมดเวลาแล้วคืนร่างปกติและร่างนั้นพัก 5 เทิร์น" });
    if (h.ginga && h.strium) out.push({ key: "hikaruStrium", v: 1, icon: "🌈", label: "Strium", cls: "bg-orange-400 text-gray-900", desc: "พลังโจมตีเพิ่มอีก 1 ตีปกติติดลุกไหม้ 1 และท่าไม้ตายเปลี่ยนเป็น Strium Ray" });
    if (!h.strium && h.brace > 0) out.push({ key: "hikaruBrace", v: 1, icon: "🌈", label: `Strium Brace ${h.brace}/${h.braceMax}`, cls: "bg-echo-ice text-gray-900", desc: "จบเทิร์นในร่าง Ultraman Ginga ช่วงกลางวันได้ 1 ครบแล้วกลายเป็น Strium ถาวร" });
    if (h.kemurCalm > 0) out.push({ key: "hikaruKemur", v: 1, icon: "🌫️", label: `${h.kemurCalm}/${h.kemurMax}`, cls: "bg-purple-300 text-gray-900", desc: "ร่างมนุษย์ดาวเคมูไม่ถูกโจมตีและไม่เสียหายต่อเนื่องครบแล้ว เทิร์นถัดไปล่องหน 1 เทิร์น" });
    if (h.armorCd > 0) out.push({ key: "hikaruArmorCd", v: h.armorCd, turns: true, icon: "⏳", label: "เกราะ UltraLive", cls: "bg-white/20", desc: "รอให้ครบเทิร์นจึงฟื้นเกราะ 2 ตอนเข้าร่าง UltraLive ได้อีก" });
  }
  // Ice Spike: ดาเมจสะสมก่อนระเบิด (ติดตัว 3)
  // Fodlan: ค่าของด่านต่อคน (ความอบอุ่น · ศิลาตรา · ชีพจรเทพ … — server/fodlan/stageN.js playerInfo().badges)
  if (p.fodlan && Array.isArray(p.fodlan.badges)) for (const b of p.fodlan.badges) out.push({ key: `fd_${b.key}`, v: 1, icon: b.icon, label: b.label, cls: b.cls || "bg-amber-200 text-gray-900", desc: b.desc || b.label });
  if (typeof p.iceHurt === "number") out.push({ key: "iceHurt", v: 1, icon: "❄️", label: `${p.iceHurt}/3`, cls: "bg-sky-200 text-gray-900", desc: "ความเสียหายที่ได้รับสะสมครบแล้วระเบิดผลักศัตรูรอบตัวออกไป 2 ช่อง และติดเชื่องช้า 1 เทิร์น" });
  // ยูกิ มาโคโตะ: นับถอยหลังเกิดใหม่เป็นประตู (ตัวเลขเท่านั้น — showV = โชว์เลขแม้เหลือ 1)
  if (p.yuki && p.yuki.left > 0) out.push({ key: "yukiCharge", v: p.yuki.left | 0, turns: true, showV: true, icon: "🚪", label: "เกิดใหม่เป็นประตู", cls: "bg-sky-300 text-gray-900", desc: "" });
  if (full && (p.shield || 0) > 0) out.push({ key: "shield", v: p.shield, icon: "🛡️", label: "โล่", cls: "bg-echo-armor", desc: "กันความเสียหายได้ตามจำนวนโล่" });
  if (full && (p.tempHp || 0) > 0) out.push({ key: "tempHp", v: p.tempHp, icon: "💛", label: "เลือดชั่วคราว", cls: "bg-echo-ice text-gray-900", desc: "รับความเสียหายก่อนพลังชีวิต หายเองใน 2 เทิร์น" });
  return out;
}
// compact = ไอคอนล้วน ไม่มีข้อความชื่อ + จำกัดจำนวนแถวด้วย max แล้วยุบที่เหลือเป็นป้าย "+N"
//  ใช้กับการ์ดผู้เล่นอื่น/เป้าหมาย (บัฟ/ดีบัฟเยอะแล้วแถวยาวจนอ่านไม่รู้เรื่อง) — แตะที่การ์ดเพื่อดูรายละเอียดเต็มแทน (onInspect เดิม)
//  ปกติ (ไม่ compact) ยังมีชื่อเต็มเหมือนเดิม ใช้กับแผงตัวเราเองที่มีพื้นที่กว้างกว่า
// grid = แผงของตัวเอง (จอคอม): ตาราง 3 คอลัมน์ × 2 แถวตายตัว ชื่อยาวย่อด้วย … — เกิน 6 สถานะ
//  ช่องสุดท้ายเป็น "+N" ให้กดดูทั้งหมด (เดิมป้ายเต็มชื่อตัดบรรทัดอิสระ แถวที่ 3 ถูกกล่องสูง 2 แถวตัดครึ่ง = จอพัง)
const STATUS_GRID_MAX = 6;
function StatusChips({ p, left, compact, grid, max = 5 }) {
  const items = statusEntries(p);
  if (!items.length) return null;
  if (grid) {
    const cut = items.length > STATUS_GRID_MAX;
    const shown = cut ? items.slice(0, STATUS_GRID_MAX - 1) : items;
    return (
      <div className="grid grid-cols-3 gap-1 mt-1 w-full">
        {shown.map((it) => (
          <span
            key={it.key}
            title={`${it.label}${it.amt > 0 ? ` +${it.amt}` : ""}${showStatusValue(it) ? ` x${it.v}` : ""}${it.desc ? ` — ${it.desc}` : ""}`}
            className={`flex items-center gap-1 min-w-0 text-xs px-1.5 py-0.5 rounded-md font-bold border border-black/25 shadow ${it.cls}`}
          >
            <span className="shrink-0">{it.icon}</span>
            <span className="truncate">{it.label}{it.amt > 0 ? ` +${it.amt}` : ""}</span>
            {showStatusValue(it) && <span className="shrink-0 opacity-90">{it.v}</span>}
          </span>
        ))}
        {cut && (
          <span className="flex items-center justify-center text-xs px-1.5 py-0.5 rounded-md font-black bg-black/65 border border-white/25 text-white">
            +{items.length - shown.length} แตะดูทั้งหมด
          </span>
        )}
      </div>
    );
  }
  const shown = compact ? items.slice(0, max) : items;
  const overflow = compact ? items.length - shown.length : 0;
  return (
    <div className={`flex flex-wrap gap-1 ${left ? "justify-start" : "justify-center"} mt-1`}>
      {shown.map((it) => {
        // เลขจำนวนสถานะทับซ้อน — โชว์ทั้งโหมด compact (การ์ดผู้เล่นอื่น) ด้วย ไม่ใช่แค่แผงตัวเอง
        //  เดิม compact = ไอคอนล้วน ผู้เล่นอื่นมองไม่เห็นว่าสถานะทับซ้อนกี่ชั้น ต้องแตะดูรายละเอียดถึงจะรู้
        const num = it.amt > 0 ? it.amt : (showStatusValue(it) ? it.v : null);
        return (
          <span
            key={it.key}
            title={`${it.label}${it.amt > 0 ? ` +${it.amt}` : ""}${showStatusValue(it) ? ` x${it.v}` : ""}${it.desc ? ` — ${it.desc}` : ""}`}
            className={
              compact
                ? `relative w-5 h-5 grid place-items-center text-[11px] rounded-[4px] font-bold border border-black/25 shadow shrink-0 ${it.cls}`
                : `inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md font-bold border border-black/25 shadow ${it.cls}`
            }
          >
            {compact ? (
              <>
                {it.icon}
                {num != null && (
                  <span className="absolute -bottom-1 -right-1 text-[8px] font-black bg-black text-white rounded-full min-w-[12px] h-[12px] px-0.5 grid place-items-center leading-none border border-white/40">
                    {num}
                  </span>
                )}
              </>
            ) : (
              <><span>{it.icon}</span><span>{it.label}{it.amt > 0 ? ` +${it.amt}` : ""}{showStatusValue(it) ? ` ${it.v}` : ""}</span></>
            )}
          </span>
        );
      })}
      {overflow > 0 && (
        <span
          className="w-5 h-5 grid place-items-center text-[10px] font-black rounded-[4px] bg-black/65 border border-white/25 text-white shrink-0"
          title={`อีก ${overflow} สถานะ — แตะที่การ์ดเพื่อดูทั้งหมด`}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}

// สถานะที่เป็นสแตคถาวร/ตัวนับเรื่อยๆ ไม่ใช่ตัวนับถอยหลังเทิร์น (ต้องตรงกับรายการยกเว้นในลูปลดเทิร์นสถานะทั่วไปที่ server.js
//  ไม่งั้น StatusModal จะโชว์ "เหลือ N เทิร์น" หลอกๆ ทั้งที่ค่า v ที่แท้จริงคือจำนวนสแตคสะสม ไม่ใช่เทิร์นที่เหลือ)

// ค่าธง "ถาวร" ฝั่งเซิร์ฟเวอร์คือ 999 แต่บางสกิลใส่ซ้ำ/บวกทับจนโตกว่านั้นมาก
// ตัวนับเทิร์นจริงยาวสุดในเกมไม่ถึง 99 — เกินจากนี้ถือว่าไม่ใช่จำนวนเทิร์นแน่นอน
const isPermanentTurnValue = (it) => (it.v || 0) >= 99;
const isPermanentStatus = (it) => PERMANENT_STATUS_KEYS.has(it.key) || isPermanentTurnValue(it);
const showStatusValue = (it) => (it.v > 1 || (it.showV && it.v > 0)) && !isPermanentTurnValue(it);
// หน้าคาดการณ์ผลการตี (BoardScenes ForecastScreen — ผู้ใช้สั่ง 2026-11-08): สถานะของทั้งสองฝั่ง · ชี้ = คำอธิบาย + จำนวนคงเหลือ
//  rem = ข้อความจำนวนคงเหลือแบบเดียวกับ StatusModal ("เหลือ N เทิร์น" / "ถาวร" / "สะสม N")
function forecastStatusItems(p) {
  return statusEntries(p).map((it) => {
    let rem = null;
    if (it.v > 0) {
      if (isPermanentTurnValue(it)) rem = "ถาวร";
      else if (isPermanentStatus(it) || (!it.turns && !(it.key in (p.statuses || {})))) rem = it.v > 1 ? `สะสม ${it.v}` : null;
      else rem = `เหลือ ${it.v} เทิร์น`;
    }
    const n = it.amt > 0 ? `+${it.amt}` : rem && rem !== "ถาวร" ? it.v : null; // เลขบนชิป: จำนวนซ้อน > เทิร์น/สะสมที่เหลือ
    return { key: it.key, icon: it.icon, label: it.label, cls: it.cls, desc: it.desc, amt: it.amt || 0, rem, n };
  });
}

// ---------- หน้าต่างดูสถานะ + รายละเอียดสกิลของผู้เล่น (แตะการ์ดผู้เล่นคนไหนก็ได้ตอนไม่ได้เลือกเป้า) ----------
//  patch 1.9.1: เพิ่มรายละเอียดสกิลตัวละครของฝั่งตรงข้ามให้กดดูได้จากหน้ากระดาน
function StatusModal({ p, onClose, statusOnly }) {
  const items = statusEntries(p, true);
  const ch = p.character;
  const skillRows = !statusOnly && ch
    ? [["สกิลติดตัว", ch.passive], ["สกิลพื้นฐาน", ch.basic], ["สกิลรอง", ch.secondary], ["ท่าไม้ตาย", ch.ultimate]]
    : [];
  return (
    <AvModal
      tone="white"
      label={statusOnly ? "สถานะ" : "ข้อมูลผู้เล่น"}
      title={p.name}
      width="min(34rem, 94vw)"
      onClose={onClose}
      right={
        !statusOnly && p.img ? (
          <span className="av-frame relative block w-12 h-12 overflow-hidden shrink-0" style={{ border: `1px solid ${p.color}` }}>
            <img src={p.character?.cover || p.img} alt="" className="w-full h-full object-cover" />
          </span>
        ) : null
      }
    >
      <>
        {!statusOnly && (
          <div className="av-heading text-sm mb-4" style={{ color: "var(--avm-dim, rgba(234,243,252,.6))" }}>
            {p.character?.name}
            {!p.connected && <span className="ml-2 text-xs" style={{ color: "var(--av-blood)" }}>• reconnecting</span>}
          </div>
        )}
        {items.length === 0 ? (
          <div className="av-label py-4 text-center" style={{ color: "var(--avm-dim, rgba(234,243,252,.4))" }}>ไม่มีสถานะผิดปกติ</div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((it) => (
              <div key={it.key} className="av-item flex items-start gap-3">
                <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md font-bold shrink-0 ${it.cls}`}><span>{it.icon}</span><span>{it.label}{it.amt > 0 ? ` +${it.amt}` : ""}</span></span>
                <div className="min-w-0">
                  <span className="text-sm opacity-90 leading-snug">{it.desc}</span>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    {/* จำนวนซ้อนทับ (amount) — โชว์แยกชัดเจนเสมอเมื่อมีค่า ไม่ใช่แค่เลขเล็กๆ ในป้ายไอคอนด้านบนที่สังเกตยาก */}
                    {it.amt > 0 && <span className="text-xs font-bold text-echo-hp">จำนวน {it.amt}</span>}
                    {it.v > 0 && (
                      isPermanentTurnValue(it)
                        ? <span className="text-xs font-bold text-echo-cyan">ถาวร</span>
                        : isPermanentStatus(it) || (!it.turns && !(it.key in (p.statuses || {}))) // ป้ายตัวละครที่ไม่ใช่ตัวนับถอยหลัง (กระสุน/ตัวนับ/ร่าง) = ไม่มี "เหลือ N เทิร์น"
                          ? (it.v > 1 ? <span className="text-xs font-bold text-echo-cyan">สะสม {it.v}</span> : null)
                          : <span className="text-xs font-bold text-echo-ice">เหลือ {it.v} เทิร์น</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {skillRows.length > 0 && (
          <div className="mt-5">
            <div className="av-label mb-3">{ch.name}</div>
            <div className="flex flex-col gap-2">
              {skillRows.map(([label, s], i) =>
                s ? (
                  <div key={i} className="av-item flex items-start gap-3">
                    {s.img ? (
                      <img src={s.img} alt="" className="w-16 h-11 object-cover shrink-0 mt-0.5" />
                    ) : (
                      <span className="w-16 h-11 grid place-items-center text-xl shrink-0 mt-0.5" style={{ background: "rgba(127,184,230,.12)" }}>✦</span>
                    )}
                    <div className="min-w-0">
                      <div className="flex justify-between gap-2">
                        <span className="av-heading text-sm">
                          {label} · <span style={{ color: "var(--avm-gold, var(--av-gold-lit))" }}>{s.name}</span>
                        </span>
                        <span className="text-xs shrink-0" style={{ color: "var(--avm-dim, rgba(234,243,252,.5))" }}>
                          {s.cost != null ? `ใช้ ${s.cost}` : "ฟรี"}
                        </span>
                      </div>
                      <div className="text-xs leading-snug" style={{ color: "var(--avm-text, rgba(234,243,252,.72))" }}>{s.desc}</div>
                    </div>
                  </div>
                ) : null
              )}
            </div>
          </div>
        )}
      </>
    </AvModal>
  );
}

// ---------- ป๊อปอัปยืนยันก่อนใช้สกิล (patch UX): กดช่องสกิลใดก็ตาม -> ถามยืนยันก่อนเสมอ ----------
//  โชว์ ภาพสกิล / ลำดับสกิล (พื้นฐาน-รอง-ท่าไม้ตาย) / ชื่อสกิล / แต้มที่ใช้จริง / รายละเอียด — ยกเลิกได้ ไม่มีผลใดๆ
function SkillConfirmModal({ confirm, onConfirm, onCancel }) {
  const { skillData, label, useCost } = confirm;
  return (
    <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4" onClick={onCancel}>
      <div className="bg-echo-navy rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-white/10" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          {skillData?.img ? (
            <img src={skillData.img} alt="" className="w-20 h-14 object-cover rounded-lg shrink-0 border border-white/10" />
          ) : (
            <span className="w-20 h-14 grid place-items-center text-2xl shrink-0 bg-white/5 rounded-lg border border-white/10">✦</span>
          )}
          <div className="min-w-0">
            <div className="text-xs font-bold text-echo-ice">{label}</div>
            <div className="text-lg font-black truncate">{skillData?.name || "สกิล"}</div>
            <div className="text-xs font-bold opacity-80 mt-0.5">{useCost != null ? `ใช้แต้มสกิล ${useCost}` : "ฟรี"}</div>
          </div>
        </div>
        {skillData?.desc && <div className="text-sm opacity-90 leading-snug mt-3">{skillData.desc}</div>}
        <div className="flex gap-2 mt-4">
          <Button variant="ghost" className="flex-1" onClick={onCancel}>ยกเลิก</Button>
          <Button className="flex-1" onClick={() => { clickSound(); onConfirm(); }}>ใช้งาน</Button>
        </div>
      </div>
    </div>
  );
}

// ---------- ร้านค้ามายา + คลังผู้เล่น (patch 2.2 full) ----------
// ไรโด ฮิคารุ: คลิปทุกตัว (เล่นครั้งเดียวต่อเกม — characters/_transforms.js)
const HIKARU_CLIPS = ["form_blackking", "form_thunderdarambia", "form_kemurjin", "form_kingpandon", "form_doragory", "form_tiga",
  "hikaru_skill2", "hikaru_strium", "hikaru_skill3", "hikaru_strium_ray"];
// วีดีโอท่าของตัวละครในแมตช์: โหลดล่วงหน้าไว้ในเบื้องหลัง — ไม่งั้นตอนใช้จริงวีดีโอจะขึ้นช้า
//  แล้วโดนเวลาคัตซีนฝั่ง server ตัดจบก่อนวีดีโอเล่นจบ
function CharVideoPreloader({ players }) {
  const preloadMuimi = (players || []).some((p) => p.character?.id === "muimi");
  const preloadSliver = (players || []).some((p) => p.character?.id === "sliver_bullet");
  const preloadSora = (players || []).some((p) => p.character?.id === "sora_otosumi");
  const preloadKira = (players || []).some((p) => p.character?.id === "kira");
  const preloadYuna = (players || []).some((p) => p.character?.id === "yuna");
  const preloadHikaru = (players || []).some((p) => p.character?.id === "raido_hikaru");
  const preloadGray = (players || []).some((p) => p.character?.id === "gray");
  if (!preloadMuimi && !preloadSliver && !preloadSora && !preloadHikaru && !preloadKira && !preloadYuna && !preloadGray) return null;
  return (
    <div aria-hidden className="hidden">
      {preloadMuimi && <video src="/characters/muimi/muimi_skill3.mp4" preload="auto" muted playsInline />}
      {preloadMuimi && <video src="/characters/muimi/muimi_skill3_short.mp4" preload="auto" muted playsInline />}
      {preloadSliver && <video src="/characters/sliver_bullet/sliver_bullet_skill1.mp4" preload="auto" muted playsInline />}
      {preloadSliver && <video src="/characters/sliver_bullet/sliver_bullet_skill2.mp4" preload="auto" muted playsInline />}
      {preloadSora && <video src="/characters/sora_otosumi/sora_skill1.mp4" preload="auto" muted playsInline />}
      {preloadKira && <video src="/characters/kira/kira_skill1.mp4" preload="auto" muted playsInline />}
      {preloadYuna && <video src="/characters/yuna/yuna_skill3.mp4" preload="auto" muted playsInline />}
      {preloadGray && <video src="/characters/gray/gray_skill3_intro.mp4" preload="auto" muted playsInline />}
      {preloadGray && <video src="/characters/gray/gray_skill3_final.mp4" preload="auto" muted playsInline />}
      {preloadSora && <video src="/characters/sora_otosumi/sora_skill3_normal.mp4" preload="auto" muted playsInline />}
      {preloadSora && <video src="/characters/sora_otosumi/sora_skill3_hit.mp4" preload="auto" muted playsInline />}
      {preloadSora && <video src="/characters/sora_otosumi/myth_fire.mp4" preload="auto" muted playsInline />}
      {preloadSora && <video src="/characters/sora_otosumi/myth_fire_skill3_intro.mp4" preload="auto" muted playsInline />}
      {preloadSora && <video src="/characters/sora_otosumi/myth_fire_skill3_hit.mp4" preload="auto" muted playsInline />}
      {preloadHikaru && HIKARU_CLIPS.map((f) => <video key={f} src={`/characters/raido_hikaru/${f}.mp4`} preload="auto" muted playsInline />)}
    </div>
  );
}
// ไอคอนไอเทม: มีรูปจริงใช้รูป ไม่มีก็ใช้ emoji เดิม
function ItemIcon({ info, className = "" }) {
  if (info.img) return <img src={info.img} alt="" className={`object-contain shrink-0 ${className}`} onError={(e) => { e.currentTarget.style.display = "none"; }} />;
  return <span className={`shrink-0 ${className}`}>{info.icon}</span>;
}

// ร้านค้ามายา: ร้านเดียว 15 ช่อง ตั้งบนแผนที่ — ย้ายจุด + สุ่มของใหม่ทุก 6 เทิร์น (GRID_PLAN §8.1)
//  กริดขยายออกด้านข้าง (สูงสุด 5 คอลัมน์ = 3 แถว) ไม่ให้โมดัลยืดลงจนต้อง scroll แนวตั้ง
// ป้ายร้านค้าปรากฏ (ออกแบบใหม่ — ผู้ใช้สั่ง 2026-11-10 "ห้ามทำแบบเดิม · ของกลางทุกโหมด ทำให้สวย"):
//  ป้ายร้านแขวนโซ่หย่อนลงจากขอบบน แกว่งแล้วนิ่ง · กระดิ่งร้านสั่น · ตราประทับ "ปรากฏ" กดลงบนป้าย · ฝุ่นทองร่วงตอนประทับ
//  จบ = ดึงกลับขึ้นไป (ยาว SCENE_MS.shop) · ไม่มีข้อความอื่นนอกจากชื่อร้าน + "ปรากฏ"
function ShopHerald({ name }) {
  const dust = Array.from({ length: 12 }, (_, i) => ({ x: (i * 37) % 100, d: (i % 4) * 0.07, s: 3 + (i % 3) * 2 }));
  return (
    <div className="shh" aria-hidden="true">
      <div className="shh-hang">
        <span className="shh-chain shh-chain-l" />
        <span className="shh-chain shh-chain-r" />
        <div className="shh-board">
          <svg className="shh-bell" width="34" height="34" viewBox="0 0 34 34">
            <path d="M17 4c1.2 0 2 .8 2 1.8v1c4.6 1 7.4 4.8 7.4 10.2v5.6l2.6 3H5l2.6-3V17c0-5.4 2.8-9.2 7.4-10.2v-1C15 4.8 15.8 4 17 4z" fill="url(#shhBellG)" stroke="#5a3a0c" strokeWidth="1.2" />
            <circle cx="17" cy="29" r="2.6" fill="#5a3a0c" />
            <defs>
              <linearGradient id="shhBellG" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fff2c4" />
                <stop offset="55%" stopColor="#e7b450" />
                <stop offset="100%" stopColor="#9a6a1c" />
              </linearGradient>
            </defs>
          </svg>
          <svg className="shh-awning" viewBox="0 0 220 26" preserveAspectRatio="none">
            {Array.from({ length: 11 }, (_, i) => (
              <path key={i} d={`M${i * 20} 0h20v14q-10 12-20 0z`} fill={i % 2 ? "#f4ead2" : "#c8423a"} />
            ))}
          </svg>
          <div className="shh-name">{name || shopName("apoth")}</div>
          <div className="shh-stamp"><span>ปรากฏ</span></div>
          <div className="shh-dust">
            {dust.map((k, i) => <i key={i} style={{ left: `${k.x}%`, animationDelay: `${0.95 + k.d}s`, width: k.s, height: k.s }} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

function ShopModal({ shop, me, block, onClose }) {
  const list = shop?.items || [];
  const turnsLeft = shop?.turnsLeft || 0;
  return (
    <AvModal
      tone="white"
      label="ร้านค้า"
      title={shop?.name || shopName(shop?.kind)}
      width="min(72rem, 94vw)"
      onClose={onClose}
      right={<span className="flex gap-2">
        {turnsLeft > 0 && <span className="av-chip"><span>เหลือ {turnsLeft} เทิร์น</span></span>}
        <span className="av-chip av-chip-gold"><span>🪙 {me?.gold ?? 0}</span></span>
      </span>}
    >
      <>
        {(!list || list.length === 0) ? (
          <div className="av-label py-10 text-center" style={{ opacity: 0.5 }}>ไม่มีของ</div>
        ) : (
          <div className="grid grid-cols-5 gap-3">
            {list.map((it) => {
              const info = shopInfoOf(it);
              const sold = !!it.sold;
              const afford = (me?.gold ?? 0) >= it.price;
              return (
                <div
                  key={it.id}
                  className={`oc-shop-card relative p-3 flex flex-col items-center text-center gap-1.5 ${sold ? "sold" : ""}`}
                >
                  <ItemIcon info={info} className="text-3xl h-12 w-12" />
                  <div className="av-heading text-xs leading-tight">{info.label(it)}</div>
                  {/* คำอธิบายย่อ (ผู้ใช้สั่ง 2026-10-09 · ฉบับเต็มชี้ค้างดูได้) */}
                  {info.short && <div className="oc-shop-short text-xs leading-snug" title={info.desc}>{info.short}</div>}
                  <div className="mt-auto w-full flex flex-col items-center gap-2 pt-2">
                    <div className="av-label oc-shop-price" style={{ fontSize: "0.7rem" }}>
                      🪙 {it.price}
                      {/* จำนวนที่ยังซื้อได้ของช่องนี้ (สุ่ม 2–5 ต่อช่อง — ผู้ใช้สั่ง 2026-11-08) */}
                      {it.stockMax > 0 && !sold && <span className="oc-shop-stock"> · เหลือ {it.stock}/{it.stockMax}</span>}
                    </div>
                    <AvButton
                      className="w-full py-1.5 text-xs px-2"
                      disabled={sold || !afford || !!block}
                      onClick={() => { playSfx("buy_something"); socket.emit("buyShopItem", { shopId: shop.id, itemId: it.id }); }}
                    >
                      {it.closed ? "ปิดขาย" : sold ? "ขายแล้ว" : !afford ? "เหรียญไม่พอ" : block || "ซื้อ"}
                    </AvButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </>
    </AvModal>
  );
}

function InventoryModal({ me, myTurn, bagSlots = 5, onClose }) {
  const items = me?.inventory || [];
  // ใช้ของได้เฉพาะตาเดินของตัวเอง (ระบบกระดาน)
  const turnBlock = !myTurn ? "ใช้ได้เฉพาะตาของคุณ" : null;
  function applyItem(uid) { clickSound(); socket.emit("useInventoryItem", { uid }); }
  // ทิ้งของ: ตาตัวเองเท่านั้น ไม่นับเป็นการใช้
  function dropItem(uid) { clickSound(); socket.emit("dropItem", { uid }); }

  return (
    <AvModal label="กระเป๋า" title={`กระเป๋าของ ${me?.name || ""}`} width="min(34rem, 94vw)" onClose={onClose}
      right={<span className="av-chip"><span>{items.length}/{bagSlots}</span></span>}>
      <>
        {items.length === 0 ? (
          <div className="av-label py-8 text-center" style={{ color: "var(--avm-dim, rgba(234,243,252,.4))" }}>ยังไม่มีของในคลัง</div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((it) => {
              const info = shopInfoOf(it);
              return (
                <div key={it.uid} className="av-item flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <ItemIcon info={info} className="text-2xl h-10 w-10" />
                    <div className="min-w-0 flex-1">
                      <div className="av-heading text-sm">{info.label(it)}</div>
                      <div className="text-xs leading-snug" style={{ color: "var(--avm-text, rgba(234,243,252,.62))" }}>{info.desc}</div>
                    </div>
                    <AvButton className="px-4 py-1.5 text-xs shrink-0" disabled={!!turnBlock} title={turnBlock || ""} onClick={() => applyItem(it.uid)}>ใช้</AvButton>
                    <AvButton className="px-3 py-1.5 text-xs shrink-0" disabled={!myTurn} onClick={() => dropItem(it.uid)}>ทิ้ง</AvButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </>
    </AvModal>
  );
}



function MobileOpponent({ p, phase, targetable, onAttack, onInspect, hostRef }) {
  const summary = phase === "SUMMARY";
  return (
    <div
      ref={hostRef}
      onClick={targetable ? () => { clickSound(); onAttack(p.id); } : () => { clickSound(); onInspect(p.id); }}
      className={`p-target-wrap p-panel relative flex items-center gap-2 rounded-2xl px-2 py-1.5 min-h-[68px] border-l-4 ${!p.alive ? "opacity-40 grayscale" : ""} ${targetable ? "cursor-crosshair" : "cursor-pointer"}`}
      style={{ "--p-frame-color": p.color, borderLeftColor: p.color }}
    >
      <div className="relative shrink-0">
        {<Portrait p={p} className="w-14 h-14 p-player-frame" rounded="rounded-xl" />}
        <TeamBadge teamId={p.teamId} className="absolute -top-3 -right-3 z-20" />
        {targetable && <TargetLockLegacy />}
        {!p.alive && <span className="absolute inset-0 grid place-items-center text-2xl">💀</span>}
        {p.isWinner && summary && <span className="absolute -top-2 -right-1 text-lg">👑</span>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-base font-black" style={{ color: p.color, fontFamily: "var(--font-p-display)" }}>
          {p.name}{!p.connected && <span className="ml-1 text-xs text-echo-hp">• offline</span>}
        </div>
        <TeamBadge teamId={p.teamId} />
        {/* เลือด + เกราะ อยู่บรรทัดเดียวแนวนอนเสมอ */}
        {<LifeBar p={p} sm className="mt-0.5" />}
        {<StatusChips p={p} left compact max={4} />}
      </div>
      {/* เปิดไพ่แล้ว: เดิมมีแต่วงกลมเขียวติ๊กถูกเล็กๆ บนรูป ไม่มีคำบอกว่าหมายถึงอะไร */}
      {phase === "PLAYING" && p.locked && p.alive && (
        <span className="pc-ready shrink-0" title="เปิดไพ่แล้ว">✓ พร้อม</span>
      )}
      {targetable && (
        <span className="p-target-badge shrink-0 text-[10px] px-2 py-0.5 rounded-full text-white whitespace-nowrap">
          🎯 เป้า
        </span>
      )}
      {/* เปิดแต้ม (promo): แต้มการ์ดถูกเปิดเผยให้ทุกคนเห็นแม้ยังไม่เปิดไพ่ */}
      {(summary || (p.statuses?.promo || 0) > 0) && p.score !== null && p.score !== undefined && (
        <div className={`score-pop shrink-0 text-xl font-black ${p.isWinner ? "text-echo-ice" : p.busted ? "text-echo-hp" : "text-white"}`}>
          {p.busted ? "แตก!" : p.score}
        </div>
      )}
    </div>
  );
}

// ---------- modal รายละเอียดตัวละคร (ใช้ร่วมกันทั้งจอคอม/มือถือ) ----------
//  me = ผู้เล่นของเรา -> โชว์สถานะผิดปกติที่ติดอยู่ตอนนี้ พร้อมคำอธิบายเต็ม
function CharModal({ ch, me, onClose }) {
  const myStatuses = me ? statusEntries(me, true) : [];
  return (
    <AvModal tone="white" label="ข้อมูลตัวละคร" title={ch.name} width="min(34rem, 94vw)" onClose={onClose}>
      <>
        <div className="flex flex-col gap-2">
          {[["สกิลติดตัว", ch.passive], ["สกิลพื้นฐาน", ch.basic], ["สกิลรอง", ch.secondary], ["ท่าไม้ตาย", ch.ultimate]].map(([label, s], i) =>
            s ? (
              <div key={i} className="av-item">
                <div className="flex justify-between gap-3">
                  <span className="av-heading text-sm">
                    {label} · <span style={{ color: "var(--avm-gold, var(--av-gold-lit))" }}>{s.name}</span>
                  </span>
                  <span className="text-xs shrink-0" style={{ color: "var(--avm-dim, rgba(234,243,252,.5))" }}>
                    {s.cost != null ? `ใช้ ${s.cost}` : "ฟรี"}
                  </span>
                </div>
                <div className="text-sm mt-1 leading-snug" style={{ color: "var(--avm-text, rgba(234,243,252,.78))" }}>{s.desc}</div>
              </div>
            ) : null
          )}
        </div>
        {myStatuses.length > 0 && (
          <div className="mt-5">
            <div className="av-label mb-3">สถานะที่ติดอยู่ตอนนี้</div>
            <div className="flex flex-col gap-2">
              {myStatuses.map((it) => (
                <div key={it.key} className="av-item flex items-start gap-3">
                  <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 font-bold shrink-0 ${it.cls}`}>
                    <span>{it.icon}</span>
                    <span>{it.label}{it.amt > 0 ? ` +${it.amt}` : ""}{showStatusValue(it) ? ` ${it.v}` : ""}</span>
                  </span>
                  <span className="text-sm leading-snug" style={{ color: "var(--avm-text, rgba(234,243,252,.85))" }}>{it.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    </AvModal>
  );
}

// ---------- QTE กลาง (server/qte.js) — เดสก์ท็อป: กด W/A/S/D ตามที่ขึ้น ----------
//  server ส่งมาแค่ "ปุ่มตัวถัดไป" ตัวเดียว (ส่งทั้งชุด = เห็นล่วงหน้าทั้งเพลง หมดความหมาย)
//  แถบเวลาวิ่งเองฝั่ง client เพื่อความลื่น แต่ผลตัดสินที่ server เสมอ (deadline เป็นเวลาของ server)
//  หมดเวลาเมื่อไหร่ยิง qteTimeout ไปให้ server ตรวจซ้ำเอง — client โกงให้ผ่านไม่ได้
function QtePanel({ qte }) {
  const [now, setNow] = useState(() => Date.now()); // lazy: Date.now() เป็น impure ห้ามเรียกตอน render
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 50);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const onKey = (e) => {
      const k = (e.key || "").toLowerCase();
      if (!["w", "a", "s", "d"].includes(k)) return;
      e.preventDefault();
      socket.emit("qteKey", { key: k });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  // แจ้ง server เมื่อนับถอยหลังหมด (server ตรวจเวลาซ้ำอีกชั้นก่อนตัดสินว่าพลาด)
  const expired = now > qte.deadline;
  useEffect(() => {
    if (expired) socket.emit("qteTimeout");
  }, [expired]);

  const left = Math.max(0, qte.deadline - now);
  const pct = Math.max(0, Math.min(100, (left / qte.perNoteMs) * 100));
  return (
    <div className="absolute inset-x-0 top-[26%] z-50 flex flex-col items-center gap-2 pointer-events-none text-hard">
      <div className="text-sm font-black bg-black/70 rounded-full px-4 py-1 border border-white/25">
        🎸 บรรเลงให้ครบ — โน้ตที่ {qte.idx + 1}/{qte.total}
      </div>
      <div
        className="grid place-items-center w-28 h-28 rounded-2xl border-4 bg-black/75"
        style={{ borderColor: "var(--color-p-accent-bright)" }}
      >
        <span className="text-6xl font-black uppercase" style={{ fontFamily: P_DISPLAY }}>{qte.key}</span>
      </div>
      <div className="w-48 h-2 bg-black/60 rounded-full overflow-hidden border border-white/20">
        <div
          className="h-full transition-none"
          style={{ width: `${pct}%`, background: pct < 35 ? "var(--color-echo-hp)" : "var(--color-p-accent-bright)" }}
        />
      </div>
      <div className="text-xs opacity-75">กดผิดหรือกดไม่ทัน = แต้มเสียฟรี</div>
    </div>
  );
}

// ---------- กองการ์ดกลางจอ: การ์ดคว่ำซ้อนกันเล็กน้อย ไม่ต้องมีอาร์ตใหม่ ----------
//  onClick (ถ้ามี) เปิดสมุดการ์ด (DeckLedgerModal) — ต้องเปิด pointer-events เฉพาะจุดนี้เอง เพราะ wrapper รอบนอก (โลโก้/กึ่งกลางจอ) เป็น pointer-events-none ทั้งแถบ
function BoardTimer({ phaseKey }) {
  const seconds = useTick();
  const [max, setMax] = useState(seconds || 1);
  useEffect(() => { setMax(Math.max(1, seconds || 1)); /* เฟสใหม่ -> เริ่มนับเพดานใหม่ */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseKey]);
  useEffect(() => { setMax((m) => Math.max(m, seconds || 0)); }, [seconds]);
  const pct = max > 0 ? Math.max(0, Math.min(1, (seconds || 0) / max)) : 0;
  const circ = 2 * Math.PI * 20;
  const low = (seconds || 0) <= 10;
  return (
    <div className="bd-timer" data-low={low ? "true" : "false"}>
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <circle className="bd-timer-ring" cx="24" cy="24" r="20" />
        <circle
          className="bd-timer-arc"
          cx="24"
          cy="24"
          r="20"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
        />
      </svg>
      <span
        className="relative leading-none"
        style={{ fontFamily: "var(--font-av-display)", fontWeight: 700, fontSize: "1.2rem", color: low ? "var(--bd-timer-low, #ff8a94)" : "var(--bd-timer-fg, #ffffff)" }}
      >
        {seconds}
      </span>
    </div>
  );
}

function DeckPile({ hostRef, size = "md", onClick }) {
  const dims = { sm: { w: 36, h: 48 }, md: { w: 48, h: 64 }, lg: { w: 80, h: 112 } };
  const dim = dims[size] || dims.md;
  return (
    <div
      ref={hostRef}
      className={`relative ${onClick ? "pointer-events-auto cursor-pointer active:scale-95 transition" : "pointer-events-none"}`}
      style={{ width: dim.w + 10, height: dim.h + 10 }}
      onClick={onClick}
      title={onClick ? "ดูสมุดการ์ดกองกลาง" : undefined}
    >
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="absolute" style={{ left: 5 - i * 2, top: 5 - i * 2, transform: `rotate(${(i - 1.5) * -3}deg)` }}>
          <Card back size={size} />
        </div>
      ))}
    </div>
  );
}

// ---------- สมุดการ์ดกองกลาง: กดที่กองการ์ดกลางเพื่อดูการ์ดทั้ง 43 ใบ ใบไหนถูกจั่วไปแล้ว (รอบนี้) จะเป็นสีเทา ----------
function DeckLedgerModal({ ledger, onClose }) {
  const drawnCount = ledger.filter((c) => c.drawn).length;
  return (
    <div className="fixed inset-0 z-50 bg-black/80 grid place-items-center p-4" onClick={onClose}>
      <div
        className="bg-echo-navy/95 border border-white/15 rounded-2xl p-4 sm:p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto text-hard"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3 gap-3">
          <div>
            <div className="text-lg sm:text-xl font-black">สมุดการ์ดกองกลาง</div>
            <div className="text-xs sm:text-sm text-white/60">จั่วไปแล้ว {drawnCount}/{ledger.length} ใบ (รอบปัจจุบัน — สับใหม่ทุกรอบ)</div>
          </div>
          <button onClick={onClose} className="shrink-0 text-sm font-bold bg-black/40 hover:bg-black/60 rounded-full px-3 py-1 border border-white/25">ปิด</button>
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-8 gap-1 place-items-center">
          {ledger.map((c, i) => (
            <div key={i} className={c.drawn ? "grayscale opacity-30" : ""}>
              <Card value={c.value} color={c.color} special={c.special} size="sm" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- ตรวจจับการจั่วการ์ด (ตัวเอง+คนอื่น รองรับจั่วพร้อมกันหลายคน) แล้วสร้างแอนิเมชันบินจากกองกลางไปหามือ ----------
//  เป็นแค่ overlay ตกแต่ง ไม่มีผลต่อ state จริงเลย — มือ/คะแนนจริงอัปเดตตาม state ทันทีเสมอไม่ต้องรอแอนิเมชันบินจบ
function useCardFlights(state) {
  const [flights, setFlights] = useState([]);
  const prevCounts = useRef({});
  const seeded = useRef(false);
  const flightSeq = useRef(0);
  const deckRef = useRef(null);
  const selfHandRef = useRef(null);
  const otherRefs = useRef({});
  const registerOther = useCallback((id, el) => {
    if (el) otherRefs.current[id] = el;
    else delete otherRefs.current[id];
  }, []);

  useEffect(() => {
    if (!state?.players) return;
    const counts = {};
    for (const p of state.players) {
      counts[p.id] = p.id === state.youId ? (p.cards ? p.cards.length : 0) : (p.cardCount || 0);
    }
    // ครั้งแรกที่ได้ state (mount/reconnect กลางรอบ) — แค่จำ baseline ไว้ ไม่ยิงแอนิเมชัน กันเข้าใจผิดว่าทั้งมือ "เพิ่งจั่ว"
    if (!seeded.current) {
      seeded.current = true;
      prevCounts.current = counts;
      return;
    }
    const deckRect = deckRef.current?.getBoundingClientRect();
    if (!deckRect) { prevCounts.current = counts; return; }
    const fromX = deckRect.left + deckRect.width / 2;
    const fromY = deckRect.top + deckRect.height / 2;

    const newFlights = [];
    for (const p of state.players) {
      const prev = prevCounts.current[p.id] || 0;
      const cur = counts[p.id] || 0;
      // แจกรอบใหม่: มือถูกรีเซ็ตแล้วแจกใหม่ในสเตตเดียวกัน (cur < prev) — ถือว่าทุกใบที่มีตอนนี้ "เพิ่งจั่ว" ทั้งหมด
      const delta = cur > prev ? cur - prev : cur < prev ? cur : 0;
      if (delta <= 0) continue;
      const isSelf = p.id === state.youId;
      const targetEl = isSelf ? selfHandRef.current : otherRefs.current[p.id];
      const targetRect = targetEl?.getBoundingClientRect();
      if (!targetRect) continue;
      const toX = targetRect.left + targetRect.width / 2;
      const toY = targetRect.top + targetRect.height / 2;
      const newCards = isSelf && p.cards ? p.cards.slice(-delta) : [];
      for (let i = 0; i < delta; i++) {
        newFlights.push({
          id: ++flightSeq.current,
          delayMs: i * 90,
          fromX, fromY, toX, toY,
          card: newCards[i] || null,
        });
      }
    }
    if (newFlights.length) setFlights((f) => [...f, ...newFlights]);
    prevCounts.current = counts;
  }, [state]);

  const removeFlight = (id) => setFlights((f) => f.filter((x) => x.id !== id));
  return { flights, removeFlight, deckRef, selfHandRef, registerOther, otherRefs };
}

// ---------- ชั้นเรนเดอร์การ์ดที่กำลังบิน (fixed เต็มจอ ทับทุกอย่าง ไม่กันคลิก) ----------
function FlyingCardsLayer({ flights, onDone }) {
  if (!flights.length) return null;
  return (
    <div className="fixed inset-0 z-[45] pointer-events-none overflow-hidden">
      <AnimatePresence>
        {flights.map((f) => (
          <motion.div
            key={f.id}
            className="absolute"
            style={{ left: f.fromX - 18, top: f.fromY - 24 }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.85, rotate: 0 }}
            animate={{
              x: f.toX - f.fromX, y: f.toY - f.fromY,
              opacity: [0, 1, 1, 0], scale: [0.85, 1.05, 0.9, 0.7], rotate: [0, 8, -4, 0],
            }}
            transition={{ duration: 0.5, delay: f.delayMs / 1000, ease: [0.2, 0.7, 0.3, 1] }}
            onAnimationComplete={() => onDone(f.id)}
          >
            {f.card ? <Card value={f.card.value} color={f.card.color} special={f.card.special} size="sm" /> : <Card back size="sm" />}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default function GameBoard({ state, lowQ, skillConfirmOn = true }) {
  // หยุดเวลา (ดิเอโก้ — state.timeFreeze): ไม่มีเพลงพื้นหลังเลย (ผู้ใช้สั่ง · เสียงนาฬิกาวนเอาออกแล้ว — ผู้ใช้: น่ารำคาญ) · เสียงการกระทำ/เอฟเฟกต์ยังดังตามปกติ
  const frozenBy = state?.timeFreeze?.by || null;
  useEffect(() => (frozenBy ? suspendMusic() : undefined), [frozenBy]);
  const [showChar, setShowChar] = useState(false);
  const [flash, setFlash] = useState(null); // สกิลช่วงจั่วการ์ด เด้งทันทีบนกระดาน
  const [notice, setNotice] = useState(null); // แปลงร่างซ้ำ (ครั้งที่ 2 เป็นต้นไป) เด้งแจ้งเตือนทันที ไม่หยุดเกม
  const [giftSel, setGiftSel] = useState(null);              // โอเบรอน (ฤดูร้อน): { tier, anyone } ที่กำลังรอจิ้มเป้าหมาย
  const [journeyInfoOpen, setJourneyInfoOpen] = useState(false);   // การเดินทาง: หน้าต่างอ่านผลของภูมิภาคปัจจุบัน
  // จอคอม (ระบบกระดาน): โหมดเลือกเป้า/ทิศบนกระดาน — { kind: "skill", tier }
  const [pickReq, setPickReq] = useState(null);
  // ปุ่ม "โจมตี" (ดีไซน์ใหม่): ศัตรูที่ตีถึงมาจาก BoardStage · กดแล้วเพิ่มเลข = BoardStage เปิดหน้าคาดการณ์ · fcOpen = ซ่อน HUD ทั้งหมด
  const [attackables, setAttackables] = useState([]);
  const [atkSignal, setAtkSignal] = useState(0);
  const [fcOpen, setFcOpen] = useState(false);
  // ---------- คิวฉากประกาศ ----------
  //  ฉากประกาศทุกอันกินจอเต็มใบ เดิมต่างคนต่างมีตัวตั้งเวลาของตัวเอง ไม่มีใครรู้จักกัน จึงทับกันได้
  //  ที่ชนบ่อยที่สุด: วงจรกลางวัน-กลางคืนสลับทุก 3 เทิร์น แล้วเด้งพร้อม "เริ่มจั่วการ์ด" ที่ต้นเทิร์นพอดี
  //  (ฉากกลางวัน-กลางคืนยาว 3.5 วิ ส่วนฉากจั่วการ์ด 2 วิ — ทับกันเต็มๆ ทุก 3 เทิร์น)
  //  และร้านค้าที่เด้งวินาทีที่ 2.7 ก็ทับหางของฉากกลางวัน-กลางคืนอีกต่อหนึ่ง
  //  รวมมาเข้าคิวเดียว เล่นทีละอันตามลำดับที่เข้ามา — แบนเนอร์เปลี่ยนเทิร์นผูกกับเฟส TRANSITION
  //  จึงไม่เข้าคิว แต่ "กั้นคิว" ไว้แทน ไม่มีฉากไหนเล่นทับมันได้
  const prevCycle = useRef(null);
  const [statusViewId, setStatusViewId] = useState(null); // ดูสถานะผู้เล่นคนอื่น (แตะการ์ดตอนไม่ได้เลือกเป้า)
  const [bagOpen, setBagOpen] = useState(false);     // ร้านค้ามายา (patch 2.2 full): เปิดดูคลังของตัวเอง
  const [shopId, setShopId] = useState(null); // ร้านที่เปิดดูอยู่ (state.shops[i].id) — null = ปิด
  const [colorPick, setColorPick] = useState(null); // ยาเปลี่ยนสีการ์ดช่วงจั่ว: { uid, card } — card = index การ์ดที่เลือก (null = ยังไม่เลือก)
  // นับครั้งการแสดง ไม่ใช่ true/false — ค่าต้องเปลี่ยนทุกครั้งที่เข้าช่วง ไม่งั้น React ไม่ remount
  // แล้วอนิเมชันจะเล่นแค่ครั้งแรกครั้งเดียวตลอดทั้งแมตช์
  const [sceneQ, setSceneQ] = useState([]);
  const sceneSeq = useRef(0);
  const prevPhaseRef = useRef(null);
  // ประกาศช่วงละครั้งต่อเทิร์น — phase กลับมาเป็น PLAYING/ATTACK ซ้ำได้หลายรอบในเทิร์นเดียว
  //  (เช่น จบคัตซีนท่าไม้ตาย)
  //  ถ้าไม่กันไว้ ฉากจะเด้งซ้อนกันทุกครั้งที่กลับเข้า phase เดิม
  const announced = useRef({ draw: 0, atk: 0 });
  const [eosSitOpen, setEosSitOpen] = useState(false); // สนาม Eos: แผงสถานการณ์ตอนนี้ (eos/EosSituation.jsx)
  const [eosGuideOpen, setEosGuideOpen] = useState(false); // สนาม Eos: คู่มือ (eos/EosGuide.jsx — ผู้ใช้สั่ง 2026-11-10)
  const [eosMapOpen, setEosMapOpen] = useState(false); // สนาม Eos: แผนที่ภาพรวม (eos/EosMap.jsx)
  const [deckOpen, setDeckOpen] = useState(false);   // สมุดการ์ดกองกลาง: กดที่กองการ์ดกลางเพื่อดู
  const [deckTab, setDeckTab] = useState(false);     // แถบกองการ์ดกลาง (จอคอม): หุบไว้เป็นค่าเริ่ม
  const shopSeen = useRef(new Set());                // ร้านที่ประกาศ "ปรากฏ" ไปแล้ว (id ร้าน — กันเด้งซ้ำ)
  const vp = useViewport();
  const { flights: cardFlights, removeFlight: removeCardFlight, deckRef, selfHandRef, registerOther } = useCardFlights(state);
  const phase = state.gameState;
  // ช่วงจั่วไพ่เริ่ม: หน้าต่างไม่ได้โฟกัส = ไอคอนแถบงานกระพริบ (attention.js)
  useEffect(() => { if (phase === "PLAYING") requestAttention(); }, [phase]);
  // อรชุน: ฉาก Mahapralaya (ArjunaUlt.jsx) · โหลดวีดีโอ/รูปหมากล่วงหน้าเมื่อมีอรชุนในเกม
  const arjunaRun = state.arjunaUlt ? {
    seq: state.arjunaUlt.seq, hits: state.arjunaUlt.hits, recall: state.arjunaUlt.recall || null,
    targets: (state.arjunaUlt.targets || []).slice(0, 6).map((id) => { const u = state.players.find((q) => q.id === id); return { id, img: u && !u.masked ? u.img : null, color: u ? u.color : null }; }),
  } : null;
  const arjunaInGame = state.players.some((q) => q.character && q.character.id === "arjuna");
  useEffect(() => { if (arjunaInGame) preloadArjunaUlt(state.players.map((q) => ({ img: q.img }))); }, [arjunaInGame]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- ตัวขับคิวฉากประกาศ ----------
  //  ฉากถัดไปเริ่มนับเวลาก็ต่อเมื่อฉากก่อนหน้าเล่นจบแล้วเท่านั้น
  //  TRANSITION = ช่วงของแบนเนอร์เปลี่ยนเทิร์น · CUTSCENE = วีดีโอเต็มจอ — ทั้งคู่กั้นคิวไว้ก่อน
  const scene = sceneQ[0] || null;
  // ป้ายอื่นนอกคิว (ป้ายเข้าพื้นที่ Eos) ขึ้นอยู่ = ป้ายร้านค้ารอก่อน ไม่ขึ้นซ้อน (ui/noticeBus.js)
  const [otherNotice, setOtherNotice] = useState(() => noticeBusy("shop"));
  useEffect(() => onNotice(() => setOtherNotice(noticeBusy("shop"))), []);
  const sceneBlocked = phase === "TRANSITION" || phase === "CUTSCENE" || (scene?.kind === "shop" && otherNotice);
  const shopShowing = scene?.kind === "shop" && !sceneBlocked;
  useEffect(() => { if (shopShowing) { beginNotice("shop"); return () => endNotice("shop"); } return undefined; }, [shopShowing]);
  const pushScene = useCallback((kind, data) => {
    sceneSeq.current += 1;
    const entry = { kind, data, id: sceneSeq.current };
    // ฉากจั่วการ์ดกับฉากโจมตีเป็นประกาศของคนละช่วงในเทิร์นเดียวกัน ประกาศใหม่มาแล้วอันเก่าหมดความหมาย
    const drops = kind === "draw" ? "atk" : kind === "atk" ? "draw" : null;
    setSceneQ((q) => [...(drops ? q.filter((x, i) => i === 0 || x.kind !== drops) : q), entry]);
  }, []);
  useEffect(() => {
    if (!scene || sceneBlocked) return undefined;
    const t = setTimeout(() => setSceneQ((q) => q.slice(1)), SCENE_MS[scene.kind] || 2000);
    return () => clearTimeout(t);
  }, [scene, sceneBlocked]);
  // ระบบคู่ (เคท & เอมิลิโกะ): hand = ระเบียนผู้เล่น (ไพ่/แต้ม/จั่ว) · me = ตัวที่คุมอยู่ (controlId — แผงตัวเรา/สกิล/ระยะเดิน)
  //  ตัวละครทั่วไป controlId = youId → hand กับ me เป็นตัวเดียวกัน
  const hand = state.players.find((p) => p.id === state.youId);
  const me = (state.controlId && state.players.find((p) => p.id === state.controlId)) || hand;
  const roster = rosterOf(state.players); // ผู้เล่นจริง (ตัดตัวที่สองของระบบคู่)
  const duoUnits = hand && hand.duoWith ? unitsOfSide(hand, state.players) : null;
  const handAlive = !!hand && sideAlive(hand, state.players);
  const others = roster.filter((p) => p.id !== state.youId);
  const arenaJourney = state.journey;
  const seatOthers = others;
  const iAmAttacker = phase === "ATTACK" && state.attackerId === state.youId;
  const attacker = state.players.find((p) => p.id === state.attackerId);
  const rankedTiers = rankTiers(rosterAlive(state.players));
  const summaryWinners = rankedTiers[0]?.players || [];
  const summaryLosers = rankedTiers.slice(1).flatMap((t) => t.players);
  const done = hand && (hand.locked || !handAlive);
  // ---------- ไอเทมช่วงจั่ว (ยาโชคลาภ · ยาเปลี่ยนสีการ์ด · กรรไกรตัดไพ่) — เปิดกระเป๋าใช้ได้ก่อนกด "พอ" (ผู้ใช้สั่ง 2026-11-08) ----------
  const drawOpen = phase === "PLAYING" && handAlive && !done;
  const handNumberCards = Array.isArray(hand?.cards) && hand.cards.some((c) => !c.special);
  const drawBag = drawOpen ? { fortuneFull: (hand.statuses?.fortune || 0) >= 3, hasNumber: handNumberCards, cardCount: (hand.cards || []).length } : null;
  // ใช้ไอเทมช่วงจั่วจากกระเป๋า: ยาเปลี่ยนสี = ปิดกระเป๋าแล้วเลือกไพ่ → สีบนมือ · อย่างอื่นส่งทันที
  const useDrawFromBag = (it) => {
    if (it.type === "cardColor") { setBagOpen(false); setColorPick({ uid: it.uid, card: null }); return; }
    setColorPick(null);
    socket.emit("useDrawItem", { uid: it.uid });
  };
  const pickLive = !!colorPick && drawOpen && (hand?.inventory || []).some((it) => it.uid === colorPick.uid);
  // ปุ่มกระเป๋า: มีของที่กดใช้ได้ตอนนี้ = แสงเต้น (ช่วงจั่ว: ไอเทมช่วงจั่ว · ตาเดิน: วงจรพลังงานที่ถอนได้ — คิดต่อด้านล่างหลังรู้ myTurn)
  const drawHot = !!drawBag && (hand?.inventory || []).some((it) => DRAW_ITEM_TYPES.includes(it.type)
    && (it.type === "fortune" ? !drawBag.fortuneFull : it.type === "cardColor" ? drawBag.hasNumber : drawBag.cardCount > 0));
  useEffect(() => { if (colorPick && !pickLive) setColorPick(null); }, [colorPick, pickLive]);
  useEffect(() => {
    if (!colorPick) return undefined;
    const on = (e) => { if (e.key === "Escape") setColorPick(null); };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [colorPick]);
  const ch = me?.character;
  const meStatuses = me ? statusEntries(me) : []; // รายการสถานะของตัวเอง — ใช้ในกล่อง "สถานะ" ของแผง HUD (เรียงลงล่างเรื่อยๆ ตามลำดับที่ติด)
  // ---------- ระบบกระดาน (GRID_PLAN.md): ตาเดินของเรา · ร้านบนแผนที่ · กระเป๋า ----------
  const myTurn = !!me && me.alive && phase === "ACTION" && state.actorId === me.id && !!state.action;
  const mashClock = useCallback(() => socket.emit("clockMash"), []); // Clock Up ชนกัน: กดรัว
  // เอมิลิโกะเดินต่อหลังจบตา: ได้แค่เดิน/ย้อน/รอ (+ กระจกเงา)
  const canto = myTurn && !!state.action.canto;
  // ปุ่มสกิลที่กดได้ระหว่างเดินต่อ (ตรงกับฮุค cantoSkill ฝั่ง server): พื้นฐาน · เอมิลิโกะ สลับอาวุธ (ตีแจกันแล้วถือไม้ถูพื้นไถลชนต่อ)
  const cantoTier = (tier) => (tier === "basic" && !me?.celine) || (tier === "secondary" && me?.character?.id === "emiliko");
  const teamMode = state.gameMode === "duo" || state.gameMode === "trio" || state.gameMode === "eos"; // eos = PVE ทุกคนทีมเดียว
  // ยืนติดร้าน (ระยะ 1) — ตัวใหญ่ (Echo / ร่างใหญ่ของไรโด ฮิคารุ) นับจากขอบตัวทุกช่อง ตรงกับ server Board.nearShop(boxOf)
  const boxOfP = (p) => ({ x: p.pos.x, y: p.pos.y, size: p.size || 1 }); // ตัวใหญ่ = กล่อง (ระยะนับจากขอบตัว)
  //  ร้านบนกระดาน = state.shops (สูงสุด 3 ร้าน 2×2 · Colony = แคปซูล 1 ช่อง) — ติดร้านไหนก็เปิดร้านนั้น
  const shopList = Array.isArray(state.shops) ? state.shops.filter((sh) => sh && Number.isFinite(sh.x) && Number.isFinite(sh.y)) : [];
  const nearShops = me?.pos ? shopList.filter((sh) => Rules.nearShop(boxOfP(me), sh)) : [];
  const bagFull = (me?.inventory || []).filter((it) => it && it.type !== "kebread").length >= (me?.bagSlots || state.bagSlots || 5);
  const openShop = shopId ? shopList.find((sh) => sh.id === shopId) || null : null; // ข้อมูลสดของร้านที่เปิดอยู่ (ร้านหายไป = ปิดเอง)
  // Gate of Babylon (me.remoteShop — กิลกาเมช): ซื้อจากร้านไหนก็ได้บนแผนที่ ไม่ต้องยืนติด
  const shopBlock = !myTurn || canto ? "ไม่ใช่ตาของคุณ" : !openShop || (!nearShops.includes(openShop) && !me?.remoteShop) ? "ต้องอยู่ติดร้าน" : bagFull ? "กระเป๋าเต็ม" : null;
  const viewShop = (sh) => { if (!sh) return; clickSound(); socket.emit("viewShop", { shopId: sh.id }); setShopId(sh.id); };
  // ป้ายระยะบนปุ่มสกิล (GRID_PLAN §7.2)
  //  target รูปเฉพาะ (area.cells — ไม่มี range) = ไม่มีป้ายระยะ
  const areaText = (a) => !a ? "" : a.kind === "target" ? (a.range != null ? `ระยะ ${a.range}` : "") : a.kind === "aoe" ? `รอบตัว ${a.range}`
    : a.kind === "line" ? (a.arc ? `ครึ่งวง ${a.arc}` : `ทิศทาง ${a.len}×${a.width}`) : a.kind === "tile" ? (a.band ? `แถบ ${a.band}` : a.range >= 26 ? "ทั้งสนาม" : `ระยะ ${a.range}`) : a.kind === "field" ? "ทั้งสนาม" : "";
  // ชั้นมิติ (วาเลนไทน์ · GRID_PLAN §7.13): คนคนละชั้นกับตัวที่คุม = ไม่นับเป็นเป้า/คนในระยะ
  const sameDim = (p) => !!p && (p.dim || null) === (me?.dim || null);
  // สกิลเลือกเป้าที่ไม่มีใครอยู่ในระยะ = กดไม่ได้ (เลือกตัวเองได้ = มีเป้าเสมอ)
  //  area.cells = ช่องตามรูปนับจากช่องของเรา: ต้องมีศัตรูยืนบนช่องนั้น
  const onCells = (p, cells) => cells.some(([dx, dy]) => Rules.covers(boxOfP(p), me.pos.x + dx, me.pos.y + dy));
  const noTargetInRange = (a) => !!a && a.kind === "target" && !a.self && !!me?.pos
    && !state.players.some((p) => p.alive && p.pos && p.id !== me.id && sameDim(p)
      && (Array.isArray(a.cells) && a.cells.length ? enemyOf(p) && onCells(p, a.cells) : Rules.dist(boxOfP(p), boxOfP(me)) <= (a.range || 0)));
  // ยูนะ: มีคนที่ขี่ได้อยู่ติดกันไหม (ตัวเล็ก 1×1 · ไม่ได้ขี่/ถูกขี่อยู่) — ไม่มี = ไม่แสดงปุ่ม "ขี่" (ผู้ใช้สั่ง 2026-10-19)
  const rideNear = !!me?.yuna?.canRide && !!me.pos && (state.players || []).some((p) => p.alive && p.pos && p.id !== me.id && !p.ride && !p.summon && sameDim(p)
    && (p.size || 1) <= 1 && !(state.players || []).some((o) => o.alive && o.ride === p.id)
    && Math.abs(p.pos.x - me.pos.x) + Math.abs(p.pos.y - me.pos.y) === 1);
  // ตัวที่เหมือนกัน (summon double) = ฝ่ายกลาง: ทุกคนในชั้นเดียวกันตีได้
  const enemyOf = (p) => !!me && p.id !== me.id && sameDim(p)
    && (p.summon?.kind === "double" || (!sameSide(p, me) && !(teamMode && me.teamId && p.teamId === me.teamId)));
  // เข้าช่วงโจมตี -> ฉากประกาศ "เริ่มโจมตีได้" + เสียงเปลี่ยนช่วง (ไม่บังการกดเลือกเป้า)
  useEffect(() => {
    if (phase !== "ATTACK") return;
    if (announced.current.atk === state.roundNumber) return;
    announced.current.atk = state.roundNumber;
    playSfx("change_cutscene");
    pushScene("atk");
  }, [phase, state.roundNumber, pushScene]);
  // ฉากบอกจำนวนเทิร์น -> เสียงเปลี่ยนช่วงเดียวกัน
  useEffect(() => {
    if (phase !== "TRANSITION") return;
    playSfx("change_cutscene");
  }, [phase, state.roundNumber]);
  // เข้าช่วงจั่วการ์ด -> ฉากประกาศ "เริ่มจั่วการ์ด"
  //  ถ้าเพิ่งผ่านแบนเนอร์เปลี่ยนเทิร์นมา ไม่เล่นเสียงซ้ำ (แบนเนอร์ประกาศเสียงไปแล้ว)
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;
    if (phase !== "PLAYING") return;
    if (announced.current.draw === state.roundNumber) return;
    announced.current.draw = state.roundNumber;
    // แบนเนอร์เปลี่ยนเทิร์นเพิ่งประกาศเสียงไป ไม่ต้องซ้ำอีกครั้ง
    if (prev !== "TRANSITION") playSfx("change_cutscene");
    pushScene("draw");
  }, [phase, state.roundNumber, pushScene]);
  // ร้านปรากฏ: ประกาศชื่อร้านใหม่ที่เพิ่งตั้งบนกระดาน (หลายร้านพร้อมกัน = ประกาศครั้งเดียว ชื่อต่อกัน)
  const shopIdsSig = shopList.map((sh) => `${sh.id ?? `${sh.kind}@${sh.x},${sh.y}`}|${sh.kind || ""}|${sh.name || ""}`).join("~");
  useEffect(() => {
    if (!shopIdsSig) return;
    const fresh = [];
    for (const part of shopIdsSig.split("~")) {
      const [id, kind, name] = part.split("|");
      if (shopSeen.current.has(id)) continue;
      shopSeen.current.add(id);
      fresh.push(name || shopName(kind));
    }
    if (fresh.length) pushScene("shop", { name: [...new Set(fresh)].join(" · ") }); // คิวจัดลำดับให้ต่อท้ายฉากต้นเทิร์นเอง
  }, [shopIdsSig, pushScene]);
  // ผู้เล่นที่กำลังเปิดดูสถานะ (ข้อมูลสดจาก state ทุกครั้งที่ re-render)
  const statusView = statusViewId ? state.players.find((x) => x.id === statusViewId) : null;
  // กลางวัน/กลางคืน (patch 1.7): สลับทุก 3 เทิร์น — โอเบรอนสลับร่าง/ท่าไม้ตายตามช่วงเวลา
  const nightNow = state.cycle === "night";
  // ห้ามจั่วการ์ดเพิ่มเทิร์นนี้
  const noDraw = !!(me && me.statuses?.nodraw);
  // ห้ามใช้สกิลเทิร์นนี้
  const noSkill = !!(me && (me.statuses?.noskill || me.stageNoSkill)); // stageNoSkill = สนาม Eos: อยู่ในรถ
  const isMuimi = ch?.id === "muimi"; // เสบียงฉุกเฉินไม่นับเป็นการใช้สกิลหลักของเทิร์น
  const basicFree = isMuimi; // สกิลพื้นฐานที่กดได้แม้ใช้โควตาเทิร์นแล้ว (เสบียงฉุกเฉิน) — ตัวอื่นมาจาก skillLocks.basic.free
  const muimiUltCd = isMuimi ? (me?.muimiUltCd || 0) : 0;
  // โอเบรอน (ฤดูร้อน): server ส่งล็อก/คูลดาวน์รายช่องมาเป็นก้อนกลาง (skillLocks)
  const giftLocks = me?.skillLocks || {};
  const giftCd = (t) => (giftLocks[t] && giftLocks[t].cd) || 0;
  const giftLocked = (t) => !!(giftLocks[t] && (giftLocks[t].locked || giftLocks[t].cd > 0));
  // free = ช่องนี้ไม่กินโควตา 1 สกิล/เทิร์น — skillUsed แล้วยังกดได้
  const giftFree = (t) => !!(giftLocks[t] && giftLocks[t].free);
  const muimiBasicLocked = isMuimi && ((me?.muimiEmergencyUses || 0) <= 0 || !!me?.muimiEmergencyUsed);
  const muimiUltLocked = isMuimi && ((me?.statuses?.muimiRusty || 0) > 0 || (me?.statuses?.muimiTower || 0) > 0 || muimiUltCd > 0);

  // สกิลช่วงจั่วการ์ด: server แจ้งมา -> เด้งทันที (ไม่ตัดเข้าจอดำ) แล้วหายเอง
  //  บั๊กเดิม: ป้ายนี้มีช่องเดียวใช้ร่วมกันทั้งเกม ถ้ามีสกิลใหม่ (ของใครก็ได้) เด้งเข้ามาถี่กว่า 1.8 วิ
  //  ตัวจับเวลาจะรีเซ็ตใหม่ทุกครั้งไม่มีที่สิ้นสุด ทำให้ป้ายค้างอยู่นานผิดปกติทั้งที่สกิลแต่ละอันจบไปนานแล้ว
  //  แก้โดยจับเวลาเริ่มของ "ชุดป้ายที่ต่อเนื่องกัน" (flashStartRef) ไว้ครั้งเดียวตอนป้ายว่างแล้วเพิ่งมีอันใหม่ขึ้น
  //  แล้วบังคับหายภายใน FLASH_MAX_MS จากจุดนั้นเสมอ ไม่ว่าจะมีสกิลใหม่มาต่อคิวรีเฟรชเนื้อหากี่รอบก็ตาม
  const FLASH_MAX_MS = 1800;
  const flashRef = useRef(null);
  const flashStartRef = useRef(0);
  useEffect(() => { flashRef.current = flash; }, [flash]);
  const noticeRef = useRef(null);
  const noticeStartRef = useRef(0);
  useEffect(() => { noticeRef.current = notice; }, [notice]);
  useEffect(() => {
    const onFlash = (f) => {
      if (!flashRef.current) flashStartRef.current = Date.now();
      setFlash({ ...f, id: Date.now() });
      if (f.sound) playSfx(f.sound); // เสียงเฉพาะสกิล (ถ้ามี)
    };
    socket.on("skillFlash", onFlash);
    return () => socket.off("skillFlash", onFlash);
  }, []);
  useEffect(() => {
    if (!flash) return;
    const remain = Math.max(150, FLASH_MAX_MS - (Date.now() - flashStartRef.current));
    const t = setTimeout(() => setFlash(null), remain);
    return () => clearTimeout(t);
  }, [flash]);
  useEffect(() => {
    const onNotice = (n) => {
      if (!noticeRef.current) noticeStartRef.current = Date.now();
      setNotice({ ...n, id: Date.now() });
    };
    socket.on("transformNotice", onNotice);
    return () => socket.off("transformNotice", onNotice);
  }, []);
  // ปุ่มลัดคีย์บอร์ด (ผู้ใช้สั่ง 2026-11-09): กดปุ่มบนจอที่มี data-hotkey ตรงกัน — กดไม่ได้ (disabled/ซ่อน) = ไม่ทำอะไร
  //  1/2/3 = สกิล · F = โจมตี / จั่ว · Enter = จบตา / พอ · Z = ย้อน · B = กระเป๋า (ใช้ตำแหน่งปุ่ม e.code — แป้นโหมดไทยก็ใช้ได้)
  //  มีหน้าต่าง/ฉากบังปุ่มอยู่ = ไม่กด · กำลังพิมพ์/โฟกัสอยู่บนปุ่ม (Enter) = ปล่อยให้เบราว์เซอร์จัดการเอง
  useEffect(() => {
    const KEY = { Digit1: "1", Numpad1: "1", Digit2: "2", Numpad2: "2", Digit3: "3", Numpad3: "3", KeyF: "F", KeyZ: "Z", KeyB: "B", Enter: "Enter", NumpadEnter: "Enter" };
    const onKey = (e) => {
      const hk = KEY[e.code];
      if (!hk || e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      const el = document.activeElement;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      // Enter บนปุ่มที่โฟกัสด้วยคีย์บอร์ด (Tab) = กดปุ่มนั้นตามปกติ · โฟกัสค้างจากการคลิกเมาส์ = ใช้เป็นปุ่มลัด (ไม่กดปุ่มที่คลิกไปล่าสุดซ้ำ)
      const onCtl = hk === "Enter" && el && el.closest && el.closest("button, a[href], [role='button']");
      if (onCtl && el.matches(":focus-visible")) return;
      const modal = Array.from(document.querySelectorAll("[aria-modal='true']")).pop() || null;
      // ปุ่มต้องมองเห็นและไม่มีหน้าต่างอื่นบังอยู่ (ทดสอบจุดกลางปุ่ม — ฉากซ้อน/หน้าต่างเลือกท่า/กระเป๋า/ร้าน บัง = ไม่กด)
      const onTop = (b) => {
        const r = b.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) return false;
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return !!hit && b.contains(hit);
      };
      const btn = Array.from(document.querySelectorAll(`[data-hotkey="${hk}"]`))
        .find((b) => !b.disabled && b.getAttribute("aria-disabled") !== "true" && (!modal || modal.contains(b)) && onTop(b));
      if (onCtl) { e.preventDefault(); el.blur(); }
      if (!btn) return;
      e.preventDefault();
      btn.click();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  // เสียงสั้นๆ จาก server ที่ทุกคนได้ยิน (ไม่มีป้าย)
  //  f.voice = เสียงพากย์ของผู้เล่นคนนั้น (server/voice.js) — ตัดประโยคเก่าของคนเดียวกันก่อนพูดประโยคใหม่ (ไม่พูดซ้อนกัน)
  useEffect(() => {
    const voices = new Map();
    const onSfx = (f) => {
      if (!f?.sound) return;
      if (!f.voice) { playSfx(f.sound); return; }
      const prev = voices.get(f.voice);
      if (prev) stopSfx(prev.a, prev.id);
      const a = playSfx(f.sound, { voice: true });
      if (a) voices.set(f.voice, { a, id: sfxPlayId(a) });
    };
    socket.on("sfx", onSfx);
    return () => socket.off("sfx", onSfx);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const remain = Math.max(150, FLASH_MAX_MS - (Date.now() - noticeStartRef.current));
    const t = setTimeout(() => setNotice(null), remain);
    return () => clearTimeout(t);
  }, [notice]);

  const skill = (tier) => {
    clickSound();
    // จอคอม (ระบบกระดาน): สกิลที่มีระยะ → เลือกเป้า/ทิศบนกระดานก่อน · self → ใช้ทันที (GRID_PLAN §7.2)
    if (vp.w >= 768) {
      // ปุ่มที่ "ทำงานอยู่" (skillPub active — วาเลนไทน์ในมิติหลบสายตา: กด = ออก) ใช้ทันที ไม่เลือกเป้า
      if (ch?.[tier]?.active) { socket.emit("useSkill", { tier }); return; }
      const kind = ch?.[tier]?.area?.kind || "self";
      if (kind === "target" || kind === "aoe" || kind === "line" || kind === "tile") { setPickReq({ kind: "skill", tier }); return; }
      socket.emit("useSkill", { tier });
      return;
    }
    // โอเบรอน (ฤดูร้อน) สกิลรอง/ท่าไม้ตาย: เข้าโหมดเลือกเป้าหมายกลาง (เลือกตัวเองได้)
    if (ch?.id === "oberon_summer" && (tier === "secondary" || tier === "ultimate")) { setGiftSel({ tier, anyone: true, name: ch[tier]?.name }); return; }
    socket.emit("useSkill", { tier });
  };
  // ป๊อปอัปยืนยันก่อนใช้สกิล (patch UX): กดช่องสกิล -> ถามยืนยันก่อนเสมอ ค่อยเรียก skill(tier) จริงตอนกด "ใช้งาน"
  //  เก็บข้อมูลสกิล/ลำดับ/แต้มที่ใช้จริง (หลังหักส่วนลด) ไว้โชว์ในป๊อปอัป — ยกเลิกแล้วไม่มีอะไรเกิดขึ้น
  const [skillConfirm, setSkillConfirm] = useState(null); // { tier, skillData, label, useCost }
  const [hkForms, setHkForms] = useState(false); // ไรโด ฮิคารุ: ตัวเลือกร่าง UltraLive เปิดอยู่
  if (hkForms && !myTurn) setHkForms(false); // หมดตาเรา = ปิดตัวเลือกร่าง
  // ปุ่มสกิลแบบหลายตัวเลือก (skill.choices — เคท/เอมิลิโกะ): tier ที่ตัวเลือกเปิดอยู่ · หมดตา/สลับตัว = ปิด
  const [choiceOpen, setChoiceOpen] = useState(null); // { tier, unit }
  // เคนซากิ คาซุมะ: แผงการ์ด Blay Rouzer (ช่องสกิลรองเฉพาะตัว) · หมดตา/คืนร่าง = ปิด
  const [kzOpen, setKzOpen] = useState(false);
  if (kzOpen && (!myTurn || canto || !me?.kazuma?.blade)) setKzOpen(false);
  // ฉากใส่การ์ด Evolution (Rouze Absorber) · หมดตา/เข้าร่างแล้ว = ปิด
  const [kzEvolve, setKzEvolve] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false); // อินุอิ: Faiz Phone กางอยู่
  if (phoneOpen && (!myTurn || canto || !me?.inui?.opened)) setPhoneOpen(false);
  if (kzEvolve && (!myTurn || canto || !me?.kazuma?.canEvolve)) setKzEvolve(false);
  if (choiceOpen && (!myTurn || (canto && !cantoTier(choiceOpen.tier)) || choiceOpen.unit !== me?.id || !ch?.[choiceOpen.tier]?.choices)) setChoiceOpen(null);
  // ตัวเลือกที่ไม่กินโควตา 1 สกิล/เทิร์น (server: ราคา 0 = สลับอาวุธ/ดาบเขม่า) — choice.free ทับได้ถ้า server ส่งมา
  const choiceFree = (c) => (c.free != null ? !!c.free : (c.cost || 0) === 0);
  // เลือกตัวเลือกแล้ว: self = ใช้ทันที · มีระยะ = เข้าโหมดเลือกเป้า/ทิศบนกระดานตามพื้นที่ของตัวเลือก
  const pickChoice = (tier, c) => {
    setChoiceOpen(null);
    const a = c.area || { kind: "self" };
    if (a.kind === "target" || a.kind === "aoe" || a.kind === "line" || a.kind === "tile") { setPickReq({ kind: "skill", tier, form: c.key, area: a, name: c.name }); return; }
    socket.emit("useSkill", { tier, form: c.key });
  };
  //  ถ้าผู้เล่นปิด "ยืนยันสกิล" จากหน้าโต๊ะรวมผู้เล่น -> ข้ามป๊อปอัป ใช้สกิลทันทีที่กดช่อง
  // คิงโอเจอร์ (players[].ohger — characters/_ohger.js): ลูปเสียงระหว่างกดแกนดาบของคนที่กำลังเดิน (ทุกคนได้ยิน)
  //  loop = ลูปแปลงร่างตามสี เปลี่ยนตามขั้นที่กด · charge = รอดึงคันโยก เปลี่ยนตามจำนวนที่ดึง · standby = เลือกทิศ · เสียงกด/ดึงดังเมื่อไร ลูปหลบ (audio.js LOOP_YIELD)
  const ohgerActor = phase === "ACTION" ? (state.players || []).find((p) => p.id === state.actorId && p.ohger) : null;
  const ohgerLoop = ohgerActor && ohgerActor.ohger.phase
    ? ({ loop: `ohger_tf_wait_${ohgerActor.ohger.own}_${ohgerActor.ohger.step || 0}`, charge: `ohger_charge_loop_${ohgerActor.ohger.pulls || 0}`, standby: "ohger_standby_loop" })[ohgerActor.ohger.phase] || null
    : null;
  // อินุอิ Start Up: เสียง axel_startUp_soundeffect เริ่มพร้อมเพลงตอนนับ 10 วิ (ทุกคนได้ยิน) · พักพร้อมนาฬิกา (ฉากตี/คลิป)
  const inuiUp = (state.players || []).some((p) => p.inui?.startUp?.running);
  const clockWorld = !!state.clockUp && !state.clockUp.paused; // ช่วง Clock Up (server/clockUp.js) — ตัวหยุดเวลาแทรก = ปิด
  const faizClock = state.clockUp ? state.clockUp.members.find((m) => m.kind === "faiz" && !m.over) : null;
  const alterWorld = clockWorld && state.clockUp.members.some((m) => m.kind === "alter" && !m.over); // เอมิยะ คริซุงุ Time Alter: จอโทนส้ม
  const inuiUpRef = useRef(false);
  useEffect(() => {
    if (inuiUp && !inuiUpRef.current) { inuiUpRef.current = true; startLoopSfx("inui_startup"); }
    else if (!inuiUp && inuiUpRef.current) { inuiUpRef.current = false; stopLoopSfx(); return; }
    if (inuiUp) { if (phase === "ACTION") resumeLoopSfx(); else pauseLoopSfx(); } // เดินตามนาฬิกา 10 วิ: ฉากตี/คลิปพักทั้งคู่
  }, [inuiUp, phase]);
  // เอมิยะ คริซุงุ Time Alter: เสียงหัวใจเต้นวนตลอดช่วง (ผู้ใช้สั่ง 2026-11-11 · Mixkit "Fast Heartbeat") · คลิปเล่น = พัก (ห้ามซ้อนวีดีโอ) · Start Up ของอินุอิมาก่อน
  const alterBeat = alterWorld && !inuiUp;
  const alterBeatRef = useRef(false);
  useEffect(() => {
    if (alterBeat && !alterBeatRef.current) { alterBeatRef.current = true; startLoopSfx("kiri_heart"); }
    else if (!alterBeat && alterBeatRef.current) { alterBeatRef.current = false; stopLoopSfx(); return; }
    if (alterBeat) { if (phase === "CUTSCENE") pauseLoopSfx(); else resumeLoopSfx(); }
  }, [alterBeat, phase]);
  useEffect(() => () => { if (alterBeatRef.current) stopLoopSfx(); }, []);
  // เฟรดดี้ (กลางวัน): ผู้ชมอยู่ใกล้ = เพลงวนจนออกห่าง (state.freddyNear — per-viewer) · ไม่ทับลูปของคนอื่น
  //  มินิเกมประตู / คลิป = ไม่มีเพลงนี้
  const freddyLoop = inuiUp || alterBeat || ohgerLoop || phase === "CUTSCENE" || state.freddyDoor ? null : state.freddyNear ? "freddy_music" : null;
  const freddyLoopRef = useRef(null);
  useEffect(() => {
    if (freddyLoopRef.current === freddyLoop) return;
    if (freddyLoopRef.current) stopLoopSfx();
    freddyLoopRef.current = freddyLoop;
    if (freddyLoop) startLoopSfx(freddyLoop);
  }, [freddyLoop]);
  useEffect(() => () => { if (freddyLoopRef.current) stopLoopSfx(); }, []);
  const ohgerLoopRef = useRef(null);
  useEffect(() => {
    if (ohgerLoopRef.current === ohgerLoop) return;
    if (ohgerLoopRef.current) stopLoopSfx();
    ohgerLoopRef.current = ohgerLoop;
    if (ohgerLoop) startLoopSfx(ohgerLoop);
  }, [ohgerLoop]);
  useEffect(() => () => { if (ohgerLoopRef.current) stopLoopSfx(); }, []);
  // stand by (ดึงครบ 3 ครั้ง) = เข้าโหมดเลือกทิศทันที · ออกจากโหมด (Esc / คลิกขวา) = ยกเลิก Finish (กดไกซ้ำ)
  const ohgerStandby = myTurn && !canto && me?.ohger?.phase === "standby";
  const ohgerExit = useRef(false);
  useEffect(() => {
    if (!ohgerStandby) { ohgerExit.current = false; return; }
    if (!pickReq && !ohgerExit.current) setPickReq({ kind: "ohger" });
  }, [ohgerStandby, pickReq]);
  const requestSkillUse = (tier, skillData, label, useCost) => {
    // ไรโด ฮิคารุ UltraLive: เลือกร่างจากตัวเลือก 7 ปุ่ม (การเลือกร่าง = การยืนยัน)
    if (me?.hikaru && tier === "basic" && vp.w >= 768) { clickSound(); setHkForms(true); return; }
    // อินุอิ ทาคุมิ: Faiz Phone แผงกดรหัส (เปิดกระเป๋าแล้ว)
    if (me?.inui?.opened && tier === "basic" && vp.w >= 768) { clickSound(); setPhoneOpen(true); return; }
    // เคนซากิ คาซุมะ: เปิดแผงการ์ด Blay Rouzer — เสียงเปิดแผงทุกครั้ง (เฉพาะคนกด · ผู้ใช้สั่ง 2026-10-25)
    if (me?.kazuma && tier === "secondary" && vp.w >= 768) { playSfx("kazuma_open"); setKzOpen(true); return; }
    // ปุ่มหลายตัวเลือก: เปิดตัวเลือก (การเลือก = การยืนยัน)
    if (ch?.[tier]?.choices && vp.w >= 768) { clickSound(); setChoiceOpen({ tier, unit: me?.id }); return; }
    // ระบบคู่: กระจกเงา (สลับตัว · 0 แต้ม) ไม่ต้องยืนยัน — ตื่นขึ้นอีกครั้ง (มีราคา) ยังถามตามการตั้งค่า
    const quickSwitch = tier === "basic" && (me?.duoWith || me?.duoOf) && !ch?.basic?.cost;
    // ปุ่มที่ทำงานอยู่ (กด = ออก · 0 แต้ม) ไม่ต้องยืนยัน
    if (!skillConfirmOn || quickSwitch || ch?.[tier]?.active) { skill(tier); return; }
    setSkillConfirm({ tier, skillData, label, useCost });
  };
  const cancelSkillConfirm = () => { clickSound(); setSkillConfirm(null); };
  const confirmSkillUse = () => {
    if (!skillConfirm) return;
    const t = skillConfirm.tier;
    setSkillConfirm(null);
    skill(t);
  };
  // หมดตาเรา / ของถูกใช้ไปแล้ว = ออกจากโหมดเลือกเป้า
  useEffect(() => {
    if (!pickReq) return;
    const gone = (pickReq.kind === "action" && !(me?.actions || []).some((x) => x.key === pickReq.key && !x.disabled && Array.isArray(x.tiles) && x.tiles.length));
    if (!myTurn || canto || gone) setPickReq(null);
  }, [pickReq, myTurn, canto, me?.actions]);
  // โหมดเลือกเป้าที่ส่งให้ BoardStage
  let boardPick = null;
  if (pickReq && me) {
    const done = () => setPickReq(null);
    if (pickReq.kind === "skill") {
      const s = ch?.[pickReq.tier];
      // ตัวเลือกของปุ่มหลายตัวเลือก: พื้นที่/ชื่อของตัวเลือก + ส่ง form ไปด้วย
      const a = pickReq.area || s?.area || {};
      const label = `${pickReq.name || s?.name || ""} · ${areaText(a)}`;
      const tier = pickReq.tier;
      const f = pickReq.form ? { form: pickReq.form } : {};
      // area.cells (วาเลนไทน์ "รู้จักตัวเองอย่างแท้จริง") = เลือกศัตรูที่ยืนบนช่องตามรูป
      const cells = Array.isArray(a.cells) && a.cells.length ? a.cells : null;
      // area.count (เซลิน: จับคู่สลับ 2 คน) = เลือกให้ครบก่อนส่ง (onPick ได้ array) · เซลินสลับ/จับคู่ = ไม่ใช่ตัวเอง ไม่ใช่ตัว 2×2 ขึ้นไป
      const count = Math.max(1, a.count | 0);
      const small = ch?.id === "celine" && (pickReq.form === "swap" || pickReq.form === "pair") ? { allow: (p) => p.id !== me.id && (p.size || 1) <= 1 } : {};
      if (a.kind === "target") boardPick = { kind: "target", range: [1, a.range || 0], self: !!a.self, count, ...(cells ? { cells, allow: enemyOf } : {}), ...small, label, onPick: (id) => { socket.emit("useSkill", { tier, targets: Array.isArray(id) ? id : [id], ...f }); done(); }, onCancel: done };
      else if (a.kind === "aoe") boardPick = { kind: "aoe", radius: a.range || 0, label, onConfirm: () => { socket.emit("useSkill", { tier, ...f }); done(); }, onCancel: done };
      else if (a.kind === "line") boardPick = { kind: "line", len: a.len || 1, width: a.width || 1, arc: a.arc || 0, label, onPick: (dir) => { socket.emit("useSkill", { tier, dir, ...f }); done(); }, onCancel: done };
      // เลือกช่องบนกระดาน (Ice Spike — วางน้ำแข็ง/หนาม/คุก) · dir = ทิศผลักเฉพาะวางหนามทับคน
      //  orient = แนวกำแพงน้ำแข็งของเซลิน (place "wall" · "h" | "v")
      //  place "list" = ช่องที่เลือกได้มาจาก server (area.tiles มุมบนซ้าย · foot = ขนาดกรอบ — กล่องของลาพลัส 2×2)
      //  place "list" + count (ลอว์: Shambles / Shamble เลือก 2 อย่าง) = เลือกครบแล้วส่ง tiles ทีเดียว
      else if (a.kind === "tile") boardPick = { kind: "tile", range: a.range || 0, place: a.place || "any", square: a.square || 0, rect: a.rect || null, band: a.band || 0, ...(a.place === "list" ? { tiles: Array.isArray(a.tiles) ? a.tiles : [], foot: Math.max(1, a.foot | 0), count } : {}), label, onPick: (tile, dir, orient) => { socket.emit("useSkill", { tier, ...(Array.isArray(tile) ? { tiles: tile } : { tile }), ...(dir ? { dir } : {}), ...(orient ? { orient } : {}), ...f }); done(); }, onCancel: done };
    } else if (pickReq.kind === "ohger") {
      // คิงโอเจอร์ stand by: เลือกทิศ Ohger Finish (พื้นที่ตามร่าง) → useSkill secondary · ยกเลิก = กดไกซ้ำ (ไม่เสียแต้ม เดินได้อีก)
      const a = ch?.secondary?.area || {};
      boardPick = {
        kind: "line", len: a.len || 1, width: a.width || 1, label: `${ch?.secondary?.name || ""} · ${areaText(a)}`,
        onPick: (dir) => { ohgerExit.current = true; socket.emit("useSkill", { tier: "secondary", dir }); done(); },
        onCancel: () => { ohgerExit.current = true; socket.emit("charAction", { key: "ohger:trigger" }); done(); },
      };
    } else if (pickReq.kind === "ride") {
      // ยูนะ: ขอขี่คนที่อยู่ติดกัน (server/ride.js) — เจ้าของคนนั้นต้องกดยินยอม
      boardPick = { kind: "target", range: [1, 1], allow: (p) => p.id !== me.id && !p.ride && !p.summon && (p.size || 1) <= 1 && !(state.players || []).some((o) => o.ride === p.id), label: "ขี่", onPick: (id) => { socket.emit("rideAsk", { targetId: id }); done(); }, onCancel: done };
    } else if (pickReq.kind === "action") {
      // ปุ่มพิเศษที่มี tiles (actions[].tiles — ทาคุโตะพุ่งต้นตาเดิน): เลือกช่องบนกระดาน (มุมบนซ้ายของตัว) → charAction { key, tile }
      const act = (me.actions || []).find((x) => x.key === pickReq.key);
      const tiles = act && Array.isArray(act.tiles) ? act.tiles : [];
      boardPick = { kind: "tile", place: "list", tiles, foot: Math.max(1, me.size | 0), label: act ? act.name : pickReq.key, onPick: (tile) => { socket.emit("charAction", { key: pickReq.key, tile }); done(); }, onCancel: done };
    }
  }
  const pickGift = (id) => {
    socket.emit("useSkill", { tier: giftSel.tier, targets: [id], item: giftSel.item });
    setGiftSel(null);
  };
  useEffect(() => {
    if (giftSel && (phase !== "PLAYING" || done)) setGiftSel(null);
  }, [giftSel, phase, done]);

  // แบนเนอร์สลับกลางวัน/กลางคืน: เด้งเมื่อ cycle เปลี่ยนระหว่างแมตช์ แล้วหายเอง
  useEffect(() => {
    if (prevCycle.current && state.cycle && prevCycle.current !== state.cycle) {
      const j = state.journey;
      pushScene("cycle", {
        cycle: state.cycle,
        // การเดินทาง: ผลของช่วงเวลานี้ตามภูมิภาคที่อยู่ (ไม่ใช่กติกาวัน/คืนเดิม)
        journey: j ? { name: j.name, text: state.cycle === "night" ? j.nightDesc : j.day } : null,
      });
    }
    prevCycle.current = state.cycle;
  }, [state.cycle, state.journey, pushScene]);

  // เฟส CUTSCENE: วีดีโอแปลงร่าง (key=id -> remount กันจอดำ)
  //  โหมดประหยัด (patch 2.0.6): ข้ามวีดีโอ — แสดงกระดาน + แจ้งเตือนว่าใครเปิดท่าไม้ตาย รอเวลาเท่าวีดีโอจริง
  const csSkipped = lowQ && phase === "CUTSCENE" && state.cutscene ? state.cutscene : null;
  const cutsceneEl = phase === "CUTSCENE" && state.cutscene && !lowQ ? <Cutscene key={state.cutscene.id} cs={state.cutscene} />
    : null;
  // จอคอม: คัตซีนลอยทับกระดาน (ท้าย return ด้านล่าง) — เดิมคืนคัตซีนแทนกระดานทั้งจอ ทำให้กระดาน+สนาม 2.5D+HUD
  //  ถูกถอดแล้ว mount ใหม่ทุกครั้งที่จบคัตซีน (สร้างฉากใหม่ทั้งหมด = จอกระตุก/กะพริบตอนกลับมา) · มือถือคงแบบเดิม
  if (cutsceneEl && vp.w < 768) return cutsceneEl;

  // สถานะ+handler ของทุกโหมดเลือกเป้าหมาย มัดรวมไว้ที่เดียว ใช้ร่วมกันทั้ง layout มือถือและจอใหญ่ (ดู isTargetable/resolveAttackPick)
  const targetChain = {
    giftSel, pickGift,
    myId: me?.id,
    myTeamId: me?.teamId,
    teamModeActive: state.gameMode === "duo" || state.gameMode === "trio" || state.gameMode === "eos",
  };

  // ============================================================
  //  โหมดมือถือแนวตั้ง (< 768px): layout เฉพาะโทรศัพท์ ไม่ย่อจากจอคอม
  //  บน = การ์ดคู่ต่อสู้ (แตะเพื่อโจมตี) | ล่าง = แผงเรา + ปุ่มใหญ่เต็มนิ้ว
  // ============================================================
  if (vp.w < 768) {
    const revealed = phase === "SUMMARY" || phase === "ATTACK" || phase === "ATTACKING";
    return (
      <div className="fixed inset-0 overflow-hidden flex flex-col">
        <GameBackground cycle={state.cycle} round={state.roundNumber} lowQ={lowQ} />
        {/* แถบบน: รอบ + เวลา (เว้นขวาให้ปุ่มเสียง) */}
        <div className="shrink-0 flex flex-col items-center gap-1 pt-2 px-14 min-h-[40px]">
          {(phase === "PLAYING" || phase === "ATTACK") && (
            <div className="p-chip text-base font-bold text-white bg-black/55 px-5 py-1 border-b-2" style={{ borderColor: "var(--color-p-accent-bright)" }}>
              <span>{nightNow ? "🌙" : "☀️"} รอบที่ {state.roundNumber} · ⏱️ <TickSeconds /> วิ</span>
            </div>
          )}
        </div>

        {/* คู่ต่อสู้: การ์ดกริด (แตะการ์ดเพื่อโจมตีตอนเป็นผู้ชนะ) */}
        <div className={`shrink-0 max-h-[36vh] overflow-y-auto grid gap-2 px-2 pt-2 ${seatOthers.length <= 1 ? "grid-cols-1 max-w-sm w-full mx-auto" : "grid-cols-2"}`}>
          {seatOthers.map((p) => (
            <MobileOpponent
              key={p.id}
              p={p}
              phase={phase}
              targetable={isTargetable(p, iAmAttacker, targetChain)}
              onAttack={(id) => resolveAttackPick(id, targetChain)}
              onInspect={setStatusViewId}
              hostRef={(el) => registerOther(p.id, el)}
            />
          ))}
        </div>
        {iAmAttacker && (
          <div className="shrink-0 text-center mt-1.5 text-lg font-black text-echo-ice animate-pulse text-hard">
            ⚔️ แตะการ์ดคู่ต่อสู้เพื่อโจมตี!
          </div>
        )}
        {/* กลางจอ: กองการ์ดกลาง ทับตำแหน่งโลโก้เดิม (โลโก้เป็นแค่วอเตอร์มาร์กจางๆ ด้านหลัง) */}
        <div className="flex-1 min-h-0 grid place-items-center pointer-events-none">
          <div className="relative grid place-items-center">
            <img src="/image/logo_current.webp" alt="" className="h-14 w-auto opacity-25" />
            <div className="absolute inset-0 grid place-items-center">
              <DeckPile hostRef={deckRef} size="md" onClick={() => setDeckOpen(true)} />
            </div>
          </div>
        </div>
        {deckOpen && <DeckLedgerModal ledger={state.deckLedger || []} onClose={() => setDeckOpen(false)} />}
        {me?.qte && <QtePanel key={me.qte.idx} qte={me.qte} />}

        {/* ---------- แผงตัวเรา (ล่างสุด กดง่ายด้วยนิ้วโป้ง) ----------
            ออกแบบใหม่: รูป/แต้มรวม ลอยเป็นป้ายเฉียงเจาะทับขอบบนแผง (ไม่ใช่แถวในกล่องเหมือนเดิม)
            ช่องสกิล 3 อันจัดทรงพัด (ช่องกลางยกสูงกว่า) และปุ่มจั่ว/เปิดไพ่รวมเป็นปุ่มเดียวแบ่งเฉียงกลาง
            กระเป๋า/ร้านค้าย้ายไปเป็นไอคอนกลมลอยนอกแผงแทนปุ่มยาวเต็มแถว */}
        {me && (
          <div className="shrink-0 px-2 pb-2">
            <div className="p-self-panel relative rounded-3xl p-3 pt-8 shadow-2xl">
              {/* ป้ายลอย: รูปเรา (ซ้าย) */}
              <button
                onClick={() => { clickSound(); setShowChar(true); }}
                className="absolute -top-7 left-3 z-20"
                title="รายละเอียดตัวละคร"
                style={{ "--p-frame-color": me.color }}
              >
                {<Portrait p={me} className="w-14 h-16 p-player-frame" rounded="rounded-xl" />}
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-black/75 rounded-full px-1.5 leading-tight whitespace-nowrap">ℹ️</span>
              </button>
              {/* ป้ายลอย: แต้มรวม (ขวา) */}
              <TeamBadge teamId={me.teamId} className="absolute -top-5 left-1/2 -translate-x-1/2 z-20" />
              <div
                className="absolute -top-6 right-3 z-20 px-4 py-1 text-center font-black text-gray-900"
                style={{ background: "linear-gradient(120deg,#dcefff,var(--color-echo-ice))", clipPath: "polygon(12% 0,100% 0,88% 100%,0 100%)" }}
              >
                <div className="text-[10px] leading-none" style={{ fontFamily: P_DISPLAY }}>แต้มรวม</div>
                <div className="text-2xl leading-tight" style={{ fontFamily: P_DISPLAY }}>{me.score != null ? me.score : "???"}</div>
              </div>

              {/* การ์ด/แต้ม: เต็มความกว้าง จัดกลาง (ไม่ต้องแบ่งที่ให้รูป/คะแนนอีกต่อไป) */}
              <div ref={selfHandRef} className="flex items-center justify-center overflow-x-auto min-h-[52px]">
                {me.cards === null ? (
                  // ตาบอด: การ์ด/แต้มของตัวเองก็ถูกซ่อน
                  <div className="text-3xl font-black opacity-80">🌑 ???</div>
                ) : revealed ? (
                  <div className="text-3xl font-black">
                    {me.busted ? <span className="text-echo-hp">แตก!</span> : <>แต้ม <span className="text-echo-ice">{me.score}</span></>}
                  </div>
                ) : (
                  me.cards && me.cards.map((c, i) => <Card key={i} value={c.value} color={c.color} special={c.special} size="sm" />)
                )}
              </div>
              <div className="h-1.5 rounded-full bg-black/30 overflow-hidden mt-1.5">
                <div className="h-full transition-all" style={{ width: `${Math.min(100, ((me.score || 0) / 21) * 100)}%`, background: me.busted ? "#c0392b" : "#fff" }} />
              </div>

              {/* พลังชีวิต + เกราะ (บรรทัดเดียวเสมอ) + สถานะ + หลอดสกิล
                  min-w-0: ป้ายสถานะเป็น whitespace-nowrap ทั้งแถว — ถ้าไม่ปลดล็อก min-width:auto
                  ป้ายที่โผล่ตอนกดสกิลจะดันหลอดสกิลที่ ml-auto ล้นออกนอกกล่อง */}
              <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-2 min-w-0">
                {<LifeBar p={me} />}
                {<StatusChips p={me} left />}
                <span className="ml-auto flex items-center gap-1.5">
                  <span className="flex gap-1 p-1 rounded-lg bg-black/25">
                    {Array.from({ length: me.maxSkill }, (_, i) => (
                      <span
                        key={i}
                        className="w-4 h-4 rotate-45"
                        style={
                          i < me.skillPoints
                            ? { background: "linear-gradient(180deg,#ead2f0,var(--oc-echo-glow) 45%,var(--oc-echo))", boxShadow: "0 0 6px rgba(201,154,214,.8)" }
                            : { background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.2)" }
                        }
                      />
                    ))}
                  </span>
                  <span className="text-sm font-black whitespace-nowrap">{me.skillPoints}/{me.maxSkill}</span>
                </span>
              </div>

              {/* ช่องสกิล 3 อัน — ทรงพัด: ช่องกลาง (สกิลรอง) ยกสูงกว่าอีก 2 ช่อง */}
              <div className="grid grid-cols-3 gap-2 mt-3 items-end">
                <div className="translate-y-1.5">
                  <SkillSlot label="สกิลพื้นฐาน" tier="basic" skill={ch?.basic} points={me.skillPoints} disabled={!me.alive || phase !== "PLAYING" || done || noSkill || (me.skillUsed && !isMuimi) || muimiBasicLocked} onUse={requestSkillUse} ammo={isMuimi ? me.muimiEmergencyUses : undefined} />
                </div>
                <div className="-translate-y-2">
                  <SkillSlot label="สกิลรอง" tier="secondary" skill={ch?.secondary} points={me.skillPoints} disabled={done || phase !== "PLAYING" || noSkill || me.skillUsed} onUse={requestSkillUse} />
                </div>
                <div className="translate-y-1.5">
                  <SkillSlot label="ท่าไม้ตาย" tier="ultimate" skill={ch?.ultimate} points={me.skillPoints} disabled={done || phase !== "PLAYING" || noSkill || me.skillUsed || muimiUltLocked} onUse={requestSkillUse} cooldown={muimiUltCd} />
                </div>
              </div>
              {noSkill && phase === "PLAYING" && !done && (
                <div className="text-center text-sm font-bold text-echo-hp mt-1">🚫 ถูกห้ามใช้สกิล — เทิร์นนี้ใช้สกิลไม่ได้</div>
              )}
              {me.skillUsed && phase === "PLAYING" && !done && (
                <div className="text-center text-sm font-bold text-echo-ice mt-1">ใช้สกิลได้ 1 อันต่อเทิร์น — เทิร์นนี้ใช้ไปแล้ว</div>
              )}

              {/* แถวแอคชันหลัก: ไอคอนกระเป๋า/ร้านค้ากลม ขนาบข้างปุ่มจั่ว-เปิดไพ่ที่รวมเป็นชิ้นเดียว (แบ่งเฉียงกลาง)
                  แทนปุ่มยาวเต็มแถว 2 แถวซ้อนกันแบบเดิม — ลดความ "กล่องสี่เหลี่ยมเรียงกัน" ลง */}
              <div className="mt-3 flex items-stretch gap-2">
                <button
                  onClick={() => { clickSound(); setBagOpen(true); }}
                  className="relative shrink-0 w-12 rounded-2xl grid place-items-center text-2xl shadow-lg border-2 border-black/40"
                  style={{ background: "linear-gradient(160deg,#dcefff,var(--color-echo-ice))" }}
                  title="กระเป๋า"
                >
                  🎒
                  {me.inventory?.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 text-[10px] font-black bg-black text-white rounded-full w-4 h-4 grid place-items-center">{me.inventory.length}</span>
                  )}
                </button>

                <div className="flex-1">
                  {phase === "PLAYING" && me.alive && !done ? (
                    <>
                      <div className="relative flex h-14">
                        <button
                          disabled={state.deckEmpty || me.atCap || noDraw}
                          onClick={() => { clickSound(); socket.emit("hit"); }}
                          className="flex-1 font-black text-lg text-gray-900 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ background: "var(--color-echo-cyan)", clipPath: "polygon(0 0,94% 0,100% 100%,0 100%)" }}
                        >
                          🎴 จั่วการ์ด
                        </button>
                        <button
                          onClick={() => { clickSound(); socket.emit("lock"); }}
                          className="flex-1 font-black text-lg text-gray-900 transition active:scale-95 -ml-3"
                          style={{ background: "var(--color-echo-ice)", clipPath: "polygon(6% 0,100% 0,100% 100%,0% 100%)" }}
                        >
                          ✅ เปิดไพ่
                        </button>
                      </div>
                      {noDraw && <div className="text-center text-sm font-bold text-echo-hp mt-1">🚫 เทิร์นนี้จั่วไม่ได้</div>}
                      {me.atCap && <div className="text-center text-sm font-bold text-echo-ice mt-1">{me.busted ? "ไพ่แตก! 😢 ยังกดสกิล/ใช้ไอเทมได้ จนกว่าจะเปิดไพ่" : "แต้มเต็มแล้ว! ใช้สกิล หรือเปิดไพ่ได้เลย"}</div>}
                      {state.deckEmpty && <div className="text-center text-sm font-bold text-echo-hp mt-1">🂠 การ์ดหมดกอง — ทุกคนจั่วเพิ่มไม่ได้</div>}
                    </>
                  ) : phase === "PLAYING" && me.alive && done ? (
                  <div className="text-center text-lg font-bold py-2">{me.busted ? "แตก! 😢" : me.statuses?.sleep ? "หลับไหลอยู่ 💤" : me.statuses?.stun ? "สตั้นอยู่ 😵" : "พร้อมแล้ว ✅"} รอเพื่อน...</div>
                ) : phase === "ATTACK" ? (
                  <div className="text-center text-lg font-bold py-2">
                    {iAmAttacker ? "⚔️ แตะการ์ดคู่ต่อสู้ด้านบน!" : `รอ ${attacker ? attacker.name : "ผู้ชนะ"} เลือกเป้าหมาย...`}
                  </div>
                ) : !me.alive ? (
                  <div className="text-center text-lg opacity-80 py-2">💀 ตกรอบแล้ว</div>
                ) : <div className="py-1" />}
                </div>

                <button
                  onClick={() => { if (shopList[0]) viewShop(shopList[0]); }}
                  className="relative shrink-0 w-12 rounded-2xl grid place-items-center text-2xl shadow-lg border-2 border-black/40"
                  style={{ background: "linear-gradient(160deg,#dcefff,var(--color-echo-ice))" }}
                  title="ร้านค้า"
                >
                  🏪
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] font-black bg-black text-white rounded-full px-1 leading-4 whitespace-nowrap">🪙{me.gold ?? 0}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---------- เฟสสรุปผล: ลีดเดอร์บอร์ด (เต็มจอ เลื่อนดูได้) ---------- */}
        {phase === "SUMMARY" && (
          <SummaryTiers winners={summaryWinners} losers={summaryLosers} compact />
        )}

        {/* ---------- อนิเมชันเปลี่ยนเฟส ---------- */}
        {scene?.kind === "draw" && <DrawCall key={scene.id} />}

        {/* ---------- overlay ที่ใช้ร่วมกับจอคอม ---------- */}
        <OverlayLayer phase={phase} attack={state.attack} csSkipped={csSkipped} flash={flash} notice={notice} cycleFx={scene?.kind === "cycle" ? { ...scene.data, id: scene.id } : null} />
        <FlyingCardsLayer flights={cardFlights} onDone={removeCardFlight} />

        {/* ---------- แบนเนอร์รอบถัดไป ---------- */}
        {phase === "TRANSITION" && <RoundBanner round={state.roundNumber + 1} />}

        {scene?.kind === "atk" && <AttackCall key={scene.id} />}

        {shopShowing && <ShopHerald key={scene.id} name={scene.data?.name} />}

        {phase === "GAMEOVER" && (
          <VictoryScreen state={state} onBackToLobby={() => socket.emit("backToLobby")} onRematch={() => socket.emit("rematch")} />
        )}

        <ModalMounts
          showChar={showChar} ch={ch} me={me} onCloseChar={() => setShowChar(false)}
          statusView={statusView} statusViewIsSelf={statusViewId === state.youId} onCloseStatus={() => setStatusViewId(null)}
          shop={openShop} onCloseShop={() => setShopId(null)} shopBlock={shopBlock}
          bagOpen={bagOpen} onCloseBag={() => setBagOpen(false)} players={state.players} gameState={state.gameState} roundNumber={state.roundNumber}
          myTurn={myTurn} bagSlots={me?.bagSlots || state.bagSlots}
          skillConfirm={skillConfirm} onConfirmSkill={confirmSkillUse} onCancelSkill={cancelSkillConfirm}
          remoteShops={me?.remoteShop ? shopList : null} onRemoteShop={(sh) => { setBagOpen(false); viewShop(sh); }}
        />
      </div>
    );
  }

  // ---- จอคอม/แท็บเล็ต: กระดานเดินได้แบบ Fire Emblem (GRID_PLAN §11) ----
  //  กระดาน/ตัวละคร/แถบลำดับเดิน/คาดการณ์ อยู่ใน board/BoardStage.jsx · ไฟล์นี้คุม HUD ล่าง + เงื่อนไขกดได้/ไม่ได้
  //  กำลังเลือกเป้าบนกระดาน → แผงตัวเราเลื่อนลงพ้นจอ ไม่บังกระดาน
  // ฉากตีบนกระดาน (กล้องซูมเข้าคู่) = HUD หลบทั้งหมด
  const hudAway = !!me && (!!boardPick || fcOpen || (!!state.board && phase === "ATTACKING"));
  // ขนาด UI แผงตัวเรา: ออกแบบที่หน่วยฐาน 1440×810 แล้วขยายตามจอ (1080p = ×1.333)
  //  ความกว้างฐานขั้นต่ำ 1376 = ซ้าย+กลาง+ขวาเรียงได้ไม่ชนกัน (จอแคบ/4:3 จึงย่อตามความกว้าง)
  const hudZ = Math.min(1.6, Math.max(0.6, Math.min(vp.h / 810, vp.w / 1376)));
  const inBoardTurn = phase === "ORDER" || phase === "ACTION" || phase === "ATTACKING";
  // HUD แยกตามช่วง: ช่วงจั่ว = เหลือแค่ไพ่/แต้ม/จั่ว-พอ · ตาเรา = สกิล + ช่องคำสั่ง · อื่นๆ = ดูอย่างเดียว (คนที่กำลังเดินแสดงที่บนกลางแล้ว — ไม่ซ้ำข้างล่าง)
  const hudMode = phase === "PLAYING" ? "draw" : myTurn ? "turn" : "watch";
  // ---------- ระบบคู่: ปุ่มเลือกตัว (รูปเล็ก 2 ตัวเหนือรูปหลัก) · กดอีกตัว = กระจกเงา (useSkill basic) ----------
  const duoDone = new Set((state.duo && state.duo.done) || []);
  const mirrorLocked = !!(me?.skillLocks?.basic?.locked);
  const canSwitchTo = (u) => !!duoUnits && myTurn && !noSkill && !mirrorLocked && u.id !== me.id && u.alive && !!u.pos && !duoDone.has(u.id);
  const duoMirror = !!duoUnits && duoUnits.some((u) => u.id !== me?.id && u.alive); // ปุ่มพื้นฐาน = กระจกเงา (ไม่กินโควตา)
  const duoPick = duoUnits && duoUnits.length > 1 ? duoUnits.map((u) => ({
    id: u.id,
    node: <Portrait key={u.id} p={u} className="w-full h-full" rounded="" />,
    active: u.id === me?.id,
    done: duoDone.has(u.id),
    dead: !u.alive,
    onClick: canSwitchTo(u) ? () => { clickSound(); socket.emit("useSkill", { tier: "basic" }); } : null,
  })) : null;
  // ปุ่มหลายตัวเลือก: ตัวเลือกนี้ใช้ได้ตอนนี้ไหม (แต้ม · โควตา · มีเป้าในระยะ · ล็อก)
  const choiceOk = (c) => !c.locked && !c.active && (me?.skillPoints || 0) >= (c.cost || 0) && (!me?.skillUsed || choiceFree(c)) && !noTargetInRange(c.area);
  const slotOff = (tier) => {
    const s = ch?.[tier];
    if (!myTurn || (noSkill && !me?.skillLocks?.[tier]?.ignoresNoSkill) || giftLocked(tier)) return true;
    if (canto && !cantoTier(tier)) return true; // เดินต่อหลังจบตา: เหลือแค่ปุ่มพื้นฐาน (เซลิน ดาบเล็ก: เดินกับรออย่างเดียว · เอมิลิโกะ: สลับอาวุธได้)
    if (me?.inui?.opened && tier === "basic") return false; // Faiz Phone: เปิดเครื่องได้เสมอในตาตัวเอง · รหัสตรวจในเครื่อง
    if (s?.active) return false; // ทำงานอยู่ (กด = ออก · ไม่กินโควตา)
    if (s?.choices) return s.browse ? !s.choices.length : !s.choices.some(choiceOk); // browse = เปิดดูตัวเลือกได้เสมอ (โรลันด์: มือการ์ด) · ตัวที่ใช้ไม่ได้จางอยู่ในแผง
    if (tier === "basic") return (me.skillUsed && !basicFree && !giftFree("basic") && !duoMirror) || muimiBasicLocked || noTargetInRange(s?.area);
    if (tier === "ultimate") return (me.skillUsed && !giftFree("ultimate")) || muimiUltLocked || noTargetInRange(s?.area);
    return (me.skillUsed && !giftFree(tier)) || noTargetInRange(s?.area);
  };

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: nightNow ? "#0b1830" : "#dfeaf6" }}>
      {state.board ? (
        <BoardStage state={state} me={me} lowQ={lowQ} vp={vp} pick={boardPick} onInspect={setStatusViewId} registerOther={registerOther}
          atkSignal={atkSignal} onAttackables={setAttackables} onOverlay={setFcOpen} statusOf={forecastStatusItems} />
      ) : (
        <GameBackground cycle={state.cycle} round={state.roundNumber} lowQ={lowQ} journey={arenaJourney} />
      )}
      {/* Start Up / ช่วง Clock Up (ไรเดอร์ ZECT): โลกสีซีด ขอบเบลอ · Start Up ในช่วง Clock Up ใช้เวลาของสมาชิก Faiz */}
      {(inuiUp || clockWorld) && <div className={`axel-world ${alterWorld && !inuiUp ? "alter" : clockWorld && !inuiUp ? "clock" : ""}`} data-low={lowQ ? "true" : "false"} />}
      {inuiUp && <AxelClock phase={phase} value={faizClock && faizClock.id !== me?.id ? faizClock.left : undefined} />}
      {clockWorld && !alterWorld && !lowQ && <div className="full-force-speed" />}
      {/* กองการ์ดกลาง: แถบสไลด์ขอบซ้ายกลางจอ — ค่าเริ่ม = หุบ (ผู้ใช้สั่ง 2026-10-09 · เกะกะจอ) · การ์ดยังบินออกจากตรงนี้ไปมือเรา */}
      {/*  สนาม Eos (ผู้ใช้สั่ง 2026-11-10 "รวมทั้ง 3 อันในอันเดียว สไลด์ออกมาแล้วกดได้"): ปุ่มแผนที่ + คู่มืออยู่ในถาดเดียวกับกองการ์ด */}
      <div className="deck-drawer" data-eos={state.world === "eos" && state.board ? "true" : undefined} data-open={deckTab ? "true" : "false"} data-away={fcOpen || (!!state.board && phase === "ATTACKING") ? "true" : "false"}>
        <div className="deck-drawer-pile"><DeckPile hostRef={deckRef} size="md" onClick={() => setDeckOpen(true)} /></div>
        {state.world === "eos" && state.board && (
          <div className="deck-drawer-extra">
            <button type="button" aria-label="แผนที่" tabIndex={deckTab ? 0 : -1} onClick={() => { clickSound(); setEosMapOpen(true); }}>
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M9 4v14M15 6v14" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
            </button>
            <button type="button" aria-label="คู่มือ" tabIndex={deckTab ? 0 : -1} className="q" onClick={() => { clickSound(); setEosGuideOpen(true); }}>?</button>
          </div>
        )}
        <button type="button" className="deck-drawer-tab" aria-expanded={deckTab} aria-label="กองการ์ดกลาง" onClick={() => { clickSound(); setDeckTab((v) => !v); }}>
          <span className="deck-drawer-ico" aria-hidden="true" /><span className="deck-drawer-arrow" aria-hidden="true">{deckTab ? "◂" : "▸"}</span>
        </button>
      </div>
      {deckOpen && <DeckLedgerModal ledger={state.deckLedger || []} onClose={() => setDeckOpen(false)} />}
      {eosMapOpen && state.world === "eos" && <EosMap state={state} onClose={() => setEosMapOpen(false)} />}
      {eosGuideOpen && state.world === "eos" && <EosGuide onClose={() => setEosGuideOpen(false)} />}
      {eosSitOpen && state.world === "eos" && <EosSituation state={state} onClose={() => setEosSitOpen(false)} />}
      {/* สนาม Eos: ป้ายเข้าพื้นที่ เมื่อตัวเราเดินเข้าโซนใหม่ (eos/EosZoneCard.jsx) */}
      {state.world === "eos" && state.board && <EosZoneCard state={state} />}
      {state.world === "eos" && state.board && <EosScoreboard state={state} />}
      {state.world === "eos" && state.board && <EosPerks state={state} />}
      {state.world === "eos" && state.board && !eosSitOpen && <EosAlerts state={state} />}

      {/* QTE — ลอยกลางจอ */}
      {me?.qte && <QtePanel key={me.qte.idx} qte={me.qte} />}

      {/* สนาม Colony: ขอบจอแดงกะพริบ — ประตูปิดเทิร์นนี้ / นับถอยหลังระเบิด 3 เทิร์นสุดท้าย */}
      {state.colony && (phase === "PLAYING" || inBoardTurn) && ((state.colony.countdown == null && state.colony.sealIn != null && state.colony.sealIn <= 1) || (state.colony.countdown != null && state.colony.countdown <= 3)) && (
        <div className="colony-alarm" data-boom={state.colony.countdown != null ? "true" : "false"} aria-hidden="true" />
      )}
      {/* แถบซ้ายบน: กลางวัน/คืน · รอบ · เวลา · ภูมิภาค */}
      {!fcOpen && !(state.board && phase === "ATTACKING") && <HudTopBar
        night={nightNow}
        round={phase === "PLAYING" || inBoardTurn ? state.roundNumber : null}
        timer={<BoardTimer phaseKey={`${phase}-${state.roundNumber}-${state.actorId || ""}`} />}
        journey={state.journey && !state.colony && !state.moon && (phase === "PLAYING" || inBoardTurn)
          ? { ...journeyArea(state.journey.area), name: state.journey.name, turnsLeft: state.journey.turnsLeft }
          : state.fodlan && state.world === "eos" && (phase === "PLAYING" || inBoardTurn) // Eos (§8.6): ชื่อสนาม + สภาพอากาศ
            ? (() => { const sit = eosSituation(state).filter((s) => s.key !== "diff"); return { numeral: "✦", color: "#2f5f9c", glow: "#9fe2ff", name: "Eos", eos: true, sit, alert: sitCount(sit) }; })()
          : state.fodlan && (phase === "PLAYING" || inBoardTurn) // Fodlan: ป้ายด่าน + สภาพอากาศ (ไม่มีหน้าผลภูมิภาค)
            ? { ...fodlanStage(state.fodlan.stage), name: state.fodlan.name, turnsLeft: state.fodlan.turnsLeft, weather: state.fodlan.weather }
            : null}
        onJourney={state.world === "eos" ? () => { clickSound(); setEosSitOpen(true); } : state.fodlan ? undefined : () => { clickSound(); setJourneyInfoOpen(true); }}
        zero={state.zero && state.zero.active && (phase === "PLAYING" || inBoardTurn) ? state.zero : null}
        colony={state.colony && (phase === "PLAYING" || inBoardTurn) ? state.colony : null}
        moon={state.moon && (phase === "PLAYING" || inBoardTurn) ? state.moon : null}
        players={state.players}
        zoom={hudZ}
      />}

      {/* ---------- แผงตัวเรา (ดีไซน์ HudMain — กระจกน้ำเงินตัดมุม) ----------
          ซ้ายล่าง = แผงผู้เล่น · ขอบซ้าย = ลิ้นชักสถานะ · กลางล่าง = แต้ม · มือไพ่ · จั่ว/พอ (ช่วงจั่ว) หรือ ย้อน/รอ (ตาเดิน)
          ขวาล่าง = แต้มสกิล · กระเป๋า · ร้านค้า · สกิล 3 ช่อง (ป้ายระยะ) — ส่วนวาดอยู่ที่ hud/SelfHud.jsx */}
      {me && (
        <SelfHud
          hidden={hudAway}
          noPeek={fcOpen || (!!state.board && phase === "ATTACKING")}
          lowQ={lowQ}
          zoom={hudZ}
          panel={
            <HudPanel
              // ระบบคู่ (เคท & เอมิลิโกะ): รูปหลัก = ภาพปกเดียวกับหน้าเลือกตัว (รูปแต่ละตัวอยู่ที่ปุ่มเลือกตัวด้านบน)
              portrait={<Portrait key={me.id} p={duoUnits && hand?.character?.cover ? { ...me, img: hand.character.cover } : me} className="w-full h-full" rounded="" />}
              hexPortrait={true}
              duo={duoPick}
              name={me.character?.name || me.name}
              onName={() => { clickSound(); setShowChar(true); }}
              teamId={state.gameMode === "eos" ? null : me.teamId} // Eos: ทุกคนทีมเดียว ไม่ต้องมีป้าย (ผู้ใช้ 2026-11-10)
              teamColor={teamAccent(me.teamId)}
              sp={me.skillPoints}
              spMax={me.maxSkill}
              spLabel={me.character?.id === "fern" ? "Energy" : undefined}
              vitals={<div className="hud-vitals">
                  <StatRow big kind="hp" value={me.hp} max={me.maxHp} extra={me.tempHp || 0} extraLabel="เลือดชั่วคราว" />
                  <StatRow big kind="ar" value={me.armor} max={me.maxArmor} />
                  <VitalExtras p={me} className="pc-extra-inline" />
                </div>}
              statuses={meStatuses}
              rawStatuses={me.statuses || {}}
            />
          }
          drawer={
            <HudStatusDrawer
              statuses={meStatuses}
              rawStatuses={me.statuses || {}}
              gold={me.gold || 0}
              goldMax={me.goldMax || 0}
              lowQ={lowQ}
              statusAlt={null}
              onOpenAll={() => { clickSound(); setStatusViewId(me.id); }}
            />
          }
          mode={hudMode}
          center={hudMode !== "draw" && ch?.basic?.book ? (
            // เจ้าหญิง Echo: สมุดไดอารี่กลาง HUD แทนช่องสกิลพื้นฐาน
            <DiaryCenter skill={ch.basic} disabled={hudMode !== "turn" || slotOff("basic")} cooldown={giftCd("basic")} onOpen={() => requestSkillUse("basic", ch.basic, "พื้นฐาน", ch.basic.cost)} />
          ) : hudMode !== "draw" && me?.ohger ? (
            <OhgerSword ohger={me.ohger} interactive={myTurn && !canto} onPress={(k) => socket.emit("charAction", { key: `ohger:${k}` })} />
          ) : hudMode === "draw" ? (
            <DrawDock
              cards={hand.cards}
              score={hand.score}
              busted={hand.busted}
              handRef={selfHandRef}
              draw={{
                disabled: state.deckEmpty || !(phase === "PLAYING" && handAlive && !done) || hand.atCap || noDraw,
                onClick: () => { clickSound(); socket.emit("hit"); },
              }}
              stand={{
                done: !!hand.locked,
                disabled: !(phase === "PLAYING" && handAlive && !done),
                onClick: () => { clickSound(); setColorPick(null); socket.emit("lock"); },
              }}
              bag={{ items: hand?.inventory || [], slots: hand?.bagSlots || me?.bagSlots || state.bagSlots || 5, hot: drawHot, onClick: () => { clickSound(); setColorPick(null); setBagOpen(true); } }}
              pick={pickLive ? {
                card: colorPick.card,
                onCard: (i) => { clickSound(); setColorPick((cp) => cp && { ...cp, card: cp.card === i ? null : i }); },
                onColor: (color) => { clickSound(); socket.emit("useDrawItem", { uid: colorPick.uid, cardIndex: colorPick.card, color }); setColorPick(null); },
              } : null}
            />
          ) : <span />}
          right={hudMode === "turn" ? (
            <HudCommand
              skills={
                <>
                  {ch?.basic && !ch.basic.book && !me.ohger && <SkillSlot variant="hud" label="พื้นฐาน" tier="basic" skill={ch?.basic} points={me.skillPoints} rangeLabel={areaText(ch?.basic?.area)} disabled={slotOff("basic")} onUse={requestSkillUse} cooldown={giftCd("basic")} ammo={isMuimi ? me.muimiEmergencyUses : me.inui?.opened ? me.inui.ammo : undefined} />}
                  {me.kazuma
                    ? <BladeRouzerSlot kazuma={me.kazuma} skill={ch?.secondary} disabled={slotOff("secondary")} onOpen={() => requestSkillUse("secondary", ch?.secondary, "รอง", ch?.secondary?.cost)} />
                    : ch?.secondary && !me.ohger && <SkillSlot variant="hud" label="รอง" tier="secondary" skill={ch?.secondary} points={me.skillPoints} rangeLabel={areaText(ch?.secondary?.area)} disabled={slotOff("secondary")} onUse={requestSkillUse} cooldown={giftCd("secondary")} ammo={me.sliver?.form === "banagher" && !me.sliver.unicornLeft ? me.sliver.ammo : undefined} />}
                  {ch?.ultimate && <SkillSlot variant="hud" label="ท่าไม้ตาย" tier="ultimate" skill={ch?.ultimate} points={me.skillPoints} rangeLabel={areaText(ch?.ultimate?.area)} disabled={slotOff("ultimate")} onUse={requestSkillUse} cooldown={muimiUltCd || giftCd("ultimate")} />}
                </>
              }
              attack={{ disabled: canto || !!state.action?.noStrike || !attackables.length, targets: attackables.length, onClick: () => { clickSound(); setAtkSignal((n) => n + 1); } }}
              shops={canto ? null : nearShops.map((sh) => ({ id: sh.id, kind: sh.kind, name: sh.name || shopName(sh.kind), onClick: () => viewShop(sh) }))}
              ride={rideNear && !canto ? { disabled: !!state.action?.locked || !!state.rideAsk, onClick: () => { clickSound(); setPickReq({ kind: "ride" }); } } : null}
              drop={me && (state.players || []).some((p) => p.alive && p.ride === me.id) ? { onClick: () => { clickSound(); socket.emit("rideDrop"); } } : null}
              extra={(me?.actions || []).map((x) => {
                // tiles = เลือกช่องบนกระดานก่อน (กดซ้ำ = ยกเลิก) · ไม่มี = ส่งทันที (ม้าของไจโร/ดิเอโก้)
                const picking = pickReq?.kind === "action" && pickReq.key === x.key;
                const tiles = Array.isArray(x.tiles) && x.tiles.length ? x.tiles : null;
                return {
                  ...x, on: picking, disabled: !!x.disabled || canto || (Array.isArray(x.tiles) && !tiles),
                  onClick: () => {
                    clickSound();
                    if (tiles) { setPickReq(picking ? null : { kind: "action", key: x.key }); return; }
                    if (x.key === "kazumaEvolution") { setKzEvolve(true); return; }
                    socket.emit("charAction", { key: x.key });
                  },
                };
              })}
              bag={{
                onClick: () => { clickSound(); setBagOpen(true); },
                items: me?.inventory || [], slots: me?.bagSlots || state.bagSlots || 5,
                hot: !canto && (me?.inventory || []).some((it) => it.type === "battery" && (it.charge || 0) > 0) && (me?.skillPoints || 0) < (me?.maxSkill || 0),
              }}
              undo={{ disabled: !(state.action && state.action.moved && !state.action.locked), onClick: () => { clickSound(); socket.emit("undoMove"); } }}
              end={{ disabled: false, onClick: () => { clickSound(); setPickReq(null); socket.emit("endAction"); } }}
            />
          ) : hudMode === "watch" ? <BagButton solo items={me?.inventory || []} slots={me?.bagSlots || state.bagSlots || 5} onClick={() => { clickSound(); setBagOpen(true); }} /> : <span />}
        />
      )}

      {/* ---------- อนิเมชันเปลี่ยนเฟส ---------- */}
      {scene?.kind === "draw" && (state.board ? <PhaseCall key={scene.id} round={state.roundNumber} /> : <DrawCall key={scene.id} />)}

      {/* ---------- overlay ที่ใช้ร่วมกับมือถือ (ฉากตีวาดบนกระดานแทน AttackFx) ---------- */}
      <OverlayLayer boardFx phase={phase} attack={state.attack} csSkipped={csSkipped} flash={flash} notice={notice} cycleFx={scene?.kind === "cycle" ? { ...scene.data, id: scene.id } : null} />
      <FlyingCardsLayer flights={cardFlights} onDone={removeCardFlight} />
      {journeyInfoOpen && state.journey && <JourneyInfoModal journey={state.journey} onClose={() => setJourneyInfoOpen(false)} />}

      {/* ---------- แบนเนอร์รอบถัดไป ---------- */}
      {phase === "TRANSITION" && <RoundBanner round={state.roundNumber + 1} />}

      {shopShowing && <ShopHerald key={scene.id} name={scene.data?.name} />}

      {phase === "GAMEOVER" && (
        <VictoryScreen state={state} onBackToLobby={() => socket.emit("backToLobby")} onRematch={() => socket.emit("rematch")} />
      )}

      {/* ---------- modal รายละเอียดตัวละคร / ดูสถานะผู้เล่น / ร้าน / กระเป๋า ---------- */}
      <ModalMounts
        showChar={showChar} ch={ch} me={me} onCloseChar={() => setShowChar(false)}
        statusView={statusView} statusViewIsSelf={!!statusView && sameSide(statusView, hand)} onCloseStatus={() => setStatusViewId(null)}
        shop={openShop} onCloseShop={() => setShopId(null)} shopBlock={shopBlock}
        bagOpen={bagOpen} onCloseBag={() => setBagOpen(false)} players={state.players} gameState={state.gameState} roundNumber={state.roundNumber}
        myTurn={myTurn && !canto && !me?.summon} bagSlots={me?.bagSlots || state.bagSlots} newBag={!!state.board} drawBag={drawBag} onDrawUse={useDrawFromBag}
        skillConfirm={skillConfirm} onConfirmSkill={confirmSkillUse} onCancelSkill={cancelSkillConfirm}
        remoteShops={me?.remoteShop ? shopList : null} onRemoteShop={(sh) => { setBagOpen(false); viewShop(sh); }}
      />
      {/* ยูนะขอขี่ (server/ride.js): เจ้าของตัวที่ถูกขอกดยินยอม/ปฏิเสธ */}
      {state.rideAsk && state.rideAsk.mine && (
        <div className="fixed inset-0 z-[60] grid place-items-center pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-4 rounded-2xl border-2 bg-black/85 px-5 py-4 shadow-2xl" style={{ borderColor: state.rideAsk.fromColor || "#f0c868" }}>
            <img src={state.rideAsk.fromImg} alt="" className="w-16 h-16 rounded-xl object-cover border border-white/30" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl" aria-hidden="true">🎠</span>
              <b className="text-white text-lg leading-none">{state.rideAsk.fromName}</b>
            </div>
            <div className="flex gap-2">
              <button type="button" className="w-14 h-14 rounded-xl bg-emerald-500 text-white text-2xl font-black" onClick={() => { clickSound(); socket.emit("rideAnswer", { ok: true }); }}>✓</button>
              <button type="button" className="w-14 h-14 rounded-xl bg-rose-600 text-white text-2xl font-black" onClick={() => { clickSound(); socket.emit("rideAnswer", { ok: false }); }}>✕</button>
            </div>
          </div>
        </div>
      )}
      {hkForms && me?.hikaru && (
        <HikaruForms hikaru={me.hikaru} onClose={() => setHkForms(false)} onPick={(form) => { setHkForms(false); socket.emit("useSkill", { tier: "basic", form }); }} />
      )}
      {kzOpen && me?.kazuma && ch?.secondary?.choices && (
        <BladeRouzerPanel
          kazuma={me.kazuma}
          choices={ch.secondary.choices}
          points={me.skillPoints}
          isOk={choiceOk}
          onClose={() => setKzOpen(false)}
          onPick={(c) => socket.emit("useSkill", { tier: "secondary", form: c.key })}
        />
      )}
      {phoneOpen && me?.inui && (
        <FaizPhone inui={me.inui} points={me.skillPoints || 0} skillUsed={!!me.skillUsed} onClose={() => setPhoneOpen(false)} onDial={(form) => socket.emit("useSkill", { tier: "basic", form })} />
      )}
      {kzEvolve && me?.kazuma && (
        <EvolutionScene onClose={() => setKzEvolve(false)} onDone={() => socket.emit("useSkill", { tier: "basic", form: "evolution" })} />
      )}
      {/* เจ้าหญิง Echo: ไดอารี่ความทรงจำ = สมุดเลือกตัวละคร (skill.book จาก characters/echo.js) */}
      {choiceOpen && ch?.[choiceOpen.tier]?.choices && ch[choiceOpen.tier].book && (
        <DiaryBook
          choices={ch[choiceOpen.tier].choices}
          isOk={choiceOk}
          onClose={() => setChoiceOpen(null)}
          onPick={(c) => pickChoice(choiceOpen.tier, c)}
        />
      )}
      {choiceOpen && ch?.[choiceOpen.tier]?.choices && !ch[choiceOpen.tier].book && (
        <SkillChoices
          title={ch[choiceOpen.tier].name}
          choices={ch[choiceOpen.tier].choices}
          isOk={choiceOk}
          onClose={() => setChoiceOpen(null)}
          onPick={(c) => pickChoice(choiceOpen.tier, c)}
        />
      )}
      {/* ดิโอ บรันโด: แถบ Time Meter/BloodStack · ปุ่มแทรกตา · ดวล Last Stand */}
      {me?.dio && !hudAway && <DioGauge dio={me.dio} />}
      {me?.dio && <DioInterrupt dio={me.dio} onPress={() => { clickSound(); socket.emit("charAction", { key: "dio:world" }); }} />}
      {/* ช่วง Clock Up (ไรเดอร์ ZECT / Faiz Start Up — server/clockUp.js): ปุ่มแทรก/เข้าร่วมนอกตา · หมากชนกันกดรัว */}
      <ClockUpButton me={me} onPress={(key) => () => { clickSound(); socket.emit("charAction", { key }); }} />
      <ClockDuel clock={state.clockUp || null} players={state.players} myId={me?.id} onMash={mashClock} />
      {/* เฟรดดี้ ฟาซแบร์: มินิเกมประตู 10 วิ (state.freddyDoor — characters/freddy_fazbear.js) */}
      <FreddyDoors door={state.freddyDoor || null} onPick={(d) => { clickSound(); socket.emit("freddyDoor", { door: d }); }} />
      <LastStandDuel duel={state.dioDuel || null} players={state.players} onDraw={() => { clickSound(); socket.emit("dioDuel", { action: "draw" }); }} onStand={() => { clickSound(); socket.emit("dioDuel", { action: "stand" }); }} />
      {/* คัตซีนวีดีโอ: ทับกระดานทั้งจอ (กระดานยัง mount อยู่ข้างใต้ — จบคัตซีนแล้วไม่ต้องสร้างฉากใหม่) */}
      {cutsceneEl && <div style={{ position: "fixed", inset: 0, zIndex: 150 }}>{cutsceneEl}</div>}
      {/* ยูกิ: ฉากระเบิดเกิดใหม่เป็นประตู 14 วิ (state.yukiBoom) — บนสุดเหนือ HUD/คัตซีน เล่นจนจบแม้เข้า GAMEOVER แล้ว */}
      <YukiBoom boom={state.yukiBoom || null} phase={phase} lowQ={lowQ} />
      {/* อรชุน: ฉาก Mahapralaya 17.4 วิ (state.arjunaUlt) · server พักตาเดินให้จนจบฉาก */}
      <ArjunaUlt run={arjunaRun} lowQ={lowQ} />
    </div>
  );
}
