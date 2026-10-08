// หน้าดูกระดานจริง (Game.jsx) ด้วย state จำลอง — เฉพาะ dev: ?hud=1&game=1
//  ไว้ตรวจว่าแผงตัวเราต่อกับ GameBoard ถูก (เงื่อนไขปุ่ม/สถานะ/การ์ด) โดยไม่ต้องเปิดห้องจริง
//  phase=PLAYING|ATTACK (ATTACK = เราเป็นฝ่ายโจมตี → แผงเลื่อนลง) · arena=1..3 · n=1..6
//  journey=0 = โต๊ะแบบเดิม · st=many = สถานะเยอะ · drawer=1 = กดเปิดลิ้นชักสถานะให้หลังโหลด
import { useEffect } from "react";
import Game from "../Game";
import { measureHud } from "./hudMeasure";

const COLS = ["#3d8bd9", "#9b4f96", "#e0812f", "#2fa39a", "#d2455b", "#6b7fd6", "#c49a2c"];
const skill = (name, cost, img) => ({ name, cost, desc: `ก่อนเปิดไพ่: ผลของ ${name}`, img });

function player(i, me) {
  return {
    id: `p${i}`,
    name: me ? "เรา" : `ผู้เล่น ${i + 1}`,
    color: COLS[i % 7],
    img: "/characters/muimi/muimi.webp",
    connected: true,
    alive: true,
    locked: false,
    character: {
      id: "muimi",
      name: me ? "มุยมิ" : `คู่แข่ง ${i}`,
      passive: { name: "ติดตัว", desc: "สกิลติดตัว" },
      basic: skill("เสบียงฉุกเฉิน", 0, "/characters/muimi/muimi_skill1.webp"),
      secondary: skill("ดาบสนิม", 4, "/characters/muimi/muimi_skill2.png"),
      ultimate: skill("ดาบสะบั้นหอคอยสวรรค์", 8, "/characters/muimi/muimi_skill3.webp"),
    },
    hp: me ? 4 : 5, maxHp: 7, armor: 2, maxArmor: 3, tempHp: me ? 1 : 0, shield: me ? 1 : 0,
    skillPoints: me ? 5 : 3, maxSkill: 8,
    statuses: me ? { poison: 2, atkUp: 3, dodge: 2, stun: 1, mark: 3, burn: 2, } : { poison: 1 },
    statusAmt: me ? { atkUp: 1 } : {},
    cards: me ? [{ value: 7, color: "red" }, { special: "king" }, { value: 4, color: "blue" }] : [],
    score: me ? 18 : null,
    inventory: me ? [{ id: "a" }, { id: "b" }] : [],
    gold: 12,
    teamId: null,
  };
}

export default function GamePreview() {
  const q = new URLSearchParams(location.search);
  const n = Math.min(6, Math.max(1, Number(q.get("n") || 6)));
  const area = Math.min(3, Math.max(1, Number(q.get("arena") || 1)));
  const phase = q.get("phase") || "PLAYING";
  const players = Array.from({ length: n + 1 }, (_, i) => player(i, i === 0));
  if (q.get("st") === "many") {
    Object.assign(players[0].statuses, { bleed: 3, regen: 2, shock: 2, numb: 1, curse: 4, silence: 2, invert: 3, decay: 2 });
  }
  useEffect(() => {
    if (q.get("drawer") !== "1") return undefined;
    const t = setTimeout(() => document.querySelector(".hud-drawer-tab")?.click(), 600);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // ?measure=1 = วัดกล่องหลังการ์ดผู้เล่นหล่นลงที่นั่งเสร็จ
  useEffect(() => {
    if (q.get("measure") !== "1") return undefined;
    const t = setTimeout(measureHud, 8000);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const state = {
    gameState: phase,
    cutscene: null,
    attack: null,
    youId: "p0",
    players,
    roundNumber: 3,
    cycle: q.get("night") === "1" ? "night" : "day",
    // journey=0 = โต๊ะแบบเดิม (ไม่มีสนาม 2.5D) ไว้ตรวจการ์ดคู่แข่งนอกสนาม
    journey: q.get("journey") === "0" ? null : { area, name: "อาณาจักรแห่งจุดเริ่มต้น", turnsLeft: 7, night: q.get("night") === "1", day: "กลางวัน", nightDesc: "กลางคืน" },
    gameMode: "ffa",
    attackerId: phase === "ATTACK" ? "p0" : null,
    shop: [],
    deckLedger: [],
  };
  return <Game state={state} lowQ={q.get("lowq") === "1"} skillConfirmOn />;
}
