// ============================================================
//  ฉากเปลี่ยนภูมิภาค (การเดินทาง ทุก 6 เทิร์น · ปลายทางสุ่ม) — ORDEAL CALL
//  <RegionTravel from={1..7} to={1..7} route={[1, …, from]} durationMs={ms} lowQ={bool} onDone={fn} />
//  ซูมออกจากสนามขึ้นไปเห็นลูกโลก → สุ่ม: หมุดภูมิภาคที่เป็นไปได้ติดไฟสลับกัน (ช้าลงเรื่อยๆ) โลกเอียงตาม แล้วล็อกที่ปลายทาง
//  → เส้นเรืองแสงวิ่งตามผิวโลก (วงกลมใหญ่) จากภูมิภาคเดิมไปภูมิภาคใหม่ → ป้ายชื่อภูมิภาคใหม่
//  → ดิ่งกลับลงที่จุดนั้น (ลุคเดียวกับฉากเริ่มเดินทาง แต่สั้นกว่า) → แฟลช แล้วจางเผยสนาม
//  ทุกเฟสคิดเป็นสัดส่วนของ durationMs (App คิดจากเวลาที่ server ยังพักเกมอยู่ ≈ 8.4 วิ)
// ============================================================
import { useEffect, useRef, useState } from "react";
import GlobeCanvas from "../../globe/GlobeCanvas";
import { regionDir, COLORS } from "../../globe/globeCore";
import { clampJourneyArea, journeyArea, JOURNEY_AREA_COUNT } from "../../journey/areas";
import {
  REDUCED, clamp01, easeInOutCubic, span, aimAngles, setAim, createMarker, createDiveCamera, slerpDir, glowTexture,
} from "./diveKit";
import { DiveStreaks, DiveReticle, RegionTag, DiveImpact, Chrome } from "./DiveFx";
import { requestArenaLand } from "../../journey/arena/arenaLandBus";
import { holdBoard } from "../../board/boardPause";
import "./dive.css";

// สัดส่วนเวลา (คูณ D) — spin..lock = สุ่ม (หมุดสลับไฟ) · lock..travel = ค้างที่ปลายทางที่สุ่มได้
const T = { back: 0.16, spin: 0.16, lock: 0.43, travel: 0.48, travelEnd: 0.68, tag: 0.64, aimTo: 0.69, aimToEnd: 0.78, dive: 0.78, crash: 0.88 };
const N = 120; // จำนวนช่วงของเส้นทาง
const HOPS = REDUCED ? 5 : 13; // จำนวนครั้งที่ไฟสลับก่อนล็อก

// ลำดับไฟสุ่ม (จบที่ปลายทางเสมอ · ไม่ซ้ำติดกัน) — สุ่มแบบมี seed ให้ฉากเดิมเล่นเหมือนเดิมทุกครั้งที่ mount
function hopSequence(cands, to, seed) {
  let x = (seed * 2654435761) >>> 0 || 1;
  const rnd = () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
  const seq = [to];
  for (let k = 0; k < HOPS; k++) {
    const pool = cands.filter((c) => c !== seq[0]);
    seq.unshift(pool[Math.floor(rnd() * pool.length)] ?? to);
  }
  return seq;
}

const pad2 = (n) => String(n).padStart(2, "0");

