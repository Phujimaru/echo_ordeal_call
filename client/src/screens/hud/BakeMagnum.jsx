// เค็นโซ ซุกะ — ปืน Bake Magnum ที่เล่นได้จริง (characters/kenzo_suga.js · GRID_PLAN §7.44) — จอคอม/แท็บเล็ต
//  me.kenzo = { rider, henshinShown }
//  ร่างคน (ตามเรื่อง — ผู้ใช้สั่ง 2026-11-24):
//    ลาก (หรือคลิก) การ์ด Gochizo เข้าปากปืน → การ์ดหมุนนอน (ทวนเข็ม 90° ด้านล่างการ์ดหันไปทางขวา — ตามที่ผู้ใช้วาด)
//    → กดปืนให้ "งับ" 3 ครั้ง (งับแล้วอ้าคืน) → งับครั้งที่ 3 = แปลงร่างทันที (useSkill basic form "henshin" → คลิปเล่นเลย)
//  ร่างไรเดอร์: กดปืน = อ้าปาก → ดึงการ์ดออก → คืนร่าง (form "revert")
//  อ้าปาก = รูป bake_magnum_standby (ขากรรไกรบนพับขึ้นไปด้านหลัง — ผู้ใช้ชี้ 2026-11-24) · ปิดปาก = bake_magnum_full
//    วางทับกันโดยวัดกรอบเหลืองของตัวปืน: standby กรอบ x 77–131 y 103–183 (334×234) ↔ full x 456–574 y 95–268 (801×375)
//    → standby ขยาย ×1.734 ของกรอบปืน 640 วางที่ (230, −103) · เขี้ยวล่างทั้งสองรูปตรงกัน (ขากรรไกรล่างอยู่ที่เดิม)
//  การ์ดในปากปืนวางไว้ "หลัง" รูปปืน — bake_magnum_full เจาะการ์ดเดิมในรูปออกแล้ว เขี้ยวจึงบังการ์ดเหมือนของจริง
//  ช่องการ์ดในรูป full กลาง ~(0.47, 0.52)
//  เสียงใส่การ์ด/งับมีทุกครั้ง · งับครั้งที่ 3 ที่มีคลิปแปลงร่าง = ไม่มีเสียง (กฎ: ห้ามเสียงทับวีดีโอ) · ไม่มีข้อความใน UI
import { useCallback, useEffect, useRef, useState } from "react";
import { playSfx } from "../../audio";
import "./bakeMagnum.css";

const DIR = "/characters/kenzo_suga";
const IMG = { open: `${DIR}/bake_magnum_standby.webp`, full: `${DIR}/bake_magnum_full.webp`, card: `${DIR}/gochizo.webp` };
const OPEN = { left: 230, top: -103, width: 579, height: 406 }; // รูปอ้าปากบนกรอบปืน (ดูหัวไฟล์)
const W = 640, H = 300; // กรอบปืน (สัดส่วนรูป 2.13 : 1)
const SLOT = { x: 0.47 * W, y: 0.52 * H }; // กลางปากปืน
const CARD_W = 84; // ความกว้างการ์ดก่อนหมุน (นอนแล้วกว้าง ~118 = ช่วงฟันในรูป)
const REST = { x: W + 150, y: H * 0.68 }; // การ์ดวางรอข้างปืน (ตั้งตรง)
const SNAP = 110; // ปล่อยใกล้ปากปืนเท่านี้ = เสียบ
const BITES = 3;
const BITE_MS = 230; // งับแล้วอ้าคืน

