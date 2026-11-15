// เฉพาะ dev: หน้าดูกระดาน ?board=1&master=1 — ปุ่มเล่นเอฟเฟกต์ของ Master (masterFx.js · GRID_PLAN §7.34)
//  "me" = Master ตัว 2×2 (ภาพตัวเต็ม) · หันซ้าย (ทิศเดียวกับดาบในภาพ) · พื้นที่สกิลคิดด้วย boardRules.lineTiles เหมือนเกมจริง
//  คอนโซล: window.__masterFx(kind) = เล่นชุดเดียวกับปุ่ม
import { useEffect, useRef } from "react";
import * as Rules from "./boardRules";
import { MASTER_T, masterPose } from "./masterFx";
import { playSfx } from "../audio";

const CUR = { units: [] };
const btn = { font: "500 13px Kanit, sans-serif", color: "#fff", cursor: "pointer", padding: "4px 9px", border: "1px solid #7dff9a", background: "rgba(14,70,30,.95)" };
const IMG = { 1: "/characters/master/master.webp", 2: "/characters/master/master2.webp" };

export default function MasterFxDev({ units, setUnits, pushFx, setFocus, map, setShake }) {
  useEffect(() => { CUR.units = units; });
  // ตั้ง "me" เป็น Master 2×2 ครั้งแรก (ครั้งเดียว — setUnits ของหน้าพรีวิวเปลี่ยนตัวทุกเรนเดอร์)
  const inited = useRef(false);
  useEffect(() => {
    if (inited.current) return;
    inited.current = true;
    setUnits((us) => us.map((u) => (u.id === "me" ? { ...u, size: 2, standee: IMG[1], master: { phase: 1, down: false, summon: null } } : u)));
  });
  const me = () => { const u = CUR.units.find((x) => x.id === "me"); return { x: u.x, y: u.y, size: 2, phase: (u.master && u.master.phase) || 1 }; };
  const foes = () => CUR.units.filter((u) => u.id !== "me").map((u) => ({ x: u.x, y: u.y, size: u.size || 1 }));
  const shake = (...ms) => { for (const d of ms) setTimeout(() => setShake && setShake((n) => n + 1), d); };
  const base = () => { const a = me(); return { x: a.x, y: a.y, size: 2, phase: a.phase, by: "me" }; };
  const slam = (big) => {
    const a = me(), tiles = map ? Rules.lineTiles(map, a.x, a.y, "right", big ? 4 : 3, 1, 2, 0, false, big ? 3 : 2) : [];
    window.__masterLast = { me: a, tiles: tiles.length, map: !!map };
    const hit = MASTER_T.slam * 0.8;
    masterPose("me", "slam", "right", hit / 0.78);
    pushFx([{ kind: "masterSlam", ...base(), dir: "right", tiles, big }]);
    setTimeout(() => playSfx("master_swing"), hit * 0.62); setTimeout(() => { playSfx("master_stomp"); playSfx("master_wave"); }, hit); shake(hit, hit + 160, ...(big ? [hit + 330, hit + 520] : []));
    setFocus({ x: a.x + 3, y: a.y + 1 });
  };
  const knock = (wave) => {
    const a = me(), tiles = map ? Rules.lineTiles(map, a.x, a.y, "right", a.phase === 2 ? 6 : 4, 1, 2, 0, false, 0) : [];
    const T = wave ? MASTER_T.knock2 : MASTER_T.knock;
    masterPose("me", "sweep", "right", (T * 0.45) / 0.55);
    pushFx([{ kind: "masterKnock", ...base(), dir: "right", tiles, wave, dur: T + 700 }]);
    playSfx("master_slash"); shake(T * 0.5, T * 0.7);
    setFocus({ x: a.x + 3, y: a.y + 1 });
  };
  const smite = (bolt) => {
    const a = me(), T = bolt ? MASTER_T.smite2 : MASTER_T.smite;
    masterPose("me", "raise", null, T + 300);
    pushFx([{ kind: "masterSmite", ...base(), targets: foes(), bolt, dark: a.phase === 2, dur: T + 900 }]);
    playSfx("master_thunder"); shake(T * 0.72, T * 0.72 + 120, T * 0.72 + 300);
  };
  const setPhase = (ph) => setUnits((us) => us.map((u) => (u.id === "me" ? { ...u, standee: IMG[ph], master: { ...(u.master || {}), phase: ph, down: false } } : u)));
  const play = {
    land: () => { const a = me(), hit = MASTER_T.land * 0.42; masterPose("me", "land", null, MASTER_T.land); pushFx([{ kind: "masterLand", ...base() }]); playSfx("master_meteor"); setTimeout(() => playSfx("master_shockwave"), hit); shake(hit, hit + 140, hit + 320, hit + 560); setFocus(a); },
    slash: () => { const a = me(), f = foes()[0] || { x: a.x - 1, y: a.y }; pushFx([{ kind: a.phase === 2 ? "masterSlash2" : "masterSlash", x: a.x, y: a.y, size: 2, to: { x: f.x, y: f.y }, toSize: 1, by: "me" }]); playSfx("master_melee"); },
    slam: () => slam(false), slamBig: () => slam(true), knock: () => knock(0), knock2: () => { knock(0); setTimeout(() => knock(1), MASTER_T.knock + 100); },
    smite: () => smite(0), smite2: () => { smite(0); setTimeout(() => smite(1), MASTER_T.smite + 200); },
    summon: () => {
      const a = me(), ph = a.phase;
      const units = [{ id: "s1", at: { x: a.x - 1, y: a.y + 2 }, kind: ph === 2 ? "blessed" : "undead" }, { id: "s2", at: { x: a.x + 2, y: a.y + 2 }, kind: ph === 2 ? "blessed" : "undead" }, { id: "s3", at: { x: a.x + 2, y: a.y - 1 }, kind: ph === 2 ? "crusader" : "raider" }];
      masterPose("me", "roar", null, 1200);
      pushFx([{ kind: "masterSummon", ...base(), units }]); playSfx("master_roar"); setTimeout(() => playSfx("master_summon"), 150); shake(0, 180, 360);
    },
    down: () => { pushFx([{ kind: "masterDown", ...base() }]); setUnits((us) => us.map((u) => (u.id === "me" ? { ...u, master: { ...(u.master || {}), down: true } } : u))); },
    revive: () => { setPhase(2); masterPose("me", "revive", null, MASTER_T.revive); pushFx([{ kind: "masterRevive", ...base(), phase: 2 }]); playSfx("master_revive"); playSfx("master_choir"); setTimeout(() => playSfx("master_shockwave"), MASTER_T.revive * 0.45); shake(MASTER_T.revive * 0.45, MASTER_T.revive * 0.45 + 200); },
    death: () => { pushFx([{ kind: "masterDeath", ...base() }]); playSfx("master_death"); shake(800, 950, 1200); },
    p1: () => setPhase(1), p2: () => setPhase(2),
  };
  useEffect(() => {
    window.__masterFx = (k) => play[k] && play[k]();
    return () => { delete window.__masterFx; };
  });
  const labels = [["land", "ลงจากฟ้า"], ["slash", "ตีปกติ"], ["slam", "Twin Sword Slam"], ["slamBig", "Slam ครั้งที่ 3"], ["knock", "Knockdown"], ["knock2", "Knockdown ×2"], ["smite", "Smite"], ["smite2", "Smite ×2"], ["summon", "อัญเชิญ"], ["down", "ล้ม"], ["revive", "ฟื้น"], ["death", "ตาย"], ["p1", "เฟส 1"], ["p2", "เฟส 2"]];
  return (
    <div style={{ position: "fixed", left: 12, bottom: 12, zIndex: 50, display: "flex", gap: 6, flexWrap: "wrap", maxWidth: 820 }}>
      {labels.map(([k, l]) => <button key={k} style={btn} onClick={() => play[k]()}>{l}</button>)}
    </div>
  );
}
