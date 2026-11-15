// ชิปสถานะ · หน้าต่างสถานะผู้เล่น · หน้าต่างข้อมูลตัวละคร
//  แยกออกจาก screens/Game.jsx
import { AvModal } from "../../components/avalon";
import RtMobInfo, { isRtMobUnit } from "../../roadtrip/RtMobInfo"; // การ์ดมอน Road Trip (คลิกมอน)
import { statusEntries, STATUS_GRID_MAX, isPermanentTurnValue, isPermanentStatus, showStatusValue } from "./statusData";

export function StatusChips({ p, left, compact, grid, max = 5 }) {
  const items = statusEntries(p);
  if (!items.length) return null;
  if (grid) {
    const cut = items.length > STATUS_GRID_MAX;
    const shown = cut ? items.slice(0, STATUS_GRID_MAX - 1) : items;
    return (
      <div className="grid grid-cols-3 gap-1 mt-1 w-full">
        {shown.map((it) => (
          <span
            key={it.key}
            title={`${it.label}${it.amt > 0 ? ` +${it.amt}` : ""}${showStatusValue(it) ? ` x${it.v}` : ""}${it.desc ? ` — ${it.desc}` : ""}`}
            className={`flex items-center gap-1 min-w-0 text-xs px-1.5 py-0.5 rounded-md font-bold border border-black/25 shadow ${it.cls}`}
          >
            <span className="shrink-0">{it.icon}</span>
            <span className="truncate">{it.label}{it.amt > 0 ? ` +${it.amt}` : ""}</span>
            {showStatusValue(it) && <span className="shrink-0 opacity-90">{it.v}</span>}
          </span>
        ))}
        {cut && (
          <span className="flex items-center justify-center text-xs px-1.5 py-0.5 rounded-md font-black bg-black/65 border border-white/25 text-white">
            +{items.length - shown.length} แตะดูทั้งหมด
          </span>
        )}
      </div>
    );
  }
  const shown = compact ? items.slice(0, max) : items;
  const overflow = compact ? items.length - shown.length : 0;
  return (
    <div className={`flex flex-wrap gap-1 ${left ? "justify-start" : "justify-center"} mt-1`}>
      {shown.map((it) => {
        // เลขจำนวนสถานะทับซ้อน — โชว์ทั้งโหมด compact (การ์ดผู้เล่นอื่น) ด้วย ไม่ใช่แค่แผงตัวเอง
        //  เดิม compact = ไอคอนล้วน ผู้เล่นอื่นมองไม่เห็นว่าสถานะทับซ้อนกี่ชั้น ต้องแตะดูรายละเอียดถึงจะรู้
        const num = it.amt > 0 ? it.amt : (showStatusValue(it) ? it.v : null);
        return (
          <span
            key={it.key}
            title={`${it.label}${it.amt > 0 ? ` +${it.amt}` : ""}${showStatusValue(it) ? ` x${it.v}` : ""}${it.desc ? ` — ${it.desc}` : ""}`}
            className={
              compact
                ? `relative w-5 h-5 grid place-items-center text-[11px] rounded-[4px] font-bold border border-black/25 shadow shrink-0 ${it.cls}`
                : `inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md font-bold border border-black/25 shadow ${it.cls}`
            }
          >
            {compact ? (
              <>
                {it.icon}
                {num != null && (
                  <span className="absolute -bottom-1 -right-1 text-[8px] font-black bg-black text-white rounded-full min-w-[12px] h-[12px] px-0.5 grid place-items-center leading-none border border-white/40">
                    {num}
                  </span>
                )}
              </>
            ) : (
              <><span>{it.icon}</span><span>{it.label}{it.amt > 0 ? ` +${it.amt}` : ""}{showStatusValue(it) ? ` ${it.v}` : ""}</span></>
            )}
          </span>
        );
      })}
      {overflow > 0 && (
        <span
          className="w-5 h-5 grid place-items-center text-[10px] font-black rounded-[4px] bg-black/65 border border-white/25 text-white shrink-0"
          title={`อีก ${overflow} สถานะ — แตะที่การ์ดเพื่อดูทั้งหมด`}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}

// ---------- หน้าต่างดูสถานะ + รายละเอียดสกิลของผู้เล่น (แตะการ์ดผู้เล่นคนไหนก็ได้ตอนไม่ได้เลือกเป้า) ----------
//  patch 1.9.1: เพิ่มรายละเอียดสกิลตัวละครของฝั่งตรงข้ามให้กดดูได้จากหน้ากระดาน
export function StatusModal({ p, onClose, statusOnly }) {
  const items = statusEntries(p, true);
  const ch = p.character;
  const rtMob = isRtMobUnit(p); // Road Trip: มอน = การ์ดมอน (พลังโจมตี/ระยะเดิน/ความสามารถ/บทบาท/ระยะบอส)
  const skillRows = !statusOnly && ch
    ? [["สกิลติดตัว", ch.passive], ["สกิลพื้นฐาน", ch.basic], ["สกิลรอง", ch.secondary], ["ท่าไม้ตาย", ch.ultimate]]
    : [];
  return (
    <AvModal
      tone="white"
      label={rtMob ? "มอน" : statusOnly ? "สถานะ" : "ข้อมูลผู้เล่น"}
      title={p.name}
      width="min(34rem, 94vw)"
      onClose={onClose}
      right={
        !statusOnly && p.img && !rtMob ? (
          <span className="av-frame relative block w-12 h-12 overflow-hidden shrink-0" style={{ border: `1px solid ${p.color}` }}>
            <img src={p.character?.cover || p.img} alt="" className="w-full h-full object-cover" />
          </span>
        ) : null
      }
    >
      <>
        {rtMob && <RtMobInfo p={p} />}
        {!statusOnly && !rtMob && (
          <div className="av-heading text-sm mb-4" style={{ color: "var(--avm-dim, rgba(234,243,252,.6))" }}>
            {p.character?.name}
            {!p.connected && <span className="ml-2 text-xs" style={{ color: "var(--av-blood)" }}>• reconnecting</span>}
          </div>
        )}
        {items.length === 0 ? (
          <div className="av-label py-4 text-center" style={{ color: "var(--avm-dim, rgba(234,243,252,.4))" }}>ไม่มีสถานะผิดปกติ</div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((it) => (
              <div key={it.key} className="av-item flex items-start gap-3">
                <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md font-bold shrink-0 ${it.cls}`}><span>{it.icon}</span><span>{it.label}{it.amt > 0 ? ` +${it.amt}` : ""}</span></span>
                <div className="min-w-0">
                  <span className="text-sm opacity-90 leading-snug">{it.desc}</span>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    {/* จำนวนซ้อนทับ (amount) — โชว์แยกชัดเจนเสมอเมื่อมีค่า ไม่ใช่แค่เลขเล็กๆ ในป้ายไอคอนด้านบนที่สังเกตยาก */}
                    {it.amt > 0 && <span className="text-xs font-bold text-echo-hp">จำนวน {it.amt}</span>}
                    {it.v > 0 && (
                      isPermanentTurnValue(it)
                        ? <span className="text-xs font-bold text-echo-cyan">ถาวร</span>
                        : isPermanentStatus(it) || (!it.turns && !(it.key in (p.statuses || {}))) // ป้ายตัวละครที่ไม่ใช่ตัวนับถอยหลัง (กระสุน/ตัวนับ/ร่าง) = ไม่มี "เหลือ N เทิร์น"
                          ? (it.v > 1 ? <span className="text-xs font-bold text-echo-cyan">สะสม {it.v}</span> : null)
                          : <span className="text-xs font-bold text-echo-ice">เหลือ {it.v} เทิร์น</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {skillRows.length > 0 && (
          <div className="mt-5">
            <div className="av-label mb-3">{ch.name}</div>
            <div className="flex flex-col gap-2">
              {skillRows.map(([label, s], i) =>
                s ? (
                  <div key={i} className="av-item flex items-start gap-3">
                    {s.img ? (
                      <img src={s.img} alt="" className="w-16 h-11 object-cover shrink-0 mt-0.5" />
                    ) : (
                      <span className="w-16 h-11 grid place-items-center text-xl shrink-0 mt-0.5" style={{ background: "rgba(127,184,230,.12)" }}>✦</span>
                    )}
                    <div className="min-w-0">
                      <div className="flex justify-between gap-2">
                        <span className="av-heading text-sm">
                          {label} · <span style={{ color: "var(--avm-gold, var(--av-gold-lit))" }}>{s.name}</span>
                        </span>
                        <span className="text-xs shrink-0" style={{ color: "var(--avm-dim, rgba(234,243,252,.5))" }}>
                          {s.cost != null ? `ใช้ ${s.cost}` : "ฟรี"}
                        </span>
                      </div>
                      <div className="text-xs leading-snug" style={{ color: "var(--avm-text, rgba(234,243,252,.72))" }}>{s.desc}</div>
                    </div>
                  </div>
                ) : null
              )}
            </div>
          </div>
        )}
      </>
    </AvModal>
  );
}

// ---------- modal รายละเอียดตัวละคร (ใช้ร่วมกันทั้งจอคอม/มือถือ) ----------
//  me = ผู้เล่นของเรา -> โชว์สถานะผิดปกติที่ติดอยู่ตอนนี้ พร้อมคำอธิบายเต็ม
export function CharModal({ ch, me, onClose }) {
  const myStatuses = me ? statusEntries(me, true) : [];
  return (
    <AvModal tone="white" label="ข้อมูลตัวละคร" title={ch.name} width="min(34rem, 94vw)" onClose={onClose}>
      <>
        <div className="flex flex-col gap-2">
          {[["สกิลติดตัว", ch.passive], ["สกิลพื้นฐาน", ch.basic], ["สกิลรอง", ch.secondary], ["ท่าไม้ตาย", ch.ultimate]].map(([label, s], i) =>
            s ? (
              <div key={i} className="av-item">
                <div className="flex justify-between gap-3">
                  <span className="av-heading text-sm">
                    {label} · <span style={{ color: "var(--avm-gold, var(--av-gold-lit))" }}>{s.name}</span>
                  </span>
                  <span className="text-xs shrink-0" style={{ color: "var(--avm-dim, rgba(234,243,252,.5))" }}>
                    {s.cost != null ? `ใช้ ${s.cost}` : "ฟรี"}
                  </span>
                </div>
                <div className="text-sm mt-1 leading-snug" style={{ color: "var(--avm-text, rgba(234,243,252,.78))" }}>{s.desc}</div>
              </div>
            ) : null
          )}
        </div>
        {myStatuses.length > 0 && (
          <div className="mt-5">
            <div className="av-label mb-3">สถานะที่ติดอยู่ตอนนี้</div>
            <div className="flex flex-col gap-2">
              {myStatuses.map((it) => (
                <div key={it.key} className="av-item flex items-start gap-3">
                  <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 font-bold shrink-0 ${it.cls}`}>
                    <span>{it.icon}</span>
                    <span>{it.label}{it.amt > 0 ? ` +${it.amt}` : ""}{showStatusValue(it) ? ` ${it.v}` : ""}</span>
                  </span>
                  <span className="text-sm leading-snug" style={{ color: "var(--avm-text, rgba(234,243,252,.85))" }}>{it.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    </AvModal>
  );
}
