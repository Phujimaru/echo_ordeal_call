// ปุ่มสกิลแบบหลายตัวเลือก (skill.choices จาก server — เคท: เขม่าควัน · เอมิลิโกะ: อาวุธ) — จอคอม/แท็บเล็ต
//  choices = [{ key, name, img, cost, area, active?, locked? }] · isOk(c) = ใช้ได้ตอนนี้ไหม · onPick(c) = เลือก (การเลือก = การยืนยัน)
//  ปุ่มมีแค่รูป ชื่อ และแต้ม (ห้ามมีคำอธิบาย) · Esc / คลิกนอกกรอบ / คลิกขวา = ปิด
import { useEffect } from "react";
import { clickSound } from "../../audio";

export default function SkillChoices({ title, choices = [], isOk = () => true, onPick, onClose }) {
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
            const on = !!c.active;
            const off = !on && !isOk(c); // ตัวที่ถืออยู่ = กรอบทอง (กดซ้ำไม่ได้ แต่ไม่จาง)
            return (
              <button
                key={c.key}
                type="button"
                disabled={off || on}
                onClick={() => { clickSound(); onPick(c); }}
                className={`relative w-32 rounded-xl overflow-hidden border-2 bg-echo-navy text-left transition-transform duration-150 ${
                  on ? "border-amber-300" : "border-white/15"
                } ${off ? "opacity-45 cursor-not-allowed" : on ? "cursor-default" : "hover:-translate-y-1 hover:border-sky-300"}`}
              >
                <img src={c.img} alt="" className="w-full aspect-[3/4] object-cover" draggable={false} onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
                <div className="px-2 py-1.5 flex items-center gap-1.5">
                  <span className="flex-1 text-sm font-bold text-white truncate">{c.name}</span>
                  {(c.cost || 0) > 0 && <span className="shrink-0 text-xs font-black text-sky-200">◆{c.cost}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
