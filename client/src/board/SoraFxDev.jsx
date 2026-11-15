// เฉพาะ dev: หน้าดูกระดาน ?board=1&sora=1 — ปุ่มเล่นเอฟเฟกต์ท่าไม้ตายของโซระทุกร่าง (วงล้อ/ชาร์จ + เงาพุ่ง / ระเบิด / พายุ / กระดอง)
//  พุ่งจาก me ไปทางขวา 3 ช่อง (ตัวไม่ขยับจริง — ดูแค่ภาพเอฟเฟกต์) · ระเบิด/พายุที่ช่องปลายทาง
//  คอนโซล: window.__soraFx(fire, boom) = เล่นชุดเดียวกับปุ่ม · window.__soraFrame(kind) = เล่นเอฟเฟกต์ของ Frame ("eagle" | "orca" | "eagleStorm" | …)
import { useEffect, useState } from "react";
import { SORA_T, dashDur } from "./boardDraw";
import { SORA_FRAME_T, shellThrowDur } from "./soraFrameFx";
import { playSfx } from "../audio";

const CUR = { units: [] };
const COLOR = { fire: "#ff9a4a", eagle: "#ff5a6a", tutle: "#5ee08a", orca: "#4aa8ff" };
const btn = (k) => ({ font: "500 13px Kanit, sans-serif", color: "#fff", cursor: "pointer", padding: "4px 9px", border: `1px solid ${COLOR[k] || "rgba(95,227,255,.6)"}`, background: "rgba(18,24,34,.94)" });

