// ฉากศาล (presentational) — ห้องพิจารณาคดี 16:9: ภาพ 256×192 หน่วยกลางจอ + ขอบเบลอ · ใช้ทั้ง CourtOverlay (เกมจริง) และหน้าทดสอบ
//  useCourtDirector(court, cast) = เล่น beat.steps ตามลำดับ (naruhodo-contract.md) + ภาพประจำ phase (ให้การ/ซักค้าน/ประชาชน)
//  CourtStage({ v, cast, onClick }) = วาดฉากจากสถานะภาพ v
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ATLAS, IMG } from "./courtAssets";
import { EvidenceIcon } from "./EvidenceIcon";
import { Rich, plain } from "./CourtText";
import { csfx, setClipLock } from "./courtAudio";
import { suspendMusic, videoVolume, onVolumeChange } from "../audio";
import { courtMuted } from "./courtSfx";
import { stepMs, PAN_MS, BANNER_MS, TESTIFY_LINE_MS } from "./courtSteps";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
class Cancel extends Error {}

// ท่าของนารุโฮโดะ/ผู้พิพากษา: [ตอนเงียบ, ตอนพูด]
export const LPOSE = {
  normal: ["idle", "talk"], nervous: ["nervous", "nervousTalk"], shut: ["nervousShut", "nervousTalk"], think: ["think", "thinkTalk"],
  desk: ["desk", "deskTalk"], point: ["point", "pointTalk"], paper: ["paper", "paperTalk"], confident: ["confident", "confidentTalk"],
  sheepish: ["sheepish", "sheepishTalk"], close: ["close", "closeTalk"],
};
export const JPOSE = { normal: ["idle", "talk"], surprised: ["surprised", "surprisedTalk"], angry: ["angry", "angryTalk"] };
const SIDE = { defense: 128, witness: 648, prosecution: 1168 }; // จุดกลางแต่ละฝั่งในภาพแพน bg_pan (กว้าง 1296)
const CAM_OF = { L: "defense", D: "witness", C: "prosecution", J: "judge", T: "cocounsel" };
const SHOUT_IMG = { objection: "shout_objection", holdit: "shout_holdit", takethat: "shout_takethat", matta: "shout_holdit_jp" };
const BLIP = { L: "blip_mid", J: "blip_low" };
const PRELOAD = ["bg_wide", "bg_defense", "bg_witness", "bg_prosecution", "bg_judge", "bg_cocounsel", "bg_pan", "desk_defense", "desk_prosecution", "stand_witness",
  "gavel_0", "gavel_1", "gavel_2", "gavel_3", "gavel_4", "gavel_5", "lines_top", "lines_bottom", "ui_title", "ui_top", "ui_bottom", "ui_cross", "ui_talk",
  "shout_objection", "shout_holdit", "shout_takethat", "shout_holdit_jp", "evidence"];
let preloaded = null;
export function preloadCourt(extra = []) {
  if (!preloaded) preloaded = [...PRELOAD.map(IMG), ATLAS.naruhodo.src, ATLAS.judge.src].map((s) => { const i = new Image(); i.src = s; i.decode?.().catch(() => {}); return i; });
  for (const s of extra) if (s) { const i = new Image(); i.src = s; }
}

// ---------- ชิ้นส่วนภาพ ----------
export function Sprite({ atlas, anim, x, bottom = 0, scale = 1, active = true, onEnd }) {
  const A = ATLAS[atlas], m = A.anims[anim] || A.anims.idle;
  const [f, setF] = useState(0);
  const endRef = useRef(onEnd); endRef.current = onEnd;
  useEffect(() => {
    setF(0);
    if (!active) return undefined;
    let i = 0;
    const t = setInterval(() => {
      i++;
      if (i >= m.n) { if (m.loop) i = 0; else { clearInterval(t); endRef.current && endRef.current(); return; } }
      setF(i);
    }, 1000 / m.fps);
    return () => clearInterval(t);
  }, [atlas, anim, m.n, m.fps, m.loop, active]);
  const u = (n) => `calc(var(--u) * ${n})`;
  return (
    <div className="csprite" style={{
      left: u(x - m.ax * scale), bottom: u(bottom), width: u(m.w * scale), height: u(m.h * scale),
      backgroundImage: `url(${A.src})`, backgroundSize: `${u(A.W * scale)} ${u(A.H * scale)}`,
      backgroundPosition: `${u(-Math.min(f, m.n - 1) * m.w * scale)} ${u(-m.y * scale)}`,
    }} />
  );
}

