// หน้าดูหน้าจอเกมจริง (Game.jsx) ด้วย state จำลองของระบบกระดาน — เฉพาะ dev: ?hud=1&game=1
//  state สร้างใน mockBoardState.js ให้รูปเดียวกับ server/view.js buildStateFor (ผู้เล่น 5 คน · เรา = มุยมิ)
//  แถบ dev ลอยซ้ายกลางจอ (ไม่บังแถบบน/แถบลำดับเดิน/HUD ล่าง) ใช้สลับฉาก — ทุกค่าเขียนกลับลง URL ให้รีโหลดแล้วได้ฉากเดิม
//
//  พารามิเตอร์ URL:
//   scn = playing | order | my | moved | other | attack | collide | gun | region
//         (region = ตาเรา ที่ภูมิภาค area (ค่าเริ่ม VI) กลางคืน)
//   area = 1..7 · night=1 · lowq=1 · team=1 (โหมด duo) · shop=1 (ร้านอยู่ติดเรา) · bar=0 (ซ่อนแถบ dev)
//   drawer=1 = กดเปิดลิ้นชักสถานะให้หลังโหลด · measure=1 = วัดกล่อง HUD
//
//  socket.emit ถูกแทนชั่วคราว (คืนของเดิมตอน unmount): hit / lock / move / undoMove / endAction / attack /
//   useSkill / buyShopItem / dropItem / useInventoryItem จำลองผลในหน้า · ตัวอื่นแค่ log ลง console ไม่ส่งไป server
import { useEffect, useRef, useState } from "react";
import Game from "../Game";
import { socket } from "../../socket";
import { measureHud } from "./hudMeasure";
import { SCENARIOS, buildMockState, simulateEmit, nextTurn } from "./mockBoardState";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

function readOpts() {
  const q = new URLSearchParams(location.search);
  const raw = q.get("scn") || "playing";
  const region = raw === "region";
  const area = Math.min(7, Math.max(1, Number(q.get("area")) || (region ? 6 : 1)));
  return {
    scn: region ? "my" : raw,
    area,
    night: region || q.get("night") === "1",
    lowQ: q.get("lowq") === "1",
    team: q.get("team") === "1",
    shopNear: q.get("shop") === "1",
  };
}
// เขียนค่ากลับลง URL (คง hud=1&game=1 และพารามิเตอร์อื่นที่ไม่ใช่ของแถบนี้ไว้)
function writeOpts(o) {
  const q = new URLSearchParams(location.search);
  const set = (k, v) => (v ? q.set(k, v) : q.delete(k));
  set("scn", o.scn);
  set("area", o.area > 1 ? String(o.area) : "");
  set("night", o.night ? "1" : "");
  set("lowq", o.lowQ ? "1" : "");
  set("team", o.team ? "1" : "");
  set("shop", o.shopNear ? "1" : "");
  history.replaceState(null, "", `${location.pathname}?${q.toString()}`);
}

