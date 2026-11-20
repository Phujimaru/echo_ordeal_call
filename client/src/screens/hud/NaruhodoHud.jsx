// ============================================================
//  HUD ของนารุโฮโดะ ริวอิจิ (GRID_PLAN §7.37 · สัญญา .claude/plans/naruhodo-contract.md) — จอคอม/แท็บเล็ตเท่านั้น
//   EvidenceDock   แถบแฟ้มหลักฐานกลางเหนือแผงล่าง: ปกแฟ้ม + จำนวน · ช่องหลักฐาน 5 ช่อง · ป้ายเป้าที่สืบสวน (🔍 + คูลดาวน์ของเป้า)
//   CourtRecord    หน้าต่างบันทึกหลักฐาน (กดแถบ): ช่องหลักฐาน · ชี้/เลือก = ชื่อ + คำอธิบาย (ผู้ใช้สั่ง — ข้อความเดียวที่อนุญาต)
//   HoldItButton   ปุ่มลอย รอเดี๋ยว!!! ตอนตาคนอื่น (players[].naruhodo.holdReady / holdCd)
//   HoldItBar      ตาแทรก (state.holdIt — ทุกคนเห็น): แถบ 待った! ล่างกลางแทนแถวสกิล · DS นารุโฮโดะซ้ายแถบ · วงนับถอยหลัง
//                  ทนาย: เดิน 2 / เก็บหลักฐาน / คัดค้าน! (เลือกหลักฐานกางขึ้นบน) · ผู้ถูกแทรก ขั้น alibi: ปุ่ม 📍
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

