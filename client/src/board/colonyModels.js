// ============================================================
//  ของบนพื้นสนาม Colony เป็นโมเดล 3D (low-poly) — ยึดกับพื้น ไม่หันตามกล้อง (ผู้ใช้สั่ง 2026-11-09 "ทุกอย่างใน Colony ต้อง 2.5D ขึ้นไป")
//  ต้นไม้ · บ้าน · ตึก · ป้อมปืน · หอสังเกตการณ์ · น้ำพุ · แคปซูลร้าน 3 แบบ (ยา/ช่าง/พ่อค้าเร่)
//  กรอบของโมเดล: +Y = ชี้เข้าแกนกระบอก ("ขึ้น") · +X = ทิศคอลัมน์ (+x กระดาน) · +Z = ทิศแถว (+y กระดาน) — วางด้วย placeOn ของ colony3d
//  หมากถูกวาดในชั้น 2D ทับด้านบนเสมอ → ของที่อยู่ระหว่างกล้องกับหมาก (หรือติดกล้อง) = โปร่ง
// ============================================================
import * as THREE from "three";
import { towerHeight } from "./colonyProps";

const TAU = Math.PI * 2;
const hash = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const ROOFS = [0xc4604a, 0x5f7fb5, 0xd29a5c, 0x7e9a6c];
const FACE_YAW = { down: 0, right: Math.PI / 2, up: Math.PI, left: -Math.PI / 2 };
const CAP_LIGHT = { apoth: 0x78ffb4, forge: 0xffa046, cara: 0xffd66e };

