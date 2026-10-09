// ============================================================
//  ฉากเต็มจอของระบบกระดาน (ดีไซน์ที่ผู้ใช้อนุมัติ 2026-10-09 — ต้นแบบ .claude/plans/game-ui-redesign.html)
//   · OrderCall    — เปิดไพ่ · ลำดับเดิน (ช่วง ORDER) ธีมขาวน้ำแข็ง ORDEAL CALL: ตัวละครหกเหลี่ยมบนเส้นโคจร → นับแต้ม → สลับที่เรียงตามแต้ม
//   · TurnCall     — ฉากตาเดินแบบ A "ประตูหกเหลี่ยม" ทุกครั้งที่ขึ้นตาคนใหม่ (ตาคนอื่นเร็วกว่า)
//   · ForecastScreen — หน้าคาดการณ์ผลการตี (แทน HUD ทั้งจอ · แบบ D ไม่มีกล่อง — ผู้ใช้เลือก 2026-10-09) + ปุ่มยืนยัน/ย้อน
//  ทุกฉากออกแบบบนเวที 1920 × 1080 แล้วย่อ/ขยายให้พอดีจอ (--k) · กฎผู้ใช้: ไม่มีข้อความอธิบาย — ชื่อ ตัวเลข ไอคอนเท่านั้น
// ============================================================
import { useEffect, useRef, useState } from "react";
import { faceStyle, isBleed } from "./charFace";
import "./boardScenes.css";

const hideBroken = (e) => { e.currentTarget.style.visibility = "hidden"; };
const HEX_PTS = "50,0 100,28.5 100,85.5 50,114 0,85.5 0,28.5";

// เวทีออกแบบ 1920 × 1080 ย่อพอดีจอ
function Stage({ k, className = "", children, style }) {
  return (
    <div className={`bsx ${className}`} style={{ "--k": k, ...style }}>
      <div className="bsx-in">{children}</div>
    </div>
  );
}

// นับเลขขึ้นแบบนุ่ม (เริ่มเมื่อ run = true)
function CountUp({ to, run, ms = 420 }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run || !Number.isFinite(to)) return undefined;
    let raf = 0;
    const t0 = performance.now();
    const f = (now) => {
      const k = Math.min(1, (now - t0) / ms);
      setV(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [to, run, ms]);
  return <>{run ? v : "?"}</>;
}

