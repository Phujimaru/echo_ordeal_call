// ตัวช่วยของหน้าเกม (ไม่ใช่คอมโพเนนต์) — สีทีม ขนาดจอ เช็คเป้าหมาย จัดอันดับ การ์ดบิน
//  แยกออกจาก screens/Game.jsx
import { useCallback, useEffect, useRef, useState } from "react";
import { socket } from "../../socket";

export const P_DISPLAY = "var(--font-p-display)";
const TEAM_COLORS = { A: "#22d3ee", B: "#f97316", C: "#a3e635" };
export function teamAccent(teamId) {
  return TEAM_COLORS[teamId] || "var(--color-p-accent-bright)";
}
// ขนาดจอ (อัปเดตเมื่อหมุน/ย่อขยาย) — ใช้ย่อทั้งกระดานให้พอดีจอ รองรับมือถือแนวตั้ง
export function useViewport() {
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
export function isTargetable(p, iAmAttacker, c) {
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
export function resolveAttackPick(id, c) {
  if (c.giftSel) return c.pickGift(id);
  return socket.emit("attack", { targetId: id });
}

// ชื่อเฟส (โชว์อนิเมชันตอนเปลี่ยนเฟส)

// ฉากสรุปผล: จัดผู้เล่นเป็นชั้นตามแต้ม (ไพ่แตก = -1) — ชั้นบนสุด (แต้มดีที่สุด) คือ "ผู้ชนะ" (เสมอกันได้หลายคน)
//  ชั้นที่เหลือทั้งหมดถือเป็น "ผู้แพ้" กลุ่มเดียวกัน ไม่แยกอันดับย่อย — ไม่พึ่ง isWinner/isLoser/winnerId เพราะแคบเกินไป (สุ่มมาแค่ 1 คน)
export function rankTiers(players) {
  const combatants = players.filter((p) => p.score != null);
  if (!combatants.length) return [];
  const val = (p) => (p.busted ? -1 : p.score);
  const scores = [...new Set(combatants.map(val))].sort((a, b) => b - a);
  return scores.map((v) => ({ score: v, players: combatants.filter((p) => val(p) === v) }));
}

// ---------- ตรวจจับการจั่วการ์ด (ตัวเอง+คนอื่น รองรับจั่วพร้อมกันหลายคน) แล้วสร้างแอนิเมชันบินจากกองกลางไปหามือ ----------
//  เป็นแค่ overlay ตกแต่ง ไม่มีผลต่อ state จริงเลย — มือ/คะแนนจริงอัปเดตตาม state ทันทีเสมอไม่ต้องรอแอนิเมชันบินจบ
export function useCardFlights(state) {
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
