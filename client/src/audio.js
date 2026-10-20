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
  // นักบินปริศนา (sliver_bullet): บรรจุแขนใหม่ · ยิง (ตีปกติ + Beam Magnum)
  sliver_reload: "/characters/sliver_bullet/sliver_bullet_reload_arm.m4a",
  sliver_shot: "/characters/sliver_bullet/sliver_bullet.m4a",
  // โซระ โอโตสุมิ: ตีปกติมีด (ฟัน 2 ครั้ง — ครั้งแรก ~0.25 วิ ครั้งสอง ~1.0 วิ) / ปืน · สลับ My-Th Edge เป็นมีด / ปืน
  sora_hit_knife: "/characters/sora_otosumi/sora_hit_knife.m4a",
  sora_hit_gun: "/characters/sora_otosumi/sora_hit_gun.m4a",
  sora_skill2_knife: "/characters/sora_otosumi/sora_skill2_knife.m4a",
  sora_skill2_gun: "/characters/sora_otosumi/sora_skill2_gun.m4a",
  // ท่าไม้ตาย Mouse Separade บนกระดาน (Mixkit — ผู้ใช้อนุญาต 2026-10-12): หนูร้อง + ปั่นจักร (SORA_T.wheel) · พุ่งออกตัว
  sora_squeak: "/characters/sora_otosumi/sora_squeak.mp3",
  sora_wheel: "/characters/sora_otosumi/sora_wheel.mp3",
  sora_dash: "/characters/sora_otosumi/sora_dash.mp3",
  // ไรโด ฮิคารุ — เสียงตีปกติตามร่าง / ท่าไม้ตาย (Mixkit ฟรี · ตัดให้พอดีจังหวะแล้ว — ต้นฉบับอยู่ .claude/plans/raido-hikaru-sfx-src/)
  hk_black: "/characters/raido_hikaru/sfx/hk_black.mp3",
  hk_thunder: "/characters/raido_hikaru/sfx/hk_thunder.mp3",
  hk_kemur: "/characters/raido_hikaru/sfx/hk_kemur.mp3",
  hk_pandon: "/characters/raido_hikaru/sfx/hk_pandon.mp3",
  hk_doragory: "/characters/raido_hikaru/sfx/hk_doragory.mp3",
  hk_tiga: "/characters/raido_hikaru/sfx/hk_tiga.mp3",
  hk_ginga: "/characters/raido_hikaru/sfx/hk_ginga.mp3",
  hk_strium: "/characters/raido_hikaru/sfx/hk_strium.mp3",
  hk_cross: "/characters/raido_hikaru/sfx/hk_cross.mp3",
  hk_ray: "/characters/raido_hikaru/sfx/hk_ray.mp3",
  // กิระ (ราชาแมลงอวกาศ) — Mixkit ฟรี (ต้นฉบับ .claude/plans/kira-sfx-src/)
  //  armor/unarmor/ult = ป้ายสกิล · hit/sweep = ตีปกติ (กิระ / ราชา) · wave = เอฟเฟกต์คลื่นความมืด · squeeze/regen/revive = server ส่ง sfx/ป้าย
  kira_armor: "/characters/kira/sfx/kira_armor.mp3",
  kira_unarmor: "/characters/kira/sfx/kira_unarmor.mp3",
  kira_hit: "/characters/kira/sfx/kira_hit.mp3",
  kira_sweep: "/characters/kira/sfx/kira_sweep.mp3",
  kira_wave: "/characters/kira/sfx/kira_wave.mp3",
  kira_squeeze: "/characters/kira/sfx/kira_squeeze.mp3",
  kira_ult: "/characters/kira/sfx/kira_ult.mp3",
  kira_revive: "/characters/kira/sfx/kira_revive.mp3",
  kira_regen: "/characters/kira/sfx/kira_regen.mp3",
  kira_king: "/characters/kira/kira_king_theme.mp3", // เพลงอัฐิราชา (Rcules no Inbou — ไฟล์จากผู้ใช้) เล่นค้างระหว่างท่าไม้ตาย
  // Ice Spike — gp/slide/skill_2/skill_2_broke/ult = ไฟล์จากผู้ใช้ · is_* อื่น = Mixkit ฟรี (ต้นฉบับ .claude/plans/ice-spike-sfx-src/)
  //  เล่นตามเหตุการณ์ iceFx (BoardStage) · gp/slide สุ่ม 1/2
  is_gp_1: "/characters/ice_spike/sfx/gp_1.mp3",
  is_gp_2: "/characters/ice_spike/sfx/gp_2.mp3",
  is_slide_1: "/characters/ice_spike/sfx/slide_1.mp3",
  is_slide_2: "/characters/ice_spike/sfx/slide_2.mp3",
  is_skill_2: "/characters/ice_spike/sfx/skill_2.mp3",
  is_skill_2_broke: "/characters/ice_spike/sfx/skill_2_broke.mp3",
  is_ult: "/characters/ice_spike/sfx/ult.mp3",
  is_hit: "/characters/ice_spike/sfx/is_hit.mp3",
  is_hit_alt: "/characters/ice_spike/sfx/is_hit_alt.mp3",
  is_hit_max: "/characters/ice_spike/sfx/is_hit_max.mp3",
  is_bump: "/characters/ice_spike/sfx/is_bump.mp3",
  is_slow: "/characters/ice_spike/sfx/is_slow.mp3",
  is_burst: "/characters/ice_spike/sfx/is_burst.mp3",
  is_regen: "/characters/ice_spike/sfx/is_regen.mp3",
  is_spike_self: "/characters/ice_spike/sfx/is_spike_self.mp3",
  // เคท & เอมิลิโกะ — สังเคราะห์ด้วยโค้ดทั้งหมด (node scripts/gen-kate-sfx.js · ไม่มีไฟล์ต้นฉบับ) · ตัวเลือก Mixkit ที่ดีกว่า: .claude/plans/kate-emiliko-sfx-candidates.md
  ke_mirror: "/characters/kate_emiliko/sfx/ke_mirror.mp3",
  ke_revive: "/characters/kate_emiliko/sfx/ke_revive.mp3",
  ke_w_mop: "/characters/kate_emiliko/sfx/ke_w_mop.mp3",
  ke_w_vase: "/characters/kate_emiliko/sfx/ke_w_vase.mp3",
  ke_w_vacuum: "/characters/kate_emiliko/sfx/ke_w_vacuum.mp3",
  ke_w_sword: "/characters/kate_emiliko/sfx/ke_w_sword.mp3",
  ke_sword: "/characters/kate_emiliko/sfx/ke_sword.mp3",
  ke_whip: "/characters/kate_emiliko/sfx/ke_whip.mp3",
  ke_wings: "/characters/kate_emiliko/sfx/ke_wings.mp3",
  ke_storm: "/characters/kate_emiliko/sfx/ke_storm.mp3",
  ke_storm_tick: "/characters/kate_emiliko/sfx/ke_storm_tick.mp3",
  ke_masked: "/characters/kate_emiliko/sfx/ke_masked.mp3",
  ke_hit_mop: "/characters/kate_emiliko/sfx/ke_hit_mop.mp3",
  ke_hit_vase: "/characters/kate_emiliko/sfx/ke_hit_vase.mp3",
  ke_hit_vacuum: "/characters/kate_emiliko/sfx/ke_hit_vacuum.mp3",
  ke_hit_sword: "/characters/kate_emiliko/sfx/ke_hit_sword.mp3",
  ke_hit_kate: "/characters/kate_emiliko/sfx/ke_hit_kate.mp3",
  ke_cheer: "/characters/kate_emiliko/sfx/ke_cheer.mp3",
  ke_splash: "/characters/kate_emiliko/sfx/ke_splash.mp3",
  ke_slide: "/characters/kate_emiliko/sfx/ke_slide.mp3",
  // Echo: เพลงฉากท่าไม้ตาย "ก่อกำเนิดใหม่" (oc/intro/EchoRebirth — เล่นผ่าน playSceneMusic)
  echo_queen: "/characters/echo/echo_queen_theme.mp3",
  // เคท: เพลงระหว่างมีม่านแดง (state.skillMusic "kate_storm") — intro ครั้งเดียว → loop วน (MUSIC_SEQUENCES) · ไฟล์ -14.4 LUFS ไม่ต้องลด
  kate_storm: "/characters/kate_emiliko/kate_theme_intro.m4a",
  // ยูนะ — เสียงเฉพาะตัว (สังเคราะห์ด้วย ffmpeg ธีมดนตรี · .claude/plans/yuna-sfx.py) · เพลงจากผู้ใช้ (Downloads/yuna_new/song)
  yuna_hit: "/characters/yuna/sfx/yuna_hit.mp3",
  yuna_idol_hit: "/characters/yuna/sfx/yuna_idol_hit.mp3",
  yuna_bless: "/characters/yuna/sfx/yuna_bless.mp3",
  yuna_shadow: "/characters/yuna/sfx/yuna_shadow.mp3",
  yuna_vanish: "/characters/yuna/sfx/yuna_vanish.mp3",
  yuna_appear: "/characters/yuna/sfx/yuna_appear.mp3",
  yuna_song_delete: "/characters/yuna/sfx/yuna_song_delete.mp3",
  yuna_song_smile: "/characters/yuna/sfx/yuna_song_smile.mp3",
  yuna_song_rest: "/characters/yuna/sfx/yuna_song_rest.mp3",
  yuna_song_tick: "/characters/yuna/sfx/yuna_song_tick.mp3",
  yuna_song_stop: "/characters/yuna/sfx/yuna_song_stop.mp3",
  yuna_idol_cast: "/characters/yuna/sfx/yuna_idol_cast.mp3",
  yuna_idol_end: "/characters/yuna/sfx/yuna_idol_end.mp3",
  yuna_ride_ask: "/characters/yuna/sfx/yuna_ride_ask.mp3",
  yuna_ride_no: "/characters/yuna/sfx/yuna_ride_no.mp3",
  yuna_mount: "/characters/yuna/sfx/yuna_mount.mp3",
  yuna_fall: "/characters/yuna/sfx/yuna_fall.mp3",
  yuna_delete: "/characters/yuna/yuna_delete.mp3",   // บทเพลงแห่งชีวิต: Delete (เล่นค้างระหว่างเปิดเพลง)
  yuna_smile: "/characters/yuna/yuna_smile.mp3",     // บทเพลงแห่งชีวิต: Smile for You
  yuna_longing: "/characters/yuna/yuna_longing.mp3", // คำอวยพรสุดท้าย: เล่นจนคนที่ฟื้นตายอีกครั้งหรือบัฟหมด
  // ร้อนแรงดังไฟ: Break Beat Bark! intro ครั้งเดียว → loop วน (MUSIC_SEQUENCES) · เพลงเด่น (FEATURED_MUSIC)
  yuna_idol: "/characters/yuna/yuna_idol_intro.m4a",
  // เกรย์ — ซ้อน Mixkit ที่มีอยู่ (kate-emiliko / ice-spike / raido-hikaru sfx-src) + สังเคราะห์ ffmpeg · สคริปต์ gray-sfx.py · mono -16..-18 LUFS
  gray_scythe: "/characters/gray/sfx/gray_scythe.mp3", // ตีปกติ: เคียว
  gray_hammer: "/characters/gray/sfx/gray_hammer.mp3", // ตีปกติ: ค้อน (ทุบพื้น ~0.3 วิ)
  gray_bow: "/characters/gray/sfx/gray_bow.mp3",       // ตีปกติ: ธนู
  gray_chains: "/characters/gray/sfx/gray_chains.mp3", // จงบ้าคลั่ง: โซ่ตรึง (ซ้อนกับเสียงอาวุธ)
  gray_keeper: "/characters/gray/sfx/gray_keeper.mp3", // คนเฝ้าสุสาน
  gray_grave: "/characters/gray/sfx/gray_grave.mp3",   // Grave
  gray_reap: "/characters/gray/sfx/gray_reap.mp3",     // เก็บศพ
  gray_beam: "/characters/gray/sfx/gray_beam.mp3",     // ลำแสงรองโกมิเนียต: ชาร์จ 0–1.6 วิ → ระเบิดที่ 1.6 วิ → หางครืนถึง 3.8 วิ
  // รองโกมิเนียต: เพลงระหว่างชาร์จ 2 เทิร์น — contro ครั้งเดียว → standBy วน (MUSIC_SEQUENCES) · เพลงเด่น (FEATURED_MUSIC)
  gray_ult: "/characters/gray/gray_skill3_contro.m4a",
  // ไจโร เซปเปลี่ (GRID_PLAN §7.11) — เอฟเฟกต์ตัดจากไฟล์ต้นฉบับที่ผู้ใช้ส่ง (HHA / Ball Breaker) · gyro_spin เล่นครั้งเดียวต่อการขว้าง (ห้ามวน)
  //  ไฟล์เสียง/เสียงพากย์ไจโรทำให้ดังที่ตัวไฟล์ ~-10 LUFS (ผู้ใช้สั่ง 2026-10-20: ต้องดังกว่าเพลงพื้นหลัง — เดิม -16 ถึง -21 จนแทบไม่ได้ยิน) · ต้นฉบับอยู่ Downloads\gyro
  gyro_spin: "/characters/gyro_zeppeli/sfx/gyro_spin.mp3",
  gyro_throw: "/characters/gyro_zeppeli/sfx/gyro_throw.mp3",
  gyro_hit: "/characters/gyro_zeppeli/sfx/gyro_hit.mp3",
  gyro_recall: "/characters/gyro_zeppeli/sfx/gyro_recall.mp3",
  gyro_secret: "/characters/gyro_zeppeli/sfx/gyro_secret.mp3",
  gyro_secret_return: "/characters/gyro_zeppeli/sfx/gyro_secret_return.mp3",
  gyro_golden_charge: "/characters/gyro_zeppeli/sfx/gyro_golden_charge.mp3",
  gyro_breaker: "/characters/gyro_zeppeli/sfx/gyro_breaker.mp3",
  gyro_fly: "/characters/gyro_zeppeli/sfx/gyro_fly.mp3",
  gyro_shove: "/characters/gyro_zeppeli/sfx/gyro_shove.mp3",
  gyro_golden_tick: "/characters/gyro_zeppeli/sfx/gyro_golden_tick.mp3",
  // เสียงพากย์ไจโร (server/voice.js — ต้นตาเดิน / ตี / โดนตี / สกิล · สุ่มจากหลายไฟล์)
  gyro_v_start_1: "/characters/gyro_zeppeli/voice/gyro_voice_start_1.m4a",
  gyro_v_start_2: "/characters/gyro_zeppeli/voice/gyro_voice_start_2.m4a",
  gyro_v_hit_1: "/characters/gyro_zeppeli/voice/gyro_voice_hit_1.m4a",
  gyro_v_hit_2: "/characters/gyro_zeppeli/voice/gyro_voice_hit_2.m4a",
  gyro_v_hit_3: "/characters/gyro_zeppeli/voice/gyro_voice_hit_3.m4a",
  gyro_v_hitby_1: "/characters/gyro_zeppeli/voice/gyro_voice_hitby_1.m4a",
  gyro_v_skill1: "/characters/gyro_zeppeli/voice/gyro_voice_skill1.m4a",
  gyro_v_skill2: "/characters/gyro_zeppeli/voice/gyro_voice_skill2.m4a",
  gyro_v_skill3: "/characters/gyro_zeppeli/voice/gyro_voice_skill3.m4a",
  gyro_v2_skill3: "/characters/gyro_zeppeli/voice/gyro_voice2_skill3.m4a",
  // ดิเอโก้ แบรนโด โลกคู่ขนาน (GRID_PLAN §7.12) — ท่อนตัดจากไฟล์ต้นฉบับที่ผู้ใช้ส่ง (THE WORLD HHA/GHA + time stop · ASB-R) ปรับดัง ~-10 LUFS
  //  array = เสียงคล้ายกันหลายท่อน สุ่ม 1 ไฟล์ทุกครั้ง · ต้นฉบับ + หน้าฟัง Downloads\diego_alt\sfx · คีย์ที่ยังไม่มีไฟล์ (splash/match/net/reload/heal/gallop) = ไม่มีเสียง
  diego_throw: "/characters/diego_alt/sfx/diego_throw.mp3",
  diego_explode: "/characters/diego_alt/sfx/diego_explode.mp3",
  diego_fire: ["/characters/diego_alt/sfx/diego_fire_1.mp3", "/characters/diego_alt/sfx/diego_fire_2.mp3"],
  diego_net_trap: "/characters/diego_alt/sfx/diego_net_trap.mp3",
  diego_knife: ["/characters/diego_alt/sfx/diego_knife_1.mp3", "/characters/diego_alt/sfx/diego_knife_2.mp3"],
  diego_empty: "/characters/diego_alt/sfx/diego_empty.mp3",
  diego_world: "/characters/diego_alt/sfx/diego_world.mp3",
  diego_stop: "/characters/diego_alt/sfx/diego_stop.mp3",
  diego_tick: ["/characters/diego_alt/sfx/diego_tick_1.mp3", "/characters/diego_alt/sfx/diego_tick_2.mp3"],
  diego_tick_loop: "/characters/diego_alt/sfx/diego_tick_loop.wav", // วนตลอดที่เวลาหยุด (tick_1 + เว้นให้จังหวะต่อกัน 1.12 วิ)
  diego_resume: ["/characters/diego_alt/sfx/diego_resume_1.mp3", "/characters/diego_alt/sfx/diego_resume_2.mp3"],
  diego_crash: "/characters/diego_alt/sfx/diego_crash.mp3",
  diego_shot: "/characters/diego_alt/sfx/diego_shot.mp3", // ปืนลูกโม่ — ผู้ใช้เลือก g1 (HHA/GHA 81.00–81.95)
  // เสียงพากย์ดิเอโก้ (server/voice.js) — ปรับดัง ~-10 LUFS แล้ว
  diego_v_start1: "/characters/diego_alt/voice/diego_alt_start1.m4a",
  diego_v_start2: "/characters/diego_alt/voice/diego_alt_start2.m4a",
  diego_v_hit1: "/characters/diego_alt/voice/diego_alt_hit1.m4a",
  diego_v_hitby1: "/characters/diego_alt/voice/diego_alt_hitby1.m4a",
  diego_v_hitby2: "/characters/diego_alt/voice/diego_alt_hitby2.m4a",
  diego_v_hitby3: "/characters/diego_alt/voice/diego_alt_hitby3.m4a",
  diego_v_skill1_1: "/characters/diego_alt/voice/diego_alt_skill1_1.m4a",
  diego_v_skill1_2: "/characters/diego_alt/voice/diego_alt_skill1_2.m4a",
  diego_v_skill1_3: "/characters/diego_alt/voice/diego_alt_skill1_3.m4a",
  diego_v_skill3: "/characters/diego_alt/voice/diego_alt_skill3.m4a",
  diego_v_skill3_counter: "/characters/diego_alt/voice/diego_alt_skill3_counter_trigger.m4a",
  diego_v_skill3_normal: "/characters/diego_alt/voice/diego_alt_skill3_normal_trigger.m4a",
  action_button: "/effect_sound/click.mp3",
  trun_change: "/effect_sound/trun_change.wav",
  attack: "/effect_sound/attack.wav",
  death_boom: "/effect_sound/death_boom.mp3", // ตกรอบบนกระดาน: ระเบิด (Mixkit ฟรี — Fire spell with explosion)
  notificate: "/effect_sound/notificate.mp3", // ฉากตาเดินของคนอื่น (ระบบกระดาน)
  notificate_mine: "/effect_sound/notificate_mine.mp3", // ฉากตาเดินของเรา (ระบบกระดาน)
  // ห่วงเวลาซีโร่ (GRID_PLAN §8.2 · ผู้ใช้ส่งมา 2026-10-11): เพลงตามระดับ (1 ผนึกครบ … 4 เหลือผนึกเดียว) — ห้ามเพลงอื่นทับ · ฟ้าผ่าเฟส 4
  zero_1: "/zero_time/phase1.mp3",
  zero_2: "/zero_time/phase2.mp3",
  zero_3: "/zero_time/phase3.mp3",
  zero_4: "/zero_time/phase4.mp3",
  zero_thunder: "/zero_time/thunder.mp3",
};

