// ข้อมูลตัวละครในศาล (กดตัวละครบนแท่น/โต๊ะ/ที่นั่งประชาชน/หน้าในแถบความน่าเชื่อถือ) — ข้อมูลจาก state.players[].character
import { useEffect } from "react";
import { IMG } from "./courtAssets";
import { Rich } from "./CourtText";

const stop = (e) => e.stopPropagation();
const TIER = [["basic", "สกิลพื้นฐาน"], ["secondary", "สกิลรอง"], ["ultimate", "ท่าไม้ตาย"]];

export default function CharInfo({ who, onClose }) {
  useEffect(() => {
    const k = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);
  if (!who) return null;
  const ch = who.ch || {};
  const passives = [ch.passive, ch.passive2, ch.passive3, ch.passive4, ch.passive5].filter((x) => x && x.name);
  return (
    <div className="cui dim cinfo-wrap" onClick={(e) => { stop(e); onClose(); }}>
      <div className="cinfo" onClick={stop} style={{ "--wm": `url(${IMG("ui_bottom")})` }}>
        <button className="cx" onClick={onClose} aria-label="ปิด">✕</button>
        <div className="cinfo-por">
          {who.img ? <img src={who.img} alt="" draggable={false} /> : <div className="cinfo-none">{(who.name || "?").slice(0, 1)}</div>}
          <div className="cinfo-name"><b>{ch.name || who.name}</b>{who.player && who.player !== (ch.name || who.name) && <small>{who.player}</small>}</div>
        </div>
        <div className="cinfo-body">
          {passives.map((p, i) => (
            <section key={"p" + i} className="cinfo-sk passive">
              <header><span className="tier">สกิลติดตัว</span><b>{p.name}</b></header>
              {p.desc && <p><Rich text={p.desc} /></p>}
            </section>
          ))}
          {TIER.map(([k, label]) => {
            const s = ch[k];
            if (!s || !s.name) return null;
            return (
              <section key={k} className={`cinfo-sk ${k}`}>
                <header><span className="tier">{label}</span><b>{s.name}</b>{s.cost != null && <i className="cost">{s.cost}</i>}</header>
                {s.desc && <p><Rich text={s.desc} /></p>}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
