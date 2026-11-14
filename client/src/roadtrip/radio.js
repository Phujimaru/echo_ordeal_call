// Road Trip — วิทยุรถตู้ + เพลงพื้นหลังสังเคราะห์ (GRID_PLAN §8.8 · สัญญา roadtrip-contract.md §4 radio)
//  พอร์ตจากต้นแบบ .claude/plans/road-trip-van.html: เพลงสังเคราะห์สด 5 สถานี (ป๊อป · ลูกทุ่ง · ร็อก · ชิล · หลอน) + YouTube IFrame Player
//  ซิงก์กับ state.roadtrip.radio { src: "off"|"synth"|"yt", station, yt: { id, list, start, at, queue }, by } — ใครเปลี่ยน = เปลี่ยนให้ทุกคน (rt:radio)
//  วิทยุเล่นเฉพาะช่วงขับ (intro/drive/fork/event — ผู้ใช้สั่ง 2026-11-14) · เข้าจุดพัก/ต่อสู้ = จางออก (จำสถานี/ตำแหน่ง YouTube) · กลับมาขับ = เล่นต่อ
//  เพลงพื้นหลังจุดพัก/ต่อสู้/บอส/จบ: ใช้ไฟล์ /roadtrip/music/*.mp3 ถ้ามี (audio.js rt_* — App เลือกผ่าน audioPolicy.roadtripMusic)
//   ไม่มีไฟล์ = ลูปสังเคราะห์ของที่นี่ (setBed) · คลิปวีดีโอ/เสียงพักเพลง (suspendMusic) = เพลงสังเคราะห์เงียบตาม
//  ความดัง = หลอดเพลง (masterGain × channelGain("music")) · กล้องนอกรถ (setInside(false)) = อู้อี้ + เบาลง (YouTube กรองเสียงไม่ได้ → เหลือ 40%)
import { masterGain, channelGain, onVolumeChange, onMusicSuspend, isMusicSuspended } from "../audio";
import { rtEmit } from "./rtSocket";

