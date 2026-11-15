// สรุปผลจบเกม — ลำดับผู้ชนะ/ผู้แพ้ พร้อมช่อมะกอก
//  แยกออกจาก screens/Game.jsx

// ---------- แบนเนอร์สลับช่วงเวลา (กลางวัน <-> กลางคืน ทุก 3 เทิร์น) ----------
// ---------- ฉากสลับกลางวัน/กลางคืน: วอชสีเต็มจอ + แถบแสงกวาดแนวทแยง + ไอคอนลอยขึ้นเรืองแสง + ข้อความคลี่ตัว ----------
// ---------- ฉากสรุปผล: ลีดเดอร์บอร์ดแนวนอน — แถวผู้ชนะ (ทองเรืองแสง เข้าจากซ้าย) บนสุด
//  ตามด้วยแถวผู้แพ้ (เข้าจากขวา มีเลขอันดับ) ด้านล่าง — คนละภาษาการออกแบบกับพอร์เทรตคู่แบบเดิมโดยสิ้นเชิง ----------
function Laurel({ size = 250 }) {
  const leaves = Array.from({ length: 22 }, (_, i) => i);
  return (
    <svg className="sum-laurel" width={size} height={size * 0.55} viewBox="0 0 260 143" aria-hidden="true">
      {leaves.map((i) => {
        const side = i % 2 === 0 ? -1 : 1;
        const t = Math.floor(i / 2) / 10;
        const ang = Math.PI * (0.5 + t * 0.4);
        const cx = 130 + Math.cos(ang) * 120 * side;
        const cy = 140 - Math.sin(ang) * 100;
        return (
          <ellipse
            key={i}
            cx={cx}
            cy={cy}
            rx="11"
            ry="4.6"
            fill="#eaf3fc"
            transform={`rotate(${side * (26 + t * 44)} ${cx} ${cy})`}
          />
        );
      })}
    </svg>
  );
}

export function SummaryTiers({ winners, losers, compact }) {
  if (!winners.length && !losers.length) return null;
  const winAvatar = compact ? 54 : 72;
  const loseAvatar = compact ? 32 : 40;
  return (
    <div className="sum">
      <div className="sum-veil" />

      <div className="sum-head relative z-10 flex flex-col items-center gap-1">
        <span className="av-label">ผลการจั่วไพ่</span>
        <span className="av-crack" style={{ position: "relative", width: compact ? "16rem" : "26rem", height: 2 }} />
      </div>

      <div
        className="relative z-10 flex flex-col items-center gap-2"
        style={{ width: compact ? "min(24rem, 92vw)" : "min(40rem, 80vw)" }}
      >
        {winners.map((p, i) => (
          <div key={p.id} className="sum-win w-full" style={{ animationDelay: `${i * 0.13}s` }}>
            <Laurel size={compact ? 190 : 250} />
            <img
              src={p.character?.cover || p.img}
              alt=""
              className="rounded-full object-cover shrink-0 relative"
              style={{ width: winAvatar, height: winAvatar, border: `2px solid ${p.color}`, boxShadow: `0 0 22px -4px ${p.color}` }}
            />
            <div className="min-w-0 flex-1 relative">
              <div className="av-label" style={{ fontSize: "0.68rem" }}>ผู้ชนะรอบนี้</div>
              <div className={`av-heading truncate text-white ${compact ? "text-lg" : "text-2xl"}`}>{p.name}</div>
            </div>
            <span className={`av-title relative shrink-0 ${compact ? "text-4xl" : "text-6xl"}`}>
              {p.busted ? "แตก" : p.score}
            </span>
          </div>
        ))}

        {losers.length > 0 && (
          <div className="w-full mt-2 flex flex-col">
            {losers.map((p, i) => (
              <div key={p.id} className="sum-row" style={{ animationDelay: `${0.2 + i * 0.08}s` }}>
                <span
                  className="av-numeral shrink-0 w-7 text-center"
                  style={{ fontSize: compact ? "1.5rem" : "2rem", WebkitTextStroke: "1.5px rgba(127,184,230,.55)" }}
                >
                  {i + 2}
                </span>
                <img
                  src={p.character?.cover || p.img}
                  alt=""
                  className="rounded-full object-cover grayscale shrink-0"
                  style={{ width: loseAvatar, height: loseAvatar, border: `1px solid ${p.color}` }}
                />
                <span
                  className={`av-heading truncate shrink-0 ${compact ? "text-sm" : "text-base"}`}
                  style={{ color: p.color, maxWidth: "11rem" }}
                >
                  {p.name}
                </span>
                <span className="sum-lead" />
                <span
                  className={`av-heading shrink-0 ${compact ? "text-sm" : "text-lg"}`}
                  style={{ color: p.busted ? "#e06a78" : "rgba(234,243,252,.8)" }}
                >
                  {p.busted ? "ไพ่แตก" : p.score}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
