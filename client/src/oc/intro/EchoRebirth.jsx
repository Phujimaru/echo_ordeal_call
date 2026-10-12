// ============================================================
//  ฉากท่าไม้ตาย Echo "ก่อกำเนิดใหม่" — เฉพาะ Echo เท่านั้น (ผู้ใช้สั่ง: ห้ามนำฉากโลกแตกไปใช้กับตัวละคร/ฉากอื่น)
//  <EchoRebirth from={1..7} to={1..7} endsInMs={ms} waiting={bool} lowQ={bool} onDone={fn} />
//  ต้นแบบที่ผู้ใช้อนุมัติ: .claude/plans/echo-rebirth.html (รวมพลังแบบ C เท่านั้น)
//  ลำดับ: กระดานถอยออก → ลูกโลก → ฟ้ากลายเป็นอวกาศม่วง Echo ประคองโลก → รวมพลัง (ดาวถูกดูด · แขนเกลียว 4 แขน
//   · โลกเต้นตุบถี่ขึ้น + คลื่นแสง · สายฟ้า · รอยร้าวลาม) → บีบ (แสงทะลักจากรอยร้าว · ผิวยุบใต้นิ้ว · ดูดแสงเข้า)
//   → หยุดค้าง 0.4 วิ (ภาพนิ่งสีซีด) → ระเบิดเป็นเศษ 3 มิติ ~90 ชิ้น → เศษลอยช้า → ดูดกลับประกอบ (ชิ้นสุดท้ายสีทอง = ภูมิภาคใหม่)
//   → Echo สลายเป็นประกาย → โลกหมุนไปภูมิภาคใหม่ (จุดเรืองทอง + ชื่อภูมิภาค) → ดิ่งลง → แฟลช → กระดานใหม่
//  ไม่มีชื่อท่า/ชื่อตัวละครบนจอ (ผู้ใช้สั่ง) · ชื่อภูมิภาคปลายทางมีได้
//
//  จังหวะกับ server: server พักเกม (CUTSCENE) REBIRTH_SECONDS = 18 วิ โดยยังส่งกระดาน/ภูมิภาคเดิม
//   → หมดเวลา server ลงความเสียหาย + ภูมิภาคใหม่ + วางกระดานใหม่ และ scene.active = false ในบรอดแคสต์เดียว (waiting → false)
//   ฉากนี้แฟลชขาวทึบที่ ~17.55 วิ แล้วค้างขาวรอ waiting = false → สั่งกระดานใหม่พุ่งลง (requestArenaLand) แล้วจางเผย
//   endsInMs = เวลาที่ server ยังพักเกมเหลือ (เข้ากลางฉาก = เริ่มเล่นจากกลางฉากให้จบพร้อมคนอื่น)
//  เวลาในฉากคิดจากนาฬิกาอย่างเดียว (ไม่มีสถานะสะสม) — dev: window.__seek(วินาที) ดูภาพนิ่ง · __seek(null) เล่นต่อ
// ============================================================
import { useEffect, useRef } from "react";
import GlobeCanvas from "../../globe/GlobeCanvas";
import { getEarth, regionDir } from "../../globe/globeCore";
import { clampJourneyArea, journeyArea } from "../../journey/areas";
import { requestArenaLand, requestArenaLeave } from "../../journey/arena/arenaLandBus";
import { holdBoard } from "../../board/boardPause";
import { playSceneMusic } from "../../audio";
import "./echoRebirth.css";

// รูป Echo ประคองโลก (ผู้ใช้วาด · ลูกกลมเจาะโปร่งไว้แล้ว นิ้วทึบอยู่หน้าลูกกลม) — พิกัดรูปของรูลูกกลม (วัดจากไฟล์จริง)
const ART_SRC = "/characters/echo/echo_rebirth_hold.webp";
const ART = { w: 1113, h: 1074, cx: 552, cy: 683.5, r: 169 }; // r = รัศมีแนวตั้งของรู (แนวนอน 163 — โลกล้นใต้ขอบรูปเล็กน้อย)
const HOLD = { s: 0.51, y: -0.44 }; // ขนาด/ตำแหน่งโลกตอน Echo ถือ (ให้เห็นทั้งรูปตั้งแต่ปอยผมถึงปลายรูป)
// จุดที่นิ้วกดผิวโลก (ทิศในระบบกล้อง: มือซ้ายบนซ้าย · มือขวาขวาล่าง) และทิศปลายนิ้วบนจอ (y ลง)
const TOUCH_DIRS = [[-0.7, 0.52, 0.49], [0.8, -0.29, 0.52]];
const TOUCH_SCREEN = [[-0.8, -0.6], [0.94, 0.34]];
const EYES = [[-0.28, -2.4], [0.28, -2.4]]; // ประกายตาตอนเริ่มรวมพลัง (หน่วย = รัศมีรู จากกลางรู)

