import { GUTS_AMMO_INFO, shopInfoOf } from "../data/shop";
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
import { RoundBanner, CycleScene } from "../components/BattleScenes";
import { AvModal, AvButton } from "../components/avalon";
import { socket } from "../socket";
import { StatRow, VitalExtras } from "./hud/StatRow";
import { SkillSlot } from "./hud/SkillSlot";
import { SelfHud, HudPanel, HudStatusDrawer, HudCenter, HudRight, HudTopBar } from "./hud/SelfHud";
import { clickSound, playSfx, playCutsceneVideo } from "../audio";
import BoardStage from "../board/BoardStage";

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
  const gunTarget = !!c.gunSel && !self && !friendly;
  // โอเบรอน (ฤดูร้อน): โหมดเลือกเป้าหมายกลาง — ตัวเองกดปุ่ม "เลือกตัวเอง" บนแบนเนอร์
  //  anyone = เลือกศัตรูได้แม้โหมดทีม (โอเบรอนใช้ผลเสียของท่ากับศัตรูได้) · ไม่งั้นโหมดทีมเลือกได้เฉพาะเพื่อน (server กันซ้ำ)
  //  onlyIds = จำกัดเฉพาะบางคน
  const giftTarget = !!c.giftSel && (!c.giftSel.onlyIds || c.giftSel.onlyIds.includes(p.id)) && (c.giftSel.anyone || !c.teamModeActive || friendly);
  return (normalAttackTarget || giftTarget || gunTarget) && p.alive;
}
// แตะ/คลิกการ์ดคู่ต่อสู้แล้วต้องทำอะไร — ไล่ตามโหมดเลือกเป้าหมายที่เปิดอยู่ ไม่มีเลยก็โจมตีปกติ
function resolveAttackPick(id, c) {
  if (c.giftSel) return c.pickGift(id);
  if (c.gunSel) return c.pickGunTarget(id);
  return socket.emit("attack", { targetId: id });
}

