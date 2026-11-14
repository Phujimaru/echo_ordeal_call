// ============================================================
//  ลำดับฉาก Road Trip บนกระดาน 2D (ผู้ใช้ 2026-11-14: "ทุกตัวเดินแบบวาร์ป ไม่เห็นตอนเข้ามาโจมตี" · "บอสไม่มีเสียง/ท่าอลังการ")
//  BoardStage เรียก rtFxPlay(state.roadtrip, api) ทุก state ใหม่ → fx ใหม่ (key ไม่ซ้ำ) กลายเป็นตารางเวลา:
//   walk { id, path }               เดินในจุดพัก (rt:walk) — เดินทีละช่องตามเส้นทาง (glide)
//   mobTurn { seq: [...] }          ตามอนตามลำดับจริงของ server (server/roadtrip/mobs.js seqPush):
//     mobMove { id, path: [[x,y]…], dash? } → เดินทีละช่อง (มอนตัวถัดไปรอ)
//     mobHit { id, target ("van" | id), dmg, dodged, crit, kill } → พุ่งเข้าหาเป้า (lunge) + ฟัน/เลขดาเมจ/"หลบ"
//     mobCounter { id, target, dmg, dodged } → ตีสวน · bossWarn { id, boss, move, tiles } → ไซเรนเตือน
//     bossMove { boss, id, move, from, to, tiles } → ท่าใหญ่ (bossFx.js) · mobHit/mobMove(dash) ของบอสตัวเดียวกันก่อนหน้า = ผลของท่านั้น (เล่นตรงจังหวะปะทะ)
//   mobSpawn { list } (บอส) → ออร่าเปิดตัว + พื้นสั่น
//  เวลารวมของมอนธรรมดาถูกบีบไม่เกิน ~6 วิ (เร่งเมื่อมอนเยอะ) · ท่าบอสเวลาเต็ม
//  คืน Set ของ id ที่ฉากนี้ดูแลตำแหน่ง/หลอดเลือดเอง (BoardStage ไม่ต้องเลื่อน/ขึ้นเลขซ้ำ)
// ============================================================
import { rtSfx } from "../../roadtrip/rtAudio";
import { channelGain, isMusicSuspended, masterGain } from "../../audio";

const SEEN = new Set();
let BOSS_ID = null, BOSS_TYPE = null;
// บทบาทมอน (mobSpawn.list[].role — hunter ไล่คน / saboteur ทุบรถตู้) → mobArt วาดป้ายประแจ
const ROLE = new Map();
export const rtRoleOf = (id) => ROLE.get(id) || null;
let primed = false;
// ---------- เอฟเฟกต์บอส/ทั่วไปที่กำลังเล่น (bossFx.js วาด) — t0 = performance.now() ที่เริ่ม
export const BFX = [];
export function addBfx(kind, t0, dur, data) { BFX.push({ kind, t0, dur, ...data }); if (BFX.length > 60) BFX.splice(0, BFX.length - 60); }
// ท่ารถ F1 ของแม็กซ์ (mobArt.drawBossF1): id บอส → [{ f: { move, from, to, dur }, t0 }]
const F1 = [];
export function bossF1For(id, now) {
  for (let i = F1.length - 1; i >= 0; i--) if (now - F1[i].t0 > F1[i].f.dur + 1200) F1.splice(i, 1);
  return F1.filter((o) => o.id === id && now >= o.t0).map((o) => ({ f: o.f, age: now - o.t0 }));
}
// มีฉากกำลังเล่นไหม (BoardCanvas วาด 60 เฟรมระหว่างนี้)
let busyTill = 0;
export function rtBusyUntil(t) { busyTill = Math.max(busyTill, t); }
export function rtBusy(now) { if (now < busyTill) return true; for (const b of BFX) if (now >= b.t0 - 50 && now < b.t0 + b.dur + 400) return true; return false; }
// จอสั่นของฉากถนน 3D (road3d underlay อ่านทุกเฟรม)
let shakeReq = 0;
export function rtShake(a) { shakeReq = Math.max(shakeReq, a); }
export function takeRtShake() { const a = shakeReq; shakeReq = 0; return a; }

