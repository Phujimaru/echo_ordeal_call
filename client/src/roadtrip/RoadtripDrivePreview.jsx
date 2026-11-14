// Road Trip — หน้าดูฉากขับ 3D แบบไม่ต่อ server (เฉพาะ dev · ?roadtrip=drive)
//  state.roadtrip จำลองที่เดินเอง: กม. วิ่ง · สิ่งกีดขวางโผล่ทุก ~2.5 วิ · ทางแยก/เหตุการณ์ตามรอบ · ภูมิภาคเปลี่ยนทุก 20 วิ · กลางคืนสลับทุก 30 วิ
//  คำสั่ง rt:* ถูกดักด้วย setRtEmitter (นั่ง/เลี้ยว/ไนตรัส/แตร ทำงานในเครื่อง) · ?fps=1 = ตัวเลข FPS
//  &combat=onvan|road = ดูฉากใต้กระดานตอนต่อสู้ (BoardCanvas จริง + createRoadUnderlay) · ปุ่ม "รอบ +1" = ถนนเลื่อน
//  &region=desert&night=1&lowq=1 · คอนโซล: __rtMock(obj) = ทับค่า state.roadtrip
import { useEffect, useMemo, useRef, useState } from "react";
import RoadtripScreen from "./RoadtripScreen";
import { setRtEmitter } from "./rtSocket";
import * as radio from "./radio";
import { handleFx } from "./rtAudio";
import { REGIONS } from "./road3d";
import BoardCanvas from "../board/BoardCanvas";
import { RT_DEFS } from "../board/roadtrip/maps.gen";
import { setRoadtripState } from "../board/roadtrip/theme";

const q = new URLSearchParams(location.search);
const MUIMI = "/characters/muimi/muimi.webp", OBERON = "/characters/oberon(summer)/oberon_summer.webp";
const K = (x, y) => `${x},${y}`;
const FORKS = [["gas", "fight", "event"], ["motel", "elite"], ["gas", "boss", "event"]];
const PLAYERS = [
  { id: "me", name: "มุยมิ", img: MUIMI, color: "#3B82C4", alive: true },
  { id: "p2", name: "โอเบรอน", img: OBERON, color: "#2E9E4B", alive: true },
];
const VAN0 = { hp: 30, hpMax: 30, fuel: 60, fuelMax: 60, kmh: 115, lane: 0, driverId: null, nitro: 1, style: "normal", paint: "#7fb8d8", plate: "กข 4567", decor: ["ธง", "ลูกโป่ง", "ป้ายหลังคา", "ไฟประดับนอก"], upg: { body: 1, engine: 1, tank: 1, susp: 1, nitro: 2, turret: 2, bumper: 1, storage: 1 }, rearOpen: false };

function boardOf(area, region) {
  const d = RT_DEFS[area], terrain = {}, special = {};
  for (const [kind, list] of Object.entries(d.terrain || {})) for (const [x, y] of list) terrain[K(x, y)] = kind;
  for (const [kind, list] of Object.entries(d.special || {})) for (const [x, y] of list) special[K(x, y)] = kind;
  return { area, cols: d.cols, rows: d.rows, terrain, special, flow: {}, heal: [], spawns: d.spawns.map(([x, y]) => ({ x, y })), shopSpots: [], rtRegion: region, vanTiles: d.vanTiles, vanBlock: d.vanBlock, driverTile: d.driverTile };
}

