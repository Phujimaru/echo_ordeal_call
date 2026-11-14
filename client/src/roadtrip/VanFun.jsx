// Road Trip — กิจกรรมกับเพื่อนในรถตู้ระหว่างขับ (server/roadtrip/vanfun.js · state.roadtrip.fun · คำสั่ง rt:fun { a })
//  แถบไอคอนขวา (โต๊ะเต๋า · กีตาร์ · เตาปิ้ง · กล้องส่อง · ตู้เย็น · กล่องเครื่องมือ) = กดเหมือนคลิกของในรถ 3D (server เดินไปให้เอง)
//  แผงกลางล่าง: วงเต๋า (กอง/คนในวง/ลูกเต๋าทอย) · วงดนตรี (ทางโน้ต 3 เลน J K L) · เตาปิ้ง (เกจสุก · F พลิก/เสิร์ฟ) · ซ่อมรถ (หลอดคืบหน้า)
//  แถบบนกลาง: กล่องข้างทาง (ผู้ส่องเห็นทุกกล่อง · R ปักหมุด · คนขับเห็นหมุดเลน) · ป้ายลอยผลลัพธ์จาก fx "fun"
//  กฎ CLAUDE.md: บนจอมีแค่ชื่อ/ตัวเลข/ไอคอน · คำอธิบายอยู่ในกล่องชี้ (rtTip) · คีย์ใช้ e.code (แป้นไทยกดได้)
//  เสียง: วงดนตรีสังเคราะห์ (Web Audio — ไม่มีไฟล์ใหม่) · วิทยุเบาลงระหว่างเพลง (radio.setDuck) · คลิปวีดีโอเล่นอยู่ = เงียบ
import { useEffect, useMemo, useRef, useState } from "react";
import { rtEmit, serverNow } from "./rtSocket";
import { tip } from "./rtTip";
import * as radio from "./radio";
import { clickSound, masterGain, channelGain, isMusicSuspended } from "../audio";
import "./VanFun.css";

// ของในรถ 3D (van3d PROP_TILE key) → กิจกรรม
export const FUN_PROPS = new Set(["table", "guitar", "grill", "binoc", "fridge", "tool"]);
const LANE_KEYS = ["KeyJ", "KeyK", "KeyL"];
const LANE_LABEL = ["J", "K", "L"];
const LANE_ARROW = { "-1": "←", 0: "↑", 1: "→" };
const AHEAD_MS = 1700; // ทางโน้ต: เห็นล่วงหน้า
const emit = (o) => rtEmit("rt:fun", o);

const I = {
  dice: <svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="4" /><circle cx="8.5" cy="8.5" r="1.3" /><circle cx="15.5" cy="15.5" r="1.3" /><circle cx="12" cy="12" r="1.3" /></svg>,
  guitar: <svg viewBox="0 0 24 24"><path d="M14 10l6-6M18 2l4 4" /><path d="M14 10c-2-2-6-1-7 2-3 0-5 2-4 5s4 5 7 4c3-1 3-3 3-5 3-1 3-4 1-6z" /><circle cx="9" cy="15" r="1.5" /></svg>,
  grill: <svg viewBox="0 0 24 24"><path d="M3 10h18a9 9 0 0 1-18 0z" /><path d="M8 19l-2 3M16 19l2 3M8 3c-1 2 1 3 0 5M12 3c-1 2 1 3 0 5M16 3c-1 2 1 3 0 5" /></svg>,
  binoc: <svg viewBox="0 0 24 24"><circle cx="6.5" cy="15.5" r="4" /><circle cx="17.5" cy="15.5" r="4" /><path d="M10.5 15h3M4 12l2-7h3l1 7M20 12l-2-7h-3l-1 7" /></svg>,
  fridge: <svg viewBox="0 0 24 24"><rect x="5" y="2.5" width="14" height="19" rx="2" /><path d="M5 9.5h14M8 5.5v2M8 12.5v4" /></svg>,
  tool: <svg viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z" /></svg>,
  coin: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" /><path d="M12 8v8M9.5 10h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4" /></svg>,
};
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
function Die({ v, rolling, big }) {
  const on = new Set(PIPS[v] || []);
  return <span className="rtf-die" data-roll={rolling ? "true" : "false"} data-big={big ? "true" : "false"}>{Array.from({ length: 9 }, (_, i) => <i key={i} data-on={on.has(i) ? "true" : "false"} />)}</span>;
}

