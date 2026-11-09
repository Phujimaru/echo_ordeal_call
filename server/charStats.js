// สถิติตัวละคร (เก็บที่เครื่อง host): จำนวนครั้งที่ถูกเลือกลงแมตช์ + ชนะ/แพ้/เสมอ ต่อ characterId
//  ไฟล์ JSON: ECHO_STATS_FILE (โปรแกรม ECHO ส่ง path ใน userData มาให้ — desktop/room.js) · ไม่ตั้ง = data/char-stats.json ข้างโปรเจกต์
//  ระหว่างรันเทสต์ (node --test ตั้ง NODE_TEST_CONTEXT) และไม่ได้ตั้ง ECHO_STATS_FILE = เก็บในหน่วยความจำอย่างเดียว ไม่เขียนไฟล์
//  บันทึกครั้งเดียวต่อแมตช์ ตอน phases/endTurn.js gameOver ตัดสินผล (match.statsRecorded กันซ้ำ — รีเซ็ทใน lobby.startMatch)
//  นับเฉพาะผู้เล่นจริง (ไม่นับยูนิตที่ถูกเรียก/บอส AI · ระบบคู่นับที่ตัวเจ้าของ) · แมตช์ที่มีผู้เล่นคนเดียว (ทดสอบ) ไม่นับ ยกเว้น Moon Cell
//  + ประวัติแมตช์ล่าสุด HISTORY_MAX แมตช์ (history: { at, mode, world, rounds, players: [{ characterId, name, result, teamId }] })
//  + ตัวต่อตัว (matchups["a|b"] = { games, wins } — a เจอ b ฝั่งตรงข้ามกี่แมตช์ · a ชนะกี่แมตช์) · ทีมเดียวกัน/Moon Cell ไม่นับ
const fs = require("fs");
const path = require("path");

const DEFAULT_FILE = path.join(__dirname, "..", "data", "char-stats.json");
const fileOf = () => process.env.ECHO_STATS_FILE || (process.env.NODE_TEST_CONTEXT ? null : DEFAULT_FILE);

let cache = null;
const HISTORY_MAX = 50;

function blank() { return { picks: 0, wins: 0, losses: 0, draws: 0 }; }

function load() {
  if (cache) return cache;
  cache = { version: 2, chars: {}, history: [], matchups: {} };
  const file = fileOf();
  if (!file) return cache;
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    const n = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.floor(Number(v)) : 0);
    if (raw && raw.chars && typeof raw.chars === "object") {
      for (const [id, s] of Object.entries(raw.chars)) {
        cache.chars[id] = { picks: n(s.picks), wins: n(s.wins), losses: n(s.losses), draws: n(s.draws) };
      }
      if (Array.isArray(raw.history)) cache.history = raw.history.filter((h) => h && Array.isArray(h.players)).slice(-HISTORY_MAX);
      if (raw.matchups && typeof raw.matchups === "object") {
        for (const [k, m] of Object.entries(raw.matchups)) if (m && k.includes("|")) cache.matchups[k] = { games: n(m.games), wins: n(m.wins) };
      }
    }
  } catch (err) {
    if (err.code !== "ENOENT") console.error("[charStats] อ่านไฟล์สถิติไม่สำเร็จ — เริ่มนับใหม่:", err.message);
  }
  return cache;
}

function save() {
  const file = fileOf();
  if (!file) return;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(cache, null, 2));
    fs.renameSync(tmp, file);
  } catch (err) {
    console.error("[charStats] บันทึกไฟล์สถิติไม่สำเร็จ:", err.message);
  }
}

// entries: [{ characterId, result: "win" | "loss" | "draw", name?, teamId? }] · meta: { mode, world, rounds }
function recordMatch(entries, meta = {}) {
  const list = (entries || []).filter((e) => e && e.characterId && ["win", "loss", "draw"].includes(e.result));
  if (!list.length) return false;
  const data = load();
  for (const e of list) {
    const s = data.chars[e.characterId] || (data.chars[e.characterId] = blank());
    s.picks += 1;
    if (e.result === "win") s.wins += 1;
    else if (e.result === "loss") s.losses += 1;
    else s.draws += 1;
  }
  // ตัวต่อตัว: ทุกคู่ที่อยู่คนละฝั่ง (ทีมเดียวกัน = ไม่นับ · ตัวละครเดียวกัน = ไม่นับ)
  if (meta.mode !== "moon") {
    for (const a of list) for (const b of list) {
      if (a === b || a.characterId === b.characterId || (a.teamId && a.teamId === b.teamId)) continue;
      const k = `${a.characterId}|${b.characterId}`;
      const m = data.matchups[k] || (data.matchups[k] = { games: 0, wins: 0 });
      m.games += 1;
      if (a.result === "win") m.wins += 1;
    }
  }
  data.history.push({
    at: new Date().toISOString(),
    mode: String(meta.mode || "ffa"), world: String(meta.world || "earth"), rounds: Math.max(0, Math.floor(Number(meta.rounds) || 0)),
    players: list.map((e) => ({ characterId: e.characterId, name: String(e.name || "").slice(0, 20), result: e.result, teamId: e.teamId || null })),
  });
  if (data.history.length > HISTORY_MAX) data.history.splice(0, data.history.length - HISTORY_MAX);
  save();
  return true;
}

// { chars: { [characterId]: { picks, wins, losses, draws } }, history: [ล่าสุดก่อน], matchups: { "a|b": { games, wins } } }
function snapshot() {
  const data = load();
  const chars = {};
  for (const [id, s] of Object.entries(data.chars)) chars[id] = { ...s };
  const matchups = {};
  for (const [k, m] of Object.entries(data.matchups)) matchups[k] = { ...m };
  return { chars, history: data.history.slice().reverse().map((h) => ({ ...h, players: h.players.map((p) => ({ ...p })) })), matchups };
}

// ทดสอบเท่านั้น: ล้างสถิติในหน่วยความจำ (อ่านไฟล์ใหม่ครั้งถัดไป)
function _reset() { cache = null; }

module.exports = { recordMatch, snapshot, _reset };
