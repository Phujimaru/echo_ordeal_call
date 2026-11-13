// ============================================================
//  จุด glitch บนผิวลูกโลก (ผู้ใช้สั่ง 2026-11-14 "เพิ่ม glitch บนลูกโลก แค่บางจุด — สปอยอัปเดตในอนาคต")
//  แผ่นโค้งบางๆ ลอยเหนือผิวโลกเล็กน้อย หมุนไปกับโลก · shader: บล็อกพิกเซลแตก + เส้นสแกนเลื่อน + สีแยก ฟ้า/ชมพู
//  ปกติกะพริบเบาๆ · เป็นพักๆ "แตก" แรงขึ้นสั้นๆ (แต่ละจุดจังหวะไม่ตรงกัน) · ไม่รับคลิก
//  SPOTS = [lon, lat, ขนาด (เรเดียนบนผิว), seed] — เลือกจุดที่ไม่มีหมุดโหมด (มหาสมุทร/ขั้วโลก)
// ============================================================
export const GLITCH_SPOTS = [
  [-150, 8, 0.55, 1.7],   // แปซิฟิกกลาง
  [105, 58, 0.46, 4.3],   // ไซบีเรีย
  [35, -48, 0.5, 7.9],    // มหาสมุทรใต้
];

const VERT = "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }";
const FRAG = [
  "uniform float t; uniform float seed; varying vec2 vUv;",
  "float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)) + seed * 17.3) * 43758.5453); }",
  "void main(){",
  "  vec2 uv = vUv;",
  "  float burst = step(0.72, h(vec2(floor(t * 0.9 + seed), 3.1)));",            // พัก "แตก" แรง (สุ่มทุก ~1 วิ)
  "  float k = 0.35 + 0.65 * burst;",
  "  float row = floor(uv.y * 26.0);",
  "  float shift = (h(vec2(row, floor(t * 14.0))) - 0.5) * 0.22 * k;",              // แถวเลื่อนซ้าย-ขวา
  "  vec2 q = vec2(uv.x + shift, uv.y);",
  "  vec2 cell = floor(q * vec2(14.0, 26.0));",
  "  float on = step(1.0 - (0.3 + 0.4 * k), h(cell + floor(t * 9.0)));",           // บล็อกติด/ดับ
  "  float d = length(uv - 0.5) * 2.0;",
  "  float edge = 1.0 - smoothstep(0.35 + 0.25 * h(cell), 1.0, d);",                // ขอบขาดๆ ไม่กลม
  "  float scan = 0.65 + 0.35 * sin((uv.y * 90.0) + t * 22.0);",
  "  float split = step(0.5, h(vec2(cell.y, floor(t * 6.0))));",
  "  vec3 col = mix(vec3(0.0, 0.72, 1.0), vec3(1.0, 0.12, 0.62), split);",          // ฟ้า / ชมพู
  "  col = mix(col, vec3(0.04, 0.07, 0.16), step(0.62, h(cell * 2.3 + floor(t * 11.0))));", // บล็อกมืด (ข้อมูลหาย) — ตัดกับโลกสีขาว
  "  float a = on * edge * scan * (0.55 + 0.45 * k);",
  "  a *= 0.75 + 0.25 * step(0.5, fract(t * 7.0 + seed));",                         // สั่นไหว
  "  gl_FragColor = vec4(col, a * 0.9);",
  "  #include <colorspace_fragment>",
  "}",
].join("\n");

// ละอองพิกเซลลอยออกจากจุด glitch (ผู้ใช้สั่ง 2026-11-14 "ทำให้มีละอองลอยออกมาด้วย")
//  สี่เหลี่ยมเล็กๆ ฟ้า/ชมพู/เข้ม เกิดสุ่มทั่วจุด → ลอยออกตามแนวตั้งฉากผิวโลก + ส่ายข้าง → กะพริบแล้วจางหาย → เกิดใหม่
const P_PER = 34, P_LIFE = 2.6, P_RISE = 0.32;
const P_VERT = [
  "attribute float aAlpha; attribute vec3 aCol; attribute float aSize; varying float vA; varying vec3 vC;",
  "void main(){ vA=aAlpha; vC=aCol; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=aSize*(300.0/-mv.z); gl_Position=projectionMatrix*mv; }",
].join("\n");
const P_FRAG = [
  "varying float vA; varying vec3 vC;",
  "void main(){ if (vA<=0.01) discard; gl_FragColor=vec4(vC, vA);",
  "#include <colorspace_fragment>",
  "}",
].join("\n");
const P_COLS = [[0.0, 0.72, 1.0], [1.0, 0.12, 0.62], [0.04, 0.07, 0.16], [0.55, 0.95, 1.0]];

