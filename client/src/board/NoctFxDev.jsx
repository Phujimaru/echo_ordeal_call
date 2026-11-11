// เฉพาะ dev: หน้าดูกระดาน ?board=1&noctis=1 (+ &zoom=2 = มองจากด้านบน) — ปุ่มเล่นเอฟเฟกต์ของน็อคทิส (noctFx.js) โดยไม่ต้องเปิดห้องจริง
//  มุยมิ (me) กลายเป็นน็อคทิส · ตีปกติ 14 อาวุธ + Armiger ไปหาศัตรูใกล้สุด (เสียง noct_atk_* ตรงจังหวะปะทะ) · เหตุการณ์ของ socket "noctFx"
//  ของค้าง (prop noctis): อาวุธที่ถือ · ปลดปล่อย (Armiger) · ขานรับ · หลบจาก Warp Point
//  คอนโซล: window.__noctFx({ kind: "ruin", dir: "right", tiles }) = ส่ง payload ของ socket "noctFx" ตรงๆ
import { useEffect } from "react";
import { NOCT_EVENT_FX, preloadNoct } from "./noctFx";
import { STYLE_HIT } from "./boardDraw";
import { playSfx } from "../audio";

const IMG = "/characters/noctis/noctis.webp";
const ARMS = ["wise", "axe", "bow", "wanderer", "mystic", "star", "tall", "shield", "mace", "scepter", "trident", "katana", "father", "engine"];
function noctUnits(list) {
  return list.map((u) => (u.id === "me" ? { ...u, x: 5, y: 7, name: "น็อคทิส ลูซิส เคลัม", img: IMG, color: "#3b5bd9", hp: 8, maxHp: 8, armor: 2, maxArmor: 2, tag: null } : u));
}
const CUR = { units: [] };
const DIR4 = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const btn = (on) => ({ font: "500 13px Kanit, sans-serif", color: "#fff", cursor: "pointer", padding: "4px 9px", border: `1px solid ${on ? "#ffd36a" : "rgba(95,227,255,.6)"}`, background: on ? "rgba(40,60,140,.95)" : "rgba(18,24,34,.94)" });