// ============================================================
//  OrderCall — เปิดไพ่ · ลำดับเดิน
//   seat = ลำดับที่นั่ง (ก่อนเรียง) · order = ลำดับเดิน (หลังเรียง) · ทั้งคู่เป็นรายการ id
//   จังหวะ: เข้า 0.6s → ลงเส้นโคจร → เปิดแต้มทีละคน (0.32s) → สลับที่ → เลขลำดับ + รางวัล → ออก
// ============================================================
const OC_DX = 315;
const ocY = (x) => { const t = (x - 40) / 1840; return (1 - t) * (1 - t) * 600 + 2 * (1 - t) * t * 380 + t * t * 600; };
const ocPos = (i, n) => {
  const x = 960 + (i - (n - 1) / 2) * OC_DX * (n > 5 ? 5 / n : 1);
  return { x: x - 150, y: ocY(x) - 126 };
};
export function OrderCall({ k, round, seat, order, byId, myId, lowQ }) {
  const n = order.length;
  const [stage, setStage] = useState(lowQ ? 3 : 0); // 0 ลง · 1 เปิดแต้ม · 2 สลับที่ · 3 ลำดับ+รางวัล · 4 ออก
  useEffect(() => {
    if (lowQ) { const t = setTimeout(() => setStage(4), 4800); return () => clearTimeout(t); }
    const reveal = 1150 + n * 320;
    const ts = [setTimeout(() => setStage(1), 1150), setTimeout(() => setStage(2), reveal + 420), setTimeout(() => setStage(3), reveal + 1200), setTimeout(() => setStage(4), reveal + 3000)];
    return () => ts.forEach(clearTimeout);
  }, [n, lowQ]);
  const sorted = stage >= 2;
  return (
    <Stage k={k} className="toc-call" style={{ "--n": n }}>
      <div className="toc-bg" data-out={stage >= 4 ? "true" : "false"}>
        <div className="toc-globe"><svg viewBox="-100 -100 200 200" aria-hidden="true"><circle r="98" /><ellipse rx="98" ry="30" /><ellipse rx="98" ry="62" /><ellipse rx="30" ry="98" /><ellipse rx="62" ry="98" /><ellipse rx="86" ry="98" /><line x1="-98" y1="0" x2="98" y2="0" /><line x1="0" y1="-98" x2="0" y2="98" /></svg></div>
        <div className="toc-scan" />
        <i className="toc-tick tl" /><i className="toc-tick tr" /><i className="toc-tick bl" /><i className="toc-tick br" />
        <svg className="toc-orbit" viewBox="0 0 1920 1080" aria-hidden="true">
          <defs><linearGradient id="tocg" x1="0" x2="1"><stop offset="0" stopColor="#3d8bd9" stopOpacity="0" /><stop offset=".2" stopColor="#3d8bd9" /><stop offset=".5" stopColor="#9b4f96" /><stop offset=".8" stopColor="#3d8bd9" /><stop offset="1" stopColor="#3d8bd9" stopOpacity="0" /></linearGradient></defs>
          <path className="o1" d="M40 600 Q960 380 1880 600" />
          <path className="o2" d="M40 616 Q960 396 1880 616" />
        </svg>
        <div className="toc-head">
          <div className="toc-lat">Round {String(round).padStart(2, "0")} · Turn Order</div>
          <h1><i className="toc-dia l" />ลำดับเดิน<i className="toc-dia r" /></h1>
        </div>
      </div>
      {seat.map((id, si) => {
        const p = byId[id];
        if (!p) return null;
        const oi = order.indexOf(id);
        const at = ocPos(sorted && oi >= 0 ? oi : si, n);
        const bust = !!p.busted;
        const first = oi === 0;
        return (
          <div key={id} className="toc-col" data-bust={bust && stage >= 1 ? "true" : "false"} data-first={first && stage >= 3 ? "true" : "false"} data-out={stage >= 4 ? "true" : "false"}
            style={{ "--pc": p.color || "#3d8bd9", "--d": `${si * 90}ms`, "--od": `${(oi >= 0 ? oi : si) * 60}ms`, transform: `translate(${at.x}px, ${at.y}px)`, transitionDelay: sorted ? `${(oi >= 0 ? oi : si) * 40}ms` : "0ms" }}>
            <div className="toc-rk" data-on={stage >= 3 ? "true" : "false"} style={{ animationDelay: `${(oi >= 0 ? oi : 0) * 110}ms` }}>{oi + 1}</div>
            <div className="toc-hexw">
              <svg className="toc-ring" viewBox="0 0 100 114" preserveAspectRatio="none" aria-hidden="true"><polygon points={HEX_PTS} /></svg>
              <div className="toc-fr" />
              <div className="toc-fa"><img src={p.img} alt="" style={faceStyle(p)} onError={hideBroken} /></div>
              <svg className="toc-crack" viewBox="0 0 100 114" preserveAspectRatio="none" aria-hidden="true"><path d="M48 0 L42 30 L58 46 L40 70 L52 114 M58 46 L84 52 L100 44 M42 30 L18 26" /></svg>
              {first && stage >= 3 && <div className="toc-crown">👑</div>}
              {bust && stage >= 1 && <div className="toc-stamp" style={{ animationDelay: `${si * 320 + 430}ms` }}>แตก</div>}
            </div>
            {stage >= 3 && <div className="toc-rew" data-neg={bust ? "true" : "false"} style={{ animationDelay: `${(oi >= 0 ? oi : 0) * 110 + 300}ms` }}>{bust ? "−1 ช่อง" : first ? "+2 เหรียญ" : "+1 เหรียญ"}</div>}
            <div className="toc-plate">
              <div className="toc-name">{id === myId ? "คุณ" : p.name}</div>
              <div className="toc-ch">{p.character?.name || ""}</div>
              <div className="toc-pts"><span className="toc-pv"><RevealScore p={p} si={si} run={stage >= 1} /></span><small>แต้ม</small></div>
            </div>
          </div>
        );
      })}
      <div className="toc-flash" data-on={stage === 3 ? "true" : "false"} />
    </Stage>
  );
}
function RevealScore({ p, si, run }) {
  const [go, setGo] = useState(false);
  useEffect(() => {
    if (!run) return undefined;
    const t = setTimeout(() => setGo(true), si * 320);
    return () => clearTimeout(t);
  }, [run, si]);
  if (p.score == null) return <>?</>;
  return <CountUp to={p.score} run={go} />;
}

