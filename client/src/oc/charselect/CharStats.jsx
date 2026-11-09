import { Fragment, useEffect, useMemo, useState } from "react";
import { socket } from "../../socket";
import { clickSound } from "../../audio";
import { FALLBACK } from "../../data/avatars";

// แถบสถิติตัวละคร (หน้าเลือกตัว) — ข้อมูลจากเครื่อง host (server/charStats.js ผ่าน socket "charStats")
//  แท็บ "ตัวละคร": แถว = ตัวละคร · เลือก · ชนะ · อัตราชนะ · กรองหมวด · กดหัวคอลัมน์ = เรียง · กดแถว = ตัวต่อตัว (เจอใคร กี่ครั้ง ชนะกี่ %)
//  แท็บ "ประวัติ": แมตช์ล่าสุด (เวลา · โหมด · จำนวนเทิร์น · ผู้เล่น/ตัวละคร/ผล)
//  ไม่มีข้อความอธิบาย (CLAUDE.md) — ชื่อ ตัวเลข และแถบเท่านั้น
const pct = (s) => (s && s.picks > 0 ? (s.wins / s.picks) * 100 : null);
// สมดุล (ผู้ใช้สั่ง 2026-11-09): เทียบอัตราชนะกับค่าเฉลี่ยของทุกตัว — เล่นแล้วอย่างน้อย BAL_MIN ครั้ง และห่างเกิน BAL_GAP จุด = แรงไป ▲ / อ่อนไป ▼
const BAL_MIN = 5;
const BAL_GAP = 15;
const pctText = (r) => (r == null ? "—" : `${r % 1 === 0 ? r : r.toFixed(1)}%`);
const MODE_LABEL = { ffa: "อิสระ", duo: "คู่หู", trio: "สหายทั้ง 3 เอ๋ย", moon: "Moon Cell" };
const WORLD_LABEL = { earth: "Origin", fodlan: "Fodlan", colony: "Colony", moon: "ดวงจันทร์" };

// ข้อมูลเก่า (ก่อนมีประวัติ) = { [id]: stats } ตรงๆ
function normalize(data) {
  if (!data || typeof data !== "object") return { chars: {}, history: [], matchups: {} };
  if (data.chars) return { chars: data.chars || {}, history: Array.isArray(data.history) ? data.history : [], matchups: data.matchups || {} };
  return { chars: data, history: [], matchups: {} };
}

// รูปหน้าเล็กในแถว — โหลดไม่ได้ = อีโมจิสำรอง (เหมือนการ์ดในวง)
function Face({ c, small = false }) {
  const [bad, setBad] = useState(false);
  return (
    <span className={`cst-face${small ? " sm" : ""}`} aria-hidden="true">
      {c && c.img && !bad
        ? <img src={c.img} alt="" loading="lazy" decoding="async" onError={() => setBad(true)} />
        : <span>{(c && FALLBACK[c.avatar]) || "🙂"}</span>}
    </span>
  );
}

