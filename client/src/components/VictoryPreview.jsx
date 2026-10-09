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
  } else if (mode === "draw") {
    state = { gameMode: "ffa", winningTeamId: null, players: Array.from({ length: 4 }, (_, i) => mk(i, false)), youId: "p0", roundNumber: 9 };
  } else {
    const n = Math.min(7, Math.max(2, Number(q.get("n")) || 5));
    state = { gameMode: "ffa", winningTeamId: null, players: Array.from({ length: n }, (_, i) => mk(i, i === 0)), youId: "p0", roundNumber: 12 };
  }
  return <VictoryScreen state={state} onBackToLobby={() => console.log("backToLobby")} />;
}
