// ============================================================
//  ชุดเครื่องมือฉาก Fodlan (แผนที่ทวีป + ฉากเข้าด่าน) — three.js ล้วน ไม่ผูกกับ React
//  ทุกอย่างที่ขยับทุกเฟรม (ฝน หิมะ ลูกไฟ ผิวน้ำ) คิดใน shader จากเวลา t — ไม่วนลูปบน CPU ทีละอนุภาค
// ============================================================

export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const span = (u, a, b) => clamp01((u - a) / Math.max(1e-6, b - a));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => t * t * (3 - 2 * t);
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t) => t * t * t;

// ---------- แบ่งงานหนักเป็นช่วงสั้น (ไม่ให้เฟรมกระตุกระหว่างสร้างฉากล่วงหน้า) ----------
export const idle = () => new Promise((r) => (typeof requestIdleCallback === "function" ? requestIdleCallback(() => r(), { timeout: 50 }) : setTimeout(r, 0)));
/** tick() คืนจังหวะหยุดพักเมื่อทำงานติดกันเกิน ms — ใช้ "await tick()" ในลูปหนัก */
export function budget(ms = 6) {
  let t = performance.now();
  return async () => {
    if (performance.now() - t < ms) return;
    await idle();
    t = performance.now();
  };
}

/** สุ่มแบบกำหนดเมล็ดได้ (ฉากเดิมทุกครั้ง) */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(x, y, s) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(s, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** value noise 2D 0..1 */
export function noise2(x, y, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm2(x, y, oct = 5, s = 0) {
  let amp = 0.5, f = 1, sum = 0, n = 0;
  for (let o = 0; o < oct; o++) { sum += amp * noise2(x * f, y * f, s + o * 17); n += amp; amp *= 0.5; f *= 2.03; }
  return sum / n;
}

// ---------- พื้นผิวจาก canvas ----------
const texCache = new Map();
function canvasTex(THREE, key, w, h, paint) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  paint(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.userData.shared = true; // ใช้ร่วมกันทั้งหน้า — ห้าม dispose ตอนเก็บกวาดฉาก
  texCache.set(key, t);
  return t;
}
/** วงกลมเรืองแสงขาวไล่จาง (ใช้กับ Sprite / Points) */
export const softTex = (THREE) => canvasTex(THREE, "soft", 64, 64, (g) => {
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.3, "rgba(255,255,255,.75)");
  grd.addColorStop(0.65, "rgba(255,255,255,.18)"); grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
});
/** ก้อนเมฆ/หมอกนุ่มๆ (ขอบไม่กลม) */
export const puffTex = (THREE) => canvasTex(THREE, "puff", 256, 256, (g, w, h) => {
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (x - w / 2) / (w / 2), dy = (y - h / 2) / (h / 2);
    const r = Math.sqrt(dx * dx + dy * dy);
    const n = fbm2(x / 38, y / 38, 4, 3);
    const a = clamp01((1 - r) * 1.6 - 0.25 + (n - 0.5) * 0.9);
    const i = (y * w + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
    img.data[i + 3] = Math.round(255 * smooth(a));
  }
  g.putImageData(img, 0, 0);
});
/** เปลวไฟ (หยดน้ำตาไล่สีเหลือง→ส้ม) */
export const flameTex = (THREE) => canvasTex(THREE, "flame", 64, 128, (g, w, h) => {
  const grd = g.createRadialGradient(w / 2, h * 0.72, 2, w / 2, h * 0.62, h * 0.5);
  grd.addColorStop(0, "rgba(255,250,210,1)"); grd.addColorStop(0.25, "rgba(255,196,80,.95)");
  grd.addColorStop(0.55, "rgba(255,110,30,.55)"); grd.addColorStop(1, "rgba(200,40,10,0)");
  g.fillStyle = grd;
  g.beginPath();
  g.moveTo(w / 2, 4);
  g.bezierCurveTo(w * 0.95, h * 0.45, w * 0.95, h * 0.95, w / 2, h - 2);
  g.bezierCurveTo(w * 0.05, h * 0.95, w * 0.05, h * 0.45, w / 2, 4);
  g.fill();
});

/** ป้ายตัวหนังสือลอย (Sprite) — ตัวเลขโรมันบนหมุด ฯลฯ */
export function textSprite(THREE, text, { font = "700 96px Cinzel, serif", color = "#fff6dc", stroke = "rgba(60,30,8,.85)", w = 256, h = 128 } = {}) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  g.font = font; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineWidth = 10; g.strokeStyle = stroke; g.strokeText(text, w / 2, h / 2 + 4);
  g.fillStyle = color; g.fillText(text, w / 2, h / 2 + 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  s.scale.set(w / h, 1, 1);
  return s;
}

// ---------- ท้องฟ้า ----------
/** โดมท้องฟ้าไล่สี 3 ชั้น (ไม่โดนหมอก) — setColors() เปลี่ยนสีได้ทันที (ฟ้าแลบ) */
export function skyDome(THREE, { top, mid, bottom, radius = 900, sun = null, sunColor = "#fff2c8", sunSize = 0.03 }) {
  const uniforms = {
    cTop: { value: new THREE.Color(top) }, cMid: { value: new THREE.Color(mid) }, cBot: { value: new THREE.Color(bottom) },
    sunDir: { value: new THREE.Vector3(...(sun || [0, -1, 0])).normalize() }, sunCol: { value: new THREE.Color(sunColor) },
    sunK: { value: sun ? 1 : 0 }, sunSize: { value: sunSize }, flash: { value: 0 },
  };
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms,
    vertexShader: "varying vec3 vD; void main(){ vD=normalize(position); vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position=p.xyww; }",
    fragmentShader: [
      "uniform vec3 cTop,cMid,cBot,sunDir,sunCol; uniform float sunK,sunSize,flash; varying vec3 vD;",
      "void main(){ float y=vD.y; vec3 c = y>0. ? mix(cMid,cTop,pow(clamp(y,0.,1.),.55)) : mix(cMid,cBot,pow(clamp(-y,0.,1.),.4));",
      " float s=max(dot(vD,sunDir),0.); c+=sunCol*sunK*(pow(s,800.*sunSize/.03)*1.2+pow(s,12.)*.35);",
      " c=mix(c,vec3(.92,.95,1.),flash); gl_FragColor=vec4(c,1.);",
      "#include <colorspace_fragment>",
      "}",
    ].join("\n"),
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 24), m);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  return { mesh, uniforms };
}

