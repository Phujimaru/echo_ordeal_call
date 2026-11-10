// เจ้าหญิง Echo — ป้ายโปรไฟล์มุมขวาล่างของคลิปสกิลที่เกิดจากร่างที่เธอสวมผ่านไดอารี่ (ผู้ใช้สั่ง 2026-11-10)
//  recall = { img, name, color } จาก server (characters/echo.js recallOf — มากับ state.cutscene / transformNotice / state.arjunaUlt)
//  หกเหลี่ยมขอบทองซ้อนลาเวนเดอร์ · แสงเรืองเป็นจังหวะ · สมุดไดอารี่เล็กที่มุม · ประกายลอยรอบกรอบ · มีแค่ภาพกับชื่อ
import "./diaryBook.css";

const DIARY = "/characters/echo/echo_diary.webp";

export default function RecallBadge({ recall, small = false }) {
  if (!recall) return null;
  return (
    <div className={`rc-badge${small ? " is-small" : ""}`} style={{ "--rc": recall.color || "#b69cff" }} aria-hidden="true">
      <div className="rc-hex-wrap">
        <span className="rc-aura" />
        <div className="rc-hex rc-gold">
          <div className="rc-hex rc-lav">
            <div className="rc-hex rc-img">
              <img src={recall.img} alt="" draggable={false} />
            </div>
          </div>
        </div>
        <img className="rc-diary" src={DIARY} alt="" draggable={false} />
        <span className="rc-motes"><i /><i /><i /><i /><i /></span>
      </div>
      <div className="rc-name">{recall.name}</div>
    </div>
  );
}
