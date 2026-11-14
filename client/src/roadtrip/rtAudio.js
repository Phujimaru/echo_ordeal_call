// Road Trip — เสียงเอฟเฟกต์ + เสียงบรรยากาศ (GRID_PLAN §8.8)
//  ไฟล์เสียงมาจาก roadtrip/sfxManifest.js { RT_SFX: { name: path }, RT_LOOPS: [name…], RT_GAIN: { name: dB } } (ผู้ช่วยอีกคนทำ)
//   ยังไม่มีไฟล์ manifest = เงียบ (import.meta.glob ไม่ทำให้ build พัง) · ลงทะเบียนใน audio.js เป็นชื่อ "rt_<name>"
//  rtSfx(name, opts) = เสียงสั้น (ใช้ร่วมกับฉาก 3D: onSfx ของ van3d/RoadDrive) · ระหว่างคลิปวีดีโอ (เพลงถูกพัก) = ไม่เล่น (กฎผู้ใช้ 2026-11-03)
//  setAmbience(beds) = ลูปบรรยากาศหลายชั้นพร้อมกัน จางเข้า/ออก · ambienceFor(rt) = ชั้นตามเฟส/ภูมิภาค/กลางคืน
//  handleFx(rt) = เล่นเสียงจาก state.roadtrip.fx (กันเล่นซ้ำด้วย key) + เสียงเปลี่ยนเฟส
import { registerSounds, hasSound, soundPath, soundGain, playSfx, masterGain, channelGain, onVolumeChange, onMusicSuspend, isMusicSuspended } from "../audio";

const manifestMod = Object.values(import.meta.glob("./sfxManifest.js", { eager: true }))[0] || {};
export const RT_SFX = manifestMod.RT_SFX || {};
export const RT_LOOPS = new Set(manifestMod.RT_LOOPS || []);
const RT_GAIN = manifestMod.RT_GAIN || {};
registerSounds(
  Object.fromEntries(Object.entries(RT_SFX).map(([k, p]) => [`rt_${k}`, p])),
  Object.fromEntries(Object.entries(RT_GAIN).map(([k, g]) => [`rt_${k}`, g])),
);

// ---------------------------------------------------------------- เสียงสั้น
export function rtSfx(name, opts) {
  if (!name || isMusicSuspended()) return null; // คลิปวีดีโอกำลังเล่น = ห้ามเสียงซ้อน
  const key = `rt_${name}`;
  if (!hasSound(key)) return null;
  return playSfx(key, opts);
}

// ---------------------------------------------------------------- ลูปบรรยากาศ (หลายชั้น · จางเข้าออก · ตามหลอดเพลง)
const AMB_BASE = 0.55;
const beds = new Map(); // name → { a, k (0..1 ปัจจุบัน), to (เป้า), vol }
let suspended = isMusicSuspended();
let fadeT = 0;
const lvl = (name, vol) => Math.min(1, AMB_BASE * vol * soundGain(`rt_${name}`) * masterGain() * channelGain("music") * (suspended ? 0 : 1));
function applyBed(name, b) { b.a.volume = Math.max(0, Math.min(1, lvl(name, b.vol) * b.k)); }
function tickFade() {
  let busy = false;
  for (const [name, b] of beds) {
    const d = b.to - b.k;
    if (Math.abs(d) > 0.01) { b.k += Math.sign(d) * Math.min(Math.abs(d), 0.05); busy = true; } else b.k = b.to;
    applyBed(name, b);
    if (b.to === 0 && b.k <= 0) { b.a.pause(); beds.delete(name); }
  }
  if (!busy) { clearInterval(fadeT); fadeT = 0; }
}
const kick = () => { if (!fadeT) fadeT = setInterval(tickFade, 60); };
if (typeof window !== "undefined") {
  onVolumeChange(() => { for (const [n, b] of beds) applyBed(n, b); });
  onMusicSuspend((on) => { suspended = on; for (const [n, b] of beds) applyBed(n, b); });
  const unlock = () => { for (const b of beds.values()) if (b.a.paused && b.to > 0) b.a.play().catch(() => {}); };
  window.addEventListener("pointerdown", unlock, true);
  window.addEventListener("keydown", unlock, true);
}
/** beds: [{ name, vol }] — ชั้นที่ไม่อยู่ในรายการจางออก */
export function setAmbience(list) {
  const want = new Map((list || []).filter((x) => x && hasSound(`rt_${x.name}`)).map((x) => [x.name, Math.max(0, Math.min(1, x.vol ?? 1))]));
  for (const [name, b] of beds) if (!want.has(name)) b.to = 0;
  for (const [name, vol] of want) {
    let b = beds.get(name);
    if (!b) {
      const a = new Audio(soundPath(`rt_${name}`));
      a.loop = true; a.volume = 0;
      b = { a, k: 0, to: 1, vol };
      beds.set(name, b);
      a.play().catch(() => { /* รอการกดครั้งแรก (unlock) */ });
    }
    b.to = 1; b.vol = vol;
  }
  kick();
}