// ---------- shader ที่รองรับหมอกของฉาก ----------
function fogShader(THREE, { uniforms = {}, vertex, fragment, ...rest }) {
  return new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, uniforms]),
    vertexShader: ["#include <fog_pars_vertex>", vertex].join("\n"),
    fragmentShader: ["#include <fog_pars_fragment>", fragment].join("\n"),
    ...rest,
  });
}

/**
 * อนุภาคตก/ลอย ทั้งหมดคิดใน shader:
 *  kind "rain" = เส้นฝน (LineSegments) · "snow" = เกล็ดหิมะ · "ember" = ลูกไฟลอยขึ้น · "mote" = ฝุ่นแสงลอยช้า
 *  box = [w, h, d] กล่องที่อนุภาควนอยู่ (ตามตำแหน่ง group) · vel = ความเร็ว [x, y, z] หน่วย/วินาที
 */
export function particles(THREE, { kind = "snow", count = 2000, box = [60, 30, 60], vel = [0, -4, 0], size = 0.25, color = "#ffffff", opacity = 0.8, len = 1.2, seed = 7, additive = false }) {
  const r = rng(seed);
  const isLine = kind === "rain";
  const n = isLine ? count * 2 : count;
  const base = new Float32Array(n * 3), rnd = new Float32Array(n), tip = new Float32Array(n);
  for (let i = 0; i < count; i++) {
    const x = (r() - 0.5) * box[0], y = r() * box[1], z = (r() - 0.5) * box[2], q = r();
    for (let k = 0; k < (isLine ? 2 : 1); k++) {
      const j = isLine ? i * 2 + k : i;
      base.set([x, y, z], j * 3); rnd[j] = q; tip[j] = k;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(base, 3));
  g.setAttribute("rnd", new THREE.BufferAttribute(rnd, 1));
  g.setAttribute("tip", new THREE.BufferAttribute(tip, 1));
  const uniforms = {
    t: { value: 0 }, box: { value: new THREE.Vector3(...box) }, vel: { value: new THREE.Vector3(...vel) },
    size: { value: size }, col: { value: new THREE.Color(color) }, op: { value: opacity }, len: { value: len },
    map: { value: softTex(THREE) }, k: { value: 1 }, scaleH: { value: 600 },
  };
  const vertex = `
    attribute float rnd; attribute float tip;
    uniform float t, size, len, scaleH; uniform vec3 box, vel;
    varying float vA;
    void main(){
      vec3 v = vel * (0.75 + 0.5 * rnd);
      vec3 p = position + v * t;
      ${kind === "snow" || kind === "mote" ? "p.x += sin(t * (0.6 + rnd) + rnd * 40.) * (" + (kind === "mote" ? "0.6" : "1.2") + "); p.z += cos(t * (0.5 + rnd) + rnd * 20.) * 0.8;" : ""}
      p = mod(p + box * vec3(.5, 0., .5), box) - box * vec3(.5, 0., .5);
      ${isLine ? "p -= normalize(vel) * len * tip * (0.7 + 0.6 * rnd);" : ""}
      vec4 mvPosition = modelViewMatrix * vec4(p, 1.);
      gl_Position = projectionMatrix * mvPosition;
      ${isLine ? "" : "gl_PointSize = size * scaleH / max(0.5, -mvPosition.z) * (0.6 + 0.8 * rnd);"}
      vA = ${kind === "ember" ? "1. - p.y / box.y" : "1."};
      #include <fog_vertex>
    }`;
  const fragment = `
    uniform vec3 col; uniform float op, k; uniform sampler2D map; varying float vA;
    void main(){
      ${isLine ? "float a = op;" : "float a = texture2D(map, gl_PointCoord).a * op;"}
      gl_FragColor = vec4(col, a * vA * k);
      #include <fog_fragment>
      #include <colorspace_fragment>
    }`;
  const mat = fogShader(THREE, { uniforms, vertex, fragment, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
  const obj = isLine ? new THREE.LineSegments(g, mat) : new THREE.Points(g, mat);
  obj.frustumCulled = false;
  return {
    object: obj, uniforms,
    update(t, H) { uniforms.t.value = t; if (H) uniforms.scaleH.value = H * 0.6; },
  };
}

/** ผิวน้ำ (แม่น้ำ/ทะเล): คลื่นใน vertex + ลายแสงสะท้อนเลื่อนตามกระแส · flow = ทิศกระแส [x, z] */
export function water(THREE, { w = 100, d = 100, seg = 96, deep = "#1f4f63", shallow = "#5fa3b0", foam = "#e8f6ff", flow = [1, 0], amp = 0.18, waveLen = 6, opacity = 0.92 }) {
  const g = new THREE.PlaneGeometry(w, d, seg, seg);
  g.rotateX(-Math.PI / 2);
  const uniforms = {
    t: { value: 0 }, deep: { value: new THREE.Color(deep) }, shallow: { value: new THREE.Color(shallow) },
    foam: { value: new THREE.Color(foam) }, flow: { value: new THREE.Vector2(...flow) }, amp: { value: amp }, wl: { value: waveLen },
    op: { value: opacity }, flash: { value: 0 },
  };
  const vertex = `
    uniform float t, amp, wl; uniform vec2 flow; varying vec3 vW; varying float vH;
    void main(){
      vec3 p = position;
      vec4 w0 = modelMatrix * vec4(p, 1.);
      float h = sin(w0.x / wl + t * 1.3) * cos(w0.z / (wl * 1.3) - t * 0.9) + 0.5 * sin((w0.x + w0.z) / (wl * 0.5) - t * 2.1);
      p.y += h * amp; vH = h;
      vec4 wp = modelMatrix * vec4(p, 1.); vW = wp.xyz;
      vec4 mvPosition = viewMatrix * wp;
      gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
    }`;
  const fragment = `
    uniform float t, op, flash; uniform vec3 deep, shallow, foam; uniform vec2 flow; varying vec3 vW; varying float vH;
    float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
      return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
    void main(){
      vec2 q = vW.xz * 0.35 - flow * t * 0.8;
      float n = vn(q) * 0.6 + vn(q * 2.3 + 7.) * 0.4;
      vec3 c = mix(deep, shallow, smoothstep(0.25, 0.85, n + vH * 0.15));
      vec2 gq = vW.xz * vec2(1.6, 1.6) - flow * t * 1.6;
      float glint = smoothstep(0.9, 0.985, vn(vec2(gq.x * 0.45, gq.y * 2.6) + vH * 0.6)) * (0.6 + 0.4 * vn(vW.xz * 0.2 + t * 0.1));
      c += foam * glint * 0.28;
      c = mix(c, vec3(.9, .95, 1.), flash * 0.6);
      gl_FragColor = vec4(c, op);
      #include <fog_fragment>
      #include <colorspace_fragment>
    }`;
  const mat = fogShader(THREE, { uniforms, vertex, fragment, transparent: opacity < 1 });
  const mesh = new THREE.Mesh(g, mat);
  return { mesh, uniforms, update(t) { uniforms.t.value = t; } };
}

/** พื้นดินจากฟังก์ชันความสูง + สีต่อจุด (vertex colors) · heightFn(x, z) · colorFn(x, z, h, slope) → [r, g, b] 0..1 */
export async function terrain(THREE, { w = 120, d = 120, seg = 160, heightFn, colorFn, flat = false, tick = budget() }) {
  const g = new THREE.PlaneGeometry(w, d, seg, seg);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  const cols = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { p.setY(i, heightFn(p.getX(i), p.getZ(i))); if (i % 256 === 0) await tick(); }
  g.computeVertexNormals();
  const nrm = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const slope = 1 - nrm.getY(i);
    const c = colorFn(p.getX(i), p.getZ(i), p.getY(i), slope);
    cols.set(c, i * 3);
    if (i % 256 === 0) await tick();
  }
  g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: flat });
  return new THREE.Mesh(g, mat);
}

