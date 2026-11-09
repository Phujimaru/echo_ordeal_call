import { useCallback, useEffect, useRef, useState } from "react";
import { getMasterVolume, setMasterVolume, onVolumeChange, clickSound, VOLUME_CHANNELS, getChannelVolume, setChannelVolume } from "../audio";
import { useUiTheme, useUiScale, UI_SCALE_MIN, UI_SCALE_MAX } from "../uiTheme";
import { socket } from "../socket";
import { EMOTES } from "../oc/lobby/emotes";
import { GameMenuPanel, MenuIcon } from "../oc/ui-extra/GameMenu";
import { echoApp, useRoomPlayers, useMatchStarted } from "../oc/ui-extra/gameMenuState";
import "../oc/ui-extra/volume.css";

// แถบมุมขวาบน (ทุกหน้า รวมกระดาน) — ธีม ORDEAL CALL · จัดใหม่ 2026-11-09 (ผู้ใช้: ในกระดานต้องไม่รก)
//  แถบ: [ป้ายผู้ชม (มีคนดู)] [อีโมต (ระหว่างแมตช์ · ผู้เล่น)] [เมนู = ลำโพง/ระดับเสียง + ขีดเมนู]
//  แผงเมนูเดียว แบ่งหมวด: เสียง (หลัก + เพลง/เอฟเฟกต์/เสียงพากย์/วีดีโอ · ปิดเสียง) · การแสดงผล (โหมดมืด · ขนาด UI) · ห้อง (เฉพาะในโปรแกรม ECHO — GameMenu.jsx)
//  หน้าแรกของโปรแกรม (desktop/launcher) ใช้ volume.css ไฟล์นี้ร่วมกัน (ปุ่มของตัวเอง)
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

function Emoji({ e }) { return <span className="ocv-emo-e">{e}</span>; }