// ---------- แถบตาแทรก 待った! (ทุกคนเห็น · ล่างกลางแทนแถวสกิล) ----------
//  วางระหว่างแผงตัวเรา (.hud-left) กับปุ่มกระเป๋า (.hud-right) · ย่อเองถ้าที่ไม่พอ · Game.jsx ซ่อนแถวสกิล/คำสั่งระหว่างตาแทรก
//  ทนาย: 3 ปุ่ม (เดิน 2 / เก็บหลักฐาน / คัดค้าน! → เลือกหลักฐานกางขึ้นด้านบน) · ผู้ถูกแทรก (ขั้น alibi): ปุ่ม 📍 · คนอื่น: ดูอย่างเดียว
function useDockSlot(ref, zoom) {
  const [at, setAt] = useState(null);
  useEffect(() => {
    let raf = 0, last = "";
    const vis = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0 && b.top < window.innerHeight ? b : null; };
    const tick = () => {
      const el = ref.current;
      if (el) {
        const k = zoom || 1, W = window.innerWidth;
        const lb = vis(document.querySelector(".hud-left .hud-prof") || document.querySelector(".hud-left")), rb = vis(document.querySelector(".hud-right"));
        const L = lb ? lb.right + 14 : 16, R = rb ? rb.left - 14 : W - 16;
        const s = Math.max(0.45, Math.min(k, (R - L) / Math.max(1, el.offsetWidth)));
        const next = { left: Math.round((L + R) / 2), bottom: Math.round(22 * k), s: Math.round(s * 1000) / 1000 };
        const key = `${next.left}:${next.bottom}:${next.s}`;
        if (key !== last) { last = key; setAt(next); }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ref, zoom]);
  return at;
}
function HoldItBar({ hold, N, me, players, emit, onPickMove, movePicking, zoom }) {
  const ref = useRef(null);
  const at = useDockSlot(ref, zoom);
  const [objecting, setObjecting] = useState(false);
  const [hoverEv, setHoverEv] = useState(null);
  const myId = me && me.id;
  const law = (players || []).find((p) => p.id === hold.lawyerId);
  const actor = (players || []).find((p) => p.id === hold.actorId);
  const lawyer = hold.lawyerId === myId && !!N;
  const isActor = hold.actorId === myId;
  const choosing = lawyer && hold.phase === "choose" && !hold.result;
  const bound = lawyer ? (N.evidence || []).filter((e) => !e.used && e.actorId === hold.actorId) : [];
  const tip = bound.find((e) => e.id === hoverEv) || null;
  const nominal = HOLD_MS[hold.phase] || HOLD_MS.choose;
  const act = (payload) => emit("holdItAct", payload);
  return (
    <div ref={ref} className={`nr-mini ${at ? "" : "off"}`} style={at ? { left: at.left, bottom: at.bottom, "--s": at.s } : undefined}>
      {choosing && objecting && (
        <div className="nr-mini-up">
          <button type="button" className="nr-back" onClick={() => setObjecting(false)} aria-label="กลับ">✕</button>
          <div className="nr-mini-evs">
            {bound.map((e) => <EvCard key={e.id} ev={e} size={56} sel={hoverEv === e.id} onHover={() => setHoverEv(e.id)} onClick={() => act({ kind: "object", evId: e.id })} />)}
          </div>
          {tip && <div className="nr-tip"><b>{tip.name}</b><p>{tip.desc}</p></div>}
        </div>
      )}
      <div className="nr-mini-art">
        <img className="bg" src={`${DIR}/court/bg_defense.webp`} alt="" draggable={false} />
        <img className="fig" src={`${DIR}/sprite/${hold.phase === "flash" ? "nod.gif" : "talk.webp"}`} alt="" draggable={false} />
        <img className="desk" src={`${DIR}/court/desk_defense.webp`} alt="" draggable={false} />
      </div>
      <div className="nr-mini-main">
        <div className="nr-mini-head">
          <img className="nr-mini-bubble" src={`${DIR}/court/shout_holdit_jp.webp`} alt="" draggable={false} />
          {law && !lawyer && <b className="nr-mini-law">{law.name}</b>}
          {actor && <span className="nr-mini-vs"><i aria-hidden="true">⏸</i>{actor.img && <img src={actor.img} alt="" draggable={false} />}<b>{actor.name}</b></span>}
        </div>
        {choosing ? (
          <div className="nr-mini-acts">
            <button type="button" className={`nr-act move ${movePicking ? "on" : ""}`} onClick={onPickMove}><i aria-hidden="true">👣</i><span>เดิน 2</span></button>
            <button type="button" className="nr-act gather" onClick={() => act({ kind: "gather" })}><i aria-hidden="true">🔍</i><span>เก็บหลักฐาน</span></button>
            <button type="button" className={`nr-act object ${objecting ? "on" : ""}`} disabled={!bound.length} onClick={() => setObjecting((v) => !v)}>
              <i aria-hidden="true">✋</i><span>คัดค้าน!</span>{bound.length > 0 && <b>{bound.length}</b>}
            </button>
          </div>
        ) : isActor && hold.phase === "alibi" ? (
          <div className="nr-mini-acts one">
            <button type="button" className="nr-act alibi" onClick={() => emit("holdItAlibi", {})}><i aria-hidden="true">📍</i><span>×{(me && me.courtAlibi) | 0}</span></button>
          </div>
        ) : null}
      </div>
      <span className="nr-mini-clock"><Ring key={`${hold.seq || ""}|${hold.phase}|${hold.deadline}`} deadline={hold.deadline} nominal={nominal} size={52} stroke={5} color={hold.phase === "alibi" ? "#ff5a6a" : "#ffd36a"} /></span>
      <Bar key={`${hold.seq || ""}|bar|${hold.phase}|${hold.deadline}`} deadline={hold.deadline} nominal={nominal} />
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
  // แฟ้ม/ปุ่มของนารุโฮโดะ: เฉพาะเมื่อ server ส่งข้อมูลเต็มของเจ้าของ (ตัวเราเป็นนารุโฮโดะ หรือ Echo สวมร่าง) — คนอื่นได้แค่ { holdReady }
  const N = me && me.naruhodo && Array.isArray(me.naruhodo.evidence) ? me.naruhodo : null;
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
  return (
    <>
      {N && !hidden && !hold && <EvidenceDock N={N} players={players} zoom={zoom} onOpen={() => setRecOpen(true)} />}
      {N && recOpen && <CourtRecord evidence={N.evidence} onClose={() => setRecOpen(false)} />}
      {N && otherTurn && !hold && N.holdCd != null && <HoldItButton N={N} zoom={zoom} onPress={() => emit("holdIt", {})} />}
      {hold && <HoldItBar key={`${hold.seq || ""}|${hold.lawyerId}|${hold.actorId}`} hold={hold} N={N} me={me} players={players} emit={emit} onPickMove={onPickMove} movePicking={movePicking} zoom={zoom} />}
      {flash && <ShoutFlash kind={flash} />}
    </>
  );
}
