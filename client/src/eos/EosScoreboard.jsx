// ============================================================
//  แผงเสา + แต้มรวมของสนาม Eos — PVE (ผู้ใช้สั่ง 2026-11-10: "ไม่มีลีดเดอร์บอกอันดับ · บอกสถานะของแต่ละเสาว่าเพิ่มแต้มให้ไหม"
//   + "UI บอกว่าผู้เล่นที่จะฟื้นหรือยัง")
//  มุมขวาบน · แท็บ = แต้มรวม/เป้า + แต้มที่จะได้จบเทิร์นนี้ + จุดเสา 5 ดวง · กดแท็บ = เปิด/เก็บแผงรายเสา
//  แผง: ต่อเสา — ชื่อโซน · สถานะ (ยึดแล้ว ✦ / กำลังร่าย ⏳ / กลาง ○) · รอยโดนตี ◆◆ (ครบ = หลุด) · +แต้ม
//  แถวฟื้นคืนชีพ: หน้าเพื่อนที่ล้ม + เลขเทิร์นที่เหลือ (แสดงตลอดเมื่อมีคนล้ม)
//  คำอธิบายอยู่ใน title (ชี้แล้วขึ้น — ผู้ใช้อนุญาตเฉพาะ Eos 2026-11-10)
//  ข้อมูล: state.fodlan.board — score · goal · rate · pillars[{ zone, owner, ch, hits, hp }] · revive[{ id, at }] (server/fodlan/stage6.js publicInfo)
// ============================================================
import { useState } from "react";
import "./eosScoreboard.css";

const ZONE = {
  insomnia: { name: "Insomnia", color: "#9fd8ff" },
  hammerhead: { name: "Hammerhead", color: "#ff9b52" },
  duscae: { name: "Duscae", color: "#7fe0c0" },
  lake: { name: "Cleigne", color: "#8fe3ff" },
  altissia: { name: "Altissia", color: "#ffe0a0" },
};
const RATE = [0, 1, 3, 6, 10, 15];
// พลังประจำเสา (PVE รอบสาม — server/fodlan/eosExtra.js POWERS)
const POWER = {
  insomnia: { icon: "🔫", tip: "ป้อมปืนบนกำแพง Insomnia ยิงมอนใกล้สุดเองทุกต้นเทิร์น ดาเมจ 2" },
  altissia: { icon: "⛲", tip: "ต้นเทิร์น: ทุกคนในระยะ 3 ช่องจากเสา Altissia ฟื้นเลือด 1" },
  duscae: { icon: "🐤", tip: "ขี่โชโกโบะเดินเพิ่มอีก +1" },
  hammerhead: { icon: "🚗", tip: "ขับรถเดินเพิ่ม +1 · ชนแรงขึ้น +1" },
  lake: { icon: "🎣", tip: "ตกปลาไม่เจอปลายักษ์ · เหรียญ ×2" },
};