// ---------------------------------------------------------------- เครื่องเสียง
let ac = null, out, comp, radioGain, carFilter, musicBus, rockIn, bedGain, bedBus, bedRock, sfxBus, noiseBuf;
const OUT_BASE = 0.62;
let inside = true, suspended = false;
const outLevel = () => (suspended ? 0 : OUT_BASE * masterGain() * channelGain("music"));
function makeRock(dest) {
  const inp = ac.createGain(); inp.gain.value = 0.9;
  const ws = ac.createWaveShaper(); const curve = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 6); }
  ws.curve = curve;
  const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 3800;
  const g = ac.createGain(); g.gain.value = 0.35;
  inp.connect(ws).connect(lp).connect(g).connect(dest);
  return inp;
}
function initAudio() {
  if (typeof window === "undefined") return false;
  if (ac) { if (ac.state === "suspended") ac.resume().catch(() => {}); return true; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ac = new AC();
  out = ac.createGain(); out.gain.value = outLevel();
  comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3;
  out.connect(comp).connect(ac.destination);
  // วิทยุ: musicBus → กรองอู้อี้ (นอกรถ) → radioGain (จางเข้า/ออก)
  radioGain = ac.createGain(); radioGain.gain.value = 0; radioGain.connect(out);
  carFilter = ac.createBiquadFilter(); carFilter.type = "lowpass"; carFilter.frequency.value = inside ? 18000 : 900;
  carFilter.connect(radioGain);
  musicBus = ac.createGain(); musicBus.gain.value = 0.6; musicBus.connect(carFilter);
  rockIn = makeRock(musicBus);
  // เพลงพื้นหลังจุดพัก/ต่อสู้ (ไม่ผ่านตัวกรองในรถ)
  bedGain = ac.createGain(); bedGain.gain.value = 0; bedGain.connect(out);
  bedBus = ac.createGain(); bedBus.gain.value = 0.55; bedBus.connect(bedGain);
  bedRock = makeRock(bedBus);
  sfxBus = ac.createGain(); sfxBus.gain.value = 0.6; sfxBus.connect(out);
  noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  onVolumeChange(applyLevels);
  onMusicSuspend((on) => { suspended = on; applyLevels(); });
  suspended = isMusicSuspended();
  if (!schedId) schedId = setInterval(sched, 25);
  return true;
}
// เบราว์เซอร์ยังไม่ให้เล่นเสียง → ปลดล็อกตอนแตะจอ/กดปุ่มครั้งแรก
if (typeof window !== "undefined") {
  const unlock = () => { if (ac && ac.state === "suspended") ac.resume().catch(() => {}); };
  window.addEventListener("pointerdown", unlock, true);
  window.addEventListener("keydown", unlock, true);
}
function ramp(param, v, sec = 0.6) {
  if (!ac) return;
  const t = ac.currentTime;
  param.cancelScheduledValues(t);
  param.setValueAtTime(param.value, t);
  param.linearRampToValueAtTime(v, t + Math.max(0.01, sec));
}
function applyLevels() {
  if (ac) ramp(out.gain, outLevel(), suspended ? 0.25 : 0.6);
  ytApplyVolume(0.4);
}

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const hash = (a, b = 0, c = 0) => { let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function env(g, t, a, peak, dur) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dur); }
function tone(type, f, t, dur, vol, dest, o = {}) {
  const osc = ac.createOscillator(); osc.type = type; osc.frequency.setValueAtTime(f, t);
  if (o.glideTo) osc.frequency.exponentialRampToValueAtTime(o.glideTo, t + (o.glideT || dur));
  if (o.det) osc.detune.value = o.det;
  const fl = ac.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = o.cut || 18000; fl.Q.value = o.q || 0.7;
  const g = ac.createGain(); env(g, t, o.a || 0.004, vol, dur);
  osc.connect(fl).connect(g).connect(dest); osc.start(t); osc.stop(t + (o.a || 0.004) + dur + 0.05);
}
function noise(t, dur, vol, dest, type = "highpass", f = 1000, q = 0.7, a = 0.002) {
  const s = ac.createBufferSource(); s.buffer = noiseBuf;
  const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
  const g = ac.createGain(); env(g, t, a, vol, dur);
  s.connect(fl).connect(g).connect(dest); s.start(t, Math.random() * 1.5); s.stop(t + a + dur + 0.05);
}
const dr = {
  kick: (t, v, d) => tone("sine", 150, t, 0.3, 0.95 * v, d, { glideTo: 42, glideT: 0.12 }),
  snare: (t, v, d) => { noise(t, 0.17, 0.4 * v, d, "highpass", 1400); tone("triangle", 190, t, 0.08, 0.3 * v, d); },
  hat: (t, v, d) => noise(t, 0.035, 0.14 * v, d, "highpass", 8000),
  ching: (t, open, d) => [2637, 3951, 5274].forEach((f, i) => tone("sine", f, t, open ? 0.7 : 0.07, 0.07 / (i + 1), d)),
  tom: (t, v, d) => tone("sine", 120, t, 0.25, 0.5 * v, d, { glideTo: 75 }),
  rim: (t, v, d) => { noise(t, 0.02, 0.22 * v, d, "bandpass", 2600, 4); tone("square", 820, t, 0.02, 0.05 * v, d, { cut: 3000 }); },
  shaker: (t, v, d) => noise(t, 0.05, 0.07 * v, d, "highpass", 6500, 0.7, 0.012),
};
function khaen(f, t, dur, vol, d) {
  for (const det of [-9, 9]) {
    const o = ac.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.detune.value = det;
    const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = Math.min(f * 2.4, 4000); bp.Q.value = 1.1;
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.05);
    g.gain.setValueAtTime(vol, t + dur * 0.75); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const l = ac.createOscillator(); l.frequency.value = 5.2; const lg = ac.createGain(); lg.gain.value = f * 0.007; l.connect(lg).connect(o.frequency);
    o.connect(bp).connect(g).connect(d); o.start(t); l.start(t); o.stop(t + dur + 0.05); l.stop(t + dur + 0.05);
  }
}
const CH = { M: [0, 4, 7], m: [0, 3, 7], M7: [0, 4, 7, 11], m7: [0, 3, 7, 10], 5: [0, 7, 12], dim: [0, 3, 6] };
const notesOf = ([r, q]) => CH[q].map((i) => r + i);

