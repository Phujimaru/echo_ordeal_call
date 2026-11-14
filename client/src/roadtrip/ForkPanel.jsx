// Road Trip — ทางแยก (phase "fork"): การ์ดเส้นทาง 2–3 ใบ · จุดโหวตของแต่ละคน · นับถอยหลัง · ปุ่มลัด 1–3
//  กด = rt:vote { i } (เปลี่ยนใจได้จนหมดเวลา — server นับเสียงข้างมาก)
import { clickSound } from "../audio";
import { rtEmit } from "./rtSocket";
import { forkKind, eventKind } from "./rtMeta";
import { CountRing, Dots, useDigitKeys } from "./rtCommon";
import { tip } from "./rtTip";

// ของที่เห็นล่วงหน้า (ชิงช้าสวรรค์/หมอดู — o.peek) → บรรทัดท้ายของคำอธิบายตอนชี้
const peekLine = (o) => (o.peek && o.peek.event ? `👁 ${eventKind(o.peek.event).name}` : "");

const SIGN = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21V9M12 9L6.5 3.5M12 9l5.5-5.5" /><path d="M4 6V3h3M20 6V3h-3" /></svg>;

/**
 * @param fork    state.roadtrip.fork { options: [{ kind, km? }], votes: { [pid]: i } }
 * @param endsAt  epoch ms ที่หมดเวลาโหวต
 * @param players state.players · youId = ตัวเรา
 */
export default function ForkPanel({ fork, endsAt, players = [], youId }) {
  const options = (fork && fork.options) || [];
  const votes = (fork && fork.votes) || {};
  const mine = votes[youId];
  const pick = (i) => { if (i === mine) return; clickSound(); rtEmit("rt:vote", { i }); };
  useDigitKeys(options.length, pick, options.length > 0);
  if (!options.length) return null;
  const tally = options.map((_, i) => players.filter((p) => votes[p.id] === i));
  const top = Math.max(0, ...tally.map((t) => t.length));
  const lead = top > 0 && tally.filter((t) => t.length === top).length === 1 ? tally.findIndex((t) => t.length === top) : -1;
  return (
    <div className="rt-fork rt-ui" role="group" aria-label="ทางแยก">
      <div className="rt-fork-head rt-plate">
        <i className="rt-bg" />
        <span className="rt-fork-sign">{SIGN}</span>
        <h2>ทางแยก</h2>
        <CountRing endsAt={endsAt} />
      </div>
      <div className="rt-fork-cards">
        {options.map((o, i) => {
          const k = forkKind(o.kind);
          return (
            <button
              key={`${o.kind}-${i}`}
              type="button"
              className="rt-route rt-plate"
              style={{ "--c": k.color, "--i": i }}
              data-mine={mine === i ? "true" : "false"}
              data-lead={lead === i ? "true" : "false"}
              aria-pressed={mine === i}
              onClick={() => pick(i)}
              {...tip(peekLine(o) ? `${k.desc}\n${peekLine(o)}` : k.desc, k.name)}
            >
              <i className="rt-bg" />
              <span className="rt-key">{i + 1}</span>
              <span className="rt-route-emb"><span aria-hidden="true">{k.icon}</span></span>
              <b className="rt-route-name">{k.name}</b>
              {o.km != null && <span className="rt-route-km rt-num">{o.km} กม.</span>}
              <Dots players={tally[i]} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