export default function VolumeControl() {
  const [open, setOpen] = useState(null); // null | "menu" | "emote"
  const [vol, setVol] = useState(getMasterVolume());
  const [uiTheme, setUiTheme] = useUiTheme();
  const [uiScale, setUiScale] = useUiScale();
  const { spectators, youId } = useRoomPlayers(); // มีคนดูอยู่ = ป้ายตา + จำนวน (ระหว่างแมตช์)
  const started = useMatchStarted();
  const dark = uiTheme === "dark";
  const lastOnRef = useRef(getMasterVolume() > 0 ? getMasterVolume() : 0.8); // ระดับก่อนกดปิดเสียง (กดอีกครั้งคืนค่านี้)
  const rootRef = useRef(null);
  const lastEmote = useRef(0);

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
  const toggle = (k) => { clickSound(); setOpen((o) => (o === k ? null : k)); };
  const canEmote = started && !!youId;
  const sendEmote = useCallback((e) => {
    const now = performance.now();
    if (now - lastEmote.current < 1200) return; // server รับ 1 ครั้งต่อ 1.2 วิ
    lastEmote.current = now;
    socket.emit("gameEmote", { emoji: e });
    setOpen(null);
  }, []);
  const scalePct = Math.round(uiScale * 100);

  return (
    <div className="ocv" ref={rootRef}>
      <div className="ocv-bar">
        {started && spectators > 0 && (
          <span className="ocv-spec" role="status" aria-label={`ผู้ชม ${spectators}`} title="ผู้ชม">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></svg>
            <b>{spectators}</b>
          </span>
        )}
        {canEmote && (
          <button type="button" className={`ocv-btn ocv-emo-btn${open === "emote" ? " is-open" : ""}`} onClick={() => toggle("emote")} aria-expanded={open === "emote"} aria-label="อีโมต" title="อีโมต">
            <svg className="ocv-ico" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.2" className="ocv-emo-face" /><path d="M7 11.6c.8 1.2 1.8 1.8 3 1.8s2.2-.6 3-1.8" className="ocv-emo-line" /><circle cx="7.6" cy="8.2" r="1" className="ocv-emo-eye" /><circle cx="12.4" cy="8.2" r="1" className="ocv-emo-eye" /></svg>
          </button>
        )}
        <button
          type="button"
          className={`ocv-btn ocm-btn${open === "menu" ? " is-open" : ""}${muted ? " is-muted" : ""}`}
          onClick={() => toggle("menu")}
          aria-expanded={open === "menu"}
          aria-label="เมนู"
          title="เมนู"
        >
          <SpeakerIcon muted={muted} />
          <span className="ocv-bars" aria-hidden="true">
            {Array.from({ length: BARS }, (_, i) => <i key={i} className={i < lit ? "on" : ""} />)}
          </span>
          <span className="ocm-sep" aria-hidden="true" />
          <MenuIcon />
        </button>
      </div>

      {open === "emote" && canEmote && (
        <div className="ocv-panel ocv-emo-panel" role="dialog" aria-label="อีโมต">
          {EMOTES.map((e) => (
            <button key={e} type="button" className="ocv-emo" onClick={() => sendEmote(e)} aria-label={e}><Emoji e={e} /></button>
          ))}
        </div>
      )}

      {open === "menu" && (
        <div className="ocv-panel ocv-menu" role="dialog" aria-label="เมนู">
          <section className="ocv-sec">
            <div className="ocv-sec-h">
              <span>เสียง</span>
              <span className={`ocv-pct${muted ? " is-muted" : ""}`}>{pct}<small>%</small></span>
              <button type="button" className={`ocv-mute-ico${muted ? " is-on" : ""}`} aria-pressed={muted} aria-label="ปิดเสียง" title="ปิดเสียง" onClick={toggleMute}>
                <SpeakerIcon muted />
              </button>
            </div>
            <div className="ocv-slider" style={{ "--fill": `${pct}%` }}>
              <span className="ocv-track" aria-hidden="true">
                <i className="ocv-fill" />
                {Array.from({ length: 11 }, (_, i) => <b key={i} style={{ left: `${i * 10}%` }} className={i * 10 <= pct ? "on" : ""} />)}
              </span>
              <span className="ocv-thumb" aria-hidden="true" />
              <input type="range" min="0" max="100" step="5" value={pct} onChange={(e) => change(Number(e.target.value) / 100)} aria-label="เสียง" aria-valuetext={`${pct}%`} />
            </div>
            <div className="ocv-chs">
              {VOLUME_CHANNELS.map((ch) => <ChannelSlider key={ch} ch={ch} />)}
            </div>
          </section>

          <section className="ocv-sec">
            <div className="ocv-sec-h"><span>การแสดงผล</span></div>
            <button type="button" className={`ocv-row-btn${dark ? " is-on" : ""}`} aria-pressed={dark} onClick={() => { clickSound(); setUiTheme(dark ? "light" : "dark"); }}>
              <ThemeIcon dark={dark} />
              <span>โหมดมืด</span>
              <i className="ocv-switch" aria-hidden="true" />
            </button>
            <label className="ocv-ch ocv-scale">
              <span className="ocv-ch-t">ขนาด UI</span>
              <span className="ocv-ch-p">{scalePct}</span>
              <span className="ocv-ch-s" style={{ "--fill": `${((uiScale - UI_SCALE_MIN) / (UI_SCALE_MAX - UI_SCALE_MIN)) * 100}%` }}>
                <span className="ocv-ch-track" aria-hidden="true"><i /></span>
                <input type="range" min={UI_SCALE_MIN * 100} max={UI_SCALE_MAX * 100} step="5" value={scalePct} onChange={(e) => setUiScale(Number(e.target.value) / 100)} aria-label="ขนาด UI" aria-valuetext={`${scalePct}%`} />
              </span>
            </label>
          </section>

          {echoApp && (
            <section className="ocv-sec">
              <div className="ocv-sec-h"><span>ห้อง</span></div>
              <GameMenuPanel embedded />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
