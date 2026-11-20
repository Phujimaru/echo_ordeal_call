// ฉากศาล "เริ่มการไต่สวน" ของนารุโฮโดะ (GRID_PLAN §7.37) — จอบน = ห้องพิจารณาคดี (256×192 หน่วย) · จอล่าง = ปุ่ม/แฟ้มหลักฐาน/คำให้การ
//  สื่อทั้งหมดจาก sprite sheet ของผู้ใช้ (courtAssets.js) · จำเลย/ฝ่ายค้าน/ประชาชน = ภาพหมากของตัวละครนั้น
//  props: defendant/counsel/teammate {name,img} · gallery [{name,img}] · mode pvp|duo · role L|D · events (บันทึกเหตุการณ์) · onDone(result)
import { useEffect, useMemo, useRef, useState } from "react";
import { ATLAS, IMG } from "./courtAssets";
import { CSFX, courtMuted, setCourtMuted } from "./courtSfx";
import {
  EV_TYPES, RULES, shuffle, evidenceOf, alibiOf, evName, evSub, statementPool, contradicts, aiTestimony, presentResult, aiLawyerPlan,
} from "./courtCase";
import "./court.css";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const rnd = (a) => a[Math.floor(Math.random() * a.length)];
class Cancel extends Error {}

// ท่าของนารุโฮโดะ: [ตอนเงียบ, ตอนพูด]
const LPOSE = {
  normal: ["idle", "talk"], nervous: ["nervous", "nervousTalk"], think: ["think", "thinkTalk"], desk: ["desk", "deskTalk"],
  point: ["point", "pointTalk"], paper: ["paper", "paperTalk"], confident: ["confident", "confidentTalk"], sheepish: ["sheepish", "sheepishTalk"],
  close: ["close", "closeTalk"], shut: ["nervousShut", "nervousTalk"],
};
const JPOSE = { normal: ["idle", "talk"], surprised: ["surprised", "surprisedTalk"], angry: ["angry", "angryTalk"] };
const SIDE = { defense: 128, witness: 648, prosecution: 1168 }; // จุดกลางของแต่ละฝั่งในภาพแพนกล้อง (bg_pan กว้าง 1296)
const CAM_OF = { L: "defense", D: "witness", C: "prosecution", J: "judge", T: "cocounsel" };
const SHOUT_IMG = { objection: "shout_objection", holdit: "shout_holdit", takethat: "shout_takethat" };

function Sprite({ atlas, anim, x, bottom = 0, scale = 1.25, center = false, onEnd }) {
  const A = ATLAS[atlas], m = A.anims[anim] || A.anims.idle;
  const [f, setF] = useState(0);
  const endRef = useRef(onEnd); endRef.current = onEnd;
  useEffect(() => {
    setF(0); let i = 0;
    const t = setInterval(() => {
      i++;
      if (i >= m.n) { if (m.loop) i = 0; else { clearInterval(t); endRef.current && endRef.current(); return; } }
      setF(i);
    }, 1000 / m.fps);
    return () => clearInterval(t);
  }, [atlas, anim, m.n, m.fps, m.loop]);
  const u = (n) => `calc(var(--u) * ${n})`;
  const left = center ? x - (m.w * scale) / 2 : x - m.ax * scale;
  return (
    <div className="csprite" style={{
      left: u(left), bottom: u(bottom), width: u(m.w * scale), height: u(m.h * scale),
      backgroundImage: `url(${A.src})`, backgroundSize: `${u(A.W * scale)} ${u(A.H * scale)}`,
      backgroundPosition: `${u(-f * m.w * scale)} ${u(-m.y * scale)}`,
    }} />
  );
}

// ฉากหนึ่งมุมกล้อง: ภาพเดิม 256×192 อยู่กลางจอ 16:9 + ขอบซ้ายขวาเบลอจากภาพเดียวกัน
function Scene({ bg, children, cls = "" }) {
  return (
    <div className={`cscene ${cls}`}>
      <img className="cside" src={IMG(bg)} alt="" />
      <div className="cframe"><img className="cbg" src={IMG(bg)} alt="" />{children}</div>
    </div>
  );
}

function Piece({ who, cls = "", flip }) {
  if (!who) return null;
  return <div className={`cpiece ${cls}`}><img src={who.img} alt="" style={flip ? { transform: "scaleX(-1)" } : null} draggable={false} /></div>;
}

