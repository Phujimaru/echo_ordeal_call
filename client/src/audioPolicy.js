// Shared music priorities for every mode.
// ECHO 5.1: main5 เล่นเฉพาะใน launcher ของโปรแกรม · เข้าห้องแล้ว (เลือกลำดับ/ตัวละคร/ห้องรอ/โหวตโหมด/จัดทีม + ฉากเปิดตัวแมตช์) = lobby5 จนเข้าด่าน
export function musicForState(state, { lowQ = false, cycleSeq = 0, attackSeq = 0, intro = false, fodlanMap = false, rtFiles = null } = {}) {
  const phase = state?.gameState;
  if (!phase) return { name: "lobby5" };
  if (["LOBBY", "TEAM_MODE", "TEAM_SETUP"].includes(phase)) return { name: "lobby5" };
  // Road Trip (GRID_PLAN §8.8): ช่วงขับ = วิทยุรถตู้คุมเพลงเอง (เพลงหลักเงียบ) · จุดพัก/ต่อสู้/บอส/จบ = roadtripMusic
  //  ไฟล์ไม่มี → { name: null, rtSynth } ให้ App สั่งเพลงสังเคราะห์ (roadtrip/radio.js setBed) · คลิปวีดีโอ = เงียบ · ท่าไม้ตายมีเพลง = ทับได้เฉพาะตอนต่อสู้
  if (state?.gameMode === "roadtrip" && state?.roadtrip) {
    const cs = phase === "CUTSCENE" ? state.cutscene : null;
    if (cs && (!lowQ || cs.announce)) return { name: null };
    if (state.roadtrip.phase === "combat" && state.skillMusic) return { name: state.skillMusic, seq: state.skillMusicSeq };
    return roadtripMusic(state.roadtrip, rtFiles);
  }
  // Fodlan (GRID_PLAN §8.5): ฉากเปิดแมตช์ — การ์ด/ลูกโลกหมุนดิ่ง = เพลงห้องรอเดิม · เห็นแผนที่ทวีปแล้ว (fodlanMap) = เพลงฉากแผนที่ (ผู้ใช้สั่ง)
  // Nautilus (§8.9): ฉากเปิดยืมฉาก Fodlan แต่ไม่มีเพลงแผนที่ — ห้องรอเงียบลงตอนเห็นแผนที่ (ชั้น 1 ไม่มีเพลง)
  if (intro) return { name: state?.world === "eos" ? "eos_intro" : state?.world === "nautilus" && fodlanMap ? null : state?.fodlan && fodlanMap ? "fodlan_map" : "lobby5" }; // Eos: ฉากเปิด = Somnus
  if (phase === "GAMEOVER" && state?.world === "eos") return { name: "eos_end" }; // Eos: หน้าจบเกม = Omnis Lacrima
  const cs = phase === "CUTSCENE" ? state.cutscene : null;
  if (cs && (!lowQ || cs.announce)) return { name: null };
  // การเดินทาง: ฉากเปลี่ยนภูมิภาค (ลูกโลก) ไม่มีเพลงของตัวเอง — state.journey เป็นภูมิภาคปลายทางแล้ว
  //  เพลงประจำภูมิภาคใหม่จึงเริ่มตั้งแต่ฉากเริ่ม (App ขยับ cycleSeq เมื่อภูมิภาค/ช่วงเวลาเปลี่ยน)
  const journey = state?.journey;
  // สนาม Colony (GRID_PLAN §8.3): นับถอยหลังระเบิดตัวเอง = colony_alert ทับทุกเพลง · ก่อนนั้นเพลงตามปล้องที่กำลังจะปิด (I/II/III) — เพลงท่าไม้ตายทับได้
  const colony = state?.colony;
  if (colony && isMatchPhase(phase) && colony.countdown != null) return { name: "colony_alert" };
  if (colony && isMatchPhase(phase) && !state?.skillMusic) return { name: `colony_${Math.min(3, Math.max(0, colony.sealed | 0) + 1)}` };
  // Moon Cell (GRID_PLAN §8.4): เพลงธีมของผู้ใช้ตลอดแมตช์ — เพลงท่าไม้ตายทับได้
  if (state?.moon && isMatchPhase(phase) && !state?.skillMusic) return { name: "moon_theme" };
  // Fodlan: ฉากเปลี่ยนแผนที่ = เพลงฉากแผนที่ · บนกระดาน = เพลงประจำด่าน (สภาพอากาศ = เพลงอีกแบบของด่านนั้น) — เพลงท่าไม้ตายทับได้
  //  Eos (§8.6) ใช้ state.fodlan ร่วม แต่มีเพลงของตัวเอง (eos/eosAudio.js setMusic — App.jsx เลือกตาม state) → เพลงหลักเงียบ · เพลงท่าไม้ตายยังทับได้
  if (state?.world === "eos" && state?.fodlan?.board && isMatchPhase(phase) && !state?.skillMusic) return { name: null };
  // Nautilus (GRID_PLAN §8.9 · ผู้ใช้สั่ง 2026-11-19): ชั้น 1–4 ไม่มีเพลง (เสียงบรรยากาศใต้น้ำจาก fodlanAudio) · ทาลัสซาอยู่ (state.fodlan.board.whale · ขั้น 2)
  //  = nautilus_whale ทับเฉพาะชั้น 1–4 · ชั้น 5 = nautilus_abyss ตลอดจนจบเกม (ปลาวาฬโผล่ก็ไม่เปลี่ยน) · ปิดทาลัสซาในโหวต (whaleEnabled false) = ไม่มีเพลงปลาวาฬ
  //  ฉากเปลี่ยนชั้นไม่มีเพลงของตัวเอง (ใช้เพลงของชั้นปลายทาง) · เพลงท่าไม้ตายทับได้
  if (state?.world === "nautilus" && state?.fodlan && isMatchPhase(phase) && !state?.skillMusic) return { name: nautilusMusic(state.fodlan) };
  const fodlan = state?.world === "eos" || state?.world === "nautilus" ? null : state?.fodlan;
  if (fodlan && isMatchPhase(phase)) {
    if (fodlan.scene?.active) return { name: "fodlan_map" };
    if (!state?.skillMusic) return { name: `fodlan_${fodlan.stage}${fodlan.weather ? "_wx" : ""}` };
  }
  if (state?.skillMusic) return { name: state.skillMusic, seq: state.skillMusicSeq };
  // ระบบกระดาน: ทุกคนได้ตีในตาของตัวเอง — ฉากตี (ATTACKING) ไม่สลับไปเพลงช่วงโจมตีแล้ว (สลับไปมาทุกตา = รก)
  if (isMatchPhase(phase)) {
    // การเดินทาง (ffa/duo/trio): เพลงประจำภูมิภาค แยกกลางวัน/กลางคืน
    if (journey) return { name: `journey_${journey.area}_${journey.night ? "night" : "day"}`, seq: cycleSeq };
    return { name: state.cycle === "night" ? "new_night" : "new_morning", seq: cycleSeq };
  }
  return { name: "main_home" };
}

