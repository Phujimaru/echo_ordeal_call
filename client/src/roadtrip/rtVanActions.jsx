// Road Trip — ปุ่มคำสั่งบนรถตู้ตอนสู้ไล่ล่า (combat kind "onvan" · ตาของเราเท่านั้น — ผู้ใช้สั่ง 2026-11-14 ให้ตัวสายประชิดสู้ได้)
//  หักรถชนซ้าย/ขวา (ช่องคนขับ · คูลดาวน์) → rt:swerve { side } · ยิงป้อมปืน (ช่องซันรูฟ/หลังคา · อัปเกรดป้อมปืน ≥ 1 · ตาละครั้ง) → เลือกช่องบนกระดาน → rt:turret { x, y }
//  ขึ้น/ลงหลังคา (ช่องซันรูฟ) → rt:roof · ปุ่มเข้าแถวปุ่มพิเศษของ HUD (HudCommand extra) · คำอธิบาย = กล่องชี้ (desc)
//  ปุ่มลัด: G หักซ้าย · H หักขวา · T ยิงป้อมปืน · Y หลังคา (ไม่ชน 1–3 / F / Z / B / Enter / WASD / Q E / R / V ของเกม)
//  state.roadtrip.actions[youId] = รายการคีย์ที่ใช้ได้ (สตริง หรือ { key, cd, disabled, dmg, cdMax, range, desc }) — server/roadtrip/fight.js
import { useEffect, useRef } from "react";
import { clickSound } from "../audio";
import { rtEmit } from "./rtSocket";

const TURRET_RANGE = 4;
const I = {
  left: <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M30 10 L16 24 L30 38" /><path d="M40 10 L26 24 L40 38" /><path d="M8 12 V36" /></svg>,
  right: <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M18 10 L32 24 L18 38" /><path d="M8 10 L22 24 L8 38" /><path d="M40 12 V36" /></svg>,
  turret: <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="13" /><path d="M24 4 V14 M24 34 V44 M4 24 H14 M34 24 H44" /><circle cx="24" cy="24" r="3" /></svg>,
  up: <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 40 H40" /><path d="M14 30 H34 L30 22 H18 Z" /><path d="M24 18 V4 M17 11 L24 4 L31 11" /></svg>,
  down: <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 40 H40" /><path d="M14 30 H34 L30 22 H18 Z" /><path d="M24 4 V18 M17 11 L24 18 L31 11" /></svg>,
};

// รายการจาก server → [{ key, side?, cd, disabled, ... }] (รับได้ทั้งสตริง / ออบเจกต์ / แมป)
function normalize(raw) {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : Object.entries(raw).map(([k, v]) => (v === false || v == null ? null : typeof v === "object" ? { key: k, ...v } : { key: k }));
  return arr.filter(Boolean).map((a) => (typeof a === "string" ? { key: a } : a)).filter((a) => a && a.key);
}
const kindOf = (key) => {
  const k = String(key).toLowerCase();
  if (k.startsWith("swerve")) return { kind: "swerve", side: /left|:l$|l$/.test(k) && !/right/.test(k) ? "left" : /right|:r$|r$/.test(k) ? "right" : null };
  if (k.startsWith("turret")) return { kind: "turret" };
  if (k.startsWith("roof")) return { kind: "roof" };
  return { kind: null };
};

export function onRoof(rt, youId) {
  const c = rt && rt.combat;
  if (!c) return false;
  return Array.isArray(c.roofIds) ? c.roofIds.includes(youId) : c.roofId === youId || (Array.isArray(c.roofId) && c.roofId.includes(youId));
}

// ช่องที่ป้อมปืนยิงได้: ห่างช่องรถตู้ (ระยะเดิน) ≤ 4 · ไม่ใช่ช่องในรถ
export function turretTiles(rt, board, defs) {
  if (!board) return [];
  const cols = board.cols | 0, rows = board.rows | 0;
  const van = (defs && defs.vanTiles) || (board.special && board.special.van) || [];
  const vk = new Set(van.map(([x, y]) => `${x},${y}`));
  const range = (rt && rt.combat && rt.combat.turretRange) || TURRET_RANGE;
  const out = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (vk.has(`${x},${y}`)) continue;
    let d = Infinity;
    for (const [vx, vy] of van) { const dd = Math.abs(vx - x) + Math.abs(vy - y); if (dd < d) d = dd; }
    if (d <= range) out.push({ x, y });
  }
  return out;
}

/**
 * ปุ่มสำหรับ HudCommand extra (ตัวเลขตาม server/roadtrip/fight.js: ปาดรถ 2 + ขั้นกันชน คูลดาวน์ 2 · ป้อมปืน ขั้น + 1 ระยะ 4 · หลังคา ระยะ +2 ร่วง 25%)
 * @param rt        state.roadtrip
 * @param youId     ตัวเรา · me = ผู้เล่นของเรา (ตำแหน่ง — นั่งช่องคนขับแต่ปาดรถติดคูลดาวน์ = ปุ่มเทา + เลขเทิร์น)
 * @param round     state.roundNumber
 * @param enabled   ตาของเรา (ไม่ใช่ช่วงเดินต่อ/แคนโตะ)
 * @param picking   กำลังเลือกช่องยิงป้อมปืน
 * @param onTurret  เริ่ม/ยกเลิกการเลือกช่องยิง
 */
