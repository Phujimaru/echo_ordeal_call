// ============================================================
//  HUD ของนารุโฮโดะ ริวอิจิ (GRID_PLAN §7.37 · สัญญา .claude/plans/naruhodo-contract.md) — จอคอม/แท็บเล็ตเท่านั้น
//   EvidenceDock   แถบแฟ้มหลักฐานกลางเหนือแผงล่าง: ปกแฟ้ม + จำนวน · ช่องหลักฐาน 5 ช่อง · ป้ายเป้าที่สืบสวน (🔍 + คูลดาวน์ของเป้า)
//   CourtRecord    หน้าต่างบันทึกหลักฐาน (กดแถบ): ช่องหลักฐาน · ชี้/เลือก = ชื่อ + คำอธิบาย (ผู้ใช้สั่ง — ข้อความเดียวที่อนุญาต)
//   HoldItButton   ปุ่มลอย รอเดี๋ยว!!! ตอนตาคนอื่น (players[].naruhodo.holdReady / holdCd)
//   HoldItPanel    ตาแทรก (state.holdIt · phase "choose" · เฉพาะทนาย): เดิน 2 (เลือกช่องบนกระดาน) · เก็บหลักฐาน · คัดค้าน! → เลือกหลักฐาน
//   HoldItCorner   ทุกคนเห็น: นารุโฮโดะตัวเล็กแบบ DS โผล่มุมจอระหว่างตาแทรก
//   AlibiCounter   ผู้ถูกคัดค้านที่มีข้อแก้ตัว (phase "alibi"): ปุ่ม 📍 3 วิ
//   ShoutFlash     ผลตาแทรก (holdIt.result): คัดค้าน! = ป้าย OBJECTION! กลางจอ · ข้อแก้ตัวสวน = 📍 ประทับ
//  ไม่มีข้อความอธิบาย — ชื่อ ตัวเลข ไอคอน (+ ชื่อ/คำอธิบายหลักฐาน)
// ============================================================
import { useEffect, useRef, useState } from "react";
import { EvidenceIcon } from "../../court/EvidenceIcon";
import { playSfx } from "../../audio";
import "./naruhodoHud.css";

const DIR = "/characters/naruhodo_ryuichi";
const MAX_EV = 5;
const TYPE_ICON = { weapon: "🗡️", foot: "👣", receipt: "🧾", witness: "👁️" };
const TIER_NAME = { basic: "พื้นฐาน", secondary: "รอง", ultimate: "ท่าไม้ตาย" };
const HOLD_MS = { flash: 1600, choose: 15000, alibi: 3000 };

// วงนับถอยหลัง (ms ที่เหลือ = deadline − ตอนนี้ · นาฬิกาเพี้ยน = ใช้ค่าปกติของขั้นนั้น) — key ใหม่ทุกขั้น
function useRemain(deadline, nominal) {
  const [ms] = useState(() => {
    const left = Number(deadline) - Date.now();
    return Number.isFinite(left) && left > 0 && left <= nominal + 1500 ? left : nominal;
  });
  return ms;
}
function Ring({ deadline, nominal, size = 64, stroke = 5, color = "#ffd36a" }) {
  const ms = useRemain(deadline, nominal), r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <svg className="nr-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.18)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c} style={{ "--c": c, animationDuration: `${ms}ms` }} className="nr-ring-arc" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  );
}
function Bar({ deadline, nominal }) {
  const ms = useRemain(deadline, nominal);
  return <span className="nr-bar" aria-hidden="true"><i style={{ animationDuration: `${ms}ms` }} /></span>;
}

