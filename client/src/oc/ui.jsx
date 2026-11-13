// ชิ้นส่วน UI กลางของธีม ORDEAL CALL (คลาสอยู่ใน oc/theme.css)
import { useContext, useEffect, useState } from "react";
import { PATCH_NAME, PATCH_VERSION } from "../data/patch";
import { SharedGlobeContext } from "../globe/SharedGlobe";

/** พื้นหน้าจอขาวอมฟ้า + มุมจอ 4 มุม + ชื่อแพตช์มุมซ้ายบน */
//  อยู่ใต้ลูกโลกร่วม (SharedGlobeStage) = พื้นโปร่งใส ให้เห็นโลก/พื้นที่ฉากร่วมวาดไว้ข้างล่าง
export function OcScreen({ children, className = "", mark = true, ...rest }) {
  const shared = !!useContext(SharedGlobeContext);
  return (
    <div className={`oc-screen${shared ? " is-shared" : ""} ${className}`} {...rest}>
      {children}
      <div className="oc-chrome" aria-hidden="true">
        <i className="oc-tick tl" /><i className="oc-tick tr" /><i className="oc-tick bl" /><i className="oc-tick br" />
        {mark && <span className="oc-mark">ECHO <b>{PATCH_VERSION}</b> · <GlitchName text={PATCH_NAME} /></span>}
      </div>
    </div>
  );
}

// ชื่อแพตช์แบบ "บัค" (ผู้ใช้สั่ง 2026-11-14 — คู่สีเดียวกับ glitch บนลูกโลก ส้ม #ff7a1a / ฟ้า #2bb8ff · desktop/launcher มีแบบเดียวกัน)
//  ชั้นซ้อนส้ม/ฟ้าเหลื่อมเป็นแถบ (CSS .rr-g::before/::after จาก data-text) · ทุก 1–2.5 วิ ตัวอักษร 1 ตัวเพี้ยนเป็นบล็อกสีชั่ววูบ
const GLYPHS = "▓▒░#%&@$Ø∆ΞΣ";
const REDUCED = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export function GlitchName({ text }) {
  const [bug, setBug] = useState(null);
  useEffect(() => {
    if (REDUCED) return undefined;
    let alive = true;
    const timers = [];
    const later = (ms, fn) => timers.push(setTimeout(() => alive && fn(), ms));
    const tick = () => {
      const idx = [...text].map((c, i) => (c.trim() ? i : -1)).filter((i) => i >= 0);
      const i = idx[Math.floor(Math.random() * idx.length)];
      const g = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      setBug({ i, ch: g() });
      later(120, () => setBug(null));
      later(200, () => setBug({ i, ch: g() }));
      later(330, () => setBug(null));
      later(1000 + Math.random() * 1500, tick);
    };
    later(900, tick);
    return () => { alive = false; timers.forEach(clearTimeout); };
  }, [text]);
  return (
    <span className="rr-g" data-text={text}>
      {[...text].map((c, i) => (bug && bug.i === i ? <i key={i} className="rr-bug">{bug.ch}</i> : c))}
    </span>
  );
}

export function OcPanel({ as: Tag = "div", className = "", children, ...rest }) {
  return <Tag className={`oc-panel ${className}`} {...rest}>{children}</Tag>;
}

export function OcButton({ variant = "", className = "", type = "button", children, ...rest }) {
  return <button type={type} className={`oc-btn ${variant} ${className}`} {...rest}>{children}</button>;
}

/** โลโก้ ECHO เดิม + ชื่อแพตช์ใต้โลโก้ */
export function EchoLogo({ small = false, patch = true }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: small ? 6 : 12, alignItems: small ? "flex-start" : "center" }}>
      <div className="oc-echo-logo" role="img" aria-label="ECHO" style={small ? { width: "min(300px,70vw)" } : undefined} />
      {patch && <p className="oc-logo-text" style={{ margin: 0, fontSize: small ? 14 : 22 }}>RISING <span>RESONANCE</span></p>}
    </div>
  );
}
