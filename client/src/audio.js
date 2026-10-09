// ============================================================
//  ระบบเสียง ECHO + master volume
//  - ทุกแหล่งเสียง (เพลง/เอฟเฟกต์/วีดีโอ/ลูป) ผ่าน masterGain() ตัวเดียวกัน สัดส่วนความดังจึงคงที่ทุกตำแหน่งหลอด
//  - เพลงเล่นต่อจากจุดเดิมเฉพาะ "ในแมตช์เดียวกัน" — เริ่มเกมใหม่รีเซ็ตทั้งหมด (resetMusicPositions)
//  - เพลงสกิล/ท่าไม้ตาย: ส่ง seq มาด้วย ถ้า seq เปลี่ยน (เปิดท่าใหม่ / ถูกทับด้วยเพลงเดียวกัน
//    ของอีกคน) เพลงจะเริ่มใหม่จากต้น
// ============================================================

const FILES = {
  main_home: "/theme_song/main_home_4.0.mp3",
  // ECHO 5.1 ORDEAL CALL: main5 = ตั้งแต่เปิดโปรแกรมจนเข้าห้องรอ · lobby5 = ห้องรอ → โหวตโหมด → ฉากเปิดตัว (จนเข้าด่าน)
  main5: "/theme_song/main5.0.mp3",
  lobby5: "/theme_song/lobby5.0.mp3",
  new_morning: "/theme_song/day_4.0.mp3",    // เพลงช่วงกลางวัน
  new_night: "/theme_song/night_4.0.mp3",    // เพลงช่วงกลางคืน
  battle_phase: "/theme_song/battle_phase.mp3", // เพลงเฉพาะช่วงโจมตี — เริ่มใหม่ทุกครั้งที่เข้าช่วง
  // การเดินทาง 7 ภูมิภาค (โหมดสงครามทั่วไป): เพลงสนามแยกกลางวัน/กลางคืนต่อภูมิภาค — แทน new_morning/new_night
  //  ไฟล์ที่มีวงเล็บในชื่อ = กลางวัน · map.mp3 = เพลงระหว่างฉากแผนที่การเดินทาง
  journey_1_day: "/journey/map1/Fire Emblem Engage Faraway Holy Land (Flare).mp3",
  journey_1_night: "/journey/map1/Fire Emblem Engage Faraway Holy Land.mp3",
  journey_2_day: "/journey/map2/Fire Emblem Engage Full Bloom in the Breeze (Blossom).mp3",
  journey_2_night: "/journey/map2/Fire Emblem Engage Full Bloom in the Breeze.mp3",
  journey_3_day: "/journey/map3/Fire Emblem Engage Trial of Dawn (Heal Us).mp3",
  journey_3_night: "/journey/map3/Fire Emblem Engage Trial of Dawn.mp3",
  journey_4_day: "/journey/map4/Fire Emblem Engage Trial of the Pact (Connect Us).mp3",
  journey_4_night: "/journey/map4/Fire Emblem Engage Trial of the Pact.mp3",
  journey_5_day: "/journey/map5/Fire Emblem Engage Bright Sandstorm (Fiery).mp3",
  journey_5_night: "/journey/map5/Fire Emblem Engage Bright Sandstorm.mp3",
  journey_6_day: "/journey/map6/Fire Emblem Engage Tear Streaked (Ice).mp3",
  journey_6_night: "/journey/map6/Fire Emblem Engage Tear Streaked.mp3",
  journey_7_day: "/journey/map7/Fire Emblem Engage Distorted Flash of Light (Battle).mp3",
  journey_7_night: "/journey/map7/Fire Emblem Engage Distorted Flash of Light.mp3",
  buy_something: "/effect_sound/buy_something.mp3",
  change_cutscene: "/effect_sound/change_cutscene.mp3",
  muimi: "/overload_force/overload_force_theme.mp3",
  muimi_normal_hit: "/characters/muimi/mumi_normal_hit.mp3",
  muimi_ub_hit: "/characters/muimi/mumi_ub_hit.mp3",
  // โอเบรอน (ฤดูร้อน): เสียงตอนกดสกิลแต่ละช่อง (ส่งชื่อมากับ skillFlash)
  oberon_summer_skill1: "/characters/oberon(summer)/oberon_summer_skill1.m4a",
  oberon_summer_skill2: "/characters/oberon(summer)/oberon_summer_skill2.m4a",
  oberon_summer_skill3: "/characters/oberon(summer)/oberon_summer_skill3.m4a",
  action_button: "/effect_sound/click.mp3",
  trun_change: "/effect_sound/trun_change.wav",
  attack: "/effect_sound/attack.wav",
  notificate: "/effect_sound/notificate.mp3", // ฉากตาเดินของคนอื่น (ระบบกระดาน)
};

