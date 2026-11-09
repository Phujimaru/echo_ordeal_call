// กระเป๋าแบบใหม่ (จอคอม · ผู้ใช้สั่ง 2026-10-09: ขนาดคงที่ สวย ไม่หดตามจำนวนไอเทม · ตัดคำอธิบายที่ไม่จำเป็น)
//  เวที 1920 × 1080 ย่อพอดีจอ · ซ้าย = ช่องกระเป๋าเต็มจำนวน (ช่องว่างเป็นกรอบเส้นประ) · ขวา = รายละเอียดของชิ้นที่เลือก + ปุ่มคำสั่ง
//  เงื่อนไขทั้งหมดเหมือน InventoryModal เดิม (Game.jsx) — ใช้ได้เฉพาะตาตัวเอง = ปุ่มจาง ไม่มีข้อความบอก
import { useEffect, useState } from "react";
import { shopInfoOf, DRAW_ITEM_TYPES, BATTERY_MAX } from "../../data/shop";
import { socket } from "../../socket";
import { clickSound } from "../../audio";
import { sameSide } from "../../duo";

const BOUND_ITEMS = ["kebread", "lawHeart", "giornoArrow"]; // ของประจำตัวละคร — ตรงกับ server/shop.js

function useStageK() {
  const calc = () => Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  const [k, setK] = useState(calc);
  useEffect(() => {
    const on = () => setK(calc());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return k;
}
// นกหวีดอัญเชิญมนต์อสูรเทพ (server/whistle.js) — ช่องพิเศษที่ 6 ของทุกคน · ไม่ใช่ของในกระเป๋า (ทิ้ง/ให้/แลกไม่ได้)
const WHISTLE = "__whistle";
function WhistleIcon({ className = "" }) {
  return (
    <svg className={`bag-whistle-ico ${className}`} viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <linearGradient id="bwGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff3c4" /><stop offset=".45" stopColor="#e8b64a" /><stop offset="1" stopColor="#8a5a14" /></linearGradient>
        <radialGradient id="bwGem" cx=".4" cy=".35" r=".7"><stop offset="0" stopColor="#e6d4ff" /><stop offset=".5" stopColor="#8e5cff" /><stop offset="1" stopColor="#3a1680" /></radialGradient>
      </defs>
      <path d="M14 52 h46 a30 30 0 1 1 -8 34 l-38 -14 a8 8 0 0 1 -5 -8 v-4 a8 8 0 0 1 5 -8 z" fill="url(#bwGold)" stroke="#5e3a08" strokeWidth="3" strokeLinejoin="round" />
      <path d="M22 60 h34" stroke="#fff6d8" strokeWidth="4" strokeLinecap="round" opacity=".7" />
      <circle cx="78" cy="76" r="12" fill="url(#bwGem)" stroke="#3a1680" strokeWidth="2" />
      <path d="M86 40 q10 -14 22 -12 M90 30 q4 -12 14 -16 M78 36 q2 -12 -4 -22" stroke="#c9a2ff" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M60 52 v-10 a6 6 0 0 1 12 0 v6" stroke="#5e3a08" strokeWidth="3" fill="none" />
    </svg>
  );
}
function Icon({ info, className = "" }) {
  if (info.img) return <img src={info.img} alt="" className={className} onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />;
  return <span className={`bag-emoji ${className}`}>{info.icon}</span>;
}

// draw = ช่วงจั่ว (ยังไม่กด "พอ"): { fortuneFull, hasNumber, cardCount } — ใช้ได้เฉพาะไอเทมช่วงจั่ว (ผู้ใช้สั่ง 2026-11-08) · null = ไม่ใช่ช่วงจั่ว
//  onDrawUse(item) = Game.jsx จัดการต่อ (ยาเปลี่ยนสี = ปิดกระเป๋าแล้วเลือกไพ่/สีบนมือ)
// statusOf(p) = รายการสถานะ (Game.jsx forecastStatusItems: { key, icon, label, cls, n }) — ใช้กับตัวเลือกของยาล้างสถานะ
// shops = ร้านบนแผนที่ที่ซื้อจากระยะไกลได้ (Gate of Babylon ของกิลกาเมช — me.remoteShop) · null = ไม่มีปุ่มร้าน · onShop(ร้าน) = เปิดร้านนั้น
const SHOP_CREST = { apoth: "⚗️", forge: "⚙️", cara: "🐎", capsule: "📦" };
export default function BagScreen({ me, players, myTurn, bagSlots = 5, draw = null, onDrawUse, statusOf, onClose, shops = null, onShop }) {
  const k = useStageK();
  const items = me?.inventory || [];
  const [selUid, setSelUid] = useState(items[0]?.uid || null);
  const [swapWith, setSwapWith] = useState(null); // id เพื่อนที่กำลังเลือกของมาแลก
  const [amount, setAmount] = useState(1); // วงจรพลังงาน: จำนวนแต้มที่จะถอน
  const [cleanseKey, setCleanseKey] = useState(null); // ยาล้างสถานะ: สถานะที่เลือกจะล้าง (ผู้ใช้สั่ง 2026-11-08 — เลือกเอง ลดทีละขั้น)
  const whistle = me?.whistle || null; // { cd, chance } · ยูนิตที่ถูกเรียก = ไม่มี
  const whistleSel = !!whistle && (selUid === WHISTLE || !items.length);
  const sel = whistleSel ? null : items.find((it) => it.uid === selUid) || items[0] || null;
  const slots = Math.max(bagSlots + (items.some((it) => it.type === "kebread") ? 1 : 0), items.length); // ขนมปังเอมิลิโกะไม่กินช่อง

  // Esc = ปิด
  useEffect(() => {
    const on = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [onClose]);

  const adjacent = (a, b) => !!a?.pos && !!b?.pos && Math.abs(a.pos.x - b.pos.x) + Math.abs(a.pos.y - b.pos.y) === 1;
  // ชั้นมิติ (วาเลนไทน์): คนคนละชั้นกับเรา = ให้/แลกของไม่ได้
  const sameDim = (p) => (p.dim || null) === (me?.dim || null);
  // ให้/แลกของ (โหมดร่วมมือ): เพื่อนร่วมทีมที่ยืนติดกัน · ของประจำตัวละครส่งต่อไม่ได้ (server/shop.js BOUND_ITEMS)
  const boxAdj = (a, b) => {
    if (!a?.pos || !b?.pos) return false;
    const na = Math.max(1, a.size | 0), nb = Math.max(1, b.size | 0);
    const dx = Math.max(0, a.pos.x - (b.pos.x + nb - 1), b.pos.x - (a.pos.x + na - 1));
    const dy = Math.max(0, a.pos.y - (b.pos.y + nb - 1), b.pos.y - (a.pos.y + na - 1));
    return dx + dy === 1;
  };
  const mates = (players || []).filter((p) => p.alive && p.id !== me?.id && !p.summon && !sameSide(p, me) && sameDim(p)
    && !!me?.teamId && p.teamId === me.teamId && boxAdj(me, p));
  const bound = (it) => !it || BOUND_ITEMS.includes(it.type);

  const emit = (ev, data) => { clickSound(); socket.emit(ev, data); };
  const pick = (uid) => { clickSound(); setSelUid(uid); setSwapWith(null); setAmount(1); setCleanseKey(null); };

  const info = sel ? shopInfoOf(sel) : null;
  const swapMate = sel && !bound(sel) && swapWith ? mates.find((m) => m.id === swapWith) || null : null;
  let actions = null;
  if (sel) {
    const type = sel.type;
    if (DRAW_ITEM_TYPES.includes(type)) {
      // ไอเทมช่วงจั่ว: กดใช้ได้เฉพาะช่วงจั่วก่อนกด "พอ"
      const ok = !!draw && (type === "fortune" ? !draw.fortuneFull : type === "cardColor" ? draw.hasNumber : draw.cardCount > 0);
      actions = <button type="button" className="bag-btn primary" disabled={!ok} onClick={() => { clickSound(); onDrawUse(sel); }}>ใช้</button>;
    } else if (type === "battery") {
      // วงจรพลังงาน: เลือกจำนวน (ไม่เกินที่ถังมี และไม่เกินที่แต้มสกิลยังว่าง) แล้วถอน
      const room = Math.max(0, (me?.maxSkill || 0) - Math.max(0, me?.skillPoints || 0));
      const max = Math.min(sel.charge || 0, room);
      const n = Math.max(1, Math.min(amount, max || 1));
      actions = (
        <>
          <div className="bag-amount">
            <button type="button" className="bag-btn sm" disabled={n <= 1} onClick={() => { clickSound(); setAmount(n - 1); }}>−</button>
            <b>{n}</b>
            <button type="button" className="bag-btn sm" disabled={n >= max} onClick={() => { clickSound(); setAmount(n + 1); }}>＋</button>
          </div>
          <button type="button" className="bag-btn primary" disabled={!myTurn || max <= 0} onClick={() => { emit("useInventoryItem", { uid: sel.uid, amount: n }); setAmount(1); }}>ใช้</button>
        </>
      );
    } else if (type === "cleanse") {
      // ยาล้างสถานะ: เลือกสถานะที่ติดอยู่ 1 อย่าง (ชิปไอคอน + ขั้นที่เหลือ) แล้วกดใช้ = ลด 1 ขั้น
      const keys = me?.cleansable || [];
      const all = statusOf && me ? statusOf(me) : [];
      const list = keys.map((k) => all.find((s) => s.key === k) || { key: k, icon: "✦", label: k, n: null });
      const chosen = list.find((s) => s.key === cleanseKey) ? cleanseKey : null;
      actions = (
        <>
          <div className="bag-cleanse">
            {list.map((s) => (
              <button type="button" key={s.key} className={`bag-cl ${s.cls || ""}`} data-on={chosen === s.key ? "true" : "false"} title={s.label} onClick={() => { clickSound(); setCleanseKey(s.key); }}>
                <span className="ic">{s.icon}</span>
                <span className="nm">{s.label}</span>
                {s.n != null && <b>{s.n}</b>}
              </button>
            ))}
          </div>
          <button type="button" className="bag-btn primary" disabled={!myTurn || !chosen} onClick={() => { emit("useInventoryItem", { uid: sel.uid, status: chosen }); setCleanseKey(null); }}>ใช้</button>
        </>
      );
    } else if (type === "kebread") {
      // ขนมปังของเอมิลิโกะ: กินเอง / ป้อนเคทที่ยืนติดกัน (คุมเอมิลิโกะอยู่เท่านั้น)
      const isEmi = me?.character?.id === "emiliko";
      const kate = isEmi ? (players || []).find((p) => p.id === me.duoOf) : null;
      const canFeed = !!kate && kate.alive && adjacent(me, kate);
      actions = (
        <>
          <button type="button" className="bag-btn primary" disabled={!myTurn || !isEmi} onClick={() => emit("useInventoryItem", { uid: sel.uid })}>กิน</button>
          <button type="button" className="bag-btn" disabled={!myTurn || !canFeed} onClick={() => emit("useInventoryItem", { uid: sel.uid, targetId: kate.id })}>ป้อนเคท</button>
        </>
      );
    } else {
      actions = <button type="button" className="bag-btn primary" disabled={!myTurn || sel.ready === false} onClick={() => emit("useInventoryItem", { uid: sel.uid })}>ใช้</button>; // ready false = หัวใจของลอว์ที่บีบไปแล้วเทิร์นนี้
    }
  }

  return (
    <div className="bag-veil" onClick={onClose}>
      <div className="bag-stage" style={{ "--k": k }}>
        <div className="bag-panel" onClick={(e) => e.stopPropagation()}>
          <div className="bag-head">
            <span className="bag-head-ico" aria-hidden="true">
              <svg viewBox="0 0 48 48"><path d="M8 18 H40 L37 42 H11 Z" /><path d="M17 18 V13 a7 7 0 0 1 14 0 V18" /><path d="M8 26 H40" /><path d="M21 26 V31 H27 V26" /></svg>
            </span>
            <span className="bag-title">กระเป๋า</span>
            <span className="bag-lat">Inventory</span>
            {Array.isArray(shops) && shops.length > 0 && (
              <span className="bag-shops">
                {shops.map((sh) => (
                  <button type="button" key={sh.id} className="bag-shop-btn" disabled={!myTurn} onClick={() => { clickSound(); onShop && onShop(sh); }}>
                    <span aria-hidden="true">{SHOP_CREST[sh.kind] || "🏪"}</span>{sh.name}
                  </button>
                ))}
              </span>
            )}
            <button type="button" className="bag-x" aria-label="ปิด" onClick={() => { clickSound(); onClose(); }}>✕</button>
          </div>

          <div className="bag-body">
            <div className={`bag-grid${slots > 9 ? " big" : ""}`}>
              {Array.from({ length: slots }, (_, i) => {
                const it = items[i];
                if (!it) return <div key={`e${i}`} className="bag-slot empty" aria-hidden="true"><i /></div>;
                const inf = shopInfoOf(it);
                return (
                  <button type="button" key={it.uid} className="bag-slot" data-sel={sel && sel.uid === it.uid ? "true" : "false"} onClick={() => pick(it.uid)}>
                    <Icon info={inf} className="bag-slot-img" />
                    <span className="bag-slot-name">{inf.label(it)}</span>
                  </button>
                );
              })}
              {whistle && (
                <button type="button" className="bag-slot bag-slot-whistle" data-sel={whistleSel ? "true" : "false"} onClick={() => pick(WHISTLE)}>
                  <WhistleIcon className="bag-slot-img" />
                  <span className="bag-slot-name">นกหวีดอัญเชิญมนต์อสูรเทพ</span>
                  {whistle.cd > 0 && <span className="bag-whistle-cd">{whistle.cd}</span>}
                </button>
              )}
            </div>

            <div className="bag-detail" data-empty={sel || whistleSel ? "false" : "true"}>
              {whistleSel ? (
                <>
                  <div className="bag-detail-art bag-whistle-art"><WhistleIcon className="bag-detail-img" /></div>
                  <div className="bag-detail-name">นกหวีดอัญเชิญมนต์อสูรเทพ</div>
                  <div className="bag-detail-short bag-whistle-stats">
                    <span>🎲 {whistle.chance}%</span>
                    {whistle.cd > 0 && <span>⏳ {whistle.cd}</span>}
                  </div>
                  <div className="bag-actions">
                    <button type="button" className="bag-btn primary bag-whistle-btn" disabled={!myTurn || whistle.cd > 0} onClick={() => { emit("blowWhistle", {}); onClose(); }}>เป่า</button>
                  </div>
                </>
              ) : sel ? (
                <>
                  <div className="bag-detail-art"><Icon info={info} className="bag-detail-img" /></div>
                  <div className="bag-detail-name">{info.label(sel)}</div>
                  {info.short && <div className="bag-detail-short" title={info.desc}>{info.short}</div>}
                  {swapMate && (
                    <div className="bag-ammo">
                      {(swapMate.inventory || []).filter((it) => !bound(it)).map((it) => {
                        const ti = shopInfoOf(it);
                        return (
                          <button type="button" key={it.uid} className="bag-ammo-btn" title={ti.label(it)} onClick={() => { emit("swapItem", { uid: sel.uid, toId: swapMate.id, theirUid: it.uid }); setSwapWith(null); }}>
                            <Icon info={ti} className="bag-ammo-img" />
                            <span>{ti.label(it)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div className="bag-actions">
                    {actions}
                    {!bound(sel) && mates.map((m) => (
                      <div key={m.id} className="bag-trade">
                        <button type="button" className="bag-btn" disabled={!myTurn || (m.inventory || []).filter((it) => it.type !== "kebread").length >= bagSlots} onClick={() => { emit("giveItem", { uid: sel.uid, toId: m.id }); setSwapWith(null); }}>ให้ {m.name}</button>
                        <button type="button" className="bag-btn" data-on={swapWith === m.id ? "true" : undefined} disabled={!myTurn || !(m.inventory || []).some((it) => !bound(it))} onClick={() => { clickSound(); setSwapWith(swapWith === m.id ? null : m.id); }}>แลก {m.name}</button>
                      </div>
                    ))}
                    {sel.type !== "kebread" && <button type="button" className="bag-btn ghost" disabled={!myTurn} onClick={() => emit("dropItem", { uid: sel.uid })}>ทิ้ง</button>}
                  </div>
                </>
              ) : (
                <div className="bag-detail-none" aria-hidden="true"><i /></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
