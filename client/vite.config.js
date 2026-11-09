import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "node:fs";

// เลขเวอร์ชันของเกม = desktop/package.json (ที่เดียวที่ตั้งเลขตอนปล่อย) — ป้ายมุมจอ "ECHO 5.9 · ORDEAL CALL" (data/patch.js)
let ECHO_VERSION = "0.0.0";
try { ECHO_VERSION = JSON.parse(readFileSync(new URL("../desktop/package.json", import.meta.url), "utf8")).version; } catch { /* ไม่มีโฟลเดอร์ desktop */ }

// ระหว่าง dev: React รันที่ :5173 แล้ว proxy /socket.io ไปหา server ที่ :3000
// ตอน build: ออกไฟล์ไปที่ dist/ ให้ server (Express) เสิร์ฟเอง
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { __ECHO_VERSION__: JSON.stringify(ECHO_VERSION) },
  server: {
    proxy: {
      // ECHO_SERVER_PORT = พอร์ต server ตอนรันทดสอบหลายชุดพร้อมกัน (ไม่ตั้ง = 3000)
      "/socket.io": { target: `http://localhost:${process.env.ECHO_SERVER_PORT || 3000}`, ws: true },
    },
    // ไฟล์ใน public/ เป็นสื่อล้วน (เพลง/วีดีโอ/รูป) เสิร์ฟตรงอยู่แล้ว ไม่ต้องเฝ้าดู
    // ถ้าเฝ้า แล้วมีการคัดลอกไฟล์ใหญ่เข้ามาระหว่าง dev server รันอยู่ Windows จะล็อกไฟล์
    // จน watcher โยน EBUSY แล้ว dev server ตายทั้งตัว
    watch: { ignored: ["**/public/**"] },
  },
  build: { outDir: "dist", emptyOutDir: true },
});