export default function SoraFxDev({ units, pushFx, setFocus, setShell: setBoardShell }) {
  const [shell, setShell] = useState(false);
  useEffect(() => { CUR.units = units; });
  const me = () => { const u = CUR.units.find((x) => x.id === "me"); return { x: u.x, y: u.y }; };
  const wheel = (fire, frame = null) => {
    const s0 = me(), pts = [s0, ...[1, 2, 3].map((i) => ({ x: s0.x + i, y: s0.y }))];
    pushFx([
      { kind: "soraWheel", x: s0.x, y: s0.y, size: 1, dir: { x: 1, y: 0 }, spin: SORA_T.wheel, path: pts, step: SORA_T.step, dur: SORA_T.wheel + 3 * SORA_T.step + 160, fire, frame },
      { kind: "soraDash", path: pts, step: SORA_T.step, delay: SORA_T.wheel, size: 1, dur: SORA_T.wheel + dashDur(pts, SORA_T.step), fire, frame },
    ]);
    setFocus(s0);
    const sfx = frame === "eagle" ? ["sora_eagle_wind", "sora_eagle_dash"] : frame === "orca" ? ["sora_orca_spin", "sora_orca_dash"] : null;
    if (sfx) playSfx(sfx[0]); else { playSfx("sora_squeak"); playSfx("sora_wheel"); }
    setTimeout(() => playSfx(sfx ? sfx[1] : "sora_dash"), SORA_T.wheel);
  };
  const boom = (fire) => {
    const s0 = me(), at = { x: s0.x + 3, y: s0.y };
    pushFx([{ kind: "soraBoom", x: at.x, y: at.y, size: 1, fire }]);
    setFocus(at);
  };
  const frameFx = (kind) => {
    const s0 = me(), at = { x: s0.x + 3, y: s0.y };
    if (kind === "eagle" || kind === "orca") return wheel(false, kind);
    if (kind === "eagleStorm") {
      pushFx([{ kind: "soraEagleStorm", x: at.x, y: at.y, size: 1, r: 2, pulled: [{ from: { x: at.x + 2, y: at.y } }, { from: { x: at.x, y: at.y - 2 } }] }]);
      playSfx("sora_eagle_storm"); setFocus(at);
    } else if (kind === "orcaStorm") {
      const tiles = [3, 4, 5, 6, 7, 8].map((i) => ({ x: s0.x + i, y: s0.y }));
      pushFx([{ kind: "soraOrcaStorm", x: tiles[0].x, y: tiles[0].y, tiles }]);
      playSfx("sora_orca_storm"); setFocus(at);
    } else if (kind === "throw" || kind === "lob") {
      const to = kind === "lob" ? { x: s0.x + 3, y: s0.y + 2 } : at;
      const e = { kind: "soraShellThrow", x: s0.x, y: s0.y, from: s0, to, hit: kind === "throw" ? at : null, arc: kind === "lob", flight: Math.abs(to.x - s0.x) + Math.abs(to.y - s0.y) };
      pushFx([{ ...e, dur: shellThrowDur(e) }]);
      playSfx("sora_tutle_throw"); setFocus(s0);
      setTimeout(() => {
        if (kind === "throw") { pushFx([{ kind: "soraEncase", x: at.x, y: at.y, at }]); playSfx("sora_tutle_clamp"); } else playSfx("sora_tutle_land");
      }, SORA_FRAME_T.shellLead + e.flight * SORA_FRAME_T.shellStep);
    } else if (kind === "break") {
      pushFx([{ kind: "soraShellBreak", x: at.x, y: at.y, at }]); playSfx("sora_tutle_break"); setFocus(at);
    } else if (kind === "warp") {
      pushFx([{ kind: "soraWarp", x: at.x, y: at.y, from: s0, to: at }]); playSfx("sora_tutle_warp"); setFocus(at);
    } else if (kind === "sonar") {
      pushFx([{ kind: "soraSonar", x: s0.x, y: s0.y, at: s0 }]); playSfx("sora_orca_sonar"); setFocus(s0);
    }
  };
  useEffect(() => {
    window.__soraFx = (fire, b) => (b ? boom(!!fire) : wheel(!!fire));
    window.__soraFrame = frameFx;
    window.__soraShell = (on) => setShell(on);
    return () => { delete window.__soraFx; delete window.__soraFrame; delete window.__soraShell; };
  });
  // กระดองค้างบนกระดาน (ครอบ me / วางพื้น) — BoardPreview ส่งเข้า BoardCanvas soraShells
  useEffect(() => { if (setBoardShell) setBoardShell(shell); }, [shell, setBoardShell]);
  return (
    <div style={{ position: "fixed", left: 12, bottom: 12, zIndex: 50, display: "flex", gap: 6, flexWrap: "wrap", maxWidth: 760 }}>
      <button style={btn()} onClick={() => wheel(false)}>วงล้อ</button>
      <button style={btn("fire")} onClick={() => wheel(true)}>วงล้อไฟ</button>
      <button style={btn()} onClick={() => boom(false)}>ระเบิด</button>
      <button style={btn("fire")} onClick={() => boom(true)}>ระเบิดไฟ</button>
      <button style={btn("eagle")} onClick={() => frameFx("eagle")}>Eagle พุ่ง</button>
      <button style={btn("eagle")} onClick={() => frameFx("eagleStorm")}>พายุขนนก</button>
      <button style={btn("tutle")} onClick={() => frameFx("throw")}>โยนกระดอง</button>
      <button style={btn("tutle")} onClick={() => frameFx("lob")}>โยนโค้ง</button>
      <button style={btn("tutle")} onClick={() => frameFx("break")}>กระดองแตก</button>
      <button style={btn("tutle")} onClick={() => frameFx("warp")}>วาร์ป</button>
      <button style={btn("tutle")} onClick={() => setShell((s) => (s === "on" ? "ground" : s === "ground" ? false : "on"))}>กระดองค้าง</button>
      <button style={btn("orca")} onClick={() => frameFx("orca")}>Orca พุ่ง</button>
      <button style={btn("orca")} onClick={() => frameFx("orcaStorm")}>พายุน้ำ</button>
      <button style={btn("orca")} onClick={() => frameFx("sonar")}>โซนาร์</button>
    </div>
  );
}
