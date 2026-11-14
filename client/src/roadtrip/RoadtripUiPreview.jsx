// dev: ?roadtrip=ui — หน้าดูแผงของ Road Trip ด้วย state จำลอง (ไม่ต่อ server) · คำสั่ง rt:* ถูกจำลองในเครื่อง (setRtEmitter)
//  &p=fork|event|stop|garage|combat|radio|over · ปุ่มมุมบนซ้ายสลับแผง/กลางวันกลางคืน/ธีม
import { useEffect, useMemo, useState } from "react";
import { setRtEmitter } from "./rtSocket";
import * as radio from "./radio";
import ForkPanel from "./ForkPanel";
import EventCard from "./EventCard";
import StopBar from "./StopBar";
import Garage from "./Garage";
import RadioPanel from "./RadioPanel";
import RoadtripSummary from "./RoadtripSummary";
import { HudTopBar } from "../screens/hud/SelfHud";
import { HudCommand } from "../screens/hud/HudPhases";
import { rtVanButtons, useRtVanHotkeys } from "./rtVanActions";
import { setUiTheme, useUiTheme } from "../uiTheme";
import "./roadtrip.css";

const PLAYERS = [
  { id: "a", name: "มุยมิ", color: "#ff6b9a", img: "/characters/muimi/muimi.png", alive: true },
  { id: "b", name: "เฟิร์น", color: "#8a6cf0", img: "/characters/fern/fern.png", alive: true },
  { id: "c", name: "ไจโร", color: "#3fbf7f", alive: true },
  { id: "d", name: "เกรย์", color: "#f0a020", alive: false },
];
const now = () => Date.now();
function initial() {
  return {
    phase: "fork", endsAt: now() + 15000, diff: "normal", km: 137, region: { id: "desert", loop: 1 }, night: false,
    van: { hp: 31, hpMax: 40, fuel: 12, fuelMax: 60, kmh: 115, lane: 0, driverId: "a", nitro: 1, style: "normal", paint: "#f08a4b", plate: "กข 4567", decor: ["ธง", "ลูกโป่ง"],
      upg: { body: 2, engine: 1, tank: 1, susp: 0, nitro: 1, turret: 1, bumper: 3, storage: 0 }, rearOpen: false },
    fork: { options: [{ kind: "gas", km: 18 }, { kind: "elite", km: 9 }, { kind: "event", km: 14 }], votes: { b: 1, c: 0 } },
    event: { id: 1, kind: "police", choices: [{ key: "pay", label: "จ่ายค่าปรับ", cost: 8 }, { key: "run", label: "เหยียบหนี", cost: { fuel: 10, van: 5 } }, { key: "fight", label: "สู้", cost: 0 }], votes: { c: "run" } },
    stop: { kind: "gas", ready: { b: true }, acts: {} },
    combat: { kind: "onvan", round: 2, rounds: 5, scroll: 1, roofId: null },
    actions: { a: [{ key: "swerve", cd: 0, cdMax: 3, dmg: 3 }, { key: "turret" }, "roof"] },
    radio: { src: "synth", station: 3, yt: null, by: "a" },
    fx: [],
    summary: { km: 214, kills: 37, gold: 86, region: "snow", loop: 1, diff: "hard" },
  };
}

