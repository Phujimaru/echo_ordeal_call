// Road Trip — ปุ่ม "แคมป์" + แผงโหวต (ช่วงขับ · ผู้ใช้สั่ง 2026-11-14 · server/roadtrip/camp.js)
//  state.roadtrip.camp = { block: null | "phase" | "busy" | "cd" | "boss", kmLeft, vote: { by, endsAt, votes: { [pid]: bool } } | null }
//  ใครก็กดได้ (rt:camp { a: "start" }) → ทุกคนโหวต ✔/✖ (rt:camp { a: "vote", yes }) · ผ่าน = เสียงใช่เกินครึ่ง · เสมอ = ไม่
//  ปุ่มลัด: N = กดแคมป์ / ✔ · (กำลังโหวต) M = ✖ — e.code (แป้นไทยก็ใช้ได้)
import { useEffect, useRef } from "react";
import { clickSound } from "../audio";
import { rtEmit } from "./rtSocket";
import { CountRing } from "./rtCommon";
import { tip } from "./rtTip";

export default function CampVote({ rt, players = [], youId }) {
  const c = rt && rt.camp;
  const v = c && c.vote;
  const crew = players.filter((p) => !p.summon && !p.duoOf && p.connected !== false);
  const mine = v ? v.votes[youId] : undefined;
  const can = !!c && !c.block && rt.phase === "drive";
  const me = players.find((p) => p.id === youId);
  const alive = !!me && me.alive !== false;
  const start = () => { if (!can || !alive) return; clickSound(); rtEmit("rt:camp", { a: "start" }); };
  const vote = (yes) => { if (!v || mine != null || !alive) return; clickSound(); rtEmit("rt:camp", { a: "vote", yes }); };
  const ref = useRef({ start, vote, v });
  ref.current = { start, vote, v };
  useEffect(() => {
    const on = (e) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.activeElement;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (e.code === "KeyN") { if (ref.current.v) ref.current.vote(true); else ref.current.start(); }
      else if (e.code === "KeyM" && ref.current.v) ref.current.vote(false);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);
  if (!c || (rt.phase !== "drive" && !v)) return null;
  const why = c.block === "cd" ? `อีก ${c.kmLeft} กม.` : c.block === "boss" ? "ใกล้บอส" : null;
  if (!v) {
    return (
      <button type="button" className="rt-camp-btn rt-ui" disabled={!can || !alive} onClick={start}
        {...tip(why ? `แคมป์ได้อีกครั้ง: ${why}` : "ชวนทั้งทีมจอดตั้งแคมป์ — โหวตเสียงข้างมาก (N)", "แคมป์")}>
        <span aria-hidden="true">🏕️</span><b>แคมป์</b>{why && <small>{why}</small>}
      </button>
    );
  }
  const yes = Object.values(v.votes).filter((x) => x === true).length, no = Object.values(v.votes).filter((x) => x === false).length;
  return (
    <div className="rt-camp-vote rt-ui rt-plate" role="dialog" aria-label="แคมป์">
      <i className="rt-bg" />
      <div className="rt-camp-head"><span aria-hidden="true">🏕️</span><b>แคมป์?</b><CountRing endsAt={v.endsAt} low={5} size={40} /></div>
      <div className="rt-camp-avs">
        {crew.map((p) => {
          const x = v.votes[p.id];
          return (
            <span key={p.id} className="rt-camp-av" style={{ "--pc": p.color || "#999" }} data-v={x === true ? "yes" : x === false ? "no" : "wait"} title={p.name}>
              <b>{(p.name || "?").slice(0, 1)}</b>{(p.character?.img || p.img) && <img src={p.character?.img || p.img} alt="" draggable="false" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
              <i aria-hidden="true">{x === true ? "✔" : x === false ? "✖" : ""}</i>
            </span>
          );
        })}
      </div>
      <div className="rt-camp-btns">
        <button type="button" className="rt-btn" data-on={mine === true ? "true" : "false"} disabled={mine != null || !alive} onClick={() => vote(true)} {...tip("ตั้งแคมป์ (N)", "ใช่")}>✔ <span>{yes}</span></button>
        <button type="button" className="rt-btn ghost" data-on={mine === false ? "true" : "false"} disabled={mine != null || !alive} onClick={() => vote(false)} {...tip("ขับต่อ (M)", "ไม่")}>✖ <span>{no}</span></button>
      </div>
    </div>
  );
}