// เพลงที่มี intro หนึ่งครั้ง แล้วจึงเปลี่ยนเป็น theme ที่วนลูป — name → [intro, loop] (ตอนนี้ยังไม่มีเพลงที่ใช้)
const MUSIC_SEQUENCES = {};

// เพลงที่อยู่กลุ่มเดียวกัน = สลับไฟล์กันแล้ว "เล่นต่อจากตำแหน่งเดิม" (เช่นเพลงกลางวัน/กลางคืนของท่าเดียวกัน)
//  key = ชื่อเพลงใน FILES · value = ชื่อกลุ่ม — ตอนนี้ยังไม่มีเพลงที่ใช้
const MUSIC_POSITION_GROUPS = {
  // ห้ามจับเพลงต่างเพลงที่ยาวไม่เท่ากันเป็นกลุ่มเดียวกัน — ตอนสลับจะ carry ตำแหน่งข้ามมา
  //  แล้วเพลงใหม่ที่ยังไม่โหลด metadata จะมี duration = NaN -> seek เลยจุดจบเพลง = เงียบสนิท
};

// สัดส่วนผสมเสียง: เอฟเฟกต์/เสียงพากย์ต้องเด่นกว่าเพลงประกอบ (เพลงเป็นพื้นหลัง)
//  ระหว่างวีดีโอเพลงถูกพักอยู่แล้ว วีดีโอจึงเต็ม 1 ได้โดยไม่แย่งกับเพลง
//  เดิม 0.5 (-6 dB) ผู้เล่นบอกว่าเพลงเบาเกินไป -> 0.75 (-2.5 dB) เอฟเฟกต์ยังเด่นกว่าเพลงอยู่
const MUSIC_BASE = 0.75;
const SFX_BASE = 1;
const CLICK_BASE = 0.55;
const VIDEO_BASE = 1;

// ความดังต่อไฟล์ (สร้างจากการวัดจริง: RMS แบบตัดช่วงเงียบ) — ไฟล์ต้นฉบับดังไม่เท่ากันมาก (ต่างกันถึง ~30 dB)
//  เป้า: เพลง -14 · เอฟเฟกต์ -14 · วีดีโอ -16 dBFS — ลดได้อย่างเดียว (HTMLAudio ตั้ง volume เกิน 1 ไม่ได้)
//  ไฟล์ที่เบากว่าเป้ามากถูกทำให้ดังขึ้นที่ตัวไฟล์แล้ว (ต้นฉบับสำรองไว้ที่ R2 _backup_audio/)
//  ไฟล์ใหม่ที่ไม่อยู่ในตาราง = 1 (ไม่ลด) · key = path ของไฟล์ (ตรงกับ FILES / MUSIC_SEQUENCES / วีดีโอ src)
const LOUDNESS_GAIN = {
  "/characters/muimi/muimi_skill3_short.mp4": 0.88,
  "/characters/muimi/mumi_ub_hit.mp3": 0.79,
  "/item/guts_key/shockwave_boost.mp4": 0.92,
  "/overload_force/overload_force_theme.mp3": 0.53,
  // การเดินทาง (วัดด้วย Web Audio: RMS บล็อก 0.4 วิ ตัดบล็อกที่เบากว่า -50 dBFS) — ไฟล์ที่เบากว่า -14 อยู่แล้วไม่อยู่ในตาราง
  //  ⚠️ map2 กลางคืน (Full Bloom in the Breeze.mp3) เบากว่าเป้า ~5 dB — ต้องเข้ารหัสใหม่ให้ดังขึ้นที่ตัวไฟล์ถ้าต้องการให้เท่ากัน
  "/journey/map1/Fire Emblem Engage Faraway Holy Land (Flare).mp3": 0.61,
  "/journey/map2/Fire Emblem Engage Full Bloom in the Breeze (Blossom).mp3": 0.59,
  "/journey/map3/Fire Emblem Engage Trial of Dawn (Heal Us).mp3": 0.7,
  "/journey/map4/Fire Emblem Engage Trial of the Pact (Connect Us).mp3": 0.62,
  "/journey/map6/Fire Emblem Engage Tear Streaked (Ice).mp3": 0.66,
  "/journey/map6/Fire Emblem Engage Tear Streaked.mp3": 0.66,
  "/journey/map7/Fire Emblem Engage Distorted Flash of Light (Battle).mp3": 0.71,
  "/theme_song/battle_phase.mp3": 0.65,
  "/theme_song/day_4.0.mp3": 0.78,
  "/theme_song/main_home_4.0.mp3": 0.69,
  "/theme_song/main5.0.mp3": 0.85, // -11.7 LUFS
  "/theme_song/lobby5.0.mp3": 1, // -15.7 LUFS (เบากว่าเป้าเล็กน้อย ดันได้สุด 1)
};
function pathGain(path) { return LOUDNESS_GAIN[path] ?? 1; }
export function soundGain(name) { return pathGain(FILES[name]); }
const activeSfx = new Map();
const musicSuspensions = new Set();