export default function RoadtripUiPreview() {
  const q = new URLSearchParams(location.search);
  const [view, setView] = useState(q.get("p") || "fork");
  const [rt, setRt] = useState(initial);
  const [gold, setGold] = useState(42);
  const [theme] = useUiTheme();
  useEffect(() => {
    setRtEmitter((ev, d = {}) => {
      // eslint-disable-next-line no-console
      console.log("[roadtrip preview]", ev, d);
      setRt((s) => {
        const v = { ...s.van };
        switch (ev) {
          case "rt:vote": return { ...s, fork: { ...s.fork, votes: { ...s.fork.votes, a: d.i } } };
          case "rt:event": return { ...s, event: { ...s.event, votes: { ...s.event.votes, a: d.key } } };
          case "rt:ready": { const r = { ...s.stop.ready }; if (r.a) delete r.a; else r.a = true; return { ...s, stop: { ...s.stop, ready: r } }; }
          case "rt:upg": { const lv = (v.upg[d.key] || 0) + 1; if (lv > 3) return s; setGold((g) => g - [6, 10, 16][lv - 1]); return { ...s, van: { ...v, upg: { ...v.upg, [d.key]: lv } } }; }
          case "rt:decor": return { ...s, van: { ...v, decor: d.on ? [...v.decor, d.name] : v.decor.filter((x) => x !== d.name) } };
          case "rt:style": return { ...s, van: { ...v, style: d.style } };
          case "rt:paint": return { ...s, van: { ...v, paint: d.hex } };
          case "rt:plate": return { ...s, van: { ...v, plate: d.text } };
          case "rt:rear": return { ...s, van: { ...v, rearOpen: !v.rearOpen } };
          case "rt:swerve": return { ...s, actions: { a: s.actions.a.map((x) => (x && x.key === "swerve" ? { ...x, cd: 3 } : x)) } };
          case "rt:roof": return { ...s, combat: { ...s.combat, roofId: s.combat.roofId === "a" ? null : "a" } };
          case "rt:turret": return { ...s, van: { ...v, turretReady: false } };
          case "rt:radio": return { ...s, radio: { ...d, yt: d.yt ? { ...d.yt, at: d.yt.at || Date.now() } : null, by: "a" } };
          default: return s;
        }
      });
    });
    return () => setRtEmitter(null);
  }, []);
  // วิทยุเล่นจริงในหน้าดู (แผงวิทยุ)
  useEffect(() => { radio.sync(rt.radio, { active: view === "radio", leader: true }); }, [rt.radio, view]);
  useEffect(() => () => radio.stopAll(), []);
  const reset = (p) => setRt((s) => ({ ...s, phase: p, endsAt: now() + (p === "stop" ? 150000 : 15000) }));
  const phaseOf = { fork: "fork", event: "event", stop: "stop", garage: "stop", combat: "combat", radio: "drive", over: "over" };
  const hudZ = Math.min(1.6, Math.max(0.6, Math.min(window.innerHeight / 810, window.innerWidth / 1376)));
  const vanBtns = rtVanButtons({ rt: { ...rt, phase: "combat" }, youId: "a", enabled: view === "combat", picking: false, onTurret: () => setRt((s) => ({ ...s, van: { ...s.van, turretReady: false } })) });
  useRtVanHotkeys(view === "combat" ? vanBtns : []);
  const showTop = view === "stop" || view === "garage" || view === "combat";
  const rtView = useMemo(() => ({ ...rt, phase: phaseOf[view] }), [rt, view]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div style={{ position: "fixed", inset: 0, background: rt.night ? "linear-gradient(#0b1830,#26304a)" : "linear-gradient(#a9d3ee,#e8f1f6 60%,#c9b48a)", fontFamily: "Kanit, sans-serif" }}>
      <div className="rt-drive-ph" style={{ opacity: view === "stop" || view === "garage" || view === "combat" ? 0.25 : 1 }} />
      <div style={{ position: "fixed", left: 12, top: showTop ? 96 : 12, zIndex: 100, display: "flex", gap: 6, flexWrap: "wrap", maxWidth: 560 }}>
        {["fork", "event", "stop", "garage", "combat", "radio", "over"].map((p) => (
          <button key={p} type="button" onClick={() => { setView(p); reset(phaseOf[p]); }} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #888", background: view === p ? "#e0702e" : "#fff", color: view === p ? "#fff" : "#222", cursor: "pointer" }}>{p}</button>
        ))}
        <button type="button" onClick={() => setRt((s) => ({ ...s, night: !s.night }))} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #888", cursor: "pointer" }}>{rt.night ? "🌙" : "☀️"}</button>
        <button type="button" onClick={() => setUiTheme(theme === "dark" ? "light" : "dark")} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #888", cursor: "pointer" }}>{theme === "dark" ? "dark" : "light"}</button>
      </div>
      {showTop && <HudTopBar night={rt.night} round={view === "combat" ? 3 : null} roadtrip={{ rt: rtView, myTurn: true }} players={PLAYERS} zoom={hudZ} />}
      {view === "fork" && <ForkPanel fork={rt.fork} endsAt={rt.endsAt} players={PLAYERS} youId="a" />}
      {view === "event" && <EventCard event={rt.event} endsAt={rt.endsAt} players={PLAYERS} youId="a" />}
      {(view === "stop" || view === "garage") && <StopBar rt={rtView} players={PLAYERS} youId="a" zoom={hudZ} onGarage={() => setView("garage")} />}
      {view === "garage" && <Garage van={rt.van} gold={gold} diff={rt.diff} night={rt.night} onClose={() => setView("stop")} />}
      {view === "combat" && (
        <div className="hud-grp hud-right" style={{ "--hud-k": hudZ, position: "fixed" }}>
          <HudCommand skills={null} attack={{ disabled: true, targets: 0, onClick() {} }} extra={vanBtns} bag={{ items: [], slots: 5, onClick() {} }} undo={{ disabled: true, onClick() {} }} end={{ onClick() {} }} />
        </div>
      )}
      {view === "radio" && <RadioPanel radioState={rt.radio} zoom={hudZ} />}
      {view === "over" && <RoadtripSummary summary={rt.summary} players={PLAYERS} />}
    </div>
  );
}
