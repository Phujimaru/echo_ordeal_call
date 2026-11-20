// เฉพาะ dev: ?court=1 — เล่นฉากศาลของนารุโฮโดะ (GRID_PLAN §7.37) ผ่าน CourtOverlay ตัวจริง + server จำลอง (courtMock.js)
//  เลือกบทบาทที่เล่นเอง (ทนาย/ผู้ช่วย/จำเลย/ฝ่ายค้าน/ประชาชน/ผู้ชม) + โหมด PVP/Duo + จำเลย · บทบาทที่เหลือ = AI · ?court=1&qa=1 = ตรวจท่าสไปรต์
import { useEffect, useMemo, useRef, useState } from "react";
import CourtOverlay from "./CourtOverlay";
import { COURT_ROSTER } from "./courtRoster";
import { mockMatch, shuffle } from "./courtCase";
import { MockCourt } from "./courtMock";
import { courtMuted, setCourtMuted } from "./courtSfx";
import { ATLAS } from "./courtAssets";
import { Sprite, Scene, Piece } from "./CourtStage";
import { IMG } from "./courtAssets";
import { onMusicSuspend, onVolumeChange, masterGain, channelGain } from "../audio";
import "./court.css";

const POOL = COURT_ROSTER.filter((c) => c.id !== "naruhodo_ryuichi");
const byId = (id) => POOL.find((c) => c.id === id) || POOL[0];
const NARU = { id: "p_L", name: "ผู้เล่น 1", img: "/characters/naruhodo_ryuichi/naruhodo.webp", character: { name: "นารุโฮโดะ ริวอิจิ", img: "/characters/naruhodo_ryuichi/naruhodo.webp" } };
const ROLES = [["L", "ทนาย"], ["co", "ผู้ช่วย"], ["D", "จำเลย"], ["C", "ฝ่ายค้าน"], ["G", "ประชาชน"], ["spec", "ผู้ชม"]];
const MUSIC = "/characters/naruhodo_ryuichi/music/";
const sel = { font: "500 14px Kanit, sans-serif", padding: "5px 8px", background: "#1d1813", color: "#fbf6ea", border: "1px solid #5b4a36", borderRadius: 6 };

function useMusic(name, muted) {
  const a = useRef(null);
  useEffect(() => {
    if (a.current) { a.current.pause(); a.current = null; }
    if (!name || muted) return undefined;
    const el = new Audio(MUSIC + name + ".mp3"); el.loop = true; const vol = () => { el.volume = Math.min(1, 0.7 * masterGain() * channelGain("music")); }; vol(); el.play().catch(() => {}); a.current = el;
    const off = onMusicSuspend((on) => (on ? el.pause() : el.play().catch(() => {})));
    const offV = onVolumeChange(vol);
    return () => { off(); offV(); el.pause(); };
  }, [name, muted]);
}

export default function CourtPreview() {
  const qa = new URLSearchParams(location.search).get("qa");
  if (qa === "pieces") return <PieceQA />;
  if (qa) return <PoseQA />;
  return <Play />;
}