/**
 * ป่าไม้สน (InstancedMesh 3 ชั้นกรวย + ลำต้น) — pts = [[x, y, z, scale], …]
 *  snow = หิมะบนยอด (ชั้นบนสุดสีขาว) · dark = ป่าทึบโทนเข้ม
 */
export function pineForest(THREE, pts, { leaf = "#2f5d3a", leaf2 = "#3f7448", trunk = "#4a3424", snow = false, seed = 3, tiers = 3 }) {
  const grp = new THREE.Group();
  const r = rng(seed);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const trunkMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.18, 1.4, 5), new THREE.MeshLambertMaterial({ color: trunk }), pts.length);
  const tierMeshes = [];
  for (let k = 0; k < tiers; k++) {
    const top = snow && k === tiers - 1;
    const geo = new THREE.ConeGeometry(1.25 - k * 0.3, 1.7 - k * 0.15, 7);
    const mat = new THREE.MeshLambertMaterial({ color: top ? "#eef4fa" : k % 2 ? leaf2 : leaf });
    tierMeshes.push(new THREE.InstancedMesh(geo, mat, pts.length));
  }
  const tint = new THREE.Color();
  pts.forEach(([x, y, z, sc = 1], i) => {
    const yaw = r() * Math.PI * 2;
    q.setFromAxisAngle(up, yaw);
    s.setScalar(sc);
    m4.compose(v.set(x, y + 0.7 * sc, z), q, s);
    trunkMesh.setMatrixAt(i, m4);
    tierMeshes.forEach((tm, k) => {
      m4.compose(v.set(x, y + (1.5 + k * 0.85) * sc, z), q, s);
      tm.setMatrixAt(i, m4);
      tint.setScalar(0.82 + r() * 0.3);
      tm.setColorAt(i, tint);
    });
  });
  grp.add(trunkMesh, ...tierMeshes);
  return grp;
}

