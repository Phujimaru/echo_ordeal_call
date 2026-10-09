// ครอปหน้าตัวละครจากรูปเต็มตัวให้อยู่กลางกรอบหกเหลี่ยม (ใช้ร่วม: แถบลำดับเดิน · ฉากลำดับเดิน · ฉากตาเดิน · HUD)
// จุดหน้าตัวละครในรูปเต็มตัว (สัดส่วนของรูป) — ใช้ครอปหน้าให้อยู่กลางกรอบหกเหลี่ยม · ตัวละครใหม่ที่ไม่มีในนี้ = ครอปบนกลาง
//  fx/fy = ตำแหน่งหน้า · ar = สูง/กว้างของรูป · zf = ขยายตอนเป็นรูปหน้า · zb = ขยายตอนเป็นรูปใหญ่ · bleed = รูปมีฉากหลัง (จางขอบ)
//  hs = ความสูงของหัว (ผม–คาง) เทียบความสูงรูป — ใช้ปรับรูปใหญ่ทุกตัวให้หัวขนาดเท่ากันบนจอ (bigArtStyle)
const FACE = {
  muimi: { fx: 0.665, fy: 0.135, ar: 523 / 376, zf: 2.2, zb: 1.3, hs: 0.17 },
  oberon_summer: { fx: 0.64, fy: 0.26, ar: 875 / 512, zf: 1.5, zb: 1.15, hs: 0.23, bleed: true },
};
export const charKey = (p) => (p && (p.character?.id || p.charId || p.characterId)) || "";
// สไตล์ <img> ให้หน้าตัวละครอยู่ที่ (50%, cy%) ของกรอบ (box = กว้าง/สูงของกรอบ) — ไม่รู้จักตัวละคร = cover ชิดบน
export function faceStyle(p, { zoom, cy = 38, box = 0.873, big = false } = {}) {
  // รูปที่แสดงไม่ใช่รูปประจำตัวละคร (เกราะ Mark 42 / ภาพท่าไม้ตาย) = จุดหน้าไม่ตรง → ครอปบนกลางแทน
  const f = p && p.img && p.character && p.character.img && p.img !== p.character.img ? null : FACE[charKey(p)];
  if (!f) return { width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 12%" };
  const Z = zoom || (big ? f.zb : f.zf), W = Z * 100, H = W * f.ar * box;
  const left = Math.min(0, Math.max(100 - W, 50 - f.fx * W)), top = Math.min(0, Math.max(100 - H, cy - f.fy * H));
  return { position: "absolute", maxWidth: "none", objectFit: "fill", width: `${W}%`, height: "auto", left: `${left}%`, top: `${top}%` };
}
export const isBleed = (p) => !(p && p.img && p.character && p.character.img && p.img !== p.character.img) && !!FACE[charKey(p)]?.bleed;

// รูปใหญ่ (หน้าคาดการณ์): ทุกตัวละครหัวสูงเท่ากัน (headPx) และหน้าอยู่ที่จุดเดียวกัน (cx, cy เป็น px ในกรอบ) — ไม่รู้จักตัวละคร = สูง fallbackH ชิดล่าง
export function bigArtStyle(p, { headPx = 210, cx = 360, cy = 330, fallbackH = 1000 } = {}) {
  const f = p && p.img && p.character && p.character.img && p.img !== p.character.img ? null : FACE[charKey(p)];
  if (!f || !f.hs) return { position: "absolute", bottom: -60, height: fallbackH, width: "auto", maxWidth: "none", left: "50%", transform: "translateX(-50%)" };
  const H = headPx / f.hs, W = H / f.ar;
  return { position: "absolute", maxWidth: "none", width: W, height: H, left: cx - f.fx * W, top: cy - f.fy * H };
}
