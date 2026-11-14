// ============================================================
//  โหมด Road Trip (GRID_PLAN §8.8) — รถตู้ 3D สร้างด้วยโค้ด (พอร์ตจากต้นแบบที่ผู้ใช้ยืนยัน .claude/plans/road-trip-van.html)
//  ทูโทน ครีม/สี · ยางขอบขาว · กันชนโครเมียม · ประตูท้ายบานคู่ · ซันรูฟ · ห้องใน 3×7 (ของกดเล่นได้ 17 ชิ้น) · ดาดฟ้า 3×6
//  ทรง 3 แบบ (normal / goofy / cool) · ของแต่ง 20 อย่าง · อัปเกรด 8 อย่าง × 3 ขั้น (เห็นบนตัวรถ) · ไฟกลางคืน
//
//  createVan({ lowQ, onSfx, onAction }) → {
//    group, setState(van), setView("out" | "cut" | "drv" | "board"), setRoof(on), setRear(open), setNight(on),
//    setDriver({ img, color } | null), setRadio(radio), fireTurret(yaw), tick(dt, t, ctx), pick(raycaster), hover(hit), floorY(), dispose
//  }
//  แกนรถ: หน้ารถ = +X · ขวามือคนขับ = +Z (พวงมาลัยขวาแบบไทย) · ห้องใน 3 × 7 ช่อง ช่องละ 1 หน่วย (แถว i → x = 2.5 − i · คอลัมน์ z = −1, 0, 1)
//  ของในรถที่กด = เล่นเฉพาะเครื่องตัวเอง (แอนิเมชัน + onSfx(ชื่อเสียง)) · เกียร์/ที่นั่งคนขับ = onAction("seat") · พวงมาลัย = onAction("horn")
//  ประสิทธิภาพ: ชิ้นนิ่งรวมเป็นก้อนเดียวต่อวัสดุ (mergeStatic) — จาก ~700 ชิ้นเหลือ ~120 draw call · ไม่สร้างอ็อบเจกต์ใหม่ใน tick
// ============================================================
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { masterGain, channelGain } from "../audio";

// ของแต่ง 20 อย่าง (ชื่อตามต้นแบบ — server เก็บใน van.decor)
export const DECOR = [
  "ไฟหลังคา", "แร็คหลังคา", "ธง", "ตุ๊กตาหน้ารถ", "ลายไฟ", "ลายดอกไม้", "หน้ายิ้ม", "ขนตา", "หูแมว", "เขากวาง",
  "ครีบฉลาม", "ล้อแม็กทอง", "ท่อคู่", "ไฟใต้ท้อง", "ป้ายหลังคา", "ลูกโป่ง", "ไฟประดับนอก", "เซิร์ฟบอร์ด", "กันชนกันวัว", "บังแดดกระจกหน้า",
];
export const VAN_STYLES = ["normal", "goofy", "cool"];
export const VAN_FLOOR = 0.62; // พื้นห้องในรถ (หน่วยรถ ก่อนสเกลทรง)
// สถานีวิทยุ (ชื่อบนจอหน้ารถ — ตรงกับต้นแบบ 5 สถานี)
const STATION_NAMES = [["FM 88.0", "ป๊อป"], ["FM 95.5", "ลูกทุ่ง"], ["FM 101.5", "ร็อก"], ["FM 104.0", "ชิล"], ["AM 666", "หลอน"]];
const UPG_KEYS = ["body", "engine", "tank", "susp", "nitro", "turret", "bumper", "storage"];

const TAU = Math.PI * 2;
const FONT = '"Kanit","Chakra Petch",sans-serif';
const hash = (a, b = 0, c = 0) => { let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

export function canvasTex(w, h, draw, aniso = 4) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t;
}

// ---------------------------------------------------------------- รวมชิ้นนิ่ง (ลด draw call)
//  ทุกลูกหลานของ root ที่ไม่ติดธง userData.dyn / keep = รวมเป็น 1 mesh ต่อวัสดุ (เงา/ไม่เงาแยก) · ตำแหน่งสัมพัทธ์ root
const _mi = new THREE.Matrix4(), _mm = new THREE.Matrix4();
// วัสดุที่ค่าเหมือนกันทุกอย่าง (สร้างแยกกันแต่หน้าตาเดียวกัน) รวมก้อนเดียวกันได้ · มีเท็กซ์เจอร์/แชเดอร์เฉพาะ = แยกตาม uuid
const matKey = (m) => (m.isMeshStandardMaterial && !m.map && !m.emissiveMap && !m.userData.solo
  ? [m.type, m.color.getHex(), m.emissive.getHex(), m.emissiveIntensity, m.roughness, m.metalness, m.transparent, m.opacity, m.side, m.depthWrite, m.clearcoat ?? "", m.clearcoatRoughness ?? "", m.polygonOffset].join("|")
  : m.uuid);
export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  _mi.copy(root.matrixWorld).invert();
  const buckets = new Map(), victims = [];
  const walk = (o) => {
    for (const c of o.children) {
      if (c.userData.dyn || !c.visible) continue;
      if (c.isMesh && !c.isInstancedMesh && !c.userData.keep && !c.children.length && !Array.isArray(c.material) && c.visible) {
        const m = c.material, k = matKey(m) + (c.castShadow ? "s" : "n");
        let b = buckets.get(k);
        if (!b) buckets.set(k, (b = { mat: m, cast: c.castShadow, recv: c.receiveShadow, geos: [] }));
        const g = c.geometry.index ? c.geometry.toNonIndexed() : c.geometry.clone();
        for (const n of Object.keys(g.attributes)) if (n !== "position" && n !== "normal" && n !== "uv") g.deleteAttribute(n);
        if (!g.attributes.normal) g.computeVertexNormals();
        if (!g.attributes.uv) g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
        g.morphAttributes = {};
        g.applyMatrix4(_mm.multiplyMatrices(_mi, c.matrixWorld));
        b.geos.push(g); victims.push(c);
      } else walk(c);
    }
  };
  walk(root);
  for (const c of victims) { c.parent.remove(c); c.geometry.dispose(); }
  for (const b of buckets.values()) {
    const geo = b.geos.length === 1 ? b.geos[0] : mergeGeometries(b.geos, false);
    if (b.geos.length > 1) b.geos.forEach((g) => g.dispose());
    if (!geo) continue;
    const m = new THREE.Mesh(geo, b.mat); m.castShadow = b.cast; m.receiveShadow = b.recv; root.add(m);
  }
}

// ---------------------------------------------------------------- เสียงเอฟเฟกต์สังเคราะห์ (พอร์ตจากต้นแบบ — ผ่านหลอดเสียง sfx ของเกม)
export function createVanSfx() {
  let ac = null, bus = null, noiseBuf = null, engine = null;
  const init = () => {
    if (ac) { if (ac.state === "suspended") ac.resume().catch(() => {}); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ac = new AC();
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3;
    bus = ac.createGain(); bus.gain.value = 0.7;
    bus.connect(comp).connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  };
  const vol = () => masterGain() * channelGain("sfx");
  const env = (g, t, a, peak, dur) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dur); };
  function tone(type, f, t, dur, v, o = {}) {
    const osc = ac.createOscillator(); osc.type = type; osc.frequency.setValueAtTime(f, t);
    if (o.glideTo) osc.frequency.exponentialRampToValueAtTime(o.glideTo, t + (o.glideT || dur));
    const fl = ac.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = o.cut || 18000;
    const g = ac.createGain(); env(g, t, o.a || 0.004, v, dur);
    osc.connect(fl).connect(g).connect(bus); osc.start(t); osc.stop(t + (o.a || 0.004) + dur + 0.05);
  }
  function noise(t, dur, v, type = "highpass", f = 1000, q = 0.7, a = 0.002) {
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = ac.createGain(); env(g, t, a, v, dur);
    s.connect(fl).connect(g).connect(bus); s.start(t, Math.random() * 1.5); s.stop(t + a + dur + 0.05);
  }
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const SFX = {
    horn: (t) => { tone("square", 370, t, 0.4, 0.13, { cut: 2000, a: 0.01 }); tone("square", 466, t, 0.4, 0.11, { cut: 2000, a: 0.01 }); },
    goofyHorn: (t) => { tone("square", 520, t, 0.18, 0.12, { cut: 2500, glideTo: 330 }); tone("square", 600, t + 0.2, 0.25, 0.12, { cut: 2500, glideTo: 380 }); },
    pop: (t) => { noise(t, 0.12, 0.25, "lowpass", 500); tone("sine", 2300, t + 0.05, 0.12, 0.05); },
    clank: (t) => { tone("square", 880, t, 0.12, 0.05, { cut: 3000 }); tone("square", 1320, t + 0.05, 0.1, 0.04, { cut: 3000 }); },
    dice: (t) => { for (let k = 0; k < 6; k++) noise(t + k * 0.07 + Math.random() * 0.03, 0.02, 0.18, "highpass", 2500); },
    strum: (t) => [40, 47, 52, 56, 59, 64].forEach((n, k) => tone("sawtooth", mtof(n), t + k * 0.028, 1.8, 0.05, { cut: 2200 })),
    hum: (t) => { tone("sine", 120, t, 2, 0.06, { a: 0.1 }); tone("sine", 1760, t + 2.1, 1.2, 0.12); },
    click: (t) => noise(t, 0.015, 0.25, "highpass", 2000),
    creak: (t) => tone("sawtooth", 260, t, 0.5, 0.04, { cut: 900, glideTo: 180 }),
    soft: (t) => noise(t, 0.15, 0.2, "lowpass", 350),
    boing: (t) => { tone("sine", 300, t, 0.15, 0.15, { glideTo: 700 }); tone("sine", 700, t + 0.15, 0.25, 0.12, { glideTo: 300 }); },
    swish: (t) => noise(t, 0.35, 0.12, "bandpass", 2400, 1.5, 0.1),
    crash: (t) => { noise(t, 0.5, 0.5, "lowpass", 600); tone("square", 90, t, 0.2, 0.25, { glideTo: 50 }); noise(t + 0.03, 0.25, 0.12, "highpass", 4000); },
    whoosh: (t) => noise(t, 0.9, 0.22, "bandpass", 900, 0.8, 0.15),
    lane: (t) => noise(t, 0.25, 0.05, "bandpass", 3200, 6, 0.03),
    gun: (t) => { for (let k = 0; k < 3; k++) { noise(t + k * 0.13, 0.14, 0.45, "lowpass", 1400); tone("square", 140, t + k * 0.13, 0.08, 0.2, { glideTo: 55 }); noise(t + k * 0.13, 0.04, 0.2, "highpass", 5000); } },
    sizzle: (t) => noise(t, 1.6, 0.05, "highpass", 3500, 0.7, 0.2),
    zoom: (t) => tone("sine", 900, t, 0.25, 0.04, { glideTo: 1500 }),
    upg: (t) => { tone("triangle", 660, t, 0.12, 0.08); tone("triangle", 990, t + 0.08, 0.18, 0.08); },
    chime: (t) => { tone("sine", 1320, t, 0.3, 0.08); tone("sine", 990, t + 0.25, 0.4, 0.08); },
  };
  return {
    play(name) {
      const fn = SFX[name];
      if (!fn || !init()) return;
      bus.gain.value = 0.7 * vol();
      if (bus.gain.value < 0.001) return;
      try { fn(ac.currentTime); } catch { /* ไม่เป็นไร */ }
    },
    // เสียงเครื่องยนต์ (เริ่มเมื่อผู้เล่นคลิก/กดครั้งแรก) · speed = หน่วย/วิ · inside = เสียงอู้อี้
    engine(speed, boost, inside) {
      if (!ac || ac.state !== "running") return;
      if (!engine) {
        const o1 = ac.createOscillator(), o2 = ac.createOscillator(); o1.type = "sawtooth"; o2.type = "square"; o2.detune.value = -1200;
        const f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 280;
        const g = ac.createGain(); g.gain.value = 0;
        const ws = ac.createBufferSource(); ws.buffer = noiseBuf; ws.loop = true;
        const wf = ac.createBiquadFilter(); wf.type = "bandpass"; wf.frequency.value = 500; wf.Q.value = 0.6;
        const wg = ac.createGain(); wg.gain.value = 0;
        o1.connect(f); o2.connect(f); f.connect(g).connect(bus); ws.connect(wf).connect(wg).connect(bus);
        o1.start(); o2.start(); ws.start();
        engine = { o1, o2, g, wg };
      }
      const t = ac.currentTime, fq = 36 + speed * 2.4 + (boost ? 20 : 0);
      engine.o1.frequency.setTargetAtTime(fq, t, 0.08); engine.o2.frequency.setTargetAtTime(fq, t, 0.08);
      const v = vol();
      engine.g.gain.setTargetAtTime((inside ? 0.035 : 0.06) * v * (speed > 0.2 ? 1 : 0.4), t, 0.1);
      engine.wg.gain.setTargetAtTime(speed / 46 * (inside ? 0.025 : 0.07) * v, t, 0.1);
    },
    stopEngine() {
      if (!engine) return;
      const t = ac.currentTime; engine.g.gain.setTargetAtTime(0, t, 0.05); engine.wg.gain.setTargetAtTime(0, t, 0.05);
    },
    unlock() { init(); },
    dispose() { try { if (ac) ac.close(); } catch { /* ปิดแล้ว */ } ac = null; engine = null; },
  };
}

