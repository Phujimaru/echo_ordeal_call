// เรียกความสนใจตอนถึงตาเรา/ช่วงจั่วไพ่ (ผู้ใช้สั่ง 2026-11-09): หน้าต่างโปรแกรม ECHO ไม่ได้โฟกัส = ไอคอนบนแถบงานกระพริบ
//  (desktop/main.js echoApp:attention · หยุดเองเมื่อกลับมาที่หน้าต่าง) · เบราว์เซอร์ธรรมดา = ไม่ทำอะไร
export function requestAttention() {
  try {
    if (typeof document !== "undefined" && document.hasFocus()) return;
    const app = typeof window !== "undefined" ? window.echoApp : null;
    if (app && typeof app.attention === "function") app.attention().catch(() => {});
  } catch { /* ไม่มีสิทธิ์/ไม่ได้อยู่ในโปรแกรม */ }
}