// Road Trip: เพลงตามเฟส — คืน { name: "rt_<ไฟล์>" } ถ้ามีไฟล์ · ไม่มี = { name: null, rtSynth: "<ลูปสังเคราะห์>" } · ช่วงขับ = { name: null, radio: true }
//  files = Set ของคีย์ไฟล์ที่มีจริง (roadtrip/radio.js probeMusicFiles) · ลำดับในรายการ = ไฟล์ที่ลองก่อน (ตัวสำรองตามที่ผู้ใช้กำหนด)
export function roadtripMusic(rt, files) {
  const has = (k) => !!files && typeof files.has === "function" && files.has(k);
  const night = !!rt.night;
  let list = null;
  if (rt.phase === "over") list = ["over"];
  else if (rt.phase === "stop") list = rt.stop && rt.stop.kind === "motel" ? ["motel", night ? "stop_night" : "stop_day"] : rt.stop && rt.stop.kind === "camp" ? ["stop_night", "motel"] : [night ? "stop_night" : "stop_day"]; // แคมป์ = เพลงกลางคืน (ใช้ไฟล์เดิม — ผู้ใช้สั่ง 2026-11-14 ไม่โหลดใหม่)

  else if (rt.phase === "combat") {
    const kind = rt.combat && rt.combat.kind;
    const base = night ? "combat_night" : "combat_day";
    list = kind === "boss" ? [...(rt.combat && rt.combat.boss ? [`boss_${rt.combat.boss}`] : []), "boss"] : kind === "onvan" ? ["onvan", base] : [base];
  } else if (rt.phase === "intro") {
    if (has("intro")) return { name: "rt_intro" };
    return { name: null, radio: true };
  } else return { name: null, radio: true };
  const hit = list.find(has);
  if (hit) return { name: `rt_${hit}` };
  return { name: null, rtSynth: list[list.length - 1] };
}

