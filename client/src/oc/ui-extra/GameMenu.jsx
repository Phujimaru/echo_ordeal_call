import { useEffect, useState } from "react";
import { socket } from "../../socket";
import { echoApp, useMatchStarted, useRoomPlayers } from "./gameMenuState";

// เมนูมุมขวาบน (ข้างปุ่มเสียง — render จาก VolumeControl ซึ่งคุมว่าแผงไหนเปิด) · ใช้ได้เฉพาะในโปรแกรม ECHO
//  ก่อนเริ่มแมตช์ (เลือกที่นั่ง/ตัวละคร/ห้องรอ/โหวตโหมด/จัดทีม) = "ออกจากห้อง" · ระหว่างแมตช์ = "ออกจากเกม" + ยืนยันในแผง
//  คนเปิดห้อง: รายชื่อผู้เล่นคนอื่น + ปุ่มไล่ออก (ยืนยันก่อน — server/socket.js kickPlayer · ผู้ใช้สั่ง 2026-11-09)
//  ผลเท่ากับกด F10: กลับหน้าแรกของโปรแกรม (คนเปิดห้องออก = ห้องปิด ทุกคนหลุด → ต้องยืนยันเสมอ + ป้าย "ห้องจะปิด")
const SESSION_KEY = "echo_session"; // ชื่อเดียวกับ App.jsx

export function MenuIcon() {
  return (
    <svg className="ocv-ico" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3.5 5.5h13M3.5 10h13M3.5 14.5h9" className="ocm-ico-line" />
    </svg>
  );
}

export function GameMenuPanel({ embedded = false } = {}) {
  const started = useMatchStarted();
  const [host, setHost] = useState(false);
  // ยืนยันไว้สำหรับช่วงไหน (ก่อน/ระหว่างแมตช์) — แมตช์เริ่ม/จบระหว่างเปิดแผง = ขั้นยืนยันเดิมหายเอง
  const [confirmFor, setConfirmFor] = useState(null);
  const [busy, setBusy] = useState(false);
  const confirming = confirmFor === started;
  const { list, youId } = useRoomPlayers();
  const [kickId, setKickId] = useState(null);
  const others = list.filter((p) => p.id !== youId);
  const kickTarget = others.find((p) => p.id === kickId) || null;
  const kick = () => {
    if (!kickTarget) return;
    try { socket.emit("kickPlayer", { playerId: kickTarget.id }); } catch { /* ไม่ได้ต่ออยู่ */ }
    setKickId(null);
  };

  useEffect(() => {
    let alive = true;
    echoApp?.isHost().then((h) => { if (alive) setHost(!!h); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const leave = async () => {
    if (busy || !echoApp) return;
    setBusy(true);
    if (!started) {
      // ก่อนเริ่มแมตช์: คืนที่นั่งทันที (ไม่ต้องรอหมดเวลารีคอนเนกต์) และไม่กลับไปนั่งที่เดิมเองตอนเข้าห้องนี้อีกครั้ง
      try { socket.emit("leave"); } catch { /* ไม่ได้ต่ออยู่ */ }
      try { localStorage.removeItem(SESSION_KEY); } catch { /* ไม่มี storage */ }
    }
    try {
      if (!(await echoApp.leaveRoom())) setBusy(false);
    } catch {
      setBusy(false);
    }
  };

  const label = started ? "ออกจากเกม" : "ออกจากห้อง";
  const needConfirm = started || host;

  return (
    <div className={embedded ? "ocm-embed" : "ocv-panel ocm-panel"} role={embedded ? undefined : "dialog"} aria-label={embedded ? undefined : "เมนู"}>
      {kickTarget ? (
        <>
          <div className="ocv-head">
            <span className="ocv-label">ไล่ออก</span>
            <span className="ocm-tag">{kickTarget.name}</span>
          </div>
          <div className="ocm-row">
            <button type="button" className="ocm-item is-danger" onClick={kick}>ไล่ออก</button>
            <button type="button" className="ocm-item" onClick={() => setKickId(null)}>ยกเลิก</button>
          </div>
        </>
      ) : confirming ? (
        <>
          <div className="ocv-head">
            <span className="ocv-label">{label}</span>
            {host && <span className="ocm-tag">ห้องจะปิด</span>}
          </div>
          <div className="ocm-row">
            <button type="button" className="ocm-item is-danger" onClick={leave} disabled={busy}>ออก</button>
            <button type="button" className="ocm-item" onClick={() => setConfirmFor(null)} disabled={busy}>ยกเลิก</button>
          </div>
        </>
      ) : (
        <>
          {!embedded && <span className="ocv-label">เมนู</span>}
          <button
            type="button"
            className="ocm-item is-danger"
            disabled={busy}
            onClick={() => (needConfirm ? setConfirmFor(started) : leave())}
          >
            {label}
          </button>
          {host && others.length > 0 && (
            <ul className="ocm-players" aria-label="ผู้เล่น">
              {others.map((p) => (
                <li key={p.id} className={`ocm-player${p.connected ? "" : " is-off"}`}>
                  <i className="ocm-dot" aria-label={p.connected ? "ออนไลน์" : "ออฟไลน์"} />
                  <span className="ocm-pname">{p.name}</span>
                  <button type="button" className="ocm-kick" onClick={() => setKickId(p.id)} aria-label={`ไล่ ${p.name} ออก`} title="ไล่ออก">
                    <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 4H4.5v12H8M12 6.5 15.5 10 12 13.5M15.5 10H8" /></svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
