// ด่าน III สมรภูมิชายฝั่งเดอร์ดริว — ทัพ 3 สี (แดง/น้ำเงิน/เหลือง) ปะทะกันริมหาดตอนพลบค่ำ
//  กองไฟ · รั้วไม้แหลม · เครื่องยิงหินยิงลูกไฟ · ห่าธนู · มังกร (ไม่เห็นตัว เห็นแต่ไฟ) พ่นไฟกว้างกวาดทั้งสนาม
//  สภาพอากาศ (ซึนามิ): กำแพงคลื่นยักษ์ลุกขึ้นกลางทะเลแล้วถาโถมเข้าหาฝั่ง
import { rng, fbm2, smooth, clamp01, span, skyDome, water, terrain, particles, camPath, fire, softTex, flameTex, puffTex } from "../kit";

const SHORE = 12; // z ที่ชายหาดลงน้ำ (ทะเลอยู่ฝั่ง +z)

function army(THREE, { color, n, x0, z0, cols, gap = 1.1, face = 0, seed }) {
  const r = rng(seed);
  const body = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.22, 0.6, 2, 6), new THREE.MeshLambertMaterial({ color }), n);
  const helm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 6, 4), new THREE.MeshLambertMaterial({ color: "#8a8a90" }), n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), face), s = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
  const base = [];
  for (let i = 0; i < n; i++) {
    const x = x0 + (i % cols) * gap + (r() - 0.5) * 0.4, z = z0 + Math.floor(i / cols) * gap + (r() - 0.5) * 0.4;
    base.push([x, z, r() * 10]);
    m.compose(v.set(x, 0.55, z), q, s); body.setMatrixAt(i, m);
    m.compose(v.set(x, 1.15, z), q, s); helm.setMatrixAt(i, m);
  }
  const g = new THREE.Group();
  g.add(body, helm);
  // ธงทัพ
  const flagMat = new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide });
  const flags = [];
  for (let k = 0; k < 3; k++) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.2, 5), new THREE.MeshLambertMaterial({ color: "#3a2a1a" }));
    const fx = x0 + (k + 0.5) * (cols * gap) / 3, fz = z0 - 1;
    pole.position.set(fx, 2.1, fz);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1, 8, 1), flagMat);
    flag.position.set(fx + 0.8, 3.6, fz);
    flag.userData.p0 = flag.geometry.attributes.position.array.slice();
    g.add(pole, flag); flags.push(flag);
  }
  return {
    group: g,
    update(t) {
      // โยกตัวเล็กน้อย (ทุก 3 เฟรมพอ — ลดงาน CPU)
      for (let i = 0; i < n; i++) {
        const [x, z, ph] = base[i];
        const y = 0.55 + Math.max(0, Math.sin(t * 6 + ph)) * 0.12;
        m.compose(v.set(x, y, z), q, s); body.setMatrixAt(i, m);
        m.compose(v.set(x, y + 0.6, z), q, s); helm.setMatrixAt(i, m);
      }
      body.instanceMatrix.needsUpdate = true; helm.instanceMatrix.needsUpdate = true;
      for (const f of flags) {
        const p = f.geometry.attributes.position, p0 = f.userData.p0;
        for (let i = 0; i < p.count; i++) { const x = p0[i * 3]; p.setZ(i, Math.sin(t * 5 + x * 3) * 0.18 * (x + 0.8)); }
        p.needsUpdate = true;
      }
    },
  };
}

function catapult(THREE) {
  const g = new THREE.Group();
  const w = new THREE.MeshLambertMaterial({ color: "#5c3e22" });
  const base = new THREE.Mesh(new THREE.BoxGeometry(3, 0.4, 1.8), w); base.position.y = 0.7; g.add(base);
  for (const [x, z] of [[-1.1, -1], [1.1, -1], [-1.1, 1], [1.1, 1]]) {
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.2, 10), w); wh.rotation.x = Math.PI / 2; wh.position.set(x, 0.5, z); g.add(wh);
  }
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2, 1.6), w); frame.position.set(0.3, 1.8, 0); g.add(frame);
  const arm = new THREE.Group(); arm.position.set(0.3, 2.4, 0);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(4, 0.18, 0.18), w); beam.position.x = -1.4; arm.add(beam);
  const cup = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), w); cup.rotation.x = Math.PI; cup.position.set(-3.3, 0.1, 0); arm.add(cup);
  g.add(arm);
  return { group: g, arm };
}

