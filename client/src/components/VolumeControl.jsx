import { useEffect, useRef, useState } from "react";
import { getMasterVolume, setMasterVolume, onVolumeChange, clickSound, VOLUME_CHANNELS, getChannelVolume, setChannelVolume } from "../audio";
import { useUiTheme } from "../uiTheme";
import { GameMenuPanel, MenuIcon } from "../oc/ui-extra/GameMenu";
import { echoApp, useRoomPlayers, useMatchStarted } from "../oc/ui-extra/gameMenuState";
import "../oc/ui-extra/volume.css";

// ปุ่มเสียงมุมขวาบน (ทุกหน้า รวมกระดานเกมสีเข้ม) — ธีม ORDEAL CALL
//  ปุ่มเล็ก = ไอคอนลำโพง + แท่งระดับ 5 ขั้น · กดแล้วเปิดแผงกระจก: หลอดเลื่อน + ปุ่มปิดเสียง
//  ข้างกันมีปุ่มโหมดมืด (กดสลับทันที — ทุกหน้า · uiTheme.js) และปุ่ม "เมนู" (oc/ui-extra/GameMenu.jsx — เฉพาะในโปรแกรม ECHO) · เปิดได้ทีละแผง
//  แผงเสียง: หลอดหลัก + หลอดแยกช่อง เพลง/เอฟเฟกต์/เสียงพากย์/วีดีโอ (audio.js setChannelVolume)
//  หน้าแรกของโปรแกรม (desktop/launcher) มีปุ่มชุดเดียวกัน ใช้ volume.css ไฟล์นี้ร่วมกัน
const BARS = 5;
const CHANNEL_LABEL = { music: "เพลง", sfx: "เอฟเฟกต์", voice: "เสียงพากย์", video: "วีดีโอ" };

function ThemeIcon({ dark }) {
  return (
    <svg className="ocv-ico" viewBox="0 0 20 20" aria-hidden="true">
      {dark ? (
        <path d="M14.8 12.6A6 6 0 0 1 7.4 5.2a6 6 0 1 0 7.4 7.4z" className="oct-moon" />
      ) : (
        <>
          <circle cx="10" cy="10" r="3.4" className="oct-sun" />
          <path d="M10 2.6v2M10 15.4v2M2.6 10h2M15.4 10h2M4.8 4.8l1.4 1.4M13.8 13.8l1.4 1.4M4.8 15.2l1.4-1.4M13.8 6.2l1.4-1.4" className="oct-ray" />
        </>
      )}
    </svg>
  );
}

// หลอดย่อยของช่องเสียงหนึ่ง (ชื่อช่อง + % + หลอดเลื่อน)
function ChannelSlider({ ch }) {
  const [v, setV] = useState(() => getChannelVolume(ch));
  const pct = Math.round(v * 100);
  return (
    <label className="ocv-ch">
      <span className="ocv-ch-t">{CHANNEL_LABEL[ch]}</span>
      <span className="ocv-ch-p">{pct}</span>
      <span className="ocv-ch-s" style={{ "--fill": `${pct}%` }}>
        <span className="ocv-ch-track" aria-hidden="true"><i /></span>
        <input
          type="range" min="0" max="100" step="5" value={pct}
          onChange={(e) => { const nv = Number(e.target.value) / 100; setV(nv); setChannelVolume(ch, nv); }}
          aria-label={CHANNEL_LABEL[ch]}
          aria-valuetext={`${pct}%`}
        />
      </span>
    </label>
  );
}

function SpeakerIcon({ muted }) {
  return (
    <svg className="ocv-ico" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3 7.5h3.2L10.5 4v12L6.2 12.5H3z" className="ocv-ico-body" />
      {muted ? (
        <path d="M13.2 7.6l4.6 4.8M17.8 7.6l-4.6 4.8" className="ocv-ico-x" />
      ) : (
        <>
          <path d="M13 7.3a3.6 3.6 0 0 1 0 5.4" className="ocv-ico-wave" />
          <path d="M15.3 5.2a6.6 6.6 0 0 1 0 9.6" className="ocv-ico-wave" />
        </>
      )}
    </svg>
  );
}

