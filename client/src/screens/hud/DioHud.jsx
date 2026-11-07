// ============================================================
//  HUD ของดิโอ บรันโด (characters/dio_brando.js)
//   DioGauge      Time Meter (ขีดทอง) + BloodStack (ขีดแดง ขั้น 6 / 8) + จำนวน Action ตอนหยุดเวลา
//   DioInterrupt  ปุ่มแทรกตา: ขึ้นเมื่อกดได้ในตาคนอื่น
//   LastStandDuel ฉากดวล: สองฝั่งเฉียงพร้อมภาพตัวละคร · เห็นการ์ดตัวเอง อีกฝ่ายคว่ำ · ทั้งคู่กดพอ = พลิกเปิดพร้อมกัน แล้วประกาศผู้ชนะ
//  จอคอม/แท็บเล็ตเท่านั้น · ไม่มีข้อความอธิบาย (ชื่อ ตัวเลข ไอคอน)
// ============================================================
import { useTick } from "../../tickStore";
import "./dioHud.css";

export function DioGauge({ dio }) {
  if (!dio) return null;
  return (
    <div className={`dio-gauge ${dio.stopping ? "is-stop" : ""}`}>
      <div className="dio-row">
        <span className="dio-label">Time</span>
        <div className="dio-pips">
          {Array.from({ length: dio.meterMax }, (_, i) => <i key={i} className={`dio-pip gold ${i < dio.meter ? "on" : ""}`} />)}
        </div>
        <b className="dio-num">{dio.meter}/{dio.meterMax}</b>
      </div>
      <div className="dio-row">
        <span className="dio-label">Blood</span>
        <div className="dio-pips">
          {Array.from({ length: dio.bloodMax }, (_, i) => <i key={i} className={`dio-pip red ${i < dio.blood ? "on" : ""} ${i === 3 || i === 5 || i === 7 ? "gate" : ""}`} />)}
        </div>
        <b className="dio-num">{dio.blood}/{dio.bloodMax}</b>
      </div>
      {dio.stopping && <div className="dio-actions"><b>{dio.actions}</b><span>Action</span></div>}
      {!dio.stopping && dio.pending > 0 && <div className="dio-actions"><b>{dio.pending}</b><span>Action</span></div>}
    </div>
  );
}

export function DioInterrupt({ dio, onPress }) {
  if (!dio || !dio.canInterrupt) return null;
  return (
    <button type="button" className="dio-interrupt" onClick={onPress}>
      <img src="/characters/dio_brando/dio_timestop.jpg" alt="" draggable={false} />
      <span className="dio-int-name">Za warudo!!!!!!</span>
      <span className="dio-int-num">{dio.interruptActions}</span>
    </button>
  );
}

// การ์ด: หลังการ์ดลายเฟือง · หน้าการ์ดเลขมุม + เลขกลาง · up = หงาย (สลับแล้วพลิก)
function DuelCard({ c, i, n }) {
  const up = !c.hidden;
  const tilt = (i - (n - 1) / 2) * 5;
  return (
    <div className="ls-slot" style={{ "--tilt": `${tilt}deg`, "--lift": `${Math.abs(tilt) * 0.9}px`, zIndex: i }}>
      <div className={`ls-card ${up ? "up" : ""}`} style={{ transitionDelay: `${i * 130}ms` }}>
        <div className="ls-face ls-back"><span className="ls-gear" /></div>
        <div className={`ls-face ls-front c-${c.c || "red"}`}>
          <small>{c.v}</small>
          <b>{c.v}</b>
          <small className="flip">{c.v}</small>
        </div>
      </div>
    </div>
  );
}

function Side({ k, p, duel, mine }) {
  const hand = duel.hands[k], score = duel.scores[k], over = score != null && score > duel.target;
  const result = duel.winner ? (duel.winner === k ? "win" : "lose") : "";
  return (
    <section className={`ls-side ls-${k} ${result} ${mine ? "mine" : ""}`}>
      <div className="ls-art">{p?.img && <img src={p.character?.cover || p.img} alt="" draggable={false} />}</div>
      <div className="ls-info">
        <div className="ls-name">{p?.name || ""}</div>
        <div className="ls-hand">{hand.map((c, i) => <DuelCard key={i} c={c} i={i} n={hand.length} />)}</div>
        <div className={`ls-score ${over ? "bust" : ""}`}>
          <b>{score == null ? "?" : score}</b><small>/{duel.target}</small>
          <em className={duel.stood[k] ? "on" : ""}>พอ</em>
        </div>
      </div>
    </section>
  );
}

// นาฬิกาแยกคอมโพเนนต์: อ่าน useTick เฉพาะตรงนี้ (ตัวนับวินาทีไม่เข้า state กระดาน)
function DuelClock({ done }) {
  const left = useTick();
  return <div className="ls-clock">{done ? "VS" : left}</div>;
}

export function LastStandDuel({ duel, players, onDraw, onStand }) {
  if (!duel) return null;
  const dio = players.find((p) => p.id === duel.dioId), foe = players.find((p) => p.id === duel.foeId);
  const live = !!duel.side && !duel.winner && !duel.stood[duel.side];
  const winner = duel.winner ? (duel.winner === "dio" ? dio : foe) : null;
  return (
    <div className={`ls-root ${duel.winner ? "done" : ""}`}>
      <div className="ls-menacing" aria-hidden="true">
        {["ゴ", "ゴ", "ゴ", "ゴ", "ゴ", "ゴ"].map((g, i) => <span key={i} style={{ "--i": i }}>{g}</span>)}
      </div>
      <Side k="dio" p={dio} duel={duel} mine={duel.side === "dio"} />
      <Side k="foe" p={foe} duel={duel} mine={duel.side === "foe"} />
      <div className="ls-slash" />
      <div className="ls-title">LAST STAND</div>
      <div className="ls-center"><DuelClock done={!!duel.winner} /></div>
      {live && (
        <div className={`ls-btns ls-btns-${duel.side}`}>
          <button type="button" className="ls-btn draw" onClick={onDraw}>จั่ว</button>
          <button type="button" className="ls-btn stand" onClick={onStand}>พอ</button>
        </div>
      )}
      {winner && <div className="ls-winner">{winner.name}</div>}
    </div>
  );
}
