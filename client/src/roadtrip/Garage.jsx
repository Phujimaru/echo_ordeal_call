// Road Trip — อู่ (ที่ปั๊ม): รถตู้ 3D หมุนดูได้ (van3d.js createVan) · อัปเกรด 8 อย่าง × 3 ขั้น (ทอง) · ของแต่ง 20 · ทรง 3 · สี 8 + เลือกเอง · ทะเบียน
//  คำสั่ง: rt:upg { key } · rt:decor { name, on } · rt:style { style } · rt:paint { hex } · rt:plate { text } — server ตรวจเงิน/ขั้นเอง
//  Esc / ปุ่ม ✕ / กดพื้นหลัง = ปิด
import { useEffect, useRef, useState } from "react";
import { clickSound, uiSound } from "../audio";
import { rtEmit } from "./rtSocket";
import { rtSfx } from "./rtAudio";
import { UPGRADES, DECOR, DECOR_NOTE, STYLES, PAINTS, upgPrice, fmtUpg, cleanPlate } from "./rtMeta";
import { tip } from "./rtTip";

const WRENCH = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.7 6.3a4 4 0 0 0-5.2 5.2L3.8 17.2a1.8 1.8 0 0 0 2.6 2.6l5.7-5.7a4 4 0 0 0 5.2-5.2l-2.5 2.5-2.3-.6-.6-2.3z" /></svg>;
const CLOSE = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>;
// รถตู้ด้านข้าง (ตอนโมเดล 3D ยังโหลดไม่เสร็จ/โหลดไม่ได้)
const VAN_SIDE = (
  <svg viewBox="0 0 240 120" aria-hidden="true">
    <path className="body" d="M14 86V44c0-12 9-22 22-22h120c8 0 15 4 19 10l28 34c5 6 8 9 13 10l6 2c4 1 6 4 6 8v8z" />
    <path className="cream" d="M14 56h194l-14-18H14z" />
    <path className="glass" d="M30 34h40v18H30zM80 34h44v18H80zM134 34h22c4 0 7 2 9 5l9 13h-40z" />
    <circle className="tire" cx="58" cy="90" r="18" /><circle className="hub" cx="58" cy="90" r="8" />
    <circle className="tire" cx="182" cy="90" r="18" /><circle className="hub" cx="182" cy="90" r="8" />
  </svg>
);

// ---------- เวทีรถ 3D (หมุนเอง · ลากหมุน · ล้อเมาส์ซูม)
function VanStage({ van, night }) {
  const host = useRef(null);
  const api = useRef(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let disposed = false, raf = 0, cleanup = null;
    Promise.all([import("three"), import("./van3d.js")]).then(([THREE, mod]) => {
      if (disposed || !host.current || typeof mod.createVan !== "function") return;
      const el = host.current;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.shadowMap.enabled = true;
      el.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
      scene.add(new THREE.HemisphereLight(0xeaf4ff, 0x8a7a66, 1.6));
      const sun = new THREE.DirectionalLight(0xffffff, 2.4);
      sun.position.set(6, 12, 8); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
      Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 });
      scene.add(sun);
      const rim = new THREE.DirectionalLight(0xffc89a, 1.1); rim.position.set(-8, 4, -6); scene.add(rim);
      // แท่นหมุน
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 6.4, 0.3, 64), new THREE.MeshStandardMaterial({ color: 0xe9edf2, roughness: 0.6, metalness: 0.1 }));
      disc.position.y = -0.15; disc.receiveShadow = true; scene.add(disc);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(6.25, 0.06, 8, 96), new THREE.MeshBasicMaterial({ color: 0xe0702e }));
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.01; scene.add(ring);
      const v = mod.createVan({});
      v.group.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
      if (v.setView) v.setView("out");
      scene.add(v.group);
      api.current = v;
      if (van) v.setState(van);
      if (v.setNight) v.setNight(!!night);
      const spinRoot = v.group;
      let yaw = -0.6, pitch = 0.32, dist = 17, auto = true, drag = null;
      const resize = () => {
        const w = el.clientWidth || 1, h = el.clientHeight || 1;
        renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
      };
      const ro = new ResizeObserver(resize); ro.observe(el); resize();
      const down = (e) => { drag = { x: e.clientX, y: e.clientY, yaw, pitch }; auto = false; renderer.domElement.setPointerCapture?.(e.pointerId); };
      const move = (e) => { if (!drag) return; yaw = drag.yaw - (e.clientX - drag.x) * 0.008; pitch = Math.max(0.05, Math.min(1.1, drag.pitch + (e.clientY - drag.y) * 0.005)); };
      const up = () => { drag = null; };
      const wheel = (e) => { e.preventDefault(); dist = Math.max(10, Math.min(28, dist + e.deltaY * 0.01)); };
      const dbl = () => { yaw = -0.6; pitch = 0.32; dist = 17; auto = true; };
      const c = renderer.domElement;
      c.addEventListener("pointerdown", down); window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
      c.addEventListener("wheel", wheel, { passive: false }); c.addEventListener("dblclick", dbl);
      let last = performance.now();
      const loop = (now) => {
        raf = requestAnimationFrame(loop);
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        if (auto) yaw += dt * 0.35;
        spinRoot.rotation.y = 0;
        const d = dist * Math.max(1, 1.3 / Math.max(0.3, cam.aspect)); // จอแคบ (แนวตั้ง) = ถอยกล้องให้รถยาวทั้งคันพอดี
        cam.position.set(Math.sin(yaw) * Math.cos(pitch) * d, 1.6 + Math.sin(pitch) * d, Math.cos(yaw) * Math.cos(pitch) * d);
        cam.lookAt(0, 1.5, 0);
        v.tick(dt, now / 1000, {});
        renderer.render(scene, cam);
      };
      raf = requestAnimationFrame(loop);
      setReady(true);
      cleanup = () => {
        cancelAnimationFrame(raf); ro.disconnect();
        c.removeEventListener("pointerdown", down); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
        c.removeEventListener("wheel", wheel); c.removeEventListener("dblclick", dbl);
        v.dispose();
        disc.geometry.dispose(); disc.material.dispose(); ring.geometry.dispose(); ring.material.dispose();
        renderer.dispose(); renderer.forceContextLoss?.();
        c.remove();
        api.current = null;
      };
    }).catch((e) => { if (import.meta.env.DEV) console.warn("[Garage] van3d", e); /* WebGL ใช้ไม่ได้ = ภาพรถแบน */ });
    return () => { disposed = true; if (cleanup) cleanup(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (api.current && van) api.current.setState(van); }, [van]);
  useEffect(() => { if (api.current && api.current.setNight) api.current.setNight(!!night); }, [night]);
  return (
    <div className="rt-g-stage" ref={host} style={!ready ? { color: van?.paint || undefined } : undefined}>
      {!ready && <div className="rt-g-ph" style={{ color: van?.paint || "#f08a4b" }}>{VAN_SIDE}</div>}
    </div>
  );
}