export default function RoadtripDrivePreview() {
  const combat = q.get("combat");
  const [lowQ, setLowQ] = useState(q.get("lowq") === "1");
  const [rt, setRt] = useState(() => ({
    phase: combat ? "combat" : "intro", endsAt: Date.now() + 6500, diff: "normal", km: 0,
    region: { id: REGIONS.includes(q.get("region")) ? q.get("region") : "plains", loop: 0 }, night: q.get("night") === "1",
    van: { ...VAN0 }, hazards: [], fork: null, event: null, stop: null,
    combat: combat ? { kind: combat === "road" ? "ambush" : "onvan", round: 1, rounds: 5, scroll: 2 } : null,
    radio: { src: "synth", station: 0, yt: null, by: null }, fx: [], summary: null,
  }));
  const rtRef = useRef(rt); rtRef.current = rt;
  const autoRef = useRef({ region: true, night: !q.has("night") });
  const seq = useRef(1);
  const fx = (k, extra = {}) => ({ k, key: `m${seq.current++}`, at: Date.now(), ...extra });

  // คำสั่ง rt:* → แก้ state จำลอง
  useEffect(() => {
    setRtEmitter((ev, data) => {
      setRt((r) => {
        const v = r.van;
        switch (ev) {
          case "rt:seat": return { ...r, van: { ...v, driverId: data && data.seat === "driver" ? "me" : null } };
          case "rt:steer": return v.driverId === "me" ? { ...r, van: { ...v, lane: Math.max(-1, Math.min(1, data.lane | 0)) } } : r;
          case "rt:nitro": return v.driverId === "me" && v.nitro > 0.2 ? { ...r, van: { ...v, nitro: Math.max(0, v.nitro - 0.4), boost: true }, fx: [...r.fx.slice(-15), fx("nitro")] } : r;
          case "rt:horn": return { ...r, fx: [...r.fx.slice(-15), fx("horn", { by: "me" })] };
          case "rt:radio": return { ...r, radio: { ...r.radio, ...data } };
          case "rt:vote": return r.fork ? { ...r, fork: { ...r.fork, votes: { ...r.fork.votes, me: data.i } } } : r;
          case "rt:event": return r.event ? { ...r, event: { ...r.event, votes: { ...r.event.votes, me: data.key } } } : r;
          case "rt:rear": return { ...r, van: { ...v, rearOpen: !v.rearOpen } };
          default: return r;
        }
      });
    });
    window.__rtMock = (o) => setRt((r) => ({ ...r, ...(o || {}) }));
    return () => { setRtEmitter(null); delete window.__rtMock; radio.stopAll && radio.stopAll(); };
  }, []);
  useEffect(() => { if (rt.van.boost) { const t = setTimeout(() => setRt((r) => ({ ...r, van: { ...r.van, boost: false } })), 1500); return () => clearTimeout(t); } return undefined; }, [rt.van.boost]);
  useEffect(() => { radio.sync(rt.radio, { active: rt.phase !== "combat", leader: true }); }, [rt.radio, rt.phase]);
  useEffect(() => { handleFx(rt); setRoadtripState(rt); }, [rt]);

  // ---- นาฬิกาจำลอง (250 ms แบบ server)
  useEffect(() => {
    if (combat) return undefined;
    const t0 = Date.now();
    const id = setInterval(() => {
      setRt((r) => {
        const now = Date.now(), el = (now - t0) / 1000;
        let n = { ...r, now, van: { ...r.van }, hazards: r.hazards.filter((h) => h.at > now - 1200) };
        const v = n.van;
        // ความเร็วตามเฟส · กม. (เร่ง ×12 ให้เห็นภูมิภาคเปลี่ยน)
        v.kmh = r.phase === "event" ? 55 : r.phase === "fork" ? 85 : [100, 115, 130, 150][v.upg.engine] * (v.fuel > 0 ? 1 : 0.2);
        n.km = r.km + v.kmh / 3600 * 0.25 * 12;
        v.fuel = Math.max(0, v.fuel - 0.02); v.nitro = Math.min(1, v.nitro + 0.01);
        // สิ่งกีดขวางชนรถ (ตอนถึง)
        for (const h of r.hazards) if (!h.done && h.at <= now) { h.done = true; if (h.lane === v.lane) { v.hp = Math.max(0, v.hp - (3 - v.upg.bumper)); n.fx = [...(n.fx || r.fx).slice(-15), fx("hit", { lane: h.lane })]; } }
        if ((r.phase === "drive" || r.phase === "intro") && Math.random() < 0.1 && n.hazards.length < 4) n.hazards = [...n.hazards, { id: `h${seq.current++}`, lane: [-1, 0, 1][Math.floor(Math.random() * 3)], at: now + 3000 }];
        // ไม่มีคนขับ = รถส่ายกลับเลนกลาง
        if (v.driverId == null && Math.random() < 0.02) v.lane = 0;
        // ภูมิภาค/กลางคืน
        if (autoRef.current.region) { const ri = Math.floor(el / 20) % REGIONS.length; if (REGIONS[ri] !== r.region.id) n.region = { id: REGIONS[ri], loop: Math.floor(el / 100) }; }
        if (autoRef.current.night) { const nt = Math.floor(el / 30) % 2 === 1; if (nt !== r.night) n.night = nt; }
        // เฟส
        if (r.endsAt && now >= r.endsAt) {
          if (r.phase === "intro" || (r.phase === "drive" && r.next !== "event")) {
            const opts = FORKS[Math.floor(Math.random() * FORKS.length)];
            n = { ...n, phase: "fork", endsAt: now + 15000, fork: { options: opts.map((kind) => ({ kind })), votes: { p2: 0 } }, hazards: [] };
            if (r.phase === "intro") n = { ...n, phase: "drive", endsAt: now + 20000, fork: null, next: "fork" };
          } else if (r.phase === "drive") {
            n = { ...n, phase: "event", endsAt: now + 10000, next: null, event: { id: `e${seq.current++}`, kind: "cows", choices: [{ key: "wait", label: "รอ", cost: 0 }, { key: "honk", label: "บีบแตร", cost: 0 }], votes: {} } };
          } else {
            n = { ...n, phase: "drive", endsAt: now + 20000, fork: null, event: null, next: r.phase === "fork" ? "event" : null };
          }
        }
        return n;
      });
    }, 250);
    return () => clearInterval(id);
  }, [combat]);

  const state = useMemo(() => ({ gameMode: "roadtrip", world: "roadtrip", youId: "me", players: PLAYERS, roadtrip: rt }), [rt]);
  const btn = (on) => ({ padding: "4px 9px", border: "1px solid rgba(255,255,255,.2)", borderRadius: 7, background: on ? "#ff8a3d" : "rgba(20,26,36,.75)", color: "#fff", cursor: "pointer", font: "600 12px Kanit, sans-serif" });
  const bar = (
    <div style={{ position: "fixed", left: 10, bottom: 92, zIndex: 50, display: "flex", flexWrap: "wrap", gap: 4, maxWidth: 520 }}>
      {REGIONS.map((id) => <button key={id} type="button" style={btn(rt.region.id === id)} onClick={() => { autoRef.current.region = false; setRt((r) => ({ ...r, region: { id, loop: 0 } })); }}>{id}</button>)}
      <button type="button" style={btn(rt.night)} onClick={() => { autoRef.current.night = false; setRt((r) => ({ ...r, night: !r.night })); }}>☾</button>
      <button type="button" style={btn(lowQ)} onClick={() => setLowQ((v) => !v)}>lowQ</button>
      {["normal", "goofy", "cool"].map((s) => <button key={s} type="button" style={btn(rt.van.style === s)} onClick={() => setRt((r) => ({ ...r, van: { ...r.van, style: s } }))}>{s}</button>)}
      {combat && <button type="button" style={btn(false)} onClick={() => setRt((r) => ({ ...r, combat: { ...r.combat, round: r.combat.round + 1 }, fx: [...r.fx.slice(-15), fx("turret", { x: 3, y: 2 })] }))}>รอบ +1</button>}
      {combat && <button type="button" style={btn(rt.van.rearOpen)} onClick={() => setRt((r) => ({ ...r, van: { ...r.van, rearOpen: !r.van.rearOpen } }))}>rear</button>}
    </div>
  );

  if (combat) return <CombatPreview rt={rt} lowQ={lowQ} bar={bar} area={combat === "road" ? 70 : 71} />;
  return (
    <div style={{ position: "fixed", inset: 0, background: "#0b1018" }}>
      <RoadtripScreen state={state} lowQ={lowQ} />
      {bar}
    </div>
  );
}

