// Road Trip — สรุปจบการเดินทาง (phase "over"): ระยะทาง (นับขึ้น) · ภูมิภาค + รอบวน · สังหาร · เหรียญ · ความยาก · สถิติดีสุด (แยกตามความยาก — เก็บในเครื่อง)
//  ปุ่ม: กลับห้องรอ (backToLobby) · เล่นอีกครั้ง (rematch)
import { useEffect, useRef, useState } from "react";
import { clickSound } from "../audio";
import { rtEmit } from "./rtSocket";
import { regionOf, roman, diffOf } from "./rtMeta";

const bestKey = (d) => `echo_rt_best_${d || "normal"}`;
function readBest(d) { try { return Number(localStorage.getItem(bestKey(d))) || 0; } catch { return 0; } }
function writeBest(d, v) { try { localStorage.setItem(bestKey(d), String(v)); } catch { /* ไม่มีที่เก็บ */ } }

// ตัวเลขวิ่งขึ้น (ease-out)
function useCountUp(target, ms = 1600, delay = 450) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now() + delay;
    const step = (now) => {
      const k = Math.max(0, Math.min(1, (now - t0) / ms));
      setV(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, delay]);
  return v;
}

/**
 * @param summary  state.roadtrip.summary { km, kills, gold, region, loop, diff }
 * @param players  state.players (แถวรูปทีม)
 */
export default function RoadtripSummary({ summary, players = [] }) {
  const s = summary || {};
  const km = Math.max(0, Math.floor(s.km || 0));
  const diff = s.diff || "normal";
  const D = diffOf(diff);
  // สถิติเดิมก่อนรอบนี้ (อ่านครั้งเดียว) → ทำลายสถิติ = เขียนใหม่ + ป้าย
  const prevBest = useRef(null);
  if (prevBest.current === null) prevBest.current = readBest(diff);
  const record = km > prevBest.current;
  useEffect(() => { if (record) writeBest(diff, km); }, [record, diff, km]);
  const shown = useCountUp(km);
  const reg = regionOf(s.region && typeof s.region === "object" ? s.region.id : s.region);
  const loop = (s.region && typeof s.region === "object" ? s.region.loop : s.loop) || 0;
  const best = Math.max(km, prevBest.current || 0);
  const tiles = [
    { k: "region", node: <span className="rt-vs-gem" style={{ "--c": reg.color }}><span>{roman(loop + 1)}</span></span>, v: reg.name, t: true, sub: `รอบ ${loop + 1}` },
    { k: "kills", node: "⚔️", v: s.kills || 0, sub: "สังหาร" },
    { k: "gold", node: <i className="rt-coin" style={{ width: 26, height: 26 }} />, v: s.gold || 0, sub: "เหรียญ" },
    { k: "diff", node: <span className="rt-diff-pips" style={{ "--dc": D.color }}>{[1, 2, 3].map((i) => <i key={i} data-on={i <= D.lv ? "true" : undefined} />)}</span>, v: D.name, t: true, sub: "ความยาก" },
    { k: "best", node: "🏆", v: best, sub: "สถิติ" },
  ];
  return (
    <div className="rt-sum rt-ui" role="dialog" aria-modal="true" aria-label="จบการเดินทาง">
      <div className="rt-sum-stars" aria-hidden="true" />
      <div className="rt-sum-road" aria-hidden="true" />
      <div className="rt-sum-card rt-plate">
        <i className="rt-bg" />
        <div className="rt-sum-head">
          <h1>จบการเดินทาง</h1>
          <div className="rt-sum-km"><b className="rt-num">{shown}</b><span>กม.</span></div>
          {record && shown >= km && <span className="rt-sum-rec">🏆 สถิติใหม่</span>}
        </div>
        <div className="rt-sum-tiles">
          {tiles.map((t, i) => (
            <div key={t.k} className="rt-tile" style={{ "--i": i }}>
              <span className="ico" aria-hidden="true">{t.node}</span>
              <b className={t.t ? "t" : "rt-num"}>{t.v}</b>
              <small>{t.sub}</small>
            </div>
          ))}
        </div>
        {players.length > 0 && (
          <div className="rt-sum-team">
            {players.map((p, i) => {
              const img = p.character?.img || p.img;
              return <span key={p.id} style={{ "--pc": p.color || "#fff", "--i": i }} title={p.name}><b>{(p.name || "?").slice(0, 1)}</b>{img && <img src={img} alt="" draggable="false" onError={(e) => { e.currentTarget.style.display = "none"; }} />}</span>;
            })}
          </div>
        )}
        <div className="rt-sum-acts">
          <button type="button" className="rt-btn ghost" onClick={() => { clickSound(); rtEmit("backToLobby"); }}>กลับห้องรอ</button>
          <button type="button" className="rt-btn" data-hotkey="Enter" onClick={() => { clickSound(); rtEmit("rematch"); }}>เล่นอีกครั้ง</button>
        </div>
      </div>
    </div>
  );
}