// ---------------------------------------------------------------- 5 สถานี (ตามต้นแบบ)
export const STATIONS = [
  { key: "pop", name: "ป๊อป", freq: "FM 88.0", color: "#ff8fb8", bpm: 118, prog: [[60, "M"], [55, "M"], [57, "m"], [53, "M"]], play(s, t, bar, ch, spb, d) {
    const [r] = ch, N = notesOf(ch);
    if (s === 0 || s === 8 || (s === 10 && bar % 2)) dr.kick(t, 1, d);
    if (s === 4 || s === 12) dr.snare(t, 1, d);
    if (s % 2 === 0) dr.hat(t, s % 4 === 2 ? 1 : 0.5, d);
    if ([0, 3, 6, 8, 11, 14].includes(s)) tone("sawtooth", mtof(r - 24 + (s === 14 ? 7 : 0)), t, spb * 1.3, 0.16, d, { cut: 650 });
    if (s % 4 === 2) N.forEach((n) => tone("triangle", mtof(n), t, spb * 0.9, 0.05, d, { cut: 3200 }));
    const mask = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0];
    if (mask[s] && bar % 8 < 6) {
      const sc = [0, 2, 4, 7, 9], k = Math.floor(hash(bar % 4, s, 11) * 7);
      const n = s % 4 === 0 ? N[k % N.length] + 12 : 72 + sc[k % 5];
      tone("square", mtof(n), t, spb * 1.4, 0.045, d, { cut: 2600 });
    }
  } },
  { key: "luktung", name: "ลูกทุ่ง", freq: "FM 95.5", color: "#ffc35a", bpm: 132, prog: [[57, "m"], [55, "M"], [53, "M"], [55, "M"]], play(s, t, bar, ch, spb, d) {
    const [r] = ch;
    if (s === 0 || s === 8) dr.kick(t, 1, d);
    if (s === 6 || s === 14) dr.tom(t, 1, d);
    if (s % 8 === 0) dr.ching(t, false, d); if (s % 8 === 4) dr.ching(t, true, d);
    if (s % 4 === 0) tone("triangle", mtof(r - 24 + (s % 8 === 4 ? 7 : 0)), t, spb * 2.2, 0.32, d, { cut: 900 });
    if (s === 0) [0, 7].forEach((iv) => khaen(mtof(r - 12 + iv), t, spb * 16, 0.05, d));
    const mask = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0];
    if (mask[s]) { const sc = [0, 3, 5, 7, 10, 12, 15], k = Math.floor(hash(bar % 4, s, 21) * sc.length); khaen(mtof(69 + sc[k]), t, spb * (s % 4 === 0 ? 2.8 : 1.7), 0.11, d); }
  } },
  { key: "rock", name: "ร็อก", freq: "FM 101.5", color: "#ff6a4d", bpm: 144, prog: [[52, "5"], [50, "5"], [48, "5"], [50, "5"]], play(s, t, bar, ch, spb, d, rk) {
    const [r] = ch, N = notesOf(ch);
    if ([0, 3, 8, 10].includes(s)) dr.kick(t, 1.1, d);
    if (s === 4 || s === 12) dr.snare(t, 1.3, d);
    if (s % 2 === 0) dr.hat(t, 0.8, d);
    if (s === 0 && bar % 4 === 0) noise(t, 1.3, 0.16, d, "highpass", 5000);
    if (s % 2 === 0) { const long = s === 0; N.forEach((n) => tone("sawtooth", mtof(n), t, long ? spb * 3 : spb * 0.7, 0.09, rk, { cut: long ? 5000 : 1700 })); }
    if (s % 2 === 0) tone("sawtooth", mtof(r - 12), t, spb * 0.8, 0.14, d, { cut: 700 });
    if (bar % 4 === 3 && [0, 2, 3, 6, 8, 10, 11, 14].includes(s)) { const sc = [0, 3, 5, 7, 10, 12]; tone("square", mtof(r + 12 + sc[Math.floor(hash(bar, s, 31) * 6)]), t, spb * 1.1, 0.06, rk, { cut: 4000 }); }
  } },
  { key: "chill", name: "ชิล", freq: "FM 104.0", color: "#7fd8c8", bpm: 80, prog: [[65, "M7"], [64, "m7"], [62, "m7"], [60, "M7"]], play(s, t, bar, ch, spb, d) {
    const [r] = ch, N = notesOf(ch), tt = t + (s % 2 ? spb * 0.2 : 0);
    if (s === 0 || s === 10) dr.kick(tt, 0.7, d); if (s === 7 && bar % 2) dr.kick(tt, 0.4, d);
    if (s === 4 || s === 12) noise(tt, 0.16, 0.16, d, "bandpass", 1800, 0.8);
    if (s % 2 === 0) dr.hat(tt, 0.35, d);
    if (s === 0) N.forEach((n, i) => tone(i % 2 ? "sine" : "triangle", mtof(n), tt + i * 0.015, spb * 14, 0.05, d, { cut: 1500, a: 0.06 }));
    if (s === 0 || s === 10) tone("sine", mtof(r - 24), tt, spb * 5, 0.3, d);
    if (hash(bar % 8, s, 3) < 0.22) tone("triangle", mtof(N[Math.floor(hash(bar, s, 5) * N.length)] + 12), tt, spb * 3, 0.05, d, { cut: 2200 });
    if (Math.random() < 0.3) noise(t + Math.random() * spb, 0.008, 0.06, d, "highpass", 3000);
  } },
  { key: "haunt", name: "หลอน", freq: "AM 666", color: "#a58cff", bpm: 60, prog: [[45, "m"], [44, "M"], [45, "m"], [46, "M"]], play(s, t, bar, ch, spb, d) {
    const [r] = ch;
    if (s === 0) { tone("sine", mtof(r - 12), t, spb * 16, 0.13, d, { a: 1.2 }); tone("sine", mtof(r - 12) * 1.013, t, spb * 16, 0.1, d, { a: 1.2 }); }
    if (s % 4 === 0 && hash(bar, s, 7) < 0.45) { const sc = [0, 1, 3, 6, 7, 8]; tone("triangle", mtof(r + 36 + sc[Math.floor(hash(bar, s, 9) * 6)]), t, spb * 6, 0.035, d, { det: hash(bar, s) * 30 - 15 }); }
    if (s === 8 && bar % 4 === 2) noise(t, 2.5, 0.06, d, "bandpass", 620, 5, 1.2);
    if (s === 0 || s === 2) dr.kick(t, 0.45, d);
  } },
];
export const stationIndex = (st) => {
  if (typeof st === "number" && STATIONS[st]) return st;
  const i = STATIONS.findIndex((s) => s.key === st);
  return i >= 0 ? i : 0;
};