export default function CourtScene({ defendant, counsel, teammate, gallery = [], mode = "pvp", role = "L", events, onDone }) {
  const [v, setV] = useState(() => ({
    cam: "title", pan: null, lp: "normal", lOne: null, jp: "normal", jOne: null, dlg: null, shout: null, gavel: -1,
    banner: null, flash: 0, quake: 0, defFx: "", lineWho: "L", bottom: { kind: "start" }, verdict: null, rx: {}, splat: null,
    out: [], cxIdx: 0, list: null, evidence: [], present: null, muted: courtMuted,
  }));
  const set = (p) => setV((o) => ({ ...o, ...(typeof p === "function" ? p(o) : p) }));
  const run = useRef(0);
  const S = useRef(null); // สถานะคดี (ไม่ต้องเรนเดอร์ทุกครั้ง)
  const dlgRes = useRef(null), uiRes = useRef(null), oneRes = useRef({});
  const stageRef = useRef(null);
  const curCam = useRef("title");
  const [unit, setUnit] = useState(3);
  useEffect(() => {
    if (!v.quake || !stageRef.current) return;
    stageRef.current.animate([{ transform: "none" }, { transform: "translate(-1.2%,.6%)" }, { transform: "translate(1%,-.8%)" }, { transform: "translate(-.6%,.3%)" }, { transform: "none" }], { duration: 420 });
  }, [v.quake]);

  useEffect(() => {
    const el = stageRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setUnit(el.clientHeight / 192)); ro.observe(el); return () => ro.disconnect();
  }, []);
  useEffect(() => () => { run.current++; }, []);

  // ---------- primitives ----------
  const G = (id) => { if (id !== run.current) throw new Cancel(); };
  const api = useMemo(() => {
    const cut = (cam) => set({ cam, pan: null });
    const goto = async (cam, id) => {
      G(id);
      const from = curCam.current;
      if (from in SIDE && cam in SIDE && from !== cam) {
        CSFX.whoosh(); set({ pan: { from, to: cam, k: Date.now() } }); await wait(420); G(id);
      }
      set({ cam, pan: null }); curCam.current = cam;
    };
    const say = (who, name, text, id, color = "") => new Promise((res, rej) => {
      if (id !== run.current) return rej(new Cancel());
      const cam = CAM_OF[who];
      (cam ? goto(cam, id) : Promise.resolve()).then(() => {
        const chars = Array.from(text); let n = 0;
        set({ dlg: { who, name, text, n: 0, color, done: false } });
        const t = setInterval(() => {
          if (id !== run.current) { clearInterval(t); return; }
          n += 1; if (n % 2) CSFX.blip(who);
          set((o) => ({ dlg: o.dlg && { ...o.dlg, n, done: n >= chars.length } }));
          if (n >= chars.length) clearInterval(t);
        }, 28);
        const auto = setTimeout(() => finish(), 1600 + chars.length * 55);
        function finish() { clearTimeout(auto); clearInterval(t); dlgRes.current = null; set((o) => ({ dlg: o.dlg && { ...o.dlg, n: chars.length, done: true } })); res(); }
        dlgRes.current = () => {
          if (n < chars.length) { n = chars.length; clearInterval(t); set((o) => ({ dlg: o.dlg && { ...o.dlg, n, done: true } })); }
          else finish();
        };
      }).catch(rej);
    });
    const one = (who, anim, id) => new Promise((res) => { // ท่าแบบเล่นครั้งเดียว (รอจบ)
      if (id !== run.current) return res();
      oneRes.current[who] = res; set(who === "L" ? { lOne: anim } : { jOne: anim });
      setTimeout(() => { if (oneRes.current[who] === res) { oneRes.current[who] = null; set(who === "L" ? { lOne: null } : { jOne: null }); res(); } }, 2000);
    });
    const shout = async (who, kind, id) => {
      G(id); set({ dlg: null });
      const cam = CAM_OF[who]; if (cam) { cut(cam); curCam.current = cam; }
      set((o) => ({ shout: { kind, k: Date.now(), who }, quake: o.quake + 1, flash: o.flash + 1 })); CSFX.shout();
      await wait(950); G(id); set({ shout: null });
      if (who === "L") { set({ lp: "point" }); await one("L", "slam", id); }
    };
    const gavel = async (id, times = 1) => {
      G(id); set({ dlg: null });
      for (let k = 0; k < times; k++) {
        for (const f of [1, 2, 3]) { set({ gavel: f }); await wait(85); G(id); }
        set((o) => ({ gavel: 4, flash: o.flash + 1, quake: o.quake + 1 })); CSFX.gavel(); await wait(380); G(id);
      }
      set({ gavel: -1 });
    };
    const banner = async (kind, id) => {
      G(id); set({ dlg: null, banner: kind }); CSFX.ok(); await wait(kind === "cross" ? 1900 : 1500); G(id); set({ banner: null });
    };
    const ui = (bottom) => new Promise((res) => { uiRes.current = res; set({ bottom }); });
    const quake = () => set((o) => ({ quake: o.quake + 1 }));
    const flash = () => set((o) => ({ flash: o.flash + 1 }));
    return { cut, goto, say, one, shout, gavel, banner, ui, quake, flash };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- trial ----------
  const N = { L: "นารุโฮโดะ", D: defendant.name, C: counsel?.name || "ฝ่ายค้าน", J: "ผู้พิพากษา", T: teammate?.name || "" };
  const sync = () => { const s = S.current; set({ evidence: s.evidence.slice(), list: s.list && s.list.slice() }); };
  const pressure = () => {
    const s = S.current;
    set((o) => ({ lp: s.cred.L <= 2 ? "nervous" : o.lp === "nervous" ? "normal" : o.lp, defFx: s.cred.D <= 2 ? "sweat" : "" }));
  };
  const hurt = async (k, n, id) => {
    const s = S.current; s.cred[k] = Math.max(0, s.cred[k] - n); s.gain[k === "L" ? "D" : "L"] += n; CSFX.hit(); api.quake();
    if (k === "L") { await api.goto("defense", id); await api.one("L", "shock", id); s.lp = "nervous"; }
    else { await api.goto("witness", id); set({ defFx: "shake" }); await wait(900); }
    pressure();
  };

  async function doPress(st, id) {
    const s = S.current;
    await api.shout("L", "holdit", id);
    st.pressed = true; s.pressLeft--; sync();
    if (st.alibi) {
      await api.say("D", N.D, "ก็...ก็บอกแล้วไงว่าตอนนั้นฉันอยู่ไกล...", id);
      set({ defFx: "shake" }); CSFX.pen();
      set({ lp: "confident" });
      await api.say("L", N.L, "ไกลขนาดไหน? ใครเห็นคุณบ้าง?", id, "blue");
      await api.say("D", N.D, "ช...ช่างมันเถอะ!", id);
      st.alibi = false; s.alibi = Math.max(0, s.alibi - 1);
      const hidden = s.events.find((e) => !e.seen && contradicts(st, e) && !s.evidence.some((x) => x.id === e.id));
      if (hidden) { s.evidence.push({ ...hidden, seen: true, used: false }); CSFX.ok(); sync(); set({ lp: "paper" }); await api.say("L", N.L, `${EV_TYPES[hidden.type].i} ${evName(hidden)}`, id, "blue"); }
    } else {
      await api.say("D", N.D, rnd(st.kind === "truth" ? ["ก็ตามนั้นแหละ ไม่มีอะไรมากกว่านี้", "จะถามซ้ำทำไม ฉันพูดความจริง"] : ["ฉันมั่นใจ! ไม่ได้ทำแน่นอน", "ถามอีกกี่ทีคำตอบก็เหมือนเดิม"]), id);
      set({ lp: "sheepish" }); await api.say("L", N.L, rnd(["อ...อืม งั้นเหรอ", "(ไม่ได้อะไรเลยแฮะ...)"]), id, "blue");
    }
    set({ lp: S.current.cred.L <= 2 ? "nervous" : "normal" });
  }
  async function counselCheck(id) {
    const s = S.current;
    if (mode !== "duo" || s.counselLeft <= 0) return false;
    let yes;
    if (role === "D") {
      yes = await new Promise((res) => {
        let t = 3; set({ bottom: { kind: "obj", t } });
        const iv = setInterval(() => { t--; if (run.current !== id || t <= 0) { clearInterval(iv); uiRes.current = null; res(false); } else set({ bottom: { kind: "obj", t } }); }, 1000);
        uiRes.current = (v2) => { clearInterval(iv); uiRes.current = null; res(v2); };
      });
      set({ bottom: { kind: "idle" } });
    } else yes = Math.random() < 0.45;
    if (!yes) return false;
    s.counselLeft--;
    await api.shout("C", "objection", id);
    await api.say("C", N.C, "หลักฐานชิ้นนี้ยังพิสูจน์อะไรไม่ได้! ศาลไม่ควรรับฟัง!", id);
    set({ jp: "normal" }); await api.say("J", N.J, "อืม...ศาลขอไม่รับหลักฐานชิ้นนั้นไว้ก่อน", id);
    set({ lp: "sheepish" });
    return true;
  }
  async function doPresent(st, ev, id) {
    const s = S.current;
    await api.shout("L", "objection", id);
    // จอเส้นความเร็ว: ยื่นหลักฐาน
    set({ cam: "lines", lineWho: "L", present: ev, lp: "close" }); curCam.current = "lines";
    await api.say("", N.L, `เอานี่ไปดู! ${EV_TYPES[ev.type].i} ${evName(ev)}`, id, "blue");
    set({ present: null, lp: "point" });
    if (await counselCheck(id)) { st.presentTried = true; sync(); return; }
    st.done = true;
    const r = presentResult(st, ev);
    if (r.kind === "irrelevant" || r.kind === "wrong") {
      await api.gavel(id); set({ jp: "angry" });
      await api.say("J", N.J, r.kind === "irrelevant" ? "ทนาย! หลักฐานนี้เกี่ยวอะไรกับคำให้การ?" : "หลักฐานไม่ตรงกับประโยคนี้เลยนะ ทนาย!", id);
      set({ jp: "normal" });
      await hurt("L", r.dL, id); await api.one("L", "headDown", id); sync(); return;
    }
    if (r.kind === "alibi") {
      await api.shout("D", "holdit", id);
      await api.say("D", N.D, "ตอนนั้นฉันอยู่อีกฟากของสนาม! มีคนเห็นด้วย!", id);
      st.alibi = false; s.alibi = Math.max(0, s.alibi - 1); ev.used = true; sync();
      set({ jp: "normal" }); await api.say("J", N.J, "ข้อแก้ตัวฟังขึ้น...หลักฐานชิ้นนั้นตกไป", id);
      await hurt("L", r.dL, id); return;
    }
    ev.used = true; sync();
    if (r.kind === "pierce") {
      set({ lp: "desk" }); await api.one("L", "slam", id);
      await api.say("L", N.L, "มีพยานเห็นคุณอยู่ตรงนั้น! ข้อแก้ตัวของคุณใช้ไม่ได้!", id, "blue");
      st.alibi = false; s.alibi = Math.max(0, s.alibi - 1);
      await hurt("D", r.dD, id); return;
    }
    s.proven.add(st.text);
    await api.goto("witness", id); set({ defFx: "shake" });
    await api.say("D", N.D, rnd(["ก...กรอ๊ากกก!!", "เป็นไปไม่ได้...!", "ม...ไม่จริง!!"]), id, "red");
    await hurt("D", r.dD, id);
    if (r.healL) { s.cred.L = Math.min(RULES.cred, s.cred.L + r.healL); CSFX.ok(); pressure(); }
    if (r.reveal) { s.revealAlibi = true; sync(); }
    set({ jp: "surprised" }); await api.one("J", "nod", id); set({ jp: "normal" });
    set({ lp: "confident" });
  }

  async function playerCross(id) {
    const s = S.current;
    s.cx = 0;
    while (true) {
      G(id);
      if (s.cred.L <= 0 || s.cred.D <= 0 || s.list.every((x) => x.done)) return;
      await api.goto("witness", id);
      const i = s.cx || 0, st0 = s.list[i];
      set({ cxIdx: i, dlg: { who: "D", name: N.D, text: (s.revealAlibi && st0.alibi ? "📍 " : "") + st0.text, n: 999, color: "green", done: true } });
      const act = await api.ui({ kind: "cross" });
      G(id);
      if (act.type === "end") return;
      const st = s.list[act.idx];
      set({ bottom: { kind: "idle" } });
      if (act.type === "press") await doPress(st, id);
      if (act.type === "present") await doPresent(st, act.ev, id);
    }
  }
  async function aiCross(id) {
    const s = S.current;
    for (const i of shuffle(s.list.map((_, k) => k))) {
      G(id); if (s.cred.L <= 0 || s.cred.D <= 0) return;
      const st = s.list[i]; set({ cxIdx: i });
      await api.goto("witness", id);
      set({ dlg: { who: "D", name: N.D, text: st.text, n: 999, color: "green", done: true } }); await wait(1300); G(id);
      const plan = aiLawyerPlan(st, s.evidence, s.pressLeft);
      if (plan.press) await doPress(st, id);
      if (s.cred.L <= 0 || s.cred.D <= 0) return;
      if (plan.present && !st.done) await doPresent(st, plan.present, id);
    }
  }

  async function galleryPhase(id) {
    const s = S.current;
    if (mode !== "pvp" || !s.gallery.length) return;
    await api.goto("wide", id); set({ dlg: null }); await wait(350);
    const lead = s.gain.L > s.gain.D ? "L" : s.gain.D > s.gain.L ? "D" : null;
    let throws = 0, last = -1; const delta = { L: 0, D: 0 }, tomatoAt = [];
    for (let i = 0; i < s.gallery.length; i++) {
      const g = s.gallery[i]; if (g.out) continue; G(id);
      const side = lead && Math.random() < 0.65 ? lead : rnd(["L", "D"]); const r = Math.random(); let e;
      if (r < 0.42) { e = "👏"; delta[side]++; g[side === "L" ? "cheerL" : "cheerD"]++; CSFX.cheer(); }
      else if (r < 0.72) { e = "👎"; delta[side === "L" ? "D" : "L"]--; CSFX.boo(); }
      else { e = "🍅"; throws++; last = i; tomatoAt.push(rnd(["L", "D"])); CSFX.splat(); }
      set((o) => ({ rx: { ...o.rx, [i]: { e, k: Date.now() } } }));
      await wait(380);
    }
    await wait(500);
    for (const k of ["L", "D"]) s.cred[k] = Math.max(0, Math.min(RULES.cred, s.cred[k] + delta[k]));
    pressure();
    // คนที่เชียร์ทนายมากสุด ตะโกนเชียร์จากข้างโต๊ะทนาย (ฉากผู้ช่วยทนาย)
    if (delta.L > 0) {
      const fan = s.gallery.filter((g) => !g.out).sort((a, b) => b.cheerL - a.cheerL)[0];
      if (fan) { set({ helper: fan }); await api.say("T", fan.name, rnd(["สู้ๆ ทนาย!", "จัดไปเลย!!"]), id); set({ helper: null }); }
    }
    for (const side of tomatoAt.slice(0, 2)) {
      if (side === "L") { await api.goto("defense", id); await api.one("L", "hitByObject", id); }
      else { await api.goto("witness", id); set({ splat: Date.now(), defFx: "shake" }); await wait(800); set({ splat: null }); pressure(); }
    }
    if (throws > 3 || (throws >= 3 && Math.random() < 0.5)) {
      await api.gavel(id, 2); set({ jp: "angry" });
      await api.say("J", N.J, "เงียบ! คนที่ปาของ ออกไปจากศาลเดี๋ยวนี้!", id);
      set({ jp: "normal" }); s.gallery[last].out = true; set({ out: s.gallery.filter((g) => g.out).map((g) => g.name) });
      await api.goto("wide", id); await wait(700);
    }
  }

  async function builderTestimony(id) {
    const s = S.current;
    const pool = shuffle(statementPool(s.events, s.proven)).slice(0, 9);
    const r = await api.ui({ kind: "builder", pool, alibi: s.alibi });
    return r.map((x) => ({ ...x, pressed: false, done: false }));
  }

  async function verdict(w, id) {
    G(id); const s = S.current;
    set({ dlg: null, bottom: { kind: "idle" } });
    if (w === "guilty") { await api.goto("witness", id); set({ defFx: "break" }); CSFX.hit(); await wait(1400); }
    if (w === "free") { await api.goto("defense", id); await api.one("L", "shock", id); set({ lp: "nervous" }); }
    await api.gavel(id); set({ jp: "normal" });
    await api.say("J", N.J, w === "tie" ? "ศาลยังตัดสินไม่ได้ คดีนี้ขอยุติไว้เท่านี้" : `ศาลขอตัดสินว่า จำเลย ${N.D}...`, id);
    const words = w === "guilty" ? ["มี", "ความ", "ผิด"] : w === "free" ? ["ไม่", "มี", "ความ", "ผิด"] : ["—"];
    set({ dlg: null, verdict: { w, words, shown: 0 } });
    for (let i = 1; i <= words.length; i++) { await wait(420); G(id); CSFX.stamp(); set((o) => ({ verdict: { ...o.verdict, shown: i }, quake: o.quake + 1 })); }
    const res = [];
    if (w === "guilty") res.push(`💀 ${N.D}`);
    if (w === "free") res.push("นารุโฮโดะ ❤ −3", "😵 2");
    if (mode === "pvp" && w !== "tie") {
      const key = w === "guilty" ? "cheerL" : "cheerD"; const live = s.gallery.filter((g) => !g.out);
      const best = Math.max(0, ...live.map((g) => g[key]));
      if (best > 0) live.filter((g) => g[key] === best).forEach((g) => res.push(`🏆 ${g.name} ❤ +1`));
    }
    await wait(500);
    set({ bottom: { kind: "verdict", res } });
    onDone && onDone({ verdict: w });
  }

  async function trial(id) {
    const others = gallery.concat(counsel ? [counsel] : []);
    const ev = events;
    S.current = {
      events: ev, evidence: evidenceOf(ev), alibi: alibiOf(ev), proven: new Set(),
      cred: { L: RULES.cred, D: RULES.cred }, gain: { L: 0, D: 0 }, list: null, pressLeft: 0, counselLeft: 0,
      gallery: gallery.map((g) => ({ ...g, out: false, cheerL: 0, cheerD: 0 })), others,
    };
    sync(); set({ bottom: { kind: "idle" }, verdict: null, out: [], defFx: "", lp: "normal", jp: "normal" });
    await api.goto("wide", id);
    await api.gavel(id, 3);
    await api.say("J", N.J, `ศาลขอเปิดการไต่สวน คดีของจำเลย ${N.D}`, id);
    set({ lp: "confident" }); await api.say("L", N.L, "ฝ่ายทนายพร้อมแล้วครับ ศาลที่เคารพ", id, "blue");
    if (mode === "duo" && teammate) { set({ helper: teammate }); await api.say("T", N.T, "เราจะช่วยหาความจริงเอง!", id); set({ helper: null }); }
    if (mode === "duo" && counsel) await api.say("C", N.C, "ฝ่ายค้านพร้อม ลูกความของเราบริสุทธิ์!", id);
    else { await api.goto("wide", id); await api.say("J", N.J, "ประชาชนในศาล โปรดอยู่ในความสงบ", id); }
    await api.say("D", N.D, "ฮ่ะ! จะกล่าวหากันงั้นรึ? ลองดูสิ", id);
    const s = S.current;
    for (s.t = 1; s.t <= RULES.testimonies; s.t++) {
      G(id);
      s.pressLeft = RULES.pressPer; s.counselLeft = RULES.counselObj; s.revealAlibi = false; s.gain = { L: 0, D: 0 };
      set({ round: s.t, lp: s.cred.L <= 2 ? "nervous" : "normal" });
      await api.goto("witness", id);
      s.list = role === "D" ? await builderTestimony(id) : aiTestimony(statementPool(s.events, s.proven), s.alibi);
      sync(); set({ bottom: { kind: "idle" } }); G(id);
      await api.banner("test", id);
      for (const st of s.list) await api.say("D", N.D, (role === "D" && st.alibi ? "📍 " : "") + st.text, id, "");
      await api.banner("cross", id);
      set({ lp: "think" });
      if (role === "L") await playerCross(id); else await aiCross(id);
      G(id); set({ dlg: null, bottom: { kind: "idle" } });
      if (s.cred.D <= 0) return verdict("guilty", id);
      if (s.cred.L <= 0) return verdict("free", id);
      await galleryPhase(id);
      if (s.cred.D <= 0) return verdict("guilty", id);
      if (s.cred.L <= 0) return verdict("free", id);
      if (s.t < RULES.testimonies) { await api.gavel(id); await api.say("J", N.J, "ศาลขอให้จำเลยให้การต่อ", id); }
    }
    return verdict(s.cred.D < s.cred.L ? "guilty" : s.cred.L < s.cred.D ? "free" : "tie", id);
  }
  const start = () => {
    run.current++; const id = run.current;
    trial(id).catch((e) => { if (!(e instanceof Cancel)) console.error(e); });
  };

  // ---------- render ----------
  const lAnim = v.lOne || (LPOSE[v.lp] || LPOSE.normal)[v.dlg && !v.dlg.done && v.dlg.who === "L" ? 1 : 0];
  const lCloseAnim = v.dlg && !v.dlg.done ? "closeTalk" : "close";
  const jAnim = v.jOne || (JPOSE[v.jp] || JPOSE.normal)[v.dlg && !v.dlg.done && v.dlg.who === "J" ? 1 : 0];
  const endOne = (who) => () => { const r = oneRes.current[who]; oneRes.current[who] = null; set(who === "L" ? { lOne: null } : { jOne: null }); r && r(); };
  const clickTop = () => { if (dlgRes.current) dlgRes.current(); };
  const uiDone = (val) => { const r = uiRes.current; uiRes.current = null; r && r(val); };
  const shownText = v.dlg ? Array.from(v.dlg.text).slice(0, v.dlg.n).join("") : "";
  const panX = v.pan ? { from: 128 - SIDE[v.pan.from], to: 128 - SIDE[v.pan.to] } : null;

  return (
    <div className="court" style={{ "--u": unit + "px" }}>
      <div className="ctop" ref={stageRef} onClick={clickTop}>
        {v.cam === "title" && <Scene bg="ui_title" />}
        {v.cam === "defense" && (
          <Scene bg="bg_defense">
            <Sprite atlas="naruhodo" anim={lAnim} x={96} onEnd={v.lOne ? endOne("L") : undefined} />
            <img className="cbg" src={IMG("desk_defense")} alt="" />
          </Scene>
        )}
        {v.cam === "witness" && (
          <Scene bg="bg_witness">
            <Piece who={defendant} cls={`wit ${v.defFx}`} />
            {v.splat && <div className="csplat" key={v.splat}>🍅</div>}
            <img className="cbg" src={IMG("stand_witness")} alt="" />
          </Scene>
        )}
        {v.cam === "prosecution" && (
          <Scene bg="bg_prosecution">
            <Piece who={counsel} cls="pro" flip />
            <img className="cbg" src={IMG("desk_prosecution")} alt="" />
          </Scene>
        )}
        {v.cam === "cocounsel" && <Scene bg="bg_cocounsel"><Piece who={v.helper || teammate} cls="cocounsel" /></Scene>}
        {v.cam === "judge" && (
          <Scene bg="bg_judge">
            <Sprite atlas="judge" anim={jAnim} x={128} center bottom={58} scale={1.15} onEnd={v.jOne ? endOne("J") : undefined} />
          </Scene>
        )}
        {v.cam === "wide" && (
          <Scene bg="bg_wide">
            <div className="cgal">
              {(S.current?.gallery || gallery).map((g, i) => (
                <div key={g.name + i} className={`cfan ${v.out.includes(g.name) ? "out" : ""}`}
                  style={{ left: `calc(var(--u) * ${i % 2 ? 222 - Math.floor(i / 2) * 30 : 6 + Math.floor(i / 2) * 30})`, bottom: `calc(var(--u) * ${4 + (Math.floor(i / 2) % 2) * 14})` }}>
                  <img src={g.img} alt="" draggable={false} />
                  {v.rx[i] && <span className="crx" key={v.rx[i].k}>{v.rx[i].e}</span>}
                </div>
              ))}
            </div>
          </Scene>
        )}
        {v.cam === "lines" && (
          <div className="cscene">
            <div className="clines" style={{ backgroundImage: `url(${IMG("lines_top")})` }} />
            <div className="cframe">
              {v.lineWho === "L" ? <Sprite atlas="naruhodo" anim={lCloseAnim} x={70} scale={1.3} /> : <Piece who={defendant} cls="wit" />}
              {v.present && <div className="cpresent"><span>{EV_TYPES[v.present.type].i}</span></div>}
            </div>
          </div>
        )}
        {v.pan && (
          <div className="cpan" key={v.pan.k} style={{ "--from": `calc(var(--u) * ${panX.from})`, "--to": `calc(var(--u) * ${panX.to})` }}>
            <img src={IMG("bg_pan")} alt="" />
          </div>
        )}
        {v.round && v.cam !== "title" && <div className="cround">{v.round}/{RULES.testimonies}</div>}
        {v.banner === "cross" && <img className="cfull ccrossbg" src={IMG("ui_cross")} alt="" />}
        {v.banner && <div className={`cbanner ${v.banner}`}><span>{v.banner === "test" ? "~ คำให้การ ~" : "~ ซักค้าน ~"}</span></div>}
        {v.gavel >= 0 && (
          <div className="cscene cgavel">
            <img className="cfull" src={IMG("gavel_5")} alt="" />
            <div className="cframe"><img className="cbg" src={IMG("gavel_" + v.gavel)} alt="" /></div>
            {v.gavel === 4 && <img className="cfull cgflash" src={IMG("gavel_0")} alt="" />}
          </div>
        )}
        {v.shout && (
          <div className="cshout" key={v.shout.k}>
            <img src={IMG(SHOUT_IMG[v.shout.kind])} alt="" />
          </div>
        )}
        {v.dlg && (
          <div className={`cdlg ${v.dlg.done ? "done" : ""}`}>
            <div className="cwho">{v.dlg.name}</div>
            <div className={`ctxt ${v.dlg.color}`}>{shownText}</div>
            <i className="cnext">▼</i>
          </div>
        )}
        {v.verdict && (
          <div className={`cverdict ${v.verdict.w}`}>
            <img className="cfull" src={IMG("gavel_5")} alt="" />
            <div className="cwords">{v.verdict.words.slice(0, v.verdict.shown).map((x, i) => <span key={i}>{x}</span>)}</div>
          </div>
        )}
        <div className="cflash" key={"f" + v.flash} />
        <Overlay key={v.bottom.kind} v={v} set={set} uiDone={uiDone} start={start} S={S} />
      </div>
    </div>
  );
}

const stop = (e) => e.stopPropagation();
function Overlay({ v, set, uiDone, start, S }) {
  const b = v.bottom; const s = S.current;
  const [sel, setSel] = useState(null);
  const [rec, setRec] = useState(null); // null | "view" | "present"
  const [pick, setPick] = useState([]); // builder: [{i, al}]
  const bg = (k) => ({ backgroundImage: `linear-gradient(rgba(10,8,6,.55), rgba(10,8,6,.7)), url(${IMG(k)})` });
  const mute = <button className="cmute" onClick={(e) => { e.stopPropagation(); setCourtMuted(!courtMuted); set({ muted: !courtMuted }); }}>{v.muted ? "🔇" : "🔊"}</button>;

  if (b.kind === "start") return <div className="cui" onClick={stop}>{mute}<div className="ccenter"><button className="cbtn big" onClick={start}>⚖️ เริ่มการไต่สวน</button></div></div>;
  if (b.kind === "verdict") return (
    <div className="cui" onClick={stop}>{mute}
      <div className="cresbar" style={bg("ui_top")}>
        <div className="cres">{b.res.map((r) => <span key={r}>{r}</span>)}</div>
        <button className="cbtn" onClick={start}>เริ่มใหม่</button>
      </div>
    </div>
  );
  if (b.kind === "obj") return (
    <div className="cui" onClick={stop}>
      <button className="cbtn objection cobj" style={{ backgroundImage: `linear-gradient(rgba(195,34,26,.8), rgba(195,34,26,.8)), url(${IMG("lines_bottom")})` }} onClick={() => uiDone(true)}>คัดค้าน! <small>{b.t}</small></button>
    </div>
  );
  if (b.kind === "builder") {
    const used = pick.filter((p) => p.al).length;
    return (
      <div className="cui dim" onClick={stop}>
        <div className="cpanel" style={bg("ui_talk")}>
          <div className="clist">
            {b.pool.map((st, i) => {
              const at = pick.findIndex((p) => p.i === i), on = at >= 0;
              return (
                <div key={i} className={`cline ${on ? "on" : ""}`} onClick={() => setPick((p) => (on ? p.filter((x) => x.i !== i) : p.length < RULES.statements ? [...p, { i, al: false }] : p))}>
                  <b>{on ? at + 1 : ""}</b><span>{st.text}</span>
                  {on && st.kind === "lie" && (
                    <button className={`cal ${pick[at].al ? "on" : ""}`} disabled={!pick[at].al && used >= b.alibi}
                      onClick={(e) => { e.stopPropagation(); setPick((p) => p.map((x) => (x.i === i ? { ...x, al: !x.al } : x))); }}>📍</button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="crow"><span className="ccnt">{pick.length}/{RULES.statements} · 📍×{b.alibi - used}</span>
            <button className="cbtn" disabled={pick.length !== RULES.statements} onClick={() => uiDone(pick.map((p) => ({ ...b.pool[p.i], alibi: p.al })))}>ให้การ</button></div>
        </div>
      </div>
    );
  }
  if (rec) {
    const evs = v.evidence; const cur = sel || evs.find((e) => !e.used) || evs[0];
    return (
      <div className="cui dim" onClick={stop}>
        <div className="cpanel rec" style={bg("ui_bottom")}>
          <div className="cslots">
            {evs.map((e) => (
              <button key={e.id} className={`cslot ${cur === e ? "on" : ""}`} disabled={e.used} onClick={() => setSel(e)}>{EV_TYPES[e.type].i}</button>
            ))}
          </div>
          {cur && <div className="cdetail"><span>{EV_TYPES[cur.type].i}</span><div><b>{evName(cur)}</b><small>{evSub(cur)}</small></div></div>}
          <div className="crow">
            <button className="cbtn ghost" onClick={() => setRec(null)}>✕</button>
            {rec === "present" && <button className="cbtn red" disabled={!cur || cur.used} onClick={() => uiDone({ type: "present", idx: v.cxIdx, ev: cur })}>เอานี่ไปดู!</button>}
          </div>
        </div>
      </div>
    );
  }
  if (b.kind === "cross" && v.list) {
    const st = v.list[v.cxIdx];
    const go = (d) => {
      const n = v.list.length; const i = (v.cxIdx + d + n) % n; if (s) s.cx = i;
      const x = v.list[i];
      set({ cxIdx: i, dlg: { who: "D", name: v.dlg?.name || "", text: (s?.revealAlibi && x.alibi ? "📍 " : "") + x.text, n: 999, color: "green", done: true } });
    };
    return (
      <div className="cui" onClick={stop}>{mute}
        <button className="cbtn yellow cpress" disabled={st.done || st.pressed || (s?.pressLeft || 0) <= 0} onClick={() => uiDone({ type: "press", idx: v.cxIdx })}>เดี๋ยวก่อน!</button>
        <button className="cbtn red cpresentbtn" disabled={st.done || st.presentTried || !v.evidence.some((e) => !e.used)} onClick={() => setRec("present")}>คัดค้าน!</button>
        <button className="cbtn ghost carrow l" onClick={() => go(-1)}>◀</button>
        <button className="cbtn ghost carrow r" onClick={() => go(1)}>▶</button>
        <div className="ctopmid">
          <div className="cdots">{v.list.map((x, i) => <i key={i} className={`${i === v.cxIdx ? "cur" : ""} ${x.done ? "done" : ""}`} />)}</div>
          <div className="crow c"><button className="cbtn ghost" onClick={() => setRec("view")}>หลักฐาน</button><button className="cbtn ghost" onClick={() => uiDone({ type: "end" })}>จบ</button></div>
        </div>
      </div>
    );
  }
  return (
    <div className="cui pass">{mute}
      {v.evidence.length > 0 && b.kind === "idle" && <button className="cbtn ghost crecbtn" onClick={(e) => { e.stopPropagation(); setRec("view"); }}>หลักฐาน</button>}
    </div>
  );
}