export function Scene({ bg, on, children, cls = "" }) {
  return (
    <div className={`cscene ${cls} ${on ? "" : "off"}`}>
      <img className="cside" src={IMG(bg)} alt="" />
      <div className="cvig" />
      <div className="cframe"><img className="cbg" src={IMG(bg)} alt="" />{children}</div>
    </div>
  );
}

// ภาพหมากของผู้เล่น (ปกตัวละคร) ครอปเข้าแท่น · โหลดไม่ได้ = เงาดำ
export function Piece({ p, cls = "", flip, onInfo }) {
  const [bad, setBad] = useState(false);
  useEffect(() => setBad(false), [p?.img]);
  if (!p) return null;
  return (
    <div className={`cpiece ${cls} ${onInfo ? "cinfoable" : ""}`} onClick={onInfo ? (e) => { e.stopPropagation(); onInfo(p.id); } : undefined}>
      {p.img && !bad
        ? <img src={p.img} alt="" draggable={false} onError={() => setBad(true)} style={flip ? { transform: "scaleX(-1)" } : null} />
        : <div className="cshadow"><span>{(p.name || "?").slice(0, 1)}</span></div>}
    </div>
  );
}

// ---------- ผู้กำกับฉาก ----------
const INIT = {
  cam: "title", pan: null, standId: null, coId: null, proId: null, lp: null, lOne: null, jp: null, jOne: null,
  dlg: null, shout: null, gavel: -1, banner: null, flash: 0, quake: 0, pop: null, present: null, presentBox: false,
  rx: {}, toss: [], splat: null, kicked: [], verdict: null, clash: null, defFx: "", lastWho: null,
};