// แผ่นโค้งตามผิวทรงกลม (สร้างจาก SphereGeometry ช่วงเล็กๆ) ตั้งศูนย์ที่ lon/lat
export function createGlitchSpots(THREE, parent, { spots = GLITCH_SPOTS, radius = 1.006 } = {}) {
  const mats = [], clouds = [];
  for (const [lon, lat, size, seed] of spots) {
    const geo = new THREE.SphereGeometry(radius, 24, 16, -size / 2, size, Math.PI / 2 - size / 2, size);
    const mat = new THREE.ShaderMaterial({
      uniforms: { t: { value: 0 }, seed: { value: seed } },
      vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, blending: THREE.NormalBlending, side: THREE.FrontSide,
    });
    const m = new THREE.Mesh(geo, mat);
    // SphereGeometry phi = 0 ที่ +X หมุนรอบ Y · theta วัดจาก +Y — ช่วงที่สร้างอยู่รอบเส้นศูนย์สูตรที่ phi≈0 → หมุนไปที่ lon/lat
    const g = new THREE.Group();
    g.add(m);
    m.rotation.z = THREE.MathUtils.degToRad(lat);
    g.rotation.y = THREE.MathUtils.degToRad(lon) + Math.PI / 2;
    g.renderOrder = 2;
    parent.add(g);
    mats.push(mat);
    // ทิศศูนย์กลางจุด (ในระบบของ parent) = จุด (-1,0,0) ของแผ่น หลังหมุน · แกนสัมผัส u/v สำหรับกระจายละออง
    g.updateMatrix(); m.updateMatrix();
    const n = new THREE.Vector3(-1, 0, 0).applyMatrix4(m.matrix).applyMatrix4(g.matrix).normalize();
    const u = new THREE.Vector3(0, 1, 0).cross(n).normalize(), v = n.clone().cross(u).normalize();
    const pos = new Float32Array(P_PER * 3), alpha = new Float32Array(P_PER), col = new Float32Array(P_PER * 3), sz = new Float32Array(P_PER);
    const ps = [];
    for (let i = 0; i < P_PER; i++) {
      const c = P_COLS[i % P_COLS.length];
      col.set(c, i * 3);
      sz[i] = 0.09 + Math.random() * 0.08; // ≈ 5–9 px ที่ระยะกล้องปกติ
      const r0 = Math.sqrt(Math.random()) * size * 0.45, th0 = Math.random() * 6.28;
      ps.push({ a: Math.cos(th0) * r0, b: Math.sin(th0) * r0, born: -Math.random() * P_LIFE, sway: Math.random() * 6.28, speed: 0.7 + Math.random() * 0.6 });
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    pg.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1));
    pg.setAttribute("aCol", new THREE.BufferAttribute(col, 3));
    pg.setAttribute("aSize", new THREE.BufferAttribute(sz, 1));
    const pts = new THREE.Points(pg, new THREE.ShaderMaterial({ vertexShader: P_VERT, fragmentShader: P_FRAG, transparent: true, depthWrite: false }));
    pts.renderOrder = 3; pts.frustumCulled = false;
    parent.add(pts);
    clouds.push({ n, u, v, size, ps, pos, alpha, pg });
  }
  const tmp = new THREE.Vector3();
  return {
    update(clock) {
      for (const m of mats) m.uniforms.t.value = clock;
      for (const c of clouds) {
        for (let i = 0; i < c.ps.length; i++) {
          const p = c.ps[i];
          let age = (clock - p.born) / P_LIFE;
          if (age >= 1) { // เกิดใหม่: จุดสุ่มทั่ววง
            const r = Math.sqrt(Math.random()) * c.size * 0.45, th = Math.random() * 6.28;
            p.a = Math.cos(th) * r; p.b = Math.sin(th) * r; p.born = clock; age = 0;
          }
          const k = Math.max(0, age), rise = 1.008 + k * P_RISE * p.speed, sw = Math.sin(clock * 3 + p.sway) * 0.012 * k;
          tmp.copy(c.n).multiplyScalar(rise).addScaledVector(c.u, p.a + sw).addScaledVector(c.v, p.b + k * 0.03);
          c.pos[i * 3] = tmp.x; c.pos[i * 3 + 1] = tmp.y; c.pos[i * 3 + 2] = tmp.z;
          const flick = Math.sin(clock * 23 + i * 7.3) > -0.6 ? 1 : 0.15; // กะพริบแบบดิจิทัล
          c.alpha[i] = age < 0 ? 0 : Math.min(1, k * 6) * (1 - k) * flick * 0.95;
        }
        c.pg.attributes.position.needsUpdate = true;
        c.pg.attributes.aAlpha.needsUpdate = true;
      }
    },
  };
}
