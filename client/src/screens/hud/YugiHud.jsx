// ============================================================
//  HUD ของยูกิ มุโต้ (characters/yugi_muto.js · GRID_PLAN §7.42) — มือการ์ดที่กดเล่นได้
//   การ์ดบนมือเรียงเป็นพัด (ชี้ = ยกขึ้น · กด = เลือก → ปุ่ม เปิดใช้ / ทิ้ง) · กองเด็ค (กด/ปุ่ม 1 = ดรอว์ · หลังการ์ดจากผู้ใช้)
//   แทนช่องสกิลพื้นฐาน/รองบนแถบล่างทั้งหมด (ผู้ใช้สั่ง 2026-11-24 — Game.jsx ซ่อนช่องเมื่อมี yugi.hand) · ไม่มีช่องเอ็กโซเดีย (ผู้ใช้: ไม่จำเป็น)
//   ตำแหน่ง (ผู้ใช้ 2026-11-24): กองเด็ควางบนแผงโปรไฟล์ (.hud-prof — ชิดขวา พ้นป้ายเหรียญ) · มือการ์ดอยู่กลางช่องว่างระหว่างแผงโปรไฟล์กับคอลัมน์ปุ่มขวา
//     วัดตำแหน่งจริงทุก 0.5 วิ + ตอนย่อขยายจอ · ช่องแคบ = การ์ดซ้อนกันมากขึ้น (STEP ลด) ไม่ล้นไปทับปุ่มโจมตี
//   จุด 5 จุดบนกองเด็ค = สกิลการ์ดที่ยังใช้ได้ในเทิร์นนี้ (yugi.uses / usesMax — ผู้ใช้: 5 ครั้งต่อเทิร์น)
//   อนิเมชันตามเหตุการณ์จาก server (yugi.fx): ดรอว์ = บินจากเด็คแล้วพลิกหน้า · ทิ้ง = พลิกคว่ำบินกลับเด็ค · เปิดใช้ = ลอยขึ้นเรืองแสงแล้วสลาย
//   เสียงการ์ดมาจากป้ายสกิลของ server (skillSound) — ทุกคนได้ยิน · ที่นี่มีแค่เสียงคลิก
//  จอคอม/แท็บเล็ตเท่านั้น · ไม่มีข้อความอธิบาย (ชื่อ + ตัวเลข + ไอคอน)
// ============================================================
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { clickSound } from "../../audio";
import "./yugiHud.css";

const DIR = "/characters/yugi_muto";
const BACK = `${DIR}/card_back.webp`;
// ขนาดการ์ดตามความสูงจอ (ผู้ใช้: 70px เล็กเกินบนจอจริง 2026-11-24) — สูง ×1.46 ตามการ์ดจริง · กองเด็ค = 80% ของการ์ด
const CARD_VH = 0.16, CARD_MIN = 92, CARD_MAX = 150;
const cardWOf = (h) => Math.round(Math.max(CARD_MIN, Math.min(CARD_MAX, h * CARD_VH)));
const STEP_RATIO = .66; // ระยะห่างระหว่างการ์ดเมื่อช่องกว้างพอ (สัดส่วนของความกว้างการ์ด)
const STEP_MIN = 20;
const FAN_DEG = 4;     // องศาต่อใบจากกลางพัด
const HAND_BOTTOM = 18; // ขอบล่างของพัดเหนือขอบจอ
const SIDE_PAD = 40;   // ระยะห่างจากแผงโปรไฟล์/คอลัมน์ปุ่ม
const HUD_KEYS = ["F", "B", "Enter", "Z"]; // คอลัมน์ปุ่มขวาล่าง (โจมตี/กระเป๋า/จบตา/ย้อน)
const DRAW_MS = 700, PLAY_MS = 950, DROP_MS = 650;

