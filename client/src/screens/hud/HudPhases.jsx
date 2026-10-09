// HUD แยกตามช่วง (ดีไซน์ที่ผู้ใช้อนุมัติ 2026-10-09 — ต้นแบบ .claude/plans/game-ui-redesign.html)
//  · DrawDock   — ช่วงจั่ว: เห็นแค่ไพ่ในมือ · หน้าปัดแต้ม 0–21 · ปุ่ม จั่ว / พอ (ชิดขอบล่างจอ ไพ่จมขอบจอเหมือนถือในมือ)
//  · HudCommand — ตาของเรา: สกิล 3 ช่อง + ช่องคำสั่ง (โจมตี · ร้านค้า [เฉพาะยืนติดร้าน] · กระเป๋า · ย้อน / จบตา)
//  · WatchChip  — ตาคนอื่น: ป้าย "ตาของ X" กลางล่าง · BagButton = เปิดดูกระเป๋า
//  · PhaseCall  — ฉากเปิดช่วงจั่วไพ่ (หกเหลี่ยมขยาย + ไพ่ 3 ใบ)
//  กฎผู้ใช้: ไม่มีข้อความอธิบาย — ชื่อ ตัวเลข ไอคอนเท่านั้น · หน่วยออกแบบ = ฐาน 1440 × 810 (ขยายด้วย --hud-k ของ SelfHud)
import Card from "../../components/Card";

const CAP = 21;
const P = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
const A0 = Math.PI * 0.75, A1 = Math.PI * 2.25; // หน้าปัด 270°
function arc(r, a0, a1) {
  const [x0, y0] = P(150, 150, r, a0), [x1, y1] = P(150, 150, r, a1);
  return `M${x0} ${y0} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1} ${y1}`;
}
const TICKS = Array.from({ length: CAP + 1 }, (_, i) => {
  const a = A0 + (A1 - A0) * i / CAP, [x0, y0] = P(150, 150, 117, a), [x1, y1] = P(150, 150, i % 7 === 0 ? 104 : 110, a);
  return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} />;
});

// ---------- ช่วงจั่ว ----------
export function DrawDock({ cards, score, busted, handRef, draw, stand }) {
  const n = Array.isArray(cards) ? cards.length : 0;
  const val = Number.isFinite(score) ? score : 0;
  const frac = Math.max(0, Math.min(CAP, val)) / CAP;
  const L = 2 * Math.PI * 130 * 0.75; // ความยาวโค้ง 270°
  const zone = val >= 17 && val <= CAP && !busted;
  return (
    <div className="dd">
      <div ref={handRef} className="dd-cards" data-n={n}>
        {cards === null ? <span className="dd-blind">🌑</span> : (cards || []).map((c, i) => {
          const off = i - (n - 1) / 2;
          return (
            <div key={i} className="dd-card" style={{ left: `calc(50% + ${off * Math.min(74, 300 / Math.max(1, n))}px)`, transform: `translateX(-50%) translateY(${Math.abs(off) * 6}px) rotate(${off * 6}deg)` }}>
              <div className={busted ? "dd-card-bust" : ""}><Card value={c.value} color={c.color} special={c.special} size="lg" /></div>
            </div>
          );
        })}
      </div>
      <div className="dd-dial" data-bust={busted ? "true" : "false"} data-zone={zone ? "true" : "false"}>
        <svg viewBox="0 0 300 300" aria-hidden="true">
          <defs>
            <linearGradient id="ddg" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#7fb8e6" /><stop offset=".6" stopColor="#c99ad6" /><stop offset="1" stopColor="#fff" /></linearGradient>
            <radialGradient id="ddd" cx=".5" cy=".4" r=".6"><stop offset="0" stopColor="#27508f" /><stop offset="1" stopColor="#0d1f40" /></radialGradient>
          </defs>
          <circle className="disc" cx="150" cy="150" r="118" />
          <path className="trk" d={arc(130, A0, A1)} />
          <path className="zone" d={arc(130, A0 + (A1 - A0) * 17 / CAP, A1)} />
          <path className="val" d={arc(130, A0, A1)} style={{ strokeDasharray: L, strokeDashoffset: L * (1 - (busted ? 1 : frac)) }} />
          <g className="tick">{TICKS}</g>
        </svg>
        <div className="dd-num">
          <small>แต้ม</small>
          <b>{busted ? "แตก" : (score != null ? score : "?")}</b>
          <span>/ {CAP}</span>
        </div>
      </div>
      <div className="dd-btns">
        <button type="button" className="dd-btn draw" disabled={draw.disabled} onClick={draw.onClick}><span className="ico">＋</span><span><b>จั่ว</b><span className="lat">Draw</span></span></button>
        <button type="button" className="dd-btn stand" disabled={stand.disabled} onClick={stand.onClick}><span className="ico">✋</span><span><b>{stand.done ? "พร้อม" : "พอ"}</b><span className="lat">Stand</span></span></button>
      </div>
    </div>
  );
}

