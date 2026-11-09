// ============================================================
//  กระดานแต้มของสนาม Eos (ผู้ใช้สั่ง 2026-11-09: "UI ใหญ่ที่บอกแต้มของทุกคน ต้องบอกด้วยว่าใครนำ")
//  มุมขวาบนใต้ปุ่มกล้อง · ทุกฝ่าย เรียงตามแต้ม · ฝ่ายนำ = มงกุฎ + กรอบทอง · หลอดแต้มถึงเป้า (20)
//  🔷 = เสาที่ถือ · +N = แต้มที่จะได้จบเทิร์นนี้ · ไม่มีข้อความอธิบาย (ชื่อ ตัวเลข ไอคอนเท่านั้น)
//  ข้อมูล: state.fodlan.board.scores (server/fodlan/stage6.js scoreList) · goal
// ============================================================
import "./eosScoreboard.css";

export default function EosScoreboard({ state }) {
  const b = state && state.fodlan && state.fodlan.board;
  const list = (b && Array.isArray(b.scores) && b.scores) || [];
  if (!list.length) return null;
  const goal = b.goal || 20;
  const top = list[0];
  const lead = top && top.score > 0 && (list.length < 2 || top.score > list[1].score) ? top.side : null;
  const me = state.youId;
  return (
    <div className="eos-score" role="list">
      {list.map((sc, i) => {
        const mine = (sc.members || []).some((m) => m.id === me);
        const k = Math.max(0, Math.min(1, sc.score / goal));
        const m0 = (sc.members || [])[0];
        return (
          <div key={sc.side} role="listitem" className="eos-score-row" data-lead={sc.side === lead ? "true" : undefined} data-mine={mine ? "true" : undefined} style={{ "--side": sc.color || "#cccccc" }}>
            <span className="eos-score-rank">{sc.side === lead ? "👑" : i + 1}</span>
            <span className="eos-score-face">
              {m0 && m0.img ? <img src={m0.img} alt="" /> : <i />}
            </span>
            <span className="eos-score-main">
              <span className="eos-score-name">{sc.name}</span>
              <span className="eos-score-bar"><b style={{ width: `${k * 100}%` }} /></span>
            </span>
            <span className="eos-score-num">
              <b>{sc.score}</b><small>/{goal}</small>
            </span>
            <span className="eos-score-held">
              <span>🔷{sc.held || 0}</span>
              {sc.rate > 0 && <span className="eos-score-rate">+{sc.rate}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}