// ปรับความดังรายเพลง (นอกเหนือจาก LOUDNESS_GAIN) ให้สมดุลกับเพลงอื่น
const MUSIC_TRACK_SCALE = {
  // การเดินทาง ภูมิภาค 2 กลางคืน: ไฟล์เบากว่าเพลงอื่น ~5 dB (-19 เทียบ -14 dBFS) — ดันขึ้นให้เท่ากัน (ชนเพดาน volume 1 เมื่อหลอดเสียงสูง)
  journey_2_night: 1.78,
};
// "หรี่เพลงหลัก" (patch 3.4.2): ระหว่างมีลูปเสียงเฉพาะกิจเล่นอยู่
//  เพลง BGM ปกติจะถูกหรี่ลงแทนที่จะหยุด เพราะเอฟเฟกต์เพลงใน App.jsx สั่งเล่นซ้ำทุกครั้งที่ state เปลี่ยน
//  (ถ้าใช้ pause จะถูกสั่ง play() กลับมาทันทีในบรอดแคสต์ถัดไป)
let musicDuck = 1;
let loopSfx = null; // ลูปเสียงเฉพาะกิจที่เล่นอยู่ (ดู startLoopSfx ท้ายไฟล์)
function musicPath(name) {
  const sequence = MUSIC_SEQUENCES[name];
  return sequence ? sequence[musicCache[name]?._echoSequenceStage || 0] : FILES[name];
}
function trackVolume(name) {
  return Math.min(1, MUSIC_BASE * pathGain(musicPath(name)) * (MUSIC_TRACK_SCALE[name] ?? 1) * masterGain() * musicDuck);
}

// ---------- master volume (จำค่าไว้ใน localStorage) ----------
let masterVolume = 0.8;
try {
  const saved = parseFloat(localStorage.getItem("echo_vol"));
  if (!Number.isNaN(saved)) masterVolume = Math.max(0, Math.min(1, saved));
} catch {}
const volListeners = new Set();

// ทุกแหล่งเสียงต้องผ่าน curve เดียวกัน ไม่งั้นสัดส่วนความดังจะเพี้ยนไปตามตำแหน่งหลอด
//  (ก่อนหน้านี้เพลง/เอฟเฟกต์คูณ masterVolume ตรงๆ แต่วีดีโอกับลูปเสียงคูณ masterVolume² —
//   ที่หลอด 0.8 เพลงได้ 0.80 แต่วีดีโอได้ 0.51 และยิ่งหรี่หลอดยิ่งถ่างออกจากกัน)
//  เลขชี้กำลัง 1.6 อยู่กึ่งกลาง: หรี่แล้วรู้สึกเปลี่ยนจริง แต่ไม่ทำให้เพลงเบาลงมากเหมือนยกกำลังสอง
export function masterGain() { return Math.pow(masterVolume, 1.6); }