let uidSeq = 0;
const withIds = (hand) => hand.map((c) => ({ ...c, id: ++uidSeq }));
const sameKeys = (a, b) => a.length === b.length && a.every((c, i) => c.key === b[i].key);
// ตำแหน่งใบที่ i จาก n ใบ (กึ่งกลางพัด = 0)
function slotOf(i, n, step) {
  const m = (n - 1) / 2, d = i - m;
  return { x: d * step, rot: d * FAN_DEG, y: d * d * 1.8 };
}
// ระยะห่างระหว่างการ์ด: ช่องแคบ = ซ้อนกันมากขึ้น ให้ทั้งพัดอยู่ในช่องว่างพอดี
const stepFor = (n, avail, cw) => (n > 1 ? Math.max(STEP_MIN, Math.min(cw * STEP_RATIO, (avail - cw) / (n - 1))) : cw * STEP_RATIO);
// วัดแผงโปรไฟล์ + คอลัมน์ปุ่มขวา → จุดวางเด็คและกลางพัด (พิกัดจอ)
function measureLayout(root) {
  const W = window.innerWidth, H = window.innerHeight;
  const cw = cardWOf(H), dw = Math.round(cw * 0.8);
  const prof = document.querySelector(".hud-prof");
  const pr = prof ? prof.getBoundingClientRect() : null;
  let colLeft = W, colTop = H;
  for (const k of HUD_KEYS) for (const el of document.querySelectorAll(`[data-hotkey="${k}"]`)) {
    if (root && root.contains(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && r.left > W / 2) { colLeft = Math.min(colLeft, r.left); colTop = Math.min(colTop, r.top); }
  }
  const left = pr && pr.width > 0 ? pr.right : W * 0.25;
  const right = colLeft < W ? colLeft : W * 0.8;
  return {
    midX: Math.round((left + right) / 2),
    cw, dw,
    avail: Math.max(cw, right - left - SIDE_PAD * 2 - Math.round(cw * 0.5)), // − ส่วนที่การ์ดริมพัดเอียงยื่นออก (~¼ การ์ดต่อข้าง)
    // เด็ค: บนแผงโปรไฟล์ ชิดขวา (ป้ายเหรียญ/รายการอยู่ซ้ายบนของแผง)
    deckX: pr && pr.width > 0 ? Math.round(pr.right - dw - 18) : Math.round(left - dw - 18),
    deckBottom: pr && pr.width > 0 ? Math.round(H - pr.top + 10) : 190,
    colTop,
  };
}

export function YugiHand({ yugi, basic, secondary, isOk, canBasic, canSecondary, onUse, lowQ }) {
  const [cards, setCards] = useState(() => withIds(yugi?.hand || []));
  const [ghosts, setGhosts] = useState([]);  // การ์ดที่ออกจากมือ (กำลังเล่นอนิเมชัน)
  const [sel, setSel] = useState(null);      // id การ์ดที่เลือก
  const [deckPulse, setDeckPulse] = useState(0);
  const [lay, setLay] = useState(null);      // ผล measureLayout
  const lastSeq = useRef(yugi?.fx?.seq || 0);
  const rootRef = useRef(null);
  const availRef = useRef({ avail: 400, cw: CARD_MIN }); // ช่องว่าง/ขนาดการ์ดล่าสุด (ใช้คิดตำแหน่งผีของการ์ดที่ออก)

  // ซิงก์กับมือของ server: มีเหตุการณ์ใหม่ = เล่นอนิเมชัน · ไม่ตรงกัน = จัดใหม่เงียบๆ
  useLayoutEffect(() => {
    const hand = yugi?.hand || [];
    const fx = yugi?.fx;
    if (fx && fx.seq !== lastSeq.current) {
      lastSeq.current = fx.seq;
      setCards((prev) => {
        let next = prev;
        const n0 = prev.length;
        if ((fx.kind === "drop" || fx.kind === "play") && prev[fx.i]) {
          const gone = prev[fx.i];
          const pos = slotOf(fx.i, n0, stepFor(n0, availRef.current.avail, availRef.current.cw));
          setGhosts((g) => [...g, { ...gone, kind: fx.kind, pos, born: Date.now() }]);
          next = prev.filter((_, k) => k !== fx.i);
        }
        const drew = fx.drew || 0;
        if (drew > 0) {
          const delay = fx.kind === "play" ? 420 : 0;
          const added = hand.slice(hand.length - drew).map((c, k) => ({ ...c, id: ++uidSeq, enter: true, delay: delay + k * 230 }));
          next = [...next, ...added];
          setDeckPulse((v) => v + 1);
        }
        return sameKeys(next, hand) ? next : withIds(hand);
      });
      setSel(null);
      return;
    }
    setCards((prev) => (sameKeys(prev, hand) ? prev : withIds(hand)));
  }, [yugi?.fx, yugi?.hand]);

  // ล้างผี/ธงเข้ามือเมื่ออนิเมชันจบ
  useEffect(() => {
    if (!ghosts.length) return undefined;
    const t = setTimeout(() => setGhosts((g) => g.filter((x) => Date.now() - x.born < Math.max(PLAY_MS, DROP_MS))), Math.max(PLAY_MS, DROP_MS) + 40);
    return () => clearTimeout(t);
  }, [ghosts]);
  useEffect(() => {
    if (!cards.some((c) => c.enter)) return undefined;
    const maxDelay = Math.max(...cards.filter((c) => c.enter).map((c) => c.delay || 0));
    const t = setTimeout(() => setCards((cs) => cs.map((c) => (c.enter ? { ...c, enter: false } : c))), maxDelay + DRAW_MS + 40);
    return () => clearTimeout(t);
  }, [cards]);

  // วัดตำแหน่งแผงโปรไฟล์/คอลัมน์ปุ่มทุกครึ่งวินาที + ตอนย่อขยายจอ
  useEffect(() => {
    const measure = () => {
      const m = measureLayout(rootRef.current);
      availRef.current = { avail: m.avail, cw: m.cw };
      setLay((v) => (v && v.midX === m.midX && v.avail === m.avail && v.cw === m.cw && v.deckX === m.deckX && v.deckBottom === m.deckBottom ? v : m));
    };
    measure();
    const t = setInterval(measure, 500);
    window.addEventListener("resize", measure);
    return () => { clearInterval(t); window.removeEventListener("resize", measure); };
  }, []);

  // คลิกนอกมือ / Esc / คลิกขวา = เลิกเลือก
  useEffect(() => {
    if (sel == null) return undefined;
    const off = (e) => { if (!rootRef.current || !rootRef.current.contains(e.target)) setSel(null); };
    const key = (e) => { if (e.key === "Escape") setSel(null); };
    const ctx = (e) => { e.preventDefault(); setSel(null); };
    window.addEventListener("pointerdown", off);
    window.addEventListener("keydown", key);
    window.addEventListener("contextmenu", ctx);
    return () => { window.removeEventListener("pointerdown", off); window.removeEventListener("keydown", key); window.removeEventListener("contextmenu", ctx); };
  }, [sel]);

  if (!yugi || !Array.isArray(yugi.hand)) return null;

  const L = lay || { midX: window.innerWidth / 2, avail: 400, deckX: 260, deckBottom: 190, cw: CARD_MIN, dw: Math.round(CARD_MIN * 0.8) };
  const CARD_W = L.cw, DECK_W = L.dw;
  const CARD_H = Math.round(CARD_W * 1.46), DECK_H = Math.round(DECK_W * 1.46);
  const n = cards.length;
  const step = stepFor(n, L.avail, CARD_W);
  const choice = (list, key) => (list || []).find((c) => c.key === key) || null;
  const selIdx = cards.findIndex((c) => c.id === sel);
  // จุดบินเข้า/ออก = กลางกองเด็ค เทียบจุดกลางล่างของพัด (y ลบ = ขึ้น)
  const deckDX = L.deckX + DECK_W / 2 - L.midX;
  const deckDY = -((L.deckBottom + DECK_H / 2) - (HAND_BOTTOM + CARD_H / 2));
  const drawChoice = choice(basic?.choices, "draw");
  const canDraw = !!(canBasic && drawChoice && isOk(drawChoice));

  const use = (tier, c) => { if (!c) return; clickSound(); setSel(null); onUse(tier, c); };

  return (
    <div ref={rootRef} className="yg-hand" data-low={lowQ ? "true" : "false"} style={{ "--cw": `${CARD_W}px`, "--dw": `${DECK_W}px` }}>
      {/* กองเด็คบนแผงโปรไฟล์ (กด/ปุ่ม 1 = ดรอว์) */}
      <button
        type="button"
        className={`yg-deck ${canDraw ? "live" : ""}`}
        disabled={!canDraw}
        onClick={() => use("basic", drawChoice)}
        style={{ left: `${L.deckX}px`, bottom: `${L.deckBottom}px` }}
        aria-label="ดรอว์"
        data-hotkey="1"
      >
        <span key={deckPulse} className="yg-deck-stack">
          {[4, 3, 2, 1, 0].map((k) => <img key={k} src={BACK} alt="" draggable={false} style={{ "--k": k }} />)}
        </span>
        <b className="yg-deck-n">{yugi.deck}</b>
        {yugi.usesMax > 0 && (
          <span className="yg-uses" aria-label={`${yugi.uses}/${yugi.usesMax}`}>
            {Array.from({ length: yugi.usesMax }, (_, k) => <i key={k} data-on={k < yugi.uses ? "true" : "false"} />)}
          </span>
        )}
        {drawChoice && <i className="yg-cost">◆{drawChoice.cost}</i>}
      </button>

      {/* พัดการ์ด — กลางช่องว่างระหว่างแผงโปรไฟล์กับคอลัมน์ปุ่ม */}
      <div className="yg-fan" style={{ left: `${L.midX}px`, bottom: `${HAND_BOTTOM}px` }}>
        {cards.map((c, i) => {
          const p = slotOf(i, n, step);
          const picked = c.id === sel;
          return (
            <div
              key={c.id}
              className={`yg-slot ${picked ? "picked" : ""} ${selIdx >= 0 && !picked ? "dim" : ""}`}
              style={{ "--x": `${p.x}px`, "--y": `${p.y}px`, "--rot": `${p.rot}deg`, zIndex: picked ? 40 : 10 + i }}
            >
              <button
                type="button"
                className={`yg-card ${c.key.startsWith("exodia") ? "exo" : "greed"} ${c.enter ? "enter" : ""}`}
                style={{ "--from": `${deckDX - p.x}px`, "--fromY": `${deckDY - p.y}px`, "--delay": `${c.delay || 0}ms` }}
                onClick={() => { clickSound(); setSel(picked ? null : c.id); }}
                aria-label={c.name}
              >
                <span className="yg-face front"><img src={c.img} alt="" draggable={false} /></span>
                <span className="yg-face back"><img src={BACK} alt="" draggable={false} /></span>
                <i className="yg-sheen" />
              </button>
              {picked && (
                <div className="yg-acts">
                  {(() => {
                    const play = choice(secondary?.choices, `play:${i}`), drop = choice(basic?.choices, `drop:${i}`);
                    const okPlay = !!(canSecondary && play && isOk(play)), okDrop = !!(canBasic && drop && isOk(drop));
                    return (
                      <>
                        <button type="button" className="yg-act play" disabled={!okPlay} onClick={() => use("secondary", play)}>
                          <span>เปิดใช้</span><i>◆{play ? play.cost : 2}</i>
                        </button>
                        <button type="button" className="yg-act drop" disabled={!okDrop} onClick={() => use("basic", drop)}>
                          <span>ทิ้ง</span><i>◆{drop ? drop.cost : 1}</i>
                        </button>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })}
        {ghosts.map((g) => (
          <div key={`g${g.id}`} className="yg-slot ghost" style={{ "--x": `${g.pos.x}px`, "--y": `${g.pos.y}px`, "--rot": `${g.pos.rot}deg`, zIndex: 60 }}>
            <div
              className={`yg-card ${g.kind === "play" ? `out-play ${g.key.startsWith("exodia") ? "exo" : "greed"}` : "out-drop"}`}
              style={{ "--to": `${deckDX - g.pos.x}px`, "--toY": `${deckDY - g.pos.y}px` }}
            >
              <span className="yg-face front"><img src={g.img} alt="" draggable={false} /></span>
              <span className="yg-face back"><img src={BACK} alt="" draggable={false} /></span>
              {g.kind === "play" && <i className="yg-burst" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