// เพลงที่มี intro หนึ่งครั้ง แล้วจึงเปลี่ยนเป็น theme ที่วนลูป — name → [intro, loop] (FILES[name] = intro)
//  intro กับ loop เป็นคนละ element (loop โหลดรอไว้ระหว่าง intro) แล้วสลับก่อน intro จบเล็กน้อย = ต่อกันไม่มีช่องเงียบ (ดู getMusic)
const MUSIC_SEQUENCES = {
  kate_storm: ["/characters/kate_emiliko/kate_theme_intro.m4a", "/characters/kate_emiliko/kate_theme_loop.mp3"],
  yuna_idol: ["/characters/yuna/yuna_idol_intro.m4a", "/characters/yuna/yuna_idol_loop.mp3"],
  gray_ult: ["/characters/gray/gray_skill3_contro.m4a", "/characters/gray/gray_skill3_standBy.m4a"],
};

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
  // ห่วงเวลาซีโร่ (วัด ffmpeg ebur128 · ไฟล์ดังมาก -8.7 ถึง -9.5 LUFS) — ลดลงให้อยู่ระดับเพลงพื้นหลัง ไม่กลบเสียงกด/เอฟเฟกต์ (ผู้ใช้สั่ง)
  //  thunder.mp3 = -15.7 dBFS เบากว่าเป้าอยู่แล้ว (ไม่อยู่ในตาราง)
  "/zero_time/phase1.mp3": 0.55,
  "/zero_time/phase2.mp3": 0.56,
  "/zero_time/phase3.mp3": 0.58,
  "/zero_time/phase4.mp3": 0.6,
  "/characters/echo/echo_queen_theme.mp3": 0.65, // -10.2 LUFS (ffmpeg ebur128 ช่วง 20 วิแรก)
  // ยูนะ (ffmpeg ebur128 ช่วง 60 วิแรก) — Smile for You -14.8 / skill3.mp4 -13.9 อยู่ที่เป้าแล้ว
  "/characters/yuna/yuna_delete.mp3": 0.58, // -9.2 LUFS
  "/characters/yuna/yuna_longing.mp3": 0.63, // -10.0 LUFS
  "/characters/yuna/yuna_idol_intro.m4a": 0.52, // -8.3 LUFS
  "/characters/yuna/yuna_idol_loop.mp3": 0.52, // -8.4 LUFS
  // เกรย์ (ffmpeg ebur128 ทั้งไฟล์) — contro -14.6 / standBy -14.1 / skill3_intro.mp4 -16.2 / skill3_final.mp4 -15.5 อยู่ที่เป้าแล้ว ไม่อยู่ในตาราง
};
function pathGain(path) { return LOUDNESS_GAIN[path] ?? 1; }
export function soundGain(name) { return pathGain(FILES[name]); }
const activeSfx = new Map();
const musicSuspensions = new Set();