export function getMasterVolume() { return masterVolume; }
export function videoVolume(src) { return VIDEO_BASE * pathGain(src) * masterGain(); } // ให้ <video> ใช้ (ผ่าน curve เดียวกัน)
export function onVolumeChange(fn) { volListeners.add(fn); return () => volListeners.delete(fn); }
export function setMasterVolume(v) {
  masterVolume = Math.max(0, Math.min(1, v));
  try { localStorage.setItem("echo_vol", String(masterVolume)); } catch {}
  if (currentMusic) getMusic(currentMusic).volume = trackVolume(currentMusic);
  if (loopSfx) loopSfx.volume = loopVolume(loopSfx._echoName); // ลูปเสียงเฉพาะกิจต้องตามหลอดเสียงด้วย
  for (const [a, base] of activeSfx) a.volume = base * masterGain();
  volListeners.forEach((fn) => fn(masterVolume));
}

let currentMusic = null;
// seq ล่าสุด "ต่อเพลง" (ไม่ใช่ต่อการสลับเพลง): จำไว้แม้เพลงถูกพัก/สลับออก
// -> กลับมาเล่นเพลงเดิมด้วย seq เดิม (เช่น หลังจบ cutscene ของคนอื่น) = เล่นต่อจากจุดเดิม ไม่เริ่มใหม่
// -> seq ใหม่ (เปิดท่าครั้งใหม่ / คนอื่นเปิดท่าเพลงเดียวกันทับ) = เริ่มจากต้น
const musicSeq = {};
const musicCache = {};
function getMusic(name) {
  if (!musicCache[name]) {
    const sequence = MUSIC_SEQUENCES[name];
    const a = new Audio(sequence ? sequence[0] : FILES[name]);
    a.loop = !sequence;
    a._echoSequenceStage = 0;
    a.addEventListener("playing", () => {
      // A delayed play() must not revive a track after a cutscene or another song took over.
      if (currentMusic !== name || musicSuspensions.size) a.pause();
    });
    if (sequence) {
      a.addEventListener("ended", () => {
        if (currentMusic !== name || musicSuspensions.size) return;
        a._echoSequenceStage = 1;
        a.src = sequence[1];
        a.loop = true;
        a.currentTime = 0;
        a.volume = trackVolume(name); // ไฟล์ช่วงถัดไปดังไม่เท่าไฟล์แรก
        playCurrentMusic(name, a);
      });
    }
    musicCache[name] = a;
  }
  musicCache[name].volume = trackVolume(name);
  return musicCache[name];
}

function playCurrentMusic(name, a) {
  if (musicSuspensions.size || currentMusic !== name) return;
  applyHandoff(name, a);
  a.play().then(() => {
    if (musicSuspensions.size || currentMusic !== name) a.pause();
  }).catch(() => armUnlock());
}
// เบราว์เซอร์ที่ยังไม่ให้เล่นเสียงเอง (ไม่ใช่โปรแกรม ECHO) -> ลองเล่นเพลงปัจจุบันอีกครั้งเมื่อผู้เล่นแตะจอครั้งแรก
let unlockArmed = false;
function armUnlock() {
  if (unlockArmed || typeof document === "undefined") return;
  unlockArmed = true;
  const retry = () => {
    unlockArmed = false;
    document.removeEventListener("pointerdown", retry, true);
    document.removeEventListener("keydown", retry, true);
    if (currentMusic) playCurrentMusic(currentMusic, getMusic(currentMusic));
  };
  document.addEventListener("pointerdown", retry, true);
  document.addEventListener("keydown", retry, true);
}
// เพลงต่อจากหน้าแรกของโปรแกรม: launcher ส่ง #music=main5&mt=<วินาที> มากับ URL ของห้อง
//  -> เพลงเดียวกันเล่นต่อจากจุดเดิมแทนที่จะเริ่มใหม่ (ใช้ครั้งเดียว แล้วล้าง hash ทิ้ง)
//  &vol=<0..1> = ระดับเสียงที่ตั้งไว้ในหน้าแรก → หน้าเกมเริ่มที่ระดับเดียวกัน (localStorage แยกตาม origin ของห้อง)
let handoff = null;
try {
  const h = new URLSearchParams((typeof location !== "undefined" && location.hash || "").slice(1));
  const t = parseFloat(h.get("mt"));
  if (h.get("music") && Number.isFinite(t)) handoff = { name: h.get("music"), t };
  const vol = h.has("vol") ? parseFloat(h.get("vol")) : NaN;
  if (Number.isFinite(vol) && vol >= 0 && vol <= 1) setMasterVolume(vol);
  if (h.has("mt") || h.has("vol")) history.replaceState(null, "", location.pathname + location.search);
} catch { /* ไม่มี location (เทสต์) */ }
function applyHandoff(name, a) {
  if (!handoff || handoff.name !== name) return;
  const t = handoff.t; handoff = null;
  const seek = () => { try { a.currentTime = a.duration && isFinite(a.duration) ? t % a.duration : t; } catch { /* ยังไม่มี metadata */ } };
  if (a.readyState >= 1) seek(); else a.addEventListener("loadedmetadata", seek, { once: true });
}

