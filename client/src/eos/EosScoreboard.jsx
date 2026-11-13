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
const RATE = [0, 1, 2, 4, 6, 8];
// พลังประจำเสา (PVE รอบสาม — server/fodlan/eosExtra.js POWERS)
const POWER = {
  insomnia: { icon: "🔫", tip: "ป้อมปืนบนกำแพง Insomnia ยิงมอนใกล้สุดเองทุกต้นเทิร์น ดาเมจ 2" },
  altissia: { icon: "⛲", tip: "ต้นเทิร์น: ทุกคนในระยะ 3 ช่องจากเสา Altissia ฟื้นเลือด 1" },
  duscae: { icon: "🐤", tip: "ขี่โชโกโบะเดินเพิ่มอีก +1" },
  hammerhead: { icon: "🚗", tip: "ขับรถเดินเพิ่ม +1 · ชนแรงขึ้น +1" },
  lake: { icon: "🎣", tip: "ตกปลาไม่เจอปลายักษ์ · เหรียญ ×2" },
};

// การ์ดคำอธิบาย: ชี้ = ขึ้นทางซ้าย · กด = ปักค้าง (ชี้ออก = ปิด) — ผู้ใช้ 2026-11-10 "เอาเมาส์ชี้หรือกดอะไรไม่ได้ ไม่มีคำอธิบาย ออกแบบ UI ดีๆหน่อย"
function Tip({ icon, title, lines, children }) {
  const [on, setOn] = useState(false);
  return (
    <span className="eos-tipw" onMouseEnter={() => setOn(true)} onMouseLeave={() => setOn(false)}
      onPointerDown={(e) => { if (e.pointerType !== "mouse") setOn((v) => !v); }} onFocus={() => setOn(true)} onBlur={() => setOn(false)}>
      {children}
      {on && (
        <span className="eos-tip" role="tooltip">
          <span className="eos-tip-head"><span className="eos-tip-ico">{icon}</span><b>{title}</b></span>
          {lines.filter(Boolean).map((l, i) => <span key={i} className="eos-tip-line">{l}</span>)}
        </span>
      )}
    </span>
  );
}