// ปกแฟ้มหลักฐาน (Court Record)
function Binder({ n }) {
  return (
    <span className="nr-binder" aria-hidden="true">
      <svg viewBox="0 0 40 48">
        <path className="b-back" d="M6 3h28a3 3 0 0 1 3 3v38a3 3 0 0 1-3 3H6z" />
        <path className="b-cover" d="M3 5a3 3 0 0 1 3-3h26a3 3 0 0 1 3 3v37a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z" />
        <rect className="b-label" x="10" y="11" width="18" height="10" rx="1.5" />
        <path className="b-ring" d="M3 12h4M3 24h4M3 36h4" />
        <path className="b-scale" d="M19 27v11M13 30h12M13 30l-3 5h6zM25 30l-3 5h6z" />
      </svg>
      {n != null && <b className="nr-binder-n">{n}</b>}
    </span>
  );
}

function EvCard({ ev, size = 40, sel, onHover, onClick, dim }) {
  return (
    <button type="button" className={`nr-ev ${ev.used ? "used" : ""} ${sel ? "sel" : ""} ${dim ? "dim" : ""}`} style={{ "--s": `${size}px` }}
      onMouseEnter={onHover} onFocus={onHover} onClick={onClick} aria-label={ev.name}>
      <EvidenceIcon idx={ev.icon | 0} size={Math.round(size * 0.82)} />
      {ev.used && <span className="nr-ev-x" aria-hidden="true" />}
    </button>
  );
}

