// "server" จำลองในหน้าทดสอบ ?court=1 — สร้าง state.court + beat.steps ตาม naruhodo-contract.md (กติกาจาก courtCase.js)
//  คนเล่น 1 คน (humanId) · บทบาทที่เหลือเป็น AI · CourtOverlay ใช้ได้เหมือนต่อ server จริง
import { RULES, shuffle, statementPool, contradicts, aiTestimony, presentResult, aiLawyerPlan } from "./courtCase";
import { iconFor, EV_ICON_NAMES } from "./evidenceData";
import { stepsMs, TESTIFY_LINE_MS, BANNER_MS } from "./courtSteps";
import { line } from "./courtLines";

const rnd = (a) => a[Math.floor(Math.random() * a.length)];
export const evDesc = (e) => (e.kind === "move"
  ? `รอยเท้าของ ${e.actorName} เดินข้ามสนามตอนเทิร์น ${e.round}`
  : `${e.actorName} ใช้ ${e.skill}${e.targetName ? ` ใส่ ${e.targetName}` : ""} ตอนเทิร์น ${e.round}`);
export const toEvidence = (e) => { const icon = iconFor(e.type, e.id); return { ...e, icon, name: EV_ICON_NAMES[icon], desc: evDesc(e), used: false }; };
const DMG_STEP_MS = 1100;

export class MockCourt {
  // players: [{ id, name, img, character: { name, img } }] · roles: { L, D, co: [], C: [], G: [] } · events: บันทึกของจำเลย (มี seen)
  constructor({ players, roles, events, humanId, mode, onChange, quick = false, dcred = 0, slow = false }) {
    this.quick = quick; this.dcred = dcred; this.slow = slow;
    this.players = players; this.roles = roles; this.events = events; this.human = humanId; this.mode = mode;
    this.onChange = onChange; this.timers = []; this.seq = 0; this.c = null;
    this.N = (id) => {
      if (id === roles.D && roles.Dunits) return roles.Dunits.map((u) => u.name).join(" & ");
      const p = players.find((x) => x.id === id); return p ? p.character?.name || p.name : "?";
    };
  }
  stop() { this.timers.forEach(clearTimeout); this.timers = []; }
  later(fn, ms) { const t = setTimeout(() => { this.timers = this.timers.filter((x) => x !== t); fn(); }, ms); this.timers.push(t); return t; }
  push() { this.updateMusic(); this.onChange && this.onChange(); }
  isAI(id) { return id !== this.human; }

  start() {
    const r = this.roles, ev = this.events;
    const seen = ev.filter((e) => e.seen).slice(-(RULES.maxEvidence - 1)).map(toEvidence);
    const other = this.players.find((p) => p.id !== r.L && p.id !== r.D);
    if (other) seen.splice(1, 0, toEvidence({ id: "ox1", round: 2, actorId: other.id, actorName: this.N(other.id), kind: "basic", skill: "ตีปกติ", targetName: this.N(r.L), type: "weapon" }));
    if (seen[0]) seen[0].pinned = true;
    const sightings = {};
    for (const id of [...r.co, ...r.C, ...r.G]) {
      sightings[id] = ev.filter(() => Math.random() < 0.45).map((e) => { const x = toEvidence(e); return { key: e.id, desc: x.desc, icon: x.icon, name: x.name, type: x.type }; });
    }
    this.c = {
      id: "case" + Date.now(), phase: "opening", round: 1, rounds: RULES.testimonies, deadline: null,
      lawyerId: r.L, defendantId: r.D, coIds: r.co, counselIds: r.C, galleryIds: r.G, outIds: [],
      cred: { L: RULES.cred, D: this.dcred || RULES.cred }, list: null, cx: 0, pool: null, alibi: Math.min(RULES.maxAlibi, ev.filter((e) => !e.seen).length),
      evidence: seen, sightings, witnessUsed: [], lent: [], pressLeft: 0, counselLeft: 0, beat: null, verdict: null, music: "trial",
      proven: new Set(), objFlag: false, cheer: {}, acted: {},
    };
    this.opening();
  }