// ---------- เสียงสังเคราะห์ (เสริมไฟล์ rtSfx) — ห้ามเล่นตอนคลิปวีดีโอ (isMusicSuspended)
let AC = null, BUS = null, NOISE = null;
function ac() {
  if (typeof window === "undefined") return null;
  if (!AC) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    AC = new C(); BUS = AC.createGain(); BUS.connect(AC.destination);
    NOISE = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d = NOISE.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (AC.state === "suspended") AC.resume().catch(() => {});
  BUS.gain.value = 0.55 * masterGain() * channelGain("sfx");
  return AC;
}
function env(g, t, a, v, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
export function synth(name) {
  if (isMusicSuspended()) return;
  const c = ac(); if (!c) return;
  const t = c.currentTime;
  const tone = (type, f, d, v, to, cut = 9000, at = 0) => { const o = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t + at); if (to) o.frequency.exponentialRampToValueAtTime(to, t + at + d); fl.type = "lowpass"; fl.frequency.value = cut; env(g, t + at, 0.01, v, d); o.connect(fl).connect(g).connect(BUS); o.start(t + at); o.stop(t + at + d + 0.1); };
  const noise = (d, v, type, f, at = 0, q = 1) => { const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(); s.buffer = NOISE; s.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q; env(g, t + at, 0.01, v, d); s.connect(fl).connect(g).connect(BUS); s.start(t + at); s.stop(t + at + d + 0.1); };
  switch (name) {
    case "f1": tone("sawtooth", 180, 1.1, 0.18, 1400, 5000); tone("square", 360, 1.1, 0.06, 2600, 3000); noise(0.9, 0.08, "bandpass", 2400); break; // เครื่องยนต์ F1 เร่งเสียงแหลม
    case "whoosh": noise(0.45, 0.32, "bandpass", 900, 0, 0.7); tone("sine", 300, 0.4, 0.05, 90); break;
    case "boom": noise(1.2, 0.6, "lowpass", 380); tone("sine", 80, 1.0, 0.5, 32); noise(0.25, 0.3, "highpass", 2500); break;
    case "thud": tone("sine", 120, 0.35, 0.45, 45); noise(0.18, 0.25, "lowpass", 600); break;
    case "dark": tone("sawtooth", 70, 0.9, 0.16, 40, 700); noise(0.8, 0.12, "bandpass", 300, 0, 2); tone("sine", 900, 0.5, 0.05, 220, 4000, 0.1); break;
    case "slash": noise(0.3, 0.35, "highpass", 2200); tone("triangle", 1600, 0.25, 0.08, 400); break;
    case "water": noise(0.9, 0.3, "bandpass", 1200, 0, 0.6); tone("sine", 500, 0.6, 0.07, 120); break;
    case "ice": for (let i = 0; i < 5; i++) tone("triangle", 2400 + i * 340, 0.25, 0.06, 1800, 9000, i * 0.05); noise(0.3, 0.12, "highpass", 5000); break;
    case "rumble": noise(1.4, 0.35, "lowpass", 140); tone("sine", 45, 1.4, 0.3, 38); break;
    case "step": tone("sine", 70, 0.22, 0.35, 40); noise(0.12, 0.15, "lowpass", 300); break;
    case "beep": tone("sine", 1250, 0.09, 0.12); tone("sine", 1250, 0.09, 0.12, null, 9000, 0.13); noise(0.25, 0.04, "bandpass", 1800, 0.02, 0.5); break; // วิทยุทีม
    case "spin": for (let i = 0; i < 4; i++) noise(0.14, 0.2, "bandpass", 700 + i * 200, i * 0.13, 1.5); break;
    default: break;
  }
}

// ---------- ตารางเวลา
const xyOf = (p) => (Array.isArray(p) ? { x: p[0], y: p[1] } : { x: p.x, y: p.y });
const LUNGE_HIT_MS = 384; // ตรงกับ BoardCanvas LUNGE_MS 620 × LUNGE_HIT 0.62
// ระยะเวลาท่าบอส: wind = ง้าง (ms) · act = ช่วงลงมือ · imp = จังหวะปะทะ (นับจากเริ่ม) · step = ms ต่อช่องตอนพุ่ง
const BOSS_T = { swing: { wind: 300, act: 560 }, ram: { wind: 520, step: 60 }, throw: { wind: 420, act: 950 }, charge: { wind: 420, step: 65 }, slash: { wind: 380, act: 560 }, lunge: { wind: 320, act: 520 }, tide: { wind: 360, act: 900 } };

function vanCenter(def) { const v = def && def.vanBlock; return v ? { x: (v.x0 + v.x1) / 2, y: (v.y0 + v.y1) / 2 } : null; }

