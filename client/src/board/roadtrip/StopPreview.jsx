// หน้าดูกระดานโหมด Road Trip (เฉพาะ dev): ?roadtrip=stop — ดู main.jsx
//  วาดด้วย BoardCanvas จริง + state จำลอง: แผนที่ area 70–75 (ถนน · บนรถตู้ · ปั๊ม A/B/C · โมเต็ล) × ภูมิภาค 5 แบบ × กลางวัน/กลางคืน
//  ?area=72&region=desert&night=1&rot=0..3&mobs=1 · คลิกช่อง = เดิน (รอยเท้า) · คลิกวัตถุ = เดินไปช่องเล่นแล้วเล่นท่าตอบสนอง
//  คอนโซล: window.__rtPoke(id) = เล่นท่าของวัตถุ id · window.__rtState(obj) = ทับ state.roadtrip จำลอง (van.paint/plate/style/rearOpen …)
import { useEffect, useMemo, useState } from "react";
import BoardCanvas from "../BoardCanvas";
import { RT_DEFS } from "./maps.gen";
import { REGIONS, setRoadtripState } from "./theme";
import { rtPoke } from "./props";
import { RT_MOB_TYPES } from "./mobArt";

const AREAS = [[70, "ถนน"], [71, "บนรถตู้"], [72, "ปั๊ม A"], [73, "ปั๊ม B"], [74, "ปั๊ม C"], [75, "โรงแรม"]];
const REGION_TH = { plains: "ทุ่งหญ้า", desert: "ทะเลทราย", forest: "ป่าสน", snow: "ทุ่งหิมะ", ghost: "เมืองร้าง" };
const MOB_TH = { stray: "หมาจรจัด", crow: "อีกาเหล็ก", biker: "แก๊งมอเตอร์ไซค์", trucker: "ซอมบี้รถบรรทุก", giant: "ยักษ์ขวางถนน", cactus: "กระบองเพชรเดินได้", boar: "หมูป่า", yeti: "มนุษย์หิมะ", ghost: "ผีโบกรถ", saberclaw: "เสือเขี้ยวดาบ", devilTruck: "แม็กซ์ เวอร์สแตปเพน", darkKnight: "อัศวินเงามรณะ", jormungand: "จอร์มุนกันด์" };
const PAINTS = ["#7fb8d8", "#ff8a3d", "#3fae7a", "#d9534f", "#a26bff", "#f2c84b"];
const MUIMI = "/characters/muimi/muimi.webp", OBERON = "/characters/oberon(summer)/oberon_summer.webp";
const q = new URLSearchParams(location.search);
const K = (x, y) => `${x},${y}`;

// def (server/roadtrip/maps.js) → state.board จำลอง (รูปเดียวกับ server/view.js boardPublic)
function boardOf(area, region) {
  const d = RT_DEFS[area], terrain = {}, special = {};
  for (const [kind, list] of Object.entries(d.terrain)) for (const [x, y] of list) terrain[K(x, y)] = kind;
  for (const [kind, list] of Object.entries(d.special || {})) for (const [x, y] of list) special[K(x, y)] = kind;
  return { area, cols: d.cols, rows: d.rows, terrain, special, flow: {}, heal: [], spawns: d.spawns.map(([x, y]) => ({ x, y })), shopSpots: (d.shopSpots || []).map(([x, y]) => ({ x, y })), rtRegion: region };
}
function bfs(d, block, from, to) {
  const prev = new Map([[K(from.x, from.y), null]]), qq = [[from.x, from.y]];
  while (qq.length) {
    const [x, y] = qq.shift();
    if (x === to.x && y === to.y) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = K(nx, ny);
      if (nx < 0 || ny < 0 || nx >= d.cols || ny >= d.rows || prev.has(k) || block.has(k)) continue;
      prev.set(k, [x, y]); qq.push([nx, ny]);
    }
  }
  if (!prev.has(K(to.x, to.y))) return null;
  const out = [];
  for (let c = [to.x, to.y]; c; c = prev.get(K(c[0], c[1]))) out.unshift({ x: c[0], y: c[1] });
  return out;
}