  // ---------- state ที่ส่งให้ client ----------
  stateFor(viewer) {
    const c = this.c;
    const base = { youId: viewer, gameState: "ACTION", players: this.players.map((p) => ({ ...p, alive: true })) };
    if (!c) return { ...base, court: null };
    const sideD = viewer === c.defendantId || c.counselIds.includes(viewer);
    const sideL = viewer === c.lawyerId || c.coIds.includes(viewer);
    return {
      ...base,
      court: {
        id: c.id, phase: c.phase, round: c.round, rounds: c.rounds, deadline: c.deadline,
        lawyerId: c.lawyerId, defendantId: c.defendantId, ...(this.roles.Dunits ? { defendantUnits: this.roles.Dunits } : {}), coIds: c.coIds, counselIds: c.counselIds, galleryIds: c.galleryIds, outIds: c.outIds,
        cred: { ...c.cred },
        list: c.list && c.list.map((s) => ({ text: s.text, done: s.done, pressed: s.pressed, presentTried: s.presentTried, alibiShown: !!s.alibiShown, ...(sideD ? { alibi: !!s.alibi, kind: s.kind } : {}) })),
        cx: c.cx,
        pool: sideD && c.phase === "testimony" ? c.pool.map(({ key, text, kind }) => ({ key, text, kind })) : null,
        alibiLeft: sideD ? c.alibi : undefined,
        evidence: sideL ? c.evidence.map((e) => ({ ...e })) : undefined,
        sightings: viewer === c.defendantId ? [] : c.sightings[viewer] || [],
        rx: c.phase === "gallery" ? (c.gx || []).map((g) => g.id) : [],
        witnessUsed: c.witnessUsed.slice(), lent: c.lent.slice(), pressLeft: c.pressLeft, counselLeft: c.counselLeft,
        beat: c.beat, verdict: c.verdict, music: c.music,
      },
    };
  }
  updateMusic() {
    const c = this.c; if (!c) return;
    if (c.clipping) c.music = null;
    else if (c.verdict || c.vw) c.music = (c.verdict?.w || c.vw) === "guilty" ? "victory" : null;
    else if (c.cred.D <= 1) c.music = "pursuit";
    else if (c.cred.L <= 2) c.music = "trouble";
    else if (c.cred.D <= 2) c.music = "cornered";
    else if (c.objFlag) c.music = "objection";
    else if (["cross", "objectWindow"].includes(c.phase) || (c.phase === "beat" && c.inCross)) c.music = "think";
    else c.music = "trial";
  }

  beat(steps, then) {
    const c = this.c; c.phase = "beat"; c.deadline = null; c.beat = { seq: ++this.seq, steps };
    this.push();
    this.later(() => then && then(), stepsMs(steps) + 250);
  }
  vars() { return { D: this.N(this.c.defendantId), L: this.N(this.c.lawyerId) }; }
  say(who, key, color, extra = {}) {
    const name = who === "J" ? "ผู้พิพากษา" : who === "L" ? this.N(this.c.lawyerId) : who === "D" ? this.N(this.c.defendantId) : extra.name || "";
    const text = typeof key === "string" && key.startsWith("=") ? key.slice(1) : line(key, { ...this.vars(), ...(extra.vars || {}) });
    return { k: "say", who, name, text, ...(color ? { color } : {}), ...(extra.id ? { id: extra.id } : {}) };
  }

  // ---------- ขั้นต่างๆ ----------
  opening() {
    if (this.quick) return this.beat([{ k: "gavel", n: 1 }], () => this.testimony()); // ?quick=1 (dev) ข้ามบทเปิด
    const c = this.c, s = [
      { k: "cam", cam: "wide" }, { k: "gavel", n: 3 },
      this.say("J", "judgeOpen"),
      { k: "pose", who: "L", pose: "confident" }, this.say("L", "lawyerReady", "blue"),
    ];
    if (c.coIds[0]) s.push({ k: "cam", cam: "cocounsel", who: c.coIds[0] }, this.say("T", "coReady", "", { name: this.N(c.coIds[0]), id: c.coIds[0] }));
    if (c.counselIds[0]) s.push({ k: "cam", cam: "prosecution", who: c.counselIds[0] }, this.say("C", "counselReady", "", { name: this.N(c.counselIds[0]), id: c.counselIds[0] }));
    else if (c.galleryIds.length) s.push({ k: "cam", cam: "wide" }, this.say("J", "galleryHush"));
    s.push({ k: "cam", cam: "witness" }, this.say("D", "defTaunt"), { k: "pose", who: "J", pose: "normal" }, this.say("J", "judgeTestify"));
    this.beat(s, () => this.testimony());
  }