export function rtVanButtons({ rt, youId, me = null, round = 0, defs = null, enabled, picking, onTurret }) {
  if (!rt || rt.phase !== "combat" || !rt.combat || rt.combat.kind !== "onvan") return [];
  const list = normalize(rt.actions && rt.actions[youId]);
  const c = rt.combat, van = rt.van || {};
  const bumper = (van.upg && van.upg.bumper) | 0, tlv = (van.upg && van.upg.turret) | 0;
  // ปาดรถติดคูลดาวน์ (server ไม่ส่ง "swerve") แต่เรานั่งช่องคนขับ = แสดงปุ่มเทาพร้อมเลขเทิร์น
  const dt = (defs && defs.driverTile) || [13, 6];
  const onDriver = !!(me && me.pos && me.pos.x === dt[0] && me.pos.y === dt[1]);
  const swCd = Math.max(0, (c.swerveReady | 0) - (round | 0));
  if (onDriver && swCd > 0 && !list.some((a) => kindOf(a.key).kind === "swerve")) list.unshift({ key: "swerve", cd: swCd });
  if (!list.length) return [];
  const out = [];
  const off = (a) => !enabled || !!a.disabled || (a.cd | 0) > 0;
  for (const a of list) {
    const k = kindOf(a.key);
    if (k.kind === "swerve") {
      const sides = k.side ? [k.side] : ["left", "right"];
      const cool = (a.cd | 0) > 0;
      for (const side of sides) {
        const L = side === "left";
        out.push({
          key: `rt:swerve:${side}`, row: "rt-swerve", icon: I[side],
          name: cool ? (L ? "ซ้าย" : "ขวา") : L ? "หักรถชนซ้าย" : "หักรถชนขวา", // ติดคูลดาวน์ = ชื่อสั้น ให้เห็นเลข ⏳
          cd: a.cd | 0, disabled: off(a), hk: L ? "KeyG" : "KeyH", hkLabel: L ? "G" : "H",
          desc: a.desc || `ปาดรถชนมอนแถวข้างรถฝั่ง${L ? "ซ้าย" : "ขวา"} ดาเมจ ${(a.dmg || 2 + bumper)} กระเด็นออก 1 ช่อง${bumper ? "" : " · รถเสีย 1"} · คูลดาวน์ ${a.cdMax || 2} เทิร์น · คนบนหลังคาอาจร่วง`,
          onClick: () => { clickSound(); rtEmit("rt:swerve", { side }); },
        });
      }
    } else if (k.kind === "turret") {
      out.push({
        key: "rt:turret", icon: I.turret, name: "ยิงป้อมปืน", on: !!picking, cd: a.cd | 0, disabled: off(a) || van.turretReady === false || tlv < 1, hk: "KeyT", hkLabel: "T",
        desc: a.desc || `เลือกมอนในระยะ ${c.turretRange || TURRET_RANGE} ช่องจากรถ ดาเมจ ${a.dmg || tlv + 1} · ตาละ 1 ครั้ง`,
        onClick: () => { clickSound(); onTurret && onTurret(); },
      });
    } else if (k.kind === "roof") {
      const up = onRoof(rt, youId);
      out.push({
        key: "rt:roof", icon: up ? I.down : I.up, name: up ? "ลงจากหลังคา" : "ขึ้นหลังคา", cd: a.cd | 0, disabled: off(a), hk: "KeyY", hkLabel: "Y",
        desc: a.desc || (up ? "กลับลงในรถทางซันรูฟ" : "ปีนขึ้นหลังคาทางซันรูฟ ระยะโจมตี +2 · โดนได้แค่ตัวบิน/บอส · ปีนแล้วเดินต่อไม่ได้ในตานี้ · ถนนกระตุก/ปาดรถ อาจร่วง 25%"),
        onClick: () => { clickSound(); rtEmit("rt:roof"); },
      });
    }
  }
  return out;
}
// ประตูท้ายสลับได้ไหม (server ส่ง "rear" ตอนยืนแถวท้ายในตาตัวเอง)
export const canRear = (rt, youId) => normalize(rt && rt.actions && rt.actions[youId]).some((a) => a.key === "rear");

// ปุ่มลัดของปุ่มรถตู้ (e.code — แป้นไทยก็ใช้ได้) · กำลังพิมพ์ / มีหน้าต่างบัง = ไม่ทำงาน
export function useRtVanHotkeys(buttons) {
  const ref = useRef(buttons);
  ref.current = buttons;
  useEffect(() => {
    const onKey = (e) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      const b = (ref.current || []).find((x) => x.hk === e.code);
      if (!b || b.disabled) return;
      const el = document.activeElement;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (document.querySelector("[aria-modal='true']")) return;
      e.preventDefault();
      b.onClick();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