// Foreground video/voice owns the audio until its component releases this lease.
export function suspendMusic() {
  const token = {};
  musicSuspensions.add(token);
  for (const a of Object.values(musicCache)) a.pause();
  return () => {
    if (!musicSuspensions.delete(token)) return;
    if (!musicSuspensions.size && currentMusic) playMusic(currentMusic);
  };
}

// seq: identity ของการเปิดเพลงสกิล — เปิดท่าใหม่/คนใหม่ทับเพลงเดิม = seq ใหม่ -> เริ่มจากต้น
// เพลงทั่วไป (main_home) ไม่ส่ง seq -> เล่นต่อจากจุดเดิม (เฉพาะในแมตช์)
export function playMusic(name, seq) {
  if (!FILES[name]) return;
  const a = getMusic(name);
  // สลับเพลงภายในกลุ่มเดียวกัน (MUSIC_POSITION_GROUPS): จำตำแหน่งเพลงเดิมไว้เล่นต่อ
  const group = MUSIC_POSITION_GROUPS[name];
  let carryPos = null;
  if (group && currentMusic && currentMusic !== name && MUSIC_POSITION_GROUPS[currentMusic] === group) {
    const prev = getMusic(currentMusic);
    carryPos = prev.currentTime || 0;
  }
  // seq เดิมของเพลงนี้ (จำข้ามการพัก/สลับเพลง) — เปลี่ยนเมื่อไหร่ค่อยเริ่มเพลงใหม่จากต้น
  const isNewSeq = seq != null && seq !== musicSeq[name];
  if (isNewSeq) {
    musicSeq[name] = seq;
    const sequence = MUSIC_SEQUENCES[name];
    if (sequence && a._echoSequenceStage !== 0) {
      a.src = sequence[0];
      a.loop = false;
      a._echoSequenceStage = 0;
    }
    a.currentTime = 0; // การเปิดร่างครั้งใหม่ (กดใหม่/โดนคนอื่นทับ) -> เริ่มจากต้น
  }
  if (carryPos != null) {
    // เพลงใหม่อาจสั้นกว่าเพลงเดิม -> วนตำแหน่งด้วย modulo (ยังไม่รู้ความยาว = ใส่ตรงๆ แล้วปล่อยให้เบราว์เซอร์ clamp)
    const dur = a.duration;
    try { a.currentTime = dur && isFinite(dur) && dur > 0 ? carryPos % dur : carryPos; } catch { /* metadata ยังไม่มา */ }
  }
  const changed = currentMusic !== name;
  currentMusic = name;
  stopMusicExcept(name);
  if (changed || isNewSeq || a.paused) playCurrentMusic(name, a);
}
// หยุดทุกแทร็กยกเว้นตัวที่ระบุ — ตาข่ายกันเพลงซ้อน
//  playMusic พักเฉพาะแทร็กที่ currentMusic ชี้อยู่ ถ้าตัวแปรนั้นหลุดซิงก์เมื่อไหร่
//  (เช่นมีอะไรสั่งเล่นข้ามทาง หรือ effect ทำงานสลับกันหลายตัว) จะมีแทร็กเก่าค้างเล่นอยู่เงียบ ๆ
//  เรียกตัวนี้ก่อนเปลี่ยนเพลงจะการันตีว่าเหลือเสียงเดียวจริง ๆ
export function stopMusicExcept(keep) {
  for (const [name, a] of Object.entries(musicCache)) {
    if (name === keep) continue;
    if (!a.paused) a.pause();
  }
  if (currentMusic !== keep) currentMusic = musicCache[keep] ? keep : null;
}
export function stopMusic() {
  stopMusicExcept(null);
}
// เริ่มเกมใหม่ / จบแมตช์: รีเซ็ตตำแหน่งเพลงทุกเพลง -> ครั้งถัดไปเริ่มจากต้นทั้งหมด
export function resetMusicPositions() {
  stopLoopSfx();
  for (const [name, a] of Object.entries(musicCache)) {
    a.pause();
    const sequence = MUSIC_SEQUENCES[name];
    if (sequence) {
      a.src = sequence[0];
      a.loop = false;
      a._echoSequenceStage = 0;
    }
    a.currentTime = 0;
  }
  for (const k of Object.keys(musicSeq)) delete musicSeq[k];
  currentMusic = null;
}
// สร้าง <audio> ใหม่ทุกครั้งที่เล่น = ต้องต่อ resource + ถอดรหัสเสียงใหม่ทุกครั้ง
//  เสียงคลิกดังแทบทุกการกด จึงเห็นเป็นอาการกระตุกสะสม -> เก็บ element ที่เล่นจบแล้วไว้ใช้ซ้ำ
const sfxPool = new Map(); // ชื่อเสียง -> element ที่ว่างอยู่
const POOL_PER_SOUND = 4;  // เสียงเดียวกันซ้อนกันเกินนี้แทบไม่เกิด — ที่เกินปล่อยให้ GC เก็บ
let playSeq = 0;

