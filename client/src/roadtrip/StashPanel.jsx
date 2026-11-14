// Road Trip: กล่องเก็บของกลางของรถตู้ (ผู้ใช้สั่ง 2026-11-14) — ทั้งทีมเก็บ/หยิบได้ · ช่วงเดินทางเท่านั้น (server/roadtrip/stash.js)
//  stash = state.roadtrip.van.stash { items, cap } · me = ผู้เล่นเครื่องนี้ (กระเป๋า) · bagSlots = ช่องกระเป๋า
//  เปิดได้เฉพาะตอนยืนที่กล่อง (ช่วงขับ = กล่องในรถ · จุดพัก = ติดรถตู้ที่จอด — server ตรวจ stash.js near) · วัตถุดิบซ้อนกอง (×n) · อาหาร = ปุ่มกิน 🍴 (rt:use)
//  หน้าตาเดียวกับกระเป๋า (BagScreen — คลาส bag-* ธีมขาว/มืด ui-theme.css) · ที่จุดพัก = แผงคู่ข้างกระเป๋า (BagScreen prop side) · ตอนขับ = แผงเดี่ยวมุมซ้ายบน
import { shopInfoOf, isRtDish, rtQty } from "../data/shop";
import { rtEmit } from "./rtSocket";
import { clickSound } from "../audio";
import { tip } from "./rtTip";
import "./StashPanel.css";

const BOUND = ["kebread", "lawHeart", "giornoArrow"];
const label = (it) => { const info = shopInfoOf(it) || {}; return typeof info.label === "function" ? info.label(it) : info.name || it.type; };
const nameOf0 = (it) => { const info = shopInfoOf(it) || {}; return typeof info.label === "function" ? info.label({ ...it, qty: 1 }) : it.type; };

function Tile({ it, onClick, disabled, tipText, onEat }) {
  const info = shopInfoOf(it) || {};
  return (
    <span className="stp-cell">
      <button type="button" className="bag-slot stp-slot" disabled={disabled} onClick={onClick} {...tip(`${tipText}${info.desc ? `\n${info.desc}` : ""}`, label(it))}>
        {info.img ? <img src={info.img} alt="" className="bag-slot-img" /> : <span className="bag-emoji">{info.icon || "✦"}</span>}
        <span className="bag-slot-name">{nameOf0(it)}{it.great ? " ✨" : ""}</span>
        {rtQty(it) > 1 && <b className="stp-qty">×{rtQty(it)}</b>}
      </button>
      {onEat && isRtDish(it.type) && <button type="button" className="stp-eat" onClick={() => { clickSound(); onEat(it); }} {...tip(info.desc || "", "กิน")}>🍴</button>}
    </span>
  );
}

export default function StashPanel({ stash, me, bagSlots = 5, players = [], onClose, onEat = null, side = false }) {
  if (!stash) return null;
  const items = stash.items || [];
  const unitId = me && me.duoOf ? { unitId: me.id } : {};
  const owner = me && me.duoOf ? players.find((p) => p.id === me.duoOf) || me : me;
  const bag = ((owner && owner.inventory) || []).filter(Boolean);
  const full = bag.filter((it) => it.type !== "kebread").length >= bagSlots;
  const stashFull = items.length >= stash.cap;
  const nameOf = (id) => (players.find((p) => p.id === id) || {}).name || "";
  const send = (op, uid) => { clickSound(); rtEmit("rt:stash", { op, uid, ...unitId }); };
  return (
    <div className={`bag-panel stp${side ? " stp-side" : ""}`} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
      <div className="bag-head stp-head">
        <span className="bag-head-ico stp-ico" aria-hidden="true">
          <svg viewBox="0 0 48 48"><path d="M7 18 H41 V40 H7 Z" /><path d="M7 18 L12 9 H36 L41 18" /><path d="M20 26 H28" /><path d="M24 9 V18" /></svg>
        </span>
        <span>
          <span className="bag-title stp-title">กล่องรถ</span>
          <span className="bag-lat stp-lat">Van Storage</span>
        </span>
        <span className="stp-count">{items.length}/{stash.cap}</span>
        {onClose && <button type="button" className="bag-x stp-x" aria-label="ปิด" onClick={() => { clickSound(); onClose(); }}>✕</button>}
      </div>
      <div className="stp-body">
        <div className="stp-grid">
          {Array.from({ length: stash.cap }, (_, i) => {
            const it = items[i];
            if (!it) return <div key={`e${i}`} className="bag-slot empty stp-slot" aria-hidden="true"><i /></div>;
            return <Tile key={it.uid} it={it} disabled={full && !it.qty} onClick={() => send("take", it.uid)} tipText={`หยิบเข้ากระเป๋า${it.by ? ` · ${nameOf(it.by)} เก็บไว้` : ""}`} />;
          })}
        </div>
        <div className="stp-sub"><span aria-hidden="true">🎒</span><b>{bag.filter((it) => it.type !== "kebread").length}/{bagSlots}</b></div>
        <div className="stp-grid">
          {bag.length ? bag.map((it) => (
            <Tile key={it.uid} it={it} disabled={(stashFull && !it.qty) || BOUND.includes(it.type)} onClick={() => send("put", it.uid)} tipText="เก็บเข้ากล่องรถ" onEat={onEat} />
          )) : <div className="bag-slot empty stp-slot" aria-hidden="true"><i /></div>}
        </div>
      </div>
    </div>
  );
}