  testimony() {
    const c = this.c;
    c.phase = "testimony"; c.beat = null; c.inCross = false;
    c.pressLeft = RULES.pressPer; c.counselLeft = c.counselIds.length ? RULES.counselObj : 0; c.list = null; c.cx = 0;
    c.pool = shuffle(statementPool(this.events, c.proven)).slice(0, 9);
    c.deadline = Date.now() + 40000;
    const humanSide = [c.defendantId, ...c.counselIds].includes(this.human);
    this.tTest = this.later(() => this.autoTestimony(), humanSide ? 40000 : this.slow ? 22000 : 2600 + Math.random() * 1500); // ?wait=1 (dev) = AI จำเลยคิดนาน
    this.push();
  }
  autoTestimony() {
    const c = this.c; if (!c || c.phase !== "testimony") return;
    const list = aiTestimony(c.pool, c.alibi);
    this.setList(list);
  }
  setList(list) {
    const c = this.c; clearTimeout(this.tTest);
    c.list = list.map((s) => ({ ...s, done: false, pressed: false, presentTried: false, alibiShown: false }));
    c.phase = "testify"; c.deadline = null; c.beat = null;
    this.push();
    this.later(() => this.crossStart(), BANNER_MS.test + TESTIFY_LINE_MS * c.list.length + 300);
  }

  crossStart() {
    const c = this.c; c.inCross = true;
    const s = [{ k: "banner", kind: "cross" }, { k: "cam", cam: "defense" }, { k: "pose", who: "L", pose: "think" }, this.say("L", c.cred.L <= 2 ? "crossLow" : "crossThink", "blue")];
    this.beat(s, () => { c.crossEnd = Date.now() + 60000; this.cross(); });
  }
  cross() {
    const c = this.c; if (!c) return;
    if (c.cred.D <= 0) return this.verdict("guilty");
    if (c.cred.L <= 0) return this.verdict("free");
    if (c.list.every((x) => x.done)) return this.roundEnd();
    c.phase = "cross"; c.beat = null; c.deadline = c.crossEnd;
    this.push();
    clearTimeout(this.tCross); this.tCross = this.later(() => { if (c.phase === "cross") this.roundEnd(); }, Math.max(0, c.crossEnd - Date.now()));
    if (this.isAI(c.lawyerId) && !c.coIds.includes(this.human)) this.later(() => this.aiLawyer(), 1300);
    else if (this.isAI(c.lawyerId)) this.later(() => this.aiLawyer(), 6000); // ผู้ช่วยเป็นคน: เปิดโอกาสให้กดก่อน
    for (const co of c.coIds) if (this.isAI(co) && !c.lent.includes(co) && c.sightings[co]?.length && Math.random() < 0.3) {
      this.later(() => { if (c.phase === "cross") this.act(co, "courtAct", { type: "lend", evKey: rnd(c.sightings[co]).key }); }, 800);
    }
  }
  aiLawyer() {
    const c = this.c; if (!c || c.phase !== "cross") return;
    const i = c.list.findIndex((x) => !x.done && !x.aiSeen);
    if (i < 0) return this.act(c.lawyerId, "courtAct", { type: "end" });
    c.cx = i; this.push();
    this.later(() => {
      if (c.phase !== "cross") return;
      const st = c.list[i]; st.aiSeen = true;
      const plan = aiLawyerPlan(st, c.evidence, st.pressed ? 0 : c.pressLeft);
      if (plan.press) return this.act(c.lawyerId, "courtAct", { type: "press", idx: i });
      if (plan.present && !st.presentTried) return this.act(c.lawyerId, "courtAct", { type: "present", idx: i, evId: plan.present.id });
      this.aiLawyer();
    }, 1600);
  }

