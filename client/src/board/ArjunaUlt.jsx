// ============================================================
//  ฉากท่าไม้ตาย Mahapralaya ของมหาเทพอรชุน — โอเวอร์เลย์เต็มจอ 17.4 วิ (จอคอม/แท็บเล็ต) · ตัววาด board/arjunaFx.js
//  run = { seq, targets: [{ id, img, color, dmg }], hits?: { id: ดาเมจ } } — seq ใหม่ = เล่นใหม่ · hits มาจาก server ตอนโลกระเบิด (ไม่ต้องเริ่มฉากใหม่)
//  วีดีโอต้นฉบับ (มีเสียงในไฟล์) เล่นผ่าน playCutsceneVideo (พักเพลงทั้งหมด · ตามหลอดเสียง) แล้ววาดลงแคนวาสพร้อมของที่ทับ
//  seekRef.current = วินาที → หยุดวีดีโอที่เวลานั้น (หน้าทดสอบ) · null = เล่นต่อ
// ============================================================
import { useEffect, useRef } from "react";
import { playCutsceneVideo } from "../audio";
import RecallBadge from "../screens/hud/RecallBadge";
import { ARJUNA_ULT_MS, ARJUNA_ULT_SRC, buildArjunaScene, disposeArjunaScene, drawArjunaScene, preloadArjunaUlt } from "./arjunaFx";

export default function ArjunaUlt({ run, lowQ, onDone, seekRef }) {
  const cvRef = useRef(null);
  const vidRef = useRef(null);
  const runSeq = run ? run.seq : null;
  const hitsRef = useRef(null);
  const hits = run ? run.hits : null;
  useEffect(() => { hitsRef.current = hits; }, [hits]);
  useEffect(() => {
    if (!run) return undefined;
    preloadArjunaUlt(run.targets);
    const cv = cvRef.current, video = vidRef.current;
    // ความละเอียดแคนวาส: ไม่เกิน 2560 px กว้าง (ต้นฉบับ 720p · จอใหญ่แค่เปลืองเครื่อง)
    const dpr = lowQ ? 1 : Math.min(1.5, window.devicePixelRatio || 1, 2560 / window.innerWidth);
    let sc = null;
    // จอเปลี่ยนขนาดกลางฉาก = เตรียมฉากใหม่ตามขนาดจอ (ไม่งั้นภาพยืด)
    const fit = () => {
      const W = window.innerWidth, H = window.innerHeight;
      if (sc && sc.W === W && sc.H === H) return;
      disposeArjunaScene(sc);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      sc = buildArjunaScene(run.targets || [], W, H, lowQ);
    };
    fit();
    const g = cv.getContext("2d", { alpha: true, desynchronized: false });
    // เริ่มเล่นเมื่อโหลดพอแล้ว (สื่ออยู่ R2 — เล่นทันทีเสี่ยงภาพค้างกลางฉาก) · เตรียมฉากเสร็จก่อนเสียงเริ่ม
    let stopVideo = null;
    const begin = () => { if (!stopVideo) stopVideo = playCutsceneVideo(video); };
    if (video.readyState >= 3) begin(); else video.addEventListener("canplay", begin, { once: true });
    let raf = 0, seeking = null, finished = false, drawn = null;
    const finish = () => { if (!finished) { finished = true; if (onDone) onDone(); } };
    // เวลาของเฟรมที่แสดงอยู่จริง (currentTime นำหน้าภาพ 1–2 เฟรม ทำให้ของที่ทับเลื่อนหลุดจากวีดีโอตอนกล้องขยับเร็ว)
    let shown = null, vfc = 0;
    const onFrame = (_, m) => { shown = m.mediaTime; vfc = video.requestVideoFrameCallback(onFrame); };
    if (video.requestVideoFrameCallback) vfc = video.requestVideoFrameCallback(onFrame);
    const frame = () => {
      const seek = seekRef ? seekRef.current : null;
      if (seek !== seeking) {
        seeking = seek;
        if (seek != null) { video.pause(); video.currentTime = seek; drawn = null; } else video.play().catch(() => {});
      }
      const prev = sc;
      fit();
      const dmg = hitsRef.current;
      if (dmg) for (const u of sc.targets) if (dmg[u.id] != null) u.dmg = dmg[u.id];
      const now = video.currentTime; // shown ค้างได้ตอนหยุดวีดีโอ/แท็บไม่แสดงผล
      const at = shown != null && Math.abs(now - shown) < 0.2 ? shown : now;
      // วีดีโอ 30 fps — จอ 60–144 Hz ไม่ต้องวาดเฟรมเดิมซ้ำ
      if (at !== drawn || sc !== prev || seeking != null) { drawn = at; drawArjunaScene(g, sc, video, at, dpr); }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    video.addEventListener("ended", finish);
    const fallback = setTimeout(finish, ARJUNA_ULT_MS + 4000); // วีดีโอค้าง/โหลดไม่ขึ้น
    return () => {
      cancelAnimationFrame(raf);
      if (vfc) video.cancelVideoFrameCallback(vfc);
      clearTimeout(fallback);
      video.removeEventListener("ended", finish);
      video.removeEventListener("canplay", begin);
      if (stopVideo) stopVideo();
      disposeArjunaScene(sc);
    };
  }, [runSeq]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!run) return null;
  return (
    <div key={run.seq} aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 400, pointerEvents: "auto", cursor: "default" }}>
      <video ref={vidRef} src={ARJUNA_ULT_SRC} preload="auto" playsInline style={{ display: "none" }} />
      <canvas ref={cvRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
      {/* เจ้าหญิง Echo สวมร่างอรชุน = โปรไฟล์ Echo มุมขวาล่าง */}
      <RecallBadge recall={run.recall} />
    </div>
  );
}
