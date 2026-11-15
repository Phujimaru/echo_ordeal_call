// ============================================================
//  ภาพของสนาม Eos — เสียง + ฉากตอนเหตุการณ์ (playFx) · สายฟ้า
//  แยกออกจาก ./stage6.js (ย้ายโค้ดล้วน · พฤติกรรมเดิม) · stage6.js ยังส่งออกชื่อเดิมครบ
//  ⚠️ ห้ามเรียกของจาก ./index ตอนโหลดไฟล์ (index import stage6 — วน) · ใช้ได้ในฟังก์ชันวาดเท่านั้น
// ============================================================
import { rng } from "../boardGeo";
import { eosAudio } from "../../eos/eosAudio";
import { fx } from "./eosBase";
import { trainAtX } from "./eosCamp";

// =================================================================== air (ทับตัวละคร)
export function sfx(key, opt) { try { eosAudio().sfx(key, opt); } catch { /* ไม่มีเสียง */ } }
export function bolt(g, x0, y0, x1, y1, seed, w, a) {
  const R = rng(seed * 97 + 5), n = 9, pts = [[x0, y0]];
  for (let i = 1; i < n; i++) { const k = i / n; pts.push([x0 + (x1 - x0) * k + (R() - 0.5) * 34 * (1 - k * 0.5), y0 + (y1 - y0) * k]); }
  pts.push([x1, y1]);
  const path = () => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); };
  g.lineJoin = "round";
  path(); g.strokeStyle = `rgba(150,190,255,${0.45 * a})`; g.lineWidth = w * 3.2; g.stroke();
  path(); g.strokeStyle = `rgba(245,250,255,${a})`; g.lineWidth = w; g.stroke();
}
let THUNDER_AT = 0;
export function playFx(e) {
  switch (e.kind) {
    case "lightning": if (performance.now() - THUNDER_AT > 350) { THUNDER_AT = performance.now(); sfx("wx_lightning_strike", { gain: 0.9 }); } break;
    case "car_drive": sfx("car_start", { gain: 0.6 }); sfx("car_drive", { delay: 0.15 }); if (e.hits && e.hits.length) sfx("car_hit", { delay: 0.45 }); break;
    case "car_mount": sfx("car_door"); sfx("car_start", { delay: 0.35, gain: 0.7 }); break;
    case "car_leave": sfx("car_door"); break;
    case "car_ram": sfx("car_drive", { gain: 0.7 }); sfx("car_hit", { delay: 0.18 }); break;
    case "choco_mount": sfx("chocobo_call"); sfx("chocobo_wings", { delay: 0.2, gain: 0.7 }); break;
    case "choco_dismount": sfx("chocobo_wings", { gain: 0.7 }); break;
    case "choco_fall": sfx("chocobo_call", { gain: 0.9 }); sfx("chocobo_run", { delay: 0.3, gain: 0.6 }); break;
    case "choco_back": sfx("chocobo_call", { gain: 0.6 }); break;
    case "daemon_spawn": sfx("daemon_spawn"); sfx("daemon_growl", { delay: 0.5 }); break;
    case "daemon_move": sfx("daemon_growl", { gain: 0.6 }); break;
    case "daemon_attack": sfx("daemon_attack"); break;
    case "daemon_struck": sfx("daemon_growl", { gain: 0.5 }); break;
    case "daemon_die": sfx("daemon_die"); if (e.loot && e.loot.length) sfx("hunt_done", { delay: 0.5, gain: 0.7 }); break;
    case "daemon_dissolve": sfx("daemon_dissolve"); sfx("day_break", { delay: 0.5, gain: 0.7 }); break;
    case "bridge": sfx("bridge_lever"); sfx("bridge_move", { delay: 0.35, gain: 0.85 }); break;
    case "dome_on": sfx("dome_on"); break;
    case "dome_off": sfx("dome_off"); break;
    case "lights": sfx("lights_off", { gain: e.off ? 0.9 : 0.5 }); break;
    case "city_flash": sfx("lights_off", { gain: 0.9 }); sfx("dome_on", { delay: 0.1, gain: 0.5 }); break;
    case "gysahl_lure": sfx("throw_swoosh"); sfx("chocobo_call", { delay: 0.55 }); sfx("chocobo_run", { delay: 0.75, gain: 0.7 }); break;
    case "gysahl_call": sfx("gysahl_munch"); sfx("chocobo_run", { delay: 0.15, gain: 0.7 }); break;
    case "wreck_push": sfx("wreck_push"); break;
    // ขั้น 3
    case "barrel_boom": sfx("barrel_hit", { gain: 0.6 }); sfx("barrel_explode", { delay: 0.08 }); break;
    case "crystal_break": sfx("crystal_pick"); break;
    case "flask": {
      const el = e.element === "ice" ? "flask_ice" : e.element === "thunder" ? "flask_thunder" : "flask_fire";
      sfx("throw_swoosh"); sfx("flask_shatter", { delay: 0.6 }); sfx(el, { delay: 0.66 });
      if (e.element === "fire") sfx("fire_spread", { delay: 1.0, gain: 0.55 });
      if (Array.isArray(e.shock) && e.shock.length) sfx("water_shock", { delay: 0.85 });
      break;
    }
    case "turret_shot": sfx("turret_shot"); break;
    case "mob_move": { // ตามอนทีละตัว: เสียงก้าวของแต่ละตัวตอนเริ่มเดินตามคิว (จำกัด 8 เสียง)
      const STEP = { beast: ["beast_step", 0.8], magitek: ["magitek_step", 0.7], daemon: ["daemon_growl", 0.6] };
      if (!e.seqd) { const ts = new Set((e.moves || []).map((m) => m.type)); for (const k of ts) if (STEP[k]) sfx(STEP[k][0], { gain: STEP[k][1] }); break; }
      for (const m of (e.moves || []).slice(0, 8)) if (STEP[m.type]) sfx(STEP[m.type][0], { gain: STEP[m.type][1] * 0.8, delay: (m.at || 0) / 1000 });
      break;
    }
    case "mob_attack": {
      const dl = (e.delay || 0) / 1000; // แบบเดิม: รอมอนเดินถึง · ตามคิว: แต่ละตัวตีตาม at ของตัวเอง
      const HIT = { beast: "beast_attack", magitek: "magitek_attack", daemon: "daemon_attack", boss: "beast_attack" };
      const done = new Set();
      for (const a of e.attacks || []) { if (!HIT[a.type] || done.has(a.id)) continue; done.add(a.id); sfx(HIT[a.type], { delay: 0.12 + dl + (a.at || 0) / 1000 }); }
      for (const h of e.pillars || []) sfx(h.wall ? (h.broke ? "barrel_explode" : "car_hit") : h.lost ? "dome_off" : "crystal_pick", { delay: 0.25 + dl + (h.at || 0) / 1000, gain: h.wall ? 0.7 : 0.8 });
      break;
    }
    case "mob_die": sfx(e.type === "beast" ? "beast_roar" : "magitek_die", { gain: e.type === "beast" ? 0.7 : 1 }); if (e.loot && e.loot.length) sfx("hunt_done", { delay: 0.5, gain: 0.7 }); break;
    case "pillar_repair": sfx("dome_on", { gain: 0.6 }); break;
    case "boss_warn": sfx("dropship_alarm", { gain: 0.7, dur: 2.4 }); sfx("daemon_growl", { delay: 0.4 }); break;
    case "boss_land": sfx("beast_roar"); sfx("barrel_explode", { delay: 0.2, gain: 0.8 }); break;
    case "boss_roar": sfx("beast_roar", { gain: 0.8 }); sfx("daemon_spawn", { delay: 0.4, gain: 0.7 }); break;
    case "boss_big_warn": sfx("daemon_growl", { gain: 0.9 }); sfx("dome_off", { delay: 0.25, gain: 0.6 }); break;
    case "boss_big": sfx(e.kind === "beam" ? "royal_arms" : "barrel_explode", { gain: 0.9 }); sfx("beast_step", { delay: 0.15 }); if (e.hits && e.hits.length) sfx("car_hit", { delay: 0.35 }); break;
    case "boss_guards": sfx("beast_roar", { gain: 0.8 }); break;
    case "boss_dark": sfx("dome_off", { gain: 0.5 }); break;
    case "camp_rest": sfx("camp_buff", { gain: 0.4 }); break;
    case "boss_quake_warn": sfx("beast_step", { gain: 0.9 }); sfx("dome_off", { delay: 0.2, gain: 0.5 }); break;
    case "boss_quake": sfx("beast_step"); sfx("barrel_explode", { delay: 0.1, gain: 0.9 }); if (e.hits && e.hits.length) sfx("car_hit", { delay: 0.3 }); break;
    case "boss_enrage": sfx("beast_roar"); sfx("beast_roar", { delay: 0.5, gain: 0.7 }); break;
    case "lament_warn": sfx("beast_roar", { gain: 0.6 }); sfx("night_fall", { delay: 0.3, gain: 0.8 }); break;
    case "lament_land": sfx("dropship_land", { gain: 0.9 }); sfx("beast_roar", { delay: 0.5 }); sfx("night_fall", { delay: 0.8, gain: 0.7 }); break;
    case "lament_blink": sfx("throw_swoosh", { gain: 0.8 }); break;
    case "lament_phase": sfx("beast_roar"); sfx("lights_off", { delay: 0.4, gain: 0.7 }); break;
    case "lament_lines": sfx("dome_off", { gain: 0.6 }); break;
    case "lament_tears": sfx("wx_lightning_strike", { gain: 0.6 }); if (e.hits && e.hits.length) sfx("car_hit", { delay: 0.2 }); break;
    case "lament_die": sfx("barrel_explode"); sfx("beast_roar", { delay: 0.3 }); sfx("hunt_done", { delay: 1.6 }); break;
    case "lament_curse": sfx("daemon_spawn", { gain: 0.6 }); break;
    case "lament_life": sfx("lights_off", { gain: 0.5 }); break;
    case "mob_wave": sfx("dropship_alarm", { gain: 0.7, dur: 1.6 }); sfx("daemon_spawn", { delay: 0.4, gain: 0.8 }); break;
    case "town_siege": sfx("daemon_attack", { gain: 0.5 }); break;
    case "town_dark": sfx("lights_off"); sfx("beast_roar", { delay: 0.4, gain: 0.5 }); break;
    case "town_light": sfx("dome_on", { gain: 0.7 }); break;
    case "tram": sfx("train_horn", { gain: 0.45, dur: 1.2 }); sfx("chocobo_run", { delay: 0.3, gain: 0.35, dur: 1.8 }); break;
    case "boss_die": sfx("daemon_die"); sfx("royal_arms", { delay: 0.6 }); sfx("hunt_done", { delay: 1.2 }); break;
    case "mob_heal": for (const h of (e.heals || []).slice(0, 6)) sfx("camp_buff", { gain: 0.45, delay: ((e.delay || 0) + (h.at || 0)) / 1000 }); break;
    case "mob_shot": for (const h of (e.shots || []).slice(0, 8)) sfx("turret_shot", { gain: 0.8, delay: ((e.delay || 0) + (h.at || 0)) / 1000 }); break;
    case "mob_blink": for (const h of (e.list || []).slice(0, 6)) sfx("dome_off", { gain: 0.6, delay: (h.at || 0) / 1000 }); break;
    case "town_garage": sfx("car_start", { gain: 0.8 }); break;
    case "armiger": sfx("royal_arms", { gain: 1 }); sfx("tomb_open", { delay: 0.3, gain: 0.7 }); break;
    case "town_diner": sfx("camp_meal", { gain: 0.8 }); break;
    case "town_shrine": sfx("camp_buff", { gain: 0.9 }); break;
    case "town_ranch": sfx("chocobo_call", { gain: 0.9 }); break;
    case "mob_pull": for (const h of (e.list || []).slice(0, 6)) sfx("car_hit", { gain: 0.6, delay: ((e.delay || 0) + (h.at || 0)) / 1000 + 0.3 }); break;
    case "mob_rune_set": sfx("camp_buff", { gain: 0.5 }); break;
    case "mob_rune": if ((e.list || []).some((r) => !r.fizzle)) sfx("barrel_explode", { gain: 0.8 }); break;
    case "mob_split": sfx("crystal_break", { gain: 0.7 }); break;
    case "mob_block": sfx("pillar_ward_hit", { gain: 0.6 }); break;
    case "mob_boom": sfx("barrel_explode"); break;
    case "elite_spawn": sfx("daemon_growl", { gain: 0.8 }); sfx("royal_arms", { delay: 0.2, gain: 0.35 }); break;
    case "elite_down": sfx("hunt_done", { gain: 0.7 }); break;
    case "elite_blast": sfx("barrel_explode"); break;
    case "elite_drain": sfx("camp_buff", { gain: 0.35 }); break;
    case "elite_thorns": sfx("pillar_ward_hit", { gain: 0.5 }); break;
    case "blood_moon": sfx("night_fall"); sfx("daemon_growl", { delay: 0.8, gain: 0.8 }); break;
    case "quest_new": sfx("hunt_board"); break;
    case "quest_done": sfx("hunt_done"); sfx("royal_arms", { delay: 0.3, gain: 0.6 }); break;
    case "pillar_ward": sfx("dome_on", { gain: 0.5 }); break;
    case "pillar_ward_hit": sfx("dome_off", { gain: 0.5 }); break;
    case "revive_help": sfx("camp_buff", { gain: 0.7 }); break;
    case "convoy_start": sfx("car_start"); sfx("car_horn", { delay: 0.5, gain: 0.6 }); break;
    case "convoy_move": sfx("car_drive", { gain: 0.5, dur: 1.2 }); break;
    case "convoy_done": sfx("car_horn"); sfx("hunt_done", { delay: 0.4 }); break;
    case "convoy_fail": sfx("barrel_explode", { gain: 0.8 }); break;
    case "chest_spawn": sfx("crystal_pick", { gain: 0.5 }); break;
    // PVE รอบสาม (ใช้เสียงที่มีอยู่แล้ว)
    case "combo": sfx("car_hit", { gain: 0.6 }); sfx("royal_arms", { delay: 0.1, gain: 0.55 }); break;
    case "power_turret": sfx("turret_shot", { gain: 0.8 }); break;
    case "power_fountain": sfx("camp_buff", { gain: 0.5 }); break;
    case "nest_spawn": sfx("daemon_spawn", { gain: 0.6 }); break;
    case "nest_burst": sfx("daemon_spawn"); sfx("daemon_growl", { delay: 0.4, gain: 0.8 }); break;
    case "giant_warn": sfx("beast_step", { gain: 0.9 }); sfx("beast_step", { delay: 0.6, gain: 0.9 }); sfx("beast_roar", { delay: 1.0, gain: 0.6 }); break;
    case "giant_step": sfx("beast_step"); sfx("beast_step", { delay: 0.5 }); if (e.hits && e.hits.length) sfx("car_hit", { delay: 0.3 }); break;
    case "giant_leave": sfx("beast_step", { gain: 0.5 }); break;
    case "giant_die": sfx("barrel_explode"); sfx("beast_roar", { delay: 0.2, gain: 0.8 }); sfx("hunt_done", { delay: 1.2 }); break;
    case "civ_spawn": sfx("chocobo_call", { gain: 0.35 }); break;
    case "civ_follow": sfx("chocobo_run", { gain: 0.4 }); break;
    case "civ_saved": sfx("hunt_done"); sfx("camp_buff", { delay: 0.3, gain: 0.6 }); break;
    case "civ_lost": sfx("daemon_attack", { gain: 0.6 }); break;
    case "gauge_full": sfx("royal_arms", { gain: 0.8 }); break;
    case "barrage": sfx("throw_swoosh"); sfx("barrel_explode", { delay: 0.5 }); sfx("barrel_explode", { delay: 0.8, gain: 0.8 }); break;
    case "final_start": sfx("night_fall"); sfx("beast_roar", { delay: 0.6 }); sfx("dropship_alarm", { delay: 1.0, gain: 0.6, dur: 2.0 }); break;
    case "final_wave": sfx("daemon_spawn"); break;
    case "perk_offer": sfx("hunt_board"); sfx("crystal_pick", { delay: 0.3, gain: 0.7 }); break;
    case "perk_pick": sfx("royal_arms"); sfx("camp_buff", { delay: 0.3, gain: 0.8 }); break;
    case "wall_up": sfx("wreck_push", { gain: 0.8 }); break;
    case "wall_down": sfx("wreck_push", { gain: 0.4 }); break;
    case "gold_spawn": sfx("chocobo_call"); sfx("hunt_done", { delay: 0.3, gain: 0.6 }); break;
    case "gold_leave": sfx("chocobo_run", { gain: 0.7 }); break;
    case "chest_open": sfx("tomb_open", { gain: 0.8 }); sfx("hunt_done", { delay: 0.5 }); break;
    case "beast_roar": sfx("beast_roar"); break;
    case "dropship_warn": sfx("dropship_alarm"); break;
    case "dropship_land": sfx("dropship_land"); break;
    case "dropship_leave": sfx("dropship_land", { gain: 0.45 }); break;
    // ขั้น 4 (เสียงยาวตัดด้วย dur — eosAudio)
    case "train_warn": sfx("train_warn", { gain: 0.85 }); sfx("train_horn", { delay: 0.9, gain: 0.6, dur: 2.4 }); break;
    case "train_pass":
      sfx("train_horn", { gain: 0.85, dur: 2.2 }); sfx("train_pass", { delay: 0.25, dur: 3.2 });
      if (e.carried && e.carried.length) { sfx("train_depart", { gain: 0.55, dur: 2.0 }); sfx("train_arrive", { delay: 1.6, gain: 0.55, dur: 2.6 }); }
      for (const h of (e.hits || []).slice(0, 3)) if (h.from) sfx("car_hit", { delay: Math.max(0, trainAtX(e.dir || 1, h.from.x + 0.5) * fx.train_pass / 1000), gain: 0.8 });
      break;
    case "gondola": sfx("gondola_row", { gain: 0.85, dur: 2.6 }); break;
    case "tunnel": sfx("tunnel_enter"); break;
    case "meteor_warn": sfx("dome_off", { gain: 0.5 }); break;
    case "meteor_impact": sfx("barrel_explode"); sfx("barrel_explode", { delay: 0.25, gain: 0.7 }); break;
    case "supply_arrive": sfx("train_horn", { gain: 0.85, dur: 2.0 }); break;
    case "supply_leave": sfx("train_horn", { gain: 0.6, dur: 1.6 }); break;
    case "supply_load": sfx("crystal_pick", { gain: 0.8 }); break;
    case "eclipse_start": sfx("night_fall", { gain: 0.9 }); break;
    case "full_moon": sfx("night_fall", { gain: 0.6 }); sfx("beast_roar", { delay: 0.8, gain: 0.5 }); break;
    case "camp_meal": if (e.quiet) break; sfx("camp_ignite"); sfx("camp_meal", { delay: 0.25 }); sfx("camp_buff", { delay: 1.0, gain: 0.85 }); break;
    case "fish":
      sfx("fish_cast", { dur: 1.2 }); sfx("fish_bite", { delay: 1.05, dur: 1.4 });
      if (e.result === "giant") sfx("fish_drag", { delay: 1.35, dur: 2.6 });
      else { sfx("fish_catch", { delay: 1.35 }); if (e.result !== "coins") sfx("fish_flap", { delay: 1.6, gain: 0.8 }); }
      break;
    case "tomb_open": sfx("tomb_open"); sfx("royal_arms", { delay: 0.95, gain: 0.9 }); break;
    case "royal_drain": sfx("royal_drain", { gain: 0.75, dur: 2.0 }); break;
    case "hunt_board": sfx("hunt_board"); break;
    case "hunt_done": sfx("hunt_done"); break;
    default: break;
  }
}