/**
 * กองไฟ/คบเพลิง: เปลวหลายชั้น (Sprite) วูบไหว + แสงจุด + ลูกไฟลอย
 *  update(t) ต้องเรียกทุกเฟรม · light = false ไม่ใส่แสงจุด (จำนวนแสงมีผลกับความเร็วทุก material)
 */
export function fire(THREE, { scale = 1, light = true, lightColor = "#ff8a3a", intensity = 30, dist = 14, embers = 60, seed = 5 }) {
  const grp = new THREE.Group();
  const flames = [];
  const r = rng(seed);
  for (let i = 0; i < 4; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex(THREE), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: i === 0 ? "#fff1c2" : "#ffb060" }));
    const w = (i === 0 ? 0.55 : 0.9 - i * 0.1) * scale;
    sp.scale.set(w, w * 2, 1);
    sp.position.set((r() - 0.5) * 0.3 * scale, w * 0.9, (r() - 0.5) * 0.3 * scale);
    sp.userData = { w, ph: r() * 10, x: sp.position.x };
    grp.add(sp); flames.push(sp);
  }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(THREE), color: "#ff7a2a", transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.scale.setScalar(3.4 * scale); glow.position.y = 0.6 * scale;
  grp.add(glow);
  let pl = null;
  if (light) { pl = new THREE.PointLight(lightColor, intensity, dist * scale, 1.6); pl.position.y = 1.2 * scale; grp.add(pl); }
  let em = null;
  if (embers) {
    em = particles(THREE, { kind: "ember", count: embers, box: [1.6 * scale, 6 * scale, 1.6 * scale], vel: [0.2, 1.8 * scale, 0], size: 0.09 * scale, color: "#ffb35c", opacity: 1, seed: seed + 1, additive: true });
    grp.add(em.object);
  }
  return {
    group: grp,
    update(t, H) {
      flames.forEach((f, i) => {
        const { w, ph, x } = f.userData;
        const k = 1 + 0.18 * Math.sin(t * (9 + i * 2.3) + ph) + 0.1 * Math.sin(t * 23 + ph * 2);
        f.scale.set(w * (2 - k) * 0.95, w * 2 * k, 1);
        f.position.x = x + Math.sin(t * 5 + ph) * 0.05 * scale;
      });
      glow.material.opacity = 0.45 + 0.12 * Math.sin(t * 13) + 0.06 * Math.sin(t * 31);
      if (pl) pl.intensity = intensity * (0.85 + 0.15 * Math.sin(t * 17) + 0.08 * Math.sin(t * 41));
      em?.update(t, H);
    },
  };
}