// ---------------------------------------------------------------- ลูปพื้นหลังสังเคราะห์ (ไม่มีไฟล์เพลง)
//  stop_day = สบายๆ บอสซ่า · stop_night = กล่องดนตรีหลอน · combat_day = ร็อกขับรถ · combat_night = ซินธ์เวฟมืด · boss = ตึงเครียด · over = ช้า สงบ
export const BEDS = {
  stop_day: { bpm: 96, prog: [[62, "M7"], [59, "m7"], [64, "m7"], [57, "M"]], play(s, t, bar, ch, spb, d) {
    const [r] = ch, N = notesOf(ch);
    if (s === 0 || s === 6 || s === 10) dr.kick(t, 0.55, d);
    if (s === 3 || s === 11 || (s === 14 && bar % 2)) dr.rim(t, 1, d);
    dr.shaker(t, s % 2 ? 0.6 : 1, d);
    if (s === 0 || s === 7) tone("sine", mtof(r - 24), t, spb * 5, 0.26, d);
    if (s === 9) tone("sine", mtof(r - 17), t, spb * 3, 0.18, d);
    if (s === 0 || s === 8) N.forEach((n, i) => tone("triangle", mtof(n), t + i * 0.012, spb * 6, 0.04, d, { cut: 2200, a: 0.02 }));
    const mask = [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0];
    if (mask[s] && bar % 4 !== 3) { const sc = [0, 2, 4, 7, 9, 12], k = Math.floor(hash(bar % 8, s, 41) * sc.length); tone("sine", mtof(74 + sc[k]), t, spb * 2.4, 0.06, d, { a: 0.01 }); tone("sine", mtof(86 + sc[k]), t, spb * 1.2, 0.012, d); }
  } },
  stop_night: { bpm: 70, prog: [[57, "m"], [53, "M"], [52, "M"], [57, "m"]], play(s, t, bar, ch, spb, d) {
    const [r] = ch, N = notesOf(ch);
    if (s === 0) { tone("sine", mtof(r - 24), t, spb * 16, 0.12, d, { a: 1.5 }); tone("sine", mtof(r - 24) * 1.008, t, spb * 16, 0.08, d, { a: 1.5 }); }
    if (s % 2 === 0 && hash(bar, s, 13) < 0.7) { const n = N[Math.floor(hash(bar, s, 17) * 3)] + 24; tone("sine", mtof(n), t, spb * 3, 0.05, d, { det: hash(bar, s, 19) * 24 - 12 }); tone("sine", mtof(n + 12), t, spb, 0.012, d); }
    if (s === 12 && bar % 4 === 1) tone("sawtooth", 210, t, 0.7, 0.025, d, { cut: 800, glideTo: 150 });
    if (s === 6 && bar % 8 === 5) noise(t, 2, 0.05, d, "bandpass", 500, 6, 0.8);
    if (s === 0 || s === 8) dr.kick(t, 0.28, d);
  } },
  combat_day: { bpm: 152, prog: [[52, "5"], [48, "5"], [50, "5"], [47, "5"]], play(s, t, bar, ch, spb, d, rk) {
    const [r] = ch, N = notesOf(ch);
    if (s % 4 === 0 || s === 14) dr.kick(t, 1.1, d);
    if (s === 4 || s === 12) dr.snare(t, 1.2, d);
    dr.hat(t, s % 2 ? 0.45 : 0.9, d);
    tone("sawtooth", mtof(r - 12 + (s % 8 === 7 ? 2 : 0)), t, spb * 0.8, 0.12, d, { cut: 800 });
    if (s % 4 === 0) N.forEach((n) => tone("sawtooth", mtof(n), t, spb * 2.8, 0.07, rk, { cut: 2800 }));
    if (bar % 2 === 1 && [0, 3, 6, 10, 12].includes(s)) { const sc = [0, 3, 5, 7, 10, 12]; tone("square", mtof(r + 24 + sc[Math.floor(hash(bar, s, 51) * 6)]), t, spb * 1.4, 0.04, d, { cut: 3500 }); }
    if (s === 0 && bar % 8 === 0) noise(t, 1.2, 0.12, d, "highpass", 5000);
  } },
  combat_night: { bpm: 138, prog: [[50, "m"], [46, "M"], [48, "M"], [45, "m"]], play(s, t, bar, ch, spb, d) {
    const [r] = ch, N = notesOf(ch);
    if (s % 4 === 0) dr.kick(t, 1, d);
    if (s === 4 || s === 12) { dr.snare(t, 0.9, d); noise(t, 0.4, 0.05, d, "bandpass", 1200, 1, 0.01); }
    if (s % 2 === 1) dr.hat(t, 0.6, d);
    tone("sawtooth", mtof(r - 12), t, spb * 0.7, 0.12, d, { cut: 600 + 300 * (s % 4) });
    tone("square", mtof(N[s % 3] + 12 + (s >= 8 ? 12 : 0)), t, spb * 0.6, 0.035, d, { cut: 2400 });
    if (s === 0) N.forEach((n) => tone("sawtooth", mtof(n), t, spb * 16, 0.025, d, { cut: 1400, a: 0.4, det: 8 }));
  } },
  boss: { bpm: 170, prog: [[50, "m"], [51, "M"], [50, "m"], [49, "dim"]], play(s, t, bar, ch, spb, d, rk) {
    const [r] = ch, N = notesOf(ch);
    dr.kick(t, s % 4 === 0 ? 1.2 : 0.7, d);
    if (s === 4 || s === 12) dr.snare(t, 1.4, d);
    if (s % 2 === 0) dr.hat(t, 0.8, d);
    if (s % 8 === 0) N.forEach((n) => tone("sawtooth", mtof(n), t, spb * 1.6, 0.09, rk, { cut: 3200 }));
    if (s === 6 || s === 14) N.forEach((n) => tone("sawtooth", mtof(n + 12), t, spb * 0.8, 0.05, d, { cut: 2600 }));
    tone("sawtooth", mtof(r - 12 + (s % 2 ? 12 : 0)), t, spb * 0.5, 0.11, d, { cut: 900 });
    if (bar % 4 === 3 && s % 2 === 0) tone("square", mtof(r + 24 + (s % 4 ? 1 : 0)), t, spb * 0.9, 0.035, d, { cut: 4000 });
  } },
  over: { bpm: 66, prog: [[60, "M7"], [57, "m7"], [53, "M7"], [55, "M"]], play(s, t, bar, ch, spb, d) {
    const [r] = ch, N = notesOf(ch);
    if (s === 0) { tone("sine", mtof(r - 24), t, spb * 15, 0.22, d, { a: 0.3 }); N.forEach((n, i) => tone("triangle", mtof(n), t + i * 0.06, spb * 14, 0.045, d, { cut: 1800, a: 0.08 })); }
    if (s % 4 === 2 && hash(bar, s, 61) < 0.6) tone("sine", mtof(N[Math.floor(hash(bar, s, 63) * N.length)] + 12), t, spb * 4, 0.05, d, { a: 0.02 });
  } },
};
const BED_SYNTH = { stop_day: "stop_day", motel: "stop_day", stop_night: "stop_night", combat_day: "combat_day", combat_night: "combat_night", onvan: "combat_day", boss: "boss", over: "over", intro: null };

