// Road Trip — หน้าวิทยุรถตู้ (ช่วงขับ): จอ LCD (คลื่น/ชื่อสถานี/ชื่อคลิป) · ปุ่มเปิดปิด · 5 สถานี + YouTube · ช่องลิงก์ + ข้าม + คิว
//  ทุกปุ่มส่ง rt:radio ผ่าน radio.js (ใครเปลี่ยน = เปลี่ยนให้ทุกคน) · ย่อได้เหลือแค่จอ (จำไว้ในเครื่อง)
import { useEffect, useState } from "react";
import { clickSound } from "../audio";
import * as radio from "./radio";
import { tip } from "./rtTip";

const POWER = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v8" /><path d="M6.3 6.8a8 8 0 1 0 11.4 0" /></svg>;
const SKIP = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l9 7-9 7z" /><path d="M18 5v14" /></svg>;
const PLUS = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;
const YT_LOGO = <svg viewBox="0 0 28 20" aria-hidden="true"><rect x="0.5" y="0.5" width="27" height="19" rx="5" fill="currentColor" /><path d="M11 5.5v9l8-4.5z" fill="#fff" /></svg>;
const CHEV = (up) => <svg viewBox="0 0 24 24" aria-hidden="true"><path d={up ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} /></svg>;

function loadMin() { try { return localStorage.getItem("echo_rt_radio_min") === "1"; } catch { return false; } }
function saveMin(v) { try { localStorage.setItem("echo_rt_radio_min", v ? "1" : "0"); } catch { /* ไม่มีที่เก็บ */ } }

/**
 * @param radioState  state.roadtrip.radio
 * @param zoom        --hud-k
 */
export default function RadioPanel({ radioState, zoom = 1 }) {
  const [snap, setSnap] = useState(() => radio.snapshot());
  const [min, setMin] = useState(loadMin);
  const [text, setText] = useState("");
  const [bad, setBad] = useState(false);
  useEffect(() => radio.subscribe(setSnap), []);
  const src = (radioState && radioState.src) || "off";
  const st = radio.stationIndex(radioState && radioState.station);
  const S = radio.STATIONS[st];
  const yt = radioState && radioState.yt;
  const hasYt = !!(yt && (yt.id || yt.list));
  const queue = (yt && yt.queue) || [];
  const add = (raw = text) => {
    if (!raw.trim()) return;
    const ok = radio.addYouTube(raw);
    setBad(!ok);
    if (ok) { clickSound(); setText(""); }
  };
  const lcdName = src === "yt" ? (snap.ytTitle || (snap.ytErr ? "✕" : "…")) : src === "synth" ? S.name : "";
  const playing = src === "synth" || (src === "yt" && snap.ytPlaying);
  return (
    <div className="rt-radio rt-ui rt-plate" data-min={min ? "true" : "false"} style={{ "--hud-k": zoom }} role="group" aria-label="วิทยุ">
      <i className="rt-bg" />
      <div className="rt-lcd-row">
        <div className="rt-lcd" data-src={src} data-play={playing ? "true" : "false"}>
          <span className="rt-lcd-freq">{src === "yt" ? "YT" : src === "synth" ? S.freq : "--.-"}</span>
          {!min && <span className="rt-lcd-name">{lcdName}</span>}
          <span className="rt-eq" aria-hidden="true"><i /><i /><i /><i /><i /></span>
        </div>
        <button type="button" className="rt-knob" data-on={src !== "off" ? "true" : "false"} aria-label="เปิดปิด" aria-pressed={src !== "off"} {...tip("ใครเปลี่ยนสถานี ทุกคนในรถได้ยินเหมือนกัน", src !== "off" ? "ปิดวิทยุ" : "เปิดวิทยุ")}
          onClick={() => { clickSound(); if (src === "off") { if (!(hasYt && radio.resumeYouTube())) radio.setStation(st); } else radio.turnOff(); }}>
          {POWER}
        </button>
        <button type="button" className="rt-knob min" aria-label={min ? "ขยาย" : "ย่อ"} {...tip(min ? "ขยายแผงวิทยุ" : "ย่อเหลือแค่จอ")} aria-expanded={!min} onClick={() => { clickSound(); setMin((v) => { saveMin(!v); return !v; }); }}>
          {CHEV(min)}
        </button>
      </div>
      {!min && (
        <>
          <div className="rt-presets">
            {radio.STATIONS.map((s, i) => (
              <button key={s.key} type="button" className="rt-preset" style={{ "--sc": s.color }} data-on={src === "synth" && st === i ? "true" : "false"} aria-pressed={src === "synth" && st === i}
                onClick={() => { clickSound(); radio.setStation(i); }}>
                <small>{i + 1}</small><b>{s.name}</b>
              </button>
            ))}
            <button type="button" className="rt-preset yt" data-on={src === "yt" ? "true" : "false"} aria-pressed={src === "yt"} aria-label="YouTube" disabled={!hasYt && src !== "yt"}
              onClick={() => { clickSound(); radio.resumeYouTube(); }}>
              {YT_LOGO}<b>YouTube</b>
            </button>
          </div>
          <div className="rt-yt-row">
            <input
              className="rt-yt-in"
              value={text}
              data-bad={bad ? "true" : "false"}
              aria-label="ลิงก์ YouTube"
              {...tip("วางลิงก์วิดีโอหรือเพลย์ลิสต์ YouTube แล้วกด Enter เพื่อต่อคิว", "YouTube")}
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => { setText(e.target.value); setBad(false); }}
              onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") add(); if (e.key === "Escape") e.currentTarget.blur(); }}
              onPaste={(e) => { const t = e.clipboardData.getData("text"); if (t) { e.preventDefault(); setText(t); setTimeout(() => add(t), 0); } }}
            />
            <button type="button" className="rt-sq" aria-label="เพิ่ม" {...tip("เพิ่มลิงก์เข้าคิว")} onClick={() => add()} disabled={!text.trim()}>{PLUS}</button>
            <button type="button" className="rt-sq" aria-label="ข้าม" {...tip(queue.length ? `ข้ามไปเพลงถัดไป · ในคิวอีก ${queue.length} เพลง` : "ข้ามไปเพลงถัดไป")} disabled={src !== "yt"} onClick={() => { clickSound(); radio.next(); }}>
              {SKIP}{queue.length > 0 && <span className="q">{queue.length}</span>}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
