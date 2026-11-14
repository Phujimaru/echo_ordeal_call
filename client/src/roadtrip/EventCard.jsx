// Road Trip — การ์ดเหตุการณ์ถนน (phase "event"): ภาพ/ไอคอน · ชื่อ · ตัวเลือก 2–3 ปุ่มพร้อมค่าใช้จ่าย · จุดโหวต · แถบเวลา · ปุ่มลัด 1–3
//  กด = rt:event { key } · ค่าใช้จ่าย cost: ตัวเลข = ทอง · { gold, fuel, hp, van } = หลายอย่าง · ติดลบ = ได้รับ
import { useState } from "react";
import { clickSound } from "../audio";
import { rtEmit } from "./rtSocket";
import { eventKind } from "./rtMeta";
import { Dots, TimeBar, useDigitKeys } from "./rtCommon";
import { tip } from "./rtTip";

const COST_ICON = { gold: <i className="rt-coin s" />, fuel: "⛽", hp: "♥", van: "🚐" };
function Costs({ cost }) {
  if (cost == null || cost === 0) return null;
  const list = typeof cost === "number" ? [["gold", cost]] : Object.entries(cost).filter(([, v]) => Number(v));
  if (!list.length) return null;
  return (
    <span className="rt-costs">
      {list.map(([k, v]) => (
        <span key={k} className="rt-cost rt-num" data-k={k} data-gain={v < 0 ? "true" : undefined}>
          {COST_ICON[k] || k}{v < 0 ? `+${-v}` : `−${v}`}
        </span>
      ))}
    </span>
  );
}

/**
 * @param event   state.roadtrip.event { id, kind, title?, icon?, choices: [{ key, label, desc?, cost }], votes: { [pid]: key } } · desc = คำอธิบายตอนชี้ (rtTip)
 * @param endsAt  epoch ms ที่หมดเวลาโหวต
 */
export default function EventCard({ event, endsAt, players = [], youId }) {
  const [artOk, setArtOk] = useState(true);
  const choices = (event && event.choices) || [];
  const votes = (event && event.votes) || {};
  const mine = votes[youId];
  const pick = (i) => { const c = choices[i]; if (!c || c.key === mine) return; clickSound(); rtEmit("rt:event", { key: c.key }); };
  useDigitKeys(choices.length, pick, choices.length > 0);
  if (!event) return null;
  const k = eventKind(event.kind);
  return (
    <div className="rt-event rt-ui" key={event.id} role="group" aria-label={event.title || k.name}>
      <div className="rt-plate">
        <i className="rt-bg" />
        <div className="rt-event-art" style={{ "--c": k.color }}>
          <span aria-hidden="true">{event.icon || k.icon}</span>
          {artOk && event.kind && <img src={`/roadtrip/events/${event.kind}.webp`} alt="" draggable="false" onError={() => setArtOk(false)} />}
        </div>
        <div className="rt-event-body">
          <div className="rt-event-top">
            <h2>{event.title || k.name}</h2>
          </div>
          <TimeBar endsAt={endsAt} />
          <div className="rt-choices">
            {choices.map((c, i) => (
              <button key={c.key} type="button" className="rt-choice" style={{ "--i": i }} data-mine={mine === c.key ? "true" : "false"} aria-pressed={mine === c.key} onClick={() => pick(i)} {...tip(c.desc, c.label)}>
                <span className="rt-key">{i + 1}</span>
                <span className="rt-choice-label">{c.label}</span>
                <Costs cost={c.cost} />
                <Dots players={players.filter((p) => votes[p.id] === c.key)} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