function takeVoice(name) {
  const idle = sfxPool.get(name);
  if (idle && idle.length) {
    const a = idle.pop();
    a._echoIdle = false;
    try { a.currentTime = 0; } catch { /* ยังโหลดไม่เสร็จ: เล่นจากต้นอยู่แล้ว */ }
    return a;
  }
  const a = new Audio(FILES[name]);
  a.preload = "auto";
  const release = () => {
    activeSfx.delete(a);
    if (a._echoIdle) return; // ปล่อยคืนไปแล้ว (ended กับ pause ยิงต่อกันได้)
    a._echoIdle = true;
    const pool = sfxPool.get(name);
    if (!pool) sfxPool.set(name, [a]);
    else if (pool.length < POOL_PER_SOUND) pool.push(a);
  };
  a.addEventListener("ended", release);
  a.addEventListener("pause", release);
  a.addEventListener("error", release);
  return a;
}

// โหลดเสียงที่ใช้บ่อยไว้ล่วงหน้า — ครั้งแรกที่เล่นคือครั้งที่กระตุกที่สุด (ต่อเน็ต + ถอดรหัส)
export function prewarmSfx(names) {
  for (const name of names) {
    if (!FILES[name] || sfxPool.has(name)) continue;
    const a = takeVoice(name);
    a._echoIdle = true;
    sfxPool.set(name, [a]);
    try { a.load(); } catch { /* เบราว์เซอร์บางตัวห้ามโหลดก่อนมี gesture */ }
  }
}

// คืน element ที่เล่นอยู่ ให้ผู้เรียกหยุดเองได้ (เช่น เพลงประกอบคัตซีนที่ต้องหยุดตอนฉากจบ)
export function playSfx(name) {
  if (!FILES[name]) return null;
  const a = takeVoice(name);
  const base = name === "action_button" ? CLICK_BASE : SFX_BASE * soundGain(name);
  a.volume = base * masterGain();
  a._echoPlay = ++playSeq;
  activeSfx.set(a, base);
  a.play().then(() => { if (!activeSfx.has(a)) a.pause(); }).catch(() => {
    activeSfx.delete(a);
  });
  return a;
}
// playId: กันสั่งหยุด element ที่ถูกรีไซเคิลไปใช้กับเสียงอื่นแล้ว (ดู sfxPlayId)
export function stopSfx(a, playId) {
  if (!a) return;
  if (playId !== undefined && a._echoPlay !== playId) return;
  activeSfx.delete(a);
  a.pause();
}
export function sfxPlayId(a) { return a ? a._echoPlay : undefined; }
// เสียงคลิก (click.mp3) — กันเล่นซ้อน: ตัวดักทั้งหน้า (installClickSound) กับโค้ดที่เรียกเองในจังหวะเดียวกันจะดังครั้งเดียว
let lastClickAt = 0;
export function clickSound() {
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (now - lastClickAt < 90) return;
  lastClickAt = now;
  playSfx("action_button");
}
// ทุกการกด (ปุ่ม/ลิงก์/สวิตช์/ป้ายบนลูกโลก) มีเสียงคลิกเสมอ — ปุ่มธีมใหม่ไม่ต้องเรียก clickSound เอง
//  การกดบนลูกโลก (canvas) ไม่ใช่ element พวกนี้ — หน้าจอต้องเรียก clickSound() เองตอนเลือกของบนโลก
//  ไม่อยากให้ดัง: ใส่ data-no-click-sound ที่ element หรือบรรพบุรุษ
const CLICKABLE = 'button, a[href], [role="button"], input[type="checkbox"], input[type="radio"], select, summary, label[for], .oc-tag, [data-click-sound]';
export function installClickSound(root = typeof document !== "undefined" ? document : null) {
  if (!root) return () => {};
  const onClick = (e) => {
    const el = e.target instanceof Element ? e.target.closest(CLICKABLE) : null;
    if (!el || el.disabled || el.getAttribute("aria-disabled") === "true" || el.closest("[data-no-click-sound]")) return;
    clickSound();
  };
  root.addEventListener("click", onClick, true);
  return () => root.removeEventListener("click", onClick, true);
}