// ปรับความดังรายเพลง (นอกเหนือจาก LOUDNESS_GAIN) ให้สมดุลกับเพลงอื่น
const MUSIC_TRACK_SCALE = {
  // การเดินทาง ภูมิภาค 2 กลางคืน: ไฟล์เบากว่าเพลงอื่น ~5 dB (-19 เทียบ -14 dBFS) — ดันขึ้นให้เท่ากัน (ชนเพดาน volume 1 เมื่อหลอดเสียงสูง)
  journey_2_night: 1.78,
  // เพลงม่านแดงของเคท: ห้ามมีอะไรกลบ (ผู้ใช้สั่ง) — ดันเต็มหลอด (0.75 × 1.34 ≈ 1 × หลอดเสียง) ดู FEATURED_MUSIC
  kate_storm: 1.34,
  // ร้อนแรงดังไฟของยูนะ: เพลงไอดอลต้องเด่นกว่าเพลงร้องปกติ (ผู้ใช้สั่ง "พิเศษและอลังการกว่า") — เต็มหลอดแบบม่านแดง
  yuna_idol: 1.34,
  // รองโกมิเนียตของเกรย์: เพลงชาร์จ 2 เทิร์นต้องครองฉาก — เต็มหลอดแบบม่านแดง
  gray_ult: 1.34,
};
// เพลงเด่น: ระหว่างเล่น เพลงนี้ไม่ถูกหรี่โดยลูปเสียงเฉพาะกิจ และเอฟเฟกต์/ลูปเสียงทุกตัวเบาลงเหลือค่านี้ (หยุดเพลงเมื่อไหร่กลับปกติเอง)
//  เพลงพื้นหลังภูมิภาคไม่ซ้อนอยู่แล้ว (เล่นได้ทีละเพลง — stopMusicExcept)
const FEATURED_MUSIC = { kate_storm: 0.55, yuna_idol: 0.6, gray_ult: 0.6 };
function sfxDuck() {
  const d = currentMusic && !musicSuspensions.size ? FEATURED_MUSIC[currentMusic] : undefined;
  return d ?? 1;
}
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
  return Math.min(1, MUSIC_BASE * pathGain(musicPath(name)) * (MUSIC_TRACK_SCALE[name] ?? 1) * masterGain() * (FEATURED_MUSIC[name] ? 1 : musicDuck));
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
// เพลง intro → loop (MUSIC_SEQUENCES): สอง element ต่อเพลง [intro, loop] · musicCache[name] = ตัวที่ใช้อยู่ (_echoSequenceStage 0/1)
const seqEls = {};
function musicTrack(name, src, loop, stage) {
  const a = new Audio(src);
  a.loop = loop;
  a._echoSequenceStage = stage;
  a.addEventListener("playing", () => {
    // A delayed play() must not revive a track after a cutscene or another song took over.
    if (currentMusic !== name || musicSuspensions.size || musicCache[name] !== a) a.pause();
  });
  return a;
}
// กลับไปต้น intro (stage 0) / ไปช่วง loop (stage 1)
function seqStage(name, stage) {
  const els = seqEls[name];
  if (!els) return;
  clearTimeout(els[0]._echoSwap);
  if (stage === 0) { els[1].pause(); try { els[1].currentTime = 0; } catch { /* ยังไม่มี metadata */ } }
  musicCache[name] = els[stage];
}
function getMusic(name) {
  if (!musicCache[name]) {
    const sequence = MUSIC_SEQUENCES[name];
    if (sequence) {
      const intro = musicTrack(name, sequence[0], false, 0), loop = musicTrack(name, sequence[1], true, 1);
      loop.preload = "auto"; // โหลดรอไว้ระหว่าง intro
      seqEls[name] = [intro, loop];
      // ต่อ loop ก่อน intro จบ ~60ms (ปล่อย intro เล่นหางจนจบเอง) — ended ของบางเบราว์เซอร์มาช้า = เงียบเป็นช่วง
      const toLoop = () => {
        clearTimeout(intro._echoSwap);
        if (musicCache[name] !== intro || currentMusic !== name || musicSuspensions.size) return;
        seqStage(name, 1);
        try { loop.currentTime = 0; } catch { /* ยังไม่มี metadata */ }
        loop.volume = trackVolume(name); // ไฟล์ช่วงถัดไปดังไม่เท่าไฟล์แรก
        playCurrentMusic(name, loop);
      };
      // ตั้งเวลาสลับจากเวลาที่เหลือจริง · ตื่นมาแล้วยังไม่ถึง (สะดุดโหลด/กระโดด) = ตั้งใหม่
      const arm = () => {
        clearTimeout(intro._echoSwap);
        if (intro.paused || musicCache[name] !== intro || !isFinite(intro.duration)) return;
        const left = intro.duration - intro.currentTime;
        if (left <= 0.08) toLoop();
        else intro._echoSwap = setTimeout(arm, Math.max(15, (left - 0.06) * 1000));
      };
      intro.addEventListener("playing", arm);
      intro.addEventListener("seeked", arm);
      intro.addEventListener("pause", () => clearTimeout(intro._echoSwap));
      intro.addEventListener("ended", toLoop);
      musicCache[name] = intro;
    } else {
      musicCache[name] = musicTrack(name, FILES[name], true, 0);
    }
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
  let a = getMusic(name);
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
    if (seqEls[name] && a._echoSequenceStage !== 0) { seqStage(name, 0); a = getMusic(name); } // intro → loop: กลับไปต้น intro
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
    if (seqEls[name]) for (const el of seqEls[name]) if (!el.paused) el.pause(); // หาง intro ที่ยังเล่นอยู่หลังต่อ loop
  }
  if (currentMusic !== keep) currentMusic = musicCache[keep] ? keep : null;
  if (loopSfx) loopSfx.volume = loopVolume(loopSfx._echoName); // เพลงเด่นเริ่ม/จบ = ลูปเสียงเบาลง/กลับปกติ
}
export function stopMusic() {
  stopMusicExcept(null);
}
// เริ่มเกมใหม่ / จบแมตช์: รีเซ็ตตำแหน่งเพลงทุกเพลง -> ครั้งถัดไปเริ่มจากต้นทั้งหมด
export function resetMusicPositions() {
  stopLoopSfx();
  for (const [name, a] of Object.entries(musicCache)) {
    a.pause();
    if (seqEls[name]) { seqEls[name][0].pause(); seqStage(name, 0); }
    musicCache[name].currentTime = 0;
  }
  for (const k of Object.keys(musicSeq)) delete musicSeq[k];
  currentMusic = null;
}
// สร้าง <audio> ใหม่ทุกครั้งที่เล่น = ต้องต่อ resource + ถอดรหัสเสียงใหม่ทุกครั้ง
//  เสียงคลิกดังแทบทุกการกด จึงเห็นเป็นอาการกระตุกสะสม -> เก็บ element ที่เล่นจบแล้วไว้ใช้ซ้ำ
const sfxPool = new Map(); // ชื่อเสียง -> element ที่ว่างอยู่
const POOL_PER_SOUND = 4;  // เสียงเดียวกันซ้อนกันเกินนี้แทบไม่เกิด — ที่เกินปล่อยให้ GC เก็บ
let playSeq = 0;