// เฟสที่นับว่า "อยู่ในแมตช์" — ข้ามขอบนี้เมื่อไหร่ App รีเซ็ตตำแหน่งเพลงทั้งหมด (เพลงเริ่มจากต้น)
export function isMatchPhase(phase) {
  return ["PLAYING", "ORDER", "ACTION", "ATTACKING", "TRANSITION", "CUTSCENE"].includes(phase);
}

// Cutscenes can sit between drawing and the turn order; attack IDs can change without a phase change.
export function createPhaseSoundTracker() {
  let drawing = false;
  let lastSummary = null;
  let lastAttack = null;
  return (state) => {
    const phase = state?.gameState;
    if (!phase || ["LOBBY", "TEAM_MODE", "TEAM_SETUP", "GAMEOVER"].includes(phase)) {
      drawing = false; lastSummary = null; lastAttack = null;
    }
    if (phase === "PLAYING") drawing = true;
    // จบช่วงจั่ว = เข้า ORDER (แบนเนอร์ลำดับเดิน)
    const roundEnded = phase === "ORDER" && drawing && lastSummary !== state.roundNumber;
    if (roundEnded) { lastSummary = state.roundNumber; drawing = false; }
    const attack = phase === "ATTACKING" && state.attack && state.attack.id !== lastAttack;
    if (attack) lastAttack = state.attack.id;
    return { roundEnded, attack: !!attack };
  };
}

// Nautilus (GRID_PLAN §8.9): เพลงตามชั้น — ด่าน 11 (ชั้นสุดท้าย) = nautilus_abyss เสมอ · ชั้น 7–10 = nautilus_whale เฉพาะตอนทาลัสซาอยู่ (board.whale · ปิดในโหวต = ไม่มี) · ไม่งั้นเงียบ
//  (ไฟล์นี้ห้าม import — tests/audio-policy.test.js โหลดผ่าน vm)
//  แก้ 2026-11-19 (ผู้ใช้ส่งเพลงครบ): ชั้น 7–10 มีเพลงประจำชั้น nautilus_layer_N (เบากว่าเสียงบรรยากาศ) · ปลาวาฬอยู่ = nautilus_whale ทับ
//  board.whale = ข้อมูลปลาวาฬ { on, … } (ขั้น 2) หรือ true (ขั้น 1) — นับว่าอยู่เมื่อ on
export function nautilusMusic(fd) {
  if (!fd) return null;
  const stage = Number(fd.stage);
  //  แก้ 2026-11-19 (ผู้ใช้): ชั้น 5 (ด่าน 11) = เพลงใหม่ nautilus_layer_11 + ปลาวาฬอยู่ = เพลงปลาวาฬทับ · "Genjitsu" ย้ายไปชั้น 6 ทะเลข้อมูล (ด่าน 12) วนตลอด
  if (stage === 12) return "nautilus_abyss";
  const w = fd.board && fd.board.whale;
  if (fd.whaleEnabled !== false && (w === true || (w && w.on))) return "nautilus_whale";
  return stage >= 7 && stage <= 11 ? `nautilus_layer_${stage}` : null;
}
