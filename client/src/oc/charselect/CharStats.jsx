import { useEffect, useMemo, useState } from "react";
import { socket } from "../../socket";
import { clickSound } from "../../audio";
import { FALLBACK } from "../../data/avatars";

// แถบสถิติตัวละคร (หน้าเลือกตัว) — ข้อมูลจากเครื่อง host (server/charStats.js ผ่าน socket "charStats")
//  แถว = ตัวละคร · เลือก (ครั้งที่ลงแมตช์) · ชนะ · อัตราชนะ (ชนะ ÷ เลือก) · กรองหมวดได้ · กดหัวคอลัมน์ = เรียงตามคอลัมน์นั้น
//  ไม่มีข้อความอธิบาย (CLAUDE.md) — ชื่อ ตัวเลข และแถบเท่านั้น
const pct = (s) => (s && s.picks > 0 ? (s.wins / s.picks) * 100 : null);

// รูปหน้าเล็กในแถว — โหลดไม่ได้ = อีโมจิสำรอง (เหมือนการ์ดในวง)
function Face({ c }) {
  const [bad, setBad] = useState(false);
  return (
    <span className="cst-face" aria-hidden="true">
      {c.img && !bad
        ? <img src={c.img} alt="" loading="lazy" decoding="async" onError={() => setBad(true)} />
        : <span>{FALLBACK[c.avatar] || "🙂"}</span>}
    </span>
  );
}

export default function CharStats({ groups, initialGroup = null, onClose }) {
  const [stats, setStats] = useState(null);
  const [group, setGroup] = useState(initialGroup);
  const [sort, setSort] = useState("rate"); // rate | picks | wins

  useEffect(() => {
    const on = (data) => setStats(data && typeof data === "object" ? data : {});
    socket.on("charStats", on);
    socket.emit("charStats");
    return () => socket.off("charStats", on);
  }, []);

  const rows = useMemo(() => {
    const list = groups
      .filter((g) => !group || g.key === group)
      .flatMap((g) => g.chars.map((c) => ({ c, g, s: (stats && stats[c.id]) || { picks: 0, wins: 0 } })));
    const key = (r) => (sort === "picks" ? r.s.picks : sort === "wins" ? r.s.wins : pct(r.s) ?? -1);
    return list.sort((a, b) => key(b) - key(a) || b.s.picks - a.s.picks || b.s.wins - a.s.wins);
  }, [groups, group, stats, sort]);

  const pickGroup = (k) => { clickSound(); setGroup(k); };
  const pickSort = (k) => { clickSound(); setSort(k); };
  const head = (k, label) => (
    <button type="button" className={`cst-h${sort === k ? " on" : ""}`} aria-pressed={sort === k} onClick={() => pickSort(k)}>
      {label}{sort === k && <span aria-hidden="true"> ▾</span>}
    </button>
  );

  return (
    <section className="cst" role="dialog" aria-label="สถิติ">
      <header className="cst-top">
        <h2 className="cst-title">สถิติ</h2>
        <button type="button" className="cst-x" aria-label="ปิด" onClick={() => { clickSound(); onClose(); }}>✕</button>
      </header>

      <nav className="cst-filter" aria-label="หมวด">
        <button type="button" className={`cst-chip${group ? "" : " on"}`} aria-pressed={!group} style={{ "--c": "#3D8BD9" }} onClick={() => pickGroup(null)}>ทั้งหมด</button>
        {groups.map((g) => (
          <button key={g.key} type="button" className={`cst-chip${group === g.key ? " on" : ""}`} aria-pressed={group === g.key} style={{ "--c": g.color }} onClick={() => pickGroup(g.key)}>
            {g.label}
          </button>
        ))}
      </nav>

      <div className="cst-cols">
        <span className="cst-h name">ตัวละคร</span>
        {head("picks", "เลือก")}
        {head("wins", "ชนะ")}
        {head("rate", "อัตราชนะ")}
      </div>

      <ol className="cst-list" aria-busy={!stats}>
        {rows.map(({ c, g, s }) => {
          const r = pct(s);
          return (
            <li key={c.id} className="cst-row" style={{ "--c": g.color }}>
              <Face c={c} />
              <span className="cst-name">{c.name}</span>
              <span className="cst-num">{s.picks}</span>
              <span className="cst-num">{s.wins}</span>
              <span className="cst-rate">
                <span className="cst-bar" aria-hidden="true"><i style={{ width: `${r ?? 0}%` }} /></span>
                <b>{r == null ? "—" : `${r % 1 === 0 ? r : r.toFixed(1)}%`}</b>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
