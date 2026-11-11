// ?freddy=foe | freddy | watch = หน้าดูมินิเกมประตูของเฟรดดี้ (เฉพาะ dev) — กดประตูแล้วผลออกตามที่สุ่มให้อีกฝ่าย
import { useState } from "react";
import { FreddyDoors } from "./FreddyDoors";
import { publishTick } from "../../tickStore";

const DIR = "/characters/freddy_fazbear";
export default function FreddyDoorsPreview() {
  const side = new URLSearchParams(location.search).get("freddy") || "foe";
  const [d, setD] = useState({ side: side === "watch" ? null : side, picked: { freddy: false, foe: false }, result: null, close: null, enter: null, room: `${DIR}/room.webp`, token: `${DIR}/freddy_token.webp` });
  publishTick(10);
  const pick = (door) => {
    const other = Math.random() < 0.5 ? "left" : "right";
    const close = side === "foe" ? door : other, enter = side === "freddy" ? door : other;
    setD((s) => ({ ...s, picked: { freddy: true, foe: true }, [side === "foe" ? "close" : "enter"]: door }));
    setTimeout(() => setD((s) => ({ ...s, close, enter, result: close === enter ? "blocked" : "enter" })), 900);
    setTimeout(() => location.reload(), 4500);
  };
  return <FreddyDoors door={d} onPick={pick} />;
}
