// Shared music priorities for every mode.
// ECHO 5.1: main5 เล่นเฉพาะใน launcher ของโปรแกรม · เข้าห้องแล้ว (เลือกลำดับ/ตัวละคร/ห้องรอ/โหวตโหมด/จัดทีม + ฉากเปิดตัวแมตช์) = lobby5 จนเข้าด่าน
export function musicForState(state, { lowQ = false, cycleSeq = 0, attackSeq = 0, intro = false } = {}) {
  const phase = state?.gameState;
  if (!phase) return { name: "lobby5" };
  if (["LOBBY", "TEAM_MODE", "TEAM_SETUP"].includes(phase)) return { name: "lobby5" };
  if (intro) return { name: "lobby5" };
  const cs = phase === "CUTSCENE" ? state.cutscene : null;
  const mandatory = cs?.kind === "overloadForce";
  if (cs && (!lowQ || mandatory || cs.announce)) return { name: null };
  // การเดินทาง: ฉากเปลี่ยนภูมิภาค (ลูกโลก) ไม่มีเพลงของตัวเอง — state.journey เป็นภูมิภาคปลายทางแล้ว
  //  เพลงประจำภูมิภาคใหม่จึงเริ่มตั้งแต่ฉากเริ่ม (App ขยับ cycleSeq เมื่อภูมิภาค/ช่วงเวลาเปลี่ยน)
  const journey = state?.journey;
  if (state?.skillMusic) return { name: state.skillMusic, seq: state.skillMusicSeq };
  // ช่วงโจมตี: เพลงเฉพาะกิจทับเพลงกลางวัน/กลางคืน และเริ่มจากต้นทุกครั้งที่เข้าช่วง (attackSeq ขยับ)
  if (phase === "ATTACK" || phase === "ATTACKING") return { name: "battle_phase", seq: attackSeq };
  if (["PLAYING", "SUMMARY", "ATTACK", "ATTACKING", "TRANSITION", "CUTSCENE"].includes(phase)) {
    // การเดินทาง (ffa/duo/trio): เพลงประจำภูมิภาค แยกกลางวัน/กลางคืน
    if (journey) return { name: `journey_${journey.area}_${journey.night ? "night" : "day"}`, seq: cycleSeq };
    return { name: state.cycle === "night" ? "new_night" : "new_morning", seq: cycleSeq };
  }
  return { name: "main_home" };
}

// เฟสที่นับว่า "อยู่ในแมตช์" — ข้ามขอบนี้เมื่อไหร่ App รีเซ็ตตำแหน่งเพลงทั้งหมด (เพลงเริ่มจากต้น)
export function isMatchPhase(phase) {
  return ["PLAYING", "SUMMARY", "ATTACK", "ATTACKING", "TRANSITION", "CUTSCENE"].includes(phase);
}

// Cutscenes can sit between drawing and summary; attack IDs can change without a phase change.
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
    const roundEnded = phase === "SUMMARY" && drawing && lastSummary !== state.roundNumber;
    if (roundEnded) { lastSummary = state.roundNumber; drawing = false; }
    const attack = phase === "ATTACKING" && state.attack && state.attack.id !== lastAttack;
    if (attack) lastAttack = state.attack.id;
    return { roundEnded, attack: !!attack };
  };
}
