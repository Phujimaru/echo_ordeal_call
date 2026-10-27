// แผงตัวเรา (จอคอม/แท็บเล็ต) — กระจกน้ำเงินตัดมุม ตามดีไซน์ HudMain ที่ผู้ใช้อนุมัติ
//  ซ้ายล่าง = แผงตัวละคร+แต้มสกิล · กลางล่าง = แต้ม/มือไพ่/จั่ว-เปิดไพ่ · ขวาล่าง = กระเป๋า/ร้านค้า/สกิล · ซ้ายบน = รอบ/เวลา/ภูมิภาค
//  คอมโพเนนต์ในไฟล์นี้วาดอย่างเดียว — เงื่อนไขกดได้/ไม่ได้ทั้งหมดส่งมาจาก GameBoard (Game.jsx) ผ่าน props
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PERMANENT_STATUS_KEYS } from "../../data/permanentStatus";
import { ZeroIcon } from "../../board/BoardScenes";
import "./hud.css";

// สีประจำหมวดสถานะ (จาก cls ของ STATUS_INFO) — ใช้ย้อมช่องไอคอนกับตัวเลข
const TONES = [
  ["bg-echo-hp", "#ff6b81"],
  ["bg-echo-ice", "#f0c868"],
  ["bg-echo-magenta", "#e59ae0"],
  ["bg-echo-cyan", "#7fe0d0"],
  ["bg-echo-armor", "#7fb8e6"],
  ["bg-orange-500", "#f7a14a"],
  ["bg-purple-700", "#c084fc"],
];
function toneOf(cls = "") {
  const hit = TONES.find(([k]) => cls.split(" ").includes(k));
  return hit ? hit[1] : "#a9bcd6";
}
function hexA(h, a) {
  const n = parseInt(h.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

// ป้ายภาษาอังกฤษจาก statusEntries → ไทย/ทับศัพท์ (แปลเฉพาะใน HUD ไม่แตะข้อมูลต้นทาง)
//  ชื่อเฉพาะ (ชื่อท่า/ชื่ออาวุธ/ชื่อร่าง เช่น Resentful Scabbard, Rider Kick, Mark 42, PUT ON) คงเดิม
const LABEL_TH = [
  ["Sun Charge", "ชาร์จสุริยะ"],
  ["Solar", "โซลาร์"],
  ["Energy", "พลังงาน"],
  ["Stamina ชาร์จ", "ชาร์จสตามินา"],
  ["Dempsey Charge", "ชาร์จเดมป์ซีย์"],
  ["[Armor]", "อาร์เมอร์"],
  ["Poise", "พอยส์"],
];
function thLabel(label = "") {
  let out = String(label);
  for (const [en, th] of LABEL_TH) out = out.split(en).join(th);
  return out;
}

// ทรัพยากรตัวละคร = รายการที่ไม่ได้มาจาก p.statuses และมีตัวนับ "x/y" ในชื่อ (Energy 4/16, กระสุน 2/3 …)
const COUNTER_RE = /(\d+)\s*\/\s*(\d+)/;
function splitEntries(entries, raw) {
  const res = [];
  const list = [];
  for (const it of entries) {
    const m = !(raw && it.key in raw) && COUNTER_RE.exec(it.label || "");
    if (m) {
      const label = it.label.replace(m[0], "").replace(/\s+/g, " ").replace(/^[\s·]+|[\s·]+$/g, "");
      res.push({ ...it, short: label ? thLabel(label) : "", cur: Number(m[1]), max: Number(m[2]) }); // ไม่มีชื่อ (ตัวเลขล้วน) = ""
    } else list.push(it);
  }
  return { res, list };
}

// ป้ายตัวเลขท้ายแถว: จำนวนซ้อนทับ · เทิร์นที่เหลือ / สแตค / ถาวร
function statusValue(it, raw) {
  const parts = [];
  if (it.amt > 0) parts.push(`+${it.amt}`);
  const v = it.v || 0;
  const isRaw = !!raw && it.key in raw;
  if (v >= 99) parts.push("ถาวร");
  else if ((v > 1 || it.turns) && !String(it.label).includes(String(v))) {
    parts.push((isRaw && !PERMANENT_STATUS_KEYS.has(it.key)) || it.turns ? `${v} เทิร์น` : `×${v}`);
  }
  return parts.join(" · ");
}

function IconTile({ icon, tone, size = 28 }) {
  return (
    <span className="hud-ico" style={{ width: size, height: size, background: hexA(tone, 0.18), boxShadow: `inset 0 0 0 1px ${hexA(tone, 0.35)}` }} aria-hidden="true">
      {icon}
    </span>
  );
}

function Cells({ n, on, color, h, solidOver = 16 }) {
  if (n > solidOver) {
    return (
      <span className="hud-cells hud-cells-solid" style={{ height: h }}>
        <span style={{ width: `${Math.max(0, Math.min(1, on / n)) * 100}%`, background: color }} />
      </span>
    );
  }
  return (
    <span className="hud-cells">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} style={{ height: h, background: i < on ? color : "rgba(255,255,255,0.12)" }} />
      ))}
    </span>
  );
}