// ================================================================ createVan
export function createVan({ lowQ = false, onSfx = () => {}, onAction = () => {} } = {}) {
  const sfx = (n) => onSfx(n);
  const W = 3.4, HW = W / 2, T = 0.12, FLOOR = VAN_FLOOR;
  const tileX = (i) => 2.5 - i;
  const ownedTex = []; // เท็กซ์เจอร์ที่ต้อง dispose
  const tex = (w, h, draw) => { const t = canvasTex(w, h, draw); ownedTex.push(t); return t; };

  const van = new THREE.Group(); van.name = "van";
  const body = new THREE.Group(); van.add(body);
  const wheelRig = new THREE.Group(); van.add(wheelRig);
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05, ...o });
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const rbox = (w, h, d, r = 0.05) => new RoundedBoxGeometry(w, h, d, lowQ ? 2 : 3, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
  const shadowAll = (o) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };
  function mesh(geo, mat, x = 0, y = 0, z = 0, parent = body) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); m.castShadow = true; m.receiveShadow = true; return m; }
  function grp(x = 0, y = 0, z = 0, parent = body) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }
  const dyn = (o) => { o.userData.dyn = true; return o; };
  const interactives = [];
  const animated = [];
  function anim(obj, prop, axis) { const a = { obj, prop, axis, tgt: obj[prop][axis] }; dyn(obj); animated.push(a); return a; }

  const paint = new THREE.MeshPhysicalMaterial({ color: 0x7fb8d8, roughness: 0.32, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.12 });
  const paintMats = [paint];
  function interactive(g, name, act) {
    dyn(g); g.userData.act = act; g.userData.iname = name;
    const clones = new Map(); // วัสดุโคลนครั้งเดียวต่อชิ้น (ไฮไลต์แยกชิ้น แต่ยังรวม mesh ในชิ้นเดียวกันได้)
    g.traverse((m) => {
      if (!m.isMesh) return;
      const o = m.material;
      if (!clones.has(o)) { const c = o.clone(); clones.set(o, c); if (o === paint) paintMats.push(c); }
      m.material = clones.get(o);
      m.userData.owner = g; m.userData.baseEm = m.material.emissive ? m.material.emissive.clone() : null;
    });
    interactives.push(g); return g;
  }
  const cream = new THREE.MeshPhysicalMaterial({ color: 0xf6efe0, roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  const trim = std(0x2d333b, { roughness: 0.55 });
  const chrome = std(0xe3e7ec, { roughness: 0.15, metalness: 1 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x29445a, roughness: 0.03, metalness: 0.1, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false });
  glass.userData.base = 0.38;
  const lining = std(0xece3d0, { roughness: 0.9, side: THREE.DoubleSide });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xfff2c0, emissiveIntensity: 0.15, roughness: 0.1 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xd8342c, emissive: 0xff2a1a, emissiveIntensity: 0.1, roughness: 0.25 });
  const tailMats = [tailMat];
  const tailMat0 = () => { const m = std(0xd8342c, { emissive: 0xff2a1a, emissiveIntensity: 0.2, roughness: 0.25 }); tailMats.push(m); return m; };
  const amber = std(0xffa22b, { emissive: 0xff8a00, emissiveIntensity: 0.3 });
  const floorMat = new THREE.MeshStandardMaterial({ map: tex(256, 256, (g) => {
    for (let i = 0; i < 8; i++) { g.fillStyle = `hsl(28,${38 + (i % 3) * 6}%,${36 + (i * 37 % 9)}%)`; g.fillRect(0, i * 32, 256, 32); g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(0, i * 32, 256, 2); g.fillRect((i * 97) % 256, i * 32, 2, 32); }
  }), roughness: 0.65 });

  // ---------------------------------------------------------------- เปลือกรถ (โปรไฟล์ข้าง ซุ้มล้อ หน้าต่าง 4 บาน)
  function bottomWithArches(s) {
    s.moveTo(-4.1, 0.5);
    s.lineTo(-3.35, 0.5); s.absarc(-2.6, 0.5, 0.75, Math.PI, 0, true);
    s.lineTo(1.85, 0.5); s.absarc(2.6, 0.5, 0.75, Math.PI, 0, true);
    s.lineTo(4.1, 0.5);
  }
  function fullProfile() {
    const s = new THREE.Shape(); bottomWithArches(s);
    s.lineTo(4.1, 1.35); s.quadraticCurveTo(4.1, 1.72, 3.75, 1.76);
    s.lineTo(3.35, 1.85); s.lineTo(2.72, 3.18); s.quadraticCurveTo(2.62, 3.4, 2.36, 3.4);
    s.lineTo(-3.8, 3.4); s.quadraticCurveTo(-4.1, 3.4, -4.1, 3.1); s.lineTo(-4.1, 0.5);
    return s;
  }
  function lowProfile() { const s = new THREE.Shape(); bottomWithArches(s); s.lineTo(4.1, 1.3); s.lineTo(-4.1, 1.3); s.lineTo(-4.1, 0.5); return s; }
  const WINDOWS = [
    [[1.95, 2.02], [3.12, 2.02], [2.62, 3.1], [1.95, 3.1]],
    [[0.1, 2.05], [1.75, 2.05], [1.75, 3.1], [0.1, 3.1]],
    [[-1.9, 2.05], [-0.1, 2.05], [-0.1, 3.1], [-1.9, 3.1]],
    [[-3.75, 2.05], [-2.1, 2.05], [-2.1, 3.1], [-3.75, 3.1]],
  ];
  const winPath = (pts, Cls = THREE.Path) => { const p = new Cls(); p.moveTo(...pts[0]); pts.slice(1).forEach((q) => p.lineTo(...q)); p.closePath(); return p; };
  const CS = lowQ ? 12 : 24;
  function sideWall(z0, full, lineZ) {
    const g = grp(); const s = full ? fullProfile() : lowProfile();
    if (full) WINDOWS.forEach((w) => s.holes.push(winPath(w)));
    mesh(new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false, curveSegments: CS }), paint, 0, 0, z0, g);
    const ln = new THREE.Mesh(new THREE.ShapeGeometry(s, CS), lining); ln.position.z = lineZ; ln.receiveShadow = true; g.add(ln);
    if (full) WINDOWS.forEach((w) => { const gm = new THREE.Mesh(new THREE.ShapeGeometry(winPath(w, THREE.Shape)), glass); gm.position.z = z0 + T / 2; g.add(gm); });
    else mesh(box(8.2, 0.06, T + 0.02), cream, 0, 1.31, z0 + T / 2, g);
    return g;
  }
  const shellLeft = sideWall(-HW, true, -HW + T + 0.004);
  const shellLeftLow = sideWall(-HW, false, -HW + T + 0.004);
  const shellRightFull = sideWall(HW - T, true, HW - T - 0.004);
  const shellRightLow = sideWall(HW - T, false, HW - T - 0.004);
  const shellNose = grp();
  mesh(rbox(0.8, 1.24, W, 0.12), paint, 3.7, 1.12, 0, shellNose);
  mesh(box(0.42, 0.06, W - 0.02), paint, 3.55, 1.75, 0, shellNose);
  const shellRoof = grp();
  for (const [x0, x1, z0, z1] of [[-3.9, 0.02, -HW, HW], [0.98, 2.42, -HW, HW], [0.02, 0.98, -HW, -0.48], [0.02, 0.98, 0.48, HW]]) {
    mesh(box(x1 - x0, 0.1, z1 - z0), cream, (x0 + x1) / 2, 3.35, (z0 + z1) / 2, shellRoof);
    mesh(box(x1 - x0, 0.02, z1 - z0), lining, (x0 + x1) / 2, 3.29, (z0 + z1) / 2, shellRoof);
  }
  mesh(new THREE.CylinderGeometry(0.24, 0.24, W, 32), cream, 2.48, 3.16, 0, shellRoof).rotation.x = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.3, 0.3, W, 32), cream, -3.8, 3.1, 0, shellRoof).rotation.x = Math.PI / 2;
  for (const z of [-1, 1]) mesh(new THREE.CylinderGeometry(0.07, 0.07, 6.3, 16), cream, -0.72, 3.36, z * (HW - 0.035), shellRoof).rotation.z = Math.PI / 2;

  // ---------------------------------------------------------------- ลายนอกตัวรถ (ทูโทน · คิ้วโครเมียม · ขอบยาง · ซุ้มล้อ)
  const exL = grp(), exR = grp(), exTop = grp();
  function upperShape() {
    const s = new THREE.Shape(); s.moveTo(-4.1, 1.75); s.lineTo(3.78, 1.75); s.lineTo(3.35, 1.85); s.lineTo(2.72, 3.18);
    s.quadraticCurveTo(2.62, 3.4, 2.36, 3.4); s.lineTo(-3.8, 3.4); s.quadraticCurveTo(-4.1, 3.4, -4.1, 3.1); s.closePath();
    WINDOWS.forEach((w) => s.holes.push(winPath(w))); return s;
  }
  function frameShape(w) {
    const cx = w.reduce((a, p) => a + p[0], 0) / w.length, cy = w.reduce((a, p) => a + p[1], 0) / w.length;
    const s = winPath(w.map(([x, y]) => [x + Math.sign(x - cx) * 0.055, y + Math.sign(y - cy) * 0.055]), THREE.Shape); s.holes.push(winPath(w)); return s;
  }
  const creamSide = new THREE.MeshPhysicalMaterial({ color: 0xf6efe0, roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.2, side: THREE.DoubleSide });
  const rubber = std(0x1b1e22, { roughness: 0.8, side: THREE.DoubleSide });
  const archMat = std(0x15171a, { roughness: 1, side: THREE.DoubleSide });
  for (const [side, g] of [[-1, exL], [1, exR]]) {
    const zo = side * HW, sz = (d) => zo + side * d;
    const up = new THREE.Mesh(new THREE.ShapeGeometry(upperShape(), CS), creamSide); up.position.z = sz(0.003); g.add(shadowAll(up));
    WINDOWS.forEach((w) => { const f = new THREE.Mesh(new THREE.ShapeGeometry(frameShape(w)), rubber); f.position.z = sz(0.007); g.add(f); });
    mesh(rbox(7.85, 0.06, 0.04, 0.015), chrome, -0.18, 1.75, sz(0.014), g);
    for (const [x0, x1] of [[-4.0, -3.45], [-1.75, 1.75], [3.45, 4.0]]) mesh(rbox(x1 - x0, 0.04, 0.03, 0.01), chrome, (x0 + x1) / 2, 0.66, sz(0.012), g);
    for (const x of [2.6, -2.6]) {
      const lg = new THREE.CylinderGeometry(0.76, 0.76, 0.5, 28, 1, true, Math.PI / 2, Math.PI); lg.rotateX(Math.PI / 2);
      mesh(lg, archMat, x, 0.5, zo - side * 0.25, g);
      mesh(new THREE.CircleGeometry(0.76, 28, 0, Math.PI), archMat, x, 0.5, zo - side * 0.5, g);
    }
    for (const x of [2.6, -2.6]) { const f = mesh(new THREE.TorusGeometry(0.79, 0.07, 10, 32, Math.PI), rubber, x, 0.5, sz(0.02), g); f.scale.z = 0.6; }
    mesh(rbox(0.16, 0.08, 0.03, 0.01), amber, 3.75, 1.0, sz(0.012), g);
    mesh(rbox(0.12, 0.08, 0.03, 0.01), tailMat0(), -3.95, 1.0, sz(0.012), g);
    for (let k = 0; k < 5; k++) mesh(rbox(0.32, 0.035, 0.03, 0.01), rubber, -3.45, 1.12 + k * 0.09, sz(0.01), g);
    mesh(box(0.025, 1.2, 0.02), rubber, 3.3, 1.2, sz(0.01), g);
    mesh(box(0.025, 2.0, 0.02), rubber, 1.92, 1.55, sz(0.01), g);
    mesh(rbox(0.26, 0.06, 0.06, 0.02), chrome, 2.3, 1.88, sz(0.04), g);
  }
  // ประตูเลื่อน + บันไดข้าง + ฝาถัง (ฝั่งซ้าย)
  mesh(box(0.025, 2.0, 0.02), rubber, 0.0, 1.55, -HW - 0.01, exL);
  mesh(rbox(1.4, 0.06, 0.06, 0.02), chrome, 0.92, 3.22, -HW - 0.03, exL);
  mesh(rbox(0.3, 0.06, 0.06, 0.02), chrome, 0.35, 1.88, -HW - 0.04, exL);
  mesh(rbox(1.6, 0.06, 0.28, 0.02), chrome, 0.92, 0.42, -HW - 0.12, exL);
  mesh(new THREE.CircleGeometry(0.12, 24), chrome, -3.05, 1.35, -HW - 0.012, exL).rotation.y = Math.PI;
  mesh(rbox(1.6, 0.03, 0.36, 0.01), std(0x111418), 0.92, 0.39, -HW - 0.14, exL);
  const vent = grp(-2.6, 3.5, 0, exTop);
  mesh(rbox(0.7, 0.14, 0.55, 0.05), cream, 0, 0, 0, vent);
  for (let k = 0; k < 4; k++) mesh(box(0.06, 0.02, 0.45), rubber, -0.22 + k * 0.15, 0.075, 0, vent);
  const exFront = grp();
  mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 40), chrome, 4.11, 1.45, 0, exFront).rotation.z = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.045, 40), paint, 4.115, 1.45, 0, exFront).rotation.z = Math.PI / 2;
  const starShape = (r0, r1) => { const st = new THREE.Shape(); for (let k = 0; k < 10; k++) { const a = Math.PI / 2 + k / 10 * TAU, r = k % 2 ? r0 : r1; k ? st.lineTo(Math.cos(a) * r, Math.sin(a) * r) : st.moveTo(Math.cos(a) * r, Math.sin(a) * r); } return st; };
  mesh(new THREE.ShapeGeometry(starShape(0.045, 0.11)), chrome, 4.14, 1.45, 0, exFront).rotation.y = Math.PI / 2;
  for (const z of [-1.15, 1.15]) mesh(rbox(0.05, 0.1, 0.22, 0.03), amber, 4.12, 0.98, z, exFront);

  // ---------------------------------------------------------------- ประตูท้ายบานคู่
  const rearDoors = grp();
  const doorAnims = [];
  const DW = HW;
  const doorPivots = [];
  for (const side of [-1, 1]) {
    const piv = grp(-4.1 + T / 2, 0, side * HW, rearDoors), zc = (v) => -side * v;
    doorPivots.push(piv);
    mesh(box(T, 1.25, DW), paint, 0, 1.125, zc(DW / 2), piv);
    mesh(box(T, 0.4, DW), cream, 0, 1.95, zc(DW / 2), piv);
    mesh(box(T, 0.1, DW), cream, 0, 3.05, zc(DW / 2), piv);
    mesh(box(T, 0.85, 0.22), cream, 0, 2.575, zc(0.11), piv);
    mesh(box(T, 0.85, 0.24), cream, 0, 2.575, zc(DW - 0.12), piv);
    const gl = mesh(box(0.02, 0.85, DW - 0.46), glass, -T / 2 - 0.012, 2.575, zc((0.22 + DW - 0.24) / 2), piv); gl.castShadow = false;
    mesh(box(0.012, 0.9, DW - 0.4), rubber, -T / 2 - 0.004, 2.575, zc((0.22 + DW - 0.24) / 2), piv);
    mesh(rbox(0.03, 0.06, DW, 0.01), chrome, -T / 2 - 0.014, 1.75, zc(DW / 2), piv);
    mesh(rbox(0.07, 0.42, 0.2, 0.03), tailMat, -T / 2 - 0.03, 1.42, zc(0.14), piv);
    mesh(rbox(0.07, 0.17, 0.2, 0.03), amber, -T / 2 - 0.03, 1.1, zc(0.14), piv);
    mesh(rbox(0.06, 0.06, 0.22, 0.02), chrome, -T / 2 - 0.035, 1.88, zc(DW - 0.22), piv);
    mesh(box(0.01, 2.5, DW - 0.02), lining, T / 2 + 0.006, 1.25, zc(DW / 2), piv).scale.y = 0.62;
    if (side > 0) {
      // ยางอะไหล่ + โปสเตอร์ ROAD TRIP ด้านใน
      const sp = grp(-T / 2 - 0.16, 1.3, zc(DW / 2 + 0.12), piv); sp.scale.setScalar(0.9);
      mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.26, 36), std(0x1e1f22, { roughness: 0.92 }), 0, 0, 0, sp).rotation.z = Math.PI / 2;
      mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.28, 36), cream, 0, 0, 0, sp).rotation.z = Math.PI / 2;
      mesh(new THREE.TorusGeometry(0.3, 0.03, 8, 36), paint, -0.15, 0, 0, sp).rotation.y = Math.PI / 2;
      mesh(new THREE.ShapeGeometry(starShape(0.07, 0.17)), paint, -0.145, 0, 0, sp).rotation.y = -Math.PI / 2;
      mesh(new THREE.PlaneGeometry(0.6, 0.8), new THREE.MeshStandardMaterial({ map: tex(192, 256, (g) => {
        const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#ff8a3d"); gr.addColorStop(1, "#7a3fa8"); g.fillStyle = gr; g.fillRect(0, 0, 192, 256);
        g.fillStyle = "#ffd27a"; g.beginPath(); g.arc(96, 120, 46, 0, TAU); g.fill();
        g.fillStyle = "#1f2a33"; g.beginPath(); g.moveTo(0, 256); g.lineTo(60, 150); g.lineTo(110, 200); g.lineTo(150, 140); g.lineTo(192, 256); g.fill();
        g.fillStyle = "#fff"; g.font = "800 30px sans-serif"; g.textAlign = "center"; g.fillText("ROAD", 96, 46); g.fillText("TRIP", 96, 78);
      }), roughness: 0.8 }), T / 2 + 0.014, 1.5, zc(DW / 2), piv).rotation.y = Math.PI / 2;
    } else {
      for (const zz of [0.42, 0.82]) mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.5, 10), chrome, -T / 2 - 0.1, 2.1, zc(zz), piv);
      for (let k = 0; k < 7; k++) mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.4, 8), chrome, -T / 2 - 0.1, 1.0 + k * 0.36, zc(0.62), piv).rotation.x = Math.PI / 2;
      for (const y of [1.0, 3.2]) mesh(box(0.1, 0.04, 0.04), chrome, -T / 2 - 0.05, y, zc(0.62), piv);
    }
    const a = anim(piv, "rotation", "y"); a.open = side < 0 ? -1.92 : 1.92; doorAnims.push(a);
  }
  let rearOpen = false;
  function setRear(open) {
    open = !!open;
    if (open === rearOpen) return;
    rearOpen = open; doorAnims.forEach((a) => (a.tgt = open ? a.open : 0));
  }

  // ---------------------------------------------------------------- ซันรูฟ
  const roofTop = grp();
  const hatchLid = grp(0.98, 3.47, 0, roofTop);
  mesh(rbox(0.96, 0.08, 0.96, 0.03), trim, 0.5, 3.46, 0, roofTop);
  mesh(rbox(0.9, 0.06, 0.9, 0.03), trim, -0.45, 0.04, 0, hatchLid);
  mesh(box(0.74, 0.02, 0.74), glass, -0.45, 0.075, 0, hatchLid).castShadow = false;
  mesh(box(0.8, 0.09, 0.8), std(0x111418), 0.5, 3.45, 0, roofTop);

  // ---------------------------------------------------------------- พื้นห้อง + ตาราง 3×7 (เห็นเฉพาะมุมผ่า)
  const interior = grp();
  mesh(box(7.3, 0.12, W - 0.2), floorMat, -0.5, FLOOR - 0.06, 0, interior);
  // ของสูงบนผนัง/เพดานในรถ (บันได กระจกมองหลัง ไฟประดับ ผ้าม่าน แผนที่ รูป) — ซ่อนในมุมกระดานต่อสู้ (ผนังเตี้ย ไม่ให้ลอยบังหมาก)
  const upper = dyn(grp(0, 0, 0, interior));
  const gridGroup = grp();
  {
    const TILE_COL = { drive: 0xffb36b, win: 0x8fd0ff, door: 0xb9a6ff, roof: 0x9be3b0, gear: 0xff8d8d, rest: 0xffe08a, play: 0xf7a8d8, none: 0xd8cbb4 };
    const TILE_KIND = [["gear", "drive", "drive"], ["door", "none", "win"], ["gear", "roof", "none"], ["win", "play", "win"], ["rest", "none", "gear"], ["rest", "none", "gear"], ["gear", "play", "gear"]];
    const tm = new Map();
    const tg = new THREE.PlaneGeometry(0.92, 0.92); tg.rotateX(-Math.PI / 2);
    for (let i = 0; i < 7; i++) for (let c = -1; c <= 1; c++) {
      const col = TILE_COL[TILE_KIND[i][c + 1]];
      if (!tm.has(col)) tm.set(col, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.32, depthWrite: false }));
      const t = new THREE.Mesh(tg, tm.get(col)); t.position.set(tileX(i), FLOOR + 0.012, c); gridGroup.add(t);
    }
    const pts = [];
    for (let i = 0; i <= 7; i++) { const x = 3 - i; pts.push(x, FLOOR + 0.014, -1.5, x, FLOOR + 0.014, 1.5); }
    for (let c = 0; c <= 3; c++) { const z = -1.5 + c; pts.push(3, FLOOR + 0.014, z, -4, FLOOR + 0.014, z); }
    const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    gridGroup.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x2a2018, transparent: true, opacity: 0.45 })));
  }
  dyn(gridGroup);

  // ---------------------------------------------------------------- แผงหน้ารถ
  const dashMat = std(0x3a3f47, { roughness: 0.6 });
  mesh(rbox(0.6, 1.12, W - 0.3, 0.06), dashMat, 3.1, FLOOR + 0.56, 0, interior);
  mesh(rbox(0.42, 0.18, W - 0.3, 0.05), dashMat, 3.24, 1.78, 0, interior);
  const speedo = grp(2.785, 1.5, 1.0, interior); speedo.rotation.y = -Math.PI / 2;
  mesh(new THREE.CircleGeometry(0.17, 32), new THREE.MeshStandardMaterial({ map: tex(256, 256, (g) => {
    g.fillStyle = "#11161c"; g.beginPath(); g.arc(128, 128, 126, 0, TAU); g.fill();
    g.strokeStyle = "#e8eef4"; g.lineWidth = 4;
    for (let k = 0; k <= 12; k++) { const a = Math.PI * 0.75 + k / 12 * Math.PI * 1.5; g.beginPath(); g.moveTo(128 + Math.cos(a) * 112, 128 + Math.sin(a) * 112); g.lineTo(128 + Math.cos(a) * (k % 2 ? 100 : 88), 128 + Math.sin(a) * (k % 2 ? 100 : 88)); g.stroke(); }
    g.fillStyle = "#e8eef4"; g.font = "700 26px sans-serif"; g.textAlign = "center";
    for (let k = 0; k <= 6; k++) { const a = Math.PI * 0.75 + k / 6 * Math.PI * 1.5; g.fillText(String(k * 30), 128 + Math.cos(a) * 66, 137 + Math.sin(a) * 66); }
  }), emissive: 0xffffff, emissiveIntensity: 0.15, roughness: 0.4 }), 0, 0, 0, speedo).castShadow = false;
  const needle = dyn(grp(0, 0, 0.01, speedo));
  mesh(box(0.13, 0.012, 0.006), std(0xff5a36, { emissive: 0xff5a36, emissiveIntensity: 0.6 }), 0.065, 0, 0, needle);
  mesh(new THREE.TorusGeometry(0.17, 0.012, 8, 32), chrome, 0, 0, 0.005, speedo);

  // พวงมาลัย (บีบแตร)
  let styleKey = "normal";
  const wheelBase = grp(2.68, 1.6, 1.0, interior); wheelBase.rotation.z = -0.45;
  const steer = dyn(grp(0, 0, 0, wheelBase));
  mesh(new THREE.TorusGeometry(0.27, 0.035, 12, 40), std(0x22262c, { roughness: 0.5 }), 0, 0, 0, steer).rotation.y = Math.PI / 2;
  for (const a of [0, 2.2, 4.1]) { const sp = mesh(box(0.03, 0.26, 0.04), trim, 0, 0, 0, steer); sp.rotation.x = a; sp.translateY(0.13); }
  mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 20), std(0xff8a3d), -0.01, 0, 0, steer).rotation.z = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.45, 12), trim, 0.22, 0, 0, wheelBase).rotation.z = Math.PI / 2;
  interactive(wheelBase, "แตร", () => { onAction("horn"); bump(0.15); });

  // วิทยุ (จอแสดงสถานีตาม state.roadtrip.radio)
  const radioCanvas = document.createElement("canvas"); radioCanvas.width = 320; radioCanvas.height = 96;
  const radioTex = new THREE.CanvasTexture(radioCanvas); radioTex.colorSpace = THREE.SRGBColorSpace; ownedTex.push(radioTex);
  let radioSig = "";
  function drawRadio(r) {
    const src = r && r.src ? r.src : "off", st = r && Number.isFinite(+r.station) ? +r.station : -1;
    const ytT = r && r.yt && (r.yt.title || "");
    const sig = `${src}|${st}|${ytT}`;
    if (sig === radioSig) return;
    radioSig = sig;
    const g = radioCanvas.getContext("2d");
    g.fillStyle = "#0b1410"; g.fillRect(0, 0, 320, 96); g.textBaseline = "middle";
    if (src === "yt") {
      g.font = `800 40px ${FONT}`; g.fillStyle = "#ff4e45"; g.fillText("YouTube", 14, 34);
      g.font = `700 24px ${FONT}`; g.fillStyle = "#ffd27a";
      let tt = ytT || "…"; while (g.measureText(tt).width > 292 && tt.length > 2) tt = tt.slice(0, -2) + "…";
      g.fillText(tt, 16, 74);
    } else {
      const on = src === "synth" && STATION_NAMES[st];
      g.font = `800 40px ${FONT}`; g.fillStyle = on ? "#7dffcf" : "#26352d"; g.fillText(on ? STATION_NAMES[st][0] : "--.-", 14, 34);
      if (on) { g.font = `700 26px ${FONT}`; g.fillStyle = "#ffd27a"; g.fillText(STATION_NAMES[st][1], 16, 74); }
    }
    radioTex.needsUpdate = true;
  }
  drawRadio(null);
  const radio = grp(2.79, 1.33, 0, interior);
  mesh(rbox(0.06, 0.26, 0.6, 0.02), std(0x1a1d22), 0, 0, 0, radio);
  const radioScr = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.11), new THREE.MeshStandardMaterial({ map: radioTex, emissive: 0xffffff, emissiveMap: radioTex, emissiveIntensity: 0.9 }));
  radioScr.rotation.y = -Math.PI / 2; radioScr.position.set(-0.032, 0.04, -0.04); radio.add(dyn(radioScr));
  for (const z of [0.2, -0.26]) mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 16), chrome, -0.04, -0.06, z, radio).rotation.z = Math.PI / 2;
  for (let k = 0; k < 5; k++) mesh(box(0.02, 0.03, 0.05), trim, -0.035, -0.08, -0.12 + k * 0.065, radio);
  interactive(radio, "วิทยุ", () => { sfx("click"); onAction("radio"); });

  // ช่องเก็บของหน้ารถ
  const glove = grp(2.79, 1.1, -1.0, interior);
  mesh(rbox(0.04, 0.28, 0.6, 0.02), dashMat, 0, 0.14, 0, glove);
  mesh(rbox(0.03, 0.04, 0.16, 0.01), chrome, -0.03, 0.22, 0, glove);
  const gloveA = anim(glove, "rotation", "z");
  const gloveIn = grp(2.92, 1.18, -1.0, interior);
  mesh(box(0.15, 0.03, 0.4), std(0xf2d36b), 0, 0, 0, gloveIn).rotation.z = 0.3;
  mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 16), trim, 0, 0.05, -0.1, gloveIn).rotation.x = Math.PI / 2;
  interactive(glove, "ช่องเก็บของ", () => { gloveA.tgt = gloveA.tgt ? 0 : 1.05; sfx("click"); });

  // พัดลมหน้ารถ
  const fan = grp(3.2, 1.87, -0.6, interior);
  mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.04, 20), cream, 0, 0.02, 0, fan);
  mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 10), cream, 0, 0.13, 0, fan);
  const fanHead = dyn(grp(0, 0.28, 0, fan)); fanHead.rotation.y = 0.3;
  mesh(new THREE.TorusGeometry(0.15, 0.012, 6, 28), cream, -0.03, 0, 0, fanHead).rotation.y = Math.PI / 2;
  mesh(new THREE.SphereGeometry(0.05, 14, 10), cream, 0.03, 0, 0, fanHead);
  const fanBlades = grp(-0.02, 0, 0, fanHead);
  for (let k = 0; k < 4; k++) { const b = mesh(box(0.01, 0.13, 0.06), std(0x8fd0ff, { transparent: true, opacity: 0.85 }), 0, 0, 0, fanBlades); b.rotation.x = k / 4 * TAU; b.translateY(0.07); }
  let fanOn = false;
  interactive(fan, "พัดลม", () => { fanOn = !fanOn; sfx("click"); });

  // ตุ๊กตาหมาหัวโยก
  const bob = grp(3.22, 1.87, -0.12, interior);
  mesh(rbox(0.16, 0.12, 0.1, 0.04), std(0xc98d4e), 0, 0.06, 0, bob);
  const bobHead = dyn(grp(0, 0.16, 0, bob));
  mesh(new THREE.SphereGeometry(0.085, 18, 12), std(0xd9a066), 0, 0.05, 0, bobHead);
  mesh(new THREE.SphereGeometry(0.04, 12, 8), std(0xd9a066), -0.07, 0.03, 0, bobHead);
  mesh(new THREE.SphereGeometry(0.015, 8, 6), trim, -0.11, 0.04, 0, bobHead);
  for (const z of [-0.06, 0.06]) { mesh(new THREE.SphereGeometry(0.035, 10, 8), std(0x7a5232), 0.0, 0.11, z, bobHead).scale.set(0.6, 1.4, 0.6); mesh(new THREE.SphereGeometry(0.013, 8, 6), trim, -0.07, 0.08, z * 0.5, bobHead); }
  let bobKick = 0;
  interactive(bob, "หมาหัวโยก", () => { bobKick = 1; sfx("boing"); });

  // กระจกมองหลัง + พวงมาลัยดอกไม้
  mesh(box(0.04, 0.2, 0.04), trim, 2.68, 3.15, 0.05, upper);
  mesh(rbox(0.05, 0.11, 0.42, 0.03), trim, 2.7, 3.0, 0.05, upper);
  const garland = dyn(grp(2.72, 2.94, 0.05, upper));
  mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.2), std(0xffffff), 0, -0.1, 0, garland);
  for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; mesh(new THREE.SphereGeometry(0.022, 8, 6), std(k % 2 ? 0xfff8ea : 0xff9b2f, { roughness: 0.8 }), Math.cos(a) * 0.07, -0.28 + Math.sin(a) * 0.07, 0, garland); }
  mesh(new THREE.SphereGeometry(0.03, 8, 6), std(0xd8344c), 0, -0.38, 0, garland);
  let garlandV = 0;

  // คอนโซลกลาง + เกียร์ (นั่ง/ลุกจากที่คนขับ)
  mesh(rbox(0.7, 0.5, 0.5, 0.05), dashMat, tileX(0), FLOOR + 0.25, 0, interior);
  for (const z of [-0.12, 0.12]) mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16), trim, 2.25, FLOOR + 0.505, z, interior);
  mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.12, 14), std(0xd94b3b), 2.25, FLOOR + 0.57, 0.12, interior);
  const gear = grp(2.65, FLOOR + 0.5, 0, interior);
  mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.32, 10), chrome, 0, 0.16, 0, gear);
  mesh(new THREE.SphereGeometry(0.055, 16, 12), std(0x15171a, { roughness: 0.3 }), 0, 0.34, 0, gear);
  const gearA = anim(gear, "rotation", "z");
  interactive(gear, "เกียร์", () => { sfx("click"); onAction("seat"); });
  interactive(rearDoors, "ประตูท้าย", () => { setRear(!rearOpen); sfx("creak"); });

  // เบาะ
  const fabric = std(0x3f8f8a, { roughness: 0.95 });
  const fabricLine = std(0x347a75);
  function seat(x, z, w = 0.8) {
    const g = grp(x, FLOOR, z, interior);
    mesh(rbox(0.8, 0.42, w, 0.1), fabric, 0, 0.3, 0, g);
    mesh(rbox(0.18, 0.95, w, 0.08), fabric, -0.36, 0.95, 0, g);
    mesh(rbox(0.14, 0.22, w * 0.6, 0.06), fabric, -0.38, 1.52, 0, g);
    mesh(box(0.6, 0.1, 0.6), trim, 0, 0.05, 0, g);
    for (let k = 0; k < 3; k++) mesh(box(0.7, 0.012, w - 0.06), fabricLine, 0.02, 0.515, 0, g).position.x = -0.2 + k * 0.2;
    return g;
  }
  interactive(seat(tileX(0), 1), "ที่นั่งคนขับ", () => { sfx("soft"); onAction("seat"); });
  seat(tileX(0), -1);

  // แถว 1: ถังดับเพลิง · ถังขยะ · สวิตช์ไฟ
  {
    const g = grp(1.15, FLOOR, -1.42, interior);
    mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.5, 18), std(0xd8342c, { roughness: 0.35 }), 0, 0.25, 0, g);
    mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.08, 12), trim, 0, 0.54, 0, g);
    mesh(box(0.14, 0.03, 0.03), trim, 0.06, 0.58, 0, g);
    const bin = grp(1.2, FLOOR, 1.3, interior);
    mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.35, 16, 1, true), std(0x6fae7a, { side: THREE.DoubleSide }), 0, 0.175, 0, bin);
  }
  let lightsOn = false;
  const sw = grp(1.85, 1.55, -1.565, upper);
  mesh(rbox(0.12, 0.18, 0.025, 0.01), cream, 0, 0, 0, sw);
  const swKnob = dyn(mesh(box(0.04, 0.07, 0.03), trim, 0, 0.02, 0.015, sw));
  interactive(sw, "สวิตช์ไฟ", () => { lightsOn = !lightsOn; swKnob.position.y = lightsOn ? -0.02 : 0.02; sfx("click"); applyLights(); });

  // แถว 2: บันได + ซันรูฟ + แผนที่ + พรม
  {
    const lx = 0.72, H = 3.3 - FLOOR;
    for (const z of [-0.28, 0.28]) mesh(new THREE.CylinderGeometry(0.03, 0.03, H, 10), chrome, lx, FLOOR + H / 2, z, upper);
    for (let k = 1; k < 7; k++) mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.56, 8), chrome, lx, FLOOR + k * H / 7, 0, upper).rotation.x = Math.PI / 2;
  }
  const hatchA = anim(hatchLid, "rotation", "z");
  {
    const hit = grp(0.5, 3.25, 0, upper);
    mesh(box(0.85, 0.05, 0.85), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), 0, 0, 0, hit).castShadow = false;
    mesh(box(0.06, 0.06, 0.2), chrome, 0.38, -0.02, 0, hit);
    interactive(hit, "ซันรูฟ", () => { hatchA.tgt = hatchA.tgt ? 0 : 1.15; sfx("creak"); });
  }
  mesh(new THREE.PlaneGeometry(0.8, 0.56), new THREE.MeshStandardMaterial({ map: tex(256, 180, (g) => {
    g.fillStyle = "#f3e7c6"; g.fillRect(0, 0, 256, 180); g.strokeStyle = "#7a5a3a"; g.lineWidth = 6; g.strokeRect(3, 3, 250, 174);
    g.fillStyle = "#a9d39a"; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(30 + i * 40, 40 + (i % 3) * 45, 26, 0, TAU); g.fill(); }
    g.fillStyle = "#8ec5e6"; g.beginPath(); g.ellipse(200, 140, 50, 26, 0.3, 0, TAU); g.fill();
    g.strokeStyle = "#d9534f"; g.lineWidth = 4; g.setLineDash([10, 7]); g.beginPath(); g.moveTo(20, 160); g.bezierCurveTo(80, 60, 150, 170, 230, 30); g.stroke(); g.setLineDash([]);
    g.fillStyle = "#d9534f"; g.beginPath(); g.arc(230, 30, 9, 0, TAU); g.fill();
  }), roughness: 0.8 }), 0.55, 1.45, -1.572, upper);
  mesh(new THREE.CircleGeometry(0.85, 40), new THREE.MeshStandardMaterial({ map: tex(256, 256, (g) => {
    const cs = ["#c4604a", "#f2c94c", "#5f7fb5", "#f6efe0"]; for (let k = 0; k < 8; k++) { g.fillStyle = cs[k % 4]; g.beginPath(); g.arc(128, 128, 128 - k * 16, 0, TAU); g.fill(); }
  }), roughness: 1 }), 0, FLOOR + 0.004, 0, interior).rotation.x = -Math.PI / 2;

  // แถว 3: โต๊ะเกม + ลูกเต๋า · รูปโพลารอยด์
  const table = grp(-0.5, FLOOR, 0, interior);
  mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.68, 12), chrome, 0, 0.34, 0, table);
  mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.03, 20), chrome, 0, 0.015, 0, table);
  mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.045, 36), std(0xb98552, { roughness: 0.5 }), 0, 0.7, 0, table);
  mesh(new THREE.PlaneGeometry(0.46, 0.46), new THREE.MeshStandardMaterial({ map: tex(256, 256, (g) => {
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? "#c4604a" : "#f6efe0"; g.fillRect(i * 32, j * 32, 32, 32); }
    for (let k = 0; k < 10; k++) { g.fillStyle = k % 2 ? "#1f2a33" : "#ffffff"; g.beginPath(); g.arc(16 + (k * 3 % 8) * 32, 16 + (k * 5 % 8) * 32, 11, 0, TAU); g.fill(); }
  }), roughness: 0.6 }), 0, 0.726, 0, table).rotation.x = -Math.PI / 2;
  const dice = [];
  for (const [x, z] of [[0.3, -0.1], [0.28, 0.12]]) {
    const d = dyn(grp(x, 0.77, z, table)); mesh(rbox(0.07, 0.07, 0.07, 0.012), std(0xffffff, { roughness: 0.3 }), 0, 0, 0, d);
    for (const [px, pz] of [[0, 0], [0.018, 0.018], [-0.018, -0.018]]) mesh(new THREE.SphereGeometry(0.008, 6, 4), trim, px, 0.035, pz, d);
    d.userData.spin = 0; dice.push(d);
  }
  mesh(rbox(0.16, 0.2, 0.06, 0.03), std(0xf2c94c), -0.25, 0.82, 0.18, table).rotation.y = 0.5;
  mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.1, 14), std(0x5aa0e0), -0.2, 0.77, -0.2, table);
  interactive(table, "โต๊ะเกม", () => { dice.forEach((d) => (d.userData.spin = 1)); sfx("dice"); });
  for (let k = 0; k < 3; k++) {
    const pt = tex(96, 112, (g) => { g.fillStyle = "#fff"; g.fillRect(0, 0, 96, 112); g.fillStyle = ["#8ec5e6", "#f2a1b5", "#a9d39a"][k]; g.fillRect(8, 8, 80, 76); g.fillStyle = "#fff6"; g.beginPath(); g.arc(48, 46, 18, 0, TAU); g.fill(); });
    const p = mesh(new THREE.PlaneGeometry(0.2, 0.24), new THREE.MeshStandardMaterial({ map: pt, roughness: 0.6 }), -0.85 + k * 0.28, 1.62 + (k % 2) * 0.06, -1.572, upper);
    p.rotation.z = (k - 1) * 0.12; p.castShadow = false;
  }

  // แถว 4–5 ซ้าย: เบาะยาว + หมอน
  const bench = grp((tileX(4) + tileX(5)) / 2, FLOOR, -1.05, interior);
  mesh(rbox(1.9, 0.42, 0.8, 0.1), fabric, 0, 0.3, 0, bench);
  mesh(rbox(1.9, 0.9, 0.18, 0.08), fabric, 0, 0.92, -0.37, bench);
  mesh(rbox(0.7, 0.08, 0.6, 0.04), std(0xc4604a, { roughness: 1 }), 0.45, 0.55, 0.05, bench);
  for (const [x, col] of [[-0.7, 0xf6efe0], [-0.25, 0xf2c94c]]) {
    const p = grp(x, 0.62, -0.18, bench);
    mesh(rbox(0.34, 0.3, 0.14, 0.07), std(col, { roughness: 1 }), 0, 0.12, 0, p).rotation.x = -0.25;
    const pa = anim(p, "scale", "y"); pa.tgt = 1;
    interactive(p, "หมอน", () => { p.scale.y = 0.45; sfx("soft"); });
  }

  // แถว 4 ขวา: กล่องเครื่องมือ
  const tool = grp(tileX(4), FLOOR, 1.05, interior);
  const red = std(0xd8453b, { roughness: 0.4, metalness: 0.35 });
  mesh(box(0.8, 0.45, 0.55), red, 0, 0.225, 0, tool);
  mesh(box(0.74, 0.02, 0.49), std(0x1a1d22), 0, 0.45, 0, tool);
  mesh(box(0.25, 0.03, 0.06), chrome, -0.1, 0.43, -0.05, tool);
  mesh(box(0.05, 0.03, 0.3), chrome, 0.2, 0.43, 0.05, tool);
  mesh(box(0.18, 0.1, 0.02), std(0xf2c94c), 0, 0.28, -0.28, tool);
  const toolLid = grp(0, 0.45, 0.275, tool);
  mesh(box(0.82, 0.06, 0.56), std(0xa8322a, { roughness: 0.4, metalness: 0.35 }), 0, 0.03, -0.28, toolLid);
  mesh(box(0.4, 0.04, 0.04), chrome, 0, 0.1, -0.28, toolLid);
  const toolA = anim(toolLid, "rotation", "x");
  interactive(tool, "กล่องเครื่องมือ", () => { toolA.tgt = toolA.tgt ? 0 : 1.25; sfx("clank"); });

  // แถว 5 ขวา: ตู้เย็น + ไมโครเวฟ
  const fridge = grp(tileX(5), FLOOR, 1.1, interior);
  let fridgeGlow;
  {
    const wM = std(0xf7f7f4, { roughness: 0.3 });
    mesh(box(0.8, 1.35, 0.04), wM, 0, 0.675, 0.33, fridge);
    for (const x of [-0.38, 0.38]) mesh(box(0.04, 1.35, 0.7), wM, x, 0.675, 0, fridge);
    mesh(box(0.8, 0.04, 0.7), wM, 0, 0.02, 0, fridge); mesh(box(0.8, 0.04, 0.7), wM, 0, 1.33, 0, fridge);
    const shelf = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, roughness: 0.05 });
    for (const y of [0.45, 0.9]) mesh(box(0.72, 0.015, 0.6), shelf, 0, y, 0.02, fridge);
    const glowP = mesh(new THREE.PlaneGeometry(0.7, 1.25), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xdff4ff, emissiveIntensity: 0 }), 0, 0.68, 0.305, fridge);
    glowP.rotation.y = Math.PI; fridgeGlow = dyn(glowP);
    const cans = [0xd8342c, 0x3fae7a, 0x5aa0e0, 0xf2c94c, 0xff8a3d];
    for (let k = 0; k < 5; k++) mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.14, 14), std(cans[k], { metalness: 0.6, roughness: 0.3 }), -0.25 + k * 0.12, 0.535, 0.05, fridge);
    for (let k = 0; k < 3; k++) mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.3, 14), new THREE.MeshPhysicalMaterial({ color: [0x7dd3a0, 0x9ad0ff, 0xffd27a][k], transparent: true, opacity: 0.75, roughness: 0.05 }), -0.2 + k * 0.17, 1.07, 0.05, fridge);
    mesh(rbox(0.3, 0.12, 0.25, 0.04), std(0xfff3c8), 0.15, 0.1, 0.05, fridge);
    mesh(new THREE.SphereGeometry(0.07, 14, 10), std(0xff8a3d), -0.2, 0.11, 0.05, fridge);
  }
  const fridgeDoor = grp(0.4, 0, -0.35, fridge);
  {
    const wM = std(0xf7f7f4, { roughness: 0.3 });
    mesh(rbox(0.8, 1.34, 0.06, 0.02), wM, -0.4, 0.675, -0.03, fridgeDoor);
    mesh(box(0.81, 0.02, 0.065), std(0xc9c9c4), -0.4, 0.92, -0.03, fridgeDoor);
    mesh(rbox(0.04, 0.38, 0.04, 0.015), chrome, -0.72, 1.12, -0.08, fridgeDoor);
    mesh(rbox(0.04, 0.22, 0.04, 0.015), chrome, -0.72, 0.62, -0.08, fridgeDoor);
    mesh(box(0.13, 0.13, 0.01), std(0xff8a3d), -0.25, 1.15, -0.065, fridgeDoor);
    mesh(box(0.1, 0.1, 0.01), std(0x8fd3b0), -0.45, 1.25, -0.065, fridgeDoor).rotation.z = 0.2;
  }
  const fridgeA = anim(fridgeDoor, "rotation", "y");
  interactive(fridge, "ตู้เย็น", () => { fridgeA.tgt = fridgeA.tgt ? 0 : -1.7; fridgeGlow.material.emissiveIntensity = fridgeA.tgt ? 1.4 : 0; sfx("pop"); });
  const micro = grp(tileX(5), FLOOR + 1.35, 1.15, interior);
  mesh(rbox(0.6, 0.34, 0.42, 0.03), std(0xe6e6e0, { roughness: 0.4 }), 0, 0.17, 0, micro);
  const microWin = mesh(new THREE.PlaneGeometry(0.36, 0.22), new THREE.MeshStandardMaterial({ color: 0x1b232b, emissive: 0xffc46b, emissiveIntensity: 0, roughness: 0.1 }), -0.06, 0.17, -0.212, micro);
  microWin.rotation.y = Math.PI; dyn(microWin);
  for (let k = 0; k < 3; k++) mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 10), trim, 0.21, 0.25 - k * 0.07, -0.215, micro).rotation.x = Math.PI / 2;
  let microT = 0;
  interactive(micro, "ไมโครเวฟ", () => { if (microT <= 0) { microT = 2.1; sfx("hum"); } });

  // แถว 6: กระติก · กีตาร์ · กระเป๋า · คันเบ็ด
  const cooler = grp(tileX(6), FLOOR, -1.05, interior);
  mesh(rbox(0.7, 0.42, 0.5, 0.05), std(0x3f78c4, { roughness: 0.4 }), 0, 0.21, 0, cooler);
  mesh(box(0.62, 0.02, 0.42), std(0xdff4ff, { emissive: 0xbfe8ff, emissiveIntensity: 0.25 }), 0, 0.41, 0, cooler);
  for (let k = 0; k < 3; k++) mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.12, 12), std([0xf2c94c, 0xd8342c, 0x3fae7a][k], { metalness: 0.6, roughness: 0.3 }), -0.18 + k * 0.18, 0.42, 0, cooler);
  const coolLid = grp(0, 0.42, -0.25, cooler);
  mesh(rbox(0.72, 0.08, 0.52, 0.03), std(0xf6f6f2, { roughness: 0.4 }), 0, 0.04, 0.26, coolLid);
  mesh(box(0.3, 0.04, 0.05), std(0x3f78c4), 0, 0.1, 0.26, coolLid);
  const coolA = anim(coolLid, "rotation", "x");
  interactive(cooler, "กระติกน้ำแข็ง", () => { coolA.tgt = coolA.tgt ? 0 : -1.2; sfx("pop"); });
  const guitar = grp(-3.82, FLOOR, -0.35, interior); guitar.rotation.z = 0.22;
  {
    const wood = std(0xd99a52, { roughness: 0.35 }), dark = std(0x5a3a22, { roughness: 0.5 });
    mesh(new THREE.SphereGeometry(0.24, 24, 16), wood, 0, 0.32, 0, guitar).scale.set(0.35, 1, 1);
    mesh(new THREE.SphereGeometry(0.18, 24, 16), wood, 0, 0.62, 0, guitar).scale.set(0.35, 1, 1);
    mesh(new THREE.CircleGeometry(0.06, 20), trim, 0.09, 0.55, 0, guitar).rotation.y = Math.PI / 2;
    mesh(box(0.05, 0.62, 0.07), dark, 0.02, 1.05, 0, guitar);
    mesh(box(0.05, 0.16, 0.1), dark, 0.02, 1.42, 0, guitar);
    for (let k = 0; k < 4; k++) mesh(box(0.004, 0.95, 0.004), chrome, 0.05, 0.9, -0.024 + k * 0.016, guitar);
  }
  interactive(guitar, "กีตาร์", () => { guitar.rotation.x = 0.12; sfx("strum"); });
  const lug = grp(tileX(6), FLOOR, 1.05, interior);
  mesh(rbox(0.7, 0.42, 0.5, 0.06), std(0xd2694a, { roughness: 0.5 }), 0, 0.21, 0, lug);
  mesh(rbox(0.55, 0.34, 0.42, 0.06), std(0x6c8f4e, { roughness: 0.5 }), 0.02, 0.59, 0.02, lug).rotation.y = 0.15;
  mesh(box(0.2, 0.04, 0.04), trim, 0, 0.8, 0.02, lug);
  for (let k = 0; k < 2; k++) { const r = mesh(new THREE.CylinderGeometry(0.012, 0.018, 2.3, 8), std(0x2d3b4a), 0, 1.2, 0, grp(-3.9 + k * 0.08, FLOOR, 1.42, interior)); r.rotation.z = 0.12 + k * 0.05; }

  // ผ้าม่าน (กดเปิด/ปิด) — ฝั่งขวาอยู่ใน nearDecor (ซ่อนตอนผ่า)
  const nearDecor = grp();
  const curtainTex = tex(64, 64, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#f6efe0" : "#e8a24a"; g.fillRect(i * 8, 0, 8, 64); } });
  curtainTex.wrapS = THREE.RepeatWrapping; curtainTex.repeat.set(3, 1);
  const curtainMat = new THREE.MeshStandardMaterial({ map: curtainTex, roughness: 1, side: THREE.DoubleSide });
  for (const side of [-1, 1]) for (const wi of [1, 2, 3]) {
    const w = WINDOWS[wi], x0 = w[0][0], x1 = w[1][0], z = side * (HW - T - 0.03), parent = side < 0 ? upper : nearDecor;
    const cg = grp(0, 0, 0, parent);
    mesh(new THREE.CylinderGeometry(0.012, 0.012, x1 - x0 + 0.1, 8), chrome, (x0 + x1) / 2, 3.16, z, cg).rotation.z = Math.PI / 2;
    const halves = [];
    for (const [edge, dir] of [[x0, 1], [x1, -1]]) {
      const piv = grp(edge, 0, z, cg);
      const g = new THREE.BoxGeometry((x1 - x0) / 2, 1.12, 0.015); g.translate(dir * (x1 - x0) / 4, 2.58, 0);
      mesh(g, curtainMat, 0, 0, 0, piv);
      piv.scale.x = 0.18; const a = anim(piv, "scale", "x"); a.tgt = 0.18; halves.push(a);
    }
    interactive(cg, "ผ้าม่าน", () => { halves.forEach((a) => (a.tgt = a.tgt > 0.5 ? 0.18 : 1)); sfx("swish"); });
  }

  // ไฟประดับในรถ (สวิตช์ไฟ)
  const bulbMats = [0xff6b6b, 0xffd27a, 0x7dffcf, 0x8fb8ff, 0xf2a1e8].map((c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.05, roughness: 0.3 }));
  {
    const pts = []; for (let k = 0; k <= 30; k++) { const x = 2.3 - k * (6.2 / 30); pts.push(new THREE.Vector3(x, 3.22 - Math.abs(Math.sin(k / 30 * Math.PI * 5)) * 0.1, -HW + T + 0.06)); }
    const curve = new THREE.CatmullRomCurve3(pts);
    mesh(new THREE.TubeGeometry(curve, 120, 0.006, 5), trim, 0, 0, 0, upper).castShadow = false;
    for (let k = 0; k <= 18; k++) { const p = curve.getPoint(k / 18); mesh(new THREE.SphereGeometry(0.03, 10, 8), bulbMats[k % 5], p.x, p.y - 0.035, p.z, upper).castShadow = false; }
  }
  // แสงในห้อง: มีไฟจริงแค่ดวงเดียว (กลางคืน/เปิดสวิตช์) — ดวงอื่นใช้วัสดุเรืองแสงแทน (ไม่เพิ่มต้นทุนทุกพิกเซล)
  const cabinLight = new THREE.PointLight(0xffd59a, 0, 8, 1.4); cabinLight.position.set(-0.5, 2.9, 0); body.add(cabinLight);
  let night = false;
  function applyLights() {
    bulbMats.forEach((m) => (m.emissiveIntensity = lightsOn ? 2.2 : 0.05));
    cabinLight.intensity = lightsOn ? 7 : night ? 3 : 0;
  }

  // คนขับ (ป้ายรูปตัวละครบนฐาน — แบบหมากกระดาน)
  const driverPiece = dyn(grp(tileX(0), FLOOR + 0.52, 1, interior));
  const driverBase = mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.07, 28), std(0xff8a3d, { roughness: 0.4 }), 0, 0.035, 0, driverPiece);
  mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 8), chrome, 0, 0.24, 0, driverPiece);
  const portraitCv = document.createElement("canvas"); portraitCv.width = portraitCv.height = 128;
  const portraitTex = new THREE.CanvasTexture(portraitCv); portraitTex.colorSpace = THREE.SRGBColorSpace; ownedTex.push(portraitTex);
  const driverSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: portraitTex }));
  driverSprite.scale.setScalar(0.62); driverSprite.position.y = 0.72; driverPiece.add(driverSprite);
  driverPiece.visible = false;
  let driverKey = null, driverImg = null;
  function paintPortrait(col, img) {
    const g = portraitCv.getContext("2d");
    g.clearRect(0, 0, 128, 128);
    g.fillStyle = "#22324f"; g.beginPath(); g.arc(64, 64, 61, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.arc(64, 64, 58, 0, TAU); g.clip();
    if (img && img.complete && img.naturalWidth) {
      const s = Math.min(img.naturalWidth, img.naturalHeight);
      g.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) * 0.12, s, s, 6, 6, 116, 116);
    } else {
      const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, col); gr.addColorStop(1, "#22324f"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      g.fillStyle = "#f6e2cc"; g.beginPath(); g.arc(64, 55, 24, 0, TAU); g.fill();
      g.fillStyle = col; g.beginPath(); g.ellipse(64, 125, 45, 35, 0, 0, TAU); g.fill();
    }
    g.restore(); g.strokeStyle = col; g.lineWidth = 6; g.beginPath(); g.arc(64, 64, 58, 0, TAU); g.stroke();
    portraitTex.needsUpdate = true;
  }
  function setDriver(d) {
    const k = d ? `${d.img || ""}|${d.color || ""}` : null;
    if (k === driverKey) return;
    driverKey = k;
    driverPiece.visible = !!d && viewMode !== "drv";
    if (!d) return;
    const col = d.color || "#ff8a3d";
    driverBase.material.color.set(col);
    paintPortrait(col, null);
    if (d.img) {
      const im = new Image(); driverImg = im;
      im.onload = () => { if (driverImg === im) paintPortrait(col, im); };
      im.src = d.img;
    }
  }

  // ---------------------------------------------------------------- กระจกหน้า ล้อ ไฟ กันชน (ทุกมุม)
  const always = grp();
  {
    const a = Math.atan2(1.33, -0.63), nx = 1.33 / 1.47, ny = 0.63 / 1.47;
    const ws = mesh(box(1.38, 0.03, W - 0.3), glass, (3.35 + 2.72) / 2 + nx * 0.07, (1.85 + 3.18) / 2 + ny * 0.07, 0, always);
    ws.rotation.z = a; ws.castShadow = false;
    for (const z of [-0.5, 0.6]) { const wp = mesh(box(0.03, 0.03, 0.8), trim, 3.32, 1.95, z, always); wp.rotation.y = 0.35; }
  }
  const wheels = [];
  const hubMat = cream.clone();
  const tireMat = std(0x1e1f22, { roughness: 0.92 });
  const wwMat = std(0xf4f1ea, { roughness: 0.6 });
  for (const x of [2.6, -2.6]) for (const z of [HW - 0.22, -HW + 0.22]) {
    const g = new THREE.Group(); g.position.set(x, 0.56, z); g.rotation.order = "YZX"; wheelRig.add(g);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.42, lowQ ? 24 : 40), tireMat); tire.rotation.x = Math.PI / 2; g.add(tire);
    for (const s of [-1, 1]) { const tr = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 10, lowQ ? 24 : 40), tireMat); tr.position.z = s * 0.2; g.add(tr); }
    for (const s of [-1, 1]) { const ww = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.06, 10, lowQ ? 24 : 40), wwMat); ww.position.z = s * 0.205; ww.scale.z = 0.35; g.add(ww); }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.44, 32), hubMat); hub.rotation.x = Math.PI / 2; g.add(hub);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 12), chrome); cap.scale.z = 1.25; cap.rotation.x = Math.PI / 2; g.add(cap);
    for (let k = 0; k < 5; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), chrome); const an = k / 5 * TAU; b.position.set(Math.cos(an) * 0.19, Math.sin(an) * 0.19, Math.sign(z) * 0.22); g.add(b); }
    shadowAll(g); wheels.push(g);
  }
  for (const s of [1, -1]) {
    mesh(rbox(0.22, 0.28, W + 0.1, 0.1), chrome, s * 4.2, 0.68, 0, always);
    mesh(rbox(0.04, 0.06, W + 0.12, 0.02), rubber, s * 4.31, 0.7, 0, always);
    for (const z of [-1, 1]) mesh(rbox(0.12, 0.3, 0.12, 0.04), chrome, s * 4.25, 0.84, z * 1.2, always);
  }
  for (const z of [-1.1, 1.1]) mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 20), headMat, 4.32, 0.62, z, always).rotation.z = Math.PI / 2;
  mesh(rbox(0.05, 0.28, 1.2, 0.04), rubber, 4.13, 1.05, 0, always);
  for (let k = 0; k < 4; k++) mesh(rbox(0.06, 0.035, 1.16, 0.015), chrome, 4.15, 0.95 + k * 0.065, 0, always);
  // ทะเบียน (หน้า/หลัง ใช้ภาพเดียว)
  const plateCv = document.createElement("canvas"); plateCv.width = 320; plateCv.height = 112;
  const plateTex = new THREE.CanvasTexture(plateCv); plateTex.colorSpace = THREE.SRGBColorSpace; plateTex.anisotropy = 4; ownedTex.push(plateTex);
  const plateMat = new THREE.MeshStandardMaterial({ roughness: 0.5, map: plateTex });
  let plateText = null;
  function drawPlate(txt) {
    txt = String(txt == null ? "" : txt).slice(0, 9) || " ";
    if (txt === plateText) return;
    plateText = txt;
    const g = plateCv.getContext("2d");
    g.fillStyle = "#fbf8ef"; g.fillRect(0, 0, 320, 112); g.strokeStyle = "#1f2a33"; g.lineWidth = 8; g.strokeRect(5, 5, 310, 102);
    g.fillStyle = "#1f2a33"; let size = 62; g.font = `800 ${size}px ${FONT}`;
    while (g.measureText(txt).width > 290 && size > 24) { size -= 2; g.font = `800 ${size}px ${FONT}`; }
    g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(txt, 160, 60);
    plateTex.needsUpdate = true;
  }
  drawPlate("กข 4567");
  if (document.fonts && document.fonts.load) document.fonts.load(`800 62px ${FONT}`).then(() => { const t = plateText; plateText = null; drawPlate(t); radioSig = ""; drawRadio(lastRadio); }).catch(() => {});
  for (const [x, ry] of [[4.3, Math.PI / 2], [-4.3, -Math.PI / 2]]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.25), plateMat); p.position.set(x, 0.68, 0); p.rotation.y = ry; always.add(p);
  }
  // ไฟหน้า (SpotLight จริงเฉพาะคุณภาพสูง + กลางคืน · ทุกระดับมีลำแสงหลอกบนถนน)
  const headLights = [];
  for (const z of [-1.15, 1.15]) {
    mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 28), headMat, 4.13, 1.25, z, always).rotation.z = Math.PI / 2;
    mesh(new THREE.TorusGeometry(0.2, 0.03, 10, 28), chrome, 4.16, 1.25, z, always).rotation.y = Math.PI / 2;
    if (!lowQ) {
      const sp = new THREE.SpotLight(0xfff0c8, 0, 34, 0.48, 0.5, 1.2); sp.position.set(4.2, 1.25, z);
      sp.target.position.set(16, 0, z); body.add(sp); body.add(sp.target); headLights.push(sp);
    }
  }
  const beamMat = new THREE.MeshBasicMaterial({ map: tex(256, 64, (g) => {
    const gr = g.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, "rgba(255,240,200,.9)"); gr.addColorStop(1, "rgba(255,240,200,0)");
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, 26); g.lineTo(0, 38); g.lineTo(256, 64); g.lineTo(256, 0); g.closePath(); g.fill();
  }), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const beams = dyn(grp(0, 0, 0, van));
  const beamGeo = new THREE.PlaneGeometry(15, 4.6); beamGeo.rotateX(-Math.PI / 2);
  for (const z of [-1.15, 1.15]) { const b = new THREE.Mesh(beamGeo, beamMat); b.position.set(4.4 + 7.5, 0.05, z * 1.3); b.renderOrder = 2; beams.add(b); }
  beams.visible = false;
  for (const z of [-1, 1]) {
    mesh(box(0.06, 0.06, 0.3), trim, 3.25, 2.0, z * (HW + 0.15), always);
    mesh(rbox(0.08, 0.32, 0.22, 0.03), trim, 3.25, 2.12, z * (HW + 0.32), always);
    mesh(box(0.01, 0.26, 0.17), chrome, 3.205, 2.12, z * (HW + 0.32), always);
  }
  // ไนตรัส: เปลวท่อท้าย
  const boostFx = dyn(grp());
  const flameMat = new THREE.MeshBasicMaterial({ color: 0x66d9ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  const flames = [];
  for (const z of [-0.95, 0.95]) { const f = mesh(new THREE.ConeGeometry(0.16, 1, 16), flameMat, -4.9, 0.4, z, boostFx); f.rotation.z = Math.PI / 2; f.castShadow = false; flames.push(f); }
  boostFx.visible = false;

  // ---------------------------------------------------------------- ชิ้นอัปเกรด/ของแต่ง
  const parts = {};
  function part(name, roof, build) { const g = grp(); build(g); shadowAll(g); g.visible = false; parts[name] = { g, roof, on: false }; return g; }
  let turretHead, muzzle;
  part("ป้อมปืน", true, (g) => {
    const m = std(0x4b5563, { metalness: 0.6, roughness: 0.35 });
    mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.25, 28), m, -2.5, 3.6, 0, g);
    turretHead = dyn(grp(-2.5, 3.72, 0, g));
    mesh(rbox(0.9, 0.42, 0.75, 0.08), m, 0.05, 0.2, 0, turretHead);
    mesh(rbox(0.5, 0.3, 0.06, 0.03), m, -0.1, 0.25, 0.42, turretHead);
    for (const z of [0.15, -0.15]) mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.3, 14), trim, 0.95, 0.23, z, turretHead).rotation.z = Math.PI / 2;
    mesh(rbox(0.3, 0.5, 0.12, 0.04), trim, -0.45, 0.05, 0, turretHead);
    muzzle = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(64, 64, (c) => { const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,250,210,1)"); gr.addColorStop(0.4, "rgba(255,170,60,.9)"); gr.addColorStop(1, "rgba(255,90,0,0)"); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); }), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    muzzle.position.set(1.7, 0.23, 0); muzzle.scale.setScalar(0.9); muzzle.visible = false; turretHead.add(muzzle);
  });
  part("กันชนหนาม", false, (g) => {
    mesh(rbox(0.25, 0.5, W + 0.3, 0.06), std(0x8a8f96, { metalness: 0.7, roughness: 0.3 }), 4.4, 0.85, 0, g);
    for (let k = 0; k < 7; k++) mesh(new THREE.ConeGeometry(0.12, 0.45, 14), chrome, 4.72, 0.85, -1.5 + k * 0.5, g).rotation.z = -Math.PI / 2;
  });
  part("ไฟหลังคา", true, (g) => {
    mesh(rbox(0.3, 0.16, 2.8, 0.05), trim, 2.05, 3.58, 0, g);
    for (let k = 0; k < 4; k++) mesh(rbox(0.06, 0.12, 0.5, 0.02), headMat, 2.22, 3.58, -1.05 + k * 0.7, g);
    for (const z of [-1.2, 1.2]) mesh(box(0.08, 0.2, 0.08), trim, 2.05, 3.47, z, g);
  });
  part("ไนตรัส", false, (g) => {
    for (const z of [-0.95, 0.95]) {
      mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.7, 18), chrome, -4.35, 0.4, z, g).rotation.z = Math.PI / 2;
      mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 18), std(0x38e8ff, { emissive: 0x38e8ff, emissiveIntensity: 0.8 }), -4.68, 0.4, z, g).rotation.z = Math.PI / 2;
    }
  });
  part("แร็คหลังคา", true, (g) => {
    for (const z of [-1.4, 1.4]) mesh(box(4.2, 0.08, 0.08), chrome, -1.8, 3.62, z, g);
    for (let k = 0; k < 4; k++) mesh(box(0.08, 0.08, 2.9), chrome, -3.7 + k * 1.25, 3.62, 0, g);
    mesh(rbox(0.8, 0.5, 0.8, 0.08), std(0xc9853e), -3.5, 3.91, -0.85, g);
    mesh(rbox(0.7, 0.42, 0.7, 0.08), std(0x6c8f4e), -3.5, 3.87, 0.85, g);
    mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.8, 18), std(0x3f6fb5), -3.5, 3.88, 0, g).rotation.x = Math.PI / 2;
  });
  let flag;
  part("ธง", true, (g) => {
    mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8), chrome, -3.9, 4.3, 1.45, g);
    flag = dyn(mesh(new THREE.PlaneGeometry(0.9, 0.55, 10, 1), new THREE.MeshStandardMaterial({ color: 0xff8a3d, side: THREE.DoubleSide }), -4.35, 4.9, 1.45, g));
  });
  part("ตุ๊กตาหน้ารถ", false, (g) => {
    const m = std(0xf2a1b5, { roughness: 0.6 });
    mesh(new THREE.SphereGeometry(0.13, 18, 12), m, 3.05, 1.98, 0.55, g);
    mesh(new THREE.SphereGeometry(0.1, 18, 12), m, 3.05, 2.17, 0.55, g);
    for (const z of [-0.06, 0.06]) mesh(new THREE.SphereGeometry(0.04, 8, 8), m, 3.05, 2.26, 0.55 + z, g);
  });

  // ---------------------------------------------------------------- ดาดฟ้า (ขึ้นทางซันรูฟ)
  const roofDeck = grp(0, 0, 0, roofTop); roofDeck.visible = false; dyn(roofDeck);
  const RY = 3.49;
  {
    const rows = 6, tile = (i) => 1.5 - i;
    const ROOF_KIND = [["look", "none", "look"], ["none", "hatch", "none"], ["fire", "none", "rest"], ["none", "rest", "none"], ["none", "gun", "none"], ["store", "store", "store"]];
    const RC = { look: 0x8fd0ff, hatch: 0x9be3b0, fire: 0xff8d8d, rest: 0xffe08a, gun: 0xff5a36, store: 0xd8cbb4, none: 0xf6efe0 };
    const tg = new THREE.PlaneGeometry(0.92, 0.92); tg.rotateX(-Math.PI / 2);
    const rm = new Map();
    for (let i = 0; i < rows; i++) for (let c = -1; c <= 1; c++) {
      const col = RC[ROOF_KIND[i][c + 1]];
      if (!rm.has(col)) rm.set(col, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.38, depthWrite: false }));
      const t = new THREE.Mesh(tg, rm.get(col)); t.position.set(tile(i), RY + 0.005, c); roofDeck.add(t);
    }
    const pts = [];
    for (let i = 0; i <= rows; i++) { const x = 2 - i; pts.push(x, RY + 0.01, -1.5, x, RY + 0.01, 1.5); }
    for (let c = 0; c <= 3; c++) { const z = -1.5 + c; pts.push(2, RY + 0.01, z, 2 - rows, RY + 0.01, z); }
    const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    roofDeck.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x2a2018, transparent: true, opacity: 0.4 })));
    for (const z of [-1, 1]) {
      mesh(new THREE.CylinderGeometry(0.025, 0.025, 6.1, 8), chrome, -1.0, RY + 0.42, z * (HW - 0.06), roofDeck).rotation.z = Math.PI / 2;
      for (let k = 0; k < 7; k++) mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.42, 6), chrome, 2.0 - k, RY + 0.21, z * (HW - 0.06), roofDeck);
    }
  }
  const binoc = grp(1.5, RY, -1, roofDeck);
  for (const a of [0, 2.1, 4.2]) { const l = mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.8, 6), trim, 0, 0.38, 0, binoc); l.rotation.set(0.25 * Math.cos(a), 0, 0.25 * Math.sin(a)); }
  for (const z of [-0.07, 0.07]) mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.26, 14), std(0x2d333b), 0.04, 0.82, z, binoc).rotation.z = Math.PI / 2;
  interactive(binoc, "กล้องส่องทางไกล", () => { sfx("zoom"); onAction("cam", "roof"); });
  const scope = grp(1.5, RY, 1, roofDeck);
  for (const a of [0, 2.1, 4.2]) { const l = mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 6), chrome, 0, 0.33, 0, scope); l.rotation.set(0.25 * Math.cos(a), 0, 0.25 * Math.sin(a)); }
  mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.9, 16), cream, 0.1, 0.85, 0, scope).rotation.z = -1.0;
  interactive(scope, "กล้องดูดาว", () => { sfx("zoom"); onAction("cam", "sky"); });
  const grill = grp(-0.5, RY, -1, roofDeck);
  mesh(new THREE.SphereGeometry(0.3, 20, 10, 0, TAU, Math.PI / 2, Math.PI / 2), std(0x1f2226, { roughness: 0.5 }), 0, 0.62, 0, grill);
  for (const a of [0, 2.1, 4.2]) mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.62, 6), trim, Math.cos(a) * 0.18, 0.31, Math.sin(a) * 0.18, grill);
  const coals = mesh(new THREE.CircleGeometry(0.27, 20), new THREE.MeshStandardMaterial({ color: 0x331a10, emissive: 0xff5a1f, emissiveIntensity: 0 }), 0, 0.6, 0, grill); coals.rotation.x = -Math.PI / 2; dyn(coals);
  for (let k = 0; k < 3; k++) mesh(rbox(0.16, 0.04, 0.07, 0.02), std(0xb5543a), -0.08 + k * 0.08, 0.63, (k - 1) * 0.1, grill);
  const smoke = [];
  const smokeGeo = new THREE.SphereGeometry(0.1, 10, 8);
  for (let k = 0; k < 8; k++) { const sp = new THREE.Mesh(smokeGeo, new THREE.MeshStandardMaterial({ color: 0xdddddd, transparent: true, opacity: 0, depthWrite: false })); sp.userData.k = k / 8; grill.add(dyn(sp)); smoke.push(sp); }
  let grillOn = false;
  interactive(grill, "เตาปิ้งย่าง", () => { grillOn = !grillOn; if (grillOn) sfx("sizzle"); coals.material.emissiveIntensity = grillOn ? 1.6 : 0; });
  const frameMetal = std(0xdfe4e8, { metalness: 0.5, roughness: 0.3 });
  const lounge = grp(-0.5, RY, 1, roofDeck);
  {
    const fab = std(0x3fae7a, { roughness: 0.9, side: THREE.DoubleSide });
    mesh(box(0.7, 0.03, 0.45), fab, 0, 0.3, 0, lounge).rotation.z = -0.12;
    mesh(box(0.55, 0.03, 0.45), fab, -0.45, 0.5, 0, lounge).rotation.z = 0.9;
    for (const z of [-0.23, 0.23]) { mesh(box(0.8, 0.025, 0.025), frameMetal, -0.05, 0.25, z, lounge).rotation.z = -0.15; mesh(box(0.025, 0.3, 0.025), frameMetal, 0.3, 0.15, z, lounge); }
  }
  interactive(lounge, "เก้าอี้อาบแดด", () => sfx("soft"));
  const umb = grp(-1.05, RY, 1.1, roofDeck);
  mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 8), frameMetal, 0, 0.7, 0, umb);
  const canopy = grp(0, 1.4, 0, umb);
  mesh(new THREE.ConeGeometry(0.75, 0.3, 12, 1, true), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8, map: tex(128, 16, (g) => { for (let k = 0; k < 12; k++) { g.fillStyle = k % 2 ? "#ff8a3d" : "#fff6e0"; g.fillRect(k * 128 / 12, 0, 128 / 12 + 1, 16); } }) }), 0, 0, 0, canopy);
  const canopyA = anim(canopy, "scale", "x"), canopyB = anim(canopy, "scale", "z");
  interactive(umb, "ร่ม", () => { const v = canopyA.tgt > 0.5 ? 0.15 : 1; canopyA.tgt = canopyB.tgt = v; sfx("swish"); });
  mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshStandardMaterial({ map: tex(64, 64, (g) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? "#d9534f" : "#fff6e0"; g.fillRect(i * 8, j * 8, 8, 8); } }), roughness: 1 }), -1.5, RY + 0.008, 0, roofDeck).rotation.x = -Math.PI / 2;
  let turretFire = 0, turretAim = 0;
  interactive(parts["ป้อมปืน"].g, "ป้อมปืน", () => { turretAim = (Math.random() - 0.5) * 1.6; turretFire = 0.5; sfx("gun"); });
  let roofMode = false;
  function setRoof(on) { on = !!on; if (on === roofMode) return; roofMode = on; applyView(); }

  // ---------------------------------------------------------------- ของแต่งเพิ่ม
  const balloons = [], decoBulbs = [];
  function sideDecal(name, draw, x, y, w, h) {
    part(name, false, (g) => {
      const t = tex(512, Math.round(512 * h / w), draw);
      const m = new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
      for (const side of [-1, 1]) { const p = mesh(new THREE.PlaneGeometry(w, h), m, x, y, side * (HW + 0.017), g); if (side < 0) p.rotation.y = Math.PI; p.castShadow = false; }
    });
  }
  sideDecal("ลายไฟ", (g, w, h) => {
    for (let k = 0; k < 7; k++) {
      const y0 = h * (0.15 + k * 0.11), len = w * (0.55 + Math.sin(k * 1.7) * 0.25);
      const gr = g.createLinearGradient(w, 0, w - len, 0); gr.addColorStop(0, "#ffe066"); gr.addColorStop(0.45, "#ff8a1f"); gr.addColorStop(1, "rgba(220,40,20,0)");
      g.fillStyle = gr; g.beginPath(); g.moveTo(w, y0 - h * 0.09); g.quadraticCurveTo(w - len * 0.5, y0 - h * 0.16, w - len, y0); g.quadraticCurveTo(w - len * 0.45, y0 + h * 0.05, w, y0 + h * 0.09); g.fill();
    }
  }, 1.7, 1.12, 2.8, 0.85);
  sideDecal("ลายดอกไม้", (g, w, h) => {
    const cs = ["#ff6fa8", "#ffd23f", "#ffffff", "#ff8a3d", "#a26bff"];
    for (let k = 0; k < 9; k++) {
      const x = w * (0.08 + k * 0.105), y = h * (0.5 + Math.sin(k * 2.3) * 0.22), r = h * (0.16 + (k % 3) * 0.05);
      g.fillStyle = cs[k % 5]; for (let p = 0; p < 6; p++) { const a = p / 6 * TAU; g.beginPath(); g.ellipse(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.45, r * 0.3, a, 0, TAU); g.fill(); }
      g.fillStyle = "#ffcf33"; g.beginPath(); g.arc(x, y, r * 0.3, 0, TAU); g.fill();
    }
  }, -1.6, 1.12, 2.6, 0.8);
  {
    const g = grp(0, 0, 0, doorPivots[0]);
    const sm = mesh(new THREE.CircleGeometry(0.2, 32), new THREE.MeshStandardMaterial({ map: tex(128, 128, (c) => { c.fillStyle = "#ffd23f"; c.beginPath(); c.arc(64, 64, 62, 0, TAU); c.fill(); c.fillStyle = "#1f2a33"; c.beginPath(); c.arc(44, 50, 9, 0, TAU); c.arc(84, 50, 9, 0, TAU); c.fill(); c.lineWidth = 9; c.strokeStyle = "#1f2a33"; c.beginPath(); c.arc(64, 66, 34, 0.2, Math.PI - 0.2); c.stroke(); }), roughness: 0.4 }), -T / 2 - 0.012, 1.4, 1.25, g);
    sm.rotation.y = -Math.PI / 2; sm.castShadow = false; g.visible = false; parts["หน้ายิ้ม"] = { g, roof: false, on: false };
  }
  part("ขนตา", false, (g) => {
    for (const z of [-1.15, 1.15]) {
      const arc = mesh(new THREE.TorusGeometry(0.24, 0.025, 6, 20, Math.PI), trim, 4.15, 1.27, z, g); arc.rotation.y = Math.PI / 2;
      for (let k = 0; k < 6; k++) { const a = 0.35 + k / 5 * (Math.PI - 0.7); const l = mesh(box(0.02, 0.12, 0.02), trim, 4.16, 1.27 + Math.sin(a) * 0.3, z + Math.cos(a) * 0.3, g); l.rotation.x = -Math.cos(a) * 0.9; }
    }
  });
  part("หูแมว", true, (g) => {
    for (const z of [-0.85, 0.85]) {
      const e = mesh(new THREE.ConeGeometry(0.32, 0.55, 4), paint, 1.9, RY + 0.27, z, g); e.rotation.y = Math.PI / 4; e.scale.x = 0.45;
      const i = mesh(new THREE.ConeGeometry(0.2, 0.36, 4), std(0xf2a1b5), 2.0, RY + 0.22, z, g); i.rotation.y = Math.PI / 4; i.scale.x = 0.3;
    }
  });
  part("เขากวาง", true, (g) => {
    const m = std(0x8a5a32, { roughness: 0.8 });
    for (const z of [-0.8, 0.8]) {
      const s = Math.sign(z);
      mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.8, 8), m, 1.9, RY + 0.4, z, g).rotation.x = -s * 0.35;
      for (const [h, a] of [[0.35, 0.9], [0.55, -0.7], [0.7, 0.6]]) { const b = mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.38, 6), m, 1.9 + a * 0.12, RY + h + 0.12, z + s * h * 0.35, g); b.rotation.set(-s * 0.9, 0, a); }
    }
  });
  part("ครีบฉลาม", true, (g) => {
    const sh = new THREE.Shape(); sh.moveTo(-0.6, 0); sh.quadraticCurveTo(-0.1, 0.4, 0.15, 0.9); sh.quadraticCurveTo(0.1, 0.35, 0.45, 0); sh.closePath();
    const fg = new THREE.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 3 }); fg.translate(0, 0, -0.04);
    mesh(fg, std(0x6d8199, { roughness: 0.4 }), -1.0, RY, 0, g).rotation.y = Math.PI;
  });
  part("ล้อแม็กทอง", false, () => {});
  parts["ล้อแม็กทอง"].fx = (on) => { hubMat.color.setHex(on ? 0xe0b04a : 0xf6efe0); hubMat.metalness = on ? 0.9 : 0; hubMat.roughness = on ? 0.25 : 0.4; };
  part("ท่อคู่", false, (g) => {
    for (const z of [-1, 1]) {
      mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.9, 16), chrome, -3.98, 2.05, z * (HW + 0.12), g);
      mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.25, 16), chrome, -3.98, 3.55, z * (HW + 0.12), g);
      for (const y of [1.2, 2.6]) mesh(box(0.06, 0.06, 0.14), trim, -3.98, y, z * (HW + 0.06), g);
    }
  });
  // ไฟใต้ท้อง + เรืองใต้ท้องทรงเท่: แสงจริงไม่ใช้ (แผ่นเรืองบนถนนอย่างเดียว — ถูกกว่าและสวยพอ)
  const underMat = new THREE.MeshBasicMaterial({ color: 0xc86bff, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, map: tex(128, 64, (g) => {
    const gr = g.createRadialGradient(64, 32, 4, 64, 32, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 64);
  }) });
  {
    const g = dyn(grp(0, 0.04, 0, van));
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(9, W + 1.6), underMat); pl.rotation.x = -Math.PI / 2; g.add(pl);
    g.visible = false; parts["ไฟใต้ท้อง"] = { g, roof: false, on: false };
  }
  part("ป้ายหลังคา", true, (g) => {
    const t = tex(512, 128, (c) => { const gr = c.createLinearGradient(0, 0, 512, 0); gr.addColorStop(0, "#ff8a3d"); gr.addColorStop(1, "#a26bff"); c.fillStyle = gr; c.fillRect(0, 0, 512, 128); c.fillStyle = "#fff"; c.font = "800 78px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("ROAD TRIP", 256, 68); });
    const m = new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.2 }); decoBulbs.push(m);
    mesh(rbox(0.22, 0.42, 1.5, 0.05), cream, 1.25, RY + 0.32, 0, g);
    for (const s of [1, -1]) { const p = mesh(new THREE.PlaneGeometry(1.42, 0.36), m, 1.25 + s * 0.115, RY + 0.32, 0, g); p.rotation.y = s * Math.PI / 2; p.castShadow = false; }
    for (const z of [-0.5, 0.5]) mesh(box(0.06, 0.12, 0.06), trim, 1.25, RY + 0.06, z, g);
  });
  part("ลูกโป่ง", false, (g) => {
    const cols = [0xff5a6e, 0xffd23f, 0x5aa0e0];
    cols.forEach((c, i) => {
      const b = dyn(grp(3.25 - i * 0.18, 2.95 + i * 0.2, HW + 0.4 + (i - 1) * 0.18, g)); b.userData.x = b.position.x; b.userData.y = b.position.y;
      mesh(new THREE.SphereGeometry(0.2, 20, 16), std(c, { roughness: 0.25 }), 0, 0, 0, b).scale.y = 1.2;
      const str = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -0.24, 0), new THREE.Vector3(3.25 - b.position.x, 2.12 - b.position.y, HW + 0.32 - b.position.z)]), new THREE.LineBasicMaterial({ color: 0xffffff }));
      b.add(str); balloons.push(b);
    });
  });
  part("ไฟประดับนอก", true, (g) => {
    const cols = [0xff6b6b, 0xffd27a, 0x7dffcf, 0x8fb8ff, 0xf2a1e8].map((c) => { const m = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.25 }); decoBulbs.push(m); return m; });
    const bg = new THREE.SphereGeometry(0.04, 8, 6);
    for (const z of [-1, 1]) for (let k = 0; k < 20; k++) { const x = 2.2 - k * 0.32; mesh(bg, cols[k % 5], x, 3.33 - Math.abs(Math.sin(k * 0.8)) * 0.05, z * (HW + 0.04), g).castShadow = false; }
  });
  part("เซิร์ฟบอร์ด", true, (g) => {
    const b = mesh(new THREE.SphereGeometry(1, 32, 12), std(0x3fc1c9, { roughness: 0.3 }), -1.2, RY + 0.12, -0.95, g); b.scale.set(1.5, 0.05, 0.28); b.rotation.y = 0.05;
    mesh(box(2.4, 0.012, 0.05), std(0xffffff), -1.2, RY + 0.17, -0.95, g);
  });
  part("กันชนกันวัว", false, (g) => {
    for (const z of [-0.95, 0.95]) { const t = mesh(new THREE.TorusGeometry(0.42, 0.05, 10, 24, Math.PI), chrome, 4.48, 0.95, z, g); t.rotation.y = Math.PI / 2; mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.55, 10), chrome, 4.38, 0.62, z * 1.45, g).rotation.z = Math.PI / 2; }
    mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.9, 12), chrome, 4.48, 1.37, 0, g).rotation.x = Math.PI / 2;
    mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.9, 12), chrome, 4.48, 0.75, 0, g).rotation.x = Math.PI / 2;
  });
  part("บังแดดกระจกหน้า", false, (g) => {
    const t = tex(512, 64, (c) => { const gr = c.createLinearGradient(0, 0, 512, 0); gr.addColorStop(0, "#2d6be0"); gr.addColorStop(0.5, "#a26bff"); gr.addColorStop(1, "#ff5a6e"); c.fillStyle = gr; c.fillRect(0, 0, 512, 64); c.fillStyle = "#fff"; c.font = "800 40px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("★ ROAD TRIP ★", 256, 34); });
    t.center.set(0.5, 0.5); t.rotation = -Math.PI / 2;
    const a = Math.atan2(1.33, -0.63), nx = 1.33 / 1.47, ny = 0.63 / 1.47;
    const st = mesh(box(0.3, 0.01, W - 0.4), new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 }), 2.82 + nx * 0.1, 2.98 + ny * 0.1, 0, g);
    st.rotation.z = a; st.castShadow = false;
  });

  // ---------------------------------------------------------------- อัปเกรด (เห็นบนตัวรถตามขั้น)
  const upg = { body: 0, engine: 0, tank: 0, susp: 0, nitro: 0, turret: 0, bumper: 0, storage: 0 };
  const upgVis = { armor: [null, grp(), grp(), grp()], engine: [null, grp(), grp(), grp()], fuel: [null, grp(), grp(), grp()] };
  const steel = std(0x5d6670, { metalness: 0.7, roughness: 0.45 }), rivet = std(0xaab3bc, { metalness: 0.8, roughness: 0.3 });
  const rivetGeo = new THREE.SphereGeometry(0.025, 8, 6);
  for (const side of [-1, 1]) {
    const z = side * (HW + 0.04);
    for (const [x0, x1] of [[-1.75, 1.75], [3.4, 3.95], [-3.95, -3.4]]) {
      mesh(rbox(x1 - x0, 0.5, 0.05, 0.02), steel, (x0 + x1) / 2, 1.15, z, upgVis.armor[1]);
      for (let x = x0 + 0.12; x < x1 - 0.05; x += 0.35) for (const y of [0.95, 1.35]) mesh(rivetGeo, rivet, x, y, z + side * 0.03, upgVis.armor[1]);
    }
    for (const wi of [1, 2, 3]) { const w = WINDOWS[wi]; for (let x = w[0][0] + 0.15; x < w[1][0]; x += 0.28) mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.05, 8), steel, x, 2.575, side * (HW + 0.05), upgVis.armor[2]); for (const y of [2.1, 3.05]) mesh(box(w[1][0] - w[0][0], 0.04, 0.04), steel, (w[0][0] + w[1][0]) / 2, y, side * (HW + 0.05), upgVis.armor[2]); }
  }
  mesh(rbox(0.08, 0.55, 2.4, 0.03), steel, 4.24, 1.1, 0, upgVis.armor[3]);
  for (let k = 0; k < 4; k++) mesh(box(0.09, 0.05, 2.0), trim, 4.25, 0.95 + k * 0.1, 0, upgVis.armor[3]);
  for (const z of [-1, 1]) mesh(rbox(0.5, 0.42, 0.06, 0.02), steel, -4.18, 1.15, z * 1.2, upgVis.armor[3]);
  mesh(rbox(0.55, 0.12, 0.65, 0.04), chrome, 3.76, 1.85, 0, upgVis.engine[1]);
  mesh(box(0.06, 0.08, 0.5), trim, 4.04, 1.85, 0, upgVis.engine[1]);
  for (const z of [-1, 1]) mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.5, 12), chrome, -0.5, 0.35, z * (HW + 0.06), upgVis.engine[2]).rotation.z = Math.PI / 2;
  { const bl = grp(3.65, 1.95, 0, upgVis.engine[3]); mesh(rbox(0.5, 0.32, 0.55, 0.05), chrome, 0, 0, 0, bl); for (const z of [-0.12, 0.12]) { mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.3, 14), chrome, 0.05, 0.3, z, bl); mesh(new THREE.TorusGeometry(0.08, 0.015, 6, 16), trim, 0.05, 0.45, z, bl).rotation.x = Math.PI / 2; } mesh(box(0.04, 0.4, 0.5), trim, 0.27, -0.05, 0, bl); }
  function jerry(x, z, side, parent, col) { const j = grp(x, 1.45, z, parent); mesh(rbox(0.32, 0.46, 0.14, 0.04), std(col, { roughness: 0.4 }), 0, 0, 0, j); mesh(box(0.2, 0.05, 0.05), trim, 0, 0.26, 0, j); mesh(box(0.28, 0.04, 0.02), trim, 0, -0.08, side * 0.075, j); }
  jerry(-3.75, -(HW + 0.1), -1, upgVis.fuel[1], 0xd9534f);
  jerry(-3.75, HW + 0.1, 1, upgVis.fuel[2], 0x3fae7a);
  mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.5, 18), chrome, 0.4, 0.45, HW + 0.08, upgVis.fuel[3]).rotation.z = Math.PI / 2;
  const cargoPod = dyn(mesh(rbox(0.85, 0.38, 1, 0.15), std(0x2d333b, { roughness: 0.4 }), -3.45, RY + 0.22, 0, roofTop));
  for (const k of ["armor", "engine", "fuel"]) for (let i = 1; i <= 3; i++) dyn(upgVis[k][i]).visible = false;

  // ---------------------------------------------------------------- ทรง 3 แบบ
  const goofy = grp(), goofyRoof = dyn(grp(0, 0, 0, goofy));
  const pupils = [];
  {
    const eyeW = std(0xffffff, { roughness: 0.2 }), eyeB = std(0x111111, { roughness: 0.1 });
    for (const z of [-0.78, 0.78]) {
      mesh(new THREE.SphereGeometry(0.4, 32, 24), eyeW, 3.62, 2.12, z, goofy);
      const p = dyn(mesh(new THREE.SphereGeometry(0.17, 24, 16), eyeB, 3.98, 2.12, z, goofy)); p.userData.y = 2.12; p.userData.z = z; pupils.push(p);
      mesh(new THREE.SphereGeometry(0.05, 10, 8), eyeW, 4.12, 2.2, z + 0.05, goofy);
      mesh(new THREE.SphereGeometry(0.42, 32, 12, 0, TAU, 0, Math.PI * 0.32), paint, 3.62, 2.12, z, goofy).rotation.z = -0.5;
    }
    const gg = new THREE.TorusGeometry(0.34, 0.06, 12, 32, Math.PI); gg.rotateZ(Math.PI);
    mesh(gg, trim, 4.22, 1.2, 0, goofy).rotation.y = Math.PI / 2;
    mesh(new THREE.SphereGeometry(0.13, 16, 10, 0, TAU, 0, Math.PI / 2), std(0xf2708a), 4.2, 0.88, 0.12, goofy).rotation.z = Math.PI;
    mesh(new THREE.SphereGeometry(1.25, 40, 16, 0, TAU, 0, Math.PI / 2), cream, -1.4, 3.42, 0, goofyRoof).scale.set(1.7, 0.55, 1.15);
    for (const x of [-2.4, -1.4, -0.4]) { const w = mesh(new THREE.CircleGeometry(0.28, 24), glass, x, 3.85, 1.2, goofyRoof); w.lookAt(x, 3.85, 9); }
  }
  const antenna = dyn(grp(1.6, 3.45, 1.2, goofyRoof));
  mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.3), trim, 0, 0.65, 0, antenna);
  mesh(new THREE.SphereGeometry(0.13, 16, 12), std(0xff8a3d), 0, 1.33, 0, antenna);
  const cool = grp(), coolRoof = dyn(grp(0, 0, 0, cool));
  const stripe = std(0x15171a, { roughness: 0.45 });
  const coolUnderMat = new THREE.MeshBasicMaterial({ color: 0x38e8ff, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, map: underMat.map });
  let coolUnder;
  {
    mesh(rbox(0.7, 0.07, W + 0.3, 0.03), stripe, -3.85, 3.85, 0, coolRoof);
    for (const z of [-1.1, 1.1]) mesh(box(0.12, 0.38, 0.08), stripe, -3.75, 3.62, z, coolRoof);
    for (const z of [-1, 1]) { mesh(box(0.08, 0.3, 0.7), stripe, -3.85, 3.95, z * (HW + 0.15), coolRoof); mesh(rbox(6.4, 0.2, 0.12, 0.04), stripe, -0.25, 0.47, z * (HW + 0.04), cool); }
    mesh(rbox(0.45, 0.05, W + 0.3, 0.02), stripe, 4.3, 0.5, 0, cool);
    mesh(rbox(0.6, 0.16, 0.7, 0.05), stripe, 3.78, 1.84, 0, cool);
    for (const z of [-0.32, 0.32]) { mesh(box(6.3, 0.012, 0.32), stripe, -0.72, 3.485, z, coolRoof); mesh(box(0.7, 0.012, 0.32), stripe, 3.75, 1.775, z, cool); }
    coolUnder = dyn(new THREE.Mesh(new THREE.PlaneGeometry(8.6, W + 1.4), coolUnderMat)); coolUnder.rotation.x = -Math.PI / 2; coolUnder.position.y = 0.05; van.add(coolUnder);
  }
  const STYLES = {
    normal: { s: [1, 1, 1], bottom: 0.5, wr: 1, ww: 1 },
    goofy: { s: [0.86, 1.2, 1], bottom: 0.98, wr: 1.45, ww: 1.35 },
    cool: { s: [1.05, 0.84, 1.1], bottom: 0.4, wr: 1.02, ww: 1.3 },
  };
  let viewMode = "out";
  const baseY = () => { const S = STYLES[styleKey]; return S.bottom - 0.5 * S.s[1] + 0.05 * upg.susp; };
  const bodyScale = () => { const S = STYLES[styleKey]; return viewMode === "board" ? [1, S.s[1], 1] : S.s; }; // กระดาน: ช่องในรถต้องตรงช่องกระดาน (ไม่ยืด/หดตามทรง)
  function applyStyle() {
    const S = STYLES[styleKey], bs = bodyScale();
    body.scale.set(bs[0], bs[1], bs[2]); body.position.y = baseY();
    wheels.forEach((w) => {
      const sx = Math.sign(w.position.x), sz = Math.sign(w.position.z);
      const L = upg.susp, wr = S.wr * (1 + 0.05 * L), ww = S.ww * (1 + 0.12 * L);
      w.scale.set(wr, wr, ww); w.position.set(sx * 2.6 * bs[0], 0.56 * wr, sz * ((HW - 0.22) * bs[2] + (ww - 1) * 0.12));
    });
    goofy.visible = styleKey === "goofy"; cool.visible = styleKey === "cool";
    glass.color.setHex(styleKey === "cool" ? 0x0b0f14 : 0x29445a); glass.userData.base = styleKey === "cool" ? 0.8 : 0.38;
    glass.opacity = viewMode === "drv" ? 0.1 : glass.userData.base;
    applyNight();
  }
  // มุมมอง: out = นอกรถ · cut = ผ่าข้างขวา+หลังคา (ดูห้องใน) · drv = จากในรถ (กระจกใส) · board = กระดานต่อสู้ (เปิดหลังคา ผนังเตี้ยทั้งสองข้าง)
  function applyView() {
    const m = viewMode, cut = m === "cut" || m === "board", board = m === "board";
    shellRightFull.visible = exR.visible = !cut;
    shellLeft.visible = exL.visible = !board;
    shellLeftLow.visible = board;
    shellRoof.visible = exTop.visible = !cut;
    shellRightLow.visible = cut;
    roofTop.visible = goofyRoof.visible = coolRoof.visible = nearDecor.visible = !cut;
    roofDeck.visible = roofMode && !cut;
    for (const k in parts) parts[k].g.visible = parts[k].on && !(parts[k].roof && cut);
    gridGroup.visible = m === "cut";
    upper.visible = !board; rearDoors.scale.y = board ? 0.4 : 1; // กระดาน: ผนังเตี้ย — ซ่อนของสูง · ประตูท้ายเตี้ยลง (ยังเห็นเปิด/ปิด)
    driverPiece.visible = !!driverKey && m !== "drv";
    glass.opacity = m === "drv" ? 0.1 : glass.userData.base;
  }
  function setView(m) { if (m === viewMode) return; const was = viewMode; viewMode = m; if ((was === "board") !== (m === "board")) applyStyle(); applyView(); }

  // ---------------------------------------------------------------- สถานะจาก server (state.roadtrip.van)
  let stateSig = "";
  function setState(v) {
    if (!v) return;
    const sk = VAN_STYLES.includes(v.style) ? v.style : "normal";
    const u = v.upg || {};
    const decor = Array.isArray(v.decor) ? v.decor : [];
    const sig = `${sk}|${v.paint || ""}|${v.plate || ""}|${decor.join(",")}|${UPG_KEYS.map((k) => +u[k] || 0).join("")}`;
    if (sig !== stateSig) {
      stateSig = sig;
      styleKey = sk;
      for (const k of UPG_KEYS) upg[k] = Math.max(0, Math.min(3, +u[k] || 0));
      if (typeof v.paint === "string" && /^#?[0-9a-f]{6}$/i.test(v.paint)) { const c = new THREE.Color(v.paint.startsWith("#") ? v.paint : "#" + v.paint); paintMats.forEach((m) => m.color.copy(c)); }
      drawPlate(v.plate || " ");
      for (const n of DECOR) {
        const p = parts[n]; if (!p) continue;
        const on = decor.includes(n);
        if (p.on !== on) { p.on = on; if (p.fx) p.fx(on); }
      }
      // อัปเกรด → ชิ้นบนตัวรถ
      parts["ป้อมปืน"].on = upg.turret > 0; if (turretHead) turretHead.scale.setScalar(0.8 + 0.12 * upg.turret);
      const sp = parts["กันชนหนาม"].g; parts["กันชนหนาม"].on = upg.bumper > 0; sp.scale.set(1, 0.8 + 0.12 * upg.bumper, 1); sp.position.y = (1 - sp.scale.y) * 0.85;
      parts["ไนตรัส"].on = upg.nitro > 0;
      for (let i = 1; i <= 3; i++) { upgVis.armor[i].visible = upg.body >= i; upgVis.engine[i].visible = upg.engine >= i; upgVis.fuel[i].visible = upg.tank >= i; }
      cargoPod.visible = upg.storage > 0; cargoPod.scale.z = [1, 1.0, 1.7, 2.5][upg.storage];
      applyStyle(); applyView();
    }
    setRear(!!v.rearOpen);
  }

  // ---------------------------------------------------------------- กลางวัน/กลางคืน
  function applyNight() {
    headLights.forEach((l) => { l.visible = night; l.intensity = night ? 70 : 0; });
    beamMat.opacity = night ? 0.22 : 0; beams.visible = night;
    headMat.emissiveIntensity = night ? 2.6 : 0.15;
    tailMats.forEach((m, i) => (m.emissiveIntensity = night ? 1.8 : i ? 0.2 : 0.1));
    decoBulbs.forEach((m) => (m.emissiveIntensity = night ? 2 : 0.25));
    underMat.opacity = night ? 0.6 : 0.18;
    coolUnder.visible = styleKey === "cool"; coolUnderMat.opacity = night ? 0.6 : 0.12;
    applyLights();
  }
  function setNight(on) { on = !!on; if (on === night) return; night = on; applyNight(); }

  // ---------------------------------------------------------------- รวมชิ้นนิ่ง (หลังสร้างครบ)
  // วัสดุที่ค่าเปลี่ยนระหว่างเล่น = ห้ามรวมกับวัสดุหน้าตาเหมือนกัน (solo)
  for (const m of [...paintMats, hubMat, glass, headMat, ...tailMats, ...bulbMats, ...decoBulbs]) m.userData.solo = true;
  for (const r of [shellLeft, shellLeftLow, shellRightFull, shellRightLow, shellNose, shellRoof, exL, exR, exTop, exFront, interior, upper, always, goofy, goofyRoof, cool, coolRoof, roofTop, roofDeck, nearDecor, ...doorPivots, ...wheels])
    mergeStatic(r);
  for (const k in parts) if (!interactives.includes(parts[k].g)) mergeStatic(parts[k].g);
  for (const k of ["armor", "engine", "fuel"]) for (let i = 1; i <= 3; i++) mergeStatic(upgVis[k][i]);
  // ของที่กดได้: รวมชิ้นย่อยที่ไม่ขยับ (ไฮไลต์ตอนชี้ยังทำงาน — วัสดุโคลนแล้วก่อนรวม · ชิ้นที่ขยับติดธง dyn ไว้แล้ว)
  for (const r of interactives) if (r !== rearDoors) mergeStatic(r);
  for (const r of [gloveIn, lug, speedo, bench]) mergeStatic(r);
  // ไฮไลต์ตอนชี้: เก็บ emissive เดิมของ mesh หลังรวม
  for (const g of interactives) g.traverse((m) => { if (m.isMesh && m.material.emissive && !m.userData.baseEm) m.userData.baseEm = m.material.emissive.clone(); if (m.isMesh) m.userData.owner = g; });

  // ของในห้องไม่ต้องทอดเงา (อยู่ในเงาตัวรถอยู่แล้ว) — ลด draw call ของรอบวาดเงาเกือบครึ่ง · ยังรับเงาได้
  interior.traverse((m) => { if (m.isMesh) m.castShadow = false; });
  styleKey = "normal"; applyStyle(); applyView(); applyNight();

  // ---------------------------------------------------------------- เลือกของในรถ (raycast)
  const isShown = (o) => { while (o) { if (!o.visible) return false; o = o.parent; } return true; };
  const _hits = [];
  function pick(raycaster) {
    _hits.length = 0;
    raycaster.intersectObject(van, true, _hits);
    for (const h of _hits) {
      const o = h.object;
      if (o.isSprite || !o.isMesh || !isShown(o)) continue;
      if (o.material.transparent && o.material.opacity < 0.6 && !o.userData.owner) continue;
      let p = o; while (p && !p.userData.act) p = p.parent;
      if (!p) return null;
      return { name: p.userData.iname, group: p, run: () => p.userData.act() };
    }
    return null;
  }
  let hovered = null;
  const HL = new THREE.Color(0x6a4210);
  function hover(hit) {
    const g = hit ? hit.group : null;
    if (g === hovered) return;
    const set = (grp, on) => grp && grp.traverse((m) => { if (m.isMesh && m.userData.baseEm && m.material.emissive) m.material.emissive.copy(on ? HL : m.userData.baseEm); });
    set(hovered, false); hovered = g; set(hovered, true);
  }

  // ---------------------------------------------------------------- tick (ทุกเฟรม — ไม่สร้างอ็อบเจกต์ใหม่)
  let shake = 0, beatPulse = 0;
  function bump(s) { shake = Math.max(shake, s); }
  function fireTurret(yaw = (Math.random() - 0.5) * 1.6, sound = true) { if (!parts["ป้อมปืน"].on) return; turretAim = yaw; turretFire = 0.5; if (sound) sfx("gun"); }
  // ctx: { speed (หน่วย/วิ), roll, pitch, steer (เลี้ยว −1..1), beat (0..1), boost, moving (ล้อหมุน) }
  function tick(dt, t, ctx = {}) {
    const speed = ctx.speed || 0, roll = ctx.roll || 0, pitch = ctx.pitch || 0, steerV = ctx.steer || 0;
    const driving = speed > 0.5;
    beatPulse = ctx.beat || 0;
    const S = STYLES[styleKey], bs = bodyScale();
    body.position.y = baseY() + (driving ? Math.sin(t * 13) * 0.008 * speed / 20 : 0);
    body.rotation.x = roll; body.rotation.z = pitch;
    if (styleKey === "goofy") {
      const k = Math.sin(t * (driving ? 11 : 3)) * (driving ? 0.045 : 0.015);
      body.scale.set(bs[0] * (1 - k * 0.5), S.s[1] * (1 + k), bs[2] * (1 - k * 0.5));
      for (let i = 0; i < pupils.length; i++) { const p = pupils[i]; p.position.y = p.userData.y + Math.sin(t * 6 + i * 2) * 0.07; p.position.z = p.userData.z + Math.cos(t * 4.3 + i) * 0.07; }
      antenna.rotation.x = Math.sin(t * (driving ? 12 : 5)) * 0.32; antenna.rotation.z = Math.cos(t * 4) * 0.12;
    }
    for (let i = 0; i < wheels.length; i++) { const w = wheels[i]; w.rotation.z -= speed * dt / (0.56 * w.scale.x); if (w.position.x > 0) w.rotation.y = -steerV * 0.35; }
    steer.rotation.x = steerV * 2.2;
    needle.rotation.z = -(Math.PI * 0.75 + Math.min(speed * 4, 180) / 180 * Math.PI * 1.5) + Math.PI;
    gearA.tgt = driverKey ? 0.35 : 0;
    // ของในห้อง
    bobKick = Math.max(0, bobKick - dt * 0.8);
    bobHead.rotation.z = Math.sin(t * 14) * 0.35 * bobKick + beatPulse * 0.25 + (driving ? Math.sin(t * 9) * 0.06 : 0);
    bobHead.rotation.x = Math.sin(t * 11) * 0.3 * bobKick - roll * 4;
    if (driving) { garlandV += (-roll * 4 - garland.rotation.x) * dt * 10; garland.rotation.x += garlandV * dt; garlandV *= 0.92; }
    else garland.rotation.x = Math.sin(t * 1.3) * 0.05;
    garland.rotation.z = Math.sin(t * 2.1) * 0.04 + pitch * 3;
    radioScr.material.emissiveIntensity = 0.7 + beatPulse * 0.6;
    if (fanOn) fanBlades.rotation.x += dt * 30;
    fanHead.rotation.y = 0.3 + (fanOn ? Math.sin(t * 0.8) * 0.6 : 0);
    for (const d of dice) { if (d.userData.spin > 0) { d.userData.spin -= dt * 1.2; d.rotation.x += dt * 25 * d.userData.spin; d.rotation.z += dt * 19 * d.userData.spin; d.position.y = 0.77 + Math.abs(Math.sin(t * 20)) * 0.06 * d.userData.spin; } else d.position.y = 0.77; }
    if (microT > 0) { microT -= dt; microWin.material.emissiveIntensity = microT > 0 ? 1.2 : 0; }
    if (turretHead) {
      turretHead.rotation.y += (turretAim - turretHead.rotation.y) * Math.min(1, dt * 10);
      if (turretFire > 0) { turretFire -= dt; muzzle.visible = Math.sin(turretFire * 60) > 0; muzzle.scale.setScalar(0.7 + Math.random() * 0.5); } else muzzle.visible = false;
    }
    if (roofDeck.visible) for (let i = 0; i < smoke.length; i++) {
      const sp = smoke[i]; sp.userData.k = (sp.userData.k + dt * 0.45) % 1; const k = sp.userData.k;
      sp.position.set(Math.sin(k * 9 + i) * 0.08 - k * speed * 0.05, 0.7 + k * 1.4, Math.cos(k * 7 + i) * 0.06); sp.scale.setScalar(0.6 + k * 2); sp.material.opacity = grillOn ? (1 - k) * 0.45 : 0;
    }
    for (let i = 0; i < balloons.length; i++) { const b = balloons[i]; b.position.y = b.userData.y + Math.sin(t * 1.6 + i) * 0.06; b.position.x = b.userData.x - speed * 0.012 + Math.sin(t * 1.1 + i * 2) * 0.05; }
    guitar.rotation.x *= Math.pow(0.02, dt);
    for (let i = 0; i < animated.length; i++) { const a = animated[i]; a.obj[a.prop][a.axis] += (a.tgt - a.obj[a.prop][a.axis]) * Math.min(1, dt * 8); }
    if (flag && parts["ธง"].g.visible) { const p = flag.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, Math.sin(t * (driving ? 12 : 3) + x * 6) * 0.07 * (x + 0.45)); } p.needsUpdate = true; }
    boostFx.visible = !!ctx.boost && upg.nitro > 0;
    if (boostFx.visible) for (const f of flames) f.scale.set(1, 0.8 + Math.random() * 0.6, 1);
    shake = Math.max(0, shake - dt * 1.6);
  }

  function dispose() {
    van.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach((x) => x.dispose());
    });
    ownedTex.forEach((t) => t.dispose());
    if (van.parent) van.parent.remove(van);
  }

  let lastRadio = null;
  return {
    group: van, body, setState, setView, setRoof, setRear, setNight, setDriver, fireTurret, tick, pick, hover, dispose, bump,
    setRadio(r) { lastRadio = r; drawRadio(r); },
    shake: () => shake,
    // ยังมีของขยับอยู่ (ประตู/ซันรูฟ/ป้อมปืน) — กระดานใช้ตัดสินว่าต้องวาดเต็ม 60 เฟรมไหม
    busy: () => turretFire > 0 || shake > 0 || animated.some((a) => Math.abs(a.tgt - a.obj[a.prop][a.axis]) > 1e-3),
    viewMode: () => viewMode,
    style: () => styleKey,
    // พื้นห้องในรถเหนือถนน (หน่วยโลก) — ชั้น 2D ยกหมาก/ไฮไลต์บนช่องรถตู้ขึ้นเท่านี้
    floorY: () => baseY() + FLOOR * STYLES[styleKey].s[1],
    roofY: () => baseY() + RY * STYLES[styleKey].s[1],
    nitroLv: () => upg.nitro,
    suspLv: () => upg.susp,
  };
}
