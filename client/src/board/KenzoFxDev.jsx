// เฉพาะ dev: หน้าดูกระดาน ?board=1&kenzo=1 — เค็นโซ ซุกะ (bakeFx.js + hud/BakeMagnum.jsx)
//  ปืน Bake Magnum ตัวจริงของ HUD: ใส่การ์ด → งับ 3 ครั้ง → คลิปแปลงร่าง (ครั้งแรก) / ครั้งหลังเสียง+เอฟเฟกต์ · ร่างไรเดอร์กดปืน = อ้าปาก ดึงการ์ดออก
//  คอนโซล: window.__kenzoFx(kind) = shot / riderShot / corrode / decay / again / henshin / revert
import { useEffect, useRef, useState } from "react";
import { BAKE_FX_DUR, BAKE_HIT_P, BAKE_MS } from "./bakeFx";
import { playSfx } from "../audio";
import BakeMagnum from "../screens/hud/BakeMagnum";

const CUR = { units: [] };
const btn = { font: "500 13px Kanit, sans-serif", color: "#fff", cursor: "pointer", padding: "4px 9px", border: "1px solid #c07bff", background: "rgba(70,20,110,.95)" };
const IMG = { kenzo: "/characters/kenzo_suga/kenzo.webp", bake: "/characters/kenzo_suga/bake.webp" };

export default function KenzoFxDev({ units, setUnits, pushFx, setFocus }) {
  useEffect(() => { CUR.units = units; });
  const [kenzo, setKenzo] = useState({ rider: false, henshinShown: false });
  const [gun, setGun] = useState(false);
  const [clip, setClip] = useState(false);
  const stack = useRef(0);
  const me = () => { const u = CUR.units.find((x) => x.id === "me"); return { x: u.x, y: u.y }; };
  const foe = () => {
    const m = me();
    const list = CUR.units.filter((u) => u.id !== "me").sort((a, b) => Math.abs(a.x - m.x) + Math.abs(a.y - m.y) - (Math.abs(b.x - m.x) + Math.abs(b.y - m.y)));
    return list[0] ? { x: list[0].x, y: list[0].y } : { x: m.x + 2, y: m.y };
  };
  const look = (rider) => setUnits((us) => us.map((u) => (u.id === "me" ? { ...u, img: rider ? IMG.bake : IMG.kenzo } : u)));
  const shot = (rider, again) => {
    const a = me(), b = foe(), kind = rider ? "bakeShotRider" : "bakeShot";
    pushFx([{ kind, x: a.x, y: a.y, to: b, size: 1, toSize: 1, dur: BAKE_MS[kind] }]);
    setTimeout(() => playSfx(again ? "bake_shot2" : "bake_shot"), 30);
    if (rider) {
      setTimeout(() => {
        stack.current += 1;
        pushFx([{ kind: "bakeCorrode", x: b.x, y: b.y, n: stack.current, dur: BAKE_FX_DUR.bakeCorrode }]);
        playSfx("bake_corrode");
      }, BAKE_MS[kind] * BAKE_HIT_P[kind]);
    }
    setFocus(b);
  };
  const at = (kind, p) => { pushFx([{ kind, x: p.x, y: p.y, dur: BAKE_FX_DUR[kind] }]); setFocus(p); };
  const play = {
    shot: () => shot(false), riderShot: () => shot(true), riderShot2: () => shot(true, true),
    corrode: () => { stack.current += 1; at("bakeCorrode", foe()); playSfx("bake_corrode"); },
    decay: () => { at("bakeDecay", foe()); playSfx("bake_decay"); },
    again: () => { at("bakeAgain", me()); playSfx("bake_again"); },
    henshin: () => { at("bakeHenshin", me()); playSfx("bake_henshin"); look(true); },
    revert: () => { at("bakeRevert", me()); playSfx("bake_eject"); look(false); },
  };
  // เหมือนเกมจริง: งับครั้งที่ 3 → server ส่งคลิป (ครั้งแรก) หรือเสียง+เอฟเฟกต์ (ครั้งหลัง)
  const onFire = (form) => {
    if (form === "henshin") {
      if (!kenzo.henshinShown) setClip(true);
      else play.henshin();
      setKenzo({ rider: true, henshinShown: true });
      look(true);
    } else {
      play.revert();
      setKenzo((k) => ({ ...k, rider: false }));
    }
  };
  useEffect(() => {
    window.__kenzoFx = (k) => play[k] && play[k]();
    return () => { delete window.__kenzoFx; };
  });
  const labels = [["shot", "ยิง (คน)"], ["riderShot", "ยิง (ไรเดอร์)"], ["riderShot2", "ยิงซ้ำ"], ["corrode", "การกัดกิน"], ["decay", "ผุพัง"], ["again", "ได้ยิงอีกครั้ง"], ["henshin", "แปลงร่าง (ไม่มีคลิป)"], ["revert", "คืนร่าง"]];
  return (
    <>
      {clip && (
        <div onClick={() => setClip(false)} style={{ position: "fixed", inset: 0, zIndex: 70, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <video src="/characters/kenzo_suga/bake_henshin.mp4" autoPlay playsInline onEnded={() => setClip(false)} onError={() => setClip(false)} style={{ maxWidth: "100%", maxHeight: "100%" }} />
        </div>
      )}
      {gun && <BakeMagnum kenzo={kenzo} onFire={onFire} onClose={() => setGun(false)} />}
      <div style={{ position: "fixed", left: 12, bottom: 12, zIndex: 50, display: "flex", gap: 6, flexWrap: "wrap", maxWidth: 760 }}>
        <button style={{ ...btn, background: "rgba(140,30,40,.95)" }} onClick={() => setGun(true)}>Bake Magnum</button>
        <button style={btn} onClick={() => setKenzo({ rider: false, henshinShown: false })}>รีเซ็ตคลิป</button>
        {labels.map(([k, l]) => <button key={k} style={btn} onClick={() => play[k]()}>{l}</button>)}
      </div>
    </>
  );
}
