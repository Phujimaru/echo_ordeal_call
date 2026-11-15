// ฉากหลังของหน้าเกม — ภูมิภาคการเดินทาง / สนามประลอง / ฉากหลังเดิม
//  แยกออกจาก screens/Game.jsx
import { useMemo } from "react";
import ArenaBackdrop from "../../components/ArenaBackdrop";
import JourneyBackdrop from "../../journey/JourneyBackdrop";
import ArenaScene from "../../journey/arena/ArenaScene";
import { arenaLayout } from "../../journey/arena/arenaData";

const ARENA_FALLBACK_COLS = ["#3d8bd9", "#9b4f96", "#e0812f", "#2fa39a", "#d2455b", "#6b7fd6", "#c49a2c"];
function ArenaBackground({ area, night, lowQ, spec }) {
  const { W, H, seats } = useMemo(() => {
    const [n, w, h, colors] = spec.split("~");
    const lay = arenaLayout(Number(w), Number(h), area, Number(n));
    const cols = colors.split("|");
    return {
      W: Number(w), H: Number(h),
      seats: [{ phi: 90, col: cols[0] || ARENA_FALLBACK_COLS[0], me: true },
        ...lay.others.map((o, i) => ({ phi: o.phi, stem: o.stem, col: cols[i + 1] || ARENA_FALLBACK_COLS[(i + 1) % 7] }))],
    };
  }, [spec, area]);
  return <ArenaScene area={area} night={night} lowQ={lowQ} W={W} H={H} seats={seats} />;
}

// ---------- ฉากหลังกลางวัน/กลางคืน (patch 1.7) ----------
//  กลางวัน = background_morning.jpg | กลางคืน = background_night.jpg
//  เปลี่ยนช่วงเวลาแบบ crossfade ช้าๆ (ไม่ตัดปุ๊บปั๊บ) — ซ้อนทั้ง 2 ภาพแล้วเฟดสลับกัน
export function GameBackground({ cycle, round, lowQ, journey, arena }) {
  return (
    <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
      {/* การเดินทาง (ffa/duo/trio): ฉากหลังประจำภูมิภาค แยกกลางวัน/กลางคืน แทนสนามดอกไม้เดิม */}
      {/*  ภูมิภาค I–III (5.1.8): สนามประลอง 2.5D มุมกล้องเฉียง 55° — ที่นั่งบนพื้นสนามตรงกับการ์ดผู้เล่น (arena = ผังจาก GameBoard) */}
      {journey && arena
        ? <ArenaBackground area={journey.area} night={journey.night} lowQ={lowQ} spec={arena} />
        : journey
          ? <JourneyBackdrop area={journey.area} night={journey.night} lowQ={lowQ} />
          : <ArenaBackdrop cycle={cycle} round={round} />}
      {/* ฉากหลังการเดินทางมีชั้นเกรดสีของตัวเองแล้ว (jb-grade) — ไม่ซ้อนดำเพิ่มอีกชั้น */}
      {!journey && <div className="absolute inset-0 bg-[#0b1d3a]/10" />}
    </div>
  );
}
