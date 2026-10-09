// กระเป๋าแบบใหม่ (จอคอม · ผู้ใช้สั่ง 2026-10-09: ขนาดคงที่ สวย ไม่หดตามจำนวนไอเทม · ตัดคำอธิบายที่ไม่จำเป็น)
//  เวที 1920 × 1080 ย่อพอดีจอ · ซ้าย = ช่องกระเป๋าเต็มจำนวน (ช่องว่างเป็นกรอบเส้นประ) · ขวา = รายละเอียดของชิ้นที่เลือก + ปุ่มคำสั่ง
//  เงื่อนไขทั้งหมดเหมือน InventoryModal เดิม (Game.jsx) — ใช้ได้เฉพาะตาตัวเอง = ปุ่มจาง ไม่มีข้อความบอก
import { useEffect, useState } from "react";
import { shopInfoOf } from "../../data/shop";
import { socket } from "../../socket";
import { clickSound } from "../../audio";

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
function Icon({ info, className = "" }) {
  if (info.img) return <img src={info.img} alt="" className={className} onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />;
  return <span className={`bag-emoji ${className}`}>{info.icon}</span>;
}

export default function BagScreen({ me, players, roundNumber, myTurn, bagSlots = 5, onPickGunAmmo, onPickSuit, onClose }) {
  const k = useStageK();
  const items = me?.inventory || [];
  const [selUid, setSelUid] = useState(items[0]?.uid || null);
  const [gunOpen, setGunOpen] = useState(false);
  const sel = items.find((it) => it.uid === selUid) || items[0] || null;
  const slots = Math.max(bagSlots, items.length);

  // Esc = ปิด
  useEffect(() => {
    const on = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [onClose]);

  const adjacent = (a, b) => !!a?.pos && !!b?.pos && Math.abs(a.pos.x - b.pos.x) + Math.abs(a.pos.y - b.pos.y) === 1;
  const suitTargets = (players || []).filter((p) => p.alive && p.id !== me?.id && !p.mark42 && adjacent(me, p));
  const suitOut = me?.mark42Owned || null;
  const suitWearer = suitOut ? (players || []).find((p) => p.id === suitOut.wearerId) : null;
  const ammoItems = items.filter((it) => it.type === "gutsAmmo");
  const targets = (players || []).filter((p) => p.alive && p.id !== me?.id && !(me?.teamId && p.teamId === me.teamId));
  const canFire = myTurn && (me?.gutsShotTurn || 0) !== roundNumber && ammoItems.length > 0 && targets.length > 0;

  const emit = (ev, data) => { clickSound(); socket.emit(ev, data); };
  const pick = (uid) => { clickSound(); setSelUid(uid); setGunOpen(false); };

  const info = sel ? shopInfoOf(sel) : null;
  let actions = null;
  if (sel) {
    const type = sel.type;
    if (type === "gutsGun") {
      actions = <button type="button" className="bag-btn primary" disabled={!gunOpen && !canFire} onClick={() => { clickSound(); setGunOpen((v) => !v); }}>{gunOpen ? "ยกเลิก" : "ยิง"}</button>;
    } else if (type === "mark42") {
      actions = (
        <>
          <button type="button" className="bag-btn primary" disabled={!myTurn || !!me?.mark42} onClick={() => emit("useInventoryItem", { uid: sel.uid, mode: "self" })}>ใส่ให้ตัวเอง</button>
          <button type="button" className="bag-btn" disabled={!myTurn || !suitTargets.length} onClick={() => { clickSound(); onPickSuit(sel.uid, "give"); }}>ใส่ให้ผู้เล่นอื่น</button>
          <button type="button" className="bag-btn warn" disabled={!myTurn || !suitTargets.length} onClick={() => { clickSound(); onPickSuit(sel.uid, "bomb"); }}>ใส่แล้วระเบิด</button>
        </>
      );
    } else if (type !== "gutsAmmo") {
      actions = <button type="button" className="bag-btn primary" disabled={!myTurn} onClick={() => emit("useInventoryItem", { uid: sel.uid })}>ใช้</button>;
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
            <button type="button" className="bag-x" aria-label="ปิด" onClick={() => { clickSound(); onClose(); }}>✕</button>
          </div>

          {suitOut && (
            <div className="bag-suit">
              <img src="/characters/Mark42/mark42.webp" alt="" />
              <b>Mark 42</b>
              <span className="bag-suit-who">{suitOut.self ? "คุณ" : suitOut.wearerName}</span>
              <span className="bag-suit-ar">⛨ {suitOut.armor}/7</span>
              <span className="bag-suit-btns">
                {!suitOut.self && <button type="button" className="bag-btn sm" disabled={!myTurn || !!me?.mark42 || !adjacent(me, suitWearer)} onClick={() => emit("mark42Control", { action: "recall" })}>เรียกคืน</button>}
                <button type="button" className="bag-btn sm" disabled={!myTurn} onClick={() => emit("mark42Control", { action: "remove" })}>ถอด</button>
                {!suitOut.self && <button type="button" className="bag-btn sm warn" disabled={!myTurn} onClick={() => emit("mark42Control", { action: "detonate" })}>ระเบิด</button>}
              </span>
            </div>
          )}

          <div className="bag-body">
            <div className="bag-grid">
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
            </div>

            <div className="bag-detail" data-empty={sel ? "false" : "true"}>
              {sel ? (
                <>
                  <div className="bag-detail-art"><Icon info={info} className="bag-detail-img" /></div>
                  <div className="bag-detail-name">{info.label(sel)}</div>
                  {info.short && <div className="bag-detail-short" title={info.desc}>{info.short}</div>}
                  {gunOpen ? (
                    <div className="bag-ammo">
                      {ammoItems.map((a) => {
                        const ai = shopInfoOf(a);
                        return (
                          <button type="button" key={a.uid} className="bag-ammo-btn" title={ai.label(a)} onClick={() => { clickSound(); setGunOpen(false); onPickGunAmmo(a); }}>
                            <Icon info={ai} className="bag-ammo-img" />
                            <span>{ai.short || ai.label(a)}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                  <div className="bag-actions">
                    {actions}
                    <button type="button" className="bag-btn ghost" disabled={!myTurn} onClick={() => emit("dropItem", { uid: sel.uid })}>ทิ้ง</button>
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