  // ---------- socket ----------
  emit(from, ev, p = {}) {
    const c = this.c; if (!c) return;
    if (ev === "courtTestimony" && c.phase === "testimony" && [c.defendantId, ...c.counselIds].includes(from)) {
      const picks = (p.picks || []).slice(0, RULES.statements);
      let al = c.alibi;
      const list = picks.map((k) => { const st = c.pool.find((x) => x.key === k.key); if (!st) return null; const a = !!k.alibi && st.kind === "lie" && al > 0; if (a) al--; return { ...st, alibi: a }; }).filter(Boolean);
      if (list.length === RULES.statements) this.setList(list);
      return;
    }
    if (ev === "courtAct") return this.act(from, ev, p);
    if (ev === "courtObject" && c.phase === "objectWindow" && c.counselIds.includes(from) && c.counselLeft > 0) return this.objResolve(true, from);
    if (ev === "courtGallery" && c.phase === "gallery") return this.galleryAct(from, p);
  }
  act(from, ev, p) {
    const c = this.c;
    if (!c || c.phase !== "cross" || (from !== c.lawyerId && !c.coIds.includes(from))) return;
    if (p.type === "view") { c.cx = Math.max(0, Math.min(c.list.length - 1, p.idx | 0)); this.push(); return; }
    if (p.type === "end") { clearTimeout(this.tCross); return this.roundEnd(); }
    if (p.type === "lend") return this.lend(from, p.evKey);
    const st = c.list[p.idx]; if (!st || st.done) return;
    c.cx = p.idx;
    if (p.type === "press" && !st.pressed && c.pressLeft > 0) return this.press(st);
    if (p.type === "present" && !st.presentTried) { const e = c.evidence.find((x) => x.id === p.evId && !x.used); if (e) return this.present(st, e); }
  }

