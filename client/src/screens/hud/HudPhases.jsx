// HUD แยกตามช่วง (ดีไซน์ที่ผู้ใช้อนุมัติ 2026-10-09 — ต้นแบบ .claude/plans/game-ui-redesign.html)
//  · DrawDock   — ช่วงจั่ว: เห็นแค่ไพ่ในมือ · หน้าปัดแต้ม 0–21 · ปุ่ม จั่ว / พอ (ชิดขอบล่างจอ ไพ่จมขอบจอเหมือนถือในมือ)
//                 + ปุ่มกระเป๋า (ไอเทมช่วงจั่วใช้ผ่านกระเป๋า — ผู้ใช้สั่ง 2026-11-08 แทนกล่องหกเหลี่ยมเดิม)
//  · HudCommand — ตาของเรา: สกิล 3 ช่อง + ช่องคำสั่ง (โจมตี · ร้านค้า [เฉพาะยืนติดร้าน] · กระเป๋า · ย้อน / จบตา)
//  · BagButton  — ช่วงจั่ว / ตาคนอื่น: เปิดกระเป๋า (คนที่กำลังเดินแสดงที่บนกลางของกระดาน)
//  · PhaseCall  — ฉากเปิดช่วงจั่วไพ่ (หกเหลี่ยมขยาย + ไพ่ 3 ใบ)
//  กฎผู้ใช้: ไม่มีข้อความอธิบาย — ชื่อ ตัวเลข ไอคอนเท่านั้น · หน่วยออกแบบ = ฐาน 1440 × 810 (ขยายด้วย --hud-k ของ SelfHud)
import Card from "../../components/Card";
import { shopInfoOf } from "../../data/shop";

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
//  pick = โหมดยาเปลี่ยนสี { card, onCard(i), onColor(color) } หรือ null
const CARD_COLORS = ["red", "blue", "green", "yellow"];
export function DrawDock({ cards, score, busted, handRef, draw, stand, pick, bag }) {
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
          const left = `calc(50% + ${off * Math.min(74, 300 / Math.max(1, n))}px)`;
          const can = !!pick && !c.special;
          return (
            <div key={i} className="dd-card" data-pick={pick ? (can ? (pick.card === i ? "sel" : "on") : "off") : undefined}
              style={{ left, transform: `translateX(-50%) translateY(${Math.abs(off) * 6}px) rotate(${off * 6}deg)` }}
              onClick={can ? () => pick.onCard(i) : undefined}>
              <div className={busted ? "dd-card-bust" : ""}><Card value={c.value} color={c.color} special={c.special} size="lg" /></div>
            </div>
          );
        })}
        {pick && Number.isInteger(pick.card) && cards && cards[pick.card] && (
          <div className="dd-swatches" style={{ left: `calc(50% + ${(pick.card - (n - 1) / 2) * Math.min(74, 300 / Math.max(1, n))}px)` }}>
            {CARD_COLORS.map((col) => (
              <button key={col} type="button" className={`dd-sw ${col}`} aria-label={col} disabled={cards[pick.card].color === col} onClick={() => pick.onColor(col)} />
            ))}
          </div>
        )}
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
      {bag && <div className="dd-bag"><BagButton solo {...bag} /></div>}
    </div>
  );
}

