import { io } from "socket.io-client";

// dev: ผ่าน vite proxy ไปหา server :3000 | prod: origin เดียวกับหน้าเว็บ
export const socket = io();

// ข้อมูลที่ server ส่งทันทีตอนเชื่อมต่อ (roster / positions / takenChars) — จำค่าล่าสุดไว้ตั้งแต่โหลดโมดูล
//  บั๊กเดิม: socket เชื่อมต่อทันทีที่ import แต่ listener ของ App ผูกหลัง render แรก ถ้าเชื่อมต่อเร็วกว่า (เครื่องเดียวกัน/exe)
//  ข้อความพวกนี้หลุด → หน้าเลือกตัวละครไม่มีตัวละครให้เลือก ("บางครั้งตัวละครไม่ขึ้น") · App อ่านค่าจากที่นี่ตอนผูก listener
export const connectData = {};
for (const ev of ["roster", "positions", "takenChars"]) socket.on(ev, (v) => { connectData[ev] = v; });