  press(st) {
    const c = this.c; st.pressed = true; c.pressLeft--;
    const s = [{ k: "shout", who: "L", kind: "holdit" }, this.say("L", "pressL", "blue")];
    if (st.alibi) {
      s.push(this.say("D", "pressAlibiD"), { k: "pose", who: "L", pose: "confident" }, this.say("L", "pressAlibiPush", "blue"), { k: "hurt", side: "D", n: 0, ms: 700 }, this.say("D", "pressAlibiBreak"));
      st.alibi = false; c.alibi = Math.max(0, c.alibi - 1);
      const hid = this.events.find((e) => contradicts(st, e) && !c.evidence.some((x) => x.id === e.id));
      if (hid) {
        const x = toEvidence(hid); this.addEvidence(x);
        s.push({ k: "cam", cam: "defense" }, { k: "pose", who: "L", pose: "paper" }, { k: "present", ev: { icon: x.icon, name: x.name, desc: x.desc }, ms: 1300 }, this.say("L", "pressGain", "blue"));
      }
    } else {
      s.push(this.say("D", st.kind === "truth" ? "pressTruthD" : "pressLieD"), { k: "cam", cam: "defense" }, { k: "pose", who: "L", pose: "sheepish" }, this.say("L", "pressSheepish", "blue"));
    }
    this.beat(s, () => this.cross());
  }
  present(st, e) {
    const c = this.c;
    const s = [{ k: "shout", who: "L", kind: "objection" }, { k: "present", ev: { icon: e.icon, name: e.name, desc: e.desc } }, this.say("L", "presentL", "blue")];
    this.pending = { st, e };
    this.beat(s, () => {
      if (c.counselLeft > 0 && c.counselIds.length) {
        c.phase = "objectWindow"; c.beat = null; c.deadline = Date.now() + 3000; this.push();
        this.tObj = this.later(() => this.objResolve(false), 3000);
        for (const id of c.counselIds) if (this.isAI(id) && Math.random() < 0.45) this.later(() => { if (c.phase === "objectWindow") this.objResolve(true, id); }, 700 + Math.random() * 1500);
      } else this.resolvePresent();
    });
  }
  objResolve(yes, who) {
    const c = this.c; if (c.phase !== "objectWindow") return; clearTimeout(this.tObj);
    if (!yes) return this.resolvePresent();
    c.counselLeft--; const { st, e } = this.pending; st.presentTried = true;
    const nm = this.N(who);
    // ทายใจผิด (หลักฐานผิดอยู่แล้ว) = ฝ่ายจำเลย −1 แล้วผลยื่นหลักฐานเดินต่อตามปกติ
    const r0 = presentResult(st, e);
    if (r0.kind === "irrelevant" || r0.kind === "wrong") {
      c.cred.D = Math.max(0, c.cred.D - 1);
      const s0 = [{ k: "shout", who: "C", kind: "objection" }, { k: "cam", cam: "prosecution", who }, this.say("C", "counselObj", "", { name: nm, id: who }),
        { k: "pose", who: "J", pose: "angry" }, this.say("J", "=คำคัดค้านไม่มีน้ำหนัก! ฝ่ายจำเลยถูกหักคะแนน"), { k: "cam", cam: "witness" }, { k: "hurt", side: "D", n: 1, ms: DMG_STEP_MS }];
      return this.beat(s0, () => { st.presentTried = false; this.resolvePresent(); });
    }
    const s = [{ k: "shout", who: "C", kind: "objection" }, { k: "cam", cam: "prosecution", who }, this.say("C", "counselObj", "", { name: nm, id: who }),
      { k: "pose", who: "J", pose: "normal" }, this.say("J", "judgeSustain"), { k: "cam", cam: "defense" }, { k: "pose", who: "L", pose: "sheepish" }, this.say("L", "lawyerOops", "blue")];
    this.beat(s, () => this.cross());
  }
  resolvePresent() {
    const c = this.c, { st, e } = this.pending; st.done = true;
    const r = e.actorId != null && e.actorId !== c.defendantId && !(this.roles.Dunits || []).some((u) => u.id === e.actorId) ? { kind: "wrong", dL: RULES.wrong } : presentResult(st, e);
    const s = [];
    const hurtL = (n) => { c.cred.L = Math.max(0, c.cred.L - n); s.push({ k: "hurt", side: "L", n, ms: DMG_STEP_MS }); };
    const hurtD = (n) => { c.cred.D = Math.max(0, c.cred.D - n); s.push({ k: "cam", cam: "witness" }, { k: "hurt", side: "D", n, ms: DMG_STEP_MS }); };
    if (r.kind === "irrelevant" || r.kind === "wrong") {
      s.push({ k: "gavel", n: 1 }, { k: "pose", who: "J", pose: "angry" }, this.say("J", r.kind === "irrelevant" ? "judgeIrrelevant" : "judgeWrong"), { k: "cam", cam: "defense" });
      hurtL(r.dL); s.push({ k: "pose", who: "L", one: "headDown", ms: 800 }, this.say("L", "lawyerOops", "blue"));
    } else if (r.kind === "alibi") {
      e.used = true; st.alibi = false; c.alibi = Math.max(0, c.alibi - 1);
      s.push({ k: "shout", who: "D", kind: "holdit" }, this.say("D", "alibiD"), { k: "pose", who: "J", pose: "normal" }, this.say("J", "judgeAlibi"), { k: "cam", cam: "defense" });
      hurtL(r.dL);
    } else if (r.kind === "pierce") {
      e.used = true; st.alibi = false; c.alibi = Math.max(0, c.alibi - 1);
      s.push({ k: "cam", cam: "defense" }, { k: "pose", who: "L", pose: "desk" }, { k: "pose", who: "L", one: "slam", ms: 350 }, this.say("L", "pierceL", "blue"));
      hurtD(r.dD); s.push(this.say("D", "hitD", "red"));
      c.objFlag = true;
    } else {
      e.used = true; c.proven.add(st.text); c.objFlag = true;
      s.push({ k: "cam", cam: "witness" }, this.say("D", "hitD", "red"));
      hurtD(r.dD);
      s.push({ k: "pose", who: "J", pose: "surprised" }, this.say("J", "judgeHit"), { k: "pose", who: "J", one: "nod", ms: 800 });
      if (r.healL) { c.cred.L = Math.min(RULES.cred, c.cred.L + r.healL); s.push({ k: "cam", cam: "defense" }, { k: "heal", side: "L", n: r.healL }); }
      if (r.reveal) c.list.forEach((x) => { if (!x.done && x.alibi) x.alibiShown = true; });
      s.push({ k: "cam", cam: "defense" }, { k: "pose", who: "L", pose: "confident" }, this.say("L", "lawyerHit", "blue"));
      if (c.cred.D > 0 && c.cred.D <= 2) s.push({ k: "cam", cam: "witness" }, this.say("D", "defLow"));
    }
    this.beat(s, () => this.cross());
  }
  addEvidence(x) {
    const c = this.c; if (c.evidence.some((e) => e.id === x.id)) return;
    c.evidence.push(x);
    while (c.evidence.length > RULES.maxEvidence) { const i = c.evidence.findIndex((e) => e.used); c.evidence.splice(i >= 0 ? i : 0, 1); }
  }
  lend(co, key) {
    const c = this.c; if (c.lent.includes(co)) return;
    const sg = (c.sightings[co] || []).find((x) => x.key === key); if (!sg) return;
    c.lent.push(co);
    const e = this.events.find((x) => x.id === key); const x = toEvidence(e); this.addEvidence(x);
    const s = [{ k: "cam", cam: "cocounsel", who: co }, this.say("T", "lendT", "", { name: this.N(co), id: co }), { k: "present", ev: { icon: x.icon, name: x.name, desc: x.desc }, ms: 1400 },
      { k: "cam", cam: "defense" }, { k: "pose", who: "L", pose: "confident" }, this.say("L", "lendL", "blue")];
    this.beat(s, () => this.cross());
  }

