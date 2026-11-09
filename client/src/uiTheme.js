// โหมดมืดของ UI ในเกม (ผู้ใช้สั่ง 2026-11-09) — ค่าเครื่องผู้เล่นล้วนๆ (localStorage) ไม่ส่งไป server
//  ใส่ <html data-ui="dark"> → ui-theme.css ทับธีมขาว ORDEAL CALL (HUD · กระเป๋า · หน้าร้าน · หน้าต่างในเกม) · กระดานไม่เปลี่ยน
//  สลับได้ทุกหน้าที่ปุ่มมุมขวาบน (components/VolumeControl.jsx — ข้างปุ่มเสียง)
import { useEffect, useState } from "react";

const KEY = "echo_ui_theme";
const listeners = new Set();

export function readUiTheme() {
  try { return localStorage.getItem(KEY) === "dark" ? "dark" : "light"; } catch { return "light"; }
}
function apply(t) {
  if (typeof document !== "undefined") document.documentElement.dataset.ui = t;
}
export function setUiTheme(t) {
  const v = t === "dark" ? "dark" : "light";
  try { localStorage.setItem(KEY, v); } catch { /* ไม่มีที่เก็บ */ }
  apply(v);
  listeners.forEach((f) => f(v));
}
export function useUiTheme() {
  const [t, setT] = useState(readUiTheme);
  useEffect(() => {
    listeners.add(setT);
    return () => listeners.delete(setT);
  }, []);
  return [t, setUiTheme];
}

apply(readUiTheme());

// ---------- ขนาด UI ในเกม (ผู้ใช้สั่ง 2026-11-09): --ui-scale บน <html> → HUD/แถบมุมขวาบน zoom ตามค่า (ui-theme.css) ----------
const SCALE_KEY = "echo_ui_scale";
export const UI_SCALE_MIN = 0.8;
export const UI_SCALE_MAX = 1.3;
const scaleListeners = new Set();
export function readUiScale() {
  try {
    const v = parseFloat(localStorage.getItem(SCALE_KEY));
    return Number.isFinite(v) ? Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, v)) : 1;
  } catch { return 1; }
}
function applyScale(v) { if (typeof document !== "undefined") document.documentElement.style.setProperty("--ui-scale", String(v)); }
export function setUiScale(v) {
  const n = Math.round(Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, Number(v) || 1)) * 20) / 20;
  try { localStorage.setItem(SCALE_KEY, String(n)); } catch { /* ไม่มีที่เก็บ */ }
  applyScale(n);
  scaleListeners.forEach((f) => f(n));
}
export function useUiScale() {
  const [s, setS] = useState(readUiScale);
  useEffect(() => {
    scaleListeners.add(setS);
    return () => scaleListeners.delete(setS);
  }, []);
  return [s, setUiScale];
}
applyScale(readUiScale());
