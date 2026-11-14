// Road Trip — ทางส่งคำสั่ง socket ของแผง UI (สัญญา .claude/plans/roadtrip-contract.md §5)
//  ปกติ = socket.emit · หน้าดูตัวอย่าง (?roadtrip=ui) สลับเป็นตัวจำลองด้วย setRtEmitter (ไม่ต้องต่อ server)
import { socket } from "../socket";

let emitter = (ev, data) => socket.emit(ev, data);
export function setRtEmitter(fn) { emitter = typeof fn === "function" ? fn : (ev, data) => socket.emit(ev, data); }
export function rtEmit(ev, data) { emitter(ev, data); }

// เวลาเหลือ (วินาที) ของ endsAt (epoch ms) — server ส่ง rt.now มาด้วย = ชดเชยนาฬิกาเครื่องคลาด
let skew = 0;
export function noteServerNow(now) { if (Number.isFinite(now)) skew = now - Date.now(); }
export function serverNow() { return Date.now() + skew; }
export function secsLeft(endsAt) { return endsAt ? Math.max(0, Math.ceil((endsAt - serverNow()) / 1000)) : null; }