/**
 * @param van      state.roadtrip.van
 * @param gold     ทองของเรา (me.gold)
 * @param diff     state.roadtrip.diff (ราคา)
 * @param night    กลางคืน (ไฟรถในภาพ 3D)
 * @param onClose  ปิดอู่
 */
export default function Garage({ van = {}, gold = 0, diff = "normal", night = false, onClose }) {
  const [tab, setTab] = useState("upg");
  const [plate, setPlate] = useState(van.plate || "");
  const [bumped, setBumped] = useState(null);
  const plateFocus = useRef(false);
  const paintT = useRef(0); // สีเลือกเอง: ลากในตัวเลือกสี = ส่งครั้งเดียวหลังหยุดลาก
  const prevUpg = useRef(van.upg || {});
  // ทะเบียนจาก server (คนอื่นแก้) — ไม่ทับตอนเรากำลังพิมพ์
  useEffect(() => { if (!plateFocus.current) setPlate(van.plate || ""); }, [van.plate]);
  // ขั้นที่เพิ่งขึ้น = เม็ดเด้ง
  useEffect(() => {
    const u = van.upg || {};
    const up = UPGRADES.find((x) => (u[x.key] || 0) > (prevUpg.current[x.key] || 0));
    prevUpg.current = u;
    if (up) { setBumped(up.key); const t = setTimeout(() => setBumped(null), 700); return () => clearTimeout(t); }
    return undefined;
  }, [van.upg]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); clickSound(); onClose && onClose(); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);
  const upg = van.upg || {};
  const decor = Array.isArray(van.decor) ? van.decor : [];
  const style = van.style || "normal";
  const paint = (van.paint || "#7fb8d8").toLowerCase();
  const commitPlate = () => { const t = cleanPlate(plate).trim(); if (t !== (van.plate || "")) rtEmit("rt:plate", { text: t }); };
  const stat = (k) => fmtUpg(UPGRADES.find((u) => u.key === k), upg[k] || 0);
  return (
    <div className="rt-scrim rt-ui" role="dialog" aria-modal="true" aria-label="อู่" onPointerDown={(e) => { if (e.target === e.currentTarget) { clickSound(); onClose && onClose(); } }}>
      <div className="rt-garage rt-plate">
        <i className="rt-bg" />
        <div className="rt-garage-in">
          <div className="rt-g-left">
            <div className="rt-g-title">
              <span className="ico">{WRENCH}</span>
              <h2>อู่</h2>
              <span className="rt-gold rt-num"><i className="rt-coin" />{gold}</span>
            </div>
            <VanStage van={van} night={night} />
            <div className="rt-g-row">
              <div className="rt-seg" role="radiogroup" aria-label="ทรง">
                {STYLES.map((s) => (
                  <button key={s.key} type="button" role="radio" aria-checked={style === s.key} data-on={style === s.key ? "true" : "false"} {...tip(s.desc, s.name)}
                    onClick={() => { if (style === s.key) return; clickSound(); rtSfx("wrench"); rtEmit("rt:style", { style: s.key }); }}>
                    <span aria-hidden="true">{s.icon}</span>{s.name}
                  </button>
                ))}
              </div>
              <input
                className="rt-plate-in"
                value={plate}
                maxLength={9}
                spellCheck={false}
                aria-label="ทะเบียน"
                {...tip("ป้ายทะเบียนรถตู้ ตั้งได้สูงสุด 9 ตัว · ทุกคนเห็นเหมือนกัน", "ทะเบียน")}
                onFocus={() => { plateFocus.current = true; }}
                onBlur={() => { plateFocus.current = false; commitPlate(); }}
                onChange={(e) => setPlate(cleanPlate(e.target.value))}
                onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") e.currentTarget.blur(); }}
              />
            </div>
          </div>
          <div className="rt-g-right">
            <button type="button" className="rt-g-close" aria-label="ปิด" onClick={() => { clickSound(); onClose && onClose(); }}>{CLOSE}</button>
            <div className="rt-tabs" role="tablist">
              {[["upg", "อัปเกรด", "🔧"], ["decor", "ของแต่ง", "🎀"], ["paint", "สี", "🎨"]].map(([k, name, ico]) => (
                <button key={k} type="button" role="tab" className="rt-tab" aria-selected={tab === k} onClick={() => { if (tab !== k) { clickSound(); setTab(k); } }}>
                  <span aria-hidden="true">{ico}</span>{name}
                  {k === "decor" && <span className="n rt-num">{decor.length}/{DECOR.length}</span>}
                </button>
              ))}
            </div>
            <div className="rt-g-scroll" key={tab}>
              {tab === "upg" && (
                <div className="rt-upg-grid">
                  {UPGRADES.map((u, i) => {
                    const lv = Math.max(0, Math.min(3, upg[u.key] || 0));
                    const price = upgPrice(lv, diff, van);
                    const max = lv >= 3;
                    return (
                      <div key={u.key} className="rt-upg" style={{ "--i": i }} {...tip(u.desc, u.name)}>
                        <span className="rt-upg-ico" aria-hidden="true">{u.icon}</span>
                        <span className="rt-upg-name">
                          <b>{u.name}</b>
                          <span className="rt-pips" aria-label={`${lv}/3`}>{[0, 1, 2].map((k) => <i key={k} data-on={k < lv ? "true" : undefined} data-new={bumped === u.key && k === lv - 1 ? "true" : undefined} />)}</span>
                        </span>
                        <span className="rt-upg-val">
                          <span>{fmtUpg(u, lv)}{u.unit ? ` ${u.unit}` : ""}</span>
                          {!max && <><span className="arr" aria-hidden="true">→</span><span className="to">{fmtUpg(u, lv + 1)}</span></>}
                        </span>
                        <button
                          type="button"
                          className="rt-buy rt-num"
                          data-max={max ? "true" : "false"}
                          disabled={max || gold < price}
                          onClick={() => { uiSound("confirm"); rtSfx("upgrade"); rtEmit("rt:upg", { key: u.key }); }}
                        >
                          {max ? "สูงสุด" : <><i className="rt-coin s" />{price}</>}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              {tab === "decor" && (
                <div className="rt-decor-grid">
                  {DECOR.map((d, i) => {
                    const on = decor.includes(d.name);
                    return (
                      <button key={d.name} type="button" className="rt-decor" style={{ "--i": i }} data-on={on ? "true" : "false"} aria-pressed={on} {...tip(`${d.desc}\n${DECOR_NOTE}`, d.name)}
                        onClick={() => { clickSound(); rtSfx("wrench"); rtEmit("rt:decor", { name: d.name, on: !on }); }}>
                        <span aria-hidden="true">{d.icon}</span><b>{d.name}</b>
                      </button>
                    );
                  })}
                </div>
              )}
              {tab === "paint" && (
                <div className="rt-paint-sec">
                  <div className="rt-swatches" role="radiogroup" aria-label="สี">
                    {PAINTS.map((p) => (
                      <button key={p.hex} type="button" role="radio" className="rt-sw" style={{ "--c": p.hex }} title={p.name} aria-label={p.name} aria-checked={paint === p.hex} data-on={paint === p.hex ? "true" : "false"}
                        onClick={() => { if (paint === p.hex) return; rtSfx("paint_spray"); rtEmit("rt:paint", { hex: p.hex }); }} />
                    ))}
                    <label className="rt-sw custom" title="เลือกเอง" data-on={PAINTS.some((p) => p.hex === paint) ? "false" : "true"} style={{ "--c": paint }}>
                      <input type="color" value={/^#[0-9a-f]{6}$/.test(paint) ? paint : "#7fb8d8"} aria-label="เลือกเอง"
                        onChange={(e) => { const hex = e.target.value; clearTimeout(paintT.current); paintT.current = setTimeout(() => rtEmit("rt:paint", { hex }), 140); }} />
                    </label>
                    <span className="rt-hex">{paint.toUpperCase()}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="rt-g-stats" style={{ position: "static" }}>
              {[["body", "❤", ""], ["engine", "⚙", " กม./ชม."], ["tank", "⛽", " ลิตร"], ["susp", "🛞", ""], ["storage", "🧳", ""]].map(([k, ico, unit]) => {
                const u = UPGRADES.find((x) => x.key === k);
                return <span key={k} {...tip(u.desc, u.name)}>{ico} {stat(k)}{unit}</span>;
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