// ---------------------------------------------------------------- ตัวเล่นลำดับโน้ต (วิทยุ + พื้นหลัง ใช้นาฬิกาเดียวกัน)
const seqs = { radio: { pat: null, step: 0, bar: 0, nextT: 0 }, bed: { pat: null, step: 0, bar: 0, nextT: 0 } };
let schedId = null;
function runSeq(q, dest, rk) {
  if (!q.pat) return;
  const S = q.pat, spb = 60 / S.bpm / 4;
  if (q.nextT < ac.currentTime - 0.5) q.nextT = ac.currentTime + 0.05; // แท็บถูกพัก/กระตุก = ข้ามโน้ตที่เลยเวลาไป
  while (q.nextT < ac.currentTime + 0.14) {
    S.play(q.step, q.nextT, q.bar, S.prog[q.bar % S.prog.length], spb, dest, rk);
    q.step++; if (q.step === 16) { q.step = 0; q.bar++; }
    q.nextT += spb;
  }
}
function sched() {
  if (!ac || ac.state !== "running") return;
  runSeq(seqs.radio, musicBus, rockIn);
  runSeq(seqs.bed, bedBus, bedRock);
}
function startSeq(q, pat, delay = 0.35) {
  q.pat = pat; q.step = 0; q.bar = 0; q.nextT = ac.currentTime + delay;
}