// คีย์ที่เป็น array = สุ่ม 1 ไฟล์ทุกครั้งที่เล่น · pool แยกต่อไฟล์ (คีย์ "ชื่อ#ลำดับ")
function sfxVariant(name) {
  const f = FILES[name];
  if (!Array.isArray(f)) return { key: name, path: f };
  const i = Math.floor(Math.random() * f.length);
  return { key: `${name}#${i}`, path: f[i] };
}
function takeVoice(name, path = FILES[name]) {
  const idle = sfxPool.get(name);
  if (idle && idle.length) {
    const a = idle.pop();
    a._echoIdle = false;
    try { a.currentTime = 0; } catch { /* ยังโหลดไม่เสร็จ: เล่นจากต้นอยู่แล้ว */ }
    return a;
  }
  const a = new Audio(path);
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
    if (!FILES[name]) continue;
    const list = Array.isArray(FILES[name]) ? FILES[name].map((path, i) => [`${name}#${i}`, path]) : [[name, FILES[name]]];
    for (const [k, path] of list) {
      if (sfxPool.has(k)) continue;
      const a = takeVoice(k, path);
      a._echoIdle = true;
      sfxPool.set(k, [a]);
      try { a.load(); } catch { /* เบราว์เซอร์บางตัวห้ามโหลดก่อนมี gesture */ }
    }
  }
}