  // ---------- ประชาชน ----------
  roundEnd() {
    const c = this.c; clearTimeout(this.tCross); c.inCross = false;
    if (c.cred.D <= 0) return this.verdict("guilty");
    if (c.cred.L <= 0) return this.verdict("free");
    const live = c.galleryIds.filter((id) => !c.outIds.includes(id));
    if (this.mode !== "pvp" || !live.length) return this.nextRound();
    c.phase = "gallery"; c.beat = null; c.deadline = Date.now() + 8000; c.gx = []; c.acted = {};
    this.push();
    for (const id of live) if (this.isAI(id)) this.later(() => this.aiGallery(id), 900 + Math.random() * 5500);
    this.tGal = this.later(() => this.galleryEnd(), 8000);
  }
  aiGallery(id) {
    const c = this.c; if (c.phase !== "gallery" || c.acted[id]) return;
    const lead = c.cred.L > c.cred.D ? "L" : c.cred.D > c.cred.L ? "D" : rnd(["L", "D"]);
    const r = Math.random();
    if (!c.witnessUsed.includes(id) && r < 0.18) {
      const sg = c.sightings[id] || [];
      if (sg.length && Math.random() < 0.6) return this.galleryAct(id, { e: "witnessL", evKey: rnd(sg).key });
      return this.galleryAct(id, { e: "witnessD" });
    }
    const side = Math.random() < 0.6 ? lead : rnd(["L", "D"]);
    this.galleryAct(id, { e: r < 0.55 ? "cheer" : r < 0.78 ? "boo" : "throw", side });
  }
  galleryAct(id, p) {
    const c = this.c;
    if (c.phase !== "gallery" || !c.galleryIds.includes(id) || c.outIds.includes(id) || c.acted[id]) return;
    if ((p.e === "witnessL" || p.e === "witnessD") && c.witnessUsed.includes(id)) return;
    if (p.e === "witnessL" && !(c.sightings[id] || []).some((x) => x.key === p.evKey)) return;
    c.acted[id] = true; c.gx.push({ id, ...p });
    if (p.e === "witnessL" || p.e === "witnessD") c.witnessUsed.push(id);
    this.push();
    const live = c.galleryIds.filter((g) => !c.outIds.includes(g));
    if (live.every((g) => c.acted[g])) { clearTimeout(this.tGal); this.later(() => this.galleryEnd(), 400); }
  }
  galleryEnd() {
    const c = this.c; if (c.phase !== "gallery") return;
    const rx = [], delta = { L: 0, D: 0 }; let throws = 0, last = null;
    const s = [{ k: "cam", cam: "wide" }];
    const wit = [];
    for (const g of c.gx) {
      if (g.e === "cheer") { rx.push({ id: g.id, e: "👏", side: g.side }); delta[g.side]++; c.cheer[g.id] = c.cheer[g.id] || { L: 0, D: 0 }; c.cheer[g.id][g.side]++; }
      else if (g.e === "boo") { rx.push({ id: g.id, e: "👎", side: g.side }); delta[g.side]--; }
      else if (g.e === "throw") { rx.push({ id: g.id, e: "🍅", side: g.side }); delta[g.side]--; throws++; last = g.id; }
      else wit.push(g);
    }
    if (rx.length) s.push({ k: "gallery", rx }, this.say("G", "murmur", "", { name: "ประชาชน" }));
    if (throws > 3 && last) {
      c.outIds.push(last);
      s.push({ k: "gavel", n: 2 }, { k: "pose", who: "J", pose: "angry" }, this.say("J", "kickJ"), { k: "cam", cam: "wide" }, { k: "kick", id: last });
    }
    for (const w of wit) {
      const nm = this.N(w.id);
      if (w.e === "witnessL") {
        const e = this.events.find((x) => x.id === w.evKey); const x = toEvidence(e); this.addEvidence(x);
        s.push({ k: "pose", who: "J", pose: "surprised" }, this.say("J", "judgeWitness"), { k: "cam", cam: "cocounsel", who: w.id },
          this.say("G", "witnessL", "", { name: nm, id: w.id, vars: { X: x.desc } }), { k: "present", ev: { icon: x.icon, name: x.name, desc: x.desc }, ms: 1400 });
        (c.witL = c.witL || []).push(w.id);
      } else {
        c.alibi = Math.min(RULES.maxAlibi, c.alibi + 1);
        s.push({ k: "cam", cam: "witness", who: w.id }, this.say("G", "witnessD", "", { name: nm, id: w.id }), { k: "cam", cam: "witness" }, { k: "pose", who: "J", pose: "normal" }, this.say("J", "judgeWitness"));
        (c.witD = c.witD || []).push(w.id);
      }
    }
    for (const k of ["L", "D"]) {
      const d = Math.max(-2, Math.min(2, delta[k]));
      const before = c.cred[k]; c.cred[k] = Math.max(0, Math.min(RULES.cred, c.cred[k] + d));
      const real = c.cred[k] - before;
      if (real > 0) s.push({ k: "cam", cam: k === "L" ? "defense" : "witness" }, { k: "heal", side: k, n: real });
      if (real < 0) s.push({ k: "cam", cam: k === "L" ? "defense" : "witness" }, { k: "hurt", side: k, n: -real, ms: DMG_STEP_MS });
    }
    if (s.length === 1) s.push({ k: "say", who: "G", name: "ประชาชน", text: "(...)", ms: 1200 });
    this.beat(s, () => (c.cred.D <= 0 ? this.verdict("guilty") : c.cred.L <= 0 ? this.verdict("free") : this.nextRound()));
  }