// ---------------------------------------------------------------- YouTube (IFrame Player API — ตัวเล่นต้องมองเห็นบนจอ ≥ 200×200)
export function parseYT(raw) {
  const u = (raw || "").trim(); if (!u) return null;
  if (/^[\w-]{11}$/.test(u)) return { id: u };
  try {
    const url = new URL(/^https?:/i.test(u) ? u : "https://" + u);
    const h = url.hostname.replace(/^(www|m|music)\./, ""), list = url.searchParams.get("list");
    let id = null;
    if (h === "youtu.be") id = url.pathname.slice(1, 12);
    else if (/(^|\.)youtube(-nocookie)?\.com$/.test(h)) { id = url.searchParams.get("v"); const m = url.pathname.match(/\/(shorts|embed|live|v)\/([\w-]{11})/); if (m) id = m[2]; }
    else return null;
    if (id && !/^[\w-]{11}$/.test(id)) id = null;
    if (!id && !list) return null;
    const t = url.searchParams.get("t") || url.searchParams.get("start") || "0";
    return { id: id || null, list: list || null, start: parseInt(t, 10) || 0 };
  } catch { return null; }
}
let ytApi = null;
function loadYTApi() {
  if (ytApi) return ytApi;
  ytApi = new Promise((res) => {
    if (window.YT && window.YT.Player) { res(); return; }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if (typeof prev === "function") prev(); res(); };
    const sc = document.createElement("script"); sc.src = "https://www.youtube.com/iframe_api"; sc.async = true;
    document.head.appendChild(sc);
  });
  return ytApi;
}
const yt = { player: null, ready: false, wrap: null, box: null, key: null, want: null, playing: false, err: false, title: "", fadeT: 0, vol: 0, pausedAt: null, pausedKey: null, visible: false };
function ytWrap() {
  if (yt.wrap || typeof document === "undefined") return yt.wrap;
  const w = document.createElement("div");
  w.className = "rt-yt";
  w.setAttribute("aria-hidden", "true");
  const b = document.createElement("div");
  w.appendChild(b);
  document.body.appendChild(w);
  yt.wrap = w; yt.box = b;
  return w;
}
function ytShow(on) {
  yt.visible = on;
  if (yt.wrap) yt.wrap.dataset.on = on ? "true" : "false";
  notify();
}
const ytKey = (v) => (v ? `${v.id || ""}|${v.list || ""}|${v.at || 0}` : null);
function ytTargetVol() { return Math.round(100 * Math.min(1, masterGain() * channelGain("music") * 0.9) * (inside ? 1 : 0.4) * (suspended ? 0 : 1)); }
function ytSetVol(v) { yt.vol = v; try { if (yt.player && yt.ready) yt.player.setVolume(Math.max(0, Math.min(100, v))); } catch { /* ตัวเล่นยังไม่พร้อม */ } }
// จางเสียง YouTube ไปหาค่าเป้า (setVolume ทีละขั้น — API ไม่มีการจางเอง) · then = ทำต่อเมื่อถึงค่า
function ytFade(to, sec, then) {
  clearInterval(yt.fadeT);
  const from = yt.vol, t0 = performance.now(), dur = Math.max(1, sec * 1000);
  yt.fadeT = setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / dur);
    ytSetVol(from + (to - from) * k);
    if (k >= 1) { clearInterval(yt.fadeT); if (then) then(); }
  }, 50);
}
function ytApplyVolume(sec = 0.4) { if (yt.want && yt.playing) ytFade(ytTargetVol(), sec); }
const alignedStart = (v, now) => Math.max(0, (v.start || 0) + (v.at ? Math.max(0, (now - v.at) / 1000) : 0));
async function ytLoad(v, at) {
  ytWrap();
  yt.err = false; yt.title = "";
  ytShow(true);
  await loadYTApi();
  if (yt.want !== v) return; // ระหว่างรอ API มีคำสั่งใหม่มาแทน
  const startSeconds = Math.floor(at);
  if (!yt.player) {
    yt.player = new window.YT.Player(yt.box, {
      width: 320, height: 200, videoId: v.id || undefined,
      playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1, start: startSeconds, ...(v.list ? { listType: "playlist", list: v.list } : {}) },
      events: {
        onReady: (e) => { yt.ready = true; ytSetVol(0); e.target.playVideo(); },
        onStateChange: (e) => {
          const S = window.YT.PlayerState;
          yt.playing = e.data === S.PLAYING;
          if (yt.playing) {
            yt.err = false;
            try { yt.title = (yt.player.getVideoData() || {}).title || ""; } catch { yt.title = ""; }
            if (yt.want) ytFade(ytTargetVol(), 1.2); else { ytFade(0, 0.3, () => { try { yt.player.pauseVideo(); } catch { /* */ } }); }
          }
          if (e.data === S.ENDED && !(yt.want && yt.want.list)) advance("ended");
          notify();
        },
        onError: () => { yt.err = true; yt.playing = false; notify(); setTimeout(() => advance("error"), 1500); },
      },
    });
  } else if (yt.ready) {
    ytSetVol(0);
    if (v.id) yt.player.loadVideoById({ videoId: v.id, startSeconds });
    else yt.player.loadPlaylist({ list: v.list, listType: "playlist" });
  }
}
function ytPause(remember) {
  clearInterval(yt.fadeT);
  if (!yt.player || !yt.ready) { ytShow(false); return; }
  if (remember) { try { yt.pausedAt = yt.player.getCurrentTime(); yt.pausedKey = yt.key; } catch { yt.pausedAt = null; } }
  ytFade(0, 1.2, () => { if (yt.want) return; try { yt.player.pauseVideo(); } catch { /* */ } ytShow(false); });
}