function Play() {
  const q = new URLSearchParams(location.search); // dev: &role=L|co|D|C|G|spec &mode=pvp|duo &def=<id> &quick=1
  const [defId, setDef] = useState(q.get("def") || "dio_brando");
  const [mode, setMode] = useState(q.get("mode") || (["co", "C"].includes(q.get("role")) ? "duo" : "pvp"));
  const [role, setRole] = useState(q.get("role") || "L");
  const [seed, setSeed] = useState(0);
  const [, force] = useState(0);
  const [muted, setMuted] = useState(courtMuted);
  const okRole = mode === "duo" ? role !== "G" : role !== "co" && role !== "C";
  const fixMode = (r) => { setRole(r); if ((r === "co" || r === "C") && mode !== "duo") setMode("duo"); if (r === "G" && mode !== "pvp") setMode("pvp"); };

  const mock = useMemo(() => {
    const d = byId(defId);
    const mk = (c, i) => ({ id: "p_" + i, name: "ผู้เล่น " + i, img: c.img, character: { name: c.name, img: c.img } });
    const rest = shuffle(POOL.filter((c) => c.id !== d.id));
    const D = { ...mk(d, "D"), id: "p_D" };
    const roles = { L: NARU.id, D: D.id, co: [], C: [], G: [] };
    if (d.id === "kate" || d.id === "kate_emiliko") roles.Dunits = [{ id: D.id, name: "เคท", img: d.img }, { id: "p_D2", name: "เอมิลิโกะ", img: "/characters/kate_emiliko/emiliko.webp" }];
    const players = [NARU, D];
    if (mode === "duo") { const co = mk(rest[0], "co"), cc = mk(rest[1], "C"); players.push(co, cc); roles.co = [co.id]; roles.C = [cc.id]; }
    else rest.slice(2, 7).forEach((c, i) => { const g = mk(c, "G" + i); players.push(g); roles.G.push(g.id); });
    const victims = players.filter((p) => p.id !== D.id).map((p) => ({ name: p.character.name }));
    const events = mockMatch({ ...d, id: D.id, name: d.name }, victims);
    const humanId = role === "L" ? NARU.id : role === "D" ? D.id : role === "co" ? roles.co[0] : role === "C" ? roles.C[0] : role === "G" ? roles.G[0] : "watcher";
    return new MockCourt({ players, roles, events, humanId, mode, quick: q.has("quick"), dcred: +q.get("dcred") || 0, slow: q.has("wait"), onChange: () => force((n) => n + 1) });
  }, [defId, mode, role, seed]);
  useEffect(() => { if (okRole) mock.start(); return () => mock.stop(); }, [mock, okRole]);

  const state = mock.stateFor(mock.human);
  useMusic(state.court?.music, muted);

  return (
    <div className="cprev">
      <div className="cprevbar">
        <select style={sel} value={defId} onChange={(e) => setDef(e.target.value)}>{POOL.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select style={sel} value={mode} onChange={(e) => setMode(e.target.value)}><option value="pvp">PVP</option><option value="duo">Duo</option></select>
        <select style={sel} value={role} onChange={(e) => fixMode(e.target.value)}>{ROLES.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select>
        <button style={{ ...sel, cursor: "pointer" }} onClick={() => setSeed((n) => n + 1)}>🎲</button>
        <button style={{ ...sel, cursor: "pointer" }} onClick={() => { setCourtMuted(!muted); setMuted(!muted); }}>{muted ? "🔇" : "🔊"}</button>
        <span style={{ ...sel, border: 0, background: "none" }}>{state.court ? `${state.court.phase} · ♪ ${state.court.music || "-"}` : ""}</span>
      </div>
      <div className="cprevstage">
        {state.court
          ? <CourtOverlay state={state} me={mock.human} emit={(ev, p) => mock.emit(mock.human, ev, p)} embedded />
          : <button className="cbtn big" onClick={() => setSeed((n) => n + 1)}>⚖️ เริ่มการไต่สวน</button>}
      </div>
    </div>
  );
}

// ตรวจภาพหมากบนแท่นพยาน (?court=1&qa=pieces) — ทุกตัวละครใน roster
function PieceQA() {
  return (
    <div className="cprev" style={{ flexDirection: "row", flexWrap: "wrap", alignContent: "flex-start" }}>
      {POOL.map((c) => (
        <div key={c.id} style={{ color: "#fff", font: "11px Kanit" }}>
          <div className="court" style={{ width: 256, height: 144, "--u": "0.75px" }}>
            <div className="ctop">
              <Scene bg="bg_witness" on><Piece p={{ name: c.name, img: c.img }} cls="wit" /><img className="cbg" src={IMG("stand_witness")} alt="" /></Scene>
            </div>
          </div>
          {c.name}
        </div>
      ))}
    </div>
  );
}

// ตรวจท่า: ทุกท่าวางที่จุดยึด ax เดียวกัน + เส้นอ้างอิง · คลิกท่า = ซ้อนกับ idle แบบโปร่ง
function PoseQA() {
  const [ghost, setGhost] = useState(null);
  const box = (atlas, k) => (
    <div key={atlas + k} className="cqa" onClick={() => setGhost(ghost === k ? null : k)} style={{ "--u": "2px" }}>
      <div className="cqastage">
        {atlas === "naruhodo" && <div style={{ opacity: ghost === k ? 0.35 : 0, position: "absolute", inset: 0 }}><Sprite atlas={atlas} anim="idle" x={80} /></div>}
        <Sprite atlas={atlas} anim={k} x={80} />
        <i className="cqaline" />
      </div>
      <b>{k}</b>
    </div>
  );
  return (
    <div className="cprev" style={{ flexDirection: "row", flexWrap: "wrap", alignContent: "flex-start" }}>
      {Object.keys(ATLAS.naruhodo.anims).map((k) => box("naruhodo", k))}
      {Object.keys(ATLAS.judge.anims).map((k) => box("judge", k))}
    </div>
  );
}
