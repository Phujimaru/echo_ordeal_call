import { useSyncExternalStore } from "react";
import { socket } from "../../socket";

// ของที่เมนูมุมขวาบน (GameMenu.jsx) ใช้ — แยกไฟล์ไว้ให้ไฟล์ .jsx export แต่ component (fast refresh)

// window.echoApp มาจาก desktop/preload.js — มีเฉพาะหน้าเกมในโปรแกรม ECHO (leaveRoom / isHost) · เบราว์เซอร์ธรรมดา = null
export const echoApp = typeof window !== "undefined" && window.echoApp ? window.echoApp : null;

// แมตช์เริ่มแล้วหรือยัง — ดูจาก state ล่าสุดที่ server ส่งมา (ฟังตั้งแต่โหลดหน้า ไม่ใช่แค่ตอนแผงเปิด)
//  ยังไม่ได้เข้าห้อง (เลือกที่นั่ง/ตัวละคร) = ไม่มี state = ยังไม่เริ่ม · ห้องรอ/โหวตโหมด/จัดทีม = ยังไม่เริ่ม
const PRE_MATCH = new Set(["LOBBY", "TEAM_MODE", "TEAM_SETUP"]);
let started = false;
const listeners = new Set();
function set(next) {
  if (next === started) return;
  started = next;
  listeners.forEach((fn) => fn());
}
socket.on("state", (s) => {
  setPlayers(s);
  set(!!s && !!s.gameState && !PRE_MATCH.has(s.gameState));
});
socket.on("sessionExpired", () => { setPlayers(null); set(false); });

const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export function useMatchStarted() {
  return useSyncExternalStore(subscribe, () => started);
}

// ผู้เล่นในห้อง (คนเปิดห้องใช้ไล่ออก — GameMenu.jsx) · เฉพาะผู้เล่นจริง (ไม่รวมตัวคู่/ยูนิตที่ถูกเรียก)
let roster = { list: [], youId: null };
const rosterListeners = new Set();
function setPlayers(s) {
  const list = s && Array.isArray(s.players)
    ? s.players.filter((p) => p && !p.summon && !p.duoOf).map((p) => ({ id: p.id, name: p.name, connected: p.connected !== false, characterId: p.characterId }))
    : [];
  const youId = (s && s.youId) || null;
  const spectators = (s && s.spectators) || 0; // จำนวนผู้ชม (server/view.js)
  const key = JSON.stringify([list, youId, spectators]);
  if (key === roster.key) return;
  roster = { list, youId, spectators, key };
  rosterListeners.forEach((fn) => fn());
}
const subscribeRoster = (fn) => {
  rosterListeners.add(fn);
  return () => rosterListeners.delete(fn);
};
export function useRoomPlayers() {
  return useSyncExternalStore(subscribeRoster, () => roster);
}
