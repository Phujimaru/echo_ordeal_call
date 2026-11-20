// "server" จำลองในหน้าทดสอบ ?court=1 — สร้าง state.court + beat.steps ตาม naruhodo-contract.md (กติกาจาก courtCase.js)
//  คนเล่น 1 คน (humanId) · บทบาทที่เหลือเป็น AI · CourtOverlay ใช้ได้เหมือนต่อ server จริง
import { RULES, shuffle, statementPool, contradicts, aiTestimony, presentResult, aiLawyerPlan } from "./courtCase";
import { iconFor, EV_ICON_NAMES } from "./evidenceData";
import { stepsMs, TESTIFY_LINE_MS, BANNER_MS } from "./courtSteps";
import { line } from "./courtLines";

const rnd = (a) => a[Math.floor(Math.random() * a.length)];
export const evDesc = (e) => (e.kind === "move"
  ? `รอยเท้าของ ${e.actorName} เดินข้ามสนามตอนเทิร์น ${e.round}`
  : `${e.actorName} ใช้ «${e.skill}»${e.targetName ? ` ใส่ ${e.targetName}` : ""} ตอนเทิร์น ${e.round}`);
export const toEvidence = (e) => { const icon = iconFor(e.type, e.id); return { ...e, icon, name: EV_ICON_NAMES[icon], desc: evDesc(e), used: false }; };
const DMG_STEP_MS = 1100;

