// ฉากซ้อนบนกระดาน — cutscene แปลงร่าง · ประกาศจั่ว/โจมตี · เอฟเฟกต์โจมตี · แฟลชสกิล · ป้ายแปลงร่าง
//  แยกออกจาก screens/Game.jsx
import { useTick } from "../../tickStore";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CycleScene } from "../../components/BattleScenes";
import RecallBadge from "../hud/RecallBadge";
import { playCutsceneVideo } from "../../audio";
import { holdBoard } from "../../board/boardPause";

// ---------- cutscene แปลงร่าง (วีดีโอเต็มจอ ครั้งแรกต่อเกมเท่านั้น) ----------
//  ~950ms แรก: การ์ดเปิดตัวเท่ๆ บอกว่าใครใช้ (ชื่อ+รูปโปรไฟล์ใหญ่ ไม่มี title ท่า)
//  วีดีโอเล่นอยู่ตลอด (ไม่หน่วง ไม่กินเวลาที่ server กำหนด) — หลังจากนั้นเหลือแค่ title ท่ามุมบน ไม่มีรูปทับอีก
export function Cutscene({ cs }) {
  const ref = useRef(null);
  const [introDone, setIntroDone] = useState(false);
  // วีดีโอทึบเต็มจอบังกระดาน → พักวาดกระดานให้เครื่องถอดรหัสวีดีโอได้เต็มที่ · คลิปพื้นใส (cs.clear — ฟ็อกซี่) = กระดานยังต้องเห็น
  useEffect(() => (cs.clear ? undefined : holdBoard()), [cs.clear]);
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

  // คลิปพื้นใส (webm alpha): ซ้อนบนกระดานตรงๆ — ไม่มีพื้นดำ/poster/แฟลช/ขอบมืด/การ์ดเปิด/ชื่อ
  if (cs.clear) {
    return (
      <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
        <video ref={ref} src={cs.video} preload="auto" autoPlay playsInline className="absolute inset-0 w-full h-full object-contain" />
      </div>
    );
  }
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

export function DrawCall() {
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

export function AttackCall() {
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

// overlay ที่ใช้ร่วมกันทั้ง layout มือถือและจอใหญ่ (อนิเมชันตีกัน/ประกาศเปลี่ยนร่าง/แจ้งเตือนคัตซีน/สกิลแฟลช/แบนเนอร์กลางวันคืน)
export function OverlayLayer({ phase, attack, csSkipped, flash, notice, cycleFx, boardFx = false }) {
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
