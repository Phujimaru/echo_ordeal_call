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
