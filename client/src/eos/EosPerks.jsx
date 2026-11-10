// ============================================================
//  โหวตการ์ดอัปเกรดทีม (สนาม Eos PVE รอบสี่ — server/fodlan/eosPerks.js)
//   แต้มรวมถึง 10/20/30 → การ์ด 3 ใบลอยขึ้นกลางจอด้านบน · กดใบไหน = โหวต (เปลี่ยนใจได้) · หน้าเพื่อนที่โหวตแสดงใต้การ์ด
//   โหวตครบ / พ้น 1 เทิร์น = ใบที่เสียงมากสุดได้ · ชื่อ + ไอคอน (คำอธิบายผลอยู่ใน title — ผู้ใช้อนุญาตเฉพาะ Eos)
//   หุบได้ (ปุ่ม ▾) — ยังไม่โหวตแล้วหุบไว้ = ป้ายเล็กกะพริบเตือน
// ============================================================
import { useState } from "react";
import { socket } from "../socket";
import { clickSound } from "../audio";
import "./eosPerks.css";

export default function EosPerks({ state }) {
  const b = state && state.fodlan && state.fodlan.board;
  const [hideFor, setHideFor] = useState(null);
  const o = b && b.perkOffer;
  if (!o) return null;
  const me = state.youId, mine = o.votes ? o.votes[me] : null;
  const players = state.players || [];
  if (hideFor === o.id) {
    return (
      <button type="button" className="eos-perk-pill" data-pending={mine ? undefined : "true"} onClick={() => setHideFor(null)} aria-label="การ์ดทีม">
        ✨ <b>การ์ดทีม</b>
      </button>
    );
  }
  const vote = (id) => { clickSound(); socket.emit("charAction", { key: `fd:perk:${id}` }); };
  return (
    <div className="eos-perks" role="dialog" aria-label="การ์ดทีม">
      <header><span className="mark">{o.mark}</span><b>การ์ดทีม</b><button type="button" aria-label="หุบ" onClick={() => setHideFor(o.id)}>▾</button></header>
      <div className="cards">
        {o.choices.map((c, i) => {
          const voters = Object.entries(o.votes || {}).filter(([, v]) => v === c.id).map(([pid]) => players.find((p) => p.id === pid)).filter(Boolean);
          return (
            <button key={c.id} type="button" className="card" data-mine={mine === c.id ? "true" : undefined} style={{ "--i": i }} title={c.desc} onClick={() => vote(c.id)}>
              <span className="ico">{c.icon}</span>
              <b>{c.name}</b>
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
