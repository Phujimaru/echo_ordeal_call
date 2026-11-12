// ============================================================
//  พื้นกระดานแบบพื้นผิวด้วย WebGL (สนาม Eos — ระหว่างกล้องขยับ)
//  ผู้ใช้แจ้ง 2026-11-10: แบบเดิม (ตัดภาพเป็นสามเหลี่ยม 512 ชิ้นใน canvas 2D) มีรอยต่อกระพริบทุกครั้งที่ขยับกล้อง
//   แต่ปิดแล้ววาดพื้นสดก็กระตุกหนัก → วาดภาพพื้นทั้งแผ่นเป็นสี่เหลี่ยมเดียวผ่าน homography (boardGeo.groundMatrix)
//   GPU ฉายแบบ perspective ตรงทุกพิกเซล ไม่มีรอยต่อ · mipmap + anisotropic กันภาพพื้นไกลๆ ระยิบ
//  ใช้ไม่ได้ (ไม่มี WebGL2 / context หาย) → คืน false ให้ผู้เรียกใช้วิธีเดิม
// ============================================================
let S = null; // { cv, gl, prog, buf, texs: Map(key → WebGLTexture), uM, uSize, uBoard, fail }

const VS = `#version 300 es
in vec2 aPos;
uniform mat3 uM;      // พื้น (x, y, 1) → พิกเซลจอ [px·w, py·w, w]
uniform vec2 uSize;   // ขนาดแคนวาส (px)
uniform vec2 uBoard;  // cols, rows
out vec2 vUV;
void main() {
  vec2 b = aPos * uBoard;
  vec3 h = uM * vec3(b, 1.0);
  vUV = aPos;
  gl_Position = vec4(2.0 * h.x / uSize.x - h.z, h.z - 2.0 * h.y / uSize.y, 0.0, h.z);
}`;
const FS = `#version 300 es
precision mediump float;
in vec2 vUV;
uniform sampler2D uTex;
out vec4 o;
void main() { o = texture(uTex, vUV); }`;

function init() {
  if (S) return S.fail ? null : S;
  S = { fail: true };
  try {
    const cv = document.createElement("canvas");
    const gl = cv.getContext("webgl2", { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: true });
    if (!gl) return null;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    const aniso = gl.getExtension("EXT_texture_filter_anisotropic");
    cv.addEventListener("webglcontextlost", (e) => { e.preventDefault(); S = { fail: true }; });
    S = { cv, gl, prog, buf, aniso, texs: new Map(), aPos: gl.getAttribLocation(prog, "aPos"), uM: gl.getUniformLocation(prog, "uM"), uSize: gl.getUniformLocation(prog, "uSize"), uBoard: gl.getUniformLocation(prog, "uBoard"), fail: false };
    return S;
  } catch (e) {
    if (import.meta.env && import.meta.env.DEV) console.warn("groundGL off:", e && e.message);
    S = { fail: true };
    return null;
  }
}

// ใช้ WebGL2 วาดพื้นได้ไหม (สร้าง context ครั้งแรกที่ถาม)
export function groundGLReady() { const st = typeof document !== "undefined" ? init() : null; return !!(st && !st.gl.isContextLost()); }

// มีภาพพื้นนี้บนการ์ดจอแล้วไหม
export function groundGLHas(key) { return !!(S && !S.fail && S.texs.has(key)); }
// อัปโหลดภาพพื้น (ครั้งเดียวต่อ key · เก็บได้ 2 ภาพ = กลางวัน + กลางคืน ของผังเดียวกัน)
function upload(st, src, key) {
  const gl = st.gl;
  let tex = st.texs.get(key);
  if (tex) { gl.bindTexture(gl.TEXTURE_2D, tex); return true; }
  if (!src) return false;
  tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  if (st.aniso) gl.texParameterf(gl.TEXTURE_2D, st.aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(st.aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
  const base = key.slice(0, key.lastIndexOf("|"));
  for (const [k, t] of st.texs) if (!k.startsWith(base)) { gl.deleteTexture(t); st.texs.delete(k); } // ผัง/พื้นเปลี่ยน = ทิ้งของเก่า
  st.texs.set(key, tex);
  return true;
}

// วาดภาพพื้นลง g (canvas 2D ที่ตั้ง transform เป็นพิกัดตรรกะอยู่) · M = boardGeo.groundMatrix() · คืน true = วาดแล้ว
export function drawGroundGL(g, src, key, M, cols, rows, uploadOnly = false) {
  if (!M && !uploadOnly) return false;
  const st = init();
  if (!st || st.gl.isContextLost()) return false;
  if (uploadOnly) return upload(st, src, key); // อัปล่วงหน้า (prewarmGround)
  const gl = st.gl, W = g.canvas.width, H = g.canvas.height;
  if (!W || !H) return false;
  if (st.cv.width !== W || st.cv.height !== H) { st.cv.width = W; st.cv.height = H; }
  if (!upload(st, src, key)) return false;
  // พิกัดตรรกะ → พิกเซลจอ ด้วย transform ปัจจุบันของ g (a c e / b d f) แล้วคูณเข้ากับ M
  const t = g.getTransform();
  const [r0, r1, r2] = M;
  const px = [0, 1, 2].map((i) => t.a * r0[i] + t.c * r1[i] + t.e * r2[i]);
  const py = [0, 1, 2].map((i) => t.b * r0[i] + t.d * r1[i] + t.f * r2[i]);
  // mat3 ของ GLSL เรียงตามคอลัมน์
  const m = new Float32Array([px[0], py[0], r2[0], px[1], py[1], r2[1], px[2], py[2], r2[2]]);
  gl.viewport(0, 0, W, H);
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(st.prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, st.buf);
  gl.enableVertexAttribArray(st.aPos);
  gl.vertexAttribPointer(st.aPos, 2, gl.FLOAT, false, 0, 0);
  gl.uniformMatrix3fv(st.uM, false, m);
  gl.uniform2f(st.uSize, W, H);
  gl.uniform2f(st.uBoard, cols, rows);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, st.texs.get(key));
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(st.cv, 0, 0); g.restore();
  return true;
}