/** แสงลำ (กรวยโปร่งแสงไล่จาง) — ลำแสงจากเพดาน/ลำแสงบนหมุด */
export function lightShaft(THREE, { radiusTop = 0.4, radiusBottom = 2, height = 20, color = "#bfffe0", opacity = 0.35 }) {
  const g = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 32, 1, true);
  g.translate(0, -height / 2, 0);
  const uniforms = { col: { value: new THREE.Color(color) }, op: { value: opacity }, h: { value: height }, t: { value: 0 } };
  const m = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: "varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY=position.y; vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }",
    fragmentShader: [
      "uniform vec3 col; uniform float op,h,t; varying float vY; varying vec3 vN; varying vec3 vV;",
      "void main(){ float f=1.+vY/h; float edge=pow(abs(dot(vN,vV)),1.5); float a=op*smoothstep(0.,.25,f)*(1.-f*.6)*edge*(.85+.15*sin(t*2.+vY*.4));",
      " gl_FragColor=vec4(col,a);",
      "#include <colorspace_fragment>",
      "}",
    ].join("\n"),
  });
  return { mesh: new THREE.Mesh(g, m), uniforms };
}

/** แผ่นหมอกลอย (Sprite ก้อนเมฆ) วางสุ่มในกล่อง — drift ไปตามแกน x ช้าๆ */
export function fogBank(THREE, { count = 24, box = [80, 6, 80], y = 1, color = "#c8d4dc", opacity = 0.35, size = [18, 34], seed = 11 }) {
  const grp = new THREE.Group();
  const r = rng(seed);
  const items = [];
  for (let i = 0; i < count; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex(THREE), color, transparent: true, opacity, depthWrite: false, fog: true }));
    const s = size[0] + r() * (size[1] - size[0]);
    sp.scale.set(s, s * 0.45, 1);
    sp.position.set((r() - 0.5) * box[0], y + r() * box[1], (r() - 0.5) * box[2]);
    sp.material.rotation = (r() - 0.5) * 0.4;
    sp.userData = { x0: sp.position.x, v: 0.4 + r() * 0.8 };
    grp.add(sp); items.push(sp);
  }
  return {
    group: grp,
    setOpacity(k) { items.forEach((s) => { s.material.opacity = opacity * k; }); },
    update(t) {
      items.forEach((s) => {
        const { x0, v } = s.userData;
        s.position.x = ((x0 + t * v + box[0] / 2) % box[0] + box[0]) % box[0] - box[0] / 2;
      });
    },
  };
}

/** กล้องตามเส้นทาง: pos/look = รายการจุด [x, y, z] → CatmullRom · at(u) คืนตำแหน่ง/จุดมอง */
export function camPath(THREE, pos, look) {
  const cp = new THREE.CatmullRomCurve3(pos.map((p) => new THREE.Vector3(...p)), false, "centripetal");
  const cl = new THREE.CatmullRomCurve3(look.map((p) => new THREE.Vector3(...p)), false, "centripetal");
  const a = new THREE.Vector3(), b = new THREE.Vector3();
  return { at(u) { const k = clamp01(u); return { pos: cp.getPointAt(k, a), look: cl.getPointAt(k, b) }; } };
}

/** เก็บกวาด geometry/material/texture ใต้ object (ข้ามพื้นผิวที่ใช้ร่วมกัน) */
export function disposeTree(obj) {
  obj.traverse((o) => {
    o.geometry?.dispose?.();
    const m = o.material;
    if (!m) return;
    (Array.isArray(m) ? m : [m]).forEach((x) => {
      for (const k of ["map", "emissiveMap", "alphaMap"]) if (x[k] && !x[k].userData?.shared) x[k].dispose();
      if (x.uniforms?.map?.value && !x.uniforms.map.value.userData?.shared) x.uniforms.map.value.dispose?.();
      x.dispose();
    });
  });
}