function when(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p2 = (n) => String(n).padStart(2, "0");
  return `${p2(d.getDate())}/${p2(d.getMonth() + 1)} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

export default function CharStats({ groups, initialGroup = null, onClose }) {
  const [raw, setRaw] = useState(null);
  const [tab, setTab] = useState("chars"); // chars | history
  const [group, setGroup] = useState(initialGroup);
  const [sort, setSort] = useState("rate"); // rate | picks | wins
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    const on = (data) => setRaw(normalize(data));
    socket.on("charStats", on);
    socket.emit("charStats");
    return () => socket.off("charStats", on);
  }, []);
  const stats = raw ? raw.chars : null;

  const byId = useMemo(() => {
    const m = {};
    for (const g of groups) for (const c of g.chars) m[c.id] = { c, g };
    return m;
  }, [groups]);

  // อัตราชนะเฉลี่ยทั้งหมด (ชนะรวม ÷ เลือกรวม) — ฐานเทียบของสีเตือน
  const avg = useMemo(() => {
    let w = 0, n = 0;
    for (const s of Object.values(stats || {})) { w += s.wins || 0; n += s.picks || 0; }
    return n > 0 ? (w / n) * 100 : null;
  }, [stats]);
  const balOf = (s) => {
    const r = pct(s);
    if (avg == null || r == null || s.picks < BAL_MIN) return null;
    return r >= avg + BAL_GAP ? "up" : r <= avg - BAL_GAP ? "down" : null;
  };
  const [onlyBal, setOnlyBal] = useState(false);

  const rows = useMemo(() => {
    const list = groups
      .filter((g) => !group || g.key === group)
      .flatMap((g) => g.chars.map((c) => ({ c, g, s: (stats && stats[c.id]) || { picks: 0, wins: 0 } })))
      .filter((r) => !onlyBal || balOf(r.s));
    const key = (r) => (sort === "picks" ? r.s.picks : sort === "wins" ? r.s.wins : pct(r.s) ?? -1);
    return list.sort((a, b) => key(b) - key(a) || b.s.picks - a.s.picks || b.s.wins - a.s.wins);
  }, [groups, group, stats, sort, onlyBal, avg]); // eslint-disable-line react-hooks/exhaustive-deps

  // ตัวต่อตัวของตัวที่เปิดอยู่: [{ id, games, wins }] เรียงตามจำนวนที่เจอ
  const versus = useMemo(() => {
    if (!openId || !raw) return [];
    const out = [];
    for (const [k, m] of Object.entries(raw.matchups)) {
      const [a, b] = k.split("|");
      if (a === openId && m.games > 0) out.push({ id: b, games: m.games, wins: m.wins });
    }
    return out.sort((x, y) => y.games - x.games || y.wins / y.games - x.wins / x.games);
  }, [openId, raw]);

  const pickTab = (k) => { clickSound(); setTab(k); };
  const pickGroup = (k) => { clickSound(); setGroup(k); };
  const pickSort = (k) => { clickSound(); setSort(k); };
  const toggle = (id) => { clickSound(); setOpenId((o) => (o === id ? null : id)); };
  const head = (k, label) => (
    <button type="button" className={`cst-h${sort === k ? " on" : ""}`} aria-pressed={sort === k} onClick={() => pickSort(k)}>
      {label}{sort === k && <span aria-hidden="true"> ▾</span>}
    </button>
  );

  return (
    <section className="cst" role="dialog" aria-label="สถิติ">
      <header className="cst-top">
        <h2 className="cst-title">สถิติ</h2>
        <div className="cst-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "chars"} className={`cst-tab${tab === "chars" ? " on" : ""}`} onClick={() => pickTab("chars")}>ตัวละคร</button>
          <button type="button" role="tab" aria-selected={tab === "history"} className={`cst-tab${tab === "history" ? " on" : ""}`} onClick={() => pickTab("history")}>
            ประวัติ{raw && raw.history.length > 0 && <span className="cst-tab-n">{raw.history.length}</span>}
          </button>
        </div>
        <button type="button" className="cst-x" aria-label="ปิด" onClick={() => { clickSound(); onClose(); }}>✕</button>
      </header>

      {tab === "chars" ? (
        <>
          <nav className="cst-filter" aria-label="หมวด">
            <button type="button" className={`cst-chip${group ? "" : " on"}`} aria-pressed={!group} style={{ "--c": "#3D8BD9" }} onClick={() => pickGroup(null)}>ทั้งหมด</button>
            {groups.map((g) => (
              <button key={g.key} type="button" className={`cst-chip${group === g.key ? " on" : ""}`} aria-pressed={group === g.key} style={{ "--c": g.color }} onClick={() => pickGroup(g.key)}>
                {g.label}
              </button>
            ))}
          </nav>

          <div className="cst-bal">
            <span className="cst-avg">เฉลี่ย <b>{pctText(avg)}</b></span>
            <button type="button" className={`cst-balbtn${onlyBal ? " on" : ""}`} aria-pressed={onlyBal} onClick={() => { clickSound(); setOnlyBal((v) => !v); }}>
              <span className="up">▲</span><span className="down">▼</span>
            </button>
          </div>

          <div className="cst-cols">
            <span className="cst-h name">ตัวละคร</span>
            {head("picks", "เลือก")}
            {head("wins", "ชนะ")}
            {head("rate", "อัตราชนะ")}
          </div>

          <ol className="cst-list" aria-busy={!stats}>
            {rows.map(({ c, g, s }) => {
              const r = pct(s);
              const open = openId === c.id;
              const bal = balOf(s);
              return (
                <Fragment key={c.id}>
                  <li className={`cst-row${open ? " open" : ""}`} data-bal={bal || undefined} style={{ "--c": g.color }}>
                    <button type="button" className="cst-rowbtn" aria-expanded={open} onClick={() => toggle(c.id)}>
                      <Face c={c} />
                      <span className="cst-name">{c.name}</span>
                      <span className="cst-num">{s.picks}</span>
                      <span className="cst-num">{s.wins}</span>
                      <span className="cst-rate">
                        <span className="cst-bar" aria-hidden="true"><i style={{ width: `${r ?? 0}%` }} /></span>
                        <b>{pctText(r)}</b>
                        {bal && <i className={`cst-flag ${bal}`} aria-label={bal === "up" ? "แรง" : "อ่อน"}>{bal === "up" ? "▲" : "▼"}</i>}
                      </span>
                    </button>
                  </li>
                  {open && (
                    <li className="cst-vs" style={{ "--c": g.color }}>
                      {versus.length === 0 ? (
                        <span className="cst-empty">—</span>
                      ) : (
                        <ul className="cst-vs-list" aria-label={`${c.name} ตัวต่อตัว`}>
                          {versus.map((v) => {
                            const o = byId[v.id];
                            const vr = (v.wins / v.games) * 100;
                            return (
                              <li key={v.id} className="cst-vs-row" style={{ "--c2": o ? o.g.color : "#8aa0bd" }}>
                                <Face c={o && o.c} small />
                                <span className="cst-vs-name">{o ? o.c.name : v.id}</span>
                                <span className="cst-vs-n">{v.wins}/{v.games}</span>
                                <span className="cst-vs-bar" aria-hidden="true"><i style={{ width: `${vr}%` }} /></span>
                                <b className="cst-vs-p">{pctText(vr)}</b>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  )}
                </Fragment>
              );
            })}
          </ol>
        </>
      ) : (
        <ol className="cst-list cst-hist" aria-busy={!raw}>
          {raw && raw.history.length === 0 && <li className="cst-empty">—</li>}
          {raw && raw.history.map((h, i) => (
            <li key={`${h.at}-${i}`} className="cst-match">
              <div className="cst-match-top">
                <span className="cst-match-when">{when(h.at)}</span>
                <span className="cst-match-tag">{MODE_LABEL[h.mode] || h.mode}</span>
                <span className="cst-match-tag">{WORLD_LABEL[h.world] || h.world}</span>
                {h.rounds > 0 && <span className="cst-match-tag">เทิร์น {h.rounds}</span>}
              </div>
              <ul className="cst-match-ps">
                {h.players.map((p, j) => {
                  const o = byId[p.characterId];
                  return (
                    <li key={j} className="cst-match-p" data-result={p.result}>
                      <Face c={o && o.c} small />
                      <span className="cst-match-pn">
                        <b>{p.name || "—"}</b>
                        <small>{o ? o.c.name : p.characterId}</small>
                      </span>
                      <span className="cst-match-res" aria-label={p.result}>{p.result === "win" ? "🏆" : p.result === "draw" ? "=" : ""}</span>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