  nextRound() {
    const c = this.c;
    if (c.round >= RULES.testimonies) return this.verdict(c.cred.D < c.cred.L ? "guilty" : c.cred.L < c.cred.D ? "free" : "tie");
    c.round++;
    this.beat([{ k: "gavel", n: 1 }, { k: "pose", who: "J", pose: "normal" }, this.say("J", "judgeNext"), { k: "cam", cam: "witness" }], () => this.testimony());
  }

  verdict(w) {
    const c = this.c; c.inCross = false; clearTimeout(this.tCross);
    // หลักฐานชี้ขาดทำจำเลยหมด = คลิปปิดคดีก่อน (เพลงหยุด court.music = null) แล้วค่อยตัดสิน
    if (w === "guilty" && c.cred.D <= 0 && !c.clipDone) {
      c.clipDone = true; c.clipping = true;
      return this.beat([{ k: "clip", src: "/characters/naruhodo_ryuichi/court/finale.mp4", ms: 5300 }], () => { c.clipping = false; this.verdict(w); });
    }
    c.vw = w;
    const s = [];
    if (w === "guilty") s.push({ k: "cam", cam: "witness" }, this.say("D", "guiltyD", "red"));
    if (w === "free") s.push({ k: "cam", cam: "defense" }, { k: "pose", who: "L", one: "shock", ms: 900 }, this.say("L", "freeL", "blue"));
    s.push({ k: "gavel", n: 1 }, { k: "pose", who: "J", pose: "normal" }, this.say("J", w === "tie" ? "verdictTie" : "verdictJ"), { k: "verdict", w });
    const rewards = [];
    if (w !== "tie") {
      const side = w === "guilty" ? "L" : "D";
      const live = c.galleryIds.filter((id) => !c.outIds.includes(id));
      const best = Math.max(0, ...live.map((id) => c.cheer[id]?.[side] || 0));
      if (best > 0) live.filter((id) => (c.cheer[id]?.[side] || 0) === best).forEach((id) => rewards.push({ id, name: this.N(id), hp: 1 }));
      for (const id of (side === "L" ? c.witL : c.witD) || []) { const r0 = rewards.find((r) => r.id === id); if (r0) r0.coins = 2; else rewards.push({ id, name: this.N(id), hp: 1, coins: 2 }); }
    }
    this.beat(s, () => {
      c.phase = "verdict"; c.beat = null; c.verdict = { w, rewards }; c.deadline = Date.now() + 6000; this.push();
      this.later(() => { this.c = null; this.push(); }, 6000);
    });
    c.verdict = null;
  }
}