export default function StopPreview() {
  const [area, setArea] = useState(Number(q.get("area")) || 72);
  const [region, setRegion] = useState(REGIONS.includes(q.get("region")) ? q.get("region") : "plains");
  const [night, setNight] = useState(q.get("night") === "1");
  const [rotation, setRotation] = useState(Number(q.get("rot")) || 0);
  const [zoom, setZoom] = useState(0);
  const [mobs, setMobs] = useState(q.has("mobs") ? q.get("mobs") === "1" : null);
  const [lowQ, setLowQ] = useState(false);
  const [paint, setPaint] = useState(0);
  const [rear, setRear] = useState(false);
  const [me, setMe] = useState(null);
  const [anim, setAnim] = useState(null);
  const [fx, setFx] = useState([]);
  const [seq, setSeq] = useState(1);
  const [hover, setHover] = useState(null);
  const [extra, setExtra] = useState({});
  const d = RT_DEFS[area];
  const map = useMemo(() => boardOf(area, region), [area, region]);
  const showMobs = mobs == null ? area === 70 || area === 71 : mobs;

  // state.roadtrip จำลอง → ตัววาด (theme.setRoadtripState)
  useEffect(() => {
    setRoadtripState({ phase: area <= 71 ? "combat" : "stop", region: { id: region, loop: 0 }, night, fx, van: { paint: PAINTS[paint], plate: "ECHO 88", style: "normal", rearOpen: rear }, stop: { acts: {} }, ...extra });
  }, [area, region, night, fx, paint, rear, extra]);
  useEffect(() => { setMe(null); setAnim(null); }, [area]);
  useEffect(() => {
    window.__rtPoke = (id) => rtPoke(id);
    window.__rtState = (o) => setExtra(o || {});
    return () => { delete window.__rtPoke; delete window.__rtState; };
  }, []);

  const block = useMemo(() => { const s = new Set(); for (const [, list] of Object.entries(d.terrain)) for (const [x, y] of list) s.add(K(x, y)); for (const [x, y] of d.shopSpots || []) s.add(K(x, y)); return s; }, [d]);
  const start = me || { x: d.spawns[0][0], y: d.spawns[0][1] };
  const units = useMemo(() => {
    const out = [
      { id: "me", name: "มุยมิ", img: MUIMI, color: "#3B82C4", x: start.x, y: start.y, hp: 6, maxHp: 7, armor: 2, maxArmor: 3, isMe: true },
      { id: "p2", name: "โอเบรอน", img: OBERON, color: "#2E9E4B", x: d.spawns[1][0], y: d.spawns[1][1], hp: 7, maxHp: 7, armor: 3, maxArmor: 3, ally: true },
      { id: "p3", name: "มุยมิ 2", img: MUIMI, color: "#9B4F96", x: d.spawns[2][0], y: d.spawns[2][1], hp: 4, maxHp: 7, armor: 1, maxArmor: 3, ally: true },
    ];
    if (showMobs) {
      // วางมอน 10 แบบบนช่องว่าง (ถนน = สองฝั่งรถ · ที่อื่น = เรียงแถวล่าง)
      const used = new Set(out.map((u) => K(u.x, u.y))), free = [];
      for (let y = 0; y < d.rows; y++) for (let x = 0; x < d.cols; x++) { const k = K(x, y); if (!block.has(k) && !used.has(k) && !(d.special && d.special.van && d.special.van.some(([a, b]) => a === x && b === y))) free.push([x, y]); }
      const pick = free.filter(([x, y]) => (x % 3 === 1) && (y % 2 === 0) && (x < 6 || x > d.cols - 7));
      RT_MOB_TYPES.forEach((t, i) => {
        const at = pick[(i * 3) % Math.max(1, pick.length)] || free[i];
        if (!at) return;
        const boss = t === "devilTruck";
        out.push({ id: `mob${i}`, name: MOB_TH[t], img: `/roadtrip/mobs/${t}.webp`, color: "#c0392b", x: at[0], y: at[1], hp: boss ? 30 : 4 + i, maxHp: boss ? 30 : 6 + i, armor: i % 3, maxArmor: i % 3, summon: { kind: "rtMob", look: null }, face: { x: at[0] < d.cols / 2 ? 1 : -1, y: 0 } });
      });
    }
    return out;
  }, [d, start.x, start.y, showMobs, block]);

  const propAt = (x, y) => (d.props || []).find((p) => !p.walk && x >= p.x0 && x <= p.x1 && y >= p.y0 && y <= p.y1);
  const walkTo = (to, after) => {
    const path = bfs(d, block, start, to);
    if (!path) return;
    if (path.length > 1) {
      setAnim({ kind: "move", id: "me", path, stepMs: 110 });
      setFx((f) => [...f.slice(-20), { k: "walk", key: seq, id: "me", path: path.map((t) => ({ x: t.x, y: t.y })) }]);
      setSeq((s) => s + 1);
    }
    setMe(to);
    if (after) setTimeout(after, Math.max(0, path.length - 1) * 110 + 60);
  };
  const onTileClick = (x, y) => {
    const p = propAt(x, y);
    if (p) { if (p.spot) walkTo({ x: p.spot[0], y: p.spot[1] }, () => { setFx((f) => [...f.slice(-20), { k: "act", key: seq + 1000, id: "me", obj: p.id, kind: p.kind }]); setSeq((s) => s + 1); }); else rtPoke(p.id); return; }
    if (block.has(K(x, y))) return;
    walkTo({ x, y });
  };
  const btn = (on) => ({ padding: "4px 10px", border: "1px solid rgba(31,42,51,.18)", borderRadius: 8, background: on ? "#ff8a3d" : "#fff", color: on ? "#fff" : "#1f2a33", cursor: "pointer", font: "600 13px Kanit, sans-serif" });
  const hovered = hover && propAt(hover.x, hover.y);
  return (
    <div style={{ position: "fixed", inset: 0, background: night ? "#0d1830" : "#dfeaf6", fontFamily: "Kanit, sans-serif" }}>
      <BoardCanvas
        map={map}
        units={units}
        highlights={hover && !block.has(K(hover.x, hover.y)) ? { move: [K(hover.x, hover.y)] } : null}
        shops={(d.shopSpots || []).map(([x, y], i) => ({ id: `s${i}`, kind: (d.shopKinds || [])[i] || "apoth", x, y, w: 1, h: 1, turnsLeft: 0 }))}
        rotation={rotation}
        zoom={zoom}
        onZoomChange={setZoom}
        night={night}
        lowQ={lowQ}
        anim={anim}
        onAnimDone={() => setAnim(null)}
        fx={[]}
        onTileClick={onTileClick}
        onUnitClick={(id) => { const u = units.find((v) => v.id === id); if (u) onTileClick(u.x, u.y); }}
        onHoverTile={(x, y) => setHover(x == null ? null : { x, y })}
      />
      <div style={{ position: "absolute", top: 12, left: 12, right: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
        {AREAS.map(([a, n]) => <button key={a} style={btn(a === area)} onClick={() => setArea(a)}>{n}</button>)}
        <span style={{ width: 10 }} />
        {REGIONS.map((r) => <button key={r} style={btn(r === region)} onClick={() => setRegion(r)}>{REGION_TH[r]}</button>)}
        <span style={{ width: 10 }} />
        <button style={btn(night)} onClick={() => setNight(!night)}>🌙</button>
        <button style={btn(false)} onClick={() => setRotation((r) => (r + 3) % 4)}>⟲</button>
        <button style={btn(false)} onClick={() => setRotation((r) => (r + 1) % 4)}>⟳</button>
        <button style={btn(showMobs)} onClick={() => setMobs(!showMobs)}>👾</button>
        <button style={btn(false)} onClick={() => (d.props || []).forEach((p) => rtPoke(p.id))}>▶</button>
        <button style={{ ...btn(false), background: PAINTS[paint] }} onClick={() => setPaint((p) => (p + 1) % PAINTS.length)}>🚐</button>
        {area === 71 ? <button style={btn(rear)} onClick={() => setRear(!rear)}>🚪</button> : null}
        <button style={btn(lowQ)} onClick={() => setLowQ(!lowQ)}>lowQ</button>
      </div>
      <div style={{ position: "absolute", left: 12, bottom: 12, padding: "6px 12px", color: "#fff", background: "rgba(22,36,64,.9)", borderRadius: 8, font: "400 13px Kanit, sans-serif" }}>
        {area} · {d.name} · {d.cols}×{d.rows}{hover ? ` · (${hover.x}, ${hover.y})${hovered ? ` ${hovered.kind}` : ""}` : ""}
      </div>
    </div>
  );
}