// ---------------------------------------------------------------- เสียงวงดนตรี (Web Audio สังเคราะห์ · สร้างครั้งเดียว)
let AC = null, BUS = null;
function ac() {
  if (AC) return AC;
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); BUS = AC.createGain(); BUS.connect(AC.destination); } catch { AC = null; }
  return AC;
}
function busLevel() { return isMusicSuspended() ? 0 : 0.5 * masterGain() * channelGain("music"); }
const NOTE_HZ = [[196, 247, 294], [220, 277, 330], [247, 311, 370]]; // เลน × คอร์ด
function pluck(at, lane, loud = 0.25, bright = false) {
  const a = ac(); if (!a) return;
  const t = Math.max(a.currentTime, at), hz = NOTE_HZ[lane % 3];
  for (let k = 0; k < (bright ? 3 : 2); k++) {
    const o = a.createOscillator(), g = a.createGain();
    o.type = bright ? "sawtooth" : "triangle"; o.frequency.value = hz[k] * (bright ? 2 : 1);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(loud / (k + 1), t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + (bright ? 0.35 : 0.6));
    o.connect(g); g.connect(BUS); o.start(t); o.stop(t + 0.7);
  }
}
function kick(at) {
  const a = ac(); if (!a) return;
  const t = Math.max(a.currentTime, at), o = a.createOscillator(), g = a.createGain();
  o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.18);
  g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
  o.connect(g); g.connect(BUS); o.start(t); o.stop(t + 0.3);
}