// ชั้นบรรยากาศตามเฟส — ขับ: ถนน + ลม + ภูมิภาค · จุดพัก: ปั๊ม/ปั๊มกลางคืน/โมเต็ล · ต่อสู้: ภูมิภาคเบาๆ · จบ = เงียบ
const REGION_BED = { plains: "amb_day_birds", desert: "amb_desert", forest: "amb_forest", snow: "amb_snow", ghost: "amb_ghost" };
function regionBed(rt) {
  const id = rt.region && rt.region.id;
  if (id === "ghost") return "amb_ghost";
  if (rt.night) return "amb_night";
  return REGION_BED[id] || "amb_day_birds";
}
export function ambienceFor(rt) {
  if (!rt) return [];
  switch (rt.phase) {
    case "intro": case "drive": case "fork": case "event":
      return [{ name: "amb_road", vol: 0.8 }, { name: "amb_wind", vol: 0.5 }, { name: regionBed(rt), vol: 0.55 }];
    case "stop":
      return rt.stop && rt.stop.kind === "motel" ? [{ name: "amb_motel", vol: 0.8 }, { name: regionBed(rt), vol: 0.3 }]
        : [{ name: rt.night ? "amb_station_night" : "amb_station", vol: 0.8 }];
    case "combat":
      return [{ name: regionBed(rt), vol: 0.35 }];
    default:
      return [];
  }
}

// ---------------------------------------------------------------- เสียงจาก state.roadtrip.fx + เสียงเปลี่ยนเฟส
//  fx.k → ชื่อเสียง (นอกตาราง: ใช้ fx.sfx หรือ fx.k ถ้ามีไฟล์ชื่อนั้น)
const FX_SFX = {
  hazard: "hazard_hit", hazardHit: "hazard_hit", hit: "hazard_hit", crash: "crash", swerve: "tire_screech", nitro: "nitro", horn: "horn",
  region: "region_enter", regionEnter: "region_enter", night: "ghost_whisper", ghost: "ghost_whisper", turret: "turret_fire",
  upgrade: "upgrade", upg: "upgrade", paint: "paint_spray", decor: "wrench", coin: "coin", gold: "coin", cash: "cash", buy: "cash",
  fuel: "fuel_fill", refuel: "fuel_fill", wash: "splash", flush: "toilet_flush", warp: "teleport", teleport: "teleport", dog: "dog_bark",
  claw: "claw", gacha: "gacha", arcade: "arcade", fish: "splash", ferris: "ferris_creak", spicy: "sizzle", karaoke: "crowd_cheer",
  win: "victory", victory: "victory", rear: "rear_doors", seat: "van_door", alert: "alert", boss: "boss_alarm", km: "km_tick",
};
const seen = new Set();
let lastPhase = null, lastHorn = 0;
export function handleFx(rt) {
  if (!rt) { lastPhase = null; seen.clear(); return; }
  // เห็นครั้งแรก (เข้าเกม/ต่อใหม่) = fx ที่ค้างอยู่ถือว่าเล่นไปแล้ว
  if (lastPhase === null) for (const f of Array.isArray(rt.fx) ? rt.fx : []) seen.add(f.key ?? f.id ?? JSON.stringify(f));
  // เสียงเปลี่ยนเฟส
  if (rt.phase !== lastPhase) {
    const from = lastPhase;
    lastPhase = rt.phase;
    if (from) {
      if (rt.phase === "fork") rtSfx("fork_chime");
      else if (rt.phase === "event") rtSfx("event_sting");
      else if (rt.phase === "stop") rtSfx("brake_stop");
      else if (rt.phase === "combat") rtSfx(rt.combat && rt.combat.kind === "boss" ? "boss_alarm" : "alert");
      else if (rt.phase === "drive" && (from === "stop" || from === "combat")) rtSfx("gear");
    }
  }

  for (const f of Array.isArray(rt.fx) ? rt.fx : []) {
    const k = f.key ?? f.id ?? JSON.stringify(f);
    if (seen.has(k)) continue;
    seen.add(k);
    if (f.k === "combatEnd" || f.k === "garage") continue;
    let name = f.sfx || FX_SFX[f.k] || f.k;
    if (name === "horn") { const now = Date.now(); if (now - lastHorn < 350) continue; lastHorn = now; if (rt.van && rt.van.style === "goofy") name = "horn_goofy"; }
    rtSfx(name);
  }
  if (seen.size > 500) { const keep = Array.from(seen).slice(-250); seen.clear(); keep.forEach((x) => seen.add(x)); }
}

export function stopRtAudio() {
  setAmbience([]);
  lastPhase = null;
  seen.clear();
}
