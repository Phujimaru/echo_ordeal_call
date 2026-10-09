import { useEffect, useMemo, useState } from "react";
import { clickSound } from "../audio";
import { faceStyle } from "../board/charFace";
import "./victory.css";

// หน้าจบเกม (ORDEAL CALL) — ออกแบบบนเวที 1920 × 1080 แล้วย่อ/ขยายด้วย --k (พื้นหลัง/ขีดมุมเต็มจอจริง)
//  ผู้ชนะ = หกเหลี่ยมใหญ่บนเส้นวงโคจร + มงกุฎ · คนอื่น = หกเหลี่ยมเล็กเรียงตามลำดับ (รอดก่อน แล้วตามที่นั่ง)
const STAGE_W = 1920, STAGE_H = 1080;
const HEX = "50,0 100,25 100,75 50,100 0,75 0,25";
const stageK = () => (typeof window === "undefined" ? 1 : Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H));
// ขนาดหกเหลี่ยมผู้ชนะ (กว้าง) + ระยะห่างตามจำนวนผู้ชนะ — สูง = กว้าง / 0.873 (สัดส่วนเดียวกับ faceStyle)
const WIN_LAYOUT = { 1: { w: 280, gap: 0 }, 2: { w: 250, gap: 420 }, 3: { w: 226, gap: 380 } };
const WIN_CY = 455; // จุดกลางแนวตั้งของหกเหลี่ยมผู้ชนะ (บนเวที)

// รูปหน้าตัวละครในหกเหลี่ยม — ใช้ภาพประจำตัวละครก่อน (ครอปหน้าตรง) · โหลดไม่ได้ = ตัวอักษรแรกของชื่อ
function HexFace({ p, opts }) {
  const [broken, setBroken] = useState(false);
  const img = p.character?.img || p.img;
  if (!img || broken) return <span className="vic-initial">{(p.name || "?").slice(0, 1).toUpperCase()}</span>;
  return <img src={img} alt="" draggable={false} style={faceStyle({ ...p, img }, opts)} onError={() => setBroken(true)} />;
}

function Crown() {
  return (
    <svg className="vic-crown" viewBox="0 0 64 48" aria-hidden="true">
      <defs>
        <linearGradient id="vic-crown-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".55" stopColor="#bee3f8" />
          <stop offset="1" stopColor="#7fb8e6" />
        </linearGradient>
      </defs>
      <path d="M6 40 L3 12 L19 25 L32 4 L45 25 L61 12 L58 40 Z" fill="url(#vic-crown-g)" stroke="#3d8bd9" strokeWidth="2.4" strokeLinejoin="round" />
      <rect x="6" y="40" width="52" height="5" fill="#3d8bd9" />
      <path d="M32 20 L37 27 L32 34 L27 27 Z" fill="#9b4f96" stroke="#fff" strokeWidth="1.4" />
      <circle cx="3" cy="12" r="3" fill="#9b4f96" />
      <circle cx="32" cy="4" r="3" fill="#9b4f96" />
      <circle cx="61" cy="12" r="3" fill="#9b4f96" />
    </svg>
  );
}

function Winner({ p, x, w, i, you, multi }) {
  const h = Math.round(w / 0.873);
  return (
    <div className="vic-win" data-multi={multi ? "true" : "false"} style={{ left: x, top: WIN_CY - h / 2, width: w, "--pc": p.color || "#9b4f96", "--d": `${i * 160}ms` }}>
      <div className="vic-halo" />
      <div className="vic-hexw" style={{ height: h }}>
        <svg className="vic-dial" viewBox="-100 -100 200 200" aria-hidden="true">
          <g><circle className="t1" r="96" /><circle className="t2" r="90" /><circle className="t3" r="93" /><circle className="t4" r="93" /></g>
        </svg>
        <svg className="vic-ring vic-ring-a" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polygon points={HEX} /></svg>
        <svg className="vic-ring vic-ring-b" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polygon points={HEX} /></svg>
        <div className="vic-fr" />
        <div className="vic-fa"><HexFace p={p} opts={{ zoom: 1.55, cy: 40 }} /></div>
        <div className="vic-gloss" />
        <Crown />
      </div>
      <div className="vic-plate">
        <div className="vic-name">{p.name}</div>
        <div className="vic-sub">
          <span className="vic-ch">{p.character?.name || ""}</span>
          {you && <span className="vic-you">คุณ</span>}
        </div>
      </div>
    </div>
  );
}

