// ============================================================
//  โหวตการ์ดอัปเกรดทีม (สนาม Eos PVE รอบสี่ — server/fodlan/eosPerks.js)
//   แต้มรวมถึงทุก 10 แต้ม → การ์ด 5 ใบกลางจอด้านบน (ใบเดิมซ้ำได้ = Lv ถัดไป — ผู้ใช้สั่ง 2026-11-12) · กดใบไหน = โหวต (เปลี่ยนใจได้) · หน้าเพื่อนที่โหวตแสดงใต้การ์ด
//   ผู้ใช้สั่ง 2026-11-10 "ไม่มีคำอธิบาย คืออะไรก็ไม่รู้ อยู่ๆ ก็มาให้เลือกแล้วหายไป" → อนุญาตคำอธิบาย:
//    หัวแผงบอกว่าคืออะไร/ได้มาเพราะอะไร/ปิดโหวตเมื่อไร · ทุกใบแสดงผลของการ์ด · จำนวนคนโหวต
//    เลือกแล้ว = ป้ายประกาศผล (การ์ด + ผล) ค้าง 6 วิ · หุบได้ (▾) — ยังไม่โหวต = ป้ายเล็กกะพริบ
// ============================================================
import { useEffect, useRef, useState } from "react";
import { socket } from "../socket";
import { clickSound } from "../audio";
import "./eosPerks.css";

const RESULT_MS = 6000;

export default function EosPerks({ state }) {
  const b = state && state.fodlan && state.fodlan.board;
  const [hideFor, setHideFor] = useState(null);
  const [result, setResult] = useState(null);
  const seen = useRef(null);
  // ป้ายผลการเลือก: จับเหตุการณ์ perk_pick ใหม่ (เปิดหน้ามาใหม่ไม่ประกาศของเก่า)
  useEffect(() => {
    if (!b || !Array.isArray(b.fx)) return undefined;
    const picks = b.fx.filter((e) => e.kind === "perk_pick");
    const last = picks[picks.length - 1];
    const maxSeq = last ? last.seq : 0;
    if (seen.current == null) { seen.current = maxSeq; return undefined; }
    if (!last || last.seq <= seen.current) return undefined;
    seen.current = last.seq;
    const card = (b.perks || []).find((c) => c.id === last.perk);
    if (!card) return undefined;
    const t = setTimeout(() => setResult({ ...card, at: Date.now() }), 0);
    const off = setTimeout(() => setResult(null), RESULT_MS);
    return () => { clearTimeout(t); clearTimeout(off); };
  }, [b]);
  const o = b && b.perkOffer;
  if (!o) {
    if (!result) return null;
    return (
      <div className="eos-perk-result" role="status">
        <span className="ico">{result.icon}</span>
        <span className="txt"><small>ทีมได้การ์ด</small><b>{result.name}{result.max > 1 ? ` Lv ${result.lv}` : ""}</b><span>{result.desc}</span></span>
      </div>
    );
  }
  const me = state.youId, mine = o.votes ? o.votes[me] : null;
  const players = state.players || [];
  const total = players.filter((p) => !p.summon && !p.duoOf && p.connected !== false).length;
  const voted = Object.keys(o.votes || {}).length;
  if (hideFor === o.id) {
    return (
      <button type="button" className="eos-perk-pill" data-pending={mine ? undefined : "true"} onClick={() => setHideFor(null)} aria-label="การ์ดทีม">
        ✨ <b>การ์ดทีม</b> <span>{mine ? `โหวตแล้ว ${voted}/${total}` : "ยังไม่โหวต"}</span>
      </button>
    );
  }
  const vote = (id) => { clickSound(); socket.emit("charAction", { key: `fd:perk:${id}` }); };
  return (
    <div className="eos-perks" role="dialog" aria-label="การ์ดทีม">
      <header>
        <span className="mark">{o.mark}</span>
        <span className="head"><b>การ์ดทีม</b><small>แต้ม {o.mark} · ติดทั้งทีมจนจบ</small></span>
        <button type="button" aria-label="หุบ" onClick={() => setHideFor(o.id)}>▾</button>
      </header>
      <p className="how">โหวตแล้ว {voted}/{total}</p>
      <div className="cards">
        {o.choices.map((c, i) => {
          const voters = Object.entries(o.votes || {}).filter(([, v]) => v === c.id).map(([pid]) => players.find((p) => p.id === pid)).filter(Boolean);
          return (
            <button key={c.id} type="button" className="card" data-mine={mine === c.id ? "true" : undefined} style={{ "--i": i }} onClick={() => vote(c.id)}>
              {mine === c.id && <em className="mine">โหวตแล้ว</em>}
              <span className="ico">{c.icon}</span>
              <b>{c.name}</b>
              {c.max > 1 && <em className="lv">Lv {c.lv}</em>}
              <span className="desc">{c.desc}</span>
              <span className="voters">
                {voters.map((p) => (p.img ? <img key={p.id} src={p.img} alt="" /> : <i key={p.id} style={{ background: p.color || "#888" }} />))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
