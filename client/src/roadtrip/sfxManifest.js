// Road Trip — รายการเสียงเอฟเฟกต์/บรรยากาศ (client/public/roadtrip/sfx · สร้างด้วย .claude/plans/roadtrip-sfx.py · แหล่งที่มา .claude/plans/roadtrip-sfx-sources.md)
//  one-shot ปรับดัง −16 LUFS · ลูป (RT_LOOPS) −22 LUFS วนต่อเนื่องไร้รอยต่อ — เล่นลูปผ่าน Web Audio (AudioBufferSourceNode.loop) จะไม่มีช่องว่างตอนวน
//  engine_loop ยาว 4 วิ ไว้ปรับ playbackRate ตามความเร็วรถ · RT_GAIN = dB ที่บวกเพิ่มตอนเล่น (0 = ตามไฟล์)
const P = "/roadtrip/sfx/";

const NAMES = [
  // ลูป
  "amb_road", "amb_wind", "amb_day_birds", "amb_forest", "amb_desert", "amb_snow", "amb_night", "amb_ghost",
  "amb_station", "amb_station_night", "amb_motel", "wash_loop", "engine_loop",
  // one-shot
  "horn", "horn_goofy", "tire_screech", "crash", "hazard_hit", "nitro", "gear", "van_door", "sliding_door", "rear_doors",
  "brake_stop", "alert", "boss_alarm", "fork_chime", "event_sting", "victory", "pump_beep", "fuel_fill", "shop_chime",
  "cash", "toilet_flush", "teleport", "dog_bark", "claw", "gacha", "arcade", "splash", "ferris_creak", "sizzle",
  "crowd_cheer", "upgrade", "wrench", "paint_spray", "coin", "km_tick", "region_enter", "ghost_whisper", "turret_fire",
];

export const RT_SFX = Object.fromEntries(NAMES.map((n) => [n, `${P}${n}.mp3`]));

export const RT_LOOPS = [
  "amb_road", "amb_wind", "amb_day_birds", "amb_forest", "amb_desert", "amb_snow", "amb_night", "amb_ghost",
  "amb_station", "amb_station_night", "amb_motel", "wash_loop", "engine_loop",
];

const GAIN = {
  // ลูปเป็นพื้นหลัง — วางใต้เพลง/เสียงเอฟเฟกต์
  amb_road: -4, amb_wind: -6, amb_day_birds: -4, amb_forest: -4, amb_desert: -4, amb_snow: -4, amb_night: -4,
  amb_ghost: -3, amb_station: -4, amb_station_night: -4, amb_motel: -4, wash_loop: -2, engine_loop: -6,
  // one-shot ที่ติดเพดานพีค (เบากว่า −16 LUFS) ชดเชยเล็กน้อย
  van_door: 3, alert: 2, sizzle: 2,
  // เสียงที่เกิดบ่อย ลดลง
  coin: -3, pump_beep: -3, gear: -3, hazard_hit: -2,
};

// ทุกชื่อมีค่า (ไม่ได้ระบุ = 0 dB)
export const RT_GAIN = Object.fromEntries(NAMES.map((n) => [n, GAIN[n] ?? 0]));
