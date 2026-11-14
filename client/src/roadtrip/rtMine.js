// Road Trip — ของ "เครื่องนี้" ที่จุดพัก (ไม่มี import — เทสต์ฝั่ง node อ่านได้: tests/roadtrip-qa.test.js)
//  ระบบคู่ (เคท & เอมิลิโกะ): ผู้เล่น 1 คน = 2 ตัว (ตัวที่สอง duoOf = id เจ้าของ) · fx ของจุดพักใส่ id ของ "ตัวที่ทำ"
//  → หน้าต่างส่วนตัว (อู่/ร้าน) เปิดเฉพาะเครื่องที่เป็นเจ้าของตัวนั้น ไม่ใช่ทุกเครื่อง

// id ทุกตัวของผู้เล่นเครื่องนี้ (ตัวเอง + ตัวที่สองของระบบคู่)
export function rtOwnIds(players, youId) {
  const out = new Set();
  if (!youId) return out;
  out.add(youId);
  for (const p of players || []) if (p && p.duoOf === youId) out.add(p.id);
  return out;
}

// fx ที่ต้องเปิดหน้าต่างส่วนตัวบนเครื่องนี้ (garage = หน้าอู่ · shop = หน้าร้าน) — fx ของคนอื่นข้ามเสมอ
//  seen = Set ของ key ที่จัดการไปแล้ว (แก้ในที่) · คืน [{ k: "garage" | "stash" | "campfire" } | { k: "shop", shopId }]
// stash = ยืนติดรถตู้ที่จอดแล้ว (เปิดกระเป๋า + กล่องรถ) · camp = แผงของจุดในแคมป์
const POPUP_KINDS = new Set(["garage", "shop", "stash", "camp"]); // camp = แผงของจุดในแคมป์ (spot: cook/logs/canoe/mallow/scope/chop/fish/repair)
export function rtMyPopups(fx, own, seen) {
  const out = [];
  for (const f of Array.isArray(fx) ? fx : []) {
    if (!f || !POPUP_KINDS.has(f.k)) continue;
    const k = f.key ?? JSON.stringify(f);
    if (seen.has(k)) continue;
    seen.add(k);
    if (f.pid == null || !own.has(f.pid)) continue;
    out.push(f.k === "shop" ? { k: "shop", shopId: f.shopId || null } : f.k === "camp" ? { k: "camp", spot: f.spot || null } : { k: f.k });
  }
  return out;
}
