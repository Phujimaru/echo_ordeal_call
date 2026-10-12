// ============================================================
//  ฉากเปลี่ยนภูมิภาค (การเดินทาง ทุก 6 เทิร์น · ปลายทางสุ่ม) — ORDEAL CALL · แบบ A "ดาวนำทาง"
//  <RegionTravel from={1..7} to={1..7} route={[1, …, from]} durationMs={ms} lowQ={bool} onDone={fn} />
//  ซูมออกจากสนามขึ้นไปเห็นลูกโลก → โลกหมุนช้าๆ ให้เห็นภูมิภาคเดิม → แสงลอยขึ้นจากภูมิภาคเดิม
//  → โค้งข้ามโลกแบบดาวหางลากหาง (เส้นทางตามผิวโลกค่อยๆ ลากตามใต้ดาว) → ตกที่ปลายทาง วงแสงกระแทก
//  → ป้ายชื่อภูมิภาคใหม่ → ดิ่งกลับลงที่จุดนั้น (ลุคเดียวกับฉากเริ่มเดินทาง แต่สั้นกว่า) → แฟลช แล้วจางเผยสนาม
//  ทุกเฟสคิดเป็นสัดส่วนของ durationMs (App คิดจากเวลาที่ server ยังพักเกมอยู่ ≈ 8.4 วิ)
//  ห้ามใส่เอฟเฟกต์โลกแตก/ร้าว — สงวนไว้ให้ท่าไม้ตายของ Echo
// ============================================================
import { useEffect, useRef, useState } from "react";
import GlobeCanvas from "../../globe/GlobeCanvas";
import { regionDir, COLORS } from "../../globe/globeCore";
import { clampJourneyArea, journeyArea } from "../../journey/areas";
import {
  REDUCED, clamp01, easeOutCubic, easeInOutCubic, span, aimAngles, setAim, createMarker, createDiveCamera, slerpDir, glowTexture,
} from "./diveKit";
import { DiveStreaks, DiveReticle, RegionTag, DiveImpact, Chrome } from "./DiveFx";
import { requestArenaLand } from "../../journey/arena/arenaLandBus";
import { holdBoard } from "../../board/boardPause";
import "./dive.css";

// สัดส่วนเวลา (คูณ D)
//  show..rise = โลกหมุนช้าให้เห็นภูมิภาคเดิม · rise..arc = แสงลอยขึ้น · arc..land = ดาวโค้งข้ามโลก
//  land = ตก + วงแสงกระแทก · tag = ป้ายชื่อ · ..aimToEnd = โลกหันปลายทางเข้ากลาง · dive/crash = ดิ่ง/ชน (เหมือนเดิม)
const T = { back: 0.16, show: 0.16, rise: 0.27, arc: 0.33, land: 0.6, tag: 0.64, aimToEnd: 0.78, dive: 0.78, crash: 0.88 };
const N = 120; // จำนวนช่วงของเส้นทางตามผิวโลก
const NP = 180; // จำนวนช่วงของทางดาว (ลอยขึ้น + โค้ง)
const RAD = 8; // จำนวนด้านของท่อ
const HAZE = 0.45; // มุมที่โลกเอียงหลบลงใต้เส้นทาง (เห็นดาวโค้งเหนือผิวโลก ไม่พุ่งเข้าหากล้องตรงๆ)

const pad2 = (n) => String(n).padStart(2, "0");