export default function NoctFxDev({ units, setUnits, pushFx, setFocus, map, nd, setNd }) {
  useEffect(() => { CUR.units = units; });
  useEffect(() => { preloadNoct(); }, []);
  const get = (id) => CUR.units.find((u) => u.id === id);
  const inB = (x, y) => x >= 0 && y >= 0 && x < map.cols && y < map.rows;
  const T = () => get("me");
  const me = () => { const d = T(); return { x: d.x, y: d.y }; };
  const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  const foes = () => { const d = T(); return CUR.units.filter((u) => u.id !== "me").sort((a, b) => dist(a, d) - dist(b, d)); };
  const dirTo = (f) => { const d = T(), dx = f.x - d.x, dy = f.y - d.y; return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up"; };
  const line = (dir, len, width) => {
    const d = T(), [vx, vy] = DIR4[dir], out = [], h = Math.floor(width / 2);
    for (let k = 1; k <= len; k++) for (let w = -h; w <= h; w++) {
      const x = vx ? d.x + vx * k : d.x + w, y = vy ? d.y + vy * k : d.y + w;
      if (inB(x, y)) out.push({ x, y });
    }
    return out;
  };
  const ev = (e) => {
    const kind = NOCT_EVENT_FX[e.kind];
    if (!kind) return;
    const at = e.at || me();
    pushFx([{ id: "me", size: 1, ...e, kind, x: at.x, y: at.y }]);
  };
  useEffect(() => { window.__noctFx = (e) => ev(e); return () => { delete window.__noctFx; }; });
  const floatHit = (u, text = "-2") => pushFx([{ kind: "float", x: u.x, y: u.y, text, size: 30, z: 1.5 }]);
  const attack = (w) => {
    const d = T(), f = foes()[0];
    if (!f) return;
    const style = `noct_${w}`;
    if (w !== "armiger") setNd((s) => ({ ...s, weapon: w }));
    pushFx([{ kind: style, x: d.x, y: d.y, size: 1, to: { x: f.x, y: f.y }, toSize: f.size || 1, color: "#3b5bd9", by: "me" }]);
    setFocus({ x: f.x, y: f.y });
    setTimeout(() => { playSfx(w === "armiger" ? "noct_atk_tall" : `noct_atk_${w}`); floatHit(f); }, STYLE_HIT[style] || 400);
  };
  const warpStrike = () => {
    const f = foes()[0];
    if (!f) return;
    const d = me(), dir = dirTo(f), [vx, vy] = DIR4[dir];
    const land = { x: f.x - vx, y: f.y - vy };
    ev({ kind: "throw", dir, to: { x: f.x, y: f.y }, weapon: nd.weapon });
    playSfx("noct_throw");
    setTimeout(() => {
      ev({ kind: "warp", from: d, to: land });
      playSfx("noct_warp");
      setUnits((list) => list.map((u) => (u.id === "me" ? { ...u, x: land.x, y: land.y } : u)));
      setFocus(land);
    }, 400);
    setTimeout(() => attack(nd.unleash ? "armiger" : nd.weapon), 950);
  };
  const point = () => {
    const d = me(), to = { x: d.x, y: Math.max(0, d.y - 3) };
    ev({ kind: "point", from: d, to });
    playSfx("noct_point");
    setUnits((list) => list.map((u) => (u.id === "me" ? { ...u, x: to.x, y: to.y } : u)));
    setNd((s) => ({ ...s, dodge: true }));
  };
  const ruin = () => {
    const f = foes()[0], dir = f ? dirTo(f) : "right";
    setNd((s) => ({ ...s, unleash: true }));
    ev({ kind: "ruin", dir, tiles: line(dir, 6, 3) });
    playSfx("noct_ruin");
  };
  const ruinEos = () => {
    setNd((s) => ({ ...s, unleash: true }));
    ev({ kind: "ruinEos", spots: foes().slice(0, 3).map((u) => ({ x: u.x, y: u.y })) });
    playSfx("noct_ruin");
  };
  const endIt = () => {
    const f = foes()[0];
    if (!f) return;
    ev({ kind: "end", to: { x: f.x, y: f.y } });
    playSfx("noct_end");
    setFocus({ x: f.x, y: f.y });
  };
  const rows = [
    ARMS.slice(0, 7).map((w) => [w, () => attack(w), nd.weapon === w]),
    [...ARMS.slice(7).map((w) => [w, () => attack(w), nd.weapon === w]), ["Armiger ตี", () => attack("armiger")]],
    [["Warp Strike", warpStrike], ["Warp Point", point], ["เรียกอาวุธ", () => { ev({ kind: "arm", weapon: nd.weapon }); playSfx("noct_arm"); }], ["ขานรับ", () => { setNd((s) => ({ ...s, heed: !s.heed })); ev({ kind: "heed" }); playSfx("noct_heed"); }, nd.heed]],
    [[`ปลดปล่อย ${nd.unleash ? "✓" : "✗"}`, () => setNd((s) => ({ ...s, unleash: !s.unleash })), nd.unleash], ["ทำลายให้สิ้น", ruin], ["ทำลายให้สิ้น (Eos)", ruinEos], ["ให้มันจบตรงนี้แหละ", endIt], [`หลบ ${nd.dodge ? "✓" : "✗"}`, () => setNd((s) => ({ ...s, dodge: !s.dodge })), nd.dodge]],
  ];
  return (
    <div style={{ position: "absolute", right: 12, bottom: 12, display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", maxWidth: 900 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {r.map(([label, fn, on]) => <button key={label} style={btn(!!on)} onClick={fn}>{label}</button>)}
        </div>
      ))}
    </div>
  );
}
NoctFxDev.units = noctUnits;