// ฉากใต้กระดานตอนต่อสู้ (BoardCanvas จริง + ตัวละคร/มอนจำลอง)
function CombatPreview({ rt, lowQ, bar, area }) {
  const [zoom, setZoom] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [view, setView] = useState("tilt");
  const [focus, setFocus] = useState(null);
  const map = useMemo(() => boardOf(area, rt.region.id), [area, rt.region.id]);
  const d = RT_DEFS[area];
  const units = useMemo(() => {
    const sp = d.spawns;
    const out = [
      { id: "me", name: "มุยมิ", img: MUIMI, color: "#3B82C4", x: sp[0][0], y: sp[0][1], hp: 6, maxHp: 7, armor: 2, maxArmor: 3, isMe: true },
      { id: "p2", name: "โอเบรอน", img: OBERON, color: "#2E9E4B", x: sp[1][0], y: sp[1][1], hp: 7, maxHp: 7, armor: 3, maxArmor: 3, ally: true },
    ];
    const mobs = [["stray", 2, 3], ["biker", 17, 7], ["crow", 3, 8], ["giant", 18, 2]];
    mobs.forEach(([t, x, y], i) => out.push({ id: `mob${i}`, name: t, img: `/roadtrip/mobs/${t}.webp`, color: "#c0392b", x, y, hp: 5, maxHp: 6, armor: 0, maxArmor: 0, summon: { kind: "rtMob", look: null }, face: { x: x < 10 ? 1 : -1, y: 0 } }));
    return out;
  }, [d]);
  const hl = useMemo(() => { const me = units[0], mv = []; for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) if (Math.abs(dx) + Math.abs(dy) <= 2 && (dx || dy)) mv.push(K(me.x + dx, me.y + dy)); return { move: mv }; }, [units]);
  useEffect(() => {
    const on = (e) => { if (e.key === "q" || e.key === "Q") setRotation((r) => (r + 3) % 4); if (e.key === "e" || e.key === "E") setRotation((r) => (r + 1) % 4); };
    window.addEventListener("keydown", on); return () => window.removeEventListener("keydown", on);
  }, []);
  const btn = (on) => ({ padding: "4px 9px", border: "1px solid rgba(255,255,255,.2)", borderRadius: 7, background: on ? "#ff8a3d" : "rgba(20,26,36,.75)", color: "#fff", cursor: "pointer", font: "600 12px Kanit, sans-serif" });
  return (
    <div style={{ position: "fixed", inset: 0, background: "#0b1018" }}>
      <BoardCanvas map={map} units={units} highlights={hl} rotation={rotation} zoom={zoom} view={view} onZoomChange={setZoom} night={rt.night} lowQ={lowQ}
        fx={[]} focus={focus} roadtrip={rt} onTileClick={(x, y) => setFocus({ x, y })} />
      <div style={{ position: "fixed", right: 10, top: 10, display: "flex", gap: 4, zIndex: 50 }}>
        <button type="button" style={btn(false)} onClick={() => setRotation((r) => (r + 3) % 4)}>⟲</button>
        <button type="button" style={btn(false)} onClick={() => setRotation((r) => (r + 1) % 4)}>⟳</button>
        <button type="button" style={btn(false)} disabled={zoom <= 0} onClick={() => setZoom((z) => Math.max(0, z - 1))}>－</button>
        <span style={{ color: "#fff", font: "600 12px Kanit", padding: "4px 2px" }}>{zoom}</span>
        <button type="button" style={btn(false)} disabled={zoom >= 4} onClick={() => setZoom((z) => Math.min(4, z + 1))}>＋</button>
        <button type="button" style={btn(view === "top")} onClick={() => setView((v) => (v === "top" ? "tilt" : "top"))}>▦</button>
      </div>
      {bar}
    </div>
  );
}