export default function EosScoreboard({ state }) {
  const [open, setOpen] = useState(false); // ปิดไว้ก่อน (ผู้ใช้สั่ง 2026-11-09) — แท็บมีจุดเสา 5 ดวงบอกสถานะอยู่แล้ว
  const b = state && state.fodlan && state.fodlan.board;
  if (!b || !b.pve || !Array.isArray(b.pillars)) return null;
  const goal = b.goal || 50, score = b.score || 0, rate = b.rate || 0;
  const held = b.pillars.filter((pl) => pl.owner).length;
  const players = state.players || [];
  const dead = (b.revive || []).map((r) => ({ ...r, p: players.find((u) => u.id === r.id) })).filter((r) => r.p);
  const round = state.roundNumber || 0;
  const k = Math.max(0, Math.min(1, score / goal));
  const toggle = () => setOpen((v) => !v);
  return (
    <div className="eos-score" data-open={open ? "true" : "false"}>
      <div className="eos-score-col">
        <button type="button" className="eos-score-tab" onClick={toggle} aria-expanded={open} aria-label="เสา"
          title={`แต้มรวมของทุกคน ${score}/${goal} — ครบแล้วชนะ · จบเทิร์นได้ +${rate} ตามจำนวนเสาที่ยึดไว้ (${RATE.slice(1).join("/")} ต่อ 1–5 ต้น)`}>
          <span className="eos-score-ico">🔷</span>
          <b>{score}</b><small>/{goal}</small>
          {rate > 0 && <em className="eos-score-rate">+{rate}</em>}
          <span className="eos-score-dots" aria-hidden="true">
            {b.pillars.map((pl) => <i key={pl.id} data-s={pl.owner ? (pl.hits ? "hit" : "own") : pl.ch ? "ch" : "free"} style={{ "--z": (ZONE[pl.zone] || {}).color }} />)}
          </span>
          <i className="eos-score-arrow" aria-hidden="true">{open ? "›" : "‹"}</i>
          <span className="eos-score-bar"><b style={{ width: `${k * 100}%` }} />{b.finalAt && <i className="eos-score-final" style={{ left: `${(b.finalAt / goal) * 100}%` }} />}</span>
        </button>
        {b.gaugeMax > 0 && (
          <div className="eos-gauge" data-full={(b.gauge || 0) >= b.gaugeMax ? "true" : undefined}
            title={`มาตรวัดทีม ${b.gauge || 0}/${b.gaugeMax} — ล้มมอน/ท่าร่วม/ทำลายรังเติม · เต็มแล้วกด "ถล่ม" วง 5×5 ดาเมจ 4 ที่ไหนก็ได้`}>
            <span className="eos-gauge-ico" aria-hidden="true">☄️</span>
            <span className="eos-gauge-bar"><b style={{ width: `${Math.min(1, (b.gauge || 0) / b.gaugeMax) * 100}%` }} /></span>
            {b.final && <span className="eos-final-chip" title="คืนสุดท้าย — กลางคืนถาวร ปีศาจบุกเสาทุกเทิร์น">🌑</span>}
          </div>
        )}
        {(b.perks || []).length > 0 && (
          <div className="eos-powers eos-perks-row">
            {b.perks.map((c) => <span key={c.id} className="eos-power" style={{ "--z": "#ffd25a" }} title={`การ์ดทีม ${c.name}: ${c.desc}`}>{c.icon}</span>)}
          </div>
        )}
        {(b.powers || []).length > 0 && (
          <div className="eos-powers">
            {b.powers.map((z) => <span key={z} className="eos-power" style={{ "--z": (ZONE[z] || {}).color }} title={`พลังเสา ${(ZONE[z] || {}).name || z}: ${(POWER[z] || {}).tip || ""}`}>{(POWER[z] || {}).icon || "✨"}</span>)}
          </div>
        )}
        {dead.length > 0 && (
          <div className="eos-revive" title="เพื่อนที่ล้มจะฟื้นที่จุดเกิดที่ไกลมอนเตอร์ที่สุด · ล้มหมดทุกคนพร้อมกัน = แพ้">
            {dead.map((r) => {
              const left = Math.max(0, (r.at || 0) - round);
              return (
                <span key={r.id} className="eos-revive-face" data-soon={left <= 1 ? "true" : undefined} title={`${r.p.name} ฟื้นในอีก ${left} เทิร์น`}>
                  {r.p.img ? <img src={r.p.img} alt="" /> : <i style={{ background: r.p.color || "#888" }} />}
                  <b>{left}</b>
                </span>
              );
            })}
          </div>
        )}
      </div>
      <div className="eos-score-panel" role="list" onClick={toggle}>
        {b.pillars.map((pl) => {
          const z = ZONE[pl.zone] || { name: pl.zone, color: "#cccccc" };
          const st = pl.owner ? "own" : pl.ch ? "ch" : "free";
          const by = pl.ch ? players.find((u) => u.id === pl.ch.by) : null;
          const tip = pl.owner
            ? `ยึดแล้ว — นับแต้มทุกจบเทิร์น · มอนเตอร์ตีเสาครบ ${pl.hp || 2} ครั้ง = หลุดกลับเป็นกลาง · ยืนติดเสากด "ซ่อมเสา" ล้างรอยตี`
            : pl.ch ? `${by ? by.name : "เพื่อน"} กำลังร่ายพิธี — ตาถัดไปยืนติดเสาแล้วกด "ยึด" อีกครั้ง · โดนดาเมจ/ออกห่าง = พิธีแตก`
            : `เสากลาง — ไม่ได้แต้ม · ยืนติดเสากด "ยึด" 2 ตาติดกัน (ใช้การโจมตีของตา)`;
          return (
            <div key={pl.id} role="listitem" className="eos-pl-row" data-s={st} style={{ "--z": z.color }} title={tip}>
              <span className="eos-pl-gem" aria-hidden="true">{st === "own" ? "✦" : st === "ch" ? "⏳" : "○"}</span>
              <span className="eos-pl-name">{z.name}{POWER[pl.zone] && <i className="eos-pl-pow" data-on={st === "own" ? "true" : undefined} title={POWER[pl.zone].tip}>{POWER[pl.zone].icon}</i>}</span>
              <span className="eos-pl-hits" aria-label="รอยโดนตี">
                {st === "own" && (pl.ward || 0) > 0 && <em className="eos-pl-ward" title="เกราะเสา — รับการตีแทนรอย">🛡{pl.ward}</em>}
                {st === "own" && Array.from({ length: pl.hp || 2 }, (_, i) => <i key={i} data-on={i < (pl.hits || 0) ? "true" : undefined} />)}
                {st === "ch" && by && (by.img ? <img src={by.img} alt="" /> : <em>{by.name}</em>)}
              </span>
              <span className="eos-pl-gain">{st === "own" ? "✔" : "—"}</span>
            </div>
          );
        })}
        <div className="eos-pl-sum" title="จำนวนเสาที่ยึด → แต้มต่อเทิร์น">
          <span>🔷 {held}/5</span>
          <span className="eos-score-rate">+{rate}</span>
          {(b.nightNo || 0) > 0 && <span title="คืนที่ — ปีศาจแกร่งขึ้นทุกคืน">🌙 {b.nightNo}</span>}
          {(b.kills || 0) > 0 && <span title="มอนเตอร์ที่กำจัดแล้ว">⚔ {b.kills}</span>}
          {(b.challenges || []).length > 0 && (
            <span className="eos-stars">
              {b.challenges.map((c) => <i key={c.key} data-ok={c.ok ? "true" : "false"} title={`ดาวท้าทาย: ${c.name}${c.ok ? "" : " (พลาดแล้ว)"}`}>★</i>)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
