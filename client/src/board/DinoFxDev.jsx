// เฉพาะ dev: หน้าดูกระดาน ?board=1&dino=1 — ปุ่มเล่นเอฟเฟกต์ของดิเอโก้ แบรนโด (อสูรกายดึกดำบรรพ์) (dinoFx.js)
//  "me" = ดิเอโก้ · เป้า = ตัวที่ใกล้สุด · ลำดับเหมือนเกมจริง: คลิปก่อน → ผลบนกระดาน (ท่าที่มีคลิปไม่มีเสียงเอฟเฟกต์ซ้อน)
//  คอนโซล: window.__dinoFx(kind) = เล่นชุดเดียวกับปุ่ม
import { useEffect, useRef, useState } from "react";
import { DINO_HIT_P, DINO_MS, DINO_T } from "./dinoFx";
import { playSfx } from "../audio";

const CUR = { units: [] };
const btn = { font: "500 13px Kanit, sans-serif", color: "#fff", cursor: "pointer", padding: "4px 9px", border: "1px solid #5fc8b9", background: "rgba(12,60,58,.95)" };
const DIR = "/characters/diego_dino";
const IMG = { half: `${DIR}/diego_half.webp`, full: `${DIR}/diego_full_form.webp` };
const CLIP = { swarm: `${DIR}/skill3_start.mp4`, swarmHit: `${DIR}/skill3_hit.mp4`, transform: `${DIR}/transform.mp4`, leap: `${DIR}/leap_bite.mp4`, stomp: `${DIR}/stomp.mp4` };

