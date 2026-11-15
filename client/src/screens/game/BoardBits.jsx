// ชิ้นส่วนบนกระดาน — QTE · นาฬิกาตาเดิน · กองการ์ด · บันทึกกองการ์ด · การ์ดบิน
//  แยกออกจาก screens/Game.jsx
import { useTick } from "../../tickStore";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Card from "../../components/Card";
import { socket } from "../../socket";
import { uiSound } from "../../audio";
import { P_DISPLAY } from "./gameHelpers";

// ---------- QTE กลาง (server/qte.js) — เดสก์ท็อป: กด W/A/S/D ตามที่ขึ้น ----------
//  server ส่งมาแค่ "ปุ่มตัวถัดไป" ตัวเดียว (ส่งทั้งชุด = เห็นล่วงหน้าทั้งเพลง หมดความหมาย)
//  แถบเวลาวิ่งเองฝั่ง client เพื่อความลื่น แต่ผลตัดสินที่ server เสมอ (deadline เป็นเวลาของ server)
//  หมดเวลาเมื่อไหร่ยิง qteTimeout ไปให้ server ตรวจซ้ำเอง — client โกงให้ผ่านไม่ได้
export function QtePanel({ qte }) {
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
export function BoardTimer({ phaseKey, mine = false }) {
  const seconds = useTick();
  useEffect(() => { if (mine && seconds > 0 && seconds <= 5) uiSound("tick"); }, [seconds, mine]); // ตาเรา 5 วิสุดท้าย = เสียงนับถอยหลัง (ผู้ใช้สั่ง 2026-11-14)
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

export function DeckPile({ hostRef, size = "md", onClick }) {
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
export function DeckLedgerModal({ ledger, onClose }) {
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

// ---------- ชั้นเรนเดอร์การ์ดที่กำลังบิน (fixed เต็มจอ ทับทุกอย่าง ไม่กันคลิก) ----------
export function FlyingCardsLayer({ flights, onDone }) {
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
