// ============================================================
//  HUD ของช่วง Clock Up (server/clockUp.js — ไรเดอร์ ZECT / Faiz Start Up · GRID_PLAN §7.28)
//   ClockUpButton  ปุ่มแทรก/เข้าร่วมนอกตาตัวเอง (Clock Up ของไรเดอร์ · Start Up ของอินุอิ)
//   ClockDuel      หมากชนกัน: สองฝั่งพุ่งเข้าหากัน · คนที่ชนกดรัว (คลิก/คีย์ใดก็ได้) · คนอื่นดู
//  จอคอม/แท็บเล็ตเท่านั้น · ไม่มีข้อความอธิบาย (ชื่อ ตัวเลข ไอคอน)
// ============================================================
import { useEffect, useRef, useState } from "react";
import "./zectHud.css";

export function ClockUpButton({ me, onPress }) {
  const z = me && me.zect;
  const f = me && me.inui;
  const k = me && me.kiritsugu;
  // เอมิยะ คริซุงุ: Time Alter แทรก/เข้าร่วม — เลือกได้ 2 แบบ
  if (k && k.canAlter) {
    return (
      <div className="kiri-alter-pick">
        {[["double", "Double Accel"], ["square", "Square Accel"]].map(([key, name]) => (
          <button key={key} type="button" className="zect-clock kiri" onClick={onPress(`kiri:${key}`)}>
            <img src={k.img} alt="" draggable={false} />
            <span className="zect-clock-name">{name}</span>
            <span className="zect-clock-num">{k.alterCost}</span>
          </button>
        ))}
      </div>
    );
  }
  if (z && z.canClock) {
    return (
      <button type="button" className="zect-clock" onClick={onPress("zect:clock")}>
        <img src={z.img} alt="" draggable={false} />
        <span className="zect-clock-name">Clock Up</span>
        <span className="zect-clock-num">{z.clockCost}</span>
      </button>
    );
  }
  if (f && f.canStartUp) {
    return (
      <button type="button" className="zect-clock faiz" onClick={onPress("inui:startup")}>
        <img src="/characters/inui_takumi/start_up.webp" alt="" draggable={false} />
        <span className="zect-clock-name">Start Up</span>
        <span className="zect-clock-num">{f.startUpCost}</span>
      </button>
    );
  }
  return null;
}

const RESULT_MS = 1300;

export function ClockDuel({ clock, players, myId, onMash }) {
  const duel = clock && clock.duel;
  const [shown, setShown] = useState(null); // seq ที่ผลจบแล้วยังโชว์อยู่
  const [taps, setTaps] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const seqRef = useRef(0);
  const mine = !!duel && (duel.a === myId || duel.b === myId);
  const done = !!duel && duel.winner !== null && duel.winner !== undefined;

  useEffect(() => {
    if (!duel || duel.seq === seqRef.current) return;
    seqRef.current = duel.seq;
    setTaps(0);
    setShown(duel.seq);
  }, [duel]);
  // ผลออกแล้ว: ค้างให้เห็นแป๊บเดียวแล้วปิด (ฉากตีของผู้ชนะเล่นต่อบนกระดาน)
  useEffect(() => {
    if (!done) return undefined;
    const t = setTimeout(() => setShown(null), RESULT_MS);
    return () => clearTimeout(t);
  }, [done, duel && duel.seq]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!duel || done) return undefined;
    const id = setInterval(() => setNow(Date.now()), 50);
    return () => clearInterval(id);
  }, [duel, done]);
  // กดรัว: คีย์ใดก็ได้ (ยกเว้นกดค้างซ้ำ)
  useEffect(() => {
    if (!mine || done) return undefined;
    const onKey = (e) => {
      if (e.repeat) return;
      e.preventDefault();
      setTaps((n) => n + 1);
      onMash();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mine, done, onMash]);

  if (!duel || shown !== duel.seq) return null;
  const pa = players.find((p) => p.id === duel.a);
  const pb = players.find((p) => p.id === duel.b);
  const total = 3000;
  const left = Math.max(0, Math.min(1, (duel.until - now) / total));
  const res = duel.result || null;
  const side = (p, k) => {
    const win = done && duel.winner === p?.id;
    const lose = done && duel.winner && duel.winner !== p?.id;
    return (
      <section className={`zd-side zd-${k} ${win ? "win" : ""} ${lose ? "lose" : ""} ${p?.id === myId ? "me" : ""}`}>
        <div className="zd-art">{p && <img src={p.character?.cover || p.img} alt="" draggable={false} />}</div>
        <div className="zd-name">{p?.name || ""}</div>
        {res && <div className="zd-count">{res[p?.id] ?? 0}</div>}
      </section>
    );
  };
  return (
    <div className="zd-root">
      {side(pa, "a")}
      {side(pb, "b")}
      <div className="zd-flash" key={duel.seq} />
      {!done && <div className="zd-bar"><i style={{ transform: `scaleX(${left})` }} /></div>}
      {mine && !done && (
        <button type="button" className="zd-mash" onPointerDown={(e) => { e.preventDefault(); setTaps((n) => n + 1); onMash(); }}>
          <span key={taps} className="zd-mash-ring" />
          <b>{taps}</b>
        </button>
      )}
    </div>
  );
}