export class MockCourt {
  // players: [{ id, name, img, character: { name, img } }] · roles: { L, D, co: [], C: [], G: [] } · events: บันทึกของจำเลย (มี seen)
  constructor({ players, roles, events, humanId, mode, onChange, quick = false, dcred = 0, slow = false }) {
    this.quick = quick; this.dcred = dcred; this.slow = slow;
    this.players = players; this.roles = roles; this.events = events; this.human = humanId; this.mode = mode;
    this.onChange = onChange; this.timers = []; this.seq = 0; this.c = null; this.pendRx = []; this.feedSeq = 0;
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
    const pol = ev.find((e) => !e.seen);
    if (pol) { const x = toEvidence(pol); seen.push({ ...x, source: "police", desc: "รายงานตำรวจ — " + x.desc }); }
    const sightings = {};
    for (const id of [...r.co, ...r.C, ...r.G]) {
      sightings[id] = ev.filter(() => Math.random() < 0.45).map((e) => { const x = toEvidence(e); return { key: e.id, desc: x.desc, icon: x.icon, name: x.name, type: x.type }; });
    }
    this.c = {
      id: "case" + Date.now(), phase: "opening", round: 1, rounds: RULES.testimonies, deadline: null,
      lawyerId: r.L, defendantId: r.D, coIds: r.co, counselIds: r.C, galleryIds: r.G, outIds: [],
      cred: { L: RULES.cred, D: this.dcred || RULES.cred }, list: null, cx: 0, pool: null, alibi: Math.min(RULES.maxAlibi, ev.filter((e) => !e.seen).length) + RULES.alibiBonus,
      evidence: seen, sightings, witnessUsed: [], lent: [], pressLeft: 0, counselLeft: 0, beat: null, verdict: null, music: "trial",
      proven: new Set(), objFlag: false, cheer: {}, acted: {},
      sides: {}, sideChange: {}, switched: new Set(), feed: [], rx: [], galEff: { L: {}, D: {} }, summonLeft: 0,
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
        list: c.list && c.list.map((s) => ({ text: s.text, done: s.done, pressed: s.pressed, presentTried: s.presentTried, alibiShown: !!s.alibiShown, ...(sideD ? { alibi: !!s.alibi, kind: s.kind, blind: !!s.blind } : {}) })),
        cx: c.cx,
        pool: sideD && c.phase === "testimony" ? c.pool.map(({ key, text, kind, blind }) => ({ key, text, kind, blind: !!blind })) : null,
        ...(sideD && c.phase === "testimony" ? { maxBlind: RULES.maxBlind } : {}),
        minLies: sideD && c.phase === "testimony" ? Math.min(2, c.pool.filter((x) => x.kind === "lie").length) : undefined, nStatements: sideD && c.phase === "testimony" ? Math.min(RULES.statements, c.pool.length) : undefined,
        alibiLeft: sideD ? c.alibi : undefined,
        evidence: sideL ? c.evidence.map((e) => ({ ...e })) : undefined,
        sightings: viewer === c.defendantId ? [] : c.sightings[viewer] || [],
        rx: c.rx.slice(), feed: c.feed.slice(), sides: { ...c.sides }, summonLeft: c.summonLeft,
        ...(c.galleryIds.includes(viewer) ? { sideChangeLeft: c.sideChange[viewer] ?? 1 } : {}),
        witnessUsed: c.witnessUsed.slice(), lent: c.lent.slice(), pressLeft: c.pressLeft, presentLeft: c.presentLeft, counselLeft: c.counselLeft,
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
    if (this.pendRx.length) steps = [...this.galleryScene(), ...steps];
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
    if (this.quick) return this.beat([{ k: "gavel", n: 1 }], () => this.sidesPhase()); // ?quick=1 (dev) ข้ามบทเปิด
    const c = this.c, s = [
      { k: "cam", cam: "wide" }, { k: "gavel", n: 3 },
      this.say("J", "judgeOpen"),
      { k: "pose", who: "L", pose: "confident" }, this.say("L", "lawyerReady", "blue"),
    ];
    if (c.coIds[0]) s.push({ k: "cam", cam: "cocounsel", who: c.coIds[0] }, this.say("T", "coReady", "", { name: this.N(c.coIds[0]), id: c.coIds[0] }));
    if (c.counselIds[0]) s.push({ k: "cam", cam: "prosecution", who: c.counselIds[0] }, this.say("C", "counselReady", "", { name: this.N(c.counselIds[0]), id: c.counselIds[0] }));
    else if (c.galleryIds.length) s.push({ k: "cam", cam: "wide" }, this.say("J", "galleryHush"));
    s.push({ k: "cam", cam: "witness" }, this.say("D", "defTaunt"), this.say("D", "openAlibiBonus"), { k: "pose", who: "J", pose: "normal" }, this.say("J", "judgeTestify"));
    this.beat(s, () => this.sidesPhase());
  }

  testimony() {
    const c = this.c;
    c.phase = "testimony"; c.beat = null; c.inCross = false;
    c.rx = []; c.galEff = { L: {}, D: {} }; c.summonLeft = RULES.summonPer;
    c.presentLeft = RULES.presentPer; c.pressLeft = RULES.pressPer; c.counselLeft = c.counselIds.length ? RULES.counselObj : 0; c.list = null; c.cx = 0;
    const held = this.lawyerSideEvents();
    let blindN = 0;
    c.pool = shuffle(statementPool(this.events, c.proven)).map((st) => ({ ...st, blind: st.kind === "lie" && !held.some((e) => contradicts(st, e)) }))
      .filter((st) => !st.blind || ++blindN <= 2).slice(0, 9);
    c.deadline = Date.now() + 40000;
    const humanSide = [c.defendantId, ...c.counselIds].includes(this.human);
    this.tTest = this.later(() => this.autoTestimony(), humanSide ? 40000 : this.slow ? 22000 : 2600 + Math.random() * 1500); // ?wait=1 (dev) = AI จำเลยคิดนาน
    this.push();
  }
  // หลักฐานที่ฝั่งทนายยังเอามาใช้ได้: แฟ้มทนาย + สิ่งที่ผู้ช่วยยังไม่ได้ส่ง + ประชาชนที่ยังไม่ได้ขึ้นเป็นพยาน
  lawyerSideEvents() {
    const c = this.c, keys = new Set(c.evidence.filter((e) => !e.used).map((e) => e.id));
    for (const id of c.coIds) if (!c.lent.includes(id)) (c.sightings[id] || []).forEach((x) => keys.add(x.key));
    for (const id of c.galleryIds) if (!c.witnessUsed.includes(id) && !c.outIds.includes(id)) (c.sightings[id] || []).forEach((x) => keys.add(x.key));
    return this.events.filter((e) => keys.has(e.id));
  }
  autoTestimony() {
    const c = this.c; if (!c || c.phase !== "testimony") return;
    // AI จำเลย: ไม่เกิน maxBlind คำโกหกลับ · 60% พยายามใส่ 1
    const open = c.pool.filter((s) => !s.blind);
    let list = aiTestimony(open, c.alibi);
    const blind = c.pool.filter((s) => s.blind);
    if (blind.length && Math.random() < 0.6) {
      const b = blind[Math.floor(Math.random() * blind.length)];
      const i = list.findIndex((s) => s.kind === "lie");
      if (i >= 0) list[i] = { ...b, alibi: false, pressed: false, done: false };
    }
    list = list.slice(0, RULES.statements);
    this.setList(list);
  }
  setList(list) {
    const c = this.c; clearTimeout(this.tTest);
    c.alibi = Math.max(0, c.alibi - list.filter((s) => s.alibi).length);
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
    if (c.galRound !== c.round) { c.galRound = c.round; this.aiGalleryRound(); }
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
      if (plan.present && !st.presentTried && c.presentLeft > 0) return this.act(c.lawyerId, "courtAct", { type: "present", idx: i, evId: plan.present.id });
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
      const need = Math.min(2, c.pool.filter((x) => x.kind === "lie").length);
      if (list.filter((x) => x.blind).length > RULES.maxBlind) return;
      if (list.length === RULES.statements && list.filter((x) => x.kind === "lie").length === need) this.setList(list);
      return;
    }
    if (ev === "courtAct") return this.act(from, ev, p);
    if (ev === "courtObject" && c.phase === "objectWindow" && c.counselIds.includes(from) && c.counselLeft > 0) return this.objResolve(true, from);
    if (ev === "courtGallery") return this.galleryAct(from, p);
    if (ev === "courtSide") return this.pickSide(from, p.side);
  }
  act(from, ev, p) {
    const c = this.c;
    if (!c || c.phase !== "cross" || (from !== c.lawyerId && !c.coIds.includes(from))) return;
    if (p.type === "view") { c.cx = Math.max(0, Math.min(c.list.length - 1, p.idx | 0)); this.push(); return; }
    if (p.type === "end") { clearTimeout(this.tCross); return this.roundEnd(); }
    if (p.type === "lend") return this.lend(from, p.evKey);
    if (p.type === "summon") return this.summon(p.idx | 0);
    const st = c.list[p.idx]; if (!st || st.done) return;
    c.cx = p.idx;
    if (p.type === "press" && !st.pressed && c.pressLeft > 0) return this.press(st);
    if (p.type === "present" && !st.presentTried && c.presentLeft > 0) { const e = c.evidence.find((x) => x.id === p.evId && !x.used); if (e) return this.present(st, e); }
  }

