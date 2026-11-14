// Road Trip: กล่องเก็บของกลางของรถตู้ (ผู้ใช้สั่ง 2026-11-14) — ทั้งทีมเก็บ/หยิบได้ · ช่วงเดินทางเท่านั้น (server/roadtrip/stash.js)
//  stash = state.roadtrip.van.stash { items, cap } · me = ผู้เล่นเครื่องนี้ (กระเป๋า) · bagSlots = ช่องกระเป๋า
import { shopInfoOf } from "../data/shop";
import { rtEmit } from "./rtSocket";
import { clickSound } from "../audio";
import { tip } from "./rtTip";
import "./StashPanel.css";

const BOUND = ["kebread", "lawHeart", "giornoArrow"];

function Ico({ it }) {
  const info = shopInfoOf(it) || {};
  return info.img ? <img src={info.img} alt="" className="stp-img" /> : <span className="stp-emoji">{info.icon || "✦"}</span>;
}
const label = (it) => { const info = shopInfoOf(it) || {}; return typeof info.label === "function" ? info.label(it) : info.name || it.type; };

export default function StashPanel({ stash, me, bagSlots = 5, players = [], onClose }) {
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
    <div className="stp" onPointerDown={(e) => e.stopPropagation()}>
      <div className="stp-head">
        <span className="stp-title">📦 กล่องรถ</span>
        <span className="stp-count">{items.length}/{stash.cap}</span>
        {onClose && <button type="button" className="stp-x" onClick={() => { clickSound(); onClose(); }}>✕</button>}
      </div>
      <div className="stp-grid">
        {Array.from({ length: stash.cap }, (_, i) => {
          const it = items[i];
          if (!it) return <div key={`e${i}`} className="stp-slot stp-empty" />;
          return (
            <button key={it.uid} type="button" className="stp-slot" disabled={full} onClick={() => send("take", it.uid)} {...tip(`หยิบ ${label(it)}${it.by ? ` · ${nameOf(it.by)} เก็บไว้` : ""}`, label(it))}>
              <Ico it={it} />
            </button>
          );
        })}
      </div>
      <div className="stp-sub">🎒</div>
      <div className="stp-grid stp-bag">
        {bag.length ? bag.map((it) => (
          <button key={it.uid} type="button" className="stp-slot" disabled={stashFull || BOUND.includes(it.type)} onClick={() => send("put", it.uid)} {...tip(`เก็บ ${label(it)} เข้ากล่องรถ`, label(it))}>
            <Ico it={it} />
          </button>
        )) : <div className="stp-slot stp-empty" />}
      </div>
    </div>
  );
}