const SERVER_S = 18; // = REBIRTH_SECONDS ฝั่ง server
// เวลา (วินาที) แบบเสมือน — ช่วงหยุดค้างก่อนระเบิด (FREEZE) ไม่นับ: เวลาจริง = เวลาเสมือน + FREEZE.len หลังจุดนั้น
const T = {
  reveal: [2.0, 4.4],
  leak: [7.2, 8.05], squeeze: 7.6, vacuum: [7.75, 8.05], boom: 8.05,
  back: [11.1, 13.0], last: [13.0, 13.5], dissolve: [13.5, 14.5], focus: [13.7, 14.9],
  tag: [14.4, 16.5], dive: [16.0, 17.15], flash: 17.15,
};
const FREEZE = { at: 8.05, len: 0.4 };
const FLASH_REAL = T.flash + FREEZE.len;
// รวมพลัง 3 ขั้น: เริ่มรวม → อวกาศถูกดูดเข้า → ใกล้ทนไม่ไหว
const TC = { start: 4.4, pull: 5.2, over: 6.4 };
const BEATS = (() => { const out = []; let b = 5.5, gap = 0.85; while (b < 8.0) { out.push(b); b += gap; gap = Math.max(0.16, gap * 0.8); } return out; })();

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const span = (t, a, b) => clamp01((t - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const eOut = (t) => 1 - Math.pow(1 - t, 3);
const eIn = (t) => t * t * t;
const eIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function beatPulse(t) { let p = 0; for (const b of BEATS) if (t >= b) p = Math.max(p, Math.exp(-(t - b) / 0.12)); return p; }
function chargeLevel(t) { return 0.2 * span(t, TC.start, TC.pull) + 0.45 * span(t, TC.pull, TC.over) + 0.35 * span(t, TC.over, T.boom); }
function rng(seed) {
  let s = Math.imul((seed | 0) ^ 0x9e3779b9, 0x85ebca6b) >>> 0; s = Math.imul(s ^ (s >>> 13), 0xc2b2ae35) >>> 0; s = (s ^ (s >>> 16)) >>> 0 || 1;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}
const STARS = Array.from({ length: 260 }, (_, i) => { const R = rng(i + 7); return { x: R(), y: R(), r: 0.4 + R() * 1.6, p: R() * 6.28, s: 0.5 + R() }; });

export default function EchoRebirth({ from, to, endsInMs, waiting = true, lowQ = false, onDone }) {
  const b = clampJourneyArea(to);
  const a = clampJourneyArea(from ?? 1);
  const A = journeyArea(b);

  const rootRef = useRef(null);
  const stageRef = useRef(null);
  const bgRef = useRef(null);
  const starsRef = useRef(null);
  const globeRef = useRef(null);
  const artRef = useRef(null);
  const fxRef = useRef(null);
  const tagRef = useRef(null);
  const flashRef = useRef(null);
  const waitingRef = useRef(waiting);
  useEffect(() => { waitingRef.current = waiting; }, [waiting]);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);
  // เข้ากลางฉาก (รีคอนเนกต์) = เริ่มจากกลางฉาก ให้แฟลชตรงจังหวะ server เปลี่ยนภูมิภาค
  const offsetRef = useRef(null);
  if (offsetRef.current == null) {
    const left = Number(endsInMs);
    offsetRef.current = Number.isFinite(left) && left > 0 ? Math.max(0, Math.min(FLASH_REAL - 1.2, SERVER_S - left / 1000)) : 0;
  }
  const musicRef = useRef(null);

  // เพลงประจำฉาก: เริ่มพร้อมฉาก (พักเพลงพื้นหลัง) · ค่อยๆ เบาลงตอนเผยกระดานใหม่
  useEffect(() => {
    const m = playSceneMusic("echo_queen", { from: offsetRef.current });
    musicRef.current = m;
    return () => { m.fadeOut(300); if (musicRef.current === m) musicRef.current = null; };
  }, []);

  const onReady = (core) => {
    const { THREE } = core;
    const q = lowQ ? 0.5 : 1;
    let t0 = performance.now() - offsetRef.current * 1000;
    let wallLive = performance.now() / 1000;
    let lastG = { x: 0, y: 0, r: 100 };
    let seek = null;
    let leaveSent = false, released = false, boardHold = null;
    const timers = [];
    core.setAutoSpin(0);
    core.setDrag(false);

    // ---------------- เศษโลก ~90 ชิ้น: ทรงยี่สิบหน้าละเอียด → จับกลุ่มสามเหลี่ยมตามจุดตั้งต้น (โวโรนอยบนผิวทรงกลม) ----------------
    const earth = getEarth();
    const shardTex = new THREE.CanvasTexture(earth.canvas);
    shardTex.colorSpace = THREE.SRGBColorSpace;
    shardTex.wrapS = THREE.RepeatWrapping;
    earth.textures.add(shardTex);
    const shards = [];
    const shardGroup = new THREE.Group();
    shardGroup.visible = false;
    core.spin.add(shardGroup);
    const crackGroup = new THREE.Group();
    core.spin.add(crackGroup);
    // แกนพลังกลางโลก (เห็นตอนแตก แล้วค่อยหรี่ · สว่างอีกครั้งตอนประกอบใกล้เสร็จ)
    const coreGlow = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 24), new THREE.MeshBasicMaterial({ color: 0xf2d9ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    coreGlow.visible = false;
    core.world.add(coreGlow);
    const NEW_DIR = regionDir(b - 1);
    const FROM_DIR = regionDir(a - 1);
    const uvOf = (v) => {
      const theta = Math.acos(Math.max(-1, Math.min(1, v.y)));
      let phi = Math.atan2(v.z, -v.x); if (phi < 0) phi += Math.PI * 2;
      return [phi / (Math.PI * 2), 1 - theta / Math.PI];
    };
    {
      const ico = new THREE.IcosahedronGeometry(1, 9).toNonIndexed();
      const P = ico.getAttribute("position");
      const R = rng(42), K = 90, seeds = [];
      for (let i = 0; i < K; i++) { const yy = 1 - ((i + 0.5) / K) * 2, rr = Math.sqrt(1 - yy * yy), ph = i * 2.39996 + R() * 0.5; seeds.push(new THREE.Vector3(Math.cos(ph) * rr, yy, Math.sin(ph) * rr).normalize()); }
      const groups = Array.from({ length: K }, () => []);
      const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3(), m = new THREE.Vector3();
      for (let f = 0; f < P.count; f += 3) {
        va.fromBufferAttribute(P, f); vb.fromBufferAttribute(P, f + 1); vc.fromBufferAttribute(P, f + 2);
        m.copy(va).add(vb).add(vc).normalize();
        let bi = 0, bd = -2;
        for (let s = 0; s < K; s++) { const d = m.dot(seeds[s]) + (R() - 0.5) * 0.004; if (d > bd) { bd = d; bi = s; } }
        groups[bi].push(va.clone(), vb.clone(), vc.clone());
      }
      ico.dispose();
      // ชิ้นที่ครอบภูมิภาคใหม่ = ชิ้นสุดท้าย (สีทอง)
      let lastIdx = 0, lastD = -2;
      seeds.forEach((s, i) => { const d = s.dot(NEW_DIR); if (d > lastD) { lastD = d; lastIdx = i; } });
      const backMat = new THREE.MeshBasicMaterial({ color: 0x7b45d6 }); // ด้านในเศษ = เนื้อโลกเรืองม่วง
      const goldBackMat = new THREE.MeshBasicMaterial({ color: 0xffc95c }); // ชิ้นสุดท้าย (ภูมิภาคใหม่) = ทองทั้งชิ้น
      groups.forEach((tris, gi) => {
        if (!tris.length) return;
        const cen = new THREE.Vector3();
        tris.forEach((v) => cen.add(v));
        cen.divideScalar(tris.length);
        const pos = [], uv = [], back = [];
        for (let i = 0; i < tris.length; i += 3) {
          const t3 = [tris[i], tris[i + 1], tris[i + 2]], uvs = t3.map(uvOf);
          const us = uvs.map((qq) => qq[0]);
          if (Math.max(...us) - Math.min(...us) > 0.5) uvs.forEach((qq) => { if (qq[0] < 0.5) qq[0] += 1; });
          t3.forEach((v, k) => { pos.push(v.x - cen.x, v.y - cen.y, v.z - cen.z); uv.push(...uvs[k]); });
          [t3[0], t3[2], t3[1]].forEach((v) => { const w = v.clone().multiplyScalar(0.82); back.push(w.x - cen.x, w.y - cen.y, w.z - cen.z); });
        }
        const gTop = new THREE.BufferGeometry();
        gTop.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        gTop.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
        gTop.computeVertexNormals();
        const gBack = new THREE.BufferGeometry();
        gBack.setAttribute("position", new THREE.Float32BufferAttribute(back, 3));
        gBack.computeVertexNormals();
        const isLast = gi === lastIdx;
        const mat = new THREE.MeshLambertMaterial({ map: shardTex, color: isLast ? 0xffc35a : 0xffffff, emissive: new THREE.Color(isLast ? 0xffd27a : 0x9b4f96), emissiveIntensity: 0 });
        const top = new THREE.Mesh(gTop, mat);
        const bot = new THREE.Mesh(gBack, isLast ? goldBackMat : backMat);
        const edgeGeo = new THREE.EdgesGeometry(gTop, 12);
        const edges = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: isLast ? 0xffe2a0 : 0xe2b8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
        const g = new THREE.Group();
        g.add(top, bot, edges);
        g.position.copy(cen);
        shardGroup.add(g);
        // รอยร้าวบนโลกก่อนแตก = ขอบของเศษชิ้นเดิมวางทับผิวโลก
        const crack = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: 0xf0c8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
        crack.position.copy(cen).multiplyScalar(1.004);
        crack.scale.setScalar(1.004);
        crackGroup.add(crack);
        const R2 = rng(gi * 131 + 9);
        shards.push({
          g, mat, edges, crack, cen, isLast,
          dir: cen.clone().normalize(),
          speed: 1.4 + R2() * 2.2,
          spinAxis: new THREE.Vector3(R2() - 0.5, R2() - 0.5, R2() - 0.5).normalize(),
          spinSpeed: 1 + R2() * 4,
          wob: new THREE.Vector3(R2() - 0.5, R2() - 0.5, R2() - 0.5).multiplyScalar(0.8),
          back0: T.back[0] + R2() * (T.back[1] - T.back[0] - 0.7), // เวลาเริ่มดูดกลับ (สุ่มไล่กัน)
        });
      });
    }
    const yawFor = (d) => -Math.atan2(d.x, d.z);
    const pitchFor = (d) => Math.max(-0.6, Math.min(0.6, Math.asin(Math.max(-1, Math.min(1, d.y)))));
    const yawA = yawFor(FROM_DIR);
    let yawB = yawFor(NEW_DIR);
    while (yawB - yawA > Math.PI) yawB -= Math.PI * 2;
    while (yawB - yawA < -Math.PI) yawB += Math.PI * 2;

    // สถานะเศษตามเวลา (ไม่มีสถานะสะสม — กรอเวลาได้)
    const qt = new THREE.Quaternion(), ex = new THREE.Vector3();
    const drift = (x) => (1 - Math.exp(-x * 2.4)) / 2.4 + x * 0.05; // พุ่งแรงแล้วค่อยๆ ลอยช้า
    function placeShard(s, t) {
      const te = Math.max(0, t - T.boom);
      const back0 = s.isLast ? T.last[0] : s.back0, back1 = s.isLast ? T.last[1] : back0 + 0.7;
      const tStop = Math.min(te, back0 - T.boom);
      const d = drift(tStop) * s.speed * (s.isLast ? 0.9 : 1);
      ex.copy(s.cen).addScaledVector(s.dir, d).addScaledVector(s.wob, d * 0.35);
      const ang = s.spinSpeed * (tStop + 0.3 * Math.sin(tStop * 2));
      if (t < back0) { s.g.position.copy(ex); s.g.quaternion.setFromAxisAngle(s.spinAxis, ang); return 0; }
      const k = span(t, back0, back1), e = s.isLast ? eIn(k) : eIO(k);
      s.g.position.lerpVectors(ex, s.cen, e);
      qt.setFromAxisAngle(s.spinAxis, ang * (1 - e));
      s.g.quaternion.copy(qt);
      return k;
    }

    // รอยบุ๋มใต้นิ้ว: ดันผิวโลกตรงจุดที่นิ้วแตะเข้าข้างใน
    const gPos = core.globe.geometry.getAttribute("position"), gBase = gPos.array.slice();
    const TOUCH = TOUCH_DIRS.map(([x, y, z]) => new THREE.Vector3(x, y, z).normalize());
    const invQ = new THREE.Quaternion();
    let dentOn = false;
    function dentGlobe(amt) {
      if (amt <= 0.001) {
        if (dentOn) { gPos.array.set(gBase); gPos.needsUpdate = true; core.globe.geometry.computeVertexNormals(); dentOn = false; }
        return;
      }
      dentOn = true;
      core.spin.getWorldQuaternion(invQ).invert();
      const loc = TOUCH.map((d) => d.clone().applyQuaternion(invQ));
      const arr = gPos.array;
      for (let i = 0; i < arr.length; i += 3) {
        const x = gBase[i], y = gBase[i + 1], z = gBase[i + 2];
        let r = 1;
        for (const c of loc) { const d = x * c.x + y * c.y + z * c.z; r -= amt * Math.exp(-(1 - d) / 0.018); }
        arr[i] = x * r; arr[i + 1] = y * r; arr[i + 2] = z * r;
      }
      gPos.needsUpdate = true;
      core.globe.geometry.computeVertexNormals();
    }

    // ---------------- 2 มิติ ----------------
    const starsCv = starsRef.current, sg = starsCv.getContext("2d");
    const fxCv = fxRef.current, fx = fxCv.getContext("2d");
    let W = 1, H = 1, dpr = 1;
    const resize = () => {
      const r = rootRef.current?.getBoundingClientRect();
      W = Math.max(1, r ? r.width : innerWidth); H = Math.max(1, r ? r.height : innerHeight);
      dpr = Math.min(window.devicePixelRatio || 1, lowQ ? 1 : 2);
      for (const c of [starsCv, fxCv]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    };
    resize();
    window.addEventListener("resize", resize);
    function bolt(x0, y0, x1, y1, seed, jag) {
      const R = rng(seed), n = 9, pts = [[x0, y0]];
      for (let i = 1; i < n; i++) { const u = i / n; pts.push([lerp(x0, x1, u) + (R() - 0.5) * jag, lerp(y0, y1, u) + (R() - 0.5) * jag]); }
      pts.push([x1, y1]);
      fx.beginPath();
      pts.forEach(([x, y], i) => (i ? fx.lineTo(x, y) : fx.moveTo(x, y)));
      fx.stroke();
    }
    function star4(x, y, r, al) {
      fx.save(); fx.globalAlpha = al; fx.fillStyle = "#fff"; fx.beginPath();
      for (let i = 0; i < 8; i++) { const an = (i / 8) * Math.PI * 2, rr = i % 2 ? r * 0.18 : r; fx.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); }
      fx.closePath(); fx.fill(); fx.restore();
    }

    // ---------------- จบฉาก: ค้างแฟลชขาวจน server เปลี่ยนภูมิภาค → กระดานใหม่พุ่งลง → จางเผย ----------------
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    function release() {
      if (released) return;
      released = true;
      at(50, requestArenaLand);
      rootRef.current?.classList.add("is-out");
      musicRef.current?.fadeOut(800);
      if (boardHold) { boardHold(); boardHold = null; }
      at(1150, () => onDoneRef.current?.());
    }

    const cpxV = new THREE.Vector3(), epxV = new THREE.Vector3(), wpV = new THREE.Vector3();
    let lastBg = "", lastArtF = "";
    const art = artRef.current, stage = stageRef.current, bg = bgRef.current, globeWrap = globeRef.current, tagEl = tagRef.current, flashEl = flashRef.current;

    const off = core.onFrame(() => {
      const now = performance.now();
      let tr = seek != null ? seek : (now - t0) / 1000;
      if (seek == null) {
        // server จบก่อนฉาก (เวลาเพี้ยน) → กระโดดไปช่วงดิ่ง
        if (!waitingRef.current && !released && tr < FLASH_REAL - 0.6) { t0 -= (FLASH_REAL - 0.6 - tr) * 1000; tr = FLASH_REAL - 0.6; }
        if (tr >= FLASH_REAL && !released && (!waitingRef.current || tr > SERVER_S + 4)) release();
        if (!leaveSent && tr >= 0.2) { leaveSent = true; requestArenaLeave(); }
        if (!boardHold && !released && tr >= 1.5) boardHold = holdBoard();
      }
      const frozen = tr >= FREEZE.at && tr < FREEZE.at + FREEZE.len;
      const freezeK = frozen ? (tr - FREEZE.at) / FREEZE.len : -1;
      const t = Math.min(T.flash, tr < FREEZE.at ? tr : frozen ? FREEZE.at - 0.001 : tr - FREEZE.len);
      if (!frozen) wallLive = now / 1000;
      const wall = wallLive;

      // แฟลชปลายดิ่ง (DOM) — ถึงยอดแล้วค้างขาวจนเผย
      flashEl.style.opacity = released ? "" : String(Math.pow(span(t, T.flash - 0.3, T.flash), 1.5));
      const ended = t >= T.flash;
      stage.style.visibility = ended ? "hidden" : "";
      if (ended) return;

      // หยุดค้าง: ภาพนิ่ง สีซีด คอนทราสต์สูง ซูมเข้าช้าๆ
      stage.style.filter = frozen ? `saturate(${1 - 0.6 * freezeK}) contrast(${1 + 0.25 * freezeK}) brightness(${1 - 0.15 * freezeK})` : "";

      // --- พื้นหลัง: ฟ้าขาว (ทับกระดานที่ถอยออก) → อวกาศม่วง → กลับฟ้าตอนดิ่ง
      const dark = Math.min(span(t, 1.6, 4.0), 1 - span(t, T.dive[0], T.flash));
      const bgS = `${span(t, 0.15, 1.2).toFixed(3)}|${dark.toFixed(3)}`;
      if (bgS !== lastBg) {
        lastBg = bgS;
        bg.style.opacity = String(span(t, 0.15, 1.2));
        bg.style.background = `radial-gradient(ellipse 80% 70% at 50% 60%, rgb(${lerp(230, 46, dark) | 0},${lerp(240, 22, dark) | 0},${lerp(250, 92, dark) | 0}) 0%, rgb(${lerp(205, 12, dark) | 0},${lerp(224, 8, dark) | 0},${lerp(244, 34, dark) | 0}) 100%)`;
      }
      sg.setTransform(dpr, 0, 0, dpr, 0, 0);
      sg.clearRect(0, 0, W, H);
      const pullK = t < T.boom ? span(t, TC.pull - 0.4, TC.over) * 0.85 + span(t, TC.over, T.boom) * 0.15 : 0;
      if (dark > 0.01) {
        for (const s of STARS) {
          const x0 = s.x * W, y0 = s.y * H;
          if (pullK > 0) {
            // ดาวถูกดึงเข้าหาโลก: วนเป็นรอบ (หลุดเข้าไปแล้วโผล่ที่เดิม) · หางยาวตามความเร็ว
            const ph = (wall * (0.35 + 0.5 * s.s) * pullK + s.p) % 1, e = eIn(ph) * pullK;
            const x = lerp(x0, lastG.x, e), y = lerp(y0, lastG.y, e);
            const tx = lerp(x0, lastG.x, Math.max(0, e - 0.08 * pullK)), ty = lerp(y0, lastG.y, Math.max(0, e - 0.08 * pullK));
            sg.globalAlpha = dark * (0.4 + 0.6 * ph); sg.strokeStyle = s.r > 1.2 ? "#ffffff" : "#d9b8ff"; sg.lineWidth = s.r;
            sg.beginPath(); sg.moveTo(tx, ty); sg.lineTo(x, y); sg.stroke();
            continue;
          }
          sg.globalAlpha = dark * (0.35 + 0.65 * Math.abs(Math.sin(wall * s.s + s.p)));
          sg.fillStyle = "#fff"; sg.beginPath(); sg.arc(x0, y0, s.r, 0, 7); sg.fill();
        }
        sg.globalAlpha = 1;
      }

      // --- ลูกโลก: ตำแหน่ง/ขนาด/การหมุน กำหนดตามเวลาทั้งหมด
      let s = 1, y = 0;
      if (t < T.reveal[0]) s = lerp(1.9, 1.0, eOut(span(t, 0.2, 2.0)));
      else if (t < T.focus[0]) { const k = eIO(span(t, T.reveal[0], T.reveal[1])); s = lerp(1.0, HOLD.s, k); y = lerp(0, HOLD.y, k); }
      else if (t < T.dive[0]) { const k = eIO(span(t, T.focus[0], T.focus[1])); s = lerp(HOLD.s, 1.0, k); y = lerp(HOLD.y, 0, k); }
      else { const k = eIn(span(t, T.dive[0], T.flash)); s = lerp(1.0, 9, k); }
      const hold = span(t, T.reveal[0], T.reveal[1]) * (1 - span(t, T.focus[0], T.focus[1]));
      y += Math.sin(wall * 1.4) * 0.02 * hold; // ลอยหายใจเบาๆ ระหว่างที่ Echo ถือ
      // สั่นตอนชาร์จ/บีบ/ระเบิด
      const shake = frozen ? 0
        : (t < T.boom ? Math.pow(chargeLevel(t), 2) * 12 + beatPulse(t) * 7 : 0)
          + (t >= T.boom ? Math.max(0, 1 - (t - T.boom) / 0.6) * 24 : 0)
          + (t > T.last[1] && t < T.last[1] + 0.3 ? 8 : 0);
      // สั่น = เลื่อนทั้งฉาก → ขยายเผื่อขอบ ไม่ให้เห็นกระดานข้างใต้ที่ขอบจอ
      const fz = (frozen ? 1 + 0.035 * eOut(freezeK) : 1) * (1 + (shake * 1.2) / Math.min(W, H));
      const sx = shake > 0.2 ? (Math.random() - 0.5) * shake : 0, sy = shake > 0.2 ? (Math.random() - 0.5) * shake : 0;
      stage.style.transform = sx || sy || fz !== 1 ? `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) scale(${fz.toFixed(4)})` : "";
      core.setLayout({ x: 0, y, s }, true);
      core.world.scale.setScalar(s);
      core.world.position.set(0, y, 0);
      // บีบ: โลกบุบเข้าแนวนอนเล็กน้อย (รูในรูปเป็นวงรีแนวตั้ง — บีบมากกว่านี้จะเห็นช่องข้างโลก)
      const sq = t < T.boom ? span(t, T.squeeze, T.boom) : 0;
      core.world.scale.x *= 1 - 0.035 * sq;
      core.world.scale.y *= 1 + 0.04 * sq;
      if (t < T.boom) core.world.scale.multiplyScalar(1 + 0.045 * beatPulse(t));
      // หมุน: หันภูมิภาคเดิม (หมุนช้า) → ระหว่างแตกหยุด → หันภูมิภาคใหม่
      const fk = eIO(span(t, T.focus[0], T.focus[1]));
      core.spin.rotation.y = t < T.focus[0] ? yawA + t * 0.06 : lerp(yawA + T.focus[0] * 0.06, yawB, fk);
      core.tilt.rotation.x = t < T.focus[0] ? pitchFor(FROM_DIR) * 0.6 : lerp(pitchFor(FROM_DIR) * 0.6, pitchFor(NEW_DIR), fk);
      core.scene.updateMatrixWorld();
      globeWrap.style.opacity = String(span(t, 0.1, 0.9));

      // --- แตก / ประกอบ
      const broken = t >= T.boom && t < T.last[1];
      shardGroup.visible = broken;
      core.globe.visible = !broken;
      core.spin.children.forEach((o) => { if (o.isLineSegments) o.visible = !broken; });
      core.halo.visible = !broken;
      coreGlow.visible = broken;
      if (broken) {
        const k = t - T.boom;
        coreGlow.material.opacity = Math.max(0.22, 1 - k / 1.6) * 0.95 + span(t, T.back[1] - 0.6, T.last[1]) * 0.8;
        coreGlow.scale.setScalar(1 + Math.sin(wall * 5) * 0.04 + span(t, T.back[0], T.last[1]) * -0.3);
      }
      const crackA = t < T.boom ? Math.min(1, Math.pow(span(t, TC.pull + 0.3, T.boom), 1.1) + beatPulse(t) * 0.5 * span(t, TC.pull, TC.over)) : 0;
      dentGlobe(t < T.boom ? 0.11 * eOut(span(t, T.squeeze, T.boom)) : 0);
      // ชาร์จ: ผิวโลกหม่นลงเป็นม่วง (รอยร้าวสว่างตัดกับผิว)
      const dim = crackA * 0.75;
      core.globe.material.color.setRGB(1 - dim * 0.55, 1 - dim * 0.7, 1 - dim * 0.35);
      for (const sh of shards) {
        sh.crack.material.opacity = crackA * (0.55 + 0.45 * Math.sin(wall * 9 + sh.cen.x * 7));
        if (!broken) continue;
        const back = placeShard(sh, t);
        sh.mat.emissiveIntensity = sh.isLast ? 0.6 + 0.4 * Math.sin(wall * 6) : Math.max(0, 1 - (t - T.boom) / 1.2) * 0.9 + back * 0.6;
        sh.edges.material.opacity = sh.isLast ? 1 : Math.max(0.25, 1 - (t - T.boom) / 1.5);
      }
      // ระหว่างเศษบิน: ลูกโลกอยู่หน้ารูป Echo · ก่อนแตก: อยู่หลังรูป (โผล่ผ่านรู นิ้วอยู่หน้าโลก)
      globeWrap.style.zIndex = t >= T.boom && t < T.dissolve[1] ? "3" : "1";

      // --- จุดศูนย์กลาง/รัศมีโลกบนจอ (px)
      const cpx = core.project(cpxV.set(0, y, 0)), epx = core.project(epxV.set(s, y, 0));
      const gcx = cpx.x, gcy = cpx.y, gr = Math.abs(epx.x - cpx.x) * 1.004;

      // --- รูป Echo: รูลูกกลมทับลูกโลกพอดี
      {
        const show = eOut(span(t, T.reveal[0] + 0.3, T.reveal[1])) * (1 - span(t, T.dissolve[0], T.dissolve[1]));
        const rise = (1 - eOut(span(t, T.reveal[0] + 0.3, T.reveal[1]))) * 0.06 * H; // ค่อยๆ ลอยขึ้นจากด้านล่าง
        const dz = 1 + span(t, T.dissolve[0], T.dissolve[1]) * 0.08;
        const k = (gr / ART.r) * dz;
        // บีบ: รูปหดแนวนอน/ยืดแนวตั้งนิดเดียวรอบกลางลูกโลก (มือบีบเข้า)
        const ax = k * (1 - 0.012 * sq), ay = k * (1 + 0.01 * sq);
        art.style.transform = `translate(${(gcx - ART.cx * ax).toFixed(1)}px, ${(gcy + rise - ART.cy * ay).toFixed(1)}px) scale(${ax.toFixed(4)}, ${ay.toFixed(4)})`;
        art.style.opacity = String(show);
        const blur = span(t, T.dissolve[0], T.dissolve[1]) * 8;
        const artF = `drop-shadow(0 0 ${Math.round(8 + 24 * dark)}px rgba(201,154,214,${(0.35 + 0.45 * span(t, TC.start, T.boom)).toFixed(2)}))${blur > 0.05 ? ` blur(${blur.toFixed(1)}px)` : ""}`;
        if (artF !== lastArtF) { lastArtF = artF; art.style.filter = artF; }
      }

      // --- ชื่อภูมิภาคปลายทาง
      const ta = span(t, T.tag[0], T.tag[0] + 0.4) * (1 - span(t, T.tag[1] - 0.4, T.tag[1]));
      tagEl.style.opacity = String(ta);
      tagEl.style.transform = `translateY(${((1 - eOut(span(t, T.tag[0], T.tag[0] + 0.5))) * 20).toFixed(1)}px)`;

      // --- เอฟเฟกต์ 2 มิติ
      fx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fx.clearRect(0, 0, W, H);
      fx.globalCompositeOperation = "lighter";
      // รวมพลังจนเหมือนจะระเบิดโลก
      if (t > TC.start && t < T.boom) {
        const I = chargeLevel(t), bp = beatPulse(t), R0 = Math.max(W, H) * 0.95;
        // แขนพลังเกลียวยักษ์ 4 แขน หมุนดูดเข้าโลก (หนาที่ขอบนอก เรียวเข้าหาโลก)
        const armA = span(t, TC.pull - 0.3, TC.over);
        if (armA > 0) {
          for (let k = 0; k < 4; k++) {
            const rot = wall * (1.1 + I * 2.2) + (k * Math.PI) / 2;
            for (let pass = 0; pass < 2; pass++) {
              fx.beginPath();
              for (let i = 0; i <= 90; i++) {
                const th = (i / 90) * Math.PI * 2.6, r = gr * 1.05 + (R0 - gr) * Math.exp(-th * 0.75);
                const x = gcx + Math.cos(rot - th) * r, yy = gcy + Math.sin(rot - th) * r * 0.82;
                if (i) fx.lineTo(x, yy); else fx.moveTo(x, yy);
              }
              fx.globalAlpha = armA * (pass ? 0.9 : 0.35) * (0.7 + 0.3 * bp);
              fx.strokeStyle = pass ? "#f3e2ff" : "#9b4f96";
              fx.lineWidth = pass ? 2 + 3 * I : 14 + 26 * I;
              fx.stroke();
            }
          }
        }
        // อนุภาคไหลเข้าเป็นเกลียว (เยอะและเร็วขึ้นตามพลัง)
        const np = Math.round((80 + 340 * I) * q);
        for (let i = 0; i < np; i++) {
          const Rr = rng(i * 7 + 3), sp = 0.4 + Rr() * 0.8 + I * 1.4, ph = (wall * sp + Rr()) % 1, ang = Rr() * 6.28 + ph * (3 + I * 3);
          const d = lerp(R0, gr * 1.02, eIn(ph)), x = gcx + Math.cos(ang) * d, yy = gcy + Math.sin(ang) * d * 0.85;
          fx.globalAlpha = Math.min(1, 0.25 + I) * (0.3 + 0.7 * ph);
          fx.fillStyle = i % 4 ? "#c99ad6" : "#ffffff";
          fx.beginPath(); fx.arc(x, yy, 1 + 2.6 * ph * (0.5 + I), 0, 7); fx.fill();
        }
        // ออร่ารอบโลก (ใหญ่ขึ้นตามพลัง · วาบตามจังหวะเต้น) — ข้างในวงโปร่ง ให้เห็นรอยร้าวเรืองชัด
        const ro = gr * (1.5 + 1.6 * I + bp * 0.6), gl = fx.createRadialGradient(gcx, gcy, 0, gcx, gcy, ro), q0 = (gr * 0.96) / ro;
        gl.addColorStop(0, "rgba(214,160,255,0)");
        gl.addColorStop(q0, "rgba(214,160,255,0)");
        gl.addColorStop(Math.min(0.99, q0 + 0.04), `rgba(214,160,255,${0.3 + 0.35 * I + 0.25 * bp})`);
        gl.addColorStop(1, "rgba(155,79,150,0)");
        fx.globalAlpha = 1; fx.fillStyle = gl; fx.fillRect(0, 0, W, H);
        // คลื่นแสงทุกครั้งที่โลกเต้น
        for (const bt of BEATS) {
          const k = (t - bt) / 0.9;
          if (k <= 0 || k >= 1) continue;
          fx.globalAlpha = (1 - k) * 0.8; fx.strokeStyle = "#f3e2ff"; fx.lineWidth = 8 * (1 - k) + 1;
          fx.beginPath(); fx.ellipse(gcx, gcy, gr * (1.02 + k * 2.4), gr * (1.02 + k * 2.4) * 0.85, 0, 0, 7); fx.stroke();
        }
        // สายฟ้าฟาดออกจากโลกไปในอวกาศ (ช่วงใกล้ทนไม่ไหว)
        const lz = span(t, TC.over - 0.6, T.boom);
        if (lz > 0) {
          const nb = Math.round(2 + lz * 10), seed = Math.floor(wall * 12);
          fx.strokeStyle = "#f6ecff";
          if (!lowQ) { fx.shadowColor = "#c99ad6"; fx.shadowBlur = 14; }
          for (let i = 0; i < nb; i++) {
            const Rr = rng(seed * 53 + i), a0 = Rr() * 6.28, r1 = gr * (1.6 + Rr() * 2.6 * lz);
            fx.lineWidth = 1.5 + Rr() * 3 * lz; fx.globalAlpha = 0.5 + 0.5 * Rr();
            bolt(gcx + Math.cos(a0) * gr, gcy + Math.sin(a0) * gr, gcx + Math.cos(a0 + (Rr() - 0.5) * 0.6) * r1, gcy + Math.sin(a0 + (Rr() - 0.5) * 0.6) * r1 * 0.85, seed * 9 + i, gr * 0.25);
          }
          fx.shadowBlur = 0;
        }
        // ขอบจอเรืองม่วงเต้นตามจังหวะ
        fx.globalCompositeOperation = "source-over";
        const vg = fx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
        vg.addColorStop(0, "rgba(0,0,0,0)");
        vg.addColorStop(1, `rgba(60,16,90,${0.35 * I + 0.25 * bp * I})`);
        fx.globalAlpha = 1; fx.fillStyle = vg; fx.fillRect(0, 0, W, H);
        fx.globalCompositeOperation = "lighter";
      }
      lastG = { x: gcx, y: gcy, r: gr };
      // ประกายตา (ตอนเริ่มรวมพลัง)
      if (t > TC.start && t < TC.start + 1) {
        const eyeA = Math.sin(span(t, TC.start, TC.start + 1) * Math.PI);
        for (const [ex0, ey0] of EYES) star4(gcx + ex0 * gr, gcy + ey0 * gr, gr * 0.2 * eyeA, eyeA);
      }
      const ch = span(t, TC.start, T.boom);
      if (ch > 0 && t < T.boom) {
        // ออร่ารอบโลก (แรงขึ้นตอนบีบ)
        const au = 0.35 * ch + 0.4 * span(t, T.squeeze, T.boom);
        const gl = fx.createRadialGradient(gcx, gcy, gr * 0.8, gcx, gcy, gr * (1.6 + ch));
        gl.addColorStop(0, `rgba(201,154,214,${au})`); gl.addColorStop(1, "rgba(155,79,150,0)");
        fx.globalAlpha = 1; fx.fillStyle = gl; fx.fillRect(0, 0, W, H);
      }
      // แสงทะลักจากรอยร้าว: ลำแสงขาวม่วงพุ่งออกจากผิวโลก (ยิ่งใกล้แตกยิ่งเยอะ/ยาว)
      const lk = span(t, T.leak[0], T.boom);
      if (lk > 0 && t < T.boom) {
        const n = Math.round(6 + lk * 34), seed = Math.floor(wall * 10);
        for (let i = 0; i < n; i++) {
          const R = rng(i * 29 + 11), an = R() * 6.28, rr = Math.sqrt(R()) * 0.92;
          const px = gcx + Math.cos(an) * rr * gr, py = gcy + Math.sin(an) * rr * gr;
          const dx = Math.cos(an), dy = Math.sin(an), len = gr * (0.25 + R() * 1.4) * (0.3 + lk) * (0.75 + 0.25 * rng(seed + i)());
          const g2 = fx.createLinearGradient(px, py, px + dx * len, py + dy * len);
          g2.addColorStop(0, `rgba(255,255,255,${0.95 * lk})`); g2.addColorStop(0.4, `rgba(226,184,255,${0.6 * lk})`); g2.addColorStop(1, "rgba(155,79,150,0)");
          fx.strokeStyle = g2; fx.lineWidth = 1.5 + R() * 4 * lk; fx.globalAlpha = 1;
          fx.beginPath(); fx.moveTo(px, py); fx.lineTo(px + dx * len, py + dy * len); fx.stroke();
        }
      }
      // บีบ: คลื่นวงเล็กออกจากปลายนิ้ว + สายฟ้ารอบมือ
      if (sq > 0 && t < T.boom) {
        for (const [ux, uy] of TOUCH_SCREEN) {
          const l = Math.hypot(ux, uy), cx = gcx + (ux / l) * gr * 0.86, cy = gcy + (uy / l) * gr * 0.86;
          for (let r = 0; r < 3; r++) {
            const ph = (wall * 2.2 + r / 3) % 1;
            fx.globalAlpha = sq * (1 - ph) * 0.9; fx.strokeStyle = "#f3e2ff"; fx.lineWidth = 2.5;
            fx.beginPath(); fx.ellipse(cx, cy, gr * (0.05 + ph * 0.22), gr * (0.05 + ph * 0.22) * 0.7, 0, 0, 7); fx.stroke();
          }
        }
        const nb = Math.round(2 + sq * 8), seed = Math.floor(wall * 14);
        fx.strokeStyle = "#f3e2ff"; fx.lineWidth = 1.5 + sq * 2;
        if (!lowQ) { fx.shadowColor = "#c99ad6"; fx.shadowBlur = 12; }
        for (let i = 0; i < nb; i++) {
          const R = rng(seed * 31 + i), a0 = R() * 6.28, a1 = a0 + (R() - 0.5) * 2.2, r0 = gr * (1 + R() * 0.05), r1 = gr * (1.15 + R() * 0.5 * sq);
          fx.globalAlpha = 0.5 + 0.5 * R();
          bolt(gcx + Math.cos(a0) * r0, gcy + Math.sin(a0) * r0, gcx + Math.cos(a1) * r1, gcy + Math.sin(a1) * r1, seed * 7 + i, gr * 0.12);
        }
        fx.shadowBlur = 0;
      }
      // ดูดแสงเข้า (สุญญากาศ): เส้นแสงจากขอบจอพุ่งเข้าหาโลก · จอรอบนอกมืดลง
      const vk = span(t, T.vacuum[0], T.boom);
      if (vk > 0 && (t < T.boom || frozen)) {
        for (let i = 0; i < 80 * q; i++) {
          const R = rng(i * 13 + 77), an = R() * 6.28, ph = frozen ? 0.55 + R() * 0.3 : (wall * (2 + R() * 2) + R()) % 1;
          const r0 = lerp(Math.max(W, H) * 0.75, gr * 1.1, eIn(ph)), len = gr * (0.2 + 0.8 * ph) * vk;
          fx.globalAlpha = vk * ph; fx.strokeStyle = i % 3 ? "#e2b8ff" : "#ffffff"; fx.lineWidth = 1 + ph * 2.5;
          fx.beginPath(); fx.moveTo(gcx + Math.cos(an) * r0, gcy + Math.sin(an) * r0 * 0.85); fx.lineTo(gcx + Math.cos(an) * (r0 + len), gcy + Math.sin(an) * (r0 + len) * 0.85); fx.stroke();
        }
        fx.globalCompositeOperation = "source-over";
        const vg = fx.createRadialGradient(gcx, gcy, gr * 1.4, gcx, gcy, Math.max(W, H) * 0.8);
        vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, `rgba(6,2,20,${0.55 * vk})`);
        fx.globalAlpha = 1; fx.fillStyle = vg; fx.fillRect(0, 0, W, H);
        fx.globalCompositeOperation = "lighter";
      }
      // ระเบิด: แฟลช + วงกระแทก 3 ชั้น + ประกายกระจาย
      if (t >= T.boom && t < T.boom + 2.2) {
        const k = t - T.boom;
        const fl = Math.max(0, 1 - k / 0.35);
        if (fl > 0) { fx.globalCompositeOperation = "source-over"; fx.globalAlpha = fl; fx.fillStyle = "#fff"; fx.fillRect(0, 0, W, H); fx.globalCompositeOperation = "lighter"; }
        for (let r = 0; r < 3; r++) {
          const kk = clamp01((k - r * 0.12) / 1.4);
          if (kk <= 0 || kk >= 1) continue;
          fx.globalAlpha = (1 - kk) * 0.9; fx.strokeStyle = r === 1 ? "#ffffff" : "#c99ad6"; fx.lineWidth = 18 * (1 - kk) + 2;
          fx.beginPath(); fx.ellipse(gcx, gcy, gr * (1 + kk * 5), gr * (1 + kk * 5) * 0.72, 0, 0, 7); fx.stroke();
        }
        for (let i = 0; i < 90; i++) {
          const R = rng(i * 13 + 1), an = R() * 6.28, d = gr * (0.5 + eOut(clamp01(k / 1.6)) * (2 + R() * 6));
          fx.globalAlpha = clamp01(1 - k / 2); fx.fillStyle = i % 2 ? "#fff" : "#e2b8ff";
          fx.beginPath(); fx.arc(gcx + Math.cos(an) * d, gcy + Math.sin(an) * d * 0.8, 1.5 + R() * 3, 0, 7); fx.fill();
        }
      }
      // ประกอบเสร็จ: คลื่นแสงทอง (ชิ้นสุดท้ายเสียบ)
      if (t >= T.last[1] && t < T.last[1] + 1.4) {
        const k = (t - T.last[1]) / 1.4;
        fx.globalAlpha = (1 - k) * 0.95; fx.strokeStyle = "#ffe2a0"; fx.lineWidth = 10 * (1 - k) + 1;
        fx.beginPath(); fx.arc(gcx, gcy, gr * (1 + k * 2.2), 0, 7); fx.stroke();
        const gl = fx.createRadialGradient(gcx, gcy, gr * 0.9, gcx, gcy, gr * 1.8);
        gl.addColorStop(0, `rgba(255,226,160,${0.55 * (1 - k)})`); gl.addColorStop(1, "rgba(255,226,160,0)");
        fx.fillStyle = gl; fx.globalAlpha = 1; fx.fillRect(0, 0, W, H);
      }
      // ภูมิภาคใหม่เรืองทอง (จุดที่ชิ้นสุดท้ายเสียบ) จนถึงตอนดิ่ง
      if (t >= T.last[1] - 0.1 && t < T.flash) {
        const sp = core.project(core.spin.localToWorld(wpV.copy(NEW_DIR))), face = core.facing(NEW_DIR);
        if (face > 0) {
          const al = Math.min(1, (t - T.last[1] + 0.1) / 0.3) * Math.min(1, face * 2), pul = 0.5 + 0.5 * Math.sin(wall * 6);
          const rr = gr * (0.16 + 0.04 * pul);
          const gl = fx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, rr * 2.6);
          gl.addColorStop(0, `rgba(255,226,160,${0.9 * al})`); gl.addColorStop(1, "rgba(255,200,110,0)");
          // ผิวโลกขาว — บวกแสงอย่างเดียวแทบไม่เห็น: ทาสีทองทับก่อน แล้วค่อยบวกแสง
          fx.globalCompositeOperation = "source-over";
          fx.globalAlpha = 0.7; fx.fillStyle = gl; fx.beginPath(); fx.arc(sp.x, sp.y, rr * 2.6, 0, 7); fx.fill();
          fx.globalCompositeOperation = "lighter";
          fx.globalAlpha = 1; fx.beginPath(); fx.arc(sp.x, sp.y, rr * 2.6, 0, 7); fx.fill();
          fx.strokeStyle = "#f0b648"; fx.lineWidth = 3;
          fx.globalCompositeOperation = "source-over";
          for (let i = 0; i < 2; i++) {
            const ph = (wall * 0.9 + i * 0.5) % 1;
            fx.globalAlpha = al * (1 - ph);
            fx.beginPath(); fx.ellipse(sp.x, sp.y, rr * (1 + ph * 2.5), rr * (1 + ph * 2.5) * 0.8, 0, 0, 7); fx.stroke();
          }
          fx.globalCompositeOperation = "lighter";
        }
      }
      // Echo สลายเป็นประกายลอยขึ้น
      if (t >= T.dissolve[0] && t < T.dissolve[1] + 0.6) {
        const k = (t - T.dissolve[0]) / (T.dissolve[1] - T.dissolve[0] + 0.6), kk = gr / ART.r;
        for (let i = 0; i < 160 * q; i++) {
          const R = rng(i * 17 + 5), x = gcx + (R() - 0.5) * ART.w * kk * 0.7, y0 = gcy - ART.cy * kk + R() * ART.h * kk * 0.85;
          fx.globalAlpha = Math.sin(k * Math.PI) * (0.4 + 0.6 * R()); fx.fillStyle = i % 3 ? "#d9b8ff" : "#fff";
          fx.beginPath(); fx.arc(x + Math.sin(wall * 2 + i) * 6, y0 - eOut(k) * H * (0.15 + R() * 0.25), 1.2 + R() * 2.5, 0, 7); fx.fill();
        }
      }
      // ดิ่ง: เส้นความเร็วพุ่งออกจากกลางจอ
      if (t >= T.dive[0]) {
        const k = span(t, T.dive[0], T.flash);
        for (let i = 0; i < 70 * q; i++) {
          const R = rng(i * 5 + 2), an = R() * 6.28, ph = (wall * (1.5 + R() * 2) + R()) % 1, r0 = lerp(40, Math.max(W, H) * 0.8, ph), len = 40 + 260 * ph * k;
          fx.globalAlpha = k * ph * 0.8; fx.strokeStyle = "#ffffff"; fx.lineWidth = 1 + ph * 2;
          fx.beginPath(); fx.moveTo(W / 2 + Math.cos(an) * r0, H / 2 + Math.sin(an) * r0); fx.lineTo(W / 2 + Math.cos(an) * (r0 + len), H / 2 + Math.sin(an) * (r0 + len)); fx.stroke();
        }
      }
      fx.globalAlpha = 1;
      fx.globalCompositeOperation = "source-over";
    });

    if (import.meta.env.DEV) window.__seek = (v) => { seek = v == null ? null : Number(v); };

    return () => {
      off();
      window.removeEventListener("resize", resize);
      timers.forEach(clearTimeout);
      if (boardHold) { boardHold(); boardHold = null; }
      // ฉากถูกถอดกลางคัน (เช่นกลับห้องรอ) — อย่าทิ้งกระดานค้างซ่อน
      if (leaveSent && !released) requestArenaLand();
      if (import.meta.env.DEV) delete window.__seek;
      earth.textures.delete(shardTex);
      shardTex.dispose();
      gPos.array.set(gBase);
    };
  };

  return (
    <div className={`erb${lowQ ? " is-lowq" : ""}`} ref={rootRef} aria-hidden="true">
      <div className="erb-stage" ref={stageRef}>
        <div className="erb-bg" ref={bgRef} />
        <canvas className="erb-layer" ref={starsRef} />
        <div className="erb-globe" ref={globeRef} style={{ opacity: 0 }}>
          <GlobeCanvas shared={false} layout={{ x: 0, y: 0, s: 1.9 }} drag={false} sand={!lowQ} autoSpin={0} onReady={onReady} />
        </div>
        <img className="erb-art" ref={artRef} src={ART_SRC} alt="" draggable={false} style={{ width: ART.w, height: ART.h }} />
        <canvas className="erb-layer erb-fx" ref={fxRef} />
        <div className="erb-tag" ref={tagRef} style={{ "--ac": A.glow }}>
          <b>{A.name}</b>
          <i className="oc-latin">{A.numeral}</i>
        </div>
      </div>
      <div className="erb-flash" ref={flashRef} />
    </div>
  );
}
