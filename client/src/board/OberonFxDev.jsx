// เฉพาะ dev: หน้าดูกระดาน ?board=1&oberon=1&area=90 — โอเบรอน (วอร์ติเกิร์น) (oberonFx.js + oberonTheme.js)
//  area=90 = สนามกลืนกิน 10×10 (สนธยายามค่ำคืน) · ไม่ใส่ = กระดานภูมิภาคเดิม
//  คอนโซล: window.__obvFx(kind) = scythe / charge / molt / swallow / release / scytheOn / scrap / lie / rot / twilight / vesperDie
import { useEffect } from "react";
import { OBV_FX_DUR, OBV_MS } from "./oberonFx";

const CUR = { units: [] };
const btn = { font: "500 13px Kanit, sans-serif", color: "#fff", cursor: "pointer", padding: "4px 9px", border: "1px solid #ff5a4a", background: "rgba(70,8,16,.95)" };
const IMG = "/characters/oberon_vortigern/oberon_vortigern.webp";

export default function OberonFxDev({ units, setUnits, pushFx, setFocus }) {
  useEffect(() => { CUR.units = units; });
  const me = () => { const u = CUR.units.find((x) => x.id === "me"); return { x: u.x, y: u.y }; };
  const foes = () => CUR.units.filter((u) => u.id !== "me");
  const foe = () => {
    const m = me();
    const list = foes().sort((a, b) => Math.abs(a.x - m.x) + Math.abs(a.y - m.y) - (Math.abs(b.x - m.x) + Math.abs(b.y - m.y)));
    return list[0] ? { x: list[0].x, y: list[0].y } : { x: m.x + 2, y: m.y };
  };
  const slow = () => window.__obvSlow || 1; // คอนโซล: window.__obvSlow = 4 = เล่นช้า 4 เท่า (ไว้ดูทีละเฟรม)
  const at = (kind, p, extra = {}) => { pushFx([{ kind, x: p.x, y: p.y, size: 1, dur: OBV_FX_DUR[kind] * slow(), ...extra }]); setFocus(p); };
  const shake = (amp, dur) => pushFx([{ kind: "iceShake", x: 0, y: 0, amp, dur }]);
  const setVesper = (mounted, hp = 5) => setUnits((us) => us.map((u) => (u.id === "me" ? { ...u, obv: { mounted, vesperHp: hp } } : u)));
  const strike = (kind) => { const a = me(), b = foe(); pushFx([{ kind, x: a.x, y: a.y, to: b, size: 1, toSize: 1, dur: OBV_MS[kind] * slow() }]); setFocus(b); };
  const play = {
    scythe: () => strike("obvScythe"),
    charge: () => strike("obvCharge"),
    molt: () => at("obvMolt", me()),
    swallow: () => { at("obvSwallow", me()); shake(7, 1100); },
    release: () => at("obvRelease", me()),
    scytheOn: () => at("obvScytheOn", me()),
    scrap: () => at("obvScrap", me(), { n: 3 }),
    lie: () => { at("obvLie", me(), { hits: foes().map((u, i) => ({ id: u.id, at: { x: u.x, y: u.y }, size: 1, dmg: 2, sleep: i % 2 ? 0 : 3, dodge: i === 2 })) }); shake(9, 1400); },
    rot: () => at("obvRot", me(), { targets: foes().map((u) => ({ id: u.id, at: { x: u.x, y: u.y }, size: 1 })) }),
    twilight: () => at("obvTwilight", me()),
    vesperOn: () => setVesper(true),
    vesperOff: () => setVesper(false),
    vesperDie: () => { setVesper(false, 0); at("obvVesper", me(), { mode: "die" }); },
  };
  useEffect(() => {
    window.__obvFx = (k) => play[k] && play[k]();
    return () => { delete window.__obvFx; };
  });
  const labels = [["scythe", "เคียว"], ["charge", "Vesper ชน"], ["molt", "ลอกคราบ"], ["swallow", "กลืน"], ["release", "คาย"], ["scytheOn", "เปิดเคียว"], ["scrap", "เศษขยะ"], ["lie", "Lie Like Vortigern"], ["rot", "เน่าเปื่อย"], ["twilight", "สนธยา"], ["vesperOn", "ขี่"], ["vesperOff", "ลง"], ["vesperDie", "Vesper ตาย"]];
  return (
    <div style={{ position: "fixed", left: 12, bottom: 12, zIndex: 50, display: "flex", gap: 6, flexWrap: "wrap", maxWidth: 760 }}>
      {labels.map(([k, l]) => <button key={k} style={btn} onClick={() => play[k]()}>{l}</button>)}
    </div>
  );
}
OberonFxDev.units = (base) => base.map((u) => (u.id === "me" ? { ...u, name: "โอเบรอน (วอร์ติเกิร์น)", img: IMG, color: "#b3122a", obv: { mounted: true, vesperHp: 5 } } : u));