export default function VolumeControl() {
  const [open, setOpen] = useState(null); // null | "vol" | "menu"
  const [vol, setVol] = useState(getMasterVolume());
  const [uiTheme, setUiTheme] = useUiTheme();
  const { spectators } = useRoomPlayers(); // มีคนดูอยู่ = ป้ายตา + จำนวน (ระหว่างแมตช์)
  const started = useMatchStarted();
  const dark = uiTheme === "dark";
  const lastOnRef = useRef(getMasterVolume() > 0 ? getMasterVolume() : 0.8); // ระดับก่อนกดปิดเสียง (กดอีกครั้งคืนค่านี้)
  const rootRef = useRef(null);

  // ค่าหลอดอาจถูกเปลี่ยนจากที่อื่น (หรือคืนค่าจาก localStorage) — ต้องตามให้ทัน
  useEffect(() => onVolumeChange((v) => {
    setVol(v);
    if (v > 0) lastOnRef.current = v;
  }), []);

  // คลิกนอกแผง / กด Esc = ปิดแผง
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(null); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(null); };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const change = (v) => {
    const nv = Math.max(0, Math.min(1, v));
    setVol(nv);
    setMasterVolume(nv);
    if (nv > 0) lastOnRef.current = nv;
  };
  const muted = vol <= 0;
  const pct = Math.round(vol * 100);
  const lit = muted ? 0 : Math.max(1, Math.ceil(vol * BARS - 0.001));
  const toggleMute = () => {
    clickSound();
    change(muted ? (lastOnRef.current > 0 ? lastOnRef.current : 0.8) : 0);
  };

  return (
    <div className="ocv" ref={rootRef}>
      <div className="ocv-bar">
        {started && spectators > 0 && (
          <span className="ocv-spec" role="status" aria-label={`ผู้ชม ${spectators}`} title="ผู้ชม">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></svg>
            <b>{spectators}</b>
          </span>
        )}
        <button
          type="button"
          className={`ocv-btn${open === "vol" ? " is-open" : ""}${muted ? " is-muted" : ""}`}
          onClick={() => { clickSound(); setOpen((o) => (o === "vol" ? null : "vol")); }}
          aria-expanded={open === "vol"}
          aria-label="เสียง"
          title="เสียง"
        >
          <SpeakerIcon muted={muted} />
          <span className="ocv-bars" aria-hidden="true">
            {Array.from({ length: BARS }, (_, i) => <i key={i} className={i < lit ? "on" : ""} />)}
          </span>
        </button>
        <button
          type="button"
          className={`ocv-btn oct-btn${dark ? " is-dark" : ""}`}
          onClick={() => { clickSound(); setUiTheme(dark ? "light" : "dark"); }}
          aria-pressed={dark}
          aria-label="โหมดมืด"
          title="โหมดมืด"
        >
          <ThemeIcon dark={dark} />
        </button>
        {echoApp && (
          <button
            type="button"
            className={`ocv-btn ocm-btn${open === "menu" ? " is-open" : ""}`}
            onClick={() => { clickSound(); setOpen((o) => (o === "menu" ? null : "menu")); }}
            aria-expanded={open === "menu"}
            title="เมนู"
          >
            <MenuIcon />
            <span className="ocm-btn-t">เมนู</span>
          </button>
        )}
      </div>

      {open === "menu" && <GameMenuPanel />}

      {open === "vol" && (
        <div className="ocv-panel" role="dialog" aria-label="เสียง">
          <div className="ocv-head">
            <span className="ocv-label">เสียง</span>
            <span className={`ocv-pct${muted ? " is-muted" : ""}`}>{pct}<small>%</small></span>
          </div>

          <div className="ocv-slider" style={{ "--fill": `${pct}%` }}>
            <span className="ocv-track" aria-hidden="true">
              <i className="ocv-fill" />
              {Array.from({ length: 11 }, (_, i) => <b key={i} style={{ left: `${i * 10}%` }} className={i * 10 <= pct ? "on" : ""} />)}
            </span>
            <span className="ocv-thumb" aria-hidden="true" />
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={pct}
              onChange={(e) => change(Number(e.target.value) / 100)}
              aria-label="เสียง"
              aria-valuetext={`${pct}%`}
            />
          </div>

          <div className="ocv-chs">
            {VOLUME_CHANNELS.map((ch) => <ChannelSlider key={ch} ch={ch} />)}
          </div>

          <button type="button" className={`ocv-mute${muted ? " is-on" : ""}`} aria-pressed={muted} onClick={toggleMute}>
            <SpeakerIcon muted />
            ปิดเสียง
          </button>
        </div>
      )}
    </div>
  );
}
