// แผงกดในศาล (ตามบทบาทของผู้ชม) — ซ้อนบน CourtStage · ทุกหน่วยเป็น --u (1/192 ของความสูงฉาก)
import { useEffect, useRef, useState } from "react";
import { IMG } from "./courtAssets";
import { EvidenceIcon } from "./EvidenceIcon";
import { Sprite } from "./CourtStage";
import { csfx } from "./courtAudio";
import { Rich } from "./CourtText";

const stop = (e) => e.stopPropagation();
export const ROLE_NAME = { L: "ทนาย", co: "ผู้ช่วยทนาย", D: "จำเลย", C: "ฝ่ายค้าน", G: "ประชาชน" };
const sepia = (k, a = 0.5) => ({ backgroundImage: `linear-gradient(rgba(16,11,6,${a}), rgba(16,11,6,${a + 0.15})), url(${IMG(k)})` });

// วงเวลาที่เหลือ
export function Ring({ deadline, k }) {
  const total = useRef({ k: null, ms: 1 });
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 200); return () => clearInterval(t); }, []);
  if (!deadline) return null;
  if (total.current.k !== k + ":" + deadline) total.current = { k: k + ":" + deadline, ms: Math.max(1000, deadline - Date.now()) };
  const left = Math.max(0, deadline - now), f = Math.min(1, left / total.current.ms), sec = Math.ceil(left / 1000);
  const R = 15, C = 2 * Math.PI * R;
  return (
    <div className={`cring ${sec <= 3 ? "hot" : ""}`}>
      <svg viewBox="0 0 36 36"><circle cx="18" cy="18" r={R} className="bg" /><circle cx="18" cy="18" r={R} className="fg" strokeDasharray={C} strokeDashoffset={C * (1 - f)} /></svg>
      <b>{sec}</b>
    </div>
  );
}

export function RoleChip({ role, me, out }) {
  if (!role || role === "spec") return null;
  return (
    <div className={`crole r-${role} ${out ? "out" : ""}`}>
      {me?.img && <i style={{ backgroundImage: `url(${me.img})` }} />}
      <span>{out ? "✕ " : ""}{ROLE_NAME[role]}</span>
    </div>
  );
}

