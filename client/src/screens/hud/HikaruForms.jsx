// ไรโด ฮิคารุ — ตัวเลือกร่างของ UltraLive (จอคอม/แท็บเล็ต): 6 ร่าง + คืนร่าง
//  ข้อมูลจาก server (me.hikaru.forms: { key, name, img, locked, cd }) · กด = useSkill { tier: "basic", form }
//  ปุ่มมีแค่รูป ชื่อ และตัวเลขคูลดาวน์ (ห้ามมีคำอธิบาย) · Esc / คลิกนอกกรอบ / คลิกขวา = ปิด
import { useEffect } from "react";
import { clickSound } from "../../audio";

export default function HikaruForms({ hikaru, onPick, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    const onCtx = (e) => { e.preventDefault(); onClose(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("contextmenu", onCtx);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("contextmenu", onCtx); };
  }, [onClose]);
  const forms = (hikaru && hikaru.forms) || [];
  const cur = hikaru ? hikaru.form : null;
  return (
    <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-6" onClick={() => { clickSound(); onClose(); }}>
      <div className="flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
        <div className="text-2xl font-black tracking-wide text-white drop-shadow">UltraLive</div>
        <div className="flex flex-wrap justify-center gap-3 max-w-[1100px]">
          {forms.map((f) => {
            const on = f.key === cur || (f.key === "normal" && !cur);
            const off = !!f.locked;
            return (
              <button
                key={f.key}
                type="button"
                disabled={off}
                onClick={() => { clickSound(); onPick(f.key); }}
                className={`relative w-32 rounded-xl overflow-hidden border-2 bg-echo-navy text-left transition-transform duration-150 ${
                  on ? "border-amber-300" : "border-white/15"
                } ${off ? "opacity-45 cursor-not-allowed" : "hover:-translate-y-1 hover:border-sky-300"}`}
              >
                <img src={f.img} alt="" className="w-full aspect-[3/4] object-cover" draggable={false} onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
                <div className="px-2 py-1.5 text-sm font-bold text-white truncate">{f.name}</div>
                {f.cd > 0 && (
                  <span className="absolute inset-0 grid place-items-center bg-black/55 text-4xl font-black text-white">{f.cd}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
