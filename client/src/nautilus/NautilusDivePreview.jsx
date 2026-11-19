// dev: ?ntdive=start | ?ntdive=advance&from=7&to=8 (&whale=0) · ?ntdive=advance&from=11&to=12 = ฉากออร่ากลืนสนาม (NtDataSurge) — ดูฉากดำน้ำของ Nautilus (NautilusDive.jsx) วนซ้ำทุกครั้งที่จบ
import { useState } from "react";
import NautilusDive from "./NautilusDive";
import NtDataSurge from "./NtDataSurge";

export default function NautilusDivePreview() {
  const q = new URLSearchParams(location.search), mode = q.get("ntdive") === "start" ? "start" : "advance";
  const from = Number(q.get("from")) || 7, to = Number(q.get("to")) || (mode === "start" ? 7 : 8), dur = Number(q.get("ms")) || 9000;
  const [n, setN] = useState(0);
  const again = () => setTimeout(() => setN((v) => v + 1), 800);
  if (mode === "advance" && to === 12) return <div style={{ position: "fixed", inset: 0, background: "#000" }}><NtDataSurge key={n} to={12} durationMs={dur} onDone={again} /></div>;
  return <div style={{ position: "fixed", inset: 0, background: "#000" }}><NautilusDive key={n} mode={mode} from={from} to={to} whale={q.get("whale") !== "0"} durationMs={dur} onDone={() => setTimeout(() => setN((v) => v + 1), 800)} /></div>;
}