function canvasTex(w, h, paint) {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  paint(cv.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

export function createColonyModels({ placeOn, surfAt, lowQ = false }) {
  const root = new THREE.Group();
  // ---- วัสดุ/เรขาคณิตใช้ร่วม
  const MC = new Map();
  const lam = (hex, o = {}) => { const k = `l${hex}${JSON.stringify(o)}`; if (!MC.has(k)) MC.set(k, new THREE.MeshLambertMaterial({ color: hex, flatShading: true, ...o })); return MC.get(k); };
  const bas = (hex, o = {}) => { const k = `b${hex}${JSON.stringify(o)}`; if (!MC.has(k)) MC.set(k, new THREE.MeshBasicMaterial({ color: hex, ...o })); return MC.get(k); };
  const up = (geo, y) => { geo.translate(0, y, 0); return geo; };
  const G = {
    box: up(new THREE.BoxGeometry(1, 1, 1), 0.5),
    boxC: new THREE.BoxGeometry(1, 1, 1),
    trunk: up(new THREE.CylinderGeometry(0.045, 0.07, 0.36, 6), 0.18),
    ball: new THREE.IcosahedronGeometry(0.3, 0),
    cone: new THREE.ConeGeometry(0.3, 0.5, 7),
    shadow: new THREE.CircleGeometry(0.42, 20).rotateX(-Math.PI / 2),
    sph: new THREE.SphereGeometry(1, 10, 8),
    cyl6: new THREE.CylinderGeometry(1, 1, 1, 6),
    cyl12: new THREE.CylinderGeometry(1, 1, 1, 12),
    cyl16: new THREE.CylinderGeometry(1, 1, 1, 16),
    ring: new THREE.RingGeometry(0.4, 0.47, 32).rotateX(-Math.PI / 2),
  };
  { // หลังคาจั่ว: ปริซึมสามเหลี่ยม ฐานกว้าง 1 สูง 1 ลึก 1 (สันตามแกน Z)
    const s = new THREE.Shape(); s.moveTo(-0.5, 0); s.lineTo(0.5, 0); s.lineTo(0, 1); s.closePath();
    G.roof = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false }).translate(0, 0, -0.5);
  }
  { // ฟันเฟือง
    const s = new THREE.Shape(), n = 12;
    for (let i = 0; i <= n * 2; i++) { const a = i * Math.PI / n, r = i % 2 ? 0.075 : 0.105; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(r, 0); }
    const hole = new THREE.Path(); hole.absarc(0, 0, 0.03, 0, TAU, true); s.holes.push(hole);
    G.gear = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false }).translate(0, 0, -0.015);
  }
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x0a1820, transparent: true, opacity: 0.22, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
  const mesh = (geo, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); return m; };
  // แท่งระหว่างจุด a → b (ขาหอ/ขาแคปซูล)
  const _ya = new THREE.Vector3(0, 1, 0);
  function beam(a, b, r, mat) {
    const d = new THREE.Vector3().subVectors(b, a), m = new THREE.Mesh(G.cyl6, mat);
    m.scale.set(r, d.length(), r); m.position.copy(a).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(_ya, d.normalize());
    return m;
  }
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // ---- พื้นผิวหน้าต่างตึก (3 ช่อง × 4 แถว ต่อ 1 รอบลาย) · กลางคืนเปิดไฟบางห้อง
  const winTex = {};
  function towerTex(night) {
    if (winTex[night]) return winTex[night];
    const t = canvasTex(96, 128, (g, W, H) => {
      g.fillStyle = night ? "#5d6a80" : "#e4ebf2"; g.fillRect(0, 0, W, H);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
        const lit = night && hash(c, r, 5) > 0.42;
        g.fillStyle = lit ? "#ffd27a" : night ? "#2a3a52" : c === 2 ? "#7aa6cf" : "#9fcbef";
        g.fillRect(c * 32 + 7, r * 32 + 7, 18, 18);
      }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return (winTex[night] = t);
  }
  const hazardTex = canvasTex(128, 16, (g, W, H) => { for (let i = -2; i < 18; i++) { g.fillStyle = i % 2 ? "#f2b33c" : "#2a2a2e"; g.beginPath(); g.moveTo(i * 8, H); g.lineTo(i * 8 + 8, H); g.lineTo(i * 8 + 16, 0); g.lineTo(i * 8 + 8, 0); g.closePath(); g.fill(); } });
  hazardTex.wrapS = THREE.RepeatWrapping;
  const awningTex = canvasTex(128, 16, (g, W, H) => { for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? "#fff4dc" : "#d8463c"; g.fillRect(i * W / 12, 0, W / 12 + 1, H); } });
  const glowTex = canvasTex(64, 64, (g) => { const m = g.createRadialGradient(32, 32, 1, 32, 32, 32); m.addColorStop(0, "rgba(255,255,255,1)"); m.addColorStop(0.35, "rgba(255,255,255,.35)"); m.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = m; g.fillRect(0, 0, 64, 64); });
  const glowSprite = (hex, s, o = 0.7) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: hex, transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending })); sp.scale.setScalar(s); return sp; };

  // ---------------------------------------------------------------- โมเดลแต่ละชนิด
  function tree(x, y, night, sec) {
    const g = new THREE.Group(), r = hash(x, y, 3), sc = 0.85 + hash(x, y, 4) * 0.3;
    const pine = sec === 1 ? r < 0.6 : r < 0.18;
    const blossom = sec === 3 && r > 0.72;
    g.add(mesh(G.trunk, lam(night ? 0x4a3a2c : 0x8a6244)));
    if (pine) {
      const c = lam(night ? 0x24483c : 0x3f8a5a), c2 = lam(night ? 0x2c5446 : 0x4f9c66);
      g.add(mesh(G.cone, c, 0, 0.5, 0, 1.15, 1, 1.15), mesh(G.cone, c2, 0, 0.78, 0, 0.82, 0.85, 0.82));
    } else {
      const base = blossom ? (night ? 0x9a6a84 : 0xf2a7c3) : (night ? 0x2f5a4a : 0x6fbf73);
      const alt = blossom ? (night ? 0xb07a98 : 0xf7c2d6) : (night ? 0x3a6a56 : 0x5aa862);
      g.add(mesh(G.ball, lam(base), 0, 0.56, 0, 1.1, 1, 1.1));
      g.add(mesh(G.ball, lam(alt), 0.12, 0.72, 0.06, 0.7, 0.7, 0.7));
      g.add(mesh(G.ball, lam(base), -0.13, 0.66, -0.08, 0.65, 0.65, 0.65));
    }
    g.scale.setScalar(sc); g.rotation.y = hash(x, y, 9) * TAU;
    return { g, h: 0.95 * sc, r: 0.34 };
  }
  function house(x, y, night) {
    const g = new THREE.Group(), wall = lam(night ? 0xb5ae9f : 0xf6eedd), roofC = ROOFS[Math.floor(hash(x, y, 4) * ROOFS.length)];
    const W = 0.72, D = 0.62, H = 0.42;
    g.add(mesh(G.box, wall, 0, 0, 0, W, H, D));
    g.add(mesh(G.roof, lam(night ? new THREE.Color(roofC).multiplyScalar(0.6).getHex() : roofC), 0, H, 0, W + 0.12, 0.3, D + 0.1));
    g.add(mesh(G.box, lam(night ? 0x6e665a : 0xa8907a), -0.18, H + 0.08, 0.1, 0.08, 0.22, 0.08));
    const door = lam(night ? 0x4a3427 : 0x7a5232);
    g.add(mesh(G.box, door, -0.16, 0, D / 2 + 0.005, 0.14, 0.22, 0.02));
    const lit = night && hash(x, y, 6) > 0.25;
    const win = lit ? bas(0xffd27a) : lam(night ? 0x2a3a52 : 0x8fc3ea);
    g.add(mesh(G.box, win, 0.14, 0.17, D / 2 + 0.005, 0.15, 0.13, 0.02), mesh(G.box, win, 0.14, 0.17, -D / 2 - 0.005, 0.15, 0.13, 0.02));
    g.add(mesh(G.box, win, W / 2 + 0.005, 0.17, 0, 0.02, 0.13, 0.15), mesh(G.box, win, -W / 2 - 0.005, 0.17, 0, 0.02, 0.13, 0.15));
    g.rotation.y = Math.floor(hash(x, y, 8) * 4) * Math.PI / 2;
    return { g, h: 0.8, r: 0.42 };
  }
  const antennaMats = [0, 1, 2, 3].map(() => new THREE.MeshBasicMaterial({ color: 0xff5046 }));
  function tower(x, y, night) {
    const g = new THREE.Group(), H = towerHeight(x, y) * 0.95, W = 0.66, rows = Math.max(3, Math.round(H / 0.17));
    const geo = new THREE.BoxGeometry(W, H, W).translate(0, H / 2, 0);
    const uv = geo.attributes.uv;
    for (let f = 0; f < 6; f++) { if (f === 2 || f === 3) continue; for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setY(k, uv.getY(k) * rows / 4); } }
    const side = new THREE.MeshLambertMaterial({ map: towerTex(night) }), top = lam(night ? 0x4b566a : 0xc6d2de);
    g.add(new THREE.Mesh(geo, [side, side, top, top, side, side]));
    g.add(mesh(G.box, lam(night ? 0x7d8aa0 : 0xb8c4d2), 0, H, 0, W + 0.06, 0.05, W + 0.06));
    g.add(mesh(G.box, lam(night ? 0x8a96a6 : 0x9aa6b6), 0.12, H + 0.05, -0.1, 0.18, 0.08, 0.14));
    g.add(beam(V(-0.15, H + 0.05, 0.12), V(-0.15, H + 0.34, 0.12), 0.012, lam(0x8a96a6)));
    g.add(mesh(G.sph, antennaMats[Math.floor(hash(x, y, 2) * 4)], -0.15, H + 0.36, 0.12, 0.03, 0.03, 0.03));
    return { g, h: H + 0.3, r: 0.4 };
  }
  function turret(x, y, night) {
    const g = new THREE.Group();
    g.add(mesh(G.cyl12, lam(night ? 0x3b424e : 0x6c7685), 0, 0.05, 0, 0.34, 0.1, 0.34));
    g.add(mesh(G.box, lam(night ? 0x4c5462 : 0x8d97a6), 0, 0.08, 0, 0.5, 0.3, 0.5));
    g.add(mesh(G.box, lam(0xf2b33c), 0, 0.24, 0, 0.52, 0.04, 0.52));
    const head = new THREE.Group(); head.position.y = 0.48;
    const shellMat = new THREE.MeshLambertMaterial({ color: night ? 0x6a7383 : 0xb9c2ce, flatShading: true });
    head.add(mesh(G.sph, shellMat, 0, 0, 0, 0.18, 0.15, 0.18));
    const barrel = mesh(G.cyl6, lam(night ? 0x2a2f38 : 0x4a525e), 0, 0, 0.22, 0.045, 0.32, 0.045); barrel.rotation.x = Math.PI / 2; head.add(barrel);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3b30 });
    head.add(mesh(G.sph, eyeMat, 0, 0.05, 0.15, 0.04, 0.04, 0.04));
    const eyeGlow = glowSprite(0xff4030, 0.35, 0.5); eyeGlow.position.set(0, 0.05, 0.17); head.add(eyeGlow);
    g.add(head);
    const pips = [0, 1, 2].map((i) => { const m = mesh(G.boxC, new THREE.MeshBasicMaterial({ color: 0xff5a4a }), -0.12 + i * 0.12, 0.82, 0, 0.09, 0.04, 0.04); g.add(m); return m; });
    return { g, h: 0.85, r: 0.36, turret: { head, shellMat, eyeMat, eyeGlow, pips, yaw: null, hitT: 0 } };
  }
  function watch(x, y, night) {
    const g = new THREE.Group(), steel = lam(night ? 0x8fa3c0 : 0x5d6f88), Hc = 1.35;
    const legs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    legs.forEach(([a, b], i) => {
      g.add(beam(V(a * 0.4, 0, b * 0.4), V(a * 0.22, Hc, b * 0.22), 0.022, steel));
      const [c, d] = legs[(i + 1) % 4];
      for (const k of [0.3, 0.65]) { const r0 = 0.4 - 0.18 * k, r1 = 0.4 - 0.18 * (k + 0.25); g.add(beam(V(a * r0, Hc * k, b * r0), V(c * r1, Hc * (k + 0.25), d * r1), 0.01, steel)); }
    });
    g.add(mesh(G.box, lam(night ? 0x46566e : 0x9aa6b6), 0, Hc, 0, 0.6, 0.04, 0.6));
    g.add(mesh(G.box, lam(night ? 0x46566e : 0xe4ebf2), 0, Hc + 0.04, 0, 0.46, 0.24, 0.46));
    g.add(mesh(G.box, night ? bas(0xffd27a) : lam(0x8fc3ea), 0, Hc + 0.12, 0, 0.475, 0.09, 0.475));
    const roof = mesh(new THREE.ConeGeometry(0.4, 0.22, 4), lam(night ? 0x5d6f88 : 0x4d7fb8), 0, Hc + 0.39, 0); roof.rotation.y = Math.PI / 4; g.add(roof);
    // ไฟส่องหมุน: กรวยแสงจากห้องเฝ้ามองเอียงลงพื้น
    const spot = new THREE.Group(); spot.position.y = Hc + 0.14;
    const beamGeo = new THREE.ConeGeometry(0.32, 1.4, 16, 1, true).translate(0, -0.7, 0).rotateX(-Math.PI / 2 + 0.55).rotateX(Math.PI);
    spot.add(new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0xa0dcff, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })));
    const lamp = glowSprite(0xa0dcff, 0.4, 0.8); spot.add(lamp);
    g.add(spot);
    return { g, h: 1.75, r: 0.42, spin: spot, see: true };
  }
  function fountain(x, y, night) {
    const g = new THREE.Group(), stone = lam(night ? 0x8b93a2 : 0xe7e1d3);
    g.add(mesh(G.cyl16, stone, 0, 0.05, 0, 0.38, 0.1, 0.38));
    g.add(mesh(G.cyl16, new THREE.MeshBasicMaterial({ color: night ? 0x3a78a8 : 0x7ccbea, transparent: true, opacity: 0.85 }), 0, 0.1, 0, 0.32, 0.012, 0.32));
    g.add(mesh(G.cyl12, stone, 0, 0.2, 0, 0.05, 0.28, 0.05));
    g.add(mesh(G.cyl12, stone, 0, 0.34, 0, 0.13, 0.04, 0.13));
    const jets = new THREE.Group(), wm = new THREE.MeshBasicMaterial({ color: night ? 0x96d2ff : 0x9ee0ff, transparent: true, opacity: 0.6, depthWrite: false });
    for (let i = 0; i < 6; i++) {
      const a = i * TAU / 6, ex = Math.cos(a) * 0.27, ez = Math.sin(a) * 0.27;
      const cv = new THREE.QuadraticBezierCurve3(V(0, 0.37, 0), V(ex * 0.55, 0.6, ez * 0.55), V(ex, 0.11, ez));
      jets.add(new THREE.Mesh(new THREE.TubeGeometry(cv, 10, 0.012, 4), wm));
    }
    g.add(jets);
    const N = lowQ ? 0 : 14, pos = new Float32Array(N * 3), pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const spray = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xe0f6ff, size: 0.035, transparent: true, opacity: 0.85, depthWrite: false }));
    g.add(spray);
    const gl = glowSprite(0x8cdcff, 0.9, night ? 0.35 : 0.15); gl.position.y = 0.3; g.add(gl);
    return { g, h: 0.6, r: 0.4, fountain: { jets, pos, pg, N, seed: x * 7 + y } };
  }

  // ---- แคปซูลร้าน 3 แบบ (ร้านยา = คลินิกขาวกากบาทเขียว · โรงช่าง = ตู้เหล็กหกเหลี่ยมฟันเฟือง · พ่อค้าเร่ = แคปซูลทองกันสาดลายแดง)
  function capsule(kind, night) {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const light = CAP_LIGHT[kind] || CAP_LIGHT.apoth;
    const legM = lam(night ? 0x8a8f9a : 0x9aa3ae);
    for (let i = 0; i < 3; i++) { const a = i * TAU / 3 + 0.4; body.add(beam(V(Math.cos(a) * 0.16, 0.2, Math.sin(a) * 0.16), V(Math.cos(a) * 0.32, 0, Math.sin(a) * 0.32), 0.016, legM)); }
    let gears = null, lantern = null, topY;
    if (kind === "forge") {
      const steel = lam(night ? 0x6f7682 : 0xaab3bf), dark = lam(night ? 0x575d68 : 0x8c96a3);
      body.add(mesh(G.cyl6, steel, 0, 0.42, 0, 0.27, 0.46, 0.27));
      body.add(mesh(G.cyl6, dark, 0, 0.7, 0, 0.2, 0.1, 0.2));
      const hz = mesh(G.cyl6, new THREE.MeshLambertMaterial({ map: hazardTex }), 0, 0.27, 0, 0.278, 0.08, 0.278); body.add(hz);
      const gm = lam(0xf08a2a);
      gears = [];
      for (const s of [1, -1]) { const ge = mesh(G.gear, gm, 0, 0.47, s * 0.245); body.add(ge); gears.push(ge); }
      body.add(mesh(G.cyl6, dark, 0.12, 0.8, -0.05, 0.035, 0.12, 0.035));
      topY = 0.82;
    } else {
      const cara = kind === "cara";
      const bm = lam(cara ? (night ? 0xc9a24a : 0xf2cf6a) : (night ? 0xc9ced8 : 0xf6f8fa), { flatShading: false });
      body.add(mesh(new THREE.CapsuleGeometry(0.21, 0.34, 6, 14), bm, 0, 0.5, 0));
      if (cara) {
        const aw = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.42, 0.14, 12, 1, true), new THREE.MeshLambertMaterial({ map: awningTex, side: THREE.DoubleSide }));
        aw.position.y = 0.58; body.add(aw);
        lantern = new THREE.Group(); lantern.position.set(0.4, 0.5, 0);
        lantern.add(beam(V(0, 0, 0), V(0, -0.12, 0), 0.006, lam(0x6a4a1a)));
        lantern.add(mesh(G.sph, bas(0xffcf5a), 0, -0.15, 0, 0.04, 0.05, 0.04));
        const lg = glowSprite(0xffc85a, 0.35, night ? 0.8 : 0.5); lg.position.y = -0.15; lantern.add(lg);
        body.add(lantern);
        const star = mesh(new THREE.OctahedronGeometry(0.05), lam(0xb7791f), 0, 0.98, 0); body.add(star);
      } else {
        body.add(mesh(G.cyl16, lam(0x3fbf7f), 0, 0.38, 0, 0.215, 0.06, 0.215));
        const cm = lam(0x2fae6c);
        for (let i = 0; i < 4; i++) {
          const c = new THREE.Group(); c.rotation.y = i * Math.PI / 2;
          c.add(mesh(G.boxC, cm, 0, 0.56, 0.205, 0.045, 0.14, 0.02), mesh(G.boxC, cm, 0, 0.56, 0.205, 0.14, 0.045, 0.02));
          body.add(c);
        }
      }
      topY = 0.94;
    }
    const lampMat = new THREE.MeshBasicMaterial({ color: light });
    body.add(mesh(G.sph, lampMat, 0, topY, 0, 0.04, 0.04, 0.04));
    const lampGlow = glowSprite(light, 0.45, 0.6); lampGlow.position.y = topY; body.add(lampGlow);
    const thrust = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 10, 1, true).translate(0, -0.25, 0).rotateX(Math.PI),
      new THREE.MeshBasicMaterial({ color: light, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    thrust.rotation.x = Math.PI; thrust.position.y = 0.12; body.add(thrust);
    const ring = new THREE.Mesh(G.ring, new THREE.MeshBasicMaterial({ color: light, transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
    ring.position.y = 0.01;
    const steam = [];
    if (kind === "forge" && !lowQ) for (let i = 0; i < 3; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xe6e6eb, transparent: true, depthWrite: false })); body.add(s); steam.push(s); }
    return { g, body, ring, h: 1, r: 0.36, cap: { kind, gears, lantern, lampMat, lampGlow, thrust, steam, phase: Math.random() * TAU } };
  }

  // ---------------------------------------------------------------- สร้าง/อัปเดต
  const props = []; // { g, wx, wy, h, r, ... } ของคงที่ (สร้างจาก map.terrain)
  const turrets = new Map(); // "x,y" → prop
  const capPool = new Map(); // "kind,x,y" → prop
  function addProp(p, x, y, shadow = true) {
    const host = new THREE.Group(); host.add(p.g);
    if (shadow) { const sh = new THREE.Mesh(G.shadow, shadowMat); sh.position.y = 0.004; sh.scale.setScalar(p.r / 0.42 * 1.05); host.add(sh); }
    if (p.ring) host.add(p.ring);
    placeOn(host, x + 0.5, y + 0.5);
    p.host = host; p.x = x; p.y = y; p.faded = false;
    root.add(host);
    return p;
  }
  function clearAll() {
    for (const p of props) root.remove(p.host);
    props.length = 0; turrets.clear();
  }
  function build(map, night) {
    clearAll();
    const sec = (y) => Math.floor(y / (map.section || 10));
    for (const [k, kind] of Object.entries(map.terrain || {})) {
      const [x, y] = k.split(",").map(Number);
      let p = null;
      if (kind === "tree") p = tree(x, y, night, sec(y));
      else if (kind === "house") p = house(x, y, night);
      else if (kind === "tower") p = tower(x, y, night);
      else if (kind === "turret") { p = turret(x, y, night); turrets.set(k, p); }
      if (p) props.push(addProp(p, x, y));
    }
    for (const [k, kind] of Object.entries(map.special || {})) {
      if (kind !== "watch") continue;
      const [x, y] = k.split(",").map(Number);
      props.push(addProp(watch(x, y, night), x, y, false));
    }
    const heal = (map.heal instanceof Set ? [...map.heal] : Array.isArray(map.heal) ? map.heal : []).map((h) => (typeof h === "string" ? h : Array.isArray(h) ? `${h[0]},${h[1]}` : `${h.x},${h.y}`));
    for (const k of heal) { const [x, y] = k.split(",").map(Number); props.push(addProp(fountain(x, y, night), x, y)); }
    for (const c of capPool.values()) root.remove(c.host);
    capPool.clear();
    lastNight = night;
  }
  let lastNight = false;
  function setTurrets(list) {
    const seen = new Set();
    for (const tr of list || []) {
      const p = turrets.get(`${tr.x},${tr.y}`);
      if (!p) continue;
      seen.add(p);
      p.turret.face = tr.face; p.turret.hp = tr.hp; p.turret.maxHp = tr.maxHp || 3;
    }
  }
  function hitTurret(x, y, t) { const p = turrets.get(`${x},${y}`); if (p) p.turret.hitT = t; }
  // แคปซูลที่ต้องโชว์ตอนนี้ [{ kind, x, y, z }] (z = ความสูงระหว่างตกจากแกน)
  function setCapsules(list) {
    const want = new Set();
    for (const c of list || []) {
      const k = `${c.kind},${c.x},${c.y}`; want.add(k);
      let p = capPool.get(k);
      if (!p) { p = addProp(capsule(c.kind, lastNight), c.x, c.y); capPool.set(k, p); props.push(p); }
      p.z = c.z || 0;
    }
    for (const [k, p] of capPool) if (!want.has(k)) { root.remove(p.host); capPool.delete(k); const i = props.indexOf(p); if (i >= 0) props.splice(i, 1); }
  }

  // ---- โปร่งเมื่อบังหมาก/ติดกล้อง: สลับเป็นวัสดุคู่แฝดโปร่ง (สร้างครั้งเดียวต่อวัสดุ)
  const fadeOf = new Map();
  function fadedMat(m) {
    if (Array.isArray(m)) return m.map(fadedMat);
    if (!fadeOf.has(m)) { const f = m.clone(); f.transparent = true; f.opacity = (m.opacity ?? 1) * 0.28; f.depthWrite = false; fadeOf.set(m, f); }
    return fadeOf.get(m);
  }
  function setFade(p, on) {
    if (p.faded === on) return;
    p.faded = on;
    p.g.traverse((o) => {
      if (!o.isMesh) return;
      if (on) { o.userData.mat0 = o.material; o.material = fadedMat(o.material); } else if (o.userData.mat0) { o.material = o.userData.mat0; }
    });
  }
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _w = new THREE.Vector3();
  function ndc(v, camera) { return v.project(camera); }

  function update(t, { camera, units }) {
    const time = t / 1000;
    // จุดหมากบนจอ (เท้า + หัว) + ระยะจากกล้อง
    const us = [];
    for (const u of units || []) {
      if (!u || !Number.isFinite(u.x) || u.alive === false) continue;
      const hs = Math.max(1, u.size | 0) / 2;
      const foot = surfAt(u.x + hs, u.y + hs, 0, new THREE.Vector3()), d = foot.distanceTo(camera.position);
      const head = surfAt(u.x + hs, u.y + hs, 0.75, new THREE.Vector3());
      us.push({ d, pts: [ndc(foot, camera), ndc(head, camera)] });
    }
    for (const p of props) {
      // แคปซูล: ตำแหน่งระหว่างตก + ไอพ่น
      if (p.cap) {
        const c = p.cap, z = p.z || 0;
        p.body.position.y = z;
        c.thrust.visible = z > 0.05; if (c.thrust.visible) c.thrust.scale.set(1, 0.8 + Math.random() * 0.5, 1);
        p.ring.material.opacity = 0.5 + 0.35 * Math.sin(time * 4 + c.phase);
        const on = 0.5 + 0.5 * Math.sin(time * 3.8 + c.phase);
        c.lampGlow.material.opacity = 0.3 + on * 0.5;
        if (c.gears) { c.gears[0].rotation.z = time * 1.1; c.gears[1].rotation.z = -time * 1.1; }
        if (c.lantern) c.lantern.rotation.z = Math.sin(time * 2) * 0.25;
        c.steam.forEach((s, i) => { const ph = (time / 1.4 + i / 3) % 1; s.position.set(0.12 + ph * 0.08, 0.86 + ph * 0.4, -0.05); s.scale.setScalar(0.08 + ph * 0.18); s.material.opacity = z > 0.05 ? 0 : 0.5 * (1 - ph); });
      }
      if (p.turret) {
        const T = p.turret, want = FACE_YAW[T.face] ?? 0;
        if (T.yaw == null) T.yaw = want;
        let d = want - T.yaw; d = ((d + Math.PI) % TAU + TAU) % TAU - Math.PI; T.yaw += d * 0.12;
        T.head.rotation.y = T.yaw;
        const hit = t - T.hitT < 260;
        T.shellMat.color.setHex(hit ? 0xffffff : lastNight ? 0x6a7383 : 0xb9c2ce);
        const on = 0.5 + 0.5 * Math.sin(time * 3.3 + p.x);
        T.eyeGlow.material.opacity = 0.3 + on * 0.5;
        const mx = T.maxHp || 3;
        T.pips.forEach((m, i) => { m.visible = i < mx; m.material.color.setHex(i < (T.hp ?? mx) ? 0xff5a4a : 0x30343c); });
      }
      if (p.spin) p.spin.rotation.y = time * 1.05 + p.x;
      if (p.fountain) {
        const F = p.fountain; F.jets.rotation.y = time * 0.3;
        for (let i = 0; i < F.N; i++) { const ph = (time * 0.9 + i / F.N) % 1, a = i * 2.3 + F.seed; F.pos[i * 3] = Math.cos(a) * 0.24 * ph; F.pos[i * 3 + 1] = 0.36 + 0.24 * Math.sin(ph * Math.PI); F.pos[i * 3 + 2] = Math.sin(a) * 0.24 * ph; }
        if (F.N) F.pg.attributes.position.needsUpdate = true;
      }
      // บังหมาก / ติดกล้อง = โปร่ง
      p.host.getWorldPosition(_w);
      const dp = _w.distanceTo(camera.position);
      let fade = dp < 2.6;
      if (!fade && us.length) {
        const top = p.host.localToWorld(_c.set(0, p.h + (p.z || 0), 0)), base = _a.copy(_w);
        const side = p.host.localToWorld(_b.set(p.r, 0, 0));
        const nb = ndc(base, camera), nt = ndc(top, camera), ns = ndc(side, camera);
        if (nb.z < 1 && nt.z < 1) {
          const hw = Math.max(Math.hypot(ns.x - nb.x, ns.y - nb.y), 0.01) * 1.05;
          const x0 = Math.min(nb.x, nt.x) - hw, x1 = Math.max(nb.x, nt.x) + hw, y0 = Math.min(nb.y, nt.y) - hw * 0.5, y1 = Math.max(nb.y, nt.y) + hw * 0.3;
          fade = us.some((u) => u.d > dp + 0.2 && u.pts.some((q) => q.z < 1 && q.x > x0 && q.x < x1 && q.y > y0 && q.y < y1));
        }
      }
      setFade(p, fade);
    }
    antennaMats.forEach((m, i) => { const on = 0.5 + 0.5 * Math.sin(time * 2.4 + i * 1.7); m.color.setRGB(1, 0.3 + on * 0.15, 0.27).multiplyScalar(0.4 + on * 0.6); });
  }
  // ซ่อนแถวที่ถูกปิดผนึก / กำแพงไฟกลืน
  function clip(minRow, burn) { for (const p of props) p.host.visible = p.y >= minRow && (burn == null || p.y <= burn); }

  return { root, build, setTurrets, setCapsules, hitTurret, update, clip };
}
