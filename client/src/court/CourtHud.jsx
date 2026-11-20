// แถบบนของศาล: ความน่าเชื่อถือแบบ Ace Attorney (ไอคอนตาชั่งทอง 5 อัน/ฝ่าย ไม่ใช่หลอด) + รอบ (เพชร)
//  + ฉากรอ (ผู้ใช้ 2026-11-20): ป้ายบอกว่ากำลังรอใคร · ผู้พิพากษาบ่นเป็นระยะ · ประชาชนซุบซิบ
import { useEffect, useRef, useState } from "react";
import { Sprite } from "./CourtStage";
import { Rich } from "./CourtText";
import { csfx } from "./courtAudio";

const CRED_MAX = 6; // ความน่าเชื่อถือ 6 (ผู้ใช้ 2026-11-20)
const Scale = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M11 3h2v2.2l6.2 1.6-.5 1.9-1.1-.3 2.9 6.1a3.6 3.6 0 0 1-7 0l2.7-5.7-3.2-.8V19h3.5v2h-9v-2H11V7.9l-3.2.8 2.7 5.7a3.6 3.6 0 0 1-7 0l2.9-6.1-1.1.3-.5-1.9L11 5.2z" />
  </svg>
);

// ไอคอนแต่ละช่อง: เสีย = แตกกระจาย + วาบ · ได้คืน = เรืองแสง
function CredSide({ side, n, faces, onInfo }) {
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
      <div className="ccfaces">{faces.filter((f) => f && f.id != null).slice(0, 2).map((f, i) => <i key={i} className="cinfoable" style={{ backgroundImage: f.img ? `url(${f.img})` : null }} onClick={(e) => { e.stopPropagation(); onInfo && onInfo(f.id); }} />)}</div>
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

// กองเชียร์ของแต่ละฝ่าย (court.sides) — หน้าเล็กเรียงข้างแถบ
function Fans({ ids, cast, side, onInfo }) {
  if (!ids.length) return null;
  return (
    <div className={`ccfans s-${side}`}>
      {ids.slice(0, 6).map((id) => <i key={id} className="cinfoable" style={{ backgroundImage: cast.byId?.[id]?.img ? `url(${cast.byId[id].img})` : null }} onClick={(e) => { e.stopPropagation(); onInfo && onInfo(id); }} />)}
      {ids.length > 6 && <b>+{ids.length - 6}</b>}
    </div>
  );
}
export function CredBar({ cred, cast, round, rounds, onInfo, sides }) {
  const fans = (k) => Object.keys(sides || {}).filter((id) => sides[id] === k);
  return (
    <div className="ccredbar">
      <Fans ids={fans("L")} cast={cast} side="L" onInfo={onInfo} />
      <CredSide side="L" n={Math.max(0, Math.min(CRED_MAX, cred.L))} faces={[cast.L]} onInfo={onInfo} />
      <div className="cround">{Array.from({ length: rounds || 3 }, (_, i) => <i key={i} className={i + 1 < round ? "past" : i + 1 === round ? "cur" : ""} />)}</div>
      <CredSide side="D" n={Math.max(0, Math.min(CRED_MAX, cred.D))} faces={cast.Dunits || [cast.D]} onInfo={onInfo} />
      <Fans ids={fans("D")} cast={cast} side="D" onInfo={onInfo} />
    </div>
  );
}

// ----- ฉากรอ -----
const WAIT_TEXT = {
  testimony: "จำเลยกำลังเรียบเรียงคำให้การ",
  cross: "ทนายกำลังซักค้าน",
  objectWindow: "ฝ่ายค้านกำลังพิจารณา",
  gallery: "ประชาชนกำลังตัดสินใจ",
  sides: "ประชาชนกำลังเลือกฝ่าย",
};
const JUDGE_LINES = {
  testimony: ["รีบหน่อยนะ ศาลหิวแล้ว", "จำเลย คิดนานไปแล้วนะ", "ใช้สมองเยอะไปหรือเปล่า?", "ศาลรอได้...อีกไม่นาน", "(ผู้พิพากษาหาวยาว)", "อย่าแต่งเรื่องเยอะนะ"],
  cross: ["ทนาย ศาลรออยู่นะ", "อย่ามัวแต่ยืนเหงื่อแตก", "หลักฐานในแฟ้มมีไว้ใช้นะ"],
  objectWindow: ["ฝ่ายค้าน จะคัดค้านไหม?", "เร็วเข้า ฝ่ายค้าน!"],
  gallery: ["ประชาชนทั้งหลาย ตัดสินใจเร็วๆ", "ห้ามปาของนะ...ขอร้อง", "เบาๆ หน่อย นี่ศาลนะ"],
  sides: ["เลือกข้างให้ดีนะ ประชาชน", "ศาลวันนี้คนเยอะจัง"],
};
const MURMUR = ["👀", "😮", "🤔", "😂", "🍿", "😱", "🤫", "👏"];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export function waitText(phase, role) {
  if (phase === "testimony" && role !== "D" && role !== "C") return WAIT_TEXT.testimony;
  if (phase === "cross" && role !== "L" && role !== "co") return WAIT_TEXT.cross;
  if (phase === "objectWindow" && role !== "C") return WAIT_TEXT.objectWindow;
  if (phase === "gallery" && role !== "G") return WAIT_TEXT.gallery;
  if (phase === "sides" && role !== "G") return WAIT_TEXT.sides;
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
          <div className="cjsay"><small>ผู้พิพากษา</small><Rich text={toast.text} /></div>
        </div>
      )}
      {mur.map((m) => <span key={m.k} className="cmur" style={{ left: `${m.x}%` }}>{m.e}</span>)}
    </div>
  );
}