function Mini({ p, i, you }) {
  return (
    <div className="vic-mini" data-dead={p.alive ? "false" : "true"} style={{ "--pc": p.color || "#3d8bd9", "--d": `${i * 90}ms` }}>
      <div className="vic-mhex">
        <div className="vic-mfr" />
        <div className="vic-mfa"><HexFace p={p} /></div>
        {!p.alive && (
          <svg className="vic-mx" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5 L15 15 M15 5 L5 15" /></svg>
        )}
      </div>
      <div className="vic-mname">{p.name}{you && <i className="vic-mdot" />}</div>
      <div className="vic-mch">{p.character?.name || ""}</div>
    </div>
  );
}

export default function VictoryScreen({ state, onBackToLobby }) {
  const [k, setK] = useState(stageK);
  useEffect(() => {
    const on = () => setK(stageK());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  // ละอองหกเหลี่ยม/ข้าวหลามตัดลอยขึ้น (แทนกระดาษสีแบบเก่า)
  const motes = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        left: (i * 137) % 100,
        size: 6 + ((i * 5) % 9),
        dur: 9 + ((i * 7) % 8),
        delay: (i * 0.83) % 9,
        dx: ((i % 5) - 2) * 26,
        tone: i % 3,
      })),
    []
  );

  const { heading, winners } = useMemo(() => {
    if (state.gameMode !== "ffa" && state.winningTeamId) {
      const ws = state.players.filter((p) => p.alive && p.teamId === state.winningTeamId);
      return { heading: `ทีม ${state.winningTeamId}`, winners: ws };
    }
    const c = state.players.find((p) => p.alive);
    return { heading: c ? c.name : "จบเกม", winners: c ? [c] : [] };
  }, [state.gameMode, state.winningTeamId, state.players]);

  // คนที่เหลือ: รอดก่อน แล้วตามที่นั่ง · โหมดทีม = จัดกลุ่มตามทีม (ทีมที่ชนะก่อน)
  const groups = useMemo(() => {
    const winIds = new Set(winners.map((p) => p.id));
    const rest = state.players
      .filter((p) => !winIds.has(p.id))
      .sort((a, b) => (b.alive ? 1 : 0) - (a.alive ? 1 : 0) || (a.position || 0) - (b.position || 0));
    const teamMode = state.gameMode !== "ffa" && rest.some((p) => p.teamId);
    if (!teamMode) return rest.length ? [{ id: null, players: rest }] : [];
    const ids = [...new Set(rest.map((p) => p.teamId || ""))].sort((a, b) =>
      (b === state.winningTeamId ? 1 : 0) - (a === state.winningTeamId ? 1 : 0) || String(a).localeCompare(String(b))
    );
    return ids.map((id) => ({ id, players: rest.filter((p) => (p.teamId || "") === id) }));
  }, [state.players, state.gameMode, state.winningTeamId, winners]);

  const lay = WIN_LAYOUT[Math.min(3, Math.max(1, winners.length))];
  const wGap = winners.length > 3 ? Math.min(lay.gap, 1500 / (winners.length - 1)) : lay.gap;
  let mi = 0;

  return (
    <div className="vic-root">
      <div className="vic-bg" />
      <div className="vic-comb" />
      <i className="vic-tick vic-tl" /><i className="vic-tick vic-tr" /><i className="vic-tick vic-bl" /><i className="vic-tick vic-br" />

      <div className="vic-stage" style={{ "--k": k }}>
        <div className="vic-globe">
          <svg viewBox="-100 -100 200 200" aria-hidden="true">
            <circle r="98" /><ellipse rx="98" ry="30" /><ellipse rx="98" ry="62" />
            <ellipse rx="30" ry="98" /><ellipse rx="62" ry="98" /><ellipse rx="86" ry="98" />
            <line x1="-98" y1="0" x2="98" y2="0" /><line x1="0" y1="-98" x2="0" y2="98" />
          </svg>
        </div>

        {/* วงโคจรพื้นหลัง (เอียง) + ดาวเทียมวิ่งตามวง */}
        <svg className="vic-sky" viewBox="0 0 1920 1080" aria-hidden="true">
          <g transform="rotate(-9 960 520)">
            <path className="vic-sky-a" d="M40,520 a920,250 0 1,0 1840,0 a920,250 0 1,0 -1840,0" />
            <circle className="vic-sat" r="5"><animateMotion dur="28s" repeatCount="indefinite" path="M40,520 a920,250 0 1,0 1840,0 a920,250 0 1,0 -1840,0" /></circle>
          </g>
          <g transform="rotate(11 960 560)">
            <path className="vic-sky-b" d="M-120,560 a1080,340 0 1,0 2160,0 a1080,340 0 1,0 -2160,0" />
            <circle className="vic-sat vic-sat-echo" r="4"><animateMotion dur="40s" repeatCount="indefinite" path="M2040,560 a1080,340 0 1,1 -2160,0 a1080,340 0 1,1 2160,0" /></circle>
          </g>
        </svg>

        <div className="vic-rays" />
        <div className="vic-scan" />

        {motes.map((m, i) => (
          <span
            key={i}
            className="vic-mote"
            data-tone={m.tone}
            style={{ left: `${m.left}%`, width: m.size, height: m.size, animationDuration: `${m.dur}s`, animationDelay: `-${m.delay}s`, "--dx": `${m.dx}px` }}
          />
        ))}

        {state.roundNumber > 0 && <div className="vic-round">Round {String(state.roundNumber).padStart(2, "0")}</div>}

        <div className="vic-head">
          <div className="vic-wm" aria-hidden="true">{winners.length ? "Victory" : "Match End"}</div>
          {winners.length > 0 && <div className="vic-chip">ผู้ชนะ</div>}
          <h1 className="vic-title"><i className="vic-dia vic-dia-l" />{heading}<i className="vic-dia vic-dia-r" /></h1>
        </div>

        {/* เส้นวงโคจรหลัก: ครึ่งหลังเป็นจุดประ ครึ่งหน้าวาดเส้นไล่สีฟ้า-ม่วง */}
        <svg className="vic-orbit" viewBox="0 0 1920 1080" aria-hidden="true">
          <defs>
            <linearGradient id="vic-orbit-g" x1="0" x2="1">
              <stop offset="0" stopColor="#7fb8e6" stopOpacity="0" />
              <stop offset=".22" stopColor="#3d8bd9" />
              <stop offset=".5" stopColor="#9b4f96" />
              <stop offset=".78" stopColor="#3d8bd9" />
              <stop offset="1" stopColor="#7fb8e6" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path className="vic-orb-back" d="M180,470 A780,128 0 0,1 1740,470" />
          <path className="vic-orb-front" pathLength="1" d="M180,470 A780,128 0 0,0 1740,470" />
          <path className="vic-orb-echo" d="M120,486 A840,150 0 0,0 1800,486" />
          <path className="vic-orb-low" pathLength="1" d="M260,812 Q960,760 1660,812" />
          <rect className="vic-node" x="172" y="462" width="16" height="16" transform="rotate(45 180 470)" />
          <rect className="vic-node" x="1732" y="462" width="16" height="16" transform="rotate(45 1740 470)" />
        </svg>

        {winners.length === 0 && (
          <svg className="vic-empty" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polygon points={HEX} /></svg>
        )}
        {winners.map((p, i) => (
          <Winner key={p.id} p={p} i={i} w={lay.w} x={960 + (i - (winners.length - 1) / 2) * wGap - lay.w / 2} you={p.id === state.youId} multi={winners.length > 1} />
        ))}

        {groups.length > 0 && (
          <div className="vic-rest">
            {groups.map((g) => (
              <div key={g.id ?? "all"} className="vic-grp">
                {g.id !== null && <div className="vic-grp-lb" data-win={g.id === state.winningTeamId ? "true" : "false"}>ทีม {g.id}</div>}
                <div className="vic-grp-row">
                  {g.players.map((p) => <Mini key={p.id} p={p} i={mi++} you={p.id === state.youId} />)}
                </div>
              </div>
            ))}
          </div>
        )}

        <button type="button" className="vic-back" onClick={() => { clickSound(); onBackToLobby(); }}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 6 L4 12 L10 18 M4 12 H20" /></svg>
          กลับห้องรอ
        </button>
      </div>
    </div>
  );
}