export async function buildWar(THREE, { weather = false, lowQ = false } = {}) {
  const r = rng(303);
  const group = new THREE.Group();
  const sky = skyDome(THREE, { top: "#24152a", mid: "#d9663a", bottom: "#2a140e", sun: [-0.25, 0.06, 0.96], sunColor: "#ffb070", sunSize: 0.06 });
  group.add(sky.mesh);
  const fog = new THREE.Fog("#7a3a26", 30, 240);

  const hFn = (x, z) => {
    const n = fbm2(x * 0.04 + 9, z * 0.04, 4, 6);
    const inland = smooth(clamp01((SHORE - z) / 14));
    const back = smooth(clamp01((-z - 50) / 40)) * 22 * (0.5 + n);
    return -1.4 + inland * (1.6 + (n - 0.45) * 3) + back + clamp01((SHORE - z) / 6) * 0.2;
  };
  const col = (x, z, h) => {
    const n = fbm2(x * 0.15, z * 0.15, 3, 2);
    if (z > SHORE - 7) return [0.78 + n * 0.08, 0.64 + n * 0.08, 0.44];   // หาดทราย
    const burnt = fbm2(x * 0.05, z * 0.05, 3, 12) > 0.6 ? 0.55 : 1;
    return [(0.33 + n * 0.12) * burnt, (0.36 + n * 0.12) * burnt, (0.18 + n * 0.05) * burnt];
  };
  group.add(await terrain(THREE, { w: 240, d: 200, seg: lowQ ? 100 : 150, heightFn: hFn, colorFn: col }));
  const sea = water(THREE, { w: 600, d: 400, seg: lowQ ? 70 : 120, deep: "#162a36", shallow: "#3a6670", foam: "#ffd0a0", flow: [0.2, -1], amp: 0.32, waveLen: 4 });
  sea.mesh.position.set(0, -0.6, 190);
  group.add(sea.mesh);

  // ทัพสามสี
  const N = lowQ ? 90 : 220;
  const armies = [
    army(THREE, { color: "#b0302c", n: N, x0: -34, z0: -14, cols: 18, face: 0.4, seed: 1 }),
    army(THREE, { color: "#2f4fa8", n: N, x0: 14, z0: -16, cols: 18, face: -0.4, seed: 2 }),
    army(THREE, { color: "#c9a02c", n: N, x0: -10, z0: -34, cols: 20, face: 0, seed: 3 }),
  ];
  armies.forEach((a) => group.add(a.group));

  // รั้วไม้แหลมเป็นแนว
  const stakes = new THREE.InstancedMesh(new THREE.ConeGeometry(0.14, 2.4, 5), new THREE.MeshLambertMaterial({ color: "#6b4a2a" }), 160);
  {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
    let i = 0;
    for (const [x0, z0, dx, dz] of [[-40, 0, 1, 0.08], [6, -2, 1, -0.05], [-14, -24, 1, 0]]) {
      for (let k = 0; k < 53 && i < 160; k++, i++) {
        const x = x0 + k * dx * 0.7, z = z0 + k * dz * 0.7;
        e.set(-0.55 + (r() - 0.5) * 0.15, 0, (r() - 0.5) * 0.2); q.setFromEuler(e);
        m.compose(v.set(x, hFn(x, z) + 0.6, z), q, s); stakes.setMatrixAt(i, m);
      }
    }
  }
  group.add(stakes);

  // กองไฟ
  const fires = [[-22, -4], [-4, 2], [10, -6], [24, 0], [-12, -18], [4, -28]].map(([x, z], i) => {
    const f = fire(THREE, { scale: 1.5, light: i < 3, intensity: 70, dist: 20, embers: lowQ ? 20 : 50, seed: 50 + i });
    f.group.position.set(x, hFn(x, z), z);
    group.add(f.group);
    return f;
  });
  // ควันลอยเป็นเสา
  const smokes = [];
  for (let i = 0; i < (lowQ ? 14 : 30); i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex(THREE), color: "#2a1c18", transparent: true, opacity: 0.45, depthWrite: false }));
    const base = [[-30, -40], [20, -50], [-6, -60], [40, -30]][i % 4];
    sp.userData = { x: base[0] + (r() - 0.5) * 6, z: base[1] + (r() - 0.5) * 6, ph: r(), s: 10 + r() * 10 };
    group.add(sp); smokes.push(sp);
  }

  // เครื่องยิงหิน + ลูกไฟ
  const cats = [[-26, 4, 0.3], [20, 6, -0.4]].map(([x, z, ry]) => {
    const c = catapult(THREE);
    c.group.position.set(x, hFn(x, z), z); c.group.rotation.y = ry;
    group.add(c.group);
    return c;
  });
  const ball = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(THREE), color: "#ffb050", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  ball.scale.setScalar(3);
  const ballLight = new THREE.PointLight("#ff9040", 0, 30, 1.4);
  const boom = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(THREE), color: "#ffcf80", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  group.add(ball, ballLight, boom);
  const BALL_A = new THREE.Vector3(-28, 6, 4), BALL_B = new THREE.Vector3(8, hFn(8, -20) + 0.5, -20);
  boom.position.copy(BALL_B);

  // ห่าธนู (เส้นพุ่งเฉียงข้ามฟ้า)
  // ห่าธนูเป็นแถบหนาแน่นบนฟ้าเหนือทัพ (ไม่โปรยทั้งจอเหมือนฝน)
  const arrows = particles(THREE, { kind: "rain", count: lowQ ? 90 : 200, box: [46, 7, 16], vel: [24, -5, 1.5], len: 0.9, color: "#2a1a10", opacity: 0.75, seed: 33 });
  arrows.object.position.set(-8, 11, -14);
  group.add(arrows.object);

  // ไฟมังกร: แถบไฟกว้างกวาดข้ามสนาม + ลำไฟจากฟ้า (ไม่เห็นตัวมังกร)
  const DRAGON = [0.5, 0.72];
  const BAND_Z = -9, BAND_W = 7;
  const flames = [];
  const FN = lowQ ? 70 : 170;
  for (let i = 0; i < FN; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex(THREE), color: i % 3 ? "#ff8a30" : "#ffd27a", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    sp.userData = { x: -70 + (i / FN) * 140 + (r() - 0.5) * 2, z: BAND_Z + (r() - 0.5) * BAND_W, s: 1.4 + r() * 2.2, ph: r() * 10 };
    group.add(sp); flames.push(sp);
  }
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 3.2, 60, 16, 1, true), new THREE.MeshBasicMaterial({ map: flameTex(THREE), color: "#ffb060", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  stream.geometry.translate(0, -30, 0);
  group.add(stream);
  const dragonLight = new THREE.PointLight("#ff7a20", 0, 60, 1.2);
  group.add(dragonLight);
  // แถบพื้นลุกโชน (เรืองตามแนวไฟที่หัวไฟผ่านไปแล้ว) + ลูกไฟลอยเหนือแถบ
  const bandU = { head: { value: -999 }, t: { value: 0 } };
  const band = new THREE.Mesh(new THREE.PlaneGeometry(150, BAND_W * 1.8, 150, 1), new THREE.ShaderMaterial({
    uniforms: bandU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: "varying vec2 vU; varying float vX; void main(){ vU = uv; vX = position.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
    fragmentShader: [
      "uniform float head, t; varying vec2 vU; varying float vX;",
      "void main(){ float behind = head - vX; if (behind < 0.) discard;",
      " float k = exp(-behind / 55.) * smoothstep(0., 3., behind); float w = 1. - pow(abs(vU.y - .5) * 2., 2.);",
      " float fl = .75 + .25 * sin(vX * 1.7 + t * 9.) * sin(vX * .6 - t * 5.);",
      " gl_FragColor = vec4(vec3(1., .45, .12) * fl, k * w * .85); ",
      "#include <colorspace_fragment>",
      "}",
    ].join("\n"),
  }));
  band.rotation.x = -Math.PI / 2;
  band.position.set(0, 0.6, BAND_Z);
  group.add(band);
  const bandEmbers = particles(THREE, { kind: "ember", count: lowQ ? 120 : 320, box: [140, 9, BAND_W], vel: [0.6, 3.2, 0], size: 0.18, color: "#ffb35c", opacity: 1, seed: 39, additive: true });
  bandEmbers.object.position.set(0, 0, BAND_Z);
  group.add(bandEmbers.object);

  // ซึนามิ
  let wave = null;
  if (weather) {
    const g = new THREE.PlaneGeometry(420, 46, 120, 24);
    const uniforms = { t: { value: 0 }, k: { value: 0 } };
    const m = new THREE.ShaderMaterial({
      uniforms, transparent: true, side: THREE.DoubleSide, fog: false,
      vertexShader: `uniform float t, k; varying vec2 vU; varying float vC;
        void main(){ vec3 p = position; float yy = (p.y + 23.) / 46.; vU = uv;
          float curl = pow(yy, 3.) * 18. * k; p.z -= curl; p.y = (yy * 46. * k) + sin(p.x * 0.05 + t * 2.) * 2. * k;
          p.z += sin(p.x * 0.03 + t) * 4.; vC = yy;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.); }`,
      fragmentShader: `uniform float t; varying vec2 vU; varying float vC;
        float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
          return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
        void main(){ vec3 deep = vec3(.04,.12,.16), mid = vec3(.16,.4,.44), lip = vec3(.42,.72,.7), foam = vec3(.96,.94,.9);
          // ลายน้ำไหลลงตามหน้าคลื่น + แสงทะลุใกล้สัน + ฟองขาวแตกตัวที่สัน
          float n = vn(vec2(vU.x * 70., vC * 9. + t * 2.2)) * .6 + vn(vec2(vU.x * 180., vC * 22. + t * 3.4)) * .4;
          vec3 c = mix(deep, mid, pow(vC, 1.3));
          c = mix(c, lip, smoothstep(.55, .85, vC) * .7);
          c += vec3(.12, .2, .2) * smoothstep(.7, .98, n) * (.2 + vC * .6);
          float f = smoothstep(.8, .95, vC + (n - .5) * .22 + sin(vU.x * 140. + t * 6.) * .02);
          c = mix(c, foam, f);
          gl_FragColor = vec4(c, .97);
          #include <colorspace_fragment>
        }`,
    });
    wave = { mesh: new THREE.Mesh(g, m), uniforms };
    wave.mesh.position.set(0, -0.8, 200);
    group.add(wave.mesh);
    // ละอองฟองฟุ้งเหนือสันคลื่น
    wave.spray = [];
    for (let i = 0; i < (lowQ ? 24 : 56); i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex(THREE), color: "#eef6f4", transparent: true, opacity: 0, depthWrite: false, fog: false }));
      sp.userData = { x: (r() - 0.5) * 380, ph: r(), s: 10 + r() * 16 };
      group.add(sp); wave.spray.push(sp);
    }
  }

  const hemi = new THREE.HemisphereLight("#ffb48a", "#2a1810", 1.05);
  const sun = new THREE.DirectionalLight("#ff9a5a", 1.8);
  sun.position.set(-30, 12, 90);
  group.add(hemi, sun);

  // ไม่มีซึนามิ: โฉบจากทะเลขึ้นเหนือสนามรบ มองลงไปที่ไฟมังกร · มีซึนามิ: เริ่มหลังทัพ แล้วหันกล้องออกทะเลตอนคลื่นยักษ์ลุก
  const cam = weather
    ? camPath(THREE,
      [[-22, 22, -46], [-8, 17, -30], [2, 14, -10], [4, 11, 6], [2, 9.5, 12]],
      [[-2, 2, -10], [0, 1, -8], [0, 3, 8], [0, 6, 60], [0, 10, 95]])
    : camPath(THREE,
      [[18, 6, 70], [10, 9, 38], [0, 15, 16], [-8, 22, 6], [-14, 25, 2]],
      [[6, 3, 20], [0, 3, 2], [-6, 1, -10], [-6, 0, -16], [-4, 0, -18]]);
  const events = [
    { u: 0.12, sfx: "arrow_volley" }, { u: 0.24, sfx: "catapult_fire" }, { u: 0.4, sfx: "fireball_hit" },
    { u: 0.46, sfx: "dragon_roar" }, { u: 0.52, sfx: "dragon_fire" },
  ];
  if (weather) events.push({ u: 0.62, sfx: "wx_tsunami_warn" }, { u: 0.84, sfx: "wx_tsunami" });

  const tmp = new THREE.Vector3();
  let frame = 0;
  return {
    group, fog, cam, events,
    update(t, u, H) {
      frame++;
      sea.update(t);
      fires.forEach((f) => f.update(t, H));
      if (frame % 2 === 0) armies.forEach((a) => a.update(t));
      smokes.forEach((s) => {
        const { x, z, ph, s: sz } = s.userData;
        const k = (t * 0.06 + ph) % 1;
        s.position.set(x + k * 8, 2 + k * 40, z);
        s.scale.setScalar(sz * (0.6 + k * 1.6));
        s.material.opacity = 0.5 * Math.sin(k * Math.PI);
      });
      arrows.update(t, H);
      arrows.uniforms.k.value = smooth(span(u, 0.08, 0.16)) * (1 - smooth(span(u, 0.42, 0.52)));

      // ลูกไฟจากเครื่องยิงหิน
      const fk = span(u, 0.24, 0.4);
      cats[0].arm.rotation.z = -1.6 * smooth(span(u, 0.22, 0.26));
      if (fk > 0 && fk < 1) {
        tmp.copy(BALL_A).lerp(BALL_B, fk); tmp.y += Math.sin(fk * Math.PI) * 22;
        ball.position.copy(tmp); ball.visible = true; ballLight.position.copy(tmp); ballLight.intensity = 60;
      } else { ball.visible = false; ballLight.intensity = 0; }
      const bk = span(u, 0.4, 0.5);
      boom.material.opacity = bk > 0 && bk < 1 ? (1 - bk) : 0;
      boom.scale.setScalar(4 + bk * 16);

      // มังกรพ่นไฟ: หัวไฟกวาดจาก -x ไป +x · ไฟที่ผ่านแล้วค้างแล้วค่อยมอด
      const dk = span(u, DRAGON[0], DRAGON[1]);
      const head = -70 + dk * 140;
      flames.forEach((f) => {
        const { x, z, s, ph } = f.userData;
        const lit = dk > 0 && x < head ? 1 - clamp01((head - x) / 90) : 0;
        f.material.opacity = lit * (0.75 + 0.25 * Math.sin(t * 12 + ph));
        f.position.set(x, hFn(x, z) + s * 0.8, z);
        f.scale.set(s * 0.62 * (0.9 + 0.1 * Math.sin(t * 9 + ph)), s * 2.5 * (0.85 + 0.25 * Math.sin(t * 13 + ph)), 1);
      });
      bandU.head.value = dk > 0 ? head : -999;
      bandU.t.value = t;
      bandEmbers.update(t, H);
      bandEmbers.uniforms.k.value = dk > 0 ? 1 - smooth(span(u, 0.85, 1)) * 0.5 : 0;
      const live = dk > 0 && dk < 1;
      stream.material.opacity = live ? 0.75 : 0;
      stream.position.set(head, 50, BAND_Z - 18);
      stream.rotation.x = -0.35;
      dragonLight.position.set(head, 6, BAND_Z);
      dragonLight.intensity = live ? 260 : Math.max(0, dragonLight.intensity - 6);

      if (wave) {
        const wk = span(u, 0.6, 1);
        wave.uniforms.t.value = t;
        wave.uniforms.k.value = smooth(clamp01(wk * 1.6));
        wave.mesh.position.z = 200 - wk * 150;
        const k = wave.uniforms.k.value, top = -0.8 + 46 * k;
        wave.spray.forEach((sp) => {
          const { x, ph, s: sz } = sp.userData;
          const q = (t * 0.35 + ph) % 1;
          sp.position.set(x + Math.sin(t + ph * 9) * 3, top + q * 9, wave.mesh.position.z - 18 * k - q * 6);
          sp.scale.set(sz * (0.8 + q), sz * 0.55 * (0.8 + q), 1);
          sp.material.opacity = k * 0.75 * Math.sin(q * Math.PI);
        });
      }
    },
  };
}