// ---------- ตาของเรา: สกิล + ช่องคำสั่ง ----------
const SWORD = <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 38 L34 14 L38 6 L30 10 L6 34" /><path d="M8 28 L20 40 M4 44 L10 38" /></svg>;
const SHOP = <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M6 18 L10 8 H38 L42 18 Z" /><path d="M6 18 a6 5 0 0 0 12 0 a6 5 0 0 0 12 0 a6 5 0 0 0 12 0" /><path d="M10 23 V41 H38 V23" /><path d="M20 41 V31 H28 V41" /></svg>;
// extra = ปุ่มพิเศษของตัวละคร (state.players[].actions จากฮุค hudActions — ไจโร: ขึ้น/ลงม้า) [{ key, icon, name, disabled, cd, row, onClick }]
//  row เดียวกันติดกัน = แบ่งครึ่งปุ่มวางคู่กันในแถวเดียว (ลอว์: ตัด | ทิ้ง)
function extraRows(extra) {
  const out = [];
  for (const x of extra || []) {
    const last = out[out.length - 1];
    if (x.row && last && last[0].row === x.row) last.push(x);
    else out.push([x]);
  }
  return out;
}
const extraBtn = (x) => (
  <button key={x.key} type="button" className="hc-btn ride" data-on={x.on ? "true" : undefined} aria-pressed={x.on ? "true" : undefined} disabled={x.disabled} onClick={x.onClick}><span className="ico">{x.icon}</span><b>{x.name}{x.cd > 0 ? ` ⏳${x.cd}` : ""}</b></button>
);
// shops = ร้านที่ยืนติดอยู่ [{ id?, name, kind, onClick }] — ปุ่มละร้าน (สีตาม kind)
export function HudCommand({ skills, attack, shops, ride, drop, extra, bag, undo, end }) {
  return (
    <section className="hc" aria-label="คำสั่ง">
      <div className="hud-skills hc-skills">{skills}</div>
      <div className="hc-col">
        {(shops || []).map((sh, i) => (
          <button key={sh.id || `${sh.kind}${i}`} type="button" className="hc-btn shop" data-kind={sh.kind || undefined} onClick={sh.onClick}><span className="ico">{SHOP}</span><b>{sh.name}</b></button>
        ))}
        <AttackButton {...attack} />
        {ride && <button type="button" className="hc-btn ride" disabled={ride.disabled} onClick={ride.onClick}><span className="ico">🎠</span><b>ขี่</b></button>}
        {drop && <button type="button" className="hc-btn ride" onClick={drop.onClick}><span className="ico">🙇</span><b>ให้ลง</b></button>}
        {extraRows(extra).map((g) => (g.length > 1
          ? <div key={g[0].key} className="hc-row">{g.map(extraBtn)}</div>
          : extraBtn(g[0])))}
        <BagButton {...bag} />
        <div className="hc-row">
          <button type="button" className="hc-btn" disabled={undo.disabled} onClick={undo.onClick}><b>↶ ย้อน</b></button>
          <button type="button" className="hc-btn end" disabled={end.disabled} onClick={end.onClick}><b>จบตา</b></button>
        </div>
      </div>
    </section>
  );
}
// ---------- ปุ่มโจมตี (ผู้ใช้สั่งทำใหม่ 2026-11-08) ----------
//  ตราหกเหลี่ยมดาบไขว้ · เลขเป้าในระยะ · มีเป้า = แสงวิ่ง + ประกายเต้น · ชี้ = ดาบไขว้ฟันเข้าหากัน + เส้นฟันวาบ · ไม่มีเป้า = ปุ่มจาง
const BLADES = (
  <svg viewBox="0 0 64 64" aria-hidden="true">
    <g className="atkb-b l"><path className="atkb-blade" d="M14 50 L44 12 L50 10 L48 16 L18 54 Z" /><path className="atkb-guard" d="M12 42 L22 52" /><path className="atkb-grip" d="M15 51 L9 57" /></g>
    <g className="atkb-b r"><path className="atkb-blade" d="M50 50 L20 12 L14 10 L16 16 L46 54 Z" /><path className="atkb-guard" d="M52 42 L42 52" /><path className="atkb-grip" d="M49 51 L55 57" /></g>
  </svg>
);
export function AttackButton({ disabled = false, onClick, targets = 0 }) {
  return (
    <button type="button" className="atkb" data-off={disabled ? "true" : "false"} disabled={disabled} onClick={onClick}>
      <span className="atkb-bg" aria-hidden="true" />
      <span className="atkb-slash" aria-hidden="true" />
      <span className="atkb-emb">
        <span className="atkb-hex" aria-hidden="true" />
        <span className="atkb-ico">{BLADES}</span>
        {!disabled && targets > 0 && <span key={targets} className="atkb-count">{targets}</span>}
      </span>
      <b>โจมตี</b>
      <span className="atkb-chev" aria-hidden="true"><i /><i /><i /></span>
    </button>
  );
}

// ---------- ปุ่มกระเป๋า (ผู้ใช้สั่งทำใหม่ 2026-11-08: "แค่กล่องเหลี่ยมๆ ไม่มีลูกเล่น") ----------
//  หกเหลี่ยมใส่กระเป๋าหนัง — ชี้ = ฝากระเป๋าเปิด ของในกระเป๋าเด้งออกมาเป็นพัด · ช่อง 5 เม็ดบอกจำนวนของ
//  ของเพิ่ม = กระเป๋าเด้ง (key = จำนวน) · hot = มีของที่กดใช้ได้ตอนนี้ (ช่วงจั่ว: ไอเทมช่วงจั่ว · ตาเดิน: วงจรพลังงานที่ถอนได้) → วงแสงเต้น
//  solo = ใช้เดี่ยว (ช่วงจั่ว / ตาคนอื่น) ขนาดใหญ่ขึ้น
const SATCHEL = (
  <svg viewBox="0 0 64 64" aria-hidden="true">
    <path className="bb-body" d="M10 24 H54 L50 56 H14 Z" />
    <path className="bb-strap" d="M22 24 V17 a10 10 0 0 1 20 0 V24" />
    <path className="bb-seam" d="M13.5 46 H50.5" />
    <g className="bb-flap">
      <path d="M8 22 H56 L52 36 Q32 42 12 36 Z" />
      <rect className="bb-clasp" x="28" y="33" width="8" height="8" rx="1.5" />
    </g>
  </svg>
);
export function BagButton({ onClick, items = [], slots = 5, hot = false, solo = false }) {
  const n = items.filter((it) => it.type !== "kebread").length; // ขนมปังเอมิลิโกะไม่กินช่อง
  const peek = items.slice(0, 4);
  const mid = (peek.length - 1) / 2;
  return (
    <button type="button" className={`bb${solo ? " bb-solo" : ""}`} data-hot={hot ? "true" : "false"} data-full={n >= slots ? "true" : "false"} onClick={onClick}>
      <span className="bb-bg" aria-hidden="true" />
      <span className="bb-emb">
        <span className="bb-hex" aria-hidden="true" />
        <span className="bb-peek" aria-hidden="true">
          {peek.map((it, i) => {
            const info = shopInfoOf(it);
            const d = i - mid;
            return (
              <span key={it.uid || i} className="bb-peek-it" style={{ "--d": i, "--x": `${d * 24}px`, "--y": `${-36 + Math.abs(d) * 6}px`, "--r": `${d * 14}deg` }}>
                {info.img ? <img src={info.img} alt="" /> : info.icon}
              </span>
            );
          })}
        </span>
        <span key={n} className="bb-icon">{SATCHEL}</span>
        {n > 0 && <span key={`c${n}`} className="bb-count">{n}</span>}
      </span>
      <span className="bb-txt">
        <b>กระเป๋า</b>
        <span className="bb-pips" aria-label={`${n}/${slots}`}>
          {Array.from({ length: slots }, (_, i) => <i key={i} data-on={i < n ? "true" : "false"} />)}
        </span>
      </span>
    </button>
  );
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