// ----- ประชาชน (server รอบ 2026-11-21): เลือกฝ่าย · แถบเชียร์ระหว่างคดี · ป๊อปปฏิกิริยา -----
const stopE = (e) => e.stopPropagation();
const SIDE_NAME = { L: "ทนาย", D: "จำเลย" };

// เลือกฝ่าย (phase "sides") + เปลี่ยนฝ่ายได้ 1 ครั้ง (ยืนยันในที่ — เปลี่ยนแล้วไม่ได้รางวัล)
export function SidePicker({ court, me, cast, emit, compact = false }) {
  const mine = court.sides?.[me] || null;
  const left = court.sideChangeLeft ?? 1;
  const [ask, setAsk] = useState(null);
  const pick = (s) => {
    if (s === mine) return;
    if (mine && !ask) { setAsk(s); return; }
    setAsk(null); emit("courtSide", { side: s });
  };
  const btn = (s, p) => (
    <button key={s} className={`cside-btn s-${s} ${mine === s ? "on" : ""}`} disabled={!!mine && mine !== s && left <= 0} onClick={() => pick(s)}>
      <i style={{ backgroundImage: p?.img ? `url(${p.img})` : null }} />
      <b>{SIDE_NAME[s]}</b>
      {!compact && <small>{p?.name}</small>}
    </button>
  );
  if (compact) {
    if (!mine || left <= 0) return null;
    const other = mine === "L" ? "D" : "L";
    return (
      <div className="cside-compact" onClick={stopE}>
        {ask ? (
          <div className="cside-ask"><span>⇄ {SIDE_NAME[other]} · 🎁✕</span><button onClick={() => pick(other)}>✓</button><button onClick={() => setAsk(null)}>✕</button></div>
        ) : <button className="cside-swap" onClick={() => setAsk(other)} title="เปลี่ยนฝ่าย">⇄</button>}
      </div>
    );
  }
  return (
    <div className="cui dimlite csides" onClick={stopE}>
      <div className="csides-box">
        <span className="crectab">เลือกฝ่าย</span>
        <div className="csides-row">{btn("L", cast.L)}<em>VS</em>{btn("D", cast.D)}</div>
        {ask && <div className="cside-ask"><span>⇄ {SIDE_NAME[ask]} · 🎁✕</span><button onClick={() => pick(ask)}>✓</button><button onClick={() => setAsk(null)}>✕</button></div>}
      </div>
    </div>
  );
}

// แถบเชียร์ของประชาชน (ระหว่างให้การ/ซักค้าน/ฉาก) — 👏 ฝ่ายตัวเอง · 👎/🍅 อีกฝ่าย · ยกละครั้ง · พยานเฉพาะช่วงซักค้าน
export function GalleryBar({ court, me, cast, emit, onWitnessL }) {
  const mine = court.sides?.[me];
  if (!mine) return null;
  const used = (court.rx || []).includes(me);
  const cross = court.phase === "cross";
  const wUsed = (court.witnessUsed || []).includes(me);
  const sg = court.sightings || [];
  const other = mine === "L" ? cast.D : cast.L;
  const self = mine === "L" ? cast.L : cast.D;
  const send = (e) => { csfx(e === "cheer" ? "crowd_cheer" : e === "boo" ? "crowd_boo" : "splat"); emit("courtGallery", { e }); };
  return (
    <div className={`cgbar s-${mine} ${used ? "used" : ""}`} onClick={stopE}>
      <div className="cgbar-side"><i style={{ backgroundImage: self?.img ? `url(${self.img})` : null }} /><b>{SIDE_NAME[mine]}</b></div>
      <button disabled={used} onClick={() => send("cheer")} title={self?.name}>👏</button>
      <button disabled={used} onClick={() => send("boo")} title={other?.name}>👎</button>
      <button disabled={used} onClick={() => send("throw")} title={other?.name}>🍅</button>
      {cross && !wUsed && (mine === "L"
        ? <button className="w" disabled={!sg.length} onClick={onWitnessL} title="ขึ้นให้การ">📜</button>
        : <button className="w" onClick={() => { csfx("evidence_ding"); emit("courtGallery", { e: "witnessD" }); }} title="ขึ้นให้การ">📍</button>)}
      <SidePicker court={court} me={me} cast={cast} emit={emit} compact />
    </div>
  );
}

// ป๊อปปฏิกิริยาจาก court.feed (ลอยจากขอบฝั่งที่โดน)
export function FeedPops({ feed }) {
  const seen = useRef(null);
  const [pops, setPops] = useState([]);
  useEffect(() => {
    const list = feed || [];
    if (seen.current == null) { seen.current = list.reduce((m, f) => Math.max(m, f.seq || 0), 0); return; }
    const fresh = list.filter((f) => (f.seq || 0) > seen.current);
    if (!fresh.length) return;
    seen.current = Math.max(seen.current, ...fresh.map((f) => f.seq || 0));
    setPops((p) => [...p.slice(-10), ...fresh.map((f) => ({ ...f, k: f.seq + ":" + Math.random(), y: 30 + Math.random() * 40 }))]);
  }, [feed]);
  useEffect(() => {
    if (!pops.length) return undefined;
    const t = setTimeout(() => setPops((p) => p.slice(1)), 1800);
    return () => clearTimeout(t);
  }, [pops]);
  return <div className="cfeed">{pops.map((p) => <span key={p.k} className={`cfeedpop s-${p.side}`} style={{ top: `${p.y}%` }}>{p.e}</span>)}</div>;
}