// rt = state.roadtrip · api = ตัวเชื่อม BoardStage (ดูท้ายไฟล์ BoardStage — rtApi)
export const RT_LOG = []; // dev: เหตุการณ์ที่จัดตาราง (window.__rtTl)
// dev: window.__rtTl.demo("devilTruck", "throw", 10, 5) = เล่นท่าบอส/มุกที่ช่อง (x, y) ทันที (ไม่ต่อ server) — ดูภาพ/เสียงเร็ว
if (import.meta.env && import.meta.env.DEV && typeof window !== "undefined") window.__rtTl = { BFX, RT_LOG, demo(boss, move, x = 10, y = 5, id = null) {
  const now = performance.now();
  if (COMIC_DEMO.includes(move)) { comic({ k: move, id, x: x + 0.5, y: y + 0.5, text: "Box box! ยางพังหมดแล้ว!" }, now, { now: () => performance.now(), later: (ms, fn) => setTimeout(fn, ms) }); return; }
  const from = { x, y }, to = { x: x + 3, y }, tiles = [1, 2, 3, 4].map((i) => ({ x: x + i, y }));
  const path = [from, ...tiles];
  const api = { now: () => performance.now(), later: (ms, fn) => setTimeout(fn, ms), look() {}, glide() {}, shake() {}, fx() {}, sfx() {}, prevPos: () => null, nextPos: () => null, vanAt: () => null };
  playBoss({ e: { boss, id, move, from, to: move === "throw" ? { x: x + 3, y: y + 1 } : to, tiles: move === "throw" ? [{ x: x + 3, y: y + 1 }] : tiles }, hits: [], dash: ["ram", "charge"].includes(move) ? { path: path.map((p) => [p.x, p.y]) } : null }, 0, api, new Set(), () => from, {}, () => {});
} };
const COMIC_DEMO = ["radio", "pitstop", "drs", "spinout", "donut", "champagne"];
export function rtFxPlay(rt, api) {
  const out = new Set();
  if (RT_LOG.length > 80) RT_LOG.splice(0, 40);
  const api0 = api;
  api = { ...api0, glide: (id, path, step, delay) => { RT_LOG.push({ t: Math.round(api0.now()), k: "glide", id, n: path.length, step, delay: Math.round(delay) }); api0.glide(id, path, step, delay); } };
  const list = rt && Array.isArray(rt.fx) ? rt.fx : [];
  if (!primed) { primed = true; for (const f of list) SEEN.add(f.key ?? JSON.stringify(f)); return out; }
  const fresh = [];
  for (const f of list) { const k = f.key ?? JSON.stringify(f); if (SEEN.has(k)) continue; SEEN.add(k); fresh.push(f); }
  if (SEEN.size > 600) { const keep = [...SEEN].slice(-300); SEEN.clear(); keep.forEach((k) => SEEN.add(k)); }
  for (const f of fresh) {
    if (f.k === "walk" && Array.isArray(f.path) && f.path.length > 1 && f.id) {
      const pts = f.path.map(xyOf);
      api.glide(f.id, pts, 105, 0);
      rtBusyUntil(api.now() + pts.length * 105 + 200);
      out.add(f.id);
    } else if (f.k === "mobTurn") playTurn(f, api, out);
    else if (COMIC[f.k]) comic(f, api.now(), api);
    else if (f.k === "mobDie" && ["devilTruck", "darkKnight", "jormungand"].includes(f.type)) {
      const now = api.now();
      if (f.type === "devilTruck") { addBfx("bossDie", now + 250, 2400, {}); api.later(250, () => { synth("thud"); rtSfx("crowd_cheer"); }); }
      else { addBfx("entrance", now, 1800, { x: (f.x | 0) + 0.5, y: (f.y | 0) + 0.5, boss: f.type }); api.later(0, () => { synth("rumble"); rtShake(0.8); api.shake(); }); }
    }
    else if (f.k === "bossPhase" || f.k === "enrage") {
      const p = (BOSS_ID && api.nextPos(BOSS_ID)) || null, now = api.now();
      if (p) addBfx("entrance", now, 2200, { x: p.x + 0.5, y: p.y + 0.5, boss: BOSS_TYPE || "devilTruck" });
      api.later(0, () => { rtSfx("boss_alarm"); synth(BOSS_TYPE === "devilTruck" ? "f1" : "rumble"); rtShake(0.7); api.shake(); });
    } else if (f.k === "shadowClones") {
      const p = (BOSS_ID && api.nextPos(BOSS_ID)) || null;
      if (p) addBfx("clones", api.now(), 1800, { x: p.x + 0.5, y: p.y + 0.5 });
      api.later(0, () => synth("dark"));
    } else if (f.k === "freezeRoad") {
      addBfx("freeze", api.now(), 2400, {});
      api.later(0, () => { synth("ice"); synth("water"); rtShake(0.3); });
    } else if (f.k === "turretShot") {
      const v = api.vanAt(), tgt = f.x != null ? { x: f.x, y: f.y } : api.nextPos(f.target);
      if (v && tgt) {
        addBfx("tracer", api.now(), 420, { from: v, to: tgt });
        api.later(0, () => rtSfx("turret_fire"));
        api.later(160, () => api.fx([{ kind: "burst", x: tgt.x, y: tgt.y, rgb: "255,220,120" }, { kind: "float", x: tgt.x, y: tgt.y, text: f.dodge ? "หลบ" : `-${f.dmg | 0}`, color: f.dodge ? "#d8f2ff" : "#ffd27a", size: 26, z: 1.5 }]));
      }
    } else if (f.k === "swerveRam" && Array.isArray(f.tiles)) {
      api.later(0, () => { rtSfx("tire_screech"); });
      api.later(250, () => { api.fx(f.tiles.map((t) => ({ kind: "slash", x: t.x, y: t.y, rgb: "255,170,80" }))); rtSfx("crash"); rtShake(0.5); api.shake(); });
    } else if ((f.k === "roofFall" || f.k === "fall") && f.id) {
      const p = f.from || api.prevPos(f.id) || api.nextPos(f.id);
      if (p) api.later(0, () => { api.fx([{ kind: "float", x: p.x, y: p.y, text: "ร่วง!", color: "#ffb0a8", size: 26, z: 1.5 }]); synth("thud"); });
    }
    else if (f.k === "mobSpawn" && Array.isArray(f.list)) {
      for (const m of f.list) if (m.role) ROLE.set(m.id, m.role);
      const boss = f.list.find((m) => ["devilTruck", "darkKnight", "jormungand"].includes(m.type));
      if (boss) { BOSS_ID = boss.id; BOSS_TYPE = boss.type; const now = api.now(); addBfx("entrance", now, 2600, { x: boss.x + 0.5, y: boss.y + 0.5, boss: boss.type }); api.later(0, () => { rtSfx("boss_alarm"); synth("rumble"); rtShake(0.5); api.shake(); }); }
    }
  }
  return out;
}

