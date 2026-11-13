// ตารางปฏิกิริยาธาตุ — มุมขวาบนใต้แถวปุ่ม (GRID_PLAN §8.7 · ผู้ใช้สั่งให้มีคำบอกผลแต่ละปฏิกิริยา · แบบร่าง .claude/plans/element-ui.html)
import { ELEMENTS, ELEMENT_KEYS, REACTIONS } from "../data/elements";

export default function ReactionPanel() {
  return (
    <div className="bs-rx" role="dialog" aria-label="ปฏิกิริยาธาตุ">
      <div className="bs-rx-legend">
        {ELEMENT_KEYS.map((k) => <span key={k} className="bs-rx-chip">{ELEMENTS[k].icon} {ELEMENTS[k].name}</span>)}
      </div>
      {REACTIONS.map((r) => (
        <div key={r.key} className="bs-rx-row">
          <span className="bs-rx-pair">{ELEMENTS[r.a].icon}{r.b ? ELEMENTS[r.b].icon : "✦"}</span>
          <span className="bs-rx-name">{r.name}</span>
          <span className="bs-rx-eff">{r.eff.map((t, i) => (i % 2 ? <b key={i}>{t}</b> : <span key={i}>{t}</span>))}</span>
        </div>
      ))}
    </div>
  );
}