// ---------- cutscene แปลงร่าง (วีดีโอเต็มจอ ครั้งแรกต่อเกมเท่านั้น) ----------
//  ~950ms แรก: การ์ดเปิดตัวเท่ๆ บอกว่าใครใช้ (ชื่อ+รูปโปรไฟล์ใหญ่ ไม่มี title ท่า)
//  วีดีโอเล่นอยู่ตลอด (ไม่หน่วง ไม่กินเวลาที่ server กำหนด) — หลังจากนั้นเหลือแค่ title ท่ามุมบน ไม่มีรูปทับอีก
function Cutscene({ cs }) {
  const ref = useRef(null);
  const [introDone, setIntroDone] = useState(false);
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
      {introDone && (
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
          <div className="text-sm font-bold text-echo-ice">{n.title} {n.label}!</div>
        </div>
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
    <AvModal label={`การเดินทาง · ภูมิภาคที่ ${journey.area}`} title={journey.name} onClose={onClose} width="min(34rem, 94vw)">
      <div className="flex flex-col gap-2">
        {rows.map((r) => (
          <div key={r.k} className="rounded-xl px-3 py-2 border" style={{ borderColor: r.on ? `${a.color}aa` : "rgba(255,255,255,.1)", background: r.on ? `${a.color}1f` : "rgba(255,255,255,.03)", opacity: r.on ? 1 : 0.55 }}>
            <div className="av-heading text-xs" style={{ color: r.on ? a.glow : "rgba(234,243,252,.6)" }}>{r.k}{r.on && r.k !== "ตลอดภูมิภาค" ? " (ตอนนี้)" : ""}</div>
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
              src={p.img}
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
                  src={p.img}
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
  shopOpen, shop, onCloseShop, shopBlock, shopTurnsLeft,
  bagOpen, onCloseBag, players, gameState, roundNumber, onPickGunAmmo,
  myTurn, bagSlots, onPickSuit,
  skillConfirm, onConfirmSkill, onCancelSkill,
}) {
  return (
    <>
      {showChar && ch && <CharModal ch={ch} me={me} onClose={onCloseChar} />}
      {statusView && <StatusModal p={statusView} statusOnly={statusViewIsSelf} onClose={onCloseStatus} />}
      {shopOpen && <ShopModal shop={shop} me={me} block={shopBlock} turnsLeft={shopTurnsLeft} onClose={onCloseShop} />}
      {bagOpen && <InventoryModal me={me} players={players} gameState={gameState} roundNumber={roundNumber} onPickGunAmmo={onPickGunAmmo} myTurn={myTurn} bagSlots={bagSlots} onPickSuit={onPickSuit} onClose={onCloseBag} />}
      {skillConfirm && <SkillConfirmModal confirm={skillConfirm} onConfirm={onConfirmSkill} onCancel={onCancelSkill} />}
      <GutsVideoPreloader me={me} players={players} />
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
//  ใช้ทั้งป้ายเล็กบนการ์ดผู้เล่น และหน้าต่างรายละเอียด — ทุกคนเห็นสถานะของกันและกันได้
//  (แตะ/คลิกการ์ดผู้เล่นตอนที่ไม่ได้เลือกเป้าโจมตี เพื่อเปิดดูคำอธิบายเต็ม)
const STATUS_INFO = {
  hbleed:    { icon: "🩸", label: "เลือดไหล", cls: "bg-echo-hp", desc: "เลือดไหล: เสียพลังชีวิต 1/เทิร์น (โดนเกราะก่อน แล้วลดลง 1 · สะสมสูงสุด 6) · ระหว่างติด การฟื้นพลังชีวิตเหลือครึ่ง (ฟื้นทีละ 1 ไม่ลด) · ต้านได้" },
  hburn:     { icon: "🔥", label: "ลุกไหม้", cls: "bg-echo-hp", desc: "ลุกไหม้: เสียพลังชีวิต 1 หน่วยทุกเทิร์น (ลดเกราะก่อน ลดลงทีละหน่วยหลังสร้างความเสียหาย) สะสมได้ไม่เกิน 6 หน่วย" },
  nodraw:    { icon: "🚫", label: "ห้ามจั่ว", cls: "bg-echo-hp", desc: "จั่วการ์ดเพิ่มไม่ได้ในเทิร์นนี้" },
  noskill:   { icon: "🚫", label: "ห้ามสกิล", cls: "bg-echo-hp", desc: "ห้ามใช้สกิล: ใช้สกิลไม่ได้ในเทิร์นนี้" },
  awaken:    { icon: "⏰", label: "ตื่นขึ้น", cls: "bg-echo-cyan text-gray-900", desc: "การตื่นขึ้น: ฟื้นพลังชีวิตเทิร์นละ 1" },
  sleep:     { icon: "💤", label: "หลับไหล", cls: "bg-echo-hp", desc: "หลับไหล: ออกการกระทำใดๆ ไม่ได้ และเสียเลือด 1/เทิร์นไม่สนเกราะ (ไม่ถึงตาย — ค้างที่ 1) — หายไปทันทีเมื่อเข้าเช้า" },
  poison:    { icon: "🧪", label: "พิษร้าย", cls: "bg-echo-magenta", desc: "พิษร้าย: ต้นเทิร์นเสียพลังชีวิต 1 หน่วย (ลดเกราะก่อน) และตลอดเวลาที่ติดอยู่ พลังโจมตีที่ทำได้ -1 · ต้าน/ล้างออกได้ด้วยต้านสถานะผิดปกติ" },
  shock:     { icon: "⚡", label: "ช็อต", cls: "bg-echo-ice text-gray-900", desc: "ช็อต: ต้นเทิร์น 15% สตั้น 1 เทิร์น (ต้านสถานะผิดปกติกันได้) · ถูกล้างลดทีละ 1 เทิร์น" },
  curse:     { icon: "🕸️", label: "คำสาป", cls: "bg-echo-magenta", desc: "คำสาป: ใช้สกิลสำเร็จเสียพลังชีวิต 1 (โดนเกราะก่อน ตายได้) 1 ครั้ง/เทิร์น · ถูกล้างลดทีละ 1 เทิร์น" },
  energy:    { icon: "🥤", label: "ชูกำลัง", cls: "bg-echo-cyan text-gray-900", desc: "เครื่องดื่มชูกำลัง: ได้แต้มสกิล +1 แต่เสียพลัง 1 หน่วยต่อเทิร์นแบบความเสียหายธรรมดา (โดนเกราะก่อน ไม่ถึงตาย — ค้างที่ 1)" },
  promo:     { icon: "📢", label: "เปิดแต้ม", cls: "bg-echo-ice text-gray-900", desc: "แต้มการ์ดถูกเปิดเผยให้ทุกคนเห็นตลอดเทิร์นนี้" },
  nohealing: { icon: "☠️", label: "ไร้ทางเยียวยา", cls: "bg-echo-hp", desc: "ไร้ทางเยียวยา: ฟื้นพลังชีวิตไม่ได้ ตามจำนวนเทิร์นที่เหลือ" },
  // ---------- สถานะพื้นฐาน universal (patch 2.0.8) ----------
  freecast:  { icon: "👸", label: "การ์ดราชินี", cls: "bg-echo-ice text-gray-900", desc: "การ์ดราชินี: ใช้สกิลครั้งถัดไปไม่เสียแต้มสกิล (หายเมื่อจบเทิร์นถ้าไม่ได้ใช้)" },
  stun:      { icon: "😵", label: "สตั้น", cls: "bg-echo-hp", desc: "สตั้น: ไม่สามารถทำอะไรได้จนจบเทิร์นหรือจนกว่าดีบัฟจะหมดเวลา" },
  chaa:     { icon: "🌀", label: "สภาพชา", cls: "bg-echo-hp", desc: "สภาพชา: กดจั่วการ์ด 1 ครั้งจะได้ไพ่ 2 ใบ (ใบที่ 2 สุ่มปกติ โชคลาภไม่ช่วย)" },
  accurate: { icon: "🎯", label: "แม่นยำ", cls: "bg-echo-ice text-gray-900", desc: "แม่นยำ: การโจมตีเจาะการหลบหลีกทุกแบบของเป้าหมาย (โล่กันครั้งยังกันได้)" },
  numb:     { icon: "🫨", label: "เหน็บชา", cls: "bg-echo-hp", desc: "เหน็บชา: กดสกิลแล้วมีโอกาส 30% ที่สกิลจะไม่ทำงาน แต่แต้มสกิลยังถูกหักตามเดิม" },
  weak:      { icon: "🥀", label: "อ่อนแอ", cls: "bg-echo-hp", desc: "อ่อนแอ: ดาเมจที่ทำได้ลดลงตามจำนวนที่ระบุ ตามจำนวนเทิร์นที่เหลือ" },
  fragile:   { icon: "💔", label: "เปราะบาง", cls: "bg-echo-hp", desc: "เปราะบาง: ดาเมจที่ได้รับเพิ่มขึ้นตามจำนวนที่ระบุ ตามจำนวนเทิร์นที่เหลือ" },
  might:     { icon: "💪", label: "เสริมพลัง", cls: "bg-echo-ice text-gray-900", desc: "เสริมพลัง: ดาเมจที่ทำได้เพิ่มขึ้นตามจำนวนที่ระบุ ตามจำนวนเทิร์นที่เหลือ" },
  spellflow: { icon: "🌀", label: "กระแสเวท", cls: "bg-echo-cyan text-gray-900", desc: "กระแสเวท: การใช้สกิลทุกชนิดใช้พลังงานลดลงตามจำนวนที่ระบุ ตามจำนวนเทิร์นที่เหลือ" },
  spellburden: { icon: "⛓️", label: "ภาระเวท", cls: "bg-echo-hp", desc: "ภาระเวท: สกิลทุกชนิดแพงขึ้นตามจำนวน (สูงสุด 2) · ราคาไม่เกิน 8 แต้ม" },
  manaSeal:  { icon: "⛔", label: "ผนึกพลังงาน", cls: "bg-echo-hp", desc: "ผนึกพลังงาน: ฟื้นฟูแต้มสกิลจากช่องทางใดๆ ไม่ได้เลย (เช้า/พรจั่วการ์ด/ไอเทม) ตามจำนวนเทิร์นที่เหลือ" },
  manaLeech: { icon: "🩸", label: "ดูดซับเวท", cls: "bg-echo-magenta", desc: "ดูดซับเวท: กดสกิล หรือได้พลังงานจากไอเทม/สกิลติดตัว 35% ถูกขโมยพลังงาน 1" },
  manaRupture: { icon: "💥", label: "ระเบิดมานา", cls: "bg-echo-hp", desc: "ระเบิดมานา: 2 เทิร์นแล้วระเบิดตามพลังงาน · 7-8 ดาเมจ 1 · 2-6 ดาเมจ 3 + ผนึกพลังเวทย์ 2 เทิร์น · 0-1 ดาเมจ 5 + ผนึกพลังเวทย์ 3 เทิร์น" },
  drunk: { icon: "🍷", label: "มึนเมา", cls: "bg-echo-magenta", desc: "มึนเมา: ลดลงทีละ 1 ทุกเทิร์น และเมื่อกดสกิลหรือจั่วไพ่มีโอกาสสุ่มติดห้ามจั่ว ห้ามสกิล หรือสตัน" },
  resist:    { icon: "🛡️", label: "ต้านผิดปกติ", cls: "bg-echo-ice text-gray-900", desc: "ต้านสถานะผิดปกติ: ล้างและกันดีบัฟพื้นฐาน (ขัดแย้ง/หลับ/สตั้น/ห้ามจั่ว/ห้ามสกิล/พิษ/อ่อนแอ/เปราะบาง/ภาระเวท)" },
  guard:     { icon: "💗", label: "คุ้มครอง", cls: "bg-echo-armor", desc: "คุ้มครอง: ความเสียหายจากการถูกโจมตีลดลงตามจำนวนที่ระบุ (ไม่ระบุ = 1) ตามจำนวนเทิร์นที่เหลือ" },
  fortune:   { icon: "🍀", label: "โชคลาภ", cls: "bg-echo-ice text-gray-900", desc: "โชคลาภ: จั่วครั้งถัดไปได้ไพ่ที่ทำให้แต้มรวมอยู่ที่ 19-21 (ถ้ามีไพ่ที่ทำได้) แล้วหายไป 1 หน่วย · ซ้อนได้ 3 · ไม่ได้ใช้ 3 เทิร์นติดหมดฤทธิ์" },
  empower:   { icon: "💪", label: "เสริมพลัง", cls: "bg-echo-ice text-gray-900", desc: "เสริมพลัง: การโจมตีครั้งถัดไป +1 ดาเมจ (ไม่ซ้อนทับ — หมดเมื่อได้โจมตี)" },
  discord:   { icon: "⚡", label: "ขัดแย้ง", cls: "bg-echo-hp", desc: "Discord: ความเสียหายที่ได้รับจากการถูกโจมตี +1 หน่วย ตามจำนวนเทิร์นที่เหลือ" },
  evade:     { icon: "💨", label: "หลบหลีก", cls: "bg-echo-cyan text-gray-900", desc: "หลบหลีก: หลบการโจมตีตาม % ที่ระบุ (ไม่ระบุ = 100%) · ซ้อนได้ 3 ใช้ไป 1 ทุกครั้งที่ถูกเลือกโจมตี · แต่ละครั้งอยู่ได้ 2 เทิร์น · ตัวเลข = จำนวนครั้งที่เหลือ" },
  netramana:   { icon: "✨", label: "เนตรมณะ", cls: "bg-echo-ice text-gray-900", desc: "เนตรมณะ: ตีปกติ 20% สังหารทันที · เป็นบัฟ (ยาต้านสถานะล้างไม่ได้) · ซ้อนกับโอกาสสังหารของตัวละครได้" },
  stagger: { icon: "🫨", label: "ชะงัก", cls: "bg-echo-hp", desc: "ชะงัก: ฟื้นฟูแต้มสกิลไม่ได้ทุกช่องทาง ตามจำนวนเทิร์นที่เหลือ" },
  muimiRusty: { icon: "🗡️", label: "ดาบเก่าๆ", cls: "bg-echo-armor", desc: "ดาบเก่าๆ: เมื่อโจมตีปกติจะฟื้นพลังชีวิต 1 หน่วย และแต้มสกิล 1 หน่วย — ระหว่างสถานะนี้ใช้ดาบสะบั้นหอคอยสวรรค์ไม่ได้" },
  muimiTower: { icon: "⚔️", label: "ดาบสะบั้น", cls: "bg-echo-ice text-gray-900", desc: "ดาบสะบั้น: โจมตีพื้นฐาน +3 · ตีปกติฟื้นพลังชีวิต 2 และยืดสถานะ +1 เทิร์น" },
  mend:      { icon: "💚", label: "เยียวยา", cls: "bg-echo-armor", desc: "เยียวยา: ต้นเทิร์นฟื้นพลังชีวิตเท่ากับจำนวนหน่วยที่ระบุ (1 หน่วย = 1 พลังชีวิต) — ซ้อนทับจำนวนเทิร์นได้สูงสุด 5 เทิร์น" },
  blind:     { icon: "🕶️", label: "ตาบอด", cls: "bg-echo-hp", desc: "ตาบอด: มองไม่เห็นอะไรเลยทั้งเทิร์น — ไพ่ แต้ม พลังงาน พลังชีวิต และเกราะของทุกคนรวมทั้งของตัวเอง ถูกปิดหมด" },
  // โอเบรอน (ฤดูร้อน)
  obsVeil:     { icon: "🌙", label: "ม่านแห่งราตรี", cls: "bg-echo-hp", desc: "ม่านแห่งราตรี (โอเบรอน ฤดูร้อน): พลังโจมตี +1 · ตัวเลข = จำนวนเทิร์นที่ยังเหลือ" },
  obsDream:    { icon: "💤", label: "จุดจบของความฝัน", cls: "bg-echo-hp", desc: "จุดจบของความฝัน (โอเบรอน ฤดูร้อน): พลังโจมตี +4 เฉพาะเทิร์นนี้ — จบเทิร์นแล้วจะติดสตั้น 3 เทิร์น (ต้านสถานะผิดปกติกันได้)" },
  obsLark:     { icon: "🐦", label: "นกจาบยามเช้า", cls: "bg-echo-magenta", desc: "นกจาบยามเช้า (โอเบรอน ฤดูร้อน): เมื่อเริ่มเทิร์นถัดไปจะเสียพลังชีวิต 2 หน่วยแบบไม่สนเกราะ (ต้านสถานะกันไม่ได้)" },
  oblada:   { icon: "🎵", label: "สิ่งแปลกปลอม", cls: "bg-echo-hp", desc: "ObLa Di, ObLa Da: รับความเสียหาย 1 หน่วยทุกๆ 2 เทิร์น เป็นเวลา 4 เทิร์น" },
  // ---------- สถานะ Universal (patch 2.2.1) ----------
  invert:     { icon: "🔄", label: "ผกผัน", cls: "bg-echo-hp", desc: "ผกผัน: ฟื้นเลือด/เกราะ กลายเป็นเสียแทน — เพิ่มพลังโจมตี กลายเป็นลดแทน ตามจำนวนเทิร์นที่เหลือ" },
  decay:      { icon: "🥀", label: "ผุพัง", cls: "bg-echo-hp", desc: "ผุพัง: เกราะฟื้นไม่ได้ ตามจำนวนเทิร์นที่เหลือ" },
};
// รวมสถานะทั้งหมดของผู้เล่นเป็นรายการเดียว — full = รวมของที่โชว์แยกที่อื่นด้วย (โล่/เลือดชั่วคราว)
function statusEntries(p, full) {
  const out = [];
  for (const [k, v] of Object.entries(p.statuses || {})) {
    if (!(v > 0)) continue;
    const info = STATUS_INFO[k] || { icon: "✦", label: k, cls: "bg-white/20", desc: "" };
    const amt = (p.statusAmt || {})[k] || 0; // จำนวน (amount) ของบัฟ/ดีบัฟพื้นฐาน (patch 2.0.8)
    out.push({ key: k, v, amt, ...info });
  }
  if ((p.muimiUltCd || 0) > 0) {
    out.push({ key: "muimiUltCd", v: p.muimiUltCd, icon: "⏳", label: `ดาบสะบั้นพักฟื้น ${p.muimiUltCd} เทิร์น`, cls: "bg-white/20", desc: "ดาบสะบั้นหมดเวลาแล้ว — ต้องรอให้ครบ 5 เทิร์นจึงใช้ดาบสะบั้นหอคอยสวรรค์ซ้ำได้ (ตัวเลขนี้ขึ้นทับบนการ์ดสกิลด้วย) · คุณเห็นอยู่คนเดียว" });
  }
  // เกราะ Mark 42: ใส่ชุดอยู่ (ของใคร / เกราะชุดเหลือเท่าไหร่)
  if (p.mark42) out.push({ key: "mark42", v: 1, icon: "🦾", label: `Mark 42 ${p.mark42.armor}/${p.mark42.max}`, cls: "bg-orange-500 text-gray-900",
    desc: `เกราะ Mark 42 (ของ ${p.mark42.ownerName}): พลังชีวิตกลายเป็นเกราะชุด ${p.mark42.max} หน่วย · พลังโจมตี +1 · ชุดพัง = กลับร่างเดิม · คนใส่ถอดเองไม่ได้` });
  if (full && (p.shield || 0) > 0) out.push({ key: "shield", v: p.shield, icon: "🛡️", label: "โล่", cls: "bg-echo-armor", desc: "กันความเสียหายครั้งถัดไปตามจำนวนโล่" });
  if (full && (p.tempHp || 0) > 0) out.push({ key: "tempHp", v: p.tempHp, icon: "💛", label: "เลือดชั่วคราว", cls: "bg-echo-ice text-gray-900", desc: "หายเองใน 2 เทิร์น หรือหมดไปเมื่อรับความเสียหาย" });
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
            title={`${it.label}${it.amt > 0 ? ` +${it.amt}` : ""}${showStatusValue(it) ? ` x${it.v}` : ""} — ${it.desc}`}
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
            title={`${it.label}${it.amt > 0 ? ` +${it.amt}` : ""}${showStatusValue(it) ? ` x${it.v}` : ""} — ${it.desc}`}
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
const showStatusValue = (it) => it.v > 1 && !isPermanentTurnValue(it);

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
      label={statusOnly ? "สถานะ" : "ข้อมูลผู้เล่น"}
      title={p.name}
      width="min(34rem, 94vw)"
      onClose={onClose}
      right={
        !statusOnly && p.img ? (
          <span className="av-frame relative block w-12 h-12 overflow-hidden shrink-0" style={{ border: `1px solid ${p.color}` }}>
            <img src={p.img} alt="" className="w-full h-full object-cover" />
          </span>
        ) : null
      }
    >
      <>
        {!statusOnly && (
          <div className="av-heading text-sm mb-4" style={{ color: "rgba(234,243,252,.6)" }}>
            {p.character?.name}
            {!p.connected && <span className="ml-2 text-xs" style={{ color: "var(--av-blood)" }}>• reconnecting</span>}
          </div>
        )}
        {items.length === 0 ? (
          <div className="av-label py-4 text-center" style={{ color: "rgba(234,243,252,.4)" }}>ไม่มีสถานะผิดปกติ</div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((it) => (
              <div key={it.key} className="av-item flex items-start gap-3">
                <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md font-bold shrink-0 ${it.cls}`}><span>{it.icon}</span><span>{it.label}{it.amt > 0 ? ` +${it.amt}` : ""}</span></span>
                <div className="min-w-0">
                  <span className="text-sm opacity-90 leading-snug">{it.desc}</span>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    {/* จำนวนซ้อนทับ (amount) — โชว์แยกชัดเจนเสมอเมื่อมีค่า ไม่ใช่แค่เลขเล็กๆ ในป้ายไอคอนด้านบนที่สังเกตยาก */}
                    {it.amt > 0 && <span className="text-xs font-bold text-echo-hp">📊 จำนวนซ้อนทับ +{it.amt}</span>}
                    {it.v > 1 && (
                      isPermanentTurnValue(it)
                        ? <span className="text-xs font-bold text-echo-cyan">📌 คงอยู่ถาวร</span>
                        : isPermanentStatus(it)
                          ? <span className="text-xs font-bold text-echo-cyan">📌 สแตคสะสม {it.v}</span>
                          : <span className="text-xs font-bold text-echo-ice">⏳ เหลือ {it.v} เทิร์น</span>
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
                          {label} · <span style={{ color: "var(--av-gold-lit)" }}>{s.name}</span>
                        </span>
                        <span className="text-xs shrink-0" style={{ color: "rgba(234,243,252,.5)" }}>
                          {s.cost != null ? `ใช้ ${s.cost}` : "ฟรี"}
                        </span>
                      </div>
                      <div className="text-xs leading-snug" style={{ color: "rgba(234,243,252,.72)" }}>{s.desc}</div>
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
// รูปไอคอนไอเทมทั้งหมด: ดึงมาแคชไว้ตั้งแต่เข้าเกม (ไฟล์เล็ก) กันไอคอนโหลดช้าตอนเปิดร้าน/กระเป๋าครั้งแรก
const ITEM_PRELOAD_IMGS = ["/item/guts_select_gun/guts_gun.webp", ...Object.values(GUTS_AMMO_INFO).map((a) => a.img)];
// วีดีโอกระสุนที่ผู้เล่นถืออยู่: โหลดล่วงหน้าไว้ในเบื้องหลัง (ไฟล์ 5-16MB) — ไม่งั้นตอนยิงจริงวีดีโอจะขึ้นช้า
//  แล้วโดนเวลาคัตซีนฝั่ง server ตัดจบก่อนวีดีโอเล่นจบ
function GutsVideoPreloader({ me, players }) {
  const ammoTypes = [...new Set((me?.inventory || []).filter((it) => it.type === "gutsAmmo").map((it) => it.ammo))];
  const preloadMuimi = (players || []).some((p) => p.character?.id === "muimi");
  if (!ammoTypes.length && !preloadMuimi) return null;
  return (
    <div aria-hidden className="hidden">
      {ammoTypes.map((a) => GUTS_AMMO_INFO[a] && (
        <video key={a} src={GUTS_AMMO_INFO[a].video} preload="auto" muted playsInline />
      ))}
      {preloadMuimi && <video src="/characters/muimi/muimi_skill3.mp4" preload="auto" muted playsInline />}
      {preloadMuimi && <video src="/characters/muimi/muimi_skill3_short.mp4" preload="auto" muted playsInline />}
    </div>
  );
}
// ไอคอนไอเทม: มีรูปจริงใช้รูป ไม่มีก็ใช้ emoji เดิม
function ItemIcon({ info, className = "" }) {
  if (info.img) return <img src={info.img} alt="" className={`object-contain shrink-0 ${className}`} onError={(e) => { e.currentTarget.style.display = "none"; }} />;
  return <span className={`shrink-0 ${className}`}>{info.icon}</span>;
}

// ร้านค้ามายา: ร้านเดียว 15 ช่อง ตั้งบนแผนที่ — ย้ายจุด + สุ่มของใหม่ทุก 5 เทิร์น (GRID_PLAN §8.1)
//  กริดขยายออกด้านข้าง (สูงสุด 5 คอลัมน์ = 3 แถว) ไม่ให้โมดัลยืดลงจนต้อง scroll แนวตั้ง
function ShopHerald() {
  const sparks = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2;
    const d = 12 + (i % 4) * 7;
    return {
      sx: `${(Math.cos(a) * d).toFixed(1)}vw`,
      sy: `${(Math.sin(a) * d * 0.7).toFixed(1)}vh`,
      size: 3 + (i % 3) * 2,
      delay: 0.2 + (i % 5) * 0.04,
    };
  });
  return (
    <div className="sh">
      <div className="sh-ribbon">
        {sparks.map((k, i) => (
          <span
            key={i}
            className="sh-spark"
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
        <svg className="sh-coin relative shrink-0" width="62" height="62" viewBox="0 0 62 62" aria-hidden="true">
          <defs>
            <linearGradient id="shCoinG" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f7fafd" />
              <stop offset="45%" stopColor="#eaf3fc" />
              <stop offset="100%" stopColor="#7fb8e6" />
            </linearGradient>
          </defs>
          <circle cx="31" cy="31" r="26" fill="url(#shCoinG)" />
          <circle cx="31" cy="31" r="21" fill="none" stroke="#1c3f6e" strokeWidth="1.4" opacity="0.6" />
          <path d="M31 16 L35.6 26.4 L47 27.6 L38.5 35.2 L41 46.4 L31 40.6 L21 46.4 L23.5 35.2 L15 27.6 L26.4 26.4 Z" fill="#1c3f6e" opacity="0.55" />
        </svg>
        <div className="relative min-w-0">
          <div className="av-label">ร้านค้ามายา</div>
          <div className="av-title av-title-thai text-4xl leading-tight whitespace-nowrap">ปรากฏ</div>
        </div>
      </div>
    </div>
  );
}

function ShopModal({ shop, me, block, turnsLeft, onClose }) {
  const list = shop;
  const hasGun = (me?.inventory || []).some((i) => i.type === "gutsGun");
  return (
    <AvModal
      label="ร้านค้า"
      title="ร้านค้ามายา"
      width="min(72rem, 94vw)"
      onClose={onClose}
      right={<span className="flex gap-2">
        {turnsLeft > 0 && <span className="av-chip"><span>เหลือ {turnsLeft} เทิร์น</span></span>}
        <span className="av-chip av-chip-gold"><span>🪙 {me?.gold ?? 0}</span></span>
      </span>}
    >
      <>
        {(!list || list.length === 0) ? (
          <div className="av-label py-10 text-center" style={{ color: "rgba(234,243,252,.4)" }}>ไม่มีของ</div>
        ) : (
          <div className="grid grid-cols-5 gap-3">
            {list.map((it) => {
              const info = shopInfoOf(it);
              const sold = !!it.sold;
              const afford = (me?.gold ?? 0) >= it.price;
              // เกราะ Mark 42: มีได้ชุดเดียว (ในกระเป๋าหรือส่งออกไปแล้ว) · ชุดพังจากการต่อสู้ ซื้อใหม่ไม่ได้ 10 เทิร์น
              const suitLock = it.type === "mark42" ? (me?.mark42BuyLock || 0) : 0;
              const owned = (it.type === "mark42" && (!!me?.mark42Owned || (me?.inventory || []).some((x) => x.type === "mark42"))) || (it.type === "gutsGun" && hasGun); // ปืนมีได้กระบอกเดียว
              return (
                <div
                  key={it.id}
                  className={`av-frame av-panel av-gild-hover relative p-3 flex flex-col items-center text-center gap-1.5 ${sold ? "opacity-40" : "av-panel-gilded"}`}
                >
                  <ItemIcon info={info} className="text-3xl h-12 w-12" />
                  <div className="av-heading text-xs leading-tight">{info.label(it)}</div>
                  <div className="text-[11px] leading-snug line-clamp-3" style={{ color: "rgba(234,243,252,.6)" }}>{info.desc}</div>
                  <div className="mt-auto w-full flex flex-col items-center gap-2 pt-2">
                    <div className="av-label" style={{ fontSize: "0.7rem" }}>
                      🪙 {it.price}
                      {/* การเดินทาง (ทุ่งดอกไม้ กลางคืน): ช่องนี้ซื้อได้หลายชิ้น */}
                      {it.stockMax > 1 && !sold && <span style={{ color: "var(--av-gold-lit)" }}> · เหลือ {it.stock}/{it.stockMax}</span>}
                    </div>
                    <AvButton
                      className="w-full py-1.5 text-xs px-2"
                      disabled={sold || owned || suitLock > 0 || !afford || !!block}
                      onClick={() => { playSfx("buy_something"); socket.emit("buyShopItem", { itemId: it.id }); }}
                    >
                      {sold ? "ขายแล้ว" : owned ? "มีแล้ว" : suitLock > 0 ? `รออีก ${suitLock} เทิร์น` : !afford ? "เหรียญไม่พอ" : block || "ซื้อ"}
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

function InventoryModal({ me, players, gameState, roundNumber, onPickGunAmmo, myTurn, bagSlots = 5, onPickSuit, onClose }) {
  const items = me?.inventory || [];
  // ปืนหน่วย GUTS Select: กดที่ปืน -> เลือกกระสุนในกระเป๋า -> ปิดกระเป๋าแล้วไปเลือกเป้าหมายบนกระดานต่อ
  const [gunOpen, setGunOpen] = useState(false);
  // เกราะ Mark 42: เลือกโหมดที่ต้องเลือกเป้าหมาย ("give" | "bomb") ของชุดในกระเป๋า (มือถือ — จอคอมเลือกบนกระดาน)
  const [suitMode, setSuitMode] = useState(null);
  // ใส่ให้ / ระเบิดใส่ / เรียกคืน ต้องยืนติดกัน (GRID_PLAN §8.1)
  const adjacent = (a, b) => !!a?.pos && !!b?.pos && Math.abs(a.pos.x - b.pos.x) + Math.abs(a.pos.y - b.pos.y) === 1;
  const suitTargets = (players || []).filter((p) => p.alive && p.id !== me?.id && !p.mark42 && (!me?.pos || adjacent(me, p)));
  // ใช้ของได้เฉพาะตาเดินของตัวเอง (ระบบกระดาน)
  const turnBlock = !myTurn ? "ใช้ได้เฉพาะตาของคุณ" : null;
  const suitBlock = turnBlock;
  const applySuit = (uid, mode, targetId) => { clickSound(); socket.emit("useInventoryItem", { uid, mode, targetId }); setSuitMode(null); };
  const suitControl = (action) => { clickSound(); socket.emit("mark42Control", { action }); };
  const suitOut = me?.mark42Owned || null;
  const suitWearer = suitOut ? (players || []).find((p) => p.id === suitOut.wearerId) : null;
  const recallBlock = suitBlock || (suitWearer && !adjacent(me, suitWearer) ? "ต้องยืนติดกัน" : null);

  const ammoItems = items.filter((it) => it.type === "gutsAmmo");
  const targets = (players || []).filter((p) => p.alive && p.id !== me?.id && !(me?.teamId && p.teamId === me.teamId));
  // เหตุผลที่ยิงไม่ได้ (โชว์ให้เห็นเลย ไม่ปล่อยให้กดแล้วเงียบ)
  const fireBlock =
    !myTurn ? "ยิงได้เฉพาะตาของคุณ"
    : (me?.gutsShotTurn || 0) === roundNumber ? "ยิงไปแล้วในเทิร์นนี้ (1 นัด/เทิร์น)"
    : ammoItems.length === 0 ? "ไม่มีกระสุน — ซื้อได้ที่ร้านค้ามายา"
    : targets.length === 0 ? "ไม่มีเป้าหมายให้ยิง"
    : null;

  function applyItem(uid) { clickSound(); socket.emit("useInventoryItem", { uid }); }
  // ทิ้งของ: ตาตัวเองเท่านั้น ไม่นับเป็นการใช้
  function dropItem(uid) { clickSound(); socket.emit("dropItem", { uid }); }
  // ใส่ให้ / ระเบิดใส่: จอคอมไปเลือกคนที่ยืนติดกันบนกระดาน · มือถือเลือกจากรายชื่อด้านล่าง
  function chooseSuitMode(uid, mode) {
    clickSound();
    if (onPickSuit) { onPickSuit(uid, mode); return; }
    setSuitMode(suitMode === mode ? null : mode);
  }
  function toggleGun() { clickSound(); setGunOpen((v) => !v); }
  // เลือกกระสุนแล้วเด้งไปโหมดเลือกเป้าหมายบนกระดานทันที (กดที่การ์ดผู้เล่นจริง ไม่ใช่กดชื่อในกระเป๋า)
  function pickAmmo(a) {
    clickSound();
    setGunOpen(false);
    onPickGunAmmo(a);
  }

  return (
    <AvModal label="กระเป๋า" title={`กระเป๋าของ ${me?.name || ""}`} width="min(34rem, 94vw)" onClose={onClose}
      right={<span className="av-chip"><span>{items.length}/{bagSlots}</span></span>}>
      <>
        {suitOut && (
          <div className="av-item flex flex-col gap-2 mb-2" style={{ borderLeftColor: "#f97316" }}>
            <div className="flex items-center gap-3">
              <img src="/characters/Mark42/mark42.webp" alt="" className="h-10 w-10 rounded object-cover" />
              <div className="min-w-0 flex-1">
                <div className="av-heading text-sm">เกราะ Mark 42 — {suitOut.self ? "สวมอยู่ที่ตัวเอง" : `สวมอยู่ที่ ${suitOut.wearerName}`}</div>
                <div className="text-xs" style={{ color: "rgba(234,243,252,.62)" }}>เกราะชุดเหลือ {suitOut.armor}/7 · คนใส่ถอดเองไม่ได้ เจ้าของเท่านั้นที่ถอด/เรียกคืน/ระเบิดได้</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {!suitOut.self && <AvButton className="px-3 py-1.5 text-xs" disabled={!!recallBlock || !!me?.mark42} title={me?.mark42 ? "ใส่ชุดอยู่แล้ว" : recallBlock || ""} onClick={() => suitControl("recall")}>เรียกคืนมาใส่เอง</AvButton>}
              <AvButton className="px-3 py-1.5 text-xs" disabled={!!suitBlock} title={suitBlock || ""} onClick={() => suitControl("remove")}>ถอดออก</AvButton>
              {!suitOut.self && <AvButton className="px-3 py-1.5 text-xs" disabled={!!suitBlock} title={suitBlock || ""} onClick={() => suitControl("detonate")}>💥 สั่งระเบิด (2)</AvButton>}
            </div>
          </div>
        )}
        {items.length === 0 ? (
          <div className="av-label py-8 text-center" style={{ color: "rgba(234,243,252,.4)" }}>ยังไม่มีของในคลัง</div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((it) => {
              const info = shopInfoOf(it);
              const isGun = it.type === "gutsGun";
              const isAmmo = it.type === "gutsAmmo";
              const isSuit = it.type === "mark42";
              return (
                <div key={it.uid} className="av-item flex flex-col gap-2" style={isGun ? { borderLeftColor: "var(--av-gold-mid)" } : undefined}>
                  <div className="flex items-center gap-3">
                    <ItemIcon info={info} className="text-2xl h-10 w-10" />
                    <div className="min-w-0 flex-1">
                      <div className="av-heading text-sm">{info.label(it)}</div>
                      <div className="text-xs leading-snug" style={{ color: "rgba(234,243,252,.62)" }}>{info.desc}</div>
                    </div>
                    {isGun ? (
                      <AvButton className="px-4 py-1.5 text-xs shrink-0" disabled={!gunOpen && !!fireBlock} title={fireBlock || ""} onClick={toggleGun}>
                        {gunOpen ? "ยกเลิก" : "ยิง"}
                      </AvButton>
                    ) : isSuit ? (
                      <span className="av-label shrink-0 text-right" style={{ fontSize: "0.62rem" }}>{suitBlock || "เลือกวิธีใช้ด้านล่าง"}</span>
                    ) : isAmmo ? (
                      <span className="av-label shrink-0 text-right" style={{ fontSize: "0.62rem" }}>ใช้ผ่านปืน</span>
                    ) : (
                      <AvButton className="px-4 py-1.5 text-xs shrink-0" disabled={!!turnBlock} title={turnBlock || ""} onClick={() => applyItem(it.uid)}>ใช้</AvButton>
                    )}
                    <AvButton className="px-3 py-1.5 text-xs shrink-0" disabled={!myTurn} onClick={() => dropItem(it.uid)}>ทิ้ง</AvButton>
                  </div>
                  {isSuit && (
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap gap-2">
                        <AvButton className="px-3 py-1.5 text-xs" disabled={!!suitBlock || !!me?.mark42} title={me?.mark42 ? "ใส่ชุดอยู่แล้ว" : ""} onClick={() => applySuit(it.uid, "self")}>🦾 ใส่ให้ตัวเอง</AvButton>
                        <AvButton className="px-3 py-1.5 text-xs" disabled={!!suitBlock || !suitTargets.length} title={!suitTargets.length ? "ต้องยืนติดกัน" : ""} onClick={() => chooseSuitMode(it.uid, "give")}>ใส่ให้ผู้เล่นอื่น</AvButton>
                        <AvButton className="px-3 py-1.5 text-xs" disabled={!!suitBlock || !suitTargets.length} title={!suitTargets.length ? "ต้องยืนติดกัน" : ""} onClick={() => chooseSuitMode(it.uid, "bomb")}>💥 ใส่ให้แล้วระเบิด (2)</AvButton>
                      </div>
                      {suitMode && (
                        <div className="rounded-lg bg-black/40 p-2">
                          <div className="text-xs opacity-80 mb-1">{suitMode === "give" ? "เลือกคนที่จะใส่ชุดให้:" : "เลือกคนที่จะส่งชุดไประเบิดใส่:"}</div>
                          <div className="flex flex-wrap gap-2">
                            {suitTargets.map((t) => (
                              <button key={t.id} className="text-xs font-bold rounded-lg px-3 py-1.5 border border-white/25 bg-white/10 hover:bg-white/20" onClick={() => applySuit(it.uid, suitMode, t.id)}>{t.name}</button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {isGun && !gunOpen && fireBlock && <div className="text-[11px]" style={{ color: "#e06a78" }}>⚠️ {fireBlock}</div>}
                  {isGun && gunOpen && (
                    <div className="rounded-lg bg-black/40 p-2">
                      <div className="text-xs opacity-80 mb-1">เลือกกระสุน (เลือกแล้วไปจิ้มเป้าหมายบนกระดาน):</div>
                      <div className="flex flex-wrap gap-2">
                        {ammoItems.map((a) => {
                          const ai = shopInfoOf(a);
                          return (
                            <button key={a.uid} className="flex flex-col items-center gap-1 w-20 rounded-lg border border-white/15 bg-black/30 p-1.5 hover:border-echo-ice transition-colors" onClick={() => pickAmmo(a)}>
                              <ItemIcon info={ai} className="h-9 w-9" />
                              <span className="text-[10px] leading-tight text-center">{ai.label(a)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
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
    <AvModal label="ข้อมูลตัวละคร" title={ch.name} width="min(34rem, 94vw)" onClose={onClose}>
      <>
        <div className="flex flex-col gap-2">
          {[["สกิลติดตัว", ch.passive], ["สกิลพื้นฐาน", ch.basic], ["สกิลรอง", ch.secondary], ["ท่าไม้ตาย", ch.ultimate]].map(([label, s], i) =>
            s ? (
              <div key={i} className="av-item">
                <div className="flex justify-between gap-3">
                  <span className="av-heading text-sm">
                    {label} · <span style={{ color: "var(--av-gold-lit)" }}>{s.name}</span>
                  </span>
                  <span className="text-xs shrink-0" style={{ color: "rgba(234,243,252,.5)" }}>
                    {s.cost != null ? `ใช้ ${s.cost}` : "ฟรี"}
                  </span>
                </div>
                <div className="text-sm mt-1 leading-snug" style={{ color: "rgba(234,243,252,.78)" }}>{s.desc}</div>
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
                  <span className="text-sm leading-snug" style={{ color: "rgba(234,243,252,.85)" }}>{it.desc}</span>
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
        style={{ fontFamily: "var(--font-av-display)", fontWeight: 700, fontSize: "1.2rem", color: low ? "#ff8a94" : "#ffffff" }}
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
  const [showChar, setShowChar] = useState(false);
  const [flash, setFlash] = useState(null); // สกิลช่วงจั่วการ์ด เด้งทันทีบนกระดาน
  const [notice, setNotice] = useState(null); // แปลงร่างซ้ำ (ครั้งที่ 2 เป็นต้นไป) เด้งแจ้งเตือนทันที ไม่หยุดเกม
  const [giftSel, setGiftSel] = useState(null);              // โอเบรอน (ฤดูร้อน): { tier, anyone } ที่กำลังรอจิ้มเป้าหมาย
  const [journeyInfoOpen, setJourneyInfoOpen] = useState(false);   // การเดินทาง: หน้าต่างอ่านผลของภูมิภาคปัจจุบัน
  const [gunSel, setGunSel] = useState(null);                // ปืนหน่วย GUTS Select: กระสุนที่เลือกไว้ รอจิ้มเป้าหมายบนกระดาน (เลือกตัวเองไม่ได้)
  // จอคอม (ระบบกระดาน): โหมดเลือกเป้า/ทิศบนกระดาน — { kind: "skill", tier } | { kind: "gun", item } | { kind: "suit", uid, mode }
  const [pickReq, setPickReq] = useState(null);
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
  const [shopOpen, setShopOpen] = useState(false);
  // นับครั้งการแสดง ไม่ใช่ true/false — ค่าต้องเปลี่ยนทุกครั้งที่เข้าช่วง ไม่งั้น React ไม่ remount
  // แล้วอนิเมชันจะเล่นแค่ครั้งแรกครั้งเดียวตลอดทั้งแมตช์
  const [sceneQ, setSceneQ] = useState([]);
  const sceneSeq = useRef(0);
  const prevPhaseRef = useRef(null);
  // ประกาศช่วงละครั้งต่อเทิร์น — phase กลับมาเป็น PLAYING/ATTACK ซ้ำได้หลายรอบในเทิร์นเดียว
  //  (เช่น จบคัตซีนท่าไม้ตาย)
  //  ถ้าไม่กันไว้ ฉากจะเด้งซ้อนกันทุกครั้งที่กลับเข้า phase เดิม
  const announced = useRef({ draw: 0, atk: 0 });
  const [deckOpen, setDeckOpen] = useState(false);   // สมุดการ์ดกองกลาง: กดที่กองการ์ดกลางเพื่อดู
  const shopAutoShown = useRef(-1);                  // จำรอบร้านค้าที่เด้งอัตโนมัติไปแล้ว (กันเด้งซ้ำ)
  const vp = useViewport();
  const { flights: cardFlights, removeFlight: removeCardFlight, deckRef, selfHandRef, registerOther } = useCardFlights(state);
  const phase = state.gameState;

  // ---------- ตัวขับคิวฉากประกาศ ----------
  //  ฉากถัดไปเริ่มนับเวลาก็ต่อเมื่อฉากก่อนหน้าเล่นจบแล้วเท่านั้น
  //  TRANSITION = ช่วงของแบนเนอร์เปลี่ยนเทิร์น · CUTSCENE = วีดีโอเต็มจอ — ทั้งคู่กั้นคิวไว้ก่อน
  const scene = sceneQ[0] || null;
  const sceneBlocked = phase === "TRANSITION" || phase === "CUTSCENE";
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
  const me = state.players.find((p) => p.id === state.youId);
  const others = state.players.filter((p) => p.id !== state.youId);
  const arenaJourney = state.journey;
  const seatOthers = others;
  const iAmAttacker = phase === "ATTACK" && state.attackerId === state.youId;
  const attacker = state.players.find((p) => p.id === state.attackerId);
  const rankedTiers = rankTiers(state.players);
  const summaryWinners = rankedTiers[0]?.players || [];
  const summaryLosers = rankedTiers.slice(1).flatMap((t) => t.players);
  const done = me && (me.locked || !me.alive);
  const ch = me?.character;
  const meStatuses = me ? statusEntries(me) : []; // รายการสถานะของตัวเอง — ใช้ในกล่อง "สถานะ" ของแผง HUD (เรียงลงล่างเรื่อยๆ ตามลำดับที่ติด)
  // ---------- ระบบกระดาน (GRID_PLAN.md): ตาเดินของเรา · ร้านบนแผนที่ · กระเป๋า ----------
  const myTurn = !!me && me.alive && phase === "ACTION" && state.actorId === me.id && !!state.action;
  const teamMode = state.gameMode === "duo" || state.gameMode === "trio";
  const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  const nearShop = !!(me?.pos && state.shopPos && manhattan(me.pos, state.shopPos) === 1);
  const bagFull = (me?.inventory?.length || 0) >= (state.bagSlots || 5);
  const shopBlock = !myTurn ? "ไม่ใช่ตาของคุณ" : !nearShop ? "ต้องอยู่ติดร้าน" : bagFull ? "กระเป๋าเต็ม" : null;
  // ป้ายระยะบนปุ่มสกิล (GRID_PLAN §7.2)
  const areaText = (a) => !a ? "" : a.kind === "target" ? `ระยะ ${a.range}` : a.kind === "aoe" ? `รอบตัว ${a.range}`
    : a.kind === "line" ? `ทิศทาง ${a.len}×${a.width}` : a.kind === "field" ? "ทั้งสนาม" : "";
  // สกิลเลือกเป้าที่ไม่มีใครอยู่ในระยะ = กดไม่ได้ (เลือกตัวเองได้ = มีเป้าเสมอ)
  const noTargetInRange = (a) => !!a && a.kind === "target" && !a.self && !!me?.pos
    && !state.players.some((p) => p.alive && p.pos && p.id !== me.id && manhattan(p.pos, me.pos) <= (a.range || 0));
  const enemyOf = (p) => !!me && p.id !== me.id && !(teamMode && me.teamId && p.teamId === me.teamId);
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
  // ร้านค้ามายา (patch 2.2 full): เด้งหน้าร้านค้าอัตโนมัติครั้งเดียวทุกครั้งที่มีสินค้าชุดใหม่ (รอบร้านค้าเปลี่ยน)
  useEffect(() => {
    const seq = state.shop?.[0]?.id?.split("_")[1];
    if (seq && shopAutoShown.current !== seq) {
      shopAutoShown.current = seq;
      pushScene("shop"); // ไม่ต้องหน่วง 2.7 วิเองแล้ว คิวจัดลำดับให้ต่อท้ายฉากต้นเทิร์นเอง
    }
  }, [state.shop, pushScene]);
  // ผู้เล่นที่กำลังเปิดดูสถานะ (ข้อมูลสดจาก state ทุกครั้งที่ re-render)
  const statusView = statusViewId ? state.players.find((x) => x.id === statusViewId) : null;
  // กลางวัน/กลางคืน (patch 1.7): สลับทุก 3 เทิร์น — โอเบรอนสลับร่าง/ท่าไม้ตายตามช่วงเวลา
  const nightNow = state.cycle === "night";
  // ห้ามจั่วการ์ดเพิ่มเทิร์นนี้
  const noDraw = !!(me && me.statuses?.nodraw);
  // ห้ามใช้สกิลเทิร์นนี้
  const noSkill = !!(me && me.statuses?.noskill);
  const isMuimi = ch?.id === "muimi"; // เสบียงฉุกเฉินไม่นับเป็นการใช้สกิลหลักของเทิร์น
  const muimiUltCd = isMuimi ? (me?.muimiUltCd || 0) : 0;
  // โอเบรอน (ฤดูร้อน): server ส่งล็อก/คูลดาวน์รายช่องมาเป็นก้อนกลาง (skillLocks)
  const giftLocks = me?.skillLocks || {};
  const giftCd = (t) => (giftLocks[t] && giftLocks[t].cd) || 0;
  const giftLocked = (t) => !!(giftLocks[t] && (giftLocks[t].locked || giftLocks[t].cd > 0));
  // free = ช่องนี้ไม่กินโควตา 1 สกิล/เทิร์น — skillUsed แล้วยังกดได้
  const giftFree = (t) => !!(giftLocks[t] && giftLocks[t].free);
  const muimiBasicLocked = isMuimi && ((me?.muimiEmergencyUses || 0) <= 0 || !!me?.muimiEmergencyUsed);
  const muimiSecLocked = isMuimi && (me?.statuses?.muimiTower || 0) > 0;
  const muimiUltLocked = isMuimi && ((me?.statuses?.muimiRusty || 0) > 0 || muimiUltCd > 0);

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
  // เสียงสั้นๆ จาก server ที่ทุกคนได้ยิน (ไม่มีป้าย)
  useEffect(() => {
    const onSfx = (f) => { if (f?.sound) playSfx(f.sound); };
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
      const kind = ch?.[tier]?.area?.kind || "self";
      if (kind === "target" || kind === "aoe" || kind === "line") { setPickReq({ kind: "skill", tier }); return; }
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
  //  ถ้าผู้เล่นปิด "ยืนยันสกิล" จากหน้าโต๊ะรวมผู้เล่น -> ข้ามป๊อปอัป ใช้สกิลทันทีที่กดช่อง
  const requestSkillUse = (tier, skillData, label, useCost) => {
    if (!skillConfirmOn) { skill(tier); return; }
    setSkillConfirm({ tier, skillData, label, useCost });
  };
  const cancelSkillConfirm = () => { clickSound(); setSkillConfirm(null); };
  const confirmSkillUse = () => {
    if (!skillConfirm) return;
    const t = skillConfirm.tier;
    setSkillConfirm(null);
    skill(t);
  };
  // ปืนหน่วย GUTS Select: เลือกกระสุนจากกระเป๋าแล้วปิดกระเป๋า เข้าโหมดจิ้มเป้าหมายบนกระดาน -> จิ้มแล้วยิงทันที
  const startGunPick = (ammoItem) => {
    setBagOpen(false);
    if (vp.w >= 768) setPickReq({ kind: "gun", item: ammoItem });
    else setGunSel(ammoItem);
  };
  // เกราะ Mark 42 ใส่ให้ / ระเบิดใส่: ปิดกระเป๋าแล้วเลือกคนที่ยืนติดกันบนกระดาน
  const startSuitPick = (uid, mode) => {
    setBagOpen(false);
    setPickReq({ kind: "suit", uid, mode });
  };
  // หมดตาเรา / ของถูกใช้ไปแล้ว = ออกจากโหมดเลือกเป้า
  useEffect(() => {
    if (!pickReq) return;
    const gone = (pickReq.kind === "gun" && !(me?.inventory || []).some((it) => it.uid === pickReq.item.uid))
      || (pickReq.kind === "suit" && !(me?.inventory || []).some((it) => it.uid === pickReq.uid));
    if (!myTurn || gone) setPickReq(null);
  }, [pickReq, myTurn, me?.inventory]);
  // โหมดเลือกเป้าที่ส่งให้ BoardStage
  let boardPick = null;
  if (pickReq && me) {
    const done = () => setPickReq(null);
    if (pickReq.kind === "skill") {
      const s = ch?.[pickReq.tier];
      const a = s?.area || {};
      const label = `${s?.name || ""} · ${areaText(a)}`;
      const tier = pickReq.tier;
      if (a.kind === "target") boardPick = { kind: "target", range: [1, a.range || 0], self: !!a.self, label, onPick: (id) => { socket.emit("useSkill", { tier, targets: [id] }); done(); }, onCancel: done };
      else if (a.kind === "aoe") boardPick = { kind: "aoe", radius: a.range || 0, label, onConfirm: () => { socket.emit("useSkill", { tier }); done(); }, onCancel: done };
      else if (a.kind === "line") boardPick = { kind: "line", len: a.len || 1, width: a.width || 1, label, onPick: (dir) => { socket.emit("useSkill", { tier, dir }); done(); }, onCancel: done };
    } else if (pickReq.kind === "gun") {
      const item = pickReq.item;
      boardPick = { kind: "target", range: state.gutsRange || [1, 4], allow: enemyOf, label: `ยิง ${shopInfoOf(item).label(item)}`, onPick: (id) => { socket.emit("useInventoryItem", { uid: item.uid, targetId: id }); done(); }, onCancel: done };
    } else if (pickReq.kind === "suit") {
      const { uid, mode } = pickReq;
      boardPick = { kind: "target", range: [1, 1], allow: (p) => !p.mark42 && p.id !== me.id, label: mode === "bomb" ? "Mark 42 · ระเบิดใส่" : "Mark 42 · ใส่ให้", onPick: (id) => { socket.emit("useInventoryItem", { uid, mode, targetId: id }); done(); }, onCancel: done };
    }
  }
  const pickGunTarget = (id) => {
    socket.emit("useInventoryItem", { uid: gunSel.uid, targetId: id });
    setGunSel(null);
  };
  const pickGift = (id) => {
    socket.emit("useSkill", { tier: giftSel.tier, targets: [id], item: giftSel.item });
    setGiftSel(null);
  };
  // ไอคอนไอเทม: ดึงมาแคชไว้ตั้งแต่เข้าเกม กันโหลดช้าตอนเปิดร้าน/กระเป๋าครั้งแรก
  useEffect(() => { for (const src of ITEM_PRELOAD_IMGS) { const im = new Image(); im.src = src; } }, []);
  // ปืน GUTS Select: หลุดโหมดเลือกเป้าหมายเมื่อออกจากช่วงจั่วไพ่/เปิดไพ่แล้ว หรือกระสุนนัดนั้นถูกใช้ไปแล้ว
  useEffect(() => {
    if (gunSel && (phase !== "PLAYING" || done || !(me?.inventory || []).some((it) => it.uid === gunSel.uid))) setGunSel(null);
  }, [gunSel, phase, done, me?.inventory]);
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
    gunSel, pickGunTarget,
    giftSel, pickGift,
    myId: me?.id,
    myTeamId: me?.teamId,
    teamModeActive: state.gameMode === "duo" || state.gameMode === "trio",
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
        {gunSel && (
          <div className="shrink-0 text-center mt-1.5 text-hard">
            <span className="text-lg font-black text-echo-hp animate-pulse">🔫 แตะเลือกเป้าหมาย {shopInfoOf(gunSel).label(gunSel)}</span>
            <button onClick={() => { clickSound(); setGunSel(null); }} className="ml-2 text-sm font-bold bg-black/60 rounded-full px-3 py-1 border border-white/30">ยกเลิก</button>
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
                  <SkillSlot label="สกิลรอง" tier="secondary" skill={ch?.secondary} points={me.skillPoints} disabled={done || phase !== "PLAYING" || noSkill || me.skillUsed || muimiSecLocked} onUse={requestSkillUse} />
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
                  onClick={() => { clickSound(); setShopOpen(true); }}
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

        {scene?.kind === "shop" && <ShopHerald key={scene.id} />}

        {phase === "GAMEOVER" && (
          <VictoryScreen state={state} onBackToLobby={() => socket.emit("backToLobby")} />
        )}

        <ModalMounts
          showChar={showChar} ch={ch} me={me} onCloseChar={() => setShowChar(false)}
          statusView={statusView} statusViewIsSelf={statusViewId === state.youId} onCloseStatus={() => setStatusViewId(null)}
          shopOpen={shopOpen} shop={state.shop} onCloseShop={() => setShopOpen(false)} shopBlock={shopBlock} shopTurnsLeft={state.shopTurnsLeft}
          bagOpen={bagOpen} onCloseBag={() => setBagOpen(false)} players={state.players} gameState={state.gameState} roundNumber={state.roundNumber} onPickGunAmmo={startGunPick}
          myTurn={myTurn} bagSlots={state.bagSlots}
          skillConfirm={skillConfirm} onConfirmSkill={confirmSkillUse} onCancelSkill={cancelSkillConfirm}
        />
      </div>
    );
  }

  // ---- จอคอม/แท็บเล็ต: กระดานเดินได้แบบ Fire Emblem (GRID_PLAN §11) ----
  //  กระดาน/ตัวละคร/แถบลำดับเดิน/คาดการณ์ อยู่ใน board/BoardStage.jsx · ไฟล์นี้คุม HUD ล่าง + เงื่อนไขกดได้/ไม่ได้
  //  กำลังเลือกเป้าบนกระดาน → แผงตัวเราเลื่อนลงพ้นจอ ไม่บังกระดาน
  const hudAway = !!me && !!boardPick;
  // ขนาด UI แผงตัวเรา: ออกแบบที่หน่วยฐาน 1440×810 แล้วขยายตามจอ (1080p = ×1.333)
  //  ความกว้างฐานขั้นต่ำ 1376 = ซ้าย+กลาง+ขวาเรียงได้ไม่ชนกัน (จอแคบ/4:3 จึงย่อตามความกว้าง)
  const hudZ = Math.min(1.6, Math.max(0.6, Math.min(vp.h / 810, vp.w / 1376)));
  const inBoardTurn = phase === "ORDER" || phase === "ACTION" || phase === "ATTACKING";

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: nightNow ? "#0b1830" : "#dfeaf6" }}>
      {state.board ? (
        <BoardStage state={state} me={me} lowQ={lowQ} vp={vp} pick={boardPick} onInspect={setStatusViewId} registerOther={registerOther} />
      ) : (
        <GameBackground cycle={state.cycle} round={state.roundNumber} lowQ={lowQ} journey={arenaJourney} />
      )}
      {/* กองการ์ดกลาง: ขอบซ้ายกลางจอ (การ์ดบินออกจากตรงนี้ไปมือเรา/แถบลำดับเดิน) */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-[18]">
        <DeckPile hostRef={deckRef} size="md" onClick={() => setDeckOpen(true)} />
      </div>
      {deckOpen && <DeckLedgerModal ledger={state.deckLedger || []} onClose={() => setDeckOpen(false)} />}

      {/* QTE — ลอยกลางจอ */}
      {me?.qte && <QtePanel key={me.qte.idx} qte={me.qte} />}

      {/* แถบซ้ายบน: กลางวัน/คืน · รอบ · เวลา · ภูมิภาค */}
      <HudTopBar
        night={nightNow}
        round={phase === "PLAYING" || inBoardTurn ? state.roundNumber : null}
        timer={<BoardTimer phaseKey={`${phase}-${state.roundNumber}-${state.actorId || ""}`} />}
        journey={state.journey && (phase === "PLAYING" || inBoardTurn)
          ? { ...journeyArea(state.journey.area), name: state.journey.name, turnsLeft: state.journey.turnsLeft }
          : null}
        onJourney={() => { clickSound(); setJourneyInfoOpen(true); }}
        zoom={hudZ}
      />

      {/* ---------- แผงตัวเรา (ดีไซน์ HudMain — กระจกน้ำเงินตัดมุม) ----------
          ซ้ายล่าง = แผงผู้เล่น · ขอบซ้าย = ลิ้นชักสถานะ · กลางล่าง = แต้ม · มือไพ่ · จั่ว/พอ (ช่วงจั่ว) หรือ ย้อน/รอ (ตาเดิน)
          ขวาล่าง = แต้มสกิล · กระเป๋า · ร้านค้า · สกิล 3 ช่อง (ป้ายระยะ) — ส่วนวาดอยู่ที่ hud/SelfHud.jsx */}
      {me && (
        <SelfHud
          hidden={hudAway}
          lowQ={lowQ}
          zoom={hudZ}
          panel={
            <HudPanel
              portrait={<Portrait p={me} className="w-full h-full" rounded="" />}
              hexPortrait={true}
              name={me.character.name}
              onName={() => { clickSound(); setShowChar(true); }}
              teamId={me.teamId}
              teamColor={teamAccent(me.teamId)}
              sp={me.skillPoints}
              spMax={me.maxSkill}
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
              lowQ={lowQ}
              statusAlt={null}
              onOpenAll={() => { clickSound(); setStatusViewId(me.id); }}
            />
          }
          center={
            <HudCenter
              score={me.score}
              busted={me.busted}
              handRef={selfHandRef}
              hand={me.cards === null ? (
                // ตาบอด: การ์ด/แต้มของตัวเองก็ถูกซ่อน
                <span className="hud-hand-note">🌑 ???</span>
              ) : myTurn ? (
                <span className="hud-hand-note" data-tone="me">ตาของคุณ</span>
              ) : phase !== "PLAYING" && phase !== "TRANSITION" ? (
                <span className="hud-hand-note" data-tone={me.busted ? "bad" : undefined}>{me.busted ? "แต้มเกิน" : "เปิดไพ่แล้ว"}</span>
              ) : me.cards && me.cards.length ? (
                // ถือการ์ดแบบพัดสไตล์ UNO — บีบระยะซ้อนอัตโนมัติตามจำนวนใบให้พอดีพื้นที่เสมอ (ห้ามเกิด scroll เด็ดขาด)
                <div className="flex items-center pl-1 pr-4">
                  {(() => {
                    const CARD_W = 80; // ความกว้างการ์ด size="lg"
                    const FAN_AREA_W = 230; // พื้นที่กางพัดตายตัว ไม่ล้นออกกรอบแน่นอน
                    const n = me.cards.length;
                    const step = n > 1 ? Math.max(16, Math.min(CARD_W, (FAN_AREA_W - CARD_W) / (n - 1))) : 0;
                    const mid = (n - 1) / 2;
                    return me.cards.map((c, i) => {
                      const off = i - mid;
                      return (
                        <div
                          key={i}
                          className="relative shrink-0 group hover:z-30"
                          style={{
                            marginLeft: i === 0 ? 0 : -(CARD_W - step),
                            transform: `rotate(${off * 6}deg) translateY(${Math.abs(off) * 4}px)`,
                          }}
                        >
                          <div className={`transition-transform duration-150 group-hover:-translate-y-6 group-hover:scale-110 ${me.busted ? "grayscale opacity-60" : ""}`}>
                            <Card value={c.value} color={c.color} special={c.special} size="lg" />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              ) : (
                <span className="hud-hand-note">ยังไม่จั่วไพ่</span>
              )}
              draw={inBoardTurn ? {
                label: "ย้อน",
                disabled: !(myTurn && state.action.moved && !state.action.locked),
                onClick: () => { clickSound(); socket.emit("undoMove"); },
              } : {
                disabled: state.deckEmpty || !(phase === "PLAYING" && me.alive && !done) || me.atCap || noDraw,
                onClick: () => { clickSound(); socket.emit("hit"); },
              }}
              reveal={inBoardTurn ? {
                label: "รอ",
                disabled: !myTurn,
                onClick: () => { clickSound(); setPickReq(null); socket.emit("endAction"); },
              } : {
                label: "พอ",
                disabled: !(phase === "PLAYING" && me.alive && !done),
                onClick: () => { clickSound(); socket.emit("lock"); },
              }}
            />
          }
          right={
            <HudRight
              bagCount={me.inventory?.length || 0}
              onBag={() => { clickSound(); setBagOpen(true); }}
              gold={me.gold ?? 0}
              onShop={() => { clickSound(); setShopOpen(true); }}
              skills={
                <>
                  <SkillSlot variant="hud" label="พื้นฐาน" tier="basic" skill={ch?.basic} points={me.skillPoints} rangeLabel={areaText(ch?.basic?.area)} disabled={!myTurn || noSkill || (me.skillUsed && !isMuimi && !giftFree("basic")) || muimiBasicLocked || giftLocked("basic") || noTargetInRange(ch?.basic?.area)} onUse={requestSkillUse} cooldown={giftCd("basic")} ammo={isMuimi ? me.muimiEmergencyUses : undefined} />
                  <SkillSlot variant="hud" label="รอง" tier="secondary" skill={ch?.secondary} points={me.skillPoints} rangeLabel={areaText(ch?.secondary?.area)} disabled={!myTurn || noSkill || (me.skillUsed && !giftFree("secondary")) || muimiSecLocked || giftLocked("secondary") || noTargetInRange(ch?.secondary?.area)} onUse={requestSkillUse} cooldown={giftCd("secondary")} />
                  <SkillSlot variant="hud" label="ท่าไม้ตาย" tier="ultimate" skill={ch?.ultimate} points={me.skillPoints} rangeLabel={areaText(ch?.ultimate?.area)} disabled={!myTurn || noSkill || (me.skillUsed && !giftFree("ultimate")) || muimiUltLocked || giftLocked("ultimate") || noTargetInRange(ch?.ultimate?.area)} onUse={requestSkillUse} cooldown={muimiUltCd || giftCd("ultimate")} />
                </>
              }
            />
          }
        />
      )}

      {/* ---------- อนิเมชันเปลี่ยนเฟส ---------- */}
      {scene?.kind === "draw" && <DrawCall key={scene.id} />}

      {/* ---------- overlay ที่ใช้ร่วมกับมือถือ (ฉากตีวาดบนกระดานแทน AttackFx) ---------- */}
      <OverlayLayer boardFx phase={phase} attack={state.attack} csSkipped={csSkipped} flash={flash} notice={notice} cycleFx={scene?.kind === "cycle" ? { ...scene.data, id: scene.id } : null} />
      <FlyingCardsLayer flights={cardFlights} onDone={removeCardFlight} />
      {journeyInfoOpen && state.journey && <JourneyInfoModal journey={state.journey} onClose={() => setJourneyInfoOpen(false)} />}

      {/* ---------- แบนเนอร์รอบถัดไป ---------- */}
      {phase === "TRANSITION" && <RoundBanner round={state.roundNumber + 1} />}

      {scene?.kind === "shop" && <ShopHerald key={scene.id} />}

      {phase === "GAMEOVER" && (
        <VictoryScreen state={state} onBackToLobby={() => socket.emit("backToLobby")} />
      )}

      {/* ---------- modal รายละเอียดตัวละคร / ดูสถานะผู้เล่น / ร้าน / กระเป๋า ---------- */}
      <ModalMounts
        showChar={showChar} ch={ch} me={me} onCloseChar={() => setShowChar(false)}
        statusView={statusView} statusViewIsSelf={statusViewId === state.youId} onCloseStatus={() => setStatusViewId(null)}
        shopOpen={shopOpen} shop={state.shop} onCloseShop={() => setShopOpen(false)} shopBlock={shopBlock} shopTurnsLeft={state.shopTurnsLeft}
        bagOpen={bagOpen} onCloseBag={() => setBagOpen(false)} players={state.players} gameState={state.gameState} roundNumber={state.roundNumber} onPickGunAmmo={startGunPick}
        myTurn={myTurn} bagSlots={state.bagSlots} onPickSuit={startSuitPick}
        skillConfirm={skillConfirm} onConfirmSkill={confirmSkillUse} onCancelSkill={cancelSkillConfirm}
      />
      {/* คัตซีนวีดีโอ: ทับกระดานทั้งจอ (กระดานยัง mount อยู่ข้างใต้ — จบคัตซีนแล้วไม่ต้องสร้างฉากใหม่) */}
      {cutsceneEl && <div style={{ position: "fixed", inset: 0, zIndex: 150 }}>{cutsceneEl}</div>}
    </div>
  );
}