// ============================================================
//  TurnCall — ฉากตาเดินแบบ A "ประตูหกเหลี่ยม"
//   me = ตาของเรา (สีม่วง ECHO · "YOUR MOVE") · คนอื่น = สีประจำผู้เล่น · เร็วกว่า 25%
//   แถวล่าง: ไพ่ในมือ = แต้ม (ไพ่คนอื่นไม่เห็น = แต้มอย่างเดียว)
// ============================================================
const CARD_HEX = { red: "#d2455b", blue: "#3d8bd9", green: "#2fa36b", yellow: "#e0a526", purple: "#9b4f96" };
export function TurnCall({ k, p, rank, isMe, onDone }) {
  const sp = isMe ? 1 : 0.75;
  const nameRef = useRef(null);
  const [fs, setFs] = useState(150);
  useEffect(() => {
    const el = nameRef.current;
    if (el && el.scrollWidth > 850) setFs(Math.floor(150 * 850 / el.scrollWidth));
  }, [p]);
  useEffect(() => {
    const t = setTimeout(() => onDone && onDone(), 2450 * sp);
    return () => clearTimeout(t);
  }, [sp, onDone]);
  const pc = isMe ? "#9b4f96" : (p.color || "#3d8bd9");
  const cards = isMe && Array.isArray(p.cards) ? p.cards : null;
  return (
    <Stage k={k} className="tc-call" style={{ "--pc": pc, "--sp": sp }}>
      <div className="tc-shade" />
      <div className="tc-streak" style={{ top: 250 }} /><div className="tc-streak" style={{ top: 560, height: 40, animationDelay: `${70 * sp}ms` }} /><div className="tc-streak" style={{ top: 820, height: 90, animationDelay: `${140 * sp}ms` }} />
      <div className="tc-num">{String(rank).padStart(2, "0")}</div>
      <div className="tc-gate">
        <svg className="tc-ring r2" viewBox="0 0 100 114" preserveAspectRatio="none" aria-hidden="true"><polygon points={HEX_PTS} /></svg>
        <svg className="tc-ring r1" viewBox="0 0 100 114" preserveAspectRatio="none" aria-hidden="true"><polygon points={HEX_PTS} /></svg>
        <div className="tc-hexf" />
        <div className="tc-hex" data-bleed={isBleed(p) ? "true" : "false"}><img src={p.img} alt="" style={faceStyle(p, { big: true, cy: 26, box: 0.87 })} onError={hideBroken} /></div>
      </div>
      <div className="tc-txt">
        <div className="tc-lat">{isMe ? "Your Move" : "Now Moving"}</div>
        <div className="tc-name" ref={nameRef} style={{ fontSize: fs }}>{isMe ? <>ตาของ<em>คุณ</em></> : <>ตาของ <em>{p.name}</em></>}</div>
        <div className="tc-sub">{p.character?.name || ""}</div>
        <div className="tc-bar" />
        {p.score != null && (
          <div className="tc-stats">
            {cards && cards.length > 0 && (
              <span className="tc-hand">
                {cards.map((c, i) => (
                  <i key={i} style={{ "--cc": CARD_HEX[c.color] || "#7fb8e6", transform: `rotate(${(i - (cards.length - 1) / 2) * 9}deg)`, animationDelay: `${(700 + i * 90) * sp}ms` }}>{c.value}</i>
                ))}
              </span>
            )}
            {cards && cards.length > 0 && <span className="tc-eq">=</span>}
            <span className="tc-pts"><b>{p.busted ? "แตก" : p.score}</b><small>แต้ม</small></span>
          </div>
        )}
      </div>
    </Stage>
  );
}

// ============================================================
//  ForecastScreen — หน้าคาดการณ์ผลการตี (แทน HUD ทั้งจอ แบบ Fire Emblem Engage)
//   ซ้าย = เรา · ขวา = เป้า: รูปใหญ่ · แถบชื่อ · ♥ เลือด (ขีดที่จะเสียกะพริบ + ▾ค่าหลังโดน) · ⛨ เกราะ · ⚔ ดาเมจ ◎ แม่นยำ ✦ คริ
//   กลาง: ปุ่ม โจมตี / ย้อน + ลูกศรดาเมจ (สวนได้ = ลูกศรย้อน) · ตีแล้วตาย = ฝั่งเป้าแดง + กะโหลก
// ============================================================
function afterHit(p, n) {
  const armor = p.armor || 0, hp = p.hp || 0, toArmor = Math.min(armor, n);
  return { armor: armor - toArmor, hp: Math.max(0, hp - (n - toArmor)) };
}
const pct = (v, dflt) => (Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : dflt);
const SWORD = <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 38 L34 14 L38 6 L30 10 L6 34" /><path d="M8 28 L20 40 M4 44 L10 38" /></svg>;
const AIM = <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="16" /><circle cx="24" cy="24" r="5" /><path d="M24 2 V12 M24 36 V46 M2 24 H12 M36 24 H46" /></svg>;
const CRIT = <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4 L28 18 L42 12 L32 24 L42 36 L28 30 L24 44 L20 30 L6 36 L16 24 L6 12 L20 18 Z" /></svg>;
const SKULL = <svg viewBox="0 0 56 56" aria-hidden="true"><path fillRule="evenodd" d="M28 12c-9 0-15 6-15 14 0 5 2 8 5 10v5h20v-5c3-2 5-5 5-10 0-8-6-14-15-14z M22 21.5a3.5 3.5 0 1 0 0.01 0z M34 21.5a3.5 3.5 0 1 0 0.01 0z" /><rect x="24" y="42" width="3" height="5" /><rect x="29" y="42" width="3" height="5" /></svg>;

