// เสียงในศาล — สังเคราะห์ด้วย WebAudio (ยังไม่มีไฟล์เสียงจริง · ผู้ใช้ยังไม่ได้ฟัง)
import { masterGain, channelGain } from "../audio";

let AC = null;
const G = () => masterGain() * channelGain("sfx");
export let courtMuted = false;
export const setCourtMuted = (v) => { courtMuted = v; };
const ac = () => { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch { AC = null; } } if (AC && AC.state === "suspended") AC.resume(); return AC; };
function tone(f, d, type = "square", v = 0.05, slide = 0) {
  const a = ac(); if (!a || courtMuted) return;
  const o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.value = f;
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), a.currentTime + d);
  g.gain.value = Math.max(0.0002, v * G()); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + d);
  o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + d);
}
function noise(d, v = 0.25) {
  const a = ac(); if (!a || courtMuted) return;
  const b = a.createBuffer(1, Math.floor(a.sampleRate * d), a.sampleRate), c = b.getChannelData(0);
  for (let i = 0; i < c.length; i++) c[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / c.length, 3);
  const s = a.createBufferSource(), g = a.createGain(); g.gain.value = v * G(); s.buffer = b; s.connect(g).connect(a.destination); s.start();
}
export const CSFX = {
  blip: (who) => tone(who === "L" ? 520 : who === "D" ? 380 : who === "J" ? 260 : 440, 0.03, "square", 0.025),
  gavel: () => { noise(0.25, 0.5); tone(90, 0.25, "sine", 0.3, -40); },
  shout: () => { noise(0.15, 0.25); tone(220, 0.4, "sawtooth", 0.08, 600); tone(330, 0.4, "square", 0.05, 500); },
  hit: () => { noise(0.3, 0.4); tone(160, 0.35, "sawtooth", 0.12, -120); },
  pen: () => { tone(300, 0.12, "square", 0.07); setTimeout(() => tone(200, 0.25, "square", 0.07), 120); },
  ok: () => { tone(660, 0.08, "triangle", 0.08); setTimeout(() => tone(990, 0.15, "triangle", 0.08), 80); },
  boo: () => tone(140, 0.5, "sawtooth", 0.05, -40),
  cheer: () => noise(0.5, 0.12),
  stamp: () => { noise(0.12, 0.5); tone(70, 0.3, "sine", 0.35); },
  whoosh: () => noise(0.35, 0.15),
  splat: () => noise(0.12, 0.3),
};
