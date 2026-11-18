// เฉพาะ dev: หน้าดูกระดาน ?board=1&magna=1 — ปุ่มเล่นเอฟเฟกต์ของแม็กน่า สวิง (magnaFx.js)
//  "me" = แม็กน่า · เป้า = ตัวที่ใกล้สุด (ตัวไม่ขยับจริง ยกเว้นปุ่มดึง — ดูแค่ภาพ)
//  คอนโซล: window.__magnaFx(kind) = เล่นชุดเดียวกับปุ่ม
import { useEffect, useRef, useState } from "react";
import { MAGNA_T } from "./magnaFx";
import { playSfx } from "../audio";

const CUR = { units: [] };
const btn = { font: "500 13px Kanit, sans-serif", color: "#fff", cursor: "pointer", padding: "4px 9px", border: "1px solid #ff9a4a", background: "rgba(120,40,10,.95)" };
const CLIP = (k) => `/characters/magna/${k}.mp4`;

export default function MagnaFxDev({ units, setUnits, pushFx, setFocus, setShake }) {
  useEffect(() => { CUR.units = units; });
  const [clip, setClip] = useState(null);
  const after = useRef(null);
  const endClip = () => { setClip(null); const f = after.current; after.current = null; if (f) f(); };
  const me = () => { const u = CUR.units.find((x) => x.id === "me"); return { x: u.x, y: u.y }; };
  const foeU = () => {
    const m = me();
    return CUR.units.filter((u) => u.id !== "me").sort((a, b) => Math.abs(a.x - m.x) + Math.abs(a.y - m.y) - (Math.abs(b.x - m.x) + Math.abs(b.y - m.y)))[0] || null;
  };
  const foe = () => { const u = foeU(); return u ? { x: u.x, y: u.y } : { x: me().x + 2, y: me().y }; };
  const shake = () => setShake && setShake((n) => n + 1);
  const setMe = (fn) => setUnits((us) => us.map((u) => (u.id === "me" ? fn(u) : u)));
  const mag = (u) => u.magna || { balls: 0, heat: 0, knuckle: 0, boost: 0 };
  const play = {
    swing: () => { const a = me(), b = foe(); pushFx([{ kind: "magnaSwing", x: a.x, y: a.y, to: b, size: 1, toSize: 1 }]); playSfx("magna_swing"); setFocus(b); },
    knuckle: () => { const a = me(), b = foe(); pushFx([{ kind: "magnaKnuckle", x: a.x, y: a.y, to: b, size: 1, toSize: 1 }]); playSfx("magna_knuckle"); setFocus(b); },
    ball: () => { const a = me(); pushFx([{ kind: "magnaBall", x: a.x, y: a.y }]); playSfx("magna_ball"); setMe((u) => ({ ...u, magna: { ...mag(u), balls: (mag(u).balls + 1) % 4 } })); setFocus(a); },
    bat: () => {
      const a = me(), b = foe();
      pushFx([{ kind: "magnaBat", x: a.x, y: a.y, to: b, n: 2, target: "x" }]); playSfx("magna_bat");
      setTimeout(() => { pushFx([{ kind: "magnaBatHit", x: b.x, y: b.y, to: b }]); playSfx("magna_bat_hit"); shake(); }, MAGNA_T.bat);
      setFocus(b);
    },
    // เหมือนเกมจริง: ปาโดน → จังหวะพัก → คลิป → โซ่ติด
    deathmatch: () => {
      const a = me(), b = foe(), id = foeU() && foeU().id;
      pushFx([{ kind: "magnaThrow", x: a.x, y: a.y, to: b, target: id }]);
      setTimeout(() => { after.current = () => { pushFx([{ kind: "magnaLink", x: a.x, y: a.y, to: b }]); shake(); setMe((u) => ({ ...u, chain: { to: id, armed: false } })); }; setClip(CLIP("deathmatch")); }, MAGNA_T.throw);
      setFocus(b);
    },
    miss: () => { const a = me(), b = foe(); pushFx([{ kind: "magnaThrow", x: a.x, y: a.y, to: b, miss: true }]); playSfx("magna_throw"); setFocus(b); },
    arm: () => { const a = me(), b = foe(); pushFx([{ kind: "magnaArm", x: a.x, y: a.y, to: b }]); playSfx("magna_arm"); setMe((u) => ({ ...u, chain: u.chain ? { ...u.chain, armed: true } : u.chain })); },
    // Finisher แบบ 2: คลิป → ดึงมาติดตัว → ระเบิด → โซ่ขาด
    finisher: () => {
      after.current = () => {
        const a = me(), fu = foeU();
        if (!fu) return;
        const from = { x: fu.x, y: fu.y }, to = { x: a.x + 1, y: a.y };
        setUnits((us) => us.map((u) => (u.id === fu.id ? { ...u, x: to.x, y: to.y } : u)));
        pushFx([{ kind: "magnaPull", x: a.x, y: a.y, from, to }]); playSfx("magna_pull");
        setTimeout(() => {
          pushFx([{ kind: "magnaFinHit", x: to.x, y: to.y, to }, { kind: "magnaUnlink", x: a.x, y: a.y, to }]); playSfx("magna_fin_hit"); shake();
          setMe((u) => ({ ...u, chain: null }));
        }, MAGNA_T.pull);
        setFocus(to);
      };
      setClip(CLIP("finisher"));
    },
    unlink: () => { const a = me(), b = foe(); pushFx([{ kind: "magnaUnlink", x: a.x, y: a.y, to: b }]); playSfx("magna_chain_break"); setMe((u) => ({ ...u, chain: null })); },
    knuckleOn: () => { const a = me(); pushFx([{ kind: "magnaKnuckleOn", x: a.x, y: a.y }]); playSfx("magna_knuckle"); setMe((u) => ({ ...u, magna: { ...mag(u), knuckle: mag(u).knuckle ? 0 : 4 } })); },
    boost: () => { const a = me(); pushFx([{ kind: "magnaBoost", x: a.x, y: a.y }]); playSfx("magna_boost"); setMe((u) => ({ ...u, magna: { ...mag(u), boost: mag(u).boost ? 0 : 2 } })); },
    heat: () => setMe((u) => ({ ...u, magna: { ...mag(u), heat: [0, 3, 5, 8][([0, 3, 5, 8].indexOf(mag(u).heat) + 1) % 4] } })),
  };
  useEffect(() => {
    window.__magnaFx = (k) => play[k] && play[k]();
    return () => { delete window.__magnaFx; };
  });
  const labels = [["swing", "ตีไม้"], ["knuckle", "หมัดไฟ"], ["ball", "บอลไฟ"], ["bat", "Baseball bat"], ["deathmatch", "Deathmatch"], ["miss", "ปาพลาด"], ["arm", "Finisher กด"], ["finisher", "Finisher ดึง"], ["unlink", "โซ่ขาด"], ["knuckleOn", "Fire Knuckle"], ["boost", "Fire Boost"], ["heat", "OverHeat"]];
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
