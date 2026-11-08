// สถิติตัวละคร (เก็บที่เครื่อง host): จำนวนครั้งที่ถูกเลือกลงแมตช์ + ชนะ/แพ้/เสมอ ต่อ characterId
//  ไฟล์ JSON: ECHO_STATS_FILE (โปรแกรม ECHO ส่ง path ใน userData มาให้ — desktop/room.js) · ไม่ตั้ง = data/char-stats.json ข้างโปรเจกต์
//  ระหว่างรันเทสต์ (node --test ตั้ง NODE_TEST_CONTEXT) และไม่ได้ตั้ง ECHO_STATS_FILE = เก็บในหน่วยความจำอย่างเดียว ไม่เขียนไฟล์
//  บันทึกครั้งเดียวต่อแมตช์ ตอน phases/endTurn.js gameOver ตัดสินผล (match.statsRecorded กันซ้ำ — รีเซ็ทใน lobby.startMatch)
//  นับเฉพาะผู้เล่นจริง (ไม่นับยูนิตที่ถูกเรียก/บอส AI · ระบบคู่นับที่ตัวเจ้าของ) · แมตช์ที่มีผู้เล่นคนเดียว (ทดสอบ) ไม่นับ ยกเว้น Moon Cell
const fs = require("fs");
const path = require("path");

const DEFAULT_FILE = path.join(__dirname, "..", "data", "char-stats.json");
const fileOf = () => process.env.ECHO_STATS_FILE || (process.env.NODE_TEST_CONTEXT ? null : DEFAULT_FILE);

let cache = null;

function blank() { return { picks: 0, wins: 0, losses: 0, draws: 0 }; }

function load() {
  if (cache) return cache;
  cache = { version: 1, chars: {} };
  const file = fileOf();
  if (!file) return cache;
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    if (raw && raw.chars && typeof raw.chars === "object") {
      for (const [id, s] of Object.entries(raw.chars)) {
        const n = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.floor(Number(v)) : 0);
        cache.chars[id] = { picks: n(s.picks), wins: n(s.wins), losses: n(s.losses), draws: n(s.draws) };
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

// entries: [{ characterId, result: "win" | "loss" | "draw" }]
function recordMatch(entries) {
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
  save();
  return true;
}

// { [characterId]: { picks, wins, losses, draws } }
function snapshot() {
  const out = {};
  for (const [id, s] of Object.entries(load().chars)) out[id] = { ...s };
  return out;
}

// ทดสอบเท่านั้น: ล้างสถิติในหน่วยความจำ (อ่านไฟล์ใหม่ครั้งถัดไป)
function _reset() { cache = null; }

module.exports = { recordMatch, snapshot, _reset };
