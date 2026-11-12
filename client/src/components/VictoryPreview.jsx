// หน้าดูหน้าจบเกม (เฉพาะ dev ไม่ต่อ socket): ?victory=1 (อิสระ) · ?victory=team (ทีม) · ?victory=draw (เสมอ)
//  พารามิเตอร์: n=2..7 (จำนวนผู้เล่น โหมดอิสระ) · size=2|3 (ขนาดทีม) · at=ms (หยุดอนิเมชันไว้ที่เวลานี้ — ไว้แคปจอ)
import { useEffect } from "react";
import VictoryScreen from "./VictoryScreen";

const MUIMI = { id: "muimi", name: "มุยมิ", img: "/characters/muimi/muimi.webp" };
const OBERON = { id: "oberon_summer", name: "โอเบรอน ฤดูร้อน", img: "/characters/oberon(summer)/oberon_summer.webp" };
const COLS = ["#9B4F96", "#9B2D3A", "#3B82C4", "#E5B33B", "#C0392B", "#2E9E4B", "#E86A2B"];
const NAMES = ["Phujimaru", "ฟ้าใส", "Kaito", "มะปราง", "Rin", "ต้นกล้า", "Nova"];

function mk(i, alive, teamId = null) {
  const ch = i % 2 ? OBERON : MUIMI;
  return { id: `p${i}`, name: NAMES[i % 7], position: i + 1, color: COLS[i % 7], alive, teamId, img: ch.img, character: ch };
}

export default function VictoryPreview() {
  const q = new URLSearchParams(location.search);
  const mode = q.get("victory");
  const at = q.get("at");
  useEffect(() => {
    if (at == null) return;
    const id = setTimeout(() => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = Number(at); }), 400);
    return () => clearTimeout(id);
  }, [at]);
  let state;
  if (mode === "team") {
    const size = Math.min(3, Math.max(2, Number(q.get("size")) || 2));
    const teams = ["A", "B", "C"];
    const players = Array.from({ length: size * 3 }, (_, i) => {
      const t = teams[Math.floor(i / size)];
      return mk(i, t === "B", t);
    });
    state = { gameMode: size === 3 ? "trio" : "duo", winningTeamId: "B", players, youId: "p2", roundNumber: 14 };
  } else if (mode === "eos") { // ?victory=eos — PVE สนาม Eos (ดาวท้าทาย + ฉายา)
    const players = Array.from({ length: Number(q.get("n")) || 1 }, (_, i) => mk(i, true, "A"));
    state = { gameMode: "eos", winningTeamId: "A", players, youId: "p0", roundNumber: 31,
      fodlan: { board: { challenges: [{ key: "noLoss", icon: "🔷", name: "เสาไม่หลุดเลย", star: true }, { key: "fast", icon: "⏱️", name: "ชนะภายใน 30 เทิร์น", star: true }, { key: "noDown", icon: "❤️", name: "ไม่มีใครล้ม", star: false }],
        titles: [{ id: "p0", key: "saver", icon: "🕊️", name: "ผู้ช่วยชีวิต", n: 3 }],
        eosSum: { turns: 31, mobDmg: [{ key: "boss", name: "ราชาปีศาจ", n: 41 }, { key: "archer", name: "ปีศาจพลธนู", n: 23 }, { key: "magitek", name: "ทหารเหล็ก", n: 17 }, { key: "hooker", name: "ปีศาจโซ่ลาก", n: 9 }, { key: "swarm", name: "ปีศาจจิ๋ว", n: 6 }],
          deaths: { p0: 2, p1: 0, p2: 3 }, causes: { p0: { boss: 2 }, p2: { archer: 2, boss: 1 } }, elites: { p0: 1, p1: 3 }, bosses: { p1: 1 } } } } };
  } else if (mode === "draw") {
    state = { gameMode: "ffa", winningTeamId: null, players: Array.from({ length: 4 }, (_, i) => mk(i, false)), youId: "p0", roundNumber: 9 };
  } else {
    const n = Math.min(7, Math.max(2, Number(q.get("n")) || 5));
    state = { gameMode: "ffa", winningTeamId: null, players: Array.from({ length: n }, (_, i) => mk(i, i === 0)), youId: "p0", roundNumber: 12 };
  }
  // สรุปผลแมตช์ตัวอย่าง (server/matchStats.js)
  state.matchStats = Object.fromEntries(state.players.map((p, i) => [p.id, { dealt: [14, 9, 6, 11, 3, 7, 5][i % 7], taken: [8, 12, 10, 6, 14, 9, 7][i % 7], kills: [3, 1, 0, 2, 0, 1, 0][i % 7], skills: [6, 4, 3, 5, 2, 4, 1][i % 7] }]));
  return <VictoryScreen state={state} onBackToLobby={() => console.log("backToLobby")} onRematch={() => console.log("rematch")} />;
}
