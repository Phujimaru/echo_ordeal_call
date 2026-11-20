// ขั้นฉากศาล (`beat.steps` — naruhodo-contract.md) · เวลาเริ่มต้นของแต่ละขั้นเมื่อ server ไม่ใส่ ms
//  client (CourtStage) กับ mock server (courtMock.js) ใช้ตัวเดียวกัน → server จริงคิด sum(stepMs) ได้ตรงกับที่ client เล่น
//  ไม่มี React — server port ไปใช้ได้

export const PAN_MS = 420;
export const GAVEL_HIT_MS = 640;
export const TESTIFY_LINE_MS = 2500;
export const BANNER_MS = { test: 1500, cross: 1900 };

// ความยาวข้อความ → เวลาพิมพ์ + ค้างให้อ่าน
export const sayMs = (text) => Math.min(5200, 1300 + Array.from(String(text || "")).length * 48);

export function stepMs(s) {
  if (s.ms != null) return s.ms;
  switch (s.k) {
    case "cam": return PAN_MS;
    case "say": return sayMs(s.text);
    case "shout": return 950;
    case "gavel": return (s.n || 1) * GAVEL_HIT_MS;
    case "present": return 1500;
    case "hurt": return 1100;
    case "heal": return 800;
    case "banner": return BANNER_MS[s.kind] || 1500;
    case "gallery": return 2800;
    case "kick": return 700;
    case "verdict": return 3800;
    case "clash": return 1500;
    case "clip": return 5300;
    case "pose": return s.one ? 600 : 0;
    default: return 0;
  }
}
export const stepsMs = (steps) => (steps || []).reduce((t, s) => t + stepMs(s), 0);