export function useCourtDirector(court, cast, viewerSide) {
  const [v, setV] = useState(INIT);
  const set = useCallback((p) => setV((o) => ({ ...o, ...(typeof p === "function" ? p(o) : p) })), []);
  const run = useRef(0);
  const cur = useRef("title");
  const skip = useRef(null);
  const oneRes = useRef({});
  const lastBanner = useRef(0);
  const clipEnd = useRef(null);
  const [busy, setBusy] = useState(false);
  const [shownCred, setShownCred] = useState(court?.cred || { L: 5, D: 5 });
  const ctx = useRef({}); ctx.current = { court, cast, viewerSide };
  useEffect(() => () => { run.current++; }, []);

  const P = useMemo(() => {
    const G = (id) => { if (id !== run.current) throw new Cancel(); };
    const sleep = async (ms, id) => { if (ms > 0) await wait(ms); G(id); };
    const goto = async (cam, id, who) => {
      G(id);
      const patch = {};
      if (who !== undefined) { if (cam === "witness") patch.standId = who; if (cam === "cocounsel") patch.coId = who; if (cam === "prosecution") patch.proId = who; }
      else if (cam === "witness") patch.standId = null;
      const from = cur.current;
      let t = 0;
      if (from in SIDE && cam in SIDE && from !== cam) { csfx("whoosh"); set({ dlg: null, pan: { from, to: cam, k: Date.now() } }); await sleep(PAN_MS, id); t = PAN_MS; }
      cur.current = cam;
      set((o) => ({ ...patch, cam, dlg: null, pan: null, present: null, presentBox: false, splat: null, ...(o.lp === "close" ? { lp: null } : {}) }));
      return t;
    };
    const one = (who, anim, max, id) => new Promise((res) => {
      if (id !== run.current) { res(); return; }
      const key = who === "L" ? "lOne" : "jOne";
      const done = () => { if (oneRes.current[who] === res) { oneRes.current[who] = null; set({ [key]: null }); res(); } };
      oneRes.current[who] = res; set({ [key]: anim });
      if (who === "L" && anim === "slam") csfx("desk_slam"); // ทุบโต๊ะ (เฟรม 0) — ระหว่างคลิปถูก clipLock ปิดเอง
      setTimeout(done, max);
    });
    const say = async (s, id) => {
      const ms = stepMs(s);
      const mono = s.who === "L" && /^\(/.test(s.text || "");
      let used = 0;
      let cam = mono || (s.who === "L" && cur.current === "lines") ? null : CAM_OF[s.who];
      if (s.who === "G") cam = ["cocounsel", "witness", "wide"].includes(cur.current) ? null : "cocounsel";
      if (s.who === "T" && s.id && cur.current === "cocounsel") cam = null;
      if (cam && cam !== cur.current) used += await goto(cam, id, s.id);
      else if (s.id && (s.who === "T" || s.who === "G") && cur.current === "cocounsel") set({ coId: s.id });
      const chars = Array.from(plain(s.text)); // นับเฉพาะตัวที่มองเห็น (ตัด « » ของชื่อสกิล)
      const per = Math.max(14, Math.min(40, (ms - used - 700) / Math.max(1, chars.length)));
      set({ dlg: { who: s.who, name: s.name || "", text: s.text || "", n: 0, color: s.color || "", done: false, mono }, lastWho: s.who });
      const t0 = performance.now();
      await new Promise((res) => {
        let n = 0;
        const blip = BLIP[s.who] || "blip_high";
        const iv = setInterval(() => {
          if (id !== run.current) { clearInterval(iv); res(); return; }
          n++; if (n % 2 && !mono && chars[n - 1] !== " ") csfx(blip);
          set((o) => ({ dlg: o.dlg && { ...o.dlg, n, done: n >= chars.length } }));
          if (n >= chars.length) { clearInterval(iv); skip.current = null; res(); }
        }, per);
        skip.current = () => { n = chars.length - 1; };
      });
      G(id);
      await sleep(ms - used - (performance.now() - t0), id);
    };
    const shout = async (s, id) => {
      const ms = stepMs(s);
      set({ dlg: null });
      const cam = CAM_OF[s.who] || (s.who === "G" ? "cocounsel" : null);
      if (cam) { cur.current = cam; set({ cam, pan: null, present: null, presentBox: false, ...(s.id && cam === "cocounsel" ? { coId: s.id } : {}) }); }
      set((o) => ({ shout: { kind: s.kind, k: Date.now(), who: s.who }, quake: o.quake + 1, flash: o.flash + 1, lastWho: s.who }));
      csfx(s.kind === "matta" ? "holdit" : s.kind);
      await sleep(ms, id);
      set({ shout: null });
      if (s.who === "L") {
        if (s.kind === "holdit") { set({ lp: "desk" }); one("L", "slam", 320, id); }
        else { set({ lp: "point" }); one("L", "pointIn", 220, id); }
      }
    };
    const gavel = async (s, id) => {
      set({ dlg: null });
      const n = s.n || 1, per = Math.max(420, stepMs(s) / n);
      for (let k = 0; k < n; k++) {
        for (const f of [1, 2, 3]) { set({ gavel: f }); await sleep(70, id); }
        set((o) => ({ gavel: 4, flash: o.flash + 1, quake: o.quake + 1 })); csfx("gavel");
        await sleep(per - 210, id);
      }
      set({ gavel: -1 });
    };
    const hurt = async (s, id) => {
      const ms = stepMs(s);
      const side = s.side;
      const pop = s.n ? { side, t: `−${s.n}`, k: Date.now(), bad: true } : null;
      if (side === "L") {
        if (cur.current !== "defense" && cur.current !== "lines") await goto("defense", id);
        csfx("penalty"); set((o) => ({ quake: o.quake + 1, pop, hurtk: Date.now() }));
        await one("L", "shock", Math.min(ms, 800), id);
        set({ lp: "nervous" });
      } else {
        if (cur.current !== "witness") await goto("witness", id);
        csfx("damage"); set((o) => ({ quake: o.quake + 1, flash: o.flash + 1, defFx: "hit", pop }));
        await sleep(Math.min(ms, 900), id);
        set({ defFx: "" });
      }
      if (ctx.current.court?.cred) setShownCred(ctx.current.court.cred);
      await sleep(Math.max(0, ms - 900), id);
      set({ pop: null });
    };
    const gallery = async (s, id) => {
      const ms = stepMs(s);
      if (cur.current !== "wide") await goto("wide", id);
      const rx = s.rx || [];
      const span = ms * 0.5, per = rx.length ? span / rx.length : 0;
      let tomL = false, tomD = false;
      for (const r of rx) {
        set((o) => ({ rx: { ...o.rx, [r.id]: { e: r.e, k: Date.now() + Math.random() } }, toss: r.e === "🍅" ? [...o.toss, { id: r.id, side: r.side, k: Date.now() + Math.random() }] : o.toss }));
        csfx(r.e === "👏" ? "crowd_cheer" : r.e === "👎" ? "crowd_boo" : "splat");
        if (r.e === "🍅") { if (r.side === "L") tomL = true; else tomD = true; }
        await sleep(per, id);
      }
      const rest = ms - span;
      if (tomL) { await goto("defense", id); csfx("splat"); set({ splat: { side: "L", k: Date.now() } }); await one("L", "hitByObject", Math.min(rest, 900), id); await sleep(rest - 900, id); }
      else if (tomD) { await goto("witness", id); csfx("splat"); set({ splat: { side: "D", k: Date.now() }, defFx: "hit" }); await sleep(Math.min(rest, 800), id); set({ defFx: "" }); await sleep(rest - 800, id); }
      else await sleep(rest, id);
      set({ rx: {}, toss: [] });
    };
    // ฉากเปลี่ยนขั้น (คำให้การ/ซักค้าน/รอบใหม่/ประชาชน/คำตัดสิน) — ไม่บล็อกขั้นถัดไป
    const trans = (kind, n) => {
      const k = Date.now() + Math.random();
      set({ trans: { kind, n, k } });
      csfx("whoosh");
      setTimeout(() => csfx(kind === "cross" ? "gavel" : kind === "test" ? "trial_open" : kind === "gallery" ? "crowd_cheer" : "gavel"), 260);
      setTimeout(() => set((o) => (o.trans && o.trans.k === k ? { trans: null } : {})), 1850);
    };
    const verdict = async (s, id) => {
      const ms = stepMs(s);
      set({ dlg: null });
      let used = 0;
      if (s.w === "guilty") { await goto("witness", id); set({ defFx: "break" }); csfx("damage"); await sleep(1300, id); used = 1300; }
      else { trans("verdict"); await sleep(1100, id); used = 1100; }
      const words = s.w === "guilty" ? ["มี", "ความผิด"] : s.w === "free" ? ["ไม่มี", "ความผิด"] : ["ยุติ", "คดี"];
      set({ verdict: { w: s.w, words, shown: 0 } });
      for (let i = 1; i <= words.length; i++) { await sleep(380, id); csfx("stamp"); set((o) => ({ verdict: { ...o.verdict, shown: i }, quake: o.quake + 1, flash: o.flash + 1 })); used += 380; }
      if (s.w !== "tie") { set((o) => ({ verdict: { ...o.verdict, confetti: true } })); csfx("crowd_cheer"); }
      await sleep(ms - used, id);
    };
    const step = async (s, id) => {
      G(id);
      const ms = stepMs(s);
      switch (s.k) {
        case "cam": { const t = await goto(s.cam, id, s.who); await sleep(ms - t, id); return; }
        case "say": return say(s, id);
        case "shout": return shout(s, id);
        case "gavel": return gavel(s, id);
        case "pose": {
          const k = s.who === "J" ? "jp" : "lp";
          if (s.pose) set({ [k]: s.pose });
          if (s.one) await one(s.who, s.one, Math.max(ms, 300), id); else await sleep(ms, id);
          return;
        }
        case "present": {
          set({ dlg: null });
          const lawyer = cur.current === "defense" || cur.current === "lines" || v_lastWho() === "L";
          if (lawyer) { cur.current = "lines"; set({ cam: "lines", pan: null, lp: "close", present: s.ev, presentBox: false }); csfx("point"); }
          else set({ present: s.ev, presentBox: true });
          await sleep(160, id); csfx("evidence_ding");
          await sleep(ms - 160, id);
          if (!lawyer) set({ present: null, presentBox: false });
          return;
        }
        case "hurt": return hurt(s, id);
        case "heal": {
          csfx("evidence_ding"); set({ pop: { side: s.side, t: `+${s.n}`, k: Date.now() }, ...(s.side === "L" ? { lp: "confident" } : {}) });
          await sleep(ms, id); set({ pop: null }); return;
        }
        case "banner": {
          set({ dlg: null }); trans(s.kind);
          if (s.kind === "test") lastBanner.current = Date.now();
          await sleep(ms, id); return;
        }
        case "gallery": return gallery(s, id);
        case "kick": set((o) => ({ kicked: [...o.kicked, s.id] })); csfx("crowd_boo"); await sleep(ms, id); return;
        case "verdict": return verdict(s, id);
        case "clip": {
          // คลิปวีดีโอเต็มจอ: เพลงหยุด · เสียงเอฟเฟกต์ทั้งหมดปิด · ไม่มีกล่องข้อความ · จบคลิป (หรือครบ ms) แล้วไปต่อ
          set({ dlg: null, shout: null, banner: null, present: null, clip: { src: s.src, k: Date.now() } });
          setClipLock(true);
          const release = suspendMusic();
          try {
            await new Promise((res) => { clipEnd.current = res; setTimeout(res, ms); });
            G(id);
          } finally { clipEnd.current = null; release(); setClipLock(false); set({ clip: null }); }
          return;
        }
        case "clash": {
          set((o) => ({ dlg: null, clash: Date.now(), quake: o.quake + 1 })); csfx("objection");
          await sleep(Math.min(ms, 700), id); set((o) => ({ flash: o.flash + 1, quake: o.quake + 1 })); csfx("damage");
          await sleep(ms - 700, id); set({ clash: null }); return;
        }
        default: await sleep(ms, id);
      }
    };
    let lastWhoRef = null;
    const v_lastWho = () => lastWhoRef;
    const playAll = async (steps, id, after) => {
      setBusy(true); set({ thinking: false });
      try {
        for (const s of steps) { if (s.k === "say" || s.k === "shout") lastWhoRef = s.who; if (s.k === "cam") lastWhoRef = s.cam === "defense" ? "L" : null; await step(s, id); }
      } catch (e) { if (!(e instanceof Cancel)) console.error(e); return; }
      if (id !== run.current) return;
      after && after();
      setBusy(false);
      set({ lp: null, jp: null, dlg: null, shout: null, gavel: -1, banner: null });
    };
    return { playAll, goto, one, trans };
  }, [set]);

  // beat ใหม่ (seq เปลี่ยน) = ตัดของเดิมแล้วเล่นทันที
  const seq = court?.beat?.seq;
  useEffect(() => {
    if (seq == null || !court?.beat) return;
    const id = ++run.current;
    P.playAll(court.beat.steps || [], id, () => setShownCred(ctx.current.court?.cred || { L: 5, D: 5 }));
  }, [seq]); // eslint-disable-line react-hooks/exhaustive-deps

  // ให้การ (testify): client เล่นเอง ~2.5 วิ/ประโยค
  const phase = court?.phase;
  const testifyKey = phase === "testify" ? `${court.id}:${court.round}` : null;
  useEffect(() => {
    if (!testifyKey) return;
    const c = ctx.current.court, D = ctx.current.cast.D;
    const id = ++run.current;
    const showAl = ctx.current.viewerSide === "D";
    const steps = [];
    if (Date.now() - lastBanner.current > 2500) steps.push({ k: "banner", kind: "test", ms: BANNER_MS.test });
    steps.push({ k: "cam", cam: "witness", ms: 0 });
    for (const st of c.list || []) steps.push({ k: "say", who: "D", name: D?.name || "", text: (showAl && st.alibi ? "📍 " : "") + st.text, ms: TESTIFY_LINE_MS });
    P.playAll(steps, id);
  }, [testifyKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ภาพประจำ phase ตอนไม่มีฉากเล่นอยู่
  const cx = court?.cx ?? 0;
  const st = court?.list?.[cx];
  const stText = st ? ((st.alibiShown || (viewerSide === "D" && st.alibi)) ? "📍 " : "") + st.text : "";
  useEffect(() => {
    if (busy || !court) return;
    setShownCred(court.cred);
    const D = cast.D;
    if (phase === "opening") { cur.current = "title"; set({ cam: "title" }); }
    else if (phase === "testimony") { cur.current = "witness"; set({ cam: "witness", standId: null, dlg: null, thinking: true }); }
    else if (phase === "cross" && st) {
      cur.current = "witness";
      set({ cam: "witness", standId: null, pan: null, present: null, presentBox: false, dlg: { who: "D", name: D?.name || "", text: stText, n: 9999, color: "green", done: true, cross: true } });
    } else if (phase === "gallery") { cur.current = "wide"; set({ cam: "wide", dlg: null }); }
  }, [busy, phase, cx, stText, court?.round]); // eslint-disable-line react-hooks/exhaustive-deps
  // รอบใหม่ / ขั้นประชาชน = ฉากเปลี่ยนขั้นฝั่ง client
  const roundShown = useRef(court?.round || 1);
  useEffect(() => {
    if (phase === "testimony" && court.round > 1 && roundShown.current !== court.round) { roundShown.current = court.round; P.trans("round", court.round); }
  }, [phase, court?.round]); // eslint-disable-line react-hooks/exhaustive-deps
  const galKey = phase === "gallery" ? `${court.id}:${court.round}` : null;
  useEffect(() => { if (galKey) P.trans("gallery"); }, [galKey]); // eslint-disable-line react-hooks/exhaustive-deps
  // เลื่อนประโยคตอนซักค้าน = เสียงแพนเบาๆ
  const lastCx = useRef(cx);
  useEffect(() => { if (phase === "cross" && lastCx.current !== cx) csfx("blip_high"); lastCx.current = cx; }, [cx, phase]);

  const onClick = useCallback(() => { if (skip.current) skip.current(); }, []);
  const endOne = useCallback((who) => { const r = oneRes.current[who]; oneRes.current[who] = null; set(who === "L" ? { lOne: null } : { jOne: null }); r && r(); }, [set]);
  const onClipEnd = useCallback(() => { const r = clipEnd.current; clipEnd.current = null; r && r(); }, []);
  return { v, busy, onClick, endOne, onClipEnd, cred: shownCred };
}

// ---------- วาดฉาก ----------
export function CourtStage({ v, cast, cred = { L: 5, D: 5 }, onClick, endOne, onClipEnd, onInfo, children }) {
  const stageRef = useRef(null);
  useEffect(() => { preloadCourt(Object.values(cast.byId || {}).map((p) => p.img)); }, [cast]);
  useEffect(() => {
    if (!v.quake || !stageRef.current) return;
    stageRef.current.animate([{ transform: "none" }, { transform: "translate(-1.4%,.7%)" }, { transform: "translate(1.1%,-.9%)" }, { transform: "translate(-.6%,.4%)" }, { transform: "none" }], { duration: 380 });
  }, [v.quake]);
  const trK = v.trans?.k;
  useEffect(() => {
    if (!trK || !stageRef.current) return;
    const scenes = stageRef.current.querySelectorAll(".cscene:not(.off)");
    scenes.forEach((el) => el.animate([{ transform: "scale(1)" }, { transform: "scale(1.06)", offset: 0.45 }, { transform: "scale(1)" }], { duration: 1700, easing: "cubic-bezier(.3,0,.3,1)" }));
  }, [trK]);

  const lBase = v.lp || (cred.L <= 2 ? "nervous" : "normal");
  const talking = (w) => v.dlg && !v.dlg.done && v.dlg.who === w && !v.dlg.mono;
  const pair = (P, k, A) => P[k] || (A.anims[k] ? [k, k] : P.normal);
  const lAnim = v.lOne || pair(LPOSE, lBase, ATLAS.naruhodo)[talking("L") ? 1 : 0];
  const jAnim = v.jOne || pair(JPOSE, v.jp || "normal", ATLAS.judge)[talking("J") ? 1 : 0];
  const closeAnim = talking("L") ? "closeTalk" : "close";
  const P = (id) => (id && cast.byId?.[id]) || null;
  const stand = P(v.standId) || cast.D;
  const lowD = v.standId ? "" : cred.D <= 1 ? "sweat tremble" : cred.D <= 2 ? "sweat" : "";
  const defFx = `${v.defFx} ${v.defFx === "break" ? "" : lowD} ${v.thinking && !v.standId ? "think sweat" : ""}`;
  const panX = v.pan ? { from: 128 - SIDE[v.pan.from], to: 128 - SIDE[v.pan.to] } : null;
  const gal = cast.G || [];
  const out = new Set([...(cast.outIds || []), ...v.kicked]);
  const on = (c) => v.cam === c;

  return (
    <div className="ctop" ref={stageRef} onClick={onClick}>
      <Scene bg="ui_title" on={on("title")} cls="ctitle" />
      <Scene bg="bg_wide" on={on("wide")}>
        <div className="cgal">
          {gal.map((p, i) => {
            const k = Math.floor(i / 2), row = k % 2, col = Math.floor(k / 2);
            const left = i % 2 ? 224 - col * 27 - row * 13 : 6 + col * 27 + row * 13;
            const rx = v.rx[p.id];
            return (
              <div key={p.id} className={`cfan cinfoable ${out.has(p.id) ? "out" : ""} ${rx ? "act" : ""}`} onClick={onInfo ? (e) => { e.stopPropagation(); onInfo(p.id); } : undefined} style={{ left: `calc(var(--u) * ${left})`, bottom: `calc(var(--u) * ${row ? 74 : 54})`, zIndex: row ? 1 : 2 }}>
                <div className="cfanimg">{p.img ? <img src={p.img} alt="" draggable={false} /> : null}</div>
                {rx && <span className="crx" key={rx.k}>{rx.e}</span>}
              </div>
            );
          })}
          {v.toss.map((t) => <span key={t.k} className={`ctoss ${t.side}`}>🍅</span>)}
        </div>
      </Scene>
      <Scene bg="bg_defense" on={on("defense")}>
        <Sprite atlas="naruhodo" anim={lAnim} x={100} scale={1.25} active={on("defense")} onEnd={v.lOne ? () => endOne("L") : undefined} />
        <img className="cbg" src={IMG("desk_defense")} alt="" />
        {cred.L <= 1 && <i className="csweat l" />}
        {v.splat?.side === "L" && <div className="csplat l" key={v.splat.k}>🍅</div>}
      </Scene>
      <Scene bg="bg_witness" on={on("witness")}>
        {!v.standId && cast.Dunits
          ? cast.Dunits.slice(0, 2).map((u, n) => <Piece key={u.id + n} p={u} onInfo={onInfo} cls={`wit duo${n ? "b" : "a"} ${defFx}`} />)
          : <Piece p={stand} onInfo={onInfo} cls={`wit ${defFx}`} key={stand?.id || "none"} />}
        {v.thinking && !v.standId && <div className="cthink"><i>…</i></div>}
        {v.splat?.side === "D" && <div className="csplat" key={v.splat.k}>🍅</div>}
        <img className="cbg" src={IMG("stand_witness")} alt="" />
      </Scene>
      <Scene bg="bg_prosecution" on={on("prosecution")}>
        <Piece p={P(v.proId) || cast.C?.[0]} onInfo={onInfo} cls="pro" flip />
        <img className="cbg" src={IMG("desk_prosecution")} alt="" />
      </Scene>
      <Scene bg="bg_cocounsel" on={on("cocounsel")}>
        <Piece p={P(v.coId) || cast.co?.[0]} onInfo={onInfo} cls="cocounsel" />
      </Scene>
      <Scene bg="bg_judge" on={on("judge")}>
        <Sprite atlas="judge" anim={jAnim} x={70} bottom={54} scale={1} active={on("judge")} onEnd={v.jOne ? () => endOne("J") : undefined} />
        <div className="cbench" style={{ backgroundImage: `url(${IMG("bg_judge")})` }} />
      </Scene>
      <div className={`cscene clinescene ${on("lines") ? "" : "off"}`}>
        <div className="clines" style={{ backgroundImage: `url(${IMG("lines_top")})` }} />
        <div className="cframe">
          <Sprite atlas="naruhodo" anim={closeAnim} x={96} scale={1.25} active={on("lines")} />
        </div>
      </div>
      {v.present && (
        <div className={`cpresent ${v.presentBox ? "box" : ""}`} key={v.present.name + v.present.icon}>
          <EvidenceIcon idx={v.present.icon} size={v.presentBox ? 42 : 56} u />
          <b><Rich text={v.present.name} /></b>
        </div>
      )}
      {v.pan && (
        <div className="cpan" key={v.pan.k} style={{ "--from": `calc(var(--u) * ${panX.from})`, "--to": `calc(var(--u) * ${panX.to})` }}>
          <img src={IMG("bg_pan")} alt="" />
        </div>
      )}
      {v.pop && <div className={`cpop ${v.pop.side} ${v.pop.bad ? "bad" : "good"}`} key={v.pop.k}>{v.pop.t}</div>}
      {v.hurtk && <div className="churt" key={v.hurtk} />}
      {v.trans && <Trans t={v.trans} key={v.trans.k} />}
      {v.gavel >= 0 && (
        <div className="cscene cgavel">
          <img className="cfull" src={IMG("gavel_5")} alt="" />
          <div className="cframe"><img className="cbg" src={IMG("gavel_" + Math.min(v.gavel, 4))} alt="" /></div>
          {v.gavel === 4 && <img className="cfull cgflash" src={IMG("gavel_0")} alt="" />}
        </div>
      )}
      {v.shout && (
        <div className={`cshout ${v.shout.kind}`} key={v.shout.k}>
          <img className="clinesbg" src={IMG("lines_bottom")} alt="" />
          <img className="cbubble" src={IMG(SHOUT_IMG[v.shout.kind] || "shout_objection")} alt="" />
        </div>
      )}
      {v.clash && (
        <div className="cclash" key={v.clash}>
          <img className="a" src={IMG("shout_objection")} alt="" /><img className="b" src={IMG("shout_objection")} alt="" />
        </div>
      )}
      {v.dlg && (
        <div className={`cdlg ${v.dlg.done ? "done" : ""} ${v.dlg.cross ? "cross" : ""}`}>
          {v.dlg.name && <div className="cwho">{v.dlg.name}</div>}
          <div className={`ctxt ${v.dlg.color}`}><Rich text={v.dlg.text} n={v.dlg.n} /></div>
          {!v.dlg.cross && <i className="cnext">▼</i>}
        </div>
      )}
      {v.verdict && (
        <div className={`cverdict ${v.verdict.w}`}>
          <img className="cfull" src={IMG("gavel_5")} alt="" />
          <div className="cwords">{v.verdict.words.slice(0, v.verdict.shown).map((x, i) => <span key={i}>{x}</span>)}</div>
          {v.verdict.confetti && <Confetti />}
        </div>
      )}
      {v.clip && <ClipLayer clip={v.clip} onEnd={onClipEnd} />}
      <div className="cflash" key={"f" + v.flash} />
      {children}
    </div>
  );
}

// ฉากเปลี่ยนขั้นแบบ Ace Attorney: แถบมืดกวาดเข้า · ตัวอักษรทองไล่ทีละตัว · แถบเส้นความเร็ว · แสงวาบ · ประกายไฟ · เช็ดออก
const TR_TITLE = { test: "~ คำให้การ ~", cross: "~ ซักค้าน ~", gallery: "~ ประชาชน ~", verdict: "~ คำตัดสิน ~" };
const graphemes = (s) => {
  try { return Array.from(new Intl.Segmenter("th", { granularity: "grapheme" }).segment(s), (x) => x.segment); } catch { return [s]; }
};
function Trans({ t }) {
  const title = t.kind === "round" ? `รอบที่ ${t.n}` : TR_TITLE[t.kind] || "";
  const g = graphemes(title);
  return (
    <div className={`ctr k-${t.kind}`}>
      {t.kind === "cross" && <img className="ctr-flare" src={IMG("ui_cross")} alt="" />}
      <div className="ctr-band">
        <div className="ctr-lines t" style={{ backgroundImage: `url(${IMG("lines_bottom")})` }} />
        <div className="ctr-lines b" style={{ backgroundImage: `url(${IMG("lines_bottom")})` }} />
      </div>
      <div className="ctr-title">
        {g.map((c, i) => <span key={i} style={{ animationDelay: `${0.16 + i * 0.04}s, ${1.4 + i * 0.015}s` }}>{c === " " ? "\u00a0" : c}</span>)}
        <i className="ctr-sheen" />
      </div>
      <div className="ctr-sparks">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ "--a": `${i * 20 + (i % 3) * 7}deg`, "--r": `${30 + (i % 4) * 9}`, animationDelay: `${0.28 + (i % 5) * 0.03}s` }} />)}</div>
    </div>
  );
}

