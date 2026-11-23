// เฉพาะ dev: หน้าดูกระดาน ?board=1&joshua=1 — ปุ่มเล่นเอฟเฟกต์ของโจชัว รอสฟิลด์ (joshuaFx.js)
//  กรวยไฟไปทางขวาจาก "me" · ช่องคิดด้วย boardRules.lineTiles เหมือนเกมจริง
//  คอนโซล: window.__joshuaFx(kind) = เล่นชุดเดียวกับปุ่ม (slash / cone / conePhoenix / heal / phoenix / singe / aura)
import { useEffect, useRef, useState } from "react";
import * as Rules from "./boardRules";
import { JOSHUA_FX_DUR, JOSHUA_T } from "./joshuaFx";
import { playSfx, startLoopSfx, stopLoopSfx, playMusic, stopMusic } from "../audio";

const CUR = { units: [] };
const btn = { font: "500 13px Kanit, sans-serif", color: "#fff", cursor: "pointer", padding: "4px 9px", border: "1px solid #ff8a5c", background: "rgba(120,20,30,.95)" };

export default function JoshuaFxDev({ units, setUnits, pushFx, setFocus, map, setShake }) {
  useEffect(() => { CUR.units = units; });
  const [clip, setClip] = useState(null);
  const after = useRef(null);
  const endClip = () => { setClip(null); const f = after.current; after.current = null; if (f) f(); };
  const me = () => { const u = CUR.units.find((x) => x.id === "me"); return { x: u.x, y: u.y }; };
  const foe = () => {
    const m = me();
    const list = CUR.units.filter((u) => u.id !== "me").sort((a, b) => Math.abs(a.x - m.x) + Math.abs(a.y - m.y) - (Math.abs(b.x - m.x) + Math.abs(b.y - m.y)));
    return list[0] ? { x: list[0].x, y: list[0].y } : { x: m.x + 1, y: m.y };
  };
  const cone = (phoenix) => {
    const a = me();
    const tiles = map ? Rules.lineTiles(map, a.x, a.y, "right", 4, 1, 1, 0, true) : [];
    pushFx([{ kind: "joshuaCone", x: a.x, y: a.y, dir: "right", tiles, phoenix, dur: JOSHUA_FX_DUR.joshuaCone }]);
    playSfx("joshua_fire");
    setTimeout(() => setShake && setShake((n) => n + 1), JOSHUA_T.cone + 120);
    setFocus({ x: a.x + 2, y: a.y });
  };
  const play = {
    slash: () => { const b = foe(); pushFx([{ kind: "mythSlash", x: b.x, y: b.y, size: 1, tone: "gold" }]); playSfx("joshua_slash"); setFocus(b); },
    cone: () => cone(false),
    conePhoenix: () => cone(true),
    heal: () => { const a = me(); pushFx([{ kind: "joshuaHeal", x: a.x, y: a.y, dur: JOSHUA_FX_DUR.joshuaHeal }]); playSfx("joshua_heal"); setFocus(a); },
    phoenix: (withClip = true) => {
      if (withClip) { after.current = () => play.phoenix(false); setClip("/characters/joshua_rosfield/joshua_skill3.mp4"); return; }
      const a = me();
      pushFx([{ kind: "joshuaPhoenix", x: a.x, y: a.y, dur: JOSHUA_FX_DUR.joshuaPhoenix }]);
      playSfx("joshua_phoenix");
      setShake && setShake((n) => n + 1);
      setUnits((us) => us.map((u) => (u.id === "me" ? { ...u, aura: "joshuaPhoenix" } : u)));
      startLoopSfx("joshua_fire_loop");
      setFocus(a);
    },
    phoenixNoClip: () => play.phoenix(false),
    singe: () => { const b = foe(); pushFx([{ kind: "joshuaSinge", x: b.x, y: b.y, dur: JOSHUA_FX_DUR.joshuaSinge }]); playSfx("joshua_singe"); setFocus(b); },
    aura: () => setUnits((us) => us.map((u) => {
      if (u.id !== "me") return u;
      const on = u.aura !== "joshuaPhoenix";
      if (on) startLoopSfx("joshua_fire_loop"); else stopLoopSfx();
      return { ...u, aura: on ? "joshuaPhoenix" : null };
    })),
    // ร่างนกฟีนิกซ์: เหมือนเกมจริง — คลิปกำเนิดนกไฟ → นก 3×3 กระพือปีก + เสียงไฟ+ปีก + เพลงนกไฟ
    bird: (withClip = true) => {
      const on = !CUR.units.find((x) => x.id === "me")?.jbird;
      if (!on) { setUnits((us) => us.map((u) => (u.id === "me" ? { ...u, jbird: null, standee: null, size: 1 } : u))); stopLoopSfx(); stopMusic(); return; }
      if (withClip) {
        // เหมือนเกมจริง: ระเบิดเพลิง + จอมืด (ไม่มีเสียง) → คลิปกำเนิดนกไฟ → นกปรากฏ
        const a = me();
        pushFx([{ kind: "joshuaIgnite", x: a.x, y: a.y, dur: JOSHUA_FX_DUR.joshuaIgnite }]);
        for (const d of [700, 1000, 1300, 1600, 1850, 2050]) setTimeout(() => setShake && setShake((n) => n + 1), d);
        setFocus(a);
        setTimeout(() => { after.current = () => play.bird(false); setClip("/characters/joshua_rosfield/joshua_rebirth.mp4"); }, JOSHUA_T.ignite);
        return;
      }
      setUnits((us) => us.map((u) => (u.id === "me" ? { ...u, aura: null, jbird: { down: false }, standee: "/characters/joshua_rosfield/phoenix.webp", size: 3 } : u)));
      { const a = me(); pushFx([{ kind: "joshuaBirdRise", x: a.x, y: a.y, size: 3, dur: JOSHUA_FX_DUR.joshuaBirdRise }]); playSfx("joshua_phoenix"); setShake && setShake((n) => n + 1); }
      startLoopSfx("joshua_bird_loop");
      playMusic("joshua_phoenix_theme");
      setFocus(me());
    },
    hellsong: () => { after.current = () => { playSfx("joshua_phoenix"); setShake && setShake((n) => n + 1); }; setClip("/characters/joshua_rosfield/joshua_hellsong.mp4"); },
  };
  useEffect(() => {
    window.__joshuaFx = (k) => play[k] && play[k]();
    return () => { delete window.__joshuaFx; };
  });
  useEffect(() => () => stopLoopSfx(), []);
  const labels = [["slash", "ฟัน"], ["cone", "เพื่อปกป้องทุกคน"], ["conePhoenix", "กรวย (ร่างนกเพลิง)"], ["heal", "พรของนกเพลิง"], ["phoenix", "สวมร่างนกเพลิง"], ["phoenixNoClip", "สวมร่าง (ไม่มีคลิป)"], ["singe", "ลุกไหม้สวนกลับ"], ["aura", "ออร่า"], ["bird", "นกฟีนิกซ์"], ["hellsong", "เพลิงนรก"]];
  return (
    <>
    {clip && (
      <div onClick={endClip} style={{ position: "fixed", inset: 0, zIndex: 60, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
        <video src={clip} autoPlay playsInline onEnded={endClip} onError={endClip} style={{ maxWidth: "100%", maxHeight: "100%" }} />
      </div>
    )}
    <div style={{ position: "fixed", left: 12, bottom: 12, zIndex: 50, display: "flex", gap: 6, flexWrap: "wrap", maxWidth: 760 }}>
      {labels.map(([k, l]) => <button key={k} style={btn} onClick={() => play[k]()}>{l}</button>)}
    </div>
    </>
  );
}