// โหลดเพลงไว้ล่วงหน้า (ยังไม่เล่น) — เพลงไฟล์ใหญ่ที่ต้องดังทันทีตอนเริ่มฉาก (เพลงม่านแดงของเคท: intro + loop)
export function prewarmMusic(name) {
  if (FILES[name]) getMusic(name);
}

// เสียงวนต่อเนื่อง (ดิเอโก้: นาฬิกาเดินระหว่างหยุดเวลา) → ฟังก์ชันหยุด · ตามระดับเสียงหลัก · ไฟล์ .wav ไม่มีช่องว่างตอนวน
export function playLoop(name) {
  const path = Array.isArray(FILES[name]) ? FILES[name][0] : FILES[name];
  if (!path) return () => {};
  const a = new Audio(path);
  a.loop = true;
  a.preload = "auto";
  const vol = () => { a.volume = Math.min(1, SFX_BASE * pathGain(path)) * masterGain(); };
  vol();
  const off = onVolumeChange(vol);
  a.play().catch(() => {});
  return () => { off(); a.pause(); };
}

// คืน element ที่เล่นอยู่ ให้ผู้เรียกหยุดเองได้ (เช่น เพลงประกอบคัตซีนที่ต้องหยุดตอนฉากจบ)
//  opts.gain = คูณความดังเพิ่ม (เช่น เสียงร่ายที่ต้องอยู่ใต้เพลง) · ระหว่างเพลงเด่น (FEATURED_MUSIC) เอฟเฟกต์เบาลงเอง (ยกเว้นเสียงคลิก)
export function playSfx(name, opts) {
  if (!FILES[name]) return null;
  const v = sfxVariant(name), a = takeVoice(v.key, v.path);
  const gain = opts && Number.isFinite(opts.gain) ? Math.max(0, opts.gain) : 1;
  const base = name === "action_button" ? CLICK_BASE : Math.min(1, SFX_BASE * pathGain(v.path) * gain * sfxDuck());
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
function loopVolume(name) { return MUSIC_BASE * soundGain(name) * masterGain() * sfxDuck(); }
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

// เพลงประจำฉากของ client เอง (ท่าไม้ตาย Echo "ก่อกำเนิดใหม่" — ฉากไม่มีวีดีโอ): พักเพลงพื้นหลังทั้งหมดแล้วเล่นเพลงนี้แทน
//  ตามหลอดเสียง (ปิดเสียง = เงียบ) · from = เริ่มจากวินาทีที่เท่าไร (เข้ากลางฉาก)
//  fadeOut(ms) = ค่อยๆ เบาลงแล้วหยุด แล้วคืนเพลงพื้นหลัง (เพลงที่ App สั่งไว้ล่าสุดเล่นต่อ) · stop() = หยุดทันที
export function playSceneMusic(name, { from = 0 } = {}) {
  if (!FILES[name]) return { fadeOut() {}, stop() {} };
  const path = FILES[name];
  const releaseMusic = suspendMusic();
  const a = new Audio(path);
  let k = 1, done = false, awaiting = false, raf = 0, fadeTimer = 0;
  const setVol = () => { a.volume = Math.max(0, Math.min(1, MUSIC_BASE * pathGain(path) * masterGain() * k)); };
  setVol();
  if (from > 0) {
    const seek = () => { try { a.currentTime = from; } catch { /* ยังไม่มี metadata */ } };
    if (a.readyState >= 1) seek(); else a.addEventListener("loadedmetadata", seek, { once: true });
  }
  const unsubscribe = onVolumeChange(setVol);
  const play = () => a.play().then(() => { if (done) a.pause(); });
  // เบราว์เซอร์ยังไม่ให้เล่นเสียงเอง -> ลองใหม่เมื่อผู้เล่นแตะจอ/กดปุ่มครั้งแรก
  const retry = () => { if (done || !awaiting) return; awaiting = false; play().catch(() => { awaiting = true; }); };
  if (typeof window !== "undefined") {
    window.addEventListener("pointerdown", retry);
    window.addEventListener("keydown", retry);
  }
  play().catch(() => { if (!done) awaiting = true; });
  const stop = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    clearTimeout(fadeTimer);
    a.pause();
    unsubscribe();
    if (typeof window !== "undefined") {
      window.removeEventListener("pointerdown", retry);
      window.removeEventListener("keydown", retry);
    }
    releaseMusic();
  };
  return {
    fadeOut(ms = 800) {
      if (done) return;
      cancelAnimationFrame(raf);
      clearTimeout(fadeTimer);
      const k0 = k, t0 = performance.now();
      const step = (now) => {
        k = k0 * Math.max(0, 1 - (now - t0) / ms);
        setVol();
        if (k <= 0) stop(); else raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      fadeTimer = setTimeout(stop, ms + 80); // แท็บถูกซ่อน (rAF หยุด) ก็ต้องหยุดเพลง/คืนเพลงพื้นหลังตามเวลา
    },
    stop,
  };
}