export default function RegionTravel({ from, to, route, durationMs, lowQ = false, onDone }) {
  const b = clampJourneyArea(to);
  const a = clampJourneyArea(from ?? 1);
  const A = journeyArea(b);
  const D = Math.max(3000, Number(durationMs) || 8400);
  const [phase, setPhase] = useState(0); // 0 ถอยออก · 1 สุ่ม · 2 เดินทาง · 3 ถึง/ป้ายชื่อ · 4 ดิ่ง · 5 ชน/เผย
  const [locked, setLocked] = useState(false); // สุ่มเสร็จ (รู้ปลายทางแล้ว)

  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);
  const reticleRef = useRef(null);
  const tagRef = useRef(null);
  const globeWrapRef = useRef(null);
  const rouletteRef = useRef(null);

  useEffect(() => {
    const timers = [];
    const at = (ms, fn) => timers.push(setTimeout(fn, Math.max(0, ms)));
    let fired = false;
    at(T.spin * D, () => setPhase(1));
    at(T.lock * D, () => setLocked(true));
    at(T.travel * D, () => setPhase(2));
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

    // ---------- เส้นทางตามผิวโลก (ยกโค้งขึ้นเล็กน้อยกลางทาง) ----------
    const ang = Math.acos(Math.max(-1, Math.min(1, dA.dot(dB))));
    const lift = 0.03 + 0.07 * (ang / Math.PI);
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      pts.push(slerpDir(THREE, dA, dB, t).multiplyScalar(1.006 + lift * Math.sin(Math.PI * t)));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const colorTube = (geo, radial) => {
      const cnt = geo.attributes.position.count;
      const col = new Float32Array(cnt * 3);
      const c = new THREE.Color();
      for (let j = 0; j <= N; j++) {
        c.copy(cA).lerp(cB, j / N);
        for (let i = 0; i <= radial; i++) col.set([c.r, c.g, c.b], (j * (radial + 1) + i) * 3);
      }
      geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      geo.setDrawRange(0, 0);
      return geo;
    };
    const RAD = 8;
    const coreGeo = colorTube(new THREE.TubeGeometry(curve, N, 0.0068, RAD, false), RAD);
    const glowGeo = colorTube(new THREE.TubeGeometry(curve, N, 0.019, RAD, false), RAD);
    const coreMat = new THREE.MeshBasicMaterial({ vertexColors: true });
    const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.26, depthWrite: false });
    const tube = new THREE.Mesh(coreGeo, coreMat);
    const glow = new THREE.Mesh(glowGeo, glowMat);
    spin.add(glow, tube);
    // เส้นประของเส้นทางทั้งเส้น (เห็นก่อนเส้นจริงวิ่งทับ)
    const dashGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(N));
    const dashMat = new THREE.LineDashedMaterial({ color: COLORS.azure, transparent: true, opacity: 0, dashSize: 0.018, gapSize: 0.014, depthWrite: false });
    const dash = new THREE.Line(dashGeo, dashMat);
    dash.computeLineDistances();
    spin.add(dash);
    disposables.push(coreGeo, glowGeo, coreMat, glowMat, dashGeo, dashMat);

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
      const paint = (geo) => {
        const col = new Float32Array(geo.attributes.position.count * 3);
        const c = new THREE.Color();
        for (let j = 0; j <= N; j++) {
          c.copy(c0).lerp(c1, j / N);
          for (let i = 0; i <= RAD; i++) col.set([c.r, c.g, c.b], (j * (RAD + 1) + i) * 3);
        }
        geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
        return geo;
      };
      const tGeo = paint(new THREE.TubeGeometry(sCurve, N, 0.0058, RAD, false));
      const gGeo = paint(new THREE.TubeGeometry(sCurve, N, 0.016, RAD, false));
      spin.add(new THREE.Mesh(gGeo, trailGlowMat), new THREE.Mesh(tGeo, trailMat));
      disposables.push(tGeo, gGeo);
      const dotMat = new THREE.MeshBasicMaterial({ color: c0, transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.copy(s0).multiplyScalar(1.008);
      dot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), s0);
      spin.add(dot);
      disposables.push(dotMat);
    }

    const tex = glowTexture(THREE);

    // ---------- สุ่ม: หมุดทุกภูมิภาคที่เป็นไปได้ (II–VII ยกเว้นต้นทาง) — ไฟวิ่งสลับ ช้าลงจนล็อกที่ปลายทาง ----------
    const cands = [];
    for (let k = 2; k <= JOURNEY_AREA_COUNT; k++) if (k !== a) cands.push(k);
    if (!cands.includes(b)) cands.push(b);
    const seq = hopSequence(cands, b, a * 7 + b);
    const hopAt = seq.map((_, k) => T.spin + 0.02 + (T.lock - T.spin - 0.02) * Math.pow(k / HOPS, 1.8));
    const ringGeo = new THREE.RingGeometry(0.032, 0.04, 40);
    const lockGeo = new THREE.RingGeometry(0.05, 0.058, 48);
    disposables.push(ringGeo, lockGeo);
    const pins = {};
    for (const k of cands) {
      const dir = regionDir(k - 1);
      const col = vivid(journeyArea(k).color);
      const glowM = new THREE.SpriteMaterial({ map: tex, color: col, transparent: true, depthWrite: false, opacity: 0 });
      const ringM = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
      const sp = new THREE.Sprite(glowM);
      sp.position.copy(dir).multiplyScalar(1.01);
      const ring = new THREE.Mesh(ringGeo, ringM);
      ring.position.copy(dir).multiplyScalar(1.006);
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      spin.add(sp, ring);
      disposables.push(glowM, ringM);
      pins[k] = { dir, sp, ring, glowM, ringM, heat: 0 };
    }
    // คลื่นตอนล็อกปลายทาง
    const lockMat = new THREE.MeshBasicMaterial({ color: cB, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const lockRing = new THREE.Mesh(lockGeo, lockMat);
    lockRing.position.copy(dB).multiplyScalar(1.007);
    lockRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dB);
    spin.add(lockRing);
    disposables.push(lockMat);
    let hop = -1;

    // หัวเส้น: จุดขาว + แสงสีภูมิภาคปลายทาง
    const headGlowMat = new THREE.SpriteMaterial({ map: tex, color: cB, transparent: true, depthWrite: false, opacity: 0 });
    const headCoreMat = new THREE.SpriteMaterial({ map: tex, color: 0xffffff, transparent: true, depthWrite: false, opacity: 0 });
    const headGlow = new THREE.Sprite(headGlowMat);
    const headCore = new THREE.Sprite(headCoreMat);
    headGlow.scale.setScalar(0.11);
    headCore.scale.setScalar(0.036);
    spin.add(headGlow, headCore);
    disposables.push(headGlowMat, headCoreMat);

    // วงสำรวจ: ต้นทาง (สีภูมิภาคเดิม) · ปลายทาง (ลุคเดิมของฉากดิ่ง)
    const mFrom = createMarker(core, dA, spin, { inner: cA.getHex(), mid: cA.getHex(), outer: COLORS.sky });
    const mTo = createMarker(core, dB);
    // คลื่นตอนหัวเส้นถึงปลายทาง
    const burstMat = new THREE.MeshBasicMaterial({ color: cB, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const burstGeo = new THREE.RingGeometry(0.05, 0.058, 48);
    const burst = new THREE.Mesh(burstGeo, burstMat);
    burst.position.copy(dB).multiplyScalar(1.006);
    burst.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dB);
    spin.add(burst);
    disposables.push(burstMat, burstGeo);

    const diveCam = createDiveCamera(core, { lowQ, wrapEl: () => globeWrapRef.current });
    const aimDir = dA.clone(), aimGoal = new THREE.Vector3(), P = new THREE.Vector3(), head = new THREE.Vector3();
    const total = coreGeo.index.count;
    let last = start;

    const off = core.onFrame(() => {
      const now = performance.now();
      const u = (now - start) / D;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;

      // ---------- สุ่ม: ไฟวิ่งไปหมุดตามลำดับ seq ----------
      let h = -1;
      for (let k = 0; k < hopAt.length; k++) if (u >= hopAt[k]) h = k;
      const hl = h >= 0 ? seq[h] : null;
      if (h !== hop) {
        hop = h;
        const el = rouletteRef.current;
        if (el && hl) {
          const R = journeyArea(hl);
          el.style.setProperty("--ac", R.color);
          el.querySelector("b").textContent = R.numeral;
          el.querySelector("span").textContent = R.name;
          el.classList.remove("hop");
          void el.offsetWidth; // เริ่มแอนิเมชันเด้งใหม่ทุกครั้งที่ไฟย้าย
          el.classList.add("hop");
          el.classList.toggle("lock", h === seq.length - 1);
        }
      }
      const pinsK = span(u, T.spin - 0.02, T.spin + 0.04);
      const fadeOthers = span(u, T.lock, T.travel);
      const final = h === seq.length - 1;
      for (const k of cands) {
        const pn = pins[k];
        pn.heat = hl === k ? 1 : Math.max(0, pn.heat - dt * 5);
        const chosen = final && k === b;
        const vis = pinsK * (chosen ? 1 - span(u, T.tag, T.tag + 0.06) : 1 - fadeOthers);
        const lit = chosen ? 1 : pn.heat;
        pn.glowM.opacity = vis * (0.55 + 0.45 * lit);
        pn.ringM.opacity = vis * (0.45 + 0.55 * lit);
        pn.sp.scale.setScalar(0.09 + 0.13 * lit * (chosen ? 1 + 0.12 * Math.sin(now / 110) : 1));
        pn.ring.scale.setScalar(1.3 + 1.1 * lit);
      }
      const lk = span(u, T.lock, T.lock + 0.1);
      lockRing.scale.setScalar(1 + lk * 5);
      lockMat.opacity = lk > 0 && lk < 1 ? 0.85 * (1 - lk) : 0;

      // ---------- ทิศของโลก: ต้นทาง → (สุ่ม) กึ่งกลางระหว่างต้นทางกับหมุดที่ติดไฟ → กึ่งกลางเส้นทาง (ตามหัวเส้นเล็กน้อย) → ปลายทาง ----------
      if (REDUCED) slerpDir(THREE, dA, dB, 0.5, aimDir);
      else if (same || u >= T.aimToEnd) aimDir.copy(dB);
      else {
        if (u < T.spin) aimGoal.copy(dA);
        else if (u < T.travel) slerpDir(THREE, dA, hl ? pins[hl].dir : dA, u < T.lock ? 0.7 : 0.5, aimGoal);
        else {
          let w = 0.5 + easeInOutCubic(span(u, T.travel, T.travelEnd)) * 0.1;
          w += (1 - w) * easeInOutCubic(span(u, T.aimTo, T.aimToEnd));
          slerpDir(THREE, dA, dB, w, aimGoal);
        }
        // ตามเป้าแบบหน่วง — ไฟสลับเร็วตอนต้น โลกจึงเอียงไปมานุ่มๆ ไม่สะบัด
        aimDir.lerp(aimGoal, 1 - Math.exp(-dt * (u < T.travel ? 4 : 7))).normalize();
      }
      const aim = aimAngles(core, aimDir);
      setAim(core, aim.yaw, aim.pitch);

      // ---------- เส้นทาง ----------
      const dashK = span(u, T.lock, T.lock + 0.05); // เส้นประของเส้นทางจริงโผล่หลังล็อกเท่านั้น (ไม่ใบ้ปลายทางระหว่างสุ่ม)
      dashMat.opacity = 0.55 * dashK * (1 - span(u, T.dive, T.dive + 0.08));
      const tk = REDUCED ? span(u, T.travel, T.travelEnd) : easeInOutCubic(span(u, T.travel, T.travelEnd));
      const segs = Math.round(tk * N);
      const range = segs * RAD * 6;
      coreGeo.setDrawRange(0, Math.min(total, range));
      glowGeo.setDrawRange(0, Math.min(glowGeo.index.count, range));
      const moving = tk > 0 && tk < 1;
      curve.getPoint(tk, head);
      headGlow.position.copy(head);
      headCore.position.copy(head);
      const headK = tk > 0 ? (1 - span(u, T.travelEnd, T.travelEnd + 0.06)) : 0;
      const beat = 1 + 0.18 * Math.sin(now / 90);
      headGlowMat.opacity = 0.9 * headK;
      headCoreMat.opacity = headK;
      headGlow.scale.setScalar(0.11 * (moving ? beat : 1));

      // วงต้นทาง: กางตอนเห็นโลก หุบตอนออกเดินทาง · วงปลายทาง: กางตอนหัวเส้นใกล้ถึง
      mFrom.update(clamp01(span(u, 0.1, 0.2) - span(u, T.travel + 0.1, T.travelEnd)), now - start, 0.8);
      mTo.update(clamp01((u - T.tag) / 0.08), now - start);
      const bk = span(u, T.travelEnd - 0.01, T.travelEnd + 0.12);
      burst.scale.setScalar(1 + bk * 5);
      burstMat.opacity = bk > 0 && bk < 1 ? 0.85 * (1 - bk) : 0;
      // เส้นจางลงตอนดิ่ง (กล้องลงไปใกล้ผิว)
      glowMat.opacity = 0.26 * (1 - span(u, T.dive, T.dive + 0.1));

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
      spin.remove(glow, tube, dash, headGlow, headCore, burst, lockRing, mFrom.group, mTo.group);
      for (const k of cands) spin.remove(pins[k].sp, pins[k].ring);
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
      <div className={`ocd-roulette${phase === 1 || phase === 2 ? " on" : ""}`} aria-hidden="true">
        {/* ชั้นในเปลี่ยนข้อความ/คลาส hop·lock จาก onFrame เอง — ไม่ให้ React เขียน className ทับตอน re-render */}
        <div className="ocd-rou-in" ref={rouletteRef}>
          <b className="oc-latin" />
          <span />
        </div>
      </div>

      <Chrome>
        <span className="ocd-mark is-r oc-latin"><b>{pad2(a)}</b> → <b>{locked ? pad2(b) : "??"}</b></span>
      </Chrome>

      <DiveImpact area={b} lowQ={lowQ} />
    </div>
  );
}