// แฟ้มหลักฐาน (ทนาย/ผู้ช่วย) หรือสิ่งที่เห็นเอง (ผู้ช่วย/ประชาชน)
//  mode: view | present | lend | witness · items: [{ id|key, icon, name, desc, used }]
//  rel = { ids: Set(ไอดีจำเลย), face } → หลักฐานของจำเลยขึ้นก่อน + เรืองทอง + หน้าจำเลย · ของคนอื่นจางลง (ยังยื่นได้) · ไม่บอกว่าขัดประโยคไหน
export function CourtRecord({ items: raw, mode, cap = 5, onPick, onClose, who, rel }) {
  const isRel = (e) => !!rel && rel.ids.has(e.actorId);
  const items = rel ? [...raw].sort((a, b) => (isRel(b) ? 1 : 0) - (isRel(a) ? 1 : 0)) : raw;
  const live = items.filter((e) => !e.used);
  const [sel, setSel] = useState(() => (live.find(isRel) || live[live.length - 1] || items[0] || null));
  const [hov, setHov] = useState(null);
  const kid = (e) => e.id || e.key;
  const cur = items.find((e) => sel && kid(e) === kid(sel)) || null;
  const slots = mode === "view" || mode === "present" ? Math.max(cap, items.length) : items.length;
  const act = { present: "เอานี่ไปดู!", lend: "ส่งให้ทนาย", witness: "ขึ้นให้การ" }[mode];
  useEffect(() => { csfx("whoosh"); }, []);
  return (
    <div className="cui dim" onClick={stop}>
      <div className={`crec m-${mode}`} style={sepia("ui_bottom", 0.35)}>
        <div className="crechead">
          <span className="crectab">{mode === "lend" || mode === "witness" ? "สิ่งที่เห็น" : "แฟ้มหลักฐาน"}</span>
          <button className="cx" onClick={onClose}>✕</button>
        </div>
        <div className="crecbody">
          <div className="crecwho">
            {who ? <div className="crecface" style={{ backgroundImage: `url(${who})` }} />
              : <div className="crecnaru"><Sprite atlas="naruhodo" anim="paper" x={30} scale={0.6} /></div>}
          </div>
          <div className="crecmain">
            <div className="cslots">
              {Array.from({ length: slots }, (_, i) => {
                const e = items[i];
                if (!e) return <div key={"x" + i} className="cslot empty" />;
                const on = cur && kid(cur) === kid(e);
                return (
                  <button key={kid(e)} className={`cslot ${on ? "on" : ""} ${e.used ? "used" : ""} ${rel ? (isRel(e) ? "rel" : "unrel") : ""}`} disabled={e.used}
                    onMouseEnter={() => setHov(e)} onMouseLeave={() => setHov(null)}
                    onClick={() => { setSel(e); csfx("blip_mid"); }} onDoubleClick={() => act && !e.used && onPick(e)}>
                    <EvidenceIcon idx={e.icon} size={26} u />
                    {isRel(e) && rel.face && <i className="cslotface" style={{ backgroundImage: `url(${rel.face})` }} />}
                    {e.pinned && <i className="cslotpin">📌</i>}
                    {hov === e && <span className="ctip"><b><Rich text={e.name} /></b><Rich text={e.desc} /></span>}
                  </button>
                );
              })}
            </div>
            {cur && (
              <div className="cdetail" key={kid(cur)}>
                <div className="cdicon"><EvidenceIcon idx={cur.icon} size={36} u /></div>
                <div className="cdtext"><b>{cur.pinned ? "📌 " : ""}<Rich text={cur.name} /></b><p><Rich text={cur.desc} /></p></div>
              </div>
            )}
          </div>
        </div>
        {act && (
          <div className="crow">
            <button className={`cbtn ${mode === "present" ? "red big" : "green"}`} disabled={!cur || cur.used} onClick={() => onPick(cur)}>{act}</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ไอคอนเวกเตอร์ (ปุ่มแบบ Ace Attorney HD)
export const Ico = {
  bubble: <svg viewBox="0 0 24 24"><path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-8l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /><circle cx="8" cy="10.5" r="1.4" className="k" /><circle cx="12" cy="10.5" r="1.4" className="k" /><circle cx="16" cy="10.5" r="1.4" className="k" /></svg>,
  folder: <svg viewBox="0 0 24 24"><path d="M2 6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" /><path d="M2 10h20" className="k2" /></svg>,
  scroll: <svg viewBox="0 0 24 24"><path d="M6 3h11a3 3 0 0 1 3 3v1h-4v11a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-1h3z" /><path d="M8 8h5M8 11.5h5M8 15h3" className="k2" /></svg>,
  gavel: <svg viewBox="0 0 24 24"><path d="M13.6 2.6l7.8 7.8-3 3-7.8-7.8z" /><path d="M11.6 9.4l3 3-8.8 8.8a2.1 2.1 0 0 1-3-3z" /><rect x="12.5" y="19.5" width="9.5" height="2.6" rx="1" /></svg>,
  chevL: <svg viewBox="0 0 12 24"><path d="M9 3L3 12l6 9" /></svg>,
  chevR: <svg viewBox="0 0 12 24"><path d="M3 3l6 9-6 9" /></svg>,
};

// ทนาย/ผู้ช่วย: ซักค้าน — ปุ่มเกาะขอบกล่องข้อความ ไม่บังพยาน
export function CrossControls({ court, emit, role, sightings, me, meImg, rel }) {
  const [rec, setRec] = useState(null);
  const list = court.list || [], i = court.cx || 0, st = list[i];
  const ev = court.evidence || [];
  const canLend = role === "co" && !(court.lent || []).includes(me) && sightings.length > 0;
  if (!st) return null;
  const go = (d) => { const n = list.length; let j = i; for (let k = 0; k < n; k++) { j = (j + d + n) % n; if (!list[j].done) break; } emit("courtAct", { type: "view", idx: j }); };
  if (rec === "present" || rec === "view") {
    return <CourtRecord items={ev} mode={rec} rel={rel} onClose={() => setRec(null)} onPick={(e) => { setRec(null); emit("courtAct", { type: "present", idx: i, evId: e.id }); }} />;
  }
  if (rec === "lend") {
    return <CourtRecord items={sightings} mode="lend" who={meImg} onClose={() => setRec(null)} onPick={(e) => { setRec(null); emit("courtAct", { type: "lend", evKey: e.key }); }} />;
  }
  const noPress = st.done || st.pressed || (court.pressLeft ?? 1) <= 0;
  const noPresent = st.done || st.presentTried || !ev.some((e) => !e.used);
  return (
    <div className="cui pass" onClick={stop}>
      <div className="cdock">
        <button className="cact press" disabled={noPress} onClick={() => emit("courtAct", { type: "press", idx: i })}><i>{Ico.bubble}</i><span>เดี๋ยวก่อน!</span></button>
        <button className="cact present" disabled={noPresent} onClick={() => setRec("present")}><i>{Ico.folder}</i><span>คัดค้าน!</span></button>
      </div>
      <button className="cchev l" onClick={() => go(-1)} aria-label="ก่อนหน้า">{Ico.chevL}</button>
      <button className="cchev r" onClick={() => go(1)} aria-label="ถัดไป">{Ico.chevR}</button>
      <div className="ctools">
        {canLend && <button className="ctool" onClick={() => setRec("lend")} title="ส่งให้ทนาย"><i>{Ico.scroll}</i><b>{sightings.length}</b></button>}
        <button className="ctool" onClick={() => setRec("view")} title="แฟ้มหลักฐาน"><i>{Ico.folder}</i><b>{ev.filter((e) => !e.used).length}</b></button>
        <button className="ctool end" onClick={() => emit("courtAct", { type: "end" })} title="จบซักค้าน"><i>{Ico.gavel}</i><b>จบ</b></button>
      </div>
    </div>
  );
}

// ฝ่ายทนายดูแฟ้มได้ทุกเวลา
export function RecordButton({ court, rel }) {
  const [open, setOpen] = useState(false);
  const ev = court.evidence || [];
  if (open) return <CourtRecord items={ev} mode="view" rel={rel} onClose={() => setOpen(false)} />;
  return <div className="cui pass"><div className="ctools"><button className="ctool" onClick={(e) => { stop(e); setOpen(true); }} title="แฟ้มหลักฐาน"><i>{Ico.folder}</i><b>{ev.filter((e) => !e.used).length}</b></button></div></div>;
}

// วิธีเล่นตามบทบาท (ผู้ใช้ขอปุ่ม ? 2026-11-20 — ข้อความอธิบายมีได้เฉพาะในหน้านี้)
const HELP = {
  L: { t: "ทนาย", goal: "ทำให้จำเลยหมดความน่าเชื่อถือ (6) ก่อนตัวเอง ภายใน 4 รอบ", items: [
    ["💬 เดี๋ยวก่อน!", "ซักประโยคที่กำลังดู 1 ครั้ง/รอบ · ประโยคจริง = จำเลยรับสารภาพ −1 · ถ้ามี 📍 ข้อแก้ตัว ข้อแก้ตัวแตก และอาจได้หลักฐานใหม่"],
    ["📁 คัดค้าน!", "ยื่นหลักฐานที่ขัดกับประโยค (ชื่อท่า / คนโดน / เทิร์น ตรงกัน) · ถูก = จำเลยเสีย 2–4 · ผิด หรือยื่นใส่ประโยคจริง = ทนาย −1"],
    ["📍 ข้อแก้ตัว", "ประโยคที่มีข้อแก้ตัวจะเผาหลักฐานทิ้ง (ทนาย −1) ยกเว้นหลักฐานพยาน — กดเดี๋ยวก่อนให้แตกก่อน"],
    ["‹ ›  🔨", "เลื่อนดูประโยค · 🔨 จบ = จบการซักค้านรอบนี้"],
  ], win: "มีความผิด = จำเลยตายทันที · ไม่มีความผิด = นารุโฮโดะ −5 และสตั้น 2 เทิร์น", time: "ซักค้าน 60 วิต่อรอบ" },
  co: { t: "ผู้ช่วยทนาย", goal: "ช่วยทนายให้จำเลยหมดความน่าเชื่อถือ", items: [
    ["💬 / 📁", "กดซักหรือยื่นหลักฐานแทนทนายได้ (ใครกดก่อนได้ก่อน)"],
    ["📜 ส่งให้ทนาย", "ยื่นเหตุการณ์ของจำเลยที่คุณเห็นเองเข้าแฟ้มทนาย 1 ครั้งต่อคดี"],
  ], win: "ทนายชนะ = จำเลยตายทันที", time: "ซักค้าน 60 วิต่อรอบ" },
  D: { t: "จำเลย", goal: "รอดให้ครบ 4 รอบ หรือทำให้ทนายหมดความน่าเชื่อถือ", items: [
    ["คำให้การ", "เลือก 4 ประโยคต่อรอบ · 🎭 2 + ⚖️ 2 พอดี · 🎭 = โกหก (ปฏิเสธสิ่งที่ทำจริง) · ⚖️ = ความจริง (ทนายยื่นหลักฐานใส่ = ทนาย −1 แต่ถ้าทนายกด เดี๋ยวก่อน! = คุณรับสารภาพ −1)"],
    ["📍 ข้อแก้ตัว", "แปะบนประโยคโกหก = หลักฐานที่ยื่นใส่ถูกเผา ทนาย −1 · ได้จากการกระทำที่นารุโฮโดะไม่เห็น"],
  ], win: "มีความผิด = ตายทันที · ไม่มีความผิด = ทนาย −5 และสตั้น", time: "เลือกคำให้การ 40 วิ (หมดเวลา = สุ่มให้)" },
  C: { t: "ฝ่ายค้าน", goal: "ปกป้องจำเลยฝ่ายเดียวกับคุณ", items: [
    ["คำให้การ", "ช่วยเลือกคำให้การ/ข้อแก้ตัวแทนจำเลยได้"],
    ["คัดค้าน!", "ตอนทนายยื่นหลักฐาน กดภายใน 3 วิ = หลักฐานครั้งนั้นถูกปัดตก (1 ครั้งต่อรอบ)"],
  ], win: "จำเลยไม่มีความผิด = ทนาย −5 และสตั้น", time: "ปุ่มคัดค้านขึ้น 3 วิ" },
  G: { t: "ประชาชน", goal: "เชียร์ฝ่ายที่คิดว่าจะชนะ", items: [
    ["👏 / 👎", "เชียร์ +1 หรือโห่ −1 ความน่าเชื่อถือของฝ่ายนั้น (1 ครั้งต่อรอบ)"],
    ["🍅", "ปาของ · ปาเกิน 3 ลูกในรอบเดียว = คนปาล่าสุดถูกไล่ออกจากศาล"],
    ["📜 / 📍", "ขึ้นให้การ — ช่วยทนาย: ยื่นเหตุการณ์ของจำเลยที่คุณเห็น · ช่วยจำเลย: ข้อแก้ตัว +1 (1 ครั้งต่อคดี)"],
  ], win: "คนเชียร์ฝ่ายชนะมากสุด ❤ +1 · พยานฝ่ายชนะ ❤ +1 🪙 +2", time: "ช่วงประชาชน 8 วิหลังจบแต่ละรอบ" },
  spec: { t: "ผู้ชม", goal: "ชมการพิจารณาคดี", items: [["⚖️", "ทนายยื่นหลักฐานจับคำโกหกของจำเลย · จำเลยใช้ข้อแก้ตัวป้องกัน"]], win: "มีความผิด = จำเลยตาย · ไม่มีความผิด = ทนายถูกลงโทษ", time: "" },
};
export function HelpButton({ role }) {
  const [open, setOpen] = useState(false);
  const h = HELP[role] || HELP.spec;
  return (
    <>
      <button className="chelp" onClick={(e) => { stop(e); setOpen(true); csfx("whoosh"); }} aria-label="วิธีเล่น">?</button>
      {open && (
        <div className="cui dim" onClick={(e) => { stop(e); setOpen(false); }}>
          <div className="cdoc" onClick={stop} style={{ "--wm": `url(${IMG("ui_title")})` }}>
            <header><i>{Ico.gavel}</i><div><small>วิธีเล่น</small><b>{h.t}</b></div><button className="cx" onClick={() => setOpen(false)}>✕</button></header>
            <p className="cgoal">{h.goal}</p>
            <dl>{h.items.map(([k, d], n) => <div key={n}><dt>{k}</dt><dd>{d}</dd></div>)}</dl>
            <footer><span>⚖️ {h.win}</span>{h.time && <span>⏱ {h.time}</span>}</footer>
          </div>
        </div>
      )}
    </>
  );
}

// จำเลย/ฝ่ายค้าน: เรียงคำให้การ
export function Builder({ court, emit }) {
  const pool = court.pool || [];
  const [pick, setPick] = useState([]);
  const [sent, setSent] = useState(false);
  const alibi = court.alibiLeft || 0;
  const used = pick.filter((p) => p.al).length;
  const N = court.nStatements || 4; // ผู้ใช้ 2026-11-20: 4 ประโยค ปลอม 2 จริง 2
  // ต้องมีประโยคปฏิเสธ 🎭 อย่างน้อย 2 (ผู้ใช้ 2026-11-20) — server ส่ง minLies มา · ไม่มี = คิดเอง
  const needLies = court.minLies != null ? court.minLies : Math.min(2, pool.filter((x) => x.kind === "lie").length);
  const lies = pick.filter((p) => (pool.find((x) => x.key === p.key) || {}).kind === "lie").length;
  if (sent || !pool.length) return null;
  const toggle = (k) => { csfx("blip_high"); setPick((p) => (p.some((x) => x.key === k) ? p.filter((x) => x.key !== k) : p.length < N ? [...p, { key: k, al: false }] : p)); };
  return (
    <div className="cui dimlite" onClick={stop}>
      <div className="cbuild" style={sepia("ui_talk", 0.45)}>
        <div className="crechead"><span className="crectab">คำให้การ</span><span className="ccnt">{pick.length}/{N} · <em className={lies !== needLies ? "cneed" : ""}>🎭 {lies}/{needLies}</em> · <em className={pick.length - lies !== N - needLies ? "cneed" : ""}>⚖️ {pick.length - lies}/{N - needLies}</em> · 📍×{alibi - used}</span></div>
        <div className="clist">
          {pool.map((st) => {
            const at = pick.findIndex((p) => p.key === st.key), on = at >= 0;
            return (
              <div key={st.key} className={`cline ${on ? "on" : ""} ${st.kind}`} onClick={() => toggle(st.key)}>
                <b>{on ? at + 1 : ""}</b>
                <i className="ckind">{st.kind === "lie" ? "🎭" : "⚖️"}</i>
                <span><Rich text={st.text} /></span>
                {st.kind === "lie" && (
                  <button className={`cal ${on && pick[at].al ? "on" : ""}`} disabled={!on || (!pick[at].al && used >= alibi)}
                    onClick={(e) => { stop(e); csfx("evidence_ding"); setPick((p) => p.map((x) => (x.key === st.key ? { ...x, al: !x.al } : x))); }}>📍</button>
                )}
              </div>
            );
          })}
        </div>
        <div className="crow">
          <button className="cbtn green" disabled={pick.length !== N || lies !== needLies} onClick={() => { setSent(true); emit("courtTestimony", { picks: pick.map((p) => ({ key: p.key, alibi: p.al })) }); }}>ให้การ</button>
        </div>
      </div>
    </div>
  );
}

// ฝ่ายค้าน: ปุ่มคัดค้าน 3 วิ
export function ObjectButton({ emit }) {
  const [done, setDone] = useState(false);
  if (done) return null;
  return (
    <div className="cui pass" onClick={stop}>
      <button className="cobj" onClick={() => { setDone(true); emit("courtObject", {}); }}>
        <img src={IMG("shout_objection")} alt="คัดค้าน!" />
      </button>
    </div>
  );
}

// ประชาชน: เชียร์/โห่/ปา หรือขึ้นให้การ
export function GalleryPanel({ court, emit, me, cast }) {
  const [done, setDone] = useState(false);
  const [rec, setRec] = useState(false);
  useEffect(() => { setDone(false); }, [court.round]);
  const usedW = (court.witnessUsed || []).includes(me);
  const acted = done || (court.rx || []).includes(me);
  const sg = court.sightings || [];
  const send = (p) => { setDone(true); csfx(p.e === "cheer" ? "crowd_cheer" : p.e === "boo" ? "crowd_boo" : p.e === "throw" ? "splat" : "evidence_ding"); emit("courtGallery", p); };
  if (rec) return <CourtRecord items={sg} mode="witness" who={cast.byId?.[me]?.img} onClose={() => setRec(false)} onPick={(e) => { setRec(false); send({ e: "witnessL", evKey: e.key }); }} />;
  const side = (k, p) => (
    <div className={`cgside s-${k}`}>
      <div className="cgface" style={{ backgroundImage: p?.img ? `url(${p.img})` : null }} />
      <div className="cgname">{p?.name}</div>
      <div className="cgbtns">
        <button disabled={acted} onClick={() => send({ e: "cheer", side: k })}>👏</button>
        <button disabled={acted} onClick={() => send({ e: "boo", side: k })}>👎</button>
        <button disabled={acted} onClick={() => send({ e: "throw", side: k })}>🍅</button>
      </div>
    </div>
  );
  return (
    <div className="cui pass" onClick={stop}>
      <div className={`cgallery ${acted ? "sent" : ""}`} style={sepia("ui_top", 0.4)}>
        {side("L", cast.L)}
        <div className="cgwit">
          <span className="crectab">ขึ้นให้การ</span>
          <div className="cgbtns">
            <button className="w" disabled={acted || usedW || !sg.length} onClick={() => setRec(true)}>📜<small>{cast.L?.name?.split(" ")[0]}</small></button>
            <button className="w" disabled={acted || usedW} onClick={() => send({ e: "witnessD" })}>📍<small>{cast.D?.name?.split(" ")[0]}</small></button>
          </div>
        </div>
        {side("D", cast.D)}
      </div>
    </div>
  );
}

export function VerdictBar({ court, cast }) {
  const r = court.verdict?.rewards || [];
  if (!r.length) return null;
  return (
    <div className="cui pass">
      <div className="cresbar">
        {r.map((x) => (
          <span key={x.id} className="creschip">
            {cast.byId?.[x.id]?.img && <i style={{ backgroundImage: `url(${cast.byId[x.id].img})` }} />}
            {x.name} ❤+{x.hp || 1}{x.gold || x.coins ? ` 🪙+${x.gold || x.coins}` : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