function ClipLayer({ clip, onEnd }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    try { el.volume = Math.max(0, Math.min(1, videoVolume(clip.src))); } catch { el.volume = 1; }
    el.muted = courtMuted;
    el.play().catch(() => { el.muted = true; el.play().catch(() => onEnd && onEnd()); });
    return onVolumeChange(() => { try { el.volume = Math.max(0, Math.min(1, videoVolume(clip.src))); } catch { /* ไม่เป็นไร */ } });
  }, [clip, onEnd]);
  return <video ref={ref} className="cclip" key={clip.k} src={clip.src} playsInline preload="auto" onEnded={onEnd} onError={onEnd} />;
}

function Confetti() {
  const bits = useMemo(() => Array.from({ length: 70 }, (_, i) => {
    const h = (n) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1; // สุ่มคงที่ต่อชิ้น
    return { i, l: h(1) * 100, d: h(2) * 1.2, t: 2.2 + h(3) * 1.8, c: ["#f4c430", "#e8423a", "#3f8ee8", "#46c46d", "#fff"][i % 5], r: h(4) * 360, w: 0.6 + h(5) * 0.8 };
  }), []);
  return <div className="cconf">{bits.map((b) => <i key={b.i} style={{ left: `${b.l}%`, animationDelay: `${b.d}s`, animationDuration: `${b.t}s`, background: b.c, transform: `rotate(${b.r}deg) scale(${b.w})` }} />)}</div>;
}