// ---------------------------------------------------------------- สถานะ + ซิงก์กับ state.roadtrip.radio
const cur = { src: "off", station: 0, active: false, leader: false, radio: null };
const listeners = new Set();
function notify() { const v = snapshot(); listeners.forEach((fn) => { try { fn(v); } catch { /* */ } }); }
export function snapshot() {
  return { src: cur.src, station: cur.station, active: cur.active, inside, ytPlaying: yt.playing, ytErr: yt.err, ytTitle: yt.title, ytVisible: yt.visible, queue: (cur.radio && cur.radio.yt && cur.radio.yt.queue) || [] };
}
export function subscribe(fn) { listeners.add(fn); fn(snapshot()); return () => listeners.delete(fn); }

function staticBurst() { if (ac) noise(ac.currentTime, 0.38, 0.2, sfxBus, "bandpass", 1600, 1.5); }

/**
 * ซิงก์วิทยุตาม state
 * @param radio   state.roadtrip.radio (null = ปิด)
 * @param active  ช่วงขับ (intro/drive/fork/event) — นอกนั้นวิทยุจางออก
 * @param leader  เครื่องนี้เป็นคนเลื่อนคิวเอง (คลิปจบ/ฝังไม่ได้) — ต้องมีเครื่องเดียว กันข้ามซ้อน
 * @param now     เวลา server (epoch ms) ใช้คิดตำแหน่งเริ่ม YouTube ให้ตรงกันทุกเครื่อง
 */
export function sync(radio, { active = false, leader = false, now = Date.now() } = {}) {
  const src = radio && radio.src ? radio.src : "off";
  cur.radio = radio || null; cur.leader = leader;
  const wasActive = cur.active;
  cur.active = !!active;
  const st = stationIndex(radio && radio.station);
  // ---- สังเคราะห์
  const wantSynth = cur.active && src === "synth";
  if (wantSynth) {
    if (!initAudio()) return;
    if (!seqs.radio.pat || cur.station !== st || cur.src !== "synth") {
      if (cur.src === "synth" && seqs.radio.pat && wasActive) staticBurst();
      startSeq(seqs.radio, STATIONS[st]);
    }
    ramp(radioGain.gain, inside ? 1 : 0.55, wasActive ? 0.25 : 1.6);
  } else if (ac && seqs.radio.pat) {
    const q = seqs.radio;
    ramp(radioGain.gain, 0, cur.active ? 0.3 : 1.4);
    const pat = q.pat;
    setTimeout(() => { if (q.pat === pat && !(cur.active && cur.src === "synth")) q.pat = null; }, cur.active ? 350 : 1500);
  }
  // ---- YouTube
  const v = src === "yt" && radio.yt && (radio.yt.id || radio.yt.list) ? radio.yt : null;
  if (cur.active && v) {
    const k = ytKey(v);
    if (yt.key !== k || !yt.want) {
      const resume = yt.pausedKey === k && yt.pausedAt != null;
      yt.want = v; yt.key = k;
      if (resume && yt.player && yt.ready) {
        ytShow(true);
        try { yt.player.seekTo(yt.pausedAt, true); yt.player.playVideo(); } catch { /* */ }
      } else ytLoad(v, alignedStart(v, now));
      yt.pausedAt = null; yt.pausedKey = null;
    }
  } else if (yt.want) {
    const keep = !cur.active && !!v; // ออกจากช่วงขับ = จำตำแหน่งไว้เล่นต่อ (ytPause อ่าน yt.key ก่อนล้าง)
    ytPause(keep);
    yt.want = null; yt.key = null;
    if (!keep) { yt.pausedAt = null; yt.pausedKey = null; }
  }
  cur.src = src; cur.station = st;
  notify();
}
// เลื่อนคิว YouTube (เครื่องหัวหน้าเท่านั้น — กันทุกเครื่องข้ามพร้อมกัน)
function advance(why) {
  if (!cur.leader || !cur.radio || cur.radio.src !== "yt") return;
  next(why);
}
export function next() {
  const r = cur.radio;
  if (!r || r.src !== "yt") return;
  const q = (r.yt && r.yt.queue) || [];
  if (q.length) { const [h, ...rest] = q; rtEmit("rt:radio", { src: "yt", station: r.station, yt: { id: h.id || null, list: h.list || null, start: h.start || 0, queue: rest } }); return; }
  if (r.yt && r.yt.list && yt.player && yt.ready) { try { yt.player.nextVideo(); } catch { /* */ } return; }
  rtEmit("rt:radio", { src: "off", station: r.station, yt: null });
}
// ---- คำสั่งจากแผงวิทยุ
export function setStation(i) {
  initAudio();
  rtEmit("rt:radio", { src: "synth", station: stationIndex(i), yt: cur.radio && cur.radio.yt ? cur.radio.yt : null });
}
export function turnOff() { rtEmit("rt:radio", { src: "off", station: cur.station, yt: cur.radio && cur.radio.yt ? cur.radio.yt : null }); }
// วางลิงก์: ไม่มีเพลง YouTube อยู่ = เล่นเลย · มีอยู่ = เข้าคิว
export function addYouTube(raw) {
  const it = parseYT(raw);
  if (!it) return false;
  initAudio();
  const r = cur.radio;
  const playing = r && r.src === "yt" && r.yt && (r.yt.id || r.yt.list);
  if (playing) rtEmit("rt:radio", { src: "yt", station: r.station, yt: { id: r.yt.id || null, list: r.yt.list || null, start: r.yt.start || 0, at: r.yt.at, queue: [...(r.yt.queue || []), it].slice(0, 20) } });
  else rtEmit("rt:radio", { src: "yt", station: cur.station, yt: { ...it, queue: [] } });
  return true;
}
// กลับไปเล่น YouTube ที่ค้างไว้ (ปุ่ม YouTube ตอนเปิดสถานีอื่นอยู่)
export function resumeYouTube() {
  const r = cur.radio;
  if (r && r.yt && (r.yt.id || r.yt.list)) { rtEmit("rt:radio", { src: "yt", station: r.station, yt: { ...r.yt, at: undefined } }); return true; }
  return false;
}