export default function BakeMagnum({ kenzo, onFire, onClose }) {
  // เสียงใส่การ์ด/งับเล่นทุกครั้ง (ผู้ใช้สั่ง 2026-11-24 — เสียงเหล็กกระทบแบบในเรื่อง) · งับครั้งที่ 3 ที่มีคลิป (ครั้งแรกของเกม) = เงียบ วีดีโอเล่นทันที
  const firstClip = !kenzo.rider && !kenzo.henshinShown;
  const sfx = useCallback((k) => playSfx(k), []);
  // phase: idle (รอการ์ด) · insert (การ์ดกำลังเข้า) · open (การ์ดอยู่ในปาก รองับ) · bite (งับอยู่) · done (งับครบ)
  //        armed (ร่างไรเดอร์ ปากปิด) · opening (อ้าปาก) · eject (ดึงการ์ดออก)
  const [phase, setPhase] = useState(kenzo.rider ? "armed" : "idle");
  const [bites, setBites] = useState(0);
  const [drag, setDrag] = useState(null);
  const box = useRef(null);
  const timers = useRef([]);
  const later = (ms, fn) => timers.current.push(setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const busy = phase === "insert" || phase === "bite" || phase === "done" || phase === "opening" || phase === "eject";

  const insert = useCallback(() => {
    if (phase !== "idle") return;
    setDrag(null);
    setPhase("insert");
    sfx("bake_card");
    later(420, () => setPhase("open"));
  }, [phase, sfx]);

  const press = useCallback(() => {
    if (phase === "open") {
      const n = bites + 1;
      setBites(n);
      setPhase(n >= BITES ? "done" : "bite");
      if (n >= BITES) { if (!firstClip) sfx("bake_chomp"); onFire("henshin"); later(120, onClose); return; } // งับครั้งที่ 3: ครั้งแรกคลิปเล่นทันที (ไม่มีเสียงทับ)
      sfx("bake_chomp");
      later(BITE_MS, () => setPhase("open"));
    } else if (phase === "armed") {
      setPhase("opening");
      sfx("bake_open");
      later(260, () => setPhase("eject"));
      later(760, () => { onFire("revert"); onClose(); });
    }
  }, [phase, bites, sfx, firstClip, onFire, onClose]);

  // ลากการ์ด: หมุนตามระยะที่เข้าใกล้ปากปืน · ปล่อยใกล้ = เสียบ · ไกล = กลับที่เดิม · คลิกเฉยๆ = เสียบ
  const local = (e) => {
    const r = box.current.querySelector(".bm-stage").getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onCardDown = (e) => {
    if (phase !== "idle") return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const s = local(e);
    setDrag({ x: REST.x, y: REST.y, sx: s.x, sy: s.y, moved: false });
  };
  const onCardMove = (e) => {
    if (!drag) return;
    const s = local(e);
    const dx = s.x - drag.sx, dy = s.y - drag.sy;
    setDrag((d) => d && { ...d, x: REST.x + dx, y: REST.y + dy, moved: d.moved || Math.hypot(dx, dy) > 6 });
  };
  const onCardUp = () => {
    if (!drag) return;
    if (!drag.moved || Math.hypot(drag.x - SLOT.x, drag.y - SLOT.y) < SNAP) insert();
    else setDrag(null);
  };

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !busy) onClose(); };
    const onDown = (e) => { if (!busy && box.current && !box.current.contains(e.target)) onClose(); };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onDown, true);
    return () => { window.removeEventListener("keydown", onKey, true); window.removeEventListener("pointerdown", onDown, true); };
  }, [busy, onClose]);

  // ปากปืนปิด = รูป full · เปิด = รูป bake_magnum · การ์ดอยู่หลังปืนทั้งสองแบบ (ช่องเขี้ยวโปร่งใส)
  const closed = phase === "bite" || phase === "done" || phase === "armed";
  const inMouth = phase === "open" || phase === "opening" || closed; // การ์ดอยู่หลังปืน เห็นผ่านช่องเขี้ยว
  const card = (() => {
    if (phase === "idle" && drag) {
      const d = Math.hypot(drag.x - SLOT.x, drag.y - SLOT.y);
      const k = Math.max(0, Math.min(1, 1 - (d - SNAP * 0.5) / (REST.x - SLOT.x)));
      return { x: drag.x, y: drag.y, rot: -90 * k, s: 1, show: true, lift: true };
    }
    if (phase === "idle") return { x: REST.x, y: REST.y, rot: 0, s: 1, show: true };
    if (phase === "eject") return { x: REST.x, y: REST.y - 30, rot: 0, s: 1, show: true, out: true };
    return { x: SLOT.x, y: SLOT.y, rot: -90, s: 1, show: true };
  })();
  const cardH = CARD_W * 1.4;

  return (
    <div className="bm-wrap" ref={box}>
      <div className="bm-stage" style={{ width: W + 220, height: H }}>
        <img
          className={`bm-card ${inMouth ? "behind" : ""} ${card.lift ? "lift" : ""} ${card.out ? "out" : ""} ${phase === "idle" ? "ready" : ""}`}
          src={IMG.card} alt="" draggable={false}
          style={{
            width: CARD_W, height: cardH,
            opacity: card.show ? 1 : 0,
            transform: `translate(${card.x - CARD_W / 2}px, ${card.y - cardH / 2}px) rotate(${card.rot}deg) scale(${card.s})`,
            transition: drag || inMouth || closed ? "none" : undefined,
          }}
          onPointerDown={onCardDown} onPointerMove={onCardMove} onPointerUp={onCardUp} onPointerCancel={() => setDrag(null)}
        />
        <div className={`bm-gun ${phase} ${phase === "open" ? "ready" : ""}`} style={{ width: W, height: H }} onPointerDown={(e) => { e.preventDefault(); press(); }} role="button" aria-label="Bake Magnum">
          <img className={`bm-img bm-open ${closed ? "" : "on"}`} src={IMG.open} alt="" draggable={false} style={OPEN} />
          <img className={`bm-img ${closed ? "on" : ""}`} src={IMG.full} alt="" draggable={false} />
          {(phase === "bite" || phase === "done") && <div key={bites} className="bm-chomp" style={{ left: SLOT.x, top: SLOT.y }} />}
          {phase === "open" && bites > 0 && <div className="bm-glow" style={{ left: SLOT.x, top: SLOT.y, opacity: 0.35 + bites * 0.3 }} />}
        </div>
      </div>
    </div>
  );
}