export default function GamePreview() {
  const showBar = new URLSearchParams(location.search).get("bar") !== "0";
  const [opts, setOpts] = useState(readOpts);
  const [state, setState] = useState(() => buildMockState(opts));
  const [seq, setSeq] = useState(0); // เปลี่ยน = สร้างฉากใหม่ (กดฉากเดิมซ้ำก็เล่นอนิเมชันใหม่)
  const [remount, setRemount] = useState(0);
  const [open, setOpen] = useState(true);
  // ฉากตีที่มาจากการเลือกฉาก (ค้างไว้ดู) ต่างจากฉากตีที่เกิดจากการกดในหน้า (เล่นจบแล้วไปตาถัดไปเอง)
  const staticAttackId = useRef(state.attack ? state.attack.id : null);

  // สร้าง state ใหม่ทุกครั้งที่เปลี่ยนฉาก/ตัวเลือก
  const first = useRef(true);
  useEffect(() => {
    writeOpts(opts);
    if (first.current) { first.current = false; return; }
    const s = buildMockState(opts);
    staticAttackId.current = s.attack ? s.attack.id : null;
    setState(s);
  }, [opts, seq]);

  // แทน socket.emit ด้วยตัวจำลอง (ไม่ส่งอะไรออกไปจริง) — คืนของเดิมตอนออกจากหน้า
  useEffect(() => {
    const orig = socket.emit;
    socket.emit = function previewEmit(ev, payload) {
      console.info("[GamePreview] socket.emit", ev, payload);
      setState((prev) => {
        const r = simulateEmit(prev, ev, payload);
        return r ? r.state : prev;
      });
      return socket;
    };
    return () => { socket.emit = orig; };
  }, []);

  // ฉากตีที่เกิดจากการกด: รอครบเวลาฉาก แล้วไปตาถัดไป (เหมือน server เรียก done หลังฉากตี)
  const atkId = state.gameState === "ATTACKING" && state.attack ? state.attack.id : null;
  const atkMs = state.attack ? state.attack.fxMs || 3000 : 0;
  useEffect(() => {
    if (!atkId || atkId === staticAttackId.current) return undefined;
    const t = setTimeout(() => setState((prev) => (prev.attack && prev.attack.id === atkId ? nextTurn(prev) : prev)), atkMs);
    return () => clearTimeout(t);
  }, [atkId, atkMs]);

  // ?drawer=1 = เปิดลิ้นชักสถานะให้หลังโหลด · ?measure=1 = วัดกล่อง HUD หลังวางเสร็จ
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const timers = [];
    if (q.get("drawer") === "1") timers.push(setTimeout(() => document.querySelector(".hud-drawer-tab")?.click(), 600));
    if (q.get("measure") === "1") timers.push(setTimeout(measureHud, 8000));
    return () => timers.forEach(clearTimeout);
  }, []);

  const pick = (patch) => { setOpts((o) => ({ ...o, ...patch })); setSeq((n) => n + 1); };
  const actor = state.actorId ? state.players.find((p) => p.id === state.actorId) : null;

  return (
    <>
      <Game key={remount} state={state} lowQ={opts.lowQ} skillConfirmOn />
      {showBar && (
        <div style={BAR}>
          <button type="button" style={HEAD} onClick={() => setOpen((v) => !v)}>
            DEV {open ? "◂" : "▸"}
          </button>
          {open && (
            <>
              <div style={INFO}>
                {state.gameState}
                {actor ? ` · ตา ${actor.name}` : ""}
                {state.action ? (state.action.moved ? " · เดินแล้ว" : " · ยังไม่เดิน") : ""}
                {state.action && state.action.locked ? " · ล็อก" : ""}
              </div>
              {SCENARIOS.map((s) => (
                <button key={s.id} type="button" style={btn(opts.scn === s.id)} onClick={() => pick({ scn: s.id })}>
                  {s.label}
                </button>
              ))}
              <button type="button" style={btn(false)} onClick={() => pick({ scn: "my", area: opts.area > 1 ? opts.area : 6, night: true })}>
                ภูมิภาค {ROMAN[(opts.area > 1 ? opts.area : 6) - 1]} กลางคืน
              </button>
              <label style={ROW}>
                ภูมิภาค
                <select value={opts.area} onChange={(e) => pick({ area: Number(e.target.value) })} style={SELECT}>
                  {ROMAN.map((r, i) => <option key={r} value={i + 1}>{r}</option>)}
                </select>
              </label>
              <Toggle label="กลางคืน" on={opts.night} set={(v) => pick({ night: v })} />
              <Toggle label="ทีม (duo)" on={opts.team} set={(v) => pick({ team: v })} />
              <Toggle label="ร้านติดเรา" on={opts.shopNear} set={(v) => pick({ shopNear: v })} />
              <Toggle label="lowQ" on={opts.lowQ} set={(v) => setOpts((o) => ({ ...o, lowQ: v }))} />
              <button type="button" style={btn(false)} onClick={() => { setSeq((n) => n + 1); setRemount((n) => n + 1); }}>
                รีเซ็ตฉาก
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}

function Toggle({ label, on, set }) {
  return (
    <label style={ROW}>
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} />
      {label}
    </label>
  );
}

// ---------- สไตล์แถบ dev (inline — ไม่ปนกับ CSS ของเกม) ----------
const BAR = {
  position: "fixed", left: 8, top: "50%", transform: "translateY(-50%)", zIndex: 99999,
  display: "flex", flexDirection: "column", gap: 3, width: 150, padding: 6,
  background: "rgba(10,12,24,.82)", border: "1px solid rgba(255,255,255,.18)", borderRadius: 8,
  font: "11px/1.3 system-ui, sans-serif", color: "#e8ecf6", pointerEvents: "auto",
};
const HEAD = { all: "unset", cursor: "pointer", fontWeight: 700, letterSpacing: 1, color: "#ffd77a" };
const INFO = { fontSize: 10, opacity: 0.75, padding: "2px 0 4px", borderBottom: "1px solid rgba(255,255,255,.12)" };
const ROW = { display: "flex", alignItems: "center", gap: 6, cursor: "pointer" };
const SELECT = { marginLeft: "auto", background: "#1b1f33", color: "#e8ecf6", border: "1px solid rgba(255,255,255,.2)", borderRadius: 4, fontSize: 11 };
const btn = (active) => ({
  all: "unset", cursor: "pointer", padding: "3px 6px", borderRadius: 4,
  background: active ? "rgba(255,215,122,.25)" : "rgba(255,255,255,.06)",
  border: `1px solid ${active ? "rgba(255,215,122,.7)" : "rgba(255,255,255,.12)"}`,
});