// แถบช่องเฉียง: now = ค่าตอนนี้ · after = หลังโดน (ช่องที่จะเสียกะพริบ)
function Pips({ max, now, after, ar }) {
  const n = Math.max(0, Math.min(40, max || 0));
  return (
    <div className={`fd-pips ${ar ? "fd-pips-ar" : ""}`}>
      {Array.from({ length: n }, (_, i) => <i key={i} className={`${i < now ? "on" : ""} ${i < now && i >= after ? "lose" : ""}`} />)}
    </div>
  );
}
// ฝั่งหนึ่ง (แบบ D ที่ผู้ใช้เลือก 2026-10-09 — ไม่มีกล่อง): ชื่อ + เส้นสี · เลือด (ตัวเลขใหญ่ + ช่อง) · เกราะ (ตัวเลข + ช่อง) · ⚔ ◎ ✦
function FdSide({ side, p, label, take, dmg, hit, crit, acc, lethal }) {
  const after = afterHit(p, take || 0);
  const hp = p.hp || 0, ar = p.armor || 0;
  const hpMax = p.maxHp || Math.max(hp, 1), arMax = p.maxArmor || 0;
  const hpLoss = take > 0 && after.hp !== hp, arLoss = take > 0 && after.armor !== ar;
  const stats = [
    <span key="d">{SWORD}{dmg ?? "?"}</span>,
    <span key="h" className={acc ? "acc" : ""}>{AIM}{hit}%</span>,
    <span key="c" className={crit ? "" : "z"}>{CRIT}{crit}%</span>,
  ];
  return (
    <div className={`fd-side ${side}`} style={{ "--c": p.color || (side === "l" ? "#9b4f96" : "#d2455b") }}>
      <div className="fd-nm">{label}<small>{p.character?.name || ""}</small></div>
      <div className="fd-rule" />
      <div className="fd-hp">
        <span className={`n ${lethal ? "ko" : ""}`}>{hp}</span>
        {hpLoss && <span className="to">▸{after.hp}</span>}
        <Pips max={hpMax} now={hp} after={after.hp} />
        {lethal && <span className="fd-skull">{SKULL}</span>}
      </div>
      {arMax > 0 && (
        <div className="fd-ar">
          <span className="ic">⛨</span><span className="n">{ar}</span>
          {arLoss && <span className="to">▸{after.armor}</span>}
          <Pips max={arMax} now={ar} after={after.armor} ar />
        </div>
      )}
      <div className="fd-row">{side === "r" ? stats.reverse() : stats}</div>
    </div>
  );
}
export function ForecastScreen({ k, me, foe, fc, counter, accurate, onConfirm, onCancel }) {
  const dmg = fc && Number.isFinite(fc.dmg) ? fc.dmg : null;
  const back = fc && Number.isFinite(fc.back) ? fc.back : null;
  const hit = pct(fc && fc.hit, 100), crit = pct(fc && fc.crit, 0);
  const bHit = pct(fc && fc.backHit, 100), bCrit = pct(fc && fc.backCrit, 0);
  const lethal = dmg != null && afterHit(foe, dmg).hp === 0;
  const backDmg = counter && !lethal ? back || 0 : 0;
  // Enter = ยืนยัน · Esc = ย้อน
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); onCancel(); }
      else if (e.key === "Enter") { e.preventDefault(); onConfirm(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onConfirm, onCancel]);
  return (
    <Stage k={k} className={`fd-screen ${lethal ? "lethal" : ""}`}>
      <div className={`fd-art l ${isBleed(me) ? "bleed" : ""}`}><img src={me.img} alt="" onError={hideBroken} /></div>
      <div className={`fd-art r ${isBleed(foe) ? "bleed" : ""}`}><img src={foe.img} alt="" onError={hideBroken} /></div>
      <div className="fd-fade" />
      <FdSide side="l" p={me} label="คุณ" take={backDmg} dmg={dmg} hit={hit} crit={crit} acc={accurate} lethal={false} />
      <FdSide side="r" p={foe} label={foe.name} take={dmg || 0} dmg={back} hit={bHit} crit={bCrit} acc={false} lethal={lethal} />
      <div className="fd-go">
        <button type="button" className="y" onClick={onConfirm}>{SWORD}โจมตี</button>
        <button type="button" className="n" onClick={onCancel}>ย้อน</button>
      </div>
      <div className="fd-arr" style={{ bottom: backDmg ? 110 : 76 }}><span className="ln" /><b>{dmg ?? "?"}</b><small>{hit}%</small></div>
      {backDmg > 0 && <div className="fd-arr back" style={{ bottom: 52 }}><small>{bHit}%</small><b>{backDmg}</b><span className="ln" /></div>}
    </Stage>
  );
}
