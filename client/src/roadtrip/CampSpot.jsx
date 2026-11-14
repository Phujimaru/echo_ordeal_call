// Road Trip — แผงเล็กของแต่ละจุดในแคมป์ (ผู้ใช้สั่ง 2026-11-15 "แต่ละกิจกรรมอยู่ที่จุดของมันเอง ห้ามรวมแผง")
//  เปิดจาก fx { k: "camp", pid, spot } (server/roadtrip/stop.js — เดินไปถึงจุดแล้ว) · spot:
//   logs = ขอนเล่าเรื่อง (เล่าเรื่องผี/ร้องเพลง — กลุ่ม ≥ 2) · canoe = เรือแคนู 2 คน · mallow = ปิ้งมาร์ชเมลโล่ · scope = กล้องดูดาว
//   chop = ผ่าฟืน · fish = ตกปลาที่ท่าเรือ · repair = แม่แรงซ่อมรถ
//  มินิเกมทั้งหมด CampGames.jsx · ผลตัดสินที่ server (camp.js) · ธีมขาว/มืด (CampPanel.css .cmp-spot)
import { useEffect, useState } from "react";
import { clickSound } from "../audio";
import { rtEmit } from "./rtSocket";
import { tip } from "./rtTip";
import { useNow } from "./rtCommon";
import { TimingBar, HoldToast, RhythmTap, StarPick, StoryVote } from "./CampGames";
import "./CampPanel.css";

const HEAD = { logs: ["🪵", "ขอนเล่าเรื่อง"], canoe: ["🛶", "เรือแคนู"], mallow: ["🍡", "ปิ้งมาร์ชเมลโล่"], scope: ["🔭", "กล้องดูดาว"], chop: ["🪓", "กองฟืน"], fish: ["🎣", "ท่าเรือ"], repair: ["🛠️", "แม่แรง"] };
const GROUP = {
  story: { icon: "👻", name: "เล่าเรื่องผี", desc: "2 คนขึ้นไป · โหวตตอนจบ · ทุกคนที่โหวต สู้ครั้งหน้า หลบหลีก 15% (2 เทิร์น) · ตรงเสียงข้างมาก +1 เหรียญ" },
  sing: { icon: "🎸", name: "ร้องเพลง", desc: "2 คนขึ้นไป · กดตามจังหวะ (Space) · เฉลี่ยทั้งวง ≥ 50% = พลังชีวิต +1 + เสริมพลัง +1 · ≥ 80% = 2 เทิร์น" },
  canoe: { icon: "🛶", name: "พายเรือ", desc: "2 คน · พายตามจังหวะ (Space) · เฉลี่ย ≥ 50% = พลังชีวิต +1 +1 เหรียญ · ≥ 80% = +2 เหรียญ" },
};
const FISH_CASTS = 3, CHOPS = 2, FIRE_MAX = 3; // server camp.js FISH.casts / CHOP.perPlayer / FIRE.max

// วงกิจกรรมกลุ่ม 1 วง: ปุ่มเปิด/ร่วม · นับคน/เวลา · ช่วงเล่น = มินิเกม
function Group({ k, act, done, me, now, send }) {
  const g = GROUP[k], live = !!act, joined = live && me && act.ids[me.id], played = live && (act.played || []).includes(me && me.id);
  const [pick, setPick] = useState(null);
  const left = live ? Math.max(0, Math.ceil((act.endsAt - now) / 1000)) : 0;
  const n = live ? Object.keys(act.ids).length : 0;
  if (live && act.stage === "play" && joined && !played && pick == null) {
    if (k === "story") return <StoryVote seed={act.seed} picked={pick} votes={(act.played || []).length} of={n} onPick={(i) => { setPick(i); send({ a: "play", key: k, pick: i }); }} />;
    return <RhythmTap onDone={(s) => { setPick(s); send({ a: "play", key: k, score: s }); }} />;
  }
  return (
    <button type="button" className="cmp-act" data-done={done ? "true" : "false"} data-live={live ? "true" : "false"} disabled={done || (live && (joined || act.stage === "play"))}
      onClick={() => send({ a: "night", key: k })} {...tip(g.desc, g.name)}>
      <span className="cmp-act-ic" aria-hidden="true">{g.icon}</span><b>{g.name}</b>
      {done ? <span className="cmp-tag">✔</span> : live ? <span className="cmp-tag">{act.stage === "play" ? "🎮" : "👥"} {n} · {left}</span> : null}
      {live && !joined && act.stage === "join" && <span className="cmp-join">ร่วม</span>}
    </button>
  );
}

