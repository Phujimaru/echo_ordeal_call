// Road Trip — สถานะรถตู้ (จุดพัก/ต่อสู้ · อยู่ในแถบบนซ้าย HudTopBar ของ SelfHud แทนป้ายภูมิภาค)
//  ภูมิภาค + รอบวน · ระยะทาง · HP รถ · น้ำมัน · สู้บนรถ = รอบที่รอด x/y + ปุ่มประตูท้าย (rt:rear — ตาตัวเองเท่านั้น)
import { clickSound } from "../audio";
import { rtEmit } from "./rtSocket";
import { regionOf, roman } from "./rtMeta";
import { tip } from "./rtTip";

const REAR = <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2.5" /><path d="M4 9h16" /><path d="M12 13v4M10 15l2 2 2-2" /></svg>;
const REAR_OPEN = <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="5" rx="2" /><path d="M4 9v11h16V9" strokeDasharray="2 2.5" /><path d="M12 18v-5M10 15l2-2 2 2" /></svg>;

const pct = (v, m) => `${Math.max(0, Math.min(1, (Number(v) || 0) / Math.max(1, Number(m) || 1))) * 100}%`;

/**
 * @param rt      state.roadtrip
 * @param myTurn  ตาเดินของเรา (ประตูท้ายสลับได้เฉพาะตาตัวเอง)
 */
export default function VanStatus({ rt, myTurn = false }) {
  if (!rt) return null;
  const van = rt.van || {};
  const reg = regionOf(rt.region && rt.region.id);
  const loop = (rt.region && rt.region.loop) || 0;
  const combat = rt.phase === "combat" ? rt.combat : null;
  const hpLow = (van.hp || 0) / Math.max(1, van.hpMax || 1) <= 0.25;
  const fuelLow = (van.fuel || 0) / Math.max(1, van.fuelMax || 1) <= 0.2;
  return (
    <span className="rt-vs rt-ui">
      <span className="rt-vs-region" {...tip(`รอบที่ ${loop + 1} · ภูมิภาคเปลี่ยนทุก 100 กม. ครบ 5 ภูมิภาคแล้ววนใหม่ มอนโหดขึ้น`, reg.name)}>
        <span className="rt-vs-gem" style={{ "--c": reg.color }}><span>{roman(loop + 1)}</span></span>
        <span className="rt-vs-txt">
          <span className="rt-vs-name">{reg.name}</span>
          <span className="rt-vs-km"><b>{Math.floor(rt.km || 0)}</b> กม.</span>
        </span>
      </span>
      <span className="rt-vs-div" aria-hidden="true" />
      <span className="rt-vs-bars">
        <i aria-hidden="true" {...tip("HP รถตู้ — หมดเมื่อไหร่ การเดินทางจบทันที", "รถตู้")}>🚐</i>
        <span className="rt-vs-bar" data-k="hp" {...tip("HP รถตู้ — หมดเมื่อไหร่ การเดินทางจบทันที", "รถตู้")} data-low={hpLow ? "true" : "false"}><span style={{ width: pct(van.hp, van.hpMax) }} /></span>
        <b>{Math.max(0, Math.ceil(van.hp || 0))}/{van.hpMax || 0}</b>
        <i aria-hidden="true" {...tip("น้ำมัน (ลิตร) — หมดถังรถคลานได้แค่ 30 กม./ชม. · เติมที่ปั๊ม", "น้ำมัน")}>⛽</i>
        <span className="rt-vs-bar" data-k="fuel" {...tip("น้ำมัน (ลิตร) — หมดถังรถคลานได้แค่ 30 กม./ชม. · เติมที่ปั๊ม", "น้ำมัน")} data-low={fuelLow ? "true" : "false"}><span style={{ width: pct(van.fuel, van.fuelMax) }} /></span>
        <b>{Math.max(0, Math.round(van.fuel || 0))}/{van.fuelMax || 0}</b>
      </span>
      {combat && combat.kind === "onvan" && (
        <>
          <span className="rt-vs-div" aria-hidden="true" />
          {combat.rounds ? (
            <span className="rt-vs-round" {...tip("ยื้อให้รอดครบทุกรอบ หรือล้มมอนให้หมด = ชนะ", "รอด")}><small>รอด</small><b className="rt-num">{Math.min(combat.round || 0, combat.rounds)}/{combat.rounds}</b></span>
          ) : null}
          <button
            type="button"
            className="rt-vs-rear"
            data-on={van.rearOpen ? "true" : "false"}
            aria-pressed={!!van.rearOpen}
            aria-label="ประตูท้าย"
            {...tip("เปิดแล้วคนที่ยืนแถวท้ายรถตีและใช้สกิลได้ไกลขึ้น 1 ช่อง · สลับได้เฉพาะตาตัวเอง", van.rearOpen ? "ประตูท้าย (เปิด)" : "ประตูท้าย (ปิด)")}
            disabled={!myTurn}
            onClick={() => { clickSound(); rtEmit("rt:rear"); }}
          >
            {van.rearOpen ? REAR_OPEN : REAR}
          </button>
        </>
      )}
    </span>
  );
}
