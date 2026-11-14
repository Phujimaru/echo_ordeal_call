// Road Trip — แผงทำอาหาร (กองไฟ/ครัวกลางแจ้งในแคมป์ · ผู้ใช้สั่ง 2026-11-15 "แผงกองไฟมีแค่ทำอาหาร" · server/roadtrip/camp.js + food.js)
//  เมนู 8 อย่าง (วัตถุดิบในกระเป๋า + กล่องรถ) → rt:camp { a: "cook", recipe } · ระหว่างรอสุก = คนข้าวตามจังหวะ (Space) → rt:camp { a: "stir", score }
//  กิจกรรมอื่นอยู่ที่จุดของมันบนกระดาน (CampSpot.jsx) · ธีมขาว/มืดตาม :root[data-ui] · คำอธิบายอยู่ในกล่องชี้เท่านั้น (กฎ CLAUDE.md)
import { useEffect, useState } from "react";
import { clickSound } from "../audio";
import { rtEmit } from "./rtSocket";
import { tip } from "./rtTip";
import { useNow } from "./rtCommon";
import { TimingBar } from "./CampGames";
import { RT_RECIPES, shopInfoOf, rtQty } from "../data/shop";
import "./CampPanel.css";

const COOK_MS = 4000; // server camp.js CAMP.cookMs
const ING_ICON = (t) => shopInfoOf({ type: t }).icon;
const count = (list, t) => (list || []).reduce((s, it) => s + (it && it.type === t ? rtQty(it) : 0), 0);

export default function CampPanel({ state, me, unitArg = {}, zoom = 1, onClose }) {
  const now = useNow(200);
  useEffect(() => {
    const on = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [onClose]);
  const rt = state.roadtrip || {}, camp = (rt.stop && rt.stop.camp) || {};
  const players = state.players || [];
  const owner = me && me.duoOf ? players.find((p) => p.id === me.duoOf) || me : me;
  const bag = (owner && owner.inventory) || [], stash = (rt.van && rt.van.stash && rt.van.stash.items) || [];
  const job = me && camp.cooking ? camp.cooking[me.id] : null;
  const send = (o) => { clickSound(); rtEmit("rt:camp", { ...o, ...unitArg }); };
  const feast = (camp.feast || []).length;
  const [stirred, setStirred] = useState(null); // เวลาเริ่มของจานที่คนแล้ว (job.at)
  return (
    <div className="cmp-veil" onClick={onClose}>
      <div className="cmp rt-ui" style={{ "--k": zoom }} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="ทำอาหาร">
        <div className="cmp-head">
          <span className="cmp-fire" aria-hidden="true">🍳</span>
          <b>ทำอาหาร</b>
          {feast > 0 && <span className="cmp-feast" {...tip("กินอาหารที่กองไฟด้วยกัน ≥ 2 คน = ทุกคนที่กิน สู้ครั้งหน้า คุ้มครอง +1 (1 เทิร์น)", "อิ่มด้วยกัน")}>🍽️ {feast}</span>}
          <button type="button" className="cmp-x" aria-label="ปิด" onClick={() => { clickSound(); onClose(); }}>✕</button>
        </div>
        <div className="cmp-grid">
          {RT_RECIPES.map((r) => {
            const info = shopInfoOf({ type: r.dish });
            const ok = Object.entries(r.need).every(([t, n]) => count(bag, t) + count(stash, t) >= n);
            const cooking = job && job.recipe === r.id;
            const k = cooking ? Math.max(0, Math.min(1, 1 - (job.doneAt - now) / COOK_MS)) : 0;
            return (
              <button key={r.id} type="button" className="cmp-dish" data-ok={ok ? "true" : "false"} data-cook={cooking ? "true" : "false"} disabled={!ok || !!job}
                onClick={() => send({ a: "cook", recipe: r.id })} {...tip(info.desc, info.label({}))}>
                <span className="cmp-dish-ic" aria-hidden="true">{info.icon}</span>
                <b className="cmp-dish-nm">{info.label({})}</b>
                <span className="cmp-need">
                  {Object.entries(r.need).map(([t, n]) => {
                    const have = count(bag, t) + count(stash, t);
                    return <span key={t} className="cmp-ing" data-ok={have >= n ? "true" : "false"}>{ING_ICON(t)}<small>{have}</small></span>;
                  })}
                </span>
                <span className="cmp-eff">{info.short}</span>
                {!ok && <span className="cmp-lock" aria-hidden="true">🔒</span>}
                {cooking && <i className="cmp-bar" style={{ width: `${k * 100}%` }} />}
              </button>
            );
          })}
        </div>
        {job && stirred !== job.at && (
          <div className="cmp-game"><TimingBar icon="🥄" rounds={3} onDone={(s) => { setStirred(job.at); send({ a: "stir", score: s }); }} /></div>
        )}
      </div>
    </div>
  );
}