export default function DinoFxDev({ units, setUnits, pushFx, setFocus, setShake }) {
  useEffect(() => { CUR.units = units; });
  const [clip, setClip] = useState(null);
  const after = useRef(null);
  const endClip = () => { setClip(null); const f = after.current; after.current = null; if (f) f(); };
  const withClip = (src, fn) => { after.current = fn; setClip(src); };
  const me = () => { const u = CUR.units.find((x) => x.id === "me"); return { x: u.x, y: u.y }; };
  const foeU = () => {
    const m = me();
    return CUR.units.filter((u) => u.id !== "me").sort((a, b) => Math.abs(a.x - m.x) + Math.abs(a.y - m.y) - (Math.abs(b.x - m.x) + Math.abs(b.y - m.y)))[0] || null;
  };
  const foe = () => { const u = foeU(); return u ? { x: u.x, y: u.y } : { x: me().x + 2, y: me().y }; };
  const shake = (n = 1, gap = 120) => { if (!setShake) return; for (let i = 0; i < n; i++) setTimeout(() => setShake((k) => k + 1), i * gap); };
  const setMe = (fn) => setUnits((us) => us.map((u) => (u.id === "me" ? fn(u) : u)));
  const setFoe = (fn) => { const f = foeU(); if (f) setUnits((us) => us.map((u) => (u.id === f.id ? fn(u) : u))); };
  const form = () => { const u = CUR.units.find((x) => x.id === "me"); return (u && u.dino && u.dino.form) || "human"; };
  // ทิศจากตัวเราไปหาเป้า (แกนที่ห่างกว่า)
  const dirTo = () => { const a = me(), b = foe(); const dx = b.x - a.x, dy = b.y - a.y; return Math.abs(dx) >= Math.abs(dy) ? [Math.sign(dx) || 1, 0] : [0, Math.sign(dy) || 1]; };
  const infect = (n = 1) => {
    const b = foe();
    setFoe((u) => ({ ...u, dvirus: Math.min(3, (u.dvirus | 0) + n) }));
    pushFx([{ kind: "dinoVirus", x: b.x, y: b.y, n: 1 }]); playSfx("dino_virus");
  };
  useEffect(() => {
    setMe((u) => ({ ...u, standee: IMG.half, dino: { form: "human", frenzy: 0 }, diego: { mounted: false, horseHp: 5 } }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const play = {
    claw: () => {
      const a = me(), b = foe(), bite = form() === "dino";
      const kind = bite ? "dinoBite" : "dinoClaw";
      pushFx([{ kind, x: a.x, y: a.y, to: b, size: 1, toSize: 1 }]);
      setTimeout(() => { playSfx(bite ? "dino_bite" : "dino_claw"); infect(1); }, Math.round(DINO_MS[kind] * DINO_HIT_P[kind]));
      setFocus(b);
    },
    scorn: () => { const a = me(); pushFx([{ kind: "dinoScorn", x: a.x, y: a.y }]); playSfx("dino_crack"); setFocus(a); },
    possess: () => {
      const a = me(), b = foe();
      pushFx([{ kind: "dinoPossess", x: a.x, y: a.y, to: b }]); playSfx("dino_possess");
      setTimeout(() => setFoe((u) => ({ ...u, possessed: true, dvirus: 0 })), DINO_T.possess);
      setFocus(b);
    },
    release: () => { const b = foe(); pushFx([{ kind: "dinoRelease", x: b.x, y: b.y }]); setFoe((u) => ({ ...u, possessed: false })); },
    swarm: () => withClip(CLIP.swarm, () => {
      const a = me(), b = foe();
      pushFx([{ kind: "dinoSwarm", x: a.x, y: a.y, to: b, targetId: "x" }]);
      setTimeout(() => { pushFx([{ kind: "dinoPin", x: b.x, y: b.y }]); infect(1); }, DINO_T.swarm);
      setFocus(b);
    }),
    swarmHit: () => withClip(CLIP.swarmHit, () => { infect(1); shake(2); }),
    mutate: () => {
      if (form() === "dino") {
        const a = me();
        pushFx([{ kind: "dinoRevert", x: a.x, y: a.y }]); playSfx("dino_revert"); playSfx("dino_v_t02");
        setMe((u) => ({ ...u, standee: u.diego && u.diego.mounted ? null : IMG.half, dino: { ...u.dino, form: "human" } }));
        return;
      }
      withClip(CLIP.transform, () => {
        const a = me();
        pushFx([{ kind: "dinoTransform", x: a.x, y: a.y }]); shake();
        setMe((u) => ({ ...u, standee: IMG.full, dino: { form: "dino", frenzy: 4 }, diego: { ...(u.diego || {}), mounted: false } }));
      });
    },
    charge: () => {
      const a = me(), [vx, vy] = dirTo(), b = foe();
      const path = [a];
      for (let i = 1; i <= 4; i++) { const t = { x: a.x + vx * i, y: a.y + vy * i }; if (t.x === b.x && t.y === b.y) break; path.push(t); }
      pushFx([{ kind: "dinoCharge", x: a.x, y: a.y, path, hits: [{ at: b, dodge: false }] }]); playSfx("dino_charge"); playSfx("dino_v_d04");
      setTimeout(() => { playSfx("dino_slam"); shake(); infect(1); setFoe((u) => ({ ...u, x: u.x + vx * 2, y: u.y + vy * 2 })); }, DINO_T.charge * 0.45);
      setMe((u) => ({ ...u, x: path[path.length - 1].x, y: path[path.length - 1].y }));
      setFocus(b);
    },
    leap: () => withClip(CLIP.leap, () => {
      const a = me(), b = foe(), [vx, vy] = dirTo();
      const to = { x: b.x - vx, y: b.y - vy };
      pushFx([{ kind: "dinoLeap", x: b.x, y: b.y, from: a, to, at: b }]);
      setMe((u) => ({ ...u, x: to.x, y: to.y }));
      setTimeout(() => { pushFx([{ kind: "dinoDrain", x: b.x, y: b.y, to, n: 2 }]); playSfx("dino_drain"); infect(1); shake(); }, DINO_T.leap);
      setFocus(b);
    }),
    leapMiss: () => {
      const a = me(), [vx, vy] = dirTo(), to = { x: a.x + vx * 4, y: a.y + vy * 4 };
      pushFx([{ kind: "dinoLeap", x: a.x, y: a.y, from: a, to }]); playSfx("dino_leap");
      setMe((u) => ({ ...u, x: to.x, y: to.y }));
      setFocus(to);
    },
    stomp: () => withClip(CLIP.stomp, () => {
      const a = me(), b = foe(), to = { x: b.x, y: b.y - 2 };
      pushFx([{ kind: "dinoStomp", x: to.x, y: to.y, from: a, to }]);
      setMe((u) => ({ ...u, x: to.x, y: to.y }));
      setTimeout(() => {
        pushFx([{ kind: "dinoStompHit", x: to.x, y: to.y, radius: 4, hits: [{ at: b, dodge: false }] }, { kind: "dinoDrain", x: b.x, y: b.y, to, n: 2 }]);
        playSfx("dino_slam"); playSfx("dino_drain"); shake(3, 140); infect(1);
      }, DINO_T.stomp);
      setFocus(to);
    }),
    horse: () => setMe((u) => {
      const on = !(u.diego && u.diego.mounted);
      if (on && u.dino && u.dino.form === "dino") return u;
      return { ...u, standee: on ? null : IMG.half, diego: { mounted: on, horseHp: 5 } };
    }),
    frenzy: () => setMe((u) => ({ ...u, dino: { ...(u.dino || {}), frenzy: ((u.dino && u.dino.frenzy) | 0) >= 5 ? 0 : 5 } })),
    voice: () => { const k = ["h01", "h02", "h05", "h07", "h13", "h14", "d03", "d04"][Math.floor(Math.random() * 8)]; playSfx(`dino_v_${k}`); },
  };
  useEffect(() => {
    window.__dinoFx = (k) => play[k] && play[k]();
    // ช้าลง N เท่า (ดูท่ากระโจนทีละเฟรม): window.__dinoSlow("dinoBite", 8)
    window.__dinoSlow = (kind = "dinoBite", k = 8) => { const a = me(), b = foe(); pushFx([{ kind, x: a.x, y: a.y, to: b, size: 1, toSize: 1, dur: DINO_MS[kind] * k }]); };
    return () => { delete window.__dinoFx; delete window.__dinoSlow; };
  });
  const labels = [
    ["claw", "ตีปกติ"], ["scorn", "อย่ามาดูถูกกันนะ"], ["possess", "เข้าร่วมเผ่าพันธุ์"], ["release", "หลุดการควบคุม"], ["swarm", "ฉันจะฆ่าแก"], ["swarmHit", "ตีคนที่ถูกตรึง"],
    ["mutate", "การกลายพันธุ์"], ["charge", "ว๊ากกก"], ["leap", "อ๊ากกก"], ["leapMiss", "อ๊ากกก (พลาด)"], ["stomp", "ย่ำกระหม่อม"], ["horse", "ขึ้น/ลงม้า"], ["frenzy", "ความบ้าคลั่ง"], ["voice", "เสียงพากย์"],
  ];
  return (
    <>
    {clip && (
      <div onClick={endClip} style={{ position: "fixed", inset: 0, zIndex: 60, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
        <video src={clip} autoPlay playsInline onEnded={endClip} onError={endClip} style={{ maxWidth: "100%", maxHeight: "100%" }} />
      </div>
    )}
    <div style={{ position: "fixed", left: 12, bottom: 12, zIndex: 50, display: "flex", gap: 6, flexWrap: "wrap", maxWidth: 820 }}>
      {labels.map(([k, l]) => <button key={k} style={btn} onClick={() => play[k]()}>{l}</button>)}
    </div>
    </>
  );
}
