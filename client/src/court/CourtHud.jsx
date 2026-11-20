// แถบบนของศาล: ความน่าเชื่อถือแบบ Ace Attorney (ไอคอนตาชั่งทอง 5 อัน/ฝ่าย ไม่ใช่หลอด) + รอบ (เพชร)
//  + ฉากรอ (ผู้ใช้ 2026-11-20): ป้ายบอกว่ากำลังรอใคร · ผู้พิพากษาบ่นเป็นระยะ · ประชาชนซุบซิบ
import { useEffect, useRef, useState } from "react";
import { Sprite } from "./CourtStage";

const CRED_MAX = 5;
const Scale = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M11 3h2v2.2l6.2 1.6-.5 1.9-1.1-.3 2.9 6.1a3.6 3.6 0 0 1-7 0l2.7-5.7-3.2-.8V19h3.5v2h-9v-2H11V7.9l-3.2.8 2.7 5.7a3.6 3.6 0 0 1-7 0l2.9-6.1-1.1.3-.5-1.9L11 5.2z" />
  </svg>
);

// ไอคอนแต่ละช่อง: เสีย = แตกกระจาย + วาบ · ได้คืน = เรืองแสง
function CredSide({ side, n, faces }) {
  const prev = useRef(n);
  const [fx, setFx] = useState({});
  const [shake, setShake] = useState(0);
  useEffect(() => {
    const p = prev.current; prev.current = n;
    if (n === p) return;
    const now = Date.now(), o = {};
    if (n < p) for (let i = n; i < p; i++) o[i] = { k: "brk", t: now };
    else for (let i = p; i < n; i++) o[i] = { k: "glw", t: now };
    setFx((x) => ({ ...x, ...o }));
    if (n < p) setShake(now);
  }, [n]);
  const lvl = n <= 1 ? "crit" : n <= 2 ? "warn" : "";
  return (
    <div className={`ccred s-${side} ${lvl} ${shake ? "shk" : ""}`} key={shake}>
      <div className="ccfaces">{faces.filter(Boolean).slice(0, 2).map((f, i) => <i key={i} style={{ backgroundImage: f ? `url(${f})` : null }} />)}</div>
      <div className="ccicons">
        {Array.from({ length: CRED_MAX }, (_, i) => {
          const on = i < n, f = fx[i];
          return (
            <span key={i} className={`cci ${on ? "on" : "off"} ${f ? f.k : ""}`}>
              <Scale />
              {f?.k === "brk" && <b className="ccshard" key={f.t}><i /><i /><i /><i /></b>}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function CredBar({ cred, cast, round, rounds }) {
  return (
    <div className="ccredbar">
      <CredSide side="L" n={Math.max(0, Math.min(CRED_MAX, cred.L))} faces={[cast.L?.img]} />
      <div className="cround">{Array.from({ length: rounds || 3 }, (_, i) => <i key={i} className={i + 1 < round ? "past" : i + 1 === round ? "cur" : ""} />)}</div>
      <CredSide side="D" n={Math.max(0, Math.min(CRED_MAX, cred.D))} faces={cast.Dunits ? cast.Dunits.map((u) => u.img) : [cast.D?.img]} />
    </div>
  );
}

// ----- ฉากรอ -----
const WAIT_TEXT = {
  testimony: "จำเลยกำลังเรียบเรียงคำให้การ",
  cross: "ทนายกำลังซักค้าน",
  objectWindow: "ฝ่ายค้านกำลังพิจารณา",
  gallery: "ประชาชนกำลังตัดสินใจ",
};
const JUDGE_LINES = {
  testimony: ["รีบหน่อยนะ ศาลหิวแล้ว", "จำเลย คิดนานไปแล้วนะ", "ใช้สมองเยอะไปหรือเปล่า?", "ศาลรอได้...อีกไม่นาน", "(ผู้พิพากษาหาวยาว)", "อย่าแต่งเรื่องเยอะนะ"],
  cross: ["ทนาย ศาลรออยู่นะ", "อย่ามัวแต่ยืนเหงื่อแตก", "หลักฐานในแฟ้มมีไว้ใช้นะ"],
  objectWindow: ["ฝ่ายค้าน จะคัดค้านไหม?", "เร็วเข้า ฝ่ายค้าน!"],
  gallery: ["ประชาชนทั้งหลาย ตัดสินใจเร็วๆ", "ห้ามปาของนะ...ขอร้อง", "เบาๆ หน่อย นี่ศาลนะ"],
};
const MURMUR = ["👀", "😮", "🤔", "😂", "🍿", "😱", "🤫", "👏"];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export function waitText(phase, role) {
  if (phase === "testimony" && role !== "D" && role !== "C") return WAIT_TEXT.testimony;
  if (phase === "cross" && role !== "L" && role !== "co") return WAIT_TEXT.cross;
  if (phase === "objectWindow" && role !== "C") return WAIT_TEXT.objectWindow;
  if (phase === "gallery" && role !== "G") return WAIT_TEXT.gallery;
  return null;
}

export function WaitLayer({ phase, role, crowd }) {
  const text = waitText(phase, role);
  const waiting = !!WAIT_TEXT[phase];
  const [toast, setToast] = useState(null);
  const [mur, setMur] = useState([]);
  useEffect(() => {
    if (!waiting || phase === "objectWindow") return undefined;
    let t;
    const go = (first) => {
      t = setTimeout(() => { setToast({ text: pick(JUDGE_LINES[phase]), k: Date.now() }); t = setTimeout(() => { setToast(null); go(false); }, 3200); }, first ? 3500 : 6000 + Math.random() * 4000);
    };
    go(true);
    return () => { clearTimeout(t); setToast(null); };
  }, [phase, waiting]);
  useEffect(() => {
    if (!waiting || !crowd) return undefined;
    const iv = setInterval(() => {
      const m = { e: pick(MURMUR), x: Math.random() < 0.5 ? 3 + Math.random() * 14 : 83 + Math.random() * 14, k: Date.now() + Math.random() };
      setMur((a) => [...a.slice(-5), m]);
    }, 1300);
    return () => { clearInterval(iv); setMur([]); };
  }, [phase, waiting, crowd]);
  if (!waiting) return null;
  return (
    <div className="cwait">
      {text && <div className="cwaitban"><span>{text}</span><b className="cdotsani"><i /><i /><i /></b></div>}
      {toast && (
        <div className="cjtoast" key={toast.k}>
          <div className="cjface"><Sprite atlas="judge" anim="talk" x={-16} bottom={-18.5} scale={0.45} /></div>
          <div className="cjsay"><small>ผู้พิพากษา</small>{toast.text}</div>
        </div>
      )}
      {mur.map((m) => <span key={m.k} className="cmur" style={{ left: `${m.x}%` }}>{m.e}</span>)}
    </div>
  );
}