// มุกของแม็กซ์ (server fx: pitstop / drs / spinout / donut / champagne / radio { text }) — ระยะเวลา + เสียง
const COMIC = { radio: 2600, pitstop: 1900, drs: 1500, spinout: 1900, donut: 2600, champagne: 2200 };
function comic(f, t0, api) {
  addBfx(f.k, t0, COMIC[f.k], { id: f.id || null, text: f.text || "", x: f.x, y: f.y });
  api.later(Math.max(0, t0 - api.now()), () => {
    if (f.k === "radio") synth("beep");
    else if (f.k === "pitstop") { rtSfx("wrench"); synth("spin"); }
    else if (f.k === "drs") { synth("f1"); rtSfx("nitro"); }
    else if (f.k === "spinout") { rtSfx("tire_screech"); synth("spin"); }
    else if (f.k === "donut") { rtSfx("tire_screech"); rtSfx("crowd_cheer"); }
    else if (f.k === "champagne") rtSfx("crowd_cheer");
  });
}
function playTurn(f, api, out) {
  const seq = Array.isArray(f.seq) ? f.seq : null;
  if (!seq || !seq.length) return;
  // จัดกลุ่ม: ท่าบอส = ผลก่อนหน้า (mobHit/mobMove dash ของบอสตัวเดียวกัน) + bossMove
  const items = [];
  for (const e of seq) {
    if (e.k === "bossMove") {
      const g = { type: "boss", e, hits: [], dash: null };
      while (items.length) {
        const last = items[items.length - 1];
        if (last.type !== "one" || last.e.id !== e.id || !(last.e.k === "mobHit" || (last.e.k === "mobMove" && last.e.dash))) break;
        items.pop();
        if (last.e.k === "mobHit") g.hits.unshift(last.e); else g.dash = last.e;
      }
      items.push(g);
    } else items.push({ type: "one", e });
  }
  // เวลาของมอนธรรมดา (บีบรวม ≤ ~6 วิ)
  let plain = 0, bossT = 0;
  for (const it of items) {
    if (it.type === "boss") { bossT += bossDur(it); continue; }
    const e = it.e;
    if (e.k === "mobMove") plain += Math.max(1, e.path.length - 1) * 110 + 60;
    else if (e.k === "mobHit") plain += 640;
    else plain += 260;
  }
  const k = plain > 0 ? Math.max(0.35, Math.min(1, (6000 - Math.min(bossT, 4500)) / plain)) : 1;
  const pos = {}; // ตำแหน่งปัจจุบันระหว่างฉาก (ก่อนเหตุการณ์ = ตำแหน่ง state ก่อนหน้า)
  const posOf = (id) => pos[id] || api.prevPos(id) || api.nextPos(id);
  // คนที่โดน: หลอดเลือด/ตำแหน่งค้างค่าเดิมจนถึงจังหวะปะทะ
  const targets = new Set();
  for (const e of seq) if ((e.k === "mobHit" || e.k === "mobCounter") && e.target && e.target !== "van") targets.add(e.target);
  for (const e of seq) if (e.k === "mobCounter") targets.add(e.target);
  for (const id of targets) { api.vitHold(id); out.add(id); const a = api.prevPos(id), b = api.nextPos(id); if (a && b && (a.x !== b.x || a.y !== b.y)) api.hold(id, a); }
  const moved = new Set();
  let t = 80;
  const impact = (e, at, heavy) => {
    const tgt = e.target === "van" ? api.vanAt() : posOf(e.target);
    api.later(at, () => {
      if (!tgt) return;
      if (e.target !== "van") { api.vitUnhold(e.target); const a = api.prevPos(e.target), b = api.nextPos(e.target); if (!moved.has(e.target) && a && b && (a.x !== b.x || a.y !== b.y)) { moved.add(e.target); api.knock(e.target, a, b); } }
      if (e.dodged) { api.fx([{ kind: "float", x: tgt.x, y: tgt.y, text: "หลบ", color: "#d8f2ff", size: 28, z: 1.5 }]); api.sfx("dodge"); return; }
      const big = heavy || e.crit || e.kill;
      api.fx([
        { kind: "slash", x: tgt.x, y: tgt.y, rgb: e.target === "van" ? "255,170,80" : "255,90,90" },
        { kind: "burst", x: tgt.x, y: tgt.y, rgb: heavy ? "255,180,80" : "255,120,120" },
        { kind: "float", x: tgt.x, y: tgt.y, text: `-${e.dmg | 0}`, color: e.crit ? "#ffd84a" : e.target === "van" ? "#ffb070" : undefined, size: big ? 36 : 30, z: 1.5 },
        ...(e.crit ? [{ kind: "float", x: tgt.x, y: tgt.y - 0.6, text: "คริติคอล", color: "#ffd84a", size: 24, z: 1.5 }] : []),
      ]);
      if (e.target === "van") rtSfx("hazard_hit"); else api.sfx("attack");
      if (big) { api.shake(); rtShake(heavy ? 0.6 : 0.25); }
    });
  };
  for (const it of items) {
    if (it.type === "boss") { t = playBoss(it, t, api, out, posOf, pos, impact); continue; }
    const e = it.e;
    if (e.k === "mobMove" && Array.isArray(e.path) && e.path.length > 1) {
      const pts = e.path.map(xyOf), step = Math.round((e.dash ? 70 : 110) * k);
      api.glide(e.id, pts, step, t);
      out.add(e.id);
      if (e.dash) api.later(t, () => rtSfx("tire_screech"));
      pos[e.id] = pts[pts.length - 1];
      api.look(pts[pts.length - 1], t);
      t += (pts.length - 1) * step + 60 * k;
    } else if (e.k === "mobHit") {
      const from = posOf(e.id), tgt = e.target === "van" ? api.vanAt() : posOf(e.target);
      if (from && tgt) api.later(t, () => api.lunge(e.id, from, tgt, e.target === "van" ? null : e.target));
      impact(e, t + LUNGE_HIT_MS, false);
      t += 640 * k;
    } else if (e.k === "mobCounter") {
      const at = posOf(e.target);
      api.later(t, () => { if (at) api.fx([{ kind: "slash", x: at.x, y: at.y, rgb: "160,220,255" }, { kind: "float", x: at.x, y: at.y, text: e.dodged ? "หลบ" : `สวน -${e.dmg | 0}`, color: "#ffb0a8", size: 24, z: 1.5 }]); api.sfx("attack"); });
      t += 320 * k;
    } else if (COMIC[e.k]) {
      comic(e, api.now() + t, api);
      t += Math.min(COMIC[e.k], 1200);
    } else if (e.k === "bossWarn") {
      api.later(t, () => { rtSfx("alert"); addBfx("warnFlash", api.now(), 900, { tiles: e.tiles || [], move: e.move, boss: e.boss }); });
      t += 520;
    }
  }
  rtBusyUntil(api.now() + t + 800);
}
function bossDur(it) {
  const m = it.e.move, T = BOSS_T[m] || { wind: 300, act: 600 };
  const n = it.dash ? Math.max(1, it.dash.path.length - 1) : 4;
  return T.step ? T.wind + n * T.step + 600 : T.wind + T.act + 450;
}
// ท่าบอส: เอฟเฟกต์ (bossFx.js) + รถ F1 (mobArt) + เดินพุ่ง + ผลที่ปะทะ + เสียง + จอสั่น → คืนเวลาถัดไป
function playBoss(it, t, api, out, posOf, pos, impact) {
  const e = it.e, m = e.move, T = BOSS_T[m] || { wind: 300, act: 600 }, boss = e.boss || "devilTruck";
  const from = e.from ? { x: e.from.x, y: e.from.y } : posOf(e.id), to = e.to ? { x: e.to.x, y: e.to.y } : from;
  const t0 = api.now() + t, tiles = e.tiles || [];
  out.add(e.id);
  api.look(from, t);
  let dashPts = null, dashDur = 0;
  if (it.dash && Array.isArray(it.dash.path) && it.dash.path.length > 1) { dashPts = it.dash.path.map(xyOf); dashDur = (dashPts.length - 1) * (T.step || 60); }
  // เสียงง้าง
  api.later(t, () => {
    if (boss === "devilTruck") { synth("f1"); if (m === "ram") rtSfx("nitro"); }
    else if (boss === "darkKnight") synth("dark");
    else synth("water");
  });
  const total = T.step ? T.wind + dashDur + 500 : T.wind + T.act + 400;
  addBfx(`${boss}:${m}`, t0, total, { from, to, tiles, wind: T.wind, act: T.step ? dashDur : T.act, path: dashPts, boss, id: e.id });
  if (boss === "devilTruck") F1.push({ id: e.id, t0: t0 + (m === "swing" ? T.wind : m === "throw" ? T.wind : 0), f: { move: m, from, to, dur: m === "ram" ? T.wind + dashDur : T.act } });
  // พุ่งไปตามแนว
  if (dashPts) {
    api.glide(e.id, dashPts, T.step, t + T.wind);
    pos[e.id] = dashPts[dashPts.length - 1];
    api.later(t + T.wind, () => { if (boss === "devilTruck") rtSfx("tire_screech"); else synth("whoosh"); });
    api.later(t + T.wind + dashDur, () => { if (boss === "devilTruck") rtSfx("crash"); rtShake(0.5); api.shake(); });
  }
  // จังหวะปะทะของแต่ละคน
  for (const h of it.hits) {
    let at = t + T.wind + (T.act || 0) * 0.5;
    if (dashPts) { const tp = posOf(h.target); const i = tp ? dashPts.findIndex((p) => Math.abs(p.x - tp.x) + Math.abs(p.y - tp.y) <= 1) : -1; at = t + T.wind + Math.max(1, i) * T.step; }
    if (m === "throw") at = t + T.wind + T.act;
    if (m === "tide") at = t + T.wind + T.act * 0.45;
    impact(h, at, true);
  }
  // ปะทะใหญ่ (เสียง + จอสั่น) — ไม่ขึ้นกับว่ามีใครโดน
  const big = t + T.wind + (m === "throw" ? T.act : m === "tide" ? T.act * 0.45 : (T.act || 0) * 0.5);
  if (!dashPts) api.later(big, () => {
    if (m === "throw") { synth("boom"); rtSfx("crash"); rtShake(1.0); }
    else if (m === "swing") { synth("whoosh"); rtSfx("crash"); rtShake(0.7); }
    else if (m === "slash") { synth("slash"); synth("thud"); rtShake(0.7); }
    else if (m === "lunge") { synth("water"); synth("ice"); rtShake(0.5); }
    else if (m === "tide") { synth("water"); synth("ice"); rtShake(0.6); }
    else { synth("thud"); rtShake(0.5); }
    api.shake();
  });
  if (m === "throw") api.later(t + T.wind, () => synth("spin"));
  return t + (T.step ? T.wind + dashDur + 500 : T.wind + T.act + 400);
}