export default function EosScoreboard({ state }) {
  const [open, setOpen] = useState(false);
  const [fold, setFoldRaw] = useState(() => { try { return localStorage.getItem("eos.hudFold") === "1"; } catch { return false; } });
  const setFold = (f) => setFoldRaw((v) => { const n = typeof f === "function" ? f(v) : f; try { localStorage.setItem("eos.hudFold", n ? "1" : "0"); } catch { /* ไม่มีที่เก็บ */ } return n; }); // ปิดไว้ก่อน (ผู้ใช้สั่ง 2026-11-09) — แท็บมีจุดเสา 5 ดวงบอกสถานะอยู่แล้ว
  const b = state && state.fodlan && state.fodlan.board;
  if (!b || !b.pve || !Array.isArray(b.pillars)) return null;
  const goal = b.goal || 50, score = b.score || 0, rate = b.rate || 0;
  const held = b.pillars.filter((pl) => pl.owner).length;
  const players = state.players || [];
  const dead = (b.revive || []).map((r) => ({ ...r, p: players.find((u) => u.id === r.id) })).filter((r) => r.p);
  const round = state.roundNumber || 0;
  const k = Math.max(0, Math.min(1, score / goal));
  const toggle = () => setOpen((v) => !v);
  const gauge = b.gauge || 0, gaugeFull = b.gaugeMax > 0 && gauge >= b.gaugeMax;
  return (
    <div className="eos-score" data-open={open ? "true" : "false"}>
      {/* การ์ดเดียว (ผู้ใช้ 2026-11-10 "ดูรก ให้พับเก็บได้ ปรับหน้าตาใหม่") — หัว = แต้มรวม (กด = แผงรายเสา) · ▾ = พับ/กางเนื้อหา */}
      <div className="eos-hud" data-fold={fold ? "true" : undefined}>
        <div className="eos-hud-head">
          <Tip icon="🔷" title={`แต้มรวมทีม ${score}/${goal}`} lines={[
            "ทั้งทีมเก็บแต้มร่วมกัน — ครบเป้าแล้วทุกคนชนะ",
            `ยึดเสาคริสตัล = ได้แต้มทุกจบเทิร์น (ถือ 1–5 ต้น = ${RATE.slice(1).join("/")})`,
            rate > 0 ? `จบเทิร์นนี้จะได้ +${rate}` : "ยังไม่มีเสา — ยังไม่ได้แต้มต่อเทิร์น",
            "เพชร 5 เม็ด = เสาแต่ละโซน (ทึบ = ยึดแล้ว · กะพริบ = กำลังร่าย/โดนตี)",
            "กดเพื่อดูรายละเอียดรายเสา",
          ]}>
            <button type="button" className="eos-hud-score" onClick={toggle} aria-expanded={open} aria-label="แต้มรวมทีม">
              <span className="eos-hud-gem" aria-hidden="true">◆</span>
              <b>{score}</b><small>/{goal}</small>
              {rate > 0 && <em className="eos-score-rate">+{rate}</em>}
              <span className="eos-score-dots" aria-hidden="true">
                {b.pillars.map((pl) => <i key={pl.id} data-s={pl.owner ? (pl.hits ? "hit" : "own") : pl.ch ? "ch" : "free"} style={{ "--z": (ZONE[pl.zone] || {}).color }} />)}
              </span>
            </button>
          </Tip>
          <button type="button" className="eos-hud-fold" onClick={() => setFold((v) => !v)} aria-label={fold ? "กาง" : "พับ"} aria-expanded={!fold}>{fold ? "▸" : "▾"}</button>
          <span className="eos-score-bar"><b style={{ width: `${k * 100}%` }} />{b.finalAt && <i className="eos-score-final" style={{ left: `${(b.finalAt / goal) * 100}%` }} />}</span>
        </div>
        {!fold && (
          <div className="eos-hud-body">
            {b.gaugeMax > 0 && (
              <Tip icon="☄️" title={`มาตรวัดทีม ${gauge}/${b.gaugeMax}`} lines={[
                "เติมเมื่อ: ล้มมอนเตอร์ · ท่าร่วม (หลายคนตีมอนตัวเดียวกัน) · ทำลายรัง",
                "เต็มแล้ว: ปุ่ม \"ถล่ม\" ขึ้นในแถบคำสั่ง — เลือกจุดไหนก็ได้ วง 5×5 ดาเมจ 4",
                gaugeFull ? "เต็มแล้ว — ใช้ได้เลย" : `อีก ${b.gaugeMax - gauge} จะเต็ม`,
                b.final ? "คืนสุดท้าย: กลางคืนถาวร ปีศาจบุกเสาทุกเทิร์น" : "",
              ]}>
                <div className="eos-hud-row eos-gauge" data-full={gaugeFull ? "true" : undefined}>
                  <span className="eos-hud-label">☄️ มาตรวัดทีม</span>
                  <span className="eos-gauge-num">{gaugeFull ? "พร้อม!" : `${gauge}/${b.gaugeMax}`}</span>
                  <span className="eos-gauge-bar"><b style={{ width: `${Math.min(1, gauge / b.gaugeMax) * 100}%` }} /></span>
                  {b.final && <span className="eos-final-chip">🌑 คืนสุดท้าย</span>}
                </div>
              </Tip>
            )}
            {b.lament && (
                <div className="eos-hud-row eos-hud-chips">
                  {/* ป้าย Lament ครอบแค่ชื่อ — ไม่ครอบชิปคำสาป (เคยซ้อนสองป้าย ผู้ใช้ส่งภาพ 2026-11-12) */}
                  <Tip icon="💀" title="Lament" lines={[
                    `ชีวิตทีม ${Math.max(0, b.lament.lives - b.lament.downs)}/${b.lament.lives} — ใครล้มก็ลด 1 · หมดแล้วคนที่ล้มไม่ฟื้นเอง`,
                    b.lament.rage && b.lament.rage.mov ? `มอนดุขึ้น เดิน +${b.lament.rage.mov}` : "มอนดุขึ้นทุก 10 เทิร์น",
                        "ล้มแล้วทิ้งร่าง — ขนนกคืนชีพ (ร้าน) ฟื้นได้ทันที ไม่นับการล้ม",
                    b.lament.dead ? "ผู้คร่ำครวญถูกโค่นแล้ว" : `แต้มรวม ${b.lament.at} = ผู้คร่ำครวญมา · ต้องล้มมันจึงชนะ`,
                  ]}>
                    <span className="eos-hud-label">💀 ชีวิต {Math.max(0, b.lament.lives - b.lament.downs)}/{b.lament.lives}</span>
                  </Tip>
                  <span className="eos-power-row">
                    {(b.lament.curses || []).map((c) => (
                      <Tip key={c.id} icon={c.icon} title={`คำสาป · ${c.name}`} lines={[c.desc]}>
                        <span className="eos-power" style={{ "--z": "#7a3fd0" }}>{c.icon}</span>
                      </Tip>
                    ))}
                  </span>
                </div>
            )}
            {(b.perks || []).length > 0 && (
              <div className="eos-hud-row eos-hud-chips">
                <span className="eos-hud-label">✨ การ์ดทีม</span>
                <span className="eos-power-row">
                  {b.perks.map((c) => (
                    <Tip key={c.id} icon={c.icon} title={`การ์ดทีม · ${c.name}${c.max > 1 ? ` Lv ${c.lv}` : ""}`} lines={[c.desc, "ได้จากโหวตทุก 10 แต้ม · ติดทั้งทีมจนจบเกม"]}>
                      <span className="eos-power" style={{ "--z": "#e0a92a" }}>{c.icon}{c.lv > 1 && <sup className="eos-perk-lv">{c.lv}</sup>}</span>
                    </Tip>
                  ))}
                </span>
              </div>
            )}
            {(b.powers || []).length > 0 && (
              <div className="eos-hud-row eos-hud-chips">
                <span className="eos-hud-label">🔷 พลังเสา</span>
                <span className="eos-power-row">
                  {b.powers.map((z) => (
                    <Tip key={z} icon={(POWER[z] || {}).icon || "✨"} title={`พลังเสา ${(ZONE[z] || {}).name || z}`} lines={[(POWER[z] || {}).tip || "", "ทำงานตลอดที่ทีมยังถือเสาต้นนี้ · เสาหลุด = พลังหาย"]}>
                      <span className="eos-power" style={{ "--z": (ZONE[z] || {}).color }}>{(POWER[z] || {}).icon || "✨"}</span>
                    </Tip>
                  ))}
                </span>
              </div>
            )}
            {dead.length > 0 && (
              <div className="eos-hud-row eos-hud-chips">
                <span className="eos-hud-label">🕯️ รอฟื้น</span>
                <span className="eos-power-row">
                  {dead.map((r) => {
                    const left = Math.max(0, (r.at || 0) - round);
                    return (
                      <Tip key={r.id} icon={r.gone ? "🪶" : "🕯️"} title={r.gone ? `${r.p.name} ไม่ฟื้นเอง` : `${r.p.name} ฟื้นในอีก ${left} เทิร์น`} lines={r.gone ? ["ชีวิตทีมหมดตอนล้ม", "ยืนติดร่างแล้วใช้ขนนกคืนชีพ = ฟื้นทันที", "ล้มหมดทุกคนพร้อมกัน = แพ้"] : ["ฟื้นที่จุดเกิดที่ไกลมอนเตอร์ที่สุด", "ยืนติดดวงวิญญาณแล้วกด \"ช่วย\" = ฟื้นเร็วขึ้น 1 เทิร์น", "ล้มหมดทุกคนพร้อมกัน = แพ้"]}>
                        <span className="eos-revive-face" data-soon={!r.gone && left <= 1 ? "true" : undefined} data-gone={r.gone ? "true" : undefined}>
                          {r.p.img ? <img src={r.p.img} alt="" /> : <i style={{ background: r.p.color || "#888" }} />}
                          <b>{r.gone ? "✝" : left}</b>
                        </span>
                      </Tip>
                    );
                  })}
                </span>
              </div>
            )}
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
