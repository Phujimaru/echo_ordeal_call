// เฉพาะ dev: ?court=1 — ลองเล่นฉากศาลของนารุโฮโดะ (GRID_PLAN §7.37) กับ AI
//  เลือกจำเลย/ฝ่ายค้าน/โหมด/ฝั่งที่เล่นได้ · บันทึกเหตุการณ์ = แมตช์ปลอม (mockMatch) ใหม่ทุกครั้งที่กดสุ่ม
import { useMemo, useState } from "react";
import CourtScene from "./CourtScene";
import { COURT_ROSTER } from "./courtRoster";
import { mockMatch, shuffle } from "./courtCase";

const POOL = COURT_ROSTER.filter((c) => c.id !== "naruhodo_ryuichi");
const byId = (id) => POOL.find((c) => c.id === id) || POOL[0];
const sel = { font: "500 14px Kanit, sans-serif", padding: "5px 8px", background: "#1d1813", color: "#fbf6ea", border: "1px solid #5b4a36", borderRadius: 6 };

export default function CourtPreview() {
  const [defId, setDef] = useState("dio_brando");
  const [mode, setMode] = useState("pvp");
  const [role, setRole] = useState("L");
  const [seed, setSeed] = useState(0);
  const cast = useMemo(() => {
    const d = byId(defId);
    const rest = shuffle(POOL.filter((c) => c.id !== d.id));
    const counsel = mode === "duo" ? rest[0] : null, teammate = mode === "duo" ? rest[1] : null;
    const gallery = mode === "pvp" ? rest.slice(2, 7) : [];
    const victims = mode === "pvp" ? gallery : [teammate, { name: "นารุโฮโดะ" }];
    return { d, counsel, teammate, gallery, events: mockMatch(d, victims) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defId, mode, seed]);
  return (
    <div style={{ minHeight: "100vh", background: "#14100c", padding: "16px", boxSizing: "border-box" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 12 }}>
        <select style={sel} value={defId} onChange={(e) => setDef(e.target.value)}>
          {POOL.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select style={sel} value={mode} onChange={(e) => setMode(e.target.value)}><option value="pvp">PVP</option><option value="duo">Duo</option></select>
        <select style={sel} value={role} onChange={(e) => setRole(e.target.value)}><option value="L">ทนาย</option><option value="D">จำเลย</option></select>
        <button style={{ ...sel, cursor: "pointer" }} onClick={() => setSeed((n) => n + 1)}>🎲</button>
      </div>
      <CourtScene key={`${defId}-${mode}-${role}-${seed}`} defendant={cast.d} counsel={cast.counsel} teammate={cast.teammate}
        gallery={cast.gallery} mode={mode} role={role} events={cast.events} />
    </div>
  );
}