// ---------- ตาของเรา: สกิล + ช่องคำสั่ง ----------
const SWORD = <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 38 L34 14 L38 6 L30 10 L6 34" /><path d="M8 28 L20 40 M4 44 L10 38" /></svg>;
const BAG = <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 18 H40 L37 42 H11 Z" /><path d="M17 18 V13 a7 7 0 0 1 14 0 V18" /><path d="M8 26 H40" /><path d="M21 26 V31 H27 V26" /></svg>;
const SHOP = <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M6 18 L10 8 H38 L42 18 Z" /><path d="M6 18 a6 5 0 0 0 12 0 a6 5 0 0 0 12 0 a6 5 0 0 0 12 0" /><path d="M10 23 V41 H38 V23" /><path d="M20 41 V31 H28 V41" /></svg>;
export function HudCommand({ skills, attack, shop, onBag, undo, end }) {
  return (
    <section className="hc" aria-label="คำสั่ง">
      <div className="hud-skills hc-skills">{skills}</div>
      <div className="hc-col">
        {shop && <button type="button" className="hc-btn shop" onClick={shop.onClick}><span className="ico">{SHOP}</span><b>ร้านค้ามายา</b></button>}
        <button type="button" className="hc-btn atk" data-off={attack.disabled ? "true" : "false"} disabled={attack.disabled} onClick={attack.onClick}><span className="ico">{SWORD}</span><b>โจมตี</b></button>
        <button type="button" className="hc-btn bag" onClick={onBag}><span className="ico">{BAG}</span><b>กระเป๋า</b></button>
        <div className="hc-row">
          <button type="button" className="hc-btn" disabled={undo.disabled} onClick={undo.onClick}><b>↶ ย้อน</b></button>
          <button type="button" className="hc-btn end" disabled={end.disabled} onClick={end.onClick}><b>จบตา</b></button>
        </div>
      </div>
    </section>
  );
}
export function BagButton({ onClick }) {
  return <button type="button" className="hc-btn bag hc-solo" onClick={onClick}><span className="ico">{BAG}</span><b>กระเป๋า</b></button>;
}

// ---------- ตาคนอื่น ----------
export function WatchChip({ name, color }) {
  return <div className="hw-chip" style={{ "--pc": color || "#7fb8e6" }}><i className="dot" /><b>ตาของ {name}</b></div>;
}

// ---------- ฉากเปิดช่วงจั่วไพ่ ----------
const HEX = "50,0 100,28.5 100,85.5 50,114 0,85.5 0,28.5";
export function PhaseCall({ round }) {
  return (
    <div className="dpc-call" aria-hidden="true">
      <div className="dpc-veil" />
      <svg className="dpc-hex h1" viewBox="0 0 100 114" preserveAspectRatio="none"><polygon points={HEX} /></svg>
      <svg className="dpc-hex h2" viewBox="0 0 100 114" preserveAspectRatio="none"><polygon points={HEX} /></svg>
      <div className="dpc-in">
        <div className="dpc-fan"><i /><i /><i /></div>
        <i className="dpc-l l" /><i className="dpc-l r" />
        <span className="dpc-lat">Draw Phase · Round {String(round || 1).padStart(2, "0")}</span>
        <b>ช่วงจั่วไพ่</b>
      </div>
    </div>
  );
}
