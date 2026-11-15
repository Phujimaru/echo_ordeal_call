// ============================================================
//  StageBits — ชิ้น UI เล็กของ BoardStage: คิว 2 คนถัดไป (UpNext) · ป้ายโบนัสในฉากตี (AttackTags)
//  ย้ายมาจาก BoardStage.jsx (โค้ดเดิม)
// ============================================================
import { useEffect, useState } from "react";
import { faceStyle } from "../charFace";
import { sameSide } from "../../duo";

// คิว 2 คนถัดไป (ขวา ใต้ปุ่มกล้อง — ผู้ใช้สั่ง 2026-10-22): รูปหกเหลี่ยม + ชื่อ · คนที่ถึงตา/หลุดคิว เลื่อนขึ้นแล้วจางหาย ที่เหลือเลื่อนขึ้นตาม
//  แถวเรียงตาม id คงที่ (DOM ไม่สลับที่ — transition ไม่สะดุด) · ตำแหน่งจริงมาจาก --slot
const QUEUE_OUT_MS = 600;
export function UpNext({ ids, byId, me, show }) {
  const sig = ids.join(",");
  const [prev, setPrev] = useState({ sig: "", ids: [] });
  const [gone, setGone] = useState([]); // { id, p } — คนที่เพิ่งหลุดคิว (เล่นแอนิเมชันออก)
  if (sig !== prev.sig) {
    const out = prev.ids.filter((id) => !ids.includes(id) && byId[id]).map((id) => ({ id, p: byId[id] }));
    setPrev({ sig, ids });
    setGone((g) => [...g.filter((x) => !ids.includes(x.id) && !out.some((o) => o.id === x.id)), ...out]);
  }
  useEffect(() => {
    if (!gone.length) return undefined;
    const t = setTimeout(() => setGone([]), QUEUE_OUT_MS);
    return () => clearTimeout(t);
  }, [gone]);
  const rows = [
    ...gone.filter((g) => !ids.includes(g.id)).map((g) => ({ id: g.id, p: g.p, slot: -1 })),
    ...ids.map((id, i) => ({ id, p: byId[id], slot: i })),
  ].filter((r) => r.p).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  if (!rows.length) return null;
  return (
    <div className="bs-queue" data-show={show ? "true" : "false"} aria-hidden="true">
      {rows.map(({ id, p, slot }) => (
        <div key={id} className="bs-q" data-out={slot < 0 ? "true" : "false"} style={{ "--slot": slot, "--bs-c": p.color || "#7fb8e6" }}>
          <div className="bs-q-plate"><b>{me && sameSide(p, me) ? "คุณ" : p.name}</b></div>
          <div className="bs-q-hexw">
            <div className="bs-actor-frame" />
            <div className="bs-actor-face"><img src={p.img} alt="" style={faceStyle(p)} onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} /></div>
          </div>
        </div>
      ))}
    </div>
  );
}

//  props เพิ่ม (ดีไซน์ UI ใหม่): atkSignal = ตัวเลขเปลี่ยน = ปุ่ม "โจมตี" ถูกกด · onAttackables(ids) = ศัตรูที่ตาเราตีถึง (เดินแล้วตีได้)
//   onOverlay(bool) = หน้าคาดการณ์เปิด/ปิด (Game ซ่อน HUD ทั้งหมด) · onCall(bool) = ฉากเต็มจอกำลังเล่น
// ป้ายโบนัสในฉากตี — ผลที่มีต่อการตีครั้งนี้จาก server (การ์ดฉากตี skills: side "atk" = ฝั่งผู้ตี · "def" = ฝั่งเป้า)
//  เช่น คริติคอล · แท่นพลัง · ม่านแห่งราตรี · มีด +1 · คุ้มครอง · เปราะบาง · ขึ้นตอนปะทะแล้วค้างจนจบฉาก
export function AttackTags({ a, byId }) {
  const all = a.skills || [];
  const atk = all.filter((s) => (s.side ? s.side === "atk" : s.by === a.byName));
  const def = all.filter((s) => (s.side ? s.side === "def" : s.by !== a.byName));
  if (!atk.length && !def.length) return null;
  const col = (list, side, name, color) => list.length > 0 && (
    <div className="bs-tags-col" data-side={side} style={{ "--bs-c": color || "#7fb8e6" }}>
      <b className="bs-tags-name">{name}</b>
      {list.map((s, i) => <span key={i} className="bs-tag" style={{ "--i": i }}>{s.name}</span>)}
    </div>
  );
  const by = byId[a.byId], tg = byId[a.targetId];
  return (
    <div className="bs-tags" aria-live="polite">
      {col(atk, "atk", a.byName, a.byColor || (by && by.color))}
      {col(def, "def", a.targetName, a.targetColor || (tg && tg.color))}
    </div>
  );
}
