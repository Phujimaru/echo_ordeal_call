// โฟลเดอร์สื่อทั้งหมดที่เก็บบน Cloudflare R2 — /characters (รูป/วิดีโอ/เพลงตัวละคร), /item (ปืนหน่วย GUTS
//  Select + คีย์/วีดีโอกระสุน), /overload_force (เพลงท่าไม้ตายมุยมิ — ระบบ Overload Force ถอดออกแล้ว), /theme_song + /effect_sound (เพลง/เสียง),
//  /image (พื้นหลัง + สแปลช)
//  /journey (เพลงการเดินทาง 7 ภูมิภาค กลางวัน/กลางคืน + map.mp3 ของฉากแผนที่) · /zero_time (เพลงห่วงเวลาซีโร่ 4 ระดับ + เสียงฟ้าผ่า)
//  /colony (เพลง/เสียงเหตุการณ์ของสนาม Colony — GRID_PLAN §8.3)
//  ใช้ร่วมกัน: server/app.js (redirect ไป R2) · desktop/ (แคชไฟล์สื่อในเครื่องผู้เล่น)
module.exports = ["characters", "item", "overload_force", "theme_song", "effect_sound", "image", "journey", "zero_time", "colony"];
