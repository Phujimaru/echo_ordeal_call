// อินุอิ ทาคุมิ — Faiz Phone (SB-555P) แผงกดรหัสตามของจริงในเรื่อง + นาฬิกา Start Up — จอคอม/แท็บเล็ต (GRID_PLAN §7.27)
//  me.inui = { faiz, ammo, ammoMax, gun, knuckle, pointer, axel, exceed, startUp, henshinShown }
//  ตัวเครื่องคือรูปจากผู้ใช้ (faiz_phone_open.webp · ตัดรอบแล้ว) — viewBox 273×900 = พิกัดรูปต้นฉบับ · ปุ่มเป็นพื้นที่กดวางทับรูป
//  กดปุ่มหรือคีย์บอร์ด (0–9 Enter Backspace) · ENTER เปล่า = Exceed Charge · ปุ่มชมพู = วางสาย · Esc / คลิกนอกตัวเครื่อง = พับ
//  รหัสส่งเป็น useSkill basic form · หน้าจอไม่มีข้อความอธิบาย มีแค่เมนูในรูปกับเลขที่กด
import { useCallback, useEffect, useRef, useState } from "react";
import { playSfx } from "../../audio";
import { useTick } from "../../tickStore";
import "./faizPhone.css";

const ART = "/characters/inui_takumi/faiz_phone_open.webp";
const COL_X = [81.5, 125, 168];
const KEY_W = 33, KEY_H = 27;
const ROWS = [
  { y: 646, keys: ["call", "clear", "hangup"] },
  { y: 678, keys: ["1", "2", "3"] },
  { y: 711, keys: ["4", "5", "6"] },
  { y: 744, keys: ["7", "8", "9"] },
  { y: 776, keys: ["*", "0", "#"] },
];
// แถวเมนูบนจอในรูป
const MENU_Y = { 555: 220, 103: 241, 106: 262, 279: 283 };
const RELOAD = 4, EXCEED = 4;

function Hit({ x, y, w, h, label, onPress }) {
  return (
    <rect
      className="fp-hit" x={x} y={y} width={w} height={h} rx="4" role="button" aria-label={label}
      onPointerDown={(e) => { e.preventDefault(); onPress(); }}
    />
  );
}

function Screen({ text, error, inui }) {
  const bars = Array.from({ length: inui.ammoMax || 4 }, (_, i) => i < (inui.ammo || 0));
  const lit = [inui.faiz ? "555" : null, inui.gun].filter(Boolean);
  return (
    <g pointerEvents="none">
      {/* ไอคอนแบตเตอรี่บนจอ = กระสุนที่เหลือ */}
      <rect x="91" y="205" width="15" height="9" fill="#10131a" />
      {bars.map((on, i) => <rect key={i} x={92 + i * 3.4} y="206" width="2.6" height="7" fill={on ? "#4ade80" : "#3a3f4a"} />)}
      {!text && !error && !inui.exceed && lit.map((c) => (
        <rect key={c} x="87" y={MENU_Y[c] - 1} width="109" height="19" fill="none" stroke="#fff" strokeWidth="1.6" className="fp-blink" />
      ))}
      {(text || error) && (
        <g>
          <rect x="86" y="216" width="112" height="100" fill="#fff" />
          <text x="142" y="276" textAnchor="middle" className="fp-big" fill={error ? "#b30f1e" : "#111"}>{error ? "ERROR" : text}</text>
        </g>
      )}
      {inui.exceed && !text && !error && (
        <g>
          <rect x="86" y="216" width="112" height="100" fill="#b30f1e" className="fp-blink" />
          <text x="142" y="262" textAnchor="middle" className="fp-row" fill="#fff">EXCEED</text>
          <text x="142" y="282" textAnchor="middle" className="fp-row" fill="#fff">CHARGE</text>
        </g>
      )}
    </g>
  );
}

function PhoneArt({ text, error, inui, press }) {
  return (
    <svg viewBox="0 0 273 900" className="fp-svg" role="img" aria-label="Faiz Phone">
      <image href={ART} x="0" y="0" width="273" height="900" />
      <Screen text={text} error={error} inui={inui} />
      <Hit x={81} y={613} w={61} h={20} label="ENTER" onPress={() => press("enter")} />
      {ROWS.map((r) => r.keys.map((k, c) => <Hit key={k} x={COL_X[c]} y={r.y} w={KEY_W} h={KEY_H} label={k} onPress={() => press(k)} />))}
    </svg>
  );
}

