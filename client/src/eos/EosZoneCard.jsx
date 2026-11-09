// ============================================================
//  ป้ายเข้าพื้นที่ของสนาม Eos (GRID_PLAN §8.6) — ตัวเราเดินเข้าโซนใหม่ (server/fodlan/map6.js ZONES · eosZoneAt)
//  <EosZoneCard state={state} />  (Game.jsx — เฉพาะ state.world === "eos")
//   เข้าโซนครั้งแรกของแมตช์ = ป้ายเต็ม (ภาพประจำโซน + ชื่อ) · กลับเข้าโซนที่เคยไปแล้ว = ป้ายเล็ก (ชื่ออย่างเดียว)
//   ระหว่างฉาก (CUTSCENE — ฉากเปิดแมตช์ / วีดีโอท่าไม้ตาย) เลื่อนไว้ก่อน แล้วค่อยขึ้นหลังฉากจบ
//  ข้อความมีแค่ชื่อพื้นที่ (กฎ UI) · ชื่อไทย = ทับศัพท์ชื่อเฉพาะ (Claude ตั้ง) · wild = ลูซิส (ผังทั้งผืนตามภูมิศาสตร์ Lucis)
// ============================================================
import { useEffect, useRef, useState } from "react";
import { eosZoneAt } from "./eosAudio";
import { EOS_ZONE_INFO } from "./eosMeta";
import "./eosCine.css";

const FULL_MS = 4200;
const LITE_MS = 2300;