// เหรียญทอง (ใช้ซ้ำได้ทั้ง HUD)
export function CoinIcon({ size = 22 }) {
  return (
    <svg className="hud-coin-ico" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <circle cx="12" cy="12" r="10.5" fill="#a8781f" />
      <circle cx="12" cy="11.4" r="9.6" fill="#f0c868" />
      <circle cx="12" cy="11.4" r="6.4" fill="none" stroke="#b8862a" strokeWidth="1.6" />
      <path d="M12 7.6v7.6M9.8 9.6h4.4M9.8 13.2h4.4" stroke="#8a5f14" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6.2 8.4a7 7 0 0 1 4-3.4" fill="none" stroke="#fff4c8" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// ป้ายเหรียญ: เหนือแท็บสถานะ (ขอบซ้าย) · ไอคอน + จำนวน · เต็ม = + "สูงสุดแล้ว" (จองที่ไว้เสมอ กล่องจึงไม่หด)
//  เหรียญเปลี่ยน = ตัวเลขเด้ง + ป้าย +N / −N ลอยขึ้น
function GoldChip({ chipRef, gold = 0, goldMax = 0 }) {
  const [prev, setPrev] = useState(gold);
  const [bump, setBump] = useState(null);
  if (prev !== gold) {
    setPrev(gold);
    setBump({ id: (bump ? bump.id : 0) + 1, d: gold - prev });
  }
  const full = goldMax > 0 && gold >= goldMax;
  const digits = Math.max(String(gold).length, String(goldMax).length);
  return (
    <section ref={chipRef} className="hud-gold-chip" data-full={full ? "true" : "false"} aria-label={full ? `เหรียญ ${gold} สูงสุดแล้ว` : `เหรียญ ${gold}`} title={goldMax > 0 ? `เหรียญ ${gold}/${goldMax}` : `เหรียญ ${gold}`}>
      <span key={bump ? `c${bump.id}` : "c"} className="hud-gold-coin" data-bump={bump ? "true" : "false"}><CoinIcon size={24} /></span>
      <span className="hud-gold-num" style={{ minWidth: `${digits}ch` }}>
        <b key={bump ? `n${bump.id}` : "n"} data-bump={bump ? (bump.d > 0 ? "up" : "down") : "false"}>{gold}</b>
        {bump && bump.d !== 0 && (
          <i key={`f${bump.id}`} className="hud-gold-float" data-neg={bump.d < 0 ? "true" : "false"} aria-hidden="true">
            {bump.d > 0 ? `+${bump.d}` : `−${-bump.d}`}
          </i>
        )}
      </span>
      {goldMax > 0 && <span className="hud-gold-max" aria-hidden="true">สูงสุดแล้ว</span>}
    </section>
  );
}

// ---------- ซ้ายล่าง: แผงตัวละคร (ดีไซน์ E1 ปรับ) ----------
//  รูปหกเหลี่ยมด้านแบน (ขอบทอง→ฟ้า) เกยซ้ายของแผงเฉียง · ชื่อ+ทีม+ป้ายตัวละคร · เลือด/เกราะเป็นช่องเฉียงนับได้
//  ใต้แผง: แผงแต้มสกิล (ม่วง) + แถบทรัพยากรตัวละคร (เหรียญอยู่เหนือแท็บสถานะ — GoldChip) ต่อชิดใต้แผงตัวละครเป็นแท่งเดียวกัน (ไม่มีช่องว่าง ขอบซ้าย/ขวาตรงกัน)
//   แต่ละกล่องยังมีสี/ขอบของตัวเอง — ผู้ใช้: "ติดกันแต่ไม่รวมกัน" · รูปหกเหลี่ยมเกยทับทั้งแท่ง
//  รายการสถานะอยู่ในลิ้นชักซ้าย (HudStatusDrawer)
//  duo = ระบบคู่ (เคท & เอมิลิโกะ): [{ id, node, active, done, dead, onClick }] — รูปเล็กเรียงเหนือรูปหลัก
//   ตัวที่คุมอยู่ = กรอบทอง · จบตาแล้ว = จาง · ล้ม = ขาวดำ · onClick = สลับไปคุมตัวนั้น (null = กดไม่ได้)
export function HudPanel({ portrait, hexPortrait = true, duo = null, name, onName, teamId, teamColor, chips, vitals, sp = 0, spMax = 0, spLabel = "แต้มสกิล", statuses = [], rawStatuses }) {
  const [openKey, setOpenKey] = useState(null);
  const { res } = splitEntries(statuses, rawStatuses);
  const toggle = (k) => setOpenKey((o) => (o === k ? null : k));
  return (
    <div className="hud-prof">
      <div className="hud-prof-top">
        {duo && duo.length > 1 && (
          <div className="hud-duo" role="group">
            {duo.map((u) => (
              <button key={u.id} type="button" className="hud-duo-unit" disabled={!u.onClick} onClick={u.onClick || undefined}
                data-active={u.active ? "true" : "false"} data-done={u.done ? "true" : "false"} data-dead={u.dead ? "true" : "false"}>
                <span className="hud-hexframe-dark" aria-hidden="true" />
                <span className="hud-hexframe-in">{u.node}</span>
              </button>
            ))}
          </div>
        )}
        <div className="hud-prof-portrait">
          {hexPortrait ? (
            <button type="button" className="hud-portrait-hex" onClick={onName} aria-label="รายละเอียดตัวละคร">
              <span className="hud-hexframe-dark" aria-hidden="true" />
              <span className="hud-hexframe-in">{portrait}</span>
            </button>
          ) : (
            <div className="hud-portrait-twins">{portrait}</div>
          )}
        </div>
        <div className="hud-prof-stack">
          <section className="hud-prof-card" aria-label="ตัวละครของเรา">
            <div className="hud-name-row">
              <button type="button" className="hud-name" onClick={onName} title="รายละเอียดตัวละคร">{name}</button>
              {teamId && <span className="hud-team" style={{ background: teamColor }}>ทีม {teamId}</span>}
              <span className="hud-chips">{chips}</span>
            </div>
            {vitals}
          </section>
          <section className="hud-sp-strip" aria-label={spLabel} title={`${spLabel} ${sp}/${spMax}`}>
            <span className="hud-sp-label">{spLabel}</span>
            <span className="hud-pips">
              {Array.from({ length: spMax }, (_, i) => <span key={i} data-on={i < sp ? "true" : "false"} />)}
            </span>
            <span className="hud-sp-num">{sp}<span>/{spMax}</span></span>
          </section>
          {res.filter((it) => it.short).map((it) => (
            <ResourceRow key={it.key} it={it} open={openKey === it.key} onToggle={() => toggle(it.key)} />
          ))}
          {res.some((it) => !it.short) && (
            <ResourcePack items={res.filter((it) => !it.short)} openKey={openKey} onToggle={toggle} />
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- ลิ้นชักสถานะ (ชิดขอบซ้ายจอ) ----------
//  ปิด = เหลือแท็บเล็กติดขอบซ้าย (ไอคอน + จำนวน) · กดแท็บ = สไลด์ออกจากซ้าย · กดซ้ำ/ปุ่มปิด/Esc = สไลด์กลับ
//  เหนือแท็บ = ป้ายเหรียญ (gold != null) เลื่อนไปพร้อมแท็บ · ห้ามสูงเกินปุ่มกองการ์ดกลาง (.deck-drawer) — ที่ไม่พอ = ย้ายไปข้างแท็บ
//  ในลิ้นชักเป็นรายการแนวตั้งเลื่อนลงอย่างเดียว แตะแถวกางรายละเอียด · ความสูงพอดีเนื้อหา ไม่เกินพื้นที่เหนือแผงผู้เล่น
export function HudStatusDrawer({ statuses = [], rawStatuses, gold = null, goldMax = 0, statusAlt, onOpenAll, lowQ = false, defaultOpen = false, defaultOpenKey = null }) {
  const [open, setOpen] = useState(defaultOpen);
  const [openKey, setOpenKey] = useState(defaultOpenKey);
  const panelRef = useRef(null);

  const tabRef = useRef(null);
  const drawerRef = useRef(null);
  const chipRef = useRef(null);
  const [tight, setTight] = useState(false);
  const { list } = splitEntries(statuses, rawStatuses);
  // ถ้าวางป้ายเหรียญเหนือแท็บแล้วสูงเกินขอบล่างปุ่มกองการ์ดกลาง → วางข้างแท็บแทน (แผงตัวละครสูงขึ้นเพราะแถบทรัพยากร)
  const hasGold = gold != null;
  useLayoutEffect(() => {
    const drawer = drawerRef.current;
    if (!hasGold || !drawer || typeof ResizeObserver === "undefined") return undefined;
    const check = () => {
      const tab = tabRef.current, chip = chipRef.current, deck = document.querySelector(".deck-drawer");
      if (!tab || !chip || !deck) return setTight(false);
      const t = tab.getBoundingClientRect(), c = chip.getBoundingClientRect();
      const k = t.height / 40; // แท็บสูง 40 หน่วยฐาน
      setTight(t.top - 6 * k - c.height < deck.getBoundingClientRect().bottom);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(drawer);
    window.addEventListener("resize", check);
    return () => { ro.disconnect(); window.removeEventListener("resize", check); };
  }, [hasGold]);
  const toggle = (k) => setOpenKey((o) => (o === k ? null : k));
  // ปิดอยู่ = เนื้อหาในลิ้นชักห้ามรับโฟกัส (อยู่นอกจอ)
  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    if (open) el.removeAttribute("inert");
    else {
      if (el.contains(document.activeElement)) tabRef.current?.focus({ preventScroll: true });
      el.setAttribute("inert", "");
    }
  }, [open]);
  // Esc = ปิดลิ้นชัก
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <div ref={drawerRef} className="hud-drawer" data-open={open ? "true" : "false"} data-instant={lowQ ? "true" : "false"}>
      <section ref={panelRef} id="hud-status-drawer" className="hud-drawer-panel hud-glass" aria-label="สถานะ">
        <div className="hud-st-head">
          <span className="hud-st-title">สถานะ</span>
          <span className="hud-st-tools">
            <span className="hud-count">{list.length}</span>
            {onOpenAll && (
              <button type="button" className="hud-open-all" onClick={onOpenAll} aria-label="ดูสถานะทั้งหมด" title="ดูสถานะทั้งหมด">
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </button>
            )}
            <button type="button" className="hud-open-all" onClick={() => setOpen(false)} aria-label="ปิด" title="ปิด">
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
            </button>
          </span>
        </div>
        {statusAlt || <StatusList items={list} raw={rawStatuses} openKey={openKey} onToggle={toggle} />}
      </section>
      <div className="hud-drawer-side" data-tight={tight ? "true" : "false"}>
        {hasGold && <GoldChip chipRef={chipRef} gold={gold} goldMax={goldMax} />}
        <button
          ref={tabRef}
          type="button"
          className="hud-drawer-tab"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="hud-status-drawer"
          aria-label={open ? "ปิดสถานะ" : `สถานะ ${list.length}`}
          title="สถานะ"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
          <span className="hud-drawer-count">{list.length}</span>
        </button>
      </div>
    </div>
  );
}

// ทรัพยากรที่เป็นตัวเลขล้วน (ไม่มีชื่อ — ไจโร/ดิเอโก้/Ice Spike): รวมในแถบเดียว เรียงกันตามแนวนอน (ไอคอน + ช่อง + ตัวเลข)
//  แผงไม่สูงขึ้นตามจำนวนทรัพยากร · แตะรายการที่มีคำอธิบาย = กางใต้แถบ
function ResourcePack({ items, openKey, onToggle }) {
  const open = items.find((it) => it.key === openKey && it.desc);
  return (
    <div className="hud-res-strip hud-res-pack" data-open={open ? "true" : "false"}>
      <div className="hud-res-pack-row">
        {items.map((it) => {
          const tone = toneOf(it.cls);
          return (
            <button key={it.key} type="button" className="hud-res-item" style={{ "--tone": tone }} title={`${it.cur}/${it.max}`}
              onClick={it.desc ? () => onToggle(it.key) : undefined} aria-expanded={it.desc ? openKey === it.key : undefined}>
              <IconTile icon={it.icon} tone={tone} size={24} />
              <Cells n={it.max} on={it.cur} color={tone} h={8} solidOver={5} />
              <span className="hud-res-num">{it.cur}/{it.max}</span>
            </button>
          );
        })}
      </div>
      {open && <div className="hud-res-desc">{open.desc}</div>}
    </div>
  );
}

// แถบทรัพยากรตัวละคร: ทรงเฉียงแบบเดียวกับแผงแต้มสกิล ต่อลงมาใต้แผง (แตะเพื่อกางรายละเอียด)
function ResourceRow({ it, open, onToggle }) {
  const tone = toneOf(it.cls);
  const id = `hud-rs-${it.key}`;
  return (
    <div className="hud-res-strip" data-open={open ? "true" : "false"} style={{ "--tone": tone, "--tone-bg": hexA(tone, 0.14) }}>
      <button type="button" className="hud-res-btn" onClick={it.desc ? onToggle : undefined} aria-expanded={it.desc ? open : undefined} aria-controls={it.desc ? id : undefined}>
        <IconTile icon={it.icon} tone={tone} size={26} />
        <span className="hud-res-label">{it.short}</span>
        <Cells n={it.max} on={it.cur} color={tone} h={10} />
        <span className="hud-res-num">{it.cur}/{it.max}</span>
      </button>
      {open && it.desc && <div id={id} className="hud-res-desc">{it.desc}</div>}
    </div>
  );
}

// รายการสถานะแนวตั้ง เลื่อนลงอย่างเดียว · แตะแถวเพื่อดูรายละเอียดในแถวเอง
function StatusList({ items, raw, openKey, onToggle, max }) {
  const boxRef = useRef(null);
  const innerRef = useRef(null);
  const [more, setMore] = useState(false);
  // ยังเลื่อนลงต่อได้ไหม (โชว์เงาจางขอบล่าง)
  const measure = () => {
    const el = boxRef.current;
    if (el) setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
  };
  // เนื้อหาเปลี่ยน (สถานะมา/ไป/กางรายละเอียด) → วัดใหม่ผ่าน ResizeObserver
  useLayoutEffect(() => {
    if (typeof ResizeObserver === "undefined" || !innerRef.current) return undefined;
    const box = boxRef.current;
    const ro = new ResizeObserver(() => setMore(box.scrollHeight - box.scrollTop - box.clientHeight > 4));
    ro.observe(innerRef.current);
    ro.observe(boxRef.current);
    return () => ro.disconnect();
  }, []);
  return (
    <div className="hud-st-wrap">
      <div ref={boxRef} className="hud-st-list" style={max ? { maxHeight: max } : undefined} onScroll={measure}>
        <div ref={innerRef} className="hud-st-inner">
          {items.length === 0 && <div className="hud-st-empty">ไม่มีสถานะ</div>}
          {items.map((it) => {
            const tone = toneOf(it.cls);
            const open = openKey === it.key;
            const val = statusValue(it, raw);
            const id = `hud-st-${it.key}`;
            return (
              <div key={it.key} className="hud-row" data-open={open ? "true" : "false"}>
                <button type="button" className="hud-row-btn" onClick={it.desc ? () => onToggle(it.key) : undefined} aria-expanded={it.desc ? open : undefined} aria-controls={it.desc ? id : undefined}>
                  <IconTile icon={it.icon} tone={tone} />
                  <span className="hud-row-label">{thLabel(it.label)}</span>
                  {val && <span className="hud-pill" style={{ color: tone }}>{val}</span>}
                </button>
                {open && it.desc && <div id={id} className="hud-row-desc">{it.desc}</div>}
              </div>
            );
          })}
        </div>
      </div>
      {more && <div className="hud-st-fade" aria-hidden="true" />}
    </div>
  );
}

// ---------- กลางล่าง: แต้ม · มือไพ่ · จั่ว/เปิดไพ่ ----------
export function HudCenter({ score, busted, handRef, hand, draw, reveal }) {
  return (
    <div className="hud-center-in">
      <div className="hud-hand-row">
        <div className="hud-score">
          <span className="hud-score-label">แต้ม</span>
          <span className="hud-medal" data-busted={busted ? "true" : "false"}>{busted ? "แตก" : (score != null ? score : "???")}</span>
        </div>
        <div ref={handRef} className="hud-hand">{hand}</div>
      </div>
      <div className="hud-actions">
        <button type="button" className="hud-btn hud-btn-draw" disabled={draw.disabled} onClick={draw.onClick}>{draw.label || "จั่ว"}</button>
        <button type="button" className="hud-btn hud-btn-reveal" disabled={reveal.disabled} onClick={reveal.onClick}>{reveal.label || "เปิดไพ่"}</button>
      </div>
    </div>
  );
}

// ---------- ขวาล่าง: กระเป๋า · ร้านค้า · ตราสกิล 3 ช่อง ----------
function BagIcon() {
  return (
    <svg viewBox="0 0 32 32" width="48" height="48" aria-hidden="true">
      <path d="M11 10V8a5 5 0 0 1 10 0v2" fill="none" stroke="#bee3f8" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M6 11h20l-1.5 16a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z" fill="#3d8bd9" stroke="#bee3f8" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M11 16h10" stroke="#e6f2fb" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="14" y="14.5" width="4" height="4" rx="1" fill="#f0c868" />
    </svg>
  );
}
function ShopIcon() {
  return (
    <svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true">
      <path d="M5 12 7 5h18l2 7Z" fill="#f0c868" />
      <path d="M5 12q3 3 6 0q3 3 5 0q2 3 5 0q3 3 6 0" fill="#c4902a" />
      <rect x="7" y="13" width="18" height="14" fill="none" stroke="#f0c868" strokeWidth="2" />
      <rect x="13" y="19" width="6" height="8" fill="#f0c868" />
    </svg>
  );
}
export function HudRight({ extras, bagCount = 0, onBag, gold = 0, onShop, skills }) {
  return (
    <section className="hud-right-in" aria-label="สกิล">
      <div className="hud-extras">{extras}</div>
      <div className="hud-bag-row">
        <button type="button" className="hud-bag" onClick={onBag} aria-label="กระเป๋า" title="กระเป๋า">
          <BagIcon />
          {bagCount > 0 && <span className="hud-bag-badge">{bagCount}</span>}
        </button>
        <button type="button" className="hud-shop" onClick={onShop}>
          <ShopIcon />
          <span>ร้านค้า</span>
          <span className="hud-shop-gold"><CoinIcon size={20} />{gold}</span>
        </button>
      </div>
      <div className="hud-skills">{skills}</div>
    </section>
  );
}

// ---------- กล่องรวมทั้งสามกลุ่ม + เลื่อนลงซ่อนตอนเลือกเป้าหมาย ----------
//  hidden = กำลังเลือกเป้าหมาย/เป็นฝ่ายโจมตี — แผงทั้งหมด (รวมลิ้นชักสถานะ) หลบพ้นจอ เหลือแค่ปุ่มลูกศรไว้เรียกกลับมาดูชั่วคราว
//  zoom = ตัวคูณขนาด (หน่วยฐานดีไซน์ 1440×810 → px ของกระดาน) แต่ละกลุ่มขยายจากมุมที่ยึดไว้
//  กลุ่มกลางวางในช่องว่างจริงระหว่างซ้ายกับขวา (วัดจริง) — ความกว้างไม่พอ = ย่อทั้งชุดลงจนเรียงได้ ห้ามทับกันเด็ดขาด
const EDGE_L = 18; // ระยะขอบ (หน่วยฐาน)
const EDGE_R = 20;
const GAP = 16;
//  mode = "draw" (ช่วงจั่ว: เหลือแค่กลุ่มกลาง) | "turn" (ตาเรา) | "watch" (ตาคนอื่น/ช่วงอื่น — แผงซ้ายย่อ)
export function SelfHud({ hidden = false, noPeek = false, lowQ = false, zoom = 1, mode = "turn", panel, center, right, drawer }) {
  const dockRef = useRef(null);
  const leftRef = useRef(null);
  const centerRef = useRef(null);
  const rightRef = useRef(null);
  const [m, setM] = useState({ dockW: 0, leftW: 520, leftH: 240, centerW: 344, rightW: 442 });
  // วัดขนาดจริงของแต่ละกลุ่ม (ก่อนขยาย) + ความกว้างกระดาน
  useLayoutEffect(() => {
    const els = [dockRef.current, leftRef.current, centerRef.current, rightRef.current];
    if (els.some((e) => !e) || typeof ResizeObserver === "undefined") return undefined;
    const read = () => setM({
      dockW: els[0].clientWidth,
      leftW: els[1].offsetWidth,
      leftH: els[1].offsetHeight,
      centerW: els[2].offsetWidth,
      rightW: els[3].offsetWidth,
    });
    const ro = new ResizeObserver(read);
    els.forEach((e) => ro.observe(e));
    return () => ro.disconnect();
  }, []);
  const [peek, setPeek] = useState(false);
  const [prevHidden, setPrevHidden] = useState(hidden);
  if (prevHidden !== hidden) {
    setPrevHidden(hidden);
    setPeek(false);
  }
  const away = hidden && !peek;
  // ซ่อนแล้วห้ามโฟกัสค้างในแผง (React 18 ยังไม่รองรับ prop inert → ตั้ง attribute เอง)
  useLayoutEffect(() => {
    const el = dockRef.current;
    if (!el) return;
    if (away) {
      if (el.contains(document.activeElement)) document.activeElement.blur();
      el.setAttribute("inert", "");
    } else el.removeAttribute("inert");
  }, [away]);

  // ความกว้างรวมที่ต้องใช้ (หน่วยฐาน) → ถ้ากระดานแคบกว่า ย่อตัวคูณลงจนสามกลุ่มเรียงแถวเดียวได้พอดี
  const need = EDGE_L + m.leftW + GAP + m.centerW + GAP + m.rightW + EDGE_R;
  const k = m.dockW ? Math.min(zoom, m.dockW / need) : zoom;
  // ช่องว่างระหว่างกลุ่มซ้ายกับขวา (px ของกระดาน) — กลุ่มกลางอยู่กลางจอถ้าได้ ไม่งั้นเลื่อนเข้าช่องว่าง
  const gapL = (EDGE_L + m.leftW + GAP) * k;
  const gapR = m.dockW - (EDGE_R + m.rightW + GAP) * k;
  const cw = m.centerW * k;
  const cx = m.dockW ? Math.min(Math.max(m.dockW / 2, gapL + cw / 2), Math.max(gapL + cw / 2, gapR - cw / 2)) : null;
  return (
    <>
      <div
        ref={dockRef}
        className="hud-dock"
        data-away={away ? "true" : "false"}
        data-mode={mode}
        data-instant={lowQ ? "true" : "false"}
        aria-hidden={away ? "true" : undefined}
        style={{ "--hud-k": k, "--hud-panel-h": `${m.leftH}px` }}
      >
        {drawer && <div className="hud-drawer-zone">{drawer}</div>}
        <div ref={leftRef} className="hud-grp hud-left">{panel}</div>
        <div ref={centerRef} className="hud-grp hud-center" style={cx != null ? { left: cx } : undefined}>{center}</div>
        <div ref={rightRef} className="hud-grp hud-right">{right}</div>
      </div>
      {hidden && !noPeek && (
        <button type="button" className="hud-peek" style={{ "--hud-k": k }} data-peek={peek ? "true" : "false"} onClick={() => setPeek((v) => !v)} aria-expanded={peek} aria-label={peek ? "ซ่อนแผงผู้เล่น" : "แสดงแผงผู้เล่น"}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      )}
    </>
  );
}

// ---------- ซ้ายบน: กลางวัน/คืน · รอบ · เวลา · ภูมิภาค ----------
function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <circle cx="12" cy="12" r="5" fill="#f0c868" />
      <path d="M12 1.5V4M12 20v2.5M1.5 12H4M20 12h2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8" stroke="#f0c868" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path d="M15 3a9 9 0 1 0 6 12A7 7 0 1 1 15 3Z" fill="#bcd3ea" />
    </svg>
  );
}
// สนาม Colony (state.colony): แทนป้ายภูมิภาค — ปล้องที่จะปิดถัดไป + เทิร์นที่เหลือ · ปิดครบแล้ว = นับถอยหลังระเบิดตัวเอง
//  แถบ 4 ปล้อง: ปิดแล้ว = แดงมืด · ปล้องที่จะปิด = ส้ม (เหลือ 1 = กะพริบ) · เปิด = ฟ้า
const COLONY_SEC = ["I", "II", "III", "IV"];
const COLONY_NAME = ["เมือง", "ป่า", "เมืองตึก", "สวน"];
function ColonyIcon({ name }) {
  if (name === "boom") {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <circle cx="11" cy="14" r="7" fill="currentColor" />
        <path d="M15 8l3-3M18 5l1.5-1.5M19 7h2M17 3V1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M4 21V5.5L12 2l8 3.5V21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M8 21V9h8v12M8 13h8M8 17h8" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function ColonyChip({ colony }) {
  const sealed = Math.max(0, colony.sealed | 0);
  const cd = colony.countdown != null ? Math.max(0, colony.countdown | 0) : null;
  const left = cd != null ? cd : colony.sealIn != null ? Math.max(0, colony.sealIn | 0) : null;
  const next = Math.min(3, sealed);
  const urgent = left != null && left <= 1;
  return (
    <div className="hud-top-region hud-top-colony" data-mode={cd != null ? "boom" : "seal"} data-urgent={urgent ? "true" : "false"}>
      <span className="hud-top-gem hud-colony-gem"><span>{cd != null ? "!" : COLONY_SEC[next]}</span></span>
      <span className="hud-top-text">
        <span className="hud-top-name">{cd != null ? "ระเบิดตัวเอง" : "ปล้อง " + COLONY_SEC[next] + " · " + COLONY_NAME[next]}</span>
        {left != null && <span className="hud-top-sub hud-colony-left"><ColonyIcon name={cd != null ? "boom" : "door"} />เหลือ <b>{left}</b> เทิร์น</span>}
      </span>
      <span className="hud-colony-secs">
        {COLONY_SEC.map((n, i) => <i key={n} data-s={i < sealed ? "sealed" : cd == null && i === sealed ? "next" : "open"} />)}
      </span>
    </div>
  );
}
// สนาม Moon Cell (state.moon — GRID_PLAN §8.4): แทนป้ายภูมิภาค — คำสาปแห่งดวงจันทร์อีกกี่เทิร์นลง + ฮาคุโนะ 2 ตัว (ล้ม = เทาพร้อมเทิร์นที่จะฟื้น)
//  ไม่มีคำสาปที่เตือนอยู่ = นับถึงต้นเทิร์นที่ท่าลง (เล็งต้นเทิร์น nextCurse → ลงเทิร์นถัดไป) · เหลือ 1 = แดงกะพริบ
function MoonGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M15 3a9 9 0 1 0 6 12A7 7 0 1 1 15 3Z" fill="currentColor" />
    </svg>
  );
}
function MoonChip({ moon, round, players }) {
  const r = Number(round) || 0;
  const lands = moon.curse ? moon.curse.land : moon.nextCurse != null ? moon.nextCurse + 1 : null;
  const left = lands != null ? Math.max(0, lands - r) : null;
  const urgent = !!moon.curse && left != null && left <= 1;
  const byId = Object.fromEntries((players || []).map((p) => [p.id, p]));
  return (
    <div className="hud-top-region hud-top-moon" data-urgent={urgent ? "true" : "false"}>
      <span className="hud-top-gem hud-moon-gem"><MoonGlyph /></span>
      <span className="hud-top-text">
        <span className="hud-top-name oc-latin">Moon Cell</span>
        {left != null && <span className="hud-top-sub hud-moon-left"><MoonGlyph />เหลือ <b>{left}</b> เทิร์น</span>}
      </span>
      <span className="hud-moon-bosses">
        {(moon.bosses || []).map((b) => {
          const p = b.alive ? byId[b.id] : null;
          const back = b.reviveAt != null ? Math.max(0, b.reviveAt - r) : null;
          return (
            <span key={b.key} className="hud-moon-boss" data-alive={b.alive ? "true" : "false"}>
              <img src={b.key === "f" ? "/mooncell/hakuno_f.webp" : "/mooncell/hakuno_m.png"} alt="" draggable="false" />
              {b.alive && p ? <i style={{ width: `${Math.max(0, Math.min(1, (p.hp || 0) / Math.max(1, p.maxHp || 1))) * 100}%` }} /> : back != null && <b>{back}</b>}
            </span>
          );
        })}
      </span>
    </div>
  );
}
// ห่วงเวลาซีโร่ (zero.active): แทนป้ายภูมิภาค — ผนึก 4 อัน (ชมพู = ยังอยู่) · บัฟสะสม · ท่าไม้ตายล็อก · กดไม่ได้
//  ช่วงมิติพังทลาย (zero.collapse — ทาคุโตะ): นาฬิกาทราย + เทิร์นที่เหลือแทนบัฟ (ท่าไม้ตายไม่ล็อก)
function ZeroChip({ zero }) {
  const seals = Array.isArray(zero.seals) ? [...zero.seals].sort((a, b) => a.i - b.i) : [];
  const bp = zero.buffPhase || 0;
  const col = zero.collapse && Number.isFinite(Number(zero.collapse.left)) ? zero.collapse : null;
  if (col) {
    return (
      <div className="hud-top-region hud-top-zero" data-collapse="true">
        <span className="hud-top-gem hud-zero-gem"><span>0</span></span>
        <span className="hud-top-text">
          <span className="hud-top-name">ห่วงเวลาซีโร่</span>
          <span className="hud-top-sub">เฟส {zero.stage}</span>
        </span>
        <span className="hud-zero-info">
          <span className="hud-zero-seals">
            {seals.map((s) => <i key={s.i} data-on="false" />)}
          </span>
          <span className="hud-zero-buffs">
            <span className="hud-zero-left"><ZeroIcon name="hourglass" /><b>{Math.max(0, col.left | 0)}</b></span>
          </span>
        </span>
      </div>
    );
  }
  return (
    <div className="hud-top-region hud-top-zero">
      <span className="hud-top-gem hud-zero-gem"><span>0</span></span>
      <span className="hud-top-text">
        <span className="hud-top-name">ห่วงเวลาซีโร่</span>
        <span className="hud-top-sub">เฟส {zero.stage}</span>
      </span>
      <span className="hud-zero-info">
        <span className="hud-zero-seals">
          {seals.map((s) => <i key={s.i} data-on={s.broken ? "false" : "true"} />)}
        </span>
        <span className="hud-zero-buffs">
          {bp >= 1 && <span><ZeroIcon name="skill" /><b>+1</b></span>}
          {bp >= 2 && <span><ZeroIcon name="coin" /><b>+1</b></span>}
          {zero.atk > 0 && <span><ZeroIcon name="sword" /><b>+{zero.atk}</b></span>}
          <span className="hud-zero-lock"><ZeroIcon name="lock" /></span>
        </span>
      </span>
    </div>
  );
}
// Fodlan: ไอคอนสภาพอากาศของด่าน (server/fodlan.js WEATHER_KINDS)
const WEATHER_ICON = { storm: "⛈️", miasma: "☠️", tsunami: "🌊", blizzard: "🌨️", aura: "✳️" };
export function HudTopBar({ night, round, timer, journey, onJourney, zero, colony, moon, players, zoom = 1 }) {
  const zeroOn = !!(zero && zero.active);
  if (round == null && !journey && !zeroOn && !colony && !moon) return null;
  return (
    <div className="hud-top hud-glass" style={{ "--hud-k": zoom }} data-zero={zeroOn ? "true" : "false"} data-colony={colony ? (colony.countdown != null ? "boom" : "seal") : undefined}>
      <span className="hud-top-cycle" title={zeroOn ? undefined : night ? "กลางคืน" : "กลางวัน"}>{zeroOn ? <span className="hud-zero-hg"><ZeroIcon name="hourglass" /></span> : night ? <MoonIcon /> : <SunIcon />}</span>
      {round != null && (
        <>
          <span className="hud-top-round"><span className="hud-top-k">รอบที่</span><span className="hud-top-n">{round}</span></span>
          {timer}
        </>
      )}
      {zeroOn ? (
        <>
          {round != null && <span className="hud-top-div" aria-hidden="true" />}
          <ZeroChip zero={zero} />
        </>
      ) : colony ? (
        <>
          {round != null && <span className="hud-top-div" aria-hidden="true" />}
          <ColonyChip colony={colony} />
        </>
      ) : moon ? (
        <>
          {round != null && <span className="hud-top-div" aria-hidden="true" />}
          <MoonChip moon={moon} round={round} players={players} />
        </>
      ) : journey && (
        <>
          {round != null && <span className="hud-top-div" aria-hidden="true" />}
          <button type="button" className="hud-top-region" onClick={onJourney} title="ผลของภูมิภาคนี้">
            <span className="hud-top-gem" style={{ background: `linear-gradient(135deg, ${journey.glow || journey.color}, ${journey.color})` }}>
              <span>{journey.numeral}</span>
            </span>
            <span className="hud-top-text">
              <span className="hud-top-name">{journey.name}</span>
              <span className="hud-top-sub">{journey.turnsLeft != null ? `อีก ${journey.turnsLeft} เทิร์น` : "ปลายทางสุดท้าย"}{journey.weather && ` · ${WEATHER_ICON[journey.weather.kind] || "🌦️"} ${journey.weather.left}`}</span>
            </span>
          </button>
        </>
      )}
    </div>
  );
}
