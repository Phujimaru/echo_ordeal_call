// ปุ่มสกิลแบบหลายตัวเลือก (skill.choices จาก server — เคท: เขม่าควัน · เอมิลิโกะ: อาวุธ) — จอคอม/แท็บเล็ต
//  choices = [{ key, name, img, cost, area, active?, locked?, left?, cd? }] · left = ใช้ได้อีกกี่ครั้ง (เครื่องดูดฝุ่น) / เทิร์นคูลดาวน์เมื่อ locked · isOk(c) = ใช้ได้ตอนนี้ไหม · onPick(c) = เลือก (การเลือก = การยืนยัน)
//  ปุ่มมีแค่รูป ชื่อ และแต้ม · ชี้เมาส์ค้าง = คำอธิบายย่อของตัวเลือก (c.desc — ผู้ใช้สั่ง 2026-10-14) · Esc / คลิกนอกกรอบ / คลิกขวา = ปิด
import { useEffect, useState } from "react";
import { clickSound } from "../../audio";
import { shopInfoOf } from "../../data/shop";

// คูลดาวน์ของตัวเลือก (เทิร์นที่เหลือ): c.cd · หรือ locked + left > 0 (วาเลนไทน์ — ท่าไม้ตายคูลดาวน์แยกแต่ละแบบ)
//  locked + left 0 = ใช้ครบแล้ว (เครื่องดูดฝุ่น) → ป้าย 🔋0 ตามเดิม
// ตัวเลือกที่เป็นไอเทมในกระเป๋า (c.item — โจรุโน่: ชีวิตทดแทน) = ชื่อ/รูป/ไอคอนของไอเทมนั้น
function itemLook(c) {
  if (!c.item) return { name: c.name, img: c.img, icon: null };
  const info = shopInfoOf(c.item);
  return { name: info.label(c.item), img: info.img || null, icon: info.img ? null : info.icon };
}
// c.fresh = แบบที่ยังไม่ได้ใช้ (โรลันด์: การ์ดอาวุธที่ยังไม่นับเข้า Furioso charge) → Mark รูปดาบมุมขวาบน
function SwordMark() {
  return (
    <span className="absolute top-1 right-1 w-7 h-7 grid place-items-center rounded-full bg-black/70 border border-white/70 shadow" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 17.5 3 6V3h3l11.5 11.5" />
        <path d="M13 19l6-6M16 16l4 4M19 21l2-2" />
      </svg>
    </span>
  );
}
// c.zone = กรอบพื้นที่บนแผนที่ย่อ (กิลกาเมช เมตตาจากราชา: { x0, y0, side, cols, rows, gx, gy }) — แทนรูปบนการ์ด
function ZoneMap({ z }) {
  const W = z.cols || 14, H = z.rows || 14;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full aspect-[3/4] bg-[#1b1306]" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <pattern id="zmGrid" width="1" height="1" patternUnits="userSpaceOnUse"><path d="M1 0H0V1" fill="none" stroke="rgba(255,220,140,.18)" strokeWidth=".06" /></pattern>
      </defs>
      <rect x="0" y="0" width={W} height={H} fill="url(#zmGrid)" />
      <rect x={z.x0 + 0.05} y={z.y0 + 0.05} width={z.side - 0.1} height={z.side - 0.1} fill="rgba(255,206,92,.28)" stroke="#ffe8a6" strokeWidth=".14" />
      <circle cx={z.gx + 0.5} cy={z.gy + 0.5} r=".42" fill="#fff6d6" stroke="#b07a10" strokeWidth=".1" />
    </svg>
  );
}
const cdOf = (c) => (c.cd > 0 ? c.cd : c.locked && c.left > 0 ? c.left : 0);

export default function SkillChoices({ title, choices = [], isOk = () => true, onPick, onClose }) {
  const [hover, setHover] = useState(null); // key ของตัวเลือกที่ชี้อยู่
  const tip = choices.find((c) => c.key === hover && c.desc);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    const onCtx = (e) => { e.preventDefault(); onClose(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("contextmenu", onCtx);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("contextmenu", onCtx); };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-6" onClick={() => { clickSound(); onClose(); }}>
      <div className="flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
        {title && <div className="text-2xl font-black tracking-wide text-white drop-shadow">{title}</div>}
        <div className="flex flex-wrap justify-center gap-3 max-w-[1100px]">
          {choices.map((c) => {
            const on = !!c.active || !!c.worn; // worn = สวมอยู่ กดซ้ำเพื่อถอดได้ (อินุอิ: กระเป๋า SmartBrain)
            const off = !on && !isOk(c); // ตัวที่ถืออยู่ = กรอบทอง (กดซ้ำไม่ได้ แต่ไม่จาง)
            const look = itemLook(c);
            return (
              // ห่อด้วย div: ปุ่มที่ disabled ไม่ส่ง mouseenter — ตัวเลือกที่กดไม่ได้ก็ยังชี้ดูคำอธิบายได้
              <div key={c.key} onMouseEnter={() => setHover(c.key)} onMouseLeave={() => setHover((h) => (h === c.key ? null : h))}>
              <button
                type="button"
                disabled={off || !!c.active}
                onClick={() => { clickSound(); onPick(c); }}
                className={`relative w-32 rounded-xl overflow-hidden border-2 bg-echo-navy text-left transition-transform duration-150 ${
                  on ? "border-amber-300" : "border-white/15"
                } ${off ? "opacity-45 cursor-not-allowed" : c.active ? "cursor-default" : "hover:-translate-y-1 hover:border-sky-300"}`}
              >
                {c.zone ? <ZoneMap z={c.zone} /> : look.icon
                  ? <div className="w-full aspect-[3/4] grid place-items-center text-6xl bg-black/30">{look.icon}</div>
                  : <img src={look.img} alt="" className="w-full aspect-[3/4] object-cover" draggable={false} onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />}
                {c.fresh && <SwordMark />}
                <div className="px-2 py-1.5 flex items-center gap-1.5">
                  <span className="flex-1 text-sm font-bold text-white truncate">{look.name}</span>
                  {(c.cost || 0) > 0 && <span className="shrink-0 text-xs font-black text-sky-200">◆{c.cost}</span>}
                  {(c.actions || 0) > 0 && <span className="shrink-0 text-xs font-black text-yellow-200">{c.actions} Action</span>}
                  {cdOf(c) > 0
                    ? <span className="shrink-0 text-xs font-black text-amber-200">⏳{cdOf(c)}</span>
                    : c.left != null && <span className={`shrink-0 text-xs font-black ${c.left > 0 ? "text-emerald-200" : "text-rose-300"}`}>🔋{c.left}</span>}
                </div>
              </button>
              </div>
            );
          })}
        </div>
        <div className={`max-w-[640px] min-h-[3.25rem] px-4 py-2 rounded-xl text-center text-[15px] leading-snug text-white bg-black/55 border border-white/10 transition-opacity duration-150 ${tip ? "opacity-100" : "opacity-0"}`} aria-live="polite">
          {tip ? tip.desc : ""}
        </div>
      </div>
    </div>
  );
}
