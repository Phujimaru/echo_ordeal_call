// ============================================================
//  มินิเกมประตูของเฟรดดี้ ฟาซแบร์ (characters/freddy_fazbear.js doorView)
//  ภาพห้องจากผู้ใช้ (room.webp 16:9) · ประตูซ้าย/ขวา = ปุ่ม (กดที่ช่องประตูหรือแผงปุ่มข้างประตู)
//  เป้า (foe): กดปิดประตู → ประตูเหล็กเลื่อนลง · เฟรดดี้: กดเลือกประตูที่จะเข้า → เงาเฟรดดี้ยืนหน้าประตู
//  ผลออก (result): เปิดทั้งสองฝ่าย — blocked = ประตูปิดตรงตัว (กระแทก) · enter = จอดำทันที แล้ว server ตัดเข้าคลิปจัมป์สแกร์
//  เสียงประตู (freddy_door): คนปิดได้ยินตอนกด · คนอื่นได้ยินตอนผลออกแบบปิดทัน · ปิดผิด = ไม่มีเสียง (ไม่ซ้อนคลิป)
//  ไม่มีข้อความอธิบาย (CLAUDE.md) — มีแค่ตัวนับวินาที
// ============================================================
import { useEffect, useRef } from "react";
import { useTick } from "../../tickStore";
import { playSfx } from "../../audio";
import "./freddyDoors.css";

const DOORS = ["left", "right"];

function Clock({ done }) {
  const left = useTick();
  return <div className="fd-clock">{done ? "" : left}</div>;
}

export function FreddyDoors({ door, onPick }) {
  const heard = useRef(false);
  const result = door ? door.result : null;
  useEffect(() => { if (!door) heard.current = false; }, [door]);
  useEffect(() => {
    if (result === "blocked" && !heard.current) { heard.current = true; playSfx("freddy_door"); }
  }, [result]);
  if (!door) return null;
  const { side, close, enter, room, token } = door;
  const mine = side && !result && !door.picked[side];
  const pick = (d) => {
    if (side === "foe") { heard.current = true; playSfx("freddy_door"); }
    onPick(d);
  };
  return (
    <div className={`fd-root ${result ? `is-${result}` : ""}`}>
      <div className="fd-stage" style={{ backgroundImage: `url(${room})` }}>
        {DOORS.map((d) => {
          const shut = close === d;
          const here = enter === d;
          return (
            <div key={d} className={`fd-door fd-${d} ${shut ? "shut" : ""} ${here ? "here" : ""}`}>
              <div className="fd-way">
                {here && <img className="fd-freddy" src={token} alt="" draggable={false} />}
                <div className="fd-shutter"><div className="fd-shut-img" style={{ backgroundImage: `url(${room})` }} /></div>
              </div>
              <button
                type="button"
                className="fd-hit"
                aria-label={d === "left" ? "ประตูซ้าย" : "ประตูขวา"}
                disabled={!mine}
                onClick={() => pick(d)}
              />
              <button
                type="button"
                className={`fd-panel ${side === "foe" ? "foe" : "freddy"}`}
                aria-label={d === "left" ? "ประตูซ้าย" : "ประตูขวา"}
                disabled={!mine}
                onClick={() => pick(d)}
              />
            </div>
          );
        })}
        {result === "enter" && <div className="fd-black" />}
        <div className="fd-vignette" />
        <Clock done={!!result} />
      </div>
    </div>
  );
}