// ภาพประจำโซน (viewBox 400×100) — โทนมืดตามแนวฉาก 3D ของ Fodlan
const ART = {
  insomnia: () => (
    <>
      <ellipse className="a-pulse" cx="200" cy="104" rx="170" ry="96" fill="none" stroke="#9fd2ff" strokeOpacity=".5" strokeWidth="1" />
      <ellipse cx="200" cy="104" rx="170" ry="96" fill="url(#ezc-dome)" />
      <path d="M40 100V78h10v-8h8v30zM66 100V62h12v38zM84 100V70h9V56h7v44zM108 100V66h14v34zM128 100V48h10v52zM144 100V60h12v40zM244 100V58h12v42zM262 100V46h10v54zM278 100V64h14v36zM298 100V54h8v-6h6v52zM318 100V68h12v32zM336 100V74h9v-6h8v32z" fill="#050a18" />
      <path d="M200 8l3 18 4 4 1 18 6 5 2 24 9 5v18h-50V82l9-5 2-24 6-5 1-18 4-4z" fill="#040816" stroke="#a9dcff" strokeOpacity=".55" strokeWidth=".8" />
      <circle className="a-pulse" cx="200" cy="9" r="4" fill="#e6f7ff" />
      {[[70, 70], [88, 64], [112, 74], [131, 58], [148, 70], [249, 66], [265, 55], [283, 72], [302, 60], [322, 76], [190, 70], [210, 66], [196, 84], [206, 88]].map(([x, y], i) => (
        <rect key={i} className="a-twinkle" x={x} y={y} width="1.6" height="1.6" fill={i % 3 ? "#ffd38a" : "#9fdcff"} />
      ))}
    </>
  ),
  hammerhead: () => (
    <>
      <circle cx="300" cy="78" r="26" fill="#ff9a4a" opacity=".35" />
      <path d="M0 92q100-8 200 0t200 0v8H0z" fill="#1a0e08" />
      <path d="M150 96V60h80v36z" fill="#120a06" />
      <path d="M150 60l40-14 40 14z" fill="#160c07" />
      <rect x="160" y="70" width="26" height="26" fill="#2a1a0e" />
      <rect x="194" y="70" width="26" height="26" fill="#2a1a0e" />
      <path d="M262 96V40h4v56z" fill="#120a06" />
      <g className="a-flicker">
        <path d="M244 30c10-8 30-10 42-2l-6 6c-8-4-22-4-30 0z" fill="#ffb15c" />
        <path d="M250 34h28l-14 8z" fill="#ff8a3a" />
      </g>
      <path d="M90 96V78h6l4-6h8v24z" fill="#120a06" />
      <rect className="a-flicker" x="92" y="80" width="4" height="3" fill="#ffd27a" />
    </>
  ),
  altissia: () => (
    <>
      <path d="M0 70h400v30H0z" fill="#06202a" />
      {[60, 110, 160, 240, 290, 340].map((x, i) => (
        <g key={x}>
          <path d={`M${x - 18} 70V${46 + (i % 2) * 6}h36V70z`} fill="#041219" />
          <path d={`M${x - 18} ${46 + (i % 2) * 6}a18 18 0 0 1 36 0z`} fill="#05161e" stroke="#7fe8da" strokeOpacity=".35" strokeWidth=".8" />
          <path d={`M${x - 10} 70v-12a10 10 0 0 1 20 0v12z`} fill="#0c3a44" />
        </g>
      ))}
      <path d="M196 70V22l4-10 4 10v48z" fill="#041219" stroke="#bfffee" strokeOpacity=".4" strokeWidth=".8" />
      {[0, 1, 2, 3].map((i) => (
        <ellipse key={i} className="a-ripple" cx={80 + i * 80} cy={82 + (i % 2) * 8} rx="30" ry="1.4" fill="none" stroke="#9ff5e6" strokeOpacity=".6" />
      ))}
      <path d="M140 86l20-4 20 4z" fill="#0a2830" className="a-drift" />
    </>
  ),
  lake: () => (
    <>
      <circle cx="300" cy="26" r="11" fill="#e8f6ff" opacity=".85" />
      <circle cx="300" cy="26" r="22" fill="#9fd6ff" opacity=".12" />
      <path d="M0 62q60-14 120-4t140-8 140 6v4H0z" fill="#081624" />
      <path d="M0 64h400v36H0z" fill="#051321" />
      <path d="M300 66v30" stroke="#dff2ff" strokeOpacity=".5" strokeWidth="6" strokeDasharray="5 4" className="a-pulse" />
      {[0, 1, 2].map((i) => (
        <ellipse key={i} className="a-ripple" cx="300" cy={72 + i * 9} rx={14 + i * 8} ry="1.2" fill="none" stroke="#bfe6ff" strokeOpacity=".55" />
      ))}
      <g className="a-sway" fill="#020a12">
        {[20, 30, 38, 48, 360, 368, 378, 388].map((x, i) => <path key={i} d={`M${x} 100q-2-${18 + (i % 3) * 8} ${(i % 2) * 4 - 2}-${26 + (i % 3) * 8}h1.6q-1 16 1 ${26 + (i % 3) * 8}z`} />)}
      </g>
      <rect className="a-drift" x="60" y="50" width="280" height="14" fill="url(#ezc-mist)" />
    </>
  ),
  duscae: () => (
    <>
      <g transform="rotate(-10 250 86)">
        <path d="M150 86a100 92 0 0 1 200 0" fill="none" stroke="#0e180a" strokeWidth="11" strokeLinecap="round" />
        <path d="M152 82a98 90 0 0 1 196 0" fill="none" stroke="#e6ffb0" strokeOpacity=".22" strokeWidth="1" />
      </g>
      <path d="M0 80q80-18 160-4t140-6 100 4v26H0z" fill="#0c1608" />
      <path d="M0 90q100-10 200 0t200-2v12H0z" fill="#070e05" />
      <g className="a-sway" fill="#0a1306">
        {Array.from({ length: 26 }, (_, i) => <path key={i} d={`M${8 + i * 15} 100l2-${8 + (i % 4) * 3}l2 ${8 + (i % 4) * 3}z`} />)}
      </g>
      {[[90, 70], [210, 64], [320, 72]].map(([x, y], i) => (
        <path key={i} className="a-float" d={`M${x} ${y}q6-6 12-2q-6 1-12 2z`} fill="#ffd65a" opacity=".9" />
      ))}
    </>
  ),
  forest: () => (
    <>
      <g fill="#06120a">
        {Array.from({ length: 22 }, (_, i) => {
          const x = i * 19 - 4, hgt = 46 + ((i * 37) % 30);
          return <path key={i} d={`M${x} 100l12-${hgt}l12 ${hgt}z`} />;
        })}
      </g>
      <g fill="#030a05">
        {Array.from({ length: 16 }, (_, i) => {
          const x = i * 27 + 6, hgt = 30 + ((i * 53) % 24);
          return <path key={i} d={`M${x} 100l14-${hgt}l14 ${hgt}z`} />;
        })}
      </g>
      {[[60, 70], [120, 58], [180, 76], [240, 62], [300, 74], [350, 56], [90, 84], [270, 86]].map(([x, y], i) => (
        <circle key={i} className="a-float" cx={x} cy={y} r="1.6" fill="#d8ff8a" />
      ))}
    </>
  ),
  desert: () => (
    <>
      <circle className="a-heat" cx="110" cy="70" r="30" fill="#ffb347" opacity=".55" />
      <circle cx="110" cy="70" r="46" fill="#ff8a30" opacity=".12" />
      <path d="M190 78l14-34h56l12 34z" fill="#1c0f08" />
      <path d="M204 44h56" stroke="#ffc58a" strokeOpacity=".3" />
      <path d="M290 80l10-22h34l10 22z" fill="#160c06" />
      <path d="M0 80q90-10 180 0t220-2v22H0z" fill="#120904" className="a-heat" />
      <path d="M0 90q120-8 240 0t160 0v10H0z" fill="#0b0602" />
      <path d="M20 88h360" stroke="#ffd59a" strokeOpacity=".18" strokeDasharray="10 14" className="a-drift" />
    </>
  ),
  wild: () => (
    <>
      <g className="a-spin" style={{ transformOrigin: "200px 30px" }}>
        <path d="M200 16l4 14-4 14-4-14z" fill="#e4ecff" opacity=".85" />
        <path d="M186 30l14-3 14 3-14 3z" fill="#e4ecff" opacity=".5" />
      </g>
      <circle className="a-pulse" cx="200" cy="30" r="12" fill="#9fb4ff" opacity=".18" />
      <path d="M0 100V72l40-24 30 18 46-36 40 30 30-14 44 34 40-28 46 26 40-22 44 30v14z" fill="#0c1020" />
      <path d="M0 100V84l60-16 50 12 70-18 60 16 70-14 90 16v20z" fill="#060812" />
      {[0, 1, 2].map((i) => <path key={i} className="a-drift" d={`M${40 + i * 120} ${50 + i * 8}h60`} stroke="#c8d4ff" strokeOpacity=".22" />)}
    </>
  ),
};