// กล้องอยู่ในรถ (เพลงชัด) / นอกรถ (อู้อี้ + เบาลง)
export function setInside(on) {
  if (inside === !!on) return;
  inside = !!on;
  if (ac) {
    ramp(carFilter.frequency, inside ? 18000 : 900, 0.5);
    if (cur.active && cur.src === "synth") ramp(radioGain.gain, inside ? 1 : 0.55, 0.5);
  }
  ytApplyVolume(0.5);
  notify();
}

// ---------------------------------------------------------------- เพลงพื้นหลังสังเคราะห์ (จุดพัก/ต่อสู้/บอส/จบ)
let bedKey = null;
export function setBed(key) {
  const k = key && Object.prototype.hasOwnProperty.call(BED_SYNTH, key) ? BED_SYNTH[key] : null;
  if (k === bedKey) return;
  bedKey = k;
  if (!k) {
    if (ac) { ramp(bedGain.gain, 0, 1.2); const q = seqs.bed, pat = q.pat; setTimeout(() => { if (q.pat === pat && !bedKey) q.pat = null; }, 1300); }
    return;
  }
  if (!initAudio()) return;
  const swap = () => { if (bedKey !== k) return; startSeq(seqs.bed, BEDS[k], 0.1); ramp(bedGain.gain, 1, 1.6); };
  if (seqs.bed.pat) { ramp(bedGain.gain, 0, 0.6); setTimeout(swap, 650); } else swap();
}

// ---------------------------------------------------------------- ไฟล์เพลง /roadtrip/music/*.mp3 (ผู้ใช้ส่งทีหลัง) — มีไฟล์ไหนบ้าง
//  dev server ตอบ index.html (200) แทนไฟล์ที่ไม่มี → ต้องดู content-type ว่าเป็นเสียงจริง
export const RT_MUSIC_KEYS = ["stop_day", "stop_night", "motel", "combat_day", "combat_night", "onvan", "boss", "over", "intro", "boss_devilTruck", "boss_darkKnight", "boss_jormungand"]; // boss_<type> = เพลงประจำบอส (แม็กซ์ เวอร์สแตปเพน — ไฟล์ผู้ใช้)
let probe = null;
export function probeMusicFiles() {
  if (probe) return probe;
  probe = Promise.all(RT_MUSIC_KEYS.map((k) => fetch(`/roadtrip/music/${k}.mp3`, { method: "HEAD", cache: "no-cache" })
    .then((r) => (r.ok && /^audio\//i.test(r.headers.get("content-type") || "") ? k : null))
    .catch(() => null)))
    .then((list) => new Set(list.filter(Boolean)));
  return probe;
}

// ออกจากโหมด: หยุดทุกเสียงของที่นี่
export function stopAll() {
  sync(null, { active: false });
  setBed(null);
  yt.pausedAt = null; yt.pausedKey = null;
}

// เสียงสั้นของโหมด (ใช้ร่วมกับฉาก 3D — onSfx) อยู่ที่ rtAudio.js
export { rtSfx } from "./rtAudio";