  press(st) {
    const c = this.c; st.pressed = true; c.pressLeft--;
    const s = [{ k: "shout", who: "L", kind: "holdit" }, this.say("L", "pressL", "blue")];
    if (st.alibi) {
      st.alibiShown = true;
      s.push(this.say("D", "pressAlibiDef"), { k: "pose", who: "J", pose: "surprised" }, this.say("J", "pressAlibiJudge"),
        { k: "cam", cam: "defense" }, { k: "pose", who: "L", pose: "think" }, this.say("L", "pressAlibiInner", "blue"));
    } else if (st.kind === "truth") {
      // ประโยคจริงโดนกดดัน = รับสารภาพ → จำเลย −1 (ผู้ใช้ 2026-11-20)
      st.done = true; c.cred.D = Math.max(0, c.cred.D - 1);
      s.push(this.say("D", "pressTruthD"), { k: "cam", cam: "defense" }, { k: "pose", who: "L", pose: "confident" }, this.say("L", "confessL", "red"),
        { k: "cam", cam: "witness" }, { k: "hurt", side: "D", n: 1, ms: DMG_STEP_MS }, this.say("D", "confessD"));
    } else {
      const m = st.m || {}, S = m.skill != null ? m.skill : m.target != null ? m.target : m.turn != null ? `เทิร์น ${m.turn}` : "เรื่องนี้";
      s.push(this.say("D", "pressHoldDef"), { k: "pose", who: "J", pose: "normal" }, this.say("J", "pressHint", "", { vars: { S } }),
        { k: "cam", cam: "defense" }, { k: "pose", who: "L", pose: "think" }, this.say("L", "crossThink", "blue"));
    }
    this.beat(s, () => this.cross());
  }
  present(st, e) {
    const c = this.c;
    c.presentLeft--;
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
  outLines(s) {
    if (this.c.presentLeft > 0) return s;
    return s.concat([{ k: "cam", cam: "witness" }, this.say("D", "presentOutDef"), { k: "pose", who: "J", pose: "normal" }, this.say("J", "presentOutJudge"), { k: "cam", cam: "defense" }, this.say("L", "presentOutInner", "blue")]);
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
      e.used = true; st.alibi = false;
      s.push({ k: "shout", who: "D", kind: "holdit" }, this.say("D", "alibiD"), { k: "pose", who: "J", pose: "normal" }, this.say("J", "judgeAlibi"), { k: "cam", cam: "defense" });
      hurtL(r.dL);
    } else if (r.kind === "pierce") {
      e.used = true; st.alibi = false;
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
    this.beat(c.cred.D > 0 && c.cred.L > 0 ? this.outLines(s) : s, () => this.cross());
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

  // ---------- ประชาชน: เลือกฝ่ายหลังเปิดศาล · เชียร์/โห่/ปาระหว่างคดี (server รอบ 2026-11-21) ----------
  sidesPhase() {
    const c = this.c;
    const live = c.galleryIds.filter((id) => !c.outIds.includes(id));
    if (this.mode !== "pvp" || !live.length) return this.testimony();
    c.phase = "sides"; c.beat = null; c.deadline = Date.now() + RULES.sidesMs;
    this.push();
    for (const id of live) if (this.isAI(id)) this.later(() => this.pickSide(id, Math.random() < 0.5 ? "L" : "D"), 1200 + Math.random() * 5000);
    this.tSides = this.later(() => this.sidesEnd(), RULES.sidesMs);
  }
  pickSide(id, side) {
    const c = this.c;
    if (!c || !c.galleryIds.includes(id) || c.outIds.includes(id) || (side !== "L" && side !== "D") || c.phase === "verdict") return;
    const cur = c.sides[id];
    if (cur === side) return;
    if (cur) { if ((c.sideChange[id] ?? 1) <= 0) return; c.sideChange[id] = 0; c.switched.add(id); }
    c.sides[id] = side;
    this.push();
    if (c.phase === "sides" && c.galleryIds.every((g) => c.outIds.includes(g) || c.sides[g])) { clearTimeout(this.tSides); this.later(() => this.sidesEnd(), 700); }
  }
  sidesEnd() {
    const c = this.c; if (!c || c.phase !== "sides") return;
    for (const g of c.galleryIds) if (!c.sides[g] && !c.outIds.includes(g)) c.sides[g] = Math.random() < 0.5 ? "L" : "D";
    const rx = c.galleryIds.filter((g) => c.sides[g]).map((g) => ({ id: g, e: "👏", side: c.sides[g] }));
    this.beat([{ k: "cam", cam: "wide" }, { k: "gallery", rx, ms: 2200 }, this.say("J", "sidesJ")], () => this.testimony());
  }
  galleryAct(id, p) {
    const c = this.c;
    if (!c || !["testimony", "testify", "cross", "beat", "objectWindow"].includes(c.phase)) return;
    if (!c.galleryIds.includes(id) || c.outIds.includes(id) || !c.sides[id]) return;
    const mine = c.sides[id], other = mine === "L" ? "D" : "L";
    if (p.e === "witnessL" || p.e === "witnessD") {
      if (c.phase !== "cross" || c.witnessUsed.includes(id) || (p.e === "witnessL") !== (mine === "L")) return;
      if (p.e === "witnessL" && !(c.sightings[id] || []).some((x) => x.key === p.evKey)) return;
      c.witnessUsed.push(id);
      return this.witnessBeat(id, p);
    }
    if (!["cheer", "boo", "throw"].includes(p.e) || c.rx.includes(id)) return;
    c.rx.push(id);
    const e = p.e === "cheer" ? "👏" : p.e === "boo" ? "👎" : "🍅";
    const side = p.e === "cheer" ? mine : other;
    c.feed = [...c.feed, { id, e, side, seq: ++this.feedSeq }].slice(-8);
    // ต่อฝ่ายต่อยกมีผลอย่างละครั้ง (โห่/ปาช่องเดียวกัน) · โห่/ปาไม่มีผลเมื่อฝ่ายนั้นเหลือ ≤ 3
    let eff = 0, ignored = false;
    if (p.e === "cheer") {
      c.cheer[id] = (c.cheer[id] || 0) + 1;
      if (!c.galEff[mine].up) { c.galEff[mine].up = true; if (c.cred[mine] < RULES.cred) { c.cred[mine]++; eff = 1; } }
    } else if (!c.galEff[other].down) {
      if (c.cred[other] > RULES.booFloor) { c.galEff[other].down = true; c.cred[other]--; eff = -1; } else ignored = true;
    }
    this.pendRx.push({ id, e, side, eff, ignored });
    this.push();
  }
  // ฉากประชาชนขึ้นต้นจังหวะถัดไป
  galleryScene() {
    const pend = this.pendRx; this.pendRx = [];
    if (!pend.length) return [];
    const s = [{ k: "cam", cam: "wide" }, { k: "gallery", rx: pend.map(({ id, e, side }) => ({ id, e, side })), ms: 2400 }];
    for (const r of pend) {
      if (r.eff > 0) s.push({ k: "cam", cam: r.side === "L" ? "defense" : "witness" }, { k: "heal", side: r.side, n: 1, ms: 700 });
      if (r.eff < 0) s.push({ k: "cam", cam: r.side === "L" ? "defense" : "witness" }, { k: "hurt", side: r.side, n: 1, ms: 900 });
    }
    if (pend.some((r) => r.ignored)) s.push({ k: "pose", who: "J", pose: "normal" }, this.say("J", "booIgnoredJ"));
    return s;
  }
  witnessBeat(id, p) {
    const c = this.c, nm = this.N(id), s = [];
    if (p.e === "witnessL") {
      const e = this.events.find((x) => x.id === p.evKey); const x = toEvidence(e); this.addEvidence(x);
      s.push({ k: "pose", who: "J", pose: "surprised" }, this.say("J", "judgeWitness"), { k: "cam", cam: "cocounsel", who: id },
        this.say("G", "witnessL", "", { name: nm, id, vars: { X: x.desc } }), { k: "present", ev: { icon: x.icon, name: x.name, desc: x.desc }, ms: 1400 });
      (c.witL = c.witL || []).push(id);
    } else {
      c.alibi = Math.min(RULES.maxAlibi + RULES.alibiBonus, c.alibi + 1);
      s.push({ k: "cam", cam: "witness", who: id }, this.say("G", "witnessD", "", { name: nm, id }), { k: "cam", cam: "witness" }, { k: "pose", who: "J", pose: "normal" }, this.say("J", "judgeWitness"));
      (c.witD = c.witD || []).push(id);
    }
    this.beat(s, () => this.cross());
  }
  aiGalleryRound() {
    const c = this.c;
    for (const id of c.galleryIds) {
      if (!this.isAI(id) || c.outIds.includes(id)) continue;
      this.later(() => {
        if (!this.c || c.phase !== "cross" || c.rx.includes(id) || !c.sides[id]) return;
        const mine = c.sides[id];
        if (!c.witnessUsed.includes(id) && Math.random() < 0.15) {
          const sg = c.sightings[id] || [];
          if (mine === "L" && sg.length) return this.galleryAct(id, { e: "witnessL", evKey: rnd(sg).key });
          if (mine === "D") return this.galleryAct(id, { e: "witnessD" });
        }
        const r = Math.random();
        this.galleryAct(id, { e: r < 0.55 ? "cheer" : r < 0.8 ? "boo" : "throw" });
      }, 2500 + Math.random() * 25000);
    }
  }
  // ขอให้ศาลเรียกพยาน (ยกละครั้ง): ได้หลักฐานใหม่ (source "summon")
  summon(idx) {
    const c = this.c, st = c.list[idx];
    if (!st || st.done || c.summonLeft <= 0) return;
    c.summonLeft--; c.cx = idx;
    const held = new Set(c.evidence.map((e) => e.id));
    const e = this.events.find((x) => contradicts(st, x) && !held.has(x.id)) || shuffle(this.events.filter((x) => !held.has(x.id)))[0];
    const who = rnd(c.galleryIds.length ? c.galleryIds : [null]);
    const nm = who ? this.N(who) : "พยาน";
    const s = [{ k: "gavel", n: 1 }, { k: "pose", who: "J", pose: "normal" }, this.say("J", "summonJ"), { k: "cam", cam: "cocounsel", ...(who ? { who } : {}) }];
    if (e) {
      const x = { ...toEvidence(e), source: "summon" }; this.addEvidence(x);
      s.push(this.say("T", "summonW", "", { name: nm, ...(who ? { id: who } : {}), vars: { X: x.desc } }), { k: "present", ev: { icon: x.icon, name: x.name, desc: x.desc }, ms: 1400 },
        { k: "cam", cam: "defense" }, { k: "pose", who: "L", pose: "confident" }, this.say("L", "summonL", "blue"));
    } else s.push(this.say("T", "summonNone", "", { name: nm, ...(who ? { id: who } : {}) }), { k: "cam", cam: "defense" }, { k: "pose", who: "L", pose: "sheepish" }, this.say("L", "pressSheepish", "blue"));
    this.beat(s, () => this.cross());
  }
  roundEnd() {
    const c = this.c; clearTimeout(this.tCross); c.inCross = false;
    if (c.cred.D <= 0) return this.verdict("guilty");
    if (c.cred.L <= 0) return this.verdict("free");
    if (!c.idleChecked && c.presentLeft === RULES.presentPer && c.evidence.some((e) => !e.used)) {
      c.idleChecked = true; c.cred.L = Math.max(0, c.cred.L - RULES.idlePenalty);
      return this.beat([{ k: "gavel", n: 1 }, { k: "pose", who: "J", pose: "angry" }, this.say("J", "idleJudge"), { k: "cam", cam: "defense" },
        { k: "hurt", side: "L", n: RULES.idlePenalty, ms: DMG_STEP_MS }, this.say("L", "idleInner", "blue")], () => this.roundEnd());
    }
    c.idleChecked = false;
    this.nextRound();
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
    const lawyerHeal = w === "guilty" ? c.cred.L : 0;
    if (lawyerHeal > 0) s.push({ k: "heal", side: "L", n: lawyerHeal, ms: 1200 }, this.say("L", "afterGuiltyHeal", "blue", { vars: { N: lawyerHeal } }));
    const rewards = [];
    if (w !== "tie") {
      const side = w === "guilty" ? "L" : "D";
      const live = c.galleryIds.filter((id) => !c.outIds.includes(id) && c.sides[id] === side && !c.switched.has(id));
      live.forEach((id) => rewards.push({ id, name: this.N(id), hp: 1 }));
      for (const id of (side === "L" ? c.witL : c.witD) || []) { if (c.switched.has(id)) continue; const r0 = rewards.find((r) => r.id === id); if (r0) r0.gold = 2; else rewards.push({ id, name: this.N(id), hp: 1, gold: 2 }); }
    }
    this.beat(s, () => {
      c.phase = "verdict"; c.beat = null; c.verdict = { w, rewards, ...(w === "guilty" ? { lawyerHeal, defendantDmg: RULES.guiltyDmg } : {}), ...(w === "free" ? { lawyerDmg: RULES.freeDmg, stun: RULES.freeStun } : {}) }; c.deadline = Date.now() + 6000; this.push();
      this.later(() => { this.c = null; this.push(); }, 6000);
    });
    c.verdict = null;
  }
}
