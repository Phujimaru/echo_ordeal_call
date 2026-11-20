// ปุ่มระดับเสียงในศาล (ฉากศาล portal ทับแถบมุมขวาบนของเกม — ผู้ใช้ 2026-11-20)
//  ใช้ค่าเดียวกับ VolumeControl.jsx ของเกม (audio.js: master + ช่อง music/sfx/voice/video · จำใน localStorage) → เปลี่ยนแล้วมีผลทั้งเพลงศาล เอฟเฟกต์ เสียงพิมพ์ และคลิป
import { useEffect, useRef, useState } from "react";
import { getMasterVolume, setMasterVolume, onVolumeChange, VOLUME_CHANNELS, getChannelVolume, setChannelVolume } from "../audio";

const LABEL = { music: "เพลง", sfx: "เอฟเฟกต์", voice: "เสียงพากย์", video: "วีดีโอ" };
const stop = (e) => e.stopPropagation();

function Speaker({ muted }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3 7.5h3.2L10.5 4v12L6.2 12.5H3z" className="b" />
      {muted ? <path d="M13.2 7.6l4.6 4.8M17.8 7.6l-4.6 4.8" className="w" /> : <><path d="M13 7.3a3.6 3.6 0 0 1 0 5.4" className="w" /><path d="M15.3 5.2a6.6 6.6 0 0 1 0 9.6" className="w" /></>}
    </svg>
  );
}

function Slider({ label, value, onChange }) {
  const pct = Math.round(value * 100);
  return (
    <label className="cvrow">
      <span className="cvl">{label}</span>
      <span className="cvs" style={{ "--fill": `${pct}%` }}>
        <i className="cvt" aria-hidden="true" />
        <input type="range" min="0" max="100" step="5" value={pct} onChange={(e) => onChange(Number(e.target.value) / 100)} aria-label={label} aria-valuetext={`${pct}%`} />
      </span>
      <b className="cvp">{pct}</b>
    </label>
  );
}

export default function CourtVolume() {
  const [open, setOpen] = useState(false);
  const [vol, setVol] = useState(getMasterVolume);
  const [ch, setCh] = useState(() => Object.fromEntries(VOLUME_CHANNELS.map((k) => [k, getChannelVolume(k)])));
  const lastOn = useRef(getMasterVolume() > 0 ? getMasterVolume() : 0.8);
  const root = useRef(null);
  useEffect(() => onVolumeChange((v) => {
    setVol(v); if (v > 0) lastOn.current = v;
    setCh(Object.fromEntries(VOLUME_CHANNELS.map((k) => [k, getChannelVolume(k)])));
  }), []);
  useEffect(() => {
    if (!open) return undefined;
    const down = (e) => { if (root.current && !root.current.contains(e.target)) setOpen(false); };
    const key = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", down, true); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", down, true); document.removeEventListener("keydown", key); };
  }, [open]);
  const master = (v) => { const nv = Math.max(0, Math.min(1, v)); setVol(nv); setMasterVolume(nv); if (nv > 0) lastOn.current = nv; };
  const muted = vol <= 0;
  return (
    <div className="cvol" ref={root} onClick={stop}>
      <button className={`cvbtn ${muted ? "muted" : ""} ${open ? "open" : ""}`} onClick={() => setOpen((o) => !o)} aria-label="ระดับเสียง" aria-expanded={open}>
        <Speaker muted={muted} />
      </button>
      {open && (
        <div className="cvpanel" role="dialog" aria-label="ระดับเสียง">
          <div className="cvhead">
            <span>เสียง</span>
            <button className={`cvmute ${muted ? "on" : ""}`} aria-pressed={muted} aria-label="ปิดเสียง" onClick={() => master(muted ? lastOn.current || 0.8 : 0)}><Speaker muted /></button>
          </div>
          <Slider label="ทั้งหมด" value={vol} onChange={master} />
          <div className="cvsep" />
          {VOLUME_CHANNELS.map((k) => <Slider key={k} label={LABEL[k] || k} value={ch[k]} onChange={(v) => { setCh((o) => ({ ...o, [k]: v })); setChannelVolume(k, v); }} />)}
        </div>
      )}
    </div>
  );
}