// ---------- แถบแฟ้มหลักฐาน ----------
function scoutCds(scout, target) {
  const cds = scout && scout.cds;
  if (!cds) return [];
  const list = Array.isArray(cds) ? cds.map((c) => ({ tier: c.tier, name: c.name, left: c.left | 0 }))
    : Object.keys(TIER_NAME).filter((t) => t in cds).map((t) => ({ tier: t, left: (cds[t] && typeof cds[t] === "object" ? cds[t].left : cds[t]) | 0 }));
  const ch = target && target.character;
  return list.map((c) => ({ ...c, name: c.name || (ch && ch[c.tier] && ch[c.tier].name) || TIER_NAME[c.tier] || c.tier, img: ch && ch[c.tier] && ch[c.tier].img }));
}
// ตำแหน่ง: เหนือมุมขวาบนของแผงตัวเรา (.hud-prof — ที่เดียวกับแถบ OverHeat ของแม็กน่า) · ไม่ชนหน้าปัดไพ่/ปุ่มจั่ว/ช่องสกิล/ปุ่มตี
//  แผงตัวเราไม่แสดง (ช่วงจั่ว · HUD หลบ) = ซ่อนแถบ
function useProfAnchor(ref) {
  const [at, setAt] = useState(null);
  useEffect(() => {
    let raf = 0, last = "";
    const tick = () => {
      const prof = document.querySelector(".hud-prof"), el = ref.current;
      if (el) {
        const b = prof ? prof.getBoundingClientRect() : null;
        const ok = b && b.width > 0 && b.height > 0 && b.top < window.innerHeight - 8;
        const next = ok ? { left: Math.round(b.right - el.offsetWidth), top: Math.round(b.top - el.offsetHeight - 8) } : null;
        const key = next ? `${next.left}:${next.top}` : "-";
        if (key !== last) { last = key; setAt(next); }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ref]);
  return at;
}
function EvidenceDock({ N, players, onOpen, zoom }) {
  const ref = useRef(null);
  const at = useProfAnchor(ref);
  const ev = N.evidence || [];
  const live = ev.filter((e) => !e.used);
  const scout = N.scout && N.scout.targetId ? N.scout : null;
  const target = scout ? (players || []).find((p) => p.id === scout.targetId) : null;
  const cds = scoutCds(scout, target);
  const slots = Array.from({ length: MAX_EV }, (_, i) => ev[i] || null);
  return (
    <div ref={ref} className={`nr-dock ${at ? "" : "off"}`} style={{ "--k": zoom || 1, ...(at ? { left: at.left, top: at.top } : null) }}>
      {scout && (
        <div className="nr-scout" title={target ? target.name : ""}>
          <span className="nr-scout-face">
            {target && target.img ? <img src={target.img} alt="" draggable={false} /> : null}
            <i aria-hidden="true">🔍</i>
          </span>
          {cds.map((c) => (
            <span key={c.tier} className={`nr-cd ${c.left > 0 ? "" : "ready"}`} title={c.name}>
              {c.img ? <img src={c.img} alt="" draggable={false} /> : <em>{(TIER_NAME[c.tier] || c.name || "").slice(0, 1)}</em>}
              <b>{c.left > 0 ? c.left : "✓"}</b>
            </span>
          ))}
        </div>
      )}
      <button type="button" className="nr-dock-main" onClick={onOpen} aria-label="หลักฐาน">
        <Binder />
        <b className="nr-dock-n">{live.length}<small>/{MAX_EV}</small></b>
      </button>
      {/* ชี้ = ช่องหลักฐานกางขึ้นด้านบน */}
      <span className="nr-dock-pop" aria-hidden="true">
        {slots.map((e, i) => (e
          ? <span key={e.id || i} className={`nr-dock-slot on ${e.used ? "used" : ""}`}><EvidenceIcon idx={e.icon | 0} size={30} /></span>
          : <span key={`x${i}`} className="nr-dock-slot" />))}
      </span>
    </div>
  );
}

// ---------- หน้าต่างบันทึกหลักฐาน ----------
export function CourtRecord({ evidence, onClose, pick, onPick }) {
  const list = evidence || [];
  const [selId, setSelId] = useState(() => (list.find((e) => !e.used) || list[0] || {}).id || null);
  const sel = list.find((e) => e.id === selId) || list[0] || null;
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const slots = Array.from({ length: MAX_EV }, (_, i) => list[i] || null);
  return (
    <div className="nr-rec-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="nr-rec" role="dialog" aria-label="หลักฐาน">
        <header className="nr-rec-head">
          <Binder />
          <h3>หลักฐาน</h3>
          <span className="nr-rec-n">{list.filter((e) => !e.used).length}<small>/{MAX_EV}</small></span>
          <button type="button" className="nr-x" onClick={onClose} aria-label="ปิด">✕</button>
        </header>
        <div className="nr-rec-body">
          <section className={`nr-rec-detail ${sel ? "" : "empty"}`}>
            {sel ? (
              <>
                <div className={`nr-rec-big ${sel.used ? "used" : ""}`} key={sel.id}>
                  <EvidenceIcon idx={sel.icon | 0} size={112} />
                  {sel.used && <span className="nr-stamp">ใช้แล้ว</span>}
                </div>
                <div className="nr-rec-text">
                  <h4>{sel.name}</h4>
                  <div className="nr-rec-meta">
                    <span title={sel.type}>{TYPE_ICON[sel.type] || "📁"}</span>
                    {sel.actorName && <span>{sel.actorName}</span>}
                    {sel.round != null && <span>⏱ {sel.round}</span>}
                  </div>
                  <p>{sel.desc}</p>
                </div>
              </>
            ) : <Binder />}
          </section>
          <section className="nr-rec-grid">
            {slots.map((e, i) => (e
              ? <EvCard key={e.id || i} ev={e} size={64} sel={sel && e.id === sel.id} onHover={() => setSelId(e.id)}
                  dim={pick ? !pick(e) : false} onClick={() => { setSelId(e.id); if (onPick && pick && pick(e)) onPick(e); }} />
              : <span key={`x${i}`} className="nr-ev empty" style={{ "--s": "64px" }} />))}
          </section>
        </div>
      </div>
    </div>
  );
}

// ---------- ปุ่ม รอเดี๋ยว!!! ----------
function HoldItButton({ N, onPress, zoom }) {
  const cd = N.holdCd | 0, ready = !!N.holdReady && cd <= 0;
  return (
    <button type="button" className={`nr-hold ${ready ? "ready" : "off"}`} style={{ "--k": zoom || 1 }} disabled={!ready}
      onClick={ready ? onPress : undefined} aria-label="รอเดี๋ยว!!!">
      <span className="nr-hold-art"><img src={`${DIR}/court/shout_holdit_jp.webp`} alt="" draggable={false} /></span>
      <span className="nr-hold-name">รอเดี๋ยว!!!</span>
      {cd > 0 && <span className="nr-hold-cd">⏳<b>{cd}</b></span>}
    </button>
  );
}

// ---------- ตาแทรก (ทนาย) ----------
function HoldItPanel({ hold, N, players, emit, onPickMove, movePicking, zoom }) {
  const [objecting, setObjecting] = useState(false);
  const [hoverEv, setHoverEv] = useState(null);
  const actor = (players || []).find((p) => p.id === hold.actorId);
  const bound = (N.evidence || []).filter((e) => !e.used && e.actorId === hold.actorId);
  const act = (payload) => { emit("holdItAct", payload); };
  const tip = bound.find((e) => e.id === hoverEv) || null;
  return (
    <div className="nr-mini" style={{ "--k": zoom || 1 }}>
      <div className="nr-mini-art"><img src={`${DIR}/sprite/talk.webp`} alt="" draggable={false} /></div>
      <div className="nr-mini-main">
        <div className="nr-mini-head">
          <img className="nr-mini-bubble" src={`${DIR}/court/shout_holdit_jp.webp`} alt="" draggable={false} />
          {actor && <span className="nr-mini-vs">{actor.img && <img src={actor.img} alt="" draggable={false} />}<b>{actor.name}</b></span>}
          <span className="nr-mini-clock"><Ring key={`${hold.actorId}|choose|${hold.deadline}`} deadline={hold.deadline} nominal={HOLD_MS.choose} size={40} stroke={4} /></span>
        </div>
        {!objecting ? (
          <div className="nr-mini-acts">
            <button type="button" className={`nr-act move ${movePicking ? "on" : ""}`} onClick={onPickMove}><i aria-hidden="true">👣</i><span>เดิน 2</span></button>
            <button type="button" className="nr-act gather" onClick={() => act({ kind: "gather" })}><i aria-hidden="true">🔍</i><span>เก็บหลักฐาน</span></button>
            <button type="button" className="nr-act object" disabled={!bound.length} onClick={() => setObjecting(true)}>
              <i aria-hidden="true">✋</i><span>คัดค้าน!</span>{bound.length > 0 && <b>{bound.length}</b>}
            </button>
          </div>
        ) : (
          <div className="nr-mini-pick">
            <button type="button" className="nr-back" onClick={() => setObjecting(false)} aria-label="กลับ">←</button>
            <div className="nr-mini-evs">
              {bound.map((e) => <EvCard key={e.id} ev={e} size={52} sel={hoverEv === e.id} onHover={() => setHoverEv(e.id)} onClick={() => act({ kind: "object", evId: e.id })} />)}
            </div>
            {tip && (
              <div className="nr-tip">
                <b>{tip.name}</b>
                <p>{tip.desc}</p>
              </div>
            )}
          </div>
        )}
        <Bar key={`${hold.actorId}|bar|${hold.deadline}`} deadline={hold.deadline} nominal={HOLD_MS.choose} />
      </div>
    </div>
  );
}

// ---------- นารุโฮโดะตัวเล็กแบบ DS มุมจอ (ทุกคน) ----------
function HoldItCorner({ hold, players, zoom }) {
  const law = (players || []).find((p) => p.id === hold.lawyerId);
  const nod = hold.phase === "flash";
  return (
    <div className="nr-corner" aria-hidden="true" style={{ "--k": zoom || 1 }}>
      <div className="nr-corner-scr">
        <img src={`${DIR}/court/bg_defense.webp`} alt="" className="nr-corner-bg" draggable={false} />
        <img src={`${DIR}/sprite/${nod ? "nod.gif" : "talk.webp"}`} alt="" className="nr-corner-fig" draggable={false} />
        <img src={`${DIR}/court/desk_defense.webp`} alt="" className="nr-corner-desk" draggable={false} />
      </div>
      {law && <span className="nr-corner-name">{law.name}</span>}
    </div>
  );
}

// ---------- ข้อแก้ตัว 📍 (ผู้ถูกคัดค้าน) ----------
function AlibiCounter({ hold, alibi, emit }) {
  return (
    <div className="nr-alibi">
      <button type="button" className="nr-alibi-btn" onClick={() => emit("holdItAlibi", {})} aria-label="ข้อแก้ตัว">
        <Ring key={`${hold.actorId}|alibi|${hold.deadline}`} deadline={hold.deadline} nominal={HOLD_MS.alibi} size={132} stroke={7} color="#ff5a6a" />
        <span className="nr-alibi-pin">📍</span>
        {alibi > 0 && <b className="nr-alibi-n">×{alibi}</b>}
      </button>
    </div>
  );
}

// ---------- ผลตาแทรก: ป้ายตะโกนกลางจอ ----------
function ShoutFlash({ kind }) {
  if (kind === "object") return <div className="nr-shout"><img src={`${DIR}/court/shout_objection.webp`} alt="" draggable={false} /></div>;
  if (kind === "countered") return <div className="nr-shout pin"><span>📍</span></div>;
  return null;
}
const RESULT_SFX = { object: "naru_objection", countered: "naru_penalty" };

export default function NaruhodoHud({ state, me, hidden, zoom, emit, onPickMove, movePicking }) {
  const N = me && me.naruhodo;
  const hold = state.holdIt || null;
  const players = state.players || [];
  const [recOpen, setRecOpen] = useState(false);
  const court = !!state.court;
  const [flash, setFlash] = useState(null);
  const lastRes = useRef("");
  // ผลตาแทรกใหม่ → เสียง + ป้าย (ครั้งเดียวต่อผล)
  //  server: result = { kind: "move"|"gather"|"object", ok?, ev? } · object + ok false = ผู้กระทำใช้ข้อแก้ตัวสวน (countered)
  const res = hold && hold.result ? hold.result : null;
  const resKind = res ? (res.kind === "object" && res.ok === false ? "countered" : res.kind) : "";
  const resKey = res ? `${hold.seq || ""}|${hold.lawyerId}|${hold.actorId}|${resKind}` : "";
  useEffect(() => {
    if (!resKey || resKey === lastRes.current) return undefined;
    lastRes.current = resKey;
    const kind = resKey.split("|")[3];
    if (court) return undefined;
    if (RESULT_SFX[kind]) playSfx(RESULT_SFX[kind]);
    if (kind !== "object" && kind !== "countered") return undefined;
    const show = setTimeout(() => setFlash(kind), 0);
    const hide = setTimeout(() => setFlash(null), 1300);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, [resKey, court]);

  if (state.court) return null; // ระหว่างคดี = ฉากศาลทั้งจอ
  const myId = me && me.id;
  const otherTurn = !!myId && state.gameState === "ACTION" && !!state.actorId && state.actorId !== myId;
  const lawyer = !!hold && hold.lawyerId === myId;
  const isActor = !!hold && hold.actorId === myId;
  return (
    <>
      {N && !hidden && !hold && <EvidenceDock N={N} players={players} zoom={zoom} onOpen={() => setRecOpen(true)} />}
      {N && recOpen && <CourtRecord evidence={N.evidence} onClose={() => setRecOpen(false)} />}
      {N && otherTurn && !hold && N.holdCd != null && <HoldItButton N={N} zoom={zoom} onPress={() => emit("holdIt", {})} />}
      {hold && <HoldItCorner key={`${hold.lawyerId}|${hold.actorId}`} hold={hold} players={players} zoom={zoom} />}
      {hold && lawyer && N && hold.phase === "choose" && !res && (
        <HoldItPanel key={`${hold.actorId}|${hold.deadline}`} hold={hold} N={N} players={players} emit={emit} onPickMove={onPickMove} movePicking={movePicking} zoom={zoom} />
      )}
      {hold && isActor && hold.phase === "alibi" && <AlibiCounter hold={hold} alibi={me.courtAlibi | 0} emit={emit} />}
      {flash && <ShoutFlash kind={flash} />}
    </>
  );
}