export default function CampSpot({ spot, state, me, unitArg = {}, zoom = 1, onClose }) {
  const now = useNow(250);
  useEffect(() => {
    const on = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [onClose]);
  const rt = state.roadtrip || {}, c = (rt.stop && rt.stop.camp) || {}, acts = c.acts || {}, id = me && me.id;
  const send = (o) => { clickSound(); rtEmit("rt:camp", { ...o, ...unitArg }); };
  const [k0, setK0] = useState(0); // นับรอบมินิเกมซ้ำ (ตกปลา/ผ่าฟืน)
  const [h, name] = HEAD[spot] || ["⛺", ""];
  let body = null;
  if (spot === "logs") body = <div className="cmp-spot-row">{["story", "sing"].map((k) => <Group key={k} k={k} act={acts[k]} done={!!(c.done && c.done[k])} me={me} now={now} send={send} />)}</div>;
  else if (spot === "canoe") body = <Group k="canoe" act={acts.canoe} done={!!(c.done && c.done.canoe)} me={me} now={now} send={send} />;
  else if (spot === "mallow") {
    const res = c.mallow && c.mallow[id];
    body = res ? <div className="cmp-res">{res === "golden" ? "✨" : res === "ok" ? "👍" : "🔥"}</div> : <HoldToast onDone={(s) => send({ a: "mallow", score: s })} />;
  } else if (spot === "scope") {
    const q = c.stars && c.stars[id];
    body = !q ? null : q.res ? <div className="cmp-res">{q.res === "ok" ? "🌟 +2 🪙" : "☁️"}</div> : <StarPick seed={q.seed} answer={q.answer} onPick={(i) => send({ a: "stars", pick: i })} />;
  } else if (spot === "chop") {
    const used = (c.chop && c.chop[id]) || 0;
    body = (
      <>
        <div className="cmp-meter"><span>🔥</span>{Array.from({ length: FIRE_MAX }, (_, i) => <b key={i} data-on={i < (c.fire | 0) ? "true" : "false"} />)}<small>🪓 {CHOPS - used}</small></div>
        {used < CHOPS && <TimingBar key={`chop${used}${k0}`} icon="🪓" rounds={1} period={900} zone={0.16} onDone={(s) => { send({ a: "chop", score: s }); setK0((v) => v + 1); }} />}
      </>
    );
  } else if (spot === "fish") {
    const used = (c.fish && c.fish[id]) || 0;
    body = (
      <>
        <div className="cmp-meter"><span>🎣</span><small>{FISH_CASTS - used}/{FISH_CASTS}</small></div>
        {used < FISH_CASTS && <TimingBar key={`fish${used}${k0}`} icon="🐟" rounds={1} period={1100} zone={0.14} onDone={(s) => { send({ a: "fish", score: s }); setK0((v) => v + 1); }} />}
      </>
    );
  } else if (spot === "repair") {
    body = c.fixed && c.fixed[id] ? <div className="cmp-res">✔</div> : <TimingBar icon="🔩" rounds={3} period={1000} zone={0.16} onDone={(s) => send({ a: "repair", score: s })} />;
  }
  return (
    <div className="cmp-spot rt-ui" style={{ "--k": zoom }} role="dialog" aria-label={name} onClick={(e) => e.stopPropagation()}>
      <div className="cmp-repair-head"><span aria-hidden="true">{h}</span><b>{name}</b><button type="button" aria-label="ปิด" onClick={() => { clickSound(); onClose(); }}>✕</button></div>
      {body}
    </div>
  );
}