export default function VanFun({ state, amDriver, funApi, onToast }) {
  const rt = (state && state.roadtrip) || {};
  const f = rt.fun || null;
  const me = state ? state.youId : null;
  const players = (state && state.players) || [];
  const pl = (id) => players.find((x) => x.id === id) || null;
  const mine = pl(me);
  const alive = !!mine && mine.alive !== false;
  const [picker, setPicker] = useState(false);
  const [, setNow] = useState(0);
  const fRef = useRef(f); fRef.current = f;
  const meRef = useRef(me); meRef.current = me;

  const timed = !!f && !!(f.dice || f.jam || f.grill || f.repair || (f.loot && f.loot.length));
  useEffect(() => { if (!timed) return undefined; const t = setInterval(() => setNow((n) => n + 1), 200); return () => clearInterval(t); }, [timed]);
  const now = serverNow();

  // ---- กดกิจกรรม (แถบไอคอน / คลิกของ 3D)
  const act = (key) => {
    const F = fRef.current, id = meRef.current;
    if (!F) return;
    clickSound();
    if (key === "table") {
      if (F.dice && !F.dice.result) { if (!F.dice.ids.includes(id)) emit({ a: "diceJoin" }); }
      else if (!F.dice) setPicker((v) => !v);
    } else if (key === "guitar") {
      if (F.jam && !F.jam.result) { if (F.jam.ids[id] == null) emit({ a: "jamJoin" }); }
      else if (!F.jam && !F.jamUsed) emit({ a: "jam" });
    } else if (key === "grill") {
      const g = F.grill;
      if (!g) emit({ a: "grill" });
      else if (g.state === "cook") { if (g.by === id) emit({ a: "grillFlip" }); else if (!g.ids.includes(id)) emit({ a: "grillJoin" }); }
      else if (g.state === "served" && !g.took.includes(id)) emit({ a: "grillTake" });
    } else if (key === "binoc") emit({ a: "spot" });
    else if (key === "fridge") emit({ a: "drink" });
    else if (key === "tool") emit({ a: "repair" });
  };
  if (funApi) funApi.current = { prop: act };

  // ---- ป้ายลอยผลลัพธ์ (fx fun) — เห็นครั้งแรก = ของเก่าข้าม
  const seen = useRef(null);
  useEffect(() => {
    const list = Array.isArray(rt.fx) ? rt.fx : [];
    if (!seen.current) { seen.current = new Set(list.map((x) => x.key)); return; }
    for (const x of list) {
      if (seen.current.has(x.key)) continue;
      seen.current.add(x.key);
      if (x.k !== "fun" || !onToast) continue;
      const who = pl(x.id), nm = who ? who.name : "";
      if (x.f === "lootGet") onToast({ icon: "📦", text: `+${x.coin} 🪙${x.item ? ` · ${x.item}` : ""}`, good: true });
      else if (x.f === "lootMiss") onToast({ icon: "📦", text: "✕" });
      else if (x.f === "drink") onToast({ icon: "🥤", text: `${nm} ${x.hp ? `+${x.hp} ❤` : "✦"}`, good: true });
      else if (x.f === "grillTake") onToast({ icon: "🍖", text: `${nm} ${x.hp ? `+${x.hp} ❤` : `+${x.ar} 🛡`}`, good: true });
      else if (x.f === "grillBurnt") onToast({ icon: "💨", text: "🍖 ✕" });
      else if (x.f === "repairDone") onToast({ icon: "🔧", text: `+${x.hp} 🚐`, good: true });
      else if (x.f === "jamStart") onToast({ icon: "🎸", text: nm });
      else if (x.f === "diceOpen") onToast({ icon: "🎲", text: `${nm} · ${x.ante} 🪙` });
      else if (x.f === "grillStart") onToast({ icon: "🍖", text: nm });
    }
    if (seen.current.size > 300) seen.current = new Set([...seen.current].slice(-150));
  }, [rt.fx]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- วิทยุเบาลงระหว่างวงดนตรี
  const jamOn = !!(f && f.jam && !f.jam.result);
  useEffect(() => { radio.setDuck(jamOn); return () => radio.setDuck(false); }, [jamOn]);

  // ---- คีย์: F พลิก/เสิร์ฟ (คนย่าง) · R ปักหมุดกล่องที่ใกล้สุด (ผู้ส่อง)
  useEffect(() => {
    const onKey = (e) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.activeElement;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      const F = fRef.current, id = meRef.current;
      if (!F) return;
      if (e.code === "KeyF" && F.grill && F.grill.state === "cook" && F.grill.by === id) { e.preventDefault(); emit({ a: "grillFlip" }); return; }
      if (e.code === "KeyR" && F.spot && F.spot.includes(id)) {
        const l = (F.loot || []).filter((x) => !x.marked).sort((a, b) => a.at - b.at)[0];
        if (l) { e.preventDefault(); emit({ a: "mark", id: l.id }); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (import.meta.env.DEV && typeof window !== "undefined") window.__rtFun = { fun: f, serverNow, act, me };
  if (!f || rt.phase === "intro") return null;

  const dice = f.dice, jam = f.jam, grill = f.grill, rep = f.repair;
  const inJam = !!jam && jam.ids[me] != null;
  const spotting = (f.spot || []).includes(me);
  const cd = (ms) => Math.max(0, Math.ceil(ms / 1000));
  const dock = [
    { key: "table", icon: I.dice, name: "วงเต๋า", on: !!dice && dice.ids.includes(me), badge: dice ? dice.pot : null, off: !!dice && (!!dice.result || dice.ids.includes(me)), desc: "ทุกคนลงเหรียญเท่ากัน ทอยเต๋า 2 ลูก แต้มสูงสุดกินกอง · เล่นคนเดียว = แข่งเจ้ามือ" },
    { key: "guitar", icon: I.guitar, name: "วงดนตรี", on: inJam, badge: null, off: (!jam && f.jamUsed) || (!!jam && (!!jam.result || inJam)), desc: "เพลง 20 วิ · กด J K L ตามโน้ต · เล่นด้วยกันหลายคน + แม่น = ทีมฮึกเหิมตอนสู้ครั้งหน้า · ช่วงขับละ 1 เพลง" },
    { key: "grill", icon: I.grill, name: "ปิ้งย่าง", on: !!grill && grill.ids.includes(me), badge: grill && grill.state === "served" ? grill.portions : f.grillLeft, off: !grill ? f.grillLeft <= 0 : grill.state === "served" ? grill.took.includes(me) : grill.state !== "cook" || (grill.ids.includes(me) && grill.by !== me), desc: `ขึ้นหลังคาไปย่าง · กด F พลิก/เสิร์ฟตอนสุกพอดี · คนมาร่วมเยอะ = ได้หลายที่ · รับ 1 ที่ = ❤ +${f.cfg.heal} (เต็มแล้ว = 🛡 +1) · ปล่อยนาน = ไหม้` },
    { key: "binoc", icon: I.binoc, name: "ส่องทาง", on: spotting, badge: null, off: false, desc: "ขึ้นหลังคาส่องกล้อง เห็นกล่องของข้างทางก่อนใคร · R ปักหมุดให้คนขับเห็นเลน · รถวิ่งผ่านเลนนั้น = ทุกคนได้เหรียญ" },
    { key: "fridge", icon: I.fridge, name: "ตู้เย็น", on: false, badge: f.fridge, off: f.fridge <= 0, desc: `เครื่องดื่มเย็น 1 ขวด = ล้างสถานะผิดปกติ 1 อย่าง หรือ ❤ +${f.cfg.drinkHeal} · เติมเต็มที่ปั๊ม` },
    { key: "tool", icon: I.tool, name: "ซ่อมรถ", on: !!rep && rep.ids.includes(me), badge: f.repairCd > 0 ? cd(f.repairCd) : null, off: f.repairCd > 0 || (rt.van && rt.van.hp >= rt.van.hpMax), desc: `ยืนซ่อมที่กล่องเครื่องมือ 5 วิ = รถ +${f.cfg.repairHp} · ช่วยกันสองคนเร็วขึ้นเท่าตัว · พัก 20 วิ` },
  ];
  const showDock = !amDriver;
  const visLoot = (f.loot || []).filter((l) => l.at - now > -500);

  return (
    <>
      {showDock && (
        <div className="rtf-dock" role="toolbar">
          {dock.map((d) => (
            <button key={d.key} type="button" className="rtf-dbtn" data-on={d.on ? "true" : "false"} disabled={!alive || d.off} onClick={() => act(d.key)} {...tip(d.desc, d.name)}>
              {d.icon}{d.badge != null && <b>{d.badge}</b>}
            </button>
          ))}
          {picker && !dice && (
            <div className="rtf-ante">
              {f.cfg.antes.map((n) => (
                <button key={n} type="button" disabled={(mine && (mine.gold || 0) < n) || !alive} onClick={() => { clickSound(); setPicker(false); emit({ a: "dice", ante: n }); }} {...tip(`ลงคนละ ${n} เหรียญ`, `${n} 🪙`)}>{I.coin}<b>{n}</b></button>
              ))}
            </div>
          )}
        </div>
      )}
      {visLoot.length > 0 && <LootStrip loot={visLoot} now={now} spotting={spotting} lane={rt.van ? rt.van.lane : 0} amDriver={amDriver} />}
      <div className="rtf-stack">
        {dice && <DicePanel dice={dice} now={now} me={me} pl={pl} alive={alive && !amDriver} gold={mine ? mine.gold || 0 : 0} max={f.cfg.diceMax} />}
        {jam && <JamPanel jam={jam} now={now} me={me} pl={pl} cfg={f.cfg} canJoin={alive && !amDriver && !inJam && !jam.result && jam.endAt - now > f.cfg.joinCutMs} />}
        {grill && <GrillPanel g={grill} now={now} me={me} pl={pl} cfg={f.cfg} alive={alive && !amDriver} full={!!mine && mine.hp >= mine.maxHp && mine.armor >= mine.maxArmor} />}
        {rep && <RepairBar r={rep} now={now} pl={pl} />}
      </div>
      {spotting && <div className="rtf-binoc" aria-hidden="true" />}
    </>
  );
}

// ---------------------------------------------------------------- กล่องข้างทาง
function LootStrip({ loot, now, spotting, lane, amDriver }) {
  return (
    <div className="rtf-loot">
      {loot.map((l) => {
        const s = Math.max(0, Math.ceil((l.at - now) / 1000)), inLane = l.lane === lane;
        return (
          <button key={l.id} type="button" className="rtf-lchip" data-marked={l.marked ? "true" : "false"} data-lane={inLane ? "true" : "false"} data-drv={amDriver ? "true" : "false"}
            disabled={!spotting || !!l.marked} onClick={() => { clickSound(); emit({ a: "mark", id: l.id }); }}
            {...tip(spotting && !l.marked ? "ปักหมุดให้คนขับเห็นเลน (R)" : "รถวิ่งผ่านเลนนี้ = เก็บได้", l.kind === "item" ? "กล่องไอเทม" : "กล่องเหรียญ")}>
            <span className="rtf-lic">{l.hidden ? "📍" : l.kind === "item" ? "🎁" : "📦"}</span>
            <b className="rtf-arrow">{LANE_ARROW[String(l.lane)]}</b>
            <em>{s}</em>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- วงเต๋า
function DicePanel({ dice, now, me, pl, alive, gold, max }) {
  const res = dice.result;
  const [roll, setRoll] = useState(false);
  const key = res ? res.until : 0;
  useEffect(() => { if (!key) return undefined; setRoll(true); const t = setTimeout(() => setRoll(false), 1000); return () => clearTimeout(t); }, [key]);
  const left = Math.max(0, Math.ceil((dice.at - now) / 1000));
  const canJoin = alive && !res && !dice.ids.includes(me) && dice.ids.length < max && gold >= dice.ante;
  const rows = res && res.house ? [...dice.ids, "house"] : dice.ids;
  return (
    <div className="rtf-panel rtf-dice">
      <div className="rtf-head">{I.dice}<b>{dice.pot}</b>{I.coin}<span className="rtf-sub">{dice.ante} 🪙</span>{!res && <em className="rtf-cd">{left}</em>}</div>
      <div className="rtf-rows">
        {rows.map((id) => {
          const p = id === "house" ? null : pl(id), r = res ? (id === "house" ? res.house : res.rolls[id]) : null, win = res && res.win.includes(id);
          const g = res && id !== "house" ? res.gain[id] : null;
          return (
            <div key={id} className="rtf-row" data-win={win ? "true" : "false"} data-me={id === me ? "true" : "false"}>
              <Face p={p} house={id === "house"} />
              <span className="rtf-nm">{id === "house" ? "เจ้ามือ" : p ? p.name : ""}</span>
              {r ? <span className="rtf-dice2"><Die v={r[0]} rolling={roll} big /><Die v={r[1]} rolling={roll} big />{!roll && <b>{r[0] + r[1]}</b>}</span> : <span className="rtf-wait">🎲</span>}
              {g != null && !roll && <em className="rtf-gain" data-up={g > 0 ? "true" : g < 0 ? "false" : "zero"}>{g > 0 ? `+${g}` : g}</em>}
            </div>
          );
        })}
      </div>
      {canJoin && <button type="button" className="rtf-join" onClick={() => { clickSound(); emit({ a: "diceJoin" }); }}>เข้าร่วม · {dice.ante} 🪙</button>}
    </div>
  );
}
function Face({ p, house }) {
  return <span className="rtf-face" style={p && p.color ? { "--pc": p.color } : undefined}>{house ? "🎩" : p && p.img ? <img src={p.img} alt="" onError={(e) => { e.currentTarget.style.display = "none"; }} /> : null}</span>;
}

// ---------------------------------------------------------------- วงดนตรี (ทางโน้ต 3 เลน)
function JamPanel({ jam, now, me, pl, cfg, canJoin }) {
  const inJam = jam.ids[me] != null;
  const res = jam.result;
  const cvRef = useRef(null);
  const hitRef = useRef({ seed: null, hit: new Set(), flash: [0, 0, 0], judge: null, judgeAt: 0 });
  const jamRef = useRef(jam); jamRef.current = jam;
  const [judge, setJudge] = useState(null);
  const playing = !res && now < jam.endAt + 500;
  // เสียงวงดนตรี: กลอง + กีตาร์ตามโน้ต (ทุกเครื่องได้ยินพร้อมกัน — ตั้งตามนาฬิกา server)
  useEffect(() => {
    if (!playing) return undefined;
    const a = ac(); if (!a) return undefined;
    if (a.state === "suspended") a.resume().catch(() => {});
    const done = new Set(); const beat = 60000 / jam.bpm;
    const t = setInterval(() => {
      const J = jamRef.current; if (!J || J.result) return;
      BUS.gain.value = busLevel();
      const sn = serverNow(), horizon = sn + 250;
      for (let b = 0; J.startAt + b * beat <= J.endAt; b++) {
        const at = J.startAt + b * beat; if (at < sn - 50 || at > horizon || done.has(`b${b}`)) continue;
        done.add(`b${b}`); kick(a.currentTime + (at - sn) / 1000);
      }
      J.chart.forEach(([ms, lane], i) => {
        const at = J.startAt + ms; if (at < sn - 50 || at > horizon || done.has(i)) return;
        done.add(i); pluck(a.currentTime + (at - sn) / 1000, lane, 0.12);
      });
    }, 60);
    return () => clearInterval(t);
  }, [playing, jam.startAt]); // eslint-disable-line react-hooks/exhaustive-deps

  // ปุ่ม J K L (e.code) → โน้ตที่ใกล้สุดในเลนนั้น
  useEffect(() => {
    if (!inJam || res) return undefined;
    const H = hitRef.current;
    if (H.seed !== jam.startAt) { H.seed = jam.startAt; H.hit = new Set(); }
    const press = (lane) => {
      const J = jamRef.current; if (!J) return;
      const sn = serverNow();
      let best = -1, bd = Infinity;
      J.chart.forEach(([ms, ln], i) => { if (ln !== lane || H.hit.has(i)) return; const d = Math.abs(J.startAt + ms - sn); if (d < bd) { bd = d; best = i; } });
      H.flash[lane] = performance.now();
      const a = ac(); if (a) { BUS.gain.value = busLevel(); pluck(a.currentTime, lane, 0.2, true); }
      if (best < 0 || bd > cfg.goodMs) { H.judge = "miss"; setJudge({ k: "miss", t: Date.now() }); return; }
      H.hit.add(best);
      const k = bd <= cfg.perfectMs ? "perfect" : "good";
      setJudge({ k, t: Date.now() });
      emit({ a: "jamHit", i: best, off: Math.round(J.startAt + J.chart[best][0] - sn) });
    };
    const onKey = (e) => {
      const lane = LANE_KEYS.indexOf(e.code);
      if (lane < 0 || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.activeElement;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      e.preventDefault(); press(lane);
    };
    window.addEventListener("keydown", onKey);
    hitRef.current.press = press;
    return () => window.removeEventListener("keydown", onKey);
  }, [inJam, !!res, jam.startAt]); // eslint-disable-line react-hooks/exhaustive-deps

  // วาดทางโน้ต (rAF เฉพาะตอนเล่นอยู่ · ไม่สร้างอ็อบเจกต์ต่อเฟรม)
  useEffect(() => {
    if (!inJam || res) return undefined;
    const cv = cvRef.current; if (!cv) return undefined;
    const g = cv.getContext("2d"), W = cv.width, Hh = cv.height, lw = W / 3, hitY = Hh - 26;
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const J = jamRef.current, H = hitRef.current, sn = serverNow(), pn = performance.now();
      g.clearRect(0, 0, W, Hh);
      for (let l = 0; l < 3; l++) {
        g.fillStyle = l % 2 ? "rgba(255,255,255,.05)" : "rgba(255,255,255,.08)"; g.fillRect(l * lw, 0, lw, Hh);
        const fl = Math.max(0, 1 - (pn - H.flash[l]) / 180);
        g.fillStyle = `rgba(255,190,90,${0.25 + fl * 0.6})`; g.fillRect(l * lw + 6, hitY - 4, lw - 12, 8);
      }
      for (let i = 0; i < J.chart.length; i++) {
        const dt = J.startAt + J.chart[i][0] - sn;
        if (dt > AHEAD_MS || dt < -250) continue;
        if (H.hit.has(i)) continue;
        const y = hitY - (dt / AHEAD_MS) * (hitY - 8), l = J.chart[i][1];
        g.fillStyle = ["#ff6b6b", "#ffd166", "#4cc9f0"][l];
        g.beginPath(); g.arc(l * lw + lw / 2, y, 11, 0, Math.PI * 2); g.fill();
      }
      const pre = J.startAt - sn;
      if (pre > 0) { g.fillStyle = "#fff"; g.font = "800 40px Kanit, sans-serif"; g.textAlign = "center"; g.fillText(String(Math.ceil(pre / 1000)), W / 2, Hh / 2); }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [inJam, !!res, jam.startAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const left = Math.max(0, Math.ceil((jam.endAt - now) / 1000));
  const ids = Object.keys(jam.ids);
  const notes = jam.chart.length;
  return (
    <div className="rtf-panel rtf-jam">
      <div className="rtf-head">{I.guitar}<b>{res ? `${res.acc}%` : left}</b>{!res && <span className="rtf-sub">{notes} ♪</span>}</div>
      <div className="rtf-crew">
        {ids.map((id) => { const p = pl(id); return <span key={id} className="rtf-chip" data-me={id === me ? "true" : "false"}><Face p={p} /><b>{Math.round((jam.ids[id] / Math.max(1, notes)) * 100)}%</b></span>; })}
      </div>
      {inJam && !res && (
        <div className="rtf-hw">
          <canvas ref={cvRef} width={264} height={170} />
          <div className="rtf-keys">{LANE_LABEL.map((k, i) => <button key={k} type="button" onPointerDown={(e) => { e.preventDefault(); hitRef.current.press && hitRef.current.press(i); }}>{k}</button>)}</div>
          {judge && <em key={judge.t} className="rtf-judge" data-k={judge.k}>{judge.k === "perfect" ? "เป๊ะ!" : judge.k === "good" ? "ดี" : "พลาด"}</em>}
        </div>
      )}
      {res && (
        <div className="rtf-res">
          <span className="rtf-stars">{[1, 2, 3].map((n) => <i key={n} data-on={res.tier >= n ? "true" : "false"}>★</i>)}</span>
          {res.buffs.map((b, i) => <span key={i} className="rtf-buff" {...tip(`สู้ครั้งหน้า ${b.turns} เทิร์น`, b.name)}>{b.key === "might" ? `⚔ +${b.amt}` : `💨 ${b.amt}%`}<small>{b.turns}</small></span>)}
        </div>
      )}
      {canJoin && <button type="button" className="rtf-join" onClick={() => { clickSound(); emit({ a: "jamJoin" }); }}>เข้าร่วม</button>}
    </div>
  );
}

// ---------------------------------------------------------------- เตาปิ้ง
function GrillPanel({ g, now, me, pl, cfg, alive, full }) {
  const k = g.state === "cook" ? Math.max(0, Math.min(1.05, (now - g.t0) / g.len)) : 1;
  const cook = g.by === me;
  const mid = (cfg.win[0] + cfg.win[1]) / 2;
  const zone = k < cfg.win[0] ? "raw" : k <= cfg.win[1] ? "ready" : "burn";
  const canJoin = alive && g.state === "cook" && !g.ids.includes(me) && g.ids.length < cfg.grillMax;
  const canTake = alive && !full && g.state === "served" && g.portions > 0 && !g.took.includes(me); // เลือด+เกราะเต็ม = ไม่มีปุ่ม (server ไม่ให้รับ)
  const stateIcon = g.state === "burnt" ? "💨" : g.state === "served" || g.state === "done" ? "🍖" : "🔥";
  return (
    <div className="rtf-panel rtf-grill" data-state={g.state}>
      <div className="rtf-head">{I.grill}<b>{stateIcon}</b>{g.state === "served" && <span className="rtf-sub">× {g.portions}</span>}{g.state === "cook" && <span className="rtf-sub">{g.stage + 1}/2</span>}</div>
      <div className="rtf-crew">{g.ids.map((id) => <span key={id} className="rtf-chip" data-me={id === me ? "true" : "false"} data-took={g.took.includes(id) ? "true" : "false"}><Face p={pl(id)} />{id === g.by && <b>👨‍🍳</b>}</span>)}</div>
      {g.state === "cook" && (
        <div className="rtf-gauge" data-zone={zone}>
          <span className="rtf-win" style={{ left: `${cfg.win[0] * 100}%`, width: `${(cfg.win[1] - cfg.win[0]) * 100}%` }} />
          <span className="rtf-mid" style={{ left: `${mid * 100}%` }} />
          <i style={{ left: `${Math.min(100, k * 100)}%` }} />
        </div>
      )}
      {g.marks.length > 0 && <div className="rtf-marks">{g.marks.map((m, i) => <span key={i} data-m={m}>{m === "perfect" ? "★" : m === "good" ? "✓" : m === "raw" ? "✕" : "…"}</span>)}</div>}
      {cook && g.state === "cook" && <button type="button" className="rtf-join rtf-flip" data-zone={zone} onClick={() => { clickSound(); emit({ a: "grillFlip" }); }} {...tip("กดตอนเข็มอยู่ในแถบสีเขียว (กลางแถบ = พิเศษ)", "F")}>{g.stage === 0 ? "พลิก" : "เสิร์ฟ"} · F</button>}
      {canJoin && <button type="button" className="rtf-join" onClick={() => { clickSound(); emit({ a: "grillJoin" }); }}>เข้าร่วม</button>}
      {canTake && <button type="button" className="rtf-join" onClick={() => { clickSound(); emit({ a: "grillTake" }); }}>รับ 🍖</button>}
    </div>
  );
}

// ---------------------------------------------------------------- ซ่อมรถ
function RepairBar({ r, now, pl }) {
  const prog = Math.min(1, (r.prog + Math.max(0, now - r.at) * r.ids.length) / r.need);
  return (
    <div className="rtf-panel rtf-rep">
      <div className="rtf-head">{I.tool}<span className="rtf-crew">{r.ids.map((id) => <span key={id} className="rtf-chip"><Face p={pl(id)} /></span>)}</span><b>×{r.ids.length}</b></div>
      <div className="rtf-bar"><i style={{ width: `${prog * 100}%` }} /></div>
    </div>
  );
}

// ป้ายลอยผลลัพธ์ (RoadDrive วาง) — useToasts คืน [list, push]
export function useFunToasts() {
  const [list, setList] = useState([]);
  const push = useMemo(() => (t) => {
    const k = Date.now() + Math.random();
    setList((l) => [...l.slice(-3), { ...t, k }]);
    setTimeout(() => setList((l) => l.filter((x) => x.k !== k)), 2600);
  }, []);
  return [list, push];
}
export function FunToasts({ list }) {
  if (!list.length) return null;
  return <div className="rtf-toasts">{list.map((t) => <span key={t.k} className="rtf-toast" data-good={t.good ? "true" : "false"}><i>{t.icon}</i>{t.text}</span>)}</div>;
}