export default function FaizPhone({ inui, points, skillUsed, onDial, onClose }) {
  const [text, setText] = useState("");
  const [error, setError] = useState(false);
  const errTimer = useRef(null);
  const box = useRef(null);
  const fail = useCallback(() => {
    setText("");
    setError(true);
    clearTimeout(errTimer.current);
    errTimer.current = setTimeout(() => setError(false), 900);
  }, []);
  useEffect(() => () => clearTimeout(errTimer.current), []);

  const canExceed = inui.faiz && !inui.axel && !inui.exceed && !inui.startUp && (inui.knuckle || inui.pointer) && points >= EXCEED && !skillUsed;
  const press = useCallback((k) => {
    if (k === "clear") { playSfx("inui_key"); setText(""); return; }
    if (k === "call") { playSfx("inui_key"); return; }
    if (k === "hangup") {
      if (!inui.faiz || inui.startUp) { playSfx("inui_key"); return; }
      playSfx("inui_enter");
      setText("");
      onDial("hangup");
      return;
    }
    if (k === "enter") {
      const code = text;
      setText("");
      if (!code) {
        if (canExceed) onDial("exceed"); // Exceed Charge มีคลิป: ไม่มีเสียงปุ่มตัดหน้า
        else { playSfx("inui_enter"); fail(); }
        return;
      }
      const ok = code === "555" ? !inui.faiz
        : code === "103" ? inui.ammo >= 1 && !inui.exceed
          : code === "106" ? inui.ammo >= 2 && !inui.exceed
            : code === "279" ? inui.ammo < (inui.ammoMax || 4) && points >= RELOAD && !skillUsed
              : false;
      if (!ok) { playSfx("inui_enter"); fail(); return; }
      if (!(code === "555" && !inui.henshinShown)) playSfx("inui_enter"); // แปลงร่างครั้งแรกมีคลิป
      onDial(code);
      return;
    }
    playSfx("inui_key");
    setError(false);
    setText((t) => (t.length >= 6 ? t : t + k));
  }, [text, inui, canExceed, points, skillUsed, onDial, fail]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { onClose(); return; }
      if (/^[0-9]$/.test(e.key)) { e.preventDefault(); e.stopPropagation(); press(e.key); return; }
      if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); press("enter"); return; }
      if (e.key === "Backspace") { e.preventDefault(); setText((t) => t.slice(0, -1)); }
    };
    const onDown = (e) => { if (box.current && !box.current.contains(e.target)) onClose(); };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onDown, true);
    return () => { window.removeEventListener("keydown", onKey, true); window.removeEventListener("pointerdown", onDown, true); };
  }, [press, onClose]);

  return (
    <div className="fp-wrap" ref={box}>
      <PhoneArt text={text} error={error} inui={inui} press={press} />
    </div>
  );
}

// เลขแดงเจ็ดส่วนแบบหน้าปัดนาฬิกา Faiz Axel
const SEG = { 0: "abcdef", 1: "bc", 2: "abdeg", 3: "abcdg", 4: "bcfg", 5: "acdfg", 6: "acdefg", 7: "abc", 8: "abcdefg", 9: "abcdfg" };
const SEG_D = {
  a: "M6 2 H26 L22 6 H10 Z", b: "M27 3 V21 L23 18 V7 Z", c: "M27 25 V43 L23 39 V28 Z",
  d: "M6 44 H26 L22 40 H10 Z", e: "M5 25 V43 L9 39 V28 Z", f: "M5 3 V21 L9 18 V7 Z", g: "M7 23 L10 21 H22 L25 23 L22 25 H10 Z",
};
function Digit({ n, x }) {
  const on = SEG[n] || "";
  return <g transform={`translate(${x} 0)`}>{Object.keys(SEG_D).map((k) => <path key={k} d={SEG_D[k]} fill={on.includes(k) ? "#ff2433" : "#3a0a0e"} />)}</g>;
}
// นาฬิกา Start Up: ผู้เล่นทุกคนเห็น · ระหว่างฉากตี/คลิปค้างเลขเดิม (เวลาไม่เดิน)
export function AxelClock({ phase }) {
  const tick = useTick();
  const [v, setV] = useState(10);
  useEffect(() => {
    if (phase !== "ACTION" || tick <= 0) return undefined;
    const t = setTimeout(() => setV(Math.min(10, tick)), 0);
    return () => clearTimeout(t);
  }, [phase, tick]);
  return (
    <div className="fp-clock" aria-label={`${v}`}>
      <svg viewBox="0 0 70 46"><Digit n={Math.floor(v / 10)} x={2} /><Digit n={v % 10} x={36} /></svg>
    </div>
  );
}