export default function RegionTravel({ from, to, route, durationMs, lowQ = false, onDone }) {
  const b = clampJourneyArea(to);
  const a = clampJourneyArea(from ?? 1);
  const A = journeyArea(b);
  const D = Math.max(3000, Number(durationMs) || 8400);
  const [phase, setPhase] = useState(0); // 0 ถอยออก · 1 ภูมิภาคเดิม · 2 ดาวโค้ง · 3 ถึง/ป้ายชื่อ · 4 ดิ่ง · 5 ชน/เผย
  const [landed, setLanded] = useState(false); // ดาวตกแล้ว (รู้ปลายทางแล้ว)

  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);
  const reticleRef = useRef(null);
  const tagRef = useRef(null);
  const globeWrapRef = useRef(null);

  useEffect(() => {
    const timers = [];
    const at = (ms, fn) => timers.push(setTimeout(fn, Math.max(0, ms)));
    let fired = false;
    at(T.show * D, () => setPhase(1));
    at(T.arc * D, () => setPhase(2));
    at(T.land * D, () => setLanded(true));
    at(T.tag * D, () => setPhase(3));
    at(T.dive * D, () => setPhase(4));
    at(T.crash * D, () => setPhase(5));
    // สนาม 2.5D ภูมิภาคใหม่เริ่มพุ่งลงใต้แฟลชตอนชน (เท่ากับจังหวะส่งต่อของฉากเปิดแมตช์: 10% ของช่วงเผย)
    at((T.crash + (1 - T.crash) * 0.1) * D, requestArenaLand);
    at(D, () => {
      if (fired) return;
      fired = true;
      if (typeof onDoneRef.current === "function") onDoneRef.current();
    });
    return () => timers.forEach(clearTimeout);
  }, [D]);

  const onReady = (core) => {
    const { THREE, spin } = core;
    const start = performance.now();
    core.setAutoSpin(0);
    core.setDrag(false);
    const dA = regionDir(a - 1), dB = regionDir(b - 1);
    const same = a === b;
    // ภูมิภาคเดียวกัน (ไม่ควรเกิด) — เบี่ยงต้นทางเล็กน้อยให้เส้นทางมีความยาว
    if (same) dA.applyAxisAngle(new THREE.Vector3(0, 1, 0), -0.6);
    // สีภูมิภาค (บางสีอ่อนมาก เช่นแดนน้ำแข็ง) — กดความสว่างให้เห็นชัดบนโลกสีขาว
    const vivid = (hex) => {
      const c = new THREE.Color(hex), hsl = {};
      c.getHSL(hsl);
      return c.setHSL(hsl.h, Math.max(hsl.s, 0.62), Math.min(hsl.l, 0.5));
    };
    const cA = vivid(journeyArea(a).color);
    const cB = vivid(A.color);
    const disposables = [];
    const added = [];
    const add = (...objs) => { spin.add(...objs); added.push(...objs); };
    const Z = new THREE.Vector3(0, 0, 1);
    // ท่อสีไล่ c0 → c1 ตามความยาว (segs ช่วง)
    const paintTube = (geo, segs, c0, c1, white = 0) => {
      const col = new Float32Array(geo.attributes.position.count * 3);
      const c = new THREE.Color(), W = new THREE.Color(0xffffff);
      for (let j = 0; j <= segs; j++) {
        c.copy(c0).lerp(c1, j / segs).lerp(W, white);
        for (let i = 0; i <= RAD; i++) col.set([c.r, c.g, c.b], (j * (RAD + 1) + i) * 3);
      }
      geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      return geo;
    };

    // ---------- เส้นทางตามผิวโลก (ยกโค้งขึ้นเล็กน้อยกลางทาง) — ลากตามใต้ดาว ----------
    const ang = Math.acos(Math.max(-1, Math.min(1, dA.dot(dB))));
    const lift = 0.03 + 0.07 * (ang / Math.PI);
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      pts.push(slerpDir(THREE, dA, dB, t).multiplyScalar(1.006 + lift * Math.sin(Math.PI * t)));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const coreGeo = paintTube(new THREE.TubeGeometry(curve, N, 0.0068, RAD, false), N, cA, cB);
    const glowGeo = paintTube(new THREE.TubeGeometry(curve, N, 0.019, RAD, false), N, cA, cB);
    coreGeo.setDrawRange(0, 0);
    glowGeo.setDrawRange(0, 0);
    const coreMat = new THREE.MeshBasicMaterial({ vertexColors: true });
    const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.26, depthWrite: false });
    const tube = new THREE.Mesh(coreGeo, coreMat);
    const glow = new THREE.Mesh(glowGeo, glowMat);
    add(glow, tube);
    disposables.push(coreGeo, glowGeo, coreMat, glowMat);

    // ---------- เส้นทางที่เดินมาแล้ว (route: ภูมิภาค I → … → ต้นทาง ตามที่สุ่มได้จริง) ค้างไว้บนโลก ไม่หายไป ----------
    //  วาดเต็มเส้นตั้งแต่เปิดฉาก สีไล่ตามภูมิภาคแต่ละช่วงเหมือนเส้นใหม่ · จุดเล็กตรงภูมิภาคที่ผ่านมา
    const trailMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false });
    const trailGlowMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.16, depthWrite: false });
    const dotGeo = new THREE.CircleGeometry(0.014, 20);
    disposables.push(trailMat, trailGlowMat, dotGeo);
    const past = Array.isArray(route) ? route.map(clampJourneyArea) : [];
    for (let k = 1; k < past.length && !same; k++) {
      if (past[k - 1] === past[k]) continue;
      const s0 = regionDir(past[k - 1] - 1), s1 = regionDir(past[k] - 1);
      const sAng = Math.acos(Math.max(-1, Math.min(1, s0.dot(s1))));
      const sLift = 0.03 + 0.07 * (sAng / Math.PI);
      const sp = [];
      for (let i = 0; i <= N; i++) sp.push(slerpDir(THREE, s0, s1, i / N).multiplyScalar(1.006 + sLift * Math.sin(Math.PI * (i / N))));
      const sCurve = new THREE.CatmullRomCurve3(sp);
      const c0 = vivid(journeyArea(past[k - 1]).color), c1 = vivid(journeyArea(past[k]).color);
      const tGeo = paintTube(new THREE.TubeGeometry(sCurve, N, 0.0058, RAD, false), N, c0, c1);
      const gGeo = paintTube(new THREE.TubeGeometry(sCurve, N, 0.016, RAD, false), N, c0, c1);
      add(new THREE.Mesh(gGeo, trailGlowMat), new THREE.Mesh(tGeo, trailMat));
      disposables.push(tGeo, gGeo);
      const dotMat = new THREE.MeshBasicMaterial({ color: c0, transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.copy(s0).multiplyScalar(1.008);
      dot.quaternion.setFromUnitVectors(Z, s0);
      add(dot);
      disposables.push(dotMat);
    }

    const tex = glowTexture(THREE);

    // ---------- ทางดาว: ลอยตรงขึ้นจากภูมิภาคเดิม แล้วโค้งสูงข้ามโลก ดิ่งลงปลายทาง ----------
    const hRise = 0.07;
    const H = 0.14 + 0.2 * (ang / Math.PI);
    const pathPts = [];
    for (let i = 0; i < 6; i++) pathPts.push(dA.clone().multiplyScalar(1.008 + (hRise * i) / 6));
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      pathPts.push(slerpDir(THREE, dA, dB, t).multiplyScalar(1.008 + hRise * (1 - t) + H * Math.sin(Math.PI * t)));
    }
    const path = new THREE.CatmullRomCurve3(pathPts, false, "centripetal");
    const pathLen = path.getLength();
    const sJ = hRise / pathLen; // สัดส่วนความยาวช่วงลอยขึ้น
    const tailS = Math.min(0.45, 0.42 / pathLen); // ความยาวหาง (สัดส่วนของทางดาว)
    // หางเส้นใน: ท่อบางสีขาวอมสีภูมิภาค วาดเฉพาะช่วงหลังหัวดาว
    const streakGeo = paintTube(new THREE.TubeGeometry(path, NP, 0.0045, RAD, false), NP, cA, cB, 0.35);
    streakGeo.setDrawRange(0, 0);
    const streakMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false });
    const streak = new THREE.Mesh(streakGeo, streakMat);
    add(streak);
    disposables.push(streakGeo, streakMat);
    // หางเรืองแสง: แสงกลมเรียงตามทาง เล็กลง/จางลงไปทางท้าย สีไล่จากภูมิภาคเดิม → ปลายทาง
    const TAIL = lowQ ? 14 : 30;
    const tail = [];
    for (let i = 0; i < TAIL; i++) {
      const m = new THREE.SpriteMaterial({ map: tex, color: cA.clone(), transparent: true, depthWrite: false, opacity: 0 });
      const s = new THREE.Sprite(m);
      add(s);
      disposables.push(m);
      tail.push({ s, m });
    }
    // หัวดาว: แสงสีภูมิภาค + แกนขาว
    const headGlowMat = new THREE.SpriteMaterial({ map: tex, color: cA.clone(), transparent: true, depthWrite: false, opacity: 0 });
    const headCoreMat = new THREE.SpriteMaterial({ map: tex, color: 0xffffff, transparent: true, depthWrite: false, opacity: 0 });
    const headGlow = new THREE.Sprite(headGlowMat);
    const headCore = new THREE.Sprite(headCoreMat);
    add(headGlow, headCore);
    disposables.push(headGlowMat, headCoreMat);

    // ---------- วงแสง: ตอนลอยขึ้น (ต้นทาง) · ตอนตก 2 ชั้น + แสงวาบ (ปลายทาง) ----------
    const ringAt = (dir, color, r0, r1) => {
      const geo = new THREE.RingGeometry(r0, r1, 56);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(dir).multiplyScalar(1.007);
      m.quaternion.setFromUnitVectors(Z, dir);
      add(m);
      disposables.push(geo, mat);
      return { m, mat };
    };
    const launchRing = ringAt(dA, cA, 0.04, 0.05);
    const hitRing = ringAt(dB, cB, 0.05, 0.062);
    const hitRing2 = ringAt(dB, cB, 0.05, 0.055);
    const hitFillMat = new THREE.SpriteMaterial({ map: tex, color: cB, transparent: true, depthWrite: false, opacity: 0 });
    const hitFlashMat = new THREE.SpriteMaterial({ map: tex, color: 0xffffff, transparent: true, depthWrite: false, opacity: 0 });
    const hitFill = new THREE.Sprite(hitFillMat);
    const hitFlash = new THREE.Sprite(hitFlashMat);
    hitFill.position.copy(dB).multiplyScalar(1.012);
    hitFlash.position.copy(dB).multiplyScalar(1.016);
    add(hitFill, hitFlash);
    disposables.push(hitFillMat, hitFlashMat);

    // วงสำรวจ: ต้นทาง (สีภูมิภาคเดิม) · ปลายทาง (ลุคเดิมของฉากดิ่ง)
    const mFrom = createMarker(core, dA, spin, { inner: cA.getHex(), mid: cA.getHex(), outer: COLORS.sky });
    const mTo = createMarker(core, dB);
    added.push(mFrom.group, mTo.group);

    // ---------- ทิศของโลก: จุดบนเส้นทาง (w) เอียงหลบลงใต้เส้นทาง (tilt) ให้เห็นดาวโค้งเหนือผิว ----------
    const nrm = new THREE.Vector3().crossVectors(dA, dB);
    if (nrm.lengthSq() < 1e-8) nrm.crossVectors(dA, new THREE.Vector3(0, 1, 0));
    if (nrm.lengthSq() < 1e-8) nrm.set(1, 0, 0);
    nrm.normalize();
    // ฝั่งที่เป็น "ใต้" บนจอ — เทียบแกนตั้งหลังหมุน spin/tilt ของ core (คงที่ระหว่างฉาก)
    const nView = nrm.clone().applyQuaternion(core.spin.quaternion).applyQuaternion(core.tilt.quaternion);
    if (nView.y < 0) nrm.negate();
    const G = new THREE.Vector3();
    const aimFor = (w, tilt, out) => {
      slerpDir(THREE, dA, dB, w, G);
      return out.copy(G).multiplyScalar(Math.cos(tilt)).addScaledVector(nrm, -Math.sin(tilt)).normalize();
    };

    const diveCam = createDiveCamera(core, { lowQ, wrapEl: () => globeWrapRef.current });
    const aimDir = dA.clone(), aimGoal = new THREE.Vector3(), P = new THREE.Vector3(), head = new THREE.Vector3(), Q = new THREE.Vector3();
    const total = coreGeo.index.count;
    const perSeg = RAD * 6;
    let last = start;

    // ความคืบหน้าของดาวบนทาง (0..1 ตามความยาว) — ลอยขึ้นแล้วชะลอค้าง → พุ่งออกเร่งขึ้นจนกระแทก
    const progressAt = (u) => {
      if (u < T.arc) return sJ * easeOutCubic(span(u, T.rise, T.arc));
      const k = span(u, T.arc, T.land);
      return sJ + (1 - sJ) * (0.3 * k + 0.7 * k * k);
    };

    const off = core.onFrame(() => {
      const now = performance.now();
      const u = (now - start) / D;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;

      // ---------- ดาว ----------
      const s = REDUCED ? span(u, T.rise, T.land) : progressAt(u);
      path.getPointAt(s, head);
      const headK = span(u, T.rise, T.rise + 0.03) * (1 - span(u, T.land, T.land + 0.02));
      const cs = clamp01((s - sJ) / (1 - sJ));
      const beat = 1 + 0.16 * Math.sin(now / 80);
      headGlow.position.copy(head);
      headCore.position.copy(head);
      headGlowMat.color.copy(cA).lerp(cB, cs);
      headGlowMat.opacity = 0.95 * headK;
      headCoreMat.opacity = headK;
      headGlow.scale.setScalar(0.19 * beat * (u < T.arc ? 0.7 + 0.3 * span(u, T.rise, T.arc) : 1));
      headCore.scale.setScalar(0.06);
      // หาง (จางลงหลังตก)
      const tailK = span(u, T.rise, T.rise + 0.03) * (1 - span(u, T.land, T.land + 0.05));
      const tailLen = Math.min(s, tailS);
      for (let i = 0; i < TAIL; i++) {
        const f = (i + 1) / TAIL;
        const si = Math.max(0, s - tailLen * f);
        const { s: sp, m } = tail[i];
        path.getPointAt(si, sp.position);
        m.color.copy(cA).lerp(cB, clamp01((si - sJ) / (1 - sJ)));
        m.opacity = 0.8 * Math.pow(1 - f, 1.4) * tailK;
        sp.scale.setScalar(0.014 + 0.1 * Math.pow(1 - f, 0.9));
      }
      const segHead = Math.floor(s * NP);
      const segTail = Math.floor(Math.max(0, s - tailLen) * NP);
      const stK = u >= T.rise ? 1 - span(u, T.land, T.land + 0.05) : 0;
      streakGeo.setDrawRange(segTail * perSeg, stK > 0 ? Math.max(0, segHead - segTail) * perSeg : 0);
      streakMat.opacity = 0.95 * stK;

      // ---------- เส้นทางตามผิวโลก ลากตามใต้หัวดาว ----------
      Q.copy(head).normalize();
      const tg = s <= sJ ? 0 : clamp01(Math.acos(Math.max(-1, Math.min(1, Q.dot(dA)))) / Math.max(1e-4, ang));
      const range = Math.round((u >= T.land ? 1 : tg) * N) * perSeg;
      coreGeo.setDrawRange(0, Math.min(total, range));
      glowGeo.setDrawRange(0, Math.min(glowGeo.index.count, range));
      // เส้นจางลงตอนดิ่ง (กล้องลงไปใกล้ผิว)
      glowMat.opacity = 0.26 * (1 - span(u, T.dive, T.dive + 0.1));

      // ---------- วงแสง ----------
      const lk = span(u, T.rise, T.rise + 0.09);
      launchRing.m.scale.setScalar(1 + lk * 4);
      launchRing.mat.opacity = lk > 0 && lk < 1 ? 0.8 * (1 - lk) : 0;
      const hk = span(u, T.land, T.land + 0.1);
      hitRing.m.scale.setScalar(1 + easeOutCubic(hk) * 6);
      hitRing.mat.opacity = hk > 0 && hk < 1 ? 0.9 * (1 - hk) : 0;
      const hk2 = span(u, T.land + 0.02, T.land + 0.15);
      hitRing2.m.scale.setScalar(1 + easeOutCubic(hk2) * 9);
      hitRing2.mat.opacity = hk2 > 0 && hk2 < 1 ? 0.6 * (1 - hk2) : 0;
      const fk = span(u, T.land, T.land + 0.05);
      hitFlash.scale.setScalar(0.08 + 0.42 * easeOutCubic(fk));
      hitFlashMat.opacity = fk > 0 && fk < 1 ? 1 - fk : 0;
      const gk = span(u, T.land, T.land + 0.16);
      hitFill.scale.setScalar(0.12 + 0.3 * easeOutCubic(gk));
      hitFillMat.opacity = gk > 0 && gk < 1 ? 0.75 * (1 - gk) : 0;

      // วงต้นทาง: กางตอนเห็นโลก หุบหลังดาวออกไปแล้ว · วงปลายทาง: กางตอนดาวตก
      mFrom.update(clamp01(span(u, 0.1, 0.2) - span(u, T.arc + 0.06, T.arc + 0.16)), now - start, 0.8);
      mTo.update(clamp01((u - T.land) / 0.08), now - start);

      // ---------- ทิศของโลก ----------
      //  ถอยออก: ต้นทาง · ภูมิภาคเดิม: หมุนช้าๆ เลื่อนไปทางที่จะไป + เอียงหลบลงใต้ · ดาวโค้ง: ตามดาว (ช้ากว่าเล็กน้อย)
      //  ตกแล้ว: ปลายทางเข้ากลางจอ ก่อนดิ่ง
      if (REDUCED) slerpDir(THREE, dA, dB, 0.5, aimDir);
      else if (same || u >= T.aimToEnd) aimDir.copy(dB);
      else {
        if (u < T.show) aimGoal.copy(dA);
        else if (u < T.arc) {
          const k = easeInOutCubic(span(u, T.show, T.arc));
          aimFor(0.1 * k, HAZE * k, aimGoal);
        } else if (u < T.land) aimFor(0.1 + 0.78 * cs, HAZE, aimGoal);
        else {
          const k = easeInOutCubic(span(u, T.land, T.aimToEnd));
          aimFor(0.88 + 0.12 * k, HAZE * (1 - k), aimGoal);
        }
        aimDir.lerp(aimGoal, 1 - Math.exp(-dt * (u < T.land ? 3.5 : 6))).normalize();
      }
      const aim = aimAngles(core, aimDir);
      setAim(core, aim.yaw, aim.pitch);

      // ---------- กล้อง: ถอยออกจากผิวโลก (ต้นทาง) → ระยะปกติ → ดิ่งลง (ปลายทาง) ----------
      if (REDUCED) {
        diveCam.frame(P.set(0, 0, 0), 0, 0);
      } else if (u < T.back) {
        // ค้างใกล้ผิวโลกช่วงสั้นๆ ระหว่างสนามจางหาย แล้วค่อยถอยออก (เร็วกลางทาง ช้าลงตอนจบ)
        const z = span(u, 0.02, T.back);
        const e = 1 - easeInOutCubic(z);
        P.copy(dA);
        spin.localToWorld(P);
        diveCam.frame(P, e, Math.pow(e, 1 / 2.4), { scaleWrap: false, shake: false });
      } else {
        const d = clamp01((u - T.dive) / (T.crash - T.dive));
        P.copy(dB);
        spin.localToWorld(P);
        diveCam.frame(P, Math.pow(d, 2.4), d);
      }

      // ---------- ป้าย/เป้าบนจอ ----------
      P.copy(dB);
      spin.localToWorld(P);
      const sp = core.project(P);
      const d = clamp01((u - T.dive) / (T.crash - T.dive));
      const ret = reticleRef.current;
      if (ret) ret.style.transform = `translate3d(${sp.x.toFixed(1)}px, ${sp.y.toFixed(1)}px, 0) scale(${(1 + 2.6 * Math.pow(d, 2.4)).toFixed(3)})`;
      const tag = tagRef.current;
      if (tag) tag.style.transform = `translate3d(${sp.x.toFixed(1)}px, ${sp.y.toFixed(1)}px, 0)`;
    });

    return () => {
      off();
      spin.remove(...added);
      disposables.forEach((x) => x.dispose());
      core.world.rotation.set(0, 0, 0);
    };
  };

  const crash = phase >= 5;
  // กระดานข้างใต้ถูกพื้นขาวทึบบังตั้งแต่ถอยออกจนถึงจังหวะชน → พักวาดกระดาน (ไม่ให้แย่งเครื่องกับลูกโลก)
  //  เฟส 4 (ชน/เผย) ปล่อยให้วาดต่อก่อนพื้นขาวหาย
  useEffect(() => (crash ? undefined : holdBoard()), [crash]);
  return (
    <div
      className={`ocd ocd-travel ocd-p${Math.max(0, phase - 1)}${crash ? " is-crash" : ""}${lowQ ? " is-lowq" : ""}`}
      style={{ "--rev": `${Math.round((1 - T.crash) * D)}ms`, "--in": `${Math.round(Math.min(700, T.back * D * 0.5))}ms` }}
    >
      {/* ม่านขาวโปร่งใช้แค่ช่วงถอยออก (เฟส 0) — หลังจากนั้นพื้นขาว .ocd-bg ทึบบังสนามแล้ว */}
      {!lowQ && phase === 0 && <div className="ocd-travel-veil" aria-hidden="true" />}
      <div className="ocd-bg" aria-hidden="true" />
      <div className="ocd-globe" ref={globeWrapRef}>
        <GlobeCanvas shared={false} layout={{ x: 0, y: 0, s: 1 }} drag={false} sand={!lowQ} autoSpin={0} onReady={onReady} />
      </div>

      <DiveStreaks show={phase === 0 && !REDUCED} seed={b + 11} lowQ={lowQ} reverse />
      <DiveStreaks show={phase === 4} seed={b} lowQ={lowQ} />
      <DiveReticle ref={reticleRef} />
      <RegionTag ref={tagRef} area={b} />

      <Chrome>
        <span className="ocd-mark is-r oc-latin"><b>{pad2(a)}</b> → <b>{landed ? pad2(b) : "??"}</b></span>
      </Chrome>

      <DiveImpact area={b} lowQ={lowQ} />
    </div>
  );
}
