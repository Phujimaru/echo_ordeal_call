// Road Trip — กล่องคำอธิบายตอนชี้เมาส์ (แทน title= ของเบราว์เซอร์) · หน้าตาเดียวกับ .hc-tip ของ HUD (กรมเข้ม ขอบฟ้า Kanit 13px)
//  ใช้: ใส่ data-rt-tip="ข้อความ" ที่ปุ่ม/ป้ายไหนก็ได้ (ขึ้นบรรทัดใหม่ด้วย \n) — กล่องเดียวทั้งหน้า position: fixed จึงไม่โดนกล่องเลื่อน/overflow ตัด
//  ขึ้นเฉพาะตอนชี้ (เมาส์/ปากกา) · ไม่ขึ้นตอนแตะจอ · ปุ่มที่ชี้หายไปจากหน้า = ซ่อนเอง
//  กฎ CLAUDE.md: ห้ามข้อความอธิบายค้างบนจอ — คำอธิบายทั้งหมดของ Road Trip ให้อยู่ในกล่องนี้เท่านั้น
const CSS = `
.rt-tipbox { position: fixed; left: 0; top: 0; z-index: 2147483000; pointer-events: none;
  width: max-content; max-width: min(300px, calc(100vw - 16px)); padding: 9px 12px; border-radius: 10px;
  background: rgba(12, 20, 36, .95); color: #eef4ff; border: 1px solid rgba(160, 200, 255, .35); box-shadow: 0 8px 22px rgba(0, 0, 0, .4);
  font: 500 13px/1.45 "Kanit", sans-serif; white-space: pre-line; text-align: left;
  opacity: 0; transform: translateY(4px); transition: opacity .15s ease, transform .15s ease; }
.rt-tipbox[data-on="true"] { opacity: 1; transform: none; }
.rt-tipbox b { display: block; font-weight: 600; color: #ffd28a; }
`;
const GAP = 10, EDGE = 8;
let box = null, cur = null, watch = 0;

function place(t) {
  const r = t.getBoundingClientRect();
  const w = box.offsetWidth, h = box.offsetHeight;
  let y = r.top - h - GAP;
  if (y < EDGE) y = Math.min(window.innerHeight - h - EDGE, r.bottom + GAP);
  const x = Math.max(EDGE, Math.min(window.innerWidth - w - EDGE, r.left + r.width / 2 - w / 2));
  box.style.left = `${Math.round(x)}px`;
  box.style.top = `${Math.round(y)}px`;
}
function hide() {
  cur = null;
  if (box) box.dataset.on = "false";
  clearInterval(watch); watch = 0;
}
function show(t) {
  const txt = t.getAttribute("data-rt-tip");
  if (!txt) { hide(); return; }
  cur = t;
  const head = t.getAttribute("data-rt-tip-head");
  box.textContent = "";
  if (head) { const b = document.createElement("b"); b.textContent = head; box.appendChild(b); }
  box.appendChild(document.createTextNode(txt));
  place(t);
  box.dataset.on = "true";
  clearInterval(watch);
  // ปุ่มหาย (เปลี่ยนช่วง) / ข้อความเปลี่ยน → ซ่อน/อัปเดต
  watch = setInterval(() => {
    if (!cur || !cur.isConnected) { hide(); return; }
    if (cur.getAttribute("data-rt-tip") !== txt || cur.getAttribute("data-rt-tip-head") !== head) show(cur);
  }, 250);
}

function install() {
  if (box || typeof document === "undefined" || !document.body) return;
  const st = document.createElement("style");
  st.textContent = CSS;
  document.head.appendChild(st);
  box = document.createElement("div");
  box.className = "rt-tipbox";
  box.setAttribute("role", "tooltip");
  box.dataset.on = "false";
  document.body.appendChild(box);
  document.addEventListener("pointerover", (e) => {
    if (e.pointerType === "touch") return;
    const t = e.target && e.target.closest ? e.target.closest("[data-rt-tip]") : null;
    if (t === cur) return;
    if (t) show(t); else hide();
  }, true);
  document.documentElement.addEventListener("pointerleave", hide); // เมาส์ออกนอกหน้าต่าง
  window.addEventListener("blur", hide);
  window.addEventListener("scroll", () => { if (cur) place(cur); }, true);
}

if (typeof document !== "undefined") {
  if (document.body) install();
  else document.addEventListener("DOMContentLoaded", install, { once: true });
}

/** props สำหรับใส่ในปุ่ม: {...tip("คำอธิบาย", "หัวข้อ")} — ไม่มีข้อความ = ไม่ใส่อะไร */
export function tip(text, head) {
  if (!text) return {};
  return head ? { "data-rt-tip": text, "data-rt-tip-head": head } : { "data-rt-tip": text };
}
export const hideTip = hide;