export function ZoneCard({ zone, lite = false }) {
  const z = EOS_ZONE_INFO[zone] || EOS_ZONE_INFO.wild;
  const Art = ART[zone] || ART.wild;
  return (
    <div
      className={`ezc${lite ? " is-lite" : ""}`}
      style={{ "--c": z.c, "--g": z.g, "--bg": z.bg, "--life": `${lite ? LITE_MS : FULL_MS}ms` }}
      aria-hidden="true"
    >
      {!lite && (
        <div className="ezc-art">
          <svg viewBox="0 0 400 100" preserveAspectRatio="xMidYMax slice">
            <defs>
              <radialGradient id="ezc-dome" cx="50%" cy="100%" r="60%">
                <stop offset="0%" stopColor="#5fb0ff" stopOpacity="0" />
                <stop offset="100%" stopColor="#7cc4ff" stopOpacity=".18" />
              </radialGradient>
              <linearGradient id="ezc-mist" x1="0" x2="1">
                <stop offset="0%" stopColor="#bfe0ff" stopOpacity="0" />
                <stop offset="50%" stopColor="#bfe0ff" stopOpacity=".14" />
                <stop offset="100%" stopColor="#bfe0ff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <Art />
          </svg>
          {/* ชื่ออยู่ในภาพ (ผู้ใช้สั่ง 2026-11-09 — "บอกชื่อพื้นที่ในภาพเลย มาข้างนอกมันมองยาก") */}
          <div className="ezc-title">
            <div className="ezc-name"><i /><b>{z.name}</b><i /></div>
            <span className="ezc-latin">{z.latin}</span>
          </div>
        </div>
      )}
      {lite && (
        <div className="ezc-title">
          <div className="ezc-name"><i /><b>{z.name}</b><i /></div>
          <span className="ezc-latin">{z.latin}</span>
        </div>
      )}
    </div>
  );
}

export default function EosZoneCard({ state }) {
  const me = state.players && state.players.find((p) => p.id === state.youId);
  const pos = me && me.alive !== false && me.pos ? me.pos : null;
  const zone = pos ? eosZoneAt(pos.x, pos.y) : null;
  const hold = state.gameState === "CUTSCENE" || state.gameState === "GAMEOVER";
  const seen = useRef({ last: null, visited: new Set() });
  const [card, setCard] = useState(null); // { zone, lite, key }

  useEffect(() => {
    if (!zone || hold) return;
    const s = seen.current;
    if (zone === s.last) return;
    s.last = zone;
    const lite = s.visited.has(zone);
    s.visited.add(zone);
    setCard({ zone, lite, key: Date.now() });
  }, [zone, hold]);

  useEffect(() => {
    if (!card) return undefined;
    const id = setTimeout(() => setCard(null), card.lite ? LITE_MS : FULL_MS);
    return () => clearTimeout(id);
  }, [card]);

  if (!card) return null;
  return <ZoneCard key={card.key} zone={card.zone} lite={card.lite} />;
}
