// Road Trip — แถบจุดพัก (phase "stop"): ชนิดจุดพัก (ปั๊ม/โมเต็ล) · นับถอยหลัง · ความพร้อมของทุกคน · ปุ่มพร้อม (Enter) · ปุ่มอู่ (ปั๊มเท่านั้น)
//  พร้อม = rt:ready (สลับ) · ทุกคนพร้อม/หมดเวลา = server ออกเดินทางต่อ
import { clickSound } from "../audio";
import { rtEmit } from "./rtSocket";
import { CountRing } from "./rtCommon";
import { forkKind } from "./rtMeta";
import { tip } from "./rtTip";

const WRENCH = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.7 6.3a4 4 0 0 0-5.2 5.2L3.8 17.2a1.8 1.8 0 0 0 2.6 2.6l5.7-5.7a4 4 0 0 0 5.2-5.2l-2.5 2.5-2.3-.6-.6-2.3z" /></svg>;
const FLAG = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></svg>;
const CHECK = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;

/**
 * @param rt        state.roadtrip (ใช้ stop / endsAt / night)
 * @param players   state.players · youId = ตัวเรา
 * @param onGarage  เปิดอู่ (ปั๊มเท่านั้น)
 * @param zoom      --hud-k ให้ขนาดเท่า HUD
 */
export default function StopBar({ rt, players = [], youId, onGarage, zoom = 1 }) {
  const stop = rt && rt.stop;
  if (!stop) return null;
  const ready = stop.ready || {};
  const motel = stop.kind === "motel";
  const meReady = !!ready[youId];
  return (
    <div className="rt-stop rt-ui rt-plate" data-kind={stop.kind} data-night={rt.night ? "true" : "false"} style={{ "--hud-k": zoom }}>
      <i className="rt-bg" />
      <span className="rt-stop-kind" {...tip(forkKind(stop.kind).desc, forkKind(stop.kind).name)}>
        <span className="rt-stop-emb"><span aria-hidden="true">{motel ? "🏨" : "⛽"}</span></span>
        <b>{motel ? "โรงแรม" : "ปั๊มน้ำมัน"}</b>
      </span>
      <CountRing endsAt={rt.endsAt} low={10} size={48} />
      <span className="rt-stop-div" aria-hidden="true" />
      <span className="rt-ready" aria-label="พร้อม">
        {players.map((p) => {
          const img = p.character?.img || p.img;
          return (
            <span key={p.id} className="rt-ready-av" style={{ "--pc": p.color || "#999" }} data-ready={ready[p.id] ? "true" : "false"} data-dead={p.alive === false ? "true" : "false"} title={p.name}>
              <b>{(p.name || "?").slice(0, 1)}</b>{img && <img src={img} alt="" draggable="false" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
            </span>
          );
        })}
      </span>
      <span className="rt-stop-div" aria-hidden="true" />
      {!motel && onGarage && (
        <button type="button" className="rt-btn ghost icon" aria-label="อู่" {...tip("อัปเกรดรถตู้ ซื้อของแต่ง ทำสี และตั้งทะเบียน · ซ่อมรถได้ที่อู่ในปั๊ม", "อู่")} onClick={() => { clickSound(); onGarage(); }}>{WRENCH}</button>
      )}
      <button type="button" className="rt-btn" data-on={meReady ? "true" : "false"} data-hotkey="Enter" aria-pressed={meReady} {...tip(meReady ? "กดอีกครั้งเพื่อยกเลิก · ทุกคนพร้อมหรือหมดเวลา = ออกเดินทางต่อ" : "ทุกคนพร้อมหรือหมดเวลา = ออกเดินทางต่อ (Enter)", "พร้อมออกเดินทาง")} onClick={() => { clickSound(); rtEmit("rt:ready"); }}>
        {meReady ? CHECK : FLAG}<span>พร้อม</span>
      </button>
    </div>
  );
}
