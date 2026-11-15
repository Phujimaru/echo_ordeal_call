// ชิ้นส่วนแสดงผู้เล่น — ป้ายทีม รูป โล่ แถบเลือด การ์ดคู่ต่อสู้ (มือถือ)
//  แยกออกจาก screens/Game.jsx
import { useState } from "react";
import { clickSound } from "../../audio";
import { teamAccent } from "./gameHelpers";
import { StatusChips } from "./StatusViews";

export function TeamBadge({ teamId, className = "" }) {
  if (!teamId) return null;
  const accent = teamAccent(teamId);
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] sm:text-xs font-black text-black shadow-lg whitespace-nowrap ${className}`}
      style={{ background: accent, borderColor: "rgba(255,255,255,.55)", boxShadow: `0 0 14px ${accent}66` }}
    >
      Team {teamId}
    </span>
  );
}


// รูปตัวละคร (เต็มกรอบ + fallback) — แยกชั้น "รูป" (overflow-hidden ตัดขอบ) ออกจากชั้น "ออร่า" (ต้องฟุ้งเลยขอบพอร์เทรตได้)
export function Portrait({ p, className, rounded = "rounded-2xl" }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className={`relative ${className}`}>
      <div className={`absolute inset-0 overflow-hidden ${rounded}`} style={{ background: "linear-gradient(135deg,#3d8bd9,#12264a)" }}>
        {p.img && !broken ? (
          <img src={p.img} alt="" className="absolute inset-0 w-full h-full object-cover" onError={() => setBroken(true)} />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-3xl">🙂</span>
        )}
      </div>
    </div>
  );
}

function Shield({ on, size = 16 }) {
  const c = "#3d8bd9";
  return (
    <svg width={size} height={Math.round(size * 1.125)} viewBox="0 0 24 24" className="shrink-0">
      <path d="M12 2 L21 6 V12 C21 17 12 22 12 22 C12 22 3 17 3 12 V6 Z"
        fill={on ? c : "transparent"} stroke={c} strokeWidth="2" />
    </svg>
  );
}

function TargetLockLegacy() {
  return (
    <>
      <span className="p-target-ring" aria-hidden="true" />
      <span className="p-target-corner tl" aria-hidden="true" />
      <span className="p-target-corner tr" aria-hidden="true" />
      <span className="p-target-corner bl" aria-hidden="true" />
      <span className="p-target-corner br" aria-hidden="true" />
    </>
  );
}

// ---------- แถวเลือด + เกราะ (ใช้ร่วมกันทุกจุด) ----------
//  บังคับอยู่บรรทัดเดียวแนวนอนเสมอ ไม่หักขึ้นบรรทัดใหม่ตามความยาว — sm = ขนาดเล็ก (การ์ดคู่ต่อสู้มือถือ)
//  ตามคำขอ: กลับไปใช้หัวใจ/โล่แบบเดิม (เคยลองเปลี่ยนเป็นเกจแท่ง/เพชรเอียงแล้วไม่ถูกใจ)
export function LifeBar({ p, sm, className = "" }) {
  // ตาบอด (สถานะ Universal): HP/เกราะ/โล่ของทุกคน (รวมตัวเอง) ถูกซ่อนเป็น null
  if (p.maxHp == null) {
    return (
      <span className={`inline-flex items-center gap-1 whitespace-nowrap shrink-0 ${sm ? "text-xs" : "text-sm"} font-black opacity-80 ${className}`} title="ถูกซ่อน (ตาบอด)">
        🌑 ???
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap shrink-0 ${className}`}>
      <span className={`${sm ? "text-sm" : "text-lg"} leading-none whitespace-nowrap`}>
        {Array.from({ length: p.maxHp }, (_, i) => (i < p.hp ? "❤️" : "🖤")).join("")}
      </span>
      {p.tempHp > 0 && <span className={`${sm ? "text-xs" : "text-sm"} text-echo-ice font-bold`}>💛{p.tempHp}</span>}
      <span className="inline-flex gap-0.5 shrink-0">
        {Array.from({ length: p.maxArmor }, (_, i) => <Shield key={i} on={i < p.armor} size={sm ? 12 : 16} />)}
      </span>
      {p.shield > 0 && <span className={`${sm ? "text-xs" : "text-sm"} text-echo-cyan font-bold`}>+🛡️{p.shield}</span>}
    </span>
  );
}



export function MobileOpponent({ p, phase, targetable, onAttack, onInspect, hostRef }) {
  const summary = phase === "SUMMARY";
  return (
    <div
      ref={hostRef}
      onClick={targetable ? () => { clickSound(); onAttack(p.id); } : () => { clickSound(); onInspect(p.id); }}
      className={`p-target-wrap p-panel relative flex items-center gap-2 rounded-2xl px-2 py-1.5 min-h-[68px] border-l-4 ${!p.alive ? "opacity-40 grayscale" : ""} ${targetable ? "cursor-crosshair" : "cursor-pointer"}`}
      style={{ "--p-frame-color": p.color, borderLeftColor: p.color }}
    >
      <div className="relative shrink-0">
        {<Portrait p={p} className="w-14 h-14 p-player-frame" rounded="rounded-xl" />}
        <TeamBadge teamId={p.teamId} className="absolute -top-3 -right-3 z-20" />
        {targetable && <TargetLockLegacy />}
        {!p.alive && <span className="absolute inset-0 grid place-items-center text-2xl">💀</span>}
        {p.isWinner && summary && <span className="absolute -top-2 -right-1 text-lg">👑</span>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-base font-black" style={{ color: p.color, fontFamily: "var(--font-p-display)" }}>
          {p.name}{!p.connected && <span className="ml-1 text-xs text-echo-hp">• offline</span>}
        </div>
        <TeamBadge teamId={p.teamId} />
        {/* เลือด + เกราะ อยู่บรรทัดเดียวแนวนอนเสมอ */}
        {<LifeBar p={p} sm className="mt-0.5" />}
        {<StatusChips p={p} left compact max={4} />}
      </div>
      {/* เปิดไพ่แล้ว: เดิมมีแต่วงกลมเขียวติ๊กถูกเล็กๆ บนรูป ไม่มีคำบอกว่าหมายถึงอะไร */}
      {phase === "PLAYING" && p.locked && p.alive && (
        <span className="pc-ready shrink-0" title="เปิดไพ่แล้ว">✓ พร้อม</span>
      )}
      {targetable && (
        <span className="p-target-badge shrink-0 text-[10px] px-2 py-0.5 rounded-full text-white whitespace-nowrap">
          🎯 เป้า
        </span>
      )}
      {/* เปิดแต้ม (promo): แต้มการ์ดถูกเปิดเผยให้ทุกคนเห็นแม้ยังไม่เปิดไพ่ */}
      {(summary || (p.statuses?.promo || 0) > 0) && p.score !== null && p.score !== undefined && (
        <div className={`score-pop shrink-0 text-xl font-black ${p.isWinner ? "text-echo-ice" : p.busted ? "text-echo-hp" : "text-white"}`}>
          {p.busted ? "แตก!" : p.score}
        </div>
      )}
    </div>
  );
}