// ---------- ลูปเสียงเฉพาะกิจ (ช่องอิสระ ไม่ยุ่งกับ BGM หลัก) ----------
//  ใช้กับเสียงที่ต้องเล่น "ตราบใดที่ UI ฝั่งเราเปิดอยู่" เท่านั้น — ไม่ได้ผูกกับ state ของ server
//  ระหว่างเล่น เพลงหลักจะถูกหรี่ลงเหลือ DUCK_LEVEL แทนการหยุด — ดูคอมเมนต์ที่ musicDuck
const DUCK_LEVEL = 0.25;
// ลูปเสียงเฉพาะกิจทำหน้าที่แทนเพลงประกอบ -> ใช้ระดับเดียวกับเพลง
function loopVolume(name) { return MUSIC_BASE * soundGain(name) * masterGain(); }
export function startLoopSfx(name) {
  if (!FILES[name]) return null;
  stopLoopSfx();
  const a = new Audio(FILES[name]);
  a.loop = true;
  a._echoName = name;
  a.volume = loopVolume(name);
  loopSfx = a;
  musicDuck = DUCK_LEVEL;
  if (currentMusic) getMusic(currentMusic).volume = trackVolume(currentMusic);
  const release = () => { if (loopSfx === a) stopLoopSfx(); };
  a.addEventListener("error", release);
  a.play().then(() => { if (loopSfx !== a) a.pause(); }).catch(release);
  return a;
}
export function stopLoopSfx() {
  if (!loopSfx) return;
  try { loopSfx.pause(); loopSfx.currentTime = 0; } catch { /* element อาจถูกทิ้งไปแล้ว */ }
  loopSfx = null;
  musicDuck = 1;
  if (currentMusic) getMusic(currentMusic).volume = trackVolume(currentMusic);
}

function resumeCurrent() {
  if (currentMusic) {
    const a = getMusic(currentMusic);
    if (a.paused) playCurrentMusic(currentMusic, a);
  }
}
if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", resumeCurrent);
  window.addEventListener("keydown", resumeCurrent);
}

// Start a foreground clip and restore sound on the next gesture if autoplay required muting.
// Cleanup prevents a rejected play promise from restarting a clip that has already unmounted.
export function playCutsceneVideo(video) {
  const releaseMusic = suspendMusic();
  let disposed = false;
  let awaitingGesture = false;
  const updateVolume = () => { video.volume = videoVolume(video.getAttribute("src")); };
  updateVolume();
  video.currentTime = 0;
  video.muted = false;
  const play = () => video.play().then(() => {
    if (disposed) video.pause();
  });
  const restoreSound = () => {
    if (disposed || !awaitingGesture) return;
    video.muted = false;
    awaitingGesture = false;
    play().catch(() => { if (!disposed) { video.muted = true; awaitingGesture = true; } });
  };
  if (typeof window !== "undefined") {
    window.addEventListener("pointerdown", restoreSound);
    window.addEventListener("keydown", restoreSound);
  }
  play().catch((error) => {
    if (disposed || error?.name !== "NotAllowedError") return;
    video.muted = true;
    awaitingGesture = true;
    play().catch(() => {});
  });
  const unsubscribe = onVolumeChange(updateVolume);
  return () => {
    disposed = true;
    video.pause();
    unsubscribe();
    if (typeof window !== "undefined") {
      window.removeEventListener("pointerdown", restoreSound);
      window.removeEventListener("keydown", restoreSound);
    }
    releaseMusic();
  };
}
